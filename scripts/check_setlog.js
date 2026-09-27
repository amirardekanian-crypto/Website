/* ═══════════════════════════════════════════════════════════════════════════
   check_setlog.js — the set-log line grammar, written once and read twice.

   program.html's buildSessionData() writes every finished session as a text
   summary ("Set 2: 2×20 ×8 @7 ✓"). Two readers turn it back into sets:
     · parseSetLine()  in coach.html   (the dashboard's prescribed-vs-done table)
     · parseSetText()  in program.html (The Card Remembers, for sessions with no
                                        structured `log`)
   If a reader drifts from the writer, a weight, a rep count or an RPE silently
   changes on the way back and nothing errors. Found 2026-09-26: a weight typed
   with × ("2×20", two 20 kg dumbbells) was read as 20 REPS by both readers.

   This runs the REAL writer (lifted out of program.html, with the browser
   stubbed) over sets of every shape it produces, feeds the summary through
   BOTH readers, and checks each set comes back as it went in. It also checks
   the two numeric readings of a weight: parseLoggedKg() (program.html, records)
   and loadSummary() (coach.html, the load column).

   Wired into .githooks/pre-commit (program.html or coach.html staged). By hand:
       node scripts/check_setlog.js
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const prog = fs.readFileSync(path.join(root, 'program.html'), 'utf8');
const coach = fs.readFileSync(path.join(root, 'coach.html'), 'utf8');

function slice(src, file, startMark, endMark) {
  const i = src.indexOf(startMark);
  const j = src.indexOf(endMark, i + 1);
  if (i < 0 || j <= i) { console.error('check_setlog: could not find ' + startMark + ' in ' + file); process.exit(1); }
  return src.slice(i, j);
}

/* ── the writer, and the program.html reader ──────────────────────────────── */
const P = {};
vm.createContext(P);
const store = {};
Object.assign(P, {
  ATHLETE_ID: 'test',
  DATA: null,
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  document: { querySelectorAll: () => [] },
  getDayCompletion: () => ({ done: 1, total: 1, missing: [], excused: [] }),
  loadTimer: () => null, timerElapsedMs: () => 0,
  loadReadiness: () => null, READINESS_QUESTIONS: [], readinessPlanLine: () => '',
  loadSessionNote: () => '',
  circuitWKey: n => 'test_cwlog_' + n, circuitRpeKey: n => 'test_rpe_' + n,
});
vm.runInContext([
  slice(prog, 'program.html', 'function parseDurationToSec(', 'function renderNumLine(rx, rest) {'),   // rxOf, plannedReps
  slice(prog, 'program.html', 'function setReps(s, planned) {', 'function saveSetLogValue('),
  slice(prog, 'program.html', 'function normDigits(v) {', '// The sets "Same as last" would fill'),
  slice(prog, 'program.html', 'function parseLoggedKg(v) {', '// The set that produces the HIGHEST'),
  slice(prog, 'program.html', 'function buildSessionData(day) {', '// Saves a permanent session record'),
  slice(prog, 'program.html', 'function parseSetText(t) {', 'function histFromRows('),
].join('\n'), P);

/* ── the coach.html reader ────────────────────────────────────────────────── */
const C = {};
vm.createContext(C);
vm.runInContext([
  slice(coach, 'coach.html', 'function parseSetLine(rest) {', 'function normEx('),
  slice(coach, 'coach.html', 'function loadSummary(sets) {', '// One prescribed exercise against its log line.'),
].join('\n'), C);

