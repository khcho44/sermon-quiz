import Anthropic from "@anthropic-ai/sdk";
import { QuizSet, QuizType } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  multiple_choice: "객관식 (4지선다)",
  true_false: "O/X 퀴즈",
  fill_blank: "빈칸 채우기",
  short_answer: "단답형",
  discussion: "토론/묵상 질문",
};

const QUIZ_SCHEMAS: Record<QuizType, string> = {
  multiple_choice: `{
  "type": "multiple_choice",
  "question": "질문 내용",
  "options": ["①번 선택지", "②번 선택지", "③번 선택지", "④번 선택지"],
  "answer": "정답 선택지 (예: ①번 선택지)",
  "explanation": "정답 해설"
}`,
  true_false: `{
  "type": "true_false",
  "question": "참 또는 거짓으로 답할 수 있는 질문",
  "answer": true,
  "explanation": "정답 해설"
}`,
  fill_blank: `{
  "type": "fill_blank",
  "question": "빈칸(_____)이 포함된 문장",
  "answer": "빈칸에 들어갈 정답",
  "explanation": "정답 해설"
}`,
  short_answer: `{
  "type": "short_answer",
  "question": "설교 내용에 관한 질문",
  "answer": "모범 답안"
}`,
  discussion: `{
  "type": "discussion",
  "question": "깊이 생각하고 나눌 수 있는 질문",
  "guideline": "토론 가이드라인 또는 묵상 포인트"
}`,
};

export async function generateQuiz(
  transcript: string,
  quizTypes: QuizType[],
  questionCount: number,
  language: string = "ko"
): Promise<QuizSet> {
  const typeDescriptions = quizTypes
    .map((t) => `- ${QUIZ_TYPE_LABELS[t]}: ${QUIZ_SCHEMAS[t]}`)
    .join("\n\n");

  const langInstruction =
    language === "ko"
      ? "모든 질문과 답변은 한국어로 작성해주세요."
      : "Write all questions and answers in English.";

  const systemPrompt = `당신은 설교 내용을 분석하여 교육용 퀴즈를 생성하는 전문가입니다.
설교 원고를 바탕으로 신앙적으로 의미 있고 교육적인 퀴즈를 만들어야 합니다.
${langInstruction}

반드시 다음 JSON 형식으로만 응답하세요:
{
  "title": "설교 제목 또는 주제",
  "summary": "설교 내용 2-3문장 요약",
  "questions": [... 퀴즈 배열 ...]
}`;

  const userPrompt = `다음 설교 내용을 분석하여 총 ${questionCount}개의 퀴즈를 생성해주세요.

퀴즈 유형별 스키마:
${typeDescriptions}

퀴즈는 다음 유형들을 골고루 포함해야 합니다: ${quizTypes.map((t) => QUIZ_TYPE_LABELS[t]).join(", ")}

설교 내용:
"""
${transcript.substring(0, 8000)}
"""

${questionCount}개의 다양한 퀴즈를 JSON 배열로 생성해주세요. 핵심 신학적 내용, 성경 구절, 적용점을 중심으로 만들어주세요.`;

  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinking: { type: "adaptive" } as any,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const response = await stream.finalMessage();

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude에서 응답을 받지 못했습니다.");
  }

  // Extract JSON from the response
  const text = textBlock.text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("응답에서 JSON을 파싱할 수 없습니다.");
  }

  try {
    const quizSet = JSON.parse(jsonMatch[0]) as QuizSet;
    return quizSet;
  } catch {
    throw new Error("퀴즈 JSON 파싱에 실패했습니다.");
  }
}
