/* ═══════════════════════════════════════════════════════════════════════════
   check_twins.js — logic that exists in BOTH coach.html and program.html.

   The dashboard re-implements some of the athlete app's rules (program.html is the offline PWA and stays
   self-contained, so a shared file was never an option). When one copy changes and the other does not, the
   coach and the athlete see different numbers and NOTHING ERRORS: the worst class of bug in this repo. The
   audit of 2026-10-10 (Content/COACH-AUDIT.md, TWIN-10) found that only rxOf(), the set-log grammar and the
   word lists were guarded. This guards the rest of the pairs it can run.

   How: each side's function is cut out of its HTML file by name (so an edit above it cannot make the check
   test the wrong region), compiled in its own sandbox, and driven with the SAME vectors. Any difference
   fails, and prints the input and both answers. A function that cannot be found fails too: a rename
   must come here, not be swallowed.

   Pairs (app / dashboard):
     exNameVariants, EX_ABBREV   / exNameVariantsC, EX_ABBREV_C   the four name tiers every exercise lookup uses. scripts/name_cases.json stores
                                                                  them for a few hundred names; the checker's Python norm_name() and its SQL
                                                                  (NORM_SQL, LOOSE_SQL) are held to the same file by test_check_program.py (TWIN-8)
     ceilAliasMap (matchRenamed) / ceilAliasMapC                  a renamed lift is one lift
     setSpine + spineFor         / spineIndexC + spineForC        a card finds its Spine entry (an exId is the entry or nothing), in the phone's
                                                                  view (approved entries) and the coach's (all), spineLensC()
     rpeTargetOn (+ dayRpe)      / rpeTarget + dayTargetC         the RPE target a logged set is judged against (REC-2): the week note's cap on
                                                                  every day of its week (2026-10-12), a lower day one off each end, the lower
                                                                  wins; dayRpe() (the app's lower-day pill) is that target on a lower day only
     cycleWeekInfo, weekNoteNow  / cycleWeekOnC, weekNoteOnC      the week a day falls in and the cycle's note for it (the app asks about today,
                                                                  the dashboard about the day a session was trained)
     inRetestWindow              / retestWindowOnC                the cycle's closing week, where a flagged retest keeps its own target (TST-4)
     sessionIsStale              / sessionIsStaleC                is a started session over (the live app snapshot's "in progress", TWIN-6)
     habits.html runEndKey, activeQuestRun / questRunEnd, activeQuestRun   the live quest run and its last day, with runs overlapping or scheduled ahead (TODAY-14)
     exTestSpec                  / exTestSpecC                    which values of a lift's `test` are a retest flag (TWIN-7)
     readinessS, readinessBase   / readinessSC, usualC            the check-in score and the athlete's usual (TWIN-3, TODAY-11)
     qmSets, isPrepBlockTitle    / qmSetsC, QM_PREP               what the Quality check counts
     qualityMix                  / qualityLensC + qualityDayC     one day card's chips, the 70% gate and the 12% cut included, in the phone's view
                                                                  (approved entries and qualities) and in the coach's (TWIN-9)
     the report writer in buildSessionData() + readinessPlanLine, readinessPlan
                                 / parseCheckinPlan, parseSessionEmail
                                 the WRITER of the check-in line and its READER (the email import). The writer is the
                                 app's real code, run as it stands, and its wording is pinned by golden strings below.
     assets/js/chips.js          coach.html's ?v= must change when the file does (TWIN-4)
     holdCount                   / get_profile() in SQL          Career Mode's weeks held in a row, Home's Hold Serve row: held to the cases
                                                                  in scripts/career/hold_cases.json here, and to the server's own loop by
                                                                  scripts/career/rehearse.mjs (PGlite)
     habits.html levelInfo, paidXp; program.html careerLevelOf, careerFullLog, careerCheckin, careerEarly
                                 / career_level(), hab_xp() with career_paid_rules(), career_session_want() in SQL
                                 Career Mode phase 2 (the XP switch): the career's curve, the WORKOUT habit at 0 a day, a session's
                                 facts. Held to scripts/career/xp_cases.json, the server's answers (scripts/career/rehearse_switch.mjs)
     habits.html awardMeasures, phoneAwardsFrom, awardId, EVENTS; program.html careerMoves, awardId
                                 / career_measures(), career_evaluate(), career_award_xp(), career_award_id() in SQL, and career/achievements.toml
                                 Career Mode phase 3 (the catalogue switch), section 10: held to scripts/career/reward_cases.json (the server's answers,
                                 scripts/career/rehearse_catalogue.mjs) AND, for what those cases never cross, to a measure grown by hand, one a day, for every
                                 entry the phone decides and every tier. In index mode the toml, its seed script and the snapshot come from the index too.
     weightOf, setsMeasure, histBestSet, cycleBestSet, winText, cycleWins, estimateOneRM
                                 / career_w(), career_entry_sets(), career_win_gain(), career_derive() in SQL (supabase/stage72_weight_measures.sql)
                                 Career Mode's lift maths in a lift's OWN measure (kg, lb or plates, never compared), section 11: held to the cases written in this
                                 file (MEASURE_CASES), which scripts/career/rehearse_measures.mjs reads and holds the database to as well, on PGlite.

   Already guarded elsewhere (not repeated): rxOf/repCount/tempoDisplay (check_rx.js), the set-log grammar
   (check_setlog.js), the shared word lists (check_parity.py), the XP rules (check_xp_rules.py).

   Known, deliberate differences: none. (The dashboard's catalogue views count DRAFT entries on purpose, because a draft's cards are "waiting for
   you"; anything that predicts what an athlete sees reads the phone's view, spineLensC(): a video, a day card's qualities, and the Exercises tab's
   list of cards that show something else on a phone. A card that names its entry is that entry or nothing, on both sides: TWIN-1.)

   Wired into .githooks/pre-commit (guard 15), which sets CHECK_TWINS_INDEX=1 so it reads the STAGED files, the
   ones that will be committed, not whatever else is in the working tree. Run by hand:   node scripts/check_twins.js
   After editing assets/js/chips.js: bump ?v= in coach.html, then:   node scripts/check_twins.js --stamp
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
// Everything below is compared in UTC, except the week of a day (section 4b): that one runs in several time zones, because the app used to read a
// cycle's date as a UTC midnight and the clock in local time, a day off west of Greenwich and an hour off on a clock-change day (fixed in pile C,
// 2026-10-11: both copies now count calendar days). Section 4b sets process.env.TZ for each zone and puts it back.
process.env.TZ = 'UTC';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), crypto = require('crypto'), cp = require('child_process');

// CHECK_TWINS_ROOT points the guard at another copy of the files (scripts/test_check_twins.js breaks one on purpose).
const ROOT = process.env.CHECK_TWINS_ROOT || path.join(__dirname, '..');
// CHECK_TWINS_INDEX=1 reads each file from git's index (what is staged), falling back to the working tree for a file
// that is not in it. The pre-commit hook sets it: a bumped ?v= left unstaged must not pass.
const FROM_INDEX = process.env.CHECK_TWINS_INDEX === '1';
function read(f) {
  if (FROM_INDEX) {
    try { return cp.execFileSync('git', ['show', ':' + f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n'); }
    catch (e) { /* not in the index: the working-tree copy */ }
  }
  return fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
}
// Section 10 holds habits.html to the catalogue that scripts/career_seed.py builds from career/*.toml. In index mode (the pre-commit hook) BOTH sides must be what is staged:
// habits.html is read from the index above, so the seed script, the checker it imports, the snapshot the checker compares and every career/ file are cut out of the
// index too and the script is run on that copy. (Until 2026-10-18 it ran on the working tree, so a toml edited and not staged was held against a staged habits.html,
// or a staged toml against a stale working one, and the hook said the wrong thing either way.) A file that is not in the index is read from the working tree, as read().
function catalogueSeed() {
  let root = ROOT, tmp = null;
  if (FROM_INDEX) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'twins-seed-'));
    const gitOut = (...a) => cp.execFileSync('git', a, { cwd: ROOT, maxBuffer: 128 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
    let names = [];
    try { names = gitOut('ls-files', 'career').toString('utf8').split('\n').map(s => s.trim()).filter(Boolean); } catch (e) { /* none: the seed script fails below, loudly */ }
    names.concat(['scripts/career_seed.py', 'scripts/check_career.py', 'supabase/xp_rules_snapshot.json']).forEach(f => {
      let buf = null;
      try { buf = gitOut('show', ':' + f); } catch (e) { try { buf = fs.readFileSync(path.join(ROOT, f)); } catch (e2) { /* not there either */ } }
      if (!buf) return;
      fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true });
      fs.writeFileSync(path.join(tmp, f), buf);
    });
    root = tmp;
  }
  try {
    for (const py of ['python', 'python3']) {
      try { return JSON.parse(cp.execFileSync(py, ['-X', 'utf8', path.join(root, 'scripts', 'career_seed.py'), '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] })); }
      catch (e) { /* the next name */ }
    }
    return null;
  } finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); }
}
const A_SRC = read('program.html'), D_SRC = read('coach.html'), H_SRC = read('habits.html');
const STAMP_FILE = path.join(ROOT, 'scripts', 'twins_stamp.json');

let checks = 0;
const failures = [], chipsFailures = [];
function bail(msg) { console.error('check_twins: ' + msg); process.exit(2); }

/* ── cutting code out of an HTML file ─────────────────────────────────────── */
// A top-level function in these files closes with "}" in column 0 (or, for a one-liner, on its own line).
// A "}" in column 0 can also sit inside a template literal, so the first candidate that compiles is the end.
function fnSrc(src, name, file) {
  const m = new RegExp('^function ' + name + '\\(', 'm').exec(src);
  if (!m) bail(`${file}: could not find function ${name}(). Was it renamed or moved? Update scripts/check_twins.js with it.`);
  // A one-line function (`function pad2(n) { return … }`) is complete on its own line; searching on for a "}" in
  // column 0 would swallow the next function as well.
  const eol = src.indexOf('\n', m.index);
  const first = src.slice(m.index, eol < 0 ? src.length : eol);
  try { new vm.Script(first); return first; } catch (e) { /* a multi-line function */ }
  let end = m.index;
  for (;;) {
    end = src.indexOf('\n}', end + 1);
    if (end < 0) bail(`${file}: function ${name}() never closes`);
    const code = src.slice(m.index, end + 2);
    try { new vm.Script(code); return code; } catch (e) { /* keep looking */ }
  }
}
// A one-line statement, found by how it starts ("const READY_FOUR = ...").
function lineSrc(src, start, file) {
  const i = src.indexOf('\n' + start);
  if (i < 0) bail(`${file}: could not find the line starting "${start}". Update scripts/check_twins.js.`);
  const j = src.indexOf('\n', i + 1);
  return src.slice(i + 1, j);
}
// A multi-line `const NAME = [ … ];` at the left margin: the first ";" at a line end after which the text compiles.
function constSrc(src, name, file) {
  const i = src.indexOf('\nconst ' + name + ' = ');
  if (i < 0) bail(`${file}: could not find const ${name}. Update scripts/check_twins.js.`);
  let end = i + 1;
  for (;;) {
    end = src.indexOf(';\n', end + 1);
    if (end < 0) bail(`${file}: const ${name} never ends`);
    const code = src.slice(i + 1, end + 1);
    try { new vm.Script(code); return code; } catch (e) { /* keep looking */ }
  }
}
const fromA = (...names) => names.map(n => fnSrc(A_SRC, n, 'program.html'));
const fromD = (...names) => names.map(n => fnSrc(D_SRC, n, 'coach.html'));
function sandbox(pre, parts, exports) {
  const ctx = vm.createContext({ console });
  vm.runInContext([pre || ''].concat(parts).join('\n'), ctx, { filename: 'twins' });
  const out = {};
  exports.forEach(n => { out[n] = vm.runInContext(n, ctx); });
  out.ctx = ctx;
  return out;
}

/* ── comparing ────────────────────────────────────────────────────────────── */
const J = v => JSON.stringify(v === undefined ? '«undefined»' : v);
function same(label, input, a, d) {
  checks++;
  if (J(a) !== J(d)) failures.push(`${label}\n    input         ${J(input)}\n    program.html  ${J(a)}\n    coach.html    ${J(d)}`);
}
function expect(label, input, got, want) {
  checks++;
  if (J(got) !== J(want)) failures.push(`${label}\n    input    ${J(input)}\n    got      ${J(got)}\n    want     ${J(want)}`);
}
function run(name, fn) {
  const n0 = checks, f0 = failures.length + chipsFailures.length;
  fn();
  console.log(`  ${failures.length + chipsFailures.length === f0 ? 'ok  ' : 'FAIL'} ${name}  (${checks - n0} checks)`);
}

/* ── 1. the four name tiers ───────────────────────────────────────────────── */
const NAMES = ['Goblet Squat', 'goblet squat', 'DB Bench Press', 'Dumbbell Bench Press', 'Machine Leg Press', 'Leg Press Machine',
  'Leg Press (Machine)', 'Cossack Squat (Bodyweight)', 'Cossack Squat', "Farmer's Carry", 'Farmer’s Carry', 'Farmers Carry',
  'Pallof Press – Half Kneeling', 'Single-Leg RDL', 'Single Leg RDL', 'KB Swing', 'BB Back Squat', 'Barbell Back Squat', 'Café Squat',
  '  extra   spaces  ', '', null, undefined, 'تمرین اسکوات', 'A1: Squat', '3/4 Squat',
  'Bulgarian Split Squat (DB)', 'Bulgarian Split Squat (Dumbbell)', 'DB/KB Complex', 'Landmine Press (Half-Kneeling)', 'Hip Thrust - Banded',
  'Nordic Hamstring Curl', 'SKI ERG', 'Push-Up', 'Push Up', 'Pushup', 'Türkish Get-Up', 'Copenhagen Plank (Long Lever)',
  // every abbreviation a coach might plausibly add to one side only
  'EZ Bar Curl', 'EZ-Bar Skull Crusher', 'Ez Bar Curl', 'TRX Row', 'Trx Row', 'BW Squat', 'Bodyweight Squat', 'SL RDL', 'Single Leg RDL', 'DB RDL', 'KB Goblet Squat',
  'Kettlebell Goblet Squat', 'Smith Machine Squat', 'Cable Row', 'Cables Row', 'Band Pull-Apart', 'Barbell Bench Press', 'BB Bench Press', 'Trap Bar Deadlift', 'TB Deadlift'];
const A_NAMES = sandbox(null, [lineSrc(A_SRC, 'const EX_ABBREV =', 'program.html')].concat(fromA('normExName', 'exNameVariants', 'indexExNames', 'matchRenamed')),
  ['exNameVariants', 'matchRenamed', 'EX_ABBREV']);
const D_NAMES = sandbox(null, [lineSrc(D_SRC, 'const EX_ABBREV_C =', 'coach.html')].concat(fromD('normExNameC', 'exNameVariantsC', 'ceilAliasMapC')),
  ['exNameVariantsC', 'ceilAliasMapC', 'EX_ABBREV_C']);
run('exercise name tiers', () => {
  same('EX_ABBREV vs EX_ABBREV_C (the abbreviation table itself)', null, A_NAMES.EX_ABBREV, D_NAMES.EX_ABBREV_C);
  NAMES.forEach(n => same('exNameVariants vs exNameVariantsC', n, A_NAMES.exNameVariants(n), D_NAMES.exNameVariantsC(n)));
});

/* ── 1b. the shared name cases (TWIN-8) ──────────────────────────────────────── */
// scripts/name_cases.json stores each name and the four tiers the athlete app gives it. This proves the dashboard gives the same four and
// that the file is the app's CURRENT answer, so it cannot go stale. scripts/test_check_program.py then holds the programme checker's Python
// norm_name() and the recorded answers of its SQL (NORM_SQL, LOOSE_SQL) to the same file. After a deliberate change to the app's name rule:
//   node scripts/check_twins.js --write-names     (rewrites the names and tiers, keeps the SQL record)
//   python scripts/name_cases_sql.py              (then redo the SQL record, as it says)
const CASES_FILE = 'scripts/name_cases.json';
const CASES_ABOUT = 'Shared cases for the exercise-name rule (audit TWIN-8). `variants` = the four tiers program.html exNameVariants() gives each name '
  + '(written by: node scripts/check_twins.js --write-names). `sql` = what check_program.py NORM_SQL and LOOSE_SQL gave on the live database, recorded by '
  + 'scripts/name_cases_sql.py with a hash of the two strings. Held by scripts/check_twins.js (app, dashboard) and scripts/test_check_program.py (the checker).';
// Names that have tripped a rule before or would: curly apostrophes and dashes, accents, a degree sign, brackets, abbreviations, nothing but spaces, Persian.
const HARD_NAMES = ['Farmer’s Carry', 'Farmer‘s Carry', 'Farmerʼs Carry', 'Farmer´s Carry', 'Café Squat', 'Cafe Squat', 'Zürich Lunge', 'Ångström Press', 'Naïve Press',
  'Brøndby Row', 'Straße Squat', 'ÀÉÎ Squat', 'Pallof Press – Half Kneeling', 'Pallof Press - Half Kneeling', 'Half–Kneeling Press', 'Half-Kneeling Press', 'Push—Up',
  '45° Cut', '45 Cut', '45°Cut', '½ Squat', 'ﬁnger Walk', 'Squat™', 'Ｓｑｕａｔ', 'Squat (Bodyweight)', 'Squat (Bodyweight) ', 'Cossack Squat (Bodyweight) (Light)',
  'Leg Press (Machine) (Wide)', 'Hip Thrust – Banded (Light)', '(Bodyweight)', 'Squat (', 'Squat )', 'A (B) C (D)', '()', 'Machine', 'machine machine',
  'Machine Leg Press Machine', 'db', 'DB', 'Db Bb Kb', 'DB KB BB Complex', 'ez bar curl', ' ', '  ', '-', 'x', '10 Reps', '3/4 Squat', '1.5 Rep Squat',
  'تمرین اسکوات', 'Squat تمرین', 'تمرین Squat', 'Squat 💪', 'İ Squat', 'ǅ Squat', 'Back Squat\ttab', 'Back Squat\nnewline', "O'Brien Press", 'O’Brien Press'];
const WANT_NAMES = Array.from(new Set(NAMES.concat(HARD_NAMES).filter(n => typeof n === 'string')));
// The file's one format (scripts/name_cases_sql.py dump_cases() writes the same bytes): one name per line.
function dumpCases(c) {
  const one = (o, pad) => '{\n' + Object.keys(o).map(k => pad + JSON.stringify(k) + ': ' + JSON.stringify(o[k])).join(',\n') + '\n' + pad.slice(2) + '}';
  const s = c.sql;
  const sql = !s ? 'null' : '{\n    "recorded": ' + JSON.stringify(s.recorded) + ',\n    "sha": ' + JSON.stringify(s.sha) + ',\n    "rows": ' + one(s.rows, '      ') + '\n  }';
  return '{\n  "about": ' + JSON.stringify(c.about) + ',\n  "variants": ' + one(c.variants, '    ') + ',\n  "sql": ' + sql + '\n}\n';
}
run('shared name cases (scripts/name_cases.json)', () => {
  WANT_NAMES.forEach(n => same('exNameVariants vs exNameVariantsC (shared cases)', n, A_NAMES.exNameVariants(n), D_NAMES.exNameVariantsC(n)));
  let file = null;
  try { file = JSON.parse(read(CASES_FILE)); } catch (e) { /* reported below */ }
  checks++;
  if (!file || !file.variants) { failures.push(`${CASES_FILE} is missing or unreadable: run   node scripts/check_twins.js --write-names`); return; }
  checks++;
  if (J(Object.keys(file.variants)) !== J(WANT_NAMES)) failures.push(`${CASES_FILE} holds ${Object.keys(file.variants).length} names and this script lists ${WANT_NAMES.length}: run   node scripts/check_twins.js --write-names, then redo the SQL record (python scripts/name_cases_sql.py)`);
  WANT_NAMES.forEach(n => { if (n in file.variants) expect(`the tiers stored for a name are what the app gives (${CASES_FILE}); if the rule changed on purpose, run --write-names and redo the SQL record`, n, file.variants[n], A_NAMES.exNameVariants(n)); });
});

/* ── 2. a renamed lift is one lift ────────────────────────────────────────── */
// The app's ceilAliasMap() reads two helpers that touch the page; they are handed in here.
const A_ALIAS = sandbox('var __cur = [], __entries = [];\nfunction currentCycleNames() { return __cur; }\nfunction loadCeiling() { return __entries; }',
  [lineSrc(A_SRC, 'const EX_ABBREV =', 'program.html')].concat(fromA('normExName', 'exNameVariants', 'indexExNames', 'matchRenamed', 'ceilAliasMap')), ['ceilAliasMap']);
const ALIAS_CASES = [
  { current: ['Back Squat', 'Bench Press'], lifts: ['Barbell Back Squat', 'Back Squat', 'Bench Press'] },
  { current: ['Back Squat', 'Bench Press'], lifts: ['Back Squat', 'Bench Press'] },
  { current: ['Dumbbell Bench Press'], lifts: ['DB Bench Press'] },
  { current: ['Machine Leg Press'], lifts: ['Leg Press'] },
  { current: ['Leg Press', 'Machine Leg Press'], lifts: ['Leg Press Machine'] },                       // ambiguous target: hands off
  { current: ['Cossack Squat'], lifts: ['Cossack Squat (Bodyweight)', 'Cossack Squat (Light)'] },      // two orphans, one target: hands off
  { current: ['Trap Bar Deadlift'], lifts: ['Hex Bar Deadlift'] },                                    // no match
  { current: [], lifts: ['Anything'] },
  { current: ['Goblet Squat'], lifts: [] },
  { current: ['Farmer’s Carry', 'Single-Leg RDL'], lifts: ["Farmer's Carry", 'Single Leg RDL', 'Farmers Carry'] },
  { current: ['EZ Bar Curl'], lifts: ['EZ-Bar Curl'] },
];
run('renamed lifts (ceilAliasMap)', () => ALIAS_CASES.forEach(c => {
  vm.runInContext('__cur = ' + J(c.current) + '; __entries = ' + J(c.lifts.map(l => ({ lift: l }))) + ';', A_ALIAS.ctx);
  same('ceilAliasMap vs ceilAliasMapC', c, A_ALIAS.ceilAliasMap(), D_NAMES.ceilAliasMapC(c.lifts.map(l => ({ lift: l })), c.current));
}));

/* ── 3. a card finds its Spine entry ──────────────────────────────────────── */
const A_SPINE = sandbox('var SPINE = null, SPINE_BY_ID = {}, SPINE_IDX = [{}, {}, {}, {}];',
  [lineSrc(A_SRC, 'const EX_ABBREV =', 'program.html')].concat(fromA('normExName', 'exNameVariants', 'setSpine', 'spineFor')), ['setSpine', 'spineFor']);
const D_SPINE = sandbox(null, [lineSrc(D_SRC, 'const EX_ABBREV_C =', 'coach.html')].concat(fromD('normExNameC', 'exNameVariantsC', 'spineIndexC', 'spineForC', 'spineLensC')),
  ['spineIndexC', 'spineForC', 'spineLensC']);
// 'machine-leg-press' and 'cossack-bw' are DRAFTS: a phone is not served them, and 'leg-press' / 'cossack' are their approved loose twins.
const SPINE = [
  { id: 'goblet-squat', name: 'Goblet Squat', aliases: ['Dumbbell Goblet Squat'], status: 'approved' },
  { id: 'machine-leg-press', name: 'Machine Leg Press', aliases: [], status: 'draft' },
  { id: 'leg-press', name: 'Leg Press', aliases: [], status: 'approved' },
  { id: 'db-bench', name: 'Dumbbell Bench Press', aliases: ['DB Bench'], status: 'approved' },
  { id: 'cossack', name: 'Cossack Squat', aliases: [], status: 'approved' },
  { id: 'cossack-bw', name: 'Cossack Squat (Bodyweight)', aliases: [], status: 'draft' },
  { id: 'farmers-carry', name: "Farmer's Carry", aliases: [], status: 'approved' },
  { id: 'push-up', name: 'Push-Up', aliases: ['Pushup'], status: 'approved' },
];
const LOOKUPS = [['Goblet Squat', ''], ['goblet squat', ''], ['Dumbbell Goblet Squat', ''], ['DB Goblet Squat', ''], ['Machine Leg Press', ''],
  ['Leg Press Machine', ''], ['Leg Press', ''], ['Leg Press (Machine)', ''], ['Cossack Squat (Bodyweight)', ''], ['Cossack Squat', ''],
  ['Cossack Squat (Light)', ''], ['Farmers Carry', ''], ['DB Bench Press', ''], ['Dumbbell Bench', ''], ['Push Up', ''], ['Pushup', ''], ['Unknown Lift', ''],
  ['', ''], [null, null], [undefined, undefined], ['Goblet Squat', 'machine-leg-press'], ['Goblet Squat', 'nonexistent'], ['xxx', 'db-bench'], ['', 'cossack'],
  ['Machine Leg Press', 'machine-leg-press'], ['Leg Press (Machine)', 'machine-leg-press'], ['Machine Leg Press', ''], ['Machine Leg Press', 'leg-press'],
  ['Cossack Squat (Bodyweight)', 'cossack-bw'], ['Cossack Squat (Bodyweight)', ''], ['Cossack Squat', 'cossack-bw'], ['Leg Press', 'machine-leg-press']];
run('Spine lookup (spineFor)', () => {
  const found = {};
  ['phone', 'coach'].forEach(view => {
    const phone = view === 'phone';
    // The phone is served approved entries only; the coach's view counts the drafts too.
    A_SPINE.setSpine(SPINE.filter(e => !phone || e.status === 'approved'));
    const lens = D_SPINE.spineLensC(SPINE, phone);
    LOOKUPS.forEach(([name, exId]) => {
      const a = A_SPINE.spineFor(name, exId), d = D_SPINE.spineForC(lens.idx, name, exId, lens.byId);
      same('spineFor vs spineForC (' + view + ' view)', { name, exId }, a ? a.id : null, d);
      found[view + '|' + name + '|' + exId] = d;
    });
  });
  // The rule, pinned by hand (TWIN-1): a card that names its entry is that entry, or nothing.
  expect('a card on a DRAFT shows nothing on the phone, not its approved loose twin', 'Machine Leg Press / machine-leg-press (draft)', found['phone|Machine Leg Press|machine-leg-press'], null);
  expect('and the coach\'s view finds the draft', 'Machine Leg Press / machine-leg-press', found['coach|Machine Leg Press|machine-leg-press'], 'machine-leg-press');
  expect('an exId the Spine does not have is no entry, whatever the name says', 'Goblet Squat / nonexistent', [found['phone|Goblet Squat|nonexistent'], found['coach|Goblet Squat|nonexistent']], [null, null]);
  expect('an exId wins over a name that belongs to another entry', 'Goblet Squat / machine-leg-press', [found['phone|Goblet Squat|machine-leg-press'], found['coach|Goblet Squat|machine-leg-press']], [null, 'machine-leg-press']);
  expect('with no exId a name is still found by its tiers', 'Machine Leg Press', [found['phone|Machine Leg Press|'], found['coach|Machine Leg Press|']], ['leg-press', 'machine-leg-press']);
  // The phone has no Spine until it loads: it answers null, never throws.
  expect('spineFor before the Spine loads', 'SPINE = null', vm.runInContext('SPINE = null; spineFor("Goblet Squat", "")', A_SPINE.ctx), null);
});

/* ── 4. the RPE target a logged set is judged against (REC-2): the week note, a lower day ─────── */
// The app's rpeTargetOn() colours the sets (paintWeekTargets(), rpeTargetOf()); its dayRpe() is the same target drawn as the "RPE 8 → 7 today" pill,
// on a lower day only. The dashboard's dayTargetC() judges a session's sets (compareExercise()); '' on the app's side is "nothing moved it".
const A_RPE = sandbox(null, [lineSrc(A_SRC, 'const READY_BASE_N', 'program.html')].concat(fromA('rpeTargetOn', 'dayRpe')), ['rpeTargetOn', 'dayRpe']);
const D_RPE = sandbox(null, fromD('rpeTarget', 'dayTargetC'), ['rpeTarget', 'dayTargetC']);
const WRITTEN = ['8', 8, '7-8', '7–8', '7 - 8', '6', 6, '6-7', '5', '5-6', '9', '10', '8.5', '7.5-8', '@8', '9-10', '', null, undefined, 'easy', '7-9', '6.5', '10-10'];
// The week note's rpeCap (else its rpeDrop) lowers the target on EVERY day of its week (Amir, 2026-10-12: "colour against the cap in those weeks");
// a lower day takes one off each end; the lower of the two wins, never under 6 and never above what was written. A drop of 0, null or none is a normal day.
const NOTES = [null, { text: 'n' }, { text: 'n', rpeCap: 7 }, { text: 'n', rpeCap: 6 }, { text: 'n', rpeCap: 5 }, { text: 'n', rpeCap: 9 }, { text: 'n', rpeDrop: 1 },
  { text: 'n', rpeDrop: 2 }, { text: 'n', rpeDrop: 0 }, { text: 'n', rpeCap: 7, rpeDrop: 1 }, { text: 'n', setsDrop: 1 }, { text: 'n', rpeCap: '7' }, { text: 'n', rpeCap: 'x' },
  { text: 'n', rpeDrop: '1' }, { text: 'n', rpeCap: 8.5 }, { text: 'n', rpeCap: 10 }];
const DROPS = [0, 1, 2, undefined, null];
const dLabel = (w, drop, note) => { const r = D_RPE.dayTargetC(D_RPE.rpeTarget(w), drop, note); return r && r.written !== undefined ? r.label : ''; };
run('the RPE target (rpeTargetOn, dayRpe), on a normal and a lower day, with and without a week note', () => WRITTEN.forEach(w => DROPS.forEach(drop => NOTES.forEach(note => {
  const input = { written: w, drop, note };
  same('rpeTargetOn vs dayTargetC', input, A_RPE.rpeTargetOn(w, drop, note), dLabel(w, drop, note));
  if (drop) same('dayRpe vs dayTargetC (a lower day: the pill is the target)', input, A_RPE.dayRpe(w, drop, note), dLabel(w, drop, note));
  else expect('dayRpe is empty on a normal day (no pill; the note moves only the colours)', input, A_RPE.dayRpe(w, drop, note), '');
}))));
// Pinned answers on both sides: same() only sees drift, and the two copies going back to the old rule together would pass it.
run('the RPE target, pinned', () => {
  const cap7 = { text: 'n', rpeCap: 7 }, drop1 = { text: 'n', rpeDrop: 1 }, sets1 = { text: 'n', setsDrop: 1 };
  [['8', 0, cap7, '7', 'a normal day in a week capped at 7: an 8 is judged against 7'],
   ['9', 0, drop1, '8', 'a normal day in a week one RPE lower: a 9 is judged against 8'],
   ['8', 0, sets1, '', 'a week that only drops a set leaves the RPE alone'],
   ['8', undefined, null, '', 'no drop and no note: the card as written'],
   ['9', 1, cap7, '7', 'a lower day in a capped week: the lower of 8 and 7'],
   ['8', 1, null, '7', 'a lower day alone: one off'],
   ['6', 0, { text: 'n', rpeCap: 5 }, '', 'a cap under 6 stops at 6'],
  ].forEach(([w, drop, note, want, label]) => {
    expect('rpeTargetOn: ' + label, { written: w, drop, note }, A_RPE.rpeTargetOn(w, drop, note), want);
    expect('dayTargetC: ' + label, { written: w, drop, note }, dLabel(w, drop, note), want);
    expect('dayRpe: ' + label, { written: w, drop, note }, A_RPE.dayRpe(w, drop, note), drop ? want : '');
  });
  const t = D_RPE.rpeTarget('8');
  expect('dayTargetC hands back the written target itself when nothing moves it', { written: '8', drop: undefined, note: null }, D_RPE.dayTargetC(t, undefined, null) === t, true);
});

/* ── 4b. the week a day falls in, and the note for it (WORK-11) ────────────── */
// The app reads the clock (cycleWeekInfo / weekNoteNow ask about TODAY); the dashboard is told the day (cycleWeekOnC / weekNoteOnC: the day a
// session was trained). So the app's functions run in a sandbox whose clock is set to LOCAL NOON of each day in turn, in the time zone being tested.
// The closing week (inRetestWindow / retestWindowOnC, TST-4) rides along: the app reads it from the cycle in DATA, so each cycle is put there in turn.
const D_WEEK = sandbox(null, [lineSrc(D_SRC, 'const RETEST_WINDOW_DAYS_C =', 'coach.html')].concat(fromD('dayNumC', 'cycleWeekOnC', 'weekNoteOnC', 'retestWindowOnC')),
  ['cycleWeekOnC', 'weekNoteOnC', 'retestWindowOnC']);
function appWeekAt(dayIso) {
  const [y, m, d] = dayIso.split('-').map(Number);
  const noon = new Date(y, m - 1, d, 12, 0, 0).getTime();      // local noon of that calendar day, in the zone under test (process.env.TZ)
  const Fixed = class extends Date { constructor(...a) { if (a.length) super(...a); else super(noon); } static now() { return noon; } };
  const ctx = vm.createContext({ console, Date: Fixed });
  vm.runInContext(['var DATA = null;', lineSrc(A_SRC, 'const RETEST_WINDOW_DAYS =', 'program.html')]
    .concat(fromA('cycleDayNo', 'todayDayNo', 'cycleWeekInfo', 'weekNoteNow', 'currentCycle', 'inRetestWindow')).join('\n'), ctx);
  const inWindow = vm.runInContext('inRetestWindow', ctx);
  return { info: vm.runInContext('cycleWeekInfo', ctx), note: vm.runInContext('weekNoteNow', ctx),
    retest: c => { ctx.DATA = { cycles: [c], currentCycleIndex: 0 }; return inWindow(); } };
}
// The athletes' clocks: UTC, the Americas (west of Greenwich, where the app was a day early), Europe, Iran, and the two southern zones that change their
// clocks inside the days below (Sydney on 4 Oct, Auckland on 27 Sep). New York and Europe change theirs inside the spring and autumn ranges.
const WEEK_ZONES = ['UTC', 'America/Los_Angeles', 'America/New_York', 'America/Sao_Paulo', 'Europe/London', 'Asia/Tehran', 'Australia/Sydney', 'Pacific/Auckland'];
const WEEK_CYCLES = [
  { startDate: '2026-09-01', endDate: '2026-10-06', weekNotes: { '1': { text: 'w1', rpeCap: 7 }, '3': { text: 'w3', rpeDrop: 1 }, '5': { text: 'w5', rpeCap: 6 } } },
  { startDate: '2026-09-01', endDate: '2026-09-29', weekNotes: { first: { text: 'first', rpeDrop: 1 }, last: { text: 'last', rpeCap: 6 } } },
  { startDate: '2026-09-01', endDate: '2026-09-29', weekNotes: { first: { text: 'first' }, '1': { text: 'a numeric key wins', rpeCap: 8 }, last: { text: 'last' } } },
  { startDate: '2026-09-01', endDate: '2026-09-08', weekNotes: { first: { text: 'one week', rpeCap: 7 }, last: { text: 'also last' } } },
  { startDate: '2026-09-01', endDate: '2026-09-08', weekNotes: { last: { text: 'only a last note, in a one-week cycle', rpeCap: 7 } } },
  { startDate: '2026-09-01', weekNotes: { first: { text: 'no end date' } } },
  { weekNotes: { first: { text: 'no dates' } } },
  { startDate: '2026-09-01', endDate: '2026-10-06' },
  { startDate: 'not a date', endDate: '2026-10-06', weekNotes: { first: { text: 'x' } } },
  { startDate: '2026-10-06', endDate: '2026-09-01', weekNotes: { first: { text: 'end before start' } } },
  { startDate: '2026-09-01', endDate: '2026-10-06', weekNotes: { '2': { title: 'no text' }, '4': { text: '' } } },
  { startDate: '2026-02-23', endDate: '2026-03-30', weekNotes: { '1': { text: 'across a month' }, last: { text: 'z' } } },
  { startDate: '2026-09-01', endDate: '2026-10-13', weekNotes: { '6': { text: 'six weeks', rpeCap: 7 } } },
  { startDate: '2026-03-01', endDate: '2026-04-05', weekNotes: { '1': { text: 'across the spring clock changes', rpeCap: 7 }, '4': { text: 'w4' }, last: { text: 'last' } } },
  { startDate: '2026-10-05', endDate: '2026-11-09', weekNotes: { first: { text: 'across the autumn clock changes' }, '4': { text: 'w4', rpeDrop: 1 } } },
  { startDate: '2026-09-01', endDate: 'soon', weekNotes: { first: { text: 'an end date that cannot be read' } } },
  null, undefined, {}];
const WEEK_DAYS = []; for (let n = -4; n <= 46; n++) WEEK_DAYS.push(new Date(Date.UTC(2026, 7, 29 + n)).toISOString().slice(0, 10));
// the spring clock changes (20 Feb to 12 Apr) and the autumn ones (20 Oct to 12 Nov)
for (let n = 0; n < 52; n++) WEEK_DAYS.push(new Date(Date.UTC(2026, 1, 20 + n)).toISOString().slice(0, 10));
for (let n = 0; n < 24; n++) WEEK_DAYS.push(new Date(Date.UTC(2026, 9, 20 + n)).toISOString().slice(0, 10));
// The dashboard returns { wk } on a note; the app also returns its `key` ('first' | 'last' | 'week'), which the dashboard does not need.
const noteView = n => n && { text: n.text, title: n.title, setsDrop: n.setsDrop, rpeDrop: n.rpeDrop, rpeCap: n.rpeCap, wk: n.wk };
WEEK_ZONES.forEach(zone => run(`week of a day, its note and the retest window (cycleWeekInfo / weekNoteNow / inRetestWindow), the athlete's clock in ${zone}`, () => {
  process.env.TZ = zone;
  try {
    WEEK_DAYS.forEach(day => {
      const app = appWeekAt(day);
      WEEK_CYCLES.forEach(c => {
        same(`cycleWeekInfo vs cycleWeekOnC (${zone})`, { cycle: c, day, zone }, app.info(c), D_WEEK.cycleWeekOnC(c, day));
        same(`weekNoteNow vs weekNoteOnC (${zone})`, { cycle: c, day, zone }, noteView(app.note(c)), noteView(D_WEEK.weekNoteOnC(c, day)));
        same(`inRetestWindow vs retestWindowOnC (${zone})`, { cycle: c, day, zone }, app.retest(c), D_WEEK.retestWindowOnC(c, day));
      });
    });
  } finally { process.env.TZ = 'UTC'; }
}));

/* ── 4c. is a started session over? (TWIN-6) ───────────────────────────────── */
// "On another calendar day AND more than six hours old". Run on two clocks: mid-afternoon, and just after midnight, where a session
// started at 23:30 is only 2.5 hours old and must still be live.
function appStaleAt(nowIso) {
  const now = new Date(nowIso).getTime();
  const Fixed = class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
  const ctx = vm.createContext({ console, Date: Fixed });
  vm.runInContext([lineSrc(A_SRC, 'const SESSION_GRACE_MS =', 'program.html')].concat(fromA('sessionIsStale')).join('\n'), ctx);
  const dctx = vm.createContext({ console, Date: Fixed });
  vm.runInContext([lineSrc(D_SRC, 'const SESSION_GRACE_MS_C =', 'coach.html')].concat(fromD('sessionIsStaleC')).join('\n'), dctx);
  return { app: vm.runInContext('sessionIsStale', ctx), dash: vm.runInContext('sessionIsStaleC', dctx), now };
}
run('is a started session over (sessionIsStale)', () => ['2026-10-11T14:00:00Z', '2026-10-11T02:00:00Z', '2026-10-11T00:05:00Z', '2026-10-11T23:50:00Z'].forEach(nowIso => {
  const c = appStaleAt(nowIso);
  const OFFSETS_MIN = [0, -1, -30, -120, -300, -359, -360, -361, -420, -600, -900, -1500, -1799, -1801, -3000, -10000, 60, 600, -100000];
  const stamps = OFFSETS_MIN.map(m => new Date(c.now + m * 60000).toISOString()).concat([null, undefined, '', 'junk', '2026-10-11', '2026-10-10', '2026-10-10T23:30:00Z', '2026-10-11T00:30:00Z', 0, false]);
  stamps.forEach(s => same('sessionIsStale vs sessionIsStaleC', { now: nowIso, stamp: s }, c.app(s), c.dash(s)));
}));

/* ── 4g. the live quest run (TODAY-14): habits.html is the app, coach.html the dashboard ─────────────── */
// A run lasts seven days, is clipped the day before the next run starts, and can be ended early by the coach; the one shown is the
// LATEST-STARTING run that covers today. Both run on the same runs and the same clock (a fixed Date, in UTC).
function questAt(nowIso, runs) {
  const now = new Date(nowIso).getTime();
  const Fixed = class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
  const hctx = vm.createContext({ console, Date: Fixed });
  vm.runInContext(['var CFG = { questRuns: ' + J(runs) + ' };', lineSrc(H_SRC, 'const QUEST_RUN_DAYS =', 'habits.html')].concat(
    ['today', 'addDays', 'fmtKey', 'parseKey'].map(n => fnSrc(H_SRC, n, 'habits.html')), [lineSrc(H_SRC, 'const TKEY =', 'habits.html')],
    ['questRuns', 'runEndKey', 'activeQuestRun'].map(n => fnSrc(H_SRC, n, 'habits.html'))).join('\n'), hctx);
  const dctx = vm.createContext({ console, Date: Fixed });
  vm.runInContext(['var S = { rules: { questRuns: ' + J(runs) + ' } };'].concat(['pad2', 'dkey', 'todayKey', 'addDays', 'questRuns', 'questRunEnd', 'activeQuestRun'].map(n => fnSrc(D_SRC, n, 'coach.html'))).join('\n'), dctx);
  return { app: n => vm.runInContext(n, hctx), dash: n => vm.runInContext(n, dctx) };
}
const RUN_SETS = [
  [],
  [{ start: '2026-10-09', ids: ['a'] }],
  [{ start: '2026-10-07', ids: ['a'] }, { start: '2026-10-10', ids: ['b'] }],                                  // the second takes over from its own start
  [{ start: '2026-10-14', ids: ['b'] }, { start: '2026-10-09', ids: ['a'] }],                                  // one scheduled ahead, listed first
  [{ start: '2026-10-09', ids: ['a'] }, { start: '2026-10-14', ids: ['b'] }],                                  // the same, listed last
  [{ start: '2026-10-08', ids: ['a'], end: '2026-10-10' }],                                                    // ended early by the coach
  [{ start: '2026-10-08', ids: ['a'], end: '2026-10-20' }],                                                    // an end after the seventh day changes nothing
  [{ start: '2026-10-08', ids: ['a'], end: 'soon' }, { start: '2026-10-09', ids: ['b'], end: '2026-10-09' }],  // not a date; a one-day run
  [{ start: '2026-10-12', ids: ['a'], end: '2026-10-10' }],                                                    // ended before it began
  [null, { start: 5, ids: ['a'] }, { start: '2026-10-09' }, { start: '2026-10-09', ids: 'x' }, { start: '2026-10-10', ids: ['ok'] }],
  [{ start: '2026-10-04', ids: ['a'] }, { start: '2026-10-08', ids: ['b'], end: '2026-10-11' }, { start: '2026-10-10', ids: ['c'] }, { start: '2026-10-17', ids: ['d'] }],
  [{ start: '2026-10-10', ids: ['a'] }, { start: '2026-10-10', ids: ['b'] }],                                  // two on one start day
];
run('the live quest run (activeQuestRun, runEndKey)', () => RUN_SETS.forEach(runs => ['2026-10-03', '2026-10-07', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-14', '2026-10-17', '2026-10-25'].forEach(day => {
  const q = questAt(day + 'T12:00:00Z', runs);
  same('activeQuestRun (the live run)', { runs, day }, q.app('activeQuestRun()'), q.dash('activeQuestRun()'));
  q.app('questRuns()').forEach(r => same('runEndKey vs questRunEnd (the last day)', { runs, run: r }, q.app('runEndKey')(r), q.dash('questRunEnd')(r)));
})));

