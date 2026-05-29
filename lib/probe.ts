import type { Industry } from "./types";
import probesJson from "@/data/probes.json";

// ── 3단계 분기 진단(5-Why 축약형) ──────────────────────────────
// 빌드타임 사전 저작. 런타임은 트리를 걸어다닐 뿐 — API 호출 없음.
// Stage 1: root(증상) → Stage 2: node(원인) → Stage 3: leaf의 byIndustry(내 산업 처방)

export interface ProbeOption {
  label: string;
  next?: string; // 다음 노드 id (Stage 1 → Stage 2)
  leaf?: string; // 최종 leaf id (Stage 2 → Stage 3)
}

export interface ProbeQuestion {
  q: string;
  options: ProbeOption[];
}

export interface ProbeLeaf {
  verdict: string;
  common: string;
  byIndustry: Record<string, string>; // 키: Industry enum 또는 "default"
}

export interface CardProbe {
  intro: string;
  root: ProbeQuestion;
  nodes: Record<string, ProbeQuestion>;
  leaves: Record<string, ProbeLeaf>;
}

const PROBES = probesJson as Record<string, unknown>;

/** 카드에 분기 진단이 있으면 반환, 없으면 null. (_meta 등 비카드 키는 제외) */
export function getProbe(cardId: string): CardProbe | null {
  if (cardId === "_meta") return null;
  const p = PROBES[cardId];
  if (!p || typeof p !== "object") return null;
  const probe = p as Partial<CardProbe>;
  if (!probe.root || !probe.leaves) return null;
  return probe as CardProbe;
}

export function hasProbe(cardId: string): boolean {
  return getProbe(cardId) !== null;
}

/**
 * leaf의 산업별 처방을 해석한다.
 * 사용자의 my_industries를 순서대로 보고 첫 매칭을 쓰되, 없으면 default.
 * 반환: { text, matchedIndustry } — matchedIndustry가 null이면 default 사용.
 */
export function resolveLeafAdvice(
  leaf: ProbeLeaf,
  myIndustries: Industry[]
): { text: string; matchedIndustry: Industry | null } {
  for (const ind of myIndustries) {
    if (leaf.byIndustry[ind]) {
      return { text: leaf.byIndustry[ind], matchedIndustry: ind };
    }
  }
  return {
    text: leaf.byIndustry["default"] ?? leaf.common,
    matchedIndustry: null,
  };
}

/** 이 leaf가 명시적으로 다루는 산업 목록 (default 제외) — "다른 산업도 보기" UI용 */
export function leafIndustries(leaf: ProbeLeaf): string[] {
  return Object.keys(leaf.byIndustry).filter((k) => k !== "default");
}
