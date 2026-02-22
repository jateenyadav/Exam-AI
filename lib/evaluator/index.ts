import { evaluateImage, generateText } from "@/lib/ai";

const EVALUATION_SYSTEM_PROMPT = `You are an expert CBSE/JEE examiner with 20+ years of experience. Evaluate student answers strictly as per CBSE/NTA marking scheme. Be fair but strict. Award partial marks where applicable.

CRITICAL: Return ONLY valid JSON, no markdown code fences or extra text.`;

export interface EvaluationResult {
  marksAwarded: number;
  isCorrect: boolean;
  feedback: string;
  modelAnswer: string;
}

export async function evaluateMCQ(
  studentAnswer: string,
  correctAnswer: string,
  marks: number,
  negativeMarks: number
): Promise<EvaluationResult> {
  const normalizedStudent = studentAnswer.trim().toUpperCase().replace(/[^A-D0-9]/g, "");
  const normalizedCorrect = correctAnswer.trim().toUpperCase().replace(/[^A-D0-9]/g, "");

  const isCorrect = normalizedStudent === normalizedCorrect;

  return {
    marksAwarded: isCorrect ? marks : studentAnswer ? -negativeMarks : 0,
    isCorrect,
    feedback: isCorrect
      ? "Correct answer!"
      : studentAnswer
        ? `Incorrect. You selected ${studentAnswer}, the correct answer is ${correctAnswer}.`
        : "Not attempted.",
    modelAnswer: correctAnswer,
  };
}

export async function evaluateMultipleCorrect(
  studentAnswers: string[],
  correctAnswers: string[],
  marks: number,
  negativeMarks: number
): Promise<EvaluationResult> {
  const normalizedStudent = studentAnswers.map((a) => a.trim().toUpperCase()).sort();
  const normalizedCorrect = correctAnswers.map((a) => a.trim().toUpperCase()).sort();

  const allCorrect = JSON.stringify(normalizedStudent) === JSON.stringify(normalizedCorrect);
  const partialCorrect = normalizedStudent.every((a) => normalizedCorrect.includes(a));
  const hasWrong = normalizedStudent.some((a) => !normalizedCorrect.includes(a));

  let awarded = 0;
  if (allCorrect) {
    awarded = marks;
  } else if (hasWrong) {
    awarded = -negativeMarks;
  } else if (partialCorrect && normalizedStudent.length > 0) {
    awarded = Math.floor((normalizedStudent.length / normalizedCorrect.length) * marks);
  }

  return {
    marksAwarded: awarded,
    isCorrect: allCorrect,
    feedback: allCorrect
      ? "All correct options selected!"
      : `Correct options: ${normalizedCorrect.join(", ")}. You selected: ${normalizedStudent.join(", ")}.`,
    modelAnswer: normalizedCorrect.join(", "),
  };
}

export async function evaluateInteger(
  studentAnswer: string,
  correctAnswer: string,
  marks: number
): Promise<EvaluationResult> {
  const studentNum = parseFloat(studentAnswer);
  const correctNum = parseFloat(correctAnswer);
  const isCorrect = !isNaN(studentNum) && Math.abs(studentNum - correctNum) < 0.01;

  return {
    marksAwarded: isCorrect ? marks : 0,
    isCorrect,
    feedback: isCorrect
      ? "Correct!"
      : studentAnswer
        ? `Incorrect. Your answer: ${studentAnswer}, Correct answer: ${correctAnswer}.`
        : "Not attempted.",
    modelAnswer: correctAnswer,
  };
}

export async function evaluateWrittenAnswer(
  answerImageBase64: string,
  mimeType: string,
  questionText: string,
  correctAnswer: string,
  solution: string,
  marks: number,
  questionType: string
): Promise<EvaluationResult> {
  const prompt = `Evaluate this student's handwritten answer for the following question.

QUESTION (${marks} marks, ${questionType}):
${questionText}

CORRECT ANSWER / MARKING SCHEME:
${correctAnswer}

DETAILED SOLUTION:
${solution}

TOTAL MARKS: ${marks}

Instructions:
1. Read the handwritten answer carefully
2. Award marks strictly as per CBSE marking scheme
3. Give partial marks for partially correct steps
4. If the image is unclear or unreadable, award 0 marks and note it

Return JSON:
{
  "marksAwarded": <number between 0 and ${marks}>,
  "isCorrect": <boolean - true if full marks>,
  "feedback": "<What the student got right, what's missing or incorrect, and tips to improve>",
  "modelAnswer": "<Complete step-by-step model answer in simple language>"
}`;

  try {
    const response = await evaluateImage(
      answerImageBase64,
      mimeType,
      prompt,
      EVALUATION_SYSTEM_PROMPT
    );

    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Image evaluation failed:", error);
    return {
      marksAwarded: 0,
      isCorrect: false,
      feedback: "Unable to evaluate this answer. The image may be unclear or the AI service is unavailable.",
      modelAnswer: solution,
    };
  }
}

export async function generateDetailedReport(
  sessionData: {
    mode: string;
    subject: string;
    totalMarks: number;
    marksObtained: number;
    sectionBreakdown: Record<string, { total: number; obtained: number }>;
    chapterBreakdown: Record<string, { total: number; obtained: number; questions: number }>;
    wrongAnswers: Array<{ question: string; studentAnswer: string; correctAnswer: string; chapter: string }>;
  }
): Promise<{
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  estimatedGrade: string;
}> {
  const prompt = `Analyze this exam performance and provide insights:

Exam: ${sessionData.mode} - ${sessionData.subject}
Score: ${sessionData.marksObtained}/${sessionData.totalMarks} (${((sessionData.marksObtained / sessionData.totalMarks) * 100).toFixed(1)}%)

Section Breakdown:
${Object.entries(sessionData.sectionBreakdown)
  .map(([section, data]) => `${section}: ${data.obtained}/${data.total}`)
  .join("\n")}

Chapter Breakdown:
${Object.entries(sessionData.chapterBreakdown)
  .map(([ch, data]) => `${ch}: ${data.obtained}/${data.total} (${data.questions} questions)`)
  .join("\n")}

Number of wrong answers: ${sessionData.wrongAnswers.length}
Chapters with mistakes: ${Array.from(new Set(sessionData.wrongAnswers.map((w) => w.chapter))).join(", ")}

Return JSON:
{
  "strengths": ["list of 3-5 strong areas"],
  "weaknesses": ["list of 3-5 weak areas"],
  "recommendations": ["list of 5-7 specific study recommendations"],
  "estimatedGrade": "CBSE grade or JEE percentile estimate"
}`;

  try {
    const response = await generateText(prompt, "You are an expert educational counselor. Analyze student performance and provide actionable insights. Return ONLY valid JSON.");
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const pct = (sessionData.marksObtained / sessionData.totalMarks) * 100;
    return {
      strengths: ["Attempted the exam"],
      weaknesses: ["Analysis unavailable – check AI configuration"],
      recommendations: ["Review all chapters systematically", "Practice previous year papers"],
      estimatedGrade: pct >= 90 ? "A1" : pct >= 80 ? "A2" : pct >= 70 ? "B1" : pct >= 60 ? "B2" : pct >= 50 ? "C1" : pct >= 40 ? "C2" : "Needs Improvement",
    };
  }
}
