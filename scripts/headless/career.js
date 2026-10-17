// Career Mode phase 2, the XP switch, in both apps (career/CAREER_MODE.md; supabase/stage69_career_xp_switch.sql): node scripts/headless/career.js
//
// What an athlete meets once the server's XP switch is on, and what they meet before it (nothing new), on made-up profiles from the stub
// (get_profile) and the stub's career_rules (the switch, read by Hold Serve's own read in the training app):
//   the training app  a Career row on Home above Hold Serve (the level, the rank, what the next level needs, the bar), from the phone's copy at once
//                     and the server behind it; gone when the switch is off; never in the demo or the coach's preview; the habits row never says a
//                     level of its own in Career Mode; the finish card says what the session earns (the session, every set logged, the check-in,
//                     a repeat that pays once, a held week the server confirms), and the finished card what it earned once the server has it;
//                     a tap opens AA Proof's Locker; nothing of it is synced.
//   AA Proof          the career's level replaces the season's: ONE reveal, once per athlete ("Your career"), never a flood of level-ups; a tick moves
//                     the XP at once (P13); the WORKOUT habit pays 0 a day; the manual says the level never resets; ?go=pass opens the Locker;
//                     the embedded strip never asks the server for the profile; before the switch, nothing changes.
// The phones' copies of the server's rules are checked against the server's own answers by scripts/check_twins.js (scripts/career/xp_cases.json).
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.toISOString().slice(0, 10);
const at = n => ymd(new Date(Date.now() + n * DAY));                    // n days from today (UTC; every page here runs in UTC)
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'career', 'xp_cases.json'), 'utf8'));
const LEVEL = CASES.rules.level;
const PRICES = { session_finished: 400, session_finished_early: 200, full_log: 50, checkin_done: 20, week_held: 400, bounce_back: 100,
                 training_return: 50, library_session: 100, retest_done: 50 };
// The server's curve, career_level() (its twins in both apps are held to it by check_twins.js).
function lvl(xp) {
  const cost = n => Math.max(10, Math.round(LEVEL.base * Math.pow(n, LEVEL.growth) / 10) * 10);
  let lv = 1, spent = 0, c = cost(1);
  while (xp - spent >= c) { spent += c; lv++; c = cost(lv); }
  const i = lv - 1, within = i % LEVEL.prestige_after, star = Math.floor(i / LEVEL.prestige_after);
  return { level: lv, rank: (star ? '★' + star + ' ' : '') + LEVEL.ranks[Math.floor(within / LEVEL.levels_per_rank)] + ' ' + (within % LEVEL.levels_per_rank + 1),
           xp_in_level: xp - spent, level_cost: c, to_next: c - (xp - spent) };
}
const SWITCH_DAY = at(-1);
function profile(xp, o = {}) {
  const on = o.on !== false;
  return { athlete_id: H.ID, ready: true, shadow: !on, switch: { xp: on ? SWITCH_DAY : null, catalogue: null }, rules_version: on ? 3 : 2,
    career: Object.assign({ xp, habits: {}, facts: {}, facts_xp: 0 }, lvl(xp)),
    season: { name: 'Season 1', starts_on: at(-2), points: 1234 }, week: { from: at(-6), points: o.week == null ? 900 : o.week },
    since: o.since || '2026-06-06', kept: null,
    numbers: { weeks_held: { now: 2, best: 4 }, sessions_with_amir: o.sessions == null ? 24 : o.sessions, personal_bests: 3, comebacks: 1,
               days_on_target: 40, perfect_days: 10 },
    titles_owned: [], rules: { version: 3, level: LEVEL, season: { title_points: 2000 }, prices: PRICES },
    badges: [], achievements: [], missions: [], quest: null, moments: [] };
}
const RULES_ON = [{ version: 3, switch: { xp: SWITCH_DAY, catalogue: 'off' } }];
const RULES_OFF = [{ version: 2, switch: { xp: 'off', catalogue: 'off' } }];
const RULES_V1 = [{ version: 1 }];                                      // the live rulebook of phase 1: no switches at all
const fmt = n => n.toLocaleString('en-US');

