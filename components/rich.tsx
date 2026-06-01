import React from "react";

// 카드 제목/헤드라인용 경량 마크업.
//  *단어*  → 하이라이트(<mark class="hl">)
//  줄바꿈(\n) → 줄나눔(<br/>)
// 데이터에 마크업이 없으면 원문 그대로 렌더(안전).
function parseMarks(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*([^*\n]+)\*/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    out.push(
      <mark key={k++} className="hl">
        {m[1]}
      </mark>
    );
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function rich(text?: string | null): React.ReactNode {
  if (!text) return text ?? null;
  const lines = text.split("\n");
  return lines.map((line, li) => (
    <React.Fragment key={li}>
      {li > 0 && <br />}
      {parseMarks(line)}
    </React.Fragment>
  ));
}

// 본문 블록 렌더러 — 단락/불릿/핵심강조를 구조화해서 시각적으로 끊어 보여준다.
//  빈 줄 또는 일반 줄 → 단락 <p class="rb-p">
//  "- " / "• " 로 시작 → 불릿 리스트 <ul class="rb-list">  (실전 적용 플레이북 등)
//  "> " 로 시작        → 핵심 강조 박스 <div class="rb-key"> (카드색 좌측 바 + 배경)
//  인라인 *단어* → 하이라이트. 마크업 없으면 그냥 한 단락으로 안전 렌더.
export function RichBlocks({ text }: { text?: string | null }): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n").map((l) => l.trim());
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  const isBullet = (l: string) => l.startsWith("- ") || l.startsWith("• ");
  while (i < lines.length) {
    const line = lines[i];
    if (line === "") {
      i++;
      continue;
    }
    if (isBullet(line)) {
      const items: string[] = [];
      while (i < lines.length && isBullet(lines[i])) {
        items.push(lines[i].replace(/^[-•]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={k++} className="rb-list">
          {items.map((it, j) => (
            <li key={j}>{parseMarks(it)}</li>
          ))}
        </ul>
      );
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push(
        <div key={k++} className="rb-key">
          {parseMarks(line.slice(2))}
        </div>
      );
      i++;
      continue;
    }
    blocks.push(
      <p key={k++} className="rb-p">
        {parseMarks(line)}
      </p>
    );
    i++;
  }
  return <>{blocks}</>;
}
