-- stage108 — "Your session is still open": a reminder 10 minutes after the last set when the athlete left the app without Done (2026-11-02)
--
-- Amir, 2026-11-02: "Some people forget to hit finish on the session, how do you think we can notify them?", then, on the plan:
-- "Lets remind them 10 min instead of 30 min". A session left open is filed by itself at the next open (fileUnfinished()), but with
-- no duration and no session RPE, so the day's load is lost to him. This reminder gets them to finish it while it is fresh; the
-- rescue on the next open (program.html, paintUnfinished()) catches the rest.
--
-- The same road as stage107's rest alert, a second kind on it: the page is hidden with a session open → the phone arms
-- push_subs.finish_at (10 minutes after its last set or tick, or a minute from now if that is past) with a token, as the athlete;
-- the every-minute job wakes push-send when anything is due; push_alert_take() is the one door to sending; the page becoming visible
-- disarms both kinds (push_rest_disarm() now clears both: it is "the athlete is back", whatever was owed). Coming back re-arms
-- nothing; leaving again arms a fresh one with a fresh token.
--
-- WHAT IT SAYS. "Your session is still open" / "Done training? Tap to finish it." The tap opens the day on its finish card
-- (sw.js: tag finish → /program.html#finish). No exercise, number or effort: the lock-screen rule. The Farsi was approved by Amir
-- on 2026-11-02. TTL one hour (still worth having late), Urgency normal, tag finish (a second one replaces the first). More than 15
-- minutes late it is not sent. kinds->>'finish' = 'false' is honoured; there is no switch in the panel for it yet.
--
-- NO NEW TABLE: two more columns on push_subs, which is backed up and erased already.
-- Guard: scripts/push/rehearse_finish_push.mjs (PGlite). The way back: scripts/push/rollback_stage108.sql, on Amir's word only
-- (it puts stage107's push_rest_disarm() and push_rest_fire() back as they were).

alter table public.push_subs add column if not exists finish_at    timestamptz;   -- when THIS phone's "still open" reminder is due
alter table public.push_subs add column if not exists finish_token uuid;

-- The athlete's phone arms its own row. p_at is when the reminder is due; it must be 30 s to 6 hours away.
create or replace function public.push_finish_arm(p_endpoint text, p_at timestamptz)
returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_id text := public.current_athlete_id(); v_tok uuid := gen_random_uuid(); n int;
begin
  if v_id is null or p_endpoint is null then return null; end if;
  if p_at is null or p_at < now() + interval '30 seconds' or p_at > now() + interval '6 hours' then
    update public.push_subs set finish_at = null, finish_token = null where endpoint = p_endpoint and athlete_id = v_id;
    return null;
  end if;
  update public.push_subs
     set finish_at = p_at, finish_token = v_tok
   where endpoint = p_endpoint and athlete_id = v_id
     and coalesce(kinds ->> 'finish', 'true') <> 'false'
     and fails < 5;
  get diagnostics n = row_count;
  if n = 0 then return null; end if;
  return jsonb_build_object('at', p_at, 'token', v_tok);
end $function$;

-- Back in the app: nothing of either kind is owed (stage107's function, now clearing both).
create or replace function public.push_rest_disarm(p_endpoint text)
returns void
language plpgsql security definer set search_path to 'public' as $function$
declare v_id text := public.current_athlete_id();
begin
  if v_id is null or p_endpoint is null then return; end if;
  update public.push_subs set rest_at = null, rest_token = null, finish_at = null, finish_token = null
   where endpoint = p_endpoint and athlete_id = v_id and (rest_at is not null or finish_at is not null);
end $function$;

-- Both kinds that are due within p_within seconds, with their tokens. The service role only.
create or replace function public.push_alert_due(p_within integer default 70)
returns table (endpoint text, kind text, due_at timestamptz, token uuid)
language sql stable security definer set search_path to 'public' as $function$
  with w as (select now() + make_interval(secs => least(greatest(coalesce(p_within, 70), 0), 120)) as till)
  select s.endpoint, 'rest', s.rest_at, s.rest_token from public.push_subs s, w
   where s.rest_at is not null and s.rest_at <= w.till and s.rest_at > now() - interval '30 seconds'
  union all
  select s.endpoint, 'finish', s.finish_at, s.finish_token from public.push_subs s, w
   where s.finish_at is not null and s.finish_at <= w.till and s.finish_at > now() - interval '15 minutes'
  order by 3
  limit 400;
$function$;

-- The one door to sending either kind: clears that kind on the row and hands back what the push needs, in one statement, only while
-- the token matches and it is not too late (rest 30 s, finish 15 min). A second caller gets nothing.
create or replace function public.push_alert_take(p_endpoint text, p_kind text, p_token uuid)
returns table (endpoint text, p256dh text, auth text, athlete_id text, lang text, title text, body text, tag text, ttl integer, urgency text)
language plpgsql security definer set search_path to 'public' as $function$
begin
  if p_token is null then return; end if;
  if p_kind = 'rest' then
    return query
    update public.push_subs s set rest_at = null, rest_token = null, last_sent_at = now()
     where s.endpoint = p_endpoint and s.rest_token = p_token and s.rest_at is not null and s.rest_at > now() - interval '30 seconds'
    returning s.endpoint, s.p256dh, s.auth, s.athlete_id, s.lang,
              case when s.lang = 'fa' then '۱۰ ثانیه تا آخر استراحت' else '10 seconds left' end,
              case when s.lang = 'fa' then 'برای ست بعدی آماده شو.' else 'Get set for your next set.' end,
              'rest'::text, 30, 'high'::text;
  elsif p_kind = 'finish' then
    return query
    update public.push_subs s set finish_at = null, finish_token = null, last_sent_at = now()
     where s.endpoint = p_endpoint and s.finish_token = p_token and s.finish_at is not null and s.finish_at > now() - interval '15 minutes'
    returning s.endpoint, s.p256dh, s.auth, s.athlete_id, s.lang,
              case when s.lang = 'fa' then 'جلسه‌ت هنوز بازه' else 'Your session is still open' end,
              case when s.lang = 'fa' then 'تمرینت تموم شد؟ بزن و تمومش کن.' else 'Done training? Tap to finish it.' end,
              'finish'::text, 3600, 'normal'::text;
  end if;
end $function$;

-- The every-minute job (stage107's) now wakes the sender for either kind.
create or replace function public.push_rest_fire() returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare c record; req bigint;
begin
  if not exists (select 1 from public.push_subs
                  where (rest_at is not null and rest_at <= now() + interval '70 seconds' and rest_at > now() - interval '30 seconds')
                     or (finish_at is not null and finish_at <= now() + interval '70 seconds' and finish_at > now() - interval '15 minutes')) then
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
  raise warning 'push_rest_fire: %', sqlerrm;
  return jsonb_build_object('ok', false, 'why', sqlerrm);
end $function$;

do $stage108_grants$
begin
  revoke all on function public.push_finish_arm(text, timestamptz) from public, anon;
  grant execute on function public.push_finish_arm(text, timestamptz) to authenticated, service_role;
  revoke all on function public.push_alert_due(integer) from public, anon, authenticated;
  revoke all on function public.push_alert_take(text, text, uuid) from public, anon, authenticated;
  grant execute on function public.push_alert_due(integer) to service_role;
  grant execute on function public.push_alert_take(text, text, uuid) to service_role;
end
$stage108_grants$;
