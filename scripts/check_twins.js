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
     exNameVariants            / exNameVariantsC      the four name tiers every exercise lookup uses
     ceilAliasMap (matchRenamed)/ ceilAliasMapC       a renamed lift is one lift
     setSpine + spineFor       / spineIndexC + spineForC   a card finds its Spine entry
     dayRpe                    / rpeTarget + dayTargetC    today's RPE target on a lower day (REC-2)
     qmSets, isPrepBlockTitle  / qmSetsC, QM_PREP     what the Quality check counts
     readinessPlanLine, readinessPlan / parseCheckinPlan, parseSessionEmail
                               the WRITER of the check-in line and its READER (the email import)
     assets/js/chips.js        coach.html's ?v= must change when the file does (TWIN-4)

   Already guarded elsewhere (not repeated): rxOf/repCount/tempoDisplay (check_rx.js), the set-log grammar
   (check_setlog.js), the shared word lists (check_parity.py), the XP rules (check_xp_rules.py).

   Known, deliberate differences (printed as notes, never failures):
     WORK-11  dayTargetC() has no week-note input: a session does not record which week it was.
     TWIN-1   the dashboard resolves a card against ALL Spine entries, the phone against approved ones.
     TWIN-6   the dashboard's "leftover session" window (30 h) is not sessionIsStale().
     TWIN-7   the retest flag is read more loosely by the dashboard than by exTestSpec().

   Wired into .githooks/pre-commit (guard 15). Run by hand:   node scripts/check_twins.js
   After editing assets/js/chips.js: bump ?v= in coach.html, then:   node scripts/check_twins.js --stamp
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');

// CHECK_TWINS_ROOT points the guard at another copy of the files (scripts/test_check_twins.js breaks one on purpose).
const ROOT = process.env.CHECK_TWINS_ROOT || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const A_SRC = read('program.html'), D_SRC = read('coach.html');
const STAMP_FILE = path.join(ROOT, 'scripts', 'twins_stamp.json');

let checks = 0, failures = [];
function bail(msg) { console.error('check_twins: ' + msg); process.exit(2); }

/* ── cutting code out of an HTML file ─────────────────────────────────────── */
// A top-level function in these files closes with "}" in column 0. A "}" in column 0 can also sit
// inside a template literal, so the first candidate that compiles is the end.
function fnSrc(src, name, file) {
  const m = new RegExp('^function ' + name + '\\(', 'm').exec(src);
  if (!m) bail(`${file}: could not find function ${name}(). Was it renamed or moved? Update scripts/check_twins.js with it.`);
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
  if (J(a) !== J(d)) failures.push(`${label}\n    input      ${J(input)}\n    program.html  ${J(a)}\n    coach.html    ${J(d)}`);
}
function expect(label, input, got, want) {
  checks++;
  if (J(got) !== J(want)) failures.push(`${label}\n    input    ${J(input)}\n    got      ${J(got)}\n    want     ${J(want)}`);
}
const section = (name, n0) => console.log(`  ${failures.length === section.f ? 'ok  ' : 'FAIL'} ${name}  (${checks - n0} checks)`);
section.f = 0;
function run(name, fn) { const n0 = checks; section.f = failures.length; fn(); section(name, n0); }

/* ── 1. the four name tiers ───────────────────────────────────────────────── */
const NAMES = ['Goblet Squat', 'goblet squat', 'DB Bench Press', 'Dumbbell Bench Press', 'Machine Leg Press', 'Leg Press Machine',
  'Leg Press (Machine)', 'Cossack Squat (Bodyweight)', 'Cossack Squat', "Farmer's Carry", 'Farmer’s Carry', 'Farmers Carry',
  'Pallof Press – Half Kneeling', 'Single-Leg RDL', 'Single Leg RDL', 'KB Swing', 'BB Back Squat', 'Barbell Back Squat', 'Café Squat',
  '  extra   spaces  ', '', null, undefined, 'تمرین اسکوات', 'A1: Squat', '3/4 Squat',
  'Bulgarian Split Squat (DB)', 'Bulgarian Split Squat (Dumbbell)', 'DB/KB Complex', 'Landmine Press (Half-Kneeling)', 'Hip Thrust - Banded',
  'Nordic Hamstring Curl', 'SKI ERG', 'Push-Up', 'Push Up', 'Pushup', 'Türkish Get-Up', "Copenhagen Plank (Long Lever)"];