// The fixture's cycles with dates (hold-serve.js's): the current one starts `start` days from today, five weeks each, back to back.
function prog({ start = -10, days } = {}) {
  const P = H.fixture({ dated: false });
  P.cycles.forEach((c, i) => { const s = start + (i - P.currentCycleIndex) * 35; c.startDate = at(s); c.endDate = at(s + 34); });
  if (days) P.workouts.days = P.workouts.days.slice(0, days);
  return P;
}
const W = (kind, c, w, n) => ({ kind: kind === 'H' ? 'week_held' : 'week_broken', ref: `c${c}|w${w}`, day: at(n), value: { cycle: c, week: w } });

async function openP(browser, o = {}) {
  const stub = Object.assign({ tables: { career_rules: o.rules || RULES_ON, career_facts: o.facts || [] } },
    o.profile === null ? {} : { profile: o.profile || profile(10000) }, o.stub || {});
  return H.openProgram(browser, Object.assign({ w: o.w || 390, h: 844, tz: 'UTC', prog: o.prog || prog(), hist: o.hist || [], stub, seed: o.seed || {},
    query: o.query || '' }, o.opts || {}));
}
const row = p => p.evaluate(() => {
  const r = document.querySelector('#home-career-wrap .hrow');
  if (!r) return null;
  return { label: r.querySelector('.hrow-l').textContent.trim(), big: r.querySelector('.hrow-vv').textContent.trim(),
           small: r.querySelector('.hrow-v small').textContent.replace(/ /g, ' ').trim(),
           bar: r.querySelector('.career-bar i') ? r.querySelector('.career-bar i').style.width : null };
});
const waitRow = (p, ms) => p.waitForFunction(() => !!document.querySelector('#home-career-wrap .hrow'), null, { timeout: ms || 5000 }).then(() => true, () => false);
const calls = (p, name) => p.evaluate(n => (window.__STUB.calls || []).filter(c => c === n).length, name);
// What a node says, line by line as the eye reads it (innerText keeps the breaks between its lines), spaces collapsed.
const T = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
async function tickAll(p) {   // every card in Day 1 (day-finish.js's way), ticked with no RPE
  const n = await p.evaluate(() => document.querySelectorAll('#day1 .checklist-item').length);
  for (let i = 0; i < n; i++) {
    await p.evaluate(i => {
      const c = document.querySelectorAll('#day1 .checklist-item')[i];
      if (c.classList.contains('collapsed')) toggleExpand(c);
      if (!c.classList.contains('checked')) toggleCheckOnly(c, '1');
    }, i);
    await p.waitForTimeout(100);
  }
  await p.evaluate(() => hideAaToast());
  await p.waitForTimeout(700);
}
async function toReady(p) {
  await p.evaluate(() => {
    openDayView('1');
    const t0 = Date.now() - 754000;
    localStorage.setItem(timerKey('1'), JSON.stringify({ running: true, resumeAt: t0, acc: 0, sessionStart: t0 }));
    renderTimer('1');
  });
  await p.waitForTimeout(250);
  await tickAll(p);
}

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const L10 = lvl(10000);

  // ── the training app ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // 1. the switch on: the row, above Hold Serve, from the server behind the first paint
  {
    const facts = [W('H', 1, 4, -20), W('H', 1, 5, -13), W('H', 2, 1, -6)];
    const { ctx, p } = await openP(browser, { facts, hist: [{ completed_on: at(-2), day: '1', readiness: 4, log: [] }] });
    const shown = await waitRow(p);
    const r = await row(p);
    C.check('on: the Career row is on Home', shown && r && r.label === 'Career', JSON.stringify(r));
    C.check('on: the level, "Level ' + L10.level + '"', r && r.big === 'Level ' + L10.level, r && r.big);
    C.check('on: the rank and what the next level needs', r && r.small === `${L10.rank} · ${fmt(L10.to_next)} XP to level ${L10.level + 1}`, r && r.small);
    C.check('on: the bar fills to the level\'s share', r && r.bar === Math.round(L10.xp_in_level / L10.level_cost * 100) + '%', r && r.bar);
    const order = await p.evaluate(() => [...document.querySelectorAll('#home-overview > div')].map(d => d.id).filter(id => /career|hold|habits/.test(id))
      .map(id => id + (document.getElementById(id).innerHTML.trim() ? '' : ' (empty)')));
    C.check('on: Career sits above Hold Serve, Hold Serve above the habits row', JSON.stringify(order) === JSON.stringify(['home-career-wrap', 'home-hold-wrap', 'home-habits-wrap']), JSON.stringify(order));
    const gap = await p.evaluate(() => {
      const a = document.querySelector('#home-career-wrap .hrow').getBoundingClientRect(), b = document.querySelector('#home-hold-wrap .hrow');
      return b ? Math.round(b.getBoundingClientRect().top - a.bottom) : null;
    });
    C.check('on: the two door rows sit 10 px apart, as Hold Serve and the habits row', gap === 10, gap);
    const keys = await p.evaluate(id => ({ cache: !!localStorage.getItem(id + '_careercache'), synced: Object.keys(_snapshot()).filter(k => /careercache|earn_d/.test(k)) }), H.ID);
    C.check('on: the profile is kept on this phone, never synced', keys.cache && keys.synced.length === 0, JSON.stringify(keys));
    C.check('on: one get_profile, after Hold Serve\'s read said the switch is on', await calls(p, 'rpc:get_profile') === 1, await calls(p, 'rpc:get_profile'));
    await p.evaluate(() => document.querySelector('#home-career-wrap .hrow').click());
    await p.waitForTimeout(800);
    C.check('on: a tap opens AA Proof\'s Locker', /habits\.html\?client=rel01_athlete.*&go=pass/.test(p.url()), p.url());
    C.check('on: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 2. the switch off, or a rulebook from before the switches (the live one until stage69): no row and no profile asked for
  for (const [name, rules] of [['off', RULES_OFF], ['phase 1 rulebook', RULES_V1]]) {
    const { ctx, p } = await openP(browser, { rules });
    await p.waitForTimeout(1200);
    C.check(`${name}: no Career row`, (await row(p)) === null, JSON.stringify(await row(p)));
    C.check(`${name}: get_profile is never asked`, await calls(p, 'rpc:get_profile') === 0, await calls(p, 'rpc:get_profile'));
    C.check(`${name}: no page errors`, p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 3. the phone's copy: the row at once while the server says nothing; gone (and the copy dropped) when the server's switch is off
  {
    const seed = { _careercache: { p: profile(10000), at: Date.now() - 3600000 } };
    let { ctx, p } = await openP(browser, { seed, stub: { stall: { get_profile: true } } });
    C.check('copy: the row from the phone\'s copy while the server is still thinking', !!(await row(p)) && (await row(p)).big === 'Level ' + L10.level, JSON.stringify(await row(p)));
    await ctx.close();
    ({ ctx, p } = await openP(browser, { seed, rules: RULES_OFF }));
    await p.waitForTimeout(1200);
    C.check('copy: the switch off on the server takes the row and the copy away', (await row(p)) === null
      && !(await p.evaluate(id => localStorage.getItem(id + '_careercache'), H.ID)), JSON.stringify(await row(p)));
    await ctx.close();
  }
  // 4. never in the demo or the coach's preview
  for (const [name, query] of [['demo', '?client=demo'], ['coach preview', '?client=rel01_athlete&preview=1']]) {
    const { ctx, p } = await openP(browser, { query, seed: { _careercache: { p: profile(10000), at: Date.now() } } });
    await p.waitForTimeout(1200);
    C.check(`${name}: no Career row, no profile asked for`, (await row(p)) === null && await calls(p, 'rpc:get_profile') === 0,
      JSON.stringify({ row: await row(p), asked: await calls(p, 'rpc:get_profile') }));
    await ctx.close();
  }
  // 5. the habits row never says a level of its own in Career Mode (Proof's snapshot from yesterday said "Level 7")
  for (const [name, rules, want] of [['on', RULES_ON, 'Ready for today'], ['off', RULES_OFF, 'Level 7']]) {
    const card = { t: new Date(Date.now() - DAY).toISOString(), lv: 7, streak: 3, verdict: 'on' };
    const { ctx, p } = await openP(browser, { rules });
    if (name === 'on') await waitRow(p);
    // Proof's strip writes today's snapshot as soon as it boots: put yesterday's back and draw the row from it at once
    const said = await p.evaluate(([id, card]) => {
      localStorage.setItem(id + '_hab_card', JSON.stringify(card));
      const d = document.createElement('div'); d.innerHTML = habitCardHtml();
      const v = d.querySelector('.hrow-vv'); return v ? v.textContent.trim() : null;
    }, [H.ID, card]);
    C.check(`habits row, switch ${name}: "${want}"`, said === want, said);
    await ctx.close();
  }
  // 6. what a session earns: Day 1 ticked through (no RPE, no check-in), not done this week, the week not complete with it
  {
    const { ctx, p } = await openP(browser, {});
    await waitRow(p);
    await toReady(p);
    const earn = await T(p, '#confirm-1 .confirm-earn');
    C.check('finish card: "This session earns +450 XP", the session and every set logged', earn === 'THIS SESSION EARNS +450 XP Session 400 · Every set logged 50', earn);
    const shown = await p.evaluate(() => { const e = document.querySelector('#confirm-1 .confirm-earn'); return !!e && e.getBoundingClientRect().height > 0; });
    C.check('finish card: the line shows on the ready card', shown, shown);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    await p.waitForTimeout(200);
    // the server will count the session (and, say, a habit ticked meanwhile): its next answer is the number
    await p.evaluate(xp => { window.__STUB.profile = xp; }, profile(10470));
    const counting = await p.evaluate(() => {      // the finished card as Done paints it, before any answer (synchronously)
      finishTap('1', document.querySelector('#confirm-1 .confirm-btn'));
      const e = document.getElementById('earn-1'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null;
    });
    C.check('finished card: "+450 XP", counting until the server has the session', counting === `+450 XP LEVEL ${lvl(10450).level} · COUNTING`, counting);
    await p.waitForTimeout(1500);                   // the save lands, then the profile is asked again
    const L2 = lvl(10470), done = await T(p, '#earn-1');
    C.check('finished card: the server\'s number once it has the session', done === `+470 XP LEVEL ${L2.level} · ${fmt(L2.to_next)} TO ${L2.level + 1}`, done);
    const kept = await p.evaluate(id => JSON.parse(localStorage.getItem(id + '_earn_d1') || 'null'), H.ID);
    C.check('finished card: kept on this phone for its finished card, saved stamped', kept && kept.xp === 450 && kept.saved > 0, JSON.stringify(kept));
    C.check('finish: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 7. a repeat this week pays its session once; the session that completes the week holds it (the server confirms), after a broken week
  {
    const hist = [{ completed_on: at(-1), day: '1', readiness: 4, log: [] }];
    let { ctx, p } = await openP(browser, { hist });
    await waitRow(p);
    await toReady(p);
    let earn = await T(p, '#confirm-1 .confirm-earn');
    C.check('repeat: the session itself pays once a week, the full log still pays', /^THIS SESSION EARNS \+50 XP Every set logged 50 Day 1 is done this week already/.test(earn || ''), earn);
    await ctx.close();
    const P2 = prog({ days: 2 });
    const facts = [W('H', 1, 4, -20), W('B', 1, 5, -13)];
    ({ ctx, p } = await openP(browser, { prog: P2, facts, hist: [{ completed_on: at(-1), day: '2', readiness: 4, log: [] }] }));
    await waitRow(p);
    await toReady(p);
    earn = await T(p, '#confirm-1 .confirm-earn');
    C.check('the week: the held week and the bounce back, marked to come', earn === 'THIS SESSION EARNS +450 XP Session 400 · Every set logged 50 Your week held +400 · Back after a broken week +100 when it counts', earn);
    await ctx.close();
  }
  // 8. 320 px: the row and the line fit
  {
    const { ctx, p } = await openP(browser, { w: 320 });
    await waitRow(p);
    const fit = await p.evaluate(() => {
      const r = document.querySelector('#home-career-wrap .hrow').getBoundingClientRect();
      return { right: Math.round(r.right), vw: innerWidth, sideways: document.documentElement.scrollWidth > innerWidth };
    });
    C.check('320 px: the Career row fits, no sideways scroll', fit.right <= fit.vw && !fit.sideways, JSON.stringify(fit));
    await ctx.close();
  }

  // ── AA Proof ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const LOG = {};
  for (let i = 1; i <= 6; i++) LOG[at(-i)] = { water: 8, sleep: 8, steps: 11000, fuel: 3 };
  const proofOpts = (prof, extra) => Object.assign({ seed: { _hab_log: LOG }, stub: { profile: prof } }, extra || {});
  const hero = p => p.evaluate(() => { const h = document.querySelector('[data-hero]'); return h ? h.textContent.trim() : null; });
  const reveal = p => p.evaluate(() => {
    const w = document.querySelector('.lvwrap[data-k^="cel:career:"]');
    return w ? { kicker: w.querySelector('.lvkicker').textContent.trim(), n: w.querySelector('.lvbadge .n').textContent.trim(),
                 rank: w.querySelector('.lvrank').textContent.trim(), sub: w.querySelector('.lvsub').textContent.trim() } : null;
  });
  // 9. before the switch: nothing changes (the profile is read, the level is Proof's own, no reveal)
  {
    const { ctx, p } = await H.openProof(browser, proofOpts(profile(10000, { on: false })));
    await p.waitForTimeout(1200);
    const own = await p.evaluate(() => ({ lv: overallLevel().lv, base: overallBase(), on: careerOn(), wo: paidXp(habitById('strength'), 1) }));
    C.check('Proof, off: no reveal', (await reveal(p)) === null);
    C.check('Proof, off: the level is Proof\'s own (its curve, base 300), WORKOUT still pays 120', !own.on && own.base === 300 && own.wo === 120 && String(own.lv) === await hero(p), JSON.stringify(own));
    C.check('Proof, off: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 10. the switch: one reveal, the career's level everywhere, a tick at once, then never again on this phone or another
  {
    const { ctx, p } = await H.openProof(browser, proofOpts(profile(10000)));
    await p.waitForFunction(() => !!document.querySelector('.lvwrap[data-k^="cel:career:"]'), null, { timeout: 6000 }).catch(() => {});
    const r = await reveal(p);
    C.check('Proof, on: ONE reveal, "Your career"', r && r.kicker === 'Your career', JSON.stringify(r));
    C.check('Proof, on: the career\'s level and rank on it', r && r.n === String(L10.level) && r.rank === L10.rank, JSON.stringify(r));
    C.check('Proof, on: "From everything you\'ve logged since 6 June, your training included"', r && /^From everything you've logged since 6 June, your training included\. Your level never resets now\./.test(r.sub), r && r.sub);
    const queue = await p.evaluate(() => UI.celebrate.map(e => e.kind || (e.overall ? 'level' : 'habit')));
    C.check('Proof, on: no flood of level-ups behind it (the queue is the reveal alone)', JSON.stringify(queue) === '["career"]', JSON.stringify(queue));
    await p.evaluate(() => dismissCelebration());
    await p.waitForTimeout(300);
    C.check('Proof, on: Today\'s ring shows the career\'s level', await hero(p) === String(L10.level), await hero(p));
    // today's water is not logged yet (the seeded log ends yesterday): 8 glasses are 30 × 1.2 = 36
    const tick = await p.evaluate(() => { const b = overallLevel().xp; setVal('water', 8); render(); return overallLevel().xp - b; });
    C.check('Proof, on: a tick moves the career\'s XP at once, by the habit\'s own XP (water, 36)', tick === 36, tick);
    C.check('Proof, on: the WORKOUT habit pays 0 a day', await p.evaluate(() => paidXp(habitById('strength'), 1)) === 0);
    C.check('Proof, on: the overall curve is the career\'s (base 400)', await p.evaluate(() => overallBase()) === 400);
    const man = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = renderManual(); return d.textContent.replace(/\s+/g, ' '); });
    C.check('Proof, on: the manual says the level is the career and never resets', /Your level is your career\./.test(man) && /the board's points go back to zero/.test(man), man.slice(0, 200));
    C.check('Proof, on: before the reveal was shown nothing re-baselined twice (careerSeen is the switch day)', await p.evaluate(() => CFG.careerSeen) === SWITCH_DAY);
    C.check('Proof, on: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    // the same phone, opened again: no reveal; the profile copy opens it at once
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    C.check('Proof, again: no second reveal', (await reveal(p)) === null && await hero(p) === String(L10.level), JSON.stringify({ r: await reveal(p), hero: await hero(p) }));
    await ctx.close();
    // another phone: the config came through the cloud with careerSeen set
    const other = await H.openProof(browser, proofOpts(profile(10000), { cfg: { careerSeen: SWITCH_DAY } }));
    await other.p.waitForTimeout(1500);
    C.check('Proof, another phone: no second reveal', (await reveal(other.p)) === null, JSON.stringify(await reveal(other.p)));
    await other.ctx.close();
  }
  // 11. a free athlete (no training) hears nothing about training; someone who started after the switch gets no reveal
  {
    const { ctx, p } = await H.openProof(browser, proofOpts(profile(3000, { sessions: 0 })));
    await p.waitForFunction(() => !!document.querySelector('.lvwrap[data-k^="cel:career:"]'), null, { timeout: 6000 }).catch(() => {});
    const r = await reveal(p);
    C.check('Proof, no training: the reveal does not mention it', r && /^From everything you've logged since 6 June\. Your level/.test(r.sub), r && r.sub);
    await ctx.close();
    const fresh = await H.openProof(browser, proofOpts(profile(300, { since: SWITCH_DAY })));
    await fresh.p.waitForTimeout(1500);
    C.check('Proof, started after the switch: no reveal', (await reveal(fresh.p)) === null && await fresh.p.evaluate(() => CFG.careerSeen) === SWITCH_DAY);
    await fresh.ctx.close();
  }
  // 12. ?go=pass opens the Locker; the embedded strip never asks for the profile
  {
    const { ctx, p } = await H.openProof(browser, proofOpts(profile(10000), { url: '/habits.html?go=pass', cfg: { careerSeen: SWITCH_DAY } }));
    await p.waitForTimeout(800);
    C.check('Proof: ?go=pass opens the Locker', await p.evaluate(() => !!document.querySelector('[data-k="screen:pass"]')));
    await ctx.close();
    const em = await H.openProof(browser, proofOpts(profile(10000), { url: '/habits.html?embed=1' }));
    await em.p.waitForTimeout(1200);
    C.check('Proof, embedded: get_profile is never asked', await calls(em.p, 'rpc:get_profile') === 0, await calls(em.p, 'rpc:get_profile'));
    C.check('Proof, embedded: no page errors', em.p.errs.length === 0, JSON.stringify(em.p.errs));
    await em.ctx.close();
  }

  await browser.close();
  process.exitCode = C.report() ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
