-- Takes stage71 (a weight carries its unit) off the database: career_kg() back to its stage66 definition, which reads the first number of
-- a weight and never looks at a unit word. Run it only on Amir's word. Nothing is stored by stage71, so nothing else needs undoing; but
-- once an athlete has logged in pounds or plates, this reads "45 lb" as 45 kg and "6 plates" as 6 kg again.

create or replace function public.career_kg(p jsonb) returns numeric
language plpgsql immutable set search_path to 'public' as $function$
declare t text; m text[]; k numeric;
begin
  if p is null or jsonb_typeof(p) not in ('string', 'number') then return null; end if;
  if not public.career_truthy(p) then return null; end if;        -- String(v || ''): 0 and '' read as nothing
  t := regexp_replace(public.career_digits(p #>> '{}'), ',', '.');  -- the first comma only, as String.replace does
  m := regexp_match(t, '^\s*([1-4])\s*[×xX*]\s*([0-9]+(?:\.[0-9]+)?)');
  if m is not null then
    k := m[2]::numeric;
    return case when k > 0 then k end;
  end if;
  m := regexp_match(t, '[0-9]+(?:\.[0-9]+)?');
  if m is null then return null; end if;
  k := m[1]::numeric;
  return case when k > 0 then k end;
end $function$;
