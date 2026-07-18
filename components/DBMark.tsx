"use client";
import { useId } from "react";

// ★ 단일 SoT — 마스트헤드·타이틀 워터마크·카드 워터마크, 그리고 모바일(MobileApp)까지 이 컴포넌트만 쓴다.
// viewBox 100×60, 두 원 cx 32/68 cy 30 r 25 — 기존 형태·비율 그대로라 어떤 레이아웃도 안 흔들린다.
// 색 = 프리미엄 골드 듀얼디스크(매거진 표지 마크와 같은 정체성). 라이트(아이보리·페이퍼)와 다크 어디서도
// 읽히도록 좌=앤티크 골드 그라디언트, 우=앰버 라디얼, 교차부=밝은 렌즈, 테두리=딥골드 림으로 정의한다.
// animated=true: 좌뇌·우뇌가 번갈아 밝아졌다 어두워졌다 — 살아있는 뉴런 오프닝(타이틀 대형 워터마크용).
export function DBMark({
  size = 24,
  className = "",
  animated = false,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const W = 100;
  const H = 60;
  const w = size;
  const h = Math.round((size * H) / W);
  // 한 페이지에 여러 인스턴스가 있어도 그라디언트/클립 id가 충돌하지 않게 유니크화(콜론 제거 — url(#) 안전).
  const uid = useId().replace(/:/g, "");
  const L = `L${uid}`, R = `R${uid}`, Le = `E${uid}`, C = `C${uid}`;
  return (
    <svg
      className={"db-mark " + (animated ? "db-mark-animated " : "") + className}
      viewBox={`0 0 ${W} ${H}`}
      width={w}
      height={h}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={L} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E4B25A" />
          <stop offset="1" stopColor="#6E4C16" />
        </linearGradient>
        <radialGradient id={R} cx=".38" cy=".30" r=".95">
          <stop offset="0" stopColor="#F6DE93" />
          <stop offset=".5" stopColor="#DFB258" />
          <stop offset="1" stopColor="#A2711E" />
        </radialGradient>
        <linearGradient id={Le} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF4D2" />
          <stop offset="1" stopColor="#ECCB79" />
        </linearGradient>
        <clipPath id={C}>
          <circle cx="32" cy="30" r="25" />
        </clipPath>
      </defs>
      {/* 좌뇌(분석) — 앤티크 골드 */}
      <circle className="dbm-l" cx="32" cy="30" r="25" fill={`url(#${L})`} />
      {/* 우뇌(직관) — 앰버 라디얼 */}
      <circle className="dbm-r" cx="68" cy="30" r="25" fill={`url(#${R})`} />
      {/* 교차 렌즈 — 두 뇌가 만나는 밝은 시냅스 */}
      <circle cx="68" cy="30" r="25" fill={`url(#${Le})`} clipPath={`url(#${C})`} opacity=".9" />
      {/* 딥골드 림 — 아이보리에서도 가장자리가 안 흐려지게 */}
      <circle cx="32" cy="30" r="25" fill="none" stroke="#5E3F12" strokeOpacity=".5" strokeWidth="1.7" />
      <circle cx="68" cy="30" r="25" fill="none" stroke="#5E3F12" strokeOpacity=".42" strokeWidth="1.7" />
      <style>{`
        /* 글로우는 svg 전체에만(circle에 filter 걸면 영역 클리핑=네모 발생). 라이트/다크 공통으로 은은한 웜 그림자. */
        .db-mark{filter:drop-shadow(0 1px 1.4px rgba(92,60,14,.34))}
        .db-mark-animated{filter:drop-shadow(0 0 10px color-mix(in srgb,#E4B25A 46%,transparent)) drop-shadow(0 1px 2px rgba(92,60,14,.30))}
        .db-mark-animated .dbm-l{transform-box:fill-box;transform-origin:center;animation:dbmBreatheL 6.5s ease-in-out infinite}
        .db-mark-animated .dbm-r{transform-box:fill-box;transform-origin:center;animation:dbmBreatheR 6.5s ease-in-out infinite}
        @keyframes dbmBreatheL{0%,100%{opacity:.62;transform:scale(.97)}50%{opacity:1;transform:scale(1.05)}}
        @keyframes dbmBreatheR{0%,100%{opacity:1;transform:scale(1.05)}50%{opacity:.62;transform:scale(.97)}}
        @media (prefers-reduced-motion: reduce){.db-mark-animated .dbm-l,.db-mark-animated .dbm-r{animation:none}}
      `}</style>
    </svg>
  );
}
