"use client";
import { useEffect, useRef, useState } from "react";
import { COURSES, COURSE_SHORT, DOMAINS, INDUSTRIES } from "@/lib/manifest";
import type { FilterState } from "@/lib/types";
import { logEvent } from "@/lib/events";

type Key = "course" | "domain" | "industry";

interface GroupDef {
  key: Key;
  label: string;
  items: readonly string[];
  short: (c: string) => string;
}

function groups(): GroupDef[] {
  return [
    { key: "course", label: "과목", items: COURSES, short: (c) => COURSE_SHORT[c as keyof typeof COURSE_SHORT] || c },
    { key: "domain", label: "적용 영역", items: DOMAINS, short: (c) => c },
    { key: "industry", label: "적용 산업", items: INDUSTRIES, short: (c) => c },
  ];
}

function toggleInArray<T>(arr: T[], v: T): T[] {
  const s = new Set(arr as T[]);
  if (s.has(v)) s.delete(v);
  else s.add(v);
  return Array.from(s);
}

interface FiltersBaseProps {
  state: FilterState;
  setState: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
}

// 데스크탑 — 한 줄 탭 + 그룹별 칩
export function FilterChips({ state, setState }: FiltersBaseProps) {
  const gs = groups();
  const [group, setGroup] = useState<Key>("course");
  const cur = gs.find((g) => g.key === group)!;
  const sel = state[group] as string[];
  const reset = () => {
    setState("course", []);
    setState("domain", []);
    setState("industry", []);
    setState("search", "");
    setState("myOnly", false);
    setState("savedOnly", false);
  };
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
        {gs.map((g) => (
          <button
            key={g.key}
            className={"chip-tab " + (group === g.key ? "on" : "")}
            onClick={() => setGroup(g.key)}
          >
            <span className="flab">{g.label}</span>
            {(state[g.key] as string[]).length > 0 && (
              <span className="flab-n">{(state[g.key] as string[]).length}</span>
            )}
          </button>
        ))}
        <button className="reset" style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", letterSpacing: ".1em", textTransform: "uppercase" }} onClick={reset}>
          모두 초기화
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, width: "100%", marginTop: 8 }}>
        {cur.items.map((it) => (
          <button
            key={it}
            className={"chip " + (sel.includes(it) ? "on" : "")}
            onClick={() => setState(group, toggleInArray(sel, it) as never)}
          >
            {cur.short(it)}
          </button>
        ))}
      </div>
    </>
  );
}

// 모바일 — 접힘 그룹
export function FilterPanel({ state, setState }: FiltersBaseProps) {
  const gs = groups();
  const [open, setOpen] = useState<Key | null>(null);
  return (
    <div className="fcollapse">
      {gs.map((g) => {
        const isOpen = open === g.key;
        const sel = state[g.key] as string[];
        const sum = sel.length === 0 ? "전체" : sel.length + "개 선택";
        return (
          <div key={g.key} className={"fgroup-m" + (isOpen ? " open" : "")}>
            <button
              className="fhead-m"
              onClick={() => setOpen(isOpen ? null : g.key)}
            >
              <span>{g.label}</span>
              <span className="summary">
                {sum}{" "}
                <span style={{ color: "var(--ink-faint)", marginLeft: "6px" }}>
                  {isOpen ? "∧" : "∨"}
                </span>
              </span>
            </button>
            <div className="fchips-m">
              {g.items.map((it) => (
                <button
                  key={it}
                  className={"chip " + (sel.includes(it) ? "on" : "")}
                  onClick={() => setState(g.key, toggleInArray(sel, it) as never)}
                >
                  {g.short(it)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface SearchProps {
  state: FilterState;
  setState: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
  savedCount: number;
}

export function SearchBar({ state, setState, savedCount }: SearchProps) {
  // 검색어가 안정된 (2초 이상 입력 없음) 시점에 search_performed 1회 발화
  const lastLoggedRef = useRef<string>("");
  useEffect(() => {
    const q = state.search.trim();
    if (q.length < 2 || q === lastLoggedRef.current) return;
    const t = setTimeout(() => {
      if (state.search.trim() === q && q !== lastLoggedRef.current) {
        logEvent("search_performed", { keyword: q });
        lastLoggedRef.current = q;
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [state.search]);

  return (
    <div className="search-bar">
      <div className="ico">
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <input
        value={state.search}
        onChange={(e) => setState("search", e.target.value)}
        placeholder="회의 직전 — '아 이거 어디서 봤더라' 키워드 검색 (예: 가격, 동기, 이탈, 광고비)"
      />
      <label className="myind">
        <input
          type="checkbox"
          checked={state.myOnly}
          onChange={(e) => setState("myOnly", e.target.checked)}
        />
        <span className="sw"></span>
        <span>내 산업만</span>
      </label>
      <label className="myind" style={{ borderLeft: "1px solid var(--line-2)" }}>
        <input
          type="checkbox"
          checked={state.savedOnly}
          onChange={(e) => setState("savedOnly", e.target.checked)}
        />
        <span className="sw"></span>
        <span>★ 내 솔루션{savedCount ? " " + savedCount : ""}</span>
      </label>
    </div>
  );
}
