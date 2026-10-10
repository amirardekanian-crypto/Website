// Pull the parser + comparison functions straight out of coach.html and run
// them against real session logs taken from Supabase.
const fs = require('fs');
const src = fs.readFileSync('coach.html', 'utf8');

function grab(startMarker, endMarker) {
  const i = src.indexOf(startMarker), j = src.indexOf(endMarker);
  if (i < 0 || j < 0 || j <= i) throw new Error('markers: ' + startMarker);
  return src.slice(i, j);
}
const code = grab('function parseSetLine(rest) {', 'function dayVerdict(groups) {')
           + grab('function dayVerdict(groups) {', '// ── THE WORK TAB');
// coach.html gets its parser from assets/js/chips.js at runtime, so the harness
// has to load the real module too — testing against a stub would be testing the
// stub. This is also what keeps legacyRx()/rxOf() covered by these cases.
const vm = require('vm');
const chipsCtx = { window: {} };
chipsCtx.global = chipsCtx;
vm.createContext(chipsCtx);
vm.runInContext(fs.readFileSync('assets/js/chips.js', 'utf8'), chipsCtx);

// jparse is coach.html's own JSON-or-object reader (compareDay reads session.log with it).
const jparse = v => { if (v == null) return null; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return null; } };
const sandbox = { round1: n => Math.round(n * 10) / 10, window: chipsCtx.window, jparse };
new Function('ctx', 'with (ctx) {' + code + '\nObject.assign(ctx, {parseSetLine, parseSessionLog, parseChips, compareExercise, compareDay, dayVerdict, loadSummary, rpeTarget, normEx, logIndex, rxLine, dayTargetC, dayDropC});}')(sandbox);
const { parseSessionLog, parseChips, compareDay, compareExercise, dayVerdict, loadSummary } = sandbox;

let pass = 0, fail = 0;
function is(got, want, what) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; return; }
  fail++; console.log('  FAIL ' + what + '\n    got  ' + g + '\n    want ' + w);
}

// ── 1. Real log: multi-line athlete note, circuit with no sets, Persian text
const REAL_A = `Exercise log:

[Run Protocol]
• Zone 2 Walk-Run (✓)
    Set 1: ✓

[Conditioning Circuit]
• Conditioning Circuit (skipped)
    Note: Wall ball 3kg
Kettlebell 8kg
   · Kettlebell Swing (×12 Reps · Explosive · RPE 6)
   · Wall Ball (×10 Reps · Explosive · RPE 7)
   · Lateral Box Step-Up (×10 Reps/leg · Tempo 2-0-1-0 · RPE 6)

[Core Finisher]
• Stability Ball Rollout (skipped)
    Set 1: skipped
    Set 2: skipped
    Set 3: skipped
    Note: هر کار کردم نشد اینو برم :( به جاش ددباگ رفتم با پویا
• Modified Side Plank with Hip Abduction (✓)
    Set 1: ✓
    Set 2: ✓
`;
console.log('1. real log — multi-line note, circuit, RTL note');
{
  const b = parseSessionLog(REAL_A);
  is(b.map(x => x.title), ['Run Protocol', 'Conditioning Circuit', 'Core Finisher'], 'block titles');
  const circ = b[1].exercises[0];
  is(circ.name, 'Conditioning Circuit', 'circuit name');
  is(circ.done, false, 'circuit not done');
  is(circ.note, 'Wall ball 3kg\nKettlebell 8kg', 'multi-line note kept whole');
  is(circ.gear, '', 'note continuation did NOT become gear');
  is(circ.items.length, 3, 'circuit items');
  const roll = b[2].exercises[0];
  is(roll.sets.map(s => s.skipped), [true, true, true], 'skipped sets');
  is(roll.note.slice(0, 12), 'هر کار کردم ', 'RTL note');
}

