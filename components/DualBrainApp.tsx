"use client";
import { useEffect, useMemo, useState } from "react";
import cardsData from "@/data/cards.json";
import ownerPainsData from "@/data/owner-pains.json";
import type {
  Card,
  Course,
  Domain,
  FilterState,
  Industry,
  OwnerPainCategory,
  TweakState,
} from "@/lib/types";
import { MY_INDUSTRIES_DEFAULT, UNIVERSAL } from "@/lib/manifest";
import { applyFont, applyTheme } from "@/lib/themes";
import { store } from "@/lib/storage";

import { Masthead } from "./Masthead";
import { TitleBlock } from "./TitleBlock";
import { HeroAI } from "./HeroAI";
import { SearchBar, FilterChips, FilterPanel } from "./Filters";
import { MagCard, layoutClass } from "./MagCard";
import { DetailModal } from "./DetailModal";
import { OntologyGraph } from "./OntologyGraph";
import { TweaksPanel } from "./TweaksPanel";
import { Footer } from "./Footer";

const CARDS = cardsData as Card[];
const OWNER_PAINS = ownerPainsData as OwnerPainCategory[];

const TWEAK_DEFAULTS: TweakState = {
  theme: "dawn",
  font: "classic",
  quoteCards: true,
  density: "regular",
};

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
  const [tweaks, setTweaks] = useState<TweakState>(TWEAK_DEFAULTS);
  const [filter, setFilter] = useState<FilterState>(FILTER_DEFAULTS);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [myIndustries, setMyIndustries] = useState<Industry[]>(MY_INDUSTRIES_DEFAULT);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [today, setToday] = useState("");

  // 마운트 후 1회: localStorage 복원
  useEffect(() => {
    setToday(todayStr());
    const storedTweaks: Partial<TweakState> = {
      theme: store.get("emba17_theme") || undefined,
      font: store.get("emba17_font") || undefined,
      quoteCards: store.get("emba17_quoteCards") ?? undefined,
      density: store.get("emba17_density") || undefined,
    };
    setTweaks((t) => ({ ...t, ...(storedTweaks as TweakState) }));

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
  }, []);

  // 테마·폰트 라이브 반영
  useEffect(() => {
    applyTheme(tweaks.theme);
    store.set("emba17_theme", tweaks.theme);
  }, [tweaks.theme]);
  useEffect(() => {
    applyFont(tweaks.font);
    store.set("emba17_font", tweaks.font);
  }, [tweaks.font]);
  useEffect(() => {
    store.set("emba17_quoteCards", tweaks.quoteCards);
  }, [tweaks.quoteCards]);
  useEffect(() => {
    store.set("emba17_density", tweaks.density);
    if (typeof document === "undefined") return;
    document.body.classList.remove(
      "density-compact",
      "density-regular",
      "density-airy"
    );
    document.body.classList.add("density-" + tweaks.density);
  }, [tweaks.density]);

  const setTweak = <K extends keyof TweakState>(k: K, v: TweakState[K]) => {
    setTweaks((s) => ({ ...s, [k]: v }));
  };

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

  return (
    <>
      <Masthead
        onGraphToggle={() => setView(view === "graph" ? "home" : "graph")}
        graphOpen={view === "graph"}
        savedCount={savedIds.length}
        todayLabel={today}
      />
      <TitleBlock todayLabel={today} totalCards={CARDS.length} />

      <main className="wrap">
        <HeroAI
          cards={CARDS}
          ownerPains={OWNER_PAINS}
          myIndustries={myIndustries}
          onOpen={setOpenId}
        />

        <div className="section-head" style={{ marginTop: 54 }}>
          <h2>회의 직전, 키워드로 꺼내기</h2>
          <div className="sub">SEARCH · FILTER</div>
        </div>
        <SearchBar state={filter} setState={setF} savedCount={savedIds.length} />
        <div className="filter-row">
          <FilterChips state={filter} setState={setF} />
        </div>
        <FilterPanel state={filter} setState={setF} />

        <div className="count">
          <b>
            {filtered.length}편의 인사이트
            {filterActive ? " · 필터 적용됨" : ""}
          </b>
          <span>EDITORIAL · 카드 한 장 = 5-step 솔루션</span>
        </div>
        <div className="mag">
          {filtered.length === 0 ? (
            <div className="empty">
              조건에 맞는 카드가 없어요.
              <br />
              <button onClick={resetFilters}>필터 초기화 →</button>
            </div>
          ) : (
            filtered.map((c, i) => (
              <MagCard
                key={c.id}
                card={c}
                index={i}
                layout={layoutClass(i, filterActive, tweaks.quoteCards)}
                onClick={setOpenId}
              />
            ))
          )}
        </div>
      </main>

      <Footer todayLabel={today} />

      <button
        className="fab"
        onClick={() => setView(view === "graph" ? "home" : "graph")}
      >
        {view === "graph" ? "← 매거진" : "∞ 온톨로지"}
      </button>

      <button
        className="tweaks-toggle"
        onClick={() => setTweaksOpen((o) => !o)}
        title="테마·폰트·팔레트 트윅"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Tweaks · 테마 변경</span>
      </button>

      {openId && (
        <DetailModal
          cardId={openId}
          cards={CARDS}
          onClose={() => setOpenId(null)}
          onOpen={setOpenId}
        />
      )}

      {view === "graph" && (
        <OntologyGraph
          cards={CARDS}
          onOpen={(id) => setOpenId(id)}
          onClose={() => setView("home")}
        />
      )}

      <TweaksPanel
        open={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
        state={tweaks}
        setState={setTweak}
        onResetFilters={resetFilters}
        onClearSaved={() => {
          setSavedIds([]);
        }}
      />
    </>
  );
}
