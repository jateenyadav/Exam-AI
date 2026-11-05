import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import type { Student } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";

/*
  Session auth without a third-party provider:
  - a 256-bit random token lives only in an httpOnly cookie (JS can't read it)
  - the database stores SHA-256(token), so a DB leak can't be replayed
  - every API derives the student from the cookie — never from an id/email
    sent by the client — and checks ownership of whatever it touches
*/

const PROD = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = PROD ? "__Host-examace" : "examace_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createAuthSession(studentId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS);
  await prisma.authSession.create({ data: { tokenHash: hashToken(token), studentId, expiresAt } });
  return { token, expiresAt };
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: PROD,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: PROD, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getStudent(req: NextRequest): Promise<Student | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { student: true },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return session.student;
}

export async function requireStudent(req: NextRequest): Promise<Student> {
  const student = await getStudent(req);
  if (!student) throw new HttpError(401, "Please start an exam first — your session has expired or is missing.");
  return student;
}

export async function destroyAuthSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}
