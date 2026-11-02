-- stage107 — the rest on a phone: "10 seconds left" when the athlete has left the app (2026-11-02)
--
-- Amir, 2026-11-02: "add a notification 10sec before the rest finishes if they had minimised the app and was on instagram for
-- example". His pick: any rest, but only when the athlete is out of the app (another app, or the phone locked), never while they
-- are looking at it.
--
-- WHY THE SERVER. A web app's clock stops when the athlete opens Instagram: the page is frozen, so it cannot raise a notification
-- itself, and no browser lets a page schedule one for later. The only thing that reaches a phone whose app is asleep is a push, the
-- same road the reminders, the crew and the cycle already use (stage84, stage86, stage87).
--
-- HOW, in three moves, and nothing kept that outlives the rest:
--   1. The page goes hidden while a rest runs (program.html, restPushArm()): ONE request to push-send?only=rest with the
--      athlete's own sign-in and this phone's subscription, saying when the rest ends. push-send calls push_rest_arm() AS THE
--      ATHLETE, which writes the time onto THIS phone's own push_subs row with a fresh token. Only the owner of a row can arm it.
--   2. Whoever is closest sends it: push-send itself when the alert is due within 70 seconds (it waits in the background,
--      EdgeRuntime.waitUntil, far inside the 150 s wall clock), and for a longer rest the job below, which runs every minute and
--      wakes the sender ONLY when a phone is due within 70 s (push_rest_fire()). Every alert is inside some run's window, because
--      the window is longer than the gap between runs.
--   3. push_rest_take() is the one door to sending: it clears the row and hands back the keys in one statement, and only while the
--      token still matches. So two senders that both saw the same rest send it once, and a rest the athlete came back to
--      (push_rest_disarm(), from the page becoming visible) sends nothing.
--
-- NO NEW TABLE. The two columns sit on push_subs, which is already in BACKUP_TABLES, the snapshot and coach_erase_person()'s list,
-- because a pending alert IS a fact about one phone's subscription and lives seconds to minutes. A restored backup brings back at
-- most an alert from the past, which push_rest_take() refuses (more than 30 s late is not sent).
--
-- WHAT IT SAYS. "10 seconds left" / "Get set for your next set." No exercise, no weight, no number of the athlete's: the lock-screen
-- rule (docs/rules/push.md). The Farsi is a DRAFT until Amir reads it on a lock screen, as every Farsi notification word was.
-- TTL 30 s and Urgency high: an alert that arrives after the rest is noise, so the push service drops it rather than deliver late.
-- The tag is 'rest', so a second alert replaces the first. No quiet hours: the athlete is training at that moment, by their own tap.
-- A kind switched off (kinds->>'rest' = 'false') is never armed; there is no switch for it in the panel yet, and a kind nobody
-- switched is ON (stage84's rule).
--
-- ⚠️ THE NUMBER. Applied 2026-11-02 as the migration `stage106_rest_push`, because another session had already applied
-- `stage106_spare_session` (Career Mode, 2026-10-26) to the live project without its file reaching main. The file is stage107 so
-- the two never share a name in the repo; the migration list keeps the name it was applied under.
--
-- Guard: scripts/push/rehearse_rest_push.mjs (PGlite). The way back: scripts/push/rollback_stage107.sql, on Amir's word only.

alter table public.push_subs add column if not exists rest_at    timestamptz;   -- when THIS phone's rest alert is due (10 s before the end)
alter table public.push_subs add column if not exists rest_token uuid;          -- the arming's own token: a later arm or a disarm makes an older sender's take a no-op

-- 1. The athlete's phone arms its own row. p_end is when the rest ENDS (the phone's timerEndsAt); the alert is 10 s before it.
-- A rest that ends in 12 s or less, or more than 30 minutes away, arms nothing (and clears what was there): too late to be useful,
-- or not a rest. Returns the alert's time and the token, or null when nothing was armed.
create or replace function public.push_rest_arm(p_endpoint text, p_end timestamptz)
returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_id text := public.current_athlete_id(); v_at timestamptz; v_tok uuid := gen_random_uuid(); n int;
begin
  if v_id is null or p_endpoint is null then return null; end if;
  v_at := p_end - interval '10 seconds';
  if p_end is null or p_end <= now() + interval '12 seconds' or p_end > now() + interval '30 minutes' then
    update public.push_subs set rest_at = null, rest_token = null where endpoint = p_endpoint and athlete_id = v_id;
    return null;
  end if;
  update public.push_subs
     set rest_at = v_at, rest_token = v_tok
   where endpoint = p_endpoint and athlete_id = v_id
     and coalesce(kinds ->> 'rest', 'true') <> 'false'
     and fails < 5;
  get diagnostics n = row_count;
  if n = 0 then return null; end if;
  return jsonb_build_object('at', v_at, 'token', v_tok);
end $function$;

