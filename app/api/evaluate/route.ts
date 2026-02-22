import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  evaluateMCQ,
  evaluateInteger,
  evaluateMultipleCorrect,
  evaluateWrittenAnswer,
  generateDetailedReport,
} from "@/lib/evaluator";
import { readFile } from "fs/promises";
import { join } from "path";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    await prisma.examSession.update({
      where: { id: sessionId },
      data: { status: "completed", endTime: new Date() },
    });

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: { orderBy: { questionNumber: "asc" } },
        answers: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sectionBreakdown: Record<string, { total: number; obtained: number }> = {};
    const chapterBreakdown: Record<string, { total: number; obtained: number; questions: number }> = {};
    const wrongAnswers: Array<{
      question: string;
      studentAnswer: string;
      correctAnswer: string;
      chapter: string;
    }> = [];
    let totalObtained = 0;

    for (const question of session.questions) {
      const answer = session.answers.find((a) => a.questionId === question.id);

      if (!sectionBreakdown[question.section]) {
        sectionBreakdown[question.section] = { total: 0, obtained: 0 };
      }
      sectionBreakdown[question.section].total += question.marks;

      if (!chapterBreakdown[question.chapterName]) {
        chapterBreakdown[question.chapterName] = { total: 0, obtained: 0, questions: 0 };
      }
      chapterBreakdown[question.chapterName].total += question.marks;
      chapterBreakdown[question.chapterName].questions += 1;

      let result;

      if (!answer) {
        result = {
          marksAwarded: 0,
          isCorrect: false,
          feedback: "Not attempted",
          modelAnswer: question.correctAnswer,
        };
      } else if (question.type === "mcq" || question.type === "assertion_reason") {
        result = await evaluateMCQ(
          answer.answerText || "",
          question.correctAnswer,
          question.marks,
          question.negativeMarks
        );
      } else if (question.type === "integer") {
        result = await evaluateInteger(
          answer.answerText || "",
          question.correctAnswer,
          question.marks
        );
      } else if (question.type === "multiple_correct") {
        const studentAnswers = answer.answerText
          ? JSON.parse(answer.answerText)
          : [];
        const correctAnswers = question.correctAnswer.split(",").map((a) => a.trim());
        result = await evaluateMultipleCorrect(
          studentAnswers,
          correctAnswers,
          question.marks,
          question.negativeMarks
        );
      } else if (answer.answerImageUrl) {
        try {
          const imagePath = join(process.cwd(), "public", answer.answerImageUrl);
          const imageBuffer = await readFile(imagePath);
          const base64 = imageBuffer.toString("base64");
          const ext = answer.answerImageUrl.split(".").pop() || "jpg";
          const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;

          result = await evaluateWrittenAnswer(
            base64,
            mimeType,
            question.questionText,
            question.correctAnswer,
            question.solution,
            question.marks,
            question.type
          );
        } catch {
          result = {
            marksAwarded: 0,
            isCorrect: false,
            feedback: "Could not read the answer image for evaluation.",
            modelAnswer: question.solution,
          };
        }
      } else {
        result = {
          marksAwarded: 0,
          isCorrect: false,
          feedback: answer.answerText
            ? "Written answer submitted as text – partial evaluation."
            : "Not attempted",
          modelAnswer: question.solution || question.correctAnswer,
        };
      }

      if (answer) {
        await prisma.studentAnswer.update({
          where: { id: answer.id },
          data: {
            isCorrect: result.isCorrect,
            marksAwarded: result.marksAwarded,
            aiFeedback: result.feedback,
            modelAnswer: result.modelAnswer,
          },
        });
      } else {
        await prisma.studentAnswer.create({
          data: {
            sessionId,
            questionId: question.id,
            isCorrect: false,
            marksAwarded: 0,
            aiFeedback: "Not attempted",
            modelAnswer: question.correctAnswer,
          },
        });
      }

      const marks = Math.max(0, result.marksAwarded);
      totalObtained += result.marksAwarded;
      sectionBreakdown[question.section].obtained += marks;
      chapterBreakdown[question.chapterName].obtained += marks;

      if (!result.isCorrect && answer?.answerText) {
        wrongAnswers.push({
          question: question.questionText.substring(0, 100),
          studentAnswer: answer.answerText || "Image answer",
          correctAnswer: question.correctAnswer,
          chapter: question.chapterName,
        });
      }
    }

    const finalScore = Math.max(0, totalObtained);
    const percentage = (finalScore / session.totalMarks) * 100;

    let report;
    try {
      report = await generateDetailedReport({
        mode: session.mode,
        subject: session.subject,
        totalMarks: session.totalMarks,
        marksObtained: finalScore,
        sectionBreakdown,
        chapterBreakdown,
        wrongAnswers,
      });
    } catch {
      report = {
        strengths: ["Completed the exam"],
        weaknesses: ["Report generation unavailable"],
        recommendations: ["Practice more questions"],
        estimatedGrade: percentage >= 90 ? "A1" : percentage >= 75 ? "A2" : percentage >= 60 ? "B1" : "B2",
      };
    }

    const examResult = await prisma.examResult.upsert({
      where: { sessionId },
      create: {
        sessionId,
        totalMarks: session.totalMarks,
        marksObtained: finalScore,
        percentage,
        sectionBreakdown: JSON.stringify(sectionBreakdown),
        chapterBreakdown: JSON.stringify(chapterBreakdown),
        strengths: JSON.stringify(report.strengths),
        weaknesses: JSON.stringify(report.weaknesses),
        recommendations: JSON.stringify(report.recommendations),
      },
      update: {
        marksObtained: finalScore,
        percentage,
        sectionBreakdown: JSON.stringify(sectionBreakdown),
        chapterBreakdown: JSON.stringify(chapterBreakdown),
        strengths: JSON.stringify(report.strengths),
        weaknesses: JSON.stringify(report.weaknesses),
        recommendations: JSON.stringify(report.recommendations),
      },
    });

    return NextResponse.json({
      result: {
        ...examResult,
        sectionBreakdown,
        chapterBreakdown,
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        recommendations: report.recommendations,
        estimatedGrade: report.estimatedGrade,
      },
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: "Evaluation failed. Please try again." },
      { status: 500 }
    );
  }
}
