// The Week Line on Your weeks (#134 + #135, round 13 'The Whole Week', stage127, 2026-11-24): node scripts/headless/week-line.js
//
// get_five_weeks() (here the stub's `fiveWeeks`) carries each week's Move minutes as `move` and the line, the mark and the athlete's
// Steps number as the top-level `move`. The phone only draws them (the arithmetic is the server's move_week()). Checked: the line under
// the grid with the week's total and the line, one bar segment per source, the legend, "+150 XP" once paid, the steps line, the counting
// sheet, nothing drawn by a server without stage127, no sideways scroll at 320 px in dark mode, and How the XP works naming the new price.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.toISOString().slice(0, 10);
const at = n => ymd(new Date(Date.now() + n * DAY));

function weeks(o = {}) {
  const mvNow = o.mvNow === undefined ? { plan: 162, lib: 20, court: 75, other: 0, walk: 27, total: 284, steps: 6200, xp: 0 } : o.mvNow;
  const fw = {
    n: 2, from: at(-9), to: at(11), current: true,
    weeks: [
      { w: 1, from: at(-9), to: at(-3), plan: 3, done: 3, held: true, now: false, days: [
        { day: at(-9), k: 'plan', title: 'Legs', mins: 62 }, { day: at(-5), k: 'court', kind: 'padel', mins: 90, effort: 'normal', id: 'a1' } ],
        move: { plan: 160, lib: 0, court: 135, other: 0, walk: 15, total: 310, steps: 7000, xp: 150 } },
      { w: 2, from: at(-2), to: at(4), plan: 3, done: 1, held: false, now: true, days: [
        { day: at(-2), k: 'plan', title: 'Legs', mins: 60 } ], move: mvNow },
      { w: 3, from: at(5), to: at(11), plan: 3, done: 0, held: false, now: false, days: [],
        move: { plan: 0, lib: 0, court: 0, other: 0, walk: 0, total: 0, steps: null, xp: 0 } }
    ]
  };
  if (!o.noMeta) fw.move = { line: 300, mark: 150, xp: 150, from: '2026-11-24', number: 7500, global: 10000 };
  if (o.noMove) { delete fw.move; fw.weeks.forEach(w => delete w.move); }
  return fw;
}
async function open(browser, o = {}) {
  const { ctx, p } = await H.openProgram(browser, { w: o.w || 390, h: 844, tz: 'UTC', dark: !!o.dark, stub: { fiveWeeks: o.fw || weeks() }, seed: {} });
  await p.evaluate(() => goTo('plan'));
  await p.waitForTimeout(400);
  return { ctx, p };
}
const line = p => p.evaluate(() => {
  const m = document.querySelector('#fw-wrap .fw-mv');
  if (!m) return null;
  const t = s => String((m.querySelector(s) || {}).textContent || '').replace(/\s+/g, ' ').trim();
  return { head: t('.fw-mv-h'), segs: [...m.querySelectorAll('.fw-ms')].map(e => e.className.replace('fw-ms ', '')), keys: t('.fw-mv-k'), steps: t('.fw-mv-s'),
    marks: m.querySelectorAll('.fw-mm').length, xp: t('.fw-mv-xp') };
});

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  // ── 1. this week at 284 of 300 ──
  {
    const { ctx, p } = await open(browser);
    const l = await line(p);
    C.check('the Week Line is under the grid', !!l, JSON.stringify(l));
    C.check('it says Move this week, 284 of 300', l && /Move this week/.test(l.head) && /284/.test(l.head) && /of 300/.test(l.head), l && l.head);
    C.check('one bar segment per source with minutes: plan, Library, court, walking', l && l.segs.join(',') === 'is-p,is-l,is-c,is-w', l && l.segs.join(','));
    C.check('the two marks (150 and 300) are drawn', l && l.marks === 2, l && l.marks);
    C.check('the legend names each source with its minutes', l && /Plan 162/.test(l.keys) && /Library 20/.test(l.keys) && /Court 75/.test(l.keys) && /Walking 27/.test(l.keys) && !/Other/.test(l.keys), l && l.keys);
    C.check('no XP shown below the line', l && !l.xp, l && l.xp);
    C.check('the steps line: 6,200 a day against your number 7,500', l && /Steps a day: 6,200/.test(l.steps) && /your number 7,500/.test(l.steps), l && l.steps);
    await p.evaluate(() => document.querySelector('#fw-wrap .fw-mv-bar').click());
    await p.waitForTimeout(250);
    const sheet = await p.evaluate(() => {
      const ov = document.getElementById('hist-overlay');
      return { open: ov.classList.contains('visible'), title: (ov.querySelector('.readiness-title') || {}).textContent || '',
        text: ov.textContent.replace(/\s+/g, ' '), rows: ov.querySelectorAll('.pl-row').length };
    });
    C.check('the bar opens the counting sheet, titled Move minutes', sheet.open && sheet.title === 'Move minutes', JSON.stringify(sheet).slice(0, 200));
    C.check('the sheet explains walking over 5,000, the 150 / 300 and that care counts 0', /over 5,000/.test(sheet.text) && /Care, mobility, recovery and breathing count 0/.test(sheet.text) && /150 is the health minimum/.test(sheet.text) && /300 is your line/.test(sheet.text), sheet.text.slice(0, 300));
    C.check('the sheet says a week at the line pays 150 XP from 24 November', /pays 150 XP/.test(sheet.text) && /24 November/.test(sheet.text), '');
    C.check('the sheet lists the three weeks, week 1 with +150 XP', sheet.rows === 3 && /310 \+150 XP/.test(sheet.text), sheet.rows);
    await ctx.close();
  }
  // ── 2. paid this week ──
  {
    const { ctx, p } = await open(browser, { fw: weeks({ mvNow: { plan: 200, lib: 0, court: 120, other: 0, walk: 0, total: 320, steps: null, xp: 150 } }) });
    const l = await line(p);
    C.check('a paid week shows +150 XP', l && l.xp === '+150 XP', l && l.xp);
    C.check('no steps typed: no steps line', l && !l.steps, l && l.steps);
    await ctx.close();
  }
  // ── 3. a server without stage127 ──
  {
    const { ctx, p } = await open(browser, { fw: weeks({ noMove: true }) });
    const l = await line(p);
    const grid = await p.evaluate(() => document.querySelectorAll('#fw-wrap .fw-wl').length);
    C.check('no move from the server: no Week Line, the grid as before', !l && grid === 3, JSON.stringify({ l, grid }));
    await ctx.close();
  }
  // ── 4. 320 px, dark ──
  {
    const { ctx, p } = await open(browser, { w: 320, dark: true });
    const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    C.check('no sideways scroll at 320 px in dark mode', !over, over);
    await ctx.close();
  }
  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
