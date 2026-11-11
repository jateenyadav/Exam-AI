/** Weak-topic analysis across all of a student's results. Pure, so it is unit-tested. */
export type ResultRow = { mode: string; subject: string; chapterBreakdown: Record<string, { total: number; obtained: number }> };
export type Topic = { mode: string; subject: string; chapter: string; total: number; obtained: number; accuracy: number; attempts: number };

export function weakTopics(rows: ResultRow[], { minMarks = 4, maxAccuracy = 0.6, limit = 6 } = {}): Topic[] {
  const map = new Map<string, Topic>();
  for (const r of rows) {
    for (const [chapter, v] of Object.entries(r.chapterBreakdown ?? {})) {
      if (!v || !(v.total > 0)) continue;
      const key = `${r.mode}|${r.subject}|${chapter}`;
      const t = map.get(key) ?? { mode: r.mode, subject: r.subject, chapter, total: 0, obtained: 0, accuracy: 0, attempts: 0 };
      t.total += v.total;
      t.obtained += Math.max(0, v.obtained);
      t.attempts += 1;
      map.set(key, t);
    }
  }
  return Array.from(map.values())
    .map((t) => ({ ...t, accuracy: t.total ? t.obtained / t.total : 0 }))
    .filter((t) => t.total >= minMarks && t.accuracy < maxAccuracy)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
    .slice(0, limit);
}

/** Group weak chapters into one practice paper per (mode, subject) — a paper can't mix subjects. */
export function practiceSets(topics: Topic[]) {
  const sets = new Map<string, { mode: string; subject: string; chapters: string[] }>();
  for (const t of topics) {
    const key = `${t.mode}|${t.subject}`;
    const s = sets.get(key) ?? { mode: t.mode, subject: t.subject, chapters: [] };
    if (!s.chapters.includes(t.chapter)) s.chapters.push(t.chapter);
    sets.set(key, s);
  }
  return Array.from(sets.values());
}
