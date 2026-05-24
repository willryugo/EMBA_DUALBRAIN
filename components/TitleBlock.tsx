import { DBMark } from "./DBMark";

interface Props {
  todayLabel: string;
  totalCards: number;
}

export function TitleBlock({ todayLabel, totalCards }: Props) {
  return (
    <section className="title-block wrap">
      <div className="vol">
        <b>VOLUME 01</b>
        <span className="dot"></span>
        <span>YONSEI EMBA 17기 학술국</span>
        <span className="dot"></span>
        <span>{todayLabel} ISSUE</span>
      </div>
      <div className="title-row">
        <div className="title-stage">
          <div className="title-bgmark" aria-hidden="true">
            <DBMark size={420} />
          </div>
          <h1>
            <span className="t-emba">EMBA</span>{" "}
            <span className="t-dual">
              듀얼브레인<span className="period">.</span>
            </span>
          </h1>
          <div className="title-sub">EMBA 17기의 두 번째 뇌</div>
        </div>
        <div className="title-by-block">
          <span className="tby-i">by</span>
          <span className="tby-b">17기 학술국</span>
          <span className="tby-en">YONSEI EMBA 17 · ACADEMIC OFFICE</span>
        </div>
      </div>
      <div className="byline">
        <span className="byline-en">DUAL · BRAIN</span>
        <span className="byline-sep"></span>
        <span className="byline-by">VOL.01 · 52명의 두 번째 뇌</span>
      </div>
      <p className="deck">
        <b>회의 30분 전, 다시 꺼내 쓴다.</b>
        <span className="deck-em-wrap">
          <br />
          휘발될 한 학기가 한 줄의 결정으로 남는 단 한 권 — 분석과 직관,{" "}
          <span className="deck-em">두 개의 뇌</span>가 만나는 곳.
        </span>
      </p>
      <div className="stats">
        <div className="s">
          <b>{totalCards}</b>
          <span>인사이트 카드</span>
        </div>
        <div className="s">
          <b>7</b>
          <span>과목 · ONTOLOGY</span>
        </div>
        <div className="s">
          <b>5</b>
          <span>스텝 솔루션 카드</span>
        </div>
        <div className="s">
          <b>52</b>
          <span>원우 · 작성자</span>
        </div>
      </div>
    </section>
  );
}
