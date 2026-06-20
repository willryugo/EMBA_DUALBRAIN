"use client";
import { useEffect } from "react";

// 루트 레이아웃 자체에서 난 에러까지 잡는 최상위 바운더리.
// global-error는 root layout을 '대체'하므로 반드시 자체 <html><body>를 렌더하고,
// globals.css에 의존하지 않도록 전부 인라인 스타일로 둔다.
async function hardReset() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("emba17_"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* 무시 */
  }
  try {
    if ("caches" in window) {
      const ks = await caches.keys();
      await Promise.all(ks.map((k) => caches.delete(k)));
    }
  } catch {
    /* 무시 */
  }
  try {
    if ("serviceWorker" in navigator) {
      const rs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(rs.map((r) => r.unregister()));
    }
  } catch {
    /* 무시 */
  }
  location.reload();
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("DualBrain global error:", error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily:
            "-apple-system,'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕',system-ui,sans-serif",
          background: "#EDF0F8",
          color: "#1a1a1a",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18 }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#4E5DB6", display: "inline-block" }} />
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#D55E92", display: "inline-block", marginLeft: -12 }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>
            화면을 불러오다 잠깐 멈췄어요
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#555", margin: "0 0 22px" }}>
            대부분 ‘다시 시도’로 해결됩니다. 그래도 안 되면 저장된 데이터를 비우고
            새로 열어보세요. (학습 내용은 서버에 있어 사라지지 않아요)
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "11px 20px",
                borderRadius: 999,
                border: "none",
                background: "#1a1a1a",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
            <button
              onClick={hardReset}
              style={{
                padding: "11px 20px",
                borderRadius: 999,
                border: "1px solid #c9cfe0",
                background: "transparent",
                color: "#444",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              데이터 비우고 새로고침
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
