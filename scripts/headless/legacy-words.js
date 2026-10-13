// Old-card words that read like code (Line Call, 2026-10-13; Second Serve W2): node scripts/headless/legacy-words.js
//
// The green pill is set in capitals, so an old card's "3s eccentric" read "3S ECCENTRIC" (about 100 live cards) and "30s on / 30s off"
// "30S ON / 30S OFF". A pill holding a duration (a digit followed by s or m) is now in its own case (.nocaps); every other pill keeps
// the capitals. The guide's tempo line covers both shapes: "3-1-1 or 3-1-1-0: down, pause, up, and sometimes a pause at the top".
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

function prog() {
  const P = H.fixture();
  const ex = P.workouts.days[0].blocks[1].exercises;
  ex.push({ name: 'Eccentric Push-Up', type: 'standard', chips: [{ label: '3 Sets' }, { label: '×6 Reps' }, { label: '3s eccentric', style: 'dark' }] });
  ex.push({ name: 'Bike Intervals', type: 'standard', chips: [{ label: '6 Rounds' }, { label: '30s on / 30s off', style: 'dark' }] });
  return P;
}

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog(), stub: { library: H.library() } });
  await p.evaluate(() => openDayView('1')); await p.waitForTimeout(300);
  const pills = await p.evaluate(() => [...document.querySelectorAll('#day1 .ex-summary-pill.modifier')].map(b => ({ t: b.textContent, shown: b.innerText, tt: getComputedStyle(b).textTransform, nocaps: b.classList.contains('nocaps') })));
  const ecc = pills.find(x => x.t === '3s eccentric'), bike = pills.find(x => /30s on/.test(x.t)), intent = pills.find(x => x.t === 'max intent');
  C.check('"3s eccentric" reads in its own case, not "3S ECCENTRIC"', !!ecc && ecc.nocaps && ecc.tt === 'none' && ecc.shown === '3s eccentric', JSON.stringify(ecc));
  C.check('"30s on / 30s off" reads in its own case', !!bike && bike.nocaps && bike.tt === 'none', JSON.stringify(bike));
  C.check('a pill with no duration ("max intent") keeps its capitals', !!intent && !intent.nocaps && intent.tt === 'uppercase', JSON.stringify(intent));
  const g = await p.evaluate(() => (APP_GUIDE.find(c => c.key === 'rpe') || {}).body || '');
  C.check('the guide explains tempo for both shapes', /written as 3 or 4 numbers like <strong>3-1-1<\/strong> or <strong>3-1-1-0<\/strong>: down, pause, up, and sometimes a pause at the top\./.test(g), g.slice(0, 200));
  C.check('no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close(); await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
