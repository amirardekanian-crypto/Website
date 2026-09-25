/* ═══════════════════════════════════════════════════════════════════════════
   check_rx.js — two jobs, both about the prescription format.

   1. THE MIRROR. rxOf() exists twice: inline in program.html (which is the
      offline PWA and stays self-contained) and in assets/js/chips.js (which
      coach.html loads). If those two ever disagree, the coach's dashboard and
      the athlete's phone show different prescriptions for the same exercise and
      nothing errors — the worst class of bug in this repo. This runs a battery
      of fixtures through BOTH copies and fails on any difference.

   2. THE DATA. Every rx in workouts/*.json is checked with auditRx: two doses on
      one exercise, chips and rx together, a tempo that is not a tempo, an RPE
      under the selector floor.

   Wired into .githooks/pre-commit. Run by hand with:
       node scripts/check_rx.js
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

/* ── load the shared module ───────────────────────────────────────────────── */
const shared = { window: {} };
shared.global = shared;
vm.createContext(shared);
vm.runInContext(fs.readFileSync('assets/js/chips.js', 'utf8'), shared);
const A = shared.window.Chips;

/* ── load program.html's inline copy ──────────────────────────────────────── */
// Pulled out by marker rather than by line number so an edit above it does not
// silently start testing the wrong region.
const html = fs.readFileSync('program.html', 'utf8');
function slice(startMark, endMark, what) {
  const i = html.indexOf(startMark);
  const j = html.indexOf(endMark, i + 1);
  if (i < 0 || j <= i) { console.error('check_rx: could not find ' + what + ' in program.html'); process.exit(1); }
  return html.slice(i, j);
}
// One contiguous region: parseDurationToSec → parseChips → isPureDuration →
// DOSE_LABEL → tempoWords → rxOf → repCount, stopping at the first renderer.
const inlineSrc = slice('function parseDurationToSec(', 'function renderStatsGrid(rx) {',
                        'the parse + rx region');

const inline = {};
vm.createContext(inline);
vm.runInContext(inlineSrc + '\n;this.rxOf = rxOf; this.repCount = repCount; this.tempoDisplay = tempoDisplay;', inline);
const B = inline;

/* ── fixtures ─────────────────────────────────────────────────────────────── */
// Legacy chip rows drawn from what is actually in the live programmes, plus the
// rx shapes the pipeline now writes.
const FIXTURES = [
  { name: 'legacy: full lift', ex: { type: 'standard', chips: [
      { label: '4 Sets', style: 'yellow' }, { label: '×6 Reps' },
      { label: 'Tempo 3-1-1-0' }, { label: 'RPE 7' }], restSec: 120 } },
  { name: 'legacy: per-side reps', ex: { type: 'standard', chips: [
      { label: '3 Sets' }, { label: '×8 Each Side' }, { label: 'RPE 7' }] } },
  { name: 'legacy: "10 Reps / side" keeps no Reps word', ex: { type: 'simple', chips: [
      { label: '10 Reps / side' }] } },
  { name: 'legacy: bare duration promotes to TIME', ex: { type: 'simple', chips: [
      { label: '5 minutes', style: 'dark' }] } },
  { name: 'legacy: "20 m" is a DISTANCE not 20 minutes', ex: { type: 'standard', chips: [
      { label: '3 Sets' }, { label: '×20 m' }] } },
  { name: 'legacy: "20m/side"', ex: { type: 'standard', chips: [
      { label: '3 Sets' }, { label: '×20m/side' }] } },
  { name: 'legacy: hold', ex: { type: 'standard', chips: [
      { label: '3 Sets' }, { label: '×20s Each Side' }, { label: 'Tempo Iso' }] } },
  { name: 'legacy: modifier survives', ex: { type: 'standard', chips: [
      { label: 'stick landing', style: 'dark' }, { label: '4 Sets' }, { label: '×4 Reps' }] } },
  { name: 'legacy: no rest anywhere', ex: { type: 'standard', chips: [
      { label: '3 Sets' }, { label: '×12 Reps' }] } },

  { name: 'rx: full lift', ex: { type: 'standard',
      rx: { sets: 4, reps: 6, rpe: 7, tempo: '3-1-1-0', rest: 120 } } },
  { name: 'rx: rep range', ex: { type: 'standard', rx: { sets: 3, reps: '8-10', rpe: 7 } } },
  { name: 'rx: per side', ex: { type: 'standard', rx: { sets: 3, reps: 8, side: true } } },
  { name: 'rx: time', ex: { type: 'simple', rx: { time: '5 min' } } },
  { name: 'rx: distance per side', ex: { type: 'standard', rx: { sets: 3, distance: '20m', side: true } } },
  { name: 'rx: interval work', ex: { type: 'standard', rx: { rounds: 6, work: '40s on / 20s off', rpe: 8 } } },
  { name: 'rx: iso', ex: { type: 'standard', rx: { sets: 3, time: '30s', tempo: 'iso' } } },
  { name: 'rx: label override', ex: { type: 'standard', rx: { sets: 3, time: '30s', label: 'Hold' } } },
  { name: 'rx: setup + intent', ex: { type: 'standard', setup: 'neutral grip', intent: 'max intent',
      rx: { sets: 5, reps: 3, rest: 180 } } },
  { name: 'rx: empty object prescribes nothing', ex: { type: 'simple', rx: {} } },
  { name: 'no rx and no chips', ex: { type: 'simple', name: 'Bare' } },
];

