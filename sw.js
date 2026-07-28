const APP_VERSION = "journa-glass-soft-progressive-v37-20260728";
const CACHE_NAME = `ledger-cache-${APP_VERSION}`;
/* CSS/JS 条目带与 index.html 引用一致的 ?v= 版本戳：Cache API 按完整 URL
   （含 query）匹配，不带戳的预缓存条目永远命中不了带戳请求，等于白缓存。 */
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  `./css/variables.css?v=${APP_VERSION}`,
  `./css/base.css?v=${APP_VERSION}`,
  `./css/layout.css?v=${APP_VERSION}`,
  `./css/components/buttons.css?v=${APP_VERSION}`,
  `./css/components/forms.css?v=${APP_VERSION}`,
  `./css/components/lists.css?v=${APP_VERSION}`,
  `./css/components/modals.css?v=${APP_VERSION}`,
  `./css/components/toast.css?v=${APP_VERSION}`,
  `./css/animations.css?v=${APP_VERSION}`,
  `./css/misc.css?v=${APP_VERSION}`,
  `./css/responsive.css?v=${APP_VERSION}`,
  `./css/dark.css?v=${APP_VERSION}`,
  `./css/a11y.css?v=${APP_VERSION}`,
  `./app.js?v=${APP_VERSION}`,
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const shouldPreferNetwork = request.mode === "navigate" || ["script", "style", "worker"].includes(request.destination);

  if (shouldPreferNetwork) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
