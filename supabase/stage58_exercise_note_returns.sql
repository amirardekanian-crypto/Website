-- stage58 — a note on a single exercise, added or changed after Amir marked the session read, brings the session back to "needs you"
-- (2026-10-11, coach.html audit TODAY-3). Safe to re-run.
--
-- stage46 made save_session() set coach_status back to 'new' when an athlete adds or changes the note for the WHOLE session (day_note). A note on one
-- exercise (log[].note in the structured log, "    Note: …" in the summary text) is just as much a message to Amir, and when it was added after he
-- marked the session read it stayed read: Today said nothing was waiting.
--   · session_ex_notes(log, summary): the exercise notes of a session, one per line, from the structured log when it has one (the app sends it with
--     every save) and from the summary text otherwise. A pure function.
--   · save_session(): the session comes back to 'new' when the notes in the payload (its log, else its summary) are not empty and differ from the notes
--     the row had before, exactly as it already does for day_note. Taking a note away does not bring a session back, and neither does a weight or an
--     RPE edit.
-- Everything else in save_session() is the live definition, unchanged (the grants stay: CREATE OR REPLACE keeps them).
--
-- Rehearsed 2026-10-11 on the live database in a transaction that was rolled back: the old function left a session read after an exercise note was
-- added (the bug); this one returns it to new, keeps it read for a repeat save, a weight edit and a deleted note, and leaves the coach's own saves alone.

create or replace function public.session_ex_notes(p_log jsonb, p_summary text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select coalesce(case
    when jsonb_typeof(p_log) = 'array' then
      (select string_agg(btrim(t.e ->> 'note'), E'\n' order by t.ord)
         from jsonb_array_elements(p_log) with ordinality as t(e, ord)
        where coalesce(btrim(t.e ->> 'note'), '') <> '')
    else
      (select string_agg(btrim(r.m[1]), E'\n')
         from regexp_matches(coalesce(p_summary, ''), '(?:^|\n)[ \t]+Note:[ \t]*([^\n]*)', 'g') as r(m)
        where btrim(r.m[1]) <> '')
  end, '');
$function$;

create or replace function public.save_session(p_athlete_id text, p_athlete_name text, p_day integer,
  p_completed_on date, p_session jsonb, p_key text default null::text)
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
        updated_at = now();
end; $function$;
