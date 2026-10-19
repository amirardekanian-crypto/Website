-- stage81_career_crew.sql — Crew and the Bell (Career Mode round 5, step 5; 2026-10-19)
--
-- Amir's words (career/CAREER_MODE.md → Round 5, "Amir on the Crew and Open page"): the Crew tab is one feed (A); the free-text place comes back
-- "on top of it i want to be able to send a phote but these messages and images should only exist for a little while", then "for a week, but a
-- certain quality of photo, not to fill in our servers"; "Bell: go with your picks" on The Bell page (https://claude.ai/artifact/55fbdfUgJVxySL7EpihyWb):
-- A, the Clubhouse feed (a photo post is a card with the photo at 4:5, a moment a slim green line, kudos with names, a composer at the top), a photo
-- 1280 px on its long side at JPEG 75 % (about 200 KB) with its location taken off, at most 3 a day per athlete, Amir's post at the top for a day,
-- kudos only (no replies), "Tell the crew" on the finished card; and the list of what rings ("a session finished should be only in the bell if they
-- want to add a photo to it. im ok with your picks"). GAME-6: nothing here pays XP. GAME-9: nothing of an athlete reaches the crew before their yes.
--
-- What this adds, and nothing else:
--   1. Five tables. Every write goes through a function below; nobody writes a table directly.
--        crew_consent  each athlete's answer (yes / no / not asked), a switch per kind of moment, the crew name used when they are not on the board,
--                      Amir's under-13 tick (never posts, never rings, never named) and the opaque key of their Bell lines (an id never leaves).
--                      Kept for good: in BACKUP_TABLES, the snapshot and coach_erase_person().
--        crew_posts    a message (up to 280 characters) and/or a photo, or a finished session told to the crew (a photo always). Gone after 7 days.
--        crew_photos   the photo of a post: a JPEG of at most 450 KB, made smaller on the phone first. Deleted with its post.
--        crew_kudos    who gave kudos to which post or Bell line. Gone with the post, or 7 days after the line's day.
--        crew_rings    the moments the server cannot read back later: a new level (from the score cache) and, from stage82, a Monthly Open result.
--                      Gone after 8 days.
--      The four short-lived tables are LEFT OUT of BACKUP_TABLES on purpose (scripts/restore/restore_backup.py SHORT_LIVED): a weekly backup kept
--      12 weeks would break the 7-day promise in privacy.html. They are in the schema snapshot and coach_erase_person()'s list like every table.
--      The photos are rows, not Supabase Storage files: a Storage file cannot be deleted from SQL (storage.protect_delete), so the 7-day sweep and
--      an erasure would each need an Edge Function and the erasure would no longer be one transaction. A row is gone in the same delete.
--   2. The read: get_bell() (the feed, the month's honours, my answer), crew_photo() (one photo, when its card is on screen).
--   3. The athlete's writes: crew_answer() (yes or no, asked on the first visit), crew_kinds() (a switch per kind), crew_post(), crew_delete_post(),
--      crew_kudos() (on or off).
--   4. The coach's: coach_crew() (every post, every answer), coach_crew_post() (Amir's own post, pinned for a day), coach_crew_remove(),
--      coach_crew_under13().
--   5. crew_sweep(): deletes what is past its life. Every read and post runs it; pg_cron runs it every hour where the extension exists.
--   6. A trigger on career_scores: a level that goes UP rings (one row per level reached), only for an athlete whose answer is yes.
--   7. coach_erase_person() learns the five tables, and the kudos given TO a person's lines (patched in place, as stage75).
--
-- What rings the Bell (one line per athlete per day, every part of their day on it; read live, so a no or a switch turned off hides it at once):
--   a new level (crew_rings) · a week held, with the run (week_held facts; the run is a TWIN of get_profile()'s loop: only a broken week ends a
--   run) · the four numbers' marks (career_awards badges held_weeks, century, bests, comebacks, minted LIVE) · an achievement (minted live) ·
--   a personal best, the lift only, never the weight (personal_best facts) · a cycle finished (cycle_finished) · the month's honours (frozen
--   career_honours, never "near") · a Monthly Open result (crew_rings kind 'open', written by stage82) · joining the crew (the first yes).
--   Never: a broken week, a single comeback (only its marks), a weight, an RPE, a check-in answer, pain, body weight or a habit. A quiet back-pay
--   (how 'silent' or 'baseline') never rings. A moment rings only from the athlete's latest yes on (yes_since), and only while the day it was
--   learned (created_at) is within the last 7 days. A finished session reaches the Bell only through Tell the crew, with a photo.
--
-- Who can be seen: an athlete whose answer is yes, who is not ticked under 13, not a former athlete (athlete_status) and not the demo. Their name
-- is the board's (leaderboard_optin), else the crew name kept at the yes. get_bell() never returns an athlete id: a line is named by the athlete's
-- crew_key and its day, a post by its own uuid. Amir's own posts (coach.html) are written under coach_note_id() and always seen.
--
-- Rehearsed on PGlite: scripts/career/rehearse_crew.mjs (the schema snapshot, made-up athletes, the stage twice, the way back).
-- The way back: scripts/career/rollback_stage81.sql (copies crew_consent to the backup schema, drops the rest, puts coach_erase_person() back).
-- Safe to re-run this file.

