"use client";
import { useEffect, useRef, useState } from "react";
import type { CaseVisual } from "@/lib/types";

// 숫자 카운트업 — 앞뒤 단위(₩·$·조·억·%) 보존, 가운데 숫자만 0→target 애니메이션.
// 숫자 못 찾으면(예: "흑자전환") 원문 그대로. 모션 줄이기 설정이면 즉시 최종값.
function CountUp({ text }: { text: string }) {
  const m = /^(\D*?)(-?[\d,]+(?:\.\d+)?)(.*)$/.exec(text.trim());
  const target = m ? parseFloat(m[2].replace(/,/g, "")) : NaN;
  const decimals = m ? (m[2].split(".")[1] || "").length : 0;
  const [n, setN] = useState<number | null>(m ? 0 : NaN);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!m || Number.isNaN(target)) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(target); return; }
    let raf = 0;
    let start = 0;
    const dur = 850;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m || Number.isNaN(target)) return <>{text}</>;
  const shown =
    n === null
      ? m[2]
      : n.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  return (
    <span ref={ref}>
      {m[1]}
      {shown}
      {m[3]}
    </span>
  );
}

// 케이스 '한눈에' 비주얼 — 텍스트보다 그림 먼저. 자가완결 div/CSS 막대.
// featured=true → 첫 화면 히어로용 대형 변형(.cv-featured).
export function CaseVisualView({
  visual,
  color,
  featured,
}: {
  visual: CaseVisual;
  color: string;
  featured?: boolean;
}) {
  const styleC = { ["--c" as string]: color } as React.CSSProperties;
  const cvClass = "cv" + (featured ? " cv-featured" : "");

  // ── 신약 R&D 포트폴리오: 매출↔기대이익 역전 + 조합 비교 ──
  if (visual.kind === "rnd-portfolio" && visual.projects) {
    const projects = visual.projects;
    const maxRev = Math.max(...projects.map((p) => p.revenue), 1);
    const maxEv = Math.max(...projects.map((p) => p.ev), 1);
    const combos = visual.combos || [];
    const maxCombo = Math.max(...combos.map((c) => c.ev), 1);
    // 순위 역전을 드러내기 위한 랭킹(1=최고). 매출 순위 ↔ 기대이익 순위.
    const revRank = new Map(
      [...projects].sort((a, b) => b.revenue - a.revenue).map((p, i) => [p.id, i + 1])
    );
    const evRank = new Map(
      [...projects].sort((a, b) => b.ev - a.ev).map((p, i) => [p.id, i + 1])
    );
    return (
      <div className={cvClass} style={styleC}>
        {visual.headline && <div className="cv-headline">{visual.headline}</div>}

        <div className="cv-block">
          <div className="cv-block-lab">프로젝트별 · 성공 시 매출 ↔ 기대이익(확률 반영)</div>
          <div className="cv-legend">
            <span className="lg rev">■ 성공 시 매출</span>
            <span className="lg ev">■ 기대이익 = 매출 × 확률 − 비용</span>
          </div>
          {projects.map((p) => {
            const rr = revRank.get(p.id)!;
            const er = evRank.get(p.id)!;
            const drop = er - rr; // 양수 = 매출 대비 기대이익 순위 하락(함정)
            const trap = !p.pick && drop >= 2; // 매출 높지만 확률 낮아 밀린 함정
            return (
              <div
                key={p.id}
                className={
                  "cv-prow" + (p.pick ? " pick" : "") + (trap ? " trap" : "")
                }
              >
                <div className="cv-pname">
                  <b>{p.id}</b> {p.name}
                  <span className="cv-prob">성공 {p.prob}%</span>
                  {p.pick && <span className="cv-pickflag">최적해 ✓</span>}
                  {trap && <span className="cv-trapflag">매출의 함정 ✕</span>}
                </div>
                <div className="cv-twobar">
                  <div className="cv-bar">
                    <span className="cv-axislab">매출</span>
                    <div className="cv-fill rev" style={{ width: (p.revenue / maxRev) * 100 + "%" }}>
                      <span className="cv-rank rev">{rr}위</span>
                    </div>
                    <span className="cv-val"><CountUp text={p.revenue.toLocaleString()} /></span>
                  </div>
                  <div className="cv-bar">
                    <span className="cv-axislab">EV</span>
                    <div className="cv-fill ev" style={{ width: (p.ev / maxEv) * 100 + "%" }}>
                      <span className="cv-rank ev">{er}위</span>
                    </div>
                    <span className="cv-val"><CountUp text={String(p.ev)} /></span>
                  </div>
                </div>
                {drop !== 0 && (
                  <div className={"cv-flip " + (drop > 0 ? "down" : "up")}>
                    매출 <b>{rr}위</b> <span className="cv-flip-arrow">→</span> 기대이익 <b>{er}위</b>
                    <span className="cv-flip-tag">
                      {drop > 0 ? `${drop}계단 추락` : `${-drop}계단 상승`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
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
      <div className={cvClass} style={styleC}>
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

  // ── 타임라인 (사건 전개 — 케이스의 첫 장면) ──
  if (visual.kind === "timeline" && visual.events) {
    return (
      <div className={cvClass} style={styleC}>
        {visual.headline && <div className="cv-headline">{visual.headline}</div>}
        <div className="cv-block">
          <div className="cv-tl">
            {visual.events.map((e, i) => (
              <div key={i} className={"cv-tlrow tone-" + (e.tone || "neutral")}>
                <div className="cv-tldate">{e.date}</div>
                <div className="cv-tldot" />
                <div className="cv-tlbody">
                  <div className="cv-tltitle">{e.title}</div>
                  {e.desc && <div className="cv-tldesc">{e.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 스탯 변화 (극적 수치 from→to) ──
  if (visual.kind === "stat-delta" && visual.deltas) {
    return (
      <div className={cvClass} style={styleC}>
        {visual.headline && <div className="cv-headline">{visual.headline}</div>}
        <div className="cv-block">
          <div className="cv-deltas">
            {visual.deltas.map((d, i) => (
              <div key={i} className={"cv-delta tone-" + (d.tone || "neutral")}>
                <div className="cv-dlabel">{d.label}</div>
                <div className="cv-drow">
                  <span className="cv-dfrom">{d.from}</span>
                  <span className="cv-darrow">→</span>
                  <span className="cv-dto"><CountUp text={d.to} /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 인물·후보·렌즈 비교 카드 ──
  if (visual.kind === "persona-grid" && visual.personas) {
    return (
      <div className={cvClass} style={styleC}>
        {visual.headline && <div className="cv-headline">{visual.headline}</div>}
        <div className="cv-block">
          <div className="cv-personas">
            {visual.personas.map((p, i) => (
              <div key={i} className={"cv-persona" + (p.pick ? " pick" : "")}>
                <div className="cv-pphead">
                  <span className="cv-ppname">{p.name}</span>
                  {p.pick && <span className="cv-pppick">선택 ✓</span>}
                </div>
                {p.tag && <div className="cv-pptag">{p.tag}</div>}
                {p.strength && (
                  <div className="cv-ppline good">
                    <span className="cv-ppmk">＋</span>
                    {p.strength}
                  </div>
                )}
                {p.risk && (
                  <div className="cv-ppline bad">
                    <span className="cv-ppmk">－</span>
                    {p.risk}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 갈림길 (양자택일) ──
  if (visual.kind === "fork" && visual.options) {
    return (
      <div className={cvClass} style={styleC}>
        {visual.headline && <div className="cv-headline">{visual.headline}</div>}
        <div className="cv-block">
          {visual.forkQuestion && <div className="cv-forkq">{visual.forkQuestion}</div>}
          <div className="cv-fork">
            {visual.options.map((o, i) => (
              <div key={i} className={"cv-forkopt" + (o.chosen ? " chosen" : "")}>
                {o.chosen && <div className="cv-forkflag">17기의 선택</div>}
                <div className="cv-forklabel">{o.label}</div>
                {o.sub && <div className="cv-forksub">{o.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 제약조건 통과 + 최적성 (왜 이 결정이 최적인가) ──
  if (visual.kind === "constraint-check" && visual.constraints) {
    return (
      <div className={cvClass} style={styleC}>
        {visual.headline && <div className="cv-headline">{visual.headline}</div>}
        <div className="cv-block">
          <div className="cv-checks">
            {visual.constraints.map((c, i) => (
              <div key={i} className={"cv-check" + (c.ok ? " ok" : " no")}>
                <span className="cv-ck-mark">{c.ok ? "✓" : "✕"}</span>
                <span className="cv-ck-label">{c.label}</span>
                <span className="cv-ck-expr">{c.check}</span>
              </div>
            ))}
          </div>
          {visual.verdict && <div className="cv-verdict">{visual.verdict}</div>}
        </div>
      </div>
    );
  }

  // ── 악순환 / 선순환 루프 (구조적 반복 — 텍스트로만 있던 고리를 한 컷에) ──
  if (visual.kind === "cycle" && visual.steps2 && visual.steps2.length > 0) {
    const steps = visual.steps2;
    const vicious = visual.cycleKind !== "virtuous";
    return (
      <div className={cvClass} style={styleC}>
        {visual.headline && <div className="cv-headline">{visual.headline}</div>}
        <div className="cv-block">
          <div className={"cv-cyc " + (vicious ? "vicious" : "virtuous")}>
            <div className="cv-cyc-tag">{vicious ? "악순환 ↻" : "선순환 ↻"}</div>
            {steps.map((s, i) => (
              <div key={i} className="cv-cycrow">
                <div className="cv-cycnode">
                  <span className="cv-cycn">{i + 1}</span>
                  <div className="cv-cycbody">
                    <div className="cv-cyclabel">{s.label}</div>
                    {s.note && <div className="cv-cycnote">{s.note}</div>}
                  </div>
                </div>
                <div className="cv-cycarrow">{i === steps.length - 1 ? "↺ 다시 처음으로" : "↓"}</div>
              </div>
            ))}
          </div>
          {visual.cycleBreak && (
            <div className="cv-cycbreak">
              <span className="cv-cycbreak-mk">✂</span>
              {visual.cycleBreak}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
