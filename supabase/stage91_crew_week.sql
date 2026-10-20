-- stage91_crew_week.sql — the week's attendance on the Bell, and a board of the crew only (2026-10-20)
--
-- From the audit *The Empty Room* (https://claude.ai/artifact/6VAMqcv12S9Y7rNCLEwmdM) and Amir's answers to it, 2026-10-20.
-- The tab was well built and almost empty: 6 in the crew, 4 posts ever, and ONE moment rang in eight weeks, because the only
-- thing an athlete does every week — finish a session — reached the Bell only through *Tell the crew*, and only with a photo.
-- Everything on the Bell on 19 October was *joined the crew*, a line each person gets once, so on the 26th the whole feed
-- would have swept to the words "Quiet so far this week".
--
-- Amir, asked whether a finished session should ring: *"only if they want to, unless if 20 ppl train, we wil have 20 bells."*
-- So it is ONE line a day for the whole crew, naming whoever trained — never one line each — and it has its own switch like
-- every other kind. He chose it ON by default and with **no notification**: the Bell fills, nobody's phone gets noisier.
-- Nothing here queues a push, and nothing needs to: `crew_push_queue`'s own CHECK constraint has no 'session' kind and no
-- trigger adds one, so this is silent by construction. Do not add one without his word.
--
-- Three things, none of which moves any XP (GAME-6: nothing on Crew pays):
--   1. `crew_kind_list()` gains 'session', so every athlete can switch the attendance line off (`crew_kinds()`, unchanged).
--   2. `get_bell()` gains the attendance lines, the week band's three numbers, and the crew's own names.
--   3. `crew_board()` is new: the season board, **crew members only**.
--
-- ⚠️ THE DAY, NEVER THE WRITE. A session's fact is dated twice: `day` is when it was trained, `created_at` when the row was
-- written. On 17 October the career back-pay wrote 39 of Mehraneh's sessions, 26 of Ehsan's and 24 of Dela's in one afternoon.
-- Folding on `created_at` would have had the Bell announce "Mehraneh trained 39 times today". So the line is grouped by `day`,
-- and only days inside the Bell's own 7-day window are read, which also means a back-filled old session never rings.
-- The CONSENT test is the day too, and for the same reason. All six joined on 19 October between 14:58 and 19:16; comparing
-- `created_at >= yes_since` dropped every session logged earlier that same afternoon, so 19 October read "Coach trained"
-- when Coach, Dela, Elaheh and Nilram all had, and the week's sessions came back as 3 instead of 5. It is also how a person
-- reads it: from the day I joined, my sessions count. Nothing from a day before the yes is ever named or counted.
-- The other kinds keep `p.at >= m.yes_since`, because a moment is an instant.
--
-- ⚠️ THE BOARD IS NOT IN `get_bell()`. It was tempting (one call, and it would be cached and work offline for free), but
-- stage83 hashes get_bell()'s whole payload to answer `{"same": true}` in 78 bytes instead of the feed's few thousand —
-- Amir, 2026-10-19: *"irans internet is very slow"*. Season points move whenever anybody ticks a habit, so a board inside
-- the payload would break that saving every single day. It stays its own call, asked for at most every ten minutes, and the
-- app keeps it on the phone under its own key. The three week numbers and the names ARE in the payload, because each of them
-- can only change on the same event that changes the feed: a session, a week held, or somebody joining.
--
-- ⚠️ `leaderboard_top()` IS NOT TOUCHED. coach.html and habits.html both call it and both mean the whole board. The Crew
-- tab's board was the same function, which is why it listed 23 names — six who never answered the crew question, and Ghazal,
-- who chose *Keep it to me*, by name and level, on a screen that promises nothing of yours reaches the crew before your yes.
--
-- Rehearsed on PGlite: `scripts/career/rehearse_crew.mjs` section 16.
-- The way back: `scripts/career/rollback_stage91.sql` (puts get_bell() and crew_kind_list() back as stage85 left them and
-- drops crew_board(); the app falls back to `leaderboard_top` for the board and draws no band). Safe to re-run.

-- ── 0. The guard ────────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage91_guard$
begin
  if to_regprocedure('public.get_bell(text)') is null then
    raise exception 'stage91: stage81 (Crew and the Bell) is not on this database. Nothing was changed.';
  end if;
  if to_regprocedure('public.crew_open_now(text)') is null then
    raise exception 'stage91: stage85 (the Monthly Open) is not on this database, and this stage rewrites get_bell() over it. Nothing was changed.';
  end if;
  if to_regprocedure('public.career_scores_for(text[],interval)') is null then
    raise exception 'stage91: the score cache (career_scores_for) is not on this database. Nothing was changed.';
  end if;
end
$stage91_guard$;

-- ── 1. The kinds: a session joins the switches ──────────────────────────────────────────────────────────────────────────
-- The order is the order the account sheet lists them in, and a session is the one that happens most, so it goes first.
-- Joining the crew still has no switch: it is the yes. Every switch defaults ON (`coalesce(…, true)` wherever kinds is read),
-- so this is on for all six members the moment it is applied, which is what Amir chose.
-- ⚠️ `CREW_KINDS` in program.html is the twin of this list and carries the words. Change one, change the other.
create or replace function public.crew_kind_list() returns text[]
language sql immutable set search_path to 'public' as $function$
  select array['session', 'level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open']::text[]
$function$;

-- ── 2. The season board, crew members only ──────────────────────────────────────────────────────────────────────────────
-- Ranked by this season's points, which is what the board has always ranked by. The level comes back with it so the app can
-- put it beside a name on the crew's own list, but the board itself no longer prints it: on 20 October the live board read
-- "1. Ehsan A. LV 14 — 3,153" above "4. Elmira A. LV 29 — 1,114", because the level is lifetime and the number that sorts
-- is this season's, and the season was two days old. One ladder on one block (the app titles it *This season*).
-- Every crew member is on it, including one with no points yet: the crew is six people, not a league.
create or replace function public.crew_board(p_limit integer default 25)
returns table (pos integer, who text, points bigint, level integer, is_me boolean)
language plpgsql security definer set search_path to 'public' as $function$
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
    select m.athlete_id as aid, m.name,
           coalesce((sc.score #>> '{season,points}')::bigint, 0) as x,
           coalesce((sc.score #>> '{career,level}')::int, 1) as lv
      from mem m left join sc on sc.aid = m.athlete_id
  ),
  ranked as (
    select row_number() over (order by s.x desc, lower(s.name) asc) as rn, s.*
      from scored s
  )
  select r.rn::int, r.name, r.x, r.lv, (r.aid is not distinct from v_me)
    from ranked r
   where r.rn <= greatest(1, p_limit) or r.aid is not distinct from v_me
   order by r.rn;
end $function$;

revoke all on function public.crew_board(integer) from public, anon, authenticated;
grant execute on function public.crew_board(integer) to authenticated, service_role;

-- ── 3. The feed: the week's attendance, the band's numbers, and who is in the room ──────────────────────────────────────
-- Everything above the `sess` block is stage85's get_bell() word for word. What is new is marked NEW.
create or replace function public.get_bell(p_athlete_id text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me text := public.current_athlete_id();
  v_coach boolean := public.is_coach();
  v_report boolean := coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role');
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  v_from timestamptz := now() - interval '7 days';
  v_items jsonb; v_hon jsonb := null; v_m0 date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_week jsonb; v_crew jsonb;
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
  -- NEW: the week's attendance, ONE item a day for the whole crew. Grouped on the session's own `day`, so the career
  -- back-pay of 17 October cannot announce 39 sessions in an afternoon, and a session imported for an old day never rings.
  -- A member who has switched 'session' off is not named and not counted. `at` is only there to place the item in the
  -- feed's order: the end of its day, or now for today, so the attendance heads its own day under the app's day headings.
  sess as (
    select f.day as d, m.athlete_id, m.name, count(*) as n
      from public.career_facts f
      join mem m on m.athlete_id = f.athlete_id
     where f.void_at is null
       and f.kind in ('session_finished', 'session_finished_early', 'library_session')
       and f.day >= (current_date - 7) and f.day <= current_date
       and f.day >= coalesce((m.yes_since at time zone 'UTC')::date, f.day)
       and exists (select 1 from on_kind o where o.athlete_id = m.athlete_id and o.kind = 'session')
     group by f.day, m.athlete_id, m.name),
  sess_items as (
    select least(now(), ((s.d + 1)::timestamptz)) as at,
           jsonb_build_object(
             't', 'sess', 'key', 'sess:' || s.d::text, 'day', s.d,
             'n', sum(s.n),
             'names', coalesce(jsonb_agg(s.name order by lower(s.name)) filter (where s.athlete_id is distinct from v_id), '[]'::jsonb),
             'me', bool_or(s.athlete_id is not distinct from v_id)) as j
      from sess s group by s.d),
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
    from (select at, pinned, j from post_items
          union all select at, false, j from line_items
          union all select at, false, j from sess_items) x;

  -- NEW: the three numbers the app puts in a band at the top of Crew, and they are never all nought, because somebody
  -- always trained. Both counts read the same 7 days as the Bell, respect the same switches, and name nobody.
  with mem as (select * from public.crew_members())
  select jsonb_build_object(
           'members', (select count(*) from mem),
           'sessions', (select count(*) from public.career_facts f join mem m on m.athlete_id = f.athlete_id
                         where f.void_at is null and f.kind in ('session_finished', 'session_finished_early', 'library_session')
                           and f.day >= (current_date - 7) and f.day <= current_date
                           and f.day >= coalesce((m.yes_since at time zone 'UTC')::date, f.day)
                           and coalesce((m.kinds ->> 'session')::boolean, true)),
           'held', (select count(*) from public.career_facts f join mem m on m.athlete_id = f.athlete_id
                     where f.void_at is null and f.kind = 'week_held'
                       and f.day >= (current_date - 7) and f.day <= current_date
                       and f.day >= coalesce((m.yes_since at time zone 'UTC')::date, f.day)
                       and coalesce((m.kinds ->> 'week')::boolean, true)))
    into v_week;

  -- NEW: who is in the room. An athlete had no way to see the crew at all, and joining a room you cannot see is not
  -- joining anything. Names only — the level sits on the board, which the app already keeps on the phone.
  with mem as (select * from public.crew_members())
  select coalesce(jsonb_agg(jsonb_build_object('who', m.name, 'me', m.athlete_id is not distinct from v_id,
                                               'since', (m.first_yes_at at time zone 'UTC')::date)
                            order by lower(m.name)), '[]'::jsonb)
    into v_crew from mem m;

  -- last month's honours, from the 1st to the 14th, crew members only (and only those who keep the honour switch on)
  if extract(day from current_date) <= 14 and exists (select 1 from public.career_honour_months hm where hm.month = v_m0) then
    select jsonb_build_object('month', v_m0, 'rows', coalesce(jsonb_agg(jsonb_build_object('honour', h.honour, 'who', m.name, 'me', h.athlete_id is not distinct from v_id,
                                                                                         'value', h.value - 'slot') order by h.honour, m.name), '[]'::jsonb))
      into v_hon
      from public.career_honours h join public.crew_members() m on m.athlete_id = h.athlete_id
     where h.month = v_m0 and h.honour <> 'near' and coalesce((m.kinds ->> 'honour')::boolean, true);
  end if;

  return jsonb_build_object('athlete_id', v_id, 'me', public.crew_me(v_id), 'items', v_items, 'honours', v_hon, 'kinds', to_jsonb(public.crew_kind_list()),
                            'days', 7, 'emoji', to_jsonb(public.crew_emoji_list()), 'open', public.crew_open_now(v_id),
                            'week', v_week, 'crew', v_crew, 'at', now());
end $function$;
