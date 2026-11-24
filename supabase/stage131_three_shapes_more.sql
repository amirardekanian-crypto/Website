-- stage131_three_shapes_more.sql — Three Shapes, phases 2 and 3: the four tests stage130 did not have (2026-11-24)
--
-- Round 15 'Over the Line', #159 Three Shapes, Everywhere (Amir: "go with your picks", "i like your ladder", "Yes, apply it"). Stage130 gave the
-- server the month and run shapes; four entries of phases 2 and 3 need a test of their own. Same pattern as stage130: a measure key answered by
-- career_measure_more(), read by career_achievement_eval() the way `total` is (the first step that reaches `at`). Forward only (D20), every new
-- entry carries paid_from (D21).
--
--   month_count       facts of one kind in one calendar month, counted                          key mcnt:<reads>     4 Library sessions, 3 bests
--   month_all         calendar months, once over, in which every plan week ending in the month    key mall:<reads>     Full Moving Month
--                     (a cycle's training week, career_weeks(), at least 4 of them) holds the
--                     fact dated its first day (move_week)
--   weeks_checked_in  plan weeks in a row in which every finished session (full or early) has its  key wchk             Straight Talk's in-a-row shape
--                     check-in (checkin_done carries the session's ref) and there is at least one
--   cycles_running    cycles in a row (career_weeks(), by cycle_index) each holding the fact        key crun:<reads>     a best in 3 cycles running
--                     inside its dates
--
-- No new table. Guarded: the stage rewrites career_measure_more(), career_more_key() and career_more_kinds() (stage130's own functions) and widens
-- the lists stage130 put in four functions, raising and changing nothing when one of them is not the text it expects. Safe to re-run. The way back:
-- scripts/career/rollback_stage131.sql.

do $stage131_guard$
begin
  if to_regprocedure('public.career_measure_more(text,jsonb,text)') is null or to_regprocedure('public.career_more_key(jsonb)') is null then
    raise exception 'stage131: stage130 is missing. Nothing was changed.';
  end if;
end $stage131_guard$;

create or replace function public.career_more_key(p_body jsonb)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case public.career_achievement_test(p_body)
           when 'sum' then 'fsum:' || coalesce(p_body ->> 'reads', '') || ':' || coalesce(p_body ->> 'field', 'mins')
           when 'kind_first' then 'kind:' || coalesce(p_body ->> 'reads', '') || ':'
                                  || coalesce((select string_agg(x, ',' order by x) from jsonb_array_elements_text(
                                                 case when jsonb_typeof(p_body -> 'kinds') = 'array' then p_body -> 'kinds' else '[]'::jsonb end) x), '')
           when 'kinds_in_cycle' then 'kcyc:' || coalesce(p_body ->> 'reads', '')
           when 'weeks_running' then 'wrun:' || coalesce(p_body ->> 'reads', '')
           when 'days_running' then 'drun:' || coalesce(p_body ->> 'reads', '')
           when 'month_sum' then case when p_body ? 'habit' then 'msumh:' || (p_body ->> 'habit')
                                      else 'msum:' || coalesce(p_body ->> 'reads', '') || ':' || coalesce(p_body ->> 'field', 'mins') end
           when 'month_days' then case when p_body ? 'habit' then 'mdays:' || (p_body ->> 'habit')
                                       else 'mdays:@' || coalesce(p_body ->> 'reads', '') end
           when 'month_count' then 'mcnt:' || coalesce(p_body ->> 'reads', '')                    /* stage131 */
           when 'month_all' then 'mall:' || coalesce(p_body ->> 'reads', '')
           when 'weeks_checked_in' then 'wchk:checkin_done'
           when 'cycles_running' then 'crun:' || coalesce(p_body ->> 'reads', '')
         end
$function$;

create or replace function public.career_more_kinds(p_body jsonb)
returns text[]
language sql
immutable
set search_path to 'public'
as $function$
  select case when public.career_achievement_test(p_body) in ('sum', 'kind_first', 'kinds_in_cycle', 'weeks_running', 'days_running', 'month_count', 'month_all', 'cycles_running')
                then array[coalesce(p_body ->> 'reads', '')]
              when public.career_achievement_test(p_body) in ('month_sum', 'month_days')
                then case when p_body ? 'habit' then array['habit_done'] else array[coalesce(p_body ->> 'reads', '')] end
              when public.career_achievement_test(p_body) = 'weeks_checked_in'
                then array['checkin_done', 'session_finished', 'session_finished_early']                   /* stage131 */
         end
$function$;

-- stage130's measure, with the four new keys after its own.
create or replace function public.career_measure_more(p_athlete text, p_ctx jsonb, p_key text)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_pre text := split_part(p_key, ':', 1); v_a text := split_part(p_key, ':', 2); v_b text := substr(p_key, length(split_part(p_key, ':', 1)) + length(split_part(p_key, ':', 2)) + 3);
  v_t numeric; v_out jsonb;
  c_empty constant jsonb := '{"have": 0, "now": null, "steps": []}'::jsonb;
begin
  if v_pre = 'fsum' then
    with x as (select f.day as d, f.ref, coalesce(public.career_num(f.value -> v_b), 0) as val from public.career_facts f
                where f.athlete_id = p_athlete and f.kind = v_a and f.void_at is null),
    acc as (select x.d, x.ref, x.val, sum(x.val) over (order by x.d, x.ref) as tot from x)
    select jsonb_build_object('have', coalesce((select sum(x.val) from x), 0), 'now', null,
             'steps', coalesce((select jsonb_agg(jsonb_build_array(acc.d, acc.tot, v_a, acc.ref) order by acc.d, acc.ref) from acc where acc.val > 0), '[]'::jsonb))
      into v_out;

  elsif v_pre = 'kind' then
    with x as (select f.day as d, f.ref, (row_number() over (order by f.day, f.ref))::int as n from public.career_facts f
                where f.athlete_id = p_athlete and f.kind = v_a and f.void_at is null and (f.value ->> 'kind') = any (string_to_array(v_b, ',')))
    select jsonb_build_object('have', (select count(*) from x), 'now', null,
             'steps', coalesce((select jsonb_agg(jsonb_build_array(x.d, x.n, v_a, x.ref) order by x.n) from x), '[]'::jsonb))
      into v_out;

  elsif v_pre = 'kcyc' then
    with cyc as (select distinct w.cstart as cs, w.cend as ce from public.career_weeks(p_athlete) w where w.cstart is not null and w.cend is not null),
    x as (select c.cs, f.day as d, f.ref, f.value ->> 'kind' as k from cyc c join public.career_facts f
             on f.athlete_id = p_athlete and f.kind = v_a and f.void_at is null and f.day between c.cs and c.ce and f.value ->> 'kind' is not null),
    firsts as (select distinct on (x.cs, x.k) x.cs, x.k, x.d, x.ref from x order by x.cs, x.k, x.d, x.ref),
    run as (select firsts.cs, firsts.d, firsts.ref, (row_number() over (partition by firsts.cs order by firsts.d, firsts.ref))::int as n from firsts),
    mx as (select run.*, coalesce(max(run.n) over (order by run.d, run.ref rows between unbounded preceding and 1 preceding), 0) as prev from run)
    select jsonb_build_object('have', coalesce((select max(run.n) from run), 0), 'now', null,
             'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.n, v_a, mx.ref) order by mx.d, mx.ref) from mx where mx.n > mx.prev), '[]'::jsonb))
      into v_out;

  elsif v_pre = 'wrun' then
    with cw as (select w.wfrom, w.wto from public.career_weeks(p_athlete) w where w.wfrom is not null and w.wto is not null),
    x as (select f.day as d, f.ref,
                 case when v_a = 'move_week' then f.day
                      else coalesce((select cw.wfrom from cw where f.day between cw.wfrom and cw.wto order by cw.wfrom desc limit 1),
                                    date_trunc('week', f.day)::date) end as wk
            from public.career_facts f where f.athlete_id = p_athlete and f.kind = v_a and f.void_at is null),
    w as (select x.wk, min(x.d) as fd, (array_agg(x.ref order by x.d, x.ref))[1] as ref from x group by x.wk),
    isl as (select w.*, w.wk - (7 * row_number() over (order by w.wk))::int as grp from w),
    rl as (select isl.*, (row_number() over (partition by isl.grp order by isl.wk))::int as run from isl),
    mx as (select rl.*, coalesce(max(rl.run) over (order by rl.wk rows between unbounded preceding and 1 preceding), 0) as prev from rl)
    select jsonb_build_object('have', coalesce((select max(rl.run) from rl), 0),
             'now', coalesce((select rl.run from rl where rl.wk >= current_date - 13 order by rl.wk desc limit 1), 0),
             'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.fd, mx.run, v_a, mx.ref) order by mx.wk) from mx where mx.run > mx.prev), '[]'::jsonb))
      into v_out;

  elsif v_pre = 'drun' then
    with x as (select f.day as d, min(f.ref) as ref from public.career_facts f where f.athlete_id = p_athlete and f.kind = v_a and f.void_at is null group by f.day),
    isl as (select x.*, x.d - (row_number() over (order by x.d))::int as grp from x),
    rl as (select isl.*, (row_number() over (partition by isl.grp order by isl.d))::int as run from isl),
    mx as (select rl.*, coalesce(max(rl.run) over (order by rl.d rows between unbounded preceding and 1 preceding), 0) as prev from rl)
    select jsonb_build_object('have', coalesce((select max(rl.run) from rl), 0),
             'now', coalesce((select rl.run from rl where rl.d >= current_date - 1 order by rl.d desc limit 1), 0),
             'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.run, v_a, mx.ref) order by mx.d) from mx where mx.run > mx.prev), '[]'::jsonb))
      into v_out;

  elsif v_pre in ('msum', 'msumh', 'mdays', 'mcnt') then
    if v_pre in ('msumh', 'mdays') and v_a not like '@%' then
      v_t := coalesce(public.career_num(p_ctx -> 'targets' -> v_a), case when coalesce(p_ctx -> 'custom', '[]'::jsonb) ? v_a then 1 end);
      if v_t is null then return c_empty; end if;
    end if;
    with x as (
      select f.day as d, f.ref, f.kind,
             case when v_pre = 'msum' then coalesce(public.career_num(f.value -> v_b), 0)
                  when v_pre = 'msumh' then coalesce(public.career_num(f.value -> 'v'), 0)
                  else 1 end as val
        from public.career_facts f
       where f.athlete_id = p_athlete and f.void_at is null
         and case when v_pre in ('msum', 'mcnt') then f.kind = v_a
                  when v_a like '@%' then f.kind = substr(v_a, 2)
                  else f.kind = 'habit_done' and substr(f.ref, 12) = v_a and jsonb_typeof(f.value -> 'v') = 'number'
                       and (v_pre = 'msumh' or (f.value ->> 'v')::numeric >= v_t) end),
    acc as (select x.*, sum(x.val) over (partition by date_trunc('month', x.d) order by x.d, x.ref) as tot from x where x.val > 0),
    mx as (select acc.*, coalesce(max(acc.tot) over (order by acc.d, acc.ref rows between unbounded preceding and 1 preceding), 0) as prev from acc)
    select jsonb_build_object('have', coalesce((select max(acc.tot) from acc), 0),
             'now', coalesce((select max(acc.tot) from acc where date_trunc('month', acc.d) = date_trunc('month', current_date::timestamp)), 0),
             'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.tot, mx.kind, mx.ref) order by mx.d, mx.ref) from mx where mx.tot > mx.prev), '[]'::jsonb))
      into v_out;

  elsif v_pre = 'mall' then          -- stage131: calendar months, once over, whose plan weeks (4 or more) all hold the fact on their first day
    with wk as (select date_trunc('month', w.wto)::date as m0,
                       exists (select 1 from public.career_facts f where f.athlete_id = p_athlete and f.kind = v_a and f.void_at is null and f.day = w.wfrom) as hit
                  from public.career_weeks(p_athlete) w
                 where w.wto is not null and w.wfrom is not null and coalesce(array_length(w.plan, 1), 0) > 0),
    ms as (select wk.m0 from wk group by wk.m0
            having count(*) >= 4 and bool_and(wk.hit) and (wk.m0 + interval '1 month')::date <= current_date),
    n as (select ((ms.m0 + interval '1 month')::date - 1) as d, (row_number() over (order by ms.m0))::int as n from ms)
    select jsonb_build_object('have', (select count(*) from n), 'now', null,
             'steps', coalesce((select jsonb_agg(jsonb_build_array(n.d, n.n, v_a, null) order by n.n) from n), '[]'::jsonb))
      into v_out;

  elsif v_pre = 'wchk' then          -- stage131: plan weeks in a row in which every finished session has its check-in (and there is one)
    with cw as (select distinct w.wfrom, w.wto from public.career_weeks(p_athlete) w where w.wfrom is not null and w.wto is not null and w.wfrom <= current_date),
    wk as (select cw.wfrom, cw.wto,
                  (select count(*) from public.career_facts s where s.athlete_id = p_athlete and s.void_at is null
                      and s.kind in ('session_finished', 'session_finished_early') and s.day between cw.wfrom and cw.wto) as sess,
                  (select count(*) from public.career_facts s where s.athlete_id = p_athlete and s.void_at is null
                      and s.kind in ('session_finished', 'session_finished_early') and s.day between cw.wfrom and cw.wto
                      and not exists (select 1 from public.career_facts c where c.athlete_id = p_athlete and c.kind = 'checkin_done' and c.void_at is null and c.ref = s.ref)) as miss
             from cw),
    ok as (select wk.wfrom, wk.wto from wk where wk.sess > 0 and wk.miss = 0),
    isl as (select ok.*, ok.wfrom - (7 * row_number() over (order by ok.wfrom))::int as grp from ok),
    rl as (select isl.*, (row_number() over (partition by isl.grp order by isl.wfrom))::int as run from isl),
    mx as (select rl.*, coalesce(max(rl.run) over (order by rl.wfrom rows between unbounded preceding and 1 preceding), 0) as prev from rl)
    select jsonb_build_object('have', coalesce((select max(rl.run) from rl), 0),
             'now', coalesce((select rl.run from rl where rl.wto >= current_date - 7 order by rl.wfrom desc limit 1), 0),
             'steps', coalesce((select jsonb_agg(jsonb_build_array(least(mx.wto, current_date), mx.run, 'checkin_done', null) order by mx.wfrom) from mx where mx.run > mx.prev), '[]'::jsonb))
      into v_out;

  elsif v_pre = 'crun' then          -- stage131: cycles in a row (by cycle_index), each holding the fact inside its dates
    with cyc as (select distinct w.cycle_index as ci, w.cstart as cs, w.cend as ce from public.career_weeks(p_athlete) w where w.cstart is not null and w.cend is not null),
    hit as (select cyc.ci, (select f.day from public.career_facts f where f.athlete_id = p_athlete and f.kind = v_a and f.void_at is null
                              and f.day between cyc.cs and cyc.ce order by f.day, f.ref limit 1) as d,
                   (select f.ref from public.career_facts f where f.athlete_id = p_athlete and f.kind = v_a and f.void_at is null
                              and f.day between cyc.cs and cyc.ce order by f.day, f.ref limit 1) as ref
              from cyc),
    ok as (select * from hit where hit.d is not null),
    isl as (select ok.*, ok.ci - (row_number() over (order by ok.ci))::int as grp from ok),
    rl as (select isl.*, (row_number() over (partition by isl.grp order by isl.ci))::int as run from isl),
    mx as (select rl.*, coalesce(max(rl.run) over (order by rl.ci rows between unbounded preceding and 1 preceding), 0) as prev from rl)
    select jsonb_build_object('have', coalesce((select max(rl.run) from rl), 0), 'now', null,
             'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.run, v_a, mx.ref) order by mx.ci) from mx where mx.run > mx.prev), '[]'::jsonb))
      into v_out;
  end if;
  return coalesce(v_out, c_empty);
end $function$;
revoke all on function public.career_measure_more(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.career_measure_more(text, jsonb, text) to service_role;

-- stage130's lists in four functions take the four new tests.
do $stage131_patch$
declare d text; a text; n int; f text;
  old_list constant text := '''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days''';
  new_list constant text := '''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'', ''month_count'', ''month_all'', ''weeks_checked_in'', ''cycles_running''';
begin
  foreach f in array array['public.career_entry_kinds(text,jsonb)', 'public.career_entry_keys(text,jsonb,jsonb)',
                           'public.career_achievement_eval(text,text,jsonb,jsonb,jsonb)', 'public.get_achievements(text)'] loop
    d := pg_get_functiondef(f::regprocedure);
    if position('weeks_checked_in' in d) > 0 then continue; end if;   -- already patched
    n := (length(d) - length(replace(d, old_list, ''))) / length(old_list);
    if n not in (1, 2) or (f = 'public.get_achievements(text)' and n <> 2) or (f <> 'public.get_achievements(text)' and n <> 1) then
      raise exception 'stage131: % is not the function this stage expects (% lists). Nothing was changed.', f, n;
    end if;
    execute replace(d, old_list, new_list);
  end loop;
  -- career_measures(): the four new key prefixes
  d := pg_get_functiondef('public.career_measures(text,jsonb,text[])'::regprocedure);
  if position('mcnt' in d) = 0 then
    a := '''^(fsum|kind|kcyc|wrun|drun|msum|msumh|mdays):''';
    n := (length(d) - length(replace(d, a, ''))) / length(a);
    if n <> 1 then raise exception 'stage131: career_measures() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
    execute replace(d, a, '''^(fsum|kind|kcyc|wrun|drun|msum|msumh|mdays|mcnt|mall|wchk|crun):''');
  end if;
end $stage131_patch$;
