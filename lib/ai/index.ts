import { generateWithGemini, evaluateImageWithGemini } from "./gemini";
import { generateWithOpenRouter, evaluateImageWithOpenRouter } from "./openrouter";
import { getSettings } from "@/lib/settings";

const AI_TIMEOUT_MS = 55000;

type Provider = "gemini" | "openrouter";

interface AIKeys {
  geminiKey: string;
  openrouterKey: string;
  primary: Provider;
}

async function getAIKeys(): Promise<AIKeys> {
  const db = await getSettings();
  const geminiKey = db["GEMINI_API_KEY"] || process.env.GEMINI_API_KEY || "";
  const openrouterKey = db["OPENROUTER_API_KEY"] || process.env.OPENROUTER_API_KEY || "";

  const providerPref = (db["AI_PROVIDER"] || process.env.AI_PROVIDER || "").toLowerCase();
  let primary: Provider = "gemini";
  if (providerPref === "openrouter") primary = "openrouter";
  else if (providerPref === "gemini") primary = "gemini";
  else if (openrouterKey && !geminiKey) primary = "openrouter";

  return { geminiKey, openrouterKey, primary };
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
  const keys = await getAIKeys();
  const fallback: Provider = keys.primary === "gemini" ? "openrouter" : "gemini";

  const run = async (provider: Provider) => {
    const key = provider === "gemini" ? keys.geminiKey : keys.openrouterKey;
    if (!key) throw new Error(`No ${provider} API key configured`);
    if (provider === "gemini") {
      return withTimeout(generateWithGemini(prompt, systemPrompt, key), AI_TIMEOUT_MS);
    }
    return withTimeout(generateWithOpenRouter(prompt, systemPrompt, key), AI_TIMEOUT_MS);
  };

  try {
    return await run(keys.primary);
  } catch (err) {
    console.warn(`${keys.primary} failed:`, (err as Error).message);
    try {
      return await run(fallback);
    } catch (fallbackErr) {
      console.warn(`${fallback} also failed:`, (fallbackErr as Error).message);
      throw new Error("All AI providers failed. Check your API keys in Settings.");
    }
  }
}

export async function evaluateImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  const keys = await getAIKeys();
  const fallback: Provider = keys.primary === "gemini" ? "openrouter" : "gemini";

  const run = async (provider: Provider) => {
    const key = provider === "gemini" ? keys.geminiKey : keys.openrouterKey;
    if (!key) throw new Error(`No ${provider} API key configured`);
    if (provider === "gemini") {
      return withTimeout(evaluateImageWithGemini(imageBase64, mimeType, prompt, systemPrompt, key), AI_TIMEOUT_MS);
    }
    return withTimeout(evaluateImageWithOpenRouter(imageBase64, mimeType, prompt, systemPrompt, key), AI_TIMEOUT_MS);
  };

  try {
    return await run(keys.primary);
  } catch (err) {
    console.warn(`${keys.primary} Vision failed:`, (err as Error).message);
    try {
      return await run(fallback);
    } catch (fallbackErr) {
      console.warn(`${fallback} Vision also failed:`, (fallbackErr as Error).message);
      throw new Error("All AI providers failed for image evaluation.");
    }
  }
}
