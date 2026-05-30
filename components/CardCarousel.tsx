"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, Industry } from "@/lib/types";
import { COURSE_COLOR, COURSE_SHORT } from "@/lib/manifest";
import { store } from "@/lib/storage";
import { logEvent } from "@/lib/events";
import {
  getProbe,
  resolveLeafAdvice,
  leafIndustries,
  type ProbeLeaf,
} from "@/lib/probe";
import { getVisual, toneGradient } from "@/lib/visuals";
import { relatedCards } from "@/lib/related";

interface Props {
  cardId: string;
  cards: Card[];
  onClose: () => void;
  onOpen: (id: string) => void;
}

// 인스타식 인터랙티브 캐러셀 카드뉴스. 에디토리얼 미니멀.
// 슬라이드: 커버 → 통찰 → 케이스 → 5why 분기(인터랙티브) → 인용/액션
export function CardCarousel({ cardId, cards, onClose, onOpen }: Props) {
  const card = useMemo(() => cards.find((c) => c.id === cardId), [cardId, cards]);
  const probe = useMemo(() => getProbe(cardId), [cardId]);
  const visual = useMemo(() => getVisual(cardId), [cardId]);
  const myIndustries = useMemo<Industry[]>(
    () => (store.get<Industry[]>("emba17_my_industries") || []) as Industry[],
    []
  );
  const color = card ? COURSE_COLOR[card.course] || "#16150F" : "#16150F";

  // 슬라이드 구성
  const slides = useMemo(() => {
    const s: string[] = ["cover", "insight", "case"];
    if (probe) s.push("probe");
    s.push("outro");
    return s;
  }, [probe]);

  const [idx, setIdx] = useState(0);
  const [imgFail, setImgFail] = useState(false);
  const [saved, setSaved] = useState(false);

  // 5why 내부 상태
  const [pState, setPState] = useState<string>("root");
  const [pTrail, setPTrail] = useState<string[]>([]);
  const [overrideInd, setOverrideInd] = useState<string | null>(null);

  useEffect(() => {
    setIdx(0);
    setImgFail(false);
    setPState("root");
    setPTrail([]);
    setOverrideInd(null);
    setSaved(((store.get<string[]>("emba17_saved") || []) as string[]).includes(cardId));
    if (cardId) logEvent("carousel_open", { card_id: cardId });
  }, [cardId]);

  const go = (d: number) =>
    setIdx((i) => Math.max(0, Math.min(slides.length - 1, i + d)));

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, slides.length]);

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
  const kind = slides[idx];
  const bg = visual ? toneGradient(visual) : `linear-gradient(145deg, #ece5d6, #cbb9a6)`;

  const toggleSave = () => {
    const cur = (store.get<string[]>("emba17_saved") || []) as string[];
    const next = cur.includes(cardId) ? cur.filter((x) => x !== cardId) : [...cur, cardId];
    store.set("emba17_saved", next);
    setSaved(next.includes(cardId));
  };

  // ── 5why 진행 ──
  const renderProbe = () => {
    if (!probe) return null;
    if (pState.startsWith("leaf:")) {
      const leaf: ProbeLeaf | undefined = probe.leaves[pState.slice(5)];
      if (!leaf) return null;
      const auto = resolveLeafAdvice(leaf, myIndustries);
      const shownInd = overrideInd ?? auto.matchedIndustry;
      const text =
        overrideInd && leaf.byIndustry[overrideInd]
          ? leaf.byIndustry[overrideInd]
          : auto.text;
      const others = leafIndustries(leaf);
      return (
        <div className="cc-probe-result">
          <div className="cc-trail">
            {pTrail.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
          <div className="cc-verdict">{leaf.verdict}</div>
          <p className="cc-common">{leaf.common}</p>
          <div className="cc-advice">
            <div className="cc-adv-head">
              {shownInd ? (
                <>
                  <span className="cc-adv-tag">내 산업 처방</span>
                  <span className="cc-adv-ind">{shownInd}</span>
                </>
              ) : (
                <span className="cc-adv-tag">기본 처방 · 산업 미설정</span>
              )}
            </div>
            <p>{text}</p>
          </div>
          {others.length > 1 && (
            <div className="cc-others">
              <span className="cc-others-lab">다른 산업이라면?</span>
              {others.map((ind) => (
                <button
                  key={ind}
                  className={"cc-othchip " + (ind === shownInd ? "on" : "")}
                  onClick={() => setOverrideInd(ind)}
                >
                  {ind}
                </button>
              ))}
            </div>
          )}
          <button
            className="cc-reset"
            onClick={() => {
              setPState("root");
              setPTrail([]);
              setOverrideInd(null);
            }}
          >
            ↺ 다시 진단
          </button>
        </div>
      );
    }
    const q = pState === "root" ? probe.root : probe.nodes[pState];
    if (!q) return null;
    const stage = pState === "root" ? 1 : 2;
    return (
      <div className="cc-probe-q">
        <div className="cc-stage">스무고개 {stage}/2</div>
        {pTrail.length > 0 && (
          <div className="cc-trail">
            {pTrail.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        )}
        <div className="cc-q">{q.q}</div>
        <div className="cc-opts">
          {q.options.map((o, i) => (
            <button
              key={i}
              className="cc-opt"
              onClick={() => {
                setPTrail((t) => [...t, o.label]);
                if (o.leaf) {
                  setPState("leaf:" + o.leaf);
                  logEvent("carousel_probe_leaf", { card_id: cardId, leaf: o.leaf });
                } else if (o.next) setPState(o.next);
              }}
            >
              <span>{o.label}</span>
              <span className="cc-opt-arr">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const related = useMemo(() => relatedCards(card, cards).slice(0, 3), [card, cards]);

  return (
    <div
      className="cc-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("cc-overlay")) onClose();
      }}
    >
      <div
        className="cc-stage-wrap"
        style={{ ["--c" as string]: color } as React.CSSProperties}
        onTouchStart={onTS}
        onTouchEnd={onTE}
      >
        <button className="cc-x" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        {/* 진행 바 */}
        <div className="cc-progress">
          {slides.map((_, i) => (
            <span
              key={i}
              className={"cc-pseg " + (i <= idx ? "on" : "")}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>

        <div className={"cc-slide cc-" + kind}>
          {/* COVER */}
          {kind === "cover" && (
            <div className="cc-cover" style={{ background: bg }}>
              {visual && !imgFail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="cc-hero"
                  src={visual.hero}
                  alt=""
                  onError={() => setImgFail(true)}
                />
              )}
              <div className="cc-cover-grad" />
              <div className="cc-cover-text">
                <div className="cc-eyebrow">
                  {COURSE_SHORT[card.course]}
                  {card.week ? ` · WK${String(card.week).padStart(2, "0")}` : ""}
                </div>
                <h1 className="cc-hook">{card.hook}</h1>
                <div className="cc-concept">— {card.concept}</div>
              </div>
              <div className="cc-swipe-hint">밀어서 시작 →</div>
            </div>
          )}

          {/* INSIGHT */}
          {kind === "insight" && (
            <div className="cc-text-slide">
              <div className="cc-kicker">CONCEPT</div>
              <h2 className="cc-h2">{card.concept}</h2>
              <p className="cc-body">{card.insight}</p>
            </div>
          )}

          {/* CASE */}
          {kind === "case" && (
            <div className="cc-text-slide">
              <div className="cc-kicker">CASE STUDY</div>
              <h2 className="cc-h2">{card.case_title}</h2>
              <p className="cc-body">{card.case_body}</p>
            </div>
          )}

          {/* PROBE (인터랙티브 5why) */}
          {kind === "probe" && (
            <div className="cc-text-slide cc-probe">
              <div className="cc-kicker">당신 상황에 맞춰 — 스무고개</div>
              {renderProbe()}
            </div>
          )}

          {/* OUTRO */}
          {kind === "outro" && (
            <div className="cc-text-slide cc-outro">
              <div className="cc-kicker">한 마디로</div>
              <blockquote className="cc-quote">&ldquo;{card.quote}&rdquo;</blockquote>
              <div className="cc-outro-actions">
                <button className={"cc-save " + (saved ? "on" : "")} onClick={toggleSave}>
                  {saved ? "★ 저장됨" : "☆ 솔루션 카드 저장"}
                </button>
              </div>
              {related.length > 0 && (
                <div className="cc-related">
                  <div className="cc-related-lab">이어 보면 좋은 카드</div>
                  {related.map((r) => (
                    <button
                      key={r.c.id}
                      className="cc-rel"
                      onClick={() => onOpen(r.c.id)}
                    >
                      <span className="cc-rel-hook">{r.c.hook}</span>
                      <span className="cc-rel-arr">→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 좌우 네비 */}
        {idx > 0 && (
          <button className="cc-nav prev" onClick={() => go(-1)} aria-label="이전">
            ‹
          </button>
        )}
        {idx < slides.length - 1 && (
          <button className="cc-nav next" onClick={() => go(1)} aria-label="다음">
            ›
          </button>
        )}
      </div>
    </div>
  );
}
