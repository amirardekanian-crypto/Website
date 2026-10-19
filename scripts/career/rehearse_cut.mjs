// Rehearses supabase/stage78_career_cut.sql (the cut: rank names, titles, the Grand Slam, skins and every badge but the four marks leave the server)
// on PGlite. Nothing live, no real athlete.
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/career/rehearse_cut.mjs
//
// The live structure (supabase/schema_snapshot.sql, stage77), the rulebook and catalogue as they were BEFORE the cut (career/*.toml at the last
// commit that still has every badge: 2746b4d, or --rev), made-up athletes holding every kind of award (a mark, an achievement, badges that leave,
// a badge that never paid, a title, the Grand Slam), moments waiting for some, season titles in hab_titles, a title worn on the board; then:
//   1. stage78, twice: every athlete's paid XP, by day, career XP, level, season points and week points are what they were (L6);
//   2. what left: the awards of the badges that go and the titles, their waiting moments, hab_titles, the worn title; what stayed: the marks,
//      the achievements, their moments; one nameless `award_kept` fact per paying award that left, with its XP and its day, saying nothing else;
//   3. the answers: get_profile() has no rank name, no titles, no Grand Slam, keeps `owned` and `ladder`; career_compute() has no rank;
//      leaderboard_top() and roll_call() answer null titles and ranks; set_title() clears; claim_titles() answers nothing and mints nothing;
//      hab_close_season() and career_mint() write no title;
//   4. rulebook version 4 seeded from the working tree's career/ (the cut catalogue): four badges, no title, no skin, the achievements kept with no
//      title; career_d20_check() lets it through; still nobody's number moved;
//   5. the way back (scripts/career/rollback_stage78.sql) puts every row, the catalogue, the rulebook versions and every function back exactly;
//      stage78 again after it.
// The real numbers are proved on the live project by a dry run inside a rolled-back transaction (career/PROCEDURES.md → Stage 78).
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, py, filesAt, withRulebook, snapshotWithout } from './rehearse_lib.mjs';

let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => { if (c) { passed++; console.log('  ok   ' + what); } else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 500) : '')); } };
const section = s => console.log('\n' + s);
const q = (db, sql, p) => db.query(sql, p || []);
const one = async (db, sql, p) => (await q(db, sql, p)).rows[0];
const val = async (db, sql, p) => { const r = await one(db, sql, p); return r ? Object.values(r)[0] : null; };
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// The catalogue the live project held before the cut: career/*.toml at main's last commit before stage78 (2746b4d, 2026-10-19).
const revArg = (() => { const i = process.argv.indexOf('--rev'); return i > 0 ? process.argv[i + 1] : '2746b4d'; })();
const IDS = ['zz_cut_a', 'zz_cut_b', 'zz_cut_c'];
const FNS = ['career_facts_paid(text)', 'career_compute(text)', 'career_mint(text,text,text,integer,text,date,jsonb,jsonb,jsonb,text,jsonb)', 'get_profile(text)',
             'leaderboard_top(text,text,text,integer)', 'roll_call(text,text,integer)', 'set_title(text,text,text)', 'claim_titles(text,text)',
             'hab_mint_titles(text)', 'hab_close_season(date)', 'career_compare(date)'];
const defs = async db => { const o = {}; for (const f of FNS) o[f] = await val(db, `select pg_get_functiondef('public.${f}'::regprocedure)`); return o; };
// What must never move (L6): every paid line by day, and the score's numbers.
const numbers = async (db, id) => {
  const byDay = (await q(db, `select day::text as day, sum(xp)::float as xp from public.career_facts_paid($1) where xp <> 0 group by day order by day`, [id])).rows;   // a line paying 0 (a title) is no number
  const c = await val(db, `select public.career_compute($1)`, [id]);
  return { byDay: byDay.map(r => r.day + ':' + r.xp).join(','), xp: c.career.xp, level: c.career.level, season: c.season.points, week: c.week.points };
};
const hash = async (db, t) => val(db, `select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.${t} x`);

