-- stage45 — forget_contact() refuses a coached athlete (2026-10-10, coach.html audit MKT-1).
--
-- forget_contact() was written to remove free Proof signups, whose progress row holds only habit
-- keys. It deletes the WHOLE athlete_progress row whatever the tier, and the Proof funnel listed
-- every hab_contacts row, coached clients included. On a coached athlete that row is also their
-- training app's cloud copy: Personal Records, body weight, set logs, check-ins. The confirm said
-- "their session history stays", which read as "their training is safe".
--
-- Now: an athlete whose programme row is not tier 'free' is refused with a message, and nothing is
-- deleted. Free signups and Proof-only contacts (no programme row) are forgotten exactly as before.
-- coach.html also stops drawing "forget" for coached contacts. Applied with the Supabase MCP.

create or replace function public.forget_contact(p_athlete_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  if exists (
    select 1 from public.programs p
     where p.athlete_id = p_athlete_id
       and coalesce(p.data->'athlete'->>'tier', p.data->>'tier', '') <> 'free'
  ) then
    raise exception 'coached athlete: forget would delete their training app data (records, body weight, check-ins). Nothing was deleted.';
  end if;
  delete from public.hab_notes         where athlete_id = p_athlete_id;
  delete from public.leaderboard_optin where athlete_id = p_athlete_id;
  delete from public.athlete_progress  where athlete_id = p_athlete_id;
  delete from public.hab_contacts      where athlete_id = p_athlete_id;
  delete from public.athlete_keys      where athlete_id = p_athlete_id;
end; $function$;
