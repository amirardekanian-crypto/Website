# Ingredients for later

Amir's list, sent in chat on 2026-10-01 after he saw the Motion Menu. His note on it: **these are the ingredients, not the recipe.**
A recipe is one video's plan: for each sentence, which ingredient, which sound, which colour. Amir approves the plan before anything is built.
Nothing here is built yet. The numbers are his, as sent (his list skipped 3, 7, 8, 11 and 14).

## His list, shortened

1. **Dynamic typography.** Key words appear exactly when he says them. Big kinetic text for the important statement. Numbers that count up.
   Highlighted terms (ACCELERATION, FORCE, RFD, 2 to 13 m). A hierarchy of headline, explanation, supporting detail. Text that follows him or sits
   beside him. Animated arrows and lines that connect concepts. Example: "Most tennis accelerations are actually very short" turns into
   0 to 5 m, 0 to 10 m, 0 to 15 m, with the 5 m part lit while he says it.
2. **S&C graphics.** Athlete silhouette, force arrows, ground reaction force, horizontal force vector, foot contact, sprint trajectory,
   distance markers, split-step to first step to acceleration, a simple force-time curve, RFD, change-of-direction angle.
   The viewer sees the concept while he explains it.
4. **Animated anatomy.** A full-body figure with the muscles lighting up as he talks (QUAD, then GLUTE, then CALF), then the exercise.
   Fits the body-part drawing in the app.
5. **Diagrams and mini infographics.** A chain built up step by step: STRENGTH, FORCE x TIME, RATE OF FORCE DEVELOPMENT, SPORT PERFORMANCE.
6. **Numbers made interesting.** 2 m, 5 m, 8 m, 13 m appearing in turn over an animated court. Also 30 sec, CARBS, HYDRATION, PERFORMANCE
   for nutrition reels.
9. **Camera moves on one static shot.** Push-in, close-up, graphic, zoom back out, reposition, B-roll, back to the original shot.
10. **Sound design.** Whooshes, impacts, clicks, ticks, risers, bass hits, UI sounds, footsteps, ball hits, gym sounds, transitions,
    notification sounds. "2 to 5 metres": whoosh, 2-5 M, click, ACCELERATION.
12. **A highlight and annotation system** that becomes brand identity: one colour each for normal, key concept, mistake, solution, supporting detail.
13. **Visual metaphors** for hard S&C ideas: ENGINE, POWER, SPEED. Or BIG FORCE but SLOW, so SPORT PERFORMANCE is not just strength.
15. **Progress bar and chapters** for a 60 to 90 s reel (01 THE PROBLEM, 02 WHY IT HAPPENS, 03 WHAT TO DO, 04 TAKEAWAY).

## What Claude thinks

**Build first: best value, lowest risk.**
- **Numbers on a court (6).** The signature move, and a natural hook for the first two seconds. Needs only his numbers and standard court sizes.
- **Concept chains (5).** Cheap to build from pieces that exist, revealed one step at a time.
- **Force-time curve, RFD slope, force arrows, distance markers (2).** This is where his expertise shows. Draw the curves and vectors exactly.
  Keep any athlete figure simple and geometric (the Menu's Pills and Quarter Turn style), never realistic. He approves each pose.
- **Animated anatomy (4).** He already owns the art: the app's muscle map (`BODYMAP_SVG`, traced into
  `.claude/skills/image/bodymap/bodymap.json`: front and back body, one path per muscle group, the same muscle names as the Spine, main muscle
  in full clay and helpers in soft clay). Light the groups one at a time, then cut to the exercise. No new drawing, no credits.

