"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { COURSE_COLOR, COURSE_SHORT } from "@/lib/manifest";
import { relatedCards } from "@/lib/related";
import { store } from "@/lib/storage";
import { DBMark } from "./DBMark";

const STEP_LABELS = [
  "문제 인식",
  "후킹 카드",
  "쉬운 이해",
  "30초 결정",
  "연결된 듀얼브레인",
];

interface Props {
  cardId: string;
  cards: Card[];
  onClose: () => void;
  onOpen: (id: string) => void;
}

export function DetailModal({ cardId, cards, onClose, onOpen }: Props) {
  const card = useMemo(() => cards.find((c) => c.id === cardId), [cardId, cards]);
  const [step, setStep] = useState(0);
  const color = card ? COURSE_COLOR[card.course] || "#16150F" : "#16150F";
  const [savedIds, setSavedIds] = useState<string[]>(
    () => store.get<string[]>("emba17_saved") || []
  );
  const isSaved = card ? savedIds.includes(card.id) : false;

  const toggleSave = () => {
    if (!card) return;
    const next = isSaved
      ? savedIds.filter((x) => x !== card.id)
      : [...savedIds, card.id];
    setSavedIds(next);
    store.set("emba17_saved", next);
  };

  useEffect(() => {
    setStep(0);
  }, [cardId]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
      else if (e.key === "ArrowRight") setStep((s) => Math.min(4, s + 1));
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const touch = useRef({ x: 0, y: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) setStep((s) => Math.min(4, s + 1));
      else setStep((s) => Math.max(0, s - 1));
    }
  };

  if (!card) return null;
  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div
      className="detail-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("detail-overlay")) onClose();
      }}
    >
      <div className="detail-modal" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="detail-top">
          <div className="dt-meta">
            <span className="dt-course" style={{ color }}>
              {card.course}
            </span>
            <span className="dt-sep">·</span>
            <span className="dt-concept">{card.concept}</span>
          </div>
          <button className="dt-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="stepbar">
          {STEP_LABELS.map((label, i) => (
            <button
              key={i}
              className={
                "step " + (i === step ? "on" : "") + (i < step ? " done" : "")
              }
              onClick={() => setStep(i)}
            >
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <span className="l">{label}</span>
              <span className="bar"></span>
            </button>
          ))}
        </div>

        <div className="step-stage">
          {step === 0 && <StepProblem card={card} onNext={next} />}
          {step === 1 && <StepHook card={card} color={color} onNext={next} />}
          {step === 2 && <StepConcept card={card} color={color} onNext={next} />}
          {step === 3 && (
            <StepDecision
              card={card}
              color={color}
              onSave={toggleSave}
              saved={isSaved}
              onNext={next}
            />
          )}
          {step === 4 && (
            <StepOntology
              card={card}
              cards={cards}
              color={color}
              onOpen={onOpen}
              onClose={onClose}
            />
          )}
        </div>

        <div className="detail-nav">
          <button className="dn-btn" onClick={back} disabled={step === 0}>
            ← 이전
          </button>
          <div className="dn-dots">
            {STEP_LABELS.map((_, i) => (
              <button
                key={i}
                className={
                  "dot " + (i === step ? "on" : "") + (i < step ? " done" : "")
                }
                onClick={() => setStep(i)}
              ></button>
            ))}
          </div>
          <button className="dn-btn" onClick={next} disabled={step === 4}>
            다음 →
          </button>
        </div>
      </div>
    </div>
  );
}

function StepProblem({ card, onNext }: { card: Card; onNext: () => void }) {
  return (
    <div className="step-content step-problem">
      <div className="eyebrow eyebrow-step">SCENE · 01 문제 인식</div>
      <div className="ask">이 상황, 익숙하지?</div>
      <p className="scene">{card.problem_scene}</p>
      <div className="problem-meta">
        <div className="pm-l">현실에서 우리는 이 문제를 보통 이렇게 만난다.</div>
        <button className="nextcue" onClick={onNext}>
          그때 배웠던 그 개념이 뭐였더라 <span>→</span>
        </button>
      </div>
    </div>
  );
}

