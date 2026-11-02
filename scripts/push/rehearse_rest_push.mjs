// Rehearses supabase/stage107_rest_push.sql ("10 seconds left" on the phone of an athlete who left the app mid-rest) and its way
// back (scripts/push/rollback_stage107.sql) on PGlite. Nothing live, made-up athletes only (zz_).
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/push/rehearse_rest_push.mjs
//
//   0. the structure without stage107, two athletes and their phones
//   1. stage107 twice; the columns, who may execute what, the jobs
//   2. arming: only your own phone, the 10 s, a rest too short or too long, a kind switched off, a dead phone, a re-arm
//   3. due: inside the window, not after it, not too late
//   4. take: once, only with the live token, in both languages, never more than 30 s late
//   5. disarm: back in the app, nothing is owed; another athlete cannot disarm you
//   6. the every-minute job only wakes the sender when something is due
//   7. the erasure still takes the phone (and its alert) with it
//   8. the way back, twice
//   9. line endings
//
// A check that fails because stage107 is wrong is a finding: it is reported, not fixed here.
// `--stage <file>` and `--rollback <file>` rehearse a modified copy, to see that a check bites.
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, snapshotWithout } from '../career/rehearse_lib.mjs';

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

const STAGE = opt('--stage') || path.join(ROOT, 'supabase', 'stage107_rest_push.sql');
const ROLLBACK = opt('--rollback') || path.join(ROOT, 'scripts', 'push', 'rollback_stage107.sql');

