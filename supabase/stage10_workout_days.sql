-- ============================================================================
--  STAGE 10 — workout days for the habit tracker
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Run AFTER stage1–stage4.
--  Safe to re-run.
--
--  Why this exists: the training app (program.html) and the habit tracker
--  (habits.html) are two SEPARATE apps. Neither writes into the other's
--  storage. The one fact they share — "did this athlete train on day X" —
--  travels through the server, not through the browser.
--
--  program.html already records every confirmed finish (full OR partial) to
--  session_history via save_session(). This function just lets the habit
--  tracker read back the dates, so it can tick its WORKOUT habit. It is
--  read-only, key-checked, and returns nothing but dates.
-- ============================================================================

create or replace function public.get_workout_days(
  p_athlete_id text, p_key text default null, p_since date default null)
returns setof date
language plpgsql
security definer
set search_path = public
as $fn$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  -- A row exists here only because the athlete pressed "Finish Session", so
  -- every row counts — a partly-finished session still means they showed up.
  return query
    select distinct s.completed_on
    from public.session_history s
    where s.athlete_id = p_athlete_id
      and s.completed_on is not null
      and (p_since is null or s.completed_on >= p_since)
    order by 1;
end; $fn$;

revoke all on function public.get_workout_days(text, text, date) from public;
grant execute on function public.get_workout_days(text, text, date) to anon, authenticated;
