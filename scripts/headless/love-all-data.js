// Love All round 2 (2026-10-24), the data fixes of the 2026-10-20 audit, checked the way the athlete meets them.
//   B10  Progress's Body weight row and the Body Weight screen say the SAME change, average to average, with no single date in it.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-data.js
'use strict';
const H = require('./lib');

const DAY = 86400000;
const day = n => H.past(n);
const t = H.checker();

const WT = { [day(33)]: { kg: 81.4, t: 1 }, [day(18)]: { kg: 80.6, t: 2 }, [day(7)]: { kg: 80.1, t: 3 }, [day(1)]: { kg: 79.8, t: 4 } };

// ═════════ B10: one change, on the row and on the page ═════════
async function b10(browser) {
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, tz: 'UTC', prog: H.fixture(), seed: { _hab_wt: WT } });
  await p.evaluate(() => goTo('plan'));
  await p.waitForTimeout(600);
  const row = await p.evaluate(() => (document.querySelector('#weight-row-wrap .hrow') || {}).innerText || '');
  await p.evaluate(() => goWeight());
  await p.waitForTimeout(600);
  const page = await p.evaluate(() => (document.querySelector('#wt-board') || {}).innerText || '');
  const num = s => { const m = s.match(/[0-9]+\.[0-9]/g) || []; return m; };
  const rowDelta = (row.match(/[▲▼]\s*([0-9.]+) kg/) || [])[1];
  const pageDelta = (page.match(/[+−]\s*([0-9.]+)/) || [])[1];
  t.check('B10: the row shows a change in kg', !!rowDelta, row);
  t.check('B10: the row and the Body Weight screen show the same change', !!rowDelta && rowDelta === pageDelta, JSON.stringify([rowDelta, pageDelta, page]));
  t.check('B10: the row names no single date ("since 17 Sep")', !/since/i.test(row) && !/\b\d{1,2}\s+[A-Z][a-z]{2}\b/.test(row.split('\n').slice(1).join(' ')), row);
  t.check('B10: the row says it is the average', /average/i.test(row), row);
  t.check('B10: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  await b10(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
