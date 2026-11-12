"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Sparkles, X } from "lucide-react";

type Turn = { role: "user" | "assistant"; content: string };

/**
 * "Explain my mistake": streams an AI tutor's explanation for one graded question, then allows a
 * few follow-up questions. The text appears as it is written (streamed from /api/explain).
 */
export function ExplainMistake({ sessionId, questionId, attempted = true }: { sessionId: string; questionId: string; attempted?: boolean }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function ask(message?: string) {
    setBusy(true);
    setError(null);
    setStreaming("");
    const history = turns;
    const nextTurns = message ? [...history, { role: "user" as const, content: message }] : history;
    if (message) setTurns(nextTurns);
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId, history, message }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "The tutor couldn't answer. Please try again.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setStreaming(text);
      }
      setTurns([...nextTurns, { role: "assistant", content: text }]);
      setStreaming("");
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="mt-2 h-10 rounded-full border-tone-violet-border text-tone-violet-fg hover:bg-tone-violet-soft hover:text-tone-violet-fg no-print"
        onClick={() => {
          setOpen(true);
          if (turns.length === 0) void ask();
        }}
      >
        <Sparkles aria-hidden />
        {attempted ? "Explain my mistake" : "Explain this question"}
      </Button>
    );
  }

  const followUps = turns.filter((t) => t.role === "user").length;

  return (
    <div className="mt-3 rounded-2xl border border-tone-violet-border bg-tone-violet-soft/60 p-4 no-print" aria-live="polite">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-tone-violet-fg">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> AI tutor
        </p>
        <button
          className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => { abortRef.current?.abort(); setOpen(false); }}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Close
        </button>
      </div>
      <div className="space-y-3 text-sm">
        {turns.map((t, i) => (
          <p key={i} className={`whitespace-pre-wrap ${t.role === "user" ? "ml-auto w-fit max-w-[90%] rounded-2xl bg-card px-3 py-2 font-medium" : ""}`}>
            {t.role === "user" ? `You: ${t.content}` : t.content}
          </p>
        ))}
        {busy && <p className="whitespace-pre-wrap">{streaming || "Thinking…"}</p>}
        {error && (
          <p className="flex items-center gap-1.5 text-tone-coral-fg">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
      {!busy && turns.length > 0 && followUps < 4 && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const m = draft.trim();
            if (!m) return;
            setDraft("");
            void ask(m);
          }}
        >
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask a follow-up, e.g. why not option C?" maxLength={1000} className="h-10 bg-card" aria-label="Ask the tutor a follow-up question" />
          <Button type="submit" size="sm" className="h-10 rounded-full px-4">Ask</Button>
        </form>
      )}
    </div>
  );
}
