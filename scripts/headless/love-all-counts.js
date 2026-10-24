// Love All round 2, the counts (2026-10-24): five fixes of the 2026-10-20 audit, checked the way the athlete meets them.
//   B8   after midnight, last night's session counts ONCE and in ITS week: Progress says 2 of 10 (it said 3), Home says 0 of 2 (it said 1 of 2).
//   B9   History says how many sessions there are, not the 12 rows it draws.
//   B18  the share card's best lifts never compare kg, lb and plates as if the numbers were alike.
//   B20  Progress has no "Your numbers" heading over nothing (Career off, the demo, offline with no copy).
//   B29  1 reads as 1: "0 of 1 session done this week", "1 session with Amir", "1 meal to go".
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-counts.js
'use strict';
const H = require('./lib');
const C = require('./career');

const ID = H.ID;
const DAY = 86400000;
const SQUAT = 'Barbell Back Squat';
const t = H.checker();

// The phone's clock moved to 00:30 today (UTC, so the local day is the UTC day): the function bodies see it, the page does not reload.
const FAKE_CLOCK = () => {
  const Real = Date, d = new Real(); d.setHours(0, 30, 0, 0);
  const off = d.getTime() - Real.now();
  window.__RealDate = Real;
  window.Date = class extends Real {
    constructor(...a) { if (a.length) super(...a); else super(Real.now() + off); }
    static now() { return Real.now() + off; }
  };
};

