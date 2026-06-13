import type { MetadataRoute } from "next";

// PWA 매니페스트 — Next App Router가 /manifest.webmanifest 로 자동 서빙.
// "홈 화면에 추가" 시 standalone(주소창 없는 앱 모드)으로 열린다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?s=pwa",
    name: "듀얼브레인 — EMBA 17기의 두 번째 뇌",
    short_name: "듀얼브레인",
    description:
      "회의 30분 전, 다시 꺼내 쓰는 의사결정 코파일럿. 분석과 직관 — 두 개의 뇌.",
    start_url: "/?s=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#EDF0F8",
    theme_color: "#EDF0F8",
    lang: "ko",
    dir: "ltr",
    categories: ["education", "productivity", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
