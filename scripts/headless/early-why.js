// Finishing early asks why (Line Call, 2026-10-13; Amir: "yes to all recommended", decision 4): node scripts/headless/early-why.js
//
// 16% of sessions end early and nothing said why. The early finish card now asks once, optional, one tap: Out of time · Pain ·
// Too tired · No kit (EARLY_WHY, <id>_whyearly_d<N>). The answer goes into the report's status line ("Partial (… done) · Pain"),
// Pain brings a WhatsApp row up under the question (the one at the foot goes) whose message says it, a second tap clears it,
// and a reset forgets it. Every chip is 44 px to hit and the row wraps without sideways scroll at 320 px.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

async function earlyCard(p) {
  await p.evaluate(() => {
    openDayView('1');
    const items = [...document.querySelectorAll('#day1 .checklist-item')].slice(0, 3);
    items.forEach(c => { if (!c.classList.contains('checked')) toggleCheckOnly(c, '1'); });
    try { hideAaToast(); } catch (e) {}
    finishEarlyStep('1');
  });
  await p.waitForTimeout(300);
}
const read = p => p.evaluate(() => {
  const c = document.getElementById('confirm-1'), chips = [...c.querySelectorAll('.ew-chip')];
  const foot = c.querySelector('.finish-wa'), up = c.querySelector('.ew-wa');
  return { q: (c.querySelector('.ew-q') || {}).textContent || '', chips: chips.map(b => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')),
    h: chips.map(b => Math.round(b.getBoundingClientRect().height)), up: !!up, footShown: !!foot && getComputedStyle(foot).display !== 'none',
    sideways: document.documentElement.scrollWidth - innerWidth };
});

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  for (const w of [320, 390]) {
    const { ctx, p } = await H.openProgram(browser, { w, h: 800, prog: H.fixture(), stub: { library: H.library() } });
    await earlyCard(p);
    const a = await read(p);
    C.check(`${w}: the early card asks "What stopped you? Optional" with four chips, none chosen, each 44 px, no sideways scroll`,
      /What stopped you\?\s*Optional/.test(a.q) && a.chips.join('|') === 'Out of time|Pain|Too tired|No kit' && a.h.every(h => h >= 44) && a.sideways <= 0, JSON.stringify(a));
    await p.click('#confirm-1 .ew-chip:nth-child(2)'); await p.waitForTimeout(200);
    const b = await read(p);
    C.check(`${w}: Pain is chosen, the WhatsApp row comes up under the question and the one at the foot goes`, b.chips[1] === 'Pain*' && b.up && !b.footShown, JSON.stringify(b));
    const href = await p.evaluate(() => { const a = document.querySelector('#confirm-1 .ew-wa a'); a.click(); return decodeURIComponent(a.href); });
    C.check(`${w}: its message says the session stopped early for pain`, /About Day 1[^:]*: I stopped early \(pain\)\./.test(href), href.slice(0, 160));
    await p.click('#confirm-1 .ew-chip:nth-child(2)'); await p.waitForTimeout(200);
    const c = await read(p);
    C.check(`${w}: a second tap clears it (no chip chosen, the row goes)`, !c.chips.some(x => x.endsWith('*')) && !c.up, JSON.stringify(c));
    if (w === 390) {
      await p.click('#confirm-1 .ew-chip:nth-child(1)'); await p.waitForTimeout(150);
      await p.click('#confirm-1 .complete-rpe-btn[data-rpe="6"]'); await p.waitForTimeout(150);
      await p.click('#confirm-1 .confirm-btn'); await p.waitForTimeout(900);
      const st = await p.evaluate(() => { const x = (window.__STUB.params || []).filter(y => y[0] === 'save_session').pop(); return x && x[1].p_session.status; });
      C.check('Done: the record\'s status line carries it, "Partial (… done) · Out of time"', /^Partial \(\d+ of \d+ sets\/units done\) · Out of time$/.test(st || ''), st);
      await p.evaluate(() => resetDay('1')); await p.waitForTimeout(200);
      C.check('a reset forgets it', await p.evaluate(() => localStorage.getItem(ATHLETE_ID + '_whyearly_d1') === null));
    }
    C.check(`${w}: no page errors`, !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
