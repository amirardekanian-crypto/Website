// Rehearses supabase/stage86_crew_push.sql (everything in the crew reaches everyone's phone) and its
// way back (scripts/push/rollback_stage86.sql) on PGlite. Nothing live, made-up athletes only (zz_).
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/push/rehearse_crew_push.mjs
//
// The live structure (supabase/schema_snapshot.sql, which already holds stage81's Crew and stage84's
// reminders), then stage86 twice. No backup file is needed: every row below is made up here.
//
//   0. the structure without stage86, made-up athletes, their phones and their answers
//   1. stage86 twice; the two tables and their row-level security; who may execute what; the triggers
//   2. the seven triggers: a post, a photo post, a cheer, a level, a week, a best, a cycle, a mark,
//      an achievement, an honour, the Open, joining — and what must NEVER queue
//   3. the decision: your own doing, the night, the switches, a no, folding, "cheered you", Farsi
//   4. the watermark: pending, done, a failure, a dry run
//   5. the sweep
//   6. the erasure takes both tables with it
//   7. nothing in the scorer moved
//   8. the way back, twice
//   9. line endings
//
// ⚠️ TIME. Every queue row's created_at is SET here rather than left to default, because PGlite's
// now() is the real clock while the instant the decision is asked about (T below) is made up. A row
// written at the real now and judged against a made-up T a few weeks later would look seven days old
// and be filtered out, and the whole rehearsal would pass by accident with nothing in it.
//
// A check that fails because stage86 is wrong is a finding: it is reported, not fixed here.
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

const STAGE = opt('--stage') || path.join(ROOT, 'supabase', 'stage86_crew_push.sql');
const ROLLBACK = opt('--rollback') || path.join(ROOT, 'scripts', 'push', 'rollback_stage86.sql');

