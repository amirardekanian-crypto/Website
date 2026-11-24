-- rollback_stage131.sql — takes supabase/stage131_three_shapes_more.sql off, on Amir's word only.
--
-- The four functions whose test lists stage131 widened get stage130's lists back, and career_measures() stage130's key prefixes, so the four
-- new tests are decided by nothing (an entry naming one is simply never won). career_measure_more(), career_more_key() and career_more_kinds()
-- keep their extra branches: nothing reaches them once the lists are back. Awards minted under version 16 stay (GAME-1, D20). Re-seed a
-- rulebook version without version 16's rows first.
do $rb131$
declare d text; f text;
  old_list constant text := '''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days''';
  new_list constant text := '''sum'', ''kind_first'', ''kinds_in_cycle'', ''weeks_running'', ''days_running'', ''month_sum'', ''month_days'', ''month_count'', ''month_all'', ''weeks_checked_in'', ''cycles_running''';
begin
  foreach f in array array['public.career_entry_kinds(text,jsonb)', 'public.career_entry_keys(text,jsonb,jsonb)',
                           'public.career_achievement_eval(text,text,jsonb,jsonb,jsonb)', 'public.get_achievements(text)'] loop
    execute replace(pg_get_functiondef(f::regprocedure), new_list, old_list);
  end loop;
  execute replace(pg_get_functiondef('public.career_measures(text,jsonb,text[])'::regprocedure),
                  '''^(fsum|kind|kcyc|wrun|drun|msum|msumh|mdays|mcnt|mall|wchk|crun):''', '''^(fsum|kind|kcyc|wrun|drun|msum|msumh|mdays):''');
end $rb131$;
