// 학술봇 검색(RAG) — 질문 하나를 받아 「근거 조각 + 질문 시점 기준 일정표」를 만든다. 서버 전용.
//
// 지식 꾸러미(학술운영보드 비공개 저장소 data/hakbot — 열쇠 HAKBOT_KB_TOKEN 이 맞을 때만 받는다):
//   조각 약 3천 개 = 2학기 강의안·실라버스·과제·수업 기록(쪽 단위) + 일정 항목 + 1학기 이론카드
//   벡터 = 같은 조각을 multilingual-e5-small(트랜스포머 인코더)로 바꾼 384차원, int8(×127)
//   정본은 Z:/EMBA/_board/hakbot/hakbot.sqlite (과목·회차·항목·문서·조각 표) — 꾸러미는 그 사본.
//
// 찾는 길 셋을 합친다(임일 교수님 Module 3 의 RAG 그대로):
//   ① 낱말 검색 BM25 — 한글은 두 글자 조각으로 센다(강의안 PDF 는 띄어쓰기가 사라져 있다)
//   ② 의미 검색 — 질문을 같은 모델로 벡터로 바꿔 코사인 유사도(보드 /api/embed · 4.5초 안에 안 오면 ①만)
//   ③ 순위 합치기 RRF — 1/(60+순위) 를 더한다. 두 점수의 눈금이 달라도 합칠 수 있다.
// 그리고 질문 시점(서울 오늘) 기준 일정표 — 다가오는 것(D-n)·지난 것·다음 수업일 — 를 따로 계산해 붙인다.
// 원우 질문의 대부분이 「언제·무엇을 준비·어디에 내나」라서, 그 계산을 모델에 맡기지 않는다.

const BASE = process.env.HAKBOT_KB_BASE || "https://emba17-board.vercel.app";
const DIM = 384;

export interface Course { code: string; term: string; ko: string; en: string; prof: string; slot: string; short: string }
export interface Session { course: string; no: number; date: string | null; topic: string; readings: string }
export interface Item { id: number; course: string | null; kind: string; date: string | null; title: string; detail: string; due: string; team: string | null; source: string }
export interface Doc { course: string; name: string; ext: string; kind: string; date: string | null; session: number | null; where: string }
export interface Chunk {
  id: number; kind: "page" | "item" | "card" | "emph"; course: string | null; date: string | null;
  title: string; text: string; src: string; item: number | null; doc: number | null; page: number | null;
  flat: string; // 낱말 검색용: 소문자 + 공백 제거
}
export interface Pack {
  built: string; courses: Course[]; sessions: Session[]; items: Item[]; docs: Record<string, Doc>;
  chunks: Chunk[]; vec: Int8Array; avgLen: number;
  chunkById: Map<number, Chunk>; itemById: Map<number, Item>; courseBy: Map<string, Course>;
}

let packCache: { at: number; p: Pack } | null = null;
let loading: Promise<Pack | null> | null = null;

/** 꾸러미 — 10분 캐시. 보드가 안 열리면 마지막으로 받은 것을 쓴다. */
export async function loadPack(): Promise<Pack | null> {
  if (packCache && Date.now() - packCache.at < 10 * 60_000) return packCache.p;
  if (!loading) loading = fetchPack().finally(() => { loading = null; });
  return loading;
}

