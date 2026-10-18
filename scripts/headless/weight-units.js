// The unit button over the weight boxes (Amir, 2026-10-18: "let the client pick what to input: kg, lb, or plates, for a machine with no weight"):
// node scripts/headless/weight-units.js
//
// The unit is WRITTEN IN the weight's text ("45 lb", "6 plates", a bare number is kg), so it rides every pipe a weight already rode. The weight
// box holds the number; the button over it cycles kg → lb → plates and relabels what is typed; the next session opens in the unit last used.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');
const SQ = 'Barbell Back Squat';
const EMPTY = () => [0, 1, 2, 3].map(() => ({ w: '', n: '', r: '', d: false }));
const row = i => `#sq .ex-set-row[data-set-idx="${i}"]`;

async function openSquat(p) {
  await p.evaluate(`(() => { openDayView('1'); const c = ${H.card(SQ)}; if (c.classList.contains('collapsed')) toggleExpand(c); c.id = 'sq'; try { hideAaToast(); } catch (e) {} })()`);
  await p.waitForTimeout(300);
}
const unit = p => p.evaluate(() => document.querySelector('#sq .ex-set-unit').textContent);
const boxes = p => p.evaluate(() => [...document.querySelectorAll('#sq .ex-set-weight')].map(i => ({ v: i.value, ph: i.placeholder })));
const stored = p => p.evaluate(() => loadSetLog('Barbell Back Squat', 4, '1').map(s => s.w));
const tapUnit = async p => { await p.click('#sq .ex-set-unit'); await p.waitForTimeout(150); };

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  // ── 1. kg is the default, and a kg weight is stored bare, as it always was ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [], seed: { _setlog_Barbell_Back_Squat: EMPTY() }, stub: { library: H.library() } });
    await openSquat(p);
    C.check('the button says kg and an empty box says kg', (await unit(p)) === 'kg' && (await boxes(p))[0].ph === 'kg', JSON.stringify([await unit(p), await boxes(p)]));
    await p.fill(`${row(0)} .ex-set-weight`, '100');
    const s = await stored(p);
    C.check('a kg weight is stored as the bare number', s.join('|') === '100|100|100|100', s.join('|'));

    // ── 2. pounds: the box keeps the number, the text keeps the unit ──
    await tapUnit(p);
    const s2 = await stored(p), b2 = await boxes(p);
    C.check('picking lb relabels what is typed (100 → "100 lb") and the boxes still show 100', (await unit(p)) === 'lb' && s2.join('|') === '100 lb|100 lb|100 lb|100 lb' && b2.every(b => b.v === '100'), JSON.stringify([s2, b2]));
    await p.fill(`${row(0)} .ex-set-weight`, '135');
    const s3 = await stored(p), b3 = await boxes(p);
    C.check('typing 135 in lb stores "135 lb" and fills the sets below the same way; the boxes hold 135', s3.join('|') === '135 lb|135 lb|135 lb|135 lb' && b3.every(b => b.v === '135'), JSON.stringify([s3, b3]));
    await p.fill(`${row(0)} .ex-set-weight`, '');
    const s3b = await stored(p), b3b = await boxes(p);
    C.check('clearing the box clears the weight and the sets below; an empty box says lb', s3b.every(w => w === '') && b3b[0].ph === 'lb', JSON.stringify([s3b, b3b]));
    await p.fill(`${row(0)} .ex-set-weight`, '135');

    // ── 3. plates ──
    await tapUnit(p);
    const s4 = await stored(p);
    C.check('picking plates relabels again ("135 plates"); the button says plates', (await unit(p)) === 'plates' && s4.every(w => w === '135 plates'), JSON.stringify([await unit(p), s4]));
    await p.fill(`${row(1)} .ex-set-weight`, '6');
    const s5 = await stored(p);
    C.check('typing 6 in plates stores "6 plates" (and a following set takes it)', s5[1] === '6 plates' && s5[2] === '6 plates', JSON.stringify(s5));

    // ── 4. and back to kg ──
    await tapUnit(p);
    const s6 = await stored(p);
    C.check('the third tap is kg again and the weights are bare numbers', (await unit(p)) === 'kg' && s6[0] === '135' && s6[1] === '6' && !s6.some(w => /[a-z]/i.test(w)), JSON.stringify([await unit(p), s6]));
    C.check('no page errors (picking a unit)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 5. the unit follows the data: the next session, and a new phone, open in it ──
  {
    const LB = EMPTY().map(s => Object.assign({}, s, { lw: '45 lb' }));
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [], seed: { _setlog_Barbell_Back_Squat: LB }, stub: { library: H.library() } });
    await openSquat(p);
    const b = await boxes(p);
    C.check('last time in pounds: the card opens in lb, and LAST shows the number alone ("45")', (await unit(p)) === 'lb' && b[0].ph === '45', JSON.stringify([await unit(p), b[0]]));
    await tapUnit(p); await tapUnit(p);   // lb → plates → kg
    const b2 = await boxes(p);
    C.check('picked kg over a pounds LAST: the hint names its own unit ("45 lb"), so it is never read as kilograms', (await unit(p)) === 'kg' && b2[0].ph === '45 lb', JSON.stringify([await unit(p), b2[0]]));
    await ctx.close();
  }
  {
    const hist = [{ completed_on: H.past(3), day: '1', readiness: 4, log: [{ ex: SQ, block: 'Strength', reps: 6, note: '',
      sets: [{ w: '6 plates', n: 6, r: '7', d: true }, { w: '6 plates', n: 6, r: '7', d: true }] }] }];
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist, seed: { _setlog_Barbell_Back_Squat: EMPTY() }, stub: { library: H.library() } });
    await openSquat(p);
    C.check('no weight today or last time, but the lift was last logged in plates: the card opens in plates', (await unit(p)) === 'plates' && (await boxes(p))[0].ph === 'plates', JSON.stringify([await unit(p), (await boxes(p))[0]]));
    await ctx.close();
  }

  // ── 6. what the athlete sees, and what is saved, in each unit ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [], seed: { _setlog_Barbell_Back_Squat: EMPTY() }, stub: { library: H.library() } });
    await openSquat(p);
    const t = await p.evaluate(() => ({
      kg: histSetsText([{ w: '80', n: 5, d: true }, { w: '80', n: 5, d: true }, { w: '80', n: 4, d: true }], 5),
      lb: histSetsText([{ w: '135 lb', n: 8, d: true }, { w: '135 lb', n: 8, d: true }], 8),
      pl: histSetsText([{ w: '6 plates', n: 12, d: true }, { w: '6 plates', n: 12, d: true }], 12),
      one: histSetsText([{ w: '1 plate', n: 12, d: true }], 12),
      ramp: histSetsText([{ w: '135 lb', n: 8, d: true }, { w: '145 lb', n: 8, d: true }], 8),
      rampNoReps: histSetsText([{ w: '5 plates', d: true }, { w: '6 plates', d: true }], null),
      mixed: histSetsText([{ w: '60', n: 8, d: true }, { w: '135 lb', n: 8, d: true }], 8),
      wt: [histWt('80'), histWt('45 lb'), histWt('6 plates'), histWt('1 plate'), histWt('BW')],
    }));
    C.check('History reads in the unit each set was typed in', t.kg === '80 kg × 5 · 5 · 4' && t.lb === '135 lb × 8 · 8' && t.pl === '6 plates × 12 · 12' && t.one === '1 plate × 12', JSON.stringify(t));
    C.check('a ramp names its unit once, after the weights; with no reps it is just the weights; a list that mixes units names every unit',
      t.ramp === '135×8 · 145×8 lb' && t.rampNoReps === '5 · 6 plates' && t.mixed === '60 kg×8 · 135 lb×8', JSON.stringify(t));
    C.check('histWt() shows a weight as typed', JSON.stringify(t.wt) === '["80","45 lb","6 plates","1 plate",null]', JSON.stringify(t.wt));

    // the saved record: the summary line the email and coach.html read, and the structured log beside it
    await tapUnit(p);                                                         // kg → lb
    await p.fill(`${row(0)} .ex-set-weight`, '135');
    await p.click(`${row(0)} .ex-set-check`); await p.waitForTimeout(300);
    const rec = await p.evaluate(() => { const D = buildSessionData('1'); const e = D && D.log.find(x => x.ex === 'Barbell Back Squat');
      return { line: D && (D.summary.match(/Set 1: [^\n]*/) || [''])[0], sets: e && e.sets.map(s => s.w + (s.d ? '✓' : '')).join(' ') }; });
    C.check('the session summary and the saved log carry the unit ("Set 1: 135 lb ×N ✓")', /^Set 1: 135 lb ×\d+ ✓$/.test(rec.line) && /^135 lb✓ 135 lb 135 lb 135 lb$/.test(rec.sets), JSON.stringify(rec));
    await ctx.close();
  }

  // ── 7. the maths: pounds are kilograms in every calculation, plates are none ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [], stub: { library: H.library() } });
    const m = await p.evaluate(() => {
      const set = (w, n, r) => cycleSetOf({ reps: n }, { w, n: String(n), r: String(r) });
      const lbWin = winText(set('100 lb', 8, 7), set('110 lb', 8, 7));
      const kgWin = winText(set('100', 8, 7), set('105', 8, 7));
      const mixWin = winText(set('100', 8, 7), set('250 lb', 8, 7));
      const plWin = winText(set('5 plates', 8, 7), set('6 plates', 8, 7));
      const plReps = winText(set('5 plates', 8, 7), set('5 plates', 10, 7));
      const best = histBestSet({ reps: 5, sets: [{ w: '225 lb', n: 5, r: '8', d: true }] });
      const bestKg = histBestSet({ reps: 5, sets: [{ w: '100', n: 5, r: '8', d: true }] });
      const bestPl = histBestSet({ reps: 5, sets: [{ w: '6 plates', n: 5, r: '8', d: true }] });
      return { lbWin, kgWin, mixWin, plWin, plReps, best, bestKg, bestPl, kgs: [parseLoggedKg('225 lb'), parseLoggedKg('6 plates'), parseLoggedKg('100')] };
    });
    C.check('a win in pounds is worded in pounds, and draws no share card (a card says kilograms)', m.lbWin && m.lbWin.txt === '+10 lb, same reps, same RPE' && m.lbWin.share === false, JSON.stringify(m.lbWin));
    C.check('a win in kg is worded as ever and can still be shared', m.kgWin && /^\+5 kg, same reps, same RPE$/.test(m.kgWin.txt) && m.kgWin.share === true, JSON.stringify(m.kgWin));
    C.check('kg then pounds is compared in kilograms and says kg', m.mixWin && /kg/.test(m.mixWin.txt) && !/ lb/.test(m.mixWin.txt) && m.mixWin.share === false, JSON.stringify(m.mixWin));
    C.check('plates are no load: 5 → 6 plates at the same reps is no win, and more reps at the same plates is a reps win with no kilogram in it',
      m.plWin === null && m.plReps && /^\+2 reps/.test(m.plReps.txt) && !/kg|lb/.test(m.plReps.txt), JSON.stringify([m.plWin, m.plReps]));
    C.check('a best set in pounds is estimated in kilograms and marked lb; kg is not marked; plates have no estimate',
      m.best && m.best.u === 'lb' && m.best.kg === 102.06 && m.bestKg && m.bestKg.u === '' && m.bestPl === null, JSON.stringify([m.best, m.bestKg, m.bestPl]));
    C.check('225 lb = 102.06 kg, plates = no weight', m.kgs[0] === 102.06 && m.kgs[1] === null && m.kgs[2] === 100, JSON.stringify(m.kgs));
    C.check('no page errors (the maths)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 8. Guided: the label of the weight line is the same button ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [], seed: { _setlog_Barbell_Back_Squat: EMPTY().map(s => Object.assign({}, s, { lw: '45 lb' })) }, stub: { library: H.library() } });
    await p.evaluate(() => { openDayView('1'); openStepMode('1'); const i = STEP.seq.findIndex(x => x.name === 'Barbell Back Squat' && x.setI === 0); STEP.pos = i; renderStep(); });
    await p.waitForTimeout(300);
    await p.click('#step-footer .step-primary-btn'); await p.waitForTimeout(400);
    const a = await p.evaluate(() => ({ lab: document.querySelector('#timerLog .tl-unit').textContent, ph: document.querySelector('#timerLog .tl-kg').placeholder, same: !!document.querySelector('#timerLog .tl-same:not([hidden])') }));
    C.check('Guided: last time was pounds, so the weight line says Lb, hints "last 45" and offers Same as last', a.lab === 'Lb' && a.ph === 'last 45' && a.same, JSON.stringify(a));
    await p.click('#timerLog .tl-same'); await p.waitForTimeout(300);
    const b = await p.evaluate(() => ({ w: loadSetLog('Barbell Back Squat', 4, '1')[0].w, box: document.querySelector('#timerLog .tl-kg').value }));
    C.check('Same as last types last time\'s weight in last time\'s unit ("45 lb"); the box shows 45', b.w === '45 lb' && b.box === '45', JSON.stringify(b));
    await p.fill('#timerLog .tl-kg', '50'); await p.waitForTimeout(200);
    const c = await p.evaluate(() => loadSetLog('Barbell Back Squat', 4, '1')[0].w);
    C.check('typing in Guided saves in the card\'s unit', c === '50 lb', c);
    await p.click('#timerLog .tl-unit'); await p.waitForTimeout(300);
    const d = await p.evaluate(() => ({ lab: document.querySelector('#timerLog .tl-unit').textContent, w: loadSetLog('Barbell Back Squat', 4, '1')[0].w }));
    C.check('the Guided label is a button too: one tap goes to plates and relabels the set ("50 plates")', d.lab === 'Plates' && d.w === '50 plates', JSON.stringify(d));
    C.check('no page errors (Guided)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
