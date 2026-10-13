// The guide promises only what the athlete's plan has (Line Call, 2026-10-13; Second Serve W1; Amir: "yes to all recommended"):
// node scripts/headless/guide-truth.js
//
// The guide promised a week note in every first and last week (6 of 37 cycles had one) and sent athletes to "Why your plan looks
// like this" on Progress, a door that needed three Becauses (0 on 643 old cards). Now: "When a week works differently … my note
// for that week opens This Week", "When your plan has reasons like that, they're on one page too", the days are "Day 1, Day 2…",
// and the Why door shows from one Because.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
  const g = await p.evaluate(() => APP_GUIDE.map(c => c.body).join(' '));
  C.check('the guide no longer promises a note in every first and last week', !/The first week is for finding your weights and the last week is a lighter back-off week/.test(g));
  C.check('…it says "When a week works differently … my note for that week opens This Week"', /When a week works differently[^.]*my note for that week opens <strong>This Week<\/strong>/.test(g));
  C.check('the Why page is promised only when the plan has reasons', /When your plan has reasons like that, they're on one page too/.test(g));
  C.check('the days are "Day 1, Day 2, Day 3…", as the app says them', /\(Day 1, Day 2, Day 3…\)/.test(g) && !/D1, D2, D3/.test(g));
  // The fixture's current cycle has ONE Because (the squat): the door shows on Progress
  await p.evaluate(() => goTo('plan')); await p.waitForTimeout(500);
  const door = await p.evaluate(() => { const b = [...document.querySelectorAll('#screen-plan button, #screen-plan .hrow')].find(x => /Why your plan looks like this/.test(x.textContent)); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });
  C.check('one Because is enough for "Why your plan looks like this" on Progress', !!door, String(door));
  C.check('no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close(); await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