async function fetchPack(): Promise<Pack | null> {
  const token = process.env.HAKBOT_KB_TOKEN;
  if (!token) return packCache?.p ?? null;
  try {
    const headers = { "x-hakbot-token": token };
    const [a, b] = await Promise.all([
      fetch(`${BASE}/api/kb`, { headers, cache: "no-store", signal: AbortSignal.timeout(15_000) }),
      fetch(`${BASE}/api/kb?part=vec`, { headers, cache: "no-store", signal: AbortSignal.timeout(15_000) }),
    ]);
    if (!a.ok || !b.ok) throw new Error(`kb ${a.status}/${b.status}`);
    const raw = (await a.json()) as {
      built: string; courses: Course[]; sessions: Session[]; items: Item[]; docs: Record<string, Doc>;
      chunk_cols: string[]; chunks: unknown[][];
    };
    const vb = (await b.json()) as { b64: string };
    const buf = Buffer.from(vb.b64, "base64");
    const vec = new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const col = (name: string) => raw.chunk_cols.indexOf(name);
    const ci = { id: col("id"), kind: col("kind"), course: col("course"), date: col("date"), title: col("title"), text: col("text"), src: col("src"), item: col("item_id"), doc: col("doc_id"), page: col("page") };
    const chunks: Chunk[] = raw.chunks.map((r) => {
      const title = String(r[ci.title] ?? "");
      const text = String(r[ci.text] ?? "");
      return {
        id: Number(r[ci.id]), kind: r[ci.kind] as Chunk["kind"], course: (r[ci.course] as string) ?? null,
        date: (r[ci.date] as string) ?? null, title, text, src: String(r[ci.src] ?? ""),
        item: (r[ci.item] as number) ?? null, doc: (r[ci.doc] as number) ?? null, page: (r[ci.page] as number) ?? null,
        flat: (title + " " + text).toLowerCase().replace(/\s+/g, ""),
      };
    });
    if (vec.length !== chunks.length * DIM) throw new Error(`vec ${vec.length} ≠ ${chunks.length}×${DIM}`);
    const p: Pack = {
      built: raw.built, courses: raw.courses, sessions: raw.sessions, items: raw.items, docs: raw.docs, chunks, vec,
      avgLen: chunks.reduce((s, c) => s + c.flat.length, 0) / Math.max(1, chunks.length),
      chunkById: new Map(chunks.map((c) => [c.id, c])),
      itemById: new Map(raw.items.map((i) => [i.id, i])),
      courseBy: new Map(raw.courses.map((c) => [c.code, c])),
    };
    packCache = { at: Date.now(), p };
    return p;
  } catch (e) {
    console.log("[hakbot] 꾸러미 실패:", String(e).slice(0, 200));
    return packCache?.p ?? null;
  }
}

