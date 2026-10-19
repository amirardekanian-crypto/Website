// Rehearses supabase/stage75_career_courtside.sql (Courtside, the monthly honours, the monthly goal, "From Amir") on PGlite. Nothing live.
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/career/rehearse_courtside.mjs --backup <aa-backup-YYYY-MM-DD.json>
//
// The live structure (supabase/schema_snapshot.sql, every stage through 74), the backup's real rows (programmes, sessions, the Spine, Career
// Mode's facts, rulebook and catalogue), then stage75 twice. The honours are checked against a re-derivation in this file (the main-lift rule
// from Double Up's row and the Spine, the training weeks from career_weeks()), Courtside against made-up live awards, every write and refusal,
// the erasure, that no XP, fact, award or score moves, and the way back (scripts/career/rollback_stage75.sql) followed by stage75 again.
// The backup holds real athletes: their ids are read here and never written to a file; the report says "an athlete", never who.
import fs from 'node:fs';
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, py } from './rehearse_lib.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const BACKUP = opt('--backup');
const COACH = { email: 'amirardekanian@gmail.com', role: 'authenticated' };   // is_coach()'s address, as coach.html's COACH_EMAIL
let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => { if (c) { passed++; console.log('  ok   ' + what); } else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 400) : '')); } };
const section = s => console.log('\n' + s);
const info = s => console.log('  ·    ' + s);
const q = (db, sql, p) => db.query(sql, p || []);
const one = async (db, sql, p) => (await q(db, sql, p)).rows[0];
const val = async (db, sql, p) => { const r = await one(db, sql, p); return r ? Object.values(r)[0] : null; };
const asCoach = async (db, fn, claims = COACH) => {
  await db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(claims).replace(/'/g, "''")}', false); set role authenticated;`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
};
const raises = async (p, re) => { try { await p; return false; } catch (e) { return re ? re.test(String(e.message || e)) : true; } };
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();   // career_norm()
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
async function load(db, table, rows) {
  if (!rows || !rows.length) return 0;
  for (let i = 0; i < rows.length; i += 500) {
    await q(db, `insert into public.${table} select * from jsonb_populate_recordset(null::public.${table}, $1::jsonb) on conflict do nothing`, [JSON.stringify(rows.slice(i, i + 500))]);
  }
  return rows.length;
}
const hashOf = async (db, t) => val(db, `select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.${t} x`);

async function main() {
  if (!BACKUP) throw new Error('--backup <aa-backup-YYYY-MM-DD.json> is required');
  const t0 = Date.now();
  const db = await openDb();
  const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
  const T = backup.tables || {};
  const today = await val(db, `select current_date::text`);

  section('0. the live structure and the backup\'s rows');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  await runSql(db, read(path.join(ROOT, 'supabase', 'schema_snapshot.sql')), 'snapshot');
  ok(!(await val(db, `select to_regclass('public.career_goals')::text`)), 'the snapshot does not hold stage75 yet');
  await db.exec(`set session_replication_role = replica`);
  const n = {};
  for (const t of ['programs', 'athlete_status', 'athlete_progress', 'session_history', 'exercises', 'career_rules', 'career_catalogue', 'career_facts', 'career_scores'])
    n[t] = await load(db, t, T[t]);
  await db.exec(`set session_replication_role = origin`);
  // A backup taken before the go-day's seed (2026-10-18 evening) holds Double Up without D18's main-lift rule: take the row from the files, as live.
  const seed = py([path.join(ROOT, 'scripts', 'career_seed.py'), '--json']);
  if (seed.status !== 0) throw new Error('career_seed.py --json failed: ' + seed.stderr);
  const duFile = JSON.parse(seed.stdout).catalogue.find(c => c.kind === 'achievement' && c.id === 'double_up');
  const duWas = (await one(db, `select body from public.career_catalogue where kind = 'achievement' and id = 'double_up'`) || {}).body || {};
  if (!duWas.patterns) { await q(db, `update public.career_catalogue set body = $1::jsonb where kind = 'achievement' and id = 'double_up'`, [JSON.stringify(duFile.body)]); info("the backup's Double Up row predates D18's rule: it is taken from career/achievements.toml, as the live project has it"); }
  ok(n.career_facts > 1000 && n.session_history > 100 && n.exercises > 100, `the backup's rows are in (${backup.exported_at}): ` + Object.entries(n).map(([k, v]) => `${k} ${v}`).join(', '));
  const erase0 = await val(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)`);
  const before = {}; for (const t of ['career_facts', 'career_awards', 'career_scores', 'career_rules', 'career_catalogue']) before[t] = await hashOf(db, t);

  section('1. stage75 goes on, twice');
  const stage = read(path.join(ROOT, 'supabase', 'stage75_career_courtside.sql'));
  await runSql(db, stage, 'stage75'); await runSql(db, stage, 'stage75 again');
  ok(true, 'stage75 applied, and applied again without an error');
  for (const t of ['courtside_marks', 'career_honour_months', 'career_honours', 'career_goals', 'career_notes'])
    ok(await val(db, `select relrowsecurity from pg_class where oid = to_regclass('public.${t}')`), `${t} exists with row-level security on`);
  const erase1 = await val(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)`);
  ok(/'career_recognition', 'courtside_marks', 'career_honours', 'career_goals', 'career_notes'\]/.test(erase1), 'coach_erase_person() lists the four tables with an athlete_id');
  ok(erase1.split("'career_notes'").length === 2, 'the list was patched once (a re-run left it alone)');
  for (const t of Object.keys(before)) ok((await hashOf(db, t)) === before[t], `${t} is unchanged by the apply`);

  section('2. who can call what');
  await db.exec('set role anon');
  ok(await raises(q(db, `select public.get_courtside(now() - interval '7 days', now())`), /permission denied/), 'anon cannot call get_courtside()');
  await db.exec('reset role');
  ok(await raises(asCoach(db, () => q(db, `select public.get_courtside(now() - interval '7 days', now())`), { email: 'someone@example.invalid', role: 'authenticated' }), /coach only/),
     'a signed-in athlete is refused: coach only');
  ok(await raises(asCoach(db, () => q(db, `select public.career_honours_live(current_date)`)), /permission denied/), 'the helpers are the service role\'s only');
  ok(await raises(asCoach(db, () => q(db, `insert into public.career_goals (athlete_id, month, line) values ('x', date_trunc('month', current_date)::date, 'y')`)), /permission denied/),
     'the coach cannot write a table directly: only through the functions');
  ok((await asCoach(db, () => val(db, `select count(*)::int from public.career_goals`))) === 0, 'the coach can read the tables (the backup reads them)');

  section('3. the main-lift rule (D18), read from Double Up');
  const du = (await one(db, `select body from public.career_catalogue where kind = 'achievement' and id = 'double_up'`)).body;
  const mains = new Set((await q(db, `select public.career_main_lift_names() as n`)).rows.map(r => r.n));
  const want = new Set();
  for (const e of T.exercises || []) {
    if (e.status !== 'approved' || !(du.patterns || []).includes(e.pattern)) continue;
    if (du.qualities && !(e.qualities || []).some(x => du.qualities.includes(x))) continue;
    if ((du.exclude || []).includes(e.id)) continue;
    [e.name, ...(e.aliases || [])].forEach(x => want.add(norm(x)));
  }
  ok(mains.size > 20 && [...want].every(x => mains.has(x)) && [...mains].every(x => want.has(x)),
     `career_main_lift_names() equals a re-derivation from the Spine (${mains.size} names)`, { onlyServer: [...mains].filter(x => !want.has(x)).slice(0, 5), onlyHere: [...want].filter(x => !mains.has(x)).slice(0, 5) });
  ok(mains.has('barbell back squat') && !mains.has('dumbbell forearm rotation') && !mains.has('45° back extension') && !mains.has('cable face pull'),
     'a back squat counts; a forearm drill and two of the four accessories Amir named do not');
  await q(db, `begin`);
  await q(db, `update public.exercises set id = id || '-moved' where id = $1`, [(du.exclude || [])[0]]);
  ok((await val(db, `select count(*)::int from public.career_main_lift_names()`)) === 0, 'fails closed: an exclude id with no row in the Spine counts no lift');
  await q(db, `rollback`);

  section('4. the honours, against a re-derivation');
  const months = ['2026-08-01', '2026-09-01', '2026-10-01'].filter(m => m <= today);
  for (const m0 of months) {
    const t1 = Date.now();
    const h = (await one(db, `select public.career_honours_live($1::date) as h`, [m0])).h;
    const ms = Date.now() - t1;
    const m1 = addDays(addDays(m0, 32).slice(0, 8) + '01', -1);
    const ids = (await q(db, `select p.athlete_id from public.programs p where public.career_is_client(p.athlete_id)
                                and exists (select 1 from public.career_facts f where f.athlete_id = p.athlete_id and f.void_at is null and f.day between $1 and $2)`, [m0, m1])).rows.map(r => r.athlete_id);
    // most sessions: the paid plan sessions (D19)
    const paid = {};
    for (const id of ids) paid[id] = Number(await val(db, `select count(*)::int from public.career_facts_paid($1) x where x.kind in ('session_finished','session_finished_early') and x.day between $2 and $3`, [id, m0, m1]));
    const topN = Math.max(0, ...Object.values(paid));
    const topWho = Object.keys(paid).filter(k => paid[k] === topN && topN >= 1).sort();
    ok(h.sessions.n === (topN || null) && JSON.stringify(h.sessions.who) === JSON.stringify(topWho), `${m0.slice(0, 7)} most sessions: ${topN}, shared by ${topWho.length} (${ms} ms)`, h.sessions);
    // most improved: every win of the month on a main lift
    let best = 0, bestWho = [], iso = 0;
    for (const id of ids) {
      const ws = (await q(db, `select name, round(gain * 100, 1)::float as pct from public.career_cycle_wins($1, $2, $3, null, jsonb_set(public.career_rules_now(), '{fact,effort_win,limit}', '1000'::jsonb))`, [id, m0, m1])).rows;
      for (const w of ws) {
        if (!want.has(norm(w.name))) { iso = Math.max(iso, w.pct); continue; }
        if (w.pct > best) { best = w.pct; bestWho = [id]; } else if (w.pct === best && !bestWho.includes(id)) bestWho.push(id);
      }
    }
    bestWho.sort();
    ok(Number(h.improved.pct || 0) === best && JSON.stringify(h.improved.who.map(x => x.athlete_id)) === JSON.stringify(best > 0 ? bestWho : []),
       `${m0.slice(0, 7)} most improved: +${best}% on a main lift${iso > best ? ` (an off-list lift at +${iso}% does not count)` : ''}`, h.improved);
    // full month and one week short: the training weeks that end in the month
    const full = [], near = [];
    for (const id of ids) {
      const wk = (await q(db, `select cycle_num, week from public.career_weeks($1) where wto between $2 and $3 and coalesce(array_length(plan, 1), 0) > 0`, [id, m0, m1])).rows;
      let held = 0;
      for (const w of wk) if (await val(db, `select count(*)::int from public.career_facts where athlete_id = $1 and kind = 'week_held' and void_at is null and ref = $2`, [id, `c${w.cycle_num}|w${w.week}`])) held++;
      if (wk.length >= 4 && held === wk.length) full.push(id);
      if (wk.length >= 4 && held === wk.length - 1) near.push(id);
    }
    ok(JSON.stringify(h.full_month.who.map(x => x.athlete_id)) === JSON.stringify(full.sort()) && JSON.stringify(h.full_month.near.map(x => x.athlete_id)) === JSON.stringify(near.sort()),
       `${m0.slice(0, 7)} full month: ${full.length}, one week short: ${near.length}`, h.full_month);
    const sl = h.shortlist.map(x => x.athlete_id);
    ok(new Set(sl).size === sl.length && h.shortlist.every(x => ids.includes(x.athlete_id)), `${m0.slice(0, 7)} the Pick's shortlist names ${sl.length} different clients`);
    ok(ms < 3000, `${m0.slice(0, 7)} worked out in ${ms} ms (budget 3000, under the 8 s statement limit)`);
  }
  ok(await raises(asCoach(db, () => q(db, `select public.coach_honours(current_date)`)), /has not ended yet/), 'the current month has no honours yet');
  // coach.html passes the ids that are never clients (its SYSTEM_IDS and AMIR_ATHLETE_ID): a winner on that list is left out, and the next one wins.
  {
    const m0 = months[months.length - 2] || months[0];
    const h0 = (await one(db, `select public.career_honours_live($1::date) as h`, [m0])).h;
    if (h0.sessions.who.length) {
      const skip = h0.sessions.who;
      const h1 = (await one(db, `select public.career_honours_live($1::date, $2::text[]) as h`, [m0, skip])).h;
      ok(!h1.sessions.who.some(x => skip.includes(x)) && (h1.sessions.n || 0) <= h0.sessions.n,
         `${m0.slice(0, 7)} a winner passed as not a client is left out, and the next count wins (${h0.sessions.n} → ${h1.sessions.n})`);
    }
  }

  section('5. freezing, sending and the Pick');
  const past = months.filter(m => m < today.slice(0, 8) + '01').slice(-1)[0];
  const live = (await one(db, `select public.career_honours_live($1::date) as h`, [past])).h;
  const fz = await asCoach(db, async () => (await one(db, `select public.coach_honours_freeze($1::date) as h`, [past])).h);
  const nRows = live.sessions.who.length + live.improved.who.length + live.full_month.who.length + live.full_month.near.length;
  ok(fz.frozen && fz.rows.length === nRows, `${past.slice(0, 7)} frozen: ${nRows} rows (ties are several rows)`, fz);
  const fz2 = await asCoach(db, async () => (await one(db, `select public.coach_honours_freeze($1::date) as h`, [past])).h);
  ok(JSON.stringify(fz2.rows) === JSON.stringify(fz.rows) && fz2.frozen_at === fz.frozen_at, 'freezing again changes nothing');
  if (live.sessions.who.length) {
    ok((await asCoach(db, () => val(db, `select public.coach_honours_sent($1::date, 'sessions', $2)`, [past, live.sessions.who[0]]))) === 1, 'a winner\'s message is marked sent');
  }
  ok((await asCoach(db, () => val(db, `select public.coach_honours_sent($1::date, 'sessions', 'nobody_here')`, [past]))) === 0, 'sending to someone who did not win marks nothing');
  ok(await raises(asCoach(db, () => q(db, `select public.coach_honours_pick($1::date, 'demo')`, [past]))), 'the demo cannot be picked');
  const pickId = fz.shortlist && fz.shortlist[0] ? fz.shortlist[0].athlete_id : null;
  await q(db, 'begin');
  const nb = await asCoach(db, async () => (await one(db, `select public.coach_honours_pick($1::date, null) as h`, [past])).h);
  ok(nb.pick === 'nobody' && !nb.rows.some(r => r.honour === 'pick'), 'nobody is a recorded answer, with no winner row');
  await q(db, 'rollback');
  if (pickId) {
    const pk = await asCoach(db, async () => (await one(db, `select public.coach_honours_pick($1::date, $2) as h`, [past, pickId])).h);
    ok(pk.pick === 'picked' && pk.rows.some(r => r.honour === 'pick' && r.athlete_id === pickId), 'Amir\'s Pick is recorded as an honour (no title)');
    ok(!(await val(db, `select count(*)::int from public.hab_titles where title like 'amirs_pick%'`)) && !(await val(db, `select count(*)::int from public.career_awards where item = 'amirs_pick'`)),
       'no title and no award is minted for the Pick');
    ok(await raises(asCoach(db, () => q(db, `select public.coach_honours_pick($1::date, null)`, [past])), /already decided/), 'a decided Pick stays decided');
  }
  const older = addDays(past, -1).slice(0, 8) + '01';
  ok(await raises(asCoach(db, () => q(db, `select public.coach_honours_pick($1::date, null)`, [older])), /can no longer be picked/), `${older.slice(0, 7)} is past its window (the month after it has ended)`);

  section('6. Courtside');
  await q(db, `insert into public.programs (athlete_id, data) values ('zz_cs_a', '{}'), ('zz_cs_b', '{}'), ('zz_cs_former', '{}') on conflict do nothing`);
  await q(db, `insert into public.athlete_status (athlete_id, status) values ('zz_cs_former', 'former') on conflict (athlete_id) do update set status = 'former'`);
  const award = (id, aid, kind, item, size, how, ago) => q(db,
    `insert into public.career_awards (athlete_id, award_id, kind, item, tier, day, pays, xp, size, meaning, evidence, how, rules_version, created_at)
     values ($1, $2, $3, $4, case when $3 = 'badge' then 2 end, current_date, true, 300, $5, 'commitment', '{"n": 50, "facts": []}', $6, 3, now() - $7::interval)`,
    [id, aid, kind, item, size, how, ago]);
  await award('zz_cs_a', 'badge:century:2', 'badge', 'century', 'milestone', 'live', '1 hour');
  await award('zz_cs_a', 'achievement:first_cycle', 'achievement', 'first_cycle', 'milestone', 'live', '2 hours');
  await award('zz_cs_a', 'achievement:first_blood', 'achievement', 'first_blood', 'win', 'live', '2 hours');           // too small
  await award('zz_cs_a', 'badge:the_upgrade:1', 'badge', 'the_upgrade', 'highlight', 'live', '3 hours');            // a badge the cut removes
  await award('zz_cs_b', 'badge:held_weeks:2', 'badge', 'held_weeks', 'highlight', 'baseline', '3 hours');          // the go-day's back-pay
  await award('zz_cs_b', 'achievement:held', 'achievement', 'held', 'highlight', 'live', '9 days');                 // last week
  await award('zz_cs_former', 'badge:century:1', 'badge', 'century', 'highlight', 'live', '1 hour');               // a former athlete
  await award('demo', 'badge:century:1', 'badge', 'century', 'highlight', 'live', '1 hour');                       // the demo
  const cs = await asCoach(db, async () => (await one(db, `select public.get_courtside(now() - interval '7 days', now() + interval '1 hour') as c`)).c);
  const got = cs.rows.map(r => r.athlete_id + ' ' + r.award_id).sort();
  ok(JSON.stringify(got) === JSON.stringify(['zz_cs_a achievement:first_cycle', 'zz_cs_a badge:century:2']),
     'Courtside shows live moments from highlight up, of the kinds that stay, for clients, this week only', got);
  const cs2 = await asCoach(db, async () => (await one(db, `select public.get_courtside(now() - interval '7 days', now() + interval '1 hour', array['zz_cs_a']) as c`)).c);
  ok(cs2.rows.length === 0, 'an id passed as not a client (as coach.html passes your own login) is left out of Courtside');
  ok(cs.rows.every(r => r.spec && r.spec.name), 'every row carries its share spec (the name the message uses)');
  ok(await raises(asCoach(db, () => q(db, `select public.get_courtside(now() - interval '60 days', now())`)), /at most 35 days/), 'a window over 35 days is refused');
  ok((await asCoach(db, () => val(db, `select public.coach_courtside_mark('zz_cs_a', array['badge:century:2'], 'saw')`))) === 1, 'Saw it marks one row');
  ok((await asCoach(db, () => val(db, `select public.coach_courtside_mark('zz_cs_a', array['badge:century:2'], 'sent')`))) === 1, 'sending it after keeps the first seen time and adds sent');
  const m = await one(db, `select saw_at, sent_at from public.courtside_marks where athlete_id = 'zz_cs_a' and award_id = 'badge:century:2'`);
  ok(m.saw_at && m.sent_at, 'the mark holds seen and sent');
  ok((await asCoach(db, () => val(db, `select public.coach_courtside_mark('zz_cs_a', array['badge:held_weeks:9'], 'saw')`))) === 0, 'a moment that is not theirs marks nothing (0)');
  ok((await asCoach(db, () => val(db, `select public.coach_courtside_mark('zz_cs_a', array['badge:century:2'], 'undo')`))) === 1
     && !(await val(db, `select count(*)::int from public.courtside_marks where athlete_id = 'zz_cs_a'`)), 'Undo puts it back on Courtside');
  ok(await raises(asCoach(db, () => q(db, `select public.coach_courtside_mark('zz_cs_a', array['x'], 'like')`)), /not saw, sent or undo/), 'an unknown mark is refused');

  section('7. the monthly goal');
  const mon = today.slice(0, 8) + '01';
  const g1 = await asCoach(db, async () => (await one(db, `select public.coach_set_goal('zz_cs_a', current_date, '  Squat 3 times   a week. ') as g`)).g);
  ok(g1.line === 'Squat 3 times a week.' && g1.month === mon, 'a goal is written for the month, its spaces tidied');
  const g2 = await asCoach(db, async () => (await one(db, `select public.coach_set_goal('zz_cs_a', current_date, 'Every check-in.') as g`)).g);
  ok(g2.line === 'Every check-in.' && (await val(db, `select count(*)::int from public.career_goals where athlete_id = 'zz_cs_a'`)) === 1, 'rewriting replaces it (one goal a month)');
  ok(await raises(asCoach(db, () => q(db, `select public.coach_set_goal('zz_cs_a', current_date, $1)`, ['x'.repeat(141)])), /at most 140/), 'over 140 characters is refused');
  ok(await raises(asCoach(db, () => q(db, `select public.coach_set_goal('zz_cs_a', current_date - 90, 'old')`)), /last month, this month or next month/), 'a goal three months back is refused');
  ok(await raises(asCoach(db, () => q(db, `select public.coach_set_goal('nobody_here', current_date, 'x')`)), /no such athlete/), 'a goal for nobody is refused');
  const gd = await asCoach(db, async () => (await one(db, `select public.coach_goal_done('zz_cs_a', current_date, true) as g`)).g);
  ok(gd.done_at, 'the goal is ticked done');
  ok(await raises(asCoach(db, () => q(db, `select public.coach_set_goal('zz_cs_a', current_date, '')`)), /untick it first/), 'a done goal cannot be cleared');
  await asCoach(db, () => q(db, `select public.coach_goal_done('zz_cs_a', current_date, false)`));
  ok((await asCoach(db, async () => (await one(db, `select public.coach_set_goal('zz_cs_a', current_date, '') as g`)).g)) === null
     && !(await val(db, `select count(*)::int from public.career_goals where athlete_id = 'zz_cs_a'`)), 'unticked, it clears');

  section('8. From Amir');
  const n1 = await asCoach(db, async () => (await one(db, `select public.coach_from_amir('zz_cs_a', current_date, 'Trained through exam week. Proud of you.', 'badge:century:2') as n`)).n);
  ok(n1.line === 'Trained through exam week. Proud of you.' && n1.award_id === 'badge:century:2' && !n1.read_at, 'a line is kept, tied to the moment it answers');
  ok(await raises(asCoach(db, () => q(db, `select public.coach_from_amir('zz_cs_a', current_date, 'again')`)), /one line a day/), 'one line a day');
  ok(await raises(asCoach(db, () => q(db, `select public.coach_from_amir('zz_cs_b', current_date, $1)`, ['x'.repeat(91)])), /at most 90/), 'over 90 characters is refused');
  ok(await raises(asCoach(db, () => q(db, `select public.coach_from_amir('zz_cs_b', current_date, 'x', 'badge:century:2')`)), /not zz_cs_b's/), 'a moment that is not theirs is refused');
  ok(await raises(asCoach(db, () => q(db, `select public.coach_from_amir('zz_cs_former', current_date, 'hi')`)), /not a client/), 'a former athlete gets no line');
  ok(await raises(asCoach(db, () => q(db, `select public.coach_from_amir('zz_cs_b', current_date - 5, 'hi')`)), /is not today/), 'only today\'s line');
  await asCoach(db, () => q(db, `select public.coach_from_amir('zz_cs_a', current_date, '')`));
  ok(!(await val(db, `select count(*)::int from public.career_notes where athlete_id = 'zz_cs_a'`)), 'an unread line can be taken back');
  await asCoach(db, () => q(db, `select public.coach_from_amir('zz_cs_a', current_date, 'Again, kept.')`));
  await q(db, `update public.career_notes set read_at = now() where athlete_id = 'zz_cs_a'`);
  ok(await raises(asCoach(db, () => q(db, `select public.coach_from_amir('zz_cs_a', current_date, '')`)), /read it already/), 'a read line stays');

  section('9. the erasure');
  await asCoach(db, async () => {
    await q(db, `select public.coach_courtside_mark('zz_cs_a', array['badge:century:2'], 'saw')`);
    await q(db, `select public.coach_set_goal('zz_cs_a', current_date, 'A goal to erase.')`);
  });
  await q(db, `insert into public.career_honours (month, honour, athlete_id, value) values ($1::date, 'near', 'zz_cs_a', '{}') on conflict do nothing`, [past]);
  const dry = await asCoach(db, async () => (await one(db, `select public.coach_erase_person('athlete', 'zz_cs_a') as r`)).r);
  const word = dry.confirm_word;
  const real = await asCoach(db, async () => (await one(db, `select public.coach_erase_person('athlete', 'zz_cs_a', $1, '{}', false) as r`, [word])).r);
  const left = await val(db, `select (select count(*) from public.courtside_marks where athlete_id = 'zz_cs_a') + (select count(*) from public.career_honours where athlete_id = 'zz_cs_a')
                                + (select count(*) from public.career_goals where athlete_id = 'zz_cs_a') + (select count(*) from public.career_notes where athlete_id = 'zz_cs_a')`);
  ok(real && real.ok && Number(left) === 0, 'an erasure empties the four tables of the person (and its own check passes)', real);

  section('10. nothing in the scorer moved');
  for (const t of ['career_facts', 'career_scores', 'career_rules', 'career_catalogue']) ok((await hashOf(db, t)) === before[t], `${t} is as the backup had it`);

  section('11. the way back, then stage75 again');
  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage75.sql')), 'rollback');
  ok(!(await val(db, `select to_regclass('public.career_goals')::text`)) && !(await val(db, `select to_regprocedure('public.get_courtside(timestamptz,timestamptz)')::text`)), 'the tables and functions are gone');
  ok((await val(db, `select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)`)) === erase0, 'coach_erase_person() is exactly as before stage75');
  ok(await val(db, `select to_regclass('backup.career_honours_' || to_char(current_date, 'YYYYMMDD'))::text`), 'the frozen honours are copied to the backup schema first');
  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage75.sql')), 'rollback again');
  ok(true, 'the way back runs twice');
  await runSql(db, stage, 'stage75 after the way back');
  ok(await val(db, `select to_regclass('public.career_goals')::text`), 'stage75 goes on again after the way back');

  console.log(`\n${failed ? 'FAIL' : 'OK'}: ${passed} passed, ${failed} failed (${Math.round((Date.now() - t0) / 1000)} s)`);
  if (failed) fails.forEach(f => console.log('  - ' + f));
  process.exitCode = failed ? 1 : 0;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
