// 학술봇 지식 — 서버 전용(브라우저 번들에 들어가면 안 된다: 1학기 카드가 1MB 가까이 된다).
//
// ① 2학기: 학술운영보드가 공개하는 hakbot_kb.json(과목별 한 장 + FAQ). 정본은 Z:/EMBA/_board/.
//    보드에 반영되면 5분 안에 학술봇도 새 내용을 본다.
// ② 1학기: 이 레포의 data/cards.json(이론카드 126) + data/cases.json(조별 케이스 42).
//    질문마다 전부 넣으면 비싸서, 낱말이 겹치는 카드만 몇 장 골라 넣는다(RAG 의 검색 단계).
//
// ⚠ readFileSync 경로는 문자열 그대로 둔다 — 인자로 받는 범용 함수로 만들면
//   Vercel 파일 추적이 경로를 못 읽어 운영에서 파일이 빠진다(2026-10-01 gi-board 함정).
import { readFileSync } from "node:fs";
import path from "node:path";

export const KB_URL = "https://willryugo.github.io/EMBA17/hakbot_kb.json";

export interface Term2Kb {
  updated: string;
  courses: Record<string, unknown>[];
  faq?: { q: string; a: string; src?: string; course?: string }[];
}

let term2Cache: { at: number; kb: Term2Kb } | null = null;

/** 2학기 지식 — 5분 캐시. 보드가 안 열리면 마지막으로 받은 것을 쓴다. */
export async function loadTerm2(): Promise<Term2Kb | null> {
  if (term2Cache && Date.now() - term2Cache.at < 5 * 60_000) return term2Cache.kb;
  try {
    const res = await fetch(KB_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`kb ${res.status}`);
    const kb = (await res.json()) as Term2Kb;
    if (!Array.isArray(kb.courses)) throw new Error("kb shape");
    term2Cache = { at: Date.now(), kb };
    return kb;
  } catch (e) {
    console.log("[hakbot] term2 kb 실패:", String(e));
    return term2Cache?.kb ?? null;
  }
}

interface Card {
  id: string; course?: string; professor?: string; term?: string; week?: number;
  concept?: string; hook?: string; insight?: string; application?: string;
}
interface Case {
  id: string; title?: string; subtitle?: string; course?: string; professor?: string;
  sourceGroup?: string; term?: string; subject?: string; surface?: string;
}

let term1: { cards: Card[]; cases: Case[] } | null = null;
function loadTerm1() {
  if (term1) return term1;
  const cards = JSON.parse(readFileSync(path.join(process.cwd(), "data", "cards.json"), "utf8")) as Card[];
  const casesRaw = JSON.parse(readFileSync(path.join(process.cwd(), "data", "cases.json"), "utf8"));
  const cases = (Array.isArray(casesRaw) ? casesRaw : Object.values(casesRaw)) as Case[];
  term1 = { cards, cases };
  return term1;
}

/** 한국어는 띄어쓰기가 들쭉날쭉해서 낱말 + 한글 두 글자 조각을 같이 쓴다. */
function tokens(q: string): string[] {
  const words = q.toLowerCase().match(/[a-z0-9]+|[가-힣]+/g) || [];
  const out = new Set<string>();
  for (const w of words) {
    if (w.length >= 2) out.add(w);
    if (/[가-힣]/.test(w) && w.length >= 3) for (let i = 0; i + 2 <= w.length; i++) out.add(w.slice(i, i + 2));
  }
  // 질문에 흔한 말은 뺀다(점수를 흐린다)
  for (const s of ["교수님", "교수", "수업", "뭐야", "언제", "어디", "어떻게", "하나요", "나요", "인가", "있나", "알려", "말씀"]) out.delete(s);
  return [...out];
}

function score(text: string, toks: string[]): number {
  const t = text.toLowerCase();
  let s = 0;
  for (const k of toks) if (t.includes(k)) s += k.length >= 3 ? 2 : 1;
  return s;
}

const clip = (s: unknown, n: number) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};

/** 1학기 카드·케이스 중 질문과 가까운 것 몇 장을 짧게 요약해 돌려준다. */
export function retrieveTerm1(q: string, nCards = 5, nCases = 2): string {
  const toks = tokens(q);
  if (!toks.length) return "";
  const { cards, cases } = loadTerm1();
  const rc = cards
    .map((c) => ({ c, s: score([c.concept, c.course, c.professor, c.hook, c.insight].join(" "), toks) * 2 + score(String(c.application || ""), toks) }))
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s)
    .slice(0, nCards);
  const rs = cases
    .map((c) => ({ c, s: score([c.title, c.subtitle, c.course, c.professor, c.subject, c.surface].join(" "), toks) }))
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s)
    .slice(0, nCases);
  const lines: string[] = [];
  for (const { c } of rc)
    lines.push(`[1학기 이론카드 ${c.id}] ${c.course} · ${c.professor} 교수님 · ${c.week ?? "?"}주차 · 개념: ${clip(c.concept, 60)} · 요점: ${clip(c.insight, 260)} · 적용: ${clip(c.application, 160)}`);
  for (const { c } of rs)
    lines.push(`[1학기 조별 케이스 ${c.id}] ${c.course} · ${c.professor} 교수님 · ${c.title}(${c.subtitle ?? ""}) · ${clip(c.surface, 300)}`);
  return lines.join("\n");
}
