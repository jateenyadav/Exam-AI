import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { toClientQuestion } from "@/lib/exam";
import { sectionPlan } from "@/lib/paper-generator";
import { loadGeneratingSession } from "@/lib/paper-session";
import { sessionIdSchema } from "@/lib/validation";
import type { ExamMode } from "@/lib/syllabus";

/** POST /api/generate-paper/start — step 3 of 3: every section is built, so start the clock now. */
export const POST = route(async (req) => {
  const student = await requireStudent(req);
  const { sessionId } = await parseBody(req, sessionIdSchema);
  const { session } = await loadGeneratingSession(sessionId, student.id);

  if (session.status === "generating") {
    const { sections } = sectionPlan(session.mode as ExamMode, session.subject);
    const built = await prisma.question.groupBy({ by: ["section"], where: { sessionId } });
    const missing = sections.filter(({ section }) => !built.some((b) => b.section === section.code));
    if (missing.length) throw new HttpError(409, `Still building: ${missing.map((m) => m.section.name).join(", ")}`);
    // The timer starts when the student can see the paper, not when generation began.
    await prisma.examSession.updateMany({ where: { id: sessionId, status: "generating" }, data: { status: "active", startTime: new Date() } });
  } else if (session.status !== "active") {
    throw new HttpError(409, "This exam has already finished");
  }

  const questions = await prisma.question.findMany({ where: { sessionId }, orderBy: { questionNumber: "asc" } });
  // If a section was ever stored twice (a retry raced a slow request), keep the first copy of each
  // number and delete the rest, so grading and totals only ever see one.
  const seen = new Set<number>();
  const unique = questions.filter((q) => (seen.has(q.questionNumber) ? false : (seen.add(q.questionNumber), true)));
  if (unique.length !== questions.length) {
    const keep = new Set(unique.map((q) => q.id));
    await prisma.question.deleteMany({ where: { sessionId, id: { notIn: Array.from(keep) } } });
  }
  return NextResponse.json({
    sessionId,
    questions: unique.map((q) => toClientQuestion(q, false)),
    totalMarks: session.totalMarks,
    duration: session.duration,
  });
});
