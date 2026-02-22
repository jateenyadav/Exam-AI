import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePaper } from "@/lib/paper-generator";
import { ExamMode } from "@/lib/syllabus";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { studentId, mode, subject, chapters } = await req.json();

    if (!studentId || !mode || !subject || !chapters?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { questions, pattern } = await generatePaper(
      mode as ExamMode,
      subject,
      chapters
    );

    const validQuestions = questions.map((q) => ({
      ...q,
      correctAnswer: q.correctAnswer || "Answer not available",
      questionText: q.questionText || "Question text not available",
      solution: q.solution || "Solution not available",
    }));

    const session = await prisma.examSession.create({
      data: {
        studentId,
        mode,
        subject,
        chapters: JSON.stringify(chapters),
        totalMarks: pattern.totalMarks,
        duration: pattern.duration,
        status: "active",
        questions: {
          create: validQuestions.map((q) => ({
            questionNumber: q.questionNumber,
            section: q.section,
            type: q.type,
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            solution: q.solution,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
            chapterName: q.chapterName,
            difficulty: q.difficulty,
            hasSubParts: q.hasSubParts,
            subParts: q.subParts,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { questionNumber: "asc" },
        },
      },
    });

    const clientQuestions = session.questions.map((q) => ({
      id: q.id,
      questionNumber: q.questionNumber,
      section: q.section,
      type: q.type,
      questionText: q.questionText,
      options: q.options ? JSON.parse(q.options) : null,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      chapterName: q.chapterName,
      difficulty: q.difficulty,
      hasSubParts: q.hasSubParts,
      subParts: q.subParts ? JSON.parse(q.subParts) : null,
    }));

    return NextResponse.json({
      sessionId: session.id,
      questions: clientQuestions,
      totalMarks: pattern.totalMarks,
      duration: pattern.duration,
    });
  } catch (error) {
    console.error("Paper generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate paper. Please try again." },
      { status: 500 }
    );
  }
}
