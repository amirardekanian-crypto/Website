-- Takes Career Mode phase 1 (supabase/stage66_career_mode.sql) off the live project, if it ever has to come off. Written and tested
-- 2026-10-17, before stage66 was applied: on PGlite, the schema snapshot + stage66 + this file left no career object and a
-- coach_erase_person() byte-identical to the one before stage66.
--
-- Run it as one statement through the Supabase tool (execute_sql), only on Amir's word. It leaves every other table and function as
-- it was: stage66 only ADDED the three career_* tables, the career_* functions, get_profile() and four triggers, and changed one string
-- in coach_erase_person() (its table list gained 'career_facts'), which this puts back exactly. The facts go with the tables; take a
-- backup first (coach.html → ⚙ Tools → ⤓ Backup) if they may be wanted again.
begin;

drop trigger if exists career_progress_trg on public.athlete_progress;
drop trigger if exists career_session_trg on public.session_history;
drop trigger if exists career_library_trg on public.library_sessions;
drop trigger if exists career_programme_trg on public.programs;

-- coach_erase_person() first, while career_facts still exists: the exact reverse of stage66's patch
do $rb_erase$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_new constant text := '''athlete_identities'', ''athlete_status'', ''career_facts'']';
  s_old constant text := '''athlete_identities'', ''athlete_status'']';
begin
  if position(s_new in d) > 0 then
    execute replace(d, s_new, s_old);
  end if;
end $rb_erase$;

do $rb_functions$
declare f text;
begin
  for f in
    select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and (p.proname like 'career\_%' escape '\' or p.proname = 'get_profile')
  loop
    execute 'drop function if exists ' || f || ' cascade';
  end loop;
end $rb_functions$;

drop table if exists public.career_facts, public.career_rules, public.career_catalogue;

commit;
-- Then, in one commit: regenerate supabase/schema_snapshot.sql (scripts/restore/README.md → Keeping the snapshot current), take the three
-- career_* tables out of BACKUP_TABLES and TABLE_KEYS in coach.html and out of scripts/restore/seed_made_up.sql, the table counts back
-- to 42 (scripts/test_restore_backup.py, scripts/restore/rehearse.mjs and its README), and say so in career/CAREER_MODE.md → Build order.
