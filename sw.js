/**
 * Quick Wa Link — Service Worker
 * Strategy: cache-first for static assets, network-first for navigation
 */

const STATIC_CACHE_NAME = 'qwl-static-v1.0.3';

const PRECACHE_URLS = [
  '/index.html',
  '/create/index.html',
  '/manifest.json',
  '/assets/css/main.css',
  '/assets/css/index.css',
  '/assets/css/app.css',
  '/assets/js/shared.js',
  '/assets/js/app.js',,
  '/assets/icons/quick-wa-link-logo.png',
  '/assets/icons/icon.svg'
];

/* ── Install: pre-cache critical assets ─── */
self.addEventListener('install', (installEvent) => {
  self.skipWaiting();
  installEvent.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS)
    )
  );
});

/* ── Activate: clean stale caches ────────── */
self.addEventListener('activate', (activateEvent) => {
  activateEvent.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== STATIC_CACHE_NAME)
          .map((staleCacheName) => caches.delete(staleCacheName))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first static, network-first nav ── */
self.addEventListener('fetch', (fetchEvent) => {
  return;
  const requestUrl = new URL(fetchEvent.request.url);

  // Skip non-GET and Netlify function calls
  if (fetchEvent.request.method !== 'GET') return;
  if (requestUrl.pathname.startsWith('/.netlify/')) return;

  // Navigation requests — network-first with cache fallback
  if (fetchEvent.request.mode === 'navigate') {
    fetchEvent.respondWith(
      fetch(fetchEvent.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets — cache-first
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(fetchEvent.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) return networkResponse;

        const clonedResponse = networkResponse.clone();
        caches.open(STATIC_CACHE_NAME).then((cache) => {
          cache.put(fetchEvent.request, clonedResponse);
        });

        return networkResponse;
      });
    })
  );
});
