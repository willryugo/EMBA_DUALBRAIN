// 듀얼브레인 서비스워커 — 오프라인 셸 + 빠른 재방문.
// 전략: 네비게이션(HTML)은 network-first(최신 우선, 오프라인 시 캐시),
//       정적 자산(_next/아이콘/폰트)은 stale-while-revalidate.
// 외부 CDN(pretendard·google fonts)은 건드리지 않음 → 오프라인 시 시스템 폰트로 폴백.
const CACHE = "dualbrain-v1";
const PRECACHE = ["/", "/?s=pwa"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return; // 외부 도메인은 패스

  // HTML 문서: network-first
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("/"))
        )
    );
    return;
  }

  // 정적 자산: stale-while-revalidate
  const isAsset =
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icon") ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|css|js|json)$/.test(url.pathname);
  if (isAsset) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
