"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, Industry } from "@/lib/types";
import { COURSE_COLOR, COURSE_SHORT } from "@/lib/manifest";
import { store } from "@/lib/storage";
import { logEvent } from "@/lib/events";
import {
  getJourney,
  resolveResultAdvice,
  resultIndustries,
  type CardJourney,
} from "@/lib/journey";
import { getVisual, toneGradient } from "@/lib/visuals";

interface Props {
  cardId: string;
  cards: Card[];
  onClose: () => void;
  onOpen: (id: string) => void;
}

// 진짜 5why 카드뉴스 — T타임즈식 밝은 레이아웃 (상단 이미지 + 하단 텍스트).
// 슬라이드: 표지(증상) → Why1~3(고정) → Why4(선택) → Why5(산업별 처방) → 추천(open ending)
export function CardCarousel({ cardId, cards, onClose, onOpen }: Props) {
  const card = useMemo(() => cards.find((c) => c.id === cardId), [cardId, cards]);
  const journey = useMemo<CardJourney | null>(() => getJourney(cardId), [cardId]);
  const visual = useMemo(() => getVisual(cardId), [cardId]);
  const myIndustries = useMemo<Industry[]>(
    () => (store.get<Industry[]>("emba17_my_industries") || []) as Industry[],
    []
  );
  const color = card ? COURSE_COLOR[card.course] || "#16150F" : "#16150F";

  // 슬라이드: cover + steps + recommend
  const slideCount = journey ? journey.steps.length + 2 : 1; // 표지 + N단계 + 추천

  const [idx, setIdx] = useState(0);
  const [imgFail, setImgFail] = useState(false);
  const [pickTag, setPickTag] = useState<string | null>(null);
  const [overrideInd, setOverrideInd] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setIdx(0);
    setImgFail(false);
    setPickTag(null);
    setOverrideInd(null);
    setSaved(((store.get<string[]>("emba17_saved") || []) as string[]).includes(cardId));
    if (cardId) logEvent("carousel_open", { card_id: cardId });
  }, [cardId]);

  const go = (d: number) => setIdx((i) => Math.max(0, Math.min(slideCount - 1, i + d)));

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, slideCount]);

  const touch = useRef({ x: 0, y: 0 });
  const onTS = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTE = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  if (!card) return null;

  const heroSrc = visual && !imgFail ? visual.hero : null;
  const heroBg = visual ? toneGradient(visual) : "linear-gradient(145deg,#ece5d6,#cbb9a6)";
  // 슬라이드별 이미지 — slides[idx] 있으면 사용, 없으면 hero 재사용
  const slideSrc =
    visual && !imgFail ? (visual.slides?.[idx] ?? visual.hero) : null;

  const toggleSave = () => {
    const cur = (store.get<string[]>("emba17_saved") || []) as string[];
    const next = cur.includes(cardId) ? cur.filter((x) => x !== cardId) : [...cur, cardId];
    store.set("emba17_saved", next);
    setSaved(next.includes(cardId));
  };

  // ── journey 없는 카드: 간단 폴백 (표지만) ──
  if (!journey) {
    return (
      <div
        className="ttn-overlay"
        onClick={(e) => {
          if ((e.target as HTMLElement).classList.contains("ttn-overlay")) onClose();
        }}
      >
        <div className="ttn-card" style={{ ["--c" as string]: color } as React.CSSProperties}>
          <button className="ttn-x" onClick={onClose}>✕</button>
          <div className="ttn-pic" style={{ background: heroBg }}>
            {heroSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="ttn-img" src={heroSrc} alt="" onError={() => setImgFail(true)} />
            )}
          </div>
          <div className="ttn-body">
            <div className="ttn-eyebrow">{COURSE_SHORT[card.course]}</div>
            <h1 className="ttn-cover-h">{card.hook}</h1>
            <p className="ttn-cover-sub">{card.insight}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 슬라이드 종류 결정 ──
  // idx 0 = 표지, 1..steps.length = 각 why, 마지막 = 추천
  const isCover = idx === 0;
  const isRecommend = idx === slideCount - 1;
  const step = !isCover && !isRecommend ? journey.steps[idx - 1] : null;

  // 결과(마지막 why)용 처방
  const resultTag = pickTag || Object.keys(journey.results)[0];
  const result = journey.results[resultTag];
  const advice = result ? resolveResultAdvice(result, myIndustries) : null;
  const shownInd = overrideInd ?? advice?.matchedIndustry ?? null;
  const adviceText =
    overrideInd && result?.byIndustry[overrideInd]
      ? result.byIndustry[overrideInd]
      : advice?.text ?? "";
  const otherInds = result ? resultIndustries(result) : [];

  const relatedCardsResolved = journey.related
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean) as Card[];

  return (
    <div
      className="ttn-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("ttn-overlay")) onClose();
      }}
    >
      <div
        className="ttn-card"
        style={{ ["--c" as string]: color } as React.CSSProperties}
        onTouchStart={onTS}
        onTouchEnd={onTE}
      >
        <button className="ttn-x" onClick={onClose} aria-label="닫기">✕</button>

        {/* 진행바 */}
        <div className="ttn-progress">
          {Array.from({ length: slideCount }).map((_, i) => (
            <span key={i} className={"ttn-seg " + (i <= idx ? "on" : "")} onClick={() => setIdx(i)} />
          ))}
        </div>

        {/* 상단 이미지 (슬라이드별) — 부드러운 페이드인 */}
        <div className="ttn-pic" style={{ background: heroBg }}>
          {slideSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={slideSrc}
              className="ttn-img ttn-img-fade"
              src={slideSrc}
              alt=""
              onError={() => setImgFail(true)}
            />
          )}
          {!isCover && (
            <div className="ttn-pic-tag">
              {isRecommend ? "다음으로" : `${step?.n}Why`}
            </div>
          )}
        </div>

        {/* 하단 텍스트 (밝은 배경) */}
        <div className="ttn-body">
          {/* 표지 */}
          {isCover && (
            <>
              <div className="ttn-eyebrow">
                {COURSE_SHORT[card.course]} · 5WHY
              </div>
              <h1 className="ttn-cover-h">{journey.symptom}</h1>
              {journey.symptomSub && <p className="ttn-cover-sub">{journey.symptomSub}</p>}
            </>
          )}

          {/* Why 단계 */}
          {step && !step.isResult && (
            <>
              <div className="ttn-step-lab">
                <span className="ttn-step-n">{step.n}<i>Why</i></span>
              </div>
              <h2 className="ttn-why">{step.why}</h2>
              {step.pick ? (
                <div className="ttn-pick">
                  <div className="ttn-pick-q">{step.pick.q}</div>
                  {step.pick.options.map((o) => (
                    <button
                      key={o.tag}
                      className={"ttn-opt " + (pickTag === o.tag ? "on" : "")}
                      onClick={() => {
                        setPickTag(o.tag);
                        setOverrideInd(null);
                        logEvent("journey_pick", { card_id: cardId, tag: o.tag });
                        setTimeout(() => go(1), 220);
                      }}
                    >
                      <span>{o.label}</span>
                      <span className="ttn-opt-arr">→</span>
                    </button>
                  ))}
                  {pickTag && step.becauseByTag?.[pickTag] && (
                    <p className="ttn-because ttn-because-pick">{step.becauseByTag[pickTag]}</p>
                  )}
                </div>
              ) : (
                <>
                  <p className="ttn-because">{step.because}</p>
                  {step.keyword && <div className="ttn-keyword">{step.keyword}</div>}
                </>
              )}
            </>
          )}

          {/* 마지막 Why = 산업별 처방 결과 */}
          {step && step.isResult && (
            <>
              <div className="ttn-step-lab">
                <span className="ttn-step-n">{step.n}<i>Why</i></span>
              </div>
              <h2 className="ttn-why">{step.why}</h2>
              {result && (
                <>
                  <div className="ttn-verdict">{result.verdict}</div>
                  <div className="ttn-rx">
                    <div className="ttn-rx-head">
                      {shownInd ? (
                        <>
                          <span className="ttn-rx-tag">내 산업 처방</span>
                          <span className="ttn-rx-ind">{shownInd}</span>
                        </>
                      ) : (
                        <span className="ttn-rx-tag">기본 처방</span>
                      )}
                    </div>
                    <p>{adviceText}</p>
                  </div>
                  {otherInds.length > 1 && (
                    <div className="ttn-others">
                      <span className="ttn-others-lab">다른 산업이라면?</span>
                      {otherInds.map((ind) => (
                        <button
                          key={ind}
                          className={"ttn-othchip " + (ind === shownInd ? "on" : "")}
                          onClick={() => setOverrideInd(ind)}
                        >
                          {ind}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* 추천 (open ending) */}
          {isRecommend && (
            <>
              <div className="ttn-eyebrow">이 카드와 연결된 두 번째 뇌</div>
              <h2 className="ttn-rec-h">다음엔, 이 카드</h2>
              <div className="ttn-recs">
                {relatedCardsResolved.map((r) => (
                  <button key={r.id} className="ttn-rec" onClick={() => onOpen(r.id)}>
                    <span className="ttn-rec-course" style={{ color: COURSE_COLOR[r.course] }}>
                      {COURSE_SHORT[r.course]}
                    </span>
                    <span className="ttn-rec-hook">{r.hook}</span>
                    <span className="ttn-rec-arr">→</span>
                  </button>
                ))}
              </div>
              <button className={"ttn-save " + (saved ? "on" : "")} onClick={toggleSave}>
                {saved ? "★ 저장됨" : "☆ 이 솔루션 저장"}
              </button>
            </>
          )}
        </div>

        {/* 브랜드 + 네비 */}
        <div className="ttn-foot">
          <span className="ttn-brand">DUALBRAIN · EMBA 17</span>
          <div className="ttn-nav">
            <button className="ttn-arrow" onClick={() => go(-1)} disabled={idx === 0} aria-label="이전">‹</button>
            <span className="ttn-page">{idx + 1} / {slideCount}</span>
            <button className="ttn-arrow" onClick={() => go(1)} disabled={idx === slideCount - 1} aria-label="다음">›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
