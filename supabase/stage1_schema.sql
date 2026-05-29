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
        data         = excluded.data,
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
