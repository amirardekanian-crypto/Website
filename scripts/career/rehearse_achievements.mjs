// Rehearses supabase/stage79_career_achievements.sql (three achievement tests the server can decide: total, best_run, month_held) and
// rulebook version 5 (the 13 new achievements) on PGlite. Nothing live, no real athlete.
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/career/rehearse_achievements.mjs
//
// The live structure (supabase/schema_snapshot.sql without stage79), the rulebook and catalogue as they are live (career/*.toml at the cut's
// commit, 50f2908, or --rev), made-up athletes whose sessions and Library sessions go in through the real triggers; then:
//   1. stage79, twice: under version 4 nothing moves (no entry uses the new tests yet);
//   2. version 5 from the working tree, starting today: career_d20_check() lets it through, 36 achievements;
//   3. the quiet back-pay: one silent career_rewards_batch() pass mints what each athlete already did, dated today (version 5's start day),
//      with no moment waiting (a silent award has none), its XP added and nothing else moved; the athlete with a full August gets Full Month
//      (and not September, which had a broken week, nor July, which had three weeks), Back to Back, Bounce Back, Straight Talk, Season Ticket,
//      Extra Mile, Extra Innings, Every Rep Counted and The Notebook; the newer athlete only what it did;
//   4. the live path: a fifth Library session today mints Extra Innings live at the app's next read of the profile, its moment waiting;
//   5. month_held's edges, by the function itself: a month not over is never decided; three weeks are not four; one broken week spoils it;
//   6. the cost: a full evaluate and a session save, against their budgets (500 and 300 ms);
//   7. the way back (scripts/career/rollback_stage79.sql) puts the four functions back exactly; stage79 again after it.
//   8. stage80's read, get_achievements(): every one with its day or its progress, what is left out, Next up (and its no-progress fallback),
//      its cost and its way back.
// The batch's fix is proved by section 3 itself: the scratch database has no backup.career_catalogue_before, as the live one will not after 2026-11-01.
// Who gets what on the live project is a dry run inside a rolled-back transaction (career/PROCEDURES.md → Stage 79).
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, py, filesAt, withRulebook, snapshotWithout } from './rehearse_lib.mjs';

let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => { if (c) { passed++; console.log('  ok   ' + what); } else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 600) : '')); } };
const info = s => console.log('  ·    ' + s);
const section = s => console.log('\n' + s);
const q = (db, sql, p) => db.query(sql, p || []);
const one = async (db, sql, p) => (await q(db, sql, p)).rows[0];
const val = async (db, sql, p) => { const r = await one(db, sql, p); return r ? Object.values(r)[0] : null; };
const ymd = d => d.toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const lastDay = iso => ymd(new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7), 0)));
const ms = async fn => { const t = performance.now(); await fn(); return Math.round((performance.now() - t) * 10) / 10; };
const revArg = (() => { const i = process.argv.indexOf('--rev'); return i > 0 ? process.argv[i + 1] : '50f2908'; })();
const FNS = ['career_entry_keys(text,jsonb,jsonb)', 'career_entry_kinds(text,jsonb)', 'career_achievement_eval(text,text,jsonb,jsonb,jsonb)',
             'career_rewards_batch(integer,integer,text)'];
const defs = async db => { const o = {}; for (const f of FNS) o[f] = await val(db, `select pg_get_functiondef('public.${f}'::regprocedure)`); return o; };
const NEW = ['back_to_back', 'full_month', 'every_rep_counted', 'the_notebook', 'extra_mile', 'extra_innings', 'straight_talk', 'season_ticket',
             'half_year', 'year_one', 'moving_up', 'rematch_won', 'rebound'];

const ANSWERED = { composite: 4, sleep: 4, energy: 4, soreness: 4, stress: 3, overall: 4, skipped: false };
const sess = ({ checkin = true, full = true, status = 'Complete' } = {}) => ({
  status, duration_min: 45, readiness: checkin ? ANSWERED : { skipped: true, composite: null },
  log: [{ ex: 'Goblet Squat', sets: [{ w: '40', n: 8, r: full ? 7 : '', d: true }, { w: '40', n: 8, r: full ? 7 : '', d: true }] }] });
