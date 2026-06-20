"use client";
import { useEffect } from "react";

// 페이지 서브트리 에러 바운더리.
// 클라이언트 렌더/하이드레이션 중 예외가 나도 '빈 흰 화면' 대신 복구 화면을 보여준다.
// (DualBrain은 #app 안을 전부 클라이언트 렌더하므로, 바운더리가 없으면 예외 한 번에 영구 흰 화면)
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

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 사용자 머신에서만 재현되는 예외를 콘솔에 남겨 원인 추적.
    console.error("DualBrain error boundary:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily:
          "'Pretendard Variable',Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕',system-ui,sans-serif",
        background: "#EDF0F8",
        color: "#1a1a1a",
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18 }}>
          <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#4E5DB6" }} />
          <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#D55E92", marginLeft: -12 }} />
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
    </div>
  );
}
