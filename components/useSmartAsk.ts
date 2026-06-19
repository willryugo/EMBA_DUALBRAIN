"use client";
import { useCallback } from "react";
import type { Card, Industry } from "@/lib/types";
import { recommendCards, type RecommendResult } from "@/lib/recommend";

// 키워드 + 의미이웃(오프라인 그래프) 검색만 사용 — 즉시·정확·다운로드 0.
//
// ※ 브라우저 임베딩(semantic) 모드는 비활성화했다. 이유:
//   1) embeddings.json은 빌드타임(cards.json)만 사전계산 → 런타임 변환되는 케이스
//      카드(case-card-*)는 벡터가 없어 semantic 검색 결과에 절대 안 나온다.
//      ("terra cog"·"rsh"·"2조 발표"를 쳐도 케이스가 안 잡히던 근본 원인)
//   2) 짧은 영문 고유명사에 임베딩이 약해 엉뚱한 카드가 1위로 올라온다.
//   토글 UI도 이미 제거했으므로, 과거 localStorage에 남은 "emba17_semantic=1"은 무시한다.
export function useSmartAsk(cards: Card[], myIndustries: Industry[]) {
  // salt > 0 이면 결과에 ±12% 지터 → 같은 질문도 매번 다른 '연결'(셔플). 0이면 결정론적.
  const runAsk = useCallback(
    async (q: string, salt = 0): Promise<RecommendResult> =>
      recommendCards(q.trim(), cards, myIndustries, salt),
    [cards, myIndustries]
  );

  // 시그니처 호환용 더미(semantic 토글 제거됨). dl은 다운로드 진행률 — 항상 null.
  return { semantic: false, toggle: () => {}, dl: null as number | null, runAsk };
}
