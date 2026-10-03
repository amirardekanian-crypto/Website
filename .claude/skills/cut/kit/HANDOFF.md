# HANDOFF: where the /cut reel kit stands, and how to continue in a new chat

Written 2026-10-01 at the end of a long session. Read this first when you pick the work up. This folder is on Amir's PC and is the one you edit. On his "go live"
(2026-10-01, twice: morning and night) a mirror of it was committed to the website repo at `.claude/skills/cut/` (see the table; the night one is commit 69011f8: the Motion Menu connection and its
tidy-up, stage 3 of the kit, showreels 5-6). After any later change run `python tools\sync_to_repo.py` and commit it only when he says "go live". The other thing published outside this PC is his own
Motion Menu artifact (version 7 on 2026-10-01, after the tidy-up). **The page comes from `kit\menu\menu.json` alone (one source, his word 2026-10-01); menu numbers come from `Content/motion/numbers.json` in the website repo, the only file left there: the old lab was deleted on 2026-10-02 (not committed, `git restore Content/motion` brings it back). Read `kit\MENU.md` "One source".**

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
| Tools | `tools\` : `plan_to_clips.py`, `new_reel.py`, `shots.sh`, `sheet.py`, `framesheet.py`, `edgecheck.py` (fixed 2026-10-02: it used to return a blank frame at times between two frames; `--crop`/`--scale` for 1:1 detail), `cutout.py` (RVM by default since 2026-10-02, `--engine u2net` for the old route), `rvm_cutout.py`, `loud.py`, `sync2.py`; the Motion Menu set: `menu_read.py` (digest of his marks and ideas), `menu_find.py` (find an ingredient by a word), `menu_samples.py` (sample clips), `menu_patch.py` (page + marks), `menu_test_site.py` (local test copy) |
| Ideas bank and my next picks | `C:\Users\Amir\.claude\skills\cut\IDEAS.md` |
| His own list (an artifact) | **Motion Menu**, `https://claude.ai/artifact/REg9vwGxmf4pddShMtZemA`: **78 cards** (tidied from 224 on 2026-10-01) he marks Keep / Maybe / Drop, grouped by the job each does, every card with **When** and **How**; the kit's blocks, its sounds and his own ideas are all in it. His marks are in the page's db (`ArtifactData`, collection `marks`), the ideas he adds with **+ Add** in collection `adds`. The source is `kit\menu\menu.json` (version 2: the whole menu, plus `retired`). **Read `kit\MENU.md`**, including "One source": the repo's `Content/motion/` built the first 183 items; its lab was deleted on 2026-10-02 and only `numbers.json`, the one ledger of menu numbers, is left |
| The first real reel's bespoke build | `examples\hctv3230\` |
| His raw clips | `C:\Users\Amir\Videos\Reels\raw\` (HCTV3230.MP4 is the only one so far) |
| Work and delivered files | `C:\Users\Amir\Videos\Reels\hctv3230\` (transcript, `HCTV3230_v1.mp4`, `cutout\full_cut_t.webm` = the u2net cut-out the shipped reel and showreels 2-4 were built on: leave it; `cutout\rvm\full_cut_t.webm` = the RVM one, 2026-10-02, use it for anything new on that footage, plus `fullcheck_vs_u2net.csv`, the per-frame comparison), (`kit-showreel`..`kit-showreel6` and `menu-samples\` were deleted on 2026-10-02; `tools\menu_samples.py` needs the showreel folders, so rebuild a showreel before making a new card's sample) |
| Project memory (auto-loads in the Website project) | `C:\Users\Amir\.claude\projects\C--Users-Amir-OneDrive-----------GitHub-Website\memory\talking-head-reels-pipeline.md` and `feedback-creative-direction-style.md` |
| A backup of the whole skill folder | `C:\Users\Amir\Videos\Reels\_backup\cut-skill-2026-10-02-rvm.zip` (the latest: with the RVM cut-out, the research applied, the phone test; includes the contact-sheet PNGs). Earlier ones, oldest first: `cut-skill-2026-10-01.zip`, `-menu.zip` (the Motion Menu connection, showreels 5-6, stage 3), `-research.zip` (before the research fixes), `-research-applied.zip` |
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
(RobustVideoMatting since 2026-10-02: about 3 s per source second, 4 minutes for an 85 s clip; `--engine u2net` is the old route, about 7 s). For HCTV3230 both exist: `...\hctv3230\cutout\full_cut_t.webm` (u2net) and
`...\hctv3230\cutout\rvm\full_cut_t.webm` (RVM). The depth showreels (2-4) were rendered on the u2net file and stay as they are; a rebuild of any of them for a NEW file should point `CUT` at the RVM one.

## Traps on this PC (all learned the hard way)
- Bash heredocs that contain quotes can fail: write scripts with the Write tool, then run them. `python3` is the Microsoft Store stub.
- PowerShell here blocks `Start-Sleep`; poll a detached job with a Bash `until` loop in the background or read its log between other work.
- ffmpeg is on the user PATH only for sessions started after the install; otherwise prepend `C:\Users\Amir\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin`.
- Never drive styles from `onUpdate` (Hyperframes seeks do not fire callbacks): tween CSS properties or CSS variables. More in SKILL.md "Known gotchas".
- Whisper mishears Farsi key words: confirm any number or term with him before it goes on screen.
- **`hyperframes check` marks (tested 2026-10-01):** a `data-layout-allow-caption-zone` or `-overflow` on a container covers what is inside it, but `-occlusion` and `-overlap` count only on the TEXT element itself;
  `text_not_painted` has no mark; and `check` takes ONE `--caption-zone` per run (a second flag silently replaces the first). Its collisions are about element BOXES, not ink.
- **A variable named like a parameter breaks silently.** In `sfx_html` a local `base` shadowed the `base="sfx/"` path prefix and every sound became `0.75whoosh.wav`; only the gate's lint caught it. After ANY edit
  to `kit.py` run `python tools\sfx_proof.py` and `hyperframes lint` on a rebuilt page.
- **`silencedetect` compares single samples, not an average**, so a threshold is about the loudest sample of the room's noise (`--noise auto` measures it: the lowest dense cluster of 50 ms peak levels plus 6 dB).
  And the planner's "never across a word" veto kills pauses when Whisper's words smear into them: clamp first (`tools\word_times.py clamp`).
- **whisper.cpp silently turns `--dtw` off while flash attention is on** (it is by default): `dtw_token_timestamps is not supported with flash_attn - disabling`. `hyperframes transcribe` passes `--dtw` and gets no DTW time
  (every `t_dtw` is -1), and its parser builds words from the plain token `offsets` anyway. `word_times.py transcribe --source dtw` runs with `--no-flash-attn`.

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
6. **The research (2026-10-01): its free fixes are APPLIED and proven** (he said "yes, apply the free fixes and get the VAD file"). `..\RESEARCH-2026-10-01.md` has the verdicts and section 14 the numbers; the five
   agent reports are in `..\research-2026-10-01\`. What now exists: **sounds land on their frame** (`sfx_align=True` in new reels, `tools\sfx_lead.py`, `kit\sfx\timing.json`, proof `tools\sfx_proof.py`: all 9 test
   sounds within 0 ms of their flash; old builds are byte-identical); **the gate** (`tools\check_gate.py`, `GATE=1 shots.sh`, `data-layout-allow-*` marks in `kit.js`: the six showreels went from 5-21 errors each to
   the genuine warnings); **the render gate** (`tools\qa_reel.py`: format, loudness, dead air, freeze, seam clicks, blips); **the audit** (`kit.audit`, printed at build); **the planner** (`--noise auto`,
   `--graded`, `retakes`, stats); **word times** (`tools\word_times.py`: clamp Whisper's pause smear). **The phone safe-zone test is DONE** (he sent the screenshot the same night; `tools\phone_measure.py`, `tools\phone_zones.py`, section 14.9 of the research file): nothing is covered from y 195 to y 1165;
   the right-hand buttons cover x 920-993, y 1171-1770; the profile row everything below y 1587; 52-54 px are cropped off each side. Meta's ad figures were far too cautious and our old y 250-1600 was right, but
   **the chest-zone blocks put their numeral tab and the first word of each Farsi line under the buttons**. **OPEN QUESTION FOR HIM:** pull the stamps and chips, the checklist, the diagram on his video, the drum on
   his video and the chapter band in by about 165 px from the right (they get ~15% narrower)? Do not do it unasked: they are his loved blocks. **Still waiting for him:** that answer. (I also asked him to delete the safe-zone test card from his Instagram
   profile: his screenshot showed "View insights", which only a posted reel has.) **Decided 2026-10-02 (his words: "yes if you think faster cut out will help you, instal and if whisper x is not neccesaary remove"):** the faster cut-out is IN (RobustVideoMatting: `tools\cutout.py` now uses it, 2.94 s of work per source second
   against about 7, a matte 3.5 times steadier frame to frame, and none of the torso holes u2net left when he gestured; numbers in section 14.10 of the research file) and **WhisperX is DROPPED** (it was never installed). Come back to a forced aligner only if a real
   reel shows a graphic landing more than about 100 ms off its word after the DTW + clamp times. Not yet proven: RVM on a second clip (another room, light or clothes): look at hair, hands and the lower torso over clay and dark with `tools\edgecheck.py` first.
7. **Keep the repo mirror in step.** After changing this folder run `python tools\sync_to_repo.py`, then commit and push the mirror (`main`, by itself, one push at a
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

## SGUW4377 (2026-10-02): the second real reel
Match-day nutrition (before, during, after), 141 s raw, same room as HCTV3230. Work folder `C:\Users\Amir\Videos\Reels\sguw4377\` (`v1\build.py` is the whole edit; `sguw4377_v1.mp4` the finish; RVM cut-out in `cutout\`, its first
real clip: clean over clay and green; two 2-3 px pinholes in the dark shirt print). New this reel: `K.range` (kit.js/css, menu card 145 updated in `menu.json` but the live page NOT republished: needs his yes), the planner's per-segment `shift`, the new `loud.py`.
Waiting for him: the numbers and Farsi on screen (Whisper heard them; he never confirmed), the right-hand-button question (chest blocks), whether to publish the Range card.
