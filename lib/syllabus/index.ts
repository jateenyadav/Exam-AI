export type ExamMode = "class11" | "class12" | "jee_mains" | "jee_advanced";

export type Subject = "physics" | "chemistry" | "mathematics" | "english" | "full_mock";

export interface Chapter {
  name: string;
  id: string;
}

export interface SubjectData {
  name: string;
  chapters: Chapter[];
}

export interface ModeData {
  label: string;
  description: string;
  subjects: Record<string, SubjectData>;
}

function toId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function chapters(names: string[]): Chapter[] {
  return names.map((name) => ({ name, id: toId(name) }));
}

const class11Physics = chapters([
  "Physical World",
  "Units and Measurements",
  "Motion in a Straight Line",
  "Motion in a Plane",
  "Laws of Motion",
  "Work Energy and Power",
  "System of Particles and Rotational Motion",
  "Gravitation",
  "Mechanical Properties of Solids",
  "Mechanical Properties of Fluids",
  "Thermal Properties of Matter",
  "Thermodynamics",
  "Kinetic Theory",
  "Oscillations",
  "Waves",
]);

const class11Chemistry = chapters([
  "Some Basic Concepts of Chemistry",
  "Structure of Atom",
  "Classification of Elements and Periodicity in Properties",
  "Chemical Bonding and Molecular Structure",
  "Thermodynamics",
  "Equilibrium",
  "Redox Reactions",
  "Organic Chemistry – Some Basic Principles and Techniques",
  "Hydrocarbons",
  "Environmental Chemistry",
]);

const class11Maths = chapters([
  "Sets",
  "Relations and Functions",
  "Trigonometric Functions",
  "Complex Numbers and Quadratic Equations",
  "Linear Inequalities",
  "Permutations and Combinations",
  "Binomial Theorem",
  "Sequences and Series",
  "Straight Lines",
  "Conic Sections",
  "Introduction to Three Dimensional Geometry",
  "Limits and Derivatives",
  "Statistics",
  "Probability",
]);

const class11English = chapters([
  "The Portrait of a Lady",
  "A Photograph",
  "We're Not Afraid to Die",
  "Discovering Tut: The Saga Continues",
  "The Laburnum Top",
  "Landscape of the Soul",
  "The Ailing Planet",
  "The Browning Version",
  "The Voice of the Rain",
  "Childhood",
  "The Adventure",
  "Silk Road",
  "Reading Comprehension",
  "Note Making and Summarizing",
  "Letter Writing",
  "Article Writing",
  "Poster and Notice Writing",
  "Grammar and Transformation",
]);

const class12Physics = chapters([
  "Electric Charges and Fields",
  "Electrostatic Potential and Capacitance",
  "Current Electricity",
  "Moving Charges and Magnetism",
  "Magnetism and Matter",
  "Electromagnetic Induction",
  "Alternating Current",
  "Electromagnetic Waves",
  "Ray Optics and Optical Instruments",
  "Wave Optics",
  "Dual Nature of Radiation and Matter",
  "Atoms",
  "Nuclei",
  "Semiconductor Electronics",
]);

const class12Chemistry = chapters([
  "Solutions",
  "Electrochemistry",
  "Chemical Kinetics",
  "d and f Block Elements",
  "Coordination Compounds",
  "Haloalkanes and Haloarenes",
  "Alcohols Phenols and Ethers",
  "Aldehydes Ketones and Carboxylic Acids",
  "Amines",
  "Biomolecules",
]);

const class12Maths = chapters([
  "Relations and Functions",
  "Inverse Trigonometric Functions",
  "Matrices",
  "Determinants",
  "Continuity and Differentiability",
  "Application of Derivatives",
  "Integrals",
  "Application of Integrals",
  "Differential Equations",
  "Vector Algebra",
  "Three Dimensional Geometry",
  "Linear Programming",
  "Probability",
]);

