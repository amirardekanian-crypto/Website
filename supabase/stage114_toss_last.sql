-- stage114_toss_last.sql — the Toss carries last week's answer, so the crew sees how it came out (2026-11-20)
--
-- Amir: "build 116, 117 and 119" (round 10, https://claude.ai/artifact/5gPzro3bCbP93CN4vysaGr). 116 Vote to See: the Toss hides its counts until you
-- vote, and last week's question shows its result ("Last week: Music when you lift? 4 of 6 said On"). The counts were already sent; what was missing
-- is last week, which crew_weekly() never read.
--
-- What this does: crew_weekly() also returns `last` = { q, a, b, na, nb, mine } for the week before this one when that week had a question:
-- the two sides, how many crew members chose each, and the viewer's own side. Crew members only, as this week's counts. Null otherwise.
-- Nothing else changes: no table, no column, no grant, no backup or erase list. One guarded textual patch; safe to re-run.

do $stage114_patch$
declare d text; o text; n_ text; n int;
begin
  d := pg_get_functiondef('public.crew_weekly(text)'::regprocedure);
  o := $a$                            'votes', v);$a$;
  n_ := $a$                            'votes', v,
                            'last', (select jsonb_build_object('q', lw.toss_q, 'a', lw.toss_a, 'b', lw.toss_b,   -- stage114: last week's answer
                                       'na', (select count(*) from public.crew_toss_votes t join public.crew_members() m on m.athlete_id = t.athlete_id
                                               where t.week_start = lw.week_start and t.side = 'a'),
                                       'nb', (select count(*) from public.crew_toss_votes t join public.crew_members() m on m.athlete_id = t.athlete_id
                                               where t.week_start = lw.week_start and t.side = 'b'),
                                       'mine', (select t.side from public.crew_toss_votes t where t.week_start = lw.week_start and t.athlete_id = p_viewer))
                                       from public.crew_weeks lw where lw.week_start = w.week_start - 7 and lw.toss_q is not null));$a$;
  if position('stage114: last week' in d) > 0 then return; end if;
  n := (length(d) - length(replace(d, o, ''))) / length(o);
  if n <> 1 then raise exception 'stage114: crew_weekly() is not what this patch expects (found % times). Nothing was changed.', n; end if;
  execute replace(d, o, n_);
end
$stage114_patch$;

do $stage114_check$
begin
  if position('stage114: last week' in pg_get_functiondef('public.crew_weekly(text)'::regprocedure)) = 0 then raise exception 'stage114: crew_weekly() is not the new text'; end if;
  raise notice 'stage114: applied';
end
$stage114_check$;
