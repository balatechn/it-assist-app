// National Group India - Service Worker v2
// Runtime caching strategy (no stale build hashes)

const CACHE_NAME = "ngi-it-v2";
const OFFLINE_URL = "/dashboard";

// Install: cache essential shell assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "/manifest.json",
        "/favicon.png",
        "/logo.webp",
        "/icon-192x192.png",
        "/icon-512x512.png",
        "/apple-touch-icon.png",
      ])
    )
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for navigation + API, stale-while-revalidate for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin auth callbacks
  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/api/auth/callback")) return;

  // Navigation requests: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // API requests: network-first, no cache fallback (data must be fresh)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: "Offline" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }))
    );
    return;
  }

  // Static assets (_next/static, fonts, images): stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.match(/\.(js|css|woff2?|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const fetched = fetch(request).then((response) => {
            cache.put(request, response.clone());
            return response;
          });
          return cached || fetched;
        })
      )
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
