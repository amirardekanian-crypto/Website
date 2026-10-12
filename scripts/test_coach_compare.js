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
new Function('ctx', 'with (ctx) {' + code + '\nObject.assign(ctx, {parseSetLine, parseSessionLog, parseChips, compareExercise, compareDay, dayVerdict, loadSummary, rpeTarget, normEx, logIndex, rxLine, dayTargetC, dayDropC, planLabelC, weekNoteOnC, cycleWeekOnC, retestWindowOnC, exTestSpecC});}')(sandbox);
const { parseSessionLog, parseChips, compareDay, compareExercise, dayVerdict, loadSummary } = sandbox;
// The email reader (the page's "Add past session from email" box is gone since 2026-10-12; scripts/restore/sessions_from_email.js uses it).
const emailCode = grab('function parseSessionEmail(text) {', '// ── end of the email reader');
new Function('ctx', 'with (ctx) {' + emailCode + '\nObject.assign(ctx, {parseSessionEmail, parseCheckinPlan});}')(sandbox);
const { parseSessionEmail, parseCheckinPlan, planLabelC } = sandbox;
// What a save changed, in words (FLOW-11, WORK-10): the diff between two copies of a programme.
new Function('ctx', 'with (ctx) {' + grab('function programCards(p) {', '// ── One-tap Undo after a programme save') + '\nObject.assign(ctx, {programDiff});}')(sandbox);
// The Readiness series (TWIN-3, TODAY-11): the check-in score and the athlete's usual, as the app works them out.
new Function('ctx', 'with (ctx) {' + grab('const READY_FOUR_C = ', 'function weeklyLoad(daily, weeks, ref) {') + '\nObject.assign(ctx, {readinessSC, usualC, checkinOrderC, readinessSeries, readinessStats});}')(sandbox);

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