function StepHook({
  card,
  color,
  onNext,
}: {
  card: Card;
  color: string;
  onNext: () => void;
}) {
  return (
    <div className="step-content step-hook" style={{ ["--c" as string]: color } as React.CSSProperties}>
      <div className="eyebrow eyebrow-step">HOOK · 02 후킹 카드</div>
      <div className="poster">
        <div className="poster-meta">
          <div className="pm-course">{card.course}</div>
          {card.week && (
            <div className="pm-week">WK·{String(card.week).padStart(2, "0")}</div>
          )}
          {card.professor && (
            <div className="pm-prof">{card.professor} 교수</div>
          )}
        </div>
        <div className="poster-hook">{card.hook}</div>
        <div className="poster-concept">— {card.concept}</div>
        <div className="poster-block"></div>
      </div>
      <button className="nextcue" onClick={onNext}>
        쉽게, 한 번에 이해하기 <span>→</span>
      </button>
    </div>
  );
}

function StepConcept({
  card,
  color,
  onNext,
}: {
  card: Card;
  color: string;
  onNext: () => void;
}) {
  return (
    <div className="step-content step-concept" style={{ ["--c" as string]: color } as React.CSSProperties}>
      <div className="eyebrow eyebrow-step">CONCEPT · 03 쉬운 이해</div>
      <h2 className="concept-name">{card.concept}</h2>
      <p className="concept-insight">{card.insight}</p>
      <div className="case">
        <div className="case-tag">CASE STUDY</div>
        <div className="case-title">{card.case_title}</div>
        <p className="case-body">{card.case_body}</p>
      </div>
      <button className="nextcue" onClick={onNext}>
        그래서 내일 회의에서 뭘 할까 <span>→</span>
      </button>
    </div>
  );
}

