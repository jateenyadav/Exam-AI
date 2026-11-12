import { Atom, BookOpen, FlaskConical, Layers, Sigma, type LucideIcon } from "lucide-react";

/**
 * One colour and icon per subject, used the same way everywhere (chips, icons, bars).
 * Class strings are written out in full so Tailwind keeps them.
 */
export type SubjectStyle = {
  label: string;
  icon: LucideIcon;
  /** Soft chip: tinted background, readable text, tinted border. */
  chip: string;
  /** Icon tile background + icon colour. */
  tile: string;
  /** Strong colour for bars and dots. */
  bar: string;
  /** Text colour on the page background. */
  text: string;
  /** Hover/selected border for cards. */
  ring: string;
};

const STYLES: Record<string, SubjectStyle> = {
  physics: {
    label: "Physics",
    icon: Atom,
    chip: "bg-tone-sky-soft text-tone-sky-fg border-tone-sky-border",
    tile: "bg-tone-sky-soft text-tone-sky-fg",
    bar: "bg-tone-sky",
    text: "text-tone-sky-fg",
    ring: "border-tone-sky ring-tone-sky/25",
  },
  chemistry: {
    label: "Chemistry",
    icon: FlaskConical,
    chip: "bg-tone-teal-soft text-tone-teal-fg border-tone-teal-border",
    tile: "bg-tone-teal-soft text-tone-teal-fg",
    bar: "bg-tone-teal",
    text: "text-tone-teal-fg",
    ring: "border-tone-teal ring-tone-teal/25",
  },
  mathematics: {
    label: "Mathematics",
    icon: Sigma,
    chip: "bg-tone-violet-soft text-tone-violet-fg border-tone-violet-border",
    tile: "bg-tone-violet-soft text-tone-violet-fg",
    bar: "bg-tone-violet",
    text: "text-tone-violet-fg",
    ring: "border-tone-violet ring-tone-violet/25",
  },
  english: {
    label: "English",
    icon: BookOpen,
    chip: "bg-tone-pink-soft text-tone-pink-fg border-tone-pink-border",
    tile: "bg-tone-pink-soft text-tone-pink-fg",
    bar: "bg-tone-pink",
    text: "text-tone-pink-fg",
    ring: "border-tone-pink ring-tone-pink/25",
  },
  full_mock: {
    label: "Full mock",
    icon: Layers,
    chip: "bg-secondary text-secondary-foreground border-primary/20",
    tile: "bg-secondary text-secondary-foreground",
    bar: "bg-primary",
    text: "text-primary",
    ring: "border-primary ring-primary/20",
  },
};

/** Accepts a subject key ("physics") or a display name ("Physics", "Full Mock Test (...)"). */
export function subjectStyle(subject: string): SubjectStyle {
  const s = subject.toLowerCase();
  if (STYLES[s]) return STYLES[s];
  if (s.startsWith("full")) return STYLES.full_mock;
  if (s.startsWith("math")) return STYLES.mathematics;
  return STYLES[s.split(/[\s–-]/)[0]] ?? STYLES.full_mock;
}

export const MODE_LABELS: Record<string, string> = {
  class11: "Class 11 (CBSE)",
  class12: "Class 12 (CBSE)",
  jee_mains: "JEE Mains",
  jee_advanced: "JEE Advanced",
};
