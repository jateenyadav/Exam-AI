import type { Difficulty, ExamSession, Question, QuestionType, StudentAnswer } from "@prisma/client";

/** Extra time allowed after the clock hits zero, for network latency on the final save. */
export const SUBMIT_GRACE_MS = 2 * 60 * 1000;

/** `duration` is stored in seconds (see ExamPattern.duration). */
export function deadlineOf(session: Pick<ExamSession, "startTime" | "duration">): Date {
  return new Date(session.startTime.getTime() + session.duration * 1000 + SUBMIT_GRACE_MS);
}

/** Answers may be saved only while the exam is active and within its time limit. */
export function isOpenForAnswers(session: Pick<ExamSession, "status" | "startTime" | "duration">, now = new Date()) {
  return session.status === "active" && now < deadlineOf(session);
}

/** Answers + solutions are revealed only once the exam is finished. */
export function canReveal(session: Pick<ExamSession, "status">) {
  return session.status === "completed" || session.status === "auto_submitted";
}

/** Values stored before the Json migration were JSON strings — accept both shapes. */
export function asJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export function toClientQuestion(q: Question, reveal: boolean) {
  return {
    id: q.id,
    questionNumber: q.questionNumber,
    section: q.section,
    type: q.type,
    questionText: q.questionText,
    options: asJson<string[] | null>(q.options, null),
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    chapterName: q.chapterName,
    difficulty: q.difficulty,
    hasSubParts: q.hasSubParts,
    subParts: asJson<unknown[] | null>(q.subParts, null),
    ...(reveal ? { correctAnswer: q.correctAnswer, solution: q.solution } : {}),
  };
}

export function toClientAnswer(a: StudentAnswer, reveal: boolean) {
  return {
    id: a.id,
    questionId: a.questionId,
    answerText: a.answerText,
    hasImage: Boolean(a.answerImageUrl),
    submittedAt: a.submittedAt,
    ...(reveal
      ? { isCorrect: a.isCorrect, marksAwarded: a.marksAwarded, aiFeedback: a.aiFeedback, modelAnswer: a.modelAnswer }
      : {}),
  };
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export function normalizeDifficulty(value: unknown): Difficulty {
  const v = String(value ?? "").toLowerCase().trim() as Difficulty;
  return DIFFICULTIES.includes(v) ? v : "medium";
}

const TYPES: QuestionType[] = ["mcq", "assertion_reason", "integer", "multiple_correct", "short_answer", "long_answer", "case_based"];
export function normalizeType(value: unknown): QuestionType {
  const v = String(value ?? "") as QuestionType;
  return TYPES.includes(v) ? v : "short_answer";
}

/** Run async jobs with a concurrency cap (keeps AI calls inside the function time limit). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
