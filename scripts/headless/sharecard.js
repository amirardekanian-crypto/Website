// Highlight Reel, the share cards (assets/js/sharecard.js, 2026-10-17): node scripts/headless/sharecard.js [--out <dir>] [--only <kind,kind>] [--verbose]
//
// ShareCard.paint() draws ten cards onto a canvas: the training app's five (best, effort, retest, cycle, roadmap) and Career Mode's five
// Career Mode cards (achievement, mark, honour, open, player, level, goal, session), at two sizes (a 1080 x 1920 Story and a 1080 x 1350 post), in English and in Farsi.
// Every word goes through put(), which records where it sits (canvas._boxes), so this reads those boxes instead of looking at a picture.
// Each kind is painted from a NORMAL sample (realistic values, which must fit whole) and a LONG one (long names, 187.5 kg x 12, six cycles,
// five long steps, a 20-letter first name). Every sample runs at both sizes in both languages; the normal ones also with the weights hidden
// and with the name hidden (Story, both languages). All the data is made up (the athlete is Darya): this repo is public.
//
// Per run: it paints and the page logs no error · no text wider than the room it was given · every text inside the side margins · a Story's
// text clear of Instagram's bars (y 250 to 1580), a post's inside the card · the flow fits (_fit.over is 0) · no two texts overlap (a stamp,
// which is turned 4 degrees, gets 12 px) · normal samples only: nothing cut with an ellipsis and nothing left out · Farsi only: no digit
// left in 0-9, neither beside Arabic script nor as a bare number · the canvas is not blank. Also, beyond those: no "undefined" or "NaN" in
// any text · an English card holds no Arabic script, and a Farsi card shows the Farsi it was given (nameFa, captionFa, fromFa, stepsFa) · the
// weights switch hides every weight (and shows them when on) and the name switch hides the first name (and shows it when on). Once: EN and
// FA hold the same keys, the Shamsi dates, caption(), can(), no gold or yellow, the fonts loaded and every file the page asked for came back.
// A kind with no template yet is one FAIL line, never a crash. Long samples may be cut or lose a part (listed at the end), never overflow.
//
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this. A PNG of every
// normal sample goes to --out as <kind>[-variant]-<size>-<lang>.png (the long ones in its long/ folder). Some thousands of checks run, so the
// PASS lines are not listed unless --verbose is given; every FAIL line is, then one line per rule. --only runs just the kinds you name.
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const VERBOSE = process.argv.includes('--verbose');
const argVal = f => { const i = process.argv.indexOf(f); return i > 0 && process.argv[i + 1] && process.argv[i + 1].indexOf('--') !== 0 ? process.argv[i + 1] : ''; };
const ONLY = argVal('--only').split(',').map(s => s.trim()).filter(Boolean);
const C = H.checker();

// ── The made-up cards ────────────────────────────────────────────────────────────────────────────────────────────────────
// { id, card } per sample; the id is the PNG's name. Farsi strings are made up for the test (the real ones are Amir's to write).
const D = '2026-10-17', FIRST = 'Darya', FIRST_LONG = 'Maximilian-Alexander';
const CYC = { n: 2, of: 3, name: 'Load & Build' };
const CYC_LONG = { n: 12, of: 12, name: 'Foundation Forge and the Rebuild Engine' };
const LIFT_LONG = 'Single-Arm Dumbbell Romanian Deadlift to Bench';
const ART = n => '/assets/art/cycles/' + n + '-v1.webp';
// An effort card: id is the key of the words it gets (EFFORT_KEY), so every line of EN.effortLine is drawn once.
const eff = (id, shape, same, lift, a, b, more) => ({ id: 'effort-' + id, card: Object.assign({ kind: 'effort', first: FIRST, lift, shape, same, date: D, cycle: CYC, a, b }, more || {}) });

