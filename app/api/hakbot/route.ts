// 학술봇 — EMBA 17기 학술운영보드(공개 GitHub Pages)에서 부르는 질문 답변 API.
//
// 흐름(RAG): 질문 → ① 2학기 과목별 한 장 전체(정리본) + ② 지식 꾸러미 검색(lib/hakbot/rag.ts —
// 강의안·수업 기록 쪽 단위 조각을 낱말+의미 검색으로 10개) + ③ 질문 시점 기준 일정표(D-n·다음 수업일·내 조)
// → Claude Sonnet 5.5 가 그 자료 안에서만 답하고, 쓴 조각의 id 와 원문 문구(refs)를 돌려준다.
// 서버가 그 id 를 파일명·쪽·위치로 바꾸고 문구가 원문에 정말 있는지 확인해 보드에 보낸다.
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
import { retrieve, resolveRefs, type Ref } from "@/lib/hakbot/rag";
import { appendLog } from "@/lib/hakbot/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 수달님 결정(2026-10-24): Sonnet 5.5. 단순 조회는 effort low 로 충분하다.
const MODEL = "claude-sonnet-5-5";

// 보드 주소: 새 비공개 저장소의 Vercel 주소(10/25부터) + 옛 GitHub Pages(이동 안내만 남지만 혹시 열린 탭용)
const ALLOWED = ["https://emba17-board.vercel.app", "https://willryugo.github.io"];
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
  cards: z
    .array(
      z.object({
        big: z.string().describe("크게 보일 숫자·날짜 하나 — 예: 11/28(토), 50%, 없음, 3회. 12자 이내"),
        label: z.string().describe("그 숫자가 무엇인지 — 예: 종합시험, 11장 과제 마감. 14자 이내"),
        note: z.string().describe("덧붙일 한 줄 — 예: 3교시 15:55 · 오픈북. 없으면 빈 문자열"),
        tone: z.enum(["시험", "마감", "정보", "주의"]),
        check: z.boolean().describe("기록끼리 엇갈리거나 아직 확정 안 된 값이면 true — 보드가 「확인 필요」를 붙인다"),
      }),
    )
    .describe("답의 핵심 숫자 카드 1~4개. 날짜·비율·횟수처럼 한눈에 봐야 할 것만. 숫자가 없는 답이면 빈 배열"),
  answer: z.string().describe("한 줄 결론 — 40자 이내, 카톡 공지 첫 줄처럼. 예: 11장 과제는 11/6(금) 밤까지, 손풀이로 냅니다"),
  points: z
    .array(
      z.object({
        emoji: z.enum(["📅", "📝", "✍️", "⚠️", "📌", "📚", "✅", "❌", "⏰", "👥", "💡"]),
        text: z.string().describe("핵심 한 줄 — 35자 이내, 명사형·짧은 문장. 예: 마감 11/6(금) 23:59 · 러너스"),
        check: z.boolean().describe("기록끼리 엇갈리거나 추정·미확정인 줄이면 true — 보드가 「확인 필요」를 붙인다"),
      }),
    )
    .describe("카톡 공지처럼 이모지 한 개 + 핵심 한 줄, 2~5줄. 📅 일정 📝 시험 ✍️ 과제·제출방식 ⚠️ 주의·감점·F ⏰ 시간 📚 범위·교재 ✅ 허용 ❌ 금지 👥 조·팀 💡 팁 📌 그 밖의 핵심"),
  chart: z
    .object({
      kind: z.enum(["비중", "일정"]),
      title: z.string().describe("도표 제목 — 예: 성적 비중, 남은 마감"),
      items: z
        .array(
          z.object({
            label: z.string().describe("항목 — 예: 종합시험, 11장 과제. 10자 이내"),
            value: z.number().nullable().describe("비중일 때 % 숫자. 일정이면 null"),
            date: z.string().describe("일정일 때 M/D(요일) — 예: 11/6(금). 비중이면 빈 문자열"),
          }),
        )
        .describe("2~6개"),
    })
    .nullable()
    .describe("도표가 도움이 될 때만: 평가 비중이 답에 있으면 「비중」(합 100), 날짜가 2개 이상이면 「일정」. 아니면 null"),
  table: z
    .object({ headers: z.array(z.string()), rows: z.array(z.array(z.string())) })
    .nullable()
    .describe("일정·범위·배점처럼 표가 나은 경우만. 아니면 null"),
  sources: z.array(Source).describe("답의 근거. resolved=true 이면 1개 이상"),
  refs: z
    .array(
      z.object({
        id: z.string().describe("답에 쓴 근거 조각 id — 검색된_근거의 c123 이나 일정표의 i45 (대괄호 없이)"),
        quote: z.string().describe("그 조각 원문에서 그대로 옮긴 핵심 문구 30자 이내 — 바꿔 쓰지 말 것"),
      }),
    )
    .describe("답에 실제로 쓴 조각 1~4개. 강의안·수업 기록 쪽을 썼으면 반드시 넣는다. 과목별 한 장만으로 답했으면 빈 배열"),
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
- 담백한 ~합니다 체. 인사·사족 없이 바로 답.
- 원우는 휴대폰으로 카톡 공지처럼 훑어본다. 산문 문단 금지. 보여 주는 순서는 카드(cards) → 한 줄 결론(answer) → 이모지 줄(points) → 도표(chart) → 표(table).
- 날짜·비중·횟수는 카드에 크게. points 는 한 줄에 한 사실, 「~입니다」로 늘이지 말고 「마감 11/6(금) 23:59」처럼 짧게. 카드·points 에 같은 문장을 되풀이하지 않는다.
- 애매한 것은 단정하지 않는다: 자료의 unsure 에 걸리거나 추정·미확정인 카드·줄은 check=true(보드가 「확인 필요」 표시), 확정된 것은 false. 무엇이 왜 애매한지는 unsure 에 한두 문장으로.
- 표는 행이 셋 이상일 때만. 도표로 충분하면 표는 null.
- HTML 태그(<br> 등)를 쓰지 않는다. 줄바꿈이 필요하면 문장을 나눈다.

