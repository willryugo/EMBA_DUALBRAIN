"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import cardsData from "@/data/cards.json";
import ownerPainsData from "@/data/owner-pains.json";
import casesData from "@/data/cases.json";
import lecturesData from "@/data/lectures.json";
import type {
  Card,
  Course,
  Domain,
  FilterState,
  Industry,
  OwnerPainCategory,
  CasesFile,
  LecturesFile,
} from "@/lib/types";
import { MY_INDUSTRIES_DEFAULT, UNIVERSAL, COURSE_COLOR } from "@/lib/manifest";
import { caseToCard, isCaseCardId, toCaseId } from "@/lib/caseToCard";
import { applyFont, applyTheme } from "@/lib/themes";
import { store } from "@/lib/storage";

import { Masthead } from "./Masthead";
import { TitleBlock } from "./TitleBlock";
import { HeroAI } from "./HeroAI";
import { FilterChips, FilterPanel } from "./Filters";
import { MagCard, layoutClass } from "./MagCard";
import { DetailModal } from "./DetailModal";
import { CaseModal } from "./CaseModal";
import { OntologyGraph } from "./OntologyGraph";
import { Footer } from "./Footer";

const OWNER_PAINS = ownerPainsData as OwnerPainCategory[];
const ALL_CASES = (casesData as CasesFile).cases;
const DEEP_CASES = ALL_CASES.filter((c) => c.depth === "deep");
const LECTURES = (lecturesData as LecturesFile).lectures;

// deep + pin 모든 케이스를 검색 카드로 (pin도 카드 그리드·검색·모달에 노출)
// 변환 로직은 lib/caseToCard.ts 공용 (모바일도 동일 사용)
const CASE_CARDS: Card[] = ALL_CASES.map(caseToCard);
const CARDS: Card[] = [...(cardsData as Card[]), ...CASE_CARDS];

const FILTER_DEFAULTS: FilterState = {
  course: [],
  domain: [],
  industry: [],
  search: "",
  myOnly: false,
  savedOnly: false,
};

