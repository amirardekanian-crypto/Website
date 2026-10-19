-- stage75_career_courtside.sql — Courtside, the monthly honours, the monthly goal and "From Amir" (Career Mode round 5, step 1; 2026-10-19)
--
-- Amir's words. Round 5 (career/CAREER_MODE.md → L2, L10, L11): "Courtside first" (his recognition before any athlete feature), the honours on
-- the 1st, one simple monthly goal, and no new XP, so it does not wait for D20. The design page, three directions, A picked ("Go with your picks",
-- 2026-10-19): https://claude.ai/artifact/L3Tt3B6YPqMWcVgnN7nt9g. His three calls: direction A (a Courtside panel at the top of Today's right
-- column, the honours at its top in a month's first week, the goal and his line in each athlete's header); athletes see the goal, his line and
-- "Amir saw this" with the light screens (step 3), not before; a tie shares an honour.
--
-- What this adds, and nothing else:
--   1. Five tables, coach-only (select for the coach so the backup reads them; every write goes through a function below):
--        courtside_marks       Amir's Saw it / sent on a moment (one row per award he touched)
--        career_honours        the month's honours once frozen: one row per winner (a tie is several rows), Amir's Pick included
--        career_honour_months  one row per month whose honours are frozen, and what Amir decided for his Pick (an athlete, or nobody)
--        career_goals          one line per athlete per month, written by Amir, and the day he ticked it done
--        career_notes          "From Amir": one line per athlete per day (no badge, no XP; the commendation of the old phase 4, without the badge)
--   2. Helpers: career_is_client(), career_main_lift_names() (the main-lift rule of D18, read from Double Up's catalogue row, a twin of
--      stage73's `ks`/`sp`), career_honours_live() (the month worked out from the facts).
--   3. The coach's functions: get_courtside(), coach_courtside_mark(), coach_honours(), coach_honours_freeze(), coach_honours_sent(),
--      coach_honours_pick(), coach_set_goal(), coach_goal_done(), coach_from_amir().
--   4. coach_erase_person() learns the four tables with an athlete_id (patched in place, as stage63, 66, 69 and 70).
--
-- What it does NOT touch: the scorer, the rulebook, the catalogue, career_facts, career_awards, career_mint(), career_recognition, get_profile(),
-- any XP or level (L11; nobody's number moves). Courtside READS career_awards; it writes no coach row anywhere (the old phase 4 spec's route
-- through career_mint() and career_recognition is not taken: a read needs no hunk in the scorer).
--
-- The rules it follows (career/PROCEDURES.md → "Stage 75: Courtside, as built"):
--   · Courtside: awards minted LIVE (never the go-day's baseline back-pay), from highlight up, of the kinds that stay after the cut: the four
--     numbers' marks (held_weeks, century, bests, comebacks) and every achievement. The week is the page's (Monday 00:00 to Monday, Amir's clock),
--     by when the server minted the award.
--   · Most sessions (D19): the plan sessions career_facts_paid() pays, dated in the month. Everyone on the top count shares it (at least one).
--   · Most improved (D18, PROG-01): career_cycle_wins() over the month (each lift's first session in the month against its best since, at the
--     same effort, the wins card's own rule), on main lifts only (career_main_lift_names()); the biggest percent, rounded to 0.1, shares.
--   · Full Month: every training week that ENDS in the month was held (a week_held fact for it), and at least 4 such weeks. "One week short" =
--     at least 4 weeks and exactly one not held (shown to Amir as a near miss).
--   · Amir's Pick: a shortlist of three different people (most weeks held in the month, biggest main-lift gain, most comebacks), or nobody. It is
--     an honour, no title (titles are removed, L5).
--   · Not clients: the demo, former athletes and the ids coach.html passes as p_not_clients (its SYSTEM_IDS and AMIR_ATHLETE_ID, Amir's own
--     login: the same set as its inTotals()) are never in Courtside or an honour. The page passes its list because this file cannot name that
--     login (the pre-commit id guard keeps athlete ids out of public files); called without it (the SQL editor), only the demo and former
--     athletes are left out.
--   · A month's honours are worked out live until frozen. coach.html freezes them when Amir first sends or picks, and from the 8th of the next
--     month; frozen rows never change (a late session no longer moves a winner).
--
-- Rehearsed on PGlite: scripts/career/rehearse_courtside.mjs (the schema snapshot, the backup's real facts, made-up live awards; twice; the way back).
-- The way back: scripts/career/rollback_stage75.sql (drops the functions and the four tables, puts coach_erase_person()'s list back). Nothing
-- else depends on them. Safe to re-run this file.

-- ── 0. The guard: the stages this one reads must be there ───────────────────────────────────────────────────────────────
do $stage75_guard$
begin
  if to_regclass('public.career_awards') is null then
    raise exception 'stage75: public.career_awards is missing (stage70 first). Nothing was changed.';
  end if;
  if to_regprocedure('public.career_maxpct_key(jsonb)') is null then
    raise exception 'stage75: public.career_maxpct_key(jsonb) is missing (stage73 first). Nothing was changed.';
  end if;
  if to_regprocedure('public.career_cycle_wins(text,date,date,text[],jsonb)') is null
     or to_regprocedure('public.career_facts_paid(text)') is null or to_regprocedure('public.career_weeks(text)') is null then
    raise exception 'stage75: career_cycle_wins(), career_facts_paid() or career_weeks() is missing (stages 66 to 70). Nothing was changed.';
  end if;
end
$stage75_guard$;

-- ── 1. Tables ──────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.courtside_marks (
  athlete_id text        not null,
  award_id   text        not null,
  saw_at     timestamptz,                         -- Saw it (or sent): the row leaves Courtside for "Seen"; from step 3 the athlete sees "Amir saw this"
  sent_at    timestamptz,                         -- WhatsApp or Copy tapped
  updated_at timestamptz not null default now(),
  primary key (athlete_id, award_id)
);
create table if not exists public.career_honour_months (
  month     date        primary key check (month = date_trunc('month', month)::date),
  frozen_at timestamptz not null default now(),
  pick      text        check (pick in ('picked', 'nobody')),   -- null: Amir has not decided his Pick yet
  pick_at   timestamptz
);
create table if not exists public.career_honours (
  month      date        not null check (month = date_trunc('month', month)::date),
  honour     text        not null check (honour in ('sessions', 'improved', 'full_month', 'near', 'pick')),   -- near: one week short of a Full Month
  athlete_id text        not null,
  value      jsonb       not null default '{}'::jsonb,   -- {"n": 14} · {"lift": "Barbell Back Squat", "pct": 27.1} · {"weeks": 4} · {"held": 3, "weeks": 4} · {"slot": "gain", ...}
  sent_at    timestamptz,                                -- Amir sent this winner's WhatsApp (or copied it)
  created_at timestamptz not null default now(),
  primary key (month, honour, athlete_id)
);
create table if not exists public.career_goals (
  athlete_id text        not null,
  month      date        not null check (month = date_trunc('month', month)::date),
  line       text        not null check (char_length(btrim(line)) between 1 and 140),
  done_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (athlete_id, month)
);
create table if not exists public.career_notes (
  athlete_id text        not null,
  day        date        not null,                       -- Amir's day: one line per athlete per day (a double tap cannot send two)
  line       text        not null check (char_length(btrim(line)) between 1 and 90),
  award_id   text,                                       -- the moment it answers, when written from one (null: from the athlete's header)
  created_at timestamptz not null default now(),
  read_at    timestamptz,                                -- step 3: the athlete's app marks it read; until then Amir can take it back
  primary key (athlete_id, day)
);

-- ── 2. Policies and grants: the coach reads (so the backup is complete); nobody writes except through the functions ──────────────
do $stage75_policies$
declare t text;
begin
  foreach t in array array['courtside_marks', 'career_honour_months', 'career_honours', 'career_goals', 'career_notes'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'coach reads ' || replace(t, '_', ' ')) then
      execute format('create policy %I on public.%I for select to authenticated using ((select public.is_coach()))', 'coach reads ' || replace(t, '_', ' '), t);
    end if;
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end
$stage75_policies$;

-- ── 3. Helpers ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Who Courtside and the honours may name: not the demo, not a former athlete (athlete_status, stage63), not one of p_not_clients (coach.html
-- passes its SYSTEM_IDS and AMIR_ATHLETE_ID). The same set as coach.html's inTotals().
create or replace function public.career_is_client(p_athlete text, p_not_clients text[] default '{}') returns boolean
language sql stable set search_path to 'public' as $function$
  select coalesce(p_athlete, '') not in ('', 'demo')
     and not (p_athlete = any (coalesce(p_not_clients, '{}'::text[])))
     and not exists (select 1 from public.athlete_status s where s.athlete_id = p_athlete and s.status = 'former')
$function$;

-- The names (career_norm()) of the lifts D18's main-lift rule counts: an approved Spine entry on one of the patterns, with one of the qualities,
-- not on the exclude list, by its name or any alias. The rule is Double Up's catalogue row (an achievement, so it stays after the cut; check_twins.js
-- §10 holds it equal to The Upgrade's), turned into its key by career_maxpct_key(). A TWIN of stage73's `ks` and `sp` in career_measures(): change both.
-- Fails closed: no Double Up row, a key with no patterns, or an exclude id with no row in the Spine → no lift at all (no Most improved that month).
create or replace function public.career_main_lift_names() returns setof text
language plpgsql stable set search_path to 'public' as $function$
declare
  v_k text; v_pats text[]; v_qs text[]; v_xs text[];
begin
  select public.career_maxpct_key(c.body) into v_k from public.career_catalogue c where c.kind = 'achievement' and c.id = 'double_up';
  if v_k is null or v_k not like 'maxpct:%' then return; end if;
  v_pats := string_to_array(substr(split_part(v_k, '|', 1), 8), ',');
  v_qs := (select string_to_array(substr(p.x, 3), ',') from unnest((string_to_array(v_k, '|'))[2:]) p(x) where p.x like 'q:%' limit 1);
  v_xs := (select string_to_array(substr(p.x, 3), ',') from unnest((string_to_array(v_k, '|'))[2:]) p(x) where p.x like 'x:%' limit 1);
  if v_xs is not null and exists (select 1 from unnest(v_xs) i(id) where not exists (select 1 from public.exercises e where e.id = i.id)) then
    return;
  end if;
  return query
    select distinct public.career_norm(n.x)
      from public.exercises e cross join unnest(array[e.name] || coalesce(e.aliases, '{}'::text[])) n(x)
     where e.status = 'approved' and e.pattern = any (v_pats)
       and (v_qs is null or e.qualities && v_qs) and (v_xs is null or e.id <> all (v_xs));
end $function$;

-- One month's honours, worked out from the facts as they stand now. p_month is any day of the month.
-- {"month", "sessions": {"n", "who": [ids]}, "improved": {"pct", "who": [{"athlete_id", "lift", "pct"}]},
--  "full_month": {"who": [{"athlete_id", "weeks"}], "near": [{"athlete_id", "held", "weeks"}]},
--  "shortlist": [{"slot": "weeks_held"|"gain"|"comeback", "athlete_id", ...}]}
create or replace function public.career_honours_live(p_month date, p_not_clients text[] default '{}') returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare
  m0 date := date_trunc('month', p_month)::date;
  m1 date := (date_trunc('month', p_month) + interval '1 month')::date - 1;
  v_rules jsonb := jsonb_set(public.career_rules_now(), '{fact,effort_win,limit}', '1000'::jsonb, true);   -- every win, not the top three
  v_out jsonb;
begin
  with
  _cs_people as (
    select p.athlete_id from public.programs p
     where public.career_is_client(p.athlete_id, p_not_clients)
       and exists (select 1 from public.career_facts f where f.athlete_id = p.athlete_id and f.void_at is null and f.day between m0 and m1)),
  paid as (
    select pp.athlete_id, count(*)::int as n
      from _cs_people pp cross join lateral public.career_facts_paid(pp.athlete_id) x
     where x.kind in ('session_finished', 'session_finished_early') and x.day between m0 and m1
     group by pp.athlete_id),
  mains as (select nm from public.career_main_lift_names() nm),
  wins as (
    select pp.athlete_id, w.name, round(w.gain * 100, 1) as pct
      from _cs_people pp cross join lateral public.career_cycle_wins(pp.athlete_id, m0, m1, null, v_rules) w
     where public.career_norm(w.name) in (select nm from mains)),
  best_win as (
    select distinct on (athlete_id) athlete_id, name, pct from wins order by athlete_id, pct desc, name),
  wk as (
    select pp.athlete_id, w.cycle_num, w.week,
           exists (select 1 from public.career_facts f where f.athlete_id = pp.athlete_id and f.kind = 'week_held' and f.void_at is null
                     and f.ref = 'c' || w.cycle_num || '|w' || w.week) as held
      from _cs_people pp cross join lateral public.career_weeks(pp.athlete_id) w
     where w.wto between m0 and m1 and coalesce(array_length(w.plan, 1), 0) > 0),
  wk_sum as (select athlete_id, count(*)::int as weeks, count(*) filter (where held)::int as held from wk group by athlete_id),
  held_in as (
    select f.athlete_id, count(*)::int as n from public.career_facts f join _cs_people pp using (athlete_id)
     where f.kind = 'week_held' and f.void_at is null and f.day between m0 and m1 group by f.athlete_id),
  back_in as (
    select f.athlete_id, count(*)::int as n, max(public.career_num(f.value -> 'gone')) as gone
      from public.career_facts f join _cs_people pp using (athlete_id)
     where f.kind in ('training_return', 'bounce_back', 'comeback') and f.void_at is null and f.day between m0 and m1
     group by f.athlete_id),
  top_paid as (select max(n) as n from paid),
  top_win as (select max(pct) as pct from best_win),
  s1 as (select athlete_id, n from held_in order by n desc, athlete_id limit 1),
  s2 as (select athlete_id, name, pct from best_win where athlete_id not in (select athlete_id from s1) order by pct desc, athlete_id limit 1),
  s3 as (select athlete_id, n, gone from back_in
          where athlete_id not in (select athlete_id from s1) and athlete_id not in (select athlete_id from s2)
          order by n desc, gone desc nulls last, athlete_id limit 1)
  select jsonb_build_object(
    'month', m0,
    'sessions', jsonb_build_object('n', (select n from top_paid),
                  'who', coalesce((select jsonb_agg(p.athlete_id order by p.athlete_id) from paid p, top_paid t where p.n = t.n and t.n >= 1), '[]'::jsonb)),
    'improved', jsonb_build_object('pct', (select pct from top_win),
                  'who', coalesce((select jsonb_agg(jsonb_build_object('athlete_id', b.athlete_id, 'lift', b.name, 'pct', b.pct) order by b.athlete_id)
                                     from best_win b, top_win t where b.pct = t.pct and t.pct > 0), '[]'::jsonb)),
    'full_month', jsonb_build_object(
                  'who', coalesce((select jsonb_agg(jsonb_build_object('athlete_id', w.athlete_id, 'weeks', w.weeks) order by w.athlete_id)
                                     from wk_sum w where w.weeks >= 4 and w.held = w.weeks), '[]'::jsonb),
                  'near', coalesce((select jsonb_agg(jsonb_build_object('athlete_id', w.athlete_id, 'held', w.held, 'weeks', w.weeks) order by w.athlete_id)
                                      from wk_sum w where w.weeks >= 4 and w.held = w.weeks - 1), '[]'::jsonb)),
    'shortlist', coalesce((select jsonb_agg(x.o order by x.k) from (
                    select 1 as k, jsonb_build_object('slot', 'weeks_held', 'athlete_id', athlete_id, 'n', n) as o from s1 where n > 0
                    union all select 2, jsonb_build_object('slot', 'gain', 'athlete_id', athlete_id, 'lift', name, 'pct', pct) from s2 where pct > 0
                    union all select 3, jsonb_build_object('slot', 'comeback', 'athlete_id', athlete_id, 'n', n, 'gone', gone) from s3 where n > 0) x), '[]'::jsonb))
  into v_out;
  return v_out;
end $function$;

-- ── 4. Courtside: the week's moments, for the coach ───────────────────────────────────────────────────────────────────
-- p_from / p_to: the page's week (Monday 00:00 to the next Monday, Amir's clock). Every row of the week comes back, marked or not; the page draws
-- the unmarked ones (at most five groups, biggest first) and folds the rest under "Seen".
create or replace function public.get_courtside(p_from timestamptz, p_to timestamptz, p_not_clients text[] default '{}') returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '35 days' then
    raise exception 'get_courtside: give a window of at most 35 days (from %, to %)', p_from, p_to;
  end if;
  return jsonb_build_object('rows', coalesce((
    select jsonb_agg(jsonb_build_object(
             'athlete_id', a.athlete_id, 'award_id', a.award_id, 'kind', a.kind, 'item', a.item, 'tier', a.tier, 'day', a.day,
             'size', a.size, 'at', a.created_at,
             'spec', public.career_award_spec(a.kind, a.item, a.tier, a.day, a.evidence, c.body),
             'evidence', a.evidence,
             'facts', (select coalesce(jsonb_agg(jsonb_build_object('kind', f.kind, 'ref', f.ref, 'day', f.day, 'value', f.value)), '[]'::jsonb)
                         from jsonb_array_elements(coalesce(a.evidence -> 'facts', '[]'::jsonb)) e(x)
                         join public.career_facts f on f.athlete_id = a.athlete_id and f.kind = e.x ->> 'kind' and f.ref = e.x ->> 'ref'),
             'saw_at', m.saw_at, 'sent_at', m.sent_at)
           order by a.created_at desc, a.award_id)
      from public.career_awards a
      left join public.career_catalogue c on c.kind = a.kind and c.id = a.item
      left join public.courtside_marks m on m.athlete_id = a.athlete_id and m.award_id = a.award_id
     where a.how = 'live' and a.created_at >= p_from and a.created_at < p_to
       and a.size in ('highlight', 'milestone', 'legend')
       and (a.kind = 'achievement' or (a.kind = 'badge' and a.item in ('held_weeks', 'century', 'bests', 'comebacks')))
       and public.career_is_client(a.athlete_id, p_not_clients)), '[]'::jsonb));
end $function$;

-- Saw it ('saw'), WhatsApp or Copy ('sent': it is seen too), or Undo ('undo': back on Courtside). Returns how many of the ids were that
-- athlete's live awards (a re-tap is not a failure; 0 means none of those ids is theirs, and the page says so).
create or replace function public.coach_courtside_mark(p_athlete_id text, p_award_ids text[], p_what text) returns integer
language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_n integer;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if p_what not in ('saw', 'sent', 'undo') then raise exception 'coach_courtside_mark: % is not saw, sent or undo', p_what; end if;
  if p_what = 'undo' then
    delete from public.courtside_marks m where m.athlete_id = p_athlete_id and m.award_id = any (p_award_ids);
    select count(*)::int into v_n from public.career_awards a where a.athlete_id = p_athlete_id and a.award_id = any (p_award_ids);
    return v_n;
  end if;
  insert into public.courtside_marks as m (athlete_id, award_id, saw_at, sent_at)
    select a.athlete_id, a.award_id, now(), case when p_what = 'sent' then now() end
      from public.career_awards a where a.athlete_id = p_athlete_id and a.award_id = any (p_award_ids) and a.how = 'live'
  on conflict (athlete_id, award_id) do update
     set saw_at = coalesce(m.saw_at, excluded.saw_at), sent_at = coalesce(m.sent_at, excluded.sent_at), updated_at = now();
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

-- ── 5. The honours ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- One month's honours for the page: the frozen rows once frozen, else the live work; plus the Pick (decided or its shortlist) and what was sent.
-- Only a month that has ended: the current month has no honours yet.
create or replace function public.coach_honours(p_month date, p_not_clients text[] default '{}') returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  m0 date := date_trunc('month', p_month)::date;
  v_m public.career_honour_months;
  v_live jsonb;
  v_rows jsonb;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if m0 >= date_trunc('month', current_date)::date then raise exception 'coach_honours: % has not ended yet', to_char(m0, 'FMMonth YYYY'); end if;
  select * into v_m from public.career_honour_months where month = m0;
  select coalesce(jsonb_agg(jsonb_build_object('honour', h.honour, 'athlete_id', h.athlete_id, 'value', h.value, 'sent_at', h.sent_at)
                            order by h.honour, h.athlete_id), '[]'::jsonb)
    into v_rows from public.career_honours h where h.month = m0;
  if v_m.month is null or v_m.pick is null then v_live := public.career_honours_live(m0, p_not_clients); end if;
  return jsonb_build_object(
    'month', m0, 'frozen', v_m.month is not null, 'frozen_at', v_m.frozen_at, 'pick', v_m.pick, 'pick_at', v_m.pick_at,
    'pick_open', current_date < (m0 + interval '2 months')::date,
    'rows', v_rows,
    'live', case when v_m.month is null then v_live end,
    'shortlist', case when v_m.pick is null then v_live -> 'shortlist' end);
end $function$;

-- Freeze a month: write its winners as rows (a tie is several rows), once. Re-running does nothing. Returns coach_honours().
create or replace function public.coach_honours_freeze(p_month date, p_not_clients text[] default '{}') returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  m0 date := date_trunc('month', p_month)::date;
  v jsonb;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if m0 >= date_trunc('month', current_date)::date then raise exception 'coach_honours_freeze: % has not ended yet', to_char(m0, 'FMMonth YYYY'); end if;
  perform pg_advisory_xact_lock(hashtext('career:honours:' || m0));
  if exists (select 1 from public.career_honour_months where month = m0) then return public.coach_honours(m0, p_not_clients); end if;
  v := public.career_honours_live(m0, p_not_clients);
  insert into public.career_honour_months (month) values (m0);
  insert into public.career_honours (month, honour, athlete_id, value)
    select m0, 'sessions', x, jsonb_build_object('n', (v -> 'sessions' ->> 'n')::int) from jsonb_array_elements_text(v -> 'sessions' -> 'who') x
    union all
    select m0, 'improved', e ->> 'athlete_id', jsonb_build_object('lift', e ->> 'lift', 'pct', (e ->> 'pct')::numeric) from jsonb_array_elements(v -> 'improved' -> 'who') e
    union all
    select m0, 'full_month', e ->> 'athlete_id', jsonb_build_object('weeks', (e ->> 'weeks')::int) from jsonb_array_elements(v -> 'full_month' -> 'who') e
    union all
    select m0, 'near', e ->> 'athlete_id', jsonb_build_object('held', (e ->> 'held')::int, 'weeks', (e ->> 'weeks')::int) from jsonb_array_elements(v -> 'full_month' -> 'near') e;
  return public.coach_honours(m0, p_not_clients);
end $function$;

-- Amir sent (or copied) one winner's message. Returns 1, or 0 when that honour has no such winner (not frozen yet: freeze first).
create or replace function public.coach_honours_sent(p_month date, p_honour text, p_athlete_id text) returns integer
language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_n integer;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  update public.career_honours set sent_at = coalesce(sent_at, now())
   where month = date_trunc('month', p_month)::date and honour = p_honour and athlete_id = p_athlete_id;
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

-- Amir's Pick: an athlete (any client), or nobody (p_athlete_id null). Freezes the month first. Once decided it stays decided (a typo is
-- fixed in the SQL editor, on purpose). Open until the end of the month after (October's pick: until 30 November).
create or replace function public.coach_honours_pick(p_month date, p_athlete_id text, p_not_clients text[] default '{}') returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  m0 date := date_trunc('month', p_month)::date;
  v_live jsonb; v_slot jsonb;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if current_date >= (m0 + interval '2 months')::date then raise exception '% can no longer be picked', to_char(m0, 'FMMonth YYYY'); end if;
  perform public.coach_honours_freeze(m0, p_not_clients);
  perform pg_advisory_xact_lock(hashtext('career:honours:' || m0));
  if (select pick from public.career_honour_months where month = m0) is not null then
    raise exception 'Your % pick is already decided', to_char(m0, 'FMMonth YYYY');
  end if;
  if p_athlete_id is null then
    update public.career_honour_months set pick = 'nobody', pick_at = now() where month = m0;
    return public.coach_honours(m0, p_not_clients);
  end if;
  if not exists (select 1 from public.programs where athlete_id = p_athlete_id) then raise exception 'no such athlete: %', p_athlete_id; end if;
  if not public.career_is_client(p_athlete_id, p_not_clients) then
    raise exception 'not a client: the demo, a former athlete and your own login are never picked';
  end if;
  v_live := public.career_honours_live(m0, p_not_clients);
  select e into v_slot from jsonb_array_elements(coalesce(v_live -> 'shortlist', '[]'::jsonb)) e where e ->> 'athlete_id' = p_athlete_id limit 1;
  insert into public.career_honours (month, honour, athlete_id, value) values (m0, 'pick', p_athlete_id, coalesce(v_slot, '{}'::jsonb));
  update public.career_honour_months set pick = 'picked', pick_at = now() where month = m0;
  return public.coach_honours(m0, p_not_clients);
end $function$;

-- ── 6. The monthly goal and "From Amir" ────────────────────────────────────────────────────────────────────────────────
-- Write, rewrite or clear (empty line) an athlete's goal for a month. A goal already ticked done is not cleared. Returns the row (or null).
create or replace function public.coach_set_goal(p_athlete_id text, p_month date, p_line text) returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  m0 date := date_trunc('month', p_month)::date;
  v_line text := btrim(regexp_replace(coalesce(p_line, ''), '\s+', ' ', 'g'));
  r public.career_goals;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if not exists (select 1 from public.programs where athlete_id = p_athlete_id) then raise exception 'no such athlete: %', p_athlete_id; end if;
  if m0 < (date_trunc('month', current_date) - interval '1 month')::date or m0 > (date_trunc('month', current_date) + interval '1 month')::date then
    raise exception 'a goal is for last month, this month or next month (not %)', to_char(m0, 'FMMonth YYYY');
  end if;
  if v_line ~ '[[:cntrl:]]' then raise exception 'the goal has a control character'; end if;
  if v_line = '' then
    delete from public.career_goals where athlete_id = p_athlete_id and month = m0 and done_at is null;
    if found then return null; end if;
    if exists (select 1 from public.career_goals where athlete_id = p_athlete_id and month = m0) then
      raise exception 'that goal is ticked done: untick it first to clear it';
    end if;
    return null;
  end if;
  if char_length(v_line) > 140 then raise exception 'a goal is at most 140 characters (this one is %)', char_length(v_line); end if;
  insert into public.career_goals as g (athlete_id, month, line) values (p_athlete_id, m0, v_line)
  on conflict (athlete_id, month) do update set line = excluded.line, updated_at = now()
  returning * into r;
  return to_jsonb(r);
end $function$;

create or replace function public.coach_goal_done(p_athlete_id text, p_month date, p_done boolean) returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare r public.career_goals;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  update public.career_goals set done_at = case when p_done then coalesce(done_at, now()) end, updated_at = now()
   where athlete_id = p_athlete_id and month = date_trunc('month', p_month)::date
  returning * into r;
  if r.athlete_id is null then raise exception 'no goal for % in %', p_athlete_id, to_char(p_month, 'FMMonth YYYY'); end if;
  return to_jsonb(r);
end $function$;

-- "From Amir": one line (1 to 90 characters) for an athlete on Amir's day, shown in their app from step 3. An empty line takes back that day's
-- line while it is unread. p_day is the coach's own day (within a day of the server's, any time zone).
create or replace function public.coach_from_amir(p_athlete_id text, p_day date, p_line text, p_award_id text default null) returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_line text := btrim(regexp_replace(coalesce(p_line, ''), '\s+', ' ', 'g'));
  r public.career_notes;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if p_day is null or p_day not between current_date - 1 and current_date + 1 then raise exception 'from_amir: % is not today', p_day; end if;
  if not exists (select 1 from public.programs where athlete_id = p_athlete_id) then raise exception 'no such athlete: %', p_athlete_id; end if;
  if v_line = '' then
    delete from public.career_notes where athlete_id = p_athlete_id and day = p_day and read_at is null;
    if not found and exists (select 1 from public.career_notes where athlete_id = p_athlete_id and day = p_day) then
      raise exception 'they have read it already: it stays';
    end if;
    return null;
  end if;
  if not public.career_is_client(p_athlete_id) then raise exception 'not a client: the demo and a former athlete get no line'; end if;
  if v_line ~ '[[:cntrl:]]' then raise exception 'the line has a control character'; end if;
  if char_length(v_line) > 90 then raise exception 'one line is at most 90 characters (this one is %)', char_length(v_line); end if;
  if p_award_id is not null and not exists (select 1 from public.career_awards a where a.athlete_id = p_athlete_id and a.award_id = p_award_id) then
    raise exception 'that moment is not %''s', p_athlete_id;
  end if;
  insert into public.career_notes (athlete_id, day, line, award_id) values (p_athlete_id, p_day, v_line, p_award_id)
  on conflict (athlete_id, day) do nothing
  returning * into r;
  if r.athlete_id is null then raise exception 'one line a day: % already has one today (take it back first to change it)', p_athlete_id; end if;
  return to_jsonb(r);
end $function$;

-- ── 7. Grants on the functions: helpers for the service role only, the coach's functions for authenticated (each checks is_coach()) ──
revoke all on function public.career_is_client(text, text[]) from public, anon, authenticated;
revoke all on function public.career_main_lift_names() from public, anon, authenticated;
revoke all on function public.career_honours_live(date, text[]) from public, anon, authenticated;
grant execute on function public.career_is_client(text, text[]) to service_role;
grant execute on function public.career_main_lift_names() to service_role;
grant execute on function public.career_honours_live(date, text[]) to service_role;
do $stage75_grants$
declare f text;
begin
  foreach f in array array['public.get_courtside(timestamptz,timestamptz,text[])', 'public.coach_courtside_mark(text,text[],text)',
                           'public.coach_honours(date,text[])', 'public.coach_honours_freeze(date,text[])', 'public.coach_honours_sent(date,text,text)',
                           'public.coach_honours_pick(date,text,text[])', 'public.coach_set_goal(text,date,text)', 'public.coach_goal_done(text,date,boolean)',
                           'public.coach_from_amir(text,date,text,text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end
$stage75_grants$;

-- ── 8. coach_erase_person() learns the four tables with an athlete_id (career_honour_months has none) ─────────────────────
do $stage75_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''career_recognition'']';
  s_new constant text := '''career_recognition'', ''courtside_marks'', ''career_honours'', ''career_goals'', ''career_notes'']';
  n integer;
begin
  if position(s_new in d) > 0 then
    return;   -- already patched (a re-run)
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage75: coach_erase_person() is not what this patch expects (the end of its table list was found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $stage75_patch$;
