// The emblem cabinet (2026-10-25; Amir picked direction A of the Emblem Cabinet: "go with your picks"): node scripts/headless/cabinet.js [--out <dir for screenshots>]
//
// Progress → Achievements is a cabinet of emblems (assets/js/emblems.js draws them): Latest (the won ones not seen yet, with New; the three newest when nothing is new), All
// achievements with a filter (kept on the phone, never synced), a medal for every ten levels and a section per family, each emblem a button that opens its sheet (won: the day, what
// it paid, how many times, Share it, Tell the crew; not won: how far along, what it pays, the way to the next session); what is seen is this phone's own list; Progress's row says
// "N of M" and "3 new" and the tab carries a clay dot until the cabinet has been opened. A new level medal opens the full screen every tenth level. Someone else's page shows
// Trophies (won only, with the faces that cheered, and their level medal on their face), the share card draws the emblem, a Bell line carries it, and a finished session says the
// time it was finished (p_session.fin, for Early Bird and Night Owl).
// It works on the server of today (get_achievements() with no done_on, xp_won or times, none of the 33 new ids) and on the server of rulebook 11 (all of them).
// Made-up athletes only (the repo is public). Serve the repo first (python -m http.server 8791 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');
const R = require('./career');   // the career fixtures: rwProfile(), rwShelf(), lvl(), catRows(), myMomentsFx() (career.js only runs its own checks when it is the script)

const { at, lvl, rwProfile, rwShelf, catRows, myMomentsFx } = R;
const RULES = [{ version: 11, switch: { xp: at(-60), catalogue: 'off' } }];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayWord = iso => Number(iso.slice(8)) + ' ' + MON[Number(iso.slice(5, 7)) - 1];

// The 33 new achievements of rulebook 11 (the contract's table): [id, name, meaning, test, reads, at, xp, size, rule, caption]. The server answers them only after stage99.
const V11 = [
  ['sessions_3', '3 Sessions', 'commitment', 'total', 'session_finished', 3, 60, 'win', '3 sessions with Amir.', 'Three sessions in. You have started.'],
  ['sessions_5', '5 Sessions', 'commitment', 'total', 'session_finished', 5, 80, 'win', '5 sessions with Amir.', 'Five sessions. It is a habit now.'],
  ['sessions_7', '7 Sessions', 'commitment', 'total', 'session_finished', 7, 100, 'win', '7 sessions with Amir.', 'Seven sessions. Keep stacking them.'],
  ['sessions_10', '10 Sessions', 'commitment', 'total', 'session_finished', 10, 150, 'highlight', '10 sessions with Amir.', 'Ten sessions. Double figures.'],
  ['sessions_15', '15 Sessions', 'commitment', 'total', 'session_finished', 15, 200, 'highlight', '15 sessions with Amir.', 'Fifteen sessions on the board.'],
  ['sessions_20', '20 Sessions', 'commitment', 'total', 'session_finished', 20, 250, 'highlight', '20 sessions with Amir.', 'Twenty sessions. This is real work.'],
  ['sessions_30', '30 Sessions', 'commitment', 'total', 'session_finished', 30, 350, 'highlight', '30 sessions with Amir.', 'Thirty sessions. You keep coming back.'],
  ['sessions_40', '40 Sessions', 'commitment', 'total', 'session_finished', 40, 450, 'milestone', '40 sessions with Amir.', 'Forty sessions. Most people stop long before this.'],
  ['sessions_75', '75 Sessions', 'commitment', 'total', 'session_finished', 75, 1000, 'milestone', '75 sessions with Amir.', 'Seventy-five sessions. Three quarters of the way to a hundred.'],
  ['sessions_300', '300 Sessions', 'commitment', 'total', 'session_finished', 300, 4000, 'milestone', '300 sessions with Amir.', 'Three hundred sessions. That is years of work.'],
  ['sessions_400', '400 Sessions', 'commitment', 'total', 'session_finished', 400, 5000, 'legend', '400 sessions with Amir.', 'Four hundred sessions. Very few get here.'],
  ['weeks_3', '3 Weeks in a Row', 'consistency', 'best_run', 'week_held', 3, 175, 'highlight', 'Three training weeks held in a row.', 'Three weeks in a row. Every session, on your days.'],
  ['weeks_5', '5 Weeks in a Row', 'consistency', 'best_run', 'week_held', 5, 250, 'highlight', 'Five training weeks held in a row.', 'Five weeks in a row, held.'],
  ['weeks_6', '6 Weeks in a Row', 'consistency', 'best_run', 'week_held', 6, 300, 'milestone', 'Six training weeks held in a row.', 'Six weeks in a row. Nothing missed.'],
  ['weeks_7', '7 Weeks in a Row', 'consistency', 'best_run', 'week_held', 7, 350, 'milestone', 'Seven training weeks held in a row.', 'Seven weeks in a row. Almost two months without a gap.'],
  ['months_4', '4 Months in a Row', 'consistency', 'best_run', 'week_held', 16, 800, 'milestone', '16 training weeks held in a row.', 'Four months without a broken week.'],
  ['months_5', '5 Months in a Row', 'consistency', 'best_run', 'week_held', 20, 1000, 'milestone', '20 training weeks held in a row.', 'Five months without a broken week.'],
  ['months_7', '7 Months in a Row', 'consistency', 'best_run', 'week_held', 28, 1400, 'milestone', '28 training weeks held in a row.', 'Seven months in a row. That is a different athlete.'],
  ['months_9', '9 Months in a Row', 'consistency', 'best_run', 'week_held', 36, 1800, 'legend', '36 training weeks held in a row.', 'Nine months in a row, held. Hardly anyone does this.'],
  ['bests_3', '3 Personal Bests', 'progress', 'total', 'personal_best', 3, 150, 'win', '3 personal bests.', 'Three personal bests. You are getting better.'],
  ['bests_15', '15 Personal Bests', 'progress', 'total', 'personal_best', 15, 600, 'milestone', '15 personal bests.', 'Fifteen personal bests.'],
  ['bests_75', '75 Personal Bests', 'progress', 'total', 'personal_best', 75, 2200, 'legend', '75 personal bests.', 'Seventy-five personal bests. Stronger, again and again.'],
  ['month_one', 'Month One', 'commitment', 'total', 'month_with_amir', 1, 100, 'win', 'A whole month since your first session.', 'One month with Amir. The first one is the hardest.'],
  ['year_two', 'Year Two', 'commitment', 'total', 'month_with_amir', 24, 2000, 'legend', 'Twenty-four whole months since your first session.', 'Two years with Amir. Two years of work.'],
  ['down_under', 'Down Under', 'commitment', 'on_dates', 'session_finished', null, 150, 'highlight', 'A session during the Australian Open fortnight.', 'You trained while Melbourne played.'],
  ['red_clay', 'Red Clay', 'commitment', 'on_dates', 'session_finished', null, 150, 'highlight', 'A session during the clay Slam in Paris.', 'You trained while Paris played on clay.'],
  ['the_lawns', 'The Lawns', 'commitment', 'on_dates', 'session_finished', null, 150, 'highlight', 'A session during the grass Slam in London.', 'You trained while London played on grass.'],
  ['big_apple', 'Big Apple', 'commitment', 'on_dates', 'session_finished', null, 150, 'highlight', 'A session during the US Open fortnight.', 'You trained while New York played.'],
  ['calendar_slam', 'Calendar Slam', 'commitment', 'slam_year', 'session_finished', null, 1000, 'legend', 'A session in all four Slam fortnights of one year.', 'All four Slams in one year. You trained through every one.'],
  ['nowruz', 'Nowruz', 'commitment', 'on_dates', 'session_finished', null, 150, 'highlight', 'A session in the Nowruz holidays.', 'New year, same work. Happy Nowruz.'],
  ['yalda', 'Yalda', 'commitment', 'on_dates', 'session_finished', null, 150, 'highlight', 'A session on Yalda night.', 'The longest night of the year, and you trained.'],
  ['early_bird', 'Early Bird', 'commitment', 'clock', 'session_finished', null, 100, 'win', 'A session finished before 7 in the morning.', 'Done before most people wake up.'],
  ['night_owl', 'Night Owl', 'commitment', 'clock', 'session_finished', null, 100, 'win', 'A session finished after 9 at night.', 'The day was long. You trained anyway.'],
];

// A made-up athlete at level 24 (the board's "Alex"): 64 sessions, a best run of 12 held weeks, 14 personal bests, 3 months with Amir, 3 comebacks.
// `stage` = the server of rulebook 11 (the 33 ids, done_on, xp_won, times); without it, the server of today.
const ME = { sessions: 64, run: 12, bests: 14, months: 3, comebacks: 3 };
const WON = ['moving_up', 'rematch_won', 'rebound', 'back', 'human_sprinkler_2', 'lights_out', 'on_your_feet', 'week_that_counted', 'complete_day', 'dawn_patrol_1', 'dawn_patrol_2', 'on_target_1', 'heavy_metal_1',
  'first_cycle', 'every_rep_counted', 'extra_mile', 'clean_sheet', 'held', 'back_to_back', 'first_blood', 'first_best', 'season_ticket', 'the_notebook'];
