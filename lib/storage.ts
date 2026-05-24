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
};
