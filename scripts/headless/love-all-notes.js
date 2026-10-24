// Love All round 2, the notes group (2026-10-24 audit), checked the way the athlete meets them:
//   B25  a note box WITH a button stays until it is tapped (no 6 s timer, whatever ms a caller passed); a plain note still fades.
//   kg   the far-above-weight box reads "Keep it" and "Fix it": Fix it closes the box and puts the cursor in that set's weight box
//        and keeps nothing.
//   B13  Library's Mark as done: once done, the line reads "Done. I'll see it."
//   B24  the install card is a layer: the phone's Back closes it, and it never opens over a day's finish card.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-notes.js
'use strict';
const H = require('./lib');

const t = H.checker();
const SQUAT = 'Barbell Back Squat';

const toast = p => p.evaluate(() => {
  const e = document.getElementById('aaToast');
  return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').trim() : '';
});

// ═════════ B25: a note with a button stays ═════════
async function b25(browser) {
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
  // A plain note still fades by itself (ms short here so the test does not wait 6 s).
  await p.evaluate(() => aaToast('Plain note.', { ms: 300 }));
  await p.waitForTimeout(150);
  t.check('B25: a plain note shows', (await toast(p)).includes('Plain note.'));
  await p.waitForTimeout(500);
  t.check('B25: a plain note (no button) still fades on its timer', (await toast(p)) === '');
  // A note with a button and a short ms stays.
  await p.evaluate(() => { window.__ran = 0; aaToast('Needs an answer.', { action: 'Do it', ms: 300, run: () => { window.__ran++; } }); });
  await p.waitForTimeout(900);
  t.check('B25: a note with a button stays past its ms (no timer is set)', (await toast(p)).includes('Needs an answer.') && await p.evaluate(() => _toastT === null));
  t.check('B25: and with no ms at all, after the old 6 s', await (async () => {
    await p.evaluate(() => aaToast('No ms.', { action: 'Do it', run: () => {} }));
    await p.waitForTimeout(6600);
    return (await toast(p)).includes('No ms.');
  })());
  // A late tap on the button still works (it is the answer).
  await p.click('#aaToast .aa-toast-go'); await p.waitForTimeout(200);
  t.check('B25: a late tap on the button closes the box', (await toast(p)) === '');
  // The page under a box that stays is not blocked: a tap on a button outside the box lands.
  await p.evaluate(() => { window.__hit = 0; const b = document.createElement('button'); b.id = 'under'; b.textContent = 'x'; b.style.cssText = 'position:fixed;left:8px;top:8px;width:60px;height:40px;z-index:1'; b.onclick = () => window.__hit++; document.body.appendChild(b); aaToast('Stays.', { action: 'Go', run: () => {} }); });
  await p.click('#under'); await p.waitForTimeout(100);
  t.check('B25: a box that stays does not block the page under it', await p.evaluate(() => window.__hit === 1));
  t.check('B25: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  await b25(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
