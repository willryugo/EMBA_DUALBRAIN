"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DBMark } from "./DBMark";

interface Props {
  // home에서만 그래프 토글 표시
  onGraphToggle?: () => void;
  graphOpen?: boolean;
  savedCount: number;
  todayLabel: string;
}

export function Masthead({
  onGraphToggle,
  graphOpen,
  savedCount,
  todayLabel,
}: Props) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isLibrary = pathname === "/library";
  return (
    <header className="masthead">
      <style>{`
        .masthead nav button.db-enter{
          background: linear-gradient(120deg, var(--brain-l,#8C96BF), var(--accent,#d1809e));
          color:#fff; border:none; border-radius:999px;
          padding:10px 22px; font-size:14.5px; font-weight:800; letter-spacing:.005em;
          cursor:pointer; animation: dbEnterPulse 2.6s ease-in-out infinite;
          display:inline-flex; align-items:center; gap:7px; line-height:1;
        }
        .masthead nav button.db-enter .dbe-inf{ font-size:17px; line-height:1; transform:translateY(-.5px); }
        .masthead nav button.db-enter:hover{ filter:brightness(1.08); transform:translateY(-1px); }
        .masthead nav button.db-enter.on{ animation:none; filter:brightness(.96); }
        @keyframes dbEnterPulse{
          0%,100%{ box-shadow:0 2px 12px color-mix(in srgb,var(--accent,#d1809e) 34%,transparent); transform:scale(1); }
          50%{ box-shadow:0 4px 26px color-mix(in srgb,var(--accent,#d1809e) 80%,transparent); transform:scale(1.035); }
        }
        @media (max-width:720px){ .masthead nav button.db-enter{ padding:8px 15px; font-size:13px } }
        @media (prefers-reduced-motion: reduce){ .masthead nav button.db-enter{ animation:none } }
      `}</style>
      <div className="wrap masthead-inner">
        <div className="brand">
          <DBMark size={36} className="masthead-mark" />
          <div className="name">
            DualBrain <span>· 듀얼브레인</span>
          </div>
        </div>
        <nav>
          <Link href="/" className={isHome && !graphOpen ? "on" : ""}>
            매거진
          </Link>
          {isHome && onGraphToggle && (
            <button
              className={"db-enter" + (graphOpen ? " on" : "")}
              onClick={onGraphToggle}
              title="온톨로지 브레인맵 — 두 번째 뇌에 접속"
            >
              <span className="dbe-inf" aria-hidden="true">∞</span> 듀얼브레인 접속
            </button>
          )}
          <Link href="/library" className={isLibrary ? "on" : ""}>
            내 솔루션 ({savedCount})
          </Link>
          <a href="/mobile" className="nav-mobile" title="모바일 프리뷰">
            모바일 ↗
          </a>
        </nav>
        <div className="mast-meta">
          <span>YONSEI EMBA 17</span>
          <span>{todayLabel}</span>
          <span>VOL.01</span>
        </div>
      </div>
    </header>
  );
}
