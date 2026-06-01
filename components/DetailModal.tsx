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
import { DBMark } from "./DBMark";
import { rich, RichBlocks } from "./rich";

type StepKey =
  | "problem" | "hook" | "concept" | "apply" | "case" | "probe" | "decision" | "connect";
const STEP_LABEL: Record<StepKey, string> = {
  problem: "문제 인식",
  hook: "지식 한방",
  concept: "핵심 개념",
  apply: "실전 적용",
  case: "실제 사례",
  probe: "스무고개 진단",
  decision: "30초 결론",
  connect: "연결된 듀얼브레인",
};
// 스무고개(probe)가 있는 카드만 6번째 단계를 끼워 넣는다(없으면 7단계).
function buildSteps(hasProbe: boolean): StepKey[] {
  return [
    "problem", "hook", "concept", "apply", "case",
    ...(hasProbe ? (["probe"] as StepKey[]) : []),
    "decision", "connect",
  ];
}

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

  // 카드별 동적 단계 — 스무고개 유무에 따라 8단계/7단계
  const probeAvail = card ? getProbe(card.id) != null : false;
  const STEP_DEFS = useMemo(() => buildSteps(probeAvail), [probeAvail]);
  const lastIdx = STEP_DEFS.length - 1;
  const lastIdxRef = useRef(lastIdx);
  lastIdxRef.current = lastIdx;

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
      else if (e.key === "ArrowRight") setStep((s) => Math.min(lastIdxRef.current, s + 1));
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
      if (dx < 0) setStep((s) => Math.min(lastIdxRef.current, s + 1));
      else setStep((s) => Math.max(0, s - 1));
    }
  };

  if (!card) return null;
  const next = () => setStep((s) => Math.min(lastIdx, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const safeStep = Math.min(step, lastIdx);
  const stepKey = STEP_DEFS[safeStep];

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
          {STEP_DEFS.map((key, i) => (
            <button
              key={key}
              className={
                "step " + (i === safeStep ? "on" : "") + (i < safeStep ? " done" : "")
              }
              onClick={() => setStep(i)}
            >
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <span className="l">{STEP_LABEL[key]}</span>
              <span className="bar"></span>
            </button>
          ))}
        </div>

        <div className="step-stage">
          {stepKey === "problem" && <StepProblem card={card} onNext={next} />}
          {stepKey === "hook" && <StepHook card={card} color={color} onNext={next} />}
          {stepKey === "concept" && <StepConcept card={card} color={color} onNext={next} />}
          {stepKey === "apply" && <StepApply card={card} color={color} />}
          {stepKey === "case" && <StepCase card={card} color={color} />}
          {stepKey === "probe" && <StepProbe card={card} color={color} />}
          {stepKey === "decision" && (
            <StepDecision
              card={card}
              color={color}
              onSave={toggleSave}
              saved={isSaved}
              onNext={next}
            />
          )}
          {stepKey === "connect" && (
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
          <button className="dn-btn" onClick={back} disabled={safeStep === 0}>
            ← 이전
          </button>
          <div className="dn-dots">
            {STEP_DEFS.map((key, i) => (
              <button
                key={key}
                className={
                  "dot " + (i === safeStep ? "on" : "") + (i < safeStep ? " done" : "")
                }
                onClick={() => setStep(i)}
              ></button>
            ))}
          </div>
          <button
            className={"dn-btn dn-next" + (safeStep < lastIdx ? " pulse" : "")}
            onClick={next}
            disabled={safeStep === lastIdx}
          >
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
      <div className="eyebrow eyebrow-step">SCENE · 문제 인식</div>
      <div className="ask">이 상황, 익숙하지?</div>
      <p className="scene">{rich(card.problem_scene)}</p>
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
      <div className="eyebrow eyebrow-step">KNOWLEDGE · 지식 한방</div>
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
        <div className="poster-hook">{rich(card.hook)}</div>
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
  onNext,
}: {
  card: Card;
  color: string;
  onNext: () => void;
}) {
  return (
    <div className="step-content step-concept" style={{ ["--c" as string]: color } as React.CSSProperties}>
      <div className="eyebrow eyebrow-step">CONCEPT · 핵심 개념</div>
      <h2 className="concept-name">{card.concept}</h2>
      <div className="concept-insight rb">{<RichBlocks text={card.insight} />}</div>
      <button className="nextcue" onClick={onNext}>
        그래서 현장에선 어떻게 <span>→</span>
      </button>
    </div>
  );
}

function StepApply({ card, color }: { card: Card; color: string }) {
  return (
    <div className="step-content step-concept" style={{ ["--c" as string]: color } as React.CSSProperties}>
      <div className="eyebrow eyebrow-step">PLAYBOOK · 실전 적용</div>
      <h2 className="concept-name">현장에선 이렇게 쓴다</h2>
      <div className="concept-insight rb">{<RichBlocks text={card.application} />}</div>
    </div>
  );
}

function StepCase({ card, color }: { card: Card; color: string }) {
  return (
    <div className="step-content step-concept" style={{ ["--c" as string]: color } as React.CSSProperties}>
      <div className="eyebrow eyebrow-step">CASE · 실제 사례</div>
      <div className="case">
        <div className="case-tag">CASE STUDY</div>
        <div className="case-title">{card.case_title}</div>
        <div className="case-body rb">{<RichBlocks text={card.case_body} />}</div>
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
    </div>
  );
}

function StepProbe({ card, color }: { card: Card; color: string }) {
  return (
    <div className="step-content step-decision" style={{ ["--c" as string]: color } as React.CSSProperties}>
      <div className="eyebrow eyebrow-step">DIAGNOSE · 스무고개 진단</div>
      <div className="probe-spotlight" style={{ ["--c" as string]: color } as React.CSSProperties}>
        <span className="ps-flag">⬇ 여기까지 왔다면 꼭</span>
        <div className="ps-sub">
          같은 개념도 <b>내 산업·내 상황</b>에선 답이 달라집니다 — 스무고개로 30초 만에 좁혀보세요.
        </div>
        <ProbeFlow card={card} color={color} />
      </div>
      <div className="probe-after-note">
        진단이 끝나면 <b>다음 →</b> 으로 — 마지막엔 변하지 않는 ‘30초 결론’이 기다립니다.
      </div>
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
      <div className="eyebrow eyebrow-step">DECISION · 30초 결론</div>
      <div className="decision-lead">
        스무고개로 길이 갈렸더라도 — <b>마지막엔 이 한 줄로 닫는다.</b>
      </div>
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

// ── 분기 진단(스무고개) ─────────────────────────────
// 같은 카드로 시작해도, 길목마다의 선택 + 내 산업에 따라 최종 처방이 달라진다.
// 각 길목엔 이론 렌즈(lens)·교육 한 줄(teach)·선택지 의미(because)를 임베딩.
function ProbeFlow({ card, color }: { card: Card; color: string }) {
  const probe = useMemo<CardProbe | null>(() => getProbe(card.id), [card.id]);
  const myIndustries = useMemo<Industry[]>(
    () => (store.get<Industry[]>("emba17_my_industries") || []) as Industry[],
    []
  );
  // 진행 상태: "idle"(시작 전) → nodeId(질문) → "leaf:<id>"(결과)
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
        {leaf.principle && (
          <div className="probe-principle">
            <span>원리</span>
            {leaf.principle}
          </div>
        )}
        {leaf.principle && (
          <div className="probe-learn">
            <span className="plearn-where">
              📚 이 개념은 <b>{card.course} · {card.concept}</b>
              {card.professor ? ` (${card.professor} 교수)` : ""} 에서 배웠습니다.
            </span>
            <a
              className="plearn-search"
              href={`https://www.google.com/search?q=${encodeURIComponent(
                leaf.principle.split(/[:：(]/)[0].trim() + " 경영 이론"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                logEvent("principle_search", { card_id: card.id, principle: leaf.principle })
              }
            >
              🔎 이 원리 더 찾아보기 →
            </a>
          </div>
        )}
        <p className="probe-common">{leaf.common}</p>
        <div className="probe-advice">
          <div className="padv-head">
            {shownInd ? (
              <>
                <span className="padv-tag">이 산업이라면</span>
                <span className="padv-ind">{shownInd}</span>
              </>
            ) : (
              <span className="padv-tag">바로 쓰는 처방</span>
            )}
          </div>
          <p className="padv-text">{shownText}</p>
        </div>
        {others.length >= 1 && (
          <div className="probe-others">
            <div className="poth-lab">
              {shownInd
                ? "다른 산업이라면? — 눌러서 비교"
                : "혹시 이런 산업이세요? — 누르면 그 산업 버전으로 바뀝니다"}
            </div>
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
              {shownInd && (
                <button
                  className="poth-chip reset"
                  onClick={() => setOverrideInd(null)}
                >
                  ↺ 공통으로
                </button>
              )}
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
        <div className="probe-lab">🔍 산업별 심화 진단 · 스무고개</div>
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

  // 질문 화면 (root = 1단계, 그 외 = 이후 단계, 임의 깊이)
  const question = state === "root" ? probe.root : probe.nodes[state];
  if (!question) return null;
  const stageNum = trail.length + 1;
  return (
    <div
      className="probe-block"
      style={{ ["--c" as string]: color } as React.CSSProperties}
    >
      <div className="probe-lab">🔍 산업별 심화 진단 · {stageNum}단계</div>
      {trail.length > 0 && (
        <div className="probe-trail">
          {trail.map((t, i) => (
            <span key={i} className="ptrail-chip">
              {t}
            </span>
          ))}
        </div>
      )}
      {question.lens && <div className="probe-lens">{question.lens}</div>}
      <div className="probe-q">{question.q}</div>
      {question.teach && <p className="probe-teach">{question.teach}</p>}
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
            <span className="popt-body">
              <span className="popt-txt">{opt.label}</span>
              {opt.because && <span className="popt-because">{opt.because}</span>}
            </span>
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
  const [hover, setHover] = useState<string | null>(null);
  // viewBox 확장 — 풀제목 라벨(foreignObject)이 안전히 들어가도록 좌우 여백 확보
  const W = 960;
  const H = 480;
  const cx = W / 2;
  const cy = H / 2;
  const LBL_W = 184; // 라벨 박스 너비 (제목 줄바꿈 한계)
  const LBL_H = 70; // 라벨 박스 높이 (제목 2줄 + 과목 1줄)
  const positions = related.map((r, i) => {
    const angle =
      -Math.PI / 2 + (i - (related.length - 1) / 2) * (Math.PI / 3.2);
    const r0 = Math.min(W, H) * 0.3;
    return { x: cx + Math.cos(angle) * r0, y: cy + Math.sin(angle) * r0, ...r };
  });
  const goTo = (id: string, via: string) => {
    logEvent("connected_brain_click", { from_id: card.id, to_id: id, via });
    onOpen(id);
  };
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
      <div className="onto-hint">노드에 마우스를 올리면 제목이 커지고, 클릭하면 그 카드로 넘어갑니다.</div>
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
            const on = hover === p.c.id;
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke={on ? color : "rgba(22,21,15,.35)"}
                strokeWidth={on ? 2 : 1.2}
                strokeDasharray={dash}
                style={{ transition: ".15s" }}
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
            const isRight = p.x >= cx;
            const isTop = p.y < cy;
            const lblX = isRight ? p.x + 22 : p.x - LBL_W - 22;
            const lblY = isTop ? p.y - LBL_H - 6 : p.y + 12;
            return (
              <g
                key={p.c.id}
                className={"onto-node" + (hover === p.c.id ? " on" : "")}
                onClick={() => goTo(p.c.id, "graph")}
                onMouseEnter={() => setHover(p.c.id)}
                onMouseLeave={() => setHover((h) => (h === p.c.id ? null : h))}
              >
                <title>{p.c.hook.replace(/\*/g, "").replace(/\n/g, " ")} — 클릭해서 이동</title>
                {/* 큰 투명 히트영역 — 클릭/호버를 쉽게 */}
                <circle cx={p.x} cy={p.y} r="30" fill="transparent" className="onto-hit" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="14"
                  fill="#FFFCF6"
                  stroke={col}
                  strokeWidth="2"
                  className="onto-ring"
                />
                <circle cx={p.x} cy={p.y} r="6" fill={col} className="onto-dot" />
                <foreignObject
                  x={lblX}
                  y={lblY}
                  width={LBL_W}
                  height={LBL_H}
                  style={{ overflow: "visible" }}
                >
                  <div
                    className="onto-lbl-box"
                    style={{
                      textAlign: isRight ? "left" : "right",
                      transformOrigin: isRight ? "left center" : "right center",
                    }}
                  >
                    <div className="onto-lbl-hook">{rich(p.c.hook)}</div>
                    <div className="onto-lbl-course" style={{ color: col }}>
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
              className={"rel" + (hover === r.c.id ? " on" : "")}
              onMouseEnter={() => setHover(r.c.id)}
              onMouseLeave={() => setHover((h) => (h === r.c.id ? null : h))}
              onClick={() => goTo(r.c.id, "list")}
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
