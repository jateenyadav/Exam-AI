import { describe, expect, it } from "vitest";
import { practiceSets, weakTopics, type ResultRow } from "@/lib/insights";

describe("weak topics", () => {
  const rows: ResultRow[] = [
    { mode: "jee_mains", subject: "physics", chapterBreakdown: { Kinematics: { total: 8, obtained: 2 }, Optics: { total: 8, obtained: 8 } } },
    { mode: "jee_mains", subject: "physics", chapterBreakdown: { Kinematics: { total: 8, obtained: 4 }, Waves: { total: 2, obtained: 0 } } },
    { mode: "class12", subject: "chemistry", chapterBreakdown: { Solutions: { total: 10, obtained: 3 } } },
  ];

  it("aggregates across exams and keeps only weak, well-sampled chapters", () => {
    const t = weakTopics(rows);
    expect(t.map((x) => x.chapter)).toEqual(["Solutions", "Kinematics"]); // Waves: too few marks; Optics: strong
    expect(t[1]).toMatchObject({ total: 16, obtained: 6, attempts: 2 });
  });

  it("groups practice by mode + subject", () => {
    expect(practiceSets(weakTopics(rows))).toEqual([
      { mode: "class12", subject: "chemistry", chapters: ["Solutions"] },
      { mode: "jee_mains", subject: "physics", chapters: ["Kinematics"] },
    ]);
  });
});
