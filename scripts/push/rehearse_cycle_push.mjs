// Rehearses supabase/stage87_cycle_push.sql ("your next cycle is ready" on their phone) and its way
// back (scripts/push/rollback_stage87.sql) on PGlite. Nothing live, made-up athletes only (zz_).
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/push/rehearse_cycle_push.mjs
//
//   0. the structure without stage87, made-up athletes with programmes and phones
//   1. stage87 twice; the table, its row-level security, who may execute what, the erase patch
//   2. the first sight is never a notification
//   3. an advance rings, once; the words in both languages; the tag and the TTL
//   4. who is never told: the switch off, the night, a free athlete, no roadmap, a dead phone
//   5. the mark: pending, done, a failure, a dry run
//   6. the sweep
//   7. the erasure takes the table with it
//   8. the way back, twice, and stage86's end of the erase list survives it
//   9. line endings
//
// A check that fails because stage87 is wrong is a finding: it is reported, not fixed here.
// `--stage <file>` and `--rollback <file>` rehearse a modified copy, to see that a check bites.
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, snapshotWithout, eraseDef } from '../career/rehearse_lib.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const COACH = { email: 'amirardekanian@gmail.com', role: 'authenticated' };
let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => {
  if (c) { passed++; console.log('  ok   ' + what); }
  else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 400) : '')); }
};
const section = s => console.log('\n' + s);
const info = s => console.log('  ·    ' + s);

const STAGE = opt('--stage') || path.join(ROOT, 'supabase', 'stage87_cycle_push.sql');
const ROLLBACK = opt('--rollback') || path.join(ROOT, 'scripts', 'push', 'rollback_stage87.sql');