// ── 12. The email import reads the check-in line (2026-10-10, audit FILE-8) ────────────────────
// program.html writes it twice: on the Readiness field after "Overall n ·", and as a "Today:" line of the full
// summary. scripts/check_twins.js round-trips the app's real readinessPlanLine() through parseCheckinPlan().
console.log('12. email import: the check-in line');
{
  const FIELD = 'Composite 3.5/5 · Sleep 3 · Energy 4 · Soreness 2 · Stress 4 · Overall 3';
  const SUMMARY = (today) => ['Day 1 — Legs First', 'Status: Complete', 'Session RPE: 7/10', 'Duration: 55 min', '',
    'Readiness (at start) — composite 3.5/5:', '  Sleep last night: 3/5 (Okay)', '  Energy levels: 4/5 (Good)', '  How sore are you: 2/5 (Quite sore)',
    '  Stress: 4/5 (Calm)', '  How ready do you feel: 3/5 (Okay)'].concat(today ? [today] : [], ['', 'Notes from athlete:', 'Short day at work, knee felt fine.', '', 'Exercise log:', '', '[Primary]', '• Goblet Squat (✓)', '    Set 1: 20 ×10 @7 ✓']).join('\n');
  const email = (fieldTail, today) => ['Athlete', 'Ava Example', '', 'Day', 'Day 1 — Legs First', '', 'Status', 'Complete', '', 'Session RPE', '7/10', '', 'Duration', '55 min', '',
    'Readiness', FIELD + fieldTail, '', 'Notes from athlete', 'Short day at work, knee felt fine.', '', 'Full summary', SUMMARY(today)].join('\n');
  const LOWER = 'lower day (every RPE 1 lower, never below 6)', SHORT = 'short day (warm-up, first power move and first primary lift; the rest optional)';

  let r = parseSessionEmail(email(' · ' + LOWER + ' · sore: jumps and landings halved', 'Today: ' + LOWER + ' · sore: jumps and landings halved')).readiness;
  is([r.level, r.sore, r.drop, r.asWritten], ['amber', 'half', 1, false], 'a lower and sore day, from the field and the Today line');
  is([r.composite, r.sleep, r.soreness, r.score], [3.5, 3, 2, 3.5], 'the answers are still read, and the score is the mean of sleep, energy, stress, overall');
  is(planLabelC(r), 'lower day · sore: jumps halved', 'the work tab names it the way the athlete\'s own record would');

  r = parseSessionEmail(email(' · ' + SHORT, 'Today: ' + SHORT)).readiness;
  is([r.level, r.sore, r.drop], ['red', '', 1], 'a short day');
  r = parseSessionEmail(email(' · ' + LOWER + ' — trained as written by choice', 'Today: ' + LOWER + ' — trained as written by choice')).readiness;
  is([r.level, r.asWritten], ['amber', true], 'trained as written by choice');
  r = parseSessionEmail(email(' · sore: jumps and landings skipped', 'Today: sore: jumps and landings skipped')).readiness;
  is([r.level, r.sore, r.drop], ['green', 'skip', 0], 'only sore: a green day with the jumps skipped');

  // Only one of the two places is enough.
  r = parseSessionEmail(email('', 'Today: ' + LOWER)).readiness;
  is(r.level, 'amber', 'the Today line alone (the field lost its tail)');
  r = parseSessionEmail(email(' · ' + LOWER, null)).readiness;
  is(r.level, 'amber', 'the Readiness field alone (no Today line)');
  // A mail client wraps long lines: the words may break anywhere.
  r = parseSessionEmail(email(' ·\n' + LOWER.replace('every RPE', 'every\nRPE') + ' ·\nsore: jumps and\nlandings halved — trained as\nwritten by choice', null)).readiness;
  is([r.level, r.sore, r.asWritten], ['amber', 'half', true], 'a wrapped line');

  // No line: a normal day, or an email from before 2026-09-26. Never a guessed "normal day".
  r = parseSessionEmail(email('', null)).readiness;
  is([r.level, r.sore, r.drop, r.score], [undefined, undefined, undefined, undefined], 'no check-in line: no verdict stored');
  is(r.composite, 3.5, '...and the answers are kept');
  // Words in the athlete's own note must not set the level.
  r = parseSessionEmail(email('', null).replace('Short day at work, knee felt fine.', 'Today: short day at work, then a lower day (tired) and sore: jumps felt fine')).readiness;
  is(r.level, undefined, 'a note that talks about a short or lower day sets nothing');
  // Review of 2026-10-10: these ways an athlete writes about their own day used to set a verdict. The words must
  // follow the whole answers line or sit in the readiness block; a note is neither.
  for (const note of ['Today: short day (only 40 min), cut the accessories', 'Overall 8 - lower day (poor sleep) but fine', 'Overall 8, short day (travel)',
    'Composite 3/5 felt like a lower day (sleep)', 'Today: sore: jumps and landings halved, knee', 'Stress 4 \u00b7 Overall 4 \u00b7 lower day (tired)']) {
    r = parseSessionEmail(email('', null).split('Short day at work, knee felt fine.').join(note)).readiness;
    is([r.level, r.sore, r.drop, r.score], [undefined, undefined, undefined, undefined], 'a note cannot set a verdict: ' + note);
  }
  r = parseSessionEmail(email(' \u00b7 ' + LOWER, 'Today: ' + LOWER).split('Short day at work, knee felt fine.').join('Today: short day (only 40 min)')).readiness;
  is([r.level, r.drop], ['amber', 1], '...and the real line still wins over a note that imitates it');
  // The score only exists when all four answers are 1 to 5; a verdict without one is still stored.
  r = parseSessionEmail(['Day 1 \u2014 T', 'Status: Complete', 'Readiness', 'Composite 3/5 \u00b7 Sleep 3 \u00b7 Energy 0 \u00b7 Soreness 2 \u00b7 Stress 4 \u00b7 Overall 3 \u00b7 ' + LOWER, '', 'Full summary', 'Day 1 \u2014 T'].join('\n')).readiness;
  is([r.level, r.energy, r.score], ['amber', 0, undefined], 'an answer outside 1 to 5 stores the verdict but no score');
  is(parseCheckinPlan('Today: Short day at work'), null, 'the wrong case, no parenthesis: not the app\'s line');
  is(parseCheckinPlan('Today: ' + LOWER), null, 'the bare Today line, with no readiness block or answers line around it, is not the app\'s email');
  is(parseCheckinPlan(''), null, 'empty text');
  // A skipped check-in has nothing to judge.
  const sk = parseSessionEmail(['Day 1 — Legs', 'Status: Complete', 'Readiness (at start): skipped', 'Today: ' + LOWER].join('\n')).readiness;
  is(sk, { skipped: true }, 'a skipped check-in stays skipped');
}

