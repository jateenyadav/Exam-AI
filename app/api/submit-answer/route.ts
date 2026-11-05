import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { isOpenForAnswers } from "@/lib/exam";
import { ALLOWED_IMAGE_TYPES, MAX_ANSWER_CHARS, MAX_IMAGE_BYTES, objectId } from "@/lib/validation";

export const POST = route(async (req) => {
  const student = await requireStudent(req);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, "Expected multipart form data");
  }

  const sessionId = objectId.safeParse(form.get("sessionId"));
  const questionId = objectId.safeParse(form.get("questionId"));
  if (!sessionId.success || !questionId.success) throw new HttpError(400, "Valid sessionId and questionId required");

  const rawText = form.get("answerText");
  const answerText = typeof rawText === "string" && rawText.length > 0 ? rawText : null;
  if (answerText && answerText.length > MAX_ANSWER_CHARS) throw new HttpError(413, `Answer is too long (max ${MAX_ANSWER_CHARS} characters)`);

  const file = form.get("answerImage");
  let imageDataUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) throw new HttpError(415, "Answer photo must be JPEG, PNG or WebP");
    if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "Answer photo is too large (max 2 MB)");
    imageDataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  }
  if (!answerText && !imageDataUrl) throw new HttpError(400, "Provide an answer or a photo");

  // Ownership, timing, and question-belongs-to-exam checks.
  const session = await prisma.examSession.findUnique({ where: { id: sessionId.data } });
  if (!session || session.studentId !== student.id) throw new HttpError(404, "Exam not found");
  if (!isOpenForAnswers(session)) throw new HttpError(409, "This exam is closed — time is up or it was already submitted");

  const question = await prisma.question.findFirst({ where: { id: questionId.data, sessionId: session.id }, select: { id: true } });
  if (!question) throw new HttpError(404, "Question not found in this exam");

  const answer = await prisma.studentAnswer.upsert({
    where: { sessionId_questionId: { sessionId: session.id, questionId: question.id } },
    create: { sessionId: session.id, questionId: question.id, answerText, answerImageUrl: imageDataUrl },
    update: {
      ...(answerText !== null && { answerText }),
      ...(imageDataUrl !== null && { answerImageUrl: imageDataUrl }),
      submittedAt: new Date(),
    },
    select: { id: true, questionId: true, submittedAt: true },
  });

  return NextResponse.json({ answer });
});
