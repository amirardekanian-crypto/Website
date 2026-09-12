// AA Performance — Service Worker
// Bump CACHE version any time you push a breaking change to the app shell.
// v3: program.html's app shell changed — it now links the real /manifest.json and
// carries the apple-mobile-web-app-* meta tags, so the pre-cached v2 shell would
// keep an installed athlete on a version that cannot be installed properly.
// v4: program.html's <head> changed — the font stylesheet no longer blocks paint,
// the Supabase SDK now loads ahead of analytics, and the login screen is painted
// from the body instead of from boot(). An installed athlete sitting on the
// pre-cached v3 shell would keep the slow first load offline-first opens are
// most likely to suffer from.
// v5: navigations and the exercise library are stale-while-revalidate rather
// than network-first, and the library joins the pre-cache. The shell keys also
// moved from the full URL to the pathname, so a v4 cache would miss every one.
const CACHE = 'aap-v5';

// Pre-cached on install — the minimum needed to open the app offline.
const SHELL = [
  '/program.html',
  '/exercise_library.json',
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

// Serve the cached copy at once and refresh it in the background for next time.
//
// ⚠️ TWO THINGS HERE ARE LOAD-BEARING, and getting either wrong produces an app
// that is fast and then never updates again — which is worse than slow.
//   1. `refresh` must resolve only AFTER cache.put() finishes, because it is what
//      waitUntil() holds the worker open for. Resolving on the response alone
//      lets the browser kill the worker mid-write, and the new version is
//      silently dropped every single time. That is not theoretical: it is what
//      the first draft of this did, and a fourth consecutive load still served
//      the first build.
//   2. `cache: 'reload'` makes the background fetch skip the HTTP cache. Without
//      it the revalidation can be answered from Chrome's own cache with the
//      very bytes we are trying to replace, and the shell freezes one version
//      behind for as long as that entry stays fresh.
function staleWhileRevalidate(e, request, key) {
  const refresh = fetch(new Request(request.url, { cache: 'reload', credentials: 'same-origin' }))
    .then(res => {
      if (!res.ok) return res;
      const copy = res.clone();
      return caches.open(CACHE).then(c => c.put(key, copy)).then(() => res);
    });
  e.waitUntil(refresh.catch(() => {}));
  return caches.open(CACHE)
    .then(c => c.match(key))
    .then(cached => cached || refresh)
    .catch(() => refresh);
}

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Only intercept same-origin requests.
  if (url.origin !== location.origin) return;

  // HTML (navigate) — STALE-WHILE-REVALIDATE (Amir, 2026-09-12: opening the
  // home-screen icon was slow). This was network-first, which meant every tap on
  // the installed icon re-downloaded all 360KB of program.html before a single
  // pixel appeared; the cached shell was only ever used when the network FAILED,
  // so a merely slow connection held the whole app hostage. iOS kills a
  // backgrounded PWA aggressively, so almost every open paid it cold.
  //
  // ⚠️ What makes this safe is that the programme is NOT in this file any more.
  // Since 2026-09-07 every programme is a row in public.programs fetched live on
  // each boot, so a one-launch-old shell still shows today's training. The only
  // thing that lags a deploy is the app's own code, and it lands on the next
  // open — which is why the background refresh below is not optional.
  //
  // Keyed on the PATHNAME, not the full URL: a legacy ?client=&key= link and a
  // plain /program.html are the same shell, and caching them separately would
  // mean the installed icon never hits the copy the other one warmed.
  if (request.mode === 'navigate') {
    e.respondWith(staleWhileRevalidate(e, request, url.origin + url.pathname));
    return;
  }

  // The exercise library is a generated, same-for-everyone lookup of name → video
  // URL. boot() awaits it before the first render, so on the network-first branch
  // below it cost a round trip on every open to fetch a file that changes maybe
  // monthly. Same stale-while-revalidate treatment, for the same reason.
  if (url.pathname.endsWith('/exercise_library.json')) {
    e.respondWith(staleWhileRevalidate(e, request, request));
    return;
  }

  // JSON (athlete data, articles, workouts) — network-first so updates land
  // immediately, but keep the last good copy as an offline fallback. Without
  // this, a PWA relaunch with no signal dies on the "Could not load data"
  // screen mid-workout: the OS killing the backgrounded app forces a full
  // reload, and data/<id>.json was the one thing that had to come from the
  // network.
  if (url.pathname.endsWith('.json')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

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
