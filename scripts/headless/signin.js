// The signed-out front door of program.html and habits.html: the login screen's buttons must work, and
// the Supabase library it needs must survive a bad first download.
//
// Why this exists (2026-10-11): commit 504c215 made showSignIn() read COACH_WHATSAPP, a `const` declared far
// below boot(). With no session boot() reaches showSignIn() while the script is still being evaluated, so the
// const was in its temporal dead zone, showSignIn() threw before wiring the form, and every signed-out
// athlete got a login screen whose buttons all did nothing. Amir is always signed in, so nobody on the team
// ever saw it. The inline script paints the form from the body, so a throw inside boot() looks like a
// working screen; only a tap shows it is dead. This script taps.
//
// The second half guards _sbForSignIn(): sign-in used to give up after ~3 s (or at once when the first
// download of supabase-js from cdn.jsdelivr.net had failed) and say "Check your connection" on every tap until
// the app was force-closed. Four library cases per page: loads, never loads, first download fails and the
// retry works, arrives slowly.
//
// Serve the repo first: python3 -m http.server 8765 --bind 127.0.0.1 (see lib.js), then node scripts/headless/signin.js
'use strict';
const H = require('./lib');

const LIB = '**/assets/js/supabase-*.js*';   // the apps' own copy (2026-10-13; it was @2 from jsDelivr)
// What a successful (re)download of the library runs: the stub, with its "no library" switch cleared. The stub
// defines window.supabase as non-writable, so a second copy arriving (the slow case: the original lands late
// AND the retry lands) must do nothing; the real UMD bundle just reassigns the global, which is harmless.
const LIB_BODY = "if(!window.supabase){try{var c=JSON.parse(localStorage.getItem('__stubcfg')||'{}');delete c.noLib;localStorage.setItem('__stubcfg',JSON.stringify(c));}catch(e){}\n" + H.STUB + "\n}";

const PAGES = [
  { url: '/program.html', name: 'program', help: true },
  { url: '/habits.html', name: 'habits', help: false },
];
const CASES = [
  { key: 'loads', label: 'library loads', stub: {}, route: 'abort', want: 'rejected' },
  { key: 'never', label: 'library never loads', stub: { noLib: true }, route: 'abort', want: 'lib' },
  { key: 'retry', label: 'first download fails, the retry works', stub: { noLib: true }, route: 'failOnce', want: 'sent' },
  { key: 'slow', label: 'library arrives after 5 s', stub: { noLib: true }, route: 'slow', want: 'sent' },
];

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  for (const page of PAGES) {
    for (const c of CASES) {
      const tag = `${page.name} signed out (${c.label})`;
      // No service worker, as in lib.js: since 2026-10-13 sw.js precaches the apps' own copy of supabase-js, and it would answer the
      // library request from its cache before the route below could fail it (on a real phone that is the point).
      const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
      // Signed out: a fresh context has no saved supabase token and the stub has no session, so boot() goes
      // straight to showSignIn(). The config is written before the page's own scripts (and before the stub
      // reads it), so ONE navigation is all there is: the library is requested once by the page's <script> tag.
      await ctx.addInitScript(cfg => { try { localStorage.setItem('__stubcfg', JSON.stringify(cfg)); } catch (e) {} },
        Object.assign({ mode: 'online', session: null }, c.stub));
      await ctx.addInitScript(H.STUB);
      let hits = 0, served = 0;
      await ctx.route(LIB, route => {
        hits++;
        const ok = () => { served++; return route.fulfill({ contentType: 'application/javascript', body: LIB_BODY }); };
        if (c.route === 'abort' || (c.route === 'failOnce' && hits === 1)) return route.abort();
        if (c.route === 'slow') return setTimeout(ok, 5000);
        return ok();
      });
      const p = await ctx.newPage();
      const thrown = [];
      p.on('pageerror', e => thrown.push(e.message));
      // 'commit' so the slow case does not sit waiting for its own deferred script before we tap.
      await p.goto(H.BASE + page.url, { waitUntil: 'commit' });
      await p.waitForSelector('#signin-screen.visible', { timeout: 15000 });
      await p.waitForTimeout(c.route === 'slow' ? 300 : 1500);

      t.check(`${tag}: nothing throws while the sign-in screen is wired`, thrown.length === 0, thrown.join(' | '));

      if (page.help) {
        const href = await p.getAttribute('#si-help-wa', 'href');
        t.check(`${tag}: "Message Amir" opens WhatsApp with the coach's number`, /^https:\/\/wa\.me\/\d{8,}\?text=/.test(href || ''), href);
      }

      // The eye toggles the password field.
      await p.fill('#si-pass', 'abc12345');
      await p.click('#si-eye');
      const shown = await p.$eval('#si-pass', el => el.type);
      await p.click('#si-eye');
      const hidden = await p.$eval('#si-pass', el => el.type);
      t.check(`${tag}: the eye shows then hides the password`, shown === 'text' && hidden === 'password', shown + ' / ' + hidden);

      // Sign in answers. A dead form leaves the box hidden and the button reading "Sign in" with nothing sent.
      await p.fill('#si-user', 'someone_one');
      const servedAtTap = served;
      await p.click('#si-go');
      await p.waitForFunction(() => !document.getElementById('si-err').hidden, null, { timeout: 25000 }).catch(() => {});
      const after = await p.evaluate(() => ({
        errShown: !document.getElementById('si-err').hidden,
        err: document.getElementById('si-err').textContent,
        btn: document.getElementById('si-go').textContent,
        sent: (window.__STUB && window.__STUB.calls || []).indexOf('auth:signIn') >= 0,
      }));
      t.check(`${tag}: tapping Sign in gives an answer`, after.errShown && after.btn === 'Sign in', JSON.stringify(after));
      if (c.want === 'lib') {
        t.check(`${tag}: it says the sign-in could not load, and nothing was sent`, /could not load/.test(after.err) && !after.sent, JSON.stringify(after));
        t.check(`${tag}: the library was asked for again before giving up`, hits >= 2, 'requests: ' + hits);
      } else {
        t.check(`${tag}: the credentials were actually sent (one tap, no force-close)`, after.sent, JSON.stringify(after));
        t.check(`${tag}: the answer is the server's, not "could not load"`, /not right|Could not sign in just now/.test(after.err), after.err);
        if (c.key === 'retry') t.check(`${tag}: the first download really failed, then the library was fetched again`, hits >= 2, 'requests: ' + hits);
        if (c.key === 'slow') t.check(`${tag}: the tap really came before the library arrived`, servedAtTap === 0, 'served at tap: ' + servedAtTap);
      }
      t.check(`${tag}: still nothing thrown after the taps`, thrown.length === 0, thrown.join(' | '));
      await ctx.close();
    }
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
