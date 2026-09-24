-- stage37 — Body parts on the other 109 Spine entries (2026-09-24). APPLIED.
--
-- Amir: "do all 109 now". stage36 set body parts (loads + impact) by hand on the 100 most-used
-- entries and only renamed the loose old words on the rest, leaving their impact null. This sets
-- the remaining 109 the same way, so every entry has been checked and has an impact.
--
-- The 21 that also exist in the course app copy its tags exactly (last column true). One of those,
-- Trap Bar Deadlift, carries five regions because the course does; everything else stays at four or
-- fewer. The rest follow the calibration in stage36 and in /spine. Impact: 100 none, 7 plyometric
-- (Jumping), 1 landing (Snap Down), 1 running (Forward Skip).
--
-- Backup: each entry's loads as they stood after stage36, in exercise_coach.links_history (tag
-- claude-body-2026-09-24e; the words from before stage36 are under claude-body-2026-09-24d).
-- Only rows whose impact is still null are touched, so re-running changes nothing.
--
-- Result, checked after: 209 of 209 entries have loads and an impact.

begin;
insert into public.exercise_coach (id, links_history)
select id, jsonb_build_array(jsonb_build_object('before', 'claude-body-2026-09-24e', 'saved', now(), 'loads', to_jsonb(loads)))
  from public.exercises where impact is null
on conflict (id) do update set links_history = public.exercise_coach.links_history || excluded.links_history
 where not public.exercise_coach.links_history @> '[{"before": "claude-body-2026-09-24e"}]';

