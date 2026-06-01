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
        const data = await res.json().catch(() => ({}));
        // 역할 저장 — Tweaks(테마 변경) 노출 판단용. 쿠키는 httpOnly라 JS가 못 읽음.
        try {
          if (data?.role === "admin" || data?.role === "member") {
            localStorage.setItem("emba17_role", data.role);
          }
        } catch {
          /* localStorage 차단 환경 무시 */
        }
        router.replace(redirectTo);
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
