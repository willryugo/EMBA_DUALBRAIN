"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import cardsData from "@/data/cards.json";
import type { Card, Domain } from "@/lib/types";
import { COURSE_COLOR, COURSE_SHORT, DOMAINS } from "@/lib/manifest";
import { store } from "@/lib/storage";

import { Masthead } from "./Masthead";
import { Footer } from "./Footer";
import { DBMark } from "./DBMark";
import { DetailModal } from "./DetailModal";
import { rich } from "./rich";

const CARDS = cardsData as Card[];

function todayStr() {
  const d = new Date();
  const m = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${m[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function LibraryView() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [today, setToday] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // 모달 닫을 때 강제 리프레시용

  useEffect(() => {
    setSavedIds(store.get<string[]>("emba17_saved") || []);
    setToday(todayStr());
  }, [tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const unsave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = prev.filter((x) => x !== id);
      store.set("emba17_saved", next);
      return next;
    });
  }, []);

  const savedCards = useMemo(
    () => CARDS.filter((c) => savedIds.includes(c.id)),
    [savedIds]
  );

  // 도메인별 그룹 — 한 카드는 '대표 도메인(첫 유효 도메인)' 한 곳에만 넣어 중복 노출 방지.
  // (이전엔 다중 도메인 카드 1장이 섹터마다 중복으로 보였음 — 예: CAC 카드가 마케팅·재무에 동시 노출)
  const byDomain = useMemo(() => {
    const m: Record<Domain, Card[]> = {} as Record<Domain, Card[]>;
    for (const d of DOMAINS) m[d] = [];
    for (const c of savedCards) {
      const primary = (c.domain || []).find((d) => m[d]); // 카드의 첫 유효 도메인 = 대표 섹터
      if (primary) m[primary].push(c);
      else if (DOMAINS.length) m[DOMAINS[0]].push(c); // 도메인 미지정 시 유실 방지
    }
    return m;
  }, [savedCards]);

  const totalSaved = savedCards.length;

  return (
    <>
      <Masthead savedCount={savedIds.length} todayLabel={today} />

      <section className="library-hero wrap">
        <div className="lib-hero-row">
          <div className="lib-hero-mark">
            <DBMark size={64} />
          </div>
          <div className="lib-hero-text">
            <div className="vol">
              <b>LIBRARY · 내 솔루션</b>
              <span className="dot"></span>
              <span>섹터별로 모아놓은 당신의 두 번째 뇌</span>
            </div>
            <h1 className="lib-title">
              회의 30분 전, <span className="ital">당신의 손이 닿는 곳에.</span>
            </h1>
            <p className="lib-deck">
              {totalSaved === 0
                ? "아직 저장한 카드가 없어요. 5-step 마지막 결정 단계에서 ☆를 누르면 여기 모입니다."
                : `${totalSaved}장이 ${
                    DOMAINS.filter((d) => byDomain[d].length > 0).length
                  }개 섹터로 정리되어 있어요. 클릭하면 그 카드의 5-step이 열립니다.`}
            </p>
          </div>
        </div>
      </section>

      <main className="wrap library-main">
        {totalSaved === 0 ? (
          <div className="lib-empty">
            <div className="lib-empty-eyebrow">EMPTY · 비어있음</div>
            <p>매거진에서 카드를 열고, STEP 4 (30초 결정) 하단의</p>
            <p className="ital">"☆ 또 보기 · 솔루션 카드로 저장"</p>
            <p>버튼을 누르면 카드가 이 섹터에 모입니다.</p>
            <a className="lib-empty-cta" href="/">
              ← 매거진으로 돌아가기
            </a>
          </div>
        ) : (
          DOMAINS.map((d) => {
            const items = byDomain[d];
            if (items.length === 0) return null;
            return (
              <section key={d} className="lib-domain">
                <div className="lib-domain-head">
                  <h2 className="lib-domain-title">{d}</h2>
                  <div className="lib-domain-count">
                    {items.length}장 · 저장됨
                  </div>
                </div>
                <div className="lib-domain-grid">
                  {items.map((c) => {
                    const col = COURSE_COLOR[c.course] || "#16150F";
                    return (
                      <div
                        key={c.id + d}
                        className="lib-card"
                        role="button"
                        tabIndex={0}
                        style={{ ["--c" as string]: col } as React.CSSProperties}
                        onClick={() => setOpenId(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenId(c.id);
                          }
                        }}
                      >
                        <div className="lib-card-top">
                          <span className="lib-card-course">
                            {COURSE_SHORT[c.course]}
                            {c.week
                              ? " · WK " + String(c.week).padStart(2, "0")
                              : ""}
                          </span>
                          <button
                            type="button"
                            className="lib-card-star on"
                            title="내 솔루션에서 빼기"
                            aria-label="내 솔루션에서 빼기"
                            onClick={(e) => {
                              e.stopPropagation();
                              unsave(c.id);
                            }}
                          >
                            ★
                          </button>
                        </div>
                        <h3 className="lib-card-hook">{rich(c.hook)}</h3>
                        <div className="lib-card-concept">— {c.concept}</div>
                        <div className="lib-card-foot">
                          <span className="lib-card-prof">
                            {c.professor ? `${c.professor} 교수` : ""}
                          </span>
                          <span className="lib-card-arrow">→</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>

      <Footer todayLabel={today} />

      {openId && (
        <DetailModal
          cardId={openId}
          cards={CARDS}
          onClose={() => {
            setOpenId(null);
            refresh();
          }}
          onOpen={setOpenId}
        />
      )}
    </>
  );
}
