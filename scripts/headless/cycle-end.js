// When the cycle is over (PROG-02): the day after the current cycle's endDate, Home says Cycle complete,
// shows the next cycle under Up next and folds the day cards under Repeat a session. Serve the repo first
// (python3 -m http.server 8765 --bind 127.0.0.1, see lib.js), then: node scripts/headless/cycle-end.js [--out <dir>]
'use strict';
const path = require('path');
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.toISOString().slice(0, 10);
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
const state = p => p.evaluate(() => ({
  fin: (document.querySelector('.cyc-fin-h') || {}).textContent || null,
  sub: (document.querySelector('.cyc-fin-s') || {}).textContent || null,
  wins: document.querySelectorAll('.cyc-card .cyc-win').length,
  upnext: !!document.querySelector('.bt-next .current-message'),
  status: !!document.querySelector('.bt-status'),
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
    t.check(`${tag}: the running card and This Week, nothing between cycles`, !s.fin && !s.upnext && !s.rep && s.weekSum && !s.folded, JSON.stringify(s));
    await ctx.close();
  }

  // Four days past the end: Cycle complete, Up next, "building it now", the day cards folded.
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(4), hist: hist(4) });
    let s = await state(p);
    t.check('4 days past: Cycle complete, with the full 5 weeks', s.fin === 'Cycle complete' && /5 of 5 weeks/.test(s.sub), JSON.stringify(s));
    t.check('4 days past: the cycle\'s win is still on the card', s.wins === 1, s.wins);
    t.check('4 days past: Up next, "Amir is building it now", the how-it-went door', s.upnext && s.status && /how Cycle 2 went/.test(s.door), JSON.stringify(s));
    t.check('4 days past: no week count, the day cards folded, nothing suggested', !s.weekSum && s.folded && s.suggested === 0, JSON.stringify(s));
    await shot(p, 'cycle-end-4days');
    await p.evaluate(() => document.getElementById('bt-rep').click());
    s = await state(p);
    t.check('Repeat a session unfolds the day cards', !s.folded && (await p.evaluate(() => document.getElementById('bt-rep').getAttribute('aria-expanded'))) === 'true', JSON.stringify(s));
    await p.evaluate(() => document.getElementById('bt-rep').click());
    t.check('a second tap folds them again', (await state(p)).folded);
    await p.evaluate(() => document.querySelector('.bt-next .cm-toggle').click());
    const read = await p.evaluate(() => ({ open: document.querySelector('.bt-next .current-message').classList.contains('is-open'), home: document.getElementById('screen-home').classList.contains('active') }));
    t.check('Read more opens the next cycle in place, without leaving Home', read.open && read.home, JSON.stringify(read));
    await p.evaluate(() => { startTimerNow('1'); paintWeek(); });
    s = await state(p);
    t.check('a session under way is never folded away (its card carries Resume)', !s.folded, JSON.stringify(s));
    t.check('4 days past: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // Forty days past: no "building it now"; the door asks whether they are ready for the next cycle.
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(40), hist: hist(40) });
    const s = await state(p);
    t.check('40 days past: no "building it now", the door says Ready for Cycle 3?', s.fin === 'Cycle complete' && !s.status && s.door === 'Ready for Cycle 3?', JSON.stringify(s));
    await ctx.close();
  }

  // The roadmap's last cycle: Roadmap complete and Plan my next block. Then dark, and a 320 px phone.
  for (const [w, dark, name] of [[390, false, 'cycle-end-last'], [390, true, 'cycle-end-last-dark'], [320, false, 'cycle-end-last-320']]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(4, 2), hist: hist(4), w, dark });
    const s = await state(p);
    t.check(`last cycle ${w}${dark ? ' dark' : ''}: Roadmap complete, 3 cycles · 15 weeks, Plan my next block`,
      s.fin === 'Roadmap complete' && /3 cycles · 15 weeks/.test(s.sub) && !s.upnext && s.door === 'Plan my next block' && s.folded, JSON.stringify(s));
    t.check(`last cycle ${w}${dark ? ' dark' : ''}: no sideways scroll, no page errors`, s.sideways <= 0 && p.errs.length === 0, p.errs.join(' | '));
    await shot(p, name);
    await ctx.close();
  }

  // A cycle with no dates cannot end: the small line, the week, the day cards.
  {
    const { ctx, p } = await H.openProgram(browser, { prog: H.fixture({ dated: false }) });
    const s = await state(p);
    t.check('no dates: nothing between cycles', !s.fin && !s.rep && s.weekSum && !s.folded && !!(await p.$('.home-cyc')), JSON.stringify(s));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
