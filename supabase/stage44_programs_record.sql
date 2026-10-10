-- stage44 — A RECORD, not a migration (2026-10-10, coach.html audit WORK-13).
--
-- public.programs, public.program_versions and the trigger that keeps the history were created in
-- the live database on 2026-09-07 and never written down in this folder. coach.html's exercise
-- editor now depends on that trigger: it saves with `.eq('updated_at', <the value it read>)`, which
-- only works because programs_version_snapshot() sets updated_at = now() on EVERY update. If the
-- trigger is ever dropped or changed, that guard (and the "Last saved by" line, and Version history)
-- silently stops working.
--
-- This file is what the catalogue said on 2026-10-10 (pg_get_functiondef, pg_constraint, pg_policies,
-- information_schema). It is idempotent, so it can rebuild the objects on a fresh project, but the
-- live project already has all of it: do NOT run it there as a "fix".

-- ── the tables ──────────────────────────────────────────────────────────────
create table if not exists public.programs (
  athlete_id  text        primary key,
  data        jsonb       not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table if not exists public.program_versions (
  id          bigserial   primary key,
  athlete_id  text        not null,
  data        jsonb       not null,          -- the programme as it was BEFORE the save at saved_at
  saved_at    timestamptz not null default now(),
  saved_by    text,                          -- who wrote that earlier version (old.updated_by)
  note        text
);
create index if not exists program_versions_athlete_saved_idx
  on public.program_versions (athlete_id, saved_at desc);

-- ── who may read and write ──────────────────────────────────────────────────
-- is_coach() is the email check every coach policy uses.
create or replace function public.is_coach()
returns boolean language sql stable set search_path to 'public'
as $$ select coalesce(auth.jwt() ->> 'email', '') = 'amirardekanian@gmail.com' $$;

alter table public.programs enable row level security;
alter table public.program_versions enable row level security;

drop policy if exists "coach manage programs" on public.programs;
create policy "coach manage programs" on public.programs
  for all to authenticated using (is_coach()) with check (is_coach());

-- An athlete reads only their own row (get_program() is the door the apps use).
drop policy if exists "athlete reads own program" on public.programs;
create policy "athlete reads own program" on public.programs
  for select to authenticated
  using (athlete_id in (select ai.athlete_id from athlete_identities ai where ai.user_id = auth.uid()));

drop policy if exists "coach manage versions" on public.program_versions;
create policy "coach manage versions" on public.program_versions
  for all to authenticated using (is_coach()) with check (is_coach());

-- ── the history trigger ─────────────────────────────────────────────────────
-- Every change to data keeps the previous version (the last 20 per athlete), and EVERY update stamps
-- updated_at / updated_by. coach.html reads updated_at as the programme's version.
create or replace function public.programs_version_snapshot()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if old.data is distinct from new.data then
    insert into public.program_versions (athlete_id, data, saved_by)
    values (old.athlete_id, old.data, old.updated_by);

    delete from public.program_versions v
     where v.athlete_id = old.athlete_id
       and v.id not in (
         select id from public.program_versions
          where athlete_id = old.athlete_id
          order by id desc
          limit 20
       );
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end $function$;

drop trigger if exists programs_version_trg on public.programs;
create trigger programs_version_trg before update on public.programs
  for each row execute function public.programs_version_snapshot();
