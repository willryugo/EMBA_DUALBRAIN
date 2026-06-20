// SSR-안전 localStorage 래퍼. 키 prefix `emba17_` 유지 — 추후 데이터 마이그레이션 호환성.
const mem: Record<string, unknown> = {};

export const store = {
  get<T = unknown>(key: string): T | null {
    if (typeof window === "undefined") return (mem[key] as T) ?? null;
    try {
      const v = window.localStorage.getItem(key);
      return v == null ? null : (JSON.parse(v) as T);
    } catch {
      return (mem[key] as T) ?? null;
    }
  },
  set(key: string, value: unknown): void {
    if (typeof window === "undefined") {
      mem[key] = value;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      mem[key] = value;
    }
  },
  remove(key: string): void {
    if (typeof window === "undefined") {
      delete mem[key];
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      delete mem[key];
    }
  },
  // 배열을 기대하는 키는 항상 배열로 — 깨진 값이면 빈 배열. 렌더 중 .includes/.map throw 방지.
  getArray<T = unknown>(key: string): T[] {
    const v = this.get<unknown>(key);
    return Array.isArray(v) ? (v as T[]) : [];
  },
  // 부팅 시 1회: 옛 90일 쿠키 시절 잔재 등 '타입이 깨진' emba17_* 키를 제거.
  // store.get은 JSON.parse 오류만 잡고 '문자열인데 배열 기대' 같은 형 불일치는 통과시켜
  // 소비처(.includes/.map)에서 렌더 중 throw → 흰 화면을 유발하므로, 알려진 키를 선제 정화한다.
  heal(): void {
    if (typeof window === "undefined") return;
    const SHAPES: Record<string, "array" | "string" | "boolean"> = {
      emba17_filter_course: "array",
      emba17_filter_domain: "array",
      emba17_filter_industry: "array",
      emba17_filter_search: "string",
      emba17_filter_myOnly: "boolean",
      emba17_saved: "array",
      emba17_my_industries: "array",
      emba17_biz_mode: "string",
    };
    for (const [key, shape] of Object.entries(SHAPES)) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw == null) continue;
        const v = JSON.parse(raw);
        const ok = shape === "array" ? Array.isArray(v) : typeof v === shape;
        if (!ok) window.localStorage.removeItem(key);
      } catch {
        try {
          window.localStorage.removeItem(key);
        } catch {
          /* 무시 */
        }
      }
    }
  },
};
