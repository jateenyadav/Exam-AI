"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useExamStore } from "@/lib/store/exam-store";
import {
  syllabusData,
  ExamMode,
  getChaptersForSubject,
} from "@/lib/syllabus";
import Link from "next/link";

const steps = ["Select Mode", "Select Subject", "Select Chapters", "Student Info"];

export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const store = useExamStore();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [localName, setLocalName] = useState(store.studentName);
  const [localEmail, setLocalEmail] = useState(store.studentEmail);
  const [localParentEmail, setLocalParentEmail] = useState(store.parentEmail);

  const modes: { key: ExamMode; label: string; desc: string; icon: string }[] = [
    { key: "class11", label: "Class 11th (CBSE)", desc: "CBSE Board Pattern", icon: "📘" },
    { key: "class12", label: "Class 12th (CBSE)", desc: "CBSE Board Pattern", icon: "📗" },
    { key: "jee_mains", label: "JEE Mains", desc: "NTA Pattern", icon: "🎯" },
    { key: "jee_advanced", label: "JEE Advanced", desc: "Advanced Pattern", icon: "🏆" },
  ];

  const subjects = store.mode
    ? Object.entries(syllabusData[store.mode].subjects).map(([key, val]) => ({
        key,
        name: val.name,
      }))
    : [];

  const chapters = store.mode && store.subject
    ? getChaptersForSubject(store.mode, store.subject)
    : [];

  const allSelected = chapters.length > 0 && store.selectedChapters.length === chapters.length;

  function toggleSelectAll() {
    if (allSelected) {
      store.setChapters([]);
    } else {
      store.setChapters(chapters.map((c) => c.name));
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return !!store.mode;
      case 1: return !!store.subject;
      case 2: return store.selectedChapters.length > 0;
      case 3: return !!localName.trim() && !!localEmail.trim() && localEmail.includes("@");
      default: return false;
    }
  }

  async function handleStart() {
    if (!canProceed()) return;

    store.setStudentInfo(localName, localEmail, localParentEmail);
    setIsLoading(true);
    setLoadingProgress(5);
    setLoadingMessage("Creating student profile...");

    try {
      const studentRes = await fetch("/api/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: localName,
          email: localEmail,
          parentEmail: localParentEmail || undefined,
        }),
      });

      if (!studentRes.ok) throw new Error("Failed to create student");
      const { student } = await studentRes.json();

      setLoadingProgress(20);
      setLoadingMessage("Generating your personalized question paper...");

      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => Math.min(prev + 2, 90));
      }, 1000);

      const paperRes = await fetch("/api/generate-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          mode: store.mode,
          subject: store.subject,
          chapters: store.selectedChapters,
        }),
      });

      clearInterval(progressInterval);

      if (!paperRes.ok) {
        const err = await paperRes.json();
        throw new Error(err.error || "Failed to generate paper");
      }

      const { sessionId, questions, duration } = await paperRes.json();

      setLoadingProgress(95);
      setLoadingMessage("Preparing exam environment...");

      store.initExam(sessionId, questions, duration);

      setLoadingProgress(100);
      setLoadingMessage("Ready! Launching exam...");

      await new Promise((r) => setTimeout(r, 500));
      router.push("/exam");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      setIsLoading(false);
      setLoadingProgress(0);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4"
        >
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="inline-block text-5xl"
                >
                  📝
                </motion.div>
              </div>
              <h2 className="text-xl font-bold mb-2">Preparing Your Exam</h2>
              <p className="text-muted-foreground mb-6 text-sm">{loadingMessage}</p>
              <Progress value={loadingProgress} className="mb-3" />
              <p className="text-sm text-muted-foreground">{loadingProgress}%</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">E</div>
            <span className="text-xl font-bold">ExamAce</span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`hidden sm:block w-16 lg:w-24 h-0.5 mx-2 ${i < step ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {steps.map((s) => (
              <span key={s} className="hidden sm:inline">{s}</span>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Select Exam Mode</h2>
                <p className="text-muted-foreground mb-6">Choose the exam you want to practice</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {modes.map((m) => (
                    <Card
                      key={m.key}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        store.mode === m.key
                          ? "border-primary ring-2 ring-primary/20 shadow-md"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => store.setMode(m.key)}
                    >
                      <CardContent className="p-6">
                        <div className="text-3xl mb-3">{m.icon}</div>
                        <h3 className="font-semibold text-lg">{m.label}</h3>
                        <p className="text-sm text-muted-foreground">{m.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Select Subject</h2>
                <p className="text-muted-foreground mb-6">
                  Choose a subject for {store.mode && syllabusData[store.mode].label}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {subjects.map((s) => (
                    <Card
                      key={s.key}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        store.subject === s.key
                          ? "border-primary ring-2 ring-primary/20 shadow-md"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => store.setSubject(s.key)}
                    >
                      <CardContent className="p-6">
                        <h3 className="font-semibold text-lg">{s.name}</h3>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Select Chapters</h2>
                <p className="text-muted-foreground mb-4">
                  Choose chapters to include in your exam
                </p>
                <div className="mb-4 flex items-center justify-between">
                  <Badge variant="outline">
                    {store.selectedChapters.length} of {chapters.length} selected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {allSelected ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-3">
                      {chapters.map((ch) => (
                        <label
                          key={ch.id}
                          className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors"
                        >
                          <Checkbox
                            checked={store.selectedChapters.includes(ch.name)}
                            onCheckedChange={() => store.toggleChapter(ch.name)}
                          />
                          <span className="text-sm">{ch.name}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Student Information</h2>
                <p className="text-muted-foreground mb-6">
                  Enter your details before starting the exam
                </p>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        placeholder="Enter your full name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={localEmail}
                        onChange={(e) => setLocalEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="parentEmail">Parent/Teacher Email (optional)</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        value={localParentEmail}
                        onChange={(e) => setLocalParentEmail(e.target.value)}
                        placeholder="parent.email@example.com"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Results will also be sent to this email
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-base">Exam Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="font-medium">{store.mode && syllabusData[store.mode].label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subject</span>
                      <span className="font-medium">
                        {store.mode && store.subject && syllabusData[store.mode].subjects[store.subject]?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chapters</span>
                      <span className="font-medium">{store.selectedChapters.length} selected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">3 hours</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </Button>

          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={!canProceed()}>
              Generate Paper & Start Exam
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
