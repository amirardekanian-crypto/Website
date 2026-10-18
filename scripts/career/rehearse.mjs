// Career Mode, phase 1, rehearsed away from the live project (supabase/stage66_career_mode.sql; career/PROCEDURES.md → P14).
//
//     PGLITE=<scratch>/node_modules/@electric-sql/pglite node scripts/career/rehearse.mjs [--data <folder>] [--expect <file>]
//         [--phase1 <rev>] [--no-stage70]
//
// PGlite is a real PostgreSQL compiled to WebAssembly (install it in a scratch folder: scripts/restore/lib.mjs, the top). Nothing here
// touches a real project and nothing is written outside the system's temp folder.
//
// What it does, in order
//   1. builds a database from supabase/schema_snapshot.sql (on scripts/restore/stand_in_supabase.sql), as the restore rehearsal does;
//   2. with --data, loads the rows of a dump of the tables Career Mode reads (part1.json, part2.json, part3.json: made by the session that
//      ran this, from the live project, read only; never committed) BEFORE stage66, as on the live project;
//   3. applies the stages the snapshot does not hold yet, each twice (it must be safe to re-run: scripts/career/rehearse_lib.mjs; the
//      snapshot has held stage66 and stage69 since 2026-10-18 and holds stage70 once that is live, so today only stage70 goes on, and with
//      --no-stage70 nothing does), then the phase 1 seed (the career files of --phase1, default the commit the live project was seeded from,
//      rulebook version 1: the XP switch and the catalogue switch off, phase 1's shadow), which works every athlete's facts out over all history;
//   4. career_compare(): for every athlete with a Proof log, Career Mode's habit XP against hab_xp() + hab_bonus_xp() this season, the
//      rolling week and all time, the rules key by key and the three probes. Every athlete must match. With --expect (Proof's XP read on
//      the live project the same day), Proof's own numbers here must equal the live ones, so the comparison ran on the same data;
//   5. made-up athletes (zz_…) through the real doors: save_progress() and save_session() as the athlete, coach_hide_session() and a
//      delete as the coach, log_library_session(), a programme with dated cycles, Personal Records; then the facts each must make
//      (held, broken, bounce back, a return, a finished cycle, an effort win, a best, a retest beaten, a comeback), the voids, the
//      row-level security, get_profile(), a save that still goes through when Career Mode breaks, idempotence, and an erasure.
// Exit code 1 if anything failed.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { filesAt, seedFrom, seedSql, ensureStages, eraseDef, PHASE1_REV } from './rehearse_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const COACH_JWT = JSON.stringify({ email: 'amirardekanian@gmail.com', role: 'authenticated', sub: '00000000-0000-4000-8000-00000000c0c0' });
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const DATA = opt('--data'), EXPECT = opt('--expect'), REPORT = opt('--report');
const PHASE1 = opt('--phase1') || PHASE1_REV;      // the commit the live project's phase 1 rulebook was seeded from
const THROUGH = args.includes('--no-stage70') ? 69 : 70;

let passed = 0, failed = 0;
function ok(cond, what, detail) {
  if (cond) { passed++; console.log('  ok   ' + what); }
  else { failed++; console.log('  FAIL ' + what + (detail ? '\n         ' + String(detail).split('\n').join('\n         ') : '')); }
}
const section = s => console.log('\n' + s);
const q = async (db, sql, params) => (await db.query(sql, params)).rows;
const one = async (db, sql, params) => (await q(db, sql, params))[0];
const asCoach = db => q(db, `select set_config('request.jwt.claims', $1, false)`, [COACH_JWT]);
const asAthlete = (db, sub, id) => q(db, `select set_config('request.jwt.claims', $1, false)`,
                                     [JSON.stringify({ sub, role: 'authenticated', email: `athlete.${id}@amirardekani.com` })]);
const asNobody = db => q(db, `select set_config('request.jwt.claims', '', false)`);

async function load(db, table, rows) {
  if (!rows || !rows.length) return 0;
  await db.query(`insert into public.${table} select * from jsonb_populate_recordset(null::public.${table}, $1::jsonb)`, [JSON.stringify(rows)]);
  return rows.length;
}

