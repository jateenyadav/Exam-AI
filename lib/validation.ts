import { z } from "zod";

export const EXAM_MODES = ["class11", "class12", "jee_mains", "jee_advanced"] as const;
export const QUESTION_TYPES = [
  "mcq",
  "assertion_reason",
  "integer",
  "multiple_correct",
  "short_answer",
  "long_answer",
  "case_based",
] as const;

export const objectId = z.string().regex(/^[a-f0-9]{24}$/, "Invalid id");

// Trim first (pasted e-mails often carry spaces), then validate, then lower-case.
const optionalEmail = z
  .string()
  .trim()
  .pipe(z.union([z.literal(""), z.email().max(254)]))
  .optional()
  .transform((v) => (v ? v.toLowerCase() : undefined));

export const startSessionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: optionalEmail,
  parentEmail: optionalEmail,
});

export const generatePaperSchema = z.object({
  mode: z.enum(EXAM_MODES),
  subject: z.string().trim().min(1).max(40),
  chapters: z.array(z.string().trim().min(1).max(120)).min(1, "Pick at least one chapter").max(30),
});

export const sessionIdSchema = z.object({ sessionId: objectId });

export const sessionUpdateSchema = z.object({
  sessionId: objectId,
  violationCount: z.number().int().min(0).max(1000).optional(),
  autoSubmitted: z.literal(true).optional(),
});

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 2_000_000;
export const MAX_ANSWER_CHARS = 5_000;

// ---- AI output contracts: model output is untrusted until it passes these ----

export const generatedQuestionSchema = z.object({
  questionText: z.string().min(1).max(4_000),
  options: z.array(z.string().max(1_000)).max(6).optional(),
  correctAnswer: z.string().min(1).max(4_000),
  solution: z.string().max(8_000).default(""),
  difficulty: z.string().optional(),
  chapterName: z.string().max(200).optional(),
  hasSubParts: z.boolean().optional(),
  subParts: z
    .array(z.object({ questionText: z.string().max(2_000), correctAnswer: z.string().max(2_000), marks: z.number() }))
    .max(8)
    .optional(),
});

export const generatedQuestionsSchema = z.union([
  z.array(generatedQuestionSchema),
  z.object({ questions: z.array(generatedQuestionSchema) }).transform((o) => o.questions),
]);

export const writtenEvaluationSchema = z.object({
  marksAwarded: z.coerce.number(),
  isCorrect: z.boolean().optional(),
  feedback: z.string().max(4_000).default(""),
  modelAnswer: z.string().max(8_000).default(""),
});

export const reportSchema = z.object({
  strengths: z.array(z.string().max(300)).max(8).default([]),
  weaknesses: z.array(z.string().max(300)).max(8).default([]),
  recommendations: z.array(z.string().max(400)).max(10).default([]),
  estimatedGrade: z.string().max(80).default(""),
});
