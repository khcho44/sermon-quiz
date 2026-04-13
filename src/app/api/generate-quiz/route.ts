import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/claude";
import { QuizType } from "@/lib/types";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      transcript,
      quizTypes,
      questionCount = 10,
      language = "ko",
    }: {
      transcript: string;
      quizTypes: QuizType[];
      questionCount: number;
      language: string;
    } = body;

    if (!transcript || transcript.trim().length < 100) {
      return NextResponse.json(
        { error: "퀴즈를 생성하기에 내용이 너무 짧습니다." },
        { status: 400 }
      );
    }

    if (!quizTypes || quizTypes.length === 0) {
      return NextResponse.json(
        { error: "퀴즈 유형을 하나 이상 선택해주세요." },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Anthropic API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const quizSet = await generateQuiz(
      transcript,
      quizTypes,
      questionCount,
      language
    );

    return NextResponse.json(quizSet);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { error: `퀴즈 생성 실패: ${message}` },
      { status: 500 }
    );
  }
}
