// An optional day (2026-11-18, stage109; SCHEMA.md → workouts.days[n], "optional": true): node scripts/headless/optional-day.js
//
// Amir wanted an easy zone 2 day an athlete may do or skip. It shows on Home labelled Optional, opens and logs like any day, and is
// never one of the week's plan days: the week count, Hold Serve's count, the suggested day, the week-done row and the This cycle
// card all read the plan days alone (planDayIds()), so a week with Days 1 and 2 done is done whether or not Day 3 was. Checked on a
// 3-day plan whose Day 3 is optional, against made-up history.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

function prog() {
  const P = H.fixture();
  const d3 = JSON.parse(JSON.stringify(P.workouts.days[1]));
  d3.id = 3; d3.title = 'Easy Zone 2'; d3.optional = true;
  P.workouts.days.push(d3);
  return P;
}

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog(), hist: [], stub: { library: H.library() } });
  // History in days relative to this cycle week's first day (weekWindow()), newest first, as HIST holds it; then Home's week is repainted.
  const at = cases => p.evaluate(cases => {
    const w = weekWindow(), d0 = new Date(w.from + 'T12:00:00');
    const on = n => { const d = new Date(d0); d.setDate(d.getDate() + n); return ymdLocal(d); };
    return cases.map(c => {
      HIST = c.h.map(([day, n]) => ({ date: on(n), day: String(day), entries: [] }));
      HOLD = { facts: [] };
      paintWeek();
      const el = document.getElementById('home-week-sum'), hs = holdState();
      return { sugg: suggestedDayId(), count: el ? (el.dataset.count || el.textContent) : null, all: el ? el.classList.contains('all') : null,
               doneOn: weekDoneOn(), hold: hs && { done: hs.done, total: hs.total }, cyc: (cycleProgress() || {}).planned };
    });
  }, cases);

  C.check('the plan days leave the optional day out', JSON.stringify(await p.evaluate(() => planDayIds())) === '["1","2"]', await p.evaluate(() => JSON.stringify(planDayIds())));

  const r = await at([
    { h: [] },                          // 0: nothing yet
    { h: [[2, 1], [1, 0]] },            // 1: Days 1 and 2, no Day 3
    { h: [[3, 1], [1, 0]] },            // 2: Day 1 and the optional Day 3
    { h: [[3, 2], [2, 1], [1, 0]] },    // 3: all three
    { h: [[2, -5], [1, -6]] },          // 4: last week Days 1 and 2: a new week starts at Day 1, never Day 3
  ]);
  C.check('nothing yet: Day 1 is Next up', r[0].sugg === '1', r[0].sugg);
  C.check('nothing yet: the count is of 2 plan days', /0 of 2/.test(r[0].count || ''), r[0].count);
  C.check('Days 1 and 2 done: the week is done without the optional day', r[1].all === true && /All 2/.test(r[1].count || ''), r[1].count);
  C.check('Days 1 and 2 done: nothing is suggested (the optional day is never Next up)', r[1].sugg === null, String(r[1].sugg));
  C.check('Days 1 and 2 done: the week-done row knows the day it was done', !!r[1].doneOn, String(r[1].doneOn));
  C.check('Days 1 and 2 done: Hold Serve counts 2 of 2', r[1].hold && r[1].hold.done === 2 && r[1].hold.total === 2, JSON.stringify(r[1].hold));
  C.check('Day 1 and the optional Day 3: 1 of 2, the optional day never stands in for Day 2', /1 of 2/.test(r[2].count || '') && r[2].all === false, r[2].count);
  C.check('Day 1 and the optional Day 3: Day 2 is Next up', r[2].sugg === '2', r[2].sugg);
  C.check('Day 1 and the optional Day 3: the week is not done', r[2].doneOn === null, String(r[2].doneOn));
  C.check('all three: still All 2 done, the optional one a bonus', r[3].all === true && /All 2/.test(r[3].count || ''), r[3].count);
  C.check('last week Days 1 and 2: Day 1 next, the rotation skips the optional day', r[4].sugg === '1', r[4].sugg);
  C.check('the This cycle card plans 2 sessions a week, not 3', r[0].cyc != null && r[0].cyc % 2 === 0 && r[0].cyc % 3 !== 0 || r[0].cyc === undefined, String(r[0].cyc));

  // Home names it, on its row
  const row = await p.evaluate(() => { HIST = []; paintWeek(); const el = document.querySelector('.dc-row[data-dl="3"]'); return el ? { txt: el.textContent, aria: el.getAttribute('aria-label'), cls: el.className } : null; });
  C.check('Home: the Day 3 row says Optional', !!row && /Optional ·/.test(row.txt), row && row.txt);
  C.check('Home: its label reads "optional" to a screen reader', !!row && /, optional/.test(row.aria), row && row.aria);
  C.check('Home: Days 1 and 2 do not say Optional', await p.evaluate(() => ['1', '2'].every(id => { const el = document.querySelector(`.dc-row[data-dl="${id}"], .dc-hero[data-dc="${id}"]`); return !el || !/Optional/.test(el.textContent); })));

  // It opens and logs like any day
  const view = await p.evaluate(() => {
    openDayView('3');
    const dv = document.getElementById('day-view') || document.body;
    return { head: (dv.querySelector('.day-ov-card .day-card-num') || {}).textContent || '', sets: dv.querySelectorAll('.ex-set-check').length };
  });
  C.check('the day view\'s cover says Day 3 · Optional', /Day 3 · Optional/.test(view.head), view.head);
  C.check('the day view has sets to log', view.sets > 0, String(view.sets));
  const after = await p.evaluate(() => {
    const id = '3';
    localStorage.setItem(ATHLETE_ID + '_completed_d' + id, stampCompleted());   // the finish stamp Done writes
    HIST = [];
    return { done: weekDoneDays().has(id), plan: planDayIds().filter(x => weekDoneDays().has(x)).length };
  });
  C.check('a finished optional session is a done day this week', after.done === true, JSON.stringify(after));
  C.check('and it counts toward no plan day', after.plan === 0, JSON.stringify(after));

  C.check('no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close();
  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
