-- stage34 — Links by NAME, and the first link pass since stage33 (2026-09-24). PENDING REVIEW.
--
-- Amir: "work on exercise alternatives, progression and regressions, first come up with
-- the exercises, and then when you want to add, if we already have it, link it, if not,
-- just put the name."
--
-- ── What changed in the model ──────────────────────────────────────────────
-- easier / harder / alts on public.exercises (stage31) held entry ids only. From here an
-- item is EITHER an entry id (kebab-case, must exist) OR the plain name of an exercise that
-- has no entry yet ('Nordic Hamstring Curl'). No schema change: they were always text[].
--   program.html  linkList() in openExerciseSheet(): an id is a tappable pill; a name is a
--                 quiet dashed pill with nothing to tap, resolved at READ time through
--                 spineFor(), so it links on its own once an approved entry carries it.
--   coach.html    spineSave(): a typed name that matches an entry is stored as its id; a
--                 new name is kept as a name; an id-shaped string that is not an entry is
--                 refused as a typo.
--   draft_sql.py  refuses an unknown id, accepts a name.
-- Only ids are mirrored both ways; a name has no other side.
--
-- ── The pass ───────────────────────────────────────────────────────────────
-- 1. Backup: every entry's links before this pass, appended to exercise_coach.links_history
--    (coach-only; stage33's links_before keeps the state before the stage33 rewrite).
-- 2. 111 additions on 89 entries, 101 of them plain names. Only ADDED:
--    nothing already linked was changed or removed (an approved entry's existing link is
--    Amir's to change; see the handoff for the ones proposed).
-- 3. Mirror: every id link made two-sided (A.harder has B -> B.easier has A; alts both
--    ways), which also filled the one-sided links already there. Held back to keep a list
--    at four: banded-pull-through on dowel-hip-hinge.
--
-- Undo one entry (puts back its links from before this pass):
--   update public.exercises x
--      set easier = array(select jsonb_array_elements_text(h->'easier')),
--          harder = array(select jsonb_array_elements_text(h->'harder')),
--          alts   = array(select jsonb_array_elements_text(h->'alts'))
--     from public.exercise_coach c, jsonb_array_elements(c.links_history) h
--    where c.id = x.id and h->>'before' = 'claude-links-2026-09-24b' and x.id = '<exercise-id>';
-- Every row this pass touched has updated_by = 'claude-links-2026-09-24b'.

alter table public.exercise_coach add column if not exists links_history jsonb not null default '[]'::jsonb;
  -- [ { before: <pass tag>, saved: timestamptz, easier: [...], harder: [...], alts: [...] }, ... ]

-- 1. Backup (once per pass: safe to re-run)
insert into public.exercise_coach (id, links_history)
select id, jsonb_build_array(jsonb_build_object('before', 'claude-links-2026-09-24b', 'saved', now(),
       'easier', to_jsonb(easier), 'harder', to_jsonb(harder), 'alts', to_jsonb(alts)))
  from public.exercises
on conflict (id) do update set links_history = public.exercise_coach.links_history || excluded.links_history
 where not public.exercise_coach.links_history @> '[{"before": "claude-links-2026-09-24b"}]';

-- 2. Additions (an item already in the list is skipped: safe to re-run)
with add(id, kind, item, ord) as (values
  ('ab-wheel-rollout','easier','Stability Ball Rollout',0),
  ('ab-wheel-rollout','harder','Standing Ab Wheel Rollout',0),
  ('ab-wheel-rollout','alts','Barbell Rollout',0),
  ('dead-bug','easier','Dead Bug Heel Tap',0),
  ('hollow-hold','easier','Tuck Hollow Hold',0),
  ('hollow-hold','harder','Hollow Rock',0),
  ('plank','easier','Kneeling Plank',0),
  ('plank','easier','Incline Plank',1),
  ('v-up','easier','Tuck-Up',0),
  ('copenhagen-plank','harder','Long-Lever Copenhagen Plank',0),
  ('band-pallof-press','harder','Single-Leg Pallof Press',0),
  ('cable-pallof-press','harder','Single-Leg Pallof Press',0),
  ('bear-crawl','easier','Bear Hold',0),
  ('bird-dog','easier','Quadruped Arm Reach',0),
  ('farmers-carry','alts','Trap Bar Carry',0),
  ('easy-run','harder','Tempo Run',0),
  ('incline-treadmill-walk','alts','Stair Climber',0),
  ('back-extension-45','harder','Single-Leg 45° Back Extension',0),
  ('back-extension-45','alts','Stability Ball Back Extension',0),
  ('banded-pull-through','harder','kettlebell-swing',0),
  ('barbell-hip-thrust','harder','single-leg-dumbbell-hip-thrust',0),
  ('barbell-hip-thrust','alts','Smith Machine Hip Thrust',0),
  ('machine-hip-thrust','alts','Smith Machine Hip Thrust',0),
  ('dumbbell-hip-thrust','alts','Smith Machine Hip Thrust',0),
  ('barbell-romanian-deadlift','harder','dumbbell-single-leg-romanian-deadlift',0),
  ('conventional-deadlift','easier','Kettlebell Deadlift',0),
  ('conventional-deadlift','harder','Deficit Deadlift',0),
  ('trap-bar-deadlift','easier','Kettlebell Deadlift',0),
  ('dumbbell-single-leg-romanian-deadlift','easier','Kickstand Romanian Deadlift',0),
  ('kettlebell-swing','harder','Single-Arm Kettlebell Swing',0),
  ('kettlebell-swing','alts','Dumbbell Swing',0),
  ('band-external-rotation','harder','90/90 Band External Rotation',0),
  ('cable-external-rotation','harder','90/90 Cable External Rotation',0),
  ('banded-clamshell','easier','Clamshell',0),
  ('banded-side-lying-hip-abduction','alts','cable-hip-abduction',0),
  ('cable-chest-fly','alts','Dumbbell Chest Fly',0),
  ('machine-pec-deck','alts','Dumbbell Chest Fly',0),
  ('cable-curl','alts','Band Curl',0),
  ('dumbbell-bicep-curl','alts','Band Curl',0),
  ('ez-bar-curl','alts','Band Curl',0),
  ('cable-glute-kickback','easier','Donkey Kick',0),
  ('cable-glute-kickback','alts','Machine Glute Kickback',0),
  ('cable-single-leg-hip-extension','easier','Donkey Kick',0),
  ('cable-single-leg-hip-extension','alts','Machine Glute Kickback',0),
  ('cable-lateral-raise','alts','Machine Lateral Raise',0),
  ('dumbbell-lateral-raise','alts','Machine Lateral Raise',0),
  ('cable-overhead-tricep-extension','alts','Dumbbell Overhead Tricep Extension',0),
  ('cable-tricep-pushdown','alts','Band Tricep Pushdown',0),
  ('dumbbell-hammer-curl','alts','Cable Rope Hammer Curl',0),
  ('dumbbell-wrist-extension','alts','Band Wrist Extension',0),
  ('single-arm-eccentric-wrist-extension','alts','FlexBar Reverse Tyler Twist',0),
  ('hanging-leg-raise','easier','Hanging Knee Raise',0),
  ('hanging-leg-raise','alts','Captain''s Chair Leg Raise',0),
  ('prone-dumbbell-reverse-fly','alts','Cable Reverse Fly',0),
  ('machine-reverse-fly','alts','Cable Reverse Fly',0),
  ('single-leg-calf-raise','easier','Double-Leg Calf Raise',0),
  ('standing-machine-calf-raise','alts','Leg Press Calf Raise',0),
  ('stability-ball-leg-curl','harder','Single-Leg Stability Ball Leg Curl',0),
  ('stability-ball-leg-curl','harder','Nordic Hamstring Curl',1),
  ('stability-ball-leg-curl','alts','Slider Leg Curl',0),
  ('trx-hamstring-curl','harder','Single-Leg TRX Hamstring Curl',0),
  ('trx-hamstring-curl','harder','Nordic Hamstring Curl',1),
  ('tibialis-raise','harder','Tib Bar Raise',0),
  ('broad-jump','harder','Continuous Broad Jump',0),
  ('jump-rope','harder','Single-Leg Jump Rope',0),
  ('lateral-bound','harder','Continuous Lateral Bound',0),
  ('low-box-rebound-jump','harder','Depth Jump',0),
  ('pogo-jump','harder','Single-Leg Pogo',0),
  ('90-90-hip-switch','harder','Hands-Free 90/90 Hip Switch',0),
  ('ankle-dorsiflexion-rocks','alts','Banded Ankle Mobilisation',0),
  ('band-pass-through','alts','Dowel Pass-Through',0),
  ('half-kneeling-hip-flexor-stretch','harder','Couch Stretch',0),
  ('inchworm','harder','Inchworm with Push-Up',0),
  ('open-book','harder','thoracic-windmill',0),
  ('scapular-wall-slide','easier','Floor Slide',0),
  ('scapular-wall-slide','harder','Wall Slide with Lift-Off',0),
  ('spiderman-lunge-with-reach','easier','Spiderman Lunge',0),
  ('spiderman-lunge-with-reach','harder','worlds-greatest-stretch',0),
  ('chest-supported-dumbbell-row','alts','Chest-Supported T-Bar Row',0),
  ('machine-plate-loaded-row','alts','Chest-Supported T-Bar Row',0),
  ('inverted-row','easier','High-Bar Inverted Row',0),
  ('inverted-row','harder','Feet-Elevated Inverted Row',0),
  ('trx-row','harder','Single-Arm TRX Row',0),
  ('single-arm-dumbbell-row','easier','chest-supported-dumbbell-row',0),
  ('cable-straight-arm-pulldown','alts','Band Straight-Arm Pulldown',0),
  ('machine-assisted-pull-up','easier','lat-pulldown',0),
  ('machine-assisted-pull-up','alts','Band-Assisted Pull-Up',0),
  ('strict-pull-up','easier','Band-Assisted Pull-Up',0),
  ('strict-pull-up','easier','Eccentric Pull-Up',1),
  ('strict-pull-up','harder','Weighted Pull-Up',0),
  ('incline-dumbbell-press','alts','Incline Barbell Bench Press',0),
  ('machine-incline-chest-press','alts','Incline Barbell Bench Press',0),
  ('incline-push-up','easier','Wall Push-Up',0),
  ('push-up','harder','Feet-Elevated Push-Up',0),
  ('scapular-push-up','harder','Push-Up Plus',0),
  ('dip','easier','Machine-Assisted Dip',0),
  ('dip','harder','Weighted Dip',0),
  ('standing-dumbbell-overhead-press','alts','Barbell Overhead Press',0),
  ('cable-wood-chop','alts','Band Wood Chop',0),
  ('half-kneeling-cable-thoracic-rotation','alts','Half-Kneeling Band Thoracic Rotation',0),
  ('russian-twist','harder','Feet-Up Russian Twist',0),
  ('cossack-squat','harder','Goblet Cossack Squat',0),
  ('dumbbell-bulgarian-split-squat','alts','Smith Machine Bulgarian Split Squat',0),
  ('lateral-box-step-up','harder','lateral-step-down',0),
  ('split-squat','easier','Supported Split Squat',0),
  ('forward-skip','harder','A-Skip',0),
  ('goblet-squat','harder','heels-elevated-goblet-squat',0),
  ('wall-sit','harder','Single-Leg Wall Sit',0),
  ('medicine-ball-chest-pass','easier','Tall-Kneeling Medicine Ball Chest Pass',0),
  ('medicine-ball-rotational-throw','easier','Half-Kneeling Medicine Ball Rotational Throw',0),
  ('medicine-ball-rotational-throw','harder','Step-Behind Medicine Ball Rotational Throw',0)),
g as (select id,
  array_agg(item order by ord) filter (where kind = 'easier') e,
  array_agg(item order by ord) filter (where kind = 'harder') h,
  array_agg(item order by ord) filter (where kind = 'alts') a
  from add group by id)
update public.exercises x set
  easier = x.easier || coalesce(array(select u from unnest(g.e) with ordinality t(u, o) where not u = any(x.easier) order by o), '{}'),
  harder = x.harder || coalesce(array(select u from unnest(g.h) with ordinality t(u, o) where not u = any(x.harder) order by o), '{}'),
  alts = x.alts || coalesce(array(select u from unnest(g.a) with ordinality t(u, o) where not u = any(x.alts) order by o), '{}'),
  updated_at = now(), updated_by = 'claude-links-2026-09-24b'
from g where g.id = x.id;

-- 3. Mirror id links both ways (safe to re-run)
with l as (
  select x.id src, 'harder' k, t tgt from public.exercises x, unnest(x.harder) t
  union all select x.id, 'easier', t from public.exercises x, unnest(x.easier) t
  union all select x.id, 'alts', t from public.exercises x, unnest(x.alts) t),
need as (
  select l.tgt id, case l.k when 'harder' then 'easier' when 'easier' then 'harder' else 'alts' end k, l.src
    from l join public.exercises y on y.id = l.tgt
   where not l.src = any(case l.k when 'harder' then y.easier when 'easier' then y.harder else y.alts end)
     and not (l.tgt = 'dowel-hip-hinge' and l.src = 'banded-pull-through')),
g as (select id,
  array_agg(src order by src) filter (where k = 'easier') e,
  array_agg(src order by src) filter (where k = 'harder') h,
  array_agg(src order by src) filter (where k = 'alts') a
  from need group by id)
update public.exercises x set
  easier = x.easier || coalesce(g.e, '{}'), harder = x.harder || coalesce(g.h, '{}'), alts = x.alts || coalesce(g.a, '{}'),
  updated_at = now(), updated_by = 'claude-links-2026-09-24b'
from g where g.id = x.id;
