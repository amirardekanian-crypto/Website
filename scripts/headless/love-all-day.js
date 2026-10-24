// Love All, the day screen (2026-10-24): four fixes from the first-timer + bug audit, checked the way the athlete meets them.
//   B4   a wrong weight typed into a set already ticked: the note box stays until answered, and only "Keep it" keeps the weight.
//   B15  "Ask Amir about ..." names the card in use (Guided's step, else the card last touched), not the first one left open.
//   B16  the "session clock isn't running" box goes when the athlete leaves the day, and its Start only starts the day it was offered for.
//   B26  Reset on the rest timer goes back to the card's own rest, whatever +15s did.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-day.js
'use strict';
const H = require('./lib');
const t = H.checker();
const SQ = 'Barbell Back Squat';
const BSS = 'Dumbbell Bulgarian Split Squat';

const open = async (browser, extra) => {
  const r = await H.openProgram(browser, Object.assign({ w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } }, extra || {}));
  return r;
};
const said = p => p.evaluate(() => { const e = document.getElementById('aaToast'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });

async function b4(browser) {
  const { ctx, p } = await open(browser);
  await p.evaluate(`(() => { openDayView('1'); const c = ${H.card(SQ)}; if (c.classList.contains('collapsed')) toggleExpand(c); c.id = 'sq'; try { hideAaToast(); } catch (e) {} })()`);
  await p.waitForTimeout(300);
  const row = '#sq .ex-set-row[data-set-idx="0"]';
  await p.fill(row + ' .ex-set-weight', '60');
  await p.click(row + ' .ex-set-check');
  await p.waitForTimeout(250);
  await p.fill(row + ' .ex-set-weight', '616');
  await p.dispatchEvent(row + ' .ex-set-weight', 'change');
  await p.waitForTimeout(300);
  t.check('B4: 616 on a ticked set: the box asks', /616 kg\? That's far above/.test(await said(p)), await said(p));
  await p.waitForTimeout(7000);
  t.check('B4: …and it is still there after 7 s', /far above/.test(await said(p)));
  t.check('B4: …with no timer on it', await p.evaluate(() => _toastT === null));
  // Not an answer: the box going for another reason must leave the weight unkept.
  await p.evaluate(() => hideAaToast());
  await p.dispatchEvent(row + ' .ex-set-weight', 'change');
  await p.waitForTimeout(250);
  t.check('B4: the box going by itself did not keep the weight: it asks again', /far above/.test(await said(p)), await said(p));
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.waitForTimeout(200);
  await p.click('#aaToast .aa-toast-go');
  await p.waitForTimeout(250);
  await p.dispatchEvent(row + ' .ex-set-weight', 'change');
  await p.waitForTimeout(250);
  t.check('B4: Keep it keeps the weight: it does not ask again', !(await said(p)));
  t.check('B4: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

async function b15(browser) {
  const { ctx, p } = await open(browser);
  await p.evaluate(`(() => { openDayView('1'); startTimerNow('1'); try { hideAaToast(); } catch (e) {} })()`);
  await p.waitForTimeout(400);
  await p.evaluate(`(() => { const c = ${H.card('Rowing')}; if (c.classList.contains('collapsed')) toggleExpand(c); })()`);
  const first = await p.evaluate(() => askAmirFor('1'));
  // Open the Bulgarian split squat and tick a set of it, with Rowing (the first open card) still open.
  await p.evaluate(`(() => { const c = ${H.card(BSS)}; if (c.classList.contains('collapsed')) toggleExpand(c); c.id = 'bss'; })()`);
  await p.waitForTimeout(300);
  await p.fill('#bss .ex-set-row[data-set-idx="0"] .ex-set-weight', '20');
  await p.click('#bss .ex-set-row[data-set-idx="0"] .ex-set-check');
  await p.waitForTimeout(300);
  const nm = await p.evaluate(() => askAmirFor('1'));
  t.check('B15: before any touch the first open card is Rowing', first === 'Rowing', first);
  t.check('B15: after a set of the split squat is ticked, Ask Amir names it, not the first open card', nm === BSS, nm + ' (first was ' + first + ')');
  // Guided: the current step's card.
  const g = await p.evaluate(`(() => { openGuided('1'); const it = STEP.seq[STEP.pos]; return { want: (it.group ? it.cards[0] : it.card).querySelector('.item-name').textContent.trim(), got: askAmirFor('1') }; })()`);
  t.check('B15: in Guided it names the current step\'s card', g.want === g.got && g.got !== '', JSON.stringify(g));
  t.check('B15: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

async function b16(browser) {
  const { ctx, p } = await open(browser);
  await p.evaluate(`(() => { openDayView('1'); try { hideAaToast(); } catch (e) {} })()`);
  await p.waitForTimeout(300);
  await p.evaluate(`(() => { const c = ${H.card(SQ)}; if (c.classList.contains('collapsed')) toggleExpand(c); c.id = 'sq'; })()`);
  await p.fill('#sq .ex-set-row[data-set-idx="0"] .ex-set-weight', '60');
  await p.click('#sq .ex-set-row[data-set-idx="0"] .ex-set-check');
  await p.waitForTimeout(300);
  t.check('B16: a set ticked with the clock off: the offer shows', /session clock isn't running/.test(await said(p)), await said(p));
  await p.click('.day-view-back');
  await p.waitForTimeout(300);
  t.check('B16: Back takes the box away', !(await said(p)), await said(p));
  // Offered for Day 1, then the athlete is on another screen: Start must do nothing even if it is reached.
  await p.evaluate(`(() => { localStorage.removeItem(ATHLETE_ID + '_clockasked_d1'); openDayView('1'); offerClock('1'); window.__run = _toastRun; closeDayView(); })()`);
  await p.waitForTimeout(200);
  const r = await p.evaluate(() => { window.__run && window.__run(); return { onb: !!document.querySelector('.readiness-sheet:not([hidden]), #readinessSheet:not([hidden])'), t: JSON.stringify(loadTimer('1')) }; });
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => { const t = loadTimer('1'); return { started: !!(t && (t.sessionStart || t.running)), dv: !document.getElementById('day-view').hidden }; });
  t.check('B16: a Start reached after leaving the day starts nothing and opens nothing', !after.started && !after.dv && !r.onb, JSON.stringify([r, after]));
  t.check('B16: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

async function b26(browser) {
  const { ctx, p } = await open(browser);
  await p.evaluate(() => { showTimer(150, 'Test rest'); });
  await p.waitForTimeout(200);
  await p.evaluate(() => addTimerSeconds(15));
  const plus = await p.evaluate(() => document.getElementById('timerDisplay').textContent);
  await p.evaluate(() => document.querySelector('.timer-controls .btn-reset').click());
  const reset = await p.evaluate(() => document.getElementById('timerDisplay').textContent);
  t.check('B26: +15s shows 2:45', plus === '2:45', plus);
  t.check('B26: Reset returns to the card\'s 2:30', reset === '2:30', reset);
  await p.evaluate(() => { addTimerSeconds(15); addTimerSeconds(15); document.querySelector('.timer-controls .btn-reset').click(); });
  t.check('B26: …after two +15s as well', await p.evaluate(() => document.getElementById('timerDisplay').textContent) === '2:30');
  t.check('B26: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  await b4(browser);
  await b15(browser);
  await b16(browser);
  await b26(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
