-- stage115_five_weeks.sql — Five Weeks: what an athlete did, day by day, over the cycle's weeks (2026-11-21)
--
-- Amir: "my aim is to have a activity tracker for people so they can see what kind of activity they had over the past month or
-- 5 weeks", then "go with your picks" (round 11, https://claude.ai/artifact/7yRMTQJAmuJjkLmwZ7PQo2): #122 Five Weeks, a grid on
-- Progress, and #124 The Mirror, the same grid in coach.html.
--
-- What this does: ONE new reader, get_five_weeks(p_athlete_id). It returns the athlete's current cycle week by week (the weeks of
-- career_weeks(), the same weeks as the Player Page's Cycle Bars, so the two can never disagree), and for every day what was done:
-- a plan session or a Library session, its title, its minutes, and a Library session's shelf. Between cycles it returns the last
-- cycle. It reads career_facts exactly as crew_page() does for your own page (session_finished, session_finished_early and
-- library_session, not voided), so a session hidden from the dashboard and voided there stays out here too.
--
-- Who may read it: the athlete themself (current_athlete_id()) and the coach (is_coach()). Nobody else, ever: a Library title can
-- hint at pain (crew_page()'s own rule), so this never reaches the crew.
--
-- Nothing else changes: no table, no column, no backup or erase list. Safe to re-run.

create or replace function public.get_five_weeks(p_athlete_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare v_out jsonb;
begin
  if p_athlete_id is null or (not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id()) then
    raise exception 'not your athlete record';
  end if;

  with cw as (select * from public.career_weeks(p_athlete_id)),
  w as (
    select * from cw where cw.is_current
    union all
    select * from cw where not exists (select 1 from cw c2 where c2.is_current)
                       and cw.cycle_index = (select max(c3.cycle_index) from cw c3 where c3.cstart <= current_date)),
  pdays as (select p.data -> 'workouts' -> 'days' as days from public.programs p where p.athlete_id = p_athlete_id),
  f as (
    select cf.day as d, cf.ref, cf.kind,
           case when cf.kind in ('session_finished', 'session_finished_early') then nullif(btrim(cf.value ->> 'plan_day'), '') end as pday,
           case when (cf.value ->> 'minutes') ~ '^\d{1,4}$' then (cf.value ->> 'minutes')::int end as mins,
           cf.value ->> 'slug' as slug
      from public.career_facts cf
     where cf.athlete_id = p_athlete_id and cf.void_at is null
       and cf.kind in ('session_finished', 'session_finished_early', 'library_session')
       and cf.day between (select min(w1.wfrom) from w w1) and (select max(w2.wto) from w w2)),
  fw as (
    select w.week, f.*,
           (f.pday is not null and f.pday = any (w.plan)
            and row_number() over (partition by w.week, f.pday order by f.d, f.ref) = 1) as in_plan
      from f join w on f.d between w.wfrom and w.wto),
  fd as (
    select fw.week, fw.d, fw.ref, fw.in_plan, fw.mins,
           case when fw.kind = 'library_session' then 'library' else 'plan' end as k,
           ls.category_id as shelf,
           left(btrim(regexp_replace(
             case when fw.kind = 'library_session'
                  then coalesce(ls.title, 'Library session')
                  else coalesce((select coalesce(nullif(btrim(e ->> 'title'), ''), nullif(btrim(e ->> 'focusTag'), ''))
                                   from pdays pd, jsonb_array_elements(case when jsonb_typeof(pd.days) = 'array' then pd.days else '[]'::jsonb end) e
                                  where e ->> 'id' = fw.pday limit 1), case when fw.pday is not null then 'Day ' || fw.pday else 'Session' end) end,
             '\s+', ' ', 'g')), 60) as title
      from fw
      left join lateral (select l.title, l.category_id from public.library_sessions l
                          where fw.kind = 'library_session' and l.athlete_id = p_athlete_id and l.slug = fw.slug and l.completed_on = fw.d
                          limit 1) ls on true),
  wk as (
    select fd.week,
           count(*) filter (where fd.in_plan) as done,
           jsonb_agg(jsonb_strip_nulls(jsonb_build_object('day', fd.d, 'k', fd.k, 'title', fd.title, 'mins', fd.mins, 'shelf', fd.shelf,
                                                          'extra', case when fd.k = 'plan' and not fd.in_plan then true end))
                     order by fd.d, fd.ref) as days
      from fd group by fd.week)
  select jsonb_build_object(
           'n', max(w.cycle_num), 'from', max(w.cstart), 'to', max(w.cend), 'current', bool_or(w.is_current),
           'weeks', coalesce(jsonb_agg(jsonb_build_object(
                      'w', w.week, 'from', w.wfrom, 'to', w.wto, 'plan', cardinality(w.plan), 'done', coalesce(wk.done, 0),
                      'held', exists (select 1 from public.career_facts h
                                       where h.athlete_id = p_athlete_id and h.kind = 'week_held' and h.void_at is null
                                         and h.ref = 'c' || w.cycle_num || '|w' || w.week),
                      'now', current_date between w.wfrom and w.wto,
                      'days', coalesce(wk.days, '[]'::jsonb)) order by w.week), '[]'::jsonb))
    into v_out
    from w left join wk on wk.week = w.week
  having count(*) > 0;

  return v_out;
end
$function$;

revoke all on function public.get_five_weeks(text) from public, anon;
grant execute on function public.get_five_weeks(text) to authenticated, service_role;

do $stage115_check$
begin
  if to_regprocedure('public.get_five_weeks(text)') is null then raise exception 'stage115: get_five_weeks() is missing'; end if;
  raise notice 'stage115: applied';
end
$stage115_check$;
