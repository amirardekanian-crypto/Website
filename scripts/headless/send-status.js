// Where the session is, said on the finished card (Line Call, 2026-10-13; Amir: "yes to all recommended"):
// node scripts/headless/send-status.js
//
// The finished card's line (paintSendStatus()) followed the email report alone, so it could say "✓ With your coach" while the
// session's record (save_session) still waited in the queue on the phone, which is how 10 sessions reached the inbox and not the
// dashboard before 2026-10-12. Now it is "Saved on your phone" while EITHER waits, "✓ With your coach" once both have gone (or
// once the record has, when no email is waiting), and it repaints the moment the queue sends the session (_paintSent()).
// And Done on a phone with no storage left used to throw and do nothing: now the half-done finish is undone and the card says why.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const tickAll = p => p.evaluate(() => {
  openDayView('1');
  document.querySelectorAll('#day1 .checklist-item').forEach(c => { if (!c.classList.contains('checked')) toggleCheckOnly(c, '1'); });
  try { hideAaToast(); } catch (e) {}
});
// Waits for the status line (or the queue) to settle, up to `ms`, instead of a fixed time: under a loaded machine a call can take
// longer than 1.5 s, and the check then read "Sending to your coach…" (2026-10-13). A timeout just lets the check report what it sees.
const settle = (p, fn, ms) => p.waitForFunction(fn, null, { timeout: ms || 8000 }).catch(() => {});
const line = p => p.evaluate(() => {
  const el = document.getElementById('send-status-1');
  return { text: el.textContent.trim(), cls: el.className, csq: JSON.parse(localStorage.getItem(ATHLETE_ID + '_csq') || '[]').length,
    outbox: JSON.parse(localStorage.getItem(ATHLETE_ID + '_outbox') || '[]').length };
});

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  // ── 1. No signal at Done: both wait; the email goes, the record still waits; the signal comes back ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
    await tickAll(p);
    await p.evaluate(() => { window.__STUB.mode = 'offline'; });
    await p.click('#confirm-1 .complete-rpe-btn[data-rpe="7"]'); await p.waitForTimeout(150);
    await p.click('#confirm-1 .confirm-btn');
    await settle(p, () => /^Saved on your phone/.test((document.getElementById('send-status-1') || { textContent: '' }).textContent.trim()));
    const a = await line(p);
    C.check('no signal at Done: "Saved on your phone" while the record and the email wait', /^Saved on your phone/.test(a.text) && a.csq === 1, JSON.stringify(a));
    // The email went (as if its own call got through) but the record is still in the queue: the line must not say "With your coach".
    const b = await p.evaluate(() => {
      localStorage.setItem(ATHLETE_ID + '_sent_d1', new Date().toISOString());
      localStorage.setItem(ATHLETE_ID + '_sentsig_d1', reportSig('1'));
      localStorage.removeItem(ATHLETE_ID + '_outbox');
      paintSendStatus('1');
      const el = document.getElementById('send-status-1');
      return { text: el.textContent.trim(), csq: JSON.parse(localStorage.getItem(ATHLETE_ID + '_csq') || '[]').length };
    });
    C.check('the email went but the record still waits: still "Saved on your phone", never "With your coach"', /^Saved on your phone/.test(b.text) && !/With your coach/.test(b.text) && b.csq === 1, JSON.stringify(b));
    await p.evaluate(() => { window.__STUB.mode = 'online'; window.dispatchEvent(new Event('online')); });
    await settle(p, () => /^✓ With your coach · /.test((document.getElementById('send-status-1') || { textContent: '' }).textContent.trim()));
    const c = await line(p);
    C.check('the signal comes back: the queue sends it and the line turns to "✓ With your coach" with the time, by itself', c.csq === 0 && /^✓ With your coach · /.test(c.text) && /success/.test(c.cls), JSON.stringify(c));
    C.check('no page errors (no signal, then signal)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 2. No email waiting at all (as when the reports are switched off): the record alone says it ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
    await tickAll(p);
    await p.click('#confirm-1 .complete-rpe-btn[data-rpe="7"]'); await p.waitForTimeout(150);
    await p.click('#confirm-1 .confirm-btn');
    await settle(p, () => !JSON.parse(localStorage.getItem(ATHLETE_ID + '_csq') || '[]').length);
    const d = await p.evaluate(() => { localStorage.removeItem(ATHLETE_ID + '_outbox'); paintSendStatus('1'); return document.getElementById('send-status-1').textContent.trim(); });
    C.check('record on the server, no email waiting or sent: "✓ With your coach"', d === '✓ With your coach', d);
    await ctx.close();
  }

  // ── 3. Done on a full phone ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } });
    await tickAll(p);
    await p.click('#confirm-1 .complete-rpe-btn[data-rpe="7"]'); await p.waitForTimeout(150);
    // Fill the phone's storage for real (the app binds the real setItem at load, so nothing can be faked): chunks, halving, to the last byte.
    const filled = await p.evaluate(() => {
      let size = 1 << 20, i = 0;
      while (size >= 8) { try { localStorage.setItem('__fill' + (i++), 'x'.repeat(size)); } catch (e) { size = size >> 1; } }
      return i;
    });
    await p.click('#confirm-1 .confirm-btn'); await p.waitForTimeout(800);
    const e = await p.evaluate(() => ({ hint: (document.querySelector('#confirm-1 .finish-hint') || {}).textContent || '', card: document.getElementById('confirm-1').classList.contains('visible'),
      done: document.getElementById('complete-1').classList.contains('visible'), stamp: localStorage.getItem(ATHLETE_ID + '_completed_d1') }));
    C.check('Done on a full phone: the card stays, says "Your phone is full. Free some space, then tap Done again.", nothing is stamped finished',
      e.hint === 'Your phone is full. Free some space, then tap Done again.' && e.card && !e.done && e.stamp === null, JSON.stringify(e));
    await p.evaluate(n => { for (let i = 0; i < n; i++) localStorage.removeItem('__fill' + i); }, filled);
    await p.click('#confirm-1 .confirm-btn'); await p.waitForTimeout(1200);
    const f = await p.evaluate(() => ({ done: document.getElementById('complete-1').classList.contains('visible'), stamp: !!localStorage.getItem(ATHLETE_ID + '_completed_d1'),
      saves: (window.__STUB.params || []).filter(x => x[0] === 'save_session').length }));
    C.check('with room again, the same Done finishes the session and saves it', f.done && f.stamp && f.saves >= 1, JSON.stringify(f));
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
