-- stage86_crew_push.sql — the crew half of the phone notifications (2026-10-19)
--
-- Amir: "one of the notification rules in my app was that everytime anything happens in the crew, any
-- lines, any new image, any likes, any new post, everyone should receive a notification", then, asked
-- whether to keep it at what the switch promises or ring for everything: "Everything in the crew
-- should ring for everyone: every post, photo, like and line. Build it that way."
--
-- So: EVERY event in the crew reaches EVERY other crew member's phone. Nothing is dropped and nothing
-- is judged more important than anything else. What this file does do is COLLECT: a tick every 15
-- minutes gathers everything an athlete has not been told about yet and sends it as ONE notification
-- ("The crew has been busy · 6 new things to see"), so a busy evening is four buzzes an hour at the
-- very most instead of two hundred. Every event still rings; it arrives in company.
--
-- WHY THIS IS A SEPARATE STAGE FROM stage84. stage84 said it in its own header: the Bell and "cycle N
-- is ready" are event-driven, not hourly, so they want a small queue rather than that file's clock.
-- This is that queue. push_subs.kinds already carries the 'crew' switch, so no athlete's answer has to
-- be migrated: the Reminders panel has been drawing "The crew — When Amir posts, or someone cheers
-- you" since stage84 went live, and until this stage is applied that switch promises something no
-- sender delivers. (program.html's line for it is reworded by the same commit.)
--
-- WHAT THIS ADDS, AND NOTHING ELSE
--   1. Two tables.
--      crew_push_q     one row per thing that happened in the crew. Short-lived, swept after 7 days,
--                      the same promise as the Bell itself: NOT in BACKUP_TABLES.
--      crew_push_seen  one row per athlete: how far they have been told. Short-lived in the same
--                      sense (it rebuilds itself by not sending twice): NOT in BACKUP_TABLES.
--   2. Seven triggers that fill the queue, one per source of a thing the Bell shows. Each one is
--      wrapped so that nothing it does can ever fail the save it is hanging off — a session log, a
--      minted award and a post are all more important than a notification.
--   3. The decision in SQL, as stage84 has it: crew_push_due() says who is owed what, in which
--      language, with what words. crew_push_done() is the only thing the sender tells us back.
--   4. crew_push_fire() and a pg_cron job every 15 minutes, which POSTs push-send?only=crew.
--   5. coach_erase_person() learns both tables.
--
-- WHAT RINGS. Everything the Bell shows, which is the same list get_bell() builds:
--   a post (with or without a photo), a session post, a cheer (kudos) on a post or on a line, and
--   every part of a line — a new level, a week held, one of the four marks, an achievement, a personal
--   best, a cycle finished, a month's honour, the Monthly Open's result, and joining the crew.
--   A LINE IS NOT A ROW: get_bell() derives it from career_facts, career_awards, career_honours and
--   crew_rings when it is read, so there is nothing to hang a trigger on. The triggers here sit on
--   those SOURCES instead, with the same filters get_bell() uses, so what rings and what the Bell
--   shows cannot drift apart. (Section 4 names each one against the line it becomes.)
--
-- WHAT NEVER RINGS, on purpose:
--   · your own doing. The one person never told about an event is whoever caused it.
--   · a quiet back-pay. `crew.quiet = 'on'` silences the queue exactly as it silences stage81's level
--     ring, so re-minting the past wakes nobody (GAME-6, D20).
--   · anything from before this athlete's phone subscribed, or before their latest yes.
--   · a kind the SUBJECT switched off in Crew's own settings (crew_consent.kinds). If their level is
--     not on the Bell it is not on anybody's lock screen either.
--   · an athlete who said no, an under-13, a former athlete, the demo. They are not crew_members(),
--     so nothing of theirs rings — and, being nowhere in the Bell, they are sent nothing either. An
--     under-13 reads the Bell and is not notified: a child's phone is the last place to push a feed.
--   · the words of a post, a weight, a number, an RPE, a lift's load. A lock screen is read by
--     whoever picks the phone up (stage84's rule). A notification carries a NAME and a KIND, never
--     content: "Sara posted", never what Sara wrote.
--
-- QUIET HOURS. Between 22:00 and 08:00 where the athlete is, nothing goes. The events wait in the
-- queue and arrive together at eight. stage84 keeps its quiet hours as a CHECK on a column so no code
-- can break them; this one cannot do that (the hour is not stored, it is the athlete's own clock at
-- the moment of sending), so the window is written once, in crew_push_due(), and the rehearsal checks
-- the night from both sides.
--
-- ⚠️ TTL, one hour. A reminder is worth two hours (stage84); a crew notification is worth less. If a
-- phone has been off for longer, the news is stale and the Bell has held it for seven days anyway.
-- Firebase would otherwise keep an undelivered message for four weeks.
--
-- ⚠️ THE TAG IS 'crew', ALWAYS. A second crew notification REPLACES the first on the lock screen
-- rather than stacking under it. That is what makes "everything rings" liveable on a phone.
--
-- ⚠️ THE WAY BACK, IF BOTH GO. scripts/push/rollback_stage86.sql must be run BEFORE
-- scripts/push/rollback_stage84.sql. stage84's way back looks for the end of coach_erase_person()'s
-- table list as stage84 left it, and this stage puts two more names after it.
--
-- APPLIED to the live project 2026-10-20 on Amir's word ("Yes go on"), as the migration
-- `stage86_crew_push`, and read back whole. See docs/rules/push.md for the read-back and the one thing
-- that went wrong: a push-send deploy must SAY verify_jwt false, or the gateway refuses pg_net's call
-- with a 401 and both the reminders and the crew go silent with nothing looking wrong.
--
-- Rehearsed on PGlite: scripts/push/rehearse_crew_push.mjs (the stage twice, the way back twice, every
-- branch of the decision, the night, the folding, every trigger, the erasure, the CRLF trap, and that
-- nothing in the scorer moved).
-- The way back: scripts/push/rollback_stage86.sql, on Amir's word only. Safe to re-run this file.

-- ── 0. The guard: what this one reads must be there ────────────────────────────────────────────────
do $stage86_guard$
begin
  if to_regclass('public.crew_consent') is null or to_regprocedure('public.crew_members()') is null then
    raise exception 'stage86: Crew and the Bell is missing (stage81 first). Nothing was changed.';
  end if;
  if to_regclass('public.push_subs') is null or to_regprocedure('public.push_on(jsonb,text)') is null
     or to_regprocedure('public.push_local(timestamptz,integer)') is null then
    raise exception 'stage86: the reminders are missing (stage84 first). Nothing was changed.';
  end if;
  if to_regprocedure('public.coach_note_id()') is null then
    raise exception 'stage86: coach_note_id() is missing. Nothing was changed.';
  end if;
  if to_regclass('public.career_facts') is null or to_regclass('public.career_awards') is null
     or to_regclass('public.career_honours') is null or to_regclass('public.crew_rings') is null then
    raise exception 'stage86: Career Mode is missing (stages 66 to 81 first). Nothing was changed.';
  end if;
end
$stage86_guard$;

-- ── 1. Tables ──────────────────────────────────────────────────────────────────────────────────────
-- One row per thing that happened. `athlete_id` is WHOSE doing it was: the post's author, the cheer's
-- giver, the athlete the line is about. It is the one person the event is never sent to, and it is the
-- name the notification shows. The column is called athlete_id, not `who`, because coach_erase_person()
-- empties every public table with an athlete_id column and checks afterwards that none was forgotten;
-- a cleverer name would have quietly fallen out of an erasure.
--
-- `target_key` is a cheer's RECIPIENT, held as their crew_key (stage81's opaque name for an athlete)
-- and never as an id. It is only ever compared with the reader's own key, to tell "Sara cheered you"
-- from "Sara gave a cheer" — so an erased athlete's key simply stops resolving, and there is no second
-- id in here for an erasure to have to find.
create table if not exists public.crew_push_q (
  id         bigint      generated always as identity primary key,
  athlete_id text        not null,
  kind       text        not null check (kind in ('post', 'kudos', 'level', 'week', 'mark', 'achievement',
                                                  'best', 'cycle', 'honour', 'open', 'joined')),
  target_key uuid,
  value      jsonb       not null default '{}'::jsonb check (jsonb_typeof(value) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists crew_push_q_at_idx on public.crew_push_q (created_at);

-- How far each athlete has been told. `upto` moves only when a phone of theirs actually took a
-- notification; `pending` is the cutoff a send in flight is covering.
--
-- Two columns rather than one because of the gap between asking and sending: crew_push_due() writes
-- `pending = now()` as it hands the rows over, and crew_push_done() moves it to `upto` once a phone
-- has taken them. A post that lands in that gap is therefore kept for the next tick instead of being
-- stepped over. If the sender dies in between, `pending` is left behind, `upto` has not moved, and the
-- next tick sends those events again: a notification twice, never a notification lost.
create table if not exists public.crew_push_seen (
  athlete_id text        primary key,
  upto       timestamptz,
  pending    timestamptz,
  at         timestamptz not null default now()
);

-- ── 2. Policies and grants: nothing is readable or writable directly; every door is a function ─────
-- Unlike stage84's two, the coach does not read these: neither is in BACKUP_TABLES (both are
-- short-lived, like the four tables the Bell itself keeps), so there is no backup to make complete.
do $stage86_policies$
declare t text;
begin
  foreach t in array array['crew_push_q', 'crew_push_seen'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end
$stage86_policies$;

-- ── 3. The words ───────────────────────────────────────────────────────────────────────────────────
-- Here, not in the sender, so there is one copy and the rehearsal can read them.
-- ⚠️ The Farsi is a DRAFT for Amir to read, the same rule as stage84's lines, the privacy pages and
-- the share cards.
--
-- A name and a kind, never content (see the header). One sentence each, plain words: an athlete reads
-- this on a lock screen and it has to sound like Amir typed it (COM-3).
create or replace function public.crew_push_words(p_n integer, p_kind text, p_who text, p_mine boolean, p_lang text)
returns table (title text, body text)
language sql immutable set search_path to 'public' as $function$
  with l as (select case when p_lang = 'fa' then 'fa' else 'en' end as lang),
  -- more than one thing to tell them: the count, and nothing about who or what
  many as (
    select case when l.lang = 'fa' then 'تو کرو خبر هست' else 'The crew has been busy' end as title,
           case when l.lang = 'fa' then p_n::text || ' چیز تازه.' else p_n::text || ' new things to see.' end as body
      from l),
  -- exactly one: who, and which kind of thing
  one as (
    select case when l.lang = 'fa' then coalesce(w.fa, 'یه خبر تو کرو') else coalesce(w.en, 'Something in the crew') end as title,
           case when l.lang = 'fa' then 'یه سر بزن.' else 'Have a look.' end as body
      from l
      left join (values
        ('post',        p_who || ' posted',                 p_who || ' پست گذاشت'),
        ('kudos_you',   p_who || ' cheered you',            p_who || ' برات دست زد'),
        ('kudos',       p_who || ' gave a cheer',           p_who || ' یه دست زد'),
        ('level',       p_who || ' reached a new level',    p_who || ' لِوِل گرفت'),
        ('week',        p_who || ' held their week',        p_who || ' هفته‌شو کامل کرد'),
        ('mark',        p_who || ' hit a new mark',         p_who || ' یه نشان گرفت'),
        ('achievement', p_who || ' earned an achievement',  p_who || ' یه دستاورد گرفت'),
        ('best',        p_who || ' set a personal best',    p_who || ' رکورد زد'),
        ('cycle',       p_who || ' finished a cycle',       p_who || ' یه سایکل تموم کرد'),
        ('honour',      p_who || ' took an honour',         p_who || ' یه افتخار برد'),
        ('open',        p_who || ' played the Monthly Open', p_who || ' تو مسابقهٔ ماه بازی کرد'),
        ('joined',      p_who || ' joined the crew',        p_who || ' اومد تو کرو')
      ) as w(k, en, fa)
        on w.k = case when p_kind = 'kudos' and coalesce(p_mine, false) then 'kudos_you' else p_kind end)
  select title, body from many where p_n > 1
  union all
  select title, body from one where p_n <= 1
$function$;

-- ── 4. The queue, and the seven triggers that fill it ──────────────────────────────────────────────
-- The one writer. Everything below goes through it, so the rules about what never rings are in one
-- place rather than copied seven times.
create or replace function public.crew_push_add(p_who text, p_kind text, p_target_key uuid default null, p_value jsonb default null)
returns void
language plpgsql security definer set search_path to 'public' as $function$
begin
  -- A quiet back-pay never rings: the same switch stage81's level ring reads (GAME-6, D20).
  if coalesce(current_setting('crew.quiet', true), '') = 'on' then return; end if;
  if nullif(btrim(coalesce(p_who, '')), '') is null then return; end if;
  -- Nobody is subscribed: there is nothing to queue for. Keeps the cost of this stage at zero until
  -- the first athlete taps the permission.
  if not exists (select 1 from public.push_subs limit 1) then return; end if;
  -- The cheap half of the crew test, on the primary key. The full one (a former athlete, the demo,
  -- the board) is done at sending time by crew_members(), so a "no" tomorrow silences what was
  -- queued today, and this trigger stays off the hot path of a session save.
  if p_who <> public.coach_note_id()
     and not exists (select 1 from public.crew_consent c
                      where c.athlete_id = p_who and c.answer = 'yes' and not c.under13) then
    return;
  end if;
  insert into public.crew_push_q (athlete_id, kind, target_key, value)
  values (p_who, p_kind, p_target_key, coalesce(p_value, '{}'::jsonb));
end $function$;

-- Every trigger below swallows its own trouble. A notification that is not queued is a notification
-- nobody gets; a session, an award or a post that fails to save is real harm. The warning is the
-- whole handling, exactly as stage81's crew_level_ring() does it.

-- a post or a session post → the Bell's post card
create or replace function public.crew_push_t_post() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  begin
    perform public.crew_push_add(new.athlete_id, 'post');
  exception when others then
    raise warning 'crew_push: a post of % did not queue: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_push_post on public.crew_posts;
create trigger crew_push_post after insert on public.crew_posts
  for each row execute function public.crew_push_t_post();

-- a cheer, on a post or on a line → the Like under either
create or replace function public.crew_push_t_kudos() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_key uuid;
begin
  begin
    if new.to_athlete is not null then
      select c.crew_key into v_key from public.crew_consent c where c.athlete_id = new.to_athlete;
    else
      select c.crew_key into v_key
        from public.crew_posts p join public.crew_consent c on c.athlete_id = p.athlete_id
       where p.id = new.post_id;
    end if;
    perform public.crew_push_add(new.athlete_id, 'kudos', v_key);
  exception when others then
    raise warning 'crew_push: a cheer from % did not queue: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_push_kudos on public.crew_kudos;
create trigger crew_push_kudos after insert on public.crew_kudos
  for each row execute function public.crew_push_t_kudos();

-- a level, and the Monthly Open's result → get_bell()'s 'level' and 'open' parts.
-- stage81's own trigger writes the level row and stage85's Open writes the other, so this one hangs off
-- crew_rings and inherits both, including the "only for a yes" test they already made.
create or replace function public.crew_push_t_ring() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  begin
    perform public.crew_push_add(new.athlete_id, new.kind);
  exception when others then
    raise warning 'crew_push: a ring of % did not queue: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_push_ring on public.crew_rings;
create trigger crew_push_ring after insert on public.crew_rings
  for each row execute function public.crew_push_t_ring();

-- a week held, a personal best, a cycle finished → the 'week', 'best' and 'cycle' parts.
-- The WHEN clause carries get_bell()'s own filters (void_at is null; the day within a fortnight; a best
-- has to name its lift) so the trigger is not even called for the facts a line would never show, and a
-- session save pays nothing for the ones it writes by the dozen.
create or replace function public.crew_push_t_fact() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  begin
    perform public.crew_push_add(new.athlete_id,
      case new.kind when 'week_held' then 'week' when 'personal_best' then 'best' else 'cycle' end);
  exception when others then
    raise warning 'crew_push: a fact of % did not queue: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_push_fact on public.career_facts;
create trigger crew_push_fact after insert on public.career_facts
  for each row when (new.void_at is null
                     and new.kind in ('week_held', 'personal_best', 'cycle_finished')
                     and new.day >= current_date - 14
                     and (new.kind <> 'personal_best' or nullif(btrim(new.value ->> 'lift'), '') is not null))
  execute function public.crew_push_t_fact();

-- the four numbers' marks and every achievement, minted live → the 'mark' and 'achievement' parts.
-- The same four marks get_bell() lists, and `how = 'live'` is what tells a real moment from a back-pay.
create or replace function public.crew_push_t_award() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  begin
    perform public.crew_push_add(new.athlete_id, case when new.kind = 'badge' then 'mark' else 'achievement' end);
  exception when others then
    raise warning 'crew_push: an award of % did not queue: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_push_award on public.career_awards;
create trigger crew_push_award after insert on public.career_awards
  for each row when (new.how = 'live'
                     and (new.kind = 'achievement'
                          or (new.kind = 'badge' and new.item in ('held_weeks', 'century', 'bests', 'comebacks'))))
  execute function public.crew_push_t_award();

-- a month's honour, once frozen → the 'honour' part. "One week short" (near) is never a moment.
create or replace function public.crew_push_t_honour() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  begin
    perform public.crew_push_add(new.athlete_id, 'honour');
  exception when others then
    raise warning 'crew_push: an honour of % did not queue: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_push_honour on public.career_honours;
create trigger crew_push_honour after insert on public.career_honours
  for each row when (new.honour <> 'near')
  execute function public.crew_push_t_honour();

-- joining: the first yes, which is the one moment Crew has no switch for.
create or replace function public.crew_push_t_joined() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  begin
    if new.first_yes_at is not null and (tg_op = 'INSERT' or old.first_yes_at is null) then
      perform public.crew_push_add(new.athlete_id, 'joined');
    end if;
  exception when others then
    raise warning 'crew_push: a joining of % did not queue: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_push_joined on public.crew_consent;
create trigger crew_push_joined after insert or update of first_yes_at on public.crew_consent
  for each row execute function public.crew_push_t_joined();

-- ── 5. The decision: what every phone is owed right now ────────────────────────────────────────────
-- One row per PHONE, with the same columns push_due() returns, so the sender carries both without
-- knowing anything new. kind is always 'crew' and the tag is always 'crew' (one bubble, replaced).
--
-- The fold is its own function so that crew_push_due() can both write the watermark and return the
-- rows without the decision being written out twice. It reads `upto` and never `pending`, so asking
-- it again after the watermark is written gives the same answer.
create or replace function public.crew_push_fold(p_now timestamptz default now())
returns table (athlete_id text, endpoint text, p256dh text, auth text, lang text, day date,
               n integer, one_kind text, one_who text, one_mine boolean)
language sql stable security definer set search_path to 'public' as $function$
  with phone as (
    select s.endpoint, s.p256dh, s.auth, s.athlete_id, s.lang, s.kinds,
           public.push_local(p_now, s.tz_offset)::date as local_day,
           extract(hour from public.push_local(p_now, s.tz_offset))::int as local_hour
      from public.push_subs s
     where s.fails < 5
  ),
  -- Awake where they are: 08:00 to 21:59 local, so nothing lands after ten at night or before eight
  -- in the morning. What happened overnight waits in the queue and arrives at eight.
  awake as (
    select p.* from phone p
     where p.local_hour between 8 and 21 and public.push_on(p.kinds, 'crew')
  ),
  -- Only a crew member is sent the crew. A no, an under-13, a former athlete and the demo are not
  -- crew_members(), and nothing of theirs is in the Bell either.
  mine as (
    select a.*, m.crew_key
      from awake a join public.crew_members() m on m.athlete_id = a.athlete_id
  ),
  mark as (
    select mi.*, coalesce(sn.upto, (select min(s2.created_at) from public.push_subs s2 where s2.athlete_id = mi.athlete_id)) as upto
      from mine mi left join public.crew_push_seen sn on sn.athlete_id = mi.athlete_id
  ),
  -- What each of them has not been told about: never their own doing, never older than the Bell's own
  -- seven days, never a kind the subject switched off, and only while the subject is still in the crew
  -- (so a no today takes yesterday's queued moments with it, exactly as it takes them off the Bell).
  ev as (
    select mk.athlete_id as to_id, mk.endpoint, mk.p256dh, mk.auth, mk.lang, mk.local_day,
           q.created_at, q.kind,
           case when q.athlete_id = public.coach_note_id() then 'Amir' else d.name end as by_name,
           (q.target_key is not null and q.target_key = mk.crew_key) as to_me
      from mark mk
      join public.crew_push_q q
        on q.created_at > coalesce(mk.upto, q.created_at - interval '1 second')
       and q.athlete_id <> mk.athlete_id
      left join public.crew_members() d on d.athlete_id = q.athlete_id
     where q.created_at >= p_now - interval '7 days'
       and (d.athlete_id is not null or q.athlete_id = public.coach_note_id())
       and (q.kind not in ('level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open')
            or coalesce((d.kinds ->> q.kind)::boolean, true))
  ),
  -- Folded: one notification per athlete. When it is the only thing, it is named; when it is six, it
  -- is counted. The newest one is the one that gets named — which no answer depends on today, because
  -- a folded notification names nobody; it is here so that changing the folded words later needs no
  -- new thinking about which event they would be about.
  fold as (
    select e.to_id, e.endpoint, e.p256dh, e.auth, e.lang, e.local_day, count(*)::int as n,
           (array_agg(e.kind order by e.created_at desc))[1] as one_kind,
           (array_agg(coalesce(e.by_name, 'Someone') order by e.created_at desc))[1] as one_who,
           (array_agg(e.to_me order by e.created_at desc))[1] as one_mine
      from ev e
     group by e.to_id, e.endpoint, e.p256dh, e.auth, e.lang, e.local_day
  )
  select f.to_id, f.endpoint, f.p256dh, f.auth, f.lang, f.local_day, f.n, f.one_kind, f.one_who, f.one_mine
    from fold f
$function$;

-- p_mark false is the dry run: it decides everything and writes no watermark, so push-send?dry=1 is
-- safe to run at any hour without swallowing a single event.
create or replace function public.crew_push_due(p_now timestamptz default now(), p_mark boolean default true)
returns table (endpoint text, p256dh text, auth text, athlete_id text, kind text,
               title text, body text, tag text, ttl integer, day date)
language plpgsql security definer set search_path to 'public' as $function$
-- ⚠️ This function RETURNS a column called athlete_id, so inside it a bare `athlete_id` is both an
-- output parameter and a column of crew_push_seen, and the insert below (its column list and its
-- `on conflict`) is refused as ambiguous. The column is what is meant everywhere here. (The rehearsal
-- found this: it is an error on every call, not a wrong answer, so nothing could have shipped — but
-- the names have to stay as they are, because they are the shape push_due() already answers in and
-- the sender reads.)
#variable_conflict use_column
begin
  perform public.crew_push_sweep();

  -- The cutoff this send is covering. Written before a single push leaves, so an event that arrives
  -- while the sender is working is kept for the next tick rather than stepped over.
  if coalesce(p_mark, true) then
    insert into public.crew_push_seen (athlete_id, pending, at)
    select f.athlete_id, p_now, now() from public.crew_push_fold(p_now) f
    on conflict (athlete_id) do update set pending = p_now, at = now();
  end if;

  return query
    select f.endpoint, f.p256dh, f.auth, f.athlete_id, 'crew'::text,
           w.title, w.body, 'crew'::text, 3600, f.day
      from public.crew_push_fold(p_now) f
      cross join lateral public.crew_push_words(f.n, f.one_kind, f.one_who, f.one_mine, f.lang) w;
end $function$;

-- ── 6. What the sender tells us back ───────────────────────────────────────────────────────────────
-- One phone taking it is enough: the watermark moves and the rest of the crew's evening is not sent
-- again because a second handset was unreachable. If EVERY phone failed, the watermark stays where it
-- was and the next tick tries once more — fifteen minutes, not a storm.
create or replace function public.crew_push_done(p_athlete_id text, p_ok boolean default true) returns void
language plpgsql security definer set search_path to 'public' as $function$
begin
  update public.crew_push_seen
     set upto = case when p_ok then greatest(coalesce(upto, pending), pending) else upto end,
         pending = null,
         at = now()
   where athlete_id = p_athlete_id;
  -- The same bookkeeping push_done() does, so a handset that has stopped answering runs out of
  -- patience (fails = 5) on this path too instead of being tried for ever.
  update public.push_subs
     set last_sent_at = now(),
         last_ok_at = case when p_ok then now() else last_ok_at end,
         fails = case when p_ok then 0 else least(32767, fails + 1) end
   where athlete_id = p_athlete_id;
end $function$;

-- The queue keeps the Bell's promise: seven days, then gone. Every send sweeps, and pg_cron sweeps
-- once a day in case nothing is ever sent. A watermark for a phone that no longer exists goes too.
create or replace function public.crew_push_sweep() returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare v_n integer := 0; k integer;
begin
  delete from public.crew_push_q where created_at < now() - interval '7 days';
  get diagnostics k = row_count; v_n := v_n + k;
  delete from public.crew_push_seen s
   where not exists (select 1 from public.push_subs p where p.athlete_id = s.athlete_id);
  get diagnostics k = row_count; v_n := v_n + k;
  return v_n;
end $function$;

-- ── 7. Grants: all of it is the service role's ─────────────────────────────────────────────────────
-- Nothing here is an athlete's to call. The switch they do have is stage84's push_set('crew'), and the
-- Bell they read is stage81's get_bell(); this stage is only the machinery between the two.
do $stage86_grants$
declare f text;
begin
  foreach f in array array[
    'public.crew_push_words(integer,text,text,boolean,text)',
    'public.crew_push_add(text,text,uuid,jsonb)',
    'public.crew_push_fold(timestamptz)',
    'public.crew_push_due(timestamptz,boolean)',
    'public.crew_push_done(text,boolean)',
    'public.crew_push_sweep()',
    'public.crew_push_t_post()', 'public.crew_push_t_kudos()', 'public.crew_push_t_ring()',
    'public.crew_push_t_fact()', 'public.crew_push_t_award()', 'public.crew_push_t_honour()',
    'public.crew_push_t_joined()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end
$stage86_grants$;

-- ── 8. What makes it happen, every fifteen minutes ─────────────────────────────────────────────────
-- The same shape as stage84's push_fire(), reading the same one-row push_config so the two can never
-- disagree about the address or the shared secret, and calling the same Edge Function with ?only=crew
-- so the hourly reminder run is left exactly as stage84 documented it.
--
-- Fifteen minutes is the folding window: it is why a busy evening is a handful of notifications and
-- not a hundred. Shorten it and the crew gets noisier; lengthen it and the news gets staler. Nothing
-- is dropped either way.
create or replace function public.crew_push_fire() returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare c record; req bigint;
begin
  select * into c from public.push_config where id;
  if c.url is null or c.secret is null then
    return jsonb_build_object('ok', false, 'why', 'push_config is not filled in yet');
  end if;
  if to_regproc('net.http_post') is null then
    return jsonb_build_object('ok', false, 'why', 'pg_net is not installed');
  end if;
  execute format('select %s($1, $2::jsonb, ''{}''::jsonb, $3::jsonb, 20000)', 'net.http_post')
    into req
    using c.url || case when position('?' in c.url) > 0 then '&' else '?' end || 'only=crew',
          '{}'::jsonb,
          jsonb_build_object('Content-Type', 'application/json', 'x-push-key', c.secret);
  return jsonb_build_object('ok', true, 'request', req);
exception when others then
  -- A sender that is down must never take the job with it.
  raise warning 'crew_push_fire: %', sqlerrm;
  return jsonb_build_object('ok', false, 'why', sqlerrm);
end $function$;

do $stage86_fire_grant$
begin
  revoke all on function public.crew_push_fire() from public, anon, authenticated;
  grant execute on function public.crew_push_fire() to service_role;
end
$stage86_fire_grant$;

do $stage86_cron$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('crew-push', '*/15 * * * *', 'select public.crew_push_fire()');
    perform cron.schedule('crew-push-sweep', '38 4 * * *', 'select public.crew_push_sweep()');
  end if;
end
$stage86_cron$;

-- ── 9. coach_erase_person() learns both tables ─────────────────────────────────────────────────────
-- Both go on the end of the list, the order every other stage uses. There is no second statement to
-- add this time: crew_push_q holds a cheer's recipient as a crew_key and not as an id, so the loop's
-- athlete_id is the only thing in here that names a person. (stage81 needed one for crew_kudos.)
--
-- The anchor is a single line of the function's text, so unlike stage81's patch this one cannot be
-- caught by a CRLF apply and an LF way back. The rehearsal runs all three mixes anyway.
do $stage86_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''push_subs'']';
  s_new constant text := '''push_subs'', ''crew_push_q'', ''crew_push_seen'']';
  n integer;
begin
  if position(s_new in d) > 0 then
    return;   -- already patched (a re-run)
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage86: coach_erase_person() is not what this patch expects (the end of its table list found % times, not once). Is stage84 on? Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $stage86_patch$;