const A_NAMES = sandbox(null, [lineSrc(A_SRC, 'const EX_ABBREV =', 'program.html')].concat(fromA('normExName', 'exNameVariants', 'indexExNames', 'matchRenamed')),
  ['exNameVariants', 'matchRenamed']);
const D_NAMES = sandbox(null, [lineSrc(D_SRC, 'const EX_ABBREV_C =', 'coach.html')].concat(fromD('normExNameC', 'exNameVariantsC', 'ceilAliasMapC')),
  ['exNameVariantsC', 'ceilAliasMapC']);
run('exercise name tiers', () => NAMES.forEach(n => same('exNameVariants vs exNameVariantsC', n, A_NAMES.exNameVariants(n), D_NAMES.exNameVariantsC(n))));

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
];
run('renamed lifts (ceilAliasMap)', () => ALIAS_CASES.forEach(c => {
  vm.runInContext('__cur = ' + J(c.current) + '; __entries = ' + J(c.lifts.map(l => ({ lift: l }))) + ';', A_ALIAS.ctx);
  same('ceilAliasMap vs ceilAliasMapC', c, A_ALIAS.ceilAliasMap(), D_NAMES.ceilAliasMapC(c.lifts.map(l => ({ lift: l })), c.current));
}));

/* ── 3. a card finds its Spine entry ──────────────────────────────────────── */
const A_SPINE = sandbox('var SPINE = null, SPINE_BY_ID = {}, SPINE_IDX = [{}, {}, {}, {}];',
  [lineSrc(A_SRC, 'const EX_ABBREV =', 'program.html')].concat(fromA('normExName', 'exNameVariants', 'setSpine', 'spineFor')), ['setSpine', 'spineFor']);
const D_SPINE = sandbox(null, [lineSrc(D_SRC, 'const EX_ABBREV_C =', 'coach.html')].concat(fromD('normExNameC', 'exNameVariantsC', 'spineIndexC', 'spineForC')),
  ['spineIndexC', 'spineForC']);
const SPINE = [
  { id: 'goblet-squat', name: 'Goblet Squat', aliases: ['Dumbbell Goblet Squat'] },
  { id: 'machine-leg-press', name: 'Machine Leg Press', aliases: [] },
  { id: 'leg-press', name: 'Leg Press', aliases: [] },
  { id: 'db-bench', name: 'Dumbbell Bench Press', aliases: ['DB Bench'] },
  { id: 'cossack', name: 'Cossack Squat', aliases: [] },
  { id: 'cossack-bw', name: 'Cossack Squat (Bodyweight)', aliases: [] },
  { id: 'farmers-carry', name: "Farmer's Carry", aliases: [] },
  { id: 'push-up', name: 'Push-Up', aliases: ['Pushup'] },
];
const LOOKUPS = [['Goblet Squat', ''], ['goblet squat', ''], ['Dumbbell Goblet Squat', ''], ['DB Goblet Squat', ''], ['Machine Leg Press', ''],
  ['Leg Press Machine', ''], ['Leg Press', ''], ['Leg Press (Machine)', ''], ['Cossack Squat (Bodyweight)', ''], ['Cossack Squat', ''],
  ['Cossack Squat (Light)', ''], ['Farmers Carry', ''], ['DB Bench Press', ''], ['Dumbbell Bench', ''], ['Push Up', ''], ['Pushup', ''], ['Unknown Lift', ''],
  ['', ''], [null, null], [undefined, undefined], ['Goblet Squat', 'machine-leg-press'], ['Goblet Squat', 'nonexistent'], ['xxx', 'db-bench'], ['', 'cossack']];
run('Spine lookup (spineFor)', () => {
  A_SPINE.setSpine(SPINE);
  const byId = {}; SPINE.forEach(e => { byId[e.id] = e; });
  const idx = D_SPINE.spineIndexC(SPINE);
  LOOKUPS.forEach(([name, exId]) => {
    const a = A_SPINE.spineFor(name, exId), d = D_SPINE.spineForC(idx, name, exId, byId);
    same('spineFor vs spineForC', { name, exId }, a ? a.id : null, d);
  });
  // The phone has no Spine until it loads: it answers null, never throws.
  expect('spineFor before the Spine loads', 'SPINE = null', vm.runInContext('SPINE = null; spineFor("Goblet Squat", "")', A_SPINE.ctx), null);
});

