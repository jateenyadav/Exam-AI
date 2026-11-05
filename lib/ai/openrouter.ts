import type { AiRequest } from "./gemini";

/** OpenRouter (OpenAI-compatible). Any model id works — including free `:free` models. */
export async function callOpenRouter(req: AiRequest, apiKey: string, model: string, appUrl?: string): Promise<string> {
  const userContent = req.image
    ? [
        { type: "text", text: req.prompt },
        { type: "image_url", image_url: { url: `data:${req.image.mimeType};base64,${req.image.base64}` } },
      ]
    : req.prompt;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: req.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": appUrl || "http://localhost:3000",
      "X-Title": "ExamAce",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: userContent },
      ],
      max_tokens: 8000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter ${response.status}`);
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}
