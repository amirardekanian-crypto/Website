// Career Mode, phase 3 (rewards with meanings, and the catalogue switch), rehearsed away from the live project
// (supabase/stage70_career_rewards.sql, scripts/career/rollback_stage70.sql; career/PROCEDURES.md → P5, P12, P15, P16 and "Phase 3, as built").
//
//     PGLITE=<scratch>/node_modules/@electric-sql/pglite node scripts/career/rehearse_catalogue.mjs --backup <aa-backup-YYYY-MM-DD.json>
//         [--report <file outside the repo>] [--write-cases] [--stop-after N] [--phase1 <rev>] [--head <rev>]
//
// PGlite is a real PostgreSQL compiled to WebAssembly (install it in a scratch folder: scripts/restore/lib.mjs, the top). Nothing here touches a real
// project. The backup is coach.html's ⤓ Backup (or the same shape): the real rows, read here and never written anywhere but this process's memory;
// --report writes the go-day list (every athlete's line: XP and level before and after, season points, back-pay) to a file: keep it outside the repo.
//
// The live project as it will stand when this ships: the schema snapshot (stage66 and stage69 applied since 2026-10-17/18), the backup's rows, the
// phase 1 rulebook (the files at --phase1, version 1), the rulebook at --head (version 2, both switches off), then the XP switch turned on at version 3.
// Then, in order (the numbers are the build spec's §12.1):
//   2. stage70 twice, and the phase 3 catalogue data seeded at the SAME version with the switch off: zero awards, nothing an athlete sees moves;
//   3. the go-day: the seed's refusals, career_catalogue_before() batches, career_catalogue_preview() batches (the dry run), the seed that only flips the
//      switch, the scores in between (the §4.4 guard), career_rewards_batch() for everyone, and per athlete THROUGH THE REAL SCORER: career XP after =
//      before + back-pay exactly, no level down, Proof's tiers and milestones carried over to the point, the compare ok, the retired and the starts_at rules;
//   4. live mints through the real doors on made-up athletes (a tier, a held week, the Personal Records and the Spine, the cycle's end, a mid-cycle start,
//      the events, the Grand Slam, the lift gains, D14's comebacks), 5. partial calls, 6. the stamp, 7. voids, 8. mark_moments_told, 9. timing on the longest
//      real logs and the profile's size, 10. a re-seed (a tier appended, an xp changed, a title added), 11. erasure, 12. reward_cases.json,
//   13. the way back (rollback_stage70.sql, dry then real, twice).
// Exit code 1 if anything failed. A failure line ends with the lane that owns the fix: [L1] the stage file or the rollback, [L2] the catalogue or the
// seed, [L5] the training app's twin.
//
// Two devices the rehearsal uses, and says so where it does: (a) the live-mint scenarios need days AFTER the switch day, but a seed refuses any switch day
// older than yesterday, so after the go-day checks the newest rulebook's catalogue day is moved back (a direct UPDATE, as if the switch had been turned
// on that many days ago) and every cache is left to notice; (b) PGlite has one connection, so the stamp race is a property test (a write's updated_at is
// the clock, not the transaction's start), not two sessions.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { openDb, runSql, read } from '../restore/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const COACH_JWT = JSON.stringify({ email: 'amirardekanian@gmail.com', role: 'authenticated', sub: '00000000-0000-4000-8000-00000000c0c0' });
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const BACKUP = opt('--backup'), REPORT = opt('--report');
const PHASE1 = opt('--phase1') || '94cdc89';       // the commit the live project's phase 1 rulebook was seeded from
const HEAD = opt('--head') || 'a219d5a';           // the commit the live project's phase 2 rulebook (version 2) was seeded from
const STOP = Number(opt('--stop-after') || 99);
const CASES_FILE = path.join(ROOT, 'scripts', 'career', 'reward_cases.json');

let passed = 0, failed = 0;
const failures = [];
function ok(cond, what, detail, owner) {
  if (cond) { passed++; console.log('  ok   ' + what); }
  else {
    failed++; failures.push({ owner: owner || '?', what, detail: String(detail || '') });
    console.log('  FAIL ' + what + (owner ? ` [${owner}]` : '') + (detail ? '\n         ' + String(detail).split('\n').join('\n         ') : ''));
  }
}
const info = s => console.log('         ' + s);
const section = s => console.log('\n' + s);
const q = async (db, sql, params) => (await db.query(sql, params)).rows;
const one = async (db, sql, params) => (await q(db, sql, params))[0];
const val = async (db, sql, params) => { const r = await one(db, sql, params); return r ? Object.values(r)[0] : undefined; };
const asCoach = db => q(db, `select set_config('request.jwt.claims', $1, false)`, [COACH_JWT]);
const asNobody = db => q(db, `select set_config('request.jwt.claims', '', false)`);
const asAthlete = (db, sub, id) => q(db, `select set_config('request.jwt.claims', $1, false)`,
                                     [JSON.stringify({ sub, role: 'authenticated', email: `athlete.${id}@amirardekani.com` })]);
const ms = async fn => { const t = performance.now(); const r = await fn(); return [r, Math.round((performance.now() - t) * 10) / 10]; };
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
const ymd = d => d.toISOString().slice(0, 10);
const addDays = (day, n) => { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

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

// The career files of a commit or of the working tree, with their own checker and seed script, in a scratch folder.
function filesAt(rev) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'career-' + (rev || 'work') + '-'));
  fs.mkdirSync(path.join(dir, 'career')); fs.mkdirSync(path.join(dir, 'scripts')); fs.mkdirSync(path.join(dir, 'supabase'));
  const want = ['rulebook', 'badges', 'achievements', 'titles', 'missions', 'quests', 'recognition'].map(f => `career/${f}.toml`)
    .concat(['scripts/check_career.py', 'scripts/career_seed.py', 'supabase/xp_rules_snapshot.json']);
  if (!rev) want.push('career/tiers.lock.json');
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
const payloadOf = dir => JSON.parse(seedFrom(dir, ['--json']));
function withRulebook(dir, edit) {
  const f = path.join(dir, 'career', 'rulebook.toml');
  fs.writeFileSync(f, edit(fs.readFileSync(f, 'utf8')));
}
const asVersion = (v, xpDay, catDay) => t => {
  t = t.replace(/^version = \d+$/m, `version = ${v}`);
  if (xpDay) t = t.replace(/^xp = "[^"]*"$/m, `xp = "${xpDay}"`);
  if (catDay) t = t.replace(/^catalogue = "[^"]*"$/m, `catalogue = "${catDay}"`);
  return t;
};

// ── made-up athletes ───────────────────────────────────────────────────────────────────────────────────────────────────
let uuidN = 0x400;
const uuid = () => `20000000-0000-4000-8000-${(uuidN++).toString(16).padStart(12, '0')}`;
const SUB = {};            // athlete id → auth user id
async function mkLogin(db, id) {
  const u = uuid(); SUB[id] = u;
  await q(db, `insert into auth.users (id, email) values ($1, $2)`, [u, `athlete.${id}@amirardekani.com`]);
  await q(db, `insert into public.athlete_identities (user_id, athlete_id, email) values ($1, $2, null)`, [u, id]);
}
const prog = ({ start, end, days = [1], tier }) => ({
  athlete: { firstName: 'Zed', lastName: 'Test', ...(tier ? { tier } : {}) }, currentCycleIndex: 0,
  cycles: [{ num: 1, startDate: start, endDate: end }],
  workouts: { days: days.map(id => ({ id, blocks: [] })) } });
const CFG_THREE = { on: { fuel: false, mobility: false, breathe: false, supps: false, sleep: false } };   // strength (locked), steps, water
const CFG_ALL = { on: { breathe: false, supps: false } };
const ANSWERED = { composite: 4, sleep: 4, energy: 4, soreness: 4, stress: 3, overall: 4, skipped: false };
const sess = ({ checkin = true, full = true, ex = 'Goblet Squat', w = 40, n = 8, r = 7, mins = 40 } = {}) => ({
  status: 'Complete', duration_min: mins, readiness: checkin ? ANSWERED : { skipped: true, composite: null },
  log: [{ ex, sets: [{ w: String(w), n, r: full ? r : '', d: true }, { w: String(w), n, r: full ? r : '', d: true }] }] });
function habitLog(today, firstOffset, lastOffset, per, skip = () => false) {
  const l = {};
  for (let o = firstOffset; o <= lastOffset; o++) if (!skip(o)) l[addDays(today, o)] = typeof per === 'function' ? per(o) : { ...per };
  return l;
}
async function insProgress(db, id, log, cfg, recs) {
  const data = { [id + '_hab_log']: JSON.stringify(log), [id + '_hab_cfg']: JSON.stringify(cfg || CFG_THREE) };
  if (recs) data[id + '_1rm'] = JSON.stringify(recs);
  await q(db, `insert into public.athlete_progress (athlete_id, athlete_name, data) values ($1, 'Zed', $2::jsonb)
               on conflict (athlete_id) do update set data = excluded.data`, [id, JSON.stringify(data)]);
}
async function insProgram(db, id, p) {
  await q(db, `insert into public.programs (athlete_id, data) values ($1, $2::jsonb) on conflict (athlete_id) do update set data = excluded.data`, [id, JSON.stringify(p)]);
}
async function insSession(db, id, day, on, s) {
  await q(db, `insert into public.session_history (athlete_id, athlete_name, day, completed_on, status, duration_min, readiness, log)
               values ($1, 'Zed', $2, $3::date, $4, $5, $6::jsonb, $7::jsonb) on conflict (athlete_id, day, completed_on) do update set log = excluded.log`,
          [id, day, on, s.status, s.duration_min, JSON.stringify(s.readiness), JSON.stringify(s.log)]);
}
// the doors (as the signed-in athlete)
async function doorProgress(db, id, log, cfg, recs) {
  const data = { [id + '_hab_log']: JSON.stringify(log) };
  if (cfg) data[id + '_hab_cfg'] = JSON.stringify(cfg);
  if (recs) data[id + '_1rm'] = JSON.stringify(recs);
  await asAthlete(db, SUB[id], id);
  try { return await ms(() => q(db, `select public.save_progress($1, 'Zed', $2::jsonb, null, null)`, [id, JSON.stringify(data)])); }
  finally { await asNobody(db); }
}
async function doorSession(db, id, day, on, s) {
  await asAthlete(db, SUB[id], id);
  try { return await ms(() => q(db, `select public.save_session($1, 'Zed', $2, $3::date, $4::jsonb, null)`, [id, day, on, JSON.stringify(s)])); }
  finally { await asNobody(db); }
}
const awardsOf = async (db, id) => q(db, `select award_id, day::text as day, how, pays, xp, size, meaning, tier, item, subject, kind from public.career_awards where athlete_id = $1 order by day, award_id`, [id]);
const recOf = async (db, id) => q(db, `select award_id, size, told_at from public.career_recognition where athlete_id = $1 order by award_id`, [id]);
const profile = async (db, id) => (await one(db, `select public.get_profile($1) as p`, [id])).p;
const scoreOf = async (db, id) => (await one(db, `select public.career_scored($1) as s`, [id])).s;
const sizeOf = p => JSON.stringify(p).length;
const stripVolatile = o => JSON.parse(JSON.stringify(o, (k, v) => (k === 'at' || k === 'stamp' ? undefined : v)));
// every 'YYYY-MM-DD' in a value (keys too) moved by n days: reward_cases.json keeps its dates, and today's run is compared to it after moving them
function shiftDates(x, n) {
  const mv = s => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? addDays(s, n) : s);
  if (Array.isArray(x)) return x.map(v => shiftDates(v, n));
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [mv(k), shiftDates(v, n)]));
  return mv(x);
}