// ── 2. Real log: superset gear line BEFORE items, weight-only sets, "0" weights
const REAL_B = `Exercise log:

[Primary]
• Lat Pulldown (✓)
    Set 1: 43 ✓
    Set 2: 45 ✓
    Set 3: 45 ✓
    Set 4: 45 ✓

[Accessory]
• Chest-Back Superset (✓)
    Cable Chest Fly 36 · Single-Arm Cable Row 45
   · Cable Chest Fly (×15 · RPE 7)
   · Single-Arm Cable Row (×12 Each Arm · RPE 7)

[Core]
• Hanging Knee Raise (✓)
    Set 1: 0 ✓
    Set 2: 0 ✓
`;
console.log('2. real log — superset gear, weight-only sets, zero weights');
{
  const b = parseSessionLog(REAL_B);
  const lat = b[0].exercises[0];
  is(lat.sets.map(s => s.w), ['43', '45', '45', '45'], 'weights read');
  is(lat.sets.map(s => s.rpe), ['', '', '', ''], 'no RPE logged');
  is(loadSummary(lat.sets), '43 → 45', 'ascending load range');
  const sup = b[1].exercises[0];
  is(sup.gear, 'Cable Chest Fly 36 · Single-Arm Cable Row 45', 'gear line');
  is(sup.items.length, 2, 'superset items');
  is(sup.note, '', 'no note');
  const knee = b[2].exercises[0];
  is(loadSummary(knee.sets), '', 'zero weights are not a load');
}

// ── 3. Set-line grammar
console.log('3. set lines');
{
  is(sandbox.parseSetLine('24 @7 ✓'), { w: '24', rpe: '7', done: true, skipped: false }, 'kg + rpe + tick');
  is(sandbox.parseSetLine('@8 ✓'),    { w: '', rpe: '8', done: true, skipped: false }, 'rpe only');
  is(sandbox.parseSetLine('✓'),       { w: '', rpe: '', done: true, skipped: false }, 'tick only');
  is(sandbox.parseSetLine('skipped'), { w: '', rpe: '', done: false, skipped: true }, 'skipped');
  is(sandbox.parseSetLine('24 ·'),    { w: '24', rpe: '', done: false, skipped: false }, 'logged, not ticked');
  is(sandbox.parseSetLine('7.5 @8.5 ✓'), { w: '7.5', rpe: '8.5', done: true, skipped: false }, 'decimals');
}

// ── 4. Chips, straight from a real data/<id>.json
console.log('4. prescribed chips');
{
  const c = (...l) => l.map(label => ({ label }));
  const p = parseChips(c('3s eccentric', '4 Sets', '×10 Reps', 'Tempo 3-0-1-0', 'RPE 7'));
  is([p.sets, p.reps, p.target, p.tempo], ['4', '10', '@7', '3-0-1-0'], 'full chip row');
  is(p.extras.map(x => x.label), ['3s eccentric'], 'extras preserved');
  is(parseChips(c('3 Sets', '×10 Each Side', 'RPE 6-7')).reps, '10 Each Side', 'each-side reps');
  is(sandbox.rpeTarget('@6-7'), { lo: 6, hi: 7, label: '6–7' }, 'rpe range');
  is(sandbox.rpeTarget('@7'), { lo: 7, hi: 7, label: '7' }, 'rpe single');
  is(sandbox.rpeTarget(''), null, 'no target');
}