**Yes, with a change.**
- **Colour language (12).** Right idea, wrong palette: neon yellow is banned (Amir's own rule: clay is the only accent, no yellow or gold).
  Clay already means "look here" in both apps (DS-01), so extend that to video: bone = normal, clay = the key word, green = the fix,
  grey = supporting detail. For a mistake, strike it through in clay, then replace it in green, so the shape carries the meaning instead of a
  second warm colour next to clay. A red is Amir's call.
- **Chapters (15).** Yes, but at the TOP: Instagram's buttons and caption cover the bottom. His reel-8 rail already sits at the top.
- **Sound (10).** The Menu has 48 sounds already. Add footsteps, ball hits and gym sounds, each as a Menu item for him to approve first.
  One sound per key claim, not per line. Ducking under his voice can come straight from the voice waveform.
- **Camera moves (9).** Worth it for a 60 to 90 s talking head, but only as good as the footage. Every move needs a reason (new point,
  emphasis, return). About one every five seconds at most.
- **Typography (1).** Mostly exists. Add a highlight bar that sweeps behind a word and an arrow that draws itself between two ideas.

**Use sparingly.**
- Text that follows his movement (part of 1). Tracking can look gimmicky and cover his face. Prefer fixed spots beside him.
  Try it once on real footage before promising it.
- Visual metaphors (13). One per video at most, and only after a curve or diagram has shown the real mechanism. The metaphor is for the takeaway.

## Rules that apply to every one of them

- **Farsi first.** New social content is Farsi (CLAUDE.md). Per-letter animation breaks joined letters, so Farsi moves whole words or lines
  (the Menu already tags each move). No uppercase and no letter-spacing, so emphasis comes from weight, size and clay. Persian numerals.
  Chains, timelines and progress run right to left. Latin terms such as RFD inside a Farsi sentence need care. **Nothing Farsi goes on screen
  until Amir has read it.**
- **Numbers are his or sourced.** Never invent a stat. `/sc-research` (and the PubMed connector) can find the paper behind a figure like
  2 to 13 m, and Claude shows him the exact line before it goes on screen.
- **Claude cannot hear.** "Words appear exactly when he says them" needs word timings. Easiest is a caption export (SRT) from Instagram or
  CapCut. Or Claude tries a speech tool and Amir checks the result. Without timings, only a rough fit to the script is possible.
- **Reels are 9:16 (1080 x 1920, 88 px padding).** The Menu clips are 16:9, so each layout is redrawn tall. The motion and the sounds carry over.
  Keep key content out of the top and bottom bands that Instagram covers.
- **Not tested yet:** graphics laid over his real footage. The first proof is 10 seconds of his own clip.
- **Do not use them all.** A 60 to 90 s reel with nine ingredients looks like a template. One focal point at a time, a headline of about seven
  words at most, some seconds that are just him, and the biggest ingredient in the first two seconds.
- **Test, do not assume.** Post one plain reel and one with graphics, then compare average watch time in Insights.
- **Every new ingredient enters the Motion Menu first** (a number, a name, a playable sample, Keep / Maybe / Drop) and is used only once approved.

## How the existing Menu already covers part of the list

- Counting numbers: Ring Counter (#54), Odometer (#58), Skyline (#57)
- Key-word moves (English or Latin text): Rise (#14), Tumble (#15), Pop (#16), Swing (#17), Heavyweight (#18), Monolith (#19), Punch In (#20), Thud (#21)
- Lines that draw and mark things: Slash (#27), Ruler (#37), Pointer (#61), Keyframes (#63), Tick List (#60)
- Progress and chapters (the HUD): Slate (#70)
- Camera and finish: Jolt (#65), Shutter (#64), Halo (#66), Prism (#67)
- UI sounds: Click (#134), Ticks (#135), Bubble (#117), Plink (#119), Boop (#118). Whooshes and risers: Whoosh (#122), Swish (#123), Zip (#124), Riser (#120). Impacts and bass hits: Boom (#129), Thump (#102), Drop (#133), Crash (#130).
- New, not built: court and distance diagrams, force-time curve and RFD slope, force arrows, athlete figure and poses, concept chain with connectors,
  muscle light-up on the app's body drawing, highlight bar, word-timed text, camera moves on footage, a 9:16 mode, footstep, ball-hit and gym sounds.

## Order Claude would build in

1. Step 2 of the Menu plan first: make every item callable by name. Each new ingredient then plugs in as a reusable piece instead of a one-off.
2. A new Menu group, built from the safest items: the court and distances, the concept chain, the highlight bar and arrow, the muscle light-up.
3. Force-time curve, RFD slope and force arrows, then the simple athlete figure with his approval of each pose.
4. A 9:16 mode and a 10 second test over his real footage, with two or three camera moves.
5. Word timing, once there is an SRT or a speech tool he trusts.
6. The S&C sounds (footsteps, ball hits, gym).

## Questions for Amir when the first recipe starts

- Farsi or English for the first video? (Farsi is the default.)
- A red for mistakes, or clay strike-through and green fix only?
- Full captions under the graphics, or only the key words?
- Which reel first, and can he send the footage and a caption export?
