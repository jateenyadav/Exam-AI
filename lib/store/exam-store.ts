import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ExamMode } from "@/lib/syllabus";

export interface ExamQuestion {
  id: string;
  questionNumber: number;
  section: string;
  type: string;
  questionText: string;
  options: string[] | null;
  marks: number;
  negativeMarks: number;
  chapterName: string;
  difficulty: string;
  hasSubParts: boolean;
  subParts: Array<{ questionText: string; correctAnswer: string; marks: number }> | null;
}

export type QuestionStatus = "not_visited" | "visited" | "answered" | "marked_for_review" | "answered_and_marked";

interface ExamSetupState {
  mode: ExamMode | null;
  subject: string | null;
  selectedChapters: string[];
  studentName: string;
  studentEmail: string;
  parentEmail: string;
}

interface ExamActiveState {
  sessionId: string | null;
  questions: ExamQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, string | string[]>;
  answerImages: Record<string, string>;
  questionStatuses: Record<string, QuestionStatus>;
  timeRemaining: number;
  totalTime: number;
  violationCount: number;
  isFullscreen: boolean;
  isSubmitted: boolean;
  startTime: number | null;
  isCameraActive: boolean;
}

interface ExamStore extends ExamSetupState, ExamActiveState {
  setMode: (mode: ExamMode) => void;
  setSubject: (subject: string) => void;
  setChapters: (chapters: string[]) => void;
  toggleChapter: (chapter: string) => void;
  setStudentInfo: (name: string, email: string, parentEmail?: string) => void;
  initExam: (sessionId: string, questions: ExamQuestion[], totalTime: number) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setAnswer: (questionId: string, answer: string | string[]) => void;
  setAnswerImage: (questionId: string, imageData: string) => void;
  clearAnswer: (questionId: string) => void;
  markForReview: (questionId: string) => void;
  decrementTimer: () => void;
  addViolation: () => void;
  setFullscreen: (val: boolean) => void;
  setCameraActive: (val: boolean) => void;
  submitExam: () => void;
  resetExam: () => void;
  getSectionQuestions: (sectionCode: string) => ExamQuestion[];
  getUniquesSections: () => string[];
}