function StepDecision({
  card,
  color,
  onSave,
  saved,
  onNext,
}: {
  card: Card;
  color: string;
  onSave: () => void;
  saved: boolean;
  onNext: () => void;
}) {
  const [checks, setChecks] = useState<boolean[]>(() => {
    const s = store.get<boolean[]>("emba17_check_" + card.id);
    return s || card.checklist.map(() => false);
  });
  useEffect(() => {
    store.set("emba17_check_" + card.id, checks);
  }, [checks, card.id]);
  const toggle = (i: number) =>
    setChecks((arr) => arr.map((v, j) => (j === i ? !v : v)));
  const [copied, setCopied] = useState(false);
  const copyQuote = () => {
    navigator.clipboard?.writeText(
      '"' + card.quote + '" — 듀얼브레인 · ' + card.concept
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="step-content step-decision" style={{ ["--c" as string]: color } as React.CSSProperties}>
      <div className="eyebrow eyebrow-step">DECISION · 04 30초 안에 쓸 것</div>
      <div className="decision-block">
        <div className="db-lab">30초 안에 결정할 한 줄</div>
        <p className="db-text">{card.decision}</p>
      </div>
      <div className="quote-block">
        <div className="qb-lab">회의에 그대로 인용할 한 마디</div>
        <div className="qb-text">&ldquo;{card.quote}&rdquo;</div>
        <button className="qb-copy" onClick={copyQuote}>
          {copied ? "✓ 복사됨" : "한 마디 복사"}
        </button>
      </div>
      <div className="check-block">
        <div className="cb-lab">다음에 이 회의 들어가면 — 체크리스트</div>
        <ul className="checks">
          {card.checklist.map((item, i) => (
            <li
              key={i}
              className={checks[i] ? "on" : ""}
              onClick={() => toggle(i)}
            >
              <span className="cbox">{checks[i] ? "✓" : ""}</span>
              <span className="ctxt">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="row-actions">
        <button className={"save " + (saved ? "on" : "")} onClick={onSave}>
          {saved ? "★ 내 솔루션 카드" : "☆ 또 보기 · 솔루션 카드로 저장"}
        </button>
        <button className="nextcue inline" onClick={onNext}>
          이 개념과 연결된 카드 보기 <span>→</span>
        </button>
      </div>
    </div>
  );
}

function StepOntology({
  card,
  cards,
  color,
  onOpen,
  onClose,
}: {
  card: Card;
  cards: Card[];
  color: string;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const related = useMemo(() => relatedCards(card, cards), [card, cards]);
  // viewBox 확장 — 라벨이 잘리지 않도록 좌우/상하 패딩 확보
  const W = 760;
  const H = 420;
  const cx = W / 2;
  const cy = H / 2;
  const positions = related.map((r, i) => {
    const angle =
      -Math.PI / 2 + (i - (related.length - 1) / 2) * (Math.PI / 3.2);
    const r0 = Math.min(W, H) * 0.32;
    return { x: cx + Math.cos(angle) * r0, y: cy + Math.sin(angle) * r0, ...r };
  });
  return (
    <div className="step-content step-onto" style={{ ["--c" as string]: color } as React.CSSProperties}>
      <div className="eyebrow eyebrow-step">ONTOLOGY · 05 연결된 듀얼브레인</div>
      <div className="onto-headline-row">
        <DBMark size={44} className="onto-headline-mark" />
        <div className="onto-headline">
          이 한 장은 끝이 아니다.
          <br />
          <span>다음 카드가, 너의 두 번째 뇌를 닫는다.</span>
        </div>
      </div>
      <div className="constellation">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern
              id="dotPattern"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".7" fill="rgba(22,21,15,.10)" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={W} height={H} fill="url(#dotPattern)" />
          {positions.map((p, i) => {
            const dash = p.c.course === card.course ? "none" : "4 4";
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke="rgba(22,21,15,.35)"
                strokeWidth="1.2"
                strokeDasharray={dash}
              />
            );
          })}
          <g>
            <circle cx={cx} cy={cy} r="44" fill={color} opacity=".10" />
            <circle cx={cx} cy={cy} r="32" fill={color} />
            <text
              x={cx}
              y={cy + 5}
              textAnchor="middle"
              fill="#FFFCF6"
              fontSize="11.5"
              fontWeight="700"
              fontFamily="JetBrains Mono"
            >
              현재
            </text>
          </g>
          {positions.map((p) => {
            const col = COURSE_COLOR[p.c.course] || "#16150F";
            // hook을 11자 이내로 잘라서 노드 옆에 표시 — viewBox 안에 안전하게 들어가도록
            const labelText = p.c.hook.length > 11 ? p.c.hook.slice(0, 11) + "…" : p.c.hook;
            // 왼쪽 절반 노드는 왼쪽 정렬, 오른쪽 절반은 오른쪽 정렬, 위쪽은 위로
            const isRight = p.x > cx;
            const isTop = p.y < cy;
            const labelDx = isRight ? 20 : -20;
            const labelDy = isTop ? -20 : 26;
            const anchor: "start" | "end" | "middle" = isRight ? "start" : "end";
            return (
              <g
                key={p.c.id}
                className="onto-node"
                onClick={() => onOpen(p.c.id)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="14"
                  fill="#FFFCF6"
                  stroke={col}
                  strokeWidth="2"
                />
                <circle cx={p.x} cy={p.y} r="6" fill={col} />
                <text
                  x={p.x + labelDx}
                  y={p.y + labelDy}
                  textAnchor={anchor}
                  fontFamily="Noto Serif KR, serif"
                  fontSize="13"
                  fontWeight="700"
                  fill="#16150F"
                  style={{ pointerEvents: "none" }}
                >
                  {labelText}
                </text>
                <text
                  x={p.x + labelDx}
                  y={p.y + labelDy + 14}
                  textAnchor={anchor}
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="10"
                  fontWeight="600"
                  fill={col}
                  letterSpacing="0.5"
                  style={{ pointerEvents: "none" }}
                >
                  {COURSE_SHORT[p.c.course]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="related-list">
        {related.map((r, i) => {
          const col = COURSE_COLOR[r.c.course];
          return (
            <button
              key={r.c.id}
              className="rel"
              onClick={() => onOpen(r.c.id)}
            >
              <div className="rel-num" style={{ color: col }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="rel-body">
                <div className="rel-hook">{r.c.hook}</div>
                <div className="rel-meta">
                  <span style={{ color: col, fontWeight: 700 }}>
                    {COURSE_SHORT[r.c.course]}
                  </span>
                  <span className="rel-why">
                    {r.c.course === card.course && "같은 과목 · "}
                    {r.sharedD > 0 && `${r.sharedD}개 영역 공유 · `}
                    {r.sharedI > 0 && `${r.sharedI}개 산업 공유`}
                  </span>
                </div>
              </div>
              <div className="rel-arrow">→</div>
            </button>
          );
        })}
      </div>
      <div className="finish-row">
        <button className="finish" onClick={onClose}>
          오늘은 여기까지 · 닫기
        </button>
      </div>
    </div>
  );
}
