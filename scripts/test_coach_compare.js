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
const sandbox = { round1: n => Math.round(n * 10) / 10 };
new Function('ctx', 'with (ctx) {' + code + '\nObject.assign(ctx, {parseSetLine, parseSessionLog, parseChips, compareExercise, compareDay, dayVerdict, loadSummary, rpeTarget, normEx, logIndex, rxLine});}')(sandbox);
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

console.log('\n' + (fail ? 'FAILED ' + fail + ' / ' + (pass + fail) : 'all ' + pass + ' assertions passed'));
process.exit(fail ? 1 : 0);
