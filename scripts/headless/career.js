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
//
// Career Mode PHASE 3, rewards with meanings (the catalogue switch; career/CAREER_MODE.md, supabase/stage70_career_rewards.sql, spec §6, §8, §9, §12.5), the second
// half of this file: the stub profile is built in the shape get_profile() really answers (rwProfile(): a null inside a ladder entry, a badge row or an achievement
// row is not there; a retired badge row has no day or metal; `near` rows are id, name, have, next, pct), and the catalogue AA Proof fetches is career/*.toml through
// scripts/career_seed.py --json. Both apps are run with the switch OFF (the page is compared with the app as it was before phase 3, git ref CAREER_OFF_REF, default
// a219d5a: Today, Progress and the Locker in AA Proof; Home and the finish card in the training app) and ON:
//   AA Proof      Today's four numbers (the free cells tick at the tap, the coached ones are the server's) · the statgrid unchanged · the shelf by kind of win with a
//                 retired badge as "Earned before" · the Grand Slam row · ONE reveal once (a second boot, a second phone through the cloud merge, and a flip with a big
//                 back-pay jump are silent: no "XP system updated", no level-up, no reward takeover) · an award decided on a tick (a wins line, its XP at once, Share
//                 opens the medal, withdrawn when the server does not own it) · server moments: one full-screen per open, a level-up that opened keeps the award waiting
//                 and untold, the cap and the old rows · a dirty push and then the catalogue newly on: the XP does not move · cached profile, no catalogue copy, network
//                 blocked: boot renders · embed and the coach's preview silent · an event finished by a tick opens ONE takeover · the day streak's takeover still fires and
//                 its award never opens a second · 320 and 390 px, light and dark.
//   training app  the Career row's two new lines · the finish card's moves (three lines and "+N more", never clay) · Counting bands at Done, confirmed (or taken away) by
//                 the answer, only a DRAWN reward is marked seen and told, none from an old answer · moments (one per open, never from the cached answer, never over the
//                 Welcome or the rating, the catch-up, the Grand Slam's line, demo and preview silent) · the session queue never waits on any of it.
//   both apps     one reward, celebrated once: Proof's phone-decided milestone is told at its next answer and the training app opens silent (and the control without
//                 the catch-up), and the other way round.
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


// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Career Mode PHASE 3: rewards with meanings (the catalogue switch; career/CAREER_MODE.md, supabase/stage70_career_rewards.sql, spec §6, §8, §9, §12.5)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The stub profile follows the shape get_profile() really answers (scripts/career/rehearse_catalogue.mjs on PGlite): a null inside a ladder entry,
// a badge row or an achievement row is not there at all (jsonb_strip_nulls), a retired badge row carries only its id, subject, tier, of, name,
// meaning and superseded_by (never a day or a metal), `near` rows carry only id, name, have, next, pct, and `recent` rows have no created_at.
// `rwProfile()` builds one; the catalogue's rows (what AA Proof fetches from career_catalogue) are career/*.toml through scripts/career_seed.py --json.
const cp = require('child_process');
const REPO = path.join(__dirname, '..', '..');
let _catRows = null;
function catRows() {
  if (_catRows) return _catRows;
  for (const py of ['python', 'python3']) {
    try {
      const j = JSON.parse(cp.execFileSync(py, ['-X', 'utf8', path.join(REPO, 'scripts', 'career_seed.py'), '--json'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }));
      return (_catRows = j.catalogue.filter(r => ['badge', 'achievement', 'title', 'setting'].indexOf(r.kind) >= 0));
    } catch (e) { /* the next name */ }
  }
  throw new Error('career.js: could not run   python scripts/career_seed.py --json   (the catalogue AA Proof fetches)');
}
const gitShow = (ref, file) => cp.execFileSync('git', ['show', ref + ':' + file], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 << 20 });
// The app before phase 3 (phase 2 merged with main): with the catalogue off, both apps must draw exactly what this one draws.
const OFF_REF = process.env.CAREER_OFF_REF || 'a219d5a';
// jsonb_strip_nulls on one row: a null key is not there.
const strip = o => { const r = {}; Object.keys(o).forEach(k => { if (o[k] !== null && o[k] !== undefined) r[k] = o[k]; }); return r; };
const SWX = at(-40);                                                      // the XP switch's day in these profiles
// get_profile()'s ladder (a made-up athlete of the rehearsal): the entries the training app and AA Proof read, with the keys the server really leaves out.
const RW_LADDER = {
  held_weeks: { now: 2, have: 7, name: 'Hold Serve', next: 8, tier: 1, phone: 'week', counts: ['week_held'], meaning: 'consistency', next_tier: 2, size_next: 'highlight', metal_next: 'silver' },
  long_count: { have: 9, name: 'The Long Count', next: 10, phone: 'week', counts: ['week_held'], meaning: 'consistency', next_tier: 1, size_next: 'highlight', metal_next: 'bronze' },
  love_hold: { have: 1, name: 'Love Hold', next: 5, phone: 'week', counts: ['week_by_the_book'], meaning: 'commitment', next_tier: 1, size_next: 'win', metal_next: 'bronze' },
  finisher: { name: 'Closer', next: 1, phone: 'week', counts: ['cycle_finished'], meaning: 'commitment', next_tier: 1, size_next: 'milestone', metal_next: 'bronze' },
  century: { have: 24, name: 'Century', next: 25, tier: 1, phone: 'session', counts: ['session_finished', 'session_finished_early'], meaning: 'commitment', next_tier: 2, size_next: 'highlight', metal_next: 'silver' },
  full_log: { have: 9, name: 'Paper Trail', next: 10, phone: 'session', counts: ['full_log'], meaning: 'commitment', next_tier: 1, size_next: 'win', metal_next: 'bronze' },
  pulse_check: { have: 3, name: 'Pulse Check', next: 10, phone: 'session', counts: ['checkin_done'], meaning: 'commitment', next_tier: 1, size_next: 'win', metal_next: 'bronze' },
  bests: { have: 12, name: 'Record Breaker', next: 15, tier: 2, meaning: 'progress', next_tier: 3, size_next: 'milestone', metal_next: 'emerald' },
  comebacks: { name: 'HARD TO KILL', next: 3, meaning: 'resilience', next_tier: 1, size_next: 'highlight', metal_next: 'bronze' },
  day_streak: { have: 4, name: 'Day Streak', next: 7, tier: 1, meaning: 'consistency', next_tier: 2, size_next: 'milestone', metal_next: 'bronze' },
  habit_water: { have: 4, name: 'HUMAN SPRINKLER', next: 5, meaning: 'consistency', next_tier: 1, size_next: 'win', metal_next: 'bronze' },
  habit_steps: { name: 'GROUND COVERED', next: 5, meaning: 'consistency', next_tier: 1, size_next: 'win', metal_next: 'bronze' },
};
const RW_PRICES = { session_finished: 400, session_finished_early: 200, full_log: 50, checkin_done: 20, week_held: 400, bounce_back: 100, training_return: 50, library_session: 100, retest_done: 50 };
const RW_LEVEL = Object.assign({}, LEVEL);
const badgeSpec = (name, meaning, metal, tier, n, caption, date) => ({ kind: 'badge', name, meaning, metal, tier, n, caption, date: date || at(0) });
// A waiting moment, as get_profile() lists it (full: the server's own call, from the size and the age).
const mom = (id, size, full, xp, spec, extra) => Object.assign({ award_id: id, kind: id.split(':')[0], item: id.split(':')[1], tier: Number(id.split(':')[2]) || null,
  size, day: (spec && spec.date) || at(-1), full, xp, spec }, extra || {});
// One athlete's get_profile() with the catalogue on (o.S = the switch day, null = phase 2's answer with the catalogue off).
function rwProfile(xp, o = {}) {
  const S = o.S === undefined ? at(-3) : o.S;
  const free = !!o.free;
  const four = free
    ? { consistency: { key: 'day_streak', value: 4, best: 9 }, commitment: { key: 'perfect_days', value: 19 }, progress: { key: 'habit_steps', value: 6, locked: true }, resilience: { key: 'comebacks', value: 5 } }
    : { consistency: { key: 'weeks_held', value: 3, best: 7 }, commitment: { key: 'sessions_with_amir', value: o.sessions == null ? 24 : o.sessions }, progress: { key: 'personal_bests', value: 12 }, resilience: { key: 'comebacks', value: 5 } };
  const p = {
    athlete_id: H.ID, ready: true, shadow: false, switch: { xp: SWX, catalogue: S }, rules_version: 3,
    career: Object.assign({ xp, habits: {}, facts: {}, facts_xp: 0 }, lvl(xp)),
    season: { name: 'Season 2', starts_on: at(-30), points: 1234 }, week: { from: at(-6), points: 900 }, since: '2026-06-06', kept: null,
    numbers: { weeks_held: { now: 3, best: 7 }, sessions_with_amir: o.sessions == null ? 24 : o.sessions, personal_bests: 12, comebacks: 5, days_on_target: 88, perfect_days: 19, free },
    titles_owned: ['t_signed', 'clockwork'], rules: { version: 3, level: RW_LEVEL, season: { title_points: 2000 }, prices: RW_PRICES },
    missions: [], quest: null, badges: [], achievements: [], moments: [],
  };
  if (S === null) return p;
  p.numbers.four = o.four || four;
  return Object.assign(p, {
    catalogue_version: o.version || '4@1760774400',
    owned: Object.assign({ 'badge:held_weeks:1': at(-60), 'badge:held_weeks:2': at(-20), 'achievement:first_best': at(-50), 'badge:human_sprinkler:2': at(-45),
      'badge:habit_tiers:2:water': at(-45), 'title:clockwork': at(-20) }, o.owned || {}),
    badges: o.badges || [
      strip({ id: 'held_weeks', name: 'Hold Serve', meaning: 'consistency', tier: 2, of: 5, metal: 'silver', day: at(-20), n: 8, caption: '8 weeks held in a row. You keep showing up.' }),
      strip({ id: 'human_sprinkler', name: 'HUMAN SPRINKLER', meaning: 'consistency', tier: 2, of: 3, retired: true, superseded_by: 'habit_water' }),
      strip({ id: 'habit_tiers', subject: 'water', name: 'Consistency Tiers', meaning: 'consistency', tier: 2, of: 5, retired: true })],
    achievements: o.achievements || [{ id: 'first_best', name: 'First Best', meaning: 'progress', day: at(-50), size: 'highlight', caption: 'Your first personal best. Not the last.' }],
    titles: o.titles || [{ id: 'clockwork', hab_id: 'clockwork', name: 'CLOCKWORK', meaning: 'consistency', metal: 'prismatic', from: 'Hold Serve, prismatic: 52 weeks held in a row', day: at(-20), source: 'award' }],
    title_worn: o.worn === undefined ? null : o.worn,
    slam: o.slam || { consistency: { id: 'clockwork', name: 'CLOCKWORK', day: at(-20) }, commitment: null, progress: null, resilience: null, grand: null },
    ladder: o.ladder || RW_LADDER,
    near: o.near || [{ id: 'full_log', name: 'Paper Trail', have: 9, next: 10, pct: 90 }, { id: 'century', name: 'Century', have: 24, next: 25, pct: 96 }],
    moments: o.moments || [], recent: o.recent || [],
  });
}
const RW_RULES = [{ version: 4, switch: { xp: SWX, catalogue: 'off' } }];     // the training app's Hold Serve read; the catalogue switch is the profile's
const rwLog = (n = 6, more) => { const L = {}; for (let i = 1; i <= n; i++) L[at(-i)] = { water: 8, sleep: 8, steps: 11000, fuel: 3 }; return Object.assign(L, more || {}); };
// AA Proof on a catalogue profile: UTC (so "today" is this script's), the career reveal already shown (careerSeen), the catalogue as the server holds it.
const rwProof = (prof, extra = {}) => Object.assign({ tz: 'UTC' }, extra, {
  seed: Object.assign({ _hab_log: extra.log || rwLog() }, extra.seed || {}),
  stub: Object.assign({ profile: prof, tables: { career_rules: RW_RULES, career_facts: [], career_catalogue: catRows() } }, extra.stub || {}),
  cfg: Object.assign({ careerSeen: SWX }, extra.cfg || {}) });
