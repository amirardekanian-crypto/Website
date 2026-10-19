// Push test worker — scope /pushtest/ only.
//
// Deliberately separate from the root /sw.js (scope "/"), which caches the whole origin's shell.
// A page under /pushtest/ is controlled by THIS worker because the more specific scope wins, so the
// push subscription, the push handler and the log below are all isolated from AA Performance and
// AA Proof. The root worker also leaves /pushtest/ alone in its fetch handler (same as /reach/),
// so the test page is never answered from a stale cache.
//
// This worker caches NOTHING. Its only jobs are to show a pushed notification, remember that one
// arrived, and open the test page when the notification is tapped.

const LOG = 'pushtest-log';     // one Cache entry holding a JSON array of what arrived
const LOG_URL = '/pushtest/__log';
const KEEP = 40;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

async function readLog() {
  try {
    const c = await caches.open(LOG);
    const r = await c.match(LOG_URL);
    if (!r) return [];
    const a = await r.json();
    return Array.isArray(a) ? a : [];
  } catch (e) { return []; }
}

async function writeLog(entry) {
  try {
    const rows = await readLog();
    rows.push(entry);
    const c = await caches.open(LOG);
    await c.put(LOG_URL, new Response(JSON.stringify(rows.slice(-KEEP)),
      { headers: { 'Content-Type': 'application/json' } }));
  } catch (e) {}
}

// A push arrived. Note the time FIRST, so the log is written even if showNotification throws:
// "it arrived but did not display" and "it never arrived" are different answers.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'AA Performance';
  const body = data.body || '';
  event.waitUntil((async () => {
    await writeLog({ at: Date.now(), sent: data.sent || null, tag: data.tag || null, title: title });
    try {
      await self.registration.showNotification(title, {
        body: body,
        icon: '/assets/img/icon-192.png',
        badge: '/assets/img/icon-192.png',
        tag: data.tag || 'pushtest',
        renotify: true,
        data: { url: '/pushtest/' }
      });
    } catch (e) {
      await writeLog({ at: Date.now(), error: String(e && e.message || e) });
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    await writeLog({ at: Date.now(), tapped: true });
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.indexOf('/pushtest/') > -1 && 'focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow('/pushtest/');
  })());
});

// The page asks for the log through a message channel (it cannot read the worker's Cache
// synchronously at first paint, and this keeps the storage shape in one place).
self.addEventListener('message', event => {
  if (!event.data || event.data.q !== 'log') return;
  event.waitUntil((async () => {
    const rows = await readLog();
    const port = event.ports && event.ports[0];
    if (port) port.postMessage(rows);
  })());
});
