-- stage112_best_gain.sql — a new best on the Bell carries its gain as a percent, never the weight (2026-11-20)
--
-- Amir, the moment cards (https://claude.ai/artifact/7bydrN3KFDsDhEtZuyGv4w), "go with your picks": the record card shows the lift and how much
-- it went up, "+11%", where his picture showed "125 kg +5". The Bell's rule since stage81 is that a best names the lift and never a weight, so
-- nobody compares loads across very different bodies; a percent of the athlete's own previous best keeps that rule and still has the punch.
--
-- What this does, in get_bell() only:
--   1. each personal_best fact read for the Bell also works out `pct`: this best's kg against the same athlete's previous best on the same lift,
--      rounded to a whole percent (null for a first best). The kg itself is read here and never sent.
--   2. the day's line gathers them as `gains`: { "<lift>": <pct> } for the lifts with a gain above 0.
--   3. the line's `best` part carries `gains` beside `lifts` and `more` when there is one. A phone that has not updated ignores it.
-- Nothing else changes: no table, no column, no grant, no backup or erase list. Guarded textual patches, like stages 101/104/111: each line is
-- found exactly once or the stage refuses and changes nothing. Safe to re-run. The way back: run the patches in reverse.

do $stage112_guard$
begin
  if to_regprocedure('public.get_bell(text)') is null or to_regclass('public.career_facts') is null then
    raise exception 'stage112: get_bell() or career_facts is missing. Nothing was changed.';
  end if;
end
$stage112_guard$;

do $stage112_patch$
declare p record; d text; n int;
begin
  for p in select * from (values
    ($a$select f.athlete_id, f.created_at, 'best', jsonb_build_object('k', 'best', 'lift', f.value ->> 'lift')$a$,
     $a$select f.athlete_id, f.created_at, 'best', jsonb_build_object('k', 'best', 'lift', f.value ->> 'lift',
             'pct', (select round(((f.value ->> 'kg')::numeric / nullif((pb.value ->> 'kg')::numeric, 0) - 1) * 100)::int   /* stage112: the gain, never the kg */
                       from public.career_facts pb
                      where pb.athlete_id = f.athlete_id and pb.kind = 'personal_best' and pb.void_at is null
                        and pb.value ->> 'lift' = f.value ->> 'lift' and pb.created_at < f.created_at
                      order by pb.created_at desc limit 1))$a$),
    ($a$array_agg(distinct k.p ->> 'lift') filter (where k.kind = 'best') as lifts,$a$,
     $a$array_agg(distinct k.p ->> 'lift') filter (where k.kind = 'best') as lifts,
           jsonb_object_agg(k.p ->> 'lift', (k.p ->> 'pct')::int) filter (where k.kind = 'best' and (k.p ->> 'pct')::int > 0) as gains,   -- stage112$a$),
    ($a$'more', greatest(0, cardinality(l.lifts) - 3))) else '[]'::jsonb end$a$,
     $a$'more', greatest(0, cardinality(l.lifts) - 3))
                                                                          || case when l.gains is null then '{}'::jsonb else jsonb_build_object('gains', l.gains) end) else '[]'::jsonb end$a$)
  ) as t(old_text, new_text)
  loop
    d := pg_get_functiondef('public.get_bell(text)'::regprocedure);
    if position(p.new_text in d) > 0 then continue; end if;                   -- patched already (a re-run)
    n := (length(d) - length(replace(d, p.old_text, ''))) / length(p.old_text);
    if n <> 1 then
      raise exception 'stage112: get_bell() is not what this patch expects (this line was found % times, not once): %. Nothing was changed.', n, left(p.old_text, 80);
    end if;
    execute replace(d, p.old_text, p.new_text);
  end loop;
end
$stage112_patch$;

do $stage112_check$
begin
  if position('stage112: the gain, never the kg' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0 then
    raise exception 'stage112: get_bell() is not the new text';
  end if;
  raise notice 'stage112: applied';
end
$stage112_check$;
