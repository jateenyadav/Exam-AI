import { describe, expect, it } from "vitest";
import { uploadAnswers, isPermanent } from "@/lib/submit";
import { dataUrlBytes, fitWithin } from "@/lib/image";

const upload = (id: string) => ({ questionId: id, body: new FormData(), label: id });
const res = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("answer uploads", () => {
  it("returns no failures when every upload succeeds", async () => {
    const f = await uploadAnswers([upload("Q1"), upload("Q2")], { fetchImpl: async () => res(200), baseDelayMs: 1 });
    expect(f).toEqual([]);
  });

  it("retries 5xx and network errors, then succeeds", async () => {
    let n = 0;
    const fetchImpl = async () => { n++; if (n === 1) throw new TypeError("offline"); if (n === 2) return res(503); return res(200); };
    expect(await uploadAnswers([upload("Q1")], { fetchImpl, baseDelayMs: 1 })).toEqual([]);
    expect(n).toBe(3);
  });

  it("does not retry 4xx and reports the server's message", async () => {
    let n = 0;
    const fetchImpl = async () => { n++; return res(413, { error: "Answer photo is too large (max 2 MB)" }); };
    const f = await uploadAnswers([upload("Q3")], { fetchImpl, baseDelayMs: 1 });
    expect(n).toBe(1);
    expect(f).toEqual([{ questionId: "Q3", label: "Q3", message: "Answer photo is too large (max 2 MB)", permanent: true }]);
  });

  it("reports a retryable failure after the last retry", async () => {
    const f = await uploadAnswers([upload("Q4")], { fetchImpl: async () => res(500), retries: 1, baseDelayMs: 1 });
    expect(f[0]).toMatchObject({ questionId: "Q4", permanent: false });
  });

  it("classifies statuses", () => {
    expect(isPermanent(409)).toBe(true);
    expect(isPermanent(429)).toBe(false);
    expect(isPermanent(502)).toBe(false);
  });
});

describe("image helpers", () => {
  it("measures data URL size", () => {
    expect(dataUrlBytes("data:image/jpeg;base64,QUJD")).toBe(3);
    expect(dataUrlBytes("data:image/jpeg;base64,QUI=")).toBe(2);
  });
  it("fits big photos inside 1600px keeping aspect ratio", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