async function main() {
  if (!BACKUP) throw new Error('--backup <aa-backup-YYYY-MM-DD.json> is required: the real rows the switch is rehearsed on');
  const t0 = Date.now();
  const db = await openDb();
  const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
  const today = (await one(db, `select current_date::text as d`)).d;
  const D_XP = addDays(today, -14);          // the XP switch has been on a fortnight when the catalogue goes on
  const S = addDays(today, -1);              // the catalogue switch day: yesterday (a seed takes today or yesterday)
  const finish = () => {
    console.log(`\n${failed ? 'FAIL' : 'OK'}: ${passed} passed, ${failed} failed (${Math.round((Date.now() - t0) / 1000)} s)`);
    if (failed) for (const f of failures) console.log(`  - [${f.owner}] ${f.what}`);
    process.exitCode = failed ? 1 : 0;
  };

  // ── 0. the live project as it stands before stage70 ─────────────────────────────────────────────────────────────────────
  section('0. the live project before stage70 (the snapshot has stage66 and stage69 in it)');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  await runSql(db, read(path.join(ROOT, 'supabase', 'schema_snapshot.sql')), 'snapshot');
  const T = backup.tables || {};
  const xpRow = JSON.parse(read(path.join(ROOT, 'supabase', 'xp_rules_snapshot.json')));
  await db.exec(`set session_replication_role = replica`);          // load the rows without the shadow triggers; the backfill below derives every fact
  const n = {};
  for (const t of ['seasons', 'programs', 'program_versions', 'library_sessions', 'athlete_status', 'hab_titles', 'leaderboard_optin',
                   'hab_season_results', 'athlete_progress', 'session_history']) n[t] = await load(db, t, T[t] || []);
  await q(db, `insert into public.xp_rules (id, rules) values (1, $1::jsonb)`, [JSON.stringify(xpRow.rules)]);
  await db.exec(`set session_replication_role = origin`);
  await q(db, `select setval(pg_get_serial_sequence('public.seasons', 'id'), greatest((select max(id) from public.seasons), 1))`);
  ok(Object.values(n).reduce((a, b) => a + b, 0) > 500 && n.athlete_progress > 20 && n.session_history > 100,
     `the backup's rows are in (${backup.exported_at}${backup.complete === true ? ', complete' : ', no "complete" flag: an older export'}): ` + Object.entries(n).map(([t, k]) => `${t} ${k}`).join(', '));
  // the Spine entries All-Court reads (status approved, a pattern): the backup carries none, so the five groups are made up here
  const SPINE = [['squat', 'Back Squat', 'squat', []], ['rdl', 'Romanian Deadlift', 'hinge', ['RDL']], ['bench', 'Bench Press', 'push-horizontal', []],
                 ['pullup', 'Pull-Up', 'pull-vertical', []], ['splitsq', 'Split Squat', 'single-leg', []], ['goblet', 'Goblet Squat', 'squat', []]];
  for (const [id, name, pattern, aliases] of SPINE)
    await q(db, `insert into public.exercises (id, name, pattern, aliases, status) values ($1, $2, $3, $4::text[], 'approved')`, [id, name, pattern, aliases]);

  const s66ok = (await one(db, `select to_regclass('public.career_facts') as t, to_regclass('public.career_scores') as s`));
  ok(s66ok.t && s66ok.s, 'the snapshot already holds stage66 and stage69 (career_facts, career_scores)');
  const erase0 = (await one(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).d;

  // ── 1. phase 1's rulebook, phase 2's, and the XP switch on ──────────────────────────────────────────────────────────────
  section('1. the rulebooks as the live project has them: phase 1 (version 1), phase 2 (version 2, both switches off), the XP switch on (version 3)');
  const h1 = filesAt(PHASE1);
  const [v1, t1] = await ms(async () => (await one(db, seedSql(seedFrom(h1)))).r);
  ok(v1 && v1.version === 1, `the phase 1 seed from ${PHASE1}'s files: rulebook ${v1 && v1.version}, ${v1 && v1.catalogue} catalogue rows, `
     + `${Object.values((v1 && v1.backfill && v1.backfill.facts) || {}).reduce((a, b) => a + b, 0)} facts (${Math.round(t1 / 1000)} s)`);
  const h2 = filesAt(HEAD);
  const v2 = (await one(db, seedSql(seedFrom(h2)))).r;
  ok(v2 && v2.version === 2 && v2.switch.xp === 'off' && v2.switch.catalogue === 'off', `phase 2's files from ${HEAD} as rulebook 2, both switches off`, JSON.stringify(v2 && { ...v2, backfill: undefined }));
  let cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.ok, `the shadow check holds on the real rows before the XP switch: ${cmp.matched} of ${cmp.athletes}`, cmp.rows.filter(r => !r.ok).map(r => JSON.stringify(r)).join('\n'));
  const h3 = filesAt(HEAD);
  withRulebook(h3, asVersion(3, D_XP));
  const v3 = (await one(db, seedSql(seedFrom(h3)))).r;
  ok(v3 && v3.version === 3 && v3.turned_on === 'xp' && v3.switch.xp === D_XP, `the XP switch on since ${D_XP}: rulebook ${v3 && v3.version}, ${v3 && v3.levels && v3.levels.length} athletes' levels kept or lifted`, JSON.stringify(v3 && { ...v3, levels: undefined, backfill: undefined }));

  // made-up athletes that exist BEFORE the catalogue switch (their history is minted at the go-day)
  section('1b. athletes made up for the go-day: a comeback history (D14 both ways), the events, the longest real log twice (for the timing)');
  // zz_hist: three training returns and no Proof comeback: HARD TO KILL never paid it, so the new comebacks badge pays it (D14)
  await mkLogin(db, 'zz_hist');
  const cs1 = addDays(today, -100);
  await insProgram(db, 'zz_hist', prog({ start: cs1, end: addDays(cs1, 83) }));
  for (const wk of [1, 4, 7, 10]) await insSession(db, 'zz_hist', 1, addDays(cs1, 7 * (wk - 1) + 1), sess());
  await insProgress(db, 'zz_hist', habitLog(today, -30, -1, { water: 8, steps: 11000 }), CFG_THREE);
  // zz_hist2: three comebacks that stuck in Proof (a run of 8 days on target after a gap of 3, three times over): HARD TO KILL paid them, so the new badge pays nothing
  await mkLogin(db, 'zz_hist2');
  const onDays = [];
  { let o = -66; for (let r = 0; r < 4; r++) { for (let k = 0; k < 8; k++) onDays.push(o++); o += 3; } }
  await insProgram(db, 'zz_hist2', prog({ start: addDays(today, -20), end: addDays(today, 14) }));
  await insProgress(db, 'zz_hist2', Object.fromEntries(onDays.map(o => [addDays(today, o), { water: 8, steps: 11000 }])), CFG_THREE);
  // zz_ev: the five events done in history, WORKOUT ticked, with the event titles Proof's phone had already worn
  await mkLogin(db, 'zz_ev');
  await insProgram(db, 'zz_ev', prog({ start: addDays(today, -20), end: addDays(today, 14) }));
  await insProgress(db, 'zz_ev', habitLog(today, -40, -15, { water: 8, steps: 11000, sleep: 8, fuel: 3, mobility: 1, strength: 1 }), CFG_ALL);
  await q(db, `insert into public.hab_titles (athlete_id, title, earned_on) values ('zz_ev', 't_bedrock', $1)`, [addDays(today, -16)]);
  await q(db, `insert into public.leaderboard_optin (athlete_id, display_name) values ('zz_ev', 'Zed Ev')`);
  const cHist = await val(db, `select count(*)::int from public.career_facts where athlete_id = 'zz_hist' and kind = 'training_return' and void_at is null`);
  const cStuck = await val(db, `select count(*)::int from public.career_facts where athlete_id = 'zz_hist2' and kind = 'comeback_stuck' and void_at is null`);
  ok(cHist === 3 && cStuck >= 3, `zz_hist has ${cHist} training returns, zz_hist2 ${cStuck} comebacks that stuck`, 'the made-up histories do not make the facts the scenario needs: ' + cHist + '/' + cStuck);

  // the longest real log, twice: one is saved WITHOUT stage70 (the control), the other with it (section 9)
  const facts = await q(db, `select athlete_id as id, count(*)::int as n from public.career_facts where void_at is null and athlete_id not like 'zz\\_%' group by 1 order by 2 desc`);
  const big = facts[0].id;
  info(`the longest real logs (facts): ${facts.slice(0, 5).map(f => f.id + ' ' + f.n).join(', ')}`);
  async function clone(src, dst) {
    await mkLogin(db, dst);
    await db.exec(`set session_replication_role = replica`);
    await q(db, `insert into public.athlete_progress (athlete_id, athlete_name, data)
                 select $2, 'Clone', (select jsonb_object_agg(case when e.key like $1 || '\\_%' then $2 || substr(e.key, length($1) + 1) else e.key end, e.value) from jsonb_each(ap.data) e)
                   from public.athlete_progress ap where ap.athlete_id = $1`, [src, dst]);
    await q(db, `insert into public.programs (athlete_id, data) select $2, jsonb_set(data, '{athlete,lastName}', to_jsonb($2::text)) from public.programs where athlete_id = $1`, [src, dst]);
    await q(db, `insert into public.session_history (athlete_id, athlete_name, day, completed_on, status, session_rpe, duration_min, readiness, day_note, focus, summary, coach_status, log)
                 select $2, athlete_name, day, completed_on, status, session_rpe, duration_min, readiness, day_note, focus, summary, coach_status, log
                   from public.session_history where athlete_id = $1 and hidden_at is null`, [src, dst]);
    await db.exec(`set session_replication_role = origin`);
    return (await one(db, `select public.career_backfill($1) as r`, [dst])).r;
  }
  await clone(big, 'zz_ctl'); await clone(big, 'zz_long');
  const nfacts = id => val(db, `select count(*)::int from public.career_facts where athlete_id = $1 and void_at is null`, [id]);
  ok(await nfacts('zz_ctl') === await nfacts('zz_long') && await nfacts('zz_long') >= facts[0].n * 0.9,
     `${big}'s log cloned twice (${await nfacts('zz_long')} facts each, ${facts[0].n} in the original)`);

  // the saves timed in section 9: five Proof saves and five session saves, the same on both clones
  const proofSaves = async (id, tag) => {
    const base = JSON.parse((await one(db, `select data ->> $2 as l from public.athlete_progress where athlete_id = $1`, [id, id + '_hab_log'])).l || '{}');
    const times = [];
    const steps = [{ water: 8 }, { water: 8, steps: 11000 }, { water: 8, steps: 11000, sleep: 8 }, { water: 8, steps: 11000, sleep: 8, fuel: 3 }, { water: 8, steps: 11000, sleep: 8, fuel: 3, mobility: 1 }];
    for (const v of steps) { base[today] = v; times.push((await doorProgress(db, id, base))[1]); }
    return times;
  };
  const sessionSaves = async id => {
    const times = [];
    for (let k = 0; k < 5; k++) times.push((await doorSession(db, id, 1 + (k % 3), addDays(today, -1 - k), sess({ w: 60 + k })))[1]);
    return times;
  };
  const ctlProof = await proofSaves('zz_ctl'), ctlSess = await sessionSaves('zz_ctl');
  info(`control (stage69 only) on ${big}'s log: Proof saves ${ctlProof.join(' / ')} ms, session saves ${ctlSess.join(' / ')} ms`);

  // everything stage70 must leave as it was while the switch is off
  const allIds0 = (await q(db, `select z.id from (select ap.athlete_id as id from public.athlete_progress ap where ap.data ? (ap.athlete_id || '_hab_log')
                                  union select r.athlete_id from public.hab_season_results r union select f.athlete_id from public.career_facts f where f.void_at is null) z order by 1`)).map(r => r.id);
  const score0 = {}, prof0 = {};
  for (const id of allIds0) { score0[id] = stripVolatile(await scoreOf(db, id)); prof0[id] = await profile(db, id); }
  await asCoach(db);
  const board0 = { season: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`), week: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'week', 50)`) };
  await asNobody(db);
  const REPLACED = ['career_facts_paid', 'career_stamp', 'career_score', 'career_compute', 'career_scored', 'career_scores_for', 'career_seed', 'get_profile', 'career_compare', 'career_sync',
                    'career_keep_levels', 'career_derive', 'career_observe_proof', 'career_observe_session', 'career_on_progress', 'career_on_session', 'career_on_programme'];
  const defsOf = async names => Object.fromEntries((await q(db, `select p.proname as n, pg_get_functiondef(p.oid) as d from pg_proc p join pg_namespace s on s.oid = p.pronamespace
      where s.nspname = 'public' and p.proname = any($1) order by 1`, [names])).map(r => [r.n, r.d.replace(/\r/g, '')]));
  const defs0 = await defsOf(REPLACED);
  const fnNames0 = new Set((await q(db, `select p.proname as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public'`)).map(r => r.n));
  const trig0 = (await q(db, `select tgrelid::regclass::text || '.' || tgname as t from pg_trigger where not tgisinternal order by 1`)).map(r => r.t);
  ok(allIds0.length >= 30, `${allIds0.length} athletes are in the go-day list before stage70 (scores, profiles and the board kept to compare)`);
  if (STOP < 2) return finish();

  // ── 2. stage70, twice; the phase 3 catalogue data with the switch off ───────────────────────────────────────────────────
  section('2. stage70 twice, then the phase 3 catalogue data at the same version with the switch off');
  const s70 = read(path.join(ROOT, 'supabase', 'stage70_career_rewards.sql'));
  const [, tS70] = await ms(() => runSql(db, s70, 'stage70'));
  await runSql(db, s70, 'stage70 again');
  ok(true, `stage70 applied (${Math.round(tS70 / 1000)} s), and applied again without an error`);
  const erase1 = (await one(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).d;
  ok((erase1.match(/'career_awards'/g) || []).length === 1 && (erase1.match(/'career_recognition'/g) || []).length === 1
     && erase1.replace(`'career_scores', 'career_awards', 'career_recognition']`, `'career_scores']`) === erase0,
     'coach_erase_person() learns career_awards and career_recognition exactly once, and nothing else in it moves', undefined, 'L1');
  const open = (await q(db, `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
                              and (p.proname like 'career\\_%' or p.proname in ('get_profile', 'mark_moments_told')) and has_function_privilege('authenticated', p.oid, 'execute')`)).map(r => r.proname).sort();
  ok(JSON.stringify(open) === JSON.stringify(['get_profile', 'mark_moments_told']), 'only get_profile and mark_moments_told are open to a signed-in athlete', open.join(','), 'L1');
  const newFns = (await q(db, `select p.proname as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public'`)).map(r => r.n).filter(x => !fnNames0.has(x));
  info(`stage70 adds ${new Set(newFns).size} functions: ${[...new Set(newFns)].sort().join(', ')}`);
  const tables = async () => (await q(db, `select (select count(*)::int from public.career_awards) as a, (select count(*)::int from public.career_recognition) as r`))[0];
  const work = filesAt(null);
  withRulebook(work, asVersion(3, D_XP));
  const wp = payloadOf(work);
  const v3b = (await one(db, seedSql(seedFrom(work)))).r;
  ok(v3b && v3b.version === 3 && !v3b.turned_on && v3b.switch.xp === D_XP && v3b.switch.catalogue === 'off',
     `the working files seed at the same version 3, both switches as they were (${v3b && v3b.catalogue} catalogue rows, backfill ${JSON.stringify(v3b && v3b.backfill && v3b.backfill.athletes)} athletes)`, JSON.stringify(v3b && { ...v3b, backfill: undefined }), 'L2');
  let t = await tables();
  ok(t.a === 0 && t.r === 0, 'zero awards, zero recognition rows with the catalogue switch off');
  ok((await val(db, `select public.career_evaluate($1)`, [big])) === null, 'career_evaluate() answers null and writes nothing while the switch is off', undefined, 'L1');
  const diffs = [];
  for (const id of allIds0) {
    const s = stripVolatile(await scoreOf(db, id)), p = await profile(db, id);
    if (JSON.stringify(s) !== JSON.stringify(score0[id])) diffs.push(`${id}: score ${score0[id].career.xp} → ${s.career.xp}`);
    const a = JSON.parse(JSON.stringify(prof0[id])), b = JSON.parse(JSON.stringify(p));
    for (const k of ['rules']) { delete a[k]; delete b[k]; }
    if (JSON.stringify(stripVolatile(a)) !== JSON.stringify(stripVolatile(b))) diffs.push(`${id}: profile keys differ: ${Object.keys(b).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).join(',')}`);
    if (!(Array.isArray(p.badges) && !p.badges.length && Array.isArray(p.achievements) && !p.achievements.length && Array.isArray(p.moments) && !p.moments.length) || 'owned' in p || 'ladder' in p) diffs.push(`${id}: a phase 3 slot is filled`);
  }
  ok(diffs.length === 0, `every athlete's score and profile are exactly what they were before stage70 (${allIds0.length}); badges, achievements and moments are []`, diffs.slice(0, 8).join('\n'), 'L1');
  await asCoach(db);
  const board1 = { season: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`), week: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'week', 50)`) };
  await asNobody(db);
  ok(JSON.stringify(board1) === JSON.stringify(board0), `the board is exactly as before (${board1.season.length} on it, both scopes)`, undefined, 'L1');
  cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.ok && !('catalogue_switch' in cmp && cmp.catalogue_switch), `the compare still holds with the switch off: ${cmp.matched} of ${cmp.athletes}`, cmp.rows.filter(r => !r.ok).map(r => JSON.stringify(r)).join('\n'), 'L1');
  if (STOP < 3) return finish();

  // ── 3. the go-day ───────────────────────────────────────────────────────────────────────────────────────────────────────
  section('3. the go-day: the refusals, the scores before, the dry run, the seed that only flips the switch, the batches');
  const steps = py([path.join(ROOT, 'scripts', 'career_seed.py'), '--catalogue-steps', '--day', S]);
  const stepSql = steps.stdout || '';
  const cnt = re => (stepSql.match(re) || []).length;
  ok(steps.status === 0 && cnt(/career_catalogue_before\(\d+, 5\)/g) === 20 && cnt(/career_catalogue_preview\(/g) === 20 && cnt(/career_rewards_batch\(\d+, 5, 'baseline'\)/g) === 20 && /career_compare/.test(stepSql),
     `career_seed.py --catalogue-steps prints the go-day statements: 20 batches of 5 athletes each for the scores before, the dry run and the baseline (${stepSql.split('\n').length} lines)`, steps.stderr, 'L2');
  const rules3 = (await one(db, `select public.career_rules_now() as r`)).r;
  const cat3 = (await one(db, `select jsonb_agg(jsonb_build_object('kind', kind, 'id', id, 'body', body)) as c from public.career_catalogue`)).c;
  const seedJson = (r, c) => one(db, `select public.career_seed($1::int, $2::jsonb, $3::jsonb, 'rehearsal') as r`, [r.version, JSON.stringify(r), JSON.stringify(c || cat3)]);
  const refuse = async (rules, re, what, cat) => {
    let e = null; try { await seedJson(rules, cat); } catch (x) { e = String(x.message); }
    ok(e && re.test(e), what, e || 'no error: the seed went through', 'L1');
  };
  const on = JSON.parse(JSON.stringify(rules3)); on.switch.catalogue = S;
  const changedRule = JSON.parse(JSON.stringify(on)); changedRule.habits.qualify_pct = 81;
  await refuse(changedRule, /no other change/, 'the catalogue switch together with a rulebook change is refused');
  const changedCat = JSON.parse(JSON.stringify(cat3)); changedCat.find(c => c.kind === 'badge' && c.id === 'full_log').body.tiers[0].xp = 111;
  await refuse(on, /no other change/, 'the catalogue switch together with a catalogue data change is refused', changedCat);
  const old = JSON.parse(JSON.stringify(on)); old.switch.catalogue = addDays(today, -3);
  await refuse(old, /today \(or yesterday/, 'a switch day older than yesterday is refused');
  const fut = JSON.parse(JSON.stringify(on)); fut.switch.catalogue = addDays(today, 2);
  await refuse(fut, /still to come/, 'a switch day still to come is refused');
  // with the XP switch off in a transaction that is undone: the catalogue switch needs it, and the two never go on in one seed
  await db.exec('begin');
  await q(db, `update public.career_rules set rules = jsonb_set(rules, '{switch,xp}', '"off"') where version = 3`);
  const rOff = JSON.parse(JSON.stringify(rules3)); rOff.switch.xp = 'off'; rOff.switch.catalogue = S;
  await refuse(rOff, /needs the XP switch/, 'the catalogue switch before the XP switch is refused');
  await db.exec('rollback'); await db.exec('begin');
  await q(db, `update public.career_rules set rules = jsonb_set(rules, '{switch,xp}', '"off"') where version = 3`);
  const rBoth = JSON.parse(JSON.stringify(rules3)); rBoth.switch.xp = D_XP; rBoth.switch.catalogue = S;
  await refuse(rBoth, /two seeds, days apart/, 'the XP switch and the catalogue switch in one seed are refused');
  await db.exec('rollback');
  ok((await val(db, `select max(version)::int from public.career_rules`)) === 3 && !(await val(db, `select public.career_catalogue_on()`)) && (await val(db, `select rules #>> '{switch,xp}' from public.career_rules where version = 3`)) === D_XP,
     'and none of the refusals changed anything (rulebook 3, the XP switch still on, the catalogue switch off)', undefined, 'L1');

  // the scores before, kept in backup.career_catalogue_before, a slice at a time
  let ids = [], nb = 0;
  for (let o = 0; o < 400; o += 5) { const r = (await one(db, `select public.career_catalogue_before($1, 5) as r`, [o])).r; if (!r.n) break; nb += r.n; ids = ids.concat(r.ids); }
  const allIds = (await q(db, `select * from public.career_rewards_athletes(0, 1000)`)).map(r => r.career_rewards_athletes);
  ok(nb === allIds.length && JSON.stringify(ids) === JSON.stringify(allIds) && (await val(db, `select count(*)::int from backup.career_catalogue_before`)) === nb,
     `career_catalogue_before kept ${nb} scores in slices of 5 and the next slice after the last answered 0 (the list is ${allIds.length} athletes, in id order)`, undefined, 'L1');
  const before = Object.fromEntries((await q(db, `select athlete_id, score from backup.career_catalogue_before`)).map(r => [r.athlete_id, r.score]));
  ok(allIds0.every(id => before[id] && before[id].career.xp === score0[id].career.xp), 'the scores kept are the scores of section 1 (stage70 and the catalogue data moved nothing)', undefined, 'L1');

  // the dry run
  const prevLines = [];
  const [, tPrev] = await ms(async () => {
    for (let o = 0; o < 400; o += 5) { const r = (await one(db, `select public.career_catalogue_preview($1::jsonb, $2, 5) as r`, [JSON.stringify(on), o])).r; if (!r.n) break; prevLines.push(...r.lines); }
  });
  t = await tables();
  ok(prevLines.length === allIds.length && t.a === 0 && t.r === 0 && !(await val(db, `select public.career_catalogue_on()`)) && (await val(db, `select max(version)::int from public.career_rules`)) === 3
     && (await val(db, `select rules #>> '{switch,catalogue}' from public.career_rules where version = 3`)) === 'off',
     `the dry run answers every athlete's line (${prevLines.length}, ${Math.round(tPrev / 1000)} s) and afterwards: zero awards, the switch still off, the rulebook unchanged`, undefined, 'L1');
  ok(prevLines.every(l => l.ok && l.awards >= 0), `every dry-run line is ok (level_after >= level_before)`, prevLines.filter(l => !l.ok).map(l => JSON.stringify(l)).join('\n'), 'L1');
  ok(prevLines.every(l => l.proof_sum === null || l.proof_carried === l.proof_sum || l.proof_carried === Number(l.proof_sum)), `in the dry run Proof's own tiers and milestones equal what the awards carry, athlete by athlete`,
     prevLines.filter(l => l.proof_sum !== null && Number(l.proof_carried) !== Number(l.proof_sum)).map(l => `${l.athlete_id}: carried ${l.proof_carried}, Proof ${l.proof_sum}`).join('\n'), 'L1');

  // the seed that only flips the switch
  const goSeed = (await seedJson(on)).r;
  ok(goSeed.turned_on === 'catalogue' && goSeed.switch.catalogue === S && goSeed.backfill && goSeed.backfill.skipped && /catalogue-steps/.test(goSeed.next || ''),
     `the seed alone: the catalogue switch on since ${goSeed.switch.catalogue}, no backfill, next names the batches`, JSON.stringify(goSeed), 'L1');
  t = await tables();
  ok(t.a === 0, 'the seed mints nothing itself: it only flips the switch', undefined, 'L1');
  // between the seed and the batch: nobody's score drops (4.4), whoever reads the board first
  const probe = [big, 'zz_hist', 'zz_hist2', 'zz_ev', ...facts.slice(1, 6).map(f => f.id)];
  await asCoach(db);
  const [sf, tSf] = await ms(() => q(db, `select athlete_id, score from public.career_scores_for($1::text[])`, [probe]));
  await asNobody(db);
  const lower = sf.filter(r => r.score && before[r.athlete_id] && r.score.career.xp < before[r.athlete_id].career.xp);
  ok(sf.length > 0 && lower.length === 0, `between the seed and the batch career_scores_for() returns no score lower than before (${sf.length} of ${probe.length} athletes served in ${tSf} ms)`,
     lower.map(r => `${r.athlete_id}: ${before[r.athlete_id].career.xp} → ${r.score.career.xp}`).join('\n'), 'L1');
  const single = (await one(db, `select public.career_scored($1) as s`, [big])).s;
  ok(single.career.xp >= before[big].career.xp, `and career_scored() of the longest log is not lower than before (${before[big].career.xp} → ${single.career.xp})`, undefined, 'L1');

  // the baseline batch, every athlete
  const lines = [];
  const [, tBatch] = await ms(async () => {
    for (let o = 0; o < 400; o += 5) { const r = (await one(db, `select public.career_rewards_batch($1, 5, 'baseline') as r`, [o])).r; if (!r.n) break; lines.push(...r.lines); }
  });
  info(`the baseline batch: ${lines.length} athletes in ${Math.round(tBatch / 1000)} s here (PGlite is slower than the live project)`);
  ok(lines.length === allIds.length && lines.every(l => l.ok), `the baseline batch answers ${lines.length} lines and every one is ok`, lines.filter(l => !l.ok).map(l => JSON.stringify(l)).join('\n'), 'L1');
  const L = Object.fromEntries(lines.map(l => [l.athlete_id, l]));
  const hr = (await one(db, `select public.career_habit_rules() as h`)).h;
  const consBad = [], carryBad = [], downBad = [], backBad = [], names = [];
  let backTotal = 0, carriedTotal = 0;
  for (const id of allIds) {
    const l = L[id], b = before[id], after = await scoreOf(db, id);
    const priced = Number(await val(db, `select coalesce(sum(case when not a.pays then 0 else coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, $2::jsonb), a.xp) end), 0)
                                           from public.career_awards a left join public.career_catalogue c on c.kind = a.kind and c.id = a.item
                                          where a.athlete_id = $1 and a.day <= $3::date and coalesce(c.body ->> 'origin', 'new') <> 'proof'`, [id, JSON.stringify(hr), S]));
    const carried = Number(await val(db, `select coalesce(sum(case when not a.pays then 0 else coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, $2::jsonb), a.xp) end), 0)
                                           from public.career_awards a left join public.career_catalogue c on c.kind = a.kind and c.id = a.item
                                          where a.athlete_id = $1 and a.day <= $3::date and c.body ->> 'origin' = 'proof'`, [id, JSON.stringify(hr), S]));
    const proofPart = await val(db, `select public.hab_bonus_xp(public.career_log($1), public.career_cfg($1), null, null, $2::date,
                                      public.career_habit_rules() || '{"quests": [], "questRuns": [], "comebackXp": 0}'::jsonb)`, [id, S]);
    backTotal += priced; carriedTotal += carried;
    if (after.career.xp !== b.career.xp + priced) consBad.push(`${id}: ${b.career.xp} + back-pay ${priced} = ${b.career.xp + priced}, the scorer says ${after.career.xp}`);
    if (Number(proofPart) !== carried) carryBad.push(`${id}: hab_bonus_xp tiers+milestones ${proofPart}, carried by awards ${carried}`);
    if (after.career.level < b.career.level) downBad.push(`${id}: level ${b.career.level} → ${after.career.level}`);
    if (l.back_pay !== priced || Number(l.proof_carried) !== carried) backBad.push(`${id}: line back_pay ${l.back_pay}/${priced}, proof_carried ${l.proof_carried}/${carried}`);
  }
  ok(consBad.length === 0, `CONSERVATION, through the real scorer: every athlete's career XP after = the XP before + the back-pay, exactly (${allIds.length}; ${backTotal} XP of back-pay in all)`, consBad.slice(0, 10).join('\n'), 'L1');
  ok(carryBad.length === 0, `Proof's tiers and milestones are carried over to the point: the awards of Proof's entries = hab_bonus_xp's tiers+milestones to the switch day, per athlete (${carriedTotal} XP in all)`, carryBad.slice(0, 10).join('\n'), 'L1');
  ok(downBad.length === 0, `nobody's level goes down at the switch (level_after >= level_before, ${allIds.length} athletes)`, downBad.join('\n'), 'L1');
  ok(backBad.length === 0, `the lines tell the truth: back_pay and proof_carried equal an independent sum over career_awards`, backBad.slice(0, 10).join('\n'), 'L1');
  const sums = lines.filter(l => l.proof_sum != null);
  const pdiff = sums.filter(l => Number(l.proof_sum) !== Number(l.proof_carried));
  ok(true, `proof_sum (Proof's own, on its log) against proof_carried (the facts): ${sums.length - pdiff.length} of ${sums.length} athletes equal` + (pdiff.length ? `; they differ for ${pdiff.map(l => `${l.athlete_id} ${l.proof_sum}/${l.proof_carried}`).join(', ')}` : ''));
  const sdelta = lines.map(l => ({ id: l.athlete_id, d: Number(l.season_after) - Number(l.season_before), b: Number(l.season_before) })).filter(x => x.d !== 0);
  info(`SEASON POINTS move for ${sdelta.length} of ${lines.length} athletes (D1: the switch lands mid-season here): ` + (sdelta.length ? `largest drop ${Math.min(...sdelta.map(x => x.d))}, largest rise ${Math.max(...sdelta.map(x => x.d))}` : 'none'));
  const lvlUp = lines.filter(l => l.level_after > l.level_before).length;
  info(`levels: ${lvlUp} athletes gain a level from the back-pay, ${lines.length - lvlUp} stay`);
  if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ today, S, lines }, null, 1));
  ok(prevLines.length === lines.length && prevLines.every((p, i) => p.athlete_id === lines[i].athlete_id && p.xp_before === lines[i].xp_before && p.xp_after === lines[i].xp_after && p.awards === lines[i].awards),
     'the real run gives exactly the list the dry run showed (awards, XP before and after)', prevLines.map((p, i) => lines[i] && (p.xp_after !== lines[i].xp_after || p.awards !== lines[i].awards) ? `${p.athlete_id}: dry ${p.xp_after}/${p.awards}, real ${lines[i].xp_after}/${lines[i].awards}` : null).filter(Boolean).slice(0, 8).join('\n'), 'L1');
  t = await tables();
  ok(t.r === 0, 'zero recognition rows after the baseline: history is silent', undefined, 'L1');
  const again = [];
  for (let o = 0; o < 400; o += 5) { const r = (await one(db, `select public.career_rewards_batch($1, 5, 'silent') as r`, [o])).r; if (!r.n) break; again.push(...r.lines); }
  const t2 = await tables();
  ok(t2.a === t.a && t2.r === 0 && again.every(l => l.ok), `evaluate everyone again: 0 minted (${t2.a} awards both times)`, undefined, 'L1');
  // the catalogue's rules at the switch
  const retiredLate = await q(db, `select a.athlete_id, a.award_id, a.day::text from public.career_awards a join public.career_catalogue c on c.kind = a.kind and c.id = a.item
                                    where c.body ? 'retire_at' and a.day > $1::date`, [S]);
  ok(retiredLate.length === 0, 'every retired entry has no award dated after the switch day', JSON.stringify(retiredLate.slice(0, 5)), 'L1');
  const startsBad = await q(db, `select a.athlete_id, a.award_id, a.pays, a.xp from public.career_awards a join public.career_catalogue c on c.kind = a.kind and c.id = a.item
                                  where c.body ? 'starts_at' and a.day <= $1::date and a.pays and c.id <> 'comebacks'`, [S]);
  ok(startsBad.length === 0, 'every starts_at award with a day on or before the switch day pays nothing, except the comebacks that D14 pays', JSON.stringify(startsBad.slice(0, 5)), 'L1');
  const cbRows = await q(db, `select a.athlete_id, a.award_id, a.pays, a.xp, a.day::text from public.career_awards a where a.item = 'comebacks' and a.day <= $1::date`, [S]);
  const cbH = cbRows.find(r => r.athlete_id === 'zz_hist' && r.award_id === 'badge:comebacks:1'), cbH2 = cbRows.find(r => r.athlete_id === 'zz_hist2' && r.award_id === 'badge:comebacks:1');
  ok(cbH && cbH.pays === true && cbH.xp === 300, 'D14: three training returns and no Proof comeback: comebacks tier 1 is back-pay (300 XP)', JSON.stringify(cbH), 'L1');
  ok(cbH2 && cbH2.pays === false && cbH2.xp === 0, 'D14: three comebacks that stuck in Proof (HARD TO KILL paid them): comebacks tier 1 pays nothing', JSON.stringify(cbH2), 'L1');
  const htk = await q(db, `select award_id, pays, xp from public.career_awards where athlete_id = 'zz_hist2' and item = 'hard_to_kill'`);
  ok(htk.length >= 1 && htk[0].pays && htk[0].xp === 300, `and HARD TO KILL tier 1 is carried over at Proof's price (zz_hist2: ${JSON.stringify(htk)})`, undefined, 'L1');
  const evT = await q(db, `select award_id from public.career_awards where athlete_id = 'zz_ev' and kind = 'title' order by 1`);
  ok(evT.length >= 3, `the events done in history mint their titles with their awards (zz_ev: ${evT.map(r => r.award_id).join(', ')})`, undefined, 'L1');
  const evH = (await q(db, `select title from public.hab_titles where athlete_id = 'zz_ev' order by 1`)).map(r => r.title);
  ok(evH.includes('t_bedrock') && evH.includes('t_sunforged'), `and hab_titles holds the Proof ids (${evH.join(', ')})`, undefined, 'L1');
  cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.ok && cmp.catalogue_switch === S && cmp.rows.every(r => r.awards && Number(r.awards.proof) === Number(r.awards.career) || (r.settled)),
     `career_compare() is ok after the switch, its awards equal or settled (${cmp.matched} of ${cmp.athletes})`, cmp.rows.filter(r => !r.ok || (r.awards && r.awards.proof !== r.awards.career)).map(r => JSON.stringify(r)).slice(0, 6).join('\n'), 'L1');
  // the board and the profiles read the same numbers
  await asCoach(db);
  const board2 = await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`);
  await asNobody(db);
  const byName = Object.fromEntries((await q(db, `select athlete_id, display_name from public.leaderboard_optin`)).map(r => [r.display_name, r.athlete_id]));
  const boardOff = [];
  for (const row of board2) { const p = await profile(db, byName[row.display_name]); if (Number(row.xp) !== p.season.points || row.level !== p.career.level) boardOff.push(`${row.display_name}: board ${row.xp}/${row.level}, profile ${p.season.points}/${p.career.level}`); }
  ok(boardOff.length === 0, `the board and every profile agree after the switch (${board2.length} on it)`, boardOff.join('\n'), 'L1');
  // the refusals that need the switch on
  const offAgain = JSON.parse(JSON.stringify(rules3)); offAgain.switch.catalogue = 'off';
  await refuse(offAgain, /never turned back off/, 'the catalogue switch turned back off is refused');
  const xpOff = JSON.parse(JSON.stringify(on)); xpOff.switch.xp = 'off';
  await refuse(xpOff, /never turned back off/, 'the XP switch turned back off is refused');
  const same = (await seedJson(on)).r;
  ok(!same.turned_on && same.backfill.skipped && (await tables()).a === t.a, 'the switch seed again: nothing turned on, no backfill, no new award', JSON.stringify(same), 'L1');
  if (STOP < 4) return finish();

  // ── 4. live mints through the real doors ──────────────────────────────────────────────────────────────────────────────────
  // DEVICE (a): the switch day moves back so the made-up scenarios have days after it (a seed would refuse an old day; this is a direct UPDATE)
  const SL = addDays(today, -100);
  section(`4. live mints through the real doors on made-up athletes (the switch day is moved back to ${SL}: a test device, the go-day above ran on ${S})`);
  await q(db, `update public.career_rules set rules = jsonb_set(rules, '{switch,catalogue}', to_jsonb($1::text)), loaded_at = clock_timestamp() where version = 3`, [SL]);
  const rulesNow = (await one(db, `select public.career_rules_now() as r`)).r;
  const bf = Number(rulesNow.habits.backfill_days);

  // 4a. a Proof log crossing a habit badge tier
  await mkLogin(db, 'zz_tier');
  await insProgram(db, 'zz_tier', prog({ start: addDays(today, -10), end: addDays(today, 20) }));
  const logTier = habitLog(today, -4, 0, { water: 8 });
  const [, tTier] = await doorProgress(db, 'zz_tier', logTier, CFG_THREE);
  let aw = await awardsOf(db, 'zz_tier'), rc = await recOf(db, 'zz_tier');
  const w1 = aw.filter(a => a.award_id === 'badge:habit_water:1');
  ok(w1.length === 1 && w1[0].how === 'live' && w1[0].pays && w1[0].xp === 20 && w1[0].day === today && rc.filter(r => r.award_id === 'badge:habit_water:1').length === 1 && rc.find(r => r.award_id === 'badge:habit_water:1').size === 'win',
     `a Proof log crossing a habit badge tier: one award (Water, tier 1, live, 20 XP, ${w1[0] && w1[0].day}), one recognition row (win), saved in ${tTier} ms`, JSON.stringify({ aw: aw.map(a => a.award_id), rc }), 'L1');
  ok(!aw.some(a => /habit_tiers/.test(a.award_id)), 'and the retired habit_tiers ladder mints nothing after the switch', undefined, 'L1');
  const owned = (await profile(db, 'zz_tier')).owned;
  ok(owned && owned['badge:habit_water:1'] === today, 'the profile lists it in owned', undefined, 'L1');

  // 4b. ten weeks held, one session each, saved through the door: Hold Serve, Long Count, Held
  await mkLogin(db, 'zz_week');
  const wst = addDays(today, -63);
  await insProgram(db, 'zz_week', prog({ start: wst, end: addDays(wst, 69) }));
  const wkTimes = [];
  for (let k = 1; k <= 10; k++) wkTimes.push((await doorSession(db, 'zz_week', 1, k === 10 ? today : addDays(wst, 7 * (k - 1) + 1), sess({ w: 40 + k })))[1]);
  aw = await awardsOf(db, 'zz_week'); rc = await recOf(db, 'zz_week');
  const has = id => aw.find(a => a.award_id === id);
  ok(has('badge:held_weeks:1') && has('badge:held_weeks:2') && has('badge:long_count:1') && has('achievement:held') && !has('badge:held_weeks:3'),
     `a session save closing a held week, ten times over: Hold Serve tiers 1 and 2, Long Count tier 1 and Held (${aw.map(a => a.award_id).join(', ')})`, undefined, 'L1');
  ok(has('badge:held_weeks:1').how === 'live' && has('badge:held_weeks:1').day === addDays(wst, 7 * 3 + 1) && has('badge:long_count:1').day === today,
     `each dated the day the measure crossed (tier 1 on ${has('badge:held_weeks:1') && has('badge:held_weeks:1').day}, Long Count on ${has('badge:long_count:1') && has('badge:long_count:1').day}), all live`, undefined, 'L1');
  ok(['badge:held_weeks:1', 'badge:held_weeks:2', 'badge:long_count:1', 'achievement:held'].every(id => rc.some(r => r.award_id === id)), 'each live award has its recognition row', JSON.stringify(rc), 'L1');
  info(`the ten session saves took ${wkTimes.join(' / ')} ms`);

  // 4c. Personal Records with mixed-case lifts: First Best and All-Court through the Spine's patterns
  await mkLogin(db, 'zz_pb');
  await insProgram(db, 'zz_pb', prog({ start: addDays(today, -30), end: addDays(today, 40) }));
  const first = d => ({ d: addDays(today, d), kg: 100, t: 1 });
  const best = (d, kg) => ({ d: addDays(today, d), kg, auto: true, t: 2 });
  const lifts4 = [['back SQUAT', -20, -6], ['RDL', -20, -5], ['Bench press', -20, -4], ['Mystery Lift', -20, -3]];
  const recs1 = []; for (const [lift, d1, d2] of lifts4) { recs1.push({ lift, ...first(d1) }); recs1.push({ lift, ...best(d2, 105) }); }
  const [, tPb1] = await doorProgress(db, 'zz_pb', {}, CFG_THREE, recs1);
  aw = await awardsOf(db, 'zz_pb');
  ok(aw.some(a => a.award_id === 'achievement:first_best' && a.day === addDays(today, -6) && a.how === 'live') && !aw.some(a => a.award_id === 'achievement:all_court'),
     `a records save with mixed-case lifts mints First Best (live, ${addDays(today, -6)}); four groups placed (one lift the Spine cannot place counts for nothing) and All-Court waits`, JSON.stringify(aw.map(a => a.award_id)), 'L1');
  const recs2 = recs1.concat([{ lift: 'pull-UP', ...first(-20) }, { lift: 'pull-UP', ...best(-2, 105) }, { lift: 'Split squat', ...first(-20) }]);
  await doorProgress(db, 'zz_pb', {}, CFG_THREE, recs2);
  aw = await awardsOf(db, 'zz_pb');
  ok(!aw.some(a => a.award_id === 'achievement:all_court'), 'a fifth lift with only a first record is not a best: All-Court still waits', undefined, 'L1');
  const recs3 = recs2.concat([{ lift: 'Split squat', ...best(0, 105) }]);
  const [, tPb3] = await doorProgress(db, 'zz_pb', {}, CFG_THREE, recs3);
  aw = await awardsOf(db, 'zz_pb'); rc = await recOf(db, 'zz_pb');
  const ac = aw.find(a => a.award_id === 'achievement:all_court');
  ok(ac && ac.day === today && ac.how === 'live' && ac.size === 'milestone' && rc.some(r => r.award_id === 'achievement:all_court' && r.size === 'milestone'),
     `the fifth group's best completes All-Court: dated ${ac && ac.day}, a live milestone with its recognition row (a case-folded alias, 'RDL', and mixed-case names placed; ${tPb3} ms)`, JSON.stringify({ aw: aw.map(a => a.award_id), rc }), 'L1');

  // 4d. the end of a cycle: Flawless, By the Book, Kept Going, and a mid-cycle start
  async function cycleAthlete(id, { weeks, skipWeeks = [], fromWeek = 1, full = true, checkin = true, startOff }) {
    await mkLogin(db, id);
    const st = addDays(today, startOff), end = addDays(st, 7 * weeks - 1);
    await insProgram(db, id, prog({ start: st, end }));
    for (let k = fromWeek; k <= weeks; k++) if (!skipWeeks.includes(k)) await doorSession(db, id, 1, addDays(st, 7 * (k - 1) + 1), sess({ full, checkin, w: 40 + k }));
    return { st, end };
  }
  await cycleAthlete('zz_flaw', { weeks: 3, startOff: -30 });
  await cycleAthlete('zz_flaw2', { weeks: 3, startOff: -30, checkin: false });
  await cycleAthlete('zz_kept', { weeks: 5, skipWeeks: [3], startOff: -45 });
  await cycleAthlete('zz_mid', { weeks: 10, fromWeek: 3, startOff: -80 });
  await cycleAthlete('zz_late', { weeks: 10, fromWeek: 4, startOff: -80 });
  const A = Object.fromEntries(await Promise.all(['zz_flaw', 'zz_flaw2', 'zz_kept', 'zz_mid', 'zz_late'].map(async id => [id, new Set((await awardsOf(db, id)).map(a => a.award_id))])));
  ok(A.zz_flaw.has('achievement:flawless') && A.zz_flaw.has('achievement:by_the_book') && A.zz_flaw.has('achievement:first_cycle') && !A.zz_flaw.has('achievement:kept_going'),
     'a finished cycle with every week held and every session logged and checked in: Flawless, By the Book and First Cycle, not Kept Going', [...A.zz_flaw].join(', '), 'L1');
  ok(A.zz_flaw2.has('achievement:flawless') && !A.zz_flaw2.has('achievement:by_the_book'), 'the same cycle without check-ins: Flawless, not By the Book', [...A.zz_flaw2].join(', '), 'L1');
  ok(A.zz_kept.has('achievement:kept_going') && !A.zz_kept.has('achievement:flawless') && A.zz_kept.has('achievement:first_cycle'), 'a finished cycle with one broken week: Kept Going, not Flawless', [...A.zz_kept].join(', '), 'L1');
  ok(A.zz_mid.has('achievement:flawless') && A.zz_mid.has('achievement:first_cycle'), 'A MID-CYCLE START (first session in week 3 of 10, the 80% share just met) is still eligible for Flawless (D9)', [...A.zz_mid].join(', '), 'L1');
  ok(!A.zz_late.has('achievement:flawless') && !A.zz_late.has('achievement:first_cycle'), 'a start in week 4 of 10 (70% of the cycle) finishes no cycle, so no Flawless', [...A.zz_late].join(', '), 'L1');
  const fl = (await awardsOf(db, 'zz_flaw')).find(a => a.award_id === 'achievement:flawless');
  ok(fl && fl.how === 'live' && fl.day === addDays(addDays(today, -30), 21), `Flawless is dated the day after the cycle's last day (${fl && fl.day})`, undefined, 'L1');

  // 4e. the events, the Grand Slam, the title worn through set_title()
  async function eventAthlete(id, withStrength) {
    await mkLogin(db, id);
    await insProgram(db, id, prog({ start: addDays(today, -40), end: addDays(today, 20) }));
    await q(db, `insert into public.leaderboard_optin (athlete_id, display_name) values ($1, $2) on conflict do nothing`, [id, id]);
    const log = habitLog(today, -25, -2, { water: 8, steps: 11000, sleep: 8, fuel: 3, mobility: 1, ...(withStrength ? { strength: 1 } : {}) });
    return log;
  }
  const logSlam = await eventAthlete('zz_slam', true);
  await q(db, `insert into public.hab_titles (athlete_id, title, earned_on) values ('zz_slam', 't_unbowed', $1), ('zz_slam', 'climber', $1)`, [addDays(today, -30)]);
  await doorProgress(db, 'zz_slam', logSlam, CFG_ALL);
  aw = await awardsOf(db, 'zz_slam'); rc = await recOf(db, 'zz_slam');
  const titles = aw.filter(a => a.kind === 'title').map(a => a.item);
  ok(['bedrock', 'sun_forged', 'cold_forged', 'still_here', 'grand_slam'].every(x => titles.includes(x)), `the events minted their titles and, with two Proof-worn titles of the other meanings, the GRAND SLAM (${titles.join(', ')})`, undefined, 'L1');
  const gs = aw.find(a => a.award_id === 'title:grand_slam');
  ok(gs && gs.size === 'legend' && gs.how === 'live' && rc.some(r => r.award_id === 'title:grand_slam' && r.size === 'legend') && !rc.some(r => /^title:(bedrock|sun_forged|cold_forged|still_here)$/.test(r.award_id)),
     'the Grand Slam is a live legend with its OWN recognition row; the other titles ride on their awards (none of their own)', JSON.stringify(rc), 'L1');
  ok((await q(db, `select 1 from public.hab_titles where athlete_id = 'zz_slam' and title = 'grand_slam'`)).length === 1 && (await q(db, `select 1 from public.hab_titles where athlete_id = 'zz_slam' and title = 't_bedrock'`)).length === 1,
     'hab_titles carries the Proof ids (t_bedrock) and grand_slam, so set_title() and the board work unchanged', undefined, 'L1');
  const pSlam = await profile(db, 'zz_slam');
  ok(pSlam.slam && pSlam.slam.grand && ['consistency', 'commitment', 'progress', 'resilience'].every(k => pSlam.slam[k]), 'get_profile().slam has all four meanings and the Grand Slam day', JSON.stringify(pSlam.slam), 'L1');

  const logWear = await eventAthlete('zz_wear', false);
  await q(db, `insert into public.hab_titles (athlete_id, title, earned_on) values ('zz_wear', 't_unbowed', $1), ('zz_wear', 'climber', $1)`, [addDays(today, -30)]);
  await doorProgress(db, 'zz_wear', logWear, CFG_ALL);
  let pW = await profile(db, 'zz_wear');
  ok(pW.slam.consistency && pW.slam.progress && pW.slam.resilience && !pW.slam.commitment && !pW.slam.grand, 'zz_wear has three of the four meanings and no Grand Slam yet', JSON.stringify(pW.slam), 'L1');
  await asAthlete(db, SUB.zz_wear, 'zz_wear');
  await q(db, `select public.set_title('zz_wear', 't_sunforged', null)`);
  await asNobody(db);
  pW = await profile(db, 'zz_wear');
  ok(pW.slam.commitment && pW.slam.grand && pW.titles.some(t => t.id === 'grand_slam') && (await recOf(db, 'zz_wear')).some(r => r.award_id === 'title:grand_slam'),
     'an event title worn through set_title() completes the slam on the next get_profile (the rewards stamp includes hab_titles), with its legend row', JSON.stringify({ slam: pW.slam, rc: await recOf(db, 'zz_wear') }), 'L1');
  ok(pW.title_worn === 't_sunforged' || pW.title_worn === 'sun_forged', `and the profile shows the title worn (${pW.title_worn})`, undefined, 'L1');

  // 4f. the lift gains
  await mkLogin(db, 'zz_gain');
  await insProgram(db, 'zz_gain', prog({ start: addDays(today, -30), end: addDays(today, 40), days: [1, 2] }));
  await doorSession(db, 'zz_gain', 1, addDays(today, -10), sess({ w: 40 }));
  await doorSession(db, 'zz_gain', 2, addDays(today, -1), sess({ w: 90 }));
  aw = await awardsOf(db, 'zz_gain'); rc = await recOf(db, 'zz_gain');
  const up = aw.filter(a => a.item === 'the_upgrade').map(a => a.tier);
  ok(up.length === 5 && aw.some(a => a.award_id === 'achievement:double_up' && a.size === 'legend' && a.day === addDays(today, -1)) && aw.some(a => a.award_id === 'title:new_engine'),
     `a lift 125% up on its first session: The Upgrade tiers ${up.join(',')}, Double Up (a legend, dated ${addDays(today, -1)}) and its title NEW ENGINE`, JSON.stringify(aw.map(a => a.award_id)), 'L1');
  const pG = await profile(db, 'zz_gain');
  ok(pG.moments.length <= 8 && pG.moments.length === Math.min(8, rc.length) && pG.moments[0].size === 'legend', `moments are capped at 8 and the legend comes first (${rc.length} waiting rows, ${pG.moments.length} shown)`, undefined, 'L1');

  // 4g. a free athlete saving with no score row yet, then repeatedly (also 9)
  if (STOP < 5) return finish();

  // ── 5. partial calls ────────────────────────────────────────────────────────────────────────────────────────────────────
  section('5. partial calls');
  const pw0 = await profile(db, 'zz_week');
  const rw0 = (await one(db, `select rewards from public.career_scores where athlete_id = 'zz_week'`)).rewards;
  const logWeek = habitLog(today, -6, 0, { water: 8, steps: 11000 });
  await doorProgress(db, 'zz_week', logWeek, CFG_THREE);
  const rw1 = (await one(db, `select rewards from public.career_scores where athlete_id = 'zz_week'`)).rewards;
  const pw1 = await profile(db, 'zz_week');
  ok(rw1.stamp === rw0.stamp, 'a partial call (the trigger passing only the kinds the save changed) merges into the cache and never moves its stamp, so the next full call looks at everything again', undefined, 'L1');
  ok(((await one(db, `select rewards from public.career_scores where athlete_id = 'zz_week'`)).rewards || {}).stamp !== rw0.stamp, 'and the profile read that follows (a full call) did move it', undefined, 'L1');
  const lad0 = Object.keys(pw0.ladder), lad1 = Object.keys(pw1.ladder);
  const sameHave = lad0.filter(k => k in pw1.ladder && ['full_log', 'pulse_check', 'century', 'long_count', 'bests', 'finisher'].includes(k)).every(k => pw1.ladder[k].have === pw0.ladder[k].have);
  ok(rw1 && rw1.have && Object.keys(rw0.have).every(k => k in rw1.have) && JSON.stringify(lad0) === JSON.stringify(lad1) && sameHave && pw1.ladder.held_weeks.have === pw0.ladder.held_weeks.have && pw1.ladder.century.have === pw0.ladder.century.have,
     `after a habits-only save the cache and get_profile().ladder still have every training entry with the same count (${lad1.length} entries; Hold Serve ${pw1.ladder.held_weeks.have}, Century ${pw1.ladder.century.have})`, JSON.stringify({ rw0: Object.keys(rw0.have).length, rw1: rw1 && Object.keys(rw1.have).length }), 'L1');
  info(`Hold Serve's run so far before the edit: ${pw1.ladder.held_weeks.now}`);
  const awWeek0 = (await awardsOf(db, 'zz_week')).length;
  const nowBefore = pw1.ladder.held_weeks.now != null ? pw1.ladder.held_weeks.now : (pw1.numbers.weeks_held && pw1.numbers.weeks_held.now);
  // a programme edit that breaks a week: a second plan day nobody trained
  await q(db, `update public.programs set data = jsonb_set(data, '{workouts,days}', (data #> '{workouts,days}') || '[{"id": 2, "blocks": []}]'::jsonb) where athlete_id = 'zz_week'`);
  const rw2 = (await one(db, `select rewards from public.career_scores where athlete_id = 'zz_week'`)).rewards;
  const pw2 = await profile(db, 'zz_week');
  const nowAfter = pw2.ladder.held_weeks.now != null ? pw2.ladder.held_weeks.now : (pw2.numbers.weeks_held && pw2.numbers.weeks_held.now);
  ok(Number(nowAfter) < Number(nowBefore) && (rw2.now.held_weeks == null || Number(rw2.now.held_weeks) < Number(nowBefore)),
     `a programme edit that breaks the weeks drops Hold Serve's run so far (${nowBefore} → ${nowAfter}) and nothing already earned goes`, JSON.stringify({ rw2now: rw2.now, held: pw2.ladder.held_weeks }), 'L1');
  ok((await awardsOf(db, 'zz_week')).length === awWeek0, 'the awards stay (a lowered measure takes nothing back, GAME-8)', undefined, 'L1');
  await q(db, `update public.programs set data = jsonb_set(data, '{workouts,days}', '[{"id": 1, "blocks": []}]'::jsonb) where athlete_id = 'zz_week'`);

  // ── 6. the stamp ────────────────────────────────────────────────────────────────────────────────────────────────────────
  section('6. the stamp race (DEVICE (b): PGlite has one connection, so the race is a property test)');
  // A begins; time passes while B commits (here: time passes); A's save then writes a fact. A write stamped with the transaction's start would carry an
  // updated_at OLDER than anything B committed, and (count, max(updated_at)) would not move. stage70 stamps the clock.
  await mkLogin(db, 'zz_race');
  await insProgram(db, 'zz_race', prog({ start: addDays(today, -10), end: addDays(today, 20) }));
  await doorProgress(db, 'zz_race', habitLog(today, -3, -1, { water: 8, steps: 11000 }), CFG_THREE);
  await profile(db, 'zz_race');
  const stampBefore = await val(db, `select public.career_rewards_stamp('zz_race')`);
  await asAthlete(db, SUB.zz_race, 'zz_race');
  await db.exec('begin');
  await q(db, `select pg_sleep(0.15)`);
  await q(db, `select public.save_progress('zz_race', 'Zed', $1::jsonb, null, null)`, [JSON.stringify({ zz_race_hab_log: JSON.stringify(habitLog(today, -4, 0, { water: 8, steps: 11000 })) })]);
  const upd = await one(db, `select (extract(epoch from (max(updated_at) - transaction_timestamp())) * 1000)::int as ahead from public.career_facts where athlete_id = 'zz_race'`);
  await db.exec('commit');
  await asNobody(db);
  ok(upd && upd.ahead >= 100, `a write made late in a long transaction is stamped with the clock, not the transaction's start (${upd && upd.ahead} ms after the start): the stamp can never move backwards`, JSON.stringify(upd), 'L1');
  const stampAfter = await val(db, `select public.career_rewards_stamp('zz_race')`);
  ok(stampAfter !== stampBefore, 'and the rewards stamp moved, so the next full evaluate looks again', undefined, 'L1');
  aw = await awardsOf(db, 'zz_race');
  ok(aw.some(a => a.award_id === 'badge:habit_water:1' && a.day === today), 'the tier that save crossed (Water, 5 days) was minted by the save itself', JSON.stringify(aw.map(a => a.award_id)), 'L1');
  const clockSrc = (await val(db, `select pg_get_functiondef(p.oid) from pg_proc p where p.proname = 'career_sync' and pronargs = 6`)) || '';
  ok(/clock_timestamp\(\)/.test(clockSrc) && !/updated_at = now\(\)/.test(clockSrc), 'career_sync() stamps updated_at with clock_timestamp() in both statements', undefined, 'L1');
  const keepSrc = (await val(db, `select pg_get_functiondef('public.career_keep_levels(date)'::regprocedure)`)) || '';
  ok(/updated_at = clock_timestamp\(\)/.test(keepSrc) && !/updated_at = now\(\)/.test(keepSrc), "career_keep_levels()'s upsert stamps the clock too", undefined, 'L1');

  // ── 7. voids ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  section('7. voids: hide the session that crossed a tier');
  const aw7 = await awardsOf(db, 'zz_week'), rc7 = await recOf(db, 'zz_week');
  await q(db, `update public.session_history set hidden_at = now() where athlete_id = 'zz_week' and completed_on = $1::date`, [today]);
  const aw7b = await awardsOf(db, 'zz_week'), rc7b = await recOf(db, 'zz_week');
  ok(JSON.stringify(aw7b) === JSON.stringify(aw7) && rc7b.length === rc7.length, 'hide the session that crossed Long Count: the award and its recognition row stay', undefined, 'L1');
  const pHid = await profile(db, 'zz_week');
  ok(pHid.owned['badge:long_count:1'] === today, 'and the profile still owns it', undefined, 'L1');
  await q(db, `update public.session_history set hidden_at = null where athlete_id = 'zz_week' and completed_on = $1::date`, [today]);
  const aw7c = await awardsOf(db, 'zz_week'), rc7c = await recOf(db, 'zz_week');
  ok(JSON.stringify(aw7c) === JSON.stringify(aw7) && rc7c.length === rc7.length, 'un-hide it: nothing new is minted, nothing repeated', undefined, 'L1');

  // ── 8. mark_moments_told ────────────────────────────────────────────────────────────────────────────────────────────────
  section('8. mark_moments_told');
  const momentsBefore = (await profile(db, 'zz_pb')).moments;
  const ids8 = momentsBefore.map(m => m.award_id);
  await asCoach(db);
  const nCoach = await val(db, `select public.mark_moments_told('zz_pb', $1::text[], 'proof')`, [ids8]);
  await asAthlete(db, SUB.zz_gain, 'zz_gain');
  const nOther = await val(db, `select public.mark_moments_told('zz_pb', $1::text[], 'proof')`, [ids8]);
  await asAthlete(db, SUB.zz_pb, 'zz_pb');
  let bad = null; try { await q(db, `select public.mark_moments_told('zz_pb', array['x'], 'web')`); } catch (e) { bad = e.message; }
  const nOwn = await val(db, `select public.mark_moments_told('zz_pb', $1::text[], 'training')`, [ids8.slice(0, 1)]);
  const nOwnAgain = await val(db, `select public.mark_moments_told('zz_pb', $1::text[], 'proof')`, [ids8.slice(0, 1)]);
  await asNobody(db);
  ok(nCoach === 0 && nOther === 0, `the coach's preview marks nothing (${nCoach}) and another athlete marks nothing (${nOther})`, undefined, 'L1');
  ok(bad && /proof or training/.test(bad), 'an unknown app is refused', bad, 'L1');
  ok(nOwn === 1 && nOwnAgain === 0, `the athlete marks their own (${nOwn}), and a second time marks nothing (${nOwnAgain}); told_by is kept`, undefined, 'L1');
  const momentsAfter = (await profile(db, 'zz_pb')).moments;
  ok(momentsAfter.length === momentsBefore.length - 1 && !momentsAfter.some(m => m.award_id === ids8[0]), `moments shrinks by the one told (${momentsBefore.length} → ${momentsAfter.length})`, undefined, 'L1');
  ok(momentsBefore.every(m => m.spec && m.spec.date && typeof m.xp === 'number') && momentsBefore[0].size === 'milestone', `the moments carry a spec (name, caption, date) and the current price; the milestone comes first (${momentsBefore.map(m => m.award_id + ':' + m.size).join(', ')})`, undefined, 'L1');
  const fullNow = momentsAfter.filter(m => m.full);
  ok(momentsBefore.find(m => m.award_id === 'achievement:all_court').full === true, 'a milestone waiting today reads full: true', undefined, 'L1');
  const fl8 = (await profile(db, 'zz_flaw')).moments.find(m => m.award_id === 'achievement:flawless');
  ok(fl8 && fl8.full === true, 'a milestone (Flawless) waiting untold reads full: true', undefined, 'L1');
  await q(db, `update public.career_recognition set due_at = now() - interval '15 days' where athlete_id = 'zz_flaw' and award_id = 'achievement:flawless'`);
  const old15 = (await profile(db, 'zz_flaw')).moments.find(m => m.award_id === 'achievement:flawless');
  ok(old15 && old15.full === false, 'the same row due 15 days ago reads full: false (it becomes a wins line, never lost)', JSON.stringify(old15 && old15.full), 'L1');
  if (STOP < 9) return finish();

  // ── 9. timing, the profile's size, a failing evaluate ───────────────────────────────────────────────────────────────────
  section('9. timing on the longest real logs (end to end, against the same saves without stage70), the profile size, a failing evaluate');
  const testProof = await proofSaves('zz_long'), testSess = await sessionSaves('zz_long');
  const dP = median(testProof) - median(ctlProof), dS = median(testSess) - median(ctlSess);
  info(`${big}'s log, with stage70 and the switch on: Proof saves ${testProof.join(' / ')} ms, session saves ${testSess.join(' / ')} ms`);
  ok(dP <= 300, `a Proof save on the longest log costs ${Math.round(dP)} ms more than without stage70 (median ${median(testProof)} against ${median(ctlProof)}; the budget is 300)`, undefined, 'L1');
  ok(dS <= 300, `a session save on the longest log costs ${Math.round(dS)} ms more than without stage70 (median ${median(testSess)} against ${median(ctlSess)}; the budget is 300)`, undefined, 'L1');
  ok(Math.max(...testProof) - Math.max(...ctlProof) <= 400 && Math.max(...testSess) - Math.max(...ctlSess) <= 400, `and the worst single save stays inside the budget with room for noise (+${Math.round(Math.max(...testProof) - Math.max(...ctlProof))} / +${Math.round(Math.max(...testSess) - Math.max(...ctlSess))} ms)`, undefined, 'L1');
  // the first full evaluate with an empty cache, on the three longest logs, and the skip path
  const top3 = facts.slice(0, 3).map(f => f.id);
  for (const id of top3) {
    await q(db, `update public.career_scores set rewards = null where athlete_id = $1`, [id]);
    const [, tFull] = await ms(() => q(db, `select public.career_evaluate($1, null, 'silent')`, [id]));
    const sk = [];
    for (let i = 0; i < 5; i++) sk.push((await ms(() => q(db, `select public.career_evaluate($1)`, [id])))[1]);
    const r = (await one(db, `select public.career_evaluate($1) as r`, [id])).r;
    ok(tFull <= 500, `${id}: the first full evaluate with an empty cache takes ${tFull} ms (budget 500)`, undefined, 'L1');
    ok(r && r.skipped === true && median(sk) <= 10, `${id}: the skip path takes ${median(sk)} ms (median of 5; budget 10)`, JSON.stringify(sk), 'L1');
  }
  // the worst full evaluate over everybody
  let worst = { id: null, t: 0 };
  for (const id of allIds) { await q(db, `update public.career_scores set rewards = null where athlete_id = $1`, [id]); const [, t1] = await ms(() => q(db, `select public.career_evaluate($1, null, 'silent')`, [id])); if (t1 > worst.t) worst = { id, t: t1 }; }
  info(`the slowest first full evaluate over all ${allIds.length} athletes: ${worst.id} ${worst.t} ms`);
  ok(worst.t <= 500, `no athlete's first full evaluate takes more than the 500 ms budget (worst ${worst.t} ms)`, undefined, 'L1');
  // an athlete with no career_scores row, saving repeatedly: a copy of the longest log made after the switch
  await clone(big, 'zz_noscore');
  ok((await q(db, `select 1 from public.career_scores where athlete_id = 'zz_noscore'`)).length === 0 && (await tables()).a > 0, 'zz_noscore (the longest log, copied after the switch) has no career_scores row', undefined, 'L1');
  const nsTimes = [], nsAw = [];
  const nsBase = JSON.parse((await one(db, `select data ->> 'zz_noscore_hab_log' as l from public.athlete_progress where athlete_id = 'zz_noscore'`)).l || '{}');
  for (let k = 0; k < 6; k++) { nsBase[today] = { water: 8, ...(k > 0 ? { steps: 5000 + k * 1000 } : {}) }; nsTimes.push((await doorProgress(db, 'zz_noscore', nsBase))[1]); nsAw.push((await awardsOf(db, 'zz_noscore')).length); }
  const nsRow = (await q(db, `select 1 from public.career_scores where athlete_id = 'zz_noscore'`)).length;
  info(`zz_noscore's saves: ${nsTimes.join(' / ')} ms; awards after each: ${nsAw.join(' / ')}`);
  ok(nsRow === 0 && nsAw.every(x => x === nsAw[0]), 'six saves, no career_scores row stored by them, and the same awards each time (a repeat mints nothing)', undefined, 'L1');
  ok(Math.max(...nsTimes) - Math.max(...ctlProof) <= 500 && nsTimes[5] <= nsTimes[0] * 1.6 + 60, `every save of the athlete with no score row stays inside budget (each is a full evaluate: worst ${Math.max(...nsTimes)} ms, the first ${nsTimes[0]}, the sixth ${nsTimes[5]}): the cost does not grow`, undefined, 'L1');
  // the profile's size on the largest careers
  const owners = await q(db, `select athlete_id, count(*)::int as n from public.career_awards where athlete_id not like 'zz\_%' group by 1 order by 2 desc limit 3`);
  const sizes = [];
  for (const o of owners.concat([{ athlete_id: 'zz_ev', n: 0 }, { athlete_id: 'zz_week', n: 0 }])) {
    const p = await profile(db, o.athlete_id);
    sizes.push({ id: o.athlete_id, awards: await val(db, `select count(*)::int from public.career_awards where athlete_id = $1`, [o.athlete_id]), compact: sizeOf(p), wire: await val(db, `select octet_length(public.get_profile($1)::text)`, [o.athlete_id]),
                 parts: Object.entries(p).map(([k, v]) => [k, JSON.stringify(v).length]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} ${n}`).join(', ') });
  }
  for (const z of sizes) info(`get_profile of ${z.id}: ${z.awards} awards, ${z.compact} bytes compact (${z.wire} as Postgres prints it); largest parts: ${z.parts}`);
  const bigCareer = sizes[0];
  ok(bigCareer.compact <= 14 * 1024, `the profile of the largest real career (${bigCareer.id}, ${bigCareer.awards} awards) is ${bigCareer.compact} bytes against the 14 KB budget (${14 * 1024})`, `${bigCareer.wire} bytes as Postgres prints it; its largest parts: ${bigCareer.parts}`, 'L1');
  const prof9 = await profile(db, big), [, tProf] = await ms(() => profile(db, big));
  ok(tProf <= 100, `get_profile() of the longest log answers from the cache in ${tProf} ms (budget: +100 ms on the skip path)`, undefined, 'L1');
  // a failing evaluate keeps the ladder and marks the profile stale
  const staleId = 'zz_week';
  const ladBefore = (await profile(db, staleId)).ladder;
  await q(db, `update public.career_catalogue set body = body || '{"tiers": "broken"}'::jsonb where kind = 'badge' and id = 'long_count'`);
  await q(db, `update public.career_scores set rewards = rewards - 'stamp' where athlete_id = $1`, [staleId]);
  let pS = await profile(db, staleId);
  let forced = 'a broken catalogue row';
  if (!pS.rewards_stale) {
    forced = 'career_measures() made to raise';
    await q(db, `create or replace function public.career_measures(p_athlete text, p_ctx jsonb, p_keys text[]) returns jsonb language plpgsql as $$ begin raise exception 'boom'; end $$`);
    await q(db, `update public.career_scores set rewards = rewards - 'stamp' where athlete_id = $1`, [staleId]);
    pS = await profile(db, staleId);
  }
  ok(pS.rewards_stale === true && pS.ladder && Object.keys(pS.ladder).length === Object.keys(ladBefore).length && pS.ladder.held_weeks && pS.career && pS.career.xp > 0,
     `a forced evaluate error (${forced}) keeps the ladder (${Object.keys(pS.ladder || {}).length} entries), serves the score and sets rewards_stale`, JSON.stringify({ stale: pS.rewards_stale, ladder: pS.ladder && Object.keys(pS.ladder).length }), 'L1');
  const okSave = await doorProgress(db, staleId, habitLog(today, -6, 0, { water: 8, steps: 11000, sleep: 8 }), CFG_THREE).then(() => true, () => false);
  ok(okSave, 'and a save still goes through while evaluate fails (the trigger only warns)', undefined, 'L1');
  await runSql(db, s70, 'stage70 (restore the functions)');
  await q(db, `update public.career_catalogue c set body = x.body from jsonb_to_recordset($1::jsonb) as x(kind text, id text, body jsonb) where c.kind = x.kind and c.id = x.id`, [JSON.stringify(cat3)]);
  pS = await profile(db, staleId);
  ok(!pS.rewards_stale, 'the failure heals when the catalogue and the functions are back: no more rewards_stale', undefined, 'L1');

  // ── 10. a re-seed ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  section('10. a re-seed: an xp changed, a tier appended, a title added to a tier already owned');
  await mkLogin(db, 'zz_top');
  await insProgram(db, 'zz_top', prog({ start: addDays(today, -10), end: addDays(today, 20) }));
  await doorProgress(db, 'zz_top', habitLog(today, -94, 0, { water: 8 }), CFG_THREE);
  const xpOf = async id => (await scoreOf(db, id)).career.xp;
  const x0 = await xpOf('zz_top'), xWeek0 = await xpOf('zz_week'), xBig0 = await xpOf(big);
  ok((await awardsOf(db, 'zz_top')).filter(a => a.item === 'habit_water').length === 5, 'zz_top (95 days of water) owns all five Water tiers', JSON.stringify((await awardsOf(db, 'zz_top')).map(a => a.award_id)), 'L1');
  const rs1 = JSON.parse(JSON.stringify(cat3));
  const hw = rs1.find(c => c.kind === 'badge' && c.id === 'habit_water').body;
  hw.tiers[0].xp = 25;                                                                     // Water tier 1: 20 → 25
  const [r1] = await ms(async () => (await seedJson(rulesNow, rs1)).r);
  ok(r1 && /rewards_batch/.test(r1.next || ''), 'a re-seed of the catalogue with the switch on says to run the batches again', JSON.stringify(r1 && r1.next), 'L1');
  const x1 = await xpOf('zz_top');
  ok(x1 === x0 + 5, `a re-seed changing an xp re-prices an award already earned: zz_top's Water tier 1 pays 25 now, not 20 (${x0} → ${x1}); the row keeps the price at mint for display`, undefined, 'L1');
  ok((await val(db, `select xp from public.career_awards where athlete_id = 'zz_top' and award_id = 'badge:habit_water:1'`)) === 20, 'and the award row itself still says 20 (D12: the mint price is display and fallback only)', undefined, 'L1');
  const rs2 = JSON.parse(JSON.stringify(rs1));
  const hw2 = rs2.find(c => c.kind === 'badge' && c.id === 'habit_water').body;
  hw2.tiers.push({ at: 90, xp: 300, size: 'highlight', metal: 'prismatic' });
  rs2.find(c => c.kind === 'badge' && c.id === 'held_weeks').body.tiers[0].title = 'climber';   // a title added to a tier zz_week owns
  const hwBefore = (await awardsOf(db, 'zz_top')).length;
  await seedJson(rulesNow, rs2);
  const b10 = [];
  for (let o = 0; o < 400; o += 5) { const r = (await one(db, `select public.career_rewards_batch($1, 5, 'silent') as r`, [o])).r; if (!r.n) break; b10.push(...r.lines); }
  const t6 = (await awardsOf(db, 'zz_top')).find(a => a.award_id === 'badge:habit_water:6');
  ok(t6 && t6.how === 'silent' && t6.day === addDays(today, -94 + 89) && t6.xp === 300 && b10.every(l => l.ok) && !(await recOf(db, 'zz_top')).some(r => r.award_id === 'badge:habit_water:6'),
     `a tier appended by a re-seed is minted by career_rewards_batch(…, 'silent') for the athlete who already crossed it (${t6 && t6.day}), at its current price, with no moment`, JSON.stringify(t6), 'L1');
  const x2 = await xpOf('zz_top');
  ok(x2 === x1 + 300, `and it is paid (${x1} → ${x2})`, undefined, 'L1');
  const pTitle = await profile(db, 'zz_week');
  ok((await awardsOf(db, 'zz_week')).some(a => a.award_id === 'title:climber') && pTitle.titles.some(t => t.id === 'climber'), 'a title added by a re-seed to a tier already owned is minted on the next full evaluate (zz_week: CLIMBER from Hold Serve)', JSON.stringify(pTitle.titles.map(t => t.id)), 'L1');
  ok((await xpOf(big)) === xBig0, 'and the re-seed moved nobody else (the longest real log is unchanged)', undefined, 'L1');
  await seedJson(rulesNow, cat3);       // back to the catalogue the file has
  for (let o = 0; o < 400; o += 5) { const r = (await one(db, `select public.career_rewards_batch($1, 5, 'silent') as r`, [o])).r; if (!r.n) break; }
  ok((await awardsOf(db, 'zz_top')).some(a => a.award_id === 'badge:habit_water:6'), 'taking the appended tier out of the catalogue takes no award back (GAME-1)', undefined, 'L1');

  // ── 13a. reward_cases.json ──────────────────────────────────────────────────────────────────────────────────────────────
  section('12. reward_cases.json: what the two phones copy, answered by the server');
  const cases = await buildCases(db, { today, SL, rulesNow, hr: (await one(db, `select public.career_habit_rules() as h`)).h, bf, cat3 });
  if (args.includes('--write-cases')) {
    fs.writeFileSync(CASES_FILE, JSON.stringify(cases, null, 1) + '\n');
    ok(true, `wrote ${path.relative(ROOT, CASES_FILE)}: ${cases.athletes.length} athletes, ${Object.keys(cases.catalogue).length} entries, ${cases.moves.length} session vectors, ${cases.ids.length} ids`);
  } else {
    const onDisk = fs.existsSync(CASES_FILE) ? JSON.parse(fs.readFileSync(CASES_FILE, 'utf8')) : null;
    const strip = c => c && JSON.stringify({ rules: c.rules, catalogue: c.catalogue, athletes: c.athletes, moves: c.moves, ids: c.ids });
    const moved = onDisk && onDisk.today ? daysBetween(onDisk.today, today) : 0;
    ok(onDisk && strip(shiftDates(onDisk, moved)) === strip(shiftDates(cases, 0)), `scripts/career/reward_cases.json is the server's answer today (its dates moved ${moved} days; rewrite it with --write-cases after a deliberate change)`,
       onDisk ? 'they differ' : 'the file is missing', 'L1');
  }
  // the phone's twins against the same file, as check_twins.js §10 will run them
  await checkTwinsAgainst(cases);
  if (STOP < 11) return finish();

  // ── 11. erasure ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  section('11. erasure');
  // zz_hist has a score kept before the switch, awards, hab_titles; give it a live moment too
  await doorProgress(db, 'zz_hist', { ...habitLog(today, -30, 0, { water: 8, steps: 11000 }), ...habitLog(today, -9, 0, { water: 8, steps: 11000, sleep: 8 }) }, CFG_THREE);
  // zz_pend: a crossing pending in its facts (four held weeks written, no evaluate yet), erased before anything is minted
  await mkLogin(db, 'zz_pend');
  await insProgram(db, 'zz_pend', prog({ start: addDays(today, -40), end: addDays(today, 20) }));
  await q(db, `insert into public.career_facts (athlete_id, kind, ref, day, value, source) select 'zz_pend', 'week_held', 'c1|w' || g, current_date - 30 + g, '{}'::jsonb, 'server' from generate_series(1, 4) g`);
  const pre = async id => (await one(db, `select (select count(*) from public.career_awards where athlete_id = $1)::int as a, (select count(*) from public.career_recognition where athlete_id = $1)::int as r,
       (select count(*) from public.hab_titles where athlete_id = $1)::int as t, (select count(*) from backup.career_catalogue_before where athlete_id = $1)::int as b,
       (select count(*) from public.career_facts where athlete_id = $1)::int as f, (select count(*) from public.career_scores where athlete_id = $1)::int as s`, [id]));
  const hBefore = await pre('zz_hist'), pBefore = await pre('zz_pend');
  ok(hBefore.a > 0 && hBefore.r > 0 && hBefore.b === 1 && hBefore.f > 0, `zz_hist has awards (${hBefore.a}), a recognition row (${hBefore.r}), titles (${hBefore.t}), a score kept before the switch (${hBefore.b}), facts (${hBefore.f})`, undefined, 'L3');
  await asCoach(db);
  const dry = (await one(db, `select public.coach_erase_person('athlete', 'zz_hist', null, '{}'::uuid[], true) as r`)).r;
  ok(dry.ok && (dry.counts.career_awards || 0) === hBefore.a && (dry.counts.career_recognition || 0) === hBefore.r, `the dry run lists both tables (career_awards ${dry.counts && dry.counts.career_awards}, career_recognition ${dry.counts && dry.counts.career_recognition})`, JSON.stringify(dry.counts), 'L1');
  const hAfterDry = await pre('zz_hist');
  ok(JSON.stringify(hAfterDry) === JSON.stringify(hBefore), 'and a dry run changes nothing', undefined, 'L1');
  const gone = (await one(db, `select public.coach_erase_person('athlete', 'zz_hist', 'zz_hist', '{}'::uuid[], false) as r`)).r;
  const gone2 = (await one(db, `select public.coach_erase_person('athlete', 'zz_pend', 'zz_pend', '{}'::uuid[], false) as r`)).r;
  await asNobody(db);
  const hA = await pre('zz_hist'), pA = await pre('zz_pend');
  ok(gone.ok && Object.values(hA).every(x => x === 0), 'zz_hist erased: no award, recognition row, hab_titles row, score kept before the switch, fact or score', JSON.stringify(hA), 'L1');
  ok(gone2.ok && Object.values(pA).every(x => x === 0), 'zz_pend (a crossing pending in its facts) erased to zero rows: nothing was minted on the way out', JSON.stringify(pA), 'L1');
  const leftover = await q(db, `select c.table_schema || '.' || c.table_name as t from information_schema.columns c where c.table_schema in ('public', 'backup') and c.column_name = 'athlete_id' order by 1`);
  let stray = [];
  for (const { t } of leftover) { const k = await val(db, `select count(*)::int from ${t} where athlete_id in ('zz_hist', 'zz_pend')`); if (k) stray.push(`${t} ${k}`); }
  ok(stray.length === 0, `and no table in public or backup with an athlete_id column holds either person (${leftover.length} tables checked)`, stray.join(', '), 'L1');

  // ── 13. the way back ────────────────────────────────────────────────────────────────────────────────────────────────────
  section('13. the way back: rollback_stage70.sql, dry, then real, then again');
  await q(db, `update public.career_rules set rules = jsonb_set(rules, '{switch,catalogue}', to_jsonb($1::text)), loaded_at = clock_timestamp() where version = 3`, [S]);
  const idsRb = (await q(db, `select * from public.career_rewards_athletes(0, 1000)`)).map(r => r.career_rewards_athletes);
  const xpRb = {}; for (const id of idsRb) xpRb[id] = (await one(db, `select public.career_compute($1) as s`, [id])).s.career;
  const awCount = (await tables()).a;
  const rb = read(path.join(ROOT, 'scripts', 'career', 'rollback_stage70.sql'));
  let dryErr = null; try { await runSql(db, rb, 'rollback dry'); } catch (e) { dryErr = e.message; }
  try { await db.exec('rollback'); } catch (e) { /* no transaction left */ }
  ok(dryErr && /DRY RUN/.test(dryErr), 'the dry run stops with its report', dryErr && dryErr.slice(0, 400), 'L1');
  ok((await tables()).a === awCount && await val(db, `select public.career_catalogue_on()`) === true && to_regclass_ok(await val(db, `select to_regclass('public.career_awards')::text`)),
     'and nothing changed (the awards are there, the switch is on)', undefined, 'L1');
  const real = rb.replace(`'career.rollback70', 'dry'`, `'career.rollback70', 'real'`);
  ok(real !== rb, 'the file names its mode in the one place the rehearsal switches', undefined, 'L1');
  let realErr = null; try { await runSql(db, real, 'rollback real'); } catch (e) { realErr = e.message; }
  ok(!realErr, 'the real run goes through', realErr, 'L1');
  const gone3 = await one(db, `select to_regclass('public.career_awards')::text as a, to_regclass('public.career_recognition')::text as r, to_regclass('backup.career_catalogue_before')::text as b,
      (select count(*) from information_schema.columns where table_name = 'career_scores' and column_name = 'rewards')::int as col,
      (select count(*) from pg_indexes where indexname = 'career_facts_kind_idx')::int as idx`);
  ok(!gone3.a && !gone3.r && !gone3.b && gone3.col === 0 && gone3.idx === 0, 'the two tables, backup.career_catalogue_before, career_scores.rewards and career_facts_kind_idx are gone', JSON.stringify(gone3), 'L1');
  const fnNow = new Set((await q(db, `select p.proname as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public'`)).map(r => r.n));
  const leftFns = [...new Set(newFns)].filter(x => fnNow.has(x));
  ok(leftFns.length === 0, `every function stage70 added is dropped (${new Set(newFns).size})`, leftFns.join(', '), 'L1');
  const defs1 = await defsOf(REPLACED);
  const differ = REPLACED.filter(k => defs0[k] !== defs1[k]);
  ok(differ.length === 0, `every function stage70 replaced is back exactly as it was (${REPLACED.length} compared, as the database prints them)`, differ.map(k => k + '\n' + firstDiff(defs0[k], defs1[k])).join('\n'), 'L1');
  const erase2 = (await one(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).d;
  ok(erase2 === erase0, 'coach_erase_person() is byte-identical to the one before stage70', undefined, 'L1');
  const trig1 = (await q(db, `select tgrelid::regclass::text || '.' || tgname as t from pg_trigger where not tgisinternal order by 1`)).map(r => r.t);
  ok(JSON.stringify(trig0) === JSON.stringify(trig1), 'the triggers are the same set as before', JSON.stringify({ gone: trig0.filter(x => !trig1.includes(x)), extra: trig1.filter(x => !trig0.includes(x)) }), 'L1');
  ok((await val(db, `select count(*)::int from public.career_scores`)) <= idsRb.length && (await val(db, `select rules #>> '{switch,catalogue}' from public.career_rules where version = 3`)) === 'off',
     'career_scores was emptied and is recomputing; the newest rulebook says catalogue off', undefined, 'L1');
  const kept = await q(db, `select athlete_id, value from public.career_facts where kind = 'level_kept' and ref = 'catalogue-rollback' and void_at is null`);
  const dnBad = [];
  for (const id of idsRb) { const s = (await one(db, `select public.career_score($1, null, null, current_date) as s`, [id])).s; if (s.xp < xpRb[id].xp) dnBad.push(`${id}: ${xpRb[id].xp} → ${s.xp}`); }
  ok(dnBad.length === 0, `NOBODY'S XP GOES DOWN across the way back: every athlete's career XP after >= before (${idsRb.length}; ${kept.length} needed a catalogue-rollback level_kept fact worth ${kept.reduce((a, r) => a + Number(r.value.xp || 0), 0)} XP)`, dnBad.slice(0, 8).join('\n'), 'L1');
  const lvDown = [];
  for (const id of idsRb) { const a = await scoreOf(db, id); if (a.career.level < xpRb[id].level) lvDown.push(`${id}: level ${xpRb[id].level} → ${a.career.level}`); }
  ok(lvDown.length === 0, 'and nobody’s level goes down either (through career_scored)', lvDown.join('\n'), 'L1');
  cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.ok, `career_compare() is ok after the rollback (${cmp.matched} of ${cmp.athletes})`, cmp.rows.filter(r => !r.ok).map(r => JSON.stringify(r)).slice(0, 5).join('\n'), 'L1');
  const profBad = [];
  for (const id of allIds0) {
    const p = await profile(db, id), a = prof0[id];
    for (const k of Object.keys(a)) if (!(k in p)) profBad.push(`${id}: key ${k} is gone`);
    if (p.switch.catalogue !== null || p.badges.length || 'owned' in p || 'ladder' in p) profBad.push(`${id}: a phase 3 answer is left`);
  }
  ok(profBad.length === 0, `every phase 2 profile key is back, switch.catalogue is null, badges are [] (${allIds0.length} athletes)`, profBad.slice(0, 8).join('\n'), 'L1');
  await asCoach(db);
  const board3 = await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`);
  await asNobody(db);
  ok(board3.length > 0, 'the board still answers', undefined, 'L1');
  let realErr2 = null; try { await runSql(db, real, 'rollback real again'); } catch (e) { realErr2 = e.message; }
  ok(!realErr2, 'the rollback runs a second time and finds nothing of stage70', realErr2, 'L1');
  const defs2 = await defsOf(REPLACED);
  ok(REPLACED.every(k => defs2[k] === defs0[k]) && (await val(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)`)) === erase0, 'and after the second run everything is still as it was', undefined, 'L1');
  const s70again = await runSql(db, s70, 'stage70 after the rollback').then(() => true, e => e.message);
  ok(s70again === true, 'stage70 can be applied again after a rollback', s70again === true ? undefined : s70again, 'L1');

  finish();
}