/* ── 4d. which values of `test` are a retest flag (TWIN-7) ──────────────────── */
const A_TEST = sandbox(null, [lineSrc(A_SRC, 'const ONE_RM_MAX_EFFECTIVE =', 'program.html'), lineSrc(A_SRC, 'const DEFAULT_TEST_REPS =', 'program.html')].concat(fromA('exTestSpec')), ['exTestSpec']);
const D_TEST = sandbox(null, [lineSrc(D_SRC, 'const DEFAULT_TEST_REPS_C =', 'coach.html')].concat(fromD('exTestSpecC')), ['exTestSpecC']);
const TEST_VALUES = [true, false, 'true', '5RM', '5rm', '5 RM', '3RM', '1RM', '10RM', '11RM', '0RM', '00RM', '05RM', '5RM ', ' 5RM', '5RMx', 5, 0, 10, 11, null, undefined, '', ' ', {}, [], ['5RM'],
  'heavy', 'test', 'AMRAP', '8-10RM', '5RM\n', '١٠RM', '2.5RM', '-3RM', '5 rm', '5\trm'];
run('retest flag (exTestSpec)', () => TEST_VALUES.forEach(v => same('exTestSpec vs exTestSpecC', v, A_TEST.exTestSpec({ test: v }), D_TEST.exTestSpecC({ test: v }))));
same('exTestSpec vs exTestSpecC on no exercise', null, A_TEST.exTestSpec(null), D_TEST.exTestSpecC(null));