/* ── fixtures: one exercise per case, its sets as the phone stores them ───── */
// want: what each set must read back as. null = the line says "skipped".
const S = (w, n, r, d) => ({ w, n: n == null ? '' : String(n), r: r == null ? '' : String(r), d: !!d });
const W = (w, n, r, d) => ({ w, n, r, d });
const CASES = [
  { name: 'plain kg, planned reps', rx: { sets: 3, reps: 5, rpe: 8 },
    sets: [S('80', null, 8, 1), S('82.5', 4, 9, 1), S('85', null, null, 0)],
    want: [W('80', 5, '8', true), W('82.5', 4, '9', true), W('85', 5, '', false)] },
  { name: 'dumbbell pair with ×', rx: { sets: 3, reps: 8, rpe: 7 },
    sets: [S('2×20', null, 7, 1), S('2×22.5', 6, 8, 1), S('2 × 20', null, null, 1)],
    want: [W('2×20', 8, '7', true), W('2×22.5', 6, '8', true), W('2 × 20', 8, '', true)] },
  { name: 'dumbbell pair with Latin x', rx: { sets: 2, reps: 10 },
    sets: [S('2x20', null, 7, 1), S('2X20kg', 9, null, 1)],
    want: [W('2x20', 10, '7', true), W('2X20kg', 9, '', true)] },
  { name: 'pair on a timed hold writes no reps', rx: { sets: 2, time: '30s' },
    sets: [S('2×20', null, 7, 1), S('2×20', null, null, 1)],
    want: [W('2×20', null, '7', true), W('2×20', null, '', true)] },
  { name: 'bodyweight: blank weight', rx: { sets: 3, reps: 12, rpe: 7 },
    sets: [S('', null, 8, 1), S('', null, null, 1), S('', 10, 9, 1)],
    want: [W('', 12, '8', true), W('', 12, '', true), W('', 10, '9', true)] },
  { name: 'per side', rx: { sets: 3, reps: 8, side: true, rpe: 7 },
    sets: [S('16', null, 7, 1), S('16', 7, 8.5, 1), S('', null, null, 0)],
    want: [W('16', 8, '7', true), W('16', 7, '8.5', true), null] },
  { name: 'free-text weights', rx: { sets: 3, reps: 6 },
    sets: [S('BW+10', null, 8, 1), S('red band', null, null, 1), S('24kg', 5, 7.5, 0)],
    want: [W('BW+10', 6, '8', true), W('red band', 6, '', true), W('24kg', 5, '7.5', false)] },
  { name: 'rep range: only typed reps are written', rx: { sets: 2, reps: '8-10', rpe: 8 },
    sets: [S('40', 9, 8, 1), S('40', null, 8, 1)],
    want: [W('40', 9, '8', true), W('40', null, '8', true)] },
  { name: 'distance dose: no reps', rx: { sets: 2, distance: '20m' },
    sets: [S('2×24', null, 7, 1), S('', null, null, 0)],
    want: [W('2×24', null, '7', true), null] },
];

let fails = 0, passes = 0;
const say = (ok, what, extra) => {
  if (ok) { passes++; return; }
  fails++; console.log('  FAIL  ' + what + (extra ? '\n        ' + extra : ''));
};

console.log('1 · every set survives buildSessionData() → both readers');
const day = { id: 1, blocks: [{ title: 'Primary', exercises: CASES.map((c, i) => ({
  name: 'Lift ' + (i + 1), type: 'standard', rx: c.rx })) }] };
P.DATA = { workouts: { days: [day] } };
CASES.forEach((c, i) => {
  store['test_setlog_Lift_' + (i + 1)] = JSON.stringify(c.sets);
});
const D = vm.runInContext('buildSessionData(1)', P);
const coachBlocks = C.parseSessionLog ? C.parseSessionLog(D.summary) : null;
const phoneEntries = vm.runInContext('parseSummaryLog', P)(D.summary);
say(!!coachBlocks && coachBlocks.length === 1, 'coach.html parsed one block');

