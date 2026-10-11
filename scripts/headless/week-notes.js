// Week notes (cycles[n].weekNotes, program.html weekNoteNow() / weekNoteHTML()): a note can sit on ANY week of a
// cycle and shows ONLY in that week. The keys are week numbers ("1", "3", "5"); `first` and `last` stay as the
// legacy aliases for week 1 and for the final week (about 35 live programmes were written with them), and a
// numeric key wins over the alias for the same week. Nothing shows before the start date (it used to: the clamped
// week 1 picked `first` the day before the cycle began, 2026-10-11) or after the end date. A note's rpeCap /
// rpeDrop reach today's targets (dayRpe(), paintToday()) in that week only.
// Serve the repo first (python3 -m http.server 8765 --bind 127.0.0.1, see lib.js), then:
//   node scripts/headless/week-notes.js [--out <dir>]
'use strict';
const path = require('path');
const H = require('./lib');

const loc = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
// A startDate is a calendar day (cycleWeekInfo() reads it in whole days since pile C, 2026-10-11): the string names the day we mean, in every zone.
// (Until then it read new Date('YYYY-MM-DD') as a UTC midnight, so west of UTC this had to name the next day.)
const asCycleDate = d => loc(d);

// The fixture's current cycle (index 1) with today `dayIn` days after its start (negative: it starts in -dayIn days),
// `len` days from start to end (34 = five weeks), the given weekNotes (omitted: none), and the squat at RPE 9 so a
// lower day (drop 1) and a note's cap can be told apart (the floor is RPE 6, a written 7 would hide the cap).
function prog(dayIn, notes, { len = 34, rpe = 9 } = {}) {
  const P = H.fixture();
  const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - dayIn);
  const e = new Date(s); e.setDate(e.getDate() + len);
  P.cycles[1].startDate = asCycleDate(s);
  P.cycles[1].endDate = asCycleDate(e);
  if (notes !== undefined) P.cycles[1].weekNotes = notes;
  P.workouts.days[0].blocks[1].exercises.find(x => x.name === 'Barbell Back Squat').rx.rpe = rpe;
  return P;
}
// A day in the middle of week n of the five (never on a boundary, so daylight saving cannot move it).
const MID = n => (n - 1) * 7 + 3;
const END_DATE = 34, AFTER_END = 35, STARTS_TOMORROW = -1, STARTS_IN_9 = -9, STARTS_TODAY = 0;