/* ── 4e. the check-in score and the athlete's usual (TWIN-3, TODAY-11) ───────── */
const A_USUAL = sandbox('var HIST = null;', [lineSrc(A_SRC, 'const READY_FOUR =', 'program.html'), lineSrc(A_SRC, 'const READY_BASE_N =', 'program.html')].concat(fromA('readinessS', 'readinessBase')), ['readinessS', 'readinessBase']);
const D_USUAL = sandbox(null, [lineSrc(D_SRC, 'const READY_FOUR_C =', 'coach.html'), lineSrc(D_SRC, 'const READY_BASE_N_C =', 'coach.html')].concat(fromD('readinessSC', 'usualC')), ['readinessSC', 'usualC']);
const ANSWERS = [{ sleep: 4, energy: 4, stress: 4, overall: 4, soreness: 3 }, { sleep: 1, energy: 5, stress: 3, overall: 2, soreness: 5 }, { sleep: 5, energy: 5, stress: 5, overall: 5 },
  { sleep: 3, energy: 3, stress: 3, overall: 3, soreness: 1 }, { sleep: 0, energy: 3, stress: 3, overall: 3 }, { sleep: 6, energy: 3, stress: 3, overall: 3 }, { sleep: 3, energy: 3, stress: 3 },
  { sleep: '4', energy: '4', stress: '3', overall: '2' }, { sleep: 2.5, energy: 3, stress: 3.5, overall: 4 }, { skipped: true, sleep: 4, energy: 4, stress: 4, overall: 4 }, {}, null, undefined,
  { sleep: null, energy: 4, stress: 4, overall: 4 }, { sleep: 'x', energy: 4, stress: 4, overall: 4 }, { sleep: 4, energy: 4, stress: 4, overall: 4, composite: 1 }];