const NORMAL = [
  // best: a gain at the same reps · a gain in reps at the same weight · no earlier best · an earlier best at other reps and weight
  { id: 'best-kg', card: { kind: 'best', first: FIRST, lift: 'Trap Bar Deadlift', w: 100, r: 5, date: D, prev: { w: 95, r: 5, date: '2026-09-12' }, cycle: CYC } },
  { id: 'best-reps', card: { kind: 'best', first: FIRST, lift: 'Dumbbell Bulgarian Split Squat', w: 24, r: 10, date: D, prev: { w: 24, r: 8, date: '2026-09-22' }, cycle: CYC } },
  { id: 'best-first', card: { kind: 'best', first: FIRST, lift: 'Seated Cable Row', w: 57.5, r: 10, date: D, prev: null, cycle: null } },
  { id: 'best-mixed', card: { kind: 'best', first: FIRST, lift: 'Barbell Bench Press', w: 82.5, r: 5, date: D, prev: { w: 87.5, r: 3, date: '2026-08-30' }, cycle: CYC } },
  // effort: every shape, with and without a known effort (twelve lines of words)
  eff('kg', 'kg', true, 'Trap Bar Deadlift', { w: 92.5, n: 5, r: 8, date: '2026-09-15', wk: 1 }, { w: 100, n: 5, r: 8, date: '2026-10-13', wk: 5 }),
  eff('kgSameReps', 'kg', false, 'Barbell Back Squat', { w: 82.5, n: 5, r: 7, date: '2026-09-16', wk: 1 }, { w: 90, n: 5, r: 8, date: '2026-10-14', wk: 5 }),
  eff('reps', 'reps', true, 'Dumbbell Bulgarian Split Squat', { w: 22.5, n: 8, r: 8, date: '2026-09-15' }, { w: 22.5, n: 12, r: 8, date: '2026-10-13' }),
  eff('repsSameWeight', 'reps', false, 'Dumbbell Row', { w: 35, n: 8, r: 7, date: '2026-09-17' }, { w: 35, n: 11, r: 8, date: '2026-10-12' }),
  eff('kgEasier', 'kgEasier', true, 'Seated Overhead Press', { w: 40, n: 6, r: 9, date: '2026-09-15', wk: 1 }, { w: 42.5, n: 6, r: 8, date: '2026-10-13', wk: 5 }),
  eff('kgReps', 'kgReps', true, 'Romanian Deadlift', { w: 70, n: 6, r: 8, date: '2026-09-16', wk: 1 }, { w: 75, n: 8, r: 8, date: '2026-10-14', wk: 5 }),
  eff('bwReps', 'bwReps', true, 'Pull-Up', { n: 5, r: 8, date: '2026-09-15', wk: 1 }, { n: 8, r: 8, date: '2026-10-13', wk: 5 }),
  eff('bwRepsPlain', 'bwReps', false, 'Push-Up', { n: 12, date: '2026-09-17' }, { n: 18, date: '2026-10-12' }),
  eff('pctHarder', 'pctHarder', true, 'Barbell Hip Thrust', { w: 100, n: 8, r: 7, date: '2026-09-15', wk: 1 }, { w: 110, n: 8, r: 8, date: '2026-10-13', wk: 5 }, { pct: 7 }),
  eff('pctFewer', 'pctFewer', true, 'Leg Press', { w: 180, n: 10, r: 8, date: '2026-09-16', wk: 1 }, { w: 200, n: 8, r: 8, date: '2026-10-14', wk: 5 }, { pct: 5 }),
  eff('pctLess', 'pctLess', true, 'Lat Pulldown', { w: 70, n: 6, r: 8, date: '2026-09-17' }, { w: 65, n: 9, r: 8, date: '2026-10-12' }, { pct: 4 }),
  eff('pctBw', 'pctBw', true, 'Chin-Up', { n: 6, r: 8, date: '2026-09-17' }, { n: 7, r: 9, date: '2026-10-12' }, { pct: 6 }),
  // retest: same reps (a kilo gain) · same weight, more reps · neither
  { id: 'retest-sameReps', card: { kind: 'retest', first: FIRST, lift: 'Back Squat', spec: '5RM', oneCycle: true, now: { w: 100, r: 5, date: '2026-09-14' }, before: { w: 90, r: 5, date: '2026-08-03', test: true }, cycle: { n: 2 } } },
  { id: 'retest-sameWeight', card: { kind: 'retest', first: FIRST, lift: 'Trap Bar Deadlift', spec: '8RM', oneCycle: false, now: { w: 80, r: 8, date: '2026-09-15' }, before: { w: 80, r: 6, date: '2026-07-21', test: false }, cycle: { n: 2 } } },
  { id: 'retest-different', card: { kind: 'retest', first: FIRST, lift: 'Barbell Bench Press', spec: '5RM', oneCycle: false, now: { w: 105, r: 5, date: '2026-10-05' }, before: { w: 110, r: 3, date: '2026-07-20', test: true }, cycle: { n: 3 } } },
  { id: 'cycle', card: { kind: 'cycle', first: FIRST, cycle: { n: 2, of: 3, name: 'Load & Build', art: ART('build') }, done: 19, planned: 20, bests: 3, weeks: 5, end: '2026-10-06',
    wins: [
      { lift: 'Trap Bar Deadlift', shape: 'kg', same: true, a: { w: 92.5, n: 5, r: 8 }, b: { w: 100, n: 5, r: 8 } },
      { lift: 'Split Squat', shape: 'reps', same: true, a: { w: 22.5, n: 8, r: 8 }, b: { w: 22.5, n: 12, r: 8 } },
      { lift: 'Bench Press', shape: 'kg', same: true, a: { w: 60, n: 6, r: 8 }, b: { w: 65, n: 6, r: 8 } },
    ] } },
  { id: 'roadmap', card: { kind: 'roadmap', first: FIRST, weeks: 15, sessions: 58, start: '2026-07-07', end: D,
    cycles: [{ name: 'Foundation Forge', art: ART('bedrock') }, { name: 'Load & Build', art: ART('build') }, { name: 'Strength Engine', art: ART('iron') }] } },
  // Career Mode's cards (the 2026-10-19 pass: no badge, title or quest — they left the server with the cut). The Farsi here is
  // invented for the test, with Persian digits, as the catalogue's will have to be.
  { id: 'achievement', card: { kind: 'achievement', first: FIRST, name: 'First Treble', nameFa: 'هفتهٔ بی‌نقص', meaning: 'consistency',
    caption: 'Three missions, three done.', captionFa: 'سه مأموریت، هر سه انجام شد.', date: D } },
  // The spec the server hands over, with no nameFa or captionFa yet (Amir writes them): a Farsi card falls back to the English
  // words and must still fit, in Persian digits.
  { id: 'achievement-server', card: { kind: 'achievement', first: FIRST, name: 'THE FOUNDRY', meaning: 'commitment', caption: 'Four weeks of putting the work in.', date: D } },
  { id: 'achievement-server-best', card: { kind: 'achievement', first: FIRST, name: 'First Best', meaning: 'progress', caption: 'Your first personal best. Not the last.', date: D } },
  { id: 'achievement-win', card: { kind: 'achievement', first: FIRST, name: 'FIRST BLOOD', meaning: 'commitment', caption: 'Your first session on the board', date: D } },
  // The four numbers' marks (L3), one of each
  { id: 'mark-weeks', card: { kind: 'mark', first: FIRST, key: 'weeks_held', n: 8, next: 12, date: D } },
  { id: 'mark-sessions', card: { kind: 'mark', first: FIRST, key: 'sessions_with_amir', n: 50, next: 100, date: D } },
  { id: 'mark-bests', card: { kind: 'mark', first: FIRST, key: 'personal_bests', n: 25, next: 50, date: D } },
  { id: 'mark-comebacks', card: { kind: 'mark', first: FIRST, key: 'comebacks', n: 3, next: 5, date: D } },
  { id: 'mark-last', card: { kind: 'mark', first: FIRST, key: 'weeks_held', n: 52, next: 0, date: D } },
  // The month's honours (L9). A card never names another athlete: the place and the size of the field, nothing more.
  { id: 'honour-sessions', card: { kind: 'honour', first: FIRST, honour: 'sessions', month: 'September', n: 18, place: 1, field: 14, date: D } },
  { id: 'honour-improved', card: { kind: 'honour', first: FIRST, honour: 'improved', month: 'September', pct: 8.4, lift: 'Trap Bar Deadlift', place: 1, field: 14, date: D } },
  { id: 'honour-full', card: { kind: 'honour', first: FIRST, honour: 'full_month', month: 'September', date: D } },
  { id: 'honour-pick', card: { kind: 'honour', first: FIRST, honour: 'pick', month: 'September', date: D } },
  // As program.html really sends them (hlMomentSpec / hlOpenSpec): the month as an ISO day, named by the card in its own language.
  { id: 'honour-iso', card: { kind: 'honour', first: FIRST, honour: 'sessions', monthIso: '2026-09-01', n: 18, place: 1, field: 14, date: D } },
  // The Monthly Open (stage85): Amir's own words for what counts, and the athlete's place
  { id: 'open', card: { kind: 'open', first: FIRST, title: 'The Spider', month: 'October', value: 14.2, unit: 'sec', place: 2, field: 11,
    how: 'Six touches, baseline to each corner and back. Fastest time.', date: D } },
  { id: 'open-noplace', card: { kind: 'open', first: FIRST, title: '5K', month: 'October', value: 24.5, unit: 'min', date: D } },
  { id: 'open-iso', card: { kind: 'open', first: FIRST, title: 'The Spider', monthIso: '2026-10-01', value: 14.2, unit: 'sec', place: 2, field: 11, date: D } },
  // The athlete's own card, any day
  { id: 'player', card: { kind: 'player', first: FIRST, level: 17, weeks: 8, sessions: 64, bests: 23, comebacks: 2, since: '2026-02-11', date: D,
    lifts: [{ name: 'Trap Bar Deadlift', w: 100, r: 5 }, { name: 'Barbell Back Squat', w: 90, r: 5 }, { name: 'Barbell Bench Press', w: 65, r: 6, u: 'kg' }] } },
  { id: 'player-new', card: { kind: 'player', first: FIRST, level: 2, weeks: 1, sessions: 3, bests: 1, comebacks: 0, date: D, lifts: [] } },
  // A new level (no rank name anywhere), the month's goal, a session
  { id: 'level', card: { kind: 'level', first: FIRST, level: 14, date: D } },
  { id: 'goal', card: { kind: 'goal', first: FIRST, month: 'October', text: 'Three sessions a week, every week, and log every set.',
    textFa: 'هفته‌ای سه جلسه، هر هفته، و همهٔ ست‌ها رو ثبت کن.', date: D } },
  { id: 'goal-server', card: { kind: 'goal', first: FIRST, month: 'October', text: 'Get the deadlift to 100 kg at RPE 8.', date: D } },
  { id: 'goal-iso', card: { kind: 'goal', first: FIRST, monthIso: '2026-10-01', text: 'Three sessions a week, every week.', date: D } },
  { id: 'session', card: { kind: 'session', first: FIRST, title: 'Lower Power', cycle: CYC, mins: 54, exercises: 7, sets: 22, date: D } },
  { id: 'session-plain', card: { kind: 'session', first: FIRST, title: 'Banded Lower Burner', mins: 38, date: D } },
];

