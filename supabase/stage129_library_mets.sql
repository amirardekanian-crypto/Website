-- stage129_library_mets.sql — the Library's MET values, checked against the 2024 Adult Compendium (2026-11-24)
--
-- Amir, on the shelf values stage127 set by analogy ("conditioning 8, on-court 6, strength 5 ... not a measured figure"): "fix this".
-- Then: "add to the rule, that every session in the library needs to calculate this when uploading and add it". So each Library session
-- now CARRIES its MET, as `met` { value, code, entry, source } in its own JSON (workouts/<shelf>/<slug>.json) and in its public.library row,
-- from a named 2024 Adult Compendium entry (Herrmann et al. 2024, pacompendium.com, read 2026-11-24), chosen from what the session actually
-- is, session average with its rests. /workout sets it on every new session (its Step 3, `met` is required) and pre-commit guard 14b
-- (scripts/check_library_met.py) blocks a session file without one. move_lib_met() reads the row's value; the shelf default below is only
-- the fallback for a row published without one. Move minutes count only minutes at 3 MET or more, so care, mobility, recovery and
-- breathing count nothing, as before.
--
--   conditioning   default 7.0  02210 high intensity interval exercise, moderate effort (Floor Engine, Deep Water, Deuce Point, Hold the Line)
--                  steady-run 7.5 (12020 jogging, general) · engine-builder 6.0 (12010 jog/walk combination: an easy conversational pace)
--                  run-warm-up 4.8 (12025 jogging in place: raise, mobilise, activate)
--   on-court       default 6.0  02032 circuit training, body weight exercises (drills with rest between reps; the Compendium has no
--                  plyometrics or agility-ladder entry) · tennis-warm-up-routine 5.0 (15695 tennis, hitting balls, non-game play, moderate)
--   strength       default 3.8  02022 calisthenics, moderate effort (Ground Work, Banded Lower Burner)
--                  full-body-power 5.0 (02052 resistance training, squats, deadlift) · push-pull-pump 3.5 (02054 resistance training, multiple
--                  exercises, 8-15 reps) · trunk-and-rotation 3.0 (02056 body weight resistance exercises, general)
--   care           2.8  02024 calisthenics, light effort (slow, light loading for a sore back, knee, elbow or shoulder; no rehab entry exists)
--   mobility       2.3  02101 stretching, mild / 02150 yoga, Hatha
--   recovery       2.3  02101 stretching, mild
--   breath         1.0  07075 meditating
--
-- What changed from stage127: conditioning 8.0 → 7.0 (by session), strength 5.0 → 3.8 (by session), care 3.5 → 2.8 (now under the 3 MET
-- floor: a care session counts no Move minutes), mobility 2.5 → 2.3, breath 1.3 → 1.0. The plan's Gym row (3.5 / 5.0 / 6.0 by session RPE)
-- already matches 02054 / 02052 / 02050 and is unchanged.
-- Forward only in effect: no Library session had been done since 2026-11-24, the first day a week can pay, so no move_week fact moved. The table and its sources: docs/ref/move-credit.md. Safe to re-run.

do $stage129_guard$
begin
  if to_regprocedure('public.move_parts(text,date,date)') is null or to_regprocedure('public.move_shelf_met(text)') is null then
    raise exception 'stage129: stage127 is missing. Nothing was changed.';
  end if;
end $stage129_guard$;

-- A shelf's default, for a session that has no value of its own.
create or replace function public.move_shelf_met(p_shelf text)
returns numeric
language sql
immutable
as $$
  select case p_shelf
    -- MOVE_SHELF_BEGIN
    when 'conditioning' then 7.0 when 'on-court' then 6.0 when 'strength' then 3.8 when 'care' then 2.8
    when 'mobility' then 2.3 when 'recovery' then 2.3 when 'breath' then 1.0
    -- MOVE_SHELF_END
    else 3.5 end
$$;

