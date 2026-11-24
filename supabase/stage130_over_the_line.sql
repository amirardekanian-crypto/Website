-- stage130_over_the_line.sql — Over the Line: the court family, Full Week, and the month and run shapes (2026-11-24)
--
-- Round 15 'Over the Line' (ideas #146 to #159, https://claude.ai/artifact/3PxRLCNLFF8tDf3TudwBTx). Amir: "go with your picks", the three shapes of
-- an achievement (a single day, a month's total, days in a row; .claude/skills/ideas/TASTE.md), "i like your ladder". Rulebook version 15 brings the
-- catalogue rows; this stage gives the server what they read. Forward only (D20): every new entry carries paid_from (D21).
--
--   1. A COURT LOG ROW IS A FACT. `activity_done` (0 XP; rulebook.toml → [fact.activity_done]), one per activity_log row, ref 'act|<id>', on the
--      row's day, value { kind, mins, effort }. Written by career_observe_activity(), which career_on_activity() (the activity_log trigger) calls after
--      career_observe_proof() and before the awards are worked out, so a save wakes what reads it. A deleted row voids its fact; an award it won stays
--      (GAME-1). The Steps credit (stage119) and Move minutes (stage127) are untouched: this fact pays nothing, it is only counted.
--   2. SEVEN NEW ACHIEVEMENT TESTS, each a measure key of career_measures() read the way `total` reads one (the first step that reaches `at`):
--        sum            reads a fact, adds value.<field> (default mins) from the first day          key fsum:<reads>:<field>      Court Hours
--        kind_first     reads a fact whose value.kind is one of `kinds` (a list), counted                       key kind:<reads>:<kinds,...>     Match Day
--        kinds_in_cycle reads a fact, the different value.kind inside one cycle (career_weeks())      key kcyc:<reads>              Cross-Court
--        weeks_running  plan weeks in a row holding the fact: a plan week of a cycle (career_weeks()) key wrun:<reads>
--                       or, outside one, the calendar week; move_week is dated its week's first day, so its own day is its week
--        days_running   days in a row holding the fact (perfect_day)                                 key drun:<reads>
--        month_sum      in one calendar month: value.<field> of a fact added (reads), or a habit's    key msum:<reads>:<field> /
--                       logged numbers added (habit, as total:<habit> adds them)                    msumh:<habit>
--        month_days     in one calendar month: days a habit was done (habit), or days holding a fact  key mdays:<habit> / mdays:@<fact>
--                       (reads: day_on_target, perfect_day)
--      A month test's steps are the new highs of the month's running total, so its day is the day a month first reached `at`.
--   3. get_achievements() shows have / need for them (a run's best, a month's best).
--
-- No new table: the fact lives in career_facts (in BACKUP_TABLES, the snapshot and coach_erase_person()). Guarded textual patches, as stage94 and
-- stage127: each raises, and changes nothing, when the function is not the text it expects. Safe to re-run. The way back:
-- scripts/career/rollback_stage130.sql.

do $stage130_guard$
begin
  if to_regprocedure('public.career_measures(text,jsonb,text[])') is null or to_regprocedure('public.career_entry_kinds(text,jsonb)') is null
     or to_regprocedure('public.career_entry_keys(text,jsonb,jsonb)') is null or to_regprocedure('public.career_achievement_eval(text,text,jsonb,jsonb,jsonb)') is null
     or to_regprocedure('public.career_on_activity()') is null or to_regprocedure('public.get_achievements(text)') is null
     or to_regprocedure('public.career_sync(text,text[],jsonb,text,text[],date)') is null or to_regclass('public.activity_log') is null then
    raise exception 'stage130: Career Mode, Court Log (stage116) or the cabinet (stage99) is missing. Nothing was changed.';
  end if;
end $stage130_guard$;

-- ── 1. A Court Log row is a fact ────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.career_observe_activity(p_athlete text)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare v_rules jsonb := public.career_rules_now(); v_want jsonb;
begin
  if v_rules is null or p_athlete is null or v_rules #> '{fact,activity_done}' is null then return; end if;   -- a rulebook before version 15
  select coalesce(jsonb_agg(jsonb_build_object('kind', 'activity_done', 'ref', 'act|' || a.id::text, 'day', a.day,
                                               'value', jsonb_build_object('kind', a.kind, 'mins', a.minutes, 'effort', a.effort))), '[]'::jsonb)
    into v_want
    from public.activity_log a where a.athlete_id = p_athlete;
  perform public.career_sync(p_athlete, array['activity_done'], v_want, 'server', null, null);
end $function$;
revoke all on function public.career_observe_activity(text) from public, anon, authenticated;
grant execute on function public.career_observe_activity(text) to service_role;

do $stage130_trg$
declare d text; a text; n int;
begin
  d := pg_get_functiondef('public.career_on_activity()'::regprocedure);
  if position('career_observe_activity' in d) > 0 then return; end if;     -- already patched
  a := '    perform public.career_observe_proof(v_id);' || chr(10);
  n := (length(d) - length(replace(d, a, ''))) / length(a);
  if n <> 1 then raise exception 'stage130: career_on_activity() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
  d := replace(d, a, a || '    if tg_op = ''UPDATE'' and new.athlete_id is distinct from old.athlete_id then perform public.career_observe_activity(old.athlete_id); end if;' || chr(10)
                     || '    perform public.career_observe_activity(v_id);   /* stage130: the Court Log row as a fact */' || chr(10));
  execute d;
end $stage130_trg$;

-- ── 2. The new tests ───────────────────────────────────────────────────────────────────────────────────────────────────────────
-- The measure key an entry of one of the new tests reads (career_entry_keys()); null for any other test.
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
         end
$function$;

-- The fact kinds whose change wakes an entry of one of the new tests (career_entry_kinds()); null for any other test.
create or replace function public.career_more_kinds(p_body jsonb)
returns text[]
language sql
immutable
set search_path to 'public'
as $function$
  select case when public.career_achievement_test(p_body) in ('sum', 'kind_first', 'kinds_in_cycle', 'weeks_running', 'days_running')
                then array[coalesce(p_body ->> 'reads', '')]
              when public.career_achievement_test(p_body) in ('month_sum', 'month_days')
                then case when p_body ? 'habit' then array['habit_done'] else array[coalesce(p_body ->> 'reads', '')] end
         end
$function$;

-- One measure of the new keys, in career_measures()'s shape: { have, now, steps: [[day, value, kind, ref], ...] }, steps the new highs.
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

  elsif v_pre in ('msum', 'msumh', 'mdays') then
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
         and case when v_pre = 'msum' then f.kind = v_a
                  when v_a like '@%' then f.kind = substr(v_a, 2)
                  else f.kind = 'habit_done' and substr(f.ref, 12) = v_a and jsonb_typeof(f.value -> 'v') = 'number'
                       and (v_pre = 'msumh' or (f.value ->> 'v')::numeric >= v_t) end),
    acc as (select x.*, sum(x.val) over (partition by date_trunc('month', x.d) order by x.d, x.ref) as tot from x where x.val > 0),
    mx as (select acc.*, coalesce(max(acc.tot) over (order by acc.d, acc.ref rows between unbounded preceding and 1 preceding), 0) as prev from acc)
    select jsonb_build_object('have', coalesce((select max(acc.tot) from acc), 0),
             'now', coalesce((select max(acc.tot) from acc where date_trunc('month', acc.d) = date_trunc('month', current_date::timestamp)), 0),
             'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.tot, mx.kind, mx.ref) order by mx.d, mx.ref) from mx where mx.tot > mx.prev), '[]'::jsonb))
      into v_out;
  end if;
  return coalesce(v_out, c_empty);
end $function$;
revoke all on function public.career_measure_more(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.career_measure_more(text, jsonb, text) to service_role;

-- The four functions that dispatch on a test or a key learn the new ones (guarded textual patches).
do $stage130_patch$
declare d text; a text; b text; n int;
begin
  -- career_measures(): the new keys
  d := pg_get_functiondef('public.career_measures(text,jsonb,text[])'::regprocedure);
  if position('career_measure_more' in d) = 0 then
    a := '    end if;' || chr(10) || '    v_out := v_out || jsonb_build_object(v_k, coalesce(v_v, c_empty));';
    n := (length(d) - length(replace(d, a, ''))) / length(a);
    if n <> 1 then raise exception 'stage130: career_measures() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
    d := replace(d, a, '    elsif v_k ~ ''^(fsum|kind|kcyc|wrun|drun|msum|msumh|mdays):'' then' || chr(10)
                    || '      v_v := public.career_measure_more(p_athlete, p_ctx, v_k);   /* stage130 */' || chr(10) || a);
    execute d;
  end if;

  -- career_entry_kinds(): what wakes them
  d := pg_get_functiondef('public.career_entry_kinds(text,jsonb)'::regprocedure);
  if position('career_more_kinds' in d) = 0 then
    a := '      when ''best_run'', ''month_held'' then return array[''week_held'', ''week_broken''];';
    n := (length(d) - length(replace(d, a, ''))) / length(a);
    if n <> 1 then raise exception 'stage130: career_entry_kinds() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
    d := replace(d, a, a || chr(10) || '      when ''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'' then return public.career_more_kinds(p_body);   /* stage130 */');
    execute d;
  end if;

  -- career_entry_keys(): the measure they read
  d := pg_get_functiondef('public.career_entry_keys(text,jsonb,jsonb)'::regprocedure);
  if position('career_more_key' in d) = 0 then
    a := '  elsif v_t = ''best_run'' then';
    n := (length(d) - length(replace(d, a, ''))) / length(a);
    if n <> 1 then raise exception 'stage130: career_entry_keys() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
    d := replace(d, a, '  elsif v_t in (''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'') then   /* stage130 */' || chr(10)
                    || '    return array[public.career_more_key(p_body)];' || chr(10) || a);
    execute d;
  end if;

  -- career_achievement_eval(): read like total, the first step that reaches `at`
  d := pg_get_functiondef('public.career_achievement_eval(text,text,jsonb,jsonb,jsonb)'::regprocedure);
  if position('kinds_in_cycle' in d) = 0 then
    a := 'elsif v_test in (''proof'', ''best_value'', ''total'', ''best_run'') then';
    n := (length(d) - length(replace(d, a, ''))) / length(a);
    if n <> 1 then raise exception 'stage130: career_achievement_eval() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
    d := replace(d, a, 'elsif v_test in (''proof'', ''best_value'', ''total'', ''best_run'', ''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'') then   /* stage130 */');
    execute d;
  end if;

  -- get_achievements(): have / need for them
  d := pg_get_functiondef('public.get_achievements(text)'::regprocedure);
  if position('kinds_in_cycle' in d) = 0 then
    a := 'in (''total'', ''best_run'', ''proof'', ''goals'', ''best_value'') then';
    b := 'if v_test in (''total'', ''proof'', ''best_value'') then';
    n := (length(d) - length(replace(d, a, ''))) / length(a) * 10 + (length(d) - length(replace(d, b, ''))) / length(b);
    if n <> 11 then raise exception 'stage130: get_achievements() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
    d := replace(d, a, 'in (''total'', ''best_run'', ''proof'', ''goals'', ''best_value'', ''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'') then');
    d := replace(d, b, 'if v_test in (''total'', ''proof'', ''best_value'', ''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'') then   /* stage130 */');
    execute d;
  end if;
end $stage130_patch$;

-- ── 3. Over the Line on the Bell (#151) ────────────────────────────────────────────────────────────────────────────────────────
-- The week's move_week fact is a moment on the crew's Bell: a part { k: 'line', total, over, by } in the day's line, by the week switch the
-- athlete already has (crew kind 'week', the one held weeks use: a sharer's weeks), once a week by its nature (one fact a week). `by` is what
-- crossed it: the newest Court Log row of that week saved by the time the fact was written ({ kind, mins }), or a plan or Library session
-- ({ session: true }) when one of those was saved later. Recognition only (GAME-6). program.html draws it (crewMcFace(), 'line').
do $stage130_bell$
declare d text; a text; b text; n int;
begin
  d := pg_get_functiondef('public.get_bell(text)'::regprocedure);
  if position('''k'', ''line''' in d) > 0 then return; end if;     -- already patched
  a := '    union all' || chr(10) || '    select f.athlete_id, f.created_at, ''best'', jsonb_build_object(''k'', ''best'', ''lift'', f.value ->> ''lift'',';
  b := 'filter (where k.kind in (''joined'', ''mark'', ''achievement'', ''honour'', ''open'')) as rest,';
  n := (length(d) - length(replace(d, a, ''))) / length(a) * 10 + (length(d) - length(replace(d, b, ''))) / length(b);
  if n <> 11 then raise exception 'stage130: get_bell() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
  d := replace(d, a,
       '    union all' || chr(10)
    || '    select f.athlete_id, f.created_at, ''week'', jsonb_build_object(''k'', ''line'', ''total'', round(public.career_num(f.value -> ''total''))::int,   /* stage130: Over the Line */' || chr(10)
    || '             ''over'', greatest(0, round(public.career_num(f.value -> ''total'')) - coalesce(public.career_num(public.career_rules_now() #> ''{fact,move_week,line}''), 300))::int,' || chr(10)
    || '             ''by'', (select case when s.at is not null and (ac.at is null or s.at > ac.at) then jsonb_build_object(''session'', true)' || chr(10)
    || '                                when ac.at is not null then jsonb_build_object(''kind'', ac.kind, ''mins'', ac.minutes) end' || chr(10)
    || '                       from (select max(sf.created_at) as at from public.career_facts sf' || chr(10)
    || '                              where sf.athlete_id = f.athlete_id and sf.void_at is null and sf.kind in (''session_finished'', ''session_finished_early'', ''library_session'')' || chr(10)
    || '                                and sf.day between f.day and f.day + 6 and sf.created_at <= f.created_at + interval ''5 seconds'') s' || chr(10)
    || '                       left join lateral (select al.kind, al.minutes, al.created_at as at from public.activity_log al' || chr(10)
    || '                                           where al.athlete_id = f.athlete_id and al.day between f.day and f.day + 6 and al.created_at <= f.created_at + interval ''5 seconds''' || chr(10)
    || '                                           order by al.created_at desc limit 1) ac on true))' || chr(10)
    || '      from public.career_facts f' || chr(10)
    || '     where f.athlete_id in (select athlete_id from mem) and f.void_at is null and f.kind = ''move_week'' and f.created_at >= v_from' || chr(10)
    || a);
  d := replace(d, b, 'filter (where k.kind in (''joined'', ''mark'', ''achievement'', ''honour'', ''open'') or k.p ->> ''k'' = ''line'') as rest,   /* stage130 */');
  execute d;
end $stage130_bell$;
