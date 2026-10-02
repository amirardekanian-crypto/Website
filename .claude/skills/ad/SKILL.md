---
name: ad
description: Build an Instagram ad that sells one of Amir's products, through his own 17-stage pipeline — objective, audience, problem, objection, message, CTA, idea, emotion, storyboard, script, shot list, look lock, image prompts, selection, video prompts, edit plan, review. Use whenever Amir asks for an ad, a promo, "something to sell the course", a hook, an ad script, an ad concept or a batch of ad ideas. Read BRAND.md before writing a single word.
---

# Ad creation — AA Performance

Turn a product and a problem into **one postable ad**. The pipeline below is **Amir's own**, proposed
2026-09-21, with three moves and one addition he approved — the reasons are in each stage.

| File | What it is | Used at |
|---|---|---|
| **`BRAND.md`** | Who he is, who is watching, what he will never do. The interview, not inference. | **Before stage 1, every run.** |
| **`STRATEGY.md`** | Ten principles, ten angles, thirteen hooks, five visual concepts, three CTAs. | Stages 3–7 |
| **`SHOTS.md`** | How he films himself, the source ladder, worked shot lists. | Stages 11–12 |
| **`PROMPTS.md`** | Paste-ready Higgsfield prompts and the house formula. | Stages 13–15 |
| **`WHATSAPP.md`** | What he sends when someone messages. | Stages 6 and 17 |
| **`LEDGER.md`** | Every ad, what it cost, what it did. | Before stage 1, and after posting |
| **`BRIEF-TEMPLATE.md`** | The blank 17 stages. Copy it per ad. | Stage 1 |

## ⚠️ The two rules that override everything

1. **Never generate before Amir says yes to a plan with numbers in it.** Credits come from a pot
   shared with his own work. The plan block and protocol are in `.claude/skills/video/SKILL.md` and
   bind here unchanged. `get_cost: true` preflights free.
2. **He films, Claude assembles.** He can film often, edits in Instagram's own editor, and editing
   is what stops him. The deliverable is a **finished MP4**, never parts to assemble.

## Before stage 1

Read `BRAND.md` in full — the refusal list in §5 is not advisory. Read `LEDGER.md` — do not remake a
flop or re-shoot a hook that already worked. Run `git status --short` and look at `assets/tps/`; two
sessions once generated the same twelve pictures in the same minute.

---

# The pipeline

**Every ad gets its own brief file** — `Content/tps-ads/ad-NN-<slug>.md`, copied from
`BRIEF-TEMPLATE.md` and filled in as you go. It is the ad's record, it is versioned, and the next
session reads it instead of guessing.

## ⚠️ Two ways in — check which one this is

**Route A · from scratch.** Stages 1–17 in order. Claude writes the script at stage 10 and Amir
films it. This is what the five current briefs were built through.

