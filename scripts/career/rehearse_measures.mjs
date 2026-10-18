// stage72 (a lift's numbers in its own measure) rehearsed away from the live project: career_w(), career_entry_sets(), career_win_gain() and
// career_cycle_wins() in the database against program.html's weightOf(), setsMeasure(), histBestSet(), cycleBestSet(), winText() and cycleWins(),
// which they copy (CLAUDE.md, things that exist twice). career_derive() and the made-up athletes are in scripts/career/rehearse.mjs.
//
//     PGLITE=<scratch>/node_modules/@electric-sql/pglite node scripts/career/rehearse_measures.mjs
//
// Nothing here touches a real project. It builds a bare database with the helpers Career Mode's lift maths reads (copied from stage66 and
// stage71), a minimal session_history, the stage66 functions kept as career_*_old() (so "what the old functions said" is on the table), applies
// supabase/stage72_weight_measures.sql twice (it must be safe to re-run), and then
//   1. weightOf() against career_w() / career_wn() / career_wu(), on the hand-written weights of scripts/check_twins.js (MEASURE_CASES, the one
//      table both guards share) and on thousands generated (every number form × every unit word × text before and after);
//   2. the pinned exercises and wins of MEASURE_CASES, answered by the database as they are by program.html;
//   3. hundreds of GENERATED session logs (kilograms, pounds, plates, a mixture inside one exercise, no weight, holds, ticks, circuits), the same
//      log through program.html's cycleBestSet() / histBestSet() / cycleWins() and through career_entry_sets() / career_cycle_wins(), number by
//      number. The server pays a subset of what the card shows (GAME-5: the weight or the reps went up); the oracle for it is the rule itself;
//   4. career_win_gain()'s half-unit rounding against winText()'s, for the three measures, on a quarter-unit grid of weights;
//   5. for an athlete whose weights are all kilograms, career_entry_sets() / career_cycle_wins() / career_lift_gains() give the same rows as the
//      stage66 functions, column by column; the cost of the new reading is measured;
//   6. the helpers (keys, units), safe to re-run, and the rollback puts the stage66 functions back.
// One known difference between the two languages is declared, not hidden: JavaScript works in doubles and the database in exact numbers, so a
// gain that is EXACTLY 2% can fall either side of the line (135 to 137.7 is 2% to the digit); such a case is counted and left out, not compared.
// Exit code 1 if anything failed.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { openDb, runSql, read } from '../restore/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
let passed = 0, failed = 0;
function ok(cond, what, detail) {
  if (cond) { passed++; console.log('  ok   ' + what); }
  else { failed++; console.log('  FAIL ' + what + (detail ? '\n         ' + String(detail).split('\n').join('\n         ') : '')); }
}
const section = s => console.log('\n' + s);

// ── the JavaScript side, read out of program.html by name (the first "\n}" after which the function compiles; a one-liner is its own line) ──
const prog = read(path.join(ROOT, 'program.html')).replace(/\r\n/g, '\n');
function fnSrc(name) {
  const m = new RegExp('^function ' + name + '\\(', 'm').exec(prog);
  if (!m) throw new Error('program.html has no function ' + name + '(): update scripts/career/rehearse_measures.mjs');
  const eol = prog.indexOf('\n', m.index), first = prog.slice(m.index, eol < 0 ? prog.length : eol);
  try { new vm.Script(first); return first; } catch (e) { /* a multi-line function */ }
  for (let end = m.index; ;) {
    end = prog.indexOf('\n}', end + 1);
    if (end < 0) throw new Error('program.html: ' + name + '() never closes');
    const code = prog.slice(m.index, end + 2);
    try { new vm.Script(code); return code; } catch (e) { /* keep looking */ }
  }
}
const lineSrc = start => { const i = prog.indexOf('\n' + start); if (i < 0) throw new Error('program.html has no line starting ' + start); return prog.slice(i + 1, prog.indexOf('\n', i + 1)); };
const cycleWinsSrc = fnSrc('cycleWins');
if (!cycleWinsSrc.includes('.slice(0, 3)')) throw new Error('cycleWins() no longer ends in .slice(0, 3): update scripts/career/rehearse_measures.mjs');
const APP = vm.createContext({});
vm.runInContext('var HIST_ALIAS = {};\n' + [lineSrc('const ONE_RM_MAX_EFFECTIVE ='), lineSrc('const ONE_RM_ROUND_KG'), lineSrc('const ONE_RM_ROUND ')]
  .concat(['normDigits', 'weightOf', 'unitWord', 'uKey', 'uStore', 'uWord', 'histNorm', 'histSetLogged', 'setsMeasure', 'estimateOneRM', 'histBestSet', 'cycleSetOf', 'cycleBestSet', 'winText'].map(fnSrc))
  .concat([cycleWinsSrc.replace('.slice(0, 3)', '.slice(0, 999)')]).join('\n'), APP);   // the card shows three wins; the comparison wants them all
const js = n => vm.runInContext(n, APP);
const weightOf = js('weightOf'), cycleBestSet = js('cycleBestSet'), histBestSet = js('histBestSet'), setsMeasure = js('setsMeasure'), winText = js('winText'),
  cycleWins = js('cycleWins'), histNorm = js('histNorm');

