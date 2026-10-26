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
  // 선택지를 enum 으로 묶으면 모델이 목록 밖 값을 한 번만 써도 답 전체가 버려진다(10/25 「조별 발표 일정」 ai_error).
  // 그래서 글자로 받고 아래 tidy() 가 목록 밖 값을 바로잡는다.
  kind: z.string().describe("수업 중 말씀 · 수정·변경 · 교재 · 강의안 · 강조하심 · 실라버스 · 러너스 공지 · 교수님 메일 · 학술국 풀이 · 1학기 카드 · 기타 중 하나"),
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
        label: z.string().describe("그 숫자가 무엇인지 — 과제·시험·발표·예습이면 교수님 성함을 앞에: 예: 문두철 11장 과제, 김보경 M&A 보고서, 임일 AI 발표. 14자 이내. 카드 하나에 일 하나(「가장 가까운 마감」처럼 둘을 묶지 않는다). D-n 은 쓰지 않는다(보드가 날짜로 붙인다)"),
        note: z.string().describe("덧붙일 한 줄 — 예: 3교시 15:55 · 오픈북. 없으면 빈 문자열"),
        tone: z.string().describe("시험 · 마감 · 정보 · 주의 중 하나(발표·행사는 「정보」)"),
        check: z.boolean().describe("기록끼리 엇갈리거나 아직 확정 안 된 값이면 true — 보드가 「확인 필요」를 붙인다"),
      }),
    )
    .describe("답의 핵심 숫자 카드 1~4개. 날짜·비율·횟수처럼 한눈에 봐야 할 것만. 숫자가 없는 답이면 빈 배열"),
  answer: z.string().describe("한 줄 결론 — 40자 이내, 카톡 공지 첫 줄처럼. 예: 11장 과제는 11/6(금) 밤까지, 손풀이로 냅니다"),
  points: z
    .array(
      z.object({
        emoji: z.string().describe("📅 📝 ✍️ ⚠️ 📌 📚 ✅ ❌ ⏰ 👥 💡 ⭐ 중 하나 — ⭐ 는 교수님이 강하게 강조하신 것"),
        text: z.string().describe("핵심 한 줄 — 35자 이내, 명사형·짧은 문장. 예: 마감 11/6(금) 23:59 · 러너스"),
        check: z.boolean().describe("기록끼리 엇갈리거나 추정·미확정인 줄이면 true — 보드가 「확인 필요」를 붙인다"),
      }),
    )
    .describe("카톡 공지처럼 이모지 한 개 + 핵심 한 줄, 2~5줄. 📅 일정 📝 시험 ✍️ 과제·제출방식 ⚠️ 주의·감점·F ⏰ 시간 📚 범위·교재 ✅ 허용 ❌ 금지 👥 조·팀 💡 팁 📌 그 밖의 핵심"),
  chart: z
    .object({
      kind: z.string().describe("비중 · 일정 중 하나"),
      title: z.string().describe("도표 제목 — 예: 성적 비중, 남은 마감"),
      items: z
        .array(
          z.object({
            label: z.string().describe("항목 — 예: 종합시험, 11장 과제. 10자 이내"),
            who: z.string().describe("일정일 때 「교수님 성함 교수님 · 과목 약칭」 — 일정표 줄의 괄호 안 교수님과 과목을 그대로. 예: 한재훈 교수님 · 재무시장과 가치평가. 학사·행사이거나 비중이면 빈 문자열"),
            value: z.number().nullable().describe("비중일 때 % 숫자. 일정이면 null"),
            date: z.string().describe("일정일 때 M/D(요일) — 예: 11/6(금). 비중이면 빈 문자열"),
          }),
        )
        .describe("2~6개"),
    })
    .nullable()
    .describe("평가 비중이 답에 있으면 「비중」(합 100). 다가오는·남은·마감·준비 질문에서 날짜 있는 과제·시험·발표·예습이 2개 이상이면 「일정」을 반드시 넣는다(null 금지) — 항목마다 who 에 교수님 · 과목. 그 밖엔 null"),
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
  mood: z.string().describe("보통 · 장난 중 하나. 학업과 상관없는 잡담·농담·떠보기(학술국장·교수님 사생활, 연애·점심 메뉴, 「시험 답 그냥 알려줘」「과제 대신 써 줘」「몰래 결석해도 돼?」「학술봇 너 누구야」 등)는 장난, 나머지는 보통"),
  quip: z.string().describe("국장·부국장 부엉이가 말풍선으로 할 한 줄(25자 안팎). 장난이면 재치 있게 받아치고 공부로 돌려보낸다 — 예: 「그럴 시간에 CVP 한 문제 더 푸시죠~」「연애보다 손익분기점이 먼저입니다~」. 보통이면 빈 문자열. 숫자는 자료에 있는 것만"),
  follow: z
    .array(z.string())
    .describe("이어서 물어볼 질문 2~3개 — 원우가 단추로 그대로 누를 짧은 질문(25자 안팎, 「~해줘」「~뭐야?」). 방금 답의 과목·개념에서 한 걸음 더: 쉬운 풀이·헷갈리는 점·시험 포인트·연습(O/X)·관련 장표. 일정 답이면 준비물·다음 마감. 교수님 성함을 앞에(예: 「문두철 교수님 손익분기점 O/X 3문제 내줘」). 자료로 답할 수 없는 질문은 넣지 않는다"),
  unsure: z.string().nullable().describe("기록끼리 어긋나거나 아직 공지 안 된 부분만, 두 문장 120자 이내. 덧붙일 설명·요약은 여기 쓰지 않는다. 없으면 null"),
});
type AnswerT = z.infer<typeof Answer>;

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");
const NUM = /\d{1,2}\/\d{1,2}|\d{1,2}:\d{2}|\d+(?:-\d+)+|\d+(?:\.\d+)?(?:%|쪽|장|문제|문항|점|회차|교시)/g;
/** 답에 나온 숫자 중 자료(일정표·조각·과목별 한 장)에 없는 것 — 있으면 그 카드·줄에 「확인 필요」를 붙인다. */
function factCheck(o: AnswerT, ctx: string): string[] {
  const hay = squash(ctx);
  const bad = new Set<string>();
  const miss = (t: string) => {
    let hit = false;
    for (const m of String(t || "").matchAll(NUM)) if (!hay.includes(squash(m[0]))) { bad.add(m[0]); hit = true; }
    return hit;
  };
  for (const c of o.cards) if (miss(`${c.big} ${c.note}`)) c.check = true;
  for (const pt of o.points) if (miss(pt.text)) pt.check = true;
  miss(o.answer);
  if (o.quip && [...String(o.quip).matchAll(NUM)].some((m) => !hay.includes(squash(m[0])))) o.quip = "";
  return [...bad];
}