-- ── 0. The guard: the stages this one reads must be there ───────────────────────────────────────────────────────────────
do $stage81_guard$
begin
  if to_regclass('public.career_awards') is null or to_regclass('public.career_scores') is null then
    raise exception 'stage81: career_awards or career_scores is missing (stages 66 to 70 first). Nothing was changed.';
  end if;
  if to_regclass('public.career_honours') is null then
    raise exception 'stage81: career_honours is missing (stage75 first). Nothing was changed.';
  end if;
  if to_regprocedure('public.current_athlete_id()') is null or to_regprocedure('public.is_coach()') is null
     or to_regprocedure('public.coach_note_id()') is null then
    raise exception 'stage81: current_athlete_id(), is_coach() or coach_note_id() is missing. Nothing was changed.';
  end if;
end
$stage81_guard$;

-- ── 1. Tables ──────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.crew_consent (
  athlete_id   text        primary key,
  answer       text        check (answer in ('yes', 'no')),          -- null: never answered (a row Amir's under-13 tick made)
  kinds        jsonb       not null default '{}'::jsonb check (jsonb_typeof(kinds) = 'object'),   -- {"level": false} turns levels off; a kind not named is on
  name         text        check (name is null or char_length(name) between 1 and 24),   -- the crew name, used only when they are not on the board
  under13      boolean     not null default false,                     -- Amir's tick (GAME-9): never posts, never rings, never named
  crew_key     uuid        not null default gen_random_uuid(),         -- names their Bell lines; the athlete id never leaves the server
  answered_at  timestamptz,
  first_yes_at timestamptz,                                            -- "joined the crew" rings from here
  yes_since    timestamptz,                                            -- their latest yes: a moment rings only from here on
  updated_at   timestamptz not null default now()
);
create table if not exists public.crew_posts (
  id         uuid        primary key default gen_random_uuid(),
  athlete_id text        not null,                                     -- the author; coach_note_id() for Amir's posts from coach.html
  kind       text        not null default 'post' check (kind in ('post', 'session')),   -- session: Tell the crew, from the finished card
  body       text        not null default '' check (char_length(body) <= 280),
  session    jsonb       check (session is null or jsonb_typeof(session) = 'object'),  -- {"day": 2, "n": 47} for a session
  has_photo  boolean     not null default false,
  created_at timestamptz not null default now(),
  constraint crew_posts_something check (char_length(btrim(body)) > 0 or has_photo),
  constraint crew_posts_session_photo check (kind <> 'session' or has_photo)
);
create index if not exists crew_posts_at_idx on public.crew_posts (created_at desc);
create index if not exists crew_posts_who_idx on public.crew_posts (athlete_id, created_at);
create table if not exists public.crew_photos (
  post_id    uuid        primary key references public.crew_posts (id) on delete cascade,
  athlete_id text        not null,
  mime       text        not null default 'image/jpeg' check (mime = 'image/jpeg'),
  w          integer     check (w is null or w between 1 and 4000),
  h          integer     check (h is null or h between 1 and 4000),
  bytes      bytea       not null check (octet_length(bytes) between 100 and 450000),
  created_at timestamptz not null default now()
);
create index if not exists crew_photos_who_idx on public.crew_photos (athlete_id, created_at);
create table if not exists public.crew_kudos (
  id         bigint      generated always as identity primary key,
  athlete_id text        not null,                                     -- who gave it
  post_id    uuid        references public.crew_posts (id) on delete cascade,
  to_athlete text,                                                     -- a Bell line's athlete (a line is an athlete's day)
  line_day   date,
  created_at timestamptz not null default now(),
  constraint crew_kudos_one_target check ((post_id is not null) <> (to_athlete is not null)),
  constraint crew_kudos_line check ((to_athlete is null) = (line_day is null))
);
create unique index if not exists crew_kudos_post_uq on public.crew_kudos (athlete_id, post_id) where post_id is not null;
create unique index if not exists crew_kudos_line_uq on public.crew_kudos (athlete_id, to_athlete, line_day) where to_athlete is not null;
create index if not exists crew_kudos_to_idx on public.crew_kudos (to_athlete, line_day) where to_athlete is not null;
create index if not exists crew_kudos_postx_idx on public.crew_kudos (post_id) where post_id is not null;
create table if not exists public.crew_rings (
  athlete_id text        not null,
  kind       text        not null check (kind in ('level', 'open')),
  ref        text        not null,                                     -- the level reached; stage82: the Open's month
  day        date        not null default current_date,
  value      jsonb       not null default '{}'::jsonb check (jsonb_typeof(value) = 'object'),
  created_at timestamptz not null default now(),
  primary key (athlete_id, kind, ref)
);
create index if not exists crew_rings_at_idx on public.crew_rings (created_at);