// ── the table the two guards share: scripts/check_twins.js, between its MEASURE_CASES markers ──
const twins = read(path.join(ROOT, 'scripts', 'check_twins.js')).replace(/\r\n/g, '\n');
const tb = twins.indexOf('// MEASURE_CASES:begin'), te = twins.indexOf('// MEASURE_CASES:end');
if (tb < 0 || te < tb) throw new Error('scripts/check_twins.js has no MEASURE_CASES markers');
const CASES = JSON.parse(twins.slice(tb, te).replace(/^[^\n]*\n/, '').replace(/^const MEASURE_CASES = /, '').replace(/;\s*$/, ''));

// ── the database side ──
const stage66 = read(path.join(ROOT, 'supabase', 'stage66_career_mode.sql'));
const def = (src, name) => {
  const m = src.match(new RegExp('create or replace function public\\.' + name + '\\([\\s\\S]*?\\$function\\$;'));
  if (!m) throw new Error('could not find ' + name);
  return m[0];
};
const db = await openDb();
await db.exec('create schema if not exists public;');
for (const r of ['anon', 'authenticated', 'service_role']) await db.exec(`do $$ begin if not exists (select 1 from pg_roles where rolname = '${r}') then create role ${r}; end if; end $$;`);
await runSql(db, ['career_truthy', 'career_js_num', 'career_num', 'career_digits', 'career_norm'].map(n => def(stage66, n)).join('\n'), 'helpers');
await runSql(db, def(stage66, 'career_kg').replace('public.career_kg(', 'public.career_kg_66('), 'career_kg_66');
await runSql(db, read(path.join(ROOT, 'supabase', 'stage71_weight_units.sql')), 'stage71');
await db.exec(`create table public.session_history (athlete_id text not null, day integer not null, completed_on date not null, log jsonb, hidden_at timestamptz);`);
// the unchanged functions of stage66 that sit on career_entry_sets()
await runSql(db, [def(stage66, 'career_win_gain'), def(stage66, 'career_cycle_wins'), def(stage66, 'career_lift_gains')].join('\n'), 'stage66 win functions');
// the stage66 ones as they were, kept as *_old and reading stage66's own career_kg: what "the old functions said"
const oldOf = name => def(stage66, name).replace(/public\.(career_entry_sets|career_cycle_wins|career_lift_gains)\(/g, 'public.$1_old(').replace(/public\.career_kg\(/g, 'public.career_kg_66(');
await runSql(db, ['career_entry_sets', 'career_cycle_wins', 'career_lift_gains'].map(oldOf).join('\n'), 'old functions');
const stage72 = read(process.env.STAGE72_SQL || path.join(ROOT, 'supabase', 'stage72_weight_measures.sql'));   // STAGE72_SQL: a broken copy, to see this script fail
await runSql(db, stage72, 'stage72');
await runSql(db, stage72, 'stage72 again');
ok(true, 'the bare database is built; stage72 applied twice without an error');

const q = async (sql, params) => (await db.query(sql, params)).rows;
const num = v => v == null ? null : Number(v);
const near = (a, b) => (a == null || b == null) ? a == null && b == null : Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const J = v => JSON.stringify(v);

// ── 1. weightOf() against career_w() ──
section('1 · a weight is read as program.html reads it');
async function wRows(values) {   // [{ n, u }] from the database for a list of JSON values
  const r = await q(`select (public.career_w(v::jsonb)).n::text as n, (public.career_w(v::jsonb)).u as u, public.career_wn(v::jsonb)::text as wn, public.career_wu(v::jsonb) as wu
                       from unnest($1::text[]) with ordinality t(v, o) order by o`, [values.map(v => J(v))]);
  return r.map(x => ({ n: num(x.n), u: x.u, wn: num(x.wn), wu: x.wu }));
}
{
  const ws = CASES.weights.map(c => c.w), got = await wRows(ws);
  const bad = [];
  CASES.weights.forEach((c, i) => { const g = got[i]; if (!near(g.n, c.n) || g.u !== c.u || !near(g.wn, g.n) || g.wu !== g.u) bad.push(`${J(c.w)}: sql ${J(g)}  pinned { n: ${c.n}, u: ${c.u} }`); });
  ok(!bad.length, CASES.weights.length + ' pinned weights (the table of scripts/check_twins.js): the database says what program.html says', bad.join('\n'));
  const jsBad = CASES.weights.filter(c => { const a = weightOf(c.w); return !near(a.n, c.n) || a.unit !== c.u; });
  ok(!jsBad.length, 'and program.html says it too (so the table is the app\'s answer)', jsBad.map(c => J(c.w)).join(', '));
}
{
  const NUMS = ['45', '2.5', '100', '0', '00', '12,5', '۴۵', '1', '6', '2×20', '2x22.5', '3 × 15', '7.25', '135', '٦', '5×10', '1×6', '4x7.5', '٣٫٥'];
  const SPS = ['', ' ', '  '];
  const UNITS = ['', 'kg', 'KG', 'lb', 'LB', 'lbs', 'Lbs', 'pound', 'pounds', 'plate', 'plates', 'PLATES', 'lbx', 'plateau', 'plate1', 'kgs', 'pl'];
  const PRE = ['', 'BW+', 'about '], POST = ['', ' ×8', ' (heavy)', ' lb', ' plates'];
  const all = [];
  for (const pre of PRE) for (const nn of NUMS) for (const sp of SPS) for (const u of UNITS) for (const post of POST) all.push(pre + nn + sp + u + post);
  all.push('lb', 'plates', '45 lb 50 plates', 'x 45', '', '0 lb', '00 plates', 'lb45', '1 pound', '12 poundage', '5 lbsx');
  const got = [];
  for (let i = 0; i < all.length; i += 4000) got.push(...await wRows(all.slice(i, i + 4000)));
  const bad = [];
  all.forEach((v, i) => { const a = weightOf(v), g = got[i]; if (!near(a.n, g.n) || a.unit !== g.u || !near(g.wn, g.n) || g.wu !== g.u) { if (bad.length < 12) bad.push(`${J(v)}: js ${J(a)}  sql ${J(g)}`); } });
  ok(!bad.length, all.length + ' generated weights: number and unit agree with weightOf(), and career_wn() / career_wu() are its two halves', bad.join('\n'));
  const numbers = await wRows([45, 62.5, 0, null, true, '', { n: 5 }, [3]]);
  ok(near(numbers[0].n, 45) && numbers[0].u === 'kg' && near(numbers[1].n, 62.5) && numbers[2].n == null && numbers[3].n == null && numbers[4].n == null && numbers[5].n == null && numbers[6].n == null && numbers[7].n == null,
     'a JSON number reads; 0, null, true, "", an object and an array read as no weight', J(numbers));
}

// ── a session log as the database holds it, and as the app's History does ──
async function load(athletes) {   // athletes: { id: [{ date, day?, entries }] }
  const rows = [];
  for (const [id, sessions] of Object.entries(athletes)) sessions.forEach((s, i) => rows.push({ athlete_id: id, day: s.day || 1, completed_on: s.date, log: s.entries, _i: i }));
  for (let i = 0; i < rows.length; i += 400) await db.query(`insert into public.session_history (athlete_id, day, completed_on, log) select x.athlete_id, x.day, x.completed_on, x.log from jsonb_to_recordset($1::jsonb) as x(athlete_id text, day integer, completed_on date, log jsonb)`, [J(rows.slice(i, i + 400))]);
}
const sqlEntries = async (fn, ids) => (await q(`select a.id as athlete, es.d::text as d, es.plan_day, es.ord, es.name, es.lift, es.b_w::text as b_w, es.b_n::text as b_n, es.b_n_given, es.b_r::text as b_r, es.b_idx::text as b_idx, es.best_est::text as best_est
                                               from unnest($1::text[]) a(id) cross join lateral public.${fn}(a.id, null, null, null) es order by a.id, es.d, es.plan_day, es.ord`, [ids]))
  .map(r => ({ ...r, b_w: num(r.b_w), b_n: num(r.b_n), b_r: num(r.b_r), b_idx: num(r.b_idx), best_est: num(r.best_est) }));
const sfx = u => u === 'kg' ? '' : '|' + u;
// KNOWN, DECLARED: an estimate that lands EXACTLY on a half step (w × (30 + reps) / 30 over the step is k + ½: 225 lb × 5 @8 is 277.5, half way
// between 275 and 280 lb) is a coin the two languages could toss differently. JavaScript works in doubles and its answer is what the athlete sees
// (225 × 1.2333… comes out a hair over 277.5 and rounds up); exact numbers with 1/30 cut at 20 digits come out a hair under and round down.
//   · pounds and plates (new in stage72) are worked out in doubles, operation for operation, so they agree with the app even on a tie: these
//     are compared like every other estimate, and counted;
//   · kilograms keep stage66's exact numbers, so that no kilogram fact moves, and there the two differ on a tie: 37.5 kg × 5 @8 (46.25) is 47.5
//     in the app and 45 in the database (before stage72 as after). Such ties are found with exact integer arithmetic, left out of the
//     comparison of `best_est`, and counted; section 5 pins the example. The kilogram tie is for Amir to decide (a one-line change to doubles
//     would also move the few stored kilogram estimates that sit on a tie).
// A second one, older than measures and the same in every measure: two DIFFERENT sets of one exercise with exactly the same effort index
// (150 lb at RPE 6.7 and 155 lb at RPE 8 are both 201.5) are told apart by doubles in JavaScript and by their order in the database, so the best set
// reported can be the other one (its b_idx and the estimates are the same). Whole and half RPEs, which are all the app takes, make it very rare;
// the generated logs below use only those, and a fixed seed.
const histSetLogged = js('histSetLogged');
function tiesOn(e) {
  const m = setsMeasure(e.sets), S = { kg: 25n, lb: 50n, plates: 5n }[m];            // the step in tenths
  return (e.sets || []).filter(histSetLogged).some(s => {
    const wt = weightOf(s.w);
    if (wt.n == null || wt.unit !== m) return false;
    const n = (s.n != null && s.n !== '') ? Number(s.n) : (e.reps || null), rpe = Number(s.r);
    if (!(wt.n && n) || !(rpe > 0)) return false;
    const eff = n + Math.max(0, 10 - rpe);
    if (eff > 10) return false;
    const W = BigInt(Math.round(wt.n * 100)), E = BigInt(Math.round(eff * 10));
    const num = eff <= 1 ? 2n * W : 2n * W * (300n + E), den = eff <= 1 ? 10n * S : 3000n * S;     // 2 × (raw ÷ step) as a fraction
    return num % den === 0n && (num / den) % 2n === 1n;
  });
}
let TIES = 0, TIES_COMPARED = 0;
// What program.html gives for one logged exercise: the row career_entry_sets() must make (null when none).
function appRow(e) {
  if (!e || typeof e !== 'object' || e.circuit || !e.ex) return null;
  const cb = cycleBestSet(e); if (!cb) return null;
  const hb = histBestSet(e);
  return { lift: histNorm(e.ex) + sfx(cb.u), name: e.ex, b_w: cb.w, b_n: cb.n, b_n_given: cb.n != null, b_r: cb.r, b_idx: cb.idx, best_est: hb ? hb.est : null, tie: tiesOn(e), tieKg: tiesOn(e) && cb.u === 'kg' };
}
function compareRows(label, athletes, sqlRows) {
  const bad = []; let n = 0;
  for (const [id, sessions] of Object.entries(athletes)) {
    const want = [];
    sessions.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.day || 1) - (b.day || 1)).forEach(s => s.entries.forEach((e, k) => { const r = appRow(e); if (r) want.push({ d: s.date, ord: k + 1, ...r }); }));
    const got = sqlRows.filter(r => r.athlete === id);
    n += want.length;
    if (want.length !== got.length) { if (bad.length < 8) bad.push(`${id}: ${want.length} rows from program.html, ${got.length} from the database`); continue; }
    want.forEach((w, i) => {
      const g = got[i];
      const same = g.d === w.d && g.ord === w.ord && g.lift === w.lift && g.name === w.name && near(g.b_w, w.b_w) && near(g.b_n, w.b_n) && g.b_n_given === w.b_n_given
        && near(g.b_r, w.b_r) && near(g.b_idx, w.b_idx) && (w.tieKg ? (TIES++, true) : (w.tie && TIES_COMPARED++, near(g.best_est, w.best_est)));
      if (!same && bad.length < 8) bad.push(`${id} ${w.d} #${w.ord}: js ${J(w)}\n      sql ${J({ d: g.d, ord: g.ord, lift: g.lift, name: g.name, b_w: g.b_w, b_n: g.b_n, b_n_given: g.b_n_given, b_r: g.b_r, b_idx: g.b_idx, best_est: g.best_est })}`);
    });
  }
  return { n, bad };
}
// The wins: what the card shows, narrowed to what the server pays (GAME-5, 2026-10-17: both sets counted, the weight to the half unit or the reps up).
const pays = w => w.a.n != null && w.b.n != null && ((w.a.w != null && w.b.w != null && Math.round((w.b.w - w.a.w) * 2) / 2 > 0) || w.b.n > w.a.n);
const winKey = w => histNorm(w.name) + sfx(w.a.u);
const RULES = JSON.stringify({ fact: { effort_win: { min_gain: 0.02, limit: 999 } } });
async function winsCompare(label, athletes) {
  const bad = []; let n = 0, boundary = 0;
  for (const [id, sessions] of Object.entries(athletes)) {
    const mine = cycleWins(sessions.map(s => ({ date: s.date, entries: s.entries }))).filter(pays).map(w => ({ key: winKey(w), gain: w.gain }));
    const theirs = (await q(`select lift, gain::text as gain from public.career_cycle_wins($1, null, null, null, $2::jsonb)`, [id, RULES])).map(r => ({ key: r.lift, gain: num(r.gain) }));
    const used = new Set();
    mine.forEach(m => { const t = theirs.find((x, i) => x.key === m.key && !used.has(i)); if (t) { used.add(theirs.indexOf(t)); n++; if (!near(t.gain, m.gain)) bad.push(`${id} ${m.key}: gain js ${m.gain} sql ${t.gain}`); } else if (Math.abs(m.gain - 0.02) < 1e-9) boundary++; else bad.push(`${id}: ${m.key} is a win for program.html (gain ${m.gain}) and not for the database`); });
    theirs.forEach((t, i) => { if (!used.has(i)) { if (Math.abs(t.gain - 0.02) < 1e-9) boundary++; else bad.push(`${id}: ${t.key} is a win for the database (gain ${t.gain}) and not for program.html`); } });
  }
  return { n, bad: bad.slice(0, 10), boundary };
}

