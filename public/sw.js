// 듀얼브레인 서비스워커 v3 — '절대 화면을 막지 않는' 안전 설계.
// 배경: 과거 SW가 HTML 셸을 캐시·중계하다가 깨진 셸/낡은 청크를 내줘
//       '빈 화면 + 무한 로딩'이 반복됨(고질적). 구조적으로 차단한다.
// 원칙:
//   1) HTML 문서(navigate 요청)는 SW가 '절대' 가로채지 않는다 → 항상 네트워크의 최신 HTML.
//      → 캐시된 셸로 인한 빈 화면이 구조적으로 불가능.
//   2) 불변 해시 자산(/_next/static/·아이콘·폰트)만 cache-first(파일명이 빌드마다 바뀌어 stale 위험 없음).
//   3) activate 때 과거 캐시를 '전부' 삭제 → 멈춘 클라이언트의 깨진 캐시까지 강제 정리.
const CACHE = "dualbrain-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      // 옛 캐시(v1·v2의 HTML 셸·청크 포함)를 전부 축출 — 멈춘 클라이언트 강제 정리
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  // 🚫 문서(navigation)는 손대지 않는다 — 항상 네트워크에서 최신 HTML을 받는다.
  //    (SW가 셸을 캐시·중계하지 않으므로 '깨진 빈 화면'이 발생할 수 없다.)
  if (request.mode === "navigate") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return; // 외부(CDN 폰트 등)는 패스

  // 불변 해시 자산만 cache-first. CSS·JS 청크는 /_next/static/ 아래라 파일명이 빌드마다 바뀜 → stale 안전.
  // API·기타 동적 요청은 손대지 않고 네트워크 기본 처리.
  const immutable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)$/.test(url.pathname);
  if (!immutable) return;

  e.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
