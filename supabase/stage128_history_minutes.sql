-- stage128_history_minutes.sql — get_my_history() also returns each session's minutes and finish time (2026-11-24)
--
-- Round 14 'The Changeover' (Amir: "go with your picks and build all"). #139 Footprint reads a finished session as big, normal or easy,
-- and one of the four ways a session is big is its load (session RPE x minutes) a third above the athlete's own usual, the middle load
-- of their sessions in the 28 days before (recovery/footprint.toml). coach.html has every session's minutes (session_history.duration_min);
-- the athlete's phone reads its history through get_my_history(), which returned the session RPE but not the minutes, so the phone could
-- not work out the usual and the two copies of Footprint (program.html footprintOf(), coach.html footprintOfC()) would disagree.
--
-- What this does: get_my_history() is the live definition (stage60's, as supabase/schema_snapshot.sql has it) plus two keys in each row,
-- `duration_min` and `fin` (the phone's local finish time, stage99). Nothing else changes: the same rows, order, limit, window, the
-- hidden_at filter and the identity check. An older phone ignores the two new keys; a phone from before this stage simply has no load
-- and the load rule says nothing (footprintOf() treats a missing minute as no load). No table, so nothing for BACKUP_TABLES or the erase list.
-- CREATE OR REPLACE keeps the function's grants. Safe to re-run.

do $stage128_guard$
begin
  if to_regprocedure('public.get_my_history(text,integer)') is null then
    raise exception 'stage128: public.get_my_history(text, integer) is missing. Nothing was changed.';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'session_history' and column_name = 'fin') then
    raise exception 'stage128: session_history.fin (stage99) is missing. Nothing was changed.';
  end if;
end $stage128_guard$;

CREATE OR REPLACE FUNCTION public.get_my_history(p_athlete_id text, p_days integer DEFAULT 180)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v jsonb;
begin
  if p_athlete_id = 'demo' then
    return '[]'::jsonb;
  end if;
  -- coalesce: a NULL id must be refused, not slip through a NULL comparison.
  if not coalesce(public.is_coach() or p_athlete_id = public.current_athlete_id(), false) then
    raise exception 'not allowed';
  end if;
  select coalesce(jsonb_agg(r order by r.completed_on desc, r.day desc), '[]'::jsonb) into v
  from (
    select s.completed_on, s.day, s.focus, s.session_rpe,
           s.duration_min,   -- stage128: the load is session RPE x minutes (#139 Footprint)
           s.fin,            -- stage128: the phone's local finish time, "HH:MM" (stage99)
           s.readiness->'composite' as readiness,
           s.readiness as ready,
           s.log,
           case when s.log is null then s.summary end as summary
    from public.session_history s
    where s.athlete_id = p_athlete_id
      and s.hidden_at is null
      and s.completed_on >= current_date - greatest(1, least(coalesce(p_days, 180), 400))
    order by s.completed_on desc, s.day desc
    limit 120
  ) r;
  return v;
end $function$;
