"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useExamStore, QuestionStatus } from "@/lib/store/exam-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { CameraCapture } from "@/components/exam/camera-capture";
import { uploadAnswers, type AnswerUpload } from "@/lib/submit";
import { clearPhotos, deletePhoto, loadPhotos, savePhoto } from "@/lib/photo-store";
import { AlertTriangle, Clock } from "lucide-react";

// Quiet palette for the exam room: soft tints from the shared tokens, nothing bright.
const STATUS_COLORS: Record<QuestionStatus, string> = {
  not_visited: "bg-muted text-muted-foreground border-border",
  visited: "bg-tone-sky-soft text-tone-sky-fg border-tone-sky-border",
  answered: "bg-tone-green-soft text-tone-green-fg border-tone-green-border",
  marked_for_review: "bg-tone-amber-soft text-tone-amber-fg border-tone-amber-border",
  answered_and_marked: "bg-tone-violet-soft text-tone-violet-fg border-tone-violet-border",
};

export default function ExamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const store = useExamStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const warningShownRef = useRef<Set<number>>(new Set());
  const submittingRef = useRef(false);
  // A refresh also fires blur/visibilitychange. Refreshing is safe now (the exam is restored),
  // and the request would be cut off by the unload anyway, so it isn't counted as a violation.
  const unloadingRef = useRef(false);
  useEffect(() => {
    const mark = () => { unloadingRef.current = true; };
    window.addEventListener("beforeunload", mark);
    window.addEventListener("pagehide", mark);
    return () => {
      window.removeEventListener("beforeunload", mark);
      window.removeEventListener("pagehide", mark);
    };
  }, []);

  const {
    sessionId,
    questions,
    currentQuestionIndex,
    answers,
    answerImages,
    questionStatuses,
    timeRemaining,
    violationCount,
    isSubmitted,
    studentName,
    isCameraActive,
  } = store;

  const currentQuestion = questions[currentQuestionIndex];

  const [restoring, setRestoring] = useState(false);
  // The saved exam is read from localStorage after the first render. Deciding before that
  // finished sent students to /setup on every refresh, so wait for it.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useExamStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useExamStore.persist.hasHydrated());
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isSubmitted && sessionId) {
      router.push("/results?sessionId=" + sessionId);
      return;
    }
    if (!sessionId) {
      router.push("/setup");
      return;
    }
    if (questions.length > 0 || restoring) return;
    // A refresh drops the questions (they aren't kept in localStorage): fetch them back from the
    // server, which also gives the real deadline, and reload photos from IndexedDB.
    setRestoring(true);
    (async () => {
      try {
        const res = await fetch(`/api/exam-session?sessionId=${sessionId}`);
        if (!res.ok) throw new Error(String(res.status));
        const { session } = await res.json();
        if (session.status !== "active" || new Date(session.deadline).getTime() <= Date.now()) {
          router.push("/results?sessionId=" + sessionId);
          return;
        }
        const photos = await loadPhotos(sessionId);
        // Timer = real time left (duration is in seconds; the server's grace period is not shown).
        const secondsLeft = (new Date(session.startTime).getTime() + session.duration * 1000 - Date.now()) / 1000;
        store.resumeExam(sessionId, session.questions, secondsLeft, session.duration, photos);
        toast({ title: "Exam restored", description: "Your answers were kept. The timer kept running." });
      } catch {
        router.push("/setup");
      } finally {
        setRestoring(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, sessionId, questions.length, isSubmitted]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      store.decrementTimer();
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timeRemaining <= 0 && sessionId && !isSubmitted) {
      handleSubmit(true);
      return;
    }
    const warningTimes = [1800, 900, 300];
    for (const t of warningTimes) {
      if (timeRemaining === t && !warningShownRef.current.has(t)) {
        warningShownRef.current.add(t);
        const mins = t / 60;
        setShowTimeWarning(true);
        toast({
          title: `${mins} minutes remaining`,
          description: "Please manage your time wisely.",
          variant: mins <= 5 ? "destructive" : "default",
        });
        setTimeout(() => setShowTimeWarning(false), 3000);
      }
    }
  }, [timeRemaining]);

  // Anti-cheat: tab switch detection
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && !isSubmitted && !store.isCameraActive) {
        handleViolation("Tab switch detected!");
      }
    }
    function handleBlur() {
      if (!isSubmitted && !store.isCameraActive) {
        handleViolation("Window focus lost!");
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "u")) ||
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I")
      ) {
        e.preventDefault();
        handleViolation("Prohibited keyboard shortcut detected!");
      }
    }
    function handleContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [isSubmitted, violationCount, isCameraActive]);

  // Request fullscreen
  useEffect(() => {
    async function requestFS() {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          store.setFullscreen(true);
        }
      } catch { /* user denied */ }
    }
    if (sessionId && !isSubmitted) {
      requestFS();
    }
  }, [sessionId]);

  const handleViolation = useCallback((message: string) => {
    // Leaving the page after pressing Submit fires blur/visibility events — those aren't cheating.
    if (submittingRef.current || unloadingRef.current) return;
    const newCount = violationCount + 1;
    store.addViolation();

    fetch("/api/exam-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, violationCount: newCount }),
    }).catch(console.error);

    if (newCount >= 2) {
      handleSubmit(true);
      return;
    }

    setWarningMessage(message + " One more violation will auto-submit your exam.");
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 5000);
  }, [violationCount, sessionId]);

  async function handleSubmit(auto = false) {
    if (isSubmitting || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setShowSubmitDialog(false);

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }

      // Build one upload per answer (text) and per photo, then send them with checks + retries.
      const labelFor = (qId: string) => {
        const idx = questions.findIndex((q) => q.id === qId);
        return idx >= 0 ? `Q${idx + 1}` : "a question";
      };
      const uploads: AnswerUpload[] = [];
      for (const [qId, answer] of Object.entries(answers)) {
        const formData = new FormData();
        formData.append("sessionId", sessionId!);
        formData.append("questionId", qId);
        formData.append("answerText", typeof answer === "string" ? answer : JSON.stringify(answer));
        uploads.push({ questionId: qId, body: formData, label: labelFor(qId) });
      }
      for (const [qId, imageData] of Object.entries(answerImages)) {
        const blob = await (await fetch(imageData)).blob();
        const formData = new FormData();
        formData.append("sessionId", sessionId!);
        formData.append("questionId", qId);
        formData.append("answerImage", blob, `${qId}.jpg`);
        uploads.push({ questionId: qId, body: formData, label: `${labelFor(qId)} photo` });
      }

      const failures = await uploadAnswers(uploads);
      const retryable = failures.filter((f) => !f.permanent);
      if (retryable.length > 0 && !auto) {
        // Don't leave the exam with unsaved answers: let the student retry.
        toast({
          title: `${retryable.length} answer(s) not saved yet`,
          description: `${retryable.map((f) => f.label).join(", ")} — ${retryable[0].message}. Tap Submit again to retry.`,
          variant: "destructive",
        });
        submittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
      if (failures.length > 0) {
        toast({
          title: "Some answers could not be saved",
          description: failures.map((f) => `${f.label}: ${f.message}`).join(" · "),
          variant: "destructive",
        });
      }

      if (auto) {
        await fetch("/api/exam-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, autoSubmitted: true }),
        });
      }

      store.submitExam();
      void clearPhotos();
      router.push("/results?sessionId=" + sessionId);
    } catch (error) {
      console.error("Submit error:", error);
      toast({ title: "Submission failed", description: "Please tap Submit again.", variant: "destructive" });
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function getAnswerCounts() {
    const statuses = Object.values(questionStatuses);
    return {
      answered: statuses.filter((s) => s === "answered" || s === "answered_and_marked").length,
      unanswered: statuses.filter((s) => s === "not_visited" || s === "visited").length,
      marked: statuses.filter((s) => s === "marked_for_review" || s === "answered_and_marked").length,
      total: questions.length,
    };
  }

  const isMCQType = currentQuestion?.type === "mcq" || currentQuestion?.type === "assertion_reason";
  const isIntegerType = currentQuestion?.type === "integer";
  const isMultipleCorrect = currentQuestion?.type === "multiple_correct";
  const isWrittenType = !isMCQType && !isIntegerType && !isMultipleCorrect;

  if (!currentQuestion) {
    return restoring ? (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">Restoring your exam…</div>
    ) : null;
  }

  const counts = getAnswerCounts();

  return (
    <div className="min-h-screen bg-background flex flex-col select-none">
      {/* Warning Overlay */}
      {showWarning && (
        <div role="alert" className="fixed inset-0 z-[100] bg-destructive/90 flex items-center justify-center text-destructive-foreground">
          <div className="text-center p-8">
            <AlertTriangle className="mx-auto mb-4 h-14 w-14" aria-hidden />
            <h2 className="text-2xl font-bold mb-2">Warning!</h2>
            <p className="text-lg">{warningMessage}</p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="border-b bg-card px-4 py-2 flex items-center justify-between flex-wrap gap-2 no-print">
        <div className="flex items-center gap-3">
          <div className="font-bold text-primary">ExamAce</div>
          <Badge variant="outline" className="text-xs">{studentName}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-xs">
            Q {currentQuestionIndex + 1} / {questions.length}
          </Badge>
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-lg font-bold tabular-nums ${
              timeRemaining < 600 ? "bg-tone-coral-soft text-tone-coral-fg" : "text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" aria-hidden />
            <span className="sr-only">Time left: </span>
            {formatTime(timeRemaining)}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowSubmitDialog(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Exam"}
          </Button>
        </div>
      </div>

      {showTimeWarning && (
        <div role="status" className="bg-tone-amber-soft text-tone-amber-fg text-center py-1 text-sm font-medium">
          Time is running out! {formatTime(timeRemaining)} remaining.
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Question Navigation - Side Panel */}
        <div className="lg:w-64 border-b lg:border-b-0 lg:border-r bg-card p-3 no-print">
          <div className="mb-3">
            <h3 className="text-sm font-semibold mb-2">Question Palette</h3>
            <div className="flex flex-wrap gap-1 text-xs mb-2">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-muted inline-block" /> Not visited</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-tone-green-border bg-tone-green-soft inline-block" /> Answered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-tone-amber-border bg-tone-amber-soft inline-block" /> Review</span>
            </div>
          </div>
          <ScrollArea className="h-48 lg:h-[calc(100vh-200px)]">
            <div className="grid grid-cols-8 lg:grid-cols-5 gap-1.5">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => store.goToQuestion(idx)}
                  aria-current={idx === currentQuestionIndex ? "true" : undefined}
                  className={`w-8 h-8 rounded-md text-xs font-medium border transition-colors ${
                    idx === currentQuestionIndex
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-card"
                      : ""
                  } ${STATUS_COLORS[questionStatuses[q.id] || "not_visited"]}`}
                >
                  {q.questionNumber}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Question Area */}
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge>{currentQuestion.section.replace(/_/g, " ").toUpperCase()}</Badge>
              <Badge variant="outline">{currentQuestion.marks} mark{currentQuestion.marks > 1 ? "s" : ""}</Badge>
              <Badge variant="secondary">{currentQuestion.difficulty}</Badge>
              <Badge variant="outline" className="text-xs">{currentQuestion.chapterName}</Badge>
              {currentQuestion.negativeMarks > 0 && (
                <Badge variant="destructive" className="text-xs">
                  -{currentQuestion.negativeMarks} for wrong
                </Badge>
              )}
            </div>

            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    <span className="font-bold text-primary mr-2">Q{currentQuestion.questionNumber}.</span>
                    {currentQuestion.questionText}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sub-parts display */}
            {currentQuestion.hasSubParts && currentQuestion.subParts && (
              <Card className="mb-6">
                <CardContent className="p-6 space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Sub-parts:</h4>
                  {currentQuestion.subParts.map((sp, i) => (
                    <div key={i} className="pl-4 border-l-2 border-primary/20">
                      <p className="text-sm">
                        <span className="font-medium">({String.fromCharCode(97 + i)})</span> {sp.questionText}{" "}
                        <span className="text-muted-foreground">({sp.marks} mark{sp.marks > 1 ? "s" : ""})</span>
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Answer Section */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Your Answer</h3>

                {isMCQType && currentQuestion.options && (
                  <RadioGroup
                    value={(answers[currentQuestion.id] as string) || ""}
                    onValueChange={(val) => store.setAnswer(currentQuestion.id, val)}
                  >
                    <div className="space-y-3">
                      {currentQuestion.options.map((opt, i) => (
                        <label
                          key={i}
                          className="flex min-h-11 items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-secondary/60"
                        >
                          <RadioGroupItem value={String.fromCharCode(65 + i)} id={`opt-${i}`} />
                          <Label htmlFor={`opt-${i}`} className="cursor-pointer flex-1 text-sm">
                            {opt}
                          </Label>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {isIntegerType && (
                  <Input
                    type="number"
                    placeholder="Enter your numerical answer"
                    value={(answers[currentQuestion.id] as string) || ""}
                    onChange={(e) => store.setAnswer(currentQuestion.id, e.target.value)}
                    className="max-w-xs text-lg"
                  />
                )}

                {isMultipleCorrect && currentQuestion.options && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-2">Select all correct options:</p>
                    {currentQuestion.options.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const selected = ((answers[currentQuestion.id] as string[]) || []).includes(letter);
                      return (
                        <label
                          key={i}
                          className="flex min-h-11 items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-secondary/60"
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) => {
                              const current = (answers[currentQuestion.id] as string[]) || [];
                              if (checked) {
                                store.setAnswer(currentQuestion.id, [...current, letter]);
                              } else {
                                store.setAnswer(currentQuestion.id, current.filter((c) => c !== letter));
                              }
                            }}
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {isWrittenType && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Write your answer on paper and photograph it, or type it below.
                    </p>
                    <CameraCapture
                      questionId={currentQuestion.id}
                      existingImage={answerImages[currentQuestion.id]}
                      onCapture={(imageData) => {
                        store.setAnswerImage(currentQuestion.id, imageData);
                        void savePhoto(sessionId!, currentQuestion.id, imageData);
                      }}
                    />
                    <div className="mt-4">
                      <Label className="text-sm text-muted-foreground">Or type your answer:</Label>
                      <textarea
                        className="mt-2 w-full min-h-[120px] rounded-lg border bg-background p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Type your answer here..."
                        value={(answers[currentQuestion.id] as string) || ""}
                        onChange={(e) => store.setAnswer(currentQuestion.id, e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  store.clearAnswer(currentQuestion.id);
                  void deletePhoto(sessionId!, currentQuestion.id);
                }}>
                  Clear Response
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-tone-amber-border text-tone-amber-fg hover:bg-tone-amber-soft hover:text-tone-amber-fg"
                  onClick={() => store.markForReview(currentQuestion.id)}
                >
                  Mark for Review
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => store.prevQuestion()}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>
                <Button
                  onClick={() => store.nextQuestion()}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-tone-green-soft p-3 text-center">
                <div className="text-2xl font-bold text-tone-green-fg">{counts.answered}</div>
                <div className="text-xs text-muted-foreground">Answered</div>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{counts.unanswered}</div>
                <div className="text-xs text-muted-foreground">Unanswered</div>
              </div>
              <div className="rounded-lg bg-tone-amber-soft p-3 text-center">
                <div className="text-2xl font-bold text-tone-amber-fg">{counts.marked}</div>
                <div className="text-xs text-muted-foreground">Marked for Review</div>
              </div>
              <div className="rounded-lg bg-tone-sky-soft p-3 text-center">
                <div className="text-2xl font-bold text-tone-sky-fg">{counts.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
            {counts.unanswered > 0 && (
              <p className="flex items-center gap-1.5 text-tone-amber-fg font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                You have {counts.unanswered} unanswered questions!
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Go Back
            </Button>
            <Button variant="destructive" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Confirm Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
