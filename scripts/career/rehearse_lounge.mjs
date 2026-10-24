// Rehearses supabase/stage96_players_lounge.sql (the Players' Lounge: a page per crew member, faces, cheers, signatures, mentions, "your game",
// the aimed pushes) and its way back (scripts/career/rollback_stage96.sql) on PGlite. Nothing live, made-up athletes only (zz_ ids).
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/career/rehearse_lounge.mjs
//
// The live structure (supabase/schema_snapshot.sql without the Lounge tables: the working copy, or the newest committed one that lacks them once the
// snapshot has been remade), then stage96 twice. No backup file is needed: every row below is made up here. Run it away from 00:00 UTC (a cheer's
// day, a line's day and the "last 7 days" windows are read in UTC and a run across midnight can move a row to the next day).
//
//   0. the structure without stage96, made-up athletes, the md5 of every function the stage replaces
//   1. the guard (a changed function is refused, nothing moves); the stage twice; tables, policies, grants, triggers, the push check
//   2. get_bell: ck, fv, lv, held and new; the switches; etag; the board and the Open board
//   3. faces      4. crew_page: who may read whose; every block against its switch; the numbers; the cycle grid; nothing is written
//   5. cheers     6. signatures (Signed Ball)     7. mentions and replies     8. the push queue: what each new source queues
//   9. leaving means gone (a no, under 13, a former athlete)     10. the game     11. the post's proof stamp     12. the erasure
//   13. crew_now_week is career_weeks     14. nothing moved in the scorer     15. the way back     16. line endings
// A check that fails because stage96 is wrong is a finding: it is reported, not fixed here.
// `--stage <file>` and `--rollback <file>` rehearse a modified copy, to see that a check bites.
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, snapshotWithout, eraseDef } from './rehearse_lib.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const COACH = { email: 'amirardekanian@gmail.com', role: 'authenticated' };
let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => { if (c) { passed++; console.log('  ok   ' + what); } else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 600) : '')); } };
const section = s => console.log('\n' + s);
const info = s => console.log('  ·    ' + s);
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const jpg = (n, seed = 1) => { const b = Buffer.alloc(n); for (let i = 0; i < n; i++) b[i] = (i * 31 + seed) & 255; b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[3] = 0xe0; return b; };
const STAGE = opt('--stage') || path.join(ROOT, 'supabase', 'stage96_players_lounge.sql');
const ROLLBACK = opt('--rollback') || path.join(ROOT, 'scripts', 'career', 'rollback_stage96.sql');

// what stage96 replaces whole, patches, or adds
const REPLACED = ['crew_me', 'crew_reply_rows', 'crew_open_now', 'crew_board', 'crew_kudos', 'crew_reply', 'crew_answer', 'coach_crew_under13', 'crew_sweep',
                  'crew_write_post', 'crew_push_fold', 'crew_push_words', 'crew_push_due', 'get_bell', 'coach_erase_person'];
const NEW_USER = ['crew_page(uuid,text)', 'crew_face_set(text,integer,integer)', 'crew_face_clear()', 'crew_faces_get(uuid[])', 'coach_crew_faces()',
                  'coach_crew_face_clear(text)', 'my_game_set(jsonb)', 'crew_cheer(uuid,text)', 'coach_cheer(text,text)', 'coach_cheer_word_clear(bigint)', 'coach_crew_cheers()'];
const NEW_HELPER = ['crew_face_v(text)', 'crew_lv(text)', 'crew_now_week(text)', 'crew_held_now(text,date)', 'crew_extra(text,jsonb,timestamptz,timestamptz,text)',
                    'crew_season_start(text)', 'crew_cheer_count(text)', 'crew_game_of(text)', 'crew_forget(text)', 'crew_t_forget_former()',
                    'crew_push_t_cheer()', 'crew_push_t_reply()', 'crew_push_t_mention()',
                    'crew_tally_up(text)', 'crew_tally_down(text)', 'crew_t_tally_cheer()', 'crew_t_tally_kudos()'];
const TABLES = ['athlete_profile', 'crew_faces', 'crew_cheers', 'crew_award_likes', 'crew_mentions', 'crew_cheer_tally'];
const TRIGS = [['crew_push_cheer', 'crew_cheers'], ['crew_push_reply', 'crew_replies'], ['crew_push_mention', 'crew_mentions'], ['crew_forget_former', 'athlete_status'],
               ['crew_tally_cheer', 'crew_cheers'], ['crew_tally_kudos', 'crew_kudos']];

