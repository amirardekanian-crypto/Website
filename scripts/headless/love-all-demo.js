// Love All round 2 (2026-10-24), the demo: a first visit to the public demo offers Day 1 as Next up.
//   Before: the invented history had Day 1 trained 2 days ago and Day 3 four days ago, so Next up said Day 2 and Day 1 was never offered.
//   Now the last day is the newest, Day 1 the oldest, and the rotation (suggestedDayId()) lands on Day 1. A real athlete is untouched.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-demo.js
'use strict';
const H = require('./lib');
const t = H.checker();

function undated() { const P = H.fixture({ dated: false }); P.cycles.forEach(c => { delete c.startDate; delete c.endDate; }); return P; }
function three() {
  const P = undated();
  const d3 = JSON.parse(JSON.stringify(P.workouts.days[1]));
  d3.id = 3; d3.title = 'Third Day';
  P.workouts.days.push(d3);
  return P;
}

(async () => {
  const browser = await H.launch();
  {
    const P = three();
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: P, query: '?client=demo', stub: { demo: P, library: H.library() } });
    await p.waitForTimeout(800);
    const card = await p.evaluate(() => { const c = document.querySelector('[data-dc]'); return c ? c.innerText.replace(/\s+/g, ' ').trim().slice(0, 80) : null; });
    t.check('the demo, first visit: Next up is Day 1', !!card && /Next up\s*·\s*Day 1\b/i.test(card), String(card));
    const id = await p.evaluate(() => suggestedDayId());
    t.check('suggestedDayId() is "1"', id === '1', String(id));
    const h = await p.evaluate(() => {
      const rows = demoHistory(), last = {};
      rows.forEach(r => { if (!last[r.day] || r.completed_on > last[r.day]) last[r.day] = r.completed_on; });
      return { n: rows.length, days: Object.keys(last).sort().map(d => [d, last[d]]), futures: rows.filter(r => r.completed_on > ymdLocal(new Date())).length };
    });
    t.check('the demo history still has 4 sessions of each of the 3 days', h.n === 12, JSON.stringify(h));
    t.check('Day 3 is the newest, Day 1 the oldest', h.days.length === 3 && h.days[0][1] < h.days[1][1] && h.days[1][1] < h.days[2][1], JSON.stringify(h.days));
    t.check('nothing in the demo history is dated in the future', h.futures === 0, JSON.stringify(h));
    const rec = await p.evaluate(() => (typeof HIST !== 'undefined' ? HIST.length : -1));
    t.check('the demo history is loaded into HIST (Progress and Records read it)', rec === 12, String(rec));
    t.check('no page errors (the demo)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  {
    const P = three();
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: P, hist: [], stub: { library: H.library() } });
    const id = await p.evaluate(() => { HIST = [{ date: ymdLocal(new Date(Date.now() - 2 * 86400000)), day: '1', entries: [] }]; return suggestedDayId(); });
    t.check('a real athlete who trained Day 1 is still offered Day 2', id === '2' || id === null, String(id));
    await ctx.close();
  }
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
