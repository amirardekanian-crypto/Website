-- stage42 — the muscle map: every approved exercise tells the phone which muscles it works (2026-09-26)
--
-- Amir, 2026-09-26: the "Body parts involved" pills in the About sheet become a front-and-back body
-- with the worked muscles lit ("this is amazing, lets build ... if you need more details from
-- exercises, add them to the exercises, and wherever a new exercise is added to the Spine, ask for
-- the detail as well").
--
-- What the phone shows, per exercise, is ONE map {muscle: 1 | 0.5}: 1 = the main muscle (full clay),
-- 0.5 = a helper (soft clay). It comes from:
--   1. exercise_coach.credits (stage39), when they name any muscle. They are the volume count, and
--      they are also exactly "what this works": bench press = chest 1, triceps 0.5, shoulder 0.5.
--   2. exercises.muscles (NEW, below), when the credits are {} = "counts toward no volume": a
--      stretch, a jump, a sprint, a ride. Those still work muscles; the athlete should see which.
--      This field is DISPLAY ONLY: no checker reads it, so no volume table ever moves because of it.
--   3. Neither: the app falls back to the body parts (loads), as before.
--
-- The credits stay on the coach-only table. get_exercises() sends the muscle names and 1/0.5 only,
-- never cost, SFR or the restriction flags. Amir agreed to that on 2026-09-26.
--
-- The muscle list is the stage39 list, so spine_credits_ok() checks both columns. ⚠ It now exists
-- SIX times: spine_credits_ok() (stage39), SPINE_MUSCLES in coach.html, MUSCLES in
-- scripts/check_program.py, MUSCLES in .claude/skills/spine/draft_sql.py, and in program.html both
-- MAP_MUSCLE (the names the athlete reads) and the body drawing's data-g groups (BODYMAP). Change all.

alter table public.exercises add column if not exists muscles jsonb;
alter table public.exercises drop constraint if exists exercises_muscles_ok;
alter table public.exercises add constraint exercises_muscles_ok check (public.spine_credits_ok(muscles));
comment on column public.exercises.muscles is
  'Display only (stage42): muscle -> 1 main | 0.5 helper, for an entry whose credits are {} (counts toward no volume). The muscle map shows credits when they name a muscle, else this, else the body parts.';

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
           'easier', e.easier, 'harder', e.harder, 'alts', e.alts, 'video', e.video,
           -- stage42: muscle names and 1/0.5 only. Never cost, sfr or flags.
           'muscles', coalesce(nullif(c.credits, '{}'::jsonb), e.muscles)
         ) order by e.name), '[]'::jsonb)
  from public.exercises e
  left join public.exercise_coach c on c.id = e.id
  where e.status = 'approved';
$function$;

