-- stage119_names_fa_typed.sql — a crew name typed its own way still gets its Farsi (2026-11-21)
--
-- Why (Amir, 2026-11-21, "fix all", on the Farsi Team screen): Behnam's honour card read "Behnam.z", the name he typed himself on
-- the leaderboard (leaderboard_optin.display_name, which the month's honours carry). stage114's get_names_fa() gave the Farsi only
-- for the three forms it builds ("Behnam", "Behnam Z.", "Behnam Zohoorian"), so on every Farsi phone that name stayed English.
-- Now each name a crew member shows (crew_consent.name and their leaderboard display_name) is compared with those three forms
-- with case, spaces, dots and other marks taken out: "Behnam.z", "behnam z", "BEHNAM Z." are all "behnamz", "First L." without
-- its marks, and get "بهنام ظ.". A name that is none of the three (a nickname) still stays as typed. Nothing else changes: the
-- same people, the same answer shape { "<English as drawn>": "<Farsi>" }.
--
-- APPLIED 2026-11-21 to the live project as the migration `stage119_names_fa_typed` (the statements are this file from `do $stage119_guard$` on).
-- No table, so nothing for BACKUP_TABLES or coach_erase_person(). The way back: re-run supabase/stage114_names_fa.sql. Safe to re-run.

do $stage119_guard$
begin
  if to_regprocedure('public.get_names_fa()') is null or to_regclass('public.crew_consent') is null or to_regclass('public.leaderboard_optin') is null then
    raise exception 'stage119: get_names_fa() (stage114) or crew_consent is missing. Nothing was changed.';
  end if;
end $stage119_guard$;

create or replace function public.get_names_fa() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_me  text := public.current_athlete_id();
  v_out jsonb := '{}'::jsonb;
  r     record;
  v_key text;
  v_nm  text;
begin
  if v_me is null then return v_out; end if;
  for r in
    select p.athlete_id,
           btrim(coalesce(p.data->'athlete'->>'firstName', '')) f, btrim(coalesce(p.data->'athlete'->>'lastName', '')) l,
           btrim(coalesce(p.data->'athlete'->'name_fa'->>'first', '')) ff, btrim(coalesce(p.data->'athlete'->'name_fa'->>'last', '')) fl,
           array_remove(array[nullif(btrim(coalesce(c.name, '')), ''), nullif(btrim(coalesce(lb.display_name, '')), '')], null) shown
      from public.programs p
      left join public.crew_consent c on c.athlete_id = p.athlete_id
      left join public.leaderboard_optin lb on lb.athlete_id = p.athlete_id
     where p.athlete_id = v_me or c.answer = 'yes'
  loop
    if r.ff = '' or r.f = '' then continue; end if;
    v_out := v_out || jsonb_build_object(r.f, r.ff);
    if r.l <> '' and r.fl <> '' then
      v_out := v_out || jsonb_build_object(r.f || ' ' || r.l, r.ff || ' ' || r.fl,
                                           r.f || ' ' || left(r.l, 1) || '.', r.ff || ' ' || left(r.fl, 1) || '.');
    end if;
    -- A name shown in the crew or on the board, typed its own way ("Behnam.z"): matched to one of the three forms without case or marks.
    foreach v_nm in array r.shown loop
      if v_out ? v_nm then continue; end if;
      v_key := regexp_replace(lower(v_nm), '[^[:alnum:]]', '', 'g');
      if v_key = regexp_replace(lower(r.f), '[^[:alnum:]]', '', 'g') then
        v_out := v_out || jsonb_build_object(v_nm, r.ff);
      elsif r.l <> '' and r.fl <> '' and v_key = regexp_replace(lower(r.f || left(r.l, 1)), '[^[:alnum:]]', '', 'g') then
        v_out := v_out || jsonb_build_object(v_nm, r.ff || ' ' || left(r.fl, 1) || '.');
      elsif r.l <> '' and r.fl <> '' and v_key = regexp_replace(lower(r.f || r.l), '[^[:alnum:]]', '', 'g') then
        v_out := v_out || jsonb_build_object(v_nm, r.ff || ' ' || r.fl);
      end if;
    end loop;
  end loop;
  return v_out;
end $function$;

revoke all on function public.get_names_fa() from public, anon;
grant execute on function public.get_names_fa() to authenticated;