run('check-in score (readinessS)', () => ANSWERS.forEach(r => same('readinessS vs readinessSC', r, A_USUAL.readinessS(r), D_USUAL.readinessSC(r))));
// The usual: the app reads the phone's history (newest first, each row's `ready`); the dashboard is handed the scores newest first.
const HISTORIES = [[], [4], [4, 4, 4, 4], [4, 4, 4, 4, 4], [3, 4, 5, 3, 4, 5], [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 1, 1, 1, 1, 1, 1, 1],
  [2.5, 3.25, 4, 4.75, 3], [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1], [3, 3, 3, 3, 3.5]];
run('the athlete\'s usual (readinessBase)', () => HISTORIES.forEach(h => {
  vm.runInContext('HIST = ' + J(h.map(s => ({ ready: { sleep: s, energy: s, stress: s, overall: s } }))), A_USUAL.ctx);
  same('readinessBase vs usualC', h, A_USUAL.readinessBase(), D_USUAL.usualC(h));
  // answered and unanswered check-ins mixed: the app skips a row it cannot score
  vm.runInContext('HIST = ' + J([{ ready: null }, { ready: { skipped: true } }].concat(h.map(s => ({ ready: { sleep: s, energy: s, stress: s, overall: s } })))), A_USUAL.ctx);
  same('readinessBase (with unanswered rows) vs usualC', h, A_USUAL.readinessBase(), D_USUAL.usualC(h));
}));

/* ── 5. what the Quality check counts ─────────────────────────────────────── */
const A_QM = sandbox(null, fromA('qmSets', 'isPrepBlockTitle'), ['qmSets', 'isPrepBlockTitle']);
const D_QM = sandbox(null, [lineSrc(D_SRC, 'const QM_PREP =', 'coach.html')].concat(fromD('qmSetsC')), ['qmSetsC', 'QM_PREP']);
const RXS = [{ sets: 3 }, { sets: '4' }, {}, { time: '30:00' }, { time: '30 min' }, { time: '90 s' }, { time: '10' }, { time: '5' }, { time: '0' },
  { dose: { kind: 'time', value: '20 min' } }, { dose: { kind: 'reps', value: '8' } }, { time: 'abc' }, null, undefined, { sets: 'x', time: '12 min' },
  { time: '1:30' }, { time: '2.5 min' }, { sets: 0, time: '45 min' }, { time: '60 sec' }, { time: '2 minutes' }];
// Each prep word alone (so dropping one from a single side shows), and the words a coach might add to one side only.
const TITLES = ['Warm-Up', 'Warmup', 'WARM UP', 'Warm', 'Cool', 'Cooldown', 'Cool-down', 'Prime', 'Prep', 'Mobility', 'Activation', 'Activation & Prep',
  'Dynamic Mobility', 'Primary', 'Strength', 'Power', 'Core', 'Plyometrics', 'Accessory', 'Conditioning Circuit', 'Shoulder Prep', 'PREPARATION', '',
  null, undefined, 'Speed & Agility', 'Finisher', 'Stretch', 'Stretching', 'Recovery', 'Rehab', 'Prehab', 'Release', 'Foam Rolling', 'Breathing',
  'Flow', 'Primer', 'Activate', 'Mobilise', 'Mobilize', 'Flexibility', 'Reset', 'Priming'];
run('Quality check (sets, prep blocks)', () => {
  RXS.forEach(rx => same('qmSets vs qmSetsC', rx, A_QM.qmSets(rx), D_QM.qmSetsC(rx)));
  TITLES.forEach(t => same('isPrepBlockTitle vs QM_PREP', t, A_QM.isPrepBlockTitle(t), D_QM.QM_PREP.test(t || '')));
});

/* ── 5b. one day card's quality chips: the 70% gate, the 12% cut, the phone's view (TWIN-9) ───────────── */
// qualityMix() is the athlete's Home card. The dashboard's qualityDayC() must give the same chips for the same day, and qualityLensC()
// must build what the phone is served: approved entries and approved qualities only (get_exercises() and get_qualities()). The days
// are generated (a fixed seed) so that every branch is reached; rxOf() is the same stub on both sides because check_rx.js guards it.
const A_QMIX = sandbox('var SPINE = null, SPINE_BY_ID = {}, SPINE_IDX = [{}, {}, {}, {}], QUALS = null, QUALS_BY_ID = {};\nfunction rxOf(ex) { return (ex && ex.rx) || {}; }',
  [lineSrc(A_SRC, 'const EX_ABBREV =', 'program.html'), lineSrc(A_SRC, 'const QM_COVERAGE =', 'program.html')].concat(
    fromA('normExName', 'exNameVariants', 'setSpine', 'spineFor', 'setQualities', 'qmSets', 'isPrepBlockTitle', 'parseRoundCount', 'qualityMix')), ['setSpine', 'setQualities', 'qualityMix']);
const D_QMIX = sandbox('var Chips = { rxOf: function (ex) { return (ex && ex.rx) || {}; } };',
  [lineSrc(D_SRC, 'const EX_ABBREV_C =', 'coach.html'), lineSrc(D_SRC, 'const QM_PREP =', 'coach.html'), lineSrc(D_SRC, 'const QM_COVERAGE_C =', 'coach.html')].concat(
    fromD('normExNameC', 'exNameVariantsC', 'spineIndexC', 'spineForC', 'spineLensC', 'qmSetsC', 'roundCountC', 'qualityLensC', 'qualityDayC')), ['qualityLensC', 'qualityDayC']);
