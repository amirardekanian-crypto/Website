-- rollback_stage106.sql — puts career_derive() and career_measures() back as they were before stage106 (supabase/stage106_spare_session.sql).
-- After this a week is held only when every plan day has a session IN that week (no spare), a week held_on is null when no session is in it, and a
-- `count:` reward over session_finished / session_finished_early counts only the sessions career_facts_paid() pays again (D19, stage73).
-- It does NOT undo rulebook version 12 (limit 2 on the two session kinds): that is a new rulebook version, forward only (D20).
-- Written 2026-11-03, when the stage was brought to the repo; never run. On Amir's word only.
-- Each line is found exactly once or this refuses and changes nothing. Safe to re-run.

do $rollback106_patch$
declare p record; d text; n int; v text;
begin
  for p in
    select * from (values
      ('public.career_derive(text)',
       $a$(select bool_and(exists (select 1 from s where s.d between wk.wfrom and wk.wto and s.pday = pd)) from unnest(wk.plan) pd) as held,$a$,
       $a$(select bool_and(exists (select 1 from s where s.d between wk.wfrom and wk.wto and s.pday = pd)
                            or (wk.wfrom >= date '2026-10-18'   /* stage106: the spare, from Season 1 */
                                and (select count(*) from s join wk pw on pw.cycle_index = wk.cycle_index and pw.week = wk.week - 1
                                      where s.d between pw.wfrom and pw.wto and s.pday = pd) >= 2)) from unnest(wk.plan) pd) as held,$a$,
       null::text, null::text),
      ('public.career_derive(text)',
       $a$(select max(z.fd) from (select min(s.d) as fd from s where s.d between wk.wfrom and wk.wto and s.pday = any (wk.plan)$a$,
       $a$coalesce((select max(z.fd) from (select min(s.d) as fd from s where s.d between wk.wfrom and wk.wto and s.pday = any (wk.plan)$a$,
       $a$group by s.pday) z) as held_on,$a$,
       $a$group by s.pday) z), wk.wfrom) as held_on,   /* stage106 */$a$),
      ('public.career_measures(text,jsonb,text[])',
       $a$where public.career_rules_now() -> 'fact' -> k ->> 'limit_per' is not null)$a$,
       $a$where public.career_rules_now() -> 'fact' -> k ->> 'limit_per' is not null
                                     and k not in ('session_finished', 'session_finished_early'))   /* stage106: every session counts */$a$,
       null::text, null::text)
    ) as t(fn, old1, new1, old2, new2)
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position(p.new1 in d) = 0 then continue; end if;                       -- not patched (a re-run)
    n := (length(d) - length(replace(d, p.new1, ''))) / length(p.new1);
    if n <> 1 then
      raise exception 'rollback106: % is not what this expects (this text was found % times, not once): %. Nothing was changed.', p.fn, n, left(p.new1, 80);
    end if;
    v := replace(d, p.new1, p.old1);
    if p.new2 is not null then
      n := (length(d) - length(replace(d, p.new2, ''))) / length(p.new2);
      if n <> 1 then
        raise exception 'rollback106: % is not what this expects (this text was found % times, not once): %. Nothing was changed.', p.fn, n, left(p.new2, 80);
      end if;
      v := replace(v, p.new2, p.old2);
    end if;
    execute v;
  end loop;
end
$rollback106_patch$;

do $rollback106_check$
begin
  if position('stage106' in pg_get_functiondef('public.career_derive(text)'::regprocedure)) > 0
     or position('stage106' in pg_get_functiondef('public.career_measures(text,jsonb,text[])'::regprocedure)) > 0 then
    raise exception 'rollback106: a function still carries the stage106 text';
  end if;
  raise notice 'rollback106: done';
end
$rollback106_check$;
