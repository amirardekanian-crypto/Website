-- stage36 — Body parts involved, on the Spine (2026-09-24). APPLIED.
--
-- Amir: "in farsi version of this in TPS app we have: بخش‌هایی از بدن که درگیر است — همسترینگ،
-- لگن و کشاله ران، ساق و آشیل، مچ پا و پا، زانو، دویدن. i think for the 100 exercises that we used
-- most in our programs, we should do this, and remember if we add a exercise to the database through
-- writing a program or updating one, to add these details."
--
-- The course app (tennis/app/app.js) shows each exercise's `tags` (body regions, REGION_FA) and one
-- `impact` word (IMPACT_FA) drawn as a clay pill. The Spine already had `loads` (stage31, "body
-- regions it loads") in loose words nobody saw (shoulders, hips, core, adductors…). From here:
--   loads   the course's region ids: ankle-foot · calf-achilles · knee · hip-groin · hamstring ·
--           low-back · trunk · shoulder · elbow-forearm-wrist, plus neck (two neck drills; the
--           course never needed it). Checked by the database.
--   impact  NEW. none · running · plyometric · landing, the course's four words. NULL means "not
--           checked yet": upkeep flags it, and the app then shows the regions with no impact pill.
-- program.html draws them in the About sheet as "Body parts involved" (bodyPartsHtml()); coach.html
-- edits them as tick boxes and a menu; draft_sql.py refuses a draft without them.
--
-- 1. Backup: every entry's old loads, in exercise_coach.links_history (tag claude-body-2026-09-24d).
-- 2. The old words were renamed for EVERY entry to the course's ids (same meaning, no judgement):
--    shoulders→shoulder, hips/adductors→hip-groin, knees→knee, core→trunk, ankles→ankle-foot,
--    calves→calf-achilles, elbows/wrists→elbow-forearm-wrist, hamstrings→hamstring, lower-back→low-back.
-- 3. The 100 most-used entries (by athletes, then slots, across live programmes) were set by hand.
--    The 35 that also exist in the course copy its tags exactly (last column true), so both apps
--    agree; the rest follow the course's calibration: squat/lunge = knee + hip-groin (+ low-back with
--    a bar on the back), hinge = hamstring + hip-groin (+ low-back when loaded), bridge/thrust =
--    hip-groin + hamstring, pull/press = shoulder + elbow-forearm-wrist, trunk work = trunk (+ low-back
--    when it rotates or lifts the back), calf work = calf-achilles + ankle-foot. The other 109 keep
--    their renamed words and no impact until upkeep reaches them.
-- 4. get_exercises() returns impact.
--
-- Undo one entry's loads:
--   update public.exercises x set loads = array(select jsonb_array_elements_text(h->'loads')), impact = null
--     from public.exercise_coach c, jsonb_array_elements(c.links_history) h
--    where c.id = x.id and h->>'before' = 'claude-body-2026-09-24d' and x.id = '<exercise-id>';
-- (The loads check below has to be dropped first, since the old words are outside it.)

begin;
alter table public.exercises add column if not exists impact text;
alter table public.exercises drop constraint if exists exercises_impact_check;
alter table public.exercises add constraint exercises_impact_check
  check (impact is null or impact in ('none', 'running', 'plyometric', 'landing'));

insert into public.exercise_coach (id, links_history)
select id, jsonb_build_array(jsonb_build_object('before', 'claude-body-2026-09-24d', 'saved', now(), 'loads', to_jsonb(loads)))
  from public.exercises
on conflict (id) do update set links_history = public.exercise_coach.links_history || excluded.links_history
 where not public.exercise_coach.links_history @> '[{"before": "claude-body-2026-09-24d"}]';

update public.exercises x set loads = array(
  select m from (select m, min(o) o from unnest(x.loads) with ordinality t(w, o),
    lateral (select case w when 'shoulders' then 'shoulder' when 'hips' then 'hip-groin' when 'adductors' then 'hip-groin'
      when 'knees' then 'knee' when 'core' then 'trunk' when 'ankles' then 'ankle-foot' when 'calves' then 'calf-achilles'
      when 'elbows' then 'elbow-forearm-wrist' when 'wrists' then 'elbow-forearm-wrist' when 'hamstrings' then 'hamstring'
      when 'lower-back' then 'low-back' else w end m) z group by m) y order by o)
 where x.loads && array['shoulders','hips','adductors','knees','core','ankles','calves','elbows','wrists','hamstrings','lower-back'];

