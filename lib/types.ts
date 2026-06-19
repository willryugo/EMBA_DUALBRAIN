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
  _badge?: string;  // 케이스 카드: "NEW 2조 · 조직행동론" 형태 뱃지
  _metric?: { label: string; from?: string; to: string; tone?: "good" | "bad" | "neutral" }; // 케이스 카드 홈 프리뷰 핵심 수치
  _spark?: number[]; // 케이스 카드 미니 스파크라인 (막대 비주얼에서)
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

// ── 레벨2: 실증 케이스 레이어 (cases.json) ─────────────────
// 과제(표면) → 강의 뿌리(roots) → 패러다임 렌즈(paradigm) → 17기 해석(ourTake)
export interface CaseParadigm {
  old: string;        // 옛 패러다임(잭웰치式) 해석
  new: string;        // 새 패러다임 해석
  question: string;   // 핵심 질문
  reading: string;    // "누가 맞냐가 아니라 지금 세상에 맞는 해석이냐"
}

export interface CaseRoots {
  lectures: string[]; // lectures.json id — 이 케이스를 고민하게 된 강의
  sources: string[];  // cases.json _meta.sourceFiles 키 — 원문 근거
}

// ── deep 케이스 심화 필드 (원문·PPT·강의 풀활용) ──────────
export interface CaseCharacter { name: string; role: string; note: string; }
export interface CaseFact { label: string; value: string; }      // 핵심 숫자/사실
export interface CaseTheoryApp { lectureId: string; concept: string; how: string; } // 강의 이론별 적용
export interface CaseParadigmAxis { label: string; old: string; new: string; }      // 다축 패러다임
export interface CaseDebateSide { stance: string; points: string[]; }               // 찬반 한쪽
export interface CaseQuote { text: string; by: string; }                            // 원문 인용

// ── 케이스 비주얼 (한눈에 — 텍스트보다 그림 먼저) ──────────
export interface CaseVisualProject {
  id: string; name: string;
  cost: number; prob: number; revenue: number; ev: number;  // 억원·%
  pick: boolean;                                            // 최적해 선택 여부
}
export interface CaseVisualCombo { label: string; ev: number; cost: number; optimal?: boolean; }
export interface CaseVisualBar { label: string; value: number; max?: number; tone?: "good" | "bad" | "neutral"; note?: string; }
export interface CaseConstraint { label: string; check: string; ok: boolean; } // 제약조건 통과 여부

// ── 히어로 장면 비주얼 (PPT 주요 장면 재현) ──────────────────
export interface CaseTimelineEvent { date: string; title: string; desc?: string; tone?: "good" | "bad" | "neutral"; } // 사건 전개
export interface CaseStatDelta { label: string; from: string; to: string; tone?: "good" | "bad" | "neutral"; }       // 극적 수치 변화 from→to
export interface CasePersona { name: string; tag?: string; strength?: string; risk?: string; pick?: boolean; }        // 인물·후보·렌즈 카드
export interface CaseForkOption { label: string; sub?: string; chosen?: boolean; }                                    // 갈림길 선택지

