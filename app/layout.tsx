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
        {/* ⚠️ CDN 폰트는 '렌더 비차단'으로 — media="print"로 받아 첫 페인트를 막지 않고,
            아래 인라인 스크립트가 로드 완료 시 media='all'로 승격해 적용한다.
            회사망/방화벽이 jsdelivr·googleapis를 느리게 하거나 막아도 페이지는 시스템 폰트로
            '즉시' 뜬다(과거 무한 로딩 = render-blocking CDN CSS 대기였음). 폰트는 오면 갈아끼움.
            본문 Pretendard는 '동적 서브셋' — 실제 쓰는 글리프만 받아 가볍다. */}
        <link
          rel="stylesheet"
          media="print"
          data-font-async=""
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 모노(영문 라벨·숫자)만 — 가벼운 라틴 폰트. 무거운 한국어 장식 serif는 themes.ts에서 지연 로드. */}
        <link
          rel="stylesheet"
          media="print"
          data-font-async=""
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){function P(l){l.media='all';}var ls=document.querySelectorAll('link[data-font-async]');for(var i=0;i<ls.length;i++){var l=ls[i];if(l.sheet){P(l);}else{l.addEventListener('load',(function(x){return function(){P(x);};})(l));l.addEventListener('error',(function(x){return function(){P(x);};})(l));}}})();",
          }}
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
