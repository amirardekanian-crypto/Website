-- stage52 — a programme's version history keeps the current and the previous cycle (2026-10-11, coach.html audit
-- WORK-10 / SERVER-12; Amir: "about two cycles back"). Safe to re-run.
--
-- program_versions holds the programme as it stood before each save, for File -> Version history and Restore. The
-- trigger programs_version_snapshot() (stage44 records it) kept the newest 20 per athlete and deleted the rest, so on a
-- busy week the oldest restore point could be a few days back, and one athlete was already at 20.
--
-- Now an athlete's history keeps:
--   · always the newest 20 saves (the old floor), and
--   · every save made since the PREVIOUS cycle began (the programme's own cycles[currentCycleIndex - 1].startDate; the
--     current cycle's start when there is no previous one; 70 days back when the dates are missing), and
--   · never more than 150 in all (a safety cap: each copy is the whole programme, about 14 kB, so 150 is about 2 MB
--     for one athlete on a free database of 500 MB).
-- The horizon is read from the programme being SAVED, so publishing the next cycle moves it forward: the cycle before
-- the one just finished drops out then, not before.
--
-- The programme save must never fail over bookkeeping: the horizon is worked out by a function that cannot raise on a
-- programme of any shape, and the trigger falls back to 70 days if it ever does. Nothing here changes what the
-- trigger stamps on programs (updated_at on EVERY update, updated_by) which coach.html's guarded save depends on.
--
-- Nothing to backfill: versions already deleted by the old 20-cap cannot come back.

create or replace function public.programs_keep_versions_from(p_data jsonb)
returns timestamptz
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  idx int := 0;
  s   text;
  d   date;
begin
  begin idx := coalesce((p_data ->> 'currentCycleIndex')::int, 0); exception when others then idx := 0; end;
  if idx < 0 then idx := 0; end if;
  -- the previous cycle's start first, then the current cycle's
  foreach s in array array[
      case when idx >= 1 then p_data -> 'cycles' -> (idx - 1) ->> 'startDate' end,
      p_data -> 'cycles' -> idx ->> 'startDate'] loop
    if s is not null then
      begin d := s::date; exception when others then d := null; end;
      if d is not null then return d::timestamptz; end if;
    end if;
  end loop;
  return now() - interval '70 days';
end; $function$;

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
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end $function$;
