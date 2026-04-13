export type QuizType =
  | "multiple_choice"
  | "true_false"
  | "fill_blank"
  | "short_answer"
  | "discussion";

export interface MultipleChoiceQuestion {
  type: "multiple_choice";
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface TrueFalseQuestion {
  type: "true_false";
  question: string;
  answer: boolean;
  explanation: string;
}

export interface FillBlankQuestion {
  type: "fill_blank";
  question: string; // sentence with ___ for blank
  answer: string;
  explanation: string;
}

export interface ShortAnswerQuestion {
  type: "short_answer";
  question: string;
  answer: string;
}

export interface DiscussionQuestion {
  type: "discussion";
  question: string;
  guideline: string;
}

export type QuizQuestion =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | FillBlankQuestion
  | ShortAnswerQuestion
  | DiscussionQuestion;

export interface QuizSet {
  title: string;
  summary: string;
  questions: QuizQuestion[];
}

export interface TranscriptResult {
  transcript: string;
  source: "youtube" | "audio";
  title?: string;
}
