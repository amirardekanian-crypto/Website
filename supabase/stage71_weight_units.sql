-- stage71 — a logged weight carries its unit (2026-10-18; Amir: "let the client pick what to input: kg, lb, or plates, for a machine with
-- no weight"; program.html → "THE UNIT A WEIGHT IS IN", PROGRAM-APP.md → *The unit button*). Safe to re-run. One function changes.
--
-- The athlete's app now writes the unit INTO the weight's text: a bare number is kilograms (every weight logged before today), "45 lb" is
-- pounds and "6 plates" is the count on a machine's stack. Career Mode reads the structured session log, and career_kg() is its copy of
-- program.html's parseLoggedKg(): the weight in kilograms, or null for no weight. Left as it was, it would read "45 lb" as 45 kg and
-- "6 plates" as 6 kg, so a lift switched from kg to lb would look like a huge jump (a false effort win, a false record) and a plates lift
-- would be priced as a load. Now it is the same twin, again:
--   · pounds are converted, to two places: 45 lb = 20.41 kg (parseLoggedKg(): Math.round(n * 0.45359237 * 100) / 100);
--   · plates are no weight at all (null): a position on a stack is never a load, so the set counts like a bodyweight one (reps and RPE);
--   · a number with no unit, or with "kg", reads exactly as it did.
-- Nothing else changes: no table, no trigger, no stored fact. Every weight on the live project today has no unit word, so no fact moves
-- when this is applied (scripts/career/rehearse_units.mjs proves it, and that the twin agrees with the JavaScript on every case).
-- The way back is scripts/career/rollback_stage71.sql (the stage66 definition), on Amir's word only.

-- program.html's weightOf() / parseLoggedKg(): the first number of a free-text weight ("62,5", "60kg", "۲۵"), "2×20" read as one implement's
-- 20, in kilograms: pounds converted to two places, plates nothing.
create or replace function public.career_kg(p jsonb) returns numeric
language plpgsql immutable set search_path to 'public' as $function$
declare t text; m text[]; n numeric;
begin
  if p is null or jsonb_typeof(p) not in ('string', 'number') then return null; end if;
  if not public.career_truthy(p) then return null; end if;        -- String(v || ''): 0 and '' read as nothing
  t := regexp_replace(public.career_digits(p #>> '{}'), ',', '.');  -- the first comma only, as String.replace does
  m := regexp_match(t, '^\s*([1-4])\s*[×xX*]\s*([0-9]+(?:\.[0-9]+)?)');
  if m is not null then
    n := m[2]::numeric;
  else
    m := regexp_match(t, '[0-9]+(?:\.[0-9]+)?');
    if m is null then return null; end if;
    n := m[1]::numeric;
  end if;
  if not (n > 0) then return null; end if;
  -- the unit, as weightOf() reads it: pounds first, then plates, else kilograms
  if t ~* '[0-9]\s*(lbs?|pounds?)([^a-z]|$)' then return round(n * 0.45359237, 2); end if;
  if t ~* '[0-9]\s*plates?([^a-z]|$)' then return null; end if;
  return n;
end $function$;
