"use client";
import { useState } from "react";
import members from "@/data/members.json";
import type { Industry } from "@/lib/types";

const COHORT_INDUSTRY_LIST: string[] = (() => {
  const cnt: Record<string, number> = {};
  members.forEach((m) => {
    const k = (m.industry || "").trim();
    if (k) cnt[k] = (cnt[k] || 0) + 1;
  });
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
})();

const BIZ_OPTS: { k: "all" | "b2b" | "b2c"; label: string }[] = [
  { k: "all", label: "전체" },
  { k: "b2b", label: "B2B" },
  { k: "b2c", label: "B2C" },
];

interface Props {
  totalCards: number;
  myIndustries: Industry[];
  onToggleIndustry: (ind: Industry) => void;
  bizMode: "all" | "b2b" | "b2c";
  onBizMode: (m: "all" | "b2b" | "b2c") => void;
  className?: string;
}

export function IndustryFilter({
  totalCards,
  myIndustries,
  onToggleIndustry,
  bizMode,
  onBizMode,
  className,
}: Props) {
  const [indOpen, setIndOpen] = useState(false);
  const cls = ["ind-pick", "ind-pick-bar", className].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <div className="ind-pick-head">
        <span className="ind-pick-lab">내 산업군으로 보기</span>
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
        <span className="ind-pick-meta">
          {totalCards} 카드 · {COHORT_INDUSTRY_LIST.length} 산업군
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
          ? `${bizMode.toUpperCase()} 관점 + ${myIndustries.length > 0 ? "선택 산업" : "전체"} 기준으로 추천·처방·오늘의 질문이 맞춰집니다.`
          : myIndustries.length > 0
            ? "선택한 산업 기준으로 추천·처방·오늘의 질문이 맞춰집니다."
            : "산업군·B2B/B2C를 고르면 추천·처방·오늘의 질문이 맞춰집니다. (다시 누르면 해제)"}
      </div>
    </div>
  );
}