// ═════════ B8: a session finished at 22:30 counts on its own day, once ═════════
async function b8(browser) {
  const prog = H.fixture();
  const cur = prog.cycles[prog.currentCycleIndex];
  cur.startDate = H.past(7);                                   // today is the first day of week 2
  cur.endDate = H.past(-27);
  const hist = [
    { completed_on: H.past(1), day: '1', readiness: 4, log: [] },   // last night's session, as the server holds it
    { completed_on: H.past(2), day: '2', readiness: 4, log: [] },
  ];
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', prog, hist });
  await p.evaluate(FAKE_CLOCK);
  await p.evaluate(id => {
    // the finish stamp last night's Done wrote: the date it was finished and the programme's token
    localStorage.setItem(id + '_completed_d1', new Date(Date.now() - 86400000).toDateString() + '|' + progToken());
    paintWeek();
    paintCycleCard();
  }, ID);
  const r = await p.evaluate(() => ({
    p: cycleProgress() && cycleProgress().done,
    planned: cycleProgress() && cycleProgress().planned,
    card: ([...document.querySelectorAll('#cycle-card-wrap .cyc-k')].find(e => /session/.test(e.textContent)) || {}).textContent,
    week: [...weekDoneDays()],
    sum: (document.getElementById('home-week-sum') || {}).textContent,
  }));
  t.check('B8: Progress counts last night once: 2 of 10, not 3', r.p === 2 && r.planned === 10, JSON.stringify(r));
  t.check('B8: the cycle card shows 2', /^2/.test(r.card || ''), r.card);
  t.check('B8: Home puts last night in last week: no day done this week', r.week.length === 0, JSON.stringify(r.week));
  t.check('B8: Home says 0 of 2 sessions done this week', /^0 of 2 sessions done this week/.test(r.sum || ''), r.sum);
  // The same stamp this afternoon: still one session, in this week.
  await p.evaluate(() => { window.Date = window.__RealDate; localStorage.setItem(ATHLETE_ID + '_completed_d2', new Date().toDateString() + '|' + progToken()); paintWeek(); });
  const r2 = await p.evaluate(() => ({ p: cycleProgress().done, week: [...weekDoneDays()] }));
  t.check('B8: a session stamped today still counts today', r2.week.indexOf('2') >= 0, JSON.stringify(r2));
  t.check('B8: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ B9: History says the real number ═════════
async function b9(browser) {
  const hist = [];
  for (let i = 1; i <= 15; i++) {
    hist.push({ completed_on: H.past(i * 2), day: '1', readiness: 4, log: [
      { ex: SQUAT, block: 'Strength', reps: 6, note: '', sets: [{ w: '70', n: 6, r: '7', d: true }, { w: '70', n: 6, r: '7', d: true }] }] });
  }
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', hist });
  await p.evaluate(() => switchDay && switchDay(1));
  await p.waitForTimeout(500);
  const n = await p.evaluate(nm => historyFor(nm).length, SQUAT);
  t.check('B9: the lift has 15 sessions on record', n === 15, n);
  await p.evaluate(nm => {
    const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === nm);
    if (c.classList.contains('collapsed')) toggleExpand(c);
  }, SQUAT);
  await p.waitForTimeout(400);
  const btn = await p.$('.lt-hist');
  if (btn) await btn.click();
  else await p.evaluate(nm => openHistorySheet([...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === nm)), SQUAT);
  await p.waitForTimeout(400);
  const s = await p.evaluate(() => ({ sub: (document.querySelector('#hist-overlay .readiness-sub') || {}).textContent, rows: document.querySelectorAll('#hist-overlay .hs-row').length }));
  t.check('B9: History says 15 times logged', /^15 times logged/.test(s.sub || ''), s.sub);
  t.check('B9: the list still draws 12 rows', s.rows === 12, s.rows);
  t.check('B9: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ B18: best lifts never compare across measures ═════════
async function b18(browser) {
  const d = H.past(3), now = Date.now();
  const lifts = [
    { lift: SQUAT, kg: 140, w: '120', r: '5', rpe: 8, d, t: now },                                  // 140 kg
    { lift: 'Bench Press', kg: 262, w: '225', r: '5', rpe: 8, d, t: now, u: 'lb' },                   // 262 lb = 119 kg
    { lift: 'Barbell Row', kg: 233, w: '200', r: '5', rpe: 8, d, t: now, u: 'lb' },                   // 106 kg
    { lift: 'Romanian Deadlift', kg: 233, w: '200', r: '5', rpe: 8, d, t: now, u: 'lb' },            // 106 kg
    { lift: 'Leg Press', kg: 90, w: '70', r: '8', rpe: 8, d, t: now, u: 'plates' },                   // a stack position
  ];
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', seed: { _1rm: lifts } });
  const top = await p.evaluate(() => hlTopLifts(3).map(l => l.name + ' ' + l.w + ' ' + l.u));
  t.check('B18: the 120 kg squat leads, the lb lifts follow, in their own measure', top[0] === SQUAT + ' 120 kg' && top[1] === 'Bench Press 225 lb' && top.length === 3, JSON.stringify(top));
  const four = await p.evaluate(() => hlTopLifts(5).map(l => l.name));
  t.check('B18: the plates lift is behind every kg and lb lift', four[four.length - 1] === 'Leg Press', JSON.stringify(four));
  t.check('B18: Progress leads with the same lift', await p.evaluate(() => ceilingBest(ceilingLifts()).lift) === SQUAT);
  t.check('B18: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ B20 and B29 on Progress and Home ═════════
function careerStub() {
  const prof = C.rwProfile(10000);
  return { tables: { career_rules: C.RW_RULES, career_facts: [], career_catalogue: C.catRows() }, profile: prof, awards: C.rwShelf(prof), myMoments: C.myMomentsFx() };
}
async function b20(browser) {
  const hid = p => p.evaluate(() => { const e = document.getElementById('numbers-title'); return { hidden: e.hidden || getComputedStyle(e).display === 'none', card: document.getElementById('career-card-wrap').innerHTML.trim().length }; });
  // Career off (no profile): the heading has nothing under it.
  let o = await H.openProgram(browser, { tz: 'UTC' });
  await o.p.evaluate(() => goTo('plan'));
  await o.p.waitForTimeout(600);
  let r = await hid(o.p);
  t.check('B20: Career off, a session on record: the card is empty and so is the heading', r.card === 0 && r.hidden, JSON.stringify(r));
  await o.ctx.close();
  // The demo.
  o = await H.openProgram(browser, { tz: 'UTC', query: '?client=demo' });
  await o.p.evaluate(() => goTo('plan'));
  await o.p.waitForTimeout(600);
  r = await hid(o.p);
  t.check('B20: the demo: no heading over nothing', r.card === 0 && r.hidden, JSON.stringify(r));
  await o.ctx.close();
  // Career on: the heading is there with its card.
  o = await H.openProgram(browser, { tz: 'UTC', stub: careerStub() });
  await o.p.evaluate(() => goTo('plan'));
  await o.p.waitForTimeout(1500);
  r = await hid(o.p);
  t.check('B20: Career on: the heading and its card are shown', r.card > 0 && !r.hidden, JSON.stringify(r));
  t.check('B20: no page errors', o.p.errs.length === 0, o.p.errs.join(' | '));
  await o.ctx.close();
}
async function b29(browser) {
  // One session a week: "0 of 1 session done this week".
  const prog = H.fixture();
  prog.workouts.days = prog.workouts.days.slice(0, 1);
  let o = await H.openProgram(browser, { tz: 'UTC', prog, hist: [] });
  await o.p.evaluate(() => paintWeek());
  const sum = await o.p.evaluate(() => (document.getElementById('home-week-sum') || {}).textContent);
  t.check('B29: 0 of 1 session done this week', /^0 of 1 session done this week/.test(sum || ''), sum);
  const card = await o.p.evaluate(() => { paintCycleCard(); return ([...document.querySelectorAll('#cycle-card-wrap .cyc-k small')].find(e => /session/.test(e.textContent)) || {}).textContent; });
  t.check('B29: the cycle card says "of 5 sessions" for many and nothing says "1 sessions"', /^of 5 sessions$/.test(card || ''), card);
  const words = await o.p.evaluate(() => {
    careerMarkCells = () => [{ key: 'sessions_with_amir', value: 1 }];
    CAREER_T = { p: {} };
    const one = crewSessionDraft(1);
    careerMarkCells = () => [{ key: 'sessions_with_amir', value: 12 }];
    return [one, crewSessionDraft(1)];
  });
  t.check('B29: Tell the crew draft reads "1 session with Amir"', words[0] === 'Day 1 done. 1 session with Amir.', words[0]);
  t.check('B29: …and "12 sessions with Amir" for many', words[1] === 'Day 1 done. 12 sessions with Amir.', words[1]);
  await o.ctx.close();
  // Meals: tap + twice on the 3-meal habit.
  o = await H.openProgram(browser, { tz: 'UTC', seed: { _hab_cfg: { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() } } });
  const sub = () => o.p.evaluate(() => (document.querySelector('.hb-wrap[data-h="fuel"] .hb-sub') || {}).textContent);
  const before = await sub();
  const plus = '.hb-wrap[data-h="fuel"] .hb-step[data-d="1"]';
  await o.p.locator(plus).scrollIntoViewIfNeeded();
  await o.p.click(plus);
  await o.p.waitForTimeout(300);
  const two = await sub();
  await o.p.click(plus);
  await o.p.waitForTimeout(300);
  const one = await sub();
  t.check('B29: 3 meals to go, then 2 meals to go, then 1 meal to go', before === '3 meals to go' && two === '2 meals to go' && one === '1 meal to go', JSON.stringify([before, two, one]));
  t.check('B29: no page errors', o.p.errs.length === 0, o.p.errs.join(' | '));
  await o.ctx.close();
}

(async () => {
  const browser = await H.launch();
  await b8(browser);
  await b9(browser);
  await b18(browser);
  await b20(browser);
  await b29(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
