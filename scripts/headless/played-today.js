// #126 Played today? (round 12 'On the Move', 2026-11-22): node scripts/headless/played-today.js
//
// After 5 pm, on a day with nothing logged, Home's Today card carries one row under Steps: the athlete's last activity, saved again in
// one tap through log_activity(). "Not today" hides it until tomorrow; "Something else" opens Add activity, which now opens on the last
// activity. What this holds: the row and its words; nothing before 5 pm, with no history, once today has one, or in the demo; Yes saves
// exactly the last activity for today and the row goes; Not today; the sheet filled in from the last one; Farsi; no page errors.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);   // the pages here run in UTC
const T = at(0);
const EVENING = 'Date.prototype.getHours = function () { return 19; };';
const MORNING = 'Date.prototype.getHours = function () { return 9; };';

function weeks(days) {
  return { n: 1, from: at(-6), to: at(28), current: true, weeks: [{ w: 1, from: at(-6), to: at(0), plan: 3, done: 0, held: false, now: true, days }] };
}
const PADEL = { day: at(-2), k: 'court', kind: 'padel', title: 'Padel', mins: 75, effort: 'hard', id: 'p1' };
const OLDER = { day: at(-5), k: 'court', kind: 'tennis', title: 'Tennis', mins: 60, effort: 'normal', id: 't1' };
async function open(browser, o) {
  const { ctx, p } = await H.openProgram(browser, Object.assign({ tz: 'UTC', init: o.init || EVENING, stub: { fiveWeeks: o.fw }, seed: { _hab_cfg: CFG, _hab_log: {} } }, o.opts || {}));
  await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
  await p.waitForTimeout(900);
  return { ctx, p };
}
const row = p => p.evaluate(() => {
  const w = document.querySelector('#home-today-wrap .pt-wrap');
  if (!w) return null;
  const prev = w.previousElementSibling;
  return { name: w.querySelector('.hb-name').textContent, sub: w.querySelector('.pt-sub').textContent.replace(/\s+/g, ' ').trim(),
    yes: w.querySelector('.pt-yes').textContent, more: [...w.querySelectorAll('.pt-more button')].map(b => b.textContent),
    afterSteps: !!(prev && prev.matches('.hb-wrap[data-h="steps"]')) };
});

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  // ── 1. the row, and Yes ──
  {
    const { ctx, p } = await open(browser, { fw: weeks([OLDER, PADEL]) });
    const r = await row(p);
    const dayName = await p.evaluate(d => window.AAHabits.dayLong(d), PADEL.day);
    t.check('after 5 pm the row sits under Steps with the last activity', r && r.afterSteps && r.name === 'Played today?'
      && r.sub === `Padel · 75 min · Hard · like ${dayName}` && r.yes === 'Yes, add it' && r.more.join('|') === 'Something else|Not today', JSON.stringify(r));
    await p.click('#home-today-wrap .pt-yes');
    await p.waitForTimeout(800);
    const calls = await p.evaluate(() => window.__STUB.calls);
    const saved = await p.evaluate(() => {
      const c = (window.__STUB.params || []).filter(x => x[0] === 'log_activity');
      return c.length ? c[c.length - 1][1] : null;
    });
    t.check('Yes saves the last activity for today, as the athlete', saved && saved.p_kind === 'padel' && saved.p_minutes === 75 && saved.p_effort === 'hard' && saved.p_day === T
      && saved.p_athlete_id && saved.p_id, JSON.stringify(saved || calls));
    const gone = await row(p);
    t.check('the row goes once today has an activity', gone === null, JSON.stringify(gone));
    t.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. when it stays away ──
  {
    let o = await open(browser, { fw: weeks([PADEL]), init: MORNING });
    t.check('not before 5 pm', (await row(o.p)) === null);
    await o.ctx.close();
    o = await open(browser, { fw: weeks([]) });
    t.check('not with no activity ever logged', (await row(o.p)) === null);
    await o.ctx.close();
    o = await open(browser, { fw: weeks([PADEL, { day: T, k: 'other', kind: 'run', title: 'Run', mins: 30, effort: 'easy', id: 'r1' }]) });
    t.check('not once today already has one', (await row(o.p)) === null);
    await o.ctx.close();
  }

  // ── 3. Not today, and Something else ──
  {
    const { ctx, p } = await open(browser, { fw: weeks([PADEL]) });
    await p.click('#home-today-wrap .pt-more button:last-child');
    await p.waitForTimeout(200);
    const k = await p.evaluate(() => localStorage.getItem(ATHLETE_ID + '_played_no'));
    t.check('Not today hides it until tomorrow', (await row(p)) === null && k === await p.evaluate(() => window.AAHabits.TKEY()), k);
    await p.evaluate(k2 => localStorage.removeItem(ATHLETE_ID + '_played_no'), k);
    await p.evaluate(() => paintTodayCard());
    await p.click('#home-today-wrap .pt-more button:first-child');
    await p.waitForTimeout(300);
    const sheet = await p.evaluate(() => ({
      open: document.getElementById('hist-overlay').classList.contains('visible'),
      picked: [...document.querySelectorAll('#hist-overlay .pl-chip[aria-pressed="true"]')].map(b => b.textContent),
      mins: (document.getElementById('act-mins') || {}).value,
      from: (document.querySelector('#hist-overlay .act-from') || {}).textContent }));
    t.check('Something else opens Add activity filled in from the last one', sheet.open && sheet.picked.includes('Padel') && sheet.picked.includes('Hard')
      && sheet.mins === '75' && /Filled in from your last one/.test(sheet.from || ''), JSON.stringify(sheet));
    await ctx.close();
  }

  // ── 4. Farsi ──
  {
    const { ctx, p } = await open(browser, { fw: weeks([PADEL]), init: EVENING + "try { localStorage.setItem('aa_lang', 'fa'); } catch (e) {}" });
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
    await p.waitForTimeout(900);
    const fa = await p.evaluate(() => { const w = document.querySelector('#home-today-wrap .pt-wrap'); return w ? w.textContent.replace(/\s+/g, ' ').trim() : null; });
    t.check('in Farsi the row reads in Farsi', !!fa && !/[A-Za-z]{3,}/.test(fa), fa);
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
