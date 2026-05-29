-- ============================================================================
--  STAGE 1 SCHEMA — cloud backup of athlete progress + coach dashboard
--  Project: amirardekanian-crypto's Project (bvipfipbdcyqnbczjmaq, eu-west-2)
--
--  This reflects the LIVE, working design (applied 2026-05-29).
--  Safe to re-run: every statement is guarded.
--
--  Design:
--   - The training app keeps the phone's localStorage as the source of truth
--     (instant, offline-friendly). It also mirrors ALL of that athlete's
--     progress keys into ONE row here, as a JSON blob.
--   - Athletes (anonymous) WRITE only through the save_progress() function,
--     never directly. They cannot read the table at all.
--   - Only the signed-in coach (allowlisted email) can READ.
--
--  Why a function instead of a direct upsert: an anonymous upsert reads the
--  row back after writing, which RLS (correctly) denies to athletes, so the
--  whole write fails. A SECURITY DEFINER function sidesteps that and is also
--  tighter — athletes get zero direct table access.
-- ============================================================================

create table if not exists public.athlete_progress (
  athlete_id   text        primary key,
  athlete_name text,
  data         jsonb       not null default '{}'::jsonb,  -- snapshot of all the athlete's localStorage keys
  updated_at   timestamptz not null default now()
);

-- Lock the table down — no direct access until a policy allows it.
alter table public.athlete_progress enable row level security;

-- ---------------------------------------------------------------------------
-- WRITE PATH: a SECURITY DEFINER upsert function. Runs as its owner, so it
-- bypasses RLS to write; athletes can only EXECUTE it, not touch the table.
-- Stage 1 trade-off: writes aren't yet tied to a logged-in athlete, so a
-- technical user could call it with any athlete_id. Stage 2 (real athlete
-- login) adds an auth check inside this function.
-- ---------------------------------------------------------------------------
-- The app keeps localStorage as the source of truth, but it clears a day's
-- per-session data (completed flag, readiness, RPE, day note) the next calendar
-- day (autoResetStaleDays in program.html). So the cloud must ACCUMULATE, not
-- mirror: we MERGE the incoming snapshot into the stored blob (jsonb ||) so
-- once a session is synced it persists in the dashboard even after the phone
-- wipes it. New values win on matching keys; old keys not in the new payload
-- are retained. (Known minor gap: per-set RPE of standard lifts is stored
-- inside one _setlog_<ex> key that the app overwrites with a cleared version on
-- rollover, so that detail still degrades — weights are kept. A future
-- "save a permanent record at finish" step would close that gap.)
create or replace function public.save_progress(p_athlete_id text, p_athlete_name text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.athlete_progress (athlete_id, athlete_name, data, updated_at)
  values (p_athlete_id, p_athlete_name, p_data, now())
  on conflict (athlete_id) do update
    set athlete_name = excluded.athlete_name,
        data         = athlete_progress.data || excluded.data,
        updated_at   = now();
end;
$fn$;

revoke all on function public.save_progress(text, text, jsonb) from public;
grant execute on function public.save_progress(text, text, jsonb) to anon, authenticated;

-- No direct INSERT/UPDATE policies for athletes — writes go through the
-- function above. (Drop any left over from earlier iterations.)
drop policy if exists "anon insert progress"    on public.athlete_progress;
drop policy if exists "anon update progress"     on public.athlete_progress;
drop policy if exists "anyone can insert progress" on public.athlete_progress;
drop policy if exists "anyone can update progress" on public.athlete_progress;

-- ---------------------------------------------------------------------------
-- READ: only the signed-in coach (allowlisted email) can see any data.
-- This is the real privacy gate, enforced by the database itself.
-- Change the email here if the coach account ever changes.
-- ---------------------------------------------------------------------------
drop policy if exists "coach read progress" on public.athlete_progress;
create policy "coach read progress" on public.athlete_progress
  for select to authenticated
  using ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

-- Sort helper for "who trained recently".
create index if not exists athlete_progress_updated_idx
  on public.athlete_progress (updated_at desc);


-- ============================================================================
--  STAGE 1.5 — permanent, immutable record of each FINISHED session
--
--  The athlete_progress blob above is a live mirror that the phone clears on
--  the daily rollover. This table is the opposite: when a client taps
--  "Finish / send to coach" (the same moment the Web3Forms email fires),
--  program.html also calls save_session() to store a frozen snapshot of that
--  completed session — including the full human-readable summary, so per-set
--  detail never degrades. Append-only from the coach's point of view.
-- ============================================================================

create table if not exists public.session_history (
  athlete_id   text        not null,
  athlete_name text,
  day          integer     not null,
  completed_on date        not null,         -- calendar date the session was finished
  status       text,                          -- 'Complete' or 'Partial (...)'
  session_rpe  integer,
  duration_min integer,
  readiness    jsonb,
  day_note     text,
  focus        text,
  summary      text,                          -- full human-readable detail (never degrades)
  updated_at   timestamptz not null default now(),
  primary key (athlete_id, day, completed_on) -- resend same day = update; later date = new row
);

alter table public.session_history enable row level security;

-- READ: coach only (same gate as athlete_progress).
drop policy if exists "coach read sessions" on public.session_history;
create policy "coach read sessions" on public.session_history
  for select to authenticated
  using ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

create index if not exists session_history_athlete_idx
  on public.session_history (athlete_id, completed_on desc);

-- WRITE: SECURITY DEFINER upsert callable by athletes (anon). Same pattern as
-- save_progress — athletes can record a finished session but can't read the table.
create or replace function public.save_session(
  p_athlete_id text, p_athlete_name text, p_day integer,
  p_completed_on date, p_session jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.session_history
    (athlete_id, athlete_name, day, completed_on, status, session_rpe,
     duration_min, readiness, day_note, focus, summary, updated_at)
  values (
    p_athlete_id, p_athlete_name, p_day, p_completed_on,
    p_session->>'status',
    nullif(p_session->>'session_rpe','')::int,
    nullif(p_session->>'duration_min','')::int,
    p_session->'readiness',
    p_session->>'day_note',
    p_session->>'focus',
    p_session->>'summary',
    now())
  on conflict (athlete_id, day, completed_on) do update
    set athlete_name = excluded.athlete_name,
        status       = excluded.status,
        session_rpe  = excluded.session_rpe,
        duration_min = excluded.duration_min,
        readiness    = excluded.readiness,
        day_note     = excluded.day_note,
        focus        = excluded.focus,
        summary      = excluded.summary,
        updated_at   = now();
end;
$fn$;

revoke all on function public.save_session(text, text, integer, date, jsonb) from public;
grant execute on function public.save_session(text, text, integer, date, jsonb) to anon, authenticated;
