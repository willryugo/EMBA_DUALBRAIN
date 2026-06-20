"use client";
// 듀얼브레인 모바일 (A형 · Dawn · 올산세리프) — Claude Design 핸드오프 이식.
// ≤720px에서만 렌더(HomeRouter가 분기). 데스크톱은 DualBrainApp 그대로.
import {
  useState,
  useRef,
  useMemo,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { CSSProperties } from "react";
import cardsData from "@/data/cards.json";
import ownerPainsData from "@/data/owner-pains.json";
import cardFitsData from "@/data/card-fits.json";
import casesData from "@/data/cases.json";
import lecturesData from "@/data/lectures.json";
import type {
  Card,
  Industry,
  OwnerPainCategory,
  CasesFile,
  LecturesFile,
} from "@/lib/types";
import {
  COURSE_COLOR,
  COURSE_SHORT,
  COURSES,
  DOMAINS,
  INDUSTRIES,
  UNIVERSAL,
} from "@/lib/manifest";
import { useSmartAsk } from "./useSmartAsk";
import { useRotatingExample } from "./useRotatingExample";
import type { RecommendResult } from "@/lib/recommend";
import { fetchAiDiagnosis } from "@/lib/aiDiagnosis";
import { applyTheme, applyFont } from "@/lib/themes";
import { store } from "@/lib/storage";
import { rich } from "./rich";
import { OntologyGraph } from "./OntologyGraph";
import { CaseModal } from "./CaseModal";
import { CasePreview } from "./MagCard";
import { caseToCard, isCaseCardId, toCaseId } from "@/lib/caseToCard";
import { getProbe } from "@/lib/probe";
import {
  buildSteps,
  STEP_LABEL,
  StepProblem,
  StepHook,
  StepConcept,
  StepApply,
  StepCase,
  StepProbe,
  StepDecision,
  StepOntology,
} from "./DetailModal";
import "./mobile.css";

const CARDS = cardsData as Card[];
// 조별 케이스(42) → 카드 변환 (데스크톱과 동일 lib). 그리드·검색·저장에 통합.
const ALL_CASES = (casesData as CasesFile).cases;
const LECTURES = (lecturesData as LecturesFile).lectures;
const CASE_CARDS: Card[] = ALL_CASES.map(caseToCard);
const ALL_CARDS: Card[] = [...CARDS, ...CASE_CARDS];
// 카드별 '이럴 때' 후킹 부제 (상황) — 그리드 카드 제목 아래 빈칸을 채운다.
const FITS = (cardFitsData as { fits: Record<string, string> }).fits || {};
const fitOf = (id: string): string => FITS[id] || "";
const COLOR = (course: string): string =>
  (COURSE_COLOR as Record<string, string>)[course] || "var(--ink)";
const SHORT = (course: string): string =>
  (COURSE_SHORT as Record<string, string>)[course] || course;

// C-SUITE DESK 분야 순서: 사람 · 전략 · 돈 · 결정 · 시장 (핸드오프 5분야)
const PAIN_ORDER = ["사람", "전략", "돈", "결정", "시장"];
const ALL_PAINS = ownerPainsData as OwnerPainCategory[];
const PAINS: OwnerPainCategory[] = [
  ...PAIN_ORDER.map((c) => ALL_PAINS.find((p) => p.cat === c)).filter(
    Boolean
  ) as OwnerPainCategory[],
  ...ALL_PAINS.filter((p) => !PAIN_ORDER.includes(p.cat)),
];

type CssVars = CSSProperties & Record<string, string | number>;
const css = (o: CssVars): CSSProperties => o as CSSProperties;

function MMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  const W = 100,
    H = 60;
  return (
    <svg
      className={"db-mark " + className}
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={Math.round((size * H) / W)}
      aria-hidden="true"
    >
      <g style={{ mixBlendMode: "multiply" }}>
        <circle cx="32" cy="30" r="25" fill="var(--brain-l)" opacity="0.78" />
        <circle cx="68" cy="30" r="25" fill="var(--brain-r)" opacity="0.78" />
      </g>
    </svg>
  );
}


