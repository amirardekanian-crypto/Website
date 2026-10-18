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

  // ── 7. the maths: each measure is its own scale, never converted, never compared with another ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [], stub: { library: H.library() } });
    const m = await p.evaluate(() => {
      const set = (w, n, r) => cycleSetOf({ reps: n }, { w, n: String(n), r: String(r) });
      const best = (w, n, r) => histBestSet({ reps: n, sets: [{ w, n, r, d: true }] });
      return {
        lbWin: winText(set('100 lb', 8, 7), set('110 lb', 8, 7)),
        kgWin: winText(set('100', 8, 7), set('105', 8, 7)),
        mixWin: winText(set('100', 8, 7), set('250 lb', 8, 7)),
        plWin: winText(set('5 plates', 8, 7), set('6 plates', 8, 7)),
        plReps: winText(set('5 plates', 8, 7), set('5 plates', 10, 7)),
        plSame: winText(set('5 plates', 8, 7), set('5 plates', 8, 7)),
        lb: best('225 lb', 5, 8), kg: best('100', 5, 8), pl: best('6 plates', 5, 8), none: best('', 5, 8),
        mixedEntry: histBestSet({ reps: 5, sets: [{ w: '60', n: 5, r: '8', d: true }, { w: '225 lb', n: 5, r: '8', d: true }] }),
        est: [estimateOneRM(100, 5, 8), estimateOneRM(225, 5, 8, 'lb'), estimateOneRM(6, 5, 8, 'plates'), estimateOneRM(100, 5, 8, 'kg')],
        kgs: [parseLoggedKg('225 lb'), parseLoggedKg('6 plates'), parseLoggedKg('100')],
        recKg: [recKgEq({ kg: 280, u: 'lb' }), recKgEq({ kg: 7.5, u: 'plates' }), recKgEq({ kg: 100 })],
        meas: [setsMeasure([{ w: '', d: true }, { w: '45 lb', d: true }]), setsMeasure([{ w: '60', d: true }, { w: '45 lb', d: true }]), setsMeasure([])],
      };
    });
    C.check('a win in pounds is worded in pounds (numbers as typed) and can be shared (the card says pounds)', m.lbWin && m.lbWin.txt === '+10 lb, same reps, same RPE' && m.lbWin.share === true, JSON.stringify(m.lbWin));
    C.check('a win in kg is worded as ever and can be shared', m.kgWin && /^\+5 kg, same reps, same RPE$/.test(m.kgWin.txt) && m.kgWin.share === true, JSON.stringify(m.kgWin));
    C.check('kg against pounds is no win: two measures are never compared', m.mixWin === null, JSON.stringify(m.mixWin));
    C.check('plates are a measure of their own: 5 → 6 plates at the same reps is "+1 plate", more reps at the same plates is a reps win, no change is none',
      m.plWin && m.plWin.txt === '+1 plate, same reps, same RPE' && m.plReps && /^\+2 reps at 5 plates/.test(m.plReps.txt) && m.plSame === null, JSON.stringify([m.plWin, m.plReps, m.plSame]));
    C.check('a best set is estimated in its own measure, rounded to its own step (kg 2.5, lb 5, plates 0.5), and says which',
      m.lb && m.lb.est === 280 && m.lb.w === 225 && m.lb.u === 'lb' && m.kg && m.kg.est === 122.5 && m.kg.u === '' && m.pl && m.pl.est === 7.5 && m.pl.w === 6 && m.pl.u === 'plates' && m.none === null, JSON.stringify([m.lb, m.kg, m.pl, m.none]));
    C.check('a session\'s exercise is one measure: the first weighted set decides, a set typed in another is left out',
      m.mixedEntry && m.mixedEntry.u === '' && m.mixedEntry.w === 60 && m.meas.join('|') === 'lb|kg|kg', JSON.stringify([m.mixedEntry, m.meas]));
    C.check('estimateOneRM rounds to the measure\'s step; kilograms only for the body-weight ratio, plates have none', JSON.stringify(m.est) === '[122.5,280,7.5,122.5]'
      && m.kgs[0] === 102.06 && m.kgs[1] === null && m.kgs[2] === 100 && Math.abs(m.recKg[0] - 127) < 0.01 && m.recKg[1] === null && m.recKg[2] === 100, JSON.stringify([m.est, m.kgs, m.recKg]));
    C.check('no page errors (the maths)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 9. a record is only an achievement against the SAME measure ──
  {
    const day = n => H.past(n);
    const sess = (n, ex, w, reps, rpe) => ({ date: day(n), day: '1', entries: [{ ex, reps, sets: [{ w, n: reps, r: String(rpe), d: true }] }] });
    const spine = H.SPINE.map(e => e.id === 'barbell-back-squat' ? Object.assign({}, e, { pattern: 'squat', impact: 'none' }) : e);   // a record lift
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), spine, hist: [], stub: { library: H.library() } });
    const r = await p.evaluate(([s1, s2, s3, s4]) => {
      const lift = 'Barbell Back Squat';
      const ent = () => loadCeilingRaw().filter(e => e.lift === lift).map(e => ({ d: e.d, kg: e.kg, u: e.u || '', auto: !!e.auto, del: !!e.del }));
      fillRecords([s1], true);                                    // 100 kg: the first record
      const afterKg = ent(), bestA = localStorage.getItem(ATHLETE_ID + '_ceil_best');
      fillRecords([s1, s2], true);                                // then 225 lb: the first record in pounds beats nothing
      const afterLb = ent(), bestB = localStorage.getItem(ATHLETE_ID + '_ceil_best');
      fillRecords([s1, s2, s3], true);                            // then 235 lb: higher than 225 lb, so a best
      const afterLb2 = ent(), bestC = JSON.parse(localStorage.getItem(ATHLETE_ID + '_ceil_best') || 'null');
      fillRecords([s1, s2, s3, s4], true);                        // then 6 plates on a stack: the first in plates
      const series = ceilingSeries().filter(x => x.lift === lift).map(x => x.u + ':' + x.entries.length + ':' + x.latest.kg);
      const row = ceilingLifts().filter(x => x.lift === lift).map(x => x.u + ':' + x.latest.kg);
      return { afterKg, bestA, afterLb, bestB, afterLb2, bestC, series, row, prevKg: ceilingPrevBest(lift, '2000-01-01', ''), prevLb: ceilingPrevBest(lift, '2000-01-01', 'lb'), prevPl: ceilingPrevBest(lift, '2000-01-01', 'plates') };
    }, [sess(9, 'Barbell Back Squat', '100', 5, 8), sess(6, 'Barbell Back Squat', '225 lb', 5, 8), sess(3, 'Barbell Back Squat', '235 lb', 5, 8), sess(1, 'Barbell Back Squat', '6 plates', 5, 8)]);
    C.check('a kg session files the first record (no best to celebrate)', r.afterKg.length === 1 && r.afterKg[0].kg === 122.5 && r.afterKg[0].u === '' && r.bestA === null, JSON.stringify([r.afterKg, r.bestA]));
    C.check('the first record in pounds is filed beside it and is NOT a new best (225 lb is not "above" 100 kg)', r.afterLb.length === 2 && r.afterLb.some(e => e.u === 'lb' && e.kg === 280) && r.bestB === null, JSON.stringify([r.afterLb, r.bestB]));
    C.check('a higher estimate in pounds IS a new best, against the pounds record only', r.afterLb2.some(e => e.u === 'lb' && e.kg === 290) && r.bestC && r.bestC.u === 'lb' && r.bestC.prev === 280 && r.bestC.kg === 290, JSON.stringify([r.afterLb2, r.bestC]));
    C.check('plates have a series of their own, and the lift\'s row is the measure it was last lifted in', r.series.sort().join('|') === ':1:122.5|lb:2:290|plates:1:7.5' && r.row.join('|') === 'plates:7.5', JSON.stringify([r.series, r.row]));
    C.check('the bar to beat is per measure', r.prevKg === 122.5 && r.prevLb === 290 && r.prevPl === 7.5, JSON.stringify([r.prevKg, r.prevLb, r.prevPl]));
    C.check('no page errors (records)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 10. which movements earn a record by themselves ──
  {
    const spine = H.SPINE.concat([
      { id: 'half-kneeling-single-arm-cable-row', name: 'Half-Kneeling Single-Arm Cable Row', aliases: [], equipment: ['cable'], pattern: 'pull-horizontal', impact: 'none', cues: { good: [], bad: [] } },
      { id: 'single-arm-cable-lateral-raise', name: 'Single-Arm Cable Lateral Raise', aliases: [], equipment: ['cable'], pattern: 'isolation', impact: 'none', cues: { good: [], bad: [] } },
      { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', aliases: [], equipment: ['cable'], pattern: 'isolation', impact: 'none', cues: { good: [], bad: [] } },
      { id: 'machine-lying-leg-curl', name: 'Machine Lying Leg Curl', aliases: [], equipment: ['machine'], pattern: 'isolation', impact: 'none', cues: { good: [], bad: [] } },
      { id: 'cable-external-rotation', name: 'Cable External Rotation', aliases: [], equipment: ['cable'], pattern: 'isolation', impact: 'none', cues: { good: [], bad: [] } },
      { id: 'barbell-back-squat-p', name: 'Barbell Back Squat P', aliases: [], equipment: ['barbell'], pattern: 'squat', impact: 'none', cues: { good: [], bad: [] } },
      { id: 'box-jump-p', name: 'Box Jump P', aliases: [], equipment: ['box'], pattern: 'jump-land', impact: 'high', cues: { good: [], bad: [] } },
    ]);
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), spine, hist: [], stub: { library: H.library() } });
    const v = await p.evaluate(() => ({
      row: recordsItself('Half-Kneeling Single-Arm Cable Row'), oneArm: recordsItself('Single-Arm Cable Lateral Raise'), lat: recordsItself('Cable Lateral Raise'),
      curl: recordsItself('Machine Lying Leg Curl'), rot: recordsItself('Cable External Rotation'), squat: recordsItself('Barbell Back Squat P'), jump: recordsItself('Box Jump P'),
      unknown: recordsItself('Something The Spine Never Heard Of'),
    }));
    C.check('a strength pattern earns a record; a ONE-HANDED CABLE exercise does even where the Spine files it as isolation; other isolation does not; a jump does not',
      v.row && v.squat && v.oneArm && !v.lat && !v.curl && !v.rot && !v.jump && !v.unknown, JSON.stringify(v));
    // the isolation records that were filed before the rule are put away (tombstones), by hand and tested ones stay
    const t = await p.evaluate(() => {
      const d = '2026-09-01', now = Date.now();
      writeCeiling([
        { lift: 'Cable External Rotation', kg: 10, w: 8, r: 8, rpe: 8, d, t: 0, auto: true },
        { lift: 'Cable External Rotation', kg: 12, w: 9, r: 8, rpe: 8, d: '2026-09-08', t: now, test: true },
        { lift: 'Machine Lying Leg Curl', kg: 40, w: 35, r: 8, rpe: 8, d, t: 0, auto: true },
        { lift: 'Half-Kneeling Single-Arm Cable Row', kg: 30, w: 25, r: 8, rpe: 8, d, t: 0, auto: true },
        { lift: 'Lift The Spine Does Not Know', kg: 50, w: 40, r: 8, rpe: 8, d, t: 0, auto: true },
      ]);
      const changed = dropIneligibleRecords();
      return { changed, live: loadCeiling().map(e => e.lift + (e.test ? ' (test)' : '')).sort(), raw: loadCeilingRaw().filter(e => e.del).map(e => e.lift).sort() };
    });
    C.check('isolation records filed by themselves become tombstones; a tested one, a strength one and an unknown lift stay',
      t.changed && JSON.stringify(t.raw) === JSON.stringify(['Cable External Rotation', 'Machine Lying Leg Curl']) && JSON.stringify(t.live) === JSON.stringify(['Cable External Rotation (test)', 'Half-Kneeling Single-Arm Cable Row', 'Lift The Spine Does Not Know']), JSON.stringify(t));
    C.check('no page errors (eligibility)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 11. the records screens say the measure, and Log a max has a unit button ──
  {
    const d = H.past;
    const recs = [
      { lift: 'Barbell Back Squat', kg: 122.5, w: 100, r: 5, rpe: 8, d: d(30), t: 1, auto: true },
      { lift: 'Barbell Back Squat', kg: 280, w: 225, r: 5, rpe: 8, d: d(10), t: 1, auto: true, u: 'lb' },
      { lift: 'Barbell Back Squat', kg: 290, w: 235, r: 5, rpe: 8, d: d(3), t: 1, auto: true, u: 'lb' },
    ];
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [], seed: { _1rm: recs }, stub: { library: H.library() } });
    await p.evaluate("goTo('ceiling')"); await p.waitForTimeout(350);
    const list = await p.evaluate(() => ({ row: document.querySelector('#ceil-body .ceil-lift').innerText.replace(/\s+/g, ' '), cover: document.getElementById('ceil-board').innerText.replace(/\s+/g, ' ') }));
    C.check('the list shows the lift in the measure it was last lifted in, with its unit', /290/.test(list.row) && /LB/i.test(list.row) && !/KG/.test(list.row.replace(/\d+ lb/i, '')), JSON.stringify(list));
    await p.click('#ceil-body .ceil-lift'); await p.waitForTimeout(400);
    const page = await p.evaluate(() => ({ cover: document.getElementById('ceil-board').innerText.replace(/\s+/g, ' '), rows: [...document.querySelectorAll('#ceil-body .ceil-row')].map(r => r.innerText.replace(/\s+/g, ' ')) }));
    C.check('a lift\'s page is the pounds series only: 290 lb, +10 lb since first, two entries, each row in lb', /290/.test(page.cover) && /lb/i.test(page.cover) && /\+10/.test(page.cover) && page.rows.length === 2 && page.rows.every(r => /lb/.test(r) && !/ kg/.test(r)), JSON.stringify(page));
    await p.evaluate(() => { const i = ceilingCandidates().findIndex(c => c.name === 'Barbell Back Squat'); openCeilingForm(i); });
    await p.waitForTimeout(300);
    const f = await p.evaluate(() => ({ unit: document.getElementById('cf-unit').textContent }));
    C.check('Log a max opens in the lift\'s own measure (lb) with a unit button', f.unit === 'lb', JSON.stringify(f));
    await p.fill('#cf-kg', '240'); await p.fill('#cf-rp', '5'); await p.click('.cf-rpe .rpe-btn[data-rpe="8"]'); await p.waitForTimeout(150);
    const o1 = await p.evaluate(() => ({ out: document.getElementById('cf-out').innerText.replace(/\s+/g, ' ') }));
    await p.click('#cf-unit'); await p.waitForTimeout(150);
    const o2 = await p.evaluate(() => ({ unit: document.getElementById('cf-unit').textContent, out: document.getElementById('cf-out').innerText.replace(/\s+/g, ' ') }));
    C.check('the estimate follows the unit: 240 lb × 5 @ RPE 8 is 295 LB, and plates give a number of plates', /295/.test(o1.out) && /LB/i.test(o1.out) && o2.unit === 'plates' && /PLATES/i.test(o2.out), JSON.stringify([o1, o2]));
    await p.click('#cf-save'); await p.waitForTimeout(300);
    const saved = await p.evaluate(() => loadCeilingRaw().filter(e => e.d === ceilingToday()).map(e => ({ kg: e.kg, w: e.w, u: e.u || '' })));
    C.check('saved in plates it is a plates entry (the first one: beats nothing), not a kilogram one', saved.length === 1 && saved[0].u === 'plates' && saved[0].w === 240, JSON.stringify(saved));
    C.check('no page errors (records screens)', !p.errs.length, JSON.stringify(p.errs));
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