CASES.forEach((c, i) => {
  const name = 'Lift ' + (i + 1);
  const ce = coachBlocks[0].exercises.find(e => e.name === name);
  const pe = phoneEntries.find(e => e.ex === name);
  say(ce && ce.sets.length === c.want.length, c.name + ': coach.html set count');
  say(pe && pe.sets.length === c.want.length, c.name + ': program.html set count');
  c.want.forEach((want, k) => {
    const cs = ce && ce.sets[k], ps = pe && pe.sets[k];
    const tag = c.name + ' / set ' + (k + 1);
    if (want == null) {
      say(cs && cs.skipped === true, tag + ': coach.html reads skipped', JSON.stringify(cs));
      say(ps && ps.w === '' && ps.n == null && ps.r === '' && !ps.d, tag + ': program.html reads skipped', JSON.stringify(ps));
      return;
    }
    const gotC = cs && { w: cs.w, n: cs.reps == null ? null : cs.reps, r: cs.rpe, d: cs.done };
    const gotP = ps && { w: ps.w, n: ps.n, r: ps.r, d: ps.d };
    say(JSON.stringify(gotC) === JSON.stringify(want), tag + ': coach.html',
        'got  ' + JSON.stringify(gotC) + '\n        want ' + JSON.stringify(want));
    say(JSON.stringify(gotP) === JSON.stringify(want), tag + ': program.html',
        'got  ' + JSON.stringify(gotP) + '\n        want ' + JSON.stringify(want));
    // The structured log written beside the summary must agree too.
    const ls = D.log[i].sets[k];
    say(ls.w === want.w && ls.r === want.r && ls.d === want.d, tag + ': structured log matches',
        JSON.stringify(ls));
  });
});

console.log('2 · readers agree on hand-written lines (older sessions)');
[
  ['24 @7 ✓',        '24', null, '7', true],
  ['80 ×4 @8 ✓',     '80', 4, '8', true],
  ['×12 @7 ✓',       '',   12, '7', true],
  ['2×20 ×8 @7 ✓',   '2×20', 8, '7', true],
  ['2×20 @7 ✓',      '2×20', null, '7', true],
  ['2×20 ·',         '2×20', null, '', false],
  ['2x20 ×10 ✓',     '2x20', 10, '', true],
  ['7.5 @8.5 ✓',     '7.5', null, '8.5', true],
  ['✓',              '',   null, '', true],
].forEach(([line, w, n, r, d]) => {
  const cs = C.parseSetLine(line), ps = vm.runInContext('parseSetText', P)(line);
  const want = JSON.stringify({ w, n, r, d });
  const gotC = JSON.stringify({ w: cs.w, n: cs.reps == null ? null : cs.reps, r: cs.rpe, d: cs.done });
  const gotP = JSON.stringify({ w: ps.w, n: ps.n, r: ps.r, d: ps.d });
  say(gotC === want, '"' + line + '": coach.html', 'got ' + gotC + '  want ' + want);
  say(gotP === want, '"' + line + '": program.html', 'got ' + gotP + '  want ' + want);
});

console.log('3 · a weight as a number');
const kg = vm.runInContext('parseLoggedKg', P);
[['80', 80], ['62,5', 62.5], ['۲۵', 25], ['2×20', 20], ['2x22.5', 22.5], ['2 x 20kg', 20],
 ['20x2', 20], ['BW', null], ['', null], ['24kg', 24]].forEach(([v, want]) =>
  say(kg(v) === want, 'parseLoggedKg("' + v + '") = ' + want, 'got ' + kg(v)));
const ls = ws => C.loadSummary(ws.map(w => ({ w })));
[[['2×20', '2×20'], '2×20 · 2×20'], [['80', '85'], '80 → 85'], [['24kg', '24kg'], '24'],
 [['0', '0'], ''], [['BW+10'], 'BW+10']].forEach(([ws, want]) =>
  say(ls(ws) === want, 'loadSummary(' + JSON.stringify(ws) + ') = "' + want + '"', 'got "' + ls(ws) + '"'));

console.log('  ' + passes + ' checks');
if (fails) { console.log('\ncheck_setlog: ' + fails + ' FAILED'); process.exit(1); }
console.log('\ncheck_setlog: OK');
