// Career Mode, phase 3 (rewards with meanings, and the catalogue switch), rehearsed away from the live project
// (supabase/stage70_career_rewards.sql, scripts/career/rollback_stage70.sql; career/PROCEDURES.md → P5, P12, P15, P16 and "Phase 3, as built").
//
//     PGLITE=<scratch>/node_modules/@electric-sql/pglite node scripts/career/rehearse_catalogue.mjs --backup <aa-backup-YYYY-MM-DD.json>
//         [--report <file outside the repo>] [--write-cases [--cases-file <path>]] [--stop-after N] [--phase1 <rev>] [--head <rev>]
//         [--no-stage73] [--dump-awards <file>] [--vs-awards <file>] [--snapshot-rev <rev>]
//
// THE STACK, in the order the live project has it (section 2): stage70, then main's stage71 and stage72 (stage71_weight_units.sql and
// stage72_weight_measures.sql, the weight units: a weight is kg, lb or plates, and a lift's series is kept in its own measure), each twice, then
// stage73 (supabase/stage73_career_main_lifts.sql, scripts/career/rollback_stage73.sql; 2026-10-18), twice; stage73 comes off before stage70
// (section 13), the weight units stay. When the snapshot already holds stage71 and stage72 (it went live before the snapshot was made), they go on
// again on top of stage70 and must put back exactly what it holds. stage73 opens with a guard that refuses, with nothing changed, without stage70
// (section 2 tries it). It needs nothing of stage71 and stage72 and calls none of their functions: section 2 puts it on with stage72's way back run
// first, and runs stage72's way back over it (each in a transaction that is undone). It was built as stage71 and renumbered on 2026-10-18: main's
// stage71 and stage72 replace none of stage73's four functions; --no-stage71 is refused with a pointer to --no-stage73, so an old command never
// runs WITH the stage by mistake.
// The weight units on made-up athletes (section 2, after the stack): Barbell Back Squat logged in POUNDS, +150% (its series key is
// 'barbell back squat|lb'), earns all five The Upgrade tiers, Double Up and NEW ENGINE; the excluded lifts logged in PLATES earn nothing.
// stage73 places a lift by its lift_gain's value.lift, the name as logged, which stage72 leaves plain (|lb or |plates is on the ref alone): a case
// checks that no lift_gain's value.lift carries a measure.
// D18 (Amir): The Upgrade and Double Up count the lifts the Spine places on the seven main patterns (GAME-10). D18 as amended
// (2026-10-18, Amir: "Yes i want those to be exluded / You set up the rule for that"): and only when the lift's Spine entry carries one of the entry's
// `qualities` (strength) and is not one of its `exclude` ids (45° Back Extension, Cable Face Pull, Machine Reverse Fly, Cable Straight-Arm Pulldown);
// section 3b lists what the rule leaves out. While an `exclude` id names no row of the Spine (a typo, a re-keyed or deleted entry) the rule counts no
// lift at all (stage73 fails closed, and puts a warning in the database log naming the key and the missing id); an entry made a draft is no stop (a
// draft places no lift, and its id is still on the list once approved). Section 2 reads the measure with an id unknown, drafted, copied under a new id,
// re-keyed and deleted, in transactions that are undone, with the warnings; 4f3 re-keys one through the real door and puts it right (what was held
// back is minted, dated the day it was earned); 4f4 drafts one through the door (no stop); 3b checks the four on the backup's Spine.
// D19 (Claude's pick, waiting for his word): a count over sessions counts the PAID sessions (the cap GAME-4
// puts on XP), and so does the Home row's commitment number, numbers.four.
// --no-stage73 leaves it out: the run is then phase 3 as it was applied to the project, the "before" numbers; --dump-awards writes every athlete's
// awards to a file (with the lift behind each The Upgrade tier and Double Up, from the award's evidence) and --vs-awards, in a run WITH stage73, checks
// that the only awards that differ from that file are the ones the fix names. The file may come from a run without stage73 or from a run of an
// earlier build of it (the patterns alone, under the old number 71): an athlete the file does not hold (one made up since) is listed, not compared.
// The snapshot (supabase/schema_snapshot.sql) holds stage70 once it is live: then the rehearsal starts from the last committed snapshot that did not
// (--snapshot-rev <rev> picks one), because the point is to rehearse stage70 and stage73 going on. PYTHON must point at a real python on this PC.
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
//      real logs (get_profile's skip path is a growth budget, +100 ms over phase 2's get_profile on the same log) and the core profile's size (the largest real
//      career and a simulated 200-award one, each under 14 KB compact; get_awards() returns every owned award; with stage73 the commitment number's own
//      cost on the longest real log: stage70, stage73 without it, stage73 with it), 10. a re-seed (a tier appended, an xp changed, a title added), 11. erasure, 12. reward_cases.json,
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
import { STAGES, holdsStage } from './rehearse_lib.mjs';     // what tells a database that it holds a stage (the weight units' markers among them)

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const COACH_JWT = JSON.stringify({ email: 'amirardekanian@gmail.com', role: 'authenticated', sub: '00000000-0000-4000-8000-00000000c0c0' });
const args = process.argv.slice(2);
if (args.includes('--no-stage' + '71')) {             // the old name of --no-stage73: refused, never ignored (an ignored flag would run WITH the stage)
  console.error('--no-stage71 is --no-stage73 now: the stage was renumbered (main\'s stage71 and stage72 are the weight units). Nothing was run.');
  process.exit(2);
}
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const BACKUP = opt('--backup'), REPORT = opt('--report');
const PHASE1 = opt('--phase1') || '94cdc89';       // the commit the live project's phase 1 rulebook was seeded from
const HEAD = opt('--head') || 'a219d5a';           // the commit the live project's phase 2 rulebook (version 2) was seeded from
const STOP = Number(opt('--stop-after') || 99);
const S73 = !args.includes('--no-stage73');          // stage73 after stage70 (the default); --no-stage73 is phase 3 as it went on the project
const DUMP_AWARDS = opt('--dump-awards'), VS_AWARDS = opt('--vs-awards'), SNAP_REV = opt('--snapshot-rev');
const CASES_FILE = opt('--cases-file') || path.join(ROOT, 'scripts', 'career', 'reward_cases.json');   // --cases-file: write somewhere else to look at a change first

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
    // only the Windows Store stub of python3 (rehearse_lib.mjs STORE_STUB): a checker that says "was not found" in its own words is a real answer
    if (r.status === 9009 || /^\s*Python was not found; run without arguments to install from the Microsoft Store/m.test((r.stderr || '') + '\n' + (r.stdout || ''))) continue;
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
  want.push('coach.html');       // the checker reads SPINE_PATTERNS from coach.html (GAME-10: a `patterns` key is checked against it): the rev's own, else the working tree's
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
const shelfOf = async (db, id) => (await one(db, `select public.get_awards($1) as p`, [id])).p;
// the award ids and days a get_awards() answer carries, the way career_award_id() writes them: a badge row's `days` (tier 1 first, null for a tier
// skipped; the subject is the habit of a per-habit ladder), an achievement's day, a title's day
function shelfAwards(sh) {
  const m = {};
  for (const b of sh.badges || []) (b.days || []).forEach((d, i) => { if (d) m[`badge:${b.id}:${i + 1}` + (b.subject ? ':' + b.subject : '')] = d; });
  for (const a of sh.achievements || []) m['achievement:' + a.id] = a.day;
  for (const t of sh.titles || []) m['title:' + t.id] = t.day;
  return m;
}
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
  // The snapshot is the live structure. Once stage70 is live it holds stage70, and this rehearsal is about stage70 and stage73 going on: start from the
  // last committed snapshot that does not hold it (or the one --snapshot-rev names). A snapshot without stage70 is used as it is.
  const snapNow = read(path.join(ROOT, 'supabase', 'schema_snapshot.sql'));
  let snapSql = snapNow, snapSays = 'the working copy of supabase/schema_snapshot.sql';
  if (SNAP_REV || /career_awards/.test(snapNow)) {
    const gitShow = rev => cp.execFileSync('git', ['show', `${rev}:supabase/schema_snapshot.sql`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
    const revs = SNAP_REV ? [SNAP_REV] : cp.execFileSync('git', ['log', '--format=%h', '-n', '40', '--', 'supabase/schema_snapshot.sql'], { cwd: ROOT, encoding: 'utf8' }).split(/\s+/).filter(Boolean);
    const pick = revs.find(r => { try { return !/career_awards/.test(gitShow(r)); } catch (e) { return false; } });
    if (!pick) throw new Error('No committed schema snapshot without stage70 was found (git log of supabase/schema_snapshot.sql); pass --snapshot-rev <rev>');
    snapSql = gitShow(pick).split('\r\n').join('\n'); snapSays = `supabase/schema_snapshot.sql as committed at ${pick} (the working copy already holds stage70, which is live)`;
  }
  info(`the structure starts from ${snapSays}`);
  await runSql(db, snapSql, 'snapshot');
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
  // the Spine: the backup's own entries (the real names, patterns and aliases, as approved or draft), then the made-up ones the live-mint scenarios use
  // that the real Spine does not already name. The Upgrade and Double Up place a lift through it (stage73), All-Court through it as well.
  await db.exec(`set session_replication_role = replica`);
  const nSpine = await load(db, 'exercises', T.exercises || []);
  await db.exec(`set session_replication_role = origin`);
  const spineNames = new Set((T.exercises || []).flatMap(e => [e.name, ...(e.aliases || [])]).map(x => String(x).toLowerCase().replace(/[^a-z0-9]+/g, '')));
  // A made-up main lift carries the strength quality, as the real ones do (D18 as amended: The Upgrade and Double Up read only entries tagged strength).
  const SPINE = [['squat', 'Back Squat', 'squat', [], ['strength']], ['rdl', 'Romanian Deadlift', 'hinge', ['RDL'], ['strength']], ['bench', 'Bench Press', 'push-horizontal', [], ['strength']],
                 ['pullup', 'Pull-Up', 'pull-vertical', [], ['strength']], ['splitsq', 'Split Squat', 'single-leg', [], ['strength']], ['goblet', 'Goblet Squat', 'squat', [], ['strength']],
                 // stage73's own cases: a main lift with an alias, and a squat that is only a draft (a draft is placed nowhere)
                 ['zed-alias-press', 'Zed Alias Press', 'push-vertical', ['ZAP'], ['strength']],
                 // D18 as amended: an excluded accessory tagged strength, a main-pattern entry with no strength tag, a strength-tagged main lift (the real
                 // Spine has all three; they are made up only for a backup that does not)
                 ['back-extension-45', '45° Back Extension', 'hinge', [], ['strength', 'armour']], ['cable-chest-press', 'Cable Chest Press', 'push-horizontal', [], ['muscle']],
                 ['barbell-back-squat', 'Barbell Back Squat', 'squat', [], ['strength']],
                 // the weight units' cases (section 2b): another of Amir's four, and a main lift on a machine's stack (logged in plates)
                 ['machine-reverse-fly', 'Machine Reverse Fly', 'pull-horizontal', [], ['armour', 'muscle']], ['machine-leg-press', 'Machine Leg Press', 'squat', [], ['strength', 'muscle']]];
  for (const [id, name, pattern, aliases, qualities] of SPINE) {
    if ([name, ...aliases].some(x => spineNames.has(x.toLowerCase().replace(/[^a-z0-9]+/g, '')))) continue;
    await q(db, `insert into public.exercises (id, name, pattern, aliases, status, qualities) values ($1, $2, $3, $4::text[], 'approved', $5::text[])`, [id, name, pattern, aliases, qualities]);
  }
  await q(db, `insert into public.exercises (id, name, pattern, aliases, status, qualities) values ('zed-draft-squat', 'Zed Draft Squat', 'squat', '{}', 'draft', '{strength}')`);
  info(`the Spine: ${nSpine} entries from the backup, ${(await val(db, `select count(*)::int from public.exercises`)) - nSpine} made up to complete it`);

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
  // stage73 (D18, D19): lifts that gain on a main pattern, on an isolation pattern, on a lift the Spine cannot place, on an alias and on a draft; a plan day
  // done twice in its week; and one plan day finished early and in full in the same week
  const liftAthlete = async (id, pairs) => {      // pairs: [exercise, kg in the first session, kg in the second]; the second session is ten days later
    await mkLogin(db, id);
    await insProgram(db, id, prog({ start: addDays(today, -40), end: addDays(today, 30), days: [1, 2] }));
    const both = (k) => pairs.map(p => sess({ ex: p[0], w: p[k] })).reduce((a, b) => ({ ...a, log: [...a.log, ...b.log] }));
    await insSession(db, id, 1, addDays(today, -30), both(1));
    await insSession(db, id, 2, addDays(today, -20), both(2));
  };
  await liftAthlete('zz_ml_main', [['Goblet Squat', 40, 100]]);                                            // a squat, 150% up
  await liftAthlete('zz_ml_acc', [['Machine Seated Leg Curl', 40, 100], ['Dumbbell Forearm Rotation', 10, 25]]);   // isolation lifts only (off the seven patterns)
  await liftAthlete('zz_ml_none', [['Zed Mystery Lift', 40, 100]]);                                          // a lift the Spine cannot place
  await liftAthlete('zz_ml_alias', [['ZAP', 40, 100]]);                                                      // a main lift, logged by its alias
  await liftAthlete('zz_ml_draft', [['Zed Draft Squat', 40, 100]]);                                          // an entry that is only a draft
  await liftAthlete('zz_ml_mix', [['Goblet Squat', 40, 58], ['Machine Seated Leg Curl', 40, 100]]);         // a squat 45% up, an isolation lift 150% up
  // D18 as amended: an excluded accessory on a main pattern (tagged strength), a main-pattern entry with no strength tag, a strength-tagged main lift,
  // and the excluded accessory 150% up beside the main lift 25% up
  await liftAthlete('zz_ml_bext', [['45° Back Extension', 10, 25]]);                                         // hinge, strength, but excluded by id
  await liftAthlete('zz_ml_cchest', [['Cable Chest Press', 20, 50]]);                                        // push-horizontal, muscle only
  await liftAthlete('zz_ml_bbs', [['Barbell Back Squat', 40, 100]]);                                         // squat, strength
  await liftAthlete('zz_ml_mix2', [['45° Back Extension', 10, 25], ['Barbell Back Squat', 40, 50]]);        // the excluded lift 150% up, the main lift 25% up
  // zz_rep: eight weeks, three plan days, each done twice in its week: 48 sessions, 24 of them paid (one per plan day per week). Century starts at 25.
  await mkLogin(db, 'zz_rep');
  const repStart = addDays(today, -60);
  await insProgram(db, 'zz_rep', prog({ start: repStart, end: addDays(repStart, 55), days: [1, 2, 3] }));
  for (let wk = 0; wk < 8; wk++) for (let dd = 0; dd < 3; dd++) for (let rep = 0; rep < 2; rep++)
    await insSession(db, 'zz_rep', dd + 1, addDays(repStart, 7 * wk + 2 * dd + rep), sess({ w: 40 + wk }));
  const repFacts = await q(db, `select kind, count(*)::int as n from public.career_facts where athlete_id = 'zz_rep' and kind in ('session_finished', 'session_finished_early') and void_at is null group by 1`);
  const repPaid = await val(db, `select count(*)::int from public.career_facts_paid('zz_rep') where kind in ('session_finished', 'session_finished_early')`);
  const repRaw = repFacts.reduce((a, r) => a + r.n, 0);
  ok(repRaw === 48 && repPaid === 24, `zz_rep did each of three plan days twice in each of eight weeks: ${repRaw} session facts, ${repPaid} of them paid`, JSON.stringify({ repFacts, repPaid }), 'L3');
  // zz_cap_*: plan day 1 in the first training week, finished early only (e), early then in full two days later (ef), in full then early (fe). A finished
  // and an early session share one cap that pays the higher XP (career_facts_paid(); D19 counts what it pays): section 2 reads the three counts
  const capStart = addDays(today, -30), CAP_IDS = { zz_cap_e: 'e', zz_cap_ef: 'ef', zz_cap_fe: 'fe' };
  for (const [id, seq] of Object.entries(CAP_IDS)) {
    await mkLogin(db, id);
    await insProgram(db, id, prog({ start: capStart, end: addDays(capStart, 40), days: [1] }));
    for (let i = 0; i < seq.length; i++) await insSession(db, id, 1, addDays(capStart, 1 + 2 * i), seq[i] === 'e' ? { ...sess(), status: 'Partial (3 of 5)' } : sess());
  }
  const capFacts = await q(db, `select athlete_id as id, string_agg(case kind when 'session_finished' then 'f' else 'e' end, '' order by day) as k from public.career_facts
                                 where athlete_id like 'zz\\_cap\\_%' and kind in ('session_finished', 'session_finished_early') and void_at is null group by 1 order by 1`);
  ok(JSON.stringify(Object.fromEntries(capFacts.map(r => [r.id, r.k]))) === JSON.stringify(CAP_IDS), `zz_cap_e, zz_cap_ef and zz_cap_fe carry the session facts e, ef and fe (one plan day, one week)`, JSON.stringify(capFacts), 'L3');

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
  // phase 2's get_profile() on the same log, five reads after a first one (the growth budget of section 9 is measured against these)
  await profile(db, 'zz_ctl');
  const ctlProf = []; for (let k = 0; k < 5; k++) ctlProf.push((await ms(() => profile(db, 'zz_ctl')))[1]);
  info(`control (stage69 only): get_profile() of ${big}'s log ${ctlProf.join(' / ')} ms (median ${median(ctlProf)})`);
  // and of the real athlete itself (its log holds more than the copy: the Proof log, the board), for stage73's commitment number in section 9
  await profile(db, big);
  const ctlProfBig = []; for (let k = 0; k < 5; k++) ctlProfBig.push((await ms(() => profile(db, big)))[1]);
  info(`control (stage69 only): get_profile() of ${big} itself ${ctlProfBig.join(' / ')} ms (median ${median(ctlProfBig)})`);

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
  section('2. stage70 twice, the weight units (stage71, stage72) twice each on top of it, stage73 twice; then the phase 3 catalogue data at the same version with the switch off');
  const s70 = read(path.join(ROOT, 'supabase', 'stage70_career_rewards.sql'));
  const [, tS70] = await ms(() => runSql(db, s70, 'stage70'));
  await runSql(db, s70, 'stage70 again');
  ok(true, `stage70 applied (${Math.round(tS70 / 1000)} s), and applied again without an error`);
  const allCareerDefs = async () => Object.fromEntries((await q(db, `select p.oid::regprocedure::text as n, pg_get_functiondef(p.oid) as d from pg_proc p join pg_namespace s on s.oid = p.pronamespace
      where s.nspname = 'public' order by 1`)).map(r => [r.n, r.d.replace(/\r/g, '')]));
  // main's stage71 and stage72 (the weight units) went live after stage70: they go on here, twice each, in that order. When the snapshot already
  // holds one (it went live before the snapshot was made) the file must put back exactly what the snapshot holds: nothing may move.
  const WU = STAGES.filter(s => s.n === 71 || s.n === 72);
  for (const s of WU) {
    const heldBefore = await holdsStage(db, s), defsWu0 = await allCareerDefs();
    const sql = read(path.join(ROOT, 'supabase', s.file));
    await runSql(db, sql, `stage${s.n}`); await runSql(db, sql, `stage${s.n} again`);
    const defsWu1 = await allCareerDefs();
    const moved = Object.keys({ ...defsWu0, ...defsWu1 }).filter(k => defsWu0[k] !== defsWu1[k]);
    ok(await holdsStage(db, s) && (!heldBefore || moved.length === 0),
       `stage${s.n} (${s.file}, the weight units) on top of stage70, twice: ${heldBefore ? `the snapshot already held it, and the file put back exactly what it holds (${Object.keys(defsWu1).length} functions compared, none moved)` : `applied here (${moved.length} functions new or replaced: ${moved.map(k => k.split('(')[0]).join(', ')})`}`,
       moved.slice(0, 5).map(k => k + '\n' + firstDiff(defsWu0[k], defsWu1[k])).join('\n'), 'S');
    // stage70's way back (section 13) does not touch the weight units' functions: when they were applied here, what it must give back for
    // career_derive() (in REPLACED) is the text they left, not the snapshot's, and their new helpers are not stage70's to drop
    if (!heldBefore) {
      for (const k of Object.keys(defs0)) { const d = (await defsOf([k]))[k]; if (d !== defs0[k]) { info(`${k}() is stage${s.n}'s now: section 13 compares it with that`); defs0[k] = d; } }
      for (const k of moved) fnNames0.add(k.split('(')[0]);
    }
  }
  // stage73 (The Upgrade and Double Up on the seven main patterns, counts over the paid sessions) goes on after stage70, stage71 and stage72, twice. What it
  // replaces must be only four functions, and its one new function must be closed to everybody but the service role. (--no-stage73 leaves it out: phase 3
  // as it was applied.)
  const s73 = read(path.join(ROOT, 'supabase', 'stage73_career_main_lifts.sql'));
  const S73_FNS = ['career_entry_keys', 'career_measures', 'career_achievement_eval', 'career_rewards_profile'];
  const defsBefore73 = await allCareerDefs();
  // THE ORDER (the port of 2026-10-18): stage73 opens with a guard. Without stage70 (career_awards, taken away for one try and put back) it refuses at its
  // first statement and nothing is changed. It needs nothing of stage71 and stage72 (the port's repair round 2 took career_lift_base() out of the main-lift
  // test, where it changed nothing and tied stage73 to stage72's way back): with main's rollback_stage72.sql run first, all seven of stage72's helpers gone,
  // stage73 goes on without an error, in a transaction that is undone.
  const STAGE72_FNS = ['career_w', 'career_wn', 'career_wu', 'career_lift_key', 'career_lift_base', 'career_lift_unit', 'career_rec_unit'];
  const rb72 = read(path.join(ROOT, 'scripts', 'career', 'rollback_stage72.sql'));
  const n72 = async () => val(db, `select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname = any($1::text[])`, [STAGE72_FNS]);
  if (S73) {
    const tryS73 = async () => { let e = null; try { await runSql(db, s73, 'stage73 out of order'); } catch (x) { e = String(x.message); } return [e, await allCareerDefs()]; };
    await q(db, `alter table public.career_awards rename to career_awards_away`);
    const [g70, d70] = await tryS73();
    await q(db, `alter table public.career_awards_away rename to career_awards`);
    ok(g70 && /stage73 needs stage70 first: public\.career_awards is missing\. Apply stage70, then this file\. Nothing was changed\./.test(g70) && !d70['career_maxpct_key(jsonb)']
       && Object.keys(defsBefore73).every(k => defsBefore73[k] === d70[k]),
       'stage73 without stage70 (career_awards renamed away for one try) refuses at its guard, and nothing was changed (every function as it was, no career_maxpct_key())', g70, 'S');
    const no72 = { before: await n72() };
    await db.exec('begin');
    try {
      await runSql(db, rb72, 'rollback_stage72 (undone)');
      no72.left = await n72();
      try { await runSql(db, s73, 'stage73 without stage72'); } catch (x) { no72.err = String(x.message); }
      if (!no72.err) no72.key = await val(db, `select public.career_maxpct_key($1::jsonb)`, [JSON.stringify({ patterns: ['squat'], qualities: ['strength'], exclude: ['cable-face-pull'] })]);
    } catch (x) { no72.err = 'rollback_stage72.sql: ' + String(x.message); }
    finally { await db.exec('rollback'); }
    ok(no72.before === STAGE72_FNS.length && no72.left === 0 && !no72.err && no72.key === 'maxpct:squat|q:strength|x:cable-face-pull',
       `stage73 needs nothing of stage72: with rollback_stage72.sql run first (its ${no72.before} helpers gone, ${no72.left} left), stage73 goes on without an error and its key helper answers (in a transaction that is undone)`,
       JSON.stringify(no72), 'S');
    ok(JSON.stringify(await allCareerDefs()) === JSON.stringify(defsBefore73) && !!(await val(db, `select to_regclass('public.career_awards')::text`)) && (await n72()) === STAGE72_FNS.length,
       'both put back as they were (stage72 whole again, career_awards back, no career_maxpct_key())', undefined, 'S');
  }
  const fnNamesBefore73 = new Set((await q(db, `select p.proname as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public'`)).map(r => r.n));
  if (S73) {
    const [, tS73] = await ms(() => runSql(db, s73, 'stage73'));
    await runSql(db, s73, 'stage73 again');
    ok(true, `stage73 applied (${Math.round(tS73 / 1000)} s), and applied again without an error`);
    const defsAfter73 = await allCareerDefs();
    const changed73 = Object.keys(defsAfter73).filter(k => defsBefore73[k] !== undefined && defsBefore73[k] !== defsAfter73[k]).map(k => k.split('(')[0]).sort();
    const added73 = Object.keys(defsAfter73).filter(k => defsBefore73[k] === undefined).map(k => k.split('(')[0]).sort();
    ok(JSON.stringify(changed73) === JSON.stringify([...S73_FNS].sort()) && JSON.stringify(added73) === JSON.stringify(['career_maxpct_key']),
       `stage73 replaces exactly career_entry_keys, career_measures, career_achievement_eval and career_rewards_profile and adds exactly career_maxpct_key (replaced ${changed73.join(', ')}; added ${added73.join(', ')})`, undefined, 'L1');
    const prv = await one(db, `select has_function_privilege('anon', 'public.career_maxpct_key(jsonb)', 'execute') as anon, has_function_privilege('authenticated', 'public.career_maxpct_key(jsonb)', 'execute') as auth,
                                      has_function_privilege('service_role', 'public.career_maxpct_key(jsonb)', 'execute') as svc, has_function_privilege('public', 'public.career_maxpct_key(jsonb)', 'execute') as pub`).catch(e => ({ err: e.message }));
    ok(prv && !prv.err && !prv.anon && !prv.auth && !prv.pub && prv.svc, 'career_maxpct_key() is closed to public, anon and authenticated and open to service_role', JSON.stringify(prv), 'L1');
    const keyCases = [[{}, 'maxpct'], [{ patterns: ['squat', 'hinge', 'squat'] }, 'maxpct:hinge,squat'], [{ patterns: 'squat' }, 'maxpct:squat'], [{ patterns: [] }, 'maxpct:'], [{ patterns: ['hinge', 'squat'] }, 'maxpct:hinge,squat']];
    const keyBad = [];
    for (const [b, want] of keyCases) { const got = await val(db, `select public.career_maxpct_key($1::jsonb)`, [JSON.stringify(b)]); if (got !== want) keyBad.push(`${JSON.stringify(b)}: ${got}, wanted ${want}`); }
    ok(keyBad.length === 0, `career_maxpct_key() reads the entry: no patterns key = maxpct; an array = maxpct: the patterns sorted, de-duplicated, comma-joined; a string as it is (${keyCases.length} cases)`, keyBad.join('\n'), 'L1');
    // D18 as amended: `qualities` adds |q:, `exclude` adds |x: (each sorted, de-duplicated, comma-joined; a string is one item); an entry with neither
    // reads the key it read before (the cases above), whatever order the lists and the keys come in
    const M7k = ['squat', 'hinge', 'single-leg', 'push-horizontal', 'push-vertical', 'pull-horizontal', 'pull-vertical'];
    const X4k = ['back-extension-45', 'cable-face-pull', 'machine-reverse-fly', 'cable-straight-arm-pulldown'];
    const RULE_KEY = 'maxpct:hinge,pull-horizontal,pull-vertical,push-horizontal,push-vertical,single-leg,squat|q:strength|x:back-extension-45,cable-face-pull,cable-straight-arm-pulldown,machine-reverse-fly';
    const filterCases = [
      [{ patterns: ['squat', 'hinge'], qualities: ['strength'] }, 'maxpct:hinge,squat|q:strength', 'patterns + qualities'],
      [{ patterns: ['hinge'], exclude: ['cable-face-pull', 'back-extension-45'] }, 'maxpct:hinge|x:back-extension-45,cable-face-pull', 'patterns + exclude'],
      [{ patterns: M7k, qualities: ['strength'], exclude: X4k }, RULE_KEY, 'the rule as the catalogue writes it'],
      [{ exclude: X4k.slice().reverse(), qualities: ['strength'], patterns: M7k.slice().reverse() }, RULE_KEY, 'the same lists in another order, the keys in another order'],
      [{ patterns: 'squat', qualities: 'strength', exclude: 'back-extension-45' }, 'maxpct:squat|q:strength|x:back-extension-45', 'string values, one item each'],
      [{ patterns: ['squat', 'squat'], qualities: ['strength', 'armour', 'strength', ''], exclude: ['machine-reverse-fly', 'cable-face-pull', 'machine-reverse-fly'] }, 'maxpct:squat|q:armour,strength|x:cable-face-pull,machine-reverse-fly', 'duplicates and an empty item'],
      [{ patterns: ['squat'], qualities: [], exclude: [] }, 'maxpct:squat|q:|x:', 'empty lists are kept (an empty qualities list matches no lift, an empty exclude list leaves nothing out)'],
      [{ qualities: ['strength'] }, 'maxpct|q:strength', 'qualities without patterns (the checker refuses it in the catalogue; the key is still defined)'],
      [{ patterns: ['squat'], qualities: null }, 'maxpct:squat', 'a JSON null is no key']];
    const fBad = [];
    for (const [b, want, what] of filterCases) { const got = await val(db, `select public.career_maxpct_key($1::jsonb)`, [JSON.stringify(b)]); if (got !== want) fBad.push(`${what}: ${JSON.stringify(b)} gave ${got}, wanted ${want}`); }
    ok(fBad.length === 0, `career_maxpct_key() with qualities and exclude (D18 as amended): ${filterCases.map(c => c[2]).join('; ')} (${filterCases.length} cases)`, fBad.join('\n'), 'S');
    ok((await val(db, `select count(*)::int from public.career_scores where rewards ? 'stamp'`)) === 0, 'stage73 leaves no cached rewards stamp (with the switch off there are none), so the next full evaluate looks again', undefined, 'L1');
  } else info('--no-stage73: phase 3 as it was applied to the project (stage70 only)');
  const erase1 = (await one(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).d;
  ok((erase1.match(/'career_awards'/g) || []).length === 1 && (erase1.match(/'career_recognition'/g) || []).length === 1
     && erase1.replace(`'career_scores', 'career_awards', 'career_recognition']`, `'career_scores']`) === erase0,
     'coach_erase_person() learns career_awards and career_recognition exactly once, and nothing else in it moves', undefined, 'L1');
  const open = (await q(db, `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
                              and (p.proname like 'career\\_%' or p.proname in ('get_profile', 'mark_moments_told')) and has_function_privilege('authenticated', p.oid, 'execute')`)).map(r => r.proname).sort();
  ok(JSON.stringify(open) === JSON.stringify(['get_profile', 'mark_moments_told']), 'only get_profile and mark_moments_told are open to a signed-in athlete', open.join(','), 'L1');
  const newFns = (await q(db, `select p.proname as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public'`)).map(r => r.n).filter(x => !fnNames0.has(x) && x !== 'career_maxpct_key');       // stage73's helper is told apart from stage70's
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
  ok(diffs.length === 0, `every athlete's score and profile are exactly what they were before stage70${S73 ? ' and stage73' : ''} (${allIds0.length}); badges, achievements and moments are []`, diffs.slice(0, 8).join('\n'), 'L1');
  await asCoach(db);
  const board1 = { season: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'season', 50)`), week: await q(db, `select * from public.leaderboard_top('amir_ardekani', null, 'week', 50)`) };
  await asNobody(db);
  ok(JSON.stringify(board1) === JSON.stringify(board0), `the board is exactly as before (${board1.season.length} on it, both scopes)`, undefined, 'L1');
  cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.ok && !('catalogue_switch' in cmp && cmp.catalogue_switch), `the compare still holds with the switch off: ${cmp.matched} of ${cmp.athletes}`, cmp.rows.filter(r => !r.ok).map(r => JSON.stringify(r)).join('\n'), 'L1');
  // 2b. the weight units on made-up athletes, saved once the stack is on (so stage72 derives them whatever the snapshot held): a main lift in POUNDS
  // 150% up, the two excluded lifts that sit on a main pattern in PLATES 150% up, and a main lift on a machine's stack in plates 62.5% up. Each lift's
  // series is kept in its own measure (stage72): its lift_gain's ref is the series key, its value.lift the name as logged. They are history at the go-day.
  await liftAthlete('zz_ml_lb', [['Barbell Back Squat', '100 lb', '250 lb']]);                                         // squat, strength, in pounds: +150%
  await liftAthlete('zz_ml_plates', [['45° Back Extension', '4 plates', '10 plates'], ['Machine Reverse Fly', '6 plates', '15 plates']]);   // excluded, in plates
  await liftAthlete('zz_ml_plmain', [['Machine Leg Press', '8 plates', '13 plates']]);                                  // squat, strength, in plates: +62.5%
  const lgU = id => q(db, `select ref, value ->> 'lift' as lift, (value ->> 'pct')::numeric as pct from public.career_facts where athlete_id = $1 and kind = 'lift_gain' and void_at is null order by ref`, [id]);
  const uLb = await lgU('zz_ml_lb'), uPl = await lgU('zz_ml_plates'), uPm = await lgU('zz_ml_plmain');
  info(`the weight-unit athletes' lift gains: ` + [['zz_ml_lb', uLb], ['zz_ml_plates', uPl], ['zz_ml_plmain', uPm]].map(([id, r]) => `${id} ${r.map(x => `${x.ref} (${x.lift}) ${x.pct}%`).join(', ')}`).join('; '));
  ok(uLb.length === 1 && uLb[0].ref === 'barbell back squat|lb' && uLb[0].lift === 'Barbell Back Squat' && Number(uLb[0].pct) === 150
     && JSON.stringify(uPl.map(x => x.ref)) === JSON.stringify(['45° back extension|plates', 'machine reverse fly|plates']) && uPl.every(x => Number(x.pct) === 150)
     && uPm.length === 1 && uPm[0].ref === 'machine leg press|plates' && Number(uPm[0].pct) === 62.5,
     'stage72 keeps each lift in its own measure: Barbell Back Squat 100 to 250 lb is the series barbell back squat|lb (+150%), the two excluded lifts in plates are |plates series (+150% each), Machine Leg Press 8 to 13 plates is machine leg press|plates (+62.5%); value.lift is the name as logged',
     JSON.stringify({ uLb, uPl, uPm }), 'S');
  if (S73) {
    // the measures stage73 adds, read directly (service role / superuser here): maxpct over every lift as before, maxpct:<patterns> over the lifts the Spine places there
    const MAIN7 = ['squat', 'hinge', 'single-leg', 'push-horizontal', 'push-vertical', 'pull-horizontal', 'pull-vertical'];
    const mp = async (id, key) => Number((await val(db, `select public.career_measures($1, '{}'::jsonb, array[$2]::text[]) -> $2 ->> 'have'`, [id, key])));
    const k7 = await val(db, `select public.career_maxpct_key($1::jsonb)`, [JSON.stringify({ patterns: MAIN7 })]);
    const lg = id => q(db, `select value ->> 'lift' as lift, (value ->> 'pct')::numeric as pct from public.career_facts where athlete_id = $1 and kind = 'lift_gain' and void_at is null order by 1`, [id]);
    info(`the lift gains the made-up athletes carry: ` + (await Promise.all(['zz_ml_main', 'zz_ml_acc', 'zz_ml_none', 'zz_ml_alias', 'zz_ml_draft', 'zz_ml_mix'].map(async id => `${id} ${(await lg(id)).map(r => `${r.lift} ${r.pct}%`).join(', ')}`))).join('; '));
    const m = {};
    for (const id of ['zz_ml_main', 'zz_ml_acc', 'zz_ml_none', 'zz_ml_alias', 'zz_ml_draft', 'zz_ml_mix']) m[id] = { all: await mp(id, 'maxpct'), main: await mp(id, k7) };
    ok(m.zz_ml_main.all === m.zz_ml_main.main && m.zz_ml_main.main >= 100, `maxpct:<the seven main patterns> reads a squat's gain as maxpct does (${m.zz_ml_main.main}% both ways)`, JSON.stringify(m.zz_ml_main), 'L1');
    ok(m.zz_ml_acc.all >= 100 && m.zz_ml_acc.main === 0, `and an isolation lift's gain (Machine Seated Leg Curl, Dumbbell Forearm Rotation: ${m.zz_ml_acc.all}% by maxpct) is 0 on the seven main patterns`, JSON.stringify(m.zz_ml_acc), 'L1');
    ok(m.zz_ml_none.all >= 100 && m.zz_ml_none.main === 0, `a lift the Spine cannot place counts for nothing (${m.zz_ml_none.all}% → ${m.zz_ml_none.main}%)`, JSON.stringify(m.zz_ml_none), 'L1');
    ok(m.zz_ml_draft.all >= 100 && m.zz_ml_draft.main === 0, `a lift that is only a Spine DRAFT is placed nowhere (${m.zz_ml_draft.all}% → ${m.zz_ml_draft.main}%)`, JSON.stringify(m.zz_ml_draft), 'L1');
    ok(m.zz_ml_alias.main === m.zz_ml_alias.all && m.zz_ml_alias.main >= 100, `a main lift logged by its alias is placed (${m.zz_ml_alias.main}%)`, JSON.stringify(m.zz_ml_alias), 'L1');
    ok(m.zz_ml_mix.all >= 100 && m.zz_ml_mix.main > 0 && m.zz_ml_mix.main < 100, `a squat at ${m.zz_ml_mix.main}% and an isolation lift at ${m.zz_ml_mix.all}%: the measure over the seven patterns is the squat's alone`, JSON.stringify(m.zz_ml_mix), 'L1');
    ok(await mp('zz_ml_main', 'maxpct:') === 0 && await mp('zz_ml_main', 'maxpct:squat') === m.zz_ml_main.main && await mp('zz_ml_main', 'maxpct:hinge') === 0,
       'an empty pattern list places no lift; a single pattern reads only that pattern', undefined, 'L1');
    // D18 as amended, read directly: the rule's key from an explicit body (so it holds whatever the catalogue says; section 3b reads the catalogue's)
    const X4 = ['back-extension-45', 'cable-face-pull', 'machine-reverse-fly', 'cable-straight-arm-pulldown'];
    const kRule = await val(db, `select public.career_maxpct_key($1::jsonb)`, [JSON.stringify({ patterns: MAIN7, qualities: ['strength'], exclude: X4 })]);
    const kQ = await val(db, `select public.career_maxpct_key($1::jsonb)`, [JSON.stringify({ patterns: MAIN7, qualities: ['strength'] })]);
    const kX = await val(db, `select public.career_maxpct_key($1::jsonb)`, [JSON.stringify({ patterns: MAIN7, exclude: X4 })]);
    const AM = ['zz_ml_bext', 'zz_ml_cchest', 'zz_ml_bbs', 'zz_ml_mix2', 'zz_ml_main', 'zz_ml_alias', 'zz_ml_mix'];
    info(`the lift gains of the D18-as-amended athletes: ` + (await Promise.all(AM.slice(0, 4).map(async id => `${id} ${(await lg(id)).map(r => `${r.lift} ${r.pct}%`).join(', ')}`))).join('; '));
    const a = {};
    for (const id of AM) a[id] = { all: await mp(id, 'maxpct'), pats: await mp(id, k7), q: await mp(id, kQ), x: await mp(id, kX), rule: await mp(id, kRule) };
    info(`maxpct / patterns / + strength / + exclude / the rule: ` + AM.map(id => `${id} ${a[id].all}/${a[id].pats}/${a[id].q}/${a[id].x}/${a[id].rule}`).join('; '));
    ok(a.zz_ml_bext.all >= 100 && a.zz_ml_bext.pats === a.zz_ml_bext.all && a.zz_ml_bext.q === a.zz_ml_bext.all && a.zz_ml_bext.x === 0 && a.zz_ml_bext.rule === 0,
       `45° Back Extension ${a.zz_ml_bext.all}% up (hinge, tagged strength): counted by the patterns and by the strength rule, 0 once its id is excluded, 0 under the rule`, JSON.stringify(a.zz_ml_bext), 'S');
    ok(a.zz_ml_cchest.all >= 100 && a.zz_ml_cchest.pats === a.zz_ml_cchest.all && a.zz_ml_cchest.q === 0 && a.zz_ml_cchest.x === a.zz_ml_cchest.all && a.zz_ml_cchest.rule === 0,
       `Cable Chest Press ${a.zz_ml_cchest.all}% up (push-horizontal, muscle only): counted by the patterns and by the exclude list alone, 0 once strength is asked, 0 under the rule`, JSON.stringify(a.zz_ml_cchest), 'S');
    ok(a.zz_ml_bbs.all >= 100 && ['pats', 'q', 'x', 'rule'].every(k => a.zz_ml_bbs[k] === a.zz_ml_bbs.all), `Barbell Back Squat ${a.zz_ml_bbs.all}% up (squat, strength): counted every way`, JSON.stringify(a.zz_ml_bbs), 'S');
    ok(a.zz_ml_mix2.all >= 100 && a.zz_ml_mix2.pats === a.zz_ml_mix2.all && a.zz_ml_mix2.rule > 0 && a.zz_ml_mix2.rule < 30,
       `the excluded lift ${a.zz_ml_mix2.all}% up beside the main lift ${a.zz_ml_mix2.rule}% up: the patterns alone read the back extension, the rule reads the squat alone`, JSON.stringify(a.zz_ml_mix2), 'S');
    ok(['zz_ml_main', 'zz_ml_alias'].every(id => a[id].rule === a[id].all && a[id].all >= 100) && a.zz_ml_mix.rule === m.zz_ml_mix.main,
       `the strength-tagged main lifts of stage73's own cases count under the rule as before (Goblet Squat ${a.zz_ml_main.rule}%, a lift by its alias ${a.zz_ml_alias.rule}%, the squat beside an isolation lift ${a.zz_ml_mix.rule}%)`, JSON.stringify({ main: a.zz_ml_main, alias: a.zz_ml_alias, mix: a.zz_ml_mix }), 'S');
    const bbs = a.zz_ml_bbs.all;
    const edge = { emptyQ: await mp('zz_ml_bbs', 'maxpct:squat|q:'), emptyX: await mp('zz_ml_bbs', 'maxpct:squat|x:'), aliasOut: await mp('zz_ml_alias', 'maxpct:push-vertical|x:zed-alias-press'),
                   noPatsQ: await mp('zz_ml_bbs', 'maxpct|q:strength'), noPatsQc: await mp('zz_ml_cchest', 'maxpct|q:strength'), noPatsMuscle: await mp('zz_ml_cchest', 'maxpct|q:muscle'),
                   noPatsUnplaced: await mp('zz_ml_none', 'maxpct|x:back-extension-45'), draftQ: await mp('zz_ml_draft', 'maxpct:squat|q:strength') };
    ok(edge.emptyQ === 0 && edge.emptyX === bbs && edge.aliasOut === 0 && edge.noPatsQ === bbs && edge.noPatsQc === 0 && edge.noPatsMuscle === a.zz_ml_cchest.all && edge.noPatsUnplaced === 0 && edge.draftQ === 0,
       'an empty qualities list matches no lift, an empty exclude list leaves nothing out, an excluded entry is out by its alias too, a key without patterns takes any pattern but only a placed lift, and a draft is placed nowhere',
       JSON.stringify(edge), 'S');
    // the exclude list fails closed, narrowly (the port of 2026-10-18): only an |x: id with NO row in public.exercises (a typo, the entry given a new id,
    // or deleted) stops the key, which then counts no lift at all, so nothing is minted by mistake (a mint is never taken back, GAME-1). An entry made a
    // draft is no stop: a draft places no lift anyway, and its id is still on the list when it is approved again. Each case in a transaction that is undone.
    const bextAll = a.zz_ml_bext.all;
    // and a stop says so: career_measures() puts a WARNING in the database log naming the key and every |x: id with no row (a warning never stops a save);
    // a healthy key, a key without |x:, plain maxpct and a key naming a draft are quiet. Read with PGlite's onNotice.
    const mpW = async (id, key) => {
      const w = [];
      const r = await db.query(`select public.career_measures($1, '{}'::jsonb, array[$2]::text[]) -> $2 ->> 'have' as h`, [id, key], { onNotice: n => w.push(`${n.severity}: ${n.message}`) });
      return [Number(r.rows[0].h), w];
    };
    const undone = async fn => { await db.exec('begin'); try { return await fn(); } finally { await db.exec('rollback'); } };
    const warn = { healthy: (await mpW('zz_ml_bbs', kRule))[1], plain: (await mpW('zz_ml_bbs', 'maxpct'))[1], noX: (await mpW('zz_ml_bbs', kQ))[1],
                   unknown: (await mpW('zz_ml_bbs', 'maxpct:squat|x:no-such-entry'))[1], two: (await mpW('zz_ml_bbs', 'maxpct:squat|x:zz-gone,cable-face-pull,no-such-entry'))[1] };
    const fc = { unknown: await mp('zz_ml_bbs', 'maxpct:squat|x:no-such-entry'), unknownBeside: await mp('zz_ml_bbs', 'maxpct:squat|q:strength|x:cable-face-pull,no-such-entry') };
    // drafted: no stop. The squat counts under the rule as before; the back extension counts nowhere (a draft places nothing, with the list or without it).
    fc.draft = await undone(async () => {
      await q(db, `update public.exercises set status = 'draft' where id = 'back-extension-45'`);
      return { bbs: await mp('zz_ml_bbs', kRule), bext: await mp('zz_ml_bext', kRule), bextNoX: await mp('zz_ml_bext', kQ), mix2: await mp('zz_ml_mix2', kRule),
               warn: (await mpW('zz_ml_bbs', kRule))[1] };
    });
    // re-keyed: the row moves to a new id, so the old id has no row: the key stops (both athletes read 0), where the strength rule without the list
    // would count the back extension again under its new id
    fc.rekey = await undone(async () => {
      await q(db, `update public.exercises set id = 'back-extension-45-v2' where id = 'back-extension-45'`);
      return { bbs: await mp('zz_ml_bbs', kRule), bext: await mp('zz_ml_bext', kRule), bextNoX: await mp('zz_ml_bext', kQ), bbsNoX: await mp('zz_ml_bbs', kQ),
               warn: (await mpW('zz_ml_bbs', kRule))[1] };
    });
    // deleted: no row either, the key stops
    fc.deleted = await undone(async () => {
      await q(db, `delete from public.exercises where id = 'back-extension-45'`);
      return { bbs: await mp('zz_ml_bbs', kRule), bext: await mp('zz_ml_bext', kRule), warn: (await mpW('zz_ml_bbs', kRule))[1] };
    });
    // a copy under a new id BESIDE the old row (made a draft) is a new exercise to the rule: the old id still has its row, so nothing stops, and the copy
    // counts when it qualifies (approved, hinge, tagged strength) until its id is on the list too. The stop is for an id with no row and cannot tell a copy
    // from a new entry: pinned here, so a change to it is seen.
    fc.copy = await undone(async () => {
      await q(db, `insert into public.exercises select (jsonb_populate_record(null::public.exercises, to_jsonb(e) || jsonb_build_object('id', 'back-extension-45-v2', 'status', 'approved'))).*
                    from public.exercises e where e.id = 'back-extension-45'`);
      await q(db, `update public.exercises set status = 'draft' where id = 'back-extension-45'`);
      return { bext: await mp('zz_ml_bext', kRule), bextV2Out: await mp('zz_ml_bext', kRule.replace('|x:', '|x:back-extension-45-v2,')), warn: (await mpW('zz_ml_bbs', kRule))[1] };
    });
    fc.after = { bbs: await mp('zz_ml_bbs', kRule), bext: await mp('zz_ml_bext', kRule), v2: await val(db, `select count(*)::int from public.exercises where id = 'back-extension-45-v2'`),
                 be45: await val(db, `select count(*)::int from public.exercises where id = 'back-extension-45' and status = 'approved'`) };
    ok(fc.unknown === 0 && fc.unknownBeside === 0
       && fc.draft.bbs === bbs && fc.draft.bext === 0 && fc.draft.bextNoX === 0 && fc.draft.mix2 === a.zz_ml_mix2.rule
       && fc.rekey.bbs === 0 && fc.rekey.bext === 0 && fc.rekey.bextNoX === bextAll && fc.rekey.bbsNoX === bbs
       && fc.deleted.bbs === 0 && fc.deleted.bext === 0
       && fc.after.bbs === bbs && fc.after.bext === 0 && fc.after.v2 === 0 && fc.after.be45 === 1,
       `the exclude list fails closed, only on an id with no row: a key naming an id the Spine does not have counts no lift (alone or beside a real id); back-extension-45 made a draft is no stop (Barbell Back Squat still ${fc.draft.bbs}%, the back extension 0 with the list and without it: a draft places nothing); re-keyed to a new id, the key counts nothing (the squat ${fc.rekey.bbs}%), where the strength rule alone would count the back extension again (${fc.rekey.bextNoX}%); deleted, nothing either; put back, the rule reads the squat (${fc.after.bbs}%) and not the back extension (${fc.after.bext}%)`,
       JSON.stringify(fc), 'S');
    ok(fc.copy.bext === bextAll && fc.copy.bextV2Out === 0 && fc.copy.warn.length === 0,
       `a copy of the back extension under a new id, beside the old row made a draft, is a new exercise to the rule: nothing stops, and it counts (${fc.copy.bext}%) until its id is on the list as well (then ${fc.copy.bextV2Out}%)`,
       JSON.stringify(fc.copy), 'S');
    const W0 = 'WARNING: Career Mode: ', WMSG = ' in its exclude list is not in the Spine (no row in public.exercises; fail closed)';
    ok(warn.healthy.length === 0 && warn.plain.length === 0 && warn.noX.length === 0 && fc.draft.warn.length === 0
       && warn.unknown.length === 1 && warn.unknown[0].startsWith(W0 + 'maxpct:squat|x:no-such-entry counts no lift while no-such-entry' + WMSG)
       && warn.two.length === 1 && warn.two[0].includes(' counts no lift while no-such-entry, zz-gone' + WMSG)
       && fc.rekey.warn.length === 1 && fc.rekey.warn[0].startsWith(W0 + kRule + ' counts no lift while back-extension-45' + WMSG)
       && fc.deleted.warn.length === 1 && fc.deleted.warn[0].startsWith(W0 + kRule + ' counts no lift while back-extension-45' + WMSG),
       'and a stop says so: one WARNING in the database log naming the key and every id with no row, sorted (an unknown id, two beside a real one, back-extension-45 re-keyed, then deleted); the rule\'s key with its four ids in the Spine (one of them a draft), a key without |x: and plain maxpct raise none',
       JSON.stringify({ warn, draft: fc.draft.warn, rekey: fc.rekey.warn, deleted: fc.deleted.warn }), 'S');
    // the weight units (section 2b) under the rule: a main lift in pounds counts as one in kilograms does; the excluded lifts in plates count for nothing
    // (the strength rule without the list would count the back extension's plates); a main lift in plates counts
    const u = {};
    for (const id of ['zz_ml_lb', 'zz_ml_plates', 'zz_ml_plmain']) u[id] = { all: await mp(id, 'maxpct'), rule: await mp(id, kRule), q: await mp(id, kQ) };
    ok(u.zz_ml_lb.all === 150 && u.zz_ml_lb.rule === 150 && u.zz_ml_plates.all === 150 && u.zz_ml_plates.rule === 0 && u.zz_ml_plates.q === 150
       && u.zz_ml_plmain.all === 62.5 && u.zz_ml_plmain.rule === 62.5,
       `pounds and plates under the rule: Barbell Back Squat in lb counts (${u.zz_ml_lb.rule}%, the series barbell back squat|lb); the excluded 45° Back Extension and Machine Reverse Fly in plates count for nothing (${u.zz_ml_plates.rule}%, where the strength rule without the list reads ${u.zz_ml_plates.q}%); Machine Leg Press in plates counts (${u.zz_ml_plmain.rule}%)`,
       JSON.stringify(u), 'S');
    // what the main-lift test rests on: a lift_gain's value.lift is the name as logged and never carries a measure (stage72 puts |lb or |plates on the ref,
    // the series key, alone), so career_norm(value.lift) places a lift in pounds or plates as one in kilograms. Every lift gain in this database, the real
    // rows and the made-up ones, in every measure.
    const lgAll = await one(db, `select count(*)::int as n, (count(*) filter (where ref ~ '\\|(lb|plates)$'))::int as keyed_refs,
                                        (count(*) filter (where value ->> 'lift' ~ '\\|(lb|plates)$'))::int as keyed_lifts
                                   from public.career_facts where kind = 'lift_gain' and void_at is null`);
    ok(lgAll.keyed_refs >= 4 && lgAll.keyed_lifts === 0,
       `no lift_gain's value.lift carries a measure (${lgAll.n} lift gains, ${lgAll.keyed_refs} of them kept in pounds or plates by their ref, ${lgAll.keyed_lifts} with |lb or |plates on value.lift): the name as logged is what the Spine places`,
       JSON.stringify(lgAll), 'S');
    // stage72's way back over stage73 (the order the review of 2026-10-18 found unguarded: with the port's career_lift_base() call, every key with patterns
    // then raised "function public.career_lift_base(text) does not exist", and a full evaluate with it). stage73 calls none of stage72's functions now:
    // with rollback_stage72.sql run over it, the rule reads the same numbers. In a transaction that is undone.
    const F73 = ['career_maxpct_key', 'career_entry_keys', 'career_measures', 'career_achievement_eval', 'career_rewards_profile'];
    const calls72 = (await q(db, `select p.proname as n from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any($1::text[])
                                     and p.prosrc ~ ('\\m(' || array_to_string($2::text[], '|') || ')\\s*\\(')`, [F73, STAGE72_FNS])).map(r => r.n);
    const U72 = ['zz_ml_lb', 'zz_ml_plates', 'zz_ml_plmain', 'zz_ml_bbs', 'zz_ml_mix2'];
    const over72 = {};
    for (const id of U72) over72[id] = await mp(id, kRule);
    let after72;
    try {
      after72 = await undone(async () => {
        await runSql(db, rb72, 'rollback_stage72 over stage73 (undone)');
        const r = { left: await n72() };
        for (const id of U72) r[id] = await mp(id, kRule);
        return r;
      });
    } catch (x) { after72 = { err: String(x.message) }; }
    ok(calls72.length === 0 && !after72.err && after72.left === 0 && U72.every(id => after72[id] === over72[id])
       && over72.zz_ml_lb === 150 && over72.zz_ml_plates === 0 && over72.zz_ml_plmain === 62.5 && over72.zz_ml_bbs === bbs,
       `stage72's way back can run over stage73: none of stage73's five functions calls one of stage72's seven (${calls72.length} do), and with rollback_stage72.sql run (${after72.left} of its helpers left; undone after) the rule reads the same for every weight-unit athlete (Barbell Back Squat in lb ${after72.zz_ml_lb}%, the excluded lifts in plates ${after72.zz_ml_plates}%, Machine Leg Press in plates ${after72.zz_ml_plmain}%, the kilogram squat ${after72.zz_ml_bbs}%, the excluded lift beside a main one ${after72.zz_ml_mix2}%)`,
       JSON.stringify({ calls72, before: over72, after: after72 }), 'S');
    ok((await n72()) === STAGE72_FNS.length, 'and stage72 is whole again after the undo', undefined, 'S');
    // the shared session cap: one plan day in one week is one paid session, the higher XP (a finished one, 400, over an early one, 200). Counted together
    // (Century, the commitment number) the count never goes down as sessions are added; the finished kind alone does not either while it out-earns an
    // early finish; the early kind alone loses the one a full finish replaces (zz_cap_e has it, zz_cap_ef does not): why a count names both kinds
    const capN = {};
    for (const id of Object.keys(CAP_IDS)) capN[id] = [await mp(id, 'count:session_finished,session_finished_early'), await mp(id, 'count:session_finished'), await mp(id, 'count:session_finished_early')];
    ok(capN.zz_cap_e.join() === '1,0,1' && capN.zz_cap_ef.join() === '1,1,0' && capN.zz_cap_fe.join() === '1,1,0',
       `one plan day in one week (both kinds, finished, early): early only ${capN.zz_cap_e.join('/')}; early then in full ${capN.zz_cap_ef.join('/')}; in full then early ${capN.zz_cap_fe.join('/')}. Both kinds together and the finished kind alone never go down as sessions are added; the early kind alone does, so a count names both`,
       JSON.stringify(capN), 'L1');
  }
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
  // ── 3b. The Upgrade and Double Up on the seven main patterns (GAME-10, D18); counts over sessions count the paid ones (D19) ──────────────────
  section(`3b. ${S73 ? 'stage73' : 'phase 3 as applied, WITHOUT stage73'}: The Upgrade and Double Up, and the counts over sessions, athlete by athlete`);
  {
    const MAIN7 = ['squat', 'hinge', 'single-leg', 'push-horizontal', 'push-vertical', 'pull-horizontal', 'pull-vertical'];
    const cbody = (kind, id) => cat3.find(c => c.kind === kind && c.id === id).body;
    const upAt = cbody('badge', 'the_upgrade').tiers.map(x => x.at), dblAt = Number(cbody('achievement', 'double_up').at);
    ok(JSON.stringify(cbody('badge', 'the_upgrade').patterns) === JSON.stringify(MAIN7) && JSON.stringify(cbody('achievement', 'double_up').patterns) === JSON.stringify(MAIN7),
       'the catalogue rows of The Upgrade and Double Up carry patterns = the seven main patterns (and no other entry names patterns)', undefined, 'L2');
    ok(cat3.filter(c => c.body && c.body.patterns !== undefined).map(c => c.kind + '.' + c.id).sort().join() === 'achievement.double_up,badge.the_upgrade', 'only those two entries carry `patterns`', cat3.filter(c => c.body && c.body.patterns !== undefined).map(c => c.kind + '.' + c.id).join(), 'L2');
    // D18 as amended: both entries carry qualities = strength and exclude = Amir's four, the same on both, and no other entry carries either key
    const X4 = ['back-extension-45', 'cable-face-pull', 'machine-reverse-fly', 'cable-straight-arm-pulldown'];
    const filt = b => ({ q: b.qualities === undefined ? null : [].concat(b.qualities), x: b.exclude === undefined ? null : [].concat(b.exclude) });
    const fU = filt(cbody('badge', 'the_upgrade')), fD = filt(cbody('achievement', 'double_up'));
    ok(JSON.stringify(fU.q) === JSON.stringify(['strength']) && JSON.stringify((fU.x || []).slice().sort()) === JSON.stringify(X4.slice().sort()) && JSON.stringify(fU) === JSON.stringify(fD),
       `the catalogue rows of The Upgrade and Double Up carry qualities = ${JSON.stringify(fU.q)} and exclude = ${JSON.stringify(fU.x)}, the same on both (D18 as amended)`, JSON.stringify({ the_upgrade: fU, double_up: fD }), 'K');
    const withFilt = cat3.filter(c => c.body && (c.body.qualities !== undefined || c.body.exclude !== undefined)).map(c => c.kind + '.' + c.id).sort().join();
    ok(withFilt === 'achievement.double_up,badge.the_upgrade', 'only those two entries carry `qualities` or `exclude`', withFilt, 'K');
    // every id an exclude list names is an APPROVED entry of the real Spine (the backup's). One with no row stops stage73's rule (it counts no lift at all,
    // sections 2, 4f3), so on go-day The Upgrade and Double Up would mint nothing; a draft would not stop it (section 4f4), but the four are meant to be
    // live entries, so this asks for approved. The report lists each id and whether it resolves (exclude_ids).
    const realSpine = Object.fromEntries((T.exercises || []).map(e => [e.id, e]));
    const exBad = [];
    for (const c of cat3) for (const xid of (c.body && c.body.exclude !== undefined ? [].concat(c.body.exclude) : [])) {
      const e = realSpine[xid];
      if (!e) exBad.push(`${c.kind} ${c.id}: ${xid} is not in the backup's Spine (the rule would count no lift: put the id right in career/*.toml or the Spine)`);
      else if (e.status !== 'approved') exBad.push(`${c.kind} ${c.id}: ${xid} (${e.name}) is a ${e.status}, not approved (the rule would count no lift)`);
    }
    const exIds = [...new Set(cat3.flatMap(c => c.body && c.body.exclude !== undefined ? [].concat(c.body.exclude) : []))].sort()
      .map(x => ({ id: x, name: realSpine[x] ? realSpine[x].name : null, status: realSpine[x] ? realSpine[x].status : null, pattern: realSpine[x] ? realSpine[x].pattern : null,
                   qualities: realSpine[x] ? realSpine[x].qualities || [] : [], resolves: !!(realSpine[x] && realSpine[x].status === 'approved') }));
    ok(exBad.length === 0, `every Spine id in the catalogue's exclude lists is an approved entry of the backup's Spine (${[...new Set(cat3.flatMap(c => c.body && c.body.exclude !== undefined ? [].concat(c.body.exclude) : []))].map(x => `${x} = ${realSpine[x] ? realSpine[x].name + ' (' + realSpine[x].pattern + '; ' + (realSpine[x].qualities || []).join(', ') + ')' : '?'}`).join(', ')})`, exBad.join('\n'), 'K');
    // every lift gain, with whether the Spine places its lift on a main pattern (the placing patterns_in_cycle uses: an approved entry's name or alias, career_norm'd),
    // and whether it counts under the entry's whole rule (D18 as amended: an approved entry on the patterns, carrying one of the qualities, not excluded),
    // worked out here from the catalogue row and the Spine, independently of the function
    const gains = await q(db, `with main as (select public.career_norm(e.name) as nm from public.exercises e where e.status = 'approved' and e.pattern = any($1::text[])
                                              union select public.career_norm(a.x) from public.exercises e cross join unnest(e.aliases) a(x) where e.status = 'approved' and e.pattern = any($1::text[])),
                                    rule as (select public.career_norm(e.name) as nm from public.exercises e
                                              where e.status = 'approved' and e.pattern = any($1::text[]) and ($2::text[] is null or e.qualities && $2::text[]) and ($3::text[] is null or not (e.id = any($3::text[])))
                                             union select public.career_norm(a.x) from public.exercises e cross join unnest(e.aliases) a(x)
                                              where e.status = 'approved' and e.pattern = any($1::text[]) and ($2::text[] is null or e.qualities && $2::text[]) and ($3::text[] is null or not (e.id = any($3::text[]))))
                                select f.athlete_id as id, f.value ->> 'lift' as lift, (f.value ->> 'pct')::numeric as pct, f.day::text as d, f.ref,
                                       (public.career_norm(f.value ->> 'lift') in (select nm from main)) as is_main,
                                       (public.career_norm(f.value ->> 'lift') in (select nm from rule)) as counts
                                  from public.career_facts f where f.kind = 'lift_gain' and f.void_at is null and public.career_num(f.value -> 'pct') is not null
                                 order by f.athlete_id, f.day, f.ref`, [[].concat(cbody('badge', 'the_upgrade').patterns || MAIN7), fU.q, fU.x]);
    const gby = {}; for (const g of gains) (gby[g.id] = gby[g.id] || []).push(g);
    const awRows = await q(db, `select athlete_id as id, award_id, day::text as d, pays, xp from public.career_awards order by 1, 2`);
    const aby = {}; for (const a of awRows) (aby[a.id] = aby[a.id] || {})[a.award_id] = a;
    // the lift behind each The Upgrade tier and Double Up, as the server recorded it: the award's evidence names the lift_gain fact it crossed on
    const evRows = await q(db, `select a.athlete_id as id, a.award_id, a.evidence ->> 'via' as via, public.career_num(a.evidence -> 'n') as n,
                                       (select f.value ->> 'lift' from public.career_facts f where f.athlete_id = a.athlete_id and f.kind = 'lift_gain'
                                           and f.ref = a.evidence -> 'facts' -> 0 ->> 'ref' order by f.void_at nulls first limit 1) as lift
                                  from public.career_awards a where a.item in ('the_upgrade', 'double_up') order by 1, 2`);
    const evOf = {}; for (const r of evRows) (evOf[r.id] = evOf[r.id] || {})[r.award_id] = r;
    const firstDay = (rows, at) => rows.filter(g => g.pct >= at).map(g => g.d).sort()[0] || null;
    const upBad = [], accessoryOnly = [], duHolders = [], neHolders = [], upHolders = [];
    const useRows = id => (gby[id] || []).filter(g => !S73 || g.counts);
    for (const id of Object.keys({ ...gby, ...aby })) {
      const mine = aby[id] || {}, rows = useRows(id);
      upAt.forEach((at, i) => {
        const want = firstDay(rows, at), got = mine[`badge:the_upgrade:${i + 1}`];
        if (!!want !== !!got) upBad.push(`${id}: The Upgrade tier ${i + 1} (${at}%): ${got ? 'awarded ' + got.d : 'not awarded'}, the ${S73 ? 'main-lift' : 'lift'} gains say ${want || 'no'}`);
        else if (want && got.d !== want) upBad.push(`${id}: The Upgrade tier ${i + 1} dated ${got.d}, the ${S73 ? 'main-lift' : 'lift'} gains cross it on ${want}`);
      });
      const wantDU = firstDay(rows, dblAt), gotDU = mine['achievement:double_up'], gotNE = mine['title:new_engine'];
      if (!!wantDU !== !!gotDU) upBad.push(`${id}: Double Up ${gotDU ? 'awarded ' + gotDU.d : 'not awarded'}, the gains say ${wantDU || 'no'}`);
      else if (wantDU && gotDU.d !== wantDU) upBad.push(`${id}: Double Up dated ${gotDU.d}, the gains cross ${dblAt}% on ${wantDU}`);
      if (!!gotDU !== !!gotNE) upBad.push(`${id}: Double Up ${gotDU ? 'is' : 'is not'} awarded but the title NEW ENGINE ${gotNE ? 'is' : 'is not'}`);
      if (mine['badge:the_upgrade:1']) upHolders.push(id);
      if (gotDU) duHolders.push(id);
      if (gotNE) neHolders.push(id);
      const all = gby[id] || [], mainRows = all.filter(g => g.counts);
      if (all.some(g => g.pct >= upAt[0]) && (upAt.some(at => !!firstDay(all, at) !== !!firstDay(mainRows, at)) || !!firstDay(all, dblAt) !== !!firstDay(mainRows, dblAt)))
        accessoryOnly.push({ id, lifts: all.filter(g => !g.counts && g.pct >= upAt[0]).map(g => `${g.lift} ${g.pct}%`) });
    }
    ok(upBad.length === 0, S73
       ? `every The Upgrade tier, Double Up and NEW ENGINE follows the lifts the rule counts (an approved Spine entry on the seven main patterns${fU.q ? ', tagged ' + fU.q.join(' or ') : ''}${fU.x ? ', not one of the ' + fU.x.length + ' excluded' : ''}), tier by tier and day by day, independently of the function (${Object.keys(gby).length} athletes with a lift gain, ${upHolders.length} with a tier)`
       : `without stage73, every The Upgrade tier, Double Up and NEW ENGINE follows ALL lifts (the "before" the fix; ${upHolders.length} athletes with a tier)`, upBad.slice(0, 10).join('\n'), 'L1');
    const real = id => !/^zz_/.test(id);
    const payOf = async (where, params) => Number(await val(db, `select coalesce(sum(case when not a.pays then 0 else coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, $1::jsonb), a.xp) end), 0)
                                                           from public.career_awards a left join public.career_catalogue c on c.kind = a.kind and c.id = a.item
                                                          where a.day <= $2::date and ${where}`, [JSON.stringify(hr), S, ...(params || [])]));
    const upXp = await payOf(`a.item = 'the_upgrade' and a.athlete_id not like 'zz\\_%'`), upXpAll = await payOf(`a.item = 'the_upgrade'`);
    const duXp = await payOf(`a.item = 'double_up' and a.athlete_id not like 'zz\\_%'`), neXp = await payOf(`a.item = 'new_engine' and a.athlete_id not like 'zz\\_%'`);
    const upN = awRows.filter(a => real(a.id) && /^badge:the_upgrade:/.test(a.award_id)).length;
    info(`THE UPGRADE at the switch (${S73 ? 'WITH' : 'WITHOUT'} stage73), real athletes: ${upN} tier awards to ${upHolders.filter(real).length} athletes, ${upXp} XP of back-pay (all ${upXpAll} with the made-up athletes)`);
    info(`DOUBLE UP (${S73 ? 'with' : 'without'} stage73), real athletes: ${duHolders.filter(real).join(', ') || 'nobody'} (${duXp} XP); NEW ENGINE: ${neHolders.filter(real).join(', ') || 'nobody'} (${neXp} XP)`);
    const ceXp = await payOf(`a.item = 'century' and a.athlete_id not like 'zz\\_%'`);
    const realBack = lines.filter(l => real(l.athlete_id)).reduce((s, l) => s + Number(l.back_pay), 0);
    info(`BACK-PAY of the real athletes at the switch (${S73 ? 'WITH' : 'WITHOUT'} stage73): The Upgrade ${upXp}, Double Up ${duXp}, NEW ENGINE ${neXp}, Century ${ceXp}, every entry together ${realBack} XP; The Upgrade's holders ${upHolders.filter(real).join(', ') || 'nobody'}`);
    info(`real athletes whose lift gains on a lift the rule leaves out (off the patterns, unplaced, not tagged strength, or excluded) would have moved The Upgrade or Double Up before the fix: ${accessoryOnly.filter(x => real(x.id)).map(x => `${x.id} [${x.lifts.join(', ')}]`).join('; ') || 'nobody'}`);
    // D18 as amended: the seven patterns hold accessory exercises too (a face pull, a back extension, a glute bridge); the strength tag and the exclude list
    // leave them out. Every approved entry on the seven, the ones the rule leaves out, the ones a real athlete has a gain on, and the lift behind each real
    // The Upgrade tier and Double Up, with its pattern and qualities.
    const spineAll = await q(db, `select e.id, e.name, e.pattern, e.qualities, e.aliases from public.exercises e where e.status = 'approved' order by e.pattern, e.name`);
    const backupIds = new Set((T.exercises || []).map(e => e.id));        // the real Spine only: the made-up entries of section 0 are left out of the lists
    const spineMain = spineAll.filter(e => MAIN7.includes(e.pattern) && backupIds.has(e.id));
    const nmOf = Object.fromEntries((await q(db, `select x as n, public.career_norm(x) as k from unnest($1::text[]) x`,
                                             [[...new Set(spineAll.flatMap(e => [e.name, ...(e.aliases || [])]).concat(gains.map(g => g.lift)).filter(Boolean))]])).map(r => [r.n, r.k]));
    const entryOf = {}; for (const e of spineAll) for (const n of [e.name, ...(e.aliases || [])]) if (!entryOf[nmOf[n]]) entryOf[nmOf[n]] = e;
    const strong = e => (e.qualities || []).includes('strength');
    const ruleOk = e => !!e && MAIN7.includes(e.pattern) && (!fU.q || (e.qualities || []).some(x => fU.q.includes(x))) && (!fU.x || !fU.x.includes(e.id));
    const tierLift = [];
    for (const id of [...new Set(upHolders.concat(duHolders))].filter(real)) {
      const rows = useRows(id), mineAw = aby[id] || {};
      const push = (award, at) => { const g = rows.find(x => x.pct >= at), e = g && entryOf[nmOf[g.lift]], ev = (evOf[id] || {})[award.replace(/^the_upgrade:/, 'badge:the_upgrade:').replace(/^double_up$/, 'achievement:double_up')];
        tierLift.push({ id, award, at, lift: g ? g.lift : null, pct: g ? Number(g.pct) : null, day: g ? g.d : null, entry: e ? e.name : null, entryId: e ? e.id : null, pattern: e ? e.pattern : null, qualities: e ? e.qualities : [],
                        evLift: ev ? ev.lift : null, evN: ev ? Number(ev.n) : null, via: ev ? ev.via : null }); };
      upAt.forEach((at, i) => { if (mineAw[`badge:the_upgrade:${i + 1}`]) push(`the_upgrade:${i + 1}`, at); });
      if (mineAw['achievement:double_up']) push('double_up', dblAt);
    }
    if (S73) ok(tierLift.length > 0 && tierLift.every(t => ruleOk(entryOf[nmOf[t.lift]])), `the lift behind every real The Upgrade tier and Double Up is an approved Spine entry on one of the seven patterns${fU.q ? ', tagged ' + fU.q.join(' or ') : ''}${fU.x ? ', not excluded' : ''} (${tierLift.length} awards)`,
                JSON.stringify(tierLift.filter(t => !ruleOk(entryOf[nmOf[t.lift]]))), 'L1');
    // the award's own evidence names the same lift the gains name, and its `via` is the catalogue's key (career_maxpct_key() of the entry)
    if (S73) {
      const viaWant = { the_upgrade: await val(db, `select public.career_maxpct_key($1::jsonb)`, [JSON.stringify(cbody('badge', 'the_upgrade'))]),
                        double_up: await val(db, `select public.career_maxpct_key($1::jsonb)`, [JSON.stringify(cbody('achievement', 'double_up'))]) };
      const evBad = tierLift.filter(t => t.evLift !== t.lift || t.via !== viaWant[t.award.split(':')[0]]);
      ok(evBad.length === 0, `and each one's evidence names that lift, with the catalogue's key as its via (${viaWant.the_upgrade})`, JSON.stringify(evBad.slice(0, 5)), 'S');
    }
    const byLift = {}; for (const t of tierLift) { const k = `${t.id}|${t.lift}`; (byLift[k] = byLift[k] || { ...t, awards: [] }).awards.push(t.award.replace('the_upgrade:', 'tier ').replace('double_up', 'Double Up')); }
    info(`the lifts behind the real The Upgrade tiers and Double Up ${S73 ? 'WITH' : 'WITHOUT'} stage73: ` + (Object.values(byLift).map(t => `${t.id}: ${t.lift} (${t.pattern || 'not placed'}${t.qualities.length ? '; ' + t.qualities.join(', ') : ''}) ${t.awards.join(', ')}`).join('; ') || 'nobody'));
    const gainEntries = {};
    for (const g of gains) {
      const e = real(g.id) && g.is_main && entryOf[nmOf[g.lift]];
      if (!e) continue;
      const r = gainEntries[e.name] = gainEntries[e.name] || { entry: e.name, id: e.id, pattern: e.pattern, qualities: e.qualities || [], strength: strong(e), excluded: !!(fU.x && fU.x.includes(e.id)), counts: ruleOk(e), athletes: [], best: 0 };
      if (!r.athletes.includes(g.id)) r.athletes.push(g.id);
      r.best = Math.max(r.best, Number(g.pct));
    }
    const ge = Object.values(gainEntries).sort((a, b) => MAIN7.indexOf(a.pattern) - MAIN7.indexOf(b.pattern) || (a.entry < b.entry ? -1 : 1));
    const why = e => (fU.x && fU.x.includes(e.id) ? 'excluded' : '') + (fU.q && !(e.qualities || []).some(x => fU.q.includes(x)) ? ((fU.x && fU.x.includes(e.id)) ? ', ' : '') + 'no ' + fU.q.join('/') + ' tag' : '');
    const leftOut = spineMain.filter(e => !ruleOk(e));
    info(`approved entries of the real Spine on the seven patterns: ${spineMain.length} (${MAIN7.map(p => `${p} ${spineMain.filter(e => e.pattern === p).length}`).join(', ')}), ${spineMain.filter(e => !strong(e)).length} of them without the strength quality`);
    info(`the rule (D18 as amended) leaves out ${leftOut.length} of them: ` + leftOut.map(e => `${e.name} (${e.pattern}; ${(e.qualities || []).join(', ') || 'no qualities'}; ${why(e)})`).join('; '));
    info(`of those on the seven, the ${ge.length} a real athlete has a lift gain on (one the rule leaves out marked *): ` + ge.map(r => `${r.counts ? '' : '*'}${r.entry} (${r.pattern}; ${r.qualities.join(', ')}${r.counts ? '' : '; ' + why(r)}) ${r.athletes.length} athlete${r.athletes.length > 1 ? 's' : ''}, best ${r.best}%`).join('; '));
    // the made-up athletes, by name
    const mine = id => Object.keys(aby[id] || {}).filter(k => /the_upgrade|double_up|new_engine/.test(k)).sort();
    const upCount = id => mine(id).filter(k => k.startsWith('badge:the_upgrade')).length;
    if (S73) {
      ok(upCount('zz_ml_main') === 5 && mine('zz_ml_main').includes('achievement:double_up') && mine('zz_ml_main').includes('title:new_engine'), 'zz_ml_main (a squat 150% up): all five tiers of The Upgrade, Double Up and NEW ENGINE', mine('zz_ml_main').join(), 'L1');
      for (const id of ['zz_ml_acc', 'zz_ml_none', 'zz_ml_draft']) ok(mine(id).length === 0, `${id} (${{ zz_ml_acc: 'accessories only, 150% and 150%', zz_ml_none: 'a lift the Spine cannot place, 150%', zz_ml_draft: 'a squat that is only a Spine draft, 150%' }[id]}): no tier of The Upgrade, no Double Up, no NEW ENGINE`, mine(id).join(), 'L1');
      ok(upCount('zz_ml_alias') === 5 && mine('zz_ml_alias').includes('achievement:double_up'), 'zz_ml_alias (a main lift logged by its alias): placed, all five tiers and Double Up', mine('zz_ml_alias').join(), 'L1');
      ok(upCount('zz_ml_mix') === 3 && !mine('zz_ml_mix').includes('achievement:double_up') && !mine('zz_ml_mix').includes('title:new_engine'),
         `zz_ml_mix (a squat 45% up, an accessory 150% up): The Upgrade tiers 1 to 3 from the squat, no Double Up, no NEW ENGINE (${mine('zz_ml_mix').join()})`, undefined, 'L1');
      // D18 as amended, on the go-day with the switch on
      ok(mine('zz_ml_bext').length === 0, `zz_ml_bext (45° Back Extension 150% up: hinge and tagged strength, but one of Amir's four): no tier of The Upgrade, no Double Up, no NEW ENGINE`, mine('zz_ml_bext').join(), 'S');
      ok(mine('zz_ml_cchest').length === 0, `zz_ml_cchest (Cable Chest Press 150% up: push-horizontal, tagged muscle only): no tier of The Upgrade, no Double Up, no NEW ENGINE`, mine('zz_ml_cchest').join(), 'S');
      ok(upCount('zz_ml_bbs') === 5 && mine('zz_ml_bbs').includes('achievement:double_up') && mine('zz_ml_bbs').includes('title:new_engine'),
         `zz_ml_bbs (Barbell Back Squat 150% up: squat, strength): all five tiers of The Upgrade, Double Up and NEW ENGINE (${mine('zz_ml_bbs').join()})`, undefined, 'S');
      const mix2 = mine('zz_ml_mix2'), ev2 = evOf.zz_ml_mix2 || {};
      ok(JSON.stringify(mix2) === JSON.stringify(['badge:the_upgrade:1', 'badge:the_upgrade:2']) && ['badge:the_upgrade:1', 'badge:the_upgrade:2'].every(k => ev2[k] && ev2[k].lift === 'Barbell Back Squat'),
         `zz_ml_mix2 (the excluded 45° Back Extension 150% up, Barbell Back Squat 25% up): The Upgrade tiers 1 and 2 only, no Double Up, no NEW ENGINE, and both tiers' evidence is the squat (${mix2.join()}; evidence ${['badge:the_upgrade:1', 'badge:the_upgrade:2'].map(k => ev2[k] ? `${ev2[k].lift} ${ev2[k].n}%` : 'none').join(', ')})`,
         JSON.stringify(ev2), 'S');
      // the weight units (section 2b) on the go-day: a main lift in pounds earns what one in kilograms would, and its evidence is the pound series;
      // the excluded lifts in plates earn nothing; a main lift in plates earns its tiers
      const refsOf = async (id, re) => (await q(db, `select a.award_id, a.evidence -> 'facts' -> 0 ->> 'ref' as ref from public.career_awards a where a.athlete_id = $1 order by 1`, [id]))
        .filter(r => re.test(r.award_id));
      const lbRefs = await refsOf('zz_ml_lb', /^(badge:the_upgrade:|achievement:double_up$)/);
      ok(upCount('zz_ml_lb') === 5 && mine('zz_ml_lb').includes('achievement:double_up') && mine('zz_ml_lb').includes('title:new_engine') && lbRefs.length === 6 && lbRefs.every(r => r.ref === 'barbell back squat|lb'),
         `zz_ml_lb (Barbell Back Squat 100 to 250 lb, +150%): all five tiers of The Upgrade, Double Up and NEW ENGINE, every one's evidence the series barbell back squat|lb (${mine('zz_ml_lb').join()})`,
         JSON.stringify(lbRefs), 'S');
      ok(mine('zz_ml_plates').length === 0, `zz_ml_plates (45° Back Extension and Machine Reverse Fly in plates, +150% each, two of Amir's four): no tier of The Upgrade, no Double Up, no NEW ENGINE`, mine('zz_ml_plates').join(), 'S');
      const pmRefs = await refsOf('zz_ml_plmain', /^badge:the_upgrade:/);
      ok(JSON.stringify(mine('zz_ml_plmain')) === JSON.stringify(['badge:the_upgrade:1', 'badge:the_upgrade:2', 'badge:the_upgrade:3', 'badge:the_upgrade:4']) && pmRefs.every(r => r.ref === 'machine leg press|plates'),
         `zz_ml_plmain (Machine Leg Press 8 to 13 plates, +62.5%): The Upgrade tiers 1 to 4 on the plates series, no Double Up (${mine('zz_ml_plmain').join()})`, JSON.stringify(pmRefs), 'S');
    } else {
      info(`before the fix: zz_ml_acc has ${mine('zz_ml_acc').length} of the 7 awards, zz_ml_none ${mine('zz_ml_none').length}, zz_ml_draft ${mine('zz_ml_draft').length}, zz_ml_mix ${mine('zz_ml_mix').length}`);
      info(`before the fix, the weight units: zz_ml_lb has ${mine('zz_ml_lb').join() || 'nothing'}; zz_ml_plates (excluded lifts in plates) ${mine('zz_ml_plates').join() || 'nothing'}; zz_ml_plmain ${mine('zz_ml_plmain').join() || 'nothing'}`);
      ok(['zz_ml_acc', 'zz_ml_none', 'zz_ml_draft', 'zz_ml_mix'].every(id => mine(id).includes('achievement:double_up')), 'before the fix an accessory, an unplaced lift and a draft each earned Double Up (what the fix removes)', undefined, 'L1');
    }
    // the counts over session facts count the PAID sessions: Century, and every total badge whose counts include a capped kind
    const capped = Object.keys(rules3.fact).filter(k => rules3.fact[k].limit_per);
    info(`the rulebook caps (limit_per): ${capped.map(k => `${k} ${rules3.fact[k].limit_per}`).join(', ')}`);
    const totals = cat3.filter(c => c.kind === 'badge' && c.body.kind === 'total' && [].concat(c.body.counts).some(k => capped.includes(k)));
    ok(totals.some(c => c.id === 'century'), `the total badges that count a capped kind: ${totals.map(c => c.id).join(', ')} (Century among them)`, undefined, 'L2');
    // career_facts_paid() ranks a finished and an early session of one plan day in one week together (their cap is shared, plan_day_week) and pays the
    // higher XP. A count that names only part of that shared cap holds as sessions are added only while every kind it counts out-earns, at a fixed XP,
    // every kind of the cap it leaves out; otherwise a later session of a left-out kind can take one away. Every catalogue entry with `counts` (badges, missions)
    const shared = capped.filter(k => rules3.fact[k].limit_per === 'plan_day_week');
    const fixedXp = k => (rules3.fact[k].xp_from === undefined && Number.isFinite(Number(rules3.fact[k].xp)) ? Number(rules3.fact[k].xp) : null);
    const partial = [], unsafe = [];
    for (const c of cat3) {
      const ks = c.body && c.body.counts !== undefined ? [].concat(c.body.counts) : [];
      const inCap = ks.filter(k => shared.includes(k)), left = shared.filter(k => !ks.includes(k));
      if (!inCap.length || !left.length) continue;
      partial.push(`${c.kind} ${c.id} (${ks.join(', ')})`);
      const lo = Math.min(...inCap.map(k => fixedXp(k) === null ? -Infinity : fixedXp(k))), hi = Math.max(...left.map(k => fixedXp(k) === null ? Infinity : fixedXp(k)));
      if (!(lo > hi)) unsafe.push(`${c.kind} ${c.id} counts ${inCap.join(', ')} (XP ${inCap.map(fixedXp).join('/')}) and leaves out ${left.join(', ')} (XP ${left.map(fixedXp).join('/')})`);
    }
    ok(shared.length > 1 && unsafe.length === 0, `every count over part of the shared session cap (${shared.map(k => `${k} ${fixedXp(k)} XP`).join(', ')}) holds as sessions are added: ${partial.join('; ') || 'no entry counts part of it'}`,
       unsafe.join('\n'), 'L2');
    const cntBad = [], moved = [];
    for (const id of allIds) {
      for (const c of totals) {
        const kinds = [].concat(c.body.counts);
        const rows = [];
        for (const k of kinds) {
          const useP = S73 && capped.includes(k);
          const rs = useP ? await q(db, `select day::text as d, ref, kind from public.career_facts_paid($1) where kind = $2`, [id, k])
                          : await q(db, `select day::text as d, ref, kind from public.career_facts where athlete_id = $1 and kind = $2 and void_at is null`, [id, k]);
          rows.push(...rs);
        }
        rows.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));
        const raw = Number(await val(db, `select count(*)::int from public.career_facts where athlete_id = $1 and kind = any($2::text[]) and void_at is null`, [id, kinds]));
        if (rows.length !== raw) moved.push(`${id} ${c.id}: ${raw} → ${rows.length}`);
        c.body.tiers.forEach((tr, i) => {
          const want = rows.length >= tr.at ? rows[tr.at - 1].d : null, got = (aby[id] || {})[`badge:${c.id}:${i + 1}`];
          if (!!want !== !!got) cntBad.push(`${id}: ${c.id} tier ${i + 1} (${tr.at}): ${got ? 'awarded ' + got.d : 'not awarded'}, ${rows.length} ${S73 ? 'paid' : 'counted'} (${raw} raw)`);
          else if (want && got.d !== want) cntBad.push(`${id}: ${c.id} tier ${i + 1} dated ${got.d}, the ${tr.at}th is on ${want}`);
        });
      }
    }
    ok(cntBad.length === 0, S73 ? `Century (and every total over a capped kind) counts the paid sessions: every tier is awarded exactly when the PAID count reaches it, dated the day of its nth paid session (${allIds.length} athletes, ${totals.length} badges)`
                                : `without stage73 Century and the capped totals count every session fact (${allIds.length} athletes)`, cntBad.slice(0, 10).join('\n'), 'L1');
    info(`${moved.length} athlete-badge counts differ between the raw facts and the paid ones: ${moved.slice(0, 12).join('; ')}${moved.length > 12 ? '; …' : ''}`);
    const repCentury = (aby.zz_rep || {})['badge:century:1'];
    ok(S73 ? !repCentury : !!repCentury, S73 ? `zz_rep (48 sessions done, 24 paid; Century starts at 25) has no Century tier: repeating a plan day moves nothing` : `before the fix zz_rep (48 sessions done, 24 paid) held Century tier 1`, repCentury && repCentury.d, 'L1');
    const repLad = (await profile(db, 'zz_rep')).ladder;
    info(`zz_rep's Century on its ladder: ${JSON.stringify(repLad && repLad.century)}`);
    if (S73 && repLad && repLad.century) ok(Number(repLad.century.have) === 24, `and its ladder says 24 sessions with Amir, the paid ones (${repLad.century.have})`, JSON.stringify(repLad.century), 'L1');
    // the awards of the run, to a file, and against another run's
    const dump = {}; for (const a of awRows) (dump[a.id] = dump[a.id] || {})[a.award_id] = [a.d, a.pays, a.xp];
    // the lift behind each The Upgrade tier and Double Up (and so NEW ENGINE), from the award's evidence, under a key no athlete id can take
    const liftsNow = {};
    for (const r of evRows) { const s = r.lift ? `${r.lift} ${Number(r.n)}%` : '?'; (liftsNow[r.id] = liftsNow[r.id] || {})[r.award_id] = s; if (r.award_id === 'achievement:double_up') liftsNow[r.id]['title:new_engine'] = s; }
    if (DUMP_AWARDS) { fs.writeFileSync(DUMP_AWARDS, JSON.stringify({ ...dump, '~lifts': liftsNow })); info(`awards written to ${DUMP_AWARDS} (${awRows.length}, with the lift behind each The Upgrade tier and Double Up)`); }
    if (VS_AWARDS && S73) {
      const wasAll = JSON.parse(fs.readFileSync(VS_AWARDS, 'utf8')), wasLifts = wasAll['~lifts'] || {}, diffAw = [];
      const was = Object.fromEntries(Object.entries(wasAll).filter(([k]) => !k.startsWith('~')));
      // an athlete the file does not hold was made up after it was written: listed, not compared (a real athlete missing from it is a failure)
      const fresh = Object.keys(dump).filter(id => !(id in was)).sort();
      ok(fresh.every(id => !real(id)), `the --vs-awards file holds every athlete with an award in this run but ${fresh.length} made-up ones (${fresh.join(', ') || 'none'}), which are listed and not compared`, fresh.filter(real).join(', '), 'S');
      for (const id of new Set([...Object.keys(was), ...Object.keys(dump).filter(id => id in was)])) for (const k of new Set([...Object.keys(was[id] || {}), ...Object.keys(dump[id] || {})])) {
        const x = (was[id] || {})[k], y = (dump[id] || {})[k];
        if (JSON.stringify(x) !== JSON.stringify(y)) diffAw.push({ id, k, x, y });
      }
      const allowed = /^(badge:the_upgrade:|achievement:double_up$|title:new_engine$|badge:century:|title:century$)/;
      const stray = diffAw.filter(d => !allowed.test(d.k));
      const kinds = {}; for (const d of diffAw) { const key = d.k.replace(/:\d+$/, ''); kinds[key] = (kinds[key] || 0) + 1; }
      info(`against the --vs-awards run (${path.basename(VS_AWARDS)}), ${diffAw.length} awards differ: ${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`);
      ok(stray.length === 0 && diffAw.every(d => d.x !== undefined), 'EVERYTHING ELSE AS BEFORE: against the --vs-awards run the only awards that differ are The Upgrade, Double Up, NEW ENGINE and Century (and its title), and none is added: one is withheld, or a Century tier is dated later (its nth PAID session), or a The Upgrade tier is dated later (its nth gain on a lift the rule counts)',
         stray.slice(0, 8).map(d => `${d.id} ${d.k}: ${JSON.stringify(d.x)} → ${JSON.stringify(d.y)}`).join('\n') || diffAw.filter(d => d.x === undefined).slice(0, 6).map(d => `${d.id} ${d.k}: ${JSON.stringify(d.x)} → ${JSON.stringify(d.y)}`).join('\n'), 'L1');
      const lost = {}; for (const d of diffAw) if (real(d.id) && d.y === undefined) (lost[d.k.replace(/:\d+$/, '')] = lost[d.k.replace(/:\d+$/, '')] || []).push(d.id);
      info(`withheld from real athletes against that run (an award that is not there any more): ` + (Object.entries(lost).map(([k, ids]) => `${k} × ${ids.length} (${[...new Set(ids)].join(', ')})`).join('; ') || 'nothing'));
      // every The Upgrade tier, Double Up and NEW ENGINE of a real athlete that changed, with the lift behind it then and now
      const liftDiff = diffAw.filter(d => real(d.id) && /^(badge:the_upgrade:|achievement:double_up$|title:new_engine$)/.test(d.k)).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.k < b.k ? -1 : 1));
      const side = (v, lift) => (v ? `${v[0]}${v[1] ? ' ' + v[2] + ' XP' : ' (pays 0)'}, ${lift || 'lift not in the file'}` : 'none');
      info(`real athletes' The Upgrade / Double Up / NEW ENGINE awards that changed against that run (${liftDiff.length}): ` + (liftDiff.map(d => `${d.id} ${d.k.replace('badge:the_upgrade:', 'The Upgrade tier ').replace('achievement:double_up', 'Double Up').replace('title:new_engine', 'NEW ENGINE')}: ${side(d.x, (wasLifts[d.id] || {})[d.k])} -> ${d.y ? side(d.y, (liftsNow[d.id] || {})[d.k]) : 'withheld'}`).join('; ') || 'none'));
      // and the ones that kept their day and XP but rest on another lift now (the file's evidence against this run's)
      const reCredited = [];
      for (const id of Object.keys(liftsNow).filter(id => real(id) && id in was)) for (const k of Object.keys(liftsNow[id]).sort()) {
        const w = (wasLifts[id] || {})[k];
        if (w && w !== liftsNow[id][k] && JSON.stringify((was[id] || {})[k]) === JSON.stringify((dump[id] || {})[k])) reCredited.push({ id, k, was: w, now: liftsNow[id][k] });
      }
      info(`real athletes' awards that kept their day and XP but rest on another lift now (${reCredited.length}): ` + (reCredited.map(r => `${r.id} ${r.k.replace('badge:the_upgrade:', 'The Upgrade tier ').replace('achievement:double_up', 'Double Up').replace('title:new_engine', 'NEW ENGINE')}: ${r.was} -> ${r.now}`).join('; ') || 'none'));
      if (REPORT) fs.writeFileSync(REPORT.replace(/(\.[a-z]+)?$/, '-vs.json'), JSON.stringify({ vs: VS_AWARDS, fresh, kinds, changed: diffAw.map(d => ({ ...d, liftWas: (wasLifts[d.id] || {})[d.k] || null, liftNow: (liftsNow[d.id] || {})[d.k] || null })), reCredited }, null, 1));
    }
    if (REPORT) fs.writeFileSync(REPORT.replace(/(\.[a-z]+)?$/, '-mainlifts.json'), JSON.stringify({ stage73: S73, upgrade: { realAwards: upN, realHolders: upHolders.filter(real), xpRealBackPay: upXp, xpAllBackPay: upXpAll },
      double_up: duHolders.filter(real), double_up_xp: duXp, new_engine: neHolders.filter(real), new_engine_xp: neXp, century_xp: ceXp, real_back_pay: realBack, accessory_only: accessoryOnly.filter(x => real(x.id)),
      rule: { patterns: cbody('badge', 'the_upgrade').patterns, qualities: fU.q, exclude: fU.x }, exclude_ids: exIds, left_out: leftOut.map(e => ({ id: e.id, name: e.name, pattern: e.pattern, qualities: e.qualities || [], why: why(e) })),
      // D18 for the apply ask: the lift behind each real tier, the entries on the seven patterns with a real gain, and every entry on the seven
      tier_lifts: tierLift, main_entries_with_real_gains: ge,
      main_entries: spineMain.map(e => ({ name: e.name, pattern: e.pattern, qualities: e.qualities || [], strength: strong(e) })) }, null, 1));
    // numbers.four's commitment, the Home row's "N sessions" (D19, 2026-10-18): a coached athlete's counts the sessions Century counts, so the row never
    // says 50 beside "Century 46 of 100"; a free athlete's perfect days do not move; get_profile()'s older numbers.sessions_with_amir stays every session
    // fact. Through the real door, get_profile(), for every athlete, real and made up.
    const CK = 'count:session_finished,session_finished_early';
    const comBad = [], comMoved = [];
    let nCoached = 0, nFree = 0;
    for (const id of allIds) {
      const p = await profile(db, id), nums = p.numbers || {}, com = nums.four && nums.four.commitment;
      const rawN = Number(await val(db, `select count(*)::int from public.career_facts where athlete_id = $1 and kind in ('session_finished', 'session_finished_early') and void_at is null`, [id]));
      if (Number(nums.sessions_with_amir) !== rawN) comBad.push(`${id}: get_profile's numbers.sessions_with_amir is ${nums.sessions_with_amir}, every session fact ${rawN}`);
      if (nums.free) {
        nFree++;
        const pd = Number(await val(db, `select count(*)::int from public.career_facts where athlete_id = $1 and kind = 'perfect_day' and void_at is null`, [id]));
        if (!com || com.key !== 'perfect_days' || Number(com.value) !== pd) comBad.push(`${id} (free): commitment ${JSON.stringify(com)}, perfect days ${pd}`);
        continue;
      }
      nCoached++;
      const paid = Number(await val(db, `select count(*)::int from public.career_facts_paid($1) where kind in ('session_finished', 'session_finished_early')`, [id]));
      const meas = Number(await val(db, `select public.career_measures($1, '{}'::jsonb, array[$2]::text[]) -> $2 ->> 'have'`, [id, CK]));
      const lad = Number((p.ladder && p.ladder.century && p.ladder.century.have) || 0), want = S73 ? paid : rawN;
      if (!com || com.key !== 'sessions_with_amir' || Number(com.value) !== want || meas !== want || lad !== want)
        comBad.push(`${id}: commitment ${com && com.value}, ${S73 ? 'the paid sessions' : 'every session fact'} ${want}; career_measures ${meas}; Century's ladder ${lad} (facts ${rawN}, paid ${paid})`);
      if (paid !== rawN) comMoved.push({ id, raw: rawN, paid, value: Number(com && com.value) });
    }
    ok(comBad.length === 0, S73
       ? `numbers.four's commitment of every coached athlete is the sessions Century counts: the PAID count = career_measures('${CK}') = Century's ladder have (${nCoached} coached); ${nFree} free athletes keep their perfect days; get_profile()'s numbers.sessions_with_amir stays every session fact`
       : `without stage73 numbers.four's commitment counts every session fact, as Century does (${nCoached} coached, ${nFree} free); numbers.sessions_with_amir the same`, comBad.slice(0, 10).join('\n'), 'L1');
    const comReal = comMoved.filter(x => real(x.id));
    info(`the commitment number ${S73 ? 'moves' : 'would move with stage73'} for ${comReal.length} real athletes (${comMoved.length} with the made-up ones), every session fact → the paid ones: ` + (comReal.map(x => `${x.id} ${x.raw} → ${x.paid}`).join(', ') || 'nobody'));
    if (S73) ok(comMoved.length > 0 && comMoved.every(x => x.value === x.paid && x.paid < x.raw), `every athlete whose number moves goes down to the paid count, never up (${comMoved.length}, ${comReal.length} of them real)`, JSON.stringify(comMoved.filter(x => x.value !== x.paid).slice(0, 5)), 'L1');
    if (REPORT) fs.writeFileSync(REPORT.replace(/(\.[a-z]+)?$/, '-commitment.json'), JSON.stringify({ stage73: S73, moved: comMoved }, null, 1));
  }

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
  ok(Array.isArray(owned) && owned.includes('badge:habit_water:1'), 'the profile lists it in owned (a sorted list of award ids, no days)', JSON.stringify(owned), 'L1');
  const shT = shelfAwards(await shelfOf(db, 'zz_tier'));
  ok(shT['badge:habit_water:1'] === today, `and the shelf read has its day (${shT['badge:habit_water:1']})`, JSON.stringify(shT), 'L1');

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
  const shW = await shelfOf(db, 'zz_wear');
  ok(pW.slam.commitment && pW.slam.grand && shW.titles.some(t => t.id === 'grand_slam') && pW.owned.includes('title:grand_slam') && (await recOf(db, 'zz_wear')).some(r => r.award_id === 'title:grand_slam'),
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

  if (S73) {
    // 4f2. an isolation lift through the real door moves nothing; the Spine placing it on a main pattern later (updated_at moves) mints at the next read; and the way back
    await mkLogin(db, 'zz_acc');
    await insProgram(db, 'zz_acc', prog({ start: addDays(today, -30), end: addDays(today, 40), days: [1, 2] }));
    await doorSession(db, 'zz_acc', 1, addDays(today, -10), sess({ ex: 'Machine Seated Leg Curl', w: 40 }));
    await doorSession(db, 'zz_acc', 2, addDays(today, -1), sess({ ex: 'Machine Seated Leg Curl', w: 90 }));
    const lg4 = await q(db, `select value ->> 'lift' as lift, value ->> 'pct' as pct from public.career_facts where athlete_id = 'zz_acc' and kind = 'lift_gain' and void_at is null`);
    aw = await awardsOf(db, 'zz_acc');
    ok(lg4.length === 1 && Number(lg4[0].pct) >= 100 && !aw.some(a => /the_upgrade|double_up|new_engine/.test(a.award_id)),
       `a Machine Seated Leg Curl ${lg4[0] && lg4[0].pct}% up on its first session, saved through the door: no The Upgrade, no Double Up, no NEW ENGINE`, JSON.stringify({ lg4, aw: aw.map(a => a.award_id) }), 'L1');
    const pZ = await profile(db, 'zz_acc');
    ok(!(pZ.ladder && pZ.ladder.the_upgrade && Number(pZ.ladder.the_upgrade.have) > 0), `and its profile's ladder for The Upgrade says ${JSON.stringify(pZ.ladder && pZ.ladder.the_upgrade && { have: pZ.ladder.the_upgrade.have, next: pZ.ladder.the_upgrade.next })}: nothing yet`, undefined, 'L1');
    // D18 as amended: a main pattern is not enough, the entry must also carry the strength tag (the leg curl is muscle and armour)
    const legQ = (await one(db, `select qualities from public.exercises where id = 'machine-seated-leg-curl'`)).qualities;
    await q(db, `update public.exercises set pattern = 'hinge', updated_at = clock_timestamp() where id = 'machine-seated-leg-curl'`);
    await profile(db, 'zz_acc');
    aw = await awardsOf(db, 'zz_acc');
    ok(!aw.some(a => /the_upgrade|double_up|new_engine/.test(a.award_id)), `the Spine places that lift on a main pattern but it carries no strength tag (${legQ.join(', ')}): the next get_profile still mints nothing (D18 as amended)`, JSON.stringify(aw.map(a => a.award_id)), 'S');
    await q(db, `update public.exercises set qualities = array_append(qualities, 'strength'), updated_at = clock_timestamp() where id = 'machine-seated-leg-curl'`);
    await profile(db, 'zz_acc');
    aw = await awardsOf(db, 'zz_acc');
    const upZ = aw.filter(a => a.item === 'the_upgrade').length;
    ok(upZ === 5 && aw.some(a => a.award_id === 'achievement:double_up') && aw.some(a => a.award_id === 'title:new_engine'),
       `and once the Spine tags it strength as well (its updated_at moves): the next get_profile mints The Upgrade (${upZ} tiers), Double Up and NEW ENGINE (the rewards stamp includes the Spine)`, JSON.stringify(aw.map(a => a.award_id)), 'L1');
    await q(db, `update public.exercises set pattern = 'isolation', qualities = $1::text[], updated_at = clock_timestamp() where id = 'machine-seated-leg-curl'`, [legQ]);
    await profile(db, 'zz_acc');
    ok((await awardsOf(db, 'zz_acc')).filter(a => /the_upgrade|double_up|new_engine/.test(a.award_id)).length === upZ + 2, 'and placing it back on isolation, untagged, takes no award back (GAME-1)', undefined, 'L1');

    // 4f3. the exclude list fails closed through the real door, in a transaction that is undone: 45° Back Extension's entry is RE-KEYED (its row moved to
    // back-extension-45-v2, approved, the old id gone), so the catalogue's exclude list names an id with no row. A session with the back extension 150% up
    // and Barbell Back Squat 25% up mints nothing at all, where the list excluding nothing would have minted five tiers, Double Up and NEW ENGINE on the back
    // extension (the copy under its new id is approved, hinge and tagged strength). Put right (the id moved back, which moves the Spine's updated_at and so
    // the rewards stamp), the next get_profile mints what was held back: The Upgrade tiers 1 and 2, on the squat, dated the day they were earned.
    const M7f = ['squat', 'hinge', 'single-leg', 'push-horizontal', 'push-vertical', 'pull-horizontal', 'pull-vertical'];
    const X4f = ['back-extension-45', 'cable-face-pull', 'machine-reverse-fly', 'cable-straight-arm-pulldown'];
    const kRuleF = await val(db, `select public.career_maxpct_key($1::jsonb)`, [JSON.stringify({ patterns: M7f, qualities: ['strength'], exclude: X4f })]);
    const kNoXF = await val(db, `select public.career_maxpct_key($1::jsonb)`, [JSON.stringify({ patterns: M7f, qualities: ['strength'] })]);
    const catKeyF = await val(db, `select public.career_maxpct_key(c.body) from public.career_catalogue c where c.kind = 'badge' and c.id = 'the_upgrade' order by c.version desc limit 1`);
    const haveF = async (id, key) => Number(await val(db, `select public.career_measures($2, '{}'::jsonb, array[$1]::text[]) -> $1 ->> 'have'`, [key, id]));
    const twoLifts = (sq, be) => ({ ...sess({ ex: 'Barbell Back Squat', w: sq }), log: [...sess({ ex: 'Barbell Back Squat', w: sq }).log, ...sess({ ex: '45° Back Extension', w: be }).log] });
    const ML = /the_upgrade|double_up|new_engine/;
    const mlAwards = async id => (await awardsOf(db, id)).filter(a => ML.test(a.award_id)).map(a => `${a.award_id}@${a.day}`);
    const mlLifts = async id => q(db, `select a.award_id, a.evidence ->> 'via' as via, (select f.value ->> 'lift' from public.career_facts f where f.athlete_id = a.athlete_id and f.kind = 'lift_gain'
                                          and f.ref = a.evidence -> 'facts' -> 0 ->> 'ref' order by f.void_at nulls first limit 1) as lift
                                         from public.career_awards a where a.athlete_id = $1 and a.item = 'the_upgrade' order by 1`, [id]);
    const twoTiers = [`badge:the_upgrade:1@${addDays(today, -1)}`, `badge:the_upgrade:2@${addDays(today, -1)}`];
    let xf = null;
    await db.exec('begin');
    try {
      // the copy keeps the row's updated_at, so the re-key itself does not move the stamp; moving the id back does (touch_updated_at)
      await q(db, `insert into public.exercises select (jsonb_populate_record(null::public.exercises, to_jsonb(e) || jsonb_build_object('id', 'back-extension-45-v2'))).*
                    from public.exercises e where e.id = 'back-extension-45'`);
      await q(db, `delete from public.exercises where id = 'back-extension-45'`);
      await mkLogin(db, 'zz_xfail');
      await insProgram(db, 'zz_xfail', prog({ start: addDays(today, -30), end: addDays(today, 40), days: [1, 2] }));
      await doorSession(db, 'zz_xfail', 1, addDays(today, -10), twoLifts(40, 10));
      await doorSession(db, 'zz_xfail', 2, addDays(today, -1), twoLifts(50, 25));
      await profile(db, 'zz_xfail');
      xf = { broken: { awards: await mlAwards('zz_xfail'), rule: await haveF('zz_xfail', kRuleF), noX: await haveF('zz_xfail', kNoXF) } };
      await q(db, `update public.exercises set id = 'back-extension-45' where id = 'back-extension-45-v2'`);
      await profile(db, 'zz_xfail');
      const evF = await mlLifts('zz_xfail');
      xf.fixed = { awards: await mlAwards('zz_xfail'), lifts: evF.map(r => r.lift), vias: [...new Set(evF.map(r => r.via))], rule: await haveF('zz_xfail', kRuleF) };
    } finally { await db.exec('rollback'); }
    ok(xf && xf.broken.awards.length === 0 && xf.broken.rule === 0 && xf.broken.noX >= 100,
       `45° Back Extension's entry re-keyed (its row under a new id, the listed id gone): a session with it 150% up and Barbell Back Squat 25% up, saved through the door, mints no tier of The Upgrade, no Double Up and no NEW ENGINE (the rule reads ${xf && xf.broken.rule}%; without the exclude list it would read ${xf && xf.broken.noX}%)`,
       JSON.stringify(xf), 'S');
    ok(xf && xf.fixed && JSON.stringify(xf.fixed.awards) === JSON.stringify(twoTiers)
       && xf.fixed.lifts.every(l => l === 'Barbell Back Squat') && JSON.stringify(xf.fixed.vias) === JSON.stringify([catKeyF]) && catKeyF === kRuleF && xf.fixed.rule > 0 && xf.fixed.rule < 30,
       `and put right (the id moved back), the next get_profile mints what was held back: The Upgrade tiers 1 and 2 on the squat (${xf && xf.fixed && xf.fixed.rule}%), dated the day they were earned (the session's, ${addDays(today, -1)}), with the catalogue's key as their via`,
       JSON.stringify(xf && xf.fixed), 'S');
    // 4f4. an entry made a DRAFT is no stop, through the real door (a transaction that is undone): with back-extension-45 a draft, the same two sessions
    // mint The Upgrade tiers 1 and 2 on the squat at once (a draft places no lift, so the back extension counts for nothing); approved again (the stamp
    // moves), the next get_profile mints nothing more: its id is still on the list.
    let xd = null;
    await db.exec('begin');
    try {
      await q(db, `update public.exercises set status = 'draft' where id = 'back-extension-45'`);
      await mkLogin(db, 'zz_xdraft');
      await insProgram(db, 'zz_xdraft', prog({ start: addDays(today, -30), end: addDays(today, 40), days: [1, 2] }));
      await doorSession(db, 'zz_xdraft', 1, addDays(today, -10), twoLifts(40, 10));
      await doorSession(db, 'zz_xdraft', 2, addDays(today, -1), twoLifts(50, 25));
      await profile(db, 'zz_xdraft');
      xd = { drafted: { awards: await mlAwards('zz_xdraft'), lifts: (await mlLifts('zz_xdraft')).map(r => r.lift), rule: await haveF('zz_xdraft', kRuleF) } };
      await q(db, `update public.exercises set status = 'approved' where id = 'back-extension-45'`);
      await profile(db, 'zz_xdraft');
      xd.approved = { awards: await mlAwards('zz_xdraft'), rule: await haveF('zz_xdraft', kRuleF), noX: await haveF('zz_xdraft', kNoXF) };
    } finally { await db.exec('rollback'); }
    ok(xd && JSON.stringify(xd.drafted.awards) === JSON.stringify(twoTiers) && xd.drafted.lifts.every(l => l === 'Barbell Back Squat') && xd.drafted.rule > 0 && xd.drafted.rule < 30
       && JSON.stringify(xd.approved.awards) === JSON.stringify(twoTiers) && xd.approved.rule === xd.drafted.rule && xd.approved.noX >= 100,
       `45° Back Extension made a draft: no stop, the same sessions mint The Upgrade tiers 1 and 2 on the squat at once (${xd && xd.drafted.rule}%), the back extension counting for nothing; approved again, nothing more is minted, its id still on the list (without the list the strength rule would read ${xd && xd.approved.noX}%)`,
       JSON.stringify(xd), 'S');
    ok((await val(db, `select count(*)::int from public.career_awards where athlete_id in ('zz_xfail', 'zz_xdraft')`)) === 0
       && (await val(db, `select count(*)::int from public.exercises where id = 'back-extension-45-v2' or (id = 'back-extension-45' and status <> 'approved')`)) === 0
       && (await val(db, `select count(*)::int from public.exercises where id = 'back-extension-45'`)) === 1,
       'and both transactions were undone (no zz_xfail or zz_xdraft award, the Spine as it was)', undefined, 'S');
  }

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
  ok(pHid.owned.includes('badge:long_count:1') && shelfAwards(await shelfOf(db, 'zz_week'))['badge:long_count:1'] === today, 'and the profile still owns it, and the shelf still has its day', undefined, 'L1');
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
  // the profile's size on the largest careers: the CORE (get_profile) stays inside 14 KB however long the career, and the shelf (get_awards) has every award
  const BUDGET = 14 * 1024;
  const owners = await q(db, `select athlete_id, count(*)::int as n from public.career_awards where athlete_id not like 'zz\_%' group by 1 order by 2 desc limit 3`);
  const sizes = [];
  for (const o of owners.concat([{ athlete_id: 'zz_ev', n: 0 }, { athlete_id: 'zz_week', n: 0 }])) {
    const p = await profile(db, o.athlete_id), sh = await shelfOf(db, o.athlete_id);
    sizes.push({ id: o.athlete_id, awards: await val(db, `select count(*)::int from public.career_awards where athlete_id = $1`, [o.athlete_id]), compact: sizeOf(p), shelf: sizeOf(sh), p, sh,
                 wire: await val(db, `select octet_length(public.get_profile($1)::text)`, [o.athlete_id]),
                 parts: Object.entries(p).map(([k, v]) => [k, JSON.stringify(v).length]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} ${n}`).join(', ') });
  }
  for (const z of sizes) info(`get_profile of ${z.id}: ${z.awards} awards, ${z.compact} bytes compact (${z.wire} as Postgres prints it); largest parts: ${z.parts}; the shelf read: ${z.shelf} bytes`);
  const bigCareer = sizes[0];
  ok(bigCareer.compact <= BUDGET, `the core profile of the largest real career (${bigCareer.id}, ${bigCareer.awards} awards) is ${bigCareer.compact} bytes compact against the 14 KB budget (${BUDGET})`, `${bigCareer.wire} bytes as Postgres prints it; its largest parts: ${bigCareer.parts}`, 'L1');
  ok(sizes.every(z => z.compact <= BUDGET), `and so is every other profile measured (${sizes.map(z => z.compact).join(', ')} bytes)`, undefined, 'L1');
  // the shelf read returns every owned award: each id in `owned` is on the shelf with the day its award row has (a badge tier's day, an achievement's day, a title's presence)
  const shelfBad = [];
  for (const z of sizes) {
    const m = shelfAwards(z.sh), rows = await awardsOf(db, z.id);
    const day = Object.fromEntries(rows.map(r => [r.award_id, r.day]));
    for (const id of z.p.owned) {
      if (!(id in m)) shelfBad.push(`${z.id}: ${id} is owned but not on the shelf`);
      else if (!id.startsWith('title:') && m[id] !== day[id]) shelfBad.push(`${z.id}: ${id} is dated ${m[id]} on the shelf, ${day[id]} in career_awards`);
    }
    const extra = Object.keys(m).filter(id => !z.p.owned.includes(id) && !id.startsWith('title:'));
    if (extra.length) shelfBad.push(`${z.id}: on the shelf but not owned: ${extra.slice(0, 5).join(', ')}`);
    if (JSON.stringify(z.p.owned) !== JSON.stringify(z.p.owned.slice().sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)))) shelfBad.push(`${z.id}: owned is not sorted byte by byte`);
    if (z.p.owned.length !== rows.length) shelfBad.push(`${z.id}: owned has ${z.p.owned.length} ids, career_awards ${rows.length} rows`);
  }
  ok(shelfBad.length === 0, `get_awards() returns every owned award, dated as career_awards has it, and nothing owned is missing (${sizes.map(z => `${z.id} ${z.p.owned.length}`).join(', ')}); owned lists every award row once, sorted`, shelfBad.slice(0, 8).join('\n'), 'L1');
  // a simulated 200-award career: every tier of every badge, then the achievements, then the titles, from the real catalogue, written straight into the table
  await mkLogin(db, 'zz_sim');
  await insProgram(db, 'zz_sim', prog({ start: addDays(today, -10), end: addDays(today, 20) }));
  const simIds = [];
  for (const c of cat3) {
    if (c.kind === 'badge') (c.body.tiers || []).forEach((t, i) => simIds.push({ kind: 'badge', item: c.id, tier: i + 1, size: t.size || 'win', meaning: c.body.meaning || 'consistency' }));
    else if (c.kind === 'achievement') simIds.push({ kind: 'achievement', item: c.id, tier: null, size: c.body.size || 'milestone', meaning: c.body.meaning || 'consistency' });
  }
  for (const c of cat3) if (c.kind === 'title') simIds.push({ kind: 'title', item: c.id, tier: null, size: 'win', meaning: c.body.meaning || 'consistency' });
  const sim = simIds.slice(0, 200);
  await db.exec(`set session_replication_role = replica`);
  for (let i = 0; i < sim.length; i++) {
    const a = sim[i];
    await q(db, `insert into public.career_awards (athlete_id, award_id, kind, item, tier, subject, day, pays, xp, size, meaning, evidence, how, rules_version)
                 values ('zz_sim', public.career_award_id($1::text, $2::text, $3::integer, ''), $1::text, $2::text, $3::integer, '', $4::date, false, 0, $5::text, $6::text, '{}'::jsonb, 'silent', 3)`,
            [a.kind, a.item, a.tier, addDays(today, -(i % 90)), ['tick', 'win', 'highlight', 'milestone', 'legend'].includes(a.size) ? a.size : 'win', a.meaning]);
  }
  await db.exec(`set session_replication_role = origin`);
  // the first read settles it: a title that follows from a tier the career holds is minted by get_profile's own evaluate (a real career does the same)
  await profile(db, 'zz_sim');
  const simN = await val(db, `select count(*)::int from public.career_awards where athlete_id = 'zz_sim'`);
  const pSim = await profile(db, 'zz_sim'), shSim = await shelfOf(db, 'zz_sim');
  { const hav = new Set(sim.map(a => `${a.kind}:${a.item}` + (a.tier ? ':' + a.tier : ''))); info(`the 200 written, ${simN - 200} more minted by get_profile's evaluate (their titles): ` + pSim.owned.filter(id => !hav.has(id)).join(', ')); }
  const simBytes = sizeOf(pSim);
  info(`get_profile of zz_sim (a simulated career of ${simN} awards): ${simBytes} bytes compact; owned ${sizeOf(pSim.owned)} of them; the shelf read ${sizeOf(shSim)} bytes`);
  ok(simN >= 200 && pSim.owned.length === simN, `the simulated career holds ${simN} awards (200 written) and the profile's owned lists every one (${pSim.owned.length} ids)`, undefined, 'L1');
  ok(simBytes <= BUDGET, `the core profile of a simulated ${simN}-award career is ${simBytes} bytes compact against the 14 KB budget (${BUDGET}): it grows by one id an award and nothing else`, `its largest parts: ${Object.entries(pSim).map(([k, v]) => [k, JSON.stringify(v).length]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} ${n}`).join(', ')}`, 'L1');
  const mSim = shelfAwards(shSim), simMiss = pSim.owned.filter(id => !(id in mSim));
  ok(simMiss.length === 0 && Object.keys(mSim).length === simN, `and the shelf read returns all ${simN} (${Object.keys(mSim).length} ids; missing ${simMiss.length}${simMiss.length ? ': ' + simMiss.slice(0, 5).join(', ') : ''})`, undefined, 'L1');
  // the simulated career leaves nothing behind for the sections that follow
  for (const t of ['career_awards', 'career_recognition', 'career_scores', 'career_facts']) await q(db, `delete from public.${t} where athlete_id = 'zz_sim'`);
  await q(db, `delete from public.programs where athlete_id = 'zz_sim'`);
  const simLeft = await val(db, `select (select count(*) from public.career_awards where athlete_id = 'zz_sim') + (select count(*) from public.career_recognition where athlete_id = 'zz_sim') + (select count(*) from public.career_scores where athlete_id = 'zz_sim') + (select count(*) from public.career_facts where athlete_id = 'zz_sim')`);
  ok(Number(simLeft) === 0, 'and zz_sim is taken out again (no award, recognition, score or fact left)', undefined, 'L3');
  // get_profile() on the skip path is a growth budget over phase 2's get_profile() on the same log (the first read after the saves, a full call, is also told)
  const profFirst = await ms(() => profile(db, 'zz_long'));
  const profSkip = []; for (let k = 0; k < 5; k++) profSkip.push((await ms(() => profile(db, 'zz_long')))[1]);
  const dProf = median(profSkip) - median(ctlProf);
  info(`${big}'s log: get_profile() first read after the saves ${profFirst[1]} ms; skip path ${profSkip.join(' / ')} ms (median ${median(profSkip)}); phase 2's get_profile() on the same log ${ctlProf.join(' / ')} ms (median ${median(ctlProf)})`);
  ok(dProf <= 100, `get_profile() of the longest log on the skip path costs ${Math.round(dProf)} ms more than phase 2's get_profile() on the same log (median ${median(profSkip)} against ${median(ctlProf)}; the budget is +100 ms)`, JSON.stringify({ profSkip, ctlProf }), 'L1');
  if (S73) {
    // the commitment number's own cost (D19): get_profile() of the longest REAL log with stage70's four functions, with stage73 but stage70's
    // career_rewards_profile() (stage73 without the hunk), and with stage73 as built; the skip path, and a full call (the stamp taken off). Each variant
    // runs in a transaction that is undone, so nothing it mints or writes is kept; two rounds, the variants in turn.
    const cutFn = (txt, name) => { const a = txt.indexOf(`create or replace function public.${name}(`); return txt.slice(a, txt.indexOf('end $function$;', a) + 'end $function$;'.length); };
    const V = [['stage70', S73_FNS.map(n => cutFn(s70, n)).join('\n')], ['stage73 without the commitment hunk', cutFn(s70, 'career_rewards_profile')], ['stage73 as built', '']];
    const T = Object.fromEntries(V.map(([k]) => [k, { skip: [], full: [], bytes: 0, com: null }]));
    for (let round = 0; round < 2; round++) for (const [name, sql] of V) {
      await db.exec('begin');
      try {
        if (sql) await runSql(db, sql, name);
        await profile(db, big);
        for (let k = 0; k < 5; k++) T[name].skip.push((await ms(() => profile(db, big)))[1]);
        for (let k = 0; k < 2; k++) { await q(db, `update public.career_scores set rewards = rewards - 'stamp' where athlete_id = $1`, [big]); T[name].full.push((await ms(() => profile(db, big)))[1]); }
        const pv = await profile(db, big); T[name].bytes = sizeOf(pv); T[name].com = pv.numbers.four.commitment.value;
      } finally { await db.exec('rollback'); }
    }
    const r1 = x => Math.round(x * 10) / 10;
    for (const [name] of V) info(`${big}'s get_profile() with ${name}: skip path ${T[name].skip.join(' / ')} ms (median ${r1(median(T[name].skip))}), full call ${T[name].full.join(' / ')} ms (median ${r1(median(T[name].full))}); the core ${T[name].bytes} bytes; commitment ${T[name].com}`);
    const W = T['stage73 as built'], WO = T['stage73 without the commitment hunk'];
    const hunkSkip = Math.round((median(W.skip) - median(WO.skip)) * 10) / 10, hunkFull = Math.round((median(W.full) - median(WO.full)) * 10) / 10;
    ok(median(W.skip) - median(ctlProfBig) <= 100, `with the commitment number, get_profile() of the longest real log (${big}) on the skip path costs ${Math.round(median(W.skip) - median(ctlProfBig))} ms more than phase 2's get_profile() of ${big} (median ${r1(median(W.skip))} against ${r1(median(ctlProfBig))}; budget +100); the hunk itself ${hunkSkip} ms on the skip path, ${hunkFull} ms on a full call`, JSON.stringify({ T, ctlProfBig }), 'L1');
    ok(W.bytes <= BUDGET, `and the core of ${big} is ${W.bytes} bytes compact with it (${WO.bytes} without; the budget ${BUDGET})`, undefined, 'L1');
    // which path: evaluate's cache answers (no second pass over the paid facts); with no badge holding the count it is worked out; when that fails, every fact
    const paidBig = Number(await val(db, `select count(*)::int from public.career_facts_paid($1) where kind in ('session_finished', 'session_finished_early')`, [big]));
    const rawBig = Number(await val(db, `select count(*)::int from public.career_facts where athlete_id = $1 and kind in ('session_finished', 'session_finished_early') and void_at is null`, [big]));
    const rwBig = (await one(db, `select rewards from public.career_scores where athlete_id = $1`, [big])).rewards;
    const comOf = async rw => { const [r, t] = await ms(() => one(db, `select public.career_rewards_profile($1, $2::jsonb) #> '{numbers,four,commitment,value}' as v`, [big, JSON.stringify(rw)])); return [Number(r.v), t]; };
    const tC = [], tF = [];
    let cC, cF;
    for (let k = 0; k < 3; k++) { const [a, ta] = await comOf(rwBig); const [b, tb] = await comOf({}); cC = a; cF = b; tC.push(ta); tF.push(tb); }
    info(`career_rewards_profile() of ${big}: from evaluate's cache ${tC.join(' / ')} ms, with no badge in the cache holding the count (worked out) ${tF.join(' / ')} ms; facts ${rawBig}, paid ${paidBig}`);
    ok(cC === paidBig && cF === paidBig && rawBig > paidBig, `${big}'s commitment is ${paidBig}, the paid sessions (${rawBig} session facts), both from the cache and when it is worked out`, JSON.stringify({ cC, cF, paidBig, rawBig }), 'L1');
    await db.exec('begin');
    let viaCache, viaNothing, errF = null;
    try {
      await q(db, `create or replace function public.career_measures(p_athlete text, p_ctx jsonb, p_keys text[]) returns jsonb language plpgsql as $$ begin raise exception 'boom'; end $$`);
      viaCache = (await comOf(rwBig))[0];
      viaNothing = await comOf({}).then(r => r[0], e => { errF = e.message; return null; });
    } finally { await db.exec('rollback'); }
    ok(viaCache === paidBig, `with career_measures() made to raise, the commitment still comes from the cache (${viaCache}): the usual read calls no measure`, undefined, 'L1');
    ok(!errF && viaNothing === rawBig, `and with nothing to read it from either, the profile still answers, counting every session fact (${viaNothing}; the number before stage73)`, errF, 'L1');
    ok((await val(db, `select pg_get_functiondef('public.career_measures(text,jsonb,text[])'::regprocedure) like '%career_facts_paid%'`)) === true, 'and career_measures() is stage73\'s again (the transaction was undone)', undefined, 'L1');
    // a free athlete's commitment is its perfect days, as before. No athlete of this run is free, so the coached athlete with the most perfect days
    // (one with sessions too, so the two numbers differ) is made free for one read, in a transaction that is undone.
    const freeId = await val(db, `select f.athlete_id from public.career_facts f join public.programs p on p.athlete_id = f.athlete_id
                                   where f.kind in ('perfect_day', 'session_finished') and f.void_at is null group by 1
                                  having count(*) filter (where f.kind = 'perfect_day') > 0 and count(*) filter (where f.kind = 'session_finished') > 0
                                   order by count(*) filter (where f.kind = 'perfect_day') desc, 1 limit 1`);
    await db.exec('begin');
    let pFree = null, pdFree = null, sessFree = null;
    try {
      await q(db, `update public.programs set data = jsonb_set(data, '{athlete,tier}', '"free"') where athlete_id = $1`, [freeId]);
      const rwFree = (await one(db, `select rewards from public.career_scores where athlete_id = $1`, [freeId])).rewards;
      pFree = (await one(db, `select public.career_rewards_profile($1, $2::jsonb) as p`, [freeId, JSON.stringify(rwFree || {})])).p;
      pdFree = Number(await val(db, `select count(*)::int from public.career_facts where athlete_id = $1 and kind = 'perfect_day' and void_at is null`, [freeId]));
      sessFree = Number(await val(db, `select count(*)::int from public.career_facts where athlete_id = $1 and kind in ('session_finished', 'session_finished_early') and void_at is null`, [freeId]));
    } finally { await db.exec('rollback'); }
    const cf = pFree && pFree.numbers && pFree.numbers.four && pFree.numbers.four.commitment;
    ok(freeId && pdFree > 0 && pFree.numbers.free === true && cf && cf.key === 'perfect_days' && Number(cf.value) === pdFree && pdFree !== sessFree, `a free athlete's commitment is still its perfect days (${freeId} made free for one read: ${JSON.stringify(cf)}; ${pdFree} perfect days, ${sessFree} session facts)`, JSON.stringify(pFree && pFree.numbers), 'L1');
  }
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
  ok(pS.numbers && pS.numbers.four && typeof pS.numbers.four.commitment.value === 'number', `and the four numbers still answer (commitment ${pS.numbers && pS.numbers.four && JSON.stringify(pS.numbers.four.commitment)})`, undefined, 'L1');
  const okSave = await doorProgress(db, staleId, habitLog(today, -6, 0, { water: 8, steps: 11000, sleep: 8 }), CFG_THREE).then(() => true, () => false);
  ok(okSave, 'and a save still goes through while evaluate fails (the trigger only warns)', undefined, 'L1');
  await runSql(db, s70, 'stage70 (restore the functions)');
  if (S73) await runSql(db, s73, 'stage73 (restore the functions)');
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
  const pTitle = await profile(db, 'zz_week'), shTitle = await shelfOf(db, 'zz_week');
  ok((await awardsOf(db, 'zz_week')).some(a => a.award_id === 'title:climber') && pTitle.owned.includes('title:climber') && shTitle.titles.some(t => t.id === 'climber'), 'a title added by a re-seed to a tier already owned is minted on the next full evaluate (zz_week: CLIMBER from Hold Serve)', JSON.stringify(shTitle.titles.map(t => t.id)), 'L1');
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
    // an object's keys compared in sorted order: the catalogue map follows career_catalogue's physical row order (cat3 is read without an ORDER BY),
    // which a re-seed of other rows can shuffle (2026-10-18: the qualities and exclude keys on two entries moved first_blood); the order means nothing
    const canon = x => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canon(x[k])])) : x);
    const strip = c => c && JSON.stringify(canon({ rules: c.rules, catalogue: c.catalogue, athletes: c.athletes, moves: c.moves, ids: c.ids }));
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
  if (S73) {
    // stage73 comes off first (the order they went on in, reversed): stage70's four functions back byte for byte, the helper dropped, no award touched, the stamp cleared
    const rb73 = read(path.join(ROOT, 'scripts', 'career', 'rollback_stage73.sql'));
    const stamps = () => val(db, `select count(*)::int from public.career_scores where rewards ? 'stamp'`);
    ok(await stamps() > 0, `before the rollback of stage73 the cached rewards carry their stamp (${await stamps()} athletes)`, undefined, 'L3');
    const awBefore73 = JSON.stringify(await q(db, `select athlete_id, award_id, day::text as d, pays, xp from public.career_awards order by 1, 2`));
    let e73 = null; try { await runSql(db, rb73, 'rollback stage73'); } catch (e) { e73 = e.message; }
    ok(!e73, 'rollback_stage73.sql goes through', e73, 'L1');
    const dNow = await allCareerDefs();
    const dDiff = Object.keys(defsBefore73).filter(k => dNow[k] !== defsBefore73[k]);
    ok(dDiff.length === 0 && !dNow['career_maxpct_key(jsonb)'], `career_entry_keys, career_measures, career_achievement_eval and career_rewards_profile are stage70's text again, byte for byte as the database prints them, and career_maxpct_key is dropped (${Object.keys(defsBefore73).length} functions compared, every one the same)`,
       dDiff.map(k => k + '\n' + firstDiff(defsBefore73[k], dNow[k])).join('\n'), 'L1');
    ok(await stamps() === 0, 'and the cached rewards lost their stamp, so the next full evaluate looks again', undefined, 'L1');
    ok(JSON.stringify(await q(db, `select athlete_id, award_id, day::text as d, pays, xp from public.career_awards order by 1, 2`)) === awBefore73, 'and no award was touched (GAME-1: an award minted while stage73 stood is kept)', undefined, 'L1');
    let e73b = null; try { await runSql(db, rb73, 'rollback stage73 again'); } catch (e) { e73b = e.message; }
    const dNow2 = await allCareerDefs();
    ok(!e73b && Object.keys(defsBefore73).every(k => dNow2[k] === defsBefore73[k]) && !dNow2['career_maxpct_key(jsonb)'], 'the rollback of stage73 runs a second time and finds nothing to do', e73b, 'L1');
    const again73 = await runSql(db, s73, 'stage73 after its rollback').then(() => true, e => e.message);
    ok(again73 === true, 'stage73 can be applied again after a rollback', again73 === true ? undefined : again73, 'L1');
    await runSql(db, rb73, 'rollback stage73 (third time, to go on to stage70)');
  }
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
  if (S73) {
    const s73again = await runSql(db, s73, 'stage73 after stage70 again').then(() => true, e => e.message);
    ok(s73again === true && !!(await val(db, `select to_regprocedure('public.career_maxpct_key(jsonb)')::text`)), 'and stage73 goes back on top of it', s73again === true ? undefined : s73again, 'L1');
  }

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
  // in a fixed order (the badges, then the achievements, as listed above), not the table's physical row order, so --write-cases is stable
  const body = Object.fromEntries([...PHONE_BADGES.map(id => ['badge', id]), ...PHONE_ACH.map(id => ['achievement', id])]
    .map(([k, id]) => cat3.find(r => r.kind === k && r.id === id)).filter(Boolean).map(r => [r.id, r.body]));
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
             { early: false, fullLog: true, checkin: true, weekCloses: true, cycleCloses: true }, { early: false, fullLog: false, checkin: false, weekCloses: true, cycleCloses: false, byBook: true },
             // D19 (2026-10-18; the cap GAME-4 puts on XP): a plan day done again in its training week is not a paid session; it moves no count over the session kinds
             { early: false, fullLog: true, checkin: true, weekCloses: false, cycleCloses: false, repeat: true },
             { early: true, fullLog: false, checkin: false, weekCloses: false, cycleCloses: false, repeat: true },
             { early: false, fullLog: true, checkin: true, weekCloses: true, cycleCloses: false, repeat: true }];
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
      if (has(en, 'session_finished') && !e.early && !e.repeat) inc++;           // a repeated plan day is not a paid session (D19); the full log and the check-in still count
      if (has(en, 'session_finished_early') && e.early && !e.repeat) inc++;
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