export const useExamStore = create<ExamStore>()(
  persist(
    (set, get) => ({
      // Setup state
      mode: null,
      subject: null,
      selectedChapters: [],
      studentName: "",
      studentEmail: "",
      parentEmail: "",

      // Active state
      sessionId: null,
      questions: [],
      currentQuestionIndex: 0,
      answers: {},
      answerImages: {},
      questionStatuses: {},
      timeRemaining: 0,
      totalTime: 0,
      violationCount: 0,
      isFullscreen: false,
      isSubmitted: false,
      startTime: null,
      isCameraActive: false,

      setMode: (mode) => set({ mode, subject: null, selectedChapters: [] }),
      setSubject: (subject) => set({ subject, selectedChapters: [] }),
      setChapters: (chapters) => set({ selectedChapters: chapters }),
      toggleChapter: (chapter) =>
        set((state) => ({
          selectedChapters: state.selectedChapters.includes(chapter)
            ? state.selectedChapters.filter((c) => c !== chapter)
            : [...state.selectedChapters, chapter],
        })),
      setStudentInfo: (name, email, parentEmail = "") =>
        set({ studentName: name, studentEmail: email, parentEmail }),

      initExam: (sessionId, questions, totalTime) => {
        const statuses: Record<string, QuestionStatus> = {};
        questions.forEach((q) => {
          statuses[q.id] = "not_visited";
        });
        if (questions.length > 0) {
          statuses[questions[0].id] = "visited";
        }
        set({
          sessionId,
          questions,
          totalTime,
          timeRemaining: totalTime,
          currentQuestionIndex: 0,
          answers: {},
          answerImages: {},
          questionStatuses: statuses,
          violationCount: 0,
          isSubmitted: false,
          startTime: Date.now(),
        });
      },

      goToQuestion: (index) => {
        const { questions, questionStatuses } = get();
        if (index >= 0 && index < questions.length) {
          const q = questions[index];
          const currentStatus = questionStatuses[q.id];
          let newStatus = currentStatus;
          if (currentStatus === "not_visited") {
            newStatus = "visited";
          }
          set({
            currentQuestionIndex: index,
            questionStatuses: { ...questionStatuses, [q.id]: newStatus },
          });
        }
      },

      nextQuestion: () => {
        const { currentQuestionIndex, questions } = get();
        if (currentQuestionIndex < questions.length - 1) {
          get().goToQuestion(currentQuestionIndex + 1);
        }
      },

      prevQuestion: () => {
        const { currentQuestionIndex } = get();
        if (currentQuestionIndex > 0) {
          get().goToQuestion(currentQuestionIndex - 1);
        }
      },

      setAnswer: (questionId, answer) => {
        const { answers, questionStatuses } = get();
        const currentStatus = questionStatuses[questionId];
        const newStatus =
          currentStatus === "marked_for_review" || currentStatus === "answered_and_marked"
            ? "answered_and_marked"
            : "answered";
        set({
          answers: { ...answers, [questionId]: answer },
          questionStatuses: { ...questionStatuses, [questionId]: newStatus },
        });
      },

      setAnswerImage: (questionId, imageData) => {
        const { answerImages, questionStatuses } = get();
        const currentStatus = questionStatuses[questionId];
        const newStatus =
          currentStatus === "marked_for_review" || currentStatus === "answered_and_marked"
            ? "answered_and_marked"
            : "answered";
        set({
          answerImages: { ...answerImages, [questionId]: imageData },
          questionStatuses: { ...questionStatuses, [questionId]: newStatus },
        });
      },

      clearAnswer: (questionId) => {
        const { answers, answerImages, questionStatuses } = get();
        const newAnswers = { ...answers };
        delete newAnswers[questionId];
        const newImages = { ...answerImages };
        delete newImages[questionId];
        set({
          answers: newAnswers,
          answerImages: newImages,
          questionStatuses: { ...questionStatuses, [questionId]: "visited" },
        });
      },

      markForReview: (questionId) => {
        const { questionStatuses, answers } = get();
        const hasAnswer = answers[questionId] !== undefined;
        set({
          questionStatuses: {
            ...questionStatuses,
            [questionId]: hasAnswer ? "answered_and_marked" : "marked_for_review",
          },
        });
      },

      decrementTimer: () => {
        const { timeRemaining } = get();
        if (timeRemaining > 0) {
          set({ timeRemaining: timeRemaining - 1 });
        }
      },

      addViolation: () =>
        set((state) => ({ violationCount: state.violationCount + 1 })),

      setFullscreen: (val) => set({ isFullscreen: val }),
      setCameraActive: (val) => set({ isCameraActive: val }),
      submitExam: () => set({ isSubmitted: true }),

      resetExam: () =>
        set({
          mode: null,
          subject: null,
          selectedChapters: [],
          studentName: "",
          studentEmail: "",
          parentEmail: "",
          sessionId: null,
          questions: [],
          currentQuestionIndex: 0,
          answers: {},
          answerImages: {},
          questionStatuses: {},
          timeRemaining: 0,
          totalTime: 0,
          violationCount: 0,
          isFullscreen: false,
          isSubmitted: false,
          startTime: null,
          isCameraActive: false,
        }),

      getSectionQuestions: (sectionCode) => {
        return get().questions.filter((q) => q.section === sectionCode);
      },

      getUniquesSections: () => {
        const sections = get().questions.map((q) => q.section);
        return Array.from(new Set(sections));
      },
    }),
    {
      name: "examace-exam-store",
      partialize: (state) => ({
        sessionId: state.sessionId,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        questionStatuses: state.questionStatuses,
        timeRemaining: state.timeRemaining,
        totalTime: state.totalTime,
        violationCount: state.violationCount,
        isSubmitted: state.isSubmitted,
        startTime: state.startTime,
        studentName: state.studentName,
        studentEmail: state.studentEmail,
      }),
    }
  )
);