const NEW_WON = ['sessions_3', 'sessions_5', 'sessions_7', 'sessions_10', 'sessions_15', 'sessions_20', 'sessions_30', 'sessions_40', 'weeks_3', 'weeks_5', 'weeks_6', 'weeks_7', 'bests_3', 'month_one', 'big_apple', 'early_bird'];
const TIMES = { held: 11, back_to_back: 4, rebound: 2, rematch_won: 3, complete_day: 14 };
function achFx(o = {}) {
  const stage = !!o.stage, won = new Set(WON.concat(stage ? NEW_WON : []));
  const have = { total_session: ME.sessions, best_run: ME.run, personal_best: ME.bests, month_with_amir: ME.months };
  // The server of today is the catalogue without rulebook 11's 33 (career/achievements.toml carries them, `added_in = 11`, since stage99 went live);
  // `stage` adds them back from V11, the contract's table.
  const rows = catRows().filter(r => r.kind === 'achievement' && !(r.body && Number(r.body.added_in) >= 11)).map(r => {
    const b = r.body;
    return { id: r.id, name: b.name, meaning: b.meaning, test: b.test, reads: b.reads, caption: b.caption, rule: b.rule, size: b.size, xp: b.xp, origin: b.origin, _at: b.at != null ? b.at : (b.proof_need > 1 ? b.proof_need : undefined) };
  }).concat(stage ? V11.map(v => ({ id: v[0], name: v[1], meaning: v[2], test: v[3], reads: v[4], caption: v[9], rule: v[8], size: v[7], xp: v[6], origin: 'new', _at: v[5] })) : []);
  let n = 0;
  const items = rows.map(r => {
    const it = Object.assign({}, r), isWon = won.has(it.id);
    if ('_at' in it) { if (it._at != null) it.need = it._at; delete it._at; }
    const day = at(-(3 + (n++ * 3) % 70));
    if (isWon) {
      it.day = day;
      if (stage) { it.done_on = NEW_WON.indexOf(it.id) >= 0 ? at(-(120 + (n * 7) % 200)) : day; it.xp_won = NEW_WON.indexOf(it.id) >= 0 ? 0 : it.xp; if (TIMES[it.id]) it.times = TIMES[it.id]; }
    } else if (it.test === 'total' || it.test === 'best_run') {
      const k = [].concat(it.reads || [])[0];
      it.have = k === 'week_held' ? ME.run : k === 'personal_best' ? ME.bests : k === 'month_with_amir' ? ME.months : k === 'session_finished' ? ME.sessions : 0;
    }
    return it;
  });
  const nx = items.find(i => !i.day && i.id === (stage ? 'sessions_75' : 'straight_talk')) || items.find(i => !i.day);
  return { athlete_id: H.ID, ready: true, items, next: nx, month: { weeks: 4, held: 1, spoilt: false } };
}
// get_awards()'s shelf for the four marks: the days each tier was reached (held weeks 4 · 8 · 12 (run 12), sessions 25 · 50, bests 5 · 10, comebacks 3).
function shelfRows() {
  return [
    { id: 'held_weeks', name: 'Hold Serve', meaning: 'consistency', tier: 3, day: at(-12), days: [at(-70), at(-40), at(-12)] },
    { id: 'century', name: 'Century', meaning: 'commitment', tier: 2, day: at(-18), days: [at(-65), at(-18)] },
    { id: 'bests', name: 'Record Breaker', meaning: 'progress', tier: 2, day: at(-25), days: [at(-60), at(-25)] },
    { id: 'comebacks', name: 'HARD TO KILL', meaning: 'resilience', tier: 1, day: at(-30), days: [at(-30)] },
  ];
}
function xpForLevel(L) { let x = 0; for (; ;) { if (lvl(x).level >= L) return x + 600; x += 50; } }
function profileFx(o = {}) {
  const L = o.level || 24;
  return rwProfile(xpForLevel(L), { sessions: ME.sessions, badges: shelfRows(), achievements: [],
    four: { consistency: { key: 'weeks_held', value: ME.run, best: ME.run }, commitment: { key: 'sessions_with_amir', value: ME.sessions },
            progress: { key: 'personal_bests', value: ME.bests }, resilience: { key: 'comebacks', value: ME.comebacks } } });
}
async function openMe(browser, o = {}) {
  const prof = o.profile || profileFx(o);
  const stub = Object.assign({ tables: { career_rules: RULES, career_facts: [], career_catalogue: catRows() }, profile: prof, awards: rwShelf(prof), myMoments: myMomentsFx(),
    achievements: o.noAch ? undefined : achFx(o) }, o.stub || {});
  return H.openProgram(browser, Object.assign({ w: o.w || 390, h: o.h || 844, tz: 'UTC', hist: [], stub,
    seed: Object.assign({ _hab_cfg: { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() } }, o.seed || {}) }, o.opts || {}));
}
const goCab = async p => { await p.evaluate(() => goTo('achievements')); await p.waitForFunction(() => !!document.querySelector('#ach-body .cab-grid'), null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(250); };
const waitDoor = p => p.waitForFunction(() => { const d = document.querySelector('#career-card-wrap .cs-card .cs-ach'); return !!d; }, null, { timeout: 10000 }).catch(() => {});

module.exports = { achFx, shelfRows, profileFx, openMe, goCab, waitDoor, V11, ME, WON, NEW_WON, dayWord, xpForLevel };

// ── what the checks read ──
const T = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const seenKeys = p => p.evaluate(id => JSON.parse(localStorage.getItem(id + '_cabseen') || 'null'), H.ID);
const doorOf = p => p.evaluate(() => { const b = document.querySelector('#career-card-wrap .cs-card .cs-ach'); return b ? { v: b.querySelector('.cs-ach-t small').firstChild.textContent.replace(/\s*·\s*$/, '').trim(), nw: ((b.querySelector('.cs-ach-new') || {}).textContent || '').trim(), s: b.querySelector('.cs-ach-t b').textContent.trim(), stk: b.querySelectorAll('.cs-ach-stk svg').length } : null; });   // the Achievements row at the foot of Your numbers (2026-10-25: the door on Progress is gone)
const goProgress = async p => { await p.evaluate(() => goTo('plan')); await p.waitForTimeout(500); };
const dotOn = p => p.evaluate(() => !!document.querySelector('#global-tabs .nav-item[data-tab="plan"] .nav-dot'));
const sheetOpen = p => p.evaluate(() => { const o = document.getElementById('hist-overlay'); return !!o && o.classList.contains('visible'); });
const screenNow = p => p.evaluate(() => (document.querySelector('.screen.active') || {}).id || '');
const calls = (p, name) => p.evaluate(n => (window.__STUB.params || []).filter(x => x[0] === n).map(x => x[1]), name);
const dayT = iso => dayWord(iso) + (Number(iso.slice(0, 4)) !== new Date().getFullYear() ? ' ' + iso.slice(0, 4) : '');   // the app's cabDay()
const tap = async (p, sel) => { await p.evaluate(s => document.querySelector(s).click(), sel); await p.waitForTimeout(350); };
const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
// every won key of the example athlete on the server of today: the achievements, then the marks' tiers (held weeks 3, sessions 2, bests 2, comebacks 1)
const WON_KEYS = WON.concat(['mark:held_weeks:0', 'mark:held_weeks:1', 'mark:held_weeks:2', 'mark:century:0', 'mark:century:1', 'mark:bests:0', 'mark:bests:1', 'mark:comebacks:0']);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 1. THE SERVER OF TODAY: get_achievements() with no done_on, xp_won, times, none of the 33 new ids
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function today(browser, C) {
  const ach = achFx(), by = id => ach.items.find(i => i.id === id);
  // first look on a phone: what was already won is not new; the door counts achievements, mark tiers and level medals together
  {
    const { ctx, p } = await openMe(browser, {});
    await waitDoor(p);
    const d = await doorOf(p);
    C.check('today: Progress\'s door says "34 of 94" (23 achievements and 8 mark tiers won, 3 level medals: 83 items and 11 medals), with nothing new on a first look',
      !!d && d.v === '34 of 94' && d.nw === '', JSON.stringify(d));
    C.check('today: a first look marks what is already won as seen, and the Progress tab has no dot', (await seenKeys(p)) && Object.keys(await seenKeys(p)).length === 31 && !(await dotOn(p)), JSON.stringify(await seenKeys(p)));
    await goCab(p);
    const pg = await p.evaluate(() => ({
      title: document.querySelector('#screen-achievements .ceil-title').textContent.trim(), line: document.getElementById('ach-line').textContent.trim(),
      heads: [...document.querySelectorAll('#ach-body .cab-t')].map(e => e.textContent.trim()), tiles: document.querySelectorAll('#ach-body .cab-cell').length,
      next: (document.querySelector('#ach-body .ac-next .ac-nm') || {}).textContent, latest: [...document.querySelectorAll('#ach-body .cab-card:not(.cab-hon)')].map(c => ({ n: c.querySelector('.cab-cn').textContent, nw: !!c.querySelector('.cab-new') })),
      dots: document.querySelectorAll('#ach-body .cab-dot').length, lit: (document.querySelector('#global-tabs .nav-item.active') || {}).dataset.tab,
      v11: !!document.querySelector('#ach-body .cab-cell[data-k="sessions_3"]'), chips: [...document.querySelectorAll('#ach-body .cab-chip')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join('|'),
      won: document.querySelector('#ach-body .cab-cell[data-k="first_blood"] svg').innerHTML.indexOf('var(--ghost') < 0, ghost: document.querySelector('#ach-body .cab-cell[data-k="the_distance"] svg').innerHTML.indexOf('var(--ghost') >= 0,
      sub: ['first_blood', 'the_distance', 'half_year'].map(k => document.querySelector('#ach-body .cab-cell[data-k="' + k + '"] .cab-s').textContent), labs: document.querySelector('#ach-body .cab-cell[data-k="the_distance"]').getAttribute('aria-label') }));
    C.check('today: the page is the cabinet: title Achievements, "34 won · 60 to win" under it, the Progress tab lit', pg.title === 'Achievements' && pg.line === '34 won · 60 to win' && pg.lit === 'plan', JSON.stringify([pg.title, pg.line, pg.lit]));
    C.check('today: Next up, Latest, All achievements with the chips, the level, then a section per family (Streaks holds weeks and months), in the emblem map\'s order',
      pg.next === 'Straight Talk' || !!pg.next, pg.next);
    C.check('today: the order of the page', pg.heads.join() === 'Honours,Latest,All achievements,Level 24,Sessions,Streaks,Getting stronger,Comebacks,Habits,With Amir,Trophies', pg.heads.join());
    C.check('today: every emblem is a button (83 items and 11 medals) and none of the 33 new ids is there', pg.tiles === 94 && !pg.v11, JSON.stringify([pg.tiles, pg.v11]));
    C.check('today: nothing is new, so Latest is the three most recent, with no New tag and no clay dot anywhere', pg.latest.length === 3 && pg.latest.every(c => !c.nw) && pg.dots === 0, JSON.stringify([pg.latest, pg.dots]));
    C.check('today: the chips: All is on, then Won, To win and the four kinds', pg.chips === 'All*|Won|To win|Consistency|Commitment|Progress|Resilience', pg.chips);
    C.check('today: won is drawn in colour, not won is a ghost (the same shape, grey)', pg.won && pg.ghost);
    const fbDay = dayT(by('first_blood').day), distNo = by('the_distance');
    C.check('today: under a won emblem its day, under a not-won one "Not yet", the aria label says Not won yet', pg.sub[0] === fbDay && pg.sub[1] === 'Not yet' && /Not won yet/.test(pg.labs), JSON.stringify([pg.sub, pg.labs, fbDay]));
    // a won emblem's sheet
    await tap(p, '#ach-body .cab-cell[data-k="first_blood"]');
    const s1 = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'); const q = s => { const e = m.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      return { open: document.getElementById('hist-overlay').classList.contains('visible'), kind: q('.cab-sh-kind'), t: q('.readiness-title'), rule: q('.cab-sh-p'), meta: q('.cab-meta'), times: q('.cab-times'), btns: [...m.querySelectorAll('.cab-go, .cab-tell')].map(b => b.textContent.trim()) }; });
    C.check('today: a won emblem\'s sheet: "Commitment · Ink", its name, the rule as one sentence, "Won <day> · +50 XP" (the catalogue\'s price: the server sends no xp_won), Share it, and no Tell the crew without a crew',
      s1.open && s1.kind === 'Commitment · Ink' && s1.t === 'First Blood' && s1.rule === 'The first day with a session done (the WORKOUT habit).' && s1.meta === 'Won ' + fbDay + ' · +50 XP' && !s1.times && s1.btns.join() === 'Share it', JSON.stringify(s1));
    await p.evaluate(() => history.back()); await p.waitForTimeout(350);
    C.check('today: Back closes the sheet and the cabinet is still the screen', !(await sheetOpen(p)) && (await screenNow(p)) === 'screen-achievements');
    // a not-won one: how far along, what it pays, no way to a session (it is a month count)
    await tap(p, '#ach-body .cab-cell[data-k="half_year"]');
    const s2 = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'); const q = s => { const e = m.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      return { kind: q('.cab-sh-kind'), t: q('.readiness-title'), ghost: m.querySelector('.readiness-title').classList.contains('is-ghost'), rule: q('.cab-sh-p'), bar: (m.querySelector('.cab-bar i') || {}).style && m.querySelector('.cab-bar i').style.width,
        meta: [...m.querySelectorAll('.cab-meta')].map(e => e.textContent.trim()), btns: [...m.querySelectorAll('.cab-go, .cab-tell')].map(b => b.textContent.trim()) }; });
    C.check('today: a not-won emblem\'s sheet: kind and step, its name, the rule, a bar and "3 of 6 months", "+500 XP when you win it", and no way to a session',
      s2.t === 'Half Year' && s2.ghost && s2.kind === 'Commitment · Clay' && s2.rule === 'Six whole months since the first session.' && s2.bar === '50%' && s2.meta.join('|') === '3 of 6 months|+500 XP when you win it' && !s2.btns.length, JSON.stringify(s2));
    await p.evaluate(() => history.back()); await p.waitForTimeout(350);
    // a session count: Open Next up when a plan day is next
    await tap(p, '#ach-body .cab-cell[data-k="mark:century:2"]');
    const s3 = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'); return { t: m.querySelector('.readiness-title').textContent, meta: [...m.querySelectorAll('.cab-meta')].map(e => e.textContent.trim()), btn: (m.querySelector('.cab-go') || {}).textContent, day: typeof suggestedDayId === 'function' ? suggestedDayId() : null }; });
    C.check('today: a mark\'s tier not won ("100 sessions with Amir"): "64 of 100 sessions", no XP line, and "Open Next up: Day N" for the day that is next', s3.t === '100 sessions with Amir' && s3.meta.join('|') === '64 of 100 sessions' && !!s3.day && s3.btn === 'Open Next up: Day ' + s3.day, JSON.stringify(s3));
    await tap(p, '#hist-overlay .cab-go');
    C.check('today: Open Next up closes the sheet and opens that day', !(await sheetOpen(p)) && (await screenNow(p)) === 'screen-home' && (await p.evaluate(() => !document.getElementById('day-view').hidden)));
    await goCab(p);
    // a level medal
    await tap(p, '#ach-body .cab-cell[data-k="level:20"]');
    const s4 = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'); const q = s => { const e = m.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      return { kind: q('.cab-sh-kind'), t: q('.readiness-title'), p: q('.cab-sh-p'), meta: q('.cab-meta') }; });
    C.check('today: the level medal you are on: "Level 24", its name, when the next comes, and the XP to level 25', s4.kind === 'Level medal · 20 to 29' && s4.t === 'Level 24' && s4.p === 'Green glaze. Your medal now. The next one comes at level 30.' && /^[\d,]+ XP to level 25$/.test(s4.meta), JSON.stringify(s4));
    await p.evaluate(() => history.back()); await p.waitForTimeout(300);
    await tap(p, '#ach-body .cab-cell[data-k="level:40"]');
    C.check('today: a medal you have not reached is a ghost that says when it is yours', (await T(p, '#hist-overlay .cab-sh-p')) === 'Glazed. Yours when you reach level 40.' && (await T(p, '#hist-overlay .readiness-title')) === 'Level 40', await T(p, '#hist-overlay .cab-sh-p'));
    await p.evaluate(() => history.back()); await p.waitForTimeout(300);
    C.check('today: no page errors, nothing runs sideways', !p.errs.length && (await sideways(p)) <= 0, JSON.stringify([p.errs, await sideways(p)]));
    await ctx.close();
  }
  // what is NEW: three left unseen on this phone
  {
    const left = WON_KEYS.filter(k => ['moving_up', 'rematch_won', 'mark:century:1'].indexOf(k) < 0), seen = {}; left.forEach(k => { seen[k] = 1; });
    const { ctx, p } = await openMe(browser, { seed: { _cabseen: seen } });
    await waitDoor(p);
    const d = await doorOf(p);
    C.check('seen: three won emblems this phone has not shown: the door says "34 of 94" and "3 new" in clay', !!d && d.v === '34 of 94' && d.nw === '3 new', JSON.stringify(d));
    const clay = await p.evaluate(() => getComputedStyle(document.querySelector('#career-card-wrap .cs-ach-new')).color);
    C.check('seen: the "3 new" is clay text', /194, 81, 44/.test(clay), clay);
    C.check('seen: the Achievements row at the foot of Your numbers: the word Achievements, three newest emblems drawn, no big share button, no door on Progress',
      d.s === 'Achievements' && d.stk === 3 && await p.evaluate(() => !document.querySelector('.cs-card .cs-share') && document.querySelectorAll('#career-courts-wrap .hrow, #career-moments-wrap .hrow').length === 0)
      , JSON.stringify(d));
    await goProgress(p);
    C.check('seen: the Progress tab carries a dot, and no number', await dotOn(p) && (await p.evaluate(() => document.querySelector('#global-tabs .nav-item[data-tab="plan"] .nav-dot').textContent === '')));
    await goCab(p);
    const n = await p.evaluate(() => ({ cards: [...document.querySelectorAll('#ach-body .cab-card:not(.cab-hon)')].map(c => c.querySelector('.cab-cn').textContent + (c.querySelector('.cab-new') ? ' NEW' : '')), dots: [...document.querySelectorAll('#ach-body .cab-cell .cab-dot')].map(d => d.closest('.cab-cell').dataset.k).sort() }));
    C.check('seen: Latest shows the three with New, newest first, and each carries a clay dot in its section', n.cards.length === 3 && n.cards.every(c => / NEW$/.test(c)) && n.dots.join() === 'mark:century:1,moving_up,rematch_won', JSON.stringify(n));
    C.check('seen: opening the cabinet marks everything on it as seen: the key holds all 34 won and the dot is gone', Object.keys(await seenKeys(p)).length === 31 && !(await dotOn(p)), JSON.stringify(Object.keys(await seenKeys(p)).length));
    await tap(p, '#ach-body .cab-cell[data-k="moving_up"]');
    C.check('seen: opening an emblem takes its dot', (await p.evaluate(() => !document.querySelector('#ach-body .cab-cell[data-k="moving_up"] .cab-dot'))) && (await p.evaluate(() => document.querySelectorAll('#ach-body .cab-cell .cab-dot').length)) === 2);
    await p.evaluate(() => history.back()); await p.waitForTimeout(300);
    await goProgress(p);
    const d2 = await doorOf(p);
    C.check('seen: back on Progress there is nothing new, the door says so and the tab has no dot', d2.nw === '' && !(await dotOn(p)), JSON.stringify(d2));
    await goCab(p);
    C.check('seen: the next visit has no New tag and no dot', await p.evaluate(() => !document.querySelector('#ach-body .cab-new') && !document.querySelector('#ach-body .cab-dot')));
    C.check('seen: the list is this phone\'s own: never in the synced snapshot', await p.evaluate(id => !Object.keys(_snapshot()).some(k => /cabseen|lvseen/.test(k)) && !!localStorage.getItem(id + '_cabseen'), H.ID));
    await ctx.close();
  }
  // a tap on the Achievements row opens the cabinet (2026-10-25: the row replaced the door on Progress)
  {
    const { ctx, p } = await openMe(browser, {});
    await waitDoor(p);
    const scr = await p.evaluate(() => { document.querySelector('#career-card-wrap .cs-ach').click(); return new Promise(r => setTimeout(() => r((document.querySelector('.screen.active') || {}).id), 500)); });
    C.check('today: a tap on the Achievements row opens the cabinet', scr === 'screen-achievements', scr);
    await ctx.close();
  }
  // Home's habits page, "From your habits": opens the cabinet on its Habits shelf (filter All, scrolled to the Habits section), 2026-10-25
  {
    const { ctx, p } = await openMe(browser, { seed: { aa_cab_filter: 'won' } });
    await waitDoor(p);
    await p.evaluate(() => goTo('habits'));
    await p.waitForTimeout(500);
    const has = await p.evaluate(() => !![...document.querySelectorAll('#screen-habits .hrow')].find(x => /From your habits/.test(x.textContent)));
    await p.evaluate(() => { localStorage.setItem('aa_cab_filter', 'won'); const b = [...document.querySelectorAll('#screen-habits .hrow')].find(x => /From your habits/.test(x.textContent)); if (b) b.click(); });
    await p.waitForTimeout(700);
    const sh = await p.evaluate(() => { const sec = [...document.querySelectorAll('#ach-body .cab-sec')].find(x => ((x.querySelector('.cab-t') || {}).textContent || '').trim() === 'Habits'); const r = sec && sec.getBoundingClientRect();
      return { screen: (document.querySelector('.screen.active') || {}).id, pressed: [...document.querySelectorAll('#ach-body .cab-chip[aria-pressed="true"]')].map(b => b.textContent).join(), sec: !!sec, top: r ? Math.round(r.top) : null, vh: innerHeight }; });
    C.check('habits: "From your habits" opens the cabinet on the Habits shelf: filter set to All, scrolled to the Habits section',
      has && sh.screen === 'screen-achievements' && sh.pressed === 'All' && sh.sec && sh.top >= -2 && sh.top < sh.vh * 0.5, JSON.stringify([has, sh]));
    await ctx.close();
  }
  // no answer: no door, no page, nothing else changes
  {
    const { ctx, p } = await openMe(browser, { noAch: true });
    await p.waitForTimeout(1500);
    await goProgress(p);
    const o = await p.evaluate(() => ({ door: !!document.querySelector('.cs-ach'), card: !!document.querySelector('.cs-card'), medal: !!document.querySelector('.cs-card .cs-lm svg') }));
    C.check('today: no get_achievements answer: no Achievements door, Your numbers as before (with the level medal beside Level 24)', !o.door && o.card && o.medal, JSON.stringify(o));
    C.check('today: no answer: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 2. THE SERVER OF RULEBOOK 11: the 33 new ids, done_on, xp_won, times
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function staged(browser, C) {
  const ach = achFx({ stage: true }), by = id => ach.items.find(i => i.id === id);
  const { ctx, p } = await openMe(browser, { stage: true });
  await waitDoor(p);
  const d = await doorOf(p);
  C.check('stage: the 33 new ids are back-filled as won and are exactly what is new: "50 of 127" and "16 new"', !!d && d.v === '50 of 127' && d.nw === '16 new', JSON.stringify(d));
  C.check('stage: the Progress tab has its dot', await dotOn(p));
  await goCab(p);
  const g = await p.evaluate(() => ({ line: document.getElementById('ach-line').textContent, cells: document.querySelectorAll('#ach-body .cab-cell').length,
    all33: ['sessions_3', 'sessions_400', 'weeks_7', 'months_9', 'bests_75', 'month_one', 'year_two', 'down_under', 'calendar_slam', 'nowruz', 'yalda', 'early_bird', 'night_owl'].every(k => !!document.querySelector('#ach-body .cab-cell[data-k="' + k + '"]')),
    latest: [...document.querySelectorAll('#ach-body .cab-card:not(.cab-hon)')].length, news: document.querySelectorAll('#ach-body .cab-card .cab-new').length,
    secs: [...document.querySelectorAll('#ach-body .cab-sec')].map(s => s.querySelector('.cab-t').textContent + ' ' + s.querySelector('.cab-n').textContent.replace(/\s+/g, ' ')) }));
  C.check('stage: the page counts them: "50 won · 77 to win", 127 emblems', g.line === '50 won · 77 to win' && g.cells === 127 && g.all33, JSON.stringify([g.line, g.cells, g.all33]));
  C.check('stage: Latest holds the new ones (at most ten), each with New', g.latest === 10 && g.news === 10, JSON.stringify([g.latest, g.news]));
  C.check('stage: each section counts its own (Sessions 14 of 31, Streaks 15 of 24, Trophies 13 of 37 once the calendar ones are in)', g.secs.length === 8, g.secs.join(' | '));
  // done_on is the day shown; xp_won 0 shows no XP; times
  const s3 = by('sessions_3'), subs = await p.evaluate(() => ({ s3: document.querySelector('.cab-cell[data-k="sessions_3"] .cab-s').textContent, held: document.querySelector('.cab-cell[data-k="held"] .cab-s').textContent, b2b: document.querySelector('.cab-cell[data-k="back_to_back"] .cab-s').textContent }));
  C.check('stage: an emblem shows the day the work was DONE (done_on), "11 times" where times says so', subs.s3 === dayT(s3.done_on) && subs.held === '11 times' && subs.b2b === '4 times', JSON.stringify([subs, s3.done_on]));
  await tap(p, '#ach-body .cab-cell[data-k="sessions_3"]');
  const m0 = await p.evaluate(() => ({ meta: document.querySelector('#hist-overlay .cab-meta').textContent.trim(), t: document.querySelector('#hist-overlay .readiness-title').textContent }));
  C.check('stage: a back-filled one says "Won <the day it was done>" and no XP (xp_won is 0)', m0.t === '3 Sessions' && m0.meta === 'Won ' + dayT(s3.done_on), JSON.stringify(m0));
  await p.evaluate(() => history.back()); await p.waitForTimeout(300);
  await tap(p, '#ach-body .cab-cell[data-k="held"]');
  const m1 = await p.evaluate(() => ({ meta: document.querySelector('#hist-overlay .cab-meta').textContent.trim(), times: (document.querySelector('#hist-overlay .cab-times') || {}).textContent }));
  C.check('stage: one won after the seed says "+100 XP" (xp_won) and "Won 11 times"', m1.meta === 'Won ' + dayT(by('held').day) + ' · +100 XP' && m1.times === 'Won 11 times', JSON.stringify(m1));
  await p.evaluate(() => history.back()); await p.waitForTimeout(300);
  // a not-won new one: weeks, with the way to the session
  await tap(p, '#ach-body .cab-cell[data-k="months_4"]');
  const m2 = await p.evaluate(() => ({ kind: document.querySelector('#hist-overlay .cab-sh-kind').textContent, meta: [...document.querySelectorAll('#hist-overlay .cab-meta')].map(e => e.textContent.trim()), btn: (document.querySelector('#hist-overlay .cab-go') || {}).textContent, rule: document.querySelector('#hist-overlay .cab-sh-p').textContent }));
  C.check('stage: "4 Months in a Row": Consistency · Clay, "12 of 16 weeks", "+800 XP when you win it", Open Next up', m2.kind === 'Consistency · Clay' && m2.meta.join('|') === '12 of 16 weeks|+800 XP when you win it' && /^Open Next up: Day \d+$/.test(m2.btn) && m2.rule === '16 training weeks held in a row.', JSON.stringify(m2));
  await p.evaluate(() => history.back()); await p.waitForTimeout(300);
  // an id the emblem map does not know goes into Trophies with the plain drawing
  await p.evaluate(() => { MOM_T.ach.items.push({ id: 'made_up_one', name: 'Made Up One', meaning: 'commitment', rule: 'Do the made-up thing.', caption: 'Made up.', xp: 120, size: 'win', day: '2026-10-01' }); renderAchievements(); });
  const u = await p.evaluate(() => { const c = document.querySelector('#ach-body .cab-cell[data-k="made_up_one"]'); return c ? { sec: c.closest('.cab-sec').querySelector('.cab-t').textContent, svg: !!c.querySelector('svg'), l: c.querySelector('.cab-l').textContent } : null; });
  C.check('stage: an id the emblem map does not know sits in Trophies with the fallback drawing', !!u && u.sec === 'Trophies' && u.svg && u.l === 'Made Up One', JSON.stringify(u));
  await p.evaluate(() => { MOM_T.ach.items.pop(); renderAchievements(); });
  // the filter: kept on this phone, never synced
  await tap(p, '#ach-body .cab-chip:nth-child(2)');
  const f1 = await p.evaluate(() => ({ stored: localStorage.getItem('aa_cab_filter'), pressed: [...document.querySelectorAll('#ach-body .cab-chip[aria-pressed="true"]')].map(b => b.textContent).join(), ghosts: [...document.querySelectorAll('#ach-body .cab-cell')].filter(c => /Not won yet/.test(c.getAttribute('aria-label'))).length,
    cells: document.querySelectorAll('#ach-body .cab-cell').length, medals: document.querySelectorAll('#ach-body .cab-cell[data-k^="level:"]').length, synced: Object.keys(_snapshot()).some(k => /cab_filter/.test(k)) }));
  C.check('filter: Won shows only what is won (50 emblems, the three medals reached), keeps the choice on the phone and never syncs it', f1.stored === 'won' && f1.pressed === 'Won' && f1.ghosts === 0 && f1.cells === 50 && f1.medals === 3 && !f1.synced, JSON.stringify(f1));
  await tap(p, '#ach-body .cab-chip:nth-child(3)');
  const f2 = await p.evaluate(() => ({ cells: document.querySelectorAll('#ach-body .cab-cell').length, wonOnes: [...document.querySelectorAll('#ach-body .cab-cell')].filter(c => !/Not won yet/.test(c.getAttribute('aria-label'))).length }));
  C.check('filter: To win shows only what is left (77 including the 8 medals not reached)', f2.cells === 77 && f2.wonOnes === 0, JSON.stringify(f2));
  await tap(p, '#ach-body .cab-chip:nth-child(6)');
  const f3 = await p.evaluate(() => ({ cells: document.querySelectorAll('#ach-body .cab-cell').length, medals: document.querySelectorAll('#ach-body .cab-cell[data-k^="level:"]').length, secs: [...document.querySelectorAll('#ach-body .cab-sec .cab-t')].map(e => e.textContent).join() }));
  C.check('filter: a kind (Progress) shows that kind alone, no level medals (a medal is no kind)', f3.cells > 5 && f3.cells < 40 && f3.medals === 0 && !/^Level/.test(f3.secs), JSON.stringify(f3));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
  await goCab(p);
  C.check('filter: the choice is still there after the app is opened again', (await p.evaluate(() => [...document.querySelectorAll('#ach-body .cab-chip[aria-pressed="true"]')].map(b => b.textContent).join())) === 'Progress');
  await tap(p, '#ach-body .cab-chip:nth-child(1)');
  C.check('stage: no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 3. THE BIG MOMENT: an achievement's and a mark's emblem as the hero, and a new level medal every tenth level
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function moments(browser, C, OUT) {
  const TODAY = at(0);
  const heroOf = p => p.evaluate(() => { const m = document.querySelector('.hl-moment'); const q = s => { const e = m && m.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    return m ? { eb: q('.hl-m-eyebrow'), t: q('.hl-m-title'), sub: q('.hl-m-sub'), em: !!m.querySelector('.hl-m-em svg'), num: !!m.querySelector('.hl-m-num'), card: !!m.querySelector('.hl-m-card'), words: q('.hl-m-sheet p'), btns: [...m.querySelectorAll('.hl-m-go, .hl-m-crew, .hl-m-skip')].map(b => b.textContent.trim()),
      has: m.querySelector('.hl-m-hero').classList.contains('has-em'), side: document.documentElement.scrollWidth - innerWidth } : null; });
  const crewOn = { athlete_id: H.ID, at: new Date().toISOString(), days: 7, kinds: ['achievement', 'level'], me: { answer: 'yes', name: 'Alex R.', on_board: true, under13: false, can_post: true, photos_left: 3, posts_left: 10, kinds: { achievement: true, level: true } },
    honours: { month: null, rows: [] }, items: [] };
  // an achievement: its emblem over the rays, its name, its line, Amir's words, Share it, Tell the crew
  {
    const prof = rwProfile(xpForLevel(24), { owned: { 'achievement:big_apple': TODAY }, badges: shelfRows(), achievements: [], moments: [R.mom('achievement:big_apple', 'highlight', true, 150, { kind: 'achievement', name: 'Big Apple', meaning: 'commitment', caption: 'You trained while New York played.', date: TODAY })] });
    const { ctx, p } = await openMe(browser, { stage: true, profile: prof, stub: { bell: JSON.parse(JSON.stringify(crewOn)) } });
    await p.waitForSelector('.hl-moment', { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(1400);
    const h = await heroOf(p);
    C.check('moment: an achievement\'s emblem is the hero (no big number, no small card), its kind, its name, its line, Amir\'s words, Share it',
      !!h && h.has && h.em && !h.num && !h.card && h.eb === 'Commitment' && h.t === 'Big Apple' && h.sub === 'You trained while New York played.' && h.words === 'That one is on the board now. It stays yours.' && h.btns[0] === 'Share it', JSON.stringify(h));
    await p.waitForFunction(() => { const b = document.querySelector('.hl-m-crew'); return !!b && !b.hidden; }, null, { timeout: 8000 }).catch(() => {});
    C.check('moment: Tell the crew is still offered, with its line', (await p.evaluate(() => (document.querySelector('.hl-m-crew') || {}).dataset.line)) === 'Just won Big Apple. You trained while New York played.');
    await p.screenshot({ path: path.join(OUT, 'moment-achievement-390.png') }).catch(() => {});
    // Share it opens the achievement card with the emblem in it
    await tap(p, '.hl-m-go');
    const sp = await p.evaluate(() => { const s = (typeof _SHARE !== 'undefined' && _SHARE) || null; return { open: !!document.querySelector('#hist-overlay.visible .hl-prev'), spec: window._lastShareSpec || null }; });
    C.check('moment: Share it opens the share sheet', sp.open);
    C.check('moment: no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  // a mark: the tier's emblem, not the big number
  {
    const m1 = R.mom('badge:held_weeks:3', 'milestone', true, 600, R.badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, '12 weeks held in a row. You keep showing up.', at(-1)));
    const prof = rwProfile(xpForLevel(24), { moments: [m1], owned: { 'badge:held_weeks:3': at(0) }, badges: shelfRows(), achievements: [] });
    const { ctx, p } = await openMe(browser, { profile: prof });
    await p.waitForSelector('.hl-moment', { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(1200);
    const h = await heroOf(p);
    C.check('moment: a mark\'s tier shows its emblem, "12 weeks held in a row", the next mark, Amir\'s line, Share the card; the number is in the emblem, so no big number',
      !!h && h.has && h.em && !h.num && !h.card && h.eb === 'A new mark' && h.t === '12 weeks held in a row' && h.words === 'Every session, 12 weeks running. Keep it boring.' && h.btns[0] === 'Share the card', JSON.stringify(h));
    await ctx.close();
  }
  // a new level medal: only a tenth level opens it
  {
    const lowerXp = xpForLevel(29), upperXp = xpForLevel(30);
    const { ctx, p } = await openMe(browser, { profile: rwProfile(lowerXp, { badges: shelfRows(), achievements: [] }), stub: { bell: JSON.parse(JSON.stringify(crewOn)) } });
    await p.waitForTimeout(1500);
    C.check('level: the first look on a phone opens no moment and only notes the medal it is on (level 29: the 20s)', !(await p.$('.hl-moment')) && JSON.stringify(await p.evaluate(id => Object.keys(JSON.parse(localStorage.getItem(id + '_lvseen') || '{}')), H.ID)) === '["20"]');
    // 29 → 30: a new medal
    await p.evaluate(s => { const c = JSON.parse(localStorage.getItem('__stubcfg')); c.profile = JSON.parse(s); localStorage.setItem('__stubcfg', JSON.stringify(c)); window.__STUB.profile = c.profile; }, JSON.stringify(rwProfile(upperXp, { badges: shelfRows(), achievements: [] })));
    await p.evaluate(() => refreshCareer());
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    await p.waitForTimeout(1300);
    const h = await heroOf(p);
    C.check('level: crossing 30 opens the full-screen moment with the medal: "Level up · a new medal", "Level 30", the decade\'s name, from 30 to 39, when the next comes; Share it and Tell the crew',
      !!h && h.has && h.em && !h.card && h.eb === 'Level up · a new medal' && h.t === 'Level 30' && h.sub === 'Terracotta, from 30 to 39. The next medal comes at 40.' && h.btns.join('|') === 'Share it|Tell the crew|Not now' && !h.words, JSON.stringify(h));
    C.check('level: Tell the crew\'s one line, and it is kept on this phone as shown (the 30s)', (await p.evaluate(() => document.querySelector('.hl-m-crew').dataset.line)) === 'Just reached level 30.'
      && JSON.stringify(await p.evaluate(id => Object.keys(JSON.parse(localStorage.getItem(id + '_lvseen') || '{}')).sort(), H.ID)) === '["10","20","30"]');
    await p.screenshot({ path: path.join(OUT, 'moment-level-390.png') }).catch(() => {});
    await tap(p, '.hl-m-go');
    C.check('level: Share it is the level card in the share sheet', await p.evaluate(() => !!document.querySelector('#hist-overlay.visible .hl-prev')) && !(await p.$('.hl-moment')));
    await p.evaluate(() => history.back()); await p.waitForTimeout(300);
    // and not again
    await p.evaluate(() => refreshCareer()); await p.waitForTimeout(900);
    C.check('level: not again, and a level between (31) opens nothing', !(await p.$('.hl-moment')));
    await p.evaluate(s => { window.__STUB.profile = JSON.parse(s); }, JSON.stringify(rwProfile(xpForLevel(31), { badges: shelfRows(), achievements: [] })));
    await p.evaluate(() => refreshCareer()); await p.waitForTimeout(900);
    C.check('level: level 31 on the same medal is no moment', !(await p.$('.hl-moment')) && !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  // a new athlete: level 9 → 10 is a moment, and the first look at level 1 to 9 notes the chalk medal
  {
    const { ctx, p } = await openMe(browser, { profile: rwProfile(xpForLevel(9), { badges: [], achievements: [] }) });
    await p.waitForTimeout(1200);
    await p.evaluate(s => { window.__STUB.profile = JSON.parse(s); }, JSON.stringify(rwProfile(xpForLevel(10), { badges: [], achievements: [] })));
    await p.evaluate(() => refreshCareer());
    await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    const h = await heroOf(p);
    C.check('level: a new athlete reaching 10 gets the Slate medal: "Level 10", "Slate, from 10 to 19. The next medal comes at 20."', !!h && h.t === 'Level 10' && h.sub === 'Slate, from 10 to 19. The next medal comes at 20.', JSON.stringify(h));
    await ctx.close();
  }
  // never in the demo or the coach's preview; never over another moment
  for (const [name, query] of [['demo', '?client=demo'], ['coach preview', '?client=rel01_athlete&preview=1']]) {
    const { ctx, p } = await openMe(browser, { query: undefined, opts: { query }, profile: rwProfile(xpForLevel(30), { badges: [], achievements: [] }) });
    await p.waitForTimeout(1500);
    C.check(`level: ${name}: no moment`, !(await p.$('.hl-moment')));
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 4. SOMEONE ELSE'S PAGE: the level medal on their face, Trophies (won only, with the faces that cheered), All ›
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ck = n => 'a0000000-0000-4000-8000-0000000000' + String(n).padStart(2, '0');
function bellFx() {
  const now = Date.now(), iso = ms => new Date(ms).toISOString();
  const kinds = { level: true, week: true, mark: true, achievement: true, best: true, cycle: true, honour: true, open: true };
  const crew = [['Alex R.', 1, 24, true], ['Sam R.', 7, 27], ['Mina S.', 2, 14], ['Reza K.', 3, 22], ['Leila M.', 6, 9], ['Omid P.', 8, 5]].map(([who, n, lv, me]) => ({ who, me: !!me, ck: ck(n), fv: null, lv, since: '2026-10-19' }));
  return { lounge: 1, athlete_id: H.ID, at: iso(now), days: 7, kinds: Object.keys(kinds), me: { answer: 'yes', name: 'Alex R.', on_board: true, under13: false, can_post: true, photos_left: 3, posts_left: 10, ck: ck(1), fv: null, kinds },
    week: { members: 6, sessions: 14, held: 3 }, crew, honours: { month: '2026-09-01', rows: [] },
    items: [
      { t: 'line', key: ck(2) + ':a', who: 'Mina S.', me: false, ck: ck(2), fv: null, at: iso(now - 3600e3), kudos: { n: 0, mine: false, names: [] }, parts: [{ k: 'achievement', id: 'big_apple', name: 'Big Apple' }] },
      { t: 'line', key: ck(3) + ':b', who: 'Reza K.', me: false, ck: ck(3), fv: null, at: iso(now - 7200e3), kudos: { n: 0, mine: false, names: [] }, parts: [{ k: 'mark', item: 'century', at: 50 }] },
      { t: 'line', key: ck(6) + ':c', who: 'Leila M.', me: false, ck: ck(6), fv: null, at: iso(now - 9000e3), kudos: { n: 0, mine: false, names: [] }, parts: [{ k: 'level', n: 9 }] }] };
}
function samPage() {
  const s = (n, who) => ({ ck: ck(n), who, fv: null });
  const A = (id, name, day, signed, n) => ({ id: 'achievement:' + id, name, day, size: 'win', signed: signed || [], signed_n: n != null ? n : (signed || []).length });
  return { lv: 27, numbers: { weeks: { now: 15, best: 15 }, sessions: 88, bests: 19 }, cheers: { total: 42, season: 4, recent: [] },
    achievements: [A('night_owl', 'Night Owl', at(-3), [s(2, 'Mina S.'), s(3, 'Reza K.'), s(6, 'Leila M.')], 9), A('sessions_75', '75 Sessions', at(-9), [s(2, 'Mina S.')], 3), A('flawless', 'Flawless', at(-15), [s(3, 'Reza K.'), s(2, 'Mina S.'), s(8, 'Omid P.')], 12),
      A('the_lawns', 'The Lawns', at(-20)), A('red_clay', 'Red Clay', at(-30)), A('nowruz', 'Nowruz', at(-60)), A('by_the_book', 'By the Book', at(-70)), A('first_cycle', 'First Cycle', at(-90)), A('rematch_won', 'Rematch Won', at(-100)),
      A('held', 'Held', at(-120)), A('weeks_5', '5 Weeks in a Row', at(-110)), A('months_4', '4 Months in a Row', at(-40))] };
}
async function player(browser, C, OUT) {
  const mk = o => openMe(browser, Object.assign({ stage: true, stub: { bell: bellFx(), crewPages: { [ck(7)]: samPage() } } }, o || {}));
  const { ctx, p } = await mk();
  await p.waitForFunction(() => !!document.querySelector('#global-tabs .nav-item[data-tab="crew"]'), null, { timeout: 8000 }).catch(() => {});
  await p.evaluate(k => openPlayer(k), ck(7)); await p.waitForTimeout(700);
  const g = await p.evaluate(() => ({ medal: !!document.querySelector('#crewplayer-body .pl-lvm svg'), chip: !!document.querySelector('#crewplayer-body .pl-lv'), medalLab: (document.querySelector('#crewplayer-body .pl-lvm') || {}).getAttribute && document.querySelector('#crewplayer-body .pl-lvm').getAttribute('aria-label'),
    secs: [...document.querySelectorAll('#crewplayer-body .prog-sec')].map(e => e.textContent.replace(/\s+/g, ' ').trim()), cells: [...document.querySelectorAll('#crewplayer-body .cab-cell')].map(c => ({ l: c.querySelector('.cab-l').textContent, s: (c.querySelector('.cab-s') || {}).textContent, btn: c.tagName === 'BUTTON', faces: c.querySelectorAll('.pl-stk > *').length, more: (c.querySelector('.pl-mo') || {}).textContent })),
    all: (document.querySelector('#crewplayer-body .cab-all') || {}).textContent, ghosts: document.querySelectorAll('#crewplayer-body .cab-cell svg').length && [...document.querySelectorAll('#crewplayer-body .cab-cell svg')].filter(s => s.innerHTML.indexOf('var(--ghost') >= 0).length, side: document.documentElement.scrollWidth - innerWidth }));
  C.check('player: their level medal is on the corner of their face (the LV chip is gone)', g.medal && !g.chip && g.medalLab === 'Level 27', JSON.stringify([g.medal, g.chip, g.medalLab]));
  C.check('player: "Trophies · 15" (12 won and the 3 level medals they have reached), and All ›', g.secs.indexOf('Trophies · 15') >= 0 && g.all === 'All ›', JSON.stringify(g.secs));
  // Amir, 2026-10-25: "we dont need to see who cheered for their trophy": no faces, no +N, every trophy a button to what it is
  C.check('player: their three newest, newest first: Night Owl, 75 Sessions, Flawless; no faces of who cheered, each a button',
    JSON.stringify(g.cells.map(c => c.l)) === JSON.stringify(['Night Owl', '75 sessions', 'Flawless']) && g.cells.every(c => c.btn && c.faces === 0 && !c.more), JSON.stringify(g.cells));
  C.check('player: nothing on the page says who cheered a trophy', !(await p.evaluate(() => /every cheer|Cheered by/.test(document.getElementById('crewplayer-body').textContent))));
  C.check('player: only what they have won: every emblem is in colour, none is a ghost', g.ghosts === 0 && g.side <= 0, JSON.stringify([g.ghosts, g.side]));
  await p.screenshot({ path: path.join(OUT, 'player-top-390.png') }).catch(() => {});
  await p.evaluate(() => { const e = document.querySelector('#crewplayer-body .cab-trh'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 90); }); await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(OUT, 'player-trophies-390.png') }).catch(() => {});
  // a trophy opens what it is: its emblem, its name, what it asks for, and who won it when (no Share, no Tell the crew: those are the winner's)
  await tap(p, '#crewplayer-body .cab-cell');
  const ts = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'); return { t: (m.querySelector('.readiness-title') || {}).textContent, em: !!m.querySelector('.cab-sh-em svg'),
    rule: (m.querySelector('.cab-sh-p') || {}).textContent || '', meta: (m.querySelector('.cab-meta') || {}).textContent || '', btns: m.querySelectorAll('.cab-go, .cab-tell').length }; });
  C.check('player: a trophy opens what it is: Night Owl, its emblem, its rule, "Won by Sam" and the day, and no Share or Tell the crew',
    (await sheetOpen(p)) && ts.t === 'Night Owl' && ts.em && /after 9 at night/.test(ts.rule) && /^Won by Sam · \d+ [A-Z][a-z]{2}$/.test(ts.meta) && ts.btns === 0, JSON.stringify(ts));
  await p.evaluate(() => history.back()); await p.waitForTimeout(300);
  // All ›: the whole shelf, won only, grouped by the same sections, the level medals first
  await tap(p, '#crewplayer-body .cab-all');
  const a = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'); return { t: m.querySelector('.readiness-title').textContent, sub: m.querySelector('.readiness-sub').textContent, keys: [...m.querySelectorAll('.cab-pl-k')].map(e => e.textContent.trim()),
    cells: m.querySelectorAll('.cab-cell').length, ghosts: [...m.querySelectorAll('.cab-cell svg')].filter(s => s.innerHTML.indexOf('var(--ghost') >= 0).length, medals: [...m.querySelectorAll('.cab-pl-k')][0] && [...m.querySelectorAll('.cab-grid')][0].querySelectorAll('.cab-cell').length }; });
  C.check('player: All › is their whole shelf: "Sam\'s trophies", 15 won, the level medals first (1, 10, 20), then Sessions, Streaks, Habits… won only, no ghosts',
    a.t === 'Sam\'s trophies' && a.sub === '15 won so far.' && a.keys[0] === 'Level medals' && a.medals === 3 && a.cells === 15 && a.ghosts === 0 && a.keys.length >= 5, JSON.stringify(a));
  await p.screenshot({ path: path.join(OUT, 'player-all-390.png') }).catch(() => {});
  await p.evaluate(() => history.back()); await p.waitForTimeout(300);
  // their own switches decide: achievements off, level off
  const off = await openMe(browser, { stage: true, stub: { bell: bellFx(), crewPages: { [ck(7)]: Object.assign(samPage(), { achievements: [], lv: null }) } } });
  await off.p.waitForFunction(() => !!document.querySelector('#global-tabs .nav-item[data-tab="crew"]'), null, { timeout: 8000 }).catch(() => {});
  await off.p.evaluate(k => openPlayer(k), ck(7)); await off.p.waitForTimeout(700);
  const o2 = await off.p.evaluate(() => ({ trophies: !!document.querySelector('#crewplayer-body .cab-trh'), medal: !!document.querySelector('#crewplayer-body .pl-lvm') }));
  C.check('player: what they switched off is not there: no Trophies, no medal', !o2.trophies && !o2.medal, JSON.stringify(o2));
  await off.ctx.close();
  // your own page: the medal, Trophies, and "Only you" on what the crew cannot see
  const own = await mk({ stub: { bell: Object.assign(bellFx(), { me: Object.assign(bellFx().me, { kinds: { level: false, achievement: false } }) }), crewPages: { me: Object.assign(samPage(), { kinds: { level: false, achievement: false } }) } } });
  await own.p.waitForFunction(() => !!document.querySelector('#global-tabs .nav-item[data-tab="crew"]'), null, { timeout: 8000 }).catch(() => {});
  await own.p.evaluate(() => openPlayer('me')); await own.p.waitForTimeout(700);
  const o3 = await own.p.evaluate(() => ({ secs: [...document.querySelectorAll('#crewplayer-body .prog-sec')].map(e => e.textContent.replace(/\s+/g, ' ').trim()), lvl: (document.querySelector('#crewplayer-body .pl-lvl') || {}).textContent, medal: !!document.querySelector('#crewplayer-body .pl-lvm svg') }));
  C.check('player: on your own page a switched-off level and achievements still show, each marked Only you', o3.medal && /Level medal\s*Only you/.test(o3.lvl || '') && o3.secs.some(s => /^Trophies · \d+\s*Only you$/.test(s)), JSON.stringify(o3));
  await own.ctx.close();
  // 320 px and dark
  for (const dark of [false, true]) {
    const x = await mk({ w: 320, opts: { dark } });
    await x.p.waitForFunction(() => !!document.querySelector('#global-tabs .nav-item[data-tab="crew"]'), null, { timeout: 8000 }).catch(() => {});
    await x.p.evaluate(k => openPlayer(k), ck(7)); await x.p.waitForTimeout(700);
    const f = await x.p.evaluate(() => ({ side: document.documentElement.scrollWidth - innerWidth, right: Math.max(...[...document.querySelectorAll('#crewplayer-body .cab-cell')].map(c => c.getBoundingClientRect().right)) }));
    C.check(`player: 320px${dark ? ' dark' : ''}: Trophies fit, no sideways scroll`, f.side <= 0 && f.right <= 320, JSON.stringify(f));
    await x.ctx.close();
  }
  // the Bell (Amir, 2026-10-25: "every achievement that any one gets in crew should be clickable ... we dont need the medal of it on the crew screen"):
  // no emblem on a line; the achievement or the mark in it is a button that opens what it is
  const bl = await mk();
  await bl.p.waitForFunction(() => !!document.querySelector('#global-tabs .nav-item[data-tab="crew"]'), null, { timeout: 8000 }).catch(() => {});
  await bl.p.evaluate(() => goTo('crew')); await bl.p.waitForTimeout(800);
  const b = await bl.p.evaluate(() => [...document.querySelectorAll('#crew-body .cr-line')].map(l => ({ t: l.querySelector('.cr-lw').textContent.replace(/\s+/g, ' ').trim().slice(0, 40), svg: !!l.querySelector('svg.aae'), link: (l.querySelector('.cr-ach') || {}).textContent || '' })));
  C.check('crew: no emblem on any line; the achievement and the mark are buttons, a level line has none', b.length === 3 && b.every(x => !x.svg) && !!b[0].link && !!b[1].link && !b[2].link, JSON.stringify(b));
  await bl.p.screenshot({ path: path.join(OUT, 'crew-line-390.png') }).catch(() => {});
  for (const [i, want] of [[0, 'an achievement'], [1, 'a mark']]) {
    await bl.p.evaluate(n => document.querySelectorAll('#crew-body .cr-line')[n].querySelector('.cr-ach').click(), i); await bl.p.waitForTimeout(300);
    const s = await bl.p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'); return { open: document.getElementById('hist-overlay').classList.contains('visible'), em: !!m.querySelector('.cab-sh-em svg'), t: (m.querySelector('.readiness-title') || {}).textContent || '', meta: (m.querySelector('.cab-meta') || {}).textContent || '' }; });
    C.check(`crew: tapping ${want} on a line opens what it is, with its emblem, name and who won it`, s.open && s.em && !!s.t && (/^Won by /.test(s.meta) || /^Won /.test(s.meta)), JSON.stringify(s));
    await bl.p.evaluate(() => history.back()); await bl.p.waitForTimeout(300);
  }
  // the emblem's sheet offers Tell the crew (one plain line, sent on the tap) while the athlete can post
  await bl.p.evaluate(() => goTo('achievements'));
  await bl.p.waitForFunction(() => !!document.querySelector('#ach-body .cab-grid'), null, { timeout: 8000 }).catch(() => {});
  await tap(bl.p, '#ach-body .cab-cell[data-k="held"]');
  const tc = await bl.p.evaluate(() => { const b = document.querySelector('#hist-overlay .cab-tell'); return b ? { t: b.textContent.trim(), line: b.dataset.line } : null; });
  C.check('sheet: with the crew on, a won emblem offers Tell the crew with its one line, and nothing is posted before the tap', !!tc && tc.t === 'Tell the crew' && tc.line === 'Just won Held. Your first held week. Every session, on your days.' && (await calls(bl.p, 'crew_post')).length === 0, JSON.stringify(tc));
  await tap(bl.p, '#hist-overlay .cab-tell'); await bl.p.waitForTimeout(600);
  C.check('sheet: the tap puts that line on the Bell as a plain post and the button says so', (await calls(bl.p, 'crew_post')).length === 1 && /crew knows/i.test(await T(bl.p, '#hist-overlay .cab-tell')), await T(bl.p, '#hist-overlay .cab-tell'));
  await bl.p.evaluate(() => history.back()); await bl.p.waitForTimeout(300);
  C.check('crew: no page errors', !bl.p.errs.length, JSON.stringify(bl.p.errs));
  await bl.ctx.close();
  C.check('player: no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 5. THE SHARE CARD draws the emblem
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function shareCard(browser, C, OUT) {
  const { ctx, p } = await openMe(browser, { stage: true });
  await waitDoor(p);
  await goCab(p);
  await tap(p, '#ach-body .cab-cell[data-k="big_apple"]');
  const r = await p.evaluate(async () => {
    const SC = await hlLib();
    const base = { kind: 'achievement', first: 'Alex', name: 'Big Apple', meaning: 'commitment', caption: 'You trained while New York played.', date: '2026-10-20' };
    const px = async spec => { const c = await SC.paint(spec, { size: 'story' }); const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data; return { c, d, w: c.width }; };
    const a = await px(base), b = await px(Object.assign({}, base, { emblem: { k: 'ach', id: 'big_apple' } }));
    let diff = 0, n = 0; for (let i = 0; i < a.d.length; i += 4 * 7) { n++; if (Math.abs(a.d[i] - b.d[i]) + Math.abs(a.d[i + 1] - b.d[i + 1]) + Math.abs(a.d[i + 2] - b.d[i + 2]) > 60) diff++; }
    const bad = await SC.paint(Object.assign({}, base, { emblem: { k: 'ach', id: 'no_such_one' } }), { size: 'story' });
    return { diff, n, bad: !!bad };
  });
  C.check('share card: an achievement\'s card with its emblem differs from the seal card where the seal was (and still draws with an unknown id)', r.diff > 300 && r.bad, JSON.stringify(r));
  const b64 = await p.evaluate(async () => { const SC = await hlLib(); const c = await SC.paint({ kind: 'achievement', first: 'Alex', name: 'Big Apple', meaning: 'commitment', caption: 'You trained while New York played.', date: '2026-10-20', emblem: { k: 'ach', id: 'big_apple' } }, { size: 'story' }); return c.toDataURL('image/png').split(',')[1]; });
  fs.writeFileSync(path.join(OUT, 'sharecard-achievement-emblem.png'), Buffer.from(b64, 'base64'));
  // with no signal the emblem still draws: the font and the gradients come from the page and this site's own files
  await ctx.setOffline(true);
  const off = await p.evaluate(async () => { const SC = await hlLib(); const base = { kind: 'achievement', first: 'Alex', name: 'Big Apple', meaning: 'commitment', caption: 'x', date: '2026-10-20' };
    const a = await SC.paint(base, { size: 'story' }), b = await SC.paint(Object.assign({}, base, { emblem: { k: 'ach', id: 'big_apple' } }), { size: 'story' });
    const da = a.getContext('2d').getImageData(0, 0, a.width, a.height).data, db = b.getContext('2d').getImageData(0, 0, b.width, b.height).data; let diff = 0; for (let i = 0; i < da.length; i += 28) if (Math.abs(da[i] - db[i]) > 40) diff++; return diff; });
  C.check('share card: offline it still draws the emblem', off > 300, off);
  await ctx.setOffline(false);
  C.check('share card: no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 6. EARLY BIRD AND NIGHT OWL: the moment a session was finished, p_session.fin
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function finish(browser, C) {
  const { toReady } = R;
  const saves = p => calls(p, 'save_session');
  const finishIt = async p => { await toReady(p); await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click()); await p.evaluate(() => finishTap('1', document.querySelector('#confirm-1 .confirm-btn'))); await p.waitForTimeout(1600); };
  const { ctx, p } = await openMe(browser, {});
  const t0 = new Date();
  await finishIt(p);
  const s1 = (await saves(p)), last = s1[s1.length - 1];
  const t1 = new Date();
  const hm = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  C.check('fin: Done sends the local time it was finished in p_session.fin ("HH:MM")', !!last && /^\d{2}:\d{2}$/.test(last.p_session.fin) && [hm(t0), hm(t1)].indexOf(last.p_session.fin) >= 0, JSON.stringify(last && last.p_session.fin));
  // a later rating or note re-saves the same session: the same time, however late
  const fin0 = last.p_session.fin;
  await p.evaluate(() => { const t = loadTimer('1'); t.sessionEnd = Date.now() + 3 * 3600000; saveTimer('1', t); });   // the clock says something else now: the stamp must hold
  await p.evaluate(() => recordSessionToCloud('1')); await p.waitForTimeout(800);
  const s2 = await saves(p);
  C.check('fin: a re-save (a later rating, note or replay) says the same time and never "now"', s2.length > s1.length && s2[s2.length - 1].p_session.fin === fin0, JSON.stringify([fin0, s2[s2.length - 1].p_session.fin]));
  // a clock from before this stamp existed: its sessionEnd is read
  await p.evaluate(() => { const t = loadTimer('1'); delete t.fin; t.sessionEnd = new Date(2026, 9, 20, 6, 45).getTime(); saveTimer('1', t); });
  await p.evaluate(() => recordSessionToCloud('1')); await p.waitForTimeout(800);
  const s3 = await saves(p);
  C.check('fin: a timer from before reads its sessionEnd ("06:45")', s3[s3.length - 1].p_session.fin === '06:45', s3[s3.length - 1].p_session.fin);
  // unknown: no clock, or Done never pressed: the key is left out, and the save still goes
  await p.evaluate(() => { localStorage.removeItem(timerKey('1')); });
  await p.evaluate(() => { const q = _csqLoad().filter(e => false); _csqSave(q); });   // an empty queue: nothing to carry from
  await p.evaluate(() => recordSessionToCloud('1')); await p.waitForTimeout(800);
  const s4 = await saves(p), q4 = await p.evaluate(id => JSON.parse(localStorage.getItem(id + '_csq') || '[]'), H.ID);
  C.check('fin: no clock, no time: the key is left out and the save still goes', s4.length > s3.length && !('fin' in s4[s4.length - 1].p_session) && Array.isArray(q4), JSON.stringify(s4[s4.length - 1].p_session).slice(0, 80));
  // the queue carries it: an earlier version of the same session still waiting says it
  await p.evaluate(() => { const q = _csqLoad(); q.push({ p_athlete_id: ATHLETE_ID, p_day: 1, p_completed_on: sessionDateFor('1'), p_session: { status: 'x', fin: '05:55' }, _q: 'k1' }); _csqSave(q); });
  await p.evaluate(() => recordSessionToCloud('1')); await p.waitForTimeout(800);
  const s5 = await saves(p);
  C.check('fin: a session still waiting in the queue keeps the time it was queued with when the clock has gone', s5[s5.length - 1].p_session.fin === '05:55', s5[s5.length - 1].p_session.fin);
  // a save never fails because of it: an old server answers the same call
  C.check('fin: no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 7. THE PICTURES, 390 px wide, light and dark (into --out)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function pictures(browser, C, OUT) {
  for (const dark of [false, true]) {
    const tag = dark ? 'dark' : 'light';
    const { ctx, p } = await openMe(browser, { stage: true, opts: { dark }, stub: { bell: bellFx(), crewPages: { [ck(7)]: samPage() } } });
    await waitDoor(p);
    await goCab(p);
    const y = t => p.evaluate(t => { const e = [...document.querySelectorAll('#ach-body .cab-t')].find(x => x.textContent === t); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : 0; }, t);
    const at0 = async (name, yy) => { await p.evaluate(v => window.scrollTo(0, v), yy); await p.waitForTimeout(250); await p.screenshot({ path: path.join(OUT, `${name}-${tag}.png`) }); };
    await at0('cabinet-top', 0);
    await at0('cabinet-levels', (await y('Level 24')) - 24);
    await at0('cabinet-streaks', (await y('Streaks')) - 24);
    await at0('cabinet-habits', (await y('Habits')) - 24);
    await p.evaluate(() => window.scrollTo(0, 0));
    await tap(p, '#ach-body .cab-cell[data-k="held"]'); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `sheet-won-${tag}.png`) });
    await p.evaluate(() => history.back()); await p.waitForTimeout(300);
    await tap(p, '#ach-body .cab-cell[data-k="months_4"]'); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `sheet-notwon-${tag}.png`) });
    await p.evaluate(() => history.back()); await p.waitForTimeout(300);
    await p.evaluate(k => openPlayer(k), ck(7)); await p.waitForTimeout(800);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(OUT, `player-face-${tag}.png`) });
    await p.evaluate(() => { const e = document.querySelector('#crewplayer-body .cab-trh'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 96); }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(OUT, `player-trophies-${tag}.png`) });
    C.check(`pictures ${tag}: no page errors`, !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
    // the level moment
    const lo = rwProfile(xpForLevel(29), { badges: shelfRows(), achievements: [] }), hi = rwProfile(xpForLevel(30), { badges: shelfRows(), achievements: [] });
    const m = await openMe(browser, { profile: lo, opts: { dark }, stub: { bell: bellFx() } });
    await m.p.waitForTimeout(1200);
    await m.p.evaluate(s => { window.__STUB.profile = JSON.parse(s); }, JSON.stringify(hi));
    await m.p.evaluate(() => refreshCareer());
    await m.p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    await m.p.waitForTimeout(1500);
    await m.p.screenshot({ path: path.join(OUT, `moment-level-${tag}.png`) });
    await m.ctx.close();
    // the first medal after the chalk one: level 10, the Slate medal
    const n9 = rwProfile(xpForLevel(9), { badges: [], achievements: [] }), n10 = rwProfile(xpForLevel(10), { badges: [], achievements: [] });
    const t = await openMe(browser, { profile: n9, opts: { dark }, stub: { bell: bellFx() } });
    await t.p.waitForTimeout(1200);
    await t.p.evaluate(s => { window.__STUB.profile = JSON.parse(s); }, JSON.stringify(n10));
    await t.p.evaluate(() => refreshCareer());
    await t.p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
    await t.p.waitForTimeout(1500);
    await t.p.screenshot({ path: path.join(OUT, `moment-level10-${tag}.png`) });
    await t.ctx.close();
  }
}

// ── 320 px, and the cabinet's layout ──
async function narrow(browser, C) {
  for (const dark of [false, true]) {
    const { ctx, p } = await openMe(browser, { stage: true, w: 320, opts: { dark } });
    await waitDoor(p);
    await goCab(p);
    const f = await p.evaluate(() => ({ side: document.documentElement.scrollWidth - innerWidth, cells: [...document.querySelectorAll('#ach-body .cab-cell')].map(c => c.getBoundingClientRect()).filter(r => r.width).every(r => r.left >= 0 && r.right <= innerWidth + 0.5),
      chip: Math.min(...[...document.querySelectorAll('#ach-body .cab-chip')].map(b => { const r = b.getBoundingClientRect(); return Math.round(r.height + 8); })), cell: Math.min(...[...document.querySelectorAll('#ach-body .cab-cell')].map(b => Math.round(b.getBoundingClientRect().height))) }));
    C.check(`320px${dark ? ' dark' : ''}: the cabinet fits, nothing runs sideways, every emblem and chip is 44 px or more to hit`, f.side <= 0 && f.cells && f.chip >= 44 && f.cell >= 44, JSON.stringify(f));
    await ctx.close();
  }
}

// The month's honours (stage104, Amir 2026-10-25 "A, go with your picks"): a shelf of legendary trophies above Latest, from the honours Amir
// confirmed (the fixture's four and a "near", which is never shown), a sheet with the month and Share it, the share sheet behind it.
async function honours(browser, C, OUT) {
  const { ctx, p } = await openMe(browser, {});
  await goCab(p);
  const r = await p.evaluate(() => ({ cards: [...document.querySelectorAll('#ach-body .cab-hon')].map(c => c.querySelector('.cab-cn').firstChild.textContent + '/' + c.querySelector('.cab-cn small').textContent),
    svg: [...document.querySelectorAll('#ach-body .cab-hon svg')].length, first: (document.querySelector('#ach-body .cab-t') || {}).textContent }));
  C.check('honours: the shelf leads the cabinet with four trophies (no "near"), each named with its month', r.first === 'Honours' && r.cards.length === 4 && r.svg === 4
    && r.cards.map(c => c.split('/')[0]).sort().join() === 'Amir’s Pick,Full Month,Most improved,Most sessions' && r.cards.every(c => / \d{4}$/.test(c.split('/')[1])), JSON.stringify(r));
  await p.screenshot({ path: path.join(OUT, 'cabinet-honours.png') });
  await tap(p, '#ach-body .cab-hon[data-k$=":improved"]');
  const s = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'); const q = x => { const e = m.querySelector(x); return e ? e.textContent.trim() : null; };
    return { open: document.getElementById('hist-overlay').classList.contains('visible'), kind: q('.cab-sh-kind'), t: q('.readiness-title'), p: q('.cab-sh-p'), btn: q('.cab-go'), hon: !!m.querySelector('.cab-sh-em.is-hon svg') }; });
  await p.screenshot({ path: path.join(OUT, 'cabinet-honour-sheet.png') });
  C.check('honours: its sheet says Honour and the month, the name, what was done, and Share it', s.open && /^Honour · \w+ \d{4}$/.test(s.kind) && s.t === 'Most improved' && s.p === '+27.1% on Barbell Back Squat.' && s.btn === 'Share it' && s.hon, JSON.stringify(s));
  await tap(p, '#hist-overlay .cab-go');
  C.check('honours: Share it opens the honour card in the share sheet', await p.evaluate(() => !!document.querySelector('#hist-overlay.visible .hl-prev')));
  await p.evaluate(() => cabSetFilter('todo')); await p.waitForTimeout(250);
  C.check('honours: the To win filter has no honours shelf', !(await p.$('#ach-body .cab-hon')));
  C.check('honours: no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close();
}
async function main() {
  const C = H.checker(), OUT = H.outDir(), browser = await H.launch();
  try {
    await today(browser, C);
    await staged(browser, C);
    await moments(browser, C, OUT);
    await player(browser, C, OUT);
    await shareCard(browser, C, OUT);
    await finish(browser, C);
    await narrow(browser, C);
    await honours(browser, C, OUT);
    await pictures(browser, C, OUT);
  } finally { await browser.close(); }
  process.exitCode = C.report() ? 1 : 0;
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
