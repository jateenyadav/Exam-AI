"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        className="mt-2 no-print"
        onClick={() => {
          setOpen(true);
          if (turns.length === 0) void ask();
        }}
      >
        {attempted ? "✨ Explain my mistake" : "✨ Explain this question"}
      </Button>
    );
  }

  const followUps = turns.filter((t) => t.role === "user").length;

  return (
    <div className="mt-3 rounded-lg border bg-card p-3 no-print" aria-live="polite">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-primary">AI tutor</p>
        <button className="text-xs text-muted-foreground hover:underline" onClick={() => { abortRef.current?.abort(); setOpen(false); }}>
          Close
        </button>
      </div>
      <div className="space-y-3 text-sm">
        {turns.map((t, i) => (
          <p key={i} className={`whitespace-pre-wrap ${t.role === "user" ? "font-medium" : ""}`}>
            {t.role === "user" ? `You: ${t.content}` : t.content}
          </p>
        ))}
        {busy && <p className="whitespace-pre-wrap">{streaming || "Thinking…"}</p>}
        {error && <p className="text-red-600">{error}</p>}
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
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask a follow-up, e.g. why not option C?" maxLength={1000} />
          <Button type="submit" size="sm">Ask</Button>
        </form>
      )}
    </div>
  );
}
