-- stage90: the day itself pays (2026-10-20)
--
-- Amir asked for it in plain words: "do i have the system to get more xp for a complete day of habits?" — no, it did not.
-- Each habit paid 20% more for hitting its target (the completion bonus), and the day as a whole paid nothing at all.
-- The rulebook now prices it ([fact.day_on_target] and [fact.perfect_day], rulebook version 8: a day that counts 40, a
-- perfect one 60 in all), but the prices alone did nothing, because career_facts_paid() REFUSED to look at those two kinds:
-- stage78 put them on an exclusion list beside the facts the habits engine already pays for itself (habit_done, habit_day,
-- workout_tick, comeback), under the note "it pays through badges, not by itself". That was true while they were worth
-- nothing. It is not true now.
--
-- What changes: day_on_target and perfect_day leave the exclusion list, and nothing else. They are NOT paid twice — the habit
-- engine (hab_xp, hab_bonus_xp) pays per habit, per tier, per milestone, per quest and per comeback, and has never paid for
-- the day as a whole. career_compare() compares the habit side only, so it is untouched.
--
-- D20 comes free: every fact is priced by the rulebook in force ON ITS OWN DAY (the lateral join on starts_on), so the 388
-- days counted before 2026-10-20 keep the 0 they were worth, and only days from then on pay. A perfect day carries BOTH
-- facts, which is why perfect_day is priced at the difference: 40 + 20 = 60.
--
-- The way back: put 'day_on_target', 'perfect_day' back in the `not in` list below.

create or replace function public.career_facts_paid(p_athlete text)
returns table(kind text, ref text, day date, xp numeric, career_only boolean)
language sql
stable
set search_path to 'public'
as $function$
  with v as (select r.version, r.starts_on, r.rules as j from public.career_rules r),   -- stage76
  f as (
    select f.kind, f.ref, f.day, f.value from public.career_facts f
     where f.athlete_id = p_athlete and f.void_at is null
       and f.kind not in ('habit_done', 'habit_day', 'workout_tick', 'comeback', 'award_kept')   -- stage78, stage90
  ),
  priced as (
    select f.*,
           case when r.j -> 'fact' -> f.kind ->> 'xp_from' = 'value' then coalesce(public.career_num(f.value -> 'xp'), 0)
                else coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'xp'), 0) end as xp,
           coalesce(r.j -> 'fact' -> f.kind -> 'career_only' = 'true'::jsonb, false) as conly,
           r.j -> 'fact' -> f.kind ->> 'limit_per' as per,
           coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'limit'), 0) as lim
      from f cross join lateral (select v.j from v where v.starts_on is null or v.starts_on <= f.day order by v.version desc limit 1) r   -- stage76
  ),
  weeks as (select * from public.career_weeks(p_athlete)),
  keyed as (
    select p.*,
           case p.per
             when 'plan_day_week' then
               coalesce((select 'c' || w.cycle_num || '|w' || w.week from weeks w
                          where p.day between w.wfrom and w.wto and (p.value ->> 'plan_day') = any (w.plan)
                          order by w.cstart desc limit 1),
                        'iso:' || to_char(p.day, 'IYYY-IW')) || '|d' || coalesce(p.value ->> 'plan_day', '')
             when 'week' then 'iso:' || to_char(p.day, 'IYYY-IW')
             when 'cycle' then split_part(p.ref, '|', 1)
           end as grp
      from priced p
  ),
  ranked as (
    select k.*, row_number() over (partition by case when k.per = 'plan_day_week' then 'session' else k.kind end, k.grp
                                   order by k.xp desc, k.day, k.ref) as rn
      from keyed k
  )
  select ranked.kind, ranked.ref, ranked.day, ranked.xp, ranked.conly
    from ranked
   where ranked.grp is null or ranked.rn <= ranked.lim
  union all
  select 'award'::text, a.award_id, a.day, (case when not a.pays then 0 else a.xp end)::numeric, false   -- stage76: the minted XP (D20, D12 reversed)
    from public.career_awards a
   where a.athlete_id = p_athlete and public.career_catalogue_on()
  union all
  -- stage78: an award that left with the cut, paid as it was (its own XP, its own day, never career-only, only with the catalogue on)
  select 'award_kept'::text, k.ref, k.day, coalesce(public.career_num(k.value -> 'xp'), 0), false
    from public.career_facts k
   where k.athlete_id = p_athlete and k.kind = 'award_kept' and k.void_at is null and public.career_catalogue_on()
$function$;
