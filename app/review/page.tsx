"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type ReviewCard = {
  id: string;
  subject: string;
  chapterName: string;
  questionText: string;
  options: string[] | null;
  correctAnswer: string;
  solution: string;
  lapses: number;
};
type Rating = "again" | "hard" | "good" | "easy";

const RATINGS: { rating: Rating; label: string; hint: string; variant: "destructive" | "outline" | "default" | "secondary" }[] = [
  { rating: "again", label: "Again", hint: "Forgot", variant: "destructive" },
  { rating: "hard", label: "Hard", hint: "Barely", variant: "outline" },
  { rating: "good", label: "Good", hint: "Got it", variant: "default" },
  { rating: "easy", label: "Easy", hint: "Instantly", variant: "secondary" },
];

/** Mistake notebook review: flip a card, rate your recall, SM-2 schedules the next review. */
export default function ReviewPage() {
  const [cards, setCards] = useState<ReviewCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/review")
      .then(async (r) => {
        if (r.status === 401) throw new Error("Please start an exam first so we know who you are.");
        if (!r.ok) throw new Error("Couldn't load your cards.");
        return r.json();
      })
      .then((d) => setCards(d.cards))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function rate(rating: Rating) {
    if (!cards) return;
    setSaving(true);
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: cards[index].id, rating }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setError("Couldn't save that rating — check your connection and try again.");
      return;
    }
    setError(null);
    // "Again" puts the card back at the end of today's session.
    if (rating === "again") setCards([...cards, cards[index]]);
    setIndex(index + 1);
    setRevealed(false);
  }

  const card = cards?.[index];
  const done = cards && index >= cards.length;

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">E</div>
            <span className="text-xl font-bold">ExamAce</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Mistake notebook</h1>
        <p className="text-sm text-muted-foreground mb-6">Try to answer in your head, then show the answer and rate how well you remembered it.</p>

        {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
        {!cards && !error && <p className="text-muted-foreground">Loading…</p>}

        {cards && cards.length === 0 && (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Nothing due today. Mistakes from your next exam will show up here.</CardContent></Card>
        )}

        {done && cards.length > 0 && (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-lg font-semibold">Done for today 🎉</p>
              <p className="text-sm text-muted-foreground">Each card will come back right before you are likely to forget it.</p>
              <Link href="/dashboard"><Button>Back to dashboard</Button></Link>
            </CardContent>
          </Card>
        )}

        {card && !done && (
          <>
            <Progress value={(index / cards!.length) * 100} className="h-2 mb-4" />
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="capitalize">{card.subject}</Badge>
                  <Badge variant="outline">{card.chapterName}</Badge>
                  {card.lapses > 0 && <Badge variant="destructive">forgot {card.lapses}×</Badge>}
                </div>
                <p className="whitespace-pre-wrap">{card.questionText}</p>
                {Array.isArray(card.options) && (
                  <ul className="space-y-1 text-sm">
                    {card.options.map((o) => <li key={o}>{o}</li>)}
                  </ul>
                )}
                {revealed ? (
                  <div className="space-y-3">
                    <div className="rounded bg-green-50 dark:bg-green-950 p-3">
                      <p className="text-xs text-green-600 font-medium mb-1">Answer</p>
                      <p className="text-sm whitespace-pre-wrap">{card.correctAnswer}</p>
                    </div>
                    {card.solution && (
                      <div className="rounded bg-muted p-3">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Solution</p>
                        <p className="text-sm whitespace-pre-wrap">{card.solution}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {RATINGS.map((r) => (
                        <Button key={r.rating} variant={r.variant} disabled={saving} onClick={() => rate(r.rating)} className="flex-col h-auto py-2">
                          <span>{r.label}</span>
                          <span className="text-[10px] opacity-75">{r.hint}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => setRevealed(true)}>Show answer</Button>
                )}
              </CardContent>
            </Card>
            <p className="mt-3 text-center text-xs text-muted-foreground">Card {index + 1} of {cards!.length}</p>
          </>
        )}
      </main>
    </div>
  );
}
