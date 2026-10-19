// AA Proof, the lightest version (Career Mode round 5, step 3; career/CAREER_MODE.md L1, L2, L5, L7; habits.html CAREER_LIGHT): node scripts/headless/proof-light.js
//
// With CAREER_LIGHT true the career is AA Performance's (program.html, Progress): AA Proof keeps its habits, the week table, Today and the Crew board and
// draws no career screen. This runs the real page on made-up athletes (lib.js stub; no real id), a coached one and a free one, with the server's XP and
// catalogue switches ON (the case that used to draw the most), and checks, by looking at the page and by clicking:
//   tabs        Today, Progress, Crew; no Locker; ?go=pass and go('pass') open Progress, ?go=progress too
//   Today       the level is a number and a bar, no rank name, nothing opens from it, no four numbers
//   Progress    three season facts and the week table; a coached athlete meets ONE door card (its words, a button that opens the training app); a free one none;
//               no shelf, no Grand Slam, no Milestones tile, and get_awards is never asked
//   moments     no first-open reveal, no catalogue reveal, no level-up, no reward, no award, no waiting server moment shown or TOLD (mark_moments_told
//               is the training app's to call), the baselines still move; a day streak mark and a quest still open their takeover, a tier and a milestone do not
//   wins card   no line for a badge, a milestone, a habit's rank, an award or a season; a perfect day and a comeback stay
//   Crew        no rank name, no title, no gold/silver/bronze emoji on the board and no rank or title chip on the wall; points and the order stay
//   share       the picker offers The day, Streak and Month (and Quest or Comeback for those); a door that still names Rank or Title opens The day
//   guides      the manual and the tour name no Locker, no rank and no four numbers
//   the strip   (?embed=1) one row of chips: names, counts, a tap is the habit's + or tick (a counted habit with a big target, Steps and Sleep, opens the number row
//               prefilled with the target, and the frame's height message follows it), the locked session is not a button, the look (head, pill, ring,
//               count, done), light and dark, 390 and 320 px with no overflow, 36 px tall, and the message the training app reads (state ready and the height)
// Serve the repo first (python -m http.server 8765 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const H = require('./lib');
const REPO = path.join(__dirname, '..', '..');

const DAY = 86400000;
const ymd = d => d.toISOString().slice(0, 10);
const at = n => ymd(new Date(Date.now() + n * DAY));                      // n days from today (UTC; every page here runs in UTC)
const CASES = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'career', 'xp_cases.json'), 'utf8'));
const LEVEL = CASES.rules.level;
const SWX = at(-40), S3 = at(-3);
function lvl(xp) {
  const cost = n => Math.max(10, Math.round(LEVEL.base * Math.pow(n, LEVEL.growth) / 10) * 10);
  let lv = 1, spent = 0, c = cost(1);
  while (xp - spent >= c) { spent += c; lv++; c = cost(lv); }
  const i = lv - 1, within = i % LEVEL.prestige_after;
  return { level: lv, rank: LEVEL.ranks[Math.floor(within / LEVEL.levels_per_rank)] + ' ' + (within % LEVEL.levels_per_rank + 1), xp_in_level: xp - spent, level_cost: c, to_next: c - (xp - spent) };
}
let _cat = null;
function catRows() {
  if (_cat) return _cat;
  for (const py of ['python', 'python3']) {
    try {
      const j = JSON.parse(cp.execFileSync(py, ['-X', 'utf8', path.join(REPO, 'scripts', 'career_seed.py'), '--json'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }));
      return (_cat = j.catalogue.filter(r => ['badge', 'achievement', 'title', 'setting'].indexOf(r.kind) >= 0));
    } catch (e) { /* the next name */ }
  }
  throw new Error('proof-light.js: could not run   python scripts/career_seed.py --json');
}
// get_profile(), the CORE, with the catalogue on (S3) or off (null): the shape the server answers (career.js rwProfile(), cut down).
function profile(xp, o = {}) {
  const S = o.S === undefined ? S3 : o.S, free = !!o.free;
  const four = free
    ? { consistency: { key: 'day_streak', value: 4, best: 9 }, commitment: { key: 'perfect_days', value: 19 }, progress: { key: 'habit_steps', value: 6, locked: true }, resilience: { key: 'comebacks', value: 5 } }
    : { consistency: { key: 'weeks_held', value: 3, best: 7 }, commitment: { key: 'sessions_with_amir', value: 24 }, progress: { key: 'personal_bests', value: 12 }, resilience: { key: 'comebacks', value: 5 } };
  const p = {
    athlete_id: H.ID, ready: true, shadow: false, switch: { xp: SWX, catalogue: S }, rules_version: 3,
    career: Object.assign({ xp, habits: {}, facts: {}, facts_xp: 0 }, lvl(xp)),
    season: { name: 'Season 2', starts_on: at(-30), points: 1234 }, week: { from: at(-6), points: 900 }, since: '2026-06-06', kept: null,
    numbers: { weeks_held: { now: 3, best: 7 }, sessions_with_amir: 24, personal_bests: 12, comebacks: 5, days_on_target: 88, perfect_days: 19, free },
    titles_owned: ['t_signed', 'clockwork'], rules: { version: 3, level: LEVEL, season: { title_points: 2000 }, prices: { session_finished: 400 } },
    missions: [], quest: null, badges: [], achievements: [], moments: o.moments || [],
  };
  if (S === null) return p;
  p.numbers.four = four;
  Object.assign(p, { catalogue_version: '4@1760774400', owned: ['achievement:first_best', 'badge:held_weeks:1', 'badge:held_weeks:2', 'title:clockwork'], title_worn: null,
    slam: { consistency: { id: 'clockwork', name: 'CLOCKWORK', day: at(-20) }, commitment: null, progress: null, resilience: null, grand: null },
    ladder: { held_weeks: { now: 2, have: 7, name: 'Hold Serve', next: 8, tier: 1, meaning: 'consistency', next_tier: 2, metal_next: 'silver' } },
    near: [{ id: 'held_weeks', name: 'Hold Serve', have: 7, next: 8, pct: 88 }] });
  return p;
}
const shelfOf = () => ({ athlete_id: H.ID, catalogue: S3, catalogue_version: '4@1760774400',
  badges: [{ id: 'held_weeks', name: 'Hold Serve', meaning: 'consistency', tier: 2, metal: 'silver', day: at(-20), caption: '8 weeks held in a row.', days: [at(-60), at(-20)] }],
  achievements: [{ id: 'first_best', name: 'First Best', meaning: 'progress', day: at(-50), size: 'highlight', caption: 'Your first personal best.' }],
  titles: [{ id: 'clockwork', hab_id: 'clockwork', name: 'CLOCKWORK', meaning: 'consistency', metal: 'prismatic', from: 'Hold Serve', day: at(-20), source: 'award' }], recent: [] });
