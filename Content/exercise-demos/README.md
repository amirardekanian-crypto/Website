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

**Status:** step 1 done on 2026-10-04 (after Higgsfield's *"daily generation limit for your grace
period"* refusals lifted: the plan renewed to 600 credits). Results and the two proposed redos are
under the prompts. Step 2 and any redo each need Amir's go.

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

**Results (2026-10-04, 2.5 credits, balance 597.5).** One item first came back `429` (no charge) and went through on resubmit.

| Index | Job id | Verdict |
|---|---|---|
| 41 pec deck | `c6407857-514a-49bb-bf92-fef8e0f11600` | good: believable machine, arms open, slight elbow bend, front view |
| 42 straight-arm pulldown | `091b888d-be66-466b-9b04-1dba912baddd` | good: the cable runs from the high pulley to a short bar; the lean is on the deep side |
| 43 EZ bar curl | `30e122c5-7b4b-428d-b4a1-e4d1fb9f9674` | **wrong**: in side view the bar runs front to back along his side, through where his thigh is. A side view of a bar held across the body is the trap: ask for a front view at a slight angle |
| 44 single-leg RDL | `bd7855a0-7d2a-4749-913e-f585eff8c355` | good: tall on one leg, back foot just off the floor; the far dumbbell is hidden behind him |
| 45 box squat | `f9caa7a8-75a9-4fbf-8b4b-b0ac7dfdf08e` | good, but his head is turned to the camera, which a clip would carry |

Proposed redos (0.5 each, need his go), same opening and closing lines:
- **43**: He stands tall in the middle of the room holding an EZ curl bar (a short zigzag-shaped barbell with one small black plate on each end) with an underhand grip, hands about shoulder-width apart. The bar runs across the front of his thighs from his left hand to his right hand, arms hanging straight, elbows by his sides. Seen from the front at a slight angle. He looks straight ahead, not at the camera.
- **45**: the step 1 middle, plus: His head faces forward, the same way as his body, not toward the camera.

**Redos (2026-10-04, his go, 1 credit):** 143 EZ bar curl `4a2fd27a-0b45-478e-9a82-621a5998b50d` (fixed: front
view at a slight angle, bar across the thighs, underhand grip) · 145 box squat `e1d8b3a8-6513-478c-8606-bc377cb56573`
(fixed: head faces forward). Both good; their clips wait for his OK.

### Step 2: the clips (needs his go)

`wan3_0`, `duration: 2`, `resolution: "480p"`, `generate_audio: false` (it defaults to true),
`enable_thinking: true` (same price), `aspect_ratio: "16:9"`, the start picture's job id as
`start_image`. The prompt describes the movement in plain physical words, built from the entry's Spine
cues, phrased positively ("his elbows keep the same slight bend the whole time", never "don't let the
arms bend"). Each clip is half a rep; played forward then reversed, it loops as a full rep.

Every clip prompt opens with *Static locked-off camera, no camera movement, the same man in the same
plain room as the first frame.* and closes with *Smooth, controlled, realistic movement with natural
physics. The equipment keeps its shape. No text.* The middles:

| Clip | Movement |
|---|---|
| 41 pec deck | Slowly he sweeps both handles forward and together in a wide arc until his hands meet in front of his chest, then holds there for a moment. His elbows keep the same slight bend the whole time, his back stays against the pad and his feet stay flat. |
| 42 straight-arm pulldown | Keeping his arms long and straight, he sweeps the bar down in a smooth arc until it reaches the front of his thighs. Only his arms move, swinging from the shoulders; his hips, knees and torso stay where they are, and the cable stays attached to the bar and the pulley. |
| 43 EZ bar curl | Keeping his elbows pinned at his sides and his body still, he curls the bar up in a smooth arc until it reaches the top of his chest, then holds it there for a moment. Only his forearms move. (As run; "just below his chin" invites the elbows forward.) |
| 44 single-leg RDL | Keeping his standing knee slightly bent, he hinges forward at the hips over his standing leg while his free leg lifts straight behind him, until his body and back leg form one straight line almost parallel to the floor. His hips stay level and the dumbbells hang straight down below his shoulders. |
| 45 box squat | Looking straight ahead, he sits his hips back and down, knees bending, until his glutes lightly touch the top of the box, then holds there. His heels stay flat and his chest stays up. |

**Round 1 results (2026-10-04, his go, 6 credits, balance 590.5).** The batch first came back with preset
recommendations instead of jobs ("IN THE DARK" `24bae836-2c4a-48e0-89b6-49fcc0b21612`, "DROWN IN MUSIC"
`f1821f84-945b-4cd1-9085-1f479db0028e`), no charge; resubmitted with `declined_preset_id`. Each clip: 2.00 s, 854×480,
30 fps, about 1 MB, no audio track. The forward-plus-reversed loop (`-crf 27`, no audio) is **about 110 KB**, so the
whole library would be roughly 20 MB.

| Clip | Job id | Verdict |
|---|---|---|
| 51 pec deck | `183408a5-891a-43fe-8254-cefad77b3183` | partial: the machine holds together, but the elbows bend more as the hands come in (the press his cue warns about) and the hands stop short |
| 52 straight-arm pulldown | `99a9ba65-07d6-4bc3-9278-9de3c3531b78` | partial: cable stays attached and the stack lifts, but the torso straightens up during the pull |
| 54 single-leg RDL | `2a755cae-71af-4033-8d21-26f893538f57` | **good**: flat back, back leg in line, toes down, standing knee soft, dumbbells below the shoulders |

What it says so far: words carry a natural whole-body movement well (the RDL). They slip where one part must stay
still while another moves (the pulldown's torso, the pec deck's elbows). That is what an end picture pins (step 3).

**The tick (Amir, on the round 1 loops):** *"complete concentric, 1/4 eccentric, 1/4 concentric, and then full eccentric,
it had a tick, it must be edited more precise."* The clips go past the end of the movement and come back (the Wan pec
deck's hands meet at frame 43 and open again by 59), so a loop of the whole clip, forward then reversed, plays that
return twice. **`.claude/skills/video/tools/make_loop.py`** now cuts every loop at the real turnaround, found from the
video itself. Its picks, checked by eye: pec deck 43, pulldown 43, EZ bar curl 38, single-leg RDL 58 (he lowers to the
end), Kling pec deck 70 and pulldown 66 (Kling stops and holds rather than coming back). Always use it.

**Round 2 (2026-10-04, his go "its test", 12.5 credits, balance 578).** The preset trap again on all three clips.

| What | Job id | Verdict |
|---|---|---|
| Box squat, AI edit to bring the box in line | `2b1811b4-3910-45ca-96f2-0bab31a59ebd` | **failed**: it slid the box sideways but left it further back (its floor line at y 621, his shoes at 680). Amir had spotted that he would sit down beside it. **Moved by hand instead** (free): the box onto his shoes' floor line, a hand's width behind the heels, about knee height, the old spot painted out. Saved as `start-pictures/box-squat-box-moved.jpg`; upload it as media for its clip |
| Pec deck finish picture | `4683f095-d118-4584-a247-cf6dd2fd4d43` | good: hands together, arms nearly straight (edited from start 41) |
| Pulldown finish picture | `777ea8de-98b1-40ab-995a-559e2773f7d4` | good: bar at the thighs, the same lean as the start (edited from start 42) |
| 53 EZ bar curl, Wan | `9056007c-551f-40ce-822c-9d7b35faf3da` | good: elbows by his sides, body still; went halfway back down by the end, so cut at 38 |
| 61 pec deck, Kling 3.0 std 3 s | `83473be4-ba48-4dce-99c5-835e889eced0` | same fault as Wan: the elbows bend into a press as the hands meet |
| 62 pulldown, Kling 3.0 std 3 s | `dc880e2d-173c-4168-8353-ea5f3b9ebf33` | **better than Wan**: keeps most of the hinge, arms straight to the thighs |

Kling clips come back 3.04 s, 1280×716, 24 fps, 1.8 MB, no audio; loops at `--speed 1.5 --width 854` are 80-85 KB.

**Round 3 (2026-10-04, his "yes, go" on the three pictures, 6 credits, balance 572).** The moved-box picture was uploaded
as media `729944f0-73c0-4a99-a33b-1e1c54bff026`. Passing the `declined_preset_id`s up front avoided the preset round trip.

| What | Job id | Verdict |
|---|---|---|
| 75 box squat, Wan, from the moved-box picture | `48f0b907-1a47-44ed-bfbe-7999337d31e0` | **good**: sits straight back onto the box; touches at frame 37-38, then slumps upright, so the loop is cut at 38 (`--far 38`): touch lightly, stand tall |
| 71 pec deck, Wan, start + finish picture | `99f331f6-2429-4ac7-bced-75b1f3e16288` | **best pec deck**: arms stay long, hands meet; snaps onto the finish picture in frames 57-58 (cut off) |
| 72 pulldown, Wan, start + finish picture | `f783d3a0-2f15-45da-a084-29229fec46ce` | no better than words: the torso still rises, then the last two frames SNAP to the finish picture (hips jump back, the tower moves). `make_loop.py` now cuts before a snap |

**What the test showed (five exercises, 30 credits in all):**
- Whole-body movements (single-leg RDL, box squat, EZ bar curl): **Wan, start picture + words**, 2.5 credits.
- A limb path the words could not hold (pec deck, elbows): **Wan with a finish picture**, 3 credits.
- Holding the torso still while the arms move (straight-arm pulldown): **Kling with words**, 5 credits. A finish picture
  does not help when the model wants a different path; it only snaps at the end.
- Every clip still needs its loop cut by `make_loop.py` and its frames looked at; holds and settles (the box squat)
  need `--far` by hand.

**The five finished loops** are in `loops/`, named by Spine id (74-114 KB each): `dumbbell-single-leg-romanian-deadlift`,
`ez-bar-curl`, `box-squat`, `machine-pec-deck` (Wan pinned), `cable-straight-arm-pulldown` (Kling). Not wired into the
app: that needs the player change and Amir's OK.

Prices checked 2026-10-04 with `get_cost` (re-check, they change): picture 0.5 · Wan 3.0 480p 2 s = 2
(words only, from a start picture, or between a start and an end picture) · Wan 3.0 3 s with a video
reference = 3 · Genjutsu motion copy 480p = 12 · Kling 3.0 std 3 s = 4.5.

## Why pictures and not words alone

Video models learned from clips with plain captions, so they know common exercises by name but not
coaching detail; long descriptions are mostly ignored, and naming a fault ("don't rotate") can add it.
With words alone the model also has to invent the machine. A start picture settles the athlete, the
room, the equipment and where the rep starts, so the words only have to carry the movement.
