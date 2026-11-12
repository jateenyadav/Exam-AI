import { describe, expect, it } from "vitest";
import { scoreBand } from "@/lib/score-band";
import { subjectStyle } from "@/lib/subject-colors";

describe("scoreBand", () => {
  it("uses 75 and 50 as the band edges", () => {
    expect(scoreBand(100).key).toBe("strong");
    expect(scoreBand(75).key).toBe("strong");
    expect(scoreBand(74.9).key).toBe("steady");
    expect(scoreBand(50).key).toBe("steady");
    expect(scoreBand(49.9).key).toBe("low");
    expect(scoreBand(0).key).toBe("low");
  });
  it("always gives a word to show next to the colour", () => {
    for (const p of [0, 60, 90]) expect(scoreBand(p).word.length).toBeGreaterThan(0);
  });
});

describe("subjectStyle", () => {
  it("maps keys and display names to the same style", () => {
    expect(subjectStyle("physics").label).toBe("Physics");
    expect(subjectStyle("Physics").label).toBe("Physics");
    expect(subjectStyle("Maths").label).toBe("Mathematics");
    expect(subjectStyle("english").label).toBe("English");
    expect(subjectStyle("Full Mock Test (Physics + Chemistry + Mathematics)").label).toBe("Full mock");
  });
  it("falls back to the brand style for unknown subjects", () => {
    expect(subjectStyle("biology").label).toBe("Full mock");
  });
});
