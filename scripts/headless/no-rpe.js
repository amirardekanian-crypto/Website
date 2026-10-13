// The ready finish card names lifts with no RPE (Line Call, 2026-10-13; Second Serve D3): node scripts/headless/no-rpe.js
//
// The ring on each closed card logs a whole day in 11 taps with no weight and no RPE, and the card said All done. Now, ready with
// lifts that have an RPE written and a ticked set with none, one clay line says "No RPE on N lifts. Add them ›" and opens the first,
// its How hard? strip open (noRpeCards(), openNoRpe()). With every RPE in, nothing shows. Logging itself is unchanged.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
  await p.evaluate(() => { openDayView('1'); document.querySelectorAll('#day1 .checklist-item').forEach(c => { if (!c.classList.contains('checked')) toggleCheckOnly(c, '1'); }); try { hideAaToast(); } catch (e) {} });
  await p.waitForTimeout(300);
  const a = await p.evaluate(() => { const b = document.querySelector('#confirm-1 .cf-norpe'); return { ready: document.getElementById('confirm-1').classList.contains('ready'), text: b ? b.textContent.replace(/\s+/g, ' ').trim() : null,
    n: noRpeCards('1').length, h: b ? Math.round(b.getBoundingClientRect().height) : 0 }; });
  C.check('every set ticked by the ring: the ready card says "No RPE on N lifts. Add them ›", 44 px', a.ready && a.n >= 2 && a.text === `No RPE on ${a.n} lifts. Add them ›` && a.h >= 44, JSON.stringify(a));
  await p.click('#confirm-1 .cf-norpe'); await p.waitForTimeout(600);
  const b = await p.evaluate(() => { const c = noRpeCards('1')[0]; return { open: !!c && !c.classList.contains('collapsed'), strip: !!(c && c.querySelector('.ex-set-row.rpe-open')) }; });
  C.check('tapping it opens the first such lift with its How hard? strip open', b.open && b.strip, JSON.stringify(b));
  // give every lift its RPE: the line goes
  await p.evaluate(() => { noRpeCards('1').forEach(c => { c.querySelectorAll('.ex-set-row').forEach(r => { const k = r.querySelector('.rpe-btn[data-rpe="7"]'); if (k && !k.classList.contains('selected')) k.click(); }); }); refreshConfirmCard('1'); });
  await p.waitForTimeout(300);
  const d = await p.evaluate(() => ({ left: noRpeCards('1').length, line: !!document.querySelector('#confirm-1 .cf-norpe') }));
  C.check('with every RPE in, the line is gone', d.left === 0 && !d.line, JSON.stringify(d));
  C.check('no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close(); await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