const to_regclass_ok = x => !!x;
function firstDiff(a, b) {
  const x = (a || '').split('\n'), y = (b || '').split('\n');
  for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return `line ${i + 1}:\n  before: ${(x[i] || '').slice(0, 200)}\n  after:  ${(y[i] || '').slice(0, 200)}`;
  return '';
}

// ── reward_cases.json (§12.2) ───────────────────────────────────────────────────────────────────────────────────────────────
const PHONE_BADGES = ['habit_water', 'habit_steps', 'habit_sleep', 'habit_fuel', 'habit_mobility', 'habit_breathe', 'habit_supps', 'habit_custom', 'day_streak', 'dawn_patrol', 'proof_clean_sweep', 'back_in_the_fight'];
const PHONE_ACH = ['first_blood', 'the_centurion', 'full_stack', 'bedrock', 'the_foundry', 'cold_blood', 'still_standing', 'backbone'];

async function buildCases(db, c) {
  const { today, SL, hr, bf, cat3 } = c;
  const body = Object.fromEntries(cat3.filter(r => (r.kind === 'badge' && PHONE_BADGES.includes(r.id)) || (r.kind === 'achievement' && PHONE_ACH.includes(r.id))).map(r => [r.id, r.body]));
  const rules = { targets: hr.targets, weights: hr.weights, completionBonus: hr.completionBonus, customXp: hr.customXp, backfill_days: bf };
  // three athletes with logs that cross different things: a long one, one with a custom habit and a comeback, a short one
  const specs = [
    { id: 'zz_twin_1', log: () => habitLog(today, -34, 0, o => ({ water: 8, steps: o % 9 === 0 ? 4000 : 11000, sleep: o < -10 ? 8 : 6, strength: o % 2 ? 1 : 0, fuel: 3, mobility: o % 3 ? 1 : 0 })), cfg: CFG_ALL },
    { id: 'zz_twin_2', log: () => { const l = habitLog(today, -40, 0, o => ({ water: 8, steps: 11000, c_read: o % 4 ? 1 : 0 }), o => o >= -22 && o <= -17); return l; },
      cfg: { on: { fuel: false, mobility: false, breathe: false, supps: false, sleep: false }, custom: [{ id: 'c_read', name: 'Read', type: 'check' }] } },
    { id: 'zz_twin_3', log: () => habitLog(today, -6, 0, { water: 8, steps: 12000, sleep: 8, fuel: 3 }), cfg: CFG_ALL, S: () => addDays(today, -6) },
    { id: 'zz_twin_4', log: () => habitLog(today, -6, 0, { water: 8, steps: 12000, sleep: 8, fuel: 3 }), cfg: CFG_ALL, S: () => addDays(today, -2) }];   // a crossing ON S is history
  const athletes = [];
  for (const sp of specs) {
    await mkLogin(db, sp.id);
    await insProgram(db, sp.id, prog({ start: addDays(today, -20), end: addDays(today, 20) }));
    // one session so FIRST BLOOD's measure has something to read (the WORKOUT tick comes with the log)
    await doorProgress(db, sp.id, sp.log(), sp.cfg);
    await profile(db, sp.id);
    const log = Object.fromEntries((await q(db, `select day::text as d, jsonb_object_agg(substr(ref, 12), value -> 'v') as vals from public.career_facts where athlete_id = $1 and kind = 'habit_done' and void_at is null group by day order by day`, [sp.id])).map(r => [r.d, Object.fromEntries(Object.entries(r.vals).filter(([, v]) => typeof v === 'number'))]));
    const custom = (await one(db, `select coalesce(jsonb_agg(c ->> 'id'), '[]'::jsonb) as c from jsonb_array_elements(public.career_cfg($1) -> 'custom') c`, [sp.id])).c;
    const days = k => q(db, `select day::text as d from public.career_facts where athlete_id = $1 and kind = $2 and void_at is null order by day`, [sp.id, k]).then(r => r.map(x => x.d));
    const onTarget = await days('day_on_target'), perfect = await days('perfect_day'), stuck = await days('comeback_stuck');
    const with3 = (await q(db, `select d::text as d from public.career_habit_days($1) where ndone >= 3 order by d`, [sp.id])).map(r => r.d);
    const set = new Set(onTarget);
    const comebacks = (await days('comeback')).map(d => { let run = 0; while (set.has(addDays(d, run))) run++; return { day: d, run }; });
    const awards = await awardsOf(db, sp.id);
    const rw = (await one(db, `select rewards from public.career_scores where athlete_id = $1`, [sp.id])).rewards || { have: {} };
    const expect = {};
    for (const id of PHONE_BADGES) {
      const rows = awards.filter(a => a.kind === 'badge' && a.item === id);
      expect[id] = { have: Number(rw.have[id] || 0), crossed: Object.fromEntries(rows.map(a => [String(a.tier), a.day])) };
    }
    for (const id of PHONE_ACH) { const a = awards.find(x => x.award_id === 'achievement:' + id); expect[id] = a ? a.day : null; }
    // the server keeps retired entries out of the phone's list; a retired entry has nothing here (all 20 above are live)
    // the switch day of the case: a crossing ON S is history, not pending
    const crossDays = [...new Set(Object.values(expect).flatMap(v => (typeof v === 'string' ? [v] : v && v.crossed ? Object.values(v.crossed) : [])))].sort();
    const mid = sp.S ? sp.S() : (crossDays[Math.floor(crossDays.length / 2)] || addDays(today, -10));
    const floor = addDays(today, -(bf + 1));
    const priced = async a => Number(await val(db, `select coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, $2::jsonb), a.xp) from public.career_awards a join public.career_catalogue c on c.kind = a.kind and c.id = a.item where a.athlete_id = $1 and a.award_id = $3`, [sp.id, JSON.stringify(hr), a.award_id]));
    const phoneRows = awards.filter(a => (a.kind === 'badge' && PHONE_BADGES.includes(a.item) && !a.subject) || (a.kind === 'achievement' && PHONE_ACH.includes(a.item)));
    const inWindow = phoneRows.filter(a => a.day > mid && a.day >= floor && a.day <= today);
    const ownedIds = new Set(inWindow.filter((a, i) => i % 3 === 1).map(a => a.award_id));      // the server already told the phone about some of them
    const owned = Object.fromEntries(awards.filter(a => a.day <= mid || ownedIds.has(a.award_id)).map(a => [a.award_id, a.day]));
    const phone_awards = [];
    for (const a of inWindow.filter(a => !ownedIds.has(a.award_id))) phone_awards.push({ award_id: a.award_id, xp: await priced(a), size: a.size, day: a.day });
    phone_awards.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.award_id < b.award_id ? -1 : 1));
    athletes.push({ id: sp.id, S: mid, today, input: { log, custom, onTarget, perfect, with3, comebacks, stuck }, expect, owned, phone_awards });
  }
  // the training app's finish-card lines: real ladders from the server, session vectors
  const ladders = [(await profile(db, 'zz_week')).ladder];
  const nearing = JSON.parse(JSON.stringify(ladders[0]));       // a ladder one step short, to make crossings
  for (const k of Object.keys(nearing)) if (nearing[k].next > 0) { nearing[k].have = nearing[k].next - 1; if (typeof nearing[k].now === 'number') nearing[k].now = nearing[k].next - 1; }
  ladders.push(nearing);
  const E = [{ early: false, fullLog: true, checkin: true, weekCloses: false, cycleCloses: false }, { early: false, fullLog: false, checkin: true, weekCloses: false, cycleCloses: false },
             { early: true, fullLog: false, checkin: false, weekCloses: false, cycleCloses: false }, { early: false, fullLog: true, checkin: true, weekCloses: true, cycleCloses: false },
             { early: false, fullLog: true, checkin: true, weekCloses: true, cycleCloses: true }, { early: false, fullLog: false, checkin: false, weekCloses: true, cycleCloses: false, byBook: true }];
  const moves = [];
  for (const ladder of ladders) for (const e of E) moves.push({ ladder, e, expect: movesRef(e, ladder) });
  const ids = [['badge', 'held_weeks', 3], ['badge', 'habit_tiers', 2, 'water'], ['badge', 'habit_water', 1], ['achievement', 'first_best'], ['title', 'grand_slam'], ['badge', 'day_streak', 12], ['title', 'bedrock', null, '']];
  const idRows = [];
  for (const a of ids) idRows.push({ args: a, id: await val(db, `select public.career_award_id($1, $2, $3, $4)`, [a[0], a[1], a[2] == null ? null : a[2], a[3] || '']) });
  return {
    about: 'What the two phones copy from the server in Career Mode phase 3, and the server\'s own answers on made-up athletes. Written by node scripts/career/rehearse_catalogue.mjs '
      + '--write-cases (the rehearsal checks it every run, after moving the dates by the days since `today`); held by scripts/check_twins.js §10 against habits.html (awardMeasures(), '
      + 'phoneAwardsFrom(), awardId()) and program.html (careerMoves(), awardId()). athletes[].input is what the phone has (its log, the days on target, perfect, with three habits '
      + 'done, comebacks and comebacks stuck); expect is what the server\'s career_evaluate() minted for the phone-decidable entries (have and the day each tier crossed; the day of '
      + 'an achievement or null); owned and S are what the phone is told; phone_awards is what the phone must show as pending: crossings after S, inside the open window, not owned, '
      + 'priced by the server (career_award_xp). moves: the finish card\'s lines for a ladder the server answered and what the session earned. ids: the award id of career_award_id(). '
      + 'Change a rule on both sides, then here.',
    today, rules, catalogue: body, athletes, moves, ids: idRows };
}

