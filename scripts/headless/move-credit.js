// Court Log counts toward Steps (stage121, 2026-11-22): node scripts/headless/move-credit.js
//
// An activity on Your weeks adds round(minutes x MET / 3.5) x 100 steps to that day's Steps, capped at 70% of the target (the whole target from 2026-11-24, stage127). The typed
// number is never changed: the engine reads HAB_VIEW (the log plus the credit), the − / + / typing box edit HAB_LOG, and only HAB_LOG is
// saved. What this holds: THE BIG NUMBER ON THE ROW IS THE SCORED NUMBER (2026-11-23, direction A "Total first": Tara read 2,000 on the
// button while the server scored 9,000 and said the tennis did not add); the line under it splits walked and activity; what is left and
// the tick use the total; a + saves the typed number plus one step, never the credit; typing types the walked steps; a day before
// 2026-11-22 gets nothing; the live server's answer (stage122 `acts`, a row outside the weeks); an activity added on the phone reaches
// Home at once and is still there after the server's answer; Farsi; no page errors.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);   // the pages here run in UTC
const T = at(0);

function weeks(days, extra) {
  return Object.assign({ n: 1, from: at(-3), to: at(31), current: true, weeks: [{ w: 1, from: at(-3), to: at(3), plan: 3, done: 0, held: false, now: true, days }] }, extra || {});
}
async function open(browser, o) {
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', stub: { fiveWeeks: o.fw }, seed: { _hab_cfg: CFG, _hab_log: o.log || {} }, opts: {} });
  if (!o.natural) await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
  await p.waitForTimeout(900);
  return { ctx, p };
}
const row = p => p.evaluate(() => {
  const w = document.querySelector('.hb-wrap[data-h="steps"]');
  return w && { sub: (w.querySelector('.hb-sub') || {}).textContent, mv: (w.querySelector('.hb-mv') || {}).textContent,
    now: (w.querySelector('.hb-now') || {}).textContent, done: !!w.querySelector('.hb-row.is-done'),
    val: window.AAHabits.valOf(window.AAHabits.TKEY(), 'steps') };
});
// ⚠️ THE GUARD AGAINST THIS KIND OF BUG: on every counted habit's row, the number drawn is the number the engine scores (and the server
// scores the same log through hab_log_credited()). A row that shows one number while another one counts is what Tara hit.
const numbersMatch = p => p.evaluate(() => {
  const A = window.AAHabits, k = A.AKEY(), bad = [];
  document.querySelectorAll('.hb-wrap[data-h]').forEach(w => {
    const hb = A.byId(w.dataset.h), b = w.querySelector('button.hb-now');
    if (!hb || hb.kind !== 'count' || !b) return;
    if (b.textContent.trim() !== A.fmtVal(hb, A.valOf(k, hb.id))) bad.push(hb.id + ': drawn ' + b.textContent.trim() + ', scored ' + A.fmtVal(hb, A.valOf(k, hb.id)));
  });
  return bad;
});

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  // ── 1. an hour of tennis on a day with 2,000 typed steps (Tara, 2026-11-23) ──
  {
    const { ctx, p } = await open(browser, { fw: weeks([{ day: T, k: 'court', kind: 'tennis', title: 'Tennis', mins: 60, effort: 'normal', id: 'a1' }]), log: { [T]: { steps: 2000 } } });
    const r = await row(p);
    t.check('the big number is the day\'s total, and the line splits walked and tennis', r && r.now === '12,000' && r.mv === '2,000 walked + 10,000 from Tennis', JSON.stringify(r));
    t.check('the scored number uses the total (2,000 + 10,000, the whole target since stage127), so Steps is done', r && r.val === 12000 && r.done, JSON.stringify(r));
    t.check('every counted row draws the number that is scored', (await numbersMatch(p)).length === 0, JSON.stringify(await numbersMatch(p)));
    await p.evaluate(() => habStepOnce('steps', 1));
    await p.waitForTimeout(200);
    const saved = await p.evaluate(k => JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_log'))[k], T);
    const r2 = await row(p);
    t.check('a + saves the typed number plus one step, never the credit', saved && saved.steps === 2500 && r2.now === '12,500' && r2.val === 12500
      && r2.mv === '2,500 walked + 10,000 from Tennis', JSON.stringify([saved, r2]));
    await p.evaluate(() => habTypeOpen('steps'));
    const typing = await p.evaluate(() => ({ box: (document.getElementById('hab-type-steps') || {}).value, mv: (document.querySelector('.hb-wrap[data-h="steps"] .hb-mv') || {}).textContent }));
    t.check('typing opens on the walked steps and says what the tennis adds', typing.box === '2500' && typing.mv === 'Type the steps you walked. Tennis adds 10,000.', JSON.stringify(typing));
    await p.evaluate(() => { document.getElementById('hab-type-steps').value = '3000'; habTypeSave('steps'); });
    await p.waitForTimeout(200);
    const r3 = await row(p);
    const saved3 = await p.evaluate(k => JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_log'))[k], T);
    t.check('3,000 typed + 10,000 credit ticks Steps, and the typed 3,000 is what is saved', r3.done && r3.val === 13000 && r3.now === '13,000' && saved3.steps === 3000, JSON.stringify([r3, saved3]));
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
    t.check('two kinds add up, each to the nearest 100, and with nothing typed the line says "your activity"', r && r.mv === '+4,400 from your activity' && r.val === 4400 && r.now === '4,400', JSON.stringify(r));
    const old = await p.evaluate(() => moveCreditOn('2026-11-21'));
    t.check('a day before 2026-11-22 carries no credit (forward only, D20)', old === null, JSON.stringify(old));
    const kept = await p.evaluate(() => localStorage.getItem(ATHLETE_ID + '_hab_log'));
    t.check('the credit is never written into the saved log', !/4400/.test(kept || ''), kept);
    await ctx.close();
  }

  // ── 3. the live server's answer (stage122): `acts` holds a row the weeks do not (a day before the cycle starts), and a plain boot ──
  {
    const fw = weeks([], { from: at(2), weeks: [{ w: 1, from: at(2), to: at(8), plan: 3, done: 0, held: false, now: false, days: [] }],
      acts: [{ day: T, kind: 'tennis', mins: 60, effort: 'normal', id: 'd1' }] });
    const { ctx, p } = await open(browser, { fw, log: { [T]: { steps: 2000 } }, natural: true });
    const r = await row(p);
    t.check('an activity outside the weeks still counts, read from acts on a plain boot', r && r.val === 12000 && r.now === '12,000', JSON.stringify(r));
    await ctx.close();
  }

  // ── 4. an activity added on the phone reaches Home at once, and is still there after the server's own answer ──
  {
    const { ctx, p } = await open(browser, { fw: weeks([]), log: { [T]: { steps: 2000 } } });
    const before = await row(p);
    t.check('before: no line, the typed number', before && before.now === '2,000' && !before.mv, JSON.stringify(before));
    await p.evaluate(() => { openActivitySheet(); actPick('kind', 'tennis'); actPick('mins', 60); actPick('effort', 'normal'); return saveActivity(); });
    await p.waitForTimeout(1200);   // the save, then loadFiveWeeks()'s answer replacing the phone's own copy
    const after = await row(p);
    t.check('after saving an hour of tennis Home shows 12,000 with the split line, after the server answered', after && after.now === '12,000' && after.mv === '2,000 walked + 10,000 from Tennis',
      JSON.stringify(after));
    t.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 5. in Farsi ──
  {
    const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', stub: { fiveWeeks: weeks([{ day: T, k: 'court', kind: 'tennis', title: 'Tennis', mins: 60, effort: 'normal', id: 'c1' }]) },
      seed: { _hab_cfg: CFG, _hab_log: { [T]: { steps: 2000 } } }, opts: {}, preload: () => localStorage.setItem('aa_lang', 'fa') });
    await p.evaluate(() => { localStorage.setItem('aa_lang', 'fa'); });
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
    await p.waitForTimeout(900);
    const mv = await p.evaluate(() => (document.querySelector('.hb-wrap[data-h="steps"] .hb-mv') || {}).textContent);
    t.check('in Farsi the line reads in Farsi', /قدم پیاده/.test(mv || '') && /از تنیس/.test(mv || '') && !/walked/.test(mv || ''), mv);
    await p.evaluate(() => habTypeOpen('steps'));
    await p.waitForTimeout(300);
    const mv2 = await p.evaluate(() => (document.querySelector('.hb-wrap[data-h="steps"] .hb-mv') || {}).textContent);
    t.check('the typing line reads in Farsi too', /بنویس/.test(mv2 || '') && /تنیس/.test(mv2 || '') && !/Type the/.test(mv2 || ''), mv2);
    await ctx.close();
  }

  // ── 6. in Farsi, what is left on every built-in counted habit, one and many (2026-11-23: "1,000 steps to go" read "steps ۱,۰۰۰ مونده",
  //       because the generic "(.+) to go" pattern translates the unit on its own and steps, hours, meals and glasses had no Farsi word) ──
  for (const log of [{ steps: 2000, sleep: 7, fuel: 2, water: 7 }, { steps: 9500, sleep: 5, fuel: 1, water: 2 }]) {
    const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', seed: { _hab_cfg: CFG, _hab_log: { [T]: log } }, opts: {} });
    await p.evaluate(() => { localStorage.setItem('aa_lang', 'fa'); });
    await p.reload(); await p.waitForTimeout(1500);
    const subs = await p.evaluate(() => ['steps', 'sleep', 'fuel', 'water'].map(id => {
      const s = document.querySelector('.hb-wrap[data-h="' + id + '"] .hb-sub');
      return id + ': ' + (s ? s.textContent : '«no row»');
    }));
    t.check('in Farsi every "to go" line is Farsi, unit and all (' + JSON.stringify(log) + ')',
      subs.every(s => /مونده/.test(s) && !/[A-Za-z]/.test(s.split(': ')[1])), JSON.stringify(subs));
    // 2026-11-23 (Amir: "make the big number farsi digits too"): the number on each row is in Persian digits; the typing box is not.
    const nums = await p.evaluate(() => ['steps', 'sleep', 'fuel', 'water'].map(id => (document.querySelector('.hb-wrap[data-h="' + id + '"] .hb-now') || {}).textContent));
    t.check('in Farsi the big number on every row is in Persian digits', nums.every(n => n && /[۰-۹]/.test(n) && !/[0-9]/.test(n)), JSON.stringify(nums));
    await p.evaluate(() => habTypeOpen('steps'));
    await p.waitForTimeout(300);
    const box = await p.evaluate(() => (document.getElementById('hab-type-steps') || {}).value);
    t.check('the typing box keeps the digits the athlete types', /^[0-9]+$/.test(box || ''), JSON.stringify(box));
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