/* ── 4. today's RPE target on a lower day (REC-2) ─────────────────────────── */
const A_RPE = sandbox(null, [lineSrc(A_SRC, 'const READY_BASE_N', 'program.html')].concat(fromA('dayRpe')), ['dayRpe']);
const D_RPE = sandbox(null, fromD('rpeTarget', 'dayTargetC'), ['rpeTarget', 'dayTargetC']);
const WRITTEN = ['8', 8, '7-8', '7–8', '7 - 8', '6', 6, '6-7', '5', '5-6', '9', '10', '8.5', '7.5-8', '@8', '9-10', '', null, undefined, 'easy', '7-9', '6.5', '10-10'];
run('lower-day RPE target (dayRpe)', () => WRITTEN.forEach(w => [0, 1, 2].forEach(drop => {
  const t = D_RPE.rpeTarget(w), r = D_RPE.dayTargetC(t, drop);
  same('dayRpe vs dayTargetC', { written: w, drop }, A_RPE.dayRpe(w, drop, null), r && r.written !== undefined ? r.label : '');
})));

/* ── 5. what the Quality check counts ─────────────────────────────────────── */
const A_QM = sandbox(null, fromA('qmSets', 'isPrepBlockTitle'), ['qmSets', 'isPrepBlockTitle']);
const D_QM = sandbox(null, [lineSrc(D_SRC, 'const QM_PREP =', 'coach.html')].concat(fromD('qmSetsC')), ['qmSetsC', 'QM_PREP']);
const RXS = [{ sets: 3 }, { sets: '4' }, {}, { time: '30:00' }, { time: '30 min' }, { time: '90 s' }, { time: '10' }, { time: '5' }, { time: '0' },
  { dose: { kind: 'time', value: '20 min' } }, { dose: { kind: 'reps', value: '8' } }, { time: 'abc' }, null, undefined, { sets: 'x', time: '12 min' },
  { time: '1:30' }, { time: '2.5 min' }, { sets: 0, time: '45 min' }, { time: '60 sec' }, { time: '2 minutes' }];
const TITLES = ['Warm-Up', 'Warmup', 'WARM UP', 'Prime', 'Activation & Prep', 'Dynamic Mobility', 'Cooldown', 'Cool-down', 'Primary', 'Strength', 'Power',
  'Core', 'Plyometrics', 'Accessory', 'Conditioning Circuit', 'Shoulder Prep', 'PREPARATION', '', null, undefined, 'Speed & Agility', 'Finisher'];
run('Quality check (sets, prep blocks)', () => {
  RXS.forEach(rx => same('qmSets vs qmSetsC', rx, A_QM.qmSets(rx), D_QM.qmSetsC(rx)));
  TITLES.forEach(t => same('isPrepBlockTitle vs QM_PREP', t, A_QM.isPrepBlockTitle(t), D_QM.QM_PREP.test(t || '')));
});

/* ── 6. the check-in line: the writer and its reader ──────────────────────── */
// program.html writes "Today: lower day (...) · sore: ..." (readinessPlanLine) and coach.html's email import reads it
// back (parseCheckinPlan). Reword one and the other silently stops matching.
const A_RD = sandbox(null, ['READY_AMBER_S', 'READY_FOUR', 'READY_BASE_N'].map(s => lineSrc(A_SRC, 'const ' + s, 'program.html'))
  .concat(fromA('readinessS', 'readinessPlan', 'readinessPlanLine')), ['readinessS', 'readinessPlan', 'readinessPlanLine']);
