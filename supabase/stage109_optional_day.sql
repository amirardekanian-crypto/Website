-- stage109_optional_day.sql — an optional programme day: shown and logged like any other, never part of the week's plan (2026-11-18)
--
-- Why (Amir, 2026-11-18): he wanted an easy zone 2 cardio day in one athlete's Cycle 2 that the athlete may do or skip. Until now a week was
-- held only when EVERY id in workouts.days had a session in it, so a day the athlete was free to skip had to be written on a notes card instead
-- of being a real day in the app.
--
-- The field: a day in workouts.days may carry "optional": true (SCHEMA.md → workouts.days[n]). Only the JSON value true counts; absent, false or
-- anything else is a plan day, as every day has been until today.
--
-- What this changes: ONE function, career_weeks(text). Its `plan` (the ids of a cycle's plan days) leaves out every optional day, from all three
-- sources it reads: the programme's own days for the current cycle, the newest saved version for a past one, and the archive entry (programHistory,
-- by position) after that. The return shape is unchanged, so every reader follows without an edit:
--   career_derive(): `held` asks for every plan day (an optional day is not one), `nsess` and `by_book` count plan-day sessions only, the spare
--       (stage106) covers plan days only, and cycle_finished counts done ÷ (plan days × weeks) without the optional day on either side;
--   career_cycle_wins() / career_entry_sets(): the effort wins of a cycle read plan-day sessions (an optional day's lifts are not compared);
--   crew_page(): an optional day's session is drawn as `extra`, the bonus mark the week view already has, and per_week is the plan days;
--   career_facts_paid(): a session on an optional day still PAYS as a session. Its limit key (plan_day_week) finds no plan week for it and falls
--       back to the ISO week and the day id, so it is still capped per day per week as every session is;
--   the month figures (month_held, honours) count weeks with a plan, as before.
-- Session XP, the full log, the check-in, the push reminders (days since the last finished session) and every count of sessions are untouched:
-- an optional session is a real session.
--
-- D20 (a change of rules applies forward only): this changes how a week is worked out, so it was checked against the live rows before it was
-- applied: on 2026-11-18 no day in programs, program_versions or any programHistory entry carried an "optional" key, so not one past week, fact or
-- award moves. A day marked optional LATER, in the current cycle, re-judges that cycle's weeks at the next evaluate (a week broken only by that
-- day becomes held); a closed cycle is read from its saved version and does not move.
--
-- Twins (CLAUDE.md, things that exist more than once): program.html planDayIds() (the week count, holdState(), careerEarn()'s week-closes and
-- week-left, weekDoneOn(), suggestedDayId(), leastTrainedDay()), coach.html planDaysC() (adherence and Days a week), scripts/check_program.py
-- (optional days out of the weekly volume and load). Rehearsed by scripts/career/rehearse_optional.mjs (PGlite, nothing live).
-- The way back: scripts/career/rollback_stage109.sql, on Amir's word only.
--
-- APPLIED 2026-11-18 to the live project as the migration `stage109_optional_day` (the statements are this file from `do $stage109_guard$` on;
-- the header is comment). Before and after, every athlete's career_weeks() rows (329) had the same plan, fingerprint
-- 5013f5951027956ebb097f3853088e20 on both sides: no week, fact or award moved. The grants are unchanged (execute: service_role).

do $stage109_guard$
declare v text;
begin
  if to_regprocedure('public.career_weeks(text)') is null then
    raise exception 'stage109: career_weeks(text) is not on this database (stage66). Nothing was changed.';
  end if;
  v := md5(btrim(regexp_replace(pg_get_functiondef('public.career_weeks(text)'::regprocedure), '\s+', ' ', 'g')));
  if v = 'ae6047dfac80b79de67a1fe347003c86' then
    raise notice 'stage109: already applied, nothing to do.';
  elsif v <> '0c4ad75fae14650adde37715c3909ea9' then
    raise exception 'stage109: career_weeks(text) is not the body this stage was written against (md5 %, expected 0c4ad75f...). Nothing was changed.', v;
  end if;
end
$stage109_guard$;

