-- stage60 — hide a finished session instead of deleting it (2026-10-11, coach.html audit FILE-11 and ROSTER-9; Amir: "Hide it, keep it recoverable").
-- Safe to re-run.
--
-- Deleting a session from the dashboard removed the row for good, and that had two bad effects: the athlete's progress still carries the
-- `<id>_sent_dN` mark of the report that was emailed, so the roster showed a "session not synced" warning that could never clear (ROSTER-9), and the
-- athlete's phone could send the session again and bring it back (FILE-11). Now the dashboard HIDES it:
--   · session_history gets hidden_at and hidden_by. A hidden row stays in the table (the primary key still holds, so a re-send from the phone lands
--     on it instead of creating a second copy), and every reader leaves it out: get_my_history(), get_workout_days(), the dashboard's session list
--     and the pipeline's queries. The dashboard keeps hidden rows apart from its numbers and lists them in the athlete's File, each with Restore.
--   · coach_hide_session(athlete, day, date, hide) sets or clears it. Coach only; returns how many rows changed. updated_at is NOT touched: hiding is
--     not athlete activity.
--   · save_session(): an athlete's save never un-hides a row (the phone can re-send as often as it likes); a coach's save does (adding the session back
--     from an email means it is wanted again). Everything else in the function is the live definition, unchanged.
-- get_my_history() and get_workout_days() are the live definitions plus `and s.hidden_at is null`. Their grants stay (CREATE OR REPLACE keeps them).
-- coach_delete_training_history() and coach_erase_person() delete by athlete_id, so they remove hidden rows too: nothing to change there.
--
-- Rehearsed 2026-10-11 on the live database in a transaction that was rolled back (see the audit row): hide, restore, a phone re-save over a hidden
-- row, a coach's save over one, what each reader returns, and that nobody but the coach can call coach_hide_session().

alter table public.session_history
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by text;

create or replace function public.coach_hide_session(
  p_athlete_id   text,
  p_day          integer,
  p_completed_on date,
  p_hide         boolean default true
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_hide boolean := coalesce(p_hide, true); v_n integer;
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  if coalesce(btrim(p_athlete_id), '') = '' or p_day is null or p_completed_on is null then
    raise exception 'which session?';
  end if;
  with u as (
    update public.session_history s
       set hidden_at = case when v_hide then now() end,
           hidden_by = case when v_hide then auth.jwt() ->> 'email' end
     where s.athlete_id = p_athlete_id and s.day = p_day and s.completed_on = p_completed_on
       and (s.hidden_at is null) = v_hide
    returning 1)
  select count(*) into v_n from u;
  return jsonb_build_object('changed', v_n, 'hidden', v_hide);
end $function$;

revoke all on function public.coach_hide_session(text, integer, date, boolean) from public, anon, authenticated;
grant execute on function public.coach_hide_session(text, integer, date, boolean) to authenticated;

create or replace function public.get_my_history(p_athlete_id text, p_days integer default 180)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
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

create or replace function public.get_workout_days(p_athlete_id text, p_key text default null::text, p_since date default null::date)
returns setof date
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  -- A row exists here only because the athlete pressed "Finish Session", so
  -- every row counts — a partly-finished session still means they showed up.
  -- A row the coach has hidden does not count (stage60).
  return query
    select distinct s.completed_on
    from public.session_history s
    where s.athlete_id = p_athlete_id
      and s.completed_on is not null
      and s.hidden_at is null
      and (p_since is null or s.completed_on >= p_since)
    order by 1;
end; $function$;

create or replace function public.save_session(p_athlete_id text, p_athlete_name text, p_day integer, p_completed_on date, p_session jsonb, p_key text default null::text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_expected text;
        v_replace boolean := public.is_coach() and coalesce((p_session->>'replace_log')::boolean, false);
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  insert into public.session_history
    (athlete_id, athlete_name, day, completed_on, status, session_rpe,
     duration_min, readiness, day_note, focus, summary, log, updated_at)
  values (
    p_athlete_id, p_athlete_name, p_day, p_completed_on,
    p_session->>'status', round(nullif(p_session->>'session_rpe','')::numeric)::int,
    round(nullif(p_session->>'duration_min','')::numeric)::int, p_session->'readiness',
    p_session->>'day_note', p_session->>'focus', p_session->>'summary',
    case when jsonb_typeof(p_session->'log') = 'array' then p_session->'log' end,
    now())
  on conflict (athlete_id, day, completed_on) do update
    set athlete_name = excluded.athlete_name, status = excluded.status,
        session_rpe = excluded.session_rpe, duration_min = excluded.duration_min,
        readiness = excluded.readiness, day_note = excluded.day_note,
        focus = excluded.focus, summary = excluded.summary,
        log = case when v_replace then excluded.log else coalesce(excluded.log, session_history.log) end,
        coach_status = case
          when not public.is_coach()
           and ((coalesce(btrim(excluded.day_note), '') <> '' and excluded.day_note is distinct from session_history.day_note)
             or (public.session_ex_notes(excluded.log, excluded.summary) <> ''
             and public.session_ex_notes(excluded.log, excluded.summary)
                 is distinct from public.session_ex_notes(session_history.log, session_history.summary))) then 'new'
          else session_history.coach_status end,
        -- stage60: the phone re-sending a session the coach hid leaves it hidden; the coach saving over it brings it back.
        hidden_at = case when public.is_coach() then null else session_history.hidden_at end,
        hidden_by = case when public.is_coach() then null else session_history.hidden_by end,
        updated_at = now();
end; $function$;
