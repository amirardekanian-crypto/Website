// Career Mode, phase 2 (the XP switch), rehearsed away from the live project (supabase/stage69_career_xp_switch.sql; career/PROCEDURES.md → P14 and
// "Phase 2, as built").
//
//     PGLITE=<scratch>/node_modules/@electric-sql/pglite node scripts/career/rehearse_switch.mjs --backup <aa-backup-YYYY-MM-DD.json> [--report <file>]
//
// PGlite is a real PostgreSQL compiled to WebAssembly (install it in a scratch folder: scripts/restore/lib.mjs, the top). Nothing here touches a real
// project. The backup is coach.html's ⤓ Backup (or the same shape): the real rows, read here and never written anywhere but this process's memory;
// --report writes the switch's list (each athlete's level in AA Proof against the career level after the switch) to a file: keep it outside the repo.
//
// What it does, in order: the live project as it stands before stage69 (the schema snapshot, the backup's rows, stage66 and the phase 1 seed made
// from the committed files at HEAD), then
//   1. stage69 twice, then the seed of the working files ([switch] xp = "off"): nothing an athlete sees moves (the board, Proof's level, the profile);
//   2. Season 1 starts with the switch off: Proof's own season record, as before;
//   3. the switch, dry run first (the list, then nothing changed), then for real: nobody's level goes down, the WORKOUT habit pays 0 a day, training
//      pays, the board ranks season points with career levels, the road's titles follow the career level, the compare still holds;
//   4. the switch seed again (nothing new), a switch turned back off and a day still to come (both refused);
//   5. settling: a closed day's change keeps its fact, an open day's moves it; the compare calls that row settled, not failed;
//   6. a season closing under the switch, an erasure, the score cache's timing, the way back (scripts/career/rollback_stage69.sql).
// Exit code 1 if anything failed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { snapshotBefore } from './snapshot_before.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const COACH_JWT = JSON.stringify({ email: 'amirardekanian@gmail.com', role: 'authenticated', sub: '00000000-0000-4000-8000-00000000c0c0' });
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const BACKUP = opt('--backup'), REPORT = opt('--report');
// The commit the live project's phase 1 rulebook was seeded from (2026-10-17, rulebook version 1: the phase 1 note). --phase1 <rev> for another.
const PHASE1 = opt('--phase1') || '94cdc89';
// The career files phase 2 was built with (rulebook version 2, both switches off): what "the working files" were when this was written. Since
// the XP switch went on (version 3, b8837cf) the working files are later than that; --files <rev> for another, `--files work` for the tree.
const FILES = opt('--files') || '08e4f41';
const filesFor = () => filesAt(FILES === 'work' ? null : FILES);

let passed = 0, failed = 0;
function ok(cond, what, detail) {
  if (cond) { passed++; console.log('  ok   ' + what); }
  else { failed++; console.log('  FAIL ' + what + (detail ? '\n         ' + String(detail).split('\n').join('\n         ') : '')); }
}
const section = s => console.log('\n' + s);
const q = async (db, sql, params) => (await db.query(sql, params)).rows;
const one = async (db, sql, params) => (await q(db, sql, params))[0];
const asCoach = db => q(db, `select set_config('request.jwt.claims', $1, false)`, [COACH_JWT]);
const asNobody = db => q(db, `select set_config('request.jwt.claims', '', false)`);
const asAthlete = (db, sub, id) => q(db, `select set_config('request.jwt.claims', $1, false)`,
                                     [JSON.stringify({ sub, role: 'authenticated', email: `athlete.${id}@amirardekani.com` })]);

function py(argv, opts = {}) {
  for (const exe of [process.env.PYTHON, 'python', 'python3'].filter(Boolean)) {
    const r = cp.spawnSync(exe, ['-X', 'utf8', ...argv], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
    if (r.error && r.error.code === 'ENOENT') continue;
    if (r.status === 9009 || /Microsoft Store|was not found/i.test(r.stderr || '')) continue;
    return r;
  }
  throw new Error('No python found. Set PYTHON to its path.');
}
const seedSql = out => out.replace(/;\s*$/, '').replace(/^--[^\n]*\n/, '') + ' as r';
async function load(db, table, rows) {
  if (!rows || !rows.length) return 0;
  await db.query(`insert into public.${table} select * from jsonb_populate_recordset(null::public.${table}, $1::jsonb)`, [JSON.stringify(rows)]);
  return rows.length;
}
function ymd(d) { return d.toISOString().slice(0, 10); }
function addDays(day, n) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); }
const ms = async (fn) => { const t = Date.now(); const r = await fn(); return [r, Date.now() - t]; };

