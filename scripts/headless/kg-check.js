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
    await p.fill(`${row(2)} .ex-set-weight`, '850');
    await p.click(`${row(2)} .ex-set-check`); await p.waitForTimeout(200);
    const d1 = await state(p);
    await p.waitForTimeout(4300);   // the arm runs out
    await p.fill(`${row(2)} .ex-set-weight`, '85');
    await p.click(`${row(2)} .ex-set-check`); await p.waitForTimeout(250);
    const d = await state(p);
    C.check('a typo fixed instead of the second tap: 85 ticks at once and the arm has run out', d1.armed && /850 kg\?/.test(d1.toast) && d.sets.split(' ')[2] === '85✓' && !d.armed, JSON.stringify([d1, d]));
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
    await p.fill(`${row(1)} .ex-set-weight`, '350');
    await p.click(`${row(1)} .ex-set-check`); await p.waitForTimeout(250);
    const b = await state(p);
    C.check('no numbers yet: 250 ticks at once, 350 (over 300) asks', a.sets.split(' ')[0] === '250✓' && !/far above/.test(a.toast) && !/✓/.test(b.sets.split(' ')[1]) && b.armed, JSON.stringify([a, b]));
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
      && /600 kg\? That's far above your numbers for this lift\. If it's a typo, fix it in the kg box\./.test(a.toast), JSON.stringify(a));
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
