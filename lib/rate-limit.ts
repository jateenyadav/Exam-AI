import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

type RawResult = { value?: { count?: number; resetAt?: { $date: string } | string } | null };

/**
 * Fixed-window counter stored in MongoDB, so limits hold across serverless instances without Redis.
 * One atomic findAndModify with an update pipeline does "reset if expired, else +1". The old version
 * read, then wrote, so two parallel requests could both slip under the limit.
 */
export async function hit(key: string, limit: number, windowMs: number, attempt = 0): Promise<{ ok: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const newReset = new Date(now.getTime() + windowMs);
  const live = { $and: [{ $ne: [{ $type: "$resetAt" }, "missing"] }, { $gt: ["$resetAt", { $date: now.toISOString() }] }] };
  try {
    const res = (await prisma.$runCommandRaw({
      findAndModify: "RateLimit",
      query: { key },
      update: [
        {
          $set: {
            key,
            count: { $cond: [live, { $add: ["$count", 1] }, 1] },
            resetAt: { $cond: [live, "$resetAt", { $date: newReset.toISOString() }] },
          },
        },
      ],
      upsert: true,
      new: true,
    })) as unknown as RawResult;
    const count = Number(res.value?.count ?? 1);
    const raw = res.value?.resetAt;
    const resetAt = raw ? new Date(typeof raw === "string" ? raw : raw.$date) : newReset;
    return { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt };
  } catch (err) {
    // Two first-ever hits can race on the unique `key` index; the retry then finds the document.
    if (attempt === 0 && String((err as Error).message).includes("E11000")) return hit(key, limit, windowMs, 1);
    throw err;
  }
}

export async function enforce(key: string, limit: number, windowMs: number, message: string) {
  const result = await hit(key, limit, windowMs);
  if (!result.ok) throw new HttpError(429, message, { retryAt: result.resetAt.toISOString() });
  return result;
}
