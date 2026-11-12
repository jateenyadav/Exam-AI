"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SiteHeader } from "@/components/brand/site-header";
import { subjectStyle } from "@/lib/subject-colors";
import { AlertCircle, CheckCircle2, Eye, Loader2, NotebookPen, PartyPopper } from "lucide-react";

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

// Soft tints so rating feels like a choice, not an alarm. The word and hint carry the meaning.
const RATINGS: { rating: Rating; label: string; hint: string; tone: string }[] = [
  { rating: "again", label: "Again", hint: "Forgot", tone: "border-tone-coral-border bg-tone-coral-soft text-tone-coral-fg hover:bg-tone-coral-soft/70" },
  { rating: "hard", label: "Hard", hint: "Barely", tone: "border-tone-amber-border bg-tone-amber-soft text-tone-amber-fg hover:bg-tone-amber-soft/70" },
  { rating: "good", label: "Good", hint: "Got it", tone: "border-tone-green-border bg-tone-green-soft text-tone-green-fg hover:bg-tone-green-soft/70" },
  { rating: "easy", label: "Easy", hint: "Instantly", tone: "border-tone-sky-border bg-tone-sky-soft text-tone-sky-fg hover:bg-tone-sky-soft/70" },
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
  const st = subjectStyle(card?.subject ?? "");

  return (
    <div className="min-h-screen">
      <SiteHeader sticky={false}>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="h-10">Dashboard</Button>
        </Link>
      </SiteHeader>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tone-amber-soft text-tone-amber-fg">
            <NotebookPen className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold mb-1">Mistake notebook</h1>
            <p className="text-sm text-muted-foreground">Try to answer in your head, then show the answer and rate how well you remembered it.</p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-tone-coral-border bg-tone-coral-soft p-3 text-sm text-tone-coral-fg">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        {!cards && !error && (
          <p className="flex items-center gap-2 text-muted-foreground" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
          </p>
        )}

        {cards && cards.length === 0 && (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-tone-green" aria-hidden />
              Nothing due today. Mistakes from your next exam will show up here.
            </CardContent>
          </Card>
        )}

        {done && cards.length > 0 && (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-8 text-center space-y-3">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-tone-green-soft text-tone-green-fg">
                <PartyPopper className="h-7 w-7" aria-hidden />
              </span>
              <p className="text-lg font-semibold">Done for today</p>
              <p className="text-sm text-muted-foreground">Each card will come back right before you are likely to forget it.</p>
              <Link href="/dashboard"><Button className="h-11 rounded-full px-6">Back to dashboard</Button></Link>
            </CardContent>
          </Card>
        )}

        {card && !done && (
          <>
            <Progress value={(index / cards!.length) * 100} className="h-2 mb-4" indicatorClassName="bg-gradient-to-r from-primary to-tone-sky" />
            <Card className="relative overflow-hidden rounded-3xl shadow-lift">
              {/* Flashcard: a coloured edge for the subject and a ruled "index card" header. */}
              <span aria-hidden className={`absolute inset-x-0 top-0 h-1.5 ${st.bar}`} />
              <CardContent className="p-5 pt-6 sm:p-7 sm:pt-8 space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.chip}`}>
                    <st.icon className="h-3.5 w-3.5" aria-hidden />
                    {st.label}
                  </span>
                  <Badge variant="outline" className="rounded-full font-medium">{card.chapterName}</Badge>
                  {card.lapses > 0 && (
                    <Badge variant="outline" className="rounded-full border-tone-coral-border bg-tone-coral-soft font-medium text-tone-coral-fg">
                      forgot {card.lapses}×
                    </Badge>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-lg font-medium leading-relaxed">{card.questionText}</p>
                {Array.isArray(card.options) && (
                  <ul className="grid gap-2 text-sm sm:grid-cols-2">
                    {card.options.map((o) => <li key={o} className="rounded-xl border bg-background/60 px-3 py-2">{o}</li>)}
                  </ul>
                )}
                {revealed ? (
                  <div className="space-y-3 border-t border-dashed pt-5">
                    <div className="rounded-xl border border-tone-green-border bg-tone-green-soft p-3">
                      <p className="text-xs text-tone-green-fg font-semibold mb-1">Answer</p>
                      <p className="text-sm whitespace-pre-wrap">{card.correctAnswer}</p>
                    </div>
                    {card.solution && (
                      <div className="rounded-xl bg-muted p-3">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Solution</p>
                        <p className="text-sm whitespace-pre-wrap">{card.solution}</p>
                      </div>
                    )}
                    <p className="pt-1 text-xs font-medium text-muted-foreground">How well did you remember it?</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {RATINGS.map((r) => (
                        <Button key={r.rating} variant="outline" disabled={saving} onClick={() => rate(r.rating)} className={`flex-col h-auto min-h-14 gap-0 rounded-xl py-2 ${r.tone}`}>
                          <span className="font-semibold">{r.label}</span>
                          <span className="text-[11px] opacity-90">{r.hint}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Button className="h-12 w-full rounded-full text-base" onClick={() => setRevealed(true)}>
                    <Eye aria-hidden />
                    Show answer
                  </Button>
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
