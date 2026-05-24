import type { Card } from "./types";
import { UNIVERSAL } from "./manifest";

export interface RelatedItem {
  c: Card;
  s: number;
  sharedD: number;
  sharedI: number;
}

// 같은 과목 +3, 공유 도메인 +2/개, 공유 산업 +1.5/개 (범용 제외)
export function relatedCards(card: Card, all: Card[]): RelatedItem[] {
  const others = all.filter((c) => c.id !== card.id);
  const scored: RelatedItem[] = others
    .map((c) => {
      let s = 0;
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
  return scored.slice(0, 5);
}