// ── 13. A lower day inside a week with a note (WORK-11, 2026-10-11): the lower of the two targets wins ────
{
  const { weekNoteOnC, cycleWeekOnC } = sandbox;
  const c = (...l) => l.map(label => ({ label }));
  const mk = rpes => ({ name: 'X', label: '✓', done: true, items: [], note: '', rounds: '', gear: '',
                        sets: rpes.map(r => ({ w: '', rpe: String(r), done: true, skipped: false })) });
  const pex = { name: 'X', chips: c('3 Sets', '×5 Reps', 'RPE 9') };
  is(compareExercise(pex, mk([9, 9, 9]), 1, null, null).flags.length, 0, 'lower day, no note: target 8, a 9 is one over, not flagged');
  is(compareExercise(pex, mk([9, 9, 9]), 1, null, { text: 'w', rpeCap: 7 }).flags.map(f => f.text), ['2 over target RPE'], 'lower day in a capped week: target 7, a 9 is two over');
  is(compareExercise(pex, mk([9, 9, 9]), 0, null, { text: 'w', rpeCap: 7 }).flags.map(f => f.text), ['2 over target RPE'], 'a normal day in a capped week is judged against the cap (Amir 2026-10-12: "colour against the cap in those weeks")');
  is(compareExercise(pex, mk([9, 9, 9]), 1, null, { text: 'w', rpeDrop: 3 }).flags.map(f => f.text), ['3 over target RPE'], 'rpeDrop 3 from 9 gives 6 and the drop gives 8: the lower wins, 6 is also the floor');
  const cycle = { startDate: '2026-09-01', endDate: '2026-10-06', weekNotes: { '1': { text: 'week one', rpeCap: 7 }, last: { text: 'back-off', rpeCap: 6 } } };
  const plan = { id: 1, blocks: [{ title: 'Primary', exercises: [{ name: 'Back Squat', chips: c('3 Sets', '×5 Reps', 'RPE 9') }] }] };
  const sessOn = day => ({ completed_on: day, readiness: { level: 'amber', drop: 1 }, summary: 'Exercise log:\n[Primary]\n• Back Squat (✓)\n    Set 1: 100 ×5 @9 ✓\n    Set 2: 100 ×5 @9 ✓\n    Set 3: 100 ×5 @9 ✓\n' });
  const row = (day, cyc) => compareDay(plan, sessOn(day), cyc).groups.flatMap(g => g.rows)[0];
  is([row('2026-09-03', cycle).tgt.label, row('2026-09-03', cycle).flags.map(f => f.text)], ['7', ['2 over target RPE']], 'a session in week 1 is judged against the week-1 cap');
  is([row('2026-09-12', cycle).tgt.label, row('2026-09-12', cycle).flags.length], ['8', 0], 'a session in week 2 has no note: the drop alone');
  is([row('2026-10-02', cycle).tgt.label, row('2026-10-02', cycle).flags.map(f => f.text)], ['6', ['3 over target RPE']], 'a session in the back-off week is judged against its cap');
  is(row('2026-08-30', cycle).tgt.label, '8', 'a session before the cycle began has no note');
  is(row('2026-09-03').tgt.label, '8', 'no cycle given: the check-in alone');
  is(weekNoteOnC(cycle, '2026-09-03').wk, 1, 'the note carries its week');
  is(cycleWeekOnC({ startDate: '2026-09-01', endDate: '2026-10-06' }, '2026-10-06'), { wk: 5, total: 5, before: false, after: false }, 'the last day is still the last week');

  // The week's cap on EVERY day of its week (Amir, 2026-10-12: "colour against the cap in those weeks"), not only on a lower day.
  const { dayTargetC, rpeTarget, retestWindowOnC, exTestSpecC } = sandbox;
  const cap7 = { text: 'w', rpeCap: 7 };
  const p8 = { name: 'X', chips: c('3 Sets', '×5 Reps', 'RPE 8') };
  is(compareExercise(p8, mk([7, 7, 7]), 0, null, cap7).tgt, { lo: 7, hi: 7, label: '7', written: '8' }, 'a normal day in a capped week: an RPE-8 card is judged against 7');
  is(compareExercise(p8, mk([7, 7, 7]), 0, null, cap7).flags.length, 0, '...and 7s on it are on target');
  is([compareExercise(pex, mk([9, 9, 9]), 0, null, { text: 'w', rpeDrop: 1 }).tgt.label, compareExercise(pex, mk([9, 9, 9]), 0, null, { text: 'w', rpeDrop: 1 }).flags.length], ['8', 0], 'a normal day in a week one RPE lower: 9 → 8, a 9 is one over, not flagged');
  is([compareExercise(pex, mk([9, 9, 9]), 0, null, { text: 'w', rpeDrop: 2 }).tgt.label, compareExercise(pex, mk([9, 9, 9]), 0, null, { text: 'w', rpeDrop: 2 }).flags.map(f => f.text)], ['7', ['2 over target RPE']], 'two lower: 9 → 7, a 9 is two over');
  is(compareExercise(p8, mk([8, 8, 8]), 0, null, { text: 'w', rpeCap: 9 }).tgt, { lo: 8, hi: 8, label: '8' }, 'a cap above the card changes nothing');
  is(compareExercise(p8, mk([8, 8, 8]), 0, null, { text: 'w', setsDrop: 1 }).tgt, { lo: 8, hi: 8, label: '8' }, 'a week that only drops a set leaves the RPE alone');
  is(compareExercise(pex, mk([9, 9, 9])).tgt, { lo: 9, hi: 9, label: '9' }, 'no drop and no note given: the card as written (never a NaN target)');
  is([dayTargetC(rpeTarget('8'), undefined, cap7).label, dayTargetC(rpeTarget('8'), null, cap7).label], ['7', '7'], 'a missing or null drop is a normal day');
  is([compareExercise(p8, mk([7]), 0, null, cap7).tgtBy, compareExercise(p8, mk([7]), 1, null, cap7).tgtBy, compareExercise(p8, mk([7]), 1, null, null).tgtBy, compareExercise(p8, mk([8])).tgtBy, compareExercise(p8, mk([8]), 0, null, { text: 'w', rpeCap: 9 }).tgtBy],
    ['week', 'day', 'day', '', ''], 'what moved the target: the week, the day (with or without a note), or nothing');

  // compareDay: every kind of normal day in the capped week is judged against the cap; outside a note's week the card as written.
  const plan9 = { id: 1, blocks: [{ title: 'Primary', exercises: [{ name: 'Back Squat', chips: c('3 Sets', '×5 Reps', 'RPE 9') }] }] };
  const sessRd = (day, rd) => ({ completed_on: day, readiness: rd, summary: 'Exercise log:\n[Primary]\n• Back Squat (✓)\n    Set 1: 100 ×5 @9 ✓\n    Set 2: 100 ×5 @9 ✓\n    Set 3: 100 ×5 @9 ✓\n' });
  const rowRd = (plan, day, rd, cyc) => compareDay(plan, sessRd(day, rd), cyc).groups.flatMap(g => g.rows)[0];
  const NORMAL = [['no check-in', null], ['a green day', { level: 'green', drop: 0 }], ['a skipped check-in', { skipped: true }], ['a lower day trained as written', { level: 'amber', drop: 1, asWritten: true }]];
  NORMAL.forEach(([what, rd]) => {
    const w1 = rowRd(plan9, '2026-09-03', rd, cycle);
    is([w1.tgt.label, w1.tgtBy, w1.flags.map(f => f.text)], ['7', 'week', ['2 over target RPE']], what + ' in week 1: judged against the cap of 7');
    is([rowRd(plan9, '2026-09-12', rd, cycle).tgt.label, rowRd(plan9, '2026-09-12', rd, cycle).tgtBy], ['9', ''], what + ' in week 2 (no note): the card as written');
    is([rowRd(plan9, '2026-10-02', rd, cycle).tgt.label, rowRd(plan9, '2026-10-02', rd, cycle).tgtBy], ['6', 'week'], what + ' in the back-off week: its cap of 6');
    is([rowRd(plan9, '2026-08-30', rd, cycle).tgt.label, rowRd(plan9, '2026-10-07', rd, cycle).tgt.label, rowRd(plan9, '2026-09-03', rd).tgt.label], ['9', '9', '9'], what + ' before or after the cycle, or with no cycle: the card as written');
  });
  is(rowRd(plan9, '2026-09-03', { level: 'amber', drop: 1 }, cycle).tgtBy, 'day', 'a lower day in the capped week still reads as the day');

  // The retest exception (TST-4): in the cycle's closing week a flagged retest keeps its own card's target on a normal day, as the app's bar
  // says "Max RPE 7 except the retest". On a lower day the app's pill reads the note for every lift, so the dashboard does too.
  is([retestWindowOnC(cycle, '2026-09-28'), retestWindowOnC(cycle, '2026-09-29'), retestWindowOnC(cycle, '2026-10-06'), retestWindowOnC(cycle, '2026-10-20')], [false, true, true, true], 'the closing week is the last 7 days and on, by calendar day');
  is([retestWindowOnC({ startDate: '2026-09-01' }, '2026-09-03'), retestWindowOnC({ endDate: 'soon' }, '2026-09-03'), retestWindowOnC(null, '2026-09-03')], [true, true, true], 'no end date, or one that cannot be read: always in it (as the app)');
  is([exTestSpecC({ test: true }), exTestSpecC({ test: 'heavy' })], [{ reps: 5, label: '5RM' }, null], 'the retest flag is read in the comparison block');
  const planT = test => ({ id: 1, blocks: [{ title: 'Primary', exercises: [{ name: 'Back Squat', test, chips: c('3 Sets', '×5 Reps', 'RPE 9') }] }] });
  is([rowRd(planT(true), '2026-10-02', null, cycle).tgt.label, rowRd(planT(true), '2026-10-02', null, cycle).flags.length], ['9', 0], 'a flagged retest in the closing week keeps its own target: 9s are on target');
  is(rowRd(planT('5RM'), '2026-10-02', { level: 'green', drop: 0 }, cycle).tgt.label, '9', '...a "5RM" flag on a green day too');
  is(rowRd(planT('heavy'), '2026-10-02', null, cycle).tgt.label, '6', 'a value the app does not read as a flag is an ordinary lift: the cap');
  is(rowRd(planT(true), '2026-09-03', null, cycle).tgt.label, '7', 'the same lift in week 1 (not the closing week) gets the cap');
  is([rowRd(planT(true), '2026-10-02', { level: 'amber', drop: 1 }, cycle).tgt.label, rowRd(planT(true), '2026-10-02', { level: 'amber', drop: 1 }, cycle).tgtBy], ['6', 'day'], 'on a lower day in the closing week the retest is judged like every lift (the lower of 8 and 6)');
  const twoLifts = { id: 1, blocks: [{ title: 'Primary', exercises: [{ name: 'Back Squat', test: true, chips: c('1 Sets', '×5 Reps', 'RPE 9') }, { name: 'Row', chips: c('3 Sets', '×8 Reps', 'RPE 8') }] }] };
  const both = compareDay(twoLifts, { completed_on: '2026-10-02', readiness: null, summary: 'Exercise log:\n[Primary]\n• Back Squat (✓)\n    Set 1: 100 ×5 @9 ✓\n• Row (✓)\n    Set 1: 30 ×8 @6 ✓\n    Set 2: 30 ×8 @6 ✓\n    Set 3: 30 ×8 @6 ✓\n' }, cycle).groups[0].rows;
  is(both.map(r => [r.tgt.label, r.tgtBy, r.flags.length]), [['9', '', 0], ['6', 'week', 0]], 'the retest keeps 9 while the lift beside it is judged against the back-off cap of 6');
}

