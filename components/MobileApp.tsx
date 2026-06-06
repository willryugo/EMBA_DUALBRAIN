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
import type { CSSProperties, ReactNode } from "react";
import cardsData from "@/data/cards.json";
import ownerPainsData from "@/data/owner-pains.json";
import type { Card, Industry, OwnerPainCategory } from "@/lib/types";
import {
  COURSE_COLOR,
  COURSE_SHORT,
  COURSES,
  DOMAINS,
  INDUSTRIES,
  UNIVERSAL,
} from "@/lib/manifest";
import { recommendCards } from "@/lib/recommend";
import { applyTheme, applyFont } from "@/lib/themes";
import { store } from "@/lib/storage";
import { rich } from "./rich";
import { OntologyGraph } from "./OntologyGraph";
import "./mobile.css";

const CARDS = cardsData as Card[];
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

// 조별 발표 케이스 (실데이터 — DualBrainApp와 동일)
const TEAM_CASES: { id: string; team: string; caseTitle: string }[] = [
  { id: "mpo-rob-parson", team: "1조", caseTitle: "Morgan Stanley · Rob Parson" },
  { id: "mpo-terracog", team: "2조", caseTitle: "TerraCog GPS" },
  { id: "mpo-martha-rinaldi", team: "3조", caseTitle: "Martha Rinaldi" },
  { id: "mpo-recruitment-vs-promote", team: "4조", caseTitle: "Recruitment of a Star" },
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

function recommend(q: string, myInd: Industry[]): { ids: string[]; reason: string } {
  const r = recommendCards(q, CARDS, myInd);
  return { ids: r.ids, reason: r.reason };
}

function relatedCards(card: Card, all: Card[]): Card[] {
  return all
    .filter((c) => c.id !== card.id)
    .map((c) => {
      let s = 0;
      if (c.course === card.course) s += 3;
      s += (c.domain || []).filter((d) => (card.domain || []).includes(d)).length * 2;
      s +=
        (c.industry || []).filter(
          (i) => i !== UNIVERSAL && (card.industry || []).includes(i)
        ).length * 1.5;
      return { c, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => x.c);
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
          <span className="ob-label">브레인접속</span>
          <span className="ob-hint">온톨로지 ∞</span>
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
  result: { ids: string[]; reason: string } | null;
  onOpen: (id: string) => void;
}) {
  if (!result) return null;
  const cards = result.ids
    .map((id) => CARDS.find((c) => c.id === id))
    .filter((c): c is Card => Boolean(c));
  return (
    <div className="m-result">
      <div className="reason">
        <b>두 번째 뇌</b> — {result.reason}
      </div>
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
  const [result, setResult] = useState<{ ids: string[]; reason: string } | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const runAsk = (text: string) => {
    const q = (text || "").trim();
    if (!q) return;
    setVal(q);
    setResult(recommend(q, myIndustries));
  };
  useImperativeHandle(ref, () => ({ runAsk }));

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
            {!val && (
              <span className="m-search-ghost">여기에 한 줄 — 예: HR · 전략 · 손익</span>
            )}
          </div>
        </div>
        <button className="m-ask-go" disabled={!val.trim()} onClick={() => runAsk(val)}>
          두 번째 뇌에게 묻기{" "}
          <svg viewBox="0 0 24 24">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="m-or">
        <span>또는, 임원들이 묻는 질문에서</span>
      </div>
      <button className="m-pain-open" onClick={onRequestPain}>
        <span className="l">
          <b>C레벨의 진짜 고민 고르기</b>
          <small>{PAINS.map((p) => p.cat).join(" · ")}</small>
        </span>
        <span className="r">→</span>
      </button>

      <AskResult result={result} onOpen={onOpen} />
    </section>
  );
});

// ───────────────────────── TEAM CASE ─────────────────────────
function TeamCase({ onOpen }: { onOpen: (id: string) => void }) {
  const cards = TEAM_CASES.map((tc) => {
    const card = CARDS.find((c) => c.id === tc.id);
    return card ? { ...card, _team: tc.team, _case: tc.caseTitle } : null;
  }).filter(Boolean) as (Card & { _team: string; _case: string })[];
  if (!cards.length) return null;
  const color = COLOR(cards[0].course);
  return (
    <section className="m-sec">
      <div className="m-sec-head">
        <h2>조별 케이스</h2>
        <span className="e">TEAM CASE · 오홍석 교수 · 조직문화</span>
      </div>
      <div className="m-team-cards hscroll">
        {cards.map((c) => (
          <article
            key={c.id}
            className="m-tcard"
            style={css({ "--c": color })}
            onClick={() => onOpen(c.id)}
          >
            <div className="tc-top">
              <span className="tc-team">{c._team}</span>
              <span className="tc-case">{c._case}</span>
            </div>
            <div className="tc-concept">{c.concept}</div>
            <h3>{rich(c.hook)}</h3>
            <p className="tc-body">{c.case_body || c.insight}</p>
            <div className="tc-foot">
              <span>
                {c.professor || "오홍석"} 교수{c.week ? " · " + c.week + "주차" : ""}
              </span>
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
      className="m-card"
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
      <div className="mc-course">
        {SHORT(card.course)}
        {wk}
      </div>
      <h3>{rich(card.hook)}</h3>
      <div className="mc-meta">{card.concept}</div>
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

const STEPS = ["문제 인식", "후킹", "쉬운 이해", "30초 결정", "관계 탐색"];
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
  const rel = useMemo(() => (card ? relatedCards(card, CARDS) : []), [cardId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!card) return null;
  const color = COLOR(card.course);

  let body: ReactNode = null;
  if (step === 0)
    body = (
      <div className="m-dstep" style={{ borderBottom: "none" }}>
        <div className="de">
          <span className="num">1</span>SCENE · 문제 인식
        </div>
        <p className="scene">“{rich(card.problem_scene || card.insight)}”</p>
        <p className="body" style={{ marginTop: 14 }}>
          이 장면, 익숙하죠? — {SHORT(card.course)} 수업의 한 장면입니다.
        </p>
      </div>
    );
  else if (step === 1)
    body = (
      <div className="m-dstep" style={{ borderBottom: "none" }}>
        <div className="de">
          <span className="num">2</span>HOOK · 후킹
        </div>
        <h2>{rich(card.hook)}</h2>
        {card.quote && (
          <div className="m-decision" style={{ marginTop: 18 }}>
            <div className="dl">QUOTE</div>
            <div className="dq">“{rich(card.quote)}”</div>
          </div>
        )}
      </div>
    );
  else if (step === 2)
    body = (
      <div className="m-dstep" style={{ borderBottom: "none" }}>
        <div className="de">
          <span className="num">3</span>CONCEPT · 쉬운 이해
        </div>
        <div className="concept-k">{card.concept}</div>
        <p className="body">{rich(card.insight)}</p>
        {card.application && (
          <p className="body" style={{ marginTop: 14 }}>
            <b style={{ color: "var(--ink)" }}>적용 — </b>
            {rich(card.application)}
          </p>
        )}
      </div>
    );
  else if (step === 3)
    body = (
      <div className="m-dstep" style={{ borderBottom: "none" }}>
        <div className="de">
          <span className="num">4</span>DECISION · 30초 결정
        </div>
        <div className="m-decision">
          <div className="dl">지금 할 한 가지</div>
          <div className="dq">{rich(card.decision || card.application)}</div>
        </div>
        {card.checklist && card.checklist.length > 0 && (
          <ul className="m-check">
            {card.checklist.map((it, i) => (
              <li key={i}>{rich(it)}</li>
            ))}
          </ul>
        )}
      </div>
    );
  else
    body = (
      <div className="m-dstep" style={{ borderBottom: "none" }}>
        <div className="de">
          <span className="num">5</span>ONTOLOGY · 관계 탐색
        </div>
        <p className="body" style={{ marginBottom: 4 }}>
          이 카드와 이어지는 인사이트들 — 같은 과목·도메인·산업으로 연결됩니다.
        </p>
        <div className="m-rel">
          {rel.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setStep(0);
                onOpen(c.id);
              }}
            >
              <span className="rc-dot" style={{ background: COLOR(c.course) }}></span>
              <span className="rc-h">{rich(c.hook)}</span>
              <span className="rc-c">{SHORT(c.course)}</span>
            </button>
          ))}
        </div>
      </div>
    );

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
        {STEPS.map((s, i) => (
          <div key={i} className={"s" + (i <= step ? " on" : "")}></div>
        ))}
      </div>
      <div className="m-detail-body" key={step}>
        {body}
      </div>
      <div className="m-sheet-foot" style={{ borderTop: "1px solid var(--line)" }}>
        <button
          className="reset"
          disabled={step === 0}
          style={{ opacity: step === 0 ? 0.4 : 1 }}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          ← 이전
        </button>
        {step < STEPS.length - 1 ? (
          <button className="apply" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
            다음 — {STEPS[step + 1]} →
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
  const [ontologyOpen, setOntologyOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
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
    applyTheme((store.get<string>("emba17_theme") as never) || ("dawn" as never));
    applyFont((store.get<string>("emba17_font") as never) || ("allsans" as never));
    setSaved(new Set(store.get<string[]>("emba17_saved") || []));
    setMyIndustries((store.get<Industry[]>("emba17_my_industries") as Industry[]) || []);
    const bm = store.get<string>("emba17_biz_mode");
    if (bm === "b2c" || bm === "B2C") setBizMode("B2C");
    const onInd = (e: Event) => {
      const d = (e as CustomEvent).detail as Industry[] | undefined;
      setMyIndustries(d || (store.get<Industry[]>("emba17_my_industries") as Industry[]) || []);
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
    setOpenId(id);
    setPainOpen(false);
    setOntologyOpen(false);
  };

  const filtered = useMemo(
    () =>
      CARDS.filter((c) => {
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
  const goSaved = () => {
    setSavedOnly((o) => !o);
    setTimeout(() => {
      const g = scrollRef.current?.querySelector(".m-gridhead") as HTMLElement | null;
      if (g) scrollRef.current?.scrollTo({ top: g.offsetTop - 60, behavior: "smooth" });
    }, 60);
  };

  return (
    <div className="m-layer">
      <div className="m-scroll" ref={scrollRef} onScroll={onScroll}>
        <Masthead scrolled={scrolled} savedCount={saved.size} onLogo={scrollTop} onSaved={goSaved} />
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
        <TeamCase onOpen={openDetail} />
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
            askRef.current?.runAsk(p);
            setTimeout(() => {
              const a = scrollRef.current?.querySelector(".m-result") as HTMLElement | null;
              if (a) a.scrollIntoView({ block: "center", behavior: "smooth" });
            }, 80);
          }}
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
