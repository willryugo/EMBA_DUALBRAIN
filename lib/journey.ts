import type { Industry } from "./types";
import journeysJson from "@/data/journeys.json";

// ── 진짜 5why 선형 사다리 ──────────────────────────────────────
// "왜?"를 5단계 파고들어 근본원인 도달 (T타임즈식). step.pick이 있으면
// 사용자가 자기 상황 선택 → tag 누적. 마지막 result는 tag + 내 산업으로 결정.
// 빌드타임 사전저작. 런타임 API 0.

export interface JourneyPickOption {
  label: string;
  tag: string;
}

export interface JourneyStep {
  n: number;
  why: string;
  because?: string; // 고정 설명
  keyword?: string; // 강조 키워드
  pick?: { q: string; options: JourneyPickOption[] }; // 사용자 선택
  becauseByTag?: Record<string, string>; // pick 후 보여줄 설명
  isResult?: boolean; // 마지막 결과 슬라이드
}

export interface JourneyResult {
  verdict: string;
  byIndustry: Record<string, string>;
}

export interface CardJourney {
  symptom: string;
  symptomSub?: string;
  steps: JourneyStep[];
  results: Record<string, JourneyResult>;
  related: string[];
}

const JOURNEYS = journeysJson as Record<string, unknown>;

export function getJourney(cardId: string): CardJourney | null {
  if (cardId === "_meta") return null;
  const j = JOURNEYS[cardId];
  if (!j || typeof j !== "object") return null;
  const cj = j as Partial<CardJourney>;
  if (!cj.steps || !cj.results) return null;
  return cj as CardJourney;
}

export function hasJourney(cardId: string): boolean {
  return getJourney(cardId) !== null;
}

/** 산업별 처방 해석 — my_industries 첫 매칭, 없으면 default */
export function resolveResultAdvice(
  result: JourneyResult,
  myIndustries: Industry[]
): { text: string; matchedIndustry: Industry | null } {
  for (const ind of myIndustries) {
    if (result.byIndustry[ind]) {
      return { text: result.byIndustry[ind], matchedIndustry: ind };
    }
  }
  return { text: result.byIndustry["default"] ?? "", matchedIndustry: null };
}

export function resultIndustries(result: JourneyResult): string[] {
  return Object.keys(result.byIndustry).filter((k) => k !== "default");
}
