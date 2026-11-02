-- The way back from stage108 (the "still open" reminder), on Amir's word only. Puts stage107's push_rest_disarm() and
-- push_rest_fire() back as stage107 wrote them, then drops the three new functions and the two columns.
create or replace function public.push_rest_disarm(p_endpoint text)
returns void
language plpgsql security definer set search_path to 'public' as $function$
declare v_id text := public.current_athlete_id();
begin
  if v_id is null or p_endpoint is null then return; end if;
  update public.push_subs set rest_at = null, rest_token = null
   where endpoint = p_endpoint and athlete_id = v_id and rest_at is not null;
end $function$;

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
  raise warning 'push_rest_fire: %', sqlerrm;
  return jsonb_build_object('ok', false, 'why', sqlerrm);
end $function$;

drop function if exists public.push_alert_take(text, text, uuid);
drop function if exists public.push_alert_due(integer);
drop function if exists public.push_finish_arm(text, timestamptz);
alter table public.push_subs drop column if exists finish_token;
alter table public.push_subs drop column if exists finish_at;
