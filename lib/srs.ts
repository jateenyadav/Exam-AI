/**
 * SM-2 spaced repetition (SuperMemo 2, as used by Anki): answer well and the gap before the card
 * comes back grows; forget it and it comes back tomorrow.
 */
export type Rating = "again" | "hard" | "good" | "easy";
export type CardState = { ease: number; intervalDays: number; reps: number; lapses: number };

const QUALITY: Record<Rating, number> = { again: 1, hard: 3, good: 4, easy: 5 };
const DAY_MS = 86_400_000;

export function schedule(card: CardState, rating: Rating, now = new Date()): CardState & { dueAt: Date } {
  const q = QUALITY[rating];
  let { ease, intervalDays, reps, lapses } = card;

  if (q < 3) {
    reps = 0;
    lapses += 1;
    intervalDays = 1;
  } else {
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
    if (rating === "easy") intervalDays = Math.round(intervalDays * 1.3);
    if (rating === "hard") intervalDays = Math.max(1, Math.round(intervalDays * 0.8));
  }
  // Ease update from SM-2, never below 1.3.
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  intervalDays = Math.min(intervalDays, 365);
  return { ease: Math.round(ease * 100) / 100, intervalDays, reps, lapses, dueAt: new Date(now.getTime() + intervalDays * DAY_MS) };
}
