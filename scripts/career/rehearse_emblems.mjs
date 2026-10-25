// Rehearses supabase/stage99_emblem_cabinet.sql (D21, the three new tests on_dates / slam_year / clock, the list form of `total`, the finish time
// `fin`, and what get_achievements() gives the cabinet) and rulebook version 11 (the 33 new achievements) on PGlite. Nothing live, no real athlete.
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/career/rehearse_emblems.mjs
//
// The live structure (supabase/schema_snapshot.sql, which holds stages 66 to 98 and not 99), the rulebook and catalogue as they are live (career/*.toml
// at the commit this work started from, c6e429f7 = rulebook version 10, or --rev), made-up athletes whose sessions go in through the real triggers and
// the real save_session(); then:
//   1. stage99 twice, under version 10: nothing moves; `fin` is kept by the FIRST save only, dropped when it is not a time, and a save never fails
//      because of it (an old server, before the stage, ignores it too); the session fact carries it;
//   2. version 11 from the working tree, starting today with every paid_from set to today (the go-live edit): career_seed() takes it (D20 holds);
//   3. D21, the back-fill: one silent career_rewards_batch() pass mints every new achievement the athletes already did, at 0 XP, silent (no moment),
//      dated today and earned_on the real day, EXACTLY the ones an independent oracle (JS, from the toml's own numbers) says; nobody's XP, level,
//      season or week moves, the fingerprint of the paid facts is the same, career_compare() is ok;
//   4. D21, the live path: a win on the seed day pays the catalogue XP (Early Bird 100, 5 Sessions 80, an old achievement its own XP), a win done the
//      day before the seed and synced after it is won at 0 XP, the clock test at its edges, first fin wins, a fin that arrives on a later save wakes it;
//   5. later back-fills and the repeat counts: a personal best / retest / perfect day fact dated before the seed mints at 0 XP, one dated today pays,
//      an old achievement (no paid_from) pays as ever;
//   6. get_achievements(): done_on, xp_won, times (only 2 or more), reads as the list it is, have/need for the new tests, Next up never a calendar one;
//   7. the cost (a full evaluate 500 ms, a session save 300 ms; PGlite is slower than the project);
//   8. the way back (scripts/career/rollback_stage99.sql) puts every patched function back EXACTLY and drops the column; stage99 again after it.
// Who gets what on the live project is a dry run inside a rolled-back transaction (career/PROCEDURES.md → Stage 99 → To apply).
import path from 'node:path';
import fs from 'node:fs';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, py, filesAt, withRulebook, snapshotWithout } from './rehearse_lib.mjs';

let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => { if (c) { passed++; console.log('  ok   ' + what); } else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 700) : '')); } };
const info = s => console.log('  ·    ' + s);
const section = s => console.log('\n' + s);
const q = (db, sql, p) => db.query(sql, p || []);
const one = async (db, sql, p) => (await q(db, sql, p)).rows[0];
const val = async (db, sql, p) => { const r = await one(db, sql, p); return r ? Object.values(r)[0] : null; };
const ymd = d => d.toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const ms = async fn => { const t = performance.now(); await fn(); return Math.round((performance.now() - t) * 10) / 10; };
const revArg = (() => { const i = process.argv.indexOf('--rev'); return i > 0 ? process.argv[i + 1] : 'c6e429f7'; })();
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// the functions stage99 patches, and the ones it makes
const PATCHED = ['save_session(text,text,integer,date,jsonb,text)', 'career_session_want(text,integer,date)', 'career_entry_keys(text,jsonb,jsonb)',
                 'career_entry_kinds(text,jsonb)', 'career_achievement_eval(text,text,jsonb,jsonb,jsonb)',
                 'career_mint(text,text,text,integer,text,date,jsonb,jsonb,jsonb,text,jsonb)', 'get_achievements(text)'];
const defs = async db => { const o = {}; for (const f of PATCHED) o[f] = await val(db, `select pg_get_functiondef('public.${f}'::regprocedure)`); return o; };

const ANSWERED = { composite: 4, sleep: 4, energy: 4, soreness: 4, stress: 3, overall: 4, skipped: false };
const sess = ({ checkin = true, full = true, status = 'Complete' } = {}) => ({
  status, duration_min: 45, readiness: checkin ? ANSWERED : { skipped: true, composite: null },
  log: [{ ex: 'Goblet Squat', sets: [{ w: '40', n: 8, r: full ? 7 : '', d: true }, { w: '40', n: 8, r: full ? 7 : '', d: true }] }] });
const prog = (start, end, days) => ({ athlete: { firstName: 'Zed', lastName: 'Test' }, currentCycleIndex: 0,
  cycles: [{ num: 1, startDate: start, endDate: end }], workouts: { days: days.map(id => ({ id, blocks: [] })) } });
// a session straight into the table (the real triggers fire); no `fin`
async function insSession(db, id, day, on, s = sess()) {
  await q(db, `insert into public.session_history (athlete_id, athlete_name, day, completed_on, status, duration_min, readiness, log)
               values ($1, 'Zed', $2, $3::date, $4, $5, $6::jsonb, $7::jsonb) on conflict (athlete_id, day, completed_on) do update set log = excluded.log`,
          [id, day, on, s.status, s.duration_min, JSON.stringify(s.readiness), JSON.stringify(s.log)]);
}
// a session through the real save_session(), as the phone sends it (an athlete's key, not the coach's login)
const keyed = new Set();
async function save(db, id, day, on, s = sess(), extra = {}) {
  if (!keyed.has(id)) { await q(db, `insert into public.athlete_keys (athlete_id, secret_key) values ($1, 'k-' || $1)`, [id]); keyed.add(id); }
  await q(db, `select public.save_session($1, 'Zed', $2, $3::date, $4::jsonb, 'k-' || $1)`, [id, day, on, JSON.stringify({ ...s, ...extra })]);
}
const numbers = async (db, id) => {
  const c = await val(db, `select public.career_compute($1)`, [id]);
  return { xp: Number(c.career.xp), level: c.career.level, season: Number(c.season.points), week: Number(c.week.points) };
};
// the fingerprint of what an athlete is paid for: every paid fact and award that carries XP (an award of 0 is a line that pays nothing)
const finger = async (db, id) => val(db, `select md5(coalesce(string_agg(p.kind || '|' || p.ref || '|' || p.day::text || '|' || p.xp::text || '|' || p.career_only::text, ',' order by p.kind, p.ref), ''))
                                           from public.career_facts_paid($1) p where p.xp <> 0`, [id]);
