// 학술봇 — EMBA 17기 학술운영보드(공개 GitHub Pages)에서 부르는 질문 답변 API.
//
// 흐름(RAG): 질문 → ① 2학기 과목별 한 장 전체 + ② 1학기 카드 중 가까운 몇 장 → Claude Sonnet 5.5 가
// 그 자료 안에서만 답하고 근거(언제 말씀·언제 바뀜·교재/강의안 쪽수·강조)를 표로 붙인다.
// 자료에 없으면 resolved=false → 보드는 「학술국장·부국장에게 전달했습니다」를 띄우고, 기록이 남는다.
//
// 키가 없으면(ANTHROPIC_API_KEY 미설정) { ok:false, reason:"no_key" } — 보드는 페이지 안 자료로 찾아 보여 준다.
// 비용·키는 수달님 몫: Vercel 환경변수에 ANTHROPIC_API_KEY. 콘솔에서 월 한도를 걸어 두길 권장.
//
// ⚠ 이 경로는 middleware 비밀번호 관문에서 빠져 있다(보드가 다른 도메인이라 쿠키가 없다).
//   그래서 ① 보드 주소에서 온 요청만 받고 ② 한 사람(IP) 1시간 20회로 막고 ③ 질문 길이·답 길이를 자른다.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { loadTerm2, retrieveTerm1 } from "@/lib/hakbot/kb";
import { appendLog } from "@/lib/hakbot/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 수달님 결정(2026-10-24): Sonnet 5.5. 단순 조회는 effort low 로 충분하다.
const MODEL = "claude-sonnet-5-5";

const ALLOWED = ["https://willryugo.github.io"];
function allowOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (ALLOWED.includes(origin)) return origin;
  if (process.env.HAKBOT_DEV === "1" && (origin === "null" || origin.startsWith("http://localhost"))) return origin;
  return null;
}
function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// 인스턴스 메모리 기준의 느슨한 제한(여러 인스턴스면 각자 센다) — 진짜 상한은 콘솔 월 한도.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 20;
}

const Source = z.object({
  kind: z.enum(["수업 중 말씀", "수정·변경", "교재", "강의안", "강조하심", "실라버스", "러너스 공지", "교수님 메일", "1학기 카드", "기타"]),
  when: z.string().describe("언제 — 예: 10/24 수업 중(10:03경), 10/16 → 10/23 변경. 모르면 빈 문자열"),
  where: z.string().describe("어디 — 예: 주교재 『경영사례와 개인과제』 25쪽, Module 3 강의안 64~96쪽. 모르면 빈 문자열"),
  what: z.string().describe("그 근거가 말하는 내용 한 줄"),
});
const Answer = z.object({
  resolved: z.boolean().describe("자료 안에서 답을 찾았으면 true. 자료에 없거나 추측해야 하면 false"),
  course: z.string().nullable().describe("관련 과목 한글명. 여러 과목이거나 없으면 null"),
  answer: z.string().describe("원우에게 보여 줄 답 2~5문장. ~합니다 체"),
  table: z
    .object({ headers: z.array(z.string()), rows: z.array(z.array(z.string())) })
    .nullable()
    .describe("일정·범위·배점처럼 표가 나은 경우만. 아니면 null"),
  sources: z.array(Source).describe("답의 근거. resolved=true 이면 1개 이상"),
  unsure: z.string().nullable().describe("기록끼리 어긋나거나 확인 중인 부분. 없으면 null"),
});
type AnswerT = z.infer<typeof Answer>;

const RULES = `너는 「학술봇」이다. 연세대 EMBA 17기 학술국이 운영하는 학술운영보드의 질문 답변 도우미다.
원우가 수업·시험·과제·일정·교수님 말씀을 물으면, 아래 <자료> 안에 있는 내용만으로 답한다.

지킬 것:
- 자료에 없는 사실은 절대 만들지 않는다. 추측해야 하면 resolved=false 로 두고 answer 에 「자료에서 찾지 못했다」고만 쓴다.
- 근거(sources)는 자료의 src·근거 표기를 그대로 옮긴다. kind 는 성격대로 고른다: 교수님이 수업에서 하신 말씀 → 「수업 중 말씀」, 날짜·범위가 바뀐 경우 → 「수정·변경」(when 에 「언제 → 언제」), 교재 쪽수 → 「교재」, 강의안 쪽수 → 「강의안」, 교수님이 여러 번·특별히 강조하신 것 → 「강조하심」.
- 자료의 「확인 중(unsure)」에 걸린 내용이면 단정하지 말고 unsure 에 무엇이 어긋나는지 적는다(이 경우도 답할 수 있으면 resolved=true).
- 「녹음」「녹취」「전사」라는 말은 쓰지 않는다. 시각은 「10/24 수업 중(10:03경)」처럼 쓴다.
- 원우 실명은 쓰지 않는다(교수님·조교 이름은 된다). 조는 「7조」처럼 번호로.
- 공지·러너스가 바뀌면 그쪽이 우선이라는 점은 따로 말하지 않아도 된다(보드에 이미 적혀 있다).
- 1학기 내용은 [1학기 이론카드]·[1학기 조별 케이스] 자료에서만 답하고, kind 는 「1학기 카드」.
- 담백한 ~합니다 체. 인사·사족 없이 바로 답.`;