const class12English = chapters([
  "The Last Lesson",
  "Lost Spring",
  "Deep Water",
  "The Rattrap",
  "Indigo",
  "Poets and Pancakes",
  "The Interview",
  "Going Places",
  "My Mother at Sixty-Six",
  "Keeping Quiet",
  "A Thing of Beauty",
  "Aunt Jennifer's Tigers",
  "The Third Level",
  "The Tiger King",
  "The Enemy",
  "On the Face of It",
  "Evans Tries an O-Level",
  "Reading Comprehension",
  "Letter and Article Writing",
  "Report and Notice Writing",
  "Grammar and Transformation",
]);

const jeePhysics = chapters([
  "Physics and Measurement",
  "Kinematics",
  "Laws of Motion",
  "Work, Energy and Power",
  "Rotational Motion",
  "Gravitation",
  "Properties of Solids and Liquids",
  "Thermodynamics",
  "Kinetic Theory of Gases",
  "Oscillations and Waves",
  "Electrostatics",
  "Current Electricity",
  "Magnetic Effects of Current and Magnetism",
  "Electromagnetic Induction and Alternating Currents",
  "Electromagnetic Waves",
  "Optics",
  "Dual Nature of Matter and Radiation",
  "Atoms and Nuclei",
  "Electronic Devices",
  "Communication Systems",
  "Experimental Physics",
]);

const jeeChemistry = chapters([
  "Some Basic Concepts in Chemistry",
  "Atomic Structure",
  "Chemical Bonding and Molecular Structure",
  "Chemical Thermodynamics",
  "Chemical and Ionic Equilibrium",
  "Redox Reactions and Electrochemistry",
  "Chemical Kinetics",
  "States of Matter",
  "Solutions",
  "Surface Chemistry",
  "Classification of Elements and Periodicity",
  "Hydrogen",
  "s-Block Elements",
  "p-Block Elements",
  "d and f Block Elements",
  "Coordination Compounds",
  "General Organic Chemistry",
  "Hydrocarbons",
  "Organic Compounds Containing Halogens",
  "Organic Compounds Containing Oxygen",
  "Organic Compounds Containing Nitrogen",
  "Polymers",
  "Biomolecules",
  "Chemistry in Everyday Life",
  "Environmental Chemistry",
]);

const jeeMaths = chapters([
  "Sets, Relations and Functions",
  "Complex Numbers",
  "Quadratic Equations",
  "Matrices and Determinants",
  "Permutations and Combinations",
  "Binomial Theorem",
  "Sequences and Series",
  "Limits, Continuity and Differentiability",
  "Application of Derivatives",
  "Integral Calculus",
  "Differential Equations",
  "Coordinate Geometry",
  "Straight Lines and Pair of Straight Lines",
  "Circles and System of Circles",
  "Conic Sections",
  "Three Dimensional Geometry",
  "Vector Algebra",
  "Statistics and Probability",
  "Trigonometry",
  "Mathematical Reasoning",
  "Mathematical Induction",
]);

export const syllabusData: Record<ExamMode, ModeData> = {
  class11: {
    label: "Class 11th (CBSE)",
    description: "CBSE Class 11 Board Exam Pattern",
    subjects: {
      physics: { name: "Physics", chapters: class11Physics },
      chemistry: { name: "Chemistry", chapters: class11Chemistry },
      mathematics: { name: "Mathematics", chapters: class11Maths },
      english: { name: "English", chapters: class11English },
    },
  },
  class12: {
    label: "Class 12th (CBSE)",
    description: "CBSE Class 12 Board Exam Pattern",
    subjects: {
      physics: { name: "Physics", chapters: class12Physics },
      chemistry: { name: "Chemistry", chapters: class12Chemistry },
      mathematics: { name: "Mathematics", chapters: class12Maths },
      english: { name: "English", chapters: class12English },
    },
  },
  jee_mains: {
    label: "JEE Mains",
    description: "NTA JEE Mains Exam Pattern",
    subjects: {
      physics: { name: "Physics", chapters: jeePhysics },
      chemistry: { name: "Chemistry", chapters: jeeChemistry },
      mathematics: { name: "Mathematics", chapters: jeeMaths },
      full_mock: {
        name: "Full Mock Test (Physics + Chemistry + Mathematics)",
        chapters: [...jeePhysics, ...jeeChemistry, ...jeeMaths],
      },
    },
  },
  jee_advanced: {
    label: "JEE Advanced",
    description: "JEE Advanced Exam Pattern",
    subjects: {
      physics: { name: "Physics", chapters: jeePhysics },
      chemistry: { name: "Chemistry", chapters: jeeChemistry },
      mathematics: { name: "Mathematics", chapters: jeeMaths },
      full_mock: {
        name: "Full Mock Test (Physics + Chemistry + Mathematics)",
        chapters: [...jeePhysics, ...jeeChemistry, ...jeeMaths],
      },
    },
  },
};

