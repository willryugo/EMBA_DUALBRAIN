# DEVELOPING — 어디서든(폰·다른 PC) 이어서 작업하기

> YE DB(DualBrain)는 노트북·폰·클라우드 어느 기기에서든 **GitHub 레포 하나**를 중심으로 작업합니다.
> 이 문서는 "새 기기에서 열었을 때 뭐부터 하지?"를 한 번에 푸는 멀티 기기 가이드입니다.
> (로컬 설치·NAS 빌드 우회 등 환경 상세는 [README.md](README.md) 참조.)

- **레포(단일 소스):** https://github.com/willryugo/EMBA_DUALBRAIN
- **라이브 앱:** https://emba-dualbrain.vercel.app · 입장 게이트 비번 **2580** (17기 내부 공유 전용)
- **배포:** main에 머지되면 Vercel이 자동 빌드·배포. 브랜치를 push하면 **프리뷰 URL**도 자동 생성.

---

## 🔒 절대 규칙 (모든 기기 공통)

1. **모든 변경은 `claude/<주제>` 브랜치 → PR → main.** main에 직접 push 금지.
   (2026-06-14 합의 — 폰·노트북 병행 작업 시 충돌·히스토리 꼬임 방지.)
2. **작업 브랜치는 머지 후에도 삭제하지 않는다** — 다른 기기에서 이어 쓸 수 있게 유지.
3. **가짜 데이터 금지** — 출처 있는 실데이터만. 미확인은 "미확인"으로.
4. **유료 자료 원문 복제 금지** — PUBLIC 레포. 본인 정리·요약·해석만.

---

## 📱 기기별 시작법

### A. 폰 / 태블릿 / 다른 사람 PC — 코드 클론 없이 (가장 가벼움)
브라우저나 Claude 앱에서 GitHub 레포를 바로 열어 작업합니다. NAS·로컬 디스크가 필요 없습니다.

- **claude.ai/code(웹) 또는 폰 Claude 앱**: GitHub 연동 → `willryugo/EMBA_DUALBRAIN` 열기 → 작업 지시.
- 빌드 검증은 **Vercel CI에 의존**(이 환경엔 로컬 빌드가 없음). PR 올리면 Vercel이 프리뷰를 빌드해 줍니다.
- 흐름: `claude/<주제>` 브랜치에서 수정 → PR 생성 → 프리뷰에서 눈으로 확인 → 머지.
- UI·콘텐츠(cases.json·문구·스타일) 작업에 적합.

### B. 노트북 (NAS `Z:\EMBA\dualbrain`) — 주 작업 환경
이미 클론돼 있는 메인 환경. 로컬 빌드 검증까지 가능.

```powershell
cd Z:\EMBA\dualbrain
git checkout main; git pull
npm install --no-audit --no-fund   # 처음 1회 (NAS라 5~10분)
npm run dev                        # http://localhost:3000
```
- ⚠️ **NAS에서 `next build`는 실패**(SMB readlink EISDIR 버그). 빌드 검증은 로컬 디스크 미러로:
  ```powershell
  robocopy Z:\EMBA\dualbrain $env:TEMP\db-buildtest /MIR /XD node_modules .next .git
  cd $env:TEMP\db-buildtest; npm install --no-audit --no-fund; npm run build
  ```

### C. 새 로컬 PC (일반 디스크) — 클론해서 풀 개발
NAS가 아닌 보통 디스크라 빌드도 바로 됩니다.

```bash
git clone https://github.com/willryugo/EMBA_DUALBRAIN
cd EMBA_DUALBRAIN
npm install
npm run dev        # http://localhost:3000
npm run build      # 일반 디스크면 정상 빌드 (NAS 아님)
```

---

## 🔁 표준 작업 흐름 (어느 기기든 동일)

```bash
git checkout main && git pull            # 최신 동기화부터
git checkout -b claude/<주제>            # 작업 브랜치
# ... 수정 ...
npm run typecheck                        # tsc --noEmit, 0 에러 확인
git add -A && git commit -m "<무엇을 왜>"
git push -u origin claude/<주제>
gh pr create                             # 또는 push 출력의 PR 링크로 생성
# 프리뷰/CI 확인 → 머지 → Vercel 자동 배포
```

> 💡 `gh pr create`가 GraphQL rate limit에 걸리면 REST로 우회 가능:
> `gh api repos/willryugo/EMBA_DUALBRAIN/pulls -f title=... -f head=claude/<주제> -f base=main -f body=...`

---

## ✅ PR 전 체크
- [ ] `npm run typecheck` 0 에러 (노트북/로컬에서)
- [ ] 빌드 확인 — 노트북은 로컬 미러, 폰/클라우드는 Vercel 프리뷰
- [ ] `claude/<주제>` 브랜치에서 작업했고 main 직접 push 아님
- [ ] 실데이터만, 유료 원문 복제 없음

---
*어느 기기에서 열든 이 문서 + [CLAUDE.md](CLAUDE.md) + [README.md](README.md)면 바로 이어서 작업할 수 있습니다.*
