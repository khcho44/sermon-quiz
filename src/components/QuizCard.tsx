"use client";

import { useState } from "react";
import {
  QuizQuestion,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  FillBlankQuestion,
  ShortAnswerQuestion,
  DiscussionQuestion,
} from "@/lib/types";

interface QuizCardProps {
  question: QuizQuestion;
  index: number;
}

export default function QuizCard({ question, index }: QuizCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const typeLabel = {
    multiple_choice: "객관식",
    true_false: "O/X",
    fill_blank: "빈칸 채우기",
    short_answer: "단답형",
    discussion: "토론/묵상",
  }[question.type];

  const typeColor = {
    multiple_choice: "bg-blue-100 text-blue-700",
    true_false: "bg-green-100 text-green-700",
    fill_blank: "bg-yellow-100 text-yellow-700",
    short_answer: "bg-purple-100 text-purple-700",
    discussion: "bg-rose-100 text-rose-700",
  }[question.type];

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-400">Q{index + 1}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
            {typeLabel}
          </span>
        </div>
        <button
          onClick={() => setRevealed(!revealed)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {revealed ? "정답 숨기기" : "정답 보기"}
        </button>
      </div>

      {question.type === "multiple_choice" && (
        <MultipleChoice
          q={question as MultipleChoiceQuestion}
          revealed={revealed}
          selected={selectedOption}
          onSelect={setSelectedOption}
        />
      )}
      {question.type === "true_false" && (
        <TrueFalse
          q={question as TrueFalseQuestion}
          revealed={revealed}
          selected={selectedOption}
          onSelect={setSelectedOption}
        />
      )}
      {question.type === "fill_blank" && (
        <FillBlank q={question as FillBlankQuestion} revealed={revealed} />
      )}
      {question.type === "short_answer" && (
        <ShortAnswer q={question as ShortAnswerQuestion} revealed={revealed} />
      )}
      {question.type === "discussion" && (
        <Discussion q={question as DiscussionQuestion} />
      )}
    </div>
  );
}

function MultipleChoice({
  q,
  revealed,
  selected,
  onSelect,
}: {
  q: MultipleChoiceQuestion;
  revealed: boolean;
  selected: string | null;
  onSelect: (s: string) => void;
}) {
  return (
    <div>
      <p className="font-medium text-gray-800 mb-3">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isCorrect = opt === q.answer;
          const isSelected = opt === selected;
          let cls =
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ";
          if (revealed) {
            cls += isCorrect
              ? "border-green-500 bg-green-50 text-green-800 font-medium"
              : isSelected && !isCorrect
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-gray-200 text-gray-600";
          } else {
            cls += isSelected
              ? "border-blue-500 bg-blue-50 text-blue-800"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50";
          }
          return (
            <div key={i} className={cls} onClick={() => onSelect(opt)}>
              <span className="w-5 h-5 flex-shrink-0 rounded-full border border-current flex items-center justify-center text-xs">
                {["①", "②", "③", "④"][i]}
              </span>
              <span>{opt}</span>
            </div>
          );
        })}
      </div>
      {revealed && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          <span className="font-medium">해설:</span> {q.explanation}
        </div>
      )}
    </div>
  );
}

function TrueFalse({
  q,
  revealed,
  selected,
  onSelect,
}: {
  q: TrueFalseQuestion;
  revealed: boolean;
  selected: string | null;
  onSelect: (s: string) => void;
}) {
  return (
    <div>
      <p className="font-medium text-gray-800 mb-3">{q.question}</p>
      <div className="flex gap-3">
        {[
          { label: "O (참)", value: "true" },
          { label: "X (거짓)", value: "false" },
        ].map(({ label, value }) => {
          const isCorrect = String(q.answer) === value;
          const isSelected = selected === value;
          let cls =
            "flex-1 py-3 rounded-lg border text-sm font-medium cursor-pointer transition-colors text-center ";
          if (revealed) {
            cls += isCorrect
              ? "border-green-500 bg-green-50 text-green-700"
              : isSelected
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-gray-200 text-gray-400";
          } else {
            cls += isSelected
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50";
          }
          return (
            <div key={value} className={cls} onClick={() => onSelect(value)}>
              {label}
            </div>
          );
        })}
      </div>
      {revealed && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          <span className="font-medium">해설:</span> {q.explanation}
        </div>
      )}
    </div>
  );
}

function FillBlank({
  q,
  revealed,
}: {
  q: FillBlankQuestion;
  revealed: boolean;
}) {
  return (
    <div>
      <p className="font-medium text-gray-800 mb-3">
        {q.question.split("_____").map((part, i, arr) => (
          <span key={i}>
            {part}
            {i < arr.length - 1 && (
              <span
                className={`inline-block min-w-[80px] border-b-2 mx-1 text-center ${
                  revealed
                    ? "border-green-500 text-green-700 font-semibold"
                    : "border-gray-400"
                }`}
              >
                {revealed ? q.answer : ""}
              </span>
            )}
          </span>
        ))}
      </p>
      {revealed && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          <span className="font-medium">해설:</span> {q.explanation}
        </div>
      )}
    </div>
  );
}

function ShortAnswer({
  q,
  revealed,
}: {
  q: ShortAnswerQuestion;
  revealed: boolean;
}) {
  return (
    <div>
      <p className="font-medium text-gray-800 mb-3">{q.question}</p>
      {revealed && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <span className="font-medium">모범 답안:</span> {q.answer}
        </div>
      )}
    </div>
  );
}

function Discussion({ q }: { q: DiscussionQuestion }) {
  return (
    <div>
      <p className="font-medium text-gray-800 mb-3">{q.question}</p>
      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800">
        <span className="font-medium">가이드:</span> {q.guideline}
      </div>
    </div>
  );
}
