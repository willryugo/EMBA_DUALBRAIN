"use client";
import { DBMark } from "./DBMark";
import members from "@/data/members.json";

const COHORT_SIZE = members.length;

interface Props {
  todayLabel: string;
  totalCards: number;
  onEnter?: () => void;
}

export function TitleBlock({ todayLabel, totalCards, onEnter }: Props) {
  void todayLabel; void totalCards;
  return (
    <section className="title-block wrap">
      <div className="vol">
        <b>VOLUME 01</b>
      </div>
      <div className="title-row">
        <div className="title-stage">
          <div className="title-bgmark" aria-hidden="true">
            <DBMark size={420} animated />
          </div>
          <h1>
            <span className="t-emba">EMBA</span>{" "}
            <span className="t-dual">
              듀얼브레인<span className="period">.</span>
            </span>
          </h1>
        </div>
        <div className="title-by-block">
          <div className="tby-info">
            <span className="tby-i">by</span>
            <span className="tby-b">17기 학술국</span>
            <span className="tby-en">YONSEI EMBA 17 · ACADEMIC OFFICE</span>
          </div>
          {onEnter && (
            <button className="tby-enter" onClick={onEnter} type="button">
              <span className="tbe-inf" aria-hidden="true">∞</span>
              <span className="tbe-txt">
                <span className="tbe-emoji" aria-hidden="true">🧠</span> 생각 지도
              </span>
              <span className="tbe-sub">126장이 연결된 지도 →</span>
            </button>
          )}
        </div>
      </div>
      <div className="byline">
        <span className="byline-by">52명의 두 번째 뇌</span>
      </div>
    </section>
  );
}
