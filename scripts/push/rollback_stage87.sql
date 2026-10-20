-- rollback_stage87.sql — takes the cycle notification back off (2026-10-20)
--
-- ⚠️ ON AMIR'S WORD ONLY. The Reminders panel's "A new cycle" switch goes back to promising something
-- nothing sends, which is the fault this stage existed to fix — so take the switch out of PUSH_KINDS in
-- program.html in the same breath, or leave the stage on.
--
-- ⚠️ ORDER. If more than one of these comes off, run them NEWEST FIRST: stage87, then stage86, then
-- stage84. Each put its own names on the end of coach_erase_person()'s table list, and each way back
-- looks for the end as its own stage left it.
--
-- It keeps nothing, and nothing is lost by that. push_cycle_seen is only a note of which cycle each
-- athlete was last told about; it rebuilds itself the moment the stage comes back, and because the
-- first sight of a phone is never a notification, nobody is told twice about a cycle they already have.
--
-- Safe to re-run. It puts coach_erase_person() back the way stage87 found it.

-- ── 1. coach_erase_person() back to what it was before stage87 ─────────────────────────────────────
do $rollback87_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_new constant text := '''crew_push_seen'', ''push_cycle_seen'']';
  s_old constant text := '''crew_push_seen'']';
  n integer;
begin
  n := (length(d) - length(replace(d, s_new, ''))) / greatest(length(s_new), 1);
  if n = 0 then
    return;   -- never patched, or already put back
  end if;
  execute replace(d, s_new, s_old);
end
$rollback87_patch$;

-- ── 2. The functions, then the table ───────────────────────────────────────────────────────────────
drop function if exists public.cycle_push_done(text, boolean);
drop function if exists public.cycle_push_due(timestamptz, boolean);
drop function if exists public.cycle_push_fold(timestamptz);
drop function if exists public.cycle_push_sweep();
drop function if exists public.cycle_push_words(text);

drop table if exists public.push_cycle_seen;
