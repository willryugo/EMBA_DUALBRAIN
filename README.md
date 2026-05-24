# 듀얼브레인 — EMBA 17기 학습 자산 매거진

> 회의 30분 전, 다시 꺼내쓰는 학습 자산 매거진. 분석과 직관 — **두 개의 뇌**가 만나는 곳.

**현재 단계: Phase 1 — 정적 매거진 (Vercel 배포 가능).**
Supabase·OpenSearch·NAS·OAuth·서버 AI는 Phase 2 이후로 미룬 상태.

---

## 로컬 실행

전제: Node.js ≥ 18.17, npm 동봉.

```powershell
cd Z:\EMBA\dualbrain
npm install --no-audit --no-fund   # NAS(네트워크 드라이브)에서 약 5~10분
npm run dev                        # http://localhost:3000
```

검증:
```powershell
npm run typecheck   # tsc --noEmit, 0 에러
npm run build       # next build  ⚠️ NAS 드라이브에선 SMB readlink 버그로 실패함 — 아래 참고
npm start           # 프로덕션 모드
```

### ⚠️ NAS(Z:\) 빌드 한계 — 환경 문제, 코드 문제 X

Z:\ 같은 SMB 마운트에서 `next build`가 `EISDIR: ... readlink ...page.tsx` 에러로 실패한다.
원인은 Synology SMB 드라이버가 일반 파일에 대한 `readlink` 호출에 EISDIR을 반환하는 버그.
**코드는 깨끗 — typecheck 0 에러, 로컬 디스크에서 빌드 성공 (3 라우트, 108 kB First Load).**

**회피 옵션:**
1. **Vercel 배포 (권장)** — Vercel은 Linux에서 빌드하므로 이 문제 없음. 그냥 push.
2. **로컬 디스크 미러 후 빌드 확인:**
   ```powershell
   robocopy Z:\EMBA\dualbrain $env:TEMP\dualbrain-buildtest /MIR /XD node_modules .next
   cd $env:TEMP\dualbrain-buildtest
   npm install --no-audit --no-fund
   npm run build
   ```
3. **개발(`npm run dev`)은 Z:\ 에서 시도 안 함 — 같은 readlink 경로를 탈 가능성 큼.** 작업도 로컬 미러에서 하고, 완료되면 Z:\로 다시 동기화하는 게 무난.

`pnpm`은 NAS에서 `Get-Volume` cmdlet 호출 자체가 실패해 install부터 안 됨 → npm 사용.

---

## 디렉토리

```
dualbrain/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # html lang="ko", 폰트 link
│   ├── globals.css         # CSS 변수 + 11종 테마 + 매거진 그리드 + 모바일 미디어쿼리
│   ├── page.tsx            # 메인 매거진
│   └── mobile/page.tsx     # iPhone 너비 iframe 미리보기 (360/375/390/430)
├── components/
│   ├── DBMark.tsx          # ★ 단일 SoT 듀얼브레인 마크 — size prop만 변경
│   ├── Masthead.tsx        # 마스트헤드 + 네비
│   ├── TitleBlock.tsx      # 타이틀 + 워터마크 420px + 통계
│   ├── HeroAI.tsx          # AI 입력 + C-Suite Desk 4탭 + 추천 결과
│   ├── Filters.tsx         # SearchBar + FilterChips(데스크) + FilterPanel(모바일)
│   ├── MagCard.tsx         # 매거진 카드 (feat/stat/qt/spread/wide/manifesto/normal)
│   ├── DetailModal.tsx     # 5-step 모달 (스와이프·키보드·닷·체크리스트·★ 저장)
│   ├── OntologyGraph.tsx   # 풀스크린 SVG 그래프 (sector layout)
│   ├── TweaksPanel.tsx     # 우하단 ⚙ → 테마/폰트/밀도/유틸
│   ├── Footer.tsx
│   └── DualBrainApp.tsx    # 메인 클라이언트 오케스트레이터
├── lib/
│   ├── types.ts            # Card/Course/Domain/Industry/TweakState/...
│   ├── themes.ts           # 11종 테마 + 6종 폰트 + applyTheme/applyFont
│   ├── manifest.ts         # COURSES/DOMAINS/INDUSTRIES (LOCKED) + MY_INDUSTRIES_DEFAULT
│   ├── storage.ts          # SSR-안전 localStorage 래퍼 (emba17_* prefix)
│   ├── related.ts          # relatedScore (같은 과목 +3, 도메인 +2, 산업 +1.5)
│   └── recommend.ts        # Phase 1: 키워드 fallback 추천. Phase 2에서 /api/ask로 교체.
├── data/
│   ├── cards.json          # ★ 12장 카드 (단일 진실 원본 — Phase 2에서 NAS PUSH로 갱신)
│   ├── manifest.json       # 7과목·7영역·12산업+범용 통제어휘 (LOCKED)
│   └── owner-pains.json    # C-Suite Desk 16개 시나리오
└── public/
    └── dualbrain-logo.png  # 참고용 (실제 마크는 SVG 인라인)
```

---

## Phase 1 결정 메모

- **카드 12장**: 디자인 핸드오프의 프로토타입 데이터. 가상교수명 4건만 실명 교체:
  - `강명수(가상)` → **최순규** (Business Ethics)
  - `이호근(가상)` → **정승환** (Business Analytics)
  - `한상만(가상)` → **김동훈** (Marketing Management)
  - `한승수(가상)` → **최원욱** (Financial Accounting)
  - 이미 실명: 오홍석(MPO) · 김성문(MS) · 어준경(Economics)
  - 카드 본문은 학술국이 점진 교체. 데이터 형태 검증 목적.