const ev = (p, src) => p.evaluate(src);
const toldCalls = p => p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'mark_moments_told').map(x => x[1]));
const celebrating = p => p.evaluate(() => UI.celebrate.map(e => (e.kind || 'level') + (e.id ? ':' + e.id : '')));
const swallowTakeovers = p => p.evaluate(() => { UI.celebrate = []; UI.celebrateLater = []; UI.toast = null; render(); });
// Opens a page of `file` ('/habits.html' or '/program.html') as it was at OFF_REF: the browser wrapper registers its route after the harness's own, so it answers first.
function atBaseline(browser, files) {
  return { newContext: async (...a) => {
    const ctx = await browser.newContext(...a);
    const np = ctx.newPage.bind(ctx);
    ctx.newPage = async () => {
      await ctx.route(u => u.origin === new URL(H.BASE).origin && Object.prototype.hasOwnProperty.call(files, u.pathname),
        r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: files[new URL(r.request().url()).pathname] }));
      return np();
    };
    return ctx;
  } };
}
// What a screen drew, without what moves on its own (staggered delays, a changing id).
const normHTML = s => s.replace(/data-h="h[a-z0-9]+"/g, 'data-h').replace(/animation-delay:[^;"]+/g, '').replace(/data-full="[^"]*"/g, '').replace(/<div class="say"[^>]*>[^<]*<\/div>/g, '')
  .replace(/\s+style="[^"]*"/g, m => m.replace(/(?:--[a-z-]+|animation[a-z-]*|transition[a-z-]*):[^;"]*;?/g, '')).replace(/\s+/g, ' ');
function firstDiff(a, b) { let i = 0; while (i < a.length && a[i] === b[i]) i++; return 'diff at ' + i + ': before ' + JSON.stringify(a.slice(Math.max(0, i - 50), i + 110)) + ' now ' + JSON.stringify(b.slice(Math.max(0, i - 50), i + 110)); }