const QM_ENTRIES = [
  { id: 'a-squat', name: 'Alpha Squat', aliases: ['Alpha Sq'], status: 'approved', qualities: ['strength', 'muscle'] },
  { id: 'a-press', name: 'Beta Press', aliases: [], status: 'approved', qualities: ['strength'] },
  { id: 'a-jump', name: 'Gamma Jump', aliases: [], status: 'approved', qualities: ['power', 'spring', 'speed'] },
  { id: 'a-row', name: 'Delta Row', aliases: [], status: 'approved', qualities: ['muscle', 'strength'] },
  { id: 'a-carry', name: 'Epsilon Carry', aliases: [], status: 'approved', qualities: [] },
  { id: 'a-ride', name: 'Zeta Ride', aliases: [], status: 'approved', qualities: ['engine'] },
  { id: 'a-brace', name: 'Eta Brace', aliases: [], status: 'approved', qualities: ['armour', 'brakes'] },
  { id: 'a-twist', name: 'Theta Twist', aliases: [], status: 'approved', qualities: ['rotation', 'notaquality'] },
  { id: 'a-plank', name: 'Mu Plank', aliases: [], status: 'approved', qualities: ['armour'] },
  { id: 'a-plankw', name: 'Mu Plank (Weighted)', aliases: [], status: 'approved', qualities: ['armour', 'strength'] },
  { id: 'a-walk', name: 'Nu Walk', aliases: [], status: 'approved' },
  { id: 'd-lunge', name: 'Iota Lunge', aliases: [], status: 'draft', qualities: ['strength', 'brakes'] },
  { id: 'd-bound', name: 'Kappa Bound', aliases: ['Gamma Jump'], status: 'draft', qualities: ['spring'] },   // a draft that shares a name with an approved entry
  { id: 'd-hang', name: 'Lambda Hang', aliases: [], status: 'draft', qualities: ['movement'] },
  { id: 'd-sprint', name: 'Xi Sprint', aliases: [], status: 'draft', qualities: ['speed', 'engine'] },
];
const QM_QUALITY_IDS = ['strength', 'muscle', 'power', 'spring', 'speed', 'brakes', 'rotation', 'engine', 'armour', 'movement'];
const QM_STATUS = { speed: 'draft', rotation: 'draft', movement: 'draft' };
// two orders, so a tie between two qualities breaks one way in the first and the other way in the second
const QM_QUALS = [1, -1].map(dir => QM_QUALITY_IDS.map((id, i) => ({ id, name: id, status: QM_STATUS[id] || 'approved', sort: dir * (i + 1) })));
function mulberry32(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const QM_NAMES = ['Alpha Squat', 'Alpha Sq', 'alpha squat', 'Beta Press', 'Gamma Jump', 'Delta Row', 'Epsilon Carry', 'Zeta Ride', 'Eta Brace', 'Theta Twist', 'Mu Plank', 'Mu Plank (Weighted)',
  'Nu Walk', 'Iota Lunge', 'Kappa Bound', 'Lambda Hang', 'Xi Sprint', 'Unknown Lift', 'Omicron Thing', ''];
const QM_IDS = ['', '', '', 'a-squat', 'a-jump', 'a-brace', 'd-lunge', 'd-bound', 'd-sprint', 'zzz-missing'];
const QM_RX = [{ sets: 1 }, { sets: 2 }, { sets: 3 }, { sets: 3 }, { sets: 4 }, { sets: 5 }, { sets: 6 }, { sets: '4' }, { time: '30 min' }, { time: '45:00' }, { time: '90 s' }, {}, { sets: 0, time: '20 min' }, undefined];
const QM_TITLES = ['Warm-Up', 'Primary', 'Primary', 'Accessory', 'Conditioning Circuit', 'Cool-Down', 'Activation & Prep', 'Core', 'Mobility', 'Power', '', undefined];
const QM_ROUNDS = [2, 3, '4', '×3 Rounds', 0, '0', undefined, 'x', 1];
function qmDays(seed, n) {
  const rnd = mulberry32(seed), pick = a => a[Math.floor(rnd() * a.length)], days = [];
  for (let i = 0; i < n; i++) {
    const blocks = [];
    for (let b = 0, nb = 1 + Math.floor(rnd() * 4); b < nb; b++) {
      const exercises = [];
      for (let e = 0, ne = 1 + Math.floor(rnd() * 4); e < ne; e++) {
        if (rnd() < 0.25) {
          const items = [];
          for (let k = 0, nk = 1 + Math.floor(rnd() * 3); k < nk; k++) items.push({ name: pick(QM_NAMES), exId: pick(QM_IDS) });
          const r = pick(QM_ROUNDS), ex = { type: 'circuit', name: 'Circuit', items };
          if (rnd() < 0.5) ex.rx = { rounds: r }; else ex.rounds = typeof r === 'number' ? '×' + r + ' Rounds' : r;
          exercises.push(ex);
        } else exercises.push({ type: 'standard', name: pick(QM_NAMES), exId: pick(QM_IDS), rx: pick(QM_RX) });
      }
      blocks.push({ title: pick(QM_TITLES), exercises });
    }
    days.push({ id: i + 1, blocks });
  }
  return days;
}
// Hand-built edges: exactly 70% tagged, just under, the 12% share exactly met and just missed, and the 1.5 floor.
const sq = n => ({ name: 'Alpha Squat', type: 'standard', rx: { sets: n } }), walk = n => ({ name: 'Nu Walk', type: 'standard', rx: { sets: n } });
const press = n => ({ name: 'Beta Press', type: 'standard', rx: { sets: n } }), ride = n => ({ name: 'Zeta Ride', type: 'standard', rx: { sets: n } });
const dayOf = (...exercises) => ({ id: 1, blocks: [{ title: 'Primary', exercises }] });
const QM_EDGES = [dayOf(sq(7), walk(3)), dayOf(sq(6), walk(4)), dayOf(sq(14), walk(5)), dayOf(sq(1)), dayOf(sq(2)), dayOf(press(22), ride(3)), dayOf(press(22), ride(2)),
  dayOf(press(22), ride(2.5)), dayOf(), { id: 2, blocks: [] }, { id: 3 }, null, undefined, dayOf(sq(7), walk(3), { title: 'x' }), { id: 4, blocks: [{ title: 'Warm-Up', exercises: [sq(9)] }] }];
const tally = { shown: 0, lowCover: 0, floor: 0, none: 0 };
run('one day card\'s quality chips (qualityMix)', () => {
  QM_QUALS.forEach(quals => ['phone', 'coach'].forEach(view => {
    const phone = view === 'phone';
    vm.runInContext('setSpine(' + J(QM_ENTRIES.filter(e => !phone || e.status === 'approved')) + '); setQualities(' + J(quals.filter(q => !phone || q.status === 'approved')) + ');', A_QMIX.ctx);
    const lens = D_QMIX.qualityLensC(QM_ENTRIES, quals, phone);
    qmDays(20261011, 450).concat(QM_EDGES).forEach(day => {
      const a = A_QMIX.qualityMix(day), m = D_QMIX.qualityDayC(day, lens);
      same('qualityMix vs qualityDayC (' + view + ' view)', day, a, m.chips);
      if (m.chips.length) tally.shown++; else if (m.total && m.coverage < 0.7) tally.lowCover++; else if (m.total) tally.floor++; else tally.none++;
    });
  }));
  // the generated corpus must reach every branch, or agreeing on it would prove little
  expect('the days reach a shown card, a blank one for low coverage, one for too few sets, and one with nothing to count', 'corpus',
    [tally.shown > 200, tally.lowCover > 200, tally.floor > 5, tally.none > 5], [true, true, true, true]);
  // the phone is served approved entries and qualities only: the lens must drop the rest, and keep the order and the status of what it keeps
  const lens = D_QMIX.qualityLensC(QM_ENTRIES, QM_QUALS[0], true);
  expect('the phone lens holds approved entries and qualities only', 'lens', [Object.keys(lens.byId).sort(), Object.keys(lens.qById).sort()],
    [QM_ENTRIES.filter(e => e.status === 'approved').map(e => e.id).sort(), QM_QUALITY_IDS.filter(q => !QM_STATUS[q]).sort()]);
  const all = D_QMIX.qualityLensC(QM_ENTRIES, QM_QUALS[0], false);
  expect('the coach lens holds everything', 'lens', [Object.keys(all.byId).length, Object.keys(all.qById).length], [QM_ENTRIES.length, QM_QUALITY_IDS.length]);
});

/* ── 6. the check-in line: the writer and its reader ──────────────────────── */
// program.html writes "Today: lower day (...) · sore: ..." onto the emailed report (the Readiness field and the full
// summary: the block in buildSessionData(), run here exactly as it stands) and coach.html's email import reads it
// back (parseCheckinPlan). Reword one and the other silently stops matching.
const A_RD = sandbox(null, [constSrc(A_SRC, 'READINESS_QUESTIONS', 'program.html')].concat(['READY_AMBER_S', 'READY_FOUR', 'READY_BASE_N'].map(s => lineSrc(A_SRC, 'const ' + s, 'program.html')),
  fromA('readinessS', 'readinessPlan', 'readinessPlanLine')), ['readinessS', 'readinessPlan', 'readinessPlanLine']);
const WRITER = (() => {
  const i = A_SRC.indexOf("let readinessSummary = '', readinessField = '';"), j = A_SRC.indexOf('if (dayNote) summary +=', i);
  if (i < 0 || j <= i) bail("program.html: could not find the report's readiness block in buildSessionData() (from \"let readinessSummary\" to \"if (dayNote) summary +=\"). Update scripts/check_twins.js.");
  return A_SRC.slice(i, j);
})();
// The app's own code for one check-in: { summary, field } exactly as the report carries them.
const writeReport = vm.runInContext('(function (readiness) { var summary = ""; ' + WRITER + '\n return { summary: summary, field: readinessField }; })', A_RD.ctx);
const D_RD = sandbox(null, fromD('planLabelC', 'parseCheckinPlan', 'parseSessionEmail'), ['planLabelC', 'parseCheckinPlan', 'parseSessionEmail']);
const emailFrom = (rep, note) => ['Athlete', 'Ava Example', '', 'Day', 'Day 1 — Test', '', 'Status', 'Complete', '', 'Session RPE', '7/10', '', 'Readiness', rep.field, '',
  'Notes from athlete', note || '(none)', '', 'Full summary', 'Day 1 — Test\nStatus: Complete\nSession RPE: 7/10\n' + rep.summary + (note ? '\nNotes from athlete:\n' + note + '\n' : '') + '\nExercise log:\n'].join('\n');
const IMITATIONS = ['Today: short day (only 40 min), cut the accessories', 'Overall 8 - lower day (poor sleep)', 'Today: sore: jumps and landings halved, knee'];
run('check-in line round trip', () => {
  // 1. the wording itself, pinned. If the app rewords or extends the line, update parseCheckinPlan() AND these strings.
  const GOLD = [
    [{ level: 'amber', sore: '', asWritten: false }, 'Today: lower day (every RPE 1 lower, never below 6)'],
    [{ level: 'red', sore: '', asWritten: false }, 'Today: short day (warm-up, first power move and first primary lift; the rest optional)'],
    [{ level: 'green', sore: 'half', asWritten: false }, 'Today: sore: jumps and landings halved'],
    [{ level: 'green', sore: 'skip', asWritten: false }, 'Today: sore: jumps and landings skipped'],
    [{ level: 'amber', sore: 'half', asWritten: true }, 'Today: lower day (every RPE 1 lower, never below 6) · sore: jumps and landings halved — trained as written by choice'],
    [{ level: 'red', sore: 'skip', asWritten: false }, 'Today: short day (warm-up, first power move and first primary lift; the rest optional) · sore: jumps and landings skipped'],
    [{ level: 'green', sore: '', asWritten: false }, ''],
  ];
  GOLD.forEach(([r, line]) => expect("readinessPlanLine's wording (program.html changed it: update parseCheckinPlan() in coach.html and this table)", r, A_RD.readinessPlanLine(r), line));

  // 2. every combination, through the app's real report writer and the dashboard's reader.
  ['red', 'amber', 'green'].forEach(level => ['', 'half', 'skip'].forEach(sore => [false, true].forEach(asWritten => {
    const r = { timestamp: '2026-10-10T08:00:00.000Z', sleep: 3, energy: 4, soreness: 2, stress: 4, overall: 3, composite: 3.25, skipped: false, level, sore, drop: level === 'green' ? 0 : 1, score: 3.5, base: null, asWritten };
    const rep = writeReport(r), line = A_RD.readinessPlanLine(r);
    const want = line ? { level, sore, drop: level === 'green' ? 0 : 1, asWritten } : null;
    expect('the report writer -> parseCheckinPlan (the Readiness field alone)', r, D_RD.parseCheckinPlan(rep.field), want);
    expect('the report writer -> parseCheckinPlan (the full summary alone)', r, D_RD.parseCheckinPlan(rep.summary), want);
    expect('...the field wrapped by a mail client', r, D_RD.parseCheckinPlan(rep.field.replace(/ · /g, ' ·\n').replace(/ (RPE|jumps|landings|as) /g, ' $1\n')), want);
    expect('...the summary wrapped by a mail client', r, D_RD.parseCheckinPlan(rep.summary.replace(/ · /g, ' ·\n').replace(/ (RPE|jumps|landings|as) /g, ' $1\n')), want);
    const got = D_RD.parseSessionEmail(emailFrom(rep, '')).readiness;
    expect('the whole email -> the verdict as the app stored it', r, { level: got.level, sore: got.sore, drop: got.drop, asWritten: got.asWritten },
      line ? { level, sore, drop: level === 'green' ? 0 : 1, asWritten } : { level: undefined, sore: undefined, drop: undefined, asWritten: undefined });
    // The athlete's own words never set a verdict, whatever the check-in said, and never remove a real one.
    IMITATIONS.forEach(note => {
      const g = D_RD.parseSessionEmail(emailFrom(rep, note)).readiness;
      expect('a note that imitates the line changes nothing', { note, r }, { level: g.level, sore: g.sore, drop: g.drop, asWritten: g.asWritten },
        line ? { level, sore, drop: level === 'green' ? 0 : 1, asWritten } : { level: undefined, sore: undefined, drop: undefined, asWritten: undefined });
    });
  })));

  // 3. the score and the verdict over a grid of answers, written by the app's own code from its own plan.
  let seed = 7;
  const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return 1 + (seed % n); };
  for (let i = 0; i < 300; i++) {
    const ans = { sleep: rnd(5), energy: rnd(5), soreness: rnd(5), stress: rnd(5), overall: rnd(5) };
    const base = i % 3 === 0 ? null : 2 + (rnd(30) / 10);
    const plan = A_RD.readinessPlan(ans, base);
    const r = Object.assign({ timestamp: '2026-10-10T08:00:00.000Z', composite: 3, skipped: false }, ans, plan, { asWritten: i % 7 === 0 });
    const line = A_RD.readinessPlanLine(r), got = D_RD.parseSessionEmail(emailFrom(writeReport(r), '')).readiness;
    if (line) {
      expect('email import: the verdict as the app stored it', { ans, base }, { level: got.level, sore: got.sore, drop: got.drop, asWritten: got.asWritten }, { level: plan.level, sore: plan.sore, drop: plan.drop, asWritten: i % 7 === 0 });
      same('email import: the score', { ans, base }, plan.score, got.score);
    } else {
      // A normal day writes no line, so the import stores no verdict and no score (it cannot know the athlete's usual).
      expect('email import: no line, nothing stored', { ans, base }, [got.level, got.score], [undefined, undefined]);
    }
  }
});

/* ── 7. chips.js is loaded behind a hand-typed ?v= ────────────────────────── */
// coach.html loads assets/js/chips.js?v=<token>, and the service worker answers /assets/ from cache first: an edit to
// chips.js under an unchanged token never reaches a browser that already has the file (TWIN-4).
function chipsStamp() {
  const sha = crypto.createHash('sha256').update(read('assets/js/chips.js')).digest('hex').slice(0, 16);
  const m = D_SRC.match(/<script src="\/assets\/js\/chips\.js\?v=([^"]+)"/);
  return { v: m ? m[1] : null, sha };
}
function stampOnDisk() {
  try { return JSON.parse(read('scripts/twins_stamp.json'))['assets/js/chips.js']; } catch (e) { return null; }
}
if (process.argv.includes('--write-names')) {
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(path.join(ROOT, CASES_FILE), 'utf8')); } catch (e) { /* a new file */ }
  const variants = {};
  WANT_NAMES.forEach(n => { variants[n] = A_NAMES.exNameVariants(n); });
  fs.writeFileSync(path.join(ROOT, CASES_FILE), dumpCases({ about: CASES_ABOUT, variants, sql: prev.sql || null }));
  console.log('wrote ' + WANT_NAMES.length + ' names to ' + CASES_FILE + (prev.sql ? ' (the SQL record was kept: redo it with   python scripts/name_cases_sql.py)' : ''));
  process.exit(0);
}
if (process.argv.includes('--stamp')) {
  const now = chipsStamp(), prev = stampOnDisk();
  if (!now.v) bail('coach.html does not load assets/js/chips.js with a ?v= token');
  // A stamp is a promise that the token was bumped with the file. Refuse to make it for a file that changed under the same token.
  if (prev && prev.sha !== now.sha && prev.v === now.v) bail(`assets/js/chips.js changed but coach.html still loads ?v=${now.v}. Bump the ?v= token first (the service worker serves /assets/ cache-first, so browsers keep the old file under the same token), then run --stamp.`);
  fs.writeFileSync(STAMP_FILE, JSON.stringify({ 'assets/js/chips.js': now }, null, 2) + '\n');
  console.log('stamped chips.js: ?v=' + now.v + ' ' + now.sha);
  process.exit(0);
}
run('chips.js cache token', () => {
  const now = chipsStamp(), prev = stampOnDisk();
  checks++;
  if (!now.v) chipsFailures.push('coach.html no longer loads assets/js/chips.js with a ?v= token (the service worker serves /assets/ cache-first)');
  else if (!prev) chipsFailures.push('scripts/twins_stamp.json is missing: run   node scripts/check_twins.js --stamp');
  else if (prev.sha !== now.sha && prev.v === now.v) chipsFailures.push(`assets/js/chips.js changed but coach.html still loads ?v=${now.v}.\n    The service worker answers /assets/ from cache first, so browsers keep the old file. Bump the ?v= token in coach.html, then run   node scripts/check_twins.js --stamp`);
  else if (prev.sha !== now.sha || prev.v !== now.v) chipsFailures.push(`the chips.js stamp is out of date (stamped ?v=${prev.v}, now ?v=${now.v}). Run   node scripts/check_twins.js --stamp   and stage scripts/twins_stamp.json`);
});

/* ── 8. Career Mode: the weeks held in a row (program.html / the server) ─────── */
// Home's Hold Serve row (2026-10-17) counts the athlete's week_held and week_broken facts with holdCount(), the phone's copy of
// get_profile()'s loop (supabase/stage66_career_mode.sql). Its twin is SQL, so the rule's cases live in scripts/career/hold_cases.json:
// this holds the app to them, and scripts/career/rehearse.mjs holds get_profile() to holdCount() on every athlete it builds.
const HOLD_CASES = JSON.parse(read('scripts/career/hold_cases.json')).cases;
const A_HOLD = sandbox(null, fromA('holdCount'), ['holdCount']);
run('Career Mode: weeks held in a row (holdCount / get_profile)', () => {
  HOLD_CASES.forEach(c => {
    const r = A_HOLD.holdCount(c.facts);
    expect('holdCount: ' + c.name, c.facts.map(f => f.kind + ' ' + f.ref), { now: r.now, best: r.best }, c.want);
  });
});

/* ── 9. Career Mode phase 2: what the two phones copy from the server (habits.html, program.html / the SQL) ─────── */
// Once the XP switch is on, AA Proof shows the career's level and a tick's XP at once, and the training app shows the level on Home and what a
// session earns (P13, P17; supabase/stage69_career_xp_switch.sql). Each copies a server rule, so the cases live in scripts/career/xp_cases.json,
// the server's own answers (written, and checked every run, by scripts/career/rehearse_switch.mjs on PGlite). This holds both apps to them.
const XP_CASES = JSON.parse(read('scripts/career/xp_cases.json'));
const H_CURVE = sandbox(null, [lineSrc(H_SRC, 'const RANKS =', 'habits.html'), lineSrc(H_SRC, 'const SUBS_PER_RANK =', 'habits.html'),
  lineSrc(H_SRC, 'const LEVELS_PER_CYCLE =', 'habits.html'), lineSrc(H_SRC, 'const MAX_LEVEL_SCAN =', 'habits.html'), constSrc(H_SRC, 'XP_RULES', 'habits.html')]
  .concat(['levelCost', 'rankFor', 'levelInfo'].map(n => fnSrc(H_SRC, n, 'habits.html'))), ['levelInfo', 'RANKS']);
const A_CAREER = sandbox(null, fromA('careerLevelOf', 'careerTruthy', 'careerFullLog', 'careerCheckin', 'careerEarly'),
  ['careerLevelOf', 'careerFullLog', 'careerCheckin', 'careerEarly']);
// paidXp() with Career Mode on: its own careerOn() is the profile's switch, so the sandbox says yes.
const H_PAID = sandbox('function careerOn() { return true; }', [constSrc(H_SRC, 'XP_RULES', 'habits.html'), constSrc(H_SRC, 'HABITS', 'habits.html')]
  .concat(['baseXp', 'xpFor', 'paidXp'].map(n => fnSrc(H_SRC, n, 'habits.html'))), ['paidXp', 'HABITS']);
run('Career Mode: the career\'s curve (habits.html levelInfo, program.html careerLevelOf / career_level)', () => {
  const L = XP_CASES.rules.level;
  expect('habits.html RANKS are the rulebook\'s ranks', null, H_CURVE.RANKS, L.ranks);
  XP_CASES.levels.forEach(c => {
    const want = { level: c.level, rank: c.rank, xp_in_level: c.xp_in_level, level_cost: c.level_cost };
    const h = H_CURVE.levelInfo(c.xp, L.base, L.growth);
    expect('habits.html levelInfo on the career\'s curve', c.xp, { level: h.lv, rank: h.label, xp_in_level: h.into, level_cost: h.need }, want);
    const a = A_CAREER.careerLevelOf(c.xp, XP_CASES.rules);
    expect('program.html careerLevelOf', c.xp, { level: a.level, rank: a.rank, xp_in_level: a.xp_in_level, level_cost: a.level_cost }, want);
  });
});
run('Career Mode: a value\'s daily XP once the switch is on (habits.html paidXp / career_paid_rules + hab_xp)', () => {
  XP_CASES.paid.forEach(c => {
    const h = H_PAID.HABITS.find(x => x.id === c.habit) || { id: c.habit, kind: 'check', target: 1 };   // a custom habit's target is 1
    expect('paidXp', { habit: c.habit, v: c.v }, H_PAID.paidXp(h, c.v), c.xp);
  });
});
run('Career Mode: what a session makes (program.html careerFullLog, careerCheckin, careerEarly / career_session_want)', () => {
  XP_CASES.sessions.forEach(c => {
    const early = A_CAREER.careerEarly(c.status);
    const kinds = [early ? 'session_finished_early' : 'session_finished']
      .concat(A_CAREER.careerFullLog(c.log, early) ? ['full_log'] : [])
      .concat(A_CAREER.careerCheckin(c.readiness) ? ['checkin_done'] : []).sort();
    expect('the facts of a session: ' + c.name, { status: c.status }, kinds, c.facts);
  });
});

