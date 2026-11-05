import { NextResponse } from "next/server";
import type { ExamResult } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { asJson, mapLimit } from "@/lib/exam";
import {
  evaluateInteger,
  evaluateMCQ,
  evaluateMultipleCorrect,
  evaluateWrittenAnswer,
  generateDetailedReport,
  type Breakdown,
  type EvaluationResult,
} from "@/lib/evaluator";
import { sessionIdSchema } from "@/lib/validation";

export const maxDuration = 60;

/** An evaluation that started but never produced a result (crash/timeout) can be retried after this. */
const STALE_CLAIM_MS = 90_000;

/**
 * POST /api/evaluate — grade a finished exam exactly once.
 * 1. ownership check
 * 2. idempotent: an existing result is returned as-is (no repeat AI cost)
 * 3. atomic claim (active → completed) so two tabs can't grade concurrently
 * 4. objective questions scored deterministically; written answers by AI, in parallel, marks clamped
 */
export const POST = route(async (req) => {
  const student = await requireStudent(req);
  const { sessionId } = await parseBody(req, sessionIdSchema);

  const owned = await prisma.examSession.findUnique({ where: { id: sessionId }, include: { result: true } });
  if (!owned || owned.studentId !== student.id) throw new HttpError(404, "Exam not found");
  if (owned.result) return NextResponse.json({ result: serializeResult(owned.result) });

  const claimed = await prisma.examSession.updateMany({
    where: {
      id: sessionId,
      OR: [
        { status: { in: ["active", "auto_submitted"] } },
        { status: "completed", endTime: { lt: new Date(Date.now() - STALE_CLAIM_MS) } },
      ],
    },
    data: { status: "completed", endTime: new Date() },
  });
  if (claimed.count === 0) throw new HttpError(409, "Evaluation is already in progress — refresh in a few seconds");

  const session = await prisma.examSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { questions: { orderBy: { questionNumber: "asc" } }, answers: true },
  });

  const answersByQuestion = new Map(session.answers.map((a) => [a.questionId, a]));

  const graded = await mapLimit(session.questions, 4, async (question): Promise<EvaluationResult> => {
    const answer = answersByQuestion.get(question.id);
    if (!answer || (!answer.answerText && !answer.answerImageUrl)) {
      return { marksAwarded: 0, isCorrect: false, feedback: "Not attempted", modelAnswer: question.correctAnswer };
    }
    switch (question.type) {
      case "mcq":
      case "assertion_reason":
        return evaluateMCQ(answer.answerText ?? "", question.correctAnswer, question.marks, question.negativeMarks);
      case "integer":
        return evaluateInteger(answer.answerText ?? "", question.correctAnswer, question.marks);
      case "multiple_correct":
        return evaluateMultipleCorrect(
          asJson<string[]>(answer.answerText, []),
          question.correctAnswer.split(",").map((a) => a.trim()),
          question.marks,
          question.negativeMarks,
        );
      default: {
        const match = answer.answerImageUrl?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
        if (!match) {
          return {
            marksAwarded: 0,
            isCorrect: false,
            feedback: "Written answers are graded from a photo of your working — no photo was uploaded.",
            modelAnswer: question.solution || question.correctAnswer,
          };
        }
        return evaluateWrittenAnswer({
          imageBase64: match[2],
          mimeType: match[1],
          questionText: question.questionText,
          correctAnswer: question.correctAnswer,
          solution: question.solution,
          marks: question.marks,
          questionType: question.type,
        });
      }
    }
  });

  const sectionBreakdown: Breakdown = {};
  const chapterBreakdown: Breakdown = {};
  const weakChapters = new Set<string>();
  let total = 0;

  session.questions.forEach((q, i) => {
    const r = graded[i];
    sectionBreakdown[q.section] ??= { total: 0, obtained: 0 };
    chapterBreakdown[q.chapterName] ??= { total: 0, obtained: 0, questions: 0 };
    sectionBreakdown[q.section].total += q.marks;
    chapterBreakdown[q.chapterName].total += q.marks;
    chapterBreakdown[q.chapterName].questions! += 1;
    sectionBreakdown[q.section].obtained += Math.max(0, r.marksAwarded);
    chapterBreakdown[q.chapterName].obtained += Math.max(0, r.marksAwarded);
    total += r.marksAwarded; // negative marking counts toward the total
    if (!r.isCorrect && answersByQuestion.has(q.id)) weakChapters.add(q.chapterName);
  });

  // Persist per-question grades (one upsert per question; the unique index prevents duplicates).
  await Promise.all(
    session.questions.map((q, i) =>
      prisma.studentAnswer.upsert({
        where: { sessionId_questionId: { sessionId, questionId: q.id } },
        create: { sessionId, questionId: q.id, isCorrect: graded[i].isCorrect, marksAwarded: graded[i].marksAwarded, aiFeedback: graded[i].feedback, modelAnswer: graded[i].modelAnswer },
        update: { isCorrect: graded[i].isCorrect, marksAwarded: graded[i].marksAwarded, aiFeedback: graded[i].feedback, modelAnswer: graded[i].modelAnswer },
      }),
    ),
  );

  const marksObtained = Math.max(0, total);
  const percentage = session.totalMarks > 0 ? (marksObtained / session.totalMarks) * 100 : 0;
  const report = await generateDetailedReport({
    mode: session.mode,
    subject: session.subject,
    totalMarks: session.totalMarks,
    marksObtained,
    sectionBreakdown,
    chapterBreakdown,
    weakChapters: Array.from(weakChapters),
  });

  const result = await prisma.examResult.upsert({
    where: { sessionId },
    create: {
      sessionId,
      totalMarks: session.totalMarks,
      marksObtained,
      percentage,
      sectionBreakdown,
      chapterBreakdown,
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      recommendations: report.recommendations,
      estimatedGrade: report.estimatedGrade,
    },
    update: {},
  });

  return NextResponse.json({ result: serializeResult(result) });
});

function serializeResult(r: ExamResult) {
  return {
    ...r,
    sectionBreakdown: asJson(r.sectionBreakdown, {}),
    chapterBreakdown: asJson(r.chapterBreakdown, {}),
    strengths: asJson<string[]>(r.strengths, []),
    weaknesses: asJson<string[]>(r.weaknesses, []),
    recommendations: asJson<string[]>(r.recommendations, []),
  };
}
