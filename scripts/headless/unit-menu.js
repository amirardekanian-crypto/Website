// The unit menu and the circuit's Coach's Note (Amir, 2026-10-19): node scripts/headless/unit-menu.js
//   "the coach's note for this superset is on top of the card, should be under"
//   "if someone miss clicks the weight measure it changes: first a soft warning or notification, second let the person choose between the 3"
//
// 1. An open circuit's Coach's Note sits UNDER its green head (a card's body leads with its note; a circuit's body is `display: contents` in the
//    card's grid, where the note's order lifted it above the head), warm-up circuits too, at 320 / 390 px, light and dark.
// 2. A tap on a unit button (the set table's, a circuit's, Guided's, Log a max's) opens a menu of kg / lb / plates and changes NOTHING; a pick changes
//    the unit and says so in the note box with Undo; a tap anywhere else, Escape, a scroll that moves the button, a second tap and Back put it away.
// (weight-units.js holds the rest of the unit's rules: the text a weight is stored as, records and wins.)
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');
const SQ = 'Barbell Back Squat', PAIR = 'Row & Press Pair', PRIMER = 'Primer Pair';
const EMPTY = () => [0, 1, 2, 3].map(() => ({ w: '', n: '', r: '', d: false }));

function prog() {
  const P = H.fixture();
  const day = P.workouts.days[0];
  day.blocks[0].exercises.push({ type: 'circuit', name: PRIMER, warmup: true, rx: { rounds: 2 }, note: 'Light and easy, nothing here should feel like work. Stop if the shoulder pinches.',
    items: [{ name: 'Band Pull-Apart', rx: { reps: 12 } }, { name: 'Wall Slide', rx: { reps: 8 } }] });
  day.blocks.push({ title: 'Strength', exercises: [{ type: 'circuit', name: PAIR, rx: { rounds: 3, rpe: 8, rest: 90 },
    note: 'The bench press replaces the incline push-up you hated, and you can go as light as you need. No row machine with a chest pad? Use the Chest-Supported Dumbbell Row instead and keep the same reps.',
    items: [{ name: 'Machine Plate-Loaded Row', rx: { reps: 10 } }, { name: 'Dumbbell Bench Press', rx: { reps: 10 } }] }] });
  return P;
}
const open = (browser, o = {}) => H.openProgram(browser, Object.assign({ w: 390, h: 844, prog: prog(), hist: [], seed: { _setlog_Barbell_Back_Squat: EMPTY() }, stub: { library: H.library() } }, o));
async function openCard(p, name, id) {
  await p.evaluate(`(() => { openDayView('1'); const c = ${H.card(name)}; if (c.classList.contains('collapsed')) toggleExpand(c); c.id = ${JSON.stringify(id)}; try { hideAaToast(); } catch (e) {} c.scrollIntoView({ block: 'center' }); })()`);
  await p.waitForTimeout(350);
}
const menu = p => p.evaluate(() => { const m = document.querySelector('.unit-menu'); return m ? { opts: [...m.querySelectorAll('.unit-opt')].map(o => o.dataset.u + (o.getAttribute('aria-checked') === 'true' ? '*' : '')).join(' '), head: m.querySelector('.unit-menu-k').textContent } : null; });
const toast = p => p.evaluate(() => { const t = document.getElementById('aaToast'); return !t || t.hidden ? null : { k: (t.querySelector('.aa-toast-k') || {}).textContent, t: t.querySelector('.aa-toast-t').textContent, go: (t.querySelector('.aa-toast-go') || {}).textContent, x: t.querySelector('.aa-toast-x').textContent }; });
const stored = p => p.evaluate(() => loadSetLog('Barbell Back Squat', 4, '1').map(s => s.w));
const geo = (p, id) => p.evaluate(i => { const c = document.getElementById(i), h = c.querySelector('.item-main').getBoundingClientRect(), n = c.querySelector('.ex-coach-note').getBoundingClientRect(), l = c.querySelector('.round-list, .ex-set-log, .ex-log');
  return { headBottom: Math.round(h.bottom), noteTop: Math.round(n.top), noteBottom: Math.round(n.bottom), listTop: l ? Math.round(l.getBoundingClientRect().top) : null, noteText: c.querySelector('.ex-coach-note').textContent.slice(0, 20) }; }, id);

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  // ── 1. the Coach's Note sits under the head ──
  for (const [w, dark] of [[390, false], [320, false], [390, true]]) {
    const { ctx, p } = await open(browser, { w, dark });
    await openCard(p, PAIR, 'pair');
    const g = await geo(p, 'pair');
    C.check(`a superset's Coach's Note is directly under its green head (${w} px${dark ? ', dark' : ''})`, Math.abs(g.noteTop - g.headBottom) <= 2 && g.noteBottom <= g.listTop + 1, JSON.stringify(g));
    await openCard(p, PRIMER, 'primer');
    const k = await p.evaluate(() => ({ prep: document.getElementById('primer').classList.contains('is-prep') }));
    const g2 = await geo(p, 'primer');
    C.check(`a warm-up circuit's Coach's Note is under its head too (${w} px${dark ? ', dark' : ''})`, k.prep && Math.abs(g2.noteTop - g2.headBottom) <= 2, JSON.stringify([k, g2]));
    await openCard(p, SQ, 'sq');
    const g3 = await geo(p, 'sq');
    C.check(`a standard card's note is still under its head (${w} px${dark ? ', dark' : ''})`, Math.abs(g3.noteTop - g3.headBottom) <= 2, JSON.stringify(g3));
    const pad = await p.evaluate(() => ({ circuit: getComputedStyle(document.querySelector('#primer .ex-coach-note')).paddingBottom, standard: (() => { const n = document.querySelector('#sq .ex-coach-note'); return n ? getComputedStyle(n).paddingBottom : null; })() }));
    C.check(`...with 12 px of air under it (a circuit has nothing between its note and the first round's line); a standard card's note is unchanged (${w} px${dark ? ', dark' : ''})`, pad.circuit === '12px' && pad.standard === '0px', JSON.stringify(pad));
    C.check(`no page errors (the note, ${w} px${dark ? ', dark' : ''})`, !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 2. the set table's unit button ──
  {
    const { ctx, p } = await open(browser);
    await openCard(p, SQ, 'sq');
    await p.fill('#sq .ex-set-row[data-set-idx="0"] .ex-set-weight', '100');
    await p.evaluate(() => document.querySelector('#sq .ex-set-unit').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
    const before = await stored(p);
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(150);
    const m = await menu(p);
    C.check('a tap on the unit button opens a menu of kg, lb and plates (the current one marked) and changes nothing', m && m.opts === 'kg* lb plates' && /weight in/i.test(m.head)
      && (await stored(p)).join('|') === before.join('|') && (await p.evaluate(() => document.querySelector('#sq .ex-set-unit').textContent)) === 'kg' && !(await toast(p)), JSON.stringify([m, before, await stored(p)]));
    C.check('the button says it opens a menu (aria-haspopup, aria-expanded true while it is open)', await p.evaluate(() => { const b = document.querySelector('#sq .ex-set-unit'); return b.getAttribute('aria-haspopup') === 'menu' && b.getAttribute('aria-expanded') === 'true'; }));
    const near = await p.evaluate(() => { const r = document.querySelector('.unit-menu').getBoundingClientRect(), b = document.querySelector('#sq .ex-set-unit').getBoundingClientRect();
      return { inScreen: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, gap: Math.round(r.top - b.bottom), edge: Math.min(Math.abs(Math.round(r.left - b.left)), Math.abs(Math.round(r.right - b.right))) }; });
    C.check('the menu is on screen and hangs under its button, one edge level with the button\'s', near.inScreen && near.gap >= 0 && near.gap <= 10 && near.edge <= 14, JSON.stringify(near));
    // away: a tap elsewhere
    await p.mouse.click(30, 60); await p.waitForTimeout(150);
    C.check('a tap anywhere else puts the menu away and changes nothing', !(await menu(p)) && (await stored(p)).join('|') === before.join('|') && !(await toast(p)));
    // Escape
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(120);
    const focused = await p.evaluate(() => document.activeElement && document.activeElement.className);
    await p.keyboard.press('Escape'); await p.waitForTimeout(120);
    C.check('Escape puts it away and the focus goes back to the unit button (keyboard: the menu opens on the current row)', focused === 'unit-opt' && !(await menu(p)) && await p.evaluate(() => document.activeElement === document.querySelector('#sq .ex-set-unit')), focused);
    // Tab and Shift+Tab leave the menu: it closes and the focus goes back to the button
    for (const key of ['Tab', 'Shift+Tab']) {
      await p.click('#sq .ex-set-unit'); await p.waitForTimeout(120);
      await p.keyboard.press(key); await p.waitForTimeout(120);
      C.check(key + ' puts the menu away, aria-expanded goes back to false and the focus goes back to the unit button', !(await menu(p)) && await p.evaluate(() => { const b = document.querySelector('#sq .ex-set-unit'); return document.activeElement === b && b.getAttribute('aria-expanded') === 'false'; }));
    }
    // a second tap on the button
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(120);
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(150);
    C.check('a second tap on the button puts the menu away', !(await menu(p)));
    // the same unit again
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(120);
    await p.click('.unit-menu .unit-opt[data-u="kg"]'); await p.waitForTimeout(150);
    C.check('picking the unit it is already in closes the menu and says nothing', !(await menu(p)) && !(await toast(p)) && (await stored(p)).join('|') === before.join('|'));
    // a pick, with weights typed
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(120);
    await p.click('.unit-menu .unit-opt[data-u="lb"]'); await p.waitForTimeout(200);
    const t = await toast(p), s1 = await stored(p);
    C.check('a pick with weights typed relabels them ("100 lb") and the note box says so: what changed, and that no number changed, with Undo', s1.join('|') === '100 lb|100 lb|100 lb|100 lb'
      && t && t.k === 'Weight unit' && t.t === 'Weights are now in lb. The numbers you typed did not change.' && t.go === 'Undo' && t.x === 'Keep it', JSON.stringify([t, s1]));
    C.check('the note shows above the card (its Undo button is the top element at its centre) and the menu is gone', await p.evaluate(() => { const b = document.querySelector('#aaToast .aa-toast-go').getBoundingClientRect(); const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !document.querySelector('.unit-menu') && !!top && !!top.closest('#aaToast'); }));
    // the box lets a tap through to the weight box under it; only its buttons catch one
    const thru = await p.evaluate(() => { const e = document.getElementById('aaToast'), r = e.getBoundingClientRect(); const boxes = [...document.querySelectorAll('#sq .ex-set-weight')].filter(w => { const q = w.getBoundingClientRect(); return q.top >= r.top && q.bottom <= r.bottom && q.width > 0; });
      const hit = boxes.length ? document.elementFromPoint(boxes[0].getBoundingClientRect().left + 10, boxes[0].getBoundingClientRect().top + 10) : null;
      return { covered: boxes.length, throughBox: !!hit && hit.classList.contains('ex-set-weight'), pass: e.hasAttribute('data-pass') }; });
    C.check('the note lets a tap through to the weight boxes under it (data-pass), when any sit under it', thru.pass && (thru.covered === 0 || thru.throughBox), JSON.stringify(thru));
    await p.click('#aaToast .aa-toast-go'); await p.waitForTimeout(200);
    const s2 = await stored(p);
    C.check('Undo puts the unit back (kg, bare numbers) and the note box goes', s2.join('|') === '100|100|100|100' && (await p.evaluate(() => document.querySelector('#sq .ex-set-unit').textContent)) === 'kg' && !(await toast(p)), JSON.stringify(s2));
    // Keep it
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(120);
    await p.click('.unit-menu .unit-opt[data-u="plates"]'); await p.waitForTimeout(200);
    await p.click('#aaToast .aa-toast-x'); await p.waitForTimeout(150);
    C.check('Keep it closes the note and keeps the pick (plates)', !(await toast(p)) && (await stored(p)).every(w => w === '100 plates') && (await p.evaluate(() => document.querySelector('#sq .ex-set-unit').textContent)) === 'plates', JSON.stringify(await stored(p)));
    // the menu follows the card: the button's unit is the checked row
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(120);
    C.check('the checked row is the card\'s current unit (plates)', (await menu(p)).opts === 'kg lb plates*', JSON.stringify(await menu(p)));
    // a scroll that moves the button puts it away
    await p.evaluate(() => window.scrollBy(0, 90)); await p.waitForTimeout(250);
    C.check('a scroll that moves the button puts the menu away', !(await menu(p)));
    // no weights typed: the other sentence
    await p.evaluate(() => { saveSetLogValue('Barbell Back Squat', [0, 1, 2, 3].map(() => ({ w: '', n: '', r: '', d: false })), '1'); const c = document.getElementById('sq'); c._unit = null; c._paintSets(); });
    await p.waitForTimeout(150);
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(120);
    const cur = (await menu(p)).opts;
    await p.click('.unit-menu .unit-opt[data-u="lb"]'); await p.waitForTimeout(200);
    const t2 = await toast(p);
    C.check('a pick with nothing typed says only what the unit is now, for this exercise', t2 && t2.t === 'Weights are now in lb for this exercise.', JSON.stringify([cur, t2]));
    C.check('no page errors (the set table\'s menu)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 2b. the once-a-day clock offer survives opening the menu (a plain note does not) ──
  {
    const { ctx, p } = await open(browser);
    await openCard(p, SQ, 'sq');
    await p.fill('#sq .ex-set-row[data-set-idx="0"] .ex-set-weight', '100');
    await p.click('#sq .ex-set-row[data-set-idx="0"] .ex-set-check'); await p.waitForTimeout(350);
    const offer = await toast(p);
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(150);
    const after = await toast(p);
    C.check('the session clock offer (a note with a Start button) stays up when the unit menu opens', offer && offer.go === 'Start' && after && after.go === 'Start', JSON.stringify([offer, after]));
    await p.keyboard.press('Escape');
    await p.evaluate(() => aaToast('A plain note.', { kicker: 'Test' })); await p.waitForTimeout(100);
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(150);
    C.check('a plain note is put away when the menu opens (they would sit on each other)', !(await toast(p)));
    C.check('no page errors (the clock offer)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 3. Back closes the menu first ──
  {
    const { ctx, p } = await open(browser);
    await openCard(p, SQ, 'sq');
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(150);
    const armed = await p.evaluate(() => ({ armed: BACKNAV.armed, top: !!topLayer() }));
    await p.evaluate(() => history.back()); await p.waitForTimeout(300);
    const after = await p.evaluate(() => ({ menu: !!document.querySelector('.unit-menu'), day: !document.getElementById('day-view').hidden }));
    C.check('Back with the menu open closes the menu, not the day under it', armed.armed && armed.top && !after.menu && after.day, JSON.stringify([armed, after]));
    await p.evaluate(() => history.back()); await p.waitForTimeout(300);
    C.check('and the next Back closes the day, as ever', await p.evaluate(() => document.getElementById('day-view').hidden));
    C.check('no page errors (Back)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 4. the menu fits at 320 px and flips above a button near the bottom ──
  {
    const { ctx, p } = await open(browser, { w: 320, h: 640 });
    await openCard(p, SQ, 'sq');
    // the screen ends 60 px under the button (a short screen puts the button near the bottom wherever the page is scrolled)
    await p.evaluate(() => document.querySelector('#sq .ex-set-unit').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
    const y = await p.evaluate(() => Math.round(document.querySelector('#sq .ex-set-unit').getBoundingClientRect().bottom));
    await p.setViewportSize({ width: 320, height: y + 60 }); await p.waitForTimeout(300);
    await p.click('#sq .ex-set-unit'); await p.waitForTimeout(200);
    const f = await p.evaluate(() => { const r = document.querySelector('.unit-menu').getBoundingClientRect(), b = document.querySelector('#sq .ex-set-unit').getBoundingClientRect();
      return { inScreen: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, above: r.bottom <= b.top + 1, btnTop: Math.round(b.top), vh: innerHeight }; });
    C.check('at 320 px a button near the bottom gets the menu ABOVE it, and the menu is whole on the screen', f.inScreen && f.above, JSON.stringify(f));
    await ctx.close();
  }

  // ── 5. a circuit ──
  {
    const { ctx, p } = await open(browser);
    await openCard(p, PAIR, 'pair');
    const cw = () => p.evaluate(() => loadCircuitWeights('Row & Press Pair', 2));
    await p.click('#pair .circ-unit'); await p.waitForTimeout(150);
    const m = await menu(p);
    await p.click('.unit-menu .unit-opt[data-u="lb"]'); await p.waitForTimeout(200);
    const t = await toast(p), u1 = await p.evaluate(() => document.querySelector('#pair .circ-unit').textContent);
    C.check('a circuit\'s unit button opens the same menu; a pick with nothing typed says it is for this circuit', m && m.opts === 'kg* lb plates' && u1 === 'lb' && t && t.t === 'Weights are now in lb for this circuit.' && t.go === 'Undo', JSON.stringify([m, u1, t]));
    await p.click('#aaToast .aa-toast-go'); await p.waitForTimeout(150);
    C.check('Undo puts the circuit back to kg', (await p.evaluate(() => document.querySelector('#pair .circ-unit').textContent)) === 'kg' && !(await toast(p)));
    await p.fill('#pair .round-wt[data-item="0"]', '20'); await p.fill('#pair .round-wt[data-item="1"]', '15');
    await p.click('#pair .circ-unit'); await p.waitForTimeout(120);
    await p.click('.unit-menu .unit-opt[data-u="plates"]'); await p.waitForTimeout(200);
    const t2 = await toast(p), w2 = await cw();
    C.check('a pick with weights typed relabels each box\'s weight and the note says the numbers did not change', w2.join('|') === '20 plates|15 plates' && t2 && t2.t === 'Weights are now in plates. The numbers you typed did not change.'
      && await p.evaluate(() => [...document.querySelectorAll('#pair .round-wt')].map(i => i.value).join('|')) === '20|15', JSON.stringify([w2, t2]));
    await p.click('#aaToast .aa-toast-go'); await p.waitForTimeout(150);
    C.check('Undo gives the bare kilogram numbers back', (await cw()).join('|') === '20|15', JSON.stringify(await cw()));
    C.check('no page errors (a circuit)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 6. Guided ──
  {
    const { ctx, p } = await open(browser, { seed: { _setlog_Barbell_Back_Squat: EMPTY().map(s => Object.assign({}, s, { lw: '45 lb' })) } });
    await p.evaluate(() => { openDayView('1'); openStepMode('1'); const i = STEP.seq.findIndex(x => x.name === 'Barbell Back Squat' && x.setI === 0); STEP.pos = i; renderStep(); });
    await p.waitForTimeout(300);
    await p.click('#step-footer .step-primary-btn'); await p.waitForTimeout(400);
    await p.fill('#timerLog .tl-kg', '50'); await p.waitForTimeout(150);
    await p.click('#timerLog .tl-unit'); await p.waitForTimeout(150);
    const m = await menu(p);
    const over = await p.evaluate(() => { const r = document.querySelector('.unit-menu').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + 40); return !!(e && e.closest('.unit-menu')); });
    C.check('Guided: the label opens the menu over the rest screen, lb marked, nothing changed yet', m && m.opts === 'kg lb* plates' && over && (await p.evaluate(() => loadSetLog('Barbell Back Squat', 4, '1')[0].w)) === '50 lb', JSON.stringify([m, over]));
    await p.click('.unit-menu .unit-opt[data-u="kg"]'); await p.waitForTimeout(250);
    const t = await toast(p), d = await p.evaluate(() => ({ lab: document.querySelector('#timerLog .tl-unit').textContent, w: loadSetLog('Barbell Back Squat', 4, '1')[0].w }));
    const toastTop = await p.evaluate(() => { const b = document.querySelector('#aaToast .aa-toast-go').getBoundingClientRect(); const x = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!x && !!x.closest('#aaToast'); });
    C.check('Guided: a pick relabels the set, redraws the weight line ("Kg") and the note box shows above the rest screen with Undo', d.lab === 'Kg' && d.w === '50' && t && t.t === 'Weights are now in kg. The numbers you typed did not change.' && t.go === 'Undo' && toastTop, JSON.stringify([d, t, toastTop]));
    await p.click('#aaToast .aa-toast-go'); await p.waitForTimeout(250);
    const d2 = await p.evaluate(() => ({ lab: document.querySelector('#timerLog .tl-unit').textContent, w: loadSetLog('Barbell Back Squat', 4, '1')[0].w }));
    C.check('Guided: Undo redraws the weight line in the unit it was ("Lb", "50 lb")', d2.lab === 'Lb' && d2.w === '50 lb', JSON.stringify(d2));
    C.check('no page errors (Guided)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 7. Name Tag (Amir, 2026-10-19, "go with your picks"): the unit sits INSIDE a superset's weight box; the set table's header word is the button ──
  for (const [w, dark] of [[390, false], [320, false], [390, true]]) {
    const { ctx, p } = await open(browser, { w, dark });
    await openCard(p, PAIR, 'pair');
    const st = await p.evaluate(() => { const c = document.getElementById('pair'), f = [...c.querySelectorAll('.wt-field')];
      const r = el => el.getBoundingClientRect();
      return { head: !!c.querySelector('.round-wt-head'), fields: f.length, tags: f.map(x => !!x.querySelector('.round-wt') && !!x.querySelector('.circ-unit') && x.querySelector('.circ-unit').textContent).join('|'),
        fieldW: Math.round(r(f[0]).width), fieldH: Math.round(r(f[0]).height), tagH: Math.round(r(f[0].querySelector('.circ-unit')).height), tagW: Math.round(r(f[0].querySelector('.circ-unit')).width), inputW: Math.round(r(f[0].querySelector('.round-wt')).width),
        nameW: Math.round(r(c.querySelector('.round-name')).width), overflow: f.some(x => x.scrollWidth > x.clientWidth + 1), label: c.querySelector('.round-wt').getAttribute('aria-label') }; });
    C.check(`a superset has no pill row; each weight box is one field holding the number and its unit tag (${w} px${dark ? ', dark' : ''})`, !st.head && st.fields === 2 && st.tags === 'kg|kg' && st.fieldW === 108 && st.fieldH === 48, JSON.stringify(st));
    C.check(`the tag is a 44 px+ target, the number box keeps room to type 5 characters, the name has room (${w} px${dark ? ', dark' : ''})`, st.tagH >= 44 && st.tagW >= 40 && st.inputW >= 56 && st.nameW >= 90 && !st.overflow, JSON.stringify(st));
    C.check(`each box says what it is for (aria-label names the exercise) (${w} px${dark ? ', dark' : ''})`, /^Weight, Machine Plate-Loaded Row$/.test(st.label), st.label);
    if (w === 390 && !dark) {
      await p.fill('#pair .round-wt[data-item="1"]', '27.5');
      await p.click('#pair .wt-field:nth-of-type(1) .circ-unit', { trial: true }).catch(() => {});
      const tag2 = await p.evaluate(() => [...document.querySelectorAll('#pair .circ-unit')][1].getBoundingClientRect().right);
      await p.evaluate(() => [...document.querySelectorAll('#pair .circ-unit')][1].click()); await p.waitForTimeout(150);
      const mn = await p.evaluate(() => { const m = document.querySelector('.unit-menu'); const r = m && m.getBoundingClientRect(); return m ? { right: Math.round(r.right), inScreen: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight } : null; });
      C.check('a tap on the second box\'s tag opens the menu hanging from that tag, whole on the screen', mn && mn.inScreen && Math.abs(mn.right - tag2) <= 14, JSON.stringify([mn, tag2]));
      await p.click('.unit-menu .unit-opt[data-u="plates"]'); await p.waitForTimeout(200);
      const pl = await p.evaluate(() => ({ tags: [...document.querySelectorAll('#pair .circ-unit')].map(b => b.textContent).join('|'), vals: [...document.querySelectorAll('#pair .round-wt')].map(i => i.value).join('|'),
        inputW: Math.round(document.querySelector('#pair .round-wt').getBoundingClientRect().width), clipped: [...document.querySelectorAll('#pair .wt-field')].some(x => x.scrollWidth > x.clientWidth + 1), stored: loadCircuitWeights('Row & Press Pair', 2).join('|') }));
      C.check('a pick of plates changes the tag in EVERY box, the numbers stay, "plates" fits with room for the number', pl.tags === 'plates|plates' && pl.vals === '|27.5' && pl.stored === '|27.5 plates' && pl.inputW >= 44 && !pl.clipped, JSON.stringify(pl));
    }
    C.check(`no page errors (Name Tag superset, ${w} px${dark ? ', dark' : ''})`, !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser);
    await openCard(p, SQ, 'sq');
    const hd = await p.evaluate(() => { const b = document.querySelector('#sq .ex-set-unit'), cs = getComputedStyle(b), h = document.querySelector('#sq .ex-set-header'), af = getComputedStyle(b, '::after');
      return { border: cs.borderTopWidth, h: Math.round(b.getBoundingClientRect().height), headerH: Math.round(h.getBoundingClientRect().height), after: af.content, text: b.textContent, up: cs.textTransform }; });
    C.check('a set table\'s unit is the column header word with a chevron: no pill border, a 44 px target that does not grow the header row', hd.border === '0px' && hd.h >= 44 && hd.headerH <= 24 && /25BE|▾|▾/.test(hd.after) && hd.text === 'kg' && hd.up === 'uppercase', JSON.stringify(hd));
    C.check('no page errors (Name Tag set table)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
