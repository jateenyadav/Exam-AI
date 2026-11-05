import { describe, expect, it } from "vitest";
import { clampMarks, evaluateInteger, evaluateMCQ, evaluateMultipleCorrect, gradeFromPercentage } from "@/lib/evaluator";

describe("evaluateMCQ", () => {
  it("awards full marks for the right option, ignoring case and formatting", () => {
    expect(evaluateMCQ(" b) ", "B", 4, 1).marksAwarded).toBe(4);
  });
  it("applies negative marking for a wrong attempt", () => {
    const r = evaluateMCQ("C", "B", 4, 1);
    expect(r).toMatchObject({ marksAwarded: -1, isCorrect: false });
  });
  it("gives zero (not negative) when not attempted", () => {
    expect(evaluateMCQ("", "B", 4, 1).marksAwarded).toBe(0);
  });
});

describe("evaluateInteger", () => {
  it("accepts answers within 0.01", () => {
    expect(evaluateInteger("3.004", "3", 4).isCorrect).toBe(true);
  });
  it("rejects non-numeric input", () => {
    expect(evaluateInteger("three", "3", 4)).toMatchObject({ isCorrect: false, marksAwarded: 0 });
  });
});

describe("evaluateMultipleCorrect (JEE Advanced style)", () => {
  it("full marks only for the exact set", () => {
    expect(evaluateMultipleCorrect(["c", "a"], ["A", "C"], 4, 2).marksAwarded).toBe(4);
  });
  it("partial marks for a correct subset", () => {
    expect(evaluateMultipleCorrect(["A"], ["A", "C"], 4, 2).marksAwarded).toBe(2);
  });
  it("negative marks if any wrong option is picked", () => {
    expect(evaluateMultipleCorrect(["A", "B"], ["A", "C"], 4, 2).marksAwarded).toBe(-2);
  });
  it("duplicate picks can't inflate partial credit", () => {
    expect(evaluateMultipleCorrect(["A", "A", "A"], ["A", "C"], 4, 2).marksAwarded).toBe(2);
  });
});

describe("clampMarks — AI marks are untrusted", () => {
  it("caps at the question's maximum (prompt-injected 'full marks' can't exceed it)", () => {
    expect(clampMarks(999, 5)).toBe(5);
  });
  it("never goes below zero", () => {
    expect(clampMarks(-3, 5)).toBe(0);
  });
  it("rounds to the nearest half mark and handles NaN", () => {
    expect(clampMarks(2.3, 5)).toBe(2.5);
    expect(clampMarks(Number.NaN, 5)).toBe(0);
  });
});

describe("gradeFromPercentage", () => {
  it("maps CBSE bands", () => {
    expect(gradeFromPercentage(91)).toBe("A1");
    expect(gradeFromPercentage(55)).toBe("C1");
    expect(gradeFromPercentage(12)).toBe("Needs improvement");
  });
});
