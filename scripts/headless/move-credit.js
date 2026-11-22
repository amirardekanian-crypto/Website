// Court Log counts toward Steps (stage121, 2026-11-22): node scripts/headless/move-credit.js
//
// An activity on Your weeks adds round(minutes x MET / 3.5) x 100 steps to that day's Steps, capped at 70% of the target. The typed
// number is never changed: the engine reads HAB_VIEW (the log plus the credit), the − / + / number box edit HAB_LOG, and only HAB_LOG is
// saved. What this holds: the row says what the activity added and shows the typed number; what is left and the tick use the total; a +
// saves the typed number plus one step, never the credit; a day before 2026-11-22 gets nothing; Farsi; no page errors.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);   // the pages here run in UTC
const T = at(0);

function weeks(days) {
  return { n: 1, from: at(-3), to: at(31), current: true, weeks: [{ w: 1, from: at(-3), to: at(3), plan: 3, done: 0, held: false, now: true, days }] };
}
async function open(browser, o) {
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', stub: { fiveWeeks: o.fw }, seed: { _hab_cfg: CFG, _hab_log: o.log || {} }, opts: {} });
  await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
  await p.waitForTimeout(900);
  return { ctx, p };
}
const row = p => p.evaluate(() => {
  const w = document.querySelector('.hb-wrap[data-h="steps"]');
  return w && { sub: (w.querySelector('.hb-sub') || {}).textContent, mv: (w.querySelector('.hb-mv') || {}).textContent,
    now: (w.querySelector('.hb-now') || {}).textContent, done: !!w.querySelector('.hb-row.is-done'),
    val: window.AAHabits.valOf(window.AAHabits.TKEY(), 'steps') };
});

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  // ── 1. an hour of tennis on a day with 2,000 typed steps ──
  {
    const { ctx, p } = await open(browser, { fw: weeks([{ day: T, k: 'court', kind: 'tennis', title: 'Tennis', mins: 60, effort: 'normal', id: 'a1' }]), log: { [T]: { steps: 2000 } } });
    const r = await row(p);
    t.check('the row says what the activity added, and shows the typed number', r && r.mv === '+7,000 from Tennis' && r.now === '2,000', JSON.stringify(r));
    t.check('what is left and the scored number use the total (2,000 + 7,000)', r && r.val === 9000 && r.sub === "1,000 steps to go" && !r.done, JSON.stringify(r));
    await p.evaluate(() => habStepOnce('steps', 1));
    await p.waitForTimeout(200);
    const saved = await p.evaluate(k => JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_log'))[k], T);
    const r2 = await row(p);
    t.check('a + saves the typed number plus one step, never the credit', saved && saved.steps === 2500 && r2.now === '2,500' && r2.val === 9500, JSON.stringify([saved, r2]));
    await p.evaluate(() => habSetVal('steps', 3000));
    await p.waitForTimeout(200);
    const r3 = await row(p);
    t.check('3,000 typed + 7,000 credit ticks Steps', r3.done && r3.val === 10000 && r3.now === '3,000', JSON.stringify(r3));
    t.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. two kinds, and the server's first day ──
  {
    const { ctx, p } = await open(browser, { fw: weeks([
      { day: T, k: 'other', kind: 'cycling', title: 'Cycling', mins: 20, effort: 'easy', id: 'b1' },
      { day: T, k: 'court', kind: 'padel', title: 'Padel', mins: 15, effort: 'easy', id: 'b2' },
      { day: '2026-11-21', k: 'court', kind: 'tennis', title: 'Tennis', mins: 60, effort: 'hard', id: 'b3' }]) });
    const r = await row(p);
    // cycling easy: 20 x 4.0 / 3.5 = 22.9 -> 2,300; padel easy: 15 x 5.0 / 3.5 = 21.4 -> 2,100
    t.check('two kinds add up, each to the nearest 100, and the row says "your activity"', r && r.mv === '+4,400 from your activity' && r.val === 4400 && r.now === '0', JSON.stringify(r));
    const old = await p.evaluate(() => moveCreditOn('2026-11-21'));
    t.check('a day before 2026-11-22 carries no credit (forward only, D20)', old === null, JSON.stringify(old));
    const kept = await p.evaluate(() => localStorage.getItem(ATHLETE_ID + '_hab_log'));
    t.check('the credit is never written into the saved log', !/4400/.test(kept || ''), kept);
    await ctx.close();
  }

  // ── 3. in Farsi ──
  {
    const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', stub: { fiveWeeks: weeks([{ day: T, k: 'court', kind: 'tennis', title: 'Tennis', mins: 60, effort: 'normal', id: 'c1' }]) },
      seed: { _hab_cfg: CFG, _hab_log: { [T]: { steps: 2000 } } }, opts: {}, preload: () => localStorage.setItem('aa_lang', 'fa') });
    await p.evaluate(() => { localStorage.setItem('aa_lang', 'fa'); });
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
    await p.waitForTimeout(900);
    const mv = await p.evaluate(() => (document.querySelector('.hb-wrap[data-h="steps"] .hb-mv') || {}).textContent);
    t.check('in Farsi the line reads in Farsi', /قدم از تنیس/.test(mv || ''), mv);
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
