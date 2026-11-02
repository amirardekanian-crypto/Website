// Rehearses supabase/stage108_finish_push.sql ("Your session is still open", 10 minutes after the last set) and its way back
// (scripts/push/rollback_stage108.sql) on PGlite, on top of stage107 (the rest alert). Nothing live, made-up athletes only (zz_).
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/push/rehearse_finish_push.mjs
//
//   0. the structure with stage107 and without stage108, two athletes and their phones
//   1. stage108 twice; the columns, who may execute what
//   2. arming: only your own phone, the window (30 s to 6 h), a kind switched off, a dead phone, a re-arm
//   3. due: both kinds in one list, each with its token, the finish 15 minutes late at most
//   4. take: once per kind, only with the live token, the words in both languages, the tag, TTL and urgency
//   5. disarm clears both kinds; another athlete cannot
//   6. the every-minute job wakes for either kind
//   7. the erasure still takes the phone with it
//   8. the way back, twice: stage107's disarm and job are as they were, and the rest alert still works
//   9. line endings
//
// A check that fails because stage108 is wrong is a finding: it is reported, not fixed here.
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, snapshotWithout } from '../career/rehearse_lib.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => {
  if (c) { passed++; console.log('  ok   ' + what); }
  else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 400) : '')); }
};
const section = s => console.log('\n' + s);
const info = s => console.log('  ·    ' + s);

const STAGE = opt('--stage') || path.join(ROOT, 'supabase', 'stage108_finish_push.sql');
const ROLLBACK = opt('--rollback') || path.join(ROOT, 'scripts', 'push', 'rollback_stage108.sql');
const STAGE107 = path.join(ROOT, 'supabase', 'stage107_rest_push.sql');

