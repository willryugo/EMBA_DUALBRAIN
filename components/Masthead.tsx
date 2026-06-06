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
      <div className="wrap masthead-inner">
        <div className="brand">
          <DBMark size={36} className="masthead-mark" />
          <div className="name">DualBrain</div>
        </div>
        <nav>
          <Link href="/" className={isHome && !graphOpen ? "on" : ""}>
            매거진
          </Link>
          <Link href="/library" className={isLibrary ? "on" : ""}>
            내 솔루션 ({savedCount})
          </Link>
          <a href="/mobile" className="nav-mobile" title="모바일 프리뷰">
            모바일 ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
