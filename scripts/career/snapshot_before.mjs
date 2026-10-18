// The schema snapshot (supabase/schema_snapshot.sql) is the LIVE structure, made again the day a stage is applied, so it holds every Career Mode
// stage already live. A rehearsal of an earlier stage starts from the snapshot taken back to just before it, with the tested ways back, newest
// first: stage70 (career_awards), stage69 (career_scores), stage66 (career_facts). Each runs only when its table is there, and each is safe to
// run twice. (Found 2026-10-18: rehearse.mjs and rehearse_switch.mjs ran their stage on top of a snapshot that already held it, and failed.)
import path from 'node:path';
import { runSql, read } from '../restore/lib.mjs';

const WAYS_BACK = [
  { stage: 70, table: 'career_awards', file: 'rollback_stage70.sql' },
  { stage: 69, table: 'career_scores', file: 'rollback_stage69.sql' },
  { stage: 66, table: 'career_facts', file: 'rollback_stage66.sql' },
];

export async function snapshotBefore(db, stage, root) {
  const undone = [];
  for (const w of WAYS_BACK) {
    if (w.stage < stage) break;
    const there = (await db.query(`select to_regclass('public.${w.table}') as t`)).rows[0].t;
    if (!there) continue;
    await runSql(db, read(path.join(root, 'scripts', 'career', w.file)), w.file);
    undone.push(w.stage);
  }
  return undone;
}
