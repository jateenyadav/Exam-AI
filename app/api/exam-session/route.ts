import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, violationCount, autoSubmitted } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        ...(violationCount !== undefined && { violationCount }),
        ...(autoSubmitted !== undefined && { autoSubmitted, status: "auto_submitted" }),
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Exam session update error:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: true,
        questions: { orderBy: { questionNumber: "asc" } },
        answers: true,
        result: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}