// The stress samples: the longest names, the biggest numbers, the most rows. Cut text and left-out parts are allowed here (and listed).
const LONG = [
  { id: 'best-long', card: { kind: 'best', first: FIRST_LONG, lift: LIFT_LONG, w: 187.5, r: 12, date: D, prev: { w: 182.5, r: 12, date: '2026-09-12' }, cycle: CYC_LONG } },
  { id: 'effort-long', card: { kind: 'effort', first: FIRST_LONG, lift: LIFT_LONG, shape: 'kgReps', same: true, date: D, cycle: CYC_LONG,
    a: { w: 182.5, n: 10, r: 8, date: '2026-09-15', wk: 1 }, b: { w: 192.5, n: 14, r: 8, date: '2026-10-13', wk: 5 } } },
  { id: 'effort-longPct', card: { kind: 'effort', first: FIRST_LONG, lift: LIFT_LONG, shape: 'pctLess', pct: 12, date: D, cycle: CYC_LONG,
    a: { w: 197.5, n: 12, r: 9, date: '2026-09-15', wk: 1 }, b: { w: 187.5, n: 16, r: 9, date: '2026-10-13', wk: 5 } } },
  { id: 'retest-long', card: { kind: 'retest', first: FIRST_LONG, lift: LIFT_LONG, spec: '10RM', oneCycle: false, now: { w: 182.5, r: 12, date: '2026-10-05' },
    before: { w: 187.5, r: 10, date: '2026-07-20', test: true }, cycle: { n: 12 } } },
  { id: 'cycle-long', card: { kind: 'cycle', first: FIRST_LONG, cycle: { n: 12, of: 12, name: CYC_LONG.name, art: ART('engine') }, done: 119, planned: 120, bests: 24, weeks: 12, end: '2026-10-06',
    wins: [
      { lift: LIFT_LONG, shape: 'kgReps', same: true, a: { w: 182.5, n: 10, r: 8 }, b: { w: 192.5, n: 14, r: 8 } },
      { lift: 'Barbell Hip Thrust with Banded Abduction Hold', shape: 'pctLess', pct: 12, a: { w: 197.5, n: 12, r: 9 }, b: { w: 187.5, n: 16, r: 9 } },
      { lift: 'Weighted Pull-Up with Slow Eccentric Lowering', shape: 'reps', same: true, a: { w: 42.5, n: 6, r: 8 }, b: { w: 42.5, n: 10, r: 8 } },
    ] } },
  { id: 'roadmap-long', card: { kind: 'roadmap', first: FIRST_LONG, weeks: 30, sessions: 118, start: '2026-02-02', end: D,
    cycles: [
      { name: 'Foundation Forge and the Rebuild Engine', art: ART('bedrock') }, { name: 'Load and Build the Strength Reserve', art: ART('build') },
      { name: 'Power Phase: Speed Under Load', art: ART('voltage') }, { name: 'Peak Week and Pre-Competition Taper', art: ART('peak') },
      { name: 'Reset, Restore and Return to Play', art: ART('reset') }, { name: 'Voltage Season Opening Block', art: ART('spring') },
    ] } },
  { id: 'achievement-long', card: { kind: 'achievement', first: FIRST_LONG, name: 'The First Held Week After the Long Comeback', nameFa: 'اولین هفتهٔ کامل بعد از بازگشت طولانی', meaning: 'resilience',
    caption: 'Your first held week back after the layoff. Every session, on your days, with nothing skipped and nothing rushed.',
    captionFa: 'اولین هفتهٔ کامل بعد از وقفه. همهٔ جلسه‌ها، توی روزهای خودت، بدون جا انداختن و بدون عجله.', date: D } },
  { id: 'mark-long', card: { kind: 'mark', first: FIRST_LONG, key: 'sessions_with_amir', n: 500, next: 1000, date: D } },
  { id: 'honour-long', card: { kind: 'honour', first: FIRST_LONG, honour: 'improved', month: 'September', pct: 128.5,
    lift: 'Single-Arm Dumbbell Romanian Deadlift to Bench', place: 11, field: 128, date: D } },
  { id: 'open-long', card: { kind: 'open', first: FIRST_LONG, title: 'The Spider Drill and the Baseline Shuttle', month: 'October', value: 128.75, unit: 'seconds', place: 12, field: 128,
    how: 'Six touches, baseline to each corner and back, then the shuttle from the service line to the net and back twice, timed from the first step to the last touch.', date: D } },
  { id: 'player-long', card: { kind: 'player', first: FIRST_LONG, level: 195, weeks: 52, sessions: 1280, bests: 128, comebacks: 12, since: '2024-02-11', date: D,
    lifts: [{ name: LIFT_LONG, w: 187.5, r: 12 }, { name: 'Barbell Hip Thrust with Banded Abduction Hold', w: 197.5, r: 12 }, { name: 'Weighted Pull-Up with Slow Eccentric Lowering', w: 42.5, r: 10 }] } },
  { id: 'level-long', card: { kind: 'level', first: FIRST_LONG, level: 195, date: D } },
  { id: 'goal-long', card: { kind: 'goal', first: FIRST_LONG, month: 'September', text: 'Three sessions a week, every week of the month, every set logged and every check-in answered before you start, and the deadlift up to 110 kg at the same effort by the last week.',
    textFa: 'هفته‌ای سه جلسه، همهٔ هفته‌های ماه، همهٔ ست‌ها ثبت شده و چک‌این قبل از شروع، و ددلیفت تا ۱۱۰ کیلو با همون فشار تا هفتهٔ آخر.', date: D } },
  { id: 'session-long', card: { kind: 'session', first: FIRST_LONG, title: 'Foundation Forge and the Rebuild Engine, Lower Power Day', cycle: CYC_LONG, mins: 128, exercises: 14, sets: 48, date: D } },
];
// ── The three measures (2026-10-18): a weight is in kg, lb or plates (the count on a machine's stack) ─────────────────────────────────
// Every card that can show a weight (best, effort, retest, cycle) is drawn again in pounds and in plates, from its kg sample: the same
// sets, every weight turned into the other measure (lb is the kg number doubled, plates the kg number over 8 to the half), with `u` on the
// spec (on each win for the cycle card). The numbers are made up and never "converted": the card prints what the spec holds.
// A bodyweight sample is drawn in them too, to prove a unit word does not appear where no weight does.
const MEASURE_MAP = { lb: w => w * 2, plates: w => Math.round(w / 8 * 2) / 2 };
function inMeasure(s, u) {
  const f = MEASURE_MAP[u], c = JSON.parse(JSON.stringify(s.card));
  const set = o => { if (o && o.w != null) o.w = f(o.w); };
  if (c.kind === 'best') { set(c); set(c.prev); c.u = u; }
  else if (c.kind === 'effort') { set(c.a); set(c.b); c.u = u; }
  else if (c.kind === 'retest') { set(c.now); set(c.before); c.u = u; }
  else if (c.kind === 'cycle') (c.wins || []).forEach(w => { set(w.a); set(w.b); w.u = u; });
  return Object.assign({}, s, { id: s.id + '-' + u, card: c });
}
// The edge cases of the words: exactly one plate is "1 plate" (a gain of one is "+1 plate"), every other count "plates" ("+0.5 plates",
// "+2.5 plates", "10 plates"); a cycle card whose three wins are in three measures prints each win's own; an unknown measure is kg.
const plateBest = (id, lift, w, r, pw, pr) => ({ id: 'best-plates-' + id, card: { kind: 'best', first: FIRST, lift, u: 'plates', w, r, date: D, prev: { w: pw, r: pr, date: '2026-09-12' }, cycle: CYC } });
const EXTRA = [
  // (the earlier bar of "one" has other reps: a gain of 0.5 would be the same number as the bar's weight, and with the weights hidden the
  // test could not tell a change from a weight)
  plateBest('one', 'Leg Press', 1, 8, 0.5, 6),
  plateBest('gainOne', 'Seated Cable Row', 6, 10, 5, 10),
  plateBest('gainHalf', 'Leg Press', 3, 8, 2.5, 8),
  plateBest('gainTwoHalf', 'Leg Press', 10, 8, 7.5, 8),
  { id: 'effort-plates-gainOne', card: { kind: 'effort', first: FIRST, lift: 'Lat Pulldown', u: 'plates', shape: 'kg', same: true, date: D, cycle: CYC,
    a: { w: 11, n: 8, r: 8, date: '2026-09-15', wk: 1 }, b: { w: 12, n: 8, r: 8, date: '2026-10-13', wk: 5 } } },
  { id: 'effort-plates-reps', card: { kind: 'effort', first: FIRST, lift: 'Seated Cable Row', u: 'plates', shape: 'reps', same: true, date: D, cycle: CYC,
    a: { w: 1, n: 8, r: 8, date: '2026-09-15' }, b: { w: 1, n: 12, r: 8, date: '2026-10-13' } } },
  { id: 'retest-plates-gainOne', card: { kind: 'retest', first: FIRST, lift: 'Leg Press', u: 'plates', spec: '8RM', oneCycle: true, now: { w: 6, r: 8, date: '2026-09-14' },
    before: { w: 5, r: 8, date: '2026-08-03', test: true }, cycle: { n: 2 } } },
  { id: 'cycle-mixed', card: { kind: 'cycle', first: FIRST, cycle: { n: 2, of: 3, name: 'Load & Build', art: ART('build') }, done: 19, planned: 20, bests: 3, weeks: 5, end: '2026-10-06',
    wins: [
      { lift: 'Trap Bar Deadlift', u: 'kg', shape: 'kg', same: true, a: { w: 92.5, n: 5, r: 8 }, b: { w: 100, n: 5, r: 8 } },
      { lift: 'Dumbbell Row', u: 'lb', shape: 'reps', same: true, a: { w: 70, n: 6, r: 8 }, b: { w: 70, n: 10, r: 8 } },
      { lift: 'Leg Press', u: 'plates', shape: 'kg', same: false, a: { w: 11, n: 8, r: 8 }, b: { w: 12, n: 8, r: 8 } },
    ] } },
];
const BASE_SAMPLES = NORMAL.map(s => Object.assign({ long: false, kind: s.card.kind }, s)).concat(LONG.map(s => Object.assign({ long: true, kind: s.card.kind }, s)));
const WEIGHTED_KINDS = ['best', 'effort', 'retest', 'cycle'];
const MEASURED = [];
BASE_SAMPLES.filter(s => WEIGHTED_KINDS.includes(s.kind)).forEach(s => ['lb', 'plates'].forEach(u => MEASURED.push(inMeasure(s, u))));
const SAMPLES = BASE_SAMPLES.concat(MEASURED, EXTRA.map(s => Object.assign({ long: false, kind: s.card.kind }, s)));