// ── 5. The comparison itself — the whole point of the rebuild
console.log('5. prescribed vs done');
{
  const c = (...l) => l.map(label => ({ label }));
  const plan = { id: 1, blocks: [{ title: 'Primary', exercises: [
    { name: 'Goblet Squat', chips: c('4 Sets', '×10 Reps', 'RPE 7') },
    { name: 'Machine Leg Press', chips: c('3 Sets', '×12 Reps', 'RPE 7') },
    { name: 'Dumbbell Bicep Curl', chips: c('3 Sets', '×12 Reps', 'RPE 8') },
    { name: 'Never Logged', chips: c('3 Sets', '×12 Reps', 'RPE 8') },
  ] }] };
  const sess = { summary: `Exercise log:

[Primary]
• Goblet Squat (✓)
    Set 1: 10 @10 ✓
    Set 2: 12 @10 ✓
    Set 3: 12 @9 ✓
    Set 4: 12 @9 ✓
• Machine Leg Press (1/3 sets)
    Set 1: 40 @7 ✓
    Set 2: skipped
    Set 3: skipped
• Dumbbell Bicep Curl (skipped)
    Set 1: skipped
• Standing Calf Raise (✓)
    Set 1: 20 @6 ✓
` };
  const { groups } = compareDay(plan, sess);
  const rows = groups.flatMap(g => g.rows);
  is(rows.map(r => r.name), ['Goblet Squat','Machine Leg Press','Dumbbell Bicep Curl','Never Logged','Standing Calf Raise'], 'row order: plan first, extras last');
  const sq = rows[0];
  is([sq.state, sq.doneSets, sq.want, sq.load, sq.rpeMean], ['done', 4, 4, '10 → 12', 9.5], 'squat: full sets, load progressed, RPE mean');
  is(sq.flags.map(f => f.text), ['2.5 over target RPE'], 'squat flagged over target');
  is(rows[1].flags.map(f => f.text), ['2 sets short'], 'leg press flagged short');
  is(rows[2].flags.map(f => f.text), ['not done'], 'curl flagged not done');
  is([rows[3].state, rows[3].logged], ['none', undefined], 'never-logged stays empty');
  is(rows[4].flags.map(f => f.text), ['not in the plan'], 'extra work flagged');
  // squat off (RPE), leg press off (sets), curl skipped, one never logged —
  // nothing in this fixture landed exactly on plan
  is(dayVerdict(groups), { total: 4, clean: 0, off: 2, missing: 2 }, 'day verdict counts');
}

// ── 6. Tolerance band — a set logged one point over target is a good set
console.log('6. rpe tolerance');
{
  const c = (...l) => l.map(label => ({ label }));
  const mk = rpes => ({ name: 'X', label: '✓', done: true, items: [], note: '', rounds: '', gear: '',
                        sets: rpes.map(r => ({ w: '', rpe: String(r), done: true, skipped: false })) });
  const pex = { name: 'X', chips: c('3 Sets', '×10 Reps', 'RPE 7') };
  is(compareExercise(pex, mk([8, 8, 8])).flags.length, 0, 'one over target: no flag');
  is(compareExercise(pex, mk([8.5, 8.5, 8.5])).flags.map(f => f.text), ['1.5 over target RPE'], 'one and a half over: flagged');
  is(compareExercise(pex, mk([5, 5, 5])).flags.map(f => f.text), ['2 under target RPE'], 'well under: flagged');
  is(compareExercise(pex, mk([6, 6, 6])).flags.length, 0, 'one under: no flag');
  const range = { name: 'X', chips: c('3 Sets', 'RPE 6-7') };
  is(compareExercise(range, mk([7, 7, 7])).flags.length, 0, 'top of range: no flag');
  is(compareExercise(range, mk([9, 9, 9])).flags.map(f => f.text), ['2 over target RPE'], 'over a range: measured from the top');
}

// ── 7. A day with no session at all still lists the plan
console.log('7. day never trained');
{
  const c = (...l) => l.map(label => ({ label }));
  const plan = { id: 3, blocks: [{ title: 'Primary', exercises: [{ name: 'Trap Bar Deadlift', chips: c('4 Sets', 'RPE 7-8') }] }] };
  const { groups, hasLog } = compareDay(plan, null);
  is(hasLog, false, 'no log');
  is(groups[0].rows[0].state, 'none', 'row state none');
  is(dayVerdict(groups), { total: 1, clean: 0, off: 0, missing: 1 }, 'counts as missing');
}

