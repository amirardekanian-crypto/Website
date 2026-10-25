// Love All round 4 (2026-10-24, "Round 4 choices", all direction A): the three card changes, checked the way the athlete meets them.
//   H1  a timed hold's circle counts: tap it and the seconds run down inside it, a tap again stops it and ticks nothing, at 0 it buzzes and
//       the set ticks itself; a "/ side" hold gives "Other side" and counts the second side; Guided's circle does the same, Guided's Done
//       ticks at once; reduced motion keeps the number and draws no moving ring; a rep set's circle is untouched.
//   K2  "kg / hand" over the weight column of a dumbbell or kettlebell lift only (lb / hand in pounds, never for plates).
//   I3  each movement of a circuit has the ⓘ for its Spine entry, 44 px to hit, and a tap on it ticks and folds nothing.
// Serve the repo first (python -m http.server 8851 --bind 127.0.0.1; BASE=http://127.0.0.1:8851; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-cards.js
'use strict';
const H = require('./lib');
const t = H.checker();

const PLANK = 'Side Plank', FRONT = 'Front Plank', SQ = 'Barbell Back Squat';
function holdProg() {
  const P = H.fixture();
  const ex = P.workouts.days[0].blocks[2].exercises;
  ex.find(e => e.name === PLANK).rx = { sets: 2, time: '2 s', side: true, rest: 30 };
  ex.push({ name: FRONT, exId: 'front-plank', type: 'standard', rx: { sets: 2, time: '2 s', rest: 30 } });
  return P;
}
const open = (browser, o = {}) => H.openProgram(browser, Object.assign({ w: 390, h: 844, prog: holdProg(), hist: [], stub: { library: H.library() } }, o));
async function openCard(p, name) {
  await p.evaluate(`(() => { openDayView('1'); const c = ${H.card(name)}; if (c.classList.contains('collapsed')) toggleExpand(c); try { hideAaToast(); } catch (e) {} c.scrollIntoView({ block: 'center' }); })()`);
  await p.waitForTimeout(400);
}
const circle = (p, name, i = 0) => `${H.card(name)}.querySelectorAll('.ex-set-row')[${i}].querySelector('.ex-set-check')`;
const state = (p, name, i = 0) => p.evaluate(`(() => { const b = ${circle(p, name, i)}; const r = b.closest('.ex-set-row'); return { holding: b.classList.contains('holding'), text: b.textContent, done: r.classList.contains('done'), hold: b.style.getPropertyValue('--hold'), label: b.getAttribute('aria-label') }; })()`);
const clickCircle = async (p, name, i = 0) => { await p.evaluate(`${circle(p, name, i)}.scrollIntoView({ block: 'center' })`); await p.waitForTimeout(100);
  const h = await p.evaluateHandle(`${circle(p, name, i)}`); await h.asElement().click(); };
const buzzes = p => p.evaluate(() => window.__buzz.slice());
async function spy(p) { await p.evaluate(() => { window.__buzz = []; navigator.vibrate = x => { window.__buzz.push(x); return true; }; }); }

