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
        /* 사이버 네온 명상 — 두 반구가 형광빛으로 느리게 숨 쉬며 교대로 발화 */
        .db-mark-animated .dbm-l{transform-box:fill-box;transform-origin:center;animation:dbmNeuronL 7s ease-in-out infinite}
        .db-mark-animated .dbm-r{transform-box:fill-box;transform-origin:center;animation:dbmNeuronR 7s ease-in-out infinite}
        @keyframes dbmNeuronL{
          0%,100%{filter:brightness(.7) saturate(1.7) hue-rotate(-6deg) drop-shadow(0 0 6px rgba(90,120,255,.35));transform:scale(.985)}
          50%{filter:brightness(1.45) saturate(2.2) hue-rotate(8deg) drop-shadow(0 0 26px rgba(120,150,255,.9)) drop-shadow(0 0 54px rgba(90,120,255,.5));transform:scale(1.045)}
        }
        @keyframes dbmNeuronR{
          0%,100%{filter:brightness(1.45) saturate(2.2) hue-rotate(-8deg) drop-shadow(0 0 26px rgba(255,120,190,.9)) drop-shadow(0 0 54px rgba(230,90,150,.5));transform:scale(1.045)}
          50%{filter:brightness(.7) saturate(1.7) hue-rotate(6deg) drop-shadow(0 0 6px rgba(230,90,150,.35));transform:scale(.985)}
        }
        @media (prefers-reduced-motion: reduce){.db-mark-animated .dbm-l,.db-mark-animated .dbm-r{animation:none}}
      `}</style>
    </svg>
  );
}
