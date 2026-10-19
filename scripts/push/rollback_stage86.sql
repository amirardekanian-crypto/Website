-- rollback_stage86.sql — takes the crew notifications back off (2026-10-19)
--
-- ⚠️ ON AMIR'S WORD ONLY. Running this stops every crew notification. The reminders (stage84) and
-- Crew and the Bell itself (stage81) are untouched: the Bell keeps working, it just stops reaching
-- anybody's lock screen.
--
-- ⚠️ ORDER. If BOTH this and stage84 are being taken off, run THIS ONE FIRST. stage84's way back
-- looks for the end of coach_erase_person()'s table list as stage84 left it, and this stage put two
-- more names after it; undo them in the other order and that patch finds nothing and silently leaves
-- stage84's two tables in a list of dropped tables, which makes every later erasure fail.
--
-- It keeps nothing, and nothing is lost by that. crew_push_q is a queue of what happened in the last
-- seven days, which the Bell itself still holds and shows; crew_push_seen is only a note of how far
-- each athlete has been told, and it rebuilds itself from the moment the stage comes back (an athlete
-- with no watermark is told about nothing from before their phone subscribed). The ANSWER an athlete
-- gave — the 'crew' switch in their Reminders panel — lives in push_subs.kinds, which this does not
-- touch, so putting the stage back on does not cost anybody that answer.
--
-- Safe to re-run. It puts coach_erase_person() back the way stage86 found it.

-- ── 1. The jobs ────────────────────────────────────────────────────────────────────────────────────
do $rollback86_cron$
begin
  if to_regclass('cron.job') is not null then
    perform cron.unschedule('crew-push') where exists (select 1 from cron.job where jobname = 'crew-push');
    perform cron.unschedule('crew-push-sweep') where exists (select 1 from cron.job where jobname = 'crew-push-sweep');
  end if;
exception when others then
  raise warning 'rollback86: a job was not unscheduled: %', sqlerrm;
end
$rollback86_cron$;

-- ── 2. The triggers, before the functions they call ────────────────────────────────────────────────
-- Named one by one rather than dropped with their functions, so a trigger left on a Career Mode table
-- by a half-finished run cannot survive this.
drop trigger if exists crew_push_post on public.crew_posts;
drop trigger if exists crew_push_kudos on public.crew_kudos;
drop trigger if exists crew_push_ring on public.crew_rings;
drop trigger if exists crew_push_fact on public.career_facts;
drop trigger if exists crew_push_award on public.career_awards;
drop trigger if exists crew_push_honour on public.career_honours;
drop trigger if exists crew_push_joined on public.crew_consent;

-- ── 3. coach_erase_person() back to what it was before stage86 ─────────────────────────────────────
do $rollback86_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_new constant text := '''push_subs'', ''crew_push_q'', ''crew_push_seen'']';
  s_old constant text := '''push_subs'']';
  n integer;
begin
  n := (length(d) - length(replace(d, s_new, ''))) / greatest(length(s_new), 1);
  if n = 0 then
    return;   -- never patched, or already put back
  end if;
  execute replace(d, s_new, s_old);
end
$rollback86_patch$;

-- ── 4. The functions, then the tables ──────────────────────────────────────────────────────────────
drop function if exists public.crew_push_t_post();
drop function if exists public.crew_push_t_kudos();
drop function if exists public.crew_push_t_ring();
drop function if exists public.crew_push_t_fact();
drop function if exists public.crew_push_t_award();
drop function if exists public.crew_push_t_honour();
drop function if exists public.crew_push_t_joined();
drop function if exists public.crew_push_fire();
drop function if exists public.crew_push_done(text, boolean);
drop function if exists public.crew_push_due(timestamptz, boolean);
drop function if exists public.crew_push_fold(timestamptz);
drop function if exists public.crew_push_sweep();
drop function if exists public.crew_push_add(text, text, uuid, jsonb);
drop function if exists public.crew_push_words(integer, text, text, boolean, text);

drop table if exists public.crew_push_seen;
drop table if exists public.crew_push_q;
