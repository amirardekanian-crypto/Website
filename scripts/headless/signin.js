// The signed-out front door of program.html: the login screen's buttons must work.
// Why this exists (2026-10-11): commit 504c215 made showSignIn() read COACH_WHATSAPP, a `const` declared far
// below boot(). With no session boot() reaches showSignIn() while the script is still being evaluated, so the
// const was in its temporal dead zone, showSignIn() threw before wiring the form, and every signed-out
// athlete got a login screen whose buttons all did nothing. Amir is always signed in, so nobody on the team
// ever saw it. The inline script paints the form from the body, so a throw inside boot() looks like a
// working screen; only a tap shows it is dead. This script taps.
// Serve the repo first: python3 -m http.server 8765 --bind 127.0.0.1 (see lib.js), then node scripts/headless/signin.js
'use strict';
const H = require('./lib');

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  for (const [label, stub] of [['library loads', {}], ['library never loads (no signal)', { noLib: true }]]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    await ctx.addInitScript(H.STUB);
    const p = await ctx.newPage();
    const thrown = [];
    p.on('pageerror', e => thrown.push(e.message));
    await p.goto(H.BASE + '/program.html', { waitUntil: 'domcontentloaded' });
    // Signed out: no stub session and no saved supabase token, so HAS_SESSION is false and boot() goes
    // straight to showSignIn().
    await p.evaluate(s => { localStorage.clear(); localStorage.setItem('__stubcfg', JSON.stringify(Object.assign({ mode: 'online', session: null }, s))); }, stub);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#signin-screen.visible', { timeout: 10000 });
    await p.waitForTimeout(1500);

    t.check(`signed out (${label}): nothing throws while the sign-in screen is wired`, thrown.length === 0, thrown.join(' | '));

    // "Message Amir" must point at the coach's number with the reason written.
    const href = await p.getAttribute('#si-help-wa', 'href');
    t.check(`signed out (${label}): "Message Amir" opens WhatsApp with the coach's number`, /^https:\/\/wa\.me\/\d{8,}\?text=/.test(href || ''), href);

    // The eye toggles the password field.
    await p.fill('#si-pass', 'abc12345');
    await p.click('#si-eye');
    const shown = await p.$eval('#si-pass', el => el.type);
    await p.click('#si-eye');
    const hidden = await p.$eval('#si-pass', el => el.type);
    t.check(`signed out (${label}): the eye shows then hides the password`, shown === 'text' && hidden === 'password', shown + ' / ' + hidden);

    // Sign in answers: with the stub's rejection the red box appears and the button comes back. A dead form
    // leaves the box hidden and the button reading "Sign in" with nothing sent.
    await p.fill('#si-user', 'someone_one');
    await p.click('#si-go');
    await p.waitForFunction(() => !document.getElementById('si-err').hidden, null, { timeout: 8000 })
      .catch(() => {});
    const after = await p.evaluate(() => ({
      errShown: !document.getElementById('si-err').hidden,
      err: document.getElementById('si-err').textContent,
      btn: document.getElementById('si-go').textContent,
      sent: (window.__STUB && window.__STUB.calls || []).indexOf('auth:signIn') >= 0,
    }));
    t.check(`signed out (${label}): tapping Sign in gives an answer`, after.errShown && after.btn === 'Sign in', JSON.stringify(after));
    if (!stub.noLib) t.check(`signed out (${label}): the credentials were actually sent`, after.sent, JSON.stringify(after));
    t.check(`signed out (${label}): the failure message is one of the two real messages`,
      /not right|Check your connection/.test(after.err), after.err);
    t.check(`signed out (${label}): still nothing thrown after the taps`, thrown.length === 0, thrown.join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
