/* ═══════════════════════════════════════════════════════════════════════════
   migrate_rx.js — turn `chips[]` into `rx` in the Train library.

   A prescription used to be six display strings that program.html pattern-matched
   back into numbers at render time. `rx` stores it as data instead. This walks
   workouts/<cat>/<slug>.json and rewrites every standard/simple exercise.

   IT DOES NOT REIMPLEMENT THE CONVERSION. It calls Chips.toRx() out of
   assets/js/chips.js — the same function coach.html uses when it saves an
   unmigrated exercise — so there is exactly one definition of what an old chip
   row means, and this script cannot drift away from the app.

   Circuits are converted too (2026-09-20): the rounds string becomes a number —
   "×2 Rounds" is why the cell used to read "Rounds: ×2 Rounds" — the rest becomes
   rx.rest, and each item's free-text `detail` becomes its own rx WHERE IT PARSES
   CLEANLY. "20 seconds, alternating" and "15 sec, switch legs each round" keep
   their wording: losing a coach's phrasing to a tidier shape is a bad trade, and
   rxOf() reads both.

   USAGE
       node scripts/migrate_rx.js            # dry run — prints what would change
       node scripts/migrate_rx.js --write    # actually rewrite the files
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ctx = { window: {} };
ctx.global = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('assets/js/chips.js', 'utf8'), ctx);
const Chips = ctx.window.Chips;

const WRITE = process.argv.includes('--write');
const ROOT = 'workouts';

const files = [];
(function walk(d) {
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.json') && path.basename(p) !== 'index.json') files.push(p);
  });
})(ROOT);

let touched = 0, exCount = 0, circuits = 0, circuitItems = 0, setups = [], mismatches = [];

files.forEach(file => {
  const raw = fs.readFileSync(file, 'utf8');
  const j = JSON.parse(raw);
  let changed = false;

  (j.blocks || []).forEach(b => (b.exercises || []).forEach((ex, i) => {
    if (ex.type === 'circuit') {
      if (ex.rx && ex.rx.rounds) return;
      const next = Chips.circuitToRx(ex);
      const itemsDone = (next.items || []).filter(it => it.rx).length;
      circuits++; circuitItems += itemsDone;
      b.exercises[i] = next; changed = true;
      return;
    }
    if (!ex.chips) return;

    const before = Chips.rxOf(ex);
    const next = Chips.toRx(ex);
    const after = Chips.rxOf(next);

    // Nothing may be lost in the move. Compare the facts, not the spelling.
    const key = r => JSON.stringify([
      r.sets, r.rpe, r.tempo, r.rest,
      r.dose ? [r.dose.kind, String(r.dose.value), r.dose.side] : null
    ]);
    if (key(before) !== key(after)) {
      mismatches.push({ file: j.id, name: ex.name, chips: ex.chips.map(c => c.label),
                        before: key(before), after: key(after) });
      return;                                   // leave it alone rather than damage it
    }

    if (next.setup) setups.push(j.id + ' / ' + ex.name + ' → "' + next.setup + '"');
    b.exercises[i] = next;
    changed = true; exCount++;
  }));

  if (!changed) return;
  touched++;
  if (WRITE) {
    // Match the repo's existing 2-space JSON and keep the trailing newline.
    fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n', 'utf8');
  }
});

console.log((WRITE ? 'WROTE' : 'DRY RUN') + ` — ${exCount} exercises in ${touched} of ${files.length} files`);
console.log(`circuits converted: ${circuits} (${circuitItems} item doses structured; the rest keep their wording)`);
console.log(`refused (would have lost a fact): ${mismatches.length}`);
mismatches.slice(0, 10).forEach(m =>
  console.log('   ' + m.file + ' / ' + m.name + ' ' + JSON.stringify(m.chips) + '\n     ' + m.before + '\n     ' + m.after));
console.log(`\nsetup lines created: ${setups.length}`);
setups.forEach(x => console.log('   ' + x));