update public.exercises x set loads = v.loads, impact = v.impact, updated_at = now(), updated_by = 'claude-body-2026-09-24d'
  from (values
  ('band-pull-apart', array['shoulder']::text[], 'none', true),
  ('glute-bridge', array['hip-groin', 'hamstring']::text[], 'none', false),
  ('90-90-hip-switch', array['hip-groin']::text[], 'none', true),
  ('lat-pulldown', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('banded-lateral-walk', array['hip-groin']::text[], 'none', false),
  ('chest-supported-dumbbell-row', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', true),
  ('dead-bug', array['trunk']::text[], 'none', true),
  ('cable-face-pull', array['shoulder']::text[], 'none', false),
  ('machine-leg-press', array['knee', 'hip-groin']::text[], 'none', false),
  ('suitcase-carry', array['trunk', 'elbow-forearm-wrist']::text[], 'none', true),
  ('machine-seated-leg-curl', array['hamstring']::text[], 'none', false),
  ('assault-bike', array['knee', 'hip-groin', 'shoulder']::text[], 'none', false),
  ('ankle-dorsiflexion-rocks', array['ankle-foot', 'calf-achilles']::text[], 'none', true),
  ('cat-cow', array['low-back', 'trunk']::text[], 'none', false),
  ('band-pass-through', array['shoulder']::text[], 'none', false),
  ('bird-dog', array['trunk', 'low-back']::text[], 'none', false),
  ('stationary-bike', array['knee', 'hip-groin']::text[], 'none', false),
  ('back-extension-45', array['hamstring', 'hip-groin', 'low-back']::text[], 'none', false),
  ('half-kneeling-pallof-press', array['trunk']::text[], 'none', true),
  ('scapular-push-up', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('side-plank', array['trunk', 'shoulder']::text[], 'none', true),
  ('barbell-hip-thrust', array['hip-groin', 'hamstring']::text[], 'none', false),
  ('band-external-rotation', array['shoulder']::text[], 'none', true),
  ('incline-treadmill-walk', array['calf-achilles', 'ankle-foot']::text[], 'none', false),
  ('worlds-greatest-stretch', array['hip-groin']::text[], 'none', true),
  ('rowing', array['knee', 'low-back', 'shoulder']::text[], 'none', false),
  ('machine-leg-extension', array['knee']::text[], 'none', false),
  ('machine-lying-leg-curl', array['hamstring']::text[], 'none', false),
  ('dowel-hip-hinge', array['hamstring', 'hip-groin']::text[], 'none', false),
  ('leg-swings', array['hip-groin', 'hamstring']::text[], 'none', true),
  ('barbell-back-squat', array['knee', 'hip-groin', 'low-back']::text[], 'none', true),
  ('dumbbell-romanian-deadlift', array['hamstring', 'hip-groin', 'low-back']::text[], 'none', false),
  ('machine-shoulder-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('dumbbell-bench-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('dumbbell-split-squat', array['knee', 'hip-groin']::text[], 'none', true),
  ('single-arm-dumbbell-row', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', true),
  ('incline-dumbbell-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('pogo-jump', array['calf-achilles', 'ankle-foot']::text[], 'plyometric', true),
  ('barbell-romanian-deadlift', array['hamstring', 'hip-groin', 'low-back']::text[], 'none', false),
  ('goblet-squat', array['knee', 'hip-groin']::text[], 'none', false),
  ('seated-machine-calf-raise', array['calf-achilles', 'ankle-foot']::text[], 'none', false),
  ('cable-pallof-press', array['trunk']::text[], 'none', false),
  ('copenhagen-plank', array['hip-groin']::text[], 'none', true),
  ('dumbbell-reverse-lunge', array['knee', 'hip-groin']::text[], 'none', true),
  ('machine-chest-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('medicine-ball-rotational-throw', array['trunk', 'low-back', 'shoulder']::text[], 'none', true),
  ('single-leg-calf-raise', array['calf-achilles', 'ankle-foot']::text[], 'none', false),
  ('single-leg-glute-bridge', array['hip-groin', 'hamstring']::text[], 'none', false),
  ('standing-machine-calf-raise', array['calf-achilles', 'ankle-foot']::text[], 'none', true),
  ('walk', array['ankle-foot', 'calf-achilles']::text[], 'none', false),
  ('banded-clamshell', array['hip-groin']::text[], 'none', false),
  ('open-book', array['trunk']::text[], 'none', true),
  ('scapular-wall-slide', array['shoulder']::text[], 'none', false),
  ('banded-glute-bridge', array['hip-groin', 'hamstring']::text[], 'none', false),
  ('cable-external-rotation', array['shoulder']::text[], 'none', true),
  ('cable-lateral-raise', array['shoulder']::text[], 'none', false),
  ('dumbbell-bulgarian-split-squat', array['knee', 'hip-groin']::text[], 'none', true),
  ('dumbbell-lateral-raise', array['shoulder']::text[], 'none', false),
  ('lateral-lunge', array['hip-groin', 'knee']::text[], 'none', true),
  ('machine-hip-thrust', array['hip-groin', 'hamstring']::text[], 'none', false),
  ('machine-reverse-fly', array['shoulder']::text[], 'none', false),
  ('cable-pull-through', array['hamstring', 'hip-groin']::text[], 'none', false),
  ('quadruped-thoracic-rotation', array['trunk']::text[], 'none', true),
  ('box-step-up', array['knee', 'hip-groin']::text[], 'none', false),
  ('cable-tricep-pushdown', array['elbow-forearm-wrist']::text[], 'none', false),
  ('half-kneeling-single-arm-dumbbell-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', true),
  ('lateral-bound', array['knee', 'hip-groin', 'ankle-foot']::text[], 'plyometric', true),
  ('machine-plate-loaded-row', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('plank-with-shoulder-taps', array['trunk', 'shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('prone-y-raise', array['shoulder']::text[], 'none', true),
  ('seated-cable-row', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('stability-ball-leg-curl', array['hamstring']::text[], 'none', true),
  ('chin-tuck', array['neck']::text[], 'none', false),
  ('easy-run', array['calf-achilles', 'ankle-foot', 'knee']::text[], 'running', false),
  ('half-kneeling-hip-flexor-stretch', array['hip-groin']::text[], 'none', true),
  ('hip-airplane', array['hip-groin', 'ankle-foot']::text[], 'none', false),
  ('single-leg-balance', array['ankle-foot']::text[], 'none', true),
  ('squat-to-stand', array['hamstring', 'hip-groin']::text[], 'none', false),
  ('banded-dead-bug', array['trunk']::text[], 'none', false),
  ('banded-scapular-pull-down', array['shoulder']::text[], 'none', false),
  ('bodyweight-squat', array['knee', 'hip-groin']::text[], 'none', false),
  ('dumbbell-bicep-curl', array['elbow-forearm-wrist']::text[], 'none', false),
  ('dumbbell-hammer-curl', array['elbow-forearm-wrist']::text[], 'none', false),
  ('farmers-carry', array['elbow-forearm-wrist', 'trunk']::text[], 'none', false),
  ('front-foot-elevated-split-squat', array['knee', 'hip-groin']::text[], 'none', false),
  ('half-kneeling-single-arm-landmine-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', true),
  ('lateral-step-down', array['knee', 'hip-groin']::text[], 'none', false),
  ('machine-hack-squat', array['knee', 'hip-groin']::text[], 'none', false),
  ('scapular-pull-up', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('serratus-wall-slide', array['shoulder']::text[], 'none', false),
  ('single-arm-cable-row', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', true),
  ('single-leg-dumbbell-hip-thrust', array['hip-groin', 'hamstring']::text[], 'none', true),
  ('spiderman-lunge-with-reach', array['hip-groin', 'trunk']::text[], 'none', false),
  ('standing-dumbbell-single-leg-calf-raise', array['calf-achilles', 'ankle-foot']::text[], 'none', true),
  ('wall-sit', array['knee']::text[], 'none', false),
  ('arm-bike', array['shoulder']::text[], 'none', false),
  ('reverse-lunge', array['knee', 'hip-groin']::text[], 'none', false),
  ('banded-side-lying-hip-abduction', array['hip-groin']::text[], 'none', false),
  ('barbell-bench-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('broad-jump', array['knee', 'ankle-foot', 'calf-achilles']::text[], 'plyometric', true)
  ) v(id, loads, impact, from_course)
 where x.id = v.id;

alter table public.exercises drop constraint if exists exercises_loads_check;
alter table public.exercises add constraint exercises_loads_check
  check (loads <@ array['ankle-foot', 'calf-achilles', 'knee', 'hip-groin', 'hamstring', 'low-back', 'trunk',
                        'shoulder', 'elbow-forearm-wrist', 'neck']::text[]);

create or replace function public.get_exercises()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'name', e.name, 'aliases', e.aliases, 'pattern', e.pattern,
           'qualities', e.qualities, 'purpose', e.purpose, 'tennis', e.tennis,
           'cues', e.cues, 'equipment', e.equipment, 'loads', e.loads, 'impact', e.impact,
           'easier', e.easier, 'harder', e.harder, 'alts', e.alts, 'video', e.video
         ) order by e.name), '[]'::jsonb)
  from public.exercises e
  where e.status = 'approved';
$function$;
commit;