function seoulIso(d = new Date()) {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().replace("Z", "+09:00");
}

export async function OPTIONS(req: Request) {
  const o = allowOrigin(req.headers.get("origin"));
  if (!o) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: cors(o) });
}

export async function POST(req: Request) {
  const t0 = Date.now();
  const o = allowOrigin(req.headers.get("origin"));
  if (!o) return Response.json({ ok: false, reason: "origin" }, { status: 403 });
  const H = cors(o);

  let body: { q?: string; anon?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, reason: "bad_json" }, { status: 400, headers: H });
  }
  const q = String(body.q || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const anon = String(body.anon || "").replace(/[^a-z0-9]/gi, "").slice(0, 16) || "anon";
  if (q.length < 2) return Response.json({ ok: false, reason: "empty" }, { headers: H });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0";
  if (limited(ip)) return Response.json({ ok: false, reason: "rate" }, { status: 429, headers: H });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // 키가 없어도 질문은 학술국에 남긴다 — 보드가 페이지 안 자료로 찾아 보여 주지만 해결 여부는 사람이 본다.
    await appendLog({ ts: seoulIso(), anon, q, resolved: false, course: null, answer: "", sources: [], mode: "local", ms: Date.now() - t0 });
    return Response.json({ ok: false, reason: "no_key" }, { headers: H });
  }

  const term2 = await loadTerm2();
  const term1 = retrieveTerm1(q);
  const kbText =
    `<자료 기준="${term2?.updated ?? "?"}">\n` +
    `<2학기_과목별_한장>\n${JSON.stringify(term2?.courses ?? [])}\n</2학기_과목별_한장>\n` +
    (term2?.faq?.length ? `<FAQ>\n${JSON.stringify(term2.faq)}\n</FAQ>\n` : "") +
    `</자료>`;

  const client = new Anthropic({ apiKey: key });
  let out: AnswerT | null = null;
  let mode: "ai" | "error" = "ai";
  try {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      // 규칙 + 2학기 자료는 모든 질문에 똑같이 들어가므로 캐시한다(두 번째 질문부터 입력비 약 1/10).
      system: [
        { type: "text", text: RULES },
        { type: "text", text: kbText, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: (term1 ? `<1학기_관련_카드>\n${term1}\n</1학기_관련_카드>\n\n` : "") + `질문: ${q}`,
        },
      ],
      output_config: { effort: "low", format: zodOutputFormat(Answer) },
    });
    if (res.stop_reason === "refusal") {
      out = { resolved: false, course: null, answer: "이 질문은 학술봇이 답하지 않습니다.", table: null, sources: [], unsure: null };
    } else {
      out = res.parsed_output ?? null;
    }
    console.log(`[hakbot] usage in=${res.usage.input_tokens} cache_read=${res.usage.cache_read_input_tokens ?? 0} out=${res.usage.output_tokens}`);
  } catch (err) {
    mode = "error";
    if (err instanceof Anthropic.RateLimitError) console.log("[hakbot] rate limited");
    else if (err instanceof Anthropic.APIError) console.log(`[hakbot] api ${err.status}: ${err.message.slice(0, 200)}`);
    else console.log("[hakbot] 오류:", String(err).slice(0, 200));
  }

  if (!out) {
    await appendLog({ ts: seoulIso(), anon, q, resolved: false, course: null, answer: "", sources: [], mode: "error", ms: Date.now() - t0 });
    return Response.json({ ok: false, reason: "ai_error" }, { headers: H });
  }
  // 근거 없는 「해결」은 해결로 치지 않는다.
  if (out.resolved && out.sources.length === 0) out.resolved = false;

  const logged = await appendLog({
    ts: seoulIso(), anon, q, resolved: out.resolved, course: out.course, answer: out.answer,
    sources: out.sources, mode, ms: Date.now() - t0,
  });
  return Response.json({ ok: true, ...out, logged, kbUpdated: term2?.updated ?? null }, { headers: H });
}
