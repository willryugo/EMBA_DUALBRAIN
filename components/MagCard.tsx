"use client";
import type { CSSProperties } from "react";
import type { Card } from "@/lib/types";
import { COURSE_COLOR, COURSE_SHORT, UNIVERSAL } from "@/lib/manifest";
import { DBMark } from "./DBMark";
import { rich } from "./rich";

export type Layout =
  | ""
  | "feat"
  | "stat"
  | "qt"
  | "spread"
  | "wide"
  | "manifesto";

interface Props {
  card: Card;
  index: number;
  layout: Layout;
  onClick: (id: string) => void;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}

// 케이스 타일 미니 프리뷰 — 핵심 수치 + 스파크라인. 그리드 자체를 풍부하게.
// 데스크톱·모바일 공용 (.case-preview 스타일은 globals.css — 전역 로드).
export function CasePreview({ card }: { card: Card }) {
  const m = card._metric;
  const spark = (card._spark || []).filter((v) => Number.isFinite(v));
  if (!m && spark.length < 2) return null;
  const max = Math.max(...spark, 1);
  return (
    <div className="case-preview">
      {spark.length >= 2 && (
        <div className="cp-spark" aria-hidden="true">
          {spark.slice(0, 7).map((v, i) => (
            <span
              key={i}
              className="cp-bar"
              style={{ height: Math.max(8, (v / max) * 100) + "%" }}
            />
          ))}
        </div>
      )}
      {m && (
        <div className="cp-metric">
          <span className="cp-label">{m.label}</span>
          <span className="cp-val">
            {m.from && (
              <>
                <i className="cp-from">{m.from}</i>
                <b className="cp-arrow">→</b>
              </>
            )}
            <em className={"cp-to tone-" + (m.tone || "neutral")}>{m.to}</em>
          </span>
        </div>
      )}
    </div>
  );
}

export function MagCard({ card, index, layout, onClick, saved, onToggleSave }: Props) {
  const color = COURSE_COLOR[card.course] || "#16150F";
  const isFeat = layout === "feat";
  const isStat = layout === "stat";
  const isSpread = layout === "spread";
  const isManifesto = layout === "manifesto";
  const className = "card " + (layout || "");
  const ind = (card.industry || [])
    .filter((x) => x !== UNIVERSAL)
    .slice(0, 2);
  const indStr = (card.industry || []).includes(UNIVERSAL)
    ? "범용 · 전 산업"
    : ind.join(" · ");

  const style = {
    "--c": color,
    animationDelay: Math.min(index, 16) * 0.04 + "s",
  } as CSSProperties;

  // 별표(저장) 토글 — 카드 우상단. 카드 클릭(모달 열기)과 분리.
  const star = onToggleSave ? (
    <button
      type="button"
      className={"card-save" + (saved ? " on" : "")}
      onClick={(e) => {
        e.stopPropagation();
        onToggleSave(card.id);
      }}
      aria-pressed={!!saved}
      title={saved ? "내 솔루션에서 빼기" : "내 솔루션에 저장"}
    >
      <span aria-hidden="true">{saved ? "★" : "☆"}</span>
    </button>
  ) : null;

  if (isStat) {
    const n = String(index + 1).padStart(2, "0");
    return (
      <article className={className} style={style} onClick={() => onClick(card.id)}>
        {star}
        <DBMark size={22} className="card-mark" />
        <div className="stat-n">{n}</div>
        <div className="stat-rule"></div>
        <div className="stat-meta">
          {COURSE_SHORT[card.course]} · WK{" "}
          {card.week ? String(card.week).padStart(2, "0") : "–"}
        </div>
        <h3>{card.concept}</h3>
        <p className="stat-hook">{rich(card.hook)}</p>
        <div className="foot">
          <div className="inds">{indStr || "범용"}</div>
          <div className="arrow">→</div>
        </div>
      </article>
    );
  }

  if (isSpread) {
    return (
      <article className={className} style={style} onClick={() => onClick(card.id)}>
        {star}
        <DBMark size={24} className="card-mark" />
        <div className="spread-marker">펼쳐 보기</div>
        <div className="spread-cols">
          <div className="spread-col l">
            <div className="sc-eyebrow">CONCEPT</div>
            <h3>{card.concept}</h3>
            <p className="sc-body">{card.insight}</p>
          </div>
          <div className="spread-sep"></div>
          <div className="spread-col r">
            <div className="sc-eyebrow">APPLICATION</div>
            <div className="sc-quote">&ldquo;{rich(card.hook)}&rdquo;</div>
            <p className="sc-body sc-app">{card.application}</p>
          </div>
        </div>
        <div className="spread-foot">
          <div className="meta">
            {card.course} · {card.professor || ""}
            {card.professor ? " 교수" : ""}
          </div>
          <div className="arrow">→ 5-step 솔루션 카드</div>
        </div>
      </article>
    );
  }

  if (isManifesto) {
    return (
      <article className={className} style={style} onClick={() => onClick(card.id)}>
        {star}
        <DBMark size={22} className="card-mark" />
        <div className="mf-rule"></div>
        <div className="mf-body">
          <div className="mf-eyebrow">MANIFESTO · 한 줄</div>
          <h3>{rich(card.hook)}</h3>
          <p className="mf-concept">— {card.concept}</p>
          <div className="mf-foot">
            <span className="mf-course">{COURSE_SHORT[card.course]}</span>
            <span className="mf-arrow">읽기 →</span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={className} style={style} onClick={() => onClick(card.id)}>
      {star}
      <DBMark size={26} className="card-mark" />
      {isFeat ? (
        <>
          <div className="colorblock"></div>
          <div className="crow">
            <div className="ccourse">
              {card.course} · {COURSE_SHORT[card.course]}
            </div>
            <div className="cnum">
              N°{String(index + 1).padStart(2, "0")} / FEATURE
            </div>
          </div>
          <h3>{rich(card.hook)}</h3>
          <div className="concept">{card.concept}</div>
          <p className="ins">{card.insight}</p>
          <div className="feat-bottom">
            <div className="meta">
              {card.professor ? card.professor + " 교수 · " : ""}
              {card.term}
              {card.week ? " · " + card.week + "주차" : ""}
            </div>
            <div className="arrow">5-step 솔루션 카드 →</div>
          </div>
        </>
      ) : (
        <>
          <div className="crow">
            {card._badge ? (
              <div className="ccourse case-badge">{card._badge}</div>
            ) : (
              <div className="ccourse">
                {COURSE_SHORT[card.course]}
                {card.week ? " · WK " + String(card.week).padStart(2, "0") : ""}
              </div>
            )}
            <div className="cnum">N°{String(index + 1).padStart(2, "0")}</div>
          </div>
          <h3>{rich(card.hook)}</h3>
          <div className="concept">{card.concept}</div>
          <p className="ins">{card.insight}</p>
          {card._badge && <CasePreview card={card} />}
          <div className="foot">
            <div className="inds">{indStr || "범용"}</div>
            <div className="arrow">{card._badge ? "케이스 →" : "→"}</div>
          </div>
        </>
      )}
    </article>
  );
}

// 12장 패턴 반복. 필터 활성 시 모두 normal로.
export function layoutClass(
  i: number,
  filterActive: boolean,
  allowQuote: boolean
): Layout {
  if (filterActive) return "";
  let pat: Layout[] = [
    "feat",
    "stat",
    "qt",
    "",
    "spread",
    "",
    "",
    "manifesto",
    "qt",
    "wide",
    "",
    "stat",
  ];
  if (!allowQuote) pat = pat.map((x) => (x === "qt" ? "" : x));
  return pat[i % pat.length];
}
