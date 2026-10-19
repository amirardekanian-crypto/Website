// What the Career Mode rehearsals share (scripts/career/rehearse.mjs for phase 1, rehearse_switch.mjs for phase 2; rehearse_catalogue.mjs reads its STAGES). Not a rehearsal itself.
//
// Why it exists (2026-10-18). supabase/schema_snapshot.sql is the live structure and is made again after every stage that goes on the project,
// so it already holds stage66 and stage69 (and stage70, stage71 and stage72 once they are live; stage73 only after it is applied to the project). A rehearsal that applied stage66 on top of it broke: stage66's patch
// of coach_erase_person() looks for the end of the table list as stage66 found it, and the snapshot's list already ends in a later stage's table.
// So a rehearsal starts from the snapshot as it is and applies only the stages the snapshot does not hold yet, in order, each twice when it does
// (a stage must be safe to re-run). Whatever the snapshot already holds is said, not hidden.
//
// The career files of an older commit (the rulebook the live project was seeded from) come from git, with that commit's own checker and seed
// script, in a scratch folder under the system's temp folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runSql, read } from '../restore/lib.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// The commits the live project's rulebooks were seeded from: version 1 (phase 1, 2026-10-17) and version 2 (phase 2, both switches off).
export const PHASE1_REV = '94cdc89';
export const PHASE2_REV = 'a219d5a';

