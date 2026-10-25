// The demo shows the coaching (Line Call, 2026-10-13; Amir: "yes to all recommended", decision 7): node scripts/headless/demo-coaching.js
//
// The live demo's cycles carry no dates, so a stranger from Instagram never saw the This cycle card on Progress (nor a week note on
// Home), the account sheet said "nothing is saved" though taps are kept, and the site's Sessions and Playbook doors opened the
// demo's Home. Now the demo's current cycle is dated to week 2 when it opens (dateDemoCycles(), in memory only), ?pane=sessions and
// ?pane=playbook open that Library pane, and the account line says "The demo keeps your taps on this phone only. Nothing reaches me."
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

function undated() { const P = H.fixture({ dated: false }); P.cycles.forEach(c => { delete c.startDate; delete c.endDate; }); return P; }

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  {
    const P = undated();
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: P, query: '?client=demo', stub: { demo: P, library: H.library() } });
    const wk = await p.evaluate(() => { const w = cycleWeekInfo(currentCycleData()); return w ? { wk: w.wk, total: w.total, after: !!w.after } : null; });
    C.check('the demo opens in week 2 of its current cycle', !!wk && wk.wk === 2 && !wk.after, JSON.stringify(wk));
    await p.evaluate(() => goTo('plan')); await p.waitForTimeout(400);
    const card = await p.evaluate(() => { const c = document.querySelector('#cycle-card-wrap .cyc-card'); return c ? c.innerText.replace(/\s+/g, ' ').trim().slice(0, 90) : null; });
    C.check('Progress shows the cycle card (Cycle 2 of 3), week 2', !!card && /Cycle 2 of 3/i.test(card) && /Week 2/i.test(card), String(card));
    const saved = await p.evaluate(() => localStorage.getItem('plancache'));
    C.check('the dates live in memory only: no plan saved on the phone', saved === null, String(saved).slice(0, 40));
    await p.evaluate(() => { goTo('home'); openAccount(); }); await p.waitForTimeout(300);
    const line = await p.evaluate(() => document.getElementById('hist-overlay').innerText);
    C.check('the account sheet says the demo keeps taps on this phone only', /The demo keeps your taps on this phone only\. Nothing reaches me\./i.test(line) && !/nothing is saved/i.test(line), line.slice(0, 160));
    C.check('no page errors (the demo)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  for (const pane of ['sessions', 'playbook']) {
    const P = undated();
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: P, query: '?client=demo&pane=' + pane, stub: { demo: P, library: H.library() } });
    await p.waitForTimeout(600);
    const on = await p.evaluate(() => { const t = document.querySelector('.lib-tab[aria-selected="true"]'); const scr = document.querySelector('.screen.active'); return { tab: t ? t.dataset.pane : null, screen: scr ? scr.id : null }; });
    C.check(`?pane=${pane} opens the Library on ${pane}`, on.tab === pane && on.screen === 'screen-workouts', JSON.stringify(on));
    await ctx.close();
  }
  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
