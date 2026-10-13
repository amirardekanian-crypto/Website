// A Persian note reads right to left (Line Call, 2026-10-13; Second Serve D6; 24% of day notes are written in Persian):
// node scripts/headless/persian-notes.js [--out <dir>]
//
// The app had no dir="auto" anywhere: a Persian note sat left-aligned with its full stop at the start, and after Done the
// "Your rating" line wrapped its closing quote and full stop to the wrong side. Now both text boxes (the day note, an exercise's
// note) are dir="auto", the note's folded preview too, and every place a note is shown back puts it in a <bdi> (the rating line,
// the circuit's last time, the History sheet), so its own direction never scrambles the English around it. English is unchanged.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const path = require('path');
const H = require('./lib');
const FA = 'زانوی چپ بعد از ست ۳ کمی درد داشت.';

(async () => {
  const C = H.checker();
  const shots = H.outDir();
  const browser = await H.launch();
  for (const [note, rtl] of [[FA, true], ['Left knee a bit sore after set 3.', false]]) {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, fonts: true, prog: H.fixture(), stub: { library: H.library() } });
    await p.evaluate(() => { openDayView('1'); document.querySelectorAll('#day1 .checklist-item').forEach(c => { if (!c.classList.contains('checked')) toggleCheckOnly(c, '1'); }); try { hideAaToast(); } catch (e) {} });
    await p.click('#confirm-1 .complete-rpe-btn[data-rpe="7"]'); await p.waitForTimeout(150);
    await p.fill('#confirm-1 .complete-note-input', note); await p.waitForTimeout(150);
    const box = await p.evaluate(() => getComputedStyle(document.querySelector('#confirm-1 .complete-note-input')).direction);
    C.check((rtl ? 'Persian' : 'English') + ' day note: the box writes ' + (rtl ? 'right to left' : 'left to right'), box === (rtl ? 'rtl' : 'ltr'), box);
    await p.click('#confirm-1 .confirm-btn'); await p.waitForTimeout(900);
    const line = await p.evaluate(() => {
      const el = document.querySelector('#complete-1 .rate-fold .rf-line'), b = el.querySelector('bdi');
      return { text: el.textContent, html: el.innerHTML.slice(0, 40), bdi: b ? b.textContent : null, dir: b ? getComputedStyle(b).direction : null };
    });
    C.check((rtl ? 'Persian' : 'English') + ' note on the rating line: the same words, the note isolated in a <bdi> that reads ' + (rtl ? 'right to left' : 'left to right'),
      line.text === '7 of 10 · Note: "' + note + '"' && line.bdi === note && line.dir === (rtl ? 'rtl' : 'ltr'), JSON.stringify(line));
    if (rtl) {
      await p.evaluate(() => { const r = document.querySelector('#complete-1 .rate-fold'); r.scrollIntoView({ block: 'center' }); });
      await p.waitForTimeout(300);
      const r = await p.evaluate(() => { const b = document.querySelector('#complete-1 .rate-fold').getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
      await p.screenshot({ path: path.join(shots, 'persian-rating-line.png'), clip: { x: 0, y: Math.max(0, r.y - 8), width: 390, height: r.h + 16 } });
    }
    // An exercise's note: the box and its folded preview
    const ex = await p.evaluate(n => {
      const det = document.querySelector('#day1 details.ex-note-box, #day1 .ex-log details');
      const ta = document.querySelector('#day1 .ex-log textarea'), pv = document.querySelector('#day1 .note-preview');
      if (!ta || !pv) return null;
      ta.value = n; ta.dispatchEvent(new Event('input'));
      return { ta: getComputedStyle(ta).direction, pv: getComputedStyle(pv).direction, attr: ta.getAttribute('dir') + '/' + pv.getAttribute('dir'), det: !!det };
    }, note);
    C.check((rtl ? 'Persian' : 'English') + ' exercise note: the box and its preview are dir="auto"', !!ex && ex.attr === 'auto/auto' && ex.ta === (rtl ? 'rtl' : 'ltr'), JSON.stringify(ex));
    C.check('no page errors (' + (rtl ? 'Persian' : 'English') + ')', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  // The History sheet puts a note it shows back in a <bdi> too
  {
    const hist = [{ completed_on: H.past(3), day: '1', readiness: 4, log: [{ ex: 'Barbell Back Squat', block: 'Strength', reps: 6, note: FA,
      sets: [{ w: '70', n: 6, r: '7', d: true }, { w: '70', n: 6, r: '8', d: true }] }] }];
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist, stub: { library: H.library() } });
    await p.evaluate(() => openDayView('1')); await p.waitForTimeout(300);
    const hs = await p.evaluate(`(() => { try { openHistorySheet(${H.card('Barbell Back Squat')}); } catch (e) { return 'openHistorySheet: ' + e.message; }
      const b = document.querySelector('.hs-n bdi, .lt-note bdi'); return b ? { text: b.textContent, dir: getComputedStyle(b).direction } : null; })()`);
    C.check('History: a Persian note sits in a <bdi> and reads right to left', !!hs && hs.text === FA && hs.dir === 'rtl', JSON.stringify(hs));
    await ctx.close();
  }
  await browser.close();
  console.log('screenshot: ' + path.join(shots, 'persian-rating-line.png'));
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
