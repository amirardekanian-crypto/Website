-- rollback_stage84.sql — takes the two reminders back off (2026-10-19)
--
-- ⚠️ ON AMIR'S WORD ONLY. Running this stops every reminder and forgets which phones asked for one.
--
-- What it keeps: push_subs is copied to backup.push_subs_before first. Those rows are an athlete's
-- answer — which phone, which hour, which kinds — and re-asking would cost each of them the one
-- notification permission their browser gives (there is one per website and no second chance), so the
-- answers are kept even when the feature goes.
-- What it does not keep: push_sent, which is only a ledger of what went out today, and is rebuilt by
-- simply not sending twice on the day it comes back.
--
-- Safe to re-run. It puts coach_erase_person() back the way stage84 found it.

-- ── 1. Keep the answers ────────────────────────────────────────────────────────────────────────────
create schema if not exists backup;
do $rollback84_keep$
begin
  if to_regclass('public.push_subs') is not null then
    drop table if exists backup.push_subs_before;
    create table backup.push_subs_before as select *, now() as kept_at from public.push_subs;
    raise notice 'rollback84: % phone(s) kept in backup.push_subs_before', (select count(*) from backup.push_subs_before);
  end if;
end
$rollback84_keep$;

-- ── 2. The daily sweep's job ───────────────────────────────────────────────────────────────────────
do $rollback84_cron$
begin
  if to_regclass('cron.job') is not null then
    perform cron.unschedule('push-send') where exists (select 1 from cron.job where jobname = 'push-send');
    perform cron.unschedule('push-sweep') where exists (select 1 from cron.job where jobname = 'push-sweep');
  end if;
exception when others then
  raise warning 'rollback84: the push-sweep job was not unscheduled: %', sqlerrm;
end
$rollback84_cron$;

-- ── 3. coach_erase_person() back to what it was before stage84 ────────────────────────────────────
-- The reverse of the stage's patch, and written the same way (chr(10), never this file's own newlines)
-- so a CRLF apply with an LF way back cannot leave a delete of a dropped table behind.
do $rollback84_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_new constant text := '''crew_consent'', ''push_sent'', ''push_subs'']';
  s_old constant text := '''crew_consent'']';
  n integer;
begin
  n := (length(d) - length(replace(d, s_new, ''))) / greatest(length(s_new), 1);
  if n = 0 then
    return;   -- never patched, or already put back
  end if;
  execute replace(d, s_new, s_old);
end
$rollback84_patch$;

-- ── 4. The functions, then the tables ──────────────────────────────────────────────────────────────
drop function if exists public.push_due(timestamptz);
drop function if exists public.push_done(text, text, date, boolean);
drop function if exists public.push_drop(text);
drop function if exists public.push_sweep();
drop function if exists public.push_subscribe(text, text, text, text, integer, integer, text, text);
drop function if exists public.push_set(jsonb, integer, integer);
drop function if exists public.push_forget(text);
drop function if exists public.push_me();
drop function if exists public.push_lines(text, text);
drop function if exists public.push_local(timestamptz, integer);
drop function if exists public.push_on(jsonb, text);
drop function if exists public.push_kind_list();
drop function if exists public.push_fire();

drop table if exists public.push_config;   -- the URL and the sender's secret; nothing of an athlete's
drop table if exists public.push_sent;
drop table if exists public.push_subs;
