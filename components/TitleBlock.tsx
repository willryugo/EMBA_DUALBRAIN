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
}

export function TitleBlock({
  todayLabel,
  totalCards,
  onEnter,
  myIndustries = [],
  onToggleIndustry,
}: Props) {
  return (
    <section className="title-block wrap">
      <div className="vol">
        <b>VOLUME 01</b>
        <span className="dot"></span>
        <span>YONSEI EMBA 17기 학술국</span>
        <span className="dot"></span>
        <span>{todayLabel} ISSUE</span>
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
          <div className="title-sub">EMBA 17기의 두 번째 뇌</div>
        </div>
        <div className="title-by-block">
          {onEnter && (
            <button className="tby-enter" onClick={onEnter} type="button">
              <span className="tbe-inf" aria-hidden="true">∞</span>
              <span className="tbe-txt">듀얼브레인 접속</span>
              <span className="tbe-sub">81장 인사이트 브레인맵 →</span>
            </button>
          )}
          <span className="tby-i">by</span>
          <span className="tby-b">17기 학술국</span>
          <span className="tby-en">YONSEI EMBA 17 · ACADEMIC OFFICE</span>
        </div>
      </div>
      <div className="byline">
        <span className="byline-en">DUAL · BRAIN</span>
        <span className="byline-sep"></span>
        <span className="byline-by">VOL.01 · 52명의 두 번째 뇌</span>
      </div>
      <p className="deck">
        <b>회의 30분 전, 다시 꺼내 쓴다.</b>
        <span className="deck-em-wrap">
          <br />
          한 학기 학습의 쓰나미가, 결국 한 줄의 결정으로 남는 곳.
          <br />
          분석과 직관, <span className="deck-em">두 개의 뇌</span>가 만나는 곳.
        </span>
      </p>
      {onToggleIndustry ? (
        <div className="ind-pick">
          <div className="ind-pick-head">
            <span className="ind-pick-lab">내 산업군으로 보기</span>
            <span className="ind-pick-meta">
              {totalCards} 카드 · 7 과목 · {COHORT_SIZE} 원우 · {COHORT_INDUSTRIES} 산업군
            </span>
          </div>
          <div className="ind-pick-chips">
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
          </div>
          <div className="ind-pick-hint">
            {myIndustries.length > 0
              ? "선택한 산업 기준으로 추천·처방·오늘의 질문이 맞춰집니다."
              : "선택하면 추천·처방·오늘의 질문이 내 산업에 맞춰집니다. (다시 누르면 해제)"}
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
    </section>
  );
}
