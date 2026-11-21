// Your weeks on Progress (#122 Five Weeks, round 11, 2026-11-21): node scripts/headless/five-weeks.js
//
// The card reads get_five_weeks() (stage115; here the stub's `fiveWeeks`) and draws the cycle's weeks as rows, a square per day: a plan
// session (.is-p), a Library session (.is-l), both (.is-pl), a day to come (.is-fut), today ringed (.is-now). Checked on a made-up cycle:
// the squares, the counts in the foot, a day's sheet, the copy on the phone and never synced, no card with nothing done, no card from a
// server without stage115, the copy shown offline, nothing called in the demo, and no sideways scroll at 320 px in dark mode.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.toISOString().slice(0, 10);
const at = n => ymd(new Date(Date.now() + n * DAY));   // n days from today (UTC; the pages here run in UTC)

// A cycle that began 9 days ago: week 1 is days -9..-3, week 2 (now) -2..4, week 3 5..11.
function weeks() {
  return {
    n: 2, from: at(-9), to: at(11), current: true,
    weeks: [
      { w: 1, from: at(-9), to: at(-3), plan: 3, done: 3, held: true, now: false, days: [
        { day: at(-9), k: 'plan', title: 'Sit Back, Drive Tall', mins: 62 },
        { day: at(-7), k: 'plan', title: 'Upper Push', mins: 55 },
        { day: at(-7), k: 'library', title: 'First Light', mins: 14, shelf: 'care' },
        { day: at(-5), k: 'plan', title: 'Legs', mins: 70 },
        { day: at(-4), k: 'library', title: 'First Light', mins: 14, shelf: 'care' } ] },
      { w: 2, from: at(-2), to: at(4), plan: 3, done: 1, held: false, now: true, days: [
        { day: at(-2), k: 'plan', title: 'Sit Back, Drive Tall', mins: 60 },
        { day: at(-1), k: 'plan', title: 'Sit Back, Drive Tall', mins: 58, extra: true },
        { day: at(0), k: 'library', title: 'First Light', mins: 14, shelf: 'care' } ] },
      { w: 3, from: at(5), to: at(11), plan: 3, done: 0, held: false, now: false, days: [] }
    ]
  };
}
async function open(browser, o = {}) {
  const stub = Object.assign({}, o.fiveWeeks === null ? {} : { fiveWeeks: o.fiveWeeks || weeks() }, o.stub || {});
  const { ctx, p } = await H.openProgram(browser, Object.assign({ w: o.w || 390, h: 844, tz: 'UTC', dark: !!o.dark, stub, seed: o.seed || {} }, o.opts || {}));
  await p.evaluate(() => goTo('plan'));
  await p.waitForTimeout(400);
  return { ctx, p };
}
const card = p => p.evaluate(() => {
  const t = document.getElementById('fw-title'), w = document.getElementById('fw-wrap');
  const q = s => w ? w.querySelectorAll(s).length : 0;
  return { shown: !!t && !t.hidden && !!w.innerHTML.trim(), p: q('.fw-c.is-p'), l: q('.fw-c.is-l'), pl: q('.fw-c.is-pl'), fut: q('.fw-c.is-fut'),
    now: q('.fw-c.is-now'), btn: q('button.fw-c'), rows: q('.fw-wl'), foot: w ? String((w.querySelector('.fw-f') || {}).textContent || '').replace(/\s+/g, ' ').trim() : '',
    head: w ? String((w.querySelector('.fw-h') || {}).textContent || '').replace(/\s+/g, ' ').trim() : '', title: t ? t.textContent : '' };
});
const calls = (p, n) => p.evaluate(n => (window.__STUB.calls || []).filter(c => c === 'rpc:' + n).length, n);

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  // ── 1. a cycle with plan and Library sessions ──
  {
    const { ctx, p } = await open(browser);
    const c = await card(p);
    C.check('the card is on Progress, titled Your weeks', c.shown && c.title === 'Your weeks', JSON.stringify(c));
    C.check('three rows, one per week of the cycle', c.rows === 3, c.rows);
    C.check('plan days green: -9, -5, -2 and -1 (the split day -7 is counted apart)', c.p === 4, c.p);
    C.check('Library days mint: -4 and today', c.l === 2, c.l);
    C.check('a day with both is split: -7', c.pl === 1, c.pl);
    C.check('days to come are outlines (4 left in week 2, 7 in week 3)', c.fut === 11, c.fut);
    C.check('today is ringed, once', c.now === 1, c.now);
    C.check('every day with something in it is a button (7 days)', c.btn === 7, c.btn);
    C.check('the foot counts 5 plan sessions, 3 Library sessions and the minutes', /5 plan sessions/.test(c.foot) && /3 Library sessions/.test(c.foot) && /5h 47m trained/.test(c.foot), c.foot);
    C.check('the head names the cycle and its weeks', /Cycle 2/.test(c.head) && /3 weeks/.test(c.head), c.head);
    const order = await p.evaluate(() => {
      const ids = ['cycle-card-wrap', 'fw-title', 'numbers-title'].map(id => document.getElementById(id));
      return ids.every(Boolean) && (ids[0].compareDocumentPosition(ids[1]) & 4) && (ids[1].compareDocumentPosition(ids[2]) & 4) ? 'ok' : 'wrong';
    });
    C.check('it sits under the This cycle cover and above Your numbers', order === 'ok', order);
    await p.evaluate(() => document.querySelector('#fw-wrap .fw-c.is-pl').click());
    await p.waitForTimeout(250);
    const sheet = await p.evaluate(() => {
      const ov = document.getElementById('hist-overlay');
      return { open: ov.classList.contains('visible'), text: String(ov.textContent || '').replace(/\s+/g, ' ') , rows: ov.querySelectorAll('.pl-row').length };
    });
    C.check('a tap on the split day opens its sheet with both sessions', sheet.open && sheet.rows === 2 && /Upper Push/.test(sheet.text) && /First Light/.test(sheet.text), sheet.text.slice(0, 200));
    C.check('the Library row names its shelf and minutes', /Care · Library · 14 min/.test(sheet.text), sheet.text.slice(0, 200));
    await p.evaluate(() => document.getElementById('hist-overlay').classList.remove('visible'));
    // the extra session says Extra
    const extra = await p.evaluate(d => { openFiveWeeksDay(d); return document.getElementById('hist-overlay').querySelectorAll('.pl-xt').length; }, at(-1));
    C.check('a plan day done again says Extra', extra === 1, extra);
    const saved = JSON.parse(await p.evaluate(() => localStorage.getItem('rel01_athlete_fwcache')) || 'null');
    C.check('the answer is kept on the phone (<id>_fwcache)', saved && Array.isArray(saved.weeks) && saved.weeks.length === 3);
    const synced = await p.evaluate(() => Object.keys(_snapshot()).filter(k => /fwcache/.test(k)));
    C.check('and never synced with the progress', synced.length === 0, synced.join(','));
    C.check('read as the athlete, with their own id', await p.evaluate(() => (window.__STUB.params || []).some(x => x[0] === 'get_five_weeks' && x[1] && x[1].p_athlete_id === ATHLETE_ID)));
    C.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. nothing done yet this cycle: no card ──
  {
    const empty = weeks(); empty.weeks.forEach(w => { w.days = []; w.done = 0; w.held = false; });
    const { ctx, p } = await open(browser, { fiveWeeks: empty });
    const c = await card(p);
    C.check('nothing done yet: no card', !c.shown, JSON.stringify(c));
    await ctx.close();
  }

  // ── 3. a server without stage115: no card, no error ──
  {
    const { ctx, p } = await open(browser, { fiveWeeks: null });
    const c = await card(p);
    C.check('without stage115: no card', !c.shown, JSON.stringify(c));
    C.check('without stage115: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 4. no answer yet (a slow line): the copy on the phone ──
  {
    const { ctx, p } = await open(browser, { stub: { stall: { get_five_weeks: true } }, seed: { _fwcache: weeks() } });
    const c = await card(p);
    C.check('no answer yet: the copy on the phone draws the card', c.shown && c.rows === 3, JSON.stringify(c));
    await ctx.close();
  }

  // ── 5. the demo calls nothing ──
  {
    const { ctx, p } = await open(browser, { opts: { query: '?client=demo' } });
    C.check('the demo never asks for Your weeks', await calls(p, 'get_five_weeks') === 0);
    await ctx.close();
  }

  // ── 6. 320 px, dark mode: nothing wider than the screen ──
  {
    const { ctx, p } = await open(browser, { w: 320, dark: true });
    const r = await p.evaluate(() => {
      const w = document.querySelector('#fw-wrap .fw-card'), b = w && w.getBoundingClientRect();
      const cells = [...document.querySelectorAll('#fw-wrap .fw-c')].map(e => e.getBoundingClientRect().width);
      return { right: b ? b.right : 0, vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, min: Math.min(...cells) };
    });
    C.check('320 px: the card fits and the page does not scroll sideways', r.right <= r.vw && r.sw <= r.vw, JSON.stringify(r));
    C.check('320 px: a day square is still at least 24 px', r.min >= 24, r.min);
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
