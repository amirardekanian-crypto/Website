// #152 Best Week Yet and #155 Long Day (round 15 'Over the Line', 2026-11-24): node scripts/headless/best-week.js
//
// 152: Your weeks' Move line wears a clay "Best week yet" when this week's Move minutes beat every earlier week on the card, once there are three
// earlier weeks to beat; never with fewer, never on a tie, never when it is lower. 155: a crew activity card of 120 minutes or more says "Long day".
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
// weeks: totals oldest first, the last one is this week
function fw(totals) {
  const n = totals.length, weeks = totals.map((t, i) => {
    const from = at(-6 - 7 * (n - 1 - i));
    return { w: i + 1, from, to: at(-7 * (n - 1 - i)), plan: 3, done: 0, held: false, now: i === n - 1, days: [], move: { total: t, plan: t, lib: 0, court: 0, other: 0, walk: 0, xp: 0 } };
  });
  return { n: 1, from: weeks[0].from, to: at(28), current: true, weeks, acts: [], move: { line: 300, mark: 150, xp: 150 } };
}
async function bestOn(browser, totals) {
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', stub: { fiveWeeks: fw(totals) }, seed: { _hab_cfg: CFG, _hab_log: {} } });
  await p.evaluate(async () => { if (typeof loadFiveWeeks === 'function') await loadFiveWeeks(); });
  await p.evaluate(() => goTo('plan'));
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => { const b = document.querySelector('#fw-wrap .fw-mv-best'); return { best: b ? b.textContent : null, bg: b ? getComputedStyle(b).backgroundColor : null, h: !!document.querySelector('#fw-wrap .fw-mv-h') }; });
  r.errs = p.errs.slice();
  await ctx.close();
  return r;
}

(async () => {
  const t = H.checker();
  const browser = await H.launch();
  const a = await bestOn(browser, [180, 240, 210, 260]);
  t.check('this week beats the three before it: Best week yet, in clay', a.h && a.best === 'Best week yet' && a.bg === 'rgb(199, 85, 47)', JSON.stringify(a));
  const b = await bestOn(browser, [180, 240, 260, 260]);
  t.check('a tie is not a best', b.h && b.best === null, JSON.stringify(b));
  const c = await bestOn(browser, [240, 300]);
  t.check('fewer than three earlier weeks: nothing yet', c.h && c.best === null, JSON.stringify(c));
  const d = await bestOn(browser, [180, 240, 210, 200, 90]);
  t.check('lower than an earlier week: nothing', d.h && d.best === null, JSON.stringify(d));
  t.check('no page errors', [a, b, c, d].every(x => x.errs.length === 0), JSON.stringify([a.errs, b.errs]));

  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', seed: { _hab_cfg: CFG, _hab_log: {} } });
  const ld = await p.evaluate(() => [119, 120, 240].map(m => { const d = document.createElement('div'); d.innerHTML = crewActCardHtml({ kind: 'padel', mins: m }); return !!d.querySelector('.cr-long') && d.querySelector('.cr-long').textContent; }));
  t.check('Long day from 120 minutes, not at 119', ld[0] === false && ld[1] === 'Long day' && ld[2] === 'Long day', JSON.stringify(ld));
  await ctx.close();
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
