import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sh, startDatabase } from "./db";

let db: Awaited<ReturnType<typeof startDatabase>> | undefined;
let hit: typeof import("@/lib/rate-limit").hit;

beforeAll(async () => {
  db = await startDatabase("examace_ratelimit");
  process.env.DATABASE_URL = db.uri;
  sh("npx prisma db push --skip-generate");
  ({ hit } = await import("@/lib/rate-limit"));
}, 180_000);

afterAll(async () => {
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
  await db?.stop();
});

describe("rate limiter (real MongoDB)", () => {
  it("is atomic: 30 parallel hits on a limit of 10 let exactly 10 through", async () => {
    const results = await Promise.all(Array.from({ length: 30 }, () => hit("parallel", 10, 60_000)));
    expect(results.filter((r) => r.ok).length).toBe(10);
  });

  it("starts a new window after the old one expires", async () => {
    await hit("short", 1, 50);
    expect((await hit("short", 1, 50)).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 80));
    expect((await hit("short", 1, 50)).ok).toBe(true);
  });
});
