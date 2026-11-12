"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Atom, Camera, GraduationCap, LineChart, MessageCircleQuestion, NotebookPen, Rocket, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/brand/site-header";
import { scoreBand } from "@/lib/score-band";

// Each feature gets its own soft tint so the grid reads at a glance.
const features = [
  { tile: "bg-secondary text-secondary-foreground", icon: Target, title: "Real exam patterns", description: "Papers follow the real CBSE and JEE sections and marking, including negative marking." },
  { tile: "bg-tone-sky-soft text-tone-sky-fg", icon: Camera, title: "Type or snap your answer", description: "Write on paper and take a photo, or just type. Both get graded with feedback." },
  { tile: "bg-tone-violet-soft text-tone-violet-fg", icon: MessageCircleQuestion, title: "Explain my mistake", description: "An AI tutor walks you through every wrong answer, step by step. Ask follow-ups." },
  { tile: "bg-tone-amber-soft text-tone-amber-fg", icon: NotebookPen, title: "Mistake notebook", description: "Wrong answers turn into flashcards that come back right before you'd forget them." },
  { tile: "bg-tone-teal-soft text-tone-teal-fg", icon: LineChart, title: "Know your weak topics", description: "See which chapters cost you marks and practise just those, in one click." },
  { tile: "bg-tone-pink-soft text-tone-pink-fg", icon: ShieldCheck, title: "Feels like the real exam", description: "Timer, full screen and focus checks — and a refresh never loses your answers." },
];

const steps = [
  { n: "1", badge: "bg-primary text-primary-foreground", title: "Pick your exam", text: "Class 11, Class 12, JEE Mains or Advanced — and the chapters you want." },
  { n: "2", badge: "bg-tone-sky text-white dark:text-background", title: "Take the test", text: "A fresh paper in the real pattern, with a timer, in a calm exam room." },
  { n: "3", badge: "bg-tone-teal text-white dark:text-background", title: "Learn from it", text: "Marks, feedback, a tutor for every mistake and a plan for what to study next." },
];

const examModes = [
  { label: "Class 11 CBSE", desc: "Physics, Chemistry, Maths, English", icon: GraduationCap, accent: "bg-tone-sky", tile: "bg-tone-sky-soft text-tone-sky-fg", hover: "hover:border-tone-sky-border", text: "text-tone-sky-fg" },
  { label: "Class 12 CBSE", desc: "Physics, Chemistry, Maths, English", icon: Atom, accent: "bg-tone-teal", tile: "bg-tone-teal-soft text-tone-teal-fg", hover: "hover:border-tone-teal-border", text: "text-tone-teal-fg" },
  { label: "JEE Mains", desc: "Physics, Chemistry, Mathematics", icon: Rocket, accent: "bg-tone-violet", tile: "bg-tone-violet-soft text-tone-violet-fg", hover: "hover:border-tone-violet-border", text: "text-tone-violet-fg" },
  { label: "JEE Advanced", desc: "Physics, Chemistry, Mathematics", icon: Trophy, accent: "bg-tone-amber", tile: "bg-tone-amber-soft text-tone-amber-fg", hover: "hover:border-tone-amber-border", text: "text-tone-amber-fg" },
];

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: "easeOut" as const } };

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader>
        {/* Very narrow phones: the hero's "My progress" button covers this link. */}
        <Link href="/dashboard" className="hidden min-[380px]:inline-flex">
          <Button variant="ghost" size="sm" className="h-10 px-2.5 sm:px-3">Dashboard</Button>
        </Link>
        <Link href="/setup">
          <Button size="sm" className="h-10 rounded-full px-4 sm:px-5">Start Exam</Button>
        </Link>
      </SiteHeader>

      <section className="relative overflow-hidden">
        <div aria-hidden className="hero-wash pointer-events-none absolute inset-0" />
        <div className="container relative mx-auto px-4 pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div {...fadeUp} className="text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card/80 px-4 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              Free practice for CBSE &amp; JEE students
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl md:text-6xl text-balance">
              Practise calmly.
              <br />
              <span className="text-gradient">Learn from every mistake.</span>
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
            <Card className="rounded-3xl border-primary/10 bg-card/95 shadow-xl shadow-primary/10 backdrop-blur">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">JEE Mains · Physics</p>
                    <p className="text-lg font-semibold">Your result</p>
                  </div>
                  <div className="rounded-2xl border border-tone-amber-border bg-tone-amber-soft px-3 py-1.5 text-sm font-semibold text-tone-amber-fg">72 / 100</div>
                </div>
                {[
                  ["Kinematics", 86],
                  ["Laws of Motion", 64],
                  ["Thermodynamics", 41],
                ].map(([name, pct]) => {
                  const band = scoreBand(pct as number);
                  return (
                    <div key={name as string}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{name}</span>
                        <span className={`font-medium ${band.text}`}>{pct}% · {band.word}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className={`h-2 rounded-full ${band.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-2xl border border-tone-violet-border bg-tone-violet-soft p-4 text-sm text-tone-violet-fg">
                  <p className="mb-1 flex items-center gap-1.5 font-medium">
                    <MessageCircleQuestion className="h-4 w-4" /> AI tutor
                  </p>
                  You used v = u + at, but the body started from rest, so u = 0. Let&apos;s redo step 2…
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        </div>
      </section>

      <section className="border-y bg-card/60 py-14">
        <div className="container mx-auto grid gap-6 px-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold shadow-sm ${s.badge}`}>{s.n}</div>
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
            <Card key={f.title} className="lift h-full rounded-2xl shadow-soft">
              <CardContent className="p-6">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${f.tile}`}>
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
          <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8 md:p-12">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold">Choose your exam</h2>
              <p className="mt-3 text-muted-foreground">Pick one and start in under a minute.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {examModes.map((m) => (
                <Link
                  key={m.label}
                  href="/setup"
                  className={`lift group relative overflow-hidden rounded-2xl border bg-background p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${m.hover}`}
                >
                  <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${m.accent}`} />
                  <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${m.tile}`}>
                    <m.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="font-semibold">{m.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                  <p className={`mt-3 inline-flex items-center gap-1 text-sm font-medium ${m.text}`}>
                    Start <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </p>
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
