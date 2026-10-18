// Career Mode, phase 3 (the catalogue switch), rehearsed away from the live project (supabase/stage70_career_catalogue.sql; career/PROCEDURES.md →
// P5, P8, P10 and "Phase 3, as built").
//
//     PGLITE=<scratch>/node_modules/@electric-sql/pglite node scripts/career/rehearse_catalogue.mjs --backup <aa-backup-YYYY-MM-DD.json> [--report <file>] [--write-cases]
//
// PGlite is a real PostgreSQL compiled to WebAssembly (install it in a scratch folder: scripts/restore/lib.mjs, the top). Nothing here touches a real
// project. The backup is coach.html's ⤓ Backup: the real rows, read here and never written anywhere but this process's memory; --report writes the
// switch's list (every athlete's level and XP before and after, what was minted) to a file: keep it outside the repo.
//
// What it does, in order: the live project as it stands before stage70 (the schema snapshot, which holds stage66 and stage69, the backup's rows,
// Season 1, the seed of the rulebook committed at HEAD), then
//   1. stage70 twice, then the seed of the working files (the catalogue switch off): nothing an athlete sees moves, and no backfill runs;
//   2. the switch: the dry run (the list, then nothing changed), then for real (the same list): nobody's level goes down, Season 1's board does not
//      move, the career moves by exactly what the new rewards pay, Proof's own past pays as before, the reveal, the compare;
//   3. what the seed refuses: the switch turned back off, its day moved, a switch that would take a level down;
//   4. made-up athletes through the real doors after the switch: a held week mints Held (a training moment, told once), a water streak mints its
//      habit badge's step (told at minting: AA Proof celebrates it itself), a hidden session keeps what it minted (GAME-8), career_told's guards;
//   5. the twin cases (scripts/career/catalogue_cases.json): what AA Proof's phone must pay for fixed logs, answered by the server;
//   6. an erasure, the cost, the way back (scripts/career/rollback_stage70.sql).
// Exit code 1 if anything failed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openDb, runSql, read } from '../restore/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const COACH_JWT = JSON.stringify({ email: 'amirardekanian@gmail.com', role: 'authenticated', sub: '00000000-0000-4000-8000-00000000c0c0' });
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const BACKUP = opt('--backup'), REPORT = opt('--report');
// The commit whose career files the live project was seeded from before stage70 (rulebook version 3, the XP switch on). --live <rev> for another.
const LIVE = opt('--live') || 'HEAD';

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
function py(argv) {
  for (const exe of [process.env.PYTHON, 'python', 'python3'].filter(Boolean)) {
    const r = cp.spawnSync(exe, ['-X', 'utf8', ...argv], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.error && r.error.code === 'ENOENT') continue;
    if (r.status === 9009 || /Microsoft Store|was not found/i.test(r.stderr || '')) continue;
    return r;
  }
  throw new Error('No python found. Set PYTHON to its path.');
}
const seedSql = out => out.replace(/;\s*$/, '').replace(/^--[^\n]*\n/, '') + ' as r';
async function load(db, table, rows) {
  if (!rows || !rows.length) return 0;
  await db.query(`insert into public.${table} select * from jsonb_populate_recordset(null::public.${table}, $1::jsonb) on conflict do nothing`, [JSON.stringify(rows)]);
  return rows.length;
}
function addDays(day, n) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const ms = async fn => { const t = Date.now(); const r = await fn(); return [r, Date.now() - t]; };