-- 2. The athlete is back in the app: nothing is owed.
create or replace function public.push_rest_disarm(p_endpoint text)
returns void
language plpgsql security definer set search_path to 'public' as $function$
declare v_id text := public.current_athlete_id();
begin
  if v_id is null or p_endpoint is null then return; end if;
  update public.push_subs set rest_at = null, rest_token = null
   where endpoint = p_endpoint and athlete_id = v_id and rest_at is not null;
end $function$;

-- 3. What is due within p_within seconds (the sender's background wait), with the token each was armed with. The service role only.
create or replace function public.push_rest_due(p_within integer default 70)
returns table (endpoint text, rest_at timestamptz, rest_token uuid)
language sql stable security definer set search_path to 'public' as $function$
  select s.endpoint, s.rest_at, s.rest_token
    from public.push_subs s
   where s.rest_at is not null
     and s.rest_at <= now() + make_interval(secs => least(greatest(coalesce(p_within, 70), 0), 120))
     and s.rest_at > now() - interval '30 seconds'
   order by s.rest_at
   limit 200;
$function$;

-- 4. The one door to sending: clear the row and hand back what the push needs, in one statement, only while the token matches and
-- the alert is not more than 30 s late. A second caller with the same token gets nothing.
create or replace function public.push_rest_take(p_endpoint text, p_token uuid)
returns table (endpoint text, p256dh text, auth text, athlete_id text, lang text, title text, body text)
language plpgsql security definer set search_path to 'public' as $function$
begin
  return query
  update public.push_subs s
     set rest_at = null, rest_token = null, last_sent_at = now()
   where s.endpoint = p_endpoint and s.rest_token = p_token and p_token is not null
     and s.rest_at is not null and s.rest_at > now() - interval '30 seconds'
  returning s.endpoint, s.p256dh, s.auth, s.athlete_id, s.lang,
            case when s.lang = 'fa' then '۱۰ ثانیه تا آخر استراحت' else '10 seconds left' end,
            case when s.lang = 'fa' then 'برای ست بعدی آماده شو.' else 'Get set for your next set.' end;
end $function$;

-- 5. The every-minute job: wakes push-send?only=rest only when a phone is due within 70 s, so the sender is not started 1,440 times
-- a day for nothing. The same shape as stage86's crew_push_fire(), reading the same push_config.
create or replace function public.push_rest_fire() returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare c record; req bigint;
begin
  if not exists (select 1 from public.push_subs
                  where rest_at is not null and rest_at <= now() + interval '70 seconds' and rest_at > now() - interval '30 seconds') then
    return jsonb_build_object('ok', true, 'due', 0);
  end if;
  select * into c from public.push_config where id;
  if c.url is null or c.secret is null then
    return jsonb_build_object('ok', false, 'why', 'push_config is not filled in yet');
  end if;
  if to_regproc('net.http_post') is null then
    return jsonb_build_object('ok', false, 'why', 'pg_net is not installed');
  end if;
  execute format('select %s($1, $2::jsonb, ''{}''::jsonb, $3::jsonb, 20000)', 'net.http_post')
    into req
    using c.url || case when position('?' in c.url) > 0 then '&' else '?' end || 'only=rest',
          '{}'::jsonb,
          jsonb_build_object('Content-Type', 'application/json', 'x-push-key', c.secret);
  return jsonb_build_object('ok', true, 'request', req);
exception when others then
  raise warning 'push_rest_fire: %', sqlerrm;   -- a sender that is down must never take the job with it
  return jsonb_build_object('ok', false, 'why', sqlerrm);
end $function$;

do $stage107_grants$
begin
  revoke all on function public.push_rest_arm(text, timestamptz) from public, anon;
  revoke all on function public.push_rest_disarm(text) from public, anon;
  grant execute on function public.push_rest_arm(text, timestamptz) to authenticated, service_role;
  grant execute on function public.push_rest_disarm(text) to authenticated, service_role;
  revoke all on function public.push_rest_due(integer) from public, anon, authenticated;
  revoke all on function public.push_rest_take(text, uuid) from public, anon, authenticated;
  revoke all on function public.push_rest_fire() from public, anon, authenticated;
  grant execute on function public.push_rest_due(integer) to service_role;
  grant execute on function public.push_rest_take(text, uuid) to service_role;
  grant execute on function public.push_rest_fire() to service_role;
end
$stage107_grants$;

-- Every minute. Its run log is cron.job_run_details, which push-rest-sweep keeps short: a job a minute writes 1,440 rows a day.
do $stage107_cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('push-rest', 'push-rest-sweep');
    perform cron.schedule('push-rest', '* * * * *', 'select public.push_rest_fire()');
    perform cron.schedule('push-rest-sweep', '41 4 * * *',
      $$delete from cron.job_run_details where jobid in (select jobid from cron.job where jobname = 'push-rest') and end_time < now() - interval '2 days'$$);
  end if;
end
$stage107_cron$;
