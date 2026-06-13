"use client";
import { useEffect, useState } from "react";
import { DBMark } from "./DBMark";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "emba17_install_dismissed";

// "홈 화면에 추가" 유도 배너.
// - 안드로이드/데스크톱 크롬: beforeinstallprompt → 원클릭 설치 버튼
// - iOS 사파리: 이벤트 미지원 → 공유→홈화면 추가 안내
// - 이미 앱 모드(standalone)거나 사용자가 닫았으면 표시 안 함
export function InstallPrompt() {
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {}

    const ua = navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    if (isIOS) {
      setIos(true);
      // iOS는 잠깐 뒤에 띄워 첫 진입 부담을 줄임
      const t = setTimeout(() => setShow(true), 2600);
      return () => clearTimeout(t);
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", () => dismiss());
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const install = async () => {
    if (!bip) return;
    try {
      await bip.prompt();
      await bip.userChoice;
    } catch {}
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="ipwrap" role="dialog" aria-label="홈 화면에 추가">
      <div className="ipcard">
        <div className="ipmark">
          <DBMark size={34} />
        </div>
        <div className="iptext">
          <b>회의 30분 전, 홈 화면에서 바로.</b>
          {ios ? (
            <span>
              사파리 하단 <span className="ipkbd">공유 ⬆︎</span> →{" "}
              <span className="ipkbd">홈 화면에 추가</span> 를 누르면 앱처럼 열려요.
            </span>
          ) : (
            <span>홈 화면에 설치하면 두 번째 뇌를 한 번에 꺼낼 수 있어요.</span>
          )}
        </div>
        <div className="ipbtns">
          {!ios && (
            <button className="ipgo" onClick={install}>
              설치
            </button>
          )}
          <button className="ipx" onClick={dismiss} aria-label="닫기">
            ✕
          </button>
        </div>
      </div>
      <style>{`
        .ipwrap{position:fixed;left:0;right:0;bottom:0;z-index:9000;display:flex;justify-content:center;
          padding:0 12px calc(12px + env(safe-area-inset-bottom,0px));pointer-events:none;
          animation:ipUp .42s cubic-bezier(.16,1,.3,1) both}
        @keyframes ipUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        .ipcard{pointer-events:auto;display:flex;align-items:center;gap:13px;width:min(560px,100%);
          background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
          border:1px solid rgba(20,19,32,.10);border-radius:16px;padding:12px 14px;
          box-shadow:0 14px 40px -10px rgba(20,19,32,.34),0 2px 8px rgba(20,19,32,.10)}
        .ipmark{flex:none;display:flex;align-items:center;justify-content:center;width:46px;height:46px;
          background:radial-gradient(120% 120% at 50% 18%,#fff,#eef1f8);border-radius:13px;
          border:1px solid rgba(20,19,32,.07)}
        .iptext{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;line-height:1.4}
        .iptext b{font-size:13.5px;color:#15131A;letter-spacing:-.01em}
        .iptext span{font-size:12px;color:#5a5866}
        .ipkbd{display:inline-block;background:#15131A;color:#fff;border-radius:5px;padding:1px 6px;font-size:11px;white-space:nowrap}
        .ipbtns{flex:none;display:flex;align-items:center;gap:6px}
        .ipgo{border:none;background:#15131A;color:#fff;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer}
        .ipgo:active{transform:scale(.96)}
        .ipx{border:none;background:rgba(20,19,32,.06);color:#5a5866;border-radius:9px;width:32px;height:32px;font-size:13px;cursor:pointer}
      `}</style>
    </div>
  );
}
