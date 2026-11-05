import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/*
  Route-level tests: the database and session lookup are mocked, so these run
  in CI without MongoDB. They pin down the security fixes — each one used to be
  an exploitable hole.
*/

const prisma = {
  examSession: { findUnique: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  question: { findFirst: vi.fn() },
  studentAnswer: { upsert: vi.fn() },
  examResult: { upsert: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma }));

const me = { id: "a".repeat(24), name: "Asha", email: "asha@example.com", parentEmail: null, createdAt: new Date() };
vi.mock("@/lib/auth", async () => {
  const { HttpError } = await import("@/lib/http");
  return {
    requireStudent: vi.fn(async (req: NextRequest) => {
      if (req.headers.get("x-test-anon")) throw new HttpError(401, "Please start an exam first");
      return me;
    }),
  };
});

const SESSION_ID = "b".repeat(24);
const QUESTION_ID = "c".repeat(24);
const url = (path: string) => `http://localhost${path}`;

function activeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    studentId: me.id,
    status: "active",
    startTime: new Date(),
    duration: 3600,
    mode: "jee_mains",
    subject: "physics",
    chapters: ["Kinematics"],
    totalMarks: 4,
    violationCount: 0,
    endTime: null,
    student: { id: me.id, name: me.name, email: me.email, parentEmail: null },
    questions: [
      {
        id: QUESTION_ID, sessionId: SESSION_ID, questionNumber: 1, section: "A", type: "mcq", questionText: "?", options: ["A) 1", "B) 2"],
        correctAnswer: "B", solution: "secret working", marks: 4, negativeMarks: 1, chapterName: "Kinematics", difficulty: "easy",
        imageUrl: null, hasSubParts: false, subParts: null, createdAt: new Date(),
      },
    ],
    answers: [],
    result: null,
    ...overrides,
  };
}

beforeEach(() => {
  Object.values(prisma).forEach((model) => Object.values(model).forEach((fn) => (fn as ReturnType<typeof vi.fn>).mockReset()));
  delete process.env.ADMIN_TOKEN;
});

describe("GET /api/exam-session", async () => {
  const { GET } = await import("@/app/api/exam-session/route");

  it("requires a session", async () => {
    const res = await GET(new NextRequest(url(`/api/exam-session?sessionId=${SESSION_ID}`), { headers: { "x-test-anon": "1" } }));
    expect(res.status).toBe(401);
  });

  it("returns 404 for someone else's exam (no ID-guessing / IDOR)", async () => {
    prisma.examSession.findUnique.mockResolvedValue(activeSession({ studentId: "d".repeat(24) }));
    const res = await GET(new NextRequest(url(`/api/exam-session?sessionId=${SESSION_ID}`)));
    expect(res.status).toBe(404);
  });

  it("never leaks answers while the exam is running", async () => {
    prisma.examSession.findUnique.mockResolvedValue(activeSession());
    const res = await GET(new NextRequest(url(`/api/exam-session?sessionId=${SESSION_ID}`)));
    const body = JSON.stringify(await res.json());
    expect(res.status).toBe(200);
    expect(body).not.toContain("secret working");
    expect(body).not.toContain('"correctAnswer"');
  });
});