// ── Reading a run ────────────────────────────────────────────────────────────────────────────────────────────────────────
const ARABIC = /[؀-ۿ]/, ASCII_DIGIT = /[0-9]/, LATIN_LETTER = /[A-Za-z]/, BAD_TEXT = /undefined|NaN|\[object|Infinity/;
const snip = (s, n) => { s = String(s).replace(/\s+/g, ' '); n = n || 30; return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const bx = b => `${b.role} "${snip(b.text)}" @${b.x},${b.y} ${b.w}x${b.h}`;
// A box flagged cut that does not end in "…" lost words without a sign (big does this: it keeps its first lines and drops the rest).
const cutNote = b => `${b.role} "${snip(b.text, 24)}"` + (/…$/.test(b.text) ? '' : ' (no ellipsis: words just vanish)');
// The first two words of a Farsi string: where it must show up on a Farsi card.
const needle = t => String(t).trim().split(/\s+/).slice(0, 2).join(' ');
const list = (arr, f, n) => { n = n || 3; return arr.length ? arr.slice(0, n).map(f).join(' | ') + (arr.length > n ? ` (+${arr.length - n} more)` : '') : undefined; };
// The numbers in a text, as plain digits: "۱۸۷٫۵ کیلو" and "187.5 kg" both give "187.5".
const toAscii = s => String(s).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6F0)).replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/٫/g, '.');
const numbersIn = s => toAscii(s).match(/\d+(?:\.\d+)?/g) || [];
// Every absolute weight in a card's data, written the way the card writes one (to the half kilo): what hiding the weights must remove.
function weightsOf(card) {
  const out = new Set(), add = v => { if (Number(v) > 0) out.add(String(Math.round(Number(v) * 2) / 2)); };
  if (card.kind === 'best') { add(card.w); if (card.prev) add(card.prev.w); }
  if (card.kind === 'effort') { add(card.a.w); add(card.b.w); }
  if (card.kind === 'retest') { add(card.now.w); add(card.before.w); }
  if (card.kind === 'cycle') (card.wins || []).forEach(w => { add(w.a.w); add(w.b.w); });
  return [...out];
}

// ── The measures: which unit words a card should and should not carry ────────────────────────────────────────────────────────────────
const UNITS = ['kg', 'lb', 'plates'];
const uk = u => (u === 'lb' || u === 'plates' ? u : 'kg');                      // the painter's own default: absent or unknown is kg
const UNIT_WORD = { en: { kg: 'kg', lb: 'lb', plates: 'plates?' }, fa: { kg: 'کیلو', lb: 'پوند', plates: 'پلیت' } };
// A unit word anywhere / straight after a number ("100 kg", "۶ پلیت" read as "6 پلیت"). Latin words are whole words, case aside.
const wordRx = (lang, x) => lang === 'fa' ? new RegExp(UNIT_WORD.fa[x]) : new RegExp('\\b(?:' + UNIT_WORD.en[x] + ')\\b', 'i');
const afterNumRx = (lang, x) => lang === 'fa' ? new RegExp('\\d ?' + UNIT_WORD.fa[x]) : new RegExp('\\d ?(?:' + UNIT_WORD.en[x] + ')\\b', 'i');
const WEIGHT_SHAPES = ['kg', 'kgEasier', 'kgReps'];   // the shapes whose words say a weight change (+7.5 kg), shown or hidden
// The measures a spec uses (a cycle card: one per win).
function usedUnits(card) {
  if (card.kind === 'cycle') return new Set((card.wins || []).map(w => uk(w.u)));
  return new Set([uk(card.u)]);
}
// The measures whose unit word the CARD must show (its painted text): where a weight is on it, or, with the weights hidden, a weight change.
function unitsShown(card, show) {
  const out = new Set();
  if (card.kind === 'best') { if (show || (card.prev && +card.prev.r === +card.r && card.w > card.prev.w)) out.add(uk(card.u)); }
  else if (card.kind === 'retest') { if (show || (+card.before.r === +card.now.r && card.now.w > card.before.w)) out.add(uk(card.u)); }
  else if (card.kind === 'effort') { if ((show && (card.a.w || card.b.w)) || WEIGHT_SHAPES.includes(card.shape)) out.add(uk(card.u)); }
  else if (card.kind === 'cycle') (card.wins || []).slice(0, 3).forEach(w => {
    if (WEIGHT_SHAPES.includes(w.shape) || (show && w.shape === 'reps' && w.b.w)) out.add(uk(w.u));
  });
  return out;
}
// The same for caption() (its words are the short form: the change, or the set when the weights are shown; a cycle's has no weight).
function unitsInCaption(card, show) {
  const out = new Set();
  if (card.kind === 'best') { if (show || (card.prev && +card.prev.r === +card.r)) out.add(uk(card.u)); }
  else if (card.kind === 'retest') { if (show || card.now.w > card.before.w) out.add(uk(card.u)); }
  else if (card.kind === 'effort') { if (WEIGHT_SHAPES.includes(card.shape) || (show && card.shape === 'reps' && card.b.w)) out.add(uk(card.u)); }
  return out;
}
// A text's unit words that do not belong: a measure the card does not use, and (a Farsi card) any Latin unit at all.
function strayUnits(text, lang, used) {
  const out = [];
  UNITS.forEach(x => {
    if (!used.has(x) && wordRx(lang, x).test(text)) out.push(x);
    if (lang === 'fa' && wordRx('en', x).test(text)) out.push('Latin ' + x);
  });
  return out;
}
// English plates: exactly 1 is "plate", every other count "plates" ("1 plate", "+0.5 plates", "10 plates"). Returns the breaches.
function pluralBreaches(text) {
  const out = [], rx = /(?<![\d.])(\d+(?:\.\d+)?) (plates?)\b/gi;
  let m;
  while ((m = rx.exec(text))) if ((Number(m[1]) === 1) !== (m[2].toLowerCase() === 'plate')) out.push(`"${m[1]} ${m[2]}"`);
  return out;
}

const R = {
  paints: 'paints, and the page logs no error',
  room: 'no text past its room',
  side: 'every text inside the side margins',
  bars: "a Story's text clear of Instagram's bars (y 250 to 1580)",
  inCard: "a post's text inside the card",
  fit: 'the flow fits (_fit.over is 0)',
  overlap: 'no two texts overlap',
  whole: 'fits whole (nothing cut with an ellipsis, nothing left out)',
  digits: 'every digit on a Farsi card is Persian',
  blank: 'the canvas is not blank',
  sane: 'no "undefined", "NaN" or "[object" in any text',
  en: 'an English card holds no Arabic script',
  fa: 'a Farsi card shows the Farsi it was given (nameFa, captionFa, fromFa, stepsFa)',
  noW: 'weights hidden: no weight on the card',
  yesW: 'weights shown: the card shows its weights',
  noN: 'name hidden: no first name on the card',
  yesN: 'name shown: the first name is on the card',
  noWu: 'weights hidden: no weight written with a unit (any measure)',
  unitOn: "the card's measure (kg, lb or plates) is the unit word wherever a weight, or a weight change, is shown",
  unitOff: 'no unit word of a measure the card does not use (kg on a lb or plates card), no Latin unit on a Farsi card',
  plural: 'English plates: "1 plate", every other count "plates"',
};
const TALLY = {}, LONG_NOTES = [];
function note(rule, name, ok, detail) {
  C.check(name + ': ' + rule, ok, detail);
  const t = TALLY[rule] || (TALLY[rule] = { runs: 0, fails: [] });
  t.runs++;
  if (!ok) t.fails.push(name);
}

