// Rehearses supabase/stage84_push.sql (the two reminders on a phone: the subscription, the settings,
// and push_due(), which is the part that decides who gets buzzed) and its way back
// (scripts/push/rollback_stage84.sql) on PGlite. Nothing live, made-up athletes only (zz_ ids).
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/push/rehearse_push.mjs
//
// The live structure (supabase/schema_snapshot.sql without the push tables), then stage84 twice.
// No backup file is needed: every row below is made up here.
//
//   0. the structure without stage84, made-up athletes, coach_erase_person() as it is
//   1. stage84 twice; the two tables and their row-level security; who may execute what; the erase patch
//   2. subscribing: signed out, a real one, the same phone again, a second phone, a phone that moves athlete
//   3. the settings: the switches merge, the hour and the quiet days are clamped, they apply to every phone
//   4. push_me(): its shape, and that it never hands back the endpoint or the keys
//   5. push_due(), the heart: the hour, the time zone, habits, the workout, WHO WINS, free athletes,
//      the day already sent, a dead phone, and the words in both languages
//   6. push_done(), push_drop(), push_sweep()
//   7. the erasure takes both tables with it
//   8. nothing else moved
//   9. the way back
//  10. line endings: the apply and the way back from files whose lines end differently
//
// A check that fails because stage84 is wrong is a finding: it is reported, not fixed here.
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

const STAGE = opt('--stage') || path.join(ROOT, 'supabase', 'stage84_push.sql');
const ROLLBACK = opt('--rollback') || path.join(ROOT, 'scripts', 'push', 'rollback_stage84.sql');

