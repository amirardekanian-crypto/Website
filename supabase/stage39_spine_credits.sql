-- stage39 — muscle credits and a cost tier on every Spine entry (2026-09-26)
--
-- Amir, 2026-09-26: yes to "muscle credits + cost tier on each Spine entry so the checker computes
-- the volume tables and the per-day load". Until now every cycle's two volume tables (VOL-10) and the
-- cost-weighted day loads (VOL-2) were written by hand in the coaching log, and
-- scripts/check_program.py only checked the hand table against the programme. The same squat was
-- counted differently in different logs (an RDL's glutes at 1 in one and 0.5 in another; a face
-- pull filed under back, shoulder or both), and every cycle spent tokens retyping arithmetic.
-- Now the count lives ONCE, on the exercise, and the checker does the arithmetic.
--
--   credits  jsonb   muscle -> 1 (prime mover) or 0.5 (significant synergist, or shortened range),
--                    VOL-10's convention. A muscle not named counts 0. {} = checked, counts toward
--                    nothing (a stretch, a sprint, a ride). NULL = never set: the checker FAILs a
--                    programme that uses it, because its volume would be silently short.
--   cost     text    VOL-2's systemic cost of one working set: heavy x1.5, moderate x1, isolation
--                    x0.5, none x0. The checker weights each working set by it for the day's load.
--
-- Coach-only, on exercise_coach beside SFR and the flags: athletes never see a count, and
-- get_exercises() never reads this table. The values for the 220 entries were loaded from a batch
-- kept in the scratchpad (the coach-only half stays out of this public repo, same rule as SFR);
-- they started from the counts the coaching logs already used. Amir edits them in coach.html ->
-- Exercises -> an entry -> "Coach only".
--
-- ⚠ The muscle list exists FOUR times: public.spine_credits_ok() below, SPINE_MUSCLES in coach.html,
-- MUSCLES in scripts/check_program.py and MUSCLES in .claude/skills/spine/draft_sql.py. Change all four.

create or replace function public.spine_credits_ok(c jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select c is null or (jsonb_typeof(c) = 'object' and not exists (
    select 1 from jsonb_each(c) e(k, v)
    where e.k not in ('quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'shins', 'peroneals', 'back',
                      'chest', 'shoulder', 'biceps', 'triceps', 'forearm', 'core', 'neck')
       or jsonb_typeof(e.v) <> 'number' or (e.v #>> '{}')::numeric not in (0.5, 1)))
$$;

alter table public.exercise_coach add column if not exists credits jsonb;
alter table public.exercise_coach add column if not exists cost text;

alter table public.exercise_coach drop constraint if exists exercise_coach_credits_ok;
alter table public.exercise_coach add constraint exercise_coach_credits_ok check (public.spine_credits_ok(credits));
alter table public.exercise_coach drop constraint if exists exercise_coach_cost_ok;
alter table public.exercise_coach add constraint exercise_coach_cost_ok
  check (cost is null or cost in ('heavy', 'moderate', 'isolation', 'none'));

comment on column public.exercise_coach.credits is
  'VOL-10: muscle -> 1 or 0.5 weekly sets per working set. {} = counts toward nothing, null = never set.';
comment on column public.exercise_coach.cost is
  'VOL-2: heavy (x1.5), moderate (x1), isolation (x0.5) or none (x0), per working set, for the day''s load.';