/* ── 10. Career Mode phase 3: what the two phones copy of the rewards (habits.html, program.html / the SQL) ─────── */
// Once the catalogue switch is on, a tick in AA Proof that crosses a badge tier is told at once (GAME-13), and the training app's finish card says
// which ladders the session moves. Each copies a server rule (supabase/stage70_career_rewards.sql: career_measures(), career_badge_eval(),
// career_achievement_eval(), career_award_xp(), career_award_id()), so the cases are the server's own answers on made-up athletes: written, and checked
// every run, by scripts/career/rehearse_catalogue.mjs on PGlite (scripts/career/reward_cases.json). This holds both apps to them:
//   habits.html awardMeasures() + phoneAwardsFrom()   the pure core of the phone's scoring of the phone-decidable entries and its pending awards
//   habits.html awardId(), program.html awardId()     the one key for a reward (career_award_id())
//   program.html careerMoves()                        the finish card's lines (the ladder the server answered, what the session moved)
//   habits.html EVENTS goals                          the five events' goals, equal to career/achievements.toml (through scripts/career_seed.py --json; in index mode
//                                                     the toml, the seed script, the checker and the snapshot are cut from the INDEX, like habits.html)
// `owned` is what get_profile()'s CORE answers since stage70's split: a LIST of award ids, sorted byte by byte, with no days. The cases keep the server's own record of each
// athlete's owned awards as a map {id: day}; the phone is handed the ids in the core's shape (ownedAs()).
const RW = JSON.parse(read('scripts/career/reward_cases.json'));
const ownedAs = o => (Array.isArray(o) ? o.slice() : Object.keys(o || {})).sort();
const H_AW = sandbox(null, ['awardId', 'awardCat', 'awardMeasures', 'phoneAwardsFrom'].map(n => fnSrc(H_SRC, n, 'habits.html')),
  ['awardId', 'awardMeasures', 'phoneAwardsFrom']);
const A_AW = sandbox(null, fromA('awardId', 'careerMoves'), ['awardId', 'careerMoves']);
// Key order is not part of an answer: compare as sorted JSON.
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)) ? Object.keys(x).sort().reduce((o, y) => { o[y] = x[y]; return o; }, {}) : x);
function expectCanon(label, input, got, want) {
  checks++;
  if (canon(got) !== canon(want)) failures.push(`${label}\n    input    ${J(input)}\n    got      ${canon(got)}\n    want     ${canon(want)}`);
}
run('Career Mode phase 3: the award id (habits.html awardId, program.html awardId / career_award_id)', () => {
  checks++;
  if (!Array.isArray(RW.ids) || RW.ids.length < 5) failures.push('scripts/career/reward_cases.json has no award id cases (rehearse_catalogue.mjs --write-cases)');
  (RW.ids || []).forEach(c => {
    expect('habits.html awardId', c.args, H_AW.awardId.apply(null, c.args), c.id);
    expect('program.html awardId', c.args, A_AW.awardId.apply(null, c.args), c.id);
  });
});
run('Career Mode phase 3: what the phone decides from its own log (habits.html awardMeasures, phoneAwardsFrom / career_evaluate, career_award_xp)', () => {
  checks++;
  if (!Array.isArray(RW.athletes) || RW.athletes.length < 3) failures.push('scripts/career/reward_cases.json has no athletes (rehearse_catalogue.mjs --write-cases)');
  (RW.athletes || []).forEach(a => {
    const inp = Object.assign({ targets: RW.rules.targets }, a.input);
    const meas = H_AW.awardMeasures(inp, RW.catalogue);
    expectCanon('awardMeasures: ' + a.id + ' (have, and the day each tier crossed)', { S: a.S, today: a.today }, meas, a.expect);
    const got = H_AW.phoneAwardsFrom(meas, RW.catalogue, { S: a.S, today: a.today, backfill_days: RW.rules.backfill_days, owned: ownedAs(a.owned), withdrawn: [] });
    expect('phoneAwardsFrom: ' + a.id + ' (pending awards: after S, in the window, not owned, priced by the server)', { S: a.S, today: a.today },
      got.map(x => [x.award_id, x.xp, x.size, x.day]), (a.phone_awards || []).map(x => [x.award_id, x.xp, x.size, x.day]));
    // A withdrawn id is never pending, and a day on or before the switch day is history: nothing for the phone to say.
    const wd = got.length ? [got[0].award_id] : [];
    expect('phoneAwardsFrom: ' + a.id + ' (a withdrawn id is left out)', wd, H_AW.phoneAwardsFrom(meas, RW.catalogue, { S: a.S, today: a.today, backfill_days: RW.rules.backfill_days, owned: ownedAs(a.owned), withdrawn: wd }).map(x => x.award_id),
      got.slice(1).map(x => x.award_id));
    expect('phoneAwardsFrom: ' + a.id + ' (nothing after a switch day in the future)', a.S, H_AW.phoneAwardsFrom(meas, RW.catalogue, { S: '2999-01-01', today: a.today, backfill_days: RW.rules.backfill_days, owned: [], withdrawn: [] }), []);
  });
});
// What the cases cannot say, pinned by hand on made-up measures: the window and the switch day. (A crossing ON the switch day is history and the server owns it, so the
// cases never leave one unowned: only this holds the phone's own `d > S`.)
run('Career Mode phase 3: when an award is pending on the phone, pinned (habits.html phoneAwardsFrom / career_evaluate history rule)', () => {
  const water = RW.catalogue.habit_water, t1 = water.tiers[0], size = t1.size || water.size || 'win';
  const S = '2026-11-01', today = '2026-11-03';
  const o = (extra) => Object.assign({ S, today, backfill_days: RW.rules.backfill_days, owned: [], withdrawn: [] }, extra || {});
  const meas = d => ({ habit_water: { have: 5, crossed: { '1': d } } });
  const ids = r => r.map(x => [x.award_id, x.xp, x.size, x.day]);
  expect('phoneAwardsFrom: the switch day is history (d <= S): a crossing on it is not pending', S, H_AW.phoneAwardsFrom(meas(S), RW.catalogue, o()), []);
  expect('phoneAwardsFrom: the day after the switch day is pending, at the price of its tier', '2026-11-02', ids(H_AW.phoneAwardsFrom(meas('2026-11-02'), RW.catalogue, o())), [['badge:habit_water:1', t1.xp, size, '2026-11-02']]);
  expect('phoneAwardsFrom: a crossing older than the open window is settled, never pending', '2026-10-25', H_AW.phoneAwardsFrom(meas('2026-10-25'), RW.catalogue, o({ S: '2026-10-01' })), []);
  expect('phoneAwardsFrom: a crossing in the future is not pending', '2026-11-04', H_AW.phoneAwardsFrom(meas('2026-11-04'), RW.catalogue, o()), []);
  expect('phoneAwardsFrom: no switch day, no pending award', null, H_AW.phoneAwardsFrom(meas('2026-11-02'), RW.catalogue, o({ S: '' })), []);
  expect('phoneAwardsFrom: an owned award is not pending', null, H_AW.phoneAwardsFrom(meas('2026-11-02'), RW.catalogue, o({ owned: ['badge:habit_water:1'] })), []);
});
// What the cases above cannot say: habit_breathe, habit_mobility, habit_supps, habit_custom, the_centurion, cold_blood and backbone never cross in the server's answers, and
// no case reaches the top tiers. So every entry of that catalogue the phone decides is also run on a measure that grows BY HAND, one a day (one every other day for a count,
// which a run is not), and held to the plain arithmetic of it: a measure that grows by one reaches `at` on day `at`. Nothing here copies the phone's code; the oracle is the
// count of days. Every tier of every badge (on the day it is reached, and absent one short of the top), an achievement on a single measure, each goal of an event in turn the last
// to finish and in turn one short, and the runs-together test with a late start and a broken run.
run('Career Mode phase 3: every entry the phone decides, every tier, on a measure that grows by hand (habits.html awardMeasures; the cases never cross them all)', () => {
  const D0 = Date.UTC(2026, 0, 1), DAYMS = 86400000, V = 5000;           // V: a day's steps in a `total` measure: under the 10,000 target (a total counts every number logged), and 200,000 and 250,000 are exact multiples, so a `>` for a `>=` shows
  const dayAt = i => new Date(D0 + i * DAYMS).toISOString().slice(0, 10);
  const T = RW.rules.targets;
  const KINDS = { streak: 'run', daysHit: 'hits', total: 'sum', daysWith3: 'with3', perfectDays: 'perfect', perfect: 'perfect', qualify: 'qualify', comebackRun: 'comebackRun', comebacksStuck: 'comebacksStuck' };
  const parse = s => { const p = String(s || '').split(':'); return KINDS[p[0]] ? { m: KINDS[p[0]], h: p[1] } : null; };
  const LIST = { with3: 'with3', perfect: 'perfect', qualify: 'onTarget', comebacksStuck: 'stuck' };
  const blank = () => ({ log: {}, onTarget: [], perfect: [], with3: [], comebacks: [], stuck: [], custom: [] });
  // grow(spec, n, start): the phone's input for a measure that has grown n steps from day `start`, and the day it reached `need` (null if it never did)
  function grow(sp, n, start) {
    const inp = blank(), put = (i, hid, v) => { const k = dayAt(i); (inp.log[k] = inp.log[k] || {})[hid] = v; };
    let at;
    if (sp.m === 'run') { for (let i = 0; i < n; i++) put(start + i, sp.h, T[sp.h]); at = need => (need <= n ? start + need - 1 : null); }
    else if (sp.m === 'hits') { for (let i = 0; i < n; i++) put(start + 2 * i, sp.h, T[sp.h]); at = need => (need <= n ? start + 2 * (need - 1) : null); }
    else if (sp.m === 'sum') { for (let i = 0; i < n; i++) put(start + i, sp.h, V); at = need => { const c = Math.ceil(need / V); return c <= n ? start + c - 1 : null; }; }
    else if (sp.m === 'daystreak') { for (let i = 0; i < n; i++) inp.onTarget.push(dayAt(start + i)); at = need => (need <= n ? start + need - 1 : null); }
    else if (sp.m === 'comebackRun') { inp.comebacks.push({ day: dayAt(start), run: n }); at = need => (need <= n ? start + need - 1 : null); }
    else { for (let i = 0; i < n; i++) inp[LIST[sp.m]].push(dayAt(start + 2 * i)); at = need => (need <= n ? start + 2 * (need - 1) : null); }
    return { inp, at };
  }
  function merge(parts) {
    const o = blank();
    parts.forEach(p => {
      Object.keys(p.log).forEach(k => Object.keys(p.log[k]).forEach(h => { o.log[k] = o.log[k] || {}; if (o.log[k][h] !== undefined) throw new Error('check_twins: two synthetic feeds write ' + h + ' on ' + k); o.log[k][h] = p.log[k][h]; }));
      ['onTarget', 'perfect', 'with3', 'comebacks', 'stuck', 'custom'].forEach(f => { o[f] = o[f].concat(p[f] || []); });
    });
    return o;
  }
  const measure = (inp, cat) => H_AW.awardMeasures(Object.assign({ targets: T }, inp), cat);
  const shortOf = (sp, need) => (sp.m === 'sum' ? Math.ceil(need / V) - 1 : need - 1);   // the last size that does not reach `need`
  const fullOf = (sp, need) => (sp.m === 'sum' ? Math.ceil(need / V) + 3 : need + 3);    // a size that reaches it with a few steps to spare
  const feedFor = (id, b) => {
    if (b.kind === 'best_run' && b.habit) return { m: 'run', h: b.habit };
    if (id === 'day_streak' || (b.proof_codes || []).indexOf('DAY_STREAK_MARKS') >= 0) return { m: 'daystreak' };
    return parse(b.proof_measure);
  };
  Object.keys(RW.catalogue).sort().forEach(id => {
    const b = RW.catalogue[id];
    if (b.retire_at) return;
    if (Array.isArray(b.tiers)) {
      // a badge: every tier on the day it is reached; one short of the top tier, the top tier is absent
      const sp = feedFor(id, b), last = Number(b.tiers[b.tiers.length - 1].at);
      checks++;
      if (!sp) { failures.push(`synthetic ${id}: no way to grow its measure here (kind ${b.kind}, ${b.proof_measure || b.habit}). Teach scripts/check_twins.js, and habits.html awardMeasures() if it cannot decide it.`); return; }
      [last + 3, last - 1].forEach(n => {
        let inp, at;
        if (id === 'habit_custom') {
          // two habits of the player's own: the first holds a 7-day run early, the second runs n days from day 20. The badge is the BEST custom habit (D6): a tier is reached
          // on the first day any one of them reaches it, never on the sum of the two.
          const mk = (hid, len, st) => { const x = blank(); for (let i = 0; i < len; i++) { const k = dayAt(st + i); (x.log[k] = x.log[k] || {})[hid] = 1; } x.custom = [hid]; return x; };
          inp = merge([mk('c_a', 7, 0), mk('c_b', n, 20)]);
          at = need => { const d = [need <= 7 ? need - 1 : null, need <= n ? 20 + need - 1 : null].filter(x => x !== null); return d.length ? Math.min.apply(null, d) : null; };
        } else { const g = grow(sp, n, 0); inp = g.inp; at = g.at; }
        const want = { have: id === 'habit_custom' ? Math.max(7, n) : n, crossed: {} };
        b.tiers.forEach((t, j) => { const d = at(Number(t.at)); if (d !== null) want.crossed[String(j + 1)] = dayAt(d); });
        expectCanon(`synthetic ${id} (a measure that grows to ${n}; tiers at ${b.tiers.map(t => t.at).join(', ')})`, { n }, measure(inp, { badge: { [id]: b } })[id], want);
      });
      return;
    }
    // an achievement
    if (b.test === 'runs_together') {
      const R = Number(b.run), hs = b.habits;
      const feed = (h, len, start, gapAfter) => { const x = blank(); for (let i = 0; i < len; i++) { const k = dayAt(start + i + (gapAfter !== undefined && i > gapAfter ? 1 : 0)); x.log[k] = { [h]: T[h] }; } return x; };
      const all = (over) => merge(hs.map(h => feed(h, (over[h] || {}).len == null ? R + 15 : over[h].len, (over[h] || {}).start || 0, (over[h] || {}).gap)));
      checks++;
      expectCanon(`synthetic ${id} (every habit on a ${R}-day run together: the day the last one reaches ${R})`, null, measure(all({}), { achievement: { [id]: b } })[id], dayAt(R - 1));
      hs.forEach(h => {
        expectCanon(`synthetic ${id} (${h} starts ten days late: the day IT reaches ${R})`, h, measure(all({ [h]: { start: 10 } }), { achievement: { [id]: b } })[id], dayAt(10 + R - 1));
        expectCanon(`synthetic ${id} (${h} one day short of ${R}: not earned)`, h, measure(all({ [h]: { len: R - 1 } }), { achievement: { [id]: b } })[id], null);
        expectCanon(`synthetic ${id} (${h} broken by a missed day, never ${R} in a row: not earned)`, h, measure(all({ [h]: { len: 2 * (R - 1), gap: R - 2 } }), { achievement: { [id]: b } })[id], null);
      });
      return;
    }
    const goals = b.test === 'goals' ? (b.goals || []).map(g => ({ sp: parse(g.kind), need: Number(g.need), kind: g.kind })) : (b.proof_measure && b.proof_need != null ? [{ sp: parse(b.proof_measure), need: Number(b.proof_need), kind: b.proof_measure }] : []);
    checks++;
    if (!goals.length || goals.some(g => !g.sp)) { failures.push(`synthetic ${id}: no way to grow its measure here (test ${b.test}). Teach scripts/check_twins.js, and habits.html awardMeasures() if it cannot decide it.`); return; }
    const cat = { achievement: { [id]: b } };
    // each goal in turn is the last to finish (forty days late): the achievement's day is the day that goal reaches its need
    goals.forEach((g, last) => {
      const parts = goals.map((x, i) => grow(x.sp, fullOf(x.sp, x.need), i === last ? 40 : 0));
      const days = parts.map((p, i) => p.at(goals[i].need));
      expectCanon(`synthetic ${id} (${g.kind} finishes last: the day it reaches ${g.need})`, g.kind, measure(merge(parts.map(p => p.inp)), cat)[id], dayAt(Math.max.apply(null, days)));
    });
    // each goal in turn one short of its need: not earned
    goals.forEach((g, short) => {
      const parts = goals.map((x, i) => grow(x.sp, i === short ? shortOf(x.sp, x.need) : fullOf(x.sp, x.need), 0));
      expectCanon(`synthetic ${id} (${g.kind} one short of ${g.need}: not earned)`, g.kind, measure(merge(parts.map(p => p.inp)), cat)[id], null);
    });
  });
});
run('Career Mode phase 3: the finish card\'s lines (program.html careerMoves / the ladder get_profile() answers)', () => {
  checks++;
  if (!Array.isArray(RW.moves) || RW.moves.length < 6) failures.push('scripts/career/reward_cases.json has no moves cases (rehearse_catalogue.mjs --write-cases)');
  (RW.moves || []).forEach((c, i) => expect('careerMoves #' + i, c.e, A_AW.careerMoves(c.e, c.ladder), c.expect));
  // Pinned by hand, what the cases cannot tell apart: a run badge (Hold Serve) counts from the run so far (`now`), not from its best (`have`); a week ladder moves only
  // when the session closes its week or cycle; Century counts a session finished early under its own fact.
  const LAD = {
    held_weeks: { name: 'Hold Serve', have: 7, now: 2, next: 8, phone: 'week', counts: ['week_held'] },
    love_hold: { name: 'Love Hold', have: 3, next: 5, phone: 'week', counts: ['week_by_the_book'] },
    finisher: { name: 'Closer', have: 0, next: 1, phone: 'week', counts: ['cycle_finished'] },
    century: { name: 'Century', have: 24, next: 25, phone: 'session', counts: ['session_finished', 'session_finished_early'] },
    early_only: { name: 'Early Bird', have: 4, next: 5, phone: 'session', counts: ['session_finished_early'] },
  };
  const none = { early: false, fullLog: false, checkin: false, weekCloses: false, cycleCloses: false };
  const brief = r => r.lines.map(l => [l.id, l.have, l.next, l.crossed, l.pending].join(' ')).concat(r.more ? ['more ' + r.more] : []);
  expect('careerMoves, pinned: a run badge counts from the run so far, not from its best (now 2, so 3 of 8, pending)', 'weekCloses', brief(A_AW.careerMoves(Object.assign({}, none, { weekCloses: true }), { held_weeks: LAD.held_weeks })), ['held_weeks 3 8 false true']);
  expect('careerMoves, pinned: a week ladder does not move while the week stays open', 'no weekCloses', brief(A_AW.careerMoves(none, { held_weeks: LAD.held_weeks, love_hold: LAD.love_hold, finisher: LAD.finisher })), []);
  expect('careerMoves, pinned: the last session of a cycle moves Closer (and a week closing alongside it)', 'cycleCloses', brief(A_AW.careerMoves(Object.assign({}, none, { weekCloses: true, cycleCloses: true }), { finisher: LAD.finisher })), ['finisher 1 1 true true']);
  expect('careerMoves, pinned: a session finished early moves its own ladder and not the finished one', 'early', brief(A_AW.careerMoves(Object.assign({}, none, { early: true }), { century: LAD.century, early_only: LAD.early_only })).sort(), ['century 25 25 true false', 'early_only 5 5 true false']);
  expect('careerMoves, pinned: a session finished in full moves the finished ladders only', 'not early', brief(A_AW.careerMoves(none, { century: LAD.century, early_only: LAD.early_only })), ['century 25 25 true false']);
  expect('careerMoves, pinned: Love Hold needs a session logged in full and checked in, or the byBook the caller knows', 'byBook', [
    brief(A_AW.careerMoves(Object.assign({}, none, { weekCloses: true, fullLog: true, checkin: true }), { love_hold: LAD.love_hold })),
    brief(A_AW.careerMoves(Object.assign({}, none, { weekCloses: true, fullLog: true, checkin: true, byBook: false }), { love_hold: LAD.love_hold })),
    brief(A_AW.careerMoves(Object.assign({}, none, { weekCloses: true, byBook: true }), { love_hold: LAD.love_hold }))],
    [['love_hold 4 5 false true'], [], ['love_hold 4 5 false true']]);
  // Something the cases cannot say: no ladder, no session, an entry on its top tier (next missing) all move nothing.
  expect('careerMoves: no ladder', null, A_AW.careerMoves({ early: false, fullLog: true, checkin: true }, null), { lines: [], more: 0 });
  expect('careerMoves: no session facts', null, A_AW.careerMoves(null, (RW.moves[0] || {}).ladder || {}), { lines: [], more: 0 });
});
run('Career Mode phase 3: the five events\' goals (habits.html EVENTS / career/achievements.toml)', () => {
  const H_EV = sandbox(null, [constSrc(H_SRC, 'EVENTS', 'habits.html')], ['EVENTS']);
  const seed = catalogueSeed();
  if (!seed) bail('could not run   python scripts/career_seed.py --json   (needed to hold habits.html EVENTS to career/achievements.toml)');
  const evs = seed.catalogue.filter(r => r.kind === 'achievement' && r.body && r.body.test === 'goals');
  expect('every event achievement has an EVENTS twin and the other way round', null, evs.map(r => r.body.proof_code).sort(), H_EV.EVENTS.map(e => e.id).sort());
  H_EV.EVENTS.forEach(ev => {
    const row = evs.find(r => r.body.proof_code === ev.id);
    if (!row) return;
    expect('EVENTS goals vs achievements.toml: ' + ev.id, ev.id, ev.goals.map(g => ({ kind: g.kind, need: g.need })), row.body.goals.map(g => ({ kind: g.kind, need: g.need })));
  });
});

