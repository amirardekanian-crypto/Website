// A rough day keeps a real lift (Line Call, 2026-10-13; Second Serve J-14): node scripts/headless/rough-day.js
//
// On a red check-in the session is the warm-up, the first power move and the first lift of the Primary/Strength block
// (redDayCore()). With a contrast jump put first in the Strength block (common practice), that "first lift" was the jump, which the
// sore rule then removed: the day shrank to the warm-up. The first lift that is not a jump or a landing (isImpactWork()) is kept now.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });   // its Strength block opens with Box Jump
  const r = await p.evaluate(() => { const d = DATA.workouts.days[0]; const c = redDayCore(d); return { first: d.blocks[1].exercises[0].name, primary: c.primary }; });
  C.check('a Strength block that opens with a jump: the rough day keeps the squat, not the jump', r.first === 'Box Jump' && r.primary === 'Barbell Back Squat', JSON.stringify(r));
  const plain = await p.evaluate(() => { const d = JSON.parse(JSON.stringify(DATA.workouts.days[0])); d.blocks[1].exercises.shift(); return redDayCore(d).primary; });
  C.check('a Strength block that opens with a lift: that lift, as before', plain === 'Barbell Back Squat', plain);
  C.check('no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close(); await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