/** 질문 → 벡터. 보드의 임베딩 함수(같은 모델)를 부른다. 질문은 주소가 아니라 본문으로 보낸다. */
async function embed(q: string): Promise<Float32Array | null> {
  const token = process.env.HAKBOT_KB_TOKEN;
  if (!token) return null;
  try {
    const r = await fetch(`${BASE}/api/embed`, {
      method: "POST",
      headers: { "x-hakbot-token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ q }),
      cache: "no-store",
      signal: AbortSignal.timeout(4_500),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { ok?: boolean; vec?: number[] };
    if (!j.ok || !Array.isArray(j.vec) || j.vec.length !== DIM) return null;
    return Float32Array.from(j.vec);
  } catch {
    return null;
  }
}

// ───────────────────────── ① 낱말 검색(BM25) ─────────────────────────

// 질문에 흔해서 점수만 흐리는 두 글자 조각
const STOP = new Set([
  "교수", "수님", "수업", "언제", "어디", "어떻", "떻게", "하나", "나요", "알려", "려줘", "뭐야", "무엇", "있나", "인가",
  "해줘", "말씀", "이번", "다음", "에서", "으로", "하는", "해야", "되나", "는지", "을까", "까요", "는데", "건가", "거야",
  "뭐였", "였지", "누구", "구였", "주세", "세요", "있어", "어요", "나와", "봐줘", "가요", "인지",
]);

const EMPH_Q = /시험|중요|강조|범위|핵심|포인트|출제|나와|나올|준비|공부|외워|외울|뭐가|어디까지/;

export function queryTerms(q: string): string[] {
  const out = new Set<string>();
  for (const w of q.toLowerCase().match(/[a-z][a-z0-9&]+|\d+(?:장|조|회차|주차|쪽)|[가-힣]+/g) || []) {
    if (/^[가-힣]+$/.test(w)) {
      if (w.length < 2) continue;
      for (let i = 0; i + 2 <= w.length; i++) {
        const g = w.slice(i, i + 2);
        if (!STOP.has(g)) out.add(g);
      }
    } else if (w.length >= 2) out.add(w);
  }
  return [...out];
}

function countIn(hay: string, needle: string): number {
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

function bm25(p: Pack, terms: string[]): Float64Array {
  const N = p.chunks.length;
  const sc = new Float64Array(N);
  const tf = new Uint16Array(N);
  for (const t of terms) {
    tf.fill(0);
    let df = 0;
    for (let i = 0; i < N; i++) {
      const c = countIn(p.chunks[i].flat, t);
      if (c) { tf[i] = Math.min(c, 60000); df++; }
    }
    if (!df) continue;
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    for (let i = 0; i < N; i++) {
      if (!tf[i]) continue;
      const L = p.chunks[i].flat.length / p.avgLen;
      sc[i] += (idf * tf[i] * 2.2) / (tf[i] + 1.2 * (0.25 + 0.75 * L));
    }
  }
  return sc;
}

// ───────────────────────── ② 의미 검색(코사인) ─────────────────────────

function cosine(p: Pack, qv: Float32Array): Float64Array {
  const N = p.chunks.length;
  const sc = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let s = 0;
    const o = i * DIM;
    for (let d = 0; d < DIM; d++) s += p.vec[o + d] * qv[d];
    sc[i] = s / 127;
  }
  return sc;
}

function ranks(sc: Float64Array, top: number, min = 0): Map<number, number> {
  const idx = Array.from(sc.keys()).filter((i) => sc[i] > min);
  idx.sort((a, b) => sc[b] - sc[a]);
  return new Map(idx.slice(0, top).map((i, r) => [i, r + 1]));
}

// ───────────────────────── 과목·조·시점 알아듣기 ─────────────────────────

// 별칭은 공백을 뺀 소문자로 맞춘다. 긴 것부터 맞추고 맞춘 자리는 지운다(「글로벌경영전략」이 「전략」으로 새지 않게).
const ALIAS: [string, string][] = [
  ["글로벌경영전략", "gbe"], ["경영자를위한전략", "str"], ["경영자를위한관리회계", "mac"], ["데이터기반마케팅", "ddm"],
  ["재무시장과가치평가", "fmv"], ["it혁신을통한가치창출", "cvt"], ["운영및공급사슬", "osc"], ["운영·공급사슬", "osc"],
  ["마케팅관리", "t1_mkt"], ["재무회계", "t1_fin"], ["경영과학", "t1_msc"], ["조직행동", "t1_mpo"],
  ["관리회계", "mac"], ["재무시장", "fmv"], ["가치평가", "fmv"], ["it혁신", "cvt"], ["아이티혁신", "cvt"], ["가치창출", "cvt"],
  ["공급사슬", "osc"], ["공급망", "osc"], ["oscm", "osc"], ["scm", "osc"], ["운영관리", "osc"],
  ["데이터마케팅", "ddm"], ["마케팅의사결정", "ddm"], ["글로벌", "gbe"], ["국제경영", "gbe"],
  ["한재훈", "fmv"], ["박창희", "ddm"], ["임일", "cvt"], ["허대식", "osc"], ["김보경", "str"], ["문두철", "mac"], ["곽주영", "gbe"],
  ["어준경", "t1_eco"], ["맨큐", "t1_eco"], ["mankiw", "t1_eco"], ["정승환", "t1_ana"], ["오홍석", "t1_mpo"], ["최순규", "t1_eth"],
  ["김성문", "t1_msc"], ["김동훈", "t1_mkt"], ["brandpro", "t1_mkt"], ["브랜드프로", "t1_mkt"], ["최현욱", "t1_fin"],
  ["전략", "str"], ["원가", "mac"], ["마케팅", "ddm"], ["재무", "fmv"],
];
// 흔한 낱말이라 1학기 문맥(「1학기」「교수님」「과목」)이 있을 때만 과목으로 치는 것
const WEAK1: [string, string][] = [["경제", "t1_eco"], ["분석", "t1_ana"], ["윤리", "t1_eth"]];
const TERM1_CUE = /1\s*학기|지난\s*학기|봄\s*학기|전\s*학기|상반기/;

export function detectCourses(q: string): { codes: string[]; term1: boolean } {
  let s = q.toLowerCase().replace(/\s+/g, "");
  const found: string[] = [];
  for (const [a, code] of [...ALIAS].sort((x, y) => y[0].length - x[0].length)) {
    if (s.includes(a)) {
      if (!found.includes(code)) found.push(code);
      s = s.split(a).join("|");
    }
  }
  const cue1 = TERM1_CUE.test(q);
  for (const [a, code] of WEAK1) {
    if (s.includes(a) && (cue1 || new RegExp(a + "(교수|과목|수업|시험)").test(s)) && !found.includes(code)) found.push(code);
  }
  // 1학기 문맥이면 2학기와 이름이 겹치는 과목을 1학기 쪽으로 돌린다(「1학기 마케팅」 = 마케팅관리)
  if (cue1) {
    const swap: Record<string, string> = { ddm: "t1_mkt", fmv: "t1_fin" };
    for (let i = 0; i < found.length; i++) if (swap[found[i]]) found[i] = swap[found[i]];
  }
  return { codes: [...new Set(found)], term1: cue1 || found.some((c) => c.startsWith("t1")) };
}

export function detectTeam(q: string, given?: string | null): string | null {
  const m = q.match(/([1-7])\s*조/);
  if (m) return `${m[1]}조`;
  return given && /^[1-7]조$/.test(given) ? given : null;
}

const DOW = "일월화수목금토";
function isoToDate(iso: string) { return new Date(iso + "T00:00:00Z"); }
function addDays(iso: string, n: number) { const d = isoToDate(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function diffDays(a: string, b: string) { return Math.round((isoToDate(b).getTime() - isoToDate(a).getTime()) / 86400_000); }
export function md(iso: string | null) {
  if (!iso) return "날짜 미정";
  const d = isoToDate(iso);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${DOW[d.getUTCDay()]})`;
}
function dday(today: string, iso: string | null) {
  if (!iso) return "";
  const n = diffDays(today, iso);
  return n === 0 ? "오늘" : n > 0 ? `D-${n}` : `${-n}일 지남`;
}
export function seoulToday(d = new Date()) {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

interface Win { from: string; to: string; label: string; past: number }
const SEM_END = "2026-12-31";
/** 질문의 시점 말(오늘·내일·이번 주·다음 주·N월·남은)을 날짜 구간으로. 없으면 앞으로 3주 + 시험·발표는 전부. */
export function timeWindow(q: string, today: string): Win {
  const s = q.replace(/\s+/g, "");
  const dow = isoToDate(today).getUTCDay(); // 0=일
  const sunday = addDays(today, dow === 0 ? 7 : 7 - dow); // 일요일에 「이번 주」는 다가오는 주
  const past = /지난|저번|했던|지났|어제|끝난|전에|그동안|이제까지|지금까지/.test(s) ? 45 : 10;
  if (/오늘/.test(s)) return { from: today, to: today, label: "오늘", past };
  if (/내일/.test(s)) return { from: addDays(today, 1), to: addDays(today, 1), label: "내일", past };
  if (/다음주|담주|차주/.test(s)) return { from: addDays(sunday, 1), to: addDays(sunday, 7), label: "다음 주", past };
  if (/이번주|금주|이번주말|주말/.test(s)) return { from: today, to: sunday, label: "이번 주", past };
  const m = s.match(/(1[0-2]|[1-9])월/);
  if (m) {
    const mm = String(Number(m[1])).padStart(2, "0");
    const from = `2026-${mm}-01`;
    const to = addDays(Number(m[1]) === 12 ? "2027-01-01" : `2026-${String(Number(m[1]) + 1).padStart(2, "0")}-01`, -1);
    return { from: from < today ? today : from, to, label: `${Number(m[1])}월`, past };
  }
  if (/이번달|이달/.test(s)) {
    const mm = Number(today.slice(5, 7));
    const to = addDays(mm === 12 ? "2027-01-01" : `2026-${String(mm + 1).padStart(2, "0")}-01`, -1);
    return { from: today, to, label: "이번 달", past };
  }
  if (/남은|앞으로|다가오|전체|모든|모두|순서|학기|일정|언제|기말|종강/.test(s)) return { from: today, to: SEM_END, label: "남은 학기", past };
  return { from: today, to: addDays(today, 21), label: "앞으로 3주", past };
}

// ───────────────────────── 일정표 ─────────────────────────

const clip = (s: unknown, n: number) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};
const DATED_KINDS = new Set(["시험", "과제", "발표", "공지", "행사", "다음수업", "확인필요", "진도"]);
const ALWAYS_KINDS = new Set(["시험", "발표"]); // 구간 밖이어도 남은 학기 것은 다 보인다

function teamOk(it: Item, team: string | null) {
  if (!it.team || it.team === "전 조") return true;
  return team ? it.team === team : true;
}

export interface Timeline { text: string; itemIds: number[]; win: Win; team: string | null; otherTeamsHidden: number }

export function buildTimeline(p: Pack, q: string, today: string, codes: string[], team: string | null): Timeline {
  const win = timeWindow(q, today);
  const want = (c: string | null) => !codes.length || (c != null && codes.includes(c)) || c == null;
  const cname = (c: string | null) => (c ? p.courseBy.get(c)?.short ?? c : "학사·행사");
  const ids: number[] = [];
  let otherTeamsHidden = 0;
  const line = (it: Item) => {
    ids.push(it.id);
    return `[i${it.id}] ${md(it.date)} ${dday(today, it.date)} · ${cname(it.course)} · ${it.kind}${it.team ? " · " + it.team : ""} · ${clip(it.title, 70)}${it.detail ? " — " + clip(it.detail, 170) : ""}${it.due ? " · 마감·시간 " + clip(it.due, 40) : ""} · 근거: ${clip(it.source, 50)}`;
  };
  const items = p.items.filter((it) => it.course == null || !it.course.startsWith("t1"));
  const pick = (it: Item) => {
    if (!teamOk(it, team)) { otherTeamsHidden++; return false; }
    return want(it.course);
  };
  const up = items
    .filter((it) => it.date && DATED_KINDS.has(it.kind) && it.kind !== "진도" && it.date >= today &&
      ((it.date >= win.from && it.date <= win.to) || ALWAYS_KINDS.has(it.kind)))
    .filter(pick)
    .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : a.id - b.id))
    .slice(0, 34);
  const pastFrom = addDays(today, -win.past);
  const past = items
    .filter((it) => it.date && DATED_KINDS.has(it.kind) && it.date < today && it.date >= pastFrom)
    .filter(pick)
    .sort((a, b) => (a.date! > b.date! ? -1 : 1))
    .slice(0, 12);
  const undated = items.filter((it) => !it.date && (it.kind === "시험" || it.kind === "확인필요" || it.kind === "발표")).filter(pick).slice(0, 8);

  // 다음 수업일 세 번 — 그날 무슨 과목이 몇 교시에, 몇 회차 무슨 주제인지
  const classDays = [...new Set(p.sessions.filter((s) => s.date && s.date >= today).map((s) => s.date!))].sort().slice(0, 3);
  const dayLines = classDays.map((d) => {
    const ss = p.sessions.filter((s) => s.date === d && want(s.course));
    const slotOf = (c: string) => p.items.find((it) => it.kind === "수업" && it.course === c && it.date === d)?.title.replace(/^.*?(\d교시)/, "$1") ?? "";
    const parts = [...new Set(ss.map((s) => s.course))].map((c) => {
      const mine = ss.filter((s) => s.course === c);
      const topic = mine.map((s) => s.topic).filter(Boolean).join(" / ");
      const read = mine.map((s) => s.readings).filter(Boolean).join(" / ");
      return `${cname(c)} ${slotOf(c)} ${mine.map((s) => s.no + "회차").join("·")}${topic ? " — " + clip(topic, 70) : ""}${read ? " · 읽기: " + clip(read, 70) : ""}`;
    });
    return `${md(d)} ${dday(today, d)}: ${parts.join(" ‖ ") || "(이 과목 수업 없음)"}`;
  });

  const text = [
    `<일정표 오늘="${md(today)}" 구간="${win.label} ${md(win.from)}~${md(win.to)}" 내조="${team ?? "모름"}">`,
    `▶ 다가오는 것(날짜순 · D-n 은 오늘 기준)`,
    ...(up.length ? up.map(line) : ["(이 구간에 등록된 일정 없음)"]),
    `▶ 지난 것(최근 ${win.past}일 · 최신순)`,
    ...(past.length ? past.map(line) : ["(없음)"]),
    ...(undated.length ? ["▶ 날짜 미정·확인 중", ...undated.map(line)] : []),
    `▶ 다음 수업일`,
    ...dayLines,
    ...(team && otherTeamsHidden ? [`(다른 조 일정 ${otherTeamsHidden}건은 뺐다)`] : []),
    `</일정표>`,
  ].join("\n");
  return { text, itemIds: ids, win, team, otherTeamsHidden };
}

// ───────────────────────── 합치기 ─────────────────────────

export interface Retrieved {
  pack: Pack;
  today: string;
  codes: string[];
  term1: boolean;
  team: string | null;
  chunks: Chunk[];
  timeline: Timeline | null;
  context: string; // 모델에 넣을 글
  stat: { terms: number; vector: boolean; ms: number };
}

function docLabel(p: Pack, c: Chunk) {
  if (c.kind === "card") return "1학기 이론카드";
  if (c.kind === "emph") return `수업 중 강조(${(c.title.match(/\((강|중|약)\)/) || [, "중"])[1]})`;
  if (c.kind === "item") return "보드 일정·공지";
  const d = c.doc != null ? p.docs[String(c.doc)] : undefined;
  if (!d) return "자료";
  if (/수업기록|수업요약|노션리캡/.test(d.name)) return "수업 기록(학술국 정리)";
  return d.kind;
}

function courseTable(p: Pack, term1: boolean) {
  const rows = p.courses.filter((c) => (term1 ? true : c.term !== "2026-1"));
  return `<과목표>\n${rows.map((c) => `${c.term === "2026-1" ? "1학기" : "2학기"} · ${c.ko}(${c.en}) · ${c.prof} 교수님${c.slot ? " · " + c.slot : ""}`).join("\n")}\n</과목표>`;
}

export async function retrieve(q: string, opts: { team?: string | null; now?: Date } = {}): Promise<Retrieved | null> {
  const t0 = Date.now();
  const [p, qv] = await Promise.all([loadPack(), embed(q)]);
  if (!p) return null;
  const today = seoulToday(opts.now);
  const { codes, term1 } = detectCourses(q);
  const team = detectTeam(q, opts.team ?? null);
  const terms = queryTerms(q);

  const emphQ = EMPH_Q.test(q);
  const rb = ranks(bm25(p, terms), 80);
  const rv = qv ? ranks(cosine(p, qv), 80, 0.75) : new Map<number, number>();
  const fused = new Map<number, number>();
  for (const [i, r] of rb) fused.set(i, (fused.get(i) ?? 0) + 1 / (60 + r));
  for (const [i, r] of rv) fused.set(i, (fused.get(i) ?? 0) + 1 / (60 + r));
  // 질문이 가리키는 과목이면 올리고, 1학기 질문이 아니면 1학기 카드는 내린다
  for (const [i, s] of fused) {
    const c = p.chunks[i];
    let w = 1;
    if (codes.length && c.course && codes.includes(c.course)) w *= 1.8;
    if (codes.length && c.course && !codes.includes(c.course) && c.course !== "t1") w *= 0.7;
    if (c.kind === "card") w *= term1 ? 1.6 : 0.4;
    // 수업 중 강조는 받아쓰기에서 뽑은 신호라 잡음이 있다 — 「뭐가 중요해·시험」류 질문에서만 앞세운다
    if (c.kind === "emph") w *= emphQ ? 1.8 : 0.5;
    if (c.kind === "item" && c.item != null) { const it = p.itemById.get(c.item); if (it && !teamOk(it, team)) w *= 0.3; }
    fused.set(i, s * w);
  }

  const timeline = term1 && codes.every((c) => c.startsWith("t1")) && codes.length ? null : buildTimeline(p, q, today, codes, team);
  const inTimeline = new Set(timeline?.itemIds ?? []);
  const perDoc = new Map<number, number>();
  const picked: Chunk[] = [];
  for (const i of [...fused.keys()].sort((a, b) => fused.get(b)! - fused.get(a)!)) {
    const c = p.chunks[i];
    if (c.kind === "item" && c.item != null && inTimeline.has(c.item)) continue; // 일정표에 이미 있다
    if (c.doc != null) {
      const n = perDoc.get(c.doc) ?? 0;
      if (n >= 3) continue;
      perDoc.set(c.doc, n + 1);
    }
    picked.push(c);
    if (picked.length >= 10) break;
  }
  // 「시험·중요·강조」를 물으면 그 과목의 수업 중 강조를 강 → 약 → 중, 최근 순으로 몇 개 더 붙인다(검색 순위와 별개로)
  if (emphQ && codes.length) {
    const have = new Set(picked.map((c) => c.id));
    const ord = (c: Chunk) => (c.title.includes("(강)") ? 0 : c.title.includes("(약)") ? 1 : 2);
    const more = p.chunks
      .filter((c) => c.kind === "emph" && c.course && codes.includes(c.course) && !have.has(c.id))
      .sort((a, b) => ord(a) - ord(b) || String(b.date).localeCompare(String(a.date)))
      .slice(0, 4);
    picked.push(...more);
  }

  const cname = (c: string | null) => (c ? (c === "t1" ? "1학기" : p.courseBy.get(c)?.ko ?? c) : "공통");
  const ev = picked.map((c) => {
    const d = c.doc != null ? p.docs[String(c.doc)] : undefined;
    const when = c.date ? ` · ${md(c.date)}` : d?.session ? ` · ${d.session}주차` : "";
    return `[c${c.id}] ${cname(c.course)} · ${docLabel(p, c)} · ${clip(c.title, 80)}${when}\n${clip(c.text, 700)}`;
  });

  const hint = codes.length ? codes.map((c) => p.courseBy.get(c)?.ko ?? c).join(", ") : "특정 안 됨";
  const context = [
    `<질문_해석 과목="${hint}" 내조="${team ?? "모름"}" 학기="${term1 ? "1학기 질문" : "2학기"}" 오늘="${md(today)}"/>`,
    courseTable(p, term1),
    timeline?.text ?? "",
    `<검색된_근거 설명="질문과 가까운 조각(낱말+의미 검색). 인용할 때는 [c…] 안쪽 글자를 refs.id 로">`,
    ev.join("\n\n") || "(가까운 조각 없음)",
    `</검색된_근거>`,
  ].filter(Boolean).join("\n");

  return { pack: p, today, codes, term1, team, chunks: picked, timeline, context, stat: { terms: terms.length, vector: !!qv, ms: Date.now() - t0 } };
}

// ───────────────────────── 모델이 고른 근거 → 화면에 띄울 근거 ─────────────────────────

export interface Ref {
  id: string;
  type: "page" | "item" | "card" | "emph";
  course: string | null;
  courseKo: string;
  label: string;          // 강의안 · 과제 · 수업 기록 · 보드 일정 · 1학기 이론카드
  title: string;          // 파일 이름 · 일정 제목 · 카드 제목
  page: number | null;
  doc: number | null;
  ext: string | null;
  where: string;          // 러너스·자료실 폴더(마지막 두 단계)
  date: string | null;
  quote: string;          // 모델이 옮긴 문구
  quoteOk: boolean;       // 그 문구가 원문에 정말 있는가
  excerpt: string;        // 문구 주변 원문(없으면 조각 앞부분)
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export function resolveRefs(r: Retrieved, refs: { id: string; quote: string }[]): Ref[] {
  const p = r.pack;
  const out: Ref[] = [];
  const seen = new Set<string>();
  for (const raw of refs) {
    const id = String(raw.id || "").trim().replace(/^\[|\]$/g, "");
    if (seen.has(id)) continue;
    seen.add(id);
    const quote = clip(raw.quote, 60);
    if (/^i\d+$/.test(id)) {
      const it = p.itemById.get(Number(id.slice(1)));
      if (!it) continue;
      const hay = `${it.title} ${it.detail} ${it.due}`;
      out.push({
        id, type: "item", course: it.course, courseKo: it.course ? p.courseBy.get(it.course)?.ko ?? it.course : "공통",
        label: "보드 일정·공지", title: it.title, page: null, doc: null, ext: null, where: it.source, date: it.date,
        quote, quoteOk: !!quote && squash(hay).includes(squash(quote)), excerpt: clip(it.detail || it.title, 240),
      });
      continue;
    }
    const c = /^c\d+$/.test(id) ? p.chunkById.get(Number(id.slice(1))) : undefined;
    if (!c) continue;
    const d = c.doc != null ? p.docs[String(c.doc)] : undefined;
    const ok = !!quote && c.flat.includes(squash(quote));
    let excerpt = clip(c.text, 240);
    if (ok) {
      // 공백을 뺀 글자 위치 → 원문 위치 표를 만들어, 문구 앞뒤를 조금 붙여 보여 준다
      const plain = c.text.replace(/\s+/g, " ");
      const pos: number[] = [];
      let sq = "";
      for (let i = 0; i < plain.length; i++) if (plain[i] !== " ") { pos.push(i); sq += plain[i].toLowerCase(); }
      const at = sq.indexOf(squash(quote));
      if (at >= 0) {
        const k = pos[at];
        excerpt = (k > 80 ? "…" : "") + plain.slice(Math.max(0, k - 80), k + 170) + (k + 170 < plain.length ? "…" : "");
      }
    }
    out.push({
      id, type: c.kind, course: c.course, courseKo: c.course === "t1" ? "1학기" : c.course ? p.courseBy.get(c.course)?.ko ?? c.course : "공통",
      label: docLabel(p, c), title: d ? d.name : c.title, page: c.page, doc: c.doc, ext: d?.ext ?? null,
      where: d?.where ?? c.src, date: c.date ?? d?.date ?? null, quote, quoteOk: ok, excerpt,
    });
  }
  return out.slice(0, 5);
}
