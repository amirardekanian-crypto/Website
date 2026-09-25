---
name: video
description: Generate video clips (footage) for Amir's brand ads with the connected Higgsfield MCP. The craft file the `/ad` skill calls at its prompt stage — for a whole ad (angle, hook, script, shot list, then prompts) start at `/ad`, not here. Covers Amir's spend protocol (show a plan and wait for yes, reuse before generating, sound off, 3 seconds), the start-picture-then-clip pipeline, prompt craft for a locked camera, the price list, judging a clip, trimming, and how a clip goes into a reel. Use whenever Amir asks for footage, a clip, b-roll, a video plate, "real video" in an ad, or to animate a picture. Read it before writing a single prompt.
---

# Generating video clips — AA Performance

> **Making a whole ad? Start at `.claude/skills/ad/SKILL.md`.** It owns the brand, the angle, the
> hook, the Farsi script and the shot list, and reaches this file only at its step 7, for the shots
> that survived the reuse pass. This file is the clip craft and the spend protocol, and both bind there.

Claude generates, downloads, judges and trims clips itself through the Higgsfield MCP (first used
2026-09-20). This file is the protocol, the craft and the price list. It is the sister of **`/image`**:
a clip *starts from a picture*, so the look, the palette and the **"look at what we already have"**
habit (its Step 0) live in `.claude/skills/image/SKILL.md` — read that first. The HTML reel a clip
goes into is **`/reel`**.

The whole job in one line: **a plan he approves → a start picture (one we already have, or 1
credit) → a 3-second SILENT clip (3 credits) → look at it → trim → write it in the ledger.**

## ⚠️ The spend protocol — Amir's rules, 2026-09-20

After my first two test clips (23.5 credits) he said: *"the credit is expensive, but you did some
things without letting me know, or asking for me ... so we can discuss, learn and then remember for
the next time."* Each thing I had done is now a rule:

1. **Present the plan BEFORE any spend, every time, even a test.** One block he can answer with
   "yes" or a change (the template is below). *"I wanted you to explain to me what you want, the
   plan, the video, so I would accept or change, because it costs money."* A "go" covers that plan
   and anything cheaper than it, never anything dearer or different.
2. **Reuse before you generate.** *"We already had the images, we could use the ones and not
   generate again."* Do Step 0 of `/image`, read the ledger below, run `tools/find_vertical.py`.
   Animate a picture that exists, and say in the plan why a new one is needed. (2026-09-20: the repo
   holds exactly two vertical art pictures, the Reel 7 dawn and night courts. Everything else is a
   16:9 banner.) **Never feed in a photograph of a real person** (Amir, a client, a player):
   `assets/img/athletes/`, `Content/recovery-run/` and `coach-site/media/` are off limits.
3. **Sound is OFF unless he asks for it.** *"You generated videos with sound, that costs more, and
   we might not use it."* ⚠️ **`sound` defaults to `"on"` on both models** (read from
   `models_explore get`), so any call that leaves it out pays for audio: **always pass
   `sound: "off"`.** It adds 1.5 credits to a 3 s clip (Cinema 3 → 4.5, Kling 4.5 → 6), and he adds
   his own music in Instagram anyway.
4. **3 seconds, never 5.** *"If you needed less, you could have gone for 3 seconds."* Longer only
   when he asks and the plan says why.
5. **The cheapest settings that show the thing:** `std`, medium/1k pictures, sound off. Nobody
   needs `pro`, `high` or `2k` to find out whether an idea works.
6. **Report after, in numbers:** what was spent, the balance, and what the lean version would have
   cost. Never generate "a few options to see" and never top up on your own initiative. `get_cost:
   true` preflights for free (single calls only) so every number in the plan is a real one.

**Could I have predicted that 5 s was too long? Partly (Amir asked).** The exact seconds, no. But
a first test should always be the minimum length: the price rises with every second and the action
comes first, so a short test shows the same thing. And the sprint-away was predictable from my own
prompt (Step 3). The same two tests, done by these rules, cost **9.5 credits instead of 23.5**.

### The plan block — copy this shape

