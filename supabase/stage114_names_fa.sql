-- stage114_names_fa.sql — people's names in Farsi on a Farsi phone (2026-11-21)
--
-- Why (Amir, 2026-11-21: "in farsi version, people name should be in farsi as well"). The athlete app in Farsi
-- (assets/js/i18n.js) translates its own words from a PUBLIC file, assets/js/i18n-fa.js. Athletes' names must never go
-- there: it would publish the client list. So each athlete's Farsi name lives in their own programme
-- (public.programs data->'athlete'->'name_fa' = {first, last}, written 2026-11-21 by Claude from the English, for Amir to
-- correct), and this function hands a signed-in athlete the Farsi of the names THEY can see:
--   · their own: first name, full name, and "First L." as Crew writes it;
--   · every crew member who said yes (crew_consent.answer = 'yes'): the name they show (crew_consent.name, which is their
--     first name, "First L." or the full name), and their first name alone (pages and faces use the first word).
-- Nothing else: no athlete who is not in the crew, no ids. It returns { "<English as drawn>": "<Farsi>" }. The app adds it to
-- the Farsi layer (AAI18N.addNames()), so only what is shown on the screen changes: the programme, every session report and
-- everything the app sends keep the English name.
--
-- APPLIED 2026-11-21 to the live project as the migration `stage114_names_fa` (the statements are this file from `do $stage114_guard$` on).
-- No table, so nothing for BACKUP_TABLES or coach_erase_person() (the Farsi name is inside the programme row, which both
-- already cover). The way back: drop function public.get_names_fa(); (on Amir's word only). Safe to re-run.

do $stage114_guard$
begin
  if to_regprocedure('public.current_athlete_id()') is null or to_regclass('public.crew_consent') is null then
    raise exception 'stage114: current_athlete_id() or crew_consent is missing. Nothing was changed.';
  end if;
end $stage114_guard$;

create or replace function public.get_names_fa() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_me  text := public.current_athlete_id();
  v_out jsonb := '{}'::jsonb;
  r     record;
begin
  if v_me is null then return v_out; end if;
  for r in
    select p.athlete_id,
           btrim(coalesce(p.data->'athlete'->>'firstName', '')) f, btrim(coalesce(p.data->'athlete'->>'lastName', '')) l,
           btrim(coalesce(p.data->'athlete'->'name_fa'->>'first', '')) ff, btrim(coalesce(p.data->'athlete'->'name_fa'->>'last', '')) fl,
           btrim(coalesce(c.name, '')) shown
      from public.programs p
      left join public.crew_consent c on c.athlete_id = p.athlete_id
     where p.athlete_id = v_me or c.answer = 'yes'
  loop
    if r.ff = '' or r.f = '' then continue; end if;
    v_out := v_out || jsonb_build_object(r.f, r.ff);
    if r.l <> '' and r.fl <> '' then
      v_out := v_out || jsonb_build_object(r.f || ' ' || r.l, r.ff || ' ' || r.fl,
                                           r.f || ' ' || left(r.l, 1) || '.', r.ff || ' ' || left(r.fl, 1) || '.');
    end if;
    -- The name shown in the crew is one of those three forms; one an athlete typed some other way stays as typed.
  end loop;
  return v_out;
end $function$;

revoke all on function public.get_names_fa() from public, anon;
grant execute on function public.get_names_fa() to authenticated;
