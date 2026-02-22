import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sessionId = formData.get("sessionId") as string;
    const questionId = formData.get("questionId") as string;
    const answerText = formData.get("answerText") as string | null;
    const answerImage = formData.get("answerImage") as File | null;

    if (!sessionId || !questionId) {
      return NextResponse.json(
        { error: "Session ID and Question ID required" },
        { status: 400 }
      );
    }

    let imageUrl: string | null = null;

    if (answerImage) {
      const uploadDir = join(process.cwd(), "public", "uploads", sessionId);
      await mkdir(uploadDir, { recursive: true });

      const bytes = await answerImage.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${questionId}_${Date.now()}.${answerImage.type.split("/")[1] || "jpg"}`;
      const filepath = join(uploadDir, filename);

      await writeFile(filepath, buffer);
      imageUrl = `/uploads/${sessionId}/${filename}`;
    }

    const existing = await prisma.studentAnswer.findFirst({
      where: { sessionId, questionId },
    });

    let answer;
    if (existing) {
      answer = await prisma.studentAnswer.update({
        where: { id: existing.id },
        data: {
          answerText: answerText || existing.answerText,
          answerImageUrl: imageUrl || existing.answerImageUrl,
          submittedAt: new Date(),
        },
      });
    } else {
      answer = await prisma.studentAnswer.create({
        data: {
          sessionId,
          questionId,
          answerText,
          answerImageUrl: imageUrl,
        },
      });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Submit answer error:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 }
    );
  }
}
