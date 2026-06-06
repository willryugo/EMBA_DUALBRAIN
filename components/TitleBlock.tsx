"use client";
import { useState } from "react";
import { DBMark } from "./DBMark";
import members from "@/data/members.json";
import type { Industry } from "@/lib/types";

const COHORT_SIZE = members.length;
// 17기에 실제 존재하는 산업군 (빈도순) — "내가 속한 산업군" 선택지
const COHORT_INDUSTRY_LIST: string[] = (() => {
  const cnt: Record<string, number> = {};
  members.forEach((m) => {
    const k = (m.industry || "").trim();
    if (k) cnt[k] = (cnt[k] || 0) + 1;
  });
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
})();
const COHORT_INDUSTRIES = COHORT_INDUSTRY_LIST.length;

interface Props {
  todayLabel: string;
  totalCards: number;
  onEnter?: () => void; // 온톨로지 브레인맵(두 번째 뇌)으로 진입
  myIndustries?: Industry[];
  onToggleIndustry?: (ind: Industry) => void;
  bizMode?: "all" | "b2b" | "b2c";
  onBizMode?: (m: "all" | "b2b" | "b2c") => void;
}

const BIZ_OPTS: { k: "all" | "b2b" | "b2c"; label: string }[] = [
  { k: "all", label: "전체" },
  { k: "b2b", label: "B2B" },
  { k: "b2c", label: "B2C" },
];

export function TitleBlock({
  todayLabel,
  totalCards,
  onEnter,
  myIndustries = [],
  onToggleIndustry,
  bizMode = "all",
  onBizMode,
}: Props) {
  // 모바일: 산업군 칩을 접어두고(선택한 것만 표시) 펼치기/접기. 데스크탑은 CSS로 항상 펼침.
  const [indOpen, setIndOpen] = useState(false);
  return (
    <section className="title-block wrap">
      <div className="vol">
        <b>VOLUME 01</b>
      </div>
      <div className="title-row">
        <div className="title-stage">
          <div className="title-bgmark" aria-hidden="true">
            <DBMark size={420} animated />
          </div>
          <h1>
            <span className="t-emba">EMBA</span>{" "}
            <span className="t-dual">
              듀얼브레인<span className="period">.</span>
            </span>
          </h1>
        </div>
        <div className="title-by-block">
          <div className="tby-info">
            <span className="tby-i">by</span>
            <span className="tby-b">17기 학술국</span>
            <span className="tby-en">YONSEI EMBA 17 · ACADEMIC OFFICE</span>
          </div>
          {onEnter && (
            <button className="tby-enter" onClick={onEnter} type="button">
              <span className="tbe-inf" aria-hidden="true">∞</span>
              <span className="tbe-txt">
                <span className="tbe-emoji" aria-hidden="true">🧠</span> 브레인접속
              </span>
              <span className="tbe-sub">81장 인사이트 브레인맵 →</span>
            </button>
          )}
        </div>
      </div>
      <div className="byline">
        <span className="byline-by">52명의 두 번째 뇌</span>
      </div>
      <div className="title-lower">
      <p className="deck">
        <b>회의 30분 전, 다시 꺼내 쓴다.</b>
        <span className="deck-em-wrap">
          {" "}한 학기의 쓰나미가 한 줄의 결정으로 — 분석과 직관,{" "}
          <span className="deck-em">두 개의 뇌</span>가 만나는 곳.
        </span>
      </p>
      {onToggleIndustry ? (
        <div className="ind-pick">
          <div className="ind-pick-head">
            <span className="ind-pick-lab">내 산업군으로 보기</span>
            {onBizMode && (
              <div className="biz-seg" role="group" aria-label="비즈니스 형태">
                {BIZ_OPTS.map((o) => (
                  <button
                    key={o.k}
                    className={"biz-seg-btn" + (bizMode === o.k ? " on" : "")}
                    onClick={() => onBizMode(o.k)}
                    aria-pressed={bizMode === o.k}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            <span className="ind-pick-meta">
              {totalCards} 카드 · {COHORT_INDUSTRIES} 산업군
            </span>
          </div>
          <div className={"ind-pick-chips" + (indOpen ? " open" : "")}>
            <button
              className={"ind-pick-chip all" + (myIndustries.length === 0 ? " on" : "")}
              onClick={() => onToggleIndustry("__ALL__" as Industry)}
              aria-pressed={myIndustries.length === 0}
            >
              전체
            </button>
            {COHORT_INDUSTRY_LIST.map((ind) => {
              const on = myIndustries.includes(ind as Industry);
              return (
                <button
                  key={ind}
                  className={"ind-pick-chip" + (on ? " on" : "")}
                  onClick={() => onToggleIndustry(ind as Industry)}
                  aria-pressed={on}
                >
                  {ind}
                </button>
              );
            })}
            <button
              type="button"
              className="ind-pick-toggle"
              onClick={() => setIndOpen((o) => !o)}
              aria-expanded={indOpen}
            >
              {indOpen ? "접기 ▴" : "산업군 펼치기 ▾"}
            </button>
          </div>
          <div className="ind-pick-hint">
            {bizMode !== "all"
              ? `${bizMode.toUpperCase()} 관점 + ${myIndustries.length > 0 ? "선택 산업" : "전체"} 기준으로 추천·오늘의 질문이 맞춰집니다.`
              : myIndustries.length > 0
                ? "선택한 산업 기준으로 추천·처방·오늘의 질문이 맞춰집니다."
                : "산업군·B2B/B2C를 고르면 추천·처방·오늘의 질문이 맞춰집니다. (다시 누르면 해제)"}
          </div>
        </div>
      ) : (
        <div className="stats">
          <div className="s"><b>{totalCards}</b><span>인사이트 카드</span></div>
          <div className="s"><b>7</b><span>과목 · ONTOLOGY</span></div>
          <div className="s"><b>{COHORT_SIZE}</b><span>원우 · 작성자</span></div>
          <div className="s"><b>{COHORT_INDUSTRIES}</b><span>산업군</span></div>
        </div>
      )}
      </div>
    </section>
  );
}
