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
