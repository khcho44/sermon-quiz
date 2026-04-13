import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "설교 퀴즈 생성기",
  description: "설교 음성 파일 또는 유튜브 링크로 다양한 퀴즈를 자동 생성합니다",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