const awardsOf = async (db, id) => (await q(db, `select item, day::text as day, earned_on::text as earned_on, how, xp, pays, rules_version from public.career_awards where athlete_id = $1 and kind = 'achievement' order by item`, [id])).rows;
const facts = async (db, id, kinds) => (await q(db, `select kind, ref, day::text as day, value from public.career_facts where athlete_id = $1 and kind = any($2) and void_at is null order by day, ref`, [id, kinds])).rows;

async function main() {
  const t0 = Date.now();
  const db = await openDb();
  const today = await val(db, `select current_date::text`);
  const yesterday = addDays(today, -1);
  section('0. the live structure, the live catalogue (career/*.toml at ' + revArg + '), made-up athletes through the real triggers');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/stage99/);
  info('the structure starts from ' + snap.says);
  ok(!/stage99/.test(snap.sql) && /earned_on date/.test(snap.sql) && /get_achievements/.test(snap.sql), 'the snapshot it starts from holds stages 95 and 80 and not stage99');
  await runSql(db, snap.sql, 'snapshot');
  const xpRow = JSON.parse(read(path.join(ROOT, 'supabase', 'xp_rules_snapshot.json')));
  await q(db, `insert into public.xp_rules (id, rules) values (1, $1::jsonb)`, [JSON.stringify(xpRow.rules)]);
  const oldDir = filesAt(revArg);
  const old = py([path.join(oldDir, 'scripts', 'career_seed.py'), path.join(oldDir, 'career'), '--json']);
  if (old.status !== 0) throw new Error('career_seed.py --json at ' + revArg + ' failed: ' + old.stderr);
  const P10 = JSON.parse(old.stdout);
  const nAch10 = P10.catalogue.filter(r => r.kind === 'achievement').length;
  ok(P10.version === 10 && nAch10 === 65, `the live catalogue: version ${P10.version}, ${nAch10} achievements`);
  await q(db, `insert into public.career_rules (version, rules, source, loaded_at, starts_on) values ($1, $2::jsonb, 'rehearsal', now(), null)`, [P10.version, JSON.stringify(P10.rules)]);
  await q(db, `insert into public.career_catalogue (kind, id, body, version, loaded_at) select x.kind, x.id, x.body, $2, now() from jsonb_to_recordset($1::jsonb) as x(kind text, id text, body jsonb)`, [JSON.stringify(P10.catalogue), P10.version]);
  await q(db, `insert into public.seasons (starts_on, name) values ($1::date, 'Season 1')`, [addDays(today, -1)]);

  // the working tree's version 11, starting today with every paid_from today (what the go-live edit does), read now so the oracle uses the toml's numbers
  const newDir = filesAt(null);
  withRulebook(newDir, t => t.replace(/starts_on = "\d{4}-\d{2}-\d{2}"/, `starts_on = "${today}"`));
  const achFile = path.join(newDir, 'career', 'achievements.toml');
  fs.writeFileSync(achFile, fs.readFileSync(achFile, 'utf8').replace(/paid_from = "\d{4}-\d{2}-\d{2}"/g, `paid_from = "${today}"`));
  const s11 = py([path.join(newDir, 'scripts', 'career_seed.py'), path.join(newDir, 'career'), '--json']);
  if (s11.status !== 0) throw new Error('career_seed.py --json (version 11) failed: ' + s11.stderr);
  const P11 = JSON.parse(s11.stdout);
  const ach = Object.fromEntries(P11.catalogue.filter(r => r.kind === 'achievement').map(r => [r.id, r.body]));
  const NEW = Object.keys(ach).filter(id => ach[id].added_in === 11).sort();
  ok(P11.version === 11 && P11.rules.starts_on === today && NEW.length === 33 && NEW.every(id => ach[id].paid_from === today),
     `version 11, starting today (${P11.rules.starts_on}): 33 new achievements, each with paid_from = today`, { v: P11.version, n: NEW.length });
  const sessIds = NEW.filter(id => id.startsWith('sessions_')), weekIds = NEW.filter(id => ach[id].test === 'best_run'), totalIds = NEW.filter(id => ach[id].test === 'total');
  const dateIds = NEW.filter(id => ach[id].test === 'on_dates'), clockIds = NEW.filter(id => ach[id].test === 'clock');
  info(`${sessIds.length} session rungs, ${weekIds.length} week/month runs, ${totalIds.length} totals, ${dateIds.length} date windows, 1 slam year, ${clockIds.length} clocks`);

  // ── the made-up athletes ──
  // A: a three-day plan from 104 days ago; every week held but week 10 (day 3 missed); week 14's day 2 finished early; 41 sessions in 14 plan weeks.
  const S = addDays(today, -104), E = addDays(today, 20);
  const A = 'zz_emb_a', B = 'zz_emb_b', C = 'zz_emb_c', SL = 'zz_emb_s', L = 'zz_emb_l';
  const planA = [];       // every session of A: { on, day, wk }
  await q(db, `insert into public.programs (athlete_id, data) values ($1, $2::jsonb)`, [A, JSON.stringify(prog(S, E, [1, 2, 3]))]);
  for (let k = 1; k <= 14; k++) {
    const w0 = addDays(S, 7 * (k - 1));
    for (const [d, off] of [[1, 0], [2, 2], [3, 4]]) {
      if (k === 10 && d === 3) continue;
      const on = addDays(w0, off);
      await insSession(db, A, d, on, sess(k === 14 && d === 2 ? { status: 'Partial (3 of 5)' } : {}));
      planA.push({ on, day: d, wk: 'w' + k });
    }
  }
  // B: a one-day plan from 20 days ago; day 1 done on SB+1 and again on SB+3 (the same plan week: it pays once), then SB+8 and SB+15
  const SB = addDays(today, -20);
  await q(db, `insert into public.programs (athlete_id, data) values ($1, $2::jsonb)`, [B, JSON.stringify(prog(SB, addDays(today, 30), [1]))]);
  const planB = [{ on: addDays(SB, 1), day: 1, wk: 'w1' }, { on: addDays(SB, 3), day: 1, wk: 'w1' }, { on: addDays(SB, 8), day: 1, wk: 'w2' }, { on: addDays(SB, 15), day: 1, wk: 'w3' }];
  for (const s of planB) await insSession(db, B, s.day, s.on, sess({ checkin: false }));
  // C: no plan; ten sessions on fixed days of 2024 and 2025 (each its own plan day), on both sides of the edges of the windows
  const planC = [['2024-01-11', 1], ['2024-01-12', 2], ['2024-03-19', 3], ['2024-03-20', 4], ['2024-05-17', 5], ['2024-06-08', 6], ['2024-08-24', 7], ['2024-12-21', 8],
                 ['2025-07-13', 9], ['2025-07-14', 10]].map(([on, day]) => ({ on, day, wk: 'c' + day }));
  for (const s of planC) await insSession(db, C, s.day, s.on, sess());
  // SL: a session in each of the four Slam windows of 2025
  const planS = [['2025-01-20', 1], ['2025-05-20', 2], ['2025-06-25', 3], ['2025-08-30', 4]].map(([on, day]) => ({ on, day, wk: 's' + day }));
  for (const s of planS) await insSession(db, SL, s.day, s.on, sess());
  // L: two sessions long ago (its third will be synced late, after the seed)
  const planL = [[addDays(today, -60), 1], [addDays(today, -50), 2]].map(([on, day]) => ({ on, day, wk: 'l' + day }));
  for (const s of planL) await insSession(db, L, s.day, s.on, sess());
  // T: three sessions TODAY, before the seed runs: the edge of D21 (paid_from is the seed day, inclusive; section 3 asserts what that means)
  const T = 'zz_emb_t';
  for (const d of [1, 2, 3]) await insSession(db, T, d, today, sess());
  const ATHLETES = [A, B, C, SL, L];
  for (const id of ATHLETES) await q(db, `select public.career_scored($1)`, [id]);

  const before = {}, aw0 = {}, fp0 = {};
  for (const id of ATHLETES) { before[id] = await numbers(db, id); aw0[id] = await awardsOf(db, id); fp0[id] = await finger(db, id); }
  const heldA = await val(db, `select count(*)::int from public.career_facts where athlete_id = $1 and kind = 'week_held' and void_at is null`, [A]);
  const brokenA = await val(db, `select string_agg(ref, ',') from public.career_facts where athlete_id = $1 and kind = 'week_broken' and void_at is null`, [A]);
  ok(heldA === 13 && brokenA === 'c1|w10', `the triggers made A's weeks: 13 held, week 10 broken (${heldA}, ${brokenA})`);
  const monthsC = await val(db, `select count(*)::int from public.career_facts where athlete_id = $1 and kind = 'month_with_amir' and void_at is null`, [C]);
  ok(monthsC >= 24, `C has ${monthsC} whole months with Amir, more than the 24 Year Two asks`);
  info('before: A ' + JSON.stringify(before[A]) + ' with ' + aw0[A].length + ' achievements; C ' + JSON.stringify(before[C]));
  const defs0 = await defs(db);
  // an OLD server (before the stage): a save with a `fin` goes through and stores nothing
  await save(db, 'zz_emb_old', 1, yesterday, sess(), { fin: '06:30' });
  ok(await val(db, `select count(*)::int from public.session_history where athlete_id = 'zz_emb_old'`) === 1, 'an old server (before the stage) takes a save that carries a fin and ignores it');
  ok(await val(db, `select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'session_history' and column_name = 'fin'`) === 0, 'there is no fin column yet');

  section('1. stage99, twice, under version 10');
  const stage = read(path.join(ROOT, 'supabase', 'stage99_emblem_cabinet.sql'));
  await runSql(db, stage, 'stage99'); await runSql(db, stage, 'stage99 again');
  ok(true, 'stage99 applied, and applied again without an error');
  const defs1 = await defs(db);
  ok(PATCHED.every(f => defs1[f] !== defs0[f]) && PATCHED.every(f => /stage99|reads_kinds/.test(defs1[f])), 'each of the seven functions carries its patch', PATCHED.filter(f => defs1[f] === defs0[f]));
  ok((await val(db, `select count(*)::int from pg_proc where proname in ('career_reads_kinds', 'career_in_windows', 'career_slam_year')`)) === 3, 'the three helpers exist');
  ok(await val(db, `select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'session_history' and column_name = 'fin'`) === 1, 'session_history.fin exists');
  for (const id of ATHLETES) {
    await q(db, `select public.career_evaluate($1, null, 'silent')`, [id]);
    ok(eq(await numbers(db, id), before[id]) && eq(await awardsOf(db, id), aw0[id]) && (await finger(db, id)) === fp0[id], `${id}: the same numbers, awards and paid facts after an evaluate (no entry uses the new tests yet)`);
  }
  // the finish time, saved through the real save_session()
  const H = 'zz_emb_h';
  await save(db, H, 1, yesterday, sess(), { fin: '06:59' });
  await save(db, H, 1, yesterday, sess({ checkin: false }), { fin: '05:00' });                 // a re-save with another time: the first stays
  await save(db, H, 1, yesterday, { ...sess(), session_rpe: 8, day_note: 'felt good' }, {});   // a re-save with none: the first stays, the rest moves
  const fin1 = await one(db, `select fin, session_rpe, day_note from public.session_history where athlete_id = $1 and day = 1`, [H]);
  ok(fin1.fin === '06:59' && fin1.session_rpe === 8 && fin1.day_note === 'felt good', 'fin: the first value stays through two re-saves, while the rest of the save (RPE, note) moves', fin1);
  const bad = [['abc', 2], ['25:00', 3], ['12:60', 4], [12345, 5], [{}, 6], [[], 7], [null, 8], ['', 9], [' 06:30', 10], ['6:5', 11], [true, 12], ['x'.repeat(5000), 13]];
  let threw = null;
  for (const [v, day] of bad) { try { await save(db, H, day, yesterday, sess(), { fin: v }); } catch (e) { threw = String(e.message || e).split('\n')[0]; } }
  ok(threw === null, 'a save never fails because of fin: not a time, a number, an object, a list, null, empty, a space, 5,000 letters', threw);
  const stored = (await q(db, `select day, fin from public.session_history where athlete_id = $1 and day between 2 and 13 order by day`, [H])).rows;
  ok(stored.length === 12 && stored.every(r => r.fin === null), 'every one of them was stored as null', stored);
  await save(db, H, 14, yesterday, sess(), { fin: '6:05' }); await save(db, H, 15, yesterday, sess(), { fin: '23:59' }); await save(db, H, 16, yesterday, sess(), { fin: '00:00' });
  const norm = (await q(db, `select day, fin from public.session_history where athlete_id = $1 and day >= 14 order by day`, [H])).rows.map(r => r.fin);
  ok(eq(norm, ['06:05', '23:59', '00:00']), 'a time with one digit of hour is written 06:05; 23:59 and 00:00 are times', norm);
  await save(db, H, 17, yesterday, sess(), {});                                                // no fin at all
  await save(db, H, 17, yesterday, sess(), { fin: '08:15' });                                  // ... and a later save brings one: it fills the null
  ok(await val(db, `select fin from public.session_history where athlete_id = $1 and day = 17`, [H]) === '08:15', 'a save that had no fin takes the first one a later save brings');
  const fact = await one(db, `select value from public.career_facts where athlete_id = $1 and kind = 'session_finished' and ref = $2 and void_at is null`, [H, 'd1|' + yesterday]);
  ok(fact && fact.value.fin === '06:59' && fact.value.plan_day === '1', 'the session fact carries the finish time beside its plan day', fact);
  const early = await save(db, H, 18, yesterday, sess({ status: 'Partial (3 of 5)' }), { fin: '10:00' }).then(() => one(db, `select kind, value from public.career_facts where athlete_id = $1 and ref = $2 and void_at is null and kind like 'session_finished%'`, [H, 'd18|' + yesterday]));
  ok(early && early.kind === 'session_finished_early' && early.value.fin === '10:00', 'an early finish carries it too', early);
  ok(await val(db, `select count(*)::int from public.session_history where athlete_id = 'zz_emb_old' and fin is not null`) === 0, 'the session an old server took has no finish time (nobody is back-filled for Early Bird or Night Owl)');
  // the athletes made so far (H is not one of the five) keep their before-numbers across the whole stage; H's saves above are not part of the comparison

  section('2. rulebook version 11 (career/ in the working tree), starting today, every paid_from today');
  const r11 = await val(db, `select public.career_seed($1, $2::jsonb, $3::jsonb, 'rehearsal')`, [P11.version, JSON.stringify(P11.rules), JSON.stringify(P11.catalogue)]);
  ok(r11 && r11.version === 11, 'career_seed() takes it: career_d20_check() lets the 33 new achievements and the new keys through', r11);
  ok(await val(db, `select count(*)::int from public.career_catalogue where kind = 'achievement'`) === 98, 'the catalogue holds 98 achievements');
  for (const id of ATHLETES) ok(eq(await numbers(db, id), before[id]) && (await finger(db, id)) === fp0[id], `${id}: the seed alone moves nothing`);
  // the same version seeded again with a rename only passes (D20); a change of a paid_from is refused
  const rn = JSON.parse(JSON.stringify(P11.catalogue)); rn.find(r => r.id === 'sessions_3').body.caption = 'Three sessions. A rename.';
  ok(!!(await val(db, `select public.career_seed($1, $2::jsonb, $3::jsonb, 'rehearsal')`, [11, JSON.stringify(P11.rules), JSON.stringify(rn)])), 'a rename of a caption at version 11 is let through');
  await val(db, `select public.career_seed($1, $2::jsonb, $3::jsonb, 'rehearsal')`, [11, JSON.stringify(P11.rules), JSON.stringify(P11.catalogue)]);
  const pf = JSON.parse(JSON.stringify(P11.catalogue)); pf.find(r => r.id === 'sessions_3').body.paid_from = addDays(today, -30);
  let refused = null;
  try { await val(db, `select public.career_seed($1, $2::jsonb, $3::jsonb, 'rehearsal')`, [11, JSON.stringify(P11.rules), JSON.stringify(pf)]); } catch (e) { refused = String(e.message || e).split('\n')[0]; }
  ok(refused && /D20/.test(refused), 'a change of a paid_from at version 11 is refused (D20: it is what decides the XP)', refused);

  section('3. D21, the back-fill: one silent pass');
  // the oracle: what each athlete has already done, from the toml's own numbers (never typed here)
  const winsOf = id => (ach[id].windows || []).map(w => ({ from: w.from, to: w.to }));
  const inWin = (iso, wins) => wins.some(w => iso.slice(5) >= w.from && iso.slice(5) <= w.to);
  async function oracle(id, plan, extra = {}) {
    const want = {};
    const mark = (k, day) => { if (day && (!want[k] || day < want[k])) want[k] = day; };
    // sessions: the paid ones (one per plan day per plan week), the at-th by day
    const first = new Map();
    for (const s of plan.slice().sort((a, b) => a.on < b.on ? -1 : 1)) { const k = s.wk.startsWith('w') ? s.wk + '|' + s.day : s.wk; if (!first.has(k)) first.set(k, s.on); }
    const paid = [...first.values()].sort();
    for (const sid of sessIds) mark(sid, paid[ach[sid].at - 1]);
    // weeks: held weeks in a row, walked as the measure walks them
    const wk = await facts(db, id, ['week_held', 'week_broken']);
    let run = 0, best = 0; const hit = {};
    for (const f of wk) { if (f.kind === 'week_held') { run++; if (run > best) { best = run; hit[run] = f.day; } } else run = 0; }
    for (const wid of weekIds) mark(wid, hit[ach[wid].at]);
    // totals over a fact that is not a session: months with Amir, personal bests
    for (const tid of totalIds.filter(t => !t.startsWith('sessions_'))) {
      const rows = await facts(db, id, [ach[tid].reads]);
      mark(tid, rows[ach[tid].at - 1] && rows[ach[tid].at - 1].day);
    }
    // the calendar: the first session in a window; the Slam year; the clock
    const dates = plan.map(s => s.on).sort();
    for (const did of dateIds) mark(did, dates.find(d => inWin(d, winsOf(did))));
    const of = ach.calendar_slam.of; const years = {};
    for (const o of of) for (const d of dates) if (inWin(d, winsOf(o))) { const y = d.slice(0, 4); years[y] = years[y] || {}; if (!years[y][o] || d < years[y][o]) years[y][o] = d; }
    for (const y of Object.keys(years)) if (Object.keys(years[y]).length === of.length) mark('calendar_slam', Object.values(years[y]).sort().pop());
    for (const [cid, day] of Object.entries(extra)) mark(cid, day);
    return want;
  }
  const batch0 = await val(db, `select public.career_rewards_batch(0, 100, 'silent')`);
  ok(batch0 && batch0.ok === true && batch0.n >= ATHLETES.length, 'the silent batch runs for everyone and says ok', { n: batch0 && batch0.n, ok: batch0 && batch0.ok });
  const plans = { [A]: planA, [B]: planB, [C]: planC, [SL]: planS, [L]: planL };
  const gotAll = {};
  for (const id of ATHLETES) {
    const got = (await awardsOf(db, id)).filter(a => NEW.includes(a.item));
    gotAll[id] = got;
    const want = await oracle(id, plans[id]);
    const gotMap = Object.fromEntries(got.map(a => [a.item, a.earned_on]));
    ok(eq(Object.keys(gotMap).sort(), Object.keys(want).sort()), `${id}: exactly the ${Object.keys(want).length} the oracle says it already did`, { got: Object.keys(gotMap).sort().join(','), want: Object.keys(want).sort().join(',') });
    ok(Object.keys(want).every(k => gotMap[k] === want[k]), `${id}: each earned_on is the real day the work was done (not the seed day)`, Object.keys(want).filter(k => gotMap[k] !== want[k]).map(k => `${k}: ${gotMap[k]} ≠ ${want[k]}`));
  }
  const allNew = Object.values(gotAll).flat();
  info('minted: ' + ATHLETES.map(id => id.replace('zz_emb_', '') + ' ' + gotAll[id].length).join(', ') + ' (' + allNew.length + ' in all)');
  ok(allNew.length >= 35, `a real back-fill (${allNew.length} awards across the five)`);
  ok(allNew.every(a => a.xp === 0 && a.how === 'silent' && a.day === today && a.rules_version === 11), 'every one is won at 0 XP, silent, dated today (version 11\'s start day, D20) and minted under version 11', allNew.filter(a => !(a.xp === 0 && a.how === 'silent' && a.day === today)).slice(0, 4));
  ok(allNew.some(a => a.earned_on < today), 'and their earned_on is the day of the work, before today');
  ok(await val(db, `select count(*)::int from public.career_recognition where award_id = any($1)`, [NEW.map(id => 'achievement:' + id)]) === 0, 'no moment waits and no Bell rings for any of them');
  const aT = Object.fromEntries((await awardsOf(db, T)).map(a => [a.item, a]));
  ok(aT.sessions_3 && aT.sessions_3.earned_on === today && aT.sessions_3.xp === 60 && aT.sessions_3.how === 'silent',
     'the seed-day edge: T trained three times TODAY, before the seed ran. paid_from is the seed day, inclusive, so 3 Sessions pays its 60 XP at the back-fill, silently. (A go-live that must move nobody at all sets paid_from to the day AFTER the seed.)', aT.sessions_3);
  for (const id of ATHLETES) {
    await q(db, `select public.career_scored($1, true)`, [id]);
    ok(eq(await numbers(db, id), before[id]), `${id}: career XP, level, the season's and the week's points are the same before and after the seed and back-fill`, { before: before[id], after: await numbers(db, id) });
    ok((await finger(db, id)) === fp0[id], `${id}: the fingerprint of the paid facts is the same`);
    ok(eq((await awardsOf(db, id)).filter(a => !NEW.includes(a.item)), aw0[id]), `${id}: the awards held before are untouched`);
  }
  const cmp = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp && cmp.ok === true, 'career_compare() is ok', cmp && Object.keys(cmp));
  const nAw = await val(db, `select count(*)::int from public.career_awards`);
  await val(db, `select public.career_rewards_batch(0, 100, 'silent')`);
  ok(await val(db, `select count(*)::int from public.career_awards`) === nAw, 'a second pass mints nothing');
  // the capped count is the badge's: B has four sessions, two in one plan week, and three paid
  const b3 = gotAll[B].find(a => a.item === 'sessions_3');
  ok(b3 && b3.earned_on === addDays(SB, 15), `B: 3 Sessions crosses on its third PAID session (${addDays(SB, 15)}), the repeated plan day counting once, as Century counts`, b3);
  const slamS = gotAll[SL].find(a => a.item === 'calendar_slam');
  ok(slamS && slamS.earned_on === '2025-08-30', 'S: Calendar Slam on the day the fourth window was entered (2025-08-30)', slamS);
  ok(!gotAll[C].some(a => a.item === 'calendar_slam') && gotAll[C].some(a => a.item === 'the_lawns'), 'C: three windows in 2024 and The Lawns in 2025 is not a Slam year, but is The Lawns');
  const edges = Object.fromEntries(gotAll[C].map(a => [a.item, a.earned_on]));
  ok(edges.down_under === '2024-01-12' && edges.nowruz === '2024-03-20' && edges.red_clay === '2024-06-08' && edges.big_apple === '2024-08-24' && edges.yalda === '2024-12-21' && edges.the_lawns === '2025-07-13',
     'C: the windows are inclusive at both ends and every year (Jan 12, Mar 20, Jun 8, Aug 24, Dec 21, Jul 13), and the day before / after one does not count', edges);
  const evA = (await q(db, `select evidence from public.career_awards where athlete_id = $1 and item = 'sessions_40'`, [A])).rows[0];
  ok(evA && evA.evidence.via === 'count:session_finished,session_finished_early' && evA.evidence.n === 40, 'A: 40 Sessions reads the same measure as Century (count:session_finished,session_finished_early)', evA);

  section('4. D21, the live path: a win on the seed day pays, a win done before it does not');
  // L: the third session is synced late, dated yesterday (before paid_from); the fourth and fifth are today
  await save(db, L, 3, yesterday, sess());
  let aL = Object.fromEntries((await awardsOf(db, L)).map(a => [a.item, a]));
  ok(aL.sessions_3 && aL.sessions_3.xp === 0 && aL.sessions_3.earned_on === yesterday && aL.sessions_3.how === 'live', 'L: 3 Sessions, done yesterday and synced today, is WON at 0 XP (earned_on yesterday)', aL.sessions_3);
  await save(db, L, 4, today, sess());
  await save(db, L, 5, today, sess());
  aL = Object.fromEntries((await awardsOf(db, L)).map(a => [a.item, a]));
  ok(aL.sessions_5 && aL.sessions_5.xp === 80 && aL.sessions_5.earned_on === today && aL.sessions_5.how === 'live', 'L: 5 Sessions, done today, pays its 80 XP, live', aL.sessions_5);
  ok(aL.sessions_5 && await val(db, `select count(*)::int from public.career_recognition where athlete_id = $1 and award_id = 'achievement:sessions_5'`, [L]) === 1, 'and its moment waits (a live win has one)');
  ok(aL.sessions_3 && aL.sessions_3.xp === 0, 'the 0-XP win of yesterday stays 0 after the later ones');
  // the clock, each athlete its own session today (a plan day apiece)
  const K = {};
  const clocks = { b: ['06:59', true, false], a: ['07:00', false, false], d: ['21:00', false, true], c: ['20:59', false, false], e: [undefined, false, false], m: ['00:30', true, false], n: ['23:59', false, true] };
  for (const [k, [fin, early, night]] of Object.entries(clocks)) {
    K[k] = 'zz_emb_k' + k;
    await save(db, K[k], 1, today, sess(), fin === undefined ? {} : { fin });
    const a = Object.fromEntries((await awardsOf(db, K[k])).map(x => [x.item, x]));
    ok(!!a.early_bird === early && !!a.night_owl === night, `fin ${fin === undefined ? 'left out' : fin}: ${early ? 'Early Bird' : night ? 'Night Owl' : 'neither'}`, Object.keys(a));
    if (early) ok(a.early_bird.xp === 100 && a.early_bird.how === 'live' && a.early_bird.earned_on === today, `  Early Bird pays its 100 XP, live, done today`, a.early_bird);
    if (night) ok(a.night_owl.xp === 100 && a.night_owl.how === 'live', `  Night Owl pays its 100 XP, live`, a.night_owl);
  }
  // an old achievement (no paid_from) next to a new one, the same athlete, the same day: its own XP, untouched by D21
  const aKb = Object.fromEntries((await awardsOf(db, K.b)).map(x => [x.item, x]));
  const oldOne = Object.values(aKb).find(x => !NEW.includes(x.item) && x.xp > 0);
  ok(oldOne && ach[oldOne.item] && ach[oldOne.item].paid_from === undefined && oldOne.xp === ach[oldOne.item].xp, `an achievement without paid_from pays as ever (${oldOne && oldOne.item} ${oldOne && oldOne.xp} XP)`, aKb);
  // first fin wins, and a fin that arrives on a later save wakes the test
  const G = 'zz_emb_kg', F = 'zz_emb_kf';
  await save(db, G, 1, today, sess(), { fin: '08:00' });
  await save(db, G, 1, today, sess(), { fin: '05:00' });
  ok(await val(db, `select fin from public.session_history where athlete_id = $1`, [G]) === '08:00' && !(await awardsOf(db, G)).some(a => a.item === 'early_bird'), 'a second save with an earlier time does not move it: no Early Bird');
  await save(db, F, 1, today, sess(), {});
  ok(!(await awardsOf(db, F)).some(a => a.item === 'early_bird'), 'a session saved with no time earns nothing yet');
  await save(db, F, 1, today, sess(), { fin: '05:30' });
  const aF = (await awardsOf(db, F)).find(a => a.item === 'early_bird');
  ok(aF && aF.xp === 100, 'the time arriving on a LATER save changes the session fact and wakes Early Bird (it pays: done today)', aF);
  // a voided / hidden session: no fact, no win
  const Hd = 'zz_emb_kh';
  await save(db, Hd, 1, today, sess(), { fin: '05:30' });
  ok((await awardsOf(db, Hd)).some(a => a.item === 'early_bird'), 'control: a session finished at 05:30 is an Early Bird');

  section('5. later back-fills, the repeat counts, and an old achievement');
  // P: facts dated BEFORE the seed day arrive after it (an import), then facts dated today. No derive runs for P, so they stay.
  const P = 'zz_emb_p';
  await insSession(db, P, 1, addDays(today, -40), sess());
  const ins = (kind, ref, day) => q(db, `insert into public.career_facts (athlete_id, kind, ref, day, value, source) values ($1, $2, $3, $4::date, '{}'::jsonb, 'server')`, [P, kind, ref, day]);
  for (let i = 1; i <= 3; i++) await ins('personal_best', 'pb' + i, addDays(today, -30 - i));
  for (let i = 1; i <= 2; i++) { await ins('retest_beaten', 'rt' + i, addDays(today, -20 - i)); await ins('bounce_back', 'bb' + i, addDays(today, -10 - i)); }
  for (let i = 1; i <= 3; i++) await ins('perfect_day', 'pd' + i, addDays(today, -5 - i));
  await q(db, `select public.career_evaluate($1, null, 'silent')`, [P]);
  const aP = Object.fromEntries((await awardsOf(db, P)).map(a => [a.item, a]));
  ok(aP.bests_3 && aP.bests_3.xp === 0 && aP.bests_3.earned_on === addDays(today, -31) && aP.bests_3.how === 'silent', 'P: 3 Personal Bests, done before the seed day, is won at 0 XP on the day of the third best', aP.bests_3);
  ok(aP.rematch_won && aP.rematch_won.xp === ach.rematch_won.xp && aP.rematch_won.xp > 0, `P: Rematch Won has no paid_from: it pays its ${ach.rematch_won.xp} XP as it always has (D21 touches only the new)`, aP.rematch_won);
  ok(aP.rebound && aP.complete_day, 'P: Bounce Back and Clean Sweep I are won (old entries)');
  for (let i = 4; i <= 15; i++) await ins('personal_best', 'pb' + i, i < 15 ? addDays(today, -30 - i) : today);
  await q(db, `select public.career_evaluate($1, null, 'silent')`, [P]);
  const aP2 = Object.fromEntries((await awardsOf(db, P)).map(a => [a.item, a]));
  ok(aP2.bests_15 && aP2.bests_15.xp === ach.bests_15.xp && aP2.bests_15.earned_on === today, `P: the 15th personal best is done TODAY: 15 Personal Bests pays its ${ach.bests_15.xp} XP`, aP2.bests_15);
  ok(aP2.bests_3 && aP2.bests_3.xp === 0, 'and 3 Personal Bests stays at 0');
  ok(!aP2.bests_75, 'no 75 Personal Bests');

  section('6. get_achievements(): what the cabinet reads');
  let gA = null, gC = null, gP = null, gK = null;
  const tGet = await ms(async () => { gA = await val(db, `select public.get_achievements($1)`, [A]); });
  gC = await val(db, `select public.get_achievements($1)`, [C]); gP = await val(db, `select public.get_achievements($1)`, [P]); gK = await val(db, `select public.get_achievements($1)`, [K.b]);
  const by = g => Object.fromEntries(g.items.map(i => [i.id, i]));
  const iA = by(gA), iC = by(gC), iP = by(gP), iK = by(gK);
  ok(gA.ready === true && gA.items.length >= 96, `it answers for A, ready, ${gA.items.length} items`, gA.items.length);
  ok(tGet < 400, `in ${tGet} ms (budget 400 on PGlite)`);
  ok(iA.sessions_40 && iA.sessions_40.day === today && iA.sessions_40.done_on === planA.map(s => s.on).sort()[39] && iA.sessions_40.xp_won === 0,
     'A: 40 Sessions has day = the seed day, done_on = the day of the 40th session, xp_won 0', iA.sessions_40);
  ok(iA.held && iA.held.times === 13 && iA.held.xp_won > 0 && iA.held.done_on, 'A: Held, an old award, says "13 times" (13 week_held facts), xp_won above 0 and its done_on', iA.held);
  ok(iA.rebound && iA.rebound.times === undefined, 'A: Bounce Back came once: no times', iA.rebound);
  ok(iP.rebound && iP.rebound.times === 2 && iP.rematch_won.times === 2 && iP.complete_day.times === 3, 'P: Bounce Back 2, Rematch Won 2, Clean Sweep I 3 times', { r: iP.rebound && iP.rebound.times, m: iP.rematch_won && iP.rematch_won.times, c: iP.complete_day && iP.complete_day.times });
  ok(iP.bests_15 && iP.bests_15.xp_won === ach.bests_15.xp && iP.bests_3.xp_won === 0, 'P: xp_won is what each was minted with (15 Personal Bests its XP, 3 Personal Bests 0)', [iP.bests_15, iP.bests_3]);
  ok(iK.early_bird && iK.early_bird.xp_won === 100 && iK.early_bird.done_on === today, 'K: Early Bird xp_won 100, done today', iK.early_bird);
  ok(iA.every_rep_counted && iA.every_rep_counted.times === undefined, 'an entry that names no `repeats` never says times');
  ok(gA.items.every(i => i.times === undefined || i.times >= 2), 'times is only ever 2 or more');
  ok(Array.isArray(iA.sessions_40.reads) && eq(iA.sessions_40.reads, ['session_finished', 'session_finished_early']) && iA.held.reads === 'week_held', 'reads comes back as it is in the toml: a list for the session rungs, a word for the rest', [iA.sessions_40.reads, iA.held.reads]);
  ok(iC.sessions_15 && iC.sessions_15.have === 10 && iC.sessions_15.need === 15 && iC.sessions_15.day === undefined, 'C: 15 Sessions, not won: 10 of 15 (the list read, as Century counts)', iC.sessions_15);
  ok(iC.calendar_slam && iC.calendar_slam.have === 3 && iC.calendar_slam.need === 4 && iC.calendar_slam.day === undefined, 'C: Calendar Slam 3 of 4 (the best year has three windows)', iC.calendar_slam);
  ok(iC.down_under && iC.down_under.day === today && iC.down_under.done_on === '2024-01-12', 'C: Down Under won, done on 2024-01-12', iC.down_under);
  ok(iC.yalda && iC.yalda.test === 'on_dates' && iK.yalda && iK.yalda.have === 0 && iK.yalda.need === 1, 'K: Yalda, not won, is 0 of 1', iK.yalda);
  ok(iK.night_owl && iK.night_owl.have === 0 && iK.night_owl.need === 1 && iK.night_owl.test === 'clock', 'K: Night Owl, not won, is 0 of 1', iK.night_owl);
  ok(iC.year_two && iC.year_two.day && iC.year_two.xp_won === 0, 'C: Year Two won at 0 XP (it reads the months with Amir)', iC.year_two);
  const iB = by(await val(db, `select public.get_achievements($1)`, [B]));
  ok(iB.year_two && iB.year_two.have === 0 && iB.year_two.need === 24 && iB.weeks_3 && iB.weeks_3.day && iB.weeks_5 && iB.weeks_5.have === 3 && iB.weeks_5.need === 5 && iB.months_4.have === 3 && iB.months_4.need === 16,
     'B: Year Two 0 of 24; three plan weeks held in a row won 3 Weeks in a Row, so 5 Weeks in a Row is 3 of 5 and 4 Months in a Row 3 of 16 (the run is the current one)', [iB.year_two, iB.weeks_5, iB.months_4]);
  const calendarish = ['on_dates', 'slam_year', 'clock'];
  ok(gC.next && !calendarish.includes(gC.next.test) && gC.next.id === 'sessions_15', `C: Next up is the furthest along that anyone can work on (${gC.next && gC.next.id}), never Calendar Slam at 3 of 4`, gC.next);
  for (const [n, g] of [['A', gA], ['P', gP], ['K', gK]]) ok(!g.next || !calendarish.includes(g.next.test), `${n}: Next up is never a calendar or clock one (${g.next && g.next.id})`);
  const gX = await val(db, `select public.get_achievements($1)`, ['zz_emb_nobody']);
  ok(gX.ready === true && gX.items.length >= 90 && gX.next && !calendarish.includes(gX.next.test), 'an athlete with no history still gets the whole list and a Next up', gX.next && gX.next.id);

  // the other two reads of the same awards still answer, and a back-filled award shows as the 0 XP it was
  const profA = await val(db, `select public.get_profile($1)`, [A]);
  const awdA = await val(db, `select public.get_awards($1)`, [A]);
  ok(profA && profA.career && JSON.stringify(profA).length < 14000, `get_profile() still answers inside its 14 KB budget (${JSON.stringify(profA).length} bytes)`);
  const awItem = (awdA.achievements || []).find(x => x.id === 'sessions_40' || x.item === 'sessions_40');
  ok(awdA && Array.isArray(awdA.achievements) && awItem && awItem.day === today, 'get_awards() lists 40 Sessions on the shelf, dated the seed day (a back-filled award is a trophy like any other)', awItem || Object.keys(awdA));
  const cmp2 = (await one(db, `select public.career_compare() as r`)).r;
  ok(cmp2 && cmp2.ok === true, 'career_compare() is still ok after the live wins and the later back-fills');

  section('7. the cost (budgets: a full evaluate 500 ms, a session save 300 ms; PGlite is the slower)');
  const full = [];
  for (let i = 0; i < 5; i++) {
    await q(db, `update public.career_scores set rewards = null where athlete_id = $1`, [A]);
    full.push(await ms(() => q(db, `select public.career_evaluate($1, null, 'silent')`, [A])));
  }
  full.sort((a, b) => a - b);
  ok(full[2] < 500, `a full evaluate of A (98 entries, 90 won): ${full[2]} ms (median of 5)`);
  const U = 'zz_emb_u';
  for (let i = 1; i <= 6; i++) await save(db, U, i, addDays(today, -100 + i), sess());
  const saves = [];
  for (let i = 0; i < 5; i++) saves.push(await ms(() => save(db, U, 20 + i, today, sess(), { fin: '12:00' })));
  saves.sort((a, b) => a - b);
  ok(saves[2] < 300, `a session save with its partial evaluate: ${saves[2]} ms (median of 5)`);

  section('8. the way back, then stage99 again');
  const rb = read(path.join(ROOT, 'scripts', 'career', 'rollback_stage99.sql'));
  const finBefore = await val(db, `select count(*)::int from public.session_history where fin is not null`);
  info(`${finBefore} finish times exist now; the way back drops the column`);
  await runSql(db, rb, 'rollback99'); await runSql(db, rb, 'rollback99 again');
  const defs2 = await defs(db);
  for (const f of PATCHED) ok(defs2[f] === defs0[f], `${f.split('(')[0]}() is exactly as before stage99`);
  ok((await val(db, `select count(*)::int from pg_proc where proname in ('career_reads_kinds', 'career_in_windows', 'career_slam_year')`)) === 0, 'the three helpers are gone');
  ok(await val(db, `select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'session_history' and column_name = 'fin'`) === 0, 'session_history.fin is gone');
  const nAfter = await val(db, `select count(*)::int from public.career_awards`);
  await q(db, `select public.career_evaluate($1, null, 'silent')`, [A]);
  ok(await val(db, `select count(*)::int from public.career_awards`) === nAfter, 'with the functions back, an evaluate mints nothing more and takes nothing back (the three new tests decide nothing)');
  await save(db, 'zz_emb_after', 1, today, sess(), { fin: '06:00' });
  ok(await val(db, `select count(*)::int from public.session_history where athlete_id = 'zz_emb_after'`) === 1, 'a save that carries a fin still goes through');
  await runSql(db, stage, 'stage99 after the way back');
  ok(true, 'stage99 goes on again after the way back');
  const defs3 = await defs(db);
  ok(PATCHED.every(f => defs3[f] === defs1[f]), 'and the seven functions are exactly as the first time');

  console.log(`\n${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (failed) { console.log('\nFailed:\n  ' + fails.join('\n  ')); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(2); });
