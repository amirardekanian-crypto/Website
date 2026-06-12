-- ============================================================================
--  STAGE 5 — weekly check-in CALL LOGS (coach-authored)
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2).
--  Run AFTER stage1–4. Safe to re-run: every statement is guarded.
--
--  What this is: the coach fills a weekly check-in form (call-log.html) during
--  each athlete call. Each saved call is one row here, tied to an athlete_id.
--
--  Why this is SIMPLER than the athlete tables (no SECURITY DEFINER function):
--  athlete progress is written by ANONYMOUS phones, which can't be allowed to
--  read the table — hence the save_* functions. Call logs are written only by
--  YOU, signed in with Google. So the coach (allowlisted email) just gets a
--  normal RLS "for all" policy: full read/write. Athletes get nothing.
-- ============================================================================

create table if not exists public.call_logs (
  id              uuid primary key default gen_random_uuid(),
  athlete_id      text not null,              -- ties the log to the athlete record
  athlete_name    text,                        -- snapshot of the name at call time
  call_date       date not null,
  week            text,                        -- e.g. "W12 / Blk3"
  duration        text,                        -- e.g. "15 min"
  tier            text,                        -- Foundation / Performance / Elite
  rating          integer,                     -- coach's call-quality self-rating /5
  scores          jsonb not null default '{}'::jsonb,  -- {well,sleep,energy,sore,rpe,court} each /10
  sessions_done   integer,
  sessions_planned integer,
  win_vault       text,                        -- the single best quote from the call
  answers         jsonb not null default '{}'::jsonb,  -- {key:{label,value}} for every free-text answer
  summary         text,                        -- human-readable flattened summary
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- one call per athlete per day: re-saving the same call updates it, never duplicates
  unique (athlete_id, call_date)
);

alter table public.call_logs enable row level security;

-- READ + WRITE + DELETE: coach only (the signed-in, allowlisted email).
-- This is the whole security model — same gate as athlete_progress reads.
-- Change the email here if the coach account ever changes.
drop policy if exists "coach manage call_logs" on public.call_logs;
create policy "coach manage call_logs" on public.call_logs
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

-- Sort helper: newest call first, per athlete.
create index if not exists call_logs_athlete_date_idx
  on public.call_logs (athlete_id, call_date desc);

-- Keep updated_at fresh on every change.
create or replace function public.touch_call_logs_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end; $fn$;

drop trigger if exists call_logs_touch on public.call_logs;
create trigger call_logs_touch
  before update on public.call_logs
  for each row execute function public.touch_call_logs_updated_at();
