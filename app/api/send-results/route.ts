import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { requireStudent } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { DAY, enforce } from "@/lib/rate-limit";
import { asJson } from "@/lib/exam";
import { escapeHtml } from "@/lib/sanitize";
import { sessionIdSchema } from "@/lib/validation";

const MODE_LABELS: Record<string, string> = {
  class11: "Class 11 (CBSE)",
  class12: "Class 12 (CBSE)",
  jee_mains: "JEE Mains",
  jee_advanced: "JEE Advanced",
};

/**
 * POST /api/send-results — e-mail the report to the student (and parent) once.
 * Owner-only, once per exam, daily-capped, and every interpolated value is escaped.
 */
export const POST = route(async (req) => {
  const student = await requireStudent(req);
  const { sessionId } = await parseBody(req, sessionIdSchema);

  const session = await prisma.examSession.findUnique({ where: { id: sessionId }, include: { result: true } });
  if (!session || session.studentId !== student.id) throw new HttpError(404, "Exam not found");
  if (!session.result) throw new HttpError(409, "Results are not ready yet");
  if (session.result.emailSent) return NextResponse.json({ success: true, message: "Results were already e-mailed." });

  const recipients = [student.email, student.parentEmail].filter((x): x is string => Boolean(x));
  if (recipients.length === 0) throw new HttpError(400, "Add an e-mail address before starting an exam to receive reports");

  const result = session.result;
  const html = buildEmailHtml({
    studentName: student.name,
    mode: MODE_LABELS[session.mode] || session.mode,
    subject: session.subject,
    totalMarks: result.totalMarks,
    marksObtained: result.marksObtained,
    percentage: result.percentage,
    sectionBreakdown: asJson(result.sectionBreakdown, {}),
    chapterBreakdown: asJson(result.chapterBreakdown, {}),
    strengths: asJson<string[]>(result.strengths, []),
    weaknesses: asJson<string[]>(result.weaknesses, []),
    recommendations: asJson<string[]>(result.recommendations, []),
    date: result.generatedAt.toLocaleDateString("en-IN"),
  });

  const e = env();
  if (!e.EMAIL_SMTP_HOST || !e.EMAIL_SMTP_USER || !e.EMAIL_SMTP_PASS) {
    return NextResponse.json({ success: true, message: "E-mail isn't configured on this deployment — your results are on this page." });
  }

  await enforce(`email:${student.id}`, e.EMAILS_PER_STUDENT_PER_DAY, DAY, "Daily e-mail limit reached");

  const transporter = nodemailer.createTransport({
    host: e.EMAIL_SMTP_HOST,
    port: e.EMAIL_SMTP_PORT,
    secure: e.EMAIL_SMTP_PORT === 465,
    auth: { user: e.EMAIL_SMTP_USER, pass: e.EMAIL_SMTP_PASS },
  });

  await transporter.sendMail({
    from: e.EMAIL_FROM,
    to: recipients.join(", "),
    subject: `ExamAce result: ${student.name.slice(0, 60)} · ${session.subject} · ${result.marksObtained}/${result.totalMarks}`,
    html,
  });

  await prisma.examResult.update({ where: { id: result.id }, data: { emailSent: true } });
  return NextResponse.json({ success: true, message: "Results e-mailed successfully" });
});

function buildEmailHtml(data: {
  studentName: string;
  mode: string;
  subject: string;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  sectionBreakdown: Record<string, { total: number; obtained: number }>;
  chapterBreakdown: Record<string, { total: number; obtained: number }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  date: string;
}): string {
  const sectionRows = Object.entries(data.sectionBreakdown)
    .map(
      ([section, vals]) =>
        `<tr><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(section)}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${vals.obtained}/${vals.total}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${(vals.total ? (vals.obtained / vals.total) * 100 : 0).toFixed(0)}%</td></tr>`
    )
    .join("");

  const chapterRows = Object.entries(data.chapterBreakdown)
    .map(
      ([ch, vals]) =>
        `<tr><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(ch)}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${vals.obtained}/${vals.total}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${(vals.total ? (vals.obtained / vals.total) * 100 : 0).toFixed(0)}%</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a202c">
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;padding:30px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="margin:0;font-size:28px">📝 ExamAce Results</h1>
      <p style="margin:8px 0 0;opacity:0.9">${escapeHtml(data.date)}</p>
    </div>
    <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0">
      <h2 style="margin:0 0 16px">Hello ${escapeHtml(data.studentName)}!</h2>
      <p>Here are your results for <strong>${escapeHtml(data.mode)} - ${escapeHtml(data.subject)}</strong>:</p>
      <div style="background:white;border-radius:12px;padding:24px;text-align:center;margin:16px 0;border:2px solid ${data.percentage >= 60 ? "#22c55e" : data.percentage >= 40 ? "#f59e0b" : "#ef4444"}">
        <div style="font-size:48px;font-weight:bold;color:${data.percentage >= 60 ? "#22c55e" : data.percentage >= 40 ? "#f59e0b" : "#ef4444"}">${data.marksObtained}/${data.totalMarks}</div>
        <div style="font-size:24px;color:#64748b">${data.percentage.toFixed(1)}%</div>
      </div>
      <h3>Section-wise Performance</h3>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden"><thead><tr style="background:#2563eb;color:white"><th style="padding:10px">Section</th><th style="padding:10px">Score</th><th style="padding:10px">%</th></tr></thead><tbody>${sectionRows}</tbody></table>
      <h3 style="margin-top:20px">Chapter-wise Performance</h3>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden"><thead><tr style="background:#2563eb;color:white"><th style="padding:10px">Chapter</th><th style="padding:10px">Score</th><th style="padding:10px">%</th></tr></thead><tbody>${chapterRows}</tbody></table>
      ${data.strengths.length > 0 ? `<h3 style="color:#22c55e">💪 Strengths</h3><ul>${data.strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : ""}
      ${data.weaknesses.length > 0 ? `<h3 style="color:#ef4444">📌 Areas to Improve</h3><ul>${data.weaknesses.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>` : ""}
      ${data.recommendations.length > 0 ? `<h3 style="color:#2563eb">📖 Study Recommendations</h3><ul>${data.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>` : ""}
    </div>
    <div style="background:#1e293b;color:white;padding:16px;border-radius:0 0 12px 12px;text-align:center;font-size:14px">
      <p style="margin:0">Powered by ExamAce - AI-Powered Exam Practice</p>
    </div>
  </body></html>`;
}
