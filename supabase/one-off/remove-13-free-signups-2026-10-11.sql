-- Remove the 13 free Proof signups who never got a login.
-- Amir, 2026-10-11: "Forget them all", then "Remove everything" (programme rows and titles too).
--
-- Safe by construction. It stops, deleting nothing, unless there are EXACTLY 13 free programmes and none of
-- them has a login, a training session or a message. It touches only those programmes' own rows.
-- Run it once in Supabase -> SQL Editor. If it says "Success", it is done.
do $$
declare
  ids text[];
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

  delete from public.hab_notes          where athlete_id = any (ids);
  delete from public.leaderboard_optin  where athlete_id = any (ids);
  delete from public.athlete_progress   where athlete_id = any (ids);
  delete from public.hab_titles         where athlete_id = any (ids);
  delete from public.hab_season_results where athlete_id = any (ids);
  delete from public.hab_contacts       where athlete_id = any (ids);
  delete from public.athlete_keys       where athlete_id = any (ids);
  delete from public.program_versions   where athlete_id = any (ids);
  delete from public.programs           where athlete_id = any (ids);
end $$;