// A function of program.html, cut out by name as scripts/check_twins.js does (the first "\n}" after which it compiles), for the phone's
// copies of a server rule: holdCount() is get_profile()'s weeks held in a row, for Home's Hold Serve row.
function appFn(name) {
  const src = fs.readFileSync(path.join(ROOT, 'program.html'), 'utf8').replace(/\r\n/g, '\n');
  const m = new RegExp('^function ' + name + '\\(', 'm').exec(src);
  if (!m) throw new Error('program.html has no function ' + name + '(): update scripts/career/rehearse.mjs');
  for (let end = m.index; ;) {
    end = src.indexOf('\n}', end + 1);
    if (end < 0) throw new Error('program.html: ' + name + '() never closes');
    const code = src.slice(m.index, end + 2);
    try { new vm.Script(code); } catch (e) { continue; }
    const ctx = vm.createContext({});
    vm.runInContext(code, ctx);
    return vm.runInContext(name, ctx);
  }
}
// The athlete's own read in program.html (refreshHold()): the same rows, in the same order.
const HOLD_SQL = `select kind, ref, day::text as day, value from public.career_facts
                   where athlete_id = $1 and kind in ('week_held', 'week_broken') and void_at is null order by day, ref`;

function ymd(d) { return d.toISOString().slice(0, 10); }
function addDays(day, n) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); }

