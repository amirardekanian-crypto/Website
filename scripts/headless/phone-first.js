// Open from the phone first (Line Call, 2026-10-13; Amir: "yes to all recommended", decision 2, with both guards):
// node scripts/headless/phone-first.js
//
// Every open waited for the library and get_program (up to 6 s) before Home, with the plan already saved on the phone. Now a
// phone holding this athlete's plan opens from it at once and asks the server behind the first paint (_resumeSync()):
//   1. a stalled server: Home is up in well under 2 s; nothing says Offline until the check has given up, then the Offline line;
//   2. the same plan: nothing shows, the uploads go;
//   3. a changed plan: "Your plan was updated · Refresh", the old one stays on screen until the athlete taps;
//   4. a "no": the app closes on "Plan not available" and the copy goes (guard 1);
//   5. a "no" with a session under way: the Heads up line, nothing taken off the screen (as before);
//   6. the demo never opens from a copy.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

// Reload with a changed stub (its config lives in localStorage, so a reload keeps it), and time Home.
async function reopen(p, patch) {
  await p.evaluate(patch => {
    const c = JSON.parse(localStorage.getItem('__stubcfg') || '{}');
    Object.assign(c, patch);
    localStorage.setItem('__stubcfg', JSON.stringify(c));
  }, patch);
  const t0 = Date.now();
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
  return Date.now() - t0;
}
const line = p => p.evaluate(() => { const el = document.getElementById('home-offline'); return el && !el.hidden ? el.innerText.replace(/\s+/g, ' ').trim() : ''; });
const errScreen = p => p.evaluate(() => { const e = document.getElementById('error-screen'); return e && e.classList.contains('visible') ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
const copyId = p => p.evaluate(() => { try { return (JSON.parse(localStorage.getItem('plancache')) || {}).id || null; } catch (e) { return null; } });

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  // ── 1–3 ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
    C.check('the first open saves the plan on the phone', !!(await copyId(p)));
    const ms = await reopen(p, { stall: { get_program: true } });
    const early = await line(p);
    C.check('a stalled server: Home from the phone in under 2 s', ms < 2000, ms + ' ms');
    C.check('…and nothing says Offline while the check is still waiting', early === '', early);
    await p.waitForTimeout(7000);
    const late = await line(p);
    C.check('once the check gives up (6 s): the Offline line', /^Offline Your plan as saved on this phone/i.test(late), late);

    await reopen(p, { stall: {} });
    await p.waitForTimeout(1500);
    const same = await line(p);
    const pulled = await p.evaluate(() => (window.__STUB.calls || []).filter(c => c === 'rpc:get_program' || c === 'rpc:get_progress'));
    C.check('the same plan: nothing shows, and the check and the pull both ran', same === '' && pulled.includes('rpc:get_program') && pulled.includes('rpc:get_progress'), JSON.stringify([same, pulled]));

    const changed = H.fixture(), was = changed.workouts.days[0].blocks[1].exercises[0].rx.sets; changed.workouts.days[0].blocks[1].exercises[0].rx.sets = was + 2;
    await reopen(p, { program: changed });
    await p.waitForTimeout(1500);
    const upd = await line(p);
    const onScreen = await p.evaluate(() => DATA.workouts.days[0].blocks[1].exercises[0].rx.sets);
    C.check('a changed plan: "Your plan was updated · Refresh", the old plan stays until the tap', /Your plan was updated/i.test(upd) && /Refresh/i.test(upd) && onScreen === was, JSON.stringify([upd, onScreen]));
    C.check('…and the new plan is the one saved now', await p.evaluate(() => (JSON.parse(localStorage.getItem('plancache')).data.workouts.days[0].blocks[1].exercises[0].rx.sets)) === was + 2);
    C.check('no page errors (1–3)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 4. a "no" closes the app ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
    await reopen(p, { refuse: ['get_program'] });
    await p.waitForTimeout(1500);
    const e = await errScreen(p);
    C.check('a "no" from the server: the app closes on Plan not available, and the copy goes', /Plan not available/i.test(e) && !(await copyId(p)), e.slice(0, 120));
    await ctx.close();
  }

  // ── 5. a "no" with a session under way only warns ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
    await p.evaluate(() => { startTimerNow('1'); });
    await p.waitForTimeout(300);
    await reopen(p, { refuse: ['get_program'] });
    await p.waitForTimeout(1500);
    const e = await errScreen(p), l = await line(p);
    C.check('a "no" with a session under way: no error screen, the Heads up line', !e && /Heads up/i.test(l), JSON.stringify([e.slice(0, 60), l]));
    await ctx.close();
  }

  // ── 6. the demo never opens from a copy ──
  {
    const P = H.fixture();
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: P, query: '?client=demo', stub: { demo: P, library: H.library() } });
    const c = await p.evaluate(() => (window.__STUB.calls || []).filter(x => x === 'rpc:get_program').length);
    C.check('the demo asks the server, never a copy', c >= 1 && !(await p.evaluate(() => !!PLAN_OFFLINE)), String(c));
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