| # | What it shows | Made from | Length | Sound | Credits |
|---|---|---|---|---|---|
| 1 | Start picture: chalked hands on the trap bar, vertical | your `first-light` banner (horizontal, so it must be recomposed) | | | 1 |
| 2 | Clip: the grip tightens, chalk lifts through the window light | picture 1 | 3 s | off | 3 |
| 3 | Clip: the empty night court, dust drifting, for behind the button | the Reel 7 night picture we already have (no new picture) | 3 s | off | 3 |

**Total 7 credits, balance 103.76 to about 96.76.** That run matched its quote to the credit.

## Standing rules — content

1. **You cannot hear a clip.** If he asks for sound, measure it (mean and peak dB, below), say what
   the prompt asked for, and let him judge by ear. Never write "the audio sounds great".
2. **Generated footage is atmosphere, never evidence.** It shows an invented athlete: no "my
   client", no before/after, no result claim laid over it. Instagram asks creators to label
   realistic AI-made video (an AI-label setting when posting). Tell Amir when a reel contains it;
   whether and how he labels is his call. Never write copy that hides it.
3. **Faces stay turned away** and nothing carries text, numbers or a logo (shoes and shirts have
   them: check). Same palette rules as `/image`: clay `#C7552F` is the only saturated colour, no
   yellow, no gold. Never depict exercise form: a grip, a push-off or a pivot is fine, a lift is not.

## Step 1 — before you touch the tools

1. **`git status --short`**, and read the **ledger** at the bottom: a picture or a clip may already
   exist. Two sessions once generated the same 12 covers in the same minute.
2. **Reuse check** (protocol rule 2): `/image` Step 0, then
   `python .claude/skills/video/tools/find_vertical.py` for every vertical picture in the repo.
3. **Decide the beat**: what this clip shows, how many seconds it will be on screen (usually
   1.5-3), what words land over it (keep the **top 40% calm**), and what sits either side of it (two
   clips in a row should differ in distance or subject). Decide the seconds *before* generating.
4. **`balance`, preflight every price with `get_cost: true`, write the plan block, and wait for his
   "yes".**

## Step 2 — the start picture

Always image-to-video (text-to-video is untried). The start picture fixes the composition, the
palette and the athlete, and the clip inherits all of it, which is what keeps footage on brand: every
clip opened on exactly its start picture.

- **A vertical picture that exists is used as it is.** No generation, no cost: upload it and go
  (the night plate came straight from the Reel 7 master).
- **A horizontal one is recomposed to vertical** (a centre crop of 16:9 to 9:16 keeps only about a
  third of the width, and a raw 16:9 start picture is untried). Upload it (`media_upload` returns
  presigned URLs → PUT the bytes with curl → `media_confirm`; a `.webp` was converted to `.jpg`
  first, so raw webp is untried), then:
  ```
  generate_image_batch { requests: [{ index, params: { model: "gpt_image_2_5", aspect_ratio: "9:16",
      quality: "medium", resolution: "1k",
      medias: [{ value: "<media id>", role: "image_references" }],
      prompt: "<the scene, recomposed vertically: subject in the lower half, room to move,
               top 40% dark and calm, palette guard, avoid list>" } }] }
  ```
  **`medium`/`1k` is 1 credit and is enough:** it gave 752×1344, the size the Reel 7 masters are,
  and a 1 k master gave a clean night plate. (The first tests used `high`/`2k`, 3 credits each, for no
  reason.) Ready in about 30 s.