async function main() {
  const db = await openDb();
  section('1. the database from the snapshot');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  await runSql(db, read(path.join(ROOT, 'supabase', 'schema_snapshot.sql')), 'snapshot');
  ok(true, 'stand-in + schema_snapshot.sql built');
  const today = (await one(db, `select current_date::text as d`)).d;

  section('2. the rows Career Mode reads');
  let realIds = [];
  if (DATA) {
    const part = n => JSON.parse(fs.readFileSync(path.join(DATA, `part${n}.json`), 'utf8'))[0].dump;
    const p1 = part(1), p2 = part(2), p3 = part(3);
    const n = {};
    for (const [t, rows] of [['seasons', p1.seasons], ['xp_rules', p1.xp_rules], ['programs', p1.programs], ['program_versions', p1.program_versions],
                             ['library_sessions', p1.library_sessions], ['athlete_status', p1.athlete_status], ['hab_titles', p1.hab_titles],
                             ['athlete_progress', p3.athlete_progress], ['session_history', p2.session_history]]) n[t] = await load(db, t, rows);
    ok(true, 'loaded the dump: ' + Object.entries(n).map(([t, k]) => `${t} ${k}`).join(', '));
    realIds = p3.athlete_progress.map(r => r.athlete_id);
  } else {
    const rules = JSON.parse(read(path.join(ROOT, 'supabase', 'xp_rules_snapshot.json'))).rules;
    await db.query(`insert into public.xp_rules (id, rules) values (1, $1::jsonb)`, [JSON.stringify({ ...rules, questRuns: [] })]);
    await db.query(`insert into public.seasons (name, starts_on) values ('Pre-Season', current_date - 60)`);
    ok(true, 'no --data: made-up athletes only (xp_rules from supabase/xp_rules_snapshot.json, a season 60 days old)');
  }

  section('3. the stages the snapshot does not hold, then the phase 1 seed');
  const st = await ensureStages(db, THROUGH, m => console.log('         ' + m));
  ok(true, `the database holds stage66 and stage69 (${st.held.length ? 'from the snapshot' : 'applied here'})${THROUGH === 70 ? ' and stage70 (' + (st.applied.includes(70) ? 'applied here, twice' : 'from the snapshot') + ')' : ' (--no-stage70: phase 3 is not loaded)'}`);
  const erase = await eraseDef(db);
  ok((erase.match(/'career_facts'/g) || []).length === 1, 'coach_erase_person() lists career_facts exactly once (the patches are idempotent)');
  if (THROUGH === 70) ok((erase.match(/'career_awards'/g) || []).length === 1, 'and career_awards exactly once');
  ok((await q(db, `select 1 from public.career_facts`)).length === 0, 'no facts before the seed: with no rulebook, every trigger does nothing');
  const files = filesAt(PHASE1);
  const seed = { status: 0, stdout: seedFrom(files) };
  ok(seed.status === 0, `scripts/career_seed.py of ${PHASE1} wrote the seed`, seed.stderr);
  const t0 = Date.now();
  const seeded = (await one(db, seedSql(seed.stdout))).r;
  ok(seeded && seeded.version === 1 && seeded.catalogue > 100, `the seed loaded rulebook version ${seeded && seeded.version} and ${seeded && seeded.catalogue} catalogue rows, `
     + `then the backfill (${Date.now() - t0} ms): ${JSON.stringify(seeded && seeded.backfill)}`);

  section('4. the shadow check: Career Mode against Proof');
  let cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.rules_equal, 'the rulebook and the catalogue carry Proof\'s xp_rules key by key', 'differ on: ' + JSON.stringify(cmp.rules_differ_on));
  const bad = cmp.rows.filter(r => !r.ok);
  ok(cmp.ok && bad.length === 0, `every athlete matches: ${cmp.matched} of ${cmp.athletes} (season from ${cmp.season_start}, today ${cmp.today})`,
     bad.map(r => JSON.stringify(r)).join('\n'));
  if (DATA) {
    console.log('         ' + cmp.rows.map(r => `${r.athlete_id} ${r.season.career}`).join(' · '));
    if (EXPECT) {
      const live = JSON.parse(fs.readFileSync(EXPECT, 'utf8'));
      const here = Object.fromEntries(cmp.rows.map(r => [r.athlete_id, r]));
      const off = Object.entries(live.proof_xp).filter(([id, v]) => !here[id] || here[id].season.proof !== v.season || here[id].all.proof !== v.all);
      ok(live.today === today && off.length === 0,
         `Proof's own XP here equals the live project's for all ${Object.keys(live.proof_xp).length} athletes (read on the live project, ${live.today})`,
         (live.today !== today ? `the dates differ: live ${live.today}, here ${today}\n` : '') + off.map(([id, v]) => `${id}: live ${JSON.stringify(v)}, here ${JSON.stringify(here[id] && { season: here[id].season.proof, all: here[id].all.proof })}`).join('\n'));
    }
  }

  if (REPORT) {
    // every athlete's profile and facts by kind, as the shadow sees them (the report the session hands Amir; never committed)
    const ids = (await q(db, `select distinct athlete_id as id from public.career_facts order by 1`)).map(r => r.id);
    const out = [];
    for (const id of ids) {
      const p = (await one(db, `select public.get_profile($1) as p`, [id])).p;
      const by = Object.fromEntries((await q(db, `select kind, count(*)::int as n from public.career_facts where athlete_id = $1 and void_at is null group by kind order by kind`, [id])).map(r => [r.kind, r.n]));
      out.push({ athlete_id: id, career: { xp: p.career.xp, level: p.career.level, rank: p.career.rank, habits: p.career.habits, facts_xp: p.career.facts_xp },
                 season: { points: p.season.points, habits: p.season.parts.habits.xp }, numbers: p.numbers, facts: by,
                 proof_season: (cmp.rows.find(r => r.athlete_id === id) || {}).season });
    }
    fs.writeFileSync(REPORT, JSON.stringify({ today, compare: { ok: cmp.ok, matched: cmp.matched, athletes: cmp.athletes, rules_equal: cmp.rules_equal }, athletes: out }, null, 1));
    ok(true, `wrote the per-athlete report (${out.length} athletes) to ${REPORT}`);
  }

  section('5. made-up athletes through the real doors');
  const U1 = '10000000-0000-4000-8000-0000000000a1', U2 = '10000000-0000-4000-8000-0000000000a2';
  await q(db, `insert into auth.users (id, email) values ($1, 'athlete.zz_one@amirardekani.com'), ($2, 'athlete.zz_two@amirardekani.com')`, [U1, U2]);
  await q(db, `insert into public.athlete_identities (user_id, athlete_id, email) values ($1, 'zz_one', null), ($2, 'zz_two', null)`, [U1, U2]);
  await q(db, `insert into public.library (slug, kind, data, published) values ('zz-mob', 'workout', '{"title":"ZZ Mobility","countsAs":"mobility","duration":"15 min"}', true)`);

  // zz_one: a past cycle (5 weeks, 13 of 15 sessions) and a current one of 7 weeks: held, broken, held, empty, empty, held, running.
  const S1 = addDays(today, -90), E1 = addDays(today, -56), S2 = addDays(today, -48), E2 = today;
  const squat = { type: 'standard', name: 'Back Squat', test: '5RM' };
  const day = (id, ex) => ({ id, blocks: [{ exercises: ex ? [ex] : [{ type: 'standard', name: 'Row ' + id }] }] });
  await q(db, `insert into public.programs (athlete_id, data) values ('zz_one', $1::jsonb)`, [JSON.stringify({
    athlete: { firstName: 'Zed', lastName: 'One' }, currentCycleIndex: 1,
    cycles: [{ num: 1, startDate: S1, endDate: E1 }, { num: 2, startDate: S2, endDate: E2 }],
    workouts: { days: [day(1, squat), day(2), day(3)] }, programHistory: [{ id: 'prog1', days: [{}, {}, {}] }] })]);
  const sessions = [];
  for (let w = 0; w < 4; w++) for (let d = 1; d <= 3; d++) sessions.push([d, addDays(S1, w * 7 + d * 2 - 2)]);
  sessions.push([1, addDays(S1, 28)]);                                                     // past cycle: 13 of 15
  for (const [d, off] of [[1, 0], [2, 2], [3, 4], [1, 7], [2, 9], [1, 14], [2, 15], [3, 17], [1, 35], [2, 37], [3, 39], [1, 44]]) sessions.push([d, addDays(S2, off)]);
  const set2 = (ex, reps, w, r) => [{ ex, block: 'A', reps: String(reps), sets: [{ w: String(w), n: reps, r, d: true }, { w: String(w), n: reps, r, d: true }] }];
  const lg = (w, r) => set2('Back Squat', 5, w, r);
  // Day 2's row only ever gets easier (RPE 9, then 7): heavier at the same effort by the index, but neither the weight nor the reps
  // moved, so it is no win (GAME-5). Day 3's row never changes.
  const logOf = (d, k) => d === 1 ? lg(k === 1 ? 80 : 90, 8) : d === 2 ? set2('Row 2', 8, 50, k === 2 ? 9 : 7) : set2('Row 3', 10, 40, 8);
  await asAthlete(db, U1, 'zz_one');
  let k = 0;
  const meta = [];                                                         // [day, date, complete, checked in] of every session
  for (const [d, on] of sessions) {
    k++;
    const complete = k % 5 !== 0, checked = k % 4 !== 0;
    meta.push([d, on, complete, checked]);
    const sess = { status: complete ? 'Complete' : 'Partial (5 of 8 sets/units done) · Out of time', session_rpe: 7, duration_min: 50,
                   readiness: checked ? { composite: 4, sleep: 4, energy: 4, soreness: 4, stress: 3, overall: 4 } : { skipped: true, composite: null },
                   log: logOf(d, k), summary: 'Day ' + d };
    await q(db, `select public.save_session('zz_one', 'Zed One', $1, $2::date, $3::jsonb, null)`, [d, on, JSON.stringify(sess)]);
  }
  // the retest, in the current cycle's last week: 100 kg × 5 at RPE 9 (an estimate of 120)
  await q(db, `select public.save_session('zz_one', 'Zed One', 1, $1::date, $2::jsonb, null)`, [addDays(today, -1), JSON.stringify(
    { status: 'Complete', duration_min: 45, readiness: { composite: 5, sleep: 5, energy: 5, soreness: 5, stress: 5, overall: 5 }, log: lg(100, 9) })]);
  const nsess = sessions.length + 1;
  ok(Number((await one(db, `select count(*) as n from public.career_facts where athlete_id = 'zz_one' and kind in ('session_finished', 'session_finished_early') and void_at is null`)).n) === nsess,
     `save_session() as the athlete wrote one session fact for each of the ${nsess} sessions (its trigger)`);

  // the Proof log: 49 days with a 4-day gap (a comeback), a habit added half way, a custom habit, zeros, part-done counters
  const log = {}, sessDays = new Set(sessions.map(s => s[1]).concat([addDays(today, -1)]));
  for (let i = 0; i < 49; i++) {
    if (i >= 20 && i <= 23) continue;
    const dd = addDays(today, -48 + i), v = { steps: i % 3 ? 12000 : 9500, sleep: 8, fuel: i % 7 ? 3 : 2, water: i % 9 ? 8 : 0 };
    if (sessDays.has(dd)) v.strength = 1;
    if (i >= 28) { v.supps = 1; if (i % 2) v.c_zz_read = 1; }
    log[dd] = v;
  }
  const cfg = { roster: [{ from: addDays(today, -48), ids: ['strength', 'steps', 'sleep', 'fuel', 'water'] },
                         { from: addDays(today, -20), ids: ['strength', 'steps', 'sleep', 'fuel', 'water', 'supps', 'c_zz_read'] }],
                custom: [{ id: 'c_zz_read', name: 'Read' }], on: { mobility: false, breathe: false } };
  const recs = [{ lift: 'Back Squat', kg: 100, w: 85, r: 5, rpe: 8, d: addDays(today, -30), t: 5 },
                { lift: 'Back Squat', kg: 105, w: 90, r: 5, rpe: 8, d: addDays(today, -10), t: 0, auto: true },
                { lift: 'Bench Press', kg: 60, w: 50, r: 5, rpe: 8, d: addDays(today, -9), t: 0, auto: true }];
  // a quest run over the last week, as coach.html's Quest week would start one (it lives in xp_rules, Proof's lever)
  await q(db, `update public.xp_rules set rules = jsonb_set(rules, '{questRuns}', coalesce(rules -> 'questRuns', '[]') || $1::jsonb) where id = 1`,
          [JSON.stringify([{ start: addDays(today, -6), ids: ['w_water5', 'w_qualify5', 'w_steps50k'] }])]);
  await q(db, `select public.save_progress('zz_one', 'Zed One', $1::jsonb, null, null)`,
          [JSON.stringify({ zz_one_hab_log: JSON.stringify(log), zz_one_hab_cfg: JSON.stringify(cfg), zz_one_1rm: JSON.stringify(recs) })]);
  await q(db, `select * from public.log_library_session('zz_one', 'zz-mob', current_date)`);
  await asNobody(db);
  const kinds = async id => Object.fromEntries((await q(db, `select kind, count(*)::int as n from public.career_facts where athlete_id = $1 and void_at is null group by kind`, [id])).map(r => [r.kind, r.n]));
  const refs = async (id, kind) => (await q(db, `select ref from public.career_facts where athlete_id = $1 and kind = $2 and void_at is null order by ref`, [id, kind])).map(r => r.ref);
  let f = await kinds('zz_one');
  ok(f.habit_day === 45 && f.habit_done > 200 && f.workout_tick > 0 && f.day_on_target > 0 && f.perfect_day > 0,
     'save_progress() as the athlete wrote the habit facts: ' + JSON.stringify({ habit_day: f.habit_day, habit_done: f.habit_done, workout_tick: f.workout_tick, day_on_target: f.day_on_target, perfect_day: f.perfect_day }));
  ok(JSON.stringify(await refs('zz_one', 'comeback')) === JSON.stringify([addDays(today, -24)]), 'the day back after the 4-day gap is a comeback', JSON.stringify(await refs('zz_one', 'comeback')));
  ok(JSON.stringify(await refs('zz_one', 'week_held')) === JSON.stringify(['c1|w1', 'c1|w2', 'c1|w3', 'c1|w4', 'c2|w1', 'c2|w3', 'c2|w6']),
     'held weeks: the past cycle\'s first four, and weeks 1, 3 and 6 of the current one', JSON.stringify(await refs('zz_one', 'week_held')));
  ok(JSON.stringify(await refs('zz_one', 'week_broken')) === JSON.stringify(['c1|w5', 'c2|w2', 'c2|w4', 'c2|w5']),
     'broken weeks: c1 w5, c2 w2, w4 and w5; the running week 7 is neither', JSON.stringify(await refs('zz_one', 'week_broken')));
  ok(JSON.stringify(await refs('zz_one', 'bounce_back')) === JSON.stringify(['c2|w1', 'c2|w3', 'c2|w6']), 'a bounce back after each broken week',
     JSON.stringify(await refs('zz_one', 'bounce_back')));
  ok(JSON.stringify(await refs('zz_one', 'training_return')) === JSON.stringify(['c2|w6']), 'the first held week after two empty ones is a return',
     JSON.stringify(await refs('zz_one', 'training_return')));
  ok(JSON.stringify(await refs('zz_one', 'cycle_finished')) === JSON.stringify(['c1']), 'the past cycle is finished (13 of 15), the current one not yet',
     JSON.stringify(await refs('zz_one', 'cycle_finished')));
  ok(JSON.stringify(await refs('zz_one', 'effort_win')) === JSON.stringify(['c1|back squat']),
     'an effort win: the squat went from 80 to 90 kg at the same reps and RPE; the row that only felt easier is none (GAME-5)',
     JSON.stringify(await refs('zz_one', 'effort_win')));
  const gain = await q(db, `select ref, value from public.career_facts where athlete_id = 'zz_one' and kind = 'lift_gain' and void_at is null order by ref`);
  ok(gain.length === 1 && gain[0].ref === 'back squat' && Number(gain[0].value.pct) === 21.6,
     'one lift gain: the squat, 21.6% over its first session (100 kg × 5 at RPE 9 against 80 × 5 at RPE 8); the rows have none', JSON.stringify(gain));
  // a held week by the book: every session of it finished as written and checked in first
  const winOf = (s, w) => [addDays(s, 7 * (w - 1)), addDays(s, 7 * w - 1)];
  const book = ['c1|w1', 'c1|w2', 'c1|w3', 'c1|w4', 'c2|w1', 'c2|w3', 'c2|w6'].filter(ref => {
    const [c, w] = ref.match(/c(\d)\|w(\d)/).slice(1).map(Number), [a, b] = winOf(c === 1 ? S1 : S2, w);
    return meta.filter(m => m[1] >= a && m[1] <= b).every(m => m[2] && m[3]);
  });
  ok(JSON.stringify(await refs('zz_one', 'week_by_the_book')) === JSON.stringify(book), `weeks by the book: ${book.join(', ') || 'none'}`,
     JSON.stringify(await refs('zz_one', 'week_by_the_book')));
  const months = Number((await one(db, `select count(*) as n from generate_series(1, 24) g where ($1::date + make_interval(months => g))::date <= current_date`, [S1])).n);
  ok(JSON.stringify(await refs('zz_one', 'month_with_amir')) === JSON.stringify(Array.from({ length: months }, (_, i) => String(i + 1)).sort()),
     `${months} whole months with Amir since the first session`, JSON.stringify(await refs('zz_one', 'month_with_amir')));
  ok(JSON.stringify(await refs('zz_one', 'comeback_stuck')) === JSON.stringify([addDays(today, -24)]), 'the comeback stuck: a week on target after it',
     JSON.stringify(await refs('zz_one', 'comeback_stuck')));
  ok(JSON.stringify(await refs('zz_one', 'personal_best')) === JSON.stringify(['Back Squat|' + addDays(today, -10)]),
     'a personal best from the records that fill themselves; the bench\'s first number is not one (nothing to beat)', JSON.stringify(await refs('zz_one', 'personal_best')));
  ok(JSON.stringify(await refs('zz_one', 'retest_done')) === JSON.stringify(['back squat|c2']) && JSON.stringify(await refs('zz_one', 'retest_beaten')) === JSON.stringify(['back squat|c2']),
     'the flagged squat logged in the closing week is a retest, and it beat the best record (120 against 105)',
     JSON.stringify({ done: await refs('zz_one', 'retest_done'), beaten: await refs('zz_one', 'retest_beaten') }));
  ok(f.library_session === 1 && f.checkin_done > 0 && f.full_log > 0 && f.session_finished_early > 0,
     'a Library session, check-ins (a skipped one is not), full logs and sessions finished early', JSON.stringify(f));
  cmp = (await one(db, `select public.career_compare() as r`)).r;
  const zz = cmp.rows.find(r => r.athlete_id === 'zz_one');
  ok(zz && zz.ok, 'zz_one\'s habit XP matches Proof\'s: a roster that changed, a custom habit, zeros, part-done counters, a comeback and a quest run',
     JSON.stringify(zz));
  ok(cmp.ok, `and still every athlete matches with the new quest run (${cmp.matched} of ${cmp.athletes})`, cmp.rows.filter(r => !r.ok).map(r => JSON.stringify(r)).join('\n'));

  section('6. a change, a hide, an un-hide, a delete');
  log[addDays(today, -2)] = { ...log[addDays(today, -2)], water: 4 };        // an open day changed
  delete log[addDays(today, -3)];                                            // and one taken off the log
  await asAthlete(db, U1, 'zz_one');
  await q(db, `select public.save_progress('zz_one', 'Zed One', $1::jsonb, null, null)`, [JSON.stringify({ zz_one_hab_log: JSON.stringify(log) })]);
  await asNobody(db);
  const water = await one(db, `select value ->> 'v' as v from public.career_facts where athlete_id = 'zz_one' and kind = 'habit_done' and ref = $1`, [addDays(today, -2) + '|water']);
  ok(water && water.v === '4', 'a changed habit value updates its fact');
  ok(Number((await one(db, `select count(*) as n from public.career_facts where athlete_id = 'zz_one' and day = $1 and void_at is null and kind like 'habit%'`, [addDays(today, -3)])).n) === 0
     && Number((await one(db, `select count(*) as n from public.career_facts where athlete_id = 'zz_one' and day = $1 and void_at is not null`, [addDays(today, -3)])).n) > 0,
     'a day taken off the log voids its facts (kept, not deleted)');
  cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp.rows.find(r => r.athlete_id === 'zz_one').ok, 'and the habit XP still matches Proof\'s');
  const hideDay = addDays(S2, 15);
  await asCoach(db);
  await q(db, `select public.coach_hide_session('zz_one', 2, $1::date, true)`, [hideDay]);
  await asNobody(db);
  ok((await q(db, `select 1 from public.career_facts where athlete_id = 'zz_one' and ref = $1 and void_at is null`, ['d2|' + hideDay])).length === 0,
     'a session the coach hides voids its facts (P12)');
  ok(!(await refs('zz_one', 'week_held')).includes('c2|w3') && (await refs('zz_one', 'week_broken')).includes('c2|w3'),
     'and the week it held is judged again: broken');
  await asCoach(db);
  await q(db, `select public.coach_hide_session('zz_one', 2, $1::date, false)`, [hideDay]);
  await asNobody(db);
  ok((await refs('zz_one', 'week_held')).includes('c2|w3') && (await q(db, `select 1 from public.career_facts where athlete_id = 'zz_one' and ref = $1 and void_at is null`, ['d2|' + hideDay])).length > 0,
     'un-hidden, its facts and the held week come back');
  await asCoach(db);
  await q(db, `set role authenticated`);
  await q(db, `delete from public.session_history where athlete_id = 'zz_one' and day = 3 and completed_on = $1::date`, [addDays(S2, 39)]);
  await q(db, `reset role`);
  await asNobody(db);
  ok((await q(db, `select 1 from public.career_facts where athlete_id = 'zz_one' and ref = $1 and void_at is not null`, ['d3|' + addDays(S2, 39)])).length > 0,
     'a session the coach deletes (as the signed-in coach, through row-level security) voids its facts');

  section('7. who may read what');
  await asAthlete(db, U1, 'zz_one');
  await q(db, `set role authenticated`);
  const mine = await one(db, `select count(*)::int as n, count(distinct athlete_id)::int as who from public.career_facts`);
  let denied = '';
  try { await q(db, `insert into public.career_facts (athlete_id, kind, ref, day, source) values ('zz_one', 'kudos', 'x', current_date, 'proof')`); } catch (e) { denied = e.message; }
  const prof = (await one(db, `select public.get_profile() as p`)).p;
  let other = '';
  try { await q(db, `select public.get_profile('zz_two')`); } catch (e) { other = e.message; }
  let internal = '';
  try { await q(db, `select public.career_backfill()`); } catch (e) { internal = e.message; }
  const rulesSeen = await one(db, `select count(*)::int as n from public.career_rules`);
  const ownWeeks = await q(db, HOLD_SQL, ['zz_one']);                       // what Home's Hold Serve row reads, as the athlete
  await q(db, `reset role`);
  ok(mine.n > 0 && mine.who === 1, `an athlete reads only their own facts (${mine.n} rows, 1 athlete)`);
  ok(/permission denied/i.test(denied), 'and cannot write one', denied);
  ok(prof && prof.ready && prof.athlete_id === 'zz_one' && prof.career.level >= 1 && prof.numbers.weeks_held.best >= 1,
     `get_profile() answers the athlete: level ${prof && prof.career.level} (${prof && prof.career.rank}), ${prof && prof.career.xp} XP, season ${prof && prof.season.points}, `
     + `numbers ${JSON.stringify(prof && prof.numbers)}`);
  ok(/not your profile/.test(other), 'but not about another athlete', other);
  ok(/permission denied/i.test(internal), 'and the backfill is not theirs to run', internal);
  ok(rulesSeen.n === 1, 'the rulebook is readable by anyone signed in');
  const every = await one(db, `select count(*)::int as n, count(distinct athlete_id)::int as who from public.career_facts`);
  await asCoach(db);
  await q(db, `set role authenticated`);
  const all = await one(db, `select count(*)::int as n, count(distinct athlete_id)::int as who from public.career_facts`);
  const coachProf = (await one(db, `select public.get_profile('zz_one') as p`)).p;
  await q(db, `reset role`);
  await asNobody(db);
  ok(all.n === every.n && all.who === every.who && coachProf.athlete_id === 'zz_one',
     `the coach reads every fact (${all.n} rows, ${all.who} athlete${all.who === 1 ? '' : 's'}) and any profile`);
  await q(db, `set role anon`);
  let anon = '';
  try { await q(db, `select count(*) from public.career_facts`); } catch (e) { anon = e.message; }
  await q(db, `reset role`);
  ok(/permission denied/i.test(anon), 'the anonymous key reads nothing', anon);
  // Home's Hold Serve row (program.html, 2026-10-17): the athlete's own read, counted by holdCount(), is get_profile()'s weeks held.
  const holdCount = appFn('holdCount');
  const own = holdCount(ownWeeks);
  ok(ownWeeks.length > 0 && own.now === prof.numbers.weeks_held.now && own.best === prof.numbers.weeks_held.best,
     `Home's Hold Serve row counts the athlete's own read (${ownWeeks.length} weeks) as get_profile() does: ${own.now} in a row, best ${own.best}`,
     JSON.stringify({ app: { now: own.now, best: own.best }, server: prof.numbers.weeks_held }));
  const holdIds = (await q(db, `select distinct athlete_id as id from public.career_facts where kind in ('week_held', 'week_broken') order by 1`)).map(r => r.id);
  const holdOff = [];
  for (const id of holdIds) {
    const p = (await one(db, `select public.get_profile($1) as p`, [id])).p, c = holdCount(await q(db, HOLD_SQL, [id]));
    if (!p.ready || c.now !== p.numbers.weeks_held.now || c.best !== p.numbers.weeks_held.best)
      holdOff.push(`${id}: holdCount() ${c.now} now, ${c.best} best; get_profile() ${JSON.stringify(p.numbers && p.numbers.weeks_held)}`);
  }
  ok(holdIds.length > 0 && holdOff.length === 0, `and for every athlete with training weeks (${holdIds.length})`, holdOff.join('\n'));

  section('8. a broken Career Mode never stops a save');
  await q(db, `insert into public.career_rules (version, rules) values (99, '{"version": 99, "habits": {"targets": "not an object"}, "level": {}}')`);
  await asAthlete(db, U2, 'zz_two');
  let saveErr = '';
  try {
    await q(db, `select public.save_progress('zz_two', 'Zed Two', $1::jsonb, null, null)`,
            [JSON.stringify({ zz_two_hab_log: JSON.stringify({ [today]: { water: 8, steps: 3000 } }) })]);
    await q(db, `select public.save_session('zz_two', 'Zed Two', 1, current_date, '{"status":"Complete"}'::jsonb, null)`);
  } catch (e) { saveErr = e.message; }
  await asNobody(db);
  ok(!saveErr && (await q(db, `select 1 from public.athlete_progress where athlete_id = 'zz_two'`)).length === 1
     && (await q(db, `select 1 from public.session_history where athlete_id = 'zz_two'`)).length === 1,
     'with a rulebook that breaks the scorer, the Proof save and the session save still go through', saveErr);
  await q(db, `delete from public.career_rules where version = 99`);
  await q(db, `select public.career_backfill('zz_two')`);
  ok(Number((await one(db, `select count(*) as n from public.career_facts where athlete_id = 'zz_two' and void_at is null`)).n) > 0,
     'once the rulebook is right again, the backfill catches up with what was saved meanwhile');

  section('9. the backfill twice changes nothing');
  const before = await one(db, `select count(*)::int as n, max(updated_at)::text as at, md5(string_agg(athlete_id || kind || ref || day || value::text || coalesce(void_at::text, ''), ',' order by athlete_id, kind, ref)) as h from public.career_facts`);
  await q(db, `select public.career_backfill()`);
  const after = await one(db, `select count(*)::int as n, max(updated_at)::text as at, md5(string_agg(athlete_id || kind || ref || day || value::text || coalesce(void_at::text, ''), ',' order by athlete_id, kind, ref)) as h from public.career_facts`);
  ok(before.n === after.n && before.at === after.at && before.h === after.h, `a second backfill rewrites nothing (${after.n} facts, the newest still ${after.at})`);

  section('10. an erasure takes the facts with it');
  await asCoach(db);
  const dry = (await one(db, `select public.coach_erase_person('athlete', 'zz_two', null, '{}'::uuid[], true) as r`)).r;
  const real = (await one(db, `select public.coach_erase_person('athlete', 'zz_two', 'zz_two', '{}'::uuid[], false) as r`)).r;
  await asNobody(db);
  ok(dry.ok && dry.counts.career_facts > 0, `the dry run lists career_facts (${dry.counts && dry.counts.career_facts} rows) and changes nothing`, JSON.stringify(dry));
  ok(real.ok && (await q(db, `select 1 from public.career_facts where athlete_id = 'zz_two'`)).length === 0, 'the real run leaves no fact of theirs', JSON.stringify(real));

  console.log(`\n${failed ? 'FAIL' : 'OK'}: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
