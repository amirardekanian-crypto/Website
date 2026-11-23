-- rollback_stage123.sql — takes the coach's doorbell (supabase/stage123_coach_doorbell.sql) back out.
--
-- Run it as one query. It removes the every-minute job, both triggers, the functions and the two tables, and puts submit_intake()
-- back as it was before (no retry id). Every session and application stays exactly where it is: the doorbell only ever read them.
-- The sender (supabase/functions/push-send) can stay deployed: without coach_push_take() its coach mode answers with an error and
-- nothing else calls it. Remove 'coach_push_subs' from BACKUP_TABLES in coach.html and 'coach_inbox' from SHORT_LIVED in
-- scripts/restore/restore_backup.py, and make the schema snapshot again.

do $rb$
begin
  if exists (select 1 from cron.job where jobname = 'coach-push') then perform cron.unschedule('coach-push'); end if;
end $rb$;

drop trigger if exists coach_inbox_session on public.session_history;
drop trigger if exists coach_inbox_intake on public.hab_intake;

drop function if exists public.coach_push_tick();
drop function if exists public.coach_push_test();
drop function if exists public.coach_push_unsubscribe(text);
drop function if exists public.coach_push_subscribe(text, text, text, text);
drop function if exists public.coach_push_mark(text, text);
drop function if exists public.coach_push_done(bigint, boolean);
drop function if exists public.coach_push_targets();
drop function if exists public.coach_push_take();
drop function if exists public.coach_push_words(text, text);
drop function if exists public.coach_inbox_intake_trg();
drop function if exists public.coach_inbox_session_trg();
drop function if exists public.coach_inbox_add(text, text);
drop function if exists public.coach_push_fire();

drop table if exists public.coach_inbox;
drop table if exists public.coach_push_subs;

create or replace function public.submit_intake(p_payload jsonb, p_lang text default 'en'::text, p_name text default null::text,
  p_email text default null::text, p_contact text default null::text, p_programme text default null::text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid;
begin
  if p_payload is null or jsonb_typeof(p_payload) is distinct from 'object'
     or p_payload = '{}'::jsonb then
    raise exception 'intake payload must be a non-empty object';
  end if;
  if char_length(p_payload::text) > 60000 then
    raise exception 'intake payload too large';
  end if;

  insert into public.hab_intake (lang, name, email, contact, programme, payload)
  values (
    coalesce(nullif(lower(btrim(p_lang)), ''), 'en'),
    nullif(left(btrim(coalesce(p_name, '')),     200), ''),
    nullif(left(btrim(coalesce(p_email, '')),    200), ''),
    nullif(left(btrim(coalesce(p_contact, '')),  200), ''),
    nullif(left(btrim(coalesce(p_programme, '')),200), ''),
    p_payload)
  returning id into v_id;

  return v_id;
end; $function$;
