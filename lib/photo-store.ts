/**
 * Answer photos are too big for localStorage, so they live in IndexedDB until the exam is
 * submitted. This lets a refresh (or a crashed tab) keep the student's photos.
 */
const DB = "examace";
const STORE = "answer-photos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req ? req.result : undefined); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

const key = (sessionId: string, questionId: string) => `${sessionId}:${questionId}`;

export const savePhoto = (sessionId: string, questionId: string, dataUrl: string) =>
  tx("readwrite", (s) => { s.put(dataUrl, key(sessionId, questionId)); }).catch(() => undefined);

export const deletePhoto = (sessionId: string, questionId: string) =>
  tx("readwrite", (s) => { s.delete(key(sessionId, questionId)); }).catch(() => undefined);

/** All photos for one exam, as { questionId: dataUrl }. */
export async function loadPhotos(sessionId: string): Promise<Record<string, string>> {
  try {
    const range = IDBKeyRange.bound(`${sessionId}:`, `${sessionId}:￿`);
    const [keys, values] = await Promise.all([
      tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys(range)),
      tx<string[]>("readonly", (s) => s.getAll(range)),
    ]);
    const out: Record<string, string> = {};
    (keys ?? []).forEach((k, i) => { out[String(k).slice(sessionId.length + 1)] = (values ?? [])[i]; });
    return out;
  } catch {
    return {};
  }
}

/** Remove every stored photo (after submit, or when a new exam starts). */
export const clearPhotos = () => tx("readwrite", (s) => { s.clear(); }).catch(() => undefined);