async function main() {
  const t0 = Date.now();
  const db = await openDb();
  const today = await val(db, `select current_date::text`);
  section('0. the live structure, the catalogue before the cut (career/*.toml at ' + revArg + '), made-up athletes holding every kind of award');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  // stage78 is live (2026-10-19), so the working snapshot holds it: the rehearsal starts from the last committed snapshot without it
  const snap = snapshotWithout(/award_kept/);
  console.log('  ·    the structure starts from ' + snap.says);
  ok(!/award_kept/.test(snap.sql), 'the snapshot it starts from does not hold stage78');
  await runSql(db, snap.sql, 'snapshot');
  const xpRow = JSON.parse(read(path.join(ROOT, 'supabase', 'xp_rules_snapshot.json')));
  await q(db, `insert into public.xp_rules (id, rules) values (1, $1::jsonb)`, [JSON.stringify(xpRow.rules)]);
  const oldDir = filesAt(revArg);
  const old = py([path.join(oldDir, 'scripts', 'career_seed.py'), path.join(oldDir, 'career'), '--json']);
  if (old.status !== 0) throw new Error('career_seed.py --json at ' + revArg + ' failed: ' + old.stderr);
  const P = JSON.parse(old.stdout);
  ok(P.catalogue.filter(r => r.kind === 'badge').length > 4 && P.catalogue.some(r => r.kind === 'title'), `the catalogue before the cut holds ${P.catalogue.filter(r => r.kind === 'badge').length} badges and ${P.catalogue.filter(r => r.kind === 'title').length} titles (version ${P.version})`);
  await q(db, `insert into public.career_rules (version, rules, source, loaded_at) values ($1, $2::jsonb, 'rehearsal', now())`, [P.version, JSON.stringify(P.rules)]);
  await q(db, `insert into public.career_catalogue (kind, id, body, version, loaded_at) select x.kind, x.id, x.body, $2, now() from jsonb_to_recordset($1::jsonb) as x(kind text, id text, body jsonb)`, [JSON.stringify(P.catalogue), P.version]);
  await q(db, `insert into public.seasons (starts_on, name) values ($1::date, 'Season 2')`, [addDays(today, -30)]).catch(async () => {
    await q(db, `insert into public.seasons (starts_on) values ($1::date)`, [addDays(today, -30)]);
  });
  const prog = JSON.stringify({ athlete: { firstName: 'Zed' }, workouts: { days: [{ id: 1 }, { id: 2 }] }, cycles: [], currentCycleIndex: 0 });
  for (const id of IDS) {
    await q(db, `insert into public.programs (athlete_id, data) values ($1, $2::jsonb)`, [id, prog]);
    await q(db, `insert into public.athlete_keys (athlete_id, secret_key) values ($1, 'k')`, [id]);
    await q(db, `insert into public.leaderboard_optin (athlete_id, display_name, title) values ($1, $2, $3)`, [id, 'Zed ' + id.slice(-1), id === 'zz_cut_a' ? 'clockwork' : null]);
    // sessions go in through the real triggers (a seed works every fact out again from the sources, so a fact written by hand would go)
    for (const [day, off] of [[1, 40], [2, 39], [1, 20], [2, 5]]) {
      await q(db, `insert into public.session_history (athlete_id, athlete_name, day, completed_on, status, session_rpe, duration_min, summary)
                   values ($1, 'Zed', $2, $3::date, 'Complete', 7, 50, '') on conflict do nothing`, [id, day, addDays(today, -off)]);
    }
  }
  // the awards: [id, award_id, kind, item, tier, day offset, pays, xp, size, meaning]
  const AW = [
    ['zz_cut_a', 'badge:held_weeks:1', 'badge', 'held_weeks', 1, -45, true, 200, 'highlight', 'consistency'],   // a mark: stays
    ['zz_cut_a', 'achievement:first_blood', 'achievement', 'first_blood', null, -50, true, 50, 'win', 'commitment'],   // stays
    ['zz_cut_a', 'badge:full_log:1', 'badge', 'full_log', 1, -44, true, 100, 'win', 'commitment'],   // last season: leaves
    ['zz_cut_a', 'badge:veteran:1', 'badge', 'veteran', 1, -3, true, 150, 'highlight', 'commitment'],   // this season and week: leaves
    ['zz_cut_a', 'badge:veteran:2', 'badge', 'veteran', 2, -3, true, 300, 'milestone', 'commitment'],   // the same day: a second nameless fact
    ['zz_cut_a', 'title:clockwork', 'title', 'clockwork', null, -10, false, 0, 'legend', 'consistency'],   // leaves, paid nothing
    ['zz_cut_a', 'title:grand_slam', 'title', 'grand_slam', null, -10, false, 0, 'legend', 'all'],
    ['zz_cut_b', 'badge:habit_water:2', 'badge', 'habit_water', 2, -12, true, 40, 'win', 'consistency'],
    ['zz_cut_b', 'badge:day_streak:1', 'badge', 'day_streak', 1, -12, false, 0, 'win', 'consistency'],   // never paid: no fact
    ['zz_cut_b', 'badge:century:1', 'badge', 'century', 1, -2, true, 300, 'highlight', 'commitment'],   // a mark
    ['zz_cut_c', 'achievement:held', 'achievement', 'held', null, -6, true, 100, 'highlight', 'consistency'],
  ];
  for (const a of AW) {
    await q(db, `insert into public.career_awards (athlete_id, award_id, kind, item, tier, subject, day, pays, xp, size, meaning, evidence, how, rules_version)
                 values ($1, $2, $3, $4, $5, '', $6::date, $7, $8, $9, $10, '{}'::jsonb, 'live', 3)`, [a[0], a[1], a[2], a[3], a[4], addDays(today, a[5]), a[6], a[7], a[8], a[9]]);
  }
  for (const [id, aw] of [['zz_cut_a', 'badge:veteran:2'], ['zz_cut_a', 'title:grand_slam'], ['zz_cut_b', 'badge:century:1'], ['zz_cut_c', 'achievement:held']]) {
    await q(db, `insert into public.career_recognition (athlete_id, award_id, audience, size) values ($1, $2, 'athlete', 'milestone')`, [id, aw]);
  }
  await q(db, `insert into public.hab_titles (athlete_id, title, earned_on) values ('zz_cut_a', 't_sn_20260901', $1::date), ('zz_cut_a', 'clockwork', $1::date), ('zz_cut_b', 'rookie_road', $1::date)`, [addDays(today, -20)]);
  await q(db, `insert into public.hab_notes (athlete_id, day, body, pct) values ('zz_cut_a', $1::date, 'Good week.', 80)`, [today]).catch(() => {});
  for (const id of IDS) await q(db, `select public.career_scored($1)`, [id]);
  ok(await val(db, `select count(*)::int from public.career_facts where athlete_id = 'zz_cut_a' and kind = 'session_finished' and void_at is null`) === 4, 'the triggers made the facts of the made-up sessions');
  const before = {}; for (const id of IDS) before[id] = await numbers(db, id);
  ok(before.zz_cut_a.xp > 0 && before.zz_cut_a.season > 0 && before.zz_cut_a.week > 0, 'the made-up athlete has career XP, season points and week points', before.zz_cut_a);
  const leaving = AW.filter(a => (a[2] === 'title' || (a[2] === 'badge' && !['held_weeks', 'century', 'bests', 'comebacks'].includes(a[3]))));
  const leavingPaid = leaving.filter(a => a[6] && a[7] > 0);
  const defs0 = await defs(db);
  const keep0 = { cat: await hash(db, 'career_catalogue'), rules: await hash(db, 'career_rules'), aw: await hash(db, 'career_awards'), rec: await hash(db, 'career_recognition'),
                  ht: await hash(db, 'hab_titles'), board: await val(db, `select string_agg(athlete_id || '=' || coalesce(title, '-'), ',' order by athlete_id) from public.leaderboard_optin`) };

  section('1. stage78, twice: nobody\'s number moves');
  const stage = read(path.join(ROOT, 'supabase', 'stage78_career_cut.sql'));
  await runSql(db, stage, 'stage78'); await runSql(db, stage, 'stage78 again');
  ok(true, 'stage78 applied, and applied again without an error');
  for (const id of IDS) {
    const after = await numbers(db, id);
    ok(JSON.stringify(after) === JSON.stringify(before[id]), `${id}: paid XP by day, career XP ${after.xp}, level ${after.level}, season ${after.season}, week ${after.week}: the same`, { before: before[id], after });
  }

  section('2. what left, what stayed, and the nameless facts');
  const left = (await q(db, `select award_id from public.career_awards order by athlete_id, award_id`)).rows.map(r => r.award_id);
  ok(JSON.stringify(left) === JSON.stringify(['achievement:first_blood', 'badge:held_weeks:1', 'badge:century:1', 'achievement:held']), 'only the marks and the achievements are awards now', left);
  const rec = (await q(db, `select award_id from public.career_recognition order by award_id`)).rows.map(r => r.award_id);
  ok(JSON.stringify(rec) === JSON.stringify(['achievement:held', 'badge:century:1']), 'the moments waiting for what left are gone, the others wait on', rec);
  ok(await val(db, `select count(*)::int from public.hab_titles`) === 0, 'hab_titles is empty (the season titles and the road\'s)');
  ok(await val(db, `select count(*)::int from public.leaderboard_optin where title is not null`) === 0, 'nobody wears a title on the board');
  const kept = (await q(db, `select athlete_id, ref, day::text as day, value from public.career_facts where kind = 'award_kept' order by athlete_id, ref`)).rows;
  ok(kept.length === leavingPaid.length, `one nameless fact per paying award that left (${kept.length} of ${leavingPaid.length}); none for a title or a badge that never paid`, kept);
  ok(kept.every(k => ['xp', 'proof,xp'].includes(Object.keys(k.value).sort().join()) && /^kept\|\d{4}-\d{2}-\d{2}\|\d{3}$/.test(k.ref)), "each says only its XP (and whether it was one of AA Proof's own), and its ref names nothing", kept.map(k => k.ref + ' ' + JSON.stringify(k.value)));
  const proofKind = P.catalogue.find(r => r.kind === 'badge' && r.id === 'habit_water');
  const waterFact = kept.find(k => k.athlete_id === 'zz_cut_b');
  ok(proofKind && waterFact && (proofKind.body.origin === 'proof') === (waterFact.value.proof === true), "a badge that was AA Proof's carries the flag, one that was not carries none", { origin: proofKind && proofKind.body.origin, fact: waterFact && waterFact.value });
  const sameDay = kept.filter(k => k.athlete_id === 'zz_cut_a' && k.day === addDays(today, -3)).map(k => k.value.xp).sort((a, b) => a - b);
  ok(JSON.stringify(sameDay) === '[150,300]', 'two awards that left on one day are two facts, each with its own XP', sameDay);
  ok(await val(db, `select count(*)::int from backup.cut78_career_awards`) === leaving.length && await val(db, `select count(*)::int from backup.cut78_hab_titles`) === 3,
     'the safety copies hold every row that left (backup.cut78_*)');

  section('3. the answers: no rank name, no title, no Grand Slam');
  const prof = await val(db, `select public.get_profile('zz_cut_a')`);
  ok(prof && !('titles_owned' in prof) && !('title_worn' in prof) && !('slam' in prof), 'get_profile(): no titles_owned, title_worn or slam', prof && Object.keys(prof));
  ok(prof && prof.career && !('rank' in prof.career) && typeof prof.career.level === 'number', 'get_profile(): the career has its level and no rank name', prof && prof.career);
  ok(prof && prof.rules && prof.rules.level && !('ranks' in prof.rules.level) && JSON.stringify(prof.rules.season) === '{}', 'get_profile(): its rules carry no rank names and no season title', prof && prof.rules);
  ok(prof && prof.owned !== undefined && prof.ladder !== undefined, 'get_profile(): `owned` and `ladder` are still there (both apps need them to show the marks)');
  const comp = await val(db, `select public.career_compute('zz_cut_a')`);
  ok(!('rank' in comp.career), 'career_compute(): the cached score has no rank name');
  const board = (await q(db, `select display_name, title, rank_label, level, xp::float as xp from public.leaderboard_top('zz_cut_a', 'k', 'season', 10)`)).rows;
  ok(board.length === 3 && board.every(r => r.title === null && r.rank_label === null && r.level >= 1), 'leaderboard_top(): every row, its title and rank name null', board);
  const order = board.map(r => r.display_name).join(',');
  const calls = (await q(db, `select title, rank_label from public.roll_call('zz_cut_a', 'k', 7)`)).rows;
  ok(calls.every(r => r.title === null && r.rank_label === null), 'roll_call(): no title, no rank name beside a line', calls);
  await q(db, `select public.set_title('zz_cut_a', 'clockwork', 'k')`);
  ok(await val(db, `select title from public.leaderboard_optin where athlete_id = 'zz_cut_a'`) === null, 'set_title() with a title clears it: nothing is worn');
  ok((await q(db, `select * from public.claim_titles('zz_cut_a', 'k')`)).rows.length === 0 && await val(db, `select count(*)::int from public.hab_titles`) === 0, 'claim_titles() answers nothing and mints nothing');
  await q(db, `select public.hab_mint_titles('zz_cut_a')`);
  ok(await val(db, `select count(*)::int from public.hab_titles`) === 0, 'hab_mint_titles() mints nothing');
  const d1 = await defs(db);
  ok(!/insert into public\.hab_titles/.test(d1['hab_close_season(date)']) && !/insert into public\.hab_titles/.test(d1[FNS[2]]), 'hab_close_season() and career_mint() write no hab_titles row');
  ok(d1['career_facts_paid(text)'].split('award_kept').length === 4 && d1[FNS[3]].split('stage78').length > 3, 'career_facts_paid() and get_profile() carry the patch once');
  ok(d1['career_compare(date)'].split('stage78: the Proof awards that left with the cut').length === 2, 'career_compare() counts the Proof awards that left, patched once');
  ok((await val(db, `select public.career_compare() ->> 'ok'`)) === 'true', 'career_compare() is ok');

  section('4. rulebook version 4: the cut catalogue (career/ in the working tree)');
  const newDir = filesAt(null);
  withRulebook(newDir, t => t.replace(/starts_on = "\d{4}-\d{2}-\d{2}"/, `starts_on = "${today}"`));
  const s4 = py([path.join(newDir, 'scripts', 'career_seed.py'), path.join(newDir, 'career'), '--json']);
  if (s4.status !== 0) throw new Error('career_seed.py --json (the cut) failed: ' + s4.stderr);
  const P4 = JSON.parse(s4.stdout);
  ok(P4.version === 4 && P4.rules.starts_on === today, `the cut's rulebook is version 4, starting today (${P4.rules.starts_on})`);
  const r4 = await val(db, `select public.career_seed($1, $2::jsonb, $3::jsonb, 'rehearsal')`, [P4.version, JSON.stringify(P4.rules), JSON.stringify(P4.catalogue)]);
  ok(r4 && r4.version === 4, 'career_seed() takes it: career_d20_check() lets the cut through', r4);
  const kinds = (await q(db, `select kind, count(*)::int as n from public.career_catalogue group by kind order by kind`)).rows;
  const k = Object.fromEntries(kinds.map(r => [r.kind, r.n]));
  ok(k.badge === 4 && !k.title && !k.skin && k.achievement >= 22, 'the catalogue: the four marks, no title, no skin, every achievement', k);
  ok(await val(db, `select count(*)::int from public.career_catalogue where body ? 'title' or exists (select 1 from jsonb_array_elements(coalesce(body -> 'tiers', '[]'::jsonb)) t where t ? 'title')`) === 0,
     'no achievement and no mark tier gives a title');
  for (const id of IDS) {
    await q(db, `select public.career_evaluate($1, null, 'silent')`, [id]);
    const after = await numbers(db, id);
    ok(JSON.stringify(after) === JSON.stringify(before[id]), `${id}: after the seed and an evaluate, still the same numbers`, { before: before[id], after });
  }
  ok(await val(db, `select count(*)::int from public.career_awards where kind = 'title' or (kind = 'badge' and item not in ('held_weeks', 'century', 'bests', 'comebacks'))`) === 0,
     'an evaluate under the new catalogue mints no title and no other badge');
  ok((await q(db, `select display_name from public.leaderboard_top('zz_cut_a', 'k', 'season', 10)`)).rows.map(r => r.display_name).join(',') === order, 'the board keeps its order (L8)');

  section('5. the way back, then stage78 again');
  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage78.sql')), 'rollback78');
  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage78.sql')), 'rollback78 again');
  const defs2 = await defs(db);
  for (const f of FNS) ok(defs2[f] === defs0[f], `${f.split('(')[0]}() is exactly as before stage78`);
  ok(await hash(db, 'career_catalogue') === keep0.cat && await hash(db, 'career_rules') === keep0.rules, 'the catalogue and the rulebook versions are as they were');
  ok(await hash(db, 'career_awards') === keep0.aw && await hash(db, 'career_recognition') === keep0.rec && await hash(db, 'hab_titles') === keep0.ht, 'every award, waiting moment and title is back');
  ok(await val(db, `select string_agg(athlete_id || '=' || coalesce(title, '-'), ',' order by athlete_id) from public.leaderboard_optin`) === keep0.board, 'the board\'s worn title is back');
  ok(await val(db, `select count(*)::int from public.career_facts where kind = 'award_kept'`) === 0, 'the nameless facts are gone');
  for (const id of IDS) ok(JSON.stringify(await numbers(db, id)) === JSON.stringify(before[id]), `${id}: the same numbers after the way back`);
  await q(db, `drop table backup.cut78_career_awards, backup.cut78_career_recognition, backup.cut78_hab_titles, backup.cut78_board_titles, backup.cut78_career_catalogue, backup.cut78_rules`);
  await runSql(db, stage, 'stage78 after the way back');
  for (const id of IDS) ok(JSON.stringify(await numbers(db, id)) === JSON.stringify(before[id]), `${id}: stage78 again, the same numbers`);

  console.log(`\n${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (failed) { console.log('\nFailed:\n  ' + fails.join('\n  ')); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(2); });
