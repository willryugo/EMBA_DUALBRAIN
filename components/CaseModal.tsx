"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, TeamCase, Lecture } from "@/lib/types";
import { COURSE_COLOR } from "@/lib/manifest";
import { rich } from "./rich";
import { CaseVisualView } from "./CaseVisual";

const CASE_STEPS = ["surface", "roots", "paradigm", "take", "connect"] as const;
type CaseStepKey = (typeof CASE_STEPS)[number];

const CASE_STEP_LABEL: Record<CaseStepKey, string> = {
  surface: "과제 개요",
  roots: "강의 뿌리",
  paradigm: "패러다임 렌즈",
  take: "17기 해석",
  connect: "연결 이론",
};

const SUBJECT_TYPE_LABEL: Record<string, string> = {
  hbs: "HBS 케이스",
  public: "공개 기업",
  member: "17기 회사",
};

interface Props {
  caseId: string;
  cases: TeamCase[];
  lectures: Lecture[];
  cards: Card[];
  onClose: () => void;
  onOpen: (id: string) => void;
}

export function CaseModal({ caseId, cases, lectures, cards, onClose, onOpen }: Props) {
  const kase = useMemo(() => cases.find((c) => c.id === caseId), [caseId, cases]);
  const [step, setStep] = useState(0);
  const [lens, setLens] = useState<"old" | "new">("new");
  const color = kase ? COURSE_COLOR[kase.course] || "#16150F" : "#16150F";
  const lastIdx = CASE_STEPS.length - 1;
  const lastIdxRef = useRef(lastIdx);

  useEffect(() => {
    setStep(0);
    setLens("new");
  }, [caseId]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
      else if (e.key === "ArrowRight") setStep((s) => Math.min(lastIdxRef.current, s + 1));
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!kase) return null;
  const next = () => setStep((s) => Math.min(lastIdx, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const safeStep = Math.min(step, lastIdx);
  const stepKey = CASE_STEPS[safeStep];

  const lectureById = (id: string) => lectures.find((l) => l.id === id);
  const rootLectures = kase.roots.lectures
    .map(lectureById)
    .filter(Boolean) as Lecture[];
  const linkedCards = kase.cardLinks
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean) as Card[];

  return (
    <div
      className="detail-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("detail-overlay")) onClose();
      }}
    >
      <div
        className="detail-modal case-modal"
        style={{ ["--c" as string]: color } as React.CSSProperties}
      >
        <div className="detail-top">
          <div className="dt-meta">
            <span className="dt-course" style={{ color }}>
              {kase.sourceGroup}
            </span>
            <span className="dt-sep">·</span>
            <span className="dt-concept">{kase.title}</span>
          </div>
          <div className="dt-actions">
            <button className="dt-close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </div>
        </div>

        <div className="stepbar">
          {CASE_STEPS.map((key, i) => (
            <button
              key={key}
              className={"step " + (i === safeStep ? "on" : "") + (i < safeStep ? " done" : "")}
              onClick={() => setStep(i)}
            >
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <span className="l">{CASE_STEP_LABEL[key]}</span>
              <span className="bar"></span>
            </button>
          ))}
        </div>

        <div className="step-stage">
          {/* ── 1. 과제 개요 ── */}
          {stepKey === "surface" && (
            <div className="step-content case-surface">
              <div className="eyebrow eyebrow-step">CASE · 과제 개요</div>
              <div className="cs-head">
                <span className="cs-type">
                  {SUBJECT_TYPE_LABEL[kase.subjectType] || kase.subjectType}
                </span>
                <span className="cs-industry">{kase.subjectIndustry}</span>
              </div>
              <h2 className="cs-title">{kase.title}</h2>
              <div className="cs-subtitle">{kase.subtitle}</div>
              {kase.visual && <CaseVisualView visual={kase.visual} color={color} />}
              <p className="cs-surface">{rich(kase.surface)}</p>

              {kase.keyFacts && kase.keyFacts.length > 0 && (
                <div className="cs-facts">
                  {kase.keyFacts.map((f, i) => (
                    <div key={i} className="csf">
                      <span className="csf-label">{f.label}</span>
                      <span className="csf-value">{f.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {kase.background && (
                <div className="cs-background">
                  <div className="csb-lab">BACKGROUND · 배경</div>
                  <p>{rich(kase.background)}</p>
                </div>
              )}

              {kase.characters && kase.characters.length > 0 && (
                <div className="cs-cast">
                  <div className="csc-lab">CAST · 핵심 인물</div>
                  {kase.characters.map((p, i) => (
                    <div key={i} className="csc-person">
                      <div className="cscp-head">
                        <span className="cscp-name">{p.name}</span>
                        <span className="cscp-role">{p.role}</span>
                      </div>
                      <div className="cscp-note">{p.note}</div>
                    </div>
                  ))}
                </div>
              )}

              <button className="nextcue" onClick={next}>
                이 고민, 어느 수업에서 나왔나 <span>→</span>
              </button>
            </div>
          )}

          {/* ── 2. 강의 뿌리 ── */}
          {stepKey === "roots" && (
            <div className="step-content case-roots">
              <div className="eyebrow eyebrow-step">ROOTS · 강의 뿌리</div>
              <div className="cr-lead">
                과제는 표면이다. 이 사례는 이 수업들의 이론에서 자라났다.
              </div>

              {kase.theoryApplications && kase.theoryApplications.length > 0 ? (
                <div className="cr-theories">
                  {kase.theoryApplications.map((t, i) => {
                    const lec = lectureById(t.lectureId);
                    return (
                      <div key={i} className="cr-theory">
                        <div className="crt-head">
                          {lec && <span className="crt-n">{String(lec.n).padStart(2, "0")}강</span>}
                          <span className="crt-concept">{t.concept}</span>
                        </div>
                        {lec && <div className="crt-lecture">{lec.title}</div>}
                        <div className="crt-how">{rich(t.how)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="cr-lectures">
                  {rootLectures.map((l) => (
                    <div key={l.id} className="cr-lecture">
                      <div className="crl-n">{String(l.n).padStart(2, "0")}강</div>
                      <div className="crl-body">
                        <div className="crl-title">{l.title}</div>
                        <div className="crl-idea">{l.bigIdea}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="nextcue" onClick={next}>
                그래서 — 옛 눈과 새 눈으로 본다 <span>→</span>
              </button>
            </div>
          )}

          {/* ── 3. 패러다임 렌즈 ── */}
          {stepKey === "paradigm" && (
            <div className="step-content case-paradigm">
              <div className="eyebrow eyebrow-step">LENS · 패러다임 렌즈</div>
              <div className="pl-question">{kase.paradigm.question}</div>

              {kase.paradigmAxes && kase.paradigmAxes.length > 0 ? (
                <div className="pl-axes">
                  <div className="pla-head">
                    <span className="pla-col old">옛 패러다임 · 잭웰치式</span>
                    <span className="pla-col new">새 패러다임 · 지금</span>
                  </div>
                  {kase.paradigmAxes.map((a, i) => (
                    <div key={i} className="pla-row">
                      <div className="pla-label">{a.label}</div>
                      <div className="pla-cells">
                        <div className="pla-cell old">{a.old}</div>
                        <div className="pla-cell new">{a.new}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="pl-toggle">
                    <button
                      className={"plt-btn" + (lens === "old" ? " on" : "")}
                      onClick={() => setLens("old")}
                    >
                      옛 패러다임
                    </button>
                    <button
                      className={"plt-btn" + (lens === "new" ? " on" : "")}
                      onClick={() => setLens("new")}
                    >
                      새 패러다임
                    </button>
                  </div>
                  <div className={"pl-panel " + lens}>
                    <div className="plp-tag">
                      {lens === "old" ? "잭웰치式 — 어제의 정답" : "새 패러다임 — 지금의 해석"}
                    </div>
                    <p className="plp-text">
                      {lens === "old" ? kase.paradigm.old : kase.paradigm.new}
                    </p>
                  </div>
                </>
              )}

              <div className="pl-reading">
                <span className="plr-lab">읽기</span>
                <p>{rich(kase.paradigm.reading)}</p>
              </div>
              <button className="nextcue" onClick={next}>
                17기는 이렇게 봤다 <span>→</span>
              </button>
            </div>
          )}

          {/* ── 4. 17기 해석 ── */}
          {stepKey === "take" && (
            <div className="step-content case-take">
              <div className="eyebrow eyebrow-step">OUR TAKE · 17기 해석</div>
              <div className="ct-group">{kase.sourceGroup} 발표</div>

              {kase.debatePrompt && (
                <div className="ct-debate-q">{kase.debatePrompt}</div>
              )}

              {kase.debate && kase.debate.length > 0 && (
                <div className="ct-debate">
                  {kase.debate.map((d, i) => (
                    <div key={i} className={"ctd-side" + (i === 0 ? " a" : " b")}>
                      <div className="ctds-stance">{d.stance}</div>
                      <ul>
                        {d.points.map((p, j) => (
                          <li key={j}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <p className="ct-ppt">{rich(kase.ourTake)}</p>

              {kase.ourTakeDetail && kase.ourTakeDetail.length > 0 && (
                <div className="ct-detail">
                  {kase.ourTakeDetail.map((d, i) => (
                    <div key={i} className="ctdt">{rich(d)}</div>
                  ))}
                </div>
              )}

              {!kase.debate && kase.discussion && kase.discussion.length > 0 && (
                <div className="ct-discussion">
                  <div className="ctd-lab">토론에서 나온 갈래</div>
                  <ul>
                    {kase.discussion.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {kase.qna && kase.qna.length > 0 && (
                <div className="ct-qna">
                  <div className="ctq-lab">Q&amp;A — 날선 질문들</div>
                  <ul>
                    {kase.qna.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {kase.ourTakeExtra && kase.ourTakeExtra.trim() !== "" && (
                <div className="ct-extra">
                  <span>그날의 한마디</span>
                  <p>{rich(kase.ourTakeExtra)}</p>
                </div>
              )}

              <button className="nextcue" onClick={next}>
                이 사례의 이론 카드 보기 <span>→</span>
              </button>
            </div>
          )}

          {/* ── 5. 연결 이론 ── */}
          {stepKey === "connect" && (
            <div className="step-content case-connect">
              <div className="eyebrow eyebrow-step">CONNECT · 연결 이론</div>
              <div className="cc-lead">
                이 한 케이스는 이 이론 카드들의 살아있는 증거다.
              </div>
              <div className="cc-cards">
                {linkedCards.map((c) => (
                  <button
                    key={c.id}
                    className="cc-card"
                    style={{ ["--c" as string]: COURSE_COLOR[c.course] } as React.CSSProperties}
                    onClick={() => onOpen(c.id)}
                  >
                    <span className="ccc-concept">{c.concept}</span>
                    <span className="ccc-hook">{rich(c.hook)}</span>
                    <span className="ccc-arrow">카드 열기 →</span>
                  </button>
                ))}
              </div>

              {kase.quotes && kase.quotes.length > 0 && (
                <div className="cc-quotes">
                  <div className="ccq-lab">원문에서 — 그들의 목소리</div>
                  {kase.quotes.map((q, i) => (
                    <blockquote key={i} className="ccq">
                      <p>&ldquo;{q.text}&rdquo;</p>
                      <cite>— {q.by}</cite>
                    </blockquote>
                  ))}
                </div>
              )}

              <div className="finish-row">
                <button className="finish" onClick={onClose}>
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="detail-nav">
          <button className="dn-btn" onClick={back} disabled={safeStep === 0}>
            ← 이전
          </button>
          <div className="dn-dots">
            {CASE_STEPS.map((key, i) => (
              <button
                key={key}
                className={"dot " + (i === safeStep ? "on" : "") + (i < safeStep ? " done" : "")}
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
