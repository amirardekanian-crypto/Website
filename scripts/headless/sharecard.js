// Highlight Reel, the share cards (assets/js/sharecard.js, 2026-10-17): node scripts/headless/sharecard.js [--out <dir>] [--only <kind,kind>] [--verbose]
//
// ShareCard.paint() draws ten cards onto a canvas: the training app's five (best, effort, retest, cycle, roadmap) and Career Mode's five
// rewards (badge, achievement, title, level, quest), at two sizes (a 1080 x 1920 Story and a 1080 x 1350 post), in English and in Farsi.
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
  // Career Mode's rewards (Amir's names of 2026-10-17: Hold Serve, Free Kilos, First Treble, CLOCKWORK; the Farsi is invented here, with Persian digits, as the catalogue's will have to be)
  { id: 'badge', card: { kind: 'badge', first: FIRST, name: 'Hold Serve', nameFa: 'هفته‌های کامل', meaning: 'consistency', metal: 'emerald', tier: 3, n: 12,
    caption: '12 weeks held in a row. You keep showing up.', captionFa: '۱۲ هفتهٔ پشت‌سرهم کامل. تو همیشه حاضری.', date: D } },
  { id: 'achievement', card: { kind: 'achievement', first: FIRST, name: 'First Treble', nameFa: 'هفتهٔ بی‌نقص', meaning: 'consistency',
    caption: 'Three missions, three done.', captionFa: 'سه مأموریت، هر سه انجام شد.', date: D } },
  { id: 'title', card: { kind: 'title', first: FIRST, name: 'CLOCKWORK', meaning: 'consistency', metal: 'prismatic',
    from: 'Hold Serve, prismatic: 52 weeks held in a row', fromFa: 'هفته‌های کامل، منشوری: ۵۲ هفتهٔ پشت‌سرهم', date: D } },
  // Career Mode phase 3 (the catalogue switch): the spec get_profile() hands over for a reward (scripts/career/rehearse_catalogue.mjs; moments[].spec and
  // recent[].spec), with no nameFa, captionFa or fromFa yet (Amir writes them): a Farsi card must fall back to the English words and still fit, in Persian digits.
  { id: 'badge-server', card: { kind: 'badge', first: FIRST, name: 'Hold Serve', meaning: 'consistency', metal: 'emerald', tier: 3, n: 12, caption: '12 weeks held in a row. You keep showing up.', date: D } },
  { id: 'badge-server-habit', card: { kind: 'badge', first: FIRST, name: 'HUMAN SPRINKLER', meaning: 'consistency', metal: 'bronze', tier: 1, n: 5, caption: '5 days in a row on full water.', date: D } },
  { id: 'badge-server-upgrade', card: { kind: 'badge', first: FIRST, name: 'The Upgrade', meaning: 'progress', metal: 'silver', tier: 2, n: 22, caption: 'Your most improved lift is 22% stronger than its first session, at the same effort.', date: D } },
  { id: 'badge-server-resilience', card: { kind: 'badge', first: FIRST, name: 'HARD TO KILL', meaning: 'resilience', metal: 'amethyst', tier: 4, n: 10, caption: '10 comebacks that stuck.', date: D } },
  { id: 'achievement-server', card: { kind: 'achievement', first: FIRST, name: 'THE FOUNDRY', meaning: 'commitment', caption: 'Four weeks of putting the work in.', date: D } },
  { id: 'achievement-server-best', card: { kind: 'achievement', first: FIRST, name: 'First Best', meaning: 'progress', caption: 'Your first personal best. Not the last.', date: D } },
  { id: 'title-server', card: { kind: 'title', first: FIRST, name: 'BEDROCK', meaning: 'consistency', metal: 'prismatic', from: 'BEDROCK: four weeks of the boring half', date: D } },
  { id: 'title-grand-slam', card: { kind: 'title', first: FIRST, name: 'GRAND SLAM', meaning: 'all', metal: 'prismatic', from: 'A title in all four', date: D } },
  { id: 'level', card: { kind: 'level', first: FIRST, level: 14, rank: 'GRINDER', sub: 4, metal: 'silver', prestige: 0, date: D } },
  { id: 'quest', card: { kind: 'quest', first: FIRST, name: 'Sleep Reset', nameFa: 'ریست خواب', meaning: 'consistency', weeks: 4,
    steps: ['Your sleep target on 5 nights in a week', '10 of 14 nights', '20 of 28 nights'],
    stepsFa: ['هدف خوابت در ۵ شب از هفته', '۱۰ شب از ۱۴ شب', '۲۰ شب از ۲۸ شب'],
    caption: 'Four weeks of real sleep.', captionFa: 'چهار هفته خواب واقعی.', date: D } },
  { id: 'quest-title', card: { kind: 'quest', first: FIRST, name: 'Tournament Ready', nameFa: 'آمادهٔ مسابقه', meaning: 'commitment', weeks: 5,
    steps: ['Hold the first week', 'Hold three weeks in a row', 'Finish the cycle'],
    stepsFa: ['هفتهٔ اول را کامل بزن', 'سه هفته پشت‌سرهم کامل', 'دوره را تمام کن'],
    caption: 'Every week of the pre-competition cycle, held.', captionFa: 'همهٔ هفته‌های دورهٔ پیش از مسابقه، کامل.', title: 'MATCH FIT', date: D } },
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
  { id: 'badge-long', card: { kind: 'badge', first: FIRST_LONG, name: 'Free Kilos at the Same Effort, Cycle on Cycle', nameFa: 'همون فشار، وزنهٔ بیشتر، دوره به دوره', meaning: 'progress', metal: 'prismatic', tier: 5, n: 128,
    caption: '128 lifts heavier at the same effort, cycle on cycle, with every retest on the calendar and not one of them skipped.',
    captionFa: '۱۲۸ حرکت با وزنهٔ سنگین‌تر در همون فشار، دوره به دوره، و هیچ تستی از قلم نیفتاد و هیچ جلسه‌ای جا نموند.', date: D } },
  { id: 'achievement-long', card: { kind: 'achievement', first: FIRST_LONG, name: 'The First Held Week After the Long Comeback', nameFa: 'اولین هفتهٔ کامل بعد از بازگشت طولانی', meaning: 'resilience',
    caption: 'Your first held week back after the layoff. Every session, on your days, with nothing skipped and nothing rushed.',
    captionFa: 'اولین هفتهٔ کامل بعد از وقفه. همهٔ جلسه‌ها، توی روزهای خودت، بدون جا انداختن و بدون عجله.', date: D } },
  { id: 'title-long', card: { kind: 'title', first: FIRST_LONG, name: 'UNSTOPPABLE ROADMAP FINISHER', meaning: 'commitment', metal: 'prismatic',
    from: 'Hold Serve, prismatic: 52 weeks held in a row, across every cycle of the roadmap, without one missed session',
    fromFa: 'هفته‌های کامل، منشوری: ۵۲ هفتهٔ پشت‌سرهم، در تمام دوره‌های برنامه، بدون حتی یک جلسهٔ جا افتاده', date: D } },
  { id: 'level-long', card: { kind: 'level', first: FIRST_LONG, level: 195, rank: 'UNTOUCHABLE', sub: 5, metal: 'prismatic', prestige: 3, date: D } },
  { id: 'quest-long', card: { kind: 'quest', first: FIRST_LONG, name: 'First Strict Pull-up and the Full Hang Rebuild Block', nameFa: 'اولین بارفیکس کامل و بازسازی آویزان شدن کامل', meaning: 'progress', weeks: 12,
    steps: ['A 5-second lowering on video, with the shoulder blades held down for the whole rep',
      'Three 5-second lowerings in one set, on video, with a full hang between every rep',
      'One strict pull-up, on video, from a dead hang with no kick and no swing',
      'Three strict pull-ups in a row, on video, from a dead hang each time',
      'Five strict pull-ups in a row, on video, then repeat them a week later'],
    stepsFa: ['یک پایین‌آوردن ۵ ثانیه‌ای، با ویدیو، با کتف‌های پایین و ثابت در تمام مدت تکرار',
      'سه پایین‌آوردن ۵ ثانیه‌ای توی یک ست، با ویدیو، با آویزان شدن کامل بین هر تکرار',
      'یک بارفیکس کامل، با ویدیو، از آویزان شدن کامل، بدون تاب خوردن و بدون ضربه',
      'سه بارفیکس کامل پشت‌سرهم، با ویدیو، و هر بار از آویزان شدن کامل',
      'پنج بارفیکس کامل پشت‌سرهم، با ویدیو، و یک هفته بعد دوباره تکرارش'],
    caption: 'From a band to your own bodyweight, one slow lowering at a time, with Amir watching every rep on video.',
    captionFa: 'از کش تا وزن بدن خودت، با هر پایین‌آوردن آهسته، و امیر هر تکرار رو توی ویدیو می‌بینه.',
    title: 'UNTOUCHABLE PULL-UP ARTIST', date: D } },
];
const SAMPLES = NORMAL.map(s => Object.assign({ long: false, kind: s.card.kind }, s)).concat(LONG.map(s => Object.assign({ long: true, kind: s.card.kind }, s)));

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
  if (cb.weights === false && secrets.length) note(R.noW, name, !seen.size, 'still shows ' + [...seen].join(', ') + ' (the card has ' + secrets.join(', ') + ')');
  if (cb.weights !== false && !cb.tag && !s.long && secrets.length) note(R.yesW, name, seen.size > 0, 'none of ' + secrets.join(', ') + ' is on the card');
  const named = boxes.filter(b => b.text.toLowerCase().includes(String(s.card.first).toLowerCase()));
  if (cb.name === false) note(R.noN, name, !named.length, list(named, bx));
  if (cb.name !== false && !cb.tag && !s.long) note(R.yesN, name, named.length > 0, `"${s.card.first}" is on no text`);
}

