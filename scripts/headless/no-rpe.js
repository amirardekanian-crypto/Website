// The ready finish card names what is still to log (Line Call, 2026-10-13; Second Serve D3; Still to log, Amir 2026-10-25):
// node scripts/headless/no-rpe.js
//
// The ring on each closed card logs a whole day in 11 taps with no weight and no RPE, and the card said All done. Since 2026-10-13 one
// clay line said "No effort on N lifts. Add them ›". Since 2026-10-25 Still to log names each lift and what it is missing ("No effort
// on sets 1, 2 and 3"), a tap opens it with its How hard? strip open (missingToLog(), goMissing()), and a line goes once it is logged.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
  await p.evaluate(() => { openDayView('1'); document.querySelectorAll('#day1 .checklist-item').forEach(c => { if (!c.classList.contains('checked')) toggleCheckOnly(c, '1'); }); try { hideAaToast(); } catch (e) {} });
  await p.waitForTimeout(300);
  const effort = () => p.evaluate(() => [...document.querySelectorAll('#confirm-1 .cf-miss-row')].filter(b => /No effort on/.test(b.textContent)).map(b => ({
    name: b.querySelector('.cf-miss-nm').textContent, h: Math.round(b.getBoundingClientRect().height) })));
  const a = await effort();
  const n = await p.evaluate(() => noRpeCards('1').length);
  C.check('every set ticked by the ring: Still to log names each lift with no effort, 44 px or more to tap', await p.evaluate(() => document.getElementById('confirm-1').classList.contains('ready'))
    && n >= 2 && a.length === n && a.every(x => x.h >= 44), JSON.stringify([n, a]));
  await p.evaluate(() => { const b = [...document.querySelectorAll('#confirm-1 .cf-miss-row')].find(b => /No effort on/.test(b.textContent)); b.click(); });
  await p.waitForTimeout(600);
  const b = await p.evaluate(() => { const c = noRpeCards('1')[0]; return { open: !!c && !c.classList.contains('collapsed'), strip: !!(c && c.querySelector('.ex-set-row.rpe-open')) }; });
  C.check('tapping one opens that lift with its How hard? strip open', b.open && b.strip, JSON.stringify(b));
  // give every lift its RPE: the effort lines go
  await p.evaluate(() => { noRpeCards('1').forEach(c => { c.querySelectorAll('.ex-set-row').forEach(r => { const k = r.querySelector('.rpe-btn[data-rpe="7"]'); if (k && !k.classList.contains('selected')) k.click(); }); }); });
  await p.waitForTimeout(300);
  const d = await effort();
  C.check('with every RPE in, no effort line is left', (await p.evaluate(() => noRpeCards('1').length)) === 0 && d.length === 0, JSON.stringify(d));
  C.check('no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close(); await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
