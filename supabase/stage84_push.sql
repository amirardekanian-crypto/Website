-- stage84_push.sql — the two reminders on an athlete's phone (2026-10-19)
--
-- Amir: "im just talking about notifications we can send on peoples phone, when they have installed
-- the app on their phone", then "this is supposed to be a reminder, about their habits / and another
-- reminder about their workout", then "start". His decisions, from the page he read:
--   · two days of quiet before the workout one speaks (settable 1 to 4, or off)
--   · 20:00 by default, the same clock AA Proof already uses for "streak at risk"
--   · a coached athlete gets the habit one too; when both are due on a day, ONLY the workout one goes
--   · the wording stays vague on purpose (C1): the server knows what has REACHED it, not what was
--     ticked with no signal, so "3 habits left" would be a lie on the day somebody trained on a train.
--
-- ⚠️ WHY THIS WAS WORTH BUILDING AT ALL. A web notification rides Google's Firebase on Android and
-- Apple's APNs on iPhone, and neither has a published measurement from inside Iran, where most of the
-- athletes are. Proved on Amir's own iPhone 2026-10-19 (app shut, it arrived), and he reports that his
-- athletes see Instagram's notifications through the filtering even though opening Instagram needs a
-- VPN. The training app is better placed than Instagram there: it opens from its saved plan before it
-- touches the network, so a tapped reminder opens a working app with no VPN and syncs later.
-- /pushtest/ is the page that answers this for a given phone.
--
-- WHAT THIS ADDS, AND NOTHING ELSE
--   1. Two tables.
--      push_subs  one row per PHONE (per browser, really: the endpoint is the address a push service
--                 gives that one installed app). Holds the subscription, which kinds are on, the hour
--                 and the athlete's offset from UTC, because NOTHING in this project stores a time
--                 zone — both apps run on the phone's own clock — so the phone has to tell us.
--                 Kept for good: in BACKUP_TABLES, the schema snapshot and coach_erase_person().
--      push_sent  one row per athlete per local day per kind, so a reminder cannot go twice and the
--                 workout one can take the habit one's place. Swept after 30 days.
--   2. The decision lives HERE, in push_due(), not in the sender: it is the part worth testing, and
--      the rehearsal can run it. The Edge Function that carries it is deliberately dumb.
--   3. The athlete's writes: push_subscribe(), push_set(), push_forget(). The read: push_me().
--   4. The service role's: push_due(), push_done(), push_drop(), push_sweep().
--   5. coach_erase_person() learns both tables.
--
-- WHAT IT DELIBERATELY DOES NOT DO YET. The Bell ("Amir posted to the crew", "3 from the crew cheered
-- you") and "cycle N is ready" are the two Amir added on top of the reminders. They are event-driven,
-- not hourly, so they want a small queue table rather than this file's clock, and they are the next
-- stage. push_subs.kinds already carries their switches so no migration is needed for them.
--
-- QUIET HOURS are a CHECK on the column, not a rule in a function: hour is 8 to 22 and there is no way
-- to write a row outside it, so nobody can be woken at three in the morning by a settings bug.
--
-- ⚠️ TTL. Firebase holds an undelivered message for four weeks by default, so a 20:00 reminder could
-- otherwise land at three in the morning a week later. Every row push_due() returns carries its own
-- ttl, two hours for a reminder, and the sender must pass it.
--
-- Rehearsed on PGlite: scripts/career/rehearse_push.mjs (the schema snapshot, made-up athletes, the
-- stage twice, every branch of push_due(), and the way back).
-- The way back: scripts/push/rollback_stage84.sql. Safe to re-run this file.

-- ── 0. The guard: what this one reads must be there ────────────────────────────────────────────────
do $stage84_guard$
begin
  if to_regclass('public.career_facts') is null then
    raise exception 'stage84: career_facts is missing (stage66 first). Nothing was changed.';
  end if;
  if to_regprocedure('public.current_athlete_id()') is null or to_regprocedure('public.is_coach()') is null then
    raise exception 'stage84: current_athlete_id() or is_coach() is missing. Nothing was changed.';
  end if;
  if to_regclass('public.programs') is null then
    raise exception 'stage84: programs is missing. Nothing was changed.';
  end if;
end
$stage84_guard$;

-- ── 1. Tables ──────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.push_subs (
  endpoint     text        primary key,                       -- the push service's address for this one installed app
  athlete_id   text        not null,
  p256dh       text        not null,                          -- the browser's public key, for the payload encryption
  auth         text        not null,                          -- 16 bytes of the browser's own secret
  app          text        not null default 'proof' check (app in ('proof', 'training')),
  kinds        jsonb       not null default '{}'::jsonb check (jsonb_typeof(kinds) = 'object'),  -- {"habits": false} turns one off; a kind not named is ON, as crew_consent does it
  hour         smallint    not null default 20 check (hour between 8 and 22),   -- their LOCAL hour. The check is the quiet hours: there is no way to store one outside them.
  quiet_days   smallint    not null default 2 check (quiet_days between 1 and 4),
  tz_offset    smallint    not null default 0 check (tz_offset between -840 and 840),  -- minutes east of UTC, from the phone. Iran is +210 and does not move; the UK does.
  lang         text        not null default 'en' check (lang in ('en', 'fa')),
  device       text        check (device is null or char_length(device) <= 120),  -- a short line for Amir to read when one stops working. No ids, no account.
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  last_sent_at timestamptz,
  last_ok_at   timestamptz,
  fails        smallint    not null default 0
);
create index if not exists push_subs_athlete_idx on public.push_subs (athlete_id);
create index if not exists push_subs_hour_idx on public.push_subs (hour);

-- One row per athlete per LOCAL day per kind. It is what stops a reminder going twice when the hourly
-- job runs across a clock change, and what lets the workout one take the habit one's place.
create table if not exists public.push_sent (
  athlete_id text        not null,
  day        date        not null,
  kind       text        not null,
  at         timestamptz not null default now(),
  primary key (athlete_id, day, kind)
);
create index if not exists push_sent_day_idx on public.push_sent (day);

-- ── 2. Policies and grants: nothing is readable or writable directly; the coach reads, so the backup is complete ──
do $stage84_policies$
declare t text;
begin
  foreach t in array array['push_subs', 'push_sent'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'coach reads ' || t) then
      execute format('create policy "coach reads %s" on public.%I for select to authenticated using ((select public.is_coach()))', t, t);
    end if;
    execute format('grant select on table public.%I to authenticated', t);
  end loop;
end
$stage84_policies$;

-- ── 3. Helpers ─────────────────────────────────────────────────────────────────────────────────────
-- The kinds, in the order the Reminders panel lists them. 'crew' and 'cycle' have no sender yet (the
-- next stage): their switches exist so an athlete's answer survives that stage with no migration.
create or replace function public.push_kind_list() returns text[]
language sql immutable set search_path to 'public' as $function$
  select array['habits', 'workout', 'crew', 'cycle']::text[]
$function$;

-- A kind not named in `kinds` is ON, the same rule crew_consent uses, so a kind added later is on for
-- everyone who already said yes and nobody is silently opted into something they refused.
create or replace function public.push_on(p_kinds jsonb, p_kind text) returns boolean
language sql immutable set search_path to 'public' as $function$
  select coalesce((p_kinds ->> p_kind)::boolean, true)
$function$;

-- The athlete's own clock. Everything about a reminder is in their local day, never the server's.
create or replace function public.push_local(p_now timestamptz, p_tz_offset integer) returns timestamp
language sql immutable set search_path to 'public' as $function$
  select (p_now at time zone 'utc') + make_interval(mins => p_tz_offset)
$function$;

-- The words. They live here, not in the sender, so the rehearsal can read them and there is one copy.
-- ⚠️ The Farsi is a DRAFT for Amir to read, the same rule as the privacy lines and the share cards.
-- Vague on purpose (his decision C1): the server knows what reached it, not what was ticked offline.
create or replace function public.push_lines(p_kind text, p_lang text)
returns table (title text, body text)
language sql immutable set search_path to 'public' as $function$
  select t.title, t.body from (values
    ('habits',  'en', 'Your day is still open',  'Tick what you did today.'),
    ('habits',  'fa', 'روزت هنوز بازه',            'بزن ببینم امروز چی کار کردی.'),
    ('workout', 'en', 'Time to train',            'It has been a couple of days.'),
    ('workout', 'fa', 'وقتِ تمرینه',               'دو روزی می‌شه خبری نیست.')
  ) as t(kind, lang, title, body)
  where t.kind = p_kind and t.lang = (case when p_lang = 'fa' then 'fa' else 'en' end)
$function$;

-- ── 4. The athlete's writes ────────────────────────────────────────────────────────────────────────
-- Subscribing is an upsert on the endpoint: a phone that re-subscribes (the browser rotates these) or
-- an athlete who signs in on a second phone each get their own row, and a row that moves to another
-- athlete follows the endpoint, because the endpoint is the phone, not the person.
create or replace function public.push_subscribe(
  p_endpoint text, p_p256dh text, p_auth text,
  p_app text default 'proof', p_hour integer default 20, p_tz_offset integer default 0,
  p_lang text default 'en', p_device text default null)
returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_id text := public.current_athlete_id();
begin
  if v_id is null then return null; end if;
  if p_endpoint is null or char_length(p_endpoint) < 20 or p_p256dh is null or p_auth is null then
    raise exception 'push_subscribe: that is not a subscription';
  end if;
  insert into public.push_subs as s (endpoint, athlete_id, p256dh, auth, app, hour, tz_offset, lang, device)
  values (p_endpoint, v_id, p_p256dh, p_auth,
          case when p_app = 'training' then 'training' else 'proof' end,
          least(22, greatest(8, coalesce(p_hour, 20))),
          least(840, greatest(-840, coalesce(p_tz_offset, 0))),
          case when p_lang = 'fa' then 'fa' else 'en' end,
          left(nullif(btrim(coalesce(p_device, '')), ''), 120))
  on conflict (endpoint) do update
    set athlete_id = excluded.athlete_id, p256dh = excluded.p256dh, auth = excluded.auth,
        app = excluded.app, tz_offset = excluded.tz_offset, lang = excluded.lang,
        device = excluded.device, fails = 0, updated_at = now()
  where s.endpoint = excluded.endpoint;
  return public.push_me();
end $function$;

-- The hour, the quiet days and the switches apply to EVERY phone this athlete has: the setting belongs
-- to the person, not the handset, and an athlete who sets 21:00 on their phone means it everywhere.
create or replace function public.push_set(p_kinds jsonb default null, p_hour integer default null, p_quiet_days integer default null)
returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_id text := public.current_athlete_id();
begin
  if v_id is null then return null; end if;
  -- ⚠️ greatest() and least() IGNORE nulls in Postgres, so greatest(8, null) is 8, not null. Written
  -- the obvious way, "change nothing" would have quietly reset everyone's hour to 8 and their quiet
  -- days to 1 every time the panel saved a switch. The null check has to come first. (The rehearsal
  -- caught this; it is exactly the kind of thing that errors nowhere and is wrong everywhere.)
  update public.push_subs
     set kinds = case when p_kinds is null or jsonb_typeof(p_kinds) <> 'object' then kinds
                      else kinds || p_kinds end,
         hour = case when p_hour is null then hour else least(22, greatest(8, p_hour)) end,
         quiet_days = case when p_quiet_days is null then quiet_days else least(4, greatest(1, p_quiet_days)) end,
         updated_at = now()
   where athlete_id = v_id;
  return public.push_me();
end $function$;

-- A no takes the phone off the server at once. The permission itself stays with the browser, which is
-- the athlete's to give back; the app says so.
create or replace function public.push_forget(p_endpoint text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_id text := public.current_athlete_id();
begin
  if v_id is null then return null; end if;
  delete from public.push_subs
   where athlete_id = v_id and (p_endpoint is null or endpoint = p_endpoint);
  return public.push_me();
end $function$;

-- What the Reminders panel draws. Never returns the endpoint or the keys: the app holds its own.
create or replace function public.push_me() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_id text := public.current_athlete_id(); v jsonb;
begin
  if v_id is null then return null; end if;
  select jsonb_build_object(
           'on', count(*) > 0,
           'phones', count(*),
           'hour', coalesce(min(hour), 20),
           'quiet_days', coalesce(min(quiet_days), 2),
           'kinds', coalesce(min(kinds::text)::jsonb, '{}'::jsonb),
           'lang', coalesce(min(lang), 'en'),
           'list', public.push_kind_list())
    into v
    from public.push_subs where athlete_id = v_id;
  return v;
end $function$;

-- ── 5. The decision: who is due a reminder right now ───────────────────────────────────────────────
-- One row per PHONE, because an athlete with two gets it on both; the sender marks the day once per
-- athlete and kind after it has been to all of them.
-- The order matters: the workout one is worked out first, and a habit reminder is withheld on a day it
-- goes, because for a coached athlete training IS one of the eight habits and two buzzes for one thing
-- is how a person learns to swipe them away.
create or replace function public.push_due(p_now timestamptz default now())
returns table (endpoint text, p256dh text, auth text, athlete_id text, kind text,
               title text, body text, tag text, ttl integer, day date)
language sql stable security definer set search_path to 'public' as $function$
  with phone as (
    select s.*,
           public.push_local(p_now, s.tz_offset) as local_at,
           public.push_local(p_now, s.tz_offset)::date as local_day,
           extract(hour from public.push_local(p_now, s.tz_offset))::int as local_hour
      from public.push_subs s
     where s.fails < 5
  ),
  ripe as (
    select p.* from phone p where p.local_hour = p.hour
  ),
  -- Coached means a plan: a free athlete has nothing to be reminded to train for.
  coached as (
    select r.*, (select coalesce(pr.data->'athlete'->>'tier', 'coached') <> 'free'
                   from public.programs pr where pr.athlete_id = r.athlete_id) as is_coached
      from ripe r
  ),
  judged as (
    select c.*,
      -- the workout one: nothing finished within the quiet window, and not already sent today
      (c.is_coached and public.push_on(c.kinds, 'workout')
        and not exists (select 1 from public.career_facts f
                         where f.athlete_id = c.athlete_id and f.kind = 'session_finished'
                           and f.void_at is null and f.day > c.local_day - c.quiet_days)
        and not exists (select 1 from public.push_sent t
                         where t.athlete_id = c.athlete_id and t.day = c.local_day and t.kind = 'workout')
      ) as want_workout,
      -- the habit one: today has not been closed yet, and not already sent today
      (public.push_on(c.kinds, 'habits')
        and not exists (select 1 from public.career_facts f
                         where f.athlete_id = c.athlete_id and f.kind = 'habit_day'
                           and f.void_at is null and f.day = c.local_day)
        and not exists (select 1 from public.push_sent t
                         where t.athlete_id = c.athlete_id and t.day = c.local_day and t.kind = 'habits')
      ) as want_habits
      from coached c
  ),
  picked as (
    select j.*, case when j.want_workout then 'workout'
                     when j.want_habits then 'habits' end as kind
      from judged j
     where j.want_workout or j.want_habits
  )
  select p.endpoint, p.p256dh, p.auth, p.athlete_id, p.kind,
         l.title, l.body, p.kind as tag, 7200 as ttl, p.local_day
    from picked p
    cross join lateral public.push_lines(p.kind, p.lang) l
$function$;

-- ── 6. What the sender tells us back ───────────────────────────────────────────────────────────────
-- Marked once per athlete, day and kind, after every one of their phones has been tried.
-- ⚠️ A day is written to the ledger ONLY when a phone actually took it. If every phone failed, the
-- day stays unmarked so the next run tries again — and because push_due() still only fires at the
-- athlete's own hour, "again" means once more that evening, not a retry storm. Marking a total
-- failure as sent would lose the reminder silently, which is the worst of both.
create or replace function public.push_done(p_athlete_id text, p_kind text, p_day date, p_ok boolean default true)
returns void
language plpgsql security definer set search_path to 'public' as $function$
begin
  if p_ok then
    insert into public.push_sent (athlete_id, day, kind) values (p_athlete_id, p_day, p_kind)
    on conflict (athlete_id, day, kind) do nothing;
  end if;
  update public.push_subs
     set last_sent_at = now(),
         last_ok_at = case when p_ok then now() else last_ok_at end,
         fails = case when p_ok then 0 else least(32767, fails + 1) end
   where athlete_id = p_athlete_id;
end $function$;

-- 404 or 410 from the push service means that subscription is dead: the app was uninstalled, the
-- permission was taken back, or the browser rotated it. The row goes; nothing else does.
create or replace function public.push_drop(p_endpoint text) returns void
language plpgsql security definer set search_path to 'public' as $function$
begin
  delete from public.push_subs where endpoint = p_endpoint;
end $function$;

create or replace function public.push_sweep() returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare n integer;
begin
  delete from public.push_sent where day < (now() at time zone 'utc')::date - 30;
  get diagnostics n = row_count;
  return n;
end $function$;

-- ── 7. Grants: the athlete's four are signed-in, the rest are the service role's ───────────────────
do $stage84_grants$
declare f text;
begin
  foreach f in array array[
    'public.push_kind_list()', 'public.push_on(jsonb,text)', 'public.push_local(timestamptz,integer)',
    'public.push_lines(text,text)', 'public.push_due(timestamptz)',
    'public.push_done(text,text,date,boolean)', 'public.push_drop(text)', 'public.push_sweep()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array[
    'public.push_subscribe(text,text,text,text,integer,integer,text,text)',
    'public.push_set(jsonb,integer,integer)', 'public.push_forget(text)', 'public.push_me()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end
$stage84_grants$;

-- ── 8. The sweep, hourly where pg_cron exists (the live project yes, a rehearsal no) ───────────────
do $stage84_cron$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('push-sweep', '23 4 * * *', 'select public.push_sweep()');
  end if;
end
$stage84_cron$;

-- ── 9. coach_erase_person() learns both tables ─────────────────────────────────────────────────────
-- Built with chr(10) and not from this file's own newlines, for the reason stage81 found the hard way:
-- a CRLF apply with an LF way back leaves a delete of a dropped table behind and every later erasure
-- fails. The two tables go on the end of the list, which is the order the other stages use.
do $stage84_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''crew_consent'']';
  s_new constant text := '''crew_consent'', ''push_sent'', ''push_subs'']';
  n integer;
begin
  if position(s_new in d) > 0 then
    return;   -- already patched (a re-run)
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage84: coach_erase_person() is not what this patch expects (the end of its table list found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $stage84_patch$;
