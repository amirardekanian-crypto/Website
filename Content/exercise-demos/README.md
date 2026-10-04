# Exercise demos: our own library (started 2026-10-04)

Short silent loops of every Spine exercise, made to replace the YouTube links (163 of 225 entries had
one on 2026-10-04, from 59 different channels; 62 had none). `Content/` is excluded from the site, so
nothing here is served.

## What Amir decided (2026-10-04)

- **He films himself**: tennis footwork, sprints, throws, jumps. Phone on a tripod, landscape, side-on,
  wide enough to stay in frame, plain background, 2-3 reps, no talking. Raw files come to Claude, who
  cuts one clean rep each, loops and compresses it (no credits).
- **AI makes the gym exercises**: machines, cables, barbells, dumbbells, bodyweight (about 188 entries).
- **2-3 s, very simple, silent.** "The quality and the athlete doesn't matter": the movement does.
- **One made-up athlete and one very simple gym**, then every exercise's start picture is made from
  those two, so the AI spends nothing on the person or the room.
- **Hosting**: his own site (Aparat was also fine with him). A silent loop needs no player, and the site
  opens in Iran without a VPN (reach test, 2026-10-04) where YouTube does not. ⚠️ Not built: the app
  only plays YouTube inside the card (`loadInlineVideo()` in `program.html`), so a loop needs one small
  app change first, with Amir's OK.

## The look (made 2026-10-04, `gpt_image_2_5`, flare, medium, 1k, 0.5 credit each)

| Role | Job id (pass it as `medias[].value`, role `image_references`) | Verdict |
|---|---|---|
| **Athlete** (2:3) | `ba2ccf47-a54c-44bb-a33a-3197e2c4e490` | **picked**: man, plain dark t-shirt and shorts, black trainers, light-grey background; a faint black-on-black stripe on the shoes, invisible at app size |
| Gym A (16:9) | `ae0919f2-42b5-4a04-aa1f-138dcb10c1aa` | spare: grey wall, dark rubber floor, nothing else |
| **Gym B** (16:9) | `bde45629-61bd-49b9-a2a3-28ad24cb7045` | **picked**: the same with a thin skirting line, which tells the AI where the floor is |
| Gym C (16:9) | `d1241b62-8467-4017-abb5-1b38d0013ba9` | not used: tile lines on the floor can wobble when animated |

Prompts and the ledger row: `.claude/skills/image/LEDGER.md` §7.

## The test (approved by Amir, 2026-10-04)

One exercise per type he named, all five with no video today:

| Step | What | Credits |
|---|---|---|
| 1 | Start pictures for the five, from the two picks | 2.5 |
| 2 | A 2 s clip from each start picture, the movement written from the Spine cues | 10 |
| 3 | Only for clips that fail: an end picture and a redo pinned between the two | 2.5 each |
| Optional | Amir's squat recording as the motion source (`video_references`, untried) | 3 |

**Status:** step 1 approved, but Higgsfield refused every submission on 2026-10-04 with *"You've reached
the daily generation limit for your grace period"* (no charge). His plan may be in a payment grace
period. Step 1 is the five prompts below, ready to submit as they are; steps 2 and 3 each need his go.

### Step 1: the start pictures

`generate_image_batch`, each item: `gpt_image_2_5`, `quality: "medium"`, `resolution: "1k"`,
`aspect_ratio: "16:9"`, `use_unlim: false`, medias = athlete then Gym B (both `image_references`).

Every prompt opens with: *Use the man from the first reference picture (same face, short dark hair,
build, plain dark t-shirt, dark shorts, black trainers) and the empty room from the second reference
picture (same plain grey wall, thin skirting line, dark rubber floor, soft even light).*

and closes with: *Static camera at hip height, the whole body and all the equipment inside the frame
with space around them. Realistic photo. No text, no logos, no other people, no mirrors, no yellow.*

| Index | Exercise (Spine id) | The middle of the prompt |
|---|---|---|
| 41 | `machine-pec-deck` | He sits upright on a simple black pec deck machine in the middle of the room, back flat against the padded backrest, feet flat on the floor. His arms are open wide to his sides at shoulder height, elbows slightly bent, each hand holding the vertical handle at the end of the machine's two swinging arms. Seen from the front at a slight angle so both arms are visible. |
| 42 | `cable-straight-arm-pulldown` | He stands side-on to the camera, facing a simple black cable tower with one high pulley near the right edge of the frame. A thin steel cable runs from the pulley down to a short straight metal bar he holds in both hands with an overhand grip. His arms are long and straight, reaching forward and up so the bar is at about head height, hips pushed back slightly, knees soft, back flat. Side view. |
| 43 | `ez-bar-curl` | He stands tall in the middle of the room, side-on to the camera, holding an EZ curl bar (a short zigzag-shaped barbell with one small black plate on each end) with an underhand grip. His arms hang straight down, the bar resting against the front of his thighs, elbows by his sides. Side view. |
| 44 | `dumbbell-single-leg-romanian-deadlift` | He stands tall on his left leg in the middle of the room, side-on to the camera, his right foot just off the floor slightly behind him. He holds a plain black dumbbell in each hand, arms hanging straight down in front of his thighs. Hips square, chest tall, eyes forward. Side view. |
| 45 | `box-squat` | He stands tall in the middle of the room, side-on to the camera, with a plain black box about knee height on the floor just behind him. Feet about shoulder-width apart, toes slightly out, hands lightly clasped in front of his chest. Side view. |

Amir checks the five pictures before any clip is made.

### Step 2: the clips (needs his go)

`wan3_0`, `duration: 2`, `resolution: "480p"`, `generate_audio: false` (it defaults to true),
`enable_thinking: true` (same price), `aspect_ratio: "16:9"`, the start picture's job id as
`start_image`. The prompt describes the movement in plain physical words, built from the entry's Spine
cues, phrased positively ("his elbows keep the same slight bend the whole time", never "don't let the
arms bend"). Each clip is half a rep; played forward then reversed, it loops as a full rep.

Prices checked 2026-10-04 with `get_cost` (re-check, they change): picture 0.5 · Wan 3.0 480p 2 s = 2
(words only, from a start picture, or between a start and an end picture) · Wan 3.0 3 s with a video
reference = 3 · Genjutsu motion copy 480p = 12 · Kling 3.0 std 3 s = 4.5.

## Why pictures and not words alone

Video models learned from clips with plain captions, so they know common exercises by name but not
coaching detail; long descriptions are mostly ignored, and naming a fault ("don't rotate") can add it.
With words alone the model also has to invent the machine. A start picture settles the athlete, the
room, the equipment and where the rep starts, so the words only have to carry the movement.
