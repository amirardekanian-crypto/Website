// Rehearses supabase/stage109_optional_day.sql (an optional programme day is never part of the week's plan) on PGlite. Nothing live, no real
// athlete: every id here is made up.
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/career/rehearse_optional.mjs
//
// The structure BEFORE stage109 (the snapshot without it), the working tree's rulebook seeded, then:
//   1. before: a week with Days 1 and 2 done and the optional Day 3 not done is BROKEN (every id was a plan day);
//   2. stage109, twice: the same week is HELD; a week with all three days is held with 2 plan sessions; a week with Day 1 and the optional Day 3
//      but no Day 2 is still broken (an optional day never stands in for a plan day); an athlete with no optional day moves not at all;
//   3. a past cycle read from program_versions and from programHistory leaves its optional day out of the plan too;
//   4. the way back (scripts/career/rollback_stage109.sql) puts career_weeks() back EXACTLY, then stage109 again.
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, py, snapshotWithout } from './rehearse_lib.mjs';

let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => { if (c) { passed++; console.log('  ok   ' + what); } else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 500) : '')); } };
const section = s => console.log('\n' + s);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const ymd = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };

async function main() {
  const db = await openDb();
  const q = (sql, p) => db.query(sql, p || []);
  const val = async (sql, p) => { const r = (await q(sql, p)).rows[0]; return r ? Object.values(r)[0] : null; };
  const def = () => val(`select pg_get_functiondef('public.career_weeks(text)'::regprocedure)`);

  section('0. the structure before stage109, the working tree\'s rulebook, made-up athletes');
  const snap = snapshotWithout(/stage109/);
  console.log('  ·    from ' + snap.says);
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  await runSql(db, snap.sql, 'snapshot');
  await db.exec(`set timezone = 'UTC'`);
  const before = await def();
  ok(!/stage109/.test(before), 'career_weeks() is the body before stage109');
  const seed = py([path.join(ROOT, 'scripts', 'career_seed.py'), path.join(ROOT, 'career'), '--json']);
  if (seed.status !== 0) throw new Error('career_seed.py --json failed: ' + seed.stderr);
  const P = JSON.parse(seed.stdout);
  // The rules row alone (career_seed() refuses both switches in one seed on an empty database; the catalogue plays no part in a week).
  await q(`insert into public.career_rules (version, rules, source, starts_on) values ($1, $2::jsonb, 'rehearsal', null)`, [P.version, JSON.stringify(P.rules)]);
  ok(!!(await val(`select public.career_rules_now()`)), 'a rulebook is in force (version ' + P.version + ')');

  // A four-week cycle that started 35 days ago: every week has closed. Week 1 Days 1+2, week 2 Days 1+2+3, week 3 Days 1+3, week 4 nothing.
  const today = ymd(new Date());
  const start = addDays(today, -35), end = addDays(start, 27);
  const days = opt => [{ id: 1, title: 'A', blocks: [] }, { id: 2, title: 'B', blocks: [] }, Object.assign({ id: 3, title: 'Zone 2', blocks: [] }, opt ? { optional: true } : {})];
  const prog = opt => ({ athlete: { id: 'x', firstName: 'X', lastName: 'Test' }, currentCycleIndex: 0,
    cycles: [{ num: 1, name: 'One', startDate: start, endDate: end }], workouts: { days: days(opt) } });
  const sessions = [[0, 1], [1, 2], [7, 1], [8, 2], [9, 3], [14, 1], [16, 3]];
  for (const [id, opt] of [['zz_opt', true], ['zz_ctl', false]]) {
    await q(`insert into public.programs (athlete_id, data) values ($1, $2::jsonb)`, [id, JSON.stringify(prog(opt))]);
    for (const [off, day] of sessions) await q(`insert into public.session_history (athlete_id, day, completed_on) values ($1, $2, $3::date)`, [id, day, addDays(start, off)]);
  }
  const weeks = async id => {
    await q(`select public.career_derive($1)`, [id]);
    const r = await q(`select kind, value from public.career_facts where athlete_id = $1 and kind in ('week_held', 'week_broken') and void_at is null order by day, ref`, [id]);
    return r.rows.map(x => ({ w: Number(x.value.week), k: x.kind === 'week_held' ? 'held' : 'broken', s: Number(x.value.sessions), p: Number(x.value.plan) }));
  };
  const plan = async id => (await q(`select plan from public.career_weeks($1) where week = 1 order by cycle_index`, [id])).rows.map(r => r.plan);

  section('1. before stage109: every day is a plan day');
  const b1 = await weeks('zz_opt');
  ok(eq(await plan('zz_opt'), [['1', '2', '3']]), 'the plan is Days 1, 2 and 3', await plan('zz_opt'));
  ok(b1.find(x => x.w === 1)?.k === 'broken', 'week 1 (Days 1 and 2, no Day 3) is broken', b1);
  const ctlBefore = await weeks('zz_ctl');

  section('2. stage109, twice');
  const stage = read(path.join(ROOT, 'supabase', 'stage109_optional_day.sql'));
  await runSql(db, stage, 'stage109');
  const after = await def();
  await runSql(db, stage, 'stage109 again');
  ok(after === await def(), 'a second run changes nothing');
  ok(/stage109/.test(after), 'career_weeks() is the stage109 body');
  ok(eq(await plan('zz_opt'), [['1', '2']]), 'the optional Day 3 is out of the plan', await plan('zz_opt'));
  ok(eq(await plan('zz_ctl'), [['1', '2', '3']]), 'an athlete with no optional day keeps all three', await plan('zz_ctl'));
  const a1 = await weeks('zz_opt');
  const W = n => a1.find(x => x.w === n) || {};
  ok(W(1).k === 'held' && W(1).p === 2 && W(1).s === 2, 'week 1 (Days 1 and 2, no optional Day 3) is HELD, 2 of 2', W(1));
  ok(W(2).k === 'held' && W(2).s === 2, 'week 2 (all three) is held, the optional session not counted as a plan session', W(2));
  ok(W(3).k === 'broken', 'week 3 (Day 1 and the optional Day 3, no Day 2) is still broken: an optional day never stands in for a plan day', W(3));
  ok(W(4).k === 'broken', 'week 4 (nothing) is broken', W(4));
  ok(eq(await weeks('zz_ctl'), ctlBefore), 'the athlete with no optional day: every week exactly as before', { before: ctlBefore });
  // A session on the optional day still pays as a session: career_facts_paid() finds no plan week for it and keys its limit on the ISO week.
  const d3 = (await q(`select count(*)::int as n from public.career_facts where athlete_id = 'zz_opt' and kind = 'session_finished' and ref like 'd3|%' and void_at is null`)).rows[0].n;
  const paid3 = (await q(`select coalesce(sum(p.xp), 0)::int as xp, count(*)::int as n from public.career_facts_paid('zz_opt') p where p.kind = 'session_finished' and p.ref like 'd3|%'`)).rows[0];
  ok(d3 === 2 && paid3.n === 2 && paid3.xp === 2 * Number(P.rules.fact.session_finished.xp), 'both optional Day 3 sessions are session facts and each pays a session\'s XP', { d3, paid3 });

  section('3. a past cycle leaves its optional day out too');
  const twoCycles = { athlete: { id: 'p', firstName: 'P', lastName: 'Test' }, currentCycleIndex: 1,
    cycles: [{ num: 1, startDate: addDays(start, -28), endDate: addDays(start, -1) }, { num: 2, startDate: start, endDate: end }],
    workouts: { days: days(false) } };
  await q(`insert into public.programs (athlete_id, data) values ('zz_ver', $1::jsonb)`, [JSON.stringify(twoCycles)]);
  await q(`insert into public.program_versions (athlete_id, data) values ('zz_ver', $1::jsonb)`,
    [JSON.stringify(Object.assign({}, twoCycles, { currentCycleIndex: 0, workouts: { days: days(true) } }))]);
  ok(eq(await plan('zz_ver'), [['1', '2'], ['1', '2', '3']]), 'from program_versions: cycle 1 without its optional day, cycle 2 (none optional) whole', await plan('zz_ver'));
  await q(`insert into public.programs (athlete_id, data) values ('zz_hist', $1::jsonb)`,
    [JSON.stringify(Object.assign({}, twoCycles, { programHistory: [{ id: 'prog1', days: days(true) }] }))]);
  ok(eq(await plan('zz_hist'), [['1', '2'], ['1', '2', '3']]), 'from programHistory: cycle 1 without its optional day', await plan('zz_hist'));

  section('4. the way back, then stage109 again');
  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage109.sql')), 'rollback109');
  ok((await def()) === before, 'rollback_stage109.sql puts career_weeks() back exactly');
  ok(eq(await plan('zz_opt'), [['1', '2', '3']]), 'and the optional day is a plan day again');
  await runSql(db, stage, 'stage109 after the rollback');
  ok((await def()) === after, 'stage109 goes on again cleanly');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) { console.log('FAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(1); });