// ── 14. The Readiness chart plots the app's own score against the app's own usual (TWIN-3, TODAY-11, 2026-10-11) ────
{
  const { readinessSC, usualC, readinessSeries, readinessStats } = sandbox;
  // a check-in as the app stores it: the five answers and the composite (which counts soreness and leaves out `overall`)
  const ans = (s, e, st, o, so, extra) => Object.assign({ sleep: s, energy: e, stress: st, overall: o, soreness: so, composite: Math.round(((s + e + so + st) / 4) * 100) / 100 }, extra || {});
  const ses = (day, rd) => ({ completed_on: day, readiness: rd });
  const d = n => '2026-09-' + String(n).padStart(2, '0');
  is(readinessSC(ans(4, 4, 4, 4, 1)), 4, 'the score leaves soreness out (the composite would say 3.25)');
  is(readinessSC(ans(5, 5, 1, 1, 5)), 3, 'the score counts how ready they feel and stress');
  is([readinessSC({ skipped: true, sleep: 4, energy: 4, stress: 4, overall: 4 }), readinessSC(null), readinessSC({ sleep: 4, energy: 4, stress: 4 }), readinessSC({ sleep: 0, energy: 4, stress: 4, overall: 4 })], [null, null, null, null], 'a skipped, empty, incomplete or out-of-range check-in has no score');
  is([usualC([4, 4, 4, 4]), usualC([4, 4, 4, 4, 3])], [null, 3.8], 'their usual needs five check-ins');
  is(usualC([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 1, 1, 1]), 5, 'their usual is the last ten, newest first');
  // an older or imported check-in (no score, no base): both are worked out, the way the app would have
  const legacy = [4, 4, 3, 4.5, 4, 4, 3].map((s, i) => ses(d(i + 1), ans(s, s, s, s, 1)));
  const ser = readinessSeries(legacy);
  is(ser.map(p => p.v), [4, 4, 3, 4.5, 4, 4, 3], 'an old check-in is scored from its four answers, soreness left out');
  is(ser.map(p => p.base === null ? null : Math.round(p.base * 1000) / 1000), [null, null, null, null, null, 3.9, 3.917], 'their usual is the mean of the check-ins before it, from the fifth on');
  is(readinessStats(ser), { baseline: ser[6].base, latest: 3, delta: 3 - ser[6].base, n: 7 }, 'the card reads the latest against the usual it had');
  // what the app stored wins over a recount
  const stored = readinessSeries([ses(d(1), ans(4, 4, 4, 4, 3, { score: 3, base: 3.92, level: 'amber' }))]);
  is([stored[0].v, stored[0].base], [3, 3.92], 'a stored score and usual are shown as stored');
  is(readinessSeries(legacy.slice(0, 5).concat([ses(d(6), ans(4, 4, 4, 4, 3, { score: 4, base: null }))]))[5].base, null, 'a stored `base: null` (fewer than five at the time) stays null');
  is(readinessSeries(legacy.slice(0, 5).concat([ses(d(6), ans(4, 4, 4, 4, 3, { score: 4, base: '3.9' }))]))[5].base, null, 'a stored usual that is not a number is no usual');
  // a skipped or unreadable check-in is not a point and does not disturb the others; a JSON string is read
  const mixed = [ses(d(1), JSON.stringify(ans(4, 4, 4, 4, 3))), ses(d(2), { skipped: true }), ses(d(3), null), ses(d(4), ans(3, 3, 3, 3, 3)), ses(d(5), { sleep: 4, energy: 4, stress: 4 }), ses(null, ans(2, 2, 2, 2, 2))];
  is(readinessSeries(mixed).map(p => [p.iso, p.v]), [[d(1), 4], [d(4), 3]], 'only answered, dated check-ins are points');
  is(readinessStats([]), null, 'no check-ins: no card');
  is(readinessStats(readinessSeries([ses(d(1), ans(4, 4, 4, 4, 3))])), { baseline: null, latest: 4, delta: null, n: 1 }, 'under five check-ins there is no usual and no delta');
  // the order does not depend on how the rows came in; two on one day are told apart by when they were answered
  const a = ses(d(9), ans(4, 4, 4, 4, 3, { timestamp: '2026-09-09T08:00:00.000Z' })), b = ses(d(9), ans(2, 2, 2, 2, 3, { timestamp: '2026-09-09T17:00:00.000Z' }));
  is([readinessSeries([a, b]).map(p => p.v), readinessSeries([b, a]).map(p => p.v)], [[4, 2], [4, 2]], 'two check-ins on one day: the later one is the latest, whatever order the rows came in');
  is(readinessSeries(legacy.slice().reverse()).map(p => p.v), [4, 4, 3, 4.5, 4, 4, 3], 'rows newest first give the same series');
}

