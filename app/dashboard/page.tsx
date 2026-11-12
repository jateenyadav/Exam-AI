"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ClipboardList, Gauge, LogOut, Plus, ShieldCheck, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useExamStore } from "@/lib/store/exam-store";
import { StudyPanel } from "@/components/dashboard/study-panel";
import { SiteHeader } from "@/components/brand/site-header";
import { MODE_LABELS, subjectStyle } from "@/lib/subject-colors";
import { scoreBand } from "@/lib/score-band";

interface SessionData {
  id: string;
  mode: string;
  subject: string;
  totalMarks: number;
  status: string;
  createdAt: string;
  result: {
    marksObtained: number;
    percentage: number;
    sectionBreakdown: string;
    chapterBreakdown: unknown;
  } | null;
}

interface StudentData {
  id: string;
  name: string;
  email: string;
  sessions: SessionData[];
}

const modeLabels = MODE_LABELS;

/** Small chip with the subject's colour and icon. */
function SubjectChip({ subject }: { subject: string }) {
  const st = subjectStyle(subject);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${st.chip}`}>
      <st.icon className="h-3.5 w-3.5" aria-hidden />
      {st.label}
    </span>
  );
}

/** Score with its band word, e.g. "0/100 · Needs work". */
function ScoreBadge({ percentage, children }: { percentage: number; children: React.ReactNode }) {
  const band = scoreBand(percentage);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold tabular-nums ${band.chip}`}>
      {children}
      <span className="text-xs font-medium opacity-90">· {band.word}</span>
    </span>
  );
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  // The session cookie identifies the student — no e-mail lookup (that let anyone read anyone's history).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/session");
        if (res.status === 401) {
          if (!cancelled) setSignedOut(true);
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setStudent(data.student);
      } catch {
        toast({ title: "Couldn't load your dashboard", variant: "destructive" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const completedSessions = student?.sessions.filter((s) => s.result) || [];
  const subjectStats = getSubjectStats(completedSessions);
  const recentExams = completedSessions.slice(0, 10);

  if (!student) {
    return (
      <div className="min-h-screen">
        <SiteHeader sticky={false}>
          <Link href="/setup">
            <Button size="sm" className="h-10 rounded-full px-5">Start Exam</Button>
          </Link>
        </SiteHeader>

        <div className="container mx-auto max-w-md px-4 py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl shadow-soft" aria-live="polite">
              <CardHeader className="items-center text-center">
                <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-tone-sky-soft text-tone-sky-fg">
                  <Gauge className="h-6 w-6" aria-hidden />
                </span>
                <CardTitle>Student Dashboard</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? "Loading your exam history…"
                    : signedOut
                      ? "No exams on this device yet. Your history is tied to this browser's secure session."
                      : "Something went wrong loading your history."}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/setup" className="block">
                  <Button className="h-11 w-full rounded-full" disabled={isLoading}>
                    {isLoading ? "Loading..." : "Take your first exam"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const bestPercentage = Math.max(...completedSessions.map((s) => s.result?.percentage || 0), 0);
  const avgPercentage =
    completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.result?.percentage || 0), 0) / completedSessions.length
      : 0;

  return (
    <div className="min-h-screen">
      <SiteHeader compact>
        <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground md:inline">{student.name}</span>
        <Link href="/setup">
          <Button size="sm" className="h-10 rounded-full px-4">
            <Plus className="hidden sm:block" aria-hidden />
            New Exam
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="h-10"
          onClick={async () => {
            await fetch("/api/session", { method: "DELETE" }).catch(() => null);
            useExamStore.getState().resetExam();
            setStudent(null);
            setSignedOut(true);
          }}
        >
          <LogOut className="hidden sm:block" aria-hidden />
          Sign out
        </Button>
      </SiteHeader>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* The heading is not faded in: during the fade it looked greyed out. */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Welcome back, {student.name}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is how your practice is going.</p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { label: "Exams Taken", value: String(completedSessions.length), icon: ClipboardList, tile: "bg-tone-sky-soft text-tone-sky-fg" },
            { label: "Average Score", value: `${avgPercentage.toFixed(1)}%`, icon: Gauge, tile: "bg-tone-violet-soft text-tone-violet-fg", pct: avgPercentage },
            { label: "Passed", value: String(completedSessions.filter((s) => (s.result?.percentage || 0) >= 60).length), icon: ShieldCheck, tile: "bg-tone-green-soft text-tone-green-fg" },
            { label: "Best Score", value: `${bestPercentage.toFixed(0)}%`, icon: Trophy, tile: "bg-tone-amber-soft text-tone-amber-fg", pct: bestPercentage },
          ].map((stat) => (
            <Card key={stat.label} className="rounded-2xl shadow-soft">
              <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.tile}`}>
                  <stat.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="text-2xl font-bold tabular-nums leading-tight">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {completedSessions.length > 0 && stat.pct !== undefined && (
                    <p className={`text-xs font-semibold ${scoreBand(stat.pct).text}`}>{scoreBand(stat.pct).word}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <StudyPanel />

        {/* Subject Performance */}
        {Object.keys(subjectStats).length > 0 && (
          <Card className="mb-8 rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Performance by Subject</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(subjectStats).map(([key, data]) => {
                const band = scoreBand(data.avgPercentage);
                return (
                  <div key={key}>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <SubjectChip subject={data.subject} />
                        <span className="font-medium">{modeLabels[data.mode] || data.mode}</span>
                      </span>
                      <span className="text-muted-foreground">
                        <span className={`font-semibold ${band.text}`}>{data.avgPercentage.toFixed(1)}% · {band.word}</span> avg ({data.count} exam{data.count === 1 ? "" : "s"})
                      </span>
                    </div>
                    <Progress value={data.avgPercentage} className="h-2.5" indicatorClassName={band.bar} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Recent Exams */}
        <h2 className="text-xl font-bold mb-4">Recent Exams</h2>
        {recentExams.length === 0 ? (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No exams taken yet.</p>
              <Link href="/setup">
                <Button className="rounded-full">Take Your First Exam</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-2xl shadow-soft">
            <ul className="divide-y">
              {recentExams.map((session) => {
                const st = subjectStyle(session.subject);
                return (
                  <motion.li key={session.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-nowrap">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${st.tile}`}>
                      <st.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{modeLabels[session.mode] || session.mode}</span>
                        <SubjectChip subject={session.subject} />
                        {session.status !== "completed" && (
                          <span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">{session.status.replace(/_/g, " ")}</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                      {session.result && (
                        <ScoreBadge percentage={session.result.percentage}>
                          {session.result.marksObtained}/{session.totalMarks}
                        </ScoreBadge>
                      )}
                      <Link href={`/results?sessionId=${session.id}`}>
                        <Button variant="outline" size="sm" className="h-10 rounded-full">
                          View Details
                          <ArrowRight aria-hidden />
                        </Button>
                      </Link>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function getSubjectStats(sessions: SessionData[]) {
  const stats: Record<string, { mode: string; subject: string; totalPercentage: number; count: number; avgPercentage: number }> = {};

  for (const session of sessions) {
    if (!session.result) continue;
    const key = `${session.mode} - ${session.subject}`;
    if (!stats[key]) {
      stats[key] = { mode: session.mode, subject: session.subject, totalPercentage: 0, count: 0, avgPercentage: 0 };
    }
    stats[key].totalPercentage += session.result.percentage;
    stats[key].count += 1;
  }

  for (const key of Object.keys(stats)) {
    stats[key].avgPercentage = stats[key].totalPercentage / stats[key].count;
  }

  return stats;
}
