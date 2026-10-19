-- The way back from stage81 (Crew and the Bell). On Amir's word only (CLAUDE.md: a change to the live project waits for his yes), after a backup
-- (coach.html → ⚙ Tools → ⤓ Backup), which holds crew_consent (the four short-lived tables are not in a backup, on purpose).
--
-- Nothing in the scorer depends on stage81 (it moved no XP, no level, no fact, no award; its one trigger only writes crew_rings), so the way back
-- is short:
--   1. copies crew_consent to backup.crew_consent_<yyyymmdd> (each athlete's answer, their switches and Amir's under-13 ticks are kept);
--   2. stops the hourly sweep (pg_cron), drops the level trigger;
--   3. takes the five tables and the kudos statement out of coach_erase_person() (as stage80 left it);
--   4. drops stage81's functions and its five tables (the posts, photos, kudos and rings go: they were never meant to last more than a week).
-- program.html then finds no get_bell(): the Crew tab hides itself; coach.html's Bell panel says the Bell is not on the server.
-- Afterwards: take crew_consent out of coach.html's BACKUP_TABLES, the four from restore_backup.py's SHORT_LIVED, and remake
-- supabase/schema_snapshot.sql (scripts/restore/README.md), in one commit. The backup copy holds athletes' answers: drop it within the privacy
-- notice's three months, as every other backup copy. Safe to run twice.

begin;

create schema if not exists backup;
do $rb81_copy$
declare v_day text := to_char(current_date, 'YYYYMMDD');
begin
  if to_regclass('public.crew_consent') is not null then
    execute format('drop table if exists backup.%I', 'crew_consent_' || v_day);
    execute format('create table backup.%I as select * from public.crew_consent', 'crew_consent_' || v_day);
  end if;
end $rb81_copy$;

do $rb81_cron$
begin
  if to_regclass('cron.job') is not null then
    execute $q$select cron.unschedule(jobid) from cron.job where jobname = 'crew-sweep'$q$;
  end if;
end $rb81_cron$;

drop trigger if exists crew_level_ring on public.career_scores;

do $rb81_erase$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_new constant text := '''career_notes'', ''crew_kudos'', ''crew_photos'', ''crew_posts'', ''crew_rings'', ''crew_consent'']';
  s_old constant text := '''career_notes'']';
  -- Exactly what stage81 inserted, built from chr(10) the same way, so neither can drift with the line endings of the file it is run from.
  a_new constant text := concat_ws(chr(10),
    '      -- stage81: the kudos others gave to this person''s Bell lines (crew_kudos.to_athlete; the loop above deleted the ones they gave).',
    '      delete from public.crew_kudos where to_athlete = v_key;',
    '      get diagnostics v_n = row_count;',
    '      v_counts := v_counts || jsonb_build_object(''crew_kudos (to them)'', v_n);',
    '      v_total := v_total + v_n;',
    '', '');
begin
  if position(s_new in d) > 0 or position(a_new in d) > 0 then
    execute replace(replace(d, s_new, s_old), a_new, '');
  end if;
end $rb81_erase$;

drop function if exists public.get_bell(text);
drop function if exists public.crew_photo(uuid);
drop function if exists public.crew_answer(text, text);
drop function if exists public.crew_kinds(jsonb);
drop function if exists public.crew_post(text, text, integer, integer, text, jsonb);
drop function if exists public.crew_delete_post(uuid);
drop function if exists public.crew_kudos(text, boolean);
drop function if exists public.coach_crew();
drop function if exists public.coach_crew_post(text, text, integer, integer);
drop function if exists public.coach_crew_remove(uuid);
drop function if exists public.coach_crew_under13(text, boolean);
drop function if exists public.crew_level_ring();
drop function if exists public.crew_write_post(text, text, text, integer, integer, text, jsonb, boolean);
drop function if exists public.crew_who();
drop function if exists public.crew_me(text);
drop function if exists public.crew_kudos_of(uuid, text, date, text);
drop function if exists public.crew_sweep();
drop function if exists public.crew_members();
drop function if exists public.crew_default_name(text);
drop function if exists public.crew_clean(text);
drop function if exists public.crew_kind_list();

drop table if exists public.crew_kudos;
drop table if exists public.crew_photos;
drop table if exists public.crew_posts;
drop table if exists public.crew_rings;
drop table if exists public.crew_consent;

commit;