export function getSubjectsForMode(mode: ExamMode): string[] {
  return Object.keys(syllabusData[mode].subjects);
}

export function getChaptersForSubject(
  mode: ExamMode,
  subject: string
): Chapter[] {
  return syllabusData[mode].subjects[subject]?.chapters ?? [];
}

export interface ExamPattern {
  sections: SectionPattern[];
  totalMarks: number;
  duration: number; // seconds
}

export interface SectionPattern {
  name: string;
  code: string;
  questionCount: number;
  marksPerQuestion: number;
  type: string;
  negativeMarks: number;
  hasInternalChoice: boolean;
  hasSubParts: boolean;
  attemptRequired?: number;
}

export function getExamPattern(mode: ExamMode, subject: string): ExamPattern {
  if (mode === "class11" || mode === "class12") {
    if (subject === "english") {
      return {
        totalMarks: 80,
        duration: 10800,
        sections: [
          { name: "Reading Comprehension", code: "section_a", questionCount: 2, marksPerQuestion: 10, type: "long_answer", negativeMarks: 0, hasInternalChoice: false, hasSubParts: true },
          { name: "Writing Skills", code: "section_b", questionCount: 2, marksPerQuestion: 10, type: "long_answer", negativeMarks: 0, hasInternalChoice: true, hasSubParts: false },
          { name: "Grammar", code: "section_c", questionCount: 10, marksPerQuestion: 1, type: "short_answer", negativeMarks: 0, hasInternalChoice: false, hasSubParts: false },
          { name: "Literature – Short Answer", code: "section_d", questionCount: 6, marksPerQuestion: 3, type: "short_answer", negativeMarks: 0, hasInternalChoice: true, hasSubParts: false },
          { name: "Literature – Long Answer", code: "section_e", questionCount: 2, marksPerQuestion: 6, type: "long_answer", negativeMarks: 0, hasInternalChoice: true, hasSubParts: false },
        ],
      };
    }
    if (subject === "mathematics") {
      return {
        totalMarks: 80,
        duration: 10800,
        sections: [
          { name: "Section A – MCQ & Assertion-Reason", code: "section_a", questionCount: 18, marksPerQuestion: 1, type: "mcq", negativeMarks: 0, hasInternalChoice: false, hasSubParts: false },
          { name: "Section B – Very Short Answer", code: "section_b", questionCount: 5, marksPerQuestion: 2, type: "short_answer", negativeMarks: 0, hasInternalChoice: false, hasSubParts: false },
          { name: "Section C – Short Answer", code: "section_c", questionCount: 6, marksPerQuestion: 3, type: "short_answer", negativeMarks: 0, hasInternalChoice: false, hasSubParts: false },
          { name: "Section D – Long Answer", code: "section_d", questionCount: 4, marksPerQuestion: 5, type: "long_answer", negativeMarks: 0, hasInternalChoice: true, hasSubParts: false },
          { name: "Section E – Case-Based", code: "section_e", questionCount: 3, marksPerQuestion: 4, type: "case_based", negativeMarks: 0, hasInternalChoice: false, hasSubParts: true },
        ],
      };
    }
    // Physics / Chemistry
    return {
      totalMarks: 70,
      duration: 10800,
      sections: [
        { name: "Section A – MCQ", code: "section_a", questionCount: 16, marksPerQuestion: 1, type: "mcq", negativeMarks: 0, hasInternalChoice: false, hasSubParts: false },
        { name: "Section B – Very Short Answer", code: "section_b", questionCount: 5, marksPerQuestion: 2, type: "short_answer", negativeMarks: 0, hasInternalChoice: false, hasSubParts: false },
        { name: "Section C – Short Answer", code: "section_c", questionCount: 7, marksPerQuestion: 3, type: "short_answer", negativeMarks: 0, hasInternalChoice: false, hasSubParts: false },
        { name: "Section D – Case-Based", code: "section_d", questionCount: 2, marksPerQuestion: 4, type: "case_based", negativeMarks: 0, hasInternalChoice: false, hasSubParts: true },
        { name: "Section E – Long Answer", code: "section_e", questionCount: 3, marksPerQuestion: 5, type: "long_answer", negativeMarks: 0, hasInternalChoice: true, hasSubParts: false },
      ],
    };
  }

  if (mode === "jee_mains") {
    const singleSubjectSections: SectionPattern[] = [
      { name: "MCQ (Single Correct)", code: "section_a", questionCount: 20, marksPerQuestion: 4, type: "mcq", negativeMarks: 1, hasInternalChoice: false, hasSubParts: false },
      { name: "Integer Type", code: "section_b", questionCount: 10, marksPerQuestion: 4, type: "integer", negativeMarks: 0, hasInternalChoice: false, hasSubParts: false, attemptRequired: 5 },
    ];

    if (subject === "full_mock") {
      return {
        totalMarks: 300,
        duration: 10800,
        sections: [
          { ...singleSubjectSections[0], name: "Physics – MCQ", code: "physics_a" },
          { ...singleSubjectSections[1], name: "Physics – Integer", code: "physics_b" },
          { ...singleSubjectSections[0], name: "Chemistry – MCQ", code: "chemistry_a" },
          { ...singleSubjectSections[1], name: "Chemistry – Integer", code: "chemistry_b" },
          { ...singleSubjectSections[0], name: "Mathematics – MCQ", code: "maths_a" },
          { ...singleSubjectSections[1], name: "Mathematics – Integer", code: "maths_b" },
        ],
      };
    }

    return {
      totalMarks: 100,
      duration: 3600,
      sections: singleSubjectSections,
    };
  }

  // JEE Advanced
  const advancedSections: SectionPattern[] = [
    { name: "Single Correct", code: "section_a", questionCount: 6, marksPerQuestion: 3, type: "mcq", negativeMarks: 1, hasInternalChoice: false, hasSubParts: false },
    { name: "Multiple Correct", code: "section_b", questionCount: 6, marksPerQuestion: 4, type: "multiple_correct", negativeMarks: 2, hasInternalChoice: false, hasSubParts: false },
    { name: "Integer Type", code: "section_c", questionCount: 6, marksPerQuestion: 3, type: "integer", negativeMarks: 0, hasInternalChoice: false, hasSubParts: false },
  ];

  if (subject === "full_mock") {
    return {
      totalMarks: 180,
      duration: 10800,
      sections: [
        { ...advancedSections[0], name: "Physics – Single Correct", code: "phy_a" },
        { ...advancedSections[1], name: "Physics – Multiple Correct", code: "phy_b" },
        { ...advancedSections[2], name: "Physics – Integer", code: "phy_c" },
        { ...advancedSections[0], name: "Chemistry – Single Correct", code: "chem_a" },
        { ...advancedSections[1], name: "Chemistry – Multiple Correct", code: "chem_b" },
        { ...advancedSections[2], name: "Chemistry – Integer", code: "chem_c" },
        { ...advancedSections[0], name: "Mathematics – Single Correct", code: "math_a" },
        { ...advancedSections[1], name: "Mathematics – Multiple Correct", code: "math_b" },
        { ...advancedSections[2], name: "Mathematics – Integer", code: "math_c" },
      ],
    };
  }

  return {
    totalMarks: 60,
    duration: 3600,
    sections: advancedSections,
  };
}
