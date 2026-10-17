-- stage68 — Career Mode, phase 2: the XP switch (2026-10-17; Amir: "go with your picks, but the season starts tomorrow"; career/CAREER_MODE.md
-- → The decisions, phase 2, and career/PROCEDURES.md P3, P4, P10, P13, P14 and "Phase 2, as built"). Safe to re-run.
--
-- Amir's three decisions of 2026-10-17, in the database:
--   1. The switch is split in two (rulebook.toml → [switch]). XP now: training earns XP, the locked WORKOUT habit pays 0 a day so a session is
--      never paid twice, a closed habit day settles, and the level is the career level (never resets). The catalogue later (phase 3): the
--      entries gated on it in badges.toml and achievements.toml. Each switch is "off" until a seed turns it on, with the day; it never goes back.
--   2. Nobody's level goes down. The seed that turns the XP switch on gives an athlete whose career level would be below the highest level
--      they reached in AA Proof ONE level_kept fact that brings them to it (career_keep_levels()).
--   3. Season 1 starts on 2026-10-18 (start_season(), Proof's way). Season points are derived from the facts, never stored, so at the switch
--      the board is worked out again from the season's first day under the new rules, training included (career_compute()).
--
-- What it adds or changes:
--   · career_switch_day() and career_xp_on(): the two switches, read from the newest rulebook. A rulebook from before them (version 1,
--     [shadow] on = true) has both off.
--   · career_paid_rules(): Proof's habit rules as the DAILY XP pays them: with the XP switch on, the locked habits pay 0 (the session fact
--     pays). The day gate, the tiers and the milestones keep Proof's weights until the catalogue switch. career_score() uses it.
--   · career_settled_before(): a closed day settles once the XP switch is on (P1 step 4; built in stage66, waiting for this).
--   · career_facts_paid(): every fact outside the habit half, priced within its caps, one row each. A fact whose rulebook entry says
--     xp_from = "value" pays its own value.xp (level_kept), and a career_only one never counts toward a season or a week.
--   · career_scores, a cache of each athlete's score (career XP and level, season points, the rolling week), worked out again whenever what it
--     rests on changes (career_stamp(): the rulebook, Amir's quest runs, the season, the day, the athlete's facts and programme). The level is
--     derived from every fact of a career, which takes up to a second for the longest log (2026-10-17), so the board reads this cache and
--     works out again only what changed, within a time budget (career_scores_for()). Nothing in it is a source: delete a row and it comes back.
--   · get_profile() reads the cache and answers, besides what phase 1 returned, the switches, the rolling week, the first day the athlete
--     logged anything (the reveal's date), the level kept at the switch, and the prices the apps preview a tap with (P13, P17).
--   · With the XP switch on: leaderboard_top() ranks season points (or the rolling week's) with the career level and rank beside each name;
--     hab_season_level() is the career level, so the road's titles (hab_mint_titles(), set_title()) follow it and coach_season_levels() shows
--     it; hab_close_season() archives a season's points and the career level at its end, and gives its title to [season] title_points or more.
--     With it off, all four behave exactly as before. hab_proof_level() keeps Proof's own season level, for the switch's report.
--   · career_keep_levels() writes the level kept (decision 2), once, at the switch.
--   · career_seed() refuses a switch turned back off or a switch day still to come; a seed that only turns a switch on runs no backfill (the
--     facts do not depend on a switch: nothing to redo, and no athlete's save waits behind a long lock); the seed that turns the XP switch on
--     writes the levels kept and returns every athlete's line (Proof's level, the career level, the level kept). p_dry_run => true does all of
--     it and undoes it: that is how the list Amir sees before the switch is made.
--   · career_compare() keeps working after the switch: both sides pay the locked habits 0, and a row that differs only because a closed day
--     settled is not a failure (P1 step 4).
--   · coach_erase_person() learns career_scores (patched in place, as stage63 and stage66).
--
-- Rehearsed 2026-10-17 away from the live project: scripts/career/rehearse.mjs (PGlite, the schema snapshot, a full backup of the real rows,
-- stage66 and its seed, then this file, the switch and made-up athletes through the real doors). The way back: scripts/career/rollback_stage68.sql.

-- ── 1. the two switches ──────────────────────────────────────────────────────────────────────────────────────────────────

-- The day a switch was turned on (rulebook.toml → [switch]: "xp" for phase 2, "catalogue" for phase 3), or null while it is off ("off").
-- A day still to come counts as off: career_seed() refuses one, and a rulebook from before the switches (version 1) has neither.
create or replace function public.career_switch_day(p_rules jsonb, p_which text) returns date
language plpgsql stable set search_path to 'public' as $function$
declare v text := p_rules #>> array['switch', p_which]; d date;
begin
  if v is null or v !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  begin
    d := v::date;
  exception when others then
    return null;
  end;
  return case when d <= current_date then d end;
end $function$;

-- Is the XP switch on, by the newest rulebook?
create or replace function public.career_xp_on() returns boolean
language sql stable set search_path to 'public' as $function$
  select public.career_switch_day(public.career_rules_now(), 'xp') is not null
$function$;

-- The first day that is still open on Proof's log once the XP switch is on (today and [habits] backfill_days before it, plus one day so no
-- time zone closes a day early); null while it is off, when Career Mode follows the log the way Proof does (P1 step 4).
create or replace function public.career_settled_before(p_rules jsonb) returns date
language sql stable set search_path to 'public' as $function$
  select case when public.career_switch_day(p_rules, 'xp') is null then null
              else current_date - (coalesce((p_rules #>> '{habits,backfill_days}')::int, 3) + 1) end
$function$;

-- Proof's habit rules (career_habit_rules()) as the DAILY XP pays them. Once the XP switch is on, the locked habits ([habits] locked: WORKOUT,
-- which only a finished session ticks) pay 0 a day: the session fact pays instead (decision 4), so a session is never paid twice. hab_xp()
-- alone is given this copy. The day gate, the consistency tiers and the milestones keep Proof's weights through hab_bonus_xp(): the habit
-- stays on the day's list for the day streak, and its tiers, HEAVY METAL and THE MACHINIST stop at the catalogue switch (phase 3), not before.
create or replace function public.career_paid_rules(p_habit_rules jsonb, p_rules jsonb) returns jsonb
language sql stable set search_path to 'public' as $function$
  select case when p_habit_rules is null or public.career_switch_day(p_rules, 'xp') is null then p_habit_rules
              else jsonb_set(p_habit_rules, '{weights}',
                             coalesce(p_habit_rules -> 'weights', '{}'::jsonb)
                             || coalesce((select jsonb_object_agg(l.value, 0)
                                            from jsonb_array_elements_text(case when jsonb_typeof(p_habit_rules -> 'unearnable') = 'array'
                                                                                then p_habit_rules -> 'unearnable' else '[]'::jsonb end) l),
                                         '{}'::jsonb)) end
$function$;

-- ── 2. what the facts pay ────────────────────────────────────────────────────────────────────────────────────────────────

-- Every fact that is not the habit half, priced from the rulebook within its caps, one row each (a fact a cap leaves out is not returned):
-- [fact.<kind>] xp, or the fact's own value.xp where the rulebook says xp_from = "value" (the level kept at the switch). career_only marks a
-- fact that counts toward the career and never toward a season or a week. The caps as in stage66: one session per plan day per training
-- week, finished or early, the better one paying; two Library sessions a week; three effort wins a cycle. The habit half (habit_done, the
-- day facts, comebacks) is paid by hab_xp() and hab_bonus_xp() in career_score() and career_compute().
create or replace function public.career_facts_paid(p_athlete text)
returns table (kind text, ref text, day date, xp numeric, career_only boolean)
language sql stable set search_path to 'public' as $function$
  with r as (select public.career_rules_now() as j),
  f as (
    select f.kind, f.ref, f.day, f.value from public.career_facts f
     where f.athlete_id = p_athlete and f.void_at is null
       and f.kind not in ('habit_done', 'habit_day', 'day_on_target', 'perfect_day', 'workout_tick', 'comeback')
  ),
  priced as (
    select f.*,
           case when r.j -> 'fact' -> f.kind ->> 'xp_from' = 'value' then coalesce(public.career_num(f.value -> 'xp'), 0)
                else coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'xp'), 0) end as xp,
           coalesce(r.j -> 'fact' -> f.kind -> 'career_only' = 'true'::jsonb, false) as conly,
           r.j -> 'fact' -> f.kind ->> 'limit_per' as per,
           coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'limit'), 0) as lim
      from f, r
  ),
  weeks as (select * from public.career_weeks(p_athlete)),
  keyed as (
    select p.*,
           case p.per
             when 'plan_day_week' then
               coalesce((select 'c' || w.cycle_num || '|w' || w.week from weeks w
                          where p.day between w.wfrom and w.wto and (p.value ->> 'plan_day') = any (w.plan)
                          order by w.cstart desc limit 1),
                        'iso:' || to_char(p.day, 'IYYY-IW')) || '|d' || coalesce(p.value ->> 'plan_day', '')
             when 'week' then 'iso:' || to_char(p.day, 'IYYY-IW')
             when 'cycle' then split_part(p.ref, '|', 1)
           end as grp
      from priced p
  ),
  ranked as (
    select k.*, row_number() over (partition by case when k.per = 'plan_day_week' then 'session' else k.kind end, k.grp
                                   order by k.xp desc, k.day, k.ref) as rn
      from keyed k
  )
  select ranked.kind, ranked.ref, ranked.day, ranked.xp, ranked.conly
    from ranked
   where ranked.grp is null or ranked.rn <= ranked.lim
