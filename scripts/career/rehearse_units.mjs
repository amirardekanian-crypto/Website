// stage71 (a logged weight carries its unit) rehearsed away from the live project: career_kg() in the database against parseLoggedKg() in
// program.html, which it copies (CLAUDE.md, things that exist twice).
//
//     PGLITE=<scratch>/node_modules/@electric-sql/pglite node scripts/career/rehearse_units.mjs
//
// Nothing here touches a real project. It builds a bare database with the helpers career_kg() reads (copied from stage66), keeps the
// stage66 career_kg() as career_kg_old(), applies supabase/stage71_weight_units.sql twice (it must be safe to re-run), and then
//   1. every hand-written case, and some thousands generated (every number form × every unit word × text before and after), must give
//      the SAME answer from the database as from program.html's own parseLoggedKg() (read out of the file, not copied);
//   2. a weight with no unit word, or with kg, must read exactly as the stage66 function read it (so applying stage71 moves no fact);
//   3. a JSON number reads too, and the rollback puts the stage66 function back.
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

// ── the JavaScript side, read out of program.html ──
const prog = read(path.join(ROOT, 'program.html'));
const slice = (a, b) => { const i = prog.indexOf(a), j = prog.indexOf(b, i + 1); if (i < 0 || j <= i) throw new Error('could not find ' + a); return prog.slice(i, j); };
const P = {};
vm.createContext(P);
vm.runInContext([slice('function normDigits(v) {', 'const ONE_RM_MAX_EFFECTIVE'), slice('// ── THE UNIT A WEIGHT IS IN', '// The set that produces the HIGHEST')].join('\n'), P);
const jsKg = vm.runInContext('parseLoggedKg', P);

// ── the database side ──
const stage66 = read(path.join(ROOT, 'supabase', 'stage66_career_mode.sql'));
const def = (src, name) => {
  const m = src.match(new RegExp('create or replace function public\\.' + name + '\\([\\s\\S]*?\\$function\\$;'));
  if (!m) throw new Error('could not find ' + name);
  return m[0];
};
const db = await openDb();
await db.exec('create schema if not exists public;');
await runSql(db, [def(stage66, 'career_truthy'), def(stage66, 'career_digits')].join('\n'), 'helpers');
await runSql(db, def(stage66, 'career_kg').replace('public.career_kg(', 'public.career_kg_old('), 'career_kg_old');
const stage71 = read(path.join(ROOT, 'supabase', 'stage71_weight_units.sql'));
await runSql(db, stage71, 'stage71');
await runSql(db, stage71, 'stage71 again');

const sqlKg = async (fn, v) => {
  const r = await db.query(`select public.${fn}(to_jsonb($1::text)) as k`, [v]);
  return r.rows[0].k == null ? null : Number(r.rows[0].k);
};
const same = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 1e-9);

// ── 1. hand-written cases ──
console.log('\n1 · the database reads a weight as program.html does');
const HAND = ['80', '62,5', '۲۵', '2×20', '2x22.5', '2 x 20kg', '20x2', 'BW', '', '24kg', '0', '0 lb', '00',
  '45 lb', '45lb', '135 lbs', '2×20 lb', '۴۵ lb', '6 plates', '1 plate', '6plates', '45 lbx', 'BW+10', 'red band', '17.5 LB', '5 Plates', '12,5 lb',
  '3 × 15 lb', '1x100 plates', '45 pounds', '45 pound', '1 pound', '10 plateau', '8 plate1'];
let bad = [];
for (const v of HAND) { const a = jsKg(v), b = await sqlKg('career_kg', v); if (!same(a, b)) bad.push(`"${v}": js ${a}  sql ${b}`); }
ok(!bad.length, HAND.length + ' hand-written weights agree', bad.join('\n'));
bad = [];
for (const [v, want] of [['45 lb', 20.41], ['135 lbs', 61.23], ['2×20 lb', 9.07], ['6 plates', null], ['1 plate', null], ['80', 80], ['24kg', 24], ['BW', null]]) {
  const b = await sqlKg('career_kg', v); if (!same(b, want)) bad.push(`"${v}": sql ${b}  want ${want}`);
}
ok(!bad.length, 'the stated answers hold: 45 lb = 20.41 kg, plates = no weight, kilograms as before', bad.join('\n'));

// ── 2. generated: every form, JavaScript against the database ──
console.log('\n2 · thousands of generated weights, JavaScript against the database');
const NUMS = ['45', '2.5', '100', '0', '00', '12,5', '۴۵', '1', '6', '2×20', '2x22.5', '3 × 15', '7.25', '135', '٦'];
const SPS = ['', ' ', '  '];
const UNITS = ['', 'kg', 'KG', 'lb', 'LB', 'lbs', 'Lbs', 'pound', 'pounds', 'plate', 'plates', 'PLATES', 'lbx', 'plateau', 'plate1', 'kgs'];
const PRE = ['', 'BW+', 'about '], POST = ['', ' ×8', ' (heavy)'];
let n = 0; bad = [];
for (const pre of PRE) for (const num of NUMS) for (const sp of SPS) for (const u of UNITS) for (const post of POST) {
  const v = pre + num + sp + u + post;
  const a = jsKg(v), b = await sqlKg('career_kg', v);
  n++;
  if (!same(a, b) && bad.length < 12) bad.push(`"${v}": js ${a}  sql ${b}`);
}
ok(!bad.length, n + ' generated weights agree', bad.join('\n'));

// ── 3. nothing moves for the weights that exist today ──
console.log('\n3 · a weight with no unit word, or with kg, reads exactly as stage66 read it');
n = 0; bad = [];
for (const pre of PRE) for (const num of NUMS) for (const sp of SPS) for (const u of ['', 'kg', 'KG', 'kgs']) for (const post of POST) {
  const v = pre + num + sp + u + post;
  const a = await sqlKg('career_kg_old', v), b = await sqlKg('career_kg', v);
  n++;
  if (!same(a, b) && bad.length < 12) bad.push(`"${v}": stage66 ${a}  stage71 ${b}`);
}
ok(!bad.length, n + ' unitless and kg weights are unchanged', bad.join('\n'));
const r = await db.query(`select public.career_kg('45'::jsonb) as a, public.career_kg('0'::jsonb) as z, public.career_kg('null'::jsonb) as nn, public.career_kg('"x"'::jsonb) as x, public.career_kg(null) as nl`);
ok(Number(r.rows[0].a) === 45 && r.rows[0].z == null && r.rows[0].nn == null && r.rows[0].x == null && r.rows[0].nl == null, 'a JSON number reads; 0, null, text with no number and no value read as nothing', JSON.stringify(r.rows[0]));

// ── 4. the rollback ──
console.log('\n4 · the rollback');
await runSql(db, read(path.join(ROOT, 'scripts', 'career', 'rollback_stage71.sql')), 'rollback');
const back = await sqlKg('career_kg', '45 lb'), old = await sqlKg('career_kg_old', '45 lb');
ok(back === 45 && old === 45, 'after the rollback "45 lb" reads as 45 again, the stage66 way', back + ' / ' + old);
await runSql(db, stage71, 'stage71 after rollback');
ok(await sqlKg('career_kg', '45 lb') === 20.41, 'and stage71 puts it back');

console.log('\n' + passed + ' ok, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
