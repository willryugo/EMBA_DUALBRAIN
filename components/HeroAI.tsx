"use client";
import { useEffect, useRef, useState } from "react";
import type { Card, Industry, OwnerPainCategory } from "@/lib/types";
import { COURSE_COLOR, COURSE_SHORT } from "@/lib/manifest";
import { recommendCards, type RecommendResult } from "@/lib/recommend";
import { logEvent } from "@/lib/events";

interface Props {
  cards: Card[];
  ownerPains: OwnerPainCategory[];
  myIndustries: Industry[];
  onOpen: (id: string) => void;
}

export function HeroAI({ cards, ownerPains, myIndustries, onOpen }: Props) {
  const [val, setVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [activeCat, setActiveCat] = useState(0);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 200) + "px";
    }
  }, [val]);

  const doAsk = (text?: string) => {
    const q = (text ?? val).trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    // Phase 1: 동기 fallback (keyword 매칭만). 짧게 지연 줘서 UI 피드백.
    setTimeout(() => {
      const r = recommendCards(q, cards, myIndustries);
      setResult(r);
      setLoading(false);
      logEvent("question_asked", {
        query_text: q,
        matched_card_ids: r.ids,
        fallback_used: true,
      });
      setTimeout(() => {
        document
          .querySelector(".airesult")
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 80);
    }, 160);
  };

  const usePain = (pain: string) => {
    setVal(pain);
    setTimeout(() => doAsk(pain), 80);
  };

  const recCards = result
    ? result.ids
        .map((id) => cards.find((c) => c.id === id))
        .filter((c): c is Card => Boolean(c))
    : [];

  const relatedCards = result
    ? result.relatedIds
        .map((id) => cards.find((c) => c.id === id))
        .filter((c): c is Card => Boolean(c))
    : [];

  return (
    <div className="aibox">
      <div className="l1">회의 30분 전. 손이 떨릴 때.</div>
      <h3>
        지금 이 고민, <mark>수업에서 본 적이 있다.</mark>
      </h3>
      <textarea
        ref={taRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="당신의 회의의 진짜 문제를 한 줄로 써보세요. 두 번째 뇌가 81장 인사이트 중 가장 가까운 3장을 추천드립니다."
        rows={1}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            doAsk();
          }
        }}
      />
      <div className="row">
        <button
          className="go"
          onClick={() => doAsk()}
          disabled={loading || !val.trim()}
        >
          {loading ? (
            <>
              <span className="dots">
                <span></span>
                <span></span>
                <span></span>
              </span>{" "}
              두 번째 뇌가 찾는 중
            </>
          ) : (
            <>
              두 번째 뇌에게 묻기{" "}
              <svg viewBox="0 0 24 24">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>

      <div className="pain-section">
        <div className="pain-head">
          <div className="ph-eyebrow">C레벨의 고민들 · C-SUITE DESK</div>
          <div className="ph-lead">
            오늘 누군가의 임원회의에 올라온 진짜 질문. 클릭하면 관련 인사이트
            3장이 뜬다.
          </div>
        </div>
        <div className="pain-tabs">
          {ownerPains.map((c, i) => (
            <button
              key={c.cat}
              className={"pain-tab " + (activeCat === i ? "on" : "")}
              onClick={() => setActiveCat(i)}
              style={{ ["--pc" as string]: c.color } as React.CSSProperties}
            >
              <span className="pt-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="pt-k">{c.cat}</span>
              <span className="pt-e">{c.catE}</span>
            </button>
          ))}
        </div>
        <div className="pain-items">
          {ownerPains[activeCat].items.map((p, i) => (
            <button
              key={i}
              className="pain-item"
              onClick={() => usePain(p)}
              style={
                { ["--pc" as string]: ownerPains[activeCat].color } as React.CSSProperties
              }
            >
              <span className="pi-dot"></span>
              <span className="pi-text">{p}</span>
              <span className="pi-arrow">→</span>
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="airesult">
          <div className="reason">
            <b>두 번째 뇌:</b> {result.reason}
          </div>

          {(result.expansions.length > 0 || result.inferredDomain) && (
            <div className="ai-expand">
              {result.inferredDomain && (
                <span className="ai-exp-chip dom">
                  <span className="ai-exp-k">도메인</span>
                  {result.inferredDomain}
                </span>
              )}
              {result.expansions.map((e) => (
                <span key={e} className="ai-exp-chip">
                  {e}
                </span>
              ))}
            </div>
          )}

          <div className="cards">
            {recCards.map((c, i) => {
              const col = COURSE_COLOR[c.course];
              return (
                <button
                  key={c.id}
                  className="ai-card"
                  style={{ ["--c" as string]: col } as React.CSSProperties}
                  onClick={() => onOpen(c.id)}
                >
                  <div className="n">REC · 0{i + 1}</div>
                  <div className="ah">{c.hook}</div>
                  <div className="ac">
                    {COURSE_SHORT[c.course]} · {c.concept}
                  </div>
                </button>
              );
            })}
          </div>

          {relatedCards.length > 0 && (
            <div className="ai-related">
              <div className="ai-related-head">
                혹시 이런 카드도?{" "}
                <span className="ai-related-sub">
                  {myIndustries[0]
                    ? `${myIndustries[0]} 가중치 반영`
                    : "관련도 순"}
                </span>
              </div>
              <div className="ai-related-chips">
                {relatedCards.map((c) => {
                  const col = COURSE_COLOR[c.course];
                  return (
                    <button
                      key={c.id}
                      className="ai-related-chip"
                      style={{ ["--c" as string]: col } as React.CSSProperties}
                      onClick={() => onOpen(c.id)}
                      title={`${COURSE_SHORT[c.course]} · ${c.concept}`}
                    >
                      <span className="arc-dot" />
                      <span className="arc-hook">{c.hook}</span>
                      <span className="arc-meta">{COURSE_SHORT[c.course]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
