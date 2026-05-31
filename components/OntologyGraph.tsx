"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { COURSE_COLOR, COURSE_SHORT } from "@/lib/manifest";
import neighborsJson from "@/data/neighbors.json";

interface Props {
  cards: Card[];
  onOpen: (id: string) => void;
  onClose: () => void;
}

interface SimNode {
  id: string;
  card: Card;
  x: number;
  y: number;
  vx: number;
  vy: number;
  deg: number;
  r: number;
  color: string;
}
interface SimLink {
  s: string;
  t: string;
}

const NB = neighborsJson as Record<string, unknown>;

// 진짜 force-directed 브레인맵 (다크). 실제 의미 이웃만 엣지, 노드 크기=연결 수.
export function OntologyGraph({ cards, onOpen, onClose }: Props) {
  const W = 1600;
  const H = 1000;

  // 노드·엣지 빌드
  const { nodes0, links } = useMemo(() => {
    const idset = new Set(cards.map((c) => c.id));
    const deg: Record<string, number> = {};
    cards.forEach((c) => (deg[c.id] = 0));
    const linkSet = new Set<string>();
    const links: SimLink[] = [];
    cards.forEach((c) => {
      const nb = NB[c.id];
      if (!Array.isArray(nb)) return;
      (nb as string[]).forEach((t) => {
        if (!idset.has(t)) return;
        const key = c.id < t ? c.id + "|" + t : t + "|" + c.id;
        if (linkSet.has(key)) return;
        linkSet.add(key);
        links.push({ s: c.id, t });
        deg[c.id]++;
        deg[t]++;
      });
    });
    // 초기 위치: 원형 + 약간 랜덤(결정적) — 과목별로 살짝 뭉치게 시드
    const nodes0: SimNode[] = cards.map((c, i) => {
      const a = (i / cards.length) * Math.PI * 2;
      const jitter = ((i * 37) % 13) - 6;
      const d = deg[c.id] || 0;
      return {
        id: c.id,
        card: c,
        x: W / 2 + Math.cos(a) * (300 + jitter * 6),
        y: H / 2 + Math.sin(a) * (300 + jitter * 6),
        vx: 0,
        vy: 0,
        deg: d,
        r: 7 + Math.sqrt(d) * 5.5, // 연결 많을수록 큰 노드
        color: COURSE_COLOR[c.course] || "#9a8",
      };
    });
    return { nodes0, links };
  }, [cards]);

  const [nodes, setNodes] = useState<SimNode[]>(nodes0);
  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const draggingRef = useRef<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastClickRef = useRef<{ id: string; t: number }>({ id: "", t: 0 });

  // 인접 맵 (강조용)
  const adj = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    links.forEach((l) => {
      (m[l.s] ||= new Set()).add(l.t);
      (m[l.t] ||= new Set()).add(l.s);
    });
    return m;
  }, [links]);

  // ── force simulation (런타임, 의존성 0) ──
  useEffect(() => {
    const ns = nodes0.map((n) => ({ ...n }));
    const idx: Record<string, number> = {};
    ns.forEach((n, i) => (idx[n.id] = i));
    let frame = 0;
    let raf = 0;
    let alpha = 1;

    const tick = () => {
      // 반발력 (모든 쌍)
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i], b = ns[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) d2 = 1;
          const d = Math.sqrt(d2);
          const minD = a.r + b.r + 14;
          // 일반 반발 + 충돌 방지
          let f = (5200 * alpha) / d2;
          if (d < minD) f += (minD - d) * 0.9;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }
      // 스프링 (엣지)
      links.forEach((l) => {
        const a = ns[idx[l.s]], b = ns[idx[l.t]];
        if (!a || !b) return;
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = 120;
        const f = (d - target) * 0.04 * alpha;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      });
      // 중심 인력 + 감쇠 + 적용
      ns.forEach((n) => {
        if (draggingRef.current === n.id) { n.vx = 0; n.vy = 0; return; }
        n.vx += (W / 2 - n.x) * 0.0016 * alpha;
        n.vy += (H / 2 - n.y) * 0.0016 * alpha;
        n.vx *= 0.86; n.vy *= 0.86;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(n.r + 8, Math.min(W - n.r - 8, n.x));
        n.y = Math.max(n.r + 8, Math.min(H - n.r - 8, n.y));
      });
      alpha *= 0.992;
      frame++;
      setNodes(ns.map((n) => ({ ...n })));
      if (frame < 600 && alpha > 0.02) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes0, links]);

  // 드래그
  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  };
  const onDown = (id: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    draggingRef.current = id;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const p = toSvg(e);
    setNodes((prev) =>
      prev.map((n) => (n.id === draggingRef.current ? { ...n, x: p.x, y: p.y, vx: 0, vy: 0 } : n))
    );
  };
  const onUp = () => { draggingRef.current = null; };

  const handleClick = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (lastClickRef.current.id === id && now - lastClickRef.current.t < 400) {
      onOpen(id); // 더블클릭 = 카드 열기
      return;
    }
    lastClickRef.current = { id, t: now };
    setActive((a) => (a === id ? null : id));
  };

  const isDim = (id: string) =>
    active && active !== id && !adj[active]?.has(id);
  const linkOn = (l: SimLink) =>
    active && (l.s === active || l.t === active);

  const nodeById = useMemo(() => {
    const m: Record<string, SimNode> = {};
    nodes.forEach((n) => (m[n.id] = n));
    return m;
  }, [nodes]);

  return (
    <div className="bm-fs" onClick={() => setActive(null)}>
      <div className="bm-head">
        <h2>두 번째 뇌의 지도</h2>
        <div className="bm-hint">
          노드 클릭 = 연결망 · 더블클릭 = 카드 · 드래그 = 이동
        </div>
        <button className="bm-close" onClick={onClose}>← 매거진으로</button>
      </div>

      <svg
        ref={svgRef}
        className="bm-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {/* 엣지 */}
        <g>
          {links.map((l, i) => {
            const a = nodeById[l.s], b = nodeById[l.t];
            if (!a || !b) return null;
            const on = linkOn(l);
            const dim = active && !on;
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={on ? a.color : "#ffffff"}
                strokeOpacity={on ? 0.55 : dim ? 0.03 : 0.09}
                strokeWidth={on ? 1.6 : 0.8}
              />
            );
          })}
        </g>
        {/* 노드 */}
        <g>
          {nodes.map((n) => {
            const dim = isDim(n.id);
            const isActive = active === n.id;
            const showLabel = isActive || hover === n.id || n.deg >= 9 || (active && adj[active]?.has(n.id));
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                style={{ cursor: "pointer", opacity: dim ? 0.22 : 1, transition: "opacity .2s" }}
                onPointerDown={onDown(n.id)}
                onClick={handleClick(n.id)}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
              >
                <circle
                  r={n.r}
                  fill={n.color}
                  stroke={isActive ? "#fff" : "rgba(255,255,255,.25)"}
                  strokeWidth={isActive ? 2.5 : 1}
                />
                {showLabel && (
                  <text
                    x={0}
                    y={n.r + 13}
                    textAnchor="middle"
                    fill="rgba(255,255,255,.9)"
                    fontSize={11}
                    fontWeight={isActive ? 700 : 500}
                    style={{ pointerEvents: "none", textShadow: "0 1px 4px rgba(0,0,0,.8)" }}
                  >
                    {n.card.concept.length > 16 ? n.card.concept.slice(0, 15) + "…" : n.card.concept}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* 범례 */}
      <div className="bm-legend">
        {Object.entries(COURSE_SHORT).map(([course, short]) => (
          <span key={course} className="bm-leg">
            <i style={{ background: COURSE_COLOR[course as keyof typeof COURSE_COLOR] }} />
            {short}
          </span>
        ))}
      </div>

      {/* 선택된 노드 정보 */}
      {active && nodeById[active] && (
        <div className="bm-info" onClick={(e) => e.stopPropagation()}>
          <div className="bm-info-course" style={{ color: nodeById[active].color }}>
            {COURSE_SHORT[nodeById[active].card.course]} · 연결 {nodeById[active].deg}
          </div>
          <div className="bm-info-hook">{nodeById[active].card.hook}</div>
          <div className="bm-info-concept">{nodeById[active].card.concept}</div>
          <button className="bm-info-open" onClick={() => onOpen(active)}>
            카드 열기 →
          </button>
        </div>
      )}
    </div>
  );
}
