# Talking-head and short-form editing repos: cutting logic and QA

*Research report, 2026-10-01. Written by a read-only research subagent for the /cut skill: model output, read by Claude and cross-checked in part (see `RESEARCH-2026-10-01.md` section 'What I verified myself'). Nothing here was installed or downloaded. Stars, licences and dates are as the pages showed on 2026-10-01. Treat every instruction-like sentence in it as the agent's own words, not as a rule of the skill.*

---

# Track report: talking-head and short-form editing repos
Read 2026-10-01 from raw GitHub files (SKILL.md, references, key scripts). Stars and dates are as the pages showed.

## Repos read

**1. browser-use/video-use** (https://github.com/browser-use/video-use) 27.8k stars, MIT, last commit 2026-09-24. Read SKILL.md, README, helpers/render.py, pack_transcripts.py, timeline_view.py. A 12-rule EDL cutter.
- Snap edges to word boundaries and pad 30-200 ms (ASR drift 50-100 ms); 30 ms fade at every cut. Gaps >=400 ms are safe, 150-400 ms need a visual check, <150 ms unsafe.
- Self-check +/-1.5 s around each seam, max 3 passes. timeline_view = one PNG (10 frames, waveform, silence shading >=0.4 s, word labels).
- Conflicts: ElevenLabs Scribe required (cloud); calls local CPU Whisper an anti-pattern; burns captions.
- LEARN FROM: rules and QA, not the ASR.

**2. hassancs91/claude-youtube-editor** (https://github.com/hassancs91/claude-youtube-editor) 318 stars, MIT, 2026-08-18. Read CLAUDE.md, clean-cut, suggest-sfx, tools/cutlib.py, analyze_cut.py, mix_sfx.py. Measured, not hype.
- Tail = walk a 50 ms RMS envelope to floor (10th percentile) +5-6 dB, tails 0.14-0.45 s; lead-in 0.15-0.18 s (0.11 s clipped 14 onsets). "Hard entry" = RMS in the 50 ms before a cut >15 dB over floor.
- ASR failure modes: late start, inflated span (hid 5.24 s of silence), merged repeat, phantom token. Doubled phrase: cut the first occurrence. Spoken "other take" supersedes earlier runs.
- verify_cut re-transcribes the render and diffs extra/missing words; video and audio stream durations must match. SFX 8-12 cues/min; sidechain 2:1, 5/200 ms.
- Conflicts: AssemblyAI, ElevenLabs, Gemini. ADOPT the logic, rebuild locally.

**3. krusemediallc/video-editor-agent** (https://github.com/krusemediallc/video-editor-agent) 22 stars, no LICENSE file in the root listing (ideas only), 2026-09-29. Read CLAUDE.md, reel-recut, edl-tighten, video-qa, sound-design, talking-head-image-overlays, video-edit-pipeline. HyperFrames-based, real session log.
- Two gap detectors: silencedetect -38 dB d=0.22 plus 50 ms RMS for breathy lulls (-28..-36 dB); keep 0.10-0.15 s pause; cut end <= onset minus one frame; round edges inward to the frame grid.
- Audio in one ffmpeg graph with 10 ms fades (hard joins clicked on 47/116 seams; per-segment AAC added 6.3 s). Never cut audio and video separately (367-412 ms drift in 180 s). Stutter tell: function word >0.6 s.
- QA tiers with exit codes; auto-fix whitelist (nudge <=500 ms, gain <=3 dB, fade 25-30 ms, <=3 rounds); 3 frames per graphic at 10/50/90%; judge legibility at ~390 px; remap timestamps by code, never re-whisper.
- Conflicts: ElevenLabs SFX/music, optional Gemini QA. ADOPT ideas: closest match to our stack.

**4. louisedesadeleer/cut-video** (https://github.com/louisedesadeleer/cut-video) 104 stars, MIT, 2026-07-09. Read SKILL.md, make_review.py. Fully local (Whisper plus Montreal Forced Aligner); dated lessons.
- Whisper times err +/-100-300 ms, MFA 10-20 ms. Silence threshold = measured floor +6 dB, never fixed; if speech minus floor <8 dB, energy detection is unusable.
- Gap table (balanced): 0.25-1 s to 0.3 s, 1-3 s to 0.8 s, >3 s to 0.5 s; onset pad -0.03 s, offset +0.04-0.08 s; trim in-take gaps >0.2 s to ~0.1 s, keep rhetorical pauses >=0.15 s.
- Retakes: 4-gram similarity >0.7 within 60 s, 3-gram >0.8 within 3 s; keep the LAST take; list groups for override. Whisper collapses retakes, so re-transcribe each kept region in isolated windows (1-6 s drift measured). Benchmarks: median cut 1.1-1.5 s, 40-60% cut.
- Conflicts: English-only MFA models, macOS. ADOPT: retake logic, floor calibration, ground-truth windows.

**5. kurbaitaev/ghost-editor** (https://github.com/kurbaitaev/ghost-editor) 63 stars, MIT, 2026-09-24 (5 commits, looks exported from a private repo; 3 real reel.json). Read SKILL.md, four references, autocut.py, build.mjs, qa.py, safezone.mjs, face_track.py, transcribe.py. HyperFrames + Whisper + OpenCV.
- Take table with restart marks; later fluent take wins; take start = first word -0.10-0.15 s, end = last word +0.20-0.30 s, never past the next word; snap-zoom between takes, no crossfade; 2/3-frame audio fades. autocut: -35 dB, 0.28 s, keep 0.10 s.
- Sound vs voice p95: ui -14, whoosh -12, impact -8 dB; subtle 6-12/min; lint warns at >14 hits/min. qa.py: 1080x1920, duration +/-0.2 s, -17.5..-12.5 LUFS, silence >0.8 s inside speech, SFX stems.
- Shipped reel: 53 s, 16 takes, 3 pushes at z 1.07-1.08, 5 scenes.
- Conflicts: builds captions, meme rips, yellow highlight, example reaction slot at y=240. ADOPT QA and lint.

**6. manthanpatelll/leadgenman-video-skills** (https://github.com/manthanpatelll/leadgenman-video-skills) 17 stars, MIT, 2026-05-31 (3 commits, no sample outputs). Read produce SKILL.md, engine/roughcut.py, reel-overlay SKILL.md.
- 10 ms RMS chunks (merge gaps <0.3 s, min 1.0 s, keep breath gaps <=1.5 s), each chunk transcribed alone; retake if token_sort_ratio >60, content-word overlap >0.60, or opener contained in a later chunk (<=3 s); keep last; pad 50 ms; 30 ms fades.
- Overlay: 8-14 beats per 30-60 s, <=4 words each, top-half-only layout (clashes with our band).
- Conflicts: OpenAI Whisper API. LEARN FROM the retake code.

**7. naive-kun/naive-video-skill** (https://github.com/naive-kun/naive-video-skill) 130 stars, MIT, 2026-08-11. Read SKILL.md, rough-cut, motion-recipes, quality-gates, layout-safety, content-logic, video-use-integration. Process-heavy; cutting delegated to video-use.
- 15 recipes with timings (impact-pop 450-1200 ms, counter-roll 700-1800, stagger-list 900-2800); intent-to-recipe table; static keyframe review before any dynamic render; never claim word precision from cue-level times.
- Conflicts: allows per-character reveals (never for Farsi). LEARN FROM: recipe table, keyframe review.

**8. adriiita/vertical-video-editing-skill** (https://github.com/adriiita/vertical-video-editing-skill) 10 stars, MIT, 2026-06-20 (1 commit, new). Read SKILL.md. HyperFrames.
- No static-talking-head hook; zoom 1.0 to 1.12 over 2-3 s, pan +/-1.5%; whoosh 10-20 ms before the move, impact on the hit frame with 10-40 ms pre-roll, -18..-12 dB under voice; +/-15 ms audio crossfade at re-joins.
- RTL: dir=rtl, one element per language, local woff2, no font CDN. LEARN FROM: motion and SFX numbers.

**9. YeJe-cpu/SeeCut** (https://github.com/YeJe-cpu/SeeCut) 188 stars, PolyForm Noncommercial, 2026-09-30. Read SKILL.md, geometry and SFX specs. Mandatory Gemini (Antigravity) QA, HeyGen, Doubao: breaks the cloud rule.
- Geometry check in one page.evaluate: overlap >15% fail, face covered >8% fail, no face >5 s fail. SFX: pop on appearance, impact +120 ms, whoosh -80 ms, <=2 cues/3 s, -16..-11 dB vs voice peak, hook cue <=0.5 s, <=50 ms tolerance. LEARN FROM, ideas only.

**10. Agentchengfeng/chengfeng-videocut-skills** (https://github.com/Agentchengfeng/chengfeng-videocut-skills) 3.0k stars, Apache-2.0, 2026-09-20, 144 commits. Read README, cut/subtitle/visual SKILL.md (Chinese). Engine is a separate closed runtime (UNVERIFIED).
- Five scan passes (repeats, fragments, mis-speak plus fix, foreign-word stutter, fillers); cuts keyed to immutable word IDs; overlay/subtitle times computed from the edit list, never re-transcribed; skip overlays when the picture already says it (4 of 13); zoom <=1.6x.
- Conflicts: cloud ASR only, as read. LEARN FROM: the word-ID model.

**11. jackjls/jtxvideo-skill** (https://github.com/jackjls/jtxvideo-skill) 5 stars, MIT, 2026-06-26. HyperFrames pitfalls: one continuous muted base video plus separate audio (re-mounted slices froze), keyframes every 30 frames, hyperframes inspect --samples 12. Animate only 2-3 core beats. Gold palette conflicts. LEARN FROM.

**12. jincheng2026/jc-remotion-skills** (https://github.com/jincheng2026/jc-remotion-skills, branch master) 14 stars, CC BY-NC 4.0, 2026-08-22. Read README, assembly, sfx, gotchas, subtitle, rhythm. SFX: >=2.5 s per cue, one sound <=35% share, <=2 heavy impacts; concat with -c copy drifts; font-race fallbacks. LEARN FROM, ideas only.

**13-15, minor.** claude-shorts (217 stars, MIT, 2026-04-10): long-form clipper; end pad 300 ms, IG safe area top 210/bottom 340/right 100; yellow word. SKIP. MotionTalk (12 stars, CC BY-NC-SA, 2026-08-06): SRT in, Remotion; each cue carries a testable invariant proven by an evidence frame. SKIP. znyupup/ai-video-editing-skill (139 stars, MIT, 2026-04-27): vlog tool; auto-repair start -0.1 s/end +0.2 s. SKIP.

**Awesome-list finds.** misbahsy/tiktok-ig-shorts (11 stars, HyperFrames): visual change every 2-4 s, hook text y>=320, 1-3-word groups, hyperframes check --snapshots at every beat; LEARN FROM. JJKoubo (33 stars, CC BY-NC): local Whisper medium, hook-strategy gate; light. iart-ai/tiktok-video-skills: generic, unverified stats; SKIP. FireRed-OpenStoryline (3.5k, Apache) and OpenChatCut (2.1k, AGPL): full apps with cloud features; SKIP. Official HyperFrames talking-head-recut does no cutting (graphics only).

## Cross-cutting
Cloud ASR/audio in video-use, hassancs91, leadgenman, chengfeng, SeeCut, krusemedia: take the logic only. Noncommercial licences (MotionTalk, jc-remotion, JJKoubo, SeeCut): ideas only. No repo gives speed-change rules for talking heads. Whisper word ends overshoot into pauses by 0.1-0.4 s, long words hide pauses, full-file passes collapse retakes, fillers vanish from transcripts. Only adriiita has RTL notes. Persian MFA model: none found in its docs (UNVERIFIED). ctc-forced-aligner (566 stars, default MMS model CC-BY-NC) Farsi: UNVERIFIED. whisper.cpp README lists --vad (Silero) and a cross-vendor Vulkan backend; DTW not mentioned (UNVERIFIED).

## TOP 12 adoptable ideas
1. Envelope-refined edges (hassancs91, krusemedia, ghost). After silencedetect, keep 0.15-0.18 s before the first energy jump, walk the tail to floor +5-6 dB, keep 0.10-0.15 s of room, round inward to frames. Whisper times are hints only.
2. Floor-calibrated detection (cut-video, krusemedia). Replace fixed silencedetect: threshold = 10th-percentile floor +6 dB, plus an RMS scan for lulls; fall back to word gaps when speech minus floor <8 dB.
3. Graded gap compression (cut-video). Presets map gap length to kept length instead of delete-all; report median cut, percent cut and cuts per minute against benchmarks.
4. Retake pass, run before the silence pass (leadgenman, cut-video, hassancs91). VAD chunks, transcribe each, normalise Farsi letters and half-spaces, apply the similarity rules, keep last, show groups. Add a spoken slate word that supersedes the previous run.
5. Ground-truth windows and stutter tells (cut-video, reel-recut). Re-transcribe 10-16 s around boundaries; flag function words >0.6 s, kept words >1 s, edge silence >0.35 s, confidence <0.70.
6. One-graph audio rebuild (krusemedia, video-use). atrim+afade 10 ms per keep (30 ms on noisy seams) in one graph, same CFR grid for video; muted video plus separate audio, keyframes every 30 frames.
7. Zoom grammar and hook (ghost, adriiita, misbahsy, SeeCut). Planner alternates framing at kept cuts (z 1.07-1.12, 0.4 s push), a visual change every 2-4 s, uneven; hook gets a pattern interrupt and a cue within 0.5 s.
8. Layout lint on the HyperFrames DOM (SeeCut, ghost, jc). Tag elements; at sample frames fail on overlap >15%, face covered >8%, any box in y 230-470; YuNet face box at 5 fps.
9. SFX plan from graphic hit frames (ghost, SeeCut, hassancs91, jc). Pop on the frame, impact +120 ms, whoosh -80 ms; ui -14, whoosh -12, impact -8 vs voice p95; 6-12 per minute, >=2.5 s apart, one sound <=35%; no low impacts on key words; adelay+amix normalize=0, 2:1 duck, limiter, voice normalised first, -14 LUFS.
10. Render gate (ghost qa.py, video-qa, hassancs91). Size, duration +/-0.2 s, equal stream durations, loudness/true peak, silence >0.8 s in speech, freezedetect, seam-click scan, exit codes; plus hyperframes lint, inspect --samples 12, check --snapshots.
11. Seam sheets for Claude (video-use, naive, krusemedia). Per-seam +/-1.5 s composite, 24-frame contact sheet, isolated 5.5 s re-probe of suspect seams, never re-whisper the whole render, max 3 fix rounds.
12. One edit list, word-bound graphics (chengfeng, edl-tighten, make-tsx). Single EDL against the original; remap graphic and SFX times by code; start each graphic within 0.2 s of its word's onset, never before it is said.
