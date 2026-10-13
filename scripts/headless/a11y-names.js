// Names a screen reader says well, and a target a thumb can hit (Line Call, 2026-10-13; Second Serve A1): node scripts/headless/a11y-names.js
//
// The session rating's keys were named only "7" and the rest screen's RPE keys only "7"; the tab bar did not say which tab is open;
// Guided's copy of the "tempo" link was 42 x 20 px (the card's own has a 44 px target, Guided's copy did not). Now: "Session rating 7
// of 10", "RPE 7", aria-current="page" on the open tab, and a 44 px target on Guided's tempo link.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
  const cur = await p.evaluate(() => [...document.querySelectorAll('#global-tabs .nav-item')].map(n => n.dataset.tab + ':' + (n.getAttribute('aria-current') || '-')).join(' '));
  C.check('Home is announced as the open tab', /home:page/.test(cur) && (cur.match(/:page/g) || []).length === 1, cur);
  await p.evaluate(() => goTo('plan'));
  const cur2 = await p.evaluate(() => [...document.querySelectorAll('#global-tabs .nav-item')].map(n => n.dataset.tab + ':' + (n.getAttribute('aria-current') || '-')).join(' '));
  C.check('after a tap on Progress, Progress is the open tab and only it', /plan:page/.test(cur2) && (cur2.match(/:page/g) || []).length === 1, cur2);
  await p.evaluate(() => { goTo('home'); openDayView('1'); });
  const rate = await p.evaluate(() => [...document.querySelectorAll('#confirm-1 .complete-rpe-btn')].map(b => b.getAttribute('aria-label')));
  C.check('the session rating keys are named "Session rating N of 10"', rate.length === 10 && rate[6] === 'Session rating 7 of 10', JSON.stringify(rate.slice(5, 8)));
  // the rest screen's RPE keys, through Guided
  await p.evaluate(() => { openStepMode('1'); const i = STEP.seq.findIndex(x => x.name === 'Barbell Back Squat' && x.setI === 0); STEP.pos = i; renderStep(); });
  await p.waitForTimeout(300);
  const tempo = await p.evaluate(() => {
    const b = document.querySelector('#step-scroll .step-ex-nums .nl-help');
    if (!b) return null;
    const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top - 10;   // 10 px above the link's box
    const hit = document.elementFromPoint(x, y);
    return { w: Math.round(r.width), h: Math.round(r.height), above: !!hit && (hit === b || b.contains(hit)) };
  });
  C.check('Guided\'s tempo link: a tap 10 px above its box still hits it (a 44 px target)', !!tempo && tempo.above, JSON.stringify(tempo));
  await p.click('#step-footer .step-primary-btn'); await p.waitForTimeout(500);
  const rest = await p.evaluate(() => [...document.querySelectorAll('#timerLog .tl-rpe-btn')].map(b => b.getAttribute('aria-label')));
  C.check('the rest screen\'s RPE keys are named "RPE N"', rest.length === 5 && rest[1] === 'RPE 7', JSON.stringify(rest));
  C.check('no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close(); await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
