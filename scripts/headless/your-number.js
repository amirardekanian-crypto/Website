// #130 Your Number (round 12 'On the Move', 2026-11-23): node scripts/headless/your-number.js
//
// Amir sets an athlete's Steps target in coach.html (stage125). The phone reads it (get_steps_targets, kept as <id>_steps_tgt) and scores
// Steps the server's way: (typed + credit capped at 70% of the day's target) x global / the day's target. What this holds: the row says
// "Walk 7,000 steps" and what is left of it in real steps; hitting it ticks Steps; the credit is capped at 70% of the athlete's own number;
// a day before the target started is scored as before; the typed number is what is saved; coach.html's usual and suggestion.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);   // the pages here run in UTC
const T = at(0);
const TGT = { global: 10000, rows: [{ from: T, steps: 7000 }] };
function weeks(acts) {
  return { n: 1, from: at(-6), to: at(28), current: true, acts, weeks: [{ w: 1, from: at(-6), to: at(0), plan: 3, done: 0, held: false, now: true,
    days: acts.map(a => Object.assign({ k: 'court', title: 'Padel' }, a)) }] };
}
async function open(browser, log, acts) {
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', stub: { fiveWeeks: weeks(acts || []) }, seed: { _hab_cfg: CFG, _hab_log: log, _steps_tgt: TGT } });
  await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
  await p.waitForTimeout(900);
  await p.evaluate(() => paintTodayCard());
  return { ctx, p };
}
const row = p => p.evaluate(() => {
  const w = document.querySelector('.hb-wrap[data-h="steps"]');
  return w && { name: w.querySelector('.hb-name').textContent, sub: (w.querySelector('.hb-sub') || {}).textContent, mv: (w.querySelector('.hb-mv') || {}).textContent || '',
    now: (w.querySelector('.hb-now') || {}).textContent, done: !!w.querySelector('.hb-row.is-done'), val: window.AAHabits.valOf(window.AAHabits.TKEY(), 'steps') };
});

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  {
    const { ctx, p } = await open(browser, { [T]: { steps: 5000 }, [at(-1)]: { steps: 5000 } });
    const r = await row(p);
    t.check('the row says their number and what is left of it in real steps', r && r.name === 'Walk 7,000 steps' && r.sub === '2,000 steps to go' && r.now === '5,000' && !r.done, JSON.stringify(r));
    t.check('the scorers see it scaled to the global target (5,000 of 7,000 = 7,143 of 10,000)', r && r.val === 7143, r && r.val);
    const y = await p.evaluate(d => window.AAHabits.valOf(d, 'steps'), at(-1));
    t.check('a day before the target started is scored as before (forward only)', y === 5000, y);
    await p.evaluate(() => habSetVal('steps', 7000));
    await p.waitForTimeout(200);
    const r2 = await row(p);
    const saved = await p.evaluate(k => JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_log'))[k].steps, T);
    t.check('7,000 typed ticks Steps, scored as a full 10,000; the typed 7,000 is what is saved', r2.done && r2.val === 10000 && r2.sub === 'Done' && saved === 7000, JSON.stringify([r2, saved]));
    t.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // padel, 60 min hard: 60 x 7.0 / 3.5 = 120 -> 12,000 raw, capped at 70% of 7,000 = 4,900
    const { ctx, p } = await open(browser, { [T]: { steps: 1000 } }, [{ day: T, kind: 'padel', mins: 60, effort: 'hard', id: 'a1' }]);
    const r = await row(p);
    t.check('the credit is capped at 70% of their own number: +4,900, the big number 5,900 in real steps, 1,100 to go', r && r.mv === '1,000 walked + 4,900 from Padel' && r.now === '5,900' && r.sub === '1,100 steps to go'
      && r.val === Math.round((1000 + 4900) * 10000 / 7000), JSON.stringify(r));
    await ctx.close();
  }

  // ── coach.html: the usual and the suggestion ──
  {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'coach.html'), 'utf8');
    const grab = re => { const m = re.exec(src); if (!m) throw new Error('coach.html: not found ' + re); return m[0]; };
    const ctx = vm.createContext({});
    vm.runInContext(["function pad2(n) { return String(n).padStart(2, '0'); }", grab(/function jparse\(v\) \{[^\n]*\}/), grab(/function dkey\([^\n]*\n?[^\n]*/), grab(/function addDays\(iso, n\) \{[^\n]*\}/),
      grab(/function stepsUsualC\(blob, id, today\) \{[\s\S]*?\n\}/), grab(/function stepsSuggestC\(usual\) \{[^\n]*\}/)].join('\n'), ctx);
    const log = {}; [1, 2, 3, 4, 5, 6].forEach((i, j) => { log[vm.runInContext(`addDays('2026-11-23', -${i})`, ctx)] = { steps: [6000, 7000, 8000, 5000, 9000, 7500][j] }; });
    log['2026-11-23'] = { steps: 20000 };   // today is left out
    ctx.blob = { x_hab_log: JSON.stringify(log) };
    const u = vm.runInContext("stepsUsualC(blob, 'x', '2026-11-23')", ctx);
    const sug = vm.runInContext(`stepsSuggestC(${u.usual})`, ctx);
    t.check('coach.html: the usual is the middle of the last 14 days, today left out', u.n === 6 && u.usual === 7250, JSON.stringify(u));
    t.check('coach.html: the suggestion is the usual plus 10%, to the nearest 500, 6,000 to 12,000', sug === 8000 && vm.runInContext('stepsSuggestC(3000)', ctx) === 6000 && vm.runInContext('stepsSuggestC(20000)', ctx) === 12000, sug);
    t.check('coach.html: the panel sits on the habits tab and sets the number through coach_set_steps_target', /\$\{stepsTargetPanelC\(D\)\}/.test(src) && /sb\.rpc\('coach_set_steps_target'/.test(src) && /'steps_targets',/.test(src));
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