// ── 2. the pinned exercises and wins of the shared table ──
section('2 · the pinned exercises and wins (scripts/check_twins.js MEASURE_CASES) answered by the database');
{
  const ath = {};
  CASES.entries.forEach((c, i) => { ath['pin_e' + i] = [{ date: '2026-09-01', entries: [c.entry] }]; });
  await load(ath);
  const rows = await sqlEntries('career_entry_sets', Object.keys(ath)), bad = [];
  CASES.entries.forEach((c, i) => {
    const g = rows.filter(r => r.athlete === 'pin_e' + i), w = c.want;
    if (w == null) { if (g.length) bad.push(`${c.name}: the database made a row`); return; }
    if (g.length !== 1) { bad.push(`${c.name}: ${g.length} rows`); return; }
    const r = g[0];
    if (r.lift !== histNorm(c.entry.ex) + sfx(w.u) || !near(r.b_w, w.w) || !near(r.b_n, w.n) || !near(r.b_r, w.r) || !near(r.b_idx, w.idx) || !near(r.best_est, w.est))
      bad.push(`${c.name}\n      sql ${J({ lift: r.lift, b_w: r.b_w, b_n: r.b_n, b_r: r.b_r, b_idx: r.b_idx, best_est: r.best_est })}\n      pinned ${J(w)}`);
  });
  ok(!bad.length, CASES.entries.length + ' pinned exercises: the key, the weight as typed, the reps, the effort index and the estimate (to the measure\'s step) are the pinned ones', bad.join('\n'));
  const wa = {};
  CASES.wins.forEach((c, i) => { wa['pin_w' + i] = c.sessions; });
  await load(wa);
  const wbad = [];
  for (let i = 0; i < CASES.wins.length; i++) {
    const c = CASES.wins[i];
    const got = (await q(`select lift, name, round(gain, 4)::text as gain from public.career_cycle_wins($1, null, null, null, $2::jsonb) order by gain desc, lift`, ['pin_w' + i, RULES])).map(r => ({ key: r.lift, name: r.name, gain: num(r.gain) }));
    const want = c.pays.slice().sort((a, b) => b.gain - a.gain || (a.key < b.key ? -1 : 1));
    if (J(got) !== J(want)) wbad.push(`${c.name}\n      sql ${J(got)}\n      pinned ${J(want)}`);
  }
  ok(!wbad.length, CASES.wins.length + ' pinned wins: the database pays the lifts, in the measures and for the gains the table says (the card\'s extra "felt easier" lines pay nothing)', wbad.join('\n'));
  const lim = await q(`select count(*)::int as n from public.career_cycle_wins('pin_w' || ${CASES.wins.findIndex(c => c.pays.length === 3)}, null, null, null, '{}'::jsonb)`);
  ok(lim[0].n === 3, 'and with no rule set, the server pays at most three (its default limit)', J(lim));
}

