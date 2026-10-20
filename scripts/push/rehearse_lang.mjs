// Rehearses supabase/stage88_athlete_language.sql (a notification follows the athlete's own language)
// and its way back (scripts/push/rollback_stage88.sql) on PGlite. Made-up athletes only (zz_).
//
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/push/rehearse_lang.mjs
//
//   0. the structure without stage88, athletes with and without a language, phones in the wrong one
//   1. stage88 twice; who may execute what; the hourly job
//   2. push_lang_of(): what the programme says, and what it refuses to say
//   3. push_lang_sync(): it corrects, it leaves alone, it never writes a value the column refuses
//   4. the senders then speak the right language — the whole point, end to end
//   5. the way back, twice
//
// ⚠️ What this is really guarding. The Farsi was written, read and chosen, and reached nobody for a
// day because three call sites passed a hardcoded 'en' and nothing asserted otherwise. So section 4
// does not check a column: it asks the three REAL senders what they would say to a Farsi athlete.
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, snapshotWithout } from '../career/rehearse_lib.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => {
  if (c) { passed++; console.log('  ok   ' + what); }
  else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 300) : '')); }
};
const section = s => console.log('\n' + s);
const info = s => console.log('  ·    ' + s);

const STAGE = opt('--stage') || path.join(ROOT, 'supabase', 'stage88_athlete_language.sql');
const ROLLBACK = opt('--rollback') || path.join(ROOT, 'scripts', 'push', 'rollback_stage88.sql');

const one = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];
const all = async (db, sql, params = []) => (await db.query(sql, params)).rows;

const T = '2026-11-12T10:00:00Z';   // 10:00 UK, 13:30 Iran: both awake

