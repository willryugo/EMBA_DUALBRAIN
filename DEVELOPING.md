# DEVELOPING — 어디서든 이어 작업하기

> YE DB(DualBrain)는 **GitHub 레포 하나**를 중심으로 돈다.
> 메인 작업은 **로컬 디스크 + `vercel dev`**, 가벼운 편집은 **claude.ai/code(폰)**, 배포는 **Vercel 자동**.
> (로컬 설치 일반·환경 상세는 [README.md](README.md) 참조.)

---

## 0. 큰 그림 (한 장)

```
┌──────────────────────────────────────────┐
│  로컬 디스크  C:\dev\EMBA_DUALBRAIN        │  ← Claude Code CLI(마루) 여기서 실행
│  (메인 작업)                                │     버벅임 없음·빠름  (NAS 아님)
│  vercel dev  로 실시간 미리보기             │
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
   (2026-06-14 합의 — 폰·로컬 병행 작업 시 충돌·히스토리 꼬임 방지.)
2. **작업 브랜치는 머지 후에도 삭제하지 않는다** — 다른 기기에서 이어 쓸 수 있게 유지.
3. **가짜 데이터 금지** — 출처 있는 실데이터만. 미확인은 "미확인"으로.
4. **유료 자료 원문 복제 금지** — PUBLIC 레포. 본인 정리·요약·해석만.

---

## 1. 메인 작업 — 로컬 디스크 + `vercel dev`

NAS(`Z:\`)가 아니라 **로컬 디스크 `C:\dev\EMBA_DUALBRAIN`** 에서 작업한다 — NAS는 `next build`가
SMB readlink 버그(EISDIR)로 실패하고 느리다. 로컬은 install 23초·build 정상.

### 최초 1회 셋업
```powershell
git clone https://github.com/willryugo/EMBA_DUALBRAIN C:\dev\EMBA_DUALBRAIN
cd C:\dev\EMBA_DUALBRAIN
npm install --no-audit --no-fund
npm install -g vercel           # Vercel CLI (vercel dev용)
vercel login                    # ← 수달님 Vercel 계정 (1회)
vercel link                     # ← 이 폴더를 emba-dualbrain 프로젝트에 연결 (1회)
```
> `vercel link`가 만드는 `.vercel/` 폴더는 커밋하지 않는다(.gitignore 처리됨).

### 매번 작업
```powershell
cd C:\dev\EMBA_DUALBRAIN
git checkout main; git pull
git checkout -b claude/<주제>
vercel dev                      # http://localhost:3000 — 실시간 미리보기
#   = next dev + Vercel 환경변수·서버리스 함수(/api/*)까지 로컬 재현
# ... 수정 ...
npm run typecheck               # tsc --noEmit, 0 에러
git add -A; git commit -m "<무엇을 왜>"
git push -u origin claude/<주제>
gh pr create                    # → 머지 → Vercel 자동 배포
```
> `vercel dev` 대신 `npm run dev`도 됨(서버 AI 키 등 Vercel env가 필요 없을 때).

---

## 2. 폰 / 모바일 — claude.ai/code

코드 클론 없이, 어디서든 가볍게.

- 폰 **Claude 앱** 또는 **claude.ai/code(웹)** → GitHub 연동 → `willryugo/EMBA_DUALBRAIN` 열기 → 지시.
- 빌드 검증은 **Vercel 프리뷰**가 대신(이 환경엔 로컬 빌드 없음). `claude/<주제>` 브랜치 → PR → 프리뷰 확인 → 머지.
- UI·콘텐츠(cases.json·문구·스타일) 수정에 적합.

---

## 3. (구) NAS `Z:\EMBA\dualbrain` — EMBA 폴더 구조 사본

`Z:\EMBA\` 폴더 정합성용으로 남겨둔 사본. **메인 개발은 로컬(C:\dev)로 이전했다.**
필요 시 `git pull`로 동기화만. NAS에선 `next build` 불가 → 빌드는 로컬에서.

---

## ✅ PR 전 체크
- [ ] `npm run typecheck` 0 에러
- [ ] 빌드/동작 확인 — 로컬은 `vercel dev`, 폰/클라우드는 Vercel 프리뷰
- [ ] `claude/<주제>` 브랜치에서 작업했고 main 직접 push 아님
- [ ] 실데이터만, 유료 원문 복제 없음

> 💡 `gh pr create`가 GraphQL rate limit에 걸리면 REST 우회:
> `gh api repos/willryugo/EMBA_DUALBRAIN/pulls -f title=... -f head=claude/<주제> -f base=main -f body=...`

---
*어느 기기에서 열든 이 문서 + [CLAUDE.md](CLAUDE.md) + [README.md](README.md)면 바로 이어서 작업할 수 있다.*
