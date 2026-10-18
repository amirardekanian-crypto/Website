// What the Career Mode rehearsals share (scripts/career/rehearse.mjs for phase 1, rehearse_switch.mjs for phase 2). Not a rehearsal itself.
//
// Why it exists (2026-10-18). supabase/schema_snapshot.sql is the live structure and is made again after every stage that goes on the project,
// so it already holds stage66 and stage69 (and stage70 once that is live). A rehearsal that applied stage66 on top of it broke: stage66's patch
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

export function py(argv, opts = {}) {
  for (const exe of [process.env.PYTHON, 'python', 'python3'].filter(Boolean)) {
    const r = cp.spawnSync(exe, ['-X', 'utf8', ...argv], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
    if (r.error && r.error.code === 'ENOENT') continue;
    if (r.status === 9009 || /Microsoft Store|was not found/i.test(r.stderr || '')) continue;   // the Windows Store stub of python3
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

// The stages, in the order they went (or will go) on the project, and the table each one made (what tells a database that it holds the stage).
export const STAGES = [
  { n: 66, file: 'stage66_career_mode.sql', marker: 'public.career_facts' },
  { n: 69, file: 'stage69_career_xp_switch.sql', marker: 'public.career_scores' },
  { n: 70, file: 'stage70_career_rewards.sql', marker: 'public.career_awards' },
];
export async function heldStages(db) {
  const held = {};
  for (const s of STAGES) held[s.n] = Boolean((await db.query(`select to_regclass($1)::text as t`, [s.marker])).rows[0].t);
  return held;
}
// Apply every stage up to and including `through` that the database does not hold. Each one that is applied goes on twice (it must be safe to
// re-run). Returns { applied: [66, ...], held: [...] }; `say` is told what happened to each.
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
export const eraseDef = async db => (await db.query(`select pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure) as d`)).rows[0].d;
