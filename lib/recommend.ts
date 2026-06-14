import type { Card, Domain, Industry } from "./types";
import { UNIVERSAL, COURSE_SHORT } from "./manifest";
import aliasesJson from "@/data/aliases.json";
import neighborsJson from "@/data/neighbors.json";

// 오프라인 사전 계산된 카드별 검색 별칭.
// 구조: { "card-id": ["별칭1", "별칭2", ...], "_meta": {...} }
// _meta 키는 매칭에서 제외.
const ALIASES = aliasesJson as Record<string, unknown>;

// 오프라인 의미 이웃 그래프 — { "card-id": ["이웃카드id", ...] } (의미 유사 top-N).
// 키워드가 안 겹쳐도 개념적으로 가까운 카드를 끌어오는 데 사용(시맨틱 리콜).
const NEIGHBORS = neighborsJson as unknown as Record<string, string[]>;

export interface RecommendResult {
  ids: string[];               // 핵심 추천 3장
  reason: string;              // 왜 이 3장을 골랐는지 (확장 경로 포함)
  expansions: string[];        // "승진" → 펼쳐진 관련 개념들
  relatedIds: string[];        // 4~8위 — "혹시 이런 카드도?" 칩으로 노출
  inferredDomain?: Domain;     // 쿼리에서 추론한 도메인 (UI 뱃지용)
  evidence?: Record<string, string>; // 카드별 '왜 골랐는지' 한 줄 근거
  mode?: "keyword" | "semantic"; // 어떤 엔진이 쓰였는지
  diagnosis?: Diagnosis;       // AI 정밀검색일 때, 카드 위에 펼치는 '두 번째 뇌의 진단'
}

export interface Diagnosis {
  lens: string;       // "조직·HR · 동기부여" (도메인 · 핵심개념)
  body: string;       // 질문을 해석한 한두 문장
  confidence?: number; // 의미 일치 % (시맨틱일 때)
}

// 오프라인 합성 진단 — 런타임 LLM 없이, 임베딩/키워드가 고른 1위 카드의
// 도메인·개념·30초결론을 사용자 질문과 엮어 'AI 큐레이션'처럼 보이게 한다.
export function buildDiagnosis(
  query: string,
  domain: Domain | undefined,
  topCard: Card | undefined,
  confidence?: number
): Diagnosis | undefined {
  if (!topCard) return undefined;
  const concept = topCard.concept;
  const lens = domain ? `${domain} · ${concept}` : concept;
  const decision = norm0(topCard.decision);
  const insight = norm0(topCard.insight);
  const q = query.trim().replace(/\s+/g, " ");
  const essence = decision || insight;
  // 진단 문장과 처방(한 줄로 →)을 줄바꿈으로 분리 → 한 줄로 길게 늘어지지 않고 가독성↑.
  // (.aid-body에 white-space:pre-line 적용되어 \n이 실제 줄바꿈으로 렌더됨)
  const body =
    `‘${q}’ — 두 번째 뇌는 이 고민을 「${concept}」 개념과 가장 가깝게 봤어요.` +
    (essence ? `\n\n한 줄로 →\n${essence}` : "");
  return { lens, body, confidence };
}