// ── 3. generated logs ──
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function generator(seed, opt) {
  const R = rng(seed), chance = p => R() < p, pick = a => a[Math.floor(R() * a.length)], int = (a, b) => a + Math.floor(R() * (b - a + 1));
  const PER = '۰۱۲۳۴۵۶۷۸۹';
  const persian = s => s.replace(/[0-9]/g, d => PER[+d]);
  const MEAS = {
    kg: { base: () => pick([20, 25, 40, 50, 60, 62.5, 80, 100, 120]), step: 2.5, words: ['', '', '', 'kg', ' kg', 'KG', ' kgs'] },
    lb: { base: () => pick([45, 65, 95, 135, 155, 185, 225, 275, 315]), step: 5, words: [' lb', ' lb', 'lb', ' lbs', ' LB', ' pounds', ' pound'] },
    plates: { base: () => pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]), step: 1, words: [' plates', ' plates', 'plates', ' Plates', ' plate'] },
  };
  const wtext = (m, v) => {
    let s = String(v);
    if (chance(0.08)) s = s.replace('.', ',');
    if (chance(0.05)) s = persian(s);
    if (chance(0.05)) s = pick(['2×', '2x', '2 x ', '1×']) + s;
    if (opt.kgNoise && m === 'kg' && chance(0.12)) return pick(['BW+', 'about ', '']) + s + pick([' lbx', ' plateau', ' kg', '']);
    return s + pick(MEAS[m].words);
  };
  const NAMES = ['Back Squat', 'Bench Press', 'Leg Press Machine', 'Seated Row', 'Push-Up', 'DB Curl', 'Hip Thrust'];
  const rpe = () => pick([6, 7, 7, 7.5, 8, 8, 8, 8.5, 9, 9, 10]);   // whole and half RPEs, as the app takes them (see the second note above appRow)
  function entry(name, m, w0, drift) {
    const nsets = int(1, 4), sets = [];
    for (let i = 0; i < nsets; i++) {
      const roll = R();
      let w;
      if (roll < 0.07) w = pick(['', '', 'BW']);
      else if (!opt.kgOnly && roll < 0.14) { const o = pick(['kg', 'lb', 'plates'].filter(x => x !== m)); w = wtext(o, MEAS[o].base()); }
      else w = wtext(m, Math.max(MEAS[m].step, w0 + drift * MEAS[m].step * pick([0, 0, 1])));
      const s = { w, n: chance(0.86) ? int(3, 12) : pick(['', null]), r: chance(0.8) ? pick([rpe(), String(rpe())]) : pick(['', null]), d: chance(0.85) };
      if (chance(0.03)) { s.w = ''; s.r = ''; s.n = ''; s.d = true; }
      sets.push(s);
    }
    const e = { ex: name, block: 'A', sets };
    if (chance(0.8)) e.reps = String(int(4, 10));
    return e;
  }
  return function oneAthlete() {
    const lifts = []; const names = NAMES.slice().sort(() => R() - 0.5).slice(0, int(1, 3));
    names.forEach(name => lifts.push({ name, m: opt.kgOnly ? 'kg' : pick(['kg', 'lb', 'plates']), w0: null, drift: int(-1, 3) }));
    lifts.forEach(l => { l.w0 = MEAS[l.m].base(); });
    const nsess = int(2, 5), sessions = [];
    for (let i = 0; i < nsess; i++) {
      const d = new Date(Date.UTC(2026, 2, 2 + 7 * i)), date = d.toISOString().slice(0, 10), entries = [];
      lifts.forEach(l => {
        if (chance(0.08)) return;                                        // the lift is not in this session
        if (!opt.kgOnly && chance(0.1)) l.m = pick(['kg', 'lb', 'plates']), l.w0 = MEAS[l.m].base();   // the athlete switches measure
        entries.push(entry(l.name, l.m, l.w0, i * l.drift));
      });
      if (chance(0.1)) entries.splice(int(0, entries.length), 0, pick([{ ex: 'Circuit A', circuit: true, sets: [{ w: '20', n: 8, r: 8, d: true }] }, { ex: '', sets: [{ w: '20', n: 8, r: 8, d: true }] }, { note: 'warm-up' }]));
      sessions.push({ date, entries });
    }
    return sessions;
  };
}
section('3 · generated session logs, program.html against the database');
const MIXED = {}, KG = {};
{
  const gen = generator(20261018, { kgOnly: false });
  for (let i = 0; i < 420; i++) MIXED['gen' + i] = gen();
  const genKg = generator(77, { kgOnly: true, kgNoise: true });
  for (let i = 0; i < 360; i++) KG['kg' + i] = genKg();
  await load(MIXED); await load(KG);
  const rows = await sqlEntries('career_entry_sets', Object.keys(MIXED));
  const c = compareRows('mixed', MIXED, rows);
  const measures = { kg: 0, lb: 0, plates: 0 }; rows.forEach(r => { measures[r.lift.endsWith('|lb') ? 'lb' : r.lift.endsWith('|plates') ? 'plates' : 'kg']++; });
  ok(!c.bad.length && c.n > 800 && measures.lb > 100 && measures.plates > 100, `${c.n} exercises of ${Object.keys(MIXED).length} generated athletes: key, weight, reps, RPE, index and estimate agree number by number (${measures.kg} kg, ${measures.lb} lb, ${measures.plates} plates rows; ${TIES_COMPARED} pound and plates estimates exactly on a half step compared, and right; ${TIES} kilogram ones on a half step left out, see the note above appRow())`, c.bad.join('\n'));
  const w = await winsCompare('mixed', MIXED);
  ok(!w.bad.length && w.n > 100, `${w.n} wins the server pays agree with what program.html's cycleWins() shows (the weight or the reps up), gain to the digit; ${w.boundary} gains exactly on the 2% line left out (doubles against exact numbers)`, w.bad.join('\n'));
  const ck = await q(`select count(*)::int as n from public.career_cycle_wins('gen0', null, null, null, '{}'::jsonb)`);
  ok(ck[0].n <= 3, 'with the default rules a cycle pays at most three wins', J(ck));
  TIES = 0;
  const k = compareRows('kg', KG, await sqlEntries('career_entry_sets', Object.keys(KG)));
  ok(!k.bad.length && k.n > 600, `${k.n} kilogram exercises (with "kg", commas, Persian digits, pairs, "BW", "lbx" and "plateau" noise): agree with program.html too (${TIES} estimates exactly on a half step left out)`, k.bad.join('\n'));
}

