-- stage59 — a database edit with no signed-in user no longer inherits the previous author's NAME (2026-10-11, coach.html audit SERVER-12). Safe to re-run.
--
-- programs_version_snapshot() stamps updated_at on every update and updated_by with the signed-in email:
--     new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
-- An UPDATE that comes from the SQL editor or the MCP has no email, and one that does not set updated_by leaves the old value in new.updated_by, so
-- Version history and "last saved by" named whoever wrote the row last, as if they had made this edit. Now, with no signed-in user, an updated_by that
-- is still the old PERSON (an email) becomes 'sql'. A label stays: publish_cycle() writes 'publish_cycle' on every call (so two publishes in a row
-- still say publish_cycle), and a writer that sets updated_by itself (Claude's 'claude', anything else) is believed. A signed-in write is unchanged.
--
-- Everything else in the function is the live definition (stage52's retention: the last 20 saves and everything since the previous cycle began, at most 150).
-- Rehearsed 2026-10-11 on the live database in a transaction that was rolled back (see the audit row).

create or replace function public.programs_version_snapshot()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  keep_from timestamptz;
begin
  if old.data is distinct from new.data then
    insert into public.program_versions (athlete_id, data, saved_by)
    values (old.athlete_id, old.data, old.updated_by);

    begin
      keep_from := public.programs_keep_versions_from(new.data);
    exception when others then
      keep_from := now() - interval '70 days';
    end;

    delete from public.program_versions v
     where v.athlete_id = old.athlete_id
       and (
            v.id not in (
              select id from public.program_versions
               where athlete_id = old.athlete_id
               order by id desc
               limit 150)
         or (v.saved_at < keep_from
             and v.id not in (
               select id from public.program_versions
                where athlete_id = old.athlete_id
                order by id desc
                limit 20))
       );
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(
    auth.jwt() ->> 'email',
    case when new.updated_by is not distinct from old.updated_by and old.updated_by like '%@%' then 'sql' else new.updated_by end);
  return new;
end $function$;