- **Or a fresh picture** made per `/image`. Same settings, no `image_references`.
- **Composition decides the clip.** The subject big in the lower half of the frame (a locked camera
  cannot follow it), the ground and the light readable, nothing important at the frame edge (the
  burst's foot left the frame and the clip emptied), the top 40% calm, no ball.
- **Open the picture (Read) before paying to animate it.** A weak frame makes a weak clip.
- **Reuse without downloading:** pass the picture's *job id* as the media `value`.
- **`end_image`**: both models take a second picture (role `end_image`) that the clip must finish
  on. Untried, and it would have stopped the pivot runner from leaving: one more picture, one more
  credit, and the action is pinned at both ends.

## Step 3 — prompt the clip (300-500 characters)

1. **`Static locked-off camera.`** Every clip held perfectly still. Camera moves are untried.
2. **ONE action**, present tense, happening **in place or across the frame**. ⚠️ **Never toward or
   away from the lens.** The pivot prompt said *"explodes into a fast sprint toward the far
   baseline"* and she was a dot by 2.5 s with nothing left in the frame. A push-off, a split-step, a
   grip, a lunge, a landing keep the subject big.
3. **What the air does**: dust, chalk, haze. The clay dust hanging in the light *was* the burst clip.
4. **The guard**: *"Realistic natural physics, no morphing, no extra limbs, face never visible."*
5. **A `Sound:` line only if sound is on** (it should not be).

Prompts as run (the burst is the proven one; the other two are logged in the ledger):

> **Burst** (Cinema Studio v2, `speedramp: "slowmo"`): Slow motion. The player's white shoe drives off
> the red clay and a burst of red dust explodes forward and up, drifting through the warm light.
> Camera locked and low, no camera movement. Realistic, natural physics.
>
> **Plate** (Cinema Studio v2, `speedramp: "linear"`): Static locked-off camera. The empty red clay
> court at night under the floodlights. Fine red dust drifts slowly through the light beams and a thin
> low haze moves across the court. The floodlights glow steadily. Nothing else moves. Realistic, calm,
> no people.

Action is **front-loaded**: the model spends itself in the first ~2 s and the rest of a 5 s clip
empties. That is why the answer is 3 s.

## Step 4 — model, settings, price

| Model | Settings | 3 s, sound off | 3 s, sound on | Use it for |
|---|---|---|---|---|
| `cinematic_studio_video_v2` | `mode: "std"`, `sound: "off"`, `speedramp`: `"slowmo"` (a heroic beat), `"linear"` (natural speed), `"impact"` | **3** | 4.5 | one subject: a push-off, a grip, a calm plate |
| `kling3_0` | `mode: "std"`, `sound: "off"` | **4.5** | 6 | natural-speed athletic movement (the pivot) |
| `kling3_0` | `mode: "pro"` | not priced | 7.5 | only if std morphs the limbs |

Reference, only if he asks for 5 s: Cinema on 7.5; Kling off 7.5, on 10, pro on 12.5, `4k` on 30;
Veo 3 fast 22 at its default length (untried); Seedance 2.5 at 720p with audio 35 (untried). All
prices are 2026-09-20 and `speedramp` did not change them. Re-preflight; they change.

**Read `models_explore { action: "get", model_id }` the first time you use a model** (free). It
lists every parameter with its default, which is how the `sound` default was found. Both models:
`duration` from 3 s, `start_image` and `end_image` roles; Cinema Studio takes 1:1, 4:3, 3:4, 16:9 and
9:16; Kling takes 16:9, 9:16 and 1:1. Kling is marked `supports_unlim`, but it is not available on
this account.

A clip comes back **about 720×1280 (716×1280 and 720×1276 seen), 24 fps, H.264**, opening on its
start picture; with sound off there is **no audio track**. A 1080-wide reel scales that 1.5×, so
expect it soft: give video plates the same unsharp + fine grain the reel pictures get
(`Content/reel-7-course/src/prep_bg.py`). `upscale_video` (bytedance / topaz) exists and has **no cost
preflight**: untried, so quote the price as unknown.

```
generate_video_batch { requests: [{ index, params: { model, prompt, duration: 3, aspect_ratio: "9:16",
    mode: "std", sound: "off", speedramp?,
    medias: [{ value: "<start picture job id or media id>", role: "start_image" }] } }] }
```
- **`sound: "off"` and `aspect_ratio` are always explicit**, `use_unlim` is never set, `duration: 3`.
- The batch tool has **no `get_cost`**, so preflight with the single `generate_video` first. A
  two-item batch once submitted one job and returned `submission_failed` for the other (see the
  preset note in Step 5); the retry went through.

## Step 5 — generate and fetch

```
ToolSearch "select:mcp__<higgsfield>__generate_video_batch,mcp__<higgsfield>__generate_image_batch,mcp__<higgsfield>__jobs_wait,mcp__<higgsfield>__balance,mcp__<higgsfield>__media_upload,mcp__<higgsfield>__media_confirm,mcp__<higgsfield>__models_explore"
```
`<higgsfield>` was `9848bc9c-ae34-4762-b153-8d1fb4170f25` on 2026-09-20; it changes if Amir reconnects.

- `jobs_wait { jobs: [{ index, job_id }], timeout_seconds: 15 }` long-polls: call it again until
  the job is `completed`. A 3 s clip took about a minute, a 5 s clip about two, a picture about 30 s.
- The result is a plain CloudFront URL, no auth: `curl -sS -o clip.mp4 "<result url>"`.
- ⚠️ A submission can come back **`submission_failed` with a recommended preset** («IN THE DARK»,
  `24bae836-2c4a-48e0-89b6-49fcc0b21612`). Resubmit the identical params plus
  `declined_preset_id: "<that preset id>"` to get a plain generation. **No job id and no charge** on
  the rejection. Seen twice now — a night court (2026-09-20) and a dark hall floor (2026-09-21) — so
  **expect it on any dark plate** and keep the preset id to hand.
- ⚠️ **Never resubmit after a transport timeout**: the job may exist. Reuse its id.
- ⚠️ **In auto mode the harness's safety check can block the download** (it did once, reason
  "Real-World Transactions", right after two paid jobs). Do not retry it and do not route around it.
  Show him the clip with `show_generation_by_ids`, tell him plainly that your own check is missing,
  and ask.
