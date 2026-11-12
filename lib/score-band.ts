/**
 * Score bands, used everywhere a score is shown: 75%+ green, 50–74% amber, below 50% coral.
 * Always shown next to the number or a word, never colour alone.
 */
export type ScoreBand = {
  key: "strong" | "steady" | "low";
  /** Short word shown beside the score. */
  word: string;
  bar: string;
  chip: string;
  text: string;
  /** CSS colour for SVG strokes. */
  stroke: string;
};

const BANDS: Record<ScoreBand["key"], ScoreBand> = {
  strong: {
    key: "strong",
    word: "Strong",
    bar: "bg-tone-green",
    chip: "bg-tone-green-soft text-tone-green-fg border-tone-green-border",
    text: "text-tone-green-fg",
    stroke: "hsl(var(--green))",
  },
  steady: {
    key: "steady",
    word: "Getting there",
    bar: "bg-tone-amber",
    chip: "bg-tone-amber-soft text-tone-amber-fg border-tone-amber-border",
    text: "text-tone-amber-fg",
    stroke: "hsl(var(--amber))",
  },
  low: {
    key: "low",
    word: "Needs work",
    bar: "bg-tone-coral",
    chip: "bg-tone-coral-soft text-tone-coral-fg border-tone-coral-border",
    text: "text-tone-coral-fg",
    stroke: "hsl(var(--coral))",
  },
};

export function scoreBand(percentage: number): ScoreBand {
  if (percentage >= 75) return BANDS.strong;
  if (percentage >= 50) return BANDS.steady;
  return BANDS.low;
}
