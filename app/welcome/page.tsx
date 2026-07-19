"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DBMark } from "@/components/DBMark";

function WelcomeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // 과거 역할 기반 분기 잔재 제거(전원 동일 UI).
        try {
          localStorage.removeItem("emba17_role");
          localStorage.removeItem("emba17_admin");
        } catch {
          /* localStorage 차단 환경 무시 */
        }
        // /magazine 은 Next 라우트가 아니라 public/magazine.html 로 가는 rewrite다.
        // router.replace 로 가면 Next 가 RSC 페이로드를 찾다가 실패해 흰 화면이 된다 → 전체 이동으로.
        if (/^\/magazine(\.html)?(\?|#|$)/.test(redirectTo)) {
          window.location.replace(redirectTo);
        } else {
          router.replace(redirectTo);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "비밀번호가 맞지 않습니다.");
      }
    } catch {
      setError("연결 오류. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome-shell">
      <div className="welcome-card">
        <div className="welcome-mark">
          <DBMark size={84} />
        </div>
        <div className="welcome-vol">
          <b>VOL.01</b>
          <span className="dot"></span>
          <span>YONSEI EMBA 17기 학술국</span>
        </div>
        <h1 className="welcome-title">
          환영합니다.
          <br />
          <span className="ital">당신의 두 번째 뇌로.</span>
        </h1>
        <p className="welcome-deck">
          학술국이 공유한 단어를 입력하면 들어갑니다.
          <br />한 번 들어가면 같은 브라우저에서 90일간 유지됩니다.
        </p>
        <form onSubmit={onSubmit} className="welcome-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="공유받은 단어"
            autoFocus
            autoComplete="current-password"
          />
          <button type="submit" disabled={loading || !password.trim()}>
            {loading ? "확인 중…" : "들어가기 →"}
          </button>
        </form>
        {error && <div className="welcome-error">{error}</div>}
        <div className="welcome-footer">
          외부 공유 금지 · EMBA 17기 학술국 내부 자산
        </div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="welcome-shell" />}>
      <WelcomeForm />
    </Suspense>
  );
}