// Twenty-four days of log; today has the session done, 6,200 steps, 2 of 3 protein and 4 of 8 glasses (so the verdict says "2 to go").
const logOf = (n = 24) => { const L = {}; for (let i = 0; i < n; i++) L[at(-i)] = { strength: i % 3 === 0 ? 1 : 0, water: i % 5 === 0 ? 4 : 8, sleep: 8, steps: i % 4 === 0 ? 6200 : 11000, fuel: i % 6 === 0 ? 2 : 3, mobility: i < 6 ? 1 : 0 }; return L; };
const RULES = [{ version: 4, switch: { xp: SWX, catalogue: 'off' } }];
const CUSTOM = { custom: [{ id: 'c_screens_1', name: 'NO SCREENS IN BED', goal: 'No screens in bed' }], on: { mobility: true, breathe: true, supps: true, c_screens_1: true } };

// A page for AA Proof as a made-up athlete. o: free, S (the catalogue switch: null = off), moments, log, cfg, url, w, h, dark, stub.
function proofOpts(o = {}) {
  const prof = profile(10000, { free: !!o.free, S: o.S, moments: o.moments });
  const prog = H.fixture();
  if (o.free) prog.athlete = Object.assign({}, prog.athlete || {}, { tier: 'free' });
  return { tz: 'UTC', w: o.w || 390, h: o.h || 844, prog, dark: !!o.dark, url: o.url,
    seed: Object.assign({ _hab_log: o.log || logOf(), _hab_career: { p: prof, at: Date.now(), base: 0 } }, o.seed || {}),
    stub: Object.assign({ profile: prof, awards: prof.catalogue_version ? shelfOf() : null, tables: { career_rules: RULES, career_facts: [], career_catalogue: prof.catalogue_version ? catRows() : [] } }, o.stub || {}),
    cfg: Object.assign({ careerSeen: SWX, catalogueSeen: prof.catalogue_version ? S3 : null }, CUSTOM, o.cfg || {}) };
}
const calls = (p, name) => p.evaluate(n => (window.__STUB.calls || []).filter(c => c === n).length, name);
const text = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
const settle = (p, ms) => p.waitForTimeout(ms || 700);
const quiet = p => p.evaluate(() => { UI.celebrate = []; UI.celebrateLater = []; UI.toast = null; CFG.wins = []; render(); });

