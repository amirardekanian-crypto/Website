-- The way back from stage97 (Bring a Partner: a member's own code, 10% off for the friend and 10% for the member).
-- On Amir's word only (CLAUDE.md: a change to the live project waits for his yes), after a backup (coach.html -> Tools -> Backup).
--
-- WHAT IT KEEPS. The credits are a ledger Amir wrote by hand and exist nowhere else, so before anything is dropped they are copied to
-- backup.referral_credits_<yyyymmdd>, and the athlete-kind affiliates rows to backup.affiliates_athlete_<yyyymmdd>. Drop those copies within the
-- privacy notice's three months, like every other backup copy.
-- WHAT STAYS. The athlete-kind rows stay in affiliates as ordinary partner rows (their code, 10%, athlete_id): a friend who was given the code keeps
-- their 10% off, because check_discount() reads affiliates.percent and nothing else. Amir's Affiliates tab will show them as partner codes: delete
-- them there if they should go.
--
-- What it does, in this order (each step safe to run twice):
--   1. copies the credits and the athlete-kind codes to the backup schema;
--   2. takes referral_credits out of coach_erase_person() (the same single-line anchors and chr(10) as the stage);
--   3. drops the functions, then the ledger, the unique index and the two columns.
-- Afterwards: take referral_credits out of coach.html's BACKUP_TABLES and remake supabase/schema_snapshot.sql (scripts/restore/README.md), in one commit.
-- crew_page() (stage96) keeps working: it only carries `referral` while crew_referral() exists.

begin;

create schema if not exists backup;
do $rb97_copy$
declare v_day text := to_char(current_date, 'YYYYMMDD');
begin
  if to_regclass('public.referral_credits') is not null then
    execute format('drop table if exists backup.%I', 'referral_credits_' || v_day);
    execute format('create table backup.%I as select * from public.referral_credits', 'referral_credits_' || v_day);
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'affiliates' and column_name = 'kind') then
    execute format('drop table if exists backup.%I', 'affiliates_athlete_' || v_day);
    execute format('create table backup.%I as select * from public.affiliates where kind = %L', 'affiliates_athlete_' || v_day, 'athlete');
  end if;
end $rb97_copy$;

do $rb97_erase$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_new constant text := '''push_cycle_seen'', ''referral_credits'']';
  s_old constant text := '''push_cycle_seen'']';
  -- Exactly what stage97 inserted (without the comment line it was put before), built from chr(10) the same way.
  a_new constant text := concat_ws(chr(10),
    '      -- stage97: a friend whose application is erased below leaves no name on the member''s credit (the credit stays the member''s own until THEY are erased).',
    '      update public.referral_credits set friend_name = null, intake_id = null where intake_id = any (v_ids);',
    '', '');
begin
  if position(s_new in d) > 0 or position(a_new in d) > 0 then
    execute replace(replace(d, s_new, s_old), a_new, '');
  end if;
end $rb97_erase$;

drop function if exists public.my_partner_code(boolean);
drop function if exists public.coach_partner_code_make(text);
drop function if exists public.coach_partner_credit_add(text, uuid, text);
drop function if exists public.coach_partner_credit_used(uuid, boolean);
drop function if exists public.coach_partner_codes();
drop function if exists public.crew_referral(text);
drop function if exists public.partner_code_make(text);

drop table if exists public.referral_credits;
drop index if exists public.affiliates_one_athlete_code;
alter table public.affiliates drop column if exists kind;
alter table public.affiliates drop column if exists reward_percent;

commit;
