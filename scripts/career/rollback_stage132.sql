-- rollback_stage132.sql — takes supabase/stage132_whole_week.sql off, on Amir's word only.
-- The test lists lose 'week_parts' and career_measures() the wpart prefix, so Whole Week is decided by nothing (an award already minted stays,
-- GAME-1). career_measure_more(), career_more_key() and career_more_kinds() keep their wpart branch: nothing reaches it once the lists are back.
-- Re-seed a rulebook version without version 17's row first.
do $rb132$
declare f text;
begin
  foreach f in array array['public.career_entry_kinds(text,jsonb)', 'public.career_entry_keys(text,jsonb,jsonb)',
                           'public.career_achievement_eval(text,text,jsonb,jsonb,jsonb)', 'public.get_achievements(text)'] loop
    execute replace(pg_get_functiondef(f::regprocedure), ', ''cycles_running'', ''week_parts''', ', ''cycles_running''');
  end loop;
  execute replace(pg_get_functiondef('public.career_measures(text,jsonb,text[])'::regprocedure), '|crun|wpart):', '|crun):');
end $rb132$;
