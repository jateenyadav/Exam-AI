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
let api: { session: Handlers; paper: Handlers; examSession: Handlers; submit: Handlers; evaluate: Handlers };

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
    examSession: await import("@/app/api/exam-session/route"),
    submit: await import("@/app/api/submit-answer/route"),
    evaluate: await import("@/app/api/evaluate/route"),
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

  it("starts a session and generates a paper", async () => {
    cookie = await startStudent("Asha");
    const res = await api.paper.POST(
      req("/api/generate-paper", { method: "POST", cookie, json: { mode: "jee_mains", subject: "physics", chapters: ["Physics and Measurement", "Kinematics"] } }),
    );
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    sessionId = body.sessionId;
    questions = body.questions;
    expect(questions.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain('"correctAnswer"');
  }, 60_000);

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
});
