-- stage110_my_lang.sql — the athlete picks their language, and it is theirs on the server (2026-11-20)
--
-- Why (Amir, 2026-11-20): "let the client pick their language, and tell them that by choosing, their next cycle will be in their
-- chosen language". The app in Farsi shipped the same day (assets/js/i18n.js, docs/rules/farsi-app.md) with Settings → Language
-- stored on the phone only. Now the choice is also the programme's `athlete.lang`, the one field that already says an athlete's
-- language: the pipeline writes a cycle's words in it (/program-engage), and the reminders go out in it (stage88 push_lang_sync()).
--
-- What this adds: ONE function, set_my_lang(text), for the signed-in athlete only (current_athlete_id(), as stage84's push
-- functions). It writes 'en' or 'fa' into their own programme's athlete.lang and brings their phones' reminder subscriptions into
-- line at once (push_subs.lang), so the next reminder already speaks the new language instead of waiting for the hourly sync.
-- Nothing else in the programme moves. No table, so nothing for BACKUP_TABLES or coach_erase_person(); the programme's version
-- history (stage44's trigger) keeps the row as it was before, as it does for every write.
--
-- APPLIED 2026-11-20 to the live project as the migration `stage110_my_lang` (the statements are this file from `do $stage110_guard$` on).
-- The way back: drop function public.set_my_lang(text); (on Amir's word only). Safe to re-run.

do $stage110_guard$
begin
  if to_regprocedure('public.current_athlete_id()') is null or to_regclass('public.push_subs') is null then
    raise exception 'stage110: current_athlete_id() or push_subs is missing. Nothing was changed.';
  end if;
end $stage110_guard$;

create or replace function public.set_my_lang(p_lang text) returns text
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_id   text := public.current_athlete_id();
  v_lang text := lower(btrim(coalesce(p_lang, '')));
begin
  if v_id is null then raise exception 'set_my_lang: not signed in as an athlete'; end if;
  if v_lang not in ('en', 'fa') then raise exception 'set_my_lang: the language is en or fa'; end if;
  update public.programs
     set data = jsonb_set(data, '{athlete,lang}', to_jsonb(v_lang), true),
         updated_at = now(), updated_by = 'athlete: language'
   where athlete_id = v_id and jsonb_typeof(data->'athlete') = 'object'
     and coalesce(data->'athlete'->>'lang', '') <> v_lang;
  update public.push_subs set lang = v_lang, updated_at = now() where athlete_id = v_id and lang <> v_lang;
  return v_lang;
end $function$;

revoke all on function public.set_my_lang(text) from public, anon;
grant execute on function public.set_my_lang(text) to authenticated;
