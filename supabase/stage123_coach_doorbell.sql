-- stage123_coach_doorbell.sql — coach.html rings for every new workout and application (2026-11-23)
--
-- Amir: "this kind of reporting system, is using emails, which i dont like anymore ... instead of receving email, i should receive
-- a notification from my coach.html as i have it like an app installed", and, of the three ways: "A: instant".
--
-- What it does:
--   1. A finished session (public.session_history, a new row) and an application (public.hab_intake, a new row) each put ONE line in
--      public.coach_inbox, from a trigger AFTER the row is in. The line holds only what it points at (kind + ref), never the words.
--   2. The same trigger asks the sender at once (coach_push_fire(): pg_net to push-send?only=coach, the shared secret of stage84), so the
--      notification lands within seconds. pg_net only queues the call, and every step is inside an exception block: a ring can never
--      stop a session or an application from being saved.
--   3. A job every minute (coach-push) asks again while a line is still owed, so a call that was lost is sent on the next minute.
--   4. The words are worked out when it is SENT (coach_push_words()), from the row itself: a row erased in between sends nothing.
--   5. The coach's phones and computers are public.coach_push_subs, written only by coach_push_subscribe() (is_coach()).
--
-- The record is the rows themselves: a session in the athlete's file, an application under Leads. The notification is only the bell,
-- so one missed or swiped away loses nothing.
--
-- coach_inbox is SHORT-LIVED: a line is deleted after 7 days (the every-minute job), it is never in a backup (restore_backup.py
-- SHORT_LIVED) and it holds only an athlete id or an application id. coach_push_subs is in BACKUP_TABLES (the coach can read it).
-- Rollback: scripts/rollback_stage123.sql. Safe to re-run.

do $stage123_guard$
begin
  if to_regclass('public.push_config') is null or to_regclass('public.session_history') is null
     or to_regclass('public.hab_intake') is null or to_regprocedure('public.is_coach()') is null then
    raise exception 'stage123: push_config (stage84), session_history, hab_intake or is_coach() is missing. Nothing was changed.';
  end if;
end $stage123_guard$;

-- ── the coach's devices ──────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.coach_push_subs (
  endpoint   text primary key check (endpoint like 'https://%') check (char_length(endpoint) between 20 and 1000),
  p256dh     text not null check (char_length(p256dh) between 20 and 200),
  auth       text not null check (char_length(auth) between 10 and 100),
  device     text check (char_length(device) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_ok_at timestamptz,
  fails      integer not null default 0
);
alter table public.coach_push_subs enable row level security;
revoke all on public.coach_push_subs from anon, authenticated;
grant select on public.coach_push_subs to authenticated;   -- the backup reads it; the policy lets only the coach see a row
drop policy if exists coach_push_subs_coach_read on public.coach_push_subs;
create policy coach_push_subs_coach_read on public.coach_push_subs for select to authenticated using (public.is_coach());

-- ── what is owed a ring ──────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.coach_inbox (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('session', 'intake', 'test')),
  ref        text not null check (char_length(ref) between 1 and 300),
  created_at timestamptz not null default now(),
  taken_at   timestamptz,          -- a sender has it (coach_push_take()); another may take it again 2 minutes later
  pushed_at  timestamptz,          -- at least one device took it, or there was nothing to say
  tries      integer not null default 0,
  athlete_id text,                 -- a session's athlete, so coach_erase_person() clears the line with the person
  unique (kind, ref)
);
alter table public.coach_inbox enable row level security;
revoke all on public.coach_inbox from anon, authenticated;

