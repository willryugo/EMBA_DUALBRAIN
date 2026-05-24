"use client";
import { useMemo, useState } from "react";
import type { Card } from "@/lib/types";
import {
  COURSE_COLOR,
  COURSE_SHORT,
  COURSES,
  UNIVERSAL,
} from "@/lib/manifest";

interface Props {
  cards: Card[];
  onOpen: (id: string) => void;
  onClose: () => void;
}

export function OntologyGraph({ cards, onOpen, onClose }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const layout = useMemo(() => {
    const W = 880;
    const H = 620;
    const cx = W / 2;
    const cy = H / 2;
    const R0 = Math.min(W, H) * 0.36;
    const byCourse: Record<string, Card[]> = {};
    cards.forEach((c) => {
      if (!byCourse[c.course]) byCourse[c.course] = [];
      byCourse[c.course].push(c);
    });
    const usedCourses = COURSES.filter((c) => byCourse[c]);
    const positions: Record<string, { x: number; y: number; ang: number }> = {};
    usedCourses.forEach((course, ci) => {
      const list = byCourse[course];
      const sectorAngle = (Math.PI * 2) / usedCourses.length;
      const centerA = -Math.PI / 2 + ci * sectorAngle;
      list.forEach((card, i) => {
        const offset =
          list.length === 1
            ? 0
            : (i - (list.length - 1) / 2) *
              ((sectorAngle / list.length) * 0.55);
        const ang = centerA + offset;
        const r = R0 + (i % 2 === 0 ? 0 : 40);
        positions[card.id] = {
          x: cx + Math.cos(ang) * r,
          y: cy + Math.sin(ang) * r,
          ang,
        };
      });
    });
    interface Edge {
      a: string;
      b: string;
      weight: number;
      sameCourse: boolean;
      sharedD: number;
      sharedI: number;
    }
    const edges: Edge[] = [];
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const a = cards[i];
        const b = cards[j];
        const sharedD = (a.domain || []).filter((d) =>
          (b.domain || []).includes(d)
        ).length;
        const sharedI = (a.industry || []).filter(
          (x) => x !== UNIVERSAL && (b.industry || []).includes(x)
        ).length;
        const sameCourse = a.course === b.course;
        if (sharedD > 0 || sharedI > 0 || sameCourse) {
          let weight = 0;
          if (sameCourse) weight += 3;
          weight += sharedD * 2;
          weight += sharedI * 1.5;
          edges.push({ a: a.id, b: b.id, weight, sameCourse, sharedD, sharedI });
        }
      }
    }
    const courseLabels = usedCourses.map((course, ci) => {
      const sectorAngle = (Math.PI * 2) / usedCourses.length;
      const a = -Math.PI / 2 + ci * sectorAngle;
      const r = R0 + 110;
      return {
        course,
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        color: COURSE_COLOR[course],
      };
    });
    return { W, H, cx, cy, positions, edges, courseLabels };
  }, [cards]);

  const handleClick = (id: string) => {
    if (focus === id) {
      onOpen(id);
    } else {
      setFocus(id);
    }
  };

  const focusedCard = focus ? cards.find((c) => c.id === focus) : null;
  const focusedEdges = focus
    ? layout.edges.filter((e) => e.a === focus || e.b === focus)
    : [];
  const focusedNeighbors = new Set<string>();
  focusedEdges.forEach((e) => {
    focusedNeighbors.add(e.a);
    focusedNeighbors.add(e.b);
  });

  return (
    <div className="graph-overlay">
      <div className="graph-shell">
        <div className="graph-top">
          <div className="gt-l">
            <div className="gt-eyebrow">ONTOLOGY</div>
            <div className="gt-title">12개의 개념 · 두 번째 뇌의 지도</div>
          </div>
          <div className="gt-r">
            <div className="gt-help">
              노드 1번 클릭 = 연결망 보기 · 2번 클릭 = 카드 열기
            </div>
            <button className="gt-close" onClick={onClose}>
              ← 매거진으로
            </button>
          </div>
        </div>
        <div className="graph-body">
          <div className="graph-canvas">
            <svg
              viewBox={`0 0 ${layout.W} ${layout.H}`}
              preserveAspectRatio="xMidYMid meet"
              className="graph-svg"
            >
              <defs>
                <pattern
                  id="gpat"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r=".8" fill="rgba(22,21,15,.07)" />
                </pattern>
              </defs>
              <rect width={layout.W} height={layout.H} fill="url(#gpat)" />
              <g>
                <circle
                  cx={layout.cx - 10}
                  cy={layout.cy}
                  r="26"
                  fill="var(--brain-l)"
                  opacity=".18"
                />
                <circle
                  cx={layout.cx + 10}
                  cy={layout.cy}
                  r="26"
                  fill="var(--brain-r)"
                  opacity=".18"
                />
                <text
                  x={layout.cx}
                  y={layout.cy + 50}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontSize="10"
                  fill="rgba(22,21,15,.5)"
                  letterSpacing="2"
                >
                  DUAL BRAIN
                </text>
              </g>
              {layout.edges.map((e, i) => {
                const pa = layout.positions[e.a];
                const pb = layout.positions[e.b];
                const isFocus = focus && (e.a === focus || e.b === focus);
                const opacity = focus
                  ? isFocus
                    ? 0.7
                    : 0.06
                  : 0.2 + Math.min(0.35, e.weight * 0.05);
                const dash = e.sameCourse ? "none" : "3 4";
                return (
                  <line
                    key={i}
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke="#16150F"
                    strokeWidth={isFocus ? 1.5 : 0.9}
                    strokeDasharray={dash}
                    opacity={opacity}
                  />
                );
              })}
              {cards.map((c) => {
                const p = layout.positions[c.id];
                const col = COURSE_COLOR[c.course];
                const isHover = hover === c.id;
                const isFocus = focus === c.id;
                const isNeigh = focus && focusedNeighbors.has(c.id);
                const dim = focus && !isFocus && !isNeigh;
                return (
                  <g
                    key={c.id}
                    className="g-node"
                    style={{ cursor: "pointer", opacity: dim ? 0.22 : 1 }}
                    onMouseEnter={() => setHover(c.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => handleClick(c.id)}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isFocus ? 22 : 16}
                      fill="#FFFCF6"
                      stroke={col}
                      strokeWidth={isFocus ? 3 : 2}
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isFocus ? 10 : 7}
                      fill={col}
                    />
                    {(isHover || isFocus) && (
                      <g style={{ pointerEvents: "none" }}>
                        <rect
                          x={p.x + 22}
                          y={p.y - 22}
                          width="220"
                          height="44"
                          fill="#16150F"
                          rx="0"
                        />
                        <text
                          x={p.x + 30}
                          y={p.y - 6}
                          fontFamily="Noto Serif KR"
                          fontSize="11"
                          fontWeight="700"
                          fill="#FFFCF6"
                        >
                          {c.hook.length > 20
                            ? c.hook.slice(0, 20) + "…"
                            : c.hook}
                        </text>
                        <text
                          x={p.x + 30}
                          y={p.y + 11}
                          fontFamily="JetBrains Mono"
                          fontSize="9"
                          fill="rgba(255,252,246,.6)"
                          letterSpacing="1"
                        >
                          {COURSE_SHORT[c.course]} ·{" "}
                          {c.concept.length > 22
                            ? c.concept.slice(0, 22) + "…"
                            : c.concept}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
              {layout.courseLabels.map((l, i) => (
                <text
                  key={i}
                  x={l.x}
                  y={l.y}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontSize="10"
                  fontWeight="600"
                  fill={l.color}
                  letterSpacing="1.5"
                >
                  {COURSE_SHORT[l.course]?.toUpperCase()}
                </text>
              ))}
            </svg>
          </div>
          <aside className="graph-side">
            {focusedCard ? (
              <div className="gs-card">
                <div
                  className="gs-eyebrow"
                  style={{ color: COURSE_COLOR[focusedCard.course] }}
                >
                  {focusedCard.course}
                </div>
                <h3>{focusedCard.hook}</h3>
                <div className="gs-concept">— {focusedCard.concept}</div>
                <p className="gs-insight">{focusedCard.insight}</p>
                <div className="gs-rel">
                  <div className="gs-rel-lab">
                    연결된 카드 {focusedEdges.length}개
                  </div>
                  {focusedEdges.slice(0, 6).map((e, i) => {
                    const other = cards.find(
                      (c) => c.id === (e.a === focusedCard.id ? e.b : e.a)
                    );
                    if (!other) return null;
                    const col = COURSE_COLOR[other.course];
                    return (
                      <button
                        key={i}
                        className="gs-rel-item"
                        onClick={() => setFocus(other.id)}
                      >
                        <span
                          className="gs-rel-dot"
                          style={{ background: col }}
                        ></span>
                        <span className="gs-rel-hook">{other.hook}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  className="gs-open"
                  onClick={() => onOpen(focusedCard.id)}
                >
                  이 카드 열어서 5-step 보기 →
                </button>
              </div>
            ) : (
              <div className="gs-empty">
                <div className="gs-empty-eyebrow">SELECT</div>
                <p>오른쪽 캔버스의 노드를 클릭하면 그 개념의 연결망이 보인다.</p>
                <p>한 번 더 클릭하면 5-step 카드가 열린다.</p>
                <div className="gs-legend">
                  <div className="gs-legend-lab">범례</div>
                  <div className="gs-leg-row">
                    <span className="gs-leg-line solid"></span>같은 과목
                  </div>
                  <div className="gs-leg-row">
                    <span className="gs-leg-line dashed"></span>공유 영역·산업
                  </div>
                </div>
                <div className="gs-courses">
                  <div className="gs-legend-lab">과목 7</div>
                  {COURSES.map((c) => (
                    <div key={c} className="gs-course-row">
                      <span
                        className="gs-course-dot"
                        style={{ background: COURSE_COLOR[c] }}
                      ></span>
                      <span className="gs-course-name">
                        {COURSE_SHORT[c]}
                      </span>
                      <span className="gs-course-full">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
