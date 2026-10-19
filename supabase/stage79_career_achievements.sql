-- stage79_career_achievements.sql — the new achievements: three tests the server can decide (Career Mode round 5; career/CAREER_MODE.md →
-- "Achievements get a big section"; Amir, 2026-10-19: "Achievements: go with your picks")
--
-- Why: rulebook version 5 adds 13 achievements that push athletes to move more. Six are the first fact of a kind the server already writes
-- (test "first": Every Rep Counted, The Notebook, Extra Mile, Moving Up, Rematch Won, Bounce Back). Seven need a test it could not decide:
--   · total (at):        the at-th fact of a kind, counted as a badge of kind total counts it (career_measures()' count:<kind>, so a capped
--                        kind counts only what career_facts_paid() pays, GAME-4): Extra Innings (5 Library sessions), Straight Talk (25
--                        check-ins), Season Ticket, Half Year and Year One (3, 6 and 12 whole months with Amir).
--   · best_run (at):     training weeks held in a row, the run the held_weeks mark walks (the measure `weeks`): Back to Back (2).
--   · month_held (weeks): a calendar month whose training weeks were all held, at least `weeks` of them, by the rule of the month's honour
--                        Full Month in Courtside (stage75), decided once the month is over: Full Month (4).
-- What it does: career_entry_keys() names the measure total and best_run read, career_entry_kinds() the facts that wake each new test, and
-- career_achievement_eval() decides them. And one fix the back-pay needs: career_rewards_batch() read the go-day's report copy
-- (backup.career_catalogue_before, dropped on 2026-11-01) statically, so once it is gone each athlete's evaluate failed inside its exception
-- block and was undone: a silent pass would mint nothing. It now reads the copy only while it exists. No fact, no price, no table changes.
-- The new entries themselves arrive when rulebook version 5 is seeded, IN THE SAME CALL, right after this file (python scripts/career_seed.py),
-- and one silent career_rewards_batch() pass then
-- mints whoever already did it, dated version 5's start day (D20: a reward a rule change reveals for an earlier day is dated the start day),
-- with no full-screen moment (a silent award has none): a line in Your moments and its XP (Amir's call, "quiet back-pay").
-- Rehearsed in scripts/career/rehearse_achievements.mjs (PGlite). The way back: scripts/career/rollback_stage79.sql, on Amir's word only (its
-- header gives the order: the four functions as stage78 left them, then, to take the entries off the screens too, a seed without them).
-- APPLIED to the live project 2026-10-19 on Amir's word ("yes, go live with the 13 new achievements"), as the migration
-- stage79_career_achievements: a before-copy of every score (backup.ach79_scores_before), this file, the seed of rulebook version 5
-- (starts_on 2026-10-19) and one silent pass, guarded (it would have undone everything had the pass not said ok, career_compare() not been ok
-- or a level gone down). 51 awards to 22 athletes (21 clients), 7,050 XP, all silent and dated 2026-10-19, no moment waiting; every athlete's XP
-- up by exactly their new awards; three levels up, none down; career_compare() ok; the four bodies equal this file's. supabase/schema_snapshot.sql
-- remade in the same commit. backup.ach79_scores_before is dropped on 2026-11-03.

do $stage79_guard$
begin
  if to_regprocedure('public.career_achievement_eval(text, text, jsonb, jsonb, jsonb)') is null
     or to_regprocedure('public.career_entry_keys(text, jsonb, jsonb)') is null
     or to_regprocedure('public.career_entry_kinds(text, jsonb)') is null
     or to_regprocedure('public.career_rewards_batch(integer, integer, text)') is null then
    raise exception 'stage79: Career Mode''s stages 66 to 78 come first. Nothing was changed.';
  end if;
  if position('award_kept' in pg_get_functiondef('public.career_facts_paid(text)'::regprocedure)) = 0 then
    raise exception 'stage79: stage78 (the cut) is not live. Nothing was changed.';
  end if;
end
$stage79_guard$;