(async () => {
  const t = H.checker();
  const browser = await H.launch();
  const open = o => H.openProof(browser, proofOpts(o));

  // ── 1. tabs and doors ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open({});
    await settle(p);
    const tabs = await p.evaluate(() => [...document.querySelectorAll('.tabs button .nm')].map(e => e.textContent.trim()));
    t.check('tabs: Today, Progress, Crew and nothing else', tabs.join() === 'TODAY,PROGRESS,CREW', tabs.join());
    t.check('tabs: TAB_ORDER has three screens', await p.evaluate(() => TAB_ORDER.join()) === 'today,progress,crew');
    await p.evaluate(() => go('pass')); await settle(p, 300);
    t.check('go("pass") opens Progress', await p.evaluate(() => UI.screen) === 'progress');
    await ctx.close();
    for (const [q, want] of [['?go=pass', 'progress'], ['?go=progress', 'progress']]) {
      const x = await open({ url: '/habits.html' + q });
      await settle(x.p);
      t.check(`/habits.html${q} opens ${want}`, await x.p.evaluate(() => UI.screen) === want, await x.p.evaluate(() => UI.screen));
      t.check(`/habits.html${q}: no page errors`, x.p.errs.length === 0, JSON.stringify(x.p.errs));
      await x.ctx.close();
    }
  }

  // ── 2. Today: the level, no rank name, no four numbers ─────────────────────────────────────────────────────────────────────────────────────
  for (const [w, dark] of [[390, false], [320, true]]) {
    const { ctx, p } = await open({ w, dark });
    await settle(p, 1200);
    await quiet(p);
    const r = await p.evaluate(() => ({ label: overallLevel().label, lv: overallLevel().lv, body: document.body.innerText, ranklink: !!document.querySelector('.ranklink'), hero4: !!document.querySelector('.hero4'),
      ring: (document.querySelector('.hero-lv .lvring') || {}).tagName, ringText: ((document.querySelector('.hero-lv .lvring') || {}).innerText || '').replace(/\s+/g, ' '),
      xp: ((document.querySelector('.heroxp') || {}).innerText || '').replace(/\s+/g, ' '), sx: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    const tag = ` (${w} px${dark ? ' dark' : ''})`;
    t.check('Today: the level is a ring with its number, and nothing opens from it' + tag, r.ring === 'DIV' && r.ringText.indexOf(String(r.lv)) === 0, r.ring + ' ' + r.ringText);
    t.check('Today: no rank name, no crest link' + tag, !r.ranklink && r.body.toUpperCase().indexOf(String(r.label).toUpperCase()) < 0, r.label);
    t.check('Today: the XP to the next level is the line beside it' + tag, /XP to level \d+/.test(r.xp), r.xp);
    t.check('Today: no four numbers under the bar' + tag, !r.hero4 && !/Weeks held|Sessions with Amir|Personal bests/.test(r.body));
    t.check('Today: no sideways scroll, no page errors' + tag, r.sx <= 0 && p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 3. Progress: three facts, the week, ONE door card for a coached athlete, nothing for a free one ──────────────────────────────────────
  for (const [w, dark] of [[390, false], [320, true]]) {
    const { ctx, p } = await open({ w, dark });
    await settle(p, 1000);
    await p.evaluate(() => go('progress')); await settle(p, 900);
    const tag = ` (${w} px${dark ? ' dark' : ''})`;
    const r = await p.evaluate(() => ({ stats: [...document.querySelectorAll('.statgrid > div .eyebrow')].map(e => e.innerText.replace(/\s+/g, ' ').trim()), statfrac: !!document.querySelector('.statfrac'),
      shelf: document.querySelectorAll('.msrow, .msearned, .msall, .slamrow').length, door: document.querySelectorAll('.doorcard').length,
      doorText: ((document.querySelector('.doorcard p') || {}).innerText || '').replace(/\s+/g, ' '), doorBtn: ((document.querySelector('.doorcard button') || {}).innerText || '').trim(),
      week: !!document.querySelector('.weektable'), body: document.body.innerText, sx: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    t.check('Progress, coached: three season facts, no Milestones tile' + tag, r.stats.length === 3 && !r.statfrac && !r.stats.some(s => /milestone/i.test(s)), r.stats.join(' | '));
    t.check('Progress, coached: the week table is there' + tag, r.week);
    t.check('Progress, coached: no badge shelf, no earned strip, no Grand Slam' + tag, r.shelf === 0 && !/Grand Slam|Milestones|Earned/.test(r.body), r.shelf);
    t.check('Progress, coached: ONE door card' + tag, r.door === 1, r.door);
    t.check('Progress, coached: the door card says where the career went, in its words' + tag,
      r.doorText === "Your level, your four numbers, your moments and Amir's notes are in AA Performance now, on Progress. Your habits stay right here.", r.doorText);
    t.check('Progress, coached: its button is "Open AA Performance"' + tag, r.doorBtn === 'Open AA Performance', r.doorBtn);
    t.check('Progress, coached: the shelf (get_awards) is never asked for' + tag, await calls(p, 'rpc:get_awards') === 0, await calls(p, 'rpc:get_awards'));
    t.check('Progress, coached: no sideways scroll, no page errors' + tag, r.sx <= 0 && p.errs.length === 0, p.errs.join(' | '));
    if (w === 390 && !dark) {
      const want = await p.evaluate(() => programUrl() + '&go=numbers');
      const req = p.waitForRequest(rq => /\/program\.html\?client=/.test(rq.url()), { timeout: 8000 }).catch(() => null);
      await p.click('.doorcard button');
      const rq = await req;
      t.check('Progress, coached: the button opens the training app at Your numbers (programUrl() + &go=numbers)', !!rq && rq.url().indexOf(want) >= 0, rq ? rq.url() : 'no request');
    }
    await ctx.close();
  }
  {
    const { ctx, p } = await open({ free: true });
    await settle(p, 1000);
    await p.evaluate(() => go('progress')); await settle(p, 900);
    const r = await p.evaluate(() => ({ door: document.querySelectorAll('.doorcard').length, stats: document.querySelectorAll('.statgrid > div').length, shelf: document.querySelectorAll('.msrow, .msearned, .msall, .slamrow').length,
      body: document.body.innerText, week: !!document.querySelector('.weektable') }));
    t.check('Progress, free: no door card', r.door === 0, r.door);
    t.check('Progress, free: habits and the day streak only, nothing about a career', r.stats === 3 && r.week && r.shelf === 0 && !/AA Performance|four numbers|moments|career|Milestone/i.test(r.body), r.body.slice(0, 160));
    t.check('Progress, free: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 4. moments: nothing shown, nothing told, the baselines move ────────────────────────────────────────────────────────────────────────
  {
    // The first open after both switches: no reveal of either kind, and both are recorded as seen.
    const o = proofOpts({});
    o.cfg = Object.assign({}, o.cfg, { careerSeen: null, catalogueSeen: null, seen: null, rulesSig: null });
    const { ctx, p } = await H.openProof(browser, o);
    await settle(p, 2500);
    const r = await p.evaluate(() => ({ q: UI.celebrate.map(e => e.kind || 'level'), lvwrap: document.querySelectorAll('.lvwrap').length, cs: CFG.careerSeen, cat: CFG.catalogueSeen, toast: UI.toast || '' }));
    t.check('moments: the first open after the XP and catalogue switches opens no reveal', r.q.length === 0 && r.lvwrap === 0, JSON.stringify(r));
    t.check('moments: both reveals are recorded as seen (the baseline moved)', !!r.cs && !!r.cat, JSON.stringify({ cs: r.cs, cat: r.cat }));
    t.check('moments: no page errors on that open', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // A waiting server moment (a milestone-size award the training app earned): AA Proof neither opens it nor tells the server it was shown.
    const m = { award_id: 'badge:held_weeks:3', kind: 'badge', item: 'held_weeks', tier: 3, size: 'milestone', day: at(-1), full: true, xp: 800, spec: { kind: 'badge', name: 'Hold Serve', meaning: 'consistency', metal: 'emerald', tier: 3, n: 8, caption: '12 weeks held in a row.', date: at(-1) } };
    const { ctx, p } = await open({ moments: [m], cfg: { seenAwards: [] } });
    await settle(p, 2500);
    await p.evaluate(() => { fetchCareer(); });
    await settle(p, 1500);
    const r = await p.evaluate(() => ({ q: UI.celebrate.map(e => e.kind || 'level'), wins: (CFG.wins || []).map(w => w.k), told: (window.__STUB.params || []).filter(x => x[0] === 'mark_moments_told').length, lvwrap: document.querySelectorAll('.lvwrap').length, sm: serverMoments() }));
    t.check('moments: a waiting server moment is not opened in AA Proof', r.q.length === 0 && r.lvwrap === 0 && r.wins.indexOf('award') < 0, JSON.stringify(r));
    t.check('moments: and it is not TOLD (the training app shows it, once)', r.told === 0 && r.sm === false, JSON.stringify(r));
    await ctx.close();
  }
  {
    // A level up, a reward the level unlocks, and a season that closed: baselines move, nothing opens, the record of what is owned still grows.
    const { ctx, p } = await open({});
    await settle(p, 1500);
    await quiet(p);
    const r = await p.evaluate(() => {
      const lv = overallLevel().lv, before = (CFG.pass.owned || []).length;
      CFG.seen = Object.assign({}, CFG.seen, { _overall: Math.max(1, lv - 3) });
      CFG.seenSeasons = [];
      checkLevelUps();
      return { q: UI.celebrate.map(e => e.kind || 'level'), seen: CFG.seen._overall, lv, wins: (CFG.wins || []).map(w => w.k), owned: (CFG.pass.owned || []).length - before };
    });
    t.check('moments: a level-up opens no takeover, and the baseline moves to the new level', r.q.length === 0 && r.seen === r.lv, JSON.stringify(r));
    t.check('moments: no rank or season line lands on the wins card', r.wins.every(k => ['hrank', 'season'].indexOf(k) < 0), JSON.stringify(r.wins));
    await ctx.close();
  }
  {
    // The catalogue OFF, so the phone decides tiers and milestones itself: a 25-day run of everything is a tier on every habit and some milestones.
    const log = {}; for (let i = 0; i < 40; i++) log[at(-i)] = { strength: 1, steps: 11000, sleep: 8, fuel: 3, water: 8, mobility: 1 };
    const { ctx, p } = await open({ S: null, log, cfg: { seenTiers: {}, seenAch: [], seenQuests: [], seenStreak: 0, seenComeback: null, seenPerfect: null } });
    await settle(p, 1500);
    await quiet(p);
    const r = await p.evaluate(() => {
      CFG.seenTiers = { water: 0, steps: 0 }; CFG.seenAch = []; CFG.seenStreak = 0; CFG.seenPerfect = null;
      const days = currentTiers().water;
      checkUnlocks();
      return { days, q: UI.celebrate.map(e => e.kind || 'level'), wins: (CFG.wins || []).map(w => w.k), seenTiers: CFG.seenTiers.water, seenAch: (CFG.seenAch || []).length, streak: CFG.seenStreak };
    });
    t.check('moments: setup: the phone really crossed a tier and a milestone on that log', r.days > 0 && r.seenAch > 0, JSON.stringify(r));
    t.check('moments: a tier and a milestone get no takeover and no wins line', r.q.indexOf('milestone') < 0 && r.q.indexOf('tier') < 0 && r.wins.every(k => ['tier', 'milestone'].indexOf(k) < 0), JSON.stringify(r));
    t.check('moments: a day streak mark still takes the screen', r.q.indexOf('streak') >= 0, JSON.stringify(r));
    t.check('moments: the seen-lists moved, so nothing replays', r.seenTiers === r.days && r.seenAch > 0, JSON.stringify(r));
    await ctx.close();
  }
  {
    // The wins card: the kinds that are the career's are not drawn; a perfect day and a comeback are.
    const { ctx, p } = await open({});
    await settle(p, 1500);
    await quiet(p);
    const r = await p.evaluate(() => {
      CFG.wins = [{ k: 'milestone', id: 'HS2' }, { k: 'tier', id: 't20', ti: 2, h: ['water'] }, { k: 'hrank', id: 'water', to: 11 }, { k: 'season', id: '2026-07-26' }, { k: 'award', id: 'badge:held_weeks:3' }];
      render();
      const none = document.querySelectorAll('.wins').length;
      CFG.wins = CFG.wins.concat([{ k: 'perfect', id: TKEY() }, { k: 'comeback', id: 'cb1', gone: 4 }]);
      render();
      return { none, lines: [...document.querySelectorAll('.wins .win .wt b')].map(e => e.innerText) };
    });
    t.check('wins card: a badge, a milestone, a rank, an award and a season have no line', r.none === 0, r.none);
    t.check('wins card: a perfect day and a comeback do', r.lines.join() === 'Second wind,Perfect day' || r.lines.join() === 'Perfect day,Second wind' || (r.lines.length === 2 && r.lines.indexOf('Perfect day') >= 0), r.lines.join(' | '));
    await ctx.close();
  }

  // ── 5. Crew: no rank, no title, no emoji; points and order stay ────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open({});
    await settle(p, 1000);
    await p.evaluate(() => go('crew')); await settle(p, 900);
    const BOARD = [
      { pos: 1, display_name: 'Maya K.', xp: 8420, rank_label: 'Contender 2', title: 't_signed', joined: true },
      { pos: 2, display_name: 'Tom R.', xp: 7210, rank_label: 'Rookie 3', title: null },
      { pos: 3, display_name: 'You', is_me: true, xp: 6980, rank_label: 'Contender 1', title: 'clockwork' },
      { pos: 4, display_name: 'Lea B.', xp: 5410, rank_label: 'Rookie 2', title: null }];
    await p.evaluate(rows => { LB.rows = rows; LB.deltas = { 'Tom R.': 2 }; LB.loaded = true; LB.loading = false; LB.joined = true; LB.error = null; render(); }, BOARD);
    await settle(p, 500);
    const r = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.lbrow')].map(e => ({ pos: e.querySelector('.lbpos').innerText.trim(), name: e.querySelector('.lbnm').innerText.trim(), xp: e.querySelector('.lbxp').innerText.trim(),
      sub: (e.querySelector('.lbsub') || {}).innerText || '', plate: !!e.querySelector('.tplate, [class*="plate"]') })), body: document.getElementById('scroll').innerText }));
    t.check('Crew: the order and the points stay', r.rows.map(x => x.pos + ' ' + x.name + ' ' + x.xp).join(' / ') === '1 Maya K. 8,420 XP / 2 Tom R. 7,210 XP / 3 You 6,980 XP / 4 Lea B. 5,410 XP', r.rows.map(x => x.pos + ' ' + x.name + ' ' + x.xp).join(' / '));
    t.check('Crew: no rank name and no title on any row', !/Contender|Rookie|CLOCKWORK|SIGNED/i.test(r.body) && r.rows.every(x => !x.plate), r.body.slice(0, 200));
    t.check('Crew: no gold, silver or bronze emoji, the place is a plain number', !/[\u{1F947}\u{1F948}\u{1F949}]/u.test(r.body) && r.rows.slice(0, 3).every((x, i) => x.pos === String(i + 1)));
    t.check('Crew: the move since you last looked still shows', r.rows[1].sub.indexOf('2') >= 0 && r.rows[0].sub === '', JSON.stringify(r.rows.map(x => x.sub)));
    // The wall: a line carries the percentage and the streak, no rank chip, no title.
    const wall = await p.evaluate(() => {
      RC.rows = [{ day: TKEY(), display_name: 'Maya K.', body: 'Back at it.', pct: 80, rank_label: 'Contender 2', title: 't_signed' }, { day: TKEY(), display_name: 'You', is_me: true, body: 'Slow day.', pct: 55, rank_label: 'Contender 1', title: 'clockwork' }];
      RC.loaded = true; RC.loading = false; RC.error = null; LB.view = 'roll'; render();
      return { text: document.getElementById('scroll').innerText, chips: [...document.querySelectorAll('.rc-chips .rchip')].map(e => e.innerText.trim()), plates: document.querySelectorAll('.rc-chips .tplate, .rc-chips [class*="plate"]').length };
    });
    t.check('Crew: the wall has no rank chip and no title plate on a line', !/Contender/.test(wall.text) && wall.plates === 0 && wall.chips.every(c => /% day|streak/.test(c)), JSON.stringify(wall.chips));
    // The words about the board name what is shown: the name and the points.
    const copy = await p.evaluate(() => { LB.view = 'board'; CFG.onBoard = false; render(); return document.getElementById('scroll').innerText; });
    t.check('Crew: "Join the board" says other athletes see the name and the points, no rank or title', /name you pick here and your points/.test(copy) && !/your rank|title you wear/.test(copy), copy.slice(0, 260));
    t.check('Crew: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 6. the share picker ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open({});
    await settle(p, 1500);
    await quiet(p);
    const rail = async () => p.evaluate(() => ({ names: [...document.querySelectorAll('.scard-nm')].map(e => e.textContent.trim()), on: ((document.querySelector('.scard.on .scard-nm') || {}).textContent || '').trim(), kind: UI.share && UI.share.kind }));
    const close = async () => { await p.evaluate(() => { UI.share = null; render(); }); await p.waitForTimeout(150); };
    const settleShare = () => p.waitForFunction(() => !UI.share || !UI.share.busy, null, { timeout: 15000 }).catch(() => {});
    await p.evaluate(() => openShare()); await settleShare();
    let r = await rail();
    t.check('share: the picker offers The day, Streak and Month, and opens on The day', r.names.join() === 'The day,Streak,Month' && r.kind === 'receipt', JSON.stringify(r));
    await close();
    await p.evaluate(() => openShare('rank')); await settleShare();
    r = await rail();
    t.check('share: a door that still names the Rank card opens The day', r.kind === 'receipt' && r.names.indexOf('Rank') < 0, JSON.stringify(r));
    await close();
    await p.evaluate(() => openShare('title', { title: { id: 't_early' } })); await settleShare();
    r = await rail();
    t.check('share: a door that still names the Title card opens The day', r.kind === 'receipt' && r.names.indexOf('Title') < 0, JSON.stringify(r));
    await close();
    await p.evaluate(() => openShare('medal', { medal: { k: 'quest', q: { title: 'THE WELL RUNS DEEP', note: 'Full water on 5 days', kind: 'daysHit:water', xp: 150 } } })); await settleShare();
    r = await rail();
    t.check('share: a quest keeps its card (Quest), with no Rank, Title or Milestone beside it', r.names.indexOf('Quest') >= 0 && r.on === 'Quest' && ['Rank', 'Title', 'Milestone'].every(n => r.names.indexOf(n) < 0), JSON.stringify(r));
    await close();
    await p.evaluate(() => openShare('medal', { medal: { k: 'comeback', gone: 4 } })); await settleShare();
    r = await rail();
    t.check('share: a comeback keeps its card', r.names.indexOf('Comeback') >= 0 && r.on === 'Comeback', JSON.stringify(r));
    await close();
    await p.evaluate(() => openShare('streak', { streak: { days: 14 } })); await settleShare();
    r = await rail();
    t.check('share: a streak mark opens Streak', r.kind === 'streak' && r.on === 'Streak', JSON.stringify(r));
    await close();
    await p.evaluate(() => openShare('medal', { medal: { k: 'milestone', id: 'HS2' } })); await settleShare();
    r = await rail();
    t.check('share: a milestone has no card any more', r.names.indexOf('Milestone') < 0 && r.names.indexOf('Rank') < 0 && r.names.indexOf('Title') < 0, JSON.stringify(r));
    await close();
    t.check('share: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 7. the guides: the manual, the tour, Settings ───────────────────────────────────────────────────────────────────────────────────────
  for (const [name, o] of [['coached, catalogue on', {}], ['coached, catalogue off', { S: null }], ['free', { free: true }]]) {
    const { ctx, p } = await open(o);
    await settle(p, 1200);
    await quiet(p);
    const g = await p.evaluate(() => {
      UI.manOpen = {}; ['Start here', 'The daily loop', 'Forgot to log a day?', 'Roll call', 'What each habit is worth', 'How to earn more', 'Your level', 'Levels and ranks', 'The Locker', 'Consistency', 'Quests', 'Seasons', 'The leaderboard', 'Body weight', 'Your data'].forEach(k => { UI.manOpen[k] = true; });
      go('manual');
      const man = document.getElementById('scroll').innerText;
      const contents = [...document.querySelectorAll('.manlinks .manlink')].map(e => e.innerText.trim());
      UI.manOpen = null;
      const steps = tourSteps().map(s => s.title + ' ' + s.body.replace(/<[^>]+>/g, ' ')).join(' | ');
      go('settings');
      const set = document.getElementById('scroll').innerText;
      const prof = document.querySelector('.profcard');
      return { man, contents, steps, set, profTag: prof && prof.tagName, nsteps: tourSteps().length };
    });
    const tag = ` (${name})`;
    t.check('manual: the contents have Your level and no Locker, no Levels and ranks, no Four kinds of win' + tag, g.contents.indexOf('Your level') >= 0 && ['The Locker', 'Levels and ranks', 'Four kinds of win'].every(k => g.contents.indexOf(k) < 0), g.contents.join(' | '));
    t.check('manual: no Locker, no Grand Slam, no rank ladder, no title or skin' + tag, !/Locker|Grand Slam|ranks with|Four tabs|Four kinds|title you wear|your rank/i.test(g.man), (g.man.match(/.{30}(Locker|Grand Slam|ranks with|Four tabs|Four kinds|title you wear|your rank).{30}/i) || [''])[0]);
    t.check('manual: it says three tabs' + tag, /Three tabs/.test(g.man));
    t.check('tour: five steps, none names the Locker, a rank or the record card; only a coached one says where the four numbers went' + tag, g.nsteps === 5 && !/Locker|rank|Your record/i.test(g.steps) && /AA Performance/.test(g.steps) === !o.free, g.nsteps + ' | ' + g.steps.slice(0, 200));
    t.check('Settings: the profile card is not a link and shows no rank' + tag, g.profTag === 'DIV' && !/GRINDER|ROOKIE|CONTENDER/i.test(g.set.slice(0, 120)), g.profTag + ' ' + g.set.slice(0, 100));
    t.check('guides: no page errors' + tag, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // The tour on the real screen: it runs to the end through the steps that exist, with nothing ringed that is missing.
    const { ctx, p } = await open({ cfg: { toured: false } });
    await settle(p, 1500);
    await quiet(p);
    await p.evaluate(() => startTour('today')); await p.waitForTimeout(500);
    const titles = [];
    for (let i = 0; i < 8; i++) {
      const s = await p.evaluate(() => TOUR.on ? { i: TOUR.i, n: TOUR.steps.length, t: TOUR.steps[TOUR.i].title, el: !!(TOUR.steps[TOUR.i].sel && TOUR.steps[TOUR.i].sel()) } : null);
      if (!s) break;
      titles.push(s.t + (s.el ? '' : ' (nothing to ring)'));
      await p.evaluate(() => tourGo(1)); await p.waitForTimeout(450);
    }
    t.check('tour: every step finds its control and the tour ends', titles.length === 5 && titles.every(x => x.indexOf('nothing to ring') < 0) && !(await p.evaluate(() => TOUR.on)), titles.join(' | '));
    t.check('tour: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 8. the strip on the training app's Home (?embed=1): one row of chips ───────────────────────────────────────────────────────────────────
  const rgb = (r, g, b, a) => a == null ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
  // 342 and 272 px are the frame's width on a 390 and a 320 px phone (the training app's Home rows keep a 24 px gutter).
  for (const [w, dark] of [[390, false], [390, true], [342, false], [320, false], [320, true], [272, false], [272, true]]) {
    const tag = ` (${w} px${dark ? ' dark' : ''})`;
    const { ctx, p } = await open({ w, url: '/habits.html?embed=1' });
    if (dark) { await p.evaluate(() => { document.body.setAttribute('data-dark', ''); render(); }); await p.waitForTimeout(200); }
    const r = await p.evaluate(() => {
      const cs = (sel, prop, which) => { const e = document.querySelector(sel); return e ? getComputedStyle(e, which || null)[prop] : null; };
      const pills = [...document.querySelectorAll('#app .e-pill')];
      const done = document.querySelector('#app .e-pill.done:not(.locked) .e-cc') || document.querySelector('#app .e-pill.done .e-cc');
      const doneChip = [...pills].find(x => x.classList.contains('done') && !x.classList.contains('locked') && x.querySelector('.e-cc'));
      const plain = [...pills].find(x => !x.classList.contains('done') && !x.classList.contains('locked') && x.querySelector('.e-cc'));
      const wrap = document.querySelector('#app .e-chips').getBoundingClientRect();
      const get = (el, prop, which) => el ? getComputedStyle(el, which || null)[prop] : null;
      return { labels: pills.map(x => x.querySelector('.e-cn').innerText.trim()), counts: pills.map(x => (x.querySelector('.e-cc') || {}).innerText || ''), tags: pills.map(x => x.tagName),
        heights: pills.map(x => Math.round(x.getBoundingClientRect().height)), done: pills.map(x => x.classList.contains('done')),
        overflow: pills.some(x => x.getBoundingClientRect().right > wrap.right + 0.5 || x.getBoundingClientRect().left < wrap.left - 0.5), sx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        k: { size: cs('#app .e-k', 'fontSize'), weight: cs('#app .e-k', 'fontWeight'), ls: cs('#app .e-k', 'letterSpacing'), tt: cs('#app .e-k', 'textTransform'), color: cs('#app .e-k', 'color'), text: document.querySelector('#app .e-k').innerText },
        n: { text: document.querySelector('#app .e-n').innerText.trim(), cls: document.querySelector('#app .e-n').className, color: cs('#app .e-n', 'color') },
        open: { text: document.querySelector('#app .e-open').innerText.trim(), size: cs('#app .e-open', 'fontSize'), weight: cs('#app .e-open', 'fontWeight'), color: cs('#app .e-open', 'color'), href: document.querySelector('#app .e-open').getAttribute('href'), target: document.querySelector('#app .e-open').getAttribute('target') },
        plain: plain && { bg: get(plain, 'backgroundColor'), border: get(plain, 'borderTopColor'), bw: get(plain, 'borderTopWidth'), radius: get(plain, 'borderTopLeftRadius'), pad: get(plain, 'paddingLeft') + '/' + get(plain, 'paddingRight'),
          size: get(plain, 'fontSize'), weight: get(plain, 'fontWeight'), color: get(plain, 'color'), ring: get(plain.querySelector('.e-ring'), 'width') + 'x' + get(plain.querySelector('.e-ring'), 'height'), ringBorder: get(plain.querySelector('.e-ring'), 'borderTopColor'),
          ringW: get(plain.querySelector('.e-ring'), 'borderTopWidth'), ccW: get(plain.querySelector('.e-cc'), 'fontWeight'), ccColor: get(plain.querySelector('.e-cc'), 'color'), font: get(plain, 'fontFamily') },
        doneChip: doneChip && { bg: get(doneChip, 'backgroundColor'), border: get(doneChip, 'borderTopColor'), color: get(doneChip, 'color'), ringBg: get(doneChip.querySelector('.e-ring'), 'backgroundColor'), tick: !!doneChip.querySelector('.e-ring svg.tick'),
          tickStroke: get(doneChip.querySelector('.e-ring svg.tick path'), 'stroke'), cc: get(doneChip.querySelector('.e-cc'), 'color') },
        locked: (() => { const l = document.querySelector('#app .e-pill.locked'); return l && { tag: l.tagName, role: l.getAttribute('role'), done: l.classList.contains('done') }; })(),
        wrapBg: cs('#app .e-wrap', 'backgroundColor'), wrapBorder: cs('#app .e-wrap', 'borderTopWidth'), appBg: cs('#app', 'backgroundColor') };
    });
    const light = !dark;
    t.check('strip: the habits are chips, unlocked first and the session last, with short names' + tag, r.labels.join() === 'Steps,Sleep,Protein,Water,Mobility,Breathe,Supps,No screens…,Session', r.labels.join());
    t.check('strip: a counted habit shows its count, a checked one none' + tag, r.counts.join('|') === '6.2k/10k|8.0/7.5|2/3|4/8|||||', JSON.stringify(r.counts));
    t.check('strip: no card around it, transparent' + tag, r.wrapBg === 'rgba(0, 0, 0, 0)' && r.wrapBorder === '0px' && r.appBg === 'rgba(0, 0, 0, 0)', r.wrapBg + ' ' + r.wrapBorder + ' ' + r.appBg);
    t.check('strip: every chip is 36 px tall and none runs past the row' + tag, r.heights.every(h => h === 36) && !r.overflow, r.heights.join() + ' ' + r.overflow);
    t.check('strip: no sideways scroll' + tag, r.sx <= 0, r.sx);
    t.check('strip: the head says "Today\'s habits" in Space Mono 700, 11 px, 1.6 px apart, uppercase' + tag, r.k.text.toLowerCase() === "today's habits" && r.k.size === '11px' && r.k.weight === '700' && r.k.ls === '1.6px' && r.k.tt === 'uppercase', JSON.stringify(r.k));
    t.check('strip: the head colour' + tag, r.k.color === (light ? rgb(14, 74, 54) : rgb(159, 211, 189)), r.k.color);
    t.check('strip: the verdict says "2 to go" in clay' + tag, r.n.text === '2 to go' && /togo/.test(r.n.cls) && r.n.color === (light ? rgb(181, 70, 31) : rgb(224, 107, 67)), JSON.stringify(r.n));
    t.check('strip: "Open AA Proof ›" is a small link to the full app, 14 px 600' + tag, r.open.text === 'Open AA Proof ›' && r.open.size === '14px' && r.open.weight === '600' && /^habits\.html\?client=/.test(r.open.href) && r.open.target === '_top'
      && r.open.color === (light ? rgb(14, 74, 54) : rgb(159, 211, 189)), JSON.stringify(r.open));
    if (light) {
      t.check('strip: a chip, undone: white, 1 px #E4DDD1 border, a pill, 0 12 px, Barlow 600 14 px #1A1A1A' + tag, r.plain && r.plain.bg === rgb(255, 255, 255) && r.plain.border === rgb(228, 221, 209) && r.plain.bw === '1px' && parseFloat(r.plain.radius) >= 18
        && r.plain.pad === '12px/12px' && r.plain.size === '14px' && r.plain.weight === '600' && r.plain.color === rgb(26, 26, 26) && /Barlow/.test(r.plain.font), JSON.stringify(r.plain));
      t.check('strip: its ring is 14 px with a 1.5 px #8A8378 border; its count is 400 weight #5C5C5C' + tag, r.plain.ring === '14pxx14px' && parseFloat(r.plain.ringW) >= 1 && parseFloat(r.plain.ringW) <= 1.5 && r.plain.ringBorder === rgb(138, 131, 120) && r.plain.ccW === '400' && r.plain.ccColor === rgb(92, 92, 92), JSON.stringify(r.plain));
      t.check('strip: a chip, done: #0E4A36 fill and border, white text, a white ring with a green tick, its count in white at .8' + tag, r.doneChip && r.doneChip.bg === rgb(14, 74, 54) && r.doneChip.border === rgb(14, 74, 54) && r.doneChip.color === rgb(255, 255, 255)
        && r.doneChip.ringBg === rgb(255, 255, 255) && r.doneChip.tick && r.doneChip.tickStroke === rgb(14, 74, 54) && r.doneChip.cc === rgb(255, 255, 255, 0.8), JSON.stringify(r.doneChip));
    } else {
      t.check('strip: dark: a chip is #202020 with light text; done is #3E9C74' + tag, r.plain && r.plain.bg === rgb(32, 32, 32) && r.plain.color === rgb(238, 238, 238) && r.doneChip && r.doneChip.bg === rgb(62, 156, 116), JSON.stringify({ plain: r.plain, done: r.doneChip }));
    }
    t.check('strip: the locked session is a chip that is not a button, on because the session is done' + tag, !!r.locked && r.locked.tag === 'SPAN' && r.locked.role === 'img' && r.locked.done, JSON.stringify(r.locked));
    t.check('strip: no page errors' + tag, p.errs.length === 0, p.errs.join(' | '));
    if (w === 390 && !dark) await p.screenshot({ path: path.join(H.outDir(), 'proof-light-strip.png') }).catch(() => {});
    await ctx.close();
  }
  {
    // Taps: a chip is the + of a counted habit and the tick of a checked one; the session is not tappable.
    const { ctx, p } = await open({ url: '/habits.html?embed=1' });
    const val = id => p.evaluate(i => valOf(TKEY(), i), id);
    const chip = id => `#app .e-pill[data-k="epill:${id}"]`;
    const w0 = await val('water'), f0 = await val('fuel'), s0 = await val('steps'), m0 = await val('mobility'), b0 = await val('breathe');
    await p.click(chip('water')); await p.waitForTimeout(250);
    t.check('strip: tapping Water adds one glass (what + did)', await val('water') === w0 + 1, w0 + ' -> ' + await val('water'));
    t.check('strip: and says so', /XP/.test(await text(p, '#app .e-toast') || ''), await text(p, '#app .e-toast'));
    await p.click(chip('fuel')); await p.waitForTimeout(250);
    t.check('strip: tapping Protein adds one meal, and the chip is done at 3/3', await val('fuel') === f0 + 1 && await p.evaluate(() => document.querySelector('#app .e-pill[data-k="epill:fuel"]').classList.contains('done')), await val('fuel'));
    const big = await p.evaluate(() => ['steps', 'sleep', 'water', 'fuel'].map(i => [i, embedBigCount(habitById(i))].join(':')).join(' '));
    t.check('strip: Steps and Sleep are big counts (more than ten taps of + for a full day), Water and Protein are not', big === 'steps:true sleep:true water:false fuel:false', big);
    // A big count: the chip opens the number row, prefilled with the target (as the old circle did), and nothing is added by the tap itself.
    await p.click(chip('steps')); await p.waitForTimeout(250);
    const row = await p.evaluate(() => { const r = document.querySelector('#app .e-edit'), c = document.querySelector('#app .e-pill[data-k="epill:steps"]');
      return { open: !!r, field: r ? r.querySelector('input').value : null, unit: r ? r.querySelector('.e-field span').innerText.trim() : null, expanded: c.getAttribute('aria-expanded'), cls: c.classList.contains('open'), edit: UI.embedEdit }; });
    t.check('strip: tapping Steps opens the number row, prefilled with the target, and adds nothing', row.open && row.edit === 'steps' && row.field === '10,000' && row.unit.toLowerCase() === 'steps' && await val('steps') === s0, JSON.stringify(row) + ' ' + await val('steps'));
    t.check('strip: the chip whose row is open says so', row.expanded === 'true' && row.cls, JSON.stringify(row));
    await p.click('#app .e-save'); await p.waitForTimeout(250);
    t.check('strip: Save logs the number and closes the row', await val('steps') === 10000 && !(await p.$('#app .e-edit')) && await p.evaluate(() => UI.embedEdit) === null, s0 + ' -> ' + await val('steps'));
    t.check('strip: and the chip is done at 10k/10k', await p.evaluate(() => { const c = document.querySelector('#app .e-pill[data-k="epill:steps"]'); return c.classList.contains('done') && c.querySelector('.e-cc').innerText.trim() === '10k/10k'; }));
    // Sleep: a second tap on the same chip closes the row; a different value is typed and saved; the cancel button leaves the number alone.
    const sl0 = await val('sleep');
    await p.click(chip('sleep')); await p.waitForTimeout(250);
    t.check('strip: tapping Sleep opens its row (at what is logged, 8.0, since that is over the target)', await p.evaluate(() => UI.embedEdit) === 'sleep' && await p.evaluate(() => document.querySelector('#app .e-edit input').value) === '8.0', await p.evaluate(() => document.querySelector('#app .e-edit input').value));
    await p.click(chip('sleep')); await p.waitForTimeout(250);
    t.check('strip: a second tap on the same chip closes the row', !(await p.$('#app .e-edit')) && await val('sleep') === sl0);
    await p.click(chip('sleep')); await p.waitForTimeout(250);
    await p.fill('#app .e-edit input', '6.5'); await p.waitForTimeout(150);
    await p.click('#app .e-edit .e-acts button[aria-label="Cancel"]'); await p.waitForTimeout(250);
    t.check('strip: the cancel button closes the row and changes nothing', !(await p.$('#app .e-edit')) && await val('sleep') === sl0, sl0 + ' -> ' + await val('sleep'));
    await p.click(chip('sleep')); await p.waitForTimeout(250);
    await p.fill('#app .e-edit input', '6.5'); await p.waitForTimeout(150);
    await p.click('#app .e-save'); await p.waitForTimeout(250);
    t.check('strip: a typed number is saved (6.5 hours), and the chip says 6.5/7.5', await val('sleep') === 6.5 && await p.evaluate(() => document.querySelector('#app .e-pill[data-k="epill:sleep"] .e-cc').innerText.trim()) === '6.5/7.5', await val('sleep'));
    await p.click(chip('mobility')); await p.waitForTimeout(250);
    t.check('strip: tapping a done checked habit clears it', m0 >= 1 && await val('mobility') === 0, m0 + ' -> ' + await val('mobility'));
    await p.click(chip('breathe')); await p.waitForTimeout(250);
    t.check('strip: tapping an undone checked habit ticks it', b0 === 0 && await val('breathe') === 1, b0 + ' -> ' + await val('breathe'));
    const lockedBefore = await val('strength');
    await p.click('#app .e-pill.locked', { force: true }).catch(() => {}); await p.waitForTimeout(250);
    t.check('strip: tapping the session changes nothing', await val('strength') === lockedBefore, lockedBefore + ' -> ' + await val('strength'));
    const verdict = await p.evaluate(() => document.querySelector('#app .e-n').innerText.trim());
    t.check('strip: the verdict follows the taps ("2 to go" became something else)', verdict !== '2 to go', verdict);
    t.check('strip: no page errors after the taps', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  for (const w of [390, 320]) {
    // The training app's side of the contract: the frame's message says state "ready" and the height, again when the content changes, and the theme message turns it dark.
    const { ctx, p } = await open({ w, url: '/habits.html?embed=1' });
    const q = await ctx.newPage();
    await q.goto(H.BASE + '/robots.txt');
    await q.evaluate(width => {
      window.__msgs = [];
      addEventListener('message', e => { if (e.data && e.data.type === 'aa-proof-embed') window.__msgs.push(e.data); });
      const f = document.createElement('iframe'); f.src = '/habits.html?embed=1'; f.id = 'pf'; f.style.cssText = 'width:' + width + 'px;height:100px;border:0;display:block';
      document.body.appendChild(f);
    }, w);
    await q.waitForFunction(() => window.__msgs.some(m => m.state === 'ready' && m.h > 0), null, { timeout: 15000 }).catch(() => {});
    await q.waitForTimeout(500);
    const r = await q.evaluate(() => {
      const f = document.getElementById('pf'), d = f.contentDocument, last = window.__msgs[window.__msgs.length - 1] || {};
      return { msgs: window.__msgs.length, state: last.state, h: last.h, type: last.type, real: Math.ceil(d.getElementById('app').getBoundingClientRect().height), sx: d.documentElement.scrollWidth - d.documentElement.clientWidth, keys: Object.keys(last).sort().join() };
    });
    t.check(`contract (${w} px): a message {type: aa-proof-embed, state: ready, h} with the height of the content`, r.type === 'aa-proof-embed' && r.state === 'ready' && r.h > 0 && Math.abs(r.h - r.real) <= 1 && r.keys === 'h,state,type', JSON.stringify(r));
    t.check(`contract (${w} px): the frame has no sideways scroll`, r.sx <= 0, r.sx);
    // The number row opens under the chips: the message carries the taller height at once, and the shorter one again when it closes.
    const lastH = () => q.evaluate(() => { const m = window.__msgs[window.__msgs.length - 1] || {}, d = document.getElementById('pf').contentDocument; return { h: m.h, state: m.state, real: Math.ceil(d.getElementById('app').getBoundingClientRect().height), n: window.__msgs.length }; });
    const h0 = await lastH();
    await q.evaluate(() => document.getElementById('pf').contentDocument.querySelector('#app .e-pill[data-k="epill:steps"]').click());
    await q.waitForTimeout(500);
    const h1 = await lastH();
    t.check(`contract (${w} px): opening the number row sends a taller height, the row's`, h1.h > h0.h && Math.abs(h1.h - h1.real) <= 1 && h1.state === 'ready' && h1.n > h0.n, JSON.stringify({ h0, h1 }));
    await q.evaluate(() => document.getElementById('pf').contentDocument.querySelector('#app .e-pill[data-k="epill:steps"]').click());
    await q.waitForTimeout(500);
    const h2 = await lastH();
    t.check(`contract (${w} px): closing it sends the first height again`, h2.h === h0.h && Math.abs(h2.h - h2.real) <= 1, JSON.stringify({ h0, h2 }));
    const fit = await q.evaluate(() => { const d = document.getElementById('pf').contentDocument; return d.documentElement.scrollWidth - d.documentElement.clientWidth; });
    t.check(`contract (${w} px): still no sideways scroll after it`, fit <= 0, fit);
    await q.evaluate(() => document.getElementById('pf').contentWindow.postMessage({ type: 'aa-proof-theme', dark: true }, location.origin));
    await q.waitForTimeout(500);
    const dk = await q.evaluate(() => { const d = document.getElementById('pf').contentDocument; return { dark: d.body.hasAttribute('data-dark'), bg: getComputedStyle(d.querySelector('#app .e-pill')).backgroundColor }; });
    t.check(`contract (${w} px): the theme message turns the strip dark`, dk.dark && dk.bg === rgb(32, 32, 32), JSON.stringify(dk));
    await ctx.close();
  }
  {
    // A habit the athlete made has a long name: cut at a word, never past the row.
    const { ctx, p } = await open({ w: 320, url: '/habits.html?embed=1', cfg: { custom: [{ id: 'c_long_1', name: 'NO SCREENS IN BED OR AT THE TABLE', goal: 'x' }, { id: 'c_one_1', name: 'SUPERCALIFRAGILISTIC', goal: 'x' }], on: { c_long_1: true, c_one_1: true } } });
    const r = await p.evaluate(() => ({ labels: [...document.querySelectorAll('#app .e-pill .e-cn')].map(e => e.innerText.trim()), sx: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    t.check('strip: a long custom name is cut at a word, or at 11 characters when it is one long word', r.labels.indexOf('No screens…') >= 0 && r.labels.indexOf('Supercalifr…') >= 0, r.labels.join(' | '));
    t.check('strip: and nothing overflows at 320 px', r.sx <= 0, r.sx);
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
