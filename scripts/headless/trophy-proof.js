// Career Mode phase 3, the catalogue switch, in AA Proof (habits.html): node scripts/headless/trophy-proof.js
// (career/CAREER_MODE.md → round 4; HABITS.md → Career Mode phase 3: the Trophy Room; XP_SYSTEM.md §4.7).
//
// What an athlete meets once the server's CATALOGUE switch is on (get_profile().switch.catalogue is a day), and what they
// meet before it (nothing new), on made-up profiles from the stub (get_profile, and career_catalogue as a table):
//   inert      switch.catalogue null: the milestone shelf, the old Consistency block, the old manual, no career_told and no
//              career_catalogue read, even when the profile carries a stray shelf, moments and reveal.
//   the shelf  the Trophy Room replaces the milestone shelf on Progress: four numbers, a Grand Slam of four slots, four shelves
//              (a badge's metal and step, "Paper Trail 9 of 10", an achievement's rule while locked), titles, and a folded
//              "Retired, still yours" group; text 12 px or more, no yellow, nothing sideways at 320 px.
//   a free athlete  the Progress shelf locked ("Coached athletes earn these from their programme."), their own four numbers.
//   the reveal ONE moment ("Your Trophy Room is open"), the switch re-baselined in silence (no toast, no flood), career_told(['reveal'])
//              once when it is dismissed, never again on this phone or another; both reveals when both switches are new.
//   moments    each shown once at its size (milestone and legend: a takeover; highlight and win: the wins card, Share it on the
//              highlight), told when shown; a title moment is a takeover that owns the title.
//   titles     a 'c_' id is named from the shelf (own) or from one read of career_catalogue (anyone's), is wearable in the Locker,
//              and the Title and Milestone cards draw it.
//   the scorer after the switch: no WORKOUT steps, ONE ladder for the athlete's own habits, nothing for a retired mark, kept
//              marks and the comeback as before; catalogueSteps() is the pure helper; careerXp() does not jump at the switch.
//   ?go=trophy opens Progress at the Trophy Room (and the Locker when the switch is off).
// Serve the repo first (python -m http.server 8791 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.toISOString().slice(0, 10);
const at = n => ymd(new Date(Date.now() + n * DAY));                    // n days from today (UTC; every page here runs in UTC)
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'career', 'xp_cases.json'), 'utf8'));
const LEVEL = CASES.rules.level;
function lvl(xp) {
  const cost = n => Math.max(10, Math.round(LEVEL.base * Math.pow(n, LEVEL.growth) / 10) * 10);
  let lv = 1, spent = 0, c = cost(1);
  while (xp - spent >= c) { spent += c; lv++; c = cost(lv); }
  const i = lv - 1, within = i % LEVEL.prestige_after, star = Math.floor(i / LEVEL.prestige_after);
  return { level: lv, rank: (star ? '★' + star + ' ' : '') + LEVEL.ranks[Math.floor(within / LEVEL.levels_per_rank)] + ' ' + (within % LEVEL.levels_per_rank + 1),
           xp_in_level: xp - spent, level_cost: c, to_next: c - (xp - spent) };
}

// ── The stub profile: the contract's shape (career-phase3-profile-spec.md) ────────────────────────────────────────────────
const XP_DAY = at(-6), CAT_DAY = at(-1);
const HABIT_STEPS = [[5, 'bronze', 'KINDLED'], [10, 'silver', 'STEADY'], [20, 'emerald', 'LOCKED IN'], [30, 'amethyst', 'IRONCLAD'], [60, 'prismatic', 'UNBREAKABLE']];
// A badge from a ladder spec [[at, metal, xp, tier_name?]] and how many steps are owned.
function badge(o) {
  const spec = o.spec, owned = o.owned || 0;
  const steps = spec.map((s, i) => ({ tier: i + 1, at: s[0], metal: s[1], xp: s[2], size: 'win', tier_name: s[3] || null, title: null,
    day: i < owned ? at(-20 + i) : null, how: i < owned ? (o.how || 'earned') : null }));
  return Object.assign({ meaning: 'consistency', kind: 'best_run', habit: null, free: false, origin: 'new', retired: false, superseded_by: null,
    sub: '', caption: '', n: 0, now: null, tier: owned, metal: owned ? spec[owned - 1][1] : null, steps,
    next: owned < spec.length ? { tier: owned + 1, at: spec[owned][0], metal: spec[owned][1], xp: spec[owned][2] } : null }, o, { spec: undefined });
}
const habitSpec = xp => HABIT_STEPS.map((s, i) => [s[0], s[1], xp[i], s[2]]);
const ach = o => Object.assign({ meaning: 'consistency', size: 'highlight', xp: 100, caption: '', rule: '', free: false, origin: 'new', retired: false,
  title: null, day: null, how: null }, o);
