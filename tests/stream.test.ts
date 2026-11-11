import { afterEach, describe, expect, it } from "vitest";
import { parseSse, streamChat } from "@/lib/ai/stream";

const sse = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      const enc = new TextEncoder();
      for (const t of chunks) c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`));
      c.enqueue(enc.encode("data: [DONE]\n\n"));
      c.close();
    },
  });
const readAll = async (s: ReadableStream<Uint8Array>) => new Response(s).text();

afterEach(() => {
  delete process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
});

describe("AI tutor streaming", () => {
  it("parses OpenAI-style SSE deltas", async () => {
    const out: string[] = [];
    for await (const t of parseSse(sse(["Hel", "lo"]))) out.push(t);
    expect(out.join("")).toBe("Hello");
  });

  it("falls back to the next provider, then streams", async () => {
    process.env.GROQ_API_KEY = "g";
    process.env.GEMINI_API_KEY = "m";
    const seen: string[] = [];
    const fetchImpl = (async (url: string) => {
      seen.push(url);
      if (url.includes("groq")) return new Response("busy", { status: 429 });
      return new Response(sse(["Step 1. ", "Step 2."]), { status: 200 });
    }) as unknown as typeof fetch;
    const text = await readAll(streamChat({ system: "s", messages: [{ role: "user", content: "q" }], label: "t" }, "FALLBACK", fetchImpl));
    expect(text).toBe("Step 1. Step 2.");
    expect(seen[1]).toContain("googleapis");
  });

  it("sends the reference solution when every provider fails", async () => {
    process.env.GROQ_API_KEY = "g";
    const fetchImpl = (async () => new Response("down", { status: 500 })) as unknown as typeof fetch;
    const text = await readAll(streamChat({ system: "s", messages: [], label: "t" }, "Reference solution: x = 2", fetchImpl));
    expect(text).toBe("Reference solution: x = 2");
  });
});
