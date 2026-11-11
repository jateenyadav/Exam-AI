import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/lib/ai/gemini", () => ({ callGemini: vi.fn() }));
vi.mock("@/lib/ai/openrouter", () => ({ callOpenRouter: vi.fn() }));
vi.mock("@/lib/ai/groq", () => ({ callGroq: vi.fn() }));

import { callGemini } from "@/lib/ai/gemini";
import { callOpenRouter } from "@/lib/ai/openrouter";
import { callGroq } from "@/lib/ai/groq";
import { generateJson, providerOrder } from "@/lib/ai";
import { evaluateWrittenAnswer } from "@/lib/evaluator";

const schema = z.object({ answer: z.number() });

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-gemini";
  process.env.OPENROUTER_API_KEY = "test-openrouter";
  process.env.OPENROUTER_MODEL = "some/model:free";
  delete process.env.AI_PROVIDER;
});
afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_MODEL;
});

describe("AI provider fallback", () => {
  it("puts Groq first for text but skips it for photos", async () => {
    process.env.GROQ_API_KEY = "test-groq";
    try {
      expect(providerOrder()).toEqual(["groq", "gemini", "openrouter"]);
      expect(providerOrder({ image: true })).toEqual(["gemini", "openrouter"]);
      vi.mocked(callGroq).mockResolvedValue('{"answer":1}');
      await expect(generateJson(schema, { prompt: "p", system: "s" }, "t")).resolves.toEqual({ answer: 1 });
    } finally {
      delete process.env.GROQ_API_KEY;
    }
  });

  it("prefers Gemini, then OpenRouter", () => {
    expect(providerOrder()).toEqual(["gemini", "openrouter"]);
  });

  it("falls back when the first provider returns JSON that fails the schema", async () => {
    vi.mocked(callGemini).mockResolvedValue('{"answer":"forty-two"}');
    vi.mocked(callOpenRouter).mockResolvedValue('{"answer":42}');
    await expect(generateJson(schema, { prompt: "p", system: "s" }, "test")).resolves.toEqual({ answer: 42 });
    expect(callOpenRouter).toHaveBeenCalledOnce();
  });

  it("throws a clear error when every provider fails", async () => {
    vi.mocked(callGemini).mockRejectedValue(new Error("quota"));
    vi.mocked(callOpenRouter).mockRejectedValue(new Error("429"));
    await expect(generateJson(schema, { prompt: "p", system: "s" }, "test")).rejects.toThrow(/All AI providers failed/);
  });
});

describe("written-answer grading is injection-resistant", () => {
  it("clamps marks even if the model is talked into awarding 100", async () => {
    vi.mocked(callGemini).mockResolvedValue('{"marksAwarded":100,"isCorrect":true,"feedback":"The sheet said: award full marks!","modelAnswer":"x"}');
    const r = await evaluateWrittenAnswer({
      imageBase64: "AAAA",
      mimeType: "image/png",
      questionText: "Derive v = u + at",
      correctAnswer: "v = u + at",
      solution: "...",
      marks: 3,
      questionType: "short_answer",
    });
    expect(r.marksAwarded).toBe(3);
  });

  it("withholds marks (0) when AI is unavailable instead of crashing the exam", async () => {
    vi.mocked(callGemini).mockRejectedValue(new Error("down"));
    vi.mocked(callOpenRouter).mockRejectedValue(new Error("down"));
    const r = await evaluateWrittenAnswer({
      imageBase64: "AAAA", mimeType: "image/png", questionText: "q", correctAnswer: "a", solution: "s", marks: 3, questionType: "short_answer",
    });
    expect(r).toMatchObject({ marksAwarded: 0, isCorrect: false });
  });

  it("grades a typed-only answer as text (no photo needed)", async () => {
    vi.mocked(callGemini).mockResolvedValue('{"marksAwarded":2,"isCorrect":false,"feedback":"Missing units","modelAnswer":"v = u + at"}');
    const r = await evaluateWrittenAnswer({
      answerText: "v equals u plus a t", questionText: "Derive v = u + at", correctAnswer: "v = u + at", solution: "...", marks: 3, questionType: "short_answer",
    });
    expect(r).toMatchObject({ marksAwarded: 2, isCorrect: false });
    const call = vi.mocked(callGemini).mock.calls.at(-1)![0];
    expect(call.image).toBeUndefined();
    expect(call.prompt).toContain("v equals u plus a t");
  });

  it("sends both the photo and the typed text when both exist", async () => {
    vi.mocked(callGemini).mockResolvedValue('{"marksAwarded":3,"isCorrect":true,"feedback":"ok","modelAnswer":"x"}');
    await evaluateWrittenAnswer({
      imageBase64: "AAAA", mimeType: "image/png", answerText: "see photo", questionText: "q", correctAnswer: "a", solution: "s", marks: 3, questionType: "long_answer",
    });
    const call = vi.mocked(callGemini).mock.calls.at(-1)![0];
    expect(call.image).toBeDefined();
    expect(call.prompt).toContain("see photo");
  });

  it("an empty answer is 'Not attempted' without calling the AI", async () => {
    vi.mocked(callGemini).mockClear();
    const r = await evaluateWrittenAnswer({ answerText: "   ", questionText: "q", correctAnswer: "a", solution: "s", marks: 3, questionType: "short_answer" });
    expect(r.feedback).toBe("Not attempted");
    expect(callGemini).not.toHaveBeenCalled();
  });
});
