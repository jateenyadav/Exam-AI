"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpenCheck, Camera, LineChart, MessageCircleQuestion, NotebookPen, ShieldCheck, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: Target, title: "Real exam patterns", description: "Papers follow the real CBSE and JEE sections and marking, including negative marking." },
  { icon: Camera, title: "Type or snap your answer", description: "Write on paper and take a photo, or just type. Both get graded with feedback." },
  { icon: MessageCircleQuestion, title: "Explain my mistake", description: "An AI tutor walks you through every wrong answer, step by step. Ask follow-ups." },
  { icon: NotebookPen, title: "Mistake notebook", description: "Wrong answers turn into flashcards that come back right before you'd forget them." },
  { icon: LineChart, title: "Know your weak topics", description: "See which chapters cost you marks and practise just those, in one click." },
  { icon: ShieldCheck, title: "Feels like the real exam", description: "Timer, full screen and focus checks — and a refresh never loses your answers." },
];

const steps = [
  { n: "1", title: "Pick your exam", text: "Class 11, Class 12, JEE Mains or Advanced — and the chapters you want." },
  { n: "2", title: "Take the test", text: "A fresh paper in the real pattern, with a timer, in a calm exam room." },
  { n: "3", title: "Learn from it", text: "Marks, feedback, a tutor for every mistake and a plan for what to study next." },
];

const examModes = [
  { label: "Class 11 CBSE", desc: "Physics, Chemistry, Maths, English" },
  { label: "Class 12 CBSE", desc: "Physics, Chemistry, Maths, English" },
  { label: "JEE Mains", desc: "Physics, Chemistry, Mathematics" },
  { label: "JEE Advanced", desc: "Physics, Chemistry, Mathematics" },
];

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: "easeOut" as const } };

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-sm">
              E
            </div>
            <span className="text-xl font-bold">ExamAce</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <Link href="/setup">
              <Button size="sm" className="rounded-full px-5">Start Exam</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-4 pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div {...fadeUp} className="text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              Free practice for CBSE &amp; JEE students
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl md:text-6xl text-balance">
              Practise calmly.
              <br />
              <span className="text-primary">Learn from every mistake.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground lg:mx-0">
              Get a fresh exam paper in the real pattern, answer by typing or with a photo of your working, and get
              clear feedback — plus a tutor that explains exactly where you went wrong.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link href="/setup">
                <Button size="lg" className="h-12 rounded-full px-8 text-base shadow-md shadow-primary/20">
                  Start a practice exam
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="h-12 rounded-full px-8 text-base">
                  My progress
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No sign-up needed · Works on your phone</p>
          </motion.div>

          {/* A preview of what a result looks like — plain HTML, no images to load. */}
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="mx-auto w-full max-w-md" aria-hidden>
            <Card className="rounded-3xl border-primary/10 shadow-xl shadow-primary/5">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">JEE Mains · Physics</p>
                    <p className="text-lg font-semibold">Your result</p>
                  </div>
                  <div className="rounded-2xl bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground">72 / 100</div>
                </div>
                {[
                  ["Kinematics", 86],
                  ["Laws of Motion", 64],
                  ["Thermodynamics", 41],
                ].map(([name, pct]) => (
                  <div key={name as string}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{name}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary/80" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
                  <p className="mb-1 flex items-center gap-1.5 font-medium">
                    <MessageCircleQuestion className="h-4 w-4" /> AI tutor
                  </p>
                  You used v = u + at, but the body started from rest, so u = 0. Let&apos;s redo step 2…
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="border-y bg-card/60 py-14">
        <div className="container mx-auto grid gap-6 px-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-secondary-foreground">{s.n}</div>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold">Everything you need to improve</h2>
          <p className="mt-3 text-lg text-muted-foreground">Not just a score — a clear next step after every test.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="h-full rounded-2xl transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <f.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mb-1.5 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl border bg-card p-8 shadow-sm md:p-12">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold">Choose your exam</h2>
              <p className="mt-3 text-muted-foreground">Pick one and start in under a minute.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {examModes.map((m) => (
                <Link key={m.label} href="/setup" className="group rounded-2xl border bg-background p-5 transition-colors hover:border-primary/40 hover:bg-secondary/40">
                  <BookOpenCheck className="mb-3 h-5 w-5 text-primary" aria-hidden />
                  <h3 className="font-semibold">{m.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                  <p className="mt-3 text-sm font-medium text-primary">Start →</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>ExamAce — calm, smart exam practice for CBSE &amp; JEE students</p>
        </div>
      </footer>
    </div>
  );
}
