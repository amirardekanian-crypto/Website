# HANDOFF: where the /cut reel kit stands, and how to continue in a new chat

Written 2026-10-01 at the end of a long session. Read this first when you pick the work up. This folder is on Amir's PC and is the one you edit. On his "go live"
(2026-10-01, twice: morning and night) a mirror of it was committed to the website repo at `.claude/skills/cut/` (see the table; the night one is commit 69011f8: the Motion Menu connection and its
tidy-up, stage 3 of the kit, showreels 5-6). After any later change run `python tools\sync_to_repo.py` and commit it only when he says "go live". The other thing published outside this PC is his own
Motion Menu artifact (version 7 on 2026-10-01, after the tidy-up). **The repo also holds the page's first builder, `Content/motion/`: read `kit\MENU.md` "Two pipelines, one page" before you publish the page.**

## What this is
Amir (online S&C coach, Farsi Instagram reels) is **not an editor**. He gave Claude the job of creative director and editor for his
talking-head reels (silence cuts, pace, cut-ins, transitions, mostly motion graphics; **he adds the captions himself, never make
captions**). The user-level skill **`/cut`** does it. Since the first real reel (HCTV3230) the work has been a **motion-graphics kit** of
blocks, shown to him as **showreels on his own footage**. **The showreels are idea generation: he is not editing those videos.** He
likes them and reacts by number ("29 is the best", "33 and 35 i dont like"). His reactions steer what gets built next.

