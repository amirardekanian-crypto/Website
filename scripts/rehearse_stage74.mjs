// Rehearsal of supabase/stage74_publish_cycle_label.sql on a throwaway PostgreSQL (PGlite). Made-up rows only; never touches a real project.
//
//     PGLITE=<scratch>/node_modules/@electric-sql/pglite node scripts/rehearse_stage74.mjs        (install: top of scripts/restore/lib.mjs)
//
// The database is built from supabase/schema_snapshot.sql. Before stage74 went on the project the snapshot held the project's own publish_cycle() (md5 of
// its text checked below, 28a678a6…: stage38 without its comments), so what was rehearsed was what the project ran. The snapshot was remade after the
// apply (2026-10-18) and now holds the stage; the script then rewinds publish_cycle() to stage38's text first (stage38_publish_cycle.sql) and goes on
// from there, so it can still be run. In order:
//   1. before the stage: the function is the old one, and a days-only p_workouts loses workouts.label (the 2026-10-18 incident)
//   2. the same publish, with a label and with the coaching-log arguments, on the OLD function: its stored row, answer and log are kept
//   3. the stage, twice (it must be safe to re-run), and the guard: it refuses a function that is not stage38's text
//   4. the same publish on the NEW function: stored row, answer (but for the two new keys) and log are identical to step 2, byte for byte
//   5. the label rule: a missing, null, empty, blank, or non-string label is written 'Program 0N · <Cycle Name>' from the NEW cycle (after the roadmap patch;
//      num defaults to index + 1; no name leaves 'Program 03'); a label that was sent stays; other keys of workouts stay; a label-less publish ends
//      up identical (data and fingerprint) to one that carried the same label
//   6. refusals (no days, an array, null): the new message, and the row is untouched
//   7. grants unchanged (service_role only), and the way back: stage38 run again gives the old behaviour, then the stage goes on again
// Exit code 1 if anything failed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, runSql, read as readRaw } from './restore/lib.mjs';
const read = f => readRaw(f).replace(/\r\n/g, '\n');      // the working tree is CRLF; the project's text is LF (a CR in a function body would change its md5)

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const STAGE74 = read(path.join(ROOT, 'supabase', 'stage74_publish_cycle_label.sql'));
const STAGE38 = read(path.join(ROOT, 'supabase', 'stage38_publish_cycle.sql'));
const LIVE_MD5 = '28a678a6171f7a8b33b56fc48f87967d';      // md5(prosrc) of publish_cycle() on the project before stage74, read 2026-10-18
const STAGE38_MD5 = '1530d79866d66b90b70ed3589cc402af';  // md5(prosrc) of stage38's own text, with its comments, LF
const SIG = 'public.publish_cycle(text,jsonb,jsonb,boolean,jsonb,jsonb,jsonb,text,text,text,text)';

let passed = 0, failed = 0;
function ok(cond, what, detail) {
  if (cond) { passed++; console.log('  ok   ' + what); }
  else { failed++; console.log('  FAIL ' + what + (detail ? '\n         ' + String(detail).split('\n').join('\n         ') : '')); }
}
const section = s => console.log('\n' + s);

const db = await openDb();
await runSql(db, read(path.join(HERE, 'restore', 'stand_in_supabase.sql')), 'stand-in');
await runSql(db, read(path.join(ROOT, 'supabase', 'schema_snapshot.sql')), 'snapshot');
const q = async (sql, params) => (await db.query(sql, params)).rows;

// ── made-up rows ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const days = n => Array.from({ length: n }, (_, i) => ({ id: i + 1, focusTag: 'Lower', blocks: [{ exercises: [
  { name: 'Goblet Squat', rx: { sets: 3, reps: 8, rpe: 7 } }, { name: 'Row', rx: { sets: 3, reps: 10 } }] }] }));
