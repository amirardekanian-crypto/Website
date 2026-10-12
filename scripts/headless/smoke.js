// Smoke test of both athlete apps against the stub (about a minute). Every main screen opens at phone
// width, light and dark, nothing throws and nothing scrolls sideways. Screenshots go to --out.
// Serve the repo first: python3 -m http.server 8765 --bind 127.0.0.1 (see lib.js).
'use strict';
const path = require('path');
const H = require('./lib');

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const noSideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const shot = (p, name) => p.screenshot({ path: path.join(shots, name + '.png') });

  // ── program.html ──
  for (const [w, dark] of [[390, false], [390, true], [320, false]]) {
    const tag = `${w}${dark ? ' dark' : ''}`, file = `program-${w}${dark ? '-dark' : ''}`;
    const { ctx, p } = await H.openProgram(browser, { w, dark });
    const home = await p.evaluate(() => ({ on: document.getElementById('screen-home').classList.contains('active'),
      cycle: !!document.querySelector('.cyc-card'), text: document.getElementById('screen-home').innerText.length }));
    t.check(`program ${tag}: Home opens with the This cycle card`, home.on && home.cycle && home.text > 100, JSON.stringify(home));
    t.check(`program ${tag}: Home has no sideways scroll`, (await noSideways(p)) <= 0);
    await shot(p, file + '-home');

    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);
    const day = await p.evaluate(() => document.querySelectorAll('#day-view .checklist-item').length);
    t.check(`program ${tag}: Day 1 opens with its exercises`, day >= 4, day);

    // Centre Court r2: the number is the tick (P24) and a chevron says a row opens. Every closed row: its zero-padded
    // numeral centred in the 44 px tap column that covers it, a chevron on the name line, the ⓘ (44 px) at least 28 px
    // under the chevron's centre; a done row has no chevron and a solid numeral.
    const rowsOk = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('#day-view .day-content.active .checklist-item.collapsed').forEach(c => {
        const im = c.querySelector('.item-main'), n = c.querySelector('.ex-num'), cb = c.querySelector('.check-box');
        const ir = im.getBoundingClientRect(), nr = n.getBoundingClientRect(), br = cb.getBoundingClientRect();
        const ns = getComputedStyle(n), af = getComputedStyle(im, '::after'), ab = c.querySelector('.ex-side .ex-about');
        const chev = af.content !== 'none' && af.content !== 'normal';
        const chevC = chev ? ir.top + parseFloat(getComputedStyle(im).paddingTop) + parseFloat(af.marginTop) + parseFloat(af.height) / 2 : null;
        const a = ab && ab.offsetParent ? ab.getBoundingClientRect() : null;
        out.push({ name: c.querySelector('.item-name').textContent.trim(), text: n.textContent, done: c.classList.contains('checked'),
          numCx: Math.round(nr.left + nr.width / 2), boxCx: Math.round(br.left + br.width / 2), boxW: Math.round(br.width), boxH: Math.round(br.height),
          covers: br.top <= nr.top - 10 && br.bottom >= nr.bottom + 10, stroke: ns.webkitTextStrokeWidth, fill: ns.color, fs: ns.fontSize,
          chev, gap: a && chevC != null ? Math.round(a.top + a.height / 2 - chevC) : null, about: a ? Math.round(a.height) : null });
      });
      return out;
    });
    const badRows = rowsOk.filter(r => !/^\d\d$/.test(r.text) || Math.abs(r.numCx - r.boxCx) > 1 || r.boxW < 44 || r.boxH < 44 || !r.covers
      || r.fs !== '32px' || r.stroke !== '1.5px' || (r.done ? (r.chev || r.fill === 'rgba(0, 0, 0, 0)') : (!r.chev || r.fill !== 'rgba(0, 0, 0, 0)'))
      || (r.gap != null && r.gap < 28) || (r.about != null && r.about < 44));
    t.check(`program ${tag}: every closed row: its numeral is the tick, a chevron on its name line, the ⓘ 28+ px under it`,
      rowsOk.length >= 4 && rowsOk.some(r => r.gap != null) && !badRows.length, JSON.stringify(badRows.length ? badRows : rowsOk.slice(0, 2)));

    await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; if (c.classList.contains('collapsed')) toggleExpand(c); c.scrollIntoView({ block: 'start' }); })()`);
    await p.waitForTimeout(300);
    // No Last time box on the card since 2026-10-12 (Amir: "the history ... should be removed from exercise cards").
    const sets = await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; return { rows: c.querySelectorAll('.ex-set-row').length, want: parseInt(c.dataset.sets, 10), last: !!c.querySelector('.lt-box, .lt-strip:not(.lt-first)') }; })()`);
    t.check(`program ${tag}: the squat card opens with its sets and no Last time box`, sets.rows === sets.want && sets.rows > 0 && !sets.last, JSON.stringify(sets));
    t.check(`program ${tag}: the open card has no sideways scroll`, (await noSideways(p)) <= 0);
    await shot(p, file + '-card');

    await p.evaluate(() => { startTimerNow('1'); openGuided('1'); });
    await p.waitForTimeout(400);
    const g = await p.evaluate(() => ({ steps: STEP.seq.length, foot: document.getElementById('step-footer').getBoundingClientRect().height }));
    t.check(`program ${tag}: Guided opens on a step with its footer`, g.steps > 0 && g.foot > 0, JSON.stringify(g));
    await shot(p, file + '-guided');
    t.check(`program ${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── A per-side move with no kg box (Centre Court r2, E's p): its reps boxes read "4 / side", and that text is the
  // placeholder only. A tick records 4 reps (from the plan, never the text), and Guided's rest screen reads 4. ──
  {
    const prog = H.fixture();
    prog.workouts.days[0].blocks[1].exercises.unshift({ name: 'Single-Leg Box Jump', exId: 'single-leg-box-jump', type: 'standard',
      rx: { sets: 3, reps: 4, side: true, rpe: 7, rest: 60 } });
    const spine = H.SPINE.concat([{ id: 'single-leg-box-jump', name: 'Single-Leg Box Jump', aliases: [], equipment: ['box'],
      cues: { good: ['Land on the whole foot'], bad: [] }, purpose: 'One-leg power.' }]);
    const { ctx, p } = await H.openProgram(browser, { w: 390, prog, spine });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);
    const nm = 'Single-Leg Box Jump';
    const ps = await p.evaluate(`(() => { const c = ${H.card(nm)}; if (c.classList.contains('collapsed')) toggleExpand(c);
      const log = c.querySelector('.ex-set-log');
      return { noKg: log.classList.contains('no-kg'), ph: [...c.querySelectorAll('.ex-set-reps')].map(i => i.getAttribute('placeholder')) }; })()`);
    t.check('per side, no kg box: every reps box reads "4 / side"', ps.noKg && ps.ph.length === 3 && ps.ph.every(x => x === '4 / side'), JSON.stringify(ps));
    const tick = await p.evaluate(`(() => { const c = ${H.card(nm)}; c.querySelector('.ex-set-row .ex-set-check').click();
      const s = loadSetLog(${JSON.stringify(nm)}, 3)[0];
      const e = ((buildSessionData('1') || {}).log || []).find(x => x.ex === ${JSON.stringify(nm)});
      return { d: s.d, n: s.n, recorded: e && e.sets[0].n, planned: e && e.reps }; })()`);
    t.check('per side: one tick records 4 reps (the plan, not the placeholder\'s words)', tick.d === true && tick.n === '' && tick.recorded === 4 && tick.planned === 4, JSON.stringify(tick));
    const rest = await p.evaluate(`(() => { startTimerNow('1'); openGuided('1');
      const i = STEP.seq.findIndex(s => s.name === ${JSON.stringify(nm)} && s.setI === 1); if (i < 0) return { found: false };
      STEP.pos = i; renderStep();
      const b = [...document.querySelectorAll('#step-footer button')].find(x => /Start Rest|Done/.test(x.textContent)); if (b) b.click();
      const t = document.getElementById('aaToast'); if (t && !t.hidden) { const k = t.querySelector('button'); if (k) k.click(); }
      const log = document.getElementById('timerLog'), v = log && log.querySelector('.tl-val');
      const s = loadSetLog(${JSON.stringify(nm)}, 3)[1];
      return { found: true, shown: !!(log && !log.hidden), val: v && v.textContent.trim(), kg: !!(log && log.querySelector('.tl-kg')), d: s.d, n: s.n }; })()`);
    t.check('per side: Guided\'s rest screen reads 4 reps (parseInt of "4 / side") and no kg', rest.found && rest.shown && rest.val === '4' && !rest.kg && rest.d === true && rest.n === '',
      JSON.stringify(rest));
    const minus = await p.evaluate(() => { const b = document.querySelector('#timerLog .tl-step[data-d="-1"]'); if (b) b.click();
      return { val: (document.querySelector('#timerLog .tl-val') || {}).textContent }; });
    t.check('per side: Guided\'s − makes it 3', minus.val === '3', JSON.stringify(minus));
    t.check('per side: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── habits.html (AA Proof), the full app and Home's embedded strip ──
  for (const [url, dark, file] of [['/habits.html', false, 'proof-390'], ['/habits.html', true, 'proof-390-dark'], ['/habits.html?embed=1', false, 'proof-embed']]) {
    const { ctx, p } = await H.openProof(browser, { url, dark });
    const s = await p.evaluate(() => ({ screen: typeof UI !== 'undefined' ? UI.screen : null, text: document.getElementById('app').innerText.length }));
    t.check(`proof ${file}: renders${url.includes('embed') ? '' : ' on Today'}`, s.text > 100 && (url.includes('embed') || s.screen === 'today'), JSON.stringify(s));
    t.check(`proof ${file}: no sideways scroll, no page errors`, (await noSideways(p)) <= 0 && p.errs.length === 0, p.errs.join(' | '));
    await shot(p, file);
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
