// #150 The Count-Up (round 15 'Over the Line', 2026-11-24): node scripts/headless/count-up.js
//
// A Court Log save answers with what it added to the week's Move minutes: "+68 Move minutes", "212 of 300 this week.", the bar with the new
// part in clay; the save that takes the week to the line says "That's your line. +150 XP.". Both numbers are get_five_weeks()'s (before, from
// this visit's answer; after, from a fresh read), so a server without `move` (before stage127) keeps the plain message. The hard-hour offer
// (#128) carries the same block. The stub's `moveAdd` / `moveXp` stand in for the server's move_week().
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);   // the pages here run in UTC
function weeks(total, withMove) {
  const w = { w: 1, from: at(-6), to: at(0), plan: 3, done: 0, held: false, now: true, days: [] };
  if (withMove !== false) w.move = { total, plan: total, lib: 0, court: 0, other: 0, walk: 0, xp: 0 };
  const o = { n: 1, from: at(-6), to: at(28), current: true, weeks: [w], acts: [] };
  if (withMove !== false) o.move = { line: 300, mark: 150, xp: 150 };
  return o;
}
const BELL = { athlete_id: H.ID, at: new Date().toISOString(), days: 7, kinds: ['level', 'week'], items: [],
  me: { answer: 'yes', name: 'Alex R.', on_board: true, under13: false, can_post: true, photos_left: 3, posts_left: 10, kinds: { level: true, week: true } } };
async function open(browser, fw, stub) {
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', stub: Object.assign({ fiveWeeks: fw, bell: BELL }, stub || {}), seed: { _hab_cfg: CFG, _hab_log: {} } });
  await p.evaluate(async () => { if (typeof loadFiveWeeks === 'function') await loadFiveWeeks(); });
  await p.waitForTimeout(600);
  await p.evaluate(async () => { if (typeof refreshBell === 'function') { try { await refreshBell(); } catch (e) {} } });
  await p.waitForTimeout(300);
  return { ctx, p };
}
async function save(p, kind, mins, effort) {
  await p.evaluate(() => openActivitySheet());
  await p.evaluate(([k, m, e]) => { actPick('kind', k); actPick('mins', m); actPick('effort', e); }, [kind, mins, effort]);
  await p.evaluate(() => saveActivity());
  await p.waitForTimeout(1500);
  return p.evaluate(() => {
    const el = document.getElementById('aaToast');
    if (!el || el.hidden) return null;
    const mv = el.querySelector('.aa-toast-mv'), q = s => { const e = el.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    const nw = el.querySelector('.aa-toast-bar i.is-new');
    return { t: q('.aa-toast-t'), go: q('.aa-toast-go'), big: mv ? q('.aa-toast-mv b') : null, say: mv ? q('.aa-toast-mv p') : null,
      clay: mv ? getComputedStyle(el.querySelector('.aa-toast-mv b span')).color : null,
      newW: nw ? parseFloat(nw.style.width) : null, newL: nw ? parseFloat(nw.style.left) : null, tick: !!el.querySelector('.aa-toast-bar s') };
  });
}

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  {
    const { ctx, p } = await open(browser, weeks(144), { moveAdd: 68, moveXp: 150 });
    const r = await save(p, 'padel', 60, 'normal');
    t.check('the save says what it added: +68 Move minutes', r && r.big === '+68 Move minutes', JSON.stringify(r));
    t.check('and where the week stands: 212 of 300 this week.', r && r.say === '212 of 300 this week.', JSON.stringify(r));
    t.check('the bar: the week before in mint, the new part after it', r && Math.abs(r.newL - 48) < 0.1 && Math.abs(r.newW - 22.67) < 0.1 && !r.tick, JSON.stringify(r));
    t.check('"Move minutes" in the clay that reads on green (#F7A183), never yellow', r && r.clay === 'rgb(247, 161, 131)', r && r.clay);
    t.check('Tell the crew still rides on it', r && r.t === 'Added to your weeks.' && r.go === 'Tell the crew', JSON.stringify(r));
    const reads = await p.evaluate(() => (window.__STUB.calls || []).filter(c => c === 'rpc:get_five_weeks').length);
    t.check('the after number is a fresh read of get_five_weeks()', reads >= 2, String(reads));
    t.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  {
    const { ctx, p } = await open(browser, weeks(256), { moveAdd: 68, moveXp: 150 });
    const r = await save(p, 'tennis', 60, 'normal');
    t.check('the save that reaches the line: That\'s your line. +150 XP.', r && r.big === '+68 Move minutes' && r.say === 'That\'s your line. +150 XP.', JSON.stringify(r));
    t.check('past the line the bar marks where it was', r && r.tick, JSON.stringify(r));
    await ctx.close();
  }

  {
    const { ctx, p } = await open(browser, weeks(320), { moveAdd: 40, moveXp: 150 });
    const r = await save(p, 'tennis', 30, 'easy');
    t.check('a week already over the line just counts on', r && r.say === '360 of 300 this week.', JSON.stringify(r));
    await ctx.close();
  }

  {
    const { ctx, p } = await open(browser, weeks(100), { moveAdd: 120, moveXp: 150 });
    const r = await save(p, 'tennis', 90, 'hard');
    t.check('the hard-hour offer (#128) carries the count-up too', r && r.big === '+120 Move minutes' && /A hard one/.test(r.t || '') && r.say === '220 of 300 this week.', JSON.stringify(r));
    await ctx.close();
  }

  {
    const { ctx, p } = await open(browser, weeks(0, false), { moveAdd: 68 });
    const r = await save(p, 'padel', 60, 'normal');
    t.check('a server without Move minutes keeps the plain message', r && r.big === null && r.t === 'Added to your weeks.', JSON.stringify(r));
    t.check('no page errors (no move)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  {
    const { ctx, p } = await open(browser, weeks(144), { moveAdd: 0 });
    const r = await save(p, 'gym', 60, 'normal');
    t.check('a save that adds nothing says nothing about Move minutes', r && r.big === null, JSON.stringify(r));
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
