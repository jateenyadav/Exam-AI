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

const STATUS_COLORS: Record<QuestionStatus, string> = {
  not_visited: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  visited: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  answered: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300",
  marked_for_review: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900 dark:text-orange-300",
  answered_and_marked: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900 dark:text-purple-300",
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

  useEffect(() => {
    if (!sessionId || questions.length === 0) {
      router.push("/setup");
      return;
    }
    if (isSubmitted) {
      router.push("/results?sessionId=" + sessionId);
      return;
    }
  }, [sessionId, questions, isSubmitted, router]);

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
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowSubmitDialog(false);

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }

      // Submit all answers to DB
      for (const [qId, answer] of Object.entries(answers)) {
        const formData = new FormData();
        formData.append("sessionId", sessionId!);
        formData.append("questionId", qId);
        if (typeof answer === "string") {
          formData.append("answerText", answer);
        } else {
          formData.append("answerText", JSON.stringify(answer));
        }
        await fetch("/api/submit-answer", { method: "POST", body: formData });
      }

      // Submit image answers
      for (const [qId, imageData] of Object.entries(answerImages)) {
        const blob = await (await fetch(imageData)).blob();
        const formData = new FormData();
        formData.append("sessionId", sessionId!);
        formData.append("questionId", qId);
        formData.append("answerImage", blob, `${qId}.jpg`);
        await fetch("/api/submit-answer", { method: "POST", body: formData });
      }

      if (auto) {
        await fetch("/api/exam-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, autoSubmitted: true }),
        });
      }

      store.submitExam();
      router.push("/results?sessionId=" + sessionId);
    } catch (error) {
      console.error("Submit error:", error);
      toast({ title: "Submission failed", description: "Retrying...", variant: "destructive" });
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

  if (!currentQuestion) return null;

  const counts = getAnswerCounts();

  return (
    <div className="min-h-screen bg-background flex flex-col select-none">
      {/* Warning Overlay */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] bg-red-500/90 flex items-center justify-center text-white">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">⚠️</div>
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
            className={`font-mono text-lg font-bold ${
              timeRemaining < 600 ? "text-red-500 animate-pulse" : "text-foreground"
            }`}
          >
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
        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-center py-1 text-sm font-medium">
          Time is running out! {formatTime(timeRemaining)} remaining.
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Question Navigation - Side Panel */}
        <div className="lg:w-64 border-b lg:border-b-0 lg:border-r bg-card p-3 no-print">
          <div className="mb-3">
            <h3 className="text-sm font-semibold mb-2">Question Palette</h3>
            <div className="flex flex-wrap gap-1 text-xs mb-2">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Not visited</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> Answered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 inline-block" /> Review</span>
            </div>
          </div>
          <ScrollArea className="h-48 lg:h-[calc(100vh-200px)]">
            <div className="grid grid-cols-8 lg:grid-cols-5 gap-1.5">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => store.goToQuestion(idx)}
                  className={`w-8 h-8 rounded text-xs font-medium border transition-all ${
                    idx === currentQuestionIndex
                      ? "ring-2 ring-primary"
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
                          className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
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
                          className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
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
                      onCapture={(imageData) => store.setAnswerImage(currentQuestion.id, imageData)}
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
                <Button variant="outline" size="sm" onClick={() => store.clearAnswer(currentQuestion.id)}>
                  Clear Response
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
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
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{counts.answered}</div>
                <div className="text-xs text-muted-foreground">Answered</div>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-center">
                <div className="text-2xl font-bold text-gray-600">{counts.unanswered}</div>
                <div className="text-xs text-muted-foreground">Unanswered</div>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">{counts.marked}</div>
                <div className="text-xs text-muted-foreground">Marked for Review</div>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{counts.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
            {counts.unanswered > 0 && (
              <p className="text-orange-600 font-medium">
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
