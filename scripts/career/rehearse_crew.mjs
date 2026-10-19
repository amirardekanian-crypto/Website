// Rehearses supabase/stage81_career_crew.sql (Crew and the Bell: consent, posts with a photo, kudos, the lines of what rang, the coach's side,
// the erasure, the sweep) and its way back (scripts/career/rollback_stage81.sql) on PGlite. Nothing live, made-up athletes only (zz_ ids).
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/career/rehearse_crew.mjs
//
// The live structure (supabase/schema_snapshot.sql without the crew tables: the working copy, or the newest committed one that lacks them once the
// snapshot has been remade), then stage81 twice. No backup file is needed: every row below is made up here. Run it away from 00:00 UTC (the daily
// caps, a line's day and the "last 14 days" windows are read in UTC and a run across midnight can move a post to the next day).
//
//   0. the structure without stage81, made-up athletes, the function coach_erase_person() as it is
//   1. stage81 twice; the five tables and their row-level security; who can execute what; the erase function and the level trigger
//   2. consent: asking, the yes, a no that takes everything off, the demo, signed out
//   3. posts: text, cleaning, photos, session posts, the daily caps
//   4. what the crew can see: no ids, the line key, whose bell, Amir's pinned post, the 7 days and the sweep, who is left out
//   5. what rings: levels (the trigger), weeks and their run, bests (the lift, never the weight), cycles, marks, achievements, honours, the Open,
//      joining, the switches
//   6. kudos      7. photos      8. the coach's side      9. the erasure      10. nothing else moved      11. the way back      12. the cost
//   13. line endings: the apply and the way back from files whose lines end differently (a Windows checkout ends them with CRLF)
//   14. stage82: the emoji beside the Like (the set, the swap, the refusals, the feed, the way back)
//   15. stage83: the feed only when it has changed (the hash, what moves it, the refusals, the way back)
// A check that fails because stage81 is wrong is a finding: it is reported, not fixed here.
// `--stage <file>` and `--rollback <file>` rehearse a modified copy, to see that a check bites (2026-10-19: run against 68 one-line breaks of both files; every one
// was noticed except a weight added to a part that is never printed).
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, snapshotWithout, eraseDef } from './rehearse_lib.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const COACH = { email: 'amirardekanian@gmail.com', role: 'authenticated' };   // is_coach()'s address, as coach.html's COACH_EMAIL
let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => { if (c) { passed++; console.log('  ok   ' + what); } else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 500) : '')); } };
const section = s => console.log('\n' + s);
const info = s => console.log('  ·    ' + s);
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));   // jsonb orders its keys by length: compare without the order
const sleep = ms => new Promise(r => setTimeout(r, ms));   // PGlite reads its clock in milliseconds: things that must come in order are given a gap
const jpg = (n, seed = 1) => { const b = Buffer.alloc(n); for (let i = 0; i < n; i++) b[i] = (i * 31 + seed) & 255; b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[3] = 0xe0; return b; };

const NEW_FUNCS = {   // every function stage81 adds: the ones the app calls, and the helpers only the service role may run
  user: ['get_bell', 'crew_photo', 'crew_answer', 'crew_kinds', 'crew_post', 'crew_delete_post', 'crew_kudos',
         'coach_crew', 'coach_crew_post', 'coach_crew_remove', 'coach_crew_under13'],
  helper: ['crew_kind_list', 'crew_clean', 'crew_default_name', 'crew_members', 'crew_sweep', 'crew_kudos_of', 'crew_me', 'crew_who', 'crew_write_post', 'crew_level_ring'],
};
const TABLES = ['crew_consent', 'crew_posts', 'crew_photos', 'crew_kudos', 'crew_rings'];

