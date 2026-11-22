// Your weeks on Progress (#122 Five Weeks, round 11, 2026-11-21): node scripts/headless/five-weeks.js
//
// The card reads get_five_weeks() (stage115; here the stub's `fiveWeeks`) and draws the cycle's weeks as rows, a square per day: a plan
// session (.is-p), a Library session (.is-l), both (.is-pl), a day to come (.is-fut), today ringed (.is-now). Checked on a made-up cycle:
// the squares, the counts in the foot, a day's sheet, the copy on the phone and never synced, no card with nothing done, no card from a
// server without stage115, the copy shown offline, nothing called in the demo, no sideways scroll at 320 px in dark mode, and Court Log (#123,
// stage116): the sheet, a save, the split squares, the foot, the checks on the phone and the server's, Delete in two taps.
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
    const held = await p.evaluate(() => [...document.querySelectorAll('#fw-wrap .fw-wl')].map(e => ({ held: e.classList.contains('is-held'), say: e.getAttribute('aria-label') || '', text: e.textContent.trim() })));
    C.check('a held week (W1) is the green tick circle, said as "Week 1, held"; the others keep W2, W3', held.length === 3 && held[0].held && held[0].say === 'Week 1, held'
      && !held[1].held && held[1].text === 'W2' && !held[2].held, JSON.stringify(held));
    C.check('the foot says 1 week held, first', /^1 week held/.test(c.foot), c.foot);
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

  // ── 2. nothing done yet this cycle: the card stays (Court Log, 2026-11-21), its grid empty, a line that says why, and Add activity ──
  {
    const empty = weeks(); empty.weeks.forEach(w => { w.days = []; w.done = 0; w.held = false; });
    const { ctx, p } = await open(browser, { fiveWeeks: empty });
    const c = await card(p);
    const tip = await p.evaluate(() => ({ tip: (document.querySelector('#fw-wrap .fw-tip') || {}).textContent || '', add: !!document.querySelector('#fw-wrap .fw-add'), foot: !!document.querySelector('#fw-wrap .fw-f') }));
    C.check('nothing done yet: the card, with no coloured day and no foot', c.shown && c.p + c.l + c.pl === 0 && !tip.foot, JSON.stringify(c));
    C.check('nothing done yet: it says what fills it and offers Add activity', /Add your tennis, padel/.test(tip.tip) && tip.add, JSON.stringify(tip));
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

  // ── 7. Court Log (#123, stage116): add tennis yesterday, a run today; the squares, the foot, a retry, Delete in two taps ──
  {
    const { ctx, p } = await open(browser);
    await p.evaluate(() => document.querySelector('#fw-wrap .fw-add').click());
    await p.waitForTimeout(200);
    const sheet = await p.evaluate(() => {
      const ov = document.getElementById('hist-overlay');
      return { open: ov.classList.contains('visible'), title: (ov.querySelector('.readiness-title') || {}).textContent, kinds: [...ov.querySelectorAll('.act-row')][0].querySelectorAll('.pl-chip').length,
        days: [...ov.querySelectorAll('.act-row')][1].querySelectorAll('.pl-chip').length, picked: [...ov.querySelectorAll('.pl-chip[aria-pressed="true"]')].map(b => b.textContent) };
    });
    C.check('Add activity opens its sheet: 13 kinds (stage121), four days, tennis today 60 normal picked', sheet.open && sheet.title === 'Add activity' && sheet.kinds === 13 && sheet.days === 4
      && JSON.stringify(sheet.picked) === JSON.stringify(['Tennis', 'Today', '60', 'Normal']), JSON.stringify(sheet));
    // tennis, yesterday, 90, hard
    await p.evaluate(() => { actPick('day', [...document.querySelectorAll('#hist-overlay .act-row')][1].querySelectorAll('.pl-chip')[1].getAttribute('onclick').match(/'(\d{4}-\d{2}-\d{2})'/)[1]); actPick('mins', 90); actPick('effort', 'hard'); });
    await p.evaluate(() => saveActivity());
    await p.waitForTimeout(400);
    let c = await card(p);
    const sent = await p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'log_activity').map(x => x[1]));
    C.check('saved once, as the athlete: tennis, yesterday, 90 min, hard, with a draft key', sent.length === 1 && sent[0].p_athlete_id === H.ID && sent[0].p_kind === 'tennis'
      && sent[0].p_day === at(-1) && sent[0].p_minutes === 90 && sent[0].p_effort === 'hard' && /^[0-9a-f-]{36}$/.test(sent[0].p_id), JSON.stringify(sent));
    C.check('the sheet closes after a save', await p.evaluate(() => !document.getElementById('hist-overlay').classList.contains('visible')));
    C.check('yesterday (a plan day) is now split plan / court', await p.evaluate(d => { const b = [...document.querySelectorAll('#fw-wrap button.fw-c')].find(x => x.getAttribute('onclick').includes(d)); return !!b && b.classList.contains('is-mix') && b.classList.contains('fa-p') && b.classList.contains('fb-c'); }, at(-1)));
    C.check('the foot adds 1h 30m on court', /1h 30m on court/.test(c.foot), c.foot);
    // a run today: today already has a Library session, so library / other
    await p.evaluate(() => { openActivitySheet(); actPick('kind', 'run'); actPick('mins', 30); actPick('effort', 'easy'); });
    await p.evaluate(() => saveActivity());
    await p.waitForTimeout(400);
    c = await card(p);
    C.check('today is split Library / other after a run', await p.evaluate(d => { const b = [...document.querySelectorAll('#fw-wrap button.fw-c')].find(x => x.getAttribute('onclick').includes(d)); return !!b && b.classList.contains('fa-l') && b.classList.contains('fb-o'); }, at(0)));
    C.check('the foot adds 30m other', /30m other/.test(c.foot), c.foot);
    // a bad number never leaves the phone
    await p.evaluate(() => { openActivitySheet(); _act.mins = 2; });
    await p.evaluate(() => saveActivity());
    const bad = await p.evaluate(() => ({ err: (document.querySelector('#hist-overlay .act-err') || {}).textContent, n: (window.__STUB.params || []).filter(x => x[0] === 'log_activity').length }));
    C.check('2 minutes is refused on the phone, with the reason', /5 to 600/.test(bad.err) && bad.n === 2, JSON.stringify(bad));
    // the server says the day is full
    await p.evaluate(() => { window.__STUB.actErr = 'activity:full'; _act.mins = 45; });
    await p.evaluate(() => saveActivity());
    await p.waitForTimeout(300);
    const full = await p.evaluate(() => ({ err: (document.querySelector('#hist-overlay .act-err') || {}).textContent, open: document.getElementById('hist-overlay').classList.contains('visible'), btn: (document.querySelector('#hist-overlay .act-go') || {}).disabled }));
    C.check('a full day is said in plain words, the sheet stays and Save works again', /already has 8/.test(full.err) && full.open && full.btn === false, JSON.stringify(full));
    await p.evaluate(() => { window.__STUB.actErr = null; document.getElementById('hist-overlay').classList.remove('visible'); });
    // Delete: two taps
    await p.evaluate(d => openFiveWeeksDay(d), at(-1));
    const del = await p.evaluate(async () => {
      const b = document.querySelector('#hist-overlay .act-del');
      b.click(); const armed = b.textContent;
      const n1 = (window.__STUB.params || []).filter(x => x[0] === 'delete_activity').length;
      b.click(); await new Promise(r => setTimeout(r, 400));
      return { armed, n1, n2: (window.__STUB.params || []).filter(x => x[0] === 'delete_activity').length, left: document.querySelectorAll('#hist-overlay .act-del').length };
    });
    C.check('Delete takes two taps, then the activity goes', del.armed === 'Tap again to delete' && del.n1 === 0 && del.n2 === 1 && del.left === 0, JSON.stringify(del));
    c = await card(p);
    C.check('and the court time leaves the foot', !/on court/.test(c.foot), c.foot);
    C.check('Court Log: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 8. outside a cycle (stage122): the last 5 weeks, no "Cycle N", and Steps worked from `acts`, not the weeks ──
  // An activity today that sits in no week of the answer (the old fault: a cycle starting next week) still counts toward Steps.
  {
    const fw = { n: null, from: at(-34), to: at(0), current: false,
      weeks: [1, 2, 3, 4, 5].map(k => ({ w: k, from: at(-34 + (k - 1) * 7), to: at(-28 + (k - 1) * 7), plan: 0, done: 0, held: false, now: k === 5, days: [] })),
      acts: [{ day: at(0), kind: 'tennis', mins: 60, effort: 'normal', id: 'a-today' }] };
    fw.weeks[4].to = at(-1);   // today in no week, on purpose
    const { ctx, p } = await open(browser, { fiveWeeks: fw });
    const c = await card(p);
    C.check('outside a cycle: five rows and no "Cycle N" in the head', c.shown && c.rows === 5 && !/Cycle/.test(c.head) && /5 weeks/.test(c.head), JSON.stringify(c));
    const mv = await p.evaluate(d => ({ credit: moveCreditOn(d), last: actLast() }), at(0));
    C.check('outside a cycle: 60 min of tennis today counts toward Steps from acts (7,000, the 70% cap)', !!mv.credit && mv.credit.steps === 7000, JSON.stringify(mv));
    C.check('outside a cycle: Played today? finds the last activity in acts', !!mv.last && mv.last.id === 'a-today', JSON.stringify(mv.last));
    const old = await p.evaluate(d => { const keep = FW; FW = JSON.parse(JSON.stringify(keep)); delete FW.acts; const r = moveCreditOn(d); FW = keep; return r; }, at(0));
    C.check('a copy from before stage122 (no acts) still reads the weeks, and gives nothing for a day outside them', old === null, JSON.stringify(old));
    C.check('outside a cycle: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
