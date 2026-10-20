-- stage87_cycle_push.sql — "your next cycle is ready", on their phone (2026-10-20)
--
-- Amir: *"Build the sender for the cycle notification too, so the switch stops promising nothing."*
--
-- This is the last of the four kinds stage84 listed. The Reminders panel has offered
-- "A new cycle — When Amir publishes your next one" since stage84 went live, with nothing behind it:
-- the same fault Amir found in `crew` ("why didnt i?"), and the reason this file exists.
--
-- WHAT IT ADDS, AND NOTHING ELSE
--   1. One table, push_cycle_seen: per athlete, which cycle they have already been told about.
--      Short-lived in the sense that matters — it rebuilds itself by not sending twice — so it is NOT
--      in BACKUP_TABLES.
--   2. cycle_push_due(), the decision, in the same columns push_due() answers in, so the sender
--      carries it without knowing anything new.
--   3. cycle_push_done(), the one thing the sender tells us back.
--   4. coach_erase_person() learns the table.
-- No trigger, no queue, and no new cron job. See below for why each of those is absent.
--
-- WHY NO QUEUE, UNLIKE THE CREW. A crew event is a moment that passes: it happened, and if nobody is
-- told it is gone. A published cycle is a STATE — `currentCycleIndex` in the programme, which simply
-- stays advanced. So there is nothing to queue: the decision is "is their current cycle further on
-- than the one we last told them about", read from the programme itself every time. That also means a
-- phone that was off for a week still gets told, once, whenever it comes back.
--
-- WHY NO TRIGGER. `publish_cycle()` is the one writer and it is a long transaction that ends in a
-- coaching-log splice; hanging anything off it is a risk to a publish, which is the most important
-- write in the product (PRC-1). Reading the state afterwards costs nothing and cannot fail a publish.
--
-- WHY NO NEW CRON JOB. stage84's hourly `push-send` (at :04) already asks every sender with no
-- `only` parameter, so adding this one there means a cycle reaches a phone within the hour, inside
-- quiet hours, with no new machinery. The crew's own 15-minute tick (`?only=crew`) is left alone.
--
-- THE FIRST SIGHT IS NEVER A NOTIFICATION. An athlete who subscribes today must not immediately be
-- told about the cycle they are already training. So the first time this sees a phone with no row, it
-- writes down where they are and sends nothing; only an advance AFTER that rings. (The same thought as
-- stage86's watermark, which starts at the phone's own subscription.)
--
-- ⚠️ A notification carries the FACT and nothing else: "Your next cycle is ready." No cycle name, no
-- number, no load. A lock screen is read by whoever picks the phone up (stage84's rule).
--
-- QUIET HOURS are 08:00 to 21:59 where the athlete is, written here as stage86 writes them — not as a
-- CHECK on a column, because the hour is their own clock at the moment of sending and is not stored.
--
-- APPLIED to the live project 2026-10-20 on Amir's word, as the migration `stage87_cycle_push`, and
-- read back. See docs/rules/push.md for the read-back. ⚠️ A push-send deploy must SAY verify_jwt
-- false, or the gateway refuses pg_net's call with a 401 and all four kinds go silent.
--
-- Rehearsed on PGlite: scripts/push/rehearse_cycle_push.mjs.
-- The way back: scripts/push/rollback_stage87.sql, on Amir's word only. Safe to re-run this file.
--
-- ⚠️ ORDER, if these come off. stage87's way back must run BEFORE stage86's, which must run before
-- stage84's: each puts its own names on the end of coach_erase_person()'s table list, and each way
-- back looks for the end as its own stage left it.

-- ── 0. The guard ───────────────────────────────────────────────────────────────────────────────────
do $stage87_guard$
begin
  if to_regclass('public.push_subs') is null or to_regprocedure('public.push_on(jsonb,text)') is null
     or to_regprocedure('public.push_local(timestamptz,integer)') is null then
    raise exception 'stage87: the reminders are missing (stage84 first). Nothing was changed.';
  end if;
  if to_regclass('public.crew_push_seen') is null then
    raise exception 'stage87: stage86 is missing. Its names come before this one on coach_erase_person()''s list. Nothing was changed.';
  end if;
  if to_regclass('public.programs') is null then
    raise exception 'stage87: programs is missing. Nothing was changed.';
  end if;
end
$stage87_guard$;

-- ── 1. The table ───────────────────────────────────────────────────────────────────────────────────
-- `cycle_index` is the last cycle this athlete was told about; `pending` is the one a send in flight is
-- covering, promoted only when a phone actually took it (the two-column shape stage86 explains).
create table if not exists public.push_cycle_seen (
  athlete_id  text    primary key,
  cycle_index integer,
  pending     integer,
  at          timestamptz not null default now()
);

do $stage87_policies$
begin
  alter table public.push_cycle_seen enable row level security;
  revoke all on table public.push_cycle_seen from public, anon, authenticated;
  grant all on table public.push_cycle_seen to service_role;
end
$stage87_policies$;

-- ── 2. The words ───────────────────────────────────────────────────────────────────────────────────
-- Here and not in the sender, so there is one copy and the rehearsal can read them.
-- ⚠️ The Farsi is a DRAFT for Amir to read, as stage84's and stage86's lines are.
create or replace function public.cycle_push_words(p_lang text)
returns table (title text, body text)
language sql immutable set search_path to 'public' as $function$
  select t.title, t.body from (values
    ('en', 'Your next cycle is ready', 'Open the app and have a look.'),
    ('fa', 'سایکل بعدیت آماده‌ست',      'برنامه رو باز کن و یه نگاه بنداز.')
  ) as t(lang, title, body)
  where t.lang = (case when p_lang = 'fa' then 'fa' else 'en' end)
$function$;

-- ── 3. The decision ────────────────────────────────────────────────────────────────────────────────
-- One row per PHONE, in push_due()'s columns. `kind` and `tag` are 'cycle'; `day` is their local day,
-- which the sender uses only to group a person's phones together.
--
-- p_mark false is the dry run: it decides everything and writes nothing, so push-send?dry=1 is safe to
-- run at any hour without a cycle going unannounced.
create or replace function public.cycle_push_fold(p_now timestamptz default now())
returns table (athlete_id text, endpoint text, p256dh text, auth text, lang text, day date,
               cci integer, seen integer)
language sql stable security definer set search_path to 'public' as $function$
  with phone as (
    select s.endpoint, s.p256dh, s.auth, s.athlete_id, s.lang, s.kinds,
           public.push_local(p_now, s.tz_offset)::date as local_day,
           extract(hour from public.push_local(p_now, s.tz_offset))::int as local_hour
      from public.push_subs s
     where s.fails < 5
  ),
  -- Awake where they are, and the switch left on.
  awake as (
    select p.* from phone p
     where p.local_hour between 8 and 21 and public.push_on(p.kinds, 'cycle')
  ),
  -- A coached athlete with a roadmap. A free Proof athlete has no cycles to be told about, and a
  -- programme with no roadmap yet (an athlete mid-intake) has nothing to announce either.
  prog as (
    select a.*, (pr.data ->> 'currentCycleIndex')::int as cci
      from awake a
      join public.programs pr on pr.athlete_id = a.athlete_id
     where coalesce(pr.data -> 'athlete' ->> 'tier', 'coached') <> 'free'
       and jsonb_typeof(pr.data -> 'cycles') = 'array'
       and jsonb_array_length(pr.data -> 'cycles') > 0
       and (pr.data ->> 'currentCycleIndex') ~ '^\d{1,3}$'
  )
  select g.athlete_id, g.endpoint, g.p256dh, g.auth, g.lang, g.local_day, g.cci, sn.cycle_index
    from prog g left join public.push_cycle_seen sn on sn.athlete_id = g.athlete_id
$function$;

create or replace function public.cycle_push_due(p_now timestamptz default now(), p_mark boolean default true)
returns table (endpoint text, p256dh text, auth text, athlete_id text, kind text,
               title text, body text, tag text, ttl integer, day date)
language plpgsql security definer set search_path to 'public' as $function$
-- ⚠️ The returned column athlete_id is also a column of push_cycle_seen, so a bare name inside the
-- writes below is ambiguous; the column is what is meant. (stage86 hit this and says more about it.)
#variable_conflict use_column
begin
  -- First sight: write down where they are and tell them nothing. An athlete who subscribes today is
  -- not news-flashed about the cycle they are already training.
  if coalesce(p_mark, true) then
    insert into public.push_cycle_seen (athlete_id, cycle_index, at)
    select f.athlete_id, f.cci, now() from public.cycle_push_fold(p_now) f where f.seen is null
    on conflict (athlete_id) do nothing;
  end if;

  -- The cutoff this send covers, written before a single push leaves.
  if coalesce(p_mark, true) then
    update public.push_cycle_seen s
       set pending = f.cci, at = now()
      from public.cycle_push_fold(p_now) f
     where s.athlete_id = f.athlete_id and f.seen is not null and f.cci > f.seen;
  end if;

  return query
    select f.endpoint, f.p256dh, f.auth, f.athlete_id, 'cycle'::text,
           w.title, w.body, 'cycle'::text, 7200, f.day
      from public.cycle_push_fold(p_now) f
      cross join lateral public.cycle_push_words(f.lang) w
     where f.seen is not null and f.cci > f.seen;
end $function$;

-- ── 4. What the sender tells us back ───────────────────────────────────────────────────────────────
-- One phone taking it is enough. If every phone failed, the mark stays where it was and the next
-- hourly run tries again — and because a published cycle is a state and not a moment, "again" can be
-- tomorrow without anything being lost.
create or replace function public.cycle_push_done(p_athlete_id text, p_ok boolean default true) returns void
language plpgsql security definer set search_path to 'public' as $function$
begin
  update public.push_cycle_seen
     set cycle_index = case when p_ok then greatest(coalesce(cycle_index, pending), pending) else cycle_index end,
         pending = null,
         at = now()
   where athlete_id = p_athlete_id;
  -- The same bookkeeping push_done() does, so a handset that has stopped answering runs out of
  -- patience (fails = 5) on this path too.
  update public.push_subs
     set last_sent_at = now(),
         last_ok_at = case when p_ok then now() else last_ok_at end,
         fails = case when p_ok then 0 else least(32767, fails + 1) end
   where athlete_id = p_athlete_id;
end $function$;

-- A row for a phone that no longer exists goes; there is nothing else to sweep, because this table
-- holds one small row per athlete and no history.
create or replace function public.cycle_push_sweep() returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare n integer;
begin
  delete from public.push_cycle_seen s
   where not exists (select 1 from public.push_subs p where p.athlete_id = s.athlete_id);
  get diagnostics n = row_count;
  return n;
end $function$;

-- ── 5. Grants: all of it is the service role's ─────────────────────────────────────────────────────
do $stage87_grants$
declare f text;
begin
  foreach f in array array[
    'public.cycle_push_words(text)',
    'public.cycle_push_fold(timestamptz)',
    'public.cycle_push_due(timestamptz,boolean)',
    'public.cycle_push_done(text,boolean)',
    'public.cycle_push_sweep()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end
$stage87_grants$;

-- ── 6. coach_erase_person() learns the table ───────────────────────────────────────────────────────
-- On the end of the list, after stage86's two. The loop's `athlete_id` is the only thing in here that
-- names a person, so there is no second statement to add.
do $stage87_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''crew_push_seen'']';
  s_new constant text := '''crew_push_seen'', ''push_cycle_seen'']';
  n integer;
begin
  if position(s_new in d) > 0 then
    return;   -- already patched (a re-run)
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage87: coach_erase_person() is not what this patch expects (the end of its table list found % times, not once). Is stage86 on? Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $stage87_patch$;
