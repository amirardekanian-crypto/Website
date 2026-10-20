-- rollback_stage88.sql — stops a notification following the athlete's language (2026-10-20)
--
-- ⚠️ ON AMIR'S WORD ONLY. After this, every phone keeps whichever language it was subscribed with and
-- a correction in the programme never reaches it. The apps still pass the language at the athlete's
-- tap, so a NEW phone is still right; it is the phones already subscribed, and any later change, that
-- stop being followed.
--
-- No ordering trap: this stage makes no table and does not touch coach_erase_person(), so it can be
-- run before or after any of the others.
--
-- It keeps nothing, and nothing is lost by that: push_subs.lang keeps its current values, and
-- `athlete.lang` stays on the programmes, where the apps read it.
--
-- Safe to re-run.

do $rollback88_cron$
begin
  if to_regclass('cron.job') is not null then
    perform cron.unschedule('push-lang') where exists (select 1 from cron.job where jobname = 'push-lang');
  end if;
exception when others then
  raise warning 'rollback88: the push-lang job was not unscheduled: %', sqlerrm;
end
$rollback88_cron$;

drop function if exists public.push_lang_sync();
drop function if exists public.push_lang_of(text);
