import type { Prisma } from "@prisma/client";
import { generateJson } from "@/lib/ai";
import { mapLimit, normalizeDifficulty, normalizeType } from "@/lib/exam";
import { generatedQuestionsSchema } from "@/lib/validation";
import {
  ExamMode,
  getExamPattern,
  SectionPattern,
} from "@/lib/syllabus";
import { getLocalQuestions } from "./question-bank";

const SYSTEM_PROMPT = `You are an expert CBSE/JEE question paper setter with 20+ years experience. Generate questions strictly from the provided chapters, following exact CBSE/NTA exam patterns. Every question must be unique, curriculum-aligned, and solvable within typical time constraints. Include numerical problems, conceptual questions, and application-based questions in the right ratio. Never repeat questions between sessions. Format output as structured JSON.

CRITICAL RULES:
1. Return ONLY valid JSON, no markdown code fences or extra text
2. Each question must have all required fields
3. Difficulty distribution: ~30% easy, 50% medium, 20% hard
4. Questions should reference latest CBSE/NTA patterns (2020-2024)
5. For MCQs, always provide exactly 4 options labeled A, B, C, D
6. For assertion-reason, format as: Assertion (A): ... Reason (R): ... with standard options
7. Solutions must be step-by-step and complete
8. For case-based questions, provide a case/passage followed by 4 sub-questions`;

interface GeneratedQuestion {
  questionText: string;
  options?: string[];
  correctAnswer: string;
  solution: string;
  difficulty: "easy" | "medium" | "hard";
  chapterName: string;
  hasSubParts?: boolean;
  subParts?: {
    questionText: string;
    correctAnswer: string;
    marks: number;
  }[];
}

export type PaperQuestion = Omit<Prisma.QuestionCreateWithoutSessionInput, "answers">;

/** The sections of a paper with their first question numbers — deterministic for a mode + subject. */
export function sectionPlan(mode: ExamMode, subject: string) {
  const pattern = getExamPattern(mode, subject);
  let next = 1;
  const sections = pattern.sections.map((section) => {
    const startNumber = next;
    next += section.questionCount;
    return { section, startNumber };
  });
  return { pattern, sections };
}

/** Whole paper in one call (used by tests and small papers). Big mocks are built section by section. */
export async function generatePaper(mode: ExamMode, subject: string, selectedChapters: string[]) {
  const { pattern, sections } = sectionPlan(mode, subject);
  const perSection = await mapLimit(sections, 3, ({ section, startNumber }) =>
    generateSectionQuestions(mode, subject, selectedChapters, section, startNumber),
  );
  return { questions: perSection.flat(), pattern };
}

export async function generateSectionQuestions(
  mode: ExamMode,
  subject: string,
  chapters: string[],
  section: SectionPattern,
  startNumber: number,
  budgetMs?: number,
) {
  const chaptersStr = chapters.join(", ");
  const modeLabel =
    mode === "class11"
      ? "CBSE Class 11"
      : mode === "class12"
        ? "CBSE Class 12"
        : mode === "jee_mains"
          ? "JEE Mains"
          : "JEE Advanced";

  let parsed: GeneratedQuestion[];
  let fromBank = false;
  try {
    const prompt = buildPromptForSection(modeLabel, subject, chaptersStr, section);
    parsed = (await generateJson(generatedQuestionsSchema, { prompt, system: SYSTEM_PROMPT }, `paper:${section.code}`, { budgetMs })) as GeneratedQuestion[];
  } catch (err) {
    console.warn(`AI generation failed for ${section.name}, using local question bank:`, (err as Error).message);
    parsed = getLocalQuestions(mode, subject, chapters, section);
    fromBank = true;
  }

  if (parsed.length < section.questionCount) {
    const fallback = getLocalQuestions(mode, subject, chapters, section);
    while (parsed.length < section.questionCount && fallback.length > 0) {
      parsed.push(fallback[parsed.length % fallback.length]);
    }
  }

  return parsed.slice(0, section.questionCount).map(
    (q, idx): PaperQuestion => ({
      questionNumber: startNumber + idx,
      section: section.code,
      type: normalizeType(section.type),
      questionText: q.questionText || "Question text not available",
      options: q.options?.length ? (q.options as Prisma.InputJsonValue) : undefined,
      correctAnswer: q.correctAnswer || "Answer not available",
      solution: q.solution || "Solution not available",
      marks: section.marksPerQuestion,
      negativeMarks: section.negativeMarks,
      // AI output: trust its chapter only if it's one the student picked; bank questions carry their real chapter.
      chapterName: chapters.includes(q.chapterName ?? "") || fromBank ? (q.chapterName || chapters[idx % chapters.length]) : chapters[idx % chapters.length],
      difficulty: normalizeDifficulty(q.difficulty),
      hasSubParts: Boolean(q.hasSubParts && q.subParts?.length),
      subParts: q.subParts?.length ? (q.subParts as Prisma.InputJsonValue) : undefined,
    }),
  );
}

function buildPromptForSection(
  modeLabel: string,
  subject: string,
  chapters: string,
  section: SectionPattern
): string {
  const typeDescriptions: Record<string, string> = {
    mcq: "Multiple Choice Questions with 4 options (A, B, C, D). Include some assertion-reason type MCQs where applicable.",
    assertion_reason:
      "Assertion-Reason type questions. Assertion (A): ... Reason (R): ... with 4 standard options about whether A and R are true/false and if R is the correct explanation.",
    short_answer: "Short answer questions requiring 2-4 lines of working/explanation.",
    long_answer:
      "Long answer questions requiring detailed solutions with diagrams described in text, derivations, or multi-step problem solving.",
    case_based:
      "Case study/passage-based questions. Provide a detailed case study or passage, followed by 4 sub-questions (1 mark each) based on the passage.",
    integer:
      "Integer/Numerical type questions where the answer is a single integer (0-9 or two digit number). No options provided.",
    multiple_correct:
      "Multiple correct answer questions with 4 options where 1 or more options can be correct.",
    matrix_match:
      "Matrix match type questions with Column I and Column II to be matched.",
    paragraph:
      "Paragraph-based questions. Provide a paragraph followed by 2-3 questions.",
  };

  return `Generate exactly ${section.questionCount} ${typeDescriptions[section.type] || section.type} questions for ${modeLabel} ${subject}.

Section: ${section.name}
Marks per question: ${section.marksPerQuestion}
Chapters to cover: ${chapters}
${section.hasInternalChoice ? "Include internal choice (OR question) for each question." : ""}
${section.hasSubParts ? "Each question should have sub-parts." : ""}
${section.attemptRequired ? `Students need to attempt only ${section.attemptRequired} out of ${section.questionCount} questions.` : ""}

Difficulty distribution: 30% easy, 50% medium, 20% hard.
Distribute questions evenly across the given chapters.

Return a JSON array of objects with these exact fields:
{
  "questionText": "The complete question text",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],  // null for non-MCQ
  "correctAnswer": "The correct answer (letter for MCQ, full answer for others)",
  "solution": "Complete step-by-step solution",
  "difficulty": "easy|medium|hard",
  "chapterName": "Chapter name from the provided list"${section.hasSubParts ? `,
  "hasSubParts": true,
  "subParts": [{"questionText": "sub q", "correctAnswer": "ans", "marks": 1}]` : ""}
}`;
}