// The page's own helper: paints one card and reads back what the checks need (boxes, fit, size, a 20 x 20 grid of pixels, optionally the PNG).
function installHelpers() {
  window.__T = {
    async run(card, opts, png) {
      let c;
      try { c = await window.ShareCard.paint(card, opts); }
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
  const capBad = [], capLeak = [];
  normals.forEach((s, i) => {
    ['en', 'fa'].forEach(lang => {
      const t = caps[i][lang];
      if (typeof t !== 'string' || !t.trim() || !t.includes('@amirardekanian') || BAD_TEXT.test(t)) capBad.push(`${s.id} ${lang}: ${snip(t, 60)}`);
      const secrets = weightsOf(s.card), shown = numbersIn(caps[i][lang === 'en' ? 'enH' : 'faH']).filter(x => secrets.includes(x));
      if (shown.length) capLeak.push(`${s.id} ${lang}: "${snip(caps[i][lang === 'en' ? 'enH' : 'faH'], 70)}" shows ${[...new Set(shown)].join(', ')}`);
    });
  });
  C.check(`caption() is a non-empty line containing @amirardekanian for every normal sample, in both languages (${normals.length * 2})`, !capBad.length, capBad.slice(0, 3).join(' | ') + (capBad.length > 3 ? ` (+${capBad.length - 3} more)` : ''));
  C.check('caption() with the weights hidden shows no weight (extra: the painter says "the change only")', !capLeak.length, capLeak.slice(0, 3).join(' | ') + (capLeak.length > 3 ? ` (+${capLeak.length - 3} more)` : ''));

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
    scan(window.ShareCard.METALS, 'METALS'); scan(window.ShareCard.EN, 'EN'); scan(window.ShareCard.FA, 'FA');
    return { out, metals: Object.keys(window.ShareCard.METALS) };
  });
  C.check('no METALS key and no EN or FA word contains "gold" or "yellow"', !gold.out.length, gold.out.slice(0, 6).join(' | '));
  const five = ['bronze', 'silver', 'emerald', 'amethyst', 'prismatic'].filter(m => !gold.metals.includes(m));
  C.check("METALS holds Proof's five metals (bronze, silver, emerald, amethyst, prismatic)", !five.length, five.length ? 'missing ' + five.join(', ') : gold.metals.join(', '));

  // The runs.
  let runs = 0;
  for (const s of live) {
    const combos = [];
    for (const size of ['story', 'post']) for (const lang of ['en', 'fa']) combos.push({ size, lang, weights: true, name: true, tag: '' });
    if (!s.long) for (const lang of ['en', 'fa']) {
      combos.push({ size: 'story', lang, weights: false, name: true, tag: ' (weights hidden)' });
      combos.push({ size: 'story', lang, weights: true, name: false, tag: ' (name hidden)' });
    }
    for (const cb of combos) {
      const name = `${s.id} ${cb.size} ${cb.lang}${cb.tag}`, before = errs.length;
      let res;
      try { res = await page.evaluate(([c, o, p]) => window.__T.run(c, o, p), [s.card, { size: cb.size, lang: cb.lang, weights: cb.weights, name: cb.name }, !cb.tag]); }
      catch (e) { res = { error: 'evaluate failed: ' + String((e && e.message) || e).split('\n')[0] }; }
      res.newErrs = errs.slice(before);
      runs++;
      if (res.png) fs.writeFileSync(path.join(shots, s.long ? 'long' : '', `${s.id}-${cb.size}-${cb.lang}.png`), Buffer.from(res.png.split(',')[1], 'base64'));
      judge(name, s, cb, res);
    }
  }

  // Once, after all that painting: the fonts the cards need were really loaded (a card in Arial would measure fine and be wrong), and the
  // page got every file it asked for.
  const faces = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => [String(f.family).replace(/["']/g, ''), String(f.weight)]));
  const need = runs ? ['Barlow', 'Barlow Condensed', 'Vazirmatn'].filter(f => !faces.some(x => x[0] === f)) : [];
  C.check('the fonts were loaded: Barlow, Barlow Condensed and Vazirmatn', !need.length, need.length ? 'not loaded: ' + need.join(', ') : faces.map(x => x.join(' ')).join(', '));
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
