// Career Mode in both apps, the lightest version (career/CAREER_MODE.md, round 5, L1 to L11; PROGRAM-APP.md → "Career, the lightest version"; HABITS.md → "Career screens off"):
// node scripts/headless/career.js
//
// The server side is unchanged (supabase/stage69, stage70, stage77: the XP switch, the catalogue switch, the athlete's own moments); the stub (stub.js) answers get_profile,
// get_awards, get_my_moments and mark_note_read in the shapes the server answers (rwProfile(), rwShelf(), myMomentsFx()). The phones' copies of the server's rules are checked
// against the server's own answers by scripts/check_twins.js (scripts/career/xp_cases.json, reward_cases.json).
//
// THE TRAINING APP (program.html, AA Performance) is the career's home:
//   with only the XP switch on (the catalogue off)   a Career row on Home: "Level N" (no rank name) and this week's Hold Serve line, the level bar along its foot; from the phone's
//        copy at once and the server behind it; gone when the switch is off; never in the demo or the coach's preview; the Hold Serve row shows only while there is no Career row;
//        a tap opens Progress at Your numbers (never AA Proof); the habits row never says a level; the finish card says what the session earns, the finished card what it earned;
//        nothing of it is synced; Progress shows the level's card and no four numbers; get_profile is asked once, then get_my_moments and get_awards.
//   with the catalogue on  the Career row's nearest mark ("1 session to 25 with Amir", within 3 or at 70%) · Progress → Your numbers: the career's card (the level, its bar, the four
//        numbers 2 x 2 with the next mark and a bar), the month's goal, Your moments (the marks, achievements, Amir's lines with Reply on WhatsApp, honours, "Amir saw this", six shown and
//        Show all), then Records and body · "New from Amir" on Home (clay, read at the tap on the phone and on the server, opens Progress on the line) · the finish card's moves are the
//        four marks only ("25 of 25 sessions with Amir · a new mark", "4 of 8 weeks held · when the week counts"), never a badge name, a metal or "+N more in AA Proof" · the finished
//        card's bands and the full-screen moments are achievements and the four marks' tiers only ("A new mark"; a mark has its own share card), every other badge, a
//        title and the Grand Slam are neither, and are never marked seen or told · Counting bands at Done, confirmed (or taken away) by the answer · Sessions with Amir counts a
//        paid session finished here that no answer has counted yet (GAME-4) · ?go=numbers lands on Your numbers · the session queue never waits on any of it.
// AA PROOF has no career screens (CAREER_LIGHT; scripts/headless/proof-light.js tests what is gone and what stays). What this file keeps for it is the XP that still moves: the
//        career's level and its curve on Today's ring, a tick moves the career XP at once, the WORKOUT habit pays 0 a day, a phone-decided award's XP at once and withdrawn when the
//        server lacks it, a dirty push and then the catalogue newly on does not move the XP, the cached profile offline, the embed and the coach's preview ask and write nothing.
// BOTH APPS  a waiting moment is the training app's alone: AA Proof shows nothing and TELLS nothing (serverMoments() is false), the training app shows it once and tells the server.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.toISOString().slice(0, 10);
const at = n => ymd(new Date(Date.now() + n * DAY));                    // n days from today (UTC; every page here runs in UTC)
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'career', 'xp_cases.json'), 'utf8'));
const LEVEL = CASES.rules.level;
const RANKS = new RegExp('\\b(' + LEVEL.ranks.join('|') + ')\\b', 'i');   // no rank name anywhere in the training app (L2)
const METALS = /\b(bronze|silver|emerald|amethyst|prismatic)\b/i;
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
// get_profile() with the XP switch on and the catalogue off (phase 2's answer: no ladder, no owned, no four numbers).
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
// Three weeks held in a row (cycle 1 weeks 4 and 5, cycle 2 week 1); with one session of the current week done, Hold Serve's line is "3 weeks in a row · 1 more session this week".
const HOLD_FACTS = [W('H', 1, 4, -20), W('H', 1, 5, -13), W('H', 2, 1, -6)];
const ONE_DONE = [{ completed_on: at(-2), day: '1', readiness: 4, log: [] }];

const HAB_ON = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
async function openP(browser, o = {}) {
  const stub = Object.assign({ tables: { career_rules: o.rules || RULES_ON, career_facts: o.facts || [] } },
    o.profile === null ? {} : { profile: o.profile || profile(10000) }, o.stub || {});
  // The habits are set up in every career scenario: the level lives in the habit card's ring now, and an athlete who has never
  // started tracking sees the start screen instead of a card (2026-10-20).
  return H.openProgram(browser, Object.assign({ w: o.w || 390, h: 844, tz: 'UTC', prog: o.prog || prog(), hist: o.hist || [], stub,
    seed: Object.assign({ _hab_cfg: HAB_ON }, o.seed || {}), query: o.query || '' }, o.opts || {}));
}
const nb = s => String(s == null ? '' : s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
// What Home says about the career since 2026-10-20 (Amir: "i think the career row is redundant, it just shows level when we can
// see level 10 times"): there is no Career row and no Hold Serve row. The level is the number inside the habit card's ring, the
// weeks held in a row sit beside the week's own count, and the nearest mark is on Progress, where there is room to say it.
// `row()` answers null until the ring carries a LEVEL, which is what the old helper meant by "the row is on Home".
const row = p => p.evaluate(() => {
  const mid = document.querySelector('#home-overview .today-mid');
  if (!mid || (mid.querySelector('span') || {}).textContent !== 'Level') return null;
  const n = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const ring = document.querySelector('#home-overview .today-ring');
  return { big: 'Level ' + n(mid.querySelector('b').textContent), kick: n(mid.querySelector('span').textContent),
           segs: ring.querySelectorAll('.tr-seg').length, on: ring.querySelectorAll('.tr-on').length,
           aria: n(ring.getAttribute('aria-label')), week: n((document.getElementById('home-week-sum') || {}).textContent),
           text: n(document.querySelector('#home-today-wrap').innerText),
           rows: [...document.querySelectorAll('#home-overview .hrow')].map(r => n(r.querySelector('.hrow-l').textContent)),
           career: document.getElementById('home-career-wrap').innerHTML.trim(), hold: document.getElementById('home-hold-wrap').innerHTML.trim() };
});
const waitRow = (p, ms) => p.waitForFunction(() => { const s = document.querySelector('#home-overview .today-mid span'); return !!s && s.textContent === 'Level'; },
  null, { timeout: ms || 5000 }).then(() => true, () => false);
const calls = (p, name) => p.evaluate(n => (window.__STUB.calls || []).filter(c => c === n).length, name);
const params = (p, name) => p.evaluate(n => (window.__STUB.params || []).filter(c => c[0] === n).map(c => c[1]), name);
// What a node says, line by line as the eye reads it (innerText keeps the breaks between its lines), spaces collapsed.
const T = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.innerText.replace(/ /g, ' ').replace(/\s+/g, ' ').trim() : null; }, sel);
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
// The catalogue's shapes: what the server really answers with the catalogue switch on (scripts/career/rehearse_catalogue.mjs on PGlite), in the TWO reads of stage70's split
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
//   get_profile(), the CORE   `owned` is a LIST of award ids sorted byte by byte, with no days; `badges` and `achievements` are the placeholders [] and there is no `titles` or
//                             `recent` at all; the ladder, `near`, `slam`, `numbers.four` and `moments` as before.
//   get_awards(), the SHELF   the rows: every badge (a live row has `day` and `days`, a retired one only id, subject, name, meaning, tier, of, superseded_by and `days`), the
//                             milestones, the titles, and `recent`. With the catalogue off it is { athlete_id, catalogue: null, badges: [], achievements: [], titles: [], recent: [] }.
//   get_my_moments()          the athlete's goal, Amir's lines, the award ids he saw, their honours (stage77); an honour's `value` is the jsonb stage75 stores.
// a null inside a ladder entry is not there at all (jsonb_strip_nulls); `near` rows carry only id, name, have, next, pct.
// `rwProfile()` builds the core and keeps its shelf beside it (`rwShelf(core)`); `stubSet(core)` is the JS that makes the stub answer both, for a page that changes its answer live.
// The catalogue's rows (what AA Proof fetches from career_catalogue) are career/*.toml through scripts/career_seed.py --json.
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
// jsonb_strip_nulls on one row: a null key is not there.
const strip = o => { const r = {}; Object.keys(o).forEach(k => { if (o[k] !== null && o[k] !== undefined) r[k] = o[k]; }); return r; };
const SWX = at(-40);                                                      // the XP switch's day in these profiles
// get_profile()'s ladder (a made-up athlete of the rehearsal): the entries the training app reads, with the keys the server really leaves out. The four marks (held_weeks, century,
// bests, comebacks) carry career/badges.toml's tiers: 4 · 8 · 12 · 24 · 52, 25 · 50 · 100 · 200 · 500, 5 · 10 · 25 · 50 · 100, 3 · 5 · 10 (`tier` the tier held, `next_tier` the one
// `next` reaches); the other entries are no mark and the training app does not name them.
const RW_LADDER = {
  held_weeks: { now: 3, have: 7, name: 'Hold Serve', next: 8, tier: 1, phone: 'week', counts: ['week_held'], meaning: 'consistency', next_tier: 2, size_next: 'highlight', metal_next: 'silver' },
  long_count: { have: 9, name: 'The Long Count', next: 10, phone: 'week', counts: ['week_held'], meaning: 'consistency', next_tier: 1, size_next: 'highlight', metal_next: 'bronze' },
  love_hold: { have: 1, name: 'Love Hold', next: 5, phone: 'week', counts: ['week_by_the_book'], meaning: 'commitment', next_tier: 1, size_next: 'win', metal_next: 'bronze' },
  finisher: { name: 'Closer', next: 1, phone: 'week', counts: ['cycle_finished'], meaning: 'commitment', next_tier: 1, size_next: 'milestone', metal_next: 'bronze' },
  century: { have: 24, name: 'Century', next: 25, phone: 'session', counts: ['session_finished', 'session_finished_early'], meaning: 'commitment', next_tier: 1, size_next: 'highlight', metal_next: 'bronze' },
  full_log: { have: 9, name: 'Paper Trail', next: 10, phone: 'session', counts: ['full_log'], meaning: 'commitment', next_tier: 1, size_next: 'win', metal_next: 'bronze' },
  pulse_check: { have: 3, name: 'Pulse Check', next: 10, phone: 'session', counts: ['checkin_done'], meaning: 'commitment', next_tier: 1, size_next: 'win', metal_next: 'bronze' },
  bests: { have: 12, name: 'Record Breaker', next: 25, tier: 2, meaning: 'progress', next_tier: 3, size_next: 'milestone', metal_next: 'emerald' },
  comebacks: { have: 5, name: 'HARD TO KILL', next: 10, tier: 2, meaning: 'resilience', next_tier: 3, size_next: 'milestone', metal_next: 'emerald' },
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
// One athlete's get_profile() with the catalogue on: the CORE (o.S = the switch day, null = phase 2's answer with the catalogue off). Its shelf, what
// get_awards() answers, is kept beside it (rwShelf(core)); o.owned / o.badges / o.achievements / o.titles / o.recent / o.version describe both.
// `owned` may be given as the old map { id: day } or a list of ids: the core's answer is the list, sorted byte by byte.
const SHELVES = new WeakMap();
const ownedList = x => Array.from(new Set(Array.isArray(x) ? x : Object.keys(x || {}))).sort();
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
  const version = o.version || '4@1760774400';
  Object.assign(p, {
    catalogue_version: version,
    // the core: the ids and nothing else (the days are the shelf's); `badges` and `achievements` stay the placeholders [] above
    owned: ownedList(Object.assign({ 'badge:held_weeks:1': 1, 'badge:held_weeks:2': 1, 'achievement:first_best': 1, 'badge:human_sprinkler:2': 1,
      'badge:habit_tiers:2:water': 1, 'title:clockwork': 1 }, Array.isArray(o.owned) ? Object.fromEntries(o.owned.map(id => [id, 1])) : (o.owned || {}))),
    title_worn: o.worn === undefined ? null : o.worn,
    slam: o.slam || { consistency: { id: 'clockwork', name: 'CLOCKWORK', day: at(-20) }, commitment: null, progress: null, resilience: null, grand: null },
    ladder: o.ladder || RW_LADDER,
    near: o.near || [{ id: 'full_log', name: 'Paper Trail', have: 9, next: 10, pct: 90 }, { id: 'century', name: 'Century', have: 24, next: 25, pct: 96 }],
    moments: o.moments || [],
  });
  // the shelf: get_awards()'s rows (a live badge row has `day` and `days`; days[i] is the day tier i+1 was earned, null for a tier skipped)
  SHELVES.set(p, {
    catalogue_version: version,
    badges: o.badges || [
      strip({ id: 'held_weeks', name: 'Hold Serve', meaning: 'consistency', tier: 2, metal: 'silver', day: at(-20), caption: '8 weeks held in a row. You keep showing up.', days: [at(-60), at(-20)] }),
      strip({ id: 'human_sprinkler', name: 'HUMAN SPRINKLER', meaning: 'consistency', tier: 2, of: 3, retired: true, superseded_by: 'habit_water', days: [null, at(-45)] }),
      strip({ id: 'habit_tiers', subject: 'water', meaning: 'consistency', tier: 2, retired: true, days: [null, at(-45)] })],
    achievements: o.achievements || [{ id: 'first_best', name: 'First Best', meaning: 'progress', day: at(-50), size: 'highlight', caption: 'Your first personal best. Not the last.' }],
    titles: o.titles || [{ id: 'clockwork', hab_id: 'clockwork', name: 'CLOCKWORK', meaning: 'consistency', metal: 'prismatic', from: 'Hold Serve, prismatic: 52 weeks held in a row', day: at(-20), source: 'award' }],
    recent: o.recent || [],
  });
  return p;
}
// get_awards()'s answer for a core made by rwProfile(): the shelf with the catalogue on, null with it off (the stub then answers the empty shelf).
function rwShelf(core) {
  const sh = core && SHELVES.get(core);
  if (!sh || !core.switch || !core.switch.catalogue) return null;
  return Object.assign({ athlete_id: core.athlete_id, catalogue: core.switch.catalogue }, sh);
}
// The JS that makes the stub answer a core AND its shelf, for a page whose answer changes live (the stub keeps both under window.__STUB).
const stubSet = core => `window.__STUB.profile = ${JSON.stringify(core)}, window.__STUB.awards = ${JSON.stringify(rwShelf(core))}`;
const RW_RULES = [{ version: 4, switch: { xp: SWX, catalogue: 'off' } }];     // the training app's Hold Serve read; the catalogue switch is the profile's
const rwLog = (n = 6, more) => { const L = {}; for (let i = 1; i <= n; i++) L[at(-i)] = { water: 8, sleep: 8, steps: 11000, fuel: 3 }; return Object.assign(L, more || {}); };
// AA Proof on a catalogue profile: UTC (so "today" is this script's), the career reveal already shown (careerSeen), the catalogue as the server holds it.
const rwProof = (prof, extra = {}) => Object.assign({ tz: 'UTC' }, extra, {
  seed: Object.assign({ _hab_log: extra.log || rwLog() }, extra.seed || {}),
  stub: Object.assign({ profile: prof, awards: rwShelf(prof), tables: { career_rules: RW_RULES, career_facts: [], career_catalogue: catRows() } }, extra.stub || {}),
  cfg: Object.assign({ careerSeen: SWX }, extra.cfg || {}) });
const ev = (p, src) => p.evaluate(src);
const toldCalls = p => p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'mark_moments_told').map(x => x[1]));
const celebrating = p => p.evaluate(() => UI.celebrate.map(e => (e.kind || 'level') + (e.id ? ':' + e.id : '')));

// get_my_moments() as stage77 answers it (a goal for this month, Amir's lines newest first, the award ids he saw, honours from last month). An honour's value is the jsonb stage75
// stores: {n} for Most sessions, {lift, pct} for Most improved, {weeks} for Full month. A near miss is never sent by the server; the app also ignores one that is.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthStart = off => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + off, 1)).toISOString().slice(0, 10); };
const monthName = iso => MONTHS[Number(iso.slice(5, 7)) - 1];
function myMomentsFx(o = {}) {
  const pm = monthStart(-1);
  return Object.assign({ athlete_id: H.ID,
    goal: { month: monthStart(0), line: 'Four sessions a week, no gaps.', done_at: null }, goals: [],
    notes: [{ day: at(0), line: 'Your squat looked sharp on Tuesday. Keep it there.', award_id: null, read: false },
            { day: at(-9), line: 'New block starts Monday. Same standard.', award_id: null, read: true }],
    saw: ['achievement:first_best', 'badge:held_weeks:2'],
    honours: [{ month: pm, honour: 'sessions', value: { n: 14 } }, { month: pm, honour: 'improved', value: { lift: 'Barbell Back Squat', pct: 27.1 } },
              { month: pm, honour: 'full_month', value: { weeks: 4 } }, { month: pm, honour: 'pick', value: {} }, { month: pm, honour: 'near', value: { n: 13 } }] }, o);
}


// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// THE TRAINING APP with the XP switch on and the catalogue off (phase 2's answer): the Career row, the copy, the demo, what a session earns
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function trainingBase(browser, C) {
  const L10 = lvl(10000);
  // 1. the switch on: the row, from the server behind the first paint; Hold Serve folded into it; a tap opens Progress at Your numbers
  {
    const { ctx, p } = await openP(browser, { facts: HOLD_FACTS, hist: ONE_DONE });
    const shown = await waitRow(p);
    const r = await row(p);
    C.check('on: Home has no Career row and no Hold Serve row — no door row at all', shown && r && r.rows.join() === '' && r.career === '' && r.hold === '', JSON.stringify(r && [r.rows, r.career, r.hold]));
    C.check('on: the level is the number inside the habit card\'s ring, and no rank name is said on the card', r && r.big === 'Level ' + L10.level && !RANKS.test(r.text), JSON.stringify(r));
    C.check('on: the ring is the day, a segment per habit, and says so', r && r.segs === 5 && /^\d of 5 done today$/.test(r.aria || ''), JSON.stringify(r && [r.segs, r.on, r.aria]));
    C.check('on: the weeks held in a row sit beside the week\'s own count, and what is left this week is not said twice',
      r && / · 3 weeks in a row$/.test(r.week || '') && !/more session/.test(r.week || ''), r && r.week);
    const order = await p.evaluate(() => {
      const ids = [...document.querySelectorAll('#home-overview > div')].map(d => d.id);
      return { note: ids.indexOf('home-note-wrap'), today: ids.indexOf('home-today-wrap'), sugg: ids.indexOf('home-sugg-wrap'),
        careerHtml: document.getElementById('home-career-wrap').innerHTML.trim(), holdHtml: document.getElementById('home-hold-wrap').innerHTML.trim() };
    });
    C.check('on: the days, then New from Amir, then Today\u2019s card, and the two old wraps stay in the page empty',
      order.sugg < order.note && order.note < order.today && order.careerHtml === '' && order.holdHtml === '', JSON.stringify(order));
    const keys = await p.evaluate(id => ({ cache: !!localStorage.getItem(id + '_careercache'), synced: Object.keys(_snapshot()).filter(k => /careercache|earn_d|momentscache/.test(k)) }), H.ID);
    C.check('on: the profile is kept on this phone, never synced', keys.cache && keys.synced.length === 0, JSON.stringify(keys));
    C.check('on: one get_profile, after Hold Serve\'s read said the switch is on; then one get_my_moments and one get_awards (Your moments)',
      await calls(p, 'rpc:get_profile') === 1 && await calls(p, 'rpc:get_my_moments') === 1 && await calls(p, 'rpc:get_awards') === 1,
      JSON.stringify([await calls(p, 'rpc:get_profile'), await calls(p, 'rpc:get_my_moments'), await calls(p, 'rpc:get_awards')]));
    // The ring is display only: Your numbers is one tap away in the tab bar, and the card's own › goes to the habits page.
    // goCareer() stays for the deep link AA Proof's door card uses (?go=numbers).
    const ringTap = await p.evaluate(() => ({ button: document.querySelector('#home-overview .today-ring').tagName, go: (document.querySelector('.today-go') || {}).getAttribute('aria-label') }));
    C.check('on: the ring is not a button, and the card\'s › opens the habits page', ringTap.button === 'DIV' && ringTap.go === 'Open your habits', JSON.stringify(ringTap));
    await p.evaluate(() => goCareer());
    await p.waitForTimeout(800);
    const tap = await p.evaluate(() => ({ screen: document.querySelector('.screen.active').id, url: location.pathname + location.search, top: Math.round(document.getElementById('numbers-title').getBoundingClientRect().top) }));
    C.check('on: goCareer() still opens Progress at Your numbers (the deep link), and AA Proof is not opened', tap.screen === 'screen-plan' && /program\.html/.test(tap.url) && !/habits/.test(tap.url) && tap.top >= 0 && tap.top < 160, JSON.stringify(tap));
    C.check('on: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 1b. Progress with only the level (the catalogue off): the career's card, no four numbers, no moments, and Records and body under its title
  {
    const { ctx, p } = await openP(browser, { facts: HOLD_FACTS, hist: ONE_DONE });
    await waitRow(p);
    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(600);
    const o = await p.evaluate(() => {
      const c = document.querySelector('#career-card-wrap .cs-card');
      return { card: !!c, lvl: c && c.querySelector('.cs-lw').textContent, xp: c ? /XP/.test(c.innerText) : false, grid: !!document.querySelector('#career-card-wrap .cs-grid'), goal: !!document.querySelector('.goal-card'),
        moments: !!document.querySelector('#career-moments-wrap .hrow'), rows: !!document.querySelector('#ceiling-row-wrap .hrow') && !!document.querySelector('#weight-row-wrap .hrow') };
    });
    // THE SCOREBOARD (2026-10-19): the level is the card's quiet foot and the XP figure is gone from the athlete's view.
    C.check('Progress with only the XP switch: the career\'s card is the level alone, no four numbers, no XP figure, no goal, no moments door; the two rows are there',
      o.card && o.lvl === `Level ${L10.level}` && !o.xp && !o.grid && !o.goal && !o.moments && o.rows, JSON.stringify(o));
    C.check('Progress with only the XP switch: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 2. the switch off, or a rulebook from before the switches (the live one until stage69): no row and no profile asked for; Progress has no career
  for (const [name, rules] of [['off', RULES_OFF], ['phase 1 rulebook', RULES_V1]]) {
    const { ctx, p } = await openP(browser, { rules });
    await p.waitForTimeout(1200);
    C.check(`${name}: no Career row`, (await row(p)) === null, JSON.stringify(await row(p)));
    C.check(`${name}: get_profile and get_my_moments are never asked`, await calls(p, 'rpc:get_profile') === 0 && await calls(p, 'rpc:get_my_moments') === 0, JSON.stringify([await calls(p, 'rpc:get_profile'), await calls(p, 'rpc:get_my_moments')]));
    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(500);
    const pr = await p.evaluate(() => ({ card: !!document.querySelector('#career-card-wrap .cs-card'), moments: !!document.querySelector('#career-moments-wrap .hrow'),
      ach: !!document.querySelector('#career-courts-wrap .hrow'), rows: !!document.querySelector('#ceiling-row-wrap .hrow') }));
    C.check(`${name}: Progress has no career card and neither career door, and the two rows are there`, !pr.card && !pr.moments && !pr.ach && pr.rows, JSON.stringify(pr));
    C.check(`${name}: no page errors`, p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 3. the phone's copy: the row at once while the server says nothing; gone (and the copy dropped) when the server's switch is off
  {
    const seed = { _careercache: { p: profile(10000), at: Date.now() - 3600000 } };
    let { ctx, p } = await openP(browser, { seed, stub: { stall: { get_profile: true } }, facts: HOLD_FACTS, hist: ONE_DONE });
    C.check('copy: the level from the phone\'s copy while the server is still thinking', !!(await row(p)) && (await row(p)).big === 'Level ' + L10.level, JSON.stringify(await row(p)));
    C.check('copy: no row of any kind on Home', await p.evaluate(() => document.getElementById('home-hold-wrap').innerHTML.trim() === '' && document.getElementById('home-career-wrap').innerHTML.trim() === ''));
    await ctx.close();
    ({ ctx, p } = await openP(browser, { seed, rules: RULES_OFF }));
    await p.waitForTimeout(1200);
    // No career: the ring's middle falls back to the day's own count, which is the one thing it can always say.
    const off = await p.evaluate(() => ({ kick: (document.querySelector('#home-overview .today-mid span') || {}).textContent, mid: (document.querySelector('#home-overview .today-mid b') || {}).textContent }));
    C.check('copy: the switch off on the server takes the level and the copy away, and the ring counts the day instead',
      (await row(p)) === null && off.kick === 'Done' && /^\d\/5$/.test(off.mid || '')
      && !(await p.evaluate(id => localStorage.getItem(id + '_careercache'), H.ID)), JSON.stringify([off, await row(p)]));
    await ctx.close();
  }
  // 3b. no level yet (the server says nothing and there is no copy): the weeks held still show beside the week, because they are
  //     read from career_facts and not from the profile; the level lands in the ring when the profile does.
  {
    const { ctx, p } = await openP(browser, { stub: { stall: { get_profile: true } }, facts: HOLD_FACTS, hist: ONE_DONE });
    await p.waitForFunction(() => / · 3 weeks in a row$/.test((document.getElementById('home-week-sum') || {}).textContent || ''), null, { timeout: 5000 }).catch(() => {});
    const h = await p.evaluate(() => ({ week: (document.getElementById('home-week-sum') || {}).textContent, kick: (document.querySelector('#home-overview .today-mid span') || {}).textContent }));
    C.check('no level yet (no answer, no copy): the run shows beside the week and the ring counts the day', (await row(p)) === null && / · 3 weeks in a row$/.test(h.week || '') && h.kick === 'Done', JSON.stringify(h));
    await p.evaluate(() => { window.__STUB.stall = {}; refreshCareer(); });
    await waitRow(p);
    C.check('…and the level lands in the ring once the profile arrives, with the run still beside the week',
      !!(await row(p)) && / · 3 weeks in a row$/.test((await row(p)).week || ''), JSON.stringify(await row(p)));
    await ctx.close();
  }
  // 4. never in the demo or the coach's preview
  for (const [name, query] of [['demo', '?client=demo'], ['coach preview', '?client=rel01_athlete&preview=1']]) {
    const { ctx, p } = await openP(browser, { query, seed: { _careercache: { p: profile(10000), at: Date.now() } }, stub: { myMoments: myMomentsFx() } });
    await p.waitForTimeout(1200);
    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(500);
    const o = await p.evaluate(() => ({ note: document.getElementById('home-note-wrap').innerHTML.trim(), card: !!document.querySelector('#career-card-wrap .cs-card'),
      doors: document.querySelectorAll('#career-courts-wrap .hrow, #career-moments-wrap .hrow').length }));
    C.check(`${name}: no Career row, no profile asked, no moments asked, no note, no career card and neither career door on Progress`, (await row(p)) === null && await calls(p, 'rpc:get_profile') === 0 && await calls(p, 'rpc:get_my_moments') === 0
      && await calls(p, 'rpc:get_awards') === 0 && o.note === '' && !o.card && o.doors === 0, JSON.stringify({ row: await row(p), asked: await calls(p, 'rpc:get_profile'), o }));
    await ctx.close();
  }
  // 5. the habits row never says a level of its own in Career Mode (Proof's snapshot from yesterday said "Level 7")
  for (const [name, rules, want] of [['on', RULES_ON, 'Ready for today'], ['off', RULES_OFF, 'Level 7']]) {
    const { ctx, p } = await openP(browser, { rules });
    if (name === 'on') await waitRow(p);
    // Today's card is this app's own since AA Proof was retired into it (2026-10-19): the verdict is worked
    // out here from <id>_hab_log, never read from a snapshot another app published.
    const said = await p.evaluate(() => {
      const v = document.querySelector('#home-today-wrap .today-v');
      return v ? v.textContent.trim() : null;
    });
    C.check(`Today's card, switch ${name}: it says the state itself`, said === null || /left|counts|Perfect/.test(said), said);
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
    C.check('finish: no rank name on the finish card or the finished card', !RANKS.test(await T(p, '#complete-1') || ''), await T(p, '#complete-1'));
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
  // 8. 320 px: the row fits
  {
    const { ctx, p } = await openP(browser, { w: 320, facts: HOLD_FACTS, hist: ONE_DONE });
    await waitRow(p);
    const fit = await p.evaluate(() => {
      const head = document.querySelector('#home-overview .today-head').getBoundingClientRect();
      const bits = [...document.querySelectorAll('#home-overview .today-ring, #home-overview .today-v, #home-overview .hb-day, #home-overview .today-go')].map(e => Math.round(e.getBoundingClientRect().right));
      return { right: Math.round(head.right), bits, vw: innerWidth, sideways: document.documentElement.scrollWidth > innerWidth };
    });
    C.check('320 px: the ring, the state, the days and the › all fit, no sideways scroll', fit.right <= fit.vw && fit.bits.every(v => v <= fit.vw) && !fit.sideways, JSON.stringify(fit));
    await ctx.close();
  }
}


// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// THE TRAINING APP with the catalogue on: the nearest mark, Your numbers, New from Amir, the finish card's moves, bands, moments
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const rwSeenOf = p => p.evaluate(id => JSON.parse(localStorage.getItem(id + '_rw_seen') || 'null'), H.ID);
// The training app on a catalogue profile: UTC, the fixture's two-day plan dated so that the current cycle's week 2 is under way (prog()).
async function openRW(browser, o = {}) {
  const prof = o.profile === null ? null : (o.profile || rwProfile(10000));
  const stub = Object.assign({ tables: { career_rules: RW_RULES, career_facts: o.facts || [], career_catalogue: catRows() } },
    prof === null ? {} : { profile: prof, awards: rwShelf(prof) }, o.stub || {});
  return H.openProgram(browser, Object.assign({ w: o.w || 390, h: 844, tz: 'UTC', prog: o.prog || prog(), hist: o.hist || [], stub,
    seed: Object.assign({ _hab_cfg: HAB_ON }, o.seed || {}), query: o.query || '' }, o.opts || {}));
}
const goProgress = async p => { await p.evaluate(() => goTo('plan')); await p.waitForTimeout(500); };
const momentsReady = p => p.waitForFunction(() => !!document.querySelector('#career-moments-wrap .hrow'), null, { timeout: 8000 }).catch(() => {});
async function trainingLight(browser, C) {
  const OUT = H.outDir();
  const shot = (p, name) => p.screenshot({ path: path.join(OUT, name) }).catch(() => {});
  const TODAY = at(0);
  const CLAY = /199, 85, 47|181, 70, 31|224, 107, 67/;                    // --clay, --clay-ink, dark mode's clay text
  const L10 = lvl(10000);
  // 1. the catalogue on, and what is left of the Career row on Home: the level in the ring, the run beside the week, and the
  //    nearest mark NOT on Home at all — it is on Progress, where the Achievements door names what is closest.
  {
    const { ctx, p } = await openRW(browser, { facts: HOLD_FACTS, hist: ONE_DONE });
    await waitRow(p);
    const r = await row(p);
    C.check('light, on: the level is in the ring and the run is beside the week\'s count', r && r.big === 'Level ' + L10.level
      && / · 3 weeks in a row$/.test(r.week || ''), JSON.stringify(r));
    C.check('light, on: the nearest mark is not said on Home any more (Progress names it)', r && !/to 25 with Amir/.test(r.text + ' ' + r.week), JSON.stringify([r && r.text, r && r.week]));
    C.check('light, on: no rank, no badge name, no metal on the card', r && !RANKS.test(r.text) && !METALS.test(r.text) && !/Hold Serve|Century|Paper Trail|AA Proof|Locker/i.test(r.text), r && r.text);
    C.check('light, on: the ring says the day in words for a screen reader', r && /^\d of 5 done today$/.test(r.aria || ''), r && r.aria);
    await shot(p, 'light-home-row-390.png');
    C.check('light, on: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
    // a far mark is left out (no line at all but this week's): 4 weeks to the first, 22 sessions, 4 bests, 5 comebacks; the numbers still show on Progress, small or zero, each with its next mark
    const far = rwProfile(10000, { sessions: 3, four: { consistency: { key: 'weeks_held', value: 0, best: 0 }, commitment: { key: 'sessions_with_amir', value: 3 }, progress: { key: 'personal_bests', value: 1 }, resilience: { key: 'comebacks', value: 5 } },
      ladder: Object.assign({}, RW_LADDER, { held_weeks: { now: 0, have: 0, name: 'Hold Serve', next: 4, phone: 'week', counts: ['week_held'], meaning: 'consistency', next_tier: 1, size_next: 'highlight', metal_next: 'bronze' },
        century: Object.assign({}, RW_LADDER.century, { have: 3 }), bests: { have: 1, name: 'Record Breaker', next: 5, meaning: 'progress', next_tier: 1 } }) });
    const o2 = await openRW(browser, { profile: far, facts: HOLD_FACTS, hist: ONE_DONE });
    await waitRow(o2.p);
    const r2 = await row(o2.p);
    C.check('light, on: far from every mark, Home still says the level and the run, and no mark line', r2 && r2.big === 'Level ' + L10.level
      && / · 3 weeks in a row$/.test(r2.week || '') && !/to 4 |to 5 |to 25 /.test(r2.text || ''), JSON.stringify(r2 && [r2.big, r2.week]));
    await goProgress(o2.p);
    // The next mark left the card with THE SCOREBOARD (2026-10-19); the four numbers themselves still all show, small or zero.
    const cells = await o2.p.evaluate(() => [...document.querySelectorAll('#career-card-wrap .cs-n')].map(n => n.querySelector('b').textContent + ' ' + n.querySelector('.cs-nm').textContent));
    C.check('light, on: all four numbers show on Progress even when small or zero', cells.join(' ; ') === '0 weeks held ; 3 sessions with Amir ; 1 personal best ; 5 comebacks', cells.join(' ; '));
    await o2.ctx.close();
    // a number at 0 is never the nearest mark: 0 comebacks is 3 from 3, but "3 comebacks to 3 comebacks" says nothing, so Home stays quiet
    const z = rwProfile(10000, { sessions: 3, four: { consistency: { key: 'weeks_held', value: 0, best: 0 }, commitment: { key: 'sessions_with_amir', value: 3 }, progress: { key: 'personal_bests', value: 1 }, resilience: { key: 'comebacks', value: 0 } },
      ladder: Object.assign({}, RW_LADDER, { held_weeks: { now: 0, have: 0, name: 'Hold Serve', next: 4, phone: 'week', counts: ['week_held'], meaning: 'consistency', next_tier: 1, size_next: 'highlight', metal_next: 'bronze' },
        century: Object.assign({}, RW_LADDER.century, { have: 3 }), bests: { have: 1, name: 'Record Breaker', next: 5, meaning: 'progress', next_tier: 1 }, comebacks: { name: 'HARD TO KILL', next: 3, meaning: 'resilience', next_tier: 1 } }) });
    const o5 = await openRW(browser, { profile: z, facts: HOLD_FACTS, hist: ONE_DONE });
    await waitRow(o5.p);
    const r5 = await row(o5.p);
    C.check('light, on: a number at 0 is never named on Home (no "3 comebacks to 3 comebacks")', r5 && !/comebacks to/.test(r5.text + ' ' + r5.week), JSON.stringify(r5 && [r5.text, r5.week]));
    await o5.ctx.close();
    // a free athlete's four (day streak, perfect days, habit steps locked, comebacks): only a number that has a mark is a cell
    const o3 = await openRW(browser, { profile: rwProfile(10000, { free: true }) });
    await waitRow(o3.p);
    await goProgress(o3.p);
    const c3 = await o3.p.evaluate(() => [...document.querySelectorAll('#career-card-wrap .cs-n')].map(n => n.querySelector('b').textContent + ' ' + n.querySelector('.cs-nm').textContent));
    C.check('light, on, a free athlete\'s four: only Comebacks has a mark, so it is the one cell', c3.join() === '5 comebacks', c3.join());
    await o3.ctx.close();
  }
  // 2. 320 px and dark: the ring, the state and the four days fit, and the run sits beside the week's count (2026-10-20: the
  //    Career row's two lines are the ring's number and that one line now)
  for (const [w, dark] of [[320, false], [320, true], [390, true]]) {
    const { ctx, p } = await openRW(browser, { w, opts: { dark }, facts: HOLD_FACTS, hist: ONE_DONE });
    await waitRow(p);
    const m = await p.evaluate(() => {
      const head = document.querySelector('#home-overview .today-head'), hr = head.getBoundingClientRect();
      const bits = [...head.querySelectorAll('.today-ring, .today-v, .today-s, .hb-day, .today-go')].map(e => Math.round(e.getBoundingClientRect().right));
      const v = head.querySelector('.today-v'), lh = parseFloat(getComputedStyle(v).lineHeight) || 28;
      return { right: Math.round(hr.right), vw: innerWidth, side: document.documentElement.scrollWidth > innerWidth, bits,
               lines: Math.round(v.getBoundingClientRect().height / lh), week: (document.getElementById('home-week-sum') || {}).textContent,
               ink: getComputedStyle(document.querySelector('.today-mid b')).color, bg: getComputedStyle(document.querySelector('.today-card')).backgroundColor };
    });
    C.check(`light ${w}px${dark ? ' dark' : ''}: the ring, the state, the days and the › all fit, the state takes at most two lines`,
      m.right <= m.vw && !m.side && m.bits.every(v => v <= m.vw) && m.lines <= 2, JSON.stringify(m));
    C.check(`light ${w}px${dark ? ' dark' : ''}: the run is beside the week's count`, / · 3 weeks in a row$/.test(m.week || ''), m.week);
    if (dark) C.check(`light ${w}px dark: the level reads light on the card's own dark`, /rgb\(2[0-9]{2}/.test(m.ink) && !/255, 255, 255\)$/.test(m.bg), m.ink + ' on ' + m.bg);
    await shot(p, `light-home-row-${w}${dark ? '-dark' : ''}.png`);
    await ctx.close();
  }
  // 3. Progress → Your numbers: the career's card, the goal, Your moments, Records and body
  {
    const MM = myMomentsFx();
    const { ctx, p } = await openRW(browser, { facts: HOLD_FACTS, hist: ONE_DONE, stub: { myMoments: MM } });
    await waitRow(p);
    await goProgress(p);
    await momentsReady(p);
    await p.waitForTimeout(200);
    const card = await p.evaluate(() => {
      const c = document.querySelector('#career-card-wrap .cs-card');
      if (!c) return null;
      return { label: c.getAttribute('aria-label'), lw: c.querySelector('.cs-lw').textContent.trim(), xp: /XP/.test(c.innerText),
        bar: c.querySelector('.cs-foot .cs-bar i').style.width, text: c.innerText.replace(/\s+/g, ' '),
        cells: [...c.querySelectorAll('.cs-n')].map(n => ({ v: n.querySelector('b').textContent, nm: n.querySelector('.cs-nm').textContent, mk: !!n.querySelector('.cs-mk'), bar: !!n.querySelector('.cs-bar') })),
        gridCols: getComputedStyle(c.querySelector('.cs-grid')).gridTemplateColumns.split(' ').length,
        order: [...c.children].map(e => e.className.split(' ')[0]).join('|') };
    });
    // THE SCOREBOARD (2026-10-19): the four numbers lead and the level is the card's quiet foot. The XP figure, each cell's next
    // mark and its bar, and "best 7" on weeks held are gone from the athlete's view (the nearest mark is on Home's Career row).
    C.check('Your numbers: the four numbers first, then "Level N" and its bar as the foot, and no XP figure anywhere on the card',
      !!card && card.order === 'cs-grid|cs-foot|cs-share' && card.lw === `Level ${L10.level}` && !card.xp
      && card.bar === Math.round(L10.xp_in_level / L10.level_cost * 100) + '%' && card.label === `Your numbers. Level ${L10.level}.`,
      JSON.stringify(card && [card.order, card.lw, card.xp, card.bar, card.label]));
    C.check('Your numbers: the four numbers 2 x 2, each its figure and its name alone (no next mark, no bar of its own)',
      !!card && card.gridCols === 2 && JSON.stringify(card.cells) === JSON.stringify([
        { v: '3', nm: 'weeks held', mk: false, bar: false }, { v: '24', nm: 'sessions with Amir', mk: false, bar: false },
        { v: '12', nm: 'personal bests', mk: false, bar: false }, { v: '5', nm: 'comebacks', mk: false, bar: false }]), JSON.stringify(card && [card.gridCols, card.cells]));
    C.check('Your numbers: no rank, no badge name, no metal, no Grand Slam on the card', !!card && !RANKS.test(card.text) && !METALS.test(card.text) && !/Hold Serve|Century|Record Breaker|HARD TO KILL|Grand Slam|title/i.test(card.text), card && card.text);
    // The goal is a job Amir set, so since 2026-10-20 it is its own card under the cover, above Your numbers. Progress is a
    // single-accent screen (PROGRESS ONLY: single accent remaps --clay-ink inside #screen-plan), so the empty ring does the
    // asking and the label stays green; the ring filling is the only thing that changes when he ticks it off.
    const goal = await p.evaluate(() => { const g = document.querySelector('#goal-wrap .goal-card'); const c = g && getComputedStyle(g.querySelector('.goal-k')).color;
      return g ? { cls: g.className, l: g.querySelector('.goal-k').textContent.replace(/\s+/g, ' ').trim(), line: g.querySelector('.goal-l').textContent.trim(), ring: !!g.querySelector('.goal-ring'), clay: c, inCard: !!document.querySelector('#career-card-wrap .goal-card') } : null; });
    C.check('The month\'s goal: its own card, "<Month> · from Amir" over his line, an empty ring, green like the rest of Progress, and not inside the numbers card',
      !!goal && goal.l === monthName(monthStart(0)) + ' · from Amir' && goal.line === 'Four sessions a week, no gaps.' && goal.ring && !/is-done/.test(goal.cls)
      && !CLAY.test(goal.clay) && !goal.inCard, JSON.stringify(goal));
    // The two career doors on the tab, and nothing of their lists left on it.
    const doors = await p.evaluate(() => {
      const d = sel => { const b = document.querySelector(sel); return b ? { l: b.querySelector('.hrow-l').textContent.trim(), v: b.querySelector('.hrow-vv').textContent.trim(), s: (b.querySelector('.hrow-v small') || {}).textContent.trim() } : null; };
      return { ach: d('#career-courts-wrap .hrow'), mom: d('#career-moments-wrap .hrow'), onTab: document.querySelectorAll('#screen-plan .mo, #screen-plan .ac-tile, #screen-plan .ac-next').length };
    });
    C.check('Progress: Your moments is a door with its count and the newest moment, and nothing of the list is left on the tab',
      !!doors.mom && doors.mom.l === 'Your moments' && doors.mom.v === '9' && doors.mom.s === MM.notes[0].line && doors.onTab === 0, JSON.stringify(doors));
    await shot(p, 'light-progress-390.png');
    const order = await p.evaluate(() => {
      const y = sel => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
      return { goal: y('.goal-card'), numbers: y('#numbers-title'), card: y('.cs-card'), trend: y('.tr-card'), body: y('#body-title'), ceil: y('#ceiling-row-wrap .hrow'),
        weight: y('#weight-row-wrap .hrow'), hab: y('#habits-block-wrap .hrow'), ach: y('#career-courts-wrap .hrow'), moments: y('#career-moments-wrap .hrow'), road: y('#road-wrap .prog-sec') };
    });
    // The habits door needs a habit config and the Achievements door a get_achievements answer; this athlete has neither, so the
    // order is of the doors that are there. Their full set is checked in home-progress.js and in fourCourts() below.
    const seq = ['goal', 'numbers', 'card', 'trend', 'body', 'ceil', 'weight', 'hab', 'ach', 'moments', 'road'].map(k => order[k]).filter(v => v != null);
    C.check('Progress in order (2026-10-20): the goal, Your numbers, the card, Getting stronger, Your body and its rows, the earned doors, the Game Plan',
      seq.length >= 7 && seq.every((v, i) => i === 0 || v > seq[i - 1]), JSON.stringify(order));
    // The page behind the door: every moment, under a heading for its month.
    await p.evaluate(() => goTo('moments'));
    await p.waitForTimeout(300);
    const mo = await p.evaluate(() => ({
      screen: (document.querySelector('.screen.active') || {}).id,
      title: (document.querySelector('#screen-moments .ceil-title') || {}).textContent.trim(),
      lit: [...document.querySelectorAll('#global-tabs .nav-item.active')].map(n => n.dataset.tab).join(),
      months: [...document.querySelectorAll('#mom-body .mom-month')].map(h => h.textContent.replace(/\s+/g, ' ').trim()),
      rows: [...document.querySelectorAll('#mom-body .mo')].map(r => ({ kind: r.className.replace('mo ', '').replace('mo-', ''), shown: !!r.offsetParent, w: r.querySelector('.mo-w').textContent.trim(),
        s: ((r.querySelector('.mo-s') || r.querySelector('.mo-from') || {}).textContent || '').trim(), saw: !!r.querySelector('.mo-saw'), href: (r.querySelector('.mo-reply') || {}).href || null,
        blank: r.querySelector('.mo-reply') ? r.querySelector('.mo-reply').target : null, note: r.dataset.note || null })),
    }));
    const pm = monthName(monthStart(-1));
    const by = w => mo.rows.find(r => r.w === w);
    C.check('Your moments: its own page with the Progress tab lit, all nine shown, each under its month\'s heading',
      mo.screen === 'screen-moments' && mo.title === 'Your moments' && mo.lit === 'plan' && mo.rows.length === 9 && mo.rows.every(r => r.shown) && mo.months.length >= 2, JSON.stringify([mo.screen, mo.title, mo.lit, mo.rows.length, mo.months]));
    C.check('Your moments: Amir\'s newest line is first, in his words, with Reply on WhatsApp (a new tab) under it', mo.rows[0].kind === 'note' && mo.rows[0].s === MM.notes[0].line && mo.rows[0].note === MM.notes[0].day
      && !!mo.rows[0].href && /wa\.me|whatsapp/i.test(mo.rows[0].href) && decodeURIComponent(mo.rows[0].href).indexOf('About your note: \u201c' + MM.notes[0].line + '\u201d') >= 0 && mo.rows[0].blank === '_blank', JSON.stringify(mo.rows[0]));
    C.check('Your moments: a mark is one row per tier, in the number\'s words ("8 weeks held in a row"), the newest tier first', !!by('8 weeks held in a row') && !!by('4 weeks held in a row')
      && mo.rows.indexOf(by('8 weeks held in a row')) < mo.rows.indexOf(by('4 weeks held in a row')), JSON.stringify(mo.rows.map(r => r.w)));
    C.check('Your moments: an achievement keeps its name (a name in capitals reads as a name) and its line', !!by('First Best') && by('First Best').s === 'Your first personal best. Not the last.', JSON.stringify(by('First Best')));
    C.check('Your moments: honours say their month and what they were for (Most sessions, Most improved, Full month, Amir\'s Pick, which carries a line of its own now), read from the stored jsonb; a near miss is never shown',
      !!by('Most sessions in ' + pm) && by('Most sessions in ' + pm).s === '14 sessions with Amir that month.' && !!by('Most improved in ' + pm) && by('Most improved in ' + pm).s === '+27.1% on Barbell Back Squat.'
      && !!by('Full month: ' + pm) && by('Full month: ' + pm).s === 'All 4 training weeks held.' && !!by('Amir\u2019s Pick for ' + pm) && by('Amir\u2019s Pick for ' + pm).s === 'Amir picked you that month.'
      && !mo.rows.some(r => /near/i.test(r.w)), JSON.stringify(mo.rows.map(r => r.w + ' / ' + r.s)));
    C.check('Your moments: "Amir saw this" sits under the moments whose award id he marked Saw it (First Best, 8 weeks held), and under no other', mo.rows.filter(r => r.saw).map(r => r.w).sort().join() === '8 weeks held in a row,First Best', JSON.stringify(mo.rows.filter(r => r.saw).map(r => r.w)));
    C.check('Your moments: no other badge, no retired badge, no title, no Grand Slam, no metal', !mo.rows.some(r => /SPRINKLER|Sprinkler|CLOCKWORK|Clockwork|Grand Slam|Hold Serve|Century/.test(r.w + ' ' + r.s)) && !METALS.test(mo.rows.map(r => r.w + ' ' + r.s).join(' ')), JSON.stringify(mo.rows.map(r => r.w)));
    // ONE share door at the top of the page, and no Share on any row (2026-10-20).
    const sd = await p.evaluate(() => ({ door: !!document.querySelector('#mom-body .mom-share-door'),
      l: (document.querySelector('#mom-body .mom-share-door .hrow-l') || {}).textContent,
      q: (document.querySelector('#mom-body .mom-share-door .hrow-q') || {}).textContent,
      first: document.querySelector('#mom-body > *').className, perRow: document.querySelectorAll('#mom-body .mo-share').length }));
    C.check('Your moments: ONE Share door above the list, and no Share button on any row',
      sd.door && sd.perRow === 0 && sd.l === 'Share a moment' && /cards to pick from/.test(sd.q || '') && /mom-share-door/.test(sd.first), JSON.stringify(sd));
    await p.click('#mom-body .mom-share-door');
    await p.waitForTimeout(700);
    const sh = await p.evaluate(() => { const ov = document.getElementById('hist-overlay');
      return { open: ov.classList.contains('visible'), title: (ov.querySelector('.readiness-title') || {}).textContent, picks: ov.querySelectorAll('.hl-pick button').length }; });
    C.check('Your moments: the door opens the share sheet with every card in it to pick from', sh.open && sh.picks >= 5, JSON.stringify(sh));
    await p.evaluate(() => history.back());
    await p.waitForTimeout(300);
    await shot(p, 'light-moments-390.png');
    const back = await p.evaluate(() => { document.querySelector('#screen-moments .nav-back').click(); return (document.querySelector('.screen.active') || {}).id; });
    C.check('Your moments: the back arrow lands on Progress', back === 'screen-plan', back);
    C.check('Progress: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
    // a goal that is done: the ring fills green and the label says done; no goal this month: no goal card
    const d = await openRW(browser, { stub: { myMoments: myMomentsFx({ goal: { month: monthStart(0), line: 'Four sessions a week, no gaps.', done_at: new Date().toISOString() } }) } });
    await waitRow(d.p);
    await goProgress(d.p);
    await momentsReady(d.p);
    const dg = await d.p.evaluate(() => { const g = document.querySelector('.goal-card'); const r = g && g.querySelector('.goal-ring');
      return g ? { cls: g.className, l: g.querySelector('.goal-k').textContent.replace(/\s+/g, ' ').trim(), ring: r && getComputedStyle(r).backgroundColor } : null; });
    C.check('a goal Amir ticked off: "<Month> · done" and the ring filled green', !!dg && /is-done/.test(dg.cls) && dg.l === monthName(monthStart(0)) + ' · done' && /rgb\(14, 74, 54\)/.test(dg.ring || ''), JSON.stringify(dg));
    await d.ctx.close();
    const n0 = await openRW(browser, { stub: { myMoments: myMomentsFx({ goal: null, notes: [], honours: [], saw: [] }) } });
    await waitRow(n0.p);
    await goProgress(n0.p);
    await momentsReady(n0.p);
    const ng = await n0.p.evaluate(() => ({ goal: !!document.querySelector('.goal-card'), door: (document.querySelector('#career-moments-wrap .hrow-vv') || {}).textContent }));
    C.check('no goal this month and nothing from Amir: no goal card; the marks and the achievement are still the moments (3)', !ng.goal && ng.door === '3', JSON.stringify(ng));
    await n0.ctx.close();
    // 320 px and dark: the card, the goal and the moments fit
    for (const [w, dark] of [[320, false], [320, true], [390, true]]) {
      const x = await openRW(browser, { w, opts: { dark }, stub: { myMoments: myMomentsFx() } });
      await waitRow(x.p);
      await goProgress(x.p);
      await momentsReady(x.p);
      await x.p.waitForTimeout(200);
      const g = await x.p.evaluate(() => { const r = el => el.getBoundingClientRect(); const cs = document.querySelector('.cs-card'), mo = document.querySelector('#career-moments-wrap .hrow');
        const extra = [...document.querySelectorAll('.goal-card, .tr-card, .body-card')].map(e => Math.round(r(e).right));
        return { side: document.documentElement.scrollWidth - innerWidth, card: Math.round(r(cs).right), moments: Math.round(r(mo).right), vw: innerWidth, extra, cells: [...document.querySelectorAll('.cs-n')].map(n => Math.round(r(n).right)) }; });
      C.check(`Your numbers ${w}px${dark ? ' dark' : ''}: the card, its four numbers, the goal, the trend, Your body and the moments fit, no sideways scroll`,
        g.side <= 0 && g.card <= g.vw && g.moments <= g.vw && g.cells.every(v => v <= g.vw) && g.extra.every(v => v <= g.vw), JSON.stringify(g));
      await shot(x.p, `light-progress-${w}${dark ? '-dark' : ''}.png`);
      C.check(`Your numbers ${w}px${dark ? ' dark' : ''}: no page errors`, x.p.errs.length === 0, JSON.stringify(x.p.errs));
      await x.ctx.close();
    }
  }
  // 4. New from Amir: his newest unread line on Home, read at the tap (here and on the server), opens Progress on it
  {
    const MM = myMomentsFx();
    const { ctx, p } = await openRW(browser, { stub: { myMoments: MM }, facts: HOLD_FACTS, hist: ONE_DONE });
    await p.waitForFunction(() => !!document.querySelector('#home-note-wrap .from-amir'), null, { timeout: 8000 }).catch(() => {});
    const n = await p.evaluate(() => { const r = document.querySelector('#home-note-wrap .from-amir'); if (!r) return null; const lab = r.querySelector('.hrow-l');
      return { label: lab.textContent.trim(), color: getComputedStyle(lab).color, q: r.querySelector('.note-q').textContent, aria: r.getAttribute('aria-label'), av: !!r.querySelector('.note-av'),
        dot: getComputedStyle(r.querySelector('.note-av'), '::after').backgroundColor, tag: r.tagName };
    });
    C.check('New from Amir: a row on Home with his newest unread line in quotes and the label in clay (the one clay thing on Home until it is read)', !!n && n.label === 'New from Amir' && n.tag === 'BUTTON' && n.q === MM.notes[0].line && CLAY.test(n.color) && n.av && CLAY.test(n.dot), JSON.stringify(n));
    C.check('New from Amir: its aria-label says what it is', !!n && n.aria === 'New from Amir: ' + MM.notes[0].line, n && n.aria);
    const place = await p.evaluate(() => { const ids = [...document.querySelectorAll('#home-overview > div')].map(d => d.id); return [ids.indexOf('home-sugg-wrap'), ids.indexOf('home-note-wrap'), ids.indexOf('home-career-wrap')]; });
    C.check('New from Amir: after the week\'s days, above the Career row', place[0] < place[1] && place[1] < place[2], place.join());
    await shot(p, 'light-home-note-390.png');
    await p.click('#home-note-wrap .from-amir');
    await p.waitForTimeout(900);
    // THE SCOREBOARD (2026-10-19): the list is its own page, so the tap lands there, on that line, instead of Progress scrolled.
    const s = await p.evaluate(day => { const row = document.querySelector('#mom-body .mo[data-note="' + day + '"]'); const r = row && row.getBoundingClientRect();
      return { screen: document.querySelector('.screen.active').id, row: !!row, isNew: !!row && row.classList.contains('is-new'), visible: !!row && !!row.offsetParent, inView: !!r && r.top >= 0 && r.bottom <= innerHeight }; }, MM.notes[0].day);
    C.check('a tap on it opens Your moments on that line (marked, scrolled into view)', s.screen === 'screen-moments' && s.row && s.isNew && s.visible && s.inView, JSON.stringify(s));
    const rd = await params(p, 'mark_note_read');
    C.check('…and tells the server it was read: mark_note_read(athlete, that day), once', rd.length === 1 && rd[0].p_athlete_id === H.ID && rd[0].p_day === MM.notes[0].day, JSON.stringify(rd));
    await p.evaluate(() => goTo('home'));
    await p.waitForTimeout(300);
    C.check('back on Home the row is gone (the other line was read already)', await p.evaluate(() => document.getElementById('home-note-wrap').innerHTML.trim() === ''));
    C.check('the answer is kept on this phone (never synced)', await p.evaluate(id => ({ kept: !!localStorage.getItem(id + '_momentscache'), synced: Object.keys(_snapshot()).filter(k => /momentscache/.test(k)) }), H.ID).then(k => k.kept && k.synced.length === 0));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await waitRow(p);
    await p.waitForTimeout(800);
    C.check('after a reload the row stays gone (the server has it read)', await p.evaluate(() => document.getElementById('home-note-wrap').innerHTML.trim() === ''));
    C.check('no page errors (New from Amir)', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
    // a lost call is made good by the next answer: the server still has the line unread, this run read it, so it is told again
    const lost = await openRW(browser, { stub: { myMoments: myMomentsFx(), refuse: ['mark_note_read'] } });
    await lost.p.waitForFunction(() => !!document.querySelector('#home-note-wrap .from-amir'), null, { timeout: 8000 }).catch(() => {});
    await lost.p.click('#home-note-wrap .from-amir');
    await lost.p.waitForTimeout(500);
    const first = (await params(lost.p, 'mark_note_read')).length;
    await lost.p.evaluate(() => { window.__STUB.refuse = []; return refreshMoments(); });
    await lost.p.waitForTimeout(500);
    const again = await params(lost.p, 'mark_note_read');
    C.check('a mark_note_read the server refused: the row is gone here at once, and the next answer tells the server again', first === 1 && again.length === 2 && await lost.p.evaluate(() => document.getElementById('home-note-wrap').innerHTML.trim() === ''), JSON.stringify([first, again.length]));
    await lost.ctx.close();
    // no unread line, no row; an old line far down the list is on the page like any other (there is no Show all any more)
    const quiet = await openRW(browser, { stub: { myMoments: myMomentsFx({ notes: [{ day: at(-9), line: 'New block starts Monday. Same standard.', award_id: null, read: true }] }) } });
    await waitRow(quiet.p);
    await quiet.p.waitForTimeout(500);
    C.check('no unread line: no New from Amir row', await quiet.p.evaluate(() => document.getElementById('home-note-wrap').innerHTML.trim() === ''));
    await quiet.ctx.close();
    const many = myMomentsFx({ notes: [{ day: at(-100), line: 'An old line, far down the list.', award_id: null, read: false }] });
    const fold = await openRW(browser, { stub: { myMoments: many } });
    await fold.p.waitForFunction(() => !!document.querySelector('#home-note-wrap .from-amir'), null, { timeout: 8000 }).catch(() => {});
    await fold.p.click('#home-note-wrap .from-amir');
    await fold.p.waitForTimeout(900);
    const f = await fold.p.evaluate(day => { const row = document.querySelector('#mom-body .mo[data-note="' + day + '"]'); const r = row && row.getBoundingClientRect();
      return { visible: !!row && !!row.offsetParent, isNew: !!row && row.classList.contains('is-new'), inView: !!r && r.top >= 0 && r.bottom <= innerHeight }; }, many.notes[0].day);
    C.check('an old line far down the list: the tap opens the page, marks that line and brings it into view', f.visible && f.isNew && f.inView, JSON.stringify(f));
    await fold.ctx.close();
    // dark: New from Amir is the only row left on Home, so it is held to the habit card's own edge and fill instead
    const dk = await openRW(browser, { opts: { dark: true }, stub: { myMoments: myMomentsFx() } });
    await waitRow(dk.p);
    await dk.p.waitForFunction(() => !!document.querySelector('#home-note-wrap .from-amir'), null, { timeout: 8000 }).catch(() => {});
    const edge = await dk.p.evaluate(() => { const n = document.querySelector('#home-note-wrap .from-amir'), c = document.querySelector('#home-overview .today-card'); return n && c ? { note: getComputedStyle(n).borderTopColor, career: getComputedStyle(c).borderTopColor, noteBg: getComputedStyle(n).backgroundColor, careerBg: getComputedStyle(c).backgroundColor } : null; });
    C.check('dark: New from Amir has the same edge and fill as the habit card (one paper look)', !!edge && edge.note === edge.career && edge.noteBg === edge.careerBg, JSON.stringify(edge));
    await shot(dk.p, 'light-home-note-dark.png');
    await dk.ctx.close();
  }
  // 4b. ?go=numbers (AA Proof's door card) lands on Your numbers
  {
    const { ctx, p } = await openRW(browser, { query: '?client=' + H.ID + '&go=numbers', stub: { myMoments: myMomentsFx() } });
    await p.waitForTimeout(1200);
    const tap = await p.evaluate(() => ({ screen: document.querySelector('.screen.active').id, top: Math.round(document.getElementById('numbers-title').getBoundingClientRect().top) }));
    C.check('?go=numbers opens Progress at Your numbers', tap.screen === 'screen-plan' && tap.top >= 0 && tap.top < 160, JSON.stringify(tap));
    C.check('?go=numbers: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 5. the finish card: what the session moves, the four marks only (the one-day plan: the session closes its week)
  {
    const { ctx, p } = await openRW(browser, { prog: prog({ days: 1 }) });
    await waitRow(p);
    await toReady(p);
    const earn = await T(p, '#confirm-1 .confirm-earn');
    C.check('finish card: the marks it moves, crossed first: "25 of 25 sessions with Amir · a new mark" and "4 of 8 weeks held · when the week counts"',
      /Session 400 · Every set logged 50 Your week held \+400 when it counts 25 of 25 sessions with Amir · a new mark 4 of 8 weeks held · when the week counts$/.test(earn || ''), earn);
    C.check('finish card: no badge name, no metal, no "more in AA Proof" (not Paper Trail, The Long Count or Pulse Check, which are no mark)', !/Century|Hold Serve|Paper Trail|Long Count|Pulse|Love Hold|Closer|AA Proof|more/.test(earn || '') && !METALS.test(earn || ''), earn);
    C.check('finish card: exactly the two lines of the two marks', (await p.evaluate(() => document.querySelectorAll('#confirm-1 .cf-moves small').length)) === 2);
    const cls = await p.evaluate(() => [...document.querySelectorAll('#confirm-1 .cf-moves small')].map(s => s.className));
    C.check('finish card: the crossed mark in ink, the one that waits for the week grey', /is-crossed/.test(cls[0]) && /cf-earn-more/.test(cls[1]), JSON.stringify(cls));
    await shot(p, 'light-finish-card.png');
    const clay = await p.evaluate(() => [...document.querySelectorAll('#confirm-1 .cf-moves small')].map(s => getComputedStyle(s).color));
    C.check('finish card: the lines are never clay (DS-01)', clay.every(c => !CLAY.test(c)), JSON.stringify(clay));
    const fs = await p.evaluate(() => [...document.querySelectorAll('#confirm-1 .cf-moves small')].map(s => parseFloat(getComputedStyle(s).fontSize)));
    C.check('finish card: no line under 12 px', fs.every(x => x >= 12), JSON.stringify(fs));
    await ctx.close();
    const t2 = await openRW(browser, {});
    await waitRow(t2.p);
    await toReady(t2.p);
    const e2 = await T(t2.p, '#confirm-1 .confirm-earn');
    C.check('finish card: the two-day plan moves the session mark only, no "when the week counts"', /25 of 25 sessions with Amir · a new mark$/.test(e2 || '') && !/AA Proof|when the week|weeks held/.test((e2 || '').replace(/Your week held \+400/, '')), e2);
    await t2.ctx.close();
    // the 320 px and dark finish card: the lines wrap, the card does not run sideways
    for (const [w, dark] of [[320, false], [320, true]]) {
      const x = await openRW(browser, { prog: prog({ days: 1 }), w, opts: { dark } });
      await waitRow(x.p);
      await toReady(x.p);
      const g = await x.p.evaluate(() => { const c = document.querySelector('#confirm-1 .cf-moves'), r = c.getBoundingClientRect(); return { right: Math.round(r.right), vw: innerWidth, side: document.documentElement.scrollWidth > innerWidth }; });
      C.check(`finish ${w}px${dark ? ' dark' : ''}: the finish card's moves fit, no sideways scroll`, g.right <= g.vw && !g.side, JSON.stringify(g));
      await shot(x.p, `light-finish-${w}${dark ? '-dark' : ''}.png`);
      await x.ctx.close();
    }
  }
  // 6. Done: the Counting band for the mark the session crossed, then the answer confirms it; a badge that is no mark is no band, is not told and not marked seen
  {
    const { ctx, p } = await openRW(browser, {});
    await waitRow(p);
    await toReady(p);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    await p.waitForTimeout(200);
    // the answer after the save: the mark's first tier, another badge (Paper Trail) and a title, all owned, rows waiting (win and highlight sizes, so bands and not moments)
    const after = rwProfile(10470, { sessions: 25, owned: { 'badge:century:1': TODAY, 'badge:full_log:1': TODAY, 'title:bedrock': TODAY }, moments: [
      mom('badge:century:1', 'highlight', false, 300, badgeSpec('Century', 'commitment', 'bronze', 1, 25, '25 sessions with Amir.')),
      mom('badge:full_log:1', 'win', false, 50, badgeSpec('Paper Trail', 'commitment', 'bronze', 1, 10, '10 sessions logged in full.')),
      mom('title:bedrock', 'highlight', false, 0, { kind: 'title', name: 'BEDROCK', meaning: 'consistency', metal: 'prismatic', from: 'BEDROCK', date: TODAY })] });
    await p.evaluate(s => { eval(s); }, stubSet(after));
    const counting = await p.evaluate(() => {
      finishTap('1', document.querySelector('#confirm-1 .confirm-btn'));
      return [...document.querySelectorAll('#hlwin-1 .hl-band')].map(b => ({ t: b.innerText.replace(/\s+/g, ' ').trim(), tag: b.tagName, share: !!b.querySelector('.hl-band-go') }));
    });
    C.check('Done: ONE "Counting" band at once, for the mark the finish card showed (25 sessions with Amir), no Share until the server has it', counting.length === 1 && counting[0].tag === 'DIV' && !counting[0].share
      && /^A NEW MARK · COUNTING 25 SESSIONS WITH AMIR$/i.test(counting[0].t), JSON.stringify(counting));
    C.check('Done: nothing is told or marked seen from the phone\'s guess', (await params(p, 'mark_moments_told')).every(a => !a.p_award_ids.includes('badge:century:1')));
    await p.waitForTimeout(1800);
    const rec = await p.evaluate(id => JSON.parse(localStorage.getItem(id + '_earn_d1')), H.ID);
    C.check('Done: the day\'s record keeps the awards owned at Done, the finish card\'s mark line and the save stamp', Array.isArray(rec.snap) && rec.snap.slice().sort().join() === rwProfile(0).owned.join() && rec.moves && rec.moves.lines.length === 1 && rec.saved > 0, JSON.stringify({ snap: rec.snap, saved: rec.saved, lines: rec.moves && rec.moves.lines }));
    const conf = await p.evaluate(() => [...document.querySelectorAll('#hlwin-1 .hl-band')].map(b => ({ t: b.innerText.replace(/\s+/g, ' ').trim(), tag: b.tagName, share: !!b.querySelector('.hl-band-go'), em: !!b.querySelector('em'), color: getComputedStyle(b.querySelector('.hl-band-t b') || b).color })));
    C.check('after the answer: the one band confirmed (Counting gone, Share there), plain text and never clay, and Paper Trail and the title are no band', conf.length === 1 && conf[0].tag === 'BUTTON' && conf[0].share && !conf[0].em && !/COUNTING/i.test(conf[0].t)
      && /^A NEW MARK 25 SESSIONS WITH AMIR SHARE$/i.test(conf[0].t) && !CLAY.test(conf[0].color), JSON.stringify(conf));
    const told = await params(p, 'mark_moments_told');
    C.check('the band is told on the server as "training"; Paper Trail and the title are not', told.some(a => a.p_app === 'training' && a.p_award_ids.includes('badge:century:1')) && told.every(a => !a.p_award_ids.includes('badge:full_log:1') && !a.p_award_ids.includes('title:bedrock')), JSON.stringify(told));
    const seen = await rwSeenOf(p);
    C.check('the band is marked seen; Paper Trail and the title are not', seen && seen['badge:century:1'] && !seen['badge:full_log:1'] && !seen['title:bedrock'], JSON.stringify(seen));
    C.check('the seen list is synced (in the snapshot the cloud copy takes)', await p.evaluate(id => Object.keys(_snapshot()).includes(id + '_rw_seen'), H.ID));
    C.check('a win or highlight is a band, never a full-screen moment', !(await p.$('.hl-moment')));
    await shot(p, 'light-finished-bands.png');
    await p.evaluate(() => document.querySelector('#hlwin-1 .hl-band').click());
    await p.waitForTimeout(700);
    const sheet = await p.evaluate(() => ({ title: (document.getElementById('hl-title') || {}).textContent, open: !!document.querySelector('#hist-overlay.visible') }));
    C.check('Share on the band opens the share sheet, "Share your mark" (a mark has its own card since the design pass, 2026-10-19)', sheet.open && sheet.title === 'Share your mark', JSON.stringify(sheet));
    C.check('bands: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const again = await p.evaluate(() => [...document.querySelectorAll('#hlwin-1 .hl-band')].map(b => b.className));
    C.check('a reload shows the same band, quietly (not animating)', again.length === 1 && again.every(c => !/is-new/.test(c)), JSON.stringify(again));
    C.check('a reload reaches the bands before the script ends: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 7. a reward is told only if it was drawn; a server that disagrees takes the Counting band away; no band from an old answer
  {
    const { ctx, p } = await openRW(browser, {});
    await waitRow(p);
    await toReady(p);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    const c0 = await p.evaluate(() => { finishTap('1', document.querySelector('#confirm-1 .confirm-btn')); return document.querySelectorAll('#hlwin-1 .hl-band').length; });
    await p.waitForTimeout(2200);
    const n = await p.evaluate(() => document.querySelectorAll('#hlwin-1 .hl-band').length);
    C.check('a server that disagrees: one Counting band at Done, none once the answer lacks the award', c0 === 1 && n === 0, JSON.stringify([c0, n]));
    await ctx.close();
    const q = await openRW(browser, {});
    await waitRow(q.p);
    await toReady(q.p);
    await q.p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    const spec = (n, i) => ({ kind: 'achievement', name: n, meaning: 'commitment', caption: 'c' + i, date: TODAY });
    // five rewards this app tells (two marks' tiers, three achievements; one highlight) and two it does not (a badge, a title)
    const ms = [mom('badge:bests:1', 'win', false, 200, badgeSpec('Record Breaker', 'progress', 'bronze', 1, 5, 'c')), mom('badge:comebacks:1', 'win', false, 300, badgeSpec('HARD TO KILL', 'resilience', 'bronze', 1, 3, 'c')),
      mom('achievement:the_foundry', 'highlight', false, 0, spec('THE FOUNDRY', 1)), mom('achievement:first_serve', 'win', false, 0, spec('FIRST SERVE', 2)), mom('achievement:night_shift', 'win', false, 0, spec('NIGHT SHIFT', 3)),
      mom('badge:habit_water:1', 'win', false, 20, badgeSpec('HUMAN SPRINKLER', 'consistency', 'bronze', 1, 5, 'c')), mom('title:bedrock', 'highlight', false, 0, { kind: 'title', name: 'BEDROCK', meaning: 'consistency', metal: 'prismatic', from: 'BEDROCK', date: TODAY })];
    const owned = {}; ms.forEach(m => { owned[m.award_id] = TODAY; });
    await q.p.evaluate(s => { eval(s); finishTap('1', document.querySelector('#confirm-1 .confirm-btn')); }, stubSet(rwProfile(10470, { owned, moments: ms })));
    await q.p.waitForTimeout(2200);
    const bands = await q.p.evaluate(() => ({ b: [...document.querySelectorAll('#hlwin-1 .hl-band')].map(b => b.innerText.replace(/\s+/g, ' ').trim()), more: (document.querySelector('#hlwin-1 .hl-band-more') || {}).textContent,
      moment: (document.querySelector('.hl-moment .hl-m-title') || {}).textContent }));
    // Since 2026-10-20 an achievement is never a band: the biggest one opens the big moment (one per open), the two marks stay bands, and the two
    // achievements left over wait unseen for their own moment on a later open. Your moments holds every one of them meanwhile.
    C.check('five rewards it tells: the achievement opens the moment, the two marks are bands, and no achievement is a band', bands.b.length === 2
      && bands.moment === 'The Foundry' && !bands.more
      && !bands.b.some(t => /FOUNDRY|SPRINKLER|BEDROCK/i.test(t)), JSON.stringify(bands));
    const seen = (await rwSeenOf(q.p)) || {}, told = (await params(q.p, 'mark_moments_told')).filter(a => a.p_app === 'training').reduce((s, a) => s.concat(a.p_award_ids), []);
    const drawn = ['badge:bests:1', 'badge:comebacks:1', 'achievement:the_foundry'];
    C.check('only a reward that was DRAWN is marked seen and told: the two bands and the moment; the two achievements behind "+3 more", the other badge and the title are none of those', drawn.every(id => seen[id] && told.includes(id))
      && ms.map(m => m.award_id).filter(id => drawn.indexOf(id) < 0).every(id => !seen[id] && !told.includes(id)), JSON.stringify({ drawn, seen: Object.keys(seen), told }));
    await q.ctx.close();
    // an answer that predates the save is no trigger for a confirmed band: while get_profile stalls after Done only the phone's own Counting band shows
    const s = await openRW(browser, {});
    await waitRow(s.p);
    await toReady(s.p);
    await s.p.evaluate(() => { const c = JSON.parse(localStorage.getItem('__stubcfg')); c.stall = { get_profile: true }; localStorage.setItem('__stubcfg', JSON.stringify(c)); window.__STUB.stall = { get_profile: true }; });
    await s.p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    await s.p.evaluate(() => finishTap('1', document.querySelector('#confirm-1 .confirm-btn')));
    await s.p.waitForTimeout(1800);
    const only = await s.p.evaluate(() => [...document.querySelectorAll('#hlwin-1 .hl-band')].map(b => b.tagName));
    C.check('no fresh answer yet: only the phone\'s own Counting band (no Share), nothing confirmed', only.length === 1 && only[0] === 'DIV', JSON.stringify(only));
    await s.ctx.close();
  }
  // Sessions with Amir (on Progress's card) counts the sessions career_facts_paid() pays: one per plan day per training week (GAME-4; D19, Claude's pick, waiting for Amir's word), like Century.
  // The card adds +1 for a session finished on this phone that no answer has counted yet, and a plan day done again in its week adds nothing, or the card would say 25 while Century says 24.
  // The save never answers here (stall), so every record stays waiting on the phone. The fixture's plan has two days; the cycle's week 2 is under way, so a session at(-1) is this training week's.
  {
    const sessionsOf = async p => {
      await p.evaluate(() => goTo('plan'));
      await p.waitForTimeout(300);
      const t = await p.evaluate(() => { const c = [...document.querySelectorAll('#career-card-wrap .cs-n')].find(n => /sessions with Amir/.test(n.querySelector('.cs-nm').textContent)); return c ? c.querySelector('b').textContent + ' ' + c.querySelector('.cs-nm').textContent : null; });
      await p.evaluate(() => goTo('home'));
      await p.waitForTimeout(200);
      const m = /^(\d[\d,]*) /.exec(t || '');
      return { text: t, n: m ? Number(m[1].replace(/,/g, '')) : null };
    };
    const earnOf = (p, d) => p.evaluate(([id, d]) => JSON.parse(localStorage.getItem(id + '_earn_d' + d) || 'null'), [H.ID, d]);
    // a day ticked through, rated and finished (day-finish.js's way), then back on Home
    const finishDay = async (p, d) => {
      await p.evaluate(d => {
        openDayView(d);
        const t0 = Date.now() - 754000;
        localStorage.setItem(timerKey(d), JSON.stringify({ running: true, resumeAt: t0, acc: 0, sessionStart: t0 }));
        renderTimer(d);
      }, d);
      await p.waitForTimeout(250);
      const n = await p.evaluate(d => document.querySelectorAll('#day' + d + ' .checklist-item').length, d);
      for (let i = 0; i < n; i++) {
        await p.evaluate(([i, d]) => {
          const c = document.querySelectorAll('#day' + d + ' .checklist-item')[i];
          if (c.classList.contains('collapsed')) toggleExpand(c);
          if (!c.classList.contains('checked')) toggleCheckOnly(c, d);
        }, [i, d]);
        await p.waitForTimeout(100);
      }
      await p.evaluate(() => hideAaToast());
      await p.waitForTimeout(700);
      await p.evaluate(d => document.querySelector('#confirm-' + d + ' .complete-rpe-btn[data-rpe="7"]').click(), d);
      await p.waitForTimeout(200);
      await p.evaluate(d => finishTap(d, document.querySelector('#confirm-' + d + ' .confirm-btn')), d);
      await p.waitForTimeout(500);
      await p.evaluate(() => closeDayView());
      await p.waitForTimeout(400);
    };
    const STALL = { stall: { save_session: true } };
    // 1. Day 1 was trained yesterday: finishing it again this week adds nothing; Day 2 is a new plan day and adds 1
    {
      const { ctx, p } = await openRW(browser, { hist: [{ completed_on: at(-1), day: '1', readiness: 4, log: [] }], stub: STALL });
      await waitRow(p);
      const s0 = await sessionsOf(p);
      C.check('Sessions with Amir: the profile\'s number before anything is finished (24)', s0.n === 24, JSON.stringify(s0));
      await finishDay(p, '1');
      const s1 = await sessionsOf(p), r1 = await earnOf(p, '1');
      C.check('Sessions with Amir: Day 1 finished again in its week, not yet saved, leaves the cell as it was (24)', s1.n === 24 && s1.text === s0.text && r1 && !r1.saved, JSON.stringify({ s1, r1: r1 && { saved: r1.saved, repeat: r1.repeat } }));
      C.check('Sessions with Amir: the repeat is on the record (repeat true, paid 0) and its parts have no session', r1 && r1.repeat === true && r1.paid === 0 && !(r1.parts || []).some(x => x.k === 'session' || x.k === 'early'), JSON.stringify(r1 && { repeat: r1.repeat, paid: r1.paid, parts: r1.parts }));
      await finishDay(p, '2');
      const s2 = await sessionsOf(p), r2 = await earnOf(p, '2');
      C.check('Sessions with Amir: Day 2, a new plan day, not yet saved, adds 1 (25)', s2.n === 25 && !r2.saved, JSON.stringify({ s2, r2: r2 && { saved: r2.saved, repeat: r2.repeat } }));
      C.check('Sessions with Amir: the new day\'s record says repeat false, paid 1, and carries its session part', r2 && r2.repeat === false && r2.paid === 1 && r2.parts.some(x => x.k === 'session'), JSON.stringify(r2 && { repeat: r2.repeat, paid: r2.paid, parts: r2.parts }));
      C.check('Sessions with Amir: the session was never saved here (the stall), no page errors', (await p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'save_session').length)) >= 1 && !p.errs.length, JSON.stringify(p.errs));
      await ctx.close();
    }
    // 1b. a Day 1 session is waiting for an answer (finished on this phone, the history already lists Day 1 this week): finishing Day 1 AGAIN before an answer has counted that
    // session must not take its +1 away. The key of the record is the plan day, so the repeat's record replaces the waiting one and carries it in `paid`.
    {
      const waiting = { t: new Date().toISOString(), xp: 450, parts: [{ k: 'session', xp: 400 }, { k: 'log', xp: 50 }], before: 10000, saved: 0, repeat: false, paid: 1 };
      const { ctx, p } = await openRW(browser, { hist: [{ completed_on: at(-1), day: '1', readiness: 4, log: [] }], stub: STALL, seed: { _earn_d1: waiting } });
      await waitRow(p);
      const s0 = await sessionsOf(p);
      C.check('Sessions with Amir: a Day 1 session waiting for an answer shows as +1 (25)', s0.n === 25, JSON.stringify(s0));
      await finishDay(p, '1');
      const s1 = await sessionsOf(p), r1 = await earnOf(p, '1');
      C.check('Sessions with Amir: Day 1 finished again before an answer counted the first leaves the cell at 25, and the repeat\'s record carries the waiting session (repeat true, paid 1)',
        s1.n === 25 && s1.text === s0.text && r1 && r1.repeat === true && r1.paid === 1 && !r1.saved, JSON.stringify({ s1, r1: r1 && { saved: r1.saved, repeat: r1.repeat, paid: r1.paid } }));
      await finishDay(p, '2');
      const s2 = await sessionsOf(p), r2 = await earnOf(p, '2');
      C.check('Sessions with Amir: Day 2, a new plan day, then adds 1 more (26)', s2.n === 26 && r2 && r2.paid === 1, JSON.stringify({ s2, paid: r2 && r2.paid }));
      C.check('Sessions with Amir: no page errors in the repeat-over-a-waiting-session run', !p.errs.length, JSON.stringify(p.errs));
      await ctx.close();
    }
    // 2. nothing done this week: Day 1 is a new plan day and adds 1
    {
      const { ctx, p } = await openRW(browser, { stub: STALL });
      await waitRow(p);
      await finishDay(p, '1');
      const s = await sessionsOf(p), r = await earnOf(p, '1');
      C.check('Sessions with Amir: Day 1 finished with nothing done this week adds 1 (25), the record says repeat false', s.n === 25 && r && r.repeat === false, JSON.stringify({ s, repeat: r && r.repeat }));
      await ctx.close();
    }
    // 3. records written before the flag existed (the app as of the last release), waiting on the phone: read from their parts
    {
      const rec = parts => ({ t: new Date().toISOString(), xp: parts.reduce((a, x) => a + x.xp, 0), parts, before: 10000, saved: 0 });
      const { ctx, p } = await openRW(browser, { seed: {
        _earn_d1: rec([{ k: 'log', xp: 50 }, { k: 'checkin', xp: 20 }]),                       // a repeat: no session part
        _earn_d2: rec([{ k: 'session', xp: 400 }, { k: 'log', xp: 50 }]) } });                  // a paid session
      await waitRow(p);
      const s = await sessionsOf(p);
      C.check('Sessions with Amir: an older waiting record with no session part adds nothing, one with a session part adds 1 (25)', s.n === 25, JSON.stringify(s));
      await ctx.close();
      const q = await openRW(browser, { seed: { _earn_d1: rec([{ k: 'log', xp: 50 }]), _earn_d2: rec([{ k: 'checkin', xp: 20 }]) } });
      await waitRow(q.p);
      const s2 = await sessionsOf(q.p);
      C.check('Sessions with Amir: two older repeats waiting leave the cell as the profile has it (24)', s2.n === 24, JSON.stringify(s2));
      await q.ctx.close();
    }
  }
  // an award the other app has already told is owned but no longer waiting, and the core carries no `recent` (that is the shelf's, which this app does not read for bands): there is no
  // spec to confirm the phone's Counting band with. The band goes (it is never left "Counting"), and nothing throws or is marked seen or told for it.
  {
    const { ctx, p } = await openRW(browser, {});
    await waitRow(p);
    await toReady(p);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    const told = rwProfile(10470, { sessions: 25, owned: { 'badge:century:1': TODAY, 'badge:full_log:1': TODAY }, moments: [] });
    await p.evaluate(s => { eval(s); }, stubSet(told));
    const c0 = await p.evaluate(() => { finishTap('1', document.querySelector('#confirm-1 .confirm-btn')); return document.querySelectorAll('#hlwin-1 .hl-band').length; });
    await p.waitForTimeout(2200);
    const left = await p.evaluate(() => [...document.querySelectorAll('#hlwin-1 .hl-band')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
    C.check('an award already told (owned, not waiting): no band is left "Counting", nothing marked seen or told for it, no page errors',
      c0 === 1 && left.every(t => !/COUNTING/i.test(t)) && !(await rwSeenOf(p)) && (await params(p, 'mark_moments_told')).every(a => !a.p_award_ids.includes('badge:century:1')) && !p.errs.length, JSON.stringify({ c0, left, errs: p.errs }));
    await ctx.close();
  }
  // 8. moments: a mark's, an achievement's; one per open, never from the phone's copy, no replay; every other reward opens none
  {
    const full = (i, size, extra) => mom('badge:held_weeks:' + i, size, true, 600, badgeSpec('Hold Serve', 'consistency', 'emerald', i, 12, '12 weeks held in a row. You keep showing up.', at(-3 + i)), extra);
    const m1 = full(3, 'milestone'), m2 = full(4, 'legend');
    let { ctx, p } = await openRW(browser, { seed: { _careercache: { p: rwProfile(10000, { moments: [m1] }), at: Date.now() - 3600000 } }, stub: { stall: { get_profile: true } } });
    await p.waitForTimeout(1500);
    C.check('moment: none from the phone\'s copy of an answer', !(await p.$('.hl-moment')));
    await ctx.close();
    ({ ctx, p } = await openRW(browser, { profile: rwProfile(10000, { moments: [m1, m2], owned: { 'badge:held_weeks:3': at(0), 'badge:held_weeks:4': at(0) } }) }));
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    const mo = await p.evaluate(() => { const m = document.querySelector('.hl-moment'); const q = s => { const e = m.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      return m ? { eb: q('.hl-m-eyebrow'), num: q('.hl-m-num'), t: q('.hl-m-title'), sub: q('.hl-m-sub'), next: q('.hl-m-next'), w: q('.hl-m-sheet p'), go: q('.hl-m-go'), n: document.querySelectorAll('.hl-moment').length } : null; });
    C.check('a fresh answer opens ONE moment, the biggest: "A new mark", 24 at display size, "weeks held in a row", the next mark, Amir\'s line, Share the card; no metal, no badge name',
      !!mo && mo.eb === 'A new mark' && mo.num === '24' && mo.t === '24 weeks held in a row' && mo.sub === null && mo.next === 'Next mark · 52 weeks' && mo.w === 'Every session, 24 weeks running. Keep it boring.' && mo.go === 'Share the card' && mo.n === 1
      && !METALS.test(JSON.stringify(mo)) && !/Hold Serve/.test(JSON.stringify(mo)), JSON.stringify(mo));
    await p.waitForTimeout(1800);
    await shot(p, 'light-moment.png');
    const seen = await rwSeenOf(p);
    C.check('only the shown one is marked seen (the other waits)', seen && seen['badge:held_weeks:4'] && !seen['badge:held_weeks:3'], JSON.stringify(seen));
    await p.waitForTimeout(300);
    const told = await params(p, 'mark_moments_told');
    C.check('the shown one is told on the server as "training"', told.some(a => a.p_app === 'training' && a.p_award_ids.length === 1 && a.p_award_ids[0] === 'badge:held_weeks:4'), JSON.stringify(told));
    C.check('the seen list is synced (in the snapshot)', await p.evaluate(id => Object.keys(_snapshot()).includes(id + '_rw_seen'), H.ID));
    await p.evaluate(() => document.querySelector('.hl-m-skip').click());
    await p.waitForTimeout(800);
    C.check('"Not now" closes it and nothing chains', !(await p.$('.hl-moment')));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    const m2t = await p.evaluate(() => { const m = document.querySelector('.hl-moment'); return m ? { t: m.querySelector('.hl-m-title').textContent, w: m.querySelector('.hl-m-sheet p').textContent } : null; });
    C.check('the next open brings the other one (12 weeks held), never the seen one, with its own line', !!m2t && m2t.t === '12 weeks held in a row' && m2t.w === 'Every session, 12 weeks running. Keep it boring.' && (await rwSeenOf(p)) && Object.keys(await rwSeenOf(p)).sort().join() === 'badge:held_weeks:3,badge:held_weeks:4', JSON.stringify(m2t));
    await p.waitForTimeout(500);
    C.check('the catch-up: the seen one is told again on the next answer (the server still lists it)', (await params(p, 'mark_moments_told')).some(a => a.p_award_ids.includes('badge:held_weeks:4')));
    C.check('moment: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
    // an achievement keeps its own name and line
    ({ ctx, p } = await openRW(browser, { profile: rwProfile(10000, { owned: { 'achievement:the_foundry': TODAY }, moments: [mom('achievement:the_foundry', 'milestone', true, 0, { kind: 'achievement', name: 'THE FOUNDRY', meaning: 'commitment', caption: 'Four weeks of putting the work in.', date: TODAY })] }) }));
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    const ac = await p.evaluate(() => { const m = document.querySelector('.hl-moment'); const q = s => { const e = m.querySelector(s); return e ? e.textContent.trim() : null; };
      return m ? { eb: q('.hl-m-eyebrow'), num: q('.hl-m-num'), t: q('.hl-m-title'), sub: q('.hl-m-sub'), w: q('.hl-m-sheet p'), go: q('.hl-m-go') } : null; });
    C.check('an achievement\'s moment keeps its name and its line: kind of win, "The Foundry", the caption, Amir\'s milestone line, Share it', !!ac && ac.eb === 'Commitment' && ac.num === null && ac.t === 'The Foundry'
      && ac.sub === 'Four weeks of putting the work in.' && ac.w === 'That took weeks. It stays yours.' && ac.go === 'Share it', JSON.stringify(ac));
    await ctx.close();
    // EVERY achievement opens the big moment, whatever its size (2026-10-20, Amir: "like in a computer games when you have got an
    // achievement. Something big on screen would come up"). A win-sized one used to be a band on the finish card and nothing else.
    const crewOn = { athlete_id: H.ID, at: new Date().toISOString(), days: 7, kinds: ['achievement'],
      me: { answer: 'yes', name: 'Alex R.', on_board: true, under13: false, can_post: true, photos_left: 3, posts_left: 10, kinds: { achievement: true } },
      honours: { month: null, rows: [] }, items: [] };
    const firstBlood = rwProfile(10000, { owned: { 'achievement:first_blood': TODAY },
      moments: [mom('achievement:first_blood', 'win', false, 50, { kind: 'achievement', name: 'FIRST BLOOD', meaning: 'commitment', caption: 'Your first session on the board', date: TODAY })] });
    ({ ctx, p } = await openRW(browser, { profile: firstBlood, stub: { bell: JSON.parse(JSON.stringify(crewOn)) } }));
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    const win = await p.evaluate(() => { const m = document.querySelector('.hl-moment'); const q = s => { const e = m && m.querySelector(s); return e ? e.textContent.trim() : null; };
      return m ? { eb: q('.hl-m-eyebrow'), t: q('.hl-m-title'), sub: q('.hl-m-sub'), w: q('.hl-m-sheet p'), go: q('.hl-m-go') } : null; });
    C.check('a win-sized achievement opens the full-screen moment too, with its own words', !!win && win.t === 'First Blood' && win.eb === 'Commitment'
      && win.sub === 'Your first session on the board' && win.w === 'That one is on the board now. It stays yours.' && win.go === 'Share it', JSON.stringify(win));
    // and it carries one line for the crew, sent only on the tap (Amir: "i want a line in the crew so everyone else can see")
    await p.waitForFunction(() => { const b = document.querySelector('.hl-m-crew'); return !!b && !b.hidden; }, null, { timeout: 8000 }).catch(() => {});
    const tell = await p.evaluate(() => { const b = document.querySelector('.hl-m-crew'); return b ? { t: b.textContent.trim(), line: b.dataset.line, hidden: b.hidden } : null; });
    C.check('the moment offers "Tell the crew", with the line it would post', !!tell && !tell.hidden && tell.t === 'Tell the crew'
      && tell.line === 'Just won First Blood. Your first session on the board.', JSON.stringify(tell));
    C.check('nothing is posted before the tap', (await calls(p, 'rpc:crew_post')) === 0);
    await p.evaluate(() => document.querySelector('.hl-m-crew').click());
    await p.waitForFunction(() => /crew knows/i.test(document.querySelector('.hl-m-crew').textContent), null, { timeout: 8000 }).catch(() => {});
    const sent = await p.evaluate(() => ({ t: document.querySelector('.hl-m-crew').textContent.trim(), off: document.querySelector('.hl-m-crew').disabled,
      posted: (JSON.parse(localStorage.getItem('__stubcfg') || '{}').bell.items || []).filter(i => i && i.me).map(i => i.kind + '|' + i.body) }));
    C.check('the tap puts that one line on the Bell, as a plain post, and the button stops being one', sent.off && /crew knows/i.test(sent.t)
      && sent.posted.length === 1 && sent.posted[0] === 'post|Just won First Blood. Your first session on the board.', JSON.stringify(sent));
    C.check('the crew line: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
    // the crew is opt-in: no Bell, no button (and the moment is unchanged)
    ({ ctx, p } = await openRW(browser, { profile: firstBlood }));
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    await p.waitForTimeout(900);
    C.check('no crew (or no answer yet): the moment shows no "Tell the crew"', await p.evaluate(() => { const b = document.querySelector('.hl-m-crew'); return !!document.querySelector('.hl-moment') && (!b || b.hidden); }));
    await ctx.close();
    // every other reward opens no moment: a title, the Grand Slam, another badge, a level: not shown, not marked seen, not told
    const other = [mom('title:grand_slam', 'legend', true, 0, { kind: 'title', name: 'GRAND SLAM', meaning: 'all', metal: 'prismatic', from: 'A title in all four', date: TODAY }),
      mom('badge:full_log:2', 'milestone', true, 200, badgeSpec('Paper Trail', 'commitment', 'silver', 2, 25, '25 full logs.')), mom('title:bedrock', 'legend', true, 0, { kind: 'title', name: 'BEDROCK', meaning: 'consistency', metal: 'prismatic', from: 'BEDROCK', date: TODAY })];
    ({ ctx, p } = await openRW(browser, { profile: rwProfile(10000, { owned: { 'title:grand_slam': TODAY, 'badge:full_log:2': TODAY, 'title:bedrock': TODAY }, moments: other }) }));
    await p.waitForTimeout(1800);
    C.check('a title, the Grand Slam and another badge open no moment, and are not marked seen or told', !(await p.$('.hl-moment')) && !(await rwSeenOf(p)) && (await calls(p, 'rpc:mark_moments_told')) === 0, JSON.stringify([await rwSeenOf(p), await calls(p, 'rpc:mark_moments_told')]));
    await ctx.close();
    // 320 px and dark: the moment fits, its buttons are 44 px or more, nothing runs sideways
    for (const dark of [false, true]) {
      const x = await openRW(browser, { w: 320, opts: { dark }, profile: rwProfile(10000, { moments: [m1], owned: { 'badge:held_weeks:3': at(0) } }) });
      await x.p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
      const g = await x.p.evaluate(() => { const el = document.querySelector('.hl-moment'); if (!el) return null; const b = [...el.querySelectorAll('.hl-m-go, .hl-m-skip')].map(e => Math.round(e.getBoundingClientRect().height));
        return { side: document.documentElement.scrollWidth - innerWidth, buttons: b, title: el.querySelector('.hl-m-title').getBoundingClientRect().right <= innerWidth, num: el.querySelector('.hl-m-num').getBoundingClientRect().right <= innerWidth }; });
      C.check(`320px${dark ? ' dark' : ''}: the mark's moment fits (the number at display size too), no sideways scroll, its buttons are 44 px or more`, !!g && g.side <= 0 && g.buttons.every(h => h >= 44) && g.title && g.num, JSON.stringify(g));
      await shot(x.p, `light-moment-320${dark ? '-dark' : ''}.png`);
      await x.ctx.close();
    }
    // never in the demo or the coach's preview
    for (const [name, query] of [['demo', '?client=demo'], ['coach preview', '?client=rel01_athlete&preview=1']]) {
      ({ ctx, p } = await openRW(browser, { query, profile: rwProfile(10000, { moments: [m1], owned: { 'badge:held_weeks:3': TODAY } }) }));
      await p.waitForTimeout(1500);
      C.check(`${name}: no moment, no profile asked, nothing told, nothing marked seen`, !(await p.$('.hl-moment')) && (await calls(p, 'rpc:get_profile')) === 0 && (await calls(p, 'rpc:mark_moments_told')) === 0 && !(await rwSeenOf(p)));
      await ctx.close();
    }
    // the Welcome and a moment already on screen block it; the row stays waiting and opens once they are gone; then one per open
    ({ ctx, p } = await openRW(browser, { profile: rwProfile(10000, { moments: [], owned: {} }) }));
    await waitRow(p);
    await p.evaluate(m => {
      const w = document.createElement('div'); w.className = 'wel'; w.id = 'fakewel'; document.body.appendChild(w);
      CAREER_T.p.moments = [m]; CAREER_T.p.owned = (CAREER_T.p.owned || []).concat('badge:held_weeks:3'); maybeRewardMoment('open');
    }, m1);
    await p.waitForTimeout(400);
    const blocked = await p.evaluate(id => ({ mom: !!document.querySelector('.hl-moment'), seen: localStorage.getItem(id + '_rw_seen') }), H.ID);
    C.check('the Welcome on screen: no moment over it, nothing marked seen', !blocked.mom && !blocked.seen, JSON.stringify(blocked));
    await p.evaluate(() => { document.getElementById('fakewel').remove(); maybeRewardMoment('open'); });
    await p.waitForTimeout(400);
    C.check('…and it opens once the Welcome is gone', await p.evaluate(() => !!document.querySelector('.hl-moment')));
    await p.evaluate(() => { document.querySelector('.hl-m-skip').click(); CAREER_T.p.moments = [{ award_id: 'badge:held_weeks:5', kind: 'badge', item: 'held_weeks', tier: 5, size: 'legend', day: '2026-10-18', full: true, spec: { kind: 'badge', name: 'X', meaning: 'consistency', metal: 'prismatic', tier: 5, n: 52, caption: 'c', date: '2026-10-18' } }]; maybeRewardMoment('open'); });
    await p.waitForTimeout(400);
    C.check('one full-screen moment per open: a second does not open after the first closed', !(await p.$('.hl-moment')));
    await ctx.close();
    // an old full row arrives as full:false: no takeover from the training app (a band at most)
    ({ ctx, p } = await openRW(browser, { profile: rwProfile(10000, { owned: { 'badge:held_weeks:3': at(-20) }, moments: [mom('badge:held_weeks:3', 'milestone', false, 600, badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, 'x', at(-20)))] }) }));
    await p.waitForTimeout(1500);
    C.check('a full row older than the keep days (full:false) opens no moment here', !(await p.$('.hl-moment')) && !(await rwSeenOf(p)), JSON.stringify(await rwSeenOf(p)));
    await ctx.close();
  }
  // 9. the moment after Done: it opens after the finished card, never over the rating
  {
    const { ctx, p } = await openRW(browser, {});
    await waitRow(p);
    await toReady(p);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    const m = mom('badge:century:3', 'milestone', true, 1500, badgeSpec('Century', 'commitment', 'emerald', 3, 100, '100 sessions with Amir.'));
    // the rating box is being typed in: a moment waits (the row stays unseen)
    const ta = await p.evaluate(() => { const t = document.querySelector('#confirm-1 .finish-rate textarea, #confirm-1 .finish-rate input'); if (t) t.focus(); return !!t; });
    await p.evaluate(s => { eval(s); }, stubSet(rwProfile(10470, { owned: { 'badge:century:3': TODAY }, moments: [m] })));
    if (ta) {
      await p.evaluate(() => { CAREER_T.p.moments = window.__STUB.profile.moments; CAREER_T.p.owned = window.__STUB.profile.owned; CAREER_T.at = Date.now(); maybeRewardMoment('open'); });
      await p.waitForTimeout(300);
      C.check('a moment never opens over the rating box in use; the row stays unseen', !(await p.$('.hl-moment')) && !(await rwSeenOf(p)), JSON.stringify(await rwSeenOf(p)));
      await p.evaluate(() => document.activeElement && document.activeElement.blur());
    }
    const before = await p.evaluate(() => { finishTap('1', document.querySelector('#confirm-1 .confirm-btn')); return !!document.querySelector('.hl-moment'); });
    C.check('after Done: no moment at the tap itself', !before);
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    const st = await p.evaluate(() => ({ mom: !!document.querySelector('.hl-moment'), card: !!document.querySelector('#complete-1.visible'), eb: (document.querySelector('.hl-moment .hl-m-eyebrow') || {}).textContent, num: (document.querySelector('.hl-moment .hl-m-num') || {}).textContent,
      t: (document.querySelector('.hl-moment .hl-m-title') || {}).textContent, bands: document.querySelectorAll('#hlwin-1 .hl-band').length }));
    C.check('after Done: the mark\'s moment (100 sessions with Amir) opens once the finished card is there, and is not also a band', st.mom && st.card && st.eb === 'A new mark' && st.num === '100' && st.t === '100 sessions with Amir' && st.bands === 0, JSON.stringify(st));
    C.check('after Done: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 10. nothing of it can hold up a session: the reward RPC refused, Done still finishes and the session queue empties
  {
    const { ctx, p } = await openRW(browser, { stub: { refuse: ['mark_moments_told'] }, profile: rwProfile(10000, { moments: [], owned: {} }) });
    await waitRow(p);
    await toReady(p);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    await p.evaluate(() => finishTap('1', document.querySelector('#confirm-1 .confirm-btn')));
    await p.waitForTimeout(1500);
    const q = await p.evaluate(id => ({ csq: localStorage.getItem(id + '_csq'), done: !!document.querySelector('#complete-1.visible') }), H.ID);
    C.check('Done finishes and the session queue empties with the reward RPC refused', q.done && (!q.csq || q.csq === '[]'), JSON.stringify(q));
    C.check('finish: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
    // …nor the moments' read, nor the note's call
    const m = await openRW(browser, { stub: { refuse: ['get_my_moments', 'get_awards', 'mark_note_read'] } });
    await waitRow(m.p);
    await toReady(m.p);
    await m.p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    await m.p.evaluate(() => finishTap('1', document.querySelector('#confirm-1 .confirm-btn')));
    await m.p.waitForTimeout(1500);
    const q2 = await m.p.evaluate(id => ({ csq: localStorage.getItem(id + '_csq'), done: !!document.querySelector('#complete-1.visible') }), H.ID);
    await goProgress(m.p);
    const card = await m.p.evaluate(() => ({ card: !!document.querySelector('.cs-card'), moments: !!document.querySelector('#career-moments-wrap .hrow') }));
    C.check('the moments\' read refused: Done finishes, the queue empties, and Progress still shows the career\'s card (no moments, no goal)', q2.done && (!q2.csq || q2.csq === '[]') && card.card && !card.moments && !m.p.errs.length, JSON.stringify([q2, card, m.p.errs]));
    await m.ctx.close();
  }
  // 11. careerMoves() and awardId() as pure functions, on the ladder the server really answers
  {
    const { ctx, p } = await openRW(browser, {});
    await waitRow(p);
    const r = await p.evaluate(L => {
      const big = careerMoves({ early: false, fullLog: true, checkin: true, weekCloses: true, cycleCloses: true }, L);
      const early = careerMoves({ early: true, fullLog: false, checkin: false, weekCloses: false, cycleCloses: false }, L);
      const none = careerMoves({ early: false, fullLog: false, checkin: false, weekCloses: false, cycleCloses: false, byBook: false }, {});
      const hold = careerMoves({ early: false, fullLog: false, checkin: false, weekCloses: true, cycleCloses: false, byBook: false }, { held_weeks: L.held_weeks });
      const top = careerMoves({ early: false, fullLog: true, checkin: true, weekCloses: false, cycleCloses: false }, { full_log: Object.assign({}, L.full_log, { next: undefined }) });
      const light = careerLadderLight();
      return { big, early, none, hold, top, light: Object.keys(light).sort(), ids: [awardId('badge', 'habit_tiers', 2, 'water'), awardId('badge', 'held_weeks', 3, ''), awardId('achievement', 'first_best'), awardId('title', 'clockwork', 4, 'x')] };
    }, RW_LADDER);
    C.check('careerMoves: a big day, crossed first, three lines and the rest as "more"', r.big.lines.length === 3 && r.big.lines.every(l => l.crossed) && r.big.more >= 1, JSON.stringify(r.big));
    C.check('careerMoves: finished early moves Century only', r.early.lines.length === 1 && r.early.lines[0].id === 'century' && r.early.lines[0].have === 25, JSON.stringify(r.early));
    C.check('careerMoves: nothing to move, nothing back', r.none.lines.length === 0 && r.none.more === 0);
    C.check('careerMoves: Hold Serve counts from the run so far (now 3, so 4 of 8, pending)', JSON.stringify(r.hold.lines) === JSON.stringify([{ id: 'held_weeks', name: 'Hold Serve', have: 4, next: 8, crossed: false, pending: true }]), JSON.stringify(r.hold));
    C.check('careerMoves: a top tier (no next) never shows', r.top.lines.length === 0, JSON.stringify(r.top));
    C.check('the finish card is handed the smaller ladder: the four marks and nothing else', JSON.stringify(r.light) === JSON.stringify(['bests', 'century', 'comebacks', 'held_weeks']), JSON.stringify(r.light));
    C.check('awardId', JSON.stringify(r.ids) === JSON.stringify(['badge:habit_tiers:2:water', 'badge:held_weeks:3', 'achievement:first_best', 'title:clockwork']), JSON.stringify(r.ids));
    // the marks are the toml's tiers (scripts/check_career.py rule 23 holds the list to the file) and read as words
    const mk = await p.evaluate(() => ({ marks: careerMarks(), words: [careerMarkWords('weeks_held', 1), careerMarkWords('weeks_held', 8), careerMarkWords('sessions_with_amir', 1), careerMarkWords('sessions_with_amir', 25), careerMarkWords('personal_bests', 5), careerMarkWords('comebacks', 3)],
      spec: careerMarkSpec('held_weeks', 3, '2026-10-19'), none: careerMarkSpec('long_count', 1, '2026-10-19'), over: careerMarkSpec('comebacks', 4, '2026-10-19') }));
    C.check('the four marks: weeks held 4 · 8 · 12 · 24 · 52, sessions 25 · 50 · 100 · 200 · 500, bests 5 · 10 · 25 · 50 · 100, comebacks 3 · 5 · 10',
      JSON.stringify(mk.marks) === JSON.stringify({ held_weeks: { key: 'weeks_held', at: [4, 8, 12, 24, 52] }, century: { key: 'sessions_with_amir', at: [25, 50, 100, 200, 500] }, bests: { key: 'personal_bests', at: [5, 10, 25, 50, 100] }, comebacks: { key: 'comebacks', at: [3, 5, 10] } }), JSON.stringify(mk.marks));
    C.check('a mark\'s words: "week held" for one, "weeks held" otherwise, "session with Amir", "personal bests", "comebacks"', mk.words.join() === 'week held,weeks held,session with Amir,sessions with Amir,personal bests,comebacks', mk.words.join());
    // Since the share cards' design pass (2026-10-19) a mark has its OWN card: the number it reached, what it counts and the next mark.
    C.check('a mark\'s card is a mark spec (its number, its key and the next mark) with no metal; a badge that is no mark, and a tier past the last, have none',
      mk.spec && mk.spec.kind === 'mark' && mk.spec.key === 'weeks_held' && mk.spec.n === 12 && mk.spec.next === 24 && !('metal' in mk.spec)
      && mk.spec.award_id === 'badge:held_weeks:3' && mk.none === null && mk.over === null, JSON.stringify(mk));
    await ctx.close();
  }
}


// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// AA PROOF: no career screens (CAREER_LIGHT). What still moves is the XP: the level on Today's ring, a tick, WORKOUT at 0, a phone-decided award, the dirty push, offline
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function proofXp(browser, C) {
  const L10 = lvl(10000);
  const S3 = at(-3);
  const LOG = {};
  for (let i = 1; i <= 6; i++) LOG[at(-i)] = { water: 8, sleep: 8, steps: 11000, fuel: 3 };
  const proofOpts = (prof, extra) => Object.assign({ seed: { _hab_log: LOG }, stub: { profile: prof } }, extra || {});
  const hero = p => p.evaluate(() => { const h = document.querySelector('[data-hero]'); return h ? h.textContent.trim() : null; });
  const quiet = p => p.evaluate(() => ({ q: UI.celebrate.length, lvwrap: document.querySelectorAll('.lvwrap').length }));
  // 1. before the switch: nothing changes (the profile is read, the level is Proof's own)
  {
    const { ctx, p } = await H.openProof(browser, proofOpts(profile(10000, { on: false })));
    await p.waitForTimeout(1200);
    const own = await p.evaluate(() => ({ lv: overallLevel().lv, base: overallBase(), on: careerOn(), wo: paidXp(habitById('strength'), 1) }));
    const q = await quiet(p);
    C.check('Proof, off: no reveal, nothing queued', q.q === 0 && q.lvwrap === 0, JSON.stringify(q));
    C.check('Proof, off: the level is Proof\'s own (its curve, base 300), WORKOUT still pays 120', !own.on && own.base === 300 && own.wo === 120 && String(own.lv) === await hero(p), JSON.stringify(own));
    const manOff = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = renderManual(); return d.textContent.replace(/\s+/g, ' '); });
    C.check('Proof, off: the manual lists WORKOUT at its own 100 and no session on top', /Finish your session 45 min · from your programme 100 XP/.test(manOff) && !/on top\./.test(manOff),
      manOff.match(/Finish your session.{0,60}/));
    C.check('Proof, off: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 2. the switch on: the career's level on Today's ring and curve, silently; a tick at once; WORKOUT 0
  {
    const { ctx, p } = await H.openProof(browser, proofOpts(profile(10000)));
    await p.waitForTimeout(2000);
    const q = await quiet(p);
    C.check('Proof, on: no reveal and no level-up behind it (the queue is empty), however far the career is from Proof\'s own level', q.q === 0 && q.lvwrap === 0, JSON.stringify(q));
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
    C.check('Proof, on: the baseline moved in silence (careerSeen is the switch day)', await p.evaluate(() => CFG.careerSeen) === SWITCH_DAY);
    C.check('Proof, on: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    // the same phone, opened again: nothing; the profile copy opens it at once
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const q2 = await quiet(p);
    C.check('Proof, again: nothing queued, and the ring is the career\'s level', q2.q === 0 && q2.lvwrap === 0 && await hero(p) === String(L10.level), JSON.stringify({ q2, hero: await hero(p) }));
    await ctx.close();
    // another phone: the config came through the cloud with careerSeen set
    const other = await H.openProof(browser, proofOpts(profile(10000), { cfg: { careerSeen: SWITCH_DAY } }));
    await other.p.waitForTimeout(1500);
    const q3 = await quiet(other.p);
    C.check('Proof, another phone: nothing queued', q3.q === 0 && q3.lvwrap === 0, JSON.stringify(q3));
    await other.ctx.close();
  }
  // 3. someone who started after the switch: nothing queued, the baseline still moves
  {
    const fresh = await H.openProof(browser, proofOpts(profile(300, { since: SWITCH_DAY })));
    await fresh.p.waitForTimeout(1500);
    const q = await quiet(fresh.p);
    C.check('Proof, started after the switch: nothing queued, careerSeen is the switch day', q.q === 0 && q.lvwrap === 0 && await fresh.p.evaluate(() => CFG.careerSeen) === SWITCH_DAY, JSON.stringify(q));
    await fresh.ctx.close();
  }
  // 4. the embedded strip never asks the server for the profile, the shelf or a moment, and tells nothing
  {
    const em = await H.openProof(browser, proofOpts(profile(10000), { url: '/habits.html?embed=1' }));
    await em.p.waitForTimeout(1200);
    C.check('Proof, embedded: get_profile and get_awards are never asked, nothing told', await calls(em.p, 'rpc:get_profile') === 0 && await calls(em.p, 'rpc:get_awards') === 0 && await calls(em.p, 'rpc:mark_moments_told') === 0,
      JSON.stringify([await calls(em.p, 'rpc:get_profile'), await calls(em.p, 'rpc:get_awards'), await calls(em.p, 'rpc:mark_moments_told')]));
    C.check('Proof, embedded: no page errors', em.p.errs.length === 0, JSON.stringify(em.p.errs));
    await em.ctx.close();
  }
  // 5. since the cut (stage78, 2026-10-19) there is no habit badge in the catalogue, so a tick that would have made five days of water decides
  // nothing on the phone: no pending award, nothing to withdraw, the career XP moves by the habit alone (GAME-13). (Before the cut this block held
  // the phone-decided habit_water tier: its XP at once, then withdrawn when the server said no. That path stays in habits.html for any badge the
  // catalogue may hold again; with none, it is dormant.)
  {
    const prof = rwProfile(10000), waterLog = {};
    for (let i = 1; i <= 4; i++) waterLog[at(-i)] = { water: 8 };       // four days of full water: today's tick makes five
    const { ctx, p } = await H.openProof(browser, rwProof(prof, { log: waterLog, cfg: { catalogueSeen: S3 } }));
    await p.waitForTimeout(2500);
    const xp0 = await ev(p, `careerXp()`);
    await ev(p, `(setVal('water', 8), actionLevelUps(), render(), 0)`);
    const pend = await ev(p, `phoneAwards().map(a => a.award_id)`);
    C.check('Proof, after the cut: a tick that makes five days of water decides no award on the phone (there is no habit badge)', pend.length === 0 && !catRows().some(r => r.kind === 'badge' && /^habit_/.test(r.id)), JSON.stringify(pend));
    const xp = await ev(p, `({ shown: careerXp(), pend: pendingAwardXp(), water: xpFor(habitById('water'), 8) })`);
    C.check('Proof, after the cut: the tick moves the career XP by the habit alone, nothing pending (GAME-13)', xp.pend === 0 && xp.shown === xp0 + xp.water, JSON.stringify([xp0, xp]));
    C.check('Proof, …and no takeover and no wins line for an award', (await celebrating(p)).length === 0 && !(await ev(p, `(CFG.wins || []).some(w => w.k === 'award')`)), JSON.stringify(await celebrating(p)));
    await p.waitForTimeout(3500);
    const wd = await ev(p, `({ wd: loadWithdrawn(), pend: pendingAwardXp(), pushOk: _pushOkAt > 0 })`);
    C.check('Proof, after the cut: after a push nothing is withdrawn and nothing is pending', wd.pushOk && wd.wd.length === 0 && wd.pend === 0, JSON.stringify(wd));
    C.check('Proof, after the cut: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 6. a dirty push, then the catalogue newly on: the XP shown does not move
  {
    const log = {}; for (let i = 1; i <= 25; i++) log[at(-i)] = { water: 8, sleep: 8, steps: 11000, fuel: 3 };
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(20000, { S: null }), { log }));
    await p.waitForTimeout(2000);
    const before = await ev(p, `({ xp: overallXp(), tiers: bonusEvents().filter(e => e.kind === 'tier' || e.kind === 'milestone').length })`);
    await ev(p, `(SYNC.dirty = true, _pushedXp = phoneXp(), 0)`);
    await ev(p, `(${stubSet(rwProfile(20000, { S: at(-1) }))}, 0)`);
    await ev(p, `fetchCareer()`);
    await p.waitForTimeout(500);
    const after = await ev(p, `({ xp: overallXp(), tiers: bonusEvents().filter(e => e.kind === 'tier' || e.kind === 'milestone').length, cat: catalogueOn(), pend: pendingAwardXp() })`);
    C.check('Proof, the flip: tiers and milestones leave this phone\'s ledger', before.tiers > 0 && after.tiers === 0 && after.cat, JSON.stringify([before, after]));
    C.check('Proof, a dirty push and then the catalogue newly on: the XP shown does not move', after.xp - after.pend === before.xp, JSON.stringify([before, after]));
    C.check('Proof, the flip: nothing queued, no page errors', (await celebrating(p)).length === 0 && p.errs.length === 0, JSON.stringify([await celebrating(p), p.errs]));
    await ctx.close();
  }
  // 7. a cached profile with the catalogue on, no catalogue copy, the network blocked: boot renders #app
  {
    const { ctx, p } = await H.openProof(browser, rwProof(rwProfile(10000), { cfg: { catalogueSeen: S3 } }));
    await p.waitForTimeout(2000);
    await p.evaluate(() => { localStorage.removeItem(ATHLETE_ID + '_hab_catalogue'); const c = JSON.parse(localStorage.getItem('__stubcfg')); c.mode = 'offline'; localStorage.setItem('__stubcfg', JSON.stringify(c)); });
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('app') && document.getElementById('app').textContent.length > 200, null, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const s = await ev(p, `({ on: catalogueOn(), ready: catalogueReady(), app: document.getElementById('app').textContent.length, pend: pendingAwardXp(), lv: document.querySelector('[data-hero]') && document.querySelector('[data-hero]').textContent.trim() })`);
    C.check('Proof, offline with the profile cached and no catalogue copy: boot renders #app with the career\'s level, no phone scoring of awards', s.on && !s.ready && s.app > 200 && s.pend === 0 && s.lv === String(lvl(10000).level), JSON.stringify(s));
    C.check('Proof, offline: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 8. the coach's preview writes nothing and tells nothing
  {
    const m = mom('badge:held_weeks:3', 'milestone', true, 600, badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, 'x', at(-1)));
    const pv = await H.openProof(browser, rwProof(rwProfile(10000, { moments: [m], owned: { 'badge:held_weeks:3': at(-1) } }), { url: '/habits.html?preview=1' }));
    await pv.p.waitForTimeout(2000);
    const w = await ev(pv.p, `({ cat: localStorage.getItem(ATHLETE_ID + '_hab_catalogue'), told: (window.__STUB.calls || []).filter(c => c === 'rpc:mark_moments_told').length, cel: UI.celebrate.length, seen: CFG.catalogueSeen, awwd: localStorage.getItem(ATHLETE_ID + '_hab_awwd') })`);
    C.check('Proof, the coach\'s preview: nothing written, nothing told, no reveal', !w.cat && w.told === 0 && w.cel === 0 && !w.seen && !w.awwd, JSON.stringify(w));
    C.check('Proof, the coach\'s preview: no page errors', pv.p.errs.length === 0, JSON.stringify(pv.p.errs));
    await pv.ctx.close();
  }
}


// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// BOTH APPS: a waiting moment is the training app's alone. AA Proof shows nothing and tells nothing (serverMoments() is false); the training app shows it once and tells the server
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The two apps share one browser here, as on a phone: the profile the stub keeps after mark_moments_told (stub tellRemoves) is what the next page reads, exactly as the server's
// told_at is what the other app reads.
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
  const tellers = p => p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'mark_moments_told').map(x => x[1].p_app));
  // 1. a mark's tier is minted and waiting: AA Proof says nothing and tells nothing; the training app shows it ONCE and tells the server; AA Proof is still silent after
  {
    const spec = badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, '12 weeks held in a row. You keep showing up.', at(-1));
    const minted = rwProfile(30200, { S: S30, owned: { 'badge:held_weeks:3': at(-1) }, moments: [mom('badge:held_weeks:3', 'milestone', true, 600, spec)] });
    const { ctx, p } = await H.openProof(browser, rwProof(minted, { cfg: { catalogueSeen: S30 }, stub: { tellRemoves: true } }));
    await p.waitForTimeout(2500);
    await ev(p, `(fetchCareer(), 0)`);
    await p.waitForTimeout(600);
    C.check('cross-app: AA Proof opens nothing for a waiting moment (no takeover, no wins line)', (await celebrating(p)).length === 0 && !(await ev(p, `(CFG.wins || []).some(w => w.k === 'award')`)), JSON.stringify(await celebrating(p)));
    C.check('cross-app: …and tells the server nothing, so the row stays waiting for the training app', (await tellers(p)).length === 0 && (await ev(p, `JSON.parse(localStorage.getItem('__stubcfg')).profile.moments.length`)) === 1, JSON.stringify(await tellers(p)));
    await toApp(p, 'training');
    C.check('cross-app: the training app opens the moment, once', await p.evaluate(() => document.querySelectorAll('.hl-moment').length) === 1 && (await p.evaluate(() => document.querySelector('.hl-m-title').textContent)) === '12 weeks held in a row');
    await p.waitForTimeout(400);
    C.check('cross-app: …and the server was told, as "training"', (await params(p, 'mark_moments_told')).some(a => a.p_app === 'training' && a.p_award_ids.indexOf('badge:held_weeks:3') >= 0), JSON.stringify(await params(p, 'mark_moments_told')));
    await toApp(p, 'proof');
    C.check('cross-app: AA Proof is still silent afterwards and still tells nothing', (await celebrating(p)).length === 0 && (await tellers(p)).length === 0 && !(await ev(p, `(CFG.wins || []).some(w => w.k === 'award' && w.id === 'badge:held_weeks:3')`)), JSON.stringify([await celebrating(p), await tellers(p)]));
    await toApp(p, 'training');
    C.check('cross-app: the next open of the training app does not replay it (the server has it told)', !(await p.$('.hl-moment')) && (await calls(p, 'rpc:mark_moments_told')) <= 1);
    C.check('cross-app: no page errors in either app', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 2. an achievement minted by a tick in AA Proof (THE FOUNDRY on a log of 19 days): AA Proof celebrates nothing; the training app is where the server's row is shown
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
    C.check('cross-app: a tick that finishes THE FOUNDRY on the phone: no award takeover in AA Proof', !q.some(x => /^award:/.test(x)) && !q.some(x => /^reward:/.test(x)), JSON.stringify(q));
    const spec = { kind: 'achievement', name: 'THE FOUNDRY', meaning: 'commitment', caption: 'Four weeks of putting the work in.', date: at(0) };
    const minted = rwProfile(30200, { S: S30, owned: { 'achievement:the_foundry': at(0) }, moments: [mom('achievement:the_foundry', 'milestone', true, 0, spec)] });
    // the server's answer from now on, kept in the stub's config so the training app opened next in this browser reads it too
    await p.evaluate(([m, aw]) => { const c = JSON.parse(localStorage.getItem('__stubcfg')); c.profile = m; c.awards = aw; localStorage.setItem('__stubcfg', JSON.stringify(c)); window.__STUB.profile = m; window.__STUB.awards = aw; }, [minted, rwShelf(minted)]);
    await ev(p, `fetchCareer()`);
    await p.waitForTimeout(500);
    C.check('cross-app: the server mints it; AA Proof still tells nothing', (await tellers(p)).length === 0 && (await ev(p, `JSON.parse(localStorage.getItem('__stubcfg')).profile.moments.length`)) === 1, JSON.stringify(await tellers(p)));
    await toApp(p, 'training');
    const mo = await p.evaluate(() => { const m = document.querySelector('.hl-moment'); return m ? { t: m.querySelector('.hl-m-title').textContent, go: m.querySelector('.hl-m-go').textContent } : null; });
    C.check('cross-app: the training app opens it ("The Foundry", Share it) and tells the server as "training"', !!mo && mo.t === 'The Foundry' && mo.go === 'Share it'
      && (await params(p, 'mark_moments_told')).some(a => a.p_app === 'training' && a.p_award_ids.indexOf('achievement:the_foundry') >= 0), JSON.stringify([mo, await params(p, 'mark_moments_told')]));
    C.check('cross-app: no page errors in either app', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
}


// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// FOUR COURTS: Achievements on Progress (get_achievements(), stage80), a kind opened in the sheet, the finish card's nudge
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// get_achievements() as stage80 answers it: earned ones with their day, the rest with have and need, `next` the one to lead with.
function achFx(o = {}) {
  const items = [
    { id: 'held', name: 'Held', meaning: 'consistency', test: 'first', reads: 'week_held', caption: 'Your first held week. Every session, on your days.', rule: 'The first week held.', size: 'highlight', xp: 100, origin: 'new', day: at(-20) },
    { id: 'back_to_back', name: 'Back to Back', meaning: 'consistency', test: 'best_run', reads: 'week_held', caption: 'Two held weeks in a row. Keep it going.', rule: 'Two training weeks held in a row, the first time.', size: 'highlight', xp: 150, origin: 'new', have: 1, need: 2 },
    { id: 'full_month', name: 'Full Month', meaning: 'consistency', test: 'month_held', reads: 'week_held', caption: 'Every week of the month, held. Full Month.', rule: 'Every training week that ends in a calendar month held.', size: 'milestone', xp: 400, origin: 'new', have: 0, need: 4, spoilt: true },
    { id: 'straight_talk', name: 'Straight Talk', meaning: 'commitment', test: 'total', reads: 'checkin_done', caption: '25 honest check-ins.', rule: '25 check-ins answered before a session.', size: 'highlight', xp: 150, origin: 'new', have: o.checkins == null ? 23 : o.checkins, need: 25 },
    { id: 'first_blood', name: 'FIRST BLOOD', meaning: 'commitment', test: 'proof', reads: 'proof', caption: 'Your first session on the board', rule: 'The first day with a session done.', size: 'win', xp: 50, origin: 'proof', day: at(-40) },
    { id: 'season_ticket', name: 'Season Ticket', meaning: 'commitment', test: 'total', reads: 'month_with_amir', caption: 'Three months with Amir.', rule: 'Three whole months since the first session.', size: 'milestone', xp: 300, origin: 'new', have: 2, need: 3 },
    { id: 'moving_up', name: 'Moving Up', meaning: 'progress', test: 'first', reads: 'effort_win', caption: 'Stronger at the same effort.', rule: 'The first effort-matched win at a cycle\'s end.', size: 'highlight', xp: 100, origin: 'new', have: 0, need: 1 },
    { id: 'rebound', name: 'Bounce Back', meaning: 'resilience', test: 'first', reads: 'bounce_back', caption: 'A week went wrong. The next one did not.', rule: 'The first week held straight after a broken one.', size: 'highlight', xp: 100, origin: 'new', day: at(-6) }];
  const nx = items.find(i => i.id === (o.next || 'straight_talk'));
  return { athlete_id: H.ID, ready: true, items, next: nx, month: { weeks: 4, held: 1, spoilt: true } };
}
async function fourCourts(browser, C) {
  const OUT = H.outDir();
  const CLAY = /199, 85, 47|181, 70, 31|224, 107, 67/;
  // 1. the section: the title with its count, Next up, the four tiles
  {
    const { ctx, p } = await openRW(browser, { facts: HOLD_FACTS, hist: ONE_DONE, stub: { myMoments: myMomentsFx(), achievements: achFx() } });
    await waitRow(p);
    await goProgress(p);
    await p.waitForFunction(() => !!document.querySelector('#career-courts-wrap .hrow'), null, { timeout: 8000 }).catch(() => {});
    // THE SCOREBOARD (2026-10-19): Achievements is a door row on Progress and the four kinds are the page behind it.
    const d = await p.evaluate(() => {
      const b = document.querySelector('#career-courts-wrap .hrow');
      const y = sel => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
      return b ? { l: b.querySelector('.hrow-l').textContent.trim(), v: b.querySelector('.hrow-vv').textContent.trim(), s: b.querySelector('.hrow-v small').textContent.trim(),
        order: [y('.cs-card'), y('#career-courts-wrap .hrow'), y('#career-moments-wrap .hrow')] } : null;
    });
    C.check('Achievements: a door saying "3 of 8" with what is closest, under Your numbers and above Your moments',
      !!d && d.l === 'Achievements' && d.v === '3 of 8' && d.s === 'Straight Talk · 2 more check-ins before a session.' && d.order[0] < d.order[1] && d.order[1] < d.order[2], JSON.stringify(d));
    await p.evaluate(() => goTo('achievements'));
    await p.waitForTimeout(300);
    const s = await p.evaluate(() => {
      const n = document.querySelector('#ach-body .ac-next');
      return { screen: (document.querySelector('.screen.active') || {}).id, title: (document.querySelector('#screen-achievements .ceil-title') || {}).textContent.trim(),
        lit: [...document.querySelectorAll('#global-tabs .nav-item.active')].map(x => x.dataset.tab).join(),
        next: n && { l: n.querySelector('.cs-l').textContent, nm: n.querySelector('.ac-nm').textContent, s: n.querySelector('.ac-s').textContent, bar: (n.querySelector('.cs-bar i') || {}).style && n.querySelector('.cs-bar i').style.width },
        tiles: [...document.querySelectorAll('#ach-body .ac-tile')].map(b => ({ k: b.querySelector('.ac-k').textContent, n: b.querySelector('.ac-n').textContent.replace(/\s+/g, ' ').trim(), nw: b.querySelector('.ac-new').textContent })),
        clay: [...document.querySelectorAll('#ach-body, #ach-body *')].map(e => getComputedStyle(e).color + ' ' + getComputedStyle(e).backgroundColor).join('|') };
    });
    C.check('Achievements: its own page, titled Achievements, with the Progress tab lit', s.screen === 'screen-achievements' && s.title === 'Achievements' && s.lit === 'plan', JSON.stringify([s.screen, s.title, s.lit]));
    C.check('Four Courts: Next up names the closest one with its line and bar (Straight Talk, 2 more check-ins, 92%)',
      !!s && !!s.next && s.next.l === 'Next up' && s.next.nm === 'Straight Talk' && s.next.s === '2 more check-ins before a session.' && s.next.bar === '92%', JSON.stringify(s && s.next));
    C.check('Four Courts: four tiles in order, each with earned of all and the newest (a capitals name reads as a name)', !!s && JSON.stringify(s.tiles) === JSON.stringify([
      { k: 'Consistency', n: '1of 3', nw: 'Held · ' + Number(at(-20).slice(8)) + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(at(-20).slice(5, 7)) - 1] },
      { k: 'Commitment', n: '1of 3', nw: 'First Blood · ' + Number(at(-40).slice(8)) + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(at(-40).slice(5, 7)) - 1] },
      { k: 'Progress', n: '0of 1', nw: 'None yet' },
      { k: 'Resilience', n: '1of 1', nw: 'Bounce Back · ' + Number(at(-6).slice(8)) + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(at(-6).slice(5, 7)) - 1] }]), JSON.stringify(s && s.tiles));
    C.check('Four Courts: no clay anywhere in the section (it asks for nothing, DS-01)', !!s && !CLAY.test(s.clay), s && s.clay.slice(0, 300));
    await p.screenshot({ path: path.join(OUT, 'four-courts-390.png'), fullPage: true }).catch(() => {});
    // 2. a tile opens its kind: earned first with the day, then the rest furthest along first, Next on the nearest, a bar once started
    await p.click('#ach-body .ac-tile:nth-child(1)');
    await p.waitForTimeout(300);
    const k = await p.evaluate(() => {
      const ov = document.getElementById('hist-overlay');
      return ov && ov.classList.contains('visible') ? { title: ov.querySelector('.readiness-title').textContent, eyebrow: ov.querySelector('.readiness-eyebrow').textContent,
        rows: [...ov.querySelectorAll('.ac-row')].map(r => ({ id: r.dataset.ach, earned: r.classList.contains('is-earned'), w: r.querySelector('.ac-w').textContent, sub: r.querySelector('.ac-sub').textContent, bar: !!r.querySelector('.ac-bar') })) } : null;
    });
    C.check('a tile opens its kind in the sheet: "Consistency", Achievements · 1 of 3', !!k && k.title === 'Consistency' && k.eyebrow === 'Achievements · 1 of 3', JSON.stringify(k && [k.title, k.eyebrow]));
    C.check('the kind: Held first (earned, its caption and day), then Back to Back (Next, its line and bar), then Full Month (what earns it, no bar: this month is spoilt)',
      !!k && k.rows.map(r => r.id).join() === 'held,back_to_back,full_month' && k.rows[0].earned && /Your first held week/.test(k.rows[0].sub)
      && k.rows[1].w === 'Back to BackNext' && k.rows[1].sub === 'Hold this week too. 1 week to go.' && k.rows[1].bar
      && !k.rows[2].earned && !k.rows[2].bar && /calendar month/.test(k.rows[2].sub), JSON.stringify(k && k.rows));
    await p.screenshot({ path: path.join(OUT, 'four-courts-kind-390.png') }).catch(() => {});
    await p.evaluate(() => history.back());
    await p.waitForTimeout(300);
    C.check('Back closes the kind', await p.evaluate(() => !document.getElementById('hist-overlay').classList.contains('visible')));
    // 3. Next up's tap opens its kind
    await p.click('#ach-body .ac-next');
    await p.waitForTimeout(300);
    C.check('Next up opens its kind (Commitment)', await p.evaluate(() => { const ov = document.getElementById('hist-overlay'); return ov.classList.contains('visible') && ov.querySelector('.readiness-title').textContent === 'Commitment'; }));
    // 4. the nudge: one step short of a held week, of a check-in total; nothing otherwise
    const nud = await p.evaluate(() => ({
      week: achNudgeHTML({ weekLeft: 1, checkin: true }), week0: achNudgeHTML({ weekLeft: 0, checkin: false }), two: achNudgeHTML({ weekLeft: 2, checkin: false }) }));
    C.check('the nudge: one more session this week gives Back to Back', /One more session this week and you get Back to Back\./.test(nud.week), nud.week);
    C.check('the nudge: none when the session holds the week itself or two are left (Straight Talk at 23 of 25 with no check-in today is two away)', nud.week0 === '' && nud.two === '', JSON.stringify(nud));
    const ab = await p.evaluate(() => { document.querySelector('#screen-achievements .nav-back').click(); return (document.querySelector('.screen.active') || {}).id; });
    C.check('Achievements: the back arrow lands on Progress', ab === 'screen-plan', ab);
    C.check('Four Courts: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 5. the check-in nudge, and 320 px
  {
    const { ctx, p } = await openRW(browser, { w: 320, facts: HOLD_FACTS, hist: ONE_DONE, stub: { myMoments: myMomentsFx(), achievements: achFx({ checkins: 23 }) } });
    await waitRow(p);
    await goProgress(p);
    await p.waitForFunction(() => !!document.querySelector('#career-courts-wrap .hrow'), null, { timeout: 8000 }).catch(() => {});
    await p.evaluate(() => goTo('achievements'));
    await p.waitForTimeout(300);
    const n = await p.evaluate(() => achNudgeHTML({ weekLeft: 3, checkin: true }));
    C.check('the nudge: today\'s check-in makes 24 of 25, so the next one gives Straight Talk', /Answer the check-in before your next session and you get Straight Talk\./.test(n), n);
    const fit = await p.evaluate(() => { const r = [...document.querySelectorAll('#ach-body .ac-next, #ach-body .ac-tile')].map(e => e.getBoundingClientRect().right); return { right: Math.max(...r), vw: innerWidth, sideways: document.documentElement.scrollWidth > innerWidth + 1 }; });
    C.check('320 px: Next up and the tiles fit, no sideways scroll', fit.right <= fit.vw && !fit.sideways, JSON.stringify(fit));
    await ctx.close();
  }
  // 6. no answer (the server without stage80): no section, nothing else changes
  {
    const { ctx, p } = await openRW(browser, { facts: HOLD_FACTS, hist: ONE_DONE, stub: { myMoments: myMomentsFx() } });
    await waitRow(p);
    await goProgress(p);
    await momentsReady(p);
    const o = await p.evaluate(() => ({ door: !!document.querySelector('#career-courts-wrap .hrow'), moments: !!document.querySelector('#career-moments-wrap .hrow'), card: !!document.querySelector('.cs-card') }));
    C.check('no get_achievements answer: no Achievements door, Your numbers and the Your moments door as before', !o.door && o.moments && o.card, JSON.stringify(o));
    C.check('no answer: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
}


// ── The habits page says what the habits have paid (2026-10-20, Amir: "I want the habits to give xp as well. Like before. It
// doesnt show xp so the people dont fill like their progressing") ─────────────────────────────────────────────────────────
// Habits have always paid into the level (public.hab_xp: the weight times the completion bonus); no screen in this app said so.
async function habitXp(browser, C) {
  const LOG = rwLog(6);
  // 1. the card, the price on every row, and the door into the one cabinet
  {
    const prof = rwProfile(13495);
    prof.career.habits = { xp: 8190, daily: 7490, bonus: 700 };
    const { ctx, p } = await openRW(browser, { facts: HOLD_FACTS, hist: ONE_DONE, seed: { _hab_cfg: HAB_ON, _hab_log: LOG },
      stub: { profile: prof, awards: rwShelf(prof), myMoments: myMomentsFx(), achievements: achFx() } });
    // the habit-driven ones the door counts: the same filter the app uses (test proof/goals/runs_together, or reads proof/habit_done)
    const habAch = achFx().items.filter(i => ['proof', 'goals', 'runs_together'].indexOf(String(i.test)) >= 0 || ['habit_done', 'proof'].indexOf(String(i.reads)) >= 0);
    await waitRow(p);
    await p.evaluate(() => goTo('habits'));
    await p.waitForTimeout(600);
    const h = await p.evaluate(() => ({
      xp: (document.querySelector('#screen-habits .hab-xp b') || {}).textContent,
      line: (document.querySelector('#screen-habits .hab-xp-t small') || {}).textContent,
      label: (document.querySelector('#screen-habits .hab-xp-t span') || {}).textContent,
      prices: [...document.querySelectorAll('#screen-habits .hl-row.is-core')].map(r => (r.querySelector('.hl-tag small') || {}).textContent),
      door: (() => { const b = [...document.querySelectorAll('#screen-habits .hrow')].find(x => /From your habits/.test(x.textContent));
        return b ? { v: b.querySelector('.hrow-vv').textContent, s: b.querySelector('.hrow-v small').textContent } : null; })(),
      sideways: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    C.check('the habits page says what the habits have paid: the server\'s own number and its share of the level', h.xp === '8,190' && h.label === 'XP from your habits'
      && /^61% of your level/.test(h.line || ''), JSON.stringify(h));
    // steps 60, sleep 50, protein 40, water 30, each times the 1.2 completion bonus; the session is locked and the session pays it
    C.check('every habit says what it pays a day, and the session row says where its XP comes from instead',
      JSON.stringify(h.prices) === JSON.stringify(['Session pays it', '+72 XP a day', '+60 XP a day', '+48 XP a day', '+36 XP a day']), JSON.stringify(h.prices));
    C.check('a door into the one cabinet, counting the achievements the habits themselves can win', !!h.door && /^\d+ of \d+$/.test(h.door.v) && !!h.door.s, JSON.stringify(h.door));
    C.check('the habits page fits (no sideways scroll)', !h.sideways);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#screen-habits .hrow')].find(x => /From your habits/.test(x.textContent)); b.click(); });
    await p.waitForTimeout(400);
    // ⚠️ It opens the HABIT ones themselves (2026-10-20, Amir: "i asked if i can see what achievements i can get through habits,
    // or what ones i do own now"). It used to jump to the whole cabinet, where the nine are scattered across the four kinds.
    const sheet = await p.evaluate(() => {
      const ov = document.getElementById('hist-overlay');
      return ov && ov.classList.contains('visible')
        ? { title: ov.querySelector('.readiness-title').textContent, eyebrow: ov.querySelector('.readiness-eyebrow').textContent,
            rows: [...ov.querySelectorAll('.ac-row')].map(r => ({ w: r.querySelector('.ac-w').textContent, done: r.classList.contains('is-earned'), kd: (r.querySelector('.ac-kd') || {}).textContent })),
            screen: (document.querySelector('.screen.active') || {}).id }
        : null;
    });
    C.check('the door opens the habit achievements, owned first with the day, in a sheet over the habits page', !!sheet && sheet.title === 'From your habits'
      && /^Achievements · \d+ of \d+$/.test(sheet.eyebrow) && sheet.screen === 'screen-habits' && sheet.rows.length === habAch.length
      && sheet.rows.filter(r => r.done).length === habAch.filter(i => i.day).length, JSON.stringify(sheet));
    C.check('each row says which court it counts toward, since this one list mixes all four', !!sheet && sheet.rows.every(r => !!r.kd), JSON.stringify(sheet && sheet.rows));
    C.check('the habits page: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 2. a tick says what it just paid, and only a tick that earned something says anything
  {
    const prof = rwProfile(13495);
    prof.career.habits = { xp: 8190, daily: 7490, bonus: 700 };
    const { ctx, p } = await openRW(browser, { facts: HOLD_FACTS, hist: ONE_DONE, seed: { _hab_cfg: HAB_ON, _hab_log: {} },
      stub: { profile: prof, awards: rwShelf(prof), myMoments: myMomentsFx() } });
    await waitRow(p);
    // The tick's own flourish: a +N XP over the row that rises and goes (no box to dismiss five times a day).
    // ⚠️ The pop ADDS UP while it is on screen (a held − or + is many steps a second), so each case here starts from a clean
    // count; without that, three steps in a row would read as one growing number, which is exactly what a hold should look like.
    const said = async (src) => { await p.evaluate(() => { _habPop = null; document.querySelectorAll('.hb-pop').forEach(e => e.remove()); }); await p.evaluate(src); await p.waitForTimeout(300);
      return await p.evaluate(() => { const e = document.querySelector('.hb-pop'); return e ? e.textContent.trim() : null; }); };
    C.check('a habit done pays, and the tick says so (mobility 30 × 1.2)', (await said(() => { habToggleOn('mobility'); habToggleOn('mobility'); habSetVal('mobility', 1); })) === '+36 XP');
    C.check('part of a counter pays its share (half of 8 glasses: 30 × 0.5)', (await said(() => habSetVal('water', 4))) === '+15 XP');
    C.check('the rest of it pays the rest (the full 36, less the 15 already paid)', (await said(() => habSetVal('water', 8))) === '+21 XP');
    // Taking a number back says so too (2026-10-20, with the − button): XP that left in silence would be the app lying by omission.
    C.check('taking a habit back says what it cost, in grey', (await said(() => habSetVal('water', 0))) === '−36 XP');
    C.check('the day\'s own XP is counted the server\'s way', await p.evaluate(() => habDayXp()) === 36);
    C.check('the tick: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
}

async function main() {
  const C = H.checker();
  const browser = await H.launch();
  await trainingBase(browser, C);       // the XP switch on, the catalogue off
  await trainingLight(browser, C);      // the catalogue on: Your numbers, New from Amir, the marks
  await fourCourts(browser, C);         // Achievements on Progress: Four Courts, a kind, the nudge
  await habitXp(browser, C);            // the habits page: what they have paid, what each one pays, the door
  await proofXp(browser, C);            // AA Proof: the XP that still moves
  await crossApp(browser, C);           // a moment is the training app's alone
  await browser.close();
  process.exitCode = C.report() ? 1 : 0;
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { rwProfile, rwShelf, stubSet, rwLog, catRows, rwProof, mom, badgeSpec, RW_LADDER, RW_RULES, at, lvl, SWX, strip, toReady, tickAll, waitRow, T, myMomentsFx, proofXp, trainingBase, trainingLight, crossApp };
