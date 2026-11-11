import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { route } from "@/lib/http";
import { asJson } from "@/lib/exam";
import { practiceSets, weakTopics } from "@/lib/insights";
import { getChaptersForSubject, getSubjectsForMode, type ExamMode } from "@/lib/syllabus";

export const dynamic = "force-dynamic";

/** GET /api/insights — weakest chapters across all exams + ready-made practice sets. */
export const GET = route(async (req) => {
  const student = await requireStudent(req);
  const sessions = await prisma.examSession.findMany({
    where: { studentId: student.id, result: { isNot: null } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { mode: true, subject: true, result: { select: { chapterBreakdown: true } } },
  });
  const topics = weakTopics(
    sessions.map((s) => ({ mode: s.mode, subject: s.subject, chapterBreakdown: asJson(s.result?.chapterBreakdown, {}) })),
  );
  // Only offer practice for chapters that are real syllabus entries (full-mock rows can mix subjects).
  const sets = practiceSets(topics)
    .map((set) => {
      if (!getSubjectsForMode(set.mode as ExamMode).includes(set.subject)) return null;
      const known = new Set(getChaptersForSubject(set.mode as ExamMode, set.subject).map((c) => c.name));
      const chapters = set.chapters.filter((c) => known.has(c));
      return chapters.length ? { ...set, chapters } : null;
    })
    .filter(Boolean);
  return NextResponse.json({ topics, practice: sets, examsAnalysed: sessions.length });
});
