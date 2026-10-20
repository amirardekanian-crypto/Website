// A reminder subscription made under an old key is made again, and nothing else is: node scripts/test_push_resubscribe.js
//
// A push subscription is bound to the public key it was made with (assets/js/push.js VAPID_PUBLIC). If the key pair is ever
// replaced, every phone's subscription is refused by the push service for ever. Until 2026-10-20 nothing made them again:
// pushEnable() reused whatever subscription the phone had, and no one checked at an open. Now staleKey() tells when the
// browser says its key and the key differs, pushEnable() makes a stale one again, and pushRefresh() (called once an open by
// program.html's pushRefreshQuiet()) does it with no prompt and keeps the athlete's settings: the hour, the quiet days and
// which kinds, the old phone row forgotten.
//
// Headless browsers have no push service, so this runs the REAL push.js in Node against a made-up browser (window,
// navigator, Notification, a PushManager) and a made-up server that records every RPC. No network, no database.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'push.js'), 'utf8');
let passed = 0, failed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log('ok   ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail ? '\n       ' + String(detail) : '')); }
}

const b64url = bytes => Buffer.from(bytes).toString('base64url');
// A browser whose current subscription was made with `key` (bytes, or null when the browser does not say).
function browser({ permission = 'granted', key, hasSub = true }) {
  const log = [];
  let n = 0;
  const makeSub = (k) => {
    const ep = 'https://push.example.test/ep-' + (++n);
    return {
      endpoint: ep,
      options: k === null ? undefined : { applicationServerKey: k ? Uint8Array.from(k).buffer : undefined },
      unsubscribe: () => { log.push('unsubscribe ' + ep); return Promise.resolve(true); },
      toJSON: () => ({ endpoint: ep, keys: { p256dh: 'p256-' + n, auth: 'auth-' + n } }),
    };
  };
  let current = hasSub ? makeSub(key) : null;
  const pushManager = {
    getSubscription: () => Promise.resolve(current),
    subscribe: (opts) => { log.push('subscribe ' + b64url(opts.applicationServerKey)); current = makeSub(Array.from(opts.applicationServerKey)); return Promise.resolve(current); },
  };
  const reg = { pushManager };
  const store = {};
  const win = {
    isSecureContext: true, PushManager: function () {}, Notification: { permission, requestPermission: () => Promise.resolve(permission) },
    matchMedia: () => ({ matches: false }), atob: s => Buffer.from(s, 'base64').toString('binary'),
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0', maxTouchPoints: 5,
                 serviceWorker: { register: () => Promise.resolve(reg), ready: Promise.resolve(reg) } },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    location: { protocol: 'https:', hostname: 'amirardekani.com' },
  };
  win.window = win;
  const ctx = vm.createContext(Object.assign({ Date, Uint8Array, Promise, Array, String, Number }, win, { Notification: win.Notification, navigator: win.navigator }));
  vm.runInContext(SRC, ctx);
  return { AAPush: ctx.window.AAPush || ctx.AAPush, log };
}
// A server: push_me answers `me`, every call is recorded.
function server(me) {
  const calls = [];
  return { calls, rpc: (fn, args) => { calls.push([fn, args]); return Promise.resolve({ data: fn === 'push_me' ? me : { on: true }, error: null }); } };
}

(async () => {
  // The key push.js holds, as bytes, and another one.
  const probe = browser({ key: null });
  const KEY = Array.from(Buffer.from(probe.AAPush.VAPID_PUBLIC, 'base64url'));
  const OLD = KEY.map((x, i) => (i === 5 ? (x + 1) % 256 : x));
  const ME = { on: true, hour: 9, quiet_days: 3, kinds: { crew: false }, lang: 'fa' };

  // 1. the same key: nothing at all
  let b = browser({ key: KEY }), s = server(ME);
  let r = await b.AAPush.refresh(s, 'training', 'en');
  check('a subscription under this key: refresh does nothing, asks the server nothing', r === false && b.log.length === 0 && s.calls.length === 0, JSON.stringify({ r, log: b.log, calls: s.calls }));

  // 2. a browser that does not say which key it used: left alone (a working phone is never subscribed over and over)
  b = browser({ key: null }); s = server(ME);
  r = await b.AAPush.refresh(s, 'training', 'en');
  check('a browser that does not say its key: left alone', r === false && b.log.length === 0 && s.calls.length === 0, JSON.stringify({ r, log: b.log }));

  // 3. an old key: made again, settings kept, the old row forgotten
  b = browser({ key: OLD }); s = server(ME);
  r = await b.AAPush.refresh(s, 'training', 'en');
  const names = s.calls.map(c => c[0]);
  const sub = s.calls.find(c => c[0] === 'push_subscribe'), forget = s.calls.find(c => c[0] === 'push_forget'), set = s.calls.find(c => c[0] === 'push_set');
  check('an old key: unsubscribed, then subscribed again under this key', r === true && b.log[0] === 'unsubscribe https://push.example.test/ep-1' && b.log[1] === 'subscribe ' + b64url(KEY), JSON.stringify(b.log));
  check('…the new phone row is told the old hour and the language the server had', !!sub && sub[1].p_endpoint === 'https://push.example.test/ep-2' && sub[1].p_hour === 9 && sub[1].p_lang === 'fa' && sub[1].p_app === 'training', JSON.stringify(sub));
  check('…the old row is forgotten by its endpoint, never all of them', !!forget && forget[1].p_endpoint === 'https://push.example.test/ep-1', JSON.stringify(forget));
  check('…and the switches, the hour and the quiet days are put back', !!set && JSON.stringify(set[1]) === JSON.stringify({ p_kinds: { crew: false }, p_hour: 9, p_quiet_days: 3 }), JSON.stringify(set));
  check('…in that order: read, subscribe, forget, set', names.join(',') === 'push_me,push_subscribe,push_forget,push_set', names.join(','));

  // 4. no permission: nothing (refresh never prompts)
  b = browser({ key: OLD, permission: 'default' }); s = server(ME);
  r = await b.AAPush.refresh(s, 'training', 'en');
  check('permission not granted: refresh does nothing', r === false && b.log.length === 0 && s.calls.length === 0, JSON.stringify({ r, log: b.log }));

  // 5. no subscription on the phone: nothing (turning reminders on is the athlete's tap, pushEnable())
  b = browser({ key: KEY, hasSub: false }); s = server(ME);
  r = await b.AAPush.refresh(s, 'training', 'en');
  check('no subscription on this phone: refresh does nothing', r === false && b.log.length === 0 && s.calls.length === 0);

  // 6. the athlete's tap: an existing subscription under this key is reused, one under an old key is made again
  b = browser({ key: KEY }); s = server(ME);
  r = await b.AAPush.enable(s, 'training', 'en');
  check('turn on, this key: the subscription is reused', r.ok && b.log.length === 0 && s.calls[0][1].p_endpoint === 'https://push.example.test/ep-1', JSON.stringify({ log: b.log, calls: s.calls }));
  b = browser({ key: OLD }); s = server(ME);
  r = await b.AAPush.enable(s, 'training', 'en');
  check('turn on, an old key: made again before the server is told', r.ok && b.log.join(',') === 'unsubscribe https://push.example.test/ep-1,subscribe ' + b64url(KEY) && s.calls[0][1].p_endpoint === 'https://push.example.test/ep-2', JSON.stringify({ log: b.log, calls: s.calls }));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1); });
