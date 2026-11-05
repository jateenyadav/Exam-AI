import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

/**
 * Fixed-window counter stored in MongoDB, so limits hold across serverless
 * instances without adding Redis. Good enough for abuse/cost control; the
 * README notes when you'd swap in Upstash/Redis.
 */
export async function hit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const current = await prisma.rateLimit.findUnique({ where: { key } });

  if (!current || current.resetAt <= now) {
    const resetAt = new Date(now.getTime() + windowMs);
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (current.count >= limit) return { ok: false, remaining: 0, resetAt: current.resetAt };

  const updated = await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return { ok: updated.count <= limit, remaining: Math.max(0, limit - updated.count), resetAt: updated.resetAt };
}

export async function enforce(key: string, limit: number, windowMs: number, message: string) {
  const result = await hit(key, limit, windowMs);
  if (!result.ok) throw new HttpError(429, message, { retryAt: result.resetAt.toISOString() });
  return result;
}
