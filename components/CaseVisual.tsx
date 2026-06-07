"use client";
import type { CaseVisual } from "@/lib/types";

// 케이스 '한눈에' 비주얼 — 텍스트보다 그림 먼저. 자가완결 div/CSS 막대.
export function CaseVisualView({ visual, color }: { visual: CaseVisual; color: string }) {
  const styleC = { ["--c" as string]: color } as React.CSSProperties;

  // ── 신약 R&D 포트폴리오: 매출↔기대이익 역전 + 조합 비교 ──
  if (visual.kind === "rnd-portfolio" && visual.projects) {
    const projects = visual.projects;
    const maxRev = Math.max(...projects.map((p) => p.revenue), 1);
    const maxEv = Math.max(...projects.map((p) => p.ev), 1);
    const combos = visual.combos || [];
    const maxCombo = Math.max(...combos.map((c) => c.ev), 1);
    return (
      <div className="cv" style={styleC}>
        {visual.headline && <div className="cv-headline">{visual.headline}</div>}

        <div className="cv-block">
          <div className="cv-block-lab">프로젝트별 · 성공 시 매출 ↔ 기대이익(확률 반영)</div>
          <div className="cv-legend">
            <span className="lg rev">■ 성공 시 매출</span>
            <span className="lg ev">■ 기대이익 = 매출 × 확률 − 비용</span>
          </div>
          {projects.map((p) => (
            <div key={p.id} className={"cv-prow" + (p.pick ? " pick" : "")}>
              <div className="cv-pname">
                <b>{p.id}</b> {p.name}
                <span className="cv-prob">성공 {p.prob}%</span>
                {p.pick && <span className="cv-pickflag">최적해 ✓</span>}
              </div>
              <div className="cv-twobar">
                <div className="cv-bar">
                  <div className="cv-fill rev" style={{ width: (p.revenue / maxRev) * 100 + "%" }} />
                  <span className="cv-val">{p.revenue.toLocaleString()}</span>
                </div>
                <div className="cv-bar">
                  <div className="cv-fill ev" style={{ width: (p.ev / maxEv) * 100 + "%" }} />
                  <span className="cv-val">{p.ev}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {combos.length > 0 && (
          <div className="cv-block">
            <div className="cv-block-lab">실현 가능 조합 · 기대이익(억) — ★ 최적해</div>
            {combos.map((c) => (
              <div key={c.label} className={"cv-crow" + (c.optimal ? " opt" : "")}>
                <div className="cv-clabel">
                  {c.optimal && "★ "}
                  {c.label}
                </div>
                <div className="cv-bar">
                  <div className="cv-fill combo" style={{ width: (c.ev / maxCombo) * 100 + "%" }} />
                  <span className="cv-val">{c.ev}</span>
                </div>
                <div className="cv-ccost">{c.cost}억</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── 범용 점수/대조 막대 (예: 360도 평가) ──
  if (visual.bars && visual.bars.length > 0) {
    const max = Math.max(...visual.bars.map((b) => b.max || b.value), 1);
    return (
      <div className="cv" style={styleC}>
        {visual.headline && <div className="cv-headline">{visual.headline}</div>}
        <div className="cv-block">
          {visual.bars.map((b, i) => (
            <div key={i} className="cv-srow">
              <div className="cv-slabel">
                {b.label}
                <span className="cv-sval">{b.value}{b.note ? " · " + b.note : ""}</span>
              </div>
              <div className="cv-bar">
                <div
                  className={"cv-fill " + (b.tone === "bad" ? "bad" : b.tone === "good" ? "good" : "scored")}
                  style={{ width: (b.value / (b.max || max)) * 100 + "%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
