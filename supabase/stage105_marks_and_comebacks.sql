-- stage105_marks_and_comebacks.sql — a mark's step is a trophy on the Player Page, and the comebacks number counts what HARD TO KILL counts (2026-10-26)
--
-- Amir, looking at Pooya Pasandideh's page (72 sessions, "the 50 sessions trophy" missing) and at his own (5 comebacks, no comebacks trophy):
-- "all of them should be the same, and should be shown, fix the other thing as well".
--
-- What was wrong, found from the live rows:
--   1. crew_page() built `achievements` from career_awards of kind 'achievement' only. The four marks' steps (Century 25 · 50 · 100 · 200 · 500,
--      Hold Serve, Record Breaker, HARD TO KILL) are kind 'badge', so another person's Trophies never held a "50 sessions", a "4 weeks in a row" or a
--      "5 personal bests", while their own cabinet (and the Bell, which already reads the four marks) did. Pooya won Century step 2 on 2026-08-16.
--   2. career_rewards_profile() counted the "comebacks" number from `comeback` facts (every day on target after 3+ days off) and `training_return`,
--      while the HARD TO KILL mark counts `comeback_stuck` (a comeback held 7 days on target in a row) and `training_return`. Amir's card said 5 against
--      marks at 3 and 5 and the mark said 0. The number now counts what the mark counts. Nothing is minted or removed: no XP, award or fact changes (GAME-6).
--
-- What this does (two guarded textual patches, like stages 76/79/94/99/104: each line is found exactly once or the stage refuses and changes
-- nothing; safe to re-run):
--   crew_page(uuid,text): `achievements` also carries the four marks' steps (`a.kind = 'badge' and a.item in (held_weeks, century, bests, comebacks)`, the
--       same list get_bell() and get_courtside() use), the name is looked up under the award's own kind, and the list holds 60, not 40 (17 mark steps
--       were added to a list of 40). The id is the award id (`badge:century:2`), which is all the phone needs: the badge and the step are in it.
--       It sits behind the same switch as an achievement (v_s_ach): nothing new to turn off.
--   career_rewards_profile(text,jsonb): numbers.four.resilience.value counts comeback_stuck + training_return.
-- The way back: scripts/career/rollback_stage105.sql. get_profile()'s numbers.comebacks (the shadow count career_compare() compares) is NOT touched.

-- ── 0. The guard ───────────────────────────────────────────────────────────
do $stage105_guard$
begin
  if to_regprocedure('public.crew_page(uuid,text)') is null or to_regprocedure('public.career_rewards_profile(text,jsonb)') is null then
    raise exception 'stage105: stage 96 (crew_page) or stage 70 (career_rewards_profile) is not on this database. Nothing was changed.';
  end if;
end
$stage105_guard$;

-- ── 1. The patches ─────────────────────────────────────────────────────────
do $stage105_patch$
declare p record; d text; n int;
begin
  for p in
    select * from (values
      ('public.crew_page(uuid,text)',
       $a$where a.athlete_id = v_subj and a.kind = 'achievement'$a$,
       $a$where a.athlete_id = v_subj and (a.kind = 'achievement' or (a.kind = 'badge' and a.item in ('held_weeks', 'century', 'bests', 'comebacks')))   /* stage105: a mark's step is a trophy too */$a$),
      ('public.crew_page(uuid,text)',
       $a$order by a.day desc, a.award_id limit 40) x;$a$,
       $a$order by a.day desc, a.award_id limit 60) x;$a$),
      ('public.crew_page(uuid,text)',
       $a$ct.kind = 'achievement' and ct.id = a.item$a$,
       $a$ct.kind = a.kind and ct.id = a.item$a$),
      ('public.career_rewards_profile(text,jsonb)',
       $a$count(*) filter (where cf.kind in ('comeback', 'training_return'))$a$,
       $a$count(*) filter (where cf.kind in ('comeback_stuck', 'training_return'))   /* stage105: what HARD TO KILL counts */$a$)
    ) as t(fn, old_text, new_text)
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position(p.new_text in d) > 0 then continue; end if;                   -- already patched (a re-run)
    n := (length(d) - length(replace(d, p.old_text, ''))) / length(p.old_text);
    if n <> 1 then
      raise exception 'stage105: % is not what this stage expects (this line was found % times, not once): %. Nothing was changed.', p.fn, n, left(p.old_text, 80);
    end if;
    execute replace(d, p.old_text, p.new_text);
  end loop;
end
$stage105_patch$;

-- ── 2. The check ───────────────────────────────────────────────────────────
do $stage105_check$
begin
  if position('stage105' in pg_get_functiondef('public.crew_page(uuid,text)'::regprocedure)) = 0
     or position('stage105' in pg_get_functiondef('public.career_rewards_profile(text,jsonb)'::regprocedure)) = 0 then
    raise exception 'stage105: a patched function does not carry the stage105 text';
  end if;
  raise notice 'stage105: done';
end
$stage105_check$;
