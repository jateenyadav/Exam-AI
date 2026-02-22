import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: true,
        result: true,
        questions: { orderBy: { questionNumber: "asc" } },
        answers: true,
      },
    });

    if (!session || !session.result) {
      return NextResponse.json({ error: "No results found" }, { status: 404 });
    }

    const sectionBreakdown = JSON.parse(session.result.sectionBreakdown);
    const chapterBreakdown = JSON.parse(session.result.chapterBreakdown);
    const strengths = session.result.strengths ? JSON.parse(session.result.strengths) : [];
    const weaknesses = session.result.weaknesses ? JSON.parse(session.result.weaknesses) : [];
    const recommendations = session.result.recommendations ? JSON.parse(session.result.recommendations) : [];

    const modeLabels: Record<string, string> = {
      class11: "Class 11 (CBSE)",
      class12: "Class 12 (CBSE)",
      jee_mains: "JEE Mains",
      jee_advanced: "JEE Advanced",
    };

    const html = buildEmailHtml({
      studentName: session.student.name,
      mode: modeLabels[session.mode] || session.mode,
      subject: session.subject,
      totalMarks: session.result.totalMarks,
      marksObtained: session.result.marksObtained,
      percentage: session.result.percentage,
      sectionBreakdown,
      chapterBreakdown,
      strengths,
      weaknesses,
      recommendations,
      date: session.result.generatedAt.toLocaleDateString(),
    });

    const smtpHost = process.env.EMAIL_SMTP_HOST;
    const smtpUser = process.env.EMAIL_SMTP_USER;
    const smtpPass = process.env.EMAIL_SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.log("Email not configured, skipping send");
      return NextResponse.json({
        success: true,
        message: "Email not configured. Results are available on the results page.",
        html,
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.EMAIL_SMTP_PORT || "587"),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const recipients = [session.student.email];
    if (session.student.parentEmail) {
      recipients.push(session.student.parentEmail);
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@examace.com",
      to: recipients.join(", "),
      subject: `ExamAce Result: ${session.student.name} | ${session.subject} | ${new Date().toLocaleDateString()} | Score: ${session.result.marksObtained}/${session.result.totalMarks}`,
      html,
    });

    await prisma.examResult.update({
      where: { id: session.result.id },
      data: { emailSent: true },
    });

    return NextResponse.json({ success: true, message: "Results emailed successfully" });
  } catch (error) {
    console.error("Send results error:", error);
    return NextResponse.json({ error: "Failed to send results" }, { status: 500 });
  }
}

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
        `<tr><td style="padding:8px;border:1px solid #e2e8f0">${section}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${vals.obtained}/${vals.total}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${((vals.obtained / vals.total) * 100).toFixed(0)}%</td></tr>`
    )
    .join("");

  const chapterRows = Object.entries(data.chapterBreakdown)
    .map(
      ([ch, vals]) =>
        `<tr><td style="padding:8px;border:1px solid #e2e8f0">${ch}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${vals.obtained}/${vals.total}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${((vals.obtained / vals.total) * 100).toFixed(0)}%</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a202c">
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;padding:30px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="margin:0;font-size:28px">📝 ExamAce Results</h1>
      <p style="margin:8px 0 0;opacity:0.9">${data.date}</p>
    </div>
    <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0">
      <h2 style="margin:0 0 16px">Hello ${data.studentName}!</h2>
      <p>Here are your results for <strong>${data.mode} - ${data.subject}</strong>:</p>
      <div style="background:white;border-radius:12px;padding:24px;text-align:center;margin:16px 0;border:2px solid ${data.percentage >= 60 ? "#22c55e" : data.percentage >= 40 ? "#f59e0b" : "#ef4444"}">
        <div style="font-size:48px;font-weight:bold;color:${data.percentage >= 60 ? "#22c55e" : data.percentage >= 40 ? "#f59e0b" : "#ef4444"}">${data.marksObtained}/${data.totalMarks}</div>
        <div style="font-size:24px;color:#64748b">${data.percentage.toFixed(1)}%</div>
      </div>
      <h3>Section-wise Performance</h3>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden"><thead><tr style="background:#2563eb;color:white"><th style="padding:10px">Section</th><th style="padding:10px">Score</th><th style="padding:10px">%</th></tr></thead><tbody>${sectionRows}</tbody></table>
      <h3 style="margin-top:20px">Chapter-wise Performance</h3>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden"><thead><tr style="background:#2563eb;color:white"><th style="padding:10px">Chapter</th><th style="padding:10px">Score</th><th style="padding:10px">%</th></tr></thead><tbody>${chapterRows}</tbody></table>
      ${data.strengths.length > 0 ? `<h3 style="color:#22c55e">💪 Strengths</h3><ul>${data.strengths.map((s) => `<li>${s}</li>`).join("")}</ul>` : ""}
      ${data.weaknesses.length > 0 ? `<h3 style="color:#ef4444">📌 Areas to Improve</h3><ul>${data.weaknesses.map((w) => `<li>${w}</li>`).join("")}</ul>` : ""}
      ${data.recommendations.length > 0 ? `<h3 style="color:#2563eb">📖 Study Recommendations</h3><ul>${data.recommendations.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    </div>
    <div style="background:#1e293b;color:white;padding:16px;border-radius:0 0 12px 12px;text-align:center;font-size:14px">
      <p style="margin:0">Powered by ExamAce - AI-Powered Exam Practice</p>
    </div>
  </body></html>`;
}