const TONES = ["시험", "마감", "정보", "주의"];
const EMOJIS = ["📅", "📝", "✍️", "⚠️", "📌", "📚", "✅", "❌", "⏰", "👥", "💡", "⭐"];
const KINDS = ["수업 중 말씀", "수정·변경", "교재", "강의안", "강조하심", "실라버스", "러너스 공지", "교수님 메일", "학술국 풀이", "1학기 카드", "기타"];
/** 목록 밖 값을 가장 가까운 것으로 바로잡는다 — 화면이 아는 값만 보드로 보낸다. */
// 한글 답에 섞여 나오는 가나·한자 낱자(10/25 실측: unsure 끝에 「機会」) — 원우에게 보이는 칸에서 걷어 낸다
const STRAY = /[぀-ヿ一-鿿]+/g;
const unstray = (t: string) => t.replace(STRAY, "").replace(/\s{2,}/g, " ").trim().replace(/\s*[}\]]+$/, "");
function tidy(o: AnswerT) {
  o.answer = unstray(o.answer);
  if (o.unsure) o.unsure = unstray(o.unsure);
  for (const c of o.cards) { c.big = unstray(c.big); c.label = unstray(c.label); c.note = unstray(c.note); }
  for (const p of o.points) p.text = unstray(p.text);
  for (const c of o.cards) if (!TONES.includes(c.tone)) c.tone = /시험|기말|퀴즈/.test(c.tone + c.label) ? "시험" : /마감|제출/.test(c.tone + c.label) ? "마감" : "정보";
  for (const p of o.points) if (!EMOJIS.includes(p.emoji)) p.emoji = EMOJIS.find((e) => p.emoji.startsWith(e.slice(0, 2))) ?? "📌";
  for (const s of o.sources) if (!KINDS.includes(s.kind)) s.kind = "기타";
  o.mood = /장난/.test(o.mood ?? "") ? "장난" : "보통";
  o.quip = unstray(o.quip ?? "").replace(/^["「]|["」]$/g, "").slice(0, 40);
  if (o.mood === "보통") o.quip = "";
  o.follow = (o.follow ?? []).map((f) => unstray(f).replace(/^[-·•\d.)\s]+/, "")).filter((f) => f.length >= 4 && f.length <= 40).slice(0, 3);
  if (o.chart && o.chart.kind !== "비중" && o.chart.kind !== "일정") o.chart.kind = o.chart.items.some((i) => typeof i.value === "number") ? "비중" : "일정";
}

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
- 일정표의 「예습」은 제출 과제는 아니지만 수업 전에 꼭 할 준비(케이스 읽어 오기·준비물)다. 준비·다음 수업 질문엔 과제와 함께 넣되 「과제 아님 · 예습」이라고 구분한다. 과제와 예습이 같은 케이스면(예: 팀 리포트 + 전원 읽어 오기) 둘 다 말한다.
- 원우는 교수님 성함으로 과목을 기억한다. 과제·시험·발표·예습을 말하는 points 줄에는 교수님 성함과 과목을 함께 쓴다 — 예: 「✍️ 한재훈 교수님(재무시장과 가치평가) 과제2 — 11/6(금) 13:00 러너스」. 예습은 여러 개를 한 줄로 묶지 말고 과목마다 한 줄: 「📚 과제 아님 · 예습 — 허대식 교수님(운영·공급사슬관리) 삼성전자 (A)(B) 케이스 읽기 · 11/7(토) 수업 전」.
- 조: 내조가 정해져 있으면 그 조 + 전 조 일정만 말한다. 내조가 「모름」인데 조마다 다르면 조별로 나눠 표(조·날짜·내용)로 보여 주고 points 끝에 💡 「보드에서 내 조를 고르면 내 조 것만 보여 드립니다」.
- <검색된_근거> 의 [c…] 는 강의안·실라버스·과제·수업 기록의 실제 쪽이다. 답에 쓴 조각은 refs 에 id 와 원문 문구를 넣는다. 일정표 줄 [i…] 를 근거로 썼으면 그것도 refs 에. 강의안 쪽을 근거로 쓰면 sources.where 에 「파일명 n쪽」.
- 「학술국 쉬운 풀이」 조각은 학술국이 강의안·판서를 한 장씩 쉽게 풀어 쓴 해설이다(교수님 말씀이 아니다). 「어렵다·쉽게·이해·풀이·요약·무슨 뜻」 질문엔 이것을 뼈대로 짧고 쉽게 설명하되, 그 설명이 기대는 강의안 쪽([c…] 의 원본 쪽)이 있으면 같이 refs 에 넣는다. sources kind 는 「학술국 풀이」. 「교수님이 ~라고 하셨다」로 바꿔 말하지 않는다. 풀이 안 「확인 필요」 표시는 check=true 로 옮긴다. 마감 전 과제 문제의 답·풀이 과정은 쉬운 풀이에 있어도 말하지 않는다.
- 장난스러운 질문(mood 「장난」): 짧고 재치 있게 받아치고 공부로 돌려보낸다. answer 한 줄 + points 0~2줄, quip 에 부엉이 한 줄. 웃기되 사람(교수님·원우·학술국)을 놀리거나 깎아내리지 않는다. 비속어·외모·성적·정치·종교 농담은 하지 않는다. 자료에 있는 사실(출석 규칙·시험 날짜 등)이 걸리면 장난 속에 정확히 넣는다(예: 「몰래 결석」 → 허대식 과목 3시간 수업 3회 결석이면 F). 「시험 답·과제 대신 해 줘」도 장난스럽게 거절하되 마감 전 과제 답은 끝까지 주지 않는다. follow 는 진짜 공부 질문으로. 이 경우 resolved=true, sources·refs 는 쓴 사실이 있을 때만.
- 「O/X·문제 내줘·퀴즈·연습」 요청: 근거 조각(특히 학술국 쉬운 풀이의 헷갈림·쉽게·풀이 칸, 강의안 쪽)에 그대로 있는 사실만으로 O/X·4지선다 문제를 3~5개 만든다. 표(table)로 headers 「문제 · 정답 · 근거」, 근거 칸에 「파일명 n쪽」. 숫자는 근거에 있는 숫자만(장표 예제 숫자 그대로) — 새 숫자로 바꾼 계산 문제는 만들지 않고 「장표 예제 숫자로 연습해 보기」를 권한다. 시험 제외 장표로는 내지 않는다. 마감 전 과제 문제와 같은 문제는 내지 않는다. 학술국이 만든 연습 문제임을 answer 에 밝힌다(교수님 출제 아님). 이 경우 resolved=true.
- 「수업 기록(학술국 정리)」 조각은 학술국이 수업 내용을 정리한 노트다. 그 안의 교수님 말씀은 kind 「수업 중 말씀」, when 에 수업 날짜(시각이 적혀 있으면 시각까지).
- 과목별 한 장(정리본)과 조각이 어긋나면 한 장이 더 최근 정리다. 어긋남은 unsure 에 적는다.
- 자료(강의안·케이스·과제 파일)를 달라는 질문: 근거 조각의 파일명·쪽과 위치를 알려 주고 「보드의 근거 보기에서 열 수 있다」고 안내한다. 파일 주소를 지어내지 않는다.
- 1학기 질문은 <과목표>의 1학기 줄과 1학기 이론카드로 짧게 답한다(교수님·과목·주로 다룬 개념 두세 개).
- [수업 중 강조·강/중/약] 조각은 수업 받아쓰기에서 강조 표현이 나온 대목이다. 강 = 시험 출제 언급·「가장/제일 중요한 건」·「꼭 기억」, 중 = 「중요합니다」·「포인트」·「기억하세요」, 약 = 「시험에 안 나온다·중요한 게 아니다·넘어가도 된다」. 자동 기록이라 낱말이 틀리고 말한 사람(교수님·원우)을 가리지 못한다 — 학술국 수업 기록·과목별 한 장과 같은 방향일 때만 쓰고, 혼자 동떨어진 말은 버린다. 쓸 때 sources.kind 「강조하심」, when 「10/23 수업 중」, what 앞에 (강)·(중)·(약). 시험·「뭐가 중요해」 질문엔 그 과목의 (강)을 ⭐ 줄로 먼저, (약)은 「덜 봐도 되는 곳」으로. 같은 내용을 여러 회차에 강조하셨으면 「n회 강조」라고 적는다. 받아쓰기 문장을 길게 옮기지 말고 뜻만.
- unsure 는 「무엇과 무엇이 어긋나는가」만 두 문장 이내. 참고 설명·요약·덧말을 unsure 에 쌓지 않는다 — 꼭 필요한 덧말은 points 한 줄로.`;

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

  const userContent =
    (rag ? rag.context + "\n\n" : "") +
    (term1 ? `<1학기_관련_카드>\n${term1}\n</1학기_관련_카드>\n\n` : "") +
    `오늘: ${todayKo()}${rag?.team ? ` · 질문한 원우: ${rag.team}` : ""}