const claim = (db, o) => db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(o).replace(/'/g, "''")}', false)`);
const USER = {};
const asCoach = db => claim(db, { email: 'amirardekanian@gmail.com', role: 'authenticated' });
const asAthlete = (db, id) => claim(db, { sub: USER[id], email: `athlete.${id}@example.test`, role: 'authenticated' });
const one = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];
const all = async (db, sql, params = []) => (await db.query(sql, params)).rows;
const inSecs = s => new Date(Date.now() + s * 1000).toISOString();
const nFinishCols = db => one(db, `select count(*)::int as n from information_schema.columns where table_schema='public' and table_name='push_subs' and column_name like 'finish%'`);

(async () => {
  const db = await openDb();

  section('0. The structure (stage107 live, stage108 not), two athletes and their phones');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/push_finish_arm/);
  info('from ' + snap.says);
  await runSql(db, snap.sql, 'schema snapshot');
  if (!(await one(db, `select to_regprocedure('public.push_rest_arm(text,timestamptz)')::text as t`)).t) await runSql(db, read(STAGE107), 'stage107');
  await db.exec(`set timezone = 'UTC'`);
  ok((await one(db, `select to_regprocedure('public.push_rest_arm(text,timestamptz)')::text as t`)).t, 'stage107 (the rest alert) is there');
  ok((await nFinishCols(db)).n === 0, 'push_subs has no finish columns yet');
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
  const EP = { zz_uk: 'https://push.example.test/zz_uk', zz_ir: 'https://push.example.test/zz_ir' };
  for (const [id, lang] of [['zz_uk', 'en'], ['zz_ir', 'fa']])
    await db.query(`insert into public.push_subs (endpoint, athlete_id, p256dh, auth, app, lang) values ($1, $2, 'k-' || $2, 'a-' || $2, 'training', $3)`, [EP[id], id, lang]);

  section('1. stage108, twice');
  const stageSql = read(STAGE);
  await runSql(db, stageSql, 'stage108');
  await runSql(db, stageSql, 'stage108 again');
  ok(true, 'the stage runs twice with no error');
  ok((await nFinishCols(db)).n === 2, 'push_subs gains finish_at and finish_token');
  ok(!(await one(db, `select count(*)::int as n from pg_tables where schemaname='public' and tablename like '%finish%'`)).n, 'no new table');
  const priv = async f => one(db, `select has_function_privilege('anon','public.' || $1,'execute') as a, has_function_privilege('authenticated','public.' || $1,'execute') as u,
                                          has_function_privilege('service_role','public.' || $1,'execute') as s`, [f]);
  let p = await priv('push_finish_arm(text,timestamptz)');
  ok(!p.a && p.u && p.s, 'push_finish_arm: an athlete may call it, anon may not', p);
  for (const f of ['push_alert_due(integer)', 'push_alert_take(text,text,uuid)']) {
    p = await priv(f);
    ok(!p.a && !p.u && p.s, `${f}: the service role only`, p);
  }

  section('2. Arming');
  await asAthlete(db, 'zz_uk');
  let r = (await one(db, `select public.push_finish_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(600)])).r;
  ok(r && r.token, 'an athlete arms their own phone 10 minutes out', r);
  const tokOld = r.token;
  ok((await one(db, `select public.push_finish_arm($1, $2::timestamptz) as r`, [EP.zz_ir, inSecs(600)])).r === null, 'nobody can arm another athlete\'s phone');
  ok((await one(db, `select public.push_finish_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(10)])).r === null
     && !(await one(db, `select finish_at from public.push_subs where endpoint = $1`, [EP.zz_uk])).finish_at, 'under 30 s arms nothing and clears what was there');
  ok((await one(db, `select public.push_finish_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(7 * 3600)])).r === null, 'over 6 hours arms nothing');
  await db.query(`update public.push_subs set kinds = '{"finish": false}'::jsonb where endpoint = $1`, [EP.zz_uk]);
  ok((await one(db, `select public.push_finish_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(600)])).r === null, 'the finish kind switched off: never armed');
  await db.query(`update public.push_subs set kinds = '{"rest": false}'::jsonb where endpoint = $1`, [EP.zz_uk]);
  r = (await one(db, `select public.push_finish_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(600)])).r;
  ok(r && r.token && r.token !== tokOld, 'the rest kind switched off does not stop it, and a re-arm has a new token');
  await db.query(`update public.push_subs set kinds = '{}'::jsonb, fails = 5 where endpoint = $1`, [EP.zz_uk]);
  ok((await one(db, `select public.push_finish_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(600)])).r === null, 'a phone that failed five times is not armed');
  await db.query(`update public.push_subs set fails = 0 where endpoint = $1`, [EP.zz_uk]);

  section('3. Due: both kinds');
  r = (await one(db, `select public.push_finish_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(40)])).r;
  const rr = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(50)])).r;
  let due = await all(db, `select endpoint, kind, token::text as tok from public.push_alert_due(70) order by kind`);
  ok(due.length === 2 && due[0].kind === 'finish' && due[0].tok === r.token && due[1].kind === 'rest' && due[1].tok === rr.token,
     'one phone due for both: two rows, each kind with its own token', due);
  await db.query(`update public.push_subs set finish_at = now() - interval '14 minutes' where endpoint = $1`, [EP.zz_uk]);
  ok((await all(db, `select 1 from public.push_alert_due(70) where kind = 'finish'`)).length === 1, 'a reminder 14 minutes late is still due');
  await db.query(`update public.push_subs set finish_at = now() - interval '16 minutes' where endpoint = $1`, [EP.zz_uk]);
  ok((await all(db, `select 1 from public.push_alert_due(70) where kind = 'finish'`)).length === 0, 'one 16 minutes late is not');
  ok((await all(db, `select * from public.push_alert_take($1, 'finish', $2::uuid)`, [EP.zz_uk, r.token])).length === 0, '…and cannot be taken');

  section('4. Take');
  await asAthlete(db, 'zz_uk');
  r = (await one(db, `select public.push_finish_arm($1, $2::timestamptz) as r`, [EP.zz_uk, inSecs(40)])).r;
  ok((await all(db, `select * from public.push_alert_take($1, 'finish', $2::uuid)`, [EP.zz_uk, rr.token])).length === 0, 'the rest\'s token does not take the finish');
  let t = await all(db, `select * from public.push_alert_take($1, 'finish', $2::uuid)`, [EP.zz_uk, r.token]);
  ok(t.length === 1 && t[0].title === 'Your session is still open' && t[0].body === 'Done training? Tap to finish it.' && t[0].tag === 'finish' && t[0].ttl === 3600 && t[0].urgency === 'normal',
     'the live token takes the finish: English words, tag finish, TTL an hour, normal urgency', t);
  ok((await all(db, `select * from public.push_alert_take($1, 'finish', $2::uuid)`, [EP.zz_uk, r.token])).length === 0, 'a second take gets nothing');
  const row = await one(db, `select finish_at, rest_at from public.push_subs where endpoint = $1`, [EP.zz_uk]);
  ok(!row.finish_at && row.rest_at, 'taking the finish leaves the rest alert armed');
  t = await all(db, `select * from public.push_alert_take($1, 'rest', $2::uuid)`, [EP.zz_uk, rr.token]);
  ok(t.length === 1 && t[0].title === '10 seconds left' && t[0].tag === 'rest' && t[0].ttl === 30 && t[0].urgency === 'high', 'the rest is taken by the same door, as stage107 sent it', t);
  ok((await all(db, `select * from public.push_alert_take($1, 'other', $2::uuid)`, [EP.zz_uk, rr.token])).length === 0, 'an unknown kind takes nothing');
  await asAthlete(db, 'zz_ir');
  r = (await one(db, `select public.push_finish_arm($1, $2::timestamptz) as r`, [EP.zz_ir, inSecs(40)])).r;
  t = await all(db, `select * from public.push_alert_take($1, 'finish', $2::uuid)`, [EP.zz_ir, r.token]);
  ok(t.length === 1 && t[0].title === 'جلسه‌ت هنوز بازه' && t[0].body === 'تمرینت تموم شد؟ بزن و تمومش کن.', 'a Farsi phone gets the Farsi words', t);
  ok(!/\d|kg|rpe/i.test(t[0].title + t[0].body), 'the words carry no number (the lock-screen rule)');

  section('5. Disarm clears both kinds');
  await asAthlete(db, 'zz_uk');
  await db.query(`select public.push_finish_arm($1, $2::timestamptz)`, [EP.zz_uk, inSecs(600)]);
  await db.query(`select public.push_rest_arm($1, $2::timestamptz)`, [EP.zz_uk, inSecs(90)]);
  await asAthlete(db, 'zz_ir');
  await db.query(`select public.push_rest_disarm($1)`, [EP.zz_uk]);
  let s = await one(db, `select finish_at, rest_at from public.push_subs where endpoint = $1`, [EP.zz_uk]);
  ok(s.finish_at && s.rest_at, 'another athlete cannot disarm your phone');
  await asAthlete(db, 'zz_uk');
  await db.query(`select public.push_rest_disarm($1)`, [EP.zz_uk]);
  s = await one(db, `select finish_at, rest_at, finish_token, rest_token from public.push_subs where endpoint = $1`, [EP.zz_uk]);
  ok(!s.finish_at && !s.rest_at && !s.finish_token && !s.rest_token, 'back in the app: both kinds are cleared', s);

  section('6. The every-minute job');
  let f = (await one(db, `select public.push_rest_fire() as f`)).f;
  ok(f.due === 0, 'nothing due: it wakes no sender', f);
  await db.query(`select public.push_finish_arm($1, $2::timestamptz)`, [EP.zz_uk, inSecs(45)]);
  f = (await one(db, `select public.push_rest_fire() as f`)).f;
  ok(f.due === undefined, 'a reminder due within 70 s: it goes on to call the sender', f);
  await db.query(`select public.push_rest_disarm($1)`, [EP.zz_uk]);

  section('7. The erasure takes the phone with it');
  await db.query(`select public.push_finish_arm($1, $2::timestamptz)`, [EP.zz_uk, inSecs(600)]);
  await asCoach(db);
  await one(db, `select public.coach_erase_person('athlete', 'zz_uk', 'zz_uk', '{}'::uuid[], false) as r`);
  ok((await all(db, `select 1 from public.push_subs where athlete_id = 'zz_uk'`)).length === 0, 'erasing a person takes their phone and its reminder');

  section('8. The way back');
  await runSql(db, read(ROLLBACK), 'rollback');
  ok((await nFinishCols(db)).n === 0, 'the way back drops the columns');
  ok(!(await one(db, `select count(*)::int as n from pg_proc where proname in ('push_finish_arm','push_alert_due','push_alert_take')`)).n, 'and the three functions');
  const dis = (await one(db, `select pg_get_functiondef('public.push_rest_disarm(text)'::regprocedure) as d`)).d;
  ok(!/finish/.test(dis), "stage107's disarm is back as it was");
  await asAthlete(db, 'zz_ir');
  r = (await one(db, `select public.push_rest_arm($1, $2::timestamptz) as r`, [EP.zz_ir, inSecs(60)])).r;
  await db.query(`select public.push_rest_disarm($1)`, [EP.zz_ir]);
  ok(r && !(await one(db, `select rest_at from public.push_subs where endpoint = $1`, [EP.zz_ir])).rest_at, 'and the rest alert still arms and disarms');
  ok(((await one(db, `select public.push_rest_fire() as f`)).f || {}).due === 0, 'and the job still answers');
  await runSql(db, read(ROLLBACK), 'rollback again');
  ok(true, 'the way back runs twice with no error');

  section('9. Line endings');
  await runSql(db, stageSql.split('\r\n').join('\n').split('\n').join('\r\n'), 'stage108 with CRLF lines');
  ok((await nFinishCols(db)).n === 2, 'the stage applies from a CRLF file');
  await runSql(db, read(ROLLBACK).split('\r\n').join('\n'), 'rollback with LF lines');
  ok((await nFinishCols(db)).n === 0, 'and the way back with LF lines takes it out');

  console.log(`\n${passed} of ${passed + failed} checks passed`);
  if (failed) { console.log('\nFAILED:'); fails.forEach(f => console.log('  · ' + f)); }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('\nrehearsal blew up:', e); process.exit(2); });