// ── 8. Reps (The Card Remembers, 2026-09-24): "Set 1: 80 ×4 @8 ✓"
console.log('8. reps');
{
  const { parseSetLine } = sandbox;
  is(parseSetLine('80 ×4 @8 ✓'), { w: '80', rpe: '8', done: true, skipped: false, reps: 4 }, 'weight, reps, rpe');
  is(parseSetLine('×12 @7 ✓'), { w: '', rpe: '7', done: true, skipped: false, reps: 12 }, 'bodyweight reps');
  is(parseSetLine('60 @7 ✓'), { w: '60', rpe: '7', done: true, skipped: false }, 'old line: no reps key');
  const mk = reps => ({ name: 'X', label: '✓', done: true, items: [], note: '', rounds: '', gear: '',
                        sets: reps.map(n => ({ w: '80', rpe: '8', done: true, skipped: false, reps: n })) });
  const pex = { name: 'X', rx: { sets: 3, reps: 5, rpe: 8 } };
  is(compareExercise(pex, mk([5, 5, 5])).flags.length, 0, 'all reps hit: no flag');
  is(compareExercise(pex, mk([5, 5, 4])).flags.map(f => f.text), ['1 set under 5 reps'], 'one short set flagged');
  is(compareExercise(pex, mk([5, 5, 4])).repsPer, '5 · 5 · 4', 'reps listed');
  // 2026-09-24: a leftover range ("8-10") pre-fills nothing, so a bare tick writes
  // no × at all — that must read as reps NOT recorded, never as short.
  is(parseSetLine('✓'), { w: '', rpe: '', done: true, skipped: false }, 'bare tick: no reps key');
  const rex = { name: 'X', rx: { sets: 2, reps: '8-10', rpe: 8 } };
  const mk2 = { name: 'X', label: '✓', done: true, items: [], note: '', rounds: '', gear: '',
                sets: [{ w: '', rpe: '', done: true, skipped: false, reps: 10 }, { w: '', rpe: '', done: true, skipped: false }] };
  is(compareExercise(rex, mk2).flags.filter(f => /under/.test(f.text)).length, 0, 'range: typed 10 and a bare tick are not short');
}

// ── 9. Today's targets (REC-2, 2026-09-26): the athlete's check-in eased the day
console.log("9. today's targets");
{
  const { dayTargetC, dayDropC, rpeTarget } = sandbox;
  is(dayTargetC(rpeTarget('8'), 1), { lo: 7, hi: 7, label: '7', written: '8' }, '8 → 7');
  is(dayTargetC(rpeTarget('7-8'), 1).label, '6–7', 'range: one off each end');
  is(dayTargetC(rpeTarget('6'), 1).label, '6', 'never below 6');
  is(dayTargetC(rpeTarget('5'), 1).label, '5', 'never above what was written');
  is(dayDropC('{"level":"amber","drop":1}'), 1, 'drop read from text');
  is(dayDropC({ level: 'red', drop: 1, asWritten: true }), 0, 'trained as written: no drop');
  const c = (...l) => l.map(label => ({ label }));
  const mk = rpes => ({ name: 'X', label: '✓', done: true, items: [], note: '', rounds: '', gear: '',
                        sets: rpes.map(r => ({ w: '', rpe: String(r), done: true, skipped: false })) });
  const pex = { name: 'X', chips: c('3 Sets', '×5 Reps', 'RPE 8') };
  is(compareExercise(pex, mk([5, 5, 5]), 1).flags.map(f => f.text), ['2 under target RPE'], 'judged against the day: 7');
  is(compareExercise(pex, mk([7, 7, 7]), 1).flags.length, 0, 'on the day target: no flag');
  const plan = { id: 1, blocks: [{ title: 'Primary', exercises: [
    { name: 'Back Squat', chips: c('4 Sets', '×5 Reps', 'RPE 8') },
    { name: 'Leg Curl', chips: c('3 Sets', '×10 Reps', 'RPE 7') }] }] };
  const sess = { readiness: { level: 'red', drop: 1 }, summary: `Exercise log:
[Primary]
• Back Squat (✓)
    Set 1: 100 ×5 @7 ✓
    Set 2: 100 ×5 @7 ✓
    Set 3: 100 ×5 @7 ✓
    Set 4: 100 ×5 @7 ✓
• Leg Curl (optional today)
    Set 1: skipped
` };
  const { groups } = compareDay(plan, sess);
  const rows = groups.flatMap(g => g.rows);
  is([rows[0].tgt.label, rows[0].flags.length], ['7', 0], 'squat judged against 7 that day');
  is([rows[1].state, rows[1].flags.map(f => f.text)], ['excused', ['optional today']], 'optional work is excused, not missed');
  is(dayVerdict(groups), { total: 1, clean: 1, off: 0, missing: 0 }, 'excused work is out of the count');
}

