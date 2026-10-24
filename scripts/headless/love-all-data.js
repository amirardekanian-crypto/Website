// Love All round 2 (2026-10-24), the data fixes of the 2026-10-20 audit, checked the way the athlete meets them.
//   B10  Progress's Body weight row and the Body Weight screen say the SAME change, average to average, with no single date in it.
//   B14  the grey LAST under a set reads the server's history: a new phone with no set log still shows last time, in the measure last time used.
//   B19  History's "low day" tag follows the level the day was trained at (the check-in's plan as filed), not the raw score.
//   B21  the demo's Progress never says "Nothing here yet" (a real first-timer's still does).
//   B31  Progress's cycle cover gives its dates day first ("13 Oct – 16 Nov"), and so does the finished line.
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

// ═════════ B19: the tag follows the level trained ═════════
async function b19(browser) {
  const ses = (ago, readiness, ready) => ({ completed_on: H.past(ago), day: '1', readiness, ready, log: [
    { ex: SQUAT, block: 'Strength', reps: 6, note: '', sets: [{ w: '70', n: 6, r: '7', d: true }, { w: '70', n: 6, r: '7', d: true }] }] });
  const hist = [
    ses(2, 4.5, { sleep: 2, energy: 2, stress: 2, overall: 2, soreness: 4, composite: 2.4, level: 'amber', drop: 1, asWritten: false }),   // trained lower, a high raw number: tagged
    ses(4, 2, { sleep: 3, energy: 3, stress: 3, overall: 3, soreness: 1, composite: 2, level: 'green', sore: 'skip', drop: 0 }),             // a sore day at a normal level, a low raw number: no tag
    ses(6, 2, { sleep: 2, energy: 2, stress: 2, overall: 2, soreness: 2, composite: 2, level: 'amber', drop: 1, asWritten: true }),          // the lower day was turned down: trained as written, no tag
    ses(8, 3, { sleep: 1, energy: 1, stress: 1, overall: 1, soreness: 3, composite: 1, level: 'red', drop: 1, asWritten: false }),           // a short day: tagged
    ses(10, 1.5, null),                                                                                                                   // an old check-in with no plan: no tag
  ];
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist });
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(400);
  await p.evaluate(nm => { const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === nm); if (c.classList.contains('collapsed')) toggleExpand(c); openHistorySheet(c); }, SQUAT);
  await p.waitForTimeout(500);
  const rows = await p.evaluate(() => [...document.querySelectorAll('#hist-overlay .hs-row .hs-d')].map(e => e.textContent.trim()));
  const tag = i => /low day/i.test(rows[i] || '');
  t.check('B19: five rows in History', rows.length === 5, JSON.stringify(rows));
  t.check('B19: a day trained lower shows the tag even with a high raw score', tag(0), rows[0]);
  t.check('B19: a sore day at a normal level shows no tag even with a low raw score', !tag(1), rows[1]);
  t.check('B19: a lower day trained as written shows no tag', !tag(2), rows[2]);
  t.check('B19: a short day shows the tag', tag(3), rows[3]);
  t.check('B19: an old check-in with no plan shows no tag', !tag(4), rows[4]);
  t.check('B19: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ B21: the demo's Progress ═════════
async function b21(browser) {
  const P = H.fixture();
  let { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: P, hist: [], query: '?client=demo', stub: { demo: P, library: H.library() } });
  await p.evaluate(() => goTo('plan'));
  await p.waitForTimeout(500);
  let m = await p.evaluate(() => ({ demo: !!window.IS_DEMO, none: !hasFinishedASession(), text: document.getElementById('dayone-wrap').innerText, shown: document.querySelector('.screen.active').id }));
  t.check('B21: the demo is open on Progress with no finished session (the case that said it)', m.demo && m.none && m.shown === 'screen-plan', JSON.stringify(m));
  t.check('B21: Progress in the demo has no "Nothing here yet" line', !/nothing here yet/i.test(m.text) && !/nothing here yet/i.test(await p.evaluate(() => document.querySelector('.screen.active').innerText)), JSON.stringify(m.text));
  t.check('B21: no page errors (demo)', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
  ({ ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [] }));
  await p.evaluate(() => goTo('plan'));
  await p.waitForTimeout(500);
  m = await p.evaluate(() => ({ none: !hasFinishedASession(), text: document.getElementById('dayone-wrap').innerText }));
  t.check('B21: a real first-timer still gets the line', m.none && /nothing here yet/i.test(m.text), JSON.stringify(m));
  await ctx.close();
}

// ═════════ B31: day first ═════════
async function b31(browser) {
  const P = H.fixture();
  const cur = P.cycles[P.currentCycleIndex];
  cur.startDate = '2026-10-13'; cur.endDate = '2026-11-16';
  let { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, tz: 'UTC', prog: P });
  await p.evaluate(() => goTo('plan'));
  await p.waitForTimeout(500);
  let d = await p.evaluate(() => { const e = document.querySelector('.cyc-dates'); return e ? e.textContent.trim() : null; });
  t.check('B31: the cover reads 13 Oct – 16 Nov', d && /^13 Oct – 16 Nov/.test(d), d);
  t.check('B31: the cover is not month first', d && !/Oct 13|Nov 16/.test(d), d);
  const cap = await p.evaluate(() => { const e = document.querySelector('.cyc-dates'); return e ? getComputedStyle(e).textTransform : null; });
  t.check('B31: the cover keeps its upper case', cap === 'uppercase', cap);
  t.check('B31: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  await b10(browser);
  await b14(browser);
  await b19(browser);
  await b21(browser);
  await b31(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
