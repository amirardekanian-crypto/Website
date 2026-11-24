-- rollback_stage130.sql — takes supabase/stage130_over_the_line.sql off, on Amir's word only.
--
-- Each patched function gets back its text from before the stage (the inserted pieces taken out, the widened lists put back), then the
-- functions the stage added are dropped. The activity_done facts stay in career_facts (a rulebook without [fact.activity_done] prices them at
-- nothing and nothing reads them) and awards minted under version 15 stay (GAME-1, D20). Re-seed a rulebook version without version 15's
-- catalogue rows first, or their entries name tests the server no longer knows (they would simply never be decided).

do $rb130$
declare d text;
begin
  d := pg_get_functiondef('public.career_on_activity()'::regprocedure);
  d := replace(d, '    if tg_op = ''UPDATE'' and new.athlete_id is distinct from old.athlete_id then perform public.career_observe_activity(old.athlete_id); end if;' || chr(10), '');
  d := replace(d, '    perform public.career_observe_activity(v_id);   /* stage130: the Court Log row as a fact */' || chr(10), '');
  execute d;

  d := pg_get_functiondef('public.career_measures(text,jsonb,text[])'::regprocedure);
  d := replace(d, '    elsif v_k ~ ''^(fsum|kind|kcyc|wrun|drun|msum|msumh|mdays):'' then' || chr(10)
               || '      v_v := public.career_measure_more(p_athlete, p_ctx, v_k);   /* stage130 */' || chr(10), '');
  execute d;

  d := pg_get_functiondef('public.career_entry_kinds(text,jsonb)'::regprocedure);
  d := replace(d, chr(10) || '      when ''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'' then return public.career_more_kinds(p_body);   /* stage130 */', '');
  execute d;

  d := pg_get_functiondef('public.career_entry_keys(text,jsonb,jsonb)'::regprocedure);
  d := replace(d, '  elsif v_t in (''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'') then   /* stage130 */' || chr(10)
               || '    return array[public.career_more_key(p_body)];' || chr(10), '');
  execute d;

  d := pg_get_functiondef('public.career_achievement_eval(text,text,jsonb,jsonb,jsonb)'::regprocedure);
  d := replace(d, 'elsif v_test in (''proof'', ''best_value'', ''total'', ''best_run'', ''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'') then   /* stage130 */',
                  'elsif v_test in (''proof'', ''best_value'', ''total'', ''best_run'') then');
  execute d;

  d := pg_get_functiondef('public.get_achievements(text)'::regprocedure);
  d := replace(d, 'in (''total'', ''best_run'', ''proof'', ''goals'', ''best_value'', ''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'') then',
                  'in (''total'', ''best_run'', ''proof'', ''goals'', ''best_value'') then');
  d := replace(d, 'if v_test in (''total'', ''proof'', ''best_value'', ''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'') then   /* stage130 */',
                  'if v_test in (''total'', ''proof'', ''best_value'') then');
  execute d;

  -- the Bell: the line part out, the rest filter back
  d := pg_get_functiondef('public.get_bell(text)'::regprocedure);
  d := regexp_replace(d, '    union all\n    select f\.athlete_id, f\.created_at, ''week'', jsonb_build_object\(''k'', ''line''.*?f\.kind = ''move_week'' and f\.created_at >= v_from\n', '', 's');
  d := replace(d, 'filter (where k.kind in (''joined'', ''mark'', ''achievement'', ''honour'', ''open'') or k.p ->> ''k'' = ''line'') as rest,   /* stage130 */',
                  'filter (where k.kind in (''joined'', ''mark'', ''achievement'', ''honour'', ''open'')) as rest,');
  execute d;
end $rb130$;

drop function if exists public.career_measure_more(text, jsonb, text);
drop function if exists public.career_more_kinds(jsonb);
drop function if exists public.career_more_key(jsonb);
drop function if exists public.career_observe_activity(text);
