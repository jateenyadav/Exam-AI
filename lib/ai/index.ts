import { generateWithGemini, evaluateImageWithGemini } from "./gemini";
import { generateWithOpenRouter, evaluateImageWithOpenRouter } from "./openrouter";

const AI_TIMEOUT_MS = 55000;

type Provider = "gemini" | "openrouter";

function getPrimaryProvider(): Provider {
  const env = (process.env.AI_PROVIDER || "").toLowerCase();
  if (env === "gemini") return "gemini";
  if (env === "openrouter") return "openrouter";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return "gemini";
}

function hasKey(provider: Provider): boolean {
  if (provider === "gemini") return !!process.env.GEMINI_API_KEY;
  return !!process.env.OPENROUTER_API_KEY;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function generateText(
  prompt: string,
  systemPrompt: string
): Promise<string> {
  const primary = getPrimaryProvider();
  const fallback: Provider = primary === "gemini" ? "openrouter" : "gemini";

  const run = async (provider: Provider) => {
    if (!hasKey(provider)) throw new Error(`No ${provider} API key`);
    if (provider === "gemini") {
      return withTimeout(generateWithGemini(prompt, systemPrompt), AI_TIMEOUT_MS);
    }
    return withTimeout(generateWithOpenRouter(prompt, systemPrompt), AI_TIMEOUT_MS);
  };

  try {
    return await run(primary);
  } catch (err) {
    console.warn(`${primary} failed:`, (err as Error).message);
    try {
      return await run(fallback);
    } catch (fallbackErr) {
      console.warn(`${fallback} also failed:`, (fallbackErr as Error).message);
      throw new Error("All AI providers failed. Check your API keys in environment variables.");
    }
  }
}

export async function evaluateImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  const primary = getPrimaryProvider();
  const fallback: Provider = primary === "gemini" ? "openrouter" : "gemini";

  const run = async (provider: Provider) => {
    if (!hasKey(provider)) throw new Error(`No ${provider} API key`);
    if (provider === "gemini") {
      return withTimeout(evaluateImageWithGemini(imageBase64, mimeType, prompt, systemPrompt), AI_TIMEOUT_MS);
    }
    return withTimeout(evaluateImageWithOpenRouter(imageBase64, mimeType, prompt, systemPrompt), AI_TIMEOUT_MS);
  };

  try {
    return await run(primary);
  } catch (err) {
    console.warn(`${primary} Vision failed:`, (err as Error).message);
    try {
      return await run(fallback);
    } catch (fallbackErr) {
      console.warn(`${fallback} Vision also failed:`, (fallbackErr as Error).message);
      throw new Error("All AI providers failed for image evaluation.");
    }
  }
}