async function main() {
  const t0 = Date.now();
  const db = await openDb();
  const q = (sql, p) => db.query(sql, p || []);
  const one = async (sql, p) => (await q(sql, p)).rows[0];
  const val = async (sql, p) => { const r = await one(/^\s*(select|with|insert|update|delete)\b/i.test(sql) ? sql : 'select ' + sql, p); return r ? Object.values(r)[0] : null; };   // a bare expression is selected
  const cnt = (t, where = 'true', p) => val(`select count(*)::int from ${/^(pg_|information_schema)|\s/.test(t) ? t : 'public.' + t} where ${where}`, p);
  const refuses = async (what, p, re) => {
    let msg = null;
    try { await p; } catch (e) { msg = String(e.message || e); }
    ok(msg !== null && re.test(msg), what, msg === null ? 'it did not refuse' : msg);
  };
  const hashOf = t => val(`select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.${t} x`);

  // ── who is calling ──
  const USER = {};
  let nUser = 0;
  const withClaims = async (claims, fn) => {
    await db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(claims).replace(/'/g, "''")}', false); set role authenticated;`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
  };
  const as = (id, fn) => withClaims({ sub: USER[id], role: 'authenticated', email: `athlete.${id}@example.test` }, fn);
  const asCoach = fn => withClaims(COACH, fn);
  const asNobody = fn => withClaims({ role: 'authenticated' }, fn);
  const call = (id, sql, p) => as(id, () => val(sql, p));
  const coachCall = (sql, p) => asCoach(() => val(sql, p));
  const soft = p => p.catch(e => ({ error: String(e.message || e) }));
  // a reply written straight into the table (as the owner), so that mentions can be made from several different authors
  const rawReply = async (author, postId) => (await q(`insert into public.crew_replies (post_id, athlete_id, body) values ($1::uuid, $2, 'x') returning id`, [postId, author])).rows[0].id;
  const page = (id, ck = null, view = null) => call(id, `select public.crew_page($1::uuid, $2::text)`, [ck, view]);
  const ckOf = id => val(`select crew_key::text from public.crew_consent where athlete_id = $1`, [id]);
  const bell = id => call(id, `select public.get_bell($1)`, [id]);
  const cheer = (id, ck, word = null) => call(id, `select public.crew_cheer($1::uuid, $2)`, [ck, word]);
  const kudos = (id, target, on = true) => call(id, `select public.crew_kudos($1, $2)`, [target, on]);
  const post = (id, body, photo = null, w = null, h = null, kind = 'post', ses = null) =>
    call(id, `select public.crew_post($1, $2, $3, $4, $5, $6::jsonb)`, [body, photo, w, h, kind, ses === null ? null : JSON.stringify(ses)]);
  const reply = (id, postId, body) => call(id, `select public.crew_reply($1::uuid, $2)`, [postId, body]);
  const answer = (id, a, name = null) => call(id, `select public.crew_answer($1, $2)`, [a, name]);
  const face = (id, bytes, w = 256, h = 256) => call(id, `select public.crew_face_set($1, $2, $3)`, [bytes.toString('base64'), w, h]);

  // ── made-up rows ──
  const day0 = n => `(current_date + ${n})`;           // a date n days from today, as SQL
  async function mkAthlete(id, first, last, o = {}) {
    const start = o.start ?? -10, end = o.end ?? 25;
    const data = { athlete: { id, firstName: first, lastName: last, ...(o.tier ? { tier: o.tier } : {}) }, currentCycleIndex: 0,
                   cycles: [{ num: 1, art: o.art || 'bedrock', startDate: await val(`select (current_date + $1::int)::text`, [start]), endDate: await val(`select (current_date + $1::int)::text`, [end]) }],
                   workouts: { days: [{ id: 1, focusTag: 'Lower Power' }, { id: 2, title: 'Upper Pull', focusTag: 'Ignored' }, { id: 3 }] } };
    await q(`insert into public.programs (athlete_id, data) values ($1, $2::jsonb) on conflict do nothing`, [id, JSON.stringify(data)]);
    if (o.login === false) return;
    const u = `00000000-0000-4000-8000-${String(++nUser).padStart(12, '0')}`;
    USER[id] = u;
    await q(`insert into auth.users (id, email) values ($1, $2) on conflict do nothing`, [u, `athlete.${id}@example.test`]);
    await q(`insert into public.athlete_identities (user_id, athlete_id, email, linked_at) values ($1, $2, $3, now()) on conflict do nothing`, [u, id, `athlete.${id}@example.test`]);
  }
  const member = (id, name, o = {}) => q(
    `insert into public.crew_consent (athlete_id, answer, name, under13, kinds, answered_at, first_yes_at, yes_since)
     values ($1, $7, $2, $3::boolean, $4::jsonb, now() - $5::interval, now() - $6::interval, case when $7 = 'yes' then now() - $5::interval end)`,
    [id, name, !!o.under13, JSON.stringify(o.kinds || {}), o.yesAgo || '9 days', o.firstAgo || '30 days', o.answer || 'yes']);
  let nFact = 0;
  const fact = (id, kind, ref, dayOff, value = {}, voided = false) => q(
    `insert into public.career_facts (athlete_id, kind, ref, day, value, source, void_at)
     values ($1, $2, $3, current_date + $4::int, $5::jsonb, 'server', case when $6::boolean then now() end)`,
    [id, kind, ref ?? `${kind}:${++nFact}`, dayOff, JSON.stringify(value), voided]);
  let nAward = 0;
  const award = (id, item, o = {}) => q(
    `insert into public.career_awards (athlete_id, award_id, kind, item, tier, day, pays, xp, size, meaning, evidence, how, rules_version, created_at)
     values ($1, $2, 'achievement', $3, null, current_date + $4::int, true, 0, $5, 'commitment', '{}', $6, 5, now() - $7::interval)`,
    [id, `achievement:${item}${o.suffix || ''}`, item, o.dayOff || 0, o.size || 'win', o.how || 'live', o.ago || '0 seconds']);
  const score = (id, lv, startsOnOff = -20) => q(
    `insert into public.career_scores (athlete_id, stamp, score) values ($1, 'zz', $2::jsonb) on conflict (athlete_id) do update set score = excluded.score`,
    [id, JSON.stringify({ career: { level: lv }, season: { points: 100, starts_on: null } })])
    .then(() => q(`update public.career_scores set score = jsonb_set(score, '{season,starts_on}', to_jsonb((current_date + $2::int)::text)) where athlete_id = $1`, [id, startsOnOff]));
  const defMd5 = name => val(`select md5(replace(pg_get_functiondef(p.oid), chr(13), '')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = $1`, [name]);
  const FP = ['career_scores', 'career_facts', 'career_awards', 'career_recognition', 'crew_rings', 'crew_push_q', 'crew_push_seen', 'crew_posts', 'crew_replies', 'crew_kudos', 'crew_consent'];

  // ═══ 0 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('0. the live structure without stage96, and made-up athletes');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/create table public\.crew_faces/i);
  info('the structure starts from ' + snap.says);
  await runSql(db, snap.sql, 'snapshot');
  await db.exec(`set timezone = 'UTC'`);
  ok(!(await val(`select to_regclass('public.crew_faces')::text`)), 'the snapshot does not hold the Lounge tables yet');
  for (const f of ['get_bell(text)', 'crew_reply_rows(uuid,text)', 'crew_push_fold(timestamptz)', 'career_rewards_profile(text,jsonb)'])
    ok(await val(`select to_regprocedure('public.${f}')::text`), `it holds ${f.split('(')[0]} (stages 66 to 95 are live)`);
  const MD5_BEFORE = {}; for (const n of REPLACED) MD5_BEFORE[n] = await defMd5(n);
  const KIND_CHECK_BEFORE = await val(`select pg_get_constraintdef(oid) from pg_constraint where conname = 'crew_push_q_kind_check'`);
  const erase0 = await eraseDef(db);
  const ATH = [['zz_ava', 'Ava', 'Test'], ['zz_ben', 'Ben', 'Try'], ['zz_cal', 'Cal', 'Cole'], ['zz_dee', 'Dee', 'Dunn'], ['zz_eve', 'Eve', 'East'],
               ['zz_fox', 'Fox', 'Free'], ['zz_gus', 'Gus', 'Giver'], ['zz_old', 'Olga', 'Old'], ['zz_pat', 'Pat', 'Prince'], ['zz_free', 'Fay', 'Free'], ['demo', 'Demo', 'Athlete']];
  for (const [id, f, l] of ATH) await mkAthlete(id, f, l, id === 'zz_free' ? { tier: 'free' } : id === 'zz_pat' ? { art: 'c3' } : {});
  await mkAthlete('zz_nologin', 'Nina', 'Nologin', { login: false });
  // yes_since: Ava 8 days ago, Ben 20, Cal 20 (every switch off), Gus 2 days (joined this week), Dee under 13, Eve a no, Fox never asked, Olga former, Pat 15
  await member('zz_ava', null, { yesAgo: '8 days', firstAgo: '30 days' });
  await member('zz_ben', null, { yesAgo: '20 days', firstAgo: '20 days' });
  await member('zz_cal', null, { yesAgo: '20 days', firstAgo: '40 days', kinds: { session: false, week: false, best: false, level: false, achievement: false, honour: false } });
  await member('zz_gus', null, { yesAgo: '2 days', firstAgo: '2 days' });
  await member('zz_dee', null, { under13: true, yesAgo: '9 days' });
  await member('zz_eve', null, { answer: 'no', yesAgo: '9 days' });
  await member('zz_old', null, { yesAgo: '9 days' });
  await member('zz_pat', null, { yesAgo: '15 days', firstAgo: '15 days' });
  await member('zz_free', null, { yesAgo: '9 days' });
  await q(`insert into public.athlete_status (athlete_id, status, since) values ('zz_old', 'former', current_date)`);
  ok((await cnt('crew_members()')) === 6, 'six are crew members (Ava, Ben, Cal, Gus, Pat, Fay: Dee is under 13, Eve said no, Olga is a former athlete)', await q(`select athlete_id from public.crew_members() order by 1`).then(r => r.rows.map(x => x.athlete_id)));
  // the catalogue the Bell and the page read, and a rulebook whose catalogue switch is on (so career_rewards_profile answers the four numbers)
  for (const [k, id, body] of [['achievement', 'back_to_back', { name: 'Back to Back' }], ['achievement', 'full_month', { name: 'Full Month' }], ['achievement', 'first_blood', { name: 'First Blood' }]])
    await q(`insert into public.career_catalogue (kind, id, body, version) values ($1, $2, $3::jsonb, 5)`, [k, id, JSON.stringify(body)]);
  await q(`insert into public.career_rules (version, rules, source, starts_on) values (1, $1::jsonb, 'rehearsal', date '2026-01-01')`, [JSON.stringify({ switch: { catalogue: '2026-01-01', xp: '2026-01-01' } })]);
  // levels
  await score('zz_ava', 14); await score('zz_ben', 7); await score('zz_cal', 3); await score('zz_gus', 2); await score('zz_pat', 5);
  // sessions. The cycle starts 10 days ago: week 1 is days -10..-4, week 2 (this one) -3..+3. Ava joined 8 days ago (day -8).
  //   Ava: w1 plan 1 on -9 (BEFORE she joined), plan 2 on -8, plan 3 on -7 (held, c1|w1 on -7), plan 1 AGAIN on -6, a Library session on -5; w2 plan 1 on -2.
  await fact('zz_ava', 'session_finished', 'd1|a', -9, { plan_day: '1', minutes: 61 });
  await fact('zz_ava', 'session_finished_early', 'd2|a', -8, { plan_day: '2', minutes: 45, done: 9, of: 12 });
  await fact('zz_ava', 'session_finished', 'd3|a', -7, { plan_day: '3' });
  await fact('zz_ava', 'session_finished', 'd1|b', -6, { plan_day: '1', minutes: 50 });
  await fact('zz_ava', 'session_finished', 'd1|c', -2, { plan_day: '1', minutes: 58 });
  await fact('zz_ava', 'week_held', 'c1|w1', -7, { cycle: 1, week: 1, sessions: 3, plan: 3 });
  await fact('zz_ava', 'comeback', 'cb1', -30, { gone: 20 }); await fact('zz_ava', 'training_return', 'c0|w9', -30, {}); await fact('zz_ava', 'comeback', 'cb2', -60, { gone: 25 });
  // a Library session: the row makes its own career fact (career_library_trg), which is what the page reads
  await q(`insert into public.library_sessions (athlete_id, slug, completed_on, title, duration_min, counts_as) values ('zz_ava', 'workouts/recovery/night-shift', current_date - 5, 'Night Shift', 20, 'mobility')`);
  await fact('zz_ava', 'personal_best', 'Ava Lift|1', -30, { lift: 'Ava Lift', kg: 111.5 });
  //   Ben: a run of three, a broken week, then two (this week held, on yesterday). best 3, now 2. Three personal bests. Honours of last month.
  for (const [r, d] of [['c0|w1', -60], ['c0|w2', -53], ['c0|w3', -46]]) await fact('zz_ben', 'week_held', r, d, { cycle: 0, week: 1 });
  await fact('zz_ben', 'week_broken', 'c0|w4', -39, {});
  await fact('zz_ben', 'week_held', 'c1|w1', -5, { cycle: 1, week: 1 });
  await fact('zz_ben', 'week_held', 'c1|w2', -1, { cycle: 1, week: 2 });
  for (const [i, lift] of ['Trap Bar Deadlift', 'Back Squat', 'Bench Press'].entries()) await fact('zz_ben', 'personal_best', `${lift}|${i}`, -20 + i, { lift, kg: 140 + i });
  await fact('zz_ben', 'session_finished', 'd1|a', -9, { plan_day: '1', minutes: 40 });
  await fact('zz_ben', 'session_finished', 'd2|a', -2, { plan_day: '2' });
  //   Cal: every switch off; held this week, a best, an achievement, an honour: none of it may reach anybody's screen
  await fact('zz_cal', 'week_held', 'c1|w2', -1, { cycle: 1, week: 2 });
  await fact('zz_cal', 'personal_best', 'Cal Lift|1', -3, { lift: 'Cal Lift', kg: 99 });
  await fact('zz_cal', 'session_finished', 'd1|a', -1, { plan_day: '1' });
  await award('zz_cal', 'first_blood');
  //   Gus joined 2 days ago: this week's held fact is from 5 days ago (before his yes), so by the by-day rule he has not held it
  await fact('zz_gus', 'week_held', 'c1|w2', -5, { cycle: 1, week: 2 });
  await fact('zz_gus', 'session_finished', 'd1|a', -5, { plan_day: '1' });
  await fact('zz_gus', 'session_finished', 'd2|a', -1, { plan_day: '2' });
  //   achievements: Ava has a live one today and a back-paid one; Ben a live one from 3 days ago
  await award('zz_ava', 'back_to_back'); await award('zz_ava', 'full_month', { how: 'silent', dayOff: -40, ago: '40 days' });
  await award('zz_ben', 'back_to_back', { dayOff: -3, ago: '3 days' });
  //   honours of last month for Ben (frozen) and a "near" that must never show
  const m0 = await val(`select (date_trunc('month', current_date) - interval '1 month')::date::text`);
  await q(`insert into public.career_honours (month, honour, athlete_id, value) values ($1::date, 'sessions', 'zz_ben', '{"n": 14, "slot": 1}'), ($1::date, 'near', 'zz_ben', '{"held": 3}'),
                                                                                  ($1::date, 'sessions', 'zz_cal', '{"n": 9}')`, [m0]);
  await q(`insert into public.career_honour_months (month, frozen_at) values ($1::date, now())`, [m0]);
  ok(true, `${ATH.length + 1} made-up athletes, their programmes (a cycle that started 10 days ago), levels, sessions, weeks, bests, awards and honours`);
  const AVA = await ckOf('zz_ava'), BEN = await ckOf('zz_ben'), CAL = await ckOf('zz_cal'), GUS = await ckOf('zz_gus'), PAT = await ckOf('zz_pat'),
        DEE = await ckOf('zz_dee'), EVE = await ckOf('zz_eve'), OLD = await ckOf('zz_old'), FREE = await ckOf('zz_free');

  // ═══ 1 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('1. the guard, then stage96 goes on, twice');
  const stage = read(STAGE);
  // a function changed since the stage was written: refused by name, nothing moves
  const sweepDef = await val(`select pg_get_functiondef('public.crew_sweep()'::regprocedure)`);
  await q(sweepDef.replace('return v_n;', 'return v_n + 0;'));
  await refuses('a function changed since the stage was written is refused by name (crew_sweep)', runSql(db, stage, 'stage96 against a changed crew_sweep'), /crew_sweep\(\).*not the text this file was written against/s);
  ok(!(await val(`select to_regclass('public.crew_faces')::text`)) && !(await val(`select to_regclass('public.athlete_profile')::text`)) && (await defMd5('get_bell')) === MD5_BEFORE.get_bell,
     'and nothing moved: no table was made, get_bell() is as it was');
  await q(sweepDef);
  ok((await defMd5('crew_sweep')) === MD5_BEFORE.crew_sweep, 'the changed function is put back (this rehearsal\'s own tampering)');
  const H0 = {}; for (const t of FP) H0[t] = await hashOf(t);
  await runSql(db, stage, 'stage96');
  const defsAfter1 = {}; for (const n of REPLACED) defsAfter1[n] = await defMd5(n);
  const erase1 = await eraseDef(db);
  await runSql(db, stage, 'stage96 again');
  ok(true, 'stage96 applied, and applied again without an error');
  ok(REPLACED.every(n => defsAfter1[n] !== MD5_BEFORE[n]), 'every function the stage replaces or patches is different from the live text');
  let same = true; for (const n of REPLACED) if ((await defMd5(n)) !== defsAfter1[n]) { same = false; info('changed on the second run: ' + n); }
  ok(same, 'the second run changes no function definition (get_bell() and coach_erase_person() are patched once)');
  for (const t of TABLES) ok(await val(`select relrowsecurity from pg_class where oid = to_regclass('public.${t}')`), `${t} exists with row-level security on`);
  for (const t of TABLES) {
    const g = await one(`select has_table_privilege('anon', 'public.${t}', 'select') or has_table_privilege('anon', 'public.${t}', 'insert') as anon,
                                has_table_privilege('authenticated', 'public.${t}', 'insert') or has_table_privilege('authenticated', 'public.${t}', 'update')
                                  or has_table_privilege('authenticated', 'public.${t}', 'delete') as write,
                                has_table_privilege('authenticated', 'public.${t}', 'select') as read`);
    ok(!g.anon && !g.write && g.read === (t === 'athlete_profile'), `${t}: anon has nothing, nobody signed in can write it, and only athlete_profile can be read (by the coach's policy)`, g);
  }
  ok((await q(`select policyname from pg_policies where schemaname = 'public' and tablename = 'athlete_profile'`)).rows.map(r => r.policyname).join() === 'coach reads athlete profile', 'athlete_profile has exactly the coach\'s read policy');
  for (const t of TABLES.slice(1)) ok((await cnt('pg_policies', `schemaname = 'public' and tablename = '${t}'`)) === 0, `${t} has no policy at all (every door is a function)`);
  const fnRow = async sig => one(`select has_function_privilege('anon', 'public.${sig}', 'execute') as anon, has_function_privilege('authenticated', 'public.${sig}', 'execute') as auth,
                                         has_function_privilege('service_role', 'public.${sig}', 'execute') as svc`);
  for (const sig of NEW_USER) { const g = await fnRow(sig); ok(!g.anon && g.auth && g.svc, `${sig.split('(')[0]}() is for a signed-in user and the service role, not anon`, g); }
  for (const sig of NEW_HELPER) { const g = await fnRow(sig); ok(!g.anon && !g.auth && g.svc, `${sig.split('(')[0]}() is the service role's alone`, g); }
  for (const sig of ['crew_board(integer)', 'get_bell(text)', 'crew_kudos(text,boolean,text)', 'crew_reply(uuid,text)', 'crew_answer(text,text)', 'coach_crew_under13(text,boolean)']) {
    const g = await fnRow(sig); ok(!g.anon && g.auth && g.svc, `${sig.split('(')[0]}() keeps its door: signed in and the service role`, g);
  }
  for (const sig of ['crew_me(text)', 'crew_reply_rows(uuid,text)', 'crew_open_now(text)', 'crew_sweep()', 'crew_push_fold(timestamptz)', 'crew_push_words(integer,text,text,boolean,text)', 'crew_push_due(timestamptz,boolean)']) {
    const g = await fnRow(sig); ok(!g.anon && !g.auth && g.svc, `${sig.split('(')[0]}() is still the service role's alone`, g);
  }
  await db.exec('set role anon');
  await refuses('anon calling crew_page() is refused: permission denied', q(`select public.crew_page()`), /permission denied/);
  await db.exec('reset role');
  await refuses('a signed-in athlete calling a helper is refused: permission denied', as('zz_ava', () => q(`select public.crew_forget('zz_ben')`)), /permission denied/);
  await refuses('a signed-in athlete writing a table directly is refused: permission denied', as('zz_ava', () => q(`insert into public.crew_cheers (athlete_id, to_athlete, day) values ('zz_ava', 'zz_ben', current_date)`)), /permission denied/);
  for (const [trg, tbl] of TRIGS) ok((await cnt('pg_trigger t join pg_class c on c.oid = t.tgrelid', `t.tgname = '${trg}' and c.relname = '${tbl}' and not t.tgisinternal`)) === 1, `${trg} is on ${tbl}`);
  const kc = await val(`select pg_get_constraintdef(oid) from pg_constraint where conname = 'crew_push_q_kind_check'`);
  ok(['cheer', 'reply', 'mention', 'joined', 'kudos'].every(k => kc.includes(`'${k}'`)) && kc !== KIND_CHECK_BEFORE, 'the queue accepts cheer, reply and mention beside the eleven kinds it had', kc);
  for (const t of TABLES) ok(erase1.includes(`'${t}'`), `coach_erase_person()'s list names ${t}`);
  ok(erase1.indexOf("'crew_mentions'") < erase1.indexOf("'crew_replies'"), 'crew_mentions comes before crew_replies in the list (so its rows are counted, not swallowed by the cascade)');
  for (const k of ['crew_cheers (to them)', 'crew_award_likes (to them)', 'crew_mentions (to them)']) ok(erase1.split(`'${k}'`).length === 2, `it deletes ${k} exactly once`);
  ok(erase1.split("'crew_kudos (to them)'").length === 2, "stage81's own kudos block is still there, once");
  for (const t of FP) ok((await hashOf(t)) === H0[t], `${t} is unchanged by the apply`);
  ok(!(await val(`select to_regclass('cron.job')::text`)), 'no cron job was touched (pg_cron is absent here and the stage schedules nothing)');

  // ═══ 2 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('2. get_bell: who is who');
  const bA = await bell('zz_ava');
  const row = (b, who) => (b.crew || []).find(r => r.who === who);
  ok(bA.crew.length === 6 && bA.crew.every(r => /^[0-9a-f-]{36}$/.test(r.ck) && 'fv' in r && r.fv === null), 'crew[] has six rows, each with its ck (a uuid) and an fv (null while there is no face)', bA.crew);
  ok(row(bA, 'Ava T.').ck === AVA && row(bA, 'Ava T.').me === true && row(bA, 'Ben T.').ck === BEN, 'the ck is the person\'s crew_key', bA.crew.map(r => [r.who, r.ck]));
  ok(row(bA, 'Ava T.').lv === 14 && row(bA, 'Ben T.').lv === 7 && row(bA, 'Gus G.').lv === 2, 'lv is the level in the score cache', bA.crew.map(r => [r.who, r.lv]));
  ok(!('lv' in row(bA, 'Cal C.')), 'Cal has the level switch OFF: no lv in his row for somebody else');
  const bC = await bell('zz_cal');
  ok(row(bC, 'Cal C.').lv === 3, 'but Cal\'s own row shows his level to himself (the switches are for others)', row(bC, 'Cal C.'));
  ok(row(bA, 'Ben T.').held === true, 'Ben has held this plan week (c1|w2): held is true', row(bA, 'Ben T.'));
  ok(!('held' in row(bA, 'Ava T.')) && !('held' in row(bA, 'Pat P.')), 'Ava and Pat have not: the key is absent, not false');
  ok(!('held' in row(bA, 'Cal C.')) && row(bC, 'Cal C.').held === true, 'Cal held the week with the week switch OFF: absent for others, true on his own row', [row(bA, 'Cal C.'), row(bC, 'Cal C.')]);
  ok(!('held' in row(bA, 'Gus G.')), 'Gus\'s held fact is from before his yes (by the by-day rule it is not his): absent');
  ok(row(bA, 'Gus G.').new === true && !('new' in row(bA, 'Ben T.')) && !('new' in row(bA, 'Ava T.')), 'new is true only for Gus, who joined 2 days ago', bA.crew.map(r => [r.who, r.new]));
  ok(row(bA, 'Ava T.').since === (await val(`(current_date - 30)::text`)) , 'since is still the first yes as a date', row(bA, 'Ava T.'));
  ok(bA.me.ck === AVA && bA.me.fv === null, 'me carries the viewer\'s own ck and fv', bA.me);
  ok((await bell('zz_fox')).me.ck === null, 'a person with no consent row has ck null in me');
  const bFree = bA;
  ok(Object.keys(bFree).sort().join() === ['athlete_id', 'at', 'crew', 'days', 'emoji', 'honours', 'items', 'kinds', 'lounge', 'me', 'open', 'week'].sort().join(), 'the Bell\'s top-level keys are the old ones plus lounge', Object.keys(bFree));
  ok(bFree.lounge === 1 && (await bell('zz_fox')).lounge === 1 && (await coachCall(`select public.get_bell()`)).lounge === 1, 'lounge: 1 is always there (a member, a person who never answered, the coach): it is how the app knows this server has stage96');
  // posts, lines, replies carry ck and fv; Amir's do not
  const pAva = (await post('zz_ava', 'A post from Ava.')).id;
  const pBen = (await post('zz_ben', 'A post from Ben.')).id;
  const amirPost = await coachCall(`select public.coach_crew_post($1)`, ['From Amir.']);
  await reply('zz_ben', pAva, 'Nice one.');
  await q(`insert into public.crew_replies (post_id, athlete_id, body) values ($1::uuid, '__coach__', 'Amir replies')`, [pAva]);   // there is no door for Amir's replies yet: written as the owner
  await kudos('zz_ben', `${AVA}:${await val('(current_date)::text')}`);
  const b2 = await bell('zz_pat');
  const postItem = who => b2.items.find(i => i.t === 'post' && i.who === who);
  ok(postItem('Ava T.').ck === AVA && postItem('Ava T.').fv === null && 'fv' in postItem('Ava T.') && postItem('Ben T.').ck === BEN, 'a member\'s post carries the author\'s ck and fv', [postItem('Ava T.').ck, postItem('Ava T.').fv]);
  ok(postItem('Amir').amir === true && !('ck' in postItem('Amir')) && !('fv' in postItem('Amir')), 'Amir\'s post has neither (he keeps amir: true)', postItem('Amir'));
  const reps = postItem('Ava T.').replies;
  ok(reps.length === 2 && reps[0].ck === BEN && 'fv' in reps[0] && reps[1].amir === true && !('ck' in reps[1]), 'a reply carries its author\'s ck and fv, Amir\'s reply neither', reps);
  const lineAva = b2.items.find(i => i.t === 'line' && i.who === 'Ava T.');
  ok(lineAva && lineAva.fv === null && 'fv' in lineAva && lineAva.key === `${AVA}:${await val('(current_date)::text')}`, 'a line carries fv (its ck is the start of its key)', lineAva && [lineAva.key, lineAva.fv]);
  ok(b2.items.filter(i => i.t === 'sess').every(i => !('ck' in i) && !('fv' in i)), 'the week\'s attendance item names nobody and gains nothing');
  // honours: needs the 1st to the 14th
  const dom = await val(`extract(day from current_date)::int`);
  if (dom <= 14) {
    const h = b2.honours;
    ok(h && h.rows.length >= 1 && h.rows.every(r => /^[0-9a-f-]{36}$/.test(r.ck)), 'honours rows carry ck', h);
    ok(h.rows.find(r => r.who === 'Ben T.').ck === BEN && !JSON.stringify(h).includes('"slot"'), 'and the right one, still without "slot"');
  } else info(`today is the ${dom}th: last month's honours show only on the 1st to the 14th, so the honours rows are checked against crew_page instead`);
  // the Monthly Open board
  await q(`insert into public.crew_open (title, how, unit, better, opened_on) values ('Wall Sit', 'hold it', 'seconds', 'high', current_date)`);
  const openId = await val(`select id::text from public.crew_open limit 1`);
  await q(`insert into public.crew_open_results (open_id, athlete_id, value, day) values ($1::uuid, 'zz_ava', 95, current_date), ($1::uuid, 'zz_ben', 80, current_date)`, [openId]);
  const bO = await bell('zz_pat');
  ok(bO.open.board.length === 2 && bO.open.board.every(r => /^[0-9a-f-]{36}$/.test(r.ck) && 'fv' in r) && bO.open.board[0].ck === AVA, 'the Open board rows carry ck and fv', bO.open.board);
  // crew_board
  await q(`update public.career_scores set stamp = (select 'zz') where true`);
  const board = await as('zz_pat', () => q(`select * from public.crew_board(25)`)).then(r => r.rows, e => ({ error: String(e.message || e) }));
  if (board.error) ok(false, 'crew_board() answers', board);
  else ok(board.length === 6 && board.every(r => /^[0-9a-f-]{36}$/.test(r.ck) && 'fv' in r) && board.find(r => r.who === 'Pat P.').is_me === true
          && eq(Object.keys(board[0]), ['pos', 'who', 'points', 'level', 'is_me', 'ck', 'fv']), 'crew_board() rows carry ck and fv after the five columns it had', board[0]);
  // the etag: stable, then moved by a face
  const e1 = await call('zz_pat', `select public.get_bell_if_new('zz_pat', null)`);
  const e2 = await call('zz_pat', `select public.get_bell_if_new('zz_pat', $1)`, [e1.etag]);
  ok(e2.same === true && Object.keys(e2).sort().join() === 'at,etag,same', 'get_bell_if_new still answers "same" (78 bytes) when nothing changed: the new fields are stable', e2);

  // ═══ 3 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('3. faces');
  // crew_board() has just worked the scores out again and written them back (it always does: career_scores_for), so the made-up levels are put back
  for (const [id, lv] of [['zz_ava', 14], ['zz_ben', 7], ['zz_cal', 3], ['zz_gus', 2], ['zz_pat', 5]]) await score(id, lv);
  const f1 = await face('zz_ava', jpg(20000, 1));
  ok(Number.isInteger(f1.fv) && f1.fv > 1.7e9, 'crew_face_set returns fv, the second the picture was set', f1);
  const bF = await bell('zz_pat');
  ok(row(bF, 'Ava T.').fv === f1.fv && (await bell('zz_ava')).me.fv === f1.fv && bF.items.find(i => i.t === 'post' && i.who === 'Ava T.').fv === f1.fv && bF.items.find(i => i.t === 'line' && i.who === 'Ava T.').fv === f1.fv,
     'the version shows in crew[], me, her posts and her line', row(bF, 'Ava T.'));
  const e3 = await call('zz_pat', `select public.get_bell_if_new('zz_pat', $1)`, [e1.etag]);
  ok(!e3.same && e3.etag !== e1.etag, 'and a new face moves the etag, so the phone fetches the new Bell once');
  const f2 = await face('zz_ava', jpg(21000, 2));
  ok(f2.fv > f1.fv, 'setting it again within the same second still gives a NEW version (the phone caches by it)', [f1.fv, f2.fv]);
  await refuses('a non-member cannot set a face: crew:not_yes', face('zz_fox', jpg(5000)), /crew:not_yes/);
  await refuses('someone who said no cannot: crew:not_yes', face('zz_eve', jpg(5000)), /crew:not_yes/);
  await refuses('an under-13 cannot: crew:under13', face('zz_dee', jpg(5000)), /crew:under13/);
  await refuses('a face over 60 000 bytes is refused: crew:photo_big', face('zz_ben', jpg(60001)), /crew:photo_big/);
  await refuses('a face of 99 bytes is refused: crew:photo_bad', face('zz_ben', jpg(99)), /crew:photo_bad/);
  const png = Buffer.alloc(500, 9); png[0] = 0x89; png[1] = 0x50;
  await refuses('a PNG is refused: crew:photo_bad', face('zz_ben', png), /crew:photo_bad/);
  await refuses('not base64 is refused: crew:photo_bad', call('zz_ben', `select public.crew_face_set('!!nope!!', 256, 256)`), /crew:photo_bad/);
  await refuses('a size under 64 is refused: crew:photo_bad', face('zz_ben', jpg(5000), 63, 256), /crew:photo_bad/);
  await refuses('a size over 512 is refused: crew:photo_bad', face('zz_ben', jpg(5000), 256, 513), /crew:photo_bad/);
  await refuses('a missing size is refused: crew:photo_bad', call('zz_ben', `select public.crew_face_set($1, null, null)`, [jpg(5000).toString('base64')]), /crew:photo_bad/);
  await refuses('signed out: crew:signin', asNobody(() => q(`select public.crew_face_set('x', 256, 256)`)), /crew:signin/);
  await refuses('the demo cannot: crew:demo', face('demo', jpg(5000)), /crew:demo/);
  const fb = await face('zz_ben', jpg(60000, 3));
  ok(fb.fv, 'exactly 60 000 bytes is kept');
  const pre = await call('zz_gus', `select public.crew_face_set($1, 256, 256)`, ['data:image/jpeg;base64,' + jpg(3000, 4).toString('base64')]);
  ok(pre.fv > 0, 'a data: URL prefix is accepted, as crew_post accepts one');
  const gotAll = await call('zz_pat', `select public.crew_faces_get($1::uuid[])`, [[AVA, BEN, CAL, DEE, EVE, OLD, '11111111-1111-4111-8111-111111111111']]);
  ok(gotAll.length === 2 && gotAll.every(r => r.b64 && r.fv && /^[0-9a-f-]{36}$/.test(r.ck)) && !JSON.stringify(gotAll).includes('\n'), 'crew_faces_get returns the members who have a face (Ava and Ben): not Cal (none), Dee, Eve, Olga or a stranger', gotAll.map(r => r.ck));
  ok(Buffer.from(gotAll.find(r => r.ck === AVA).b64, 'base64').equals(jpg(21000, 2)), 'and the bytes round-trip exactly');
  const many = Array.from({ length: 30 }, (_, i) => `00000000-0000-4000-8000-${String(900 + i).padStart(12, '0')}`);
  ok((await call('zz_pat', `select public.crew_faces_get($1::uuid[])`, [[...many, AVA]])).length === 0, 'only the first twelve keys are read (the 31st, Ava\'s, is not)');
  ok((await call('zz_pat', `select public.crew_faces_get($1::uuid[])`, [[AVA, AVA, AVA]])).length === 1, 'a repeated key answers once');
  ok(eq(await call('zz_pat', `select public.crew_faces_get(null)`), []) && eq(await call('zz_pat', `select public.crew_faces_get('{}'::uuid[])`), []), 'no keys, no faces');
  await refuses('signed out, crew_faces_get is refused: not signed in', asNobody(() => q(`select public.crew_faces_get('{}'::uuid[])`)), /not signed in/);
  ok((await call('zz_fox', `select public.crew_faces_get($1::uuid[])`, [[AVA]])).length === 1, 'a non-member can read a member\'s face (the band and the board draw for everyone signed in)');
  const cf = await coachCall(`select public.coach_crew_faces()`);
  ok(cf.length === 3 && cf.every(r => r.athlete_id.startsWith('zz_') && r.b64 && r.fv), 'the coach sees every face with its owner\'s id (Ava, Ben, Gus)', cf.map(r => r.athlete_id));
  await refuses('an athlete calling coach_crew_faces is refused: coach only', call('zz_ava', `select public.coach_crew_faces()`), /coach only/);
  await refuses('an athlete calling coach_crew_face_clear is refused: coach only', call('zz_ava', `select public.coach_crew_face_clear('zz_ben')`), /coach only/);
  ok((await coachCall(`select public.coach_crew_face_clear('zz_gus')`)).ok === true && (await cnt('crew_faces', `athlete_id = 'zz_gus'`)) === 0, 'the coach can remove a face');
  const clr = await call('zz_ben', `select public.crew_face_clear()`);
  ok(clr.fv === null && (await cnt('crew_faces', `athlete_id = 'zz_ben'`)) === 0 && (await bell('zz_pat')).crew.find(r => r.who === 'Ben T.').fv === null, 'clearing your own face gives fv null, and the Bell says so');

  // ═══ 4 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('4. crew_page');
  const stable =await val(`select provolatile from pg_proc where proname = 'crew_page' and pronamespace = 'public'::regnamespace`);
  ok(stable === 's', 'crew_page() is declared STABLE (it cannot write)', stable);
  // who may read whose
  await refuses('a non-member (never asked) cannot read another page: crew:not_yes', page('zz_fox', BEN), /crew:not_yes/);
  await refuses('someone who said no cannot: crew:not_yes', page('zz_eve', BEN), /crew:not_yes/);
  await refuses('an under-13 cannot read another page: crew:not_yes', page('zz_dee', BEN), /crew:not_yes/);
  await refuses('a former athlete cannot: crew:not_yes', page('zz_old', BEN), /crew:not_yes/);
  await refuses('the demo cannot: crew:not_yes', page('demo', BEN), /crew:not_yes/);
  await refuses('a member asking for a person who said no: crew:gone', page('zz_ava', EVE), /crew:gone/);
  await refuses('for an under-13: crew:gone', page('zz_ava', DEE), /crew:gone/);
  await refuses('for a former athlete: crew:gone', page('zz_ava', OLD), /crew:gone/);
  await refuses('for a key nobody has: crew:gone', page('zz_ava', '11111111-1111-4111-8111-111111111111'), /crew:gone/);
  await refuses('signed out: not signed in', asNobody(() => q(`select public.crew_page()`)), /not signed in/);
  await refuses('an athlete passing another athlete\'s id: not your page', page('zz_ava', null, 'zz_ben'), /not your page/);
  await refuses('and the same with a ck: not your page', page('zz_ava', BEN, 'zz_ben'), /not your page/);
  // another person's page
  const pB = await page('zz_ava', BEN);
  ok(pB.me === false && pB.ck === BEN && pB.who === 'Ben T.' && pB.first === 'Ben' && pB.member === true && pB.under13 === false && pB.art === 'bedrock', 'Ben\'s page: ck, who, first, member, art (the cycle\'s picture)', [pB.ck, pB.who, pB.first, pB.art]);
  ok(pB.joined === (await val(`(current_date - 20)::text`)) && pB.since === (await val(`(current_date - 9)::text`)) && pB.lv === 7 && pB.fv === null && !('new' in pB), 'joined is the day of his latest yes, since his first session, lv from the cache, no face, not new', [pB.joined, pB.since, pB.lv]);
  ok(eq(pB.numbers, { weeks: { now: 2, best: 3 }, sessions: 2, bests: 3 }), 'his four numbers: weeks held 2 now and 3 best, 2 sessions, 3 bests, and NO comebacks for somebody else', pB.numbers);
  ok(eq(pB.best_lifts.map(r => r.lift), ['Bench Press', 'Back Squat', 'Trap Bar Deadlift']) && !JSON.stringify(pB).includes('kg') && !/14[0-9]/.test(JSON.stringify(pB.best_lifts)), 'best_lifts: the lift and the day, newest first, never a weight', pB.best_lifts);
  ok(pB.achievements.length === 1 && pB.achievements[0].id === 'achievement:back_to_back' && pB.achievements[0].name === 'Back to Back' && pB.achievements[0].size === 'win' && pB.achievements[0].signed_n === 0 && eq(pB.achievements[0].signed, []), 'achievements: id, name, day, size, signed (none yet)', pB.achievements);
  ok(pB.honours.length === 1 && pB.honours[0].honour === 'sessions' && eq(pB.honours[0].value, { n: 14 }) && pB.honours[0].month === m0, 'honours: the frozen month\'s sessions, "slot" left out, "near" never', pB.honours);
  ok(pB.game === null && pB.at, 'game is null until he fills it in; at is there');
  // ANOTHER person's cycle is the cycle's number, the plan per week, two totals and ONE week: this one. No past weeks (a row of past weeks with gaps would show a
  // broken week, which the Bell's never list keeps for you alone), no dates of the cycle, no plan total for the cycle.
  ok(pB.cycle && eq(Object.keys(pB.cycle).sort(), ['done', 'extra', 'n', 'per_week', 'weeks']) && pB.cycle.n === 1 && pB.cycle.per_week === 3,
     'cycle for somebody else: only n, per_week, done, extra and weeks (no cycle dates, no plan total)', pB.cycle && Object.keys(pB.cycle));
  ok(pB.cycle.weeks.length === 1 && pB.cycle.weeks[0].w === 2 && pB.cycle.weeks[0].now === true && !JSON.stringify(pB.cycle).includes('before'),
     'and `weeks` holds exactly one week and it is the current one (week 2, now: true, no `before` row)', pB.cycle.weeks);
  ok(eq(Object.keys(pB.cycle.weeks[0]).sort(), ['days', 'done', 'extra', 'from', 'held', 'now', 'plan', 'to', 'w']) && pB.cycle.weeks[0].plan === 3 && pB.cycle.weeks[0].held === true
     && pB.cycle.weeks[0].done === 1 && pB.cycle.weeks[0].extra === 0,
     'the week: w, from, to, plan, done, held, extra, now, days. Week 2 is held (his fact), one plan day done, no extra', pB.cycle.weeks[0]);
  ok(pB.cycle.weeks[0].days.length === 1 && pB.cycle.weeks[0].days[0].extra === false && eq(Object.keys(pB.cycle.weeks[0].days[0]).sort(), ['day', 'extra']),
     'for somebody else a day is only its date and whether it is extra: no title, no minutes', pB.cycle.weeks[0].days);
  ok(pB.cycle.done === 2 && pB.cycle.extra === 0, 'the totals are of the whole cycle, not of the week shown: week 1\'s plan day and this week\'s make done 2', [pB.cycle.done, pB.cycle.extra]);
  ok(!JSON.stringify(pB.cycle).includes('Lower Power') && !JSON.stringify(pB.cycle).includes('Upper Pull') && !JSON.stringify(pB.cycle).includes('"title"') && !JSON.stringify(pB.cycle).includes('"mins"')
     && !JSON.stringify(pB.cycle).includes(await val(`(current_date - 9)::text`)),
     'no title or minutes appear anywhere in another person\'s cycle (a Library session or a rehab day name can hint at pain), and week 1\'s session day appears nowhere', pB.cycle);
  const pBenOwn = await page('zz_ben');
  ok(pBenOwn.cycle.weeks[0].days[0].title === 'Lower Power' && pBenOwn.cycle.weeks[1].days[0].title === 'Upper Pull',
     'on his own page the days keep their titles, and a day title beats its focusTag (Upper Pull over Ignored)', pBenOwn.cycle.weeks.slice(0, 2).map(w => w.days));
  ok(pBenOwn.cycle.weeks.length === 5 && pBenOwn.cycle.weeks[0].w === 1 && pBenOwn.cycle.weeks[0].held === true && pBenOwn.cycle.weeks[0].now === false && pBenOwn.cycle.weeks[1].now === true
     && pBenOwn.cycle.weeks[1].held === true && 'from' in pBenOwn.cycle && 'to' in pBenOwn.cycle && pBenOwn.cycle.per_week === 3 && pBenOwn.cycle.done === 2 && pBenOwn.cycle.extra === 0,
     'his own page keeps the whole cycle (five weeks, the cycle dates, weeks 1 and 2 held, week 2 "now") and gets the same two totals', pBenOwn.cycle);
  ok(pB.cheers && pB.cheers.season === 0 && eq(pB.cheers.recent, []) && pB.cheers.mine_today === false, 'cheers: season 0, nothing recent, you have not cheered him today', pB.cheers);
  // your own page
  const pAvaOwn = await page('zz_ava');
  ok(pAvaOwn.me === true && pAvaOwn.ck === AVA && !('mine_today' in pAvaOwn.cheers) && pAvaOwn.numbers.comebacks === 3 && pAvaOwn.fv === f2.fv, 'your own page: me true, comebacks (3: two comebacks and a training return) and no mine_today', [pAvaOwn.numbers, pAvaOwn.cheers]);
  ok(eq({ ...pAvaOwn, at: 0 }, { ...(await page('zz_ava', AVA)), at: 0 }), 'passing your own ck gives the same page');
  const pAvaSeen = await page('zz_ben', AVA);
  ok(!('comebacks' in pAvaSeen.numbers), 'but Ben looking at Ava sees no comebacks (they stay on your own page)', pAvaSeen.numbers);
  ok(pAvaSeen.numbers.sessions === 5 && pAvaSeen.numbers.weeks.now === 1 && pAvaSeen.numbers.bests === 1, 'the numbers are the same for him: 5 sessions, 1 week held, 1 best', pAvaSeen.numbers);
  // the cycle: own page (every week, all sessions, minutes) vs. another (this week only, clipped to her joined day, no minutes)
  const w1o = pAvaOwn.cycle.weeks[0], w2s = pAvaSeen.cycle.weeks[0];
  ok(w1o.done === 3 && w1o.extra === 2 && w1o.plan === 3 && w1o.held === true && w1o.days.length === 5, 'Ava\'s own week 1: three plan days done, two extra (plan day 1 again, the Library session), held', w1o);
  ok(eq(w1o.days.map(d => [d.title, d.extra, d.mins]), [['Lower Power', false, 61], ['Upper Pull', false, 45], ['Day 3', false, undefined], ['Lower Power', true, 50], ['Night Shift', true, 20]]),
     'with titles (Day 3 for a day with no name, the Library session by its name) and minutes where she logged them', w1o.days.map(d => [d.title, d.extra, d.mins]));
  ok(pAvaSeen.cycle.weeks.length === 1 && w2s.w === 2 && w2s.now === true && w2s.done === 1 && w2s.extra === 0 && w2s.held === false && w2s.days.length === 1 && w2s.days.every(d => !('mins' in d) && !('title' in d)),
     'Ben sees Ava\'s week 2 (now) and nothing else: one plan day done, not held, no minutes, no title', pAvaSeen.cycle.weeks);
  ok(pAvaSeen.cycle.done === 4 && pAvaSeen.cycle.extra === 1 && !JSON.stringify(pAvaSeen.cycle).includes('Night Shift'),
     'the totals count only since the day she joined: her session the day before is not counted, so the repeat of plan day 1 counts as the plan\'s (done 4, extra 1: the Library session)', [pAvaSeen.cycle.done, pAvaSeen.cycle.extra]);
  ok(pAvaOwn.cycle.weeks.length === 5 && pAvaOwn.cycle.done === 4 && pAvaOwn.cycle.extra === 2 && pAvaOwn.cycle.weeks[1].done === 1 && pAvaOwn.cycle.weeks[1].extra === 0 && 'from' in pAvaOwn.cycle && 'to' in pAvaOwn.cycle,
     'her own page is unchanged (five weeks, the dates, her day before joining counted: done 4, extra 2) and the totals are the sums of her weeks', [pAvaOwn.cycle.done, pAvaOwn.cycle.extra, pAvaOwn.cycle.weeks.length]);
  ok(!JSON.stringify(pAvaSeen.cycle).includes('rpe') && !JSON.stringify(pAvaOwn.cycle).includes('note'), 'no RPE and no note anywhere in the grid');
  const pGusSeen = await page('zz_ava', GUS);
  ok(pGusSeen.new === true && pGusSeen.cycle.weeks.length === 1 && pGusSeen.cycle.weeks[0].w === 2 && !JSON.stringify(pGusSeen.cycle).includes('before'),
     'Gus joined 2 days ago: new is true, and he shows this week only; no empty "before" week for the one that ended before he joined', [pGusSeen.new, pGusSeen.cycle.weeks]);
  ok(pGusSeen.cycle.weeks[0].held === false && pGusSeen.cycle.weeks[0].done === 1 && pGusSeen.cycle.done === 1 && pGusSeen.cycle.extra === 0,
     'his held fact and his session from before the yes count for nothing; the session since does count (this week done 1, held false, cycle done 1)', [pGusSeen.cycle.weeks[0], pGusSeen.cycle.done]);
  const pGusOwn = await page('zz_gus');
  ok(pGusOwn.cycle.weeks[0].done === 1 && !('before' in pGusOwn.cycle.weeks[0]) && pGusOwn.cycle.weeks[1].held === true && pGusOwn.cycle.done === 2 && pGusOwn.cycle.extra === 0,
     'his own page shows everything, from before he joined (done 2 in the cycle)', pGusOwn.cycle.weeks.slice(0, 2));
  // a person whose cycle has no week that is today (the cycle ended yesterday): others get no week, never a past one. Pat's programme is used, since changing a
  // programme can void a made-up athlete's week facts through the career triggers
  const patBefore = (await page('zz_ava', PAT)).cycle;
  const pastCyc = await val(`select data -> 'cycles' -> 0 ->> 'endDate' from public.programs where athlete_id = 'zz_pat'`);
  await q(`update public.programs set data = jsonb_set(data, '{cycles,0,endDate}', to_jsonb((current_date - 1)::text)) where athlete_id = 'zz_pat'`);
  const patEnded = (await page('zz_ava', PAT)).cycle, patEndedOwn = (await page('zz_pat')).cycle;
  ok(patBefore && patBefore.weeks.length === 1 && patBefore.weeks[0].now === true, 'the cycle of Pat covers today: one week, now', patBefore);
  ok(!patEnded || (Array.isArray(patEnded.weeks) && patEnded.weeks.length === 0), 'a cycle with no week that is today: another person sees no week at all, never a past one', patEnded);
  ok(!patEndedOwn || patEndedOwn.weeks.length >= 0, 'and his own page still answers', patEndedOwn && patEndedOwn.weeks.length);
  await q(`update public.programs set data = jsonb_set(data, '{cycles,0,endDate}', to_jsonb($1::text)) where athlete_id = 'zz_pat'`, [pastCyc]);
  ok(eq((await page('zz_ava', PAT)).cycle, patBefore), 'and with the programme put back the page is as it was', [(await page('zz_ava', PAT)).cycle, patBefore]);
  // the switches: Cal has every one off
  const pCal = await page('zz_ava', CAL);
  ok(pCal.who === 'Cal C.' && pCal.member === true && !('lv' in pCal) && !('since' in pCal) && !('cycle' in pCal) && !('achievements' in pCal) && !('honours' in pCal) && !('best_lifts' in pCal) && eq(pCal.numbers, {}),
     'Cal, every switch off: a name, a game and cheers, and none of level, since, cycle, achievements, honours, bests or numbers', Object.keys(pCal));
  ok(pCal.cheers && 'game' in pCal && 'art' in pCal && pCal.joined, 'what has no switch is still there: cheers, game, art, joined');
  const pCalOwn = await page('zz_cal');
  ok(pCalOwn.lv === 3 && pCalOwn.achievements.length === 1 && pCalOwn.honours.length === 1 && pCalOwn.best_lifts.length === 1 && pCalOwn.cycle && pCalOwn.numbers.sessions === 1 && pCalOwn.numbers.weeks.now === 1, 'and Cal sees all of it on his own page (a switch hides it from OTHERS)', Object.keys(pCalOwn));
  for (const [kind, gone, back] of [['level', ['lv'], null], ['session', ['since', 'cycle'], ['numbers.sessions']], ['week', [], ['numbers.weeks']], ['best', ['best_lifts'], ['numbers.bests']], ['achievement', ['achievements'], null], ['honour', ['honours'], null]]) {
    await call('zz_cal', `select public.crew_kinds($1::jsonb)`, [JSON.stringify({ [kind]: true })]);
    const p = await page('zz_ava', CAL);
    const present = gone.every(k => k in p) && (back || []).every(k => { const [a, b] = k.split('.'); return a in p && b in p[a]; });
    ok(present, `turning Cal's "${kind}" switch back on brings back ${[...gone, ...(back || [])].join(', ')}`, Object.keys(p));
  }
  await call('zz_cal', `select public.crew_kinds($1::jsonb)`, [JSON.stringify({ session: false, week: false, best: false, level: false, achievement: false, honour: false })]);   // Cal hides it all again
  // the own page says which switches are on; another person's page does not
  const allOn = { best: true, mark: true, open: true, week: true, cycle: true, level: true, honour: true, session: true, achievement: true };
  ok(eq(pAvaOwn.kinds, allOn) && eq((await page('zz_cal')).kinds, { ...allOn, session: false, week: false, best: false, level: false, achievement: false, honour: false }) && !('kinds' in pB) && !('kinds' in pCal),
     'your own page carries kinds (a kind not named is true; Cal\'s six are false), another person\'s page does not', [pAvaOwn.kinds, pCalOwn.kinds]);
  ok(pCalOwn.cycle && pCalOwn.achievements.length === 1 && pCalOwn.honours.length === 1 && pCalOwn.best_lifts.length === 1 && 'comebacks' in pCalOwn.numbers && pCalOwn.since,
     'and the own page returns EVERY block whatever your own switches say (Cal hides all six from others and still sees them, comebacks included)', Object.keys(pCalOwn));
  ok(eq((await page('zz_fox')).kinds, allOn), 'a person with no consent row has every kind on');
  ok((await page('zz_ava', PAT)).art === 'c3' && pB.art === 'bedrock', 'art is the raw cycle art word from the programme (c3, bedrock), not a name');
  await q(`update public.programs set data = data #- '{cycles,0,art}' where athlete_id = 'zz_pat'`);
  ok((await page('zz_ava', PAT)).art === null, 'and null when the cycle has none');
  await q(`update public.programs set data = jsonb_set(data, '{cycles,0,art}', '"c3"') where athlete_id = 'zz_pat'`);
  // free athletes
  const pFree =await page('zz_ava', FREE);
  ok(pFree.free === true && eq(pFree.numbers, {}), 'a free athlete\'s four numbers are other things (a day streak): no numbers, free: true', [pFree.free, pFree.numbers]);
  // non-members read their own page; it has no cheers and no face
  const pFox = await page('zz_fox');
  ok(pFox.me === true && pFox.member === false && pFox.ck === null && pFox.joined === null && !('cheers' in pFox) && pFox.who === 'Fox F.' && pFox.cycle && pFox.fv === null, 'a person who never answered reads their own page: member false, no ck, no cheers, but their cycle and numbers', Object.keys(pFox));
  const pDee = await page('zz_dee');
  ok(pDee.member === false && pDee.under13 === true && pDee.ck === DEE && !('cheers' in pDee), 'an under-13 reads their own page too (member false, under13 true)', [pDee.member, pDee.under13]);
  const pEve = await page('zz_eve', EVE);
  ok(pEve.me === true && pEve.member === false, 'someone who said no reads their own page by their own ck');
  // the coach
  const pCoach = await asCoach(() => val(`select public.crew_page($1::uuid)`, [BEN]));
  ok(pCoach.ck === BEN && pCoach.cheers.mine_today === false && !('comebacks' in pCoach.numbers), 'the coach may read any member\'s page (as a viewer: no comebacks)');
  const pPrev = await asCoach(() => val(`select public.crew_page(null, 'zz_ava')`));
  ok(pPrev.me === true && pPrev.numbers.comebacks === 3, 'the coach previewing as Ava (p_athlete_id) reads Ava\'s own page');
  const pPrevOther = await asCoach(() => val(`select public.crew_page($1::uuid, 'zz_ava')`, [BEN]));
  ok(pPrevOther.ck === BEN && pPrevOther.me === false, 'previewing as Ava, Ben\'s page is read with Ava\'s eyes');
  await refuses('previewing as someone who is not in the crew gives that person\'s view: crew:not_yes', asCoach(() => q(`select public.crew_page($1::uuid, 'zz_fox')`, [BEN])), /crew:not_yes/);
  await refuses('the coach with no athlete named and no subject: crew:who', asCoach(() => q(`select public.crew_page()`)), /crew:who|not signed in/);
  const pSvc = await val(`select public.crew_page($1::uuid, 'zz_ava')`, [BEN]);
  ok(pSvc.ck === BEN, 'the SQL editor (no claims) reads as anyone');
  // the page must not write, ring or recompute
  const tablesBefore = {}; for (const t of FP.concat(['crew_cheers', 'crew_faces', 'crew_award_likes', 'crew_mentions', 'athlete_profile'])) tablesBefore[t] = await hashOf(t);
  for (const viewer of ['zz_ava', 'zz_ben', 'zz_cal', 'zz_gus', 'zz_pat', 'zz_free', 'zz_fox', 'zz_dee'])
    for (const subj of [AVA, BEN, CAL, GUS, PAT, FREE, DEE, null]) await soft(page(viewer, subj));
  await soft(asCoach(() => q(`select public.crew_page($1::uuid)`, [BEN])));
  const tablesAfter = {}; for (const t of Object.keys(tablesBefore)) tablesAfter[t] = await hashOf(t);
  ok(Object.keys(tablesBefore).every(t => tablesBefore[t] === tablesAfter[t]),'reading every page above wrote nothing in any table that matters (scores, facts, awards, rings, queue, consent, cheers, faces)', Object.keys(tablesBefore).filter(t => tablesBefore[t] !== tablesAfter[t]));
  ok(!/get_profile|career_scored|career_scores_for|crew_board|crew_push_add|\binsert\b|\bupdate\b|\bdelete\b/i.test(await val(`select regexp_replace(pg_get_functiondef('public.crew_page(uuid,text)'::regprocedure), '--[^\n]*', '', 'g')`)), 'and crew_page() names none of get_profile, career_scored, career_scores_for, crew_board or a write');
  // the four numbers equal the Scorecard's own function
  for (const id of ['zz_ava', 'zz_ben', 'zz_cal', 'zz_pat']) {
    const four = await val(`select public.career_rewards_profile($1, null) -> 'numbers' -> 'four'`, [id]);
    const p = await page(id);
    ok(four && p.numbers.weeks.now === four.consistency.value && p.numbers.weeks.best === four.consistency.best && p.numbers.sessions === four.commitment.value
       && p.numbers.bests === four.progress.value && p.numbers.comebacks === four.resilience.value, `${id}: the page's four numbers are numbers.four of career_rewards_profile, the function get_profile() takes them from`, [four, p.numbers]);
  }
  // and the same numbers worked out by hand (get_profile's own loops)
  const hand = async id => {
    const f = (await q(`select kind from public.career_facts where athlete_id = $1 and void_at is null and kind in ('week_held','week_broken') order by day, ref`, [id])).rows;
    let now = 0, best = 0; for (const r of f) { if (r.kind === 'week_held') { now++; best = Math.max(best, now); } else now = 0; }
    return { now, best,
      sessions: await cnt('career_facts', `athlete_id = '${id}' and void_at is null and kind in ('session_finished','session_finished_early')`),
      bests: await cnt('career_facts', `athlete_id = '${id}' and void_at is null and kind = 'personal_best'`),
      comebacks: await cnt('career_facts', `athlete_id = '${id}' and void_at is null and kind in ('comeback','training_return')`) };
  };
  for (const id of ['zz_ava', 'zz_ben']) {
    const h = await hand(id), p = await page(id);
    ok(p.numbers.weeks.now === h.now && p.numbers.weeks.best === h.best && p.numbers.sessions === h.sessions && p.numbers.bests === h.bests && p.numbers.comebacks === h.comebacks, `${id}: weeks now/best, sessions, bests and comebacks equal get_profile's own loops and counts, worked out by hand`, [h, p.numbers]);
  }
  ok(!('referral' in pAvaOwn), 'no referral key before stage97');

  // ═══ 5 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('5. cheers');
  const qBefore = await cnt('crew_push_q');
  const sc0 = await cnt('career_awards') + await cnt('career_facts');
  const c1 = await cheer('zz_ava', BEN, '  that sled push\nlooked   heavy  ');
  ok(c1.ok === true && c1.season === 1, 'a cheer answers {ok, season}', c1);
  const row1 = await one(`select athlete_id, to_athlete, day::text as day, word from public.crew_cheers`);
  ok(row1.athlete_id === 'zz_ava' && row1.to_athlete === 'zz_ben' && row1.day === (await val(`(now() at time zone 'UTC')::date::text`)) && row1.word === 'that sled push looked heavy', 'one row: giver, person, the server\'s UTC day and the word cleaned onto one line', row1);
  await refuses('a second cheer to the same person the same day: crew:cheer_today', cheer('zz_ava', BEN), /crew:cheer_today/);
  ok((await cheer('zz_ava', CAL)).ok === true, 'but a cheer to somebody else is fine');
  await refuses('your own page: crew:own', cheer('zz_ava', AVA), /crew:own/);
  await refuses('a person who left: crew:gone', cheer('zz_ava', EVE), /crew:gone/);
  await refuses('an under-13: crew:gone', cheer('zz_ava', DEE), /crew:gone/);
  await refuses('a former athlete: crew:gone', cheer('zz_ava', OLD), /crew:gone/);
  await refuses('a key nobody has: crew:gone', cheer('zz_ava', '11111111-1111-4111-8111-111111111111'), /crew:gone/);
  await refuses('no subject: crew:gone', call('zz_ava', `select public.crew_cheer(null)`), /crew:gone/);
  await refuses('an under-13 giver: crew:under13', cheer('zz_dee', BEN), /crew:under13/);
  await refuses('a non-member giver: crew:not_yes', cheer('zz_fox', BEN), /crew:not_yes/);
  await refuses('a giver who said no: crew:not_yes', cheer('zz_eve', BEN), /crew:not_yes/);
  await refuses('the demo: crew:demo', cheer('demo', BEN), /crew:demo/);
  await refuses('signed out: crew:signin', asNobody(() => q(`select public.crew_cheer($1::uuid)`, [BEN])), /crew:signin/);
  await refuses('a word over 100 characters: crew:word_long', cheer('zz_ben', AVA, 'x'.repeat(101)), /crew:word_long/);
  ok((await cheer('zz_ben', AVA, 'y'.repeat(100))).ok === true && (await val(`select char_length(word) from public.crew_cheers where athlete_id = 'zz_ben'`)) === 100, 'exactly 100 is kept');
  ok((await cheer('zz_ben', PAT, '   ')).ok === true && (await val(`select word from public.crew_cheers where athlete_id = 'zz_ben' and to_athlete = 'zz_pat'`)) === null, 'a word of only spaces is no word (null)');
  // 30 a day
  await q(`delete from public.crew_cheers where athlete_id = 'zz_gus'`);
  for (let i = 0; i < 29; i++) await q(`insert into public.crew_cheers (athlete_id, to_athlete, day) values ('zz_gus', $1, (now() at time zone 'UTC')::date)`, ['fake_' + i]);
  ok((await cheer('zz_gus', AVA)).ok === true, 'the 30th cheer of the day goes through');
  await refuses('the 31st is refused: crew:cheers_today', cheer('zz_gus', BEN), /crew:cheers_today/);
  await q(`delete from public.crew_cheers where athlete_id = 'zz_gus' and to_athlete like 'fake_%'`);
  // the page
  const pBen2 = await page('zz_pat', BEN);
  ok(pBen2.cheers.season === 1 && pBen2.cheers.recent.length === 1 && pBen2.cheers.mine_today === false, 'Ben\'s page: one cheer this season (Ava\'s), listed as recent; Pat has not cheered him', pBen2.cheers);
  const rc = pBen2.cheers.recent.find(r => r.who === 'Ava T.');
  ok(rc && rc.ck === AVA && rc.coach === false && rc.word === 'that sled push looked heavy' && 'fv' in rc && rc.day, 'a recent cheer: the giver\'s ck, name, fv, coach false, the word and the day', rc);
  ok((await page('zz_ava', BEN)).cheers.mine_today === true, 'Ava sees that she cheered Ben today');
  ok((await page('zz_ben')).cheers.recent.length === 1 && !('mine_today' in (await page('zz_ben')).cheers), 'and on his own page he sees the cheer he got, without the "cheered today" test');
  // the season: counts from the recipient's starts_on; an older cheer is out of the count
  await q(`insert into public.crew_cheers (athlete_id, to_athlete, day) values ('zz_pat', 'zz_ben', current_date - 30), ('zz_cal', 'zz_ben', current_date - 25)`);
  ok((await page('zz_ava', BEN)).cheers.season === 1, 'cheers from before the season start (20 days ago) are not in the season count', (await page('zz_ava', BEN)).cheers);
  await q(`update public.career_scores set score = jsonb_set(score, '{season,starts_on}', to_jsonb((current_date - 40)::text)) where athlete_id = 'zz_ben'`);
  ok((await page('zz_ava', BEN)).cheers.season === 3, 'move his season start back 40 days and the two older ones count', (await page('zz_ava', BEN)).cheers.season);
  await q(`delete from public.career_scores where athlete_id = 'zz_ben'`);
  const monthStart = await val(`date_trunc('month', current_date)::date::text`);
  ok((await page('zz_ava', BEN)).cheers.season === (await cnt('crew_cheers', `to_athlete = 'zz_ben' and day >= $1::date`, [monthStart])), 'with no score row the season is this month', (await page('zz_ava', BEN)).cheers.season);
  await score('zz_ben', 7);
  // Amir cheers as Coach
  const cc = await coachCall(`select public.coach_cheer('zz_cal', 'keep going')`);
  ok(cc.ok === true, 'Amir can cheer a member as Coach', cc);
  await refuses('once a day for Amir too: crew:cheer_today', asCoach(() => q(`select public.coach_cheer('zz_cal')`)), /crew:cheer_today/);
  await refuses('Amir cheering somebody who is not in the crew: crew:gone', asCoach(() => q(`select public.coach_cheer('zz_eve')`)), /crew:gone/);
  await refuses('an athlete calling coach_cheer: coach only', call('zz_ava', `select public.coach_cheer('zz_cal')`), /coach only/);
  await refuses('a word over 100 from Amir: crew:word_long', asCoach(() => q(`select public.coach_cheer('zz_ben', $1)`, ['z'.repeat(101)])), /crew:word_long/);
  const pCal2 = await page('zz_pat', CAL);
  const coachRow = pCal2.cheers.recent.find(r => r.coach === true);
  ok(coachRow && coachRow.ck === null && coachRow.who === 'Coach' && coachRow.word === 'keep going' && coachRow.fv === null, 'Amir\'s cheer shows as Coach (coach true, ck null)', coachRow);
  const all7 = await coachCall(`select public.coach_crew_cheers()`);
  ok(all7.length >= 5 && all7.every(r => r.id && r.from_athlete && r.to_athlete && 'word' in r && r.day) && all7.find(r => r.from_athlete === '__coach__').from_who === 'Coach', 'coach_crew_cheers lists EVERY cheer of the last 7 days (word or none) with both ids, the coach own cheers shown as Coach, newest first', all7.length);
  await refuses('an athlete calling coach_crew_cheers: coach only', call('zz_ava', `select public.coach_crew_cheers()`), /coach only/);
  const cid = all7.find(r => r.word === 'keep going').id;
  await refuses('an athlete calling coach_cheer_word_clear: coach only', call('zz_ava', `select public.coach_cheer_word_clear(${cid})`), /coach only/);
  ok((await coachCall(`select public.coach_cheer_word_clear(${cid})`)).ok === true && (await val(`select word from public.crew_cheers where id = ${cid}`)) === null && (await cnt('crew_cheers', `id = ${cid}`)) === 1, 'Amir can blank a word; the cheer stays and counts');
  ok((await coachCall(`select public.coach_cheer_word_clear(${cid})`)).ok === true, 'blanking an already blank word is still {ok: true}');
  // the sweep
  await q(`insert into public.crew_cheers (athlete_id, to_athlete, day, word) values ('zz_pat', 'zz_gus', current_date - 8, 'old word'), ('zz_pat', 'zz_cal', current_date - 7, 'edge word'), ('zz_cal', 'zz_pat', current_date - 401, 'ancient')`);
  await q(`select public.crew_sweep()`);
  ok((await val(`select word from public.crew_cheers where athlete_id = 'zz_pat' and to_athlete = 'zz_gus'`)) === null && (await cnt('crew_cheers', `athlete_id = 'zz_pat' and to_athlete = 'zz_gus'`)) === 1,
     'the sweep clears a word after 7 days and keeps the row (it is the season\'s count)');
  ok((await val(`select word from public.crew_cheers where athlete_id = 'zz_pat' and to_athlete = 'zz_cal'`)) === 'edge word', 'a word exactly 7 days old is still there');
  ok((await cnt('crew_cheers', `athlete_id = 'zz_cal' and to_athlete = 'zz_pat' and day < current_date - 400`)) === 0, 'a row older than 400 days is deleted');
  // nothing paid
  ok(await cnt('career_awards') + await cnt('career_facts') === sc0, 'cheers wrote no fact and no award (GAME-6)');
  ok(await val(`select coalesce(sum(xp), 0)::int from public.career_awards where athlete_id like 'zz_%' and created_at > now() - interval '5 minutes'`) === 0, 'and paid no XP');

  // ═══ 6 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('6. Signed Ball');
  const todayS = await val('(now() at time zone \'UTC\')::date::text');
  await award('zz_ava', 'first_blood', { how: 'silent', suffix: ':back-paid-today' });          // a back-paid award written today: it never rings, so it is never signed
  await q(`delete from public.crew_kudos`);
  await kudos('zz_ben', `${AVA}:${todayS}`);
  ok(await cnt('crew_award_likes', `athlete_id = 'zz_ben' and to_athlete = 'zz_ava' and award_id = 'achievement:back_to_back'`) === 1, 'a like on Ava\'s line today signs her live achievement of that day (back_to_back)');
  ok(await cnt('crew_award_likes', `to_athlete = 'zz_ava'`) === 1, 'and only that one: her back-paid full_month (silent) is not signed');
  await kudos('zz_pat', `${AVA}:${todayS}`);
  await kudos('zz_ben', `${AVA}:${todayS}`, true);
  ok(await cnt('crew_award_likes', `to_athlete = 'zz_ava'`) === 2, 'a second liker signs it too; liking again changes nothing');
  await face('zz_pat', jpg(3000, 6));
  const pAva3 = await page('zz_cal', AVA);
  const ach = pAva3.achievements.find(a => a.id === 'achievement:back_to_back');
  ok(ach.signed_n === 2 && ach.signed.length === 2 && ach.signed[0].ck === PAT && typeof ach.signed[0].fv === 'number' && ach.signed[1].ck === BEN && ach.signed[1].fv === null, 'the page lists who signed, newest first, with their ck and face version', ach);
  ok(pAva3.achievements.find(a => a.id === 'achievement:full_month').signed_n === 0, 'the back-paid one has no signatures');
  ok(!JSON.stringify(ach).includes('zz_'), 'no athlete id in the signatures');
  // 7-day sweep of the like itself: the signature stays
  await q(`update public.crew_kudos set line_day = current_date - 9`);
  await q(`select public.crew_sweep()`);
  ok(await cnt('crew_kudos') === 0 && await cnt('crew_award_likes', `to_athlete = 'zz_ava'`) === 2, 'the 7-day sweep deletes the likes and keeps the signatures (Amir\'s pick)');
  // taking a like back unsigns
  await kudos('zz_cal', `${AVA}:${todayS}`);
  ok(await cnt('crew_award_likes', `athlete_id = 'zz_cal'`) === 1, 'Cal likes the line: signed');
  await kudos('zz_cal', `${AVA}:${todayS}`, false);
  ok(await cnt('crew_award_likes', `athlete_id = 'zz_cal'`) === 0 && await cnt('crew_award_likes', `to_athlete = 'zz_ava'`) === 2, 'taking the like back removes that signature only');
  // a like on a post is not a signature
  await kudos('zz_cal', pAva);
  ok(await cnt('crew_award_likes', `athlete_id = 'zz_cal'`) === 0, 'a like on a post signs nothing');
  // a person who is not in the crew any more is not counted
  await q(`update public.crew_consent set answer = 'no' where athlete_id = 'zz_pat'`);
  ok((await page('zz_cal', AVA)).achievements.find(a => a.id === 'achievement:back_to_back').signed_n === 1, 'a signer who is no longer a member is not counted or shown (even before the sweep tidies them)');
  await q(`update public.crew_consent set answer = 'yes' where athlete_id = 'zz_pat'`);
  // the achievement switch hides the whole block, signatures with it
  ok(!('achievements' in await page('zz_ava', CAL)), 'and with the achievement switch off, none of it is shown (Cal)');

  // ═══ 6b ═════════════════════════════════════════════════════════════════════════════════
  section('6b. the cheer tally: every cheer and every like a person has got, all time');
  const tl = id => val(`select coalesce((select n from public.crew_cheer_tally where athlete_id = $1), 0)::int`, [id]);
  const tlSum = () => val(`select coalesce(sum(n), 0)::int from public.crew_cheer_tally`);
  const mkPost = async (author, ageDays = 0) => (await q(`insert into public.crew_posts (athlete_id, body, created_at) values ($1, 'A post for the tally.', now() - make_interval(days => $2::int)) returning id`, [author, ageDays])).rows[0].id;
  const likeEm = (id, target, em) => call(id, `select public.crew_kudos($1, true, $2)`, [target, em]);
  await q(`delete from public.crew_kudos`);
  await q(`delete from public.crew_cheers where to_athlete = 'zz_ava'`);
  await q(`delete from public.crew_cheer_tally`);
  const tallyLine = `${AVA}:${todayS}`;
  const tp = await mkPost('zz_ava');
  // a like on a post
  await kudos('zz_ben', tp);
  ok(await tl('zz_ava') === 1, 'a like on a post is +1 for the post\'s author');
  await likeEm('zz_ben', tp, '🔥');
  ok(await tl('zz_ava') === 1 && (await val(`select emoji from public.crew_kudos where athlete_id = 'zz_ben' and post_id = $1`, [tp])) === '🔥',
     'the same like with another emoji is +0 (the swap is an UPDATE, and the emoji did change)');
  await likeEm('zz_ben', tp, '💪'); await kudos('zz_ben', tp);
  ok(await tl('zz_ava') === 1, 'and so is every further swap and tap');
  await kudos('zz_ben', tp, false);
  ok(await tl('zz_ava') === 0, 'taking the like back is -1');
  await kudos('zz_ben', tp, false);
  ok(await tl('zz_ava') === 0 && await cnt('crew_cheer_tally', 'n < 0') === 0, 'taking back a like that is not there changes nothing');
  // a like on a Bell line
  await kudos('zz_ben', tallyLine);
  ok(await tl('zz_ava') === 1, 'a like on a Bell line is +1 for the line\'s owner');
  await likeEm('zz_ben', tallyLine, '👏');
  ok(await tl('zz_ava') === 1, 'the line like\'s emoji swap is +0');
  await kudos('zz_pat', tallyLine);
  ok(await tl('zz_ava') === 2, 'a second person\'s like is another +1');
  await kudos('zz_pat', tallyLine, false);
  await kudos('zz_ben', tallyLine, false);
  ok(await tl('zz_ava') === 0, 'and taking both back is -2: the line like goes down too');
  // never your own, none for Amir
  await refuses('you cannot like your own post: crew:own', kudos('zz_ava', tp), /crew:own/);
  await refuses('or your own line: crew:own', kudos('zz_ava', tallyLine), /crew:own/);
  await refuses('or cheer yourself: crew:own', cheer('zz_ava', AVA), /crew:own/);
  ok(await tl('zz_ava') === 0 && await tlSum() === 0, 'and none of that counted for anybody');
  await q(`insert into public.crew_kudos (athlete_id, post_id) values ('zz_ava', $1)`, [tp]);
  ok(await tl('zz_ava') === 0, 'even a like written straight into the table by the author counts for nobody (the trigger itself refuses to count yourself)');
  await q(`delete from public.crew_kudos`);
  const tAmir = await tlSum();
  const tpAmir = await mkPost(await val('public.coach_note_id()'));
  await kudos('zz_ben', tpAmir);
  ok(await tlSum() === tAmir && await cnt('crew_cheer_tally', `athlete_id = public.coach_note_id()`) === 0, 'a like on Amir\'s post counts for nobody: he has no number');
  await kudos('zz_ben', tpAmir, false);
  ok(await tlSum() === tAmir, 'and taking it back moves nobody');
  // the sweep and a post's cascade never take one off
  await kudos('zz_ben', tallyLine);
  await q(`update public.crew_kudos set line_day = current_date - 9`);
  await q(`select public.crew_sweep()`);
  ok(await cnt('crew_kudos') === 0 && await tl('zz_ava') === 1, 'the 7-day sweep deletes an old like and the number stays (it is an all-time number)');
  await kudos('zz_ben', tallyLine, false);
  ok(await tl('zz_ava') === 1, 'and taking back a like the sweep already deleted is +0');
  await kudos('zz_cal', tp);
  ok(await tl('zz_ava') === 2, 'Cal likes the post: +1');
  await q(`delete from public.crew_posts where id = $1`, [tp]);
  ok(await cnt('crew_kudos') === 0 && await tl('zz_ava') === 2, 'the post is deleted, its likes go with it (the cascade) and the number stays');
  const tp2 = await mkPost('zz_ava');
  await kudos('zz_ben', tp2);
  ok(await tl('zz_ava') === 3, 'a like on another post: 3');
  await q(`update public.crew_posts set created_at = now() - interval '8 days' where id = $1`, [tp2]);
  await q(`select public.crew_sweep()`);
  ok(await cnt('crew_posts', `id = '${tp2}'`) === 0 && await cnt('crew_kudos') === 0 && await tl('zz_ava') === 3, 'the sweep deletes a post past 7 days with its likes and the number stays');
  // a cheer
  await cheer('zz_ben', AVA, 'nice one');
  ok(await tl('zz_ava') === 4, 'a cheer is +1 for the person cheered');
  await refuses('a second cheer the same day is refused: crew:cheer_today', cheer('zz_ben', AVA), /crew:cheer_today/);
  ok(await tl('zz_ava') === 4, 'and the refused one counted nothing');
  await coachCall(`select public.coach_cheer('zz_ava')`);
  ok(await tl('zz_ava') === 5, 'Amir\'s cheer counts too (+1)');
  await q(`update public.crew_cheers set word = null where to_athlete = 'zz_ava'`);
  await q(`delete from public.crew_cheers where to_athlete = 'zz_ava'`);
  ok(await tl('zz_ava') === 5, 'and deleting cheer rows (the 400-day sweep) does not take any off');
  // never below zero, never negative by hand
  await kudos('zz_ben', tallyLine);
  await q(`update public.crew_cheer_tally set n = 0 where athlete_id = 'zz_ava'`);
  await kudos('zz_ben', tallyLine, false);
  ok(await tl('zz_ava') === 0, 'a like taken back when the number is already 0 leaves it at 0, never -1');
  await refuses('and the table itself refuses a negative number', q(`update public.crew_cheer_tally set n = -1 where athlete_id = 'zz_ava'`), /check|violat/i);
  // what the page says
  await q(`update public.crew_cheer_tally set n = 11 where athlete_id = 'zz_ava'`);
  const pT = await page('zz_ben', AVA), pTo = await page('zz_ava');
  ok(pT.cheers.total === 11 && pTo.cheers.total === 11 && Number.isInteger(pT.cheers.total), 'cheers.total on her page is the number, for another member and for her own page', [pT.cheers.total, pTo.cheers.total]);
  ok('season' in pT.cheers && 'recent' in pT.cheers && 'mine_today' in pT.cheers && !('mine_today' in pTo.cheers), 'season, recent and mine_today are still there (mine_today not on the own page)', Object.keys(pT.cheers));
  await q(`delete from public.crew_cheer_tally where athlete_id = 'zz_gus'`);
  ok((await page('zz_ava', GUS)).cheers.total === 0, 'a member with no row says 0');
  ok(typeof (await page('zz_ava', CAL)).cheers.total === 'number', 'Cal has every switch off and the number is still shown (cheers has no switch)');
  await refuses('a person who has not said yes cannot read it: crew:not_yes', page('zz_fox', AVA), /crew:not_yes/);
  ok(!('cheers' in await page('zz_fox')) && !JSON.stringify(await page('zz_fox')).includes('"total"'), 'and a person with no yes has no cheers block, so no number, on their own page');
  const bAvaT = await bell('zz_ben');
  ok(!JSON.stringify(bAvaT).includes('cheer_tally') && !JSON.stringify(bAvaT.crew.find(r => r.me === false) || {}).includes('"total"'), 'the Bell does not carry the number (the page does)');
  // GAME-6: nothing but a number
  ok(await cnt('career_facts', `kind in ('cheer','kudos','like')`) === 0, 'it wrote no fact (GAME-6)');
  await q(`delete from public.crew_cheer_tally`); await q(`delete from public.crew_push_q`);

  // ═══ 7 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('7. mentions');
  const pm = (await post('zz_ava', 'Who is in for the weekend session?')).id;
  const tok = (ck, name) => `@[${ck}|${name}]`;
  const rr = async (id, body) => (await reply(id, pm, body)).replies;
  let r1 = await rr('zz_ben', `Me! ${tok(PAT, 'Pat P.')} you too?`);
  const last = rs => rs[rs.length - 1];
  ok(last(r1).body === `Me! ${tok(PAT, 'Pat P.')} you too?` && eq(last(r1).mentions, [{ ck: PAT, who: 'Pat P.', fv: (await bell('zz_pat')).me.fv }]), 'a valid token stays in the body and the row carries mentions [{ck, who, fv}]', last(r1));
  ok(await cnt('crew_mentions', `to_athlete = 'zz_pat' and athlete_id = 'zz_ben'`) === 1, 'one crew_mentions row, from the author to the person');
  r1 = await rr('zz_ben', `Not me ${tok(BEN, 'Ben T.')} and not ${tok(EVE, 'Eve E.')} nor ${tok(DEE, 'Dee')} nor ${tok('11111111-1111-4111-8111-111111111111', 'Nobody')} nor ${tok('abc', 'Bad')}`);
  ok(last(r1).body === `Not me @Ben T. and not @Eve E. nor @Dee nor @Nobody nor ${tok('abc', 'Bad')}` && !('mentions' in last(r1)), 'yourself, a person who left, an under-13 and a stranger become plain "@name"; a token that is not a uuid is left alone', last(r1).body);
  ok(await cnt('crew_mentions') === 1, 'and none of them was written');
  const sixKeys = [AVA, BEN, GUS, PAT, FREE, AVA].map((ck, i) => tok(ck, ['Ava', 'Ben', 'Gus', 'Pat', 'Fay', 'Ava'][i]));
  r1 = await rr('zz_cal', sixKeys.join(' '));
  ok(last(r1).mentions.length === 5 && last(r1).body.endsWith(' @Ava') && !last(r1).body.endsWith(']'), 'at most five to a reply: the sixth token becomes plain text', last(r1));
  ok(await cnt('crew_mentions', `athlete_id = 'zz_cal'`) === 5, 'and five people are written', await cnt('crew_mentions', `athlete_id = 'zz_cal'`));
  r1 = await rr('zz_cal', `${tok(CAL, 'Cal C.')} ${tok(AVA, 'Ava T.')}`);
  ok(last(r1).body.startsWith('@Cal C. @[') && last(r1).mentions.length === 1 && await cnt('crew_mentions', `athlete_id = 'zz_cal' and to_athlete = 'zz_cal'`) === 0, 'mentioning yourself is plain text and writes nothing');
  r1 = await rr('zz_gus', `${tok(PAT, 'Pat P.')} ${tok(PAT, 'Pat P.')}`);
  ok(await cnt('crew_mentions', `athlete_id = 'zz_gus' and to_athlete = 'zz_pat'`) === 1, 'the same person twice is one row');
  // the 140-character limit counts what is SEEN
  const t140 = 'a'.repeat(140 - 8);          // "@Ava T." is 7 characters and a space is 1
  r1 = await rr('zz_pat', `${tok(AVA, 'Ava T.')} ${t140}`.slice(0, 1000));
  ok(last(r1).body.startsWith('@['), 'a reply of 140 seen characters (a token counts as "@Ava T." = 7 and a space) fits however long the token is', last(r1).body.length);
  await refuses('and one seen character more is refused: crew:reply_long', rr('zz_pat', `${tok(AVA, 'Ava T.')} ${t140}b`), /crew:reply_long/);
  await refuses('a plain reply of 141 is refused too', rr('zz_pat', 'q'.repeat(141)), /crew:reply_long/);
  ok((await rr('zz_pat', 'q'.repeat(140))).length > 0, 'and 140 plain characters fit');
  // the name in a token is cut to 24, a token with a newline is not a token
  r1 = await rr('zz_ben', `${tok(AVA, 'N'.repeat(40))}`);
  ok(last(r1).body === `@[${AVA}|${'N'.repeat(24)}]`, 'a name over 24 characters is cut to 24 in the token', last(r1).body);
  r1 = await rr('zz_ben', `@[${AVA}|Av\na]`);
  ok(!('mentions' in last(r1)) && last(r1).body.includes('\n'), 'a token broken by a line break is not a token');
  // reply rows
  ok(last(await rr('zz_ava', 'thanks')).ck === AVA, 'a reply row carries its author\'s ck');
  // who is rung: queue rows
  ok(true, '(the queue rows these replies made are checked in section 8)');

  // ═══ 8 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('8. the push queue: what each new source queues');
  await q(`insert into public.push_subs (endpoint, athlete_id, p256dh, auth, app, kinds, tz_offset, lang, created_at)
           select 'https://push.example.test/' || a, a, 'k', 'a', 'training', '{}'::jsonb, 0, 'en', now() - interval '30 days' from unnest(array['zz_ava','zz_ben','zz_pat','zz_cal']) a`);
  const clearQ = () => q(`delete from public.crew_push_q`);
  const queued = async () => (await q(`select athlete_id, kind, target_key::text as t from public.crew_push_q order by id`)).rows;
  await clearQ(); await q(`delete from public.crew_cheers where day = (now() at time zone 'UTC')::date`);
  await cheer('zz_ava', BEN, 'secret words');
  let qq = await queued();
  ok(qq.length === 1 && qq[0].athlete_id === 'zz_ava' && qq[0].kind === 'cheer' && qq[0].t === BEN, 'a cheer queues one row: the giver, kind cheer, the person\'s crew_key', qq);
  ok(!JSON.stringify(await q(`select * from public.crew_push_q`).then(r => r.rows)).includes('secret'), 'and the word is nowhere in the queue');
  await clearQ(); await coachCall(`select public.coach_cheer('zz_pat', 'coach word')`);
  qq = await queued();
  ok(qq.length === 1 && qq[0].athlete_id === '__coach__' && qq[0].kind === 'cheer' && qq[0].t === PAT, 'Amir\'s cheer queues too (he is allowed to ring)', qq);
  await clearQ();
  const pBenPost = (await post('zz_ben', 'for replies')).id; await clearQ();
  await reply('zz_pat', pBenPost, 'nice');
  qq = await queued();
  ok(qq.length === 1 && qq[0].athlete_id === 'zz_pat' && qq[0].kind === 'reply' && qq[0].t === BEN, 'a reply rings the author of the post (Ben)', qq);
  await clearQ(); await reply('zz_ben', pBenPost, 'my own post');
  ok((await queued()).length === 0, 'a reply to your own post rings nobody');
  const amirPost2 = (await coachCall(`select public.coach_crew_post('amir again')`)).id; await clearQ();
  await reply('zz_ben', amirPost2, 'hi coach');
  ok((await queued()).length === 0, 'a reply to Amir\'s post rings nobody (he has no phone in the crew)');
  await clearQ(); await reply('zz_ava', pBenPost, `hey ${tok(PAT, 'Pat P.')}`);
  qq = await queued();
  ok(qq.map(r => r.kind).sort().join() === 'mention,reply' && qq.find(r => r.kind === 'mention').t === PAT && qq.find(r => r.kind === 'reply').t === BEN, 'a reply that @mentions Pat on Ben\'s post queues a reply for Ben and a mention for Pat', qq);
  await clearQ(); await reply('zz_ben', pBenPost, `${tok(EVE, 'Eve E.')}`);
  ok((await queued()).length === 0, 'a mention that was refused (Eve left) queues nothing');
  // a quiet back-pay and no phones: nothing
  await clearQ(); await db.exec(`select set_config('crew.quiet', 'on', false)`);
  await cheer('zz_cal', BEN);
  ok((await queued()).length === 0, 'with crew.quiet on, a cheer queues nothing');
  await db.exec(`select set_config('crew.quiet', '', false)`);
  await clearQ(); const subsSave = (await q(`select * from public.push_subs`)).rows; await q(`delete from public.push_subs`);
  await cheer('zz_gus', BEN); ok((await queued()).length === 0, 'with nobody subscribed, nothing is queued');
  for (const s of subsSave) await q(`insert into public.push_subs (endpoint, athlete_id, p256dh, auth, app, kinds, tz_offset, lang, created_at) values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`,
    [s.endpoint, s.athlete_id, s.p256dh, s.auth, s.app, JSON.stringify(s.kinds), s.tz_offset, s.lang, s.created_at]);
  // a trigger must never fail the save it hangs off
  await clearQ(); await q(`alter table public.crew_push_q add constraint zz_no_writes check (false) not valid`);
  let saved = true; try { await cheer('zz_free', BEN); } catch (e) { saved = false; }
  ok(saved && await cnt('crew_cheers', `athlete_id = 'zz_free'`) === 1, 'a queue that refuses every write does NOT fail the cheer (a warning, nothing more)');
  await q(`alter table public.crew_push_q drop constraint zz_no_writes`);

  // ═══ 9 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('9. leaving means gone');
  const setup9 = async () => {
    await db.exec(`delete from public.crew_cheers; delete from public.crew_award_likes; delete from public.crew_mentions; delete from public.crew_faces`);
    await face('zz_pat', jpg(2500, 1)); await face('zz_cal', jpg(2500, 2)); await face('zz_ava', jpg(2500, 3));
    await cheer('zz_pat', AVA, 'from pat'); await cheer('zz_ava', PAT, 'to pat'); await cheer('zz_cal', AVA, 'bystander');
    await q(`insert into public.crew_award_likes (athlete_id, to_athlete, award_id) values ('zz_pat', 'zz_ava', 'achievement:back_to_back'), ('zz_ava', 'zz_pat', 'achievement:x'), ('zz_cal', 'zz_ava', 'achievement:back_to_back')`);
    const anyPost = (await q(`select id from public.crew_posts order by created_at limit 1`)).rows[0].id;
    for (const [from, to] of [['zz_pat', 'zz_ava'], ['zz_ava', 'zz_pat'], ['zz_cal', 'zz_ava']])
      await q(`insert into public.crew_mentions (reply_id, athlete_id, to_athlete) values ($1, $2, $3)`, [await rawReply(from, anyPost), from, to]);
    await q(`insert into public.athlete_profile (athlete_id, sports, hand) values ('zz_pat', '{tennis}', 'left') on conflict do nothing`);
    await q(`insert into public.crew_cheer_tally (athlete_id, n) values ('zz_pat', 5), ('zz_cal', 4) on conflict (athlete_id) do update set n = excluded.n`);
  };
  const tallyPat = async () => ({ face: await cnt('crew_faces', `athlete_id = 'zz_pat'`), cheers: await cnt('crew_cheers', `athlete_id = 'zz_pat' or to_athlete = 'zz_pat'`),
    likes: await cnt('crew_award_likes', `athlete_id = 'zz_pat' or to_athlete = 'zz_pat'`), mentions: await cnt('crew_mentions', `athlete_id = 'zz_pat' or to_athlete = 'zz_pat'`), game: await cnt('athlete_profile', `athlete_id = 'zz_pat'`),
    tally: await cnt('crew_cheer_tally', `athlete_id = 'zz_pat'`) });
  await setup9();
  const t0pat = await tallyPat();
  ok(t0pat.face === 1 && t0pat.cheers === 2 && t0pat.likes === 2 && t0pat.mentions === 2 && t0pat.game === 1 && t0pat.tally === 1, 'before: Pat has a face, two cheers (one each way), two signatures and two mentions (each way), a game and a cheer tally', t0pat);
  await answer('zz_pat', 'no');
  const t1pat = await tallyPat();
  ok(t1pat.face === 0 && t1pat.cheers === 0 && t1pat.likes === 0 && t1pat.mentions === 0 && t1pat.tally === 0, 'crew_answer("no") takes the face, the cheers they gave AND got, the signatures both ways, the mentions both ways and the cheer tally', t1pat);
  ok(t1pat.game === 1, 'but their game (athlete_profile) stays: it is coaching data, only hidden');
  ok(await cnt('crew_cheers', `athlete_id = 'zz_cal'`) === 1 && await cnt('crew_award_likes', `athlete_id = 'zz_cal'`) === 1 && await cnt('crew_mentions', `athlete_id = 'zz_cal'`) === 1 && await cnt('crew_faces', `athlete_id in ('zz_cal','zz_ava')`) === 2
     && await val(`select n from public.crew_cheer_tally where athlete_id = 'zz_cal'`) === 4, 'and nobody else\'s moved (Cal\'s tally is still 4)');
  await refuses('their page is gone to everyone: crew:gone', page('zz_ava', PAT), /crew:gone/);
  await answer('zz_pat', 'yes');
  ok((await tallyPat()).cheers === 0 && (await page('zz_ava', PAT)).game.hand === 'left', 'saying yes again does not bring the old rows back; the game is where they left it');
  ok((await tallyPat()).tally === 0 && (await page('zz_ava', PAT)).cheers.total === 0, 'and the cheer tally starts again from 0 (the page says total 0)');
  await setup9();
  await coachCall(`select public.coach_crew_under13('zz_pat', true)`);
  const t2pat = await tallyPat();
  ok(t2pat.face === 0 && t2pat.cheers === 0 && t2pat.likes === 0 && t2pat.mentions === 0 && t2pat.game === 1 && t2pat.tally === 0, 'coach_crew_under13(true) does the same, the cheer tally included', t2pat);
  await coachCall(`select public.coach_crew_under13('zz_pat', false)`);
  await setup9();
  await q(`delete from public.athlete_status where athlete_id = 'zz_old'`);
  await face('zz_ava', jpg(2500, 3));
  await q(`insert into public.crew_faces (athlete_id, w, h, bytes) values ('zz_old', 256, 256, $1)`, [jpg(2500, 8)]);
  await q(`insert into public.crew_cheers (athlete_id, to_athlete, day) values ('zz_old', 'zz_ava', current_date), ('zz_ava', 'zz_old', current_date)`);
  await q(`insert into public.crew_cheer_tally (athlete_id, n) values ('zz_old', 3) on conflict (athlete_id) do update set n = 3`);
  await q(`insert into public.athlete_status (athlete_id, status, since) values ('zz_old', 'former', current_date)`);
  ok(await cnt('crew_faces', `athlete_id = 'zz_old'`) === 0 && await cnt('crew_cheers', `athlete_id = 'zz_old' or to_athlete = 'zz_old'`) === 0 && await cnt('crew_cheer_tally', `athlete_id = 'zz_old'`) === 0,
     'marking an athlete former (athlete_status) clears their face, cheers both ways and cheer tally: the trigger is the door', await cnt('crew_cheers', `athlete_id = 'zz_old' or to_athlete = 'zz_old'`));
  await q(`insert into public.crew_faces (athlete_id, w, h, bytes) values ('zz_ava', 256, 256, $1) on conflict (athlete_id) do nothing`, [jpg(2500, 3)]);
  await q(`insert into public.athlete_status (athlete_id, status, since) values ('zz_ava', 'paused', current_date)`);
  ok(await cnt('crew_faces', `athlete_id = 'zz_ava'`) === 1, 'an athlete_status row that is "paused", not "former", clears nothing');
  await q(`delete from public.athlete_status where athlete_id = 'zz_ava'`);

  // ═══ 10 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('10. the game (Plays)');
  const game = (id, p) => call(id, `select public.my_game_set($1::jsonb)`, [JSON.stringify(p)]);
  let g = await game('zz_fox', { sports: ['padel', 'tennis', 'padel', ' Squash '], hand: 'Left', side: 'right', plays_at: 'club', club: '  Sunset   Padel  ', training_for: ['strength', 'health'], working_on: 'my second serve', ig: '@fox.plays', bogus: 'dropped' });
  ok(eq(g, { sports: ['tennis', 'padel', 'squash'], hand: 'left', side: 'right', plays_at: 'club', club: 'Sunset Padel', training_for: ['strength', 'health'], working_on: 'my second serve', ig: 'fox.plays' }),
     'a person who is not in the crew can fill in their game: sports de-duplicated in the list\'s order, lower case, spaces tidied, @ taken off, unknown keys dropped, nulls absent', g);
  g = await game('zz_fox', { working_on: 'my backhand' });
  ok(g.working_on === 'my backhand' && g.hand === 'left' && g.sports.length === 3, 'a key that is not sent leaves the field alone', g);
  g = await game('zz_fox', { hand: '', club: null, sports: [], ig: '' });
  ok(!('hand' in g) && !('club' in g) && !('ig' in g) && eq(g.sports, []) && g.working_on === 'my backhand', 'an empty string or null clears a field; an empty list plays none', g);
  g = await game('zz_fox', { backhand: 'two' });
  ok(g.backhand === 'two', 'backhand two');
  for (const [what, p, re] of [['an unknown sport', { sports: ['golf'] }, /game:sports/], ['sports not a list', { sports: 'tennis' }, /game:sports/], ['an unknown hand', { hand: 'both' }, /game:hand/],
    ['an unknown backhand', { backhand: 'three' }, /game:backhand/], ['an unknown side', { side: 'middle' }, /game:side/], ['an unknown plays_at', { plays_at: 'pro' }, /game:plays_at/],
    ['a club over 40 characters', { club: 'c'.repeat(41) }, /game:club/], ['a working-on line over 60', { working_on: 'w'.repeat(61) }, /game:working_on/],
    ['an Instagram name with a space', { ig: 'a b' }, /game:ig/], ['an Instagram name over 30', { ig: 'a'.repeat(31) }, /game:ig/], ['an unknown trains-for', { training_for: ['golf'] }, /game:training_for/]])
    await refuses(`${what} is refused by name`, game('zz_fox', p), re);
  await refuses('a body that is not an object: game:shape', call('zz_fox', `select public.my_game_set('[1]'::jsonb)`), /game:shape/);
  await refuses('null: game:shape', call('zz_fox', `select public.my_game_set(null)`), /game:shape/);
  await refuses('the demo: crew:demo', game('demo', { hand: 'left' }), /crew:demo/);
  await refuses('signed out: crew:signin', asNobody(() => q(`select public.my_game_set('{}'::jsonb)`)), /crew:signin/);
  ok((await game('zz_dee', { sports: ['padel'] })).sports[0] === 'padel', 'an under-13 can fill in their own game');
  ok((await game('zz_ava', { club: 'a'.repeat(40), working_on: 'b'.repeat(60), ig: 'A_b.9' })).ig === 'A_b.9', 'exactly 40, 60 and a legal Instagram name are kept');
  const gp = (await page('zz_ben', AVA)).game;
  ok(gp.club.length === 40 && gp.sports.length === 0 && eq(gp.training_for, []) && !('hand' in gp), 'Ben reads it on Ava\'s page (the lists are always there, nulls are absent)', gp);
  ok((await cnt('athlete_profile', `athlete_id = 'zz_fox'`)) === 1, 'one row per person');
  ok((await as('zz_ava', () => q(`select 1 from public.athlete_profile`))).rows.length === 0, 'a signed-in athlete reading the table directly gets nothing (row-level security: only the coach policy reads it)');
  ok((await asCoach(() => q(`select 1 from public.athlete_profile`))).rows.length >= 3, 'the coach reads the table directly (the policy), which is what the backup needs');
  await refuses('a table check backs the function: a direct write of a bad hand is refused', q(`insert into public.athlete_profile (athlete_id, hand) values ('zz_x', 'both')`), /athlete_profile_hand/);
  await refuses('and a bad sport in the table', q(`insert into public.athlete_profile (athlete_id, sports) values ('zz_x', '{golf}')`), /athlete_profile_sports/);
  await refuses('and a bad Instagram name', q(`insert into public.athlete_profile (athlete_id, ig) values ('zz_x', 'a b')`), /athlete_profile_ig/);

  // ═══ 11 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('11. the post\'s proof stamp');
  const sPost = await post('zz_free', 'Done.', jpg(900, 7).toString('base64'), 800, 1000, 'session',
    { day: 2, n: 47, title: '  Lower   Power\n Day  ', mins: 64, held: true, weight: 100, rpe: 9, note: 'private' });
  ok(eq(await val(`select session from public.crew_posts where id = $1`, [sPost.id]), { day: 2, n: 47, title: 'Lower Power Day', mins: 64, held: true }), 'a session post keeps day, n, title (cleaned), mins and held, and drops every other key', await val(`select session from public.crew_posts where id = $1`, [sPost.id]));
  const sPost2 = await post('zz_free', 'Again.', jpg(900, 8).toString('base64'), 800, 1000, 'session', { title: 'T'.repeat(60), mins: 301, held: 'yes' });
  ok(eq(await val(`select session from public.crew_posts where id = $1`, [sPost2.id]), { title: 'T'.repeat(40) }), 'a title is cut to 40; mins over 300 and a held that is not a boolean are dropped', await val(`select session from public.crew_posts where id = $1`, [sPost2.id]));
  const sPost3 = await post('zz_pat', 'Held false.', jpg(900, 9).toString('base64'), 800, 1000, 'session', { mins: 1, held: false });
  ok(eq(await val(`select session from public.crew_posts where id = $1`, [sPost3.id]), { mins: 1, held: false }), 'mins 1 is kept; held false is kept (it is an answer)');
  const sPost4 = await post('zz_pat', 'Old phone.', jpg(900, 10).toString('base64'), 800, 1000, 'session', { day: 3, n: 9 });
  ok(eq(await val(`select session from public.crew_posts where id = $1`, [sPost4.id]), { day: 3, n: 9 }), 'an old phone sending only {day, n} is still valid');
  const sGet = (await bell('zz_ava')).items.find(i => i.t === 'post' && i.id === sPost.id);
  ok(sGet && eq(sGet.session, { day: 2, n: 47, title: 'Lower Power Day', mins: 64, held: true }), 'and the Bell hands the stamp back as it was stored', sGet && sGet.session);

  // ═══ 12 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('12. the erasure');
  await db.exec(`delete from public.crew_cheers; delete from public.crew_award_likes; delete from public.crew_mentions; delete from public.crew_faces`);
  await q(`delete from public.athlete_status where athlete_id = 'zz_old'`);
  await face('zz_ben', jpg(2500, 1)); await face('zz_cal', jpg(2500, 2));
  await cheer('zz_ben', CAL, 'gone'); await cheer('zz_cal', BEN, 'gone too'); await cheer('zz_ava', CAL);
  await q(`insert into public.crew_award_likes (athlete_id, to_athlete, award_id) values ('zz_ben', 'zz_cal', 'achievement:first_blood'), ('zz_cal', 'zz_ben', 'achievement:back_to_back'), ('zz_ava', 'zz_cal', 'achievement:first_blood')`);
  const anyPost2 = (await q(`select id from public.crew_posts order by created_at limit 1`)).rows[0].id;
  for (const [from, to] of [['zz_ben', 'zz_cal'], ['zz_cal', 'zz_ben'], ['zz_ava', 'zz_cal']])
    await q(`insert into public.crew_mentions (reply_id, athlete_id, to_athlete) values ($1, $2, $3)`, [await rawReply(from, anyPost2), from, to]);
  await game('zz_cal', { hand: 'right', sports: ['tennis'] });
  await q(`insert into public.crew_cheer_tally (athlete_id, n) values ('zz_cal', 6), ('zz_ben', 2) on conflict (athlete_id) do update set n = excluded.n`);
  const calMine = async () => ({ profile: await cnt('athlete_profile', `athlete_id = 'zz_cal'`), faces: await cnt('crew_faces', `athlete_id = 'zz_cal'`), tally: await cnt('crew_cheer_tally', `athlete_id = 'zz_cal'`),
    cheers: await cnt('crew_cheers', `athlete_id = 'zz_cal' or to_athlete = 'zz_cal'`), likes: await cnt('crew_award_likes', `athlete_id = 'zz_cal' or to_athlete = 'zz_cal'`),
    mentions: await cnt('crew_mentions', `athlete_id = 'zz_cal' or to_athlete = 'zz_cal'`) });
  const m0c = await calMine();
  ok(m0c.profile === 1 && m0c.faces === 1 && m0c.cheers === 3 && m0c.likes === 3 && m0c.mentions === 3 && m0c.tally === 1, 'before: Cal has a game, a face, a cheer tally, three cheers (given 1, got 2), three signatures and three mentions', m0c);
  const dry = await asCoach(() => val(`select public.coach_erase_person('athlete', 'zz_cal', null, '{}'::uuid[], true)`));
  ok(dry.counts.athlete_profile === 1 && dry.counts.crew_faces === 1 && dry.counts.crew_cheer_tally === 1 && dry.counts.crew_cheers === 1 && dry.counts['crew_cheers (to them)'] === 2 && dry.counts.crew_award_likes === 1 && dry.counts['crew_award_likes (to them)'] === 2
     && dry.counts.crew_mentions === 1 && dry.counts['crew_mentions (to them)'] === 2, 'the dry run counts every table and every "to them" delete', dry.counts);
  ok(eq(await calMine(), m0c), 'and a dry run changes nothing');
  const real = await asCoach(() => val(`select public.coach_erase_person('athlete', 'zz_cal', 'zz_cal', '{}'::uuid[], false)`));
  ok(real.ok === true, 'the real run succeeds (its final check proves no public table with an athlete_id column was forgotten)', real.counts);
  ok(eq(await calMine(), { profile: 0, faces: 0, tally: 0, cheers: 0, likes: 0, mentions: 0 }), 'afterwards nothing of Cal remains in any of the six tables, in either column');
  ok(await val(`select n from public.crew_cheer_tally where athlete_id = 'zz_ben'`) === 2, 'and the cheer tally of somebody else is untouched (Ben keeps 2)');
  ok(await cnt('crew_cheers', `athlete_id = 'zz_ben' or athlete_id = 'zz_ava'`) === 0 && await cnt('crew_cheers') === 0, 'and the cheers he gave and was given are gone from the others\' side too');
  // the check at the end of the erase function bites when a table is forgotten
  const eraseNow = await eraseDef(db);
  await q(eraseNow.replace("'athlete_profile', 'crew_mentions'", "'crew_mentions'"));
  await q(`insert into public.athlete_profile (athlete_id, hand) values ('zz_ben', 'right') on conflict do nothing`);
  await refuses('had the erase list forgotten athlete_profile, the erasure would stop and say so', asCoach(() => q(`select public.coach_erase_person('athlete', 'zz_ben', 'zz_ben', '{}'::uuid[], false)`)), /athlete_profile.*coach_erase_person does not know that table/s);
  await q(eraseNow);
  await q(`delete from public.athlete_profile where athlete_id = 'zz_ben'`);

  // ═══ 13 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('13. crew_now_week is career_weeks');
  const cyc = async (n, s, e, extra = {}) => ({ num: n, art: 'x', startDate: s === null ? null : await val(`(current_date + ${s})::text`), endDate: e === null ? null : await val(`(current_date + ${e})::text`), ...extra });
  const days3 = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const shapes = [
    ['a cycle 10 days in, 5 weeks', { currentCycleIndex: 0, cycles: [await cyc(1, -10, 25)], workouts: { days: days3 } }],
    ['a cycle 36 days long, on its last day (no 6th week)', { currentCycleIndex: 0, cycles: [await cyc(1, -36, 0)], workouts: { days: days3 } }],
    ['a cycle 34 days long, on its last day (week 5 is short)', { currentCycleIndex: 0, cycles: [await cyc(1, -34, 0)], workouts: { days: days3 } }],
    ['a one-day cycle that is today', { currentCycleIndex: 0, cycles: [await cyc(1, 0, 0)], workouts: { days: days3 } }],
    ['the first day of a cycle', { currentCycleIndex: 0, cycles: [await cyc(1, 0, 20)], workouts: { days: days3 } }],
    ['a cycle that starts tomorrow', { currentCycleIndex: 0, cycles: [await cyc(1, 1, 20)], workouts: { days: days3 } }],
    ['a cycle that ended yesterday', { currentCycleIndex: 0, cycles: [await cyc(1, -20, -1)], workouts: { days: days3 } }],
    ['no days to train', { currentCycleIndex: 0, cycles: [await cyc(1, -10, 25)], workouts: { days: [] } }],
    ['no workouts at all', { currentCycleIndex: 0, cycles: [await cyc(1, -10, 25)] }],
    ['two cycles, the second current', { currentCycleIndex: 1, cycles: [await cyc(1, -60, -11), await cyc(2, -10, 25)], workouts: { days: days3 } }],
    ['two cycles, the first current', { currentCycleIndex: 0, cycles: [await cyc(1, -10, 25), await cyc(2, 26, 60)], workouts: { days: days3 } }],
    ['an index past the end', { currentCycleIndex: 5, cycles: [await cyc(1, -10, 25)], workouts: { days: days3 } }],
    ['an index that is a fraction', { currentCycleIndex: 0.5, cycles: [await cyc(1, -10, 25)], workouts: { days: days3 } }],
    ['an index that is a string', { currentCycleIndex: '0', cycles: [await cyc(1, -10, 25)], workouts: { days: days3 } }],
    ['no index', { cycles: [await cyc(3, -10, 25)], workouts: { days: days3 } }],
    ['no cycle number', { currentCycleIndex: 0, cycles: [{ startDate: await val(`(current_date - 10)::text`), endDate: await val(`(current_date + 25)::text`) }], workouts: { days: days3 } }],
    ['a start that is not a date', { currentCycleIndex: 0, cycles: [await cyc(1, null, 25, { startDate: 'soon' })], workouts: { days: days3 } }],
    ['an end before the start', { currentCycleIndex: 0, cycles: [await cyc(1, -5, -9)], workouts: { days: days3 } }],
    ['cycles not a list', { currentCycleIndex: 0, cycles: 'none', workouts: { days: days3 } }],
    ['a 13-day cycle (rounds to 2 weeks), on day 13', { currentCycleIndex: 0, cycles: [await cyc(1, -13, 0)], workouts: { days: days3 } }],
    ['a 10-day cycle (rounds to 1 week), on day 9', { currentCycleIndex: 0, cycles: [await cyc(1, -9, 0)], workouts: { days: days3 } }],
  ];
  let twinBad = 0;
  for (const [what, data] of shapes) {
    await q(`insert into public.programs (athlete_id, data) values ('zz_twin', $1::jsonb) on conflict (athlete_id) do update set data = excluded.data`, [JSON.stringify(data)]);
    const a = (await q(`select cycle_num, week from public.career_weeks('zz_twin') w where w.is_current and current_date between w.wfrom and w.wto order by week`)).rows;
    const b = (await q(`select cycle_num, week from public.crew_now_week('zz_twin') order by week`)).rows;
    const same = eq(a, b);
    if (!same) { twinBad++; ok(false, `crew_now_week = career_weeks for ${what}`, { career_weeks: a, crew_now_week: b }); }
  }
  ok(twinBad === 0, `crew_now_week() answers exactly what career_weeks() does for all ${shapes.length} programmes (the twin has not drifted)`);
  await q(`delete from public.programs where athlete_id = 'zz_twin'`);

  // ═══ 14 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('14. nothing moved in the scorer');
  const sc = await one(`select (select coalesce(sum(xp), 0)::int from public.career_awards where athlete_id like 'zz_%' and kind <> 'achievement') as xp_other,
                               (select count(*)::int from public.career_facts where kind in ('cheer','mention','reply','signature','face')) as facts`);
  ok(sc.xp_other === 0 && sc.facts === 0, 'no fact of a social kind and no XP exists: a cheer, a face, a signature and a mention pay nothing (GAME-6)', sc);
  ok(await val(`select count(*)::int from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relname in ('career_facts','career_awards','career_scores','career_recognition') and not t.tgisinternal and t.tgname ~ 'lounge|cheer|mention|face'`) === 0, 'and the stage put no trigger on a Career Mode table');

  // ═══ 15 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('15. the way back');
  const KINDS_BEFORE_ROLLBACK = await cnt('crew_push_q');
  await q(`insert into public.athlete_profile (athlete_id, hand) values ('zz_keep', 'left') on conflict do nothing`);
  await runSql(db, read(ROLLBACK), 'rollback');
  ok(true, 'the way back runs');
  for (const t of TABLES) ok(!(await val(`select to_regclass('public.${t}')::text`)), `${t} is gone`);
  for (const [trg, tbl] of TRIGS) ok((await cnt('pg_trigger t join pg_class c on c.oid = t.tgrelid', `t.tgname = '${trg}' and c.relname = '${tbl}' and not t.tgisinternal`)) === 0, `${trg} is off ${tbl}`);
  for (const n of REPLACED) {
    const m = await defMd5(n);
    ok(m === MD5_BEFORE[n] || (n === 'coach_erase_person'), `${n} is back to the live text, character for character`, m);
  }
  const eraseBack = await eraseDef(db);
  ok(eraseBack.replace(/\r/g, '') === erase0.replace(/\r/g, ''), 'coach_erase_person() is exactly what it was before the stage (stage81\'s own block and every other list entry untouched)');
  ok(await val(`select pg_get_constraintdef(oid) from pg_constraint where conname = 'crew_push_q_kind_check'`) === KIND_CHECK_BEFORE, 'the queue\'s kind check is the original eleven kinds again');
  ok(await cnt('crew_push_q', `kind in ('cheer','reply','mention')`) === 0, 'and no queued row of a new kind is left behind');
  for (const sig of [...NEW_USER, ...NEW_HELPER]) ok(!(await val(`select to_regprocedure('public.${sig}')::text`)), `${sig.split('(')[0]}() is dropped`);
  ok(await val(`select position('ck' in pg_get_function_result('public.crew_board(integer)'::regprocedure)) = 0`), 'crew_board() has its five columns again');
  ok(await val(`select count(*)::int from information_schema.tables where table_schema = 'backup' and table_name like 'athlete_profile_%'`) === 1, 'the athlete_profile rows were copied to the backup schema first (coaching data is not thrown away)');
  ok(await val(`select count(*)::int from backup.${(await val(`select table_name from information_schema.tables where table_schema = 'backup' and table_name like 'athlete_profile_%'`))} where athlete_id = 'zz_keep'`) === 1, 'and the copy holds the rows');
  const bBack = await bell('zz_ava');
  ok(!('ck' in bBack.crew[0]) && !('ck' in bBack.me) && bBack.crew[0].since, 'the Bell is the old Bell again: no ck, no fv in crew[] or me', bBack.crew[0]);
  await runSql(db, read(ROLLBACK), 'rollback again');
  ok(true, 'the way back runs twice with no error');
  ok(await cnt('crew_replies') > 0 && await cnt('crew_consent') > 0, 'replies and consent were never touched');

  // ═══ 16 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('16. line endings, and the stage again after the way back');
  await db.exec('drop table if exists backup.keep_check');
  const crlf = stage.split('\r\n').join('\n').split('\n').join('\r\n');
  await runSql(db, crlf, 'stage96 with CRLF lines');
  ok(await val(`select position('crew_cheers (to them)' in pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)) > 0`), 'the stage patches the erase function when its own lines end with CRLF');
  await runSql(db, read(ROLLBACK).split('\r\n').join('\n'), 'rollback with LF lines');
  ok(await val(`select position('crew_cheers' in pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)) = 0`), 'and a way back whose lines end differently still takes it out (no delete of a dropped table is left behind)');
  await runSql(db, stage.split('\r\n').join('\n'), 'stage96 with LF lines');
  await runSql(db, read(ROLLBACK).split('\r\n').join('\n').split('\n').join('\r\n'), 'rollback with CRLF lines');
  ok(eraseBack.replace(/\r/g, '') === (await eraseDef(db)).replace(/\r/g, ''), 'after every mix, the erase function is exactly what the live project has');
  // the tally is backfilled from the likes that exist when the stage goes on: what a person has received, never their own, nothing for Amir
  const bfPost = (await q(`insert into public.crew_posts (athlete_id, body) values ('zz_ava', 'backfill post') returning id`)).rows[0].id;
  const bfAmir = (await q(`insert into public.crew_posts (athlete_id, body) values (public.coach_note_id(), 'amir backfill') returning id`)).rows[0].id;
  await q(`delete from public.crew_kudos`);
  await q(`insert into public.crew_kudos (athlete_id, post_id) values ('zz_ben', $1), ('zz_cal', $1), ('zz_ava', $1), ('zz_pat', $2)`, [bfPost, bfAmir]);
  await q(`insert into public.crew_kudos (athlete_id, to_athlete, line_day) values ('zz_ava', 'zz_ben', current_date), ('zz_gus', 'zz_ben', current_date), ('zz_pat', 'zz_cal', current_date)`);
  await runSql(db, stage, 'stage96 once more');
  ok(await val(`select to_regclass('public.crew_faces')::text`) !== null, 'and the stage goes on again after the way back');
  const bf = Object.fromEntries((await q(`select athlete_id, n from public.crew_cheer_tally`)).rows.map(r => [r.athlete_id, r.n]));
  ok(bf.zz_ava === 2 && bf.zz_ben === 2 && bf.zz_gus === 0 && bf.zz_pat === 0 && !('zz_cal' in bf),
     'the backfill: Ava 2 (a post liked by Ben and Cal; her own like on it is not counted), Ben 2 (two line likes), the others 0, and Cal (erased in section 12, so not a member) has no row', bf);
  const memberIds = (await q(`select athlete_id from public.crew_members() order by 1`)).rows.map(r => r.athlete_id);
  ok(eq(Object.keys(bf).sort(), memberIds) && !('__coach__' in bf) && await cnt('crew_cheer_tally', `athlete_id = public.coach_note_id()`) === 0,
     'one row for every current member and for nobody else (not Amir, not a no, not an under-13, not an erased athlete)', [Object.keys(bf).sort(), memberIds]);
  await q(`update public.crew_cheer_tally set n = 99 where athlete_id = 'zz_gus'`); await q(`delete from public.crew_cheer_tally where athlete_id = 'zz_pat'`);
  await runSql(db, stage, 'stage96 a re-run');
  ok(await val(`select n from public.crew_cheer_tally where athlete_id = 'zz_gus'`) === 99 && await val(`select n from public.crew_cheer_tally where athlete_id = 'zz_pat'`) === 0,
     'a re-run of the stage changes nobody\'s number (Gus keeps 99) and only gives a member who has no row one');
  // the backfill's other half: cheers received, counted with the likes
  const bfSql = stage.match(/insert into public\.crew_cheer_tally \(athlete_id, n\)\s+select m\.athlete_id[\s\S]*?on conflict \(athlete_id\) do nothing;/);
  ok(bfSql !== null, 'the backfill statement is in the stage file');
  await q(`insert into public.crew_cheers (athlete_id, to_athlete, day) values ('zz_ben', 'zz_ava', current_date), (public.coach_note_id(), 'zz_ava', current_date), ('zz_cal', 'zz_ava', current_date)`);
  ok(await val(`select n from public.crew_cheer_tally where athlete_id = 'zz_ava'`) === 5, 'three more cheers arrive through the trigger: Ava is on 5');
  await q(`delete from public.crew_cheer_tally`);
  await q(bfSql[0]);
  ok(await val(`select n from public.crew_cheer_tally where athlete_id = 'zz_ava'`) === 5 && await val(`select n from public.crew_cheer_tally where athlete_id = 'zz_ben'`) === 2,
     'and the backfill alone arrives at the same 5: the likes that exist plus the cheers received (Amir\'s included)');
  await q(`delete from public.crew_cheer_tally`); await q(`delete from public.crew_cheers`); await q(`delete from public.crew_kudos`); await q(`delete from public.crew_posts where id in ($1, $2)`, [bfPost, bfAmir]);

  console.log(`\n${passed} of ${passed + failed} checks passed  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (failed) { console.log('\nFAILED:'); fails.forEach(f => console.log('  · ' + f)); }
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error('\nrehearsal blew up:', e); process.exit(2); });
