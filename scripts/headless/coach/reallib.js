// coach-harness/reallib.js — the REAL supabase-js v2 (the UMD jsDelivr serves for "@supabase/supabase-js@2",
// version pinned in vendor/ by README step 2) driving coach.html, with every request to the Supabase host
// answered locally. Purpose: prove which auth events the real library sends coach.html's
// onAuthStateChange(() => { booted = false; boot(); }) — at page load and when the tab comes back.
// Nothing leaves the box; the session in localStorage is fake.
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const UMD = path.join(__dirname, 'vendor', 'supabase.js');
if (!fs.existsSync(UMD)) { console.error('Missing ' + UMD + ' — see README.md step 3 (npm pack @supabase/supabase-js@2.117.3).'); process.exit(2); }
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const user = { id: '00000000-0000-4000-8000-00000000c0ac', aud: 'authenticated', role: 'authenticated', email: 'amirardekanian@gmail.com', app_metadata: { provider: 'google' }, user_metadata: {} };
const jwt = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp: now + 3600, iat: now }) + '.fakesig';
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'fake-refresh', user };

(async () => {
  const b = await L.launch();
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  const hits = [];
  const events = [];
  await page.route('**/*', async route => {
    const req = route.request(); const u = new URL(req.url());
    if (req.url().startsWith(L.BASE)) return route.continue();
    if (/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/.test(req.url())) return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(UMD, 'utf8') });
    if (u.hostname === 'bvipfipbdcyqnbczjmaq.supabase.co') {
      hits.push(req.method() + ' ' + u.pathname);
      const json = (o, s) => route.fulfill({ status: s || 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': '0-0/0' }, body: JSON.stringify(o) });
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: '' });
      if (u.pathname.startsWith('/auth/v1/user')) return json(user);
      if (u.pathname.startsWith('/auth/v1/token')) return json(Object.assign({}, session, { expires_at: now + 7200 }));
      if (u.pathname.startsWith('/rest/v1/rpc/')) return json([]);
      if (u.pathname.startsWith('/rest/v1/')) return json([]);
      return json({});
    }
    return route.fulfill({ status: 204, body: '' });
  });
  await page.addInitScript(s => {
    localStorage.setItem('sb-bvipfipbdcyqnbczjmaq-auth-token', JSON.stringify(s));
    // Let the test flip the tab's visibility the way a real tab switch does.
    window.__vis = 'visible';
    Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get() { return window.__vis; } });
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get() { return window.__vis !== 'visible'; } });
  }, session);
  await page.exposeFunction('__authEvent', e => events.push(e));
  await page.addInitScript(() => {
    // Watch what the real client tells its subscribers, without changing coach.html: wrap createClient
    // the moment the UMD assigns window.supabase, and subscribe a logger next to coach.html's own.
    let real;
    Object.defineProperty(window, 'supabase', { configurable: true, get() { return real; }, set(v) {
      const orig = v.createClient;
      real = Object.assign({}, v, { createClient: function () { const c = orig.apply(v, arguments);
        c.auth.onAuthStateChange((ev, s) => { window.__authEvent(ev + (s ? '' : ' (no session)')); }); return c; } });
    } });
  });
  await page.goto(L.BASE + '/coach.html');
  await page.waitForFunction(() => document.querySelector('#rail a.tab'), null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const boot = hits.filter(h => h === 'GET /rest/v1/athlete_progress').length;
  const evBoot = events.slice();
  // Tab hidden, then back (Amir goes to WhatsApp Web and returns).
  await page.evaluate(() => { window.__vis = 'hidden'; document.dispatchEvent(new Event('visibilitychange', { bubbles: true })); });
  await page.waitForTimeout(300);
  const before = hits.filter(h => h === 'GET /rest/v1/athlete_progress').length;
  await page.evaluate(() => { window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange', { bubbles: true })); });
  await page.waitForTimeout(2000);
  const after = hits.filter(h => h === 'GET /rest/v1/athlete_progress').length;
  const out = {
    supabaseJs: JSON.parse(fs.readFileSync(path.join(__dirname, 'vendor', 'VERSION.json'), 'utf8')),
    authEventsAtLoad: evBoot,
    storeLoadsAtLoad: boot,
    authEventsAfterTabReturn: events.slice(evBoot.length),
    storeLoadsCausedByTabReturn: after - before,
  };
  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(L.OUT, 'reallib.json'), JSON.stringify(out, null, 2));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
