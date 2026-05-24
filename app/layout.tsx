import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "듀얼브레인 — EMBA 17기의 두 번째 뇌",
  description:
    "회의 30분 전, 다시 꺼내 쓰는 학습 자산 매거진. 분석과 직관, 두 개의 뇌가 만나는 곳.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Nanum+Myeongjo:wght@400;700;800&family=Gowun+Batang:wght@400;700&family=Black+Han+Sans&family=Gowun+Dodum&family=JetBrains+Mono:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500;1,700&display=swap"
        />
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
