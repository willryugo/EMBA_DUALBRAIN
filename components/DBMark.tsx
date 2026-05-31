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
        .db-mark-animated .dbm-l{transform-box:fill-box;transform-origin:center;animation:dbmGlowL 4.6s ease-in-out infinite}
        .db-mark-animated .dbm-r{transform-box:fill-box;transform-origin:center;animation:dbmGlowR 4.6s ease-in-out infinite}
        @keyframes dbmGlowL{0%,100%{filter:brightness(.9) saturate(.95);transform:scale(1)}50%{filter:brightness(1.32) saturate(1.25);transform:scale(1.04)}}
        @keyframes dbmGlowR{0%,100%{filter:brightness(1.32) saturate(1.25);transform:scale(1.04)}50%{filter:brightness(.9) saturate(.95);transform:scale(1)}}
        @media (prefers-reduced-motion: reduce){.db-mark-animated .dbm-l,.db-mark-animated .dbm-r{animation:none}}
      `}</style>
    </svg>
  );
}