(async () => {
  const db = await openDb();

  section('0. The structure, the athletes and their phones');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/create or replace function public\.push_lang_sync/i);
  info('from ' + snap.says);
  await runSql(db, snap.sql, 'schema snapshot');
  await db.exec(`set timezone = 'UTC'`);
  ok(!(await one(db, `select to_regprocedure('public.push_lang_sync()')::text as t`)).t,
     'the snapshot does not hold the sync yet');

  //   zz_fa    the programme says fa; the phone subscribed in en (the state three real phones were in)
  //   zz_en    the programme says en; the phone subscribed in en
  //   zz_none  the programme says nothing; the phone subscribed in en
  //   zz_junk  the programme says something the column would refuse
  const PEOPLE = [['zz_fa', 'fa'], ['zz_en', 'en'], ['zz_none', null], ['zz_junk', 'klingon']];
  for (const [id, lang] of PEOPLE) {
    const athlete = { id, firstName: id, lastName: 'Test', tier: 'coached' };
    if (lang !== null) athlete.lang = lang;
    await db.query(`insert into public.programs (athlete_id, data) values ($1, $2::jsonb)
                      on conflict (athlete_id) do update set data = excluded.data`,
      [id, JSON.stringify({ athlete, cycles: [{ num: 1, name: 'One' }], currentCycleIndex: 0 })]);
    await db.query(`insert into public.push_subs (endpoint, athlete_id, p256dh, auth, app, tz_offset, lang, created_at)
                    values ($1, $2, 'k-' || $2, 'a-' || $2, 'training', 210, 'en', $3::timestamptz)`,
      [`https://push.example.test/${id}`, id, '2026-11-01T00:00:00Z']);
  }
  ok((await all(db, `select 1 from public.push_subs where lang = 'en'`)).length === 4,
     'all four phones subscribed in English, as every real one did');

  section('1. stage88, applied twice');
  const stageSql = read(STAGE);
  await runSql(db, stageSql, 'stage88');
  await runSql(db, stageSql, 'stage88 again');
  ok(true, 'the stage applies twice with no error (safe to re-run)');
  for (const f of ['push_lang_of(text)', 'push_lang_sync()']) {
    const p = await one(db,
      `select has_function_privilege('anon','public.' || $1,'execute') as a,
              has_function_privilege('authenticated','public.' || $1,'execute') as u,
              has_function_privilege('service_role','public.' || $1,'execute') as s`, [f]);
    ok(p && !p.a && !p.u && p.s, `${f.split('(')[0]}() is the service role's only`, p);
  }
  // It makes no table, so the erase function must be exactly as it was.
  ok(!/push_lang/.test(await one(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`).then(r => r.d)),
     'coach_erase_person() is untouched: this stage stores nothing of an athlete\'s');

  section('2. What the programme says');
  const says = await one(db, `select public.push_lang_of('zz_fa') fa, public.push_lang_of('zz_en') en,
                                     public.push_lang_of('zz_none') none, public.push_lang_of('zz_junk') junk,
                                     public.push_lang_of('zz_nobody') nobody`);
  ok(says.fa === 'fa', 'a programme that says fa answers fa', says);
  ok(says.en === 'en', 'a programme that says en answers en', says);
  ok(says.none === null, 'a programme that says nothing answers null, which means "leave the phone alone"', says);
  ok(says.junk === null, 'a programme that says something the column would refuse answers null, not the junk', says);
  ok(says.nobody === null, 'and an athlete with no programme answers null', says);

  section('3. The sync');
  const n = (await one(db, `select public.push_lang_sync() as n`)).n;
  ok(n === 1, 'exactly one phone changed: the Farsi athlete who had subscribed in English', n);
  const langs = await all(db, `select athlete_id, lang from public.push_subs order by athlete_id`);
  const by = Object.fromEntries(langs.map(r => [r.athlete_id, r.lang]));
  ok(by.zz_fa === 'fa', "zz_fa's phone now speaks Farsi, without anybody re-tapping anything", by);
  ok(by.zz_en === 'en', 'zz_en is left alone (it already agreed)', by);
  ok(by.zz_none === 'en', 'zz_none is left alone (the programme does not say)', by);
  ok(by.zz_junk === 'en', 'zz_junk is left alone (the programme says something the column refuses)', by);
  ok((await one(db, `select public.push_lang_sync() as n`)).n === 0, 'running it again changes nothing');

  // A correction later must follow, which is the reason this is a job and not only the app's tap.
  await db.query(`update public.programs set data = jsonb_set(data, '{athlete,lang}', '"fa"') where athlete_id = 'zz_none'`);
  ok((await one(db, `select public.push_lang_sync() as n`)).n === 1, 'a language set later is picked up by the next run');
  await db.query(`update public.programs set data = jsonb_set(data, '{athlete,lang}', '"en"') where athlete_id = 'zz_none'`);
  ok((await one(db, `select public.push_lang_sync() as n`)).n === 1, 'and so is a language changed back');
  ok((await one(db, `select lang from public.push_subs where athlete_id='zz_none'`)).lang === 'en', 'both ways', by);

  section('4. The senders now speak it — end to end, not a column check');
  // The reminders. push_due() only fires at the athlete's own hour, so the hour is set to match.
  await db.query(`update public.push_subs set hour = 13 where athlete_id = 'zz_fa'`);
  await db.query(`insert into public.career_facts (athlete_id, kind, ref, day, value, source)
                  values ('zz_fa', 'week_held', 'w:1', current_date, '{}'::jsonb, 'server') on conflict do nothing`);
  const due = await all(db, `select kind, title from public.push_due($1::timestamptz)`, [T]);
  const mine = due.filter(r => r.title && /[؀-ۿ]/.test(r.title));
  ok(due.length > 0, 'a reminder is due for the Farsi athlete at their hour', due.map(r => r.kind));
  ok(mine.length === due.length && due.length > 0, 'and every line of it is in Farsi', due.map(r => r.title));

  // The crew. One post by somebody else, so there is something to be told about.
  await db.query(`insert into public.crew_consent (athlete_id, answer, name, answered_at, first_yes_at, yes_since)
                  values ('zz_fa','yes','zz_fa', $1::timestamptz, $1::timestamptz, $1::timestamptz),
                         ('zz_en','yes','zz_en', $1::timestamptz, $1::timestamptz, $1::timestamptz)
                  on conflict (athlete_id) do nothing`, ['2026-11-01T00:00:00Z']);
  await db.query(`insert into public.crew_posts (athlete_id, body) values ('zz_en', 'hello')`);
  await db.query(`update public.crew_push_q set created_at = $1::timestamptz - interval '5 minutes'`, [T]);
  const crew = await all(db, `select athlete_id, title from public.crew_push_due($1::timestamptz, false)`, [T]);
  const crewFa = crew.find(r => r.athlete_id === 'zz_fa');
  ok(crewFa && /[؀-ۿ]/.test(crewFa.title), 'a crew notification reaches the Farsi athlete in Farsi', crewFa && crewFa.title);
  ok(crewFa && /تیم|پست گذاشت/.test(crewFa.title), "and in Amir's words", crewFa && crewFa.title);

  // The cycle. Prime the mark, then publish.
  await db.query(`select public.cycle_push_due($1::timestamptz, true)`, [T]);
  await db.query(`update public.programs set data = jsonb_set(jsonb_set(data, '{cycles}', '[{"num":1},{"num":2}]'), '{currentCycleIndex}', '1')
                   where athlete_id = 'zz_fa'`);
  const cyc = await all(db, `select athlete_id, title from public.cycle_push_due($1::timestamptz, false)`, [T]);
  const cycFa = cyc.find(r => r.athlete_id === 'zz_fa');
  ok(cycFa && /دوره/.test(cycFa.title), 'and so does a published cycle', cycFa && cycFa.title);

  // The English athlete must be untouched by all of it.
  const enRows = [...due, ...crew, ...cyc].filter(r => r.athlete_id === 'zz_en');
  ok(enRows.every(r => !/[؀-ۿ]/.test(r.title)), 'the English athlete gets no Farsi anywhere', enRows.map(r => r.title));

  section('5. The way back');
  await runSql(db, read(ROLLBACK), 'rollback');
  ok(!(await one(db, `select to_regprocedure('public.push_lang_sync()')::text as t`)).t, 'the way back drops the sync');
  ok(!(await one(db, `select to_regprocedure('public.push_lang_of(text)')::text as t`)).t, 'and the reader');
  ok((await one(db, `select lang from public.push_subs where athlete_id='zz_fa'`)).lang === 'fa',
     'the languages already corrected are left as they are, so nobody goes back to English');
  ok((await one(db, `select to_regprocedure('public.push_due(timestamptz)')::text as t`)).t, 'and no sender was ever touched');
  await runSql(db, read(ROLLBACK), 'rollback again');
  ok(true, 'the way back runs twice with no error');

  console.log(`\n${passed} of ${passed + failed} checks passed`);
  if (failed) { console.log('\nFAILED:'); fails.forEach(f => console.log('  · ' + f)); }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('\nrehearsal blew up:', e); process.exit(2); });