// The career files of a commit (PHASE1: what the live project was seeded from) or of the working tree, with their own checker and seed script,
// in a scratch folder; and a working copy of the career folder with one rulebook change (the switch).
function filesAt(rev) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'career-' + (rev || 'work') + '-'));
  fs.mkdirSync(path.join(dir, 'career')); fs.mkdirSync(path.join(dir, 'scripts')); fs.mkdirSync(path.join(dir, 'supabase'));
  const want = ['rulebook', 'badges', 'achievements', 'titles', 'missions', 'quests', 'recognition'].map(f => `career/${f}.toml`)
    .concat(['scripts/check_career.py', 'scripts/career_seed.py', 'supabase/xp_rules_snapshot.json']);
  for (const f of want) {
    const body = rev ? cp.execFileSync('git', ['show', `${rev}:${f}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 << 20 })
                     : fs.readFileSync(path.join(ROOT, f), 'utf8');
    fs.writeFileSync(path.join(dir, f), body.replace(/\r\n/g, '\n'));
  }
  return dir;
}
function seedFrom(dir, extra = []) {
  const r = py([path.join(dir, 'scripts', 'career_seed.py'), path.join(dir, 'career'), ...extra]);
  if (r.status !== 0) throw new Error('career_seed.py failed:\n' + r.stderr);
  return r.stdout;
}
function withRulebook(dir, edit) {
  const f = path.join(dir, 'career', 'rulebook.toml');
  fs.writeFileSync(f, edit(fs.readFileSync(f, 'utf8')));
}

// The server's answers to what the two phones copy (P13, P17), on fixed inputs: scripts/career/xp_cases.json. Run with the XP switch on.
//   levels    career_level() over XP values that cross levels, ranks and a prestige (habits.html levelInfo() on the career's curve,
//             program.html careerLevelOf())
//   paid      one value of one habit on one day, through hab_xp() with career_paid_rules(): the WORKOUT habit pays 0 (habits.html paidXp())
//   sessions  career_session_want()'s facts for a session as the app saves it (program.html careerFullLog(), careerCheckin(), the early rule)
const CASE_XP = [0, 1, 399, 400, 401, 989, 990, 991, 1720, 5000, 9999, 10000, 25000, 47260, 60000, 99999, 123456, 250000, 400000, 750000, 1000000];
const CASE_PAID = [['strength', 1], ['strength', 0.5], ['steps', 10000], ['steps', 5000], ['steps', 12000], ['sleep', 7.5], ['sleep', 6], ['fuel', 3],
  ['fuel', 1], ['water', 8], ['water', 4], ['water', 0], ['mobility', 1], ['breathe', 1], ['supps', 1], ['c_zz_read', 1]];
const ANSWERED = { composite: 4, sleep: 4, energy: 4, soreness: 4, stress: 3, overall: 4, skipped: false };
const setOf = (d, r) => ({ w: '40', n: 8, r, d });
const CASE_SESSIONS = [
  { name: 'complete, every set ticked and rated, checked in', status: 'Complete', readiness: ANSWERED,
    log: [{ ex: 'Goblet Squat', sets: [setOf(true, '8'), setOf(true, '8')] }, { ex: 'Row', sets: [setOf(true, '7'), setOf(true, '7')] }] },
  { name: 'complete, one set not ticked', status: 'Complete', readiness: ANSWERED,
    log: [{ ex: 'Goblet Squat', sets: [setOf(true, '8'), setOf(false, '')] }] },
  { name: 'complete, an exercise rated on one set only', status: 'Complete', readiness: null,
    log: [{ ex: 'Goblet Squat', sets: [setOf(true, '8'), setOf(true, '')] }, { ex: 'Row', sets: [setOf(true, ''), setOf(true, '')] }] },
  { name: 'complete, nothing rated anywhere, every set ticked', status: 'Complete', readiness: { skipped: true, composite: null },
    log: [{ ex: 'Goblet Squat', sets: [setOf(true, ''), setOf(true, '')] }] },
  { name: 'finished early, every set ticked and rated', status: 'Partial (4 of 8 sets/units done) · Out of time', readiness: ANSWERED,
    log: [{ ex: 'Goblet Squat', sets: [setOf(true, '8'), setOf(true, '8')] }] },
  { name: 'finished early, lower case and a space', status: ' partial (1 of 9 sets/units done)', readiness: ANSWERED,
    log: [{ ex: 'Goblet Squat', sets: [setOf(true, '8')] }] },
  { name: 'a circuit only: rounds, no sets', status: 'Complete', readiness: ANSWERED,
    log: [{ ex: 'Finisher', circuit: true, items: [{ name: 'Burpee', w: '' }], rounds: [{ round: 1, r: '8' }] }] },
  { name: 'a circuit and a lift', status: 'Complete', readiness: ANSWERED,
    log: [{ ex: 'Finisher', circuit: true, items: [], rounds: [] }, { ex: 'Row', sets: [setOf(true, '7')] }] },
  { name: 'no structured log (an old session)', status: 'Complete', readiness: ANSWERED, log: null },
  { name: 'an empty log', status: 'Complete', readiness: ANSWERED, log: [] },
  { name: 'a lift with no sets', status: 'Complete', readiness: ANSWERED, log: [{ ex: 'Row', sets: [] }] },
  { name: 'a set that is not an object', status: 'Complete', readiness: ANSWERED, log: [{ ex: 'Row', sets: [5, setOf(true, '8')] }] },
  { name: 'ticks written as text and numbers', status: 'Complete', readiness: ANSWERED,
    log: [{ ex: 'Row', sets: [{ w: '40', n: 8, r: 8, d: 1 }, { w: '40', n: 8, r: '8', d: 'yes' }] }] },
  { name: 'a check-in with no number in it', status: 'Complete', readiness: { skipped: false, composite: null, sleep: null },
    log: [{ ex: 'Row', sets: [setOf(true, '')] }] },
  { name: 'a check-in with only a score', status: 'Complete', readiness: { score: 3 },
    log: [{ ex: 'Row', sets: [setOf(true, '')] }] },
];
async function serverCases(db, today) {
  const rules = (await one(db, `select public.career_rules_now() as r`)).r;
  const levels = [];
  for (const xp of CASE_XP) levels.push({ xp, ...(await one(db, `select public.career_level($1::bigint, public.career_rules_now()) as l`, [xp])).l });
  const paid = [];
  for (const [habit, v] of CASE_PAID) {
    const xp = Number((await one(db, `select public.hab_xp(jsonb_build_object('2026-01-05', jsonb_build_object($1::text, $2::numeric)), null, null,
                                       public.career_paid_rules(public.career_habit_rules(), public.career_rules_now())) as x`, [habit, v])).x);
    paid.push({ habit, v, xp });
  }
  const U = '10000000-0000-4000-8000-0000000000c5';
  await q(db, `insert into auth.users (id, email) values ($1, 'athlete.zz_cases@amirardekani.com') on conflict do nothing`, [U]);
  await q(db, `insert into public.athlete_identities (user_id, athlete_id, email) values ($1, 'zz_cases', null) on conflict do nothing`, [U]);
  await asAthlete(db, U, 'zz_cases');
  for (let i = 0; i < CASE_SESSIONS.length; i++) {
    const c = CASE_SESSIONS[i];
    await q(db, `select public.save_session('zz_cases', 'Zed Cases', 1, $1::date, $2::jsonb, null)`,
            [addDays(today, -40 - i), JSON.stringify({ status: c.status, readiness: c.readiness, log: c.log, duration_min: 30 })]);
  }
  await asNobody(db);
  const want = (await one(db, `select public.career_session_want('zz_cases') as w`)).w || [];
  const sessions = CASE_SESSIONS.map((c, i) => {
    const ref = 'd1|' + addDays(today, -40 - i);
    return { ...c, facts: want.filter(f => f.ref === ref).map(f => f.kind).sort() };
  });
  await asCoach(db);
  await one(db, `select public.coach_erase_person('athlete', 'zz_cases', 'zz_cases', '{}'::uuid[], false) as r`);
  await asNobody(db);
  return {
    about: 'What the two phones copy from the server in Career Mode phase 2 (P13, P17), and the server\'s own answers on fixed inputs. Written by '
      + 'node scripts/career/rehearse_switch.mjs --write-cases (the rehearsal checks them every run); held by scripts/check_twins.js against '
      + 'habits.html (levelInfo() on the career\'s curve, paidXp()) and program.html (careerLevelOf(), careerFullLog(), careerCheckin(), the early rule). '
      + 'levels: career_level(). paid: hab_xp() of one value on one day with career_paid_rules() and the XP switch on (the WORKOUT habit pays 0). '
      + 'sessions: the facts career_session_want() makes of a session as the app saves it. Change a rule on both sides, then here.',
    rules: { level: rules.level },
    levels, paid, sessions,
  };
}

async function main() {
  if (!BACKUP) throw new Error('--backup <aa-backup-YYYY-MM-DD.json> is required: the real rows the switch is rehearsed on');
  const db = await openDb();
  const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
  const today = (await one(db, `select current_date::text as d`)).d;

  section('0. the live project before stage69');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  await runSql(db, read(path.join(ROOT, 'supabase', 'schema_snapshot.sql')), 'snapshot');
  // the snapshot is the live structure: take it back to just before stage69 (scripts/career/snapshot_before.mjs)
  const undone = await snapshotBefore(db, 69, ROOT);
  if (undone.length) console.log('  (the snapshot taken back from stage ' + undone.join(', ') + ')');
  const T = backup.tables || {};
  const n = {};
  for (const t of ['seasons', 'xp_rules', 'programs', 'program_versions', 'library_sessions', 'athlete_status', 'hab_titles', 'leaderboard_optin',
                   'hab_season_results', 'athlete_progress', 'session_history']) n[t] = await load(db, t, T[t] || []);
  ok(backup.complete === true, `the backup is complete (${backup.exported_at}); loaded ` + Object.entries(n).map(([t, k]) => `${t} ${k}`).join(', '));
  // rows loaded with their ids leave a serial behind them: move it past the newest, as a restore does
  await q(db, `select setval(pg_get_serial_sequence('public.seasons', 'id'), greatest((select max(id) from public.seasons), 1))`);
  // the backup predates stage66; the live project has had it since 2026-10-17, seeded from the files at HEAD
  const s66 = read(path.join(ROOT, 'supabase', 'stage66_career_mode.sql'));
  await runSql(db, s66, 'stage66');
  const head = filesAt(PHASE1);
  const v1 = (await one(db, seedSql(seedFrom(head)))).r;
  ok(v1 && v1.version === 1, `stage66 and the phase 1 seed from ${PHASE1}'s files (what the live project was seeded from): rulebook ${v1 && v1.version}, ${v1 && v1.catalogue} catalogue rows, `
     + `${Object.values((v1 && v1.backfill && v1.backfill.facts) || {}).reduce((a, b) => a + b, 0)} facts`);
  let cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.ok, `phase 1's shadow check holds on the real rows: ${cmp.matched} of ${cmp.athletes}`, cmp.rows.filter(r => !r.ok).map(r => JSON.stringify(r)).join('\n'));

  const ids = (await q(db, `select distinct athlete_id as id from public.career_facts order by 1`)).map(r => r.id);
  const proofIds = (await q(db, `select athlete_id as id from public.athlete_progress where data ? (athlete_id || '_hab_log') order by 1`)).map(r => r.id);
  await asCoach(db);
  const board0 = { season: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`),
                   week: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'week', 50)`) };
  const levels0 = Object.fromEntries((await q(db, `select * from public.coach_season_levels($1)`, [proofIds])).map(r => [r.athlete_id, r.level]));
  await asNobody(db);
  const prof0 = {};
  for (const id of ids) prof0[id] = (await one(db, `select public.get_profile($1) as p`, [id])).p;
  const erase0 = (await one(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).d;
  // a function's text as the database prints it; the files carry CRLF or LF as the checkout made them, which changes nothing it does
  const defs = async names => Object.fromEntries((await q(db, `select p.proname as n, pg_get_functiondef(p.oid) as d from pg_proc p
      join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = any($1)`, [names])).map(r => [r.n, r.d.replace(/\r/g, '')]));
  const before = await defs(['hab_season_level', 'coach_season_levels', 'leaderboard_top', 'hab_close_season', 'career_score', 'career_facts_xp',
                             'career_settled_before', 'get_profile', 'career_compare', 'career_seed']);

  section('1. stage69, twice, then the seed of the working files (both switches off)');
  const s68 = read(path.join(ROOT, 'supabase', 'stage69_career_xp_switch.sql'));
  await runSql(db, s68, 'stage69');
  await runSql(db, s68, 'stage69 again');
  ok(true, 'stage69 applied, and applied again without an error');
  const erase1 = (await one(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).d;
  ok((erase1.match(/'career_scores'/g) || []).length === 1 && erase1.replace(`'career_facts', 'career_scores']`, `'career_facts']`) === erase0,
     'coach_erase_person() learns career_scores exactly once, and nothing else in it moves');
  const work = filesFor();
  const v2 = (await one(db, seedSql(seedFrom(work)))).r;
  ok(v2 && v2.version === 2 && v2.switch && v2.switch.xp === 'off' && v2.switch.catalogue === 'off' && !v2.turned_on && !v2.levels,
     `the working files seed as rulebook 2, both switches off (backfill: ${JSON.stringify(v2 && v2.backfill && v2.backfill.athletes)} athletes)`, JSON.stringify(v2));
  cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.ok && cmp.settled === 0, `the shadow check still holds: ${cmp.matched} of ${cmp.athletes}`, cmp.rows.filter(r => !r.ok).map(r => JSON.stringify(r)).join('\n'));
  await asCoach(db);
  const board1 = { season: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`),
                   week: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'week', 50)`) };
  const levels1 = Object.fromEntries((await q(db, `select * from public.coach_season_levels($1)`, [proofIds])).map(r => [r.athlete_id, r.level]));
  await asNobody(db);
  ok(JSON.stringify(board1) === JSON.stringify(board0), `with the switch off the board is exactly as before (${board1.season.length} on it, both scopes)`);
  ok(JSON.stringify(levels1) === JSON.stringify(levels0), `and every athlete's level in Proof is as before (${Object.keys(levels1).length})`);
  const offProf = [];
  for (const id of ids) {
    const p = (await one(db, `select public.get_profile($1) as p`, [id])).p, a = prof0[id];
    if (p.career.xp !== a.career.xp || p.career.level !== a.career.level || p.season.points !== a.season.points || p.switch.xp !== null || p.shadow !== true)
      offProf.push(`${id}: before ${a.career.xp}/${a.career.level}/${a.season.points}, after ${p.career.xp}/${p.career.level}/${p.season.points}`);
  }
  ok(offProf.length === 0, `get_profile() answers every athlete as phase 1 did (${ids.length}), now from the cache, with the switches and the prices`, offProf.join('\n'));
  const big = (await one(db, `select athlete_id as id from public.career_facts where void_at is null group by 1 order by count(*) desc limit 1`)).id;
  const stamp = async id => (await one(db, `select stamp from public.career_scores where athlete_id = $1`, [id]) || {}).stamp;
  const st1 = await stamp(big);
  const [pWarm, tWarm] = await ms(() => one(db, `select public.get_profile($1) as p`, [big]));
  ok(st1 && st1 === await stamp(big), `a second read comes from the cache: the stamp holds (${big}: ${tWarm} ms warm here)`);
  ok(pWarm.p.rules && pWarm.p.rules.prices && pWarm.p.rules.prices.session_finished === 400 && pWarm.p.rules.level.base === 400 && pWarm.p.since,
     `the profile carries the prices (${JSON.stringify(pWarm.p.rules.prices)}), the curve, and since ${pWarm.p.since}`);

  section('2. Season 1 starts with the switch off: Proof\'s own record, as before');
  await asCoach(db);
  const started = await q(db, `select * from public.start_season('Season 1', current_date)`);
  await asNobody(db);
  const recs = await q(db, `select athlete_id, level, xp from public.hab_season_results order by athlete_id`);
  ok(started.length === 1 && started[0].name === 'Season 1' && recs.length > 0 && recs.every(r => r.level >= 1),
     `Season 1 started (${started[0] && started[0].starts_on}); Pre-Season archived for ${recs.length} athletes, Proof's levels (best ${Math.max(...recs.map(r => r.level))})`);
  const seasonTitles = Number((await one(db, `select count(*) as n from public.hab_titles where title like 't_sn_%'`)).n);
  ok(seasonTitles === recs.filter(r => r.level >= 5).length, `Pre-Season's title went to the ${seasonTitles} who reached level 5, Proof's rule`);

  // a made-up athlete who trains in Season 1 before the switch: a programme, a session today, the Proof log (WORKOUT ticked)
  const U1 = '10000000-0000-4000-8000-0000000000b1';
  await q(db, `insert into auth.users (id, email) values ($1, 'athlete.zz_s1@amirardekani.com')`, [U1]);
  await q(db, `insert into public.athlete_identities (user_id, athlete_id, email) values ($1, 'zz_s1', null)`, [U1]);
  await q(db, `insert into public.programs (athlete_id, data) values ('zz_s1', $1::jsonb)`, [JSON.stringify({
    athlete: { firstName: 'Zed', lastName: 'Season' }, currentCycleIndex: 0,
    cycles: [{ num: 1, startDate: addDays(today, -20), endDate: addDays(today, 14) }],
    workouts: { days: [{ id: 1, blocks: [] }, { id: 2, blocks: [] }] } })]);
  await asAthlete(db, U1, 'zz_s1');
  const set = { ex: 'Goblet Squat', block: 'A', reps: '8', sets: [{ w: '20', n: 8, r: 7, d: true }, { w: '20', n: 8, r: 7, d: true }] };
  await q(db, `select public.save_session('zz_s1', 'Zed Season', 1, current_date, $1::jsonb, null)`, [JSON.stringify({
    status: 'Complete', duration_min: 40, readiness: { composite: 4, sleep: 4, energy: 4, soreness: 4, stress: 3, overall: 4 }, log: [set] })]);
  const zlog = {}; for (let i = 0; i < 12; i++) zlog[addDays(today, -i)] = { water: 8, sleep: 8, steps: 11000 };
  zlog[today].strength = 1;
  await q(db, `select public.save_progress('zz_s1', 'Zed Season', $1::jsonb, null, null)`, [JSON.stringify({ zz_s1_hab_log: JSON.stringify(zlog),
    zz_s1_hab_cfg: JSON.stringify({ on: { fuel: false, mobility: false, breathe: false, supps: false } }) })]);
  await asNobody(db);
  const zBefore = (await one(db, `select public.get_profile('zz_s1') as p`)).p;
  ok(zBefore.season.parts.facts.session_finished && zBefore.season.parts.facts.session_finished.xp === 400,
     `in shadow the session already counts in Career Mode's season (${zBefore.season.points} points), beside WORKOUT's 120`);

  section('3. the switch: the dry run (the list), then for real');
  const sw = filesFor();
  withRulebook(sw, t => t.replace(/^version = 2$/m, 'version = 3').replace(/^xp = "off"$/m, `xp = "${today}"`));
  const dryOut = (await one(db, seedSql(seedFrom(sw, ['--dry-run'])))).r;
  const list = (dryOut && dryOut.levels) || [];
  ok(dryOut && dryOut.dry_run === true && dryOut.turned_on === 'xp' && list.length >= ids.length,
     `the dry run answers every athlete's line (${list.length}) and says it was a dry run`, JSON.stringify(dryOut && { ...dryOut, levels: undefined }));
  ok((await one(db, `select max(version) as v from public.career_rules`)).v === 2
     && Number((await one(db, `select count(*) as n from public.career_facts where kind = 'level_kept'`)).n) === 0
     && (await one(db, `select public.get_profile($1) as p`, [big])).p.switch.xp === null,
     'and after it nothing changed: rulebook 2, no level kept, the switch off');
  ok(dryOut && dryOut.backfill && dryOut.backfill.skipped, 'a seed that only turns a switch on runs no backfill (no fact depends on it)', JSON.stringify(dryOut && dryOut.backfill));
  const lines = list.map(r => ({ ...r, best: Math.max(r.proof_record || 0, r.proof_now || 0) }));
  const up = lines.filter(r => r.level > r.best).length, same = lines.filter(r => r.best && r.level === r.best).length;
  const kept = lines.filter(r => r.kept_xp);
  console.log(`         the list: ${lines.length} athletes; ${up} go up, ${same} stay, ${kept.length} kept at their Proof level by a top-up`);
  for (const r of lines.filter(x => x.best).sort((a, b) => (b.level - b.best) - (a.level - a.best)))
    console.log(`           ${String(r.name || r.athlete_id).padEnd(22)} Proof ${String(r.proof_now).padStart(2)} (record ${r.proof_record == null ? '-' : r.proof_record})`
                + ` → career ${String(r.career_level).padStart(2)}${r.kept_xp ? ` → kept at ${r.level} (+${r.kept_xp} XP)` : ''}`);
  if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ today, lines }, null, 1));

  const real = (await one(db, seedSql(seedFrom(sw)))).r;
  ok(real && !real.dry_run && real.turned_on === 'xp' && real.switch.xp === today, `the switch, for real: rulebook ${real && real.version}, the XP switch on since ${real && real.switch.xp}`);
  const down = [], wrongKept = [];
  for (const r of real.levels) {
    const best = Math.max(r.proof_record || 0, r.proof_now || 0);
    if (r.level < best) down.push(`${r.athlete_id}: Proof ${best}, career ${r.level}`);
    const fact = await one(db, `select value from public.career_facts where athlete_id = $1 and kind = 'level_kept' and void_at is null`, [r.athlete_id]);
    if (Boolean(fact) !== Boolean(r.kept_xp) || (fact && (fact.value.level !== best || fact.value.xp !== r.kept_xp))) wrongKept.push(`${r.athlete_id}: ${JSON.stringify({ r, fact })}`);
  }
  ok(down.length === 0, `nobody's level goes down: every athlete is at or above the highest level they reached in Proof (${real.levels.length})`, down.join('\n'));
  ok(wrongKept.length === 0, `one level_kept fact for each athlete who needed one (${real.levels.filter(r => r.kept_xp).length}), worth the XP to the start of that level`, wrongKept.join('\n'));
  ok(JSON.stringify(real.levels) === JSON.stringify(dryOut.levels), 'the real switch gives exactly the list the dry run showed');

  // every athlete's profile: the career level of the list, the WORKOUT habit paying 0 a day, the level kept outside the season
  const off = [];
  for (const r of real.levels) {
    const p = (await one(db, `select public.get_profile($1) as p`, [r.athlete_id])).p, a = prof0[r.athlete_id];
    if (!p.ready) continue;
    if (p.career.level !== r.level || p.switch.xp !== today || p.shadow !== false) off.push(`${r.athlete_id}: profile level ${p.career.level}, list ${r.level}`);
    if (a) {
      const days = Number((await one(db, `select count(*) as n from public.career_facts where athlete_id = $1 and kind = 'habit_done' and void_at is null
                                            and ref like '%|strength' and (value ->> 'v') ~ '^[0-9.]+$' and (value ->> 'v')::numeric >= 1`, [r.athlete_id])).n);
      const want = a.career.xp - 120 * days + (r.kept_xp || 0);
      if (p.career.xp !== want) off.push(`${r.athlete_id}: career ${p.career.xp}, expected ${a.career.xp} − 120 × ${days} WORKOUT days + ${r.kept_xp || 0} kept = ${want}`);
      if (r.kept_xp && p.season.parts.facts.level_kept) off.push(`${r.athlete_id}: the level kept counts in the season`);
    }
    if (r.kept_xp && !(p.kept && p.kept.xp === r.kept_xp)) off.push(`${r.athlete_id}: the profile does not carry the level kept`);
  }
  ok(off.length === 0, 'every profile has the list\'s level; the WORKOUT habit pays 0 a day (career XP = phase 1\'s − 120 a WORKOUT day + the level kept); the level kept is no season\'s points', off.join('\n'));
  const zAfter = (await one(db, `select public.get_profile('zz_s1') as p`)).p;
  ok(zAfter.season.points === zBefore.season.points - 120 && zAfter.season.parts.facts.session_finished.xp === 400,
     `Season 1 worked out again under the new rules: the session done before the switch pays 400 and WORKOUT 0 (${zBefore.season.points} → ${zAfter.season.points})`);
  cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.ok && cmp.settled === 0 && cmp.xp_switch === today, `the compare holds after the switch, both sides paying WORKOUT 0 (${cmp.matched} of ${cmp.athletes})`,
     cmp.rows.filter(r => !r.ok).map(r => JSON.stringify(r)).join('\n'));

  // the board: season points with career levels; the coach's list; the road's titles
  await asCoach(db);
  const board2 = await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`);
  const week2 = await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'week', 50)`);
  const lv2 = Object.fromEntries((await q(db, `select * from public.coach_season_levels($1)`, [proofIds])).map(r => [r.athlete_id, r.level]));
  await asNobody(db);
  const byName = Object.fromEntries((await q(db, `select athlete_id, display_name from public.leaderboard_optin`)).map(r => [r.display_name, r.athlete_id]));
  const boardOff = [];
  for (const row of board2) {
    const id = byName[row.display_name], p = (await one(db, `select public.get_profile($1) as p`, [id])).p;
    if (Number(row.xp) !== p.season.points || row.level !== p.career.level || row.rank_label !== p.career.rank) boardOff.push(`${row.display_name}: board ${row.xp}/${row.level}/${row.rank_label}, profile ${p.season.points}/${p.career.level}/${p.career.rank}`);
  }
  for (const row of week2) {
    const p = (await one(db, `select public.get_profile($1) as p`, [byName[row.display_name]])).p;
    if (Number(row.xp) !== p.week.points) boardOff.push(`${row.display_name}: week board ${row.xp}, profile ${p.week.points}`);
  }
  ok(board2.length === board1.season.length && boardOff.length === 0 && board2.every((r, i) => i === 0 || Number(board2[i - 1].xp) >= Number(r.xp)),
     `the board ranks Season 1's points with each athlete's career level and rank, both scopes (${board2.length} on it)`, boardOff.join('\n'));
  const lvOff = proofIds.filter(id => lv2[id] !== (real.levels.find(r => r.athlete_id === id) || {}).level);
  ok(lvOff.length === 0, `coach_season_levels() shows the career level (${proofIds.length})`, lvOff.map(id => `${id}: ${lv2[id]}`).join('\n'));
  const top = real.levels.slice().sort((a, b) => b.level - a.level)[0];
  await asCoach(db);
  const titles = (await q(db, `select * from public.claim_titles($1)`, [top.athlete_id])).map(r => r.title);
  await asNobody(db);
  const road = ((T.xp_rules[0] || {}).rules || {}).passTrack || [];
  const owed = road.filter(t => t.kind === 'title' && t.lv > 0 && t.lv <= top.level).map(t => t.id);
  ok(owed.every(t => titles.includes(t)), `the road's titles follow the career level: ${top.athlete_id} at ${top.level} holds ${owed.length} of them`, JSON.stringify({ owed, titles }));

  section('3b. the twins\' cases: what the phones copy, answered by the server (scripts/career/xp_cases.json)');
  // The curve (career_level()), a value's daily XP with the switch on (hab_xp() with career_paid_rules()), and a session's own facts
  // (career_session_want()). scripts/check_twins.js holds habits.html and program.html to these answers; this holds the answers to the server.
  const casesNow = await serverCases(db, today);
  const casesFile = path.join(ROOT, 'scripts', 'career', 'xp_cases.json');
  if (args.includes('--write-cases')) {
    fs.writeFileSync(casesFile, JSON.stringify(casesNow, null, 1) + '\n');
    ok(true, `wrote ${path.relative(ROOT, casesFile)}: ${casesNow.levels.length} levels, ${casesNow.paid.length} values, ${casesNow.sessions.length} sessions`);
  } else {
    const onDisk = fs.existsSync(casesFile) ? JSON.parse(fs.readFileSync(casesFile, 'utf8')) : null;
    const strip = c => c && JSON.stringify({ rules: c.rules, levels: c.levels, paid: c.paid, sessions: c.sessions });
    ok(onDisk && strip(onDisk) === strip(casesNow), 'scripts/career/xp_cases.json is the server\'s answer today (rewrite it with --write-cases after a deliberate change)',
       onDisk ? 'they differ' : 'the file is missing');
  }

  section('4. again, and what the seed refuses');
  const again = (await one(db, seedSql(seedFrom(sw)))).r;
  ok(again && !again.turned_on && again.backfill.skipped && Number((await one(db, `select count(*) as n from public.career_facts where kind = 'level_kept'`)).n) === real.levels.filter(r => r.kept_xp).length,
     'the switch seed again: nothing turned on, no backfill, no new level kept');
  let refusedOff = '', refusedFuture = '', refusedCat = '';
  const offAgain = filesFor();
  withRulebook(offAgain, t => t.replace(/^version = 2$/m, 'version = 4'));
  try { await one(db, seedSql(seedFrom(offAgain))); } catch (e) { refusedOff = e.message; }
  const future = filesFor();
  withRulebook(future, t => t.replace(/^version = 2$/m, 'version = 4').replace(/^xp = "off"$/m, `xp = "${addDays(today, 3)}"`));
  try { await one(db, seedSql(seedFrom(future))); } catch (e) { refusedFuture = e.message; }
  try {
    await one(db, `select public.career_seed(5, (select rules from public.career_rules where version = 3) || '{"version": 5, "switch": {"xp": "off", "catalogue": "${today}"}}'::jsonb,
                   (select jsonb_agg(jsonb_build_object('kind', kind, 'id', id, 'body', body)) from public.career_catalogue), 'test')`);
  } catch (e) { refusedCat = e.message; }
  ok(/never turned back off/.test(refusedOff), 'a seed that turns the XP switch back off is refused', refusedOff);
  ok(/still to come/.test(refusedFuture), 'a switch day still to come is refused', refusedFuture);
  ok(/never turned back off|needs the XP switch/.test(refusedCat), 'the catalogue switch with the XP switch off is refused', refusedCat);
  ok((await one(db, `select max(version) as v from public.career_rules`)).v === 3, 'and none of them changed anything (rulebook 3)');

  section('5. settling: a closed day keeps its fact, an open day moves');
  const settle = (await one(db, `select public.career_settled_before(public.career_rules_now())::text as d`)).d;
  ok(settle === addDays(today, -4), `a day closes once it leaves the backfill window: before ${settle}`);
  await asAthlete(db, U1, 'zz_s1');
  const closed = addDays(today, -8);
  const zlog2 = { ...zlog, [closed]: { ...zlog[closed], water: 3 }, [today]: { ...zlog[today], water: 5 } };
  await q(db, `select public.save_progress('zz_s1', 'Zed Season', $1::jsonb, null, null)`, [JSON.stringify({ zz_s1_hab_log: JSON.stringify(zlog2) })]);
  await asNobody(db);
  const fv = async d => (await one(db, `select value ->> 'v' as v from public.career_facts where athlete_id = 'zz_s1' and kind = 'habit_done' and ref = $1`, [d + '|water'])).v;
  ok(await fv(closed) === '8' && await fv(today) === '5', `the closed day (${closed}) keeps water 8 as it stood; today's moves to 5`);
  cmp = (await one(db, `select public.career_compare() as r`)).r;
  const zrow = cmp.rows.find(r => r.athlete_id === 'zz_s1');
  ok(cmp.ok && zrow && zrow.settled === true && zrow.closed === 1, `the compare calls that athlete settled (1 closed day differs), not failed; ok holds`, JSON.stringify(zrow));

  section('6. a season closing under the switch, an erasure, the cost, the way back');
  await asCoach(db);
  const closedN = (await one(db, `select public.hab_close_season(current_date) as n`)).n;
  await asNobody(db);
  const s1 = await q(db, `select athlete_id, level, xp from public.hab_season_results where season_name = 'Season 1' order by athlete_id`);
  const s1off = [];
  for (const r of s1) {
    const p = (await one(db, `select public.get_profile($1) as p`, [r.athlete_id])).p;
    if (Number(r.xp) !== p.season.points || r.level !== p.career.level) s1off.push(`${r.athlete_id}: record ${r.xp}/${r.level}, profile ${p.season.points}/${p.career.level}`);
  }
  const s1t = Number((await one(db, `select count(*) as n from public.hab_titles where title = 't_sn_' || to_char(current_date, 'YYYYMMDD')`)).n);
  ok(closedN === s1.length && s1.length > 0 && s1off.length === 0 && s1t === s1.filter(r => Number(r.xp) >= 2000).length,
     `a season closing under the switch keeps its points and the career level (${s1.length} records), and its title goes to ${s1t} with 2,000 points or more`, s1off.join('\n'));
  await q(db, `delete from public.hab_season_results where season_name = 'Season 1'`);
  await asCoach(db);
  const dry = (await one(db, `select public.coach_erase_person('athlete', 'zz_s1', null, '{}'::uuid[], true) as r`)).r;
  const gone = (await one(db, `select public.coach_erase_person('athlete', 'zz_s1', 'zz_s1', '{}'::uuid[], false) as r`)).r;
  await asNobody(db);
  ok(dry.ok && dry.counts.career_scores === 1 && gone.ok && (await q(db, `select 1 from public.career_scores where athlete_id = 'zz_s1'`)).length === 0,
     'an erasure lists the cached score and takes it with the rest', JSON.stringify({ dry: dry.counts, gone: gone.ok }));
  await q(db, `delete from public.career_scores`);
  const [, cold] = await ms(() => one(db, `select public.get_profile($1) as p`, [big]));
  const [, warm] = await ms(() => one(db, `select public.get_profile($1) as p`, [big]));
  await q(db, `delete from public.career_scores`);
  await asCoach(db);
  const [, bcold] = await ms(() => q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 10)`));
  const [, bwarm] = await ms(() => q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 10)`));
  await asNobody(db);
  console.log(`         here (PGlite, slower than the live project): ${big}'s profile ${cold} ms cold, ${warm} ms warm; the board ${bcold} ms cold, ${bwarm} ms warm`);
  ok(warm < cold && bwarm < bcold, 'the cache pays: a warm read is quicker than a cold one, for the profile and the board');

  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage69.sql')), 'rollback69');
  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage69.sql')), 'rollback69 again');
  const after = await defs(Object.keys(before));
  const differ = Object.keys(before).filter(k => before[k] !== after[k]);
  const left = (await q(db, `select p.proname as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public'
                             and p.proname in ('career_switch_day', 'career_xp_on', 'career_paid_rules', 'career_facts_paid', 'career_level_floor', 'career_stamp',
                                               'career_compute', 'career_scored', 'career_scores_for', 'career_keep_levels', 'hab_proof_level')`)).map(r => r.n);
  const erase2 = (await one(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).d;
  ok(differ.length === 0 && left.length === 0 && erase2 === erase0 && !(await one(db, `select to_regclass('public.career_scores') as t`)).t,
     'the way back (run twice) leaves every function as it was before stage69, nothing it added, and coach_erase_person() byte-identical',
     JSON.stringify({ differ, left, erase: erase2 === erase0 }));
  await asCoach(db);
  const board3 = await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`);
  await asNobody(db);
  ok(board3.length === board0.season.length && (await one(db, `select public.get_profile($1) as p`, [big])).p.shadow === true,
     'and AA Proof\'s own board and the shadow are back');

  console.log(`\n${failed ? 'FAIL' : 'OK'}: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
