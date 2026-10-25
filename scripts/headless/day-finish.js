// The end of a training day and the slim bar (Amir, 2026-10-13: "the leftovers"): node scripts/headless/day-finish.js [--out <dir>]
//
// Three changes, each checked here the way the athlete meets it:
//   1. "Ask me on WhatsApp" is its OWN row under Done on the finish card (.finish-wa) and its own row on the finished card
//      (.complete-wa), outside the fold. Both build the link at tap time, so the note typed in the box comes along.
//   2. After Done the rating and the note fold behind one "Your rating" row (.rate-fold): closed every time the finished card is
//      shown, a line that says what is saved, Send the update and the send status OUTSIDE the fold, a reset brings the panel back.
//   3. Stop here joins Pause, Guided and Reset under ⋯ on the slim bar (.session-timer-finish): two taps (armedTap), the same
//      early step as the finish card's own button (finishEarlyStep), ⋯ folds, the card lands under the bar. With four buttons the
//      open row is a 2 x 2 grid, so a label that changes when it is armed never moves a neighbour between the two taps.
// Fit: every word whole, every button 44 px to hit, no sideways scroll, at 320, 360, 375 and 390 px, light and dark, with and
// without the week's limits row, armed or not, with the clock past an hour. week-notes.js pins the ⋯ row's gap; this adds the rest.
//
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const SQUAT = 'Barbell Back Squat';
const WIDTHS = [320, 360, 375, 390];

// ── a programme with the week's limits row (the back-off week: Max RPE 7 and 1 set fewer, which wraps at 320 px) ──
const loc = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function limitsProg() {
  const P = H.fixture();
  const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - 31);   // day 31 of 35: the final week
  const e = new Date(s); e.setDate(e.getDate() + 34);
  P.cycles[1].startDate = loc(s); P.cycles[1].endDate = loc(e);
  P.cycles[1].weekNotes = { last: { text: 'One set fewer on every exercise and nothing above RPE 7.', rpeCap: 7, setsDrop: 1 } };
  return P;
}
// A day with no standard exercise has no Guided button: the open row then holds Pause, Reset and Stop here.
function noGuidedProg() {
  const P = H.fixture();
  P.workouts.days[0].blocks = [{ icon: '🚣', title: 'Warm-Up', exercises: [
    { rx: { time: '5 minutes' }, exId: 'rowing', name: 'Rowing', type: 'simple' },
    { rx: { time: '5 minutes' }, name: 'Walk', type: 'simple' }] }];
  return P;
}

