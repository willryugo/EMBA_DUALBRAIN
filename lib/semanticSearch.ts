// 브라우저 내 임베딩 시맨틱 검색 (옵트인 · 런타임 API 0원).
// 모델/임베딩 비교는 빌드타임 사전계산(scripts/embed-cards.mjs)과 '동일 모델'.
// 이 모듈은 컴포넌트에서 동적 import 되어, 토글 ON 전까지 번들/다운로드가 0이다.
import type { Card, Industry, Domain } from "./types";
import { UNIVERSAL } from "./manifest";
import embJson from "@/data/embeddings.json";
import { diversifyByCourse, type RecommendResult } from "./recommend";

interface EmbFile {
  _meta: { model: string; dim: number; count: number; prefix: string };
  vectors: Record<string, number[]>;
}
const EMB = embJson as EmbFile;

export interface ModelProgress {
  status: string; // "downloading" | "ready" | ...
  file?: string;
  progress?: number; // 0..100
  loaded?: number;
  total?: number;
}

// transformers 파이프라인 싱글턴 — 최초 1회만 모델(~118MB) 다운로드, 이후 브라우저 캐시.
let pipePromise: Promise<unknown> | null = null;

export function isModelCached(): boolean {
  // 다운로드를 시작한 적이 있으면(=이번 세션에 로드됨) 즉시 true.
  return pipePromise !== null;
}

export async function ensureModel(
  onProgress?: (p: ModelProgress) => void
): Promise<(text: string, opts: unknown) => Promise<{ data: Float32Array | number[] }>> {
  if (!pipePromise) {
    pipePromise = (async () => {
      const tf = await import("@xenova/transformers");
      tf.env.allowLocalModels = false;
      return await tf.pipeline("feature-extraction", EMB._meta.model, {
        quantized: true,
        progress_callback: (p: ModelProgress) => onProgress?.(p),
      });
    })();
  }
  return pipePromise as Promise<
    (text: string, opts: unknown) => Promise<{ data: Float32Array | number[] }>
  >;
}

function cosineRank(qVec: number[]): { id: string; s: number }[] {
  // 사전계산 벡터와 질문 벡터 모두 L2 정규화됨 → 내적 = 코사인.
  const out: { id: string; s: number }[] = [];
  for (const id in EMB.vectors) {
    const v = EMB.vectors[id];
    let dot = 0;
    const n = Math.min(qVec.length, v.length);
    for (let i = 0; i < n; i++) dot += qVec[i] * v[i];
    out.push({ id, s: dot });
  }
  return out;
}

export async function semanticRecommend(
  query: string,
  cards: Card[],
  myIndustries: Industry[] = [],
  onProgress?: (p: ModelProgress) => void
): Promise<RecommendResult> {
  const extractor = await ensureModel(onProgress);
  const out = await extractor("query: " + query, { pooling: "mean", normalize: true });
  const q = Array.from(out.data as ArrayLike<number>);

  const byId = new Map(cards.map((c) => [c.id, c]));
  const ranked = cosineRank(q)
    .filter((r) => byId.has(r.id))
    .map((r) => {
      const c = byId.get(r.id)!;
      const cos = r.s; // 0..1 코사인(근거 표시용 원점수)
      let s = cos;
      // 내 산업 가중(시맨틱 점수 스케일에 맞춰 소폭).
      if (myIndustries.length > 0) {
        const overlap = (c.industry || []).filter(
          (i) => i !== UNIVERSAL && myIndustries.includes(i)
        ).length;
        s += overlap * 0.05;
        if ((c.industry || []).includes(UNIVERSAL)) s += 0.012;
      }
      return { id: r.id, s, cos, domain: c.domain };
    })
    .sort((a, b) => b.s - a.s);

  // 결과 다양성 — 상위 3장 과목 쏠림 방지(과목당 최대 2).
  const courseOf = (id: string) => byId.get(id)?.course as string | undefined;
  const top = diversifyByCourse(ranked, courseOf, 3, 2);
  const usedTop = new Set(top.map((x) => x.id));
  const related = ranked.filter((x) => !usedTop.has(x.id)).slice(0, 5);
  const inferredDomain: Domain | undefined = top[0]?.domain?.[0];

  // 카드별 근거 — 의미 유사도 %.
  const evidence: Record<string, string> = {};
  for (const t of top) {
    const overlapInd =
      myIndustries.length > 0 &&
      (byId.get(t.id)?.industry || []).some(
        (i) => i !== UNIVERSAL && myIndustries.includes(i)
      );
    evidence[t.id] =
      `의미 유사도 ${Math.round(Math.max(0, Math.min(1, t.cos)) * 100)}%` +
      (overlapInd ? " · 내 산업 적합" : "");
  }

  return {
    ids: top.map((x) => x.id),
    reason:
      "질문의 의미를 임베딩(AI 정밀검색)으로 이해해, 표현이 달라도 가장 가까운 3장을 골랐어요.",
    expansions: [],
    relatedIds: related.map((x) => x.id),
    inferredDomain,
    evidence,
  };
}
