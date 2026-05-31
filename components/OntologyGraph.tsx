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
  const W = 1800;
  const H = 1100;

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
    // degree 정규화 → 크기 격차 극대화 (허브 거대 / 잎 작게)
    const degs = cards.map((c) => deg[c.id] || 0);
    const dMin = Math.min(...degs), dMax = Math.max(...degs);
    const norm = (d: number) => (dMax > dMin ? (d - dMin) / (dMax - dMin) : 0.5);
    // 잎 5px → 허브 38px, 제곱 강조로 상위만 확 크게
    const radiusOf = (d: number) => 5 + Math.pow(norm(d), 1.6) * 33;

    // 초기 위치: 넓은 원형 분산 (결정적 jitter)
    const nodes0: SimNode[] = cards.map((c, i) => {
      const a = (i / cards.length) * Math.PI * 2;
      const jitter = ((i * 37) % 17) - 8;
      const d = deg[c.id] || 0;
      return {
        id: c.id,
        card: c,
        x: W / 2 + Math.cos(a) * (440 + jitter * 10),
        y: H / 2 + Math.sin(a) * (380 + jitter * 8),
        vx: 0,
        vy: 0,
        deg: d,
        r: radiusOf(d),
        color: COURSE_COLOR[c.course] || "#9a8",
      };
    });
    return { nodes0, links };
  }, [cards]);

  // 인접 맵 (강조용)
  const adj = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    links.forEach((l) => {
      (m[l.s] ||= new Set()).add(l.t);
      (m[l.t] ||= new Set()).add(l.s);
    });
    return m;
  }, [links]);

  // 드래그 상태 ref — stepPhysics가 settled(useMemo)에서 호출되므로
  // 반드시 stepPhysics 정의보다 위에 선언해야 TDZ ReferenceError가 안 난다.
  const draggingRef = useRef<string | null>(null);

  // ── 물리 1스텝 (공용) ──
  const stepPhysics = (ns: SimNode[], idx: Record<string, number>, alpha: number) => {
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const a = ns[i], b = ns[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) d2 = 1;
        const d = Math.sqrt(d2);
        const minD = a.r + b.r + 38; // 노드 사이 여백 크게 → 시원하게 퍼짐
        // 반발 대폭 강화 + 큰 노드일수록 더 강하게 밀어냄(허브가 공간 확보)
        let f = (16000 * alpha) / d2;
        if (d < minD) f += (minD - d) * 1.2;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
    }
    links.forEach((l) => {
      const a = ns[idx[l.s]], b = ns[idx[l.t]];
      if (!a || !b) return;
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.sqrt(dx * dx + dy * dy) || 1;
      // 목표 거리 = 두 노드 반지름 + 여백 (큰 노드는 더 떨어져 가지처럼)
      const target = a.r + b.r + 70;
      const f = (d - target) * 0.035 * alpha;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    });
    ns.forEach((n) => {
      if (draggingRef.current === n.id) { n.vx = 0; n.vy = 0; return; }
      n.vx += (W / 2 - n.x) * 0.001 * alpha; // 중심 인력 약하게 → 넓게 펼침
      n.vy += (H / 2 - n.y) * 0.001 * alpha;
      n.vx *= 0.86; n.vy *= 0.86;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(n.r + 8, Math.min(W - n.r - 8, n.x));
      n.y = Math.max(n.r + 8, Math.min(H - n.r - 8, n.y));
    });
  };

  // ── 최종 배치를 화면 뒤에서 미리 다 계산 (튀는 과정 안 보임) ──
  const settled = useMemo(() => {
    const ns = nodes0.map((n) => ({ ...n }));
    const idx: Record<string, number> = {};
    ns.forEach((n, i) => (idx[n.id] = i));
    let alpha = 1;
    for (let s = 0; s < 500; s++) {
      stepPhysics(ns, idx, alpha);
      alpha *= 0.99;
    }
    return ns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes0, links]);

  const [nodes, setNodes] = useState<SimNode[]>(settled);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const dragRafRef = useRef<number>(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastClickRef = useRef<{ id: string; t: number }>({ id: "", t: 0 });

  // 줌/팬 (viewBox 기반) — 휠로 확대, 빈 공간 드래그로 이동
  const [view, setView] = useState({ x: 0, y: 0, w: W, h: H });
  const viewRef = useRef(view);
  viewRef.current = view;
  const panRef = useRef<{ cx: number; cy: number; vx: number; vy: number } | null>(null);

  // 마운트 직후 페이드인 (최종 배치만 부드럽게 등장)
  useEffect(() => {
    setNodes(settled.map((n) => ({ ...n })));
    const t = setTimeout(() => setReady(true), 30);
    return () => clearTimeout(t);
  }, [settled]);

  // 휠 줌 (커서 기준) — 네이티브 비패시브 리스너로 preventDefault 확보
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      const rect = svg.getBoundingClientRect();
      // rect 측정 불가(0)면 화면 중심 기준 폴백 — NaN 방지 + 줌은 계속 동작
      const fx = rect.width ? (e.clientX - rect.left) / rect.width : 0.5;
      const fy = rect.height ? (e.clientY - rect.top) / rect.height : 0.5;
      const mx = v.x + fx * v.w;
      const my = v.y + fy * v.h;
      const scale = e.deltaY < 0 ? 0.85 : 1 / 0.85; // 위로 굴리면 확대
      let nw = v.w * scale;
      nw = Math.max(W * 0.16, Math.min(W * 1.5, nw)); // 줌 한계
      const nh = nw * (H / W);
      setView({ x: mx - fx * nw, y: my - fy * nh, w: nw, h: nh });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  // ── 드래그 중에만 가벼운 라이브 물리 (주변 노드가 반응) ──
  const runDragLoop = () => {
    cancelAnimationFrame(dragRafRef.current);
    const loop = () => {
      setNodes((prev) => {
        const ns = prev.map((n) => ({ ...n }));
        const idx: Record<string, number> = {};
        ns.forEach((n, i) => (idx[n.id] = i));
        stepPhysics(ns, idx, 0.5);
        return ns;
      });
      if (draggingRef.current) dragRafRef.current = requestAnimationFrame(loop);
    };
    dragRafRef.current = requestAnimationFrame(loop);
  };

  // 드래그
  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: v.x + ((e.clientX - r.left) / r.width) * v.w,
      y: v.y + ((e.clientY - r.top) / r.height) * v.h,
    };
  };
  const onDown = (id: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    draggingRef.current = id;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    runDragLoop();
  };
  // 빈 공간 드래그 = 화면 이동(팬)
  const onSvgDown = (e: React.PointerEvent) => {
    if (draggingRef.current) return;
    panRef.current = { cx: e.clientX, cy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (draggingRef.current) {
      const p = toSvg(e);
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingRef.current ? { ...n, x: p.x, y: p.y, vx: 0, vy: 0 } : n))
      );
      return;
    }
    if (panRef.current) {
      const svg = svgRef.current!;
      const r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const v = viewRef.current;
      const dx = ((e.clientX - panRef.current.cx) / r.width) * v.w;
      const dy = ((e.clientY - panRef.current.cy) / r.height) * v.h;
      setView({ ...v, x: panRef.current.vx - dx, y: panRef.current.vy - dy });
    }
  };
  const onUp = () => {
    panRef.current = null;
    if (!draggingRef.current) return;
    draggingRef.current = null;
    // 놓은 뒤 잠깐만 더 정착시키고 멈춤
    let extra = 0;
    const settle = () => {
      setNodes((prev) => {
        const ns = prev.map((n) => ({ ...n }));
        const idx: Record<string, number> = {};
        ns.forEach((n, i) => (idx[n.id] = i));
        stepPhysics(ns, idx, 0.3);
        return ns;
      });
      if (++extra < 40 && !draggingRef.current) requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  };

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

  // ── 시맨틱 줌 (지도 축척처럼): 확대할수록 라벨·연결선이 더 드러남 ──
  const k = W / view.w; // 1=전체보기, 클수록 확대
  // 확대할수록 라벨 기준 degree를 낮춤 → 작은 노드 제목까지 단계적 등장
  const labelDegThreshold = Math.max(1, Math.round(16 - (k - 1) * 6));
  // 확대할수록 연결선을 진하게 → 안 보이던 연결이 드러남
  const baseLineOpacity = Math.min(0.55, 0.16 + (k - 1) * 0.13);
  const inView = (n: SimNode) =>
    n.x >= view.x - 60 && n.x <= view.x + view.w + 60 &&
    n.y >= view.y - 60 && n.y <= view.y + view.h + 60;

  return (
    <div className="bm-fs" onClick={() => setActive(null)}>
      <style>{`
        @keyframes bmTwinkle { 0%,100%{opacity:1} 50%{opacity:.6} }
        @keyframes bmGlowPulse { 0%,100%{opacity:.12; transform:scale(1)} 50%{opacity:.34; transform:scale(1.14)} }
        .bm-node-c { animation: bmTwinkle 3.4s ease-in-out infinite; }
        .bm-glow-c { transform-box: fill-box; transform-origin: center; animation: bmGlowPulse 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){ .bm-node-c,.bm-glow-c{ animation: none } }
      `}</style>
      <div className="bm-head">
        <h2>두 번째 뇌의 지도</h2>
        <div className="bm-hint">
          휠 = 확대(지도처럼 디테일 드러남) · 빈 공간 드래그 = 이동 · 클릭 = 연결망 · 더블클릭 = 카드
        </div>
        <button className="bm-close" onClick={onClose}>← 매거진으로</button>
      </div>

      <svg
        ref={svgRef}
        className="bm-svg"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onSvgDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onDoubleClick={(e) => {
          if ((e.target as Element).tagName === "svg") setView({ x: 0, y: 0, w: W, h: H });
        }}
        style={{
          opacity: ready ? 1 : 0,
          transition: "opacity .5s ease",
          cursor: "grab",
          touchAction: "none",
        }}
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
                stroke={on ? a.color : "#aab4d4"}
                strokeOpacity={on ? 0.7 : dim ? 0.04 : baseLineOpacity}
                strokeWidth={(on ? 2 : 1) / k}
              />
            );
          })}
        </g>
        {/* 노드 */}
        <g>
          {nodes.map((n) => {
            const dim = isDim(n.id);
            const isActive = active === n.id;
            const isHub = n.deg >= 16; // 허브는 항상
            // 확대할수록 더 작은 노드 라벨까지 드러남(보이는 영역 안에서만)
            const meetsDensity = n.deg >= labelDegThreshold && inView(n);
            const showLabel =
              isActive || hover === n.id || isHub || meetsDensity || (active && adj[active]?.has(n.id));
            // 라벨은 화면상 크기 일정(축척 보정) — 확대해도 글자가 안 커짐
            const lblSize = Math.max(11, Math.min(20, n.r * 0.55)) / k;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                style={{ cursor: "pointer", opacity: dim ? 0.18 : 1, transition: "opacity .2s" }}
                onPointerDown={onDown(n.id)}
                onClick={handleClick(n.id)}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
              >
                {/* 허브 글로우 (펄스) */}
                {isHub && (
                  <circle
                    className="bm-glow-c"
                    r={n.r + 8}
                    fill={n.color}
                    style={{ pointerEvents: "none", animationDelay: `${(n.id.charCodeAt(0) % 7) * 0.3}s` }}
                  />
                )}
                <circle
                  className={isActive ? undefined : "bm-node-c"}
                  r={n.r}
                  fill={n.color}
                  stroke={isActive ? "#fff" : "rgba(255,255,255,.22)"}
                  strokeWidth={(isActive ? 2.5 : 1) / k}
                  style={{ animationDelay: `${(n.id.charCodeAt(n.id.length - 1) % 11) * 0.31}s` }}
                />
                {showLabel && (
                  <text
                    x={0}
                    y={n.r + lblSize + 2}
                    textAnchor="middle"
                    fill={isHub || isActive ? "#fff" : "rgba(255,255,255,.85)"}
                    fontSize={lblSize}
                    fontWeight={isHub || isActive ? 700 : 500}
                    style={{ pointerEvents: "none", textShadow: "0 1px 5px rgba(0,0,0,.9)" }}
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