// ── helpers ──
async function openDay(browser, o = {}) {
  const { ctx, p } = await H.openProgram(browser, Object.assign({ w: 375, h: 667 }, o));
  await p.evaluate(() => {
    openDayView('1');
    // A WhatsApp link opens a new tab; the test only wants the href the tap builds.
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('a.wa-inline')) e.preventDefault(); }, true);
  });
  await p.waitForTimeout(250);
  return { ctx, p };
}
const clock = (p, ms) => p.evaluate(ms => {   // a running clock that has run `ms` already (default 12 min)
  const t0 = Date.now() - ms;
  localStorage.setItem(timerKey('1'), JSON.stringify({ running: true, resumeAt: t0, acc: 0, sessionStart: t0 }));
  renderTimer('1');
}, ms || 754000);
const tickOne = async p => {
  await p.evaluate(`(() => { const c = ${H.card(SQUAT)}; if (c.classList.contains('collapsed')) toggleExpand(c); c.querySelector('.ex-set-check').click(); hideAaToast(); })()`);
  await p.waitForTimeout(250);
};
async function tickAll(p) {   // every card in Day 1, the way first-timer.js does it
  const n = await p.evaluate(() => document.querySelectorAll('#day1 .checklist-item').length);
  for (let i = 0; i < n; i++) {
    await p.evaluate(i => {
      const c = document.querySelectorAll('#day1 .checklist-item')[i];
      if (c.classList.contains('collapsed')) toggleExpand(c);
      if (!c.classList.contains('checked')) toggleCheckOnly(c, '1');
      if (c.classList.contains('round-group')) c.querySelectorAll('.rpe-row').forEach(r => r.querySelector('.rpe-btn[data-rpe="7"]').click());
    }, i);
    await p.waitForTimeout(120);
  }
  await p.evaluate(() => hideAaToast());
  await p.waitForTimeout(900);
}
const R = (p, sel) => p.evaluate(sel => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return { top: Math.round(r.top * 10) / 10, bottom: Math.round(r.bottom * 10) / 10, left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10,
    w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, shown: r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' };
}, sel);
const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const T = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const cls = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return e ? [...e.classList] : null; }, sel);
const has = async (p, sel, c) => ((await cls(p, sel)) || []).includes(c);
// The finish card, ready: every card ticked, the way the athlete gets there.
async function toReady(p) {
  await clock(p);
  await tickAll(p);
  await p.evaluate(() => { const c = document.getElementById('confirm-1'); c.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(300);
}
const rate = async (p, n) => { await p.click(`#confirm-1 .complete-rpe-btn[data-rpe="${n}"], #complete-1 .complete-rpe-btn[data-rpe="${n}"]`); await p.waitForTimeout(150); };
const tapWa = (p, sel) => p.evaluate(sel => {
  const a = document.querySelector(sel);
  if (!a) return null;
  a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return decodeURIComponent(a.getAttribute('href'));
}, sel);
// "Finish" the report as if it had gone: the status says "With your coach", so a change after it offers Send the update.
const reportWent = p => p.evaluate(() => {
  localStorage.removeItem(outboxKey());
  localStorage.setItem(ATHLETE_ID + '_sent_d1', new Date().toISOString());
  localStorage.setItem(ATHLETE_ID + '_sentsig_d1', reportSig('1'));
  paintSendStatus('1');
});
// Tap Done for real: rate 7, then the Done button.
async function done(p, note) {
  await rate(p, 7);
  if (note) { await p.fill('#confirm-1 .complete-note-input', note); await p.waitForTimeout(150); }
  await p.click('#confirm-1 .confirm-btn');
  await p.waitForTimeout(700);
}

// The bar's fit, measured: every visible control 44 px to hit, no word cut, nothing overlapping, nothing past the edges.
const fit = p => p.evaluate(() => {
  const bar = document.getElementById('timer-1'), vw = innerWidth;
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const ctl = [...bar.querySelectorAll('.session-timer-leave, .session-timer-actions > button, .session-timer-more')].filter(vis);
  const box = e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  const rows = ctl.map(b => {
    const r = box(b), inner = [b, ...b.querySelectorAll('.stb-w, .stl-txt')];   // the words; the drawn glyphs are clipped boxes on purpose
    return { n: (b.className.match(/session-timer-[a-z]+/) || [''])[0].replace('session-timer-', '') + (b.classList.contains('guided') ? '(guided)' : ''), text: b.textContent.trim().replace(/\s+/g, ' '),
      h: Math.round((r.b - r.t) * 10) / 10, cut: inner.some(x => x.scrollWidth > x.clientWidth + 1), l: r.l, r: r.r, t: r.t, b: r.b };
  });
  const time = bar.querySelector('.session-timer-time'), tr = box(time);
  const lv = rows.find(x => x.n === 'leave'), mo = rows.find(x => x.n === 'more');
  const overlaps = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    if (a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5) overlaps.push(a.n + '/' + b.n);
  }
  const wk = bar.querySelector('.session-timer-week');
  return { rows, tooSmall: rows.filter(x => x.h < 43.5).map(x => x.n + ' ' + x.h), cut: rows.filter(x => x.cut).map(x => x.text),
    outside: rows.filter(x => x.l < -0.5 || x.r > vw + 0.5).map(x => x.n), overlaps,
    clockCut: time.scrollWidth > time.clientWidth + 1, clockClear: tr.l >= (lv ? lv.r : 0) - 0.5 && tr.r <= (mo ? mo.l : vw) + 0.5, clock: time.textContent,
    barSide: bar.scrollWidth > bar.clientWidth + 1, week: !!(wk && vis(wk)), sideways: document.documentElement.scrollWidth - vw,
    actionRows: new Set(rows.filter(x => !['leave', 'more'].includes(x.n)).map(x => Math.round(x.t))).size, count: rows.filter(x => !['leave', 'more'].includes(x.n)).length };
});
const fitOk = f => !f.tooSmall.length && !f.cut.length && !f.outside.length && !f.overlaps.length && !f.clockCut && f.clockClear && !f.barSide && f.sideways <= 0;
const disarm = (p, sel) => p.evaluate(sel => { const b = document.querySelector(sel); clearTimeout(b._armT); b.dataset.armed = ''; b.classList.remove('armed'); if (b.dataset.label != null) b.textContent = b.dataset.label; }, sel);

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const shot = (p, name) => p.screenshot({ path: require('path').join(shots, name + '.png'), fullPage: false });

  // ═══ 1. WhatsApp under Done ═══════════════════════════════════════════════════════════════════════════════════════════
  {
    const { ctx, p } = await openDay(browser);
    await clock(p); await tickOne(p);
    t.check('in progress: the finish card is small and its WhatsApp row is hidden', await has(p, '#confirm-1', 'partial') && !(await R(p, '#confirm-1 .finish-wa')).shown && !(await R(p, '#confirm-1 .wa-inline')).shown);
    await tickAll(p);
    await p.evaluate(() => document.getElementById('confirm-1').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(300);
    t.check('every set done: the card is ready', await has(p, '#confirm-1', 'ready'));
    const m = await p.evaluate(() => {
      const c = document.getElementById('confirm-1'), foot = c.querySelector('.confirm-foot'), wa = c.querySelector('.finish-wa'), a = wa && wa.querySelector('a.wa-inline');
      const done = c.querySelector('.confirm-btn').getBoundingClientRect(), ar = a && a.getBoundingClientRect();
      return { next: foot && foot.nextElementSibling === wa, doneText: c.querySelector('.confirm-btn').textContent, underDone: !!ar && ar.top >= done.bottom - 0.5, gap: ar && Math.round(ar.top - done.bottom),
        h: ar && Math.round(ar.height), inNote: !!c.querySelector('.complete-note .wa-inline'), inRate: !!c.querySelector('.finish-rate .wa-inline'), label: a && a.querySelector('b').textContent,
        shown: !!ar && ar.height > 0, onClick: a && a.getAttribute('onclick'), count: c.querySelectorAll('.wa-inline').length };
    });
    t.check('ready: the WhatsApp row is the card\'s last child, UNDER Done, not inside the note or the rating', m.next && m.underDone && m.shown && !m.inNote && !m.inRate && m.count === 1 && /Done/.test(m.doneText), JSON.stringify(m));
    t.check('ready: the row says "Ask me on WhatsApp", is 64 px tall and builds its link at tap time (sessionWaUrl)', m.label === 'Ask me on WhatsApp' && m.h >= 63 && /sessionWaUrl\('1'\)/.test(m.onClick || ''), JSON.stringify(m));
    // The note typed in the finish card's box comes along (it used to be read from the finished card only).
    await p.fill('#confirm-1 .complete-note-input', 'left knee pinches on the squat');
    const href = await tapWa(p, '#confirm-1 .finish-wa a.wa-inline');
    t.check('ready: the link carries the day, the cycle and the note typed in the box', /^https:\/\/wa\.me\/\d+\?text=/.test(href) && /About Day 1/.test(href) && /left knee pinches on the squat/.test(href), href);
    t.check('ready: the card has no sideways scroll, no page errors', (await sideways(p)) <= 0 && p.errs.length === 0, p.errs.join(' | '));
    await p.screenshot({ path: require('path').join(shots, 'finish-ready-375.png') });
    await ctx.close();
  }
  {   // Finishing early shows it too, and Keep going takes it away again
    const { ctx, p } = await openDay(browser);
    await clock(p); await tickOne(p);
    await p.click('#confirm-1 .confirm-btn'); await p.click('#confirm-1 .confirm-btn'); await p.waitForTimeout(500);
    t.check('finishing early: the card is early and the WhatsApp row shows', await has(p, '#confirm-1', 'early') && (await R(p, '#confirm-1 .finish-wa a.wa-inline')).shown);
    await p.evaluate(() => keepGoing('1')); await p.waitForTimeout(200);
    t.check('Keep going: back to in progress, the row is hidden', await has(p, '#confirm-1', 'partial') && !(await R(p, '#confirm-1 .finish-wa')).shown);
    await ctx.close();
  }

  // ═══ 2. The finished card: its own WhatsApp row, and the rating behind one row ═════════════════════════════════════════
  {
    const { ctx, p } = await openDay(browser);
    await toReady(p);
    await done(p, 'first note');
    t.check('Done: the day is finished and the finished card shows', await has(p, '#complete-1', 'visible') && await p.evaluate(() => completedHere(localStorage.getItem(ATHLETE_ID + '_completed_d1'))));
    const m = await p.evaluate(() => {
      const c = document.getElementById('complete-1'), q = s => c.querySelector(s), r = e => e && e.getBoundingClientRect();
      const fold = q('.rate-fold'), slot = q('.complete-rate-slot'), wa = q('.complete-wa'), st = q('#send-status-1'), hab = q('#habit-tick-1');
      return { foldText: fold.querySelector('.rf-txt b').textContent, line: fold.querySelector('.rf-line').textContent, exp: fold.getAttribute('aria-expanded'), ctl: fold.getAttribute('aria-controls'),
        slotId: slot.id, open: c.classList.contains('rate-open'), slotShown: r(slot).height > 0, panelInSlot: !!slot.querySelector('.finish-rate'), panelInConfirm: !!document.querySelector('#confirm-1 .finish-rate'),
        waShown: r(wa).height > 0, waBeforeFold: r(wa).bottom <= r(fold).top + 0.5, waAfterStatus: r(wa).top >= r(st).bottom - 0.5, waAfterHabit: !hab || hab.hidden || r(wa).top >= r(hab).bottom - 0.5,
        waInFold: !!(slot.contains(wa) || fold.contains(wa)), waCount: c.querySelectorAll('.wa-inline').length, foldH: Math.round(r(fold).height), tag: fold.tagName };
    });
    t.check('Done: "Your rating" is a closed row (aria-expanded false, aria-controls the slot), the panel waits in the slot', m.tag === 'BUTTON' && m.foldText === 'Your rating' && m.exp === 'false' && m.ctl === m.slotId && !m.open && !m.slotShown && m.panelInSlot && !m.panelInConfirm, JSON.stringify(m));
    t.check('Done: the row reads "7 of 10 · Note: "first note"" and is at least 64 px tall', m.line === '7 of 10 · Note: "first note"' && m.foldH >= 63, JSON.stringify(m));
    t.check('Done: the finished card has its OWN WhatsApp row, under the status and AA Proof, above the fold, outside it', m.waShown && m.waBeforeFold && m.waAfterStatus && m.waAfterHabit && !m.waInFold && m.waCount === 1, JSON.stringify(m));
    // the fold opens and closes
    await p.evaluate(() => document.querySelector('#complete-1 .rate-fold').scrollIntoView({ block: 'center' }));
    await p.click('#complete-1 .rate-fold'); await p.waitForTimeout(200);
    let o = await p.evaluate(() => ({ exp: document.querySelector('#complete-1 .rate-fold').getAttribute('aria-expanded'), open: document.getElementById('complete-1').classList.contains('rate-open'),
      slot: document.querySelector('#complete-1 .complete-rate-slot').getBoundingClientRect().height, key: document.querySelector('#complete-1 .complete-rpe-btn').getBoundingClientRect().height,
      note: document.querySelector('#complete-1 .complete-note-input').getBoundingClientRect().height, sel: document.querySelector('#complete-1 .complete-rpe-btn.selected').dataset.rpe,
      chev: getComputedStyle(document.querySelector('#complete-1 .rf-go')).transform }));
    t.check('tap Your rating: it opens (aria-expanded true), the ten keys and the note box show, 7 is selected, the chevron turns', o.exp === 'true' && o.open && o.slot > 100 && o.key >= 44 && o.note >= 80 && o.sel === '7' && o.chev !== 'none', JSON.stringify(o));
    await p.screenshot({ path: require('path').join(shots, 'finished-open-375.png') });
    await p.click('#complete-1 .rate-fold'); await p.waitForTimeout(200);
    o = await p.evaluate(() => ({ exp: document.querySelector('#complete-1 .rate-fold').getAttribute('aria-expanded'), slot: document.querySelector('#complete-1 .complete-rate-slot').getBoundingClientRect().height }));
    t.check('tap again: it closes', o.exp === 'false' && o.slot === 0, JSON.stringify(o));

    // The line follows the rating and the note. The report has gone, so a change offers Send the update.
    await reportWent(p);
    t.check('the report has gone: Send the update is not offered', !(await R(p, '#complete-1 .send-session-btn')).shown && /With your coach/.test(await T(p, '#send-status-1')), await T(p, '#send-status-1'));
    await p.click('#complete-1 .rate-fold'); await p.waitForTimeout(150);
    await p.click('#complete-1 .complete-rpe-btn[data-rpe="8"]'); await p.waitForTimeout(250);
    t.check('a changed rating: the line says 8 of 10, Send the update appears with the fold open', (await T(p, '#complete-1 .rf-line')) === '8 of 10 · Note: "first note"' && (await R(p, '#complete-1 .send-session-btn')).shown, await T(p, '#complete-1 .rf-line'));
    await p.fill('#complete-1 .complete-note-input', 'a much longer note than forty characters, written after Done');
    t.check('a changed note: the line shows its first 40 characters and "…"', (await T(p, '#complete-1 .rf-line')) === '8 of 10 · Note: "a much longer note than forty characters…"', await T(p, '#complete-1 .rf-line'));
    await p.click('#complete-1 .rate-fold'); await p.waitForTimeout(200);
    const s = await R(p, '#complete-1 .send-session-btn');
    t.check('the fold closed again: Send the update stays outside it, visible and 44 px tall', s.shown && s.h >= 44 && !(await R(p, '#complete-1 .complete-rate-slot')).shown, JSON.stringify(s));
    t.check('…and the WhatsApp row too', (await R(p, '#complete-1 .complete-wa a.wa-inline')).shown);
    await p.fill('#complete-1 .complete-note-input', '', { force: true }).catch(() => {});   // a hidden box takes no typing: the note stays as it was
    // the WhatsApp link on the finished card carries the note saved in the (folded) box
    const href2 = await tapWa(p, '#complete-1 .complete-wa a.wa-inline');
    t.check('the finished card\'s WhatsApp link carries the saved note while the fold is closed', /About Day 1/.test(href2) && /a much longer note than forty characters, written after Done/.test(href2), href2);
    // an empty note, and a rating taken off
    await p.evaluate(() => { document.querySelector('#complete-1 .rate-fold').click(); });
    await p.fill('#complete-1 .complete-note-input', '');
    await p.click('#complete-1 .complete-rpe-btn[data-rpe="8"]'); await p.waitForTimeout(150);   // the same key again takes the rating off
    t.check('no rating and no note: "Not rated · No note"', (await T(p, '#complete-1 .rf-line')) === 'Not rated · No note', await T(p, '#complete-1 .rf-line'));
    await p.click('#complete-1 .complete-rpe-btn[data-rpe="6"]'); await p.waitForTimeout(150);
    t.check('a rating and no note: "6 of 10 · No note"', (await T(p, '#complete-1 .rf-line')) === '6 of 10 · No note', await T(p, '#complete-1 .rf-line'));
    t.check('no page errors (finished card)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {   // A reload of a finished day: the card is folded again, the line says what is saved
    const { ctx, p } = await openDay(browser);
    await toReady(p); await done(p, 'kept note');
    await p.click('#complete-1 .rate-fold'); await p.waitForTimeout(200);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await p.evaluate(() => openDayView('1')); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ open: document.getElementById('complete-1').classList.contains('rate-open'), exp: document.querySelector('#complete-1 .rate-fold').getAttribute('aria-expanded'),
      line: document.querySelector('#complete-1 .rf-line').textContent, vis: document.getElementById('complete-1').classList.contains('visible') }));
    t.check('a reload of a finished day: folded again, the line says what is saved', !r.open && r.exp === 'false' && r.line === '7 of 10 · Note: "kept note"', JSON.stringify(r));
    await ctx.close();
  }
  {   // Reset brings the panel back into the finish card, and it works there
    const { ctx, p } = await openDay(browser);
    await toReady(p); await done(p, 'before the reset');
    await p.click('#complete-1 .rate-fold'); await p.waitForTimeout(150);   // open on purpose: a reset must clear it
    await p.evaluate(() => resetDay('1')); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ open: document.getElementById('complete-1').classList.contains('rate-open'), exp: document.querySelector('#complete-1 .rate-fold').getAttribute('aria-expanded'),
      inConfirm: !!document.querySelector('#confirm-1 .finish-rate'), inSlot: !!document.querySelector('#complete-1 .complete-rate-slot .finish-rate'), doneStamp: localStorage.getItem(ATHLETE_ID + '_completed_d1'),
      completeShown: document.getElementById('complete-1').classList.contains('visible') }));
    t.check('Reset: the panel is back in the finish card, the fold is cleared, the day is not finished', r.inConfirm && !r.inSlot && !r.open && r.exp === 'false' && !r.doneStamp && !r.completeShown, JSON.stringify(r));
    t.check('Reset: the Stop here under ⋯ is gone with the ticks (nothing is logged)', await p.evaluate(() => document.querySelector('#timer-1 .session-timer-finish').hidden));
    await clock(p); await tickAll(p);
    await p.evaluate(() => document.getElementById('confirm-1').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    const k = await R(p, '#confirm-1 .finish-rate .complete-rpe-btn');
    const n = await R(p, '#confirm-1 .finish-rate .complete-note-input');
    t.check('after a reset the finish card is ready again with the rating keys and the note box showing (44 px keys)', await has(p, '#confirm-1', 'ready') && k.shown && k.h >= 44 && n.shown, JSON.stringify({ k, n }));
    await p.click('#confirm-1 .complete-rpe-btn[data-rpe="5"]'); await p.waitForTimeout(150);
    t.check('…and the keys still rate the session', (await p.evaluate(() => localStorage.getItem(ATHLETE_ID + '_srpe_1'))) === '5');
    t.check('no page errors (reset)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {   // Done still needs the rating
    const { ctx, p } = await openDay(browser);
    await toReady(p);
    await p.click('#confirm-1 .confirm-btn'); await p.waitForTimeout(300);
    t.check('Done without a rating: not finished, "Rate the session first" shows', !(await p.evaluate(() => localStorage.getItem(ATHLETE_ID + '_completed_d1'))) && /Rate the session first/.test(await T(p, '#confirm-1 .finish-hint')), await T(p, '#confirm-1 .finish-hint'));
    await ctx.close();
  }

  // ═══ 3. Stop here under ⋯ ═══════════════════════════════════════════════════════════════════════════════════════════
  {
    const { ctx, p } = await openDay(browser);
    const hidden = async () => (await p.evaluate(() => document.querySelector('#timer-1 .session-timer-finish').hidden));
    t.check('before Start: Stop here is hidden', await hidden());
    await tickOne(p);   // a set logged with the clock never started: the bar is not slim, so the button has no place on it
    const nb = await p.evaluate(() => { const b = document.querySelector('#timer-1 .session-timer-finish'); return { hidden: b.hidden, shown: b.getBoundingClientRect().height > 0, slim: document.getElementById('timer-1').classList.contains('slim') }; });
    t.check('a set logged but the clock never started: the bar is not slim, Stop here is not drawn', !nb.slim && !nb.shown, JSON.stringify(nb));
    await ctx.close();
  }
  {
    const { ctx, p } = await openDay(browser);
    const hidden = async () => (await p.evaluate(() => document.querySelector('#timer-1 .session-timer-finish').hidden));
    await clock(p);
    t.check('the clock running and nothing logged yet: hidden (the finish card is not on the page either)', await hidden());
    await tickOne(p);
    t.check('mid-session (a set done, not all): Stop here is for the bar', !(await hidden()));
    const closed = await R(p, '#timer-1 .session-timer-finish');
    t.check('…but it is only drawn on the open row (⋯ closed: not drawn)', !closed.shown, JSON.stringify(closed));
    t.check('⋯ names what is under it', (await p.getAttribute('#timer-1 .session-timer-more', 'aria-label')) === 'More: Pause, Guided, Reset, Stop here and Ask Amir');   // Ask Amir under ⋯ since 2026-10-13
    await p.click('#timer-1 .session-timer-more'); await p.waitForTimeout(200);
    const f = await fit(p);
    t.check('⋯ open: Pause, Guided, Reset and Stop here in a 2 x 2 grid, each 44 px to hit, nothing cut', f.count === 4 && f.actionRows === 2 && fitOk(f), JSON.stringify(f.rows.map(x => [x.n, x.text, x.h, Math.round(x.l), Math.round(x.t)])));
    // one tap arms and does nothing else
    await p.click('#timer-1 .session-timer-finish'); await p.waitForTimeout(150);
    let a = await p.evaluate(() => { const b = document.querySelector('#timer-1 .session-timer-finish'), c = document.getElementById('confirm-1'); return { txt: b.textContent, armed: b.classList.contains('armed'), early: c.dataset.early || '', partial: c.classList.contains('partial'),
      open: document.getElementById('timer-1').classList.contains('open'), done: localStorage.getItem(ATHLETE_ID + '_completed_d1') }; });
    t.check('one tap arms it ("Stop here?") and does nothing else: ⋯ stays open, the card is not early, nothing finished', a.txt === 'Stop here?' && a.armed && !a.early && a.partial && a.open && !a.done, JSON.stringify(a));
    const fa = await fit(p);
    t.check('armed: still a whole 2 x 2 grid, nothing cut, nothing moved to another row', fa.count === 4 && fa.actionRows === 2 && fitOk(fa) && JSON.stringify(fa.rows.map(x => [x.n, Math.round(x.l), Math.round(x.t)])) === JSON.stringify(f.rows.map(x => [x.n, Math.round(x.l), Math.round(x.t)])), JSON.stringify(fa.rows.map(x => [x.n, x.text, Math.round(x.l), Math.round(x.t)])));
    await p.screenshot({ path: require('path').join(shots, 'bar-more-armed-375.png') });
    // the second tap
    await p.click('#timer-1 .session-timer-finish'); await p.waitForTimeout(900);
    a = await p.evaluate(() => {
      const c = document.getElementById('confirm-1'), bar = document.getElementById('timer-1'), br = bar.getBoundingClientRect(), cr = c.getBoundingClientRect(), tx = c.querySelector('.confirm-text').getBoundingClientRect();
      return { early: c.dataset.early, ready: c.classList.contains('ready'), cls: c.className, open: bar.classList.contains('open'), exp: bar.querySelector('.session-timer-more').getAttribute('aria-expanded'),
        btnHidden: bar.querySelector('.session-timer-finish').hidden, text: c.querySelector('.confirm-text').textContent, missing: c.querySelectorAll('.cf-miss-row').length,
        cardTop: Math.round(cr.top), barBottom: Math.round(br.bottom), titleTop: Math.round(tx.top), vh: innerHeight, done: localStorage.getItem(ATHLETE_ID + '_completed_d1') };
    });
    t.check('the second tap: the finish card is early (rating, what is not done, Done), nothing is finished yet', a.early === '1' && a.ready && /early/.test(a.cls) && /Stopping Day 1 here/.test(a.text) && a.missing > 0 && !a.done, JSON.stringify(a));
    t.check('…⋯ folds and the button goes', !a.open && a.exp === 'false' && a.btnHidden, JSON.stringify(a));
    t.check('…and the card is on screen right under the slim bar, its green band whole', a.cardTop >= a.barBottom - 1 && a.cardTop < a.vh - 100 && a.titleTop >= a.barBottom && a.titleTop < a.vh, JSON.stringify(a));
    await p.screenshot({ path: require('path').join(shots, 'bar-early-landed-375.png') });
    // finishing from here ends up the same as from the card
    await done(p, 'early finish');
    const e = await p.evaluate(() => ({ done: !!localStorage.getItem(ATHLETE_ID + '_completed_d1'), partial: (buildSessionData('1') || {}).isPartial, btnHidden: document.querySelector('#timer-1 .session-timer-finish').hidden,
      fin: document.getElementById('timer-1').classList.contains('finished') }));
    t.check('Done after the bar\'s Stop here finishes the day as a partial session; the bar is finished and has no Stop here', e.done && e.partial === true && e.btnHidden && e.fin, JSON.stringify(e));
    t.check('no page errors (Stop here under ⋯)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {   // The armed label goes by itself, and Keep going brings the bar's button back
    const { ctx, p } = await openDay(browser);
    await clock(p); await tickOne(p);
    await p.click('#timer-1 .session-timer-more'); await p.click('#timer-1 .session-timer-finish'); await p.waitForTimeout(4400);
    const a = await p.evaluate(() => { const b = document.querySelector('#timer-1 .session-timer-finish'); return { txt: b.textContent, armed: b.classList.contains('armed') }; });
    t.check('an armed Stop here disarms by itself after 4 s', a.txt === 'Stop here' && !a.armed, JSON.stringify(a));
    await p.evaluate(() => finishEarlyFromBar('1')); await p.waitForTimeout(300);
    t.check('after the early step the bar\'s button is gone', await p.evaluate(() => document.querySelector('#timer-1 .session-timer-finish').hidden));
    await p.evaluate(() => keepGoing('1')); await p.waitForTimeout(200);
    t.check('Keep going: the bar\'s Stop here is back', !(await p.evaluate(() => document.querySelector('#timer-1 .session-timer-finish').hidden)));
    await ctx.close();
  }
  {   // The finish card's OWN Stop here still works (two taps), and shares the early step
    const { ctx, p } = await openDay(browser);
    await clock(p); await tickOne(p);
    await p.evaluate(() => document.getElementById('confirm-1').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    await p.click('#confirm-1 .confirm-btn'); await p.waitForTimeout(150);
    let a = await p.evaluate(() => { const b = document.querySelector('#confirm-1 .confirm-btn'); return { txt: b.textContent, early: document.getElementById('confirm-1').dataset.early || '' }; });
    t.check('the card\'s Stop here: one tap arms ("Tap again to stop here")', a.txt === 'Tap again to stop here' && !a.early, JSON.stringify(a));
    await p.click('#confirm-1 .confirm-btn'); await p.waitForTimeout(700);
    a = await p.evaluate(() => ({ early: document.getElementById('confirm-1').dataset.early, cls: document.getElementById('confirm-1').className, btn: document.querySelector('#confirm-1 .confirm-btn').textContent,
      barBtnHidden: document.querySelector('#timer-1 .session-timer-finish').hidden, shared: typeof finishEarlyStep === 'function' && finishTap.toString().includes('finishEarlyStep') && finishEarlyFromBar.toString().includes('finishEarlyStep') }));
    t.check('…the second tap makes the card early, with Done; the bar\'s button goes; both buttons call finishEarlyStep', a.early === '1' && /ready/.test(a.cls) && /early/.test(a.cls) && /Done/.test(a.btn) && a.barBtnHidden && a.shared, JSON.stringify(a));
    await ctx.close();
  }
  {   // Every set done: the card asks for Done, so the bar has no Stop here; the coach preview never has it
    const { ctx, p } = await openDay(browser);
    await clock(p); await tickOne(p);
    await tickAll(p);
    t.check('every set done: Stop here is hidden (the card asks for the rating and Done)', await p.evaluate(() => document.querySelector('#timer-1 .session-timer-finish').hidden));
    t.check('…and the label stays accurate for the three that are left (Pause, Guided, Reset are still there)', (await p.evaluate(() => document.querySelectorAll('#timer-1 .session-timer-actions > button:not([hidden])').length)) === 3);
    await ctx.close();
    const o = await openDay(browser);
    await clock(o.p); await tickOne(o.p);
    const pv = await o.p.evaluate(() => { window.IS_PREVIEW = true; paintResetBtn('1'); const b = document.querySelector('#timer-1 .session-timer-finish'); return { hidden: b.hidden, reset: document.querySelector('#timer-1 .session-timer-reset').hidden }; });
    t.check('the coach preview never shows Stop here (as Reset)', pv.hidden && pv.reset, JSON.stringify(pv));
    await o.ctx.close();
  }
  {   // A day with no Guided: three buttons, Pause on the first row on its own
    const { ctx, p } = await openDay(browser, { prog: noGuidedProg() });
    await clock(p);
    await p.evaluate(() => { const c = document.querySelector('#day1 .checklist-item'); if (c.classList.contains('collapsed')) toggleExpand(c); toggleCheckOnly(c, '1'); hideAaToast(); });
    await p.waitForTimeout(300);
    t.check('no Guided on the day: the label does not name it', (await p.getAttribute('#timer-1 .session-timer-more', 'aria-label')) === 'More: Pause, Reset, Stop here and Ask Amir');
    await p.click('#timer-1 .session-timer-more'); await p.waitForTimeout(200);
    const f = await fit(p);
    t.check('no Guided: Pause on its own row, Reset and Stop here under it, all whole', f.count === 3 && f.actionRows === 2 && fitOk(f), JSON.stringify(f.rows.map(x => [x.n, x.text, x.h, Math.round(x.l), Math.round(x.t)])));
    await ctx.close();
  }

  // ═══ 4. Fit: four widths x light/dark x with/without the limits row, idle and armed, the clock past an hour ══════════════
  for (const w of WIDTHS) for (const dark of [false, true]) for (const lim of [false, true]) {
    const { ctx, p } = await openDay(browser, { w, h: w <= 320 ? 568 : 700, dark, prog: lim ? limitsProg() : H.fixture() });
    await clock(p, 3725000);   // 1:02:05
    await tickOne(p);
    await p.click('#timer-1 .session-timer-more'); await p.waitForTimeout(200);
    const idle = await fit(p);
    await p.click('#timer-1 .session-timer-finish'); await p.click('#timer-1 .session-timer-reset'); await p.waitForTimeout(150);
    const armed = await fit(p);
    const same = JSON.stringify(idle.rows.map(x => [x.n, Math.round(x.l), Math.round(x.t)])) === JSON.stringify(armed.rows.map(x => [x.n, Math.round(x.l), Math.round(x.t)]));
    const gap = await p.evaluate(() => { const b = document.getElementById('timer-1'); return Math.round(b.querySelector('.session-timer-actions').getBoundingClientRect().top - b.querySelector('.session-timer-more').getBoundingClientRect().bottom); });
    const tag = `${w} px, ${dark ? 'dark' : 'light'}, ${lim ? 'with' : 'no'} limits row`;
    t.check(`fit ${tag}: ⋯ open, clock ${idle.clock}, four buttons, Stop here? and Reset? armed`,
      idle.count === 4 && fitOk(idle) && fitOk(armed) && armed.count === 4 && same && idle.actionRows === 2 && gap >= 4 && (!lim || idle.week) && p.errs.length === 0,
      JSON.stringify({ idle: fitOk(idle) ? 'ok' : idle, armed: fitOk(armed) ? 'ok' : armed, same, gap, week: idle.week, err: p.errs.join(' | ') }));
    if (!dark && !lim && (w === 320 || w === 375)) await p.screenshot({ path: require('path').join(shots, `bar-fit-${w}.png`) });
    await ctx.close();
  }
  for (const w of [320, 390]) {   // three buttons (no Guided), long clock
    const { ctx, p } = await openDay(browser, { w, h: 640, prog: noGuidedProg() });
    await clock(p, 3725000);
    await p.evaluate(() => { const c = document.querySelector('#day1 .checklist-item'); if (c.classList.contains('collapsed')) toggleExpand(c); toggleCheckOnly(c, '1'); hideAaToast(); });
    await p.waitForTimeout(300);
    await p.click('#timer-1 .session-timer-more'); await p.click('#timer-1 .session-timer-finish'); await p.click('#timer-1 .session-timer-reset'); await p.waitForTimeout(150);
    const f = await fit(p);
    t.check(`fit ${w} px, no Guided, both armed: three buttons whole`, f.count === 3 && fitOk(f), JSON.stringify(f.rows.map(x => [x.n, x.text, x.h, Math.round(x.l), Math.round(x.t)])));
    await ctx.close();
  }
  for (const w of WIDTHS) for (const dark of [false, true]) {   // the three-button row (Stop here gone) is as it was: Pause, Guided, Reset whole
    const { ctx, p } = await openDay(browser, { w, h: 700, dark });
    await clock(p, 3725000); await tickAll(p);
    await p.click('#timer-1 .session-timer-more'); await p.click('#timer-1 .session-timer-reset'); await p.waitForTimeout(150);
    const f = await fit(p);
    t.check(`fit ${w} px, ${dark ? 'dark' : 'light'}: every set done, three buttons (Guided under Pause and Reset below 360 px, so its grey line fits), Reset? armed`, f.count === 3 && f.actionRows === (w < 360 ? 2 : 1) && fitOk(f), JSON.stringify(f.rows.map(x => [x.n, x.text, x.h, Math.round(x.l), Math.round(x.t)])));
    await ctx.close();
  }

  // ═══ 5. The cards at four widths: no sideways scroll, nothing cut, 44 px to hit ═════════════════════════════════════════
  const LONG = 'W'.repeat(120);   // an unbroken word: the line under "Your rating" must wrap inside the row, not push the page
  for (const w of WIDTHS) for (const dark of w === 320 || w === 390 ? [false, true] : [false]) {
    const { ctx, p } = await openDay(browser, { w, h: w <= 320 ? 568 : 700, dark });
    await toReady(p);
    const rd = await p.evaluate(() => {
      const c = document.getElementById('confirm-1'), vw = innerWidth, q = s => c.querySelector(s).getBoundingClientRect();
      const wa = q('.finish-wa a.wa-inline'), dn = q('.confirm-btn');
      const lab = c.querySelector('.finish-wa .wa-inline-txt b'), sub = c.querySelector('.finish-wa .wa-inline-txt small');
      return { waIn: wa.left >= 0 && wa.right <= vw, doneIn: dn.left >= 0 && dn.right <= vw, waH: Math.round(wa.height), doneH: Math.round(dn.height),
        cut: [lab, sub, c.querySelector('.finish-wa a.wa-inline')].some(x => x.scrollWidth > x.clientWidth + 1), side: document.documentElement.scrollWidth - vw };
    });
    const tag = `${w} px${dark ? ' dark' : ''}`;
    t.check(`finish card ${tag}: Done and the WhatsApp row inside the screen, both tall enough, nothing cut`, rd.waIn && rd.doneIn && rd.waH >= 44 && rd.doneH >= 44 && !rd.cut && rd.side <= 0, JSON.stringify(rd));
    await p.screenshot({ path: require('path').join(shots, `finish-ready-${w}${dark ? '-dark' : ''}.png`) });
    await done(p, LONG);
    const fd = await p.evaluate(() => {
      const c = document.getElementById('complete-1'), vw = innerWidth, f = c.querySelector('.rate-fold'), fr = f.getBoundingClientRect(), ln = c.querySelector('.rf-line'), wa = c.querySelector('.complete-wa a.wa-inline').getBoundingClientRect();
      return { foldH: Math.round(fr.height), foldIn: fr.left >= 0 && fr.right <= vw, lineCut: ln.scrollWidth > ln.clientWidth + 1, line: ln.textContent, waIn: wa.left >= 0 && wa.right <= vw, side: document.documentElement.scrollWidth - vw };
    });
    t.check(`finished card ${tag}: the "Your rating" row holds a 120-letter word inside it, 44 px+ tall, no sideways scroll`, fd.foldH >= 44 && fd.foldIn && !fd.lineCut && fd.waIn && fd.side <= 0 && /^7 of 10 · Note: "W+…"$/.test(fd.line), JSON.stringify(fd));
    await p.screenshot({ path: require('path').join(shots, `finished-closed-${w}${dark ? '-dark' : ''}.png`) });
    await p.click('#complete-1 .rate-fold'); await p.waitForTimeout(250);
    const op = await p.evaluate(() => { const c = document.getElementById('complete-1'), vw = innerWidth; const els = [...c.querySelectorAll('.complete-rpe-btn, .complete-note-input, .send-session-btn, .reset-session-btn, .rate-fold')].filter(e => e.getBoundingClientRect().height > 0);
      return { out: els.filter(e => { const r = e.getBoundingClientRect(); return r.left < -0.5 || r.right > vw + 0.5; }).length, small: els.filter(e => e.getBoundingClientRect().height < 43.5 && !e.matches('.complete-note-input')).map(e => e.className), n: els.length, side: document.documentElement.scrollWidth - vw }; });
    t.check(`finished card ${tag}: the fold open, every key and button inside the screen and 44 px to hit`, op.out === 0 && !op.small.length && op.n >= 12 && op.side <= 0 && p.errs.length === 0, JSON.stringify(op) + p.errs.join(' | '));
    await p.screenshot({ path: require('path').join(shots, `finished-open-${w}${dark ? '-dark' : ''}.png`) });
    await ctx.close();
  }

  // ═══ 6. Guided: the whole flow ═════════════════════════════════════════════════════════════════════════════════════════
  {
    const { ctx, p } = await openDay(browser);
    await clock(p); await tickAll(p);
    await p.evaluate(() => { openGuided('1'); }); await p.waitForTimeout(500);
    const g = await p.evaluate(() => ({ on: !!STEP, steps: STEP && STEP.seq.length }));
    t.check('Guided opens on the day', g.on && g.steps > 0, JSON.stringify(g));
    await p.evaluate(() => { STEP.pos = STEP.seq.length - 1; renderStep(); }); await p.waitForTimeout(300);
    const lab = await p.evaluate(() => { const b = [...document.querySelectorAll('#step-footer button')].find(x => /Finish session/.test(x.textContent)); return b ? b.textContent.trim() : null; });
    t.check('the last step offers Finish session ✓', !!lab, lab);
    await p.evaluate(() => { [...document.querySelectorAll('#step-footer button')].find(x => /Finish session/.test(x.textContent)).click(); });
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => { const c = document.getElementById('confirm-1'), r = c.getBoundingClientRect(), a = c.querySelector('.finish-wa a.wa-inline').getBoundingClientRect(), d = c.querySelector('.confirm-btn').getBoundingClientRect();
      return { closed: !STEP, ready: c.classList.contains('ready'), visible: c.classList.contains('visible'), onScreen: r.bottom > 0 && r.top < innerHeight, doneOn: d.bottom > 0 && d.top < innerHeight, waUnderDone: a.top >= d.bottom - 0.5 }; });
    t.check('Finish session ✓ closes Guided and lands on the ready finish card, with the WhatsApp row under Done', r.closed && r.ready && r.visible && r.onScreen && r.waUnderDone, JSON.stringify(r));
    await done(p, 'via guided');
    const f = await p.evaluate(() => ({ done: !!localStorage.getItem(ATHLETE_ID + '_completed_d1'), shown: document.getElementById('complete-1').classList.contains('visible'), exp: document.querySelector('#complete-1 .rate-fold').getAttribute('aria-expanded'), line: document.querySelector('#complete-1 .rf-line').textContent }));
    t.check('…rate, Done: the finished card with the fold closed', f.done && f.shown && f.exp === 'false' && f.line === '7 of 10 · Note: "via guided"', JSON.stringify(f));
    t.check('no page errors (Guided flow)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {   // Guided with sets left over: its Finish Session lands on the card in progress, and the bar then offers Stop here under ⋯
    const { ctx, p } = await openDay(browser);
    await clock(p); await tickOne(p);
    await p.evaluate(() => { openGuided('1'); }); await p.waitForTimeout(400);
    await p.evaluate(() => { stepFinish(); }); await p.waitForTimeout(900);
    const r = await p.evaluate(() => ({ closed: !STEP, partial: document.getElementById('confirm-1').classList.contains('partial'), btnHidden: document.querySelector('#timer-1 .session-timer-finish').hidden }));
    t.check('Guided closed with sets left: the card is in progress and the bar offers Stop here', r.closed && r.partial && !r.btnHidden, JSON.stringify(r));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
