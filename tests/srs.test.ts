import { describe, expect, it } from "vitest";
import { schedule } from "@/lib/srs";

const fresh = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 };
const now = new Date("2026-01-01T00:00:00Z");

describe("SM-2 scheduling", () => {
  it("grows the gap 1 → 6 → ~15 days when answered well", () => {
    const a = schedule(fresh, "good", now);
    const b = schedule(a, "good", now);
    const c = schedule(b, "good", now);
    expect([a.intervalDays, b.intervalDays, c.intervalDays]).toEqual([1, 6, 15]);
    expect(c.dueAt.toISOString()).toBe("2026-01-16T00:00:00.000Z");
  });

  it("forgetting resets to tomorrow, counts a lapse and lowers ease", () => {
    const learned = schedule(schedule(fresh, "good", now), "good", now);
    const forgot = schedule(learned, "again", now);
    expect(forgot).toMatchObject({ intervalDays: 1, reps: 0, lapses: 1 });
    expect(forgot.ease).toBeLessThan(learned.ease);
  });

  it("ease never drops below 1.3 and intervals cap at a year", () => {
    let card = { ...fresh };
    for (let i = 0; i < 20; i++) card = schedule(card, "again", now);
    expect(card.ease).toBe(1.3);
    let long = { ...fresh };
    for (let i = 0; i < 30; i++) long = schedule(long, "easy", now);
    expect(long.intervalDays).toBe(365);
  });
});
