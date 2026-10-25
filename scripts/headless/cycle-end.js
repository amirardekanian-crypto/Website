// When the cycle is over (PROG-02): the day after the current cycle's endDate, Home says Cycle complete,
// shows the next cycle under Up next, asks "Ready for Cycle N?" (the last cycle asks "What comes next?" and names no cycle) and folds
// the day cards under Repeat a session; Progress marks the cycle Done. Since 2026-10-12 the Cycle complete / Roadmap complete CARD (and its
// wins) is on Progress, and Home says the cycle ended with one door row, Cycle N complete (.bt-done). Since 2026-10-13 Progress's cycles are one road
// of rows (.road-row.is-done / is-now / is-next / is-locked), not a meter and pills, and Home's Up next is the same row. Serve the repo first
// (python3 -m http.server 8765 --bind 127.0.0.1, see lib.js), then: node scripts/headless/cycle-end.js [--out <dir>]
'use strict';
const path = require('path');
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');   // the LOCAL calendar day: that is what a cycle date is
// The fixture with the current cycle (idx) ending `endedAgo` days ago (negative: still running), five weeks a cycle.
function prog(endedAgo, idx = 1) {
  const P = H.fixture();
  P.currentCycleIndex = idx;
  const start = Date.now() - (34 + endedAgo) * DAY;
  P.cycles.forEach((c, i) => { const s = start + (i - idx) * 35 * DAY; c.startDate = ymd(new Date(s)); c.endDate = ymd(new Date(s + 34 * DAY)); });
  return P;
}
// One squat session in the cycle's first week and one in its last, 5 kg heavier: a win, and 2 sessions done.
function hist(endedAgo) {
  const start = Date.now() - (34 + endedAgo) * DAY;
  const sq = (w, on) => ({ completed_on: ymd(new Date(start + on * DAY)), day: '1', readiness: 4, log: [
    { ex: 'Barbell Back Squat', block: 'Strength', reps: 6, note: '', sets: [1, 2, 3].map(() => ({ w: String(w), n: 6, r: '7', d: true })) }] });
  return [sq(70, 1), sq(75, 29)];
}
// The Game Plan's road (on Progress): each cycle's state, in order (done · now · next · locked), and the mono line of the current cycle's row
// (it says NOW while the cycle runs, DONE once it is over).
const plan = p => p.evaluate(() => {
  goTo('plan');
  const rows = [...document.querySelectorAll('#road-wrap .road-row')];
  const out = { states: rows.map(r => ['done', 'now', 'next', 'locked'].find(k => r.classList.contains('is-' + k)) || '-').join(' '),
    now: (document.querySelector('#road-wrap .road-row.is-now .road-ln') || {}).textContent || null,
    tag: (document.querySelector('#road-wrap .road-row.is-now .road-tag') || {}).textContent || null,
    open: rows.map(r => r.classList.contains('is-open') ? 'open' : 'shut').join(' ') };
  goTo('home');
  return out;
});
const state = p => p.evaluate(() => ({
  fin: (document.querySelector('#screen-plan .cyc-fin-h') || {}).textContent || null,
  sub: (document.querySelector('#screen-plan .cyc-fin-s') || {}).textContent || null,
  wins: document.querySelectorAll('#screen-plan .cyc-card .cyc-win').length,
  cardOnHome: !!document.querySelector('#screen-home .cyc-card, #screen-home .home-cyc'),
  bt: (document.querySelector('#home-week-wrap .bt-done .hrow-l') || {}).textContent || null,
  btSub: (document.querySelector('#home-week-wrap .bt-done .hrow-q') || {}).textContent || null,
  upnext: !!document.querySelector('.bt-next .road-row.is-next'),
  building: /building it/i.test(document.getElementById('screen-home').innerText),
  home: document.getElementById('screen-home').innerText,
  door: (document.querySelector('.bt-wa b') || {}).textContent || null,
  folded: document.getElementById('day-cards-wrap').classList.contains('bt-folded'),
  rep: !!document.getElementById('bt-rep'),
  weekSum: !!document.getElementById('home-week-sum'),
  suggested: document.querySelectorAll('.day-ov-card.suggested').length,
  sideways: document.documentElement.scrollWidth - window.innerWidth,
}));

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const shot = (p, name) => p.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });

  // Still running, and on the end date itself: the This cycle card and This Week, as before.
  for (const [ago, tag] of [[-4, 'week 5'], [0, 'the end date']]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(ago), hist: hist(ago) });
    const s = await state(p);
    t.check(`${tag}: This Week, nothing between cycles (no Cycle complete card on Progress, no row on Home)`, !s.fin && !s.bt && !s.upnext && !s.rep && s.weekSum && !s.folded, JSON.stringify(s));
    t.check(`${tag}: the This cycle card is on Progress and not on Home`, !s.cardOnHome && await p.evaluate(() => !!document.querySelector('#screen-plan .cyc-card .cyc-k')), JSON.stringify(s));
    const g = await plan(p);
    // The pill is the state word now, and the mono line keeps only the weeks (2026-10-19, The Long Rally audit: the row said NOW twice).
    t.check(`${tag}: Game Plan's road says Now on cycle 2 ONCE, in the pill (cycle 1 done, cycle 3 up next), open`,
      g.states === 'done now next' && /WEEKS/i.test((g.now || '').trim()) && !/NOW/i.test((g.now || '').trim()) && g.tag === 'Now' && g.open === 'shut open shut', JSON.stringify(g));
    await ctx.close();
  }

  // Four days past the end: Cycle complete, Up next, Ready for Cycle 3?, the day cards folded, Game Plan says Done.
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(4), hist: hist(4) });
    let s = await state(p);
    t.check('4 days past: Progress says Cycle complete and Finished once (the 5 weeks are on the Week row, not counted twice)', s.fin === 'Cycle complete' && /^Finished \d{1,2} [A-Za-z]{3}$/i.test(s.sub), JSON.stringify(s));
    t.check('4 days past: Home has the one door row, Cycle 2 complete, and no card', s.bt === 'Cycle 2 complete' && /^Finished \d{1,2} [A-Z][a-z]{2} · see it on Progress$/.test(s.btSub || '') && !s.cardOnHome, JSON.stringify(s));
    const door = await p.evaluate(() => { document.querySelector('#home-week-wrap .bt-done').click(); return document.querySelector('.screen.active').id; });
    t.check('4 days past: the door row opens Progress', door === 'screen-plan', door);
    await p.evaluate(() => goTo('home'));
    t.check('4 days past: the cycle\'s win is still on the card (on Progress)', s.wins === 1, s.wins);
    t.check('4 days past: Up next and Ready for Cycle 3?, nothing about Amir building it', s.upnext && !s.building && s.door === 'Ready for Cycle 3?', JSON.stringify(s));
    const g = await plan(p);
    t.check('4 days past: Game Plan says Done on cycle 2, the road has no Now row and cycle 3 is up next', g.states === 'done done next' && g.now === null && g.tag === null, JSON.stringify(g));
    t.check('4 days past: no week count, the day cards folded, nothing suggested', !s.weekSum && s.folded && s.suggested === 0, JSON.stringify(s));
    await shot(p, 'cycle-end-4days');
    await p.evaluate(() => document.getElementById('bt-rep').click());
    s = await state(p);
    t.check('Repeat a session unfolds the day cards', !s.folded && (await p.evaluate(() => document.getElementById('bt-rep').getAttribute('aria-expanded'))) === 'true', JSON.stringify(s));
    await p.evaluate(() => document.getElementById('bt-rep').click());
    t.check('a second tap folds them again', (await state(p)).folded);
    // Home's Up next is the road's own row, closed: its head folds it open in place.
    const shut = await p.evaluate(() => { const r = document.querySelector('.bt-next .road-row.is-next'); return { open: r.classList.contains('is-open'), exp: r.querySelector('.road-head').getAttribute('aria-expanded') }; });
    await p.evaluate(() => document.querySelector('.bt-next .road-row.is-next .road-head').click());
    const read = await p.evaluate(() => { const r = document.querySelector('.bt-next .road-row.is-next'); return { open: r.classList.contains('is-open'), exp: r.querySelector('.road-head').getAttribute('aria-expanded'),
      home: document.getElementById('screen-home').classList.contains('active') }; });
    t.check('Up next starts closed, and its row opens the next cycle in place, without leaving Home', !shut.open && shut.exp === 'false' && read.open && read.exp === 'true' && read.home, JSON.stringify([shut, read]));
    await p.evaluate(() => { startTimerNow('1'); paintWeek(); });
    s = await state(p);
    t.check('a session under way is never folded away (its card carries Resume)', !s.folded, JSON.stringify(s));
    t.check('4 days past: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // Forty days past: the same ask, nothing about Amir building it.
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(40), hist: hist(40) });
    const s = await state(p);
    t.check('40 days past: the same, Ready for Cycle 3?', s.fin === 'Cycle complete' && !s.building && s.door === 'Ready for Cycle 3?', JSON.stringify(s));
    await ctx.close();
  }

  // The roadmap's last cycle: Roadmap complete and an ask that names no Cycle 4. Then dark, and a 320 px phone.
  for (const [w, dark, name] of [[390, false, 'cycle-end-last'], [390, true, 'cycle-end-last-dark'], [320, false, 'cycle-end-last-320']]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(4, 2), hist: hist(4), w, dark });
    const s = await state(p);
    t.check(`last cycle ${w}${dark ? ' dark' : ''}: Roadmap complete (Progress, and the row on Home), 3 cycles · 15 weeks, no Cycle 4 named`,
      s.fin === 'Roadmap complete' && s.bt === 'Roadmap complete' && /3 cycles · 15 weeks/.test(s.sub) && !s.upnext && !s.building && s.door === 'What comes next?' && s.folded && /last cycle of your plan/.test(s.home) && !/Cycle 4/.test(s.home), JSON.stringify(s));
    const g = await plan(p);
    t.check(`last cycle ${w}${dark ? ' dark' : ''}: the road is done all the way, no Now row and nothing up next`, g.states === 'done done done' && g.now === null, JSON.stringify(g));
    t.check(`last cycle ${w}${dark ? ' dark' : ''}: no sideways scroll, no page errors`, s.sideways <= 0 && p.errs.length === 0, p.errs.join(' | '));
    await shot(p, name);
    await ctx.close();
  }

  // Published a day early (2026-10-11, Pooya): the new cycle starts tomorrow and the OLD cycle's last session, on the
  // same day number, sits in this Monday–Sunday. It must not tick the new cycle's day; a cycle that has started still counts.
  {
    const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    // ymd() already reads the LOCAL day. (It used to shift by the zone's offset first, which made "this Monday" read as the next day when run on a Monday between 23:00 and midnight in BST: the check failed for that hour.)
    const old = [{ completed_on: ymd(monday), day: '1', readiness: 4, log: [
      { ex: 'Barbell Back Squat', block: 'Strength', reps: 6, note: '', sets: [{ w: '70', n: 6, r: '7', d: true }] }] }];
    const startsIn = (n, idx = 1) => {
      const P = H.fixture(); P.currentCycleIndex = idx;
      const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() + n);
      const e = new Date(s); e.setDate(e.getDate() + 34);
      const loc = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      P.cycles[idx].startDate = loc(s); P.cycles[idx].endDate = loc(e);
      return P;
    };
    const done = p => p.evaluate(() => ({ days: [...weekDoneDays()], win: weekWindow() }));
    const early = await H.openProgram(browser, { prog: startsIn(1), hist: old });
    let d = await done(early.p);
    t.check('starts tomorrow: last cycle\'s Day 1 from this week does not tick the new Day 1', d.days.length === 0, JSON.stringify(d));
    t.check('starts tomorrow: the window is the new cycle\'s first week', d.win.from > ymd(new Date()) || d.win.from === ymd(new Date(Date.now() + 86400000)), JSON.stringify(d));
    t.check('starts tomorrow: no page errors', early.p.errs.length === 0, early.p.errs.join(' | '));
    await early.ctx.close();
    // The control: the same session inside a cycle that has started (it began on the Monday) still counts.
    const live = await H.openProgram(browser, { prog: startsIn(-((new Date().getDay() + 6) % 7)), hist: old });
    d = await done(live.p);
    t.check('started this week: a session since the start still ticks its day', d.days.join() === '1', JSON.stringify(d));
    await live.ctx.close();
  }

  // A cycle with no dates cannot end: no card on Progress and no small line anywhere (the old .home-cyc is gone), the week, the day cards.
  {
    const { ctx, p } = await H.openProgram(browser, { prog: H.fixture({ dated: false }) });
    const s = await state(p);
    t.check('no dates: nothing between cycles, no card and no small cycle line', !s.fin && !s.bt && !s.rep && s.weekSum && !s.folded && !(await p.$('.cyc-card')) && !(await p.$('.home-cyc')), JSON.stringify(s));
    t.check('no dates: the This cycle slot on Progress is empty', await p.evaluate(() => document.getElementById('cycle-card-wrap').innerHTML.trim() === ''));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
