-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 30 — THE CARD REMEMBERS: sessions saved as data, and read back
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Amir, 2026-09-24 (idea #5 of "The Coaching Graph"): every exercise card shows
-- what the athlete did the LAST time they did that exercise.
--
-- Until now a session reached the server only as a readable text summary
-- (session_history.summary), and only the coach could read the table at all
-- (RLS "coach read sessions"). 444 sessions from 27 athletes had been saved and
-- the athlete app had never shown one of them back.
--
-- ── What this adds ─────────────────────────────────────────────────────────
-- 1. session_history.log jsonb — the same sets the summary describes, as data:
--      [{ ex, block, reps, sets: [{ w, n, r, d }], note }                standard
--       { ex, block, circuit: true, items: [{name, w}], rounds: [{round, r}], note }]
--    `n` is the reps actually done (program.html resolves "as prescribed" to
--    the planned number before sending); `reps` is the plan.
-- 2. save_session() stores it. An older cached copy of the app sends no `log`,
--    so the upsert KEEPS the existing value rather than nulling it
--    (coalesce(excluded.log, session_history.log)).
-- 3. get_my_history() — an athlete reads their OWN recent sessions. The same
--    identity rule as get_program(): the coach reads anyone, a signed-in
--    athlete reads only themselves, everyone else is refused. 'demo' gets an
--    empty array (the demo draws made-up history on the client).
--
-- ── Deliberately NOT done: no backfill ─────────────────────────────────────
-- Rows saved before this stage have log = null. get_my_history() returns their
-- `summary` instead and program.html parses it (parseSummaryLog, a port of
-- coach.html's parseSetLine / parseSessionLog). That means no data migration
-- on a project with NO automatic backups, and rows written by a stale app copy
-- after this ships are read the same way.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.session_history add column if not exists log jsonb;

create or replace function public.save_session(p_athlete_id text, p_athlete_name text, p_day integer, p_completed_on date, p_session jsonb, p_key text default null::text)
 returns void
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
  insert into public.session_history
    (athlete_id, athlete_name, day, completed_on, status, session_rpe,
     duration_min, readiness, day_note, focus, summary, log, updated_at)
  values (
    p_athlete_id, p_athlete_name, p_day, p_completed_on,
    p_session->>'status', nullif(p_session->>'session_rpe','')::int,
    nullif(p_session->>'duration_min','')::int, p_session->'readiness',
    p_session->>'day_note', p_session->>'focus', p_session->>'summary',
    case when jsonb_typeof(p_session->'log') = 'array' then p_session->'log' end,
    now())
  on conflict (athlete_id, day, completed_on) do update
    set athlete_name = excluded.athlete_name, status = excluded.status,
        session_rpe = excluded.session_rpe, duration_min = excluded.duration_min,
        readiness = excluded.readiness, day_note = excluded.day_note,
        focus = excluded.focus, summary = excluded.summary,
        log = coalesce(excluded.log, session_history.log),
        updated_at = now();
end; $function$;

-- Newest first. 180 days / 120 rows is several cycles of history for a
-- four-day athlete while keeping the payload small (a summary is ~1-2 KB).
create or replace function public.get_my_history(p_athlete_id text, p_days integer default 180)
 returns jsonb
 language plpgsql
 stable security definer
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
           s.log,
           case when s.log is null then s.summary end as summary
    from public.session_history s
    where s.athlete_id = p_athlete_id
      and s.completed_on >= current_date - greatest(1, least(coalesce(p_days, 180), 400))
    order by s.completed_on desc, s.day desc
    limit 120
  ) r;
  return v;
end $function$;

revoke all on function public.get_my_history(text, integer) from public;
grant execute on function public.get_my_history(text, integer) to anon, authenticated;
