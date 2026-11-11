import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { objectId } from "@/lib/validation";
import { schedule } from "@/lib/srs";

/** GET /api/review — today's due flashcards from the mistake notebook. */
export const GET = route(async (req) => {
  const student = await requireStudent(req);
  const now = new Date();
  const [due, dueCount, total] = await Promise.all([
    prisma.reviewCard.findMany({ where: { studentId: student.id, dueAt: { lte: now } }, orderBy: { dueAt: "asc" }, take: 20 }),
    prisma.reviewCard.count({ where: { studentId: student.id, dueAt: { lte: now } } }),
    prisma.reviewCard.count({ where: { studentId: student.id } }),
  ]);
  return NextResponse.json({
    dueCount,
    total,
    cards: due.map((c) => ({
      id: c.id,
      subject: c.subject,
      chapterName: c.chapterName,
      type: c.type,
      questionText: c.questionText,
      options: c.options,
      correctAnswer: c.correctAnswer,
      solution: c.solution,
      reps: c.reps,
      lapses: c.lapses,
    })),
  });
});

const gradeSchema = z.object({ cardId: objectId, rating: z.enum(["again", "hard", "good", "easy"]) });

/** POST /api/review — rate how well you remembered a card; SM-2 picks when it comes back. */
export const POST = route(async (req) => {
  const student = await requireStudent(req);
  const { cardId, rating } = await parseBody(req, gradeSchema);
  const card = await prisma.reviewCard.findUnique({ where: { id: cardId } });
  if (!card || card.studentId !== student.id) throw new HttpError(404, "Card not found");
  const next = schedule(card, rating);
  await prisma.reviewCard.update({ where: { id: cardId }, data: next });
  return NextResponse.json({ cardId, nextDueAt: next.dueAt, intervalDays: next.intervalDays });
});
