-- stage117_five_weeks_fa.sql — Your weeks in Farsi: a plan day's Farsi title beside its English one (2026-11-21)
--
-- Amir: "does everything works in farsi version?". On a Farsi phone a day's sheet on Your weeks (#122) showed the plan day's English
-- title ("Legs"), while every programme carries its Farsi twin since 2026-11-20 (COM-1: `title_fa` beside `title`). get_five_weeks()
-- (stage115, stage116) now also returns `title_fa` for a plan session whose programme day has one; the phone shows it on a Farsi phone.
-- Library and logged activities are unchanged (a Library title stays English by rule; an activity's name is the app's own word).
--
-- One guarded textual patch of get_five_weeks(): no table, no column, no grant, no backup or erase list. Safe to re-run.

do $stage117_patch$
declare
  d text := pg_get_functiondef('public.get_five_weeks(text)'::regprocedure);
  o constant text := $a$             'mins', fw.mins, 'shelf', ls.category_id,$a$;
  n_ constant text := $a$             'mins', fw.mins, 'shelf', ls.category_id,
             'title_fa', case when fw.kind <> 'library_session' then (   -- stage117: the plan day's Farsi twin (COM-1)
                (select nullif(btrim(e ->> 'title_fa'), '')
                   from pdays pd, jsonb_array_elements(case when jsonb_typeof(pd.days) = 'array' then pd.days else '[]'::jsonb end) e
                  where e ->> 'id' = fw.pday limit 1)) end,$a$;
  n integer;
begin
  if position('stage117' in d) > 0 then return; end if;
  n := (length(d) - length(replace(d, o, ''))) / length(o);
  if n <> 1 then raise exception 'stage117: get_five_weeks() is not what this patch expects (found % times). Nothing was changed.', n; end if;
  execute replace(d, o, n_);
end
$stage117_patch$;

do $stage117_check$
begin
  if position('stage117' in pg_get_functiondef('public.get_five_weeks(text)'::regprocedure)) = 0 then raise exception 'stage117: get_five_weeks() is not the new text'; end if;
  raise notice 'stage117: applied';
end
$stage117_check$;
