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

  // HTML 문서: network-first + 3초 타임아웃 → 캐시 폴백.
  // 네트워크가 '느릴' 때도(엣지 콜드스타트 등) 3초 후 캐시 셸을 즉시 보여줘
  // '10초 먹통' 체감을 제거한다. 네트워크 응답은 도착하는 대로 캐시를 갱신(다음 방문엔 최신).
  // 게이트(미들웨어)는 그대로: 네트워크를 우선 시도하고, 느릴 때만 캐시로 폴백한다.
  if (request.mode === "navigate") {
    e.respondWith(
      (async () => {
        const net = fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        });
        const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
        const winner = await Promise.race([net.catch(() => null), timeout]);
        if (winner) return winner; // 네트워크가 3초 내 응답(또는 즉시 성공)
        // 느림/오프라인 → 캐시 셸 즉시 반환(네트워크는 백그라운드로 계속 받아 캐시 갱신)
        const cached = (await caches.match(request)) || (await caches.match("/"));
        return cached || net; // 캐시 없으면(최초 방문) 네트워크를 기다린다
      })()
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
