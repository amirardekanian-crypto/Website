// Love All round 2 (2026-10-24), the data fixes of the 2026-10-20 audit, checked the way the athlete meets them.
//   B10  Progress's Body weight row and the Body Weight screen say the SAME change, average to average, with no single date in it.
//   B14  the grey LAST under a set reads the server's history: a new phone with no set log still shows last time, in the measure last time used.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-data.js
'use strict';
const H = require('./lib');

const DAY = 86400000;
const day = n => H.past(n);
const t = H.checker();

const WT = { [day(33)]: { kg: 81.4, t: 1 }, [day(18)]: { kg: 80.6, t: 2 }, [day(7)]: { kg: 80.1, t: 3 }, [day(1)]: { kg: 79.8, t: 4 } };

// ═════════ B10: one change, on the row and on the page ═════════
async function b10(browser) {
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, tz: 'UTC', prog: H.fixture(), seed: { _hab_wt: WT } });
  await p.evaluate(() => goTo('plan'));
  await p.waitForTimeout(600);
  const row = await p.evaluate(() => (document.querySelector('#weight-row-wrap .hrow') || {}).innerText || '');
  await p.evaluate(() => goWeight());
  await p.waitForTimeout(600);
  const page = await p.evaluate(() => (document.querySelector('#wt-board') || {}).innerText || '');
  const num = s => { const m = s.match(/[0-9]+\.[0-9]/g) || []; return m; };
  const rowDelta = (row.match(/[▲▼]\s*([0-9.]+) kg/) || [])[1];
  const pageDelta = (page.match(/[+−]\s*([0-9.]+)/) || [])[1];
  t.check('B10: the row shows a change in kg', !!rowDelta, row);
  t.check('B10: the row and the Body Weight screen show the same change', !!rowDelta && rowDelta === pageDelta, JSON.stringify([rowDelta, pageDelta, page]));
  t.check('B10: the row names no single date ("since 17 Sep")', !/since/i.test(row) && !/\b\d{1,2}\s+[A-Z][a-z]{2}\b/.test(row.split('\n').slice(1).join(' ')), row);
  t.check('B10: the row says it is the average', /average/i.test(row), row);
  t.check('B10: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ B14: LAST from the server history ═════════
const SQUAT = 'Barbell Back Squat';
const lastBoxes = p => p.evaluate(nm => {
  const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === nm);
  if (c.classList.contains('collapsed')) toggleExpand(c);
  return [...c.querySelectorAll('.ex-set-row')].map(r => ({ ph: r.querySelector('.ex-set-weight').placeholder, show: r.querySelector('.ex-set-wbox').classList.contains('show-last'), v: r.querySelector('.ex-set-weight').value }));
}, SQUAT);
async function b14(browser) {
  // a new phone: the history is on the server, the phone has never logged a set
  let { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture() });
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(500);
  let rows = await lastBoxes(p);
  t.check('B14: no set log on the phone: every set still shows LAST 70 from the server history', rows.length >= 3 && rows.every(r => r.show && r.ph === '70'), JSON.stringify(rows));
  t.check('B14: …and the box itself is still empty (nothing is recorded for the athlete)', rows.every(r => r.v === ''), JSON.stringify(rows));
  t.check('B14: no page errors (new phone)', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();

  // the server wins over a stale phone copy, set by set, and a pound history names its measure
  const hist = [{ completed_on: H.past(3), day: '1', readiness: 4, log: [
    { ex: SQUAT, block: 'Strength', reps: 6, note: '', sets: [{ w: '45 lb', n: 6, r: '7', d: true }, { w: '50 lb', n: 6, r: '7', d: true }] }] }];
  ({ ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist,
    seed: { ['_setlog_' + SQUAT.replace(/ /g, '_')]: [{ w: '', n: '', r: '', d: false, lw: '60' }, { w: '', n: '', r: '', d: false, lw: '60' }, { w: '', n: '', r: '', d: false, lw: '60' }] } }));
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(500);
  rows = await lastBoxes(p);
  t.check('B14: the server wins over the old phone copy, set by set, in the measure last time used (kg box, "45 lb" named)', rows[0] && rows[0].ph === '45 lb' && rows[1] && rows[1].ph === '50 lb', JSON.stringify(rows));
  t.check('B14: a third set (only two last time) shows the last weighed set', rows[2] && rows[2].ph === '50 lb', JSON.stringify(rows));
  t.check('B14: no page errors (pounds)', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();

  // no server history at all: the phone's own LAST is still there
  ({ ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [],
    seed: { ['_setlog_' + SQUAT.replace(/ /g, '_')]: [{ w: '', n: '', r: '', d: false, lw: '60' }] } }));
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(500);
  rows = await lastBoxes(p);
  t.check('B14: no server history: the phone copy of LAST 60 still shows', rows[0] && rows[0].show && rows[0].ph === '60', JSON.stringify(rows));
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  await b10(browser);
  await b14(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
