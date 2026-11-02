// The rest on a phone, the app's half (stage107; Amir, 2026-11-02: "add a notification 10sec before the rest finishes if they had
// minimised the app and was on instagram for example"; his pick: any rest, only when they are out of the app).
//   P1  leaving the app mid-rest sends ONE request to push-send?only=rest: keepalive, text/plain (no preflight), this phone's
//       endpoint, the rest's real end and the athlete's token
//   P2  coming back takes it back (push_rest_disarm, this phone's endpoint), once
//   P3  nothing is sent with no rest running, with 12 s or less left, a minimised rest is still a rest, and the notifications off
// The server's half is rehearsed by scripts/push/rehearse_rest_push.mjs. A real phone is the only proof that a hiding page's
// keepalive request leaves it: say so, and check it on one.
// Serve the repo first (python -m http.server 8851 --bind 127.0.0.1; BASE=http://127.0.0.1:8851), then:
//   node scripts/headless/rest-push.js
'use strict';
const H = require('./lib');
const t = H.checker();

async function setup(p, state = 'on') {
  await p.evaluate(st => {
    window.__sent = []; window.__rpc = [];
    const realFetch = window.fetch;
    window.fetch = (u, o) => { if (String(u).includes('push-send')) { window.__sent.push({ u: String(u), o }); return Promise.resolve(new Response('{}')); } return realFetch(u, o); };
    window.AAPush = Object.assign({}, window.AAPush || {}, { state: () => st });
    const sub = { endpoint: 'https://push.example.test/me' };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: () => Promise.resolve(sub) } }), register: () => Promise.resolve({}) } });
    window._sbReady = async () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok-123', expires_at: Math.floor(Date.now() / 1000) + 3600 } } }) },
      rpc: async (n, a) => { window.__rpc.push([n, a]); return { data: null, error: null }; } });
  }, state);
}
const hide = p => p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
const show = p => p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
const sent = p => p.evaluate(() => window.__sent.map(x => ({ u: x.u, keep: x.o.keepalive, ct: (x.o.headers || {})['Content-Type'], auth: (x.o.headers || {}).Authorization || '', b: JSON.parse(x.o.body) })));
const rpcs = p => p.evaluate(() => window.__rpc.filter(x => x[0] === 'push_rest_disarm'));

(async () => {
  const browser = await H.launch();
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [] });
    await setup(p);
    await p.evaluate(() => { openDayView('1'); });
    await p.waitForTimeout(300);
    // P3 first: no rest
    await hide(p); await p.waitForTimeout(100); await show(p);
    t.check('with no rest running, leaving the app sends nothing', (await sent(p)).length === 0);
    // P1
    await p.evaluate(() => openRest(90, 'Barbell Back Squat', null));
    await p.waitForTimeout(300);
    await hide(p);
    await p.waitForTimeout(100);
    let s = await sent(p);
    const ends = await p.evaluate(() => timerEndsAt);
    t.check('leaving the app mid-rest sends one request to push-send?only=rest', s.length === 1 && /\/functions\/v1\/push-send\?only=rest$/.test(s[0].u), JSON.stringify(s));
    t.check('…keepalive, as text/plain, with no Authorization header (a simple request: no preflight)', s[0] && s[0].keep === true && s[0].ct === 'text/plain' && !s[0].auth, JSON.stringify(s));
    t.check('…with this phone\'s endpoint, the athlete\'s token and the rest\'s real end', s[0] && s[0].b.endpoint === 'https://push.example.test/me' && s[0].b.token === 'tok-123' && Math.abs(Date.parse(s[0].b.end) - ends) < 2, JSON.stringify(s[0] && s[0].b));
    // P2
    await show(p);
    await p.waitForTimeout(150);
    let d = await rpcs(p);
    t.check('coming back takes it back: push_rest_disarm for this phone', d.length === 1 && d[0][1].p_endpoint === 'https://push.example.test/me', JSON.stringify(d));
    await show(p); await p.waitForTimeout(100);
    t.check('…once (a second foreground with nothing armed calls nothing)', (await rpcs(p)).length === 1);
    // a minimised rest is still a rest
    await p.evaluate(() => minimiseTimer());
    await hide(p); await p.waitForTimeout(100); await show(p); await p.waitForTimeout(100);
    t.check('a minimised rest sends it too', (await sent(p)).length === 2);
    // 12 s or less
    await p.evaluate(() => { timerEndsAt = Date.now() + 11000; });
    await hide(p); await p.waitForTimeout(100); await show(p);
    t.check('with 12 s or less left, nothing is sent (it would be late)', (await sent(p)).length === 2);
    // closed rest
    await p.evaluate(() => { timerEndsAt = Date.now() + 60000; closeTimer(); });
    await hide(p); await p.waitForTimeout(100); await show(p);
    t.check('a closed rest sends nothing', (await sent(p)).length === 2);
    t.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [] });
    await setup(p, 'off');
    await p.evaluate(() => { openDayView('1'); openRest(90, 'Box Jump', null); });
    await p.waitForTimeout(300);
    await hide(p); await p.waitForTimeout(100);
    t.check('notifications off on this phone: nothing is sent', (await sent(p)).length === 0);
    await ctx.close();
  }
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