// ── 10. Renamed exercises, the same exercise twice, and untouched ticks (2026-10-10)
console.log('10. renames, repeats, unticked');
{
  const c = (...l) => l.map(label => ({ label }));
  // The summary text still says the old name; the structured log was renamed with the Spine.
  const plan = { id: 1, blocks: [{ title: 'Primary', exercises: [
    { name: 'Goblet Box Squat', chips: c('3 Sets', '×8 Reps', 'RPE 7') },
    { name: 'Dead Bug', chips: c('2 Sets', '×10 Reps') },
    { name: 'Dead Bug', chips: c('2 Sets', '×10 Reps') }] }] };
  const sess = { log: [{ ex: 'Goblet Box Squat' }, { ex: 'Dead Bug' }, { ex: 'Dead Bug' }], summary: `Exercise log:
[Primary]
• Goblet Squat to Box (✓)
    Set 1: 16 ×8 @7 ✓
    Set 2: 16 ×8 @7 ✓
    Set 3: 16 ×8 @7 ✓
• Dead Bug (✓)
    Set 1: ×10 @6 ✓
    Set 2: ×10 @6 ✓
• Dead Bug (partial)
    Set 1: ×10 @8
` };
  const { groups, extras } = compareDay(plan, sess);
  const rows = groups.flatMap(g => g.rows);
  is([rows[0].name, rows[0].state, extras], ['Goblet Box Squat', 'done', 0], 'renamed lift matches through the structured log');
  is([rows[1].rpeMean, rows[2].rpeMean], [6, 8], 'the same exercise twice keeps its own log on each row');
  is(rows[2].flags.map(f => f.text), ['0 of 2 sets ticked'], 'touched but nothing ticked is flagged');
  // A log that does not line up one-to-one is ignored and the text names are kept.
  const odd = compareDay(plan, Object.assign({}, sess, { log: [{ ex: 'Goblet Box Squat' }] }));
  is(odd.extras, 1, 'a log of a different length falls back to the text');
}

// ── 11. Sore day (jumps halved) and partly done optional work (2026-10-10)
console.log('11. sore halving, optional work');
{
  const c = (...l) => l.map(label => ({ label }));
  const plan = { id: 1, blocks: [{ title: 'Power', exercises: [
    { name: 'Box Jump', chips: c('4 Sets', '×4 Reps') },
    { name: 'Back Squat', chips: c('4 Sets', '×5 Reps') },
    { name: 'Calf Raise', chips: c('3 Sets', '×12 Reps') }] }] };
  const sess = { readiness: { level: 'green', sore: 'half' }, summary: `Exercise log:
[Power]
• Box Jump (2/4 sets)
    Set 1: ×4 @7 ✓
    Set 2: ×4 @7 ✓
    Set 3: skipped
    Set 4: skipped
• Back Squat (1/4 sets)
    Set 1: 80 ×5 @7 ✓
    Set 2: skipped
    Set 3: skipped
    Set 4: skipped
• Calf Raise (optional today)
    Set 1: 20 ×12 @6 ✓
    Set 2: skipped
    Set 3: skipped
` };
  const { groups } = compareDay(plan, sess);
  const rows = groups.flatMap(g => g.rows);
  is(rows[0].flags.map(f => f.text), ['half the sets today (sore)'], 'exactly half on a sore day is the day\'s plan');
  is(rows[1].flags.map(f => f.text), ['3 sets short'], 'one of four is still short');
  is([rows[2].state, rows[2].flags.map(f => f.text)], ['excused', ['optional today: 1 of 3 sets']], 'optional work done in part is not a miss');
  is(dayVerdict(groups), { total: 2, clean: 1, off: 1, missing: 0 }, 'the halved row counts as on plan');
  const asWritten = compareDay(plan, Object.assign({}, sess, { readiness: { level: 'green', sore: 'half', asWritten: true } }));
  is(asWritten.groups[0].rows[0].flags.map(f => f.text), ['2 sets short'], 'trained as written: half is short');
}

console.log('\n' + (fail ? 'FAILED ' + fail + ' / ' + (pass + fail) : 'all ' + pass + ' assertions passed'));
process.exit(fail ? 1 : 0);
