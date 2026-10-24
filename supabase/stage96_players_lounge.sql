-- stage96_players_lounge.sql — the Players' Lounge: a page per crew member, a face, a cheer that rings, names on an achievement, @mentions (2026-10-24)
--
-- Amir, on the Ladder app's screens: "I want to grow the crew, into a bigger thing, adding profile, letting people interact more". Round 6 of the
-- ideas: he picked a Player Page (#55), Your Face (#56), Plays (#57), the Cycle Grid (#58), Well Played, now "Cheer" (#59), Signed Ball (#60),
-- Call Out (#64) and the posts' Proof Stamp (#66) for the server side of this file. His five changes to the plan that shape it:
--   · "your game should be in a way, that is applicable to all racket sports, and general people as well": the profile (athlete_profile) names
--     seven racket sports, asks backhand only where it means something, and has a "trains for" list for people who play none.
--   · "i like week bars idea, but the workouts, can be anything other than their cycles, they can do extra, it needs to show that as well": the
--     cycle grid counts a plan day once and shows everything past the plan as extra.
--   · "for signed ball, i like face stack a bit more": crew_page() hands back who signed an achievement as faces (ck + fv), not a names line.
--   · "i want the well played button to be changed to something more understandable": it is a cheer here (crew_cheer, kind 'cheer').
--   · "i want all of this to be built first, when we are all done, then we go live": this file is written and rehearsed, NOT applied. One
--     release at the end, in the order of C:\Users\Amir\AA-Lounge\GO-LIVE.md.
-- Rules it keeps (C:\Users\Amir\AA-Lounge\CONTRACT.md section 0): GAME-9 the crew sees only what the athlete agreed to show; GAME-6 social
-- actions pay nothing (no XP, no fact, no award, nothing in the scorer); push.md a notification carries a NAME and a KIND, never content;
-- leaving means gone; an athlete under 13 reads only; the phone only ever sees a crew_key (ck) for another person, never an id.
--
-- What this adds, and nothing else:
--   1. Five tables. Every write goes through a function; nobody writes a table directly (RLS on, no client grant), except that the coach READS
--      athlete_profile (a policy, so the weekly backup is complete).
--        athlete_profile   "Your game": sports (seven racket sports, or none), hand, backhand, padel side, plays at, club, trains for, one working-on
--                          line, an Instagram name. COACHING DATA: kept for good, in BACKUP_TABLES, the snapshot and coach_erase_person().
--        crew_faces        one 256 px JPEG per member (at most 60 KB). Gone when they leave the crew. NOT in BACKUP_TABLES (Amir's pick: like post photos).
--        crew_cheers       who cheered whom, once a day, with a word of up to 100 characters. The word lives 7 days; the row (the season's count) 400.
--        crew_award_likes  who liked an achievement's Bell line, kept on the achievement past the 7-day sweep (Signed Ball).
--        crew_mentions     who was @mentioned in which reply (the token is in the reply's body; this is what rings).
--      The last four are LEFT OUT of BACKUP_TABLES (scripts/restore/restore_backup.py SHORT_LIVED) and are in coach_erase_person()'s list, each
--      with an extra delete for the column that names ANOTHER person (to_athlete), which the erase function's athlete_id scan cannot see.
--   2. get_bell() learns who is who: crew[] and the board gain ck, fv, lv, held, new; posts, lines, replies, honours and the Open board gain
--      ck and/or fv. Everything is added beside what was there. The new fields are stable (they change only when a face, a level, a held week or a
--      join does), so get_bell_if_new keeps answering in 78 bytes.
--   3. crew_page(): another member's page (or your own), only what that person's switches allow, assembled from rows. It calls nothing that
--      writes or rings (not get_profile, not career_scored, not crew_board). The four numbers are career_rewards_profile()'s own `four`, the same
--      function get_profile() takes them from, so the Scorecard and the page cannot disagree.
--   4. The cheer (crew_cheer, coach_cheer), the face (crew_face_set / clear / get), the game (my_game_set), the signatures (written by crew_kudos),
--      the mentions (validated by crew_reply), the proof stamp (crew_post's session now keeps title, mins and held).
--   5. Push: three AIMED kinds, cheer, reply and mention. An aimed event goes to its target's phones only, is never counted in "N new things",
--      and names the sender. The crew_push_fold below returns ONE row per phone (push-send groups rows by athlete, kind and day and sends the first
--      row's words to every phone in the group, so a second row for the same person would be lost): an aimed event wins the tick over the folded
--      broadcast, naming its sender; the broadcasts it was sent with are told as told (the Bell holds them for 7 days).
--   6. Leaving means gone: crew_forget() takes a person's face, cheers (both ways), signatures (both ways) and mentions (both ways) off the server.
--      crew_answer('no'), coach_crew_under13(true) and a trigger on athlete_status ('former') all call it.
--   7. coach_erase_person() learns the five tables (patched in place, as stage81/86/92 did it).
--   8. A bug found on the way (stage86): crew_push_due() raised "ON CONFLICT DO UPDATE command cannot affect row a second time" for any athlete
--      with TWO subscribed phones, which would have stopped every crew notification (and the hourly reminders, push-send returns 500 first).
--      Nobody has two phones yet (7 phones, 7 athletes). It is fixed here, in the one function this stage already had to touch the neighbours of.
--
-- What it never does: pay XP or write a fact for any social action; put a weight, an RPE, a check-in answer, pain, body weight, a habit, a broken
-- week or a comeback on ANY page but your own (comebacks only on your own page); put the words of a cheer, a reply or a mention on a lock screen;
-- show another person's page to an athlete who is not in the crew, or to anyone, for a person who is not; change get_bell_if_new's contract.
--
-- ⚠️ SEVERAL FUNCTIONS ARE REPLACED, NOT PATCHED. Each one is the LIVE definition (pg_get_functiondef on 2026-10-24) plus the lines marked
-- `stage96`. Before any of them is overwritten the guard below compares the live text with the text this file was written against (md5 with the
-- carriage returns taken out, which is what a Windows checkout would change) and REFUSES, naming the function, if somebody changed it since.
-- get_bell() and coach_erase_person() are long and change in a few lines, so they are patched in place instead: pg_get_functiondef -> replace()
-- with SINGLE-LINE anchors, each checked to occur exactly once, with an "already patched" early return. coach_erase_person()'s live body mixes
-- CRLF and LF line endings, so every multi-line insert is built from chr(10), never from this file's own newlines.
--
-- Rehearsed on PGlite: scripts/career/rehearse_lounge.mjs (the schema snapshot, made-up athletes, the stage twice, every function, the way back),
-- scripts/push/rehearse_crew_push.mjs (the aimed cheer, reply and mention, and the two-phone fix), and once on the live database inside a DO block
-- that ends in `raise exception`, so nothing stayed. The way back: scripts/career/rollback_stage96.sql (puts every function back to the text this
-- file started from, drops the tables, takes the patches out). Safe to re-run this file.

-- ── 0. The guard: what this reads must be there, and what it overwrites must be what it was written against ──────────────────────
do $stage96_guard$
declare r record; d text;
begin
  if to_regprocedure('public.get_bell(text)') is null or to_regprocedure('public.crew_members()') is null
     or to_regprocedure('public.crew_reply_rows(uuid,text)') is null or to_regclass('public.crew_replies') is null then
    raise exception 'stage96: Crew, the Bell and the replies are missing (stages 81 to 92 first). Nothing was changed.';
  end if;
  if to_regclass('public.crew_push_q') is null or to_regprocedure('public.crew_push_fold(timestamptz)') is null then
    raise exception 'stage96: the crew notifications are missing (stage86 first). Nothing was changed.';
  end if;
  if to_regprocedure('public.coach_erase_person(text,text,text,uuid[],boolean)') is null then
    raise exception 'stage96: coach_erase_person() is missing. Nothing was changed.';
  end if;
  if to_regprocedure('public.career_rewards_profile(text,jsonb)') is null or to_regprocedure('public.career_weeks(text)') is null
     or to_regprocedure('public.career_day(text)') is null or to_regprocedure('public.career_num(jsonb)') is null
     or to_regclass('public.career_scores') is null or to_regclass('public.career_awards') is null or to_regclass('public.career_honour_months') is null then
    raise exception 'stage96: Career Mode is missing (stages 66 to 80 first). Nothing was changed.';
  end if;
  if to_regclass('public.athlete_status') is null or to_regclass('public.leaderboard_optin') is null or to_regclass('public.library_sessions') is null then
    raise exception 'stage96: athlete_status, leaderboard_optin or library_sessions is missing. Nothing was changed.';
  end if;
  -- the functions this file overwrites whole: refuse if the live text is not the one it started from (or is already this stage's)
  for r in select * from (values
      ('public.crew_me(text)',                                        '352eb66a581a25e0c56ad07c5fe8af71'),
      ('public.crew_reply_rows(uuid,text)',                           '28c863c1c3e676b737df5340109b1b97'),
      ('public.crew_open_now(text)',                                  '994aae21386e9e3cd25b440ea685e8be'),
      ('public.crew_board(integer)',                                  '88beeaa8db14ce416726d6e11c8359eb'),
      ('public.crew_kudos(text,boolean,text)',                        '7c89f7b1be9ff1a347f41baf5bb3e62e'),
      ('public.crew_reply(uuid,text)',                                'b72abfde542dcb9129eb6132eb43ea65'),
      ('public.crew_answer(text,text)',                               '11eb97e72761fac39f4e7e930ec7c374'),
      ('public.coach_crew_under13(text,boolean)',                     'c7513fc6acebe8bedd95e4e42f15b567'),
      ('public.crew_sweep()',                                         '23813824456e753f5c5bd5c598263d31'),
      ('public.crew_write_post(text,text,text,integer,integer,text,jsonb,boolean,uuid)', '40f88231d6f949abe0b8ae5e31587edb'),
      ('public.crew_push_fold(timestamptz)',                          'a9dd7ffa48329527e6466ed99c90fd45'),
      ('public.crew_push_words(integer,text,text,boolean,text)',      'bafccbf4a320de51f4ba932131d82867'),
      ('public.crew_push_due(timestamptz,boolean)',                   'f8ea3f1d7a5babcd0304085ccc6b1e67')
    ) v(sig, md5) loop
    if to_regprocedure(r.sig) is null then
      raise exception 'stage96: % is missing. Nothing was changed.', r.sig;
    end if;
    d := pg_get_functiondef(to_regprocedure(r.sig));
    if position('stage96' in d) = 0 and md5(replace(d, chr(13), '')) <> r.md5 then
      raise exception 'stage96: % is not the text this file was written against (md5 %, expected %). Somebody changed it since 2026-10-24: read the live definition, merge the change into this file, and run it again. Nothing was changed.',
        r.sig, md5(replace(d, chr(13), '')), r.md5;
    end if;
  end loop;
end
$stage96_guard$;

-- ── 1. Tables ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- "Your game": every racket sport, and people who play none. Empty sports = plays none. Backhand means something for tennis, pickleball and beach
-- tennis, side for the doubles sports (padel, pickleball, beach tennis): the app asks only then, the table accepts it for anyone.
create table if not exists public.athlete_profile (
  athlete_id   text        primary key,
  sports       text[]      not null default '{}',
  hand         text,
  backhand     text,
  side         text,
  plays_at     text,
  club         text,
  training_for text[]      not null default '{}',
  working_on   text,
  ig           text,
  updated_at   timestamptz not null default now(),
  constraint athlete_profile_sports check (sports <@ array['tennis', 'padel', 'squash', 'badminton', 'pickleball', 'table_tennis', 'beach_tennis']::text[] and cardinality(sports) <= 7),
  constraint athlete_profile_hand check (hand is null or hand in ('right', 'left')),
  constraint athlete_profile_backhand check (backhand is null or backhand in ('one', 'two')),
  constraint athlete_profile_side check (side is null or side in ('right', 'left', 'both')),
  constraint athlete_profile_plays_at check (plays_at is null or plays_at in ('fun', 'club', 'competition')),
  constraint athlete_profile_club check (club is null or char_length(club) between 1 and 40),
  constraint athlete_profile_training check (training_for <@ array['competition', 'strength', 'fitness', 'physique', 'running', 'health']::text[] and cardinality(training_for) <= 6),
  constraint athlete_profile_working check (working_on is null or char_length(working_on) between 1 and 60),
  constraint athlete_profile_ig check (ig is null or ig ~ '^[A-Za-z0-9._]{1,30}$')
);

-- One face per member: a small JPEG (256 px square made on the phone), a row not a Storage file (a Storage object cannot be deleted from SQL).
create table if not exists public.crew_faces (
  athlete_id text        primary key,
  mime       text        not null default 'image/jpeg' check (mime = 'image/jpeg'),
  w          integer     not null check (w between 64 and 512),
  h          integer     not null check (h between 64 and 512),
  bytes      bytea       not null check (octet_length(bytes) between 100 and 60000),
  updated_at timestamptz not null default now()
);

-- A cheer to a person (not to a post): once a day per giver and person (the server's UTC day), an optional word. '__coach__' is Amir as giver.
create table if not exists public.crew_cheers (
  id         bigint      generated always as identity primary key,
  athlete_id text        not null,                                     -- the giver; coach_note_id() for Amir
  to_athlete text        not null,
  day        date        not null,
  word       text        check (word is null or char_length(word) between 1 and 100),
  created_at timestamptz not null default now(),
  constraint crew_cheers_not_self check (athlete_id <> to_athlete),
  constraint crew_cheers_once_a_day unique (athlete_id, to_athlete, day)
);
create index if not exists crew_cheers_to_idx on public.crew_cheers (to_athlete, day);
create index if not exists crew_cheers_day_idx on public.crew_cheers (day);

-- Signed Ball: who liked an achievement's Bell line. Kept past the 7-day sweep on purpose (Amir's pick); gone when either person leaves.
create table if not exists public.crew_award_likes (
  athlete_id text        not null,                                     -- who liked
  to_athlete text        not null,                                     -- whose achievement
  award_id   text        not null,                                     -- career_awards.award_id, e.g. 'achievement:back_to_back'
  created_at timestamptz not null default now(),
  primary key (athlete_id, to_athlete, award_id)
);
create index if not exists crew_award_likes_to_idx on public.crew_award_likes (to_athlete, award_id);

-- @mentions: the token is in the reply's body (@[<crew_key>|<name>]); this row is what rings the person. It dies with its reply.
create table if not exists public.crew_mentions (
  reply_id   uuid        not null references public.crew_replies (id) on delete cascade,
  athlete_id text        not null,                                     -- the author of the reply
  to_athlete text        not null,
  created_at timestamptz not null default now(),
  primary key (reply_id, to_athlete)
);
create index if not exists crew_mentions_to_idx on public.crew_mentions (to_athlete);
create index if not exists crew_mentions_who_idx on public.crew_mentions (athlete_id);

-- ── 2. Policies and grants: nothing is writable directly; the coach reads the profile so the backup is complete ──────────────────
do $stage96_policies$
declare t text;
begin
  foreach t in array array['athlete_profile', 'crew_faces', 'crew_cheers', 'crew_award_likes', 'crew_mentions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'athlete_profile' and policyname = 'coach reads athlete profile') then
    create policy "coach reads athlete profile" on public.athlete_profile for select to authenticated using ((select public.is_coach()));
  end if;
  grant select on table public.athlete_profile to authenticated;
end
$stage96_policies$;

-- ── 3. Helpers (the service role's only; the Bell and the page call them) ───────────────────────────────────────────────────────
-- The version of a member's face: the second it was last set. It is the phone's cache key (/__crew-face/<ck>-<fv>), so it changes only when the
-- picture does, and null means no face.
create or replace function public.crew_face_v(p_athlete text) returns bigint
language sql stable set search_path to 'public' as $function$
  select extract(epoch from f.updated_at)::bigint from public.crew_faces f where f.athlete_id = p_athlete
$function$;

-- A level, read from the score cache and never worked out here (a read must not move the cache, and the cache write rings).
create or replace function public.crew_lv(p_athlete text) returns integer
language sql stable set search_path to 'public' as $function$
  select case when (s.score #>> '{career,level}') ~ '^\d{1,4}$' then (s.score #>> '{career,level}')::int end
    from public.career_scores s where s.athlete_id = p_athlete
$function$;

-- The cycle week that today falls in: a TWIN of career_weeks() for the one row the Bell needs, at a fiftieth of its cost (career_weeks takes about
-- 30 ms an athlete, and get_bell asks for nine every 30 seconds on every open phone). Same arithmetic: the current cycle's startDate + 7 * (k - 1)
-- to the lesser of startDate + 7 * k - 1 and endDate, k up to round((end - start) / 7) and at least 1, only while the cycle has days to train.
-- scripts/career/rehearse_lounge.mjs holds this equal to career_weeks() for several made-up programmes: change one, change both.
create or replace function public.crew_now_week(p_athlete text) returns table (cycle_num integer, week integer)
language sql stable set search_path to 'public' as $function$
  with p as (select pr.data from public.programs pr where pr.athlete_id = p_athlete),
  cur as (
    select p.data,
           case when jsonb_typeof(p.data -> 'currentCycleIndex') = 'number'
                     and public.career_num(p.data -> 'currentCycleIndex') = trunc(public.career_num(p.data -> 'currentCycleIndex'))
                then public.career_num(p.data -> 'currentCycleIndex')::int else 0 end as cci
      from p),
  c as (
    select coalesce(case when public.career_num(x.c -> 'num') = trunc(public.career_num(x.c -> 'num')) then public.career_num(x.c -> 'num')::int end, x.o::int) as num,
           public.career_day(x.c ->> 'startDate') as s, public.career_day(x.c ->> 'endDate') as e, cur.data
      from cur, jsonb_array_elements(case when jsonb_typeof(cur.data -> 'cycles') = 'array' then cur.data -> 'cycles' else '[]'::jsonb end) with ordinality x(c, o)
     where x.o - 1 = cur.cci)
  select c.num, k::int
    from c
   cross join lateral (select greatest(1, round((c.e - c.s) / 7.0)::int) as tot) t
   cross join lateral generate_series(1, t.tot) k
   where c.s is not null and c.e is not null and c.e >= c.s
     and jsonb_typeof(c.data -> 'workouts' -> 'days') = 'array' and jsonb_array_length(c.data -> 'workouts' -> 'days') > 0
     and current_date between c.s + 7 * (k - 1) and least(c.s + 7 * k - 1, c.e)
$function$;

-- Has this person held the plan week they are in? A week_held fact for that cycle and week (its day is the day the last missing plan day was
-- first done); with p_since, only if that day is on or after their latest yes (the by-day consent rule of stage91).
create or replace function public.crew_held_now(p_athlete text, p_since date) returns boolean
language sql stable set search_path to 'public' as $function$
  select exists (
    select 1 from public.crew_now_week(p_athlete) w
      join public.career_facts f on f.athlete_id = p_athlete and f.kind = 'week_held' and f.void_at is null
                                and f.ref = 'c' || w.cycle_num || '|w' || w.week
                                and f.day >= coalesce(p_since, f.day))
$function$;

-- What a crew[] row gains beside ck and fv: lv (their level, while their `level` switch is on), held (true, while their `week` switch is on) and
-- new (true for 7 days after they joined). A key that does not apply is absent. The viewer's own row ignores the switches (it is theirs).
create or replace function public.crew_extra(p_athlete text, p_kinds jsonb, p_yes timestamptz, p_first timestamptz, p_viewer text) returns jsonb
language sql stable set search_path to 'public' as $function$
  select coalesce(jsonb_strip_nulls(jsonb_build_object(
           'lv', case when p_athlete is not distinct from p_viewer or coalesce((p_kinds ->> 'level')::boolean, true) then public.crew_lv(p_athlete) end,
           'held', case when p_athlete is not distinct from p_viewer then (case when public.crew_held_now(p_athlete, null) then true end)
                        when coalesce((p_kinds ->> 'week')::boolean, true) then (case when public.crew_held_now(p_athlete, (p_yes at time zone 'UTC')::date) then true end) end,
           'new', case when p_first >= now() - interval '7 days' then true end)), '{}'::jsonb)
$function$;

-- The first day of the season a person's cheers are counted in: the cache's own season start, else the first of this month.
create or replace function public.crew_season_start(p_athlete text) returns date
language sql stable set search_path to 'public' as $function$
  select coalesce((select case when (s.score #>> '{season,starts_on}') ~ '^\d{4}-\d{2}-\d{2}$' then (s.score #>> '{season,starts_on}')::date end
                     from public.career_scores s where s.athlete_id = p_athlete),
                  date_trunc('month', current_date)::date)
$function$;

-- Cheers received this season, from people still in the crew (and Amir).
create or replace function public.crew_cheer_count(p_athlete text) returns integer
language sql stable set search_path to 'public' as $function$
  select count(*)::int from public.crew_cheers c
   where c.to_athlete = p_athlete and c.day >= public.crew_season_start(p_athlete)
     and (c.athlete_id = public.coach_note_id() or exists (select 1 from public.crew_members() m where m.athlete_id = c.athlete_id))
$function$;

-- "Your game" as the page and my_game_set() show it: a key whose value is null is absent, the two lists are always there. Null: no row.
create or replace function public.crew_game_of(p_athlete text) returns jsonb
language sql stable set search_path to 'public' as $function$
  select jsonb_strip_nulls(jsonb_build_object(
           'sports', to_jsonb(g.sports), 'hand', g.hand, 'backhand', g.backhand, 'side', g.side, 'plays_at', g.plays_at,
           'club', g.club, 'training_for', to_jsonb(g.training_for), 'working_on', g.working_on, 'ig', g.ig))
    from public.athlete_profile g where g.athlete_id = p_athlete
$function$;

-- Leaving means gone (CONTRACT section 0): a face, the cheers a person gave and got, the names on achievements they signed and the names signed on
-- theirs, the mentions they made and the ones of them. Their game (athlete_profile) STAYS: it is coaching data, only hidden.
create or replace function public.crew_forget(p_athlete text) returns void
language plpgsql security definer set search_path to 'public' as $function$
begin
  delete from public.crew_faces where athlete_id = p_athlete;
  delete from public.crew_cheers where athlete_id = p_athlete or to_athlete = p_athlete;
  delete from public.crew_award_likes where athlete_id = p_athlete or to_athlete = p_athlete;
  delete from public.crew_mentions where athlete_id = p_athlete or to_athlete = p_athlete;
end $function$;

-- ── 4. The Bell and the board learn who is who ─────────────────────────────────────────────────────────────────────────────────
-- get_bell(), patched in place. Five anchors, each a single line of the live text and each found exactly once (stage81 + 82 + 85 + 91 + 92 as live).
-- Every replacement is ONE line too, so the way back finds exactly what this put in, whichever line endings the file it is run from has.
--   post item  : ck and fv of the author (none for Amir)         line item : fv (its ck is already in `key`)
--   honours row: ck                                               crew[]    : ck, fv, and lv / held / new where they apply
--   top level  : "lounge": 1, always, which is how the app knows this server has stage96 (me.ck and me.fv may be null, so they cannot tell it)
do $stage96_bell$
declare
  d text := pg_get_functiondef('public.get_bell(text)'::regprocedure);
  a text[] := array[
    $a1$'kudos', public.crew_kudos_of(p.id, null, null, v_id), 'replies', public.crew_reply_rows(p.id, v_id)) as j$a1$,
    $a2$'kudos', public.crew_kudos_of(null, l.athlete_id, l.d, v_id)) as j$a2$,
    $a3$'value', h.value - 'slot') order by h.honour, m.name)$a3$,
    $a4$'since', (m.first_yes_at at time zone 'UTC')::date)$a4$,
    $a5$'week', v_week, 'crew', v_crew, 'at', now());$a5$];
  b text[] := array[
    $b1$'kudos', public.crew_kudos_of(p.id, null, null, v_id), 'replies', public.crew_reply_rows(p.id, v_id)) || case when m.athlete_id is not null then jsonb_build_object('ck', m.crew_key, 'fv', public.crew_face_v(m.athlete_id)) else '{}'::jsonb end as j$b1$,
    $b2$'kudos', public.crew_kudos_of(null, l.athlete_id, l.d, v_id), 'fv', public.crew_face_v(l.athlete_id)) as j$b2$,
    $b3$'value', h.value - 'slot', 'ck', m.crew_key) order by h.honour, m.name)$b3$,
    $b4$'since', (m.first_yes_at at time zone 'UTC')::date, 'ck', m.crew_key, 'fv', public.crew_face_v(m.athlete_id)) || public.crew_extra(m.athlete_id, m.kinds, m.yes_since, m.first_yes_at, v_id)$b4$,
    $b5$'week', v_week, 'crew', v_crew, 'lounge', 1, 'at', now());$b5$];
  i integer; n integer;