let fails = 0;
const say = (ok, what, extra) => {
  if (!ok) { fails++; console.log('  FAIL  ' + what + (extra ? '\n        ' + extra : '')); }
};

console.log('1 · program.html and chips.js agree on every fixture');
FIXTURES.forEach(f => {
  const a = JSON.stringify(A.rxOf(f.ex));
  const b = JSON.stringify(B.rxOf(f.ex));
  say(a === b, 'mirror: ' + f.name, 'chips.js   ' + a + '\n        program.html ' + b);
  say(A.repCount(f.ex) === B.repCount(f.ex), 'repCount: ' + f.name);
});
['3-1-1-0', '3-0-1-0', '2-0-1-0', '2-0-1-1', '2-1-1-0', '1-0-1-0', '2-0-2-0',
 'iso', '3-1-1', 'nonsense', '', '<img src=x>'].forEach(t =>
  say(JSON.stringify(A.tempoDisplay(t)) === JSON.stringify(B.tempoDisplay(t)),
      'tempoDisplay("' + t + '")'));

console.log('2 · the model behaves');
const eq = (got, want, what) => say(JSON.stringify(got) === JSON.stringify(want), what,
  'got ' + JSON.stringify(got) + '  want ' + JSON.stringify(want));

eq(A.rxOf({ rx: { time: '5 min' } }).dose, { kind: 'time', value: '5 min', side: false, label: 'Time' },
   'a duration is TIME, never REPS');
eq(A.rxOf({ rx: { sets: 3, reps: 8 } }).rest, null, 'unprescribed rest stays null — nothing invented');
eq(A.rxOf({ type: 'standard', chips: [{ label: '3 Sets' }] }).rest, null,
   'legacy standard with no rest no longer falls back to 120s');
eq(A.repCount({ rx: { time: '30s' } }), null, 'a hold has no rep count');
eq(A.repCount({ rx: { reps: '8-10' } }), 8, 'a rep range takes its low end');
// The tempo keeps its notation; only the digit that carries the instruction is coloured.
eq(A.tempoDisplay('3-0-1-0').html, '<span class="t-hot">3</span>-0-1-0',
   'the slow eccentric is the hot digit');
eq(A.tempoDisplay('2-1-1-0').html, '<span class="t-hot">2</span>-<span class="t-hot">1</span>-1-0',
   'a non-zero pause is always hot, however small');
eq(A.tempoDisplay('2-0-2-0').html, '<span class="t-hot">2</span>-0-<span class="t-hot">2</span>-0',
   'controlled both ways highlights both');
eq(A.tempoDisplay('1-0-1-0').html, '1-0-1-0',
   'a tempo asking for nothing in particular highlights nothing');
eq(A.tempoDisplay('iso'), { text: 'Hold', html: 'Hold' }, 'iso reads Hold');
eq(A.tempoDisplay('nonsense'), { text: 'nonsense', html: 'nonsense' }, 'an odd tempo still prints');
eq(A.tempoDisplay('<img src=x>').html, '&lt;img src=x&gt;', 'an unparseable tempo is escaped');
eq(A.tempoDisplay(''), null, 'no tempo, no cell');

