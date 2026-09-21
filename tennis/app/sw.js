/* Tennis Performance System app: service worker (scope: this folder, /tennis/app/ on the website).
   Keeps the app shell on the phone so the handbook opens with no connection. The handbook content
   is not cached here: app.js keeps it in IndexedDB, per account. The pictures (assets/tps/) are kept in
   their own cache, tps-art, the first time each one is shown.
   VERSION is a hash of the shell files, stamped by scripts/stamp_tps_app.py (the pre-commit hook
   checks it), so every change installs a fresh cache and deletes the old one. It MUST change with
   every change to the shell: the fetch handler below answers from this cache first, so a phone that
   already has the app keeps the old one until sw.js itself changes. (A deploy from the private
   tps-content repo stamps it with that repo's own deploy script instead.)
   With VERSION 'dev' this worker caches nothing, so local edits always show.
   The site's root sw.js leaves /tennis/ alone and only ever deletes its own aap-* caches; this
   worker only ever deletes its own tps-shell-* caches. */
const VERSION = 'b49d6252cf6c';
const CACHE = 'tps-shell-' + VERSION;
const ART_CACHE = 'tps-art';   // NOT tps-shell-*: activate deletes those on every shell change, and a picture must outlive a code update
const SHELL = ['./', 'app.js', 'app.css', 'app.webmanifest', 'lib/supabase.js',
  'fonts/Vazirmatn-Variable.woff2', '../../assets/img/icon-192.png'];

self.addEventListener('install', e => {
  if (VERSION === 'dev') { self.skipWaiting(); return; }
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('tps-shell-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (VERSION === 'dev') return;
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;   // Supabase, YouTube: always the network
  // The course's pictures are not in the shell: there are about thirty of them and a buyer sees a handful. Each is
  // kept the first time it is shown, so it also opens with no connection. app.js puts ?v= on the URL and raises it when
  // a file is regraded, so a new version is a new key. Offline and never seen: the fetch fails, app.js removes the
  // layer and the plain green banner shows, which is the same as before there were pictures.
  if (new URL(req.url).pathname.startsWith('/assets/tps/')) {
    e.respondWith(caches.open(ART_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  if (req.mode === 'navigate') {
    // Every page load in this folder gets the cached shell, so the app opens with no connection.
    // A new deploy arrives as a new worker (the browser re-checks sw.js), never by patching this cache,
    // so a page and its script can never come from two different deploys.
    e.respondWith(caches.open(CACHE).then(c => c.match('./')).then(hit => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true })).then(hit => hit || fetch(req)));
});
