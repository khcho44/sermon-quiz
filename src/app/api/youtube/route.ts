import { NextRequest, NextResponse } from "next/server";
import * as ytModule from "youtube-transcript";
const { YoutubeTranscript } = ytModule as unknown as { YoutubeTranscript: { fetchTranscript: (id: string, opts?: { lang?: string }) => Promise<{ text: string; duration: number; offset: number }[]> } };

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
    }

    // Extract video ID from various YouTube URL formats
    const videoIdMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    );

    if (!videoIdMatch) {
      return NextResponse.json(
        { error: "유효한 YouTube URL이 아닙니다." },
        { status: 400 }
      );
    }

    const videoId = videoIdMatch[1];

    // Try Korean first, then English, then any available
    let transcriptItems = null;
    const langCodes = ["ko", "en", ""];

    for (const lang of langCodes) {
      try {
        if (lang) {
          transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
            lang,
          });
        } else {
          transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        }
        if (transcriptItems && transcriptItems.length > 0) break;
      } catch {
        continue;
      }
    }

    if (!transcriptItems || transcriptItems.length === 0) {
      return NextResponse.json(
        {
          error:
            "이 영상에서 자막을 가져올 수 없습니다. 자막이 없거나 비공개 영상일 수 있습니다.",
        },
        { status: 404 }
      );
    }

    const transcript = transcriptItems.map((item) => item.text).join(" ");

    return NextResponse.json({
      transcript,
      source: "youtube",
      videoId,
      charCount: transcript.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    console.error("YouTube transcript error:", error);
    return NextResponse.json(
      { error: `YouTube 자막 추출 실패: ${message}` },
      { status: 500 }
    );
  }
}