begin
  if position('crew_face_v' in d) > 0 then
    raise notice 'stage96: get_bell already carries ck and fv, left alone';
    return;
  end if;
  for i in 1 .. array_length(a, 1) loop
    n := (length(d) - length(replace(d, a[i], ''))) / length(a[i]);
    if n <> 1 then
      raise exception 'stage96: get_bell() is not what this patch expects (anchor % found % times, not once). Nothing was changed.', i, n;
    end if;
  end loop;
  for i in 1 .. array_length(a, 1) loop
    d := replace(d, a[i], b[i]);
  end loop;
  execute d;
end
$stage96_bell$;

-- crew_me(): the viewer's own crew key and face version join their answer (what the Bell calls `me`).
create or replace function public.crew_me(p_id text) returns jsonb
language sql stable set search_path to 'public' as $function$
  -- stage96: ck and fv
  select case when p_id is null then null else jsonb_build_object(
    'answer', c.answer,
    'kinds', (select jsonb_object_agg(k.kind, coalesce((c.kinds ->> k.kind)::boolean, true)) from unnest(public.crew_kind_list()) k(kind)),
    'name', coalesce((select nullif(btrim(o.display_name), '') from public.leaderboard_optin o where o.athlete_id = p_id), c.name, public.crew_default_name(p_id)),
    'on_board', exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_id),
    'under13', coalesce(c.under13, false),
    'can_post', coalesce(c.answer = 'yes' and not c.under13, false) and p_id <> 'demo'
                and not exists (select 1 from public.athlete_status s where s.athlete_id = p_id and s.status = 'former'),
    'photos_left', greatest(0, 3 - (select count(*) from public.crew_photos ph where ph.athlete_id = p_id and ph.created_at >= date_trunc('day', now()))),
    'posts_left', greatest(0, 10 - (select count(*) from public.crew_posts cp where cp.athlete_id = p_id and cp.created_at >= date_trunc('day', now()))),
    'ck', c.crew_key,
    'fv', public.crew_face_v(p_id))
  end
  from (select 1) one left join public.crew_consent c on c.athlete_id = p_id