// ── 15. What a save changed, in words (FLOW-11, WORK-10, 2026-10-11) ────
{
  const { programDiff } = sandbox;
  const ex = (name, rx, extra) => Object.assign({ name, type: 'standard', rx }, extra || {});
  const blk = (title, ...exs) => ({ title, exercises: exs });
  const day = (id, ...blocks) => ({ id, focusTag: 'Day ' + id + ' name', blocks });
  const prog = (days, extra) => Object.assign({ athlete: { id: 'x', tier: 'coached' }, currentCycleIndex: 0, cycles: [{ name: 'C1', art: 'iron', weeks: '4' }], workouts: { days } }, extra || {});
  const A = () => prog([day(1, blk('Primary', ex('Goblet Squat', { sets: 3, reps: 8, rpe: 7, rest: 90 }), ex('Row', { sets: 3, reps: 10 }))), day(2, blk('Primary', ex('Bench', { sets: 4, reps: 6, rpe: 8 })))]);
  const edit = f => { const p = A(); f(p); return p; };
  const cardOf = (p, d, b, e) => p.workouts.days[d].blocks[b].exercises[e];
  is(programDiff(A(), A()), [], 'two identical programmes: nothing changed');
  is(programDiff(A(), edit(p => { cardOf(p, 0, 0, 0).rx.sets = 4; })), ['Day 1 · Goblet Squat: sets 3 → 4'], 'one number');
  is(programDiff(A(), edit(p => { Object.assign(cardOf(p, 0, 0, 0).rx, { sets: 4, reps: 6, rpe: 8, rest: 120 }); })), ['Day 1 · Goblet Squat: sets 3 → 4, reps 8 → 6, RPE 7 → 8, rest 90 s → 120 s'], 'several numbers, in the order the card reads');
  is(programDiff(A(), edit(p => { delete cardOf(p, 0, 0, 0).rx.rest; })), ['Day 1 · Goblet Squat: rest 90 s → none'], 'a rest taken away');
  is(programDiff(A(), edit(p => { cardOf(p, 0, 0, 1).rx = { sets: 3, time: '30 s' }; })), ['Day 1 · Row: 10 reps → 30 s'], 'reps become a time');
  is(programDiff(A(), edit(p => { cardOf(p, 0, 0, 1).rx.side = true; })), ['Day 1 · Row: 10 reps → 10 reps a side'], 'a side added');
  is(programDiff(A(), edit(p => { cardOf(p, 0, 0, 0).note = 'Two in the tank'; })), ['Day 1 · Goblet Squat: Coach\u2019s Note added'], 'a note added');
  is(programDiff(edit(p => { cardOf(p, 0, 0, 0).note = 'Two in the tank'; }), edit(p => { cardOf(p, 0, 0, 0).note = 'Three in the tank'; })), ['Day 1 · Goblet Squat: Coach\u2019s Note changed'], 'a note changed');
  is(programDiff(edit(p => { cardOf(p, 0, 0, 0).note = 'Two in the tank'; }), A()), ['Day 1 · Goblet Squat: Coach\u2019s Note removed'], 'a note removed');
  is(programDiff(A(), edit(p => { cardOf(p, 0, 0, 0).intent = 'neutral grip'; })), ['Day 1 · Goblet Squat: grip or intent added'], 'an intent added');
  is(programDiff(A(), edit(p => { cardOf(p, 0, 0, 0).exId = 'goblet-squat'; })), ['Day 1 · Goblet Squat: details changed (not the dose)'], 'a change that is not on the card says so');
  is(programDiff(A(), edit(p => { p.workouts.days[0].blocks[0].exercises.push(ex('Face Pull', { sets: 3, reps: 12 })); })), ['Day 1 · Face Pull added (3 × 12)'], 'a card added, with its dose');
  is(programDiff(A(), edit(p => { p.workouts.days[0].blocks[0].exercises.splice(1, 1); })), ['Day 1 · Row removed'], 'a card removed');
  is(programDiff(A(), edit(p => { cardOf(p, 0, 0, 0).name = 'Goblet Squat (tempo)'; })).sort(), ['Day 1 · Goblet Squat removed', 'Day 1 · Goblet Squat (tempo) added (3 × 8)'].sort(), 'a rename reads as one taken away and one added');
  is(programDiff(A(), edit(p => { const e = p.workouts.days[0].blocks[0].exercises; e.push(e.shift()); })), ['Day 1 block 1: the order of the exercises changed'], 'the same cards in another order');
  is(programDiff(A(), edit(p => { p.workouts.days.push(day(3, blk('Primary'))); })), ['Day 3 added'], 'a day added');
  is(programDiff(A(), edit(p => { p.workouts.days.pop(); })), ['Day 2 removed (1 exercise)'], 'a day removed, its cards not listed again');
  is(programDiff(A(), edit(p => { p.workouts.days.push(day(3, blk('Primary', ex('Squat', { sets: 3, reps: 5 }), ex('Press', { sets: 3, reps: 8 })))); })), ['Day 3 added (2 exercises)'], 'a day added with cards');
  is(programDiff(A(), edit(p => { p.workouts.days[0].focusTag = 'Legs First'; })), ['Day 1 name: Day 1 name → Legs First'], 'a day renamed');
  is(programDiff(A(), edit(p => { p.workouts.days[0].blocks[0].title = 'Strength'; })), ['Day 1 block 1: Primary → Strength'], 'a block renamed');
  is(programDiff(A(), edit(p => { p.cycles.push({ name: 'C2' }); p.currentCycleIndex = 1; })), ['a cycle was added (C2)', 'the current cycle moved from 1 to 2'], 'a new cycle published');
  is(programDiff(A(), edit(p => { p.cycles[0].weekNotes = { first: { text: 'Go easy' } }; })), ['C1: weekNotes changed'], 'a week note');
  is(programDiff(A(), edit(p => { p.athlete.tier = 'free'; })), ['the athlete block changed'], 'the athlete block');
  is(programDiff(A(), edit(p => { p.someNewThing = { a: 1 }; })), ['someNewThing changed'], 'a top-level key it has never heard of');
  is(programDiff(null, A()).length > 0, true, 'a missing old copy does not throw');
  is(programDiff(A(), {}).length > 0, true, 'a missing new copy does not throw');
  is(programDiff(A(), edit(p => { p.workouts.days[0].blocks[0].exercises.push(ex('Row', { sets: 2, reps: 15 })); })), ['Day 1 · Row added (2 × 15)'], 'a second card with the same name is a new card, not a change to the first');
}

console.log('\n' + (fail ? 'FAILED ' + fail + ' / ' + (pass + fail) : 'all ' + pass + ' assertions passed'));
process.exit(fail ? 1 : 0);