- `balance` again afterwards and write the difference in the ledger.

## Step 6 — judge it

```bash
python .claude/skills/video/tools/clip_check.py clip.mp4 --out sheet.png
```
(Needs ffmpeg: `python -m pip install --user imageio-ffmpeg`, see `[[reference-edge-playwright-on-amirs-pc]]`;
on his PC set `FFMPEG` to `%APPDATA%\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe`.)

It prints the facts, the audio mean and peak in dB (if there is audio), the motion per half second
and a suggested cut, and writes a labelled contact sheet with one frame per half second. **Open the
sheet with Read** and check:

- **The first frame is the start picture**, and the light did not drift (no yellow, no blue).
- **When the subject leaves the frame or shrinks**: that is the trim point. The tool's suggestion
  is the *outer* bound: by eye the good part ended 0.5-1 s earlier both times (3.0 s against 3.5,
  1.75 s against 2.0).
- **Faces**: visible at any moment? A head in profile at 0.5 s is small enough to pass; a face is not.
- **A person who was not in the start picture.** When the start picture shows only body parts (hands, legs), the model can
  complete the whole person mid-clip. The "grip" clip did: a bearded man bent into the frame from 1.67 s, with his face and
  a printed shirt logo, although the prompt said "no face". Sweep the frames at 8 per second and cut before it happens.
- **Morphing**: hands, racket, feet, a third leg. Logos or letters appearing on shoes and clothing.
- **The last frame**: empty? Then the clip is too long.
- **A quiet plate** (the night court) moves about 2 out of 255 per frame against 4-14 for an action
  clip: the haze drifts and the clay shimmers, and nothing else does. That is right for a plate
  behind text; on a phone it may read as almost still.
- **Audio**, only if sound was on: the two sound-on tests measured mean −33.6 / −32.8 dB with peaks at
  −3.7 / −7.0 dB, a quiet bed and a few sharp hits, no music.

## Step 7 — trim and save

```bash
python .claude/skills/video/tools/clip_check.py clip.mp4 --trim 3.0 --to Content/<reel>/clips/<name>.mp4
```
Writes a copy cut to that length, 0.25 s audio fade-out (when there is audio), H.264 crf 16. Keep the
**original** too (it cost credits and a different cut may be wanted): `Content/<reel>/clips/`, tracked
in git (2-5 MB each). Then add the ledger row below. Send Amir the trimmed clip with `SendUserFile`.

## Step 8 — into a reel (BUILT: reel-8, `Content/reel-8-course/`)

The recipe is in `/reel` Step 2c, and the working example is `Content/reel-8-course/src/`. In short:

- **Trim first, then embed.** `prep_clips.py` cuts each clip to the seconds that are used (a `masters/` copy at crf 14) and
  makes a lean copy for the page (crf 24, `-an`, a light `unsharp`, a keyframe every 12 frames). Four clips, 9.3 s of
  footage, 2.4 MB, and the whole reel 3.5 MB as base64.
- A clip is a **plate**: a full-bleed `<video muted playsinline preload="auto">` under the type, in its own wrapper. It ends on its
  last frame, so a scene that runs longer than the clip simply holds it.