function todayStr() {
  const d = new Date();
  const m = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${m[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function DualBrainApp() {
  // Hydration-안전: 모든 클라이언트 상태는 서버 기본값으로 초기화, 마운트 후 localStorage에서 복원.
  const [view, setView] = useState<"home" | "graph">("home");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(FILTER_DEFAULTS);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [myIndustries, setMyIndustries] = useState<Industry[]>(MY_INDUSTRIES_DEFAULT);
  const [bizMode, setBizMode] = useState<"all" | "b2b" | "b2c">("all");
  const [today, setToday] = useState("");
  // 방문(새로고침)마다 바뀌는 시드 — 상단 대표 카드를 과목별로 순환시킨다. 0=첫 페인트(하이드레이션 안전).
  const [visitNonce, setVisitNonce] = useState(0);
  useEffect(() => {
    const n = typeof performance !== "undefined" ? performance.now() : 1;
    setVisitNonce((Math.floor(n * 1000) % 100000) + 1);
  }, []);

  // 마운트 후 1회: 고정 UI 적용 + localStorage 복원(필터·저장·산업만)
  useEffect(() => {
    setToday(todayStr());
    // 전원 동일 — 여명 테마 · Pretendard · regular 밀도 고정(테마/폰트 저장값 무시).
    applyTheme("dawn");
    applyFont("allsans");
    if (typeof document !== "undefined") {
      document.body.classList.remove("density-compact", "density-airy");
      document.body.classList.add("density-regular");
    }

    setFilter({
      course: (store.get<Course[]>("emba17_filter_course")) || [],
      domain: (store.get<Domain[]>("emba17_filter_domain")) || [],
      industry: (store.get<Industry[]>("emba17_filter_industry")) || [],
      search: (store.get<string>("emba17_filter_search")) || "",
      myOnly: (store.get<boolean>("emba17_filter_myOnly")) || false,
      savedOnly: false,
    });

    setSavedIds(store.get<string[]>("emba17_saved") || []);
    setMyIndustries(
      store.get<Industry[]>("emba17_my_industries") || MY_INDUSTRIES_DEFAULT
    );
    const bm = store.get<"all" | "b2b" | "b2c">("emba17_biz_mode");
    if (bm === "b2b" || bm === "b2c" || bm === "all") setBizMode(bm);
  }, []);

  // 첫 방문 산업 모달(GlobalGates)·'내 산업' 재편집은 별도 트리라 저장만으론 여기 상태가 안 바뀐다.
  // CustomEvent로 즉시 동기화 — 새로고침 없이 '내 산업'이 바로 반영되게.
  useEffect(() => {
    const onInd = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setMyIndustries(detail as Industry[]);
    };
    window.addEventListener("emba17:industries-changed", onInd);
    return () => window.removeEventListener("emba17:industries-changed", onInd);
  }, []);

  // 케이스 카드(id=case-card-*)는 CaseModal, 일반 카드는 DetailModal
  const handleCardClick = useCallback((id: string) => {
    if (isCaseCardId(id)) {
      setOpenCaseId(toCaseId(id));
    } else {
      setOpenId(id);
    }
  }, []);

  const setF = <K extends keyof FilterState>(k: K, v: FilterState[K]) => {
    setFilter((s) => {
      const next = { ...s, [k]: v };
      store.set("emba17_filter_" + k, v);
      return next;
    });
  };

  const resetFilters = () => {
    setFilter(FILTER_DEFAULTS);
    (
      ["course", "domain", "industry", "search", "myOnly", "savedOnly"] as const
    ).forEach((k) => {
      const def = FILTER_DEFAULTS[k];
      store.set("emba17_filter_" + k, def);
    });
  };

  // 카드 저장/해제
  useEffect(() => {
    store.set("emba17_saved", savedIds);
  }, [savedIds]);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // 모달(STEP 4) 안에서 저장이 바뀔 수 있으니, 닫을 때 store에서 다시 읽어 동기화
  const syncSavedFromStore = useCallback(() => {
    setSavedIds(store.get<string[]>("emba17_saved") || []);
  }, []);

  const filtered = useMemo(() => {
    return CARDS.filter((c) => {
      if (filter.course.length && !filter.course.includes(c.course)) return false;
      if (
        filter.domain.length &&
        !(c.domain || []).some((d) => filter.domain.includes(d))
      )
        return false;
      const indSet = filter.myOnly ? myIndustries : filter.industry;
      if (indSet.length) {
        if (
          !(
            (c.industry || []).some((i) => indSet.includes(i)) ||
            (c.industry || []).includes(UNIVERSAL)
          )
        )
          return false;
      }
      if (filter.savedOnly && !savedIds.includes(c.id)) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const text = [
          c.hook,
          c.concept,
          c.insight,
          c.application,
          c.case_title,
          c.case_body,
          c.decision,
          c.quote,
        ]
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [filter, savedIds, myIndustries]);

  const filterActive =
    filter.course.length > 0 ||
    filter.domain.length > 0 ||
    filter.industry.length > 0 ||
    filter.search.length > 0 ||
    filter.myOnly ||
    filter.savedOnly;

  // 방문마다 '대표 과목'을 순환 — 같은 카드만 맨 위에 고정되던 문제 해결.
  // 한 번은 조직(HR), 한 번은 마케팅, 한 번은 회계… 식으로 상단 feat 카드가 매 새로고침마다 바뀐다.
  // 필터 적용 중이거나 첫 페인트(visitNonce=0)면 원래 순서 유지(하이드레이션 안전).
  const displayCards = useMemo(() => {
    if (filterActive || visitNonce === 0) return filtered;
    const courses: string[] = [];
    for (const c of filtered) if (!courses.includes(c.course)) courses.push(c.course);
    if (courses.length < 2) return filtered;
    const lead = courses[visitNonce % courses.length];
    const k = filtered.findIndex((c) => c.course === lead);
    if (k <= 0) return filtered;
    return filtered.slice(k).concat(filtered.slice(0, k));
  }, [filtered, filterActive, visitNonce]);

  return (
    <>
      <Masthead
        onGraphToggle={() => setView(view === "graph" ? "home" : "graph")}
        graphOpen={view === "graph"}
        savedCount={savedIds.length}
        todayLabel={today}
      />
      <TitleBlock
        todayLabel={today}
        totalCards={CARDS.length}
        onEnter={() => setView("graph")}
      />

      <main className="wrap">
        <HeroAI
          cards={CARDS}
          ownerPains={OWNER_PAINS}
          myIndustries={myIndustries}
          bizMode={bizMode}
          onOpen={handleCardClick}
          totalCards={CARDS.length}
          onToggleIndustry={(ind) => {
            const next =
              (ind as string) === "__ALL__"
                ? []
                : myIndustries.includes(ind)
                  ? myIndustries.filter((x) => x !== ind)
                  : [...myIndustries, ind];
            setMyIndustries(next);
            store.set("emba17_my_industries", next);
          }}
          onBizMode={(m) => {
            setBizMode(m);
            store.set("emba17_biz_mode", m);
          }}
        />

        <div className="section-head" style={{ marginTop: 54 }}>
          <h2>회의 직전, 키워드로 꺼내기</h2>
          <div className="sub">SEARCH · FILTER</div>
        </div>
        <div className="filter-row">
          <FilterChips state={filter} setState={setF} />
        </div>
        <FilterPanel state={filter} setState={setF} />

        <div className="count">
          <b>
            {filtered.length}편의 인사이트
            {filterActive ? " · 필터 적용됨" : ""}
          </b>
          <span>카드 한 장에 5단계 솔루션</span>
        </div>
        <div className="mag">
          {filtered.length === 0 ? (
            <div className="empty">
              조건에 맞는 카드가 없어요.
              <br />
              <button onClick={resetFilters}>필터 초기화 →</button>
            </div>
          ) : (
            displayCards.map((c, i) => (
              <MagCard
                key={c.id}
                card={c}
                index={i}
                layout={layoutClass(i, filterActive, true)}
                onClick={handleCardClick}
                saved={savedIds.includes(c.id)}
                onToggleSave={toggleSave}
              />
            ))
          )}
        </div>
      </main>

      <Footer todayLabel={today} />

      {openId && (
        <DetailModal
          cardId={openId}
          cards={CARDS}
          onClose={() => {
            setOpenId(null);
            syncSavedFromStore();
          }}
          onOpen={setOpenId}
        />
      )}

      {openCaseId && (
        <CaseModal
          caseId={openCaseId}
          cases={ALL_CASES}
          lectures={LECTURES}
          cards={CARDS}
          onClose={() => setOpenCaseId(null)}
          onOpen={(id) => {
            setOpenCaseId(null);
            setOpenId(id);
          }}
        />
      )}

      {view === "graph" && (
        <OntologyGraph
          cards={CARDS}
          onOpen={(id) => {
            // 그래프를 닫고 카드를 연다 — 안 닫으면 풀스크린 브레인맵이 모달을 덮어버림
            setView("home");
            setOpenId(id);
          }}
          onClose={() => setView("home")}
        />
      )}
    </>
  );
}
