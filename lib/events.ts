// 클라이언트 이벤트 로깅 — 버퍼링 + 자동 flush.
// 익명 session_id + 사용자 산업만 부착. 개인 식별 X.

import { store } from "./storage";

const BUFFER_KEY = "emba17_event_buffer";
const SESSION_KEY = "emba17_session_id";
const FLUSH_INTERVAL_MS = 30_000;
const MAX_BUFFER_SIZE = 5;

export interface LoggedEvent {
  type: string;
  ts: string;
  session_id: string;
  industries: string[];
  [key: string]: unknown;
}

function genSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // 폴백
  return "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = window.localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = genSessionId();
    try {
      window.localStorage.setItem(SESSION_KEY, sid);
    } catch {
      /* ignore */
    }
  }
  return sid;
}

function getIndustries(): string[] {
  return (store.get<string[]>("emba17_my_industries") || []) as string[];
}

function readBuffer(): LoggedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(BUFFER_KEY);
    return raw ? (JSON.parse(raw) as LoggedEvent[]) : [];
  } catch {
    return [];
  }
}

function writeBuffer(buf: LoggedEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BUFFER_KEY, JSON.stringify(buf));
  } catch {
    /* ignore quota errors */
  }
}

async function flush(useBeacon = false): Promise<void> {
  if (typeof window === "undefined") return;
  const buf = readBuffer();
  if (buf.length === 0) return;
  // optimistic clear — 실패 시 복원
  writeBuffer([]);

  const payload = JSON.stringify({ events: buf });

  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/events", blob);
      return;
    } catch {
      /* fall through to fetch */
    }
  }

  try {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
    if (!res.ok) {
      const current = readBuffer();
      writeBuffer([...buf, ...current]);
    }
  } catch {
    const current = readBuffer();
    writeBuffer([...buf, ...current]);
  }
}

export function logEvent(type: string, payload: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const ev: LoggedEvent = {
    type,
    ts: new Date().toISOString(),
    session_id: getSessionId(),
    industries: getIndustries(),
    ...payload,
  };
  const buf = [...readBuffer(), ev];
  writeBuffer(buf);
  if (buf.length >= MAX_BUFFER_SIZE) {
    void flush();
  }
}

let inited = false;
export function initEventLogging(): void {
  if (typeof window === "undefined") return;
  if (inited) return;
  inited = true;

  // 30초 주기 flush
  window.setInterval(() => void flush(), FLUSH_INTERVAL_MS);

  // 탭 숨김/종료 시 beacon으로 flush
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush(true);
  });
  window.addEventListener("pagehide", () => void flush(true));
}