-- ── 2. Policies and grants: the coach reads the answers (so the backup is complete); nothing else is readable or writable directly ──────
do $stage81_policies$
declare t text;
begin
  foreach t in array array['crew_consent', 'crew_posts', 'crew_photos', 'crew_kudos', 'crew_rings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'crew_consent' and policyname = 'coach reads crew consent') then
    create policy "coach reads crew consent" on public.crew_consent for select to authenticated using ((select public.is_coach()));
  end if;
  grant select on table public.crew_consent to authenticated;
end
$stage81_policies$;

-- ── 3. Helpers ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- The kinds of moment an athlete can switch off, in the order the account sheet lists them. Joining the crew has no switch: it is the yes.
create or replace function public.crew_kind_list() returns text[]
language sql immutable set search_path to 'public' as $function$
  select array['level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open']::text[]
$function$;

-- Text as it may reach the crew: a tab becomes a space, no other control character but the line break survives, no bidi override or isolate
-- (U+202A-202E, U+2066-2069) and no invisible space (U+200B, U+FEFF), at most two line breaks in a row, trimmed.
-- ⚠️ The zero-width NON-joiner (U+200C) and joiner (U+200D) STAY: Persian spells words with the non-joiner (می‌رم), and the joiner
-- holds a family or a skin tone together as one emoji. Stripping them mangled Farsi and split an emoji into its pieces.
create or replace function public.crew_clean(p text) returns text
language sql immutable set search_path to 'public' as $function$
  select btrim(regexp_replace(
           regexp_replace(replace(coalesce(p, ''), chr(9), ' '), E'[\\x01-\\x08\\x0b-\\x1f\\x7f\\u200b\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069\\ufeff]', '', 'g'),
           E'\\n{3,}', E'\n\n', 'g'))
$function$;

-- First name and the last name's initial, as AA Proof's defaultDisplayName() makes a board name.
create or replace function public.crew_default_name(p_athlete text) returns text
language sql stable set search_path to 'public' as $function$
  select left(coalesce(nullif(btrim(concat_ws(' ', nullif(btrim(p.data -> 'athlete' ->> 'firstName'), ''),
                                              upper(left(nullif(btrim(p.data -> 'athlete' ->> 'lastName'), ''), 1)) || '.')), ''), 'Athlete'), 24)
    from public.programs p where p.athlete_id = p_athlete
$function$;

-- Who the crew can see: a yes, not under 13, not a former athlete, not the demo. Their name: the board's, else the crew name kept at the yes.
create or replace function public.crew_members() returns table (athlete_id text, name text, crew_key uuid, kinds jsonb, yes_since timestamptz, first_yes_at timestamptz)
language sql stable set search_path to 'public' as $function$
  select c.athlete_id,
         coalesce(nullif(btrim(o.display_name), ''), c.name, public.crew_default_name(c.athlete_id), 'Athlete'),
         c.crew_key, c.kinds, c.yes_since, c.first_yes_at
    from public.crew_consent c
    left join public.leaderboard_optin o on o.athlete_id = c.athlete_id
   where c.answer = 'yes' and not c.under13 and c.athlete_id not in ('demo', public.coach_note_id())
     and not exists (select 1 from public.athlete_status s where s.athlete_id = c.athlete_id and s.status = 'former')
$function$;

-- Deletes what is past its life: a post (with its photo and its kudos) 7 days after it was posted, a Bell line's kudos 7 days after the line's day,
-- a stored ring after 8 days. Every read and post runs it; pg_cron runs it every hour (below). Returns how many rows went.
create or replace function public.crew_sweep() returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare v_n integer := 0; k integer;
begin
  delete from public.crew_posts where created_at < now() - interval '7 days';
  get diagnostics k = row_count; v_n := v_n + k;
  delete from public.crew_kudos where to_athlete is not null and line_day < current_date - 7;
  get diagnostics k = row_count; v_n := v_n + k;
  delete from public.crew_rings where created_at < now() - interval '8 days';
  get diagnostics k = row_count; v_n := v_n + k;
  return v_n;
end $function$;

-- One target's kudos as the viewer sees it: how many, up to three names of crew members (newest first, never the viewer), and whether the viewer
-- gave it. A giver who is no longer in the crew (a no, a former athlete) is not counted.
create or replace function public.crew_kudos_of(p_post uuid, p_to text, p_day date, p_viewer text) returns jsonb
language sql stable set search_path to 'public' as $function$
  with k as (
    select k.athlete_id, m.name, k.created_at
      from public.crew_kudos k join public.crew_members() m on m.athlete_id = k.athlete_id
     where (p_post is not null and k.post_id = p_post) or (p_post is null and k.to_athlete = p_to and k.line_day = p_day)
  )
  select jsonb_build_object(
    'n', (select count(*) from k),
    'mine', exists (select 1 from k where k.athlete_id is not distinct from p_viewer),
    'names', coalesce((select jsonb_agg(x.name order by x.created_at desc)
                         from (select k.name, k.created_at from k where k.athlete_id is distinct from p_viewer order by k.created_at desc limit 3) x), '[]'::jsonb))
$function$;

-- The viewer's own answer and what they may do. Null for the coach with no athlete named.
create or replace function public.crew_me(p_id text) returns jsonb
language sql stable set search_path to 'public' as $function$
  select case when p_id is null then null else jsonb_build_object(
    'answer', c.answer,
    'kinds', (select jsonb_object_agg(k.kind, coalesce((c.kinds ->> k.kind)::boolean, true)) from unnest(public.crew_kind_list()) k(kind)),
    'name', coalesce((select nullif(btrim(o.display_name), '') from public.leaderboard_optin o where o.athlete_id = p_id), c.name, public.crew_default_name(p_id)),
    'on_board', exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_id),
    'under13', coalesce(c.under13, false),
    'can_post', coalesce(c.answer = 'yes' and not c.under13, false) and p_id <> 'demo'
                and not exists (select 1 from public.athlete_status s where s.athlete_id = p_id and s.status = 'former'),
    'photos_left', greatest(0, 3 - (select count(*) from public.crew_photos ph where ph.athlete_id = p_id and ph.created_at >= date_trunc('day', now()))),
    'posts_left', greatest(0, 10 - (select count(*) from public.crew_posts cp where cp.athlete_id = p_id and cp.created_at >= date_trunc('day', now()))))
  end
  from (select 1) one left join public.crew_consent c on c.athlete_id = p_id
$function$;