// All the rules for one painted card. res is what the page's run() returned.
function judge(name, s, cb, res) {
  const exp = { W: 1080, H: cb.size === 'story' ? 1920 : 1350 };
  let bad = '';
  if (res.error) bad = res.error;
  else if (res.newErrs.length) bad = 'page error: ' + res.newErrs.join(' | ');
  else if (!res.boxes || !res.fit || !res.size) bad = 'the canvas has no _boxes / _fit / _size';
  else if (res.w !== exp.W || res.h !== exp.H) bad = `canvas is ${res.w}x${res.h}, not ${exp.W}x${exp.H}`;
  else if (!cb.tag && !res.png) bad = 'toDataURL failed: ' + (res.pngError || 'no data');
  note(R.paints, name, !bad, bad || undefined);
  if (res.error || !res.boxes) return;
  const boxes = res.boxes, S = res.size || {}, fit = res.fit || {};

  const room = boxes.filter(b => b.w > b.maxW + 0.5);
  note(R.room, name, !room.length, list(room, b => `${b.role} "${snip(b.text)}" w ${b.w} > maxW ${b.maxW} (size ${b.size})`));

  const lo = (S.pad || 84) - 1, hi = (S.W || 1080) - (S.pad || 84) + 1;
  const side = boxes.filter(b => b.x < lo || b.x + b.w > hi);
  note(R.side, name, !side.length, list(side, b => `${b.role} "${snip(b.text)}" spans ${b.x}..${Math.round(b.x + b.w)}, the margins are ${lo + 1}..${hi - 1}`));

  if (cb.size === 'story') {
    const v = boxes.filter(b => b.y < 250 || b.y + b.h > 1920 - 340);
    note(R.bars, name, !v.length, list(v, b => `${bx(b)} is outside 250..1580`));
  } else {
    const v = boxes.filter(b => b.y < 0 || b.y + b.h > (S.H || 1350));
    note(R.inCard, name, !v.length, list(v, b => `${bx(b)} is outside 0..${S.H || 1350}`));
  }

  note(R.fit, name, fit.over === 0, `over ${fit.over}, k ${fit.k}, end ${fit.end}`);

  const hits = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    const tol = a.role === 'stamp' || b.role === 'stamp' ? 12 : 4;
    if (ox > tol && oy > tol) hits.push({ a, b, ox, oy });
  }
  note(R.overlap, name, !hits.length, list(hits, h => `${bx(h.a)} x ${bx(h.b)} by ${Math.round(h.ox)}x${Math.round(h.oy)}`, 2));

  const cut = boxes.filter(b => b.cut), dropped = fit.dropped || [];
  if (!s.long) note(R.whole, name, !cut.length && !dropped.length, (cut.length ? 'cut: ' + list(cut, cutNote) : '') + (cut.length && dropped.length ? ' · ' : '') + (dropped.length ? 'left out: ' + dropped.join(', ') : '') || undefined);
  else if (!cb.tag && (cut.length || dropped.length)) LONG_NOTES.push({ name, k: fit.k, cut: cut.map(cutNote), dropped });

  // A digit not turned Persian: beside Arabic script (the card's own sentence) or as a bare number. A Latin name with a digit ("Back Squat · 5RM") is Latin and stays.
  if (cb.lang === 'fa') {
    const v = boxes.filter(b => b.role !== 'foot' && ASCII_DIGIT.test(b.text) && (ARABIC.test(b.text) || !LATIN_LETTER.test(b.text)));
    note(R.digits, name, !v.length, list(v, b => `${bx(b)} holds the digit ${b.text.match(ASCII_DIGIT)[0]}`));
  }

  const px = res.px;
  note(R.blank, name, !!px && px.distinct >= 2 && px.centreMax > 0,
    px ? `${px.distinct} distinct colours in 400 samples, brightest centre channel ${px.centreMax}` : (res.pxError || 'no pixels'));

  const sane = boxes.filter(b => BAD_TEXT.test(b.text));
  note(R.sane, name, !sane.length, list(sane, bx));

  // The language of the words: no Farsi on an English card, and the Farsi the catalogue gave on a Farsi card.
  if (cb.lang === 'en') {
    const v = boxes.filter(b => ARABIC.test(b.text));
    note(R.en, name, !v.length, list(v, bx));
  } else if (!cb.tag && !s.long) {
    const c = s.card, given = [];
    ['nameFa', 'captionFa', 'fromFa'].forEach(k => { if (c[k]) given.push([k, c[k]]); });
    (c.stepsFa || []).forEach((t, i) => given.push(['stepsFa[' + i + ']', t]));
    if (given.length) {
      const all = boxes.map(b => b.text).join('\n'), miss = given.filter(g => !all.includes(needle(g[1])));
      note(R.fa, name, !miss.length, 'not on the card: ' + miss.map(g => g[0] + ' "' + snip(g[1], 26) + '"').join(', '));
    }
  }

  // The switches. Hidden: nothing of it left anywhere. Shown (a normal sample, switch on): it is there, so the hidden check cannot pass for nothing.
  const secrets = weightsOf(s.card), seen = new Set();
  boxes.forEach(b => numbersIn(b.text).forEach(t => { if (secrets.includes(t)) seen.add(t); }));
  // The numeric check below reads any number equal to a weight, so it is exact only while the weights are the card's rarest numbers: the
  // kg samples (the original ones). A lb or plates card (a plate count is a small number: 5 is also a rep count, a date, a week) is
  // checked by the unit instead: a weight hidden is no "<weight> <unit word>" on the card.
  const used = usedUnits(s.card), kgOnly = used.size === 1 && used.has('kg');
  if (cb.weights === false && secrets.length && kgOnly) note(R.noW, name, !seen.size, 'still shows ' + [...seen].join(', ') + ' (the card has ' + secrets.join(', ') + ')');
  const texts = boxes.map(b => toAscii(b.text));
  if (cb.weights === false && secrets.length) {
    const leaked = secrets.filter(w => texts.some(t => new RegExp('(?<![+\\d.])' + w.replace('.', '\\.') + ' (?:kg|lb|plates?|کیلو|پوند|پلیت)', 'i').test(t)));
    note(R.noWu, name, !leaked.length, 'still writes ' + leaked.join(', ') + ' with a unit (the card has ' + secrets.join(', ') + ')');
  }
  // The measure's own unit word: on the card where a weight (a change) is shown, never a word of another measure, "1 plate" and no "1 plates".
  // Text Amir typed himself (the month's goal, what counts in the Open, a catalogue caption) is carried through as written, in either
  // language: a "kg" inside his own sentence is his, not the card writing a unit.
  const his = [s.card.text, s.card.textFa, s.card.how, s.card.caption, s.card.captionFa].filter(Boolean).join(' ⋄ ');
  const mine = t => !(his && his.indexOf(String(t).replace(/…$/, '').trim()) >= 0);
  const wrongWords = texts.map((t, i) => [i, mine(t) ? strayUnits(t, cb.lang, used) : []]).filter(x => x[1].length);
  note(R.unitOff, name, !wrongWords.length, list(wrongWords, x => `${bx(boxes[x[0]])} has ${x[1].join(', ')}`));
  if (!s.long) {
    const want = [...unitsShown(s.card, cb.weights !== false)], lack = want.filter(x => !texts.some(t => afterNumRx(cb.lang, x).test(t)));
    note(R.unitOn, name, !lack.length, 'no number followed by the ' + lack.join(' / ') + ' word (' + (cb.lang === 'fa' ? UNIT_WORD.fa[lack[0]] : lack.join(', ')) + ') on the card; it reads: ' + snip(boxes.map(b => b.text).join(' | '), 160));
  }
  if (cb.lang === 'en' && used.has('plates')) {
    const bad = []; boxes.forEach(b => pluralBreaches(toAscii(b.text)).forEach(x => bad.push(`${b.role} ${x}`)));
    note(R.plural, name, !bad.length, bad.slice(0, 4).join(', '));
  }
  if (cb.weights !== false && !cb.tag && !s.long && secrets.length) note(R.yesW, name, seen.size > 0, 'none of ' + secrets.join(', ') + ' is on the card');
  const named = boxes.filter(b => b.text.toLowerCase().includes(String(s.card.first).toLowerCase()));
  if (cb.name === false) note(R.noN, name, !named.length, list(named, bx));
  if (cb.name !== false && !cb.tag && !s.long) note(R.yesN, name, named.length > 0, `"${s.card.first}" is on no text`);
}