const CYCLES = [{ num: 1, name: 'Bedrock', weeks: '4 weeks' }, { num: 2, name: 'Strength Engine' }, { num: 3, name: 'Plate Armour' }];
async function seed(id, { cci = 1, cycles = CYCLES, workouts = { label: 'Program 02 · Strength Engine', days: days(3) } } = {}) {
  await q('delete from public.programs where athlete_id = $1', [id]);
  await q('delete from public.coaching_logs where athlete_id = $1', [id]);
  const data = { athlete: { id, name: 'Made Up' }, sport: { badge: 'Tennis' }, currentCycleIndex: cci, cycles, workouts, notes: { cards: [] }, programHistory: [] };
  await q('insert into public.programs (athlete_id, data) values ($1, $2::jsonb)', [id, JSON.stringify(data)]);
}
async function seedLog(id) {
  await q('insert into public.coaching_logs (athlete_id, body) values ($1, $2)', [id,
    '# Log\n\n## Athlete profile\n```profile\nold profile\n```\n\n## Exercise Ledger\n\n| Exercise | Status | Last cycle | Note |\n|---|---|---|---|\n| Squat | on | C1 | - |\n\n## Cycle 02 — x\nold entry\n']);
}
const NOTES = { cards: [{ day: 1, text: 'note' }] };
async function publish(id, workouts, { newCycle = true, patch = null, log = false } = {}) {
  const r = await q(`select public.publish_cycle($1, $2::jsonb, $3::jsonb, $4::boolean, $5::jsonb, null, null, $6, $7, $8) as r`,
    [id, workouts === null ? null : JSON.stringify(workouts), JSON.stringify(NOTES), newCycle, patch === null ? null : JSON.stringify(patch),
     log ? '## Cycle 03 — y\nnew entry' : null, log ? '```profile\nnew profile\n```' : null,
     log ? '| Exercise | Status | Last cycle | Note |\n|---|---|---|---|\n| Squat | up | C2 | - |' : null]);
  return r[0].r;
}
const tryPublish = async (...a) => { try { return { out: await publish(...a) }; } catch (e) { return { err: String(e.message || e) }; } };
const rowText = async id => (await q('select data::text as d from public.programs where athlete_id = $1', [id]))[0].d;
const rowData = async id => (await q('select data from public.programs where athlete_id = $1', [id]))[0].data;
const logBody = async id => (await q('select body from public.coaching_logs where athlete_id = $1', [id]))[0].body;
const fp = async id => (await q('select public.programme_fingerprint($1) as f', [id]))[0].f;
const src = async () => (await q(`select prosrc from pg_proc where oid = to_regprocedure('${SIG}')`))[0].prosrc;

const LABELLED = { label: 'Program 03 · Plate Armour', days: days(5) };
const DAYS_ONLY = { days: days(5) };

// ── 1. before ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
section('1. Before the stage');
const snapshotHadRule = (await src()).includes('label_filled');
if (snapshotHadRule) {
  const applied = (await q('select md5($1) as m', [await src()]))[0].m;
  ok(applied === '6aa100caeae305675961597ea6720a94', 'the snapshot holds stage74 exactly as it was applied to the project (md5 6aa100ca…, read back 2026-10-18)', applied);
  console.log('  (the snapshot was made after stage74 went on the project: rewinding publish_cycle() to stage38\'s text first)');
  await runSql(db, STAGE38, 'stage38 (rewind)');
}
const md5Before = (await q('select md5($1) as m', [await src()]))[0].m;
const wantMd5 = snapshotHadRule ? STAGE38_MD5 : LIVE_MD5;
ok(md5Before === wantMd5, (snapshotHadRule ? 'the rewound function is stage38\'s own text' : 'the snapshot holds the same publish_cycle() text as the project') + ' (md5 ' + wantMd5.slice(0, 8) + '…)', md5Before);
await seed('inc_a');
const inc = await publish('inc_a', DAYS_ONLY);
const incRow = await rowData('inc_a');
ok(incRow.workouts && incRow.workouts.label === undefined && Object.keys(incRow.workouts).join() === 'days', 'the incident reproduces: a days-only p_workouts leaves workouts with no label', JSON.stringify(Object.keys(incRow.workouts)));
ok(inc.label === undefined, 'the old answer says nothing about the label');

// ── 2. the old function, kept ─────────────────────────────────────────────────────────────────────────────────────────────
section('2. The old function on a publish that carries its label (kept for step 4)');
await seed('eq_a'); await seedLog('eq_a');
const oldOut = await publish('eq_a', LABELLED, { log: true, patch: { 2: { message: { en: 'hello' } } } });
const oldRow = await rowText('eq_a'), oldLog = await logBody('eq_a'), oldFp = await fp('eq_a');
ok(oldOut.archived === 'prog2' && oldOut.log.section_at_end === true, 'archived prog2, log spliced', JSON.stringify(oldOut));
const oldGrants = (await q(`select has_function_privilege('anon','${SIG}','execute') a, has_function_privilege('authenticated','${SIG}','execute') u, has_function_privilege('service_role','${SIG}','execute') s`))[0];

