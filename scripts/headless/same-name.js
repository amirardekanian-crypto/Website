// The same name twice in one day (Amir, 2026-11-23: "can you fix this for ever?"): node scripts/headless/same-name.js
//
// Saeed's Day 1 has a 5 min Stationary Bike to warm up and a 10 min one at the end; his Day 3 has a 3-round bike. The set log
// was kept per NAME, so the two Day 1 cards shared one log (a tick on the warm-up ticked the finisher too) and the report wrote
// the Day 3 bike's leftover rows as "Set 2: skipped · Set 3: skipped" under both. Now a second card of a name on a day keeps its
// own log, "<name> (2)" (logNameOf(), exLogName()), and the record holds only as many sets as the card has. Checked here:
//   1. The second card carries data-occ="2"; the first and the other day's card do not.
//   2. A tick on the warm-up bike leaves the finisher unticked, through a reload too; the day says the finisher is missing.
//   3. The record and the report: no "skipped" rows carried from the 3-round bike; the warm-up is one set done, and the
//      finisher is the one tagged skipped while it is not done.
//   4. Both ticked: both ✓ in the report, the day is Complete.
//   5. Done keeps both cards' own logs in the day's copy, and the finished day still shows both done after a reload.
//   6. The other day's 3-round bike still has its 3 rows.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const BIKE = 'Stationary Bike';
function prog() {
  const P = H.fixture();
  const [d1, d2] = P.workouts.days;
  d1.blocks[0].exercises.unshift({ name: BIKE, exId: 'stationary-bike', type: 'simple', rx: { time: '5 min' } });
  d1.blocks.push({ title: 'Aerobic Base', exercises: [{ name: BIKE, exId: 'stationary-bike', type: 'simple', rx: { time: '10 min', rpe: 6 } }] });
  d2.blocks.push({ title: 'Conditioning', exercises: [{ name: BIKE, exId: 'stationary-bike', type: 'standard', rx: { sets: 3, time: '3 min', rpe: 7, rest: 90 } }] });
  return P;
}
const bikes = day => `[...document.querySelectorAll('#day${day} .checklist-item')].filter(c => c.querySelector('.item-name').textContent.trim() === ${JSON.stringify(BIKE)})`;
const report = p => p.evaluate(B => {
  const r = buildSessionData('1');
  const lines = r.summary.split('\n');
  const at = lines.map((l, i) => l.startsWith('• ' + B) ? i : -1).filter(i => i >= 0);
  return { entries: r.log.filter(e => e.ex === B).map(e => e.sets.map(s => s.d)),
    heads: at.map(i => lines[i]), rows: at.map(i => lines.slice(i + 1).filter((l, k, a) => /^\s+Set \d/.test(l) && a.slice(0, k).every(x => /^\s+Set \d/.test(x)))),
    status: r.statusLabel, missing: r.dayStatus.missing.map(m => m.key || m.name) };
}, BIKE);

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  try {
    // The shared log as Saeed's phone held it: the 3-round bike's length.
    const left = [1, 2, 3].map(() => ({ w: '', n: '', r: '', d: false }));
    let { ctx, p } = await H.openProgram(browser, { prog: prog(), seed: { _setlog_Stationary_Bike: left } });
    await p.evaluate(() => { goTo('home'); openDayView('1'); });
    await p.waitForTimeout(500);

    const occ = await p.evaluate(`({ d1: ${bikes(1)}.map(c => c.dataset.occ || ''), d2: ${bikes(2)}.map(c => c.dataset.occ || '') })`);
    C.check('1. the second bike of Day 1 is occurrence 2, the first and Day 2\'s are plain', JSON.stringify(occ) === JSON.stringify({ d1: ['', '2'], d2: [''] }), JSON.stringify(occ));

    await p.evaluate(`(() => { const [a] = ${bikes(1)}; toggleCheckOnly(a, '1'); try { hideAaToast(); } catch (e) {} })()`);
    await p.waitForTimeout(300);
    let ticks = await p.evaluate(`${bikes(1)}.map(c => c.classList.contains('checked'))`);
    C.check('2a. a tick on the warm-up bike leaves the finisher unticked', JSON.stringify(ticks) === '[true,false]', JSON.stringify(ticks));
    let r = await report(p);
    C.check('2b. the day names the finisher as missing, by its own log', r.missing.includes(BIKE + ' (2)') && !r.missing.includes(BIKE), JSON.stringify(r.missing));
    // An untouched card was never stored, so it records no set (as any untouched exercise always has); the 3 shared rows are gone.
    C.check('3a. the record: the warm-up one set done, the untouched finisher nothing', JSON.stringify(r.entries) === '[[true],[]]', JSON.stringify(r.entries));
    C.check('3b. the report: no rows carried from the 3-round bike', r.rows[0].length === 1 && r.rows[1].length === 0, JSON.stringify(r.rows));
    C.check('3c. the report tags the finisher skipped and the warm-up done', /\(✓\)$/.test(r.heads[0]) && /\(skipped\)$/.test(r.heads[1]), JSON.stringify(r.heads));

    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await p.waitForTimeout(400);
    ticks = await p.evaluate(`${bikes(1)}.map(c => c.classList.contains('checked'))`);
    C.check('2c. after a reload the finisher is still unticked', JSON.stringify(ticks) === '[true,false]', JSON.stringify(ticks));

    // Finish the day: every card ticked (the rest by its ring), rated, Done.
    await p.evaluate(() => { goTo('home'); openDayView('1'); });
    await p.waitForTimeout(400);
    await p.evaluate(() => {
      document.querySelectorAll('#day1 .checklist-item').forEach(c => { if (!c.classList.contains('checked')) toggleCheckOnly(c, '1'); });
      document.querySelectorAll('#day1 .checklist-item .rpe-row').forEach(row => { const b = row.querySelector('.rpe-btn[data-rpe="7"]'); if (b && !b.classList.contains('selected')) b.click(); });
      document.querySelectorAll('#day1 .checklist-item[data-sets]').forEach(c => {
        if (c.classList.contains('round-group')) return;
        const nm = logNameOf(c), t = parseInt(c.dataset.sets, 10) || 1;
        saveSetLogValue(nm, loadSetLog(nm, t, '1').map(s => Object.assign({}, s, { w: s.w || '20', r: s.r || '7', d: true })), '1');
      });
      try { hideAaToast(); } catch (e) {}
    });
    await p.waitForTimeout(300);
    r = await report(p);
    C.check('4a. both ticked: both bikes ✓, one set each', JSON.stringify(r.entries) === '[[true],[true]]' && r.heads.every(h => /\(✓\)$/.test(h)), JSON.stringify(r));
    C.check('4b. the day is Complete', /^Complete/.test(r.status), r.status);

    await p.click('#confirm-1 .complete-rpe-btn[data-rpe="7"]'); await p.waitForTimeout(150);
    await p.click('#confirm-1 .confirm-btn'); await p.waitForTimeout(900);
    const copy = await p.evaluate(B => {
      const dl = JSON.parse(localStorage.getItem(ATHLETE_ID + '_donelog_d1') || '{}');
      return { a: (dl.sets || {})[B], b: (dl.sets || {})[B + ' (2)'] };
    }, BIKE);
    C.check('5a. Done keeps both cards\' own logs in the day\'s copy', copy.a && copy.b && copy.a.length === 1 && copy.b.length === 1 && copy.a[0].d && copy.b[0].d, JSON.stringify(copy));

    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await p.waitForTimeout(400);
    ticks = await p.evaluate(`${bikes(1)}.map(c => c.classList.contains('checked'))`);
    C.check('5b. the finished day still shows both bikes done after a reload', JSON.stringify(ticks) === '[true,true]', JSON.stringify(ticks));
    const d2 = await p.evaluate(`(() => { const [c] = ${bikes(2)}; return loadSetLog(logNameOf(c), parseInt(c.dataset.sets, 10), '2').length; })()`);
    C.check('6. Day 2\'s 3-round bike still has 3 rows', d2 === 3, d2);
    C.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  } finally { await browser.close(); }
  process.exit(C.report() ? 1 : 0);
})();
