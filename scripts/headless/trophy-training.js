// Career Mode phase 3, the catalogue switch, in the TRAINING app (career/CAREER_MODE.md → GAME-13, GAME-14, round 4; career/PROCEDURES.md → P8, P17;
// PROGRAM-APP.md → Rewards (Career Mode phase 3)): node scripts/headless/trophy-training.js
//
// What the athlete meets once get_profile().switch.catalogue is a day, and what they meet before it (nothing new), on made-up profiles from the stub:
//   inert        catalogue null: the finish card, the finished card and the Career row are exactly phase 2's, no career_told, goCareer() still opens the Locker.
//   finish card  under "This session earns", up to three lines for the training badges the session moves, from the profile's shelf (Century, Paper Trail,
//                Pulse Check, Hold Serve, Second Serve): "Century 24 of 25", or "Century I reached" in clay when it takes a step (a step first); none on a
//                session that pays nothing, none for Century on a repeat; the note that they count once the session is saved.
//   after Done   the profile that comes back after the session reached the server carries its moments: a win is a quiet line, a highlight a band with
//                Share (the share sheet, the card drawn), a milestone or a legend a full-screen moment, one at a time with the rest queued, Back closes it;
//                what was shown is told once (career_told), AA Proof's moments (app = 'habits') are never ours; a reload shows the band quietly.
//   at boot      a milestone earned while the app was closed shows once (never over the Welcome); a highlight waits for the next finished card.
//   never        in the demo or the coach's preview (no profile, no moment, no career_told); nothing of it is synced; 320 px fits.
// Serve the repo first (python -m http.server 8792 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.toISOString().slice(0, 10);
const at = n => ymd(new Date(Date.now() + n * DAY));
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'career', 'xp_cases.json'), 'utf8'));
const LEVEL = CASES.rules.level;
const PRICES = { session_finished: 400, session_finished_early: 200, full_log: 50, checkin_done: 20, week_held: 400, bounce_back: 100,
                 training_return: 50, library_session: 100, retest_done: 50 };
function lvl(xp) {
  const cost = n => Math.max(10, Math.round(LEVEL.base * Math.pow(n, LEVEL.growth) / 10) * 10);
  let l = 1, spent = 0, c = cost(1);
  while (xp - spent >= c) { spent += c; l++; c = cost(l); }
  const i = l - 1, within = i % LEVEL.prestige_after, star = Math.floor(i / LEVEL.prestige_after);
  return { level: l, rank: (star ? '★' + star + ' ' : '') + LEVEL.ranks[Math.floor(within / LEVEL.levels_per_rank)] + ' ' + (within % LEVEL.levels_per_rank + 1),
           xp_in_level: xp - spent, level_cost: c, to_next: c - (xp - spent) };
}
const SWITCH_DAY = at(-1);
const TODAY = at(0);

// ── the shelf and the moments the server's get_profile() would carry (the contract: the spec file's UPDATE paragraph) ──
const step = (tier, atN, metal, o) => Object.assign({ tier, at: atN, metal, xp: 100 * tier, size: 'highlight', tier_name: null, title: null, day: null, how: null }, o || {});
function badge(id, name, meaning, n, nextAt, o) {
  o = o || {};
  const owned = o.tier || 0, metals = ['bronze', 'silver', 'emerald', 'amethyst', 'prismatic'];
  return Object.assign({ id, name, meaning, kind: id === 'held_weeks' ? 'best_run' : 'total', habit: null, free: false, origin: 'new', retired: false, superseded_by: null, sub: '',
    caption: name + ' ' + n, n, tier: owned, metal: owned ? metals[owned - 1] : null,
    steps: [step(1, nextAt, 'bronze', owned >= 1 ? { day: at(-30), how: 'earned' } : {})],
    next: { tier: owned + 1, at: nextAt, metal: metals[owned], xp: 300 } }, o);
}
function shelf(o) {
  o = o || {};
  return { badges: [
      badge('held_weeks', 'Hold Serve', 'consistency', o.heldN == null ? 2 : o.heldN, 4, { now: o.heldNow == null ? 2 : o.heldNow }),
      badge('century', 'Century', 'commitment', o.centuryN == null ? 23 : o.centuryN, 25),
      badge('full_log', 'Paper Trail', 'commitment', o.logN == null ? 8 : o.logN, 10),
      badge('pulse_check', 'Pulse Check', 'commitment', o.pulseN == null ? 4 : o.pulseN, 10),
      badge('bounce_back', 'Second Serve', 'resilience', o.bounceN == null ? 0 : o.bounceN, 1),
    ],
    achievements: [{ id: 'first_cycle', name: 'First Cycle', meaning: 'commitment', size: 'milestone', xp: 300, caption: 'A whole cycle, finished.', rule: 'The first cycle finished.',
      free: false, origin: 'new', retired: false, title: null, day: null, how: null }],
    titles: [{ id: 'century', name: 'CENTURY', meaning: 'commitment', metal: 'emerald', from: 'Century, emerald: 100 sessions with Amir', day: at(-3) }],
    grand_slam: { consistency: null, commitment: null, progress: null, resilience: null, done: null } };
}
const M = {
  century1: { key: 'badge:century::1', kind: 'badge', id: 'century', tier: 1, name: 'Century', meaning: 'commitment', metal: 'bronze', size: 'highlight', xp: 300, day: TODAY,
              caption: '25 sessions with Amir.', title: null, app: 'training' },
  held: { key: 'achievement:held::0', kind: 'achievement', id: 'held', tier: 0, name: 'Held', meaning: 'consistency', metal: null, size: 'win', xp: 100, day: TODAY,
          caption: 'Your first held week. Every session, on your days.', title: null, app: 'training' },
  firstCycle: { key: 'achievement:first_cycle::0', kind: 'achievement', id: 'first_cycle', tier: 0, name: 'First Cycle', meaning: 'commitment', metal: null, size: 'milestone', xp: 300,
                day: TODAY, caption: 'A whole cycle, finished.', title: null, app: 'training' },
  closer: { key: 'badge:finisher::1', kind: 'badge', id: 'finisher', tier: 1, name: 'Closer', meaning: 'commitment', metal: 'bronze', size: 'milestone', xp: 100, day: TODAY,
            caption: '1 cycles finished.', title: null, app: 'training' },
  titleCentury: { key: 'title:century::0', kind: 'title', id: 'century', tier: 0, name: 'CENTURY', meaning: 'commitment', metal: 'emerald', size: 'legend', xp: 0, day: TODAY,
                  caption: 'Century, emerald', title: null, app: 'training' },
  fullStack: { key: 'achievement:full_stack::0', kind: 'achievement', id: 'full_stack', tier: 0, name: 'Full Stack', meaning: 'consistency', metal: null, size: 'milestone', xp: 200,
               day: TODAY, caption: 'Four habits, seven days each, all at once.', title: null, app: 'habits' },
};
function profile(o) {
  o = o || {};
  const xp = o.xp == null ? 10000 : o.xp, on = o.catalogue !== false;
  const p = { athlete_id: H.ID, ready: true, shadow: false, switch: { xp: SWITCH_DAY, catalogue: on ? SWITCH_DAY : null }, rules_version: 4,
    career: Object.assign({ xp, habits: {}, facts: {}, facts_xp: 0, awards_xp: 0 }, lvl(xp)),
    season: { name: 'Season 1', starts_on: at(-2), points: 1234 }, week: { from: at(-6), points: 900 }, since: '2026-06-06', kept: null,
    numbers: { weeks_held: { now: 2, best: 4 }, sessions_with_amir: 24, personal_bests: 3, comebacks: 1, days_on_target: 40, perfect_days: 10 },
    titles_owned: [], rules: { version: 4, level: LEVEL, season: { title_points: 2000 }, prices: PRICES },
    badges: [], achievements: [], missions: [], quest: null, moments: o.moments || [], reveal: null };
  if (on && o.shelf !== false) p.shelf = o.shelf || shelf(o.shelfOpts);
  return p;
}
const RULES_ON = [{ version: 4, switch: { xp: SWITCH_DAY, catalogue: SWITCH_DAY } }];
const fmt = n => n.toLocaleString('en-US');

