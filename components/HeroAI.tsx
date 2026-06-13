"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, Industry, OwnerPainCategory } from "@/lib/types";
import { COURSE_COLOR, COURSE_SHORT } from "@/lib/manifest";
import { type RecommendResult } from "@/lib/recommend";
import { logEvent } from "@/lib/events";
import { rich } from "./rich";
import { useSmartAsk } from "./useSmartAsk";
import { useRotatingExample } from "./useRotatingExample";
import { IndustryFilter } from "./IndustryFilter";

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
  bizMode?: "all" | "b2b" | "b2c";
  onOpen: (id: string) => void;
  onToggleIndustry?: (ind: Industry) => void;
  onBizMode?: (m: "all" | "b2b" | "b2c") => void;
  totalCards?: number;
}

export function HeroAI({ cards, ownerPains, myIndustries, bizMode = "all", onOpen, onToggleIndustry, onBizMode, totalCards }: Props) {
  const [val, setVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const placeholder = useRotatingExample(!!val.trim());
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [activePain, setActivePain] = useState<string | null>(null);
  // 방문할 때마다 질문이 새로 섞이게 — 마운트 후 client에서만(하이드레이션 안전).
  useEffect(() => {
    const n = typeof performance !== "undefined" ? performance.now() : 1;
    setRefreshNonce((Math.floor(n * 1000) % 100000) + 1);
  }, []);

  // 접속/시간/산업 시드로 '오늘의 질문'을 회전 — 카테고리 순서·각 항목 순서·기본 탭이 매번 달라진다.
  const seed = useMemo(
    () =>
      (makeSeed(myIndustries) ^
        (bizMode === "b2b" ? 0x9e37 : bizMode === "b2c" ? 0x85eb : 0) ^
        refreshNonce) >>>
      0,
    [myIndustries, bizMode, refreshNonce]
  );
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

  const { semantic, toggle, dl, runAsk } = useSmartAsk(cards, myIndustries);

  const doAsk = (text?: string) => {
    const q = (text ?? val).trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    // 기본: 키워드+의미이웃(즉시). 토글 ON: 브라우저 임베딩 시맨틱(최초 1회 다운로드).
    runAsk(q).then((r) => {
      setResult(r);
      setLoading(false);
      logEvent("question_asked", {
        query_text: q,
        matched_card_ids: r.ids,
        fallback_used: !semantic,
      });
      setTimeout(() => {
        document
          .querySelector(".airesult")
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 80);
    });
  };

  const usePain = (pain: string) => {
    setVal(pain);
    setActivePain(pain);
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
      {onToggleIndustry && onBizMode && (
        <IndustryFilter
          totalCards={totalCards ?? cards.length}
          myIndustries={myIndustries}
          onToggleIndustry={onToggleIndustry}
          bizMode={bizMode}
          onBizMode={onBizMode}
          className="aibox-ind"
        />
      )}
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
          placeholder={val ? "" : "예) " + placeholder}
          rows={1}
          onKeyDown={(e) => {
            // Enter = 즉시 검색, Shift+Enter = 줄바꿈
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              doAsk();
            }
          }}
        />
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
              {dl !== null ? `AI 두뇌 내려받는 중 ${dl}%` : "찾는 중"}
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

      <button
        type="button"
        className={"ai-smart-toggle" + (semantic ? " on" : "")}
        onClick={toggle}
        aria-pressed={semantic}
        title="AI 정밀검색 — 의미로 검색. 최초 1회 모델 다운로드(약 118MB) 후 캐시됩니다."
      >
        <span className="ait-sw" aria-hidden="true">
          <span className="ait-knob" />
        </span>
        ✨ AI 정밀검색 {semantic ? "ON" : "OFF"}
        <span className="ait-note">
          {semantic ? "의미 임베딩으로 검색 · 최초 1회 다운로드" : "표현이 달라도 의미로 찾기 (옵션)"}
        </span>
      </button>

      <div className="pain-section">
        <div className="pain-head">
          <div className="ph-eyebrow">
            C레벨의 고민들 · C-SUITE DESK
            <span className="ph-rotate">
              {bizMode !== "all" ? `· ${bizMode.toUpperCase()}` : ""}
              {myIndustries.length > 0
                ? ` · ${myIndustries[0]} 맞춤`
                : bizMode === "all"
                  ? "· 접속할 때마다 새로고침"
                  : " 관점"}
            </span>
          </div>
          <div className="ph-lead">
            오늘 누군가의 임원회의에 올라온 진짜 질문 —{" "}
            <b>① 분야를 고르고 → ② 질문을 누르면</b> 아래에 관련 인사이트 3장이 뜬다.
          </div>
        </div>
        <div className="pain-howto">
          <span className="ph-step">STEP 1 · 분야 고르기</span>
          <button
            type="button"
            className="pain-refresh"
            onClick={() => setRefreshNonce((n) => n + 1)}
          >
            ↻ 다른 질문 보기
          </button>
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
        <div className="pain-step2">
          STEP 2 · 질문 누르기 <span className="ps-arr">↓</span> 아래에 인사이트 3장
        </div>
        <div className="pain-items">
          {(rotatedPains[activeCat]?.items ?? []).map((p, i) => (
            <button
              key={i}
              className={"pain-item" + (activePain === p ? " on" : "")}
              onClick={() => usePain(p)}
              style={
                { ["--pc" as string]: rotatedPains[activeCat]?.color } as React.CSSProperties
              }
            >
              <span className="pi-dot"></span>
              <span className="pi-text">{p}</span>
              <span className="pi-cta">인사이트 3장 <span className="pi-arrow">→</span></span>
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="airesult">
          <div className="airesult-tag">두 번째 뇌의 답 · INSIGHTS</div>
          {activePain && <div className="airesult-q">“{activePain}”</div>}
          {result.mode === "semantic" && result.diagnosis ? (
            <div className="ai-diagnosis">
              <div className="aid-head">
                🧠 두 번째 뇌의 진단
                {typeof result.diagnosis.confidence === "number" && (
                  <span className="aid-conf"> · 의미 근접도 {result.diagnosis.confidence}%</span>
                )}
              </div>
              <div className="aid-lens">{result.diagnosis.lens}</div>
              <div className="aid-body">{result.diagnosis.body}</div>
              <div className="aid-lead">그래서 — 이 3장을 펼쳤습니다 ↓</div>
            </div>
          ) : (
            <div className="reason">
              <b>두 번째 뇌:</b> {result.reason}
            </div>
          )}

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
                  <div className="ah">{rich(c.hook)}</div>
                  <div className="ac">
                    {COURSE_SHORT[c.course]} · {c.concept}
                  </div>
                  {result.evidence?.[c.id] && (
                    <div className="ai-why">✓ {result.evidence[c.id]}</div>
                  )}
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
                      <span className="arc-hook">{rich(c.hook)}</span>
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