질문: ${q}`;
  const client = new Anthropic({ apiKey: key });
  let out: AnswerT | null = null;
  let mode: "ai" | "error" = "ai";
  try {
    const res = await client.messages.parse({
      model: MODEL,
      // 보통 1,200~1,300 토큰. 교수님 성함·예습 줄이 붙어 긴 답이 2,600에서 잘린 적이 있어(10/26) 넉넉히 둔다 — 쓴 만큼만 과금.
      max_tokens: 4000,
      // 규칙 + 2학기 자료는 모든 질문에 똑같이 들어가므로 캐시한다(두 번째 질문부터 입력비 약 1/10).
      system: [
        { type: "text", text: RULES },
        { type: "text", text: kbText, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userContent }],
      output_config: { effort: "low", format: zodOutputFormat(Answer) },
    });
    if (res.stop_reason === "refusal") {
      out = { resolved: false, course: null, cards: [], answer: "이 질문은 학술봇이 답하지 않습니다.", points: [], chart: null, table: null, sources: [], refs: [], follow: [], mood: "보통", quip: "", unsure: null };
    } else {
      out = res.parsed_output ?? null;
    }
    console.log(`[hakbot] usage in=${res.usage.input_tokens} cache_read=${res.usage.cache_read_input_tokens ?? 0} out=${res.usage.output_tokens}`);
  } catch (err) {
    mode = "error";
    if (err instanceof Anthropic.RateLimitError) console.log("[hakbot] rate limited");
    else if (err instanceof Anthropic.APIError) console.log(`[hakbot] api ${err.status}: ${err.message.slice(0, 200)}`);
    else if (/Failed to parse structured output/.test(String(err))) console.log("[hakbot] 출력 잘림(상한 도달 추정):", String(err).slice(0, 160));
    else console.log("[hakbot] 오류:", String(err).slice(0, 200));
  }

  if (!out) {
    await appendLog({ ts: seoulIso(), anon, q, resolved: false, course: null, answer: "", sources: [], mode: "error", ms: Date.now() - t0 });
    return Response.json({ ok: false, reason: "ai_error" }, { headers: H });
  }
  // 근거 없는 「해결」은 해결로 치지 않는다.
  if (out.resolved && out.sources.length === 0 && out.refs.length === 0) out.resolved = false;
  tidy(out);
  // 「확인 필요」 칸이 덧말 창고가 되지 않게 — 규칙을 어기고 길게 오면 앞 두 문장만 남긴다.
  if (out.unsure && out.unsure.length > 200) {
    const ss = out.unsure.split(/(?<=[.다요])\s+/);
    out.unsure = ss.slice(0, 2).join(" ").slice(0, 240);
  }
  // 숫자 근거 대조는 줄인 뒤에 붙인다 — 이 경고는 잘리면 안 된다.
  const unverified = factCheck(out, kbText + "\n" + userContent);
  if (unverified.length) {
    const note = `근거 자료에서 확인되지 않은 숫자: ${unverified.slice(0, 5).join(", ")}`;
    out.unsure = out.unsure ? `${out.unsure} ${note}` : note;
    console.log("[hakbot] 근거 없는 숫자:", unverified.join(", "));
  }
  const refs: Ref[] = rag ? resolveRefs(rag, out.refs) : [];
  const ragStat = rag ? { ...rag.stat, codes: rag.codes, team: rag.team, chunks: rag.chunks.length, refs: refs.map((r) => r.id), unverified } : null;

  const logged = await appendLog({
    ts: seoulIso(), anon, q, resolved: out.resolved, course: out.course, answer: out.answer,
    sources: out.sources, mode, ms: Date.now() - t0, points: out.points, unsure: out.unsure, rag: ragStat,
  });
  return Response.json(
    { ok: true, ...out, refs, team: rag?.team ?? null, logged, kbUpdated: term2?.updated ?? null, packBuilt: rag?.pack.built ?? null },
    { headers: H },
  );
}