// ── 4. the half-unit rounding of a win ──
section('4 · career_win_gain() and winText(): the half-unit rounding, in the three measures');
{
  const bad = []; let n = 0, boundary = 0, wins = 0;
  const UNITSET = { kg: { w: [20, 60, 100], word: '' }, lb: { w: [45, 135, 225], word: ' lb' }, plates: { w: [3, 6, 9], word: ' plates' } };
  const DELTA = [-1, -0.75, -0.5, -0.26, -0.25, -0.24, 0, 0.24, 0.25, 0.26, 0.49, 0.5, 0.51, 0.74, 0.75, 1, 1.25, 2.5, 5];
  for (const [m, spec] of Object.entries(UNITSET)) for (const w0 of spec.w) for (const dw of DELTA) for (const dn of [0, 1]) for (const dr of [0, -1, 1]) {
    const w1 = Math.round((w0 + dw) * 100) / 100;
    if (!(w1 > 0)) continue;
    const mk = (w, reps, r) => ({ ex: 'X', reps: String(reps), sets: [{ w: w + spec.word, n: reps, r, d: true }] });
    const A = cycleBestSet(mk(w0, 5, 8)), B = cycleBestSet(mk(w1, 5 + dn, 8 + dr));
    const t = winText(A, B), mine = !!t && pays({ a: A, b: B });
    const gain = B.idx / A.idx - 1;
    if (Math.abs(gain - 0.02) < 1e-9) { boundary++; continue; }
    const g = (await q(`select public.career_win_gain($1, $2, true, $3, $4, $5, true, $6, 0.02)::text as g`, [A.w, A.n, A.idx, B.w, B.n, B.idx]))[0].g;
    n++; if (mine) wins++;
    if ((g != null) !== mine || (mine && !near(num(g), t.gain))) { if (bad.length < 10) bad.push(`${m} ${w0}→${w1}, reps ${A.n}→${B.n}, RPE ${A.r}→${B.r}: winText ${t ? J({ txt: t.txt, gain: t.gain }) : 'null'} (server-paid: ${mine}), sql ${g}`); }
  }
  ok(!bad.length && wins > 100, `${n} pairs of sets (${wins} wins) over a quarter-unit grid of weights: the database pays the win exactly when winText() says one and the weight (to the half unit) or the reps went up; ${boundary} on the 2% line left out`, bad.join('\n'));
  // a plates set is a LOADED set, a bodyweight one is not, and one loaded set with one unloaded is nothing honest to say
  const lp = (await q(`select public.career_win_gain(6, 10, true, 8.4, 7, 10, true, 9.8, 0.02)::text as plates, public.career_win_gain(null, 8, true, 10, null, 10, true, 12, 0.02)::text as bw,
                              public.career_win_gain(null, 8, true, 10, 45, 8, true, 60, 0.02)::text as mixed`))[0];
  ok(num(lp.plates) > 0 && num(lp.bw) > 0 && lp.mixed == null, 'a plates win is a normal weight win (6 → 7 plates), a bodyweight win is a reps win, and one loaded set against one unloaded is none', J(lp));
}

