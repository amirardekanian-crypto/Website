// A cycle's dates are CALENDAR days (pile C, 2026-10-11): in every time zone the cycle is still running on its end date and complete the day after,
// the week window starts on the day the start date names, and the retest window opens on the same day for everyone.
// The bug: cycleWeekInfo() read '2026-10-06' as a UTC midnight, which is the evening of the 5th west of Greenwich, so an athlete in the Americas was told
// "Cycle complete" a day early. Tehran, London and Madrid were right, which is how it hid.
// The browser gets each time zone (Playwright's timezoneId); the dates are made from the zone's own calendar today, never from the machine's.
// Serve the repo first (python3 -m http.server 8765 --bind 127.0.0.1, see lib.js), then: node scripts/headless/cycle-tz.js [--out <dir>]
'use strict';
const H = require('./lib');

const ZONES = ['America/Los_Angeles', 'America/New_York', 'America/Sao_Paulo', 'Europe/London', 'Europe/Madrid', 'Asia/Tehran', 'Australia/Sydney', 'Pacific/Auckland', 'Pacific/Kiritimati'];
// the calendar day it is in `zone` right now, plus n days (a YYYY-MM-DD string)
function dayIn(zone, n) {
  const now = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());   // e.g. 2026-10-11
  const [y, m, d] = now.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
// The fixture with its current cycle (index 1) starting `startIn` days from the zone's today and lasting five weeks (34 days from start to end).
function prog(zone, startIn) {
  const P = H.fixture();
  P.currentCycleIndex = 1;
  P.cycles[1].startDate = dayIn(zone, startIn);
  P.cycles[1].endDate = dayIn(zone, startIn + 34);
  return P;
}
const read = p => p.evaluate(() => ({
  fin: (document.querySelector('.cyc-fin-h') || {}).textContent || null,
  info: cycleWeekInfo(DATA.cycles[DATA.currentCycleIndex]),
  win: weekWindow(),
  today: ymdLocal(new Date()),
}));

(async () => {
  const t = H.checker();
  const browser = await H.launch();
  for (const zone of ZONES) {
    const open = async (startIn) => H.openProgram(browser, { prog: prog(zone, startIn), tz: zone });
    // the end date itself: week 5, not complete
    let { ctx, p } = await open(-34);
    let s = await read(p);
    t.check(`${zone}: on the end date the cycle is still running (week 5 of 5), not complete`, !s.fin && s.info && s.info.wk === 5 && !s.info.after, JSON.stringify(s.info) + ' ' + s.fin);
    await ctx.close();
    // the day after: complete
    ({ ctx, p } = await open(-35));
    s = await read(p);
    t.check(`${zone}: the day after the end date it says Cycle complete`, /Cycle complete|Roadmap complete/.test(s.fin || '') && s.info.after, JSON.stringify(s.info) + ' ' + s.fin);
    await ctx.close();
    // the first day: week 1, and the week window starts today (not the day before)
    ({ ctx, p } = await open(0));
    s = await read(p);
    t.check(`${zone}: on the first day it is week 1 and the week window starts that day, not the day before`, s.info && s.info.wk === 1 && !s.info.before && s.win.from === s.today, JSON.stringify(s.win) + ' today ' + s.today);
    await ctx.close();
    // the day before the first: not started, and the window is the cycle's first week, from the start date
    ({ ctx, p } = await open(1));
    s = await read(p);
    t.check(`${zone}: the day before the first day it has not started, and the window opens on the start date`, s.info && s.info.before && s.win.from === dayIn(zone, 1), JSON.stringify(s.win) + ' want from ' + dayIn(zone, 1));
    await ctx.close();
  }
  await browser.close();
  const failed = t.report();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
