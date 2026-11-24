// The one-time "add your other activity too" under Steps (2026-11-24): node scripts/headless/act-hint.js
//
// The first change to Steps each day opens a small box under the Steps row (Add activity, Got it); it is marked seen for the day the
// moment it opens, so a second tap or a reload that day does not bring it back, but the next day does. An athlete who has logged an
// activity never sees it.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');
const DAY = 86400000, ymd = d => d.toISOString().slice(0, 10), at = n => ymd(new Date(Date.now() + n * DAY));
const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const fw = acts => ({ n: 1, from: at(-3), to: at(3), current: true, acts,
  weeks: [{ w: 1, from: at(-3), to: at(3), plan: 3, done: 0, held: false, now: true, days: acts.map(a => Object.assign({ k: 'court' }, a)) }] });

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const hint = p => p.evaluate(() => { const b = document.querySelector('.ah-wrap'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 900, tz: 'UTC', stub: { fiveWeeks: fw([]) }, seed: { _hab_cfg: CFG, _hab_log: {} } });
    await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
    await p.waitForTimeout(500);
    C.check('no box before Steps is touched', !(await hint(p)), await hint(p));
    await p.evaluate(() => habStepOnce('steps', 1));
    await p.waitForTimeout(300);
    const h1 = await hint(p);
    C.check('the first change to Steps opens it, under Steps, with Add activity and Got it', /Played tennis or padel today\?/.test(h1) && /counts toward your steps/.test(h1) && /Add activity/.test(h1) && /Got it/.test(h1), h1);
    const under = await p.evaluate(() => { const b = document.querySelector('.ah-wrap'), s = document.querySelector('.hb-wrap[data-h="steps"]'); return !!(b && s && s.nextElementSibling === b); });
    C.check('it sits straight under the Steps row', under, under);
    const seen = await p.evaluate(() => localStorage.getItem(ATHLETE_ID + '_act_hint') === window.AAHabits.TKEY());
    C.check('it is marked seen for today the moment it opens', seen, seen);
    await p.evaluate(() => document.querySelector('.ah-no').click());
    await p.waitForTimeout(250);
    C.check('Got it closes it', !(await hint(p)), await hint(p));
    await p.evaluate(() => habStepOnce('steps', 1));
    await p.waitForTimeout(250);
    C.check('a second change does not bring it back', !(await hint(p)), await hint(p));
    await p.reload(); await p.waitForTimeout(800);
    await p.evaluate(() => habStepOnce('steps', 1));
    await p.waitForTimeout(250);
    C.check('nor does a reload the same day', !(await hint(p)), await hint(p));
    await p.evaluate(() => localStorage.setItem(ATHLETE_ID + '_act_hint', '2000-01-01'));   // as if it was shown on an earlier day
    await p.evaluate(() => habStepOnce('steps', 1));
    await p.waitForTimeout(250);
    C.check('the next day it comes back, on the first change to Steps', /Played tennis or padel today\?/.test(await hint(p)), await hint(p));
    C.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 900, tz: 'UTC', stub: { fiveWeeks: fw([{ day: at(-1), kind: 'tennis', mins: 60, effort: 'normal', id: 'a1' }]) }, seed: { _hab_cfg: CFG, _hab_log: {} } });
    await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
    await p.waitForTimeout(500);
    await p.evaluate(() => habStepOnce('steps', 1));
    await p.waitForTimeout(300);
    C.check('an athlete who already logs activity never sees it', !(await hint(p)), await hint(p));
    await ctx.close();
  }
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 900, tz: 'UTC', stub: { fiveWeeks: fw([]) }, seed: { _hab_cfg: CFG, _hab_log: {} } });
    await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
    await p.waitForTimeout(500);
    await p.evaluate(() => habStepOnce('steps', 1));
    await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('.ah-wrap .pt-yes').click());
    await p.waitForTimeout(400);
    const sheet = await p.evaluate(() => ({ open: document.getElementById('hist-overlay').classList.contains('visible'), box: !!document.querySelector('.ah-wrap') }));
    C.check('Add activity opens the Add activity sheet and the box goes', sheet.open && !sheet.box, sheet);
    await ctx.close();
  }
  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
