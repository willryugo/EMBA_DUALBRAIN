import visualsJson from "@/data/card-visuals.json";

// 카드 비주얼 사이드카. 이미지는 오프라인(Higgsfield) 생성 → public/cards/에 정적 저장.
// 런타임 API 0. 이미지 없으면 tone 그라데이션 플레이스홀더로 우아하게 폴백.

export interface CardVisual {
  hero: string; // public/cards/<id>.webp
  tone: [string, string]; // 플레이스홀더 그라데이션 [from, to]
  motif: string; // 생성 은유 메모
  hasText?: boolean; // 이미지에 제목이 이미 박혀있으면 true → 커버에서 텍스트 오버레이 생략
}

const VISUALS = visualsJson as Record<string, unknown>;

export function getVisual(cardId: string): CardVisual | null {
  if (cardId === "_meta") return null;
  const v = VISUALS[cardId];
  if (!v || typeof v !== "object") return null;
  const cv = v as Partial<CardVisual>;
  if (!cv.tone || !cv.hero) return null;
  return cv as CardVisual;
}

export function hasVisual(cardId: string): boolean {
  return getVisual(cardId) !== null;
}

/** CSS linear-gradient 문자열 (플레이스홀더 배경) */
export function toneGradient(v: CardVisual, angle = "145deg"): string {
  return `linear-gradient(${angle}, ${v.tone[0]}, ${v.tone[1]})`;
}
