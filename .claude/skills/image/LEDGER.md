# Ledger: what pictures exist, what they show, where they came from

Read this **before** generating (it is Step 0 of `SKILL.md`). Search it with
`python .claude/skills/image/tools/shelf.py find <word> [word ...]` (matches file names, slots and this file),
and look at the whole shelf with `python .claude/skills/image/tools/shelf.py`. Update this file when a round ships.

Picture names are deliberately poetic (`armour`, `the-row`), so **search by what the picture shows**, using the tables below.


## 1. Course app: `assets/tps/` (40 files, 1.1 MB, shown at `/tennis/app/`)

Subject on the LEFT, right and bottom calm, faces away. Every lesson and test has a cover. `[mirrored]` = a program.html still flipped by `FLIPPED` in `scripts/grade_tps_art.py`; `[= X]` = the same picture as program.html's X.

| file | slot | shows |
|---|---|---|
| `against-the-wall` | test:height | dark green-grey wall, a steel ruler hanging beside a pencil line, a hardback book and an orange pencil on the floor |
| `armour` | lesson:robustness | orange tape roll beside a folded knee sleeve on a dark bench [= cycles/armour] |
| `before-and-after` | lesson:fuel-training | wooden bench: a pomegranate, a bowl of dates, flatbread and a glass of water |
| `braking-mark` | lesson:speed-braking | a shoe slide mark ending in a ridge of piled red clay at a white line, low sun |
| `chalk-bowl` | test:jump-and-reach | a bowl of white chalk dust on a dark floor [mirrored, = library/sessions-strength] |
| `clock-and-chalk` | lesson:read-your-card | a stopwatch and a chalk block on a dark towel on a bench by a rack |
| `court-room` | place:court | a ball basket and a speed ladder on clay (session card, court sessions) |
| `door-frame` | lesson:growth | pale wall and a door frame with height marks, a racket leaning against it |
| `first-light` | block:1 | a lifter's hands on a loaded bar in a dawn gym, face out of frame |
| `first-turn` | lesson:warmup-ramp | a coiled skipping rope on dusty ground [= cycles/engine] |
| `five-points` | test:spider-drill | top-down red clay: five balls on the court lines with slide arcs between them |
| `five-signs` | lesson:ready-level-3 | a clipboard and pencil on a dark table by a window [mirrored, = library/read-for-coaches] |
| `from-the-chair` | lesson:parents-guide | a wooden chair with a towel over it, on clay [mirrored, = library/read-mental] |
| `full-acceleration` | block:3 | a shoe driving off red clay, dust in the air (sprint start) |
| `gym-room` | place:gym | weight plates leaning on a rack, a chalk bucket (session card, gym sessions) |
| `home-room` | place:home | a living-room corner: yoga mat, an orange bottle, a lamp (session card, home sessions) |
| `ice-and-clay` | lesson:recovery-adaptation | a steaming ice-bath tub with a clay pot [mirrored, = days/recovery] |
| `ice-and-tape` | lesson:pain-red-flags | a blue ice bag and an orange tape roll on a courtside bench (the set's one non-clay accent) |
| `impact` | lesson:jumps-power | a medicine ball hitting a concrete wall in a burst of orange dust [= cycles/voltage] |
| `iron-pair` | lesson:why-strength | two kettlebells by a window [mirrored, = days/fullbody] |
| `last-ball` | done:* | a clay-dusted tennis ball on a white line, low sun (session-complete screen) |
| `lights-out` | lesson:sleep-recovery | a bed with a rust-red blanket and window light [mirrored, = library/read-recovery] |
| `match-day-box` | lesson:fuel-competition | a lunch box of rice, chicken, cucumber, pomegranate and dates inside an open racket bag, a water bottle |
| `morning-load` | block:2 | a lifter at a loaded barbell in a gym, legs and hands only |
| `rally-map` | lesson:tennis-demands | top-down red clay with two white lines and scuffed rally marks |
| `steam` | lesson:hydration-heat | a wooden bucket and ladle, steaming [mirrored, = library/sessions-recovery] |
| `still-by-the-door` | lesson:missed-sessions | a rainy window and door, a gym bag and trainers waiting on the mat |
| `tennis-fitness` | lesson:tennis-fitness | a water bottle, an orange towel and a heart-rate chest strap on a dark bench (the program.html session's set) |
| `test-day` | testday:* | a tape measure, stopwatch, tape roll and two cones on a dark floor (weeks 4, 8, 12, 16) |
| `the-bag` | lesson:tennis-tournaments | rackets in a tennis bag on a bench beside clay [mirrored, = library/read-pre-competition] |
| `the-coin` | test:broad-jump | a silver coin at the end of a tape measure on a firm floor beside a court line |
| `the-heavy-set` | test:strength-check | a hex bar on a dark floor [mirrored, = days/lower] |
| `the-lane` | test:yo-yo-ir1 | two orange cones in a night sports hall, a phone glowing green on the floor |
| `the-row` | lesson:strength | a row of dumbbells receding into shadow [= cycles/build] |
| `the-split-second` | lesson:agility-reaction | a clay-dusted tennis ball in mid-air, clay falling beneath it |
| `twenty-metres` | test:sprint-20m | a near orange cone with a stopwatch on clay, a second cone far down the court, tree line |
| `under-covers` | locked:* | a green tarp folded back at one corner over a clay court (every locked page) |
| `under-lights` | block:4 | a player seen from behind on a floodlit court at dusk, racket in hand |
| `walk-on` | sign-in (index.html) | a player walking away along a floodlit clay court, 4:3 |
| `which-one` | lesson:rpe-weights | three weight plates leaning on a wall, one of them orange |

## 2. program.html: `assets/art/` (38 files, subject on the RIGHT, no people at all)

Keyed by family or category, not by name (`IMAGES.md` section 0). Search here before generating a still life: a subject may already exist and only need mirroring.

| file (`-v1.webp`) | shows |
|---|---|
| `cycles/armour` | orange tape roll and a folded knee sleeve on a dark bench |
| `cycles/bedrock` | a weight plate lying on dusted clay |
| `cycles/brakes` | a long slide mark carved in red clay |
| `cycles/build` | a row of dumbbells receding into shadow |
| `cycles/engine` | a coiled skipping rope on dusty ground |
| `cycles/iron` | a barbell in a rack, low angle, warm orange wall |
| `cycles/peak` | one ball far off on a clay court line |
| `cycles/reset` | a rolled mat with an orange towel on a dark floor |
| `cycles/spring` | a clay-dusted tennis ball bursting with dust |
| `cycles/voltage` | a medicine ball slamming a wall in an orange dust burst |
| `days/conditioning` | a sled with drag tracks on a dark floor |
| `days/core` | a suspension-trainer handle hanging in a rack |
| `days/default` | wall bars in warm side light |
| `days/fullbody` | two kettlebells by a window |
| `days/lower` | a hex bar on a dark floor |
| `days/power` | a wooden plyo box |
| `days/recovery` | a steaming ice-bath tub with a clay pot |
| `days/upper` | gymnastic rings |
| `moments/finish-1` | a dark gym doorway with dust in the light (session complete) |
| `moments/finish-2` | a steel water bottle on a bench by weights (session complete) |
| `moments/finish-3` | a lifting belt on the floor (session complete) |
| `moments/pr-1` | a stack of plates by a wall (new best) |
| `moments/pr-2` | a hand gripper with an orange grip (new best) |
| `moments/pr-3` | a rack upright with a pull-up bar (new best) |
| `moments/welcome` | a dark doorway with light spilling in, 1:1 |
| `library/read-for-coaches` | a clipboard and pencil |
| `library/read-mental` | a wooden chair with a towel on clay |
| `library/read-nutrition` | a halved lemon and a knife on a board |
| `library/read-pre-competition` | rackets in a bag on a bench beside clay |
| `library/read-recovery` | a bed with a rust-red blanket |
| `library/read-supplements` | a scoop of white powder |
| `library/sessions-breath` | a stopwatch on a dark towel |
| `library/sessions-care` | a small red ball (self-massage) on a dark floor |
| `library/sessions-conditioning` | stadium steps in raking light |
| `library/sessions-mobility` | orange resistance bands on a mat |
| `library/sessions-on-court` | a basket of tennis balls at the net |
| `library/sessions-recovery` | a wooden bucket and ladle, steaming |
| `library/sessions-strength` | a bowl of white chalk |

## 3. Bench: parked alternates in `.claude/skills/image/bench/` (11 files, 219 KB)

Made by the program.html session on 2026-09-20 for the same twelve course slots and graded through `scripts/grade_tps_art.py`, so they are ship-ready 1080 px 16:9 WebPs with the subject on the left. **Not served on the site.** To use one, copy it into `assets/tps/` under a real name and add an `ART` entry. `python .claude/skills/image/tools/shelf.py bench` shows them.

| file | shows |
|---|---|
| `alt-agility-reaction` | an orange agility ladder on a dark court (on topic; the ball cover won on mood) |
| `alt-fuel-competition` | a courtside bench: water bottle, orange towel, a snack, net behind |
| `alt-fuel-training` | a glass of water, a bowl of dates and flatbread on a dark table by a window |
| `alt-growth` | adult and child trainers side by side on a dusty wooden step by a window |
| `alt-height` | a wooden ruler leaning on a dark wall beside a pair of shoes |
| `alt-missed-sessions` | a rolled mat and an orange band in a dark corner |
| `alt-pain-red-flags` | a white tape roll, scissors and orange bands on a dark bench (the palette-pure alternative to the blue ice bag) |
| `alt-speed-braking` | a worn shoe on a green-grey court with a curved slide mark |
| `alt-spider-drill` | tennis balls in a row on clay (wrong geometry for the spider drill; fine as a generic clay-court picture) |
| `alt-sprint-20m` | one orange cone on a dark court, a second far away |
| `alt-yo-yo-ir1` | a dark hall floor with orange tape lines |

## 4. Higgsfield account: the course covers of 2026-09-20 (`gpt_image_2_5`, flare, medium, 1k, 16:9)

36 candidates, three per slot from one prompt each, plus a three-image reroll of the height slot. Every candidate is still in the Higgsfield account (`show_generations` / `show_generation_by_ids` with the job ids below), and the result URLs still downloaded an hour later, so an unused one can be re-fetched instead of regenerated. `A`, `B`, `C` are the first, second and third candidate of a slot (batch index `s`, `100+s`, `200+s`).

| slot | id | shipped as | A | B | C |
|---|---|---|---|---|---|
| 0 | test `sprint-20m` | `twenty-metres` | `07896a88-5ac3-4c9d-91ba-d99054319951` **shipped** | `c9e84071-b772-4927-a7a9-166e677a61ef` | `180096e8-2ef8-49f4-b24f-6383394afb6f` |
| 1 | test `spider-drill` | `five-points` | `184f1774-c6dd-48e7-92f9-94d56f4c45c3` | `0c2fd6ba-7425-4c9e-b6c9-cf001dfa79fa` | `5aa59102-f741-4b89-a5d4-6b8d6b1101c5` **shipped** |
| 2 | test `yo-yo-ir1` | `the-lane` | `317408f0-3561-4245-9431-0999e9c51a46` | `f7d7bd79-10ca-4080-aa48-751bc4430aa1` **shipped** | `fe537810-c75c-4ad6-9d2d-69b473dbdec1` |
| 3 | test `height` | `against-the-wall` | `8fda3656-2922-4e6b-a469-0b6708a7abb1` | `028f9111-9df2-452a-8e3a-7b4f9c545414` | `fbf3a81b-cbfa-4195-a9b4-14a92a64ec0f` |
| 4 | lesson `speed-braking` | `braking-mark` | `5fe2c5b6-7b93-49b1-9e9a-9f7733689310` | `2b955b9b-fa34-49a8-b23c-60ea6c966176` | `e854c2ad-1abb-43d8-be4e-0c8dbb3afee6` **shipped** |
| 5 | lesson `agility-reaction` | `the-split-second` | `c09fa11c-61e6-4b7e-84e8-4f8a5c03208c` | `25af83b9-b1c9-42e1-8e2b-f44bd9f9b8a2` **shipped** | `c7b18baf-d2ff-49de-a805-07d3e672732a` |
| 6 | lesson `tennis-fitness` | `(none, see note)` | `a5af8391-4d86-4a7e-a8c6-95ac76bfd78a` | `53602fdc-4daa-46a2-9a2e-d743240870cf` | `a6e95796-6ea1-4dec-b524-5e5ad57a6a9d` |
| 7 | lesson `growth` | `door-frame` | `7a325aec-053a-457d-85f0-1141eda2a946` **shipped** | `a7822e9e-496d-4a28-8b0a-d7932f88598b` | `11e0541d-3aeb-413b-bea2-54651518ba81` |
| 8 | lesson `pain-red-flags` | `ice-and-tape` | `e58f6dad-0a50-4b4f-9d37-8f59a8246bec` | `0599585b-b724-447b-ace3-4f2804e54573` | `381a980a-050d-47c2-8db7-579235fa2a2a` **shipped** |
| 9 | lesson `missed-sessions` | `still-by-the-door` | `3838e4b9-fa36-4153-a110-bd62a930ce25` **shipped** | `7793354d-bac9-4cc0-b735-9269d3c99dcf` | `4cfb85cd-253d-4503-b8b4-ce976aeb32d8` |
| 10 | lesson `fuel-training` | `before-and-after` | `e590d92f-1fd0-4e69-a7df-ac061f20e60e` **shipped** | `ebc5c7a8-5d2b-42a0-89a2-f269d3918699` | `2f853bfb-de5b-421b-b14f-2a78c637d645` |
| 11 | lesson `fuel-competition` | `match-day-box` | `0a6fd347-4442-4332-8bff-0c2e3a01a88a` **shipped** | `7b6aeb5b-308e-45f3-919b-174a9a3ed715` | `cbdf3b00-69e5-4b9c-b0ab-ff943b07d131` |

**Height reroll** (the darker prompt in section 5): `7ffac6e9-a843-4723-a588-d3ca564186ea` **shipped**, `8af47a01-f1e3-4270-97ae-acc4e05e275c`, `7bb340f8-35a4-4f92-9687-41680da00b22`.

**Slot 6, tennis-fitness:** none of the three shipped. All three were the same bench, towel and orange bottle on clay, a near-twin of the live `from-the-chair`. The program.html session's bottle, towel and heart-rate-strap cover shipped instead.

## 5. The prompts that produced the shipped covers

Every prompt ends with the same two lines: `Colour: muted saturation, fine film grain. <ONE clay-orange prop> is the only strong colour. No yellow, no gold.` and `Avoid: <what could go wrong for THIS subject>, text, logos, watermark, people.` The text below is verbatim from the run. Copy the shape, not the subject.

### twenty-metres (test sprint-20m)
```
Cinematic editorial photograph, landscape 16:9, camera low at ground level.

Scene: an outdoor clay tennis court in flat late light. A terracotta-orange cone stands close to the camera, sharply in focus. A second identical cone stands far away down the court, small and soft in the distance. A stopwatch lies on the clay beside the near cone. Nobody in frame, no footprints between them.

Composition: the near cone and stopwatch sit in the left third. The right half and the bottom third stay calm, empty clay.

Colour: muted saturation, fine film grain. The clay and the cones are the only strong colours. No yellow, no gold.

Avoid: readable numbers on the stopwatch, people, text, logos, watermark.
```
### five-points (test spider-drill)
```
Cinematic editorial photograph, landscape 16:9, shot from high above looking down at a steep angle.

Scene: half of a red clay tennis court. Five tennis balls, worn and dusted with clay, rest on the white lines, spread apart around the court. Scuffed slide marks fan out across the clay between them, as if someone has run to each one and back. Late low sun rakes across the surface. Nobody in frame.

Composition: the balls and the busiest marks gather in the left half. The right half and the bottom third stay calm, open clay.

Colour: muted saturation, fine film grain. The balls are dusted red-orange, never bright tennis yellow. No yellow, no gold.

Avoid: people, rackets, text, logos, watermark.
```
### the-lane (test yo-yo-ir1)
```
Cinematic editorial photograph, landscape 16:9, camera low at ground level.

Scene: an indoor sports hall at night, empty. Three terracotta-orange cones stand in a straight line running away from the camera, two close together and the third far off in the distance, marking out a running lane. A phone lies face up on the floor beside the nearest cone, its screen a soft green glow with nothing readable on it. Nobody in frame.

Composition: the near cones and the phone sit in the left third. The right half and the bottom third stay dark, empty floor.

Colour: muted saturation, fine film grain. The cones are the only strong colour. No yellow, no gold.

Avoid: anything readable on the phone screen, people, text, logos, watermark.
```
### braking-mark (lesson speed-braking)
```
Cinematic editorial photograph, landscape 16:9, camera low and close to the ground.

Scene: a single long shoe slide mark carved into red clay, ending in a small ridge of piled clay right at a crisp white court line. Loose clay is scattered where the foot finally stopped. Late low sun rakes across it. Nobody in frame.

Composition: the end of the slide mark and the piled clay sit in the left third. The right half and the bottom third stay calm, undisturbed clay.

Colour: muted saturation, fine film grain. The clay is the only strong colour. No yellow, no gold.

Avoid: people, shoes, rackets, balls, text, logos, watermark.
```
### the-split-second (lesson agility-reaction)
```
Cinematic editorial photograph, landscape 16:9, camera at ground level.

Scene: a tennis ball, worn and dusted with clay, frozen in mid-air just after its first bounce on a clay court, a small burst of clay dust hanging beneath it and a sharp shadow directly below. Everything is caught at high shutter speed. Nobody in frame.

Composition: the ball and its dust sit in the left third. The right half and the bottom third stay calm, empty clay.

Colour: muted saturation, fine film grain. The ball is dusted red-orange, never bright tennis yellow. No yellow, no gold.

Avoid: people, rackets, a second ball, text, logos, watermark.
```
### door-frame (lesson growth)
```
Cinematic editorial still-life photograph, landscape 16:9.

Scene: a painted wooden door frame in a home, with a row of short pencil marks climbing it, one above another, the highest ones clearly further apart than the lower ones. A junior tennis racket leans against the wall beneath them. Soft afternoon light from a window. Nobody in frame.

Composition: the door frame and marks sit in the left third. The right half and the bottom third stay plain, calm wall.

Colour: muted saturation, fine film grain. A terracotta-orange pencil resting on the skirting board is the only strong colour. No yellow, no gold.

Avoid: dates, numbers, names or any writing beside the marks, people, logos, watermark.
```
### ice-and-tape (lesson pain-red-flags)
```
Cinematic editorial still-life photograph, landscape 16:9.

Scene: a plain ice pack and a roll of athletic tape sit together on a wooden courtside bench, with a small pool of melted water gathering under the ice pack. Soft, even, slightly cool daylight. Nobody in frame.

Composition: the ice pack and tape sit in the left third. The right half and the bottom third stay calm, empty bench and dark ground.

Colour: muted saturation, fine film grain. The tape roll is terracotta orange and is the only strong colour. No yellow, no gold.

Avoid: blood, injuries, bandaged limbs, anything alarming, people, text, logos, watermark.
```
### still-by-the-door (lesson missed-sessions)
```
Cinematic editorial photograph, landscape 16:9.

Scene: a pair of training shoes and a racket bag wait by a front door inside a home, untouched, with a light film of dust on the shoes. Through the window beside the door, rain is running down the glass and the sky is grey. Soft, flat daylight. Nobody in frame.

Composition: the shoes and bag sit in the left third. The right half and the bottom third stay dark, calm floor and door.

Colour: muted saturation, fine film grain. A terracotta-orange doormat is the only strong colour. No yellow, no gold.

Avoid: people, a calendar, text, logos, watermark.
```
### before-and-after (lesson fuel-training)
```
Cinematic editorial still-life photograph, landscape 16:9.

Scene: simple everyday food set out on a wooden courtside bench before training: a few dates in a small bowl, a whole pomegranate, a piece of flatbread and a glass of water. Plain and unstyled, like something brought from home. Soft morning light from one side. Nobody in frame.

Composition: the food sits in the left third. The right half and the bottom third stay calm, empty bench and dark ground.

Colour: muted saturation, fine film grain. The dates, the pomegranate and the bench keep warm brown and terracotta tones, and nothing else is strongly coloured. No yellow, no gold.

Avoid: packaging, supplement tubs, branded bottles, text, logos, watermark, people.
```
### match-day-box (lesson fuel-competition)
```
Cinematic editorial still-life photograph, landscape 16:9.

Scene: an open lunch box packed for a day of matches, sitting inside an open tennis bag: rice and chicken in one compartment, sliced cucumber, a whole pomegranate and a few dates in the other. A large water bottle stands beside it. Plain home food, unstyled. Soft early morning light. Nobody in frame.

Composition: the lunch box sits in the left third. The right half and the bottom third stay dark, calm bag and floor.

Colour: muted saturation, fine film grain. A terracotta-orange lid on the water bottle is the only strong colour. No yellow, no gold.

Avoid: packaging, branded wrappers, energy gels, text, logos, watermark, people.
```
### against-the-wall (test height): the REROLL that shipped
The first prompt (a plain white wall in soft window light) came back flat and bright (mean luminance 0.68), and darkening it only made it dull. Re-prompting the LIGHT fixed it:
```
Cinematic editorial still-life photograph, landscape 16:9, moody low-key lighting.

Scene: a deep green-grey painted wall lit by a single low window light that throws a soft diagonal shaft across it. A short, sharp pencil line is drawn across the wall at about head height. Directly beneath it a steel tape measure with a plain silver-grey blade hangs down the wall, close to the camera and large in the frame. A hardback book stands upright on the floor at the base of the wall beside a terracotta-orange pencil. Nobody in frame.

Composition: the pencil line, tape and book sit in the left third. The right half and the bottom third stay dark, calm wall and floor.

Colour: muted saturation, fine film grain. The pencil is the only strong colour. No yellow, no gold, including the tape measure.

Avoid: readable numbers on the tape, text, logos, watermark, people.
```

The first, failed version of the height prompt, for contrast:
```
Cinematic editorial still-life photograph, landscape 16:9.

Scene: a plain white wall in soft window light. A single short, sharp pencil line is drawn across the wall at about head height. A steel tape measure with a plain silver-grey blade hangs down the wall from a small nail beside the line. A hardback book rests on the floor at the base of the wall, with a terracotta-orange pencil lying on top of it. Nobody in frame.

Composition: the pencil line, tape and book sit in the left third. The right half and the bottom third stay plain, calm wall and floor.

Colour: muted saturation, fine film grain. The pencil is the only strong colour. No yellow, no gold, including the tape measure.

Avoid: readable numbers on the tape, text, logos, watermark, people.
```
