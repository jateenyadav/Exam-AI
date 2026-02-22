import { generateWithGemini, evaluateImageWithGemini } from "./gemini";
import { generateWithOpenRouter, evaluateImageWithOpenRouter } from "./openrouter";

const AI_TIMEOUT_MS = 55000;

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
  try {
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "your-openrouter-api-key-here") {
      return await withTimeout(generateWithOpenRouter(prompt, systemPrompt), AI_TIMEOUT_MS);
    }
    throw new Error("No OpenRouter API key");
  } catch (err) {
    console.warn("OpenRouter failed:", (err as Error).message);
    try {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your-gemini-api-key-here") {
        return await withTimeout(generateWithGemini(prompt, systemPrompt), AI_TIMEOUT_MS);
      }
      throw new Error("No Gemini API key");
    } catch (fallbackErr) {
      console.warn("Gemini also failed:", (fallbackErr as Error).message);
      throw new Error("All AI providers failed. Please check your API keys.");
    }
  }
}

export async function evaluateImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  try {
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "your-openrouter-api-key-here") {
      return await withTimeout(evaluateImageWithOpenRouter(imageBase64, mimeType, prompt, systemPrompt), AI_TIMEOUT_MS);
    }
    throw new Error("No OpenRouter API key");
  } catch (err) {
    console.warn("OpenRouter Vision failed:", (err as Error).message);
    try {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your-gemini-api-key-here") {
        return await withTimeout(evaluateImageWithGemini(imageBase64, mimeType, prompt, systemPrompt), AI_TIMEOUT_MS);
      }
      throw new Error("No Gemini API key");
    } catch (fallbackErr) {
      console.warn("Gemini Vision also failed:", (fallbackErr as Error).message);
      throw new Error("All AI providers failed for image evaluation.");
    }
  }
}