const claim = (db, o) => db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(o).replace(/'/g, "''")}', false)`);
const asCoach = db => claim(db, { email: COACH.email, role: 'authenticated' });
const USER = {};
const asAthlete = (db, id) => claim(db, { sub: USER[id], email: `athlete.${id}@example.test`, role: 'authenticated' });

const one = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];
const all = async (db, sql, params = []) => (await db.query(sql, params)).rows;

// The made-up instant every decision below is asked about.
// 2026-11-12 10:00 UTC: 10:00 in the UK (offset 0) and 13:30 in Iran (offset +210) — both awake.
const T = '2026-11-12T10:00:00Z';
const NIGHT = '2026-11-12T23:30:00Z';     // 23:30 in the UK, 03:00 in Iran: both asleep
const EARLY = '2026-11-12T06:00:00Z';     // 06:00 in the UK (asleep), 09:30 in Iran (awake)

(async () => {
  const db = await openDb();

  section('0. The structure, the athletes, their phones and their answers');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/create table (if not exists )?public\.crew_push_q/i);
  info('from ' + snap.says);
  await runSql(db, snap.sql, 'schema snapshot');
  await db.exec(`set timezone = 'UTC'`);
  ok(!(await one(db, `select to_regclass('public.crew_push_q')::text as t`)).t,
     'the snapshot does not hold the crew queue yet');
  for (const t of ['crew_consent', 'crew_posts', 'crew_kudos', 'crew_rings', 'push_subs'])
    ok((await one(db, `select to_regclass('public.' || $1)::text as t`, [t])).t, `the snapshot holds ${t} (stage81 and stage84 are live)`);

  const AMIR = (await one(db, `select public.coach_note_id() as id`)).id;
  info('Amir posts as ' + AMIR);

  //   zz_a   UK (offset 0), English, a yes, a phone
  //   zz_b   Iran (offset +210), Farsi, a yes, a phone
  //   zz_c   UK, a yes, a phone with the crew switch OFF
  //   zz_no  UK, a phone, but said NO to the crew
  //   zz_ph  UK, a yes, NO phone at all
  const PEOPLE = ['zz_a', 'zz_b', 'zz_c', 'zz_no', 'zz_ph'];
  let nUser = 0;
  for (const id of PEOPLE) {
    await db.query(`insert into public.programs (athlete_id, data) values ($1, $2::jsonb)
                      on conflict (athlete_id) do update set data = excluded.data`,
      [id, JSON.stringify({ athlete: { id, firstName: id.toUpperCase(), lastName: 'Test', tier: 'coached' } })]);
    const u = `00000000-0000-4000-8000-${String(++nUser).padStart(12, '0')}`;
    USER[id] = u;
    await db.query(`insert into auth.users (id, email) values ($1, $2) on conflict do nothing`, [u, `athlete.${id}@example.test`]);
    await db.query(`insert into public.athlete_identities (user_id, athlete_id, email, linked_at)
                      values ($1, $2, $3, now()) on conflict do nothing`, [u, id, `athlete.${id}@example.test`]);
  }

  const EP = {};
  // The phones go on FIRST: crew_push_add() does nothing while nobody is subscribed, which is exactly
  // what keeps this stage free until the first athlete taps the permission.
  for (const [id, off, lang, kinds] of [['zz_a', 0, 'en', '{}'], ['zz_b', 210, 'fa', '{}'],
                                        ['zz_c', 0, 'en', '{"crew": false}'], ['zz_no', 0, 'en', '{}']]) {
    EP[id] = `https://push.example.test/${id}`;
    await db.query(`insert into public.push_subs (endpoint, athlete_id, p256dh, auth, app, kinds, tz_offset, lang, created_at)
                    values ($1, $2, 'k-' || $2, 'a-' || $2, 'training', $3::jsonb, $4, $5, $6)`,
      [EP[id], id, kinds, off, lang, '2026-11-01T00:00:00Z']);
  }
  ok((await all(db, `select 1 from public.push_subs`)).length === 4, 'four phones are subscribed');

  for (const [id, answer] of [['zz_a', 'yes'], ['zz_b', 'yes'], ['zz_c', 'yes'], ['zz_no', 'no'], ['zz_ph', 'yes']]) {
    await db.query(`insert into public.crew_consent (athlete_id, answer, name, answered_at, first_yes_at, yes_since)
                    values ($1, $2, $1, $3::timestamptz, case when $2 = 'yes' then $3::timestamptz end,
                            case when $2 = 'yes' then $3::timestamptz end)`,
      [id, answer, '2026-11-01T00:00:00Z']);
  }
  ok((await all(db, `select 1 from public.crew_members()`)).length === 4,
     'four of the five are crew members (the no is not)');

  const eraseBefore = await eraseDef(db);
  ok(!/crew_push_q/.test(eraseBefore), 'coach_erase_person() does not mention the crew queue yet');

  section('1. stage86, applied twice');
  const stageSql = read(STAGE);
  await runSql(db, stageSql, 'stage86');
  await runSql(db, stageSql, 'stage86 again');
  ok(true, 'the stage applies twice with no error (safe to re-run)');

  for (const t of ['crew_push_q', 'crew_push_seen']) {
    const r = await one(db, `select relrowsecurity as rls from pg_class where oid = ('public.' || $1)::regclass`, [t]);
    ok(r && r.rls === true, `${t} has row-level security on`);
    const g = await one(db,
      `select has_table_privilege('anon', 'public.' || $1, 'select') as a_sel,
              has_table_privilege('authenticated', 'public.' || $1, 'select') as u_sel,
              has_table_privilege('service_role', 'public.' || $1, 'select') as s_sel`, [t]);
    ok(g && !g.a_sel && !g.u_sel && g.s_sel, `${t} is the service role's alone (no policy, no door but a function)`, g);
    ok((await all(db, `select 1 from pg_policies where schemaname='public' and tablename=$1`, [t])).length === 0,
       `${t} has no policy at all`);
  }

  // Not one of these is an athlete's to call: the switch they have is stage84's push_set('crew').
  for (const f of ['crew_push_due(timestamptz,boolean)', 'crew_push_fold(timestamptz)', 'crew_push_done(text,boolean)',
                   'crew_push_add(text,text,uuid,jsonb)', 'crew_push_words(integer,text,text,boolean,text)',
                   'crew_push_sweep()', 'crew_push_fire()']) {
    const g = await one(db,
      `select has_function_privilege('anon', 'public.' || $1, 'execute') as a,
              has_function_privilege('authenticated', 'public.' || $1, 'execute') as u,
              has_function_privilege('service_role', 'public.' || $1, 'execute') as s`, [f]);
    ok(g && !g.a && !g.u && g.s, `${f.split('(')[0]}() is the service role's only`, g);
  }

  const TRIGS = [['crew_push_post', 'crew_posts'], ['crew_push_kudos', 'crew_kudos'], ['crew_push_ring', 'crew_rings'],
                 ['crew_push_fact', 'career_facts'], ['crew_push_award', 'career_awards'],
                 ['crew_push_honour', 'career_honours'], ['crew_push_joined', 'crew_consent']];
  for (const [trg, tbl] of TRIGS) {
    const r = await all(db, `select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                              where t.tgname = $1 and c.relname = $2 and not t.tgisinternal`, [trg, tbl]);
    ok(r.length === 1, `${trg} is on ${tbl}`);
  }

  const eraseAfter = await eraseDef(db);
  ok(/'crew_push_q'/.test(eraseAfter) && /'crew_push_seen'/.test(eraseAfter),
     'coach_erase_person() now names both tables');

  section('2. The seven triggers: what queues, and what never does');
  const clearQ = () => db.query(`delete from public.crew_push_q`);
  const qKinds = async () => (await all(db, `select kind, athlete_id from public.crew_push_q order by id`)).map(r => `${r.athlete_id}:${r.kind}`);

  await clearQ();
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'hello crew')`);
  ok((await qKinds()).join(',') === 'zz_a:post', 'a post queues one row', await qKinds());

  await clearQ();
  await db.query(`insert into public.crew_posts (athlete_id, body, has_photo) values ('zz_b', '', true)`);
  ok((await qKinds()).join(',') === 'zz_b:post', 'a photo with no words queues too (Amir: "any new image")');

  await clearQ();
  await db.query(`insert into public.crew_posts (athlete_id, body) values ($1, 'from Amir')`, [AMIR]);
  ok((await qKinds()).join(',') === `${AMIR}:post`, "Amir's own post queues, though he is no crew member");

  // A cheer on a post, and a cheer on a Bell line. The recipient is kept as their crew_key.
  await clearQ();
  const post = await one(db, `insert into public.crew_posts (athlete_id, body) values ('zz_a', 'cheer me') returning id`);
  await clearQ();
  await db.query(`insert into public.crew_kudos (athlete_id, post_id) values ('zz_b', $1)`, [post.id]);
  let row = await one(db, `select * from public.crew_push_q order by id desc limit 1`);
  const keyA = (await one(db, `select crew_key from public.crew_consent where athlete_id='zz_a'`)).crew_key;
  ok(row.kind === 'kudos' && row.athlete_id === 'zz_b' && row.target_key === keyA,
     "a cheer on a post queues as the giver's, and remembers the author by their crew_key", row);
  await clearQ();
  await db.query(`insert into public.crew_kudos (athlete_id, to_athlete, line_day) values ('zz_b', 'zz_a', '2026-11-12')`);
  row = await one(db, `select * from public.crew_push_q order by id desc limit 1`);
  ok(row.kind === 'kudos' && row.target_key === keyA, 'a cheer on a LINE queues the same way', row);
  ok(!JSON.stringify(await all(db, `select * from public.crew_push_q`)).includes('zz_a'),
     'and no athlete id but the giver\'s is anywhere in the queue');

  await clearQ();
  await db.query(`insert into public.crew_rings (athlete_id, kind, ref, value) values ('zz_a', 'level', '7', '{"n": 7}')`);
  await db.query(`insert into public.crew_rings (athlete_id, kind, ref, value) values ('zz_b', 'open', '2026-10', '{"text": "won"}')`);
  ok((await qKinds()).join(',') === 'zz_a:level,zz_b:open', 'a level and the Monthly Open both queue', await qKinds());

  // The facts. The day and the void are get_bell()'s own filters, carried in the trigger's WHEN.
  await clearQ();
  // Every fact needs its own ref: (athlete_id, kind, ref) is the primary key.
  let nFact = 0;
  const fact = (id, kind, day, value = '{}') =>
    db.query(`insert into public.career_facts (athlete_id, kind, ref, day, value, source)
              values ($1, $2, $5, $3::date, $4::jsonb, 'server')`, [id, kind, day, value, `${kind}:${day}:${++nFact}`]);
  await fact('zz_a', 'week_held', '2026-11-10');
  await fact('zz_a', 'personal_best', '2026-11-10', '{"lift": "Back Squat"}');
  await fact('zz_b', 'cycle_finished', '2026-11-10', '{"cycle": 3}');
  ok((await qKinds()).join(',') === 'zz_a:week,zz_a:best,zz_b:cycle',
     'a week held, a personal best and a cycle finished become week, best and cycle', await qKinds());

  await clearQ();
  await fact('zz_a', 'personal_best', '2026-11-10', '{}');                 // no lift named
  await fact('zz_a', 'week_held', '2026-01-01');                           // older than a fortnight
  await fact('zz_a', 'session_finished', '2026-11-10');                    // not a line at all
  ok((await qKinds()).length === 0,
     'a best with no lift, a fact from months ago and a kind the Bell ignores queue nothing', await qKinds());

  await clearQ();
  let nAward = 0;
  const award = (id, kind, item, how = 'live') =>
    db.query(`insert into public.career_awards (athlete_id, award_id, kind, item, tier, day, size, meaning, how, rules_version)
              values ($1, $5, $2, $3, case when $2 = 'badge' then 1 end, '2026-11-10', 'tick', 'test', $4, 1)`,
      [id, kind, item, how, `${kind}:${item}:${++nAward}`]);
  await award('zz_a', 'badge', 'held_weeks');
  await award('zz_a', 'achievement', 'first_blood');
  ok((await qKinds()).join(',') === 'zz_a:mark,zz_a:achievement', 'one of the four marks and an achievement queue', await qKinds());

  await clearQ();
  await award('zz_a', 'badge', 'something_else');       // not one of the four the Bell shows
  await award('zz_b', 'achievement', 'back_pay', 'silent');
  await award('zz_b', 'achievement', 'rebuild', 'baseline');
  ok((await qKinds()).length === 0,
     'a mark the Bell does not show, and an award minted silent or baseline, queue nothing (GAME-6)', await qKinds());

  await clearQ();
  await db.query(`insert into public.career_honours (month, honour, athlete_id) values ('2026-10-01', 'sessions', 'zz_a')`);
  await db.query(`insert into public.career_honours (month, honour, athlete_id) values ('2026-10-01', 'near', 'zz_b')`);
  ok((await qKinds()).join(',') === 'zz_a:honour', '"one week short" is never a moment', await qKinds());

  await clearQ();
  await db.query(`insert into public.crew_consent (athlete_id, answer, first_yes_at, yes_since, answered_at)
                  values ('zz_new', 'yes', now(), now(), now())`);
  ok((await qKinds()).join(',') === 'zz_new:joined', 'the first yes queues "joined the crew"', await qKinds());
  await clearQ();
  await db.query(`update public.crew_consent set yes_since = now() where athlete_id = 'zz_new'`);
  ok((await qKinds()).length === 0, 'a later yes does not queue joining again');
  await db.query(`delete from public.crew_consent where athlete_id = 'zz_new'`);

  // What must never queue.
  await clearQ();
  await db.query(`select set_config('crew.quiet', 'on', false)`);
  await fact('zz_a', 'week_held', '2026-11-11');
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'quiet')`);
  ok((await qKinds()).length === 0, 'a quiet back-pay (crew.quiet = on) queues NOTHING', await qKinds());
  await db.query(`select set_config('crew.quiet', '', false)`);

  await clearQ();
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_no', 'I said no')`);
  ok((await qKinds()).length === 0, 'someone who said no to the crew queues nothing');
  await db.query(`update public.crew_consent set under13 = true where athlete_id='zz_c'`);
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_c', 'under 13')`);
  ok((await qKinds()).length === 0, 'an under-13 queues nothing (GAME-9)');
  await db.query(`update public.crew_consent set under13 = false where athlete_id='zz_c'`);

  // Nobody subscribed: the whole stage costs nothing until the first phone asks.
  await clearQ();
  const subs = await all(db, `select * from public.push_subs`);
  await db.query(`delete from public.push_subs`);
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'nobody is listening')`);
  ok((await qKinds()).length === 0, 'with no phone subscribed at all, nothing is queued');
  for (const s of subs)
    await db.query(`insert into public.push_subs (endpoint, athlete_id, p256dh, auth, app, kinds, tz_offset, lang, created_at)
                    values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`,
      [s.endpoint, s.athlete_id, s.p256dh, s.auth, s.app, JSON.stringify(s.kinds), s.tz_offset, s.lang, s.created_at]);

  // A trigger must never fail the save it hangs off. The queue is made unwritable underneath it.
  await clearQ();
  await db.query(`alter table public.crew_push_q add constraint zz_no_writes check (false) not valid`);
  await db.query(`alter table public.crew_push_q validate constraint zz_no_writes`);
  let saved = true;
  try { await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'the queue is broken')`); }
  catch (e) { saved = false; }
  ok(saved, 'a queue that refuses every write does NOT fail the post it hangs off (a warning, nothing more)');
  await db.query(`alter table public.crew_push_q drop constraint zz_no_writes`);

  section('3. The decision: who is owed what');
  const due = async (now = T, mark = false) =>
    all(db, `select * from public.crew_push_due($1::timestamptz, $2)`, [now, mark]);
  // Everything in the queue is given an instant of its own, near T (see the note at the top).
  const stamp = (minsBeforeT = 5) =>
    db.query(`update public.crew_push_q set created_at = $1::timestamptz - ($2 || ' minutes')::interval`, [T, minsBeforeT]);
  const to = rows => rows.map(r => r.athlete_id).sort();

  await clearQ();
  await db.query(`delete from public.crew_push_seen`);
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'one post')`);
  await stamp();
  let rows = await due();
  ok(to(rows).join(',') === 'zz_b', 'one post by zz_a reaches zz_b and nobody else', to(rows));
  info('zz_a wrote it (never told), zz_c has the crew switch off, zz_no said no, zz_ph has no phone');
  ok(rows[0].kind === 'crew' && rows[0].tag === 'crew' && rows[0].ttl === 3600,
     "every row is kind and tag 'crew' with a one-hour TTL", rows[0]);
  // zz_b is the only person owed this one, and zz_b reads Farsi, so these are the Farsi words.
  ok(/zz_a/.test(rows[0].title) && /پست گذاشت/.test(rows[0].title),
     'and the words name who did it and what they did', rows[0].title);
  ok(!/one post/.test(JSON.stringify(rows)), 'the words of the post itself are nowhere in it');

  // The night, from both sides of the world.
  ok((await due(NIGHT)).length === 0, 'at half past eleven at night, nothing goes to anybody');
  rows = await due(EARLY);
  ok(to(rows).join(',') === 'zz_b', 'at six in the morning in the UK it is half past nine in Iran: zz_b is awake', to(rows));
  await clearQ();
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_b', 'from Iran')`);
  await stamp();
  ok((await due(EARLY)).length === 0, 'and the UK athlete, asleep at six, is sent nothing', await due(EARLY));
  ok(to(await due(T)).join(',') === 'zz_a', 'they get it at ten, when they are up', to(await due(T)));

  // A kind the SUBJECT switched off in Crew's settings is not on the Bell, so it is on no lock screen.
  await clearQ();
  await db.query(`update public.crew_consent set kinds = '{"level": false}'::jsonb where athlete_id='zz_a'`);
  await db.query(`insert into public.crew_rings (athlete_id, kind, ref) values ('zz_a', 'level', '9')`);
  await stamp();
  ok((await due()).length === 0, 'a level the athlete switched off rings for nobody');
  await db.query(`update public.crew_consent set kinds = '{}'::jsonb where athlete_id='zz_a'`);
  ok(to(await due()).join(',') === 'zz_b', 'switched back on, the same queued level rings again');

  // A no tomorrow silences what was queued today, exactly as it clears the Bell.
  await clearQ();
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'before the no')`);
  await stamp();
  await db.query(`update public.crew_consent set answer='no' where athlete_id='zz_a'`);
  ok((await due()).length === 0, 'an athlete who says no takes their queued moments off everyone\'s phone');
  await db.query(`update public.crew_consent set answer='yes' where athlete_id='zz_a'`);

  // Folding: one is named, six are counted.
  await clearQ();
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'p1'), ('zz_a', 'p2')`);
  await db.query(`insert into public.crew_rings (athlete_id, kind, ref) values ('zz_a', 'level', '11')`);
  await stamp();
  rows = await due();
  ok(rows.length === 1, 'three things in the crew are ONE notification, not three', rows.length);
  // Amir's words (2026-10-20): the count is in Persian digits, because nothing else in that line is
  // Latin. zz_b reads Farsi, so this is ۳ and not 3.
  ok(/۳/.test(rows[0].body) && !/3/.test(rows[0].body) && !/zz_a/.test(rows[0].title),
     'and it says how many there are in Persian digits, naming nobody', { t: rows[0].title, b: rows[0].body });
  // The same fold in English, read over zz_c's shoulder.
  await db.query(`update public.push_subs set kinds = '{}'::jsonb where athlete_id='zz_c'`);
  const en = (await due()).find(r => r.athlete_id === 'zz_c');
  ok(en && /busy/.test(en.title) && /3 new things/.test(en.body),
     'in English: "The crew has been busy · 3 new things to see."', en && { t: en.title, b: en.body });
  await db.query(`update public.push_subs set kinds = '{"crew": false}'::jsonb where athlete_id='zz_c'`);

  // "cheered you" is the one thing that reads differently for different people.
  await clearQ();
  const p2 = await one(db, `insert into public.crew_posts (athlete_id, body) values ('zz_b', 'mine') returning id`);
  await clearQ();
  await db.query(`insert into public.crew_kudos (athlete_id, post_id) values ('zz_a', $1)`, [p2.id]);
  await stamp();
  rows = await due();
  const forB = rows.find(r => r.athlete_id === 'zz_b');
  ok(forB && /برات دست زد/.test(forB.title),
     'the athlete whose post was cheered is told "cheered you" (in their own language)', forB && forB.title);
  // zz_c has the switch off, so nobody else is subscribed to compare against; give them one.
  await db.query(`update public.push_subs set kinds = '{}'::jsonb where athlete_id='zz_c'`);
  rows = await due();
  const forC = rows.find(r => r.athlete_id === 'zz_c');
  ok(forC && /gave a cheer/.test(forC.title), 'everybody else is told "gave a cheer", with no names but the giver\'s', forC && forC.title);
  await db.query(`update public.push_subs set kinds = '{"crew": false}'::jsonb where athlete_id='zz_c'`);

  // Language.
  await clearQ();
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'for Iran')`);
  await stamp();
  rows = await due();
  const fa = rows.find(r => r.athlete_id === 'zz_b');
  ok(fa && /[؀-ۿ]/.test(fa.title), 'a Farsi athlete gets Farsi words', fa && fa.title);

  // The words Amir read and chose on 2026-10-20. Checked here because a later hand could "tidy" a
  // transliteration back in, and these are his, not a translator's.
  const his = await one(db, `select
      (select title from public.crew_push_words(1, 'joined', 'X', false, 'fa')) as joined,
      (select title from public.crew_push_words(9, 'post', 'X', false, 'fa')) as many,
      (select title from public.crew_push_words(1, 'level', 'X', false, 'fa')) as level,
      (select title from public.crew_push_words(1, 'mark', 'X', false, 'fa')) as mark,
      (select title from public.crew_push_words(1, 'achievement', 'X', false, 'fa')) as achievement,
      (select title from public.crew_push_words(1, 'cycle', 'X', false, 'fa')) as cycle,
      (select title from public.crew_push_words(1, 'zz_unknown', 'X', false, 'fa')) as fallback`);
  ok(/تیم/.test(his.joined) && !/کرو/.test(his.joined), 'the crew is تیم, not a transliteration', his.joined);
  ok(/تیم/.test(his.many) && !/کرو/.test(his.many), '…in the folded line too', his.many);
  ok(/تیم/.test(his.fallback), '…and in the fallback a kind with no words falls back to', his.fallback);
  ok(/سطح/.test(his.level), 'a level is سطح', his.level);
  ok(/دوره/.test(his.cycle) && !/سایکل/.test(his.cycle), 'a cycle is دوره', his.cycle);
  ok(his.mark === his.achievement && /دستاورد/.test(his.mark),
     'a mark and an achievement are BOTH دستاورد — his answer: in Farsi they are one thing', his.mark);

  // A phone that has stopped answering is left alone.
  await db.query(`update public.push_subs set fails = 5 where athlete_id='zz_b'`);
  ok((await due()).length === 0, 'a phone that has failed five times is skipped');
  await db.query(`update public.push_subs set fails = 0 where athlete_id='zz_b'`);

  // Nothing from before the phone subscribed.
  await clearQ();
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'ancient')`);
  await db.query(`update public.crew_push_q set created_at = '2026-10-01T10:00:00Z'`);
  ok((await due()).length === 0, 'a moment from before their phone subscribed is never sent');

  section('4. The watermark');
  await clearQ();
  await db.query(`delete from public.crew_push_seen`);
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'watermark')`);
  await stamp();
  ok((await due(T, false)).length === 1, 'a dry run (p_mark false) still answers');
  ok((await all(db, `select 1 from public.crew_push_seen`)).length === 0, 'and writes no watermark at all');

  rows = await due(T, true);
  ok(rows.length === 1, 'a real run answers the same');
  row = await one(db, `select * from public.crew_push_seen where athlete_id='zz_b'`);
  ok(row && row.pending !== null && row.upto === null, 'and writes pending, not upto: nothing has reached a phone yet', row);
  ok((await due(T, false)).length === 1, 'asking again before the send finishes gives the same news (nothing lost)');

  await one(db, `select public.crew_push_done('zz_b', true) as r`);
  row = await one(db, `select * from public.crew_push_seen where athlete_id='zz_b'`);
  ok(row.upto !== null && row.pending === null, 'crew_push_done(ok) moves pending to upto', row);
  ok((await due()).length === 0, 'and the same news is never sent twice');
  row = await one(db, `select * from public.push_subs where athlete_id='zz_b'`);
  ok(row.last_ok_at !== null && row.fails === 0, 'a good send stamps the phone and clears its failures');

  // A send that failed on every phone must leave the watermark where it was.
  // The watermark now stands at T, so this post is given an instant AFTER it and judged at T2, the
  // next tick half an hour later — exactly as a real evening runs.
  const T2 = '2026-11-12T10:30:00Z';
  await clearQ();
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'try again')`);
  await db.query(`update public.crew_push_q set created_at = $1::timestamptz + interval '10 minutes'`, [T]);
  const before4 = (await one(db, `select upto from public.crew_push_seen where athlete_id='zz_b'`)).upto;
  ok((await due(T2)).length === 1, 'a post written after the last watermark is owed at the next tick');
  await due(T2, true);
  await one(db, `select public.crew_push_done('zz_b', false) as r`);
  row = await one(db, `select * from public.crew_push_seen where athlete_id='zz_b'`);
  ok(String(row.upto) === String(before4) && row.pending === null,
     'a send that failed everywhere leaves the watermark alone, so the next tick tries again', { before: before4, after: row.upto });
  ok((await due(T2)).length === 1, 'and the news is still owed');
  row = await one(db, `select * from public.push_subs where athlete_id='zz_b'`);
  ok(row.fails === 1, 'the failure counts against the phone');

  section('5. The sweep');
  await clearQ();
  await db.query(`insert into public.crew_push_q (athlete_id, kind, created_at) values ('zz_a', 'post', '2026-01-01T00:00:00Z')`);
  await db.query(`insert into public.crew_push_seen (athlete_id, upto) values ('zz_gone', now())`);
  const swept = (await one(db, `select public.crew_push_sweep() as n`)).n;
  ok(swept >= 2, 'the sweep clears a queue row past its seven days and a watermark with no phone', swept);
  ok((await all(db, `select 1 from public.crew_push_seen where athlete_id='zz_gone'`)).length === 0,
     'the orphan watermark is gone');

  section('6. The erasure takes both tables with it');
  await clearQ();
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_b', 'erase me')`);
  await db.query(`insert into public.crew_push_seen (athlete_id, upto) values ('zz_b', now()) on conflict (athlete_id) do nothing`);
  const qBefore = (await all(db, `select 1 from public.crew_push_q where athlete_id='zz_b'`)).length;
  await asCoach(db);
  const er = await one(db, `select public.coach_erase_person('athlete', 'zz_b', 'zz_b', '{}'::uuid[], false) as r`);
  const qLeft = (await all(db, `select 1 from public.crew_push_q where athlete_id='zz_b'`)).length;
  const sLeft = (await all(db, `select 1 from public.crew_push_seen where athlete_id='zz_b'`)).length;
  ok(qBefore >= 1 && qLeft === 0 && sLeft === 0, 'erasing a person takes their queued moments and their watermark', { qBefore, qLeft, sLeft });
  ok(er.r && JSON.stringify(er.r).includes('crew_push_q'), 'and the receipt names the queue', JSON.stringify(er.r).slice(0, 260));
  info('the check at the end of coach_erase_person() — every public table with an athlete_id column must be empty for them — is what proves nothing was forgotten');

  section('7. Nothing in the scorer moved');
  const sc = await one(db,
    `select (select count(*)::int from public.career_scores) as scores,
            (select count(*)::int from public.career_awards where athlete_id like 'zz_%') as awards,
            (select coalesce(sum(xp), 0)::int from public.career_awards where athlete_id like 'zz_%') as xp`);
  ok(sc.xp === 0, 'not one XP was paid by anything in this stage (GAME-6)', sc);

  section('8. The way back');
  await runSql(db, read(ROLLBACK), 'rollback');
  ok((await all(db, `select 1 from pg_class where relname in ('crew_push_q','crew_push_seen') and relnamespace='public'::regnamespace`)).length === 0,
     'the way back drops both tables');
  for (const [trg, tbl] of TRIGS) {
    const r = await all(db, `select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                              where t.tgname = $1 and c.relname = $2 and not t.tgisinternal`, [trg, tbl]);
    ok(r.length === 0, `${trg} is off ${tbl} again`);
  }
  const eraseBack = await eraseDef(db);
  ok(!/crew_push/.test(eraseBack), 'coach_erase_person() no longer names a table that is gone');
  ok(/'push_subs'\]/.test(eraseBack), "and stage84's own end of the list is back, so ITS way back can still find it");
  // The Bell itself, and the reminders, are untouched by all of this.
  ok((await one(db, `select to_regprocedure('public.get_bell(text)')::text as t`)).t, 'get_bell() is untouched');
  ok((await one(db, `select to_regprocedure('public.push_due(timestamptz)')::text as t`)).t, 'push_due() is untouched');
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_a', 'after the way back')`);
  ok(true, 'and a post still saves with no queue to write to');
  await runSql(db, read(ROLLBACK), 'rollback again');
  ok(true, 'the way back runs twice with no error');

  section('9. Line endings');
  // A Windows checkout ends this file's lines with CRLF while the way back may be run from a copy with
  // LF, or the other way round. stage81 found the hard way that a patch built from a file's own
  // newlines leaves a delete of a dropped table behind, and every erasure after it fails.
  await runSql(db, stageSql.split('\r\n').join('\n').split('\n').join('\r\n'), 'stage86 with CRLF lines');
  ok(/'crew_push_q'/.test(await eraseDef(db)), 'the stage patches the erase function when its own lines end with CRLF');
  await runSql(db, read(ROLLBACK).split('\r\n').join('\n'), 'rollback with LF lines');
  ok(!/crew_push/.test(await eraseDef(db)),
     'and a way back whose lines end differently still takes the patch out — no delete of a dropped table is left behind');
  await runSql(db, stageSql, 'stage86 once more');
  await runSql(db, read(ROLLBACK), 'the way back once more');
  ok(/'push_subs'\]/.test(await eraseDef(db)), 'after every mix, the erase function is exactly what stage84 left');

  console.log(`\n${passed} of ${passed + failed} checks passed`);
  if (failed) { console.log('\nFAILED:'); fails.forEach(f => console.log('  · ' + f)); }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('\nrehearsal blew up:', e); process.exit(2); });
