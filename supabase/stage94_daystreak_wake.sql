-- stage94: the day-streak achievements wake up when a day lands (2026-10-20)
--
-- APPLIED to the live project 2026-10-20, on Amir's "Go live now", with rulebook version 10 seeded straight after it.
-- Checked after: career_entry_kinds('achievement', {proof_measure: 'dayStreak'}) returns {day_on_target}, and get_profile()'s
-- rules.prices now carries day_on_target 40 and perfect_day 20. The snapshot was remade in the same commit.
--
-- Stage93 gave `dayStreak` a NAME (career_proof_key), so a catalogue entry could finally ask for days in a row that
-- counted. It did not give it a WAKE: career_entry_kinds() says which fact kinds an entry listens for, and after a save
-- career_evaluate() only looks at entries whose kinds overlap the kinds that just changed. `dayStreak` fell off the end
-- of that case and returned an empty array, which overlaps nothing — so UNBROKEN I and II (the live "Seven Days
-- Running" and "Thirty Days Running") were never considered on the partial evaluate that follows a save. They minted
-- only at a FULL evaluate, which is the next get_profile(): the moment arrived on the athlete's next app open instead
-- of on the day they earned it, and never on the finished-session card.
--
-- One line. `dayStreak` listens for day_on_target, exactly as `qualify` does and for the same reason: the run is walked
-- over the day_on_target facts. The rest of the function is unchanged, and is repeated here because plpgsql has no way
-- to patch a case arm.
--
-- Version 10 of the rulebook adds UNBROKEN III (100 days) and the ON TARGET ladder on `qualify`, so this stage goes in
-- before that seed. Checked live before writing: career_entry_kinds('achievement', '{"test":"proof","proof_measure":
-- "dayStreak"}') returned {}, and every other measure version 10 uses returned a non-empty array.
--
-- The way back: drop the `dayStreak` line below and re-run. Nothing else in the system reads it.

create or replace function public.career_entry_kinds(p_kind text, p_body jsonb)
returns text[]
language plpgsql
immutable
set search_path to 'public'
as $function$
declare v_counts text[]; v_m text; v_t text;
begin
  v_counts := case jsonb_typeof(p_body -> 'counts')
                when 'array' then array(select jsonb_array_elements_text(p_body -> 'counts'))
                when 'string' then array[p_body ->> 'counts']
                else '{}'::text[] end;
  if p_kind = 'badge' then
    case p_body ->> 'kind'
      when 'best_run' then
        return case public.career_badge_run(p_body)
                 when 'plan_weeks' then array['week_held', 'week_broken']
                 when 'days' then array['habit_done']
                 else v_counts end;
      when 'total' then return v_counts;
      when 'best_value' then return array['lift_gain'];
      when 'per_habit_best_run' then return array['habit_done'];
      when 'proof' then v_m := p_body ->> 'proof_measure';
      else return v_counts;
    end case;
  else
    v_t := public.career_achievement_test(p_body);
    case v_t
      when 'first' then return array[p_body ->> 'reads'];
      when 'proof' then v_m := p_body ->> 'proof_measure';
      when 'goals' then return array['habit_done', 'habit_day', 'day_on_target', 'perfect_day', 'comeback', 'comeback_stuck'];
      when 'cycle_all_held', 'cycle_by_the_book', 'cycle_with_broken' then
        return array['cycle_finished', 'week_held', 'week_by_the_book', 'week_broken'];
      when 'runs_together' then return array['habit_done'];
      when 'patterns_in_cycle' then return array['personal_best'];
      when 'best_value' then return array['lift_gain'];
      when 'cycle_proving' then return array['personal_best', 'retest_beaten', 'week_held', 'week_broken'];
      when 'run_regained' then return array['week_held', 'week_broken'];
      when 'total' then return array[p_body ->> 'reads'];                        -- stage79
      when 'best_run', 'month_held' then return array['week_held', 'week_broken'];   -- stage79
      else return '{}'::text[];
    end case;
  end if;
  -- a Proof measure
  return case when v_m is null then array['day_on_target']
              when v_m like 'streak:%' or v_m like 'daysHit:%' or v_m like 'total:%' then array['habit_done']
              when v_m = 'daysWith3' then array['habit_done', 'habit_day']
              when v_m in ('perfectDays', 'perfect') then array['perfect_day']
              when v_m = 'dayStreak' then array['day_on_target']   -- stage94: the run of days that counted
              when v_m = 'qualify' then array['day_on_target']
              when v_m = 'comebackRun' then array['comeback', 'day_on_target']
              when v_m = 'comebacksStuck' then array['comeback_stuck']
              else '{}'::text[] end;
end $function$;

-- ── and the day's own price reaches the phone ──────────────────────────────────────────────────────────────────────
-- get_profile() hands the app a `rules.prices` map so no screen has to keep its own copy of what anything is worth. The
-- map is an explicit whitelist of fact ids, and it was written before the day itself paid anything (stage90, this
-- morning: a counted day 40, a perfect one 20 more). So the manual, which reads prices and never types them, could say
-- what a session is worth and not what a day is worth.
--
-- Two ids are added to that list. Nothing else about get_profile() changes, and the function is NOT retyped here: it is
-- long, it is the app's main read, and a transcription slip in it is a worse bug than the one being fixed. The patch is
-- textual, anchored on the end of the array, and it RAISES if the anchor is not found exactly once, so a get_profile()
-- that has moved on fails this stage instead of being silently rewritten.
--
-- The way back: run the same block with v_new and v_old swapped.

do $$
declare v_def text; v_old text; v_new text; v_hits int;
begin
  v_old := $a$'library_session', 'retest_done']) as k(key)$a$;
  v_new := $a$'library_session', 'retest_done', 'day_on_target', 'perfect_day']) as k(key)$a$;
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'get_profile';
  if v_def is null then raise exception 'stage94: public.get_profile() not found'; end if;
  if position(v_new in v_def) > 0 then raise notice 'stage94: get_profile already carries the day prices'; return; end if;
  v_hits := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
  if v_hits <> 1 then raise exception 'stage94: the price whitelist anchor matched % times, expected 1', v_hits; end if;
  execute replace(v_def, v_old, v_new);
end $$;