/* ── 11. Career Mode: a lift's numbers in its own measure (program.html / supabase/stage72_weight_measures.sql) ─────── */
// A logged weight is in one of three measures, written in its text: a bare number or "60kg" is kilograms, "45 lb" is pounds, "6 plates" is the count on a machine's stack
// (Amir, 2026-10-18: "personal records can be in all measures, and it's only an achievement if you go higher than your previous record in the same measure"). A lift's
// record, win and best are each kept IN ITS OWN MEASURE and never compared with another; nothing is converted. Career Mode's server half copies the maths in SQL
// (career_w(), career_entry_sets(), career_win_gain(), career_derive()), so the cases are held to BOTH:
//   · here, program.html's weightOf(), setsMeasure(), histBestSet(), cycleBestSet() and cycleWins() are run on them and must give the answers below;
//   · scripts/career/rehearse_measures.mjs reads this same table (between the two MEASURE_CASES markers, as JSON) and holds the database to it on PGlite, and also
//     runs thousands of generated logs through both, number by number.
// `entries`: one logged exercise and its row (the measure, the best set's weight w, reps n, RPE r, effort index idx, and the best estimate est; null when no set is logged
// or it is a circuit). `wins`: sessions in date order and what cycleWins() makes of them: `shown` is everything the This cycle card says (key = the lift's key, name|lb
// and name|plates for the other measures, with the sentence), `pays` the subset the server pays (GAME-5: the weight or the reps went up, a hold never), with its gain.
// `weights`: weightOf() on a value ({ n, unit }). After a deliberate change of the app's maths, change the answers here and in the stage72 functions together.
// MEASURE_CASES:begin
const MEASURE_CASES = {
  "weights": [
    {"w":"45","n":45,"u":"kg"},
    {"w":"60kg","n":60,"u":"kg"},
    {"w":"62,5","n":62.5,"u":"kg"},
    {"w":"۲۵","n":25,"u":"kg"},
    {"w":"BW+10","n":10,"u":"kg"},
    {"w":"BW","n":null,"u":"kg"},
    {"w":"","n":null,"u":"kg"},
    {"w":"red band","n":null,"u":"kg"},
    {"w":"0","n":null,"u":"kg"},
    {"w":"2×20","n":20,"u":"kg"},
    {"w":"2x22.5 kg","n":22.5,"u":"kg"},
    {"w":"20x2","n":20,"u":"kg"},
    {"w":"45 lb","n":45,"u":"lb"},
    {"w":"45lb","n":45,"u":"lb"},
    {"w":"135 lbs","n":135,"u":"lb"},
    {"w":"۴۵ lb","n":45,"u":"lb"},
    {"w":"17.5 LB","n":17.5,"u":"lb"},
    {"w":"45 pounds","n":45,"u":"lb"},
    {"w":"1 pound","n":1,"u":"lb"},
    {"w":"2×20 lb","n":20,"u":"lb"},
    {"w":"0 lb","n":null,"u":"kg"},
    {"w":"lb 45","n":45,"u":"kg"},
    {"w":"45 lbx","n":45,"u":"kg"},
    {"w":"6 plates","n":6,"u":"plates"},
    {"w":"1 plate","n":1,"u":"plates"},
    {"w":"6plates","n":6,"u":"plates"},
    {"w":"5 Plates","n":5,"u":"plates"},
    {"w":"10 plateau","n":10,"u":"kg"},
    {"w":"8 plate1","n":8,"u":"plates"},
    {"w":"12,5 lb","n":12.5,"u":"lb"},
    {"w":62.5,"n":62.5,"u":"kg"},
    {"w":0,"n":null,"u":"kg"},
    {"w":null,"n":null,"u":"kg"}
  ],
  "entries": [
    {"name":"kg: 100 x 5 @8","entry":{"ex":"Back Squat","reps":"5","sets":[{"w":"100","n":5,"r":8,"d":true}]},"want":{"u":"kg","w":100,"n":5,"r":8,"idx":123.33333333333334,"est":122.5}},
    {"name":"kg: a bare number and \"60kg\" are kilograms","entry":{"ex":"Bench Press","reps":"5","sets":[{"w":"60kg","n":5,"r":8,"d":true},{"w":"62.5","n":5,"r":8,"d":true}]},"want":{"u":"kg","w":62.5,"n":5,"r":8,"idx":77.08333333333334,"est":77.5}},
    {"name":"lb: 135 lb x 5 @8","entry":{"ex":"Back Squat","reps":"5","sets":[{"w":"135 lb","n":5,"r":8,"d":true}]},"want":{"u":"lb","w":135,"n":5,"r":8,"idx":166.5,"est":165}},
    {"name":"lb: Persian digits and \"lbs\"","entry":{"ex":"Back Squat","reps":"5","sets":[{"w":"۱۳۵ lbs","n":5,"r":8,"d":true}]},"want":{"u":"lb","w":135,"n":5,"r":8,"idx":166.5,"est":165}},
    {"name":"plates: 6 plates x 10 @8 (12 effective reps: no estimate)","entry":{"ex":"Leg Press Machine","reps":"10","sets":[{"w":"6 plates","n":10,"r":8,"d":true}]},"want":{"u":"plates","w":6,"n":10,"r":8,"idx":8.399999999999999,"est":null}},
    {"name":"plates: 9 plates x 5 @9 (an estimate, to half a plate)","entry":{"ex":"Leg Press Machine","reps":"5","sets":[{"w":"9 plates","n":5,"r":9,"d":true}]},"want":{"u":"plates","w":9,"n":5,"r":9,"idx":10.799999999999999,"est":11}},
    {"name":"plates: one plate is \"plate\"","entry":{"ex":"Leg Press Machine","reps":"8","sets":[{"w":"1 plate","n":8,"r":8,"d":true}]},"want":{"u":"plates","w":1,"n":8,"r":8,"idx":1.3333333333333333,"est":1.5}},
    {"name":"mixed, kg first: the pound set is left out","entry":{"ex":"Row","reps":"8","sets":[{"w":"60","n":8,"r":8,"d":true},{"w":"300 lb","n":8,"r":9,"d":true}]},"want":{"u":"kg","w":60,"n":8,"r":8,"idx":80,"est":80}},
    {"name":"mixed, lb first: the kilogram set is left out","entry":{"ex":"Row","reps":"8","sets":[{"w":"135 lb","n":8,"r":8,"d":true},{"w":"200","n":8,"r":9,"d":true}]},"want":{"u":"lb","w":135,"n":8,"r":8,"idx":180,"est":180}},
    {"name":"mixed, plates first: the pound set is left out","entry":{"ex":"Row","reps":"8","sets":[{"w":"7 plates","n":8,"r":8,"d":true},{"w":"300 lb","n":8,"r":9,"d":true}]},"want":{"u":"plates","w":7,"n":8,"r":8,"idx":9.333333333333332,"est":9.5}},
    {"name":"the first logged set has no weight: the measure is the first weight","entry":{"ex":"Row","reps":"8","sets":[{"w":"","n":8,"r":7,"d":true},{"w":"45 lb","n":8,"r":8,"d":true}]},"want":{"u":"lb","w":45,"n":8,"r":8,"idx":60,"est":60}},
    {"name":"a tick alone is a logged set; a \"0 lb\" weight is no weight","entry":{"ex":"Row","reps":"8","sets":[{"w":"0 lb","n":8,"r":"","d":true},{"w":"80","n":8,"r":8,"d":true}]},"want":{"u":"kg","w":80,"n":8,"r":8,"idx":106.66666666666666,"est":107.5}},
    {"name":"bodyweight: no weight, kilograms by default","entry":{"ex":"Push-Up","reps":"10","sets":[{"w":"","n":10,"r":7,"d":true}]},"want":{"u":"kg","w":null,"n":10,"r":7,"idx":13,"est":null}},
    {"name":"\"BW+10\" is 10 kg; a pair \"2×20 lb\" is one 20 lb dumbbell","entry":{"ex":"Chin-Up","reps":"6","sets":[{"w":"BW+10","n":6,"r":8,"d":true}]},"want":{"u":"kg","w":10,"n":6,"r":8,"idx":12.666666666666666,"est":12.5}},
    {"name":"a pair in pounds","entry":{"ex":"DB Press","reps":"8","sets":[{"w":"2×20 lb","n":8,"r":8,"d":true}]},"want":{"u":"lb","w":20,"n":8,"r":8,"idx":26.666666666666664,"est":25}},
    {"name":"a hold: no reps, only the RPE","entry":{"ex":"Plank","sets":[{"w":"","n":null,"r":6,"d":true}]},"want":{"u":"kg","w":null,"n":null,"r":6,"idx":null,"est":null}},
    {"name":"no logged set: no row","entry":{"ex":"Row","reps":"8","sets":[{"w":"","n":8,"r":"","d":false}]},"want":null},
    {"name":"a circuit is not read","entry":{"ex":"Circuit A","circuit":true,"reps":"8","sets":[{"w":"20","n":8,"r":8,"d":true}]},"want":null},
    {"name":"the best set wins by the index: 3 heavy reps over 8 light ones, in pounds","entry":{"ex":"Deadlift","reps":"5","sets":[{"w":"225 lb","n":8,"r":8,"d":true},{"w":"315 lb","n":3,"r":9,"d":true}]},"want":{"u":"lb","w":315,"n":3,"r":9,"idx":357,"est":355}},
    {"name":"an estimate rounds to 5 lb: 95 lb x 5 @8","entry":{"ex":"Press","reps":"5","sets":[{"w":"95 lb","n":5,"r":8,"d":true}]},"want":{"u":"lb","w":95,"n":5,"r":8,"idx":117.16666666666667,"est":115}}
  ],
  "wins": [
    {"name":"lb: 135 to 145 lb at the same reps and RPE is a win in pounds","sessions":[{"date":"2026-09-01","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"135 lb","n":5,"r":8,"d":true},{"w":"135 lb","n":5,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"145 lb","n":5,"r":8,"d":true},{"w":"145 lb","n":5,"r":8,"d":true}]}]}],"shown":[{"key":"bench press|lb","txt":"+10 lb, same reps, same RPE"}],"pays":[{"key":"bench press|lb","name":"Bench Press","gain":0.0741}]},
    {"name":"plates: 6 to 7 plates is a win in plates","sessions":[{"date":"2026-09-01","entries":[{"ex":"Leg Press Machine","reps":"10","sets":[{"w":"6 plates","n":10,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Leg Press Machine","reps":"10","sets":[{"w":"7 plates","n":10,"r":8,"d":true}]}]}],"shown":[{"key":"leg press machine|plates","txt":"+1 plate, same reps, same RPE"}],"pays":[{"key":"leg press machine|plates","name":"Leg Press Machine","gain":0.1667}]},
    {"name":"kg history then pounds: only the pound series wins","sessions":[{"date":"2026-09-01","entries":[{"ex":"Back Squat","reps":"5","sets":[{"w":"100","n":5,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Back Squat","reps":"5","sets":[{"w":"100","n":5,"r":8,"d":true}]}]},{"date":"2026-09-15","entries":[{"ex":"Back Squat","reps":"5","sets":[{"w":"135 lb","n":5,"r":8,"d":true}]}]},{"date":"2026-09-22","entries":[{"ex":"Back Squat","reps":"5","sets":[{"w":"145 lb","n":5,"r":8,"d":true}]}]}],"shown":[{"key":"back squat|lb","txt":"+10 lb, same reps, same RPE"}],"pays":[{"key":"back squat|lb","name":"Back Squat","gain":0.0741}]},
    {"name":"switching from 60 kg to 135 lb is no win (they are never compared)","sessions":[{"date":"2026-09-01","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"60","n":5,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"135 lb","n":5,"r":8,"d":true}]}]}],"shown":[],"pays":[]},
    {"name":"switching from 135 lb back to 62 kg is no win either","sessions":[{"date":"2026-09-01","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"135 lb","n":5,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"62","n":5,"r":8,"d":true}]}]}],"shown":[],"pays":[]},
    {"name":"a pound set inside a kilogram exercise is left out of the win","sessions":[{"date":"2026-09-01","entries":[{"ex":"Row","reps":"8","sets":[{"w":"50","n":8,"r":8,"d":true},{"w":"300 lb","n":8,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Row","reps":"8","sets":[{"w":"55","n":8,"r":8,"d":true},{"w":"300 lb","n":8,"r":8,"d":true}]}]}],"shown":[{"key":"row","txt":"+5 kg, same reps, same RPE"}],"pays":[{"key":"row","name":"Row","gain":0.1}]},
    {"name":"more reps at the same weight, in pounds","sessions":[{"date":"2026-09-01","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"135 lb","n":5,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"135 lb","n":6,"r":8,"d":true}]}]}],"shown":[{"key":"bench press|lb","txt":"+1 rep at 135 lb, same RPE"}],"pays":[{"key":"bench press|lb","name":"Bench Press","gain":0.027}]},
    {"name":"felt easier only (same weight, same reps, lower RPE): the app shows it, the server pays nothing","sessions":[{"date":"2026-09-01","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"135 lb","n":5,"r":9,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"135 lb","n":5,"r":7,"d":true}]}]}],"shown":[{"key":"bench press|lb","txt":"135 lb × 5 felt easier: RPE 9 → 7"}],"pays":[]},
    {"name":"felt easier only, in plates","sessions":[{"date":"2026-09-01","entries":[{"ex":"Leg Press Machine","reps":"10","sets":[{"w":"7 plates","n":10,"r":9,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Leg Press Machine","reps":"10","sets":[{"w":"7 plates","n":10,"r":7,"d":true}]}]}],"shown":[{"key":"leg press machine|plates","txt":"7 plates × 10 felt easier: RPE 9 → 7"}],"pays":[]},
    {"name":"bodyweight reps (no weight at all): a win in the plain key","sessions":[{"date":"2026-09-01","entries":[{"ex":"Push-Up","reps":"8","sets":[{"w":"","n":8,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Push-Up","reps":"8","sets":[{"w":"","n":10,"r":8,"d":true}]}]}],"shown":[{"key":"push-up","txt":"+2 reps, same RPE"}],"pays":[{"key":"push-up","name":"Push-Up","gain":0.2}]},
    {"name":"unloaded first, loaded later: two series, no win","sessions":[{"date":"2026-09-01","entries":[{"ex":"Split Squat","reps":"8","sets":[{"w":"","n":8,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Split Squat","reps":"8","sets":[{"w":"45 lb","n":8,"r":8,"d":true}]}]}],"shown":[],"pays":[]},
    {"name":"a hold: only its RPE moves, nothing to pay","sessions":[{"date":"2026-09-01","entries":[{"ex":"Plank","sets":[{"w":"","n":null,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Plank","sets":[{"w":"","n":null,"r":6,"d":true}]}]}],"shown":[{"key":"plank","txt":"felt easier: RPE 8 → 6"}],"pays":[]},
    {"name":"a fifth of a pound is no gain in weight, but one more rep at it is a win (pounds)","sessions":[{"date":"2026-09-01","entries":[{"ex":"DB Curl","reps":"8","sets":[{"w":"20 lb","n":8,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"DB Curl","reps":"8","sets":[{"w":"20.2 lb","n":9,"r":8,"d":true}]}]}],"shown":[{"key":"db curl|lb","txt":"+1 rep at 20 lb, same RPE"}],"pays":[{"key":"db curl|lb","name":"DB Curl","gain":0.0353}]},
    {"name":"best since the first, not the last: a back-off week does not take the win away (pounds)","sessions":[{"date":"2026-09-01","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"135 lb","n":5,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"150 lb","n":5,"r":8,"d":true}]}]},{"date":"2026-09-15","entries":[{"ex":"Bench Press","reps":"5","sets":[{"w":"120 lb","n":5,"r":8,"d":true}]}]}],"shown":[{"key":"bench press|lb","txt":"+15 lb, same reps, same RPE"}],"pays":[{"key":"bench press|lb","name":"Bench Press","gain":0.1111}]},
    {"name":"three lifts, three measures, three wins","sessions":[{"date":"2026-09-01","entries":[{"ex":"Back Squat","reps":"5","sets":[{"w":"100","n":5,"r":8,"d":true}]},{"ex":"Bench Press","reps":"5","sets":[{"w":"135 lb","n":5,"r":8,"d":true}]},{"ex":"Leg Press Machine","reps":"10","sets":[{"w":"6 plates","n":10,"r":8,"d":true}]}]},{"date":"2026-09-08","entries":[{"ex":"Back Squat","reps":"5","sets":[{"w":"105","n":5,"r":8,"d":true}]},{"ex":"Bench Press","reps":"5","sets":[{"w":"145 lb","n":5,"r":8,"d":true}]},{"ex":"Leg Press Machine","reps":"10","sets":[{"w":"7 plates","n":10,"r":8,"d":true}]}]}],"shown":[{"key":"leg press machine|plates","txt":"+1 plate, same reps, same RPE"},{"key":"bench press|lb","txt":"+10 lb, same reps, same RPE"},{"key":"back squat","txt":"+5 kg, same reps, same RPE"}],"pays":[{"key":"leg press machine|plates","name":"Leg Press Machine","gain":0.1667},{"key":"bench press|lb","name":"Bench Press","gain":0.0741},{"key":"back squat","name":"Back Squat","gain":0.05}]}
  ]
};
// MEASURE_CASES:end
const A_MEAS = sandbox('var HIST_ALIAS = {};', [lineSrc(A_SRC, 'const ONE_RM_MAX_EFFECTIVE =', 'program.html'), lineSrc(A_SRC, 'const ONE_RM_ROUND_KG', 'program.html'), lineSrc(A_SRC, 'const ONE_RM_ROUND ', 'program.html')]
  .concat(fromA('normDigits', 'weightOf', 'unitWord', 'uKey', 'uStore', 'uWord', 'histNorm', 'histSetLogged', 'setsMeasure', 'estimateOneRM', 'histBestSet', 'cycleSetOf', 'cycleBestSet', 'winText'))
  // cycleWins() shows three wins; the cases ask for all of them, so its limit is lifted in this copy (and the copy must differ from the app's, or the limit has moved)
  .concat([(() => { const s = fnSrc(A_SRC, 'cycleWins', 'program.html'); if (!s.includes('.slice(0, 3)')) bail('program.html: cycleWins() no longer ends in .slice(0, 3). Update scripts/check_twins.js (section 11).'); return s.replace('.slice(0, 3)', '.slice(0, 99)'); })()]),
  ['weightOf', 'setsMeasure', 'histBestSet', 'cycleBestSet', 'winText', 'cycleWins', 'estimateOneRM', 'histNorm']);
run('Career Mode: a lift in its own measure (program.html weightOf, setsMeasure, histBestSet, cycleBestSet, cycleWins / career_w, career_entry_sets, career_win_gain)', () => {
  const near = (a, b) => (a == null || b == null) ? a === b : Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));
  MEASURE_CASES.weights.forEach(c => expect('weightOf: ' + J(c.w), c.w, A_MEAS.weightOf(c.w), { n: c.n, unit: c.u }));
  MEASURE_CASES.entries.forEach(c => {
    const e = c.entry, cb = (!e.circuit && e.ex) ? A_MEAS.cycleBestSet(e) : null, hb = cb ? A_MEAS.histBestSet(e) : null;
    const got = cb ? { u: cb.u, w: cb.w, n: cb.n, r: cb.r, idx: cb.idx, est: hb ? hb.est : null } : null, w = c.want;
    checks++;
    if (!(got == null || w == null ? got === w : got.u === w.u && near(got.w, w.w) && near(got.n, w.n) && near(got.r, w.r) && near(got.idx, w.idx) && near(got.est, w.est)))
      failures.push(`the measure of an exercise: ${c.name}\n    input    ${J(e)}\n    got      ${J(got)}\n    want     ${J(w)}`);
    if (cb) {      // the measure is the same word everywhere: setsMeasure(), the best set's, the estimate's (uStore: kg is '')
      expect('setsMeasure: ' + c.name, e.sets, [A_MEAS.setsMeasure(e.sets), hb ? (hb.u || 'kg') : cb.u], [cb.u, cb.u]);
    }
  });
  const key = w => A_MEAS.histNorm(w.name) + (w.a.u === 'kg' ? '' : '|' + w.a.u);
  // what the server pays of a win (GAME-5, 2026-10-17): both sets counted, and the weight (to the half unit, winText()'s round) or the reps went up
  const pays = w => w.a.n != null && w.b.n != null && ((w.a.w != null && w.b.w != null && Math.round((w.b.w - w.a.w) * 2) / 2 > 0) || w.b.n > w.a.n);
  MEASURE_CASES.wins.forEach(c => {
    const all = A_MEAS.cycleWins(c.sessions);
    expect('what the This cycle card shows: ' + c.name, c.sessions.map(s => s.date), all.map(w => ({ key: key(w), txt: w.txt })), c.shown);
    expect('what the server pays: ' + c.name, c.sessions.map(s => s.date), all.filter(pays).map(w => ({ key: key(w), name: w.name, gain: Math.round(w.gain * 1e4) / 1e4 })), c.pays);
  });
  // Pinned by hand: the estimate rounds to the measure's own step (2.5 kg, 5 lb, half a plate), and two measures are never one win.
  expect('estimateOneRM: 100 x 5 @8 in kg, lb and plates', null, [A_MEAS.estimateOneRM(100, 5, 8), A_MEAS.estimateOneRM(100, 5, 8, 'kg'), A_MEAS.estimateOneRM(100, 5, 8, 'lb'), A_MEAS.estimateOneRM(100, 5, 8, 'plates')], [122.5, 122.5, 125, 123.5]);
  const a = { w: 100, n: 5, r: 8, idx: 123.3, u: 'kg' }, b = { w: 225, n: 5, r: 8, idx: 277.5, u: 'lb' };
  expect('winText: a kilogram set and a pound set are never a win, whatever their numbers', null, [A_MEAS.winText(a, b), A_MEAS.winText(b, a)], [null, null]);
  expect('winText: the same two pound sets are', null, A_MEAS.winText(Object.assign({}, b, { w: 205, idx: 252.8 }), b).txt, '+20 lb, same reps, same RPE');
});

/* ── report ───────────────────────────────────────────────────────────────── */
if (failures.length || chipsFailures.length) {
  console.error('\ncheck_twins: ' + (failures.length + chipsFailures.length) + ' problem' + (failures.length + chipsFailures.length === 1 ? '' : 's') + ' (of ' + checks + ' checks):\n');
  failures.slice(0, 40).forEach(f => console.error('  ✗ ' + f + '\n'));
  if (failures.length > 40) console.error('  … and ' + (failures.length - 40) + ' more\n');
  chipsFailures.forEach(f => console.error('  ✗ ' + f + '\n'));
  if (failures.length) console.error('coach.html and program.html hold one rule in two copies. Change BOTH (or, if the difference is intended, say so in this script\'s header).');
  process.exit(1);
}
console.log('check_twins: all ' + checks + ' checks agree.');
