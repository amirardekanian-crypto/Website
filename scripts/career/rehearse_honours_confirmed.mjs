// Rehearses supabase/stage104_honours_confirmed.sql (the month's honours reach an athlete only when Amir confirms them) on PGlite. Nothing live,
// no real athlete: every id here is made up.
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/career/rehearse_honours_confirmed.mjs
//
// The structure BEFORE stage104 (supabase/schema_snapshot.sql: it holds stage100, not stage104), a month already frozen the old way (its rows are live
// for the athletes), then:
//   1. stage104 twice: the old month's rows are back-filled as confirmed and every athlete-facing reader still shows them (get_my_moments, crew_page,
//      get_bell's honour line, the month's band and the Pick card); a second run changes nothing and does not confirm a suggestion;
//   2. the freeze on the 8th writes SUGGESTIONS: coach_honours() shows them, no athlete reader does, nothing is queued for a push;
//   3. Confirm: the honour becomes visible to the winner and the crew, the Bell line is dated by the confirmation, one push is queued per winner,
//      a second tap with the same winners changes nothing, a different list is refused;
//   4. Change: another athlete replaces the suggested winner, who never sees it; the figure is recomputed for the new one;
//      Full Month takes a list; an athlete with no figure, the demo and a former athlete are refused;
//   5. the Pick: confirmed by the picking, still works with its reason (coach_honours_why), the Pick card still shows;
//   6. who can call what, and the last day of the month (career_honours_open);
//   7. the way back (scripts/career/rollback_stage104.sql) puts every patched function back EXACTLY, then stage104 again.
// The numbers behind a suggestion (career_honours_live, career_honour_figure) are stood in for by a small table: how they are worked out is
// stage75's and is rehearsed in rehearse_courtside.mjs. This file proves who SEES what and when.
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT } from './rehearse_lib.mjs';

let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => { if (c) { passed++; console.log('  ok   ' + what); } else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 500) : '')); } };
const section = s => console.log('\n' + s);
const info = s => console.log('  ·    ' + s);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const COACH = { email: 'amirardekanian@gmail.com', role: 'authenticated' };

const PATCHED = ['get_my_moments(text)', 'crew_page(uuid,text)', 'get_bell(text)', 'coach_honours(date,text[])', 'coach_honours_freeze(date,text[])', 'coach_honours_pick(date,text,text[])'];

