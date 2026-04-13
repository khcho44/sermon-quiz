import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
  );
  return match ? match[1] : null;
}

async function fetchYouTubePage(videoId: string): Promise<string> {
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube 페이지 로드 실패: ${response.status}`);
  }

  return response.text();
}

function parseCaptionTracks(html: string): { baseUrl: string; languageCode: string; name: string }[] {
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match) return [];

  try {
    const tracks = JSON.parse(match[1]);
    return tracks.map((t: { baseUrl: string; languageCode: string; name: { simpleText: string } }) => ({
      baseUrl: t.baseUrl,
      languageCode: t.languageCode,
      name: t.name?.simpleText || t.languageCode,
    }));
  } catch {
    return [];
  }
}

async function fetchCaptionXml(baseUrl: string): Promise<string> {
  const response = await fetch(baseUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  return response.text();
}

function parseXmlTranscript(xml: string): string {
  const textMatches = Array.from(xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g));
  const texts: string[] = [];

  for (const match of textMatches) {
    const text = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (text) texts.push(text);
  }

  return texts.join(" ");
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

    const html = await fetchYouTubePage(videoId);
    const tracks = parseCaptionTracks(html);

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "이 영상에는 자막이 없습니다. 직접 텍스트 입력을 이용해주세요." },
        { status: 404 }
      );
    }

    // Prefer Korean, then English, then first available
    const preferred = ["ko", "en"];
    let selectedTrack = tracks[0];
    for (const lang of preferred) {
      const found = tracks.find((t) => t.languageCode.startsWith(lang));
      if (found) { selectedTrack = found; break; }
    }

    const xml = await fetchCaptionXml(selectedTrack.baseUrl);
    const transcript = parseXmlTranscript(xml);

    if (!transcript) {
      return NextResponse.json(
        { error: "자막을 파싱할 수 없습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transcript,
      source: "youtube",
      videoId,
      language: selectedTrack.languageCode,
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
