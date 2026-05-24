export type Course =
  | "Business Economics"
  | "Business Analytics"
  | "Managing People & Org"
  | "Business Ethics"
  | "Management Science"
  | "Marketing Management"
  | "Financial Accounting";

export type Domain =
  | "전략"
  | "마케팅"
  | "운영·SCM"
  | "재무·회계"
  | "조직·HR"
  | "데이터·AI"
  | "윤리·거버넌스";

export type Industry =
  | "전자·반도체·하드웨어"
  | "소비재·식품·F&B·유통"
  | "IT·소프트웨어·플랫폼"
  | "제조·산업재·소재"
  | "제약·바이오·헬스케어"
  | "미디어·콘텐츠·게임·광고"
  | "패션·뷰티·라이프스타일"
  | "여행·관광·레저·문화"
  | "금융·핀테크"
  | "건설·부동산"
  | "물류·운송·SCM"
  | "전문서비스·컨설팅"
  | "범용(전 산업)";

export type SourceType =
  | "paper"     // 학술 논문
  | "book"      // 단행본
  | "case"      // HBS·HKS 등 케이스
  | "theory"    // 이론·프레임 (저자명 + 연도)
  | "lecture"   // EMBA 강의안 (NAS 원본)
  | "event";    // 실제 회사·사건

export interface SourceRef {
  type: SourceType;
  label: string;       // 표시용 한 줄 (저자·연도·매체·회사명 등)
  year?: number;       // 정렬·필터용
}

export interface Card {
  id: string;
  course: Course;
  professor?: string;
  term: string;
  week: number | null;
  hook: string;
  concept: string;
  insight: string;
  application: string;
  problem_scene: string;
  decision: string;
  quote: string;
  checklist: string[];
  case_title: string;
  case_body: string;
  domain: Domain[];
  industry: Industry[];
  sources?: SourceRef[];   // 학술/수업/실무 원천 — STEP 3 하단에 노출
  author: string;
  created_at: string;
  updated_at?: string;
}

export interface OwnerPainCategory {
  cat: string;
  catE: string;
  color: string;
  items: string[];
}

export type ThemeKey =
  | "duotone"
  | "white"
  | "papergrey"
  | "newspaper"
  | "sage"
  | "bauhaus"
  | "midnight"
  | "claudewarm"
  | "monochrome"
  | "dawn"
  | "mist";

export type FontKey =
  | "editorial"
  | "classic"
  | "modern"
  | "display"
  | "cormorant"
  | "allsans";

export type Density = "compact" | "regular" | "airy";

export interface TweakState {
  theme: ThemeKey;
  font: FontKey;
  quoteCards: boolean;
  density: Density;
}

export interface FilterState {
  course: Course[];
  domain: Domain[];
  industry: Industry[];
  search: string;
  myOnly: boolean;
  savedOnly: boolean;
}