// The Windows Store stub of python3 prints "Python was not found; run without arguments to install from the Microsoft Store, or disable this
// shortcut from Settings > Manage App Execution Aliases." and exits 9009: that, and only that, is skipped. A checker or seed script that fails
// with its own words ("SPINE_PATTERNS was not found in coach.html", a missing file) is a real answer, so it is returned as it is and the
// caller reports it as the script's error (it used to be taken for the stub, and the run said "No python found").
export const STORE_STUB = /^\s*Python was not found; run without arguments to install from the Microsoft Store/m;
export function py(argv, opts = {}) {
  for (const exe of [process.env.PYTHON, 'python', 'python3'].filter(Boolean)) {
    const r = cp.spawnSync(exe, ['-X', 'utf8', ...argv], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
    if (r.error && r.error.code === 'ENOENT') continue;
    if (r.status === 9009 || STORE_STUB.test(r.stderr || '') || STORE_STUB.test(r.stdout || '')) continue;   // the Windows Store stub of python3
    return r;
  }
  throw new Error('No python found. Set PYTHON to its path.');
}
export const seedSql = out => out.replace(/;\s*$/, '').replace(/^--[^\n]*\n/, '') + ' as r';

// The career files of a commit (rev) or of the working tree (rev null), with their own checker and seed script.
export function filesAt(rev) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'career-' + (rev || 'work') + '-'));
  fs.mkdirSync(path.join(dir, 'career')); fs.mkdirSync(path.join(dir, 'scripts')); fs.mkdirSync(path.join(dir, 'supabase'));
  const want = ['rulebook', 'badges', 'achievements', 'titles', 'missions', 'quests', 'recognition'].map(f => `career/${f}.toml`)
    .concat(['scripts/check_career.py', 'scripts/career_seed.py', 'supabase/xp_rules_snapshot.json']);
  if (!rev) want.push('career/tiers.lock.json');
  // check_career.py reads coach.html's SPINE_PATTERNS (GAME-10: a `patterns` key on a badge or achievement is checked against it) from beside
  // itself, so the scratch folder carries coach.html: the rev's own, else the working tree's. An older checker never opens it.
  want.push('coach.html');
  for (const f of want) {
    const body = rev ? cp.execFileSync('git', ['show', `${rev}:${f}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 << 20 })
                     : fs.readFileSync(path.join(ROOT, f), 'utf8');
    fs.writeFileSync(path.join(dir, f), body.replace(/\r\n/g, '\n'));
  }
  return dir;
}
export function seedFrom(dir, extra = []) {
  const r = py([path.join(dir, 'scripts', 'career_seed.py'), path.join(dir, 'career'), ...extra]);
  if (r.status !== 0) throw new Error('career_seed.py failed:\n' + r.stderr);
  return r.stdout;
}
export function withRulebook(dir, edit) {
  const f = path.join(dir, 'career', 'rulebook.toml');
  fs.writeFileSync(f, edit(fs.readFileSync(f, 'utf8')));
}

// The stages, in the order they went (or will go) on the project, and the object each one made (what tells a database that it holds the stage):
// a table; or, with fn: true, a function; or, with body as well, a function an earlier stage already made, told apart by a word in its text.
//   · stage71 (stage71_weight_units.sql, the weight units, live): it only redefines career_kg(), which stage66 made, so the marker is
//     career_kg() reading 'plates' (main's scripts/career/rehearse.mjs tells it the same way).
//   · stage72 (stage72_weight_measures.sql, a lift kept per measure, live): its new helper career_wn() (rehearse.mjs's marker too).
//   · stage73 (stage73_career_main_lifts.sql, The Upgrade and Double Up on the main lifts): it makes no table, it replaces four of stage70's
//     functions and adds career_maxpct_key(). Not live: only scripts/career/rehearse_catalogue.mjs applies it.
export const STAGES = [
  { n: 66, file: 'stage66_career_mode.sql', marker: 'public.career_facts' },
  { n: 69, file: 'stage69_career_xp_switch.sql', marker: 'public.career_scores' },
  { n: 70, file: 'stage70_career_rewards.sql', marker: 'public.career_awards' },
  { n: 71, file: 'stage71_weight_units.sql', marker: 'public.career_kg(jsonb)', fn: true, body: 'plates' },
  { n: 72, file: 'stage72_weight_measures.sql', marker: 'public.career_wn(jsonb)', fn: true },
  { n: 73, file: 'stage73_career_main_lifts.sql', marker: 'public.career_maxpct_key(jsonb)', fn: true },
];
// Does the database hold this stage? A table is asked with to_regclass(), a function with to_regprocedure(); both answer null for nothing.
// A `body` marker asks whether the function's definition holds that word (no function: no).
export async function holdsStage(db, s) {
  if (s.body) {
    const r = await db.query(`select position($2 in coalesce(pg_get_functiondef(to_regprocedure($1)), '')) > 0 as t`, [s.marker, s.body]);
    return Boolean(r.rows[0].t);
  }
  const r = await db.query(s.fn ? `select to_regprocedure($1)::text as t` : `select to_regclass($1)::text as t`, [s.marker]);
  return Boolean(r.rows[0].t);
}
export async function heldStages(db) {
  const held = {};
  for (const s of STAGES) held[s.n] = await holdsStage(db, s);
  return held;
}
// Apply every stage up to and including `through` that the database does not hold. Each one that is applied goes on twice (it must be safe to
// re-run). Returns { applied: [66, ...], held: [...] }; `say` is told what happened to each. A rehearsal passes ITS stage: rehearse.mjs and
// rehearse_switch.mjs stop at 70, so neither ever applies stage71, stage72 or stage73 through here (rehearse.mjs puts the weight units on
// itself when the snapshot lacks them; rehearse_catalogue.mjs puts on stage70, the weight units and stage73 in their own section 2).
export async function ensureStages(db, through, say = () => {}) {
  const held = await heldStages(db), applied = [], already = [];
  for (const s of STAGES) {
    if (s.n > through) break;
    if (held[s.n]) { already.push(s.n); say(`stage${s.n}: the snapshot already holds it (${s.marker}); not applied again`); continue; }
    const sql = read(path.join(ROOT, 'supabase', s.file));
    await runSql(db, sql, `stage${s.n}`);
    await runSql(db, sql, `stage${s.n} again`);
    applied.push(s.n); say(`stage${s.n}: applied, and applied again without an error`);
  }
  return { applied, held: already };
}
// The schema snapshot a rehearsal of one stage starts from: the working copy when it does not hold the stage yet (`marker`, a regex on the text),
// else the newest committed snapshot that does not (the stage is live and the snapshot was remade after it). Returns { sql, says }.
export function snapshotWithout(marker) {
  const now = read(path.join(ROOT, 'supabase', 'schema_snapshot.sql'));
  if (!marker.test(now)) return { sql: now, says: 'the working copy of supabase/schema_snapshot.sql' };
  const show = rev => cp.execFileSync('git', ['show', `${rev}:supabase/schema_snapshot.sql`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  const revs = cp.execFileSync('git', ['log', '--format=%h', '-n', '40', '--', 'supabase/schema_snapshot.sql'], { cwd: ROOT, encoding: 'utf8' }).split(/\s+/).filter(Boolean);
  for (const r of revs) { let t; try { t = show(r); } catch (e) { continue; } if (!marker.test(t)) return { sql: t.split('\r\n').join('\n'), says: `supabase/schema_snapshot.sql as committed at ${r} (the working copy already holds the stage, which is live)` }; }
  throw new Error('No committed schema snapshot without the stage was found in the last 40 commits of supabase/schema_snapshot.sql');
}
export const eraseDef = async db => (await db.query(`select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).rows[0].d;
