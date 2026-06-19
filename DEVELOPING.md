# DEVELOPING — 어디서든 이어 작업하기

> YE DB(DualBrain)는 **GitHub 레포 하나**를 중심으로 돈다.
> 메인 작업은 **NAS(`Z:\EMBA\dualbrain`) 원본에서 `vercel dev`**, 가벼운 편집은 **claude.ai/code(폰)**, 배포는 **Vercel 자동**.
> (로컬 설치 일반·환경 상세는 [README.md](README.md) 참조.)

---

## 0. 큰 그림 (한 장)

```
┌──────────────────────────────────────────┐
│  NAS  Z:\EMBA\dualbrain  (원본·메인 작업)   │  ← Claude Code CLI(마루) 여기서 실행
│  vercel dev  로 실시간 미리보기             │     개인 프로젝트는 NAS에 원천 유지
└────────────────────┬─────────────────────┘
                     │  git push / pull  (claude/<주제> 브랜치)
                     ▼
┌──────────────────────────────────────────┐
│  GitHub:  willryugo/EMBA_DUALBRAIN         │  ← 단일 소스 (소스 오브 트루스)
└──────────┬───────────────────────┬───────┘
           ▼                       ▼
┌───────────────────────┐   ┌────────────────────────────┐
│  Vercel 자동배포        │   │  claude.ai/code  웹·모바일   │
│  emba-dualbrain         │   │  (가벼운 편집 · PR 머지)     │
│  .vercel.app  (~10초)   │   │  ↔ 같은 레포                │
└───────────────────────┘   └────────────────────────────┘
```

- **레포(단일 소스):** https://github.com/willryugo/EMBA_DUALBRAIN
- **라이브 앱:** https://emba-dualbrain.vercel.app · 입장 게이트 비번 **2580** (17기 내부 공유 전용)
- **배포:** main 머지 → Vercel 자동 빌드·배포(~10초). 브랜치 push → **프리뷰 URL** 자동 생성.

---

## 🔒 절대 규칙 (모든 기기 공통)

1. **모든 변경은 `claude/<주제>` 브랜치 → PR → main.** main 직접 push 금지.
   (2026-06-14 합의 — 폰·NAS 병행 작업 시 충돌·히스토리 꼬임 방지.)
2. **작업 브랜치는 머지 후에도 삭제하지 않는다** — 다른 기기에서 이어 쓸 수 있게 유지.
3. **가짜 데이터 금지** — 출처 있는 실데이터만. 미확인은 "미확인"으로.
4. **유료 자료 원문 복제 금지** — PUBLIC 레포. 본인 정리·요약·해석만.

---

## 1. 메인 작업 — NAS 원본 + `vercel dev`

개인 프로젝트는 **NAS `Z:\EMBA\dualbrain`에 원천 그대로 유지**하고 거기서 작업한다.
다른 개인 레포들과 동일한 패턴(NAS + Vercel CLI).

> **핵심: NAS에서 막히는 건 `next build` 뿐이다.** SMB readlink 버그(EISDIR)는 프로덕션 빌드의
> readlink 단계에서만 터진다. **`next dev` / `vercel dev`는 NAS에서 정상 동작**(실측 확인 — `/welcome` 200).
> 프로덕션 빌드 검증은 NAS에서 직접 할 일이 거의 없고, 필요하면 로컬 미러나 Vercel CI에 맡긴다.

### 최초 1회 셋업
```powershell
cd Z:\EMBA\dualbrain
npm install --no-audit --no-fund   # NAS라 5~10분 (1회)
npm install -g vercel              # Vercel CLI
vercel login                       # ← 수달님 Vercel 계정 (1회)
vercel link                        # ← 이 폴더를 emba-dualbrain 프로젝트에 연결 (1회)
vercel env pull .env               # (선택) Vercel 환경변수를 로컬 .env로 — 키 넣었을 때만 의미
```
> `vercel link`가 만드는 `.vercel/` 폴더와 `.env`는 커밋하지 않는다(.gitignore 처리됨).

### 매번 작업
```powershell
cd Z:\EMBA\dualbrain
git checkout main; git pull
git checkout -b claude/<주제>
vercel dev                         # http://localhost:3000 — 실시간 미리보기
#   = next dev + Vercel 환경변수·서버리스 함수(/api/*)까지 로컬 재현
# ... 수정 ...
npm run typecheck                  # tsc --noEmit, 0 에러
git add -A; git commit -m "<무엇을 왜>"
git push -u origin claude/<주제>
gh pr create                       # → 머지 → Vercel 자동 배포
```
> `vercel link` 전이거나 Vercel env가 필요 없으면 `npm run dev`로도 동일하게 작동.

### (드물게) 프로덕션 빌드 확인이 필요할 때 — 로컬 미러
NAS에서 `next build`는 EISDIR로 실패하므로, 빌드까지 확인하려면 로컬 디스크에 미러해서:
```powershell
robocopy Z:\EMBA\dualbrain $env:TEMP\db-buildtest /MIR /XD node_modules .next .git
cd $env:TEMP\db-buildtest; npm install --no-audit --no-fund; npm run build
```
> 평소엔 불필요 — Vercel이 배포 시 Linux에서 빌드하므로 PR 프리뷰가 빌드를 대신한다.

---

## 2. 폰 / 모바일 — claude.ai/code

코드 클론 없이, 어디서든 가볍게.

- 폰 **Claude 앱** 또는 **claude.ai/code(웹)** → GitHub 연동 → `willryugo/EMBA_DUALBRAIN` 열기 → 지시.
- 빌드 검증은 **Vercel 프리뷰**가 대신. `claude/<주제>` 브랜치 → PR → 프리뷰 확인 → 머지.
- UI·콘텐츠(cases.json·문구·스타일) 수정에 적합.

---

## ✅ PR 전 체크
- [ ] `npm run typecheck` 0 에러
- [ ] 동작 확인 — NAS는 `vercel dev`(/`npm run dev`), 폰/클라우드는 Vercel 프리뷰
- [ ] `claude/<주제>` 브랜치에서 작업했고 main 직접 push 아님
- [ ] 실데이터만, 유료 원문 복제 없음

> 💡 `gh pr create`가 GraphQL rate limit에 걸리면 REST 우회:
> `gh api repos/willryugo/EMBA_DUALBRAIN/pulls -f title=... -f head=claude/<주제> -f base=main -f body=...`

---
*어느 기기에서 열든 이 문서 + [CLAUDE.md](CLAUDE.md) + [README.md](README.md)면 바로 이어서 작업할 수 있다.*