// ───────────────────────── Masthead ─────────────────────────
function Masthead({
  scrolled,
  savedCount,
  onLogo,
  onSaved,
}: {
  scrolled: boolean;
  savedCount: number;
  onLogo: () => void;
  onSaved: () => void;
}) {
  return (
    <header className={"m-mast" + (scrolled ? " scrolled" : "")}>
      <div className="m-mast-l">
        <div className="m-ver">
          ver.1.0 <span>· EMBA 17기 학술국</span>
        </div>
      </div>
      <div className="m-mast-r">
        <button
          className={"m-saved-pill" + (savedCount ? " has" : "")}
          onClick={onSaved}
        >
          <span className="star">★</span>
          <span>내 솔루션</span>
          <span className="n">{savedCount}</span>
        </button>
        <button className="m-logo-btn" onClick={onLogo} aria-label="듀얼브레인 — 맨 위로">
          <MMark size={30} />
        </button>
      </div>
    </header>
  );
}

// ───────────────────────── Hero ─────────────────────────
function Hero({
  myIndustries,
  bizMode,
  onBiz,
  onOntology,
  onEditIndustry,
}: {
  myIndustries: Industry[];
  bizMode: "B2B" | "B2C";
  onBiz: (m: "B2B" | "B2C") => void;
  onOntology: () => void;
  onEditIndustry: () => void;
}) {
  const indLabel =
    myIndustries.length === 0
      ? "전체 산업"
      : myIndustries.length === 1
        ? myIndustries[0]
        : `${myIndustries[0]} 외 ${myIndustries.length - 1}`;
  return (
    <section className="m-hero">
      <div className="m-hero-top">
        <div className="m-logo-lockup">
          <div className="ll-bgmark" aria-hidden="true">
            <MMark size={108} />
          </div>
          <div className="ll-emba">EMBA</div>
          <h1 className="ll-title">
            듀얼브레인<span className="pd">.</span>
          </h1>
          <div className="ll-sub">17기의 두 번째 뇌</div>
        </div>
        <button className="m-onto-btn" onClick={onOntology} aria-label="브레인 접속">
          <span className="ob-glow"></span>
          <span className="ob-emoji">🧠</span>
          <span className="ob-label">생각 지도</span>
          <span className="ob-hint">전체 연결 ∞</span>
        </button>
      </div>
      <p className="deck">
        <b>회의 30분 전, 다시 꺼내 쓴다.</b>
      </p>
      <p className="sub">우리가 배웠던 지식이 쌓여, 5-step 솔루션이 됩니다.</p>
      <div className="seg">
        <button className="m-ind-chip" onClick={onEditIndustry}>
          <span className="k">내 산업</span> {indLabel}{" "}
          <span style={{ color: "var(--ink-faint)" }}>⌄</span>
        </button>
        <div className="m-seg-toggle">
          <button className={bizMode === "B2B" ? "on" : ""} onClick={() => onBiz("B2B")}>
            B2B
          </button>
          <button className={bizMode === "B2C" ? "on" : ""} onClick={() => onBiz("B2C")}>
            B2C
          </button>
        </div>
      </div>
    </section>
  );
}