-- ── 4. The read ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- The feed, newest first: Amir's post of the last 24 hours pinned at the top, then posts and Bell lines by time. The month's honours (last month,
-- frozen, crew members only) while it is the 1st to the 14th. The viewer's own answer. The athlete reads their own; the coach reads as anyone (the
-- preview) or as nobody; the SQL editor or the service role as anyone.
create or replace function public.get_bell(p_athlete_id text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me text := public.current_athlete_id();
  v_coach boolean := public.is_coach();
  v_report boolean := coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role');
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  v_from timestamptz := now() - interval '7 days';
  v_items jsonb; v_hon jsonb := null; v_m0 date := (date_trunc('month', current_date) - interval '1 month')::date;
begin
  if v_id is null and not (v_coach or v_report) then
    raise exception 'not signed in';
  end if;
  if v_id is distinct from v_me and not (v_coach or v_report) then
    raise exception 'not your bell';
  end if;
  perform public.crew_sweep();

  with mem as (select * from public.crew_members()),
  on_kind as (select m.athlete_id, k.kind from mem m cross join unnest(public.crew_kind_list()) k(kind)
               where coalesce((m.kinds ->> k.kind)::boolean, true)),
  -- the week runs: a twin of get_profile()'s loop (only a broken week ends a run)
  wk as (
    select f.athlete_id, f.kind, f.ref, f.day, f.created_at,
           count(*) filter (where f.kind = 'week_broken') over (partition by f.athlete_id order by f.day, f.ref rows unbounded preceding) as grp
      from public.career_facts f
     where f.athlete_id in (select athlete_id from mem) and f.void_at is null and f.kind in ('week_held', 'week_broken')),
  runs as (
    select wk.*, count(*) filter (where wk.kind = 'week_held') over (partition by wk.athlete_id, wk.grp order by wk.day, wk.ref rows unbounded preceding) as run
      from wk),
  parts as (
    -- a new level (the score cache's trigger)
    select r.athlete_id, r.created_at as at, 'level' as kind, jsonb_build_object('k', 'level', 'n', (r.value ->> 'n')::int) as p
      from public.crew_rings r where r.kind = 'level' and r.created_at >= v_from
    union all
    -- a Monthly Open result (stage82 writes it)
    select r.athlete_id, r.created_at, 'open', r.value || jsonb_build_object('k', 'open')
      from public.crew_rings r where r.kind = 'open' and r.created_at >= v_from
    union all
    -- a week held, with the run it makes
    select ru.athlete_id, ru.created_at, 'week', jsonb_build_object('k', 'week', 'run', ru.run)
      from runs ru where ru.kind = 'week_held' and ru.created_at >= v_from and ru.day >= current_date - 14
    union all
    -- a personal best: the lift, never the weight
    select f.athlete_id, f.created_at, 'best', jsonb_build_object('k', 'best', 'lift', f.value ->> 'lift')
      from public.career_facts f
     where f.athlete_id in (select athlete_id from mem) and f.void_at is null and f.kind = 'personal_best'
       and f.day >= current_date - 14 and f.created_at >= v_from and nullif(btrim(f.value ->> 'lift'), '') is not null
    union all
    -- a cycle finished
    select f.athlete_id, f.created_at, 'cycle', jsonb_build_object('k', 'cycle', 'n', (f.value ->> 'cycle')::int)
      from public.career_facts f
     where f.athlete_id in (select athlete_id from mem) and f.void_at is null and f.kind = 'cycle_finished'
       and f.day >= current_date - 14 and f.created_at >= v_from
    union all
    -- the four numbers' marks and every achievement, minted live (a quiet back-pay never rings)
    select a.athlete_id, a.created_at,
           case when a.kind = 'badge' then 'mark' else 'achievement' end,
           case when a.kind = 'badge'
                then jsonb_build_object('k', 'mark', 'item', a.item,
                                        'at', (select (t.v ->> 'at')::int from public.career_catalogue c
                                                cross join lateral jsonb_array_elements(c.body -> 'tiers') with ordinality t(v, i)
                                                where c.kind = 'badge' and c.id = a.item and t.i = a.tier))
                else jsonb_build_object('k', 'achievement', 'id', a.item,
                                        'name', coalesce((select c.body ->> 'name' from public.career_catalogue c where c.kind = 'achievement' and c.id = a.item), a.item))
           end
      from public.career_awards a
     where a.athlete_id in (select athlete_id from mem) and a.how = 'live' and a.created_at >= v_from
       and (a.kind = 'achievement' or (a.kind = 'badge' and a.item in ('held_weeks', 'century', 'bests', 'comebacks')))
    union all
    -- the month's honours, once frozen (never "one week short")
    select h.athlete_id, h.created_at, 'honour', jsonb_build_object('k', 'honour', 'honour', h.honour, 'month', h.month)
      from public.career_honours h
     where h.athlete_id in (select athlete_id from mem) and h.honour <> 'near' and h.created_at >= v_from
    union all
    -- joining the crew: the first yes
    select m.athlete_id, m.first_yes_at, 'joined', jsonb_build_object('k', 'joined')
      from mem m where m.first_yes_at >= v_from
  ),
  kept0 as (
    select p.*, (p.at at time zone 'UTC')::date as d
      from parts p join mem m on m.athlete_id = p.athlete_id
     where p.at >= coalesce(m.yes_since, p.at)
       and (p.kind = 'joined' or exists (select 1 from on_kind o where o.athlete_id = p.athlete_id and o.kind = p.kind))),
  kept as (
    select k.*, bool_or(k.kind = 'mark' and k.p ->> 'item' = 'held_weeks') over (partition by k.athlete_id, k.d) as hw_mark
      from kept0 k),
  -- one line per athlete per day, each kind once: the newest level; the marks, achievements, honours and the Open as they came; the bests as one
  -- part naming the lifts; the longest run of held weeks (none when its own Hold Serve mark rang the same day); the latest cycle
  lines as (
    select k.athlete_id, k.d, max(k.at) as at,
           max((k.p ->> 'n')::int) filter (where k.kind = 'level') as lvl,
           jsonb_agg(k.p order by k.at) filter (where k.kind in ('joined', 'mark', 'achievement', 'honour', 'open')) as rest,
           array_agg(distinct k.p ->> 'lift') filter (where k.kind = 'best') as lifts,
           max((k.p ->> 'run')::int) filter (where k.kind = 'week' and not k.hw_mark) as run,
           max((k.p ->> 'n')::int) filter (where k.kind = 'cycle') as cyc
      from kept k group by k.athlete_id, k.d),
  line_items as (
    select l.at, jsonb_build_object(
             't', 'line', 'key', m.crew_key::text || ':' || l.d::text, 'who', m.name, 'me', l.athlete_id is not distinct from v_id,
             'at', l.at,
             'parts', case when l.lvl is not null then jsonb_build_array(jsonb_build_object('k', 'level', 'n', l.lvl)) else '[]'::jsonb end
                      || coalesce(l.rest, '[]'::jsonb)
                      || case when l.lifts is not null then jsonb_build_array(jsonb_build_object('k', 'best', 'lifts', to_jsonb(l.lifts[1:3]),
                                                                                                  'more', greatest(0, cardinality(l.lifts) - 3))) else '[]'::jsonb end
                      || case when l.run is not null then jsonb_build_array(jsonb_build_object('k', 'week', 'run', l.run)) else '[]'::jsonb end
                      || case when l.cyc is not null then jsonb_build_array(jsonb_build_object('k', 'cycle', 'n', l.cyc)) else '[]'::jsonb end,
             'kudos', public.crew_kudos_of(null, l.athlete_id, l.d, v_id)) as j
      from lines l join mem m on m.athlete_id = l.athlete_id),
  post_items as (
    select p.created_at as at, (p.athlete_id = public.coach_note_id() and p.created_at >= now() - interval '24 hours') as pinned,
           jsonb_build_object(
             't', 'post', 'id', p.id, 'who', case when p.athlete_id = public.coach_note_id() then 'Amir' else m.name end,
             'me', p.athlete_id is not distinct from v_id, 'amir', p.athlete_id = public.coach_note_id(),
             'kind', p.kind, 'body', p.body, 'session', p.session, 'photo', p.has_photo,
             'w', ph.w, 'h', ph.h, 'at', p.created_at,
             'pinned', (p.athlete_id = public.coach_note_id() and p.created_at >= now() - interval '24 hours'),
             'left', greatest(0, ceil(extract(epoch from (p.created_at + interval '7 days' - now())) / 86400.0))::int,
             'kudos', public.crew_kudos_of(p.id, null, null, v_id)) as j
      from public.crew_posts p
      left join mem m on m.athlete_id = p.athlete_id
      left join public.crew_photos ph on ph.post_id = p.id
     where p.created_at >= v_from and (p.athlete_id = public.coach_note_id() or m.athlete_id is not null)
     -- pinned first, THEN newest: the limit can never drop Amir's pinned post out of a very busy day
     order by (p.athlete_id = public.coach_note_id() and p.created_at >= now() - interval '24 hours') desc, p.created_at desc
     limit 80)
  select coalesce(jsonb_agg(x.j order by x.pinned desc, x.at desc), '[]'::jsonb) into v_items
    from (select at, pinned, j from post_items union all select at, false, j from line_items) x;

  -- last month's honours, from the 1st to the 14th, crew members only (and only those who keep the honour switch on)
  if extract(day from current_date) <= 14 and exists (select 1 from public.career_honour_months hm where hm.month = v_m0) then
    select jsonb_build_object('month', v_m0, 'rows', coalesce(jsonb_agg(jsonb_build_object('honour', h.honour, 'who', m.name, 'me', h.athlete_id is not distinct from v_id,
                                                                                         'value', h.value - 'slot') order by h.honour, m.name), '[]'::jsonb))
      into v_hon
      from public.career_honours h join public.crew_members() m on m.athlete_id = h.athlete_id
     where h.month = v_m0 and h.honour <> 'near' and coalesce((m.kinds ->> 'honour')::boolean, true);
  end if;

  return jsonb_build_object('athlete_id', v_id, 'me', public.crew_me(v_id), 'items', v_items, 'honours', v_hon, 'kinds', to_jsonb(public.crew_kind_list()),
                            'days', 7, 'at', now());
end $function$;

-- One photo, as base64, for a post the viewer can see (a crew member's or Amir's, within 7 days). Asked only when its card is on screen.
create or replace function public.crew_photo(p_post uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_me text := public.current_athlete_id(); r record;
begin
  if v_me is null and not public.is_coach() then
    raise exception 'not signed in';
  end if;
  select ph.mime, ph.w, ph.h, encode(ph.bytes, 'base64') as b64 into r
    from public.crew_photos ph join public.crew_posts p on p.id = ph.post_id
   where ph.post_id = p_post and p.created_at >= now() - interval '7 days'
     and (p.athlete_id = public.coach_note_id() or public.is_coach() or p.athlete_id = v_me
          or exists (select 1 from public.crew_members() m where m.athlete_id = p.athlete_id));
  if not found then
    return null;
  end if;
  return jsonb_build_object('id', p_post, 'mime', r.mime, 'w', r.w, 'h', r.h, 'b64', replace(r.b64, E'\n', ''));
end $function$;

-- ── 5. The athlete's writes (their own only; never the demo) ───────────────────────────────────────────────────────────────
create or replace function public.crew_who() returns text
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_me text := public.current_athlete_id();
begin
  if v_me is null then raise exception 'crew:signin'; end if;
  if v_me = 'demo' then raise exception 'crew:demo'; end if;
  return v_me;
end $function$;

-- Yes or no, asked on the first visit to Crew, changed any time from the account sheet. A yes keeps a crew name (the board's, else the one the app
-- sends, else first name and initial); the first yes rings "joined the crew"; each new yes starts yes_since. A no takes their posts, their photos,
-- the kudos they gave and their stored rings off the server at once (consent withdrawn); the answer row stays.
create or replace function public.crew_answer(p_answer text, p_name text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.crew_who(); v_ans text := lower(btrim(coalesce(p_answer, ''))); v_name text := left(public.crew_clean(p_name), 24);
begin
  if v_ans not in ('yes', 'no') then raise exception 'crew:answer'; end if;
  insert into public.crew_consent as c (athlete_id, answer, name, answered_at, first_yes_at, yes_since, updated_at)
  values (v_me, v_ans, nullif(v_name, ''), now(), case when v_ans = 'yes' then now() end, case when v_ans = 'yes' then now() end, now())
  on conflict (athlete_id) do update
     set answer = excluded.answer,
         name = coalesce(excluded.name, c.name),
         answered_at = now(),
         first_yes_at = coalesce(c.first_yes_at, excluded.first_yes_at),
         yes_since = case when excluded.answer = 'yes' then case when c.answer = 'yes' then c.yes_since else now() end else null end,
         updated_at = now();
  if v_ans = 'no' then
    delete from public.crew_posts where athlete_id = v_me;
    delete from public.crew_kudos where athlete_id = v_me;
    delete from public.crew_rings where athlete_id = v_me;
  end if;
  return public.crew_me(v_me);
end $function$;

-- A switch per kind of moment. Only the kinds crew_kind_list() names are kept; true or false.
create or replace function public.crew_kinds(p_kinds jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.crew_who(); v_k jsonb;
begin
  if p_kinds is null or jsonb_typeof(p_kinds) <> 'object' then raise exception 'crew:kinds'; end if;
  select coalesce(jsonb_object_agg(k.key, k.value), '{}'::jsonb) into v_k
    from jsonb_each(p_kinds) k where k.key = any (public.crew_kind_list()) and jsonb_typeof(k.value) = 'boolean';
  update public.crew_consent c set kinds = c.kinds || v_k, updated_at = now() where c.athlete_id = v_me;
  if not found then raise exception 'crew:not_asked'; end if;
  return public.crew_me(v_me);
end $function$;

-- The one writer of a post (crew_post() for an athlete, coach_crew_post() for Amir). The photo is base64 of a JPEG the phone made (1280 px on its
-- long side, quality 75, its location data gone with the re-encode); at most 450 KB; at most 3 photos and 10 posts a day for an athlete.
create or replace function public.crew_write_post(p_who text, p_body text, p_photo text, p_w integer, p_h integer, p_kind text, p_session jsonb, p_capped boolean)
returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_body text := public.crew_clean(p_body); v_kind text := coalesce(nullif(btrim(coalesce(p_kind, '')), ''), 'post');
  v_bytes bytea; v_id uuid; v_ses jsonb := null;
begin
  if char_length(v_body) > 280 then raise exception 'crew:too_long'; end if;
  if v_kind not in ('post', 'session') then raise exception 'crew:kind'; end if;
  if nullif(btrim(coalesce(p_photo, '')), '') is not null then
    begin
      v_bytes := decode(regexp_replace(regexp_replace(p_photo, '^data:[^,]*,', ''), '\s', '', 'g'), 'base64');
    exception when others then
      raise exception 'crew:photo_bad';
    end;
    if octet_length(v_bytes) > 450000 then raise exception 'crew:photo_big'; end if;
    if octet_length(v_bytes) < 100 or substring(v_bytes from 1 for 3) <> '\xffd8ff'::bytea then raise exception 'crew:photo_bad'; end if;
  end if;
  if v_bytes is null and v_body = '' then raise exception 'crew:empty'; end if;
  if v_kind = 'session' and v_bytes is null then raise exception 'crew:session_photo'; end if;
  if v_kind = 'session' and p_session is not null and jsonb_typeof(p_session) = 'object' then
    v_ses := jsonb_strip_nulls(jsonb_build_object(
      'day', case when (p_session ->> 'day') ~ '^\d{1,2}$' then (p_session ->> 'day')::int end,
      'n', case when (p_session ->> 'n') ~ '^\d{1,4}$' then (p_session ->> 'n')::int end));
  end if;
  if p_capped then
    perform pg_advisory_xact_lock(hashtext('crew_post:' || p_who));
    if (select count(*) from public.crew_posts cp where cp.athlete_id = p_who and cp.created_at >= date_trunc('day', now())) >= 10 then
      raise exception 'crew:posts_today';
    end if;
    if v_bytes is not null and (select count(*) from public.crew_photos ph where ph.athlete_id = p_who and ph.created_at >= date_trunc('day', now())) >= 3 then
      raise exception 'crew:photos_today';
    end if;
  end if;
  insert into public.crew_posts (athlete_id, kind, body, session, has_photo)
  values (p_who, v_kind, v_body, v_ses, v_bytes is not null) returning id into v_id;
  if v_bytes is not null then
    insert into public.crew_photos (post_id, athlete_id, w, h, bytes)
    values (v_id, p_who, case when p_w between 1 and 4000 then p_w end, case when p_h between 1 and 4000 then p_h end, v_bytes);
  end if;
  return jsonb_build_object('id', v_id);
end $function$;

create or replace function public.crew_post(p_body text, p_photo text default null, p_w integer default null, p_h integer default null,
                                            p_kind text default 'post', p_session jsonb default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.crew_who(); v_out jsonb;
begin
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then
    raise exception 'crew:not_yes';
  end if;
  perform public.crew_sweep();
  v_out := public.crew_write_post(v_me, p_body, p_photo, p_w, p_h, p_kind, p_session, true);
  return v_out || jsonb_build_object('me', public.crew_me(v_me));
end $function$;

-- The author deletes their own post (its photo and kudos go with it); the coach deletes any (coach_crew_remove() says the same).
create or replace function public.crew_delete_post(p_post uuid) returns boolean
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.current_athlete_id();
begin
  if v_me is null and not public.is_coach() then raise exception 'crew:signin'; end if;
  delete from public.crew_posts p where p.id = p_post and (p.athlete_id = v_me or public.is_coach());
  return found;
end $function$;

-- Kudos on or off: p_target is a post's id, or a Bell line's key (crew_key:YYYY-MM-DD). Only a crew member gives kudos (their name shows), never
-- to their own post or line, only to something the crew can see. Pays nothing (GAME-6). Returns the target's kudos as get_bell() shows it.
create or replace function public.crew_kudos(p_target text, p_on boolean default true) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me text := public.crew_who(); v_t text := btrim(coalesce(p_target, '')); v_post uuid; v_to text; v_day date; v_author text;
begin
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then raise exception 'crew:not_yes'; end if;
  if v_t ~ '^[0-9a-f-]{36}$' then
    v_post := v_t::uuid;
    select p.athlete_id into v_author from public.crew_posts p
     where p.id = v_post and p.created_at >= now() - interval '7 days'
       and (p.athlete_id = public.coach_note_id() or exists (select 1 from public.crew_members() m where m.athlete_id = p.athlete_id));
    if v_author is null then raise exception 'crew:gone'; end if;
    if v_author = v_me then raise exception 'crew:own'; end if;
    if p_on then
      insert into public.crew_kudos (athlete_id, post_id) values (v_me, v_post) on conflict do nothing;
    else
      delete from public.crew_kudos k where k.athlete_id = v_me and k.post_id = v_post;
    end if;
    return public.crew_kudos_of(v_post, null, null, v_me);
  end if;
  if v_t !~ '^[0-9a-f-]{36}:\d{4}-\d{2}-\d{2}$' then raise exception 'crew:target'; end if;
  begin
    v_day := split_part(v_t, ':', 2)::date;
  exception when others then raise exception 'crew:target';
  end;
  select m.athlete_id into v_to from public.crew_members() m where m.crew_key = split_part(v_t, ':', 1)::uuid;
  if v_to is null or v_day < current_date - 7 or v_day > current_date + 1 then raise exception 'crew:gone'; end if;
  if v_to = v_me then raise exception 'crew:own'; end if;
  if p_on then
    insert into public.crew_kudos (athlete_id, to_athlete, line_day) values (v_me, v_to, v_day) on conflict do nothing;
  else
    delete from public.crew_kudos k where k.athlete_id = v_me and k.to_athlete = v_to and k.line_day = v_day;
  end if;
  return public.crew_kudos_of(null, v_to, v_day, v_me);
end $function$;

-- ── 6. The coach's (coach.html → Proof → The Bell) ────────────────────────────────────────────────────────────────────────
-- Every post of the last 7 days with its author's id (for Remove), and every athlete's answer and under-13 tick.
create or replace function public.coach_crew() returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  perform public.crew_sweep();
  return jsonb_build_object(
    'posts', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', p.id, 'athlete_id', p.athlete_id, 'amir', p.athlete_id = public.coach_note_id(),
                'who', case when p.athlete_id = public.coach_note_id() then 'Amir'
                            else coalesce((select m.name from public.crew_members() m where m.athlete_id = p.athlete_id), public.crew_default_name(p.athlete_id), p.athlete_id) end,
                'seen', p.athlete_id = public.coach_note_id() or exists (select 1 from public.crew_members() m where m.athlete_id = p.athlete_id),
                'kind', p.kind, 'body', p.body, 'photo', p.has_photo, 'at', p.created_at,
                'kudos', (select count(*) from public.crew_kudos k where k.post_id = p.id)) order by p.created_at desc), '[]'::jsonb)
                from public.crew_posts p),
    'people', (select coalesce(jsonb_agg(jsonb_build_object(
                 'athlete_id', c.athlete_id, 'answer', c.answer, 'under13', c.under13, 'answered_at', c.answered_at,
                 'kinds_off', (select coalesce(jsonb_agg(k.key), '[]'::jsonb) from jsonb_each(c.kinds) k where k.value = 'false'::jsonb)) order by c.athlete_id), '[]'::jsonb)
                 from public.crew_consent c),
    'rings_week', (select count(*) from public.crew_rings r where r.created_at >= now() - interval '7 days'));
end $function$;

create or replace function public.coach_crew_post(p_body text, p_photo text default null, p_w integer default null, p_h integer default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  perform public.crew_sweep();
  return public.crew_write_post(public.coach_note_id(), p_body, p_photo, p_w, p_h, 'post', null, false);
end $function$;

create or replace function public.coach_crew_remove(p_post uuid) returns boolean
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  delete from public.crew_posts p where p.id = p_post;
  return found;
end $function$;

-- Amir's under-13 tick (GAME-9): on, the athlete never posts, never rings and is never named; their posts and stored rings go at once.
create or replace function public.coach_crew_under13(p_athlete text, p_on boolean) returns boolean
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if nullif(btrim(coalesce(p_athlete, '')), '') is null or p_on is null then raise exception 'crew:who'; end if;
  if not exists (select 1 from public.programs p where p.athlete_id = p_athlete) then raise exception 'crew:who'; end if;
  insert into public.crew_consent as c (athlete_id, under13) values (p_athlete, p_on)
  on conflict (athlete_id) do update set under13 = excluded.under13, updated_at = now();
  if p_on then
    delete from public.crew_posts where athlete_id = p_athlete;
    delete from public.crew_kudos where athlete_id = p_athlete;
    delete from public.crew_rings where athlete_id = p_athlete;
  end if;
  return p_on;
end $function$;

-- ── 7. A level that goes up rings (only for a yes; a quiet back-pay sets crew.quiet = 'on' first) ───────────────────────────
-- The score cache (career_scores, written by career_scored() and career_scores_for()) is the one place a level change is seen. An insert is a new
-- or rebuilt cache row and never rings; an update rings only when the career level went UP. A trigger never stops a save: anything that goes wrong
-- is a warning.
create or replace function public.crew_level_ring() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_old integer; v_new integer;
begin
  begin
    if coalesce(current_setting('crew.quiet', true), '') = 'on' then return null; end if;
    v_old := nullif(old.score #>> '{career,level}', '')::integer;
    v_new := nullif(new.score #>> '{career,level}', '')::integer;
    if v_new is not null and v_old is not null and v_new > v_old
       and exists (select 1 from public.crew_consent c where c.athlete_id = new.athlete_id and c.answer = 'yes' and not c.under13) then
      insert into public.crew_rings (athlete_id, kind, ref, value)
      values (new.athlete_id, 'level', v_new::text, jsonb_build_object('n', v_new))
      on conflict do nothing;
    end if;
  exception when others then
    raise warning 'crew: the level ring of % was not written: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_level_ring on public.career_scores;
create trigger crew_level_ring after update of score on public.career_scores
  for each row execute function public.crew_level_ring();

-- ── 8. Grants: signed-in only; the helpers are the service role's ─────────────────────────────────────────────────────────
do $stage81_grants$
declare f text;
begin
  foreach f in array array[
    'public.crew_kind_list()', 'public.crew_clean(text)', 'public.crew_default_name(text)', 'public.crew_members()', 'public.crew_sweep()',
    'public.crew_kudos_of(uuid,text,date,text)', 'public.crew_me(text)', 'public.crew_who()',
    'public.crew_write_post(text,text,text,integer,integer,text,jsonb,boolean)', 'public.crew_level_ring()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array[
    'public.get_bell(text)', 'public.crew_photo(uuid)', 'public.crew_answer(text,text)', 'public.crew_kinds(jsonb)',
    'public.crew_post(text,text,integer,integer,text,jsonb)', 'public.crew_delete_post(uuid)', 'public.crew_kudos(text,boolean)',
    'public.coach_crew()', 'public.coach_crew_post(text,text,integer,integer)', 'public.coach_crew_remove(uuid)', 'public.coach_crew_under13(text,boolean)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end
$stage81_grants$;

-- ── 9. Every hour, the sweep (pg_cron, where the extension exists: the live project yes, a rehearsal no) ─────────────────────
-- The reads and the posts sweep too; this keeps the 7-day promise in a week nobody opens Crew.
do $stage81_cron$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('crew-sweep', '7 * * * *', 'select public.crew_sweep()');
  end if;
end
$stage81_cron$;

-- ── 10. coach_erase_person() learns the five tables, and the kudos given TO the person's Bell lines ─────────────────────────
-- crew_kudos is listed first (the kudos they gave), crew_posts takes their photos and the kudos on their posts with it, and one statement after the
-- loop deletes the kudos others gave to their lines (to_athlete, which the loop's athlete_id cannot see).
do $stage81_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''career_notes'']';
  s_new constant text := '''career_notes'', ''crew_kudos'', ''crew_photos'', ''crew_posts'', ''crew_rings'', ''crew_consent'']';
  a_old constant text := '      -- The rollback copies the pipeline keeps before a one-off change to live programmes sit in the "backup" schema';
  -- Built from chr(10), never from the newlines in THIS file: a Windows checkout turns the file's own line endings into CRLF, and the way back
  -- (run from a file with the other ending) would then not find what this inserted, leaving behind a delete of a table it had just dropped, so
  -- every erasure after it would fail. Both files build this text the same way, so the two can never drift.
  a_new constant text := concat_ws(chr(10),
    '      -- stage81: the kudos others gave to this person''s Bell lines (crew_kudos.to_athlete; the loop above deleted the ones they gave).',
    '      delete from public.crew_kudos where to_athlete = v_key;',
    '      get diagnostics v_n = row_count;',
    '      v_counts := v_counts || jsonb_build_object(''crew_kudos (to them)'', v_n);',
    '      v_total := v_total + v_n;',
    '', '') || a_old;
  n integer; m integer;
begin
  if position(s_new in d) > 0 then
    return;   -- already patched (a re-run)
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  m := (length(d) - length(replace(d, a_old, ''))) / length(a_old);
  if n <> 1 or m <> 1 then
    raise exception 'stage81: coach_erase_person() is not what this patch expects (the end of its table list found % times, the backup-schema comment % times, not once each). Nothing was changed.', n, m;
  end if;
  execute replace(replace(d, s_old, s_new), a_old, a_new);
end $stage81_patch$;