// Signed in as one athlete / as the coach / as nobody. current_athlete_id() and is_coach() read the
// request's claims, which is what these set.
// ⚠️ set_config's third argument must be FALSE here. `true` means "for this transaction", and PGlite
// runs each query in its own implicit transaction, so a claim set with `true` is already gone by the
// next statement and current_athlete_id() quietly returns null for everything.
const claim = (db, o) => db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(o).replace(/'/g, "''")}', false)`);
const asNobody = db => db.exec(`select set_config('request.jwt.claims', '', false)`);
const asCoach = db => claim(db, { email: COACH.email, role: 'authenticated' });
const USER = {};   // athlete id -> the uuid of their login
const asAthlete = (db, id) => claim(db, { sub: USER[id], email: `athlete.${id}@example.test`, role: 'authenticated' });

const one = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];
const all = async (db, sql, params = []) => (await db.query(sql, params)).rows;

// A fixed instant to reason from, so nothing depends on when this is run.
// 2026-11-12 17:00 UTC: 17:00 in the UK (offset 0) and 20:30 in Iran (offset +210).
const T = '2026-11-12T17:00:00Z';
const atUtc = h => `2026-11-12T${String(h).padStart(2, '0')}:00:00Z`;

(async () => {
  const db = await openDb();

  section('0. The structure, and made-up athletes');
  // The stand-ins for what Supabase itself provides (the auth schema, auth.uid(), auth.jwt()) come
  // first: the snapshot's tables reference them.
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/create table (if not exists )?public\.push_subs/i);
  info('from ' + snap.says);
  await runSql(db, snap.sql, 'schema snapshot');
  await db.exec(`set timezone = 'UTC'`);
  ok(!(await one(db, `select to_regclass('public.push_subs')::text as t`)).t,
     'the snapshot does not hold the push tables yet');

  // Four made-up people. zz_ so nothing can be mistaken for a real athlete.
  //   zz_uk      coached, in the UK (offset 0)
  //   zz_iran    coached, in Iran (offset +210), Farsi
  //   zz_free    a free Proof athlete, no plan
  //   zz_quiet   coached, has not trained in a long time
  const PEOPLE = [
    ['zz_uk', 'coached'], ['zz_iran', 'coached'], ['zz_free', 'free'], ['zz_quiet', 'coached'],
  ];
  let nUser = 0;
  for (const [id, tier] of PEOPLE) {
    await db.query(
      `insert into public.programs (athlete_id, data) values ($1, $2::jsonb)
         on conflict (athlete_id) do update set data = excluded.data`,
      [id, JSON.stringify({ athlete: { id, name: id, tier } })]);
    const u = `00000000-0000-4000-8000-${String(++nUser).padStart(12, '0')}`;
    USER[id] = u;
    await db.query(`insert into auth.users (id, email) values ($1, $2) on conflict do nothing`,
      [u, `athlete.${id}@example.test`]);
    await db.query(`insert into public.athlete_identities (user_id, athlete_id, email, linked_at)
                    values ($1, $2, $3, now()) on conflict do nothing`, [u, id, `athlete.${id}@example.test`]);
  }
  ok((await all(db, `select 1 from public.programs where athlete_id like 'zz_%'`)).length === 4,
     'four made-up athletes exist');

  const eraseBefore = await eraseDef(db);
  ok(!/push_subs/.test(eraseBefore), 'coach_erase_person() does not mention the push tables yet');

  section('1. stage84, applied twice');
  const stageSql = read(STAGE);
  await runSql(db, stageSql, 'stage84');
  await runSql(db, stageSql, 'stage84 again');
  ok(true, 'the stage applies twice with no error (safe to re-run)');

  for (const t of ['push_subs', 'push_sent']) {
    const r = await one(db, `select relrowsecurity as rls from pg_class where oid = ('public.' || $1)::regclass`, [t]);
    ok(r && r.rls === true, `${t} has row-level security on`);
  }
  // anon may do nothing at all; authenticated may only READ (so the coach's backup is complete)
  for (const t of ['push_subs', 'push_sent']) {
    const g = await one(db,
      `select has_table_privilege('anon', 'public.' || $1, 'select') as a_sel,
              has_table_privilege('anon', 'public.' || $1, 'insert') as a_ins,
              has_table_privilege('authenticated', 'public.' || $1, 'insert') as u_ins`, [t]);
    ok(g.a_sel === false && g.a_ins === false, `anon can neither read nor write ${t}`);
    ok(g.u_ins === false, `a signed-in athlete cannot write ${t} directly`);
  }

  const USER_FNS = ['push_subscribe', 'push_set', 'push_forget', 'push_me'];
  const HELPERS = ['push_due', 'push_done', 'push_drop', 'push_sweep', 'push_kind_list', 'push_on', 'push_local', 'push_lines'];
  for (const f of USER_FNS) {
    const r = await one(db, `select count(*)::int as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                               where n.nspname='public' and p.proname=$1`, [f]);
    ok(r.n === 1, `${f}() exists`);
  }
  for (const f of HELPERS) {
    const r = await one(db, `select bool_or(has_function_privilege('authenticated', p.oid, 'execute')) as u
                               from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                              where n.nspname='public' and p.proname=$1`, [f]);
    ok(r.u === false, `${f}() is the service role's only`);
  }
  for (const f of USER_FNS) {
    const r = await one(db, `select bool_or(has_function_privilege('anon', p.oid, 'execute')) as a
                               from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                              where n.nspname='public' and p.proname=$1`, [f]);
    ok(r.a === false, `anon cannot run ${f}()`);
  }

  const eraseAfter = await eraseDef(db);
  ok(/'push_subs'/.test(eraseAfter) && /'push_sent'/.test(eraseAfter),
     'coach_erase_person() now lists both push tables', eraseAfter.slice(0, 120));
  ok((eraseAfter.match(/'push_subs'/g) || []).length === 1,
     'it lists push_subs exactly once after two applies');

  section('2. Subscribing');
  await asNobody(db);
  const outSub = await one(db, `select public.push_subscribe('https://x.example/aaaaaaaaaaaaaaaaaaaaaa', 'p', 'a') as r`);
  ok(outSub.r === null, 'signed out, push_subscribe() does nothing and returns null');

  const EP = {
    uk: 'https://web.push.apple.com/zz-uk-endpoint-0000000000',
    uk2: 'https://fcm.googleapis.com/zz-uk-second-phone-00000',
    iran: 'https://web.push.apple.com/zz-iran-endpoint-000000000',
    free: 'https://fcm.googleapis.com/zz-free-endpoint-00000000',
    quiet: 'https://fcm.googleapis.com/zz-quiet-endpoint-0000000',
  };
  await asAthlete(db, 'zz_uk');
  await one(db, `select public.push_subscribe($1,'p256-uk','auth-uk','proof',20,0,'en','iPhone 14 · Safari') as r`, [EP.uk]);
  let row = await one(db, `select * from public.push_subs where endpoint = $1`, [EP.uk]);
  ok(row && row.athlete_id === 'zz_uk' && row.hour === 20 && row.tz_offset === 0 && row.lang === 'en',
     'a subscription is stored against the signed-in athlete', row && { a: row.athlete_id, h: row.hour });
  ok(row.kinds && Object.keys(row.kinds).length === 0, 'kinds starts empty, so every kind is on');

  // the same phone again: an update, never a second row (the browser rotates these)
  await one(db, `select public.push_subscribe($1,'p256-uk-2','auth-uk-2','proof',20,0,'en','iPhone 14 · Safari') as r`, [EP.uk]);
  const n1 = await one(db, `select count(*)::int as n from public.push_subs where athlete_id='zz_uk'`);
  row = await one(db, `select * from public.push_subs where endpoint=$1`, [EP.uk]);
  ok(n1.n === 1 && row.p256dh === 'p256-uk-2', 'subscribing the same phone again updates it, it does not add a row');

  // a second phone for the same athlete
  await one(db, `select public.push_subscribe($1,'p256-uk-b','auth-uk-b','training',20,0,'en','Pixel · Chrome') as r`, [EP.uk2]);
  const n2 = await one(db, `select count(*)::int as n from public.push_subs where athlete_id='zz_uk'`);
  ok(n2.n === 2, 'a second phone is its own row');

  // a phone that another athlete signs in on follows the endpoint, because the endpoint IS the phone
  await asAthlete(db, 'zz_iran');
  await one(db, `select public.push_subscribe($1,'p256-x','auth-x','proof',20,210,'fa','shared handset') as r`, [EP.uk2]);
  row = await one(db, `select * from public.push_subs where endpoint=$1`, [EP.uk2]);
  ok(row.athlete_id === 'zz_iran', 'a phone that a different athlete signs in on moves to them');
  await one(db, `select public.push_forget($1) as r`, [EP.uk2]);

  await one(db, `select public.push_subscribe($1,'p256-ir','auth-ir','proof',20,210,'fa','iPhone 12 · Safari') as r`, [EP.iran]);
  await asAthlete(db, 'zz_free');
  await one(db, `select public.push_subscribe($1,'p256-fr','auth-fr','proof',20,210,'fa','Android') as r`, [EP.free]);
  await asAthlete(db, 'zz_quiet');
  await one(db, `select public.push_subscribe($1,'p256-q','auth-q','training',20,0,'en','Android') as r`, [EP.quiet]);
  ok((await all(db, `select 1 from public.push_subs`)).length === 4, 'four phones are subscribed');

  let bad = null;
  try { await db.query(`insert into public.push_subs (endpoint, athlete_id, p256dh, auth, hour) values ('e','zz_uk','p','a',3)`); }
  catch (e) { bad = e; }
  ok(bad !== null, 'the quiet hours are a CHECK: an hour of 3 cannot be stored at all');

  section('3. The settings');
  await asAthlete(db, 'zz_uk');
  await one(db, `select public.push_set('{"habits": false}'::jsonb, null, null) as r`);
  row = await one(db, `select * from public.push_subs where endpoint=$1`, [EP.uk]);
  ok(row.kinds.habits === false, 'a switch turned off is stored');
  await one(db, `select public.push_set('{"workout": false}'::jsonb, null, null) as r`);
  row = await one(db, `select * from public.push_subs where endpoint=$1`, [EP.uk]);
  ok(row.kinds.habits === false && row.kinds.workout === false, 'switches MERGE, they do not replace each other');
  await one(db, `select public.push_set('{"habits": true, "workout": true}'::jsonb, null, null) as r`);
  row = await one(db, `select * from public.push_subs where endpoint=$1`, [EP.uk]);
  ok(row.kinds.habits === true && row.kinds.workout === true, 'and they can be turned back on');

  await one(db, `select public.push_set(null, 3, null) as r`);
  row = await one(db, `select * from public.push_subs where endpoint=$1`, [EP.uk]);
  ok(row.hour === 8, 'an hour before the quiet hours is clamped to 8, never stored as given');
  await one(db, `select public.push_set(null, 23, null) as r`);
  row = await one(db, `select * from public.push_subs where endpoint=$1`, [EP.uk]);
  ok(row.hour === 22, 'and an hour after them is clamped to 22');
  await one(db, `select public.push_set(null, 20, 9) as r`);
  row = await one(db, `select * from public.push_subs where endpoint=$1`, [EP.uk]);
  ok(row.hour === 20 && row.quiet_days === 4, 'the quiet days are clamped to 4');
  await one(db, `select public.push_set(null, null, 2) as r`);

  section('4. push_me()');
  const me = (await one(db, `select public.push_me() as r`)).r;
  ok(me && me.on === true && me.phones === 1 && me.hour === 20 && me.quiet_days === 2, 'push_me() reports the athlete\'s settings', me);
  ok(Array.isArray(me.list) && me.list.includes('habits') && me.list.includes('workout'), 'it carries the list of kinds');
  const meText = JSON.stringify(me);
  ok(!meText.includes(EP.uk) && !meText.includes('p256') && !meText.includes('auth-uk'),
     'it NEVER hands back the endpoint or the keys', meText.slice(0, 200));
  await asNobody(db);
  ok((await one(db, `select public.push_me() as r`)).r === null, 'signed out, push_me() is null');

  section('5. push_due(), the heart of it');
  // Facts: career_facts is the one ledger Career Mode writes. A habit day closed, a session finished.
  const fact = (id, kind, day, ref) => db.query(
    `insert into public.career_facts (athlete_id, kind, ref, day, value, source)
     values ($1,$2,$3,$4,'{}'::jsonb,'server') on conflict (athlete_id, kind, ref) do nothing`,
    [id, kind, ref || `${kind}:${day}`, day]);

  const due = async (nowIso) => all(db, `select * from public.push_due($1::timestamptz)`, [nowIso]);
  const kindsFor = (rows, id) => rows.filter(r => r.athlete_id === id).map(r => r.kind).sort();

  // Nobody has trained or ticked anything yet, so at 17:00 UTC the UK athlete (hour 20, offset 0) is
  // not due: it is 17:00 for them.
  let rows = await due(T);
  ok(kindsFor(rows, 'zz_uk').length === 0, 'at 17:00 their time, nobody at hour 20 is due');
  // ...but the Iranian athlete is at +210, so 17:00 UTC is 20:30 for them — their hour.
  ok(kindsFor(rows, 'zz_iran').length > 0, 'the Iranian athlete at +3:30 IS due at the same instant', rows.map(r => [r.athlete_id, r.kind]));
  info('the time zone is the point: one instant, two different local hours');

  rows = await due(atUtc(20));
  ok(kindsFor(rows, 'zz_uk').length > 0, 'at 20:00 UTC the UK athlete is due');
  ok(kindsFor(rows, 'zz_iran').length === 0, 'and the Iranian athlete is not (it is 23:30 for them)');

  // WHO WINS. zz_uk is coached and has trained nothing, so the workout one is due; the habit one is
  // withheld, because training is one of the eight habits and two buzzes for one thing is a swipe.
  ok(kindsFor(rows, 'zz_uk').join(',') === 'workout',
     'when both are due, ONLY the workout one goes', kindsFor(rows, 'zz_uk'));

  // Give them a session today: the workout one stops, the habit one takes over.
  await fact('zz_uk', 'session_finished', '2026-11-12', 'sess:1');
  rows = await due(atUtc(20));
  ok(kindsFor(rows, 'zz_uk').join(',') === 'habits',
     'after a session, the workout one stops and the habit one is what goes');

  // Close their habit day too: nothing at all is due.
  await fact('zz_uk', 'habit_day', '2026-11-12');
  rows = await due(atUtc(20));
  ok(kindsFor(rows, 'zz_uk').length === 0, 'with the day closed and a session done, nothing is due');

  // The quiet window: a session two days ago is still inside quiet_days = 2, three days ago is not.
  await db.query(`delete from public.career_facts where athlete_id = 'zz_quiet'`);
  await fact('zz_quiet', 'habit_day', '2026-11-12');          // habits closed, so only the workout one can fire
  await fact('zz_quiet', 'session_finished', '2026-11-11', 'q1');
  rows = await due(atUtc(20));
  ok(kindsFor(rows, 'zz_quiet').length === 0, 'a session yesterday is inside the quiet window, so nothing goes');
  await db.query(`delete from public.career_facts where athlete_id='zz_quiet' and kind='session_finished'`);
  await fact('zz_quiet', 'session_finished', '2026-11-09', 'q2');
  rows = await due(atUtc(20));
  ok(kindsFor(rows, 'zz_quiet').join(',') === 'workout', 'three days of quiet and the workout one goes');

  // A free athlete has no plan, so there is nothing to be reminded to train for.
  rows = await due(atUtc(20 - 3));   // 17:00 UTC is 20:30 in Iran, where zz_free is
  const freeKinds = kindsFor(rows, 'zz_free');
  ok(!freeKinds.includes('workout'), 'a free athlete is never sent the workout one', freeKinds);
  ok(freeKinds.includes('habits'), 'but they do get the habit one: it is their whole product');

  // The words, in their language.
  const irRow = rows.find(r => r.athlete_id === 'zz_free');
  ok(irRow && /[؀-ۿ]/.test(irRow.title), 'a Farsi athlete gets Farsi words', irRow && irRow.title);
  rows = await due(atUtc(20));
  const ukRow = rows.find(r => r.athlete_id === 'zz_quiet');
  ok(ukRow && ukRow.title === 'Time to train' && ukRow.ttl === 7200,
     'an English athlete gets English words, and every row carries its own TTL', ukRow && { t: ukRow.title, ttl: ukRow.ttl });

  // Already sent today: it does not go twice, however often the job runs.
  await one(db, `select public.push_done('zz_quiet','workout','2026-11-12',true) as r`);
  rows = await due(atUtc(20));
  ok(kindsFor(rows, 'zz_quiet').length === 0, 'a reminder already sent today does not go again');

  // A phone that keeps failing is left alone.
  await db.query(`update public.push_subs set fails = 5 where athlete_id = 'zz_free'`);
  rows = await due(atUtc(17));
  ok(kindsFor(rows, 'zz_free').length === 0, 'a phone that has failed five times is skipped');
  await db.query(`update public.push_subs set fails = 0 where athlete_id = 'zz_free'`);

  // A switch turned off means nothing fires for that kind.
  await asAthlete(db, 'zz_quiet');
  await one(db, `select public.push_set('{"workout": false}'::jsonb, null, null) as r`);
  await db.query(`delete from public.push_sent where athlete_id='zz_quiet'`);
  rows = await due(atUtc(20));
  ok(kindsFor(rows, 'zz_quiet').length === 0, 'a kind switched off does not fire');
  await one(db, `select public.push_set('{"workout": true}'::jsonb, null, null) as r`);

  section('6. What the sender tells us back');
  await db.query(`delete from public.push_sent`);
  await one(db, `select public.push_done('zz_uk','habits','2026-11-12',true) as r`);
  await one(db, `select public.push_done('zz_uk','habits','2026-11-12',true) as r`);
  ok((await all(db, `select 1 from public.push_sent where athlete_id='zz_uk'`)).length === 1,
     'push_done() twice for the same day and kind leaves one row');
  row = await one(db, `select * from public.push_subs where endpoint=$1`, [EP.uk]);
  ok(row.last_ok_at !== null && row.fails === 0, 'a good send stamps the phone and clears its failures');
  await one(db, `select public.push_done('zz_uk','habits','2026-11-12',false) as r`);
  row = await one(db, `select * from public.push_subs where endpoint=$1`, [EP.uk]);
  ok(row.fails === 1, 'a bad one counts against it');

  // A send that failed on every phone must NOT be written down as sent, or the reminder is lost in
  // silence. push_due() still only fires at the athlete's own hour, so "try again" is once more that
  // evening, never a retry storm.
  await db.query(`delete from public.push_sent where athlete_id='zz_uk'`);
  await one(db, `select public.push_done('zz_uk','habits','2026-11-12',false) as r`);
  ok((await all(db, `select 1 from public.push_sent where athlete_id='zz_uk'`)).length === 0,
     'a send that failed everywhere leaves the day UNMARKED, so it is tried again');
  await one(db, `select public.push_done('zz_uk','habits','2026-11-12',true) as r`);
  ok((await all(db, `select 1 from public.push_sent where athlete_id='zz_uk'`)).length === 1,
     'and the day is written down as soon as one phone takes it');

  await one(db, `select public.push_drop($1) as r`, [EP.uk]);
  ok((await all(db, `select 1 from public.push_subs where endpoint=$1`, [EP.uk])).length === 0,
     'push_drop() removes a dead subscription (a 404 or 410 from the push service)');

  await db.query(`insert into public.push_sent (athlete_id, day, kind) values ('zz_uk','2026-01-01','habits')`);
  const swept = (await one(db, `select public.push_sweep() as n`)).n;
  ok(swept >= 1, 'push_sweep() clears the old ledger', swept);

  section('7. The erasure takes both tables with it');
  await asCoach(db);
  const before = (await all(db, `select 1 from public.push_subs where athlete_id='zz_iran'`)).length;
  // (kind, id, typed-back id, the logins, dry_run) — the kind comes first, and a real run needs the
  // id typed back, which is what the dashboard's panel asks the coach for.
  const er = await one(db, `select public.coach_erase_person('athlete', 'zz_iran', 'zz_iran', '{}'::uuid[], false) as r`);
  const left = (await all(db, `select 1 from public.push_subs where athlete_id='zz_iran'`)).length;
  ok(before === 1 && left === 0, 'erasing a person takes their phones with them', { before, left });
  ok(er.r && JSON.stringify(er.r).includes('push_subs'), 'and the receipt names push_subs', JSON.stringify(er.r).slice(0, 220));

  section('8. Nothing else moved');
  const others = await one(db,
    `select (select count(*)::int from public.programs) as programs,
            (select count(*)::int from public.career_facts where athlete_id like 'zz_%') as facts`);
  ok(others.programs >= 3, 'the programmes are still there', others);

  section('9. The way back');
  await runSql(db, read(ROLLBACK), 'rollback');
  ok((await all(db, `select 1 from pg_class where relname in ('push_subs','push_sent') and relnamespace='public'::regnamespace`)).length === 0,
     'the way back drops both tables');
  const kept = await all(db, `select 1 from pg_class where relname='push_subs_before' and relnamespace='backup'::regnamespace`);
  ok(kept.length === 1, 'and keeps the answers in backup.push_subs_before');
  const eraseBack = await eraseDef(db);
  ok(!/push_subs/.test(eraseBack), 'coach_erase_person() no longer names a table that is gone');
  await runSql(db, read(ROLLBACK), 'rollback again');
  ok(true, 'the way back runs twice with no error');

  section('10. Line endings');
  // A Windows checkout ends this file's lines with CRLF while the way back may be run from a copy with
  // LF, or the other way round. stage81 found the hard way that a patch built from a file's own
  // newlines leaves a delete of a dropped table behind, and every erasure after it fails.
  await runSql(db, stageSql.split('\n').join('\r\n'), 'stage84 with CRLF lines');
  const eraseCrlf = await eraseDef(db);
  ok(/'push_subs'/.test(eraseCrlf), 'the stage patches the erase function when its own lines end with CRLF');
  await runSql(db, read(ROLLBACK).split('\r\n').join('\n').split('\n').join('\n'), 'rollback with LF lines');
  const eraseLf = await eraseDef(db);
  ok(!/push_subs/.test(eraseLf),
     'and a way back whose lines end differently still takes the patch out — no delete of a dropped table is left behind',
     eraseLf.slice(0, 160));

  console.log(`\n${passed} of ${passed + failed} checks passed`);
  if (failed) { console.log('\nFAILED:'); fails.forEach(f => console.log('  · ' + f)); }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('\nrehearsal blew up:', e); process.exit(2); });
