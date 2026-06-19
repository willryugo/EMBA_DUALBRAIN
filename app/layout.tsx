import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GlobalGates } from "@/components/GlobalGates";
import { RegisterSW } from "@/components/RegisterSW";
import { InstallPrompt } from "@/components/InstallPrompt";

export const metadata: Metadata = {
  applicationName: "듀얼브레인",
  title: "듀얼브레인 — EMBA 17기의 두 번째 뇌",
  description:
    "회의 30분 전, 다시 꺼내 쓰는 의사결정 코파일럿. 분석과 직관, 두 개의 뇌가 만나는 곳.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "듀얼브레인",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon-32.png"],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#EDF0F8",
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
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* 본문 Pretendard는 '동적 서브셋' — 실제 쓰는 글리프만 받아 초기 로드가 가볍다. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 모노(영문 라벨·숫자)만 즉시 로드 — 가벼운 라틴 폰트.
            무거운 한국어 장식 serif(Noto Serif KR·나눔명조·고운바탕·블랙한산스·Cormorant)는
            themes.ts applyFont에서 '테마 선택 시' 지연 로드 → 초기 폰트 폭주 제거. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <div id="app">{children}</div>
        <GlobalGates />
        <RegisterSW />
        <InstallPrompt />
      </body>
    </html>
  );
}
