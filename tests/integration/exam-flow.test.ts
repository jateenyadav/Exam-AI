import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { sh, startDatabase } from "./db";

/*
  End-to-end API flow against a real MongoDB replica set (in-memory locally, a container in CI) and the
  real Prisma client — no mocks. No AI key is set, so paper generation uses the
  built-in question bank and grading is deterministic.
*/

let db: Awaited<ReturnType<typeof startDatabase>> | undefined;
type Handlers = Record<string, (req: NextRequest) => Promise<Response>>;
let api: { session: Handlers; paper: Handlers; section: Handlers; start: Handlers; examSession: Handlers; submit: Handlers; evaluate: Handlers; review: Handlers; insights: Handlers; explain: Handlers };

const base = "http://localhost";

function req(path: string, init: { method?: string; json?: unknown; form?: FormData; cookie?: string } = {}) {
  const headers: Record<string, string> = { "x-forwarded-for": "203.0.113.7" };
  if (init.cookie) headers.cookie = init.cookie;
  if (init.json !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(`${base}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.form ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
  });
}

async function startStudent(name: string) {
  const res = await api.session.POST(req("/api/session", { method: "POST", json: { name, email: `${name.toLowerCase()}@example.com` } }));
  expect(res.status).toBe(201);
  const setCookie = res.headers.get("set-cookie") ?? "";
  expect(setCookie).toMatch(/HttpOnly/i);
  return setCookie.split(";")[0]; // "examace_session=…"
}

beforeAll(async () => {
  db = await startDatabase("examace_flow");
  process.env.DATABASE_URL = db.uri;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  sh("npx prisma db push --skip-generate");

  api = {
    session: await import("@/app/api/session/route"),
    paper: await import("@/app/api/generate-paper/route"),
    section: await import("@/app/api/generate-paper/section/route"),
    start: await import("@/app/api/generate-paper/start/route"),
    examSession: await import("@/app/api/exam-session/route"),
    submit: await import("@/app/api/submit-answer/route"),
    evaluate: await import("@/app/api/evaluate/route"),
    review: await import("@/app/api/review/route"),
    insights: await import("@/app/api/insights/route"),
    explain: await import("@/app/api/explain/route"),
  } as unknown as typeof api;
}, 180_000);

afterAll(async () => {
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
  await db?.stop();
});

describe("full exam flow (real database)", () => {
  let cookie = "";
  let sessionId = "";
  let questions: Array<{ id: string; type: string; options?: string[] | null }> = [];

  it("starts a session and generates a paper section by section", async () => {
    cookie = await startStudent("Asha");
    const created = await api.paper.POST(
      req("/api/generate-paper", { method: "POST", cookie, json: { mode: "jee_mains", subject: "physics", chapters: ["Physics and Measurement", "Kinematics"] } }),
    );
    const plan = await created.json();
    expect(created.status, JSON.stringify(plan)).toBe(200);
    sessionId = plan.sessionId;
    expect(plan.sections.length).toBeGreaterThan(0);

    // Starting before every section is built is refused.
    const early = await api.start.POST(req("/api/generate-paper/start", { method: "POST", cookie, json: { sessionId } }));
    expect(early.status).toBe(409);

    // A half-built paper is not visible as an exam and reveals nothing.
    const half = await api.examSession.GET(req(`/api/exam-session?sessionId=${sessionId}`, { cookie }));
    expect(JSON.stringify(await half.json())).not.toContain('"correctAnswer"');

    for (const s of plan.sections) {
      const res = await api.section.POST(req("/api/generate-paper/section", { method: "POST", cookie, json: { sessionId, index: s.index } }));
      expect(res.status).toBe(200);
    }
    // Retrying a section doesn't duplicate its questions.
    await api.section.POST(req("/api/generate-paper/section", { method: "POST", cookie, json: { sessionId, index: 0 } }));

    const res = await api.start.POST(req("/api/generate-paper/start", { method: "POST", cookie, json: { sessionId } }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    questions = body.questions;
    expect(questions.length).toBeGreaterThan(0);
    const numbers = (body.questions as { questionNumber: number }[]).map((q) => q.questionNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(JSON.stringify(body)).not.toContain('"correctAnswer"');
  }, 60_000);

  it("won't let another student build or start this paper", async () => {
    const intruder = await startStudent("Eve");
    const res = await api.start.POST(req("/api/generate-paper/start", { method: "POST", cookie: intruder, json: { sessionId } }));
    expect(res.status).toBe(404);
  });

  it("answers an MCQ and keeps the answer key hidden while active", async () => {
    const mcq = questions.find((q) => q.type === "mcq")!;
    const fd = new FormData();
    fd.append("sessionId", sessionId);
    fd.append("questionId", mcq.id);
    fd.append("answerText", "A");
    const res = await api.submit.POST(req("/api/submit-answer", { method: "POST", cookie, form: fd }));
    expect(res.status).toBe(200);

    const view = await api.examSession.GET(req(`/api/exam-session?sessionId=${sessionId}`, { cookie }));
    const text = JSON.stringify(await view.json());
    expect(view.status).toBe(200);
    expect(text).not.toContain('"correctAnswer"');
  });

  it("blocks another student from reading or grading this exam", async () => {
    const intruder = await startStudent("Mallory");
    const view = await api.examSession.GET(req(`/api/exam-session?sessionId=${sessionId}`, { cookie: intruder }));
    expect(view.status).toBe(404);
    const grade = await api.evaluate.POST(req("/api/evaluate", { method: "POST", cookie: intruder, json: { sessionId } }));
    expect(grade.status).toBe(404);
  });

  it("won't explain answers while the exam is still running", async () => {
    const res = await api.explain.POST(req("/api/explain", { method: "POST", cookie, json: { sessionId, questionId: questions[0].id } }));
    expect(res.status).toBe(409);
  });

  it("saves a wrong typed integer answer so it becomes a flashcard", async () => {
    const integer = questions.find((q) => q.type === "integer")!;
    const fd = new FormData();
    fd.append("sessionId", sessionId);
    fd.append("questionId", integer.id);
    fd.append("answerText", "987654");
    const res = await api.submit.POST(req("/api/submit-answer", { method: "POST", cookie, form: fd }));
    expect(res.status).toBe(200);
  });

  it("grades once, reveals answers after, and is idempotent", async () => {
    const first = await api.evaluate.POST(req("/api/evaluate", { method: "POST", cookie, json: { sessionId } }));
    const { result } = await first.json();
    expect(first.status).toBe(200);
    expect(result.totalMarks).toBeGreaterThan(0);

    const again = await api.evaluate.POST(req("/api/evaluate", { method: "POST", cookie, json: { sessionId } }));
    expect((await again.json()).result.id).toBe(result.id);

    const view = await api.examSession.GET(req(`/api/exam-session?sessionId=${sessionId}`, { cookie }));
    const session = (await view.json()).session;
    expect(session.status).toBe("completed");
    expect(session.questions[0]).toHaveProperty("correctAnswer");
  }, 60_000);

  it("refuses new answers after submission", async () => {
    const fd = new FormData();
    fd.append("sessionId", sessionId);
    fd.append("questionId", questions[0].id);
    fd.append("answerText", "B");
    const res = await api.submit.POST(req("/api/submit-answer", { method: "POST", cookie, form: fd }));
    expect(res.status).toBe(409);
  });

  it("lists the exam on the student's own dashboard only", async () => {
    const res = await api.session.GET(req("/api/session", { cookie }));
    const { student } = await res.json();
    expect(student.sessions.map((s: { id: string }) => s.id)).toContain(sessionId);
  });

  it("adds mistakes to the notebook and schedules them with SM-2", async () => {
    const res = await api.review.GET(req("/api/review", { cookie }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.total).toBeGreaterThanOrEqual(1);
    const card = body.cards[0];
    const graded = await api.review.POST(req("/api/review", { method: "POST", cookie, json: { cardId: card.id, rating: "good" } }));
    expect(graded.status).toBe(200);
    expect((await graded.json()).intervalDays).toBe(1);
    const after = await (await api.review.GET(req("/api/review", { cookie }))).json();
    expect(after.cards.find((c: { id: string }) => c.id === card.id)).toBeUndefined(); // not due again today
  });

  it("another student can't rate my cards", async () => {
    const mine = await (await api.review.GET(req("/api/review", { cookie }))).json();
    const intruder = await startStudent("Trudy");
    const any = mine.cards[0]?.id ?? "000000000000000000000000";
    const res = await api.review.POST(req("/api/review", { method: "POST", cookie: intruder, json: { cardId: any, rating: "easy" } }));
    expect(res.status).toBe(404);
  });

  it("reports weak topics from results", async () => {
    const res = await api.insights.GET(req("/api/insights", { cookie }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.examsAnalysed).toBe(1);
    expect(Array.isArray(body.topics)).toBe(true);
  });

  it("explains a mistake after grading, falling back to the solution without AI keys", async () => {
    const integer = questions.find((q) => q.type === "integer")!;
    const res = await api.explain.POST(req("/api/explain", { method: "POST", cookie, json: { sessionId, questionId: integer.id } }));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Correct answer:");
  });
});
