import type { Card, Industry } from "./types";
import { UNIVERSAL } from "./manifest";

export interface RecommendResult {
  ids: string[];
  reason: string;
}

// Phase 1: 키워드 매칭 기반 fallback 추천. Phase 2에서 /api/ask로 교체 예정.
export function recommendCards(
  problem: string,
  cards: Card[],
  myIndustries: Industry[] = []
): RecommendResult {
  const q = problem.toLowerCase();
  const tokens = q.split(/[\s.,?!·]+/).filter((t) => t.length >= 2);

  const scored = cards.map((c) => {
    const text = [
      c.hook,
      c.concept,
      c.insight,
      c.application,
      c.problem_scene,
      c.decision,
      c.quote,
      ...(c.checklist || []),
      c.case_title,
      c.case_body,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let s = 0;
    tokens.forEach((t) => {
      if (text.includes(t)) s += 1;
    });

    // 내 산업 가중치 — 카드가 내 산업과 겹치면 추가 점수
    if (myIndustries.length > 0) {
      const overlap = (c.industry || []).filter(
        (i) => i !== UNIVERSAL && myIndustries.includes(i)
      ).length;
      s += overlap * 1.5;
    }

    return { id: c.id, s };
  });

  scored.sort((a, b) => b.s - a.s);

  return {
    ids: scored.slice(0, 3).map((x) => x.id),
    reason:
      "키워드와 내 산업 가중치로 가장 가까운 카드 3장을 골랐어. Phase 2에서 Claude로 의미 매칭이 강화될 예정.",
  };
}
