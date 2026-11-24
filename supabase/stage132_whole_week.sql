-- stage132_whole_week.sql — #147 Whole Week: one plan week where three kinds of moving each add their share (2026-11-24)
--
-- Round 15 'Over the Line', step 6 (Amir: "Yes, start step 6"). Once: a plan week in which the plan, Court Log (court and other kinds) and
-- walking or the Library each add `each` Move minutes or more (achievements.toml: 30). It says out loud what the Week Line already counts: the life
-- outside the plan counts with it. The parts are move_week()'s own (stage127), the numbers the athlete sees on Your weeks; nothing is worked out
-- twice. Forward only: only plan weeks that start on or after move_full_from() - 6 are looked at (the Week Line's own start), and the entry carries
-- paid_from (D21).
--
--   week_parts   key wpart:<each>   plan weeks (career_weeks()) where plan >= each, court + other >= each and walk + lib >= each, counted
--
-- No new table. Guarded textual patches of stage130 / stage131's functions (each raises and changes nothing when the text is not what it expects).
-- Safe to re-run. The way back: scripts/career/rollback_stage132.sql.

do $stage132$
declare d text; a text; n int; f text;
  old_list constant text := '''month_count'', ''month_all'', ''weeks_checked_in'', ''cycles_running''';
  new_list constant text := '''month_count'', ''month_all'', ''weeks_checked_in'', ''cycles_running'', ''week_parts''';
begin
  if to_regprocedure('public.move_week(text,date,date)') is null or to_regprocedure('public.career_measure_more(text,jsonb,text)') is null then
    raise exception 'stage132: stage127 or stage130 is missing. Nothing was changed.';
  end if;

  -- the measure
  d := pg_get_functiondef('public.career_measure_more(text,jsonb,text)'::regprocedure);
  if position('wpart' in d) = 0 then
    a := '  end if;' || chr(10) || '  return coalesce(v_out, c_empty);';
    n := (length(d) - length(replace(d, a, ''))) / length(a);
    if n <> 1 then raise exception 'stage132: career_measure_more() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
    execute replace(d, a,
         '  elsif v_pre = ''wpart'' then        -- stage132: plan weeks where plan, Court Log and walking or the Library each add v_a Move minutes' || chr(10)
      || '    v_t := coalesce(nullif(v_a, '''')::numeric, 30);' || chr(10)
      || '    with cw as (select distinct w.wfrom, w.wto from public.career_weeks(p_athlete) w' || chr(10)
      || '                 where w.wfrom is not null and w.wto is not null and w.wfrom >= public.move_full_from() - 6 and w.wfrom <= current_date),' || chr(10)
      || '    x as (select cw.wfrom, cw.wto, public.move_week(p_athlete, cw.wfrom, cw.wto) as j from cw),' || chr(10)
      || '    ok as (select x.wfrom, x.wto from x' || chr(10)
      || '            where coalesce(public.career_num(x.j -> ''plan''), 0) >= v_t' || chr(10)
      || '              and coalesce(public.career_num(x.j -> ''court''), 0) + coalesce(public.career_num(x.j -> ''other''), 0) >= v_t' || chr(10)
      || '              and coalesce(public.career_num(x.j -> ''walk''), 0) + coalesce(public.career_num(x.j -> ''lib''), 0) >= v_t),' || chr(10)
      || '    n as (select least(ok.wto, current_date) as d, (row_number() over (order by ok.wfrom))::int as n from ok)' || chr(10)
      || '    select jsonb_build_object(''have'', (select count(*) from n), ''now'', null,' || chr(10)
      || '             ''steps'', coalesce((select jsonb_agg(jsonb_build_array(n.d, n.n, ''move_week'', null) order by n.n) from n), ''[]''::jsonb))' || chr(10)
      || '      into v_out;' || chr(10) || a);
  end if;

  -- the key and what wakes it
  d := pg_get_functiondef('public.career_more_key(jsonb)'::regprocedure);
  if position('week_parts' in d) = 0 then
    a := '           when ''cycles_running'' then ''crun:'' || coalesce(p_body ->> ''reads'', '''')';
    n := (length(d) - length(replace(d, a, ''))) / length(a);
    if n <> 1 then raise exception 'stage132: career_more_key() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
    execute replace(d, a, a || chr(10) || '           when ''week_parts'' then ''wpart:'' || coalesce(p_body ->> ''each'', ''30'')   /* stage132 */');
  end if;
  d := pg_get_functiondef('public.career_more_kinds(jsonb)'::regprocedure);
  if position('week_parts' in d) = 0 then
    a := '                then array[''checkin_done'', ''session_finished'', ''session_finished_early'']';
    n := (length(d) - length(replace(d, a, ''))) / length(a);
    if n <> 1 then raise exception 'stage132: career_more_kinds() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
    execute replace(d, a, a || chr(10) || '              when public.career_achievement_test(p_body) = ''week_parts''   /* stage132: anything move_week() adds up */' || chr(10)
                         || '                then array[''session_finished'', ''session_finished_early'', ''library_session'', ''activity_done'', ''habit_done'']');
  end if;

  -- the lists
  foreach f in array array['public.career_entry_kinds(text,jsonb)', 'public.career_entry_keys(text,jsonb,jsonb)',
                           'public.career_achievement_eval(text,text,jsonb,jsonb,jsonb)', 'public.get_achievements(text)'] loop
    d := pg_get_functiondef(f::regprocedure);
    if position('week_parts' in d) > 0 then continue; end if;
    n := (length(d) - length(replace(d, old_list, ''))) / length(old_list);
    if (f = 'public.get_achievements(text)' and n <> 2) or (f <> 'public.get_achievements(text)' and n <> 1) then
      raise exception 'stage132: % is not the function this stage expects (% lists). Nothing was changed.', f, n;
    end if;
    execute replace(d, old_list, new_list);
  end loop;
  d := pg_get_functiondef('public.career_measures(text,jsonb,text[])'::regprocedure);
  if position('wpart' in d) = 0 then
    a := '''^(fsum|kind|kcyc|wrun|drun|msum|msumh|mdays|mcnt|mall|wchk|crun):''';
    n := (length(d) - length(replace(d, a, ''))) / length(a);
    if n <> 1 then raise exception 'stage132: career_measures() is not the function this stage expects (% anchors). Nothing was changed.', n; end if;
    execute replace(d, a, '''^(fsum|kind|kcyc|wrun|drun|msum|msumh|mdays|mcnt|mall|wchk|crun|wpart):''');
  end if;
end $stage132$;