// ── AA Proof, catalogue switch on and off (spec §8) ──────────────────────────────────────────────────────────────────────────────────────
async function proofCatalogue(browser, C) {
  const OUT = H.outDir();
  const shot = (p, name) => p.screenshot({ path: path.join(OUT, name) }).catch(() => {});
  const S3 = at(-3);
  // 1. switch off: AA Proof draws exactly what it drew before phase 3 (Today, Progress, the Locker), and never asks for the catalogue
  {
    const baseHtml = gitShow(OFF_REF, 'habits.html');
    const one = async (base, prof) => {
      const o = rwProof(prof, { cfg: { careerSeen: prof ? SWX : null } });
      const { ctx, p } = await H.openProof(base ? atBaseline(browser, { '/habits.html': baseHtml }) : browser, Object.assign({ w: 390, h: 844 }, o));
      await p.waitForTimeout(1500);
      await p.evaluate(() => { UI.celebrate = []; render(); });
      const out = {};
      for (const tab of ['today', 'progress', 'pass']) {
        await p.evaluate(t => { go(t); }, tab);
        await p.waitForTimeout(300);
        out[tab] = normHTML(await p.evaluate(() => document.querySelector('#scroll').innerHTML));
      }
      out.catCalls = await calls(p, 'from:career_catalogue');
      out.errs = p.errs.slice();
      await ctx.close();
      return out;
    };
    for (const [label, prof] of [['no profile', null], ['phase 2 profile, catalogue switch null', rwProfile(10000, { S: null })]]) {
      const a = await one(true, prof), b = await one(false, prof);
      ['today', 'progress', 'pass'].forEach(t => C.check(`Proof, catalogue off (${label}): ${t} is drawn as before phase 3`, a[t] === b[t], a[t] === b[t] ? a[t].length + ' chars' : firstDiff(a[t], b[t])));
      C.check(`Proof, catalogue off (${label}): the catalogue is never asked for`, b.catCalls === 0, b.catCalls);
      C.check(`Proof, catalogue off (${label}): no page errors`, b.errs.length === 0, JSON.stringify(b.errs));
    }
  }
  // 2. the switch on, first open: ONE reveal, no toast, nothing else queued; the four numbers; the shelf; the Grand Slam row
  {
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(10000)));
    await p.waitForFunction(() => !!document.querySelector('.lvwrap[data-k^="cel:catalogue:"]'), null, { timeout: 8000 }).catch(() => {});
    const q = await celebrating(p);
    C.check('Proof, on: ONE catalogue reveal and nothing else queued', q.length === 1 && q[0] === 'catalogue:' + S3, JSON.stringify(q));
    const rv = await ev(p, `(() => { const w = document.querySelector('.lvwrap[data-k^="cel:catalogue:"]'); return w ? w.innerText.replace(/\\s+/g, ' ') : null; })()`);
    C.check('Proof, on: the reveal says "Your record" and counts the four kinds of win', rv && /YOUR RECORD/i.test(rv) && /Consistency · 4/.test(rv) && /Progress · 1/.test(rv) && /Everything you've earned, counted once and kept for good\./.test(rv), rv);
    C.check('Proof, on: no "XP system updated" toast', !String(await ev(p, `UI.toast || ''`)).includes('XP system'));
    await p.waitForTimeout(2200);
    await shot(p, 'p3-proof-reveal-390.png');
    const st = await ev(p, `({ seen: CFG.catalogueSeen, held: !!CFG.heldBefore, aw: (CFG.seenAwards || []).length, cat: !!CATALOGUE, ready: catalogueReady() })`);
    C.check('Proof, on: catalogueSeen is the switch day, heldBefore kept, every owned award recorded as seen, the catalogue copy fetched', st.seen === S3 && st.held && st.aw >= 6 && st.cat && st.ready, JSON.stringify(st));
    C.check('Proof, on: the catalogue copy is kept on this phone and is never in the synced config', !!(await ev(p, `localStorage.getItem(ATHLETE_ID + '_hab_catalogue')`))
      && !(await ev(p, `JSON.stringify(CFG)`)).includes('proof_codes'));
    await swallowTakeovers(p);
    const h4 = await ev(p, `[...document.querySelectorAll('.hero4 .h4')].map(b => b.innerText.replace(/\\s+/g, ' ').trim())`);
    C.check('Proof, on: Today has the four numbers, coached (Weeks held · best 7, Sessions with Amir, Personal bests, Comebacks)',
      h4.length === 4 && /^3 Weeks held · best 7$/i.test(h4[0]) && /^24 Sessions with Amir$/i.test(h4[1]) && /^12 Personal bests$/i.test(h4[2]) && /^5 Comebacks$/i.test(h4[3]), JSON.stringify(h4));
    await ev(p, `(go('progress'), 0)`);
    await p.waitForTimeout(300);
    const sg = await ev(p, `[...document.querySelectorAll('.statgrid > div .eyebrow')].map(e => e.textContent.trim())`);
    C.check('Proof, on: the statgrid is unchanged (Days logged · Milestones · Day streak · Perfect days)', sg.length === 4 && /Days logged/i.test(sg[0]) && /Milestones/i.test(sg[1]) && /Day streak/i.test(sg[2]) && /Perfect days/i.test(sg[3]), JSON.stringify(sg));
    C.check('Proof, on: Milestones counts the owned badge tiers and milestones', /^5\//.test(await ev(p, `document.querySelector('.statgrid .statfrac').textContent`)));
    await ev(p, `((CFG.msOpen || (CFG.msOpen = {})).all = true, render())`);
    await p.waitForTimeout(200);
    const groups = await ev(p, `[...document.querySelectorAll('[data-k^="mstoggle:"]')].map(e => e.getAttribute('data-k'))`);
    C.check('Proof, on: the shelf is grouped by the four kinds of win', ['consistency', 'commitment', 'progress', 'resilience'].every(m => groups.indexOf('mstoggle:' + m) >= 0), JSON.stringify(groups));
    const water = await ev(p, `(() => { const r = document.querySelector('[data-k="aw:badge:habit_water"]'); return r ? r.innerText.replace(/\\s+/g, ' ') : null; })()`);
    C.check('Proof, on: a retired badge is "Earned before" under its successor', water && /Earned before: .*HUMAN SPRINKLER II/.test(water), water);
    C.check('Proof, on: a retired badge is not a row of its own', !(await ev(p, `!!document.querySelector('[data-k="aw:badge:human_sprinkler"]')`)));
    await ev(p, `(go('pass'), 0)`);
    await p.waitForTimeout(300);
    const slam = await ev(p, `(() => { const r = document.querySelector('.slamrow'); return r ? r.innerText.replace(/\\s+/g, ' ') : null; })()`);
    C.check('Proof, on: the Locker opens with the Grand Slam row, "Not yet" in the three empty slots', slam && /CLOCKWORK/.test(slam) && (slam.match(/Not yet/g) || []).length === 3, slam);
    C.check('Proof, on: the Grand Slam row has no padlock', slam && !/🔒/.test(slam), slam);
    const rail = await ev(p, `[...document.querySelectorAll('.lo-rail .plate')].map(b => b.textContent.trim())`);
    C.check('Proof, on: the catalogue title CLOCKWORK is on the title rail', rail.some(t => /CLOCKWORK/.test(t)), JSON.stringify(rail));
    C.check('Proof, on: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    // a second boot on this phone: silent
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    C.check('Proof, on, the second boot: no second reveal', (await ev(p, `UI.celebrate.filter(e => e.kind === 'catalogue').length`)) === 0);
    await ctx.close();
  }
  // another phone: catalogueSeen came through the cloud merge
  {
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(10000), { cfg: { catalogueSeen: S3 } }));
    await p.waitForTimeout(2000);
    C.check('Proof, another phone (catalogueSeen merged in): no reveal, no takeover', (await ev(p, `UI.celebrate.length`)) === 0, JSON.stringify(await celebrating(p)));
    // a phone that held the levels from before the flip: the flip is a silent re-baseline (no toast; the reveal was the other phone's)
    const t = await ev(p, `(CFG.seen = currentLevels(), CFG.rulesSig = rulesSignature(true), UI.toast = null, checkLevelUps(), ({ toast: UI.toast, cel: UI.celebrate.length, sig: CFG.rulesSig === rulesSignature() }))`);
    C.check('Proof, another phone: the flip is a silent re-baseline (no "XP system updated")', !t.toast && t.cel === 0 && t.sig, JSON.stringify(t));
    await ctx.close();
  }
  // the back-pay jump: the profile flips to the catalogue AND the career XP jumps by what the history paid; one reveal, no level-ups, no reward takeovers
  {
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(10000, { S: null })));
    await p.waitForTimeout(1500);
    C.check('Proof, the flip: before it nothing is queued', (await ev(p, `UI.celebrate.length`)) === 0);
    const lv0 = await ev(p, `overallLevel().lv`);
    await ev(p, `(window.__STUB.profile = ${JSON.stringify(rwProfile(18000))}, 0)`);
    await ev(p, `fetchCareer()`);
    await p.waitForTimeout(800);
    const q = await celebrating(p), lv1 = await ev(p, `overallLevel().lv`);
    C.check('Proof, the flip with a big back-pay jump: the level really rose', lv1 > lv0 + 1, [lv0, lv1]);
    C.check('Proof, the flip with a big back-pay jump: ONE reveal, no level-up and no reward takeover behind it', q.length === 1 && /^catalogue:/.test(q[0]), JSON.stringify(q));
    C.check('Proof, the flip with a big back-pay jump: levels re-baselined in silence, no toast', (await ev(p, `CFG.seen._overall`)) === lv1 && !String(await ev(p, `UI.toast || ''`)).includes('XP system'), await ev(p, `JSON.stringify([CFG.seen._overall, UI.toast])`));
    C.check('Proof, the flip: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // the Grand Slam complete: all four slots filled and the fifth plate, GRAND SLAM, with no "Not yet" left
  {
    const slam = { consistency: { id: 'clockwork', name: 'CLOCKWORK', day: at(-9) }, commitment: { id: 'sun_forged', name: 'SUN-FORGED', day: at(-8) }, progress: { id: 'proven', name: 'PROVEN', day: at(-7) },
      resilience: { id: 'second_wind', name: 'SECOND WIND', day: at(-6) }, grand: { id: 'grand_slam', name: 'GRAND SLAM', day: at(-1) } };
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(10000, { slam, owned: { 'title:grand_slam': at(-1) },
      titles: [{ id: 'grand_slam', hab_id: 'grand_slam', name: 'GRAND SLAM', meaning: 'all', metal: 'prismatic', from: 'A title in all four', day: at(-1), source: 'award' }] }), { cfg: { catalogueSeen: S3 } }));
    await p.waitForTimeout(2000);
    await ev(p, `(go('pass'), 0)`);
    await p.waitForTimeout(300);
    const g = await ev(p, `({ row: (document.querySelector('.slamrow') || { innerText: '' }).innerText.replace(/\\s+/g, ' '), grand: !!document.querySelector('.slam-grand') })`);
    C.check('Proof, the Grand Slam complete: four titles, the fifth plate GRAND SLAM, no "Not yet"', g.grand && /CLOCKWORK/.test(g.row) && /SUN-FORGED/.test(g.row) && /PROVEN/.test(g.row) && /SECOND WIND/.test(g.row) && !/Not yet/.test(g.row), JSON.stringify(g));
    await shot(p, 'p3-proof-locker-grand-slam.png');
    C.check('Proof, the Grand Slam complete: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 3. a phone-decided award: its wins line and its XP at once, Share opens the medal, then withdrawn when the server says no
  {
    const prof = rwProfile(10000), waterLog = {};
    for (let i = 1; i <= 4; i++) waterLog[at(-i)] = { water: 8 };       // four days of full water: today's tick makes five
    const { ctx, p } = await H.openProof(browser, rwProof(prof, { log: waterLog, cfg: { catalogueSeen: S3 } }));
    await p.waitForTimeout(2500);
    const xp0 = await ev(p, `careerXp()`);
    await ev(p, `(setVal('water', 8), actionLevelUps(), render(), 0)`);
    const pend = await ev(p, `phoneAwards().map(a => a.award_id + ':' + a.xp + ':' + a.size + ':' + a.day)`);
    C.check('Proof, a tick that makes five days of water: the phone decides habit_water tier 1 at once (20 XP, a win, today)', pend.some(x => x === 'badge:habit_water:1:20:win:' + at(0)), JSON.stringify(pend));
    const wins = await ev(p, `(CFG.wins || []).filter(w => w.k === 'award').map(w => w.id)`);
    C.check('Proof, the award lands on the wins card at the tap', wins.indexOf('badge:habit_water:1') >= 0, JSON.stringify(wins));
    const line = await ev(p, `(() => { const w = document.querySelector('.wins'); return w ? w.innerText.replace(/\\s+/g, ' ') : null; })()`);
    C.check('Proof, the wins line names it with its metal and its XP', line && /HUMAN SPRINKLER · Bronze/.test(line) && /\+20/.test(line), line);
    const xp = await ev(p, `({ shown: careerXp(), pend: pendingAwardXp(), water: xpFor(habitById('water'), 8) })`);
    C.check('Proof, the tick moves the career XP by the habit AND the pending award at once (GAME-13)', xp.pend === 20 && xp.shown === xp0 + xp.water + 20, JSON.stringify([xp0, xp]));
    await ev(p, `openShare('medal', { medal: { k: 'award', id: 'badge:habit_water:1' } })`);
    await p.waitForTimeout(400);
    const m = await ev(p, `JSON.stringify(medalFor({ k: 'award', id: 'badge:habit_water:1' }))`);
    C.check('Proof, Share opens the Milestone card on the award: its kind of win\'s emoji, its metal, its eyebrow', /"emoji":"🔁"/.test(m) && /"metal":"bronze"/.test(m) && /CONSISTENCY/.test(m), m);
    await ev(p, `(UI.share = null, render())`);
    // withdrawal: the push lands, the answer after it lacks the award
    await p.waitForTimeout(3500);
    const wd = await ev(p, `({ wd: loadWithdrawn(), pend: pendingAwardXp(), wins: (CFG.wins || []).filter(w => w.k === 'award').map(w => w.id), pushOk: _pushOkAt > 0, shown: careerXp() })`);
    C.check('Proof, withdrawal: after a push the server lacks it, it is withdrawn, its line and its XP leave (careerXp() and the wins card)', wd.pushOk && wd.wd.indexOf('badge:habit_water:1') >= 0 && wd.wins.indexOf('badge:habit_water:1') < 0 && wd.pend === 0, JSON.stringify(wd));
    C.check('Proof, withdrawal: the XP shown falls by exactly what the pending award had added', wd.shown <= xp.shown - 20, JSON.stringify([xp.shown, wd.shown]));
    // and when the server owns it: nothing withdrawn, nothing pending, no second line
    await ev(p, `(localStorage.removeItem(ATHLETE_ID + '_hab_awwd'), _awwd = null, 0)`);
    const own = JSON.parse(JSON.stringify(prof)); own.owned['badge:habit_water:1'] = at(0); own.career.xp = 10020;
    await ev(p, `(window.__STUB.profile = ${JSON.stringify(own)}, 0)`);
    await ev(p, `fetchCareer()`);
    await p.waitForTimeout(300);
    const ok = await ev(p, `({ wd: loadWithdrawn().length, pend: pendingAwardXp() })`);
    C.check('Proof, the server owns it: nothing withdrawn, nothing pending', ok.wd === 0 && ok.pend === 0, JSON.stringify(ok));
    C.check('Proof, phone-decided award: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 4. server moments: ONE full-screen per open, told once, the rest wait; a level-up that opened this run keeps the award waiting
  {
    const moments = [
      mom('badge:held_weeks:3', 'milestone', true, 600, badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, '12 weeks held in a row. You keep showing up.', at(-1))),
      mom('badge:century:2', 'milestone', true, 600, badgeSpec('Century', 'commitment', 'silver', 2, 50, '50 sessions with Amir.', at(-1))),
      mom('badge:full_log:1', 'win', false, 100, badgeSpec('Paper Trail', 'commitment', 'bronze', 1, 10, '10 sessions with every set logged.', at(-1)))];
    const prof = rwProfile(10000, { moments, owned: { 'badge:held_weeks:3': at(-1), 'badge:century:2': at(-1), 'badge:full_log:1': at(-1) } });
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(10000), { cfg: { catalogueSeen: S3 } }));
    await p.waitForTimeout(2500);
    C.check('Proof, moments: the boot before them is quiet', (await ev(p, `UI.celebrate.length`)) === 0);
    await ev(p, `(window.__STUB.profile = ${JSON.stringify(prof)}, 0)`);
    await ev(p, `fetchCareer()`);
    await p.waitForTimeout(400);
    const q = await celebrating(p);
    C.check('Proof, moments: ONE full-screen award opens, the biggest first', q.length === 1 && q[0] === 'award:badge:held_weeks:3', JSON.stringify(q));
    const tk = await ev(p, `(() => { const w = document.querySelector('.lvwrap'); return w ? w.innerText.replace(/\\s+/g, ' ') : null; })()`);
    await p.waitForTimeout(2200);
    await shot(p, 'p3-proof-award-390.png');
    C.check('Proof, moments: the takeover names it (kind of win, name · metal, caption, the milestone line)', tk && /CONSISTENCY/i.test(tk) && /HOLD SERVE · EMERALD/i.test(tk) && /12 weeks held/.test(tk) && /That one took weeks/.test(tk), tk);
    const told = await toldCalls(p);
    C.check('Proof, moments: the shown ones are told on the server as "proof", the waiting full one is not', told.length >= 1 && told.every(t => t.p_app === 'proof' && t.p_award_ids.indexOf('badge:held_weeks:3') >= 0
      && t.p_award_ids.indexOf('badge:full_log:1') >= 0 && t.p_award_ids.indexOf('badge:century:2') < 0), JSON.stringify(told));
    const seen = await ev(p, `CFG.seenAwards`);
    C.check('Proof, moments: the waiting full one stays out of seenAwards', seen.indexOf('badge:century:2') < 0 && seen.indexOf('badge:held_weeks:3') >= 0, JSON.stringify(seen));
    C.check('Proof, moments: the win-size one is a wins line', await ev(p, `(CFG.wins || []).some(w => w.k === 'award' && w.id === 'badge:full_log:1')`));
    await p.click('.lvshare').catch(() => {});
    await p.waitForTimeout(300);
    C.check('Proof, moments: Share it opens the Milestone card on the award', (await ev(p, `JSON.stringify(UI.share && UI.share.subj && UI.share.subj.medal)`)) === JSON.stringify({ k: 'award', id: 'badge:held_weeks:3' }));
    await ev(p, `(UI.share = null, UI.celebrate = [], UI.celebrateLater = [], render(), 0)`);
    await ev(p, `fetchCareer()`);
    await p.waitForTimeout(300);
    C.check('Proof, moments: in the same run the second full one waits for the next open', (await ev(p, `UI.celebrate.length`)) === 0);
    C.check('Proof, moments: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // one full-screen per open covers EVERYTHING full-screen: a level-up that opened this visit keeps the award waiting and untold
  {
    const m = mom('badge:held_weeks:3', 'milestone', true, 600, badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, '12 weeks held in a row.', at(-1)));
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(10000), { cfg: { catalogueSeen: S3 } }));
    await p.waitForTimeout(2500);
    await ev(p, `(CFG.seen._overall = overallLevel().lv - 1, saveCfg(), 0)`);
    await ev(p, `(window.__STUB.profile = ${JSON.stringify(rwProfile(10200, { moments: [m], owned: { 'badge:held_weeks:3': at(-1) } }))}, 0)`);
    await ev(p, `fetchCareer()`);
    await p.waitForTimeout(500);
    const q = await celebrating(p);
    C.check('Proof, a level-up opened this visit: it is the open\'s one full-screen moment, the award does not open', q.length === 1 && /^level/.test(q[0]), JSON.stringify(q));
    C.check('Proof, …and the award stays unseen and untold, waiting for the next open', (await ev(p, `CFG.seenAwards.indexOf('badge:held_weeks:3')`)) < 0
      && (await toldCalls(p)).every(t => t.p_award_ids.indexOf('badge:held_weeks:3') < 0), JSON.stringify(await toldCalls(p)));
    // a moment EARNED BY ACTING in this visit opens right then, even though something opened at boot (a tick, spec §7.6)
    await ev(p, `(UI.celebrate = [], _fullThisRun = true, render(), 0)`);
    await ev(p, `(setVal('water', 8), actionLevelUps(), 0)`);
    C.check('Proof, no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // a full row older than keep_days arrives with full:false: told as a wins line, never a stale takeover
  {
    const old = mom('badge:held_weeks:3', 'milestone', false, 600, badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, '12 weeks held in a row.', at(-20)));
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(10000), { cfg: { catalogueSeen: S3 } }));
    await p.waitForTimeout(2000);
    await ev(p, `(window.__STUB.profile = ${JSON.stringify(rwProfile(10000, { moments: [old], owned: { 'badge:held_weeks:3': at(-20) } }))}, 0)`);
    await ev(p, `fetchCareer()`);
    await p.waitForTimeout(400);
    C.check('Proof, a milestone not shown within the keep days is a wins line, not a takeover', (await ev(p, `UI.celebrate.length`)) === 0
      && await ev(p, `(CFG.wins || []).some(w => w.k === 'award' && w.id === 'badge:held_weeks:3')`));
    await ctx.close();
  }
  // 5. a dirty push, then the catalogue newly on: the XP shown does not move
  {
    const log = {}; for (let i = 1; i <= 25; i++) log[at(-i)] = { water: 8, sleep: 8, steps: 11000, fuel: 3 };
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(20000, { S: null }), { log }));
    await p.waitForTimeout(2000);
    const before = await ev(p, `({ xp: overallXp(), tiers: bonusEvents().filter(e => e.kind === 'tier' || e.kind === 'milestone').length })`);
    await ev(p, `(SYNC.dirty = true, _pushedXp = phoneXp(), 0)`);
    await ev(p, `(window.__STUB.profile = ${JSON.stringify(rwProfile(20000, { S: at(-1) }))}, 0)`);
    await ev(p, `fetchCareer()`);
    await p.waitForTimeout(500);
    const after = await ev(p, `({ xp: overallXp(), tiers: bonusEvents().filter(e => e.kind === 'tier' || e.kind === 'milestone').length, cat: catalogueOn(), pend: pendingAwardXp() })`);
    C.check('Proof, the flip: tiers and milestones leave this phone\'s ledger', before.tiers > 0 && after.tiers === 0 && after.cat, JSON.stringify([before, after]));
    C.check('Proof, a dirty push and then the catalogue newly on: the XP shown does not move', after.xp - after.pend === before.xp, JSON.stringify([before, after]));
    await ctx.close();
  }
  // 6. a cached profile with the catalogue on, no catalogue copy, the network blocked: boot renders #app
  {
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(10000), { cfg: { catalogueSeen: S3 } }));
    await p.waitForTimeout(2000);
    await p.evaluate(() => { localStorage.removeItem(ATHLETE_ID + '_hab_catalogue'); const c = JSON.parse(localStorage.getItem('__stubcfg')); c.mode = 'offline'; localStorage.setItem('__stubcfg', JSON.stringify(c)); });
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('app') && document.getElementById('app').textContent.length > 200, null, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const s = await ev(p, `({ on: catalogueOn(), ready: catalogueReady(), app: document.getElementById('app').textContent.length, h4: document.querySelectorAll('.hero4 .h4').length, pend: pendingAwardXp() })`);
    C.check('Proof, offline with the profile cached and no catalogue copy: boot renders #app, the four numbers from the profile, no phone scoring', s.on && !s.ready && s.app > 200 && s.h4 === 4 && s.pend === 0, JSON.stringify(s));
    C.check('Proof, offline: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 7. embed and preview
  {
    const prof = rwProfile(10000);
    const em = await H.openProof(browser, rwProof(prof, { url: '/habits.html?embed=1', seed: { _hab_career: { p: prof, at: Date.now(), base: 0 } } }));
    await em.p.waitForTimeout(1500);
    C.check('Proof, embedded: no profile asked, no catalogue, no moment, nothing told', (await calls(em.p, 'rpc:get_profile')) === 0 && (await calls(em.p, 'from:career_catalogue')) === 0
      && (await calls(em.p, 'rpc:mark_moments_told')) === 0 && (await ev(em.p, `UI.celebrate.length`)) === 0);
    C.check('Proof, embedded: no page errors', em.p.errs.length === 0, JSON.stringify(em.p.errs));
    await em.ctx.close();
    const m = mom('badge:held_weeks:3', 'milestone', true, 600, badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, 'x', at(-1)));
    const pv = await H.openProof(browser, rwProof(rwProfile(10000, { moments: [m], owned: { 'badge:held_weeks:3': at(-1) } }), { url: '/habits.html?preview=1' }));
    await pv.p.waitForTimeout(2000);
    const w = await ev(pv.p, `({ cat: localStorage.getItem(ATHLETE_ID + '_hab_catalogue'), told: (window.__STUB.calls || []).filter(c => c === 'rpc:mark_moments_told').length, cel: UI.celebrate.length, seen: CFG.catalogueSeen, awwd: localStorage.getItem(ATHLETE_ID + '_hab_awwd') })`);
    C.check('Proof, the coach\'s preview: nothing written, nothing told, no reveal', !w.cat && w.told === 0 && w.cel === 0 && !w.seen && !w.awwd, JSON.stringify(w));
    C.check('Proof, the coach\'s preview: no page errors', pv.p.errs.length === 0, JSON.stringify(pv.p.errs));
    await pv.ctx.close();
  }
  // 8. a free athlete: Day streak · Perfect days · Habit steps · Comebacks, the first two move at the tap, the Progress kind of win is locked
  {
    const prog = H.fixture();
    prog.athlete = Object.assign({}, prog.athlete, { tier: 'free' });
    const { ctx, p } = await H.openProof(browser, Object.assign(rwProof(rwProfile(10000, { free: true }), { cfg: { catalogueSeen: S3 } }), { prog }));
    await p.waitForTimeout(2000);
    const h4 = await ev(p, `[...document.querySelectorAll('.hero4 .h4 .eyebrow')].map(b => b.textContent.trim())`);
    C.check('Proof, free: Day streak · Perfect days · Habit steps · Comebacks', h4.length === 4 && /^Day streak/.test(h4[0]) && h4[1] === 'Perfect days' && h4[2] === 'Habit steps' && h4[3] === 'Comebacks', JSON.stringify(h4));
    const fig = () => ev(p, `Object.fromEntries([...document.querySelectorAll('.hero4 .figure')].map(f => [f.getAttribute('data-num'), Number(f.getAttribute('data-to'))]))`);
    const a = await fig();
    await ev(p, `(HABITS.filter(h => h.id !== 'water').forEach(h => setVal(h.id, h.target)), setVal('water', 8), actionLevelUps(), render(), 0)`);
    const b = await fig();
    C.check('Proof, free: the day streak cell moves at the tap, the perfect days cell moves at the tap', b.h4consistency === a.h4consistency + 1 && b.h4commitment === a.h4commitment + 1, JSON.stringify([a, b]));
    C.check('Proof, free: the comebacks cell is the server\'s (no move)', b.h4resilience === a.h4resilience, JSON.stringify([a, b]));
    await ev(p, `(openWins('progress'), 0)`);
    await p.waitForTimeout(400);
    const locked = await ev(p, `(() => { const e = document.querySelector('[data-k="msfree"]'); return e ? e.textContent.trim() : null; })()`);
    C.check('Proof, free: the Progress kind of win is locked with its line, and a number opens Progress', locked === 'Coached athletes earn these from their programme.' && (await ev(p, `UI.screen`)) === 'progress', locked);
    C.check('Proof, free: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
    // coached: the server's cells do not move at a tap
    const c2 = await H.openProof(browser, rwProof(rwProfile(10000), { cfg: { catalogueSeen: S3 } }));
    await c2.p.waitForTimeout(2000);
    const f2 = () => ev(c2.p, `Object.fromEntries([...document.querySelectorAll('.hero4 .figure')].map(f => [f.getAttribute('data-num'), Number(f.getAttribute('data-to'))]))`);
    const a2 = await f2();
    await ev(c2.p, `(HABITS.forEach(h => setVal(h.id, h.target)), actionLevelUps(), render(), 0)`);
    C.check('Proof, coached: the four numbers are the server\'s, a tap moves none of them', JSON.stringify(await f2()) === JSON.stringify(a2), JSON.stringify([a2, await f2()]));
    await c2.ctx.close();
  }
  // 9. an event finished by a tick: ONE takeover; the day streak keeps its own takeover and its award never opens a second one
  {
    const log = {};
    for (let i = 1; i <= 19; i++) log[at(-i)] = { strength: 1, water: 8, sleep: 8, steps: 11000, fuel: 3 };
    log[at(0)] = { strength: 1, water: 8, sleep: 8, steps: 11000 };
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(30000, { S: at(-30) }), { log, cfg: { catalogueSeen: at(-30) } }));
    await p.waitForTimeout(2500);
    await ev(p, `(CFG.pass = CFG.pass || { owned: [], title: null, card: null }, CFG.pass.owned = PASS_TRACK.map(t => t.id), saveCfg(), 0)`);   // the road's rewards: claimed long ago
    await ev(p, `(UI.celebrate = [], _fullThisRun = true, render(), 0)`);
    await ev(p, `(setVal('fuel', 3), actionLevelUps(), render(), 0)`);
    await p.waitForTimeout(200);
    const q = await celebrating(p);
    const awards = q.filter(x => /^award:/.test(x)), rewards = q.filter(x => /^reward:/.test(x));
    C.check('Proof, an event finished by a tick (THE FOUNDRY): ONE takeover, no reward takeover', rewards.length === 0 && awards.length <= 1
      && (awards[0] === 'award:achievement:the_foundry' || q.some(x => /^level/.test(x))), JSON.stringify(q));
    const ds = await ev(p, `phoneAwards().filter(a => /day_streak/.test(a.award_id)).map(a => a.award_id)`);
    const dsSeen = await ev(p, `(CFG.seenAwards || []).filter(x => /day_streak/.test(x))`);
    C.check('Proof, the day streak\'s pending awards are recorded as seen, never a takeover of their own', ds.every(x => dsSeen.indexOf(x) >= 0) && !q.some(x => /award:badge:day_streak/.test(x)), JSON.stringify([ds, dsSeen]));
    C.check('Proof, event: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // the day-streak takeover still fires when a streak is crossed again (D17), and the award never opens a second one
  {
    const log = rwLog(6);
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(10000, { S: at(-30), owned: { 'badge:day_streak:1': at(-25), 'badge:day_streak:2': at(-20) } }), { log, cfg: { catalogueSeen: at(-30), seenStreak: 3 } }));
    await p.waitForTimeout(2500);
    await ev(p, `(CFG.pass = CFG.pass || { owned: [], title: null, card: null }, CFG.pass.owned = PASS_TRACK.map(t => t.id), saveCfg(), 0)`);   // the road's rewards: claimed long ago
    await ev(p, `(UI.celebrate = [], render(), 0)`);
    const streak0 = await ev(p, `currentDayStreak()`);
    await ev(p, `(setVal('water', 8), setVal('sleep', 8), setVal('steps', 11000), setVal('fuel', 3), actionLevelUps(), render(), 0)`);
    const q = await celebrating(p);
    C.check('Proof, a new streak crossing the 7 mark again: the day-streak takeover still fires (once)', streak0 === 6 && q.filter(x => /^streak:s7$/.test(x)).length === 1, JSON.stringify([streak0, q]));
    C.check('Proof, …and the day-streak award opens no takeover of its own', !q.some(x => /^award:/.test(x)) && (await ev(p, `(CFG.seenAwards || []).indexOf('badge:day_streak:2')`)) >= 0, JSON.stringify(q));
    await ev(p, `(actionLevelUps(), render(), 0)`);
    C.check('Proof, …and a second pass does not fire it again', (await celebrating(p)).filter(x => /^streak:s7$/.test(x)).length === 1);
    await ctx.close();
  }
  // 10. 320 and 390 px, light and dark: the four numbers wrap 2 x 2 under 360 px, nothing runs sideways
  for (const w of [320, 390]) for (const dark of [false, true]) {
    const { ctx, p } = await H.openProof(browser, Object.assign(rwProof(rwProfile(10000), { cfg: { catalogueSeen: S3 } }), { w, dark }));
    await p.waitForTimeout(1500);
    await swallowTakeovers(p);
    const g = await ev(p, `(() => { const cells = [...document.querySelectorAll('.hero4 .h4')].map(b => b.getBoundingClientRect()); const sc = document.getElementById('scroll');
      return { rows: new Set(cells.map(r => Math.round(r.top))).size, right: Math.max(...cells.map(r => r.right)), vw: innerWidth, sideways: sc.scrollWidth > sc.clientWidth + 1 }; })()`);
    C.check(`Proof ${w}px${dark ? ' dark' : ''}: the four numbers fit (${w < 360 ? '2 x 2' : 'one row'}), no sideways scroll`, g.rows === (w < 360 ? 2 : 1) && g.right <= w && !g.sideways, JSON.stringify(g));
    await shot(p, `p3-proof-today-${w}${dark ? '-dark' : ''}.png`);
    await ev(p, `(go('pass'), 0)`);
    await p.waitForTimeout(300);
    const lk = await ev(p, `({ sideways: document.getElementById('scroll').scrollWidth > document.getElementById('scroll').clientWidth + 1 })`);
    C.check(`Proof ${w}px${dark ? ' dark' : ''}: the Locker with the Grand Slam row has no sideways scroll`, !lk.sideways, JSON.stringify(lk));
    await shot(p, `p3-proof-locker-${w}${dark ? '-dark' : ''}.png`);
    await ev(p, `((CFG.msOpen || (CFG.msOpen = {})).all = true, go('progress'), 0)`);
    await p.waitForTimeout(300);
    const pr = await ev(p, `({ sideways: document.getElementById('scroll').scrollWidth > document.getElementById('scroll').clientWidth + 1 })`);
    C.check(`Proof ${w}px${dark ? ' dark' : ''}: the shelf has no sideways scroll`, !pr.sideways, JSON.stringify(pr));
    await p.evaluate(() => { const s = document.querySelector('[data-k="mstoggle:consistency"]'); if (s) s.scrollIntoView(); });
    await shot(p, `p3-proof-progress-${w}${dark ? '-dark' : ''}.png`);
    C.check(`Proof ${w}px${dark ? ' dark' : ''}: no page errors`, p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
}

// ── The training app, catalogue switch on and off (spec §9) ───────────────────────────────────────────────────────────────────────────────
const params = (p, name) => p.evaluate(n => (window.__STUB.params || []).filter(c => c[0] === n).map(c => c[1]), name);
const rwSeenOf = p => p.evaluate(id => JSON.parse(localStorage.getItem(id + '_rw_seen') || 'null'), H.ID);
// The training app on a catalogue profile: UTC, the fixture's two-day plan dated so that the current cycle's week 2 is under way (prog()).
async function openRW(browser, o = {}) {
  const stub = Object.assign({ tables: { career_rules: RW_RULES, career_facts: o.facts || [], career_catalogue: catRows() } },
    o.profile === null ? {} : { profile: o.profile || rwProfile(10000) }, o.stub || {});
  return H.openProgram(browser, Object.assign({ w: o.w || 390, h: 844, tz: 'UTC', prog: o.prog || prog(), hist: o.hist || [], stub, seed: o.seed || {}, query: o.query || '' }, o.opts || {}));
}
async function trainingCatalogue(browser, C) {
  const OUT = H.outDir();
  const shot = (p, name) => p.screenshot({ path: path.join(OUT, name) }).catch(() => {});
  const TODAY = at(0);
  const CLAY = /199, 85, 47|181, 70, 31|224, 107, 67/;                    // --clay, --clay-ink, dark mode's clay text
  // 1. the catalogue switch off: the app is exactly what it was before phase 3 (Home, the finish card)
  {
    const baseHtml = gitShow(OFF_REF, 'program.html');
    const one = async base => {
      const o = { w: 390, h: 844, tz: 'UTC', prog: prog(), hist: [], seed: {}, stub: { tables: { career_rules: RULES_ON, career_facts: [] }, profile: profile(10000) } };
      const { ctx, p } = await H.openProgram(base ? atBaseline(browser, { '/program.html': baseHtml }) : browser, o);
      await waitRow(p);
      const out = { home: normHTML(await p.evaluate(() => document.getElementById('home-overview').innerHTML)) };
      await toReady(p);
      out.confirm = normHTML(await p.evaluate(() => document.getElementById('confirm-1').innerHTML));
      out.snap = await p.evaluate(() => Object.keys(_snapshot()).filter(k => /_rw_seen|_careercache|_earn_d/.test(k)).sort());
      out.on = await p.evaluate(() => typeof catalogueOnT === 'function' ? catalogueOnT() : false);
      out.errs = p.errs.slice();
      await ctx.close();
      return out;
    };
    const a = await one(true), b = await one(false);
    C.check('training, catalogue off: Home is drawn as before phase 3', a.home === b.home, a.home === b.home ? a.home.length + ' chars' : firstDiff(a.home, b.home));
    C.check('training, catalogue off: the finish card is drawn as before phase 3', a.confirm === b.confirm, a.confirm === b.confirm ? a.confirm.length + ' chars' : firstDiff(a.confirm, b.confirm));
    C.check('training, catalogue off: catalogueOnT() is false, nothing of phase 3 is synced', b.on === false && b.snap.join() === a.snap.join(), JSON.stringify([b.on, a.snap, b.snap]));
    C.check('training, catalogue off: no page errors', b.errs.length === 0, JSON.stringify(b.errs));
    // the switch off with the profile still carrying the phase 3 keys (a rollback): no phase 3 line anywhere
    const { ctx, p } = await openRW(browser, { profile: Object.assign(rwProfile(10000), { switch: { xp: SWX, catalogue: null } }) });
    await waitRow(p);
    const r = await p.evaluate(() => { const r = document.querySelector('#home-career-wrap .hrow'); return { smalls: r.querySelectorAll('small').length, label: r.getAttribute('aria-label') }; });
    C.check('training, catalogue switch back off: one small line on the Career row, the Locker label', r.smalls === 1 && /Open your Locker in AA Proof$/.test(r.label), JSON.stringify(r));
    await toReady(p);
    C.check('training, catalogue switch back off: the finish card has no moves', !(await p.$('.cf-moves')) && (await T(p, '#confirm-1 .confirm-earn')) === 'THIS SESSION EARNS +450 XP Session 400 · Every set logged 50');
    await p.evaluate(() => document.querySelector('#home-career-wrap .hrow').click());
    await p.waitForTimeout(600);
    C.check('training, catalogue switch back off: a tap opens the Locker (go=pass)', /&go=pass/.test(p.url()), p.url());
    C.check('training, catalogue switch back off: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 2. the Career row with the catalogue on
  {
    const { ctx, p } = await openRW(browser, {});
    await waitRow(p);
    const r = await p.evaluate(() => { const r = document.querySelector('#home-career-wrap .hrow'); return { smalls: [...r.querySelectorAll('small')].map(s => s.textContent.trim()), label: r.getAttribute('aria-label'), bar: r.querySelector('.career-bar i').style.width }; });
    C.check('training, on: the level line is as phase 2 left it, the four numbers beneath', /GRINDER|ROOKIE|CONTENDER|OPERATOR|ENFORCER|PREDATOR|MACHINE/.test(r.smalls[0]) && / XP to level \d+$/.test(r.smalls[0]) && r.smalls[1] === '3 weeks held · 24 sessions · 12 bests · 5 comebacks', JSON.stringify(r.smalls));
    C.check('training, on: the nearest goal when it is within two (9 of 10)', r.smalls[2] === 'Paper Trail 9 of 10', JSON.stringify(r.smalls));
    C.check('training, on: the aria-label names the numbers and the goal', /3 weeks held, 24 sessions, 12 bests, 5 comebacks\. Paper Trail 9 of 10\. Open your progress in AA Proof$/.test(r.label), r.label);
    C.check('training, on: the level bar is still the level\'s share', r.bar === Math.round(lvl(10000).xp_in_level / lvl(10000).level_cost * 100) + '%', r.bar);
    await shot(p, 'p3-train-row-390.png');
    await p.evaluate(() => document.querySelector('#home-career-wrap .hrow').click());
    await p.waitForTimeout(600);
    C.check('training, on: a tap opens AA Proof\'s Progress (go=progress)', /&go=progress/.test(p.url()), p.url());
    await ctx.close();
    // a zero cell is left out, a far goal is left out, all four zero leaves no line at all
    const o2 = await openRW(browser, { profile: rwProfile(10000, { sessions: 0, four: { consistency: { key: 'weeks_held', value: 0, best: 0 }, commitment: { key: 'sessions_with_amir', value: 0 }, progress: { key: 'personal_bests', value: 5 }, resilience: { key: 'comebacks', value: 0 } },
      near: [{ id: 'bests', name: 'Record Breaker', have: 5, next: 15, pct: 33 }] }) });
    await waitRow(o2.p);
    const sm = await o2.p.evaluate(() => [...document.querySelectorAll('#home-career-wrap small')].map(s => s.textContent.trim()));
    C.check('training, on: a zero cell and a far goal are left out', sm.length === 2 && sm[1] === '5 bests', JSON.stringify(sm));
    await o2.ctx.close();
    const o3 = await openRW(browser, { profile: rwProfile(10000, { sessions: 0, four: { consistency: { key: 'weeks_held', value: 0 }, commitment: { key: 'sessions_with_amir', value: 0 }, progress: { key: 'personal_bests', value: 0 }, resilience: { key: 'comebacks', value: 0 } }, near: [] }) });
    await waitRow(o3.p);
    const sm3 = await o3.p.evaluate(() => [...document.querySelectorAll('#home-career-wrap small')].map(s => s.textContent.trim()));
    C.check('training, on: all four zero, no numbers line', sm3.length === 1, JSON.stringify(sm3));
    await o3.ctx.close();
    // a free athlete's four (day streak, perfect days, habit steps locked, comebacks): the locked cell is never shown, the others use the day streak's words
    const o4 = await openRW(browser, { profile: rwProfile(10000, { free: true }) });
    await waitRow(o4.p);
    const sm4 = await o4.p.evaluate(() => [...document.querySelectorAll('#home-career-wrap small')].map(s => s.textContent.trim()));
    C.check('training, on, a free athlete\'s four: the locked cell is left out', sm4[1] === '4 day streak · 19 perfect days · 5 comebacks', JSON.stringify(sm4));
    await o4.ctx.close();
  }
  // 3. 320 px and dark: the row's lines wrap to two rows at most and the rank line is never cut
  for (const [w, dark] of [[320, false], [320, true], [390, true]]) {
    const { ctx, p } = await openRW(browser, { w, opts: { dark } });
    await waitRow(p);
    const m = await p.evaluate(() => {
      const r = document.querySelector('#home-career-wrap .hrow'), rr = r.getBoundingClientRect();
      const rows = el => { const lh = parseFloat(getComputedStyle(el).lineHeight) || 16; return Math.round(el.getBoundingClientRect().height / lh); };
      const four = r.querySelector('.career-four'), next = r.querySelector('.career-next'), rank = r.querySelector('.hrow-v small');
      return { right: Math.round(rr.right), vw: innerWidth, side: document.documentElement.scrollWidth > innerWidth, four: rows(four), next: rows(next), rank: rows(rank), h: Math.round(rr.height) };
    });
    C.check(`training ${w}px${dark ? ' dark' : ''}: the row fits, the numbers take at most 2 rows, the goal 1, the rank line is never cut`, m.right <= m.vw && !m.side && m.four <= 2 && m.next === 1 && m.rank <= 2, JSON.stringify(m));
    await shot(p, `p3-train-row-${w}${dark ? '-dark' : ''}.png`);
    await ctx.close();
  }
  // 4. the finish card: what the session moves (the one-day plan: the session closes its week)
  {
    const { ctx, p } = await openRW(browser, { prog: prog({ days: 1 }) });
    await waitRow(p);
    await toReady(p);
    const earn = await T(p, '#confirm-1 .confirm-earn');
    C.check('training, finish card: at most three lines and "+1 more in AA Proof" in grey', /Session 400 · Every set logged 50 Your week held \+400 when it counts Century 25 of 25 · silver Paper Trail 10 of 10 · bronze The Long Count 10 of 10 · bronze · when the week counts \+1 more in AA Proof$/.test(earn || ''), earn);
    C.check('training, finish card: three lines and one "more" line, nothing else', (await p.evaluate(() => document.querySelectorAll('#confirm-1 .cf-moves small').length)) === 4);
    const cls = await p.evaluate(() => [...document.querySelectorAll('#confirm-1 .cf-moves small')].map(s => s.className));
    C.check('training, finish card: a crossed tier in ink, the "more" line grey', cls.slice(0, 3).every(c => /is-crossed/.test(c)) && /cf-earn-more/.test(cls[3]), JSON.stringify(cls));
    await shot(p, 'p3-train-finish-card.png');
    const clay = await p.evaluate(() => [...document.querySelectorAll('#confirm-1 .cf-moves small')].map(s => getComputedStyle(s).color));
    C.check('training, finish card: the lines are never clay (DS-01)', clay.every(c => !CLAY.test(c)), JSON.stringify(clay));
    const fs = await p.evaluate(() => [...document.querySelectorAll('#confirm-1 .cf-moves small')].map(s => parseFloat(getComputedStyle(s).fontSize)));
    C.check('training, finish card: no line under 12 px', fs.every(x => x >= 12), JSON.stringify(fs));
    await ctx.close();
    const t2 = await openRW(browser, {});
    await waitRow(t2.p);
    await toReady(t2.p);
    const e2 = await T(t2.p, '#confirm-1 .confirm-earn');
    C.check('training, finish card: the two-day plan moves the session ladders only, no "when the week counts"', /Century 25 of 25 · silver Paper Trail 10 of 10 · bronze$/.test(e2 || '') && !/more in AA Proof|when the week/.test(e2 || ''), e2);
    await t2.ctx.close();
    // the 320 px and dark finish card: the lines wrap, the card does not run sideways
    for (const [w, dark] of [[320, false], [320, true]]) {
      const x = await openRW(browser, { prog: prog({ days: 1 }), w, opts: { dark } });
      await waitRow(x.p);
      await toReady(x.p);
      const g = await x.p.evaluate(() => { const c = document.querySelector('#confirm-1 .cf-moves'), r = c.getBoundingClientRect(); return { right: Math.round(r.right), vw: innerWidth, side: document.documentElement.scrollWidth > innerWidth }; });
      C.check(`training ${w}px${dark ? ' dark' : ''}: the finish card's moves fit, no sideways scroll`, g.right <= g.vw && !g.side, JSON.stringify(g));
      await shot(x.p, `p3-train-finish-${w}${dark ? '-dark' : ''}.png`);
      await x.ctx.close();
    }
  }
  // 5. Done: the Counting bands, then the answer confirms them
  {
    const { ctx, p } = await openRW(browser, {});
    await waitRow(p);
    await toReady(p);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    await p.waitForTimeout(200);
    // the answer after the save: both awards owned, rows waiting (win + highlight sizes, so bands, not moments)
    const after = rwProfile(10470, { sessions: 25, owned: { 'badge:century:2': TODAY, 'badge:full_log:1': TODAY }, moments: [
      mom('badge:century:2', 'highlight', false, 100, badgeSpec('Century', 'commitment', 'silver', 2, 25, '25 sessions with Amir. That is a habit.')),
      mom('badge:full_log:1', 'win', false, 50, badgeSpec('Paper Trail', 'commitment', 'bronze', 1, 10, '10 sessions logged in full.'))] });
    await p.evaluate(a => { window.__STUB.profile = a; }, after);
    const counting = await p.evaluate(() => {
      finishTap('1', document.querySelector('#confirm-1 .confirm-btn'));
      return [...document.querySelectorAll('#hlwin-1 .hl-band')].map(b => ({ t: b.innerText.replace(/\s+/g, ' ').trim(), tag: b.tagName, share: !!b.querySelector('.hl-band-go') }));
    });
    C.check('training, Done: two "Counting" bands at once, no Share until the server has them', counting.length === 2 && counting.every(b => b.tag === 'DIV' && !b.share) && /BADGE · COUNTING CENTURY · SILVER/i.test(counting[0].t) && /PAPER TRAIL · BRONZE/i.test(counting[1].t), JSON.stringify(counting));
    C.check('training, Done: nothing is told or marked seen from the phone\'s guess', (await params(p, 'mark_moments_told')).every(a => !a.p_award_ids.includes('badge:century:2')));
    await p.waitForTimeout(1800);
    const rec = await p.evaluate(id => JSON.parse(localStorage.getItem(id + '_earn_d1')), H.ID);
    C.check('training, Done: the day\'s record keeps the awards owned at Done, the finish card\'s lines and the save stamp', Array.isArray(rec.snap) && rec.snap.slice().sort().join() === Object.keys(rwProfile(0).owned).sort().join() && rec.moves && rec.moves.lines.length === 2 && rec.saved > 0, JSON.stringify({ snap: rec.snap, saved: rec.saved }));
    const conf = await p.evaluate(() => [...document.querySelectorAll('#hlwin-1 .hl-band')].map(b => ({ t: b.innerText.replace(/\s+/g, ' ').trim(), tag: b.tagName, share: !!b.querySelector('.hl-band-go'), em: !!b.querySelector('em'), color: getComputedStyle(b.querySelector('.hl-band-t b') || b).color })));
    C.check('training, after the answer: both bands confirmed (Counting gone, Share there), the metal word is plain text and never clay', conf.length === 2 && conf.every(b => b.tag === 'BUTTON' && b.share && !b.em && !/COUNTING/i.test(b.t) && !CLAY.test(b.color)) && /^BADGE CENTURY · SILVER/i.test(conf[0].t), JSON.stringify(conf));
    const told = await params(p, 'mark_moments_told');
    C.check('training, the bands are told on the server as "training"', told.some(a => a.p_app === 'training' && a.p_award_ids.includes('badge:century:2') && a.p_award_ids.includes('badge:full_log:1')), JSON.stringify(told));
    const seen = await rwSeenOf(p);
    C.check('training, the bands are marked seen', seen && seen['badge:century:2'] && seen['badge:full_log:1'], JSON.stringify(seen));
    C.check('training, the bands are synced (the seen list is in the snapshot the cloud copy takes)', await p.evaluate(id => Object.keys(_snapshot()).includes(id + '_rw_seen'), H.ID));
    C.check('training, a win or highlight is a band, never a full-screen moment', !(await p.$('.hl-moment')));
    await shot(p, 'p3-train-finished-bands.png');
    await p.evaluate(() => document.querySelector('#hlwin-1 .hl-band').click());
    await p.waitForTimeout(700);
    const sheet = await p.evaluate(() => ({ title: (document.getElementById('hl-title') || {}).textContent, open: !!document.querySelector('#hist-overlay.visible') }));
    C.check('training, Share on a band opens the share sheet, "Share your badge"', sheet.open && sheet.title === 'Share your badge', JSON.stringify(sheet));
    C.check('training, bands: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const again = await p.evaluate(() => [...document.querySelectorAll('#hlwin-1 .hl-band')].map(b => b.className));
    C.check('training, a reload shows the same two bands, quietly (none animating)', again.length === 2 && again.every(c => !/is-new/.test(c)), JSON.stringify(again));
    C.check('training, a reload reaches the bands before the script ends: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 6. a reward is told only if it was drawn; a server that disagrees takes the Counting band away; no band from an old answer
  {
    const { ctx, p } = await openRW(browser, {});
    await waitRow(p);
    await toReady(p);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    const c0 = await p.evaluate(() => { finishTap('1', document.querySelector('#confirm-1 .confirm-btn')); return document.querySelectorAll('#hlwin-1 .hl-band').length; });
    await p.waitForTimeout(2200);
    const n = await p.evaluate(() => document.querySelectorAll('#hlwin-1 .hl-band').length);
    C.check('training, a server that disagrees: two Counting bands at Done, none once the answer lacks the awards', c0 === 2 && n === 0, JSON.stringify([c0, n]));
    await ctx.close();
    const q = await openRW(browser, {});
    await waitRow(q.p);
    await toReady(q.p);
    await q.p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    const mk = (i, size) => mom('badge:b' + i + ':1', size, false, 50, badgeSpec('Badge ' + i, 'progress', 'bronze', 1, i, 'c'));
    const ms = [1, 2, 3, 4, 5].map(i => mk(i, i === 3 ? 'highlight' : 'win'));
    const owned = {}; ms.forEach(m => { owned[m.award_id] = TODAY; });
    await q.p.evaluate(a => { window.__STUB.profile = a; finishTap('1', document.querySelector('#confirm-1 .confirm-btn')); }, rwProfile(10470, { owned, moments: ms }));
    await q.p.waitForTimeout(2200);
    const bands = await q.p.evaluate(() => ({ b: [...document.querySelectorAll('#hlwin-1 .hl-band')].map(b => b.innerText.replace(/\s+/g, ' ').trim()), more: (document.querySelector('#hlwin-1 .hl-band-more') || {}).textContent }));
    C.check('training, five rewards: three bands (the highlight first) and one grey "+N more in AA Proof"', bands.b.length === 3 && /Badge 3/i.test(bands.b[0]) && bands.more === '+2 more in AA Proof', JSON.stringify(bands));
    const seen = (await rwSeenOf(q.p)) || {}, told = (await params(q.p, 'mark_moments_told')).filter(a => a.p_app === 'training').reduce((s, a) => s.concat(a.p_award_ids), []);
    const drawn = bands.b.map(t => (/Badge (\d)/i.exec(t) || [])[1]).map(i => 'badge:b' + i + ':1');
    C.check('training, only a reward that was DRAWN is marked seen and told: the two behind "+2 more" are neither', drawn.length === 3 && drawn.every(id => seen[id] && told.includes(id))
      && ms.map(m => m.award_id).filter(id => drawn.indexOf(id) < 0).every(id => !seen[id] && !told.includes(id)), JSON.stringify({ drawn, seen: Object.keys(seen), told }));
    await q.ctx.close();
    // an answer that predates the save is no trigger for a confirmed band: while get_profile stalls after Done only the phone's own Counting bands show
    const s = await openRW(browser, {});
    await waitRow(s.p);
    await toReady(s.p);
    await s.p.evaluate(() => { const c = JSON.parse(localStorage.getItem('__stubcfg')); c.stall = { get_profile: true }; localStorage.setItem('__stubcfg', JSON.stringify(c)); window.__STUB.stall = { get_profile: true }; });
    await s.p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    await s.p.evaluate(() => finishTap('1', document.querySelector('#confirm-1 .confirm-btn')));
    await s.p.waitForTimeout(1800);
    const only = await s.p.evaluate(() => [...document.querySelectorAll('#hlwin-1 .hl-band')].map(b => b.tagName));
    C.check('training, no fresh answer yet: only the phone\'s own Counting bands (no Share), nothing confirmed', only.length === 2 && only.every(t => t === 'DIV'), JSON.stringify(only));
    await s.ctx.close();
  }
  // 7. moments: one per open, never from the phone's copy, no replay, the other app's catch-up
  {
    const full = (i, size, extra) => mom('badge:held_weeks:' + i, size, true, 600, badgeSpec('Hold Serve', 'consistency', 'emerald', i, 12, '12 weeks held in a row. You keep showing up.', at(-3 + i)), extra);
    const m1 = full(3, 'milestone'), m2 = full(4, 'legend');
    let { ctx, p } = await openRW(browser, { seed: { _careercache: { p: rwProfile(10000, { moments: [m1] }), at: Date.now() - 3600000 } }, stub: { stall: { get_profile: true } } });
    await p.waitForTimeout(1500);
    C.check('training, moment: none from the phone\'s copy of an answer', !(await p.$('.hl-moment')));
    await ctx.close();
    ({ ctx, p } = await openRW(browser, { profile: rwProfile(10000, { moments: [m1, m2], owned: { 'badge:held_weeks:3': at(0), 'badge:held_weeks:4': at(0) } }) }));
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    const mo = await p.evaluate(() => { const m = document.querySelector('.hl-moment'); return m ? { eb: m.querySelector('.hl-m-eyebrow').textContent, t: m.querySelector('.hl-m-title').textContent, sub: m.querySelector('.hl-m-sub').textContent, w: m.querySelector('.hl-m-sheet p').textContent, go: m.querySelector('.hl-m-go').textContent, n: document.querySelectorAll('.hl-moment').length } : null; });
    C.check('training, a fresh answer opens ONE moment, the biggest: eyebrow, "Hold Serve · Emerald", caption, the legend line, Share your badge', mo && mo.eb === 'Consistency' && mo.t === 'Hold Serve · Emerald' && /12 weeks held/.test(mo.sub) && mo.w === 'This is rare. Well done.' && mo.go === 'Share your badge' && mo.n === 1, JSON.stringify(mo));
    await p.waitForTimeout(1800);
    await shot(p, 'p3-train-moment.png');
    const seen = await rwSeenOf(p);
    C.check('training, only the shown one is marked seen (the other waits)', seen && seen['badge:held_weeks:4'] && !seen['badge:held_weeks:3'], JSON.stringify(seen));
    await p.waitForTimeout(300);
    const told = await params(p, 'mark_moments_told');
    C.check('training, the shown one is told on the server as "training"', told.some(a => a.p_app === 'training' && a.p_award_ids.length === 1 && a.p_award_ids[0] === 'badge:held_weeks:4'), JSON.stringify(told));
    C.check('training, the seen list is synced (in the snapshot)', await p.evaluate(id => Object.keys(_snapshot()).includes(id + '_rw_seen'), H.ID));
    await p.evaluate(() => document.querySelector('.hl-m-skip').click());
    await p.waitForTimeout(800);
    C.check('training, "Not now" closes it and nothing chains', !(await p.$('.hl-moment')));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    const m2t = await p.evaluate(() => { const m = document.querySelector('.hl-moment'); return m ? m.querySelector('.hl-m-title').textContent : null; });
    C.check('training, the next open brings the other one, never the seen one', m2t === 'Hold Serve · Emerald' && (await rwSeenOf(p)) && Object.keys(await rwSeenOf(p)).sort().join() === 'badge:held_weeks:3,badge:held_weeks:4', m2t);
    C.check('training, a milestone says its line', (await p.evaluate(() => document.querySelector('.hl-moment .hl-m-sheet p').textContent)) === 'That one took weeks. It\'s yours for good.');
    await p.waitForTimeout(500);
    C.check('training, the catch-up: the seen one is told again on the next answer (the server still lists it)', (await params(p, 'mark_moments_told')).some(a => a.p_award_ids.includes('badge:held_weeks:4')));
    C.check('training, moment: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
    // 320 px and dark: the moment fits, its buttons are 44 px or more, nothing runs sideways
    for (const dark of [false, true]) {
      const x = await openRW(browser, { w: 320, opts: { dark }, profile: rwProfile(10000, { moments: [m1], owned: { 'badge:held_weeks:3': at(0) } }) });
      await x.p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
      const g = await x.p.evaluate(() => { const el = document.querySelector('.hl-moment'); if (!el) return null; const b = [...el.querySelectorAll('.hl-m-go, .hl-m-skip')].map(e => Math.round(e.getBoundingClientRect().height));
        return { side: document.documentElement.scrollWidth - innerWidth, buttons: b, title: el.querySelector('.hl-m-title').getBoundingClientRect().right <= innerWidth }; });
      C.check(`training 320px${dark ? ' dark' : ''}: the reward moment fits, no sideways scroll, its buttons are 44 px or more`, !!g && g.side <= 0 && g.buttons.every(h => h >= 44) && g.title, JSON.stringify(g));
      await shot(x.p, `p3-train-moment-320${dark ? '-dark' : ''}.png`);
      await x.ctx.close();
    }
    // the Grand Slam says its line
    ({ ctx, p } = await openRW(browser, { profile: rwProfile(10000, { owned: { 'title:grand_slam': TODAY }, moments: [mom('title:grand_slam', 'legend', true, 0, { kind: 'title', name: 'GRAND SLAM', meaning: 'all', metal: 'prismatic', from: 'A title in all four', date: TODAY })] }) }));
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    const gs = await p.evaluate(() => { const m = document.querySelector('.hl-moment'); return m ? { eb: m.querySelector('.hl-m-eyebrow').textContent, t: m.querySelector('.hl-m-title').textContent, w: m.querySelector('.hl-m-sheet p').textContent, go: m.querySelector('.hl-m-go').textContent } : null; });
    C.check('training, the Grand Slam moment: its own eyebrow, title and line, Share your title', gs && gs.eb === 'Grand Slam' && gs.t === 'GRAND SLAM' && gs.w === 'A title in all four. That\'s the whole game.' && gs.go === 'Share your title', JSON.stringify(gs));
    await ctx.close();
    // never in the demo or the coach's preview
    for (const [name, query] of [['demo', '?client=demo'], ['coach preview', '?client=rel01_athlete&preview=1']]) {
      ({ ctx, p } = await openRW(browser, { query, profile: rwProfile(10000, { moments: [m1], owned: { 'badge:held_weeks:3': TODAY } }) }));
      await p.waitForTimeout(1500);
      C.check(`training, ${name}: no moment, no profile asked, nothing told, nothing marked seen`, !(await p.$('.hl-moment')) && (await calls(p, 'rpc:get_profile')) === 0 && (await calls(p, 'rpc:mark_moments_told')) === 0 && !(await rwSeenOf(p)));
      await ctx.close();
    }
    // the Welcome and a moment already on screen block it; the row stays waiting and opens once they are gone; then one per open
    ({ ctx, p } = await openRW(browser, { profile: rwProfile(10000, { moments: [], owned: {} }) }));
    await waitRow(p);
    await p.evaluate(m => {
      const w = document.createElement('div'); w.className = 'wel'; w.id = 'fakewel'; document.body.appendChild(w);
      CAREER_T.p.moments = [m]; CAREER_T.p.owned['badge:held_weeks:3'] = at0(); maybeRewardMoment('open');
      function at0() { return new Date().toISOString().slice(0, 10); }
    }, m1);
    await p.waitForTimeout(400);
    const blocked = await p.evaluate(id => ({ mom: !!document.querySelector('.hl-moment'), seen: localStorage.getItem(id + '_rw_seen') }), H.ID);
    C.check('training, the Welcome on screen: no reward moment over it, nothing marked seen', !blocked.mom && !blocked.seen, JSON.stringify(blocked));
    await p.evaluate(() => { document.getElementById('fakewel').remove(); maybeRewardMoment('open'); });
    await p.waitForTimeout(400);
    C.check('training, …and it opens once the Welcome is gone', await p.evaluate(() => !!document.querySelector('.hl-moment')));
    await p.evaluate(() => { document.querySelector('.hl-m-skip').click(); CAREER_T.p.moments = [{ award_id: 'badge:held_weeks:9', kind: 'badge', item: 'held_weeks', tier: 9, size: 'milestone', day: '2026-10-18', full: true, spec: { kind: 'badge', name: 'X', meaning: 'consistency', metal: 'silver', tier: 2, n: 1, caption: 'c', date: '2026-10-18' } }]; maybeRewardMoment('open'); });
    await p.waitForTimeout(400);
    C.check('training, one full-screen moment per open: a second does not open after the first closed', !(await p.$('.hl-moment')));
    await ctx.close();
    // an old full row arrives as full:false: no takeover from the training app (a band or Proof's wins line)
    ({ ctx, p } = await openRW(browser, { profile: rwProfile(10000, { owned: { 'badge:held_weeks:3': at(-20) }, moments: [mom('badge:held_weeks:3', 'milestone', false, 600, badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, 'x', at(-20)))] }) }));
    await p.waitForTimeout(1500);
    C.check('training, a full row older than the keep days (full:false) opens no moment here', !(await p.$('.hl-moment')) && !(await rwSeenOf(p)), JSON.stringify(await rwSeenOf(p)));
    await ctx.close();
  }
  // 8. the moment after Done: it opens after the finished card, never over the rating
  {
    const { ctx, p } = await openRW(browser, {});
    await waitRow(p);
    await toReady(p);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    const m = mom('badge:full_log:2', 'milestone', true, 200, badgeSpec('Paper Trail', 'commitment', 'silver', 2, 10, '10 full logs.'));
    // the rating box is being typed in: a moment waits (the row stays unseen)
    const ta = await p.evaluate(() => { const t = document.querySelector('#confirm-1 .finish-rate textarea, #confirm-1 .finish-rate input'); if (t) t.focus(); return !!t; });
    await p.evaluate(a => { window.__STUB.profile = a; }, rwProfile(10470, { owned: { 'badge:full_log:2': TODAY }, moments: [m] }));
    if (ta) {
      await p.evaluate(() => { CAREER_T.p.moments = window.__STUB.profile.moments; CAREER_T.p.owned = window.__STUB.profile.owned; CAREER_T.at = Date.now(); maybeRewardMoment('open'); });
      await p.waitForTimeout(300);
      C.check('training, a moment never opens over the rating box in use; the row stays unseen', !(await p.$('.hl-moment')) && !(await rwSeenOf(p)), JSON.stringify(await rwSeenOf(p)));
      await p.evaluate(() => document.activeElement && document.activeElement.blur());
    }
    const before = await p.evaluate(() => { finishTap('1', document.querySelector('#confirm-1 .confirm-btn')); return !!document.querySelector('.hl-moment'); });
    C.check('training, after Done: no moment at the tap itself', !before);
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    const st = await p.evaluate(() => ({ mom: !!document.querySelector('.hl-moment'), card: !!document.querySelector('#complete-1.visible'), t: (document.querySelector('.hl-moment .hl-m-title') || {}).textContent, bands: document.querySelectorAll('#hlwin-1 .hl-band').length }));
    C.check('training, after Done: the milestone opens once the finished card is there, and is not also a band', st.mom && st.card && st.t === 'Paper Trail · Silver' && st.bands === 0, JSON.stringify(st));
    C.check('training, after Done: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 9. nothing of it can hold up a session: the reward RPC refused, Done still finishes and the session queue empties
  {
    const { ctx, p } = await openRW(browser, { stub: { refuse: ['mark_moments_told'] }, profile: rwProfile(10000, { moments: [], owned: {} }) });
    await waitRow(p);
    await toReady(p);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    await p.evaluate(() => finishTap('1', document.querySelector('#confirm-1 .confirm-btn')));
    await p.waitForTimeout(1500);
    const q = await p.evaluate(id => ({ csq: localStorage.getItem(id + '_csq'), done: !!document.querySelector('#complete-1.visible') }), H.ID);
    C.check('training, Done finishes and the session queue empties with the reward RPC refused', q.done && (!q.csq || q.csq === '[]'), JSON.stringify(q));
    C.check('training, finish: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 10. careerMoves() and awardId() as pure functions, on the ladder the server really answers
  {
    const { ctx, p } = await openRW(browser, {});
    await waitRow(p);
    const r = await p.evaluate(L => {
      const big = careerMoves({ early: false, fullLog: true, checkin: true, weekCloses: true, cycleCloses: true }, L);
      const early = careerMoves({ early: true, fullLog: false, checkin: false, weekCloses: false, cycleCloses: false }, L);
      const none = careerMoves({ early: false, fullLog: false, checkin: false, weekCloses: false, cycleCloses: false, byBook: false }, {});
      const hold = careerMoves({ early: false, fullLog: false, checkin: false, weekCloses: true, cycleCloses: false, byBook: false }, { held_weeks: L.held_weeks });
      const top = careerMoves({ early: false, fullLog: true, checkin: true, weekCloses: false, cycleCloses: false }, { full_log: Object.assign({}, L.full_log, { next: undefined }) });
      return { big, early, none, hold, top, ids: [awardId('badge', 'habit_tiers', 2, 'water'), awardId('badge', 'held_weeks', 3, ''), awardId('achievement', 'first_best'), awardId('title', 'clockwork', 4, 'x')] };
    }, RW_LADDER);
    C.check('training, careerMoves: a big day, crossed first, three lines and the rest as "more"', r.big.lines.length === 3 && r.big.lines.every(l => l.crossed) && r.big.more >= 1, JSON.stringify(r.big));
    C.check('training, careerMoves: finished early moves Century only', r.early.lines.length === 1 && r.early.lines[0].id === 'century' && r.early.lines[0].have === 25, JSON.stringify(r.early));
    C.check('training, careerMoves: nothing to move, nothing back', r.none.lines.length === 0 && r.none.more === 0);
    C.check('training, careerMoves: Hold Serve counts from the run so far (now 2, so 3 of 8, pending)', JSON.stringify(r.hold.lines) === JSON.stringify([{ id: 'held_weeks', name: 'Hold Serve', have: 3, next: 8, crossed: false, pending: true }]), JSON.stringify(r.hold));
    C.check('training, careerMoves: a top tier (no next) never shows', r.top.lines.length === 0, JSON.stringify(r.top));
    C.check('training, awardId', JSON.stringify(r.ids) === JSON.stringify(['badge:habit_tiers:2:water', 'badge:held_weeks:3', 'achievement:first_best', 'title:clockwork']), JSON.stringify(r.ids));
    await ctx.close();
  }
}

// ── One reward, two apps: told once, celebrated once (spec §7: the queue, the cross-app catch-up) ────────────────────────────────────────
// The two apps share one browser here, as on a phone: the profile the stub keeps after mark_moments_told (stub tellRemoves) is what the next
// page reads, exactly as the server's told_at is what the other app reads.
async function crossApp(browser, C) {
  const S30 = at(-30);
  const toApp = async (p, app) => {
    await p.evaluate(([id, spine, hist, app, cfg]) => {
      if (app === 'training') { localStorage.setItem('aa_athlete_id', id); localStorage.setItem('spinecache', JSON.stringify(spine)); localStorage.setItem(id + '_histcache', JSON.stringify(hist));
        localStorage.setItem(id + '_welcomed', '1'); localStorage.setItem('a2hs_dismissed_v1', '1'); }
      else localStorage.setItem(id + '_hab_cfg', JSON.stringify(cfg));
    }, [H.ID, H.SPINE, [], app, { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now(), careerSeen: SWX, catalogueSeen: S30 }]);
    await p.goto(H.BASE + (app === 'training' ? '/program.html' : '/habits.html'), { waitUntil: 'domcontentloaded' });
    if (app === 'training') await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    else await p.waitForFunction(() => document.getElementById('app') && document.getElementById('app').textContent.length > 200, null, { timeout: 20000 });
    await p.waitForTimeout(2200);
  };
  // 1. AA Proof decides THE FOUNDRY on a tick and celebrates it; the server mints it; the training app opens SILENT
  {
    const log = {};
    for (let i = 1; i <= 19; i++) log[at(-i)] = { strength: 1, water: 8, sleep: 8, steps: 11000, fuel: 3 };
    log[at(0)] = { strength: 1, water: 8, sleep: 8, steps: 11000 };
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(30000, { S: S30 }), { log, cfg: { catalogueSeen: S30 }, stub: { tellRemoves: true } }));
    await p.waitForTimeout(2500);
    await ev(p, `(CFG.pass = CFG.pass || { owned: [], title: null, card: null }, CFG.pass.owned = PASS_TRACK.map(t => t.id), saveCfg(), UI.celebrate = [], render(), 0)`);
    await ev(p, `(setVal('fuel', 3), actionLevelUps(), render(), 0)`);
    await p.waitForTimeout(200);
    const q = await celebrating(p);
    C.check('cross-app: AA Proof celebrates THE FOUNDRY at the tap (a phone-decided milestone)', q.indexOf('award:achievement:the_foundry') >= 0, JSON.stringify(q));
    C.check('cross-app: …and records it as seen', (await ev(p, `CFG.seenAwards.indexOf('achievement:the_foundry')`)) >= 0);
    // the server mints it (its row waits, untold); AA Proof's next answer tells it
    const spec = { kind: 'achievement', name: 'THE FOUNDRY', meaning: 'commitment', caption: 'Four weeks of putting the work in.', date: at(0) };
    const minted = rwProfile(30200, { S: S30, owned: { 'achievement:the_foundry': at(0) }, moments: [mom('achievement:the_foundry', 'milestone', true, 0, spec)] });
    await ev(p, `(window.__STUB.profile = ${JSON.stringify(minted)}, 0)`);
    await ev(p, `fetchCareer()`);
    await p.waitForTimeout(500);
    const told = await toldCalls(p);
    C.check('cross-app: AA Proof\'s next answer tells the server it showed THE FOUNDRY (the catch-up), as "proof"', told.some(t => t.p_app === 'proof' && t.p_award_ids.indexOf('achievement:the_foundry') >= 0), JSON.stringify(told));
    C.check('cross-app: the server no longer lists it as waiting', (await ev(p, `JSON.parse(localStorage.getItem('__stubcfg')).profile.moments.length`)) === 0);
    await toApp(p, 'training');
    C.check('cross-app: the training app opens SILENT: no moment, nothing marked seen here, no replay', !(await p.$('.hl-moment')) && !(await rwSeenOf(p)), JSON.stringify(await rwSeenOf(p)));
    C.check('cross-app: …and it knew the award (owned) without a word of it on the screen', await p.evaluate(() => catalogueOnT() && !!CAREER_T.p.owned['achievement:the_foundry']));
    C.check('cross-app: no page errors in either app', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 1b. The control: the same sequence with AA Proof's catch-up never reaching the server (offline, say). The server still lists the row untold, so the training
  // app DOES open it: the rule that keeps it silent is the catch-up, and this proves the check above can fail.
  {
    const log = {};
    for (let i = 1; i <= 19; i++) log[at(-i)] = { strength: 1, water: 8, sleep: 8, steps: 11000, fuel: 3 };
    log[at(0)] = { strength: 1, water: 8, sleep: 8, steps: 11000 };
    const spec = { kind: 'achievement', name: 'THE FOUNDRY', meaning: 'commitment', caption: 'Four weeks of putting the work in.', date: at(0) };
    const minted = rwProfile(30200, { S: S30, owned: { 'achievement:the_foundry': at(0) }, moments: [mom('achievement:the_foundry', 'milestone', true, 0, spec)] });
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(30000, { S: S30 }), { log, cfg: { catalogueSeen: S30 }, stub: { tellRemoves: true } }));
    await p.waitForTimeout(2500);
    await ev(p, `(CFG.pass = CFG.pass || { owned: [], title: null, card: null }, CFG.pass.owned = PASS_TRACK.map(t => t.id), saveCfg(), UI.celebrate = [], render(), 0)`);
    await ev(p, `(setVal('fuel', 3), actionLevelUps(), render(), 0)`);
    await p.waitForTimeout(200);
    await p.evaluate(m => { const c = JSON.parse(localStorage.getItem('__stubcfg')); c.profile = m; localStorage.setItem('__stubcfg', JSON.stringify(c)); }, minted);   // minted, never told
    await toApp(p, 'training');
    C.check('cross-app, control: with no catch-up the training app opens the same award (so the silence above comes from the catch-up)', await p.evaluate(() => !!document.querySelector('.hl-moment')));
    await ctx.close();
  }
  // 2. the training app shows Hold Serve's milestone and tells the server; AA Proof opens SILENT
  {
    const m1 = mom('badge:held_weeks:3', 'milestone', true, 600, badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, '12 weeks held in a row. You keep showing up.', at(-1)));
    const { ctx, p } = await openRW(browser, { profile: rwProfile(10000, { S: S30, moments: [m1], owned: { 'badge:held_weeks:3': at(-1) } }), stub: { tellRemoves: true } });
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    C.check('cross-app: the training app opens the milestone', await p.evaluate(() => !!document.querySelector('.hl-moment')));
    await p.waitForTimeout(400);
    C.check('cross-app: …and the server was told, as "training"', (await params(p, 'mark_moments_told')).some(a => a.p_app === 'training' && a.p_award_ids.indexOf('badge:held_weeks:3') >= 0));
    await toApp(p, 'proof');
    const q = await celebrating(p);
    C.check('cross-app: AA Proof opens SILENT: no takeover, no wins line for it', q.length === 0 && !(await ev(p, `(CFG.wins || []).some(w => w.k === 'award' && w.id === 'badge:held_weeks:3')`)), JSON.stringify(q));
    C.check('cross-app: no page errors in either app', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
}

async function main() {
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
    const manOff = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = renderManual(); return d.textContent.replace(/\s+/g, ' '); });
    C.check('Proof, off: the manual lists WORKOUT at its own 100 and no session on top', /Finish your session 45 min · from your programme 100 XP/.test(manOff) && !/on top\./.test(manOff),
      manOff.match(/Finish your session.{0,60}/));
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
    // "What each habit is worth" says what the ledger pays: WORKOUT is the session's price, the perfect day leaves it out
    const worth = await p.evaluate(() => ({ pd: live().reduce((s, h) => s + paidXp(h, h.target), 0), price: CAREER.p.rules.prices.session_finished }));
    C.check('Proof, on: the manual\'s WORKOUT row is the session\'s price, "Paid by your finished session"',
      new RegExp('Finish your session Paid by your finished session ' + worth.price.toLocaleString() + ' XP').test(man), man.match(/Finish your session.{0,60}/));
    C.check('Proof, on: the manual\'s perfect day is what the ledger pays (WORKOUT 0), and the session on top',
      man.includes('A perfect day is currently ' + worth.pd.toLocaleString() + ' XP. A finished session pays ' + worth.price.toLocaleString() + ' XP on top.'),
      JSON.stringify({ worth, said: (man.match(/A perfect day is currently.{0,80}/) || [''])[0] }));
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

  // ── Career Mode phase 3 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await proofCatalogue(browser, C);
  if (typeof trainingCatalogue === 'function') await trainingCatalogue(browser, C);
  if (typeof crossApp === 'function') await crossApp(browser, C);

  await browser.close();
  process.exitCode = C.report() ? 1 : 0;
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { rwProfile, rwLog, catRows, rwProof, mom, badgeSpec, RW_LADDER, RW_RULES, at, lvl, SWX, strip, toReady, tickAll, waitRow, T, proofCatalogue, trainingCatalogue: typeof trainingCatalogue === 'function' ? trainingCatalogue : null, crossApp: typeof crossApp === 'function' ? crossApp : null };
