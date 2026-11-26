// The spare on Home (stage106; the Home half, 2026-11-26): node scripts/headless/spare-home.js
//
// A plan day finished twice in a training week covers the same plan day in the next week of the same cycle (career_derive();
// careerWeekOf() is the phone's copy, and the finish card has read it since 2026-11-03). Home did not: it said "1 of 2" for a
// held week and asked for the covered day. Checked on made-up history against the fixture's dated cycles (week 2 of 5): the
// week's count, Next up, the day rows, Hold Serve's count and the week-done extra, with and without a spare, from the phone's
// saved history alone, in the first week of a cycle, and an optional day.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);   // every page here runs in UTC
function prog({ start = -10, optional = false } = {}) {
  const P = H.fixture({ dated: false });
  P.cycles.forEach((c, i) => { const s = start + (i - P.currentCycleIndex) * 35; c.startDate = at(s); c.endDate = at(s + 34); });
  if (optional) {
    const d3 = JSON.parse(JSON.stringify(P.workouts.days[1]));
    d3.id = 3; d3.title = 'Easy Zone 2'; d3.optional = true;
    P.workouts.days.push(d3);
  }
  return P;
}
const S = (n, day) => ({ completed_on: at(n), day, readiness: 4, log: [] });
// start -10: week 2 began 3 days ago, week 1 ran from -10 to -4.
const LAST = [S(-5, '2'), S(-7, '1'), S(-9, '1')];                           // Day 1 twice, Day 2 once, Day 2 the last
const read = p => p.evaluate(() => {
  const t = el => el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  const sum = document.getElementById('home-week-sum'), hs = holdState();
  return {
    count: sum ? (sum.dataset.count || t(sum)) : '',
    next: suggestedDayId(),
    hero: [...document.querySelectorAll('#home-overview [data-dc]')].map(e => e.getAttribute('data-dc')).join(','),
    rows: [...document.querySelectorAll('#home-overview .dc-row')].map(e => ({ id: e.getAttribute('data-dl'),
      done: e.classList.contains('is-done'), sub: t(e.querySelector('small')), aria: e.getAttribute('aria-label') })),
    doneOn: weekDoneOn(), from: weekWindow().from,
    hold: hs && { done: hs.done, total: hs.total },
  };
});
const row = (r, id) => r.rows.find(x => x.id === id) || {};

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const run = async (name, hist, check, o = {}) => {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, tz: 'UTC', prog: o.prog || prog(), hist, stub: o.stub || {} });
    await p.waitForTimeout(600);
    check(await read(p));
    C.check(`${name}: no page errors`, !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  };

  await run('a spare, nothing done yet', LAST, r => {
    C.check('a spare, nothing done yet: it is in the count', /^1 of 2 sessions done this week/.test(r.count), r.count);
    C.check('…the day still needed is Next up, not the covered one', r.next === '2' && r.hero === '2', JSON.stringify([r.next, r.hero]));
    const d1 = row(r, '1');
    C.check('…the covered day is a done row that says why', d1.done && d1.sub === 'Counts from last week' && /, counts from last week$/.test(d1.aria || ''), JSON.stringify(d1));
    C.check('…Hold Serve counts it, and the week is not done yet', r.hold && r.hold.done === 1 && r.doneOn === null, JSON.stringify([r.hold, r.doneOn]));
  }, { stub: { tables: { career_rules: [{ version: 1 }], career_facts: [] } } });

  await run('a spare completes the week', [S(-1, '2')].concat(LAST), r => {
    C.check('a spare completes the week: the count says all done', /^All 2 sessions done this week/.test(r.count), r.count);
    C.check('…nothing is Next up', r.next === null && r.hero === '', JSON.stringify([r.next, r.hero]));
    C.check('…one row done this week, one from last week', row(r, '2').sub === 'Done this week' && row(r, '1').sub === 'Counts from last week', JSON.stringify(r.rows));
    C.check('…the week-done extra has its date: the day the last plan day was done', r.doneOn === at(-1), r.doneOn);
  });

  await run('the covered day trained again', [S(-1, '1')].concat(LAST), r => {
    C.check('the covered day trained again: it reads Done this week and counts once', row(r, '1').sub === 'Done this week' && /^1 of 2 /.test(r.count) && r.next === '2', JSON.stringify(r));
  });

  await run('no spare', [S(-1, '2'), S(-5, '2'), S(-9, '1')], r => {
    C.check('each day once last week: nothing is covered', /^1 of 2 /.test(r.count) && r.next === '1' && r.doneOn === null && !r.rows.some(x => /last week/.test(x.sub)), JSON.stringify(r));
  });

  await run('a spare two weeks old', [S(-12, '1'), S(-13, '1')], r => {
    C.check('a spare helps one week only', /^0 of 2 /.test(r.count) && !r.rows.some(x => /last week/.test(x.sub)), JSON.stringify(r));
  }, { prog: prog({ start: -17 }) });

  await run('the first week of a cycle', LAST, r => {
    C.check('week 1 of a cycle: the week before it belongs to no spare', /^0 of 2 /.test(r.count) && !r.rows.some(x => /last week/.test(x.sub)), JSON.stringify(r));
  }, { prog: prog({ start: -3 }) });

  await run('the history unreadable', LAST, r => {
    C.check('with the history read failing, the phone\'s saved copy still counts the spare', /^1 of 2 /.test(r.count) && r.next === '2', JSON.stringify(r));
  }, { stub: { tableErr: { session_history: { message: 'offline' } } } });

  await run('an optional day done twice', [S(-5, '3'), S(-7, '3')], r => {
    C.check('an optional day is never covered', /^0 of 2 /.test(r.count) && row(r, '3').sub !== 'Counts from last week' && !row(r, '3').done, JSON.stringify(r));
  }, { prog: prog({ optional: true }) });

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