// The page's own helper: paints one card and reads back what the checks need (boxes, fit, size, a 20 x 20 grid of pixels, optionally the PNG).
function installHelpers() {
  // The athlete's own picture, made up here: a 900 x 1600 photograph of nothing, with enough in it to show through the grade.
  function madePhoto() {
    const c = document.createElement('canvas'); c.width = 900; c.height = 1600;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 900, 1600);
    g.addColorStop(0, '#8FA6B2'); g.addColorStop(0.5, '#C98E6A'); g.addColorStop(1, '#2A2F2B');
    x.fillStyle = g; x.fillRect(0, 0, 900, 1600);
    x.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 40; i++) x.fillRect((i * 97) % 900, (i * 211) % 1600, 60, 8);
    return c.toDataURL('image/jpeg', 0.8);
  }
  const PHOTO = madePhoto();
  window.__T = {
    async run(card, opts, png) {
      let c;
      const o = opts.photo ? Object.assign({}, opts, { photo: PHOTO, fit: { z: 1.6, dx: -0.3, dy: 0.4 } }) : opts;
      try { c = await window.ShareCard.paint(card, o); }
      catch (e) { return { error: 'paint threw: ' + String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ') }; }
      const out = { boxes: c._boxes || null, fit: c._fit || null, size: c._size || null, w: c.width, h: c.height };
      try {
        const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, seen = new Set();
        let centreMax = 0;
        for (let j = 0; j < 20; j++) for (let i = 0; i < 20; i++) {
          const x = Math.floor((i + 0.5) * c.width / 20), y = Math.floor((j + 0.5) * c.height / 20), o = (y * c.width + x) * 4;
          seen.add(g[o] + ',' + g[o + 1] + ',' + g[o + 2] + ',' + g[o + 3]);
          if (x >= c.width * 0.25 && x < c.width * 0.75 && y >= c.height * 0.25 && y < c.height * 0.75) centreMax = Math.max(centreMax, g[o], g[o + 1], g[o + 2]);
        }
        out.px = { distinct: seen.size, centreMax };
      } catch (e) { out.pxError = String(e); }
      if (png) { try { out.png = c.toDataURL('image/png'); } catch (e) { out.pngError = String(e); } }
      await new Promise(r => setTimeout(r, 0));   // a task turn, so a late error is likelier to be logged against this card (the last check sees every one)
      return out;
    },
  };
}

const TEST_URL = H.BASE + '/__sharecard_test.html';
// UTF-8 on purpose: the Farsi inside sharecard.js is read with the page's encoding.
const TEST_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>sharecard test</title><link rel="icon" href="data:,">'
  + '<link rel="stylesheet" href="/assets/css/app-fonts.css"><script src="/assets/js/sharecard.js"></script></head><body></body></html>';

// ── The run ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function main(browser, shots) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, serviceWorkers: 'block' });
  // Only the local server, like lib.js's context(): anything else fails fast.
  await ctx.route('**/*', r => r.request().url().startsWith(H.BASE + '/') ? r.continue() : r.abort());
  const page = await ctx.newPage();
  const errs = [], bad = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e).slice(0, 220)));
  page.on('console', m => { if (m.type() === 'error') bad.push('console: ' + m.text().slice(0, 160)); });
  page.on('requestfailed', rq => bad.push('failed: ' + rq.url() + ' ' + ((rq.failure() || {}).errorText || '')));
  page.on('response', rs => { if (rs.status() >= 400) bad.push(rs.status() + ' ' + rs.url()); });
  await page.route(TEST_URL, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: TEST_HTML }));
  await page.goto(TEST_URL, { waitUntil: 'load' });
  if (!(await page.evaluate(() => !!window.ShareCard))) {
    C.check('assets/js/sharecard.js defines window.ShareCard', false, errs.concat(bad).join(' | ') || 'no error was logged');
    return;
  }
  await page.evaluate(installHelpers);

  const kinds = await page.evaluate(() => window.ShareCard.kinds());
  const have = new Set(kinds);
  const all = SAMPLES.filter(s => !ONLY.length || ONLY.includes(s.kind));
  if (ONLY.length && !all.length) C.check('--only names a kind this test has samples for', false, `${ONLY.join(', ')} (the kinds are ${[...new Set(SAMPLES.map(s => s.kind))].join(', ')})`);
  [...new Set(all.map(s => s.kind))].forEach(k => C.check(`kind "${k}" has a template`, have.has(k), have.has(k) ? undefined : `no template yet (ShareCard.kinds() is ${kinds.join(', ')})`));
  // The other way round: a template this test has no sample for would go untested without a word.
  if (!ONLY.length) { const bare = kinds.filter(k => !SAMPLES.some(s => s.kind === k)); C.check('every template the painter has is covered by a sample here', !bare.length, bare.length ? 'no sample for ' + bare.join(', ') : kinds.join(', ')); }
  const live = all.filter(s => have.has(s.kind));

  // Once: EN and FA have the same keys at every level (objects recursed, arrays by length and by what is in them).
  const parity = await page.evaluate(() => {
    const kind = v => typeof v === 'function' ? 'function' : Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
    const diffs = [];
    const walk = (a, b, p) => {
      const ka = kind(a), kb = kind(b);
      if (ka !== kb) { diffs.push(`${p || 'root'}: EN is a ${ka}, FA a ${kb}`); return; }
      if (ka === 'array') {
        if (a.length !== b.length) { diffs.push(`${p}: EN has ${a.length} items, FA ${b.length}`); return; }
        a.forEach((v, i) => walk(v, b[i], `${p}[${i}]`));
      } else if (ka === 'object') {
        Object.keys(a).forEach(k => { if (!(k in b)) diffs.push(`${p}.${k}: missing in FA`); else walk(a[k], b[k], `${p}.${k}`); });
        Object.keys(b).forEach(k => { if (!(k in a)) diffs.push(`${p}.${k}: missing in EN`); });
      }
    };
    walk(window.ShareCard.EN, window.ShareCard.FA, '');
    return { diffs, n: Object.keys(window.ShareCard.EN).length };
  });
  C.check(`EN and FA hold the same keys at every level (${parity.n} top-level keys)`, !parity.diffs.length, parity.diffs.slice(0, 6).join(' | ') + (parity.diffs.length > 6 ? ` (+${parity.diffs.length - 6} more)` : ''));

  // Once: the Shamsi dates (25 Mehr 1405 is the 17th of October 2026; Nowruz 1405 is the 21st of March 2026).
  const jal = await page.evaluate(() => [window.ShareCard._toJalali(2026, 10, 17), window.ShareCard._toJalali(2026, 3, 21)]);
  C.check('_toJalali(2026, 10, 17) is [1405, 7, 25]', JSON.stringify(jal[0]) === '[1405,7,25]', JSON.stringify(jal[0]));
  C.check('_toJalali(2026, 3, 21) is [1405, 1, 1]', JSON.stringify(jal[1]) === '[1405,1,1]', JSON.stringify(jal[1]));

  // Once: caption() for every normal sample in both languages (it needs no template), and with the weights hidden.
  const normals = all.filter(s => !s.long);
  const caps = await page.evaluate(cards => cards.map(c => ({
    en: window.ShareCard.caption(c, { lang: 'en' }), fa: window.ShareCard.caption(c, { lang: 'fa' }),
    enH: window.ShareCard.caption(c, { lang: 'en', weights: false }), faH: window.ShareCard.caption(c, { lang: 'fa', weights: false }),
  })), normals.map(s => s.card));
  const capBad = [], capLeak = [], capUnit = [];
  normals.forEach((s, i) => {
    // The caption's unit words are the card's measure too (shown: "100 lb × 5"; hidden: "+10 lb"), and no other measure's.
    ['en', 'fa'].forEach(lang => [true, false].forEach(show => {
      const t = toAscii(caps[i][lang + (show ? '' : 'H')]), used = usedUnits(s.card);
      const stray = strayUnits(t, lang, used), lack = [...unitsInCaption(s.card, show)].filter(x => !afterNumRx(lang, x).test(t));
      const plural = lang === 'en' && used.has('plates') ? pluralBreaches(t) : [];
      if (stray.length || lack.length || plural.length) capUnit.push(`${s.id} ${lang}${show ? '' : ' hidden'}: "${snip(t, 70)}" ${stray.length ? 'has ' + stray.join(', ') : ''}${lack.length ? 'lacks ' + lack.join(', ') : ''}${plural.length ? 'plural ' + plural.join(', ') : ''}`);
    }));
    ['en', 'fa'].forEach(lang => {
      const t = caps[i][lang];
      if (typeof t !== 'string' || !t.trim() || !t.includes('@amirardekanian') || BAD_TEXT.test(t)) capBad.push(`${s.id} ${lang}: ${snip(t, 60)}`);
      const secrets = weightsOf(s.card), shown = numbersIn(caps[i][lang === 'en' ? 'enH' : 'faH']).filter(x => secrets.includes(x));
      if (shown.length) capLeak.push(`${s.id} ${lang}: "${snip(caps[i][lang === 'en' ? 'enH' : 'faH'], 70)}" shows ${[...new Set(shown)].join(', ')}`);
    });
  });
  C.check(`caption() is a non-empty line containing @amirardekanian for every normal sample, in both languages (${normals.length * 2})`, !capBad.length, capBad.slice(0, 3).join(' | ') + (capBad.length > 3 ? ` (+${capBad.length - 3} more)` : ''));
  C.check('caption() with the weights hidden shows no weight (extra: the painter says "the change only")', !capLeak.length, capLeak.slice(0, 3).join(' | ') + (capLeak.length > 3 ? ` (+${capLeak.length - 3} more)` : ''));
  C.check(`caption() says the card's own measure (kg, lb or plates) and no other, shown and hidden, in both languages (${normals.length * 4})`, !capUnit.length, capUnit.slice(0, 3).join(' | ') + (capUnit.length > 3 ? ` (+${capUnit.length - 3} more)` : ''));

  // Once: the exact words of the measures in caption(): "kg" when `u` is absent or unknown, lb, "1 plate" against "6 plates", the Farsi words.
  const bestOf = (u, w, r, pw, pr) => ({ kind: 'best', first: FIRST, lift: 'Leg Press', u, w, r, date: D, prev: { w: pw, r: pr, date: '2026-09-12' }, cycle: CYC });
  const retestOf = (u, bw, br, aw, ar) => ({ kind: 'retest', first: FIRST, lift: 'Leg Press', u, spec: '5RM', oneCycle: true, now: { w: bw, r: br, date: '2026-09-14' }, before: { w: aw, r: ar, date: '2026-08-03', test: true }, cycle: { n: 2 } });
  const effortOf = (u, shape, aw, an, bw, bn) => ({ kind: 'effort', first: FIRST, lift: 'Leg Press', u, shape, same: true, date: D, cycle: CYC, a: { w: aw, n: an, r: 8, date: '2026-09-15', wk: 1 }, b: { w: bw, n: bn, r: 8, date: '2026-10-13', wk: 5 } });
  const U_CASES = [
    // [what, spec, language, weights shown, the words the caption must hold]
    ['best, no u, shown', bestOf(undefined, 100, 5, 95, 5), 'en', true, '100 kg × 5'],
    ['best, no u, hidden', bestOf(undefined, 100, 5, 95, 5), 'en', false, '+5 kg.'],
    ['best, an unknown measure is kg', bestOf('stone', 100, 5, 95, 5), 'en', true, '100 kg × 5'],
    ['best, kg, Farsi', bestOf('kg', 100, 5, 95, 5), 'fa', true, '۱۰۰ کیلو × ۵'],
    ['best, lb, shown', bestOf('lb', 205, 5, 195, 5), 'en', true, '205 lb × 5'],
    ['best, lb, hidden', bestOf('lb', 205, 5, 195, 5), 'en', false, '+10 lb.'],
    ['best, lb, Farsi', bestOf('lb', 205, 5, 195, 5), 'fa', true, '۲۰۵ پوند × ۵'],
    ['best, lb, Farsi, hidden', bestOf('lb', 205, 5, 195, 5), 'fa', false, '۱۰ پوند.'],
    ['best, plates, shown', bestOf('plates', 6, 10, 5, 10), 'en', true, '6 plates × 10'],
    ['best, plates, a gain of one is "plate"', bestOf('plates', 6, 10, 5, 10), 'en', false, '+1 plate.'],
    ['best, exactly one plate', bestOf('plates', 1, 8, 0.5, 8), 'en', true, '1 plate × 8'],
    ['best, half a plate more is "plates"', bestOf('plates', 1, 8, 0.5, 8), 'en', false, '+0.5 plates.'],
    ['best, 2.5 plates more', bestOf('plates', 10, 8, 7.5, 8), 'en', false, '+2.5 plates.'],
    ['best, plates, Farsi', bestOf('plates', 6, 10, 5, 10), 'fa', true, '۶ پلیت × ۱۰'],
    ['best, plates, Farsi, hidden', bestOf('plates', 6, 10, 5, 10), 'fa', false, '۱ پلیت.'],
    ['retest, lb', retestOf('lb', 200, 5, 180, 5), 'en', true, '180 lb → 200 lb'],
    ['retest, lb, hidden', retestOf('lb', 200, 5, 180, 5), 'en', false, '+20 lb.'],
    ['retest, plates', retestOf('plates', 6, 8, 5, 8), 'en', true, '5 plates → 6 plates'],
    ['retest, plates, hidden', retestOf('plates', 6, 8, 5, 8), 'en', false, '+1 plate.'],
    ['retest, plates, other reps', retestOf('plates', 6, 8, 5, 6), 'en', true, '5 plates × 6 → 6 plates × 8'],
    ['retest, plates, Farsi', retestOf('plates', 6, 8, 5, 8), 'fa', true, '۵ پلیت → ۶ پلیت'],
    ['effort, plates', effortOf('plates', 'kg', 11, 8, 12, 8), 'en', true, '+1 plate, same reps'],
    ['effort, lb, weight and reps', effortOf('lb', 'kgReps', 90, 6, 100, 8), 'en', true, '+10 lb and +2 reps'],
    ['effort, lb, more reps at one weight', effortOf('lb', 'reps', 45, 8, 45, 12), 'en', true, '+4 reps at 45 lb'],
    ['effort, lb, Farsi', effortOf('lb', 'kg', 90, 5, 100, 5), 'fa', true, '۱۰ پوند بیشتر'],
    ['effort, plates, Farsi', effortOf('plates', 'kg', 11, 8, 12, 8), 'fa', true, '۱ پلیت بیشتر'],
  ];
  const ucaps = await page.evaluate(cs => cs.map(c => window.ShareCard.caption(c[0], { lang: c[1], weights: c[2] })), U_CASES.map(c => [c[1], c[2], c[3]]));
  const uBad = U_CASES.map((c, i) => [c, ucaps[i]]).filter(x => !String(x[1]).includes(x[0][4]))
    .map(x => `${x[0][0]}: wanted "${x[0][4]}" in "${snip(x[1], 90)}"`);
  C.check(`caption() writes the measure's words exactly: kg by default, lb, "1 plate" against "6 plates", the Farsi (${U_CASES.length})`, !uBad.length, uBad.slice(0, 3).join(' | ') + (uBad.length > 3 ? ` (+${uBad.length - 3} more)` : ''));
  // The unit-word helpers the cards are drawn with (exported for the tests).
  const uw = await page.evaluate(() => { const _ = window.ShareCard._; return [_.unitW('plates', 1, 'en'), _.unitW('plates', 1.2, 'en'), _.unitW('plates', 0.5, 'en'), _.unitW('plates', 2, 'en'), _.unitW('lb', 1, 'en'), _.unitW('kg', 1, 'en'), _.unitW(undefined, 5, 'en'), _.unitW('x', 5, 'en'), _.unitW('plates', 1, 'fa'), _.unitW('plates', 6, 'fa'), _.unitW('lb', 6, 'fa'), _.unitW('kg', 6, 'fa'), _.kgs(22.5, 'en', 'lb'), _.kgs(6, 'fa', 'plates'), _.plusKg(2.5, 'en', 'plates'), _.plusKg(1, 'en', 'plates'), _.plusKg(7.5, 'en'), _.plusKg(7.5, 'fa', 'lb')]; });
  const uwWant = ['plate', 'plate', 'plates', 'plates', 'lb', 'kg', 'kg', 'kg', 'پلیت', 'پلیت', 'پوند', 'کیلو', '22.5 lb', '۶ پلیت', '+2.5 plates', '+1 plate', '+7.5 kg', '۷٫۵ پوند'];
  C.check('unitW(), kgs() and plusKg() write each measure: plate at 1 (1.2 rounds to the half, 1), plates otherwise, kg when absent or unknown, the Farsi words',
    JSON.stringify(uw) === JSON.stringify(uwWant), 'got ' + JSON.stringify(uw));

  // Once: can().
  const can = await page.evaluate(cards => cards.map(c => window.ShareCard.can(c)), live.map(s => s.card));
  const cannot = live.filter((s, i) => can[i] !== true).map(s => s.id);
  C.check(`can() is true for every sample (${live.length})`, !cannot.length, cannot.join(', '));
  const neg = await page.evaluate(() => [window.ShareCard.can({ kind: 'best' }), window.ShareCard.can({ kind: 'best', w: 100, r: 5 }), window.ShareCard.can({ kind: 'nothing' }), window.ShareCard.can(null)]);
  C.check('can() is false for a best card with no lift, for an unknown kind and for nothing', neg.every(v => v === false), JSON.stringify(neg));

  // Once: no gold, no yellow, in the metals or in any word (functions are read as their source).
  const gold = await page.evaluate(() => {
    const out = [], rx = /gold|yellow/i;
    const scan = (v, p) => {
      if (typeof v === 'string') { if (rx.test(v)) out.push(`${p} = ${v.slice(0, 40)}`); }
      else if (typeof v === 'function') { if (rx.test(v.toString())) out.push(`${p}() source`); }
      else if (Array.isArray(v)) v.forEach((x, i) => scan(x, `${p}[${i}]`));
      else if (v && typeof v === 'object') Object.keys(v).forEach(k => { if (rx.test(k)) out.push(`${p}.${k} (key)`); scan(v[k], `${p}.${k}`); });
    };
    scan(window.ShareCard.EN, 'EN'); scan(window.ShareCard.FA, 'FA');
    return { out };
  });
  C.check('no EN or FA word contains "gold" or "yellow" (and no metal is left anywhere: the cut took them)', !gold.out.length, gold.out.slice(0, 6).join(' | '));

  // The runs.
  let runs = 0;
  for (const s of live) {
    const combos = [];
    for (const size of ['story', 'post']) for (const lang of ['en', 'fa']) combos.push({ size, lang, weights: true, name: true, tag: '' });
    if (!s.long) for (const lang of ['en', 'fa']) {
      combos.push({ size: 'story', lang, weights: false, name: true, tag: ' (weights hidden)' });
      combos.push({ size: 'story', lang, weights: true, name: false, tag: ' (name hidden)' });
    }
    // On the athlete's own picture, zoomed in and dragged (Amir, 2026-10-19): the words must still sit inside their boxes.
    if (!s.long) combos.push({ size: 'story', lang: 'en', weights: true, name: true, photo: true, tag: ' (photo)' });
    for (const cb of combos) {
      const name = `${s.id} ${cb.size} ${cb.lang}${cb.tag}`, before = errs.length;
      let res;
      try { res = await page.evaluate(([c, o, p]) => window.__T.run(c, o, p), [s.card, { size: cb.size, lang: cb.lang, weights: cb.weights, name: cb.name, photo: !!cb.photo }, !cb.tag || cb.tag === ' (photo)']); }
      catch (e) { res = { error: 'evaluate failed: ' + String((e && e.message) || e).split('\n')[0] }; }
      res.newErrs = errs.slice(before);
      runs++;
      if (res.png) fs.writeFileSync(path.join(shots, s.long ? 'long' : '', `${s.id}-${cb.size}-${cb.lang}${cb.photo ? '-photo' : ''}.png`), Buffer.from(res.png.split(',')[1], 'base64'));
      judge(name, s, cb, res);
    }
  }

  // Once, after all that painting: the fonts the cards need were really loaded (a card in Arial would measure fine and be wrong), and the
  // page got every file it asked for.
  const faces = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => [String(f.family).replace(/["']/g, ''), String(f.weight)]));
  const need = runs ? ['Barlow', 'Barlow Condensed', 'Space Mono', 'Vazirmatn'].filter(f => !faces.some(x => x[0] === f)) : [];
  C.check('the fonts were loaded: Barlow, Barlow Condensed, Space Mono and Vazirmatn', !need.length, need.length ? 'not loaded: ' + need.join(', ') : faces.map(x => x.join(' ')).join(', '));
  C.check('the page got every file it asked for (no failed request, no 4xx or 5xx, no console error)', !bad.length, bad.slice(0, 5).join(' | ') + (bad.length > 5 ? ` (+${bad.length - 5} more)` : ''));
  C.check('no uncaught error anywhere on the test page', !errs.length, errs.slice(0, 3).join(' | '));
  return `${runs} cards painted (${live.length} samples of ${[...new Set(live.map(s => s.kind))].length} kinds)`;
}

// The checker's report, with the PASS lines left out unless --verbose (thousands of them); then one line per rule and the long samples' losses.
function report() {
  const real = console.log;
  let text = '';
  console.log = (...a) => { text += a.join(' ') + '\n'; };
  let failed;
  try { failed = C.report(); } finally { console.log = real; }
  const lines = text.split('\n'), pass = lines.filter(l => l.startsWith('PASS ')).length;
  if (!VERBOSE) real(`(${pass} PASS lines not listed; --verbose lists them)`);
  real(lines.filter(l => VERBOSE || !l.startsWith('PASS ')).join('\n').replace(/\n+$/, ''));
  const rules = Object.keys(TALLY);
  if (rules.length) {
    real('\nBy rule (runs checked / runs failing)');
    rules.forEach(r => real(`  ${String(TALLY[r].runs).padStart(4)} / ${String(TALLY[r].fails.length).padStart(3)}  ${r}` + (TALLY[r].fails.length ? '   e.g. ' + TALLY[r].fails.slice(0, 4).join('; ') : '')));
  }
  if (LONG_NOTES.length) {
    real('\nLong samples: what was cut or left out (allowed there, listed)');
    LONG_NOTES.forEach(n => real(`  ${n.name}: k ${n.k}` + (n.cut.length ? ' · cut: ' + n.cut.join(', ') : '') + (n.dropped.length ? ' · left out: ' + n.dropped.join(', ') : '')));
  }
  return failed;
}

(async () => {
  const shots = H.outDir();
  fs.mkdirSync(path.join(shots, 'long'), { recursive: true });
  const browser = await H.launch();
  let summary, crash = null;
  try { summary = await main(browser, shots); }
  catch (e) { crash = e; }
  finally { await browser.close(); }
  const failed = report();   // what was checked before a crash still counts
  if (summary) console.log('\n' + summary);
  console.log('screenshots: ' + shots);
  if (crash) console.error('\nThe run stopped early:', crash);
  process.exitCode = crash ? Math.max(1, Math.min(failed, 255)) : Math.min(failed, 255);
})().catch(e => { console.error(e); process.exitCode = 1; });
