import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { asJson } from "@/lib/exam";

/** Load a paper that is still being generated, owned by this student. */
export async function loadGeneratingSession(sessionId: string, studentId: string) {
  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.studentId !== studentId) throw new HttpError(404, "Exam not found");
  return { session, chapters: asJson<string[]>(session.chapters, []) };
}
