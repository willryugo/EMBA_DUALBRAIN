"use client";
import { useEffect, useState } from "react";
import { ASK_EXAMPLES } from "@/lib/askExamples";

// 인덱스 배열을 시드로 셔플(Fisher–Yates) — 매 방문 다른 순서.
function shuffled(n: number, seed: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  let s = seed >>> 0 || 1;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 검색창 음영 예시를 매 방문 새 순서로 돌린다. paused=true(입력 중)면 멈춤.
// SSR/첫 렌더는 항상 ASK_EXAMPLES[0] → 하이드레이션 안전, 마운트 후 섞인 순서로 전환.
export function useRotatingExample(paused: boolean, intervalMs = 3500): string {
  const [order, setOrder] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t =
      typeof performance !== "undefined" ? Math.floor(performance.now() * 1000) : 1;
    const seed = (t ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    setOrder(shuffled(ASK_EXAMPLES.length, seed));
    setIdx(0);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIdx((i) => i + 1), intervalMs);
    return () => clearInterval(timer);
  }, [paused, intervalMs]);

  if (!ASK_EXAMPLES.length) return "";
  if (!order.length) return ASK_EXAMPLES[0];
  return ASK_EXAMPLES[order[idx % order.length]];
}
