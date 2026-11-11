import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { sh, startDatabase } from "./db";

let db: Awaited<ReturnType<typeof startDatabase>> | undefined;
let POST: (req: NextRequest) => Promise<Response>;

const signup = (name: string, ip: string) =>
  POST(new NextRequest("http://localhost/api/session", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ name }) }));

beforeAll(async () => {
  db = await startDatabase("examace_legacy_index");
  process.env.DATABASE_URL = db.uri;
  sh("npx prisma db push --skip-generate");
  const { prisma } = await import("@/lib/db");
  // Recreate the v1 situation: a UNIQUE index on Student.email.
  await prisma.$runCommandRaw({ dropIndexes: "Student", index: "Student_email_idx" }).catch(() => null);
  await prisma.$runCommandRaw({ createIndexes: "Student", indexes: [{ key: { email: 1 }, name: "Student_email_key", unique: true }] });
  ({ POST } = await import("@/app/api/session/route"));
}, 180_000);

afterAll(async () => {
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
  await db?.stop();
});

describe("old unique e-mail index (live v1 database)", () => {
  it("second sign-up without an e-mail succeeds and the obsolete index is removed", async () => {
    expect((await signup("First", "198.51.100.1")).status).toBe(201);
    expect((await signup("Second", "198.51.100.2")).status).toBe(201);
    expect((await signup("Third", "198.51.100.3")).status).toBe(201);
    const { prisma } = await import("@/lib/db");
    const res = (await prisma.$runCommandRaw({ listIndexes: "Student" })) as { cursor: { firstBatch: { name: string }[] } };
    expect(res.cursor.firstBatch.map((i) => i.name)).not.toContain("Student_email_key");
  });
});
