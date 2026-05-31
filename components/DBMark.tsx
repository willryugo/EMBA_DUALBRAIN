// ★ 단일 SoT — 마스트헤드·타이틀 워터마크·카드 워터마크 모두 이 컴포넌트만 쓴다.
// viewBox 100×60, 두 원 cx 32/68 r 25, mix-blend-mode multiply. size prop 외 형태/비율 변경 금지.
// 색은 로고 전용 고정 네온 --mark-l/--mark-r (테마 brain 색과 분리) → 어떤 배경에서도 네이비+핑크 생동감 유지.
// animated=true: 좌뇌·우뇌가 번갈아 밝아졌다 어두워졌다 — 살아있는 뉴런 오프닝.
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
  return (
    <svg
      className={"db-mark " + (animated ? "db-mark-animated " : "") + className}
      viewBox={`0 0 ${W} ${H}`}
      width={w}
      height={h}
      aria-hidden="true"
    >
      <g style={{ mixBlendMode: "multiply" }}>
        <circle className="dbm-l" cx="32" cy="30" r="25" fill="var(--mark-l, #5A6BF5)" opacity="1" />
        <circle className="dbm-r" cx="68" cy="30" r="25" fill="var(--mark-r, #FF4FA3)" opacity="1" />
      </g>
      <style>{`
        /* 네온 글로우 — circle엔 filter 금지(영역 클리핑=네모 발생 + multiply 깨짐). svg 전체에만 건다.
           로고 전용 고정색(--mark-*)이라 테마 배경이 어둑/탈색돼도 네이비+핑크가 안 묻힌다. */
        .db-mark{filter:drop-shadow(0 0 3px color-mix(in srgb,var(--mark-l,#5A6BF5) 55%,transparent)) drop-shadow(0 0 4px color-mix(in srgb,var(--mark-r,#FF4FA3) 45%,transparent))}
        .db-mark-animated{filter:drop-shadow(0 0 9px color-mix(in srgb,var(--mark-l,#5A6BF5) 52%,transparent)) drop-shadow(0 0 14px color-mix(in srgb,var(--mark-r,#FF4FA3) 44%,transparent))}
        .db-mark-animated .dbm-l{transform-box:fill-box;transform-origin:center;animation:dbmBreatheL 6.5s ease-in-out infinite}
        .db-mark-animated .dbm-r{transform-box:fill-box;transform-origin:center;animation:dbmBreatheR 6.5s ease-in-out infinite}
        @keyframes dbmBreatheL{0%,100%{opacity:.5;transform:scale(.97)}50%{opacity:1;transform:scale(1.05)}}
        @keyframes dbmBreatheR{0%,100%{opacity:1;transform:scale(1.05)}50%{opacity:.5;transform:scale(.97)}}
        @media (prefers-reduced-motion: reduce){.db-mark-animated .dbm-l,.db-mark-animated .dbm-r{animation:none}}
      `}</style>
    </svg>
  );
}