-- Every session's own value (the files' `met`, written to the rows here; /workout adds it to every new one).
update public.library l set data = l.data || jsonb_build_object('met', v.met)
  from (values
    ('workouts/breath/post-competition', '{"value": 1.0, "code": "07075", "entry": "Meditating", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/breath/pre-sleep', '{"value": 1.0, "code": "07075", "entry": "Meditating", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/breath/stress-reset', '{"value": 1.0, "code": "07075", "entry": "Meditating", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/care/back-under-load', '{"value": 2.8, "code": "02024", "entry": "Calisthenics (e.g., curl ups, abdominal crunches, plank), light effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/care/forearm-loading', '{"value": 2.8, "code": "02024", "entry": "Calisthenics (e.g., curl ups, abdominal crunches, plank), light effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/care/knee-and-achilles-loading', '{"value": 2.8, "code": "02024", "entry": "Calisthenics (e.g., curl ups, abdominal crunches, plank), light effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/care/lower-back', '{"value": 2.8, "code": "02024", "entry": "Calisthenics (e.g., curl ups, abdominal crunches, plank), light effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/care/morning-back', '{"value": 2.8, "code": "02024", "entry": "Calisthenics (e.g., curl ups, abdominal crunches, plank), light effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/care/racket-arm', '{"value": 2.8, "code": "02024", "entry": "Calisthenics (e.g., curl ups, abdominal crunches, plank), light effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/care/shoulder-endurance', '{"value": 2.8, "code": "02024", "entry": "Calisthenics (e.g., curl ups, abdominal crunches, plank), light effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/conditioning/bodyweight-intervals', '{"value": 7.0, "code": "02210", "entry": "High intensity interval exercise, moderate effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/conditioning/engine-builder', '{"value": 6.0, "code": "12010", "entry": "Jog/walk combination (jogging component of less than 10 minutes) (Taylor Code 180)", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/conditioning/long-rally-intervals', '{"value": 7.0, "code": "02210", "entry": "High intensity interval exercise, moderate effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/conditioning/repeat-effort', '{"value": 7.0, "code": "02210", "entry": "High intensity interval exercise, moderate effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/conditioning/run-warm-up', '{"value": 4.8, "code": "12025", "entry": "Jogging, in place", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/conditioning/steady-run', '{"value": 7.5, "code": "12020", "entry": "Jogging, general, self-selected pace", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/conditioning/threshold-intervals', '{"value": 7.0, "code": "02210", "entry": "High intensity interval exercise, moderate effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/mobility/ankles-and-calves', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/mobility/daily-flow', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/mobility/everyday-mobility', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/mobility/front-rack-rescue', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/mobility/hips-and-groin', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/mobility/thoracic-and-shoulder', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/mobility/wide-stance-hips', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/on-court/braking-and-cuts', '{"value": 6.0, "code": "02032", "entry": "Circuit training, body weight exercises", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/on-court/change-of-direction', '{"value": 6.0, "code": "02032", "entry": "Circuit training, body weight exercises", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/on-court/first-step-speed', '{"value": 6.0, "code": "02032", "entry": "Circuit training, body weight exercises", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/on-court/first-two-steps', '{"value": 6.0, "code": "02032", "entry": "Circuit training, body weight exercises", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/on-court/landing-and-springs', '{"value": 6.0, "code": "02032", "entry": "Circuit training, body weight exercises", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/on-court/reactive-agility', '{"value": 6.0, "code": "02032", "entry": "Circuit training, body weight exercises", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/on-court/read-and-react', '{"value": 6.0, "code": "02032", "entry": "Circuit training, body weight exercises", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/on-court/tennis-warm-up-routine', '{"value": 5.0, "code": "15695", "entry": "Tennis, hitting balls, non-game play, moderate effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/recovery/between-matches', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/recovery/day-after-match', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/recovery/day-after', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/recovery/evening-release', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/recovery/reset-roll', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/recovery/static-stretch', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/recovery/travel-holds', '{"value": 2.3, "code": "02101", "entry": "Stretching, mild", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/strength/bodyweight-band-strength', '{"value": 3.8, "code": "02022", "entry": "Calisthenics (e.g., pushups, sit ups, pull-ups, lunges), moderate effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/strength/bodyweight-strength', '{"value": 3.8, "code": "02022", "entry": "Calisthenics (e.g., pushups, sit ups, pull-ups, lunges), moderate effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/strength/full-body-power', '{"value": 5.0, "code": "02052", "entry": "Resistance (weight) training, squats, deadlift, slow or explosive effort", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/strength/push-pull-pump', '{"value": 3.5, "code": "02054", "entry": "Resistance (weight) training, multiple exercises, 8-15 reps at varied resistance", "source": "2024 Adult Compendium"}'::jsonb),
    ('workouts/strength/trunk-and-rotation', '{"value": 3.0, "code": "02056", "entry": "Body weight resistance exercises (e.g., squat, lunge, push-up, crunch), general", "source": "2024 Adult Compendium"}'::jsonb)
  ) v(slug, met)
 where l.slug = v.slug and l.kind = 'workout';

-- The Farsi copy (`fa`) is a full twin in which only the words differ (scripts/i18n/check_library_fa.js): it carries the same `met`.
update public.library set data = jsonb_set(data, '{fa,met}', data -> 'met')
 where kind = 'workout' and data ? 'met' and jsonb_typeof(data -> 'fa') = 'object' and (data -> 'fa' -> 'met') is distinct from (data -> 'met');

-- A Library session's MET: its row's `met.value` when it has one, else its shelf's default.
create or replace function public.move_lib_met(p_slug text, p_shelf text)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select case when jsonb_typeof(l.data -> 'met' -> 'value') = 'number' and (l.data #>> '{met,value}')::numeric between 0.9 and 23
                               then (l.data #>> '{met,value}')::numeric end
                     from public.library l where l.slug = p_slug and l.kind = 'workout' limit 1),
                  public.move_shelf_met(p_shelf))
$$;

-- move_parts() reads a Library session's own value.
do $stage129_parts$
declare
  d text := pg_get_functiondef('public.move_parts(text,date,date)'::regprocedure);
  s_old constant text := 'public.move_shelf_met(l.category_id) as met';
  s_new constant text := 'public.move_lib_met(l.slug, l.category_id) as met';
begin
  if position(s_new in d) > 0 then return; end if;
  if (length(d) - length(replace(d, s_old, ''))) / length(s_old) <> 1 then
    raise exception 'stage129: move_parts() is not what this patch expects. Nothing was changed.';
  end if;
  execute replace(d, s_old, s_new);
end $stage129_parts$;

revoke all on function public.move_shelf_met(text) from public, anon;
grant execute on function public.move_shelf_met(text) to authenticated, service_role;
revoke all on function public.move_lib_met(text, text) from public, anon;
grant execute on function public.move_lib_met(text, text) to authenticated, service_role;

do $stage129_check$
begin
  if position('move_lib_met' in pg_get_functiondef('public.move_parts(text,date,date)'::regprocedure)) = 0
     or public.move_lib_met('workouts/strength/full-body-power', 'strength') <> 5.0
     or public.move_lib_met('workouts/strength/bodyweight-strength', 'strength') <> 3.8
     or public.move_lib_met('workouts/care/racket-arm', 'care') <> 2.8
     or exists (select 1 from public.library l where l.kind = 'workout' and l.published and jsonb_typeof(l.data -> 'met' -> 'value') is distinct from 'number') then
    raise exception 'stage129: a part did not take';
  end if;
  raise notice 'stage129: applied';
end
$stage129_check$;