// The career files of a commit (or of the working tree), with their own checker and seed script, in a scratch folder (coach.html beside them:
// the checker reads the Spine's patterns there); `edit` changes the rulebook.
function filesAt(rev, edit) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'career70-' + (rev || 'work') + '-'));
  for (const d of ['career', 'scripts', 'supabase']) fs.mkdirSync(path.join(dir, d));
  const want = ['rulebook', 'badges', 'achievements', 'titles', 'missions', 'quests', 'recognition'].map(f => `career/${f}.toml`)
    .concat(['scripts/check_career.py', 'scripts/career_seed.py', 'supabase/xp_rules_snapshot.json', 'coach.html']);
  for (const f of want) {
    let body = rev ? cp.execFileSync('git', ['show', `${rev}:${f}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 << 20 })
                   : fs.readFileSync(path.join(ROOT, f), 'utf8');
    body = body.replace(/\r\n/g, '\n');
    if (edit && f.endsWith('rulebook.toml')) body = edit(body);
    fs.writeFileSync(path.join(dir, f), body);
  }
  return dir;
}
function seedFrom(dir, extra = []) {
  const r = py([path.join(dir, 'scripts', 'career_seed.py'), path.join(dir, 'career'), ...extra]);
  if (r.status !== 0) throw new Error('career_seed.py failed:\n' + r.stderr);
  return r.stdout;
}
const versionOf = dir => Number(/^version = (\d+)$/m.exec(fs.readFileSync(path.join(dir, 'career', 'rulebook.toml'), 'utf8'))[1]);

async function profiles(db, ids) {
  const o = {};
  for (const id of ids) {
    const p = (await one(db, `select public.get_profile($1) as p`, [id])).p;
    o[id] = { xp: p.career && p.career.xp, level: p.career && p.career.level, season: p.season && p.season.points, week: p.week && p.week.points, p };
  }
  return o;
}

// AA Proof's phone pays, once the switch is on, the habit badges' steps and Proof's kept marks (P13). The server's answers on fixed logs, for
// scripts/check_twins.js §10: each case is a Proof log and config saved through save_progress for a made-up athlete, and the awards that come of it.
const D0 = '2026-09-01';
const run = (habit, v, from, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [addDays(D0, from + i), { [habit]: v }]));
function merge(...logs) { const o = {}; for (const l of logs) for (const [d, v] of Object.entries(l)) o[d] = { ...(o[d] || {}), ...v }; return o; }
const ONLY = (...h) => ({ on: Object.fromEntries(['strength', 'steps', 'sleep', 'fuel', 'water', 'mobility', 'breathe', 'supps'].map(x => [x, h.includes(x)])) });
const CASES = [
  { name: 'water, 12 days in a row', log: run('water', 8, 0, 12), cfg: ONLY('water') },
  { name: 'water, 4 days, a miss, then 6', log: merge(run('water', 8, 0, 4), run('water', 3, 4, 1), run('water', 8, 5, 6)), cfg: ONLY('water') },
  { name: 'WORKOUT 6 days in a row (no badge of its own)', log: run('strength', 1, 0, 6), cfg: ONLY('strength', 'water') },
  { name: 'two habits of their own, runs of 6 (from day 4) and 11 (one ladder)', log: merge(run('c_aa', 1, 3, 6), run('c_bb', 1, 0, 11)),
    cfg: { ...ONLY('water'), custom: [{ id: 'c_aa', name: 'Read' }, { id: 'c_bb', name: 'Stretch' }] } },
  { name: 'three habits on two days', log: merge(run('water', 8, 0, 2), run('sleep', 8, 0, 2), run('steps', 11000, 0, 2)), cfg: ONLY('water', 'sleep', 'steps') },
  { name: 'sleep 31 days in a row', log: run('sleep', 7.5, 0, 31), cfg: ONLY('sleep') },
  { name: 'steps, sleep, fuel and water 7 days at once (Full Stack)',
    log: merge(run('steps', 10000, 0, 7), run('sleep', 8, 0, 7), run('fuel', 3, 0, 7), run('water', 8, 0, 7)), cfg: ONLY('steps', 'sleep', 'fuel', 'water') },
];
async function serverCases(db) {
  const out = [];
  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i], id = `zz_tw${i}`, U = `20000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`;
    await q(db, `insert into auth.users (id, email) values ($1, $2) on conflict do nothing`, [U, `athlete.${id}@amirardekani.com`]);
    await q(db, `insert into public.athlete_identities (user_id, athlete_id, email) values ($1, $2, null) on conflict do nothing`, [U, id]);
    await asAthlete(db, U, id);
    await q(db, `select public.save_progress($1, 'Twin Case', $2::jsonb, null, null)`,
            [id, JSON.stringify({ [`${id}_hab_log`]: JSON.stringify(c.log), [`${id}_hab_cfg`]: JSON.stringify(c.cfg) })]);
    await asNobody(db);
    await one(db, `select public.get_profile($1) as p`, [id]);
    const awards = await q(db, `select w.kind, w.item, w.sub, w.tier, w.day::text as day, w.xp from public.career_awards w where w.athlete_id = $1
                                 order by w.day, w.kind, w.item, w.tier`, [id]);
    out.push({ name: c.name, log: c.log, cfg: c.cfg, awards });
    await asCoach(db);
    await one(db, `select public.coach_erase_person('athlete', $1, $1, '{}'::uuid[], false) as r`, [id]);
    await asNobody(db);
  }
  // the proof codes of the entries that retire at the switch: habits.html CATALOGUE_RETIRED must be this list
  const retired = (await q(db, `select coalesce(jsonb_agg(x.code order by x.code), '[]'::jsonb) as r from (
      select distinct coalesce(p.v, c.body ->> 'proof_code') as code from public.career_catalogue c
        left join lateral jsonb_array_elements_text(c.body -> 'proof_codes') p(v) on true
       where c.body ->> 'retire_at' = 'catalogue' and coalesce(p.v, c.body ->> 'proof_code') is not null) x`))[0].r;
  return {
    retired_codes: retired,
    about: 'What AA Proof\'s phone pays once the catalogue switch is on (P13): the habit badges\' steps (one ladder per habit, none for WORKOUT, one for '
      + 'all the athlete\'s own habits) and Proof\'s kept marks, with the day each was reached and its XP, as the server mints them for fixed logs. '
      + 'Written by node scripts/career/rehearse_catalogue.mjs --write-cases (the rehearsal checks them every run); held by scripts/check_twins.js §10 '
      + 'against habits.html. Change a rule on both sides, then here.',
    cases: out,
  };
}

async function main() {
  if (!BACKUP) throw new Error('--backup <aa-backup-YYYY-MM-DD.json> is required: the real rows the switch is rehearsed on');
  const db = await openDb();
  const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
  const today = (await one(db, `select current_date::text as d`)).d;

  section('0. the live project before stage70');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  await runSql(db, read(path.join(ROOT, 'supabase', 'schema_snapshot.sql')), 'snapshot');
  if ((await one(db, `select to_regclass('public.career_awards') as t`)).t) {  // (snapshot_before.mjs does the same for the older rehearsals)
    // the snapshot was made after stage70 went live: take it off first, the way the live project would be before it
    await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage70.sql')), 'rollback70 (snapshot)');
  }
  const T = backup.tables || {};
  const n = {};
  for (const t of ['seasons', 'xp_rules', 'programs', 'program_versions', 'library_sessions', 'athlete_status', 'hab_titles', 'leaderboard_optin',
                   'hab_season_results', 'athlete_progress', 'session_history', 'exercises']) n[t] = await load(db, t, T[t] || []);
  ok(backup.complete === true, `the backup is complete (${backup.exported_at}); loaded ` + Object.entries(n).map(([t, k]) => `${t} ${k}`).join(', '));
  await q(db, `select setval(pg_get_serial_sequence('public.seasons', 'id'), greatest((select max(id) from public.seasons), 1))`);
  if (!(await one(db, `select count(*) as n from public.seasons where name = 'Season 1'`)).n) {
    await asCoach(db); await q(db, `select * from public.start_season('Season 1', current_date)`); await asNobody(db);
  }
  const live = filesAt(LIVE);
  const v3 = (await one(db, seedSql(seedFrom(live)))).r;
  ok(v3 && v3.switch && v3.switch.xp !== 'off' && v3.switch.catalogue === 'off',
     `the rulebook as live (${LIVE}): version ${v3 && v3.version}, the XP switch on since ${v3 && v3.switch && v3.switch.xp}, the catalogue switch off`);
  let cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.ok, `the compare holds on the real rows as live: ${cmp.matched} of ${cmp.athletes}`, cmp.rows.filter(r => !r.ok).map(r => JSON.stringify(r)).join('\n'));
  const ids = (await q(db, `select distinct athlete_id as id from public.career_facts where void_at is null order by 1`)).map(r => r.id);
  const proofIds = (await q(db, `select athlete_id as id from public.athlete_progress where data ? (athlete_id || '_hab_log') order by 1`)).map(r => r.id);
  const p0 = await profiles(db, ids);
  await asCoach(db);
  const board0 = { season: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`),
                   week: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'week', 50)`) };
  const levels0 = Object.fromEntries((await q(db, `select * from public.coach_season_levels($1)`, [proofIds])).map(r => [r.athlete_id, r.level]));
  await asNobody(db);
  const erase0 = (await one(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).d;
  const defs = async names => Object.fromEntries((await q(db, `select p.proname as n, pg_get_functiondef(p.oid) as d from pg_proc p
      join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = any($1)`, [names])).map(r => [r.n, r.d.replace(/\r/g, '')]));
  const REDEFINED = ['career_score', 'career_compute', 'career_scored', 'career_scores_for', 'career_seed', 'get_profile', 'career_compare'];
  const before = await defs(REDEFINED);

  section('1. stage70, twice, then the seed of the working files (the catalogue switch off)');
  const s70 = read(path.join(ROOT, 'supabase', 'stage70_career_catalogue.sql'));
  await runSql(db, s70, 'stage70');
  await runSql(db, s70, 'stage70 again');
  ok(true, 'stage70 applied, and applied again without an error');
  const erase1 = (await one(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).d;
  ok((erase1.match(/'career_awards'/g) || []).length === 1 && erase1.replace(`'career_scores', 'career_awards']`, `'career_scores']`) === erase0,
     'coach_erase_person() learns career_awards exactly once, and nothing else in it moves');
  const work = filesAt(null);
  const v4 = (await one(db, seedSql(seedFrom(work)))).r;
  ok(v4 && v4.version === versionOf(work) && v4.switch.catalogue === 'off' && v4.backfill && v4.backfill.skipped && !v4.athletes,
     `the working files seed as rulebook ${v4 && v4.version}, the catalogue switch off, and no backfill (only the catalogue changed)`, JSON.stringify(v4));
  const p1 = await profiles(db, ids);
  const moved1 = ids.filter(id => ['xp', 'level', 'season', 'week'].some(k => p1[id][k] !== p0[id][k]));
  ok(moved1.length === 0, `with the switch off every athlete's career XP, level, season and week points are as before (${ids.length})`,
     moved1.map(id => `${id}: ${JSON.stringify([p0[id].xp, p0[id].level, p0[id].season])} -> ${JSON.stringify([p1[id].xp, p1[id].level, p1[id].season])}`).join('\n'));
  ok(ids.every(id => !p1[id].p.shelf && !p1[id].p.reveal && p1[id].p.switch.catalogue === null && (p1[id].p.moments || []).length === 0),
     'and the profile has no shelf, no moments and no reveal: both apps stay as they are');
  await asCoach(db);
  const board1 = { season: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`),
                   week: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'week', 50)`) };
  const levels1 = Object.fromEntries((await q(db, `select * from public.coach_season_levels($1)`, [proofIds])).map(r => [r.athlete_id, r.level]));
  await asNobody(db);
  ok(JSON.stringify(board1) === JSON.stringify(board0) && JSON.stringify(levels1) === JSON.stringify(levels0),
     `both boards and the coach's levels are exactly as before (${board1.season.length} on the board)`);
  ok(Number((await one(db, `select count(*) as n from public.career_awards`)).n) === 0, 'and nothing is minted while the switch is off');
  cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.ok, `the compare still holds: ${cmp.matched} of ${cmp.athletes}`);

  section('2. the switch: the dry run (the list), then for real');
  const sw = filesAt(null, b => b.replace(/^version = \d+$/m, `version = ${versionOf(work) + 1}`).replace(/^catalogue = "off"$/m, `catalogue = "${today}"`));
  const [dry, tDry] = await ms(async () => (await one(db, seedSql(seedFrom(sw, ['--dry-run'])))).r);
  const list = (dry && dry.athletes) || [];
  ok(dry && dry.dry_run === true && dry.turned_on === 'catalogue' && list.length === ids.length && dry.minted > 0,
     `the dry run answers every athlete's line (${list.length}), ${dry && dry.minted} rewards minted, then undone (${tDry} ms here)`,
     JSON.stringify(dry && { ...dry, athletes: undefined }));
  ok(Number((await one(db, `select count(*) as n from public.career_awards`)).n) === 0 && (await one(db, `select max(version) as v from public.career_rules`)).v === versionOf(work)
     && (await one(db, `select public.get_profile($1) as p`, [ids[0]])).p.switch.catalogue === null,
     'and after it nothing changed: no award, the rulebook and the switch as they were');
  const up = list.filter(r => r.level > r.level_before), same = list.filter(r => r.level === r.level_before), down = list.filter(r => r.level < r.level_before);
  console.log(`         the list: ${list.length} athletes; ${up.length} go up, ${same.length} stay, ${down.length} go down; `
              + `${list.reduce((a, r) => a + (r.xp_added || 0), 0)} XP added`);
  for (const r of list.filter(x => x.xp_added).sort((a, b) => b.xp_added - a.xp_added))
    console.log(`           ${String(r.name || r.athlete_id).padEnd(24)} ${String(r.level_before).padStart(2)} → ${String(r.level).padStart(2)}  +${r.xp_added} XP  `
                + `(${r.badges} badge steps, ${r.achievements} achievements, ${r.titles || 0} titles, ${r.carried || 0} carried)`);
  if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ today, list }, null, 1));
  ok(down.length === 0, `nobody's level goes down (${list.length})`, down.map(r => `${r.athlete_id} ${r.level_before} → ${r.level}`).join('\n'));

  const real = (await one(db, seedSql(seedFrom(sw)))).r;
  ok(real && !real.dry_run && real.turned_on === 'catalogue' && real.switch.catalogue === today, `the switch, for real: rulebook ${real && real.version}, the catalogue switch on since ${today}`);
  ok(JSON.stringify(real.athletes) === JSON.stringify(dry.athletes) && real.minted === dry.minted, 'the real switch gives exactly the list the dry run showed');
  const p2 = await profiles(db, ids);
  // the career moves by exactly what the new rewards pay; Proof's own past (its ladder steps and marks) pays as it did
  const off2 = [];
  for (const id of ids) {
    const fresh = Number((await one(db, `select coalesce(sum(w.xp), 0) as x from public.career_awards w join public.career_catalogue c on c.kind = w.kind and c.id = w.item
                                          where w.athlete_id = $1 and c.body ->> 'origin' = 'new'`, [id])).x);
    if (p2[id].xp !== p0[id].xp + fresh) off2.push(`${id}: ${p0[id].xp} + ${fresh} new = ${p0[id].xp + fresh}, profile ${p2[id].xp}`);
    if (p2[id].season !== p0[id].season) off2.push(`${id}: Season 1 ${p0[id].season} → ${p2[id].season}`);
  }
  ok(off2.length === 0, 'every career moves by exactly what the new rewards pay (Proof\'s carried-over past pays as before), and Season 1\'s points do not move', off2.join('\n'));
  ok(ids.every(id => p2[id].level === (list.find(r => r.athlete_id === id) || {}).level), 'every profile has the list\'s level');
  const withPast = ids.filter(id => Number((p2[id].p.reveal || {}).steps || 0) + Number((p2[id].p.reveal || {}).achievements || 0) > 0);
  ok(withPast.length > 0 && withPast.every(id => p2[id].p.shelf && Array.isArray(p2[id].p.shelf.badges) && p2[id].p.reveal.since),
     `the profile has a shelf and ONE reveal for each athlete with a past (${withPast.length}), not a moment per reward`);
  const strayMoments = ids.filter(id => (p2[id].p.moments || []).length > 0);
  ok(strayMoments.length === 0, 'and no moment waits: the past is the reveal\'s', strayMoments.map(id => `${id}: ${JSON.stringify(p2[id].p.moments)}`).join('\n'));
  const carriedPaid = Number((await one(db, `select count(*) as n from public.career_awards where how = 'carried' and xp <> 0`)).n);
  const retiredLate = Number((await one(db, `select count(*) as n from public.career_awards w join public.career_catalogue c on c.kind = w.kind and c.id = w.item
                                               where c.body ->> 'retire_at' = 'catalogue' and (w.day >= $1::date or w.how <> 'baseline')`, [today])).n);
  ok(carriedPaid === 0 && retiredLate === 0, 'a carried step pays 0, and a retired entry is minted only for what was reached before the switch');
  const sample = ids.slice().sort((a, b) => (p2[b].p.shelf ? p2[b].p.shelf.badges.length : 0) - (p2[a].p.shelf ? p2[a].p.shelf.badges.length : 0))[0];
  const cen = p2[sample].p.shelf.badges.find(b => b.id === 'century');
  ok(cen && Array.isArray(cen.steps) && cen.steps.length === 5 && 'n' in cen && (cen.tier === 0 || cen.metal),
     `a shelf badge carries its steps, measure and next step (${sample}: Century ${cen && cen.n}, step ${cen && cen.tier}, next ${JSON.stringify(cen && cen.next)})`);
  cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.ok && cmp.catalogue_switch === today, `the compare holds after the switch, both sides leaving the ladders and marks to the awards (${cmp.matched} of ${cmp.athletes})`,
     cmp.rows.filter(r => !r.ok).map(r => JSON.stringify(r)).join('\n') + JSON.stringify(cmp.rules_differ_on));
  await asCoach(db);
  const board2 = await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`);
  await asNobody(db);
  ok(JSON.stringify(board2.map(r => [r.display_name, r.xp])) === JSON.stringify(board1.season.map(r => [r.display_name, r.xp])),
     `Season 1's board does not move (${board2.length} on it); the level beside each name is the new career level`);

  section('3. what the seed refuses');
  const tries = {};
  try { await one(db, seedSql(seedFrom(filesAt(null, b => b.replace(/^version = \d+$/m, `version = ${versionOf(sw) + 1}`))))); tries.off = 'accepted'; }
  catch (e) { tries.off = e.message; }
  // the files' checker already refuses a catalogue day before the XP switch's; the server refuses any move of a switch's day on its own
  try {
    await one(db, `select public.career_seed($1, (select rules from public.career_rules order by version desc limit 1)
                     || jsonb_build_object('version', $1::int, 'switch', jsonb_build_object('xp', $2::text, 'catalogue', $3::text)),
                     (select jsonb_agg(jsonb_build_object('kind', kind, 'id', id, 'body', body)) from public.career_catalogue), 'test')`,
              [versionOf(sw) + 1, today, addDays(today, -1)]);
    tries.moved = 'accepted';
  } catch (e) { tries.moved = e.message; }
  ok(/never turned back off/.test(tries.off), 'a seed that turns the catalogue switch back off is refused', tries.off);
  ok(/never moves/.test(tries.moved), 'a seed that moves the switch\'s day is refused', tries.moved);
  // a switch that would take a level down is refused: rehearsed by turning it on again from the start with a steeper curve
  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage70.sql')), 'rollback70 (for the refusal)');
  await runSql(db, s70, 'stage70 (again)');
  let refusedDown = '';
  try {
    await one(db, seedSql(seedFrom(filesAt(null, b => b.replace(/^version = \d+$/m, `version = ${versionOf(sw) + 2}`)
                                                   .replace(/^catalogue = "off"$/m, `catalogue = "${today}"`).replace(/^base = 400 /m, 'base = 4000 ')))));
  } catch (e) { refusedDown = e.message; }
  ok(/would take a level down/.test(refusedDown) && Number((await one(db, `select count(*) as n from public.career_awards`)).n) === 0,
     'a switch that would take anyone\'s level down is refused, and nothing is minted', refusedDown);
  await one(db, seedSql(seedFrom(filesAt(null, b => b.replace(/^version = \d+$/m, `version = ${versionOf(sw) + 2}`).replace(/^catalogue = "off"$/m, `catalogue = "${today}"`)))));
  ok((await one(db, `select public.get_profile($1) as p`, [ids[0]])).p.switch.catalogue === today, 'and the switch, made again, is on');

  section('4. made-up athletes through the real doors, after the switch');
  const U1 = '10000000-0000-4000-8000-0000000000d1';
  await q(db, `insert into auth.users (id, email) values ($1, 'athlete.zz_p3@amirardekani.com')`, [U1]);
  await q(db, `insert into public.athlete_identities (user_id, athlete_id, email) values ($1, 'zz_p3', null)`, [U1]);
  const cstart = addDays(today, -20);
  await q(db, `insert into public.programs (athlete_id, data) values ('zz_p3', $1::jsonb)`, [JSON.stringify({
    athlete: { firstName: 'Zed', lastName: 'Trophy' }, currentCycleIndex: 0,
    cycles: [{ num: 1, startDate: cstart, endDate: addDays(today, 14) }], workouts: { days: [{ id: 1, blocks: [] }] } })]);
  await asAthlete(db, U1, 'zz_p3');
  const set = { ex: 'Goblet Squat', block: 'A', reps: '8', sets: [{ w: '20', n: 8, r: 7, d: true }, { w: '20', n: 8, r: 7, d: true }] };
  for (const d of [addDays(cstart, 1), addDays(cstart, 8)])
    await q(db, `select public.save_session('zz_p3', 'Zed Trophy', 1, $1::date, $2::jsonb, null)`, [d, JSON.stringify({
      status: 'Complete', duration_min: 40, readiness: { composite: 4, sleep: 4, energy: 4, soreness: 4, stress: 3, overall: 4 }, log: [set] })]);
  const zlog = {}; for (let i = 1; i <= 6; i++) zlog[addDays(today, -i)] = { water: 8 };
  await q(db, `select public.save_progress('zz_p3', 'Zed Trophy', $1::jsonb, null, null)`, [JSON.stringify({ zz_p3_hab_log: JSON.stringify(zlog),
    zz_p3_hab_cfg: JSON.stringify(ONLY('water', 'strength')) })]);
  let zp = (await one(db, `select public.get_profile('zz_p3') as p`)).p;
  await asNobody(db);
  const held = (zp.moments || []).find(m => m.key === 'achievement:held::0');
  ok(held && held.app === 'training' && held.size === 'highlight', `two held weeks mint Held, a training moment waiting to be shown (${JSON.stringify(held)})`);
  const water = await one(db, `select * from public.career_awards where athlete_id = 'zz_p3' and item = 'habit_water'`);
  ok(water && water.tier === 1 && water.how === 'earned' && water.xp === 20 && water.told_at && !(zp.moments || []).some(m => m.id === 'habit_water'),
     'a 5-day water run mints HUMAN SPRINKLER · KINDLED (20 XP), told at minting: AA Proof celebrates it itself', JSON.stringify(water));
  ok(zp.career.awards_xp === Number((await one(db, `select sum(xp) as x from public.career_awards where athlete_id = 'zz_p3'`)).x),
     `the career counts what the awards pay (${zp.career.awards_xp} XP)`);
  ok(!zp.reveal, 'an athlete who starts after the switch has no reveal');
  let refusedTold = '';
  try { await asCoach(db); await one(db, `select public.career_told(array['achievement:held::0']) as n`); } catch (e) { refusedTold = e.message; }
  await asNobody(db);
  ok(/not signed in/.test(refusedTold), 'the coach (no athlete of their own) cannot mark an athlete\'s moment shown', refusedTold);
  await asAthlete(db, U1, 'zz_p3');
  const told = (await one(db, `select public.career_told(array['achievement:held::0', 'badge:nope::9']) as n`)).n;
  zp = (await one(db, `select public.get_profile('zz_p3') as p`)).p;
  await asNobody(db);
  ok(told === 1 && !(zp.moments || []).some(m => m.key === 'achievement:held::0'), 'the athlete\'s app marks it shown, once, and it never comes back');
  // GAME-8: a hidden session stops paying from then on; what it minted stays
  const xpBefore = zp.career.awards_xp;
  await asCoach(db);
  await q(db, `select public.coach_hide_session('zz_p3', 1, $1::date, true)`, [addDays(cstart, 1)]);
  await asNobody(db);
  zp = (await one(db, `select public.get_profile('zz_p3') as p`)).p;
  ok(Number((await one(db, `select count(*) as n from public.career_awards where athlete_id = 'zz_p3' and item = 'held'`)).n) === 1 && zp.career.awards_xp === xpBefore,
     'hiding a session keeps what it minted (GAME-8)');

  section('5. the twin cases: what AA Proof\'s phone pays, answered by the server (scripts/career/catalogue_cases.json)');
  const casesNow = await serverCases(db);
  const casesFile = path.join(ROOT, 'scripts', 'career', 'catalogue_cases.json');
  const strip = c => c && JSON.stringify({ retired: c.retired_codes, cases: c.cases.map(x => ({ name: x.name, awards: x.awards })) });
  for (const c of casesNow.cases) console.log(`         ${c.name}: ${c.awards.map(a => `${a.item}${a.sub ? '/' + a.sub : ''}:${a.tier} ${a.day} +${a.xp}`).join(', ') || 'nothing'}`);
  const byName = Object.fromEntries(casesNow.cases.map(c => [c.name, c.awards]));
  ok(!byName['WORKOUT 6 days in a row (no badge of its own)'].some(a => /^habit_/.test(a.item) || a.item === 'heavy_metal'),
     'WORKOUT has no ladder of its own after the switch, and HEAVY METAL is earned no more');
  ok(byName['two habits of their own, runs of 6 (from day 4) and 11 (one ladder)'].filter(a => a.item === 'habit_custom').length === 2,
     'the athlete\'s own habits share one ladder (HOUSE RULES: 5 and 10, once each)');
  if (args.includes('--write-cases')) {
    fs.writeFileSync(casesFile, JSON.stringify(casesNow, null, 1) + '\n');
    ok(true, `wrote ${path.relative(ROOT, casesFile)}: ${casesNow.cases.length} cases`);
  } else {
    const onDisk = fs.existsSync(casesFile) ? JSON.parse(fs.readFileSync(casesFile, 'utf8')) : null;
    ok(onDisk && strip(onDisk) === strip(casesNow), 'scripts/career/catalogue_cases.json is the server\'s answer today (rewrite it with --write-cases after a deliberate change)',
       onDisk ? 'they differ' : 'the file is missing');
  }

  section('6. an erasure, the cost, the way back');
  await asCoach(db);
  const dryErase = (await one(db, `select public.coach_erase_person('athlete', 'zz_p3', null, '{}'::uuid[], true) as r`)).r;
  const gone = (await one(db, `select public.coach_erase_person('athlete', 'zz_p3', 'zz_p3', '{}'::uuid[], false) as r`)).r;
  await asNobody(db);
  ok(dryErase.ok && dryErase.counts.career_awards >= 2 && gone.ok && Number((await one(db, `select count(*) as n from public.career_awards where athlete_id = 'zz_p3'`)).n) === 0,
     `an erasure lists the awards (${dryErase.counts && dryErase.counts.career_awards}) and takes them with the rest`, JSON.stringify(dryErase.counts));
  const big = ids.slice().sort((a, b) => (p2[b].xp || 0) - (p2[a].xp || 0))[0];
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

  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage70.sql')), 'rollback70');
  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage70.sql')), 'rollback70 again');
  const after = await defs(REDEFINED);
  const differ = REDEFINED.filter(k => before[k] !== after[k]);
  const left = (await q(db, `select p.proname as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public'
                             and p.proname in ('career_catalogue_day', 'career_bonus_rules', 'career_marks', 'career_lift_counts', 'career_all_the_way_back',
                                               'career_evaluate', 'career_catalogue_baseline', 'career_awards_xp', 'career_award_app', 'career_shelf',
                                               'career_moments', 'career_told')`)).map(r => r.n);
  const erase2 = (await one(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).d;
  ok(differ.length === 0 && left.length === 0 && erase2 === erase0 && !(await one(db, `select to_regclass('public.career_awards') as t`)).t
     && Number((await one(db, `select count(*) as n from public.hab_titles where title like 'c\\_%' escape '\\'`)).n) === 0,
     'the way back (run twice) leaves every function as stage69 left it, nothing stage70 added, and coach_erase_person() byte-identical',
     JSON.stringify({ differ, left, erase: erase2 === erase0 }));
  const p3 = await profiles(db, ids);
  const back = ids.filter(id => p3[id].xp !== p0[id].xp || p3[id].level !== p0[id].level || p3[id].p.switch.catalogue !== null);
  ok(back.length === 0, 'and every athlete\'s career is back to phase 2\'s, with the catalogue switch off', back.join(', '));

  console.log(`\n${failed ? 'FAIL' : 'OK'}: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
