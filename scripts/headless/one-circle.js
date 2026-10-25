// One circle, everywhere, and Still to log (Amir, 2026-10-25): node scripts/headless/one-circle.js
//
// "some people are used to ticking the circle for the movement to be done, so they are missing the warm-up and they are missing
// the circuit styles because they dont have a circle". Direction A: a warm-up row has a set's circle on the right, a circuit one
// per round, and the ⓘ follows the name ("move the i close to the movement so the hit box doesnt collide"). Then the finish card:
// "it doesnt say what is missing, if its an rpe, if its a weight or a set ... and when its ticked, it should be removed".
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');
const PAIR = 'Row & Press Pair', PRIMER = 'Primer Pair', SQ = 'Barbell Back Squat';

function prog() {
  const P = H.fixture();
  const day = P.workouts.days[0];
  day.blocks[0].exercises.push({ type: 'circuit', name: PRIMER, warmup: true, rx: { rounds: 2 },
    items: [{ name: 'Band Pull-Apart', rx: { reps: 12 } }, { name: 'Wall Slide', rx: { reps: 8 } }] });
  day.blocks.push({ title: 'Accessory', exercises: [{ type: 'circuit', name: PAIR, rx: { rounds: 2, rpe: 8, rest: 90 },
    items: [{ name: 'Machine Plate-Loaded Row', rx: { reps: 10 } }, { name: 'Dumbbell Bench Press', rx: { reps: 10 } }] }] });
  return P;
}
const card = n => `[...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === ${JSON.stringify(n)})`;

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog(), hist: [], stub: { library: H.library() } });
  p.setDefaultTimeout(8000);
  await p.evaluate(() => { localStorage.setItem(ATHLETE_ID + '_onb_veteran', '1'); openDayView('1'); });
  await p.waitForTimeout(400);

  // 1. the warm-up row: a circle on the right, the ⓘ after the name, apart
  const w = await p.evaluate(`(() => {
    const c = ${card('Rowing')}, t = c.querySelector('.ex-side .row-tick');
    const r = t && t.getBoundingClientRect();
    return { tick: !!t, size: r ? Math.round(r.width) : 0 };
  })()`);
  C.check('a warm-up row has a 44 px circle on the right', w.tick && w.size === 44, JSON.stringify(w));
  await p.evaluate(`${card('Rowing')}.querySelector('.row-tick').scrollIntoView({ block: 'center' })`);
  await p.click('#day-view .row-tick');
  await p.waitForTimeout(300);
  C.check('tapping it ticks the warm-up', await p.evaluate(`${card('Rowing')}.classList.contains('checked')`));
  // the ⓘ of a lift: inside the name row, not in the right column, and its box clear of the right column
  const ab = await p.evaluate(`(() => {
    const c = ${card(SQ)}, a = c.querySelector('.ex-about');
    if (!a) return { none: true };
    const ra = a.getBoundingClientRect(), rm = c.querySelector('.item-main').getBoundingClientRect();
    return { inName: !!a.closest('.item-name-row'), right: Math.round(rm.right - ra.right) };
  })()`);
  C.check('a lift\'s ⓘ follows its name (in the name row), not the right column', ab.none || (ab.inName && ab.right > 40), JSON.stringify(ab));

  // 2. a circuit: a circle per round, the number ticks them all
  await p.evaluate(`(() => { const c = ${card(PAIR)}; if (c.classList.contains('collapsed')) toggleExpand(c); c.scrollIntoView({ block: 'center' }); })()`);
  await p.waitForTimeout(300);
  const rc = await p.evaluate(`${card(PAIR)}.querySelectorAll('.rt-row .round-tick').length`);
  C.check('a 2-round circuit has two round circles', rc === 2, String(rc));
  await p.evaluate(`${card(PAIR)}.querySelector('.rt-row[data-round="0"] .round-tick').click()`);
  await p.waitForTimeout(200);
  let s = await p.evaluate(`(() => { const c = ${card(PAIR)}; return { checked: c.classList.contains('checked'), on: [...c.querySelectorAll('.rt-row')].map(r => r.classList.contains('on')),
    rpe: [...c.querySelectorAll('.rt-list .rpe-row')].map(r => r.classList.contains('visible')) }; })()`);
  C.check('round 1 ticked: on, the circuit not done yet', !s.checked && s.on[0] && !s.on[1], JSON.stringify(s));
  await p.evaluate(`${card(PAIR)}.querySelector('.rt-row[data-round="1"] .round-tick').click()`);
  await p.waitForTimeout(200);
  s = await p.evaluate(`(() => { const c = ${card(PAIR)}; return { checked: c.classList.contains('checked'), on: [...c.querySelectorAll('.rt-row')].map(r => r.classList.contains('on')) }; })()`);
  C.check('both rounds ticked: the circuit is done', s.checked && s.on.every(Boolean), JSON.stringify(s));
  const kept = await p.evaluate(`JSON.parse(localStorage.getItem(setLogKey(${JSON.stringify(PAIR)}))).map(x => x.d)`);
  C.check('the rounds are kept in the circuit\'s set log', JSON.stringify(kept) === '[true,true]', JSON.stringify(kept));
  // the primer's number ticks both its rounds
  await p.evaluate(`onCheckBoxTap({ stopPropagation() {} }, ${card(PRIMER)}, '1')`);
  await p.waitForTimeout(200);
  const pr = await p.evaluate(`(() => { const c = ${card(PRIMER)}; return { checked: c.classList.contains('checked'), on: [...c.querySelectorAll('.rt-row')].map(r => r.classList.contains('on')) }; })()`);
  C.check('a circuit\'s number ticks every round', pr.checked && pr.on.length === 2 && pr.on.every(Boolean), JSON.stringify(pr));

  // 3. Still to log: tick every set of the lifts as written, so the card asks for the rating
  await p.evaluate(() => { document.querySelectorAll('#day-view .checklist-item[data-day="1"]').forEach(c => {
    if (c.classList.contains('round-group') || !c.querySelector('.ex-log')) return;
    setAllSetsDone(c, true); c.classList.add('checked'); }); saveState(); updateProgress('1'); });
  await p.waitForTimeout(300);
  const miss = () => p.evaluate(() => [...document.querySelectorAll('#confirm-1 .cf-miss-row')].map(b =>
    [b.querySelector('.cf-miss-nm').textContent, ...[...b.querySelectorAll('.cf-miss-what')].map(x => x.textContent)].join(' | ')));
  let m = await miss();
  const sq = m.find(x => x.startsWith(SQ)) || '';
  C.check('the ready card lists Still to log', await p.evaluate(() => !!document.querySelector('#confirm-1.ready .cf-miss-k')), JSON.stringify(m));
  C.check('the squat says no weight and no effort on sets 1 to 4', /No weight on sets 1, 2, 3 and 4/.test(sq) && /No effort on sets 1, 2, 3 and 4/.test(sq), sq);
  C.check('the circuit says no effort on rounds 1 and 2', m.some(x => x.startsWith(PAIR) && /No effort on rounds 1 and 2/.test(x)), JSON.stringify(m));
  C.check('the primer (warm-up, no rating) and the ticked warm-up row are not listed', !m.some(x => x.startsWith(PRIMER) || x.startsWith('Rowing')), JSON.stringify(m));
  // log the squat's weights and efforts: its line goes
  await p.evaluate(`(() => { const c = ${card(SQ)}; const n = ${JSON.stringify(SQ)};
    saveSetLogValue(n, loadSetLog(n, 4, '1').map(s => Object.assign({}, s, { w: '60', r: '7' })), '1'); })()`);
  await p.waitForTimeout(200);
  m = await miss();
  C.check('once the squat is logged it leaves the list by itself', !m.some(x => x.startsWith(SQ)), JSON.stringify(m));
  // rate the circuit's rounds: its line goes
  await p.evaluate(`(() => { setRpeOn('1', circuitRpeKey(${JSON.stringify(PAIR)}, 1), '8'); setRpeOn('1', circuitRpeKey(${JSON.stringify(PAIR)}, 2), '8'); })()`);
  await p.waitForTimeout(200);
  m = await miss();
  C.check('once both rounds are rated the circuit leaves the list', !m.some(x => x.startsWith(PAIR)), JSON.stringify(m));
  // un-tick a squat set: the line comes back as "Set 4 not ticked"
  await p.evaluate(`(() => { const n = ${JSON.stringify(SQ)}; const l = loadSetLog(n, 4, '1'); l[3].d = false; saveSetLogValue(n, l, '1');
    ${card(SQ)}.classList.remove('checked'); saveState(); updateProgress('1'); })()`);
  await p.waitForTimeout(200);
  // the card is no longer full: it is in progress and says nothing; Stop here (early) asks and lists it
  await p.evaluate(() => { finishEarlyStep('1'); });
  await p.waitForTimeout(200);
  m = await miss();
  C.check('Stop here lists "Set 4 not ticked" on the squat', m.some(x => x.startsWith(SQ) && /Set 4 not ticked/.test(x)), JSON.stringify(m));
  // a tap on the row opens the card
  await p.click('#confirm-1 .cf-miss-row');
  await p.waitForTimeout(400);
  C.check('a tap on the first row opens its card', await p.evaluate(() => { const m = missingToLog('1')[0]; return !!m && !m.card.classList.contains('collapsed'); }));
  C.check('no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close();
  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