function prog({ start = -10, days } = {}) {
  const P = H.fixture({ dated: false });
  P.cycles.forEach((c, i) => { const s = start + (i - P.currentCycleIndex) * 35; c.startDate = at(s); c.endDate = at(s + 34); });
  if (days) P.workouts.days = P.workouts.days.slice(0, days);
  return P;
}
const W = (kind, c, w, n) => ({ kind: kind === 'H' ? 'week_held' : 'week_broken', ref: `c${c}|w${w}`, day: at(n), value: { cycle: c, week: w } });
const SHARE_STUB = `window.__shared = []; Object.defineProperty(navigator, 'canShare', { value: d => !!(d && d.files && d.files.length), configurable: true });
  Object.defineProperty(navigator, 'share', { value: d => { window.__shared.push({ n: (d.files || []).length, name: d.files && d.files[0] && d.files[0].name, text: d.text }); return Promise.resolve(); }, configurable: true });`;

async function openP(browser, o = {}) {
  const stub = Object.assign({ tables: { career_rules: o.rules || RULES_ON, career_facts: o.facts || [] } },
    o.profile === null ? {} : { profile: o.profile || profile() }, o.stub || {});
  const r = await H.openProgram(browser, Object.assign({ w: o.w || 390, h: 844, tz: 'UTC', prog: o.prog || prog(), hist: o.hist || [], stub, seed: o.seed || {},
    query: o.query || '' }, o.opts || {}));
  await r.p.evaluate(SHARE_STUB);
  return r;
}
const calls = (p, name) => p.evaluate(n => (window.__STUB.calls || []).filter(c => c === n).length, name);
const told = p => p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'career_told').map(x => x[1] && x[1].p_keys));
const waitRow = (p, ms) => p.waitForFunction(() => !!document.querySelector('#home-career-wrap .hrow'), null, { timeout: ms || 6000 }).then(() => true, () => false);
const badgeLines = (p, day) => p.evaluate(d => [...document.querySelectorAll('#confirm-' + (d || 1) + ' .cf-badge')].map(e => e.textContent.replace(/\s+/g, ' ').trim()), day);
const noteLine = p => p.evaluate(() => { const e = document.querySelector('#confirm-1 .cf-badge-note'); return e ? e.textContent.trim() : null; });
async function tickAll(p) {
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
async function toReady(p, o = {}) {
  await p.evaluate(([checkin, id]) => {
    openDayView('1');
    const t0 = Date.now() - 754000;
    localStorage.setItem(timerKey('1'), JSON.stringify({ running: true, resumeAt: t0, acc: 0, sessionStart: t0 }));
    // The check-in answered first (readinessKey(day)): what careerCheckin() reads. Left out, the session is not checked in.
    if (checkin) localStorage.setItem(id + '_readiness_1', JSON.stringify({ timestamp: new Date().toISOString(), sleep: 4, energy: 4, soreness: 4, stress: 4, overall: 4, composite: 4, skipped: false }));
    renderTimer('1');
  }, [!!o.checkin, H.ID]);
  await p.waitForTimeout(250);
  await tickAll(p);
}
// Rate, then Done (the same tap the athlete makes), with the profile the server will answer next already set.
async function done(p, nextProfile) {
  await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
  await p.waitForTimeout(200);
  if (nextProfile) await p.evaluate(pr => { window.__STUB.profile = pr; }, nextProfile);
  await p.evaluate(() => finishTap('1', document.querySelector('#confirm-1 .confirm-btn')));
}
const slot = p => p.evaluate(() => {
  const s = document.getElementById('hlwin-1');
  return { bands: [...s.querySelectorAll('.hl-band')].map(b => [...b.querySelector('.hl-band-t').children].map(c => c.textContent.replace(/\s+/g, ' ').trim()).join(' ')),
           lines: [...s.querySelectorAll('.hl-line')].map(l => l.textContent.replace(/\s+/g, ' ').trim()),
           isNew: s.querySelectorAll('.hl-band.is-new').length, h: Math.round(s.getBoundingClientRect().height) };
});
const moment = p => p.evaluate(() => {
  const m = document.querySelector('.hl-moment');
  return m ? { eyebrow: m.querySelector('.hl-m-eyebrow').textContent.trim(), title: m.querySelector('.hl-m-title').textContent.trim(),
               sub: (m.querySelector('.hl-m-sub') || {}).textContent || '', words: m.querySelector('.hl-m-sheet p').textContent.trim(),
               go: m.querySelector('.hl-m-go').textContent.trim() } : null;
});
const waitMoment = (p, ms) => p.waitForFunction(() => !!document.querySelector('.hl-moment'), null, { timeout: ms || 8000 }).then(() => true, () => false);
const waitCard = p => p.waitForFunction(() => { const i = document.querySelector('.hl-moment .hl-m-card img'); return i && /^blob:/.test(i.getAttribute('src') || '') && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 }).then(() => true, () => false);

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const L10 = lvl(10000);

  // ── 1. INERT: the catalogue switch is not a day. Phase 2's finish card, no reward on it, nothing told, the Locker ──
  {
    const off = profile({ catalogue: false, moments: [M.firstCycle, M.century1] });
    off.shelf = shelf();                     // even a shelf and moments that arrive early change nothing before the switch
    const { ctx, p } = await openP(browser, { profile: off });
    await waitRow(p);
    C.check('inert: catalogueOnT() is false with switch.catalogue null', await p.evaluate(() => catalogueOnT() === false));
    await toReady(p);
    const earn = await p.evaluate(() => document.querySelector('#confirm-1 .confirm-earn').innerText.replace(/\s+/g, ' ').trim());
    C.check('inert: the finish card is phase 2\'s, word for word', earn === 'THIS SESSION EARNS +450 XP Session 400 · Every set logged 50', earn);
    C.check('inert: no badge line, no note', (await badgeLines(p)).length === 0 && (await noteLine(p)) === null);
    await done(p, off);
    await p.waitForTimeout(1800);
    const s = await slot(p);
    C.check('inert: after Done no band, no line, no moment, nothing told, no key kept',
      s.bands.length === 0 && s.lines.length === 0 && !(await moment(p)) && (await told(p)).length === 0
      && !(await p.evaluate(id => localStorage.getItem(id + '_trophy_d1') || localStorage.getItem(id + '_trophy_seen'), H.ID)), JSON.stringify([s, await told(p)]));
    C.check('inert: the Career row\'s name for its door is the Locker, and goCareer() opens go=pass',
      await p.evaluate(() => /Locker/.test(document.querySelector('#home-career-wrap .hrow').getAttribute('aria-label'))), '');
    await p.evaluate(() => goCareer()); await p.waitForTimeout(800);
    C.check('inert: goCareer() opens AA Proof\'s Locker (go=pass)', /habits\.html\?client=rel01_athlete.*&go=pass/.test(p.url()), p.url());
    C.check('inert: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 1b. a boot with a milestone waiting, catalogue null: nothing shows
  {
    const { ctx, p } = await openP(browser, { profile: Object.assign(profile({ catalogue: false }), { moments: [M.firstCycle] }) });
    await waitRow(p);
    await p.waitForTimeout(1500);
    C.check('inert: a milestone waiting at boot shows nothing and is not told', !(await moment(p)) && (await told(p)).length === 0);
    await ctx.close();
  }

  // ── 2. THE FINISH CARD, before Done ──
  // 2a. a plain session: every set logged, no check-in, the week not complete with it
  {
    const { ctx, p } = await openP(browser, { profile: profile({ shelfOpts: {} }) });
    await waitRow(p);
    C.check('on: catalogueOnT() is true', await p.evaluate(() => catalogueOnT() === true));
    await toReady(p);
    const lines = await badgeLines(p);
    C.check('finish card: "Century 24 of 25" and "Paper Trail 9 of 10", nothing for Pulse Check (no check-in) or Hold Serve (the week is not complete)',
      JSON.stringify(lines) === JSON.stringify(['Century 24 of 25', 'Paper Trail 9 of 10']), JSON.stringify(lines));
    C.check('finish card: they say they count once the session is saved', (await noteLine(p)) === 'These count once your session is saved.', await noteLine(p));
    const earn = await p.evaluate(() => document.querySelector('#confirm-1 .confirm-earn .cf-earn b').textContent);
    C.check('finish card: the XP line is unchanged (+450 XP), the badges add nothing to it', earn === '+450 XP', earn);
    const look = await p.evaluate(() => { const e = document.querySelector('#confirm-1 .cf-badge'); const s = getComputedStyle(e); return { fs: parseFloat(s.fontSize), shown: e.getBoundingClientRect().height > 0 }; });
    C.check('finish card: the lines are shown, at least 12 px', look.shown && look.fs >= 12, JSON.stringify(look));
    // the profile follows: a fresh answer repaints an open card (Century now at 49 of 50)
    await p.evaluate(pr => { window.__STUB.profile = pr; }, profile({ shelfOpts: { centuryN: 20 } }));
    await p.evaluate(() => refreshCareer()); await p.waitForTimeout(700);
    C.check('finish card: a new profile repaints the open card (Century 21 of 25)', JSON.stringify(await badgeLines(p)) === JSON.stringify(['Century 21 of 25', 'Paper Trail 9 of 10']), JSON.stringify(await badgeLines(p)));
    C.check('finish: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }
  // 2b. a step reached goes first, in words and in clay; the check-in adds Pulse Check
  {
    const { ctx, p } = await openP(browser, { profile: profile({ shelfOpts: { centuryN: 24, pulseN: 9 } }) });
    await waitRow(p);
    await toReady(p, { checkin: true });
    const lines = await badgeLines(p);
    C.check('finish card: Century takes its step ("Century I reached"), first; then Paper Trail 9 of 10 and Pulse Check 10 of 10 (a step too)',
      JSON.stringify(lines) === JSON.stringify(['Century I reached', 'Pulse Check I reached', 'Paper Trail 9 of 10']), JSON.stringify(lines));
    const clay = await p.evaluate(() => { const e = document.querySelector('#confirm-1 .cf-badge.is-step em'); const s = getComputedStyle(e); return { text: e.textContent, color: s.color, weight: s.fontWeight }; });
    C.check('finish card: the numeral of a step reached is clay-ink and bold', clay.text === 'I' && /rgb\((18[0-9]|19\d|20\d), (6\d|7\d), (2\d|3\d|4\d)\)/.test(clay.color) && Number(clay.weight) >= 600, JSON.stringify(clay));
    await ctx.close();
  }
  // 2c. a repeat of a day done this week: the session itself pays once, so Century does not move; the full log still pays, so Paper Trail does
  {
    const { ctx, p } = await openP(browser, { hist: [{ completed_on: at(-1), day: '1', readiness: 4, log: [] }] });
    await waitRow(p);
    await toReady(p);
    const lines = await badgeLines(p);
    C.check('finish card, a repeat: no Century line, Paper Trail still moves', JSON.stringify(lines) === JSON.stringify(['Paper Trail 9 of 10']), JSON.stringify(lines));
    await ctx.close();
  }
  // 2d. the session that completes the week, after a broken one: Hold Serve and Second Serve; three lines at most, a step first
  {
    const facts = [W('H', 1, 4, -20), W('B', 1, 5, -13)];
    const { ctx, p } = await openP(browser, { prog: prog({ days: 2 }), facts, hist: [{ completed_on: at(-1), day: '2', readiness: 4, log: [] }],
      profile: profile({ shelfOpts: { heldN: 1, heldNow: 1 } }) });
    await waitRow(p);
    await toReady(p);
    const lines = await badgeLines(p);
    C.check('finish card, the week: "Second Serve I reached" first, then "Hold Serve 2 of 4" and "Century 24 of 25"; Paper Trail is the fourth and left off',
      JSON.stringify(lines) === JSON.stringify(['Second Serve I reached', 'Hold Serve 2 of 4', 'Century 24 of 25']), JSON.stringify(lines));
    await ctx.close();
  }
  // 2e. the rules, on the function itself: nothing when the shelf cannot say, a longer older run, a maxed badge, a retired one, a session that pays nothing
  {
    const { ctx, p } = await openP(browser, {});
    await waitRow(p);
    const t = await p.evaluate(() => {
      const base = JSON.parse(JSON.stringify(CAREER_T.p.shelf));
      const run = (edit, parts, repeat) => { CAREER_T.p.shelf = JSON.parse(JSON.stringify(base)); if (edit) edit(CAREER_T.p.shelf); return trophyMoves(parts, repeat).map(x => x.id + ':' + x.value + '/' + x.at + (x.step ? '!' : '')); };
      const all = [{ k: 'session' }, { k: 'log' }, { k: 'checkin' }, { k: 'week' }, { k: 'back' }];
      const find = (s, id) => s.badges.find(b => b.id === id);
      return {
        all: run(null, all, false),
        nothingPays: run(null, [], false),
        earlyCounts: run(null, [{ k: 'early' }], false),
        nUnknown: run(s => { find(s, 'century').n = null; }, [{ k: 'session' }], false),
        maxed: run(s => { find(s, 'century').next = null; }, [{ k: 'session' }], false),
        retired: run(s => { find(s, 'century').retired = true; }, [{ k: 'session' }], false),
        olderRun: run(s => { find(s, 'held_weeks').n = 6; find(s, 'held_weeks').now = 2; }, [{ k: 'session' }, { k: 'week' }], false),
        runBest: run(s => { find(s, 'held_weeks').n = 2; find(s, 'held_weeks').now = 2; }, [{ k: 'session' }, { k: 'week' }], false),
        noNow: run(s => { delete find(s, 'held_weeks').now; }, [{ k: 'session' }, { k: 'week' }], false),
        weekOnRepeat: run(null, [{ k: 'log' }, { k: 'week' }], true),
        noShelf: (() => { CAREER_T.p.shelf = undefined; return trophyMoves([{ k: 'session' }], false); })(),
        roman: [1, 4, 9, 14, 39, 40, 0].map(trophyRoman),
      };
    });
    C.check('moves: all five candidates → three, a step first, then the listed order', JSON.stringify(t.all) === JSON.stringify(['bounce_back:1/1!', 'held_weeks:3/4', 'century:24/25']), JSON.stringify(t.all));
    C.check('moves: a session that pays nothing moves nothing', t.nothingPays.length === 0, JSON.stringify(t.nothingPays));
    C.check('moves: a session finished early counts for Century', JSON.stringify(t.earlyCounts) === JSON.stringify(['century:24/25']), JSON.stringify(t.earlyCounts));
    C.check('moves: an unknown count, a maxed badge and a retired one say nothing', t.nUnknown.length === 0 && t.maxed.length === 0 && t.retired.length === 0, JSON.stringify([t.nUnknown, t.maxed, t.retired]));
    C.check('moves: Hold Serve inside an older, longer run moves nothing; on the best run it does; no "now" from the server, nothing',
      t.olderRun.join() === 'century:24/25' && t.runBest.join() === 'held_weeks:3/4,century:24/25' && t.noNow.join() === 'century:24/25', JSON.stringify([t.olderRun, t.runBest, t.noNow]));
    C.check('moves: a repeat never holds a week', t.weekOnRepeat.join() === 'full_log:9/10', JSON.stringify(t.weekOnRepeat));
    C.check('moves: no shelf, no lines', Array.isArray(t.noShelf) && t.noShelf.length === 0);
    C.check('roman numerals for the step reached', JSON.stringify(t.roman) === JSON.stringify(['I', 'IV', 'IX', 'XIV', 'XXXIX', '', '']), JSON.stringify(t.roman));
    await ctx.close();
  }

  // ── 3. AFTER DONE: the profile that comes back carries the moments ──
  {
    const after = profile({ xp: 10470, moments: [M.titleCentury, M.closer, M.century1, M.held, M.fullStack] });
    const { ctx, p } = await openP(browser, { profile: profile() });
    await waitRow(p);
    await toReady(p);
    await done(p, after);
    // the wins and the highlight are on the card first, the legend comes full screen
    const gotMoment = await waitMoment(p, 9000);
    const s = await slot(p);
    C.check('after Done: a highlight is a band with Share, a win one quiet line (under the card, in its green)',
      JSON.stringify(s.bands) === JSON.stringify(['New badge Century Bronze I']) && JSON.stringify(s.lines) === JSON.stringify(['Achievement: Held']), JSON.stringify(s));
    C.check('after Done: the band pops once (is-new)', s.isNew === 1, s.isNew);
    const m1 = await moment(p);
    C.check('after Done: the biggest moment comes full screen first: the legend, "Title · Commitment" over CENTURY',
      gotMoment && m1 && m1.eyebrow === 'Title · Commitment' && m1.title === 'CENTURY' && m1.sub === 'Century, emerald: 100 sessions with Amir' && m1.go === 'Share your title', JSON.stringify(m1));
    C.check('after Done: his words, plain', m1 && m1.words === 'This title is yours now. Here’s your card if you want to share it.', m1 && m1.words);
    C.check('after Done: the card itself is drawn on the moment (1080 × 1920, the title template)', await waitCard(p)
      && await p.evaluate(() => { const i = document.querySelector('.hl-moment .hl-m-card img'); return i.naturalWidth === 1080 && i.naturalHeight === 1920 && /New title: CENTURY/.test(i.alt); }), '');
    const t1 = await told(p);
    C.check('after Done: the win and the band are told at once (one call), the legend as it opens; AA Proof\'s Full Stack never',
      JSON.stringify(t1.flat().sort()) === JSON.stringify(['achievement:held::0', 'badge:century::1', 'title:century::0']) && !t1.flat().includes('achievement:full_stack::0'), JSON.stringify(t1));
    // Back closes the moment, then the next one in the queue (the milestone, Closer) follows
    await p.evaluate(() => history.back());
    await p.waitForTimeout(300);
    C.check('Back closes the moment', !(await moment(p)));
    const second = await waitMoment(p, 6000);
    const m2 = await moment(p);
    C.check('one at a time: the queue goes on with the milestone, "Badge · Commitment" over Closer, Bronze I',
      second && m2 && m2.eyebrow === 'Badge · Commitment' && m2.title === 'Closer' && m2.sub === 'Bronze I' && m2.go === 'Share your badge'
      && m2.words === 'You earned this one. Here’s your card if you want to share it.', JSON.stringify(m2));
    await waitCard(p);
    C.check('one at a time: every key told exactly once', await (async () => { const all = (await told(p)).flat(); return all.length === 4 && new Set(all).size === 4 && all.includes('badge:finisher::1'); })(), JSON.stringify(await told(p)));
    // its Share opens the share sheet on the card (Highlight Reel's sheet) with the phone's Back closing it
    await p.click('.hl-moment .hl-m-go');
    await p.waitForFunction(() => { const i = document.getElementById('hl-img'); return i && /^blob:/.test(i.getAttribute('src') || '') && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 });
    const sh = await p.evaluate(() => ({ title: document.getElementById('hl-title').textContent, eyebrow: document.querySelector('#hist-overlay .readiness-eyebrow').textContent,
      alt: document.getElementById('hl-img').alt, weightsHidden: !!(document.querySelector('#hist-overlay .hl-tg[data-k="weights"]') || {}).hidden }));
    C.check('Share on a moment opens the sheet on the badge card: "Share your badge", the caption says Closer, no weights switch',
      sh.title === 'Share your badge' && sh.eyebrow === 'Highlight Reel' && /^Closer, Bronze\./.test(sh.alt) && /@amirardekanian/.test(sh.alt) && sh.weightsHidden, JSON.stringify(sh));
    await p.evaluate(() => history.back()); await p.waitForTimeout(400);
    C.check('Back closes the sheet', await p.evaluate(() => !document.getElementById('hist-overlay').classList.contains('visible')));
    // the band's Share: the same sheet, the Century badge
    await p.click('#hlwin-1 .hl-band');
    await p.waitForFunction(() => { const i = document.getElementById('hl-img'); return i && /^blob:/.test(i.getAttribute('src') || '') && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 });
    const sh2 = await p.evaluate(() => ({ title: document.getElementById('hl-title').textContent, alt: document.getElementById('hl-img').alt }));
    C.check('the band\'s Share opens the badge card for Century', sh2.title === 'Share your badge' && /^Century, Bronze\./.test(sh2.alt), JSON.stringify(sh2));
    await p.click('#hl-share'); await p.waitForTimeout(300);
    const shared = await p.evaluate(() => window.__shared);
    C.check('Share hands the phone one png (aa-highlight-badge-story.png) with the caption', shared.length === 1 && shared[0].n === 1 && shared[0].name === 'aa-highlight-badge-story.png' && /@amirardekanian/.test(shared[0].text || ''), JSON.stringify(shared));
    await p.evaluate(() => history.back()); await p.waitForTimeout(400);
    // kept on this phone, never synced
    const keys = await p.evaluate(id => ({ kept: JSON.parse(localStorage.getItem(id + '_trophy_d1') || 'null'), seen: JSON.parse(localStorage.getItem(id + '_trophy_seen') || '[]'),
      synced: Object.keys(_snapshot()).filter(k => /trophy/.test(k)) }), H.ID);
    C.check('kept for the finished card, tied to its finish stamp; the shown keys remembered; neither ever synced',
      keys.kept && keys.kept.items.length === 2 && keys.kept.items[0].spec && keys.kept.items[0].spec.kind === 'badge' && !keys.kept.items[1].spec && keys.seen.length === 4 && keys.synced.length === 0, JSON.stringify(keys).slice(0, 300));
    C.check('after Done: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    // a reload: the band and the line are there again, quietly; a moment already shown does not come back, though the (stub's) server still lists it
    await p.evaluate(pr => { const c = JSON.parse(localStorage.getItem('__stubcfg')); c.profile = pr; localStorage.setItem('__stubcfg', JSON.stringify(c)); }, after);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 15000 });
    await p.waitForTimeout(2500);
    await p.evaluate(() => openDayView('1'));
    const s2 = await slot(p);
    C.check('a reload shows the band and the line again, quietly (no pop)', s2.bands.length === 1 && s2.lines.length === 1 && s2.isNew === 0, JSON.stringify(s2));
    C.check('a reload: nothing shown again, though the stub\'s server still lists the moments untold', !(await moment(p)));
    C.check('a reload: the shown keys are told again, since the server still lists them (a tell that never got through)',
      (await told(p)).flat().length === 4 && !(await told(p)).flat().includes('achievement:full_stack::0'), JSON.stringify(await told(p)));
    await ctx.close();
  }
  // 3b. a milestone without a card to draw falls back to a line; a badge with no metal cannot make a card
  {
    const odd = Object.assign({}, M.closer, { key: 'badge:finisher::9', metal: null });
    const { ctx, p } = await openP(browser, { profile: profile() });
    await waitRow(p);
    await toReady(p);
    await done(p, profile({ moments: [odd] }));
    await p.waitForTimeout(2200);
    const s = await slot(p);
    C.check('a reward the painter cannot draw (no metal) is a quiet line, not a moment', !(await moment(p)) && s.bands.length === 0 && s.lines.length === 1 && /^New badge: Closer/.test(s.lines[0]), JSON.stringify(s));
    await ctx.close();
  }
  // 3b2. a session that reached the server late (a replay at the next open): its finished card is nobody's screen, so nothing is put on it or told
  {
    const { ctx, p } = await openP(browser, {});
    await waitRow(p);
    const k = await p.evaluate(id => {
      const item = { key: 'badge:x::1', small: 'New badge', name: 'X', em: '', spec: null };
      localStorage.setItem(id + '_completed_d1', new Date(Date.now() - 86400000).toDateString() + '|' + progToken());
      const yesterday = trophyKeep('1', [item]);
      localStorage.setItem(id + '_completed_d1', stampCompleted());
      const today = trophyKeep('1', [item]);
      localStorage.setItem(id + '_completed_d1', 'Mon Jan 01 2001|c9');
      return { yesterday, today, otherProgramme: trophyKeep('1', [item]) };
    }, H.ID);
    C.check('a finished card is kept rewards only for a session finished today on this programme', k.yesterday === false && k.today === true && k.otherProgramme === false, JSON.stringify(k));
    await ctx.close();
  }
  // 3c. the spec builders: the shapes sharecard.js draws, English names, the right day
  {
    const { ctx, p } = await openP(browser, { profile: profile({ shelfOpts: { centuryN: 51 } }) });
    await waitRow(p);
    const t = await p.evaluate(async () => {
      const SC = await hlLib();
      const sh = CAREER_T.p.shelf;
      sh.badges[1].tier = 2; sh.badges[1].metal = 'silver'; sh.badges[1].steps = [{ tier: 1, at: 25, metal: 'bronze', day: '2026-08-19' }, { tier: 2, at: 50, metal: 'silver', day: '2026-09-30' }];
      const m = { key: 'badge:century::2', kind: 'badge', id: 'century', tier: 2, name: 'Century', meaning: 'commitment', metal: 'silver', day: '2026-09-30', caption: '{n} sessions with Amir.', app: 'training' };
      const b1 = hlBadgeSpec(m), b2 = hlBadgeSpec(sh.badges[1]), a = hlAchievementSpec({ id: 'first_cycle', name: 'First Cycle', meaning: 'commitment', caption: 'A whole cycle, finished.', day: '2026-10-01' });
      const ti = hlTitleSpec({ id: 'c_century', kind: 'title', name: 'CENTURY', meaning: 'commitment', metal: 'emerald', day: '2026-10-02' });
      const none = [hlBadgeSpec(sh.badges[3]), hlBadgeSpec(null), hlBadgeSpec(Object.assign({}, m, { metal: null }))];
      return { b1, b2, a, ti, none, can: [b1, b2, a, ti].map(s => SC.can(s)), cant: [SC.can({ kind: 'badge', name: 'x', metal: 'bronze', tier: 0 }), SC.can(none[2])], nameFa: [b1, a, ti].map(s => 'nameFa' in s || 'captionFa' in s) };
    });
    C.check('badge spec from a moment: kind, name, meaning, metal, tier, n from the shelf, {n} filled, the day',
      JSON.stringify(t.b1) === JSON.stringify({ kind: 'badge', first: 'Alex', name: 'Century', meaning: 'commitment', metal: 'silver', tier: 2, n: 51, caption: '51 sessions with Amir.', date: '2026-09-30' }), JSON.stringify(t.b1));
    C.check('badge spec from a shelf entry: the highest step owned, the day it was reached', t.b2 && t.b2.tier === 2 && t.b2.metal === 'silver' && t.b2.date === '2026-09-30' && t.b2.n === 51, JSON.stringify(t.b2));
    C.check('achievement spec: name, meaning, caption, day', JSON.stringify(t.a) === JSON.stringify({ kind: 'achievement', first: 'Alex', name: 'First Cycle', meaning: 'commitment', caption: 'A whole cycle, finished.', date: '2026-10-01' }), JSON.stringify(t.a));
    C.check('title spec: the shelf says what it was earned for (c_ stripped), the metal, the day',
      JSON.stringify(t.ti) === JSON.stringify({ kind: 'title', first: 'Alex', name: 'CENTURY', meaning: 'commitment', metal: 'emerald', from: 'Century, emerald: 100 sessions with Amir', date: '2026-10-02' }), JSON.stringify(t.ti));
    C.check('a badge not owned, nothing, or with no metal makes no spec', t.none.every(x => x === null), JSON.stringify(t.none));
    C.check('ShareCard.can() agrees for all three kinds and refuses an empty tier', t.can.every(Boolean) && t.cant.every(x => x === false), JSON.stringify([t.can, t.cant]));
    C.check('no nameFa or captionFa: reward names stay English on a Farsi card (call 5)', t.nameFa.every(x => x === false));
    await ctx.close();
  }

  // ── 4. AT BOOT ──
  {
    const prof = profile({ moments: [M.firstCycle, M.century1, M.held, M.fullStack] });
    const { ctx, p } = await openP(browser, { profile: prof });
    const got = await waitMoment(p, 9000);
    const m = await moment(p);
    C.check('boot: a milestone earned while the app was closed comes full screen once', got && m && m.eyebrow === 'Achievement · Commitment' && m.title === 'First Cycle' && m.sub === '' && m.go === 'Share it', JSON.stringify(m));
    await waitCard(p);
    const t = (await told(p)).flat();
    C.check('boot: told once; the highlight, the win and AA Proof\'s moment wait (not shown, not told)', JSON.stringify(t) === JSON.stringify(['achievement:first_cycle::0']), JSON.stringify(t));
    await p.click('.hl-moment .hl-m-skip'); await p.waitForTimeout(1500);
    C.check('boot: Not now closes it and nothing else follows', !(await moment(p)));
    C.check('boot: asked only once for the profile, a single read', await calls(p, 'rpc:get_profile') === 1, await calls(p, 'rpc:get_profile'));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 15000 });
    await p.waitForTimeout(2800);
    C.check('boot, again: it does not come back (this phone remembers it was shown)', !(await moment(p)));
    await ctx.close();
  }
  // 4b. never over the Welcome: it waits, then shows when the Welcome has gone
  {
    const { ctx, p } = await openP(browser, { profile: profile(), opts: { fresh: true } });
    // A first sign-in on this phone: the Welcome opens at boot (maybeWelcome() reads aa_fresh_signin), long before the profile is back. The
    // profile with the moment is only there from the reload on, so the first load has shown and told nothing.
    await p.evaluate(pr => {
      localStorage.setItem('aa_fresh_signin', '1');
      const c = JSON.parse(localStorage.getItem('__stubcfg')); c.profile = pr; localStorage.setItem('__stubcfg', JSON.stringify(c));
    }, profile({ moments: [M.firstCycle] }));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 15000 });
    await p.waitForTimeout(3500);
    const wel = await p.evaluate(() => !!document.querySelector('.wel'));
    C.check('boot, the Welcome: it is up, and no moment opens over it (nothing told yet)', wel && !(await moment(p)) && (await told(p)).length === 0, JSON.stringify([wel, await told(p)]));
    await p.evaluate(() => { const w = document.querySelector('.wel'); if (w) w.remove(); });
    const later = await waitMoment(p, 7000);
    C.check('boot, the Welcome: once it is gone the moment follows', later && (await moment(p)).title === 'First Cycle' && (await told(p)).flat().length === 1, JSON.stringify(await moment(p)));
    await ctx.close();
  }

  // 4c. back in the foreground after ten minutes or more is an open (a cycle finished overnight with the app kept alive); never mid-session
  {
    const { ctx, p } = await openP(browser, { profile: profile() });
    await waitRow(p);
    await p.waitForTimeout(800);
    const bg = pr => p.evaluate(pr => { window.__STUB.profile = pr; _holdAt = 0; document.dispatchEvent(new Event('visibilitychange')); }, pr);
    await p.evaluate(() => document.body.classList.add('session-on'));
    await bg(profile({ moments: [M.titleCentury] }));
    await p.waitForTimeout(2800);
    C.check('foreground after ten minutes, a session under way: no moment, nothing told', !(await moment(p)) && (await told(p)).length === 0, JSON.stringify(await told(p)));
    await p.evaluate(() => document.body.classList.remove('session-on'));
    await bg(profile({ moments: [M.titleCentury] }));
    const got = await waitMoment(p, 8000);
    C.check('foreground after ten minutes: the legend earned meanwhile comes full screen, told once', got && (await moment(p)).title === 'CENTURY' && (await told(p)).flat().join() === 'title:century::0', JSON.stringify(await told(p)));
    await ctx.close();
  }

  // ── 5. NEVER in the demo or the coach's preview ──
  for (const [name, query] of [['demo', '?client=demo'], ['coach preview', '?client=rel01_athlete&preview=1']]) {
    const prof = profile({ moments: [M.firstCycle, M.century1] });
    const { ctx, p } = await openP(browser, { query, profile: prof, seed: { _careercache: { p: prof, at: Date.now() } } });
    await p.waitForTimeout(2500);
    const k = await p.evaluate(() => ({ on: catalogueOnT(), moment: !!document.querySelector('.hl-moment'), keys: Object.keys(localStorage).filter(k => /trophy_/.test(k)) }));
    C.check(`${name}: not on, no moment, no profile asked for, nothing told, no key kept`, !k.on && !k.moment && k.keys.length === 0 && await calls(p, 'rpc:get_profile') === 0 && (await told(p)).length === 0, JSON.stringify(k));
    // the helper itself refuses
    await p.evaluate(() => trophyTold(['badge:century::1']));
    await p.waitForTimeout(300);
    C.check(`${name}: trophyTold() itself refuses (no career_told, no remembered key)`, (await told(p)).length === 0 && !(await p.evaluate(id => localStorage.getItem(id + '_trophy_seen'), H.ID)));
    await ctx.close();
  }

  // ── 6. THE CAREER ROW opens the Trophy Room once the switch is on ──
  {
    const { ctx, p } = await openP(browser, {});
    await waitRow(p);
    const label = await p.evaluate(() => document.querySelector('#home-career-wrap .hrow').getAttribute('aria-label'));
    C.check('the row names the Trophy Room', /Open your Trophy Room in AA Proof$/.test(label), label);
    await p.evaluate(() => document.querySelector('#home-career-wrap .hrow').click());
    await p.waitForTimeout(900);
    C.check('a tap opens AA Proof with go=trophy', /habits\.html\?client=rel01_athlete.*&go=trophy/.test(p.url()), p.url());
    await ctx.close();
  }
  // 6b. the guide follows the control (CNT-01): the Locker before, the Trophy Room after
  {
    const on = await openP(browser, {});
    await waitRow(on.p);
    const gOn = await on.p.evaluate(() => APP_GUIDE.find(c => c.key === 'career').body + ' ' + APP_GUIDE.find(c => c.title === 'Finishing a session').body);
    const off = await openP(browser, { profile: profile({ catalogue: false }) });
    await waitRow(off.p);
    const gOff = await off.p.evaluate(() => APP_GUIDE.find(c => c.key === 'career').body + ' ' + APP_GUIDE.find(c => c.title === 'Finishing a session').body);
    C.check('guide, on: the Career row opens the Trophy Room, and the finish card names the badges',
      /open your Trophy Room in AA Proof/.test(gOn) && !/open your Locker/.test(gOn) && /Century 24 of 25/.test(gOn), gOn.slice(-300));
    C.check('guide, off: the Locker, no badge lines', /open your Locker in AA Proof/.test(gOff) && !/Trophy Room/.test(gOff) && !/Century 24 of 25/.test(gOff));
    const added = [gOn.match(/<p>A session can move a badge[\s\S]*?<\/p>/), gOn.match(/<p>The card also names the badges[\s\S]*?<\/p>/)];
    C.check('the words added to the guide keep the voice: both paragraphs there, no em dash, no semicolon', added.every(m => m && !/[—;]/.test(m[0].replace(/&[a-z]+;/g, ''))), JSON.stringify(added.map(m => m && m[0])));
    await on.ctx.close(); await off.ctx.close();
  }

  // ── 7. 320 px: nothing overflows ──
  {
    const facts = [W('H', 1, 4, -20), W('B', 1, 5, -13)];
    const { ctx, p } = await openP(browser, { w: 320, prog: prog({ days: 2 }), facts, hist: [{ completed_on: at(-1), day: '2', readiness: 4, log: [] }],
      profile: profile({ shelfOpts: { heldN: 1, heldNow: 1 } }) });
    await waitRow(p);
    await toReady(p);
    const fit1 = await p.evaluate(() => {
      const r = document.querySelector('#confirm-1 .confirm-earn').getBoundingClientRect();
      return { right: Math.round(r.right), vw: innerWidth, sideways: document.documentElement.scrollWidth > innerWidth, lines: document.querySelectorAll('#confirm-1 .cf-badge').length };
    });
    C.check('320 px: the finish card with three badge lines fits, no sideways scroll', fit1.right <= fit1.vw && !fit1.sideways && fit1.lines === 3, JSON.stringify(fit1));
    await done(p, profile({ moments: [M.century1, M.held, M.titleCentury] }));
    await waitMoment(p, 9000);
    await waitCard(p);
    const fit2 = await p.evaluate(() => {
      const m = document.querySelector('.hl-moment'), sheet = m.querySelector('.hl-m-sheet'), pieces = [...m.querySelectorAll('.hl-m-title, .hl-m-go, .hl-m-skip, .hl-m-sub')];
      return { sideways: m.scrollWidth > m.clientWidth, over: pieces.filter(e => e.getBoundingClientRect().right > innerWidth + 0.5).length, sheetRight: Math.round(sheet.getBoundingClientRect().right), vw: innerWidth };
    });
    C.check('320 px: the full-screen moment fits', !fit2.sideways && fit2.over === 0 && fit2.sheetRight <= fit2.vw, JSON.stringify(fit2));
    await p.click('.hl-moment .hl-m-skip'); await p.waitForTimeout(600);
    const fit3 = await p.evaluate(() => {
      const s = document.getElementById('hlwin-1');
      return { bands: [...s.children].map(b => Math.round(b.getBoundingClientRect().right)), vw: innerWidth, sideways: document.documentElement.scrollWidth > innerWidth,
               share: [...s.querySelectorAll('.hl-band-go')].map(b => Math.round(b.getBoundingClientRect().height)), n: s.children.length };
    });
    C.check('320 px: the finished card\'s band and line fit, the Share pill is 36 px or more', fit3.n === 2 && fit3.bands.every(r => r <= fit3.vw) && !fit3.sideways && fit3.share.every(h => h >= 36), JSON.stringify(fit3));
    C.check('320 px: no page errors', p.errs.length === 0, JSON.stringify(p.errs));
    await ctx.close();
  }

  await browser.close();
  process.exitCode = C.report() ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
