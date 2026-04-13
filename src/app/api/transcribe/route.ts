import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/mp4",
      "audio/m4a",
      "audio/ogg",
      "audio/webm",
      "video/mp4",
      "video/webm",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|webm|mp4|flac)$/i)) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다. MP3, WAV, M4A, OGG, WEBM, MP4 형식을 지원합니다." },
        { status: 400 }
      );
    }

    const maxSize = 25 * 1024 * 1024; // 25MB (Whisper limit)
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "파일 크기가 너무 큽니다. 최대 25MB까지 지원합니다." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "ko", // Korean first; Whisper auto-detects if wrong
      response_format: "text",
    });

    const transcript =
      typeof transcription === "string"
        ? transcription
        : (transcription as { text: string }).text;

    return NextResponse.json({
      transcript,
      source: "audio",
      filename: file.name,
      charCount: transcript.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { error: `음성 변환 실패: ${message}` },
      { status: 500 }
    );
  }
}
