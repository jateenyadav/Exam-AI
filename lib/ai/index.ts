import type { ZodType } from "zod";
import { env } from "@/lib/env";
import { log } from "@/lib/http";
import { callGemini, type AiRequest } from "./gemini";
import { callOpenRouter } from "./openrouter";

type Provider = "gemini" | "openrouter";

/** Which providers are usable right now, in the order we'll try them. */
export function providerOrder(): Provider[] {
  const e = env();
  const available: Provider[] = [];
  if (e.GEMINI_API_KEY) available.push("gemini");
  if (e.OPENROUTER_API_KEY && e.OPENROUTER_MODEL) available.push("openrouter");
  if (e.AI_PROVIDER && available.includes(e.AI_PROVIDER)) {
    return [e.AI_PROVIDER, ...available.filter((p) => p !== e.AI_PROVIDER)];
  }
  return available;
}

export function aiStatus() {
  const e = env();
  return {
    providers: providerOrder(),
    geminiModel: e.GEMINI_API_KEY ? e.GEMINI_MODEL : null,
    openrouterModel: e.OPENROUTER_API_KEY ? e.OPENROUTER_MODEL ?? "(set OPENROUTER_MODEL)" : null,
  };
}

/** Models often wrap JSON in ``` fences or add prose — pull out the JSON value. */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("AI response was not JSON");
  }
}

async function callProvider(provider: Provider, req: AiRequest): Promise<string> {
  const e = env();
  if (provider === "gemini") return callGemini(req, e.GEMINI_API_KEY!, e.GEMINI_MODEL);
  return callOpenRouter(req, e.OPENROUTER_API_KEY!, e.OPENROUTER_MODEL!, e.NEXT_PUBLIC_APP_URL);
}

/**
 * Ask the AI for JSON and validate it against a schema. Tries each configured
 * provider in turn; a provider "fails" if it errors, times out, or returns
 * output that doesn't match the schema. Model output is untrusted input.
 */
export async function generateJson<T>(schema: ZodType<T>, req: Omit<AiRequest, "signal">, label: string): Promise<T> {
  const order = providerOrder();
  if (order.length === 0) throw new Error("No AI provider configured (set GEMINI_API_KEY or OPENROUTER_API_KEY + OPENROUTER_MODEL)");

  let lastError: unknown;
  for (const provider of order) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env().AI_TIMEOUT_MS);
    try {
      const text = await callProvider(provider, { ...req, signal: controller.signal });
      const parsed = schema.safeParse(extractJson(text));
      if (!parsed.success) throw new Error(`schema mismatch: ${parsed.error.issues[0]?.message ?? "invalid"}`);
      log("info", { ai: label, provider, ms: Date.now() - started, ok: true, chars: text.length });
      return parsed.data;
    } catch (err) {
      lastError = err;
      log("warn", { ai: label, provider, ms: Date.now() - started, ok: false, msg: err instanceof Error ? err.message : String(err) });
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`All AI providers failed for ${label}: ${lastError instanceof Error ? lastError.message : "unknown"}`);
}
