import type { ZodType } from "zod";
import { env } from "@/lib/env";
import { log } from "@/lib/http";
import { callGemini, type AiRequest } from "./gemini";
import { callOpenRouter } from "./openrouter";
import { callGroq } from "./groq";

type Provider = "gemini" | "groq" | "openrouter";

/** Which providers are usable right now, in the order we'll try them. */
export function providerOrder(opts: { image?: boolean } = {}): Provider[] {
  const e = env();
  const available: Provider[] = [];
  // Text: Groq first (fast, generous free tier). Images: Groq is skipped.
  if (e.GROQ_API_KEY && !opts.image) available.push("groq");
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
    groqModel: e.GROQ_API_KEY ? e.GROQ_MODEL : null,
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
  if (provider === "groq") return callGroq(req, e.GROQ_API_KEY!, e.GROQ_MODEL);
  return callOpenRouter(req, e.OPENROUTER_API_KEY!, e.OPENROUTER_MODEL!, e.NEXT_PUBLIC_APP_URL);
}

/**
 * Ask the AI for JSON and validate it against a schema. Tries each configured
 * provider in turn; a provider "fails" if it errors, times out, or returns
 * output that doesn't match the schema. Model output is untrusted input.
 */
export async function generateJson<T>(
  schema: ZodType<T>,
  req: Omit<AiRequest, "signal">,
  label: string,
  opts: { budgetMs?: number } = {},
): Promise<T> {
  // Optional total time budget across all providers, so a serverless request can't run past its limit.
  const deadline = opts.budgetMs ? Date.now() + opts.budgetMs : Infinity;
  const order = providerOrder({ image: Boolean(req.image) });
  if (order.length === 0) throw new Error("No AI provider configured (set GROQ_API_KEY, GEMINI_API_KEY or OPENROUTER_API_KEY + OPENROUTER_MODEL)");

  let lastError: unknown;
  for (const provider of order) {
    const started = Date.now();
    const remaining = deadline - started;
    if (remaining < 3_000) break; // not enough time left for another attempt
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(env().AI_TIMEOUT_MS, remaining));
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
  throw new Error(`All AI providers failed for ${label}: ${lastError instanceof Error ? lastError.message : "out of time"}`);
}
