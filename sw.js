// AA Performance — Service Worker
// Bump CACHE version any time you push a breaking change to the app shell.
const CACHE = 'aap-v1';

// Pre-cached on install — the minimum needed to open the app offline.
const SHELL = [
  '/program.html',
  '/manifest.json',
  '/assets/css/tokens.css',
  '/assets/css/base.css',
  '/assets/css/components.css',
  '/assets/js/shared.js',
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png',
];

// Install: pre-cache the shell, then activate immediately (don't wait for old tabs to close).
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: wipe any caches from older SW versions, take control of all open tabs now.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Only intercept same-origin requests.
  if (url.origin !== location.origin) return;

  // HTML (navigate) — network-first so every app open runs the latest code.
  // Falls back to the cached shell if the user is offline.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // JSON (athlete data, articles, workouts) — always network, never SW-cached.
  // The app already uses { cache: 'no-cache' } on these fetches.
  if (url.pathname.endsWith('.json')) return;

  // Static assets (CSS, JS, images, fonts) — cache-first, network fallback.
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      });
    })
  );
});
