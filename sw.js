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
// v6: the login screen is the Baseline design now — it loads court-sessions.jpg,
// which joins the pre-cache so the second open never waits for it.
// v7: the shell did not change. The worker now leaves /reach/ and /tennis/ alone (the
// Iran reachability probe, and the future paid course, which ships its own worker),
// and activate deletes only this app's own aap-* caches, so a bump here can never wipe
// another app's offline copy on the same origin.
// v8: the shell did not change. The worker also leaves /tennis-testing/ alone (the tennis
// testing app, which keeps its own offline copy of content and saves in localStorage).
// v9: shared.js changed. Its video pop-up (the small play button on circuit items) now embeds
// from www.youtube.com like the inline player does, because the nocookie player was getting
// YouTube's sign-in wall in Iran. shared.js is in the shell and served cache-first, so without
// a bump every installed phone would keep the old pop-up for ever.
// v10: program.html changed. It now draws a workout's "Before you start" card (its `before`
// field), resolves ?workout= links through the database, and reads two more per-side chip
// forms. An installed athlete on the pre-cached v9 shell keeps a renderer that IGNORES
// `before`, so this bump is what gets the new shell onto phones. It is also why the sessions'
// safety wording is only moved into `before` AFTER this version has been live for a while.
// v14: program.html changed (The Card Remembers, 2026-09-24): sets log reps, every card shows
// last time, and the History sheet reads get_my_history(). The session record now carries `log`,
// so the sooner phones leave the v13 shell the sooner their sessions are saved as data.
// v17: program.html changed (The Spine, 2026-09-24): the ⓘ About sheet with Rungs, and cues filled
// from the exercise's entry on cards that carry none of their own. (v16 was the RPE colours.)
// v18: program.html changed (Library → Exercises, the third door, 2026-09-24).
// v20: program.html changed (2026-09-24): exercises inside a circuit show their Spine entry's cues
// when they carry none of their own, the same as a standalone card.
const CACHE = 'aap-v20';

// Pre-cached on install — the minimum needed to open the app offline.
const SHELL = [
  '/program.html',
  '/exercise_library.json',
  // On the login screen since 2026-09-12 — the first image an athlete ever loads.
  '/court-sessions.jpg',
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
      // cache:'reload' — a bare addAll() can be answered from the browser's HTTP cache, which
      // files the OLD bytes under the NEW version name; the fetch handler is cache-first, so
      // they would then be pinned until the next bump. Seen testing the v9 bump: the fresh
      // cache held the previous shared.js.
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// Activate: wipe THIS app's older caches, take control of all open tabs now.
// ⚠️ Cache Storage is shared by the whole origin. The old filter (`k !== CACHE`) deleted
// every other cache too, so each bump here would silently destroy the offline copy of any
// other app on amirardekani.com. Only ever delete the aap- prefix.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('aap-') && k !== CACHE).map(k => caches.delete(k))
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

  // Hands off /reach/ and /tennis/. This worker's scope is '/', so without this it would
  // answer those pages from its own cache: the reachability probe would then report
  // "opens without a VPN" from a cached copy on exactly the phones being tested, and the
  // paid course app (which has its own worker and caches) would get stale files pinned.
  // Returning without respondWith() sends the request to the network untouched.
  // /tennis-testing/ is the testing app: it must always get its newest script, never a pinned copy.
  if (/^\/(reach|tennis|tennis-testing)(\/|$)/.test(url.pathname)) return;

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
        // ⚠️ Only cache a real answer. Cache.put stores ANY response, 404s
        // included, and this branch is cache-first — so a phone that asked for
        // an image before it existed would keep serving that 404 for ever, and
        // art uploaded later would never appear. Found 2026-09-19, when the app
        // had spent months probing four extensions for every missing cycle
        // banner. No CACHE bump: the art ships under new paths, and bumping
        // would throw away every athlete's offline copy of the app for nothing.
        if (res && res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      });
    })
  );
});
