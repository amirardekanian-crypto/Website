-- stage122_weeks_outside_cycle.sql — Your weeks and the Steps credit outside a cycle (2026-11-22)
--
-- Amir: "why isnt tara activity not counted toward her steps?", then, on fixing it for every athlete before a cycle starts:
-- "yes and even after / because people may not renew program, but want to use the tracker".
--
-- The fault: get_five_weeks() drew only the current cycle's weeks (career_weeks() is_current, which is the programme's
-- currentCycleIndex, dated or not). Before that cycle starts, an activity fell before its first week; after the programme's last
-- cycle ended it drew that cycle for ever (one athlete's ended on 20 September), so a new activity fell after its last week.
-- Either way the phone had nothing to work the Steps credit from. The server paid the credit (stage121, from activity_log itself) and the phone
-- showed less, with nothing saying so.
--
-- What changes, in get_five_weeks() only:
--   1. In a cycle (today inside the current cycle's weeks): unchanged.
--   2. Outside one (before it starts, between cycles, after the last): the 5 weeks ending with this one. They start on the weekday the
--      athlete's weeks start on (the current cycle's, else the last that started, else the first to come, else Monday), so a week that is also a cycle's
--      week is that week exactly: its plan count and its held tick carry over. `n` is null (no "Cycle N" over a rolling window).
--   3. `acts`: every Court Log row from move_credit_from() and the last 70 days, whatever the weeks, as { day, kind, mins, effort, id }.
--      The phone works the Steps credit from these (program.html moveCreditMap()), so it is the server's number in or out of a cycle.
--   4. A plan session outside a planned week is no longer marked Extra (there is no plan to be extra to).
-- No new table. Safe to re-run.

do $stage122_guard$
begin
  if to_regprocedure('public.career_weeks(text)') is null or to_regprocedure('public.move_credit_from()') is null
     or to_regclass('public.activity_log') is null then
    raise exception 'stage122: career_weeks(), move_credit_from() (stage121) or activity_log (stage116) is missing. Nothing was changed.';
  end if;
end $stage122_guard$;

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
  -- stage122: in a cycle means today is inside the current cycle's weeks (career_weeks() calls the programme's currentCycleIndex
  -- current for ever, also a cycle that starts next week or ended in September)
  incyc as (select exists (select 1 from cw c where c.is_current and current_date between c.wfrom and c.wto) as yes),
  -- the weekday the athlete's weeks start on, and the start of the week holding today
  anc as (
    select coalesce((select max(c.cstart) from cw c where c.is_current),
                    (select max(c.cstart) from cw c where c.cstart <= current_date),
                    (select min(c.cstart) from cw c),
                    (current_date - (extract(isodow from current_date)::int - 1))) as a),
  roll as (
    select current_date - ((((current_date - anc.a) % 7) + 7) % 7) as this_from from anc),
  w as (
    select cw.cycle_num, cw.week, cw.week as cweek, cw.wfrom, cw.wto, cw.plan, true as is_current
      from cw, incyc where cw.is_current and incyc.yes
    union all
    -- outside a cycle, the 5 weeks ending with this one; a week that is also a cycle's keeps its plan and its held tick
    select m.cycle_num, gs.k, m.week, roll.this_from - (5 - gs.k) * 7, roll.this_from - (5 - gs.k) * 7 + 6, coalesce(m.plan, '{}'::text[]), false
      from roll cross join incyc cross join generate_series(1, 5) gs(k)
      left join cw m on m.wfrom = roll.this_from - (5 - gs.k) * 7
     where not incyc.yes),
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
    select w.week, cardinality(w.plan) as nplan, f.*,
           (f.pday is not null and f.pday = any (w.plan)
            and row_number() over (partition by w.week, f.pday order by f.d, f.ref) = 1) as in_plan
      from f join w on f.d between w.wfrom and w.wto),
  fd as (
    select fw.week, fw.d, fw.ref as sk, fw.in_plan,
           jsonb_strip_nulls(jsonb_build_object(
             'day', fw.d, 'k', case when fw.kind = 'library_session' then 'library' else 'plan' end,
             'title', left(btrim(regexp_replace(
                case when fw.kind = 'library_session'
                     then coalesce(ls.title, 'Library session')
                     else coalesce((select coalesce(nullif(btrim(e ->> 'title'), ''), nullif(btrim(e ->> 'focusTag'), ''))
                                      from pdays pd, jsonb_array_elements(case when jsonb_typeof(pd.days) = 'array' then pd.days else '[]'::jsonb end) e
                                     where e ->> 'id' = fw.pday limit 1), case when fw.pday is not null then 'Day ' || fw.pday else 'Session' end) end,
                '\s+', ' ', 'g')), 60),
             'mins', fw.mins, 'shelf', ls.category_id,
             'title_fa', case when fw.kind <> 'library_session' then (   -- stage117: the plan day's Farsi twin (COM-1)
                (select nullif(btrim(e ->> 'title_fa'), '')
                   from pdays pd, jsonb_array_elements(case when jsonb_typeof(pd.days) = 'array' then pd.days else '[]'::jsonb end) e
                  where e ->> 'id' = fw.pday limit 1)) end,
             'extra', case when fw.kind <> 'library_session' and not fw.in_plan and fw.nplan > 0 then true end)) as j   -- stage122: nplan
      from fw
      left join lateral (select l.title, l.category_id from public.library_sessions l
                          where fw.kind = 'library_session' and l.athlete_id = p_athlete_id and l.slug = fw.slug and l.completed_on = fw.d
                          limit 1) ls on true),
  -- stage116: what the athlete logged themself (Court Log). Never a plan session, so never in `done`.
  ad as (
    select w.week, a.day as d, 'z' || a.created_at::text || a.id::text as sk, false as in_plan,
           jsonb_build_object('day', a.day, 'k', case when a.kind in ('tennis', 'padel', 'match', 'beach_tennis', 'pickleball', 'squash', 'badminton') then 'court' else 'other' end,
                              'kind', a.kind, 'title', initcap(replace(a.kind, '_', ' ')), 'mins', a.minutes, 'effort', a.effort, 'id', a.id) as j
      from public.activity_log a join w on a.day between w.wfrom and w.wto
     where a.athlete_id = p_athlete_id),
  items as (select * from fd union all select * from ad),
  wk as (
    select it.week, count(*) filter (where it.in_plan) as done, jsonb_agg(it.j order by it.d, it.sk) as days
      from items it group by it.week)
  select jsonb_build_object(
           'n', case when bool_or(w.is_current) then max(w.cycle_num) end,
           'from', min(w.wfrom), 'to', max(w.wto), 'current', bool_or(w.is_current),
           'weeks', coalesce(jsonb_agg(jsonb_build_object(
                      'w', w.week, 'from', w.wfrom, 'to', w.wto, 'plan', cardinality(w.plan), 'done', coalesce(wk.done, 0),
                      'held', w.cycle_num is not null and w.cweek is not null
                              and exists (select 1 from public.career_facts h
                                           where h.athlete_id = p_athlete_id and h.kind = 'week_held' and h.void_at is null
                                             and h.ref = 'c' || w.cycle_num || '|w' || w.cweek),
                      'now', current_date between w.wfrom and w.wto,
                      'days', coalesce(wk.days, '[]'::jsonb)) order by w.week), '[]'::jsonb),
           -- stage122: the Court Log rows the Steps credit is worked from, whatever the weeks
           'acts', coalesce((select jsonb_agg(jsonb_build_object('day', a.day, 'kind', a.kind, 'mins', a.minutes, 'effort', a.effort, 'id', a.id)
                                              order by a.day, a.created_at)
                               from public.activity_log a
                              where a.athlete_id = p_athlete_id
                                and a.day >= greatest(public.move_credit_from(), current_date - 70)), '[]'::jsonb))
    into v_out
    from w left join wk on wk.week = w.week
  having count(*) > 0;

  return v_out;
end
$function$;

revoke all on function public.get_five_weeks(text) from public, anon;
grant execute on function public.get_five_weeks(text) to authenticated, service_role;

do $stage122_check$
begin
  if position('stage122' in pg_get_functiondef('public.get_five_weeks(text)'::regprocedure)) = 0 then
    raise exception 'stage122: get_five_weeks() was not replaced';
  end if;
  raise notice 'stage122: applied';
end
$stage122_check$;
