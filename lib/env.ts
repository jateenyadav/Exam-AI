import { z } from "zod";

/**
 * All configuration comes from environment variables (set them in Vercel /
 * `.env.local`). Secrets are never stored in the database or accepted from the UI.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1).optional(),

  // AI — Gemini is primary (free tier in Google AI Studio); OpenRouter is the fallback.
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-flash-latest"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  // Groq (free tier) is tried first for text-only requests; photos always go to a vision model.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  AI_PROVIDER: z.enum(["gemini", "groq", "openrouter"]).optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),

  // Abuse / cost controls
  PAPERS_PER_STUDENT_PER_DAY: z.coerce.number().int().positive().default(5),
  PAPERS_GLOBAL_PER_DAY: z.coerce.number().int().positive().default(300),
  SIGNUPS_PER_IP_PER_HOUR: z.coerce.number().int().positive().default(20),
  EMAILS_PER_STUDENT_PER_DAY: z.coerce.number().int().positive().default(3),

  // Admin status page (read-only). Leave unset to disable it entirely.
  ADMIN_TOKEN: z.string().min(16).optional(),

  // Optional e-mail delivery of result reports
  EMAIL_SMTP_HOST: z.string().optional(),
  EMAIL_SMTP_PORT: z.coerce.number().int().positive().default(587),
  EMAIL_SMTP_USER: z.string().optional(),
  EMAIL_SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default("ExamAce <noreply@examace.app>"),

  NEXT_PUBLIC_APP_URL: z.string().optional(),
})

export type Env = z.infer<typeof schema>

let cached: Env | null = null

export function env(): Env {
  if (cached && process.env.NODE_ENV !== "test") return cached
  // Treat empty strings as "unset" so `.env` placeholders don't break parsing.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""))
  cached = schema.parse(raw)
  return cached
}