// ───────────────────── DUAL ASK + 결과 ─────────────────────
function AskResult({
  result,
  onOpen,
}: {
  result: RecommendResult | null;
  onOpen: (id: string) => void;
}) {
  if (!result) return null;
  // 결과 id를 ALL_CARDS(케이스 포함)에서 해석 — 케이스가 검색 결과로 렌더되도록.
  const cards = result.ids
    .map((id) => ALL_CARDS.find((c) => c.id === id))
    .filter((c): c is Card => Boolean(c));
  return (
    <div className="m-result">
      {(result.mode === "semantic" || result.mode === "ai") && result.diagnosis ? (
        <div className="ai-diagnosis">
          <div className="aid-head">
            🧠 두 번째 뇌의 진단
            {result.mode === "ai" && <span className="aid-ai">AI</span>}
            {typeof result.diagnosis.confidence === "number" && (
              <span className="aid-conf"> · 의미 근접도 {result.diagnosis.confidence}%</span>
            )}
          </div>
          <div className="aid-lens">{result.diagnosis.lens}</div>
          <div className="aid-body">{result.diagnosis.body}</div>
          <div className="aid-lead">그래서 — 이 3장을 펼쳤어요 ↓</div>
        </div>
      ) : (
        <div className="reason">
          <b>두 번째 뇌</b> — {result.reason}
        </div>
      )}
      <div className="m-result-cards hscroll">
        {cards.map((c, i) => (
          <button
            key={c.id}
            className="m-rcard"
            style={css({ "--c": COLOR(c.course) })}
            onClick={() => onOpen(c.id)}
          >
            <div className="rn">REC · 0{i + 1}</div>
            <div className="rh">{rich(c.hook)}</div>
            <div className="rc">
              {SHORT(c.course)} · {c.concept}
            </div>
            {result.evidence?.[c.id] && (
              <div className="rc-why">✓ {result.evidence[c.id]}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface DualAskHandle {
  runAsk: (text: string) => void;
}
const DualAsk = forwardRef<
  DualAskHandle,
  { myIndustries: Industry[]; onOpen: (id: string) => void; onRequestPain: () => void }
>(function DualAsk({ myIndustries, onOpen, onRequestPain }, ref) {
  const [val, setVal] = useState("");
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [askSalt, setAskSalt] = useState(0); // 매 질문마다 +1 → 같은 질문도 다른 연결(셔플)
  const [lastQ, setLastQ] = useState("");     // '🔀 다른 연결' 재셔플용 마지막 질문
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const placeholder = useRotatingExample(!!val.trim());
  // 검색 풀에 케이스 카드 포함(ALL_CARDS) — "terracog"·"2조"·"선형계획" 등이 케이스를 찾도록.
  const { runAsk: smartAsk } = useSmartAsk(ALL_CARDS, myIndustries);

  const runAsk = (text: string, salt?: number) => {
    const q = (text || "").trim();
    if (!q) return;
    const useSalt = salt ?? askSalt + 1; // 매 호출마다 새 salt → 같은 질문도 다른 카드 연결
    setAskSalt(useSalt);
    setLastQ(q);
    setVal(q);
    setLoading(true);
    setResult(null);
    smartAsk(q, useSalt).then((r) => {
      setResult(r);
      setLoading(false);
      // 결과가 보이도록 검색창을 마스트헤드 바로 아래로 끌어올린다(결과는 그 밑에 등장).
      setTimeout(() => {
        document
          .querySelector(".m-ask .m-search")
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 60);
      // 생성형 진단 업그레이드(키 설정 시). 키 없으면 null → 키워드 결과 그대로.
      const topCards = r.ids
        .map((id) => ALL_CARDS.find((c) => c.id === id))
        .filter((c): c is Card => Boolean(c));
      if (topCards.length > 0) {
        fetchAiDiagnosis(q, topCards, r.inferredDomain, myIndustries).then((ai) => {
          if (ai) {
            setResult((prev) =>
              prev && prev.ids === r.ids
                ? { ...prev, diagnosis: ai, mode: "ai" }
                : prev
            );
          }
        });
      }
    });
  };
  useImperativeHandle(ref, () => ({ runAsk }));

  const goLabel = loading ? "찾는 중…" : "두 번째 뇌에게 묻기";

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 120) + "px";
    }
  }, [val]);

  return (
    <section className="m-ask">
      <div className="m-ask-eyebrow">DUAL ASK · C-SUITE DESK</div>
      <h2 className="m-ask-title">
        지금 이 고민, <em>수업에서 본 적 있다.</em>
      </h2>
      <div className="m-search">
        <div className="ico-row">
          <svg className="ico" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <div className="ta-wrap">
            <textarea
              ref={taRef}
              value={val}
              rows={1}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  runAsk(val);
                }
              }}
            />
            {!val && <span className="m-search-ghost">예) {placeholder}</span>}
          </div>
        </div>
        <button
          className="m-ask-go"
          disabled={!val.trim() || loading}
          onClick={() => runAsk(val)}
        >
          {goLabel}{" "}
          {!loading && (
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* 결과는 검색창 바로 아래 — 검색하면 그 자리에서 바뀐다(고민 버튼에 밀리지 않게) */}
      <AskResult result={result} onOpen={onOpen} />
      {result && (
        <button
          type="button"
          onClick={() => runAsk(lastQ)}
          title="같은 질문, 다른 카드로 다시 연결"
          style={{
            margin: "12px auto 0",
            display: "block",
            fontSize: 13,
            fontWeight: 700,
            color: "#b25b86",
            background: "none",
            border: "1px solid #e7d3df",
            borderRadius: 999,
            padding: "7px 16px",
          }}
        >
          🔀 다른 연결로
        </button>
      )}

      <div className={"m-or" + (result ? " after" : "")}>
        <span>{result ? "다른 각도로 — 임원들의 질문" : "또는, 임원들이 묻는 질문에서"}</span>
      </div>
      <button className="m-pain-open" onClick={onRequestPain}>
        <span className="l">
          <b>C레벨의 진짜 고민 고르기</b>
          <small>{PAINS.map((p) => p.cat).join(" · ")}</small>
        </span>
        <span className="r">→</span>
      </button>
    </section>
  );
});

// ───────────────────────── TEAM CASE ─────────────────────────
function TeamCase({ cards, onOpen }: { cards: Card[]; onOpen: (id: string) => void }) {
  // 조별 대표 — 그룹(sourceGroup=author)별 첫 케이스 1장씩 (탭하면 풀 CaseModal)
  const seen = new Set<string>();
  const reps = cards.filter((c) => {
    const g = c.author || "";
    if (!g || seen.has(g)) return false;
    seen.add(g);
    return true;
  });
  if (!reps.length) return null;
  return (
    <section className="m-sec">
      <div className="m-sec-head">
        <h2>조별 케이스</h2>
        <span className="e">TEAM CASE · 7개 조 실전 · 탭하면 발표 전체</span>
      </div>
      <div className="m-team-cards hscroll">
        {reps.map((c) => (
          <article
            key={c.id}
            className="m-tcard m-tcase"
            style={css({ "--c": COLOR(c.course) })}
            onClick={() => onOpen(c.id)}
          >
            <div className="tc-top">
              <span className="tc-team">{c._badge || c.author}</span>
            </div>
            <h3>{c.concept}</h3>
            <p className="tc-body">{rich(c.hook)}</p>
            <CasePreview card={c} />
            <div className="tc-foot">
              <span>{(c.industry && c.industry[0]) || "범용"}</span>
              <span className="a">발표 보기 →</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ───────────────────── 매거진 카드 + 그리드 ─────────────────────
function MagCard({
  card,
  index,
  saved,
  onOpen,
  onStar,
}: {
  card: Card;
  index: number;
  saved: boolean;
  onOpen: (id: string) => void;
  onStar: (id: string) => void;
}) {
  const wk = card.week ? " · WK " + String(card.week).padStart(2, "0") : "";
  return (
    <article
      className={"m-card" + (card._badge ? " m-card-case" : "")}
      style={css({ "--c": COLOR(card.course), animationDelay: Math.min(index, 12) * 0.035 + "s" })}
      onClick={() => onOpen(card.id)}
    >
      <button
        className={"m-star" + (saved ? " on" : "")}
        onClick={(e) => {
          e.stopPropagation();
          onStar(card.id);
        }}
        aria-label="저장"
      >
        {saved ? "★" : "☆"}
      </button>
      {card._badge ? (
        <>
          <div className="mc-course mc-badge">{card._badge}</div>
          <div className="mc-casetitle">{card.concept}</div>
          <h3>{rich(card.hook)}</h3>
          <CasePreview card={card} />
        </>
      ) : (
        <>
          <div className="mc-course">
            {SHORT(card.course)}
            {wk}
          </div>
          <h3>{rich(card.hook)}</h3>
          {fitOf(card.id) && (
            <div className="mc-fit">
              <span className="t">이럴 때</span>
              {fitOf(card.id)}
            </div>
          )}
          <div className="mc-meta">{card.concept}</div>
        </>
      )}
    </article>
  );
}

interface ActiveChip {
  key: string;
  val: string | boolean;
  label: string;
}
function MagGrid({
  cards,
  filterCount,
  savedSet,
  savedOnly,
  onOpenFilter,
  onOpen,
  onStar,
  activeChips,
  onClearChip,
  onClearAll,
}: {
  cards: Card[];
  filterCount: number;
  savedSet: Set<string>;
  savedOnly: boolean;
  onOpenFilter: () => void;
  onOpen: (id: string) => void;
  onStar: (id: string) => void;
  activeChips: ActiveChip[];
  onClearChip: (ch: ActiveChip) => void;
  onClearAll: () => void;
}) {
  return (
    <section>
      <div className="m-gridhead">
        <div className="m-count-row">
          <div className="m-count">
            <b>{cards.length}</b>
            <span>편의 인사이트{savedOnly ? " · 내 솔루션" : ""}</span>
          </div>
          <button className="m-filter-btn" onClick={onOpenFilter}>
            <svg viewBox="0 0 24 24">
              <path d="M3 5h18M6 12h12M10 19h4" />
            </svg>
            필터{filterCount ? <span className="badge">{filterCount}</span> : null}
          </button>
        </div>
        {activeChips.length > 0 && (
          <div className="m-active-chips hscroll">
            {activeChips.map((ch) => (
              <span key={ch.key + String(ch.val)} className="m-achip">
                {ch.label}
                <button onClick={() => onClearChip(ch)} aria-label="제거">
                  ×
                </button>
              </span>
            ))}
            <button className="m-achip clear" onClick={onClearAll}>
              모두 해제
            </button>
          </div>
        )}
      </div>
      <div className="m-grid">
        {cards.length === 0 ? (
          <div className="m-empty">
            조건에 맞는 카드가 없어요.
            <button onClick={onClearAll}>필터 초기화 →</button>
          </div>
        ) : (
          cards.map((c, i) => (
            <MagCard
              key={c.id}
              card={c}
              index={i}
              saved={savedSet.has(c.id)}
              onOpen={onOpen}
              onStar={onStar}
            />
          ))
        )}
      </div>
    </section>
  );
}

function MFooter() {
  return (
    <footer className="m-foot">
      <div className="fr">DUALBRAIN</div>
      <p>분석과 직관, 개인과 집단의 두 뇌. EMBA 17기 52명의 학습이 한 곳에 모입니다.</p>
      <div className="cp">© 2026 EMBA 17기 학술국 · DualBrain Magazine · VOL.01</div>
    </footer>
  );
}

// ───────────────────────── Sheets ─────────────────────────
interface FilterState {
  course: string[];
  domain: string[];
  industry: string[];
  search: string;
}
function FilterSheet({
  state,
  onToggle,
  onSetSearch,
  onReset,
  onClose,
  count,
}: {
  state: FilterState;
  onToggle: (k: "course" | "domain" | "industry", v: string) => void;
  onSetSearch: (v: string) => void;
  onReset: () => void;
  onClose: () => void;
  count: number;
}) {
  const groups: {
    key: "course" | "domain" | "industry";
    label: string;
    items: readonly string[];
    short: (x: string) => string;
  }[] = [
    { key: "course", label: "과목", items: COURSES as string[], short: SHORT },
    { key: "domain", label: "적용 영역", items: DOMAINS as string[], short: (x) => x },
    { key: "industry", label: "적용 산업", items: INDUSTRIES as string[], short: (x) => x },
  ];
  return (
    <>
      <div className="m-scrim" onClick={onClose}></div>
      <div className="m-sheet" role="dialog" aria-label="필터">
        <div className="m-sheet-grip"></div>
        <div className="m-sheet-head">
          <h3>필터</h3>
          <button className="x" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="m-sheet-body">
          <div className="m-sheet-search">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={state.search}
              onChange={(e) => onSetSearch(e.target.value)}
              placeholder="키워드 검색 (예: 가격, 동기, 이탈)"
            />
          </div>
          {groups.map((g) => (
            <div key={g.key} className="m-fgroup">
              <div className="gl">{g.label}</div>
              <div className="m-fchips">
                {g.items.map((it) => (
                  <button
                    key={it}
                    className={"m-fchip" + (state[g.key].includes(it) ? " on" : "")}
                    onClick={() => onToggle(g.key, it)}
                  >
                    {g.short(it)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="m-sheet-foot">
          <button className="reset" onClick={onReset}>
            초기화
          </button>
          <button className="apply" onClick={onClose}>
            {count}편 보기
          </button>
        </div>
      </div>
    </>
  );
}

function PainSheet({
  onPick,
  onClose,
}: {
  onPick: (q: string) => void;
  onClose: () => void;
}) {
  const [cat, setCat] = useState(0);
  const active = PAINS[cat] ?? PAINS[0];
  return (
    <>
      <div className="m-scrim" onClick={onClose}></div>
      <div className="m-sheet" role="dialog" aria-label="C레벨 고민">
        <div className="m-sheet-grip"></div>
        <div className="m-sheet-head">
          <h3>C레벨의 진짜 고민</h3>
          <button className="x" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="m-sheet-body">
          <div className="m-cat-chips hscroll" style={{ marginBottom: 16 }}>
            {PAINS.map((p, i) => (
              <button
                key={p.cat}
                className={"m-cat-chip" + (cat === i ? " on" : "")}
                style={css({ "--cc": p.color })}
                onClick={() => setCat(i)}
              >
                <span className="d"></span>
                {p.cat}
              </button>
            ))}
          </div>
          <div className="m-qlist" style={css({ "--cc": active.color })}>
            {active.items.map((q, i) => (
              <button
                key={i}
                className="m-qrow"
                style={css({ "--cc": active.color })}
                onClick={() => onPick(q)}
              >
                <span className="d"></span>
                <span className="t">{q}</span>
                <span className="a">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function SavedSheet({
  savedSet,
  onClose,
  onOpen,
  onStar,
}: {
  savedSet: Set<string>;
  onClose: () => void;
  onOpen: (id: string) => void;
  onStar: (id: string) => void;
}) {
  const cards = ALL_CARDS.filter((c) => savedSet.has(c.id));
  return (
    <>
      <div className="m-scrim" onClick={onClose}></div>
      <div className="m-sheet" role="dialog" aria-label="내 솔루션">
        <div className="m-sheet-grip"></div>
        <div className="m-sheet-head">
          <h3>
            내 솔루션<span className="m-saved-count">{cards.length}</span>
          </h3>
          <button className="x" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="m-sheet-body">
          {cards.length === 0 ? (
            <div className="m-saved-empty">
              <div className="se-star">☆</div>
              <p>
                <b>아직 담은 카드가 없어요.</b>
              </p>
              <p>카드 우측 상단의 ☆를 누르면 여기에 모입니다.</p>
            </div>
          ) : (
            <div className="m-saved-list">
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="m-saved-row"
                  style={css({ "--c": COLOR(c.course) })}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(c.id)}
                >
                  <span className="sr-main">
                    <span className="sr-course">
                      {SHORT(c.course)}
                      {c.week ? " · WK " + String(c.week).padStart(2, "0") : ""}
                    </span>
                    <span className="sr-hook">{rich(c.hook)}</span>
                  </span>
                  <button
                    className="sr-star"
                    aria-label="내 솔루션에서 빼기"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStar(c.id);
                    }}
                  >
                    ★
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DetailSheet({
  cardId,
  saved,
  onStar,
  onClose,
  onOpen,
}: {
  cardId: string;
  saved: boolean;
  onStar: (id: string) => void;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const card = CARDS.find((c) => c.id === cardId);
  const [step, setStep] = useState(0);
  // 스무고개(probe) 유무에 따라 8/7단계 — 프로덕션 DetailModal과 동일 구조
  const probeAvail = useMemo(() => (card ? getProbe(card.id) != null : false), [cardId]); // eslint-disable-line react-hooks/exhaustive-deps
  const steps = useMemo(() => buildSteps(probeAvail), [probeAvail]);
  useEffect(() => {
    setStep(0);
  }, [cardId]);
  if (!card) return null;
  const color = COLOR(card.course);
  const lastIdx = steps.length - 1;
  const safeStep = Math.min(step, lastIdx);
  const key = steps[safeStep];
  const next = () => setStep((s) => Math.min(lastIdx, s + 1));

  return (
    <div className="m-detail" style={css({ "--c": color })}>
      <div className="m-detail-top">
        <button className="back" onClick={onClose}>
          <svg viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>{" "}
          매거진
        </button>
        <div className="acts">
          <button
            className={"star" + (saved ? " on" : "")}
            onClick={() => onStar(card.id)}
            aria-label="저장"
          >
            {saved ? "★" : "☆"}
          </button>
        </div>
      </div>
      <div className="m-detail-steps">
        {steps.map((k, i) => (
          <div key={k} className={"s" + (i <= safeStep ? " on" : "")}></div>
        ))}
      </div>
      {/* 콘텐츠는 프로덕션 DetailModal 스텝 컴포넌트를 그대로 렌더 — 최신 배선(RichBlocks·스무고개) 자동 반영 */}
      <div className="m-detail-body m-detail-rich" key={safeStep}>
        {key === "problem" && <StepProblem card={card} onNext={next} />}
        {key === "hook" && <StepHook card={card} color={color} onNext={next} />}
        {key === "concept" && <StepConcept card={card} color={color} onNext={next} />}
        {key === "apply" && <StepApply card={card} color={color} />}
        {key === "case" && <StepCase card={card} color={color} />}
        {key === "probe" && <StepProbe card={card} color={color} />}
        {key === "decision" && (
          <StepDecision
            card={card}
            color={color}
            onSave={() => onStar(card.id)}
            saved={saved}
            onNext={next}
          />
        )}
        {key === "connect" && (
          <StepOntology card={card} cards={CARDS} color={color} onOpen={onOpen} onClose={onClose} />
        )}
      </div>
      <div className="m-sheet-foot" style={{ borderTop: "1px solid var(--line)" }}>
        <button
          className="reset"
          disabled={safeStep === 0}
          style={{ opacity: safeStep === 0 ? 0.4 : 1 }}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          ← 이전
        </button>
        {safeStep < lastIdx ? (
          <button className="apply" onClick={next}>
            다음 — {STEP_LABEL[steps[safeStep + 1]]} →
          </button>
        ) : (
          <button className="apply" onClick={onClose}>
            매거진으로 닫기
          </button>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── MobileApp (조립 + 상태) ─────────────────────────
export function MobileApp() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const askRef = useRef<DualAskHandle | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [painOpen, setPainOpen] = useState(false);
  const [savedSheetOpen, setSavedSheetOpen] = useState(false);
  const [ontologyOpen, setOntologyOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [myIndustries, setMyIndustries] = useState<Industry[]>([]);
  const [bizMode, setBizMode] = useState<"B2B" | "B2C">("B2B");
  const [state, setState] = useState<FilterState>({
    course: [],
    domain: [],
    industry: [],
    search: "",
  });

  // 부트스트랩 — 테마/폰트/저장/산업 (클라이언트에서만 마운트되므로 안전)
  useEffect(() => {
    // 깨진 localStorage 키(형 불일치) 선제 정화 — 렌더 중 throw → 흰 화면 방지.
    store.heal();
    // 전원 동일 UI — 여명 테마 · 올 산세리프 고정(저장값 무시).
    applyTheme("dawn" as never);
    applyFont("allsans" as never);
    setSaved(new Set(store.getArray<string>("emba17_saved")));
    setMyIndustries(store.getArray<Industry>("emba17_my_industries"));
    const bm = store.get<string>("emba17_biz_mode");
    if (bm === "b2c" || bm === "B2C") setBizMode("B2C");
    const onInd = (e: Event) => {
      const d = (e as CustomEvent).detail as Industry[] | undefined;
      setMyIndustries(Array.isArray(d) ? d : store.getArray<Industry>("emba17_my_industries"));
    };
    window.addEventListener("emba17:industries-changed", onInd as EventListener);
    return () =>
      window.removeEventListener("emba17:industries-changed", onInd as EventListener);
  }, []);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const s = e.currentTarget.scrollTop > 40;
    setScrolled((prev) => (prev !== s ? s : prev));
  };

  const toggle = (k: "course" | "domain" | "industry", v: string) =>
    setState((s) => {
      const arr = s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v];
      return { ...s, [k]: arr };
    });
  const setSearch = (v: string) => setState((s) => ({ ...s, search: v }));
  const resetFilters = () => {
    setState({ course: [], domain: [], industry: [], search: "" });
    setSavedOnly(false);
  };

  const star = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      store.set("emba17_saved", Array.from(next));
      return next;
    });

  const setBiz = (m: "B2B" | "B2C") => {
    setBizMode(m);
    store.set("emba17_biz_mode", m.toLowerCase());
  };

  const openDetail = (id: string) => {
    // 케이스 카드(case-card-*)는 풀 CaseModal(히어로·5why·비주얼), 일반 카드는 DetailSheet
    if (isCaseCardId(id)) {
      setOpenCaseId(toCaseId(id));
      setOpenId(null);
    } else {
      setOpenCaseId(null);
      setOpenId(id);
    }
    setPainOpen(false);
    setSavedSheetOpen(false);
    setOntologyOpen(false);
  };

  const filtered = useMemo(
    () =>
      ALL_CARDS.filter((c) => {
        if (state.course.length && !state.course.includes(c.course)) return false;
        if (state.domain.length && !(c.domain || []).some((d) => state.domain.includes(d)))
          return false;
        if (
          state.industry.length &&
          !(
            (c.industry || []).some((i) => state.industry.includes(i)) ||
            (c.industry || []).includes(UNIVERSAL)
          )
        )
          return false;
        if (savedOnly && !saved.has(c.id)) return false;
        if (state.search) {
          const q = state.search.toLowerCase();
          const text = (
            c.hook +
            " " +
            c.concept +
            " " +
            c.insight +
            " " +
            c.application +
            " " +
            (c.problem_scene || "") +
            " " +
            (c.decision || "")
          ).toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      }),
    [state, savedOnly, saved]
  );

  const filterCount =
    state.course.length + state.domain.length + state.industry.length + (state.search ? 1 : 0);

  const activeChips = useMemo<ActiveChip[]>(() => {
    const chips: ActiveChip[] = [];
    state.course.forEach((v) => chips.push({ key: "course", val: v, label: SHORT(v) }));
    state.domain.forEach((v) => chips.push({ key: "domain", val: v, label: v }));
    state.industry.forEach((v) => chips.push({ key: "industry", val: v, label: v }));
    if (state.search) chips.push({ key: "search", val: state.search, label: '"' + state.search + '"' });
    if (savedOnly) chips.push({ key: "savedOnly", val: true, label: "★ 내 솔루션" });
    return chips;
  }, [state, savedOnly]);

  const clearChip = (ch: ActiveChip) => {
    if (ch.key === "search") setSearch("");
    else if (ch.key === "savedOnly") setSavedOnly(false);
    else toggle(ch.key as "course" | "domain" | "industry", ch.val as string);
  };

  const scrollTop = () =>
    scrollRef.current && scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="m-layer">
      <div className="m-scroll" ref={scrollRef} onScroll={onScroll}>
        <Masthead
          scrolled={scrolled}
          savedCount={saved.size}
          onLogo={scrollTop}
          onSaved={() => setSavedSheetOpen(true)}
        />
        <Hero
          myIndustries={myIndustries}
          bizMode={bizMode}
          onBiz={setBiz}
          onOntology={() => setOntologyOpen(true)}
          onEditIndustry={() => window.dispatchEvent(new CustomEvent("emba17:open-industry"))}
        />
        <DualAsk
          ref={askRef}
          myIndustries={myIndustries}
          onOpen={openDetail}
          onRequestPain={() => setPainOpen(true)}
        />
        <TeamCase cards={CASE_CARDS} onOpen={openDetail} />
        <MagGrid
          cards={filtered}
          filterCount={filterCount}
          savedSet={saved}
          savedOnly={savedOnly}
          onOpenFilter={() => setFilterOpen(true)}
          onOpen={openDetail}
          onStar={star}
          activeChips={activeChips}
          onClearChip={clearChip}
          onClearAll={resetFilters}
        />
        <MFooter />
      </div>

      {painOpen && (
        <PainSheet
          onClose={() => setPainOpen(false)}
          onPick={(p) => {
            setPainOpen(false);
            askRef.current?.runAsk(p); // runAsk가 결과로 스크롤까지 처리
          }}
        />
      )}
      {savedSheetOpen && (
        <SavedSheet
          savedSet={saved}
          onClose={() => setSavedSheetOpen(false)}
          onOpen={openDetail}
          onStar={star}
        />
      )}
      {filterOpen && (
        <FilterSheet
          state={state}
          onToggle={toggle}
          onSetSearch={setSearch}
          onReset={resetFilters}
          onClose={() => setFilterOpen(false)}
          count={filtered.length}
        />
      )}
      {openId && (
        <DetailSheet
          cardId={openId}
          saved={saved.has(openId)}
          onStar={star}
          onClose={() => setOpenId(null)}
          onOpen={openDetail}
        />
      )}
      {openCaseId && (
        <CaseModal
          caseId={openCaseId}
          cases={ALL_CASES}
          lectures={LECTURES}
          cards={ALL_CARDS}
          onClose={() => setOpenCaseId(null)}
          onOpen={(id) => {
            setOpenCaseId(null);
            openDetail(id);
          }}
        />
      )}
      {ontologyOpen && (
        <OntologyGraph
          cards={CARDS}
          onOpen={(id) => {
            setOntologyOpen(false);
            openDetail(id);
          }}
          onClose={() => setOntologyOpen(false)}
        />
      )}
    </div>
  );
}
