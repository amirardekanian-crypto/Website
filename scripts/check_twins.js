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
     dayRpe                      / rpeTarget + dayTargetC         today's RPE target on a lower day (REC-2), with the week note
     cycleWeekInfo, weekNoteNow  / cycleWeekOnC, weekNoteOnC      the week a day falls in and the cycle's note for it (the app asks about today,
                                                                  the dashboard about the day a session was trained)
     sessionIsStale              / sessionIsStaleC                is a started session over (the live app snapshot's "in progress", TWIN-6)
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
// The week arithmetic below is compared in UTC. The app reads a cycle's date as a UTC midnight and the clock in local time (a known
// difference west of Greenwich and on a clock-change day, item C2 of the audit's section 12); the dashboard counts calendar days.
process.env.TZ = 'UTC';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto'), cp = require('child_process');

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
const A_SRC = read('program.html'), D_SRC = read('coach.html');
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

/* ── 4. today's RPE target on a lower day (REC-2), with the week note ─────── */
const A_RPE = sandbox(null, [lineSrc(A_SRC, 'const READY_BASE_N', 'program.html')].concat(fromA('dayRpe')), ['dayRpe']);
const D_RPE = sandbox(null, fromD('rpeTarget', 'dayTargetC'), ['rpeTarget', 'dayTargetC']);
const WRITTEN = ['8', 8, '7-8', '7–8', '7 - 8', '6', 6, '6-7', '5', '5-6', '9', '10', '8.5', '7.5-8', '@8', '9-10', '', null, undefined, 'easy', '7-9', '6.5', '10-10'];
// A week note can lower the target further on a lower day (the lower of the two wins, never under 6); a note alone changes nothing.
const NOTES = [null, { text: 'n' }, { text: 'n', rpeCap: 7 }, { text: 'n', rpeCap: 6 }, { text: 'n', rpeCap: 5 }, { text: 'n', rpeCap: 9 }, { text: 'n', rpeDrop: 1 },
  { text: 'n', rpeDrop: 2 }, { text: 'n', rpeDrop: 0 }, { text: 'n', rpeCap: 7, rpeDrop: 1 }, { text: 'n', setsDrop: 1 }, { text: 'n', rpeCap: '7' }, { text: 'n', rpeCap: 'x' }];
run('lower-day RPE target (dayRpe), with and without a week note', () => WRITTEN.forEach(w => [0, 1, 2].forEach(drop => NOTES.forEach(note => {
  const t = D_RPE.rpeTarget(w), r = D_RPE.dayTargetC(t, drop, note);
  same('dayRpe vs dayTargetC', { written: w, drop, note }, A_RPE.dayRpe(w, drop, note), r && r.written !== undefined ? r.label : '');
}))));

/* ── 4b. the week a day falls in, and the note for it (WORK-11) ────────────── */
// The app reads the clock (cycleWeekInfo / weekNoteNow ask about TODAY); the dashboard is told the day (cycleWeekOnC / weekNoteOnC: the day a
// session was trained). So the app's two functions run in a sandbox whose clock is set to each day in turn.
const D_WEEK = sandbox(null, fromD('dayNumC', 'cycleWeekOnC', 'weekNoteOnC'), ['cycleWeekOnC', 'weekNoteOnC']);
function appWeekAt(dayIso) {
  const noon = new Date(dayIso + 'T12:00:00Z').getTime();
  const Fixed = class extends Date { constructor(...a) { if (a.length) super(...a); else super(noon); } static now() { return noon; } };
  const ctx = vm.createContext({ console, Date: Fixed });
  vm.runInContext(fromA('cycleWeekInfo', 'weekNoteNow').join('\n'), ctx);
  return { info: vm.runInContext('cycleWeekInfo', ctx), note: vm.runInContext('weekNoteNow', ctx) };
}
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
  null, undefined, {}];
const WEEK_DAYS = []; for (let n = -4; n <= 46; n++) WEEK_DAYS.push(new Date(Date.UTC(2026, 7, 29 + n)).toISOString().slice(0, 10));
// The dashboard returns { wk } on a note; the app also returns its `key` ('first' | 'last' | 'week'), which the dashboard does not need.
const noteView = n => n && { text: n.text, title: n.title, setsDrop: n.setsDrop, rpeDrop: n.rpeDrop, rpeCap: n.rpeCap, wk: n.wk };
run('week of a day and its note (cycleWeekInfo / weekNoteNow)', () => WEEK_DAYS.forEach(day => {
  const app = appWeekAt(day);
  WEEK_CYCLES.forEach(c => {
    same('cycleWeekInfo vs cycleWeekOnC', { cycle: c, day }, app.info(c), D_WEEK.cycleWeekOnC(c, day));
    same('weekNoteNow vs weekNoteOnC', { cycle: c, day }, noteView(app.note(c)), noteView(D_WEEK.weekNoteOnC(c, day)));
  });
}));

/* ── 4c. is a started session over? (TWIN-6) ───────────────────────────────── */
// "On another calendar day AND more than six hours old". Run on two clocks: mid-afternoon, and just after midnight, where a session
// started at 23:30 is only 2.5 hours old and must still be live.
const D_STALE = sandbox(null, [lineSrc(D_SRC, 'const SESSION_GRACE_MS_C =', 'coach.html')].concat(fromD('sessionIsStaleC')), ['sessionIsStaleC']);
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

/* ── report ───────────────────────────────────────────────────────────────── */
if (failures.length || chipsFailures.length) {
  console.error('\ncheck_twins: ' + (failures.length + chipsFailures.length) + ' problem' + (failures.length + chipsFailures.length === 1 ? '' : 's') + ' (of ' + checks + ' checks):\n');
  failures.slice(0, 12).forEach(f => console.error('  ✗ ' + f + '\n'));
  if (failures.length > 12) console.error('  … and ' + (failures.length - 12) + ' more\n');
  chipsFailures.forEach(f => console.error('  ✗ ' + f + '\n'));
  if (failures.length) console.error('coach.html and program.html hold one rule in two copies. Change BOTH (or, if the difference is intended, say so in this script\'s header).');
  process.exit(1);
}
console.log('check_twins: all ' + checks + ' checks agree.');