update public.exercises x set loads = v.loads, impact = v.impact, updated_at = now(), updated_by = 'claude-body-2026-09-24e'
  from (values
  ('ab-wheel-rollout', array['trunk', 'shoulder']::text[], 'none', false),
  ('flutter-kick', array['trunk']::text[], 'none', false),
  ('hollow-hold', array['trunk']::text[], 'none', false),
  ('plank', array['trunk', 'shoulder']::text[], 'none', false),
  ('reverse-crunch', array['trunk']::text[], 'none', false),
  ('rkc-plank', array['trunk', 'shoulder']::text[], 'none', false),
  ('heel-touch', array['trunk']::text[], 'none', false),
  ('kneeling-side-plank', array['trunk', 'shoulder']::text[], 'none', false),
  ('modified-side-plank-with-hip-abduction', array['trunk', 'hip-groin', 'shoulder']::text[], 'none', false),
  ('band-pallof-press', array['trunk']::text[], 'none', false),
  ('bear-crawl', array['trunk', 'shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('tall-kneeling-cable-pallof-press', array['trunk']::text[], 'none', true),
  ('incline-treadmill-push', array['calf-achilles', 'ankle-foot', 'hip-groin']::text[], 'none', false),
  ('march-in-place', array['hip-groin']::text[], 'none', false),
  ('sled-push', array['knee', 'hip-groin', 'calf-achilles']::text[], 'none', false),
  ('banded-pull-through', array['hamstring', 'hip-groin']::text[], 'none', false),
  ('conventional-deadlift', array['hamstring', 'hip-groin', 'low-back', 'elbow-forearm-wrist']::text[], 'none', false),
  ('dumbbell-glute-bridge', array['hip-groin', 'hamstring']::text[], 'none', false),
  ('dumbbell-hip-thrust', array['hip-groin', 'hamstring']::text[], 'none', false),
  ('dumbbell-single-leg-romanian-deadlift', array['hamstring', 'hip-groin', 'low-back']::text[], 'none', true),
  ('glute-bridge-march', array['hip-groin', 'hamstring', 'trunk']::text[], 'none', false),
  ('good-morning', array['hamstring', 'hip-groin', 'low-back']::text[], 'none', false),
  ('kettlebell-swing', array['hamstring', 'hip-groin', 'low-back']::text[], 'none', false),
  ('trap-bar-deadlift', array['knee', 'hip-groin', 'hamstring', 'low-back', 'elbow-forearm-wrist']::text[], 'none', true),
  ('wall-hip-hinge', array['hamstring', 'hip-groin']::text[], 'none', false),
  ('band-w-raise', array['shoulder']::text[], 'none', false),
  ('bench-crunch', array['trunk']::text[], 'none', false),
  ('cable-chest-fly', array['shoulder']::text[], 'none', false),
  ('cable-crunch', array['trunk']::text[], 'none', false),
  ('cable-curl', array['elbow-forearm-wrist']::text[], 'none', false),
  ('cable-glute-kickback', array['hip-groin', 'hamstring']::text[], 'none', false),
  ('cable-hip-abduction', array['hip-groin']::text[], 'none', false),
  ('cable-overhead-tricep-extension', array['elbow-forearm-wrist', 'shoulder']::text[], 'none', false),
  ('dumbbell-forearm-rotation', array['elbow-forearm-wrist']::text[], 'none', false),
  ('dumbbell-overhead-lateral-raise', array['shoulder']::text[], 'none', false),
  ('dumbbell-wrist-extension', array['elbow-forearm-wrist']::text[], 'none', true),
  ('ez-bar-curl', array['elbow-forearm-wrist']::text[], 'none', false),
  ('hand-resisted-neck-hold', array['neck']::text[], 'none', false),
  ('hanging-leg-raise', array['trunk', 'shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('incline-y-t-raise', array['shoulder']::text[], 'none', false),
  ('machine-pec-deck', array['shoulder']::text[], 'none', false),
  ('mini-band-external-rotation', array['shoulder']::text[], 'none', false),
  ('prone-dumbbell-reverse-fly', array['shoulder']::text[], 'none', false),
  ('prone-y-t-w', array['shoulder']::text[], 'none', false),
  ('seated-dumbbell-calf-raise', array['calf-achilles', 'ankle-foot']::text[], 'none', true),
  ('seated-machine-hip-abduction', array['hip-groin']::text[], 'none', false),
  ('side-lying-dumbbell-external-rotation', array['shoulder']::text[], 'none', true),
  ('single-arm-eccentric-wrist-extension', array['elbow-forearm-wrist']::text[], 'none', true),
  ('tibialis-raise', array['calf-achilles', 'ankle-foot']::text[], 'none', true),
  ('trx-hamstring-curl', array['hamstring']::text[], 'none', false),
  ('v-up', array['trunk']::text[], 'none', false),
  ('box-jump', array['knee', 'ankle-foot']::text[], 'plyometric', true),
  ('jump-rope', array['calf-achilles', 'ankle-foot']::text[], 'plyometric', false),
  ('lateral-line-hop', array['ankle-foot', 'calf-achilles']::text[], 'plyometric', true),
  ('low-box-rebound-jump', array['calf-achilles', 'ankle-foot', 'knee']::text[], 'plyometric', false),
  ('single-leg-box-jump', array['knee', 'ankle-foot', 'calf-achilles']::text[], 'plyometric', true),
  ('single-leg-lateral-hop', array['ankle-foot', 'knee', 'hip-groin']::text[], 'plyometric', true),
  ('snap-down', array['knee', 'ankle-foot']::text[], 'landing', true),
  ('squat-jump', array['knee', 'ankle-foot', 'calf-achilles']::text[], 'plyometric', false),
  ('90-90-hip-stretch', array['hip-groin']::text[], 'none', false),
  ('doorway-pec-stretch', array['shoulder']::text[], 'none', false),
  ('foam-roller-thoracic-extension', array['trunk', 'shoulder']::text[], 'none', false),
  ('half-kneeling-hip-flexor-rock', array['hip-groin']::text[], 'none', false),
  ('hamstring-scoop', array['hamstring']::text[], 'none', false),
  ('hip-cradle', array['hip-groin']::text[], 'none', false),
  ('inchworm', array['hamstring', 'shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('kneeling-thoracic-extension', array['trunk', 'shoulder']::text[], 'none', false),
  ('seated-banded-hip-internal-rotation', array['hip-groin']::text[], 'none', false),
  ('standing-calf-stretch', array['calf-achilles', 'ankle-foot']::text[], 'none', false),
  ('standing-hip-circle', array['hip-groin']::text[], 'none', false),
  ('supine-strap-hamstring-stretch', array['hamstring']::text[], 'none', true),
  ('band-face-pull', array['shoulder']::text[], 'none', false),
  ('half-kneeling-single-arm-cable-row', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', true),
  ('inverted-row', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', true),
  ('seated-band-row', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('trx-row', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('cable-straight-arm-pulldown', array['shoulder']::text[], 'none', false),
  ('dead-hang', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('half-kneeling-single-arm-lat-pulldown', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('machine-assisted-pull-up', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('seated-band-lat-pulldown', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('strict-pull-up', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('cable-chest-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('incline-push-up', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('machine-incline-chest-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('push-up', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('dip', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('dumbbell-push-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('half-kneeling-bottoms-up-kettlebell-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', true),
  ('landmine-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('seated-dumbbell-overhead-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', true),
  ('single-arm-landmine-push-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', true),
  ('standing-dumbbell-overhead-press', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false),
  ('cable-wood-chop', array['trunk', 'low-back']::text[], 'none', true),
  ('half-kneeling-cable-thoracic-rotation', array['trunk']::text[], 'none', false),
  ('half-kneeling-cable-wood-chop', array['trunk', 'low-back']::text[], 'none', false),
  ('russian-twist', array['trunk', 'low-back']::text[], 'none', false),
  ('cossack-squat', array['hip-groin', 'knee', 'ankle-foot']::text[], 'none', false),
  ('dumbbell-lateral-lunge', array['hip-groin', 'knee']::text[], 'none', true),
  ('dumbbell-walking-lunge', array['knee', 'hip-groin']::text[], 'none', false),
  ('lateral-box-step-up', array['knee', 'hip-groin']::text[], 'none', false),
  ('marching-step-up', array['knee', 'hip-groin']::text[], 'none', false),
  ('single-leg-machine-leg-press', array['knee', 'hip-groin']::text[], 'none', false),
  ('split-squat', array['knee', 'hip-groin']::text[], 'none', false),
  ('forward-skip', array['ankle-foot', 'calf-achilles', 'hip-groin']::text[], 'running', false),
  ('walking-high-knee-march', array['hip-groin', 'ankle-foot']::text[], 'none', false),
  ('box-squat', array['knee', 'hip-groin']::text[], 'none', false),
  ('heels-elevated-goblet-squat', array['knee', 'hip-groin']::text[], 'none', false),
  ('medicine-ball-chest-pass', array['shoulder', 'elbow-forearm-wrist']::text[], 'none', false)
  ) v(id, loads, impact, from_course)
 where x.id = v.id and x.impact is null;
commit;