// ── 3. the stage ──────────────────────────────────────────────────────────────────────────────────────────────────────────
section('3. The stage, twice, and its guard');
let applied = true;
try { await runSql(db, STAGE74, 'stage74 (1st)'); } catch (e) { applied = false; ok(false, 'applies', e.message); }
ok(applied, 'applies to the snapshot');
try { await runSql(db, STAGE74, 'stage74 (2nd)'); ok(true, 'safe to re-run (the guard recognises its own text)'); } catch (e) { ok(false, 'safe to re-run', e.message); }
ok((await src()).includes('label_filled'), 'the function now carries the label rule');
// The guard must refuse a function that is not stage38's text. In a transaction, so nothing stays.
await db.exec('begin');
await db.exec(`create or replace function public.publish_cycle(p_athlete_id text, p_workouts jsonb, p_notes jsonb, p_new_cycle boolean, p_cycle_patch jsonb default null, p_cycles jsonb default null, p_sport jsonb default null, p_log_section text default null, p_log_profile text default null, p_log_ledger text default null, p_log_new text default null) returns jsonb language plpgsql as $$ begin return '{}'::jsonb; end $$;`);
let refused = '';
try { await runSql(db, STAGE74, 'stage74 on a changed function'); } catch (e) { refused = e.message; }
await db.exec('rollback');
ok(/not the stage38 text/.test(refused), 'the guard refuses a publish_cycle() that is not stage38\'s', refused || '(it did not refuse)');
ok((await src()).includes('label_filled'), 'the rolled-back test left the stage in place');

// ── 4. identical when the label is sent ──────────────────────────────────────────────────────────────────────────────────
section('4. The new function on the same publish: nothing but the answer\'s two new keys differs');
await seed('eq_a'); await seedLog('eq_a');
const newOut = await publish('eq_a', LABELLED, { log: true, patch: { 2: { message: { en: 'hello' } } } });
ok(await rowText('eq_a') === oldRow, 'the stored programme is byte-identical');
ok(await logBody('eq_a') === oldLog, 'the coaching log is byte-identical');
ok(JSON.stringify((await fp('eq_a'))) === JSON.stringify(oldFp), 'the fingerprint is identical', JSON.stringify([oldFp, await fp('eq_a')]));
const { label: nl, label_filled: nf, ...rest } = newOut;
ok(JSON.stringify(rest) === JSON.stringify(oldOut), 'the answer is the old answer plus label and label_filled', JSON.stringify([rest, oldOut]));
ok(nl === 'Program 03 · Plate Armour' && nf === false, 'a label that was sent is kept and reported label_filled = false', JSON.stringify([nl, nf]));

// ── 5. the label rule ─────────────────────────────────────────────────────────────────────────────────────────────────────
section('5. The label rule');
await seed('fill_a');
const f1 = await publish('fill_a', DAYS_ONLY);
const d1 = await rowData('fill_a');
ok(d1.workouts.label === 'Program 03 · Plate Armour' && f1.label === 'Program 03 · Plate Armour' && f1.label_filled === true, 'days-only, new cycle: Program 03 · Plate Armour (the NEW cycle), label_filled = true', JSON.stringify(f1));
ok(Array.isArray(d1.workouts.days) && d1.workouts.days.length === 5, 'the days are the ones sent');
ok(d1.programHistory[0].label === 'Program 02 · Strength Engine', 'the archive still names the cycle that ended', d1.programHistory[0] && d1.programHistory[0].label);
await seed('cmp_a'); await publish('cmp_a', DAYS_ONLY);
const cmpFill = [await rowText('cmp_a'), JSON.stringify(await fp('cmp_a'))];
await seed('cmp_a'); await publish('cmp_a', LABELLED);
ok(cmpFill[0] === await rowText('cmp_a') && cmpFill[1] === JSON.stringify(await fp('cmp_a')),
   'a label-less publish ends up identical (data and fingerprint) to one that sent the same label');

