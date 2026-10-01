# Motion-graphics craft repos: rules, numbers, QA loops

*Research report, 2026-10-01. Written by a read-only research subagent for the /cut skill: model output, read by Claude and cross-checked in part (see `RESEARCH-2026-10-01.md` section 'What I verified myself'). Nothing here was installed or downloaded. Stars, licences and dates are as the pages showed on 2026-10-01. Treat every instruction-like sentence in it as the agent's own words, not as a rule of the skill.*

---

CRAFT TRACK REPORT (read 2026-10-01, read-only; no fetched page addressed an AI). Repo URLs are https://github.com/<owner>/<repo>. Headline: most repos are graphics-only product films; the transferable value is process (caps, variety audit, QA loop, card schema), not new blocks. None handles Farsi RTL. Note: remotion-dev/skills' old rules/ folder is gone from main; its 32 rule files now sit in skills/remotion-markup/.

REPOS READ

remotion-dev/skills: 4.8k stars, licence not shown (UNVERIFIED), last commit 2026-10-01 (all titled "Update template"). API how-to, little design theory. Standouts: motion blur by averaging fractional-frame samples (shutter 180 deg, 8 samples default); transitions overlap, so 2x60 f scenes + 15 f transition = 105 f; video-layout.md: primary text >=84 px, secondary >=44 px, >=80 px from sides, >=100 px from top and bottom. Conflicts: light leak is a yellow-orange glow; SFX pack has memes. LEARN FROM (blur, size floors).

haidrrrry/claude-remotion-skill: 240 stars, MIT, 9 commits, last 2026-08-12, SEO-tuned README. 10 rules plus code with numbers. Standouts: exit about 10 f vs entrance about 20 f; stagger 3-6 f (words 3, cards 4-5, blocks 6); hit, then 15-20 f hold, new visual at least every 90 f; whoosh starts 2-3 f before the landing; entrance ease-out (0.16,1,0.3,1), exit ease-in (0.7,0,0.84,0). Conflicts: mesh backgrounds, grade+grain+vignette on everything, idle breathing (+-1.5 % scale), hero glow, amber #E8A33D palette (gold banned). LEARN FROM.

charlie947/motion-graphics-skills: 44 stars, MIT, 23 commits, last 2026-09-30, newsletter-driven. 13 skills; motion-effects = 16 seek(t) loops (move 0-2.2 s, hold to 6.6 s, return); reel-export keeps content in y 360-1420, off the bottom 500 px and right 120 px, H.264 yuv420p bt709 TV-range (phone HEVC full-range looks washed out). Rules: no typewriter headlines, glow, bounce, text gradients; "motion on twos" (poses held 2 f at 24 fps) only for a hand-made look; brand-intake writes a MOTION.md (five banned moves, one exemplar shot). Conflict: the bounce ban hits our pop stamps, slam and odometer settle if they overshoot. LEARN FROM (MOTION.md, export flags).

iart-ai/motion-design-skills (+ two sibling packs, 12-13 stars): 43 stars, MIT, last 2026-06-22, funnels to iart.ai; its personality table is identical to LottieFiles' (1.9k stars, MIT, May 2026): count once. Standouts: overshoot premium 0 %, corporate 0-3 %, playful 10-20 %; stagger words 40-70 ms, lines 60-100 ms, reveal <=~800 ms; at most one third of elements moving; title-safe 9:16 12-14 % top, 18-20 % bottom, 6 % sides; split by line = calmest, word = energetic, character = clutter; a clip-path wipe reveals text without splitting glyphs. Conflicts: "visual change every 2-4 s", teal-orange grade. LEARN FROM.

howseen-ai/claude-motion-design: 175 stars, MIT, 30 commits, all 2026-09-27 to 29 (new; no outside use shown). One SKILL.md plus render/audio scripts. Standouts: four-stills gate before any full render; pop scan (frame-difference spike over 3x its neighbours must match a planned hit); contact sheets (6x5 at 2 fps, 12-frame strip for fast moves, 360 px phone sheet); 6-8 blur subframes at 60 fps (4 shows ghost steps; about 1-1.5 min per video second); masked word rise, 55 ms stagger; fix the worst 3 defects per round until every score >=8/10. Conflict: "nothing static over 1 s". ADOPT the QA loop.