// ── 5. nothing moves for an athlete whose weights are all kilograms ──
section('5 · kilograms only: the new functions give the stage66 rows, column by column');
{
  const ids = Object.keys(KG);
  const nw = await sqlEntries('career_entry_sets', ids), od = await sqlEntries('career_entry_sets_old', ids);
  let diff = 0; const bad = [];
  if (nw.length !== od.length) bad.push(`${nw.length} new rows, ${od.length} old rows`);
  else nw.forEach((r, i) => { const o = od[i]; const cols = Object.keys(r); for (const c of cols) { const a = r[c], b = o[c]; if (!(a === b || (typeof a === 'number' && typeof b === 'number' && a === b))) { diff++; if (bad.length < 8) bad.push(`${r.athlete} ${r.d} #${r.ord} ${c}: new ${a} old ${b}`); } } });
  ok(!bad.length && nw.length > 600, `career_entry_sets(): ${nw.length} rows of ${ids.length} kilogram athletes equal the stage66 rows in every column (key, weight, reps, RPE, index, estimate)`, bad.join('\n'));
  // DECLARED (the note above appRow): a tie in kilograms is 47.5 in the app and 45 in the database, the same 45 before stage72 as after; in pounds and plates it agrees.
  const tieEntry = (id, w, r) => ({ ex: 'Row', reps: '5', sets: [{ w, n: 5, r, d: true }] });
  const ties = { tie_kg: ['37.5', 8], tie_lb: ['225 lb', 8], tie_pl: ['3 plates', 7.5] };
  await load(Object.fromEntries(Object.entries(ties).map(([id, [w, r]]) => [id, [{ date: '2026-09-01', entries: [tieEntry(id, w, r)] }]])));
  const tk = {};
  for (const [id, [w, r]] of Object.entries(ties)) tk[id] = { app: histBestSet(tieEntry(id, w, r)).est, new: (await sqlEntries('career_entry_sets', [id]))[0].best_est, old: (await sqlEntries('career_entry_sets_old', [id]))[0].best_est };
  ok(tk.tie_kg.app === 47.5 && tk.tie_kg.new === 45 && tk.tie_kg.old === 45, 'declared: 37.5 kg × 5 @8 (46.25) is a tie in kilograms, 47.5 in the app and 45 in the database, the same 45 before stage72 as after (no kilogram fact moves)', J(tk.tie_kg));
  ok(tk.tie_lb.app === 280 && tk.tie_lb.new === 280 && tk.tie_pl.app === 4 && tk.tie_pl.new === 4, 'and the same kind of tie in pounds (225 lb × 5 @8 = 277.5 → 280) and in plates (3 plates × 5 @7.5 = 3.75 → 4) agrees with the app (they are worked out in doubles, as the app does)', J(tk));
  const wbad = []; let wn = 0, ln = 0;
  for (const id of ids) {
    const a = await q(`select lift, name, gain::text from public.career_cycle_wins($1, null, null, null, $2::jsonb) order by lift`, [id, RULES]);
    const b = await q(`select lift, name, gain::text from public.career_cycle_wins_old($1, null, null, null, $2::jsonb) order by lift`, [id, RULES]);
    wn += a.length; if (J(a) !== J(b)) wbad.push(`${id}: ${J(a)} vs ${J(b)}`);
    const c = await q(`select lift, name, pct::text, d::text from public.career_lift_gains($1) order by lift`, [id]);
    const d = await q(`select lift, name, pct::text, d::text from public.career_lift_gains_old($1) order by lift`, [id]);
    ln += c.length; if (J(c) !== J(d)) wbad.push(`${id} lift gains: ${J(c)} vs ${J(d)}`);
  }
  ok(!wbad.length && wn > 20 && ln > 20, `career_cycle_wins() (${wn} wins) and career_lift_gains() (${ln} gains) equal the stage66 ones, key, name, gain and day`, wbad.slice(0, 5).join('\n'));
  // the cost of reading each set once more: one big athlete, old against new
  const big = [];
  const g2 = generator(5, { kgOnly: true });
  for (let i = 0; i < 160; i++) { const s = g2()[0]; s.date = new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10); big.push({ date: s.date, entries: s.entries.concat(s.entries).concat(s.entries) }); }
  await load({ big_athlete: big });
  const sets = (await q(`select count(*)::int as n from public.session_history sh, jsonb_array_elements(sh.log) e, jsonb_array_elements(case when jsonb_typeof(e -> 'sets') = 'array' then e -> 'sets' else '[]'::jsonb end) s where sh.athlete_id = 'big_athlete'`))[0].n;
  const time = async fn => { const ts = []; for (let i = 0; i < 5; i++) { const t0 = Date.now(); await q(`select count(*) from public.${fn}('big_athlete', null, null, null)`); ts.push(Date.now() - t0); } return Math.min(...ts); };   // the fastest of five
  await time('career_entry_sets_old'); await time('career_entry_sets');
  const t66 = await time('career_entry_sets_old'), t72 = await time('career_entry_sets');
  console.log(`         ${sets} sets, ${big.length} sessions: stage66 ${t66.toFixed(0)} ms, stage72 ${t72.toFixed(0)} ms per call (PGlite, ${(t72 / t66).toFixed(2)}x)`);
  ok(t72 < t66 * 2.5 + 50, 'reading the measure costs little (a pass over each exercise\'s sets until the first weight, and one parse per set as before)', `${t66} ms → ${t72} ms`);
}