-- ── career_entry_keys ─────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.career_entry_keys(p_kind text, p_body jsonb, p_ctx jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare v_counts text[]; v_t text; v_out text[] := '{}'::text[];
begin
  v_counts := case jsonb_typeof(p_body -> 'counts')
                when 'array' then array(select x from jsonb_array_elements_text(p_body -> 'counts') x order by x)
                when 'string' then array[p_body ->> 'counts']
                else '{}'::text[] end;
  if p_kind = 'badge' then
    case p_body ->> 'kind'
      when 'best_run' then
        return case public.career_badge_run(p_body)
                 when 'plan_weeks' then array['weeks']
                 when 'days' then array['run:' || coalesce(p_body ->> 'habit', '')]
                 else array['iso:' || coalesce(v_counts[1], '')] end;
      when 'total' then return array['count:' || array_to_string(v_counts, ',')];
      when 'best_value' then return array[public.career_maxpct_key(p_body)];
      when 'per_habit_best_run' then
        return array(select 'run:' || t.key from jsonb_each(coalesce(p_ctx -> 'targets', '{}'::jsonb)) t
                     union
                     select 'run:' || c.value from jsonb_array_elements_text(coalesce(p_ctx -> 'custom', '[]'::jsonb)) c);
      when 'proof' then return array[public.career_proof_key(p_body ->> 'proof_measure')];
      else return '{}'::text[];
    end case;
  end if;
  v_t := public.career_achievement_test(p_body);
  if v_t = 'proof' then
    return array[public.career_proof_key(p_body ->> 'proof_measure')];
  elsif v_t = 'goals' then
    select coalesce(array_agg(distinct public.career_proof_key(g ->> 'kind')), '{}'::text[]) into v_out
      from jsonb_array_elements(case when jsonb_typeof(p_body -> 'goals') = 'array' then p_body -> 'goals' else '[]'::jsonb end) g
     where public.career_proof_key(g ->> 'kind') is not null and g ->> 'kind' is not null;
    return v_out;
  elsif v_t = 'best_value' then
    return array[public.career_maxpct_key(p_body)];
  elsif v_t = 'run_regained' then
    return array['weeks'];
  elsif v_t = 'total' then      -- stage79: the at-th fact of its kind, counted as a badge of kind total counts it (a capped kind only as paid)
    return array['count:' || coalesce(p_body ->> 'reads', '')];
  elsif v_t = 'best_run' then   -- stage79: training weeks held in a row, the run the held_weeks mark walks
    return array['weeks'];
  end if;
  return '{}'::text[];
end $function$;
revoke all on function public.career_entry_keys(p_kind text, p_body jsonb, p_ctx jsonb) from public, anon, authenticated, service_role;
grant execute on function public.career_entry_keys(p_kind text, p_body jsonb, p_ctx jsonb) to service_role;

-- ── career_entry_kinds ────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.career_entry_kinds(p_kind text, p_body jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare v_counts text[]; v_m text; v_t text;
begin
  v_counts := case jsonb_typeof(p_body -> 'counts')
                when 'array' then array(select jsonb_array_elements_text(p_body -> 'counts'))
                when 'string' then array[p_body ->> 'counts']
                else '{}'::text[] end;
  if p_kind = 'badge' then
    case p_body ->> 'kind'
      when 'best_run' then
        return case public.career_badge_run(p_body)
                 when 'plan_weeks' then array['week_held', 'week_broken']
                 when 'days' then array['habit_done']
                 else v_counts end;
      when 'total' then return v_counts;
      when 'best_value' then return array['lift_gain'];
      when 'per_habit_best_run' then return array['habit_done'];
      when 'proof' then v_m := p_body ->> 'proof_measure';
      else return v_counts;
    end case;
  else
    v_t := public.career_achievement_test(p_body);
    case v_t
      when 'first' then return array[p_body ->> 'reads'];
      when 'proof' then v_m := p_body ->> 'proof_measure';
      when 'goals' then return array['habit_done', 'habit_day', 'day_on_target', 'perfect_day', 'comeback', 'comeback_stuck'];
      when 'cycle_all_held', 'cycle_by_the_book', 'cycle_with_broken' then
        return array['cycle_finished', 'week_held', 'week_by_the_book', 'week_broken'];
      when 'runs_together' then return array['habit_done'];
      when 'patterns_in_cycle' then return array['personal_best'];
      when 'best_value' then return array['lift_gain'];
      when 'cycle_proving' then return array['personal_best', 'retest_beaten', 'week_held', 'week_broken'];
      when 'run_regained' then return array['week_held', 'week_broken'];
      when 'total' then return array[p_body ->> 'reads'];                        -- stage79
      when 'best_run', 'month_held' then return array['week_held', 'week_broken'];   -- stage79
      else return '{}'::text[];
    end case;
  end if;
  -- a Proof measure
  return case when v_m is null then array['day_on_target']
              when v_m like 'streak:%' or v_m like 'daysHit:%' or v_m like 'total:%' then array['habit_done']
              when v_m = 'daysWith3' then array['habit_done', 'habit_day']
              when v_m in ('perfectDays', 'perfect') then array['perfect_day']
              when v_m = 'qualify' then array['day_on_target']
              when v_m = 'comebackRun' then array['comeback', 'day_on_target']
              when v_m = 'comebacksStuck' then array['comeback_stuck']
              else '{}'::text[] end;
end $function$;
revoke all on function public.career_entry_kinds(p_kind text, p_body jsonb) from public, anon, authenticated, service_role;
grant execute on function public.career_entry_kinds(p_kind text, p_body jsonb) to service_role;

-- ── career_achievement_eval ───────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.career_achievement_eval(p_athlete text, p_id text, p_body jsonb, p_m jsonb, p_ctx jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_test text := public.career_achievement_test(p_body); v_k text; v_need numeric; s jsonb; g jsonb; v_day date; v_ev jsonb;
  v_facts jsonb := '[]'::jsonb; v_n integer := 0; v_num integer; v_ref text; v_kind text;
  v_best integer := 0; v_run integer := 0; v_away integer := 0; v_armed boolean := false; v_old integer := 0; v_aw integer;
  v_bests integer; v_rets integer;
  c_none constant jsonb := '{"crossed": []}'::jsonb;
begin
  if v_test is null then return c_none; end if;

  if v_test = 'first' then
    select f.day, f.kind, f.ref into v_day, v_kind, v_ref from public.career_facts f
     where f.athlete_id = p_athlete and f.kind = p_body ->> 'reads' and f.void_at is null
     order by f.day, f.ref limit 1;
    v_ev := jsonb_build_object('via', 'first', 'n', 1, 'facts', jsonb_build_array(jsonb_build_object('kind', v_kind, 'ref', v_ref)));

  elsif v_test in ('proof', 'best_value', 'total', 'best_run') then
    -- stage79: total and best_run read the measure their entry key names (career_entry_keys()), the first step that reaches `at`
    v_k := case when v_test = 'proof' then public.career_proof_key(p_body ->> 'proof_measure')
                when v_test = 'best_value' then public.career_maxpct_key(p_body)
                else (public.career_entry_keys('achievement', p_body, p_ctx))[1] end;
    v_need := public.career_num(case when v_test = 'proof' then p_body -> 'proof_need' else p_body -> 'at' end);
    select x.s into s from jsonb_array_elements(coalesce(p_m -> v_k -> 'steps', '[]'::jsonb)) with ordinality x(s, o)
     where public.career_num(x.s -> 1) >= v_need order by x.o limit 1;
    if s is not null then
      v_day := (s ->> 0)::date;
      v_ev := jsonb_build_object('via', v_k, 'n', s -> 1,
                                 'facts', case when s ->> 3 is not null then jsonb_build_array(jsonb_build_object('kind', s ->> 2, 'ref', s ->> 3))
                                               else '[]'::jsonb end);
    end if;

  elsif v_test = 'goals' then
    -- every goal met; the day the last of them was
    if jsonb_typeof(p_body -> 'goals') is distinct from 'array' or jsonb_array_length(p_body -> 'goals') = 0 then return c_none; end if;
    for g in select e from jsonb_array_elements(p_body -> 'goals') e loop
      v_k := public.career_proof_key(g ->> 'kind');
      v_need := public.career_num(g -> 'need');
      if g ->> 'kind' is null or v_k is null or v_need is null then return c_none; end if;
      s := null;
      select x.s into s from jsonb_array_elements(coalesce(p_m -> v_k -> 'steps', '[]'::jsonb)) with ordinality x(s, o)
       where public.career_num(x.s -> 1) >= v_need order by x.o limit 1;
      if s is null then return c_none; end if;
      v_day := greatest(v_day, (s ->> 0)::date);
      v_n := v_n + 1;
      if s ->> 3 is not null and jsonb_array_length(v_facts) < 5 then
        v_facts := v_facts || jsonb_build_array(jsonb_build_object('kind', s ->> 2, 'ref', s ->> 3));
      end if;
    end loop;
    v_ev := jsonb_build_object('via', 'goals', 'n', v_n, 'facts', v_facts);

  elsif v_test in ('cycle_all_held', 'cycle_by_the_book', 'cycle_with_broken') then
    -- a finished cycle judged by the week facts of that cycle (refs c<n>|w<k>, so two cycles' weeks never mix); a week before the first
    -- session, or one Amir paused, has no fact and does not count (D9)
    select c.day, c.ref into v_day, v_ref from public.career_facts c
     where c.athlete_id = p_athlete and c.kind = 'cycle_finished' and c.void_at is null
       and case when v_test = 'cycle_with_broken' then
                  exists (select 1 from public.career_facts w where w.athlete_id = p_athlete and w.kind = 'week_broken' and w.void_at is null
                             and w.value ->> 'cycle' = c.value ->> 'cycle')
                else
                  exists (select 1 from public.career_facts w where w.athlete_id = p_athlete and w.kind = 'week_held' and w.void_at is null
                             and w.value ->> 'cycle' = c.value ->> 'cycle')
                  and not exists (select 1 from public.career_facts w where w.athlete_id = p_athlete and w.kind = 'week_broken' and w.void_at is null
                                     and w.value ->> 'cycle' = c.value ->> 'cycle')
                  and (v_test = 'cycle_all_held'
                       or not exists (select 1 from public.career_facts w
                                       where w.athlete_id = p_athlete and w.kind = 'week_held' and w.void_at is null
                                         and w.value ->> 'cycle' = c.value ->> 'cycle'
                                         and not exists (select 1 from public.career_facts b
                                                          where b.athlete_id = p_athlete and b.kind = 'week_by_the_book' and b.void_at is null
                                                            and b.ref = w.ref)))
           end
     order by c.day, c.ref limit 1;
    v_ev := jsonb_build_object('via', v_test, 'n', 1, 'facts', jsonb_build_array(jsonb_build_object('kind', 'cycle_finished', 'ref', v_ref)));

  elsif v_test = 'runs_together' then
    -- the first day every listed habit's run reaches `run` at once
    v_need := public.career_num(p_body -> 'run');
    with hs as (select distinct x as h from jsonb_array_elements_text(case when jsonb_typeof(p_body -> 'habits') = 'array' then p_body -> 'habits' else '[]'::jsonb end) x),
    tg as (select hs.h, coalesce(public.career_num(p_ctx -> 'targets' -> hs.h),
                                 case when coalesce(p_ctx -> 'custom', '[]'::jsonb) ? hs.h then 1 end) as tgt from hs),
    dn as (
      select tg.h, f.day as d from public.career_facts f join tg on substr(f.ref, 12) = tg.h
       where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null
         and jsonb_typeof(f.value -> 'v') = 'number' and (f.value ->> 'v')::numeric >= tg.tgt
    ),
    isl as (select dn.h, dn.d, dn.d - (row_number() over (partition by dn.h order by dn.d))::int as grp from dn),
    rl as (select isl.h, isl.d, (row_number() over (partition by isl.h, isl.grp order by isl.d))::int as run from isl)
    select min(z.d) into v_day from (
      select rl.d from rl where rl.run >= v_need group by rl.d
      having count(distinct rl.h) = (select count(*) from hs)
    ) z
    where (select count(*) from hs) > 0 and (select count(*) from tg where tg.tgt is not null) = (select count(*) from hs);
    v_ev := jsonb_build_object('via', 'runs_together', 'n', v_need, 'facts', '[]'::jsonb);

  elsif v_test = 'patterns_in_cycle' then
    -- a personal best in every group of movement patterns within one cycle; a lift is placed by the Spine (an approved entry whose name or
    -- alias it is, compared as career_norm() compares lifts); one the Spine cannot place counts for nothing
    with cyc as (select (e ->> 'num')::int as num, (e ->> 'cstart')::date as cs, (e ->> 'cend')::date as ce
                   from jsonb_array_elements(coalesce(p_ctx -> 'cycles', '[]'::jsonb)) e),
    grp as (select g2.key as gname, pv.value #>> '{}' as pat
              from jsonb_each(case when jsonb_typeof(p_body -> 'groups') = 'object' then p_body -> 'groups' else '{}'::jsonb end) g2,
                   jsonb_array_elements(case when jsonb_typeof(g2.value) = 'array' then g2.value else '[]'::jsonb end) pv),
    ng as (select count(distinct grp.gname) as n from grp),
    sp as (select public.career_norm(e.name) as nm, e.pattern from public.exercises e where e.status = 'approved' and e.pattern is not null
           union
           select public.career_norm(a.x), e.pattern from public.exercises e cross join unnest(e.aliases) a(x)
            where e.status = 'approved' and e.pattern is not null),
    pb as (select f.day, f.ref, public.career_norm(f.value ->> 'lift') as lift from public.career_facts f
            where f.athlete_id = p_athlete and f.kind = 'personal_best' and f.void_at is null),
    hit as (select c.num, gr.gname, min(pb.day) as d
              from cyc c join pb on pb.day between c.cs and c.ce join sp on sp.nm = pb.lift join grp gr on gr.pat = sp.pattern
             group by c.num, gr.gname),
    got as (select hit.num, max(hit.d) as d from hit group by hit.num
             having count(*) = (select ng.n from ng) and (select ng.n from ng) > 0)
    select got.d, got.num into v_day, v_num from got order by got.d, got.num limit 1;
    if v_day is not null then
      select coalesce(jsonb_agg(jsonb_build_object('kind', 'personal_best', 'ref', z.ref)), '[]'::jsonb) into v_facts
        from (select f.ref from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'personal_best' and f.void_at is null
                 and f.day = v_day order by f.ref limit 5) z;
      v_ev := jsonb_build_object('via', 'patterns_in_cycle', 'n', v_num, 'facts', v_facts);
    end if;

  elsif v_test = 'cycle_proving' then
    -- one cycle with `bests` personal bests in its dates, `retests` retests beaten, at least one week held and none broken
    v_bests := greatest(coalesce(public.career_num(p_body -> 'bests'), 1), 1)::int;
    v_rets := greatest(coalesce(public.career_num(p_body -> 'retests'), 0), 0)::int;
    with cyc as (select (e ->> 'num')::int as num, (e ->> 'cstart')::date as cs, (e ->> 'cend')::date as ce
                   from jsonb_array_elements(coalesce(p_ctx -> 'cycles', '[]'::jsonb)) e),
    x as (
      select c.num,
             (select f.day from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'personal_best' and f.void_at is null
                 and f.day between c.cs and c.ce order by f.day, f.ref offset v_bests - 1 limit 1) as b_day,
             case when v_rets > 0 then
               (select f.day from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'retest_beaten' and f.void_at is null
                   and f.value ->> 'cycle' = c.num::text order by f.day, f.ref offset v_rets - 1 limit 1) end as r_day,
             (select min(f.day) from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'week_held' and f.void_at is null
                 and f.value ->> 'cycle' = c.num::text) as h_day,
             exists (select 1 from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'week_broken' and f.void_at is null
                        and f.value ->> 'cycle' = c.num::text) as broken
        from cyc c
    )
    select greatest(x.b_day, x.r_day, x.h_day), x.num into v_day, v_num from x
     where x.b_day is not null and x.h_day is not null and not x.broken and (v_rets = 0 or x.r_day is not null)
     order by greatest(x.b_day, x.r_day, x.h_day), x.num limit 1;
    v_ev := jsonb_build_object('via', 'cycle_proving', 'n', v_num, 'facts', '[]'::jsonb);

  elsif v_test = 'run_regained' then
    -- after `away_weeks` or more broken weeks in a row with no session at all, the held-weeks run reaches the best run before the gap
    v_aw := greatest(coalesce(public.career_num(p_body -> 'away_weeks'), 4), 1)::int;
    for s in select e from jsonb_array_elements(coalesce(p_m -> 'weeks' -> 'walk', '[]'::jsonb)) e loop
      if s ->> 1 = 'h' then
        v_run := v_run + 1; v_away := 0;
        if v_armed and v_run >= v_old then
          v_day := (s ->> 0)::date;
          v_ev := jsonb_build_object('via', 'run_regained', 'n', v_run,
                                     'facts', jsonb_build_array(jsonb_build_object('kind', 'week_held', 'ref', s ->> 3)));
          exit;
        end if;
        v_best := greatest(v_best, v_run);
      else
        v_run := 0;
        if coalesce(public.career_num(s -> 2), 0) = 0 then v_away := v_away + 1; else v_away := 0; end if;
        if not v_armed and v_away >= v_aw and v_best > 0 then v_armed := true; v_old := v_best; end if;
      end if;
    end loop;

  elsif v_test = 'month_held' then
    -- stage79: Full Month, the month's honour made personal, by Courtside's own rule (stage75): every training week that ENDS in a calendar
    -- month (a plan week of a cycle, career_weeks()) has a week_held fact, and there are at least `weeks` of them. Decided once the month is
    -- over, so a cycle published later can never add a week to a month already awarded. The day is the month's last day.
    v_need := greatest(coalesce(public.career_num(p_body -> 'weeks'), 4), 1);
    with wk as (
      select date_trunc('month', w.wto)::date as m0,
             exists (select 1 from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'week_held' and f.void_at is null
                       and f.ref = 'c' || w.cycle_num || '|w' || w.week) as held
        from public.career_weeks(p_athlete) w
       where w.wto is not null and coalesce(array_length(w.plan, 1), 0) > 0),
    ms as (select wk.m0, count(*)::int as weeks, count(*) filter (where wk.held)::int as held from wk group by wk.m0)
    select ((ms.m0 + interval '1 month')::date - 1), ms.weeks into v_day, v_num from ms
     where ms.weeks >= v_need and ms.held = ms.weeks and (ms.m0 + interval '1 month')::date <= current_date
     order by ms.m0 limit 1;
    v_ev := jsonb_build_object('via', 'month_held', 'n', v_num, 'facts', '[]'::jsonb);
  end if;

  if v_day is null then return c_none; end if;
  return jsonb_build_object('crossed', jsonb_build_array(jsonb_build_object('day', v_day, 'evidence', coalesce(v_ev, '{}'::jsonb))));
end $function$;
revoke all on function public.career_achievement_eval(p_athlete text, p_id text, p_body jsonb, p_m jsonb, p_ctx jsonb) from public, anon, authenticated, service_role;
grant execute on function public.career_achievement_eval(p_athlete text, p_id text, p_body jsonb, p_m jsonb, p_ctx jsonb) to service_role;

-- ── career_rewards_batch ──────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.career_rewards_batch(p_offset integer, p_limit integer, p_how text DEFAULT 'baseline'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_id text; v_lines jsonb := '[]'::jsonb; v_before jsonb; v_after jsonb; v_line jsonb; v_ok boolean := true;
begin
  if not public.career_catalogue_on() then
    raise exception 'career_rewards_batch: the catalogue switch is off (rulebook.toml → [switch] catalogue)';
  end if;
  if p_how is null or p_how not in ('baseline', 'silent') then
    raise exception 'career_rewards_batch: p_how is baseline or silent, not %', p_how;
  end if;
  for v_id in select x from public.career_rewards_athletes(p_offset, p_limit) x loop
    begin
      perform public.career_evaluate(v_id, null, p_how);
      v_after := public.career_scored(v_id);
      v_before := null;      -- stage79: the go-day's copy only while it exists (it is dropped on 2026-11-01)
      if to_regclass('backup.career_catalogue_before') is not null then
        execute 'select b.score from backup.career_catalogue_before b where b.athlete_id = $1' into v_before using v_id;
      end if;
      v_line := public.career_rewards_line(v_id, coalesce(v_before, v_after), v_after);
    exception when others then
      v_line := jsonb_build_object('athlete_id', v_id, 'ok', false, 'error', sqlerrm);
    end;
    v_ok := v_ok and coalesce((v_line ->> 'ok')::boolean, false);
    v_lines := v_lines || jsonb_build_array(v_line);
  end loop;
  return jsonb_build_object('n', jsonb_array_length(v_lines), 'ok', v_ok, 'lines', v_lines);
end $function$;
revoke all on function public.career_rewards_batch(p_offset integer, p_limit integer, p_how text) from public, anon, authenticated, service_role;
grant execute on function public.career_rewards_batch(p_offset integer, p_limit integer, p_how text) to service_role;