$function$;

-- What the facts outside the habit half paid inside a window, by kind (stage66's signature, kept for its readers). A career_only fact counts
-- only when the window has no first day (the whole career).
create or replace function public.career_facts_xp(p_athlete text, p_from date, p_to date)
returns table (kind text, n bigint, xp numeric)
language sql stable set search_path to 'public' as $function$
  select p.kind, count(*), sum(p.xp)
    from public.career_facts_paid(p_athlete) p
   where p.day between coalesce(p_from, '-infinity'::date) and coalesce(p_to, 'infinity'::date)
     and not (p.career_only and p_from is not null)
   group by p.kind
$function$;

-- The score of a window: the habit half by Proof's own functions (season start p_season, null for all of a career; the daily XP with the
-- locked habits at 0 once the XP switch is on), the other facts by career_facts_xp(), and the total. Nothing is stored (GAME-1).
create or replace function public.career_score(p_athlete text, p_season date, p_from date, p_to date) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare v_rules jsonb := public.career_habit_rules(); v_paid jsonb; v_log jsonb; v_cfg jsonb; v_daily bigint := 0; v_bonus bigint := 0;
        v_facts jsonb; v_rest numeric;
begin
  if v_rules is null then return null; end if;
  v_paid := public.career_paid_rules(v_rules, public.career_rules_now());
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  v_daily := public.hab_xp(v_log, p_from, p_to, v_paid);
  v_bonus := public.hab_bonus_xp(v_log, v_cfg, p_season, p_from, p_to, v_rules);
  select coalesce(jsonb_object_agg(x.kind, jsonb_build_object('n', x.n, 'xp', x.xp)), '{}'::jsonb), coalesce(sum(x.xp), 0)
    into v_facts, v_rest
    from public.career_facts_xp(p_athlete, p_from, p_to) x;
  return jsonb_build_object('habits', jsonb_build_object('daily', v_daily, 'bonus', v_bonus, 'xp', v_daily + v_bonus),
                            'facts', v_facts, 'facts_xp', round(v_rest)::bigint,
                            'xp', (v_daily + v_bonus + round(v_rest))::bigint);
end $function$;