// ── 6. the helpers, re-running, the rollback ──
section('6 · the keys, safe to re-run, and the rollback');
{
  const k = (await q(`select public.career_lift_key('  Back   Squat ', 'kg') as a, public.career_lift_key('Back Squat', 'lb') as b, public.career_lift_key('Back Squat', 'plates') as c, public.career_lift_key('Back Squat', null) as d,
                             public.career_lift_key('Back Squat', 'stone') as e, public.career_lift_base('back squat|lb') as f, public.career_lift_base('back squat|plates') as g, public.career_lift_base('back squat') as h,
                             public.career_lift_base('a|b') as i, public.career_lift_unit('back squat|lb') as j, public.career_lift_unit('back squat|plates') as k, public.career_lift_unit('back squat') as l, public.career_lift_unit('a|b') as m,
                             public.career_rec_unit('{"u":"lb"}') as n, public.career_rec_unit('{"u":"plates"}') as o, public.career_rec_unit('{"u":"kg"}') as p, public.career_rec_unit('{}') as q, public.career_rec_unit('{"u":5}') as r,
                             public.career_rec_unit('{"u":"LB"}') as s, public.career_rec_unit('[1]') as t`))[0];
  ok(k.a === 'back squat' && k.b === 'back squat|lb' && k.c === 'back squat|plates' && k.d === 'back squat' && k.e === 'back squat', 'career_lift_key(): the plain key for kilograms (and anything that is not lb or plates), name|lb, name|plates', J(k));
  ok(k.f === 'back squat' && k.g === 'back squat' && k.h === 'back squat' && k.i === 'a|b' && k.j === 'lb' && k.k === 'plates' && k.l === 'kg' && k.m === 'kg', 'career_lift_base() and career_lift_unit() take a key apart, and a name with a bar in it stays whole', J(k));
  ok(k.n === 'lb' && k.o === 'plates' && k.p === 'kg' && k.q === 'kg' && k.r === 'kg' && k.s === 'kg' && k.t === 'kg', 'career_rec_unit(): a record\'s measure is its u when that is exactly "lb" or "plates", else kilograms (uKey())', J(k));
  const gr = (await q(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as auth, has_function_privilege('service_role', p.oid, 'execute') as svc
                         from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('career_w', 'career_wn', 'career_wu', 'career_lift_key', 'career_lift_base', 'career_lift_unit', 'career_rec_unit')`));
  ok(gr.length === 7 && gr.every(r => !r.anon && !r.auth && r.svc), 'the seven new helpers are for the server only (not anon, not authenticated; the service role may run them)', J(gr));
  const before = await sqlEntries('career_entry_sets', Object.keys(MIXED).slice(0, 80));
  // the rollback: the stage66 functions back, the helpers gone, and a pound set read as kilograms again (stage71's career_kg)
  const rb = read(path.join(ROOT, 'scripts', 'career', 'rollback_stage72.sql'));
  await runSql(db, rb, 'rollback');
  const gone = (await q(`select count(*)::int as n from pg_proc where pronamespace = 'public'::regnamespace and proname in ('career_w', 'career_wn', 'career_wu', 'career_lift_key', 'career_lift_base', 'career_lift_unit', 'career_rec_unit')`))[0].n;
  await db.query(`insert into public.session_history values ('rb', 1, '2026-09-01', $1::jsonb)`, [J([{ ex: 'Back Squat', reps: '5', sets: [{ w: '45 lb', n: 5, r: 8, d: true }] }])]);
  const rbRow = (await sqlEntries('career_entry_sets', ['rb']))[0];
  ok(gone === 0 && rbRow.lift === 'back squat' && near(rbRow.b_w, 20.41), 'after the rollback the helpers are gone and "45 lb" is 20.41 kg under the plain key again (the stage71 reading)', J({ gone, rbRow }));
  // and the rollback's two functions are the stage66 text
  const rbDef = fn => def(rb, fn).replace(/\s+/g, ' '), s66 = fn => def(stage66, fn).replace(/\s+/g, ' ');
  ok(rbDef('career_entry_sets') === s66('career_entry_sets') && rbDef('career_derive') === s66('career_derive'), 'rollback_stage72.sql holds career_entry_sets() and career_derive() exactly as stage66 wrote them');
  const kgNow = compareRows('kg after rollback', KG, await sqlEntries('career_entry_sets', Object.keys(KG)));
  ok(!kgNow.bad.length, 'and for kilograms the rolled-back function still agrees with program.html');
  await runSql(db, stage72, 'stage72 after rollback');
  const after = await sqlEntries('career_entry_sets', Object.keys(MIXED).slice(0, 80));
  ok(J(before) === J(after), 'stage72 applied again puts every row back exactly as it was before the rollback (80 mixed athletes)');
}

console.log('\n' + passed + ' ok, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
