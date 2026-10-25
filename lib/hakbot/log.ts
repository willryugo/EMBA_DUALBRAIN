// 학술봇 질문 기록 — 두 곳에 남긴다.
//  ① 깃허브 비공개 저장소(HAKBOT_LOG_REPO)에 날짜별 JSONL 한 줄씩 (점검 작업이 읽는 원본)
//  ② 구글 폼 「학술봇 질문 기록」(HAKBOT_FORM_URL = …/formResponse) — 수달님이 폼·시트에서 바로 본다
// 학술국(메인 세션)이 매일 아침 이 파일을 읽어 「해결 안 됨」을 점검하고 수달님께 보고한다.
//
// 환경변수(수달님이 Vercel 에 직접 입력):
//   HAKBOT_GH_TOKEN  — 그 저장소 하나에만 Contents 쓰기 권한이 있는 fine-grained 토큰
//   HAKBOT_LOG_REPO  — 예: willryugo/emba17-hakbot-log
// 둘 중 하나라도 없으면 기록을 건너뛴다(답변은 정상 동작).
//
// 이름·연락처는 받지 않는다. 브라우저가 만든 익명 번호(anon)만 같이 적어 「한 사람이 여러 번 물었는지」만 본다.

export interface LogEntry {
  ts: string;          // ISO 시각(서울)
  anon: string;        // 브라우저 익명 번호
  q: string;
  resolved: boolean;
  course: string | null;
  answer: string;
  sources: unknown[];
  mode: "ai" | "local" | "error";
  ms: number;
  points?: { emoji: string; text: string; check?: boolean }[];
  unsure?: string | null;
}

// 구글 폼 문항 번호(폼 「학술봇 질문 기록」의 장문형 두 칸). 주소는 공개 저장소에 두지 않고 환경변수로.
const FORM_Q = "entry.92941697";
const FORM_A = "entry.1912347370";

function formText(e: LogEntry): string {
  const state = e.mode === "error" ? "오류" : e.mode === "local" ? "AI 꺼짐(보드 자료로 안내)" : e.resolved ? (e.unsure ? "해결 · 확인 필요 포함" : "해결") : "학술국 전달";
  const lines = [`[${state}]${e.course ? " " + e.course : ""}`];
  if (e.answer) lines.push(e.answer);
  for (const p of e.points ?? []) lines.push(`${p.emoji} ${p.text}${p.check ? " (확인 필요)" : ""}`);
  for (const raw of e.sources as { kind?: string; when?: string; where?: string; what?: string }[]) {
    lines.push(`근거 · ${[raw.kind, raw.when, raw.where].filter(Boolean).join(" · ")} — ${raw.what ?? ""}`);
  }
  if (e.unsure) lines.push(`확인 필요 · ${e.unsure}`);
  lines.push(`— 익명 ${e.anon} · ${e.ts.slice(5, 16).replace("T", " ")} · ${(e.ms / 1000).toFixed(1)}초`);
  return lines.join("\n");
}

async function appendForm(e: LogEntry): Promise<"ok" | "skip" | "fail"> {
  const url = process.env.HAKBOT_FORM_URL;
  if (!url) return "skip";
  try {
    const body = new URLSearchParams({ [FORM_Q]: e.q, [FORM_A]: formText(e) });
    const r = await fetch(url, { method: "POST", body, redirect: "manual", cache: "no-store" });
    if (r.status >= 200 && r.status < 400) return "ok";
    console.log("[hakbot] 폼 기록 실패:", r.status);
    return "fail";
  } catch (err) {
    console.log("[hakbot] 폼 기록 실패:", String(err));
    return "fail";
  }
}

function seoulDate(d = new Date()): string {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

export async function appendLog(e: LogEntry): Promise<"ok" | "skip" | "fail"> {
  const [gh, form] = await Promise.all([appendGithub(e), appendForm(e)]);
  return gh === "ok" || form === "ok" ? "ok" : gh === "skip" && form === "skip" ? "skip" : "fail";
}

async function appendGithub(e: LogEntry): Promise<"ok" | "skip" | "fail"> {
  const token = process.env.HAKBOT_GH_TOKEN;
  const repo = process.env.HAKBOT_LOG_REPO;
  if (!token || !repo) return "skip";
  const file = `logs/${seoulDate()}.jsonl`;
  const api = `https://api.github.com/repos/${repo}/contents/${file}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "emba17-hakbot",
  };
  // 같은 파일에 동시에 쓰면 sha 가 어긋나 409 — 한 번만 다시 읽고 재시도한다.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let sha: string | undefined;
      let prev = "";
      const cur = await fetch(api, { headers, cache: "no-store" });
      if (cur.ok) {
        const j = (await cur.json()) as { sha: string; content: string };
        sha = j.sha;
        prev = Buffer.from(j.content, "base64").toString("utf8");
      } else if (cur.status !== 404) {
        throw new Error(`get ${cur.status}`);
      }
      const next = prev + JSON.stringify(e) + "\n";
      const put = await fetch(api, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `log ${e.resolved ? "해결" : "해결 안 됨"} · ${e.q.slice(0, 40)}`,
          content: Buffer.from(next, "utf8").toString("base64"),
          ...(sha ? { sha } : {}),
        }),
      });
      if (put.ok) return "ok";
      if (put.status !== 409 && put.status !== 422) throw new Error(`put ${put.status}`);
    } catch (err) {
      console.log("[hakbot] 기록 실패:", String(err));
      return "fail";
    }
  }
  return "fail";
}