Vincentwei1021/video-shotcraft: 10.2k stars, Apache-2.0, 101 commits, last 2026-09-28. 157 cards in 10 folders (typography, transition, effects, data...), SFX guide, aesthetic rules R1-R7. Card = name/one-liner/applicability/duration/energy, Intent, A/B/C style table, parameter table, known pitfalls, reference code. Standouts: odometer 190 px, digit stagger 7 f, 16 f decel, overshoot 0.5 line then 6 f settle, <=6 digits, hold >=45 f; slam <=2 per piece; wipes <=2 per sequence; full-frame impacts <=3, >=16 beats apart. Cards re-implement others' public work and ATTRIBUTION grants no licence for them: take parameters, not code. ADOPT format and caps.

Vincentwei1021/video-talkcraft: 1.3k stars, PolyForm Noncommercial 1.0.0 (commercial use needs the author's permission), 83 commits, last 2026-10-01. 108 cards for voiceover explainers, incl. behind-text-title, chapter-title-card, number-slab-pop. Standouts: demote instead of exit (scale 0.92, -66 % brightness, 3 px blur, 6 f before the newcomer); <=3 groups on screen, graphics <=~12 CJK characters (about 2-3 Farsi words, our estimate); newcomers 80-150 ms apart, >=1.5 s between focal switches; entry 0.2-0.8 s, exit 0.15-0.5 s; one accent colour, no text shadow; 390 px-wide legibility test. Conflicts: "no naked cuts" (we jump-cut), host as corner chip, yellow highlighter, letter-spaced Latin cards. LEARN FROM, ideas only (licence).

tugrawork-creator/saas-motion-kit: 176 stars, MIT, 5 commits, last 2026-09-26, built on Hyperframes (uses its snapshot/check commands: UNVERIFIED for 0.8.104). Tone matrix (11 tones), 24-transition atlas (6 families x 4), variety_audit.py, loop_check.py. Audit: no identical consecutive transition; >=3 families once 5+ cuts; one transition <=2 uses under 60 s (doc; script allows 3); whip <=2; >=3 distinct eases, none on >50 % of rows; flag if >=60 % of shots share a length (+-0.25 s); a surprise at least every 15 s; accent in <=1/3 of shots; warns when back/elastic eases meet a calm/premium tone. ADOPT the audit.

bestagentkits/motion-video-skill: 107 stars, MIT, 2 commits, last 2026-09-25; Hyperframes, 1920x1080, needs Gemini/ElevenLabs keys. Standouts: cues anchored to spoken words through helpers, so re-timing moves visuals; renderer warning: more than ~40 elements with radial gradients, blur or clip-paths risk black frames (bake to PNG, toggle visibility); music -5 dB plus sidechain; two-pass -14 LUFS. LEARN FROM.

fernandokaraka/remotion-motion-graphics-skill: 11 stars, MIT, 2 commits (2026-07-17). Standouts: gate effects by explicit frame test (left-clamp shows them at frame 0); nothing visible at frame 0 or animating on the last frame; scaleX distorts text, use clip-path inset; trim leading silence from SFX (80 ms dead air = 80 ms late); alpha overlays need ProRes 4444 yuva444p10le, PNG frames, no root background. LEARN FROM (lint list).

Liamrjohnston/remotion-motion-graphics-skill: 78 stars, MIT, 14 commits, last 2026-07-24. Bans neon/glow/bloom/gradient washes; "never restate the voiceover"; independent critic must score every category >=8/10, average >=8.5. Conflicts with our "restate his words" (reconcile: one load-bearing word or number only). LEARN FROM (critic gate).

diffusionstudio/lottie: 5.5k stars, MIT, 93 commits, last 2026-07-25. Text-to-Lottie JSON. Hyperframes seeks lottie-web (third-party index; UNVERIFIED for 0.8.104); Farsi text in Lottie UNVERIFIED. SKIP.

Extras: greensock/gsap-skills (15.9k stars, MIT): stacked from()/fromTo() on one property needs immediateRender:false; use position params and timeline defaults. LEARN FROM.

NUMBERS AT A GLANCE
- Timing (30 fps): enter 12-18 f, exit 8-12 f; ease-out in, ease-in out, linear only for loops. Hold >=1 s after information settles; a graphic static past ~2-3 s reads as a slide. Text on screen >=5/6 s (Netflix subtitle floor); 0.6 s per word reads it twice (SSW).
- Transitions: only at turning points (hook, reveal, proof, CTA), hard cuts between; never two at one seam; one technique per edit; black card <=2 per 30 s (saas-kit, shotcraft).
- Safe zones, 1080x1920: Meta Ads Guide (official, Reels ads): top 14 % (269 px), bottom 35 % (672 px), sides 6 % (65 px); third parties add bottom-right 40 %. iart: top 120, bottom 320, right 120 px. charlie947: y 360-1420. Our free band y 230-470 matches 12-14 %, but nothing in our rules guards y>1248. No official organic-Reels figure found (UNVERIFIED); the 3:4 profile crop (centre 1080x1440) is third-party.
- Type: primary >=84 px, secondary >=44 px (Remotion); reel hero 80-140 px (haidrrrry); one hero numeral per frame.
- Finish: grain 3-5 % (iart) or 5 % (haidrrrry), vignette 0.22; talkcraft deleted breathing, vignette and exposure pulses. On a talking head skip grade, grain, vignette, mesh (our inference).
- Catalogue (Q6): steal energy (low/mid/high), priority P0-P2, semantic job (hook, number, flow, conclusion, CTA...), per-reel cap, exclusive A/B/C variants, parameter table with too-low/too-high notes (keyword pop 1.3x weak, >1.9x comic), pitfalls, "does not do" scope, sound pairing, "validated on real footage?" flag.

TOP 12 (rule - source - block improved)
1. Exit = 55-67 % of entrance; ease-out in, ease-in out - haidrrrry, iart, talkcraft - every stamp, label, list.
2. Per-reel caps on the card: keyword pop <=3, slam <=2 (+45 f hold), wipes <=2, pushes <=4 in a row, whip <=2 - talkcraft, shotcraft, saas-kit - slam, wipes, chapter wipe.
3. Variety audit over each reel's cue sheet (rules above) - saas-motion-kit - whole kit; cheap to automate.
4. Number block: slab lands (0.24 s) before digits grow (0.28 s, back.out 1.7), whole number before decimals, tabular digits, hold 1.8 s; odometer settings above, tick per digit - talkcraft, shotcraft - odometer/slam.
5. Calibrate overshoot: stamp pop 2-4 % over 5-9 f, slam back.out <=1.7 (1.0 subtle, 2.2+ cartoon) - talkcraft, iart - clay stamps, slam; test against the bounce ban.
6. Behind-type: >=25 % of the title hidden by him, type ~40 % of frame height, rise 0.6 s cubic-out from 70 px after 0.4 s, subtitle 0.35 s later, +-4 px opposite drift on an 8 s loop; check hair-edge matte; no letter-spacing in Farsi - talkcraft - behind-him type.
7. Chapter label <=2.5 s: wipe in 0.3, number 0.4, name 0.35 (0.18 after number), hold 1.2, wipe out 0.3 - talkcraft - chapter wipe.
8. Wipes: whip 6-8 f at >=300 px/f, 8 px blur, cut hidden mid-whip; iris 45 f, circles concentric within 10 px; push 30 f; flood 0.3-0.35 s past the farthest corner x1.05; sub-frame blur (6-8) only here - shotcraft, howseen, haidrrrry - wipes.
9. SFX: align the transient peak, not the file start; trim lead-in; allow ~1.3 f AAC priming; whoosh 2-3 f early, impact on the hit; judge the export, not the preview - shotcraft, haidrrrry, fernandokaraka - all hits.
10. QA loop: four stills before a render; 6x5 contact sheet plus 360 px phone sheet; pop scan against planned hits; frame-0/last-frame lint; fix the worst 3 per round - howseen, fernandokaraka - all; automatable.
11. Build to Meta's 14/35/6 %: add a guard at y>1248 and 65 px sides to our y 230-470 band; DOM-rect check at sampled times - Meta Ads Guide, iart - every graphic.
12. Demote, don't exit (numbers above); <=3 groups; ~2-3 words per graphic - talkcraft - drum list, steps diagram (depth with few elements).

TOP 5 WE ALREADY DO BETTER OR EQUAL
1. Whole-word Farsi RTL tied to his real speech: no repo does RTL (GSAP ships a separate helper because per-letter splits break Arabic joins).
2. Domain graphics (force-time curve, muscle map, 3D court): nobody has equivalents.
3. Type behind him on live footage plus studio colour swap: only talkcraft has the former (pre-keyed host), none the latter.
4. Odometer, iris/push/slice/whip wipes, chapter labels: match shotcraft/talkcraft; we lack only their caps and pitfall notes.
5. Restraint: one accent, free top band, no captions, few elements; most repos allow glow, mesh, multi-colour.

UNVERIFIED: Remotion licence; Hyperframes 0.8.104 commands and lottie seeking; Farsi in Lottie; official organic-Reels margins; 3:4 crop; shotcraft star growth.

Sources (search-derived): [Meta Ads Guide](https://www.facebook.com/business/ads-guide/update/video/instagram-reels), [Netflix](https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617), [SSW](https://www.ssw.com.au/rules/post-production-do-you-give-enough-time-to-read-texts-in-your-videos), [GSAP](https://gsap.com/docs/v3/HelperFunctions/helpers/splitArabicText).