**Route B · Amir brings the script and the take** (his preferred way, stated 2026-09-21: *"if I come
up with a script, and then record 30-45 sec of me talking on the phone, can we generate some videos
to put on screen and add some motion graphics?"*). **Yes — and it makes a better edit**, because the
beats come from his real delivery instead of a planned timing.

When his files are in `Content/tps-ads/takes/`:

1. **Watch and time the take first.** Build the beat sheet from where he actually pauses and
   breathes — those gaps are where the cutaways land. Stages 9 and 10 are *read off the take*, not
   written.
2. **Then fill stages 1–6 backwards from what he said.** Which problem does it open on, which
   objection does it kill, what is the one ask? If the take has no ask in it, say so — that is the
   most common thing missing from a self-written script, and it is fixable with an end card rather
   than a reshoot.
3. **Stage 11 onward runs normally.** Roughly **one cutaway per 5–8 seconds**, so a 40-second take
   wants 5–8 b-roll moments. Reuse pass first: 78 graded stills in `assets/tps/` and `assets/art/`,
   the three clips of 2026-09-21, and real app captures will cover most of it.
4. **Motion graphics are free** — the reel engine (`.claude/skills/reel/SKILL.md`), not credits.
   Vazirmatn, RTL, Persian numerals, clay the only accent, count-ups, clay-line wipes running right
   to left, the button at the end.
5. **His voice is the only audio.** Generated clips are silent by design; he adds music in Instagram.
   The render is silent too, so his take's sound goes back on at stage 16's audio step.

⚠️ **Route B still passes the stage 17 review.** A script he wrote himself has not been through the
refusal list — check it for a named coach, a promised result on a timeline, fear, and any price that
is not the Iran price.

**Route C · a polished animated ad with no footage of him** (2026-10-02: Mehraneh Zohourian's website ad, reel 9, which Amir called "amazing"). A site, an app or a launch that is
told with motion graphics, real page captures and stills, not his face. Build it on the **timeline kit** (`.claude/skills/reel/timeline/README.md`, `/reel` Step 2d), not the scene-swap engine.

1. **Part A's brief still comes first**, but you decide the concept yourself from the thing being sold (reel 9 was built on her site's tennis | padel gate). Ask only concrete questions: the language, what the viewer does next, whether a voice goes on it.
2. **The length comes from the reading budget** (`0.8 s + 0.25 s per word` per block; `read_audit.js` says "0 too fast" before anything is rendered). Reel 9's first cut was 17 s and Amir said *"the changes are too fast, there is no time to be able to read"*: it had 14 of 33 blocks under what a viewer needs, and the cure was more time (30 s with every beat kept), not more speed and not fewer facts: when one cut folded a section into a badge he asked for it back (*"do not remove the content, just make it longer"*).
3. **No voice means no `mux_audio.py`**: the sound is synthesized from the page's own cue list (`mux_sfx.py`, said plainly to be un-auditioned) and he adds music in Instagram. A voice ad stays Route A or B.
4. **It still passes the stage 17 review** (the refusal list and the price rule apply to what it says), every claim is traced to its source (`copy_audit.py`), and the new Farsi lines are listed for Amir to read before anything ships. For Amir's own ad: DESIGN-ATLAS tokens (green, clay the only accent, no yellow, Vazirmatn, @amirardekanian). For a client: the client's own brand.
5. The deliverable is the finished MP4 plus a cover frame and a storyboard sheet (`/reel` Step 9). Keep the earlier cut when a new one replaces it.

## PART A · THE BRIEF — settle all six before a single creative thought

If any of these six cannot be filled in, there is no ad yet. Ask Amir rather than inventing one.

**1 · CAMPAIGN OBJECTIVE** — what it sells and the number being counted. Default: the $17 course,
counted in **WhatsApp messages received** (`BRAND.md` §1). Organic only, so the ad must also be
worth *keeping* — saves and sends are the entire distribution.

**2 · TARGET AUDIENCE** — who, and **what they already believe**. Iranian tennis and padel players;
coaches and general-fitness people are also watching. ⚠️ Parents are not (`BRAND.md` §2).

**3 · THE PROBLEM, IN THEIR WORDS** *(split out of core message)* — one of the six he reports, or
one of the three desires. **Quote them, do not improve them.** *"My legs are tired in the third
set"*, not "poor endurance". `STRATEGY.md` §2.

**4 · THE OBJECTION IT KILLS** ← **added.** Which of the four does this ad answer: don't trust
online · it's free on YouTube · want a coach watching · **the gym will make me slow and bulky**. An
ad that kills none of them is a brochure with good lighting. One per ad, never all four.

**5 · CORE MESSAGE** — one sentence a viewer could repeat to a friend. If it takes two, the ad is
two ads.

**6 · CTA** ← **moved up from 14, the most important change.** The ask decides the *whole* ad —
length, hook, the last ten seconds. Decide it here and the film builds toward it; decide it at the
end and you discover the ad leads nowhere after it is already cut. One ask only (`STRATEGY.md` §6).
**If the ask is WhatsApp, name the reply from `WHATSAPP.md` now** — usually T3 — because the ad's
last line and his first message must carry the same promise.

## PART B · THE IDEA

**7 · CREATIVE IDEA** — the angle from `STRATEGY.md` §3, plus what makes *this* execution of it its
own thing. Write **three hooks** and read them out loud; he has to say them.

**8 · EMOTIONAL DIRECTION** — what the viewer should feel, in one word, and how the ad earns it.
Recognition · relief · irritation at a method · curiosity · resolve. ⚠️ Never fear, never shame
(refusal 3). The register is teacherly throughout: a question he is about to answer, or a correction
he is about to justify.

> ### → GATE · Amir's yes ← **added**
> Nothing gets storyboarded, filmed or generated until he has seen stages 1–8 and agreed. This is
> the cheapest place to kill a bad ad, and he is the one who has to stand in front of the camera.

## PART C · THE PLAN

**9 · STORYBOARD** — the beats in order with their timings, what is on screen, and what the viewer
understands by the end of each. Hook lands inside 2 seconds; first frame **arresting and still**
(principle 4).

**10 · TEXT / VOICEOVER** ← **moved up from 13.** You cannot plan an edit without the words. Farsi,
teacherly, word for word, with each line marked **verbatim** / **from the course** / **draft** so he
can see at a glance which are his to rewrite. On-screen text is never the script repeated — three or
four words, Persian numerals, carrying only what his voice cannot spell.

**11 · SHOT LIST** — one row per shot, and **every row names its source**: `AMIR` · `HAVE` ·
`REUSE` · `CAPTURE` · `GENERATE`. ⚠️ **The reuse pass lives here** — run `.claude/skills/image/SKILL.md`
Step 0 before tagging anything `GENERATE`, and say what you found in one line (*"7 of 9 exist, so I
would generate 2"*). Format and filming rules: `SHOTS.md`.

**12 · LOOK LOCK** *(was "visual bible")* — **three lines, not a document.** Which of the five visual
concepts, what the light is doing, what is in frame. The real bible is `Content/DESIGN_SYSTEM.md` and
`Content/DESIGN-ATLAS.md`; writing a fresh one per ad is how five ads end up with five slightly
different looks.

## PART D · PRODUCTION

**13 · IMAGE PROMPTS** — only for what survived stage 11. `PROMPTS.md` holds ready-made ones and the
house formula. **Quote the credits and wait** (rule 1).

**14 · SELECT / REFINE IMAGES** — three candidates per slot; judge through the destination's own
scrim, check the crop, check the whole set for near-twins. When all three miss the same way the
prompt is wrong — change the subject, do not roll a fourth.

**15 · IMAGE → VIDEO PROMPTS** — 3 seconds, `sound: "off"` (the default is ON), one action in place
or across the frame, never toward or away from the lens. The clip must survive being cut to 1.5 s.

**16 · EDITING PLAN** — the cut, beat by beat: which shot, how long, where his take is underneath,
where the on-screen words land, where the grain and grade go. **Includes what Amir films and when**:
one take of the whole script, leave two seconds at each end. He sends it, Claude cuts it.

**16b · AUDIO** ← **added 2026-09-26.** `/reel`'s export (`render_mp4.js`) writes **no audio**, so an
ad straight out of it is a silent film. His take's sound goes back on here, every time:

- In the HTML the take is a `<video muted>` plate like any clip; the renderer seeks it with the
  others. Write two numbers into the edit plan: **`IN`** (seconds into the take where the cut starts,
  usually about 2, after his silence) and **`AT`** (seconds into the ad where his voice starts, usually 0).
- **One continuous stretch of the take** (the normal case: cutaways hide a stumble, the sound runs on):
  ```
  python .claude/skills/reel/tools/mux_audio.py Content/tps-ads/export/ad-NN.mp4 Content/tps-ads/takes/<take>.mov --in IN --at AT --out Content/tps-ads/export/ad-NN-final.mp4
  ```
  It measures the take, normalises his voice to **-14 LUFS integrated, -1.5 dBTP true peak** (where
  Instagram plays reels; a louder file gets turned down, a quieter one sounds weak next to the feed),
  high-passes at 80 Hz, copies the video untouched, pads silence to the render's length, then checks
  the result and prints `PASS` or `FAIL`.
- **A jump cut in his voice** (a sentence dropped): cut the take first, then mux the cut take with
  `--in 0`. Every kept stretch in order, same numbers as the edit plan:
  ```
  ffmpeg -nostdin -i take.mov -filter_complex "[0:v]trim=2.0:9.4,setpts=PTS-STARTPTS[v0];[0:a]atrim=2.0:9.4,asetpts=PTS-STARTPTS[a0];[0:v]trim=11.2:38.0,setpts=PTS-STARTPTS[v1];[0:a]atrim=11.2:38.0,asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -crf 14 -c:a pcm_s16le takes/<take>-cut.mov
  ```
  The HTML plays that same cut file, so picture and voice cannot drift apart.
- **Music**: none by default, he adds it in Instagram (keep it well under his voice there). Only if he
  asks for it in the file: add `--music <bed> --music-under 20`. The bed sits 20 LU under his voice and
  a sidechain compressor keyed on his voice ducks it further while he talks. Only a track he has the right to use.
- **ffmpeg on his PC** is not on `PATH`: the script finds imageio-ffmpeg's copy,
  `%APPDATA%\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe` (7.1,
  has `loudnorm`, `ebur128`, `sidechaincompress`). There is **no ffprobe**; the script checks with
  ffmpeg itself. By hand, the proof that a file has sound is
  `ffmpeg -nostdin -hide_banner -i final.mp4 -map 0:a:0 -af ebur128=peak=true -f null -`: an error
  ("matches no streams") means silent; otherwise the Summary's `I:` should read -14 ±1 LUFS.
- **Listen to it** before sending: pull 5 s around the hook and around a cutaway, and check the lips
  still match (a fixed offset means `IN` or `AT` is off by that much).

## PART E · SHIP

**17 · FINAL AD REVIEW** — against the refusal list, out loud, before it goes anywhere:

- Hook lands inside 2 seconds · first frame arresting and still
- **One** ask, in the destination's own words
- No named coach · no promised result on a timeline · no fear · no hype editing
- Every claim checkable on his own pages — **Iran prices only** in a Farsi ad
- Nothing generated implies a client, a result or a before/after
- Nothing in frame carries a logo, a brand name or yellow
- Everything readable sits between y≈250 and y≈1600
- **The WhatsApp reply ships with it** when the ask is C2
- **It has sound**: `mux_audio.py` printed `PASS` for this exact file (stage 16b). Never send the silent render

Then deliver: the MP4 by `SendUserFile`, the caption, the reply. Then a row in `LEDGER.md` — and once
he has posted it, **what it actually did**. That last column is the only thing that makes the next ad
better than this one.

---

## Learned the hard way

- **2026-09-21** — Five ad concepts written *before* asking who the audience was: two aimed at people
  who are not watching and a problem nobody reports. Ask first, write second.
- **2026-09-21** — All four purchase objections attack the *format* or a *belief*, never the price.
  An ad that only describes the course answers none of them.
- **2026-09-21** — Offered the hard version and the honest version of three edgy angles, Amir took
  the honest one every time. Offer the stronger-and-defensible variant rather than assuming.
- **2026-09-21** — His audience contains the coaches who share his work. That is a distribution
  argument against attacking coaches, not a manners one, and it is the one that persuaded.
- **2026-09-21** — He proposed this pipeline himself. The CTA sat at stage 14; moved to 6, because
  the ask decides the length, the hook and the last ten seconds of the film.
