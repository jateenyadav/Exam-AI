"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/brand/site-header";
import { ScoreRing } from "@/components/brand/score-ring";
import { scoreBand } from "@/lib/score-band";
import { MODE_LABELS, subjectStyle } from "@/lib/subject-colors";
import { ArrowRight, Check, CheckCircle2, CircleDashed, CircleMinus, Lightbulb, Loader2, Mail, Plus, Printer, TrendingUp, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ExplainMistake } from "@/components/exam/explain-mistake";

interface ResultData {
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  sectionBreakdown: Record<string, { total: number; obtained: number }>;
  chapterBreakdown: Record<string, { total: number; obtained: number; questions: number }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  estimatedGrade: string;
}

interface QuestionDetail {
  id: string;
  questionNumber: number;
  questionText: string;
  type: string;
  section: string;
  marks: number;
  chapterName: string;
  correctAnswer: string;
  solution: string;
  options: string | null;
}

interface AnswerDetail {
  questionId: string;
  answerText: string | null;
  answerImageUrl: string | null;
  isCorrect: boolean | null;
  marksAwarded: number | null;
  aiFeedback: string | null;
  modelAnswer: string | null;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const { toast } = useToast();

  const [isEvaluating, setIsEvaluating] = useState(true);
  const [evalProgress, setEvalProgress] = useState(0);
  const [result, setResult] = useState<ResultData | null>(null);
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ mode: string; subject: string; studentName: string } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    evaluateExam();
  }, [sessionId]);

  function postEvaluate() {
    return fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  }

  async function evaluateExam() {
    setIsEvaluating(true);
    setEvalProgress(10);

    const progressInterval = setInterval(() => {
      setEvalProgress((p) => Math.min(p + 3, 85));
    }, 1500);

    try {
      // 409 = another tab is already grading this exam — wait and retry.
      let evalRes = await postEvaluate();
      for (let attempt = 0; evalRes.status === 409 && attempt < 6; attempt++) {
        await new Promise((r) => setTimeout(r, 4000));
        evalRes = await postEvaluate();
      }

      clearInterval(progressInterval);
      setEvalProgress(90);

      if (!evalRes.ok) {
        const err = await evalRes.json().catch(() => ({}));
        throw new Error(err.error || "Evaluation failed");
      }
      const { result: evalResult } = await evalRes.json();

      const sessionRes = await fetch(`/api/exam-session?sessionId=${sessionId}`);
      if (!sessionRes.ok) throw new Error("Failed to fetch session");
      const { session } = await sessionRes.json();

      setResult({
        totalMarks: evalResult.totalMarks,
        marksObtained: evalResult.marksObtained,
        percentage: evalResult.percentage,
        sectionBreakdown: typeof evalResult.sectionBreakdown === "string"
          ? JSON.parse(evalResult.sectionBreakdown)
          : evalResult.sectionBreakdown,
        chapterBreakdown: typeof evalResult.chapterBreakdown === "string"
          ? JSON.parse(evalResult.chapterBreakdown)
          : evalResult.chapterBreakdown,
        strengths: evalResult.strengths || [],
        weaknesses: evalResult.weaknesses || [],
        recommendations: evalResult.recommendations || [],
        estimatedGrade: evalResult.estimatedGrade || "",
      });

      setQuestions(session.questions);
      setAnswers(session.answers);
      setSessionInfo({
        mode: session.mode,
        subject: session.subject,
        studentName: session.student.name,
      });
      const canEmail = Boolean(session.student.email || session.student.parentEmail);
      setHasEmail(canEmail);

      setEvalProgress(100);

      // Auto-send the report only if the student gave an e-mail (otherwise it's a guaranteed 400).
      if (canEmail) sendEmail();
    } catch (error) {
      toast({
        title: "Evaluation Error",
        description: error instanceof Error ? error.message : "Failed to evaluate",
        variant: "destructive",
      });
    } finally {
      clearInterval(progressInterval);
      setIsEvaluating(false);
    }
  }

  async function sendEmail() {
    if (isSendingEmail || emailSent) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch("/api/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.success) setEmailSent(true);
      toast({
        title: data.success ? "Email Sent" : "Email Notice",
        description: data.message,
      });
    } catch {
      toast({ title: "Failed to send email", variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  }

  if (isEvaluating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4"
        >
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-8 text-center" aria-live="polite">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-tone-violet-soft text-tone-violet-fg">
                <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
              </div>
              <h2 className="text-xl font-bold mb-2">Evaluating Your Answers</h2>
              <p className="text-sm text-muted-foreground mb-6">
                AI is carefully checking your work...
              </p>
              <Progress value={evalProgress} className="mb-3 h-2.5" indicatorClassName="bg-gradient-to-r from-primary to-tone-sky" />
              <p className="text-sm text-muted-foreground">{evalProgress}%</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-4 rounded-2xl shadow-soft">
          <CardContent className="p-8 text-center">
            <p className="text-xl mb-4">No results available</p>
            <Link href="/setup">
              <Button className="rounded-full">Start New Exam</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const modeLabels = MODE_LABELS;
  const band = scoreBand(result.percentage);
  const subject = sessionInfo ? subjectStyle(sessionInfo.subject) : null;

  return (
    <div className="min-h-screen">
      <SiteHeader compact className="no-print">
        <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={() => window.print()} aria-label="Print / Save PDF">
          <Printer aria-hidden />
          <span className="hidden sm:inline">Print / Save PDF</span>
        </Button>
        {hasEmail && (
          <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={sendEmail}
            disabled={isSendingEmail || emailSent}
            aria-label={emailSent ? "Email Sent" : isSendingEmail ? "Sending..." : "Resend Email"}
          >
            {emailSent ? <Check aria-hidden /> : isSendingEmail ? <Loader2 className="animate-spin" aria-hidden /> : <Mail aria-hidden />}
            <span className="hidden sm:inline">{emailSent ? "Email Sent" : isSendingEmail ? "Sending..." : "Resend Email"}</span>
          </Button>
        )}
        <Link href="/setup">
          <Button size="sm" className="h-10 rounded-full px-4">
            <Plus aria-hidden />
            New Exam
          </Button>
        </Link>
      </SiteHeader>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Score Card: a ring coloured by score band, with the marks and a word next to it. */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="relative mb-6 overflow-hidden rounded-3xl shadow-soft">
            <div aria-hidden className="hero-wash pointer-events-none absolute inset-0 opacity-70" />
            <CardContent className="relative flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
              <ScoreRing
                value={result.percentage}
                size={152}
                stroke={13}
                label={<span className="text-4xl">{result.percentage.toFixed(1)}%</span>}
                sublabel="score"
              />
              <div className="min-w-0 flex-1">
                {sessionInfo && (
                  <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
                    <span>{sessionInfo.studentName}</span>
                    <span aria-hidden>·</span>
                    <span>{modeLabels[sessionInfo.mode] || sessionInfo.mode}</span>
                    {subject && (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${subject.chip}`}>
                        <subject.icon className="h-3.5 w-3.5" aria-hidden />
                        {subject.label}
                      </span>
                    )}
                  </div>
                )}
                <div className="text-5xl font-bold tabular-nums tracking-tight">
                  {result.marksObtained}/{result.totalMarks}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${band.chip}`}>{band.word}</span>
                  {result.estimatedGrade && (
                    <Badge variant="outline" className="rounded-full bg-card px-3 py-1 text-sm">
                      Grade: {result.estimatedGrade}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section Breakdown */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card className="h-full rounded-2xl shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Section-wise Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(result.sectionBreakdown).map(([section, data]) => {
                  const pct = data.total > 0 ? (data.obtained / data.total) * 100 : 0;
                  return (
                    <div key={section}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{section.replace(/_/g, " ")}</span>
                        <span className={`font-medium ${scoreBand(pct).text}`}>{data.obtained}/{data.total}</span>
                      </div>
                      <Progress value={pct} className="h-2" indicatorClassName={scoreBand(pct).bar} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full rounded-2xl shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Chapter-wise Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {Object.entries(result.chapterBreakdown).map(([chapter, data]) => {
                    const pct = data.total > 0 ? (data.obtained / data.total) * 100 : 0;
                    return (
                      <div key={chapter}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-xs truncate mr-2">{chapter}</span>
                          <span className={`font-medium text-xs whitespace-nowrap ${scoreBand(pct).text}`}>{data.obtained}/{data.total}</span>
                        </div>
                        <Progress value={pct} className="h-1.5" indicatorClassName={scoreBand(pct).bar} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Strengths, Weaknesses, Recommendations */}
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          {result.strengths.length > 0 && (
            <Card className="rounded-2xl border-tone-green-border bg-tone-green-soft/50 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-tone-green-fg">
                  <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden /> Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-tone-green-fg" aria-hidden />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {result.weaknesses.length > 0 && (
            <Card className="rounded-2xl border-tone-coral-border bg-tone-coral-soft/50 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-tone-coral-fg">
                  <TrendingUp className="h-[18px] w-[18px]" aria-hidden /> Areas to Improve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <CircleMinus className="mt-0.5 h-4 w-4 shrink-0 text-tone-coral-fg" aria-hidden />
                      {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {result.recommendations.length > 0 && (
            <Card className="rounded-2xl border-tone-sky-border bg-tone-sky-soft/50 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-tone-sky-fg">
                  <Lightbulb className="h-[18px] w-[18px]" aria-hidden /> Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-tone-sky-fg" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator className="my-8" />

        {/* Question-wise Analysis */}
        <h2 className="text-xl font-bold mb-4">Question-wise Analysis</h2>
        <div className="space-y-4">
          {questions.map((q) => {
            const answer = answers.find((a) => a.questionId === q.id);
            const isCorrect = answer?.isCorrect;
            const awarded = answer?.marksAwarded ?? 0;
            const attempted = Boolean(answer?.answerText || answer?.answerImageUrl);
            // Status chip: icon + word, never colour alone.
            const status = isCorrect
              ? { word: "Correct", icon: CheckCircle2, chip: "bg-tone-green-soft text-tone-green-fg border-tone-green-border", edge: "border-l-tone-green" }
              : awarded > 0
                ? { word: "Partly correct", icon: CircleDashed, chip: "bg-tone-amber-soft text-tone-amber-fg border-tone-amber-border", edge: "border-l-tone-amber" }
                : attempted
                  ? { word: "Wrong", icon: XCircle, chip: "bg-tone-coral-soft text-tone-coral-fg border-tone-coral-border", edge: "border-l-tone-coral" }
                  : { word: "Not answered", icon: CircleMinus, chip: "bg-muted text-muted-foreground border-border", edge: "border-l-border" };

            return (
              <motion.div key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={`rounded-2xl border-l-4 shadow-soft ${status.edge}`}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold">Q{q.questionNumber}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${status.chip}`}>
                          <status.icon className="h-3.5 w-3.5" aria-hidden />
                          {status.word}
                        </span>
                        <Badge variant="outline" className="rounded-full text-xs font-medium">
                          {awarded}/{q.marks} marks
                        </Badge>
                        <Badge variant="secondary" className="rounded-full text-xs font-medium">{q.chapterName}</Badge>
                      </div>
                    </div>

                    <p className="text-sm mb-3 whitespace-pre-wrap">{q.questionText}</p>

                    {answer?.answerText && (
                      <div className="mb-2 rounded-xl bg-muted p-3">
                        <p className="text-xs text-muted-foreground mb-1">Your answer:</p>
                        <p className="text-sm">{answer.answerText}</p>
                      </div>
                    )}

                    {!isCorrect && (
                      <div className="rounded-xl border border-tone-green-border bg-tone-green-soft p-3 mb-2">
                        <p className="text-xs text-tone-green-fg font-semibold mb-1">Correct Answer:</p>
                        <p className="text-sm">{q.correctAnswer}</p>
                      </div>
                    )}

                    {answer?.aiFeedback && (
                      <div className="rounded-xl border border-tone-sky-border bg-tone-sky-soft p-3 mb-2">
                        <p className="text-xs text-tone-sky-fg font-semibold mb-1">Feedback:</p>
                        <p className="text-sm">{answer.aiFeedback}</p>
                      </div>
                    )}

                    {!isCorrect && answer && sessionId && (
                      <ExplainMistake sessionId={sessionId} questionId={q.id} attempted={Boolean(answer.answerText || answer.answerImageUrl)} />
                    )}

                    {!isCorrect && q.solution && (
                      <details className="mt-2">
                        <summary className="inline-flex min-h-8 cursor-pointer items-center rounded text-xs font-medium text-primary hover:underline">
                          View Complete Solution
                        </summary>
                        <div className="mt-2 rounded-xl bg-muted p-3">
                          <p className="text-sm whitespace-pre-wrap">{q.solution}</p>
                        </div>
                      </details>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center no-print">
          <Link href="/setup">
            <Button size="lg" className="h-12 rounded-full px-8 shadow-md shadow-primary/20">Start Another Exam</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center" aria-live="polite">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" aria-hidden />
          <p>Loading results...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
