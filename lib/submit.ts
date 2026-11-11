/**
 * Upload answers with checks and retries. Before this, responses were never read, so answers the
 * server rejected (409/413/415) or that hit a network blip were lost without the student knowing.
 */
export type AnswerUpload = { questionId: string; body: FormData; label: string };
export type UploadFailure = { questionId: string; label: string; message: string; permanent: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 4xx (except 408/429) won't succeed on retry; 5xx and network errors might. */
export const isPermanent = (status: number) => status >= 400 && status < 500 && status !== 408 && status !== 429;

export async function uploadAnswers(
  uploads: AnswerUpload[],
  { fetchImpl = fetch, retries = 2, baseDelayMs = 600, concurrency = 3 }: { fetchImpl?: typeof fetch; retries?: number; baseDelayMs?: number; concurrency?: number } = {},
): Promise<UploadFailure[]> {
  const failures: UploadFailure[] = [];
  let next = 0;

  async function one(u: AnswerUpload) {
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetchImpl("/api/submit-answer", { method: "POST", body: u.body });
        if (res.ok) return;
        const message = await res
          .json()
          .then((d: { error?: string }) => d?.error)
          .catch(() => null);
        if (isPermanent(res.status) || attempt >= retries) {
          failures.push({ questionId: u.questionId, label: u.label, message: message || `Server error ${res.status}`, permanent: isPermanent(res.status) });
          return;
        }
      } catch {
        if (attempt >= retries) {
          failures.push({ questionId: u.questionId, label: u.label, message: "Network problem — check your connection", permanent: false });
          return;
        }
      }
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, uploads.length) }, async () => {
      while (next < uploads.length) await one(uploads[next++]);
    }),
  );
  return failures;
}
