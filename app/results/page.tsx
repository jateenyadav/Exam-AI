"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

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
  const [sessionInfo, setSessionInfo] = useState<{ mode: string; subject: string; studentName: string } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    evaluateExam();
  }, [sessionId]);

  async function evaluateExam() {
    setIsEvaluating(true);
    setEvalProgress(10);

    const progressInterval = setInterval(() => {
      setEvalProgress((p) => Math.min(p + 3, 85));
    }, 1500);

    try {
      const evalRes = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      clearInterval(progressInterval);
      setEvalProgress(90);

      if (!evalRes.ok) throw new Error("Evaluation failed");
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

      setEvalProgress(100);

      // Auto-send results email
      sendEmail();
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4"
        >
          <Card>
            <CardContent className="p-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block text-5xl mb-4"
              >
                🤖
              </motion.div>
              <h2 className="text-xl font-bold mb-2">Evaluating Your Answers</h2>
              <p className="text-sm text-muted-foreground mb-6">
                AI is carefully checking your work...
              </p>
              <Progress value={evalProgress} className="mb-3" />
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
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <p className="text-xl mb-4">No results available</p>
            <Link href="/setup">
              <Button>Start New Exam</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const modeLabels: Record<string, string> = {
    class11: "Class 11 (CBSE)",
    class12: "Class 12 (CBSE)",
    jee_mains: "JEE Mains",
    jee_advanced: "JEE Advanced",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 no-print">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">E</div>
            <span className="text-xl font-bold">ExamAce</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              Print Report
            </Button>
            <Button variant="outline" size="sm" onClick={sendEmail} disabled={isSendingEmail || emailSent}>
              {emailSent ? "Email Sent ✓" : isSendingEmail ? "Sending..." : "Resend Email"}
            </Button>
            <Link href="/setup">
              <Button size="sm">New Exam</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Score Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 overflow-hidden">
            <div className={`p-8 text-center text-white ${result.percentage >= 60 ? "bg-gradient-to-r from-green-500 to-emerald-600" : result.percentage >= 40 ? "bg-gradient-to-r from-yellow-500 to-orange-500" : "bg-gradient-to-r from-red-500 to-rose-600"}`}>
              {sessionInfo && (
                <p className="text-white/80 mb-2 text-sm">
                  {sessionInfo.studentName} | {modeLabels[sessionInfo.mode] || sessionInfo.mode} - {sessionInfo.subject}
                </p>
              )}
              <div className="text-6xl font-bold mb-2">
                {result.marksObtained}/{result.totalMarks}
              </div>
              <div className="text-2xl opacity-90">{result.percentage.toFixed(1)}%</div>
              {result.estimatedGrade && (
                <Badge className="mt-3 bg-white/20 text-white text-lg px-4 py-1">
                  Grade: {result.estimatedGrade}
                </Badge>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Section Breakdown */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card className="h-full">
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
                        <span className="font-medium">{data.obtained}/{data.total}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full">
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
                          <span className="font-medium text-xs whitespace-nowrap">{data.obtained}/{data.total}</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-green-600">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-green-500 shrink-0">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {result.weaknesses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-red-600">Areas to Improve</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-500 shrink-0">!</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-blue-600">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-blue-500 shrink-0">→</span>
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

            return (
              <motion.div key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={`border-l-4 ${isCorrect ? "border-l-green-500" : answer ? "border-l-red-500" : "border-l-gray-300"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={isCorrect ? "default" : "destructive"} className="text-xs">
                          Q{q.questionNumber}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {awarded}/{q.marks} marks
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{q.chapterName}</Badge>
                      </div>
                    </div>

                    <p className="text-sm mb-3 whitespace-pre-wrap">{q.questionText}</p>

                    {answer?.answerText && (
                      <div className="mb-2 rounded bg-muted p-2">
                        <p className="text-xs text-muted-foreground mb-1">Your answer:</p>
                        <p className="text-sm">{answer.answerText}</p>
                      </div>
                    )}

                    {!isCorrect && (
                      <div className="rounded bg-green-50 dark:bg-green-950 p-3 mb-2">
                        <p className="text-xs text-green-600 font-medium mb-1">Correct Answer:</p>
                        <p className="text-sm">{q.correctAnswer}</p>
                      </div>
                    )}

                    {answer?.aiFeedback && (
                      <div className="rounded bg-blue-50 dark:bg-blue-950 p-3 mb-2">
                        <p className="text-xs text-blue-600 font-medium mb-1">Feedback:</p>
                        <p className="text-sm">{answer.aiFeedback}</p>
                      </div>
                    )}

                    {!isCorrect && q.solution && (
                      <details className="mt-2">
                        <summary className="text-xs text-primary cursor-pointer font-medium">
                          View Complete Solution
                        </summary>
                        <div className="mt-2 rounded bg-muted p-3">
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
            <Button size="lg">Start Another Exam</Button>
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
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p>Loading results...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
