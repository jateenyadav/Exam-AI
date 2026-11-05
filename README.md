# ExamAce — AI exam practice for CBSE & JEE

[![CI](https://github.com/jateenyadav/Exam-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/jateenyadav/Exam-AI/actions/workflows/ci.yml)
![Next.js 14](https://img.shields.io/badge/Next.js-14-black) ![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6) ![MongoDB + Prisma](https://img.shields.io/badge/MongoDB-Prisma-47A248) ![License MIT](https://img.shields.io/badge/license-MIT-blue)

**Live:** https://exam-ai-tau-bay.vercel.app

ExamAce generates a full exam paper in the real CBSE / JEE pattern, runs it in a timed, proctored exam room, and grades it — objective questions deterministically, **handwritten answers from a phone photo** with a vision model — then produces a section- and chapter-wise report.

![ExamAce](docs/screenshot.jpg)

---

## Highlights

| | |
|---|---|
| **Exam patterns** | Class 11 / 12 CBSE, JEE Mains, JEE Advanced (MCQ, assertion-reason, integer, multiple-correct with partial marking, short/long answer, case-based) |
| **AI paper generation** | Sections generated in parallel, every AI response validated against a schema; falls back to a built-in question bank if AI is down |
| **Handwritten grading** | Photograph your working → vision model grades it against the marking scheme; marks clamped, prompt-injection resistant |
| **Exam room** | Server-enforced deadline, fullscreen + tab-switch detection (counter can only go up), auto-submit |
| **Reports** | Strengths / weaknesses / study plan, optional e-mail to student + parent |

## Architecture

```mermaid
flowchart LR
  B[Browser<br/>Next.js client + Zustand] -- httpOnly session cookie --> R[Route handlers<br/>app/api/*]
  R --> A[auth.ts<br/>hashed session tokens]
  R --> V[validation.ts<br/>zod contracts]
  R --> L[rate-limit.ts<br/>Mongo fixed-window]
  R --> E[evaluator<br/>deterministic + AI]
  R --> P[paper-generator]
  E & P --> AI[lib/ai<br/>provider fallback + JSON schema check]
  AI --> G[Gemini]
  AI --> O[OpenRouter]
  R --> D[(MongoDB via Prisma)]
```

Every route is wrapped by `route()` in `lib/http.ts`: request id, one structured JSON log line per request, and uniform errors that never leak internals.

## Security model

ExamAce takes untrusted input from three places — the browser, uploaded photos, and the AI's own output — and treats all three as hostile.

| Threat | Mitigation | Where |
|---|---|---|
| Reading another student's history by typing their e-mail | Identity = session cookie (256-bit random, stored as SHA-256). E-mail is a contact field only | `lib/auth.ts`, `app/api/session` |
| Guessing exam ids (IDOR) | Every handler re-checks `session.studentId === student.id` and returns 404 otherwise | all `app/api/*` |
| Peeking at answers mid-exam | Answer key + solutions are stripped from every response until the exam is finished | `lib/exam.ts → toClientQuestion` |
| Answering after time is up | Server-side deadline (duration + 2 min grace); question must belong to the exam | `app/api/submit-answer` |
| "Award full marks" written on the answer sheet | System prompt treats the image as data, AI output schema-validated, marks clamped to `[0, max]` | `lib/evaluator` |
| Re-grading to farm AI cost / race conditions | Evaluation is idempotent with an atomic `active → completed` claim; unique `(sessionId, questionId)` index | `app/api/evaluate`, `schema.prisma` |
| API-key theft / settings takeover | Secrets live only in env vars; admin status page is read-only behind `ADMIN_TOKEN` (timing-safe compare) | `lib/env.ts`, `app/api/settings` |
| Abuse of the free AI quota | Per-student + global daily paper caps, per-IP signup limit | `lib/rate-limit.ts` |
| HTML injection in e-mail reports | Every interpolated value escaped; one e-mail per exam, daily cap | `app/api/send-results` |
| Oversized / malicious uploads | JPEG/PNG/WebP only, ≤ 2 MB, text ≤ 5,000 chars | `lib/validation.ts` |

## AI design

- **Provider fallback** — Gemini first, OpenRouter second. A provider "fails" if it errors, times out (`AbortController`), *or* returns JSON that doesn't match the zod schema.
- **Model is config, not code** — `GEMINI_MODEL` defaults to `gemini-flash-latest`, an alias that tracks Google's current Flash model, so a retired model id can't take the app down.
- **Cost-aware** — sections run with a concurrency cap of 3, written answers with a cap of 4, inside Vercel's 60 s limit; each AI call logs provider, latency and outcome.

## Data model

`Student` · `AuthSession` · `ExamSession` · `Question` · `StudentAnswer` · `ExamResult` · `RateLimit` — enums for mode / status / question type / difficulty, native JSON for options and breakdowns, compound unique on answers, indexes on every foreign key. See [`prisma/schema.prisma`](prisma/schema.prisma).

## Tests

```bash
npm test                  # 42 unit + route tests (scoring, secrecy, IDOR, idempotency, injection, admin auth)
npm run test:integration  # real in-memory MongoDB replica set: full API flow + v1 → v2 data migration
```

CI (GitHub Actions) runs lint → typecheck → unit → integration → production build on every push and PR.

## Run it locally

```bash
npm install
cp .env.example .env.local     # set DATABASE_URL + GEMINI_API_KEY
npx prisma db push             # create collections + indexes
npm run dev                    # http://localhost:3000
```

Without any AI key the app still works: papers come from the built-in question bank and objective questions are graded normally.

### Free AI keys

| Provider | Free tier | Use for |
|---|---|---|
| **Google AI Studio** → [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Free tier, no card; per-project limits shown in AI Studio | Primary — text + handwriting (vision) |
| **OpenRouter** → [openrouter.ai/keys](https://openrouter.ai/keys) | `:free` models: ~20 req/min, 50 req/day (1,000/day after a one-time $10 credit) | Fallback — set `OPENROUTER_MODEL` to a vision-capable `:free` model |

## Deploy (free)

1. **MongoDB Atlas** M0 cluster → copy the connection string into `DATABASE_URL`.
2. **Vercel** → import the repo, add the env vars from `.env.example`, deploy.
3. Upgrading a v1 database: `DRY_RUN=1 node scripts/migrate-legacy-data.mjs` (report only), then without `DRY_RUN`, then `npx prisma db push`. The script is idempotent and covered by `tests/integration/legacy-migration.test.ts`.

## Trade-offs & next steps

- Answer photos are stored inline (base64, ≤ 2 MB) to keep the stack to one free service; next step is object storage (S3/R2) with signed URLs.
- Rate limits use MongoDB counters to avoid adding Redis; at higher traffic swap `lib/rate-limit.ts` for Upstash.
- Sessions are device-bound (no password). Adding Google sign-in would let students see their history across devices.
- Grading runs inside the request; a queue (Inngest / QStash) with progress over SSE would remove the 60 s ceiling for very long papers.

---

MIT © Jateen Yadav
