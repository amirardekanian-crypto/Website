// Love All round 4 (2026-10-24): the three look-and-reach fixes, checked the way the athlete meets them.
//   B2  steps: tap the number to type it (Home's Today card). Enter or leaving the box saves it through the same door as the +,
//       Escape or an empty box leaves it, the cap holds, the − and + still step, and the number is a 44 px target.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-ui.js
'use strict';
const H = require('./lib');

const t = H.checker();
const CFG_ON = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const val = (p, id) => p.evaluate(id => AAHabits.valOf(AAHabits.AKEY(), id), id);

// ═════════ B2: tap the number to type it ═════════
async function typing(browser) {
  const { ctx, p } = await H.openProgram(browser, { prog: H.fixture(), seed: { _hab_cfg: CFG_ON } });
  await p.waitForTimeout(800);
  const sel = id => `.hb-wrap[data-h="${id}"] .hb-now`;
  const box = await p.evaluate(s => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return { tag: e.tagName, w: r.width, h: r.height }; }, sel('steps'));
  t.check('type: the number is a button, and a 44 px target', box.tag === 'BUTTON' && box.h >= 44 && box.w >= 44, JSON.stringify(box));

  // Tap it: a number box, the number keypad, focused.
  await p.tap(sel('steps')).catch(() => p.click(sel('steps')));
  await p.waitForTimeout(150);
  const open = await p.evaluate(() => { const e = document.activeElement; return { tag: e.tagName, id: e.id, im: e.getAttribute('inputmode'), h: e.getBoundingClientRect().height }; });
  t.check('type: a tap on the number turns it into a number box with the number keypad, focused',
    open.tag === 'INPUT' && open.id === 'hab-type-steps' && open.im === 'numeric' && open.h >= 44, JSON.stringify(open));

  // Type 12,000 and press Enter.
  await p.keyboard.type('12000');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(250);
  t.check('type: 12000 and Enter saves 12,000 steps in one go', (await val(p, 'steps')) === 12000, await val(p, 'steps'));
  t.check('type: the box goes back to the number', await p.evaluate(s => document.querySelector(s).tagName === 'BUTTON' && !document.querySelector('input.hb-type'), sel('steps')));
  const lg = await p.evaluate(() => JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_log') || '{}'));
  t.check('type: it is in the habit log (AA Proof\'s own key), same as a +', Object.values(lg).some(d => d && d.steps === 12000), JSON.stringify(lg).slice(0, 160));

  // The + still steps from there.
  await p.evaluate(() => document.querySelector('.hb-wrap[data-h="steps"] .hb-step[data-d="1"]').click());
  await p.waitForTimeout(200);
  t.check('type: the + still steps by 500 from the typed number', (await val(p, 'steps')) === 12500, await val(p, 'steps'));

  // Escape leaves it.
  await p.click(sel('steps')); await p.waitForTimeout(100);
  await p.keyboard.type('3'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  t.check('type: Escape leaves the number as it was', (await val(p, 'steps')) === 12500 && await p.evaluate(() => !document.querySelector('input.hb-type')), await val(p, 'steps'));

  // Empty leaves it (Enter, then blur).
  await p.click(sel('steps')); await p.waitForTimeout(100);
  await p.keyboard.press('Backspace'); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  t.check('type: an empty box leaves the number as it was', (await val(p, 'steps')) === 12500, await val(p, 'steps'));

  // Leaving the box saves it, and the cap holds like the + (target 10,000 x 3 = 30,000).
  await p.click(sel('steps')); await p.waitForTimeout(100);
  await p.keyboard.type('99999');
  await p.evaluate(() => document.activeElement.blur());
  await p.waitForTimeout(250);
  t.check('type: leaving the box saves it, and the daily cap holds (30,000)', (await val(p, 'steps')) === 30000, await val(p, 'steps'));

  // Zero is allowed (the − floor).
  await p.click(sel('steps')); await p.waitForTimeout(100);
  await p.keyboard.type('0'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  t.check('type: 0 clears it', (await val(p, 'steps')) === 0, await val(p, 'steps'));

  // Another count habit: sleep takes a half-hour, with a decimal keypad and a comma.
  await p.click(sel('sleep')); await p.waitForTimeout(100);
  const im = await p.evaluate(() => document.activeElement.getAttribute('inputmode'));
  await p.keyboard.type('7,5'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  t.check('type: it works on every count habit (sleep: decimal keypad, 7,5 is 7.5)', im === 'decimal' && (await val(p, 'sleep')) === 7.5, im + ' ' + await val(p, 'sleep'));

  // The session habit is not a count habit: no number to type.
  t.check('type: the session habit has no number to type', await p.evaluate(() => !document.querySelector('.hb-wrap[data-h="strength"] .hb-now')));
  t.check('type: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ B4: Before you start is one closed row ═════════
async function before(browser) {
  const LIB = H.library();
  for (const FULL of ['strength/full-body-power', 'mobility/everyday-mobility']) {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, stub: { library: LIB } });
    p.setDefaultTimeout(8000);
    await p.evaluate(() => goLibrary()); await p.waitForTimeout(900);
    await p.evaluate(k => openWorkout(k), FULL); await p.waitForTimeout(800);
    const m = () => p.evaluate(() => {
      const b = document.getElementById('ws-before-btn'), body = document.getElementById('ws-before-body'), r = b.getBoundingClientRect();
      const first = document.querySelector('#ws-body .checklist-item, #ws-body .hrow, #ws-body > *'), fr = first && first.getBoundingClientRect();
      return { tag: b.tagName, exp: b.getAttribute('aria-expanded'), ctl: b.getAttribute('aria-controls'), h: Math.round(r.height), n: document.getElementById('ws-before-n').textContent,
        bodyVis: !!body.getClientRects().length, firstTop: fr ? Math.round(fr.top) : null, vh: innerHeight, sw: document.documentElement.scrollWidth, w: innerWidth };
    });
    const c = await m();
    t.check(`before ${FULL}: one closed row, a button with aria-expanded=false, 44 px or more, a count on the right`,
      c.tag === 'BUTTON' && c.exp === 'false' && c.ctl === 'ws-before-body' && c.h >= 44 && /^\d+ things?$/.test(c.n) && !c.bodyVis, JSON.stringify(c));
    t.check(`before ${FULL}: at 390 px the first exercise starts on the first screen`, c.firstTop !== null && c.firstTop < c.vh - 60, JSON.stringify([c.firstTop, c.vh]));
    t.check(`before ${FULL}: nothing runs off the side`, c.sw <= c.w, JSON.stringify([c.sw, c.w]));
    await p.focus('#ws-before-btn'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    const o = await m();
    t.check(`before ${FULL}: the keyboard opens it to the full block`, o.exp === 'true' && o.bodyVis, JSON.stringify(o));
    await p.keyboard.press('Space'); await p.waitForTimeout(250);
    t.check(`before ${FULL}: and closes it again`, (await m()).exp === 'false');
    t.check(`before ${FULL}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

// ═════════ B6: nothing an athlete reads is under 12 px ═════════
// The smallest visible text on a screen, and whether anything runs off the side or a tab label is cut.
const smallest = p => p.evaluate(() => {
  const bad = []; let min = 99;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    if (!n.nodeValue.trim()) continue;
    const e = n.parentElement;
    if (!e || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(e.tagName) || e.closest('svg')) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const rr = [...rg.getClientRects()].find(r => r.width > 1 && r.height > 1 && r.bottom > 0 && r.right > 0 && r.left < innerWidth);
    if (!rr) continue;
    let hid = false;   // inside an element that is clipped away or sits in a closed layer
    for (let a = e; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden') { hid = true; break; } }
    if (hid) continue;
    const px = parseFloat(cs.fontSize);
    if (px < min) min = px;
    if (px < 12) bad.push(px + ' ' + (e.className || e.tagName) + ' "' + n.nodeValue.trim().slice(0, 24) + '"');
  }
  const tabs = [...document.querySelectorAll('.nav-item .nav-label')].map(l => ({ t: l.textContent, cut: l.scrollWidth > l.clientWidth + 1, wraps: l.getClientRects().length > 1 || l.getBoundingClientRect().height > 20 }));
  return { min, bad: bad.slice(0, 6), nBad: bad.length, over: document.documentElement.scrollWidth - innerWidth, tabs };
});
async function floor(browser) {
  const LIB = H.library();
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { ctx, p } = await H.openProgram(browser, { w, h, prog: H.fixture(), stub: { library: LIB }, seed: { _hab_cfg: CFG_ON } });
    p.setDefaultTimeout(8000);
    await p.waitForTimeout(900);
    const screens = [['Home', () => goTo('home')], ['Progress', () => goTo('plan')], ['Library', () => goLibrary()],
      ['Library Playbook', () => setLibPane('playbook')], ['Library Exercises', () => setLibPane('exercises')], ['Coach', () => goTo('notes')],
      ['a Library session', () => { goLibrary(); openWorkout('strength/full-body-power'); }],
      ['the day view', () => { goTo('home'); openDayView('1'); }], ['Guided', () => { openStepMode('1'); }]];
    for (const [name, fn] of screens) {
      await p.evaluate(fn); await p.waitForTimeout(800);
      const r = await smallest(p);
      t.check(`floor ${w}: ${name}: no visible text under 12 px (smallest ${r.min}px)`, r.min >= 12 && r.nBad === 0, JSON.stringify(r.bad));
      t.check(`floor ${w}: ${name}: nothing runs off the side`, r.over <= 0, r.over);
      t.check(`floor ${w}: ${name}: every tab label whole, on one line`, r.tabs.length >= 4 && r.tabs.every(x => !x.cut && !x.wraps), JSON.stringify(r.tabs.filter(x => x.cut || x.wraps)));
    }
    t.check(`floor ${w}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

(async () => {
  const browser = await H.launch();
  await typing(browser);
  await floor(browser);
  await before(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
