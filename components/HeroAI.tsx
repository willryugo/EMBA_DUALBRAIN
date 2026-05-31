"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, Industry, OwnerPainCategory } from "@/lib/types";
import { COURSE_COLOR, COURSE_SHORT } from "@/lib/manifest";
import { recommendCards, type RecommendResult } from "@/lib/recommend";
import { logEvent } from "@/lib/events";

// 접속 시각(일·시간)과 내 산업으로 만드는 결정적 시드 — 매 접속/매 시간 '오늘의 질문'이 달라진다.
function makeSeed(myIndustries: Industry[]): number {
  const d = new Date();
  const base = d.getFullYear() * 100000 + (d.getMonth() + 1) * 1000 + d.getDate() * 24 + d.getHours();
  let s = base;
  for (const ind of myIndustries) for (let i = 0; i < ind.length; i++) s = (s * 31 + ind.charCodeAt(i)) >>> 0;
  return s >>> 0;
}
// 시드 기반 회전 — 배열을 시드만큼 회전시켜 매번 다른 순서로 노출
function rotate<T>(arr: T[], by: number): T[] {
  if (arr.length === 0) return arr;
  const k = ((by % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}

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
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // 접속/시간/산업 시드로 '오늘의 질문'을 회전 — 카테고리 순서·각 항목 순서·기본 탭이 매번 달라진다.
  const seed = useMemo(() => makeSeed(myIndustries), [myIndustries]);
  const rotatedPains = useMemo<OwnerPainCategory[]>(
    () =>
      rotate(ownerPains, seed).map((c, ci) => ({
        ...c,
        items: rotate(c.items, seed + ci * 7),
      })),
    [ownerPains, seed]
  );
  const [activeCat, setActiveCat] = useState(0);
  // 시드가 바뀌면(시간 경과·산업 변경) 기본 탭도 회전
  useEffect(() => {
    setActiveCat(0);
  }, [seed]);

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
      <div className={"aibox-search" + (val.trim() ? " filled" : "")}>
        <svg className="aibox-search-ico" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <textarea
          ref={taRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="듀얼브레인에 무엇이든 물어보세요 — 회의의 진짜 고민을 한 줄로"
          rows={1}
          onKeyDown={(e) => {
            // Enter = 즉시 검색, Shift+Enter = 줄바꿈
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              doAsk();
            }
          }}
        />
      </div>
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
          <div className="ph-eyebrow">
            C레벨의 고민들 · C-SUITE DESK
            <span className="ph-rotate">
              {myIndustries.length > 0
                ? `· ${myIndustries[0]} 맞춤`
                : "· 접속할 때마다 새로고침"}
            </span>
          </div>
          <div className="ph-lead">
            오늘 누군가의 임원회의에 올라온 진짜 질문. 클릭하면 관련 인사이트
            3장이 뜬다.
          </div>
        </div>
        <div className="pain-tabs">
          {rotatedPains.map((c, i) => (
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
          {(rotatedPains[activeCat]?.items ?? []).map((p, i) => (
            <button
              key={i}
              className="pain-item"
              onClick={() => usePain(p)}
              style={
                { ["--pc" as string]: rotatedPains[activeCat]?.color } as React.CSSProperties
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