CREATE OR REPLACE FUNCTION public.career_weeks(p_athlete text)
 RETURNS TABLE(cycle_index integer, cycle_num integer, week integer, weeks integer, wfrom date, wto date, cstart date, cend date, plan text[], is_current boolean, is_last boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with p as (select pr.data from public.programs pr where pr.athlete_id = p_athlete),
  cur as (
    select p.data,
           case when jsonb_typeof(p.data -> 'currentCycleIndex') = 'number'
                     and public.career_num(p.data -> 'currentCycleIndex') = trunc(public.career_num(p.data -> 'currentCycleIndex'))
                then public.career_num(p.data -> 'currentCycleIndex')::int else 0 end as cci,
           case when jsonb_typeof(p.data -> 'cycles') = 'array' then p.data -> 'cycles' else '[]'::jsonb end as cycles,
           case when jsonb_typeof(p.data -> 'programHistory') = 'array' then p.data -> 'programHistory' else '[]'::jsonb end as hist
      from p
  ),
  c as (
    select (x.o - 1)::int as idx,
           coalesce(case when public.career_num(x.c -> 'num') = trunc(public.career_num(x.c -> 'num'))
                         then public.career_num(x.c -> 'num')::int end, x.o::int) as num,
           public.career_day(x.c ->> 'startDate') as s, public.career_day(x.c ->> 'endDate') as e,
           cur.cci, jsonb_array_length(cur.cycles) as ncyc, cur.data, cur.hist
      from cur, jsonb_array_elements(cur.cycles) with ordinality x(c, o)
  ),
  planned as (
    select c.*,
           case when c.idx = c.cci then
             (select array_agg(coalesce(y.d ->> 'id', y.o::text) order by y.o)
                     filter (where (y.d -> 'optional') is distinct from 'true'::jsonb)   /* stage109: an optional day is never in the plan */
                from jsonb_array_elements(case when jsonb_typeof(c.data -> 'workouts' -> 'days') = 'array'
                                               then c.data -> 'workouts' -> 'days' else '[]'::jsonb end) with ordinality y(d, o))
           else coalesce(
             (select array_agg(coalesce(y.d ->> 'id', y.o::text) order by y.o)
                     filter (where (y.d -> 'optional') is distinct from 'true'::jsonb)   /* stage109: an optional day is never in the plan */
                from (select v.data from public.program_versions v
                       where v.athlete_id = p_athlete and jsonb_typeof(v.data -> 'currentCycleIndex') = 'number'
                         and public.career_num(v.data -> 'currentCycleIndex') = c.idx
                       order by v.saved_at desc limit 1) lv,
                     jsonb_array_elements(case when jsonb_typeof(lv.data -> 'workouts' -> 'days') = 'array'
                                               then lv.data -> 'workouts' -> 'days' else '[]'::jsonb end) with ordinality y(d, o)),
             (select array_agg(g::text order by g)
                     filter (where (hp.h -> 'days' -> (g - 1) -> 'optional') is distinct from 'true'::jsonb)   /* stage109 */
                from (select h.v as h from jsonb_array_elements(c.hist) as h(v)
                       where h.v ->> 'id' = 'prog' || c.num limit 1) hp,
                     generate_series(1, case when jsonb_typeof(hp.h -> 'days') = 'array' then jsonb_array_length(hp.h -> 'days') else 0 end) g),
             (select array_agg(g::text order by g)
                     filter (where (hp.h -> 'days' -> (g - 1) -> 'optional') is distinct from 'true'::jsonb)   /* stage109 */
                from (select c.hist -> (c.cci - 1 - c.idx) as h where jsonb_array_length(c.hist) = c.cci) hp,
                     generate_series(1, case when jsonb_typeof(hp.h -> 'days') = 'array' then jsonb_array_length(hp.h -> 'days') else 0 end) g))
           end as plan
      from c
     where c.idx <= c.cci
  )
  select pl.idx, pl.num, k::int, t.tot, pl.s + 7 * (k - 1), least(pl.s + 7 * k - 1, pl.e), pl.s, pl.e, pl.plan,
         pl.idx = pl.cci, pl.idx = pl.ncyc - 1
    from planned pl
   cross join lateral (select greatest(1, round((pl.e - pl.s) / 7.0)::int) as tot) t
   cross join lateral generate_series(1, t.tot) k
   where pl.s is not null and pl.e is not null and pl.e >= pl.s and cardinality(pl.plan) > 0
$function$;

-- No grant changes: create or replace keeps the stage66 grants (execute to service_role only).