// applyRx: one dose at a time, and blanks remove rather than store empty.
eq(A.applyRx({ rx: { reps: 8 } }, { time: '30s' }).rx, { time: '30s' }, 'setting time clears reps');
eq(A.applyRx({ rx: { sets: 3, rpe: 7 } }, { rpe: '' }).rx, { sets: 3 }, 'a blank removes the field');
eq(A.applyRx({ chips: [{ label: '3 Sets' }], restSec: 90 }, { sets: 4 }).chips, undefined,
   'applyRx drops chips — one source of truth');
eq(A.applyRx({ rx: { sets: 3 } }, { rest: '90s' }).rx.rest, 90, 'rest accepts "90s"');

// toRx: the triage that emptied the pill row.
const dup = A.toRx({ type: 'standard', chips: [
  { label: '3s eccentric', style: 'dark' }, { label: '3 Sets' },
  { label: '×15 Reps' }, { label: 'Tempo 3-1-1-0' }, { label: 'RPE 7' }] });
eq(dup.intent, undefined, 'a pill that only restates the tempo is dropped');
eq(dup.setup, undefined, '…and does not become a setup line either');
eq(dup.rx, { sets: 3, reps: 15, rpe: 7, tempo: '3-1-1-0' }, 'the facts survive the drop');
eq(A.toRx({ type: 'simple', chips: [{ label: 'Zone 2' }] }).rx, undefined,
   'no countable dose → no rx object at all');

const mixed = A.toRx({ type: 'standard', chips: [
  { label: 'max speed', style: 'dark' }, { label: 'neutral grip', style: 'dark' },
  { label: '3 Sets' }, { label: '×20 m' }] });
eq(mixed.intent, 'max speed · neutral grip', 'old chips stay chips: they share the one green pill, in card order');
eq(mixed.setup, undefined, 'nothing becomes a grey setup line (Amir, 2026-09-25: no floating text)');
eq(mixed.rx.distance, '20 m', 'and 20 m stays a distance');
const bench = A.toRx({ type: 'standard', chips: [
  { label: '3 Sets' }, { label: '×10' }, { label: '45° bench', style: 'dark' }] });
eq(bench.intent, '45° bench', 'a position chip stays a chip too');
eq(bench.setup, undefined, '…never floating text');

// audit
const two = { type: 'standard', rx: { reps: 8, time: '30s' } };
say(A.auditRx(two).some(p => p.code === 'two-doses'), 'audit catches two doses');
say(A.auditRx({ rx: { reps: 8 }, chips: [] }).some(p => p.code === 'chips-and-rx'),
    'audit catches chips left beside rx');
say(A.auditRx({ rx: { sets: 3, reps: 8, tempo: '3s eccentric' } }).some(p => p.code === 'tempo-shape'),
    'audit catches a tempo that is not a tempo');
say(A.auditRx({ rx: { sets: 3, reps: 8, tempo: '3-1-1-0' } }).length === 0, 'a good rx is clean');

console.log('3 · every rx in the Train library');
const files = [];
(function walk(d) {
  if (!fs.existsSync(d)) return;
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.json') && path.basename(p) !== 'index.json') files.push(p);
  });
})('workouts');

let checked = 0;
files.forEach(file => {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  (j.blocks || []).forEach(b => (b.exercises || []).forEach(ex => {
    // No floating text (Amir, 2026-09-25: "i dont like floating text"): a detail goes in the note.
    [ex].concat(ex.items || []).forEach(o => say(!o.setup,
      path.basename(file) + ' / ' + o.name + ': a grey setup line ("' + o.setup + '"): put it in the note'));
    if (!ex.rx) return;
    checked++;
    A.auditRx(ex).forEach(p =>
      say(false, path.basename(file) + ' / ' + ex.name + ': ' + p.msg, p.label));
    // An rx that is present must say something. Nothing to prescribe → no rx key.
    say(Object.keys(ex.rx).length > 0,
        path.basename(file) + ' / ' + ex.name + ': empty rx — drop the key instead');
  }));
});
console.log('  ' + checked + ' exercises with rx across ' + files.length + ' library files');

if (fails) { console.log('\ncheck_rx: ' + fails + ' FAILED'); process.exit(1); }
console.log('\ncheck_rx: OK');
