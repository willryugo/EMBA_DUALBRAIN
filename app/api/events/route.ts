// 이벤트 수신 → GitHub repo의 logs/events-YYYY-WW.jsonl에 append.
// GH_TOKEN 미설정 시 console.log만 (Vercel Logs로 확인 가능, 개발 단계 fallback).

export const runtime = "edge";

interface LoggedEvent {
  type: string;
  ts: string;
  session_id: string;
  industries: string[];
  [key: string]: unknown;
}

interface Body {
  events: LoggedEvent[];
}

// ── ISO 주차 계산
function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

// ── Base64 helpers (Edge runtime: Buffer 없음. btoa/atob + TextEncoder/Decoder 사용)
function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToUtf8(input: string): string {
  const binary = atob(input.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ── GitHub Contents API
async function ghGet(
  owner: string,
  repo: string,
  path: string,
  token: string,
  branch: string
): Promise<{ sha: string; content: string } | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path
  )}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "dualbrain-events",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GH GET ${path}: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { sha: string; content: string };
  return { sha: json.sha, content: json.content };
}

async function ghPut(
  owner: string,
  repo: string,
  path: string,
  token: string,
  branch: string,
  contentB64: string,
  sha: string | null,
  message: string
): Promise<Response> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path
  )}`;
  const body: Record<string, unknown> = {
    message,
    content: contentB64,
    branch,
  };
  if (sha) body.sha = sha;
  return fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "dualbrain-events",
    },
    body: JSON.stringify(body),
  });
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const events = Array.isArray(body?.events) ? body.events : [];
  if (events.length === 0) {
    return Response.json({ ok: true, written: 0 });
  }

  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;
  const branch = process.env.GH_BRANCH || "main";

  if (!token || !owner || !repo) {
    // 설정 전: console로 흐름만 확인 (Vercel Logs)
    console.log(
      `[events] (sink=console) ${events.length} events:`,
      events.map((e) => `${e.type}@${e.session_id?.slice(0, 6) || "?"}`).join(" · ")
    );
    return Response.json({ ok: true, written: events.length, sink: "console" });
  }

  const { year, week } = isoWeek(new Date());
  const path = `logs/events-${year}-W${String(week).padStart(2, "0")}.jsonl`;

  // 최대 3회 retry (SHA 충돌 시)
  let lastError = "unknown";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const current = await ghGet(owner, repo, path, token, branch);
      const sha = current?.sha ?? null;
      const existing = current ? base64ToUtf8(current.content) : "";

      const newLines = events.map((e) => JSON.stringify(e)).join("\n");
      const merged = existing ? existing.replace(/\n+$/, "") + "\n" + newLines + "\n" : newLines + "\n";

      const putRes = await ghPut(
        owner,
        repo,
        path,
        token,
        branch,
        utf8ToBase64(merged),
        sha,
        `logs: +${events.length} events (${events.map((e) => e.type).join(",")})`
      );

      if (putRes.ok) {
        return Response.json({ ok: true, written: events.length, path });
      }

      // 409/422 = SHA conflict (다른 요청이 먼저 commit). retry.
      if (putRes.status === 409 || putRes.status === 422) {
        lastError = `${putRes.status} sha conflict`;
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }

      const txt = await putRes.text();
      return Response.json(
        { ok: false, error: `GH PUT ${putRes.status}: ${txt}` },
        { status: 500 }
      );
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  return Response.json(
    { ok: false, error: `retry exhausted: ${lastError}` },
    { status: 500 }
  );
}
