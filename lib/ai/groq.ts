import type { AiRequest } from "./gemini";

/** Groq (OpenAI-compatible, generous free tier, very fast). Text only here — photos go to Gemini. */
export async function callGroq(req: AiRequest, apiKey: string, model: string): Promise<string> {
  if (req.image) throw new Error("Groq is used for text only");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal: req.signal,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 8000,
      temperature: 0.3,
    }),
  });
  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}