function shelf(o = {}) {
  return {
    badges: [
      badge({ id: 'held_weeks', name: 'Hold Serve', caption: '9 weeks held in a row. You keep showing up.', n: 9, now: 3, owned: 2,
        spec: [[4, 'bronze', 200], [8, 'silver', 400], [12, 'emerald', 600], [24, 'amethyst', 1200], [52, 'prismatic', 2500]] }),
      badge({ id: 'long_count', name: 'The Long Count', caption: '9 weeks held in all.', n: 9, owned: 0, spec: [[10, 'bronze', 200], [25, 'silver', 400], [50, 'emerald', 800]] }),
      badge({ id: 'clean_sweeps', name: 'Treble', free: true, caption: '0 weeks in a row with every mission done.', n: 0, owned: 0, spec: [[2, 'bronze', 100], [4, 'silver', 200], [8, 'emerald', 400]] }),
      badge({ id: 'day_streak', name: 'Day Streak', free: true, origin: 'proof', kind: 'proof', caption: '3 days on target in a row.', n: 3, owned: 1,
        spec: [[3, 'bronze', 0], [7, 'bronze', 0], [14, 'silver', 0]] }),
      badge({ id: 'habit_water', name: 'HUMAN SPRINKLER', habit: 'water', free: true, caption: '12 days in a row on full water.', n: 12, owned: 2, spec: habitSpec([20, 40, 70, 110, 220]) }),
      badge({ id: 'habit_sleep', name: 'BLACKOUT ARTIST', habit: 'sleep', free: true, caption: '2 days in a row on your sleep target.', n: 2, owned: 0, spec: habitSpec([30, 60, 120, 180, 360]) }),
      badge({ id: 'habit_custom', name: 'HOUSE RULES', habit: 'custom', free: true, caption: '3 days in a row on a habit of your own.', n: 3, owned: 0, spec: habitSpec([20, 30, 60, 90, 180]) }),
      badge({ id: 'century', name: 'Century', meaning: 'commitment', caption: '104 sessions with Amir.', n: 104, owned: 3,
        spec: [[25, 'bronze', 300], [50, 'silver', 600], [100, 'emerald', 1500], [200, 'amethyst', 3000], [500, 'prismatic', 6000]] }),
      badge({ id: 'full_log', name: 'Paper Trail', meaning: 'commitment', caption: '9 sessions with every set logged.', n: 9, owned: o.paperTrail || 0,
        spec: [[10, 'bronze', 100], [25, 'silver', 200], [50, 'emerald', 400]] }),
      badge({ id: 'bests', name: 'Record Breaker', meaning: 'progress', kind: 'total', caption: '6 personal bests. You are getting better.', n: 6, owned: 1,
        spec: [[5, 'bronze', 200], [10, 'silver', 400], [25, 'emerald', 800]] }),
      badge({ id: 'comebacks', name: 'HARD TO KILL', meaning: 'resilience', kind: 'total', free: true, caption: '1 comeback that stuck.', n: 1, owned: 0,
        spec: [[3, 'bronze', 300], [5, 'silver', 600], [10, 'emerald', 1200]] }),
      // retired, owned: the old marks
      badge({ id: 'human_sprinkler', name: 'HUMAN SPRINKLER', free: true, origin: 'proof', kind: 'proof', retired: true, superseded_by: 'habit_water', caption: '20 days in a row on full water.',
        n: 12, owned: 1, how: 'baseline', spec: [[5, 'bronze', 100], [20, 'silver', 250], [60, 'emerald', 600]] }),
      badge({ id: 'heavy_metal', name: 'HEAVY METAL', origin: 'proof', kind: 'proof', meaning: 'commitment', retired: true, superseded_by: 'held_weeks',
        caption: '12 days in a row with a session.', n: 12, owned: 2, how: 'baseline', spec: [[3, 'bronze', 120], [12, 'silver', 150], [30, 'emerald', 350]] }),
      badge({ id: 'habit_tiers', name: 'Consistency Tiers', free: true, origin: 'proof', kind: 'per_habit_best_run', retired: true, sub: 'water',
        superseded_by: ['habit_water', 'habit_sleep'], caption: '12 days in a row on one habit.', n: 12, owned: 2, how: 'baseline', spec: habitSpec([20, 40, 70, 110, 220]) })
    ],
    achievements: [
      ach({ id: 'held', name: 'Held', size: 'highlight', xp: 100, rule: 'The first week held.', caption: 'Your first held week. Every session, on your days.', day: at(-30), how: 'baseline' }),
      ach({ id: 'full_stack', name: 'Full Stack', free: true, size: 'highlight', xp: 200, rule: 'Steps, sleep, fuel and water each on a 7-day streak at the same time.', caption: 'Four habits, seven days each, all at once.' }),
      ach({ id: 'first_cycle', name: 'First Cycle', meaning: 'commitment', size: 'milestone', xp: 300, rule: 'The first cycle finished.', caption: 'A whole cycle, finished.' }),
      ach({ id: 'the_distance', name: 'The Distance', meaning: 'commitment', size: 'legend', xp: 0, rule: 'The whole roadmap finished.', caption: 'Every cycle of the roadmap, finished.' }),
      ach({ id: 'first_best', name: 'First Best', meaning: 'progress', size: 'highlight', xp: 100, rule: 'The first personal best.', caption: 'Your first personal best. Not the last.', day: at(-25), how: 'earned' }),
      ach({ id: 'all_court', name: 'All-Court', meaning: 'progress', size: 'milestone', xp: 400, rule: 'A personal best in each main movement pattern in one cycle.', caption: 'Stronger everywhere, in one cycle.' }),
      ach({ id: 'kept_going', name: 'Played Through', meaning: 'resilience', size: 'milestone', xp: 300, rule: 'A cycle finished with at least one broken week in it.', caption: 'A week went wrong. You finished the cycle anyway.' }),
      ach({ id: 'backbone', name: 'BACKBONE', meaning: 'resilience', free: true, origin: 'proof', size: 'milestone', xp: 0, rule: '2 comebacks that held a week.', caption: 'Fell off. Came back. Did it again.', title: 'unbowed' }),
      ach({ id: 'the_machinist', name: 'THE MACHINIST', meaning: 'commitment', origin: 'proof', retired: true, size: 'milestone', xp: 750, rule: '150 days with a session done.', caption: '150 sessions. A year of turning up.', day: at(-40), how: 'baseline' })
    ],
    titles: o.titles || [{ id: 'century', name: 'CENTURY', meaning: 'commitment', metal: 'emerald', from: 'Century, emerald: 100 sessions with Amir', day: at(-10) }],
    grand_slam: o.grand_slam || { consistency: null, commitment: 'century', progress: null, resilience: null, done: null }
  };
}
const MOMENTS = [
  { key: 'badge:century::3', kind: 'badge', id: 'century', tier: 3, name: 'Century', meaning: 'commitment', metal: 'emerald', size: 'milestone', xp: 1500, day: at(-1), caption: '100 sessions with Amir.', title: 'century', app: 'training' },
  { key: 'title:century::0', kind: 'title', id: 'century', tier: 0, name: 'CENTURY', meaning: 'commitment', metal: 'emerald', size: 'milestone', xp: 0, day: at(-1), caption: 'Century, emerald: 100 sessions with Amir', title: null, app: 'training' },
  { key: 'achievement:full_stack::0', kind: 'achievement', id: 'full_stack', tier: 0, name: 'Full Stack', meaning: 'consistency', metal: null, size: 'highlight', xp: 200, day: at(-1), caption: 'Four habits, seven days each, all at once.', title: null, app: 'habits' },
  { key: 'badge:full_log::1', kind: 'badge', id: 'full_log', tier: 1, name: 'Paper Trail', meaning: 'commitment', metal: 'bronze', size: 'win', xp: 100, day: at(-1), caption: '10 sessions with every set logged.', title: null, app: 'training' }
];
const REVEAL = { badges: 15, steps: 50, achievements: 7, titles: 1, xp: 7155, since: '2026-06-11' };
function profile(xp, o = {}) {
  const cat = o.cat === undefined ? CAT_DAY : o.cat;
  return { athlete_id: H.ID, ready: true, shadow: false, switch: { xp: XP_DAY, catalogue: cat }, rules_version: cat ? 4 : 3,
    career: Object.assign({ xp, habits: {}, facts: {}, facts_xp: 0, awards_xp: cat ? 7155 : 0 }, lvl(xp)),
    season: { name: 'Season 1', starts_on: at(-2), points: 1234 }, week: { from: at(-6), points: 900 },
    since: '2026-06-06', kept: null,
    numbers: { weeks_held: { now: 3, best: 9 }, sessions_with_amir: 104, personal_bests: 6, comebacks: 2, days_on_target: 41, perfect_days: 11 },
    titles_owned: [], rules: { version: 3, level: LEVEL, season: { title_points: 2000 }, prices: { session_finished: 400, session_finished_early: 200, full_log: 50, checkin_done: 20, week_held: 400 } },
    badges: [], achievements: [], missions: [], quest: null,
    moments: o.moments || [], reveal: o.reveal === undefined ? null : o.reveal,
    shelf: o.shelf === undefined ? (cat ? shelf(o.shelfOpts) : undefined) : o.shelf };
}

// The log: 12 days of full water, 70 days of sessions, two habits of the athlete's own (A: 6 days, B: 10 days), all ending yesterday.
const CUSTOM = [{ id: 'c_read_1', name: 'READ', goal: 'Read' }, { id: 'c_walk_2', name: 'WALK', goal: 'Walk' }];
function bigLog() {
  const log = {};
  for (let i = 1; i <= 70; i++) log[H.past(i)] = { strength: 1 };
  for (let i = 1; i <= 12; i++) log[H.past(i)].water = 8;
  for (let i = 7; i <= 12; i++) log[H.past(i)].c_read_1 = 1;
  for (let i = 3; i <= 12; i++) log[H.past(i)].c_walk_2 = 1;
  return log;
}
const cfgFor = (extra) => Object.assign({ careerSeen: XP_DAY }, extra || {});
const customCfg = { custom: CUSTOM, on: { strength: true, steps: true, sleep: true, fuel: true, water: true, mobility: false, breathe: false, supps: false, c_read_1: true, c_walk_2: true } };