function norm0(s: string | undefined): string {
  return String(s || "").replace(/\*/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
}

// 결과 다양성 — 상위 N장이 한 과목에 쏠리지 않게(과목당 최대 cap장) 재배치.
// 후보가 모자라면(예: 다 같은 과목) 남은 것으로 채운다.
export function diversifyByCourse<T extends { id: string }>(
  items: T[],
  courseOf: (id: string) => string | undefined,
  n: number,
  capPerCourse: number
): T[] {
  const out: T[] = [];
  const count: Record<string, number> = {};
  const skipped: T[] = [];
  for (const it of items) {
    if (out.length >= n) break;
    const c = courseOf(it.id) || "?";
    if ((count[c] || 0) < capPerCourse) {
      out.push(it);
      count[c] = (count[c] || 0) + 1;
    } else {
      skipped.push(it);
    }
  }
  for (const it of skipped) {
    if (out.length >= n) break;
    out.push(it);
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────
// 한국어 비즈니스/경영 개념 동의어·관련어 사전.
// 사용자가 "승진"만 쳐도 → 인사평가·리더십·약한연결 카드까지 끌어오기 위함.
// Phase 2(임베딩)에서 더 부드러워질 예정이지만, Phase 1 키워드 매칭의 한계를 메운다.
// ────────────────────────────────────────────────────────────────────
const CONCEPT_MAP: Record<string, string[]> = {
  // 조직·HR
  "승진": ["인사평가", "성과평가", "후계자", "발탁", "리더십", "약한 연결", "네트워크", "고성과", "권한", "발령"],
  "발탁": ["승진", "후계자", "인사", "발령"],
  "인사": ["인사평가", "성과평가", "면담", "승진", "채용", "조직", "HR"],
  "이직": ["퇴사", "유출", "이탈", "리텐션", "유지", "터노버", "사직"],
  "퇴사": ["이직", "유출", "리텐션", "사직", "이탈"],
  "리텐션": ["유지", "이직", "퇴사", "이탈"],
  "채용": ["영입", "스카우트", "헤드헌팅", "신규", "외부 영입", "내부 승진"],
  "영입": ["채용", "스카우트", "외부", "이적"],
  "성과급": ["보상", "인센티브", "연봉", "공정성", "동기"],
  "보상": ["성과급", "인센티브", "연봉", "급여"],
  "동기": ["동기부여", "사기", "허즈버그", "위생요인", "동기요인", "인정", "성취"],
  "동기부여": ["동기", "사기", "허즈버그", "인정", "성취"],
  "사기": ["동기", "동기부여", "분위기", "조직문화", "morale"],
  "조직문화": ["문화", "에토스", "분위기", "팀워크", "협력", "톤"],
  "리더십": ["영향력", "권한", "지휘", "리더", "임원", "팔로워십"],
  "팔로워십": ["리더십", "영향력", "조직"],
  "평가": ["인사평가", "성과평가", "360", "면담", "피드백"],
  "면담": ["피드백", "평가", "1on1", "원온원", "코칭"],
  "피드백": ["면담", "평가", "코칭", "솔직함"],
  "갈등": ["충돌", "마찰", "분쟁", "파벌", "정치"],
  "정치": ["사내정치", "권력", "파벌", "라인"],
  "권한위임": ["임파워먼트", "위임", "자율", "마이크로매니징"],
  "마이크로매니징": ["권한위임", "위임", "통제"],
  "다양성": ["편견", "무의식", "blind", "공정"],
  "편견": ["다양성", "무의식", "bias", "공정"],

  // 마케팅
  "가격": ["프라이싱", "할인", "프로모션", "탄력성", "마진", "pricing"],
  "할인": ["프로모션", "가격", "이벤트", "세일", "탄력성"],
  "프로모션": ["할인", "가격", "이벤트", "캠페인"],
  "광고": ["마케팅", "프로모션", "캠페인", "브랜딩"],
  "브랜드": ["브랜딩", "포지셔닝", "아이덴티티", "이미지", "에쿼티"],
  "포지셔닝": ["STP", "세분화", "타겟팅", "브랜드", "차별화"],
  "타겟팅": ["세분화", "STP", "포지셔닝", "고객", "타겟"],
  "세분화": ["STP", "타겟팅", "포지셔닝", "클러스터링", "segmentation"],
  "고객": ["타겟", "사용자", "유저", "소비자", "구매자", "고객여정"],
  "이탈": ["churn", "리텐션", "이직", "퇴사"],

  // 재무·회계
  "현금": ["현금흐름", "유동성", "CF", "운전자본", "캐시플로", "cash"],
  "현금흐름": ["현금", "유동성", "CF", "운전자본"],
  "매출": ["탑라인", "revenue", "성장", "매출액", "리벤뉴", "top line"],
  "이익": ["수익", "마진", "영업이익", "순이익", "bottom line"],
  "운전자본": ["working capital", "CCC", "재고", "매출채권", "회전일수"],
  "비용": ["원가", "코스트", "비용절감", "비용구조"],
  "재무제표": ["BS", "PL", "CF", "손익", "재무", "회계"],
  "감사": ["회계", "내부통제", "윤리", "내부고발", "컴플라이언스"],

  // 운영·SCM
  "재고": ["재고관리", "newsvendor", "신문판매원", "수요예측", "발주", "inventory"],
  "수요": ["수요예측", "수요계획", "발주", "재고", "forecast"],
  "공급망": ["SCM", "공급사슬", "리드타임", "조달", "supply chain"],
  "예측": ["forecast", "예측모델", "수요예측"],
  "리드타임": ["공급망", "조달", "SCM"],
  "발주": ["수요예측", "재고", "신문판매원", "MOQ"],

  // 데이터·AI
  "AI": ["인공지능", "머신러닝", "딥러닝", "예측모델", "ML"],
  "인공지능": ["AI", "머신러닝", "딥러닝", "ML"],
  "데이터": ["분석", "애널리틱스", "인사이트", "지표", "metrics"],
  "분석": ["애널리틱스", "데이터", "지표", "리포팅"],
  "지표": ["KPI", "메트릭", "데이터", "측정"],

  // 윤리·거버넌스
  "윤리": ["컴플라이언스", "준법", "지배구조", "내부고발", "투명성"],
  "내부고발": ["whistleblowing", "윤리", "보호", "신고", "투명성"],
  "지배구조": ["거버넌스", "이사회", "윤리", "투명성"],

  // C레벨 일반
  "회의": ["임원회의", "이사회", "보고", "프레젠테이션"],
  "보고": ["임원보고", "리포팅", "프레젠테이션", "회의"],
  "결정": ["의사결정", "선택", "트레이드오프", "판단"],
  "의사결정": ["결정", "선택", "트레이드오프"],
  "성장": ["매출성장", "확장", "스케일업", "톱라인"],
  "위기": ["위기관리", "리스크", "이슈", "사건"],
  "리스크": ["위기", "위험", "리스크관리", "헷지"],
  "전략": ["포지셔닝", "차별화", "경쟁우위", "비전"],
  "혁신": ["innovation", "디스럽션", "신사업", "R&D"],
};

// 도메인 추론 힌트 — 쿼리가 어느 도메인에 속하는지 점수로 판단.
const DOMAIN_HINTS: Record<Domain, string[]> = {
  "전략": ["전략", "포지셔닝", "경쟁", "차별화", "성장", "비전", "M&A"],
  "마케팅": ["마케팅", "광고", "브랜드", "가격", "고객", "STP", "타겟", "세분화", "포지셔닝", "프로모션"],
  "운영·SCM": ["운영", "재고", "공급망", "물류", "발주", "신문판매원", "리드타임", "조달", "생산"],
  "재무·회계": ["재무", "회계", "현금", "매출", "이익", "운전자본", "예산", "재무제표", "감사", "원가", "BS", "PL", "CF"],
  "조직·HR": ["조직", "HR", "인사", "승진", "이직", "퇴사", "채용", "리더십", "동기", "사기", "성과급", "면담", "갈등", "문화", "팀", "평가", "다양성", "편견"],
  "데이터·AI": ["데이터", "분석", "AI", "예측", "머신러닝", "지표", "KPI", "딥러닝"],
  "윤리·거버넌스": ["윤리", "준법", "컴플라이언스", "지배구조", "내부고발", "투명성", "감사"],
};

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

// 한글 IME가 NFD(자모 분리)로 입력할 때 .includes() 실패 방지.
function norm(s: string): string {
  return s.normalize("NFC").toLowerCase();
}

interface Expansion {
  tokens: string[];      // 매칭에 쓸 모든 토큰 (원본 + 확장)
  expansions: string[];  // 사용자에게 보여줄 "이렇게 확장했어" 목록
}

function expand(query: string): Expansion {
  const baseTokens = query
    .split(/[\s.,?!·…\-\/]+/)
    .filter((t) => t.length >= 2)
    .map(norm);
  const expansions = new Set<string>();

  baseTokens.forEach((t) => {
    Object.entries(CONCEPT_MAP).forEach(([key, syns]) => {
      const nkey = norm(key);
      const matched =
        t.includes(nkey) ||
        nkey.includes(t) ||
        syns.some((s) => {
          const ns = norm(s);
          return ns === t || t.includes(ns) || ns.includes(t);
        });
      if (matched) {
        expansions.add(key);
        syns.forEach((s) => expansions.add(s));
      }
    });
  });

  const all = new Set<string>([...baseTokens, ...Array.from(expansions).map(norm)]);
  return {
    tokens: Array.from(all),
    expansions: Array.from(expansions),
  };
}

function inferDomain(query: string): Domain | undefined {
  const q = norm(query);
  let bestDom: Domain | undefined;
  let bestScore = 0;
  (Object.entries(DOMAIN_HINTS) as [Domain, string[]][]).forEach(([dom, hints]) => {
    const score = hints.reduce((acc, h) => (q.includes(norm(h)) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      bestDom = dom;
    }
  });
  return bestDom;
}

// ────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────
export function recommendCards(
  problem: string,
  cards: Card[],
  myIndustries: Industry[] = []
): RecommendResult {
  const { tokens, expansions } = expand(problem);
  const inferredDomain = inferDomain(problem);

  const scored = cards.map((c) => {
    // 오프라인 별칭 — 사용자의 비유적/구어체 질문이 이 별칭과 매칭되도록.
    const aliasRaw = ALIASES[c.id];
    const aliasText = Array.isArray(aliasRaw)
      ? (aliasRaw as string[]).join(" ")
      : "";

    // 필드별 가중치 — 제목·요지·별칭이 본문보다 중요.
    const fields: { text: string | undefined; w: number }[] = [
      { text: c.hook, w: 4 },
      { text: c.concept, w: 3 },
      { text: aliasText, w: 3 },          // ★ 오프라인 사전 계산 별칭 (의미 매칭의 핵심)
      { text: c.insight, w: 2 },
      { text: c.application, w: 2 },
      { text: c.decision, w: 2 },
      { text: c.problem_scene, w: 1.5 },
      { text: c.case_title, w: 1.5 },
      { text: c.quote, w: 1 },
      { text: (c.checklist || []).join(" "), w: 1 },
      { text: c.case_body, w: 0.5 },
      // ★ 메타 매칭 — "경영과학", "마케팅", "제약" 같은 과목/산업 단어 한 방으로도 걸리게
      { text: COURSE_SHORT[c.course], w: 3 },              // 과목 약칭(경영과학·마케팅·회계…)
      { text: c.course, w: 1.5 },                          // 영문 과목명
      { text: (c.domain || []).join(" "), w: 2 },          // 도메인(마케팅·재무·회계…)
      { text: (c.industry || []).join(" "), w: 2 },        // 산업(제약·바이오·헬스케어…)
      { text: c.professor || "", w: 1 },                   // 교수명
      // ★ 케이스 카드 — 발표 조 이름("2조"·"NEW 2조"·"5조")·뱃지로 자기 발표를 바로 찾게
      { text: c._badge || "", w: 4 },                      // "NEW 2조 · 오홍석" (조 이름+교수)
      { text: c.author || "", w: 2 },                      // sourceGroup(케이스) / "버드"(일반)
    ];

    let s = 0;
    fields.forEach(({ text, w }) => {
      if (!text) return;
      const t = norm(text);
      tokens.forEach((tok) => {
        if (t.includes(tok)) s += w;
      });
    });

    // 도메인 가중치 — 추론된 도메인과 카드 도메인이 일치하면 +3
    if (inferredDomain && (c.domain || []).includes(inferredDomain)) {
      s += 3;
    }

    // 내 산업 가중치 — 핵심. 같은 산업이면 +2, 범용 카드는 +0.5(어디서나 통하니까).
    if (myIndustries.length > 0) {
      const iOverlap = (c.industry || []).filter(
        (i) => i !== UNIVERSAL && myIndustries.includes(i)
      ).length;
      s += iOverlap * 2;
      if ((c.industry || []).includes(UNIVERSAL)) s += 0.5;
    }

    return { id: c.id, s };
  });

  // ── 의미 이웃 재랭킹(그래프 확산) ──
  // 키워드로 잘 맞은 카드의 '의미 이웃'에 점수를 번지게 한다 → 키워드가 안 겹쳐도
  // 개념적으로 가까운 카드가 후보에 오른다(오프라인 그래프, 추가 다운로드 0).
  const base = new Map(scored.map((x) => [x.id, x.s]));
  const boost = new Map<string, number>();
  scored.forEach(({ id, s }) => {
    if (s <= 0) return;
    const ns = NEIGHBORS[id] || [];
    ns.slice(0, 6).forEach((nid, idx) => {
      if (!base.has(nid)) return;
      const w = s * 0.22 * (1 - idx * 0.12); // 가까운 이웃일수록 강하게, 감쇠
      boost.set(nid, (boost.get(nid) || 0) + Math.max(0, w));
    });
  });
  const diffused = scored.map((x) => ({
    id: x.id,
    s: x.s + (boost.get(x.id) || 0),
  }));

  diffused.sort((a, b) => b.s - a.s);
  const scoredFinal = diffused;
  const matched = scoredFinal.filter((x) => x.s > 0);
  const pool = matched.length > 0 ? matched : scoredFinal;

  // 결과 다양성 — 상위 3장이 한 과목에 쏠리지 않게(과목당 최대 2).
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const courseOf = (id: string) => cardById.get(id)?.course as string | undefined;
  const top = diversifyByCourse(pool, courseOf, 3, 2);
  const usedTop = new Set(top.map((x) => x.id));
  const related = pool.filter((x) => !usedTop.has(x.id)).slice(0, 5);

  // 카드별 근거 — '왜 이 카드?' 한 줄.
  const evidence: Record<string, string> = {};
  for (const t of top) {
    const c = cardById.get(t.id);
    if (c) evidence[t.id] = keywordEvidence(c, tokens, inferredDomain, myIndustries);
  }

  // 이유 작성
  const topScore = top[0]?.s ?? 0;
  const reason = buildReason({
    raw: problem.trim(),
    expansions,
    inferredDomain,
    myIndustries,
    matched: topScore,
  });

  // 키워드 모드에서도 '두 번째 뇌의 진단'을 띄운다(1위 카드가 실제로 매칭됐을 때만).
  // confidence(의미 근접도 %)는 임베딩 전용이므로 키워드 모드에선 생략 → % 미표시.
  const topCard = topScore > 0 ? cardById.get(top[0].id) : undefined;
  const diagnosis = topScore > 0 ? buildDiagnosis(problem, inferredDomain, topCard) : undefined;

  return {
    ids: top.map((x) => x.id),
    reason,
    expansions: expansions.slice(0, 6),
    relatedIds: related.map((x) => x.id),
    inferredDomain,
    evidence,
    mode: "keyword",
    diagnosis,
  };
}

// 키워드 경로 근거 — 어떤 말이 어디서 걸렸는지 한 줄.
function keywordEvidence(
  card: Card,
  tokens: string[],
  inferredDomain: Domain | undefined,
  myIndustries: Industry[]
): string {
  const aliasRaw = ALIASES[card.id];
  const aliasText = Array.isArray(aliasRaw) ? (aliasRaw as string[]).join(" ") : "";
  const hay = norm([card.hook, card.concept, aliasText].join(" "));
  const hits: string[] = [];
  for (const tok of tokens) {
    if (tok.length >= 2 && hay.includes(tok) && !hits.includes(tok)) hits.push(tok);
    if (hits.length >= 2) break;
  }
  const parts: string[] = [];
  if (hits.length) parts.push(`'${hits.join("·")}' 매칭`);
  if (inferredDomain && (card.domain || []).includes(inferredDomain))
    parts.push(`${inferredDomain} 영역`);
  if (
    myIndustries.length &&
    (card.industry || []).some((i) => i !== UNIVERSAL && myIndustries.includes(i))
  )
    parts.push("내 산업 적합");
  if (!parts.length) parts.push("의미 이웃·관련도 상위");
  return parts.join(" · ");
}

function buildReason(args: {
  raw: string;
  expansions: string[];
  inferredDomain?: Domain;
  myIndustries: Industry[];
  matched: number;
}): string {
  const { raw, expansions, inferredDomain, myIndustries, matched } = args;

  if (matched === 0) {
    return `'${raw}'와 직접 매칭되는 카드가 적어요. 도메인·산업 가중치로 후보를 추렸으니, 좀 더 구체적으로 적어주시면 정확해집니다.`;
  }

  const parts: string[] = [];
  if (expansions.length > 0) {
    const sample = expansions.slice(0, 3).join(" · ");
    parts.push(`'${raw}'를 관련 개념(${sample})까지 확장`);
  } else {
    parts.push(`키워드 '${raw}'`);
  }
  if (inferredDomain) parts.push(`도메인 '${inferredDomain}' 가중`);
  if (myIndustries.length > 0) parts.push(`내 산업(${myIndustries[0]}) 가중`);

  return parts.join(" + ") + "으로 가장 가까운 3장을 골랐습니다.";
}
