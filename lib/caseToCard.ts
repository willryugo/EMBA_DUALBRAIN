import type { Card, Course, Domain, Industry, TeamCase } from "@/lib/types";

// TeamCase → Card 런타임 변환 — 데스크톱(DualBrainApp)·모바일(MobileApp) 공용.
// 카드 그리드/검색/모달 통합 + 홈 카드 미니 프리뷰(_metric·_spark) 계산.
export function caseToCard(tc: TeamCase): Card {
  const NORM: Record<string, Course> = {
    "Managing People & Organizations": "Managing People & Org",
  };
  const courseNorm: Course = NORM[tc.course as string] ?? (tc.course as Course);
  const si = tc.subjectIndustry ?? "";
  let industry: Industry[] = [];
  const has = (...ks: string[]) => ks.some((k) => si.includes(k));
  if (has("금융", "투자", "은행", "핀테크", "회계감사", "정책금융")) industry = ["금융·핀테크"];
  else if (has("반도체", "하이테크", "GPS", "전자", "가전", "하드웨어", "메모리", "HBM")) industry = ["전자·반도체·하드웨어"];
  else if (has("제약", "바이오", "헬스", "의료기기", "분유", "영유아", "임플란트")) industry = ["제약·바이오·헬스케어"];
  else if (has("물류", "3PL", "운송", "SCM", "택배")) industry = ["물류·운송·SCM"];
  else if (has("게임")) industry = ["미디어·콘텐츠·게임·광고"];
  else if (has("광고", "미디어", "콘텐츠", "엔터")) industry = ["미디어·콘텐츠·게임·광고"];
  else if (has("럭셔리", "패션", "뷰티", "의류", "라이프스타일")) industry = ["패션·뷰티·라이프스타일"];
  else if (has("여행", "관광", "OTA", "레저", "호텔")) industry = ["여행·관광·레저·문화"];
  else if (has("건설", "부동산", "재개발", "철거", "인테리어")) industry = ["건설·부동산"];
  else if (has("자동차", "제조", "산업재", "소재")) industry = ["제조·산업재·소재"];
  else if (has("이커머스", "유통", "외식", "식음료", "음료", "식품", "소비재", "F&B", "FMCG", "커피", "유가공")) industry = ["소비재·식품·F&B·유통"];
  else if (has("IT", "소프트웨어", "SaaS", "플랫폼", "SI", "메시징")) industry = ["IT·소프트웨어·플랫폼"];
  const COURSE_DOMAIN_MAP: Partial<Record<Course, Domain>> = {
    "Managing People & Org": "조직·HR",
    "Management Science": "운영·SCM",
    "Business Ethics": "윤리·거버넌스",
    "Marketing Management": "마케팅",
    "Business Analytics": "데이터·AI",
    "Business Economics": "전략",
    "Financial Accounting": "재무·회계",
  };
  const domain: Domain[] = COURSE_DOMAIN_MAP[courseNorm] ? [COURSE_DOMAIN_MAP[courseNorm]!] : [];

  // ── 홈 카드 미니 프리뷰 — 케이스의 가장 극적인 수치 + 스파크라인 ──
  const allVis = [tc.visual, ...(tc.visuals || [])].filter(Boolean) as NonNullable<TeamCase["visual"]>[];
  const deltaVis = allVis.find((v) => v.deltas && v.deltas.length > 0);
  let _metric: Card["_metric"];
  if (deltaVis?.deltas?.[0]) {
    const d = deltaVis.deltas[0];
    _metric = { label: d.label, from: d.from, to: d.to, tone: d.tone };
  } else if (tc.keyFacts?.[0]) {
    _metric = { label: tc.keyFacts[0].label, to: tc.keyFacts[0].value };
  }
  const barVis = allVis.find((v) => v.bars && v.bars.length > 0);
  const portVis = allVis.find((v) => v.kind === "rnd-portfolio" && v.projects?.length);
  const _spark = barVis?.bars
    ? barVis.bars.map((b) => b.value)
    : portVis?.projects
    ? portVis.projects.map((p) => p.ev)
    : undefined;

  return {
    id: `case-card-${tc.id}`,
    _metric,
    _spark,
    course: courseNorm,
    professor: tc.professor,
    term: tc.term,
    week: null,
    hook: tc.subtitle,
    concept: tc.title,
    insight: tc.surface.slice(0, 120) + (tc.surface.length > 120 ? "…" : ""),
    application: tc.paradigm.new,
    problem_scene: tc.surface,
    decision: tc.paradigm.reading,
    quote: tc.paradigm.question,
    checklist: [],
    case_title: tc.subject,
    case_body: tc.ourTake,
    domain,
    industry,
    author: tc.sourceGroup,
    created_at: tc.term,
    _badge: `${tc.sourceGroup} · ${tc.professor ?? ""}`.replace(/ · $/, ""),
  };
}

// 케이스 id(case-card-<id>) ↔ 원본 케이스 id 변환 헬퍼
export const CASE_CARD_PREFIX = "case-card-";
export const isCaseCardId = (id: string) => id.startsWith(CASE_CARD_PREFIX);
export const toCaseId = (cardId: string) => cardId.replace(CASE_CARD_PREFIX, "");
