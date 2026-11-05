import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { clearSessionCookie, createAuthSession, destroyAuthSession, getStudent, requireStudent, setSessionCookie } from "@/lib/auth";
import { clientIp, parseBody, route } from "@/lib/http";
import { enforce, HOUR } from "@/lib/rate-limit";
import { asJson } from "@/lib/exam";
import { startSessionSchema } from "@/lib/validation";

/**
 * POST /api/session — start (or continue) a student session.
 * If this browser already has a valid session, update that student's details;
 * otherwise create a new student and issue a session cookie. Email is a contact
 * field only: typing someone else's email never grants access to their data.
 */
export const POST = route(async (req) => {
  const body = await parseBody(req, startSessionSchema);
  const existing = await getStudent(req);

  if (existing) {
    const student = await prisma.student.update({
      where: { id: existing.id },
      data: { name: body.name, email: body.email ?? existing.email, parentEmail: body.parentEmail ?? existing.parentEmail },
    });
    return NextResponse.json({ student: publicStudent(student) });
  }

  await enforce(`signup:${clientIp(req)}`, env().SIGNUPS_PER_IP_PER_HOUR, HOUR, "Too many new sessions from this network. Try again later.");
  const student = await prisma.student.create({
    data: { name: body.name, email: body.email ?? null, parentEmail: body.parentEmail ?? null },
  });
  const { token, expiresAt } = await createAuthSession(student.id);
  const res = NextResponse.json({ student: publicStudent(student) }, { status: 201 });
  setSessionCookie(res, token, expiresAt);
  return res;
});

/** GET /api/session — the signed-in student and their exam history (dashboard). */
export const GET = route(async (req) => {
  const student = await requireStudent(req);
  const sessions = await prisma.examSession.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      mode: true,
      subject: true,
      totalMarks: true,
      status: true,
      createdAt: true,
      result: { select: { marksObtained: true, percentage: true, totalMarks: true, chapterBreakdown: true, generatedAt: true } },
    },
  });
  return NextResponse.json({
    student: {
      ...publicStudent(student),
      sessions: sessions.map((s) => ({
        ...s,
        result: s.result ? { ...s.result, chapterBreakdown: asJson(s.result.chapterBreakdown, {}) } : null,
      })),
    },
  });
});

/** DELETE /api/session — sign out on this device. */
export const DELETE = route(async (req) => {
  await destroyAuthSession(req);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
});

function publicStudent(s: { id: string; name: string; email: string | null; parentEmail: string | null }) {
  return { id: s.id, name: s.name, email: s.email, parentEmail: s.parentEmail };
}
