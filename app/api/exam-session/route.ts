import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { asJson, canReveal, deadlineOf, toClientAnswer, toClientQuestion } from "@/lib/exam";
import { objectId, sessionUpdateSchema } from "@/lib/validation";

/** POST /api/exam-session — record proctoring events (tab switches) and auto-submit. */
export const POST = route(async (req) => {
  const student = await requireStudent(req);
  const { sessionId, violationCount, autoSubmitted } = await parseBody(req, sessionUpdateSchema);

  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.studentId !== student.id) throw new HttpError(404, "Exam not found");
  if (session.status !== "active") return NextResponse.json({ session: { id: session.id, status: session.status } });

  const updated = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      // The counter can only go up — a client can't erase recorded violations.
      ...(violationCount !== undefined && { violationCount: Math.max(session.violationCount, violationCount) }),
      ...(autoSubmitted && { autoSubmitted: true, status: "auto_submitted" }),
    },
  });
  return NextResponse.json({ session: { id: updated.id, status: updated.status, violationCount: updated.violationCount } });
});

/** GET /api/exam-session?sessionId= — the exam for the results page. Answers stay hidden while it's active. */
export const GET = route(async (req) => {
  const student = await requireStudent(req);
  const parsed = objectId.safeParse(req.nextUrl.searchParams.get("sessionId"));
  if (!parsed.success) throw new HttpError(400, "Valid sessionId required");

  const session = await prisma.examSession.findUnique({
    where: { id: parsed.data },
    include: {
      student: { select: { id: true, name: true, email: true, parentEmail: true } },
      questions: { orderBy: { questionNumber: "asc" } },
      answers: true,
      result: true,
    },
  });
  if (!session || session.studentId !== student.id) throw new HttpError(404, "Exam not found");

  const reveal = canReveal(session);
  return NextResponse.json({
    session: {
      id: session.id,
      mode: session.mode,
      subject: session.subject,
      chapters: asJson<string[]>(session.chapters, []),
      totalMarks: session.totalMarks,
      duration: session.duration,
      startTime: session.startTime,
      deadline: deadlineOf(session),
      endTime: session.endTime,
      status: session.status,
      violationCount: session.violationCount,
      student: session.student,
      questions: session.questions.map((q) => toClientQuestion(q, reveal)),
      answers: session.answers.map((a) => toClientAnswer(a, reveal)),
      result: session.result
        ? {
            ...session.result,
            sectionBreakdown: asJson(session.result.sectionBreakdown, {}),
            chapterBreakdown: asJson(session.result.chapterBreakdown, {}),
            strengths: asJson(session.result.strengths, []),
            weaknesses: asJson(session.result.weaknesses, []),
            recommendations: asJson(session.result.recommendations, []),
          }
        : null,
    },
  });
});