- ⚠️ **The MP4 renderer steps a fake clock, and a `<video>` does not obey it.** The page plays nothing when
  `window.__renderMode` is set, and the renderer calls `window.__videoAt(V)` after every frame, which seeks each clip to the
  frame that belongs there and resolves when it lands. It works: 600 frames in 35 s, 0 stalled seeks. Details in
  `.claude/skills/reel/tools/README.md`.
- Clips are silent, so nothing needs mixing. The two 5 s test clips carry audio; it was dropped (`-an`). If he ever wants
  clip sound, the renderer writes **no audio**: mix afterwards with ffmpeg (`adelay` to each scene start, `amix` with
  `normalize=0`, mux with `-c:v copy -c:a aac`).
- 24 fps clips in a 30 fps MP4 show every fourth source frame twice. Not visible in practice.
- Cuts between clips wipe in from the right with a clay line (the reading direction for Farsi), so a jump in brightness
  between clips reads as a cut, not a glitch.
- **After the export, sweep the footage for faces and logos** (a contact sheet every 0.3 s of each clip scene).

## Not tried yet (so do not claim it works)

Text-to-video · camera moves · `end_image` · `multi_shots` · `genre` · `speedramp` `impact` and
`speedup` · a raw 16:9 or webp start picture · people's faces · two subjects · a ball in flight · Veo
3 · Seedance · `motion_control` · `upscale_video` · `reframe` · `virality_predictor` (needs the
finished reel uploaded). **`generate_audio` is speech only: Higgsfield makes no music and no sound
effects**; a clip's sound comes only from `sound: "on"`.

## Money

`balance` before and after every generation and the difference in the ledger. If the number is off,
`transactions`: his own spends show as −1 GPT Image lines in batches of 4, which is how ~55 credits
disappeared in one session. Tell him when a budget you quoted no longer holds.

---

## Learned the hard way — append here

Add a dated line whenever a round teaches something. This section is the reason the skill exists.