// Home's note, every day panel's top note, and weekNoteNow(), as the page has them.
const seen = p => p.evaluate(() => {
  const label = n => (n.querySelector('.week-note-label') || {}).textContent || '';
  const read = n => n ? { cls: n.className.replace('week-note ', ''), label: label(n), body: n.textContent.slice(label(n).length) } : null;
  const panels = [...document.querySelectorAll('#day-view .day-content')].map(d => {
    const n = d.querySelector('.day-focus-tag').nextElementSibling;
    return read(n && n.classList.contains('week-note') ? n : null);
  });
  const now = weekNoteNow(currentCycleData());
  return {
    home: read(document.querySelector('#home-week-wrap .week-note')),
    homeCount: document.querySelectorAll('#home-week-wrap .week-note').length,
    panels,
    total: document.querySelectorAll('.week-note').length,
    now: now ? { key: now.key, wk: now.wk } : null,
  };
});
// What a note should look like on every screen: { cls, label, body }, or null for none.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function expectOk(s, want) {
  if (!want) return s.home === null && s.total === 0 && s.now === null;
  return same(s.home, want) && s.homeCount === 1 && s.panels.length === 2 && s.panels.every(x => same(x, want)) && s.total === 3
    && s.now && s.now.key === want.cls.replace('week-note-', '');
}

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const shot = (p, name) => p.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });
  // One programme in a fresh page: what it shows, and that nothing threw.
  async function run(name, dayIn, notes, want, opts) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(dayIn, notes, opts) });
    const s = await seen(p);
    t.check(name, expectOk(s, want) && p.errs.length === 0, JSON.stringify(s) + (p.errs.length ? ' ERR ' + p.errs.join(' | ') : ''));
    await ctx.close();
  }
  const note = (cls, label, body) => ({ cls: 'week-note-' + cls, label, body });

  // ── Legacy first / last ────────────────────────────────────────────────────────────────────────────────────────────
  const legacy = { first: { text: 'FIRST WEEK TEXT' }, last: { text: 'LAST WEEK TEXT' } };
  await run('legacy first: shows in week 1, labelled Week 1', MID(1), legacy, note('first', 'Week 1', 'FIRST WEEK TEXT'));
  await run('legacy first: on the start date itself', STARTS_TODAY, legacy, note('first', 'Week 1', 'FIRST WEEK TEXT'));
  for (const wk of [2, 3, 4]) await run(`legacy: nothing in week ${wk}`, MID(wk), legacy, null);
  await run('legacy last: shows in the final week, labelled Back-off week', MID(5), legacy, note('last', 'Back-off week', 'LAST WEEK TEXT'));
  await run('legacy last: still shows on the end date itself', END_DATE, legacy, note('last', 'Back-off week', 'LAST WEEK TEXT'));
  await run('legacy: nothing the day after the end date', AFTER_END, legacy, null);
  await run('legacy: nothing 40 days after the end date', 74, legacy, null);
  // The regression: the clamped week 1 used to pick `first` BEFORE the cycle started.
  await run('legacy first: NOT the day before the cycle starts', STARTS_TOMORROW, legacy, null);
  await run('legacy first: NOT nine days before the cycle starts', STARTS_IN_9, legacy, null);
  await run('legacy: a one-week cycle shows first, never last', 3, legacy, note('first', 'Week 1', 'FIRST WEEK TEXT'), { len: 6 });

  // ── A numeric key: any week, only that week ───────────────────────────────────────────────────────────────────────
  const three = { '3': { text: 'THREE TEXT' } };
  await run('"3": shows in week 3, labelled Week 3', MID(3), three, note('week', 'Week 3', 'THREE TEXT'));
  for (const wk of [1, 2, 4, 5]) await run(`"3": nothing in week ${wk}`, MID(wk), three, null);
  await run('"3": nothing before the start date', STARTS_TOMORROW, three, null);
  await run('"3": nothing after the end date', AFTER_END, three, null);
  const many = { '1': { text: 'ONE' }, '3': { text: 'THREE' }, '5': { text: 'FIVE' } };
  for (const wk of [1, 3, 5]) await run(`"1", "3", "5": week ${wk} shows its own note`, MID(wk), many, note('week', 'Week ' + wk, ['', 'ONE', '', 'THREE', '', 'FIVE'][wk]));
  for (const wk of [2, 4]) await run(`"1", "3", "5": nothing in week ${wk}`, MID(wk), many, null);
  await run('"1": nothing the day before the cycle starts', STARTS_TOMORROW, many, null);
  await run('keys outside the cycle ("0", "6", "9") never show', MID(3), { '0': { text: 'Z' }, '6': { text: 'S' }, '9': { text: 'N' } }, null);
  await run('a numeric key is for its week only: "2" does not show in week 3', MID(3), { '2': { text: 'TWO' } }, null);

  // ── Numeric and legacy together ───────────────────────────────────────────────────────────────────────────────────
  const both = { first: { text: 'OLD ONE' }, last: { text: 'OLD FIVE' }, '1': { text: 'NEW ONE' }, '5': { text: 'NEW FIVE', title: 'Test week' } };
  await run('numeric "1" beats legacy first in week 1', MID(1), both, note('week', 'Week 1', 'NEW ONE'));
  await run('numeric "5" beats legacy last in the final week (its title, not Back-off week)', MID(5), both, note('week', 'Test week', 'NEW FIVE'));
  await run('mixed: legacy first and "3": week 3 shows the numeric one', MID(3), { first: { text: 'F' }, '3': { text: 'T' } }, note('week', 'Week 3', 'T'));
  for (const wk of [2, 4]) await run(`mixed: legacy first and "3": nothing in week ${wk}`, MID(wk), { first: { text: 'F' }, '3': { text: 'T' } }, null);
  await run('mixed: week 1 is the legacy first', MID(1), { first: { text: 'F' }, '3': { text: 'T' } }, note('first', 'Week 1', 'F'));
  await run('mixed: week 5 has no last, so nothing', MID(5), { first: { text: 'F' }, '3': { text: 'T' } }, null);
  await run('a numeric note with no text does not hide the legacy alias', MID(1), { first: { text: 'F' }, '1': { title: 'x' } }, note('first', 'Week 1', 'F'));

  // ── Labels and text ───────────────────────────────────────────────────────────────────────────────────────────────
  await run('a title is the label', MID(3), { '3': { text: 'T', title: 'Test week' } }, note('week', 'Test week', 'T'));
  await run('a legacy last with a title uses it', MID(5), { last: { text: 'L', title: 'Taper' } }, note('last', 'Taper', 'L'));
  await run('a legacy first with a title uses it', MID(1), { first: { text: 'F', title: 'Find your weights' } }, note('first', 'Find your weights', 'F'));
  await run('the note\'s text is text, never markup', MID(3), { '3': { text: '<b>Light</b> & easy', title: '<i>x</i>' } }, note('week', '<i>x</i>', '<b>Light</b> & easy'));
  await run('a stored key or wk cannot reach the class name', MID(3), { '3': { text: 'T', key: '" onmouseover="x', wk: 99 } }, note('week', 'Week 3', 'T'));
  for (const [tag, wn] of [['no weekNotes', undefined], ['an empty object', {}], ['null', null], ['an array', []], ['a string', 'x']])
    await run(`${tag}: nothing, no errors`, MID(3), wn, null);

  // ── The open day: the note is the first thing under the focus tag, above the session bar ──────────────────────────
  for (const [dark, name] of [[false, 'week-notes-day'], [true, 'week-notes-day-dark']]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(MID(3), { '3': { text: 'Test week: we find your best set of the cycle. Warm up well and go to RPE 8 on the last set only.', title: 'Test week' } }), dark });
    await shot(p, name.replace('day', 'home'));
    await p.evaluate(() => openDayView('1'));
    const top = await p.evaluate(() => {
      const d = document.querySelector('#day-view .day-content.active');
      const n = d.querySelector('.day-focus-tag').nextElementSibling;
      const bar = d.querySelector('.session-timer');
      return { isNote: n.classList.contains('week-note'), shown: n.getBoundingClientRect().height > 0 && !document.getElementById('day-view').hidden,
        aboveBar: !!(n.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING), label: (n.querySelector('.week-note-label') || {}).textContent,
        sideways: document.documentElement.scrollWidth - window.innerWidth };
    });
    t.check(`open day${dark ? ' (dark)' : ''}: the Test week note is at the top, shown, above the session bar`, top.isNote && top.shown && top.aboveBar && top.label === 'Test week', JSON.stringify(top));
    t.check(`open day${dark ? ' (dark)' : ''}: no sideways scroll, no page errors`, top.sideways <= 0 && p.errs.length === 0, p.errs.join(' | '));
    await shot(p, name);
    await ctx.close();
  }
  {   // The same day, the week after: the note is gone from the open day.
    const { ctx, p } = await H.openProgram(browser, { prog: prog(MID(4), { '3': { text: 'THREE TEXT' } }) });
    await p.evaluate(() => openDayView('1'));
    const gone = await p.evaluate(() => !document.querySelector('#day-view .week-note'));
    t.check('open day in week 4: no "3" note', gone);
    await ctx.close();
  }

  // ── A note's numbers reach today's targets in its week only ───────────────────────────────────────────────────────
  // Unit level first: dayRpe(written, drop, note) is the rule, the note is whatever weekNoteNow() hands it.
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(MID(3), three) });
    const u = await p.evaluate(() => ({
      none: dayRpe('9', 1, null), cap: dayRpe('9', 1, { rpeCap: 7 }), drop2: dayRpe('9', 1, { rpeDrop: 2 }),
      floor: dayRpe('7', 1, { rpeCap: 4 }), capAlone: dayRpe('9', 0, { rpeCap: 7 }),
    }));
    t.check('dayRpe: a lower day alone 9 -> 8, a cap of 7 -> 7, rpeDrop 2 -> 7, never under 6, no lower day = no change',
      u.none === '8' && u.cap === '7' && u.drop2 === '7' && u.floor === '6' && u.capAlone === '', JSON.stringify(u));
    await ctx.close();
  }
  // Whole path: a lower-day check-in answered today, paintToday() writes the squat card's target (written RPE 9).
  const target = p => p.evaluate(() => {
    localStorage.setItem(readinessKey('1'), JSON.stringify({ timestamp: new Date().toISOString(), level: 'amber', sore: '', drop: 1, asWritten: false, skipped: false }));
    paintToday('1');
    const c = [...document.querySelectorAll('#day-view .checklist-item')].find(x => x.querySelector('.item-name').textContent.trim() === 'Barbell Back Squat');
    return c ? (c.dataset.targetToday || '') : null;
  });
  const capped = { '3': { text: 'Reduced load.', rpeCap: 7 } };
  for (const [name, dayIn, notes, want] of [
    ['no note, lower day: RPE 9 -> 8', MID(3), undefined, '8'],
    ['"3" rpeCap 7, in week 3: the lower day takes the cap, 9 -> 7', MID(3), capped, '7'],
    ['"3" rpeCap 7, in week 2: no cap, 9 -> 8', MID(2), capped, '8'],
    ['"3" rpeCap 7, in week 4: no cap, 9 -> 8', MID(4), capped, '8'],
    ['"3" rpeDrop 2, in week 3: 9 -> 7', MID(3), { '3': { text: 'Lighter.', rpeDrop: 2 } }, '7'],
    ['legacy first rpeCap 7, before the cycle starts: no cap, 9 -> 8', STARTS_TOMORROW, { first: { text: 'F', rpeCap: 7 } }, '8'],
    ['legacy first rpeCap 7, in week 1: 9 -> 7', MID(1), { first: { text: 'F', rpeCap: 7 } }, '7'],
    ['legacy last rpeCap 7, after the end date: no cap, 9 -> 8', AFTER_END, { last: { text: 'L', rpeCap: 7 } }, '8'],
    ['legacy last rpeCap 7, in the final week: 9 -> 7', MID(5), { last: { text: 'L', rpeCap: 7 } }, '7'],
    ['numeric rpeCap beats the legacy one for the same week (6 vs 7): 9 -> 6', MID(1), { first: { text: 'F', rpeCap: 7 }, '1': { text: 'N', rpeCap: 6 } }, '6'],
  ]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(dayIn, notes) });
    const got = await target(p);
    t.check(name, got === want && p.errs.length === 0, `target ${got}` + (p.errs.length ? ' ERR ' + p.errs.join(' | ') : ''));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
