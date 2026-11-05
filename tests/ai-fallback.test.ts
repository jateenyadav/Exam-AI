import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/lib/ai/gemini", () => ({ callGemini: vi.fn() }));
vi.mock("@/lib/ai/openrouter", () => ({ callOpenRouter: vi.fn() }));

import { callGemini } from "@/lib/ai/gemini";
import { callOpenRouter } from "@/lib/ai/openrouter";
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
});
