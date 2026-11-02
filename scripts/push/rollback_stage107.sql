-- The way back from stage107 (the rest alert), on Amir's word only. Takes off the two jobs, the five functions and the two columns.
-- Nothing else depends on them: the reminders, the crew and the cycle senders never read rest_at. push-send's ?only=rest arm then
-- finds no function and answers an error; the app's request fails quietly and the rest timer works as before.
do $rb107$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('push-rest', 'push-rest-sweep');
  end if;
end
$rb107$;
drop function if exists public.push_rest_fire();
drop function if exists public.push_rest_take(text, uuid);
drop function if exists public.push_rest_due(integer);
drop function if exists public.push_rest_disarm(text);
drop function if exists public.push_rest_arm(text, timestamptz);
alter table public.push_subs drop column if exists rest_token;
alter table public.push_subs drop column if exists rest_at;
