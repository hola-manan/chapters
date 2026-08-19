// Deliberately simple service worker for offline PWA reading.
// The static export fingerprints filenames, so a build-time precache list would need
// generating and would go stale with every bundle change.
// Instead: cache-first strategy for same-origin GET requests with runtime population,
// and a navigation fallback to the cached HTML shell so a cold launch works offline
// after the first visit.

const CACHE_VERSION = 'chapters-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_VERSION) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Only cache same-origin assets under /chapters/
  if (url.origin !== self.location.origin) {
    return;
  }

  if (!url.pathname.startsWith('/chapters/')) {
    return;
  }

  // Navigation requests: try network first, then fall back to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootFallback = await caches.match('/chapters/');
          if (rootFallback) return rootFallback;
          return caches.match('/chapters/index.html');
        })
    );
    return;
  }

  // Asset requests: cache-first with runtime population
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      });
    })
  );
});
