import { describe, expect, it } from "vitest";
import type { Question } from "@prisma/client";
import { asJson, canReveal, isOpenForAnswers, mapLimit, normalizeDifficulty, SUBMIT_GRACE_MS, toClientQuestion } from "@/lib/exam";
import { escapeHtml } from "@/lib/sanitize";
import { extractJson } from "@/lib/ai";
import { generatePaperSchema, startSessionSchema } from "@/lib/validation";

const question = {
  id: "q".repeat(24),
  sessionId: "s".repeat(24),
  questionNumber: 1,
  section: "A",
  type: "mcq",
  questionText: "2 + 2 = ?",
  options: ["A) 3", "B) 4"],
  correctAnswer: "B",
  solution: "Because arithmetic.",
  marks: 4,
  negativeMarks: 1,
  chapterName: "Numbers",
  difficulty: "easy",
  imageUrl: null,
  hasSubParts: false,
  subParts: null,
  createdAt: new Date(),
} as unknown as Question;

describe("answer secrecy", () => {
  it("hides the correct answer and solution while the exam is active", () => {
    const q = toClientQuestion(question, canReveal({ status: "active" }));
    expect(q).not.toHaveProperty("correctAnswer");
    expect(q).not.toHaveProperty("solution");
  });
  it("reveals them once the exam is finished", () => {
    expect(toClientQuestion(question, canReveal({ status: "completed" }))).toMatchObject({ correctAnswer: "B" });
  });
});

describe("exam clock", () => {
  const startTime = new Date("2026-01-01T10:00:00Z");
  const session = { status: "active" as const, startTime, duration: 3600 }; // seconds
  it("accepts answers within the duration + grace period", () => {
    expect(isOpenForAnswers(session, new Date(startTime.getTime() + 3600 * 1000 + SUBMIT_GRACE_MS - 1000))).toBe(true);
  });
  it("rejects answers after the deadline", () => {
    expect(isOpenForAnswers(session, new Date(startTime.getTime() + 3600 * 1000 + SUBMIT_GRACE_MS + 1000))).toBe(false);
  });
  it("rejects answers once submitted", () => {
    expect(isOpenForAnswers({ ...session, status: "completed" }, startTime)).toBe(false);
  });
});

describe("data helpers", () => {
  it("asJson reads both legacy JSON strings and native JSON", () => {
    expect(asJson('["a","b"]', [])).toEqual(["a", "b"]);
    expect(asJson(["a"], [])).toEqual(["a"]);
    expect(asJson("not json", ["fallback"])).toEqual(["fallback"]);
  });
  it("normalizeDifficulty maps unknown AI values to medium", () => {
    expect(normalizeDifficulty("HARD")).toBe("hard");
    expect(normalizeDifficulty("super tricky")).toBe("medium");
  });
  it("mapLimit never runs more than N jobs at once and keeps order", async () => {
    let running = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return n * 10;
    });
    expect(peak).toBe(2);
    expect(out).toEqual([10, 20, 30, 40, 50, 60]);
  });
  it("escapeHtml neutralises markup in names / AI text", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
  it("extractJson tolerates code fences and surrounding prose", () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("request validation", () => {
  it("normalises optional e-mails and rejects bad ones", () => {
    expect(startSessionSchema.parse({ name: " Asha ", email: " ASHA@Mail.com " })).toEqual({ name: "Asha", email: "asha@mail.com", parentEmail: undefined });
    expect(startSessionSchema.safeParse({ name: "A", email: "not-an-email" }).success).toBe(false);
  });
  it("bounds the paper request", () => {
    expect(generatePaperSchema.safeParse({ mode: "jee_mains", subject: "physics", chapters: [] }).success).toBe(false);
    expect(generatePaperSchema.safeParse({ mode: "hacker_mode", subject: "physics", chapters: ["Units"] }).success).toBe(false);
  });
});

import { getLocalQuestions, sectionSubject } from "@/lib/paper-generator/question-bank";
import { getChaptersForSubject, getExamPattern } from "@/lib/syllabus";

describe("offline question bank stays on-subject", () => {
  it("full mock sections get their own subject, not physics", () => {
    const pattern = getExamPattern("jee_mains", "full_mock");
    const chem = pattern.sections.find((s) => s.code === "chemistry_a")!;
    expect(sectionSubject("full_mock", chem)).toBe("chemistry");
    const chemChapters = new Set(getChaptersForSubject("jee_mains", "chemistry").map((c) => c.name));
    const qs = getLocalQuestions("jee_mains", "full_mock", ["Atomic Structure"], chem);
    expect(qs.length).toBe(chem.questionCount);
    expect(qs.every((q) => chemChapters.has(q.chapterName))).toBe(true);
  });

  it("English gets English tasks, never physics", () => {
    const pattern = getExamPattern("class12", "english");
    for (const section of pattern.sections) {
      const qs = getLocalQuestions("class12", "english", ["The Last Lesson"], section);
      expect(qs.length).toBe(section.questionCount);
      expect(qs.every((q) => !/kinetic|velocity|newton/i.test(q.questionText))).toBe(true);
    }
  });

  it("keeps real chapter labels instead of rotating picked chapters", () => {
    const pattern = getExamPattern("jee_mains", "physics");
    const qs = getLocalQuestions("jee_mains", "physics", ["Kinematics"], pattern.sections[0]);
    const physicsChapters = new Set(getChaptersForSubject("jee_mains", "physics").map((c) => c.name));
    expect(qs.every((q) => physicsChapters.has(q.chapterName) || q.chapterName === "Kinematics")).toBe(true);
  });
});

describe("integer sections", () => {
  it("only get numeric answers, in every mode and subject", () => {
    for (const [mode, subject] of [["jee_mains", "physics"], ["jee_mains", "chemistry"], ["jee_mains", "mathematics"], ["jee_advanced", "full_mock"], ["jee_mains", "full_mock"]] as const) {
      for (const section of getExamPattern(mode, subject).sections.filter((s) => s.type === "integer")) {
        const qs = getLocalQuestions(mode, subject, getChaptersForSubject(mode, subject === "full_mock" ? "physics" : subject).slice(0, 2).map((c) => c.name), section);
        expect(qs.every((q) => /^-?\d+(\.\d+)?$/.test(q.correctAnswer.trim())), `${mode}/${subject}/${section.code}`).toBe(true);
      }
    }
  });
});
