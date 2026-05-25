import type { Card } from "./types";
import { UNIVERSAL } from "./manifest";
import neighborsJson from "@/data/neighbors.json";

export interface RelatedItem {
  c: Card;
  s: number;
  sharedD: number;
  sharedI: number;
}

// 오프라인 사전 계산된 의미 이웃 매트릭스.
// 구조: { "card-id": ["neighbor-id-1", ..., "neighbor-id-8"], "_meta": {...} }
const NEIGHBORS = neighborsJson as Record<string, unknown>;

// 점수 공식:
//  - 오프라인 의미 이웃에 등록되어 있으면 +6 (가장 강한 신호 — 내가 직접 큐레이션)
//  - 같은 과목 +3
//  - 공유 도메인 +2/개
//  - 공유 산업 +1.5/개 (범용 제외)
export function relatedCards(card: Card, all: Card[]): RelatedItem[] {
  const neighbors = NEIGHBORS[card.id];
  const neighborIds = new Set(Array.isArray(neighbors) ? (neighbors as string[]) : []);

  const others = all.filter((c) => c.id !== card.id);
  const scored: RelatedItem[] = others
    .map((c) => {
      let s = 0;
      if (neighborIds.has(c.id)) s += 6;
      if (c.course === card.course) s += 3;
      const sharedD = (c.domain || []).filter((d) =>
        (card.domain || []).includes(d)
      ).length;
      s += sharedD * 2;
      const sharedI = (c.industry || []).filter(
        (i) => i !== UNIVERSAL && (card.industry || []).includes(i)
      ).length;
      s += sharedI * 1.5;
      return { c, s, sharedD, sharedI };
    })
    .filter((x) => x.s > 0);
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, 6);
}