$function$;

-- crew_board(): the season board gains ck and fv beside each row. The return type changes, so the old shape goes first.
drop function if exists public.crew_board(integer);
create function public.crew_board(p_limit integer default 25)
returns table (pos integer, who text, points bigint, level integer, is_me boolean, ck uuid, fv bigint)
language plpgsql security definer set search_path to 'public' as $function$
-- stage96: ck and fv
declare
  v_me text := public.current_athlete_id();
  v_coach boolean := public.is_coach();
  v_report boolean := coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role');
begin
  if v_me is null and not (v_coach or v_report) then
    raise exception 'not signed in';
  end if;
  return query
  with mem as (select * from public.crew_members()),
  sc as (
    select s.athlete_id as aid, s.score
      from public.career_scores_for((select array_agg(m.athlete_id) from mem m), interval '2.5 seconds') s
  ),
  scored as (
    select m.athlete_id as aid, m.name, m.crew_key as ckey,
           coalesce((sc.score #>> '{season,points}')::bigint, 0) as x,
           coalesce((sc.score #>> '{career,level}')::int, 1) as lv
      from mem m left join sc on sc.aid = m.athlete_id
  ),
  ranked as (
    select row_number() over (order by s.x desc, lower(s.name) asc) as rn, s.*
      from scored s
  )
  select r.rn::int, r.name, r.x, r.lv, (r.aid is not distinct from v_me), r.ckey, public.crew_face_v(r.aid)
    from ranked r
   where r.rn <= greatest(1, p_limit) or r.aid is not distinct from v_me
   order by r.rn;
end $function$;

-- crew_open_now(): each name on the Monthly Open board carries ck and fv.
create or replace function public.crew_open_now(p_viewer text default null) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
-- stage96: ck and fv on each board row
declare o record; v_rows jsonb; v_me jsonb;
begin
  select * into o from public.crew_open where closed_at is null order by created_at desc limit 1;
  if not found then return null; end if;

  with mem as (select * from public.crew_members()),
  r as (
    select res.athlete_id, res.value, res.day, m.name, m.crew_key
      from public.crew_open_results res join mem m on m.athlete_id = res.athlete_id
     where res.open_id = o.id),
  ranked as (
    select r.*, rank() over (order by case when o.better = 'low' then r.value else -r.value end) as place from r)
  select coalesce(jsonb_agg(jsonb_build_object('who', ranked.name, 'value', ranked.value, 'place', ranked.place,
                                               'me', ranked.athlete_id is not distinct from p_viewer,
                                               'ck', ranked.crew_key, 'fv', public.crew_face_v(ranked.athlete_id))
                            order by ranked.place, ranked.name), '[]'::jsonb)
    into v_rows from ranked;

  select jsonb_build_object('value', res.value, 'day', res.day) into v_me
    from public.crew_open_results res where res.open_id = o.id and res.athlete_id is not distinct from p_viewer;

  return jsonb_build_object('id', o.id, 'title', o.title, 'how', o.how, 'unit', o.unit, 'better', o.better,
                            'opened_on', o.opened_on, 'board', v_rows, 'mine', v_me);
end $function$;

-- crew_reply_rows(): the author's ck and fv (none for Amir), and the members a reply @mentions (the body keeps the tokens; the app draws them).
create or replace function public.crew_reply_rows(p_post uuid, p_viewer text) returns jsonb
language sql stable set search_path to 'public' as $function$
  -- stage96: ck, fv and mentions
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id,
           'who', case when r.athlete_id = public.coach_note_id() then 'Amir' else m.name end,
           'me', r.athlete_id is not distinct from p_viewer,
           'amir', r.athlete_id = public.coach_note_id(),
           'body', r.body,
           'at', r.created_at)
           || case when m.athlete_id is not null then jsonb_build_object('ck', m.crew_key, 'fv', public.crew_face_v(m.athlete_id)) else '{}'::jsonb end
           || coalesce((select jsonb_build_object('mentions', jsonb_agg(jsonb_build_object('ck', mm.crew_key, 'who', mm.name, 'fv', public.crew_face_v(mm.athlete_id)) order by mm.name))
                          from public.crew_mentions cm join public.crew_members() mm on mm.athlete_id = cm.to_athlete
                         where cm.reply_id = r.id having count(*) > 0), '{}'::jsonb)
           order by r.created_at), '[]'::jsonb)
    from public.crew_replies r
    left join public.crew_members() m on m.athlete_id = r.athlete_id
   where r.post_id = p_post
     and (r.athlete_id = public.coach_note_id() or m.athlete_id is not null)
$function$;

-- ── 5. The Player Page ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- crew_page(p_subject, p_athlete_id): one person's page, assembled from rows. p_subject is their crew_key (null = your own page, which any
-- signed-in athlete may read, a member or not, under 13 or not: it is Your page and the join question's preview). Another person's page needs
-- you in the crew (crew:not_yes) and them in it (crew:gone: a no, an under-13, a former athlete and the demo are all simply gone). p_athlete_id is
-- the preview: honoured for the coach and the service role only, as get_bell() does. A block of another person's page follows THEIR switch in
-- crew_consent.kinds (a kind not named is on): sessions, the cycle and "with Amir since" -> session; weeks held -> week; bests (the lift, never
-- the weight) -> best; level -> level; achievements -> achievement; honours -> honour. Comebacks, and the minutes of a session, only on your own page.
-- Nothing here writes, rings or recomputes: it reads career_scores, career_facts, career_awards, career_honours, the crew tables, athlete_profile
-- and programs, and asks career_rewards_profile() (read-only, STABLE) for the four numbers, the very function get_profile() takes them from.
create or replace function public.crew_page(p_subject uuid default null, p_athlete_id text default null) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
-- stage96
declare
  v_me text := public.current_athlete_id();
  v_coach boolean := public.is_coach();
  v_report boolean := coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role');
  v_view text := nullif(btrim(coalesce(p_athlete_id, '')), '');
  v_id text;                -- whose eyes the page is read with
  v_judge boolean;          -- must that person be in the crew? (not the coach reading as himself, not a report)
  v_ownkey uuid; v_subj text; v_own boolean;
  s record; c record;       -- the subject among crew_members(), and their consent row
  v_member boolean; v_kinds jsonb; v_joined date;
  v_s_session boolean; v_s_week boolean; v_s_best boolean; v_s_level boolean; v_s_ach boolean; v_s_hon boolean;
  v_who text; v_since date; v_art text; v_four jsonb; v_num jsonb := '{}'::jsonb; v_free boolean := false;
  v_giver text; v_cheers jsonb; v_ach jsonb; v_hon jsonb; v_best jsonb; v_cycle jsonb; v_ref jsonb; v_lv integer; v_out jsonb;
begin
  -- who is asking, and for whose eyes
  if v_view is not null and v_view is distinct from v_me and not (v_coach or v_report) then
    raise exception 'not your page';
  end if;
  v_id := coalesce(v_view, v_me);
  if v_id is null and not (v_coach or v_report) then
    raise exception 'not signed in';
  end if;
  v_judge := (not (v_coach or v_report)) or (v_coach and v_view is not null);
  if v_id is not null then
    select cc.crew_key into v_ownkey from public.crew_consent cc where cc.athlete_id = v_id;
  end if;

  -- whose page
  if p_subject is null or p_subject is not distinct from v_ownkey then
    v_own := true; v_subj := v_id;
    if v_subj is null then raise exception 'crew:who'; end if;
  else
    v_own := false;
    if v_judge and not exists (select 1 from public.crew_members() m where m.athlete_id = v_id) then
      raise exception 'crew:not_yes';
    end if;
    select m.athlete_id into v_subj from public.crew_members() m where m.crew_key = p_subject;
    if v_subj is null then raise exception 'crew:gone'; end if;
  end if;
  select m.* into s from public.crew_members() m where m.athlete_id = v_subj;
  v_member := found;
  select cc.* into c from public.crew_consent cc where cc.athlete_id = v_subj;

  -- their switches (a kind not named is on); your own page shows you everything
  v_kinds := case when v_member then coalesce(s.kinds, '{}'::jsonb) else '{}'::jsonb end;
  v_s_session := v_own or coalesce((v_kinds ->> 'session')::boolean, true);
  v_s_week := v_own or coalesce((v_kinds ->> 'week')::boolean, true);
  v_s_best := v_own or coalesce((v_kinds ->> 'best')::boolean, true);
  v_s_level := v_own or coalesce((v_kinds ->> 'level')::boolean, true);
  v_s_ach := v_own or coalesce((v_kinds ->> 'achievement')::boolean, true);
  v_s_hon := v_own or coalesce((v_kinds ->> 'honour')::boolean, true);
  if v_member then v_joined := (s.yes_since at time zone 'UTC')::date; end if;

  v_who := case when v_member then s.name
                else coalesce((select nullif(btrim(o.display_name), '') from public.leaderboard_optin o where o.athlete_id = v_subj),
                              c.name, public.crew_default_name(v_subj), 'Athlete') end;
  if v_s_session then
    select min(f.day) into v_since from public.career_facts f
     where f.athlete_id = v_subj and f.void_at is null and f.kind in ('session_finished', 'session_finished_early', 'library_session');
  end if;
  select p.data -> 'cycles' -> (case when jsonb_typeof(p.data -> 'currentCycleIndex') = 'number' then public.career_num(p.data -> 'currentCycleIndex')::int else 0 end) ->> 'art'
    into v_art from public.programs p where p.athlete_id = v_subj and jsonb_typeof(p.data -> 'cycles') = 'array';
  if v_s_level then v_lv := public.crew_lv(v_subj); end if;

  -- the four numbers: exactly the Scorecard's (career_rewards_profile is what get_profile() takes numbers.four from). A free athlete's four are
  -- other things (a day streak, perfect days), so they get no numbers here and `free: true`.
  v_four := public.career_rewards_profile(v_subj, null) -> 'numbers' -> 'four';
  if v_four is not null then
    if (v_four -> 'consistency' ->> 'key') = 'weeks_held' then
      if v_s_week then
        v_num := v_num || jsonb_build_object('weeks', jsonb_build_object('now', coalesce((v_four -> 'consistency' ->> 'value')::int, 0),
                                                                           'best', coalesce((v_four -> 'consistency' ->> 'best')::int, 0)));
      end if;
      if v_s_session then v_num := v_num || jsonb_build_object('sessions', coalesce((v_four -> 'commitment' ->> 'value')::int, 0)); end if;
      if v_s_best then v_num := v_num || jsonb_build_object('bests', coalesce((v_four -> 'progress' ->> 'value')::int, 0)); end if;
      if v_own then v_num := v_num || jsonb_build_object('comebacks', coalesce((v_four -> 'resilience' ->> 'value')::int, 0)); end if;
    else
      v_free := true;
    end if;
  end if;

  -- cheers: members only. The season's count, the last 7 days (the word goes after 7), and whether YOU cheered them today (not on your own page).
  if v_member then
    v_giver := case when v_coach and v_view is null then public.coach_note_id() else v_id end;
    v_cheers := jsonb_build_object(
      'season', public.crew_cheer_count(v_subj),
      'recent', coalesce((select jsonb_agg(x.j order by x.day desc, x.id desc) from (
                    select c2.id, c2.day,
                           jsonb_build_object('ck', gm.crew_key, 'who', case when c2.athlete_id = public.coach_note_id() then 'Coach' else gm.name end,
                                              'fv', public.crew_face_v(c2.athlete_id), 'coach', c2.athlete_id = public.coach_note_id(),
                                              'word', c2.word, 'day', c2.day) as j
                      from public.crew_cheers c2
                      left join public.crew_members() gm on gm.athlete_id = c2.athlete_id
                     where c2.to_athlete = v_subj and c2.day >= current_date - 7
                       and (gm.athlete_id is not null or c2.athlete_id = public.coach_note_id())
                     order by c2.day desc, c2.id desc limit 20) x), '[]'::jsonb));
    if not v_own then
      v_cheers := v_cheers || jsonb_build_object('mine_today', exists (
        select 1 from public.crew_cheers c3
         where c3.athlete_id = v_giver and c3.to_athlete = v_subj and c3.day = (now() at time zone 'UTC')::date));
    end if;
  end if;

  -- achievements, newest first, with the faces that signed each (Signed Ball): the members among the likers, newest first, five shown
  if v_s_ach then
    select coalesce(jsonb_agg(x.j order by x.day desc, x.award_id), '[]'::jsonb) into v_ach from (
      select a.award_id, a.day,
             jsonb_build_object(
               'id', a.award_id,
               'name', coalesce((select ct.body ->> 'name' from public.career_catalogue ct where ct.kind = 'achievement' and ct.id = a.item), a.item),
               'day', a.day, 'size', a.size,
               'signed', coalesce((select jsonb_agg(z.j order by z.ts desc) from (
                                     select l.created_at as ts,
                                            jsonb_build_object('ck', sm.crew_key, 'who', case when l.athlete_id = public.coach_note_id() then 'Coach' else sm.name end,
                                                               'fv', public.crew_face_v(l.athlete_id)) as j
                                       from public.crew_award_likes l
                                       left join public.crew_members() sm on sm.athlete_id = l.athlete_id
                                      where l.to_athlete = v_subj and l.award_id = a.award_id
                                        and (sm.athlete_id is not null or l.athlete_id = public.coach_note_id())
                                      order by l.created_at desc limit 5) z), '[]'::jsonb),
               'signed_n', (select count(*) from public.crew_award_likes l
                              left join public.crew_members() sm on sm.athlete_id = l.athlete_id
                             where l.to_athlete = v_subj and l.award_id = a.award_id
                               and (sm.athlete_id is not null or l.athlete_id = public.coach_note_id()))) as j
        from public.career_awards a
       where a.athlete_id = v_subj and a.kind = 'achievement'
       order by a.day desc, a.award_id limit 40) x;
  end if;

  -- the month's honours, once frozen (never "one week short")
  if v_s_hon then
    select coalesce(jsonb_agg(jsonb_build_object('month', z.month, 'honour', z.honour, 'value', z.value - 'slot') order by z.month desc, z.honour), '[]'::jsonb) into v_hon
      from (select h.month, h.honour, h.value from public.career_honours h
             where h.athlete_id = v_subj and h.honour <> 'near'
               and exists (select 1 from public.career_honour_months hm where hm.month = h.month)
             order by h.month desc, h.honour limit 24) z;
  end if;

  -- the last five personal bests: the lift and the day, NEVER the weight
  if v_s_best then
    select coalesce(jsonb_agg(jsonb_build_object('lift', z.lift, 'day', z.day) order by z.day desc, z.lift), '[]'::jsonb) into v_best
      from (select f.value ->> 'lift' as lift, f.day from public.career_facts f
             where f.athlete_id = v_subj and f.void_at is null and f.kind = 'personal_best' and nullif(btrim(f.value ->> 'lift'), '') is not null
             order by f.day desc, f.created_at desc limit 5) z;
  end if;

  -- the current cycle, week by week. A plan day counts once in `done`; a plan day done again, a Library session and anything past the plan is
  -- `extra` ("they can do extra, it needs to show that as well"). ANOTHER person gets only the CURRENT week (`weeks` holds one entry, now: true) and the
  -- cycle's `done` and `extra` totals; no past weeks and no plan total for the cycle, because a row of past weeks with gaps would show a broken week, which the Bell's
  -- never list keeps for you alone. Their sessions before the day they joined are not counted anywhere. Your OWN page keeps every week of the cycle, the dates, the
  -- titles and the minutes (a Library session or a rehab day's name can hint at pain, which is on the never list), and carries the same two totals; never an RPE, a note or a check-in.
  if v_s_session then
    with w as (select * from public.career_weeks(v_subj) cw where cw.is_current),
    pdays as (select p.data -> 'workouts' -> 'days' as days from public.programs p where p.athlete_id = v_subj),
    f as (
      select cf.day as d, cf.ref,
             case when cf.kind in ('session_finished', 'session_finished_early') then nullif(btrim(cf.value ->> 'plan_day'), '') end as pday,
             case when (cf.value ->> 'minutes') ~ '^\d{1,4}$' then (cf.value ->> 'minutes')::int end as mins,
             cf.value ->> 'slug' as slug
        from public.career_facts cf
       where cf.athlete_id = v_subj and cf.void_at is null and cf.kind in ('session_finished', 'session_finished_early', 'library_session')
         and cf.day between (select min(w1.wfrom) from w w1) and (select max(w2.wto) from w w2)
         and (v_own or cf.day >= v_joined)),
    fw as (
      select w.week, f.d, f.ref, f.pday, f.mins, f.slug,
             (f.pday is not null and f.pday = any (w.plan) and row_number() over (partition by w.week, f.pday order by f.d, f.ref) = 1) as in_plan
        from f join w on f.d between w.wfrom and w.wto),
    fd as (
      select fw.week, fw.d, fw.ref, fw.in_plan, fw.mins,
             left(btrim(regexp_replace(public.crew_clean(
               case when fw.pday is not null
                    then coalesce((select coalesce(nullif(btrim(e ->> 'title'), ''), nullif(btrim(e ->> 'focusTag'), ''))
                                     from pdays pd, jsonb_array_elements(case when jsonb_typeof(pd.days) = 'array' then pd.days else '[]'::jsonb end) e
                                    where e ->> 'id' = fw.pday limit 1), 'Day ' || fw.pday)
                    else coalesce((select ls.title from public.library_sessions ls
                                    where ls.athlete_id = v_subj and ls.slug = fw.slug and ls.completed_on = fw.d limit 1), 'Library session') end),
               '\s+', ' ', 'g')), 40) as title
        from fw),
    wk as (
      select w.week, count(*) filter (where fd.in_plan) as done, count(*) filter (where not fd.in_plan) as extra,
             jsonb_agg(jsonb_build_object('day', fd.d, 'extra', not fd.in_plan)
                       || case when v_own then jsonb_build_object('title', fd.title) else '{}'::jsonb end
                       || case when v_own and fd.mins is not null then jsonb_build_object('mins', fd.mins) else '{}'::jsonb end
                       order by fd.d, fd.ref) filter (where fd.week is not null) as days
        from w left join fd on fd.week = w.week group by w.week)
    select jsonb_build_object(
             'n', max(w.cycle_num), 'per_week', max(cardinality(w.plan)),
             'done', coalesce(sum(wk.done), 0)::int, 'extra', coalesce(sum(wk.extra), 0)::int)
           || case when v_own then jsonb_build_object('from', max(w.cstart), 'to', max(w.cend)) else '{}'::jsonb end
           || jsonb_build_object('weeks', coalesce(jsonb_agg(jsonb_build_object(
                         'w', w.week, 'from', w.wfrom, 'to', w.wto, 'plan', cardinality(w.plan),
                         'done', coalesce(wk.done, 0),
                         'held', exists (select 1 from public.career_facts h
                                          where h.athlete_id = v_subj and h.kind = 'week_held' and h.void_at is null
                                            and h.ref = 'c' || w.cycle_num || '|w' || w.week and (v_own or h.day >= v_joined)),
                         'extra', coalesce(wk.extra, 0),
                         'now', current_date between w.wfrom and w.wto,
                         'days', coalesce(wk.days, '[]'::jsonb))
                       order by w.week) filter (where v_own or current_date between w.wfrom and w.wto), '[]'::jsonb))
      into v_cycle
      from w left join wk on wk.week = w.week
    having count(*) > 0;
  end if;

  v_out := jsonb_build_object(
    'ck', case when v_member then s.crew_key else c.crew_key end,
    'me', v_own, 'who', v_who, 'first', split_part(btrim(v_who), ' ', 1),
    'joined', v_joined, 'member', v_member, 'under13', coalesce(c.under13, false),
    'fv', public.crew_face_v(v_subj), 'art', v_art,
    'game', public.crew_game_of(v_subj), 'numbers', v_num);
  -- your own page also says which of your switches are on, so the app can mark the blocks the crew cannot see as "Only you"
  if v_own then
    v_out := v_out || jsonb_build_object('kinds', (select jsonb_object_agg(k.kind, coalesce((c.kinds ->> k.kind)::boolean, true)) from unnest(public.crew_kind_list()) k(kind)));
  end if;
  if v_since is not null then v_out := v_out || jsonb_build_object('since', v_since); end if;
  if v_member and s.first_yes_at >= now() - interval '7 days' then v_out := v_out || jsonb_build_object('new', true); end if;
  if v_lv is not null then v_out := v_out || jsonb_build_object('lv', v_lv); end if;
  if v_free then v_out := v_out || jsonb_build_object('free', true); end if;
  if v_cheers is not null then v_out := v_out || jsonb_build_object('cheers', v_cheers); end if;
  if v_ach is not null then v_out := v_out || jsonb_build_object('achievements', v_ach); end if;
  if v_hon is not null then v_out := v_out || jsonb_build_object('honours', v_hon); end if;
  if v_best is not null then v_out := v_out || jsonb_build_object('best_lifts', v_best); end if;
  if v_cycle is not null then v_out := v_out || jsonb_build_object('cycle', v_cycle); end if;
  -- stage97 (partner codes) adds crew_referral(); the page carries it on your own page once that function exists, and not before. An under-13 has none.
  if v_own and not coalesce(c.under13, false) and to_regprocedure('public.crew_referral(text)') is not null then
    execute 'select public.crew_referral($1)' into v_ref using v_subj;
    if v_ref is not null then v_out := v_out || jsonb_build_object('referral', v_ref); end if;
  end if;
  return v_out || jsonb_build_object('at', now());
end $function$;

-- ── 6. Faces: one small picture per member ───────────────────────────────────────────────────────────────────────────────────────
-- The phone sends a 256 px JPEG (at most 60 KB, location data gone with the re-encode) as base64. The same checks crew_write_post makes on a post's
-- photo: it decodes, it starts with the JPEG marker, it is not tiny. A member only (a no, an under-13, a former athlete and the demo have no face).
create or replace function public.crew_face_set(p_photo text, p_w integer, p_h integer) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.crew_who(); v_bytes bytea; v_t timestamptz;
begin
  if exists (select 1 from public.crew_consent c where c.athlete_id = v_me and c.under13) then raise exception 'crew:under13'; end if;
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then raise exception 'crew:not_yes'; end if;
  if nullif(btrim(coalesce(p_photo, '')), '') is null then raise exception 'crew:photo_bad'; end if;
  begin
    v_bytes := decode(regexp_replace(regexp_replace(p_photo, '^data:[^,]*,', ''), '\s', '', 'g'), 'base64');
  exception when others then
    raise exception 'crew:photo_bad';
  end;
  if octet_length(v_bytes) > 60000 then raise exception 'crew:photo_big'; end if;
  if octet_length(v_bytes) < 100 or substring(v_bytes from 1 for 3) <> '\xffd8ff'::bytea then raise exception 'crew:photo_bad'; end if;
  if p_w is null or p_h is null or p_w not between 64 and 512 or p_h not between 64 and 512 then raise exception 'crew:photo_bad'; end if;
  -- a new picture always gets a new version (at least a second after the old one), because the version is the phone's cache key
  insert into public.crew_faces as f (athlete_id, w, h, bytes) values (v_me, p_w, p_h, v_bytes)
  on conflict (athlete_id) do update
     set w = excluded.w, h = excluded.h, bytes = excluded.bytes, updated_at = greatest(now(), f.updated_at + interval '1 second')
  returning f.updated_at into v_t;
  return jsonb_build_object('fv', extract(epoch from v_t)::bigint);
end $function$;

create or replace function public.crew_face_clear() returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.crew_who();
begin
  delete from public.crew_faces where athlete_id = v_me;
  return jsonb_build_object('fv', null);
end $function$;

-- Up to 12 faces by crew key: only a member's (or the caller's own), only rows that exist. Any signed-in athlete may ask, as crew_photo() lets any
-- signed-in athlete read a member's post photo, so the band and the board draw for everyone.
create or replace function public.crew_faces_get(p_keys uuid[]) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_me text := public.current_athlete_id();
begin
  if v_me is null and not public.is_coach() then raise exception 'not signed in'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('ck', k.ck, 'fv', extract(epoch from f.updated_at)::bigint, 'b64', replace(encode(f.bytes, 'base64'), E'\n', '')))
      from (select distinct x.ck from unnest((coalesce(p_keys, '{}'::uuid[]))[1:12]) x(ck)) k
      join public.crew_consent cc on cc.crew_key = k.ck
      join public.crew_faces f on f.athlete_id = cc.athlete_id
     where cc.athlete_id = v_me or exists (select 1 from public.crew_members() m where m.athlete_id = cc.athlete_id)), '[]'::jsonb);