// ── 5why 사다리 (T타임즈式 — 쉽게 보는 메인 뷰) ──────────
export interface CaseJourneyStep { n: number; why: string; because: string; keyword: string; }
export interface CaseJourney {
  symptom: string;       // 증상 한 줄 (호기심 유발)
  symptomSub?: string;
  steps: CaseJourneyStep[];   // 왜? → because (보통 5단계)
  result: string;        // 근본 통찰 한 줄
}
export type CaseStepKey = "surface" | "roots" | "paradigm" | "take" | "connect";
export interface CaseVisual {
  kind:
    | "rnd-portfolio"
    | "score-bars"
    | "compare-bars"
    | "constraint-check"
    | "timeline"        // 사건 전개 타임라인
    | "stat-delta"      // 극적 수치 변화 (from→to 큰 숫자)
    | "persona-grid"    // 인물·후보·렌즈 비교 카드
    | "fork"            // 갈림길 (양자택일)
    | "cycle";          // 악순환/선순환 루프 (구조적 반복)
  step?: CaseStepKey;      // 어느 단계에 그릴지 (없으면 surface)
  headline?: string;       // 비주얼이 말하는 한 줄
  projects?: CaseVisualProject[];   // rnd-portfolio
  combos?: CaseVisualCombo[];       // rnd-portfolio
  bars?: CaseVisualBar[];           // score-bars / compare-bars
  constraints?: CaseConstraint[];   // constraint-check
  verdict?: string;                 // constraint-check 결론 한 줄
  events?: CaseTimelineEvent[];     // timeline
  deltas?: CaseStatDelta[];         // stat-delta
  personas?: CasePersona[];         // persona-grid
  forkQuestion?: string;            // fork — 가운데 질문
  options?: CaseForkOption[];       // fork — 좌우 선택지
  cycleKind?: "vicious" | "virtuous"; // cycle — 악순환/선순환
  steps2?: CaseCycleStep[];         // cycle — 루프 단계 (closes back to first)
  cycleBreak?: string;              // cycle — 고리를 끊는 지점 한 줄
}

export interface CaseCycleStep { label: string; note?: string; } // cycle 단계 노드

export interface TeamCase {
  id: string;
  depth: "deep" | "pin";
  title: string;
  subtitle: string;             // 후킹 부제
  course: Course;
  professor?: string;
  sourceGroup: string;          // 발표 출처 (예: "NEW 2조") — subject와 별개 축
  term: string;
  subjectType: "hbs" | "public" | "member"; // member는 산업만·이름 익명
  subject: string;              // 사례 주인공 (기업/페르소나)
  subjectIndustry: string;
  roots: CaseRoots;             // 강의 뿌리 + 원문 근거
  surface: string;              // 과제 개요
  paradigm: CaseParadigm;
  ourTake: string;              // PPT 발표 결론에서 추출
  ourTakeExtra?: string;        // 수달님 그날 토론 논점 보강 슬롯
  discussion?: string[];
  cardLinks: string[];          // 연결 이론 카드 (cards.json id)
  tags?: string[];

  // ── deep 케이스 심화(선택) — 있으면 모달이 풍부하게 렌더 ──
  background?: string;                    // 회사·맥락 (긴 배경)
  characters?: CaseCharacter[];           // 핵심 인물
  keyFacts?: CaseFact[];                  // 핵심 숫자/사실
  theoryApplications?: CaseTheoryApp[];   // 강의 이론별 적용 (roots 심화)
  paradigmAxes?: CaseParadigmAxis[];      // 다축 패러다임 (paradigm 심화)
  debatePrompt?: string;                  // 찬반 토론 질문
  debate?: CaseDebateSide[];              // 찬반 양측 논점
  qna?: string[];                         // Q&A 쟁점
  ourTakeDetail?: string[];               // 최종 결론 상세 (단계/근거)
  quotes?: CaseQuote[];                   // 원문 인용
  visual?: CaseVisual;                    // '한눈에' 비주얼 (surface 최상단)
  visuals?: CaseVisual[];                 // 단계별 비주얼 (step 지정)
  journey?: CaseJourney;                  // 5why 사다리 (있으면 모달 첫 화면)
}

export interface CasesFile {
  _meta: Record<string, unknown> & { sourceFiles?: Record<string, string> };
  cases: TeamCase[];
}

// ── 레벨0: 강의 뿌리 (lectures.json) ─────────────────────
export interface LectureParadigm {
  from: string;       // 옛 패러다임 축
  to: string;         // 새 패러다임 축
  evidence: string;   // 근거(사례·인용)
}

export interface Lecture {
  id: string;
  n: number;
  title: string;
  pages?: number;
  bigIdea: string;
  concepts: string[];
  paradigm: LectureParadigm | null;
  anchors: string[];
  linkedCards: string[];
  source?: string;
}

export interface LecturesFile {
  _meta: Record<string, unknown>;
  lectures: Lecture[];
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
