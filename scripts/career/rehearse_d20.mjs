// Rehearses supabase/stage76_career_forward_only.sql (D20: a change of rules applies forward only) on PGlite. Nothing live, no real athlete.
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/career/rehearse_d20.mjs
//
// The live structure (supabase/schema_snapshot.sql), the rulebook and catalogue as career/*.toml has them (version 3, both switches on), made-up
// athletes whose sessions go in through the real triggers (facts and awards made as live), then stage76 twice, and:
//   1. nothing moves on the day it goes on (every made-up athlete's paid facts and awards equal before and after);
//   2. an award keeps the XP it was minted with when the catalogue's price changes (D12 reversed);
//   3. career_d20_check() refuses what would re-work the past, and lets the rest through;
//   4. a new version 4 with a start day: facts before it keep their prices, a fact on the day gets the new one, the version in force by day;
//   5. a reward a new rule reveals for an earlier day is dated the start day;
//   6. the same version seeded again: a rename passes, a price change is refused;
//   7. the way back refuses while a version has a start day, then (with it gone) puts every function back exactly; stage76 again.
// The real numbers are proved on the live project by a dry run inside a rolled-back transaction (career/PROCEDURES.md → Stage 76).
import fs from 'node:fs';
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, py, snapshotWithout } from './rehearse_lib.mjs';

let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => { if (c) { passed++; console.log('  ok   ' + what); } else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 400) : '')); } };
const section = s => console.log('\n' + s);
const q = (db, sql, p) => db.query(sql, p || []);
const one = async (db, sql, p) => (await q(db, sql, p)).rows[0];
const val = async (db, sql, p) => { const r = await one(db, sql, p); return r ? Object.values(r)[0] : null; };
const raises = async (p, re) => { try { await p; return false; } catch (e) { return re ? re.test(String(e.message || e)) : true; } };
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const FNS = ['career_facts_paid(text)', 'career_compare(date)', 'career_rewards_line(text,jsonb,jsonb)', 'career_rewards_profile(text,jsonb)',
             'get_awards(text)', 'career_mint(text,text,text,integer,text,date,jsonb,jsonb,jsonb,text,jsonb)', 'career_seed(integer,jsonb,jsonb,text,boolean)'];
const defs = async db => { const o = {}; for (const f of FNS) o[f] = await val(db, `select pg_get_functiondef('public.${f}'::regprocedure)`); return o; };
const paid = async (db, id) => (await q(db, `select kind, ref, day::text as day, xp::float as xp from public.career_facts_paid($1) order by kind, ref`, [id])).rows;
const sum = rows => rows.reduce((a, r) => a + Number(r.xp), 0);

