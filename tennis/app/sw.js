/* Tennis Performance System app: service worker (scope: this folder, /tennis/app/ on the website).
   Keeps the app shell on the phone so the handbook opens with no connection. The handbook content
   is not cached here: app.js keeps it in IndexedDB, per account.
   deploy_to_website.py stamps VERSION with a hash of the shell files, so every deploy installs a
   fresh cache and deletes the old one. With VERSION 'dev' (the private repo's dev server) this
   worker caches nothing, so local edits always show.
   The site's root sw.js leaves /tennis/ alone and only ever deletes its own aap-* caches; this
   worker only ever deletes its own tps-shell-* caches. */
const VERSION = 'f4700745aeac';
const CACHE = 'tps-shell-' + VERSION;
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
  if (req.mode === 'navigate') {
    // Every page load in this folder gets the cached shell, so the app opens with no connection.
    // A new deploy arrives as a new worker (the browser re-checks sw.js), never by patching this cache,
    // so a page and its script can never come from two different deploys.
    e.respondWith(caches.open(CACHE).then(c => c.match('./')).then(hit => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true })).then(hit => hit || fetch(req)));
});
