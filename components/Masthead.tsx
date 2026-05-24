"use client";
import { DBMark } from "./DBMark";

interface Props {
  view: "home" | "graph";
  onView: (v: "home" | "graph") => void;
  onSavedClick: () => void;
  savedCount: number;
  todayLabel: string;
}

export function Masthead({
  view,
  onView,
  onSavedClick,
  savedCount,
  todayLabel,
}: Props) {
  return (
    <header className="masthead">
      <div className="wrap masthead-inner">
        <div className="brand">
          <DBMark size={36} className="masthead-mark" />
          <div className="name">
            DualBrain <span>· 듀얼브레인</span>
          </div>
        </div>
        <nav>
          <button
            className={view === "home" ? "on" : ""}
            onClick={() => onView("home")}
          >
            매거진
          </button>
          <button
            className={view === "graph" ? "on" : ""}
            onClick={() => onView("graph")}
          >
            온톨로지
          </button>
          <button onClick={onSavedClick}>내 솔루션 ({savedCount})</button>
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