(async () => {
  const browser = await H.launch();

  // ── H1: the circle counts a hold ──
  {
    const { ctx, p } = await open(browser);
    p.setDefaultTimeout(8000);
    await openCard(p, FRONT); await spy(p);
    const ds = await p.evaluate(`({ plank: ${H.card(FRONT)}.dataset.hold, side: ${H.card(PLANK)}.dataset.holdSide, sq: ${H.card(SQ)}.dataset.hold || '', sqSide: ${H.card(PLANK)}.dataset.hold })`);
    t.check('a time dose carries its seconds on the card, a rep lift carries none', ds.plank === '2' && ds.sqSide === '2' && ds.side === '1' && ds.sq === '', JSON.stringify(ds));
    await clickCircle(p, FRONT);
    await p.waitForTimeout(300);
    let s = await state(p, FRONT);
    t.check('a tap on a hold\'s circle starts the count: the seconds are in it and the set is not ticked', s.holding && /^[12]$/.test(s.text) && !s.done && /counting/.test(s.label), JSON.stringify(s));
    t.check('the ring empties as it counts (its fraction is below 1)', s.hold !== '' && parseFloat(s.hold) < 1 && parseFloat(s.hold) > 0, JSON.stringify(s));
    await clickCircle(p, FRONT);
    await p.waitForTimeout(2600);
    s = await state(p, FRONT);
    t.check('a tap while it counts stops it: no tick, the circle is back to a plain circle', !s.holding && s.text === '' && !s.done && /Mark set 1 done/.test(s.label), JSON.stringify(s));
    t.check('…and stopping it buzzed nothing', (await buzzes(p)).length === 0);
    await clickCircle(p, FRONT);
    await p.waitForTimeout(2700);
    s = await state(p, FRONT);
    t.check('left alone, the hold ends by itself and the set ticks', !s.holding && s.done, JSON.stringify(s));
    t.check('…with a buzz at 0', (await buzzes(p)).length >= 1, JSON.stringify(await buzzes(p)));
    const saved2 = await p.evaluate(n => loadSetLog(n, 2, '1').map(x => !!x.d).join(), FRONT);
    t.check('…and the tick is the real one, written to the set log', saved2 === 'true,false', saved2);
    await clickCircle(p, FRONT);
    await p.waitForTimeout(250);
    s = await state(p, FRONT);
    t.check('a ticked set\'s circle still unticks, with no count', !s.holding && !s.done);

    // a "/ side" hold
    await openCard(p, PLANK); await spy(p);
    await clickCircle(p, PLANK);
    await p.waitForTimeout(2600);
    const toast = await p.evaluate(() => { const e = document.getElementById('aaToast'); return e && !e.hidden ? e.textContent : null; });
    s = await state(p, PLANK);
    t.check('a "/ side" hold goes on to the other side: "Other side" is said, still counting, not ticked', s.holding && !s.done && /Other side/.test(toast || ''), JSON.stringify([s, toast]));
    await p.waitForTimeout(3000);
    s = await state(p, PLANK);
    t.check('…and counts the second side', s.holding && !s.done && parseFloat(s.hold || '0') > 0, JSON.stringify(s));
    await p.waitForTimeout(2300);
    s = await state(p, PLANK);
    const b2 = await buzzes(p);
    t.check('…then ticks the set, after a buzz at the end of each side', !s.holding && s.done && b2.filter(x => x === 220).length === 2, JSON.stringify([s, b2]));

    // a rep set is untouched
    await openCard(p, SQ);
    await clickCircle(p, SQ);
    await p.waitForTimeout(250);
    s = await state(p, SQ);
    t.check('a rep set\'s circle ticks at once, as ever', !s.holding && s.done, JSON.stringify(s));
    t.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // reduced motion: the number, no moving ring
  {
    const { ctx, p } = await open(browser);
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await openCard(p, FRONT);
    await clickCircle(p, FRONT);
    await p.waitForTimeout(400);
    const s = await state(p, FRONT);
    const q = await p.evaluate(`${circle(p, FRONT)}.classList.contains('quiet')`);
    t.check('reduced motion: the number counts and the ring is not driven (no --hold)', s.holding && /^[12]$/.test(s.text) && s.hold === '' && q, JSON.stringify(s));
    await p.waitForTimeout(2300);
    t.check('…and the set still ticks at 0', (await state(p, FRONT)).done);
    await ctx.close();
  }

  // Guided: the same circle
  {
    const { ctx, p } = await open(browser);
    p.setDefaultTimeout(8000);
    await spy(p);
    await p.evaluate(() => { openDayView('1'); openStepMode('1'); });
    await p.waitForTimeout(350);
    await p.evaluate(() => { if (STEP.seq[STEP.pos].group) stepPrimary(); });
    await p.waitForTimeout(250);
    await p.evaluate(n => { const i = STEP.seq.findIndex(x => x.name === n && x.setI === 0); STEP.pos = i; renderStep(); }, FRONT);
    await p.waitForTimeout(300);
    const g = () => p.evaluate(() => { const r = document.querySelector('#step-scroll .ex-set-row.step-current') || document.querySelector('#step-scroll .ex-set-row'); const b = r.querySelector('.ex-set-check'); return { shown: !!b && b.getBoundingClientRect().width > 0, holding: b.classList.contains('holding'), text: b.textContent, done: r.classList.contains('done') }; });
    let s = await g();
    t.check('Guided shows the same circle on a hold', s.shown, JSON.stringify(s));
    await p.evaluate(() => { document.querySelector('#step-scroll .ex-set-row.step-current .ex-set-check').click(); });
    await p.waitForTimeout(300);
    s = await g();
    t.check('Guided: a tap on the circle counts it (the number in it), not ticked', s.holding && /^[12]$/.test(s.text) && !s.done, JSON.stringify(s));
    await p.waitForTimeout(2500);
    s = await g();
    t.check('Guided: at 0 the set ticks', !s.holding && s.done, JSON.stringify(s));
    await p.evaluate(n => { const i = STEP.seq.findIndex(x => x.name === n && x.setI === 1); STEP.pos = i; renderStep(); }, FRONT);
    await p.waitForTimeout(300);
    await p.evaluate(() => { document.querySelector('#step-scroll .ex-set-row.step-current .ex-set-check').click(); });
    await p.waitForTimeout(300);
    await p.evaluate(() => stepPrimary());
    await p.waitForTimeout(300);
    const done2 = await p.evaluate(n => loadSetLog(n, 2, '1').map(x => !!x.d).join(), FRONT);
    t.check('Guided\'s big Done ticks at once, even while the circle counts', done2 === 'true,true', done2);
    await ctx.close();
  }

  // ── K2: "kg / hand" on dumbbell and kettlebell lifts only ──
  const DB = 'Dumbbell Bulgarian Split Squat', KB = 'KB Swing', NOENT = 'Mystery Carry';
  const head = (p, name) => p.evaluate(`(() => { const b = ${H.card(name)}.querySelector('.ex-set-unit'); const r = b.getBoundingClientRect(); const rep = ${H.card(name)}.querySelector('.ex-set-header > div:nth-child(3)').getBoundingClientRect();
    const tr = document.createRange(); tr.selectNodeContents(b); const t1 = tr.getBoundingClientRect(); const rt = document.createRange(); rt.selectNodeContents(${H.card(name)}.querySelector('.ex-set-header > div:nth-child(3)')); const t2 = rt.getBoundingClientRect(); const sw = ${H.card(name)}.querySelector('.ex-set-header > div:nth-child(1)').getBoundingClientRect(); return { tx: Math.round(t1.right + 8), reps: Math.round(t2.left), setR: Math.round(sw.right), tl: Math.round(t1.left), text: b.textContent, hand: b.classList.contains('hand'), right: Math.round(r.right), repsLeft: Math.round(rep.left), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, label: b.getAttribute('aria-label') }; })()`);
  for (const w of [390, 320]) {
    const P = holdProg();
    P.workouts.days[0].blocks[2].exercises.push({ name: KB, type: 'standard', rx: { sets: 2, reps: 10, rest: 60 } });
    const { ctx, p } = await open(browser, { w, prog: P });
    p.setDefaultTimeout(8000);
    await openCard(p, SQ);
    let h = await head(p, SQ);
    t.check(`a barbell lift\'s header stays "kg" (${w} px)`, h.text === 'kg' && !h.hand, JSON.stringify(h));
    await openCard(p, DB);
    h = await head(p, DB);
    t.check(`a dumbbell lift (Spine equipment: dumbbells) reads "kg / hand" (${w} px)`, h.text === 'kg / hand' && h.hand, JSON.stringify(h));
    t.check(`…it does not run into the REPS header and stays on the screen (${w} px)`, h.tx <= h.reps + 1 && h.tl >= h.setR && h.left >= 0 && h.h >= 44, JSON.stringify(h));
    await openCard(p, KB);
    h = await head(p, KB);
    t.check(`a card with no Spine entry falls back to the name: "KB Swing" reads "kg / hand" (${w} px)`, h.text === 'kg / hand', JSON.stringify(h));
    await openCard(p, NOENT);
    t.check('a card with no entry and no such word in its name stays plain', await p.evaluate(`(() => { const b = ${H.card(NOENT)}.querySelector('.ex-set-unit'); return b ? b.textContent : 'none'; })()`).then(x => x === 'kg' || x === 'none'));
    if (w === 390) {
      await openCard(p, DB);
      await p.evaluate(`pickCardUnit(${H.card(DB)}, 'lb')`); await p.waitForTimeout(200);
      t.check('in pounds it reads "lb / hand"', (await head(p, DB)).text === 'lb / hand');
      await p.evaluate(`pickCardUnit(${H.card(DB)}, 'plates')`); await p.waitForTimeout(200);
      t.check('in plates it reads "plates", never per hand', (await head(p, DB)).text === 'plates');
      await p.evaluate(`pickCardUnit(${H.card(DB)}, 'kg')`); await p.waitForTimeout(200);
      // Guided's weight box label
      await p.evaluate(() => { openDayView('1'); openStepMode('1'); });
      await p.waitForTimeout(350);
      await p.evaluate(() => { if (STEP.seq[STEP.pos].group) stepPrimary(); });
      await p.evaluate(n => { const i = STEP.seq.findIndex(x => x.name === n && x.setI === 0); STEP.pos = i; renderStep(); }, DB);
      await p.waitForTimeout(300);
      await p.click('#step-footer .step-primary-btn');
      await p.waitForTimeout(500);
      const gl = await p.evaluate(() => { const b = document.querySelector('#timerLog .tl-unit'); return b ? b.textContent : null; });
      t.check('Guided\'s weight label says "Kg / hand" for a dumbbell lift', gl === 'Kg / hand', gl);
    }
    t.check(`no page errors (${w} px)`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── I3: the ⓘ on a circuit's movements ──
  const PAIR = 'Jump & Plank Pair', PRIMER = 'Primer Pair';
  for (const w of [390, 320]) {
    const P = holdProg();
    const day = P.workouts.days[0];
    day.blocks.push({ title: 'Strength', exercises: [{ type: 'circuit', name: PAIR, rx: { rounds: 2, rpe: 8, rest: 60 },
      items: [{ name: 'Box Jump', exId: 'box-jump', rx: { reps: 5 } }, { name: 'Mystery Move', rx: { reps: 8 } }, { name: 'Side Plank', exId: 'side-plank', rx: { time: '20 s', side: true } }] }] });
    day.blocks[0].exercises.push({ type: 'circuit', name: PRIMER, warmup: true, rx: { rounds: 2 }, items: [{ name: 'Side Plank', exId: 'side-plank', rx: { time: '20 s' } }, { name: 'Mystery Warm', rx: { reps: 8 } }] });
    const { ctx, p } = await open(browser, { w, prog: P, stub: { library: H.library() } });
    p.setDefaultTimeout(8000);
    for (const name of [PAIR, PRIMER]) {
      await openCard(p, name);
      const rows = await p.evaluate(`[...${H.card(name)}.querySelectorAll('.round-row')].map(r => { const b = r.querySelector('.round-about'); const q = b && b.getBoundingClientRect(); const n = r.querySelector('.round-name').getBoundingClientRect();
        return { nm: r.querySelector('.round-name').firstChild.textContent, about: !!b, w: q ? Math.round(q.width) : 0, h: q ? Math.round(q.height) : 0, label: b ? b.getAttribute('aria-label') : '', rowH: Math.round(r.getBoundingClientRect().height), nameH: Math.round(n.height), inside: !!b && q.right <= innerWidth }; })`);
      const ent = rows.filter(r => r.about), none = rows.filter(r => !r.about);
      t.check(`${name}: every movement with a Spine entry has the ⓘ, named for it, and the ones without have none (${w} px)`,
        ent.length >= 1 && none.length >= 1 && ent.every(r => /^About /.test(r.label)) && (name === PAIR ? ent.map(r => r.nm).join() === 'Box Jump,Side Plank' : ent.map(r => r.nm).join() === 'Side Plank'), JSON.stringify(rows));
      t.check(`${name}: the ⓘ is 44 x 44 to hit, on the screen, and a line of name is not made taller by it (${w} px)`, ent.every(r => r.w === 44 && r.h === 44 && r.inside && r.nameH < 44), JSON.stringify(rows));
    }
    await openCard(p, PAIR);
    const before = await p.evaluate(`(() => { const c = ${H.card(PAIR)}; return { collapsed: c.classList.contains('collapsed'), checked: c.classList.contains('checked'), wt: [...c.querySelectorAll('.round-wt')].map(i => i.value).join() }; })()`);
    await p.evaluate(`${H.card(PAIR)}.querySelector('.round-about').scrollIntoView({ block: 'center' })`);
    await p.waitForTimeout(150);
    const h = await p.evaluateHandle(`${H.card(PAIR)}.querySelector('.round-about')`);
    await h.asElement().click();
    await p.waitForTimeout(500);
    const after = await p.evaluate(`(() => { const c = ${H.card(PAIR)}, ov = document.getElementById('hist-overlay'); return { collapsed: c.classList.contains('collapsed'), checked: c.classList.contains('checked'), wt: [...c.querySelectorAll('.round-wt')].map(i => i.value).join(),
      sheet: ov.classList.contains('visible'), name: (ov.querySelector('.ax-name') || {}).textContent }; })()`);
    t.check(`a tap on a movement's ⓘ opens the About sheet for its entry (${w} px)`, after.sheet && after.name === 'Box Jump', JSON.stringify(after));
    t.check(`…and ticks nothing, folds nothing, types no weight (${w} px)`, after.collapsed === before.collapsed && after.checked === before.checked && after.wt === before.wt && !after.checked, JSON.stringify([before, after]));
    await p.evaluate(() => closeHistorySheet()); await p.waitForTimeout(300);
    // a warm-up row: the ⓘ must not fold the row's cues
    await openCard(p, PRIMER);
    const open0 = await p.evaluate(`${H.card(PRIMER)}.querySelector('.round-row').classList.contains('cues-open')`);
    const hp = await p.evaluateHandle(`${H.card(PRIMER)}.querySelector('.round-about')`);
    await hp.asElement().scrollIntoViewIfNeeded(); await hp.asElement().click(); await p.waitForTimeout(400);
    const open1 = await p.evaluate(`({ cues: ${H.card(PRIMER)}.querySelector('.round-row').classList.contains('cues-open'), sheet: document.getElementById('hist-overlay').classList.contains('visible') })`);
    t.check(`a warm-up row's ⓘ opens the sheet and does not fold the row (${w} px)`, open1.sheet && open1.cues === open0, JSON.stringify([open0, open1]));
    t.check(`no page errors (${w} px)`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
