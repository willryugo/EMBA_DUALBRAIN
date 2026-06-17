"use client";
import type { Card, Domain, Industry } from "./types";
import type { Diagnosis } from "./recommend";

// /api/ask 호출 — 생성형 '두 번째 뇌의 진단'을 받아온다.
// 키 미설정·오류·타임아웃이면 null → 호출부는 오프라인 합성 진단(buildDiagnosis)을 유지.
// 비용·키는 수달님 몫(Vercel ANTHROPIC_API_KEY). 없으면 앱은 종전과 동일하게 동작.
export async function fetchAiDiagnosis(
  problem: string,
  cards: Card[],
  domain?: Domain,
  industries?: Industry[]
): Promise<Diagnosis | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        problem,
        domain,
        industries,
        cards: cards.slice(0, 5).map((c) => ({
          id: c.id,
          concept: c.concept,
          hook: c.hook,
          course: c.course,
          decision: c.decision,
          insight: c.insight,
        })),
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      diagnosis?: { lens?: string; body?: string };
    };
    if (!data.ok || !data.diagnosis?.lens || !data.diagnosis?.body) return null;
    return { lens: data.diagnosis.lens, body: data.diagnosis.body };
  } catch {
    return null; // 네트워크·중단·파싱 실패 → 조용히 폴백
  }
}
