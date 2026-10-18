// A weight far above the lift's own numbers asks once (Line Call, 2026-10-13; Amir: "yes to all recommended"):
// node scripts/headless/kg-check.js
//
// "600" typed for 60 used to fill down, stay on a ticked set after the fix, and become an automatic Personal Record of about
// 760 kg that blocked every real one. Now (kgLooksWrong(): over 1.5 × the lift's heaviest on this phone, or over 300 kg with no
// numbers yet) the tick asks first: one tap arms it (a clay ring, the note box says so), a second within 4 s keeps it, and the same
// weight never asks again on that card. A big weight typed into a set already ticked says so once. Guided's Done does the same.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');
const SQ = 'Barbell Back Squat';
const LW = [0, 1, 2, 3].map(() => ({ w: '', n: '', r: '', d: false, lw: '80' }));   // last time: 80 kg on every set

async function openSquat(p) {
  await p.evaluate(`(() => { openDayView('1'); const c = ${H.card(SQ)}; if (c.classList.contains('collapsed')) toggleExpand(c); c.id = 'sq'; try { hideAaToast(); } catch (e) {} })()`);
  await p.waitForTimeout(300);
}
const row = i => `#sq .ex-set-row[data-set-idx="${i}"]`;
const state = p => p.evaluate(() => {
  const t = document.getElementById('aaToast');
  return { sets: loadSetLog('Barbell Back Squat', 4, '1').map(s => (s.w || '-') + (s.d ? '✓' : '')).join(' '),
    toast: t && !t.hidden ? t.innerText.replace(/\s+/g, ' ').trim() : '', armed: !!document.querySelector('#sq .ex-set-check.kg-armed') };
});

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  // ── 1. The list: 600 on a lift last done at 80 ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), seed: { _setlog_Barbell_Back_Squat: LW }, stub: { library: H.library() } });
    await openSquat(p);
    await p.fill(`${row(0)} .ex-set-weight`, '600');
    await p.click(`${row(0)} .ex-set-check`); await p.waitForTimeout(250);
    const a = await state(p);
    C.check('600 kg on a lift last done at 80: the first tap does not tick, it arms the tick (clay ring) and asks', !/✓/.test(a.sets.split(' ')[0]) && a.armed
      && /600 kg\? That's far above your numbers for this lift\. Tap ✓ again to keep it\./.test(a.toast), JSON.stringify(a));
    C.check('the ring is clay', await p.evaluate(() => getComputedStyle(document.querySelector('#sq .ex-set-check.kg-armed'), '::before').borderTopColor) === 'rgb(199, 85, 47)');
    await p.click(`${row(0)} .ex-set-check`); await p.waitForTimeout(250);
    const b = await state(p);
    C.check('a second tap within 4 s keeps it: ticked, the note box goes', b.sets.split(' ')[0] === '600✓' && !b.armed && !/far above/.test(b.toast), JSON.stringify(b));
    await p.click(`${row(1)} .ex-set-check`); await p.waitForTimeout(250);
    const c = await state(p);
    C.check('the same weight (filled down) never asks again on that card', c.sets.split(' ')[1] === '600✓' && !/far above/.test(c.toast), JSON.stringify(c));
    // a typo fixed before the second tap: the fix is what gets ticked, nothing asks
    await p.fill(`${row(2)} .ex-set-weight`, '1000');   // the kept 600 is "your numbers" now: 1.5 × 600 = 900
    await p.click(`${row(2)} .ex-set-check`); await p.waitForTimeout(200);
    const d1 = await state(p);
    await p.waitForTimeout(4300);   // the arm runs out
    await p.fill(`${row(2)} .ex-set-weight`, '85');
    await p.click(`${row(2)} .ex-set-check`); await p.waitForTimeout(250);
    const d = await state(p);
    C.check('a typo fixed instead of the second tap: 85 ticks at once and the arm has run out', d1.armed && /1000 kg\?/.test(d1.toast) && d.sets.split(' ')[2] === '85✓' && !d.armed, JSON.stringify([d1, d]));
    C.check('no page errors (the list)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 2. A normal jump ticks at once; a lift with no numbers yet only asks past 300 kg ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), seed: { _setlog_Barbell_Back_Squat: LW }, stub: { library: H.library() } });
    await openSquat(p);
    await p.fill(`${row(0)} .ex-set-weight`, '110');
    await p.click(`${row(0)} .ex-set-check`); await p.waitForTimeout(250);
    const a = await state(p);
    C.check('110 on a lift last done at 80 (under 1.5 ×) ticks at once, nothing asks', a.sets.split(' ')[0] === '110✓' && !/far above/.test(a.toast) && !a.armed, JSON.stringify(a));
    await ctx.close();
  }
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [], stub: { library: H.library() } });
    await openSquat(p);
    await p.fill(`${row(0)} .ex-set-weight`, '250');
    await p.click(`${row(0)} .ex-set-check`); await p.waitForTimeout(250);
    const a = await state(p);
    await p.fill(`${row(1)} .ex-set-weight`, '400');   // over 1.5 × the 250 just ticked
    await p.click(`${row(1)} .ex-set-check`); await p.waitForTimeout(250);
    const b = await state(p);
    C.check('no numbers yet: 250 ticks at once, then 400 (over 1.5 × the 250 just ticked) asks', a.sets.split(' ')[0] === '250✓' && !/far above/.test(a.toast) && !/✓/.test(b.sets.split(' ')[1]) && b.armed, JSON.stringify([a, b]));
    await ctx.close();
  }

  // ── 3. A big weight typed into a set already ticked says so once ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), seed: { _setlog_Barbell_Back_Squat: LW }, stub: { library: H.library() } });
    await openSquat(p);
    await p.click(`${row(0)} .ex-set-check`); await p.waitForTimeout(250);   // ticked with an empty box
    await p.evaluate(() => { try { hideAaToast(); } catch (e) {} });
    await p.fill(`${row(0)} .ex-set-weight`, '600');
    await p.locator(`${row(0)} .ex-set-weight`).blur(); await p.waitForTimeout(250);
    const a = await state(p);
    C.check('600 typed into a ticked set: the note box says to fix it if it is a typo, and the set stays as typed', a.sets.split(' ')[0] === '600✓'
      && /600 kg\? That's far above your numbers for this lift\. If it's a typo, fix it in the weight box\./.test(a.toast), JSON.stringify(a));
    await ctx.close();
  }

  // ── 3b. A build-up asks once (Amir, 2026-10-18: "it asks this question but warns you twice, I thought it's a bug") ──
  // 120 · 140 · 160 · 180 on a lift last done at 50: 120 is over 1.5 × 50 and asks; once it is kept (and ticked), 140 is measured against
  // the 120 just ticked, 160 against the 140, and none of them asks. It used to ask again at every heavier set.
  {
    const LW50 = LW.map(s => Object.assign({}, s, { lw: '50' }));
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), seed: { _setlog_Barbell_Back_Squat: LW50 }, stub: { library: H.library() } });
    await openSquat(p);
    const seen = [];
    for (const [i, w] of [[0, '120'], [1, '140'], [2, '160'], [3, '180']]) {
      await p.fill(`${row(i)} .ex-set-weight`, w);
      await p.click(`${row(i)} .ex-set-check`); await p.waitForTimeout(250);
      let a = await state(p);
      const asked = a.armed;
      if (asked) { await p.click(`${row(i)} .ex-set-check`); await p.waitForTimeout(250); a = await state(p); }
      seen.push(w + (asked ? ' asked' : ' ticked') + (a.sets.split(' ')[i].endsWith('✓') ? '' : ' NOT TICKED'));
    }
    C.check('a ramp 120 · 140 · 160 · 180 on a lift last done at 50 asks once, at 120; 140, 160 and 180 tick at once',
      seen.join(' | ') === '120 asked | 140 ticked | 160 ticked | 180 ticked', seen.join(' | '));
    C.check('no page errors (the ramp)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 3c. Pounds are compared as kilograms, plates are never "far above" anything ──
  const sets = p => p.evaluate(() => loadSetLog('Barbell Back Squat', 4, '1').map(s => ({ w: s.w, d: !!s.d })));
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), seed: { _setlog_Barbell_Back_Squat: LW }, stub: { library: H.library() } });
    await openSquat(p);
    await p.click(`#sq .ex-set-unit`); await p.waitForTimeout(150);          // kg -> lb
    await p.fill(`${row(0)} .ex-set-weight`, '300');                         // 300 lb = 136 kg, over 1.5 × 80
    await p.click(`${row(0)} .ex-set-check`); await p.waitForTimeout(250);
    const a = await state(p);
    C.check('300 lb on a lift last done at 80 kg (136 kg) asks, and says pounds', a.armed && /^CHECK THE WEIGHT 300 lb\? /.test(a.toast), JSON.stringify(a));
    await p.fill(`${row(0)} .ex-set-weight`, '100');                         // 100 lb = 45 kg: nothing to ask
    await p.click(`${row(0)} .ex-set-check`); await p.waitForTimeout(250);
    const b = await sets(p);
    C.check('100 lb (45 kg) ticks at once and is saved as "100 lb"', b[0].w === '100 lb' && b[0].d, JSON.stringify(b));
    await ctx.close();
  }
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), seed: { _setlog_Barbell_Back_Squat: LW }, stub: { library: H.library() } });
    await openSquat(p);
    await p.click(`#sq .ex-set-unit`); await p.click(`#sq .ex-set-unit`); await p.waitForTimeout(150);   // kg -> lb -> plates
    await p.fill(`${row(0)} .ex-set-weight`, '600');
    await p.click(`${row(0)} .ex-set-check`); await p.waitForTimeout(250);
    const c = await sets(p), t = await state(p);
    C.check('600 plates is no load: it ticks at once, nothing asks, and it is saved as "600 plates"', c[0].w === '600 plates' && c[0].d && !t.armed && !/far above/.test(t.toast), JSON.stringify([c, t]));
    await ctx.close();
  }

  // ── 4. Guided: Done · Start Rest ✓ asks first, and opens no rest until it is kept ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), seed: { _setlog_Barbell_Back_Squat: LW.map(s => Object.assign({}, s, { w: '600' })) }, stub: { library: H.library() } });
    await p.evaluate(() => { openDayView('1'); openStepMode('1'); const i = STEP.seq.findIndex(x => x.name === 'Barbell Back Squat' && x.setI === 0); STEP.pos = i; renderStep(); });
    await p.waitForTimeout(300);
    await p.click('#step-footer .step-primary-btn'); await p.waitForTimeout(300);
    const a = await p.evaluate(() => ({ done: stepDone(STEP.seq[STEP.pos]), timer: document.getElementById('timerOverlay').classList.contains('visible'),
      toast: (document.getElementById('aaToast') || {}).innerText || '' }));
    C.check('Guided: the first Done does not tick 600 and opens no rest; it asks', !a.done && !a.timer && /600 kg\?/.test(a.toast), JSON.stringify(a));
    await p.click('#step-footer .step-primary-btn'); await p.waitForTimeout(400);
    const b = await p.evaluate(() => ({ done: loadSetLog('Barbell Back Squat', 4, '1')[0].d, timer: document.getElementById('timerOverlay').classList.contains('visible') }));
    C.check('Guided: the second Done keeps it and the rest starts', b.done && b.timer, JSON.stringify(b));
    C.check('no page errors (Guided)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
