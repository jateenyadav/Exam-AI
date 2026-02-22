# ExamAce - AI-Powered Exam Practice Platform

ExamAce is a full-stack AI-powered exam practice web application for **CBSE** and **JEE** students. It generates exam papers using AI, evaluates answers (including handwritten ones via camera), and provides detailed performance analytics.

## Features

- **Multi-Exam Support**: Class 11 CBSE, Class 12 CBSE, JEE Mains, JEE Advanced
- **AI Paper Generation**: Questions generated using Google Gemini / OpenRouter matching exact exam patterns
- **Camera-Based Answer Submission**: Photograph handwritten answers for AI evaluation
- **Anti-Cheating System**: Fullscreen mode, tab-switch detection, keyboard shortcut blocking
- **Timed Exam Environment**: Countdown timer with warnings at 30, 15, and 5 minutes
- **AI Evaluation**: Written answers evaluated by Gemini Vision, MCQs auto-graded
- **Detailed Analytics**: Section-wise and chapter-wise performance breakdown
- **Email Reports**: Send detailed HTML result reports via email
- **Progress Dashboard**: Track exam history and performance over time
- **Dark Mode**: Full dark mode support
- **Mobile Responsive**: Works on phones and tablets (camera for answer capture)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **AI**: Google Gemini API (primary) + OpenRouter API (fallback)
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Email**: Nodemailer

## Prerequisites

- Node.js 18+ and npm
- A Google Gemini API key (or OpenRouter API key)

## Getting Started

### 1. Clone and Install

```bash
cd examace
npm install
```

### 2. Environment Variables

Copy the `.env` file and fill in your API keys:

```
DATABASE_URL="mongodb+srv://user:password@cluster.mongodb.net/examace"
GEMINI_API_KEY="your-gemini-api-key"
OPENROUTER_API_KEY="your-openrouter-api-key"
EMAIL_FROM="noreply@examace.com"
EMAIL_SMTP_HOST="smtp.gmail.com"
EMAIL_SMTP_PORT="587"
EMAIL_SMTP_USER="your-email@gmail.com"
EMAIL_SMTP_PASS="your-app-password"
NEXTAUTH_SECRET="generate-a-random-string"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

### 3. Get API Keys

**Google Gemini API Key:**
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy and paste into `GEMINI_API_KEY`

**OpenRouter API Key (fallback):**
1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Create an account and generate an API key
3. Copy and paste into `OPENROUTER_API_KEY`

### 4. Database Setup

```bash
npx prisma generate
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage Flow

1. **Home Page** → Click "Start Practice Exam"
2. **Step 1** → Select exam mode (Class 11/12 CBSE, JEE Mains/Advanced)
3. **Step 2** → Select subject
4. **Step 3** → Select chapters to include
5. **Step 4** → Enter student name and email
6. **Exam** → Answer questions within the time limit
   - MCQs: Click options
   - Written: Photograph handwritten answers or type
   - Use navigation panel to jump between questions
7. **Results** → View detailed AI-evaluated results
8. **Dashboard** → Track progress over multiple exams

## Exam Patterns Supported

| Exam | Sections | Total Marks | Duration |
|------|----------|-------------|----------|
| CBSE Physics/Chemistry | MCQ + Short + Case-Based + Long | 70 | 3 hours |
| CBSE Mathematics | MCQ + Short + Long + Case-Based | 80 | 3 hours |
| CBSE English | Reading + Writing + Grammar + Literature | 80 | 3 hours |
| JEE Mains (per subject) | MCQ + Integer | 100 | 1 hour |
| JEE Mains (Full Mock) | 3 subjects | 300 | 3 hours |
| JEE Advanced (per subject) | Single + Multiple Correct + Integer | 60 | 1 hour |

## Project Structure

```
examace/
├── app/
│   ├── api/              # API routes
│   │   ├── evaluate/     # Answer evaluation
│   │   ├── exam-session/ # Session management
│   │   ├── generate-paper/ # AI paper generation
│   │   ├── send-results/ # Email results
│   │   ├── student/      # Student CRUD
│   │   └── submit-answer/ # Answer submission
│   ├── dashboard/        # Student dashboard
│   ├── exam/             # Exam interface
│   ├── results/          # Results page
│   ├── setup/            # Exam setup wizard
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── exam/             # Exam-specific components
│   ├── ui/               # Shadcn/UI components
│   └── theme-provider.tsx
├── lib/
│   ├── ai/               # Gemini + OpenRouter integration
│   ├── evaluator/        # Answer evaluation logic
│   ├── paper-generator/  # Paper generation logic
│   ├── store/            # Zustand state management
│   ├── syllabus/         # All syllabus data
│   ├── db.ts             # Prisma client
│   └── utils.ts          # Utilities
├── prisma/
│   └── schema.prisma     # Database schema
└── public/
    └── uploads/          # Answer images
```

## Deployment (Vercel)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add all environment variables
4. Deploy

## License

MIT