for (const [what, bad] of [['null', null], ['empty', ''], ['blank', '   '], ['a number', 5], ['an object', {}], ['an array', []]]) {
  await seed('bad_a');
  const r = await publish('bad_a', { label: bad, days: days(2) });
  ok(r.label === 'Program 03 · Plate Armour' && r.label_filled === true, 'a label that is ' + what + ' is written', JSON.stringify(r.label));
}
await seed('keep_a');
const k = await publish('keep_a', { label: 'Program 03 · Month Three', days: days(2), extra: { a: 1 } });
const kd = await rowData('keep_a');
ok(kd.workouts.label === 'Program 03 · Month Three' && k.label_filled === false, 'a label somebody chose is kept, not overwritten by the cycle name');
ok(kd.workouts.extra && kd.workouts.extra.a === 1, 'other keys of workouts are kept');
await seed('first_a', { cci: 0, cycles: [{ name: 'Bedrock' }, { name: 'Next' }], workouts: undefined });
await q(`update public.programs set data = data - 'workouts' where athlete_id = 'first_a'`);
const fa = await publish('first_a', DAYS_ONLY, { newCycle: false });
ok(fa.label === 'Program 01 · Bedrock' && fa.currentCycleIndex === 0 && fa.archived === null, 'a new athlete (no num on the cycle, index 0): Program 01 · Bedrock', JSON.stringify(fa));
await seed('noname_a', { cci: 0, cycles: [{ num: 4 }], workouts: { label: 'old', days: days(1) } });
const nn = await publish('noname_a', DAYS_ONLY, { newCycle: false });
ok(nn.label === 'Program 04', 'a cycle with no name: Program 04, no dangling separator', nn.label);
await seed('patch_a');
const pa = await publish('patch_a', DAYS_ONLY, { patch: { 2: { name: 'Renamed In The Same Call' } } });
ok(pa.label === 'Program 03 · Renamed In The Same Call', 'the label reads the cycle AFTER the roadmap patch', pa.label);

// ── 6. refusals ───────────────────────────────────────────────────────────────────────────────────────────────────────────
section('6. Refusals leave the row untouched');
await seed('ref_a');
const before = await rowText('ref_a');
for (const [what, w] of [['no days', { label: 'x' }], ['an array', [1, 2]], ['null', null], ['days that is not an array', { label: 'x', days: {} }]]) {
  const r = await tryPublish('ref_a', w);
  ok(r.err && /must be the whole workouts object \{"label"/.test(r.err), 'p_workouts with ' + what + ' is refused with the whole shape named', r.err || JSON.stringify(r.out));
}
ok(await rowText('ref_a') === before, 'the row is exactly as it was');

// ── 7. grants and the way back ────────────────────────────────────────────────────────────────────────────────────────────
section('7. Grants and the way back');
const newGrants = (await q(`select has_function_privilege('anon','${SIG}','execute') a, has_function_privilege('authenticated','${SIG}','execute') u, has_function_privilege('service_role','${SIG}','execute') s`))[0];
ok(JSON.stringify(newGrants) === JSON.stringify(oldGrants) && !newGrants.a && !newGrants.u && newGrants.s, 'execute is unchanged: service_role only', JSON.stringify([oldGrants, newGrants]));
await runSql(db, STAGE38, 'stage38 (the way back)');
ok(!(await src()).includes('label_filled'), 'stage38 run again takes the label rule off');
await seed('back_a');
await publish('back_a', DAYS_ONLY);
ok((await rowData('back_a')).workouts.label === undefined, 'and the old behaviour is back (days-only loses the label)');
try { await runSql(db, STAGE74, 'stage74 after the way back'); ok(true, 'the stage goes on again over stage38\'s own commented text, LF (the guard knows it)'); } catch (e) { ok(false, 'the stage goes on again after stage38', e.message); }
await runSql(db, STAGE38.replace(/\n/g, '\r\n'), 'stage38 sent as it sits in the Windows tree (CRLF)');
try { await runSql(db, STAGE74, 'stage74 after a CRLF stage38'); ok(true, 'and over the same text sent with CRLF line ends'); } catch (e) { ok(false, 'the stage goes on again after a CRLF stage38', e.message); }
await seed('back_b');
const bb = await publish('back_b', DAYS_ONLY);
ok(bb.label === 'Program 03 · Plate Armour' && bb.label_filled === true, 'and the label rule works again');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