시점·조·근거(질문마다 붙는 <일정표>·<검색된_근거>):
- <일정표> 는 오늘(서울) 기준으로 이미 계산돼 있다. D-n·「n일 지남」을 그대로 쓰고 날짜를 새로 계산하지 않는다. 「이번 주」「다음 수업」은 일정표의 구간·다음 수업일을 쓴다.
- 다가오는 것은 가까운 날짜부터. 이미 지난 일정은 질문이 지난 일을 물을 때만 말한다(지난 마감을 「남은 마감」에 넣지 않는다).
- 「준비물·뭐 해 가야 하나」: 다음 수업일 전에 끝낼 것(제출·읽기·케이스 질문·지참물)을 날짜순으로, 마감 시각·제출 위치와 함께.
- 조: 내조가 정해져 있으면 그 조 + 전 조 일정만 말한다. 내조가 「모름」인데 조마다 다르면 조별로 나눠 표(조·날짜·내용)로 보여 주고 points 끝에 💡 「보드에서 내 조를 고르면 내 조 것만 보여 드립니다」.
- <검색된_근거> 의 [c…] 는 강의안·실라버스·과제·수업 기록의 실제 쪽이다. 답에 쓴 조각은 refs 에 id 와 원문 문구를 넣는다. 일정표 줄 [i…] 를 근거로 썼으면 그것도 refs 에. 강의안 쪽을 근거로 쓰면 sources.where 에 「파일명 n쪽」.
- 「수업 기록(학술국 정리)」 조각은 학술국이 수업 내용을 정리한 노트다. 그 안의 교수님 말씀은 kind 「수업 중 말씀」, when 에 수업 날짜(시각이 적혀 있으면 시각까지).
- 과목별 한 장(정리본)과 조각이 어긋나면 한 장이 더 최근 정리다. 어긋남은 unsure 에 적는다.
- 자료(강의안·케이스·과제 파일)를 달라는 질문: 근거 조각의 파일명·쪽과 위치를 알려 주고 「보드의 근거 보기에서 열 수 있다」고 안내한다. 파일 주소를 지어내지 않는다.
- 1학기 질문은 <과목표>의 1학기 줄과 1학기 이론카드로 짧게 답한다(교수님·과목·주로 다룬 개념 두세 개).`;

// 「이번 주 마감」 같은 질문을 풀려면 모델이 오늘(서울)을 알아야 한다.
function todayKo(d = new Date()) {
  const k = new Date(d.getTime() + 9 * 3600_000);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}-${String(k.getUTCDate()).padStart(2, "0")}(${"일월화수목금토"[k.getUTCDay()]})`;
}

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

  let body: { q?: string; anon?: string; team?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, reason: "bad_json" }, { status: 400, headers: H });
  }
  const q = String(body.q || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const anon = String(body.anon || "").replace(/[^a-z0-9]/gi, "").slice(0, 16) || "anon";
  const teamIn = /^[1-7]조$/.test(String(body.team || "")) ? String(body.team) : null;
  if (q.length < 2) return Response.json({ ok: false, reason: "empty" }, { headers: H });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0";
  if (limited(ip)) return Response.json({ ok: false, reason: "rate" }, { status: 429, headers: H });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // 키가 없어도 질문은 학술국에 남긴다 — 보드가 페이지 안 자료로 찾아 보여 주지만 해결 여부는 사람이 본다.
    await appendLog({ ts: seoulIso(), anon, q, resolved: false, course: null, answer: "", sources: [], mode: "local", ms: Date.now() - t0 });
    return Response.json({ ok: false, reason: "no_key" }, { headers: H });
  }

  const [term2, rag] = await Promise.all([loadTerm2(), retrieve(q, { team: teamIn }).catch((e) => { console.log("[hakbot] 검색 실패:", String(e).slice(0, 200)); return null; })]);
  // 1학기 조별 케이스(42장)는 꾸러미에 없어서 예전 낱말 검색으로 붙인다. 꾸러미가 안 열려도 예전처럼 돈다.
  const term1 = !rag || rag.term1 ? retrieveTerm1(q) : "";
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
      max_tokens: 2600,
      // 규칙 + 2학기 자료는 모든 질문에 똑같이 들어가므로 캐시한다(두 번째 질문부터 입력비 약 1/10).
      system: [
        { type: "text", text: RULES },
        { type: "text", text: kbText, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content:
            (rag ? rag.context + "\n\n" : "") +
            (term1 ? `<1학기_관련_카드>\n${term1}\n</1학기_관련_카드>\n\n` : "") +
            `오늘: ${todayKo()}${rag?.team ? ` · 질문한 원우: ${rag.team}` : ""}
질문: ${q}`,
        },
      ],
      output_config: { effort: "low", format: zodOutputFormat(Answer) },
    });
    if (res.stop_reason === "refusal") {
      out = { resolved: false, course: null, cards: [], answer: "이 질문은 학술봇이 답하지 않습니다.", points: [], chart: null, table: null, sources: [], refs: [], unsure: null };
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
  if (out.resolved && out.sources.length === 0 && out.refs.length === 0) out.resolved = false;
  const refs: Ref[] = rag ? resolveRefs(rag, out.refs) : [];
  const ragStat = rag ? { ...rag.stat, codes: rag.codes, team: rag.team, chunks: rag.chunks.length, refs: refs.map((r) => r.id) } : null;

  const logged = await appendLog({
    ts: seoulIso(), anon, q, resolved: out.resolved, course: out.course, answer: out.answer,
    sources: out.sources, mode, ms: Date.now() - t0, points: out.points, unsure: out.unsure, rag: ragStat,
  });
  return Response.json(
    { ok: true, ...out, refs, team: rag?.team ?? null, logged, kbUpdated: term2?.updated ?? null, packBuilt: rag?.pack.built ?? null },
    { headers: H },
  );
}