async function main() {
  const t0 = Date.now();
  const db = await openDb();
  const q = (sql, p) => db.query(sql, p || []);
  const one = async (sql, p) => (await q(sql, p)).rows[0];
  const val = async (sql, p) => { const r = await one(sql, p); return r ? Object.values(r)[0] : null; };
  const cnt = (t, where = 'true', p) => val(`select count(*)::int from public.${t} where ${where}`, p);
  const hashOf = t => val(`select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.${t} x`);
  const refuses = async (what, p, re) => {
    let msg = null;
    try { await p; } catch (e) { msg = String(e.message || e); }
    ok(msg !== null && re.test(msg), what, msg === null ? 'it did not refuse' : msg);
  };

  // ── who is calling: the role and the claims a Supabase request carries ─────────────────────────────────────────────────────
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
  const post = (id, body, photo = null, w = null, h = null, kind = 'post', ses = null) =>
    call(id, `select public.crew_post($1, $2, $3, $4, $5, $6::jsonb)`, [body, photo, w, h, kind, ses === null ? null : JSON.stringify(ses)]);
  const answer = (id, a, name = null) => call(id, `select public.crew_answer($1, $2)`, [a, name]);
  const kudos = (id, target, on = true) => call(id, `select public.crew_kudos($1, $2)`, [target, on]);
  const soft = p => p.catch(e => ({ error: String(e.message || e) }));          // for set-up steps: a failure shows up in the check that follows, not as a crash
  const bellAs = id => call(id, `select public.get_bell($1)`, [id]);
  const view = (v = 'zz_ava') => coachCall(`select public.get_bell($1)`, [v]);       // the coach reading as someone: the whole crew's feed
  const linesOf = (b, who) => b.items.filter(i => i.t === 'line' && i.who === who);
  const postsOf = (b, who) => b.items.filter(i => i.t === 'post' && i.who === who);
  const lineOf = (b, who) => linesOf(b, who)[0] || { t: 'missing', key: null, me: null, parts: [], kudos: { n: -1, mine: null, names: [] } };   // a missing line fails its check instead of stopping the run
  const kindsOf = l => l.parts.map(p => p.k);

  // ── made-up rows ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  async function mkAthlete(id, first, last, login = true) {
    await q(`insert into public.programs (athlete_id, data) values ($1, $2::jsonb) on conflict do nothing`, [id, JSON.stringify({ athlete: { firstName: first, lastName: last, id } })]);
    if (!login) return;
    const u = `00000000-0000-4000-8000-${String(++nUser).padStart(12, '0')}`;
    USER[id] = u;
    await q(`insert into auth.users (id, email) values ($1, $2) on conflict do nothing`, [u, `athlete.${id}@example.test`]);
    await q(`insert into public.athlete_identities (user_id, athlete_id, email, linked_at) values ($1, $2, $3, now()) on conflict do nothing`, [u, id, `athlete.${id}@example.test`]);
  }
  const fact = (id, kind, ref, dayOff, value = {}, ago = '0 seconds', voided = false) => q(
    `insert into public.career_facts (athlete_id, kind, ref, day, value, source, void_at, created_at, updated_at)
     values ($1, $2, $3, current_date + $4::int, $5::jsonb, 'server', case when $6::boolean then now() end, now() - $7::interval, now() - $7::interval)`,
    [id, kind, ref, dayOff, JSON.stringify(value), voided, ago]);
  const award = (id, kind, item, tier, how = 'live', ago = '0 seconds') => q(
    `insert into public.career_awards (athlete_id, award_id, kind, item, tier, day, pays, xp, size, meaning, evidence, how, rules_version, created_at)
     values ($1, $2, $3, $4, $5::int, current_date, true, 0, 'highlight', 'commitment', '{}', $6, 5, now() - $7::interval)`,
    [id, `${kind}:${item}${tier ? ':' + tier : ''}`, kind, item, tier, how, ago]);
  const member = (id, name, o = {}) => q(
    `insert into public.crew_consent (athlete_id, answer, name, under13, kinds, answered_at, first_yes_at, yes_since)
     values ($1, 'yes', $2, $3::boolean, $4::jsonb, now() - $5::interval, now() - $6::interval, now() - $5::interval)`,
    [id, name, !!o.under13, JSON.stringify(o.kinds || {}), o.yesAgo || '1 day', o.firstAgo || '30 days']);
  const stageDefs = () => val(`select string_agg(pg_get_functiondef(p.oid), E'\\n' order by p.oid::regprocedure::text)
                                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                where n.nspname = 'public' and (p.proname like 'crew\\_%' or p.proname = 'get_bell' or p.proname like 'coach\\_crew%' or p.proname = 'coach_erase_person')`);

  // ═══ 0 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('0. the live structure without stage81, and made-up athletes');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/create table public\.crew_posts/i);
  info('the structure starts from ' + snap.says);
  await runSql(db, snap.sql, 'snapshot');
  await db.exec(`set timezone = 'UTC'`);
  ok(!(await val(`select to_regclass('public.crew_posts')::text`)), 'the snapshot does not hold the crew tables yet (to_regclass of crew_posts is null)');
  ok(await val(`select to_regprocedure('public.get_achievements(text)')::text`), 'it holds stage80 (get_achievements), the stage before this one');
  const erase0 = await eraseDef(db);
  ok(!/crew_/.test(erase0), "coach_erase_person() as the snapshot has it does not know the crew tables (remembered for the way back)");
  const ATH = [['zz_ava', 'Ava', 'Test'], ['zz_ben', 'Ben', 'Try'], ['zz_cal', 'Cal', 'Cole'], ['zz_dee', 'Dee', 'Dunn'], ['zz_eve', 'Eve', 'East'],
               ['zz_nox', 'Nox', 'No'], ['zz_kid', 'Kim', 'Young'], ['zz_new', 'Nia', 'Newbie'], ['zz_era', 'Ern', 'Era'], ['zz_fan', 'Fay', 'Fan'],
               ['zz_jn', 'Jon', 'Jones'], ['zz_sw', 'Sam', 'Switch'], ['zz_gus', 'Gus', 'Giver'], ['zz_una', 'Una', 'Asked'], ['demo', 'Demo', 'Athlete']];
  for (const [id, f, l] of ATH) await mkAthlete(id, f, l);
  await mkAthlete('zz_old', 'Olga', 'Old', false);
  // the catalogue rows the Bell reads for a mark's number and an achievement's name (the snapshot holds no rows)
  const CAT = [['badge', 'held_weeks', { name: 'Hold Serve', tiers: [{ at: 4 }, { at: 8 }, { at: 12 }] }], ['badge', 'century', { name: 'Century', tiers: [{ at: 25 }, { at: 50 }] }],
               ['badge', 'bests', { name: 'Personal Bests', tiers: [{ at: 5 }, { at: 10 }] }], ['badge', 'comebacks', { name: 'Comebacks', tiers: [{ at: 1 }, { at: 3 }] }],
               ['achievement', 'full_month', { name: 'Full Month' }]];
  for (const [k, id, body] of CAT) await q(`insert into public.career_catalogue (kind, id, body, version) values ($1, $2, $3::jsonb, 5)`, [k, id, JSON.stringify(body)]);
  const H0 = {}; for (const t of ['career_facts', 'career_awards', 'career_rules', 'career_catalogue']) H0[t] = await hashOf(t);
  ok(true, `${ATH.length + 1} made-up athletes (${ATH.length} with a login), the four catalogue rows the Bell reads, and the fingerprints of the career tables are taken`);

  // ═══ 1 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('1. stage81 goes on, twice');
  const stage = read(opt('--stage') || path.join(ROOT, 'supabase', 'stage81_career_crew.sql'));        // --stage / --rollback: a modified copy, to see that a check bites
  await runSql(db, stage, 'stage81');
  const defs1 = await stageDefs();
  const erase1 = await eraseDef(db);
  await runSql(db, stage, 'stage81 again');
  ok(true, 'stage81 applied, and applied again without an error');
  ok((await stageDefs()) === defs1, 'the second run changes no function definition (coach_erase_person() is patched once)');
  for (const t of TABLES) ok(await val(`select relrowsecurity from pg_class where oid = to_regclass('public.${t}')`), `${t} exists with row-level security on`);
  for (const t of TABLES) {
    const g = await one(`select has_table_privilege('anon', 'public.${t}', 'select') or has_table_privilege('anon', 'public.${t}', 'insert') as anon,
                                has_table_privilege('authenticated', 'public.${t}', 'insert') or has_table_privilege('authenticated', 'public.${t}', 'update')
                                  or has_table_privilege('authenticated', 'public.${t}', 'delete') as write,
                                has_table_privilege('authenticated', 'public.${t}', 'select') as read`);
    ok(!g.anon && !g.write && g.read === (t === 'crew_consent'), `${t}: anon has nothing, nobody signed in can write it, and only crew_consent can be read (by the coach's policy)`, g);
  }
  const fn = (await q(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as auth,
                              has_function_privilege('service_role', p.oid, 'execute') as svc
                         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                        where n.nspname = 'public' and (p.proname like 'crew\\_%' or p.proname = 'get_bell' or p.proname like 'coach\\_crew%') order by 1`)).rows;
  ok(eq(fn.map(r => r.proname).sort(), [...NEW_FUNCS.user, ...NEW_FUNCS.helper].sort()), 'stage81 adds exactly these 21 functions: 11 for the apps and 10 helpers', fn.map(r => r.proname));
  ok(fn.every(r => !r.anon), 'anon can execute none of them (get_bell included)', fn.filter(r => r.anon).map(r => r.proname));
  ok(NEW_FUNCS.user.every(n => fn.find(r => r.proname === n).auth), 'a signed-in user can execute the 11 the apps call', NEW_FUNCS.user.filter(n => !fn.find(r => r.proname === n).auth));
  ok(NEW_FUNCS.helper.every(n => !fn.find(r => r.proname === n).auth && fn.find(r => r.proname === n).svc), 'a signed-in user can execute none of the 10 helpers; the service role can', NEW_FUNCS.helper.filter(n => fn.find(r => r.proname === n).auth));
  await db.exec('set role anon');
  await refuses('anon calling get_bell() is refused: permission denied', q(`select public.get_bell('zz_ava')`), /permission denied/);
  await db.exec('reset role');
  await refuses('a signed-in athlete calling a helper is refused: permission denied', as('zz_ava', () => q(`select public.crew_sweep()`)), /permission denied/);
  await refuses('a signed-in athlete writing a table directly is refused: permission denied', as('zz_ava', () => q(`insert into public.crew_posts (athlete_id, body) values ('zz_ava', 'direct')`)), /permission denied/);
  ok(/'career_notes', 'crew_kudos', 'crew_photos', 'crew_posts', 'crew_rings', 'crew_consent'\]/.test(erase1), "coach_erase_person()'s table list now ends in crew_kudos, crew_photos, crew_posts, crew_rings, crew_consent");
  ok(erase1.split("delete from public.crew_kudos where to_athlete = v_key").length === 2, 'it deletes the kudos given TO the person\'s lines exactly once');
  ok(erase1.split("'crew_kudos', 'crew_photos'").length === 2, 'the table list was patched once');
  ok(await val(`select count(*)::int from pg_trigger where tgrelid = 'public.career_scores'::regclass and tgname = 'crew_level_ring' and not tgisinternal`) === 1, 'the trigger crew_level_ring is on career_scores');
  ok(!(await val(`select to_regclass('cron.job')::text`)) && !(await val(`select exists (select 1 from pg_available_extensions where name = 'pg_cron')`)), 'pg_cron is absent here, so the hourly job was skipped without an error (as on PGlite)');
  for (const t of Object.keys(H0)) ok((await hashOf(t)) === H0[t], `${t} is unchanged by the apply`);

  // ═══ 2 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('2. consent');
  const b0 = await bellAs('zz_ava');
  ok(b0.me.answer === null && b0.me.can_post === false, 'before answering: me.answer is null and can_post is false', b0.me);
  ok(b0.athlete_id === 'zz_ava' && Array.isArray(b0.items) && b0.days === 7, 'get_bell() answers for the signed-in athlete with a feed and the 7 days');
  await refuses('crew_post() before the yes is refused: crew:not_yes', post('zz_ava', 'hello'), /crew:not_yes/);
  await refuses("crew_answer('maybe') is refused: crew:answer", answer('zz_ava', 'maybe'), /crew:answer/);
  await refuses('crew_answer(null) is refused: crew:answer', answer('zz_ava', null), /crew:answer/);
  await refuses('the demo cannot answer: crew:demo', answer('demo', 'yes'), /crew:demo/);
  await refuses('the demo cannot give kudos: crew:demo', kudos('demo', '00000000-0000-4000-8000-000000000000'), /crew:demo/);
  await refuses('signed out, crew_answer is refused: crew:signin', asNobody(() => q(`select public.crew_answer('yes')`)), /crew:signin/);
  await refuses('signed out, get_bell is refused: not signed in', asNobody(() => q(`select public.get_bell()`)), /not signed in/);
  await refuses('signed out, crew_post is refused: crew:signin', asNobody(() => q(`select public.crew_post('x')`)), /crew:signin/);
  await refuses('signed out, crew_photo is refused: not signed in', asNobody(() => q(`select public.crew_photo(gen_random_uuid())`)), /not signed in/);
  await refuses('signed out, crew_delete_post is refused: crew:signin', asNobody(() => q(`select public.crew_delete_post(gen_random_uuid())`)), /crew:signin/);
  await refuses('signed out, crew_kudos is refused: crew:signin', asNobody(() => q(`select public.crew_kudos('x')`)), /crew:signin/);
  await refuses('signed out, crew_kinds is refused: crew:signin', asNobody(() => q(`select public.crew_kinds('{}'::jsonb)`)), /crew:signin/);
  ok(!(await cnt('crew_consent')), 'none of that wrote a consent row');

  const yes = await answer('zz_ava', 'yes', '  Ava‮ the Ace  ');
  const c1 = await one(`select answer, name, first_yes_at::text as fy, yes_since::text as ys, answered_at is not null as ans, under13 from public.crew_consent where athlete_id = 'zz_ava'`);
  ok(yes.answer === 'yes' && yes.can_post === true && yes.name === 'Ava the Ace', 'a yes: can_post is true and the crew name is cleaned (a bidi override is gone, the spaces trimmed)', yes);
  ok(c1.answer === 'yes' && c1.fy && c1.ys && c1.ans && !c1.under13, 'the row holds the answer, first_yes_at, yes_since and the time of the answer', c1);
  await answer('zz_ava', 'yes');
  await answer('zz_ava', 'yes', '');
  const c1b = await one(`select name, yes_since::text as ys from public.crew_consent where athlete_id = 'zz_ava'`);
  ok(c1b.ys === c1.ys && c1b.name === 'Ava the Ace', 'yes again (with no name, with an empty one) moves nothing: yes_since and the crew name stay');
  for (const id of ['zz_ben', 'zz_cal', 'zz_dee', 'zz_eve', 'zz_nox', 'zz_kid', 'zz_gus', 'zz_sw']) await answer(id, 'yes', id === 'zz_kid' ? 'K'.repeat(30) : null);
  ok(await val(`select char_length(name) from public.crew_consent where athlete_id = 'zz_kid'`) === 24, 'a crew name longer than 24 characters is cut to 24');
  ok((await bellAs('zz_ben')).me.name === 'Ben T.', 'with no name sent, the crew name is the first name and the last initial (Ben T.)');
  // a no, then a yes again: the first yes is kept, the latest yes is the one that counts
  const f0 = await one(`select first_yes_at::text as fy, yes_since::text as ys from public.crew_consent where athlete_id = 'zz_ben'`);
  await sleep(20);
  await answer('zz_ben', 'no');
  const f1 = await one(`select answer, first_yes_at::text as fy, yes_since::text as ys from public.crew_consent where athlete_id = 'zz_ben'`);
  await sleep(20);
  await answer('zz_ben', 'yes');
  const f2 = await one(`select answer, first_yes_at::text as fy, yes_since::text as ys from public.crew_consent where athlete_id = 'zz_ben'`);
  ok(f1.answer === 'no' && f1.ys === null && f1.fy === f0.fy, 'a no clears yes_since and keeps first_yes_at', f1);
  ok(f2.answer === 'yes' && f2.fy === f0.fy && f2.ys !== null && await val(`select $1::timestamptz > $2::timestamptz`, [f2.ys, f0.ys]), 'a yes after a no keeps first_yes_at and moves yes_since to the new yes', { f0, f2 });
  // a no takes everything of theirs off the server at once
  const noxPost = (await post('zz_nox', 'One for the crew.')).id;
  await post('zz_nox', 'With a photo.', jpg(600, 3).toString('base64'), 800, 600);
  const benPost = (await post('zz_ben', 'Back on the court this week.')).id;
  await fact('zz_nox', 'personal_best', 'nox|1', 0, { lift: 'Nox Lift', kg: 100 });
  await q(`insert into public.crew_rings (athlete_id, kind, ref, value) values ('zz_nox', 'level', '4', '{"n": 4}')`);
  const avaLine0 = lineOf(await view(), 'Ava the Ace');          // Ava's line holds "joined"
  await soft(kudos('zz_nox', benPost));
  await soft(kudos('zz_nox', avaLine0.key));
  await soft(kudos('zz_dee', noxPost));
  ok((await cnt('crew_posts', `athlete_id = 'zz_nox'`)) === 2 && (await cnt('crew_photos', `athlete_id = 'zz_nox'`)) === 1 && (await cnt('crew_kudos', `athlete_id = 'zz_nox'`)) === 2
     && (await cnt('crew_kudos', `post_id = $1`, [noxPost])) === 1 && (await cnt('crew_rings', `athlete_id = 'zz_nox'`)) === 1 && linesOf(await view(), 'Nox N.').length === 1,
     'before the no: two posts, a photo, kudos given and received, a ring and a Bell line are all there');
  await answer('zz_nox', 'no');
  ok(!(await cnt('crew_posts', `athlete_id = 'zz_nox'`)) && !(await cnt('crew_photos', `athlete_id = 'zz_nox'`)) && !(await cnt('crew_kudos', `athlete_id = 'zz_nox'`))
     && !(await cnt('crew_kudos', `post_id = $1`, [noxPost])) && !(await cnt('crew_rings', `athlete_id = 'zz_nox'`)),
     "a no deletes the athlete's posts, photos, the kudos they gave and got, and their stored rings");
  ok((await cnt('crew_consent', `athlete_id = 'zz_nox' and answer = 'no'`)) === 1, 'the answer row stays, now a no');
  const afterNo = await view();
  ok(!linesOf(afterNo, 'Nox N.').length && !postsOf(afterNo, 'Nox N.').length, 'and the Bell shows nothing of them: no line (their facts are still there) and no post');
  await refuses('a no-athlete cannot post: crew:not_yes', post('zz_nox', 'still here?'), /crew:not_yes/);
  ok(lineOf(afterNo, 'Ava the Ace').kudos.n === 0, "the kudos the no-athlete had given a line are gone with them", lineOf(afterNo, 'Ava the Ace').kudos);

  // ═══ 3 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('3. posts');
  const cl = async s => val(`select public.crew_clean($1)`, [s]);
  ok(await cl('  hi  ') === 'hi' && await cl(null) === '', 'crew_clean trims, and null is empty');
  ok(await cl('a‮b​c\u0007d⁦e﻿f') === 'abcdef', 'crew_clean strips a bidi override, a zero-width space, a control character, an isolate and a byte-order mark');
  ok(await cl('a\r\nb') === 'a\nb' && await cl('a\n\n\n\n\nb') === 'a\n\nb', 'a carriage return goes and three or more line breaks become two');
  ok(await cl('Strong \u{1F4AA}\u{1F3FD} legs') === 'Strong \u{1F4AA}\u{1F3FD} legs', 'an ordinary emoji with a skin tone passes untouched');
  const zwj = await cl('\u{1F3C3}‍♂️');
  info(`a zero-width joiner is stripped too, so a joined emoji (a runner man) comes out as ${[...zwj].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' ')} (kept: variation selectors)`);
  info(`a tab is taken out, not turned into a space: "a<tab>b" comes out as "${await cl('a\tb')}"`);
  const longText = 'é'.repeat(279) + 'x';
  const p280 = await post('zz_ava', longText);
  ok(p280.id && (await val(`select char_length(body) from public.crew_posts where id = $1`, [p280.id])) === 280, 'a post of exactly 280 characters is kept');
  ok(p280.me.posts_left === 9 && p280.me.photos_left === 3, 'the answer carries me with the counts after it: 9 posts and 3 photos left', p280.me);
  await refuses('281 characters are refused: crew:too_long', post('zz_ava', longText + 'y'), /crew:too_long/);
  await refuses('an empty post is refused: crew:empty', post('zz_ava', '   '), /crew:empty/);
  await refuses('a post of only control characters is refused: crew:empty', post('zz_ava', '​‮\u0007'), /crew:empty/);
  const pDirty = await post('zz_ava', 'a‮b​c\u0007d⁦e﻿f');
  ok((await val(`select body from public.crew_posts where id = $1`, [pDirty.id])) === 'abcdef', 'what is stored is the cleaned text');
  await refuses("an unknown kind is refused: crew:kind", post('zz_ava', 'x', null, null, null, 'banner'), /crew:kind/);
  const before = await cnt('crew_posts', `athlete_id = 'zz_ava'`);
  const png = Buffer.alloc(300, 9); png[0] = 0x89; png[1] = 0x50; png[2] = 0x4e; png[3] = 0x47;
  await refuses('a photo that is not a JPEG (PNG bytes) is refused: crew:photo_bad', post('zz_ava', 'x', png.toString('base64')), /crew:photo_bad/);
  await refuses('a JPEG too small to be a photo (under 100 bytes) is refused: crew:photo_bad', post('zz_ava', 'x', jpg(60).toString('base64')), /crew:photo_bad/);
  await refuses('text that is not base64 is refused: crew:photo_bad', post('zz_ava', 'x', '!!!not base64!!!'), /crew:photo_bad/);
  await refuses('base64 with the wrong padding is refused: crew:photo_bad', post('zz_ava', 'x', 'abc'), /crew:photo_bad/);
  await refuses('a photo over 450 000 bytes is refused: crew:photo_big', post('zz_ava', 'x', jpg(450001).toString('base64')), /crew:photo_big/);
  await refuses('a session post without a photo is refused: crew:session_photo', post('zz_ava', 'Day 2 done', null, null, null, 'session', { day: 2, n: 47 }), /crew:session_photo/);
  ok((await cnt('crew_posts', `athlete_id = 'zz_ava'`)) === before, 'none of the refusals left a post behind');
  const raw1 = jpg(1500, 5);
  const ph1 = await post('zz_ava', '', 'data:image/jpeg;base64,' + raw1.toString('base64'), 1280, 960);
  ok(ph1.id && ph1.me.photos_left === 2, 'a photo behind a data: URL prefix is accepted (and needs no text); 2 photos left', ph1.me);
  const big = jpg(450000, 11);
  const ph2 = await post('zz_ava', 'The big one.', big.toString('base64'), 5000, 1600);
  const r2 = await one(`select w, h, mime, octet_length(bytes) as n from public.crew_photos where post_id = $1`, [ph2.id]);
  ok(r2.n === 450000 && r2.mime === 'image/jpeg' && r2.w === null && r2.h === 1600, 'a photo of exactly 450 000 bytes is kept; a width over 4000 is not stored, a height inside is', r2);
  const wrapped = jpg(2000, 8).toString('base64').replace(/(.{76})/g, '$1\n');
  const ph3 = await post('zz_ava', 'Wrapped lines.', wrapped, 1280, 1600, 'session', { day: '2', n: 47, weight: 100, note: 'x' });
  const s3 = await one(`select kind, session, has_photo from public.crew_posts where id = $1`, [ph3.id]);
  ok(s3.kind === 'session' && s3.has_photo && eq(s3.session, { day: 2, n: 47 }), 'base64 broken into lines is accepted; a session post keeps only day and n, as integers', s3);
  ok(ph3.me.photos_left === 0 && ph3.me.posts_left === 5, 'the three photos of the day are used up; 5 posts left', ph3.me);
  const pSes = await post('zz_ava', 'Plain post with a session object.', null, null, null, 'post', { day: 2, n: 47 });
  ok((await val(`select session from public.crew_posts where id = $1`, [pSes.id])) === null, 'a plain post keeps no session object');
  const pOdd = await post('zz_gus', 'Odd session.', jpg(400, 2).toString('base64'), null, null, 'session', { day: 123, n: 12345 });
  ok(eq(await val(`select session from public.crew_posts where id = $1`, [pOdd.id]), {}), 'a day over two digits and an n over four are dropped from a session post (an empty object is kept)');
  await refuses('a fourth photo in a day is refused: crew:photos_today', post('zz_ava', 'x', jpg(400, 4).toString('base64')), /crew:photos_today/);
  // the caps, on Cal: 3 photos and 10 posts a day
  const calPh = [];
  for (let i = 0; i < 3; i++) { const r = await post('zz_cal', `Photo ${i + 1}`, jpg(300, 20 + i).toString('base64'), 800, 600); calPh.push(r); }
  ok(eq(calPh.map(r => r.me.photos_left), [2, 1, 0]) && eq(calPh.map(r => r.me.posts_left), [9, 8, 7]), 'photos_left counts down 2, 1, 0 and posts_left 9, 8, 7', calPh.map(r => r.me));
  await refuses('Cal\'s fourth photo is refused: crew:photos_today', post('zz_cal', 'x', jpg(300, 24).toString('base64')), /crew:photos_today/);
  let last;
  for (let i = 0; i < 7; i++) last = await post('zz_cal', `Text ${i + 1}`);
  ok(last.me.posts_left === 0 && last.me.can_post === true, 'ten posts a day: the seventh text post is the tenth; posts_left is 0 and the athlete is still in the crew');
  await refuses('the eleventh post of the day is refused: crew:posts_today', post('zz_cal', 'one too many'), /crew:posts_today/);
  ok((await cnt('crew_posts', `athlete_id = 'zz_cal'`)) === 10 && (await cnt('crew_photos', `athlete_id = 'zz_cal'`)) === 3, 'Cal has exactly 10 posts and 3 photos');
  const calMe = await val(`select public.crew_me('zz_cal')`);
  ok(calMe.posts_left === 0 && calMe.photos_left === 0, 'the counts read the same when asked again', calMe);
  const AV = { text: p280.id, dirty: pDirty.id, ph1: ph1.id, big: ph2.id, ses: ph3.id, plain: pSes.id };

  // ═══ 4 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('4. what the crew can see');
  await fact('zz_ava', 'personal_best', 'ava|1', 0, { lift: 'Ava Lift', kg: 111.5 });
  await fact('zz_dee', 'cycle_finished', 'c1', 0, { cycle: 1 });
  const bDee = await bellAs('zz_dee');
  const bCoach = await view('zz_ben');
  for (const [who, b] of [['an athlete', bDee], ['the coach reading as Ben', bCoach]]) {
    const bare = { ...b }; delete bare.athlete_id;
    const s = JSON.stringify(bare);
    ok(!s.includes('zz_') && !s.includes('__coach__') && !/[0-9a-f]{8}-[0-9a-f]{4}-4000-8000/.test(s), `the feed for ${who} carries no athlete id anywhere (only the top-level athlete_id of the viewer)`);
  }
  const avaLine = lineOf(bDee, 'Ava the Ace');
  const today = await val(`select current_date::text`);
  const avaKey = await val(`select crew_key::text from public.crew_consent where athlete_id = 'zz_ava'`);
  ok(avaLine && avaLine.key === `${avaKey}:${today}`, 'a line is named by the athlete\'s crew key and its day (crew_key:YYYY-MM-DD)', avaLine && avaLine.key);
  ok(avaLine.me === false && lineOf(await bellAs('zz_ava'), 'Ava the Ace').me === true, 'a line is marked "me" only for its owner');
  ok(bDee.items.filter(i => i.t === 'post').every(i => !('b64' in i) && !('bytes' in i)) && JSON.stringify(bDee).length < 40000, 'no photo bytes travel in the feed: a post says photo true and its size');
  ok(postsOf(bDee, 'Ava the Ace').length === 6 && postsOf(bDee, 'Cal C.').length === 10, 'Dee sees Ava\'s 6 posts and Cal\'s 10', [postsOf(bDee, 'Ava the Ace').length, postsOf(bDee, 'Cal C.').length]);
  const pBig = postsOf(bDee, 'Ava the Ace').find(i => i.id === AV.big);
  ok(pBig.photo === true && pBig.h === 1600 && pBig.w === null && pBig.left === 7 && pBig.me === false && pBig.amir === false && pBig.pinned === false, 'a photo post says photo, its size, 7 days left, and is not Amir\'s or pinned', pBig);
  ok(bDee.honours === null, 'there are no honours while no month has been frozen');
  // whose bell
  await refuses("an athlete cannot read another athlete's bell: not your bell", call('zz_dee', `select public.get_bell('zz_ava')`), /not your bell/);
  ok((await call('zz_dee', `select public.get_bell('zz_dee')`)).athlete_id === 'zz_dee' && (await call('zz_dee', `select public.get_bell('')`)).athlete_id === 'zz_dee', 'they can ask for their own by name, or with an empty name');
  const bAny = await coachCall(`select public.get_bell('zz_ben')`);
  ok(bAny.athlete_id === 'zz_ben' && bAny.me.name === 'Ben T.', 'the coach reads anyone\'s (the preview)');
  const bNone = await coachCall(`select public.get_bell()`);
  ok(bNone.athlete_id === null && bNone.me === null && bNone.items.length > 0, 'the coach with no athlete named gets the feed and no "me"');
  const bSvc = await val(`select public.get_bell('zz_ava')`);
  ok(bSvc.athlete_id === 'zz_ava' && bSvc.items.length === bDee.items.length, 'the SQL editor (no claims) reads as anyone, too');
  // Amir's post, pinned for a day
  const amir = await coachCall(`select public.coach_crew_post($1)`, ['Eleven of you held your week.']);
  await post('zz_ava', 'Posted after Amir.');
  const bP = await bellAs('zz_dee');
  ok(bP.items[0].id === amir.id && bP.items[0].pinned && bP.items[0].amir && bP.items[0].who === 'Amir', 'Amir\'s post is first, pinned, named Amir, even with a newer post below it', bP.items[0]);
  ok(bP.items[1].t === 'post' && bP.items[1].body === 'Posted after Amir.' && !bP.items[1].pinned, 'and the newer athlete post is next');
  await q(`update public.crew_posts set created_at = now() - interval '23 hours' where id = $1`, [amir.id]);
  ok((await bellAs('zz_dee')).items[0].id === amir.id, 'at 23 hours it is still pinned at the top');
  await q(`update public.crew_posts set created_at = now() - interval '25 hours' where id = $1`, [amir.id]);
  const bQ = await bellAs('zz_dee');
  const amirItem = bQ.items.find(i => i.id === amir.id);
  ok(bQ.items[0].id !== amir.id && amirItem && amirItem.pinned === false && amirItem.left === 6, 'at 25 hours it is no longer pinned (it takes its place by time; 6 days left)', amirItem);
  await q(`update public.crew_posts set created_at = now() - interval '3 days' where id = $1`, [benPost]);
  ok((await bellAs('zz_dee')).items.find(i => i.id === benPost).left === 4, 'a post 3 days old has 4 days left');
  // the 7 days, and the sweep
  const victim = (await post('zz_eve', 'A photo that will age.', jpg(700, 6).toString('base64'), 640, 480)).id;
  await kudos('zz_dee', victim);
  ok((await cnt('crew_photos', `post_id = $1`, [victim])) === 1 && (await cnt('crew_kudos', `post_id = $1`, [victim])) === 1, 'a post with a photo and a kudos is there');
  await q(`update public.crew_posts set created_at = now() - interval '8 days' where id = $1`, [victim]);
  const bAge = await bellAs('zz_dee');
  ok(!bAge.items.some(i => i.id === victim) && !(await cnt('crew_posts', `id = $1`, [victim])) && !(await cnt('crew_photos', `post_id = $1`, [victim])) && !(await cnt('crew_kudos', `post_id = $1`, [victim])),
     'a post 8 days old is not shown, and the read itself swept it away with its photo and its kudos');
  await val(`select public.crew_sweep()`);
  await q(`insert into public.crew_posts (athlete_id, body, created_at) values ('zz_ava', 'old', now() - interval '8 days'), ('zz_ava', 'six and a half days', now() - interval '6 days 12 hours')`);
  await q(`insert into public.crew_kudos (athlete_id, to_athlete, line_day) values ('zz_dee', 'zz_ava', current_date - 8), ('zz_eve', 'zz_ava', current_date - 7)`);
  await q(`insert into public.crew_rings (athlete_id, kind, ref, created_at, value) values ('zz_ava', 'level', '99', now() - interval '9 days', '{"n": 99}'), ('zz_ava', 'level', '98', now() - interval '7 days 12 hours', '{"n": 98}')`);
  ok((await val(`select public.crew_sweep()`)) === 3, 'crew_sweep() deletes a post past 7 days, a line\'s kudos 8 days after its day and a ring past 8 days, and reports 3');
  ok((await cnt('crew_posts', `body = 'six and a half days'`)) === 1 && (await cnt('crew_kudos', `line_day = current_date - 7`)) === 1 && (await cnt('crew_rings', `ref = '98'`)) === 1,
     'and keeps what is still inside its life (a post of 6.5 days, a line\'s kudos of 7 days, a ring of 7.5 days)');
  ok(!linesOf(await view(), 'Ava the Ace').some(l => l.parts.some(p => p.k === 'level')), 'a ring older than 7 days is stored but never shown (its level 98 is not on Ava\'s line)');
  await q(`delete from public.crew_rings where athlete_id = 'zz_ava'`); await q(`delete from public.crew_kudos where athlete_id in ('zz_dee', 'zz_eve') and to_athlete = 'zz_ava'`);
  // who is left out
  await member('zz_old', 'Olga Old');
  await q(`insert into public.crew_posts (athlete_id, body) values ('zz_old', 'A post from a former athlete')`);
  await fact('zz_old', 'personal_best', 'old|1', 0, { lift: 'Old Lift', kg: 60 });
  const shows = async who => { const b = await view(); return { post: postsOf(b, who).length, line: linesOf(b, who).length }; };
  ok(eq(await shows('Olga Old'), { post: 1, line: 1 }), 'an active athlete\'s post and line show (the control for the next checks)');
  await q(`insert into public.athlete_status (athlete_id, status) values ('zz_old', 'paused')`);
  ok(eq(await shows('Olga Old'), { post: 1, line: 1 }), 'a paused athlete still shows');
  await q(`update public.athlete_status set status = 'former' where athlete_id = 'zz_old'`);
  ok(eq(await shows('Olga Old'), { post: 0, line: 0 }), 'a former athlete\'s post and line are not shown, though the rows are still in the tables', { posts: await cnt('crew_posts', `athlete_id = 'zz_old'`) });
  await refuses('and a former athlete cannot be given kudos on that post: crew:gone', kudos('zz_dee', await val(`select id::text from public.crew_posts where athlete_id = 'zz_old'`)), /crew:gone/);
  await q(`delete from public.athlete_status where athlete_id = 'zz_old'`);
  ok(eq(await shows('Olga Old'), { post: 1, line: 1 }), 'it is read live: when the status goes, they show again');
  await q(`delete from public.crew_consent where athlete_id = 'zz_old'`); await q(`delete from public.crew_posts where athlete_id = 'zz_old'`); await q(`delete from public.career_facts where athlete_id = 'zz_old'`);
  // under 13
  await q(`insert into public.crew_posts (athlete_id, body) values ('zz_kid', 'A post before the tick')`);
  await fact('zz_kid', 'personal_best', 'kid|1', 0, { lift: 'Kid Lift', kg: 20 });
  const kidName = 'K'.repeat(24);
  ok(eq(await shows(kidName), { post: 1, line: 1 }), 'a crew member of any age shows until the coach ticks under 13 (the control)');
  await coachCall(`select public.coach_crew_under13('zz_kid', true)`);
  await q(`insert into public.crew_posts (athlete_id, body) values ('zz_kid', 'A post that got in anyway')`);
  ok(!(await cnt('crew_posts', `athlete_id = 'zz_kid' and body = 'A post before the tick'`)) && eq(await shows(kidName), { post: 0, line: 0 }), 'the tick took the first post off; a row that got in anyway and the line are not shown');
  await q(`delete from public.crew_posts where athlete_id = 'zz_kid'`);
  await coachCall(`select public.coach_crew_under13('zz_kid', false)`);
  // the demo and an author with no consent
  await q(`insert into public.crew_consent (athlete_id, answer, name, answered_at, first_yes_at, yes_since) values ('demo', 'yes', 'The Demo', now() - interval '1 day', now() - interval '30 days', now() - interval '1 day')`);
  await q(`insert into public.crew_posts (athlete_id, body) values ('demo', 'I am the demo'), ('zz_ghost', 'I never said yes')`);
  await fact('demo', 'personal_best', 'demo|1', 0, { lift: 'Demo Lift', kg: 1 });
  const bG = await view();
  ok(!bG.items.some(i => i.body === 'I am the demo' || i.body === 'I never said yes' || i.who === 'The Demo'), 'the demo and an author with no consent row never show, whatever the tables hold');
  await q(`delete from public.crew_consent where athlete_id = 'demo'`);
  const bUna = await bellAs('zz_una');
  ok(bUna.me.answer === null && bUna.items.length > 0, 'an athlete who has not answered still gets the feed');
  info('design note: get_bell() does not check that the viewer is in the crew; only kudos need a yes (a "no" athlete can still read the feed)');

  // ═══ 5 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('5. what rings the Bell');
  // 5a. a level, from the score cache
  await member('zz_lvl', 'Lvl'); await member('zz_lvl_kid', 'LvlKid', { under13: true });
  await q(`insert into public.crew_consent (athlete_id, answer) values ('zz_lvl_no', 'no'), ('zz_lvl_ans', null)`);       // a no; a row with no answer
  const score = (id, level) => q(`update public.career_scores set score = jsonb_build_object('career', jsonb_build_object('level', $2::int)), updated_at = now() where athlete_id = $1`, [id, level]);
  const rings = id => val(`select coalesce(string_agg(ref, ',' order by ref::int), '') from public.crew_rings where athlete_id = $1 and kind = 'level'`, [id]);
  for (const id of ['zz_lvl', 'zz_lvl_no', 'zz_lvl_kid', 'zz_lvl_none']) await q(`insert into public.career_scores (athlete_id, stamp, score) values ($1, 's', '{"career": {"level": 3}}')`, [id]);
  ok(!(await rings('zz_lvl')), 'a new score row (an insert) never rings');
  await score('zz_lvl', 5);
  const ring5 = await one(`select value, day::text as day from public.crew_rings where athlete_id = 'zz_lvl' and ref = '5'`);
  ok((await rings('zz_lvl')) === '5' && ring5.value.n === 5 && ring5.day === today, 'a level that goes up rings once, with the level reached', ring5);
  await score('zz_lvl', 4); await score('zz_lvl', 5);
  ok((await rings('zz_lvl')) === '5', 'a lower level, then the same level again, ring nothing');
  await score('zz_lvl', 6);
  ok((await rings('zz_lvl')) === '5,6', 'the next level up rings again');
  await q(`insert into public.career_scores (athlete_id, stamp, score) values ('zz_lvl_same', 's', '{"career": {"level": 3}}')`);
  await member('zz_lvl_same', 'LvlSame');
  await q(`update public.career_scores set score = '{"career": {"level": 3, "xp": 10}}' where athlete_id = 'zz_lvl_same'`);
  ok(!(await cnt('crew_rings', `athlete_id = 'zz_lvl_same'`)), 'a score saved again at the same level (other numbers changed) rings nothing');
  await q(`update public.career_scores set score = '{}' where athlete_id = 'zz_lvl'`);
  ok((await rings('zz_lvl')) === '5,6', 'a score with no level changes nothing and raises no error');
  await score('zz_lvl', 3); await score('zz_lvl', 5);
  ok((await cnt('crew_rings', `athlete_id = 'zz_lvl' and ref = '5'`)) === 1, 'reaching a level a second time does not ring it twice');
  await q('begin');
  try { await q(`select set_config('crew.quiet', 'on', true)`); await score('zz_lvl', 9); } finally { await q('commit'); }
  ok(!(await cnt('crew_rings', `athlete_id = 'zz_lvl' and ref = '9'`)), "a back-pay that sets crew.quiet = 'on' inside its transaction rings nothing");
  await score('zz_lvl', 10);
  ok((await cnt('crew_rings', `athlete_id = 'zz_lvl' and ref = '10'`)) === 1, 'and the setting ended with its transaction: the next level up rings');
  await q('begin');
  try {
    await q(`alter table public.crew_rings add constraint crew_rings_test_refuse check (false) not valid`);
    await score('zz_lvl', 11);
    ok((await val(`select score #>> '{career,level}' from public.career_scores where athlete_id = 'zz_lvl'`)) === '11' && !(await cnt('crew_rings', `ref = '11'`)),
       'a ring that cannot be written never stops the score save (a warning, not an error)');
  } finally { await q('rollback'); }
  ok(await val(`select score #>> '{career,level}' from public.career_scores where athlete_id = 'zz_lvl'`) === '10', '(that save was rolled back with the experiment)');
  // the live write of the cache is `insert … on conflict do update` (career_scored(), career_scores_for()): the update path must ring, the insert path never
  const upsert = (id, level) => q(`insert into public.career_scores as c (athlete_id, stamp, score, updated_at, rewards)
      values ($1, 's2', jsonb_build_object('career', jsonb_build_object('level', $2::int)), now(), null)
      on conflict on constraint career_scores_pkey do update set stamp = excluded.stamp, score = excluded.score, updated_at = now(), rewards = coalesce(c.rewards, excluded.rewards)`, [id, level]);
  await member('zz_lvl_up', 'LvlUp');
  await upsert('zz_lvl_up', 3); await upsert('zz_lvl_up', 3);
  const upNone = await rings('zz_lvl_up');
  await upsert('zz_lvl_up', 4);
  ok(upNone === '' && (await rings('zz_lvl_up')) === '4', 'the live write (insert … on conflict do update) rings on the update path when the level rose, and not on the insert path or at the same level');
  await q(`update public.career_scores set rewards = '{"base": "x"}'::jsonb where athlete_id = 'zz_lvl_up'`);
  ok((await rings('zz_lvl_up')) === '4', 'a write that touches only the rewards column rings nothing');
  for (const id of ['zz_lvl_no', 'zz_lvl_kid', 'zz_lvl_none']) { await score(id, 6); }
  await q(`insert into public.career_scores (athlete_id, stamp, score) values ('zz_lvl_ans', 's', '{"career": {"level": 3}}')`); await score('zz_lvl_ans', 7);
  ok(!(await cnt('crew_rings', `athlete_id in ('zz_lvl_no', 'zz_lvl_kid', 'zz_lvl_none', 'zz_lvl_ans')`)), 'no ring for a no, a yes ticked under 13, a row with no answer, or someone with no row at all');
  let bB = await view();
  const lvlLine = linesOf(bB, 'Lvl');
  ok(lvlLine.length === 1 && eq(lvlLine[0].parts, [{ k: 'level', n: 10 }]), 'on the Bell the day\'s rings are one level part with the highest level', lvlLine);

  // 5b. a week held, with the run (a twin of get_profile()'s loop)
  await member('zz_wk', 'Wk', { yesAgo: '20 days' }); await member('zz_brk', 'Brk', { yesAgo: '20 days' });
  const weeks = [['held', 'c1|w1', -40, '40 days'], ['held', 'c1|w2', -33, '33 days'], ['broken', 'c1|w3', -26, '26 days'], ['held', 'c1|w4', -19, '19 days'],
                 ['held', 'c1|w5', -12, '12 days'], ['held', 'c1|w6', -3, '3 days'], ['held', 'c1|w7', 0, '0 seconds']];
  for (const [k, ref, d, ago] of weeks) await fact('zz_wk', 'week_' + k, ref, d, {}, ago);
  await fact('zz_wk', 'week_held', 'c1|w7b', 0, {}, '0 seconds', true);
  bB = await view();
  const wkL = linesOf(bB, 'Wk');
  ok(wkL.length === 2 && eq(wkL[0].parts, [{ k: 'week', run: 4 }]) && eq(wkL[1].parts, [{ k: 'week', run: 3 }]),
     'weeks held ring with their run: a broken week ends a run (run 3 after it, then 4), a voided week is not counted, and one line per day', wkL.map(l => l.parts));
  ok(!wkL.some(l => Date.parse(l.at) < Date.now() - 7 * 864e5), 'a week learned more than 7 days ago is not on the Bell, though it counts in the run');
  await fact('zz_brk', 'week_broken', 'c1|w1', 0); await fact('zz_brk', 'comeback', 'cb|1', 0, { weeks: 3 });
  ok(!linesOf(bB = await view(), 'Brk').length, 'a broken week alone, and a single comeback, never ring');
  await member('zz_wk2', 'Wk2'); await fact('zz_wk2', 'week_held', 'c1|w1', -20);
  ok(!linesOf(await view(), 'Wk2').length, 'a week whose day is more than 14 days back (learned late) does not ring');
  // the Hold Serve mark takes the plain week part's place
  await member('zz_hw', 'Hw'); await member('zz_hw2', 'Hw2'); await member('zz_hw3', 'Hw3', { kinds: { mark: false } });
  for (const id of ['zz_hw', 'zz_hw2', 'zz_hw3']) await fact(id, 'week_held', 'c1|w1', 0);
  await award('zz_hw', 'badge', 'held_weeks', 2); await award('zz_hw2', 'badge', 'held_weeks', 2, 'live', '1 day'); await award('zz_hw3', 'badge', 'held_weeks', 2);
  bB = await view();
  ok(eq(lineOf(bB, 'Hw').parts, [{ k: 'mark', item: 'held_weeks', at: 8 }]), 'a Hold Serve mark the same day replaces the plain week part, and carries the number it reached (tier 2 = 8 weeks)', linesOf(bB, 'Hw'));
  const hw2 = linesOf(bB, 'Hw2');
  ok(hw2.length === 2 && eq(kindsOf(hw2[0]), ['week']) && eq(kindsOf(hw2[1]), ['mark']), 'a mark on another day does not hide the week of today (two lines)', hw2.map(kindsOf));
  ok(eq(kindsOf(lineOf(bB, 'Hw3')), ['week']), 'with the marks switched off, the week part comes back');

  // 5c. a personal best: the lift, never the weight
  await member('zz_best', 'Best');
  const lifts = [['Back Squat', 137.5], ['Bench Press', 92.5], ['Deadlift', 180.5], ['Pull-up', 12.5]];
  for (const [i, [lift, kg]] of lifts.entries()) await fact('zz_best', 'personal_best', `b|${i}`, 0, { lift, kg });
  await fact('zz_best', 'personal_best', 'b|void', 0, { lift: 'Voided Lift', kg: 1 }, '0 seconds', true);
  await fact('zz_best', 'personal_best', 'b|old', -20, { lift: 'Old Lift', kg: 2 });
  await fact('zz_best', 'personal_best', 'b|blank', 0, { lift: '  ', kg: 3 }); await fact('zz_best', 'personal_best', 'b|nolift', 0, { kg: 4 });
  bB = await view();
  const bestL = linesOf(bB, 'Best');
  ok(bestL.length === 1 && eq(bestL[0].parts, [{ k: 'best', lifts: ['Back Squat', 'Bench Press', 'Deadlift'], more: 1 }]),
     'several bests in a day are one part: three lifts and "1 more"; a voided, a 20-day-old, a blank and a lift-less fact are left out', bestL);
  const bestJson = JSON.stringify(bestL);
  ok(!/"kg"|137\.5|92\.5|180\.5|12\.5/.test(bestJson), 'the part names the lifts and never the weight');
  await member('zz_best2', 'Best2'); await fact('zz_best2', 'personal_best', 'b|1', 0, { lift: 'Chin-up', kg: 5 });
  ok(eq(lineOf(await view(), 'Best2').parts, [{ k: 'best', lifts: ['Chin-up'], more: 0 }]), 'one best: one lift and "0 more"');

  // 5d. a cycle finished
  await member('zz_cyc', 'Cyc'); await member('zz_cyc2', 'Cyc2');
  await fact('zz_cyc', 'cycle_finished', 'c2', 0, { cycle: 2 }); await fact('zz_cyc', 'cycle_finished', 'c3', 0, { cycle: 3 }, '1 second');
  await fact('zz_cyc2', 'cycle_finished', 'c1', -20, { cycle: 1 });
  bB = await view();
  ok(eq(lineOf(bB, 'Cyc').parts, [{ k: 'cycle', n: 3 }]) && !linesOf(bB, 'Cyc2').length, 'a cycle finished rings with the latest cycle of the day; one finished 20 days ago does not ring');

  // 5e. marks and achievements, minted live; quiet back-pays never ring
  await member('zz_ach', 'Ach');
  await award('zz_ach', 'achievement', 'full_month', null, 'live', '5 minutes');
  await award('zz_ach', 'achievement', 'ghost_ach', null, 'live', '4 minutes');
  await award('zz_ach', 'badge', 'century', 1, 'live', '3 minutes');
  await award('zz_ach', 'badge', 'comebacks', 1, 'live', '2 minutes');
  await award('zz_ach', 'achievement', 'quiet_one', null, 'silent', '1 minute');
  await award('zz_ach', 'badge', 'century', 2, 'baseline', '1 minute');
  await award('zz_ach', 'badge', 'the_upgrade', 1, 'live', '1 minute');
  await award('zz_ach', 'title', 'grand_slam', null, 'live', '1 minute');
  await fact('zz_ach', 'comeback', 'cb|1', 0, { weeks: 3 });
  bB = await view();
  const achL = linesOf(bB, 'Ach');
  ok(achL.length === 1 && eq(achL[0].parts, [{ k: 'achievement', id: 'full_month', name: 'Full Month' }, { k: 'achievement', id: 'ghost_ach', name: 'ghost_ach' },
                                              { k: 'mark', item: 'century', at: 25 }, { k: 'mark', item: 'comebacks', at: 1 }]),
     'live achievements (named from the catalogue, else by their id) and the four numbers\' marks (with their number) ring in the order they came; silent and baseline awards, a removed badge, a title and a single comeback do not',
     achL.map(l => l.parts));

  // 5f. the month's honours, and a Monthly Open result
  await member('zz_hon', 'Hon'); await member('zz_hon2', 'Hon2', { kinds: { honour: false, open: false } });
  const m0 = await val(`select (date_trunc('month', current_date) - interval '1 month')::date::text`);
  await q(`insert into public.career_honours (month, honour, athlete_id, value, created_at) values ($1::date, 'sessions', 'zz_hon', '{"n": 12, "slot": 1}', now() - interval '2 minutes'),
           ($1::date, 'full_month', 'zz_hon', '{}', now() - interval '2 minutes'), ($1::date, 'near', 'zz_hon', '{"held": 3}', now() - interval '2 minutes'),
           ($1::date, 'sessions', 'zz_hon2', '{"n": 9}', now() - interval '2 minutes')`, [m0]);
  await q(`insert into public.crew_rings (athlete_id, kind, ref, value) values ('zz_hon', 'open', '2026-09', '{"month": "2026-09", "place": 2}'), ('zz_hon2', 'open', '2026-09', '{"month": "2026-09", "place": 5}')`);
  bB = await view();
  const honL = linesOf(bB, 'Hon');
  ok(honL.length === 1 && eq(kindsOf(honL[0]), ['honour', 'honour', 'open']) && !honL[0].parts.some(p => p.honour === 'near'), 'honours ring once the month is frozen (never "near"), and a Monthly Open result rings', honL.map(l => l.parts));
  ok(honL[0].parts.find(p => p.k === 'open').place === 2 && honL[0].parts.find(p => p.honour === 'sessions').month === m0, 'the Open part carries its result; an honour part carries its month');
  ok(!linesOf(bB, 'Hon2').length, 'with the honour and Open switches off, neither shows');
  const dom = Number(await val(`select extract(day from current_date)::int`));
  ok(bB.honours === null, 'the honours block stays null until the month is frozen (no career_honour_months row)');
  await q(`insert into public.career_honour_months (month) values ($1::date)`, [m0]);
  const bH = await view();
  // the block is gated on the date (the 1st to the 14th): to read the rest of it today, a copy of get_bell() without the gate is made inside a transaction and rolled back
  {
    const def = await val(`select pg_get_functiondef('public.get_bell(text)'::regprocedure)`);
    const probe = def.replace('public.get_bell(', 'public.get_bell_probe(').replace('if extract(day from current_date) <= 14 and exists', 'if true and exists');
    ok(probe !== def && probe.includes('get_bell_probe') && probe.includes('if true and exists'), 'the honours block is gated by "extract(day from current_date) <= 14" (a probe copy without it is made)');
    await q('begin');
    let hp;
    try { await db.exec(probe); hp = await asCoach(() => val(`select public.get_bell_probe('zz_ava')`)); } finally { await q('rollback'); }
    const rowsOf = (hp.honours || {}).rows || [];
    ok(hp.honours && hp.honours.month === m0 && rowsOf.length === 2 && rowsOf.every(r => r.who === 'Hon' && r.me === false && !('slot' in r.value)) && eq(rowsOf.map(r => r.honour).sort(), ['full_month', 'sessions']),
       'without the date gate the block names last month, the honours of crew members who keep the switch on (Hon: two; the switch of Hon2 is off; "near" is never listed), without the slot', hp.honours);
    ok(!(await val(`select to_regprocedure('public.get_bell_probe(text)')::text`)), '(the probe was rolled back)');
  }
  if (dom <= 14) {
    ok(bH.honours && bH.honours.month === m0 && bH.honours.rows.length === 2 && bH.honours.rows.every(r => r.who === 'Hon' && !('slot' in r.value)) && !bH.honours.rows.some(r => r.honour === 'near'),
       `from the 1st to the 14th (today is the ${dom}th) last month's honours show for crew members who keep the switch on, never "near" and without the slot`, bH.honours);
  } else {
    ok(bH.honours === null, `after the 14th (today is the ${dom}th) the honours block is null even though the month is frozen`, bH.honours);
    info(`today is the ${dom}th: the date gate itself is checked here (null after the 14th); on the 1st to the 14th the real block is checked too`);
  }

  // 5g. joining the crew, and the moment a yes began
  await answer('zz_jn', 'yes');
  bB = await view();
  ok(eq(linesOf(bB, 'Jon J.').map(kindsOf), [['joined']]), 'joining the crew (the first yes) rings once, alone on its line');
  await answer('zz_jn', 'no'); await answer('zz_jn', 'yes');
  ok(!linesOf(await view(), 'Jon J.').length, 'a yes after a no does not ring "joined" again: only moments from the latest yes count');
  await member('zz_pre', 'Pre', { yesAgo: '1 hour' });
  await fact('zz_pre', 'personal_best', 'p|1', 0, { lift: 'Early Lift' }, '2 hours'); await fact('zz_pre', 'personal_best', 'p|2', 0, { lift: 'Late Lift' }, '30 minutes');
  ok(eq(lineOf(await view(), 'Pre').parts, [{ k: 'best', lifts: ['Late Lift'], more: 0 }]), 'a moment learned before the athlete\'s latest yes does not ring; one after it does');

  // 5h. the switches
  await fact('zz_sw', 'personal_best', 'sw|1', 0, { lift: 'Switch Lift', kg: 70 }); await fact('zz_sw', 'cycle_finished', 'c1', 0, { cycle: 1 }); await fact('zz_sw', 'week_held', 'c1|w1', 0);
  ok(eq(kindsOf(lineOf(await view(), 'Sam S.')), ['joined', 'best', 'week', 'cycle']), 'the line of Sam holds joined, best, week and cycle (order: level, rest, best, week, cycle)');
  const sw1 = await call('zz_sw', `select public.crew_kinds($1::jsonb)`, [JSON.stringify({ best: false })]);
  ok(sw1.kinds.best === false && sw1.kinds.week === true, 'crew_kinds({"best": false}) turns one kind off and answers with the switches', sw1.kinds);
  ok(eq(kindsOf(lineOf(await view(), 'Sam S.')), ['joined', 'week', 'cycle']), 'and the bests are gone from the Bell at once (read live)');
  await call('zz_sw', `select public.crew_kinds($1::jsonb)`, [JSON.stringify({ nonsense: false, week: 'no', cycle: 0, level: true })]);
  ok(eq(await val(`select kinds from public.crew_consent where athlete_id = 'zz_sw'`), { best: false, level: true }), 'unknown keys and values that are not booleans are ignored', await val(`select kinds from public.crew_consent where athlete_id = 'zz_sw'`));
  await refuses('a list instead of an object is refused: crew:kinds', call('zz_sw', `select public.crew_kinds('[1]'::jsonb)`), /crew:kinds/);
  await refuses('null is refused: crew:kinds', call('zz_sw', `select public.crew_kinds(null)`), /crew:kinds/);
  await refuses('switches before being asked: crew:not_asked', call('zz_una', `select public.crew_kinds('{"best": true}'::jsonb)`), /crew:not_asked/);
  await call('zz_sw', `select public.crew_kinds($1::jsonb)`, [JSON.stringify(Object.fromEntries(['level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open'].map(k => [k, false])))]);
  ok(eq(kindsOf(lineOf(await view(), 'Sam S.')), ['joined']), 'with every kind off only "joined" is left (it has no switch)');
  await call('zz_sw', `select public.crew_kinds($1::jsonb)`, [JSON.stringify({ best: true, week: true, cycle: true })]);
  ok(eq(kindsOf(lineOf(await view(), 'Sam S.')), ['joined', 'best', 'week', 'cycle']), 'and they come back when switched on');
  // one line per athlete per day
  const bAll = await view();
  const perDay = {};
  for (const l of bAll.items.filter(i => i.t === 'line')) perDay[l.key] = (perDay[l.key] || 0) + 1;
  ok(Object.values(perDay).every(n => n === 1), 'every athlete has at most one line per day (each key appears once)', perDay);

  // ═══ 6 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('6. kudos');
  const P = AV.text;
  const k1 = await kudos('zz_ben', P);
  ok(k1.n === 1 && k1.mine === true && eq(k1.names, []), 'the first kudos: n 1, mine, and no names (the viewer is never named)', k1);
  await kudos('zz_ben', P);
  ok((await cnt('crew_kudos', `post_id = $1`, [P])) === 1, 'giving it again changes nothing');
  await sleep(20); const k2 = await kudos('zz_cal', P); await sleep(20); const k3 = await kudos('zz_dee', P); await sleep(20); const k4 = await kudos('zz_eve', P);
  ok(k2.n === 2 && eq(k2.names, ['Ben T.']) && eq(k3.names, ['Cal C.', 'Ben T.']) && k4.n === 4 && eq(k4.names, ['Dee D.', 'Cal C.', 'Ben T.']), 'names are the other crew members, newest first', [k2, k3, k4]);
  const kPost = postsOf(await bellAs('zz_ava'), 'Ava the Ace').find(i => i.id === P).kudos;
  ok(kPost.n === 4 && kPost.mine === false && eq(kPost.names, ['Eve E.', 'Dee D.', 'Cal C.']), 'seen by the author: four kudos, three names (the newest three)', kPost);
  const kBen = postsOf(await bellAs('zz_ben'), 'Ava the Ace').find(i => i.id === P).kudos;
  ok(kBen.mine === true && eq(kBen.names, ['Eve E.', 'Dee D.', 'Cal C.']), 'seen by a giver: mine is true and their own name is not in the list', kBen);
  const k5 = await kudos('zz_ben', P, false);
  ok(k5.n === 3 && k5.mine === false && !(await cnt('crew_kudos', `athlete_id = 'zz_ben' and post_id = $1`, [P])), 'taking kudos back removes it (n 3, not mine)', k5);
  await refuses('kudos for your own post: crew:own', kudos('zz_ava', P), /crew:own/);
  await refuses('no kudos before a yes (never answered): crew:not_yes', kudos('zz_una', P), /crew:not_yes/);
  await refuses('no kudos from a no: crew:not_yes', kudos('zz_nox', P), /crew:not_yes/);
  await refuses('a made-up target: crew:target', kudos('zz_ben', 'nonsense'), /crew:target/);
  await refuses('a post that does not exist: crew:gone', kudos('zz_ben', '11111111-2222-4333-8444-555555555555'), /crew:gone/);
  await refuses("a post of someone who never said yes: crew:gone", kudos('zz_ben', await val(`select id::text from public.crew_posts where athlete_id = 'zz_ghost'`)), /crew:gone/);
  await refuses('a line with an impossible date: crew:target', kudos('zz_ben', `${avaKey}:2026-13-45`), /crew:target/);
  await refuses('a line of a key nobody holds: crew:gone', kudos('zz_ben', `11111111-2222-4333-8444-555555555555:${today}`), /crew:gone/);
  await refuses('a line of a day too far back: crew:gone', kudos('zz_ben', `${avaKey}:${await val(`select (current_date - 9)::text`)}`), /crew:gone/);
  await refuses('kudos for your own line: crew:own', kudos('zz_ava', `${avaKey}:${today}`), /crew:own/);
  const lk = await kudos('zz_ben', `${avaKey}:${today}`);
  ok(lk.n === 1 && lk.mine === true && (await cnt('crew_kudos', `to_athlete = 'zz_ava' and line_day = current_date and athlete_id = 'zz_ben'`)) === 1, 'kudos for a line of today: stored against the athlete and the day, never an id in the answer', lk);
  ok(lineOf(await bellAs('zz_ben'), 'Ava the Ace').kudos.mine === true && lineOf(await bellAs('zz_ava'), 'Ava the Ace').kudos.mine === false, 'the Bell shows the line\'s kudos as mine only to the giver');
  const amirKudos = await kudos('zz_ben', amir.id);
  ok(amirKudos.n === 1, 'kudos for Amir\'s post are allowed');
  await kudos('zz_gus', P);
  ok((await cnt('crew_kudos', `athlete_id = 'zz_gus'`)) === 1, 'a giver is counted while in the crew');
  await answer('zz_gus', 'no');
  const kAfter = postsOf(await bellAs('zz_ava'), 'Ava the Ace').find(i => i.id === P).kudos;
  ok(!(await cnt('crew_kudos', `athlete_id = 'zz_gus'`)) && kAfter.n === 3, 'a giver who says no is no longer counted: their kudos went with the no', kAfter);
  await q(`insert into public.crew_consent (athlete_id, answer, name, first_yes_at, yes_since) values ('zz_gone', 'yes', 'Gone Giver', now() - interval '3 days', now() - interval '3 days')`);
  await q(`insert into public.crew_kudos (athlete_id, post_id) values ('zz_gone', $1)`, [P]);
  await q(`insert into public.athlete_status (athlete_id, status) values ('zz_gone', 'former')`);
  ok(postsOf(await bellAs('zz_ava'), 'Ava the Ace').find(i => i.id === P).kudos.n === 3, 'a giver who became a former athlete is not counted either, though the row is still there');
  await q(`delete from public.crew_kudos where athlete_id = 'zz_gone'`); await q(`delete from public.crew_consent where athlete_id = 'zz_gone'`); await q(`delete from public.athlete_status where athlete_id = 'zz_gone'`);

  // ═══ 7 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('7. photos');
  const showPhoto = await call('zz_dee', `select public.crew_photo($1)`, [AV.ph1]);
  ok(showPhoto && showPhoto.mime === 'image/jpeg' && showPhoto.w === 1280 && showPhoto.h === 960 && !showPhoto.b64.includes('\n') && Buffer.compare(Buffer.from(showPhoto.b64, 'base64'), raw1) === 0,
     'another crew member gets the photo back byte for byte (base64, no line breaks), with its size');
  const bigBack = await call('zz_ben', `select public.crew_photo($1)`, [AV.big]);
  ok(Buffer.compare(Buffer.from(bigBack.b64, 'base64'), big) === 0 && bigBack.b64.length === 600000, 'the 450 000-byte photo comes back whole');
  ok((await call('zz_ava', `select public.crew_photo($1)`, [AV.ph1])) !== null, 'the author gets their own photo');
  ok((await call('zz_dee', `select public.crew_photo($1)`, [AV.text])) === null, 'a post with no photo answers null');
  const amirPh = await coachCall(`select public.coach_crew_post($1, $2, 900, 600)`, ['A photo from the club.', jpg(800, 9).toString('base64')]);
  ok((await call('zz_dee', `select public.crew_photo($1)`, [amirPh.id])) !== null, 'Amir\'s photo can be fetched by the crew');
  ok((await coachCall(`select public.crew_photo($1)`, [AV.ph1])) !== null, 'the coach can fetch any photo');
  await q(`insert into public.crew_posts (id, athlete_id, body, has_photo) values ('99999999-9999-4999-8999-999999999999', 'zz_ghost', 'hidden', true)`);
  await q(`insert into public.crew_photos (post_id, athlete_id, bytes) values ('99999999-9999-4999-8999-999999999999', 'zz_ghost', $1)`, [jpg(200, 1)]);
  ok((await call('zz_dee', `select public.crew_photo('99999999-9999-4999-8999-999999999999')`)) === null, 'the photo of someone who is not in the crew is not served (null)');
  await q(`delete from public.crew_posts where id = '99999999-9999-4999-8999-999999999999'`);
  await q(`update public.crew_posts set created_at = now() - interval '8 days' where id = $1`, [AV.dirty]);
  await q(`insert into public.crew_photos (post_id, athlete_id, bytes) values ($1, 'zz_ava', $2)`, [AV.dirty, jpg(200, 3)]);
  ok((await call('zz_dee', `select public.crew_photo($1)`, [AV.dirty])) === null, 'a photo whose post is past 7 days is not served, even before the sweep has run');
  await q(`delete from public.crew_posts where id = $1`, [AV.dirty]);
  ok((await call('zz_dee', `select public.crew_photo('11111111-2222-4333-8444-555555555555')`)) === null, 'a post that does not exist answers null');

  // ═══ 8 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section("8. the coach's side");
  for (const [what, sql] of [['coach_crew()', `select public.coach_crew()`], ['coach_crew_post()', `select public.coach_crew_post('x')`],
                             ['coach_crew_remove()', `select public.coach_crew_remove(gen_random_uuid())`], ['coach_crew_under13()', `select public.coach_crew_under13('zz_ava', true)`]])
    await refuses(`${what} is refused to an athlete: coach only`, call('zz_ava', sql), /coach only/);
  ok((await as('zz_ava', () => val(`select count(*)::int from public.crew_consent`))) === 0 && (await asCoach(() => val(`select count(*)::int from public.crew_consent`))) === (await cnt('crew_consent')),
     'row-level security: the coach reads every answer (the backup needs that) and an athlete reading the table sees none');
  const cc = await coachCall(`select public.coach_crew()`);
  ok(cc.posts.length === (await cnt('crew_posts')) && cc.people.length === (await cnt('crew_consent')), 'coach_crew() lists every post and every consent row', [cc.posts.length, cc.people.length]);
  const ccAva = cc.posts.find(p => p.id === AV.text), ccGhost = cc.posts.find(p => p.athlete_id === 'zz_ghost'), ccAmir = cc.posts.find(p => p.id === amir.id);
  ok(ccAva.athlete_id === 'zz_ava' && ccAva.who === 'Ava the Ace' && ccAva.seen === true && ccAva.kudos === 3 && ccGhost.seen === false && ccAmir.amir === true && ccAmir.who === 'Amir',
     'a post carries its author\'s id (for Remove), whether the crew sees it and its kudos; Amir\'s is marked', { ccAva, ccGhost });
  const swRow = cc.people.find(p => p.athlete_id === 'zz_hw3'), noxRow = cc.people.find(p => p.athlete_id === 'zz_nox');
  ok(noxRow.answer === 'no' && eq(swRow.kinds_off, ['mark']) && typeof cc.rings_week === 'number', 'a person row says the answer and the kinds switched off; the week\'s rings are counted', { noxRow, swRow });
  // Amir's own posts: no daily cap
  const amirIds = [];
  for (let i = 0; i < 11; i++) amirIds.push((await coachCall(`select public.coach_crew_post($1)`, [`Amir post ${i + 1}`])).id);
  ok((await cnt('crew_posts', `athlete_id = '__coach__'`)) >= 13, 'Amir\'s own posts have no daily cap (11 more went in)');
  await refuses('Amir\'s post is checked like any: 281 characters are refused', coachCall(`select public.coach_crew_post($1)`, ['y'.repeat(281)]), /crew:too_long/);
  ok((await coachCall(`select public.coach_crew_remove($1)`, [amirIds[0]])) === true && (await coachCall(`select public.coach_crew_remove($1)`, [amirIds[0]])) === false, 'coach_crew_remove() deletes a post (true), and says false when it is already gone');
  for (const id of amirIds.slice(1)) await coachCall(`select public.coach_crew_remove($1)`, [id]);
  const calPost = await val(`select id::text from public.crew_posts where athlete_id = 'zz_cal' and has_photo limit 1`);
  const calKudos = await kudos('zz_dee', calPost);
  ok((await coachCall(`select public.coach_crew_remove($1)`, [calPost])) === true && !(await cnt('crew_photos', `post_id = $1`, [calPost])) && !(await cnt('crew_kudos', `post_id = $1`, [calPost])) && calKudos.n === 1,
     'the coach can remove an athlete\'s post; its photo and kudos go with it');
  ok((await call('zz_ben', `select public.crew_delete_post($1)`, [AV.plain])) === false && (await cnt('crew_posts', `id = $1`, [AV.plain])) === 1, 'an athlete cannot delete another\'s post (false, nothing removed)');
  ok((await call('zz_ava', `select public.crew_delete_post($1)`, [AV.plain])) === true && !(await cnt('crew_posts', `id = $1`, [AV.plain])), 'an author deletes their own post');
  // under 13
  const kidPost = (await q(`insert into public.crew_posts (athlete_id, body) values ('zz_kid', 'before the tick') returning id`)).rows[0].id;
  await q(`insert into public.crew_kudos (athlete_id, post_id) values ('zz_kid', $1)`, [P]);
  await q(`insert into public.crew_rings (athlete_id, kind, ref, value) values ('zz_kid', 'level', '3', '{"n": 3}')`);
  ok((await coachCall(`select public.coach_crew_under13('zz_kid', true)`)) === true, 'ticking under 13 answers true');
  ok(!(await cnt('crew_posts', `athlete_id = 'zz_kid'`)) && !(await cnt('crew_kudos', `athlete_id = 'zz_kid'`)) && !(await cnt('crew_rings', `athlete_id = 'zz_kid'`)) && (await cnt('crew_consent', `athlete_id = 'zz_kid' and under13 and answer = 'yes'`)) === 1,
     'for an athlete who had said yes it removes their posts, the kudos they gave and their rings at once, and keeps their answer');
  await refuses('and they can no longer post: crew:not_yes', post('zz_kid', 'hi'), /crew:not_yes/);
  const kidMe = (await bellAs('zz_kid')).me;
  ok(kidMe.under13 === true && kidMe.can_post === false, 'their me says under13 and cannot post', kidMe);
  ok((await coachCall(`select public.coach_crew_under13('zz_kid', false)`)) === false && (await post('zz_kid', 'Back in.')).id, 'unticking lets them post again (their yes stayed)');
  await q(`delete from public.crew_posts where athlete_id = 'zz_kid'`);
  await coachCall(`select public.coach_crew_under13('zz_new', true)`);
  const newRow = await one(`select answer, under13 from public.crew_consent where athlete_id = 'zz_new'`);
  ok(newRow.answer === null && newRow.under13 === true, 'for an athlete who never answered it makes a row with no answer and the tick', newRow);
  const newYes = await answer('zz_new', 'yes');
  ok(newYes.answer === 'yes' && newYes.under13 === true && newYes.can_post === false, 'if they then answer yes the tick stays and they still cannot post', newYes);
  await refuses('and cannot give kudos either: crew:not_yes', kudos('zz_new', P), /crew:not_yes/);
  await refuses('an unknown athlete id is refused: crew:who', coachCall(`select public.coach_crew_under13('zz_nobody', true)`), /crew:who/);
  await refuses('a blank athlete id is refused: crew:who', coachCall(`select public.coach_crew_under13('  ', true)`), /crew:who/);
  await refuses('a null tick is refused: crew:who', coachCall(`select public.coach_crew_under13('zz_kid', null)`), /crew:who/);

  // ═══ 9 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('9. the erasure');
  await answer('zz_era', 'yes'); await answer('zz_fan', 'yes');
  const eraTxt = (await post('zz_era', 'My text post.')).id;
  const eraPh = (await post('zz_era', 'My photo post.', jpg(500, 14).toString('base64'), 800, 600)).id;
  await fact('zz_era', 'personal_best', 'e|1', 0, { lift: 'Era Lift', kg: 50 });
  await q(`insert into public.career_scores (athlete_id, stamp, score) values ('zz_era', 's', '{"career": {"level": 2}}')`); await score('zz_era', 3);
  const eraKey = lineOf(await view(), 'Ern E.').key;
  await soft(kudos('zz_era', P)); await soft(kudos('zz_era', `${avaKey}:${today}`));
  await soft(kudos('zz_fan', eraTxt)); await soft(kudos('zz_fan', eraKey));
  const counts = async () => Object.fromEntries(await Promise.all(TABLES.map(async t => [t, await cnt(t)])));
  const era = async () => ({ posts: await cnt('crew_posts', `athlete_id = 'zz_era'`), photos: await cnt('crew_photos', `athlete_id = 'zz_era'`), given: await cnt('crew_kudos', `athlete_id = 'zz_era'`),
    toThem: await cnt('crew_kudos', `to_athlete = 'zz_era'`), onPosts: await cnt('crew_kudos', `post_id in (select id from public.crew_posts where athlete_id = 'zz_era')`),
    rings: await cnt('crew_rings', `athlete_id = 'zz_era'`), consent: await cnt('crew_consent', `athlete_id = 'zz_era'`) });
  const avaPosts0 = await cnt('crew_posts', `athlete_id = 'zz_ava'`);
  const e0 = await era();
  ok(eq(e0, { posts: 2, photos: 1, given: 2, toThem: 1, onPosts: 1, rings: 1, consent: 1 }), 'before the erasure: two posts, a photo, kudos given and received (on a post and on a line), a ring and an answer', e0);
  const all0 = await counts();
  const dry = await coachCall(`select public.coach_erase_person('athlete', 'zz_era', 'zz_era', '{}'::uuid[], true)`);
  ok(dry.ok && dry.dry_run === true && dry.counts.crew_posts === 2 && dry.counts.crew_photos === 1 && dry.counts.crew_kudos === 2 && dry.counts.crew_rings === 1 && dry.counts.crew_consent === 1 && dry.counts['crew_kudos (to them)'] === 1,
     'a dry run counts every crew table, including "crew_kudos (to them)"', dry.counts);
  ok(eq(await counts(), all0) && eq(await era(), e0), 'and leaves everything as it was');
  const real = await coachCall(`select public.coach_erase_person('athlete', 'zz_era', 'zz_era', '{}'::uuid[], false)`);
  ok(real.ok && real.dry_run === false && real.counts['crew_kudos (to them)'] === 1, 'the real erasure reports the same counts', real.counts);
  const e1 = await era();
  ok(eq(e1, { posts: 0, photos: 0, given: 0, toThem: 0, onPosts: 0, rings: 0, consent: 0 }), 'afterwards no crew table holds anything of them: posts, photos, kudos given, kudos to their lines and on their posts, rings, answer', e1);
  ok(!(await cnt('crew_kudos', `athlete_id = 'zz_fan'`)) && (await cnt('crew_posts', `athlete_id = 'zz_ava'`)) === avaPosts0 && (await cnt('crew_consent', `athlete_id = 'zz_fan'`)) === 1,
     'what belongs to others stays: the kudos Fay gave them went with their post and line; Ava\'s posts and Fay\'s answer are untouched');
  ok((await cnt('erasure_log', `counts ->> 'crew_posts' = '2'`)) === 1, 'the receipt keeps the counts of the crew tables, not their content');
  ok(!(await val(`select count(*)::int from auth.users where email like 'athlete.zz_era@%'`)), 'their login went with them');

  // ═══ 10 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('10. nothing else moved');
  const H1 = {}; for (const t of ['career_facts', 'career_awards', 'career_rules', 'career_catalogue', 'career_scores', 'career_honours']) H1[t] = await hashOf(t);
  for (const id of ['zz_ava', 'zz_ben', 'zz_cal', 'zz_dee', 'zz_eve']) { await bellAs(id); }
  await view('zz_ava'); await coachCall(`select public.get_bell()`); await coachCall(`select public.coach_crew()`); await val(`select public.get_bell('zz_ava')`);
  await call('zz_dee', `select public.crew_photo($1)`, [AV.big]); await coachCall(`select public.crew_photo($1)`, [AV.big]);
  for (const t of Object.keys(H1)) ok((await hashOf(t)) === H1[t], `${t} is the same after every kind of read`);
  ok((await hashOf('career_rules')) === H0.career_rules, 'career_rules is exactly as before stage81');
  ok(!(await cnt('career_facts', `source <> 'server'`)), 'no fact of another source appeared');

  // ═══ 11 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('11. the way back, then stage81 again');
  const consentRows = await cnt('crew_consent');
  const back = read(opt('--rollback') || path.join(ROOT, 'scripts', 'career', 'rollback_stage81.sql'));
  await runSql(db, back, 'rollback'); await runSql(db, back, 'rollback again');
  ok(true, 'the way back runs, and runs a second time without an error');
  ok(!(await val(`select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname like 'crew\\_%'`)), 'no crew table is left');
  ok(!(await val(`select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and (p.proname like 'crew\\_%' or p.proname = 'get_bell' or p.proname like 'coach\\_crew%')`)), 'no crew function is left (get_bell included)');
  ok(!(await val(`select count(*)::int from pg_trigger where tgname = 'crew_level_ring'`)), 'and the level trigger is gone');
  ok((await eraseDef(db)) === erase0, 'coach_erase_person() is exactly as it was before stage81');
  const dryAfter = await soft(coachCall(`select public.coach_erase_person('athlete', 'zz_ben', 'zz_ben', '{}'::uuid[], true)`));
  ok(dryAfter.ok === true, 'an erasure still works after the way back (a dry run on a made-up athlete: no statement is left that names a dropped table)', dryAfter.error || dryAfter);
  const bk = await val(`select to_regclass('backup.crew_consent_' || to_char(current_date, 'YYYYMMDD'))::text`);
  ok(bk && (await val(`select count(*)::int from ${bk}`)) === consentRows && consentRows > 5, `the answers are copied to ${bk} first (${consentRows} rows), and the second run did not lose them`);
  const saved = await soft(q(`update public.career_scores set score = jsonb_set(score, '{career,level}', '99') where athlete_id = 'zz_lvl'`));
  ok(!saved.error, 'a score can still be saved with the trigger gone', saved.error);
  for (const t of ['career_facts', 'career_awards', 'career_rules', 'career_catalogue']) ok((await hashOf(t)) === (H1[t] || H0[t]), `${t} is untouched by the way back`);
  await runSql(db, stage, 'stage81 after the way back');
  ok(await val(`select to_regclass('public.crew_posts')::text`) && await val(`select to_regprocedure('public.get_bell(text)')::text`), 'stage81 goes on again after the way back');
  ok((await eraseDef(db)) === erase1, 'and patches coach_erase_person() to exactly the same text as the first time');
  ok(!(await cnt('crew_consent')) && (await bellAs('zz_ava')).me.answer === null, 'the tables are empty again: nothing of the old crew survives the way back');

  // ═══ 12 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('12. the cost');
  await answer('zz_ava', 'yes');
  await q(`insert into public.crew_consent (athlete_id, answer, name, answered_at, first_yes_at, yes_since)
           select 'zz_p' || lpad(i::text, 2, '0'), 'yes', 'Pro ' || i, now() - interval '3 days', now() - interval '3 days', now() - interval '3 days' from generate_series(1, 30) i`);
  await q(`insert into public.crew_posts (athlete_id, body, has_photo, created_at)
           select 'zz_p' || lpad(i::text, 2, '0'), 'Post ' || j || ' from ' || i, j = 1, now() - ((i * j * 15) || ' minutes')::interval from generate_series(1, 30) i, generate_series(1, 5) j`);
  await q(`insert into public.crew_photos (post_id, athlete_id, w, h, bytes) select p.id, p.athlete_id, 1280, 960, decode('ffd8ffe0' || repeat('07', 20000), 'hex') from public.crew_posts p where p.has_photo`);
  await q(`insert into public.crew_kudos (athlete_id, post_id)
           select 'zz_p' || lpad((((substring(p.athlete_id from 5))::int % 30) + 1)::text, 2, '0'), p.id from public.crew_posts p where p.athlete_id ~ '^zz_p[0-9]{2}$'`);
  await q(`insert into public.career_facts (athlete_id, kind, ref, day, value, source, created_at, updated_at)
           select 'zz_p' || lpad(i::text, 2, '0'), 'week_held', 'c1|w' || j, current_date - (j * 7 - 2), '{}', 'server', now() - ((j * 7 - 2) || ' days')::interval, now() from generate_series(1, 30) i, generate_series(1, 4) j`);
  await q(`insert into public.career_facts (athlete_id, kind, ref, day, value, source, created_at, updated_at)
           select 'zz_p' || lpad(i::text, 2, '0'), 'personal_best', 'b|' || j, current_date - j, jsonb_build_object('lift', 'Lift ' || j, 'kg', 100 + j), 'server', now() - (j || ' days')::interval, now() from generate_series(1, 30) i, generate_series(1, 4) j`);
  await q(`insert into public.career_facts (athlete_id, kind, ref, day, value, source) select 'zz_p' || lpad(i::text, 2, '0'), 'cycle_finished', 'c1', current_date, '{"cycle": 1}', 'server' from generate_series(1, 30) i`);
  await q(`insert into public.career_awards (athlete_id, award_id, kind, item, tier, day, pays, xp, size, meaning, evidence, how, rules_version, created_at)
           select 'zz_p' || lpad(i::text, 2, '0'), 'achievement:a' || j, 'achievement', 'a' || j, null, current_date, true, 0, 'highlight', 'commitment', '{}', 'live', 5, now() - (j || ' hours')::interval from generate_series(1, 30) i, generate_series(1, 2) j`);
  await q(`insert into public.crew_rings (athlete_id, kind, ref, value) select 'zz_p' || lpad(i::text, 2, '0'), 'level', '6', '{"n": 6}' from generate_series(1, 30) i`);
  await q(`insert into public.career_honours (month, honour, athlete_id, value) select (date_trunc('month', current_date) - interval '1 month')::date, 'sessions', 'zz_p' || lpad(i::text, 2, '0'), '{}' from generate_series(1, 30) i`);
  const facts = await cnt('career_facts'), nPosts = await cnt('crew_posts');
  info(`${await cnt('crew_consent', `athlete_id like 'zz_p%'`)} crew members, ${nPosts} posts (30 with a photo of 20 KB), ${facts} facts, ${await cnt('career_awards')} awards, ${await cnt('crew_kudos')} kudos`);
  const times = [];
  let bigBell;
  for (let i = 0; i < 4; i++) { const t = performance.now(); bigBell = await bellAs('zz_ava'); times.push(Math.round(performance.now() - t)); }
  const warm = times.slice(1);
  info(`get_bell() for a viewer: ${times.join(', ')} ms (first cold, then warm); ${bigBell.items.filter(i => i.t === 'post').length} posts and ${bigBell.items.filter(i => i.t === 'line').length} lines come back, ${JSON.stringify(bigBell).length} bytes`);
  ok(Math.max(...warm) < 1500, `get_bell() answers in under 1.5 s with 30 crew members (slowest warm run ${Math.max(...warm)} ms)`, times);
  ok(bigBell.items.filter(i => i.t === 'post').length === 80, 'the feed holds at most 80 posts (150 are in the tables)');
  await q(`insert into public.crew_posts (athlete_id, body, created_at) values ('__coach__', 'Amir, 23 hours ago', now() - interval '23 hours')`);
  const newer = await cnt('crew_posts', `created_at > now() - interval '23 hours' and athlete_id <> '__coach__'`);
  const bPin = await bellAs('zz_ava');
  info(`Amir's post is 23 hours old (pinned for 24) and ${newer} newer posts exist: it is ${bPin.items.some(i => i.amir) ? 'in the feed' : 'NOT in the feed (the 80-post limit is applied by time before the pin: see the report)'}`);
  const tc = performance.now(); await coachCall(`select public.coach_crew()`); const tcc = Math.round(performance.now() - tc);
  info(`coach_crew(): ${tcc} ms`);
  ok(tcc < 1500, `coach_crew() answers in under 1.5 s (${tcc} ms)`);
  const tp = performance.now(); await call('zz_ava', `select public.crew_photo($1)`, [(await val(`select post_id::text from public.crew_photos limit 1`))]); const tpp = Math.round(performance.now() - tp);
  ok(tpp < 500, `one photo is served in under 0.5 s (${tpp} ms)`);

  // ═══ 13 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('13. line endings: the apply and the way back may come from files that end their lines differently');
  info('coach_erase_person() is patched, and un-patched, by finding a piece of text that spans lines; that text is typed in both files, and a checkout on Windows ends lines with CRLF');
  const crlf = t => t.replace(/\r?\n/g, '\r\n'), lf = t => t.replace(/\r\n/g, '\n');
  const standIn = read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql'));
  for (const [what, st, bk] of [['stage81 from a CRLF file, the way back from an LF file', crlf(stage), lf(back)],
                                ['stage81 from an LF file, the way back from a CRLF file', lf(stage), crlf(back)],
                                ['both from CRLF files', crlf(stage), crlf(back)]]) {
    const d2 = await openDb();
    await runSql(d2, standIn, 'stand-in'); await runSql(d2, snap.sql, 'snapshot');
    await d2.exec(`insert into public.programs (athlete_id, data) values ('zz_le', '{}')`);
    const e0 = await eraseDef(d2);
    await runSql(d2, st, 'stage81'); await runSql(d2, bk, 'the way back');
    const e1 = await eraseDef(d2);
    let dry;
    try { await d2.exec(`select set_config('request.jwt.claims', '${JSON.stringify(COACH)}', false)`); dry = (await d2.query(`select public.coach_erase_person('athlete', 'zz_le', 'zz_le', '{}'::uuid[], true) as r`)).rows[0].r; }
    catch (e) { dry = { error: String(e.message || e) }; }
    ok(e1 === e0 && dry.ok === true, `${what}: coach_erase_person() is back to what it was and an erasure works`, dry.error || (e1 === e0 ? dry : 'the definition differs'));
  }

  // ═══ 14 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('14. stage82: the emoji beside the Like (Amir, 2026-10-19: "all five out", and hearty eyes in place of the racket)');
  const st82 = read(opt('--stage82') || path.join(ROOT, 'supabase', 'stage82_crew_emoji.sql'));
  const back82 = read(opt('--rollback82') || path.join(ROOT, 'scripts', 'career', 'rollback_stage82.sql'));
  await mkAthlete('zz_emo', 'Emo', 'Tester');
  await mkAthlete('zz_emt', 'Emt', 'Tester');
  await member('zz_emo', 'Emo T.');
  await member('zz_emt', 'Emt T.');
  const emPost = await post('zz_emo', 'React to this one.');
  const likeBefore = await kudos('zz_emt', emPost.id, true);          // a plain Like, written by stage81's two-argument form
  ok(likeBefore.n === 1 && likeBefore.mine === true, 'before stage82: a plain Like is one reaction');
  const bell81 = await bellAs('zz_emt');
  ok(bell81.emoji === undefined, "before stage82 get_bell() hands the app no emoji list, so the app draws the Like alone");

  await runSql(db, st82, 'stage82'); await runSql(db, st82, 'stage82 again');
  ok(true, 'stage82 applied, and applied again without an error');
  ok((await val(`select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'crew_kudos' and column_name = 'emoji'`)) === 1,
     'crew_kudos has the emoji column');
  ok(eq(await val(`select public.crew_emoji_list()`), ['🔥', '💪', '👏', '😍']), 'the set is 🔥 💪 👏 😍, in the order the card draws them');
  ok((await val(`select to_regprocedure('public.crew_kudos(text,boolean)')::text`)) === null
     && (await val(`select to_regprocedure('public.crew_kudos(text,boolean,text)')::text`)) !== null,
     'the two-argument crew_kudos() is gone and the three-argument one is there');
  ok(!(await val(`select has_function_privilege('anon', 'public.crew_kudos(text,boolean,text)', 'execute')`))
     && (await val(`select has_function_privilege('authenticated', 'public.crew_kudos(text,boolean,text)', 'execute')`))
     && !(await val(`select has_function_privilege('authenticated', 'public.crew_emoji_list()', 'execute')`)),
     'anon cannot send one, a signed-in athlete can, and the list is the service role\'s');

  const kept = await val(`select public.crew_kudos_of($1, null, null, 'zz_emt')`, [emPost.id]);
  ok(kept.n === 1 && kept.like === 1 && kept.emoji === null && eq(kept.by, {}) && kept.mine === true,
     'a Like written before stage82 is still a Like: emoji null, counted under "like"', kept);
  const bell82 = await bellAs('zz_emt');
  ok(eq(bell82.emoji, ['🔥', '💪', '👏', '😍']), 'get_bell() now hands the app the list, which is how it knows it may draw them');

  const fire = await call('zz_emt', `select public.crew_kudos($1, true, '🔥')`, [emPost.id]);
  ok(fire.n === 1 && fire.like === 0 && fire.emoji === '🔥' && eq(fire.by, { '🔥': 1 }),
     'sending an emoji SWAPS the Like in place: still one reaction, now counted under its emoji', fire);
  const flex = await call('zz_emt', `select public.crew_kudos($1, true, '💪')`, [emPost.id]);
  ok(flex.n === 1 && flex.emoji === '💪' && eq(flex.by, { '💪': 1 }), 'sending a different one swaps again, never adds a second', flex);
  ok((await cnt('crew_kudos', `post_id = $1`, [emPost.id])) === 1, 'one row per person per post, as before');
  const gone = await call('zz_emt', `select public.crew_kudos($1, false)`, [emPost.id]);
  ok(gone.n === 0 && gone.emoji === null && eq(gone.by, {}), 'taking it back removes it, whatever it was', gone);
  await call('zz_emt', `select public.crew_kudos($1, true, '😍')`, [emPost.id]);
  const plainAgain = await call('zz_emt', `select public.crew_kudos($1, true)`, [emPost.id]);
  ok(plainAgain.n === 1 && plainAgain.like === 1 && plainAgain.emoji === null && eq(plainAgain.by, {}), 'sending the plain Like again swaps the emoji off', plainAgain);
  await refuses('an emoji that is not on the list is refused', call('zz_emt', `select public.crew_kudos($1, true, '🥇')`, [emPost.id]), /crew:emoji/);
  await refuses('…and so is a word', call('zz_emt', `select public.crew_kudos($1, true, 'nice')`, [emPost.id]), /crew:emoji/);
  await refuses('their own post still refuses, emoji or not', call('zz_emo', `select public.crew_kudos($1, true, '🔥')`, [emPost.id]), /crew:own/);

  // several people, so the counts and the names are real
  await mkAthlete('zz_em3', 'Emth', 'Ree'); await member('zz_em3', 'Emth R.');
  await call('zz_emt', `select public.crew_kudos($1, true, '🔥')`, [emPost.id]);
  await sleep(5);
  await call('zz_em3', `select public.crew_kudos($1, true, '🔥')`, [emPost.id]);
  const many = await val(`select public.crew_kudos_of($1, null, null, 'zz_emt')`, [emPost.id]);
  ok(many.n === 2 && eq(many.by, { '🔥': 2 }) && many.like === 0 && eq(many.names, ['Emth R.']) && many.emoji === '🔥',
     'two of the same emoji count together, and the names still leave the viewer out', many);
  const seen = await val(`select public.crew_kudos_of($1, null, null, 'zz_emo')`, [emPost.id]);
  ok(seen.mine === false && seen.emoji === null && seen.n === 2 && eq(seen.names.slice().sort(), ['Emt T.', 'Emth R.']),
     'the author sees both, as somebody who sent none', seen);

  // a Bell line takes one too
  await fact('zz_emo', 'week_held', 'c9|w1', 0, { cycle: 9, week: 1 });
  const emLine = lineOf(await view('zz_emt'), 'Emo T.');
  const lineEm = await call('zz_emt', `select public.crew_kudos($1, true, '👏')`, [emLine.key]);
  ok(lineEm.n === 1 && lineEm.emoji === '👏' && eq(lineEm.by, { '👏': 1 }), 'a Bell line takes an emoji the same way', lineEm);
  const feed82 = await view('zz_emt');
  ok(lineOf(feed82, 'Emo T.').kudos.emoji === '👏' && postsOf(feed82, 'Emo T.')[0].kudos.by['🔥'] === 2,
     'the feed carries them: the viewer\'s own on the line, the counts on the post');

  info('the way back, then stage82 again');
  const emojiRows = await cnt('crew_kudos', `emoji is not null`);
  await runSql(db, back82, 'the way back from stage82');
  ok((await val(`select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'crew_kudos' and column_name = 'emoji'`)) === 0
     && (await val(`select to_regprocedure('public.crew_emoji_list()')::text`)) === null,
     'the way back takes the column and the list off');
  const afterBack = await val(`select public.crew_kudos_of($1, null, null, 'zz_emt')`, [emPost.id]);
  ok(afterBack.n === 2 && afterBack.mine === true && afterBack.by === undefined,
     `every reaction survives as a plain Like (${emojiRows} carried an emoji), and the answer is stage81's shape again`, afterBack);
  ok(((await bellAs('zz_emt')).emoji) === undefined, 'get_bell() stops handing out the list, so an updated app draws the Like alone');
  ok((await val(`select to_regprocedure('public.crew_kudos(text,boolean)')::text`)) !== null, 'the two-argument crew_kudos() is back');
  ok((await kudos('zz_emt', emPost.id, false)).n === 1, 'and it still works');
  await runSql(db, st82, 'stage82 after the way back');
  ok((await val(`select public.crew_emoji_list()`)) !== null, 'stage82 goes on again after it');

  // ═══ 15 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('15. stage83: the feed only when it has changed (Amir, 2026-10-19: "irans internet is very slow")');
  const st83 = read(opt('--stage83') || path.join(ROOT, 'supabase', 'stage83_crew_if_new.sql'));
  const back83 = read(opt('--rollback83') || path.join(ROOT, 'scripts', 'career', 'rollback_stage83.sql'));
  await runSql(db, st83, 'stage83'); await runSql(db, st83, 'stage83 again');
  ok(true, 'stage83 applied, and applied again without an error');
  ok(!(await val(`select has_function_privilege('anon', 'public.get_bell_if_new(text,text)', 'execute')`))
     && (await val(`select has_function_privilege('authenticated', 'public.get_bell_if_new(text,text)', 'execute')`)),
     'anon cannot ask for it; a signed-in athlete can');
  const first = await call('zz_emt', `select public.get_bell_if_new($1)`, ['zz_emt']);
  ok(first && first.etag && first.items !== undefined && first.same === undefined, 'with no hash it sends the feed, and the hash with it');
  const again = await call('zz_emt', `select public.get_bell_if_new($1, $2)`, ['zz_emt', first.etag]);
  ok(again.same === true && again.etag === first.etag && again.items === undefined, 'with the same hash it sends "same" and no feed', again);
  info(`the feed is ${JSON.stringify(first).length} bytes, "same" is ${JSON.stringify(again).length}`);
  ok(JSON.stringify(again).length < JSON.stringify(first).length / 4, 'and "same" is a small fraction of the feed');
  const wrong = await call('zz_emt', `select public.get_bell_if_new($1, 'not-the-hash')`, ['zz_emt']);
  ok(wrong.same === undefined && wrong.etag === first.etag, 'an old or wrong hash sends the feed');
  ok((await call('zz_emt', `select public.get_bell_if_new($1, $2)`, ['zz_emt', first.etag])).same === true,
     'the clock alone does not change the hash: a second call over an unchanged crew is still "same"');
  // every way the feed can change must change the hash
  const emPost2 = await post('zz_emo', 'Something new to see.');
  const afterPost = await call('zz_emt', `select public.get_bell_if_new($1, $2)`, ['zz_emt', first.etag]);
  ok(afterPost.same === undefined && afterPost.etag !== first.etag, 'a new post changes the hash, so the phone is sent the feed');
  const tag2 = afterPost.etag;
  await call('zz_emt', `select public.crew_kudos($1, true, '👏')`, [emPost2.id]);
  const afterLike = await call('zz_emt', `select public.get_bell_if_new($1, $2)`, ['zz_emt', tag2]);
  ok(afterLike.same === undefined && afterLike.etag !== tag2, 'a reaction changes it too');
  const tag3 = afterLike.etag;
  await call('zz_emo', `select public.crew_delete_post($1)`, [emPost2.id]);
  const afterDel = await call('zz_emt', `select public.get_bell_if_new($1, $2)`, ['zz_emt', tag3]);
  ok(afterDel.same === undefined && afterDel.etag !== tag3, 'and so does a post that was REMOVED: nothing stale can sit on a phone');
  // it is still the same answer as get_bell, and it still refuses what get_bell refuses
  const plain = await call('zz_emt', `select public.get_bell($1)`, ['zz_emt']);
  const viaNew = await call('zz_emt', `select public.get_bell_if_new($1)`, ['zz_emt']);
  ok(eq(plain.items, viaNew.items) && eq(plain.me, viaNew.me) && eq(plain.honours, viaNew.honours),
     'the feed it sends is get_bell()\'s own, word for word');
  await refuses('it refuses another athlete, as get_bell() does', call('zz_emt', `select public.get_bell_if_new($1)`, ['zz_emo']), /not your bell/);
  await refuses('and refuses a caller who is not signed in', asNobody(() => val(`select public.get_bell_if_new('zz_emt')`)), /not signed in|not your bell/);
  ok((await coachCall(`select public.get_bell_if_new($1)`, ['zz_emt'])).items !== undefined, 'the coach can read it as anyone, as before');
  info('the way back, then stage83 again');
  await runSql(db, back83, 'the way back from stage83');
  ok((await val(`select to_regprocedure('public.get_bell_if_new(text,text)')::text`)) === null, 'the way back drops it');
  ok((await bellAs('zz_emt')).items !== undefined, 'get_bell() is untouched, so the app simply asks for that again');
  await runSql(db, st83, 'stage83 after the way back');
  ok((await call('zz_emt', `select public.get_bell_if_new($1)`, ['zz_emt'])).etag !== null, 'stage83 goes on again after it');

  console.log(`\n${failed ? 'FAIL' : 'OK'}: ${passed} passed, ${failed} failed (${Math.round((Date.now() - t0) / 1000)} s)`);
  if (failed) fails.forEach(f => console.log('  - ' + f));
  process.exitCode = failed ? 1 : 0;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
