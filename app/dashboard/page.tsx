"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

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
    chapterBreakdown: string;
  } | null;
}

interface StudentData {
  id: string;
  name: string;
  email: string;
  sessions: SessionData[];
}

const modeLabels: Record<string, string> = {
  class11: "Class 11 (CBSE)",
  class12: "Class 12 (CBSE)",
  jee_mains: "JEE Mains",
  jee_advanced: "JEE Advanced",
};

export default function DashboardPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [student, setStudent] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function fetchDashboard() {
    if (!email.includes("@")) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/student?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.student) {
        setStudent(data.student);
      } else {
        toast({ title: "No account found", description: "Take an exam first to see your dashboard." });
      }
    } catch {
      toast({ title: "Error fetching data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const completedSessions = student?.sessions.filter((s) => s.result) || [];
  const subjectStats = getSubjectStats(completedSessions);
  const recentExams = completedSessions.slice(0, 10);

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <header className="border-b bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">E</div>
              <span className="text-xl font-bold">ExamAce</span>
            </Link>
            <Link href="/setup">
              <Button size="sm">Start Exam</Button>
            </Link>
          </div>
        </header>

        <div className="container mx-auto max-w-md px-4 py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Student Dashboard</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enter your email to view your exam history and progress
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchDashboard()}
                    className="mt-1"
                  />
                </div>
                <Button className="w-full" onClick={fetchDashboard} disabled={isLoading}>
                  {isLoading ? "Loading..." : "View Dashboard"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const avgPercentage =
    completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.result?.percentage || 0), 0) / completedSessions.length
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">E</div>
            <span className="text-xl font-bold">ExamAce</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{student.name}</span>
            <Link href="/setup">
              <Button size="sm">New Exam</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-6">Welcome back, {student.name}!</h1>
        </motion.div>

        {/* Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{completedSessions.length}</div>
              <p className="text-sm text-muted-foreground">Exams Taken</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{avgPercentage.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">
                {completedSessions.filter((s) => (s.result?.percentage || 0) >= 60).length}
              </div>
              <p className="text-sm text-muted-foreground">Passed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">
                {Math.max(...completedSessions.map((s) => s.result?.percentage || 0), 0).toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground">Best Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Subject Performance */}
        {Object.keys(subjectStats).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base">Performance by Subject</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(subjectStats).map(([subject, data]) => (
                <div key={subject}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize font-medium">{subject}</span>
                    <span className="text-muted-foreground">
                      {data.avgPercentage.toFixed(1)}% avg ({data.count} exams)
                    </span>
                  </div>
                  <Progress value={data.avgPercentage} className="h-2.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Separator className="my-6" />

        {/* Recent Exams */}
        <h2 className="text-xl font-bold mb-4">Recent Exams</h2>
        {recentExams.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No exams taken yet.</p>
              <Link href="/setup">
                <Button>Take Your First Exam</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentExams.map((session) => (
              <motion.div key={session.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {modeLabels[session.mode] || session.mode} - {session.subject}
                        </span>
                        <Badge
                          variant={session.status === "completed" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {session.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {session.result && (
                        <div className="text-right">
                          <div className={`text-lg font-bold ${session.result.percentage >= 60 ? "text-green-600" : session.result.percentage >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                            {session.result.marksObtained}/{session.totalMarks}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {session.result.percentage.toFixed(1)}%
                          </div>
                        </div>
                      )}
                      <Link href={`/results?sessionId=${session.id}`}>
                        <Button variant="outline" size="sm">View Details</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getSubjectStats(sessions: SessionData[]) {
  const stats: Record<string, { totalPercentage: number; count: number; avgPercentage: number }> = {};

  for (const session of sessions) {
    if (!session.result) continue;
    const key = `${session.mode} - ${session.subject}`;
    if (!stats[key]) {
      stats[key] = { totalPercentage: 0, count: 0, avgPercentage: 0 };
    }
    stats[key].totalPercentage += session.result.percentage;
    stats[key].count += 1;
  }

  for (const key of Object.keys(stats)) {
    stats[key].avgPercentage = stats[key].totalPercentage / stats[key].count;
  }

  return stats;
}