const prog = (start, end, days) => ({ athlete: { firstName: 'Zed', lastName: 'Test' }, currentCycleIndex: 0,
  cycles: [{ num: 1, startDate: start, endDate: end }], workouts: { days: days.map(id => ({ id, blocks: [] })) } });
async function insSession(db, id, day, on, s) {
  await q(db, `insert into public.session_history (athlete_id, athlete_name, day, completed_on, status, duration_min, readiness, log)
               values ($1, 'Zed', $2, $3::date, $4, $5, $6::jsonb, $7::jsonb) on conflict (athlete_id, day, completed_on) do update set log = excluded.log`,
          [id, day, on, s.status, s.duration_min, JSON.stringify(s.readiness), JSON.stringify(s.log)]);
}
async function insLibrary(db, id, slug, on) {
  await q(db, `insert into public.library_sessions (athlete_id, slug, completed_on, title, duration_min) values ($1, $2, $3::date, 'Zed', 30)`, [id, slug, on]);
}
const numbers = async (db, id) => {
  const c = await val(db, `select public.career_compute($1)`, [id]);
  return { xp: Number(c.career.xp), level: c.career.level, season: Number(c.season.points), week: Number(c.week.points) };
};
const awardsOf = async (db, id) => (await q(db, `select item, day::text as day, how, xp, pays, rules_version from public.career_awards where athlete_id = $1 and kind = 'achievement' order by item`, [id])).rows;

