-- rollback_stage109.sql — puts career_weeks() back as it was before stage109 (supabase/stage109_optional_day.sql): every day of workouts.days is a
-- plan day again, so a week is held only when the optional day was done too. On Amir's word only. Refuses unless career_weeks() is stage109's body.

do $rollback109_guard$
declare v text;
begin
  v := md5(btrim(regexp_replace(pg_get_functiondef('public.career_weeks(text)'::regprocedure), '\s+', ' ', 'g')));
  if v <> 'ae6047dfac80b79de67a1fe347003c86' then
    raise exception 'rollback109: career_weeks(text) is not the stage109 body (md5 %). Nothing was changed.', v;
  end if;
end
$rollback109_guard$;

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
                from jsonb_array_elements(case when jsonb_typeof(c.data -> 'workouts' -> 'days') = 'array'
                                               then c.data -> 'workouts' -> 'days' else '[]'::jsonb end) with ordinality y(d, o))
           else coalesce(
             (select array_agg(coalesce(y.d ->> 'id', y.o::text) order by y.o)
                from (select v.data from public.program_versions v
                       where v.athlete_id = p_athlete and jsonb_typeof(v.data -> 'currentCycleIndex') = 'number'
                         and public.career_num(v.data -> 'currentCycleIndex') = c.idx
                       order by v.saved_at desc limit 1) lv,
                     jsonb_array_elements(case when jsonb_typeof(lv.data -> 'workouts' -> 'days') = 'array'
                                               then lv.data -> 'workouts' -> 'days' else '[]'::jsonb end) with ordinality y(d, o)),
             (select array_agg(g::text order by g)
                from (select h.v as h from jsonb_array_elements(c.hist) as h(v)
                       where h.v ->> 'id' = 'prog' || c.num limit 1) hp,
                     generate_series(1, case when jsonb_typeof(hp.h -> 'days') = 'array' then jsonb_array_length(hp.h -> 'days') else 0 end) g),
             (select array_agg(g::text order by g)
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
