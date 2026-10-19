-- rollback_stage85.sql — takes supabase/stage85_crew_open.sql off. On Amir's word only.
--
-- In order: get_bell() stops answering the Open, the five coach functions and the read go, coach_erase_person() forgets the results table, and the
-- two tables are dropped LAST. The Bell lines a result rang are deleted with them (crew_rings kind 'open'); every other line is untouched. Nothing
-- in the scorer ever knew about any of this, so no XP, level or season point can move.
-- ⚠️ Dropping the tables throws away every result Amir confirmed. To keep them, run everything except the last block.

do $rollback85_patch$
declare d text;
begin
  if to_regprocedure('public.get_bell(text)') is not null then
    d := pg_get_functiondef('public.get_bell(text)'::regprocedure);
    if position('crew_open_now' in d) > 0 then
      execute replace(d, ', ''open'', public.crew_open_now(v_id), ''at'', now());', ', ''at'', now());');
    end if;
  end if;
  if to_regprocedure('public.coach_erase_person(text,text,text,uuid[],boolean)') is not null then
    d := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
    if position('crew_open_results' in d) > 0 then
      execute replace(d, '''crew_open_results'', ''crew_rings''', '''crew_rings''');
    end if;
  end if;
end
$rollback85_patch$;

drop function if exists public.coach_open_remove(text);
drop function if exists public.coach_open_result(text, numeric, date);
drop function if exists public.coach_open_close();
drop function if exists public.coach_open_set(text, text, text, text, uuid);
drop function if exists public.coach_open();
drop function if exists public.crew_open_now(text);

delete from public.crew_rings where kind = 'open';

-- last, and the one thing that loses data:
drop table if exists public.crew_open_results;
drop table if exists public.crew_open;
