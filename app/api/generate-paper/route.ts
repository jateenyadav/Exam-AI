import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { requireStudent } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { DAY, enforce } from "@/lib/rate-limit";
import { toClientQuestion } from "@/lib/exam";
import { generatePaper } from "@/lib/paper-generator";
import { getChaptersForSubject, getSubjectsForMode, type ExamMode } from "@/lib/syllabus";
import { generatePaperSchema } from "@/lib/validation";

export const maxDuration = 60;

export const POST = route(async (req) => {
  const student = await requireStudent(req);
  const { mode, subject, chapters } = await parseBody(req, generatePaperSchema);

  // Only real syllabus entries reach the prompt — no free-text prompt injection via chapter names.
  if (!getSubjectsForMode(mode).includes(subject)) throw new HttpError(400, "Unknown subject for this exam");
  const known = new Set(getChaptersForSubject(mode, subject).map((c: { name: string }) => c.name));
  const picked = Array.from(new Set(chapters));
  if (!picked.every((c) => known.has(c))) throw new HttpError(400, "One or more chapters are not in the syllabus");

  // Cost controls: per-student and global daily caps on AI-generated papers.
  const e = env();
  await enforce(`paper:${student.id}`, e.PAPERS_PER_STUDENT_PER_DAY, DAY, `Daily limit reached (${e.PAPERS_PER_STUDENT_PER_DAY} papers). Come back tomorrow!`);
  await enforce("paper:global", e.PAPERS_GLOBAL_PER_DAY, DAY, "ExamAce is very busy today — please try again tomorrow.");

  const { questions, pattern } = await generatePaper(mode as ExamMode, subject, picked);

  const session = await prisma.examSession.create({
    data: {
      studentId: student.id,
      mode,
      subject,
      chapters: picked,
      totalMarks: pattern.totalMarks,
      duration: pattern.duration,
      status: "active",
      questions: { create: questions },
    },
    include: { questions: { orderBy: { questionNumber: "asc" } } },
  });

  return NextResponse.json({
    sessionId: session.id,
    questions: session.questions.map((q) => toClientQuestion(q, false)),
    totalMarks: pattern.totalMarks,
    duration: pattern.duration,
  });
});