-- ── asking the sender ────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.coach_push_fire()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare c record; req bigint; u text;
begin
  select * into c from public.push_config where id;
  if c.url is null or c.secret is null then
    return jsonb_build_object('ok', false, 'why', 'push_config is not filled in yet');
  end if;
  if to_regproc('net.http_post') is null then
    return jsonb_build_object('ok', false, 'why', 'pg_net is not installed');
  end if;
  u := c.url || case when position('?' in c.url) > 0 then '&' else '?' end || 'only=coach';
  execute format('select %s($1, $2::jsonb, ''{}''::jsonb, $3::jsonb, 20000)', 'net.http_post')
    into req
    using u, '{}'::jsonb, jsonb_build_object('Content-Type', 'application/json', 'x-push-key', c.secret);
  return jsonb_build_object('ok', true, 'request', req);
exception when others then
  raise warning 'coach_push_fire: %', sqlerrm;
  return jsonb_build_object('ok', false, 'why', sqlerrm);
end $function$;

-- One line per thing, then the sender is asked. Never raises: the row that called it is saved whatever happens here.
create or replace function public.coach_inbox_add(p_kind text, p_ref text, p_athlete_id text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_new boolean := false;
begin
  insert into public.coach_inbox (kind, ref, athlete_id) values (p_kind, p_ref, p_athlete_id) on conflict (kind, ref) do nothing;
  v_new := found;
  if v_new and exists (select 1 from public.coach_push_subs) then perform public.coach_push_fire(); end if;
exception when others then
  raise warning 'coach_inbox_add: %', sqlerrm;
end $function$;

create or replace function public.coach_inbox_session_trg()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- A session filed in the last two days. An old one put back by hand (an import from the emails, a restore) rings nobody.
  if new.athlete_id is distinct from 'demo' and new.completed_on >= current_date - 2 then
    perform public.coach_inbox_add('session', new.athlete_id || '|' || new.day || '|' || new.completed_on, new.athlete_id);
  end if;
  return null;
exception when others then
  raise warning 'coach_inbox_session_trg: %', sqlerrm;
  return null;
end $function$;

create or replace function public.coach_inbox_intake_trg()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.coach_inbox_add('intake', new.id::text);
  return null;
exception when others then
  raise warning 'coach_inbox_intake_trg: %', sqlerrm;
  return null;
end $function$;

drop trigger if exists coach_inbox_session on public.session_history;
create trigger coach_inbox_session after insert on public.session_history
  for each row execute function public.coach_inbox_session_trg();
drop trigger if exists coach_inbox_intake on public.hab_intake;
create trigger coach_inbox_intake after insert on public.hab_intake
  for each row execute function public.coach_inbox_intake_trg();

-- ── the words, worked out when it is sent ────────────────────────────────────────────────────────────────────────────────────
-- A null title means there is nothing to say any more (the row is gone): the sender marks the line done and sends nothing.
create or replace function public.coach_push_words(p_kind text, p_ref text, out title text, out body text, out url text)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  s public.session_history; i public.hab_intake; v_name text; v_parts text[]; v_prog text;
begin
  if p_kind = 'test' then
    title := 'Notifications are on';
    body  := 'This is how a new workout or application will reach you.';
    url   := '/coach.html';
    return;
  end if;
  if p_kind = 'session' then
    v_parts := string_to_array(p_ref, '|');
    if array_length(v_parts, 1) <> 3 then return; end if;
    select * into s from public.session_history
     where athlete_id = v_parts[1] and day = v_parts[2]::int and completed_on = v_parts[3]::date;
    if not found then return; end if;
    select nullif(btrim(concat_ws(' ', p.data->'athlete'->>'firstName', p.data->'athlete'->>'lastName')), '')
      into v_name from public.programs p where p.athlete_id = s.athlete_id;
    v_name := coalesce(v_name, nullif(btrim(s.athlete_name), ''), s.athlete_id);
    title := v_name || case when coalesce(s.status, '') ilike 'complete%' then ' finished Day ' || s.day
                            else ' logged part of Day ' || s.day end;
    body := concat_ws(' · ',
      nullif(btrim(coalesce(s.focus, '')), ''),
      case when s.session_rpe is not null then 'RPE ' || s.session_rpe end,
      case when s.duration_min is not null and s.duration_min > 0 then s.duration_min || ' min' end);
    if nullif(btrim(coalesce(s.day_note, '')), '') is not null then
      body := concat_ws(E'\n', nullif(body, ''), '"' || left(btrim(s.day_note), 90) || case when char_length(btrim(s.day_note)) > 90 then '…' else '' end || '"');
    end if;
    url := '/coach.html#a/' || s.athlete_id;
    return;
  end if;
  if p_kind = 'intake' then
    begin
      select * into i from public.hab_intake where id = p_ref::uuid;
    exception when others then return;
    end;
    if not found then return; end if;
    v_name := coalesce(nullif(btrim(i.name), ''), nullif(btrim(i.email), ''), 'someone');
    v_prog := coalesce(i.programme, '');
    title := case when v_prog ilike 'AA Proof%' then 'New Proof signup: '
                  when v_prog ilike 'Partner%' then 'New partner application: '
                  else 'New application: ' end || v_name;
    body := concat_ws(' · ', nullif(v_prog, ''), case when i.lang = 'fa' then 'Farsi' else 'English' end, nullif(btrim(coalesce(i.contact, '')), ''));
    url := '/coach.html#leads';
    return;
  end if;
end $function$;

-- ── the sender's side (service role only) ────────────────────────────────────────────────────────────────────────────────────
-- Up to 20 lines still owed, each taken for 2 minutes so two senders at once never send the same one twice.
create or replace function public.coach_push_take()
returns table (id bigint, title text, body text, url text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return query
  with t as (
    update public.coach_inbox q set taken_at = now(), tries = q.tries + 1
     where q.id in (select x.id from public.coach_inbox x
                     where x.pushed_at is null and x.tries < 6 and x.created_at > now() - interval '1 day'
                       and (x.taken_at is null or x.taken_at < now() - interval '2 minutes')
                     order by x.id limit 20 for update skip locked)
    returning q.id, q.kind, q.ref)
  select t.id, w.title, w.body, w.url from t, lateral public.coach_push_words(t.kind, t.ref) w order by t.id;
end $function$;

create or replace function public.coach_push_targets()
returns table (endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path to 'public'
as $function$ select endpoint, p256dh, auth from public.coach_push_subs order by created_at $function$;

create or replace function public.coach_push_done(p_id bigint, p_ok boolean)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.coach_inbox set pushed_at = case when p_ok then now() else null end,
                                taken_at  = case when p_ok then taken_at else null end
   where id = p_id;
$function$;

-- A device that answered: ok (last_ok_at, fails back to 0), failed (fails + 1), or gone (deleted: uninstalled, or permission withdrawn).
create or replace function public.coach_push_mark(p_endpoint text, p_result text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_result = 'gone' then delete from public.coach_push_subs where endpoint = p_endpoint;
  elsif p_result = 'ok' then update public.coach_push_subs set last_ok_at = now(), fails = 0 where endpoint = p_endpoint;
  else update public.coach_push_subs set fails = fails + 1 where endpoint = p_endpoint;
  end if;
end $function$;

-- The every-minute job: ask the sender only while a line is owed and a device exists; drop lines older than 7 days.
create or replace function public.coach_push_tick()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_owed int;
begin
  delete from public.coach_inbox where created_at < now() - interval '7 days';
  select count(*) into v_owed from public.coach_inbox
   where pushed_at is null and tries < 6 and created_at > now() - interval '1 day'
     and (taken_at is null or taken_at < now() - interval '2 minutes');
  if v_owed = 0 or not exists (select 1 from public.coach_push_subs) then
    return jsonb_build_object('owed', v_owed, 'asked', false);
  end if;
  return jsonb_build_object('owed', v_owed, 'asked', true, 'fire', public.coach_push_fire());
end $function$;

-- ── coach.html's side (the coach only) ───────────────────────────────────────────────────────────────────────────────────────
create or replace function public.coach_push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_device text default null)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  insert into public.coach_push_subs (endpoint, p256dh, auth, device)
  values (p_endpoint, p_p256dh, p_auth, nullif(left(btrim(coalesce(p_device, '')), 80), ''))
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth,
    device = coalesce(excluded.device, coach_push_subs.device), updated_at = now(), fails = 0;
  -- What came in before the first device was on is in the dashboard already: it does not all ring at once now.
  update public.coach_inbox set pushed_at = now() where pushed_at is null and created_at < now();
  select count(*) into v_n from public.coach_push_subs;
  return v_n;
end $function$;

create or replace function public.coach_push_unsubscribe(p_endpoint text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  delete from public.coach_push_subs where endpoint = p_endpoint;
  select count(*) into v_n from public.coach_push_subs;
  return v_n;
end $function$;

-- A test ring to every device on now.
create or replace function public.coach_push_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if not exists (select 1 from public.coach_push_subs) then return jsonb_build_object('ok', false, 'why', 'no device is on'); end if;
  perform public.coach_inbox_add('test', to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SS.US'));
  return jsonb_build_object('ok', true);
end $function$;

-- ── who may call what ────────────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.coach_push_fire(), public.coach_inbox_add(text, text, text), public.coach_inbox_session_trg(),
  public.coach_inbox_intake_trg(), public.coach_push_words(text, text), public.coach_push_take(), public.coach_push_targets(),
  public.coach_push_done(bigint, boolean), public.coach_push_mark(text, text), public.coach_push_tick()
  from public, anon, authenticated;
grant execute on function public.coach_push_take(), public.coach_push_targets(), public.coach_push_done(bigint, boolean),
  public.coach_push_mark(text, text) to service_role;
revoke all on function public.coach_push_subscribe(text, text, text, text), public.coach_push_unsubscribe(text), public.coach_push_test()
  from public, anon;
grant execute on function public.coach_push_subscribe(text, text, text, text), public.coach_push_unsubscribe(text), public.coach_push_test()
  to authenticated;

-- ── an application sent twice is saved once ──────────────────────────────────────────────────────────────────────────────────
-- Every form now tries up to three times and keeps what it could not send on the phone (assets/js/intake-send.js), with a random id
-- in the payload (_cid). A try that reached the server but lost its answer comes back with the same id and gets the same row.
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
     or p_payload = '{}'::jsonb or p_payload - '_cid' = '{}'::jsonb then
    raise exception 'intake payload must be a non-empty object';
  end if;
  if char_length(p_payload::text) > 60000 then
    raise exception 'intake payload too large';
  end if;
  if nullif(btrim(coalesce(p_payload->>'_cid', '')), '') is not null then
    select h.id into v_id from public.hab_intake h
     where h.payload->>'_cid' = p_payload->>'_cid' and h.created_at > now() - interval '60 days' limit 1;
    if v_id is not null then return v_id; end if;
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

-- ── erased with the person ───────────────────────────────────────────────────────────────────────────────────────────────────
-- coach_erase_person() deletes from each table on its list by athlete_id; coach_inbox joins the list (an application's line has no
-- athlete: its application is erased by id, and the line then has nothing to say and goes in 7 days).
do $stage123_erase$
declare d text;
begin
  d := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  if position('''coach_inbox''' in d) = 0 then
    if position('''crew_questions''];' in d) = 0 then raise exception 'stage123: the end of coach_erase_person()''s list was not found. Nothing was changed.'; end if;
    execute replace(d, '''crew_questions''];', '''crew_questions'', ''coach_inbox''];');
  end if;
end $stage123_erase$;

-- ── the every-minute job ─────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage123_cron$
begin
  if exists (select 1 from cron.job where jobname = 'coach-push') then perform cron.unschedule('coach-push'); end if;
  perform cron.schedule('coach-push', '* * * * *', 'select public.coach_push_tick()');
end $stage123_cron$;
