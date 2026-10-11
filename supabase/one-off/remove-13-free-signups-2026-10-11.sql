-- Remove the 13 free Proof signups who never got a login.
-- Amir, 2026-10-11: "Forget them all", then "Remove everything" (programme rows and titles too).
--
-- Safe by construction. It stops, deleting nothing, unless there are EXACTLY 13 free programmes and none of
-- them has a login, a training session or a message. It touches only those programmes' own rows, and when it has
-- finished it checks every table in the public and backup schemas that has an athlete_id column: if one still holds
-- a row for any of the 13 it undoes everything and names the table (all or nothing, like the Erase button).
-- Run it once in Supabase -> SQL Editor. If it says "Success", it is done.
do $$
declare
  ids text[];
  t   text;
  sch text;
  n   bigint;
begin
  select array_agg(athlete_id order by athlete_id) into ids
    from public.programs
   where coalesce(data->'athlete'->>'tier', data->>'tier', '') = 'free';

  if coalesce(cardinality(ids), 0) <> 13 then
    raise exception 'Expected 13 free programmes, found %. Nothing was deleted.', coalesce(cardinality(ids), 0);
  end if;
  if exists (select 1 from public.athlete_identities where athlete_id = any (ids))
     or exists (select 1 from public.session_history   where athlete_id = any (ids))
     or exists (select 1 from public.messages          where athlete_id = any (ids)) then
    raise exception 'One of the 13 now has a login, a session or a message. Nothing was deleted.';
  end if;

  -- the programme first, as publish_cycle() and the Erase button lock it
  delete from public.programs              where athlete_id = any (ids);
  delete from public.program_versions      where athlete_id = any (ids);
  delete from public.coaching_logs         where athlete_id = any (ids);
  delete from public.coaching_log_versions where athlete_id = any (ids);
  delete from public.hab_notes             where athlete_id = any (ids);
  delete from public.leaderboard_optin     where athlete_id = any (ids);
  delete from public.athlete_progress      where athlete_id = any (ids);
  delete from public.hab_titles            where athlete_id = any (ids);
  delete from public.hab_season_results    where athlete_id = any (ids);
  delete from public.library_sessions      where athlete_id = any (ids);
  delete from public.call_logs             where athlete_id = any (ids);
  delete from public.cycle_reports         where athlete_id = any (ids);
  delete from public.hab_contacts          where athlete_id = any (ids);
  delete from public.athlete_keys          where athlete_id = any (ids);
  -- a partner record that points at one of them stays; only the link goes
  update public.affiliates set athlete_id = null where athlete_id = any (ids);

  -- nothing may be left under those ids in ANY table that has an athlete_id column (a table added later shows up here)
  for sch, t in
    select n2.nspname::text, c.relname::text
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n2 on n2.oid = c.relnamespace
     where n2.nspname in ('public', 'backup') and a.attname = 'athlete_id' and a.attnum > 0 and not a.attisdropped
       and c.relkind in ('r', 'p')
     order by 1, 2
  loop
    execute format('select count(*) from %I.%I where athlete_id::text = any ($1)', sch, t) into n using ids;
    if n > 0 then
      raise exception 'The table %.% still holds % row(s) for one of the 13. Nothing was deleted.', sch, t, n;
    end if;
  end loop;
end $$;