## Where everything lives
| What | Path |
|---|---|
| The skill (workflow, rules, toolchain, gotchas) | `C:\Users\Amir\.claude\skills\cut\SKILL.md` |
| The kit | `C:\Users\Amir\.claude\skills\cut\kit\` : `kit.js` (all blocks), `kit.css`, `kit.py`, `template.html`, `assets/` (fonts, images, gsap, and `data/bodymap.js`, the app's traced body, made by `data/make_bodymap.py`), `sfx/` (11 sounds) |
| Kit docs | `kit\BLOCKS.md` (every block, options, when NOT to use it, his verdict), `kit\USAGE.md` (his taste, bench, showreel table), `kit\README.md`, **`kit\MENU.md` (how /cut and his Motion Menu are connected: read it before planning a reel)**, this file |
| Showreel build scripts and contact sheets | `kit\showreel\build_showreel.py` ... `build_showreel5.py` (5 takes a group: `diagram`, `curve`, `chapter`, `body`), `build_showreel6.py`, `showreelN-sheet-*.png` |
| Tools | `tools\` : `plan_to_clips.py`, `new_reel.py`, `shots.sh`, `sheet.py`, `framesheet.py`, `edgecheck.py`, `cutout.py`, `loud.py`, `sync2.py`; the Motion Menu set: `menu_read.py` (digest of his marks and ideas), `menu_find.py` (find an ingredient by a word), `menu_samples.py` (sample clips), `menu_patch.py` (page + marks), `menu_test_site.py` (local test copy) |
| Ideas bank and my next picks | `C:\Users\Amir\.claude\skills\cut\IDEAS.md` |
| His own list (an artifact) | **Motion Menu**, `https://claude.ai/artifact/REg9vwGxmf4pddShMtZemA`: **78 cards** (tidied from 224 on 2026-10-01) he marks Keep / Maybe / Drop, grouped by the job each does, every card with **When** and **How**; the kit's blocks, its sounds and his own ideas are all in it. His marks are in the page's db (`ArtifactData`, collection `marks`), the ideas he adds with **+ Add** in collection `adds`. The source is `kit\menu\menu.json` (version 2: the whole menu, plus `retired`). **Read `kit\MENU.md`**, including "Two pipelines, one page": the repo's `Content/motion/` built the first 183 items and must NOT be published over the live page |
| The first real reel's bespoke build | `examples\hctv3230\` |
| His raw clips | `C:\Users\Amir\Videos\Reels\raw\` (HCTV3230.MP4 is the only one so far) |
| Work and delivered files | `C:\Users\Amir\Videos\Reels\hctv3230\` (transcript, `HCTV3230_v1.mp4`, `cutout\full_cut_t.webm`), `kit-showreel\`, `kit-showreel2\`, `kit-showreel3\`, `kit-showreel4\`, `kit-showreel5\`, `kit-showreel6\` (each holds its `kit-showreelN.mp4`), `menu-samples\` (the Motion Menu's sample clips: `sN\` copies of the showreels without their labels, `out\clips`, `out\posters`) |
| Project memory (auto-loads in the Website project) | `C:\Users\Amir\.claude\projects\C--Users-Amir-OneDrive-----------GitHub-Website\memory\talking-head-reels-pipeline.md` and `feedback-creative-direction-style.md` |
| A backup of the whole skill folder | `C:\Users\Amir\Videos\Reels\_backup\cut-skill-2026-10-01-menu.zip` (the latest: with the Motion Menu connection, showreels 5-6 and stage 3; includes the contact-sheet PNGs). `cut-skill-2026-10-01.zip` is the earlier one |
| The repo mirror (GitHub) | `.claude\skills\cut\` in the website repo (`amirardekanian-crypto/Website`), made by `python tools\sync_to_repo.py`; it leaves out the contact-sheet PNGs |

## The six showreels and his verdicts (details: `kit\USAGE.md`)
1. **01-17** stamps, chips, ghost numeral, tag, question cards, checklist, the word behind him, cta, wipes. Loved 07-10 and 12.
2. **18-26** the depth family (poster, hollow giant word, drifting rows, halo, studio swap, focus) and the broadcast court. Loved 19, 20, 25, 26;
   good 18, 22 (he liked being smaller with type above); **benched 21**.
3. **27-38** number slam, number behind him, versus, the drum list, quote, three wipes, cut whip and zoom. **29 (number behind him on a dark
   studio, he sinks) is his best.** 30-31 versus and 32 the drum are "amazing"; 27-28, 34, 36, 37, 38 good; **benched 33 (quote) and 35 (whip wipe)**.
4. **39-40** the drum ON his own video (his idea) and another poster number. **"i loved 39", 40 was good.**
5. **41-49** the three families HE asked for (2026-10-01): the **diagram builder** (41 chain, 42 cycle, 43 on his video) and the **force-time curve**
   (44 one curve with its slope, 45 two curves and the time saved), **chapter labels** at the clay wipe (46 full card with an odometer, 47 a band on his
   video), the **body map** (48 muscles lit as he says them, the body turns round, 49 a joints chain, a pulse runs hip to knee to ankle). 88 s,
   `kit-showreel5\kit-showreel5.mp4`. **His verdict: 41-45 good (he prefers 43, on his own video, when the text fits), 46 very good, 47 preferred, 48-49 amazing.**
   The words and numbers are placeholders, the curves are a drawn idea, not data.
6. **50-52** the fit check he implied ("43 on my own video if the spacing and size of the text allows it"): `K.diagram` is now ON HIS VIDEO by default and picks a layout that
   fits (a row for short words, a 2 x 2 grid for four steps or a loop, a stack for his long phrases), shrinks the text to fit (never under 42 px) and warns when it cannot;
   `K.chapter` defaults to the band (47) and shrinks long titles. 24 s, `kit-showreel6\kit-showreel6.mp4`. **He liked 50, 51 and 52: "very nice".**

His taste in one line: big confident type, depth (type behind him), him smaller and lower with type above, his own room kept when possible,
full-screen statement cards with creative animation (3D, ghosts, odometer, drum), very few elements, strong easing.

## Working agreement with Amir
- Plain words, short sentences, no em-dashes. Concrete questions only. He answers by number. He asked "what do you call each of these?" (2026-10-01): the words we use
  (visual, motion graphic, block, overlay, card, lower third ...) are in `kit\README.md` "Words we use"; give him the plain name first and the trade word once.
- Per real clip: read it, transcribe (Whisper), analyse, give the PLAN with a few suggestions (my pick marked), wait for his "go", build, deliver
  with a short read-out. "just build it" skips the plan. For a showreel round: say what the round will contain, he says "go".
- Graphics only restate HIS words and numbers. The showreel words and numbers are placeholders, say so each time.
- Nothing is uploaded, paid for or generated by a cloud tool without a yes. No `snapshot --describe`, no `hyperframes cloud`.
- A shipped reel is never edited in place. His veto goes on the bench (kit\USAGE.md) and the code stays.
- Keep the top band y 230-470 free (his captions), his face clear by default, text between y 250 and 1600.
- **You are his creative director** (2026-10-01 evening): for every beat decide what the viewer has to SEE. **First read his Motion Menu** (`kit\MENU.md` section 1: the digest
  of what he marked Keep, Maybe and Drop, his notes and the ideas he added), then look it up in the **cue table at the top of `kit\BLOCKS.md`**, and use what fits. Suggest unasked: a curve (force over time, fatigue, adaptation) gets `K.curve`; a place in the body gets `K.bodymap`. Put a diagram, a chapter label or a
  list ON his own video when the text fits. Nothing fits? Create it, test it on his footage, **add it to his Motion Menu** (`kit\MENU.md` section 2: a record, a sample, a number) and say NEW in the plan. `kit\USAGE.md` rules 7-9.

## How to run a showreel round (the loop that worked)
1. Write or extend `kit\showreel\build_showreelN.py` (copy the structure of `build_showreel5.py`: demos with source windows, `T()`, `ev()`, a group argument).
   `python` (not `python3`), `PYTHONIOENCODING=utf-8`. Develop one family at a time (`python build_showreel5.py body`), then build all.
2. In `C:\Users\Amir\Videos\Reels\kit-showreelN`: `hyperframes lint public` must say 0 errors.
3. `bash C:\Users\Amir\.claude\skills\cut\tools\shots.sh <dir> "t1,t2,..."` writes snapshots and contact sheets. **Look at every sheet.**
4. Render detached (a tool call may not run longer than 10 minutes): PowerShell `Start-Process hyperframes.cmd -ArgumentList render,public,-o,out\showreelN_raw.mp4,--fps,30 -RedirectStandardOutput render.log ...`,
   then wait with a Bash background loop `until grep -aq "rendered in" render.log; do sleep 2; done`. About 1.5-2.5 minutes per minute of video.
5. Silent showreel: no loudnorm. Raise the sound-only track to a peak near -3 dBFS: `ffmpeg -i raw.mp4 -map 0:v -map 0:a -c:v copy -af volume=+1.8dB -ar 48000 -c:a aac -b:a 192k -movflags +faststart kit-showreelN.mp4`.
6. Check: `freezedetect`, black frames, then `python tools\framesheet.py <mp4> <png> "t1,t2,..."` and look at the frames of the FINAL file.
7. Send with `SendUserFile` (`display: attach`), a one-sentence caption, then a short read-out and ONE question: which numbers loved, which to bench.
8. Record his verdict in `kit\USAGE.md` and the Status column of `kit\BLOCKS.md`; update the project memory note.
The depth blocks (12, 18-24, 29, 40) need the speaker cut out of the clip once: `python tools\cutout.py <input.mp4> <out dir>` run DETACHED
(about 7 s per source second). For HCTV3230 it exists: `...\hctv3230\cutout\full_cut_t.webm`.

## Traps on this PC (all learned the hard way)
- Bash heredocs that contain quotes can fail: write scripts with the Write tool, then run them. `python3` is the Microsoft Store stub.
- PowerShell here blocks `Start-Sleep`; poll a detached job with a Bash `until` loop in the background or read its log between other work.
- ffmpeg is on the user PATH only for sessions started after the install; otherwise prepend `C:\Users\Amir\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin`.
- Never drive styles from `onUpdate` (Hyperframes seeks do not fire callbacks): tween CSS properties or CSS variables. More in SKILL.md "Known gotchas".
- Whisper mishears Farsi key words: confirm any number or term with him before it goes on screen.

## Open items, in order
1. **No verdict is pending** (he liked 50-52). Next is a real clip, planned with the creative-director lookup (`SKILL.md` steps 1-11, the Motion Menu digest, the cue table in `BLOCKS.md`), or another idea
   round if he asks. Open idea: the body map on his own video (it is a full card now: the figure is too small to read in the chest zone).
   **The Motion Menu was tidied on 2026-10-01 (224 items to 78 cards: same job in one place, what he will not use removed, duplicates merged, a When and a How on every card; his own Drops were respected).**
   Whatever he marks or adds there is the first thing to read next time (`menu_read.py`). An idea in collection `adds` with status `new` is a request: build it, give it the next number (226 and up), mark the add `built`.
   Anything he marks Drop leaves at the next tidy (`kit\MENU.md` section 3). The kit's CODE for the blocks he dropped (`K.halo`, `K.sweep`, `K.quote`, the whip wipe, the photo courts) is still in `kit.js` so the old showreels
   rebuild: cut it only if he says so.
2. **Settled:** "32 can be on the video itself" was the OVERLAY (39), and he loved it. The other reading (the footage itself rolling on a drum between two
   jump cuts) needs the clips to overlap for about 0.4 s (`plan_to_clips.py` has no `tail` yet). Build it only if he asks.
3. **My next picks** (`IDEAS.md`): a versus poster (the split as the studio behind him, a word in each half beside his head), a `K.poster`
   convenience block (studio + he sinks + one hero element), count-up numbers; then his own movement with force arrows (needs a test clip and a model
   download with his yes), a side panel, B-roll.
4. **The kit is too big** (about 50 blocks; the rule is 15-20 in use). Once he confirms, retire the photo courts, `K.halo`/`K.sweep` on the wall,
   `K.quote` and the whip wipe (list in `kit\USAGE.md` "Retire next"). Do not delete without his word.
5. **A real clip.** The workflow is `SKILL.md` steps 1-11. Start the reel with `python tools\new_reel.py <slug>`.
6. **Keep the repo mirror in step.** After changing this folder run `python tools\sync_to_repo.py`, then commit and push the mirror (`main`, by itself, one push at a
   time) only when he says "go live" (his word for pushing to main). Never edit the mirror directly. **`git fetch` first and bring the checkout up to date (`git merge --ff-only origin/main`)**:
   other sessions push to the same repo (on 2026-10-01 night it was 19 commits ahead, the Motion Menu's first builder among them), so read what came in before you push.

## What to say in a new chat
Open a new chat in the Website project (the project memory then loads by itself), or in any folder (the skill `/cut` is user-level, so it loads
everywhere). Then paste one of these.

*Continue the idea rounds:*
> Continue the /cut reel kit. Read C:\Users\Amir\.claude\skills\cut\kit\HANDOFF.md and kit\USAGE.md first. These showreels are idea generation, I am not editing the videos. My verdict on the last showreel: <numbers I loved / numbers to bench>. Then <build what you want next, or say "your picks">.

*A new real clip:*
> New clip: C:\Users\Amir\Videos\Reels\raw\<name>.MP4. Use /cut. Read the kit's HANDOFF.md and MENU.md (my Motion Menu: what I marked and added), read and transcribe the clip, then give me the plan with a few suggestions (your pick marked) and wait for my go.

*Only talk about it (no building):*
> Read C:\Users\Amir\.claude\skills\cut\kit\HANDOFF.md and tell me where we are with the reel kit and what you suggest next.
