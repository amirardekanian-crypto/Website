-- ============================================================================
--  STAGE 8 — end-of-cycle reports
--  Run AFTER stage5/stage7. Safe to re-run.
--
--  At cycle-end the coach generates a report that reads ALL the weekly check-in
--  summaries for a cycle PLUS all the workout logs for that cycle, surfaces
--  trends that drive the next cycle's programming, and flags content-worthy
--  wins. The `cycle-report` Edge Function writes one row here per athlete+cycle.
-- ============================================================================

create table if not exists public.cycle_reports (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     text not null,
  athlete_name   text,
  cycle          text not null,          -- the cycle number the report covers (e.g. "2")
  report         jsonb not null,         -- {cycle_overview, trends[], what_worked[], what_to_change[], programming_decisions[], load_direction, content_wins[], flags[]}
  weeks_count    integer,                -- how many weekly check-ins fed it
  sessions_count integer,                -- how many logged sessions fed it
  model          text,
  generated_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (athlete_id, cycle)             -- re-generating the same cycle updates the row
);

alter table public.cycle_reports enable row level security;

-- Coach-only (the signed-in, allowlisted email). Same gate as everything else.
drop policy if exists "coach manage cycle_reports" on public.cycle_reports;
create policy "coach manage cycle_reports" on public.cycle_reports
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

create index if not exists cycle_reports_athlete_idx
  on public.cycle_reports (athlete_id, cycle);
