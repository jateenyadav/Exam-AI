"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useExamStore } from "@/lib/store/exam-store";
import type { ExamMode } from "@/lib/syllabus";

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mistake notebook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {review && review.total > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                <span className="text-2xl font-bold text-primary">{review.dueCount}</span> card{review.dueCount === 1 ? "" : "s"} due today ·{" "}
                {review.total} saved from your mistakes
              </p>
              <Link href="/review">
                <Button size="sm" disabled={review.dueCount === 0}>
                  {review.dueCount > 0 ? "Start review" : "All done for today"}
                </Button>
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Questions you get wrong are saved here as flashcards. They come back on a smart schedule until you know them.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weak topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights && insights.topics.length > 0 ? (
            <>
              {insights.topics.slice(0, 4).map((t) => (
                <div key={`${t.mode}-${t.subject}-${t.chapter}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate pr-2">{t.chapter}</span>
                    <span className="text-muted-foreground shrink-0">{Math.round(t.accuracy * 100)}%</span>
                  </div>
                  <Progress value={t.accuracy * 100} className="h-2" />
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                {insights.practice.map((set) => (
                  <Button key={`${set.mode}-${set.subject}`} size="sm" variant="outline" onClick={() => practice(set)}>
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
