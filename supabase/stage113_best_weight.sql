-- stage113_best_weight.sql — a new best on the Bell shows its weight and how much it went up, like Amir's picture (2026-11-20)
--
-- Amir, on the moment cards, after stage112 sent the gain as a percent: "it doesnt have to be in percentage, why are you going the hard way", then, asked
-- whether the card shows the weight or the lift alone: "The weight, like my picture" (his picture: "125 kg +5"). This ENDS the Bell's rule since stage81
-- that a best names the lift and never a weight: the crew now sees a best's weight. The join text in program.html says so too.
--
-- What this does, in get_bell() only, over stage112's text:
--   1. each personal_best fact read for the Bell carries `kg` (this best) and `up` (kg above the same athlete's previous best on that lift; null for a first).
--   2. the day's line gathers them as `bests`: { "<lift>": { "kg": 125, "up": 5 } }, in place of stage112's `gains`.
--   3. the line's `best` part carries `bests` beside `lifts` and `more`. A phone that has not updated draws the lift as before.
-- Nothing else changes: no table, no column, no grant, no backup or erase list. Guarded textual patches: each line is found exactly once or the stage
-- refuses and changes nothing. Safe to re-run. Needs stage112.

do $stage113_guard$
begin
  if position('stage112: the gain, never the kg' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0
     and position('stage113: the weight and its gain' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0 then
    raise exception 'stage113: get_bell() is not the stage112 text (apply stage112 first). Nothing was changed.';
  end if;
end
$stage113_guard$;

do $stage113_patch$
declare p record; d text; n int;
begin
  for p in select * from (values
    ($a$'pct', (select round(((f.value ->> 'kg')::numeric / nullif((pb.value ->> 'kg')::numeric, 0) - 1) * 100)::int   /* stage112: the gain, never the kg */$a$,
     $a$'kg', (f.value ->> 'kg')::numeric,
             'up', (select (f.value ->> 'kg')::numeric - (pb.value ->> 'kg')::numeric   /* stage113: the weight and its gain (Amir: "The weight, like my picture") */$a$),
    ($a$jsonb_object_agg(k.p ->> 'lift', (k.p ->> 'pct')::int) filter (where k.kind = 'best' and (k.p ->> 'pct')::int > 0) as gains,   -- stage112$a$,
     $a$jsonb_object_agg(k.p ->> 'lift', jsonb_build_object('kg', (k.p ->> 'kg')::numeric, 'up', (k.p ->> 'up')::numeric))
             filter (where k.kind = 'best' and (k.p ->> 'kg') is not null) as bests,   -- stage113$a$),
    ($a$|| case when l.gains is null then '{}'::jsonb else jsonb_build_object('gains', l.gains) end)$a$,
     $a$|| case when l.bests is null then '{}'::jsonb else jsonb_build_object('bests', l.bests) end)$a$)
  ) as t(old_text, new_text)
  loop
    d := pg_get_functiondef('public.get_bell(text)'::regprocedure);
    if position(p.new_text in d) > 0 then continue; end if;                   -- patched already (a re-run)
    n := (length(d) - length(replace(d, p.old_text, ''))) / length(p.old_text);
    if n <> 1 then
      raise exception 'stage113: get_bell() is not what this patch expects (this line was found % times, not once): %. Nothing was changed.', n, left(p.old_text, 80);
    end if;
    execute replace(d, p.old_text, p.new_text);
  end loop;
end
$stage113_patch$;

do $stage113_check$
begin
  if position('stage113: the weight and its gain' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0
     or position('''gains''' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) > 0 then
    raise exception 'stage113: get_bell() is not the new text';
  end if;
  raise notice 'stage113: applied';
end
$stage113_check$;
