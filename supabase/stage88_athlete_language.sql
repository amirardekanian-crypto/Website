-- stage88_athlete_language.sql — a notification goes out in the athlete's own language (2026-10-20)
--
-- Amir: *"Use the language from their intake form: put it on the programme and have the app pass it."*
--
-- WHY THIS EXISTS. Every one of the three word functions (push_lines, crew_push_words,
-- cycle_push_words) has had a Farsi half since the day it was written, and Amir read and chose every
-- Farsi line on 2026-10-20. None of it could reach anybody: all three call sites in the apps passed a
-- hardcoded `'en'` to AAPush.enable(), so `push_subs.lang` was 'en' for every phone ever subscribed and
-- the Farsi branch was dead code. Found by reading the live rows back rather than by a test, because no
-- test asserted anything about which language a real subscription ends up in.
--
-- WHAT DECIDES IT: `programs.data.athlete.lang`, 'fa' or 'en'. The programme is the one place that
-- knows an athlete, and it is already what the pipeline edits. Where it is absent, nothing here
-- touches the phone, and the phone keeps whatever the app sent it — which is English.
--
-- WHAT THIS ADDS, AND NOTHING ELSE
--   1. push_lang_of(athlete_id): the programme's answer, or null when it does not say.
--   2. push_lang_sync(): brings every subscription into line with its programme. One row per phone.
--   3. pg_cron runs it hourly at :03, a minute before push-send at :04.
-- No table, and NOT ONE of the three senders is touched. That is the point of doing it this way:
-- push_due(), crew_push_fold() and cycle_push_fold() all read push_subs.lang already, so making that
-- column true to the programme is enough, and stage84's, stage86's and stage87's functions stay
-- exactly as they were read back and rehearsed.
--
-- WHY A SYNC AND NOT ONLY THE APP. The app passes the language at the moment of the athlete's tap, and
-- that is the whole of it for a NEW phone. But a phone subscribes once: `push_subscribe()` is only ever
-- called from that tap, so a phone that subscribed yesterday in English would stay English for ever,
-- and an athlete whose language Amir corrects next week would never see the change. Three phones were
-- already in that state when this was written. The sync is what makes the programme the truth rather
-- than the first tap.
--
-- ⚠️ It never writes a language the column does not accept: push_subs.lang is checked ('en','fa'), so
-- anything else in a programme is ignored rather than raising inside an hourly job.
--
-- Rehearsed on PGlite: scripts/push/rehearse_lang.mjs.
-- The way back: scripts/push/rollback_stage88.sql, on Amir's word only. Safe to re-run this file.

-- ── 0. The guard ───────────────────────────────────────────────────────────────────────────────────
do $stage88_guard$
begin
  if to_regclass('public.push_subs') is null then
    raise exception 'stage88: the reminders are missing (stage84 first). Nothing was changed.';
  end if;
  if to_regclass('public.programs') is null then
    raise exception 'stage88: programs is missing. Nothing was changed.';
  end if;
end
$stage88_guard$;

-- ── 1. What the programme says ─────────────────────────────────────────────────────────────────────
-- Null when it does not say, which is the common case today and means "leave the phone alone".
create or replace function public.push_lang_of(p_athlete_id text) returns text
language sql stable set search_path to 'public' as $function$
  select case when p.data -> 'athlete' ->> 'lang' in ('en', 'fa') then p.data -> 'athlete' ->> 'lang' end
    from public.programs p where p.athlete_id = p_athlete_id
$function$;

-- ── 2. Bringing the phones into line ───────────────────────────────────────────────────────────────
-- Returns how many phones changed, so a hand-run says something useful.
create or replace function public.push_lang_sync() returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare n integer;
begin
  update public.push_subs s
     set lang = l.lang, updated_at = now()
    from (select s2.endpoint, public.push_lang_of(s2.athlete_id) as lang
            from public.push_subs s2) l
   where l.endpoint = s.endpoint
     and l.lang is not null
     and l.lang <> s.lang;
  get diagnostics n = row_count;
  return n;
end $function$;

-- ── 3. Grants: both are the service role's ─────────────────────────────────────────────────────────
do $stage88_grants$
declare f text;
begin
  foreach f in array array['public.push_lang_of(text)', 'public.push_lang_sync()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end
$stage88_grants$;

-- ── 4. Hourly, a minute before the sender ──────────────────────────────────────────────────────────
-- :03, so a language corrected in the pipeline is on the phone before the :04 run reads it.
do $stage88_cron$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('push-lang', '3 * * * *', 'select public.push_lang_sync()');
  end if;
end
$stage88_cron$;

-- ── 5. coach_erase_person() ────────────────────────────────────────────────────────────────────────
-- Nothing to add: this stage makes no table. The erase list is untouched, which is also why this
-- stage's way back has no ordering trap and can be run at any time.
