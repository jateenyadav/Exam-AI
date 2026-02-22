import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, email, parentEmail } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    let student = await prisma.student.findUnique({ where: { email } });

    if (!student) {
      student = await prisma.student.create({
        data: { name, email, parentEmail: parentEmail || null },
      });
    } else {
      student = await prisma.student.update({
        where: { email },
        data: { name, parentEmail: parentEmail || student.parentEmail },
      });
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Student API error:", error);
    return NextResponse.json(
      { error: "Failed to create/find student" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { email },
      include: {
        sessions: {
          include: { result: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Student fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}
