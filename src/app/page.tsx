"use client";

import { useState, useRef } from "react";
import { QuizType, QuizSet } from "@/lib/types";
import QuizCard from "@/components/QuizCard";

type Step = "input" | "transcript" | "settings" | "quiz";
type InputMode = "youtube" | "audio";

const QUIZ_TYPES: { value: QuizType; label: string; desc: string; emoji: string }[] = [
  { value: "multiple_choice", label: "객관식", desc: "4지선다 문제", emoji: "📝" },
  { value: "true_false", label: "O/X 퀴즈", desc: "참·거짓 판별", emoji: "✅" },
  { value: "fill_blank", label: "빈칸 채우기", desc: "핵심 단어 빈칸", emoji: "✏️" },
  { value: "short_answer", label: "단답형", desc: "짧은 답변 문제", emoji: "💬" },
  { value: "discussion", label: "토론/묵상", desc: "깊이 생각하기", emoji: "🙏" },
];

export default function HomePage() {
  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<QuizType[]>([
    "multiple_choice",
    "true_false",
    "fill_blank",
  ]);
  const [questionCount, setQuestionCount] = useState(10);
  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExtractTranscript = async () => {
    setError("");
    setLoading(true);

    try {
      if (inputMode === "youtube") {
        setLoadingMsg("유튜브 자막을 가져오는 중...");
        const res = await fetch("/api/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTranscript(data.transcript);
      } else {
        if (!audioFile) throw new Error("파일을 선택해주세요.");
        setLoadingMsg("음성을 텍스트로 변환하는 중... (최대 1분 소요)");
        const formData = new FormData();
        formData.append("file", audioFile);
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTranscript(data.transcript);
      }
      setStep("transcript");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const handleGenerateQuiz = async () => {
    setError("");
    setLoading(true);
    setLoadingMsg("AI가 퀴즈를 생성하는 중...");

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          quizTypes: selectedTypes,
          questionCount,
          language: "ko",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuizSet(data);
      setStep("quiz");
    } catch (err) {
      setError(err instanceof Error ? err.message : "퀴즈 생성에 실패했습니다.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const handleReset = () => {
    setStep("input");
    setTranscript("");
    setQuizSet(null);
    setYoutubeUrl("");
    setAudioFile(null);
    setError("");
  };

  const toggleQuizType = (type: QuizType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900">설교 퀴즈 생성기</h1>
              <p className="text-xs text-gray-500">AI가 설교 내용으로 퀴즈를 만들어드립니다</p>
            </div>
          </div>
          {step !== "input" && (
            <button onClick={handleReset} className="btn-secondary text-sm">
              처음으로
            </button>
          )}
        </div>
      </header>

      {/* Steps indicator */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-8">
          {[
            { key: "input", label: "입력" },
            { key: "transcript", label: "내용 확인" },
            { key: "settings", label: "설정" },
            { key: "quiz", label: "퀴즈" },
          ].map((s, i, arr) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 text-sm font-medium ${
                  step === s.key
                    ? "text-blue-600"
                    : ["input", "transcript", "settings", "quiz"].indexOf(step) > i
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s.key
                      ? "bg-blue-600 text-white"
                      : ["input", "transcript", "settings", "quiz"].indexOf(step) > i
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {["input", "transcript", "settings", "quiz"].indexOf(step) > i ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  ["input", "transcript", "settings", "quiz"].indexOf(step) > i
                    ? "bg-green-400"
                    : "bg-gray-200"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="card mb-4 text-center py-10">
            <div className="inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-600 font-medium">{loadingMsg}</p>
          </div>
        )}

        {/* Step 1: Input */}
        {step === "input" && !loading && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📥 설교 내용 입력</h2>

            {/* Mode toggle */}
            <div className="flex rounded-lg border border-gray-200 p-1 mb-6 bg-gray-50">
              <button
                onClick={() => setInputMode("youtube")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  inputMode === "youtube"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🎬 유튜브 링크
              </button>
              <button
                onClick={() => setInputMode("audio")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  inputMode === "audio"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🎤 음성 파일
              </button>
            </div>

            {inputMode === "youtube" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  유튜브 URL
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="input-base mb-2"
                  onKeyDown={(e) => e.key === "Enter" && handleExtractTranscript()}
                />
                <p className="text-xs text-gray-400 mb-4">
                  자막이 있는 유튜브 영상의 링크를 입력하세요 (자동 생성 자막 포함)
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  음성/영상 파일 업로드
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    audioFile
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/mp4,video/webm"
                    className="hidden"
                    onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                  />
                  {audioFile ? (
                    <div>
                      <span className="text-3xl">🎵</span>
                      <p className="mt-2 text-sm font-medium text-blue-700">{audioFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl">📂</span>
                      <p className="mt-2 text-sm font-medium text-gray-600">
                        파일을 클릭하여 선택
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        MP3, WAV, M4A, OGG, MP4 지원 · 최대 25MB
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  OpenAI Whisper로 음성을 텍스트로 변환합니다
                </p>
              </div>
            )}

            <button
              onClick={handleExtractTranscript}
              disabled={
                loading ||
                (inputMode === "youtube" ? !youtubeUrl.trim() : !audioFile)
              }
              className="btn-primary w-full mt-4"
            >
              내용 추출하기 →
            </button>

            {/* Also allow manual text input */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setTranscript("");
                  setStep("transcript");
                }}
                className="btn-secondary w-full text-sm"
              >
                ✍️ 직접 텍스트 입력하기
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Transcript review */}
        {step === "transcript" && !loading && (
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-lg font-bold text-gray-800 mb-1">📄 내용 확인 및 편집</h2>
              <p className="text-sm text-gray-500 mb-4">
                추출된 내용을 확인하고 필요하면 수정하세요.
              </p>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="input-base min-h-[300px] resize-y font-mono text-sm leading-relaxed"
                placeholder="설교 내용을 직접 입력하거나 붙여넣기 하세요..."
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">
                  {transcript.length.toLocaleString()}자
                </p>
                {transcript.length > 8000 && (
                  <p className="text-xs text-amber-600">
                    ⚠️ 8,000자 이상은 일부 잘릴 수 있습니다
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("input")} className="btn-secondary flex-1">
                ← 뒤로
              </button>
              <button
                onClick={() => setStep("settings")}
                disabled={transcript.trim().length < 100}
                className="btn-primary flex-1"
              >
                퀴즈 설정하기 →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {step === "settings" && !loading && (
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-lg font-bold text-gray-800 mb-4">⚙️ 퀴즈 설정</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  퀴즈 유형 선택 <span className="text-gray-400">(복수 선택 가능)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUIZ_TYPES.map((qt) => (
                    <button
                      key={qt.value}
                      onClick={() => toggleQuizType(qt.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                        selectedTypes.includes(qt.value)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-xl">{qt.emoji}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{qt.label}</div>
                        <div className="text-xs text-gray-500">{qt.desc}</div>
                      </div>
                      {selectedTypes.includes(qt.value) && (
                        <span className="ml-auto text-blue-500 text-lg">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문제 수: <span className="text-blue-600 font-bold">{questionCount}개</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={20}
                  step={1}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5개</span>
                  <span>20개</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("transcript")} className="btn-secondary flex-1">
                ← 뒤로
              </button>
              <button
                onClick={handleGenerateQuiz}
                disabled={selectedTypes.length === 0}
                className="btn-primary flex-1"
              >
                🤖 퀴즈 생성하기
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Quiz display */}
        {step === "quiz" && !loading && quizSet && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="card bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-1">{quizSet.title}</h2>
                  <p className="text-blue-100 text-sm leading-relaxed">{quizSet.summary}</p>
                </div>
                <span className="text-3xl ml-4">📖</span>
              </div>
              <div className="mt-4 flex gap-4 text-sm text-blue-100">
                <span>총 {quizSet.questions.length}문제</span>
                <span>•</span>
                <span>
                  {Array.from(new Set(quizSet.questions.map((q) => q.type))).length}가지 유형
                </span>
              </div>
            </div>

            {/* Quiz actions */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerateQuiz}
                className="btn-secondary flex-1 text-sm"
              >
                🔄 다시 생성
              </button>
              <button
                onClick={() => {
                  const text = quizSet.questions
                    .map(
                      (q, i) =>
                        `Q${i + 1}. [${q.type}] ${q.question}\n` +
                        ("answer" in q ? `정답: ${q.answer}\n` : "") +
                        ("explanation" in q ? `해설: ${q.explanation}\n` : "") +
                        ("guideline" in q ? `가이드: ${q.guideline}\n` : "")
                    )
                    .join("\n");
                  navigator.clipboard.writeText(
                    `${quizSet.title}\n\n${quizSet.summary}\n\n${text}`
                  );
                  alert("클립보드에 복사되었습니다!");
                }}
                className="btn-secondary flex-1 text-sm"
              >
                📋 텍스트 복사
              </button>
            </div>

            {/* Quiz questions */}
            <div className="space-y-3">
              {quizSet.questions.map((q, i) => (
                <QuizCard key={i} question={q} index={i} />
              ))}
            </div>

            <div className="text-center pt-4">
              <button onClick={handleReset} className="btn-secondary">
                새 설교로 퀴즈 만들기
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