end $function$;

-- Amir's side: every face with its owner's id (to see and to remove), and a remove.
create or replace function public.coach_crew_faces() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('athlete_id', f.athlete_id, 'fv', extract(epoch from f.updated_at)::bigint,
                                                       'b64', replace(encode(f.bytes, 'base64'), E'\n', '')) order by f.athlete_id)
                     from public.crew_faces f), '[]'::jsonb);
end $function$;

create or replace function public.coach_crew_face_clear(p_athlete text) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  delete from public.crew_faces where athlete_id = p_athlete;
  return jsonb_build_object('ok', true);
end $function$;

-- ── 7. "Your game": any signed-in athlete, in the crew or not ─────────────────────────────────────────────────────────────────────
-- A key that is there sets that field (an empty string or null clears it); a key that is not there leaves it alone; a key this does not know is
-- dropped. A value outside the lists is refused by name (game:sports, game:hand, ...), not quietly changed.
create or replace function public.my_game_set(p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me text := public.crew_who();
  c_sports constant text[] := array['tennis', 'padel', 'squash', 'badminton', 'pickleball', 'table_tennis', 'beach_tennis'];
  c_train constant text[] := array['competition', 'strength', 'fitness', 'physique', 'running', 'health'];
  r public.athlete_profile%rowtype; v text; arr text[];
begin
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'game:shape'; end if;
  select g.* into r from public.athlete_profile g where g.athlete_id = v_me;
  if not found then
    r.sports := '{}'; r.training_for := '{}';
  end if;
  if p ? 'sports' then
    if jsonb_typeof(p -> 'sports') = 'null' then arr := '{}';
    elsif jsonb_typeof(p -> 'sports') <> 'array' then raise exception 'game:sports';
    else
      select coalesce(array_agg(z.s order by array_position(c_sports, z.s)), '{}') into arr
        from (select distinct lower(btrim(e)) as s from jsonb_array_elements_text(p -> 'sports') e where btrim(e) <> '') z;
      if not (arr <@ c_sports) then raise exception 'game:sports'; end if;
    end if;
    r.sports := arr;
  end if;
  if p ? 'training_for' then
    if jsonb_typeof(p -> 'training_for') = 'null' then arr := '{}';
    elsif jsonb_typeof(p -> 'training_for') <> 'array' then raise exception 'game:training_for';
    else
      select coalesce(array_agg(z.s order by array_position(c_train, z.s)), '{}') into arr
        from (select distinct lower(btrim(e)) as s from jsonb_array_elements_text(p -> 'training_for') e where btrim(e) <> '') z;
      if not (arr <@ c_train) then raise exception 'game:training_for'; end if;
    end if;
    r.training_for := arr;
  end if;
  if p ? 'hand' then
    v := lower(nullif(btrim(coalesce(p ->> 'hand', '')), ''));
    if v is not null and v not in ('right', 'left') then raise exception 'game:hand'; end if;
    r.hand := v;
  end if;
  if p ? 'backhand' then
    v := lower(nullif(btrim(coalesce(p ->> 'backhand', '')), ''));
    if v is not null and v not in ('one', 'two') then raise exception 'game:backhand'; end if;
    r.backhand := v;
  end if;
  if p ? 'side' then
    v := lower(nullif(btrim(coalesce(p ->> 'side', '')), ''));
    if v is not null and v not in ('right', 'left', 'both') then raise exception 'game:side'; end if;
    r.side := v;
  end if;
  if p ? 'plays_at' then
    v := lower(nullif(btrim(coalesce(p ->> 'plays_at', '')), ''));
    if v is not null and v not in ('fun', 'club', 'competition') then raise exception 'game:plays_at'; end if;
    r.plays_at := v;
  end if;
  if p ? 'club' then
    v := nullif(regexp_replace(public.crew_clean(p ->> 'club'), '\s+', ' ', 'g'), '');
    if v is not null and char_length(v) > 40 then raise exception 'game:club'; end if;
    r.club := v;
  end if;
  if p ? 'working_on' then
    v := nullif(regexp_replace(public.crew_clean(p ->> 'working_on'), '\s+', ' ', 'g'), '');
    if v is not null and char_length(v) > 60 then raise exception 'game:working_on'; end if;
    r.working_on := v;
  end if;
  if p ? 'ig' then
    v := ltrim(nullif(btrim(coalesce(p ->> 'ig', '')), ''), '@');
    v := nullif(v, '');
    if v is not null and v !~ '^[A-Za-z0-9._]{1,30}$' then raise exception 'game:ig'; end if;
    r.ig := v;
  end if;
  insert into public.athlete_profile as g (athlete_id, sports, hand, backhand, side, plays_at, club, training_for, working_on, ig, updated_at)
  values (v_me, r.sports, r.hand, r.backhand, r.side, r.plays_at, r.club, r.training_for, r.working_on, r.ig, now())
  on conflict (athlete_id) do update
     set sports = excluded.sports, hand = excluded.hand, backhand = excluded.backhand, side = excluded.side, plays_at = excluded.plays_at,
         club = excluded.club, training_for = excluded.training_for, working_on = excluded.working_on, ig = excluded.ig, updated_at = now();
  return public.crew_game_of(v_me);
end $function$;

-- ── 8. Cheers: a cheer to a person ───────────────────────────────────────────────────────────────────────────────────────────────
-- A member cheers another member (never themselves, never an under-13, never a person who has left), once a day per person (the server's UTC day),
-- 30 a day at the most, with an optional word of up to 100 characters. It pays nothing (GAME-6), rings the person's phone ('cheer', by name, never
-- the word) and shows on their page for 7 days; the word is cleared after 7 days by crew_sweep(), the row stays for the season's count (400 days).
create or replace function public.crew_cheer(p_subject uuid, p_word text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me text := public.crew_who(); v_to text; v_word text; v_day date := (now() at time zone 'UTC')::date;
begin
  if exists (select 1 from public.crew_consent c where c.athlete_id = v_me and c.under13) then raise exception 'crew:under13'; end if;
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then raise exception 'crew:not_yes'; end if;
  select m.athlete_id into v_to from public.crew_members() m where m.crew_key = p_subject;
  if v_to is null then raise exception 'crew:gone'; end if;
  if v_to = v_me then raise exception 'crew:own'; end if;
  v_word := nullif(regexp_replace(public.crew_clean(p_word), '\s+', ' ', 'g'), '');
  if v_word is not null and char_length(v_word) > 100 then raise exception 'crew:word_long'; end if;
  -- the caps under one lock, so two taps cannot both pass
  perform pg_advisory_xact_lock(hashtext('crew_cheer:' || v_me));
  if exists (select 1 from public.crew_cheers x where x.athlete_id = v_me and x.to_athlete = v_to and x.day = v_day) then raise exception 'crew:cheer_today'; end if;
  if (select count(*) from public.crew_cheers x where x.athlete_id = v_me and x.day = v_day) >= 30 then raise exception 'crew:cheers_today'; end if;
  insert into public.crew_cheers (athlete_id, to_athlete, day, word) values (v_me, v_to, v_day, v_word);
  return jsonb_build_object('ok', true, 'season', public.crew_cheer_count(v_to));
end $function$;

-- Amir cheers a member as Coach ('__coach__' as the giver), the same once-a-day rule.
create or replace function public.coach_cheer(p_athlete text, p_word text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_to text; v_word text; v_day date := (now() at time zone 'UTC')::date;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  select m.athlete_id into v_to from public.crew_members() m where m.athlete_id = nullif(btrim(coalesce(p_athlete, '')), '');
  if v_to is null then raise exception 'crew:gone'; end if;
  v_word := nullif(regexp_replace(public.crew_clean(p_word), '\s+', ' ', 'g'), '');
  if v_word is not null and char_length(v_word) > 100 then raise exception 'crew:word_long'; end if;
  perform pg_advisory_xact_lock(hashtext('crew_cheer:' || public.coach_note_id()));
  if exists (select 1 from public.crew_cheers x where x.athlete_id = public.coach_note_id() and x.to_athlete = v_to and x.day = v_day) then raise exception 'crew:cheer_today'; end if;
  insert into public.crew_cheers (athlete_id, to_athlete, day, word) values (public.coach_note_id(), v_to, v_day, v_word);
  return jsonb_build_object('ok', true, 'season', public.crew_cheer_count(v_to));
end $function$;

-- Moderation: Amir blanks a word (the cheer itself stays and counts).
create or replace function public.coach_cheer_word_clear(p_id bigint) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  update public.crew_cheers set word = null where id = p_id and word is not null;
  return jsonb_build_object('ok', true);
end $function$;

-- EVERY cheer of the last 7 days, with or without a word, with both people's ids (to read and to moderate), newest first. Amir's own are from '__coach__', 'Coach'. Coach only.
create or replace function public.coach_crew_cheers() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', c.id, 'from_athlete', c.athlete_id,
             'from_who', case when c.athlete_id = public.coach_note_id() then 'Coach' else coalesce(gm.name, public.crew_default_name(c.athlete_id), c.athlete_id) end,
             'to_athlete', c.to_athlete, 'to_who', coalesce(tm.name, public.crew_default_name(c.to_athlete), c.to_athlete),
             'word', c.word, 'day', c.day) order by c.day desc, c.id desc)
      from public.crew_cheers c
      left join public.crew_members() gm on gm.athlete_id = c.athlete_id
      left join public.crew_members() tm on tm.athlete_id = c.to_athlete
     where c.day >= current_date - 7), '[]'::jsonb);
