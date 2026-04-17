// ═══════════════════════════════════════════════
//  SERVICE WORKER — مولِّد المسلسلات الذكي PWA
// ═══════════════════════════════════════════════
const CACHE_NAME = "musalsal-v1.0.0";
const STATIC_CACHE = "musalsal-static-v1";
const API_CACHE = "musalsal-api-v1";

// Files to cache for offline use
const STATIC_FILES = [
  "./index.html",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap",
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone/babel.min.js",
];

// ── Install ──────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_FILES).catch((err) => {
        console.warn("[SW] Some static files failed to cache:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache Anthropic API calls
  if (url.hostname === "api.anthropic.com") {
    event.respondWith(fetch(event.request));
    return;
  }

  // Google Fonts — network first, cache fallback
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});

// ── Background Sync (for future use) ─────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-projects") {
    console.log("[SW] Background sync triggered");
  }
});

// ── Push Notifications (for future use) ──────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? { title: "مولِّد المسلسلات", body: "جاهز!" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-72.png",
      dir: "rtl",
      lang: "ar",
    })
  );
});
