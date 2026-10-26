-- rollback_stage105.sql — puts crew_page() and career_rewards_profile() back as they were before stage105.
-- After this a Player Page lists achievements only (no mark steps) and the comebacks number counts every comeback again.
-- Each line is found exactly once or this refuses and changes nothing. Safe to re-run.

do $rollback105_patch$
declare p record; d text; n int;
begin
  for p in
    select * from (values
      ('public.crew_page(uuid,text)',
       $a$where a.athlete_id = v_subj and a.kind = 'achievement'$a$,
       $a$where a.athlete_id = v_subj and (a.kind = 'achievement' or (a.kind = 'badge' and a.item in ('held_weeks', 'century', 'bests', 'comebacks')))   /* stage105: a mark's step is a trophy too */$a$),
      ('public.crew_page(uuid,text)',
       $a$order by a.day desc, a.award_id limit 40) x;$a$,
       $a$order by a.day desc, a.award_id limit 60) x;$a$),
      ('public.crew_page(uuid,text)',
       $a$ct.kind = 'achievement' and ct.id = a.item$a$,
       $a$ct.kind = a.kind and ct.id = a.item$a$),
      ('public.career_rewards_profile(text,jsonb)',
       $a$count(*) filter (where cf.kind in ('comeback', 'training_return'))$a$,
       $a$count(*) filter (where cf.kind in ('comeback_stuck', 'training_return'))   /* stage105: what HARD TO KILL counts */$a$)
    ) as t(fn, old_text, new_text)
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position(p.new_text in d) = 0 then continue; end if;                   -- not patched (a re-run)
    n := (length(d) - length(replace(d, p.new_text, ''))) / length(p.new_text);
    if n <> 1 then
      raise exception 'rollback_stage105: % is not what this rollback expects (this line was found % times, not once): %. Nothing was changed.', p.fn, n, left(p.new_text, 80);
    end if;
    execute replace(d, p.new_text, p.old_text);
  end loop;
end
$rollback105_patch$;

do $rollback105_check$
begin
  if position('stage105' in pg_get_functiondef('public.crew_page(uuid,text)'::regprocedure)) > 0
     or position('stage105' in pg_get_functiondef('public.career_rewards_profile(text,jsonb)'::regprocedure)) > 0 then
    raise exception 'rollback_stage105: a patched function still has the stage105 text';
  end if;
  raise notice 'rollback_stage105: done';
end
$rollback105_check$;
