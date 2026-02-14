export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0-based index
}

export interface CodingChallenge {
  id: string;
  title: string;
  description: string;
  starterCode: string; // The code provided to the user to start with
  solutionReference: string; // For the AI to validate against
  hint: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  status: 'locked' | 'unlocked' | 'completed';
  content?: string; // Markdown content
  imageUrl?: string; // Generated illustration
  videoUrl?: string; // Generated Veo video summary
  quiz?: QuizQuestion[];
  codingChallenges?: CodingChallenge[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  id: string; // Unique ID for the course
  topic: string;
  modules: Module[];
  currentModuleIndex: number;
  currentLessonIndex: number;
  createdAt: number;
}

export type AppState = 
  | 'INITIAL'       // User entering topic
  | 'CLARIFYING'    // AI asking questions
  | 'GENERATING'    // Generating roadmap
  | 'LEARNING'      // Dashboard view
  | 'CREATIVE'      // Image/Video tools
  | 'PROFILE';      // User's course list

export interface ClarificationState {
  questions: string[];
  answers: string[];
  currentQuestionIndex: number;
}

export interface CodeValidationResult {
  passed: boolean;
  feedback: string;
}