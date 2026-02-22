"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

const features = [
  {
    icon: "🎯",
    title: "CBSE & JEE Patterns",
    description: "AI generates papers matching exact board exam and JEE patterns with proper sections and marking.",
  },
  {
    icon: "🤖",
    title: "AI Evaluation",
    description: "Get instant, detailed feedback on your answers — including handwritten ones via camera.",
  },
  {
    icon: "📊",
    title: "Detailed Analytics",
    description: "Chapter-wise and section-wise performance breakdown with personalized study recommendations.",
  },
  {
    icon: "🔒",
    title: "Exam-Like Environment",
    description: "Anti-cheating system with fullscreen mode, tab-switch detection, and timed sessions.",
  },
];

const examModes = [
  { label: "Class 11 CBSE", desc: "Physics, Chemistry, Maths, English" },
  { label: "Class 12 CBSE", desc: "Physics, Chemistry, Maths, English" },
  { label: "JEE Mains", desc: "Physics, Chemistry, Mathematics" },
  { label: "JEE Advanced", desc: "Physics, Chemistry, Mathematics" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              E
            </div>
            <span className="text-xl font-bold">ExamAce</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <Link href="/setup">
              <Button size="sm">Start Exam</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-4 inline-flex items-center rounded-full border bg-muted px-4 py-1.5 text-sm">
              AI-Powered Exam Practice Platform
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Ace Your{" "}
              <span className="text-primary">CBSE & JEE</span>{" "}
              Exams
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Practice with AI-generated exam papers that match real patterns.
              Get instant evaluation, detailed analytics, and personalized study plans.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/setup">
                <Button size="lg" className="text-base px-8 h-12">
                  Start Practice Exam
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="text-base px-8 h-12">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Why ExamAce?</h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Everything you need for effective exam preparation
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm">{f.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Available Exams</h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Choose your exam and start practicing
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {examModes.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i, duration: 0.4 }}
              >
                <Card className="h-full hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <h3 className="font-semibold text-lg mb-2">{m.label}</h3>
                    <p className="text-muted-foreground text-sm">{m.desc}</p>
                    <Link href="/setup">
                      <Button variant="outline" size="sm" className="mt-4">
                        Start Now
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>ExamAce — AI-Powered Exam Practice for CBSE & JEE Students</p>
        </div>
      </footer>
    </div>
  );
}
