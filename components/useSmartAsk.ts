"use client";
import { useCallback, useEffect, useState } from "react";
import type { Card, Industry } from "@/lib/types";
import { recommendCards, type RecommendResult } from "@/lib/recommend";
import { store } from "@/lib/storage";

// 기본: 키워드+의미이웃(즉시, 다운로드 0). 토글 ON: 브라우저 임베딩(최초 1회 ~118MB, 캐시).
// transformers/임베딩은 토글 ON으로 실제 검색할 때만 동적 import → 평소 번들 0.
export function useSmartAsk(cards: Card[], myIndustries: Industry[]) {
  const [semantic, setSemantic] = useState(false);
  const [dl, setDl] = useState<number | null>(null); // 모델 다운로드 진행률(%) — 최초 1회만

  useEffect(() => {
    setSemantic(store.get<string>("emba17_semantic") === "1");
  }, []);

  const toggle = useCallback(() => {
    setSemantic((v) => {
      const nv = !v;
      store.set("emba17_semantic", nv ? "1" : "0");
      return nv;
    });
  }, []);

  const runAsk = useCallback(
    async (q: string): Promise<RecommendResult> => {
      const query = q.trim();
      if (semantic) {
        try {
          const mod = await import("@/lib/semanticSearch");
          if (!mod.isModelCached()) setDl(0);
          const r = await mod.semanticRecommend(query, cards, myIndustries, (p) => {
            if (typeof p.progress === "number") setDl(Math.round(p.progress));
          });
          setDl(null);
          return r;
        } catch {
          setDl(null); // 실패 시 키워드로 폴백
        }
      }
      return recommendCards(query, cards, myIndustries);
    },
    [semantic, cards, myIndustries]
  );

  return { semantic, toggle, dl, runAsk };
}
