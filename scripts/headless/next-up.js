// Next up rotates (Line Call, 2026-10-13; Amir: "yes to all recommended", decision 3, "rotate"): node scripts/headless/next-up.js
//
// suggestedDayId() used to give the first day not done this week, so an athlete who trains twice a week did Days 1 and 2 for
// ever and the last day never came. Now it is the day AFTER the last one trained in this cycle, the first from there not done
// this week; a session under way still comes first, nothing is suggested between cycles, a week with every day done still
// suggests nothing, and a cycle with nothing trained yet starts at Day 1. Checked on a 3-day plan against made-up history.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

function prog() {
  const P = H.fixture();
  const d2 = JSON.parse(JSON.stringify(P.workouts.days[1]));
  d2.id = 3; d2.title = 'Third Day';
  P.workouts.days.push(d2);
  return P;
}

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog(), hist: [], stub: { library: H.library() } });
  // History in days relative to this cycle week's first day (weekWindow()), newest first, as HIST holds it.
  const next = cases => p.evaluate(cases => {
    const w = weekWindow(), d0 = new Date(w.from + 'T12:00:00');
    const at = n => { const d = new Date(d0); d.setDate(d.getDate() + n); return ymdLocal(d); };
    return cases.map(c => { HIST = c.h.map(([day, n]) => ({ date: at(n), day: String(day), entries: [] })); return suggestedDayId(); });
  }, cases);
  const r = await next([
    { h: [] },                              // nothing yet this cycle
    { h: [[2, -5], [1, -6]] },              // last week: Days 1 and 2
    { h: [[3, -4], [2, -5], [1, -6]] },     // last week: all three
    { h: [[1, 0]] },                        // this week: Day 1
    { h: [[3, 0], [1, -6]] },               // this week: Day 3 (after last week's Day 1)
    { h: [[3, 1], [1, 0]] },                // this week: Day 1 then Day 3
    { h: [[2, 1], [1, 0], [3, -3]] },       // this week: Days 1 and 2
    { h: [[3, 2], [2, 1], [1, 0]] },        // this week: all three
  ]);
  C.check('nothing trained yet: Day 1', r[0] === '1', r[0]);
  C.check('last week Days 1 and 2, a new week: Day 3, not Day 1 again', r[1] === '3', r[1]);
  C.check('last week all three: Day 1', r[2] === '1', r[2]);
  C.check('this week Day 1: Day 2', r[3] === '2', r[3]);
  C.check('this week Day 3 after last week\'s Day 1: Day 1 (the week has not had it)', r[4] === '1', r[4]);
  C.check('this week Day 1 then Day 3: Day 2 (the one the week is missing)', r[5] === '2', r[5]);
  C.check('this week Days 1 and 2: Day 3', r[6] === '3', r[6]);
  C.check('this week all three: nothing suggested (the week is done)', r[7] === null, String(r[7]));
  // a session under way comes first
  const uw = await p.evaluate(() => { HIST = []; startTimerNow('2'); return suggestedDayId(); });
  C.check('a session under way (Day 2 started) comes first', uw === '2', uw);
  // sessions before this cycle's start do not count
  const before = await p.evaluate(() => {
    const cur = currentCycleData(), s = new Date(String(cur.startDate).slice(0, 10) + 'T12:00:00'); s.setDate(s.getDate() - 2);
    localStorage.removeItem(timerKey('2')); HIST = [{ date: ymdLocal(s), day: '1', entries: [] }];
    return suggestedDayId();
  });
  C.check('the last session was in the cycle before: this cycle starts at Day 1', before === '1', before);
  C.check('no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close();
  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
