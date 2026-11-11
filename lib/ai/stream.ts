import { env } from "@/lib/env";
import { log } from "@/lib/http";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Target = { name: string; url: string; key: string; model: string; extraHeaders?: Record<string, string> };

/** OpenAI-compatible endpoints that can stream text. Gemini is reached through its OpenAI-compatible API. */
function targets(): Target[] {
  const e = env();
  const list: Target[] = [];
  if (e.GROQ_API_KEY) list.push({ name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: e.GROQ_API_KEY, model: e.GROQ_MODEL });
  if (e.GEMINI_API_KEY) {
    list.push({ name: "gemini", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: e.GEMINI_API_KEY, model: e.GEMINI_MODEL });
  }
  if (e.OPENROUTER_API_KEY && e.OPENROUTER_MODEL) {
    list.push({ name: "openrouter", url: "https://openrouter.ai/api/v1/chat/completions", key: e.OPENROUTER_API_KEY, model: e.OPENROUTER_MODEL, extraHeaders: { "X-Title": "ExamAce" } });
  }
  return list;
}

/** Pull the text deltas out of an OpenAI-style server-sent-events stream. */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        /* keep-alive or partial line */
      }
    }
  }
}

/**
 * Stream a chat answer as plain text. Providers are tried in order until one starts streaming;
 * after the first chunk we stay on that provider. If every provider fails, `fallback` text is sent,
 * so the student always gets an answer.
 */
export function streamChat(
  req: { system: string; messages: ChatMessage[]; maxTokens?: number; label: string },
  fallback: string,
  fetchImpl: typeof fetch = fetch,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const t of targets()) {
        const started = Date.now();
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), env().AI_TIMEOUT_MS);
        try {
          const res = await fetchImpl(t.url, {
            method: "POST",
            signal: abort.signal,
            headers: { Authorization: `Bearer ${t.key}`, "Content-Type": "application/json", ...t.extraHeaders },
            body: JSON.stringify({
              model: t.model,
              stream: true,
              max_tokens: req.maxTokens ?? 900,
              temperature: 0.4,
              messages: [{ role: "system", content: req.system }, ...req.messages],
            }),
          });
          if (!res.ok || !res.body) throw new Error(`${t.name} ${res.status}`);
          let sent = 0;
          for await (const chunk of parseSse(res.body)) {
            sent += chunk.length;
            controller.enqueue(encoder.encode(chunk));
          }
          if (sent === 0) throw new Error("empty stream");
          log("info", { ai: req.label, provider: t.name, ms: Date.now() - started, ok: true, chars: sent });
          clearTimeout(timer);
          controller.close();
          return;
        } catch (err) {
          clearTimeout(timer);
          log("warn", { ai: req.label, provider: t.name, ms: Date.now() - started, ok: false, msg: err instanceof Error ? err.message : String(err) });
        }
      }
      controller.enqueue(encoder.encode(fallback));
      controller.close();
    },
  });
}