const claim = (db, o) => db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(o).replace(/'/g, "''")}', false)`);
const asCoach = db => claim(db, { email: COACH.email, role: 'authenticated' });
const USER = {};
const one = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];
const all = async (db, sql, params = []) => (await db.query(sql, params)).rows;

// Made-up instants. 2026-11-12 10:00 UTC is 10:00 in the UK (offset 0) and 13:30 in Iran (+210).
const T = '2026-11-12T10:00:00Z';
const NIGHT = '2026-11-12T23:30:00Z';

(async () => {
  const db = await openDb();

  section('0. The structure, the athletes, their programmes and their phones');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/create table (if not exists )?public\.push_cycle_seen/i);
  info('from ' + snap.says);
  await runSql(db, snap.sql, 'schema snapshot');
  await db.exec(`set timezone = 'UTC'`);
  ok(!(await one(db, `select to_regclass('public.push_cycle_seen')::text as t`)).t,
     'the snapshot does not hold the cycle table yet');
  for (const t of ['push_subs', 'crew_push_seen'])
    ok((await one(db, `select to_regclass('public.' || $1)::text as t`, [t])).t, `the snapshot holds ${t} (stage84 and stage86 are live)`);

  //   zz_uk    coached, UK, English, a roadmap of 4 cycles, on cycle 1
  //   zz_ir    coached, Iran, Farsi, a roadmap, on cycle 0
  //   zz_free  a free Proof athlete. ⚠️ Given a ROADMAP on purpose (a former client who went free), so
  //            the only thing keeping them out is the tier. With no roadmap they would fail two tests at
  //            once and a break in either would pass unnoticed — which is exactly what the mutation run
  //            found on 2026-10-20.
  //   zz_new   coached but mid-intake: a programme with no roadmap yet
  const PEOPLE = [['zz_uk', 'coached', 4, 1], ['zz_ir', 'coached', 3, 0], ['zz_free', 'free', 3, 0], ['zz_new', 'coached', 0, 0]];
  let nUser = 0;
  for (const [id, tier, nCycles, cci] of PEOPLE) {
    const cycles = Array.from({ length: nCycles }, (_, i) => ({ num: i + 1, name: 'Cycle ' + (i + 1) }));
    await db.query(`insert into public.programs (athlete_id, data) values ($1, $2::jsonb)
                      on conflict (athlete_id) do update set data = excluded.data`,
      [id, JSON.stringify({ athlete: { id, firstName: id, lastName: 'Test', tier }, cycles, currentCycleIndex: cci })]);
    const u = `00000000-0000-4000-8000-${String(++nUser).padStart(12, '0')}`;
    USER[id] = u;
    await db.query(`insert into auth.users (id, email) values ($1, $2) on conflict do nothing`, [u, `athlete.${id}@example.test`]);
    await db.query(`insert into public.athlete_identities (user_id, athlete_id, email, linked_at)
                      values ($1, $2, $3, now()) on conflict do nothing`, [u, id, `athlete.${id}@example.test`]);
  }
  const EP = {};
  for (const [id, off, lang] of [['zz_uk', 0, 'en'], ['zz_ir', 210, 'fa'], ['zz_free', 0, 'en'], ['zz_new', 0, 'en']]) {
    EP[id] = `https://push.example.test/${id}`;
    await db.query(`insert into public.push_subs (endpoint, athlete_id, p256dh, auth, app, tz_offset, lang, created_at)
                    values ($1, $2, 'k-' || $2, 'a-' || $2, 'training', $3, $4, $5::timestamptz)`,
      [EP[id], id, off, lang, '2026-11-01T00:00:00Z']);
  }
  ok((await all(db, `select 1 from public.push_subs`)).length === 4, 'four phones are subscribed');
  const eraseBefore = await eraseDef(db);
  ok(!/push_cycle_seen/.test(eraseBefore), 'coach_erase_person() does not mention the table yet');
  ok(/'crew_push_seen'\]/.test(eraseBefore), "and stage86's names are the end of its list, which is what this patch anchors on");

  section('1. stage87, applied twice');
  const stageSql = read(STAGE);
  await runSql(db, stageSql, 'stage87');
  await runSql(db, stageSql, 'stage87 again');
  ok(true, 'the stage applies twice with no error (safe to re-run)');
  const rls = await one(db, `select relrowsecurity as rls from pg_class where oid = 'public.push_cycle_seen'::regclass`);
  ok(rls && rls.rls === true, 'push_cycle_seen has row-level security on');
  ok((await all(db, `select 1 from pg_policies where schemaname='public' and tablename='push_cycle_seen'`)).length === 0,
     'and no policy at all: every door is a function');
  const g = await one(db,
    `select has_table_privilege('anon','public.push_cycle_seen','select') as a,
            has_table_privilege('authenticated','public.push_cycle_seen','select') as u,
            has_table_privilege('service_role','public.push_cycle_seen','insert') as s`);
  ok(g && !g.a && !g.u && g.s, "it is the service role's alone", g);
  for (const f of ['cycle_push_due(timestamptz,boolean)', 'cycle_push_fold(timestamptz)',
                   'cycle_push_done(text,boolean)', 'cycle_push_words(text)', 'cycle_push_sweep()']) {
    const p = await one(db,
      `select has_function_privilege('anon','public.' || $1,'execute') as a,
              has_function_privilege('authenticated','public.' || $1,'execute') as u,
              has_function_privilege('service_role','public.' || $1,'execute') as s`, [f]);
    ok(p && !p.a && !p.u && p.s, `${f.split('(')[0]}() is the service role's only`, p);
  }
  ok(/'push_cycle_seen'\]/.test(await eraseDef(db)), 'coach_erase_person() now names the table');

  section('2. The first sight is never a notification');
  const due = async (now = T, mark = false) => all(db, `select * from public.cycle_push_due($1::timestamptz, $2)`, [now, mark]);
  const to = rows => rows.map(r => r.athlete_id).sort().join(',');

  ok((await due(T, false)).length === 0, 'a dry run on a first sight sends nothing');
  ok((await all(db, `select 1 from public.push_cycle_seen`)).length === 0, 'and writes nothing down');
  let rows = await due(T, true);
  ok(rows.length === 0, 'a real run on a first sight sends nothing either: nobody is news-flashed about the cycle they are training');
  const seen = await all(db, `select athlete_id, cycle_index, pending from public.push_cycle_seen order by athlete_id`);
  ok(to(seen) === 'zz_ir,zz_uk', 'it writes down where the two COACHED athletes with a roadmap are, and nobody else', seen);
  ok(seen.find(r => r.athlete_id === 'zz_uk').cycle_index === 1 && seen.find(r => r.athlete_id === 'zz_ir').cycle_index === 0,
     'at their current cycle', seen);
  ok((await due(T, true)).length === 0, 'and asking again still sends nothing');

  section('3. An advance rings, once');
  const publish = (id, cci) =>
    db.query(`update public.programs set data = jsonb_set(data, '{currentCycleIndex}', to_jsonb($2::int)) where athlete_id = $1`, [id, cci]);
  await publish('zz_uk', 2);
  rows = await due(T, false);
  ok(to(rows) === 'zz_uk', "publishing zz_uk's next cycle owes them one notification, and nobody else", to(rows));
  ok(rows[0].kind === 'cycle' && rows[0].tag === 'cycle' && rows[0].ttl === 7200,
     "it is kind and tag 'cycle' with a two-hour TTL", rows[0]);
  ok(rows[0].title === 'Your next cycle is ready' && /Open the app/.test(rows[0].body),
     'and the words say the fact and nothing else', rows[0]);
  ok(!/\d/.test(rows[0].title + rows[0].body), 'no cycle number, no name, no load — a lock screen is read by anyone', rows[0]);

  await publish('zz_ir', 1);
  rows = await due(T, false);
  const fa = rows.find(r => r.athlete_id === 'zz_ir');
  ok(fa && /[؀-ۿ]/.test(fa.title), 'a Farsi athlete gets Farsi words', fa && fa.title);
  // Amir's word, read and chosen 2026-10-20: دوره, the same one stage86's crew line uses.
  ok(/دوره/.test(fa.title) && !/سایکل/.test(fa.title),
     'a cycle is دوره, not a transliteration', fa.title);

  section('4. Who is never told');
  ok((await due(NIGHT)).length === 0, 'at half past eleven at night, nobody');
  await db.query(`update public.push_subs set kinds = '{"cycle": false}'::jsonb where athlete_id='zz_uk'`);
  ok(to(await due(T)) === 'zz_ir', 'a switched-off cycle kind is not sent', to(await due(T)));
  await db.query(`update public.push_subs set kinds = '{}'::jsonb where athlete_id='zz_uk'`);
  await db.query(`update public.push_subs set fails = 5 where athlete_id='zz_ir'`);
  ok(to(await due(T)) === 'zz_uk', 'a phone that has failed five times is skipped', to(await due(T)));
  await db.query(`update public.push_subs set fails = 0 where athlete_id='zz_ir'`);
  // The free athlete and the athlete with no roadmap were never even written down in section 2.
  await publish('zz_free', 1);
  await publish('zz_new', 1);
  ok(!to(await due(T)).includes('zz_free'), 'a free Proof athlete is never told, roadmap or not');
  ok(!to(await due(T)).includes('zz_new'), 'and neither has an athlete whose programme has no roadmap yet');

  section('5. The mark');
  rows = await due(T, true);
  ok(to(rows) === 'zz_ir,zz_uk', 'a real run owes both of them', to(rows));
  let row = await one(db, `select * from public.push_cycle_seen where athlete_id='zz_uk'`);
  ok(row.pending === 2 && row.cycle_index === 1, 'it writes pending, not the mark: nothing has reached a phone yet', row);
  ok(to(await due(T, false)) === 'zz_ir,zz_uk', 'asking again before the send finishes owes the same (nothing lost)');

  await one(db, `select public.cycle_push_done('zz_uk', true) as r`);
  row = await one(db, `select * from public.push_cycle_seen where athlete_id='zz_uk'`);
  ok(row.cycle_index === 2 && row.pending === null, 'cycle_push_done(ok) promotes pending to the mark', row);
  ok(!to(await due(T)).includes('zz_uk'), 'and the same cycle is never announced twice');
  row = await one(db, `select * from public.push_subs where athlete_id='zz_uk'`);
  ok(row.last_ok_at !== null && row.fails === 0, 'a good send stamps the phone and clears its failures');

  // A send that failed everywhere leaves the mark alone — and because a published cycle is a STATE,
  // "try again" can be the next hour or tomorrow and nothing is lost.
  await due(T, true);
  await one(db, `select public.cycle_push_done('zz_ir', false) as r`);
  row = await one(db, `select * from public.push_cycle_seen where athlete_id='zz_ir'`);
  ok(row.cycle_index === 0 && row.pending === null, 'a send that failed everywhere leaves the mark where it was', row);
  ok(to(await due(T)).includes('zz_ir'), 'so it is still owed');
  ok((await one(db, `select fails from public.push_subs where athlete_id='zz_ir'`)).fails === 1, 'and the failure counts against the phone');

  // A dry run must never move anything.
  const before = await all(db, `select athlete_id, cycle_index, pending from public.push_cycle_seen order by athlete_id`);
  await due(T, false);
  const after = await all(db, `select athlete_id, cycle_index, pending from public.push_cycle_seen order by athlete_id`);
  ok(JSON.stringify(before) === JSON.stringify(after), 'a dry run moves nothing at all', { before, after });

  section('6. The sweep');
  await db.query(`insert into public.push_cycle_seen (athlete_id, cycle_index) values ('zz_gone', 3)`);
  const swept = (await one(db, `select public.cycle_push_sweep() as n`)).n;
  ok(swept >= 1, 'a mark for a phone that no longer exists goes', swept);
  ok((await all(db, `select 1 from public.push_cycle_seen where athlete_id='zz_gone'`)).length === 0, 'and it is gone');

  section('7. The erasure takes the table with it');
  await asCoach(db);
  const had = (await all(db, `select 1 from public.push_cycle_seen where athlete_id='zz_ir'`)).length;
  const er = await one(db, `select public.coach_erase_person('athlete', 'zz_ir', 'zz_ir', '{}'::uuid[], false) as r`);
  const left = (await all(db, `select 1 from public.push_cycle_seen where athlete_id='zz_ir'`)).length;
  ok(had === 1 && left === 0, 'erasing a person takes their mark with them', { had, left });
  ok(er.r && JSON.stringify(er.r).includes('push_cycle_seen'), 'and the receipt names it', JSON.stringify(er.r).slice(0, 220));

  section('8. The way back');
  await runSql(db, read(ROLLBACK), 'rollback');
  ok(!(await one(db, `select to_regclass('public.push_cycle_seen')::text as t`)).t, 'the way back drops the table');
  const back = await eraseDef(db);
  ok(!/push_cycle_seen/.test(back), 'coach_erase_person() no longer names a table that is gone');
  ok(/'crew_push_seen'\]/.test(back), "and stage86's end of the list is back, so ITS way back can still find it");
  ok((await one(db, `select to_regprocedure('public.crew_push_due(timestamptz,boolean)')::text as t`)).t, 'the crew sender is untouched');
  ok((await one(db, `select to_regprocedure('public.push_due(timestamptz)')::text as t`)).t, 'and so are the reminders');
  await runSql(db, read(ROLLBACK), 'rollback again');
  ok(true, 'the way back runs twice with no error');

  section('9. Line endings');
  await runSql(db, stageSql.split('\r\n').join('\n').split('\n').join('\r\n'), 'stage87 with CRLF lines');
  ok(/'push_cycle_seen'\]/.test(await eraseDef(db)), 'the stage patches the erase function from a CRLF file');
  await runSql(db, read(ROLLBACK).split('\r\n').join('\n'), 'rollback with LF lines');
  ok(!/push_cycle_seen/.test(await eraseDef(db)), 'and a way back whose lines end differently still takes the patch out');
  ok(/'crew_push_seen'\]/.test(await eraseDef(db)), 'after every mix, the erase function is exactly what stage86 left');

  console.log(`\n${passed} of ${passed + failed} checks passed`);
  if (failed) { console.log('\nFAILED:'); fails.forEach(f => console.log('  · ' + f)); }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('\nrehearsal blew up:', e); process.exit(2); });
