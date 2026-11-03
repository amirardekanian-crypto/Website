// The ticks a phone remembers (2026-11-03). Ehsan's Day 1 read "17 of 16 sets, warm-up left" with every set and both warm-ups
// done: saveState() kept the ticks by position over every [data-day] element, and Home's clock (.dc-clock), which is there only
// while the day is under way, comes first in that list. A save made before Home had its clock and an open after it moved every
// tick one place on, and the session clock took the first warm-up's tick and counted as a unit. The day could never be full.
//   1. Start the clock, tick the warm-ups and the first lift, the phone closes the app, it opens again: the same three are ticked,
//      nothing else is, and the count says what was done.
//   2. Tick the rest: "All done", N of N sets, the count never above the total.
//   3. A list saved by the old code (with and without Home's clock) opens on the right cards.
// Serve the repo first (python3 -m http.server 8765 --bind 127.0.0.1; see lib.js), then:  node scripts/headless/tick-memory.js
'use strict';
const H = require('./lib');
const t = H.checker();

// The fixture's Day 1 with a two-round circuit after its warm-up row, as Ehsan's Day 1 has (a circuit's tick lives in this list
// only; a lift's and a warm-up row's come back from the set log on every open).
const prog = () => {
  const P = H.fixture();
  P.workouts.days[0].blocks[0].exercises.push({ name: 'Hip Prep Circuit', type: 'circuit', rx: { rounds: 2, rest: 30 }, items: [
    { name: 'Glute Bridge', exId: 'glute-bridge', rx: { reps: 12 } },
    { name: 'Scapular Push-Up', exId: 'scapular-push-up', rx: { reps: 8 } }] });
  return P;
};

const reopen = async p => {
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
  await p.waitForTimeout(300);
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(300);
};
const look = p => p.evaluate(() => {
  refreshConfirmCard('1');
  const c = getDayCompletion('1');
  return {
    done: c.done, total: c.total,
    ticks: [...document.querySelectorAll('.checklist-item[data-day="1"]')].map(e => e.classList.contains('checked') ? 1 : 0).join(''),
    stray: [...document.querySelectorAll('[data-day="1"].checked')].filter(e => !e.classList.contains('checklist-item')).map(e => e.className),
    head: (document.querySelector('#confirm-1 .confirm-text') || {}).textContent,
    count: (document.querySelector('#confirm-1 .confirm-count') || {}).textContent,
  };
});
// Tick cards [from, to) the way the athlete does: a warm-up or a circuit by its circle, a lift set by set.
const tick = (p, from, to) => p.evaluate(([a, b]) => {
  [...document.querySelectorAll('#day-view .checklist-item[data-day="1"]')].slice(a, b).forEach(c => {
    if (c.classList.contains('round-group') || c.classList.contains('is-prep')) { if (!c.classList.contains('checked')) toggleCheckOnly(c, '1'); }
    else { setAllSetsDone(c, true); c.classList.add('checked'); saveState(); }
  });
  markTouched('1');
}, [from, to]);

(async () => {
  const browser = await H.launch();

  // ═════════ 1 and 2: a session the phone closes half-way ═════════
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog() });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);
    await p.evaluate(() => startTimerNow('1'));
    await tick(p, 0, 3);
    const before = await look(p);
    await reopen(p);
    const after = await look(p);
    t.check('1: Home shows the day under way (its clock is in the page)', await p.evaluate(() => !!document.querySelector('.dc-clock[data-day="1"]')));
    t.check('1: the same cards are ticked after the app opens again', after.ticks === before.ticks, before.ticks + ' → ' + after.ticks);
    t.check('1: nothing but a card holds a tick', after.stray.length === 0, JSON.stringify(after.stray));
    t.check('1: the count is what was done', after.done === before.done, before.done + ' → ' + after.done);
    await tick(p, 3, 99);
    const full = await look(p);
    t.check('2: every set done is All done', full.done === full.total && /^All done/.test(full.head || ''), JSON.stringify(full));
    const m = /^(\d+) of (\d+) sets$/.exec(full.count || '');
    t.check('2: the count says N of N sets, no "warm-up left"', !!m && m[1] === m[2], full.count);
    await reopen(p);
    const again = await look(p);
    t.check('2: still All done after another open', again.done === again.total && /^All done/.test(again.head || ''), JSON.stringify(again));
    t.check('1–2: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ═════════ 3: a list the old code saved ═════════
  for (const home of [false, true]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog() });
    // A lift's and a warm-up row's tick come back from the set log; a circuit's lives in this list, so the circuit is what is ticked here.
    const kinds = await p.evaluate(() => [...document.querySelectorAll('.checklist-item[data-day="1"]')].map(c => c.classList.contains('round-group')));
    const n = kinds.length;
    const cards = kinds.slice();
    const old = [...(home ? [false] : []), false, ...cards, false, false];   // [Home's clock?] [session clock] [cards] [Crew] [Share]
    await p.evaluate(v => localStorage.setItem(ATHLETE_ID + '_prog_state', JSON.stringify({ 1: v })), old);
    await reopen(p);
    const r = await look(p);
    t.check(`3: an old list (${home ? 'with' : 'without'} Home's clock) ticks the right cards`, cards.some(Boolean) && r.ticks === cards.map(Number).join(''), cards.map(Number).join('') + ' → ' + r.ticks);
    t.check(`3: an old list (${home ? 'with' : 'without'} Home's clock) ticks nothing else`, r.stray.length === 0, JSON.stringify(r.stray));
    const saved = await p.evaluate(() => { saveState(); return JSON.parse(localStorage.getItem(ATHLETE_ID + '_prog_state')); });
    t.check('3: the next save is the new list, cards only', saved.v === 2 && saved[1].length === n, JSON.stringify(saved));
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})();
