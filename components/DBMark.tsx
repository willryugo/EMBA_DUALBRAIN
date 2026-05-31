// ★ 단일 SoT — 마스트헤드·타이틀 워터마크·카드 워터마크 모두 이 컴포넌트만 쓴다.
// viewBox 100×60, 두 원 cx 32/68 r 25, mix-blend-mode multiply, opacity 0.78.
// size prop 외 형태/비율 절대 변경 금지.
// animated=true: 좌뇌·우뇌가 번갈아 밝아졌다 어두워졌다(brightness+scale) — 살아있는 오프닝.
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
        <circle className="dbm-l" cx="32" cy="30" r="25" fill="var(--brain-l)" opacity="0.78" />
        <circle className="dbm-r" cx="68" cy="30" r="25" fill="var(--brain-r)" opacity="0.78" />
      </g>
      <style>{`
        /* 명상 점멸 — circle엔 filter 금지(SVG filter 영역 클리핑=네모 발생 + multiply 깨짐).
           opacity·scale만 교대로 → 두 반구가 번갈아 짙어졌다 옅어지는 뉴런 호흡. 글로우는 svg 전체에. */
        .db-mark-animated{filter:drop-shadow(0 0 16px rgba(150,140,220,.22))}
        .db-mark-animated .dbm-l{transform-box:fill-box;transform-origin:center;animation:dbmBreatheL 6.5s ease-in-out infinite}
        .db-mark-animated .dbm-r{transform-box:fill-box;transform-origin:center;animation:dbmBreatheR 6.5s ease-in-out infinite}
        @keyframes dbmBreatheL{0%,100%{opacity:.42;transform:scale(.975)}50%{opacity:.92;transform:scale(1.045)}}
        @keyframes dbmBreatheR{0%,100%{opacity:.92;transform:scale(1.045)}50%{opacity:.42;transform:scale(.975)}}
        @media (prefers-reduced-motion: reduce){.db-mark-animated .dbm-l,.db-mark-animated .dbm-r{animation:none}}
      `}</style>
    </svg>
  );
}