async function main() {
  const t0 = Date.now();
  const db = await openDb();
  const q = (sql, p) => db.query(sql, p || []);
  const one = async (sql, p) => (await q(sql, p)).rows[0];
  const val = async (sql, p) => { const r = await one(sql, p); return r ? Object.values(r)[0] : null; };
  const refuses = async (what, p, re) => { let msg = null; try { await p; } catch (e) { msg = String(e.message || e); } ok(msg !== null && re.test(msg), what, msg === null ? 'it did not refuse' : msg); };
  const USER = {}; let nUser = 0;
  const withClaims = async (claims, fn) => {
    await db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(claims).replace(/'/g, "''")}', false); set role authenticated;`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
  };
  const as = (id, fn) => withClaims({ sub: USER[id], role: 'authenticated', email: `athlete.${id}@example.test` }, fn);
  const asCoach = fn => withClaims(COACH, fn);
  const call = (id, sql, p) => as(id, () => val(sql, p));
  const coachCall = (sql, p) => asCoach(() => val(sql, p));
  const defs = async () => { const o = {}; for (const f of PATCHED) o[f] = await val(`select pg_get_functiondef('public.${f}'::regprocedure)`); return o; };
  const dm = d => d.toISOString().slice(0, 10);
  const now = new Date();
  const M1 = dm(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));     // the month just gone
  const M2 = dm(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)));     // the month before: frozen the old way
  const M0 = dm(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));

  section('0. the live structure (stage100, not stage104), made-up athletes, one month frozen the old way');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  await runSql(db, read(path.join(ROOT, 'supabase', 'schema_snapshot.sql')), 'snapshot');
  await db.exec(`set timezone = 'UTC'`);
  ok(!(await val(`select column_name from information_schema.columns where table_name = 'career_honours' and column_name = 'confirmed_at'`)), 'the snapshot has no confirmed_at yet');
  ok(/stage100/.test(await val(`select pg_get_functiondef('public.get_bell(text)'::regprocedure)`)), 'get_bell() is the stage100 text');
  const ATH = [['zz_a', 'Ana'], ['zz_b', 'Bo'], ['zz_c', 'Cy'], ['zz_d', 'Di'], ['zz_e', 'Eli'], ['zz_x', 'Xan']];
  for (const [id, name] of ATH) {
    await q(`insert into public.programs (athlete_id, data) values ($1, $2::jsonb)`, [id, JSON.stringify({ athlete: { firstName: name, lastName: 'Test', id } })]);
    const u = `00000000-0000-4000-8000-${String(++nUser).padStart(12, '0')}`; USER[id] = u;
    await q(`insert into auth.users (id, email) values ($1, $2)`, [u, `athlete.${id}@example.test`]);
    await q(`insert into public.athlete_identities (user_id, athlete_id, email, linked_at) values ($1, $2, $3, now())`, [u, id, `athlete.${id}@example.test`]);
    if (id !== 'zz_x') await q(`insert into public.crew_consent (athlete_id, answer, name, under13, kinds, answered_at, first_yes_at, yes_since)
                                values ($1, 'yes', $2, false, '{}'::jsonb, now() - interval '60 days', now() - interval '60 days', now() - interval '60 days')`, [id, name]);
  }
  await q(`insert into public.athlete_status (athlete_id, status) values ('zz_x', 'former')`).catch(() => {});
  await q(`insert into public.programs (athlete_id, data) values ('zz_former', '{}'::jsonb)`);
  await q(`insert into public.athlete_status (athlete_id, status) values ('zz_former', 'former')`).catch(() => {});
  await q(`insert into public.push_subs (endpoint, athlete_id, p256dh, auth) values ('https://push.example.test/1', 'zz_e', 'k', 'a')`);   // so the crew push queue records
  // a month frozen the old way: every row was live for the athletes the moment it was written
  // (placed in LAST month first, because the Bell's band shows last month only; moved a month back before section 2)
  await q(`insert into public.career_honour_months (month, frozen_at, pick, pick_at) values ($1::date, now() - interval '40 days', 'picked', now() - interval '35 days')`, [M1]);
  await q(`insert into public.career_honours (month, honour, athlete_id, value, created_at) values
           ($1::date, 'sessions', 'zz_a', '{"n": 9}', now() - interval '40 days'),
           ($1::date, 'improved', 'zz_b', '{"lift": "Squat", "pct": 11.2}', now() - interval '40 days'),
           ($1::date, 'full_month', 'zz_c', '{"weeks": 4}', now() - interval '40 days'),
           ($1::date, 'near', 'zz_d', '{"held": 3, "weeks": 4}', now() - interval '40 days'),
           ($1::date, 'pick', 'zz_d', '{"why": "Never missed"}', now() - interval '35 days')`, [M1]);
  // the honours block of get_bell() shows only on the 1st to the 14th: a probe copy without the gate (this is a rehearsal database)
  const mkProbe = async () => {
    const def = await val(`select pg_get_functiondef('public.get_bell(text)'::regprocedure)`);
    const probe = def.replace('public.get_bell(', 'public.get_bell_probe(').replace('if extract(day from current_date) <= 14 and exists', 'if true and exists');
    if (probe === def) throw new Error('the honours gate was not found in get_bell()');
    await db.exec(`drop function if exists public.get_bell_probe(text)`); await db.exec(probe);
  };
  const crewKey = async id => val(`select crew_key::text from public.crew_consent where athlete_id = $1`, [id]);
  const momentsOf = async id => (await call(id, `select public.get_my_moments($1)`, [id])).honours;
  const pageHon = async (viewer, subj) => (await call(viewer, `select public.crew_page($1::uuid, null)`, [await crewKey(subj)])).honours;
  const bellHon = async id => (await call(id, `select public.get_bell_probe($1)`, [id])).honours;
  const bellFeed = async id => (await call(id, `select public.get_bell_probe($1)`, [id]));
  const honourParts = b => b.items.filter(i => i.t === 'line').flatMap(l => l.parts.filter(p => p.k === 'honour').map(p => ({ who: l.who, honour: p.honour, month: p.month })));
  const queued = () => val(`select count(*)::int from public.crew_push_q where kind = 'honour'`);
  await mkProbe();
  const before = await defs();
  const bHon0 = await bellHon('zz_b'), mA0 = await momentsOf('zz_a'), pD0 = await pageHon('zz_b', 'zz_d');
  ok((mA0 || []).some(h => h.honour === 'sessions') && (bHon0.rows || []).length >= 3 && (pD0 || []).some(h => h.honour === 'pick'),
     'before the stage the old month shows to its winners, in the Bell band and on the Player Page', { mA0, bHon0, pD0 });

  section('1. stage104 goes on, twice; the old month stays visible');
  const stage = read(path.join(ROOT, 'supabase', 'stage104_honours_confirmed.sql'));
  await runSql(db, stage, 'stage104'); await runSql(db, stage, 'stage104 again');
  ok(true, 'stage104 applied, and applied again without an error');
  await mkProbe();
  const after = await defs();
  ok(PATCHED.every(f => after[f] !== before[f]), 'all six functions were patched', PATCHED.filter(f => after[f] === before[f]));
  const rows2 = (await q(`select honour, confirmed_at is not null as c from public.career_honours where month = $1::date order by honour`, [M1])).rows;
  ok(rows2.filter(r => r.honour !== 'near').every(r => r.c), 'every row of the old month was back-filled as confirmed', rows2);
  const cm = await val(`select confirmed from public.career_honour_months where month = $1::date`, [M1]);
  ok(['sessions', 'improved', 'full_month'].every(h => cm[h]), 'the old month holds all three confirmations', cm);
  const mA1 = await momentsOf('zz_a');
  ok(eq(mA1, mA0) && eq(await bellHon('zz_b'), bHon0) && eq(await pageHon('zz_b', 'zz_d'), pD0), 'get_my_moments, the Bell band and the Player Page show exactly what they showed');
  const defs2 = await defs(); await runSql(db, stage, 'stage104 third');
  ok(eq(defs2, await defs()), 'a re-run leaves every patched function as it was');
  info('(the old rows were written before the stage, with the old trigger: ' + (await queued()) + ' queued then)');

  section('2. the freeze on the 8th writes suggestions, and nobody sees them');
  await q(`update public.career_honours set month = $2::date where month = $1::date`, [M1, M2]);
  await q(`update public.career_honour_months set month = $2::date where month = $1::date`, [M1, M2]);
  const mA0b = await momentsOf('zz_a'), q0 = await queued();
  // stand-ins for the numbers: a table the two functions read
  await db.exec(`create table public.zz_sugg (honour text, athlete_id text, value jsonb);
    create or replace function public.career_honours_live(p_month date, p_not_clients text[] default '{}') returns jsonb language sql stable as $f$
      select jsonb_build_object('month', date_trunc('month', p_month)::date,
        'sessions', jsonb_build_object('n', 12, 'who', coalesce((select jsonb_agg(athlete_id) from public.zz_sugg where honour = 'sessions'), '[]'::jsonb)),
        'improved', jsonb_build_object('pct', 18.2, 'who', coalesce((select jsonb_agg(jsonb_build_object('athlete_id', athlete_id, 'lift', value ->> 'lift', 'pct', (value ->> 'pct')::numeric)) from public.zz_sugg where honour = 'improved'), '[]'::jsonb)),
        'full_month', jsonb_build_object('who', coalesce((select jsonb_agg(jsonb_build_object('athlete_id', athlete_id, 'weeks', 4)) from public.zz_sugg where honour = 'full_month'), '[]'::jsonb), 'near', '[]'::jsonb),
        'shortlist', jsonb_build_array(jsonb_build_object('slot', 'weeks_held', 'athlete_id', 'zz_d', 'n', 4), jsonb_build_object('slot', 'gain', 'athlete_id', 'zz_e', 'lift', 'Squat', 'pct', 9)))
    $f$;
    create or replace function public.career_honour_figure(p_month date, p_honour text, p_athlete_id text) returns jsonb language sql stable as $f$
      select case when p_athlete_id = 'zz_nofig' then null
                  when p_honour = 'sessions' then jsonb_build_object('n', 7)
                  when p_honour = 'improved' then jsonb_build_object('lift', 'Deadlift', 'pct', 6.5)
                  else jsonb_build_object('weeks', 3) end
    $f$;`);
  await q(`insert into public.zz_sugg values ('sessions', 'zz_a', '{}'), ('improved', 'zz_b', '{"lift": "Squat", "pct": 18.2}'), ('full_month', 'zz_c', '{}'), ('full_month', 'zz_d', '{}')`);
  const h0 = await coachCall(`select public.coach_honours($1::date)`, [M1]);
  ok(h0.frozen === false && h0.live && h0.ended === true && eq(h0.confirmed, {}), 'before the freeze: the live work is there, nothing is confirmed', h0);
  const hf = await coachCall(`select public.coach_honours_freeze($1::date)`, [M1]);
  ok(hf.frozen && hf.rows.filter(r => r.honour !== 'near').length === 4 && hf.rows.every(r => r.confirmed_at === null), 'the freeze saved 4 suggestions, none confirmed', hf.rows);
  ok(hf.live && eq(hf.confirmed, {}) && hf.pick === null, 'coach_honours() still has the live work and the shortlist for the unconfirmed honours');
  ok(eq(await momentsOf('zz_a'), mA0b) && !(await momentsOf('zz_b')).some(h => h.month === M1), 'get_my_moments shows no suggestion (the winners see only the old month)');
  ok(!(await pageHon('zz_b', 'zz_a')).some(h => h.month === M1) && !(await pageHon('zz_a', 'zz_a')).some(h => h.month === M1), 'the Player Page shows no suggestion');
  const feed0 = await bellFeed('zz_e');
  ok(!(feed0.honours.rows || []).some(r => r.value && (r.value.n === 12 || r.value.lift === 'Squat' && r.value.pct === 18.2)) && !honourParts(feed0).length, 'the Bell has no honour line and its band holds only the old month');
  ok(feed0.honours.month === M1 ? (feed0.honours.rows || []).length === 0 : true, 'the band for last month is empty');
  ok(eq(await queued(), q0), 'nothing was queued for a push');
  const hf2 = await coachCall(`select public.coach_honours_freeze($1::date)`, [M1]);
  ok(hf2.rows.length === hf.rows.length && hf2.rows.every(r => r.confirmed_at === null), 'a second freeze changes nothing');

  section('3. Confirm');
  const c1 = await coachCall(`select public.coach_honour_confirm($1::date, 'sessions', array['zz_a'])`, [M1]);
  ok(c1.confirmed.sessions && !c1.confirmed.improved && c1.rows.find(r => r.honour === 'sessions').confirmed_at, 'sessions is confirmed, improved is not', c1.confirmed);
  ok(c1.rows.find(r => r.honour === 'sessions').value.n === 7, "the figure was worked out again for the winner (stand-in: 7)");
  const mA2 = await momentsOf('zz_a');
  ok(mA2.some(h => h.month === M1 && h.honour === 'sessions'), 'now zz_a sees Most sessions in her moments');
  ok((await pageHon('zz_b', 'zz_a')).some(h => h.month === M1 && h.honour === 'sessions'), 'and the Player Page shows it');
  ok(!(await momentsOf('zz_b')).some(h => h.month === M1), 'zz_b, whose improved is still a suggestion, sees nothing');
  const feed1 = await bellFeed('zz_e');
  ok(honourParts(feed1).some(p => p.who === 'Ana' && p.honour === 'sessions' && p.month === M1) && !honourParts(feed1).some(p => p.who === 'Bo'), 'the Bell has a line for Ana alone');
  const bandRows = (feed1.honours && feed1.honours.rows) || [];
  ok(bandRows.some(r => r.honour === 'sessions' && r.who === 'Ana') && !bandRows.some(r => r.honour === 'improved'), "the month's band lists the confirmed honour only", bandRows);
  ok(eq(await queued(), q0 + 1), 'one push was queued, for the winner');
  const c1b = await coachCall(`select public.coach_honour_confirm($1::date, 'sessions', array['zz_a'])`, [M1]);
  ok(c1b.confirmed.sessions === c1.confirmed.sessions && eq(await queued(), q0 + 1), 'a second tap with the same winner changes nothing and rings nothing');
  await refuses('a different list on a confirmed honour is refused', coachCall(`select public.coach_honour_confirm($1::date, 'sessions', array['zz_c'])`, [M1]), /already confirmed/);

  section('4. Change, Full Month, refusals');
  const c2 = await coachCall(`select public.coach_honour_confirm($1::date, 'improved', array['zz_e'])`, [M1]);
  const imp = c2.rows.filter(r => r.honour === 'improved');
  ok(imp.length === 1 && imp[0].athlete_id === 'zz_e' && imp[0].confirmed_at && imp[0].value.lift === 'Deadlift', 'Change: the suggested winner is replaced by the chosen athlete, with her own figure', imp);
  ok(!(await momentsOf('zz_b')).some(h => h.month === M1) && (await momentsOf('zz_e')).some(h => h.month === M1 && h.honour === 'improved'), 'the suggested winner never sees it, the chosen one does');
  await q(`insert into public.programs (athlete_id, data) values ('zz_nofig', '{}')`);
  await refuses('an athlete with no figure is refused', coachCall(`select public.coach_honour_confirm($1::date, 'full_month', array['zz_nofig'])`, [M1]), /cannot be honoured/);
  await refuses('an athlete with no program is refused: no such athlete', coachCall(`select public.coach_honour_confirm($1::date, 'full_month', array['zz_nobody'])`, [M1]), /no such athlete/);
  await refuses('a former athlete is refused', coachCall(`select public.coach_honour_confirm($1::date, 'full_month', array['zz_former'])`, [M1]), /not a client/);
  await refuses('the Pick is not confirmed through this function', coachCall(`select public.coach_honour_confirm($1::date, 'pick', array['zz_d'])`, [M1]), /coach_honours_pick/);
  await refuses('a month that has not ended is refused', coachCall(`select public.coach_honour_confirm($1::date, 'sessions', array['zz_a'])`, [M0]), /has not ended yet|last day/i);
  const c3 = await coachCall(`select public.coach_honour_confirm($1::date, 'full_month', array['zz_c','zz_d','zz_e'])`, [M1]);
  ok(eq(c3.rows.filter(r => r.honour === 'full_month').map(r => r.athlete_id), ['zz_c', 'zz_d', 'zz_e']) && c3.rows.filter(r => r.honour === 'full_month').every(r => r.confirmed_at), 'Full Month takes a list (the suggestion plus an added name)');
  ok((await queued()) === q0 + 1 + 1 + 3, 'one push per newly honoured athlete', [await queued(), q0]);
  ok(eq(c3.confirmed && Object.keys(c3.confirmed).sort(), ['full_month', 'improved', 'sessions']), 'the three are confirmed');

  section('5. the Pick still works, and is confirmed by the picking');
  const pk = await coachCall(`select public.coach_honours_pick($1::date, 'zz_e')`, [M1]);
  const pr = pk.rows.find(r => r.honour === 'pick');
  ok(pk.pick === 'picked' && pr && pr.confirmed_at, 'the pick row is confirmed as it is written', pr);
  const pw = await coachCall(`select public.coach_honours_why($1::date, 'She trains when nobody looks.')`, [M1]);
  ok(pw.rows.find(r => r.honour === 'pick').value.why === 'She trains when nobody looks.', 'the reason is saved on it');
  const feedP = await bellFeed('zz_a');
  ok(feedP.pick && feedP.pick.who === 'Eli' && feedP.pick.why, 'the Pick card is on the Bell');
  ok((await pageHon('zz_a', 'zz_e')).some(h => h.honour === 'pick' && h.month === M1), 'and on the Player Page');
  await refuses('the pick can only be made once', coachCall(`select public.coach_honours_pick($1::date, 'zz_a')`, [M1]), /already decided/);
  const hAll = await coachCall(`select public.coach_honours($1::date)`, [M1]);
  ok(eq(Object.keys(hAll.confirmed).sort(), ['full_month', 'improved', 'sessions']) && hAll.live === null && hAll.pick === 'picked', 'coach_honours() reports the three confirmations and the pick, and no live work is needed any more', hAll);

  section('6. who can call what, and the last day');
  await db.exec('set role anon');
  await refuses('anon cannot call coach_honour_confirm()', q(`select public.coach_honour_confirm('${M1}'::date, 'sessions', array['zz_a'])`), /permission denied/);
  await db.exec('reset role');
  await refuses('an athlete is refused: coach only', call('zz_a', `select public.coach_honour_confirm($1::date, 'sessions', array['zz_a'])`, [M1]), /coach only/);
  await refuses('the helpers are not callable by a signed-in user', asCoach(() => q(`select public.career_honours_open($1::date)`, [M1])), /permission denied/);
  const dim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const wantOpen = now.getUTCDate() === dim;
  ok((await val(`select public.career_honours_open($1::date)`, [M0])) === wantOpen, `this month is open exactly on its last day (today is the ${now.getUTCDate()}th of ${dim}: ${wantOpen})`);
  ok((await val(`select public.career_honours_open($1::date)`, [M1])) === true, 'a past month is open');
  // the last day, by an honest simulation: a probe copy of career_honours_open() that says today is the last day of this month, rolled back
  await q('begin');
  await db.exec(`create or replace function public.career_honours_open(p_month date) returns boolean language sql stable as $f$ select true $f$`);
  const lastDay = await coachCall(`select public.coach_honours($1::date)`, [M0]).catch(e => ({ err: String(e.message || e) }));
  await q('rollback');
  ok(lastDay.month === M0 && lastDay.ended === false && lastDay.live, "on the month's last day coach_honours() answers for the month itself, not ended, with the live work", lastDay);

  section('7. the way back');
  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage104.sql')), 'rollback_stage104');
  const back = await defs();
  ok(PATCHED.every(f => back[f] === before[f]), 'every patched function is back EXACTLY as it was before the stage', PATCHED.filter(f => back[f] !== before[f]));
  ok(!(await val(`select column_name from information_schema.columns where table_name = 'career_honours' and column_name = 'confirmed_at'`)) && !(await val(`select to_regprocedure('public.coach_honour_confirm(date,text,text[],text[])')::text`)), 'confirmed_at, confirmed and the new functions are gone');
  ok((await val(`select count(*)::int from pg_trigger where tgname in ('crew_push_honour', 'crew_push_honour_ok') and tgrelid = 'public.career_honours'::regclass`)) === 1, 'the push trigger is the stage86 one again');
  await runSql(db, stage, 'stage104 after the rollback');
  ok(true, 'stage104 applies again after the rollback');
  const cm2 = await val(`select count(*)::int from public.career_honours where confirmed_at is not null`);
  ok(cm2 === (await val(`select count(*)::int from public.career_honours`)), 'everything is visible again (the way back is a full undo; the back-fill treats the rows as confirmed)');

  console.log(`\n${passed} passed, ${failed} failed (${Math.round((Date.now() - t0) / 100) / 10} s)`);
  if (failed) { console.log('FAILED: ' + fails.join(' | ')); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(1); });