const claim = (db, o) => db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(o).replace(/'/g, "''")}', false)`);
const USER = {};
const asCoach = db => claim(db, { email: COACH.email, role: 'authenticated' });
const asAthlete = (db, id) => claim(db, { sub: USER[id], email: `athlete.${id}@example.test`, role: 'authenticated' });
const nobody = db => claim(db, {});
const one = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];
const all = async (db, sql, params = []) => (await db.query(sql, params)).rows;
const inSecs = s => new Date(Date.now() + s * 1000).toISOString();

(async () => {
  const db = await openDb();

  section('0. The structure, two athletes and their phones');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/push_rest_arm/);   // once stage107 is in the snapshot, the copy committed before it
  info('from ' + snap.says);
  await runSql(db, snap.sql, 'schema snapshot');
  await db.exec(`set timezone = 'UTC'`);
  ok((await one(db, `select to_regclass('public.push_subs')::text as t`)).t, 'the snapshot holds push_subs (stage84 is live)');
  ok(!(await one(db, `select count(*)::int as n from information_schema.columns where table_schema='public' and table_name='push_subs' and column_name like 'rest%'`)).n,
     'push_subs has no rest columns yet');
  let nUser = 0;
  for (const id of ['zz_uk', 'zz_ir']) {
    const u = `00000000-0000-4000-8000-${String(++nUser).padStart(12, '0')}`;
    USER[id] = u;
    await db.query(`insert into public.programs (athlete_id, data) values ($1, $2::jsonb) on conflict (athlete_id) do update set data = excluded.data`,
      [id, JSON.stringify({ athlete: { id, firstName: id, lastName: 'Test', tier: 'coached' } })]);
    await db.query(`insert into auth.users (id, email) values ($1, $2) on conflict do nothing`, [u, `athlete.${id}@example.test`]);
    await db.query(`insert into public.athlete_identities (user_id, athlete_id, email, linked_at) values ($1, $2, $3, now()) on conflict do nothing`,
      [u, id, `athlete.${id}@example.test`]);
  }
  const EP = { zz_uk: 'https://push.example.test/zz_uk', zz_ir: 'https://push.example.test/zz_ir', zz_uk2: 'https://push.example.test/zz_uk_tablet' };
  for (const [ep, id, lang] of [[EP.zz_uk, 'zz_uk', 'en'], [EP.zz_ir, 'zz_ir', 'fa'], [EP.zz_uk2, 'zz_uk', 'en']])
    await db.query(`insert into public.push_subs (endpoint, athlete_id, p256dh, auth, app, lang) values ($1, $2, 'k-' || $2, 'a-' || $2, 'training', $3)`, [ep, id, lang]);

  section('1. stage107, twice');
  const stageSql = read(STAGE);
  await runSql(db, stageSql, 'stage107');
  await runSql(db, stageSql, 'stage107 again');
  ok(true, 'the stage runs twice with no error');
  const cols = (await all(db, `select column_name, data_type from information_schema.columns where table_schema='public' and table_name='push_subs' and column_name like 'rest%' order by 1`));
  ok(JSON.stringify(cols) === JSON.stringify([{ column_name: 'rest_at', data_type: 'timestamp with time zone' }, { column_name: 'rest_token', data_type: 'uuid' }]),
     'push_subs gains rest_at (timestamptz) and rest_token (uuid), and nothing else', cols);
  ok(!(await one(db, `select count(*)::int as n from pg_tables where schemaname='public' and tablename like '%rest%'`)).n, 'no new table: nothing new for BACKUP_TABLES or the erase list');
  const priv = async f => one(db, `select has_function_privilege('anon','public.' || $1,'execute') as a, has_function_privilege('authenticated','public.' || $1,'execute') as u,
                                          has_function_privilege('service_role','public.' || $1,'execute') as s`, [f]);
  for (const f of ['push_rest_arm(text,timestamptz)', 'push_rest_disarm(text)']) {
    const p = await priv(f);
    ok(!p.a && p.u && p.s, `${f}: an athlete may call it, anon may not`, p);
  }
  for (const f of ['push_rest_due(integer)', 'push_rest_take(text,uuid)', 'push_rest_fire()']) {
    const p = await priv(f);
    ok(!p.a && !p.u && p.s, `${f}: the service role only`, p);
  }
  const fixed = await all(db, `select proname, proconfig from pg_proc where proname like 'push_rest_%' and pronamespace = 'public'::regnamespace`);
  ok(fixed.length === 5 && fixed.every(r => (r.proconfig || []).some(c => /^search_path=/.test(c))), 'all five functions have a fixed search path', fixed);

  section('2. Arming');
  await asAthlete(db, 'zz_uk');
  let r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(90)])).r;
  ok(r && r.token && r.at, 'an athlete arms their own phone: the answer has the alert time and a token', r);
  let row = await one(db, `select rest_at, rest_token::text as tok, extract(epoch from rest_at - now())::int as secs from public.push_subs where endpoint = $1`, [EP.zz_uk]);
  ok(row.tok === r.token && row.secs >= 78 && row.secs <= 81, 'the alert is 10 s before the end of the rest, on that phone\'s row', row);
  const tok1 = r.token;
  ok(!(await one(db, `select rest_at from public.push_subs where endpoint = $1`, [EP.zz_uk2])).rest_at, 'their other phone is not armed: the rest is on one phone');
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_ir, inSecs(90)])).r;
  ok(r === null && !(await one(db, `select rest_at from public.push_subs where endpoint = $1`, [EP.zz_ir])).rest_at, 'nobody can arm another athlete\'s phone', r);
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(120)])).r;
  ok(r && r.token !== tok1, 'arming again (a new rest) gives a new token');
  const tok2 = r.token;
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(11)])).r;
  row = await one(db, `select rest_at from public.push_subs where endpoint = $1`, [EP.zz_uk]);
  ok(r === null && !row.rest_at, 'a rest that ends in 12 s or less arms nothing and clears what was there', { r, row });
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(31 * 60)])).r;
  ok(r === null, 'a "rest" more than 30 minutes away arms nothing', r);
  r = (await one(db, `select public.push_rest_arm($1, null) as r`, [EP.zz_uk])).r;
  ok(r === null, 'no end time arms nothing');
  await nobody(db);
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(90)])).r;
  ok(r === null, 'no sign-in arms nothing');
  await db.query(`update public.push_subs set kinds = '{"rest": false}'::jsonb where endpoint = $1`, [EP.zz_uk]);
  await asAthlete(db, 'zz_uk');
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(90)])).r;
  ok(r === null, 'a phone with the rest kind switched off is never armed', r);
  await db.query(`update public.push_subs set kinds = '{"habits": false}'::jsonb, fails = 5 where endpoint = $1`, [EP.zz_uk]);
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(90)])).r;
  ok(r === null, 'a phone that has failed five times is not armed');
  await db.query(`update public.push_subs set fails = 0 where endpoint = $1`, [EP.zz_uk]);
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(90)])).r;
  ok(r && r.token, 'another kind switched off does not stop it: a kind nobody switched is ON');
  const tokLive = r.token;

  section('3. Due');
  const due = async w => all(db, `select endpoint, rest_token::text as tok from public.push_rest_due($1)`, [w]);
  ok((await due(70)).length === 0, 'an alert 80 s away is not due within 70 s');
  ok((await due(90)).some(x => x.endpoint === EP.zz_uk && x.tok === tokLive), 'within 90 s it is, with its live token');
  ok((await due(9999)).length === 1, 'the window is capped at 120 s, and only armed phones come back');
  await db.query(`update public.push_subs set rest_at = now() - interval '40 seconds' where endpoint = $1`, [EP.zz_uk]);
  ok((await due(70)).length === 0, 'an alert more than 30 s late is never due');

  section('4. Take');
  ok((await all(db, `select * from public.push_rest_take($1, $2::uuid)`, [EP.zz_uk, tokLive])).length === 0, 'and it cannot be taken either: nothing late is sent');
  await asAthlete(db, 'zz_uk');
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(20)])).r;
  let t = await all(db, `select * from public.push_rest_take($1, $2::uuid)`, [EP.zz_uk, tok2]);
  ok(t.length === 0, 'an old token takes nothing (a later arm wins)');
  t = await all(db, `select * from public.push_rest_take($1, $2::uuid)`, [EP.zz_uk, r.token]);
  ok(t.length === 1 && t[0].title === '10 seconds left' && t[0].body === 'Get set for your next set.' && t[0].p256dh === 'k-zz_uk',
     'the live token takes it: the keys and the English words', t);
  ok(!/\d+\s*kg|rpe|squat/i.test(t[0].title + t[0].body), 'the words name no exercise, weight or effort (the lock-screen rule)');
  row = await one(db, `select rest_at, rest_token from public.push_subs where endpoint = $1`, [EP.zz_uk]);
  ok(!row.rest_at && !row.rest_token, 'taking it clears the row');
  ok((await all(db, `select * from public.push_rest_take($1, $2::uuid)`, [EP.zz_uk, r.token])).length === 0, 'a second sender with the same token gets nothing: one alert');
  ok((await all(db, `select * from public.push_rest_take($1, null)`, [EP.zz_uk])).length === 0, 'a null token takes nothing');
  await asAthlete(db, 'zz_ir');
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_ir, inSecs(30)])).r;
  t = await all(db, `select * from public.push_rest_take($1, $2::uuid)`, [EP.zz_ir, r.token]);
  ok(t.length === 1 && t[0].title === '۱۰ ثانیه تا آخر استراحت' && t[0].body === 'برای ست بعدی آماده شو.', 'a Farsi phone gets the Farsi words', t);

  section('5. Disarm');
  await asAthlete(db, 'zz_uk');
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(60)])).r;
  await asAthlete(db, 'zz_ir');
  await db.query(`select public.push_rest_disarm($1)`, [EP.zz_uk]);
  ok(!!(await one(db, `select rest_at from public.push_subs where endpoint = $1`, [EP.zz_uk])).rest_at, 'another athlete cannot disarm your phone');
  await asAthlete(db, 'zz_uk');
  await db.query(`select public.push_rest_disarm($1)`, [EP.zz_uk]);
  ok(!(await one(db, `select rest_at from public.push_subs where endpoint = $1`, [EP.zz_uk])).rest_at, 'back in the app: disarm clears it');
  ok((await all(db, `select * from public.push_rest_take($1, $2::uuid)`, [EP.zz_uk, r.token])).length === 0, '…and the sender that was waiting sends nothing');

  section('6. The every-minute job');
  let f = (await one(db, `select public.push_rest_fire() as f`)).f;
  ok(f.ok && f.due === 0, 'with nothing due it answers at once and wakes no sender', f);
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(60)])).r;
  f = (await one(db, `select public.push_rest_fire() as f`)).f;
  ok(f.due === undefined, 'with a phone due within 70 s it goes on to call the sender', f);
  info('here: ' + JSON.stringify(f) + ' (PGlite has no pg_net or push_config row; live, it posts push-send?only=rest)');
  ok(/only=rest/.test(stageSql) && /'push-rest', '\* \* \* \* \*'/.test(stageSql), 'the job is every minute and posts ?only=rest');
  ok(/push-rest-sweep/.test(stageSql) && /job_run_details/.test(stageSql), 'and its run log is swept, so a job a minute does not grow without end');
  await db.query(`select public.push_rest_disarm($1)`, [EP.zz_uk]);

  section('7. The erasure takes the phone, and its alert, with it');
  await asAthlete(db, 'zz_uk');
  await db.query(`select public.push_rest_arm($1, $2::timestamptz)`, [EP.zz_uk, inSecs(60)]);
  await asCoach(db);
  await one(db, `select public.coach_erase_person('athlete', 'zz_uk', 'zz_uk', '{}'::uuid[], false) as r`);
  ok((await all(db, `select 1 from public.push_subs where athlete_id = 'zz_uk'`)).length === 0, 'erasing a person takes their phones and any armed alert');

  section('8. The way back');
  await runSql(db, read(ROLLBACK), 'rollback');
  ok(!(await one(db, `select count(*)::int as n from information_schema.columns where table_schema='public' and table_name='push_subs' and column_name like 'rest%'`)).n,
     'the way back drops both columns');
  ok(!(await one(db, `select count(*)::int as n from pg_proc where proname like 'push_rest_%'`)).n, 'and the five functions');
  ok((await one(db, `select to_regprocedure('public.push_subscribe(text,text,text,text,integer,integer,text,text)')::text as t`)).t, 'the reminders are untouched');
  await runSql(db, read(ROLLBACK), 'rollback again');
  ok(true, 'the way back runs twice with no error');

  section('9. Line endings');
  await runSql(db, stageSql.split('\r\n').join('\n').split('\n').join('\r\n'), 'stage107 with CRLF lines');
  ok((await one(db, `select count(*)::int as n from pg_proc where proname like 'push_rest_%'`)).n === 5, 'the stage applies from a CRLF file');
  await runSql(db, read(ROLLBACK).split('\r\n').join('\n'), 'rollback with LF lines');
  ok(!(await one(db, `select count(*)::int as n from pg_proc where proname like 'push_rest_%'`)).n, 'and a way back whose lines end differently still takes it out');

  console.log(`\n${passed} of ${passed + failed} checks passed`);
  if (failed) { console.log('\nFAILED:'); fails.forEach(f => console.log('  · ' + f)); }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('\nrehearsal blew up:', e); process.exit(2); });
