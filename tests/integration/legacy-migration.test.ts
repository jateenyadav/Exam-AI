import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { PrismaClient } from "@prisma/client";

/*
  Upgrade path for the live database: seed documents exactly as the v1 app
  stored them (JSON as strings, free-text enums, duplicate answers, a unique
  e-mail index, API keys in AppSettings), run the migration + `prisma db push`,
  then read everything back through the v2 Prisma client.
*/

let replSet: MongoMemoryReplSet;
let prisma: PrismaClient;

const oid = (hex: string) => ({ $oid: hex.padEnd(24, "0") });
const date = (iso: string) => ({ $date: iso });
const STUDENT = "a1";
const SESSION = "b1";
const Q_NUM = "c1";
const Q_MCQ = "c2";

function sh(cmd: string, extra: Record<string, string> = {}) {
  return execSync(cmd, { env: { ...process.env, ...extra }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.DATABASE_URL = replSet.getUri("examace_legacy");
  ({ prisma } = await import("@/lib/db"));
  const raw = (cmd: Record<string, unknown>) => prisma.$runCommandRaw(cmd as never);

  // v1 indexes that `prisma db push` created back then
  await raw({ createIndexes: "Student", indexes: [{ key: { email: 1 }, name: "Student_email_key", unique: true }] });
  await raw({ createIndexes: "ExamResult", indexes: [{ key: { sessionId: 1 }, name: "ExamResult_sessionId_key", unique: true }] });
  await raw({ createIndexes: "AppSettings", indexes: [{ key: { key: 1 }, name: "AppSettings_key_key", unique: true }] });

  await raw({ insert: "Student", documents: [{ _id: oid(STUDENT), name: "Legacy Asha", email: "asha@example.com", parentEmail: null, createdAt: date("2026-02-01T10:00:00Z") }] });
  await raw({
    insert: "ExamSession",
    documents: [{
      _id: oid(SESSION), studentId: oid(STUDENT), mode: "jee_mains", subject: "physics", chapters: '["Kinematics"]',
      totalMarks: 8, duration: 3600, startTime: date("2026-02-01T10:05:00Z"), endTime: date("2026-02-01T11:00:00Z"),
      status: "submitted", violationCount: 1, autoSubmitted: false, createdAt: date("2026-02-01T10:05:00Z"),
    }],
  });
  const q = { sessionId: oid(SESSION), section: "A", solution: "…", marks: 4, negativeMarks: 1, chapterName: "Kinematics", imageUrl: null, hasSubParts: false, subParts: null, createdAt: date("2026-02-01T10:05:00Z") };
  await raw({
    insert: "Question",
    documents: [
      { ...q, _id: oid(Q_NUM), questionNumber: 1, type: "Numerical", questionText: "v = ?", options: null, correctAnswer: "10", difficulty: "Hard" },
      { ...q, _id: oid(Q_MCQ), questionNumber: 2, type: "mcq", questionText: "a = ?", options: '["A) 1","B) 2"]', correctAnswer: "B", difficulty: "tricky" },
    ],
  });
  const a = { sessionId: oid(SESSION), answerImageUrl: null, isCorrect: null, marksAwarded: null, aiFeedback: null, modelAnswer: null };
  await raw({
    insert: "StudentAnswer",
    documents: [
      { ...a, _id: oid("d1"), questionId: oid(Q_NUM), answerText: "9", submittedAt: date("2026-02-01T10:10:00Z") },
      { ...a, _id: oid("d2"), questionId: oid(Q_NUM), answerText: "10", submittedAt: date("2026-02-01T10:20:00Z") }, // double-submit race
      { ...a, _id: oid("d3"), questionId: oid(Q_MCQ), answerText: "B", submittedAt: date("2026-02-01T10:30:00Z") },
    ],
  });
  await raw({
    insert: "ExamResult",
    documents: [{
      _id: oid("e1"), sessionId: oid(SESSION), totalMarks: 8, marksObtained: 8, percentage: 100,
      sectionBreakdown: '{"A":{"obtained":8,"total":8}}', chapterBreakdown: '{"Kinematics":{"obtained":8,"total":8}}',
      strengths: '["Kinematics"]', weaknesses: null, recommendations: null, emailSent: false, generatedAt: date("2026-02-01T11:00:00Z"),
    }],
  });
  await raw({ insert: "AppSettings", documents: [{ _id: oid("f1"), key: "GEMINI_API_KEY", value: "old-key-in-db", updatedAt: date("2026-02-01T00:00:00Z") }] });
}, 180_000);

afterAll(async () => {
  await prisma?.$disconnect();
  await replSet?.stop();
});

describe("v1 → v2 database migration", () => {
  it("dry run reports changes but writes nothing", async () => {
    const out = sh("node scripts/migrate-legacy-data.mjs", { DRY_RUN: "1" });
    expect(out).toContain("DRY RUN");
    expect(out).toContain("1 duplicate answers removed");
    const res = (await prisma.$runCommandRaw({ find: "ExamSession", filter: {} })) as { cursor: { firstBatch: Array<{ chapters: unknown }> } };
    expect(res.cursor.firstBatch[0].chapters).toBe('["Kinematics"]');
  });

  it("migrates, then `prisma db push` builds the v2 indexes", () => {
    const out = sh("node scripts/migrate-legacy-data.mjs");
    expect(out).toContain("Done.");
    sh("npx prisma db push --skip-generate");
  }, 60_000);

  it("v2 client reads every legacy record", async () => {
    const session = await prisma.examSession.findFirstOrThrow({
      include: { student: true, questions: { orderBy: { questionNumber: "asc" } }, answers: true, result: true },
    });
    expect(session.chapters).toEqual(["Kinematics"]);
    expect(session.status).toBe("completed");
    expect(session.questions.map((x) => [x.type, x.difficulty])).toEqual([["integer", "hard"], ["mcq", "medium"]]);
    expect(session.questions[1].options).toEqual(["A) 1", "B) 2"]);
    expect(session.result?.strengths).toEqual(["Kinematics"]);
    expect(session.result?.weaknesses).toEqual([]);
    expect(session.result?.sectionBreakdown).toEqual({ A: { obtained: 8, total: 8 } });
  });

  it("keeps only the latest answer per question", async () => {
    const answers = await prisma.studentAnswer.findMany({ where: { questionId: oid(Q_NUM).$oid } });
    expect(answers.map((x) => x.answerText)).toEqual(["10"]);
  });

  it("removes the old in-database API keys", async () => {
    const res = (await prisma.$runCommandRaw({ listCollections: 1, filter: { name: "AppSettings" } })) as { cursor: { firstBatch: unknown[] } };
    expect(res.cursor.firstBatch).toHaveLength(0);
  });

  it("drops the old unique e-mail index (e-mail is optional now)", async () => {
    await prisma.student.create({ data: { name: "No email 1" } });
    await prisma.student.create({ data: { name: "No email 2" } });
    await prisma.student.create({ data: { name: "Same email", email: "asha@example.com" } });
    expect(await prisma.student.count()).toBe(4);
  });

  it("is safe to run twice", () => {
    const out = sh("node scripts/migrate-legacy-data.mjs");
    expect(out).toContain("0 duplicate answers removed");
    expect(out).toContain("Done.");
  }, 60_000);
});
