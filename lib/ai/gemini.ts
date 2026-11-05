import { GoogleGenAI } from "@google/genai";

export interface AiRequest {
  prompt: string;
  system: string;
  image?: { base64: string; mimeType: string };
  signal?: AbortSignal;
}

/** Gemini via the current Google Gen AI SDK, asking for JSON output. */
export async function callGemini(req: AiRequest, apiKey: string, model: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const contents = req.image
    ? [{ inlineData: { mimeType: req.image.mimeType, data: req.image.base64 } }, { text: req.prompt }]
    : req.prompt;

  const res = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: req.system,
      responseMimeType: "application/json",
      temperature: 0.3,
      abortSignal: req.signal,
    },
  });
  return res.text ?? "";
}
