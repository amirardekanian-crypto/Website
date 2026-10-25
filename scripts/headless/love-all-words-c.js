// Plain Words, Group C (Amir, 2026-10-25: "Go with your picks"): the words of Progress, the records page, the unit menu, Career and Crew.
//   counts     the cover says "Cycle 2 of 3", under it "Week 2 of 5", the road says "5 weeks": one count per number.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-words-c.js
'use strict';
const H = require('./lib');
const C = require('./career');

const ID = H.ID;
const t = H.checker();
const txt = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
const overflow = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.scrollWidth - e.clientWidth : -1; }, sel);

// ═════════ counts ═════════
async function counts(browser) {
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { ctx, p } = await H.openProgram(browser, { w, h, tz: 'UTC', prog: H.fixture(), hist: [] });
    await p.evaluate("goTo('plan')");
    await p.waitForTimeout(800);
    const top = await txt(p, '#cycle-card-wrap .cyc-top');
    const wk = await txt(p, '#cycle-card-wrap .cyc-k');
    const rows = await p.evaluate(() => [...document.querySelectorAll('#road-wrap .road-row .road-ln')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    t.check(`counts ${w}px: the cover says "Cycle 2 of 3"`, /^cycle 2 of 3$/i.test(top || ''), top);
    t.check(`counts ${w}px: under it "Week 2 of 5"`, /^Week 2\s*of 5$/.test(wk || ''), wk);
    t.check(`counts ${w}px: the road says "5 weeks" for every cycle (the done one first, the pill after)`, rows.length === 3 && /^5 weeks · done$/i.test(rows[0]) && /^5 weeks$/i.test(rows[1]) && /^5 weeks · up next$/i.test(rows[2]), JSON.stringify(rows));
    t.check(`counts ${w}px: no "This cycle" eyebrow and no "WEEKS 6–10" range left on the road`, !/this cycle/i.test(top || '') && rows.every(r => !/\d\s*[–-]\s*\d/.test(r)), JSON.stringify([top, rows]));
    t.check(`counts ${w}px: the cover does not overflow`, (await overflow(p, '#cycle-card-wrap .cyc-body')) <= 0, String(await overflow(p, '#cycle-card-wrap .cyc-body')));
    t.check(`counts ${w}px: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  // Past its end the cover says Finished once, and the weeks are on the Week row (not "5 of 5 weeks" again).
  const prog = H.fixture();
  const cur = prog.cycles[prog.currentCycleIndex];
  cur.startDate = H.past(40); cur.endDate = H.past(5);
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', prog, hist: [] });
  await p.evaluate("goTo('plan')");
  await p.waitForTimeout(800);
  const fin = await txt(p, '#cycle-card-wrap .cyc-fin-s');
  t.check('counts: a finished cycle says "Finished 2 Nov" and does not count its weeks a second time', /^Finished [0-9A-Za-z ]+$/i.test(fin || '') && !/week/i.test(fin || ''), fin);
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  await counts(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