- **AI 추천**: 키워드 + 내 산업 가중치 fallback만. Anthropic SDK·`/api/ask` 없음. Phase 2 도입 예정.
- **localStorage 키 prefix `emba17_`**: 추후 사용자 동기화(Phase 3) 마이그레이션 호환성.
- **`MY_INDUSTRIES_DEFAULT = []`**: 사용자가 Tweaks 또는 Phase 3 OAuth 가입 시 직접 선택.
- **테마 디폴트 `dawn`, 폰트 `classic` (Nanum Myeongjo)**: 핸드오프 EDITMODE 값 채택.
- **DBMark는 단일 컴포넌트**: viewBox 100×60, 원 cx 32/68 r 25, multiply blend, opacity 0.78. 절대 변형 금지.
- **정적 export 안 함**: Phase 2에서 `/api/ask` 추가 시 설정 변경 불필요하도록 Next.js 기본 모드 유지. Vercel 배포 시 자동 SSG.

---

## Vercel 배포 (사용자가 직접)

> 애드덤 §6 원칙: 계정 생성·키 입력은 사람이.

1. GitHub 저장소 만들기 → 이 `dualbrain/` 폴더를 push.
2. Vercel에서 New Project → 저장소 import.
3. 빌드 명령 자동 감지 (Next.js).
4. 환경변수 — Phase 1에선 `NEXT_PUBLIC_APP_URL` 1개만. `.env.example` 참고.
5. 도메인 연결: `dualbrain.emba17.kr` 또는 `db.emba17.kr` 권장.

---

## Phase 2 인계 메모

Phase 2가 시작되면 이 프로젝트에 다음이 추가된다:

### NAS 워커 (이 저장소 밖)
- 시놀로지 Task Scheduler + Python 스크립트.
- `/EMBA17/` 트리의 신규/변경 파일 감지.
- 텍스트 추출(pdftotext/pandoc) → 임베딩 API 호출 → Supabase pgvector PUSH + OpenSearch nori 인덱스 PUSH.
- Supabase Storage에 카드 참조 파일 사본 업로드 (signed URL로 카드 모달에서 열기).
- **NAS는 인바운드 0** — 아웃바운드 HTTPS만. Tailscale·포트 포워딩 불필요.

### 이 저장소에 추가될 변경
- `data/cards.json` → Supabase `cards` 테이블 upsert로 SSOT 이동. 빌드타임 import → 런타임 fetch.
- `app/api/ask/route.ts` — Anthropic Claude Haiku 4.5 호출. 실패 시 현재 `lib/recommend.ts` fallback 호출.
- `app/api/nas/search/route.ts` — OpenSearch BM25/nori + pgvector cosine 하이브리드.
- `app/api/cards/route.ts` — Supabase `cards` 프록시.
- `lib/recommend.ts`의 키워드 fallback은 그대로 두고, `HeroAI`에서 먼저 `/api/ask` 호출 후 실패 시 fallback.
- 카드 모달 STEP 3에 "원본 자료 열기" 버튼 → Supabase Storage signed URL.
- `.env`에 `ANTHROPIC_API_KEY` · `SUPABASE_*` · `OPENSEARCH_*` 추가 (`.env.example` 참고).

### Phase 3+
- Google OAuth (`yonsei.ac.kr` 도메인 제한) + Supabase Auth.
- localStorage `emba17_*` → 사용자 DB로 마이그레이션.
- 카드 작성/편집 UI (학술국 권한만).
- 임베딩·하이브리드 검색 강화·자동 태깅.

---

## 검증 체크리스트 (Phase 1)

- [x] `npm install` 성공 (NAS에서 약 8분, 109 packages)
- [x] `npm run typecheck` 통과 (tsc --noEmit, 0 에러)
- [x] `npm run build` 통과 (로컬 미러에서 빌드 — Vercel 배포 동등). 3 라우트 정적 생성, First Load JS 108 kB
- [ ] 위 3개를 Vercel CI에서도 재확인
- [ ] 매거진 그리드 12장이 feat/stat/qt/spread/wide/manifesto 패턴으로 렌더
- [ ] 카드 클릭 → 5-step 모달 → 화살표·Esc·닷·터치 스와이프 동작
- [ ] STEP 4 체크리스트 체크 → 새로고침 후 유지 (localStorage)
- [ ] ★ 저장 토글 → 검색바 "★ 내 솔루션" 토글로 필터됨
- [ ] 좌하단 ∞ → 풀스크린 그래프, 1번 클릭 강조 / 2번 클릭 모달 오픈
- [ ] 우하단 ⚙ → 테마 11종 라이브 전환, 폰트 6패 전환, 밀도 3단
- [ ] AI 입력에 "직원 셋이 한꺼번에 그만둔다고 합니다" → 카드 3장 추천
- [ ] C-Suite Desk 16개 시나리오 클릭 → 자동 채움 + 추천
- [ ] 가상교수명 0건: `grep -r '가상' data/ components/` → 매치 없음
- [ ] 모바일 뷰(/mobile)에서 폭 360/375/390/430 전환, 매거진 2열, 노치 패딩
- [ ] 한국어 본문 줄바꿈 음절 단위 안 깨짐 (`word-break: keep-all`)
- [ ] DBMark `viewBox="0 0 100 60"` 검색 결과 **`components/DBMark.tsx` 단 1개**

---

## 라이선스 / 인계
EMBA 17기 학술국 내부 자료. 외부 공개 전 학술국 검토 필수.