- **2026-09-20 (Amir's feedback on the first two clips)** — I spent 23.5 credits without showing a
  plan, left sound on (the DEFAULT, so it is a trap), regenerated pictures without checking what we
  had, made 5 s clips, and used `high`/`2k` pictures. The same tests done lean: 9.5. All five are the
  spend protocol at the top.
- **2026-09-20** — 5 s is too long. Burst: the foot leaves the frame at ~3 s and the last 1.5 s is
  drifting dust. Pivot: the subject ran to a dot by 2.5 s. Both had 2-3 s of use. Amir on the pivot:
  *"a bit too long"*. Request 3 s and trim.
- **2026-09-20** — The action is front-loaded, so the trim is almost always from the END.
- **2026-09-20** — Do not prompt travel toward or away from a locked camera; the subject shrinks or
  grows out of the shot. Prompt something in place or across the frame.
- **2026-09-20** — The start picture matters more than the prompt: the clip opens on it exactly and
  inherits its palette, so on-brand footage needs no extra grading pass.
- **2026-09-20** — Cinema Studio v2 with `speedramp: "slowmo"` gave the best hero beat (the dust);
  Kling 3.0 gave natural-speed athletic movement. Different subjects, so this is not a fair race.
  Cinema is also cheaper per second (3 against 4.5 for 3 s, sound off).
- **2026-09-20** — Sound was a quiet bed (mean about −33 dB) with sparse peaks. I cannot hear it.
- **2026-09-20** — The pot is shared with Amir's own generations; one session's balance fell by ~55
  credits that were not mine. `get_cost` is free; a batch has none.
- **2026-09-20** — A batch item can fail with a recommended preset; retry with `declined_preset_id`.
- **2026-09-20** — A vertical master we already had (the Reel 7 night court) went straight in as a
  start picture: no generation, and a calm haze-drift plate for 3 credits.
- **2026-09-20** — The auto-mode check blocked one download (see Step 5). The clip was made and paid
  for, but my frame-by-frame check of it was missing; Amir watched it through the Higgsfield viewer. After
  he said "go build reel 8" the same plain download went through, and the check found the problem below.
- **2026-09-20** — **The "grip" clip broke two rules in its second half** (a face in profile and a printed shirt logo, from
  1.67 s), so reel-8 uses only its first 1.55 s. The prompt already said "no face" and "the bar stays on the floor"; the model
  completed the person anyway because the start picture showed only forearms. A prompt cannot forbid this reliably: keep the
  action tiny, cut early, and sweep the frames. It also means a 3 s clip is not always 3 usable seconds.
- **2026-09-20** — A video plate reel is cheap to build once the renderer protocol exists: four clips, 2.4 MB embedded, a 20 s
  MP4 in 35 s. The cost was the 30.5 credits, and 7 of them (the lean run) delivered two of the four clips.

## Ledger — what already exists in the Higgsfield account

Job ids can be passed straight to `medias[].value`; nothing needs downloading and re-uploading.
Uploaded pictures (media ids) can be reused too. The local clips were scratch files and are not in the
repo; the results are still on Higgsfield.

**Uploaded pictures**

| Media id | What |
|---|---|
| `c02c164f-3381-4ac6-b8f1-e602c8247d57` | `full-acceleration` (assets/tps banner, .jpg) |
| `23b2b80b-0449-4b07-b732-db7e3ad80bd0` | `under-lights` (assets/tps banner, .jpg) |
| `7e1b98e3-b38f-43f4-9c93-051c3d52454c` | `first-light` (assets/tps banner, .jpg) |
| `6e9efc1d-3d5e-43e9-80e2-7c63d6ffe52a` | `week-sixteen`, the Reel 7 night court master (752×1344, .png) |

**Generated**

| Date | What | Made from / with | Credits | Job id | Verdict |
|---|---|---|---|---|---|
| 2026-09-20 | Start picture "burst": white shoe pushing off red clay, dust, low camera | `full-acceleration`, `gpt_image_2_5` high/2k | 3 | `6de014d5-3bff-4738-83e0-8da2d61c458f` | good |
| 2026-09-20 | Start picture "pivot": woman from behind, mid split-step, floodlit night court | `under-lights`, `gpt_image_2_5` high/2k | 3 | `6fdcfb40-7ea2-4989-b173-9f004988c2fb` | good |
| 2026-09-20 | Clip "clay burst", 5 s | Cinema Studio v2 std, slowmo, sound on | 7.5 | `371bb4ef-83ec-4786-ba24-3687ce406b2e` | use **0-3.0 s** |
| 2026-09-20 | Clip "floodlit pivot", 5 s | Kling 3.0 std, sound on | 10 | `b4e56996-df20-4ec1-bb28-5c10ff49203f` | use **0-1.75 s**; she runs away |
| 2026-09-20 | Start picture "grip": chalked hands on a trap bar, window light, clay-orange towel, vertical | `first-light`, `gpt_image_2_5` medium/1k | 1 | `9c7eef38-a64e-47ae-8c17-daff50cb1746` | good, 752×1344 |
| 2026-09-20 | Clip "night plate", 3 s, silent | Cinema Studio v2 std, `speedramp: "linear"`, from `week-sixteen` | 3 | `0a334ef3-3184-45f6-9f98-97ae5ed59bb1` | haze drifts, all else still; no audio track |
| 2026-09-20 | Clip "grip", 3 s, silent | Cinema Studio v2 std, slowmo, from the "grip" picture | 3 | `804a5c00-f07c-422b-9c02-f66d2aa86d5c` | checked: **first 1.55 s clean** (forearms, chalk); a man's face and shirt logo enter from 1.67 s, so only that part is used in reel-8 |

Prompts as run for the last three: *grip picture:* "Recompose this photograph as a vertical 9:16 image.
Same scene: a chalked pair of hands gripping the handles of a trap bar on a dark rubber gym floor, one
loaded plate beside it, a clay-orange towel on the floor, chalk dust drifting through one narrow shaft
of window light, the rest of the room in deep shadow. Camera low and close. Hands and bar in the lower
half of the frame, the top 40% dark and calm. Photograph, muted natural colour, clay orange the only
saturated colour. No text, no numbers, no logos, no face, no yellow, no gold." *grip clip:* "Static
locked-off camera. The chalked hands squeeze the trap bar handles tighter, forearms tensing, and a small
cloud of white chalk dust lifts off the knuckles and drifts through the shaft of window light. The bar
stays on the floor. Slow motion. Realistic, natural physics, no morphing, no extra fingers, no face."
*plate:* the one in Step 3.

Spent 2026-09-20: 23.5 (first two tests) + 7 (the grip picture and two clips) = **30.5 credits**; balance
96.76 afterwards.
