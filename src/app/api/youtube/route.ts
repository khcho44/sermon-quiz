import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const INNERTUBE_URL =
  "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const ANDROID_VERSION = "20.10.38";
const ANDROID_UA = `com.google.android.youtube/${ANDROID_VERSION} (Linux; U; Android 14)`;

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
  );
  return match ? match[1] : null;
}

async function getCaptionTracks(videoId: string) {
  const res = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": ANDROID_UA,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: ANDROID_VERSION,
        },
      },
      videoId,
    }),
  });

  if (!res.ok) throw new Error(`InnerTube API 오류: ${res.status}`);

  const data = await res.json();
  const tracks =
    data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  return tracks as { baseUrl: string; languageCode: string }[];
}

function parseTranscriptXml(xml: string): string {
  const texts: string[] = [];

  // Format 1: <p t="..." d="..."><s>text</s></p>
  const pMatches = Array.from(xml.matchAll(/<p\s[^>]*>([\s\S]*?)<\/p>/g));
  if (pMatches.length > 0) {
    for (const match of pMatches) {
      const inner = match[1];
      const sMatches = Array.from(inner.matchAll(/<s[^>]*>([^<]*)<\/s>/g));
      let text = sMatches.map((m) => m[1]).join("");
      if (!text) text = inner.replace(/<[^>]+>/g, "");
      text = decodeEntities(text.trim());
      if (text) texts.push(text);
    }
    return texts.join(" ");
  }

  // Format 2: <text start="..." dur="...">text</text>
  const textMatches = Array.from(
    xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)
  );
  for (const match of textMatches) {
    const text = decodeEntities(
      match[1].replace(/<[^>]+>/g, "").trim()
    );
    if (text) texts.push(text);
  }
  return texts.join(" ");
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "유효한 YouTube URL이 아닙니다." },
        { status: 400 }
      );
    }

    const tracks = await getCaptionTracks(videoId);
    if (!tracks) {
      return NextResponse.json(
        {
          error:
            "이 영상에는 자막이 없습니다. 직접 텍스트 입력을 이용해주세요.",
        },
        { status: 404 }
      );
    }

    // Prefer Korean, then English, then first
    const preferred = ["ko", "en"];
    let selected = tracks[0];
    for (const lang of preferred) {
      const found = tracks.find((t) => t.languageCode.startsWith(lang));
      if (found) {
        selected = found;
        break;
      }
    }

    const xmlRes = await fetch(selected.baseUrl, {
      headers: { "User-Agent": ANDROID_UA },
    });

    if (!xmlRes.ok) throw new Error("자막 XML 로드 실패");

    const xml = await xmlRes.text();
    const transcript = parseTranscriptXml(xml);

    if (!transcript) {
      throw new Error("자막 내용을 파싱할 수 없습니다.");
    }

    return NextResponse.json({
      transcript,
      source: "youtube",
      videoId,
      language: selected.languageCode,
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