const D_RD = sandbox(null, fromD('planLabelC', 'parseCheckinPlan', 'parseSessionEmail'), ['planLabelC', 'parseCheckinPlan', 'parseSessionEmail']);
run('check-in line round trip', () => {
  ['red', 'amber', 'green'].forEach(level => ['', 'half', 'skip'].forEach(sore => [false, true].forEach(asWritten => {
    const r = { level, sore, asWritten }, line = A_RD.readinessPlanLine(r);
    const want = line ? { level, sore, drop: level === 'green' ? 0 : 1, asWritten } : null;
    const field = 'Composite 3.5/5 · Sleep 3 · Energy 4 · Soreness 2 · Stress 4 · Overall 3' + (line ? ' · ' + line.replace(/^Today: /, '') : '');
    expect('readinessPlanLine -> parseCheckinPlan (the Today line)', r, D_RD.parseCheckinPlan(line), want);
    expect('readinessPlanLine -> parseCheckinPlan (the Readiness field)', r, D_RD.parseCheckinPlan(field), want);
    expect('...wrapped by a mail client', r, D_RD.parseCheckinPlan(field.replace(/ · /g, ' ·\n').replace(/ (RPE|jumps|landings|as) /g, ' $1\n')), want);
  })));
  // The whole email, over a grid of check-in answers: the verdict AND the score must come back as the app stored them.
  let seed = 7;
  const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return 1 + (seed % n); };
  for (let i = 0; i < 300; i++) {
    const ans = { sleep: rnd(5), energy: rnd(5), soreness: rnd(5), stress: rnd(5), overall: rnd(5) };
    const base = i % 3 === 0 ? null : 2 + (rnd(30) / 10);
    const plan = A_RD.readinessPlan(ans, base);
    const line = A_RD.readinessPlanLine(Object.assign({}, plan, { asWritten: i % 7 === 0 }));
    const email = ['Day 1 — Test', 'Status: Complete', 'Session RPE: 7/10', 'Readiness',
      `Composite 3/5 · Sleep ${ans.sleep} · Energy ${ans.energy} · Soreness ${ans.soreness} · Stress ${ans.stress} · Overall ${ans.overall}` + (line ? ' · ' + line.replace(/^Today: /, '') : ''),
      '', 'Full summary', 'Day 1 — Test', 'Exercise log:'].join('\n');
    const got = D_RD.parseSessionEmail(email).readiness;
    const wantVerdict = line ? { level: plan.level, sore: plan.sore, drop: plan.drop, asWritten: i % 7 === 0 } : { level: undefined, sore: undefined, drop: undefined, asWritten: undefined };
    expect('email import: the verdict as the app stored it', { ans, base }, { level: got.level, sore: got.sore, drop: got.drop, asWritten: got.asWritten }, wantVerdict);
    same('email import: the score', { ans, base }, plan.score, line ? got.score : plan.score);
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
if (process.argv.includes('--stamp')) {
  const s = chipsStamp();
  if (!s.v) bail('coach.html does not load assets/js/chips.js with a ?v= token');
  fs.writeFileSync(STAMP_FILE, JSON.stringify({ 'assets/js/chips.js': s }, null, 2) + '\n');
  console.log('stamped chips.js: ?v=' + s.v + ' ' + s.sha);
  process.exit(0);
}
run('chips.js cache token', () => {
  const now = chipsStamp();
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(STAMP_FILE, 'utf8'))['assets/js/chips.js']; } catch (e) { /* no stamp yet */ }
  checks++;
  if (!now.v) failures.push('coach.html no longer loads assets/js/chips.js with a ?v= token (the service worker serves /assets/ cache-first)');
  else if (!prev) failures.push('scripts/twins_stamp.json is missing: run   node scripts/check_twins.js --stamp');
  else if (prev.sha !== now.sha && prev.v === now.v) failures.push(`assets/js/chips.js changed but coach.html still loads ?v=${now.v}.\n    The service worker answers /assets/ from cache first, so browsers keep the old file. Bump the ?v= token, then run   node scripts/check_twins.js --stamp`);
  else if (prev.sha !== now.sha || prev.v !== now.v) failures.push(`the chips.js stamp is out of date (stamped ?v=${prev.v}, now ?v=${now.v}). Run   node scripts/check_twins.js --stamp   and stage scripts/twins_stamp.json`);
});

/* ── report ───────────────────────────────────────────────────────────────── */
console.log('  note WORK-11 dayTargetC() ignores the week note; TWIN-1 drafts; TWIN-6 leftover window; TWIN-7 retest flag (see the header)');
if (failures.length) {
  console.error('\ncheck_twins: ' + failures.length + ' difference' + (failures.length === 1 ? '' : 's') + ' between coach.html and program.html (of ' + checks + ' checks):\n');
  failures.slice(0, 12).forEach(f => console.error('  ✗ ' + f + '\n'));
  if (failures.length > 12) console.error('  … and ' + (failures.length - 12) + ' more');
  console.error('The two files hold one rule in two copies. Change BOTH (or, if the difference is intended, say so in this script\'s header).');
  process.exit(1);
}
console.log('check_twins: all ' + checks + ' checks agree.');
