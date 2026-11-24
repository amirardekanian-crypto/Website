-- stage127_whole_week.sql — The Whole Week: Move minutes, movement pays, Your Number sets itself (2026-11-24)
--
-- Amir, on round 13 'The Whole Week' (https://claude.ai/artifact/U3KBuQcFvqBR4ra7q6ZLKc): "go with your picks but movement should give
-- people xp, because those who walk get more xp compared to those who play tennis", then "i dont know how to pick a number for each
-- client? do i need to pick? can the app choose automatically?", then "Yes, build it".
--
-- Four things, all forward only (D20):
--   1. SPORT FILLS THE DAY (#136). The Court Log credit was capped at 70% of the day's Steps target, so an hour of tennis paid 42 Steps
--      XP and 10,000 steps walked paid 72. From move_full_from() (2026-11-24) the cap is 100%: move_cap_on(day). Days before keep 70%.
--      Two copies: move_steps_credit() / hab_log_credited() here, moveCreditOf() / stepsScored() in program.html (check_twins.js).
--   2. MOVE MINUTES (#134). One weekly number from all four sources, minutes x MET / 4 for every minute at 3 MET or more:
--        plan sessions   the finished-session fact's minutes x the Gym row by session RPE (1-4 easy, 5-7 normal, 8-10 hard)
--        Library         duration x its shelf's MET (move_shelf_met())
--        Court Log       minutes x activity_met() (the steps credit's table)
--        walking         typed steps over 5,000, minus 100 a minute of any run that day, at 100 steps a minute, at most 60 a day, 4 MET
--      A Court Log 'gym' row on a day with a plan session counts once (the plan's). The credit is never turned back into minutes.
--      The numbers are rulebook.toml → [fact.move_week] (GAME-10). The server works it out ONCE (move_parts() / move_week()) and both
--      apps read it from get_five_weeks(): no phone copy of this arithmetic.
--   3. A FULL MOVING WEEK PAYS (#135). A plan week (Your weeks' own, five_week_windows()) with Move minutes at the line (300) writes a
--      `move_week` fact, dated the week's first day, paid by rulebook version 13 (150 XP, one per week). A week that started before
--      move_full_from() is priced by version 12, which has no such fact: it pays nothing. career_move_sync() runs after every save that
--      can move the number (Proof's log, a session, a Library session, a Court Log row).
--   4. YOUR NUMBER SETS ITSELF (#137). steps_targets gains `source` ('coach' | 'auto'). Once a week (the first save from Monday on), for
--      an athlete with a programme whose latest number is not Amir's: the first number is their usual (the median of the typed steps on
--      the last 14 days, 7 or more days needed) plus 10%, to the nearest 500, 6,000 to 12,000, the same rule as coach.html's suggestion;
--      after that it goes up by at least 500 when it was met on 5 of the last 7 days, and never goes down by itself. A number Amir sets
--      is an override: the app leaves it alone until he hands it back (coach_set_steps_target(id, null)).
--
-- No new table (steps_targets gains a column; it is already in BACKUP_TABLES, the snapshot and coach_erase_person()).
-- Safe to re-run.

do $stage127_guard$
begin
  if to_regprocedure('public.hab_log_credited(text,jsonb)') is null or to_regprocedure('public.move_steps_credit(text)') is null
     or to_regprocedure('public.get_five_weeks(text)') is null or to_regclass('public.steps_targets') is null
     or to_regprocedure('public.career_observe_proof(text)') is null or to_regprocedure('public.career_weeks(text)') is null then
    raise exception 'stage127: stage121, stage125 or Career Mode is missing. Nothing was changed.';
  end if;
end $stage127_guard$;

-- ── 1. Sport fills the day ──────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.move_full_from()
returns date
language sql
immutable
as $$ select date '2026-11-24' $$;

-- The share of the day's Steps target the Court Log credit may fill: 70% until stage127, all of it from then on.
create or replace function public.move_cap_on(p_day date)
returns numeric
language sql
immutable
as $$ select case when p_day >= public.move_full_from() then 1.0 else 0.7 end $$;

create or replace function public.move_steps_credit(p_athlete text)
returns table(day date, steps integer, raw integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with tgt as (
    select coalesce(public.career_num(public.career_rules_now() #> '{habits,targets,steps}'), 10000) as t
  ),
  per as (
    select a.day,
           sum(round(a.minutes * coalesce(public.activity_met(a.kind, a.effort), 0) / 3.5) * 100)::integer as raw
      from public.activity_log a
     where a.athlete_id = p_athlete and a.day >= public.move_credit_from()
     group by a.day
  )
  select per.day, least(per.raw, round(tgt.t * public.move_cap_on(per.day))::integer), per.raw
    from per, tgt
   where per.raw > 0
$function$;

-- Steps on a day = (typed + credit capped at move_cap_on(day) of that day's target) x global target / that day's target. A day with no
-- credit and the global target is left as it was. The phone's twin is stepsScored() in program.html.
create or replace function public.hab_log_credited(p_athlete text, p_log jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_log jsonb := case when jsonb_typeof(p_log) = 'object' then p_log else '{}'::jsonb end;
  v_g numeric := public.steps_global_target(); v_has boolean; r record; v_day jsonb; v_typed numeric; v_t numeric; v_cr numeric;
begin
  if p_athlete is null then return p_log; end if;
  v_has := exists (select 1 from public.steps_targets t where t.athlete_id = p_athlete);
  for r in
    select d.day, max(d.raw) as raw from (
      select c.day, c.raw from public.move_steps_credit(p_athlete) c
      union all
      select k.key::date, 0 from jsonb_object_keys(v_log) k(key)
       where v_has and k.key ~ '^\d{4}-\d{2}-\d{2}$' and jsonb_typeof(v_log -> k.key -> 'steps') = 'number'
    ) d group by d.day
  loop
    v_t := case when v_has then public.steps_target_on(p_athlete, r.day) else v_g end;
    v_cr := least(coalesce(r.raw, 0), round(v_t * public.move_cap_on(r.day)));
    if v_cr = 0 and v_t = v_g then continue; end if;
    v_day := v_log -> r.day::text;
    if jsonb_typeof(v_day) is distinct from 'object' then v_day := '{}'::jsonb; end if;
    v_typed := case when jsonb_typeof(v_day -> 'steps') = 'number' then (v_day ->> 'steps')::numeric else 0 end;
    v_log := jsonb_set(v_log, array[r.day::text], v_day || jsonb_build_object('steps', round((v_typed + v_cr) * v_g / v_t)));
  end loop;
  return case when p_log is null and v_log = '{}'::jsonb then null else v_log end;
end
$function$;

-- ── 2. Move minutes ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- A Library shelf's MET (2024 Adult Compendium by analogy: circuit / interval training, agility drills, resistance training, light
-- resistance, hatha yoga, stretching, seated breathing). Under 3 MET counts no Move minutes; the session still shows on Your weeks.
create or replace function public.move_shelf_met(p_shelf text)
returns numeric
language sql
immutable
as $$
  select case p_shelf
    -- MOVE_SHELF_BEGIN
    when 'conditioning' then 8.0 when 'on-court' then 6.0 when 'strength' then 5.0 when 'care' then 3.5
    when 'mobility' then 2.5 when 'recovery' then 2.3 when 'breath' then 1.3
    -- MOVE_SHELF_END
    else 3.5 end
$$;

-- A number of the Move rule (rulebook.toml → [fact.move_week]), or its default before the rulebook has one.
create or replace function public.move_rule(p_key text, p_default numeric)
returns numeric
language sql
stable
set search_path to 'public'
as $$ select coalesce(public.career_num(public.career_rules_now() #> array['fact', 'move_week', p_key]), p_default) $$;

-- Move minutes per day and source, between two days.
create or replace function public.move_parts(p_athlete text, p_from date, p_to date)
returns table(day date, plan numeric, lib numeric, court numeric, other numeric, walk numeric)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with k as (
    select public.move_rule('per', 4) as per, public.move_rule('met_floor', 3) as floor_met,
           public.move_rule('walk_floor', 5000) as wf, public.move_rule('walk_steps_per_min', 100) as spm,
           public.move_rule('walk_cap', 60) as wcap, public.move_rule('walk_met', 4) as wmet),
  usual as (
    select coalesce(percentile_cont(0.5) within group (order by (f.value ->> 'minutes')::numeric), 60)::numeric as m
      from public.career_facts f
     where f.athlete_id = p_athlete and f.void_at is null and f.kind in ('session_finished', 'session_finished_early')
       and (f.value ->> 'minutes') ~ '^\d{1,4}$' and (f.value ->> 'minutes')::int > 0 and f.day >= p_to - 120),
  ps as (
    select f.day,
           case when (f.value ->> 'minutes') ~ '^\d{1,4}$' and (f.value ->> 'minutes')::int > 0 then (f.value ->> 'minutes')::numeric
                else (select u.m from usual u) end as mins,
           public.activity_met('gym', case when sh.rpe is null then 'normal' when sh.rpe <= 4 then 'easy'
                                           when sh.rpe <= 7 then 'normal' else 'hard' end) as met
      from public.career_facts f
      left join lateral (select s.session_rpe as rpe from public.session_history s
                          where s.athlete_id = p_athlete and s.completed_on = f.day and s.day::text = (f.value ->> 'plan_day')
                            and s.hidden_at is null
                          order by s.updated_at desc limit 1) sh on true
     where f.athlete_id = p_athlete and f.void_at is null and f.kind in ('session_finished', 'session_finished_early')
       and f.day between p_from and p_to),
  ls as (
    select l.completed_on as day, coalesce(l.duration_min, 0)::numeric as mins, public.move_shelf_met(l.category_id) as met, l.slug
      from public.library_sessions l
     where l.athlete_id = p_athlete and l.completed_on between p_from and p_to),
  al as (
    select a.day, a.minutes::numeric as mins, coalesce(public.activity_met(a.kind, a.effort), 0) as met, a.kind
      from public.activity_log a
     where a.athlete_id = p_athlete and a.day between p_from and p_to
       and not (a.kind = 'gym' and exists (select 1 from ps where ps.day = a.day))),
  runs as (
    select r.day, sum(r.mins) as m from (
      select al.day, al.mins from al where al.kind = 'run'
      union all
      select ls.day, ls.mins from ls where ls.slug in ('workouts/conditioning/steady-run', 'workouts/conditioning/run-warm-up')) r
     group by r.day),
  lg as (
    select public.hab_log_of(ap.data, ap.athlete_id) as j from public.athlete_progress ap where ap.athlete_id = p_athlete),
  steps as (
    select public.career_day(e.key) as day, (e.value ->> 'steps')::numeric as s
      from lg, jsonb_each(case when jsonb_typeof(lg.j) = 'object' then lg.j else '{}'::jsonb end) e
     where e.key ~ '^\d{4}-\d{2}-\d{2}$' and jsonb_typeof(e.value -> 'steps') = 'number'
       and public.career_day(e.key) between p_from and p_to),
  wk as (
    select st.day, least(k.wcap, greatest(0, floor((st.s - coalesce(r.m, 0) * k.spm - k.wf) / k.spm))) as mins
      from steps st cross join k left join runs r on r.day = st.day),
  items as (
    select ps.day, 'plan'::text as src, ps.mins, ps.met from ps
    union all select ls.day, 'lib', ls.mins, ls.met from ls
    union all select al.day, case when al.kind in ('tennis', 'padel', 'match', 'beach_tennis', 'pickleball', 'squash', 'badminton')
                                  then 'court' else 'other' end, al.mins, al.met from al
    union all select wk.day, 'walk', wk.mins, k.wmet from wk, k),
  mv as (
    select i.day, i.src, case when i.met >= k.floor_met then i.mins * i.met / k.per else 0 end as m from items i, k)
  select mv.day,
         coalesce(sum(mv.m) filter (where mv.src = 'plan'), 0), coalesce(sum(mv.m) filter (where mv.src = 'lib'), 0),
         coalesce(sum(mv.m) filter (where mv.src = 'court'), 0), coalesce(sum(mv.m) filter (where mv.src = 'other'), 0),
         coalesce(sum(mv.m) filter (where mv.src = 'walk'), 0)
    from mv group by mv.day
$function$;

-- One week's Move minutes by source (each rounded; total = their sum, so the legend adds up), the week's steps a day (typed plus the
-- credit, over the days that have either, up to today) and the XP its move_week fact paid.
create or replace function public.move_week(p_athlete text, p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  with p as (
    select round(coalesce(sum(m.plan), 0)) as plan, round(coalesce(sum(m.lib), 0)) as lib, round(coalesce(sum(m.court), 0)) as court,
           round(coalesce(sum(m.other), 0)) as other, round(coalesce(sum(m.walk), 0)) as walk
      from public.move_parts(p_athlete, p_from, p_to) m),
  lg as (select public.hab_log_of(ap.data, ap.athlete_id) as j from public.athlete_progress ap where ap.athlete_id = p_athlete),
  typed as (
    select public.career_day(e.key) as day, (e.value ->> 'steps')::numeric as s
      from lg, jsonb_each(case when jsonb_typeof(lg.j) = 'object' then lg.j else '{}'::jsonb end) e
     where e.key ~ '^\d{4}-\d{2}-\d{2}$' and jsonb_typeof(e.value -> 'steps') = 'number'
       and public.career_day(e.key) between p_from and least(p_to, current_date)),
  cr as (
    select c.day, least(c.raw, round(public.steps_target_on(p_athlete, c.day) * public.move_cap_on(c.day))) as v
      from public.move_steps_credit(p_athlete) c where c.day between p_from and least(p_to, current_date)),
  sd as (
    select coalesce(t.day, c.day) as day, coalesce(t.s, 0) + coalesce(c.v, 0) as v
      from typed t full join cr c on c.day = t.day)
  select jsonb_build_object('plan', p.plan, 'lib', p.lib, 'court', p.court, 'other', p.other, 'walk', p.walk,
                            'total', p.plan + p.lib + p.court + p.other + p.walk,
                            'steps', (select round(avg(sd.v)) from sd where sd.v > 0),
                            'xp', coalesce((select public.career_num(public.career_rules_on(f.day) #> '{fact,move_week,xp}')
                                              from public.career_facts f
                                             where f.athlete_id = p_athlete and f.kind = 'move_week' and f.void_at is null
                                               and f.ref = 'mw|' || p_from::text), 0))
    from p
$function$;

-- The line, the mark, the first paying week and the athlete's Steps number today, for the apps.
create or replace function public.move_meta(p_athlete text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object('line', public.move_rule('line', 300), 'mark', public.move_rule('mark', 150),
                            'xp', public.move_rule('xp', 0), 'from', public.move_full_from(),
                            'number', public.steps_target_on(p_athlete, current_date), 'global', public.steps_global_target())
$$;

-- ── 3. The weeks: Your weeks' windows, once ─────────────────────────────────────────────────────────────────────────────────────
-- The weeks get_five_weeks() draws (stage115, stage122), as a function, so the Move fact uses exactly the weeks the athlete sees.
create or replace function public.five_week_windows(p_athlete text)
returns table(cycle_num integer, week integer, cweek integer, wfrom date, wto date, plan text[], is_current boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with cw as (select * from public.career_weeks(p_athlete)),
  -- stage122: in a cycle means today is inside the current cycle's weeks
  incyc as (select exists (select 1 from cw c where c.is_current and current_date between c.wfrom and c.wto) as yes),
  -- the weekday the athlete's weeks start on, and the start of the week holding today
  anc as (
    select coalesce((select max(c.cstart) from cw c where c.is_current),
                    (select max(c.cstart) from cw c where c.cstart <= current_date),
                    (select min(c.cstart) from cw c),
                    (current_date - (extract(isodow from current_date)::int - 1))) as a),
  roll as (
    select current_date - ((((current_date - anc.a) % 7) + 7) % 7) as this_from from anc)
  select cw.cycle_num, cw.week, cw.week as cweek, cw.wfrom, cw.wto, cw.plan, true as is_current
    from cw, incyc where cw.is_current and incyc.yes
  union all
  -- outside a cycle, the 5 weeks ending with this one; a week that is also a cycle's keeps its plan and its held tick
  select m.cycle_num, gs.k, m.week, roll.this_from - (5 - gs.k) * 7, roll.this_from - (5 - gs.k) * 7 + 6, coalesce(m.plan, '{}'::text[]), false
    from roll cross join incyc cross join generate_series(1, 5) gs(k)
    left join cw m on m.wfrom = roll.this_from - (5 - gs.k) * 7
   where not incyc.yes
$function$;

-- get_five_weeks() reads its weeks from five_week_windows(), and each week carries `move`; the answer carries `move` (the meta).
do $stage127_fw$
declare
  d text := pg_get_functiondef('public.get_five_weeks(text)'::regprocedure);
  i integer; j integer;
  s_days constant text := '''days'', coalesce(wk.days, ''[]''::jsonb)) order by w.week)';
  s_cur constant text := '''current'', bool_or(w.is_current),';
begin
  if position('five_week_windows' in d) > 0 then return; end if;   -- already patched (a re-run)
  i := position('  with cw as (' in d);
  j := position('  pdays as (' in d);
  if i = 0 or j = 0 or j < i
     or (length(d) - length(replace(d, s_days, ''))) / length(s_days) <> 1
     or (length(d) - length(replace(d, s_cur, ''))) / length(s_cur) <> 1 then
    raise exception 'stage127: get_five_weeks() is not what this patch expects. Nothing was changed.';
  end if;
  d := substr(d, 1, i - 1) || '  with w as (select * from public.five_week_windows(p_athlete_id)),   -- stage127' || chr(10) || substr(d, j);
  d := replace(d, s_days, '''days'', coalesce(wk.days, ''[]''::jsonb), ''move'', public.move_week(p_athlete_id, w.wfrom, w.wto)) order by w.week)');
  d := replace(d, s_cur, s_cur || ' ''move'', public.move_meta(p_athlete_id),');
  execute d;
end $stage127_fw$;

-- ── 4. A full moving week pays ──────────────────────────────────────────────────────────────────────────────────────────────────
-- Writes the move_week facts of the athlete's current weeks: one per week at the line, dated the week's first day, only for weeks that
-- start on or after move_full_from(). The refs are those weeks only, so a fact of an older week is never touched.
create or replace function public.career_move_sync(p_athlete text)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare v_rules jsonb := public.career_rules_now(); v_line numeric; v_want jsonb; v_refs text[];
begin
  if v_rules is null or p_athlete is null or v_rules #> '{fact,move_week}' is null then return; end if;
  v_line := coalesce(public.career_num(v_rules #> '{fact,move_week,line}'), 300);
  select coalesce(jsonb_agg(jsonb_build_object('kind', 'move_week', 'ref', 'mw|' || x.wfrom::text, 'day', x.wfrom,
                                               'value', jsonb_build_object('total', x.total)))
                    filter (where x.total >= v_line), '[]'::jsonb),
         array_agg('mw|' || x.wfrom::text)
    into v_want, v_refs
    from (select w.wfrom, (public.move_week(p_athlete, w.wfrom, w.wto) ->> 'total')::numeric as total   -- the number the athlete sees
            from public.five_week_windows(p_athlete) w
           where w.wfrom >= public.move_full_from() and w.wfrom <= current_date) x;
  if v_refs is null then return; end if;
  perform public.career_sync(p_athlete, array['move_week'], v_want, 'server', v_refs, public.career_settled_before(v_rules));
end $function$;

-- Never stops a save.
create or replace function public.career_move_safe(p_athlete text)
returns void
language plpgsql
set search_path to 'public'
as $function$
begin
  perform public.career_move_sync(p_athlete);
exception when others then
  raise warning 'Career Mode could not work out the Move minutes of %: % (%). The save itself went through.', p_athlete, sqlerrm, sqlstate;
end $function$;

-- ── 5. Your Number sets itself ──────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.steps_targets add column if not exists source text not null default 'coach';
do $stage127_src$
begin
  if not exists (select 1 from pg_constraint where conname = 'steps_targets_source_check') then
    alter table public.steps_targets add constraint steps_targets_source_check check (source in ('coach', 'auto'));
  end if;
end $stage127_src$;

-- The number the app would set on p_day, or null (not enough steps typed, a number Amir set, or no change). p_force: ignore Amir's
-- number (he handed it back) and always answer the first-time rule.
create or replace function public.steps_auto_pick(p_athlete text, p_day date, p_force boolean default false)
returns integer
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_lg jsonb; v_vals numeric[]; v_n integer; v_usual numeric; v_sug integer; v_cur record; v_met integer;
begin
  select public.hab_log_of(ap.data, ap.athlete_id) into v_lg from public.athlete_progress ap where ap.athlete_id = p_athlete;
  if jsonb_typeof(v_lg) is distinct from 'object' then v_lg := '{}'::jsonb; end if;
  -- their usual: the median of the typed steps on the last 14 days before p_day (coach.html stepsUsualC(), the same rule)
  select array_agg((v_lg -> g.d::date::text ->> 'steps')::numeric order by (v_lg -> g.d::date::text ->> 'steps')::numeric)
    into v_vals
    from generate_series(p_day - 14, p_day - 1, interval '1 day') g(d)
   where jsonb_typeof(v_lg -> g.d::date::text -> 'steps') = 'number' and (v_lg -> g.d::date::text ->> 'steps')::numeric > 0;
  v_n := coalesce(cardinality(v_vals), 0);
  select t.steps, t.source, t.from_day into v_cur from public.steps_targets t
   where t.athlete_id = p_athlete and t.from_day <= p_day order by t.from_day desc limit 1;
  if v_cur.source = 'coach' and not p_force then return null; end if;
  if v_n < 7 then return null; end if;
  v_usual := case when v_n % 2 = 1 then v_vals[(v_n + 1) / 2] else (v_vals[v_n / 2] + v_vals[v_n / 2 + 1]) / 2 end;
  v_sug := least(12000, greatest(6000, (round(round(v_usual) * 1.1 / 500) * 500)::integer));   -- coach.html stepsSuggestC()
  if v_cur.steps is null or v_cur.source = 'coach' then return v_sug; end if;
  -- met on 5 of the last 7 days: up by at least 500; never down by itself
  v_lg := public.hab_log_credited(p_athlete, v_lg);   -- Steps as scored: met their own number = the global target
  if jsonb_typeof(v_lg) is distinct from 'object' then v_lg := '{}'::jsonb; end if;
  select count(*) into v_met
    from generate_series(p_day - 7, p_day - 1, interval '1 day') g(d)
   where jsonb_typeof(v_lg -> g.d::date::text -> 'steps') = 'number'
     and (v_lg -> g.d::date::text ->> 'steps')::numeric >= public.steps_global_target();
  if v_met >= 5 then
    return nullif(least(12000, greatest(v_cur.steps + 500, v_sug)), v_cur.steps);
  end if;
  return null;
end $function$;

-- Once a week (the first save from Monday on), for an athlete with a programme: set the new number from today.
create or replace function public.steps_auto(p_athlete text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_pick integer;
begin
  if p_athlete is null or not exists (select 1 from public.programs p where p.athlete_id = p_athlete) then return; end if;
  if exists (select 1 from public.steps_targets t where t.athlete_id = p_athlete
              and (t.from_day >= date_trunc('week', current_date)::date or t.source = 'coach' and t.from_day = (
                     select max(t2.from_day) from public.steps_targets t2 where t2.athlete_id = p_athlete))) then
    return;   -- already looked at this week, or Amir's number stands
  end if;
  v_pick := public.steps_auto_pick(p_athlete, current_date);
  if v_pick is null then return; end if;
  insert into public.steps_targets (athlete_id, from_day, steps, source) values (p_athlete, current_date, v_pick, 'auto')
  on conflict (athlete_id, from_day) do nothing;
end $function$;

create or replace function public.steps_auto_safe(p_athlete text)
returns void
language plpgsql
set search_path to 'public'
as $function$
begin
  perform public.steps_auto(p_athlete);
exception when others then
  raise warning 'Your Number could not be set for %: % (%). The save itself went through.', p_athlete, sqlerrm, sqlstate;
end $function$;

-- Amir sets a number (an override), or hands it back to the app with p_steps = null.
create or replace function public.coach_set_steps_target(p_athlete_id text, p_steps integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_changed text[]; v_steps integer := p_steps; v_src text := 'coach';
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if p_athlete_id is null or btrim(p_athlete_id) = '' then raise exception 'steps:athlete'; end if;
  if v_steps is null then   -- stage127: back to the app
    v_src := 'auto';
    v_steps := coalesce(public.steps_auto_pick(p_athlete_id, current_date, true), public.steps_global_target()::integer);
  end if;
  if v_steps < 3000 or v_steps > 20000 then raise exception 'steps:range'; end if;
  insert into public.steps_targets (athlete_id, from_day, steps, source) values (p_athlete_id, current_date, v_steps, v_src)
  on conflict (athlete_id, from_day) do update set steps = excluded.steps, source = excluded.source, set_at = now();
  begin
    perform set_config('career.changed', '', true);
    perform public.career_observe_proof(p_athlete_id);
    if public.career_catalogue_on() then
      v_changed := public.career_changed_kinds();
      if v_changed is not null then perform public.career_evaluate(p_athlete_id, v_changed, 'live'); end if;
    end if;
  exception when others then
    raise warning 'Career Mode could not re-read the habit days of % after a new steps target: % (%)', p_athlete_id, sqlerrm, sqlstate;
  end;
  return public.get_steps_targets(p_athlete_id);
end
$function$;

create or replace function public.get_steps_targets(p_athlete_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if p_athlete_id is null or (not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id()) then
    raise exception 'not your athlete record';
  end if;
  return jsonb_build_object('global', public.steps_global_target(),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('from', t.from_day, 'steps', t.steps, 'by', t.source) order by t.from_day)
                        from public.steps_targets t where t.athlete_id = p_athlete_id), '[]'::jsonb));
end
$function$;

-- ── 6. The hooks: every save that can move the number ───────────────────────────────────────────────────────────────────────────
do $stage127_hooks$
declare
  d text; n integer;
  s_lock constant text := 'perform pg_advisory_xact_lock(hashtext(''career:'' || p_athlete));';
  s_proof constant text := '  perform public.career_derive_days(p_athlete);' || chr(10) || 'end';
  s_sess constant text := 'case when p_day is null then null else array[''d'' || p_day || ''|'' || p_on::text] end);' || chr(10) || 'end';
  s_lib constant text := 'case when p_slug is null then null else array[p_slug || ''|'' || p_on::text] end);' || chr(10) || 'end';
begin
  -- Proof's log, a Court Log row, a new steps target: the number first (so today is scored against it), the Move week last
  d := pg_get_functiondef('public.career_observe_proof(text)'::regprocedure);
  if position('career_move_safe' in d) = 0 then
    if (length(d) - length(replace(d, s_lock, ''))) / length(s_lock) <> 1
       or (length(d) - length(replace(d, s_proof, ''))) / length(s_proof) <> 1 then
      raise exception 'stage127: career_observe_proof() is not what this patch expects. Nothing was changed.';
    end if;
    d := replace(d, s_lock, s_lock || chr(10) || '  perform public.steps_auto_safe(p_athlete);   -- stage127: Your Number sets itself');
    d := replace(d, s_proof, '  perform public.career_derive_days(p_athlete);' || chr(10)
                             || '  perform public.career_move_safe(p_athlete);   -- stage127: a full moving week' || chr(10) || 'end');
    execute d;
  end if;
  d := pg_get_functiondef('public.career_observe_session(text,integer,date)'::regprocedure);
  if position('career_move_safe' in d) = 0 then
    n := (length(d) - length(replace(d, s_sess, ''))) / length(s_sess);
    if n <> 1 then raise exception 'stage127: career_observe_session() is not what this patch expects. Nothing was changed.'; end if;
    execute replace(d, s_sess, replace(s_sess, chr(10) || 'end', chr(10) || '  perform public.career_move_safe(p_athlete);   -- stage127' || chr(10) || 'end'));
  end if;
  d := pg_get_functiondef('public.career_observe_library(text,text,date)'::regprocedure);
  if position('career_move_safe' in d) = 0 then
    n := (length(d) - length(replace(d, s_lib, ''))) / length(s_lib);
    if n <> 1 then raise exception 'stage127: career_observe_library() is not what this patch expects. Nothing was changed.'; end if;
    execute replace(d, s_lib, replace(s_lib, chr(10) || 'end', chr(10) || '  perform public.career_move_safe(p_athlete);   -- stage127' || chr(10) || 'end'));
  end if;
end $stage127_hooks$;

-- The price list the apps read (How the XP works) names the new fact.
do $stage127_prices$
declare
  r record; d text; n integer; done integer := 0;
  s_old constant text := '''retest_done'', ''day_on_target'', ''perfect_day'']';
  s_new constant text := '''retest_done'', ''day_on_target'', ''perfect_day'', ''move_week'']';
begin
  for r in select p.oid from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
            where ns.nspname = 'public' and position(s_old in pg_get_functiondef(p.oid)) > 0 loop
    d := pg_get_functiondef(r.oid);
    n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
    if n <> 1 then raise exception 'stage127: a price list was found % times in one function, not once. Nothing was changed.', n; end if;
    execute replace(d, s_old, s_new);
    done := done + 1;
  end loop;
  if done = 0 and not exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
                               where ns.nspname = 'public' and p.prokind = 'f' and position(s_new in pg_get_functiondef(p.oid)) > 0) then
    raise exception 'stage127: the price list was not found. Nothing was changed.';
  end if;
end $stage127_prices$;

-- ── 7. Grants ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.move_full_from() from public, anon;
grant execute on function public.move_full_from() to authenticated, service_role;
revoke all on function public.move_cap_on(date) from public, anon;
grant execute on function public.move_cap_on(date) to authenticated, service_role;
revoke all on function public.move_steps_credit(text) from public, anon, authenticated;
grant execute on function public.move_steps_credit(text) to service_role;
revoke all on function public.hab_log_credited(text, jsonb) from public, anon, authenticated;
grant execute on function public.hab_log_credited(text, jsonb) to service_role;
revoke all on function public.move_shelf_met(text) from public, anon;
grant execute on function public.move_shelf_met(text) to authenticated, service_role;
revoke all on function public.move_rule(text, numeric) from public, anon, authenticated;
grant execute on function public.move_rule(text, numeric) to service_role;
revoke all on function public.move_parts(text, date, date) from public, anon, authenticated;
grant execute on function public.move_parts(text, date, date) to service_role;
revoke all on function public.move_week(text, date, date) from public, anon, authenticated;
grant execute on function public.move_week(text, date, date) to service_role;
revoke all on function public.move_meta(text) from public, anon, authenticated;
grant execute on function public.move_meta(text) to service_role;
revoke all on function public.five_week_windows(text) from public, anon, authenticated;
grant execute on function public.five_week_windows(text) to service_role;
revoke all on function public.career_move_sync(text) from public, anon, authenticated;
grant execute on function public.career_move_sync(text) to service_role;
revoke all on function public.career_move_safe(text) from public, anon, authenticated;
grant execute on function public.career_move_safe(text) to service_role;
revoke all on function public.steps_auto_pick(text, date, boolean) from public, anon, authenticated;
grant execute on function public.steps_auto_pick(text, date, boolean) to service_role;
revoke all on function public.steps_auto(text) from public, anon, authenticated;
grant execute on function public.steps_auto(text) to service_role;
revoke all on function public.steps_auto_safe(text) from public, anon, authenticated;
grant execute on function public.steps_auto_safe(text) to service_role;
revoke all on function public.coach_set_steps_target(text, integer) from public, anon;
grant execute on function public.coach_set_steps_target(text, integer) to authenticated, service_role;
revoke all on function public.get_steps_targets(text) from public, anon;
grant execute on function public.get_steps_targets(text) to authenticated, service_role;

do $stage127_check$
begin
  if position('five_week_windows' in pg_get_functiondef('public.get_five_weeks(text)'::regprocedure)) = 0
     or position('move_cap_on' in pg_get_functiondef('public.hab_log_credited(text,jsonb)'::regprocedure)) = 0
     or position('career_move_safe' in pg_get_functiondef('public.career_observe_proof(text)'::regprocedure)) = 0
     or position('steps_auto_safe' in pg_get_functiondef('public.career_observe_proof(text)'::regprocedure)) = 0 then
    raise exception 'stage127: a part did not take';
  end if;
  raise notice 'stage127: applied';
end
$stage127_check$;
