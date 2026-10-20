// Between cycles (Line Call, 2026-10-13; Amir: "yes to all recommended"): node scripts/headless/between-cycles.js
//
// A third of active athletes sit between cycles. Their Home kept one ask (Ready for Cycle N? Message Amir), and the WhatsApp
// greeting said "week 5" of a cycle that had ended days before. Now the greeting says "(finished <cycle> on <date>)" once the cycle
// is over, and Home offers one session to do until the next starts: the day trained least this cycle (leastTrainedDay()), which
// opens that day. Every day trained as often: no such row. Mid-cycle the greeting still says the week.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');
const DAY = 86400000;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

function overProg() {
  const P = H.fixture();
  const i = P.currentCycleIndex;
  P.cycles.forEach((c, j) => { const s = Date.now() - 44 * DAY + (j - i) * 35 * DAY; c.startDate = ymd(new Date(s)); c.endDate = ymd(new Date(s + 34 * DAY)); });
  return P;
}
// This suite is about Home between cycles, so the athlete has already seen the cycle's one-time Cycle complete moment (Highlight Reel,
// 2026-10-17: it opens full screen at the first open after the end date and waits for them with no window since 2026-10-20, and it
// would cover Home). <id>_hl_seen marks it.
const seen = P => ({ _hl_seen: { ['cycle' + (P.currentCycleIndex + 1) + '|' + P.cycles[P.currentCycleIndex].endDate]: 1 } });

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  {
    const P = overProg(), cur = P.cycles[P.currentCycleIndex];
    const at = n => ymd(new Date(new Date(cur.startDate + 'T12:00:00').getTime() + n * DAY));
    // Day 1 four times, Day 2 once, inside the cycle; one Day 2 from before it (does not count)
    const hist = [[1, 30], [2, 22], [1, 15], [1, 8], [1, 1], [2, -3]].map(([d, n]) => ({ completed_on: at(n), day: String(d), readiness: 4, log: [] }));
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: P, hist, seed: seen(P), stub: { library: H.library() } });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => {
      const pick = document.querySelector('#screen-home .bt-pick');
      const ask = document.querySelector('#screen-home .bt-wa a');
      return { pick: pick ? pick.innerText.replace(/\s+/g, ' ').trim() : null, href: ask ? decodeURIComponent(ask.href) : '', h: pick ? Math.round(pick.getBoundingClientRect().height) : 0 };
    });
    C.check('between cycles: one row offers the day trained least (Day 2), in words a stranger reads', !!r.pick && /^Day 2 · Upper Body/i.test(r.pick) && /The one you did least this cycle\. A good one to repeat\./.test(r.pick) && r.h >= 44, JSON.stringify(r));
    C.check('the WhatsApp ask says the cycle is finished, with its date, not "week 5"', /\(finished [^)]+ on [A-Z][a-z]{2} \d{1,2}\)\. About Cycle \d+:/.test(r.href) && !/week \d/.test(r.href), r.href.slice(0, 140));
    await p.click('#screen-home .bt-pick'); await p.waitForTimeout(500);
    C.check('the row opens that day', await p.evaluate(() => { const v = document.getElementById('day-view'); return !!v && !v.hidden && !!document.querySelector('#day2.active, #day2.day-content.active'); }));
    C.check('no page errors (between cycles)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  {
    // every day trained as often: no row
    const P = overProg(), cur = P.cycles[P.currentCycleIndex];
    const at = n => ymd(new Date(new Date(cur.startDate + 'T12:00:00').getTime() + n * DAY));
    const hist = [[1, 10], [2, 11]].map(([d, n]) => ({ completed_on: at(n), day: String(d), readiness: 4, log: [] }));
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: P, hist, seed: seen(P), stub: { library: H.library() } });
    await p.waitForTimeout(600);
    C.check('every day trained as often: no "did least" row', await p.evaluate(() => !document.querySelector('#screen-home .bt-pick')));
    await ctx.close();
  }
  {
    // mid-cycle: the greeting still says the week
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
    const href = await p.evaluate(() => decodeURIComponent(coachWhatsAppUrl('x')));
    C.check('mid-cycle the greeting still says the week', /, week \d+\)\. x$/.test(href), href.slice(0, 120));
    await ctx.close();
  }
  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