-- The 60 approved entries whose credits are {} (2026-09-26): what each one works, for the map only.
update public.exercises x set muscles = v.m::jsonb, updated_at = now()
from (values
  -- mobility
  ('90/90 Hip Stretch', '{"glutes":1,"adductors":0.5}'),
  ('90/90 Hip Switch', '{"glutes":1,"adductors":0.5,"core":0.5}'),
  ('Ankle Dorsiflexion Rocks', '{"calves":1}'),
  ('Band Pass-Through', '{"shoulder":1,"chest":0.5}'),
  ('Cat-Cow', '{"core":1,"back":0.5}'),
  ('Doorway Pec Stretch', '{"chest":1,"shoulder":0.5}'),
  ('Foam Roller Thoracic Extension', '{"back":1}'),
  ('Half-Kneeling Hip Flexor Rock', '{"quads":1,"glutes":0.5}'),
  ('Half-Kneeling Hip Flexor Stretch', '{"quads":1,"glutes":0.5}'),
  ('Hamstring Scoop', '{"hamstrings":1}'),
  ('Hip Cradle', '{"glutes":1,"adductors":0.5}'),
  ('Inchworm', '{"hamstrings":1,"core":0.5,"shoulder":0.5}'),
  ('Kneeling Thoracic Extension', '{"back":1,"shoulder":0.5}'),
  ('Leg Swings', '{"hamstrings":1,"adductors":0.5}'),
  ('Open Book', '{"back":1,"chest":0.5}'),
  ('Quadruped Thoracic Rotation', '{"back":1,"core":0.5}'),
  ('Scapular Wall Slide', '{"shoulder":1,"back":0.5}'),
  ('Seated Banded Hip Internal Rotation', '{"glutes":1}'),
  ('Spiderman Lunge with Reach', '{"adductors":1,"quads":0.5,"back":0.5}'),
  ('Squat to Stand', '{"hamstrings":1,"adductors":0.5}'),
  ('Standing Calf Stretch', '{"calves":1}'),
  ('Standing Hip Circle', '{"glutes":1,"adductors":0.5}'),
  ('Supine Strap Hamstring Stretch', '{"hamstrings":1}'),
  ('World''s Greatest Stretch', '{"adductors":1,"hamstrings":0.5,"back":0.5}'),
  -- jump and land
  ('Box Jump', '{"quads":1,"glutes":1,"calves":0.5}'),
  ('Broad Jump', '{"glutes":1,"quads":1,"hamstrings":0.5,"calves":0.5}'),
  ('Jump Rope', '{"calves":1,"shins":0.5}'),
  ('Lateral Bound', '{"glutes":1,"quads":1,"adductors":0.5,"calves":0.5}'),
  ('Lateral Line Hop', '{"calves":1,"peroneals":0.5}'),
  ('Low Box Rebound Jump', '{"calves":1,"quads":0.5}'),
  ('Pogo Jump', '{"calves":1,"shins":0.5}'),
  ('Single-Leg Box Jump', '{"quads":1,"glutes":1,"calves":0.5}'),
  ('Single-Leg Lateral Hop', '{"calves":1,"glutes":0.5,"peroneals":0.5}'),
  ('Snap Down', '{"quads":1,"glutes":0.5,"hamstrings":0.5}'),
  ('Squat Jump', '{"quads":1,"glutes":1,"calves":0.5}'),
  -- conditioning
  ('Arm Bike', '{"shoulder":1,"triceps":0.5,"biceps":0.5}'),
  ('Assault Bike', '{"quads":1,"glutes":0.5,"shoulder":0.5}'),
  ('Easy Run', '{"calves":1,"quads":0.5,"hamstrings":0.5}'),
  ('Incline Treadmill Push', '{"quads":1,"glutes":0.5,"calves":0.5}'),
  ('Incline Treadmill Walk', '{"glutes":1,"calves":1,"hamstrings":0.5}'),
  ('March in Place', '{"quads":0.5,"calves":0.5,"core":0.5}'),
  ('Rowing', '{"back":1,"quads":1,"glutes":0.5,"biceps":0.5}'),
  ('Sled Push', '{"quads":1,"glutes":1,"calves":0.5}'),
  ('Stationary Bike', '{"quads":1,"glutes":0.5}'),
  ('Walk', '{"calves":0.5,"glutes":0.5}'),
  -- sprint and change of direction
  ('Build-Up Run', '{"hamstrings":1,"calves":1,"glutes":0.5}'),
  ('Crossover Start', '{"glutes":1,"quads":1,"adductors":0.5,"calves":0.5}'),
  ('Forward Skip', '{"calves":1,"hamstrings":0.5}'),
  ('Jog-In Two-Step Stop', '{"quads":1,"glutes":0.5}'),
  ('Lateral Shuffle', '{"glutes":1,"adductors":0.5,"quads":0.5}'),
  ('Reaction Start', '{"quads":1,"glutes":1,"calves":0.5}'),
  ('Split-Step to Sprint', '{"calves":1,"quads":1,"hamstrings":0.5}'),
  ('Sprint to Two-Step Stop', '{"quads":1,"glutes":0.5,"hamstrings":0.5}'),
  ('Walking High-Knee March', '{"quads":0.5,"calves":0.5,"core":0.5}'),
  -- the rest
  ('Dowel Hip Hinge', '{"hamstrings":1,"glutes":0.5}'),
  ('Wall Hip Hinge', '{"hamstrings":1,"glutes":0.5}'),
  ('Serratus Wall Slide', '{"shoulder":1,"back":0.5}'),
  ('Scapular Push-Up', '{"shoulder":1,"chest":0.5}'),
  ('Single-Leg Balance', '{"calves":1,"peroneals":1,"glutes":0.5}'),
  ('Medicine Ball Chest Pass', '{"chest":1,"triceps":0.5,"shoulder":0.5}')
) v(name, m)
where x.name = v.name;

-- After this, every approved entry lights at least one muscle:
--   select e.name from exercises e left join exercise_coach c on c.id = e.id
--   where e.status = 'approved' and coalesce(nullif(c.credits, '{}'::jsonb), e.muscles) is null;   -- 0 rows
