-- stage47 — coaching logs keep every earlier text (2026-10-10, coach.html audit TOOLS-1 / ROSTER-4). Applied.
--
-- coaching_logs held one text per athlete and nothing else. publish_cycle() splices into it, /cycle-report
-- appends a Debrief, and the old "↑ Coaching logs" button replaced it wholesale from local files: any of
-- those going wrong lost the Debriefs for good (programs has had program_versions since 2026-09-07).
-- Now every UPDATE that changes the body keeps the text it replaced. Nothing is pruned yet (33 logs,
-- about 0.6 MB in all): pruning needs a DELETE, and erasing a person must include this table.
-- To put a text back: select body from coaching_log_versions where athlete_id = '<id>' order by id desc;
-- then update coaching_logs set body = <that> where athlete_id = '<id>' (which keeps the current one too).
-- coach.html backs it up (BACKUP_TABLES). Safe to re-run.

create table if not exists public.coaching_log_versions (
  id              bigserial primary key,
  athlete_id      text not null,
  body            text not null,
  saved_at        timestamptz not null default now(),   -- when it was replaced
  was_updated_at  timestamptz                            -- the replaced text's own updated_at
);
create index if not exists coaching_log_versions_athlete_idx on public.coaching_log_versions (athlete_id, id desc);
alter table public.coaching_log_versions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policy where polrelid = 'public.coaching_log_versions'::regclass and polname = 'coach manage coaching log versions') then
    create policy "coach manage coaching log versions" on public.coaching_log_versions
      for all to authenticated using (public.is_coach()) with check (public.is_coach());
  end if;
end $$;
revoke all on public.coaching_log_versions from anon;
grant select, insert on public.coaching_log_versions to authenticated;
grant usage, select on sequence public.coaching_log_versions_id_seq to authenticated;

create or replace function public.coaching_logs_keep_version()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if old.body is distinct from new.body then
    insert into public.coaching_log_versions (athlete_id, body, was_updated_at)
    values (old.athlete_id, old.body, old.updated_at);
  end if;
  return new;
end; $function$;
create or replace trigger coaching_logs_version_trg before update on public.coaching_logs
  for each row execute function public.coaching_logs_keep_version();