// The finish card's rule (D16, program.html careerMoves(): the comment above it) written once more from the spec, so a drift in the phone shows.
function movesRef(e, ladder) {
  const lines = [];
  const has = (en, k) => (Array.isArray(en.counts) ? en.counts.includes(k) : en.counts === k);
  Object.keys(ladder).forEach((id, ord) => {
    const en = ladder[id];
    if (!en || !(Number(en.next) > 0)) return;
    let inc = 0, pending = false;
    if (en.phone === 'session') {
      if (has(en, 'session_finished') && !e.early) inc++;
      if (has(en, 'session_finished_early') && e.early) inc++;
      if (has(en, 'full_log') && e.fullLog) inc++;
      if (has(en, 'checkin_done') && e.checkin) inc++;
    } else if (en.phone === 'week') {
      pending = true;
      if (e.weekCloses && has(en, 'week_held')) inc++;
      if (e.weekCloses && has(en, 'week_by_the_book') && (e.byBook == null ? !!(e.fullLog && e.checkin) : !!e.byBook)) inc++;
      if (e.cycleCloses && has(en, 'cycle_finished')) inc++;
    }
    if (!inc) return;
    const base = typeof en.now === 'number' ? en.now : Number(en.have) || 0, have = base + inc;
    lines.push({ ord, id, name: String(en.name || id), have, next: Number(en.next), crossed: have >= Number(en.next), pending });
  });
  lines.sort((a, b) => (b.crossed - a.crossed) || ((a.next - a.have) - (b.next - b.have)) || (a.pending - b.pending) || (a.ord - b.ord));
  return { lines: lines.slice(0, 3).map(l => ({ id: l.id, name: l.name, have: l.have, next: l.next, crossed: l.crossed, pending: l.pending })), more: Math.max(0, lines.length - 3) };
}