async function main() {
  const t0 = Date.now();
  const db = await openDb();
  const today = await val(db, `select current_date::text`);
  section('0. the live structure, the live catalogue (career/*.toml at ' + revArg + '), made-up athletes through the real triggers');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/stage79/);
  info('the structure starts from ' + snap.says);
  ok(!/stage79/.test(snap.sql) && /award_kept/.test(snap.sql), 'the snapshot it starts from holds stage78 and not stage79');
  await runSql(db, snap.sql, 'snapshot');
  const xpRow = JSON.parse(read(path.join(ROOT, 'supabase', 'xp_rules_snapshot.json')));
  await q(db, `insert into public.xp_rules (id, rules) values (1, $1::jsonb)`, [JSON.stringify(xpRow.rules)]);
  const oldDir = filesAt(revArg);
  const old = py([path.join(oldDir, 'scripts', 'career_seed.py'), path.join(oldDir, 'career'), '--json']);
  if (old.status !== 0) throw new Error('career_seed.py --json at ' + revArg + ' failed: ' + old.stderr);
  const P4 = JSON.parse(old.stdout);
  ok(P4.version === 4 && P4.catalogue.filter(r => r.kind === 'achievement').length === 22, `the live catalogue: version ${P4.version}, ${P4.catalogue.filter(r => r.kind === 'achievement').length} achievements`);
  // live, versions 1 to 3 have no start day and price everything before version 4; one row with none stands in for them here
  await q(db, `insert into public.career_rules (version, rules, source, loaded_at, starts_on) values ($1, $2::jsonb, 'rehearsal', now(), null)`, [P4.version, JSON.stringify(P4.rules)]);
  await q(db, `insert into public.career_catalogue (kind, id, body, version, loaded_at) select x.kind, x.id, x.body, $2, now() from jsonb_to_recordset($1::jsonb) as x(kind text, id text, body jsonb)`, [JSON.stringify(P4.catalogue), P4.version]);
  await q(db, `insert into public.seasons (starts_on, name) values ($1::date, 'Season 1')`, [addDays(today, -1)]).catch(async () => {
    await q(db, `insert into public.seasons (starts_on) values ($1::date)`, [addDays(today, -1)]);
  });

  // A: a three-day plan from 104 days ago; every week held but week 10 (day 3 missed), so July has three weeks ending in it (not four),
  // August five (all held: Full Month on its last day) and September four with the broken one (no Full Month); week 11 held after the broken
  // one (Bounce Back); week 14's day 2 finished early (it still holds the week); every session logged in full with its check-in; five Library sessions.
  const S = addDays(today, -104), E = addDays(today, 20);
  const A = 'zz_ach_a', B = 'zz_ach_b', D = 'zz_ach_d';
  // A's first Full Month by the rule: the training weeks ending in a calendar month, all held, at least four, the month over
  const fullA = (() => {
    const by = {};
    for (let k = 1; addDays(S, 7 * k - 1) <= E; k++) { const m = addDays(S, 7 * k - 1).slice(0, 7); (by[m] = by[m] || []).push(k <= 14 && k !== 10); }
    return Object.keys(by).sort().find(m => by[m].length >= 4 && by[m].every(Boolean) && lastDay(m + '-01') < today) || null;
  })();
  info('A\'s first full month should be ' + fullA);
  await q(db, `insert into public.programs (athlete_id, data) values ($1, $2::jsonb)`, [A, JSON.stringify(prog(S, E, [1, 2, 3]))]);
  for (let k = 1; k <= 14; k++) {
    const w0 = addDays(S, 7 * (k - 1));
    for (const [d, off] of [[1, 0], [2, 2], [3, 4]]) {
      if (k === 10 && d === 3) continue;
      await insSession(db, A, d, addDays(w0, off), sess(k === 14 && d === 2 ? { status: 'Partial (3 of 5)' } : {}));
    }
  }
  for (let i = 0; i < 5; i++) await insLibrary(db, A, 'zz-lib-' + i, addDays(S, 1 + 7 * i));
  // B: a one-day plan from 20 days ago; week 1 held, week 2 missed; no check-ins; four Library sessions (two in each of two weeks).
  const SB = addDays(today, -20);
  await q(db, `insert into public.programs (athlete_id, data) values ($1, $2::jsonb)`, [B, JSON.stringify(prog(SB, addDays(today, 30), [1]))]);
  await insSession(db, B, 1, addDays(SB, 1), sess({ checkin: false }));
  const libB = [addDays(SB, 1), addDays(SB, 2), addDays(SB, 8), addDays(SB, 9)];
  for (let i = 0; i < 4; i++) await insLibrary(db, B, 'zz-libb-' + i, libB[i]);
  // D: a cycle whose four weeks all end in a month that is not over (for section 5).
  const m0 = today.slice(0, 7) + '-01';
  await q(db, `insert into public.programs (athlete_id, data) values ($1, $2::jsonb)`, [D, JSON.stringify(prog(addDays(m0, -6), addDays(m0, 21), [1]))]);

  for (const id of [A, B]) await q(db, `select public.career_scored($1)`, [id]);
  const heldA = await val(db, `select count(*)::int from public.career_facts where athlete_id = $1 and kind = 'week_held' and void_at is null`, [A]);
  const brokenA = await val(db, `select string_agg(ref, ',') from public.career_facts where athlete_id = $1 and kind = 'week_broken' and void_at is null`, [A]);
  ok(heldA === 13 && brokenA === 'c1|w10', `the triggers made A's weeks: 13 held, week 10 broken (${heldA}, ${brokenA})`);
  const factsA = Object.fromEntries((await q(db, `select kind, count(*)::int as n from public.career_facts where athlete_id = $1 and void_at is null group by kind`, [A])).rows.map(r => [r.kind, r.n]));
  info('A\'s facts: ' + JSON.stringify(factsA));
  ok(factsA.checkin_done >= 25 && factsA.library_session === 5 && factsA.bounce_back >= 1 && factsA.session_finished_early === 1 && factsA.week_by_the_book >= 1 && factsA.month_with_amir === 3,
     'A has 25+ check-ins, five Library sessions, a bounce back, one early finish, a week by the book and three whole months with Amir', factsA);
  const before = { [A]: await numbers(db, A), [B]: await numbers(db, B) };
  const aw0 = { [A]: await awardsOf(db, A), [B]: await awardsOf(db, B) };
  info('before: A ' + JSON.stringify(before[A]) + ' with ' + aw0[A].map(a => a.item).join(', ') + '; B ' + JSON.stringify(before[B]));
  const defs0 = await defs(db);

  section('1. stage79, twice: under version 4 nothing moves');
  const stage = read(path.join(ROOT, 'supabase', 'stage79_career_achievements.sql'));
  await runSql(db, stage, 'stage79'); await runSql(db, stage, 'stage79 again');
  ok(true, 'stage79 applied, and applied again without an error');
  for (const id of [A, B]) {
    await q(db, `select public.career_evaluate($1, null, 'silent')`, [id]);
    ok(JSON.stringify(await numbers(db, id)) === JSON.stringify(before[id]) && JSON.stringify(await awardsOf(db, id)) === JSON.stringify(aw0[id]),
       `${id}: the same numbers and awards after an evaluate`);
  }

  section('2. rulebook version 5 (career/ in the working tree), starting today');
  const newDir = filesAt(null);
  withRulebook(newDir, t => t.replace(/starts_on = "\d{4}-\d{2}-\d{2}"/, `starts_on = "${today}"`));
  const s5 = py([path.join(newDir, 'scripts', 'career_seed.py'), path.join(newDir, 'career'), '--json']);
  if (s5.status !== 0) throw new Error('career_seed.py --json (version 5) failed: ' + s5.stderr);
  const P5 = JSON.parse(s5.stdout);
  ok(P5.version === 5 && P5.rules.starts_on === today, `version 5, starting today (${P5.rules.starts_on})`);
  const r5 = await val(db, `select public.career_seed($1, $2::jsonb, $3::jsonb, 'rehearsal')`, [P5.version, JSON.stringify(P5.rules), JSON.stringify(P5.catalogue)]);
  ok(r5 && r5.version === 5, 'career_seed() takes it: career_d20_check() lets the new achievements through', r5);
  const nAch = await val(db, `select count(*)::int from public.career_catalogue where kind = 'achievement'`);
  ok(nAch === 35 && await val(db, `select count(*)::int from public.career_catalogue where kind = 'achievement' and id = any($1)`, [NEW]) === 13, `the catalogue holds 35 achievements, the 13 new ones among them (${nAch})`);
  ok(JSON.stringify(await numbers(db, A)) === JSON.stringify(before[A]), 'the seed alone moves nothing');

  section('3. the quiet back-pay: one silent pass');
  const batch = await val(db, `select public.career_rewards_batch(0, 100, 'silent')`);
  ok(batch && batch.ok === true && batch.n === 2, 'the batch runs for both with no go-day copy in the database (backup.career_catalogue_before is dropped on 2026-11-01)', batch);
  const got = {};
  for (const id of [A, B]) got[id] = (await awardsOf(db, id)).filter(a => !aw0[id].some(o => o.item === a.item));
  const itemsA = got[A].map(a => a.item).sort(), itemsB = got[B].map(a => a.item).sort();
  info('A got ' + itemsA.join(', ') + '; B got ' + itemsB.join(', '));
  const wantA = ['back_to_back', 'every_rep_counted', 'extra_innings', 'extra_mile', 'full_month', 'rebound', 'season_ticket', 'straight_talk', 'the_notebook'];
  ok(JSON.stringify(itemsA) === JSON.stringify(wantA), 'A gets exactly the nine it already did (no Half Year, Year One, Moving Up or Rematch Won)', itemsA);
  const wantB = ['every_rep_counted', 'extra_mile'];
  ok(JSON.stringify(itemsB) === JSON.stringify(wantB), 'B gets only what it did: a full log and a Library session (no Back to Back: one held week; no Extra Innings: four)', itemsB);
  const all = got[A].concat(got[B]);
  ok(all.every(a => a.day === today && a.how === 'silent' && a.rules_version === 5), 'every one is dated today, version 5\'s start day, minted silently under version 5', all.map(a => a.item + ' ' + a.day + ' ' + a.how + ' v' + a.rules_version));
  const xpOf = Object.fromEntries(P5.catalogue.filter(r => r.kind === 'achievement').map(r => [r.id, r.body.xp]));
  ok(all.every(a => a.xp === xpOf[a.item] && a.pays), 'each carries its catalogue XP and pays', all.map(a => a.item + ' ' + a.xp + ' ' + a.pays));
  ok(await val(db, `select count(*)::int from public.career_recognition where award_id = any($1)`, [all.map(a => 'achievement:' + a.item)]) === 0, 'no moment waits for any of them (no full-screen moment)');
  for (const id of [A, B]) {
    const after = await numbers(db, id), add = got[id].reduce((s, a) => s + a.xp, 0);
    ok(after.xp === before[id].xp + add && after.week === before[id].week + add && after.season === before[id].season + add, `${id}: career XP, the season's and the week's points up by exactly the new awards' XP (+${add}), nothing else moved`, { before: before[id], after });
  }
  ok(JSON.stringify((await awardsOf(db, A)).filter(a => aw0[A].some(o => o.item === a.item))) === JSON.stringify(aw0[A]), 'the awards A held before are untouched');
  const fm = (await one(db, `select evidence from public.career_awards where athlete_id = $1 and item = 'full_month'`, [A])).evidence;
  ok(fm && fm.via === 'month_held' && fm.n === 5, 'Full Month\'s evidence: the month\'s five weeks (August)', fm);
  const nAw = await val(db, `select count(*)::int from public.career_awards`);
  await val(db, `select public.career_rewards_batch(0, 100, 'silent')`);
  ok(await val(db, `select count(*)::int from public.career_awards`) === nAw, 'a second pass mints nothing');

  section('4. the live path: B\'s fifth Library session, today');
  await insLibrary(db, B, 'zz-libb-4', today);
  // the Library trigger writes the fact only (it never evaluated awards, before or after this stage); get_profile(), which the app reads on
  // every open and after a session, evaluates in full, live
  await q(db, `select public.get_profile($1)`, [B]);
  const live = (await awardsOf(db, B)).find(a => a.item === 'extra_innings');
  ok(live && live.how === 'live' && live.day === today, 'Extra Innings is minted live, today, at the next read of the profile',
     { live, awards: await awardsOf(db, B), lib: (await q(db, `select ref, day::text from public.career_facts where athlete_id = $1 and kind = 'library_session' and void_at is null order by day`, [B])).rows,
       paid: (await q(db, `select ref from public.career_facts_paid($1) where kind = 'library_session'`, [B])).rows.length });
  ok(await val(db, `select count(*)::int from public.career_recognition where athlete_id = $1 and award_id = 'achievement:extra_innings'`, [B]) === 1, 'its moment waits (a live award has one)');

  section('5. month_held\'s edges, asked of career_achievement_eval() directly');
  const body = { test: 'month_held', reads: 'week_held', weeks: 4 };
  const ev = async (id, b) => val(db, `select public.career_achievement_eval($1, 'full_month', $2::jsonb, '{}'::jsonb, '{}'::jsonb)`, [id, JSON.stringify(b)]);
  const eA = await ev(A, body);
  ok(eA.crossed.length === 1 && eA.crossed[0].day === lastDay(fullA + '-01'), `A: the first full month (${fullA}), on its last day (${eA.crossed[0] && eA.crossed[0].day})`, eA);
  ok((await ev(A, { ...body, weeks: 6 })).crossed.length === 0, 'A: no month has six training weeks ending in it, so weeks = 6 decides nothing');
  for (let k = 1; k <= 4; k++) {
    await q(db, `insert into public.career_facts (athlete_id, kind, ref, day, value, source) values ($1, 'week_held', $2, $3::date, '{}'::jsonb, 'server')`,
            [D, 'c1|w' + k, addDays(addDays(m0, -6), 7 * k - 1)]);
  }
  const wkD = await val(db, `select count(*)::int from public.career_weeks($1) w where date_trunc('month', w.wto)::date = $2::date`, [D, m0]);
  ok(wkD === 4, `D: four training weeks end in this month (${wkD}), each with a week_held fact`);
  ok((await ev(D, body)).crossed.length === 0, 'D: the month is not over, so it is not decided (a cycle published later could add a week)');
  ok((await ev(B, body)).crossed.length === 0, 'B: a month with a broken week, or under four weeks, decides nothing');

  section('6. the cost (budgets: a full evaluate 500 ms, a session save 300 ms)');
  const full = [];
  for (let i = 0; i < 5; i++) {
    await q(db, `update public.career_scores set rewards = null where athlete_id = $1`, [A]);   // the cache would answer at once
    full.push(await ms(() => q(db, `select public.career_evaluate($1, null, 'silent')`, [A])));
  }
  full.sort((a, b) => a - b);
  ok(full[2] < 500, `a full evaluate of A: ${full[2]} ms (median of 5)`);
  const save = await ms(() => insSession(db, A, 1, today, sess()));
  ok(save < 300, `a session save with its partial evaluate: ${save} ms`);

  section('7. the way back, then stage79 again');
  const rb = read(path.join(ROOT, 'scripts', 'career', 'rollback_stage79.sql'));
  await runSql(db, rb, 'rollback79'); await runSql(db, rb, 'rollback79 again');
  const defs1 = await defs(db);
  for (const f of FNS) ok(defs1[f] === defs0[f], `${f.split('(')[0]}() is exactly as before stage79`);
  const nAfter = await val(db, `select count(*)::int from public.career_awards`);
  await q(db, `select public.career_evaluate($1, null, 'silent')`, [A]);
  ok(await val(db, `select count(*)::int from public.career_awards`) === nAfter, 'with the functions back, an evaluate mints nothing more (the three tests decide nothing) and takes nothing back');
  await runSql(db, stage, 'stage79 after the way back');
  ok(true, 'stage79 goes on again after the way back');

  section('8. stage80: get_achievements(), what the Four Courts section reads');
  const st80 = read(path.join(ROOT, 'supabase', 'stage80_career_achievements_read.sql'));
  await runSql(db, st80, 'stage80'); await runSql(db, st80, 'stage80 again');
  let gA = null;
  const tGet = await ms(async () => { gA = await val(db, `select public.get_achievements($1)`, [A]); });
  ok(gA && gA.ready === true && Array.isArray(gA.items), 'it answers for A, ready', gA && Object.keys(gA));
  ok(tGet < 300, `in ${tGet} ms (budget 300)`);
  const byId = Object.fromEntries(gA.items.map(i => [i.id, i]));
  const earnedA = (await awardsOf(db, A)).map(a => a.item).sort();
  ok(JSON.stringify(gA.items.filter(i => i.day).map(i => i.id).sort()) === JSON.stringify(earnedA), 'every achievement A holds is there with its day, and no other has a day', { got: gA.items.filter(i => i.day).map(i => i.id), earnedA });
  ok(gA.items.filter(i => i.day).every(i => i.have === undefined && i.need === undefined), 'an earned one carries no progress');
  ok(byId.half_year && byId.half_year.have === 3 && byId.half_year.need === 6 && byId.year_one.have === 3 && byId.year_one.need === 12,
     'Half Year 3 of 6 and Year One 3 of 12 (three whole months with Amir)', [byId.half_year, byId.year_one]);
  ok(byId.moving_up && byId.moving_up.have === 0 && byId.moving_up.need === 1, 'a "first" one not yet done: 0 of 1', byId.moving_up);
  ok(!byId.clean_sheet && !byId.the_machinist, 'one with nothing left to earn it by (First Treble: missions are gone; The Machinist: retired) is left out unless held');
  ok(gA.next && gA.next.id === 'half_year', `Next up is the furthest along: ${gA.next && gA.next.id}`, gA.next);
  ok(['consistency', 'commitment', 'progress', 'resilience'].every(k => gA.items.some(i => i.meaning === k)) && gA.items.every(i => i.meaning && i.name && (i.rule || i.caption)),
     'every item has its kind, a name and words for what earns it; all four kinds have some');
  const gB = await val(db, `select public.get_achievements($1)`, [B]);
  const bB = Object.fromEntries(gB.items.map(i => [i.id, i]));
  ok(bB.back_to_back && bB.back_to_back.have === 0 && bB.back_to_back.need === 2, 'B: Back to Back reads the CURRENT run, 0 of 2 (its one held week was followed by a broken one)', bB.back_to_back);
  ok(bB.extra_innings && bB.extra_innings.day === today, 'B: Extra Innings, earned today in section 4, has its day', bB.extra_innings);
  ok(gB.next && gB.next.id === 'back_to_back', `B, with no progress anywhere: Next up is the easiest consistency step, Back to Back, never a resilience one or The Distance (${gB.next && gB.next.id})`, gB.next);
  ok(gB.month && typeof gB.month.weeks === 'number' && typeof gB.month.spoilt === 'boolean', 'it says this month\'s weeks for the nudge', gB.month);
  await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage80.sql')), 'rollback80');
  ok(await val(db, `select to_regprocedure('public.get_achievements(text)')::text`) === null, 'the way back drops it');
  await runSql(db, st80, 'stage80 after the way back');
  ok(await val(db, `select to_regprocedure('public.get_achievements(text)')::text`) !== null, 'stage80 goes on again after the way back');

  console.log(`\n${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (failed) { console.log('\nFailed:\n  ' + fails.join('\n  ')); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(2); });
