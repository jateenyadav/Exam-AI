"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useExamStore } from "@/lib/store/exam-store";
import type { ExamMode } from "@/lib/syllabus";
import { ScoreRing } from "@/components/brand/score-ring";
import { scoreBand } from "@/lib/score-band";
import { subjectStyle } from "@/lib/subject-colors";
import { NotebookPen, Target } from "lucide-react";

type Topic = { mode: string; subject: string; chapter: string; accuracy: number; total: number };
type PracticeSet = { mode: string; subject: string; chapters: string[] };

/** Dashboard cards: today's flashcards (mistake notebook) and weakest chapters with one-click practice. */
export function StudyPanel() {
  const router = useRouter();
  const [review, setReview] = useState<{ dueCount: number; total: number } | null>(null);
  const [insights, setInsights] = useState<{ topics: Topic[]; practice: PracticeSet[] } | null>(null);

  useEffect(() => {
    fetch("/api/review").then((r) => (r.ok ? r.json() : null)).then(setReview).catch(() => null);
    fetch("/api/insights").then((r) => (r.ok ? r.json() : null)).then(setInsights).catch(() => null);
  }, []);

  function practice(set: PracticeSet) {
    const store = useExamStore.getState();
    store.setMode(set.mode as ExamMode); // resets subject + chapters, so set them after
    store.setSubject(set.subject);
    store.setChapters(set.chapters);
    router.push("/setup?practice=1");
  }

  if (!review && !insights) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-8">
      <Card className="flex flex-col rounded-2xl shadow-soft">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tone-amber-soft text-tone-amber-fg">
            <NotebookPen className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <CardTitle className="text-base">Mistake notebook</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center">
          {review && review.total > 0 ? (
            <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
              {/* Ring: share of saved cards that are due today. */}
              <ScoreRing
                value={(review.dueCount / review.total) * 100}
                size={124}
                stroke={11}
                color="hsl(var(--amber))"
                label={<span className="text-3xl">{review.dueCount}</span>}
                sublabel="due today"
              />
              <div className="space-y-3 text-center sm:text-left">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{review.dueCount}</span> card{review.dueCount === 1 ? "" : "s"} due today ·{" "}
                  {review.total} saved from your mistakes
                </p>
                <p className="text-xs text-muted-foreground">A few minutes a day keeps them fresh.</p>
                <Link href="/review" className="inline-block">
                  <Button className="h-10 rounded-full px-5" disabled={review.dueCount === 0}>
                    {review.dueCount > 0 ? "Start review" : "All done for today"}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Questions you get wrong are saved here as flashcards. They come back on a smart schedule until you know them.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tone-coral-soft text-tone-coral-fg">
            <Target className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <CardTitle className="text-base">Weak topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights && insights.topics.length > 0 ? (
            <>
              {insights.topics.slice(0, 4).map((t) => {
                const pct = Math.round(t.accuracy * 100);
                const band = scoreBand(pct);
                const st = subjectStyle(t.subject);
                return (
                  <div key={`${t.mode}-${t.subject}-${t.chapter}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex min-w-0 items-center gap-1.5 pr-2 font-medium">
                        <st.icon className={`h-3.5 w-3.5 shrink-0 ${st.text}`} aria-label={st.label} />
                        <span className="truncate">{t.chapter}</span>
                      </span>
                      <span className={`shrink-0 font-medium ${band.text}`}>{pct}%</span>
                    </div>
                    <Progress value={t.accuracy * 100} className="h-2" indicatorClassName={band.bar} />
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2 pt-1">
                {insights.practice.map((set) => (
                  <Button key={`${set.mode}-${set.subject}`} size="sm" variant="outline" className="h-10 rounded-full" onClick={() => practice(set)}>
                    Practice weak {set.subject} topics
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Take a couple of exams and your weakest chapters will show up here, with a one-click practice paper.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