describe("POST /api/submit-answer", async () => {
  const { POST } = await import("@/app/api/submit-answer/route");

  function form(fields: Record<string, string | Blob>) {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    return new NextRequest(url("/api/submit-answer"), { method: "POST", body: fd });
  }

  it("rejects answers after the exam has closed", async () => {
    prisma.examSession.findUnique.mockResolvedValue(activeSession({ status: "completed" }));
    const res = await POST(form({ sessionId: SESSION_ID, questionId: QUESTION_ID, answerText: "B" }));
    expect(res.status).toBe(409);
    expect(prisma.studentAnswer.upsert).not.toHaveBeenCalled();
  });

  it("rejects a question that isn't part of this exam", async () => {
    prisma.examSession.findUnique.mockResolvedValue(activeSession());
    prisma.question.findFirst.mockResolvedValue(null);
    const res = await POST(form({ sessionId: SESSION_ID, questionId: QUESTION_ID, answerText: "B" }));
    expect(res.status).toBe(404);
  });

  it("rejects non-image uploads", async () => {
    const res = await POST(form({ sessionId: SESSION_ID, questionId: QUESTION_ID, answerImage: new File(["x"], "x.svg", { type: "image/svg+xml" }) }));
    expect(res.status).toBe(415);
  });

  it("saves a valid answer with a single upsert (no duplicate rows)", async () => {
    prisma.examSession.findUnique.mockResolvedValue(activeSession());
    prisma.question.findFirst.mockResolvedValue({ id: QUESTION_ID });
    prisma.studentAnswer.upsert.mockResolvedValue({ id: "e".repeat(24), questionId: QUESTION_ID, submittedAt: new Date() });
    const res = await POST(form({ sessionId: SESSION_ID, questionId: QUESTION_ID, answerText: "B" }));
    expect(res.status).toBe(200);
    expect(prisma.studentAnswer.upsert).toHaveBeenCalledOnce();
  });
});

describe("POST /api/evaluate", async () => {
  const { POST } = await import("@/app/api/evaluate/route");
  const body = () => new NextRequest(url("/api/evaluate"), { method: "POST", body: JSON.stringify({ sessionId: SESSION_ID }) });

  it("is idempotent — an existing result is returned without re-grading (no repeat AI cost)", async () => {
    prisma.examSession.findUnique.mockResolvedValue({
      ...activeSession({ status: "completed" }),
      result: { id: "r", sessionId: SESSION_ID, totalMarks: 4, marksObtained: 4, percentage: 100, sectionBreakdown: {}, chapterBreakdown: {}, strengths: [], weaknesses: [], recommendations: [], estimatedGrade: "A1", emailSent: false, generatedAt: new Date() },
    });
    const res = await POST(body());
    expect(res.status).toBe(200);
    expect(prisma.examSession.updateMany).not.toHaveBeenCalled();
  });

  it("refuses to grade concurrently (second tab gets 409)", async () => {
    prisma.examSession.findUnique.mockResolvedValue(activeSession());
    prisma.examSession.updateMany.mockResolvedValue({ count: 0 });
    const res = await POST(body());
    expect(res.status).toBe(409);
  });

  it("grades objective questions deterministically and stores one result", async () => {
    const s = activeSession();
    prisma.examSession.findUnique.mockResolvedValue(s);
    prisma.examSession.updateMany.mockResolvedValue({ count: 1 });
    prisma.examSession.findUniqueOrThrow.mockResolvedValue({ ...s, answers: [{ id: "x", questionId: QUESTION_ID, answerText: "B", answerImageUrl: null }] });
    prisma.studentAnswer.upsert.mockResolvedValue({});
    prisma.examResult.upsert.mockImplementation(async ({ create }) => ({ id: "r", emailSent: false, generatedAt: new Date(), estimatedGrade: create.estimatedGrade, ...create }));
    const res = await POST(body());
    const { result } = await res.json();
    expect(result.marksObtained).toBe(4);
    expect(prisma.examResult.upsert).toHaveBeenCalledOnce();
  });
});

describe("GET /api/settings (admin status)", async () => {
  const { GET } = await import("@/app/api/settings/route");

  it("is disabled unless ADMIN_TOKEN is configured", async () => {
    expect((await GET(new NextRequest(url("/api/settings")))).status).toBe(404);
  });
  it("rejects a wrong token and never exposes secrets", async () => {
    process.env.ADMIN_TOKEN = "correct-horse-battery-staple";
    process.env.GEMINI_API_KEY = "AIza-super-secret";
    const bad = await GET(new NextRequest(url("/api/settings"), { headers: { authorization: "Bearer nope" } }));
    expect(bad.status).toBe(401);
    const ok = await GET(new NextRequest(url("/api/settings"), { headers: { authorization: "Bearer correct-horse-battery-staple" } }));
    expect(ok.status).toBe(200);
    expect(JSON.stringify(await ok.json())).not.toContain("AIza-super-secret");
    delete process.env.GEMINI_API_KEY;
  });
});
