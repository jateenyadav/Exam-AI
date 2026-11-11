import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { log } from "@/lib/http";

/**
 * v1 databases still carry a UNIQUE index on Student.email (`Student_email_key`). In v2 e-mail is an
 * optional contact field, so that index makes every second sign-up without an e-mail (and any shared
 * e-mail) fail with a 500. `npx prisma db push` removes it; until that has run on a database, this
 * self-heals: on that exact unique error it drops the obsolete index once and retries.
 */
export const LEGACY_EMAIL_INDEX = "Student_email_key";

let dropped = false;

export function isLegacyEmailConflict(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  const target = (err.meta as { target?: unknown } | undefined)?.target;
  const text = `${Array.isArray(target) ? target.join(",") : String(target ?? "")} ${err.message}`;
  return text.includes(LEGACY_EMAIL_INDEX) || /\bemail\b/.test(text);
}

export async function dropLegacyEmailIndex(): Promise<void> {
  try {
    await prisma.$runCommandRaw({ dropIndexes: "Student", index: LEGACY_EMAIL_INDEX });
    log("warn", { msg: "dropped obsolete unique index", index: LEGACY_EMAIL_INDEX });
  } catch (err) {
    // "index not found" means someone already removed it — that's fine.
    if (!/index not found|IndexNotFound|27/.test(String((err as Error).message))) throw err;
  }
  dropped = true;
}

/** Run a Student write; if the obsolete unique e-mail index blocks it, drop the index and retry once. */
export async function withLegacyEmailHeal<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (dropped || !isLegacyEmailConflict(err)) throw err;
    await dropLegacyEmailIndex();
    return write();
  }
}