async function main() {
  const t0 = Date.now();
  const db = await openDb();
  const today = await val(db, `select current_date::text`);
  section('0. the live structure, the rulebook and catalogue of career/*.toml, made-up athletes through the real triggers');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/career_d20_check/);
  console.log('  ·    the structure starts from ' + snap.says);
  await runSql(db, snap.sql, 'snapshot');
  ok(!(await val(db, `select to_regprocedure('public.career_d20_check(integer,jsonb,jsonb)')::text`)), 'the snapshot does not hold stage76 yet');
  const xpRow = JSON.parse(read(path.join(ROOT, 'supabase', 'xp_rules_snapshot.json')));
  await q(db, `insert into public.xp_rules (id, rules) values (1, $1::jsonb)`, [JSON.stringify(xpRow.rules)]);
  const seed = py([path.join(ROOT, 'scripts', 'career_seed.py'), '--json']);
  if (seed.status !== 0) throw new Error('career_seed.py --json failed: ' + seed.stderr);
  const P = JSON.parse(seed.stdout);
  // Century's first tier at 3 sessions (25 in the files), so a made-up athlete with five sessions holds a paying award to test
  P.catalogue.find(x => x.kind === 'badge' && x.id === 'century').body.tiers[0].at = 3;
  await q(db, `insert into public.career_rules (version, rules, source, loaded_at) values ($1, $2::jsonb, 'rehearsal', now())`, [P.version, JSON.stringify(P.rules)]);
  await q(db, `insert into public.career_catalogue (kind, id, body, version, loaded_at) select x.kind, x.id, x.body, $2, now() from jsonb_to_recordset($1::jsonb) as x(kind text, id text, body jsonb)`, [JSON.stringify(P.catalogue), P.version]);
  ok(P.version === 3 && P.rules.switch && /^\d{4}-/.test(P.rules.switch.catalogue || ''), `the rulebook is version ${P.version} with both switches on (${JSON.stringify(P.rules.switch)})`);
  const prog = JSON.stringify({ athlete: { firstName: 'Zed' }, workouts: { days: [{ id: 1 }, { id: 2 }, { id: 3 }] }, cycles: [], currentCycleIndex: 0 });
  for (const id of ['zz_d20_a', 'zz_d20_b']) await q(db, `insert into public.programs (athlete_id, data) values ($1, $2::jsonb)`, [id, prog]);
  const session = (id, day, on) => q(db, `insert into public.session_history (athlete_id, athlete_name, day, completed_on, status, session_rpe, duration_min, summary)
                                          values ($1, 'Zed', $2, $3::date, 'Complete', 7, 50, '') on conflict do nothing`, [id, day, on]);
  for (const [day, off] of [[1, 12], [2, 11], [3, 10], [1, 5], [2, 4]]) await session('zz_d20_a', day, addDays(today, -off));
  for (const [day, off] of [[1, 12], [2, 11], [3, 10]]) await session('zz_d20_b', day, addDays(today, -off));
  for (const id of ['zz_d20_a', 'zz_d20_b']) { await q(db, `select public.career_scored($1)`, [id]); await q(db, `select public.career_evaluate($1, null, 'silent')`, [id]); }
  const nA = await val(db, `select count(*)::int from public.career_facts where athlete_id = 'zz_d20_a' and kind = 'session_finished' and void_at is null`);
  const awA = await val(db, `select count(*)::int from public.career_awards where athlete_id = 'zz_d20_a'`);
  ok(nA === 5 && awA > 0, `the triggers made the facts (5 sessions) and the awards (${awA}) of a made-up athlete`);
  const before = { a: await paid(db, 'zz_d20_a'), b: await paid(db, 'zz_d20_b') };
  const defs0 = await defs(db);

  section('1. stage76 goes on, twice, and moves nothing');
  const stage = read(path.join(ROOT, 'supabase', 'stage76_career_forward_only.sql'));
  await runSql(db, stage, 'stage76'); await runSql(db, stage, 'stage76 again');
  ok(true, 'stage76 applied, and applied again without an error');
  const defs1 = await defs(db);
  for (const f of FNS.slice(1, 5)) ok(defs1[f].split('stage76: minted XP').length === 2 && !defs1[f].includes('career_award_xp('), `${f.split('(')[0]}() reads the minted XP, patched once`);
  ok(defs1[FNS[5]].split('stage76 (D20)').length === 2 && defs1[FNS[6]].split('career_d20_check(').length === 2 && defs1[FNS[6]].includes('starts_on) values'), 'career_mint() and career_seed() are patched once each');
  for (const f of FNS.slice(1)) {
    const back = defs1[f].replace(/ \/\* stage76: minted XP \*\//g, '').replace('aw.xp', 'coalesce(public.career_award_xp(aw.kind, aw.tier, aw.subject, c.body, v_r), aw.xp)');
    if (f.startsWith('career_compare')) ok(back === defs0[f], 'career_compare() differs from before only by the one expression');
  }
  const after = { a: await paid(db, 'zz_d20_a'), b: await paid(db, 'zz_d20_b') };
  ok(JSON.stringify(after) === JSON.stringify(before), `every paid fact and award of both athletes is the same (${sum(after.a)} and ${sum(after.b)} XP)`, { before: sum(before.a), after: sum(after.a) });
  ok((await val(db, `select count(*)::int from public.career_rules where starts_on is not null`)) === 0, 'no version has a start day: the loaded versions count from always');
  ok((await val(db, `select (public.career_rules_on(current_date) ->> 'version')::int`)) === 3, 'career_rules_on(today) is version 3');

  section('2. an award keeps the XP it was minted with (D12 reversed)');
  const aw = await one(db, `select a.award_id, a.kind, a.item, a.tier, a.xp from public.career_awards a where a.athlete_id = 'zz_d20_a' and a.pays and a.xp > 0 order by a.award_id limit 1`);
  await q(db, `begin`);
  if (aw.kind === 'badge') await q(db, `update public.career_catalogue set body = jsonb_set(body, array['tiers', ($1 - 1)::text, 'xp'], to_jsonb(9999)) where kind = 'badge' and id = $2`, [aw.tier, aw.item]);
  else await q(db, `update public.career_catalogue set body = jsonb_set(body, '{xp}', to_jsonb(9999)) where kind = $1 and id = $2`, [aw.kind, aw.item]);
  const kept = await val(db, `select xp::float from public.career_facts_paid('zz_d20_a') where kind = 'award' and ref = $1`, [aw.award_id]);
  await q(db, `rollback`);
  ok(Number(kept) === Number(aw.xp), `${aw.award_id}: the catalogue now says 9999 and the score still pays its minted ${aw.xp}`, { kept, minted: aw.xp });

  section('3. career_d20_check(): what it refuses and what it lets through');
  const R3 = P.rules, C3 = P.catalogue;
  const chk = (v, rules, cat) => q(db, `select public.career_d20_check($1, $2::jsonb, $3::jsonb)`, [v, JSON.stringify(rules), JSON.stringify(cat || C3)]);
  const clone = x => JSON.parse(JSON.stringify(x));
  ok(!(await raises(chk(3, R3))), 'the same version with nothing changed passes');
  { const r = clone(R3); r.meanings = r.meanings; const c = clone(C3); const b = c.find(x => x.kind === 'badge' && x.id === 'century'); b.body.name = 'Century Club'; b.body.caption = 'A rename.';
    ok(!(await raises(chk(3, r, c))), 'the same version with a badge renamed and re-captioned passes (a rename changes only the label)'); }
  { const r = clone(R3); r.fact.session_finished.xp = 450; ok(await raises(chk(3, r), /same version may change only names/), 'the same version with a session worth 450 is refused'); }
  { const r = clone(R3); r.fact.session_finished.when = 'A new sentence.'; ok(!(await raises(chk(3, r))), 'the same version with a fact\'s sentence changed passes'); }
  { const c = clone(C3); const b = c.find(x => x.kind === 'badge' && x.id === 'century'); b.body.tiers[0].xp = 999;
    ok(await raises(chk(3, R3, c), /catalogue changed more than its names/), 'the same version with a tier\'s XP changed is refused'); }
  const R4 = clone(R3); R4.version = 4; R4.starts_on = today; R4.fact.session_finished.xp = 450;
  ok(!(await raises(chk(4, R4))), 'a new version 4 with starts_on today and a session worth 450 passes');
  { const r = clone(R4); delete r.starts_on; ok(await raises(chk(4, r), /needs starts_on = today/), 'a new version with no start day is refused'); }
  { const r = clone(R4); r.starts_on = addDays(today, -5); ok(await raises(chk(4, r), /needs starts_on = today/), 'a new version that starts five days ago is refused'); }
  { const r = clone(R4); r.starts_on = addDays(today, 3); ok(await raises(chk(4, r), /needs starts_on = today/), 'a new version that starts in three days is refused'); }
  { const r = clone(R4); r.level = Object.assign({}, r.level, { base: (r.level.base || 0) + 1 }); ok(await raises(chk(4, r), /\[level\] cannot change forward only/), 'a new version with the level curve changed is refused'); }
  { const r = clone(R4); r.habits = Object.assign({}, r.habits, { lapse_days: (r.habits.lapse_days || 3) + 1 }); ok(await raises(chk(4, r), /\[habits\] cannot change forward only/), 'a new version with the habits changed is refused'); }
  { const r = clone(R4); const k = Object.keys(r.fact).find(x => r.fact[x].min_share != null);
    if (k) { r.fact[k].min_share = 0.5; ok(await raises(chk(4, r), /how the fact .* is worked out changed/), `a new version that changes how ${k} is worked out (min_share) is refused`); } }
  { const r = clone(R4); r.fact.session_finished.limit = 2; ok(!(await raises(chk(4, r))), 'a new version that changes a cap passes (applied by day)'); }

  section('4. version 4 seeded with a start day: prices by day');
  const C4 = clone(C3); const cen = C4.find(x => x.kind === 'badge' && x.id === 'century'); cen.body.tiers[1].at = 4;   // a rule change that reveals an earlier crossing (tier 2 at 4)
  const s4 = await one(db, `select public.career_seed(4, $1::jsonb, $2::jsonb, 'rehearsal v4', false) as r`, [JSON.stringify(R4), JSON.stringify(C4)]);
  ok(s4.r && s4.r.version === 4, 'career_seed(4) went through', s4.r);
  ok((await val(db, `select starts_on::text from public.career_rules where version = 4`)) === today && (await val(db, `select count(*)::int from public.career_rules where starts_on is not null`)) === 1,
     'version 4 is stored with its start day (today); the earlier versions keep none');
  ok((await val(db, `select (public.career_rules_on(current_date - 1) ->> 'version')::int`)) === 3 && (await val(db, `select (public.career_rules_on(current_date) ->> 'version')::int`)) === 4,
     'yesterday is priced by version 3, today by version 4');
  await session('zz_d20_a', 3, today);
  await q(db, `select public.career_scored('zz_d20_a')`);
  const pa = await paid(db, 'zz_d20_a');
  const old = pa.filter(r => r.kind === 'session_finished' && r.day < today), neu = pa.filter(r => r.kind === 'session_finished' && r.day === today);
  ok(old.length === 5 && old.every(r => r.xp === Number(R3.fact.session_finished.xp)) && neu.length === 1 && neu[0].xp === 450,
     `the five sessions before keep ${R3.fact.session_finished.xp} XP; today's earns 450`, pa.filter(r => r.kind === 'session_finished'));
  ok(JSON.stringify(pa.filter(r => r.kind === 'award' && before.a.some(b => b.ref === r.ref))) === JSON.stringify(before.a.filter(r => r.kind === 'award')), 'every award minted before keeps its XP');

  section('5. a reward the new rule reveals for an earlier day is dated the start day');
  await q(db, `select public.career_evaluate('zz_d20_a', null, 'silent')`);
  const c1 = await one(db, `select day::text as day, how from public.career_awards where athlete_id = 'zz_d20_a' and award_id = 'badge:century:2'`);
  ok(c1 && c1.day === today, `Century's second tier, now at 4 sessions, is minted for an athlete whose fourth session was 5 days ago, dated ${c1 && c1.day} (the start day), not back-dated`, c1);

  section('6. the same version seeded again');
  { const c = clone(C4); c.find(x => x.kind === 'badge' && x.id === 'century').body.name = 'Century Club';
    ok(!(await raises(q(db, `select public.career_seed(4, $1::jsonb, $2::jsonb, 'rename', false)`, [JSON.stringify(R4), JSON.stringify(c)])))
       && (await val(db, `select starts_on::text from public.career_rules where version = 4`)) === today, 'a rename of version 4 goes through and keeps the start day'); }
  { const r = clone(R4); r.fact.session_finished.xp = 500;
    ok(await raises(q(db, `select public.career_seed(4, $1::jsonb, $2::jsonb, 'retune', false)`, [JSON.stringify(r), JSON.stringify(C4)]), /same version may change only names/), 'a price change at version 4 is refused (it would be version 5)'); }

  section('7. the way back');
  const rb = read(path.join(ROOT, 'scripts', 'career', 'rollback_stage76.sql'));
  ok(await raises(runSql(db, rb, 'rollback'), /start day is loaded/), 'the way back refuses while a version has a start day');
  await q(db, `rollback`).catch(() => {});
  await q(db, `delete from public.career_rules where version = 4`);
  await runSql(db, rb, 'rollback'); await runSql(db, rb, 'rollback again');
  const defs2 = await defs(db);
  for (const f of FNS) ok(defs2[f] === defs0[f], `${f.split('(')[0]}() is exactly as before stage76`);
  ok(!(await val(db, `select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'career_rules' and column_name = 'starts_on'`))
     && !(await val(db, `select to_regprocedure('public.career_d20_check(integer,jsonb,jsonb)')::text`)), 'the column and the helpers are gone');
  await runSql(db, stage, 'stage76 after the way back');
  ok(await val(db, `select to_regprocedure('public.career_d20_check(integer,jsonb,jsonb)')::text`), 'stage76 goes on again after the way back');

  console.log(`\n${failed ? 'FAIL' : 'OK'}: ${passed} passed, ${failed} failed (${Math.round((Date.now() - t0) / 1000)} s)`);
  if (failed) fails.forEach(f => console.log('  - ' + f));
  process.exitCode = failed ? 1 : 0;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