const calls = (p, name) => p.evaluate(n => (window.__STUB.calls || []).filter(c => c === n).length, name);
const toldCalls = p => p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'career_told').map(x => x[1].p_keys));
const T = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
async function openCat(browser, o = {}) {
  const stub = Object.assign({ profile: o.profile || profile(10000), tables: o.tables || {} }, o.stub || {});
  const r = await H.openProof(browser, Object.assign({ w: o.w || 390, h: 844, tz: 'UTC', seed: o.seed || {}, cfg: o.cfg || cfgFor(), stub, url: o.url, prog: o.prog }, o.opts || {}));
  if (o.wait !== false) await r.p.waitForFunction(() => typeof catalogueOn === 'function' && catalogueOn(), null, { timeout: 8000 }).catch(() => {});
  await r.p.waitForTimeout(o.settle == null ? 500 : o.settle);
  return r;
}
const toProgress = async p => { await p.evaluate(() => { UI.celebrate = []; go('progress'); }); await p.waitForTimeout(250); };

function hslOf(css) {
  const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(css);
  if (!m) return null;
  const r = +m[1] / 255, g = +m[2] / 255, b = +m[3] / 255, max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  if (!d) return [0, 0, l];
  const hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(hue * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1)), l];
}

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const LOG = bigLog();
  try {

  // ── 1. INERT: the switch off (or a rulebook from before it), even with a stray shelf, moments and reveal in the profile ───────────────
  for (const [name, cat] of [['null', null], ['"off"', 'off']]) {
    const prof = profile(10000, { cat: null, shelf: shelf(), moments: MOMENTS, reveal: REVEAL });
    prof.switch.catalogue = cat;
    const { ctx, p } = await openCat(browser, { profile: prof, wait: false, seed: { _hab_log: LOG }, cfg: cfgFor(customCfg), settle: 1200 });
    await toProgress(p);
    const s = await p.evaluate(() => ({ on: catalogueOn(), room: !!document.querySelector('[data-k="trophyroom"]'), shelf: !!document.querySelector('[data-k="msall"]'),
      earnedTile: [...document.querySelectorAll('.statgrid .eyebrow')].map(e => e.textContent.trim()).join('|'),
      seen: CFG.catalogueSeen, queue: UI.celebrate.map(e => e.kind || 'level'), wins: (CFG.wins || []).length,
      detail: (() => { const d = document.createElement('div'); d.innerHTML = renderDetail(habitById('water')); return d.textContent.replace(/\s+/g, ' '); })(),
      manual: (() => { const d = document.createElement('div'); d.innerHTML = renderManual(); return d.textContent.replace(/\s+/g, ' '); })(),
      ev: bonusEvents().filter(e => e.kind === 'tier' && e.id === 'strength').length, hs: milestonePaid('HS'), ts: milestonePaid('TS'), c: bonusEvents().filter(e => e.kind === 'tier' && /^c_/.test(e.id)).length }));
    C.check(`inert (switch.catalogue ${name}): catalogueOn() is false, no Trophy Room, the milestone shelf is there`, !s.on && !s.room && s.shelf, JSON.stringify(s));
    C.check(`inert (${name}): the tile says Milestones, no reveal, no moments, nothing waiting`, /Milestones/.test(s.earnedTile) && !/Trophies/.test(s.earnedTile) && s.seen === null && s.queue.length === 0 && s.wins === 0, JSON.stringify({ t: s.earnedTile, seen: s.seen, q: s.queue, w: s.wins }));
    C.check(`inert (${name}): a habit's page keeps Consistency and the five tiers; the manual has no Trophy Room`, /Consistency/.test(s.detail) && !/Badge ·/.test(s.detail) && !/Trophy Room/.test(s.manual), s.detail.slice(0, 160));
    C.check(`inert (${name}): the scorer pays as before: WORKOUT steps, one tier per habit of your own, HUMAN SPRINKLER and HEAVY METAL`, s.ev === 5 && s.hs === 100 && s.ts === 120 && s.c === 3, JSON.stringify({ ev: s.ev, hs: s.hs, ts: s.ts, c: s.c }));
    C.check(`inert (${name}): career_told and career_catalogue are never asked for`, (await toldCalls(p)).length === 0 && await calls(p, 'from:career_catalogue') === 0);
    C.check(`inert (${name}): no page errors`, p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 2. THE TROPHY ROOM from a stub shelf ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await openCat(browser, { profile: profile(10000, { shelf: shelf() }), seed: { _hab_log: LOG }, cfg: cfgFor(customCfg) });
    await toProgress(p);
    const r = await p.evaluate(() => {
      const room = document.querySelector('[data-k="trophyroom"]');
      const txt = e => e ? e.innerHTML.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() : null;
      const row = k => document.querySelector(`[data-k="${k}"]`);
      return { room: !!room, oldShelf: !!document.querySelector('[data-k="msall"]') || !!document.querySelector('[data-k="msearned"]'),
        nums: [...room.querySelectorAll('[data-k="trnums"] > div')].map(txt),
        slots: [...room.querySelectorAll('.tr-slot')].map(txt),
        heads: [...room.querySelectorAll('.sectlbl')].map(txt),
        sprinkler: txt(row('tb:habit_water:')), paper: txt(row('tb:full_log:')), held: txt(row('ta:held')),
        hold: txt(row('tb:held_weeks:')),
        titles: [...room.querySelectorAll('.tr-titles')].map(txt), retiredRows: [...room.querySelectorAll('[data-k^="tb:"],[data-k^="ta:"]')].map(e => e.dataset.k),
        tile: txt(document.querySelector('.statgrid:not([data-k="trnums"]) > div:nth-child(2)')),
        pips: (() => { const e = row('tb:habit_water:'); return e ? [...e.querySelectorAll('.tr-steps i')].map(i => i.classList.contains('on')) : null; })() };
    });
    C.check('shelf: the Trophy Room replaces the milestone shelf', r.room && !r.oldShelf);
    C.check('shelf: the four numbers (weeks held with its best, sessions with Amir, personal bests, comebacks)',
      JSON.stringify(r.nums) === JSON.stringify(['3 Weeks held · best 9', '104 Sessions with Amir', '6 Personal bests', '2 Comebacks']), JSON.stringify(r.nums));
    C.check('shelf: Grand Slam, four slots, CENTURY in Commitment', r.slots.length === 4 && /^Commitment CENTURY$/.test(r.slots[1]) && /^Consistency Open$/.test(r.slots[0]), JSON.stringify(r.slots));
    C.check('shelf: Grand Slam is headed "1 of 4" and the four shelves are in Amir\'s order',
      r.heads.some(h => /^Grand Slam 1 of 4$/.test(h)) && JSON.stringify(r.heads.filter(h => /^(Consistency|Commitment|Progress|Resilience) /.test(h)).map(h => h.split(' ')[0])) === '["Consistency","Commitment","Progress","Resilience"]', JSON.stringify(r.heads));
    C.check('shelf: an owned habit badge shows its name, its step and the next ("HUMAN SPRINKLER STEADY", "Next: LOCKED IN", "12 of 20")',
      r.sprinkler && /HUMAN SPRINKLER STEADY 12 days in a row on full water\. Next: LOCKED IN · \+70 XP 12 of 20$/.test(r.sprinkler), r.sprinkler);
    C.check('shelf: its steps are drawn, two owned of five', JSON.stringify(r.pips) === '[true,true,false,false,false]', JSON.stringify(r.pips));
    C.check('shelf: a badge not yet started says how far it is ("Paper Trail 9 of 10")', r.paper && /Paper Trail 9 sessions with every set logged\./.test(r.paper) && /9 of 10$/.test(r.paper) && /Next: Paper Trail I · \+100 XP/.test(r.paper), r.paper);
    C.check('shelf: an owned achievement shows its caption, its XP and its day',
      r.held && /Held Your first held week\. Every session, on your days\. \+100 XP \d+ \w+$/.test(r.held), r.held);
    C.check('shelf: the title won is a plate on its shelf', r.titles.length === 1 && /CENTURY/.test(r.titles[0]), JSON.stringify(r.titles));
    C.check('shelf: the Progress tile says Trophies and counts what is owned: 5 badges, 2 achievements and the 3 retired marks, of 22', /^10 \/22 Trophies$/.test(r.tile || ''), r.tile);
    C.check('shelf: the retired group is folded, and its rows are not on the page until it is opened',
      !r.retiredRows.includes('tb:human_sprinkler:') && !r.retiredRows.includes('tb:heavy_metal:'), JSON.stringify(r.retiredRows));
    await p.evaluate(() => document.querySelector('[data-k="mstoggle:tr_retired"]').click());
    await p.waitForTimeout(250);
    const open = await p.evaluate(() => ({ rows: [...document.querySelectorAll('[data-k^="tb:"],[data-k^="ta:"]')].map(e => e.dataset.k),
      head: document.querySelector('[data-k="mstoggle:tr_retired"]').innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }));
    C.check('shelf: opened, "Retired, still yours" holds the old marks (HUMAN SPRINKLER, HEAVY METAL, THE MACHINIST) and not the per-habit ladder',
      /^Retired, still yours 3$/.test(open.head) && open.rows.includes('tb:human_sprinkler:') && open.rows.includes('tb:heavy_metal:') && open.rows.includes('ta:the_machinist') && !open.rows.some(k => /habit_tiers/.test(k)), JSON.stringify(open));
    // a shelf folds to the owned and the next three, and opens
    const fold1 = await p.evaluate(() => ({ btn: (document.querySelector('[data-k="trall:consistency"]') || {}).textContent.replace(/\s+/g, ' ').trim(), rows: document.querySelectorAll('[data-k^="tb:"],[data-k^="ta:"]').length, other: !!document.querySelector('[data-k="trall:commitment"]') }));
    await p.evaluate(() => document.querySelector('[data-k="trall:consistency"]').click());
    await p.waitForTimeout(250);
    const fold2 = await p.evaluate(() => ({ btn: (document.querySelector('[data-k="trall:consistency"]') || {}).textContent.replace(/\s+/g, ' ').trim(), rows: document.querySelectorAll('[data-k^="tb:"],[data-k^="ta:"]').length }));
    C.check('shelf: a shelf shows what is owned and the next three; "Show all 9" opens the rest (and only where more than three are locked)',
      /^Show all 9/.test(fold1.btn || '') && fold1.other === false && /^Show fewer/.test(fold2.btn) && fold2.rows === fold1.rows + 2, JSON.stringify({ fold1, fold2 }));
    const stack = await p.evaluate(() => { const e = document.querySelector('[data-k="ta:full_stack"]'); return e ? { text: e.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), cls: e.className } : null; });
    C.check('shelf: a locked achievement is greyed and shows its rule and "LOCKED"',
      stack && /Full Stack Steps, sleep, fuel and water each on a 7-day streak at the same time\. \+200 XP LOCKED$/.test(stack.text) && /\block\b/.test(stack.cls), JSON.stringify(stack));
    // text size, colour, no sideways overflow
    const look = await p.evaluate(() => {
      const room = document.querySelector('[data-k="trophyroom"]'), small = [], gold = [];
      const hue = css => { const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/.exec(css); if (!m || (m[4] !== undefined && +m[4] === 0)) return null;
        const r = +m[1] / 255, g = +m[2] / 255, b = +m[3] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2; if (!d) return null;
        const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1)), l]; };
      room.querySelectorAll('*').forEach(e => {
        const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        const cs = getComputedStyle(e);
        if (own && parseFloat(cs.fontSize) < 12) small.push(e.className + ':' + cs.fontSize + ':' + e.textContent.trim().slice(0, 20));
        ['color', 'backgroundColor', 'borderTopColor'].forEach(k => { const x = hue(cs[k]); if (x && x[0] >= 33 && x[0] <= 70 && x[1] > 0.30 && x[2] >= 0.20 && x[2] <= 0.85) gold.push(e.className + ' ' + k + ' ' + cs[k]); });
      });
      return { small, gold, sideways: document.documentElement.scrollWidth > innerWidth };
    });
    C.check('shelf: no text under 12 px, no yellow, gold, ochre or amber, no sideways scroll', look.small.length === 0 && look.gold.length === 0 && !look.sideways, JSON.stringify(look).slice(0, 400));
    C.check('shelf: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 320 px
  {
    const { ctx, p } = await openCat(browser, { w: 320, profile: profile(10000, { shelf: shelf() }), seed: { _hab_log: LOG } });
    await toProgress(p);
    await p.evaluate(() => { document.querySelector('[data-k="mstoggle:tr_retired"]').click(); ['consistency', 'commitment', 'progress', 'resilience'].forEach(k => { (CFG.msOpen || (CFG.msOpen = {}))['tr_' + k] = true; }); render(); });
    await p.waitForTimeout(250);
    const fit = await p.evaluate(() => {
      const bad = [...document.querySelectorAll('[data-k="trophyroom"] *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 || e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map(e => e.className + ':' + Math.round(e.getBoundingClientRect().right)).slice(0, 5);
      return { bad, sideways: document.documentElement.scrollWidth > innerWidth, rows: document.querySelectorAll('[data-k^="tb:"],[data-k^="ta:"]').length };
    });
    C.check('320 px: every shelf and the retired group open, nothing runs past the edge, no sideways scroll', fit.bad.length === 0 && !fit.sideways && fit.rows > 15, JSON.stringify(fit));
    await ctx.close();
  }

  // ── 3. A FREE ATHLETE: the Progress shelf locked ───────────────────────────────────────────────────────────────────────────────────────
  {
    const prog = H.fixture(); prog.athlete.tier = 'free';
    const { ctx, p } = await openCat(browser, { prog, profile: profile(3000, { shelf: shelf() }), seed: { _hab_log: LOG } });
    await toProgress(p);
    await p.evaluate(() => { ['consistency', 'commitment', 'progress', 'resilience'].forEach(k => { (CFG.msOpen || (CFG.msOpen = {}))['tr_' + k] = true; }); render(); });
    await p.waitForTimeout(200);
    const r = await p.evaluate(() => {
      const room = document.querySelector('[data-k="trophyroom"]'), txt = e => e ? e.innerHTML.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() : null;
      return { free: isFree(), lock: txt(document.querySelector('[data-k="trlock"]')), nums: [...room.querySelectorAll('[data-k="trnums"] > div')].map(txt),
        keys: [...room.querySelectorAll('[data-k^="tb:"],[data-k^="ta:"]')].map(e => e.dataset.k), slots: [...room.querySelectorAll('.tr-slot')].map(txt) };
    });
    C.check('free: the Progress shelf is locked with the pitch for coaching', r.free && r.lock === 'Coached athletes earn these from their programme.', JSON.stringify(r.lock));
    C.check('free: their four numbers are days on target, perfect days, comebacks and badges', JSON.stringify(r.nums.map(n => n.replace(/^\d+ /, ''))) === '["Days on target","Perfect days","Comebacks","Badges"]' && /^41 /.test(r.nums[0]) && /^11 /.test(r.nums[1]), JSON.stringify(r.nums));
    C.check('free: only what they can earn is listed (nothing coached: no Hold Serve, no Century, no Record Breaker, no First Best)',
      !r.keys.includes('tb:held_weeks:') && !r.keys.includes('tb:century:') && !r.keys.includes('tb:bests:') && !r.keys.includes('ta:first_best') && r.keys.includes('tb:habit_water:') && r.keys.includes('ta:full_stack'), JSON.stringify(r.keys));
    C.check('free: the Progress slot of the Grand Slam says coached athletes', /^Progress Coached athletes$/.test(r.slots[2]), JSON.stringify(r.slots));
    C.check('free: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 4. THE REVEAL: one moment, told once, no flood; and the careerXp that does not jump ───────────────────────────────────────────────────
  {
    const prof = profile(10000, { reveal: REVEAL, shelf: shelf() });
    const { ctx, p } = await openCat(browser, { profile: prof, seed: { _hab_log: LOG }, cfg: cfgFor(customCfg) });
    const r = await p.evaluate(() => {
      const w = document.querySelector('.lvwrap[data-k^="cel:catalogue:"]');
      return { reveal: w ? { kicker: w.querySelector('.lvkicker').textContent.trim(), n: w.querySelector('.lvbadge .n').textContent.trim(), l: w.querySelector('.lvbadge .l').textContent.trim(),
        head: w.querySelector('.lvrank').textContent.trim(), sub: w.querySelector('.lvsub').textContent.trim() } : null,
        queue: UI.celebrate.map(e => e.kind || (e.overall ? 'level' : 'habit')), toast: UI.toast, seen: CFG.catalogueSeen, wins: (CFG.wins || []).length };
    });
    C.check('reveal: ONE moment, "Your Trophy Room is open", the badges and achievements already yours', r.reveal && r.reveal.kicker === 'Your Trophy Room is open' && r.reveal.head === '15 badges and 7 achievements' && r.reveal.n === '15' && r.reveal.l === 'BADGES', JSON.stringify(r.reveal));
    C.check('reveal: since the day the first log, the steps, the title and the XP, all in plain words',
      r.reveal && r.reveal.sub === 'Already yours, from everything you have logged since 11 June. Your badges hold 50 steps between them. 1 title is yours too. Together they paid 7,155 XP, and it is already in your level.', r.reveal && r.reveal.sub);
    C.check('reveal: no em-dash, no semicolon, no flood of level-ups, tiers or milestones behind it, and no "XP system updated" toast',
      r.reveal && !/[—;]/.test(r.reveal.sub + r.reveal.head) && JSON.stringify(r.queue) === '["catalogue"]' && !r.toast && r.wins === 0, JSON.stringify({ q: r.queue, toast: r.toast, wins: r.wins }));
    C.check('reveal: the switch\'s day is kept, so it never comes back', r.seen === CAT_DAY, r.seen);
    C.check('reveal: career_told is not called until it is shown and dismissed', (await toldCalls(p)).length === 0);
    await p.evaluate(() => dismissCelebration());
    await p.waitForTimeout(500);
    const told = await toldCalls(p);
    C.check('reveal: dismissed, career_told([\'reveal\']) is called, once', JSON.stringify(told) === '[["reveal"]]', JSON.stringify(told));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1600);
    const again = await p.evaluate(() => ({ q: UI.celebrate.map(e => e.kind), toast: UI.toast }));
    C.check('reveal: the same phone, opened again: no reveal', again.q.length === 0 && !again.toast, JSON.stringify(again));
    C.check('reveal: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
    const other = await openCat(browser, { profile: prof, seed: { _hab_log: LOG }, cfg: cfgFor({ catalogueSeen: CAT_DAY }) });
    C.check('reveal: another phone (the config came through the cloud with the day set): no reveal, and the re-baseline is silent (no "XP system updated" toast)', await other.p.evaluate(() => UI.celebrate.length) === 0 && await other.p.evaluate(() => UI.toast) === null);
    await other.ctx.close();
    // the athlete whose first open comes after BOTH switches: the career's reveal first, then the Trophy Room's
    const both = await openCat(browser, { profile: prof, seed: { _hab_log: LOG }, cfg: { updatedAt: Date.now(), onboarded: true, toured: true, installAsked: true, boardSwept: true }, settle: 800 });
    C.check('reveal: first open after both switches: the career\'s reveal first, then the Trophy Room\'s', JSON.stringify(await both.p.evaluate(() => UI.celebrate.map(e => e.kind))) === '["career","catalogue"]');
    await both.ctx.close();
    // nobody to reveal to (nothing was already theirs): the day is kept, no moment
    const none = await openCat(browser, { profile: profile(300, { reveal: null, shelf: shelf() }), seed: { _hab_log: LOG } });
    C.check('reveal: nothing to reveal: no moment, the day is kept', await none.p.evaluate(() => UI.celebrate.length) === 0 && await none.p.evaluate(() => CFG.catalogueSeen) === CAT_DAY);
    await none.ctx.close();
  }
  // "Open it" goes to the Trophy Room
  {
    const { ctx, p } = await openCat(browser, { profile: profile(10000, { reveal: REVEAL, shelf: shelf() }), seed: { _hab_log: LOG } });
    await p.evaluate(() => document.querySelector('.lvwrap[data-k^="cel:catalogue:"] .lvshare').click());
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ screen: UI.screen, room: !!document.querySelector('[data-k="trophyroom"]'), q: UI.celebrate.length }));
    C.check('reveal: "Open it" opens Progress at the Trophy Room and tells the server', r.screen === 'progress' && r.room && r.q === 0 && JSON.stringify(await toldCalls(p)) === '[["reveal"]]', JSON.stringify(r));
    await ctx.close();
  }
  // careerXp() does not jump at the fetch that first sees the switch (the base is counted with the new definition)
  {
    const { ctx, p } = await openCat(browser, { profile: profile(10000, { cat: null }), wait: false, seed: { _hab_log: LOG }, cfg: cfgFor(customCfg), settle: 1200 });
    const before = await p.evaluate(() => ({ on: catalogueOn(), xp: careerXp(), phone: phoneXp(), base: CAREER.base }));
    await p.evaluate(xp => { window.__STUB.profile = xp; }, profile(10000 + 7155, { reveal: REVEAL, shelf: shelf() }));
    const after = await p.evaluate(async () => { await fetchCareer(); return { on: catalogueOn(), xp: careerXp(), phone: phoneXp(), base: CAREER.base }; });
    C.check('switch: before it the preview is the server\'s number plus nothing', !before.on && before.xp === 10000, JSON.stringify(before));
    C.check('switch: the fetch that first sees it counts the base with the new scorer, so careerXp() is the server\'s number exactly',
      after.on && after.xp === 17155 && after.base === after.phone && after.phone !== before.phone, JSON.stringify({ before, after }));
    await p.waitForTimeout(300);
    C.check('switch: that fetch re-baselined in silence: the one reveal and nothing else', JSON.stringify(await p.evaluate(() => UI.celebrate.map(e => e.kind))) === '["catalogue"]');
    await ctx.close();
  }

  // ── 5. MOMENTS: each once at its size, told when shown ─────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await openCat(browser, { profile: profile(10000, { shelf: shelf({ paperTrail: 1 }), moments: MOMENTS }), seed: { _hab_log: LOG }, cfg: cfgFor({ catalogueSeen: CAT_DAY }) });
    const r = await p.evaluate(() => ({ queue: UI.celebrate.map(e => e.kind + ':' + e.id), wins: (CFG.wins || []).map(w => w.k + ':' + w.id) }));
    C.check('moments: a milestone badge and a title are takeovers, in the server\'s order', JSON.stringify(r.queue) === '["moment:badge:century::3","reward:c_century"]', JSON.stringify(r.queue));
    C.check('moments: a highlight and a win go to the wins card', JSON.stringify(r.wins) === '["moment:achievement:full_stack::0","moment:badge:full_log::1"]', JSON.stringify(r.wins));
    // the wins card keeps them until tapped, and they are told at once (they are on the card)
    const told0 = await toldCalls(p);
    C.check('moments: the two on the wins card are told as soon as they are there; the takeovers are not told yet',
      JSON.stringify(told0) === '[["achievement:full_stack::0","badge:full_log::1"]]', JSON.stringify(told0));
    const t1 = await p.evaluate(() => { const w = document.querySelector('.lvwrap[data-k^="cel:moment:"]'); return w ? { kicker: w.querySelector('.lvkicker').textContent.trim(), title: w.querySelector('.lvrank').textContent.trim(),
      sub: w.querySelector('.lvsub').textContent.trim(), xp: (w.querySelector('.lvxp') || {}).textContent, cls: w.className, more: (w.querySelector('.lvqueue') || {}).textContent } : null; });
    C.check('moments: the badge takeover names the step, the metal, what it paid and what is behind it',
      t1 && t1.kicker === 'Badge · Emerald' && t1.title === 'Century III' && t1.sub === '100 sessions with Amir.' && t1.xp === '+1,500 XP banked' && t1.more === '1 more to go', JSON.stringify(t1));
    await p.evaluate(() => dismissCelebration());
    await p.waitForTimeout(400);
    const told1 = await toldCalls(p);
    C.check('moments: dismissed, the badge is told (and only then)', JSON.stringify(told1[told1.length - 1]) === '["badge:century::3"]', JSON.stringify(told1));
    const t2 = await p.evaluate(() => { const w = document.querySelector('.lvwrap[data-k^="cel:reward:"]'); return w ? { kicker: w.querySelector('.lvkicker').textContent.trim(), title: w.querySelector('.lvrank').textContent.trim(), sub: w.querySelector('.lvsub').textContent.trim() } : null; });
    C.check('moments: the title takeover shows the plate\'s name and says it is yours, wearable in the Locker', t2 && t2.title === 'CENTURY' && /Century, emerald: 100 sessions with Amir\./.test(t2.sub) && /Wear it from your Locker/.test(t2.sub), JSON.stringify(t2));
    C.check('moments: the title is owned now (c_century), and not worn until the athlete does', await p.evaluate(() => passHas('c_century') && CFG.pass.owned.includes('c_century') && CFG.pass.title !== 'c_century'));
    await p.evaluate(() => document.querySelector('.lvwrap[data-k^="cel:reward:"] .lvshare').click());
    await p.waitForTimeout(500);
    const sh = await p.evaluate(() => ({ kind: UI.share && UI.share.kind, subj: UI.share && UI.share.subj }));
    const told2 = await toldCalls(p);
    C.check('moments: the title\'s Share it opens the Title card for c_century, and the title is told', sh.kind === 'title' && sh.subj.title.id === 'c_century' && JSON.stringify(told2[told2.length - 1]) === '["title:century::0"]', JSON.stringify({ sh, told2 }));
    await p.evaluate(() => closeShare());
    await p.waitForTimeout(300);
    // the wins card
    const wins = await p.evaluate(() => { const w = document.querySelector('.wins'); return w ? { text: w.innerText.replace(/\s+/g, ' ').trim(), share: !!w.querySelector('.wins-share') } : null; });
    C.check('moments: the wins card lists the win and the highlight with their XP, and offers Share it', wins && /Paper Trail I/.test(wins.text) && /Full Stack/.test(wins.text) && /\+300 XP/.test(wins.text) && wins.share, JSON.stringify(wins));
    await p.evaluate(() => document.querySelector('.wins-share').click());
    await p.waitForTimeout(500);
    const ws = await p.evaluate(() => ({ kind: UI.share && UI.share.kind, subj: UI.share && UI.share.subj }));
    C.check('moments: the wins card\'s Share it opens the Milestone card for the highlight (the achievement), not for the win', ws.kind === 'medal' && ws.subj.medal && ws.subj.medal.k === 'achievement' && ws.subj.medal.id === 'full_stack', JSON.stringify(ws));
    C.check('moments: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    // shown once: the same profile again on this page does not show them again
    await p.evaluate(() => { closeShare(); UI.celebrate = []; });
    await p.evaluate(async () => { await fetchCareer(); });
    await p.waitForTimeout(300);
    C.check('moments: asked for again in the same session they are not shown again', await p.evaluate(() => UI.celebrate.length) === 0 && await p.evaluate(() => (CFG.wins || []).length) === 0);
    await ctx.close();
  }
  // a phone with no signal says what it showed later, and shows nothing twice meanwhile
  {
    const { ctx, p } = await openCat(browser, { profile: profile(10000, { shelf: shelf({ paperTrail: 1 }), moments: MOMENTS.slice(3) }), seed: { _hab_log: LOG }, cfg: cfgFor({ catalogueSeen: CAT_DAY }),
      stub: { refuse: ['career_told'] } });
    const q = await p.evaluate(() => JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_toldq') || '[]'));
    const synced = await p.evaluate(() => Object.keys(JSON.parse(JSON.stringify({ k: localStorage.getItem(K_CFG()) })) ).length && /toldq/.test(JSON.stringify(CFG)));
    C.check('moments: if career_told fails the key waits on this phone (and is never in the synced config)', JSON.stringify(q) === '["badge:full_log::1"]' && synced === false, JSON.stringify({ q, synced }));
    await p.evaluate(() => { window.__STUB.refuse = []; });
    await p.evaluate(async () => { await fetchCareer(); });
    await p.waitForTimeout(400);
    const after = await p.evaluate(() => ({ q: JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_toldq') || '[]'), wins: (CFG.wins || []).length }));
    C.check('moments: when the signal is back it is told, and the waiting key goes; the win was not added twice', after.q.length === 0 && after.wins === 1, JSON.stringify(after));
    await ctx.close();
  }
  // never in the demo or the coach's preview
  for (const [name, url] of [['demo', '/habits.html?client=demo'], ['coach preview', '/habits.html?client=rel01_athlete&preview=1']]) {
    const { ctx, p } = await openCat(browser, { url, wait: false, stub: { demo: H.fixture() }, profile: profile(10000, { reveal: REVEAL, shelf: shelf(), moments: MOMENTS }), seed: { _hab_log: LOG }, settle: 1500 });
    const r = await p.evaluate(() => ({ q: UI.celebrate.map(e => e.kind), wins: (CFG.wins || []).length }));
    C.check(`${name}: no reveal, no moment, career_told never called`, r.q.length === 0 && r.wins === 0 && (await toldCalls(p)).length === 0, JSON.stringify(r));
    C.check(`${name}: no page errors`, p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // the embedded strip never asks for the profile
  {
    const em = await openCat(browser, { url: '/habits.html?embed=1', wait: false, profile: profile(10000, { reveal: REVEAL, shelf: shelf(), moments: MOMENTS }), seed: { _hab_log: LOG }, settle: 1200 });
    C.check('embedded: get_profile and career_told are never asked', await calls(em.p, 'rpc:get_profile') === 0 && (await toldCalls(em.p)).length === 0);
    await em.ctx.close();
  }

  // ── 6. TITLES: a 'c_' id is named, worn and drawn ──────────────────────────────────────────────────────────────────────────────────────
  {
    const cat = [{ kind: 'title', id: 'clockwork', body: { name: 'CLOCKWORK', meaning: 'consistency', metal: 'prismatic', from: 'Hold Serve, prismatic: 52 weeks held in a row', origin: 'new' } }];
    const { ctx, p } = await openCat(browser, { profile: profile(10000, { shelf: shelf() }), tables: { career_catalogue: cat }, seed: { _hab_log: LOG }, cfg: cfgFor({ catalogueSeen: CAT_DAY, onBoard: true }) });
    const own = await p.evaluate(() => titleName('c_century'));
    const stranger0 = await p.evaluate(() => titleName('c_clockwork'));
    await p.waitForTimeout(500);
    const stranger1 = await p.evaluate(() => titleName('c_clockwork'));
    C.check('titles: your own c_ title is named from the shelf', own === 'CENTURY', own);
    C.check('titles: another athlete\'s is blank until one read of career_catalogue has come back, then named', stranger0 === '' && stranger1 === 'CLOCKWORK' && await calls(p, 'from:career_catalogue') === 1, JSON.stringify({ stranger0, stranger1, reads: await calls(p, 'from:career_catalogue') }));
    C.check('titles: an id nobody knows stays blank (and does not ask again at once)', await p.evaluate(() => titleName('c_nobody')) === '' && await calls(p, 'from:career_catalogue') === 1);
    // the Locker
    await p.evaluate(() => { UI.celebrate = []; go('pass'); });
    await p.waitForTimeout(250);
    const lock = await p.evaluate(() => ({ plate: !!document.querySelector('[data-k="rw:c_century"]'), lbl: (document.querySelector('.lo-rl') || {}).textContent }));
    C.check('titles: the Locker lists the title won, wearable', lock.plate, JSON.stringify(lock));
    await p.evaluate(() => document.querySelector('[data-k="rw:c_century"]').click());
    await p.waitForTimeout(500);
    const worn = await p.evaluate(() => ({ title: CFG.pass.title, sent: (window.__STUB.params || []).filter(x => x[0] === 'set_title').map(x => x[1].p_title) }));
    C.check('titles: wearing it sends set_title(c_century), the id the server mints', worn.title === 'c_century' && JSON.stringify(worn.sent) === '["c_century"]', JSON.stringify(worn));
    // the cards
    await p.evaluate(() => {
      window.__texts = [];
      const proto = CanvasRenderingContext2D.prototype, orig = proto.fillText;
      proto.fillText = function (t) { if (this.canvas && this.canvas.width >= 1000) window.__texts.push(String(t)); return orig.apply(this, arguments); };
    });
    const drawn = async (kind, subj) => p.evaluate(async ([kind, subj]) => { window.__texts = []; await buildShareCard(kind, 'post', subj); return window.__texts.slice(); }, [kind, subj]);
    const tc = await drawn('title', { id: 'c_century' });
    C.check('titles: the Title card draws CENTURY, what earned it and the meaning', tc.includes('CENTURY') && tc.includes('HOW YOU EARNED IT') && tc.some(t => /Century, emerald: 100 sessions with Amir/.test(t)) && tc.includes('TITLE · COMMITMENT'), tc.filter(t => t.length > 3).join(' / ').slice(0, 300));
    const mc = await drawn('medal', { k: 'badge', id: 'century', tier: 3 });
    C.check('titles: the Milestone card draws a badge step in Proof\'s look (name, metal, caption, XP)', mc.includes('CENTURY III') && mc.includes('BADGE · EMERALD') && mc.some(t => /104 sessions with Amir/.test(t)), mc.filter(t => t.length > 3).join(' / ').slice(0, 300));
    const ac = await drawn('medal', { k: 'achievement', id: 'held' });
    C.check('titles: and an achievement', ac.includes('HELD') && ac.includes('ACHIEVEMENT · SILVER'), ac.filter(t => t.length > 3).join(' / ').slice(0, 300));
    const tier = await drawn('medal', { k: 'tier', ti: 1, h: ['water'] });
    C.check('titles: a step cleared on the phone reads as the badge ("HUMAN SPRINKLER · STEADY")', tier.includes('HUMAN SPRINKLER · STEADY') && tier.includes('BADGE · STEP 2 OF 5'), tier.filter(t => t.length > 3).join(' / ').slice(0, 300));
    C.check('titles: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 7. THE SCORER after the switch ─────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await openCat(browser, { profile: profile(10000, { shelf: shelf() }), seed: { _hab_log: LOG }, cfg: cfgFor(Object.assign({ catalogueSeen: CAT_DAY }, customCfg)) });
    const r = await p.evaluate(() => {
      const ev = () => bonusEvents().map(e => e.kind + ':' + e.id + ':' + (e.tier == null ? '' : e.tier) + ':' + e.day + ':' + e.xp).sort();
      const on = ev();
      const stepsHelper = catalogueSteps(LOG, CFG).map(s => 'tier:' + s.habit + ':' + s.tier + ':' + s.day + ':' + s.xp).sort();
      const onTier = on.filter(e => /^tier:/.test(e));
      const kept = bonusEvents().filter(e => e.kind === 'milestone' && e.id === 'GO').map(e => e.xp);
      const retired = bonusEvents().filter(e => e.kind === 'milestone' && CATALOGUE_RETIRED.includes(e.id)).length;
      const onXp = phoneXp(), paid = ['HS', 'TS', 'HM'].map(milestonePaid);
      CAREER.p.switch.catalogue = null; invalidateBonus();
      const offEv = ev(), offXp = phoneXp(), offRetired = bonusEvents().filter(e => e.kind === 'milestone' && CATALOGUE_RETIRED.includes(e.id)).map(e => e.id).sort();
      const offKept = bonusEvents().filter(e => e.kind === 'milestone' && e.id === 'GO').map(e => e.xp);
      const offTier = offEv.filter(e => /^tier:/.test(e));
      CAREER.p.switch.catalogue = ymd0();
      function ymd0() { return new Date(Date.now() - 86400000).toISOString().slice(0, 10); }
      invalidateBonus();
      return { onTier, stepsHelper, kept, retired, onXp, offXp, offRetired, offKept, offTier, paid, d: { water: habitBadgeName(habitById('water')), custom: habitBadgeName(habitById('c_read_1')) } };
    });
    C.check('scorer: the badge steps are the same five days as the tiers (5, 10, 20, 30, 60) at the same XP: water crossed 5 and 10 days, 20 + 40', r.onTier.filter(e => /^tier:water:/.test(e)).map(e => e.split(':')[4]).join() === '20,40', JSON.stringify(r.onTier));
    C.check('scorer: WORKOUT pays no steps (seventy days of sessions, five off, none on)', !r.onTier.some(e => /^tier:strength:/.test(e)) && r.offTier.filter(e => /^tier:strength:/.test(e)).length === 5, JSON.stringify({ on: r.onTier.filter(e => /strength/.test(e)), off: r.offTier.filter(e => /strength/.test(e)).length }));
    C.check('scorer: the athlete\'s own habits share ONE ladder: step 1 on the earliest day any one reached it (20), step 2 on the day the longer run reached 10 (30), once each',
      r.onTier.filter(e => /^tier:custom:/.test(e)).length === 2 && r.onTier.filter(e => /^tier:custom:0:/.test(e)).map(e => e.split(':')[4]).join() === '20' && r.onTier.filter(e => /^tier:custom:1:/.test(e)).map(e => e.split(':')[4]).join() === '30', JSON.stringify(r.onTier.filter(e => /custom/.test(e))));
    C.check('scorer: before the switch each habit of your own pays its own ladder (20 + 20 + 30)', r.offTier.filter(e => /^tier:c_/.test(e)).length === 3, JSON.stringify(r.offTier.filter(e => /c_/.test(e))));
    C.check('scorer: catalogueSteps(log, cfg) is the pure helper: exactly the tier events', JSON.stringify(r.stepsHelper) === JSON.stringify(r.onTier), JSON.stringify({ h: r.stepsHelper.length, t: r.onTier.length }));
    C.check('scorer: retired marks pay nothing new (none on; HUMAN SPRINKLER, HEAVY METAL I and II off), kept marks pay as before (DAWN PATROL I, 40 both ways)',
      r.retired === 0 && r.offRetired.length >= 3 && r.paid.join() === '0,0,0' && r.kept.join() === '40' && r.offKept.join() === '40', JSON.stringify({ retired: r.retired, off: r.offRetired, paid: r.paid, kept: r.kept }));
    C.check('scorer: the same log is worth less on the phone after the switch (the preview differs, careerXp\'s base moves with it)', r.onXp < r.offXp, JSON.stringify({ on: r.onXp, off: r.offXp }));
    C.check('scorer: a habit\'s badge is named from the shelf, HOUSE RULES for all of your own', r.d.water === 'HUMAN SPRINKLER' && r.d.custom === 'HOUSE RULES', JSON.stringify(r.d));
    // local celebration: a step crossed on the phone is the badge, WORKOUT is silent, one badge for the athlete's own habits
    const local = seen => p.evaluate(seen => {
      CFG.seenTiers = {}; allHabits().forEach(h => { CFG.seenTiers[h.id] = seen[h.id] || 0; }); CFG.seenAch = currentAch(); CFG.seenQuests = currentQuests(); CFG.seenStreak = 99; CFG.seenComeback = TKEY(); CFG.seenPerfect = TKEY();
      CFG.wins = []; UI.celebrate = [];
      checkUnlocks();
      return (CFG.wins || []).map(winLine).filter(Boolean).map(l => l.title + ' | ' + l.sub + ' | ' + l.xp);
    }, seen);
    // WORKOUT crossed five steps too (seventy days) and says nothing; the water badge is named; two of your own habits are ONE badge
    const l1 = await local({ strength: 5, c_read_1: 1, c_walk_2: 2 });
    C.check('scorer: the phone\'s own celebration speaks the badge ("HUMAN SPRINKLER · STEADY", 10 days, +40) and says nothing for WORKOUT', JSON.stringify(l1) === '["HUMAN SPRINKLER · STEADY | 10 days of water in a row | 40"]', JSON.stringify(l1));
    const l2 = await local({ water: 2, strength: 5 });
    C.check('scorer: your own habits are one badge: two that crossed 5 and 10 days are one line, at the higher step ("HOUSE RULES · STEADY", +30)', JSON.stringify(l2) === '["HOUSE RULES · STEADY | 10 days of walk in a row | 30"]', JSON.stringify(l2));
    const l3 = await local({ strength: 5, water: 2, c_walk_2: 2 });
    C.check('scorer: a step another of your own habits already showed is not news again (read crossed 5 days, walk had shown 10: nothing)', JSON.stringify(l3) === '[]', JSON.stringify(l3));
    const l4 = await local({ strength: 5 });
    C.check('scorer: water and your own habits crossing the same step on one pass are one line, "STEADY · 2 badges"', JSON.stringify(l4) === '["STEADY · 2 badges | 10 days of water and walk in a row | 70"]', JSON.stringify(l4));
    // WORKOUT's habit page has no badge block; water's has the five steps and the next
    const pages = await p.evaluate(() => {
      const d = h => { const e = document.createElement('div'); e.innerHTML = renderDetail(h); return { text: e.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), pips: e.querySelectorAll('[data-k="dt-badge"] .pips i.on').length, block: !!e.querySelector('[data-k="dt-badge"]') }; };
      return { w: d(habitById('strength')), water: d(habitById('water')), custom: d(habitById('c_read_1')) };
    });
    C.check('habit page: WORKOUT shows no badge block', pages.w.block === false && !/Consistency/.test(pages.w.text), JSON.stringify(pages.w.text.slice(0, 120)));
    C.check('habit page: water shows its badge, two steps of five, the next step and the old mark folded under it',
      pages.water.block && pages.water.pips === 2 && /Badge · HUMAN SPRINKLER 2 of 5/.test(pages.water.text) && /Next: LOCKED IN at a 20-day streak · \+70 XP/.test(pages.water.text) && /Old marks, still yours 1/.test(pages.water.text), JSON.stringify(pages.water.text.slice(pages.water.text.indexOf('Badge'), pages.water.text.indexOf('Badge') + 260)));
    C.check('habit page: a habit of your own shows HOUSE RULES, shared', /Badge · HOUSE RULES/.test(pages.custom.text) && /One badge for all your own habits/.test(pages.custom.text), pages.custom.text.slice(pages.custom.text.indexOf('Badge'), pages.custom.text.indexOf('Badge') + 200));
    const man = await p.evaluate(() => renderManual().replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' '));
    C.check('manual: the Trophy Room has its section and its contents link; the Consistency section speaks of badge steps',
      /The Trophy Room is at the foot of Progress/.test(man) && /Contents.*The Locker The Trophy Room Consistency/.test(man) && /Every badge step is earned on your longest streak/.test(man) && /Reaching a step pays/.test(man) && !/Clearing a tier pays/.test(man), man.slice(0, 160));
    C.check('manual: the new prose has no em-dash and no semicolon', (() => { const i = man.indexOf('The Trophy Room is at the foot'); const seg = man.slice(i, i + 1700); return !/[—;]/.test(seg); })());
    C.check('scorer: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 8. ?go=trophy ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const a = await openCat(browser, { url: '/habits.html?go=trophy', profile: profile(10000, { shelf: shelf() }), seed: { _hab_log: LOG }, settle: 900 });
    C.check('?go=trophy: a phone with no profile yet opens the Locker, then Progress at the Trophy Room once the profile says the switch is on',
      await a.p.evaluate(() => UI.screen === 'progress' && !!document.querySelector('[data-k="trophyroom"]')), await a.p.evaluate(() => UI.screen));
    await a.ctx.close();
    const b = await openCat(browser, { url: '/habits.html?go=trophy', wait: false, profile: profile(10000, { cat: null }), seed: { _hab_log: LOG }, settle: 1200 });
    C.check('?go=trophy: with the switch off it is ?go=pass (the Locker)', await b.p.evaluate(() => UI.screen === 'pass'), await b.p.evaluate(() => UI.screen));
    await b.ctx.close();
    const copy = { p: profile(10000, { shelf: shelf() }), at: Date.now(), base: 0 };
    const c = await openCat(browser, { url: '/habits.html?go=trophy', seed: { _hab_career: copy, _hab_log: LOG }, settle: 700 });
    C.check('?go=trophy: from the copy on this phone it opens at the Trophy Room at once', await c.p.evaluate(() => UI.screen === 'progress'), await c.p.evaluate(() => UI.screen));
    C.check('?go=trophy: no page errors', a.p.errs.length + b.p.errs.length + c.p.errs.length === 0, JSON.stringify([a.p.errs, b.p.errs, c.p.errs]));
    await c.ctx.close();
  }

  } catch (e) { C.check('the run was cut short: ' + String(e && e.message || e).split('\n')[0], false); }
  await browser.close();
  process.exitCode = C.report() ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
