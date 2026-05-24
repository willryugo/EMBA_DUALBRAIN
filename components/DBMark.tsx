// ★ 단일 SoT — 마스트헤드·타이틀 워터마크·카드 워터마크 모두 이 컴포넌트만 쓴다.
// viewBox 100×60, 두 원 cx 32/68 r 25, mix-blend-mode multiply, opacity 0.78.
// size prop 외 형태/비율 절대 변경 금지.
export function DBMark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const W = 100;
  const H = 60;
  const w = size;
  const h = Math.round((size * H) / W);
  return (
    <svg
      className={"db-mark " + className}
      viewBox={`0 0 ${W} ${H}`}
      width={w}
      height={h}
      aria-hidden="true"
    >
      <g style={{ mixBlendMode: "multiply" }}>
        <circle cx="32" cy="30" r="25" fill="var(--brain-l)" opacity="0.78" />
        <circle cx="68" cy="30" r="25" fill="var(--brain-r)" opacity="0.78" />
      </g>
    </svg>
  );
}
