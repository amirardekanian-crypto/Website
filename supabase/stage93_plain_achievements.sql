-- stage93: two measures that could be counted but not named (2026-10-20)
--
-- Amir: "in proof i had achievement like finish your drinking habit 5 days in a row / have 5 days of complete days / have 5
-- days of complete in a row / such achievements / you would understand what each means and what you need to do to get them".
-- The habit achievements that survived the cut are all `goals` ones — three month-long conditions at once — so rulebook
-- version 9 adds ten plain ones: one thing, one number, the number in the name.
--
-- Eight of them needed nothing new. Two did: career_measures() has always kept `daystreak` (days in a row that counted, from
-- the day_on_target facts) and `sum:<habit>` (a habit's running total), but career_proof_key() had no NAME for either, so no
-- catalogue entry could ask for them. A null measure fell through to 'daystreak' by accident, which no entry can express.
--
-- What changes: 'dayStreak' now maps to 'daystreak', and nothing else. ('total:<habit>' already mapped to 'sum:<habit>'; it
-- was only the catalogue checker that refused it, and that list is widened in scripts/check_career.py in the same commit.)
--
-- The way back: drop the 'dayStreak' line below.

create or replace function public.career_proof_key(p_measure text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case when p_measure is null then 'daystreak'
              when p_measure = 'dayStreak' then 'daystreak'   -- stage93: days in a row that counted, by name
              when p_measure like 'streak:%' then 'run:' || substr(p_measure, 8)
              when p_measure like 'daysHit:%' then 'hits:' || substr(p_measure, 9)
              when p_measure like 'total:%' then 'sum:' || substr(p_measure, 7)
              when p_measure = 'daysWith3' then 'with3'
              when p_measure in ('perfectDays', 'perfect') then 'perfect'
              when p_measure = 'qualify' then 'qualify'
              when p_measure = 'comebackRun' then 'cbrun'
              when p_measure = 'comebacksStuck' then 'stuck'
         end
$function$;