// Run the phones' pure functions (cut out of habits.html and program.html by name, as check_twins.js §10 does) on the cases.
async function checkTwinsAgainst(cases) {
  const cut = (src, name) => {
    const i = src.indexOf('function ' + name + '(');
    if (i < 0) return null;
    let j = src.indexOf('{', i), d = 0;
    for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } }
    return null;
  };
  const hSrc = fs.readFileSync(path.join(ROOT, 'habits.html'), 'utf8'), pSrc = fs.readFileSync(path.join(ROOT, 'program.html'), 'utf8');
  const hNames = ['awardId', 'awardParts', 'awardCat', 'awardMeasures', 'phoneAwardsFrom'], pNames = ['awardId', 'careerMoves'];
  const hCode = hNames.map(n => cut(hSrc, n)), pCode = pNames.map(n => cut(pSrc, n));
  if (hCode.includes(null) || pCode.includes(null)) { ok(false, 'the phones\' twin functions are in habits.html and program.html', `missing: ${[...hNames.filter((n, i) => !hCode[i]), ...pNames.filter((n, i) => !pCode[i])].join(', ')}`, 'L4'); return; }
  const H = {}, P = {};
  vm.runInContext(hCode.join('\n') + '\nthis.F = { awardId, awardMeasures, phoneAwardsFrom };', vm.createContext(H));
  vm.runInContext(pCode.join('\n') + '\nthis.F = { awardId, careerMoves };', vm.createContext(P));
  const bad = [];
  for (const a of cases.athletes) {
    const inp = { ...a.input, targets: cases.rules.targets };
    const m = JSON.parse(JSON.stringify(H.F.awardMeasures(inp, cases.catalogue)));
    for (const id of Object.keys(a.expect)) {
      const want = a.expect[id], got = m[id];
      if (typeof want === 'object' && want) {
        if (!got || got.have !== want.have || JSON.stringify(got.crossed) !== JSON.stringify(want.crossed)) bad.push(`${a.id} ${id}: phone ${JSON.stringify(got)}, server ${JSON.stringify(want)}`);
      } else if ((got || null) !== (want || null)) bad.push(`${a.id} ${id}: phone ${JSON.stringify(got)}, server ${JSON.stringify(want)}`);
    }
    const pa = JSON.parse(JSON.stringify(H.F.phoneAwardsFrom(m, cases.catalogue, { S: a.S, today: a.today, backfill_days: cases.rules.backfill_days, owned: a.owned, withdrawn: [] })));
    if (JSON.stringify(pa) !== JSON.stringify(a.phone_awards)) bad.push(`${a.id} phone_awards: phone ${JSON.stringify(pa)}, server ${JSON.stringify(a.phone_awards)}`);
  }
  ok(bad.length === 0, `habits.html's awardMeasures() and phoneAwardsFrom() agree with the server on ${cases.athletes.length} athletes (every phone-decidable entry's count and crossing days, and the pending awards)`, bad.slice(0, 6).join('\n'), 'L4');
  const mbad = [];
  for (const m of cases.moves) { const got = JSON.parse(JSON.stringify(P.F.careerMoves(m.e, m.ladder))); if (JSON.stringify(got) !== JSON.stringify(m.expect)) mbad.push(`e=${JSON.stringify(m.e)} phone ${JSON.stringify(got)}, rule ${JSON.stringify(m.expect)}`); }
  ok(mbad.length === 0, `program.html's careerMoves() gives the finish card's lines the rule gives (${cases.moves.length} vectors on real ladders)`, mbad.slice(0, 4).join('\n'), 'L5');
  const ibad = [];
  for (const i of cases.ids) { const a = H.F.awardId(...i.args), b = P.F.awardId(...i.args); if (a !== i.id || b !== i.id) ibad.push(`${JSON.stringify(i.args)}: server ${i.id}, Proof ${a}, training ${b}`); }
  ok(ibad.length === 0, `awardId() in both apps equals career_award_id() (${cases.ids.length} cases)`, ibad.join('\n'), 'L4');
}

main().catch(e => { console.error(e); process.exitCode = 1; });
