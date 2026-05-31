"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, Industry } from "@/lib/types";
import { COURSE_COLOR, COURSE_SHORT } from "@/lib/manifest";
import { relatedCards } from "@/lib/related";
import { store } from "@/lib/storage";
import { logEvent } from "@/lib/events";
import {
  getProbe,
  resolveLeafAdvice,
  leafIndustries,
  type CardProbe,
  type ProbeLeaf,
} from "@/lib/probe";
import { getVisual } from "@/lib/visuals";
import { DBMark } from "./DBMark";

// 단계별 삽화 — 모달 본문 중간에 자연 비율로 들어가는 일러스트.
// 어색한 상단 크롭 대신 중앙 정렬 + 둥근 모서리 카드 형태.
function StepFigure({ src, caption }: { src: string | null; caption?: string }) {
  if (!src) return null;
  return (
    <figure className="step-fig">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

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
  // 단계별 삽화 매핑 — slides[]가 있으면 단계별로 다른 이미지, 없으면 hero 1장(쉬운 이해 단계)만.
  const visual = useMemo(() => (card ? getVisual(card.id) : null), [card]);
  const stepImg = (i: number): string | null =>
    visual?.slides?.[i] ?? null;
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

  // 카드 오픈 시점·최대 step·총 체류시간 추적
  const openedAtRef = useRef<number>(0);
  const maxStepRef = useRef(0);
  useEffect(() => {
    openedAtRef.current = Date.now();
    maxStepRef.current = 0;
    if (cardId) logEvent("card_open", { card_id: cardId });
    return () => {
      if (cardId && openedAtRef.current > 0) {
        logEvent("card_dwell", {
          card_id: cardId,
          total_ms: Date.now() - openedAtRef.current,
          max_step_reached: maxStepRef.current,
        });
      }
    };
  }, [cardId]);

  useEffect(() => {
    if (step > maxStepRef.current) maxStepRef.current = step;
  }, [step]);

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
          <div className="dt-actions">
            <button className="dt-close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </div>
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
          {step === 0 && <StepProblem card={card} img={stepImg(1)} onNext={next} />}
          {step === 1 && <StepHook card={card} color={color} img={stepImg(5)} onNext={next} />}
          {step === 2 && <StepConcept card={card} color={color} img={stepImg(2) ?? visual?.hero ?? null} onNext={next} />}
          {step === 3 && (
            <StepDecision
              card={card}
              color={color}
              img={stepImg(4)}
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

function StepProblem({ card, img, onNext }: { card: Card; img: string | null; onNext: () => void }) {
  return (
    <div className="step-content step-problem">
      <div className="eyebrow eyebrow-step">SCENE · 01 문제 인식</div>
      <div className="ask">이 상황, 익숙하지?</div>
      <p className="scene">{card.problem_scene}</p>
      <StepFigure src={img} />
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
  img,
  onNext,
}: {
  card: Card;
  color: string;
  img: string | null;
  onNext: () => void;
}) {
  return (
    <div className="step-content step-hook" style={{ ["--c" as string]: color } as React.CSSProperties}>
      <div className="eyebrow eyebrow-step">HOOK · 02 후킹 카드</div>
      <StepFigure src={img} />
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

const SOURCE_ICON: Record<string, string> = {
  paper: "📄",
  book: "📚",
  case: "🎓",
  theory: "💡",
  lecture: "🏫",
  event: "📰",
};

const SOURCE_LABEL: Record<string, string> = {
  paper: "논문",
  book: "도서",
  case: "케이스",
  theory: "이론",
  lecture: "강의",
  event: "사례",
};

function StepConcept({
  card,
  color,
  img,
  onNext,
}: {
  card: Card;
  color: string;
  img: string | null;
  onNext: () => void;
}) {
  return (
    <div className="step-content step-concept" style={{ ["--c" as string]: color } as React.CSSProperties}>
      <div className="eyebrow eyebrow-step">CONCEPT · 03 쉬운 이해</div>
      <h2 className="concept-name">{card.concept}</h2>
      <p className="concept-insight">{card.insight}</p>
      <StepFigure src={img} />
      <div className="case">
        <div className="case-tag">CASE STUDY</div>
        <div className="case-title">{card.case_title}</div>
        <p className="case-body">{card.case_body}</p>
      </div>
      {card.sources && card.sources.length > 0 && (
        <div className="sources">
          <div className="sources-tag">SOURCES · 원천</div>
          <ul className="sources-list">
            {card.sources.map((s, i) => (
              <li key={i} className="source-item">
                <span className="src-icon" aria-hidden="true">{SOURCE_ICON[s.type] || "•"}</span>
                <span className="src-type">{SOURCE_LABEL[s.type] || s.type}</span>
                <span className="src-label">{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button className="nextcue" onClick={onNext}>
        그래서 내일 회의에서 뭘 할까 <span>→</span>
      </button>
    </div>
  );
}

function StepDecision({
  card,
  color,
  img,
  onSave,
  saved,
  onNext,
}: {
  card: Card;
  color: string;
  img: string | null;
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
      <StepFigure src={img} />
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
      <ProbeFlow card={card} color={color} />
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

// ── 3단계 분기 진단(5-Why 축약형) ─────────────────────────────
// 같은 카드로 시작해도, 두 질문 + 내 산업에 따라 최종 처방이 달라진다.
function ProbeFlow({ card, color }: { card: Card; color: string }) {
  const probe = useMemo<CardProbe | null>(() => getProbe(card.id), [card.id]);
  const myIndustries = useMemo<Industry[]>(
    () => (store.get<Industry[]>("emba17_my_industries") || []) as Industry[],
    []
  );
  // 진행 상태: "idle"(시작 전) → nodeId(2단계 질문) → "leaf:<id>"(결과)
  const [state, setState] = useState<string>("idle");
  const [trail, setTrail] = useState<string[]>([]); // 선택 라벨 자취
  const [overrideInd, setOverrideInd] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  if (!probe) return null;

  const reset = () => {
    setState("idle");
    setTrail([]);
    setOverrideInd(null);
    setStarted(false);
  };

  // 결과 화면
  if (state.startsWith("leaf:")) {
    const leafId = state.slice(5);
    const leaf: ProbeLeaf | undefined = probe.leaves[leafId];
    if (!leaf) return null;
    const auto = resolveLeafAdvice(leaf, myIndustries);
    const shownInd = overrideInd ?? auto.matchedIndustry;
    const shownText =
      overrideInd && leaf.byIndustry[overrideInd]
        ? leaf.byIndustry[overrideInd]
        : auto.text;
    const others = leafIndustries(leaf);
    return (
      <div
        className="probe-block"
        style={{ ["--c" as string]: color } as React.CSSProperties}
      >
        <div className="probe-lab">🔍 산업별 심화 진단 · 결과</div>
        <div className="probe-trail">
          {trail.map((t, i) => (
            <span key={i} className="ptrail-chip">
              {t}
            </span>
          ))}
        </div>
        <div className="probe-verdict">{leaf.verdict}</div>
        <p className="probe-common">{leaf.common}</p>
        <div className="probe-advice">
          <div className="padv-head">
            {shownInd ? (
              <>
                <span className="padv-tag">내 산업 처방</span>
                <span className="padv-ind">{shownInd}</span>
              </>
            ) : (
              <span className="padv-tag">기본 처방 (산업 미설정)</span>
            )}
          </div>
          <p className="padv-text">{shownText}</p>
          {!auto.matchedIndustry && !overrideInd && (
            <div className="padv-hint">
              ⚙ Tweaks에서 내 산업을 설정하면 더 맞춤형 처방이 나옵니다.
            </div>
          )}
        </div>
        {others.length > 1 && (
          <div className="probe-others">
            <div className="poth-lab">다른 산업이라면? — 같은 진단, 다른 처방</div>
            <div className="poth-chips">
              {others.map((ind) => (
                <button
                  key={ind}
                  className={"poth-chip " + (ind === shownInd ? "on" : "")}
                  onClick={() => setOverrideInd(ind)}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>
        )}
        <button className="probe-reset" onClick={reset}>
          ↺ 다시 진단하기
        </button>
      </div>
    );
  }

  // 시작 전 (인트로 + 시작 버튼)
  if (!started) {
    return (
      <div
        className="probe-block intro"
        style={{ ["--c" as string]: color } as React.CSSProperties}
      >
        <div className="probe-lab">🔍 산업별 심화 진단</div>
        <p className="probe-intro">{probe.intro}</p>
        <button
          className="probe-start"
          onClick={() => {
            setStarted(true);
            setState("root");
            logEvent("probe_start", { card_id: card.id });
          }}
        >
          스무고개로 내 상황 좁히기 <span>→</span>
        </button>
      </div>
    );
  }

  // 질문 화면 (root = Stage1, 그 외 = Stage2)
  const question = state === "root" ? probe.root : probe.nodes[state];
  if (!question) return null;
  const stageNum = state === "root" ? 1 : 2;
  return (
    <div
      className="probe-block"
      style={{ ["--c" as string]: color } as React.CSSProperties}
    >
      <div className="probe-lab">
        🔍 산업별 심화 진단 · {stageNum}/2 단계
      </div>
      {trail.length > 0 && (
        <div className="probe-trail">
          {trail.map((t, i) => (
            <span key={i} className="ptrail-chip">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="probe-q">{question.q}</div>
      <div className="probe-opts">
        {question.options.map((opt, i) => (
          <button
            key={i}
            className="probe-opt"
            onClick={() => {
              setTrail((t) => [...t, opt.label]);
              if (opt.leaf) {
                setState("leaf:" + opt.leaf);
                logEvent("probe_leaf", { card_id: card.id, leaf: opt.leaf });
              } else if (opt.next) {
                setState(opt.next);
              }
            }}
          >
            <span className="popt-txt">{opt.label}</span>
            <span className="popt-arr">→</span>
          </button>
        ))}
      </div>
      <button className="probe-reset ghost" onClick={reset}>
        처음으로
      </button>
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
  // viewBox 확장 — 풀제목 라벨(foreignObject)이 안전히 들어가도록 좌우 여백 확보
  const W = 960;
  const H = 480;
  const cx = W / 2;
  const cy = H / 2;
  const LBL_W = 180;   // 라벨 박스 너비 (제목 줄바꿈 한계)
  const LBL_H = 64;    // 라벨 박스 높이 (제목 2줄 + 과목 1줄)
  const positions = related.map((r, i) => {
    const angle =
      -Math.PI / 2 + (i - (related.length - 1) / 2) * (Math.PI / 3.2);
    const r0 = Math.min(W, H) * 0.30;
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
          <span>다음 카드가, 당신의 두 번째 뇌를 닫는다.</span>
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
            // 라벨 위치 — 노드 기준 오른쪽/왼쪽/위/아래로 LBL_W·LBL_H 박스 배치.
            const isRight = p.x >= cx;
            const isTop = p.y < cy;
            const lblX = isRight ? p.x + 20 : p.x - LBL_W - 20;
            const lblY = isTop ? p.y - LBL_H - 8 : p.y + 14;
            return (
              <g
                key={p.c.id}
                className="onto-node"
                onClick={() => {
                  logEvent("connected_brain_click", {
                    from_id: card.id,
                    to_id: p.c.id,
                    via: "graph",
                  });
                  onOpen(p.c.id);
                }}
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
                <foreignObject
                  x={lblX}
                  y={lblY}
                  width={LBL_W}
                  height={LBL_H}
                  style={{ overflow: "visible", pointerEvents: "none" }}
                >
                  <div
                    style={{
                      textAlign: isRight ? "left" : "right",
                      wordBreak: "keep-all",
                      lineHeight: 1.25,
                      color: "#16150F",
                      fontFamily: "var(--serif, 'Noto Serif KR', serif)",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <div>{p.c.hook}</div>
                    <div
                      style={{
                        marginTop: 3,
                        fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 0.6,
                        color: col,
                        textTransform: "uppercase",
                      }}
                    >
                      {COURSE_SHORT[p.c.course]}
                    </div>
                  </div>
                </foreignObject>
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
              onClick={() => {
                logEvent("connected_brain_click", {
                  from_id: card.id,
                  to_id: r.c.id,
                  via: "list",
                });
                onOpen(r.c.id);
              }}
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
