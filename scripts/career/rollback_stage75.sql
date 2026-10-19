-- The way back from stage75 (Courtside, the monthly honours, the monthly goal and "From Amir"). On Amir's word only (CLAUDE.md: a change to the
-- live project waits for his yes), after a backup (coach.html → ⚙ Tools → ⤓ Backup), which holds the five tables.
--
-- Nothing in the scorer depends on stage75 (it moved no XP, no level, no fact, no award), so the way back is short:
--   1. copies the five tables to backup.<table>_<yyyymmdd> (what Amir marked, the frozen honours, the goals and his lines are kept);
--   2. takes the four tables with an athlete_id out of coach_erase_person()'s list (the list is put back as stage70 left it);
--   3. drops stage75's functions and its five tables.
-- coach.html then finds no get_courtside(): the Courtside panel says "Courtside is not on the server" and the goal line hides; nothing else changes.
-- Afterwards: take the five tables out of coach.html's BACKUP_TABLES and remake supabase/schema_snapshot.sql (scripts/restore/README.md), in one commit.
-- The backup copies hold athletes' data: drop them within the privacy notice's three months, as every other backup copy.
-- Safe to run twice.

begin;

create schema if not exists backup;
do $rb75_copy$
declare v_day text := to_char(current_date, 'YYYYMMDD'); t text;
begin
  foreach t in array array['courtside_marks', 'career_honour_months', 'career_honours', 'career_goals', 'career_notes'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop table if exists backup.%I', t || '_' || v_day);
      execute format('create table backup.%I as select * from public.%I', t || '_' || v_day, t);
    end if;
  end loop;
end $rb75_copy$;

do $rb75_erase$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_new constant text := '''career_recognition'', ''courtside_marks'', ''career_honours'', ''career_goals'', ''career_notes'']';
  s_old constant text := '''career_recognition'']';
begin
  if position(s_new in d) > 0 then execute replace(d, s_new, s_old); end if;
end $rb75_erase$;

drop function if exists public.get_courtside(timestamptz, timestamptz, text[]);
drop function if exists public.coach_courtside_mark(text, text[], text);
drop function if exists public.coach_honours_pick(date, text, text[]);
drop function if exists public.coach_honours_sent(date, text, text);
drop function if exists public.coach_honours_freeze(date, text[]);
drop function if exists public.coach_honours(date, text[]);
drop function if exists public.career_honours_live(date, text[]);
drop function if exists public.career_main_lift_names();
drop function if exists public.coach_set_goal(text, date, text);
drop function if exists public.coach_goal_done(text, date, boolean);
drop function if exists public.coach_from_amir(text, date, text, text);
drop function if exists public.career_is_client(text, text[]);

drop table if exists public.courtside_marks;
drop table if exists public.career_honours;
drop table if exists public.career_honour_months;
drop table if exists public.career_goals;
drop table if exists public.career_notes;

commit;