end $function$;

-- ── 9. Mentions, the signatures, the answers, the sweep, the post's stamp: the live functions, plus the lines marked stage96 ─────────
-- crew_reply(): a mention token in the body (@[<ck>|<name>]) is checked: the ck must be a member and not the author, at most 5 to a reply. A token
-- that fails any of these becomes plain "@<name>". What the 140-character limit counts is what is SEEN (a token counts as "@name"), so five chips
-- do not eat the line. The valid ones go into crew_mentions, which is what rings (kind 'mention').
CREATE OR REPLACE FUNCTION public.crew_reply(p_post uuid, p_body text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_me text := public.crew_who(); v_body text := public.crew_clean(p_body); v_author text;
  -- stage96: mentions. A token is @[<crew_key>|<name>]; v_seen is the reply as it will be READ (a token is "@name").
  v_rest text; v_out text := ''; v_seen text := ''; v_m text[]; v_pos integer; v_nm text; v_to text; v_cnt integer := 0; v_tos text[] := '{}'; v_id uuid;
  c_tok constant text := '(@\[([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\|([^]|\n]{1,40})\])';
begin
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then raise exception 'crew:not_yes'; end if;
  if v_body = '' then raise exception 'crew:empty'; end if;
  -- stage96: check each mention token. Valid: a member, not the author, the first five. Anything else becomes plain "@name".
  v_rest := v_body;
  loop
    v_m := regexp_match(v_rest, c_tok);
    exit when v_m is null;
    v_pos := strpos(v_rest, v_m[1]);
    v_nm := left(btrim(v_m[3]), 24);
    v_out := v_out || left(v_rest, v_pos - 1);
    v_seen := v_seen || left(v_rest, v_pos - 1);
    v_to := null;
    if v_cnt < 5 and v_nm <> '' then
      select m.athlete_id into v_to from public.crew_members() m where m.crew_key = lower(v_m[2])::uuid and m.athlete_id <> v_me;
    end if;
    if v_to is not null then
      v_out := v_out || '@[' || lower(v_m[2]) || '|' || v_nm || ']';
      v_cnt := v_cnt + 1;
      if not (v_to = any (v_tos)) then v_tos := v_tos || v_to; end if;
    else
      v_out := v_out || '@' || v_nm;
    end if;
    v_seen := v_seen || '@' || v_nm;
    v_rest := substr(v_rest, v_pos + length(v_m[1]));
  end loop;
  v_body := v_out || v_rest;
  v_seen := v_seen || v_rest;
  if char_length(v_seen) > 140 or char_length(v_body) > 700 then raise exception 'crew:reply_long'; end if;
  perform public.crew_sweep();
  select p.athlete_id into v_author from public.crew_posts p
   where p.id = p_post and p.created_at >= now() - interval '7 days'
     and (p.athlete_id = public.coach_note_id() or exists (select 1 from public.crew_members() m where m.athlete_id = p.athlete_id));
  if v_author is null then raise exception 'crew:gone'; end if;
  -- Two caps under one lock, so two taps cannot both pass: what one athlete may say in a day, and how long one post's
  -- thread may get (everybody's, so a thread cannot be driven past reading length).
  perform pg_advisory_xact_lock(hashtext('crew_reply:' || v_me));
  if (select count(*) from public.crew_replies r where r.athlete_id = v_me and r.created_at >= date_trunc('day', now())) >= 30 then
    raise exception 'crew:replies_today';
  end if;
  if (select count(*) from public.crew_replies r where r.post_id = p_post) >= 50 then
    raise exception 'crew:replies_full';
  end if;
  insert into public.crew_replies (post_id, athlete_id, body) values (p_post, v_me, v_body) returning id into v_id;
  -- stage96: the valid mentions are what rings
  insert into public.crew_mentions (reply_id, athlete_id, to_athlete) select v_id, v_me, x from unnest(v_tos) x on conflict do nothing;
  return jsonb_build_object('post', p_post, 'replies', public.crew_reply_rows(p_post, v_me));
end $function$;

-- crew_kudos(): a like on a Bell LINE also signs that day's live achievements of the person (Signed Ball); taking the like back unsigns them.
CREATE OR REPLACE FUNCTION public.crew_kudos(p_target text, p_on boolean DEFAULT true, p_emoji text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me text := public.crew_who(); v_t text := btrim(coalesce(p_target, '')); v_post uuid; v_to text; v_day date; v_author text;
  v_em text := nullif(btrim(coalesce(p_emoji, '')), '');
begin
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then raise exception 'crew:not_yes'; end if;
  if v_em is not null and not (v_em = any (public.crew_emoji_list())) then raise exception 'crew:emoji'; end if;
  if v_t ~ '^[0-9a-f-]{36}$' then
    v_post := v_t::uuid;
    select p.athlete_id into v_author from public.crew_posts p
     where p.id = v_post and p.created_at >= now() - interval '7 days'
       and (p.athlete_id = public.coach_note_id() or exists (select 1 from public.crew_members() m where m.athlete_id = p.athlete_id));
    if v_author is null then raise exception 'crew:gone'; end if;
    if v_author = v_me then raise exception 'crew:own'; end if;
    if p_on then
      insert into public.crew_kudos (athlete_id, post_id, emoji) values (v_me, v_post, v_em)
      on conflict (athlete_id, post_id) where post_id is not null
      do update set emoji = excluded.emoji, created_at = now();
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
    insert into public.crew_kudos (athlete_id, to_athlete, line_day, emoji) values (v_me, v_to, v_day, v_em)
    on conflict (athlete_id, to_athlete, line_day) where to_athlete is not null
    do update set emoji = excluded.emoji, created_at = now();
    -- stage96: the like signs the live achievements of that person's day (Signed Ball). Kept past the 7-day sweep, removed when the like is taken back.
    insert into public.crew_award_likes (athlete_id, to_athlete, award_id)
    select v_me, v_to, a.award_id from public.career_awards a
     where a.athlete_id = v_to and a.kind = 'achievement' and a.how = 'live' and (a.created_at at time zone 'UTC')::date = v_day
    on conflict do nothing;
  else
    delete from public.crew_kudos k where k.athlete_id = v_me and k.to_athlete = v_to and k.line_day = v_day;
    delete from public.crew_award_likes l
     where l.athlete_id = v_me and l.to_athlete = v_to
       and l.award_id in (select a.award_id from public.career_awards a
                           where a.athlete_id = v_to and a.kind = 'achievement' and a.how = 'live' and (a.created_at at time zone 'UTC')::date = v_day);
  end if;
  return public.crew_kudos_of(null, v_to, v_day, v_me);
end $function$;

-- crew_answer('no') and coach_crew_under13(true): leaving means gone, so the face, the cheers, the signatures and the mentions go too.
CREATE OR REPLACE FUNCTION public.crew_answer(p_answer text, p_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    perform public.crew_forget(v_me);   -- stage96: the face, the cheers, the signatures and the mentions, both ways
  end if;
  return public.crew_me(v_me);
end $function$;

CREATE OR REPLACE FUNCTION public.coach_crew_under13(p_athlete text, p_on boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    perform public.crew_forget(p_athlete);   -- stage96: the face, the cheers, the signatures and the mentions, both ways
  end if;
  return p_on;
end $function$;

-- A former athlete leaves the crew by the coach's hand (athlete_status), not by an RPC. This trigger is that door.
create or replace function public.crew_t_forget_former() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  begin
    perform public.crew_forget(new.athlete_id);
  exception when others then
    raise warning 'crew: the face and cheers of % were not cleared: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_forget_former on public.athlete_status;
create trigger crew_forget_former after insert or update of status on public.athlete_status
  for each row when (new.status = 'former') execute function public.crew_t_forget_former();

-- crew_sweep(): a cheer's word is cleared after 7 days, its row after 400.
CREATE OR REPLACE FUNCTION public.crew_sweep()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_n integer := 0; k integer;
begin
  delete from public.crew_posts where created_at < now() - interval '7 days';
  get diagnostics k = row_count; v_n := v_n + k;
  delete from public.crew_kudos where to_athlete is not null and line_day < current_date - 7;
  get diagnostics k = row_count; v_n := v_n + k;
  delete from public.crew_rings where created_at < now() - interval '8 days';
  get diagnostics k = row_count; v_n := v_n + k;
  -- stage96: a cheer's word lives 7 days; the row (it is the season's count) lives 400
  update public.crew_cheers set word = null where word is not null and day < current_date - 7;
  get diagnostics k = row_count; v_n := v_n + k;
  delete from public.crew_cheers where day < current_date - 400;
  get diagnostics k = row_count; v_n := v_n + k;
  return v_n;
end $function$;

-- crew_write_post(): the session a post tells (Tell the crew) may now carry title, mins and held beside day and n: the post's proof stamp.
CREATE OR REPLACE FUNCTION public.crew_write_post(p_who text, p_body text, p_photo text, p_w integer, p_h integer, p_kind text, p_session jsonb, p_capped boolean, p_key uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_body text := public.crew_clean(p_body); v_kind text := coalesce(nullif(btrim(coalesce(p_kind, '')), ''), 'post');
  v_bytes bytea; v_id uuid; v_ses jsonb := null; v_seen uuid;
begin
  -- The same key again is the same post: hand back what was written the first time and write nothing.
  if p_key is not null then
    select cp.id into v_seen from public.crew_posts cp where cp.athlete_id = p_who and cp.client_key = p_key;
    if v_seen is not null then return jsonb_build_object('id', v_seen, 'again', true); end if;
  end if;
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
      'n', case when (p_session ->> 'n') ~ '^\d{1,4}$' then (p_session ->> 'n')::int end,
      -- stage96: the proof stamp. title (a name, at most 40 characters), mins (1 to 300) and held (did this session hold the week). Other keys are dropped.
      'title', nullif(left(btrim(regexp_replace(public.crew_clean(p_session ->> 'title'), '\s+', ' ', 'g')), 40), ''),
      'mins', case when (p_session ->> 'mins') ~ '^\d{1,3}$' and (p_session ->> 'mins')::int between 1 and 300 then (p_session ->> 'mins')::int end,
      'held', case when jsonb_typeof(p_session -> 'held') = 'boolean' then (p_session -> 'held')::boolean end));
  end if;
  if p_capped then
    perform pg_advisory_xact_lock(hashtext('crew_post:' || p_who));
    -- the key again, now under the lock: the race this is here to stop is two taps a second apart
    if p_key is not null then
      select cp.id into v_seen from public.crew_posts cp where cp.athlete_id = p_who and cp.client_key = p_key;
      if v_seen is not null then return jsonb_build_object('id', v_seen, 'again', true); end if;
    end if;
    if (select count(*) from public.crew_posts cp where cp.athlete_id = p_who and cp.created_at >= date_trunc('day', now())) >= 10 then
      raise exception 'crew:posts_today';
    end if;
    if v_bytes is not null and (select count(*) from public.crew_photos ph where ph.athlete_id = p_who and ph.created_at >= date_trunc('day', now())) >= 3 then
      raise exception 'crew:photos_today';
    end if;
  end if;
  insert into public.crew_posts (athlete_id, kind, body, session, has_photo, client_key)
  values (p_who, v_kind, v_body, v_ses, v_bytes is not null, p_key) returning id into v_id;
  if v_bytes is not null then
    insert into public.crew_photos (post_id, athlete_id, w, h, bytes)
    values (v_id, p_who, case when p_w between 1 and 4000 then p_w end, case when p_h between 1 and 4000 then p_h end, v_bytes);
  end if;
  return jsonb_build_object('id', v_id);
end $function$;

-- ── 10. Push: three aimed kinds ──────────────────────────────────────────────────────────────────────────────────────────────────
-- cheer: a member (or Amir) cheered you. reply: somebody replied to YOUR post. mention: somebody @mentioned you. Each is queued with the target's
-- crew_key and goes to that person's phones only (crew_push_fold below). The words are a name and a kind, never what was written.
alter table public.crew_push_q drop constraint if exists crew_push_q_kind_check;
alter table public.crew_push_q add constraint crew_push_q_kind_check
  check (kind in ('post', 'kudos', 'level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open', 'joined', 'cheer', 'reply', 'mention'));

create or replace function public.crew_push_t_cheer() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_key uuid;
begin
  begin
    select c.crew_key into v_key from public.crew_consent c where c.athlete_id = new.to_athlete;
    if v_key is not null then
      perform public.crew_push_add(new.athlete_id, 'cheer', v_key);
    end if;
  exception when others then
    raise warning 'crew_push: a cheer from % did not queue: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_push_cheer on public.crew_cheers;
create trigger crew_push_cheer after insert on public.crew_cheers
  for each row execute function public.crew_push_t_cheer();

-- A reply rings the author of the POST, not Amir (he has no phone in the crew) and not the author replying to themselves.
create or replace function public.crew_push_t_reply() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_author text; v_key uuid;
begin
  begin
    select p.athlete_id into v_author from public.crew_posts p where p.id = new.post_id;
    if v_author is not null and v_author <> public.coach_note_id() and v_author <> new.athlete_id then
      select c.crew_key into v_key from public.crew_consent c where c.athlete_id = v_author;
      if v_key is not null then
        perform public.crew_push_add(new.athlete_id, 'reply', v_key);
      end if;
    end if;
  exception when others then
    raise warning 'crew_push: a reply from % did not queue: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_push_reply on public.crew_replies;
create trigger crew_push_reply after insert on public.crew_replies
  for each row execute function public.crew_push_t_reply();

create or replace function public.crew_push_t_mention() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_key uuid;
begin
  begin
    select c.crew_key into v_key from public.crew_consent c where c.athlete_id = new.to_athlete;
    if v_key is not null then
      perform public.crew_push_add(new.athlete_id, 'mention', v_key);
    end if;
  exception when others then
    raise warning 'crew_push: a mention from % did not queue: % (%)', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_push_mention on public.crew_mentions;
create trigger crew_push_mention after insert on public.crew_mentions
  for each row execute function public.crew_push_t_mention();

-- The words: the live ones, three lines more. The Farsi of the three new kinds is a DRAFT for Amir (push.md: the Farsi push words are his).
CREATE OR REPLACE FUNCTION public.crew_push_words(p_n integer, p_kind text, p_who text, p_mine boolean, p_lang text)
 RETURNS TABLE(title text, body text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  with l as (select case when p_lang = 'fa' then 'fa' else 'en' end as lang),
  -- more than one thing to tell them: the count, and nothing about who or what
  many as (
    select case when l.lang = 'fa' then 'تو تیم خبر هست' else 'The crew has been busy' end as title,
           case when l.lang = 'fa' then translate(p_n::text, '0123456789', '۰۱۲۳۴۵۶۷۸۹') || ' چیز تازه.'
                else p_n::text || ' new things to see.' end as body
      from l),
  -- exactly one: who, and which kind of thing
  one as (
    select case when l.lang = 'fa' then coalesce(w.fa, 'یه خبر تو تیم') else coalesce(w.en, 'Something in the crew') end as title,
           case when l.lang = 'fa' then 'یه سر بزن.' else 'Have a look.' end as body
      from l
      left join (values
        ('post',        p_who || ' posted',                 p_who || ' پست گذاشت'),
        ('kudos_you',   p_who || ' cheered you',            p_who || ' برات دست زد'),
        ('kudos',       p_who || ' gave a cheer',           p_who || ' یه دست زد'),
        ('level',       p_who || ' reached a new level',    p_who || ' سطحش رفت بالا'),
        ('week',        p_who || ' held their week',        p_who || ' هفته‌شو کامل کرد'),
        ('mark',        p_who || ' hit a new mark',         p_who || ' یه دستاورد گرفت'),
        ('achievement', p_who || ' earned an achievement',  p_who || ' یه دستاورد گرفت'),
        ('best',        p_who || ' set a personal best',    p_who || ' رکورد زد'),
        ('cycle',       p_who || ' finished a cycle',       p_who || ' یه دوره تموم کرد'),
        ('honour',      p_who || ' took an honour',         p_who || ' یه افتخار برد'),
        ('open',        p_who || ' played the Monthly Open', p_who || ' تو مسابقهٔ ماه بازی کرد'),
        ('joined',      p_who || ' joined the crew',        p_who || ' اومد تو تیم'),
        -- stage96: the aimed kinds. A name and a kind, never what was written.
        ('cheer',       p_who || ' sent you a cheer',       p_who || ' برات یه تشویق فرستاد'),   -- FA DRAFT for Amir
        ('reply',       p_who || ' replied to your post',   p_who || ' به پستت جواب داد'),        -- FA DRAFT for Amir
        ('mention',     p_who || ' mentioned you',          p_who || ' تو رو منشن کرد')           -- FA DRAFT for Amir
      ) as w(k, en, fa)
        on w.k = case when p_kind = 'kudos' and coalesce(p_mine, false) then 'kudos_you' else p_kind end)
  select title, body from many where p_n > 1
  union all
  select title, body from one where p_n <= 1
$function$;

-- The decision: ONE row per phone, as before. An aimed event (cheer, reply, mention) goes only to its target's phones, is never counted in "N new
-- things", and names its sender. When a phone is owed an aimed event it gets that notification (the newest aimed one) instead of the folded count:
-- the broadcasts it was sent with are told as told (the Bell holds them for 7 days), because push-send sends the first row's words to every row
-- it groups under one athlete, kind and day, so a second row for the same person would never be read.
CREATE OR REPLACE FUNCTION public.crew_push_fold(p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(athlete_id text, endpoint text, p256dh text, auth text, lang text, day date, n integer, one_kind text, one_who text, one_mine boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
           (q.target_key is not null and q.target_key = mk.crew_key) as to_me,
           (q.kind in ('cheer', 'reply', 'mention')) as aimed   -- stage96: goes to its target's phones only, never counted in a fold
      from mark mk
      join public.crew_push_q q
        on q.created_at > coalesce(mk.upto, q.created_at - interval '1 second')
       and q.athlete_id <> mk.athlete_id
      left join public.crew_members() d on d.athlete_id = q.athlete_id
     where q.created_at >= p_now - interval '7 days'
       and (d.athlete_id is not null or q.athlete_id = public.coach_note_id())
       and (q.kind not in ('level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open')
            or coalesce((d.kinds ->> q.kind)::boolean, true))
       -- stage96: an aimed event is owed to its target alone
       and (q.kind not in ('cheer', 'reply', 'mention') or (q.target_key is not null and q.target_key = mk.crew_key))
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
     where not e.aimed
     group by e.to_id, e.endpoint, e.p256dh, e.auth, e.lang, e.local_day
  ),
  -- stage96: a phone owed an aimed event is told THAT, naming its sender: the newest one, as one notification, never as a count. (push-send sends
  -- the first row's words to every row it groups under one athlete, kind and day, so there is one row per phone.)
  named as (
    select distinct on (e.to_id, e.endpoint)
           e.to_id, e.endpoint, e.p256dh, e.auth, e.lang, e.local_day, 1 as n, e.kind as one_kind,
           coalesce(e.by_name, 'Someone') as one_who, true as one_mine
      from ev e
     where e.aimed
     order by e.to_id, e.endpoint, e.created_at desc
  )
  select n.to_id, n.endpoint, n.p256dh, n.auth, n.lang, n.local_day, n.n, n.one_kind, n.one_who, n.one_mine
    from named n
  union all
  select f.to_id, f.endpoint, f.p256dh, f.auth, f.lang, f.local_day, f.n, f.one_kind, f.one_who, f.one_mine
    from fold f
   where not exists (select 1 from named n where n.to_id = f.to_id and n.endpoint = f.endpoint)
$function$;

-- And the bug stage86 shipped: the watermark insert met the same athlete twice when they had two subscribed phones.
CREATE OR REPLACE FUNCTION public.crew_push_due(p_now timestamp with time zone DEFAULT now(), p_mark boolean DEFAULT true)
 RETURNS TABLE(endpoint text, p256dh text, auth text, athlete_id text, kind text, title text, body text, tag text, ttl integer, day date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- stage96: DISTINCT. An athlete with two subscribed phones is two rows of the fold, and one INSERT cannot touch the same watermark twice
    -- (ON CONFLICT DO UPDATE command cannot affect row a second time), which stopped every crew notification the day somebody added a second phone.
    select distinct f.athlete_id, p_now, now() from public.crew_push_fold(p_now) f
    on conflict (athlete_id) do update set pending = p_now, at = now();
  end if;

  return query
    select f.endpoint, f.p256dh, f.auth, f.athlete_id, 'crew'::text,
           w.title, w.body, 'crew'::text, 3600, f.day
      from public.crew_push_fold(p_now) f
      cross join lateral public.crew_push_words(f.n, f.one_kind, f.one_who, f.one_mine, f.lang) w;
end $function$;

-- ── 11. coach_erase_person() learns the five tables ──────────────────────────────────────────────────────────────────────────────
-- Their athlete_id columns go into the loop's list (crew_mentions BEFORE crew_replies, so its rows are counted and not swallowed by the cascade),
-- and one block after the loop deletes the rows that name the person in a column the loop cannot see: crew_cheers.to_athlete, crew_award_likes.to_athlete
-- and crew_mentions.to_athlete. Single-line anchors and chr(10), as stage81 did, because the live body mixes CRLF and LF.
do $stage96_erase$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''crew_replies'', ''crew_kudos''';
  s_new constant text := '''athlete_profile'', ''crew_mentions'', ''crew_replies'', ''crew_award_likes'', ''crew_cheers'', ''crew_faces'', ''crew_kudos''';
  a_old constant text := '      -- The rollback copies the pipeline keeps before a one-off change to live programmes sit in the "backup" schema';
  a_new constant text := concat_ws(chr(10),
    '      -- stage96: what others did TO this person (the loop above deleted what they did): cheers to them, names signed on their achievements, mentions of them.',
    '      delete from public.crew_cheers where to_athlete = v_key;',
    '      get diagnostics v_n = row_count;',
    '      v_counts := v_counts || jsonb_build_object(''crew_cheers (to them)'', v_n);',
    '      v_total := v_total + v_n;',
    '      delete from public.crew_award_likes where to_athlete = v_key;',
    '      get diagnostics v_n = row_count;',
    '      v_counts := v_counts || jsonb_build_object(''crew_award_likes (to them)'', v_n);',
    '      v_total := v_total + v_n;',
    '      delete from public.crew_mentions where to_athlete = v_key;',
    '      get diagnostics v_n = row_count;',
    '      v_counts := v_counts || jsonb_build_object(''crew_mentions (to them)'', v_n);',
    '      v_total := v_total + v_n;',
    '', '') || a_old;
  n integer; m integer;
begin
  if position('''crew_cheers (to them)''' in d) > 0 then
    return;   -- already patched (a re-run)
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  m := (length(d) - length(replace(d, a_old, ''))) / length(a_old);
  if n <> 1 or m <> 1 then
    raise exception 'stage96: coach_erase_person() is not what this patch expects (the crew tables in its list found % times, the backup-schema comment % times, not once each). Nothing was changed.', n, m;
  end if;
  execute replace(replace(d, s_old, s_new), a_old, a_new);
end $stage96_erase$;

-- ── 12. Grants: signed-in only for what the app and the dashboard call; the helpers and the triggers are the service role's ──────
do $stage96_grants$
declare f text;
begin
  foreach f in array array[
    'public.crew_face_v(text)', 'public.crew_lv(text)', 'public.crew_now_week(text)', 'public.crew_held_now(text,date)',
    'public.crew_extra(text,jsonb,timestamptz,timestamptz,text)', 'public.crew_season_start(text)', 'public.crew_cheer_count(text)',
    'public.crew_game_of(text)', 'public.crew_forget(text)', 'public.crew_t_forget_former()',
    'public.crew_push_t_cheer()', 'public.crew_push_t_reply()', 'public.crew_push_t_mention()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array[
    'public.crew_page(uuid,text)', 'public.crew_face_set(text,integer,integer)', 'public.crew_face_clear()', 'public.crew_faces_get(uuid[])',
    'public.coach_crew_faces()', 'public.coach_crew_face_clear(text)', 'public.my_game_set(jsonb)',
    'public.crew_cheer(uuid,text)', 'public.coach_cheer(text,text)', 'public.coach_cheer_word_clear(bigint)', 'public.coach_crew_cheers()',
    'public.crew_board(integer)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
  -- the functions this stage replaced keep the doors they had; said again so a replaced function can never end up wider than it was
  foreach f in array array[
    'public.crew_me(text)', 'public.crew_reply_rows(uuid,text)', 'public.crew_open_now(text)', 'public.crew_sweep()',
    'public.crew_write_post(text,text,text,integer,integer,text,jsonb,boolean,uuid)', 'public.crew_push_fold(timestamptz)',
    'public.crew_push_words(integer,text,text,boolean,text)', 'public.crew_push_due(timestamptz,boolean)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array['public.get_bell(text)', 'public.crew_kudos(text,boolean,text)', 'public.crew_reply(uuid,text)', 'public.crew_answer(text,text)',
                           'public.coach_crew_under13(text,boolean)', 'public.coach_erase_person(text,text,text,uuid[],boolean)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end
$stage96_grants$;

-- ── 13. What it must look like afterwards ────────────────────────────────────────────────────────────────────────────────────────
do $stage96_check$
begin
  if to_regprocedure('public.crew_page(uuid,text)') is null or to_regprocedure('public.crew_cheer(uuid,text)') is null
     or to_regprocedure('public.my_game_set(jsonb)') is null or to_regprocedure('public.crew_face_set(text,integer,integer)') is null then
    raise exception 'stage96: a new function is missing';
  end if;
  if to_regclass('public.athlete_profile') is null or to_regclass('public.crew_faces') is null or to_regclass('public.crew_cheers') is null
     or to_regclass('public.crew_award_likes') is null or to_regclass('public.crew_mentions') is null then
    raise exception 'stage96: a new table is missing';
  end if;
  if position('crew_face_v' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0 then
    raise exception 'stage96: get_bell() does not carry the faces';
  end if;
  if position('''crew_cheers (to them)''' in pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)) = 0
     or position('''crew_faces''' in pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)) = 0 then
    raise exception 'stage96: coach_erase_person() does not know the new tables';
  end if;
  if not exists (select 1 from pg_trigger t where t.tgname in ('crew_push_cheer', 'crew_push_reply', 'crew_push_mention', 'crew_forget_former') and not t.tgisinternal
                 having count(*) = 4) then
    raise exception 'stage96: a trigger is missing';
  end if;
  raise notice 'stage96: applied';
end
$stage96_check$;
