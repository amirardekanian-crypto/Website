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

(async () => {
  const browser = await H.launch();
  await typing(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
