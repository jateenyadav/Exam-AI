import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { generateSectionQuestions, sectionPlan } from "@/lib/paper-generator";
import { loadGeneratingSession } from "@/lib/paper-session";
import { objectId } from "@/lib/validation";
import type { ExamMode } from "@/lib/syllabus";

export const maxDuration = 60;
/** AI time per section, leaving room for the database writes inside the 60 s limit. */
const SECTION_BUDGET_MS = 45_000;

const schema = z.object({ sessionId: objectId, index: z.number().int().min(0).max(20) });

/** POST /api/generate-paper/section — step 2 of 3: build one section. Safe to retry. */
export const POST = route(async (req) => {
  const student = await requireStudent(req);
  const { sessionId, index } = await parseBody(req, schema);
  const { session, chapters } = await loadGeneratingSession(sessionId, student.id);
  if (session.status !== "generating") throw new HttpError(409, "This paper is already ready");

  const { sections } = sectionPlan(session.mode as ExamMode, session.subject);
  const plan = sections[index];
  if (!plan) throw new HttpError(400, "No such section");

  // Idempotent: a retried request doesn't add the section twice.
  const existing = await prisma.question.count({ where: { sessionId, section: plan.section.code } });
  if (existing === 0) {
    const questions = await generateSectionQuestions(session.mode as ExamMode, session.subject, chapters, plan.section, plan.startNumber, SECTION_BUDGET_MS);
    await prisma.question.createMany({ data: questions.map((q) => ({ ...q, sessionId })) });
  }
  return NextResponse.json({ index, ready: true });
});