-- The career XP at which a level starts, on career_level()'s curve (the cost of level n to n+1 is base × n^growth, rounded to 10, never under
-- 10): what the level kept at the switch brings an athlete to.
create or replace function public.career_level_floor(p_level integer, p_rules jsonb) returns bigint
language plpgsql immutable set search_path to 'public' as $function$
declare
  v_base numeric := coalesce(public.career_num(p_rules #> '{level,base}'), 300);
  v_growth numeric := coalesce(public.career_num(p_rules #> '{level,growth}'), 0.55);
  lv integer := 1; total numeric := 0;
begin
  while lv < least(coalesce(p_level, 1), 100000) loop
    total := total + greatest(10, round(v_base * power(lv, v_growth) / 10) * 10);
    lv := lv + 1;
  end loop;
  return total::bigint;
end $function$;

-- ── 3. the score, cached ─────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.career_scores (
  athlete_id text primary key,
  stamp      text not null,                        -- what the score was worked out from (career_stamp()); a different stamp means stale
  score      jsonb not null check (jsonb_typeof(score) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.career_scores enable row level security;

do $stage68_policies$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_scores' and policyname = 'coach reads career scores') then
    create policy "coach reads career scores" on public.career_scores as permissive for select to authenticated
      using ((select public.is_coach()));
  end if;
end $stage68_policies$;

revoke all on table public.career_scores from public, anon, authenticated;
grant select on table public.career_scores to authenticated;
grant all on table public.career_scores to service_role;

-- What an athlete's score rests on, in one string: the newest rulebook (its version and when it was loaded: a re-seed changes the catalogue
-- too), Amir's quest runs (they pay without a fact changing), the season, today (the rolling week moves at midnight), the athlete's facts
-- (how many, and the last change: a void counts) and their programme (its cycles decide which session a cap keeps).
create or replace function public.career_stamp(p_athlete text) returns text
language sql stable set search_path to 'public' as $function$
  select md5(concat_ws('|',
    (select r.version::text || '@' || r.loaded_at::text from public.career_rules r order by r.version desc limit 1),
    (select md5(coalesce(x.rules -> 'questRuns', '[]'::jsonb)::text) from public.xp_rules x where x.id = 1),
    (select s.starts_on::text from public.current_season() s),
    current_date::text,
    (select count(*)::text || '@' || coalesce(max(f.updated_at)::text, '-') from public.career_facts f where f.athlete_id = p_athlete),
    (select p.updated_at::text from public.programs p where p.athlete_id = p_athlete),
    (select count(*)::text || '@' || coalesce(max(v.saved_at)::text, '-') from public.program_versions v where v.athlete_id = p_athlete)))
$function$;

-- An athlete's whole score, worked out from the facts (P3, P4): the career (all of it, the level kept included) with its level and rank;
-- this season's points (from the season's first day, Proof's season rule: runs and comebacks measured from that day; the level kept is no
-- season's work); the rolling week (today and the six days before it, never before the season), what the weekly board ranks. The log and
-- the config are rebuilt from the facts once, and the facts priced once, for all three windows.
create or replace function public.career_compute(p_athlete text) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare
  v_rules jsonb := public.career_rules_now(); v_hr jsonb; v_paid jsonb; v_log jsonb; v_cfg jsonb;
  v_name text; v_start date; v_s date; v_wfrom date; v_today date := current_date;
  c_d bigint; c_b bigint; s_d bigint; s_b bigint; w_d bigint; w_b bigint;
  c_f jsonb; c_r numeric; s_f jsonb; s_r numeric; w_r numeric; v_cxp bigint; v_sxp bigint;
begin
  if v_rules is null or p_athlete is null then return null; end if;
  v_hr := public.career_habit_rules();
  v_paid := public.career_paid_rules(v_hr, v_rules);
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  select s.name, s.starts_on into v_name, v_start from public.current_season() s;
  v_s := coalesce(v_start, '1970-01-01'::date);
  v_wfrom := greatest(v_today - 6, v_s);
  c_d := public.hab_xp(v_log, null, v_today, v_paid);
  c_b := public.hab_bonus_xp(v_log, v_cfg, null, null, v_today, v_hr);
  s_d := public.hab_xp(v_log, v_s, v_today, v_paid);
  s_b := public.hab_bonus_xp(v_log, v_cfg, v_s, v_s, v_today, v_hr);
  w_d := public.hab_xp(v_log, v_wfrom, v_today, v_paid);
  w_b := public.hab_bonus_xp(v_log, v_cfg, v_s, v_wfrom, v_today, v_hr);
  with p as (select x.* from public.career_facts_paid(p_athlete) x where x.day <= v_today)
  select coalesce((select jsonb_object_agg(z.kind, jsonb_build_object('n', z.n, 'xp', z.xp))
                     from (select p.kind, count(*) as n, sum(p.xp) as xp from p group by p.kind) z), '{}'::jsonb),
         coalesce((select sum(p.xp) from p), 0),
         coalesce((select jsonb_object_agg(z.kind, jsonb_build_object('n', z.n, 'xp', z.xp))
                     from (select p.kind, count(*) as n, sum(p.xp) as xp from p where p.day >= v_s and not p.career_only group by p.kind) z),
                  '{}'::jsonb),
         coalesce((select sum(p.xp) from p where p.day >= v_s and not p.career_only), 0),
         coalesce((select sum(p.xp) from p where p.day >= v_wfrom and not p.career_only), 0)
    into c_f, c_r, s_f, s_r, w_r;
  v_cxp := (c_d + c_b + round(c_r))::bigint;
  v_sxp := (s_d + s_b + round(s_r))::bigint;
  return jsonb_build_object(
    'career', jsonb_build_object('habits', jsonb_build_object('daily', c_d, 'bonus', c_b, 'xp', c_d + c_b),
                                 'facts', c_f, 'facts_xp', round(c_r)::bigint, 'xp', v_cxp)
              || public.career_level(v_cxp, v_rules),
    'season', jsonb_build_object('name', v_name, 'starts_on', v_start, 'points', v_sxp,
                                 'parts', jsonb_build_object('habits', jsonb_build_object('daily', s_d, 'bonus', s_b, 'xp', s_d + s_b),
                                                             'facts', s_f, 'facts_xp', round(s_r)::bigint, 'xp', v_sxp)),
    'week', jsonb_build_object('from', v_wfrom, 'points', (w_d + w_b + round(w_r))::bigint));
end $function$;

-- An athlete's score from the cache, worked out again (and stored) when its stamp changed. p_recompute => false returns a stale row as it is,
-- marked "stale", rather than wait (null when there is none).
create or replace function public.career_scored(p_athlete text, p_recompute boolean default true) returns jsonb
language plpgsql set search_path to 'public' as $function$
#variable_conflict use_column
declare v_stamp text; v_old text; v_score jsonb;
begin
  if p_athlete is null or public.career_rules_now() is null then return null; end if;
  v_stamp := public.career_stamp(p_athlete);
  select c.stamp, c.score into v_old, v_score from public.career_scores c where c.athlete_id = p_athlete;
  if v_old = v_stamp then return v_score; end if;
  if v_old is not null and not p_recompute then return v_score || '{"stale": true}'::jsonb; end if;
  v_score := public.career_compute(p_athlete);
  if v_score is null then return null; end if;
  insert into public.career_scores as c (athlete_id, stamp, score, updated_at) values (p_athlete, v_stamp, v_score, now())
  on conflict on constraint career_scores_pkey do update set stamp = excluded.stamp, score = excluded.score, updated_at = now();
  return v_score;
end $function$;

-- The scores of many athletes at once (the board, the coach's list): each from the cache, a stale one worked out again while the time
-- budget lasts and then served as it was, so a board read never waits on everyone at once (an athlete's own app works their row out on its
-- next open anyway). One with no row yet is always worked out.
create or replace function public.career_scores_for(p_ids text[], p_budget interval default interval '2.5 seconds')
returns table (athlete_id text, score jsonb)
language plpgsql set search_path to 'public' as $function$
#variable_conflict use_column
declare v_t0 timestamptz := clock_timestamp(); v_id text; v_stamp text; v_old text; v_cached jsonb; v_score jsonb;
begin
  if public.career_rules_now() is null then return; end if;
  for v_id in select distinct x.id from unnest(coalesce(p_ids, '{}'::text[])) as x(id) where x.id is not null order by 1 loop
    v_stamp := public.career_stamp(v_id);
    v_old := null; v_cached := null;
    select c.stamp, c.score into v_old, v_cached from public.career_scores c where c.athlete_id = v_id;
    if v_old is not null and (v_old = v_stamp or clock_timestamp() - v_t0 > p_budget) then
      athlete_id := v_id; score := v_cached; return next;
      continue;
    end if;
    v_score := public.career_compute(v_id);
    if v_score is null then continue; end if;
    insert into public.career_scores as c (athlete_id, stamp, score, updated_at) values (v_id, v_stamp, v_score, now())
    on conflict on constraint career_scores_pkey do update set stamp = excluded.stamp, score = excluded.score, updated_at = now();
    athlete_id := v_id; score := v_score; return next;
  end loop;
end $function$;

-- ── 4. AA Proof's level, the board, the titles and the season, on the career once the XP switch is on ─────────────────────

-- AA Proof's own level this season, the way Proof has always worked it out (hab_xp() + hab_bonus_xp() with the xp_rules row over the current
-- season, on Proof's curve): what an athlete sees in Proof until the XP switch. It was hab_season_level()'s body; it stays for the switch's
-- report and the level kept (career_keep_levels()), which compare against it.
create or replace function public.hab_proof_level(p_athlete_id text) returns integer
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_rules jsonb; v_data jsonb; v_start date; v_xp bigint;
begin
  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null then return 1; end if;
  select data into v_data from public.athlete_progress where athlete_id = p_athlete_id;
  if v_data is null then return 1; end if;
  select s.starts_on into v_start from public.current_season() s;
  v_start := coalesce(v_start, '1970-01-01'::date);
  v_xp := public.hab_xp(public.hab_log_of(v_data, p_athlete_id), v_start, current_date, v_rules)
        + public.hab_bonus_xp(public.hab_log_of(v_data, p_athlete_id), public.hab_cfg_of(v_data, p_athlete_id),
                              v_start, v_start, current_date, v_rules);
  return public.hab_level(v_xp, v_rules);
end $function$;

-- The level an athlete has right now: Proof's season level until the XP switch, then the career level (never resets). The road's titles are
-- minted from it (hab_mint_titles(), set_title()), and the coach's list shows it (coach_season_levels()).
create or replace function public.hab_season_level(p_athlete_id text) returns integer
language plpgsql security definer set search_path to 'public' as $function$
begin
  if public.career_xp_on() then
    return coalesce((public.career_scored(p_athlete_id) #>> '{career,level}')::int, 1);
  end if;
  return public.hab_proof_level(p_athlete_id);
end $function$;

-- Every athlete's level for coach.html in one call (stage46). With the XP switch on, the career level from the cache (worked out again within
-- a time budget: a coach.html read must stay well inside the 8 s a signed-in request is given).
create or replace function public.coach_season_levels(p_ids text[])
returns table (athlete_id text, level integer)
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  if public.career_xp_on() then
    return query
      select x.id, coalesce((s.score #>> '{career,level}')::int, 1)
        from unnest(p_ids) as x(id)
        left join public.career_scores_for(p_ids, interval '3 seconds') s on s.athlete_id = x.id;
    return;
  end if;
  return query select x.id, public.hab_proof_level(x.id) from unnest(p_ids) as x(id);
end $function$;

-- The board. Until the XP switch: Proof's own scorer, exactly as before. With it on: this season's points (or the rolling week's), from the
-- facts, training included, with each athlete's career level and rank beside their name (P4). Same columns, same identity check.
create or replace function public.leaderboard_top(p_athlete_id text, p_key text default null, p_scope text default 'season', p_limit integer default 10)
returns table (pos integer, display_name text, title text, xp bigint, level integer, rank_label text, is_me boolean, joined boolean)
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_expected text; v_rules jsonb; v_from date; v_to date; v_joined boolean;
  v_season_start date;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  select exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_athlete_id)
    into v_joined;

  if public.career_xp_on() then
    return query
    with board as (
      select o.athlete_id as aid, o.display_name as dname, o.title as ttl from public.leaderboard_optin o
    ),
    sc as (
      select s.athlete_id as aid, s.score
        from public.career_scores_for((select array_agg(b.aid) from board b), interval '2.5 seconds') s
    ),
    scored as (
      select b.aid, b.dname, b.ttl,
             coalesce(case when p_scope = 'week' then (sc.score #>> '{week,points}')::bigint
                           else (sc.score #>> '{season,points}')::bigint end, 0) as x,
             coalesce((sc.score #>> '{career,level}')::int, 1) as lv,
             coalesce(sc.score #>> '{career,rank}', public.hab_rank_label(1)) as rk
        from board b left join sc on sc.aid = b.aid
    ),
    ranked as (
      select row_number() over (order by s.x desc, lower(s.dname) asc) as rn, s.*
        from scored s
    )
    select r.rn::int, r.dname, r.ttl, r.x, r.lv, r.rk, (r.aid = p_athlete_id), v_joined
      from ranked r
     where r.rn <= greatest(1, p_limit) or r.aid = p_athlete_id
     order by r.rn;
    return;
  end if;

  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null then return; end if;

  select s.starts_on into v_season_start from public.current_season() s;
  v_season_start := coalesce(v_season_start, '1970-01-01'::date);
  v_to := current_date;

  if p_scope = 'week' then
    v_from := greatest(current_date - 6, v_season_start);
  else
    v_from := v_season_start;
  end if;

  return query
  with scored as (
    select o.athlete_id as aid,
           o.display_name as dname,
           o.title as ttl,
           ( public.hab_xp(public.hab_log_of(ap.data, o.athlete_id), v_from, v_to, v_rules)
           + public.hab_bonus_xp(public.hab_log_of(ap.data, o.athlete_id),
                                 public.hab_cfg_of(ap.data, o.athlete_id),
                                 v_season_start, v_from, v_to, v_rules) ) as x
    from public.leaderboard_optin o
    left join public.athlete_progress ap on ap.athlete_id = o.athlete_id
  ),
  ranked as (
    select row_number() over (order by s.x desc, lower(s.dname) asc) as rn, s.*
    from scored s
  )
  select r.rn::int,
         r.dname,
         r.ttl,
         r.x,
         public.hab_level(r.x, v_rules),
         public.hab_rank_label(public.hab_level(r.x, v_rules)),
         (r.aid = p_athlete_id),
         v_joined
  from ranked r
  where r.rn <= greatest(1, p_limit) or r.aid = p_athlete_id
  order by r.rn;
end $function$;

-- A season closes (start_season() calls this). Until the XP switch: Proof's own record (its season level and XP) and its title at level 5,
-- exactly as before. With it on: every athlete with a fact gets the season's points (from the facts, training included) and the career level
-- at the season's last day (it never resets, so it is where they stood, not a score), and everyone with [season] title_points or more gets
-- the season's title (P4 step 6, in place of Proof's "level 5 inside the season").
create or replace function public.hab_close_season(p_ended_on date) returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare v_name text; v_start date; v_title text; v_rules jsonb; v_n integer := 0; v_need numeric;
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;

  select name, starts_on into v_name, v_start from public.current_season();
  if v_start is null then return 0; end if;
  if p_ended_on < v_start then
    raise exception 'a season cannot end (%) before it started (%)', p_ended_on, v_start;
  end if;
  if p_ended_on > current_date then
    raise exception 'cannot archive a season that has not finished yet (ends %, today is %)',
                    p_ended_on, current_date;
  end if;
  v_title := 't_sn_' || to_char(v_start, 'YYYYMMDD');

  if public.career_xp_on() then
    v_rules := public.career_rules_now();
    v_need := coalesce(public.career_num(v_rules #> '{season,title_points}'), 2000);
    with who as (
      select distinct f.athlete_id as id from public.career_facts f where f.void_at is null
    ),
    scored as (
      select w.id,
             (public.career_score(w.id, v_start, v_start, p_ended_on) ->> 'xp')::bigint as pts,
             (public.career_score(w.id, null, null, p_ended_on) ->> 'xp')::bigint as cxp
        from who w
    )
    insert into public.hab_season_results (athlete_id, starts_on, season_name, ended_on, level, xp)
    select s.id, v_start, v_name, p_ended_on, (public.career_level(s.cxp, v_rules) ->> 'level')::int, s.pts
      from scored s
     where s.pts > 0
    on conflict (athlete_id, starts_on) do nothing;
    get diagnostics v_n = row_count;

    insert into public.hab_titles (athlete_id, title)
    select r.athlete_id, v_title
      from public.hab_season_results r
     where r.starts_on = v_start and r.xp >= v_need
    on conflict (athlete_id, title) do nothing;
    return v_n;
  end if;

  select rules into v_rules from public.xp_rules where id = 1;

  with scored as (
    select a.athlete_id,
           public.hab_xp(public.hab_log_of(a.data, a.athlete_id), v_start, p_ended_on, v_rules)
         + public.hab_bonus_xp(public.hab_log_of(a.data, a.athlete_id),
                               public.hab_cfg_of(a.data, a.athlete_id),
                               v_start, v_start, p_ended_on, v_rules) as xp
    from public.athlete_progress a
    where a.data ? (a.athlete_id || '_hab_log')
  )
  insert into public.hab_season_results (athlete_id, starts_on, season_name, ended_on, level, xp)
  select s.athlete_id, v_start, v_name, p_ended_on,
         public.hab_level(s.xp::bigint, v_rules), s.xp
  from scored s
  where s.xp > 0
  on conflict (athlete_id, starts_on) do nothing;
  get diagnostics v_n = row_count;

  insert into public.hab_titles (athlete_id, title)
  select r.athlete_id, v_title
  from public.hab_season_results r
  where r.starts_on = v_start and r.level >= 5
  on conflict (athlete_id, title) do nothing;

  return v_n;
end $function$;

-- ── 5. nobody's level goes down (decision 2) ─────────────────────────────────────────────────────────────────────────────

-- Run by the seed that turns the XP switch on (and safe to run again: one level_kept per athlete, ref 'xp-switch'). For every athlete with an
-- AA Proof log, a season record or a fact: the highest level they reached in Proof (the best of their season records, hab_season_results, and
-- the level Proof shows them this season, hab_proof_level()) against their career level with the switch's rules. Where the career level is
-- lower, ONE level_kept fact, dated the switch day, worth the XP that brings them to the start of that level ([fact.level_kept]: xp_from =
-- "value", career_only, so it is no season's points). Written once and never worked out again: a later change to the rules moves the level
-- from there (GAME-1). Returns every athlete's line, for the switch's report: Proof's level now and its record, the career level before the
-- level kept, the XP kept and the level after.
create or replace function public.career_keep_levels(p_day date) returns jsonb
language plpgsql set search_path to 'public' as $function$
declare
  v_rules jsonb := public.career_rules_now(); a record; v_rows jsonb := '[]'::jsonb;
  v_record integer; v_now integer; v_best integer; v_xp bigint; v_raw bigint; v_lv integer; v_kept bigint; v_had jsonb;
begin
  if v_rules is null or public.career_switch_day(v_rules, 'xp') is null then
    raise exception 'career_keep_levels: the XP switch is not on (rulebook.toml → [switch] xp)';
  end if;
  for a in
    select z.id,
           coalesce(nullif(btrim(concat_ws(' ', p.data #>> '{athlete,firstName}', p.data #>> '{athlete,lastName}')), ''), o.display_name) as name,
           exists (select 1 from public.athlete_progress ap where ap.athlete_id = z.id and ap.data ? (z.id || '_hab_log')) as has_log
      from (select ap.athlete_id as id from public.athlete_progress ap where ap.data ? (ap.athlete_id || '_hab_log')
            union select r.athlete_id from public.hab_season_results r
            union select f.athlete_id from public.career_facts f where f.void_at is null) z
      left join public.programs p on p.athlete_id = z.id
      left join public.leaderboard_optin o on o.athlete_id = z.id
     order by z.id
  loop
    v_record := (select max(r.level) from public.hab_season_results r where r.athlete_id = a.id);
    v_now := case when a.has_log then public.hab_proof_level(a.id) end;
    v_best := greatest(coalesce(v_record, 0), coalesce(v_now, 0));
    select f.value into v_had from public.career_facts f
     where f.athlete_id = a.id and f.kind = 'level_kept' and f.ref = 'xp-switch' and f.void_at is null;
    v_xp := coalesce((public.career_score(a.id, null, null, current_date) ->> 'xp')::bigint, 0);
    v_raw := v_xp - coalesce(public.career_num(v_had -> 'xp'), 0)::bigint;          -- the career without the level kept
    v_lv := (public.career_level(v_raw, v_rules) ->> 'level')::int;
    v_kept := coalesce(public.career_num(v_had -> 'xp'), 0)::bigint;
    if v_had is null and v_best > v_lv then
      v_kept := public.career_level_floor(v_best, v_rules) - v_raw;
      insert into public.career_facts (athlete_id, kind, ref, day, value, source)
      values (a.id, 'level_kept', 'xp-switch', p_day,
              jsonb_strip_nulls(jsonb_build_object('xp', v_kept, 'level', v_best, 'was', v_lv,
                                                   'proof_record', v_record, 'proof_now', v_now)), 'server')
      on conflict (athlete_id, kind, ref) do update
         set day = excluded.day, value = excluded.value, source = excluded.source, void_at = null, updated_at = now();
    end if;
    v_rows := v_rows || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'athlete_id', a.id, 'name', a.name, 'proof_now', v_now, 'proof_record', v_record,
      'career_xp', v_raw, 'career_level', v_lv, 'kept_xp', nullif(v_kept, 0),
      'level', (public.career_level(v_raw + v_kept, v_rules) ->> 'level')::int)));
  end loop;
  return v_rows;
end $function$;

-- ── 6. the seed: the switches ────────────────────────────────────────────────────────────────────────────────────────────

-- The rulebook (one version) and the whole catalogue, from scripts/career_seed.py, then every athlete's facts worked out again with the new
-- numbers (P16). A version older than the newest loaded is refused: bump `version` in rulebook.toml to move forward. The switches
-- (rulebook.toml → [switch]): a switch turned on is never turned back off (the level would go back with it), and a switch day is never one still
-- to come. A seed that changes nothing but a switch runs no backfill (no fact depends on a switch, and a backfill holds every athlete's lock
-- until it commits). The seed that turns the XP switch on writes the levels kept (career_keep_levels()) and returns every athlete's line.
-- p_dry_run => true does all of it, then undoes it, and returns the same answer: the list Amir reads before the switch.
drop function if exists public.career_seed(integer, jsonb, jsonb, text);
create or replace function public.career_seed(p_version integer, p_rules jsonb, p_catalogue jsonb, p_source text,
                                              p_dry_run boolean default false) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_newest integer; v_n integer; v_old jsonb := public.career_rules_now(); v_which text; v_was date; v_will text;
  v_xp_on date; v_turn_on boolean; v_same boolean; v_backfill jsonb; v_levels jsonb; v_out jsonb;
begin
  if p_version is null or p_version < 1 then
    raise exception 'the rulebook version must be a whole number from 1';
  end if;
  if jsonb_typeof(p_rules) is distinct from 'object' or public.career_num(p_rules -> 'version') is distinct from p_version then
    raise exception 'the rulebook must be an object whose version is %', p_version;
  end if;
  if jsonb_typeof(p_catalogue) is distinct from 'array' then
    raise exception 'the catalogue must be a JSON array of {kind, id, body}';
  end if;
  select max(r.version) into v_newest from public.career_rules r;
  if v_newest is not null and p_version < v_newest then
    raise exception 'rulebook version % is older than the one loaded (%): nothing was changed', p_version, v_newest;
  end if;
  foreach v_which in array array['xp', 'catalogue'] loop
    v_will := p_rules #>> array['switch', v_which];
    v_was := public.career_switch_day(v_old, v_which);
    if v_will is not null and v_will <> 'off' and v_will !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'rulebook.toml → [switch] % must be "off" or a day (YYYY-MM-DD), found %: nothing was changed', v_which, v_will;
    end if;
    if v_will ~ '^\d{4}-\d{2}-\d{2}$' and v_will::date > current_date then
      raise exception 'rulebook.toml → [switch] % is %, a day still to come: turn a switch on on the day it happens. Nothing was changed', v_which, v_will;
    end if;
    if v_was is not null and coalesce(v_will, 'off') = 'off' then
      raise exception 'the % switch is on (since %) and is never turned back off: it would take every athlete''s level back. Nothing was changed (the way back is scripts/career/rollback_stage68.sql, on Amir''s word)', v_which, v_was;
    end if;
  end loop;
  if public.career_switch_day(p_rules, 'catalogue') is not null and public.career_switch_day(p_rules, 'xp') is null then
    raise exception 'the catalogue switch (phase 3) needs the XP switch (phase 2) on first: nothing was changed';
  end if;
  v_xp_on := public.career_switch_day(p_rules, 'xp');
  v_turn_on := v_xp_on is not null and public.career_switch_day(v_old, 'xp') is null;
  v_same := v_old is not null
        and (v_old - 'version' - 'switch' - 'shadow') = (p_rules - 'version' - 'switch' - 'shadow')
        and (select md5(coalesce(string_agg(c.kind || '|' || c.id || '|' || c.body::text, ',' order by c.kind, c.id), ''))
               from public.career_catalogue c)
          = (select md5(coalesce(string_agg(x.kind || '|' || x.id || '|' || x.body::text, ',' order by x.kind, x.id), ''))
               from jsonb_to_recordset(p_catalogue) as x(kind text, id text, body jsonb));

  begin
    insert into public.career_rules (version, rules, source, loaded_at) values (p_version, p_rules, p_source, now())
    on conflict (version) do update set rules = excluded.rules, source = excluded.source, loaded_at = now();
    delete from public.career_catalogue;
    insert into public.career_catalogue (kind, id, body, version, loaded_at)
    select x.kind, x.id, x.body, p_version, now()
      from jsonb_to_recordset(p_catalogue) as x(kind text, id text, body jsonb);
    get diagnostics v_n = row_count;
    v_backfill := case when v_same then jsonb_build_object('skipped', 'only a switch changed: no fact depends on it')
                       else public.career_backfill(null) end;
    if v_turn_on then
      v_levels := public.career_keep_levels(v_xp_on);
    end if;
    v_out := jsonb_strip_nulls(jsonb_build_object(
      'version', p_version, 'catalogue', v_n, 'backfill', v_backfill,
      'switch', jsonb_build_object('xp', coalesce(v_xp_on::text, 'off'),
                                   'catalogue', coalesce(public.career_switch_day(p_rules, 'catalogue')::text, 'off')),
      'turned_on', case when v_turn_on then 'xp' end,
      'levels', v_levels));
    if p_dry_run then
      raise exception using errcode = 'P0001', message = 'career_seed: dry run';
    end if;
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'career_seed: dry run' then
      raise;
    end if;
    v_out := v_out || jsonb_build_object('dry_run', true, 'note', 'a dry run: everything above was worked out, then undone');
  end;
  return v_out;
end $function$;

-- ── 7. the profile ───────────────────────────────────────────────────────────────────────────────────────────────────────

-- The one read both apps ask (P10): the signed-in athlete's own, or any athlete's for the coach (and for the SQL editor or the service role,
-- which carry no sign-in, for a report). Reading it first works out what time alone decides (a week that ended, a cycle's end), as P2 asks;
-- the score comes from the cache (career_scored()). Besides phase 1's answer: the switches (an app shows the career only once the XP switch
-- is on), the rolling week, `since` (the first day the athlete logged anything: the reveal says "from everything you've logged since"),
-- `kept` (the level kept at the switch, if any) and `rules` (the level curve and the prices the apps preview a tap with, P13 and P17).
create or replace function public.get_profile(p_athlete_id text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me text := public.current_athlete_id();
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  v_rules jsonb; v_score jsonb; v_now integer := 0; v_best integer := 0; f record; v_xp date;
begin
  if v_id is null then
    raise exception 'not signed in';
  end if;
  -- the athlete reads their own, the coach anyone's, and so does the SQL editor or the service role (no sign-in claims: a report)
  if not (public.is_coach() or v_id is not distinct from v_me or coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role')) then
    raise exception 'not your profile';
  end if;
  v_rules := public.career_rules_now();
  if v_rules is null then
    return jsonb_build_object('athlete_id', v_id, 'ready', false);
  end if;
  perform public.career_derive(v_id);
  v_score := coalesce(public.career_scored(v_id), '{}'::jsonb);
  v_xp := public.career_switch_day(v_rules, 'xp');
  -- weeks held in a row: only a broken week ends a run (a week between cycles, or one Amir paused, is no week at all)
  for f in select cf.kind from public.career_facts cf
            where cf.athlete_id = v_id and cf.void_at is null and cf.kind in ('week_held', 'week_broken')
            order by cf.day, cf.ref loop
    if f.kind = 'week_held' then v_now := v_now + 1; v_best := greatest(v_best, v_now); else v_now := 0; end if;
  end loop;
  return jsonb_build_object(
    'athlete_id', v_id,
    'ready', true,
    'shadow', v_xp is null,
    'switch', jsonb_build_object('xp', v_xp, 'catalogue', public.career_switch_day(v_rules, 'catalogue')),
    'rules_version', (select max(r.version) from public.career_rules r),
    'career', v_score -> 'career',
    'season', v_score -> 'season',
    'week', v_score -> 'week',
    'since', (select min(cf.day) from public.career_facts cf
               where cf.athlete_id = v_id and cf.void_at is null
                 and cf.kind in ('habit_day', 'session_finished', 'session_finished_early', 'library_session')),
    'kept', (select cf.value from public.career_facts cf
              where cf.athlete_id = v_id and cf.kind = 'level_kept' and cf.ref = 'xp-switch' and cf.void_at is null),
    'numbers', (select jsonb_build_object(
                  'weeks_held', jsonb_build_object('now', v_now, 'best', v_best),
                  'sessions_with_amir', count(*) filter (where cf.kind in ('session_finished', 'session_finished_early')),
                  'personal_bests', count(*) filter (where cf.kind = 'personal_best'),
                  'comebacks', count(*) filter (where cf.kind = 'comeback'),
                  'days_on_target', count(*) filter (where cf.kind = 'day_on_target'),
                  'perfect_days', count(*) filter (where cf.kind = 'perfect_day'))
                  from public.career_facts cf where cf.athlete_id = v_id and cf.void_at is null),
    'titles_owned', coalesce((select jsonb_agg(t.title order by t.earned_on, t.title) from public.hab_titles t where t.athlete_id = v_id), '[]'::jsonb),
    'rules', jsonb_build_object(
      'version', (select max(r.version) from public.career_rules r),
      'level', jsonb_build_object('base', v_rules #> '{level,base}', 'growth', v_rules #> '{level,growth}',
                                  'ranks', v_rules #> '{level,ranks}', 'levels_per_rank', v_rules #> '{level,levels_per_rank}',
                                  'prestige_after', v_rules #> '{level,prestige_after}'),
      'season', jsonb_build_object('title_points', v_rules #> '{season,title_points}'),
      'prices', coalesce((select jsonb_object_agg(k.key, public.career_num(v_rules #> array['fact', k.key, 'xp']))
                            from unnest(array['session_finished', 'session_finished_early', 'full_log', 'checkin_done', 'week_held',
                                              'bounce_back', 'training_return', 'library_session', 'retest_done']) as k(key)
                           where public.career_num(v_rules #> array['fact', k.key, 'xp']) is not null), '{}'::jsonb)),
    'badges', '[]'::jsonb, 'achievements', '[]'::jsonb, 'missions', '[]'::jsonb, 'quest', null, 'moments', '[]'::jsonb
  );
end $function$;

-- ── 8. the shadow check, after the switch too ────────────────────────────────────────────────────────────────────────────

-- For every athlete with a Proof log, Career Mode's habit XP against Proof's own, hab_xp() + hab_bonus_xp() with the xp_rules row, this
-- season, the rolling week and all time; the rules key by key; the three probes against the day facts. Once the XP switch is on, both sides pay
-- the locked habits 0 a day (career_paid_rules()), and a closed day settles (P1 step 4): Proof follows its log, Career Mode keeps the fact as it
-- stood. A row whose numbers differ is then `settled` (not a failure) when some closed day of the log differs from the facts, and `closed` says
-- how many. `ok` is true when every athlete matches, or differs only where a day settled, and the rules are Proof's.
create or replace function public.career_compare(p_season date default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_x jsonb; v_r jsonb; v_xp jsonb; v_rp jsonb; v_now jsonb := public.career_rules_now(); v_settle date;
  v_s date; v_t date := current_date; v_wk date; a record;
  v_log jsonb; v_cfg jsonb; v_cl jsonb; v_cc jsonb; v_rows jsonb := '[]'::jsonb; v_bad integer := 0; v_n integer := 0; v_settled integer := 0;
  p_season_xp bigint; c_season_xp bigint; p_week bigint; c_week bigint; p_all bigint; c_all bigint;
  v_probe jsonb; v_facts jsonb; v_row_ok boolean; v_diff jsonb; v_closed integer;
begin
  select x.rules into v_x from public.xp_rules x where x.id = 1;
  v_r := public.career_habit_rules();
  if v_x is null or v_r is null then
    raise exception 'nothing to compare: xp_rules or the Career Mode rulebook is missing';
  end if;
  v_xp := public.career_paid_rules(v_x, v_now);
  v_rp := public.career_paid_rules(v_r, v_now);
  v_settle := public.career_settled_before(v_now);
  v_s := coalesce(p_season, (select s.starts_on from public.current_season() s), '1970-01-01'::date);
  v_wk := greatest(v_t - 6, v_s);
  select coalesce(jsonb_agg(k.key order by k.key), '[]'::jsonb) into v_diff
    from jsonb_object_keys(v_r) as k(key)
   where k.key <> 'questRuns'
     and public.career_canon(public.career_scoring(k.key, v_r -> k.key)) is distinct from public.career_canon(public.career_scoring(k.key, v_x -> k.key));
  for a in
    select ap.athlete_id, ap.data from public.athlete_progress ap
     where ap.data ? (ap.athlete_id || '_hab_log') order by ap.athlete_id
  loop
    v_n := v_n + 1;
    v_log := public.hab_log_of(a.data, a.athlete_id);
    v_cfg := public.hab_cfg_of(a.data, a.athlete_id);
    v_cl := public.career_log(a.athlete_id);
    v_cc := public.career_cfg(a.athlete_id);
    p_season_xp := public.hab_xp(v_log, v_s, v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_s, v_t, v_x);
    c_season_xp := public.hab_xp(v_cl, v_s, v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_s, v_t, v_r);
    p_week := public.hab_xp(v_log, v_wk, v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_wk, v_t, v_x);
    c_week := public.hab_xp(v_cl, v_wk, v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_wk, v_t, v_r);
    p_all := public.hab_xp(v_log, '1970-01-01', v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, '1970-01-01', '1970-01-01', v_t, v_x);
    c_all := public.hab_xp(v_cl, '1970-01-01', v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, '1970-01-01', '1970-01-01', v_t, v_r);
    v_probe := public.career_probe(v_log, v_cfg, v_s, v_t, v_x);
    select jsonb_build_object(
             'perfect', count(*) filter (where f.kind = 'perfect_day' and f.day between v_s and v_t),
             'on_target', count(*) filter (where f.kind = 'day_on_target' and f.day between v_s and v_t),
             'comebacks', count(*) filter (where f.kind = 'comeback' and f.day between v_s and v_t
                                             and public.career_day(f.value ->> 'prev') >= v_s))
      into v_facts
      from public.career_facts f where f.athlete_id = a.athlete_id and f.void_at is null;
    -- the closed days whose log and facts differ (only once the XP switch is on: before it, nothing settles)
    v_closed := case when v_settle is null then 0 else
      (select count(*)::int from (
         select coalesce(pl.key, cl.key) as k
           from (select e.key, e.value from jsonb_each(coalesce(v_log, '{}'::jsonb)) e
                  where e.key ~ '^\d{4}-\d{2}-\d{2}$' and jsonb_typeof(e.value) = 'object' and e.key < v_settle::text) pl
           full join (select e.key, e.value from jsonb_each(coalesce(v_cl, '{}'::jsonb)) e where e.key < v_settle::text) cl
             on cl.key = pl.key
          where pl.value is distinct from cl.value) z) end;
    v_row_ok := p_season_xp = c_season_xp and p_week = c_week and p_all = c_all and v_probe = v_facts;
    if not v_row_ok and v_closed > 0 then
      v_settled := v_settled + 1;
    elsif not v_row_ok then
      v_bad := v_bad + 1;
    end if;
    v_rows := v_rows || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'athlete_id', a.athlete_id, 'ok', v_row_ok,
      'settled', case when not v_row_ok and v_closed > 0 then true end, 'closed', nullif(v_closed, 0),
      'season', jsonb_build_object('proof', p_season_xp, 'career', c_season_xp),
      'week', jsonb_build_object('proof', p_week, 'career', c_week),
      'all', jsonb_build_object('proof', p_all, 'career', c_all),
      'probe', jsonb_build_object('proof', v_probe, 'facts', v_facts))));
  end loop;
  return jsonb_build_object('ok', v_bad = 0 and jsonb_array_length(v_diff) = 0, 'season_start', v_s, 'today', v_t,
                            'xp_switch', public.career_switch_day(v_now, 'xp'), 'settled_before', v_settle,
                            'athletes', v_n, 'matched', v_n - v_bad - v_settled, 'settled', v_settled,
                            'rules_equal', jsonb_array_length(v_diff) = 0, 'rules_differ_on', v_diff, 'rows', v_rows);
end $function$;

-- ── 9. who may run what ──────────────────────────────────────────────────────────────────────────────────────────────────

-- As stage66: every career_ function runs inside the server or from the service role; get_profile() is open to a signed-in athlete (their own)
-- and the coach (anyone's). hab_proof_level() is the server's. The functions this file redefines keep the grants they had.
do $stage68_grants$
declare f text;
begin
  for f in
    select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'career\_%' escape '\'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $stage68_grants$;
revoke all on function public.get_profile(text) from public, anon, authenticated;
grant execute on function public.get_profile(text) to authenticated, service_role;
revoke all on function public.hab_proof_level(text) from public, anon, authenticated;
grant execute on function public.hab_proof_level(text) to service_role;
revoke all on function public.hab_season_level(text) from public, anon, authenticated;
grant execute on function public.hab_season_level(text) to service_role;
revoke all on function public.coach_season_levels(text[]) from public, anon;
grant execute on function public.coach_season_levels(text[]) to authenticated, service_role;
revoke all on function public.leaderboard_top(text, text, text, integer) from public;
grant execute on function public.leaderboard_top(text, text, text, integer) to anon, authenticated, service_role;
revoke all on function public.hab_close_season(date) from public, anon, authenticated;
grant execute on function public.hab_close_season(date) to service_role;

-- ── 10. coach_erase_person() learns career_scores ────────────────────────────────────────────────────────────────────────
-- Patched from its live definition, as stage66: the end of the table list must be found exactly once, or nothing is changed. career_scores is
-- a cache (nothing in it is a source), and it holds the athlete's numbers, so an erasure empties it too.
do $stage68_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''career_facts'']';
  s_new constant text := '''career_facts'', ''career_scores'']';
  n int;
begin
  if position(s_new in d) > 0 then
    return;      -- already patched: safe to run again
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage68: coach_erase_person() is not what this patch expects (the end of its table list was found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $stage68_patch$;
