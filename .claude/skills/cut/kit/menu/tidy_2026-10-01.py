# -*- coding: utf-8 -*-
"""The tidy-up of Amir's Motion Menu, 2026-10-01 ("tidy up, clean up and re-organise: same job, same place; remove what will not be used on my talking
videos or for my business; fix duplicates; go through all of them: when would you use each, and how").

This file is the RECORD of that pass. It went through all 224 items and decided each one: KEEP (with a new group, and a "when" and a "how"), MERGE
(the same job as another item: it becomes an "also called" on the survivor) or RETIRE (will not be used). It wrote the complete manifest
kit/menu/menu.json (now the source of the whole menu, not only the /cut part; its `retired` list says what left, why and where it went).
Do not run it again: menu.json is the source now. Edit that, then run tools/menu_patch.py (kit/MENU.md).

  python tidy_2026-10-01.py --page <saved live page.html> --marks <folder with marks/*.json> [--dry]

His own marks win over mine: anything he marked Drop leaves, anything he marked Keep stays (even if I would have merged or retired it).
"""
import glob
import json
import os
import re
import sys

KIT = r"C:\Users\Amir\.claude\skills\cut\kit"
MENU = os.path.join(KIT, "menu")

# ------------------------------------------------------------------ groups (display order inside each tab)
GROUPS = [
    # Moves: how things change on his footage
    dict(id="m-wipes", tab="visual", name="Wipes and cuts", blurb="How one shot or card hands over to the next. Use two or three kinds in a reel."),
    dict(id="m-camera", tab="visual", name="Camera moves", blurb="Moves on your own footage. The first three come from the cut plan, not from a block."),
    dict(id="m-words", tab="visual", name="Words arrive", blurb="How a word lands. Pick one way and keep it for the whole reel."),
    # Reels: what goes on screen, by the job it does
    dict(id="r-words", tab="reels", name="Words and stamps", blurb="One word or one short phrase you stress. Never a caption: you add those."),
    dict(id="r-numbers", tab="reels", name="Numbers and charts", blurb="A number, a range or a chart. Only numbers you give."),
    dict(id="r-lists", tab="reels", name="Lists and steps", blurb="Things you count off, in order."),
    dict(id="r-versus", tab="reels", name="Against each other", blurb="Two things side by side, or a wrong word and its fix."),
    dict(id="r-curves", tab="reels", name="Curves and force", blurb="How something changes over time. A drawn idea, never your data."),
    dict(id="r-body", tab="reels", name="Body and movement", blurb="A place in the body, a chain of joints, the heart."),
    dict(id="r-court", tab="reels", name="Court", blurb="Distances, steps and turns on a court."),
    dict(id="r-behind", tab="reels", name="Behind you", blurb="Between the wall and you. Needs you cut out of the picture."),
    dict(id="r-hinges", tab="reels", name="Chapters, questions and the ask", blurb="The hinges of a reel: a part label, a question, the call to action."),
    dict(id="yours", tab="reels", name="Yours", blurb="Ideas you added here. I build each one and give it a number."),
    # Design
    dict(id="d-look", tab="design", name="Look", blurb="Colours and type. The same for every reel."),
    dict(id="d-feel", tab="design", name="Feel", blurb="Easing: the name to call a movement by, and the code behind it."),
    dict(id="d-rules", tab="design", name="House rules", blurb="How picture and sound stay together."),
    # Sounds
    dict(id="s-sweeps", tab="sound", name="Sweeps", blurb="Carry a wipe, a slide or a cut."),
    dict(id="s-builds", tab="sound", name="Builds", blurb="Tension before a hit."),
    dict(id="s-hits", tab="sound", name="Hits", blurb="Something lands."),
    dict(id="s-ticks", tab="sound", name="Ticks and blips", blurb="Small confirmations: a tick, a pop, a list row."),
    dict(id="s-bells", tab="sound", name="Bells", blurb="A win, a result, something done."),
    dict(id="s-sport", tab="sound", name="Sport and body", blurb="The court, the gym and the heart."),
    dict(id="s-music", tab="sound", name="Music", blurb="A bed under a reel, if you want one. /cut adds none: you add music in Instagram."),
]

SAY = 'sfx=[(E(t), "%s")]'  # how every sound is cued


def snd(id, group, when, aka=(), **extra):
    d = dict(group=group, when=when, how=SAY % id, **extra)
    if aka:
        d["aka_extra"] = list(aka)
    return d


# ------------------------------------------------------------------ KEEP: (id, overrides), in display order. Anything not named here is in MERGE or RETIRE.
KEEP = [
    # ---- Moves: wipes and cuts
    ("cut-clay-wipe", dict(group="m-wipes", when="Going from a full card to the next shot, in the brand look. The line can carry a word or a number.", how='wipeVariant:"clay" on any card, or K.wipeIn(layer, t, d, "clay")')),
    ("cut-iris", dict(group="m-wipes", when="Your default for a question card or a hinge. A circle opens into the next card.", how='wipeVariant:"iris" (the default on K.question)')),
    ("cut-push", dict(group="m-wipes", when="A card that slides over the picture and takes over. Clean and quiet. Your other favourite.", how='wipeVariant:"push"')),
    ("cut-slice", dict(group="m-wipes", when="A sharper hand-over for a list or a number card.", how='wipeVariant:"slice"')),
    ("cut-zoom-through", dict(group="m-wipes", when="Going into a big statement: a number, a verdict, the answer.", how='wipeVariant:"zoom"')),
    ("cut-whip-cut", dict(group="m-wipes", when="A jump cut inside one thought that should feel on purpose.", how='K.whip(t, {out, in, style:"whip"}) (out and in are segment numbers)')),
    ("cut-zoom-cut", dict(group="m-wipes", when="The same job with more energy: a quick push through the picture.", how='K.whip(t, {out, in, style:"zoom"})')),
    ("strobe", dict(group="m-wipes", name="Flash", cut="K.flash", how="K.flash(t, {peak:0.95, d:0.34})", used="", when="The one moment that matters, like the reveal or the answer. Once per reel at most.", pairs=["drop"], like=[])),
    # ---- Moves: camera
    ("push-in", dict(group="m-camera", cut="plan", used="", when="A line you want to land: the claim, the answer, the number you are about to say.",
                     how="Cut plan: {zoom:1.0, drift:0.10} is a slow push over the segment, {zoom:1.15, punch:true} is a quick settle on the cut.")),
    ("pull-out", dict(group="m-camera", cut="plan", used="", when="After a close-up, when the next idea starts. Or to end on the wide shot.",
                      how="Cut plan: {zoom:1.2, drift:-0.12} is a slow pull back, or cut to a segment with zoom:1.0.")),
    ("there-and-back", dict(group="m-camera", cut="plan", used="", when="One strong point inside a calm stretch. Push in, hold, return to the exact wide shot.",
                            how="Cut plan: three segments, wide zoom:1.0, tight zoom:1.15 with punch:true, wide zoom:1.0. Cut at word boundaries.")),
    ("drift", dict(group="m-camera", used="", when="A graphic needs the side or the top of the frame.",
                   how="Not built. K.backdrop(seg, {lower:true}) already sinks you to make headroom. A sideways slide needs a per-segment origin in plan_to_clips.py.")),
    # ---- Moves: words arrive
    ("rise", dict(group="m-words", name="Word Entrance", farsi="words", used="", pairs=["thump"],
                  label="How a word lands: it rises from behind a line, pops with a springy overshoot, drops and bounces once, or slams in from the camera.",
                  takes=["the words", "which way it lands", "how fast"],
                  alts=[dict(k="rise", l="Rise"), dict(k="pop", l="Pop"), dict(k="thud", l="Drop"), dict(k="punch-in", l="Slam")],
                  when="Every time a word appears. Pick ONE way and keep it for the whole reel.",
                  how='K.stamps(words, {variant:"pop"|"slide"|"drop"}) or K.stack(seg, lines, {enter:"rise"|"blur"|"slide"|"pop"})')),
    ("heavyweight", dict(group="m-words", name="Heavy Word", farsi="words", used="", pairs=["thump"],
                         when="The one word you lean on, like heavy, strong or power.",
                         how="Not built. Vazirmatn has a weight axis, so the weight can grow with font-variation-settings (100 to 900).")),
    # ---- Reels: words and stamps
    ("cut-stamp", dict(group="r-words", when="A short phrase you stress, up to about four words: a hook, a name, a contrast. Never a caption.",
                       how='K.stamps(words, {at, variant:"pop"|"slide"|"drop", out})')),
    ("cut-tag", dict(group="r-words", when="One word you say with weight. It sits beside you, often over a faint number.", how='K.tag(word, {at, x, y, out}) with K.ghost for the faint number')),
    ("ghost-numeral", dict(group="r-words", used="", pairs=[], when="A number or a 'one thing' idea, where the wall beside your head is free. You called this family premium.",
                           how='K.ghost("1", {at, out, x, y, size})')),
    # ---- Reels: numbers and charts
    ("cut-number-slam", dict(group="r-numbers", when="A number you say with weight: a time, a distance, a count, a percent. It must be your number.",
                             how='K.number("12", {at, landAt, unit, unitAt, look:"clay", shake})')),
    ("cut-number-behind", dict(group="r-numbers", when="The number is the hinge of the reel and there is headroom. Your best one.",
                               how="K.backdrop(seg, {lower:true}) + K.slamBehind(seg, \"12\", {at, landAt, out}) + K.tag(unit). Needs the cut-out.")),
    ("span", dict(group="r-numbers", name="Range", used="", pairs=["ticks", "click"], when="A range you say: 8 to 12 reps, RPE 7 to 8, 2 to 13 metres.",
                  how="Not built. It would be K.number with two numbers landing one after the other.")),
    ("ring-counter", dict(group="r-numbers", name="Stat Chart", used="", pairs=["ticks"], farsi="yes",
                          label="A number as a picture: a ring that counts up to a percent, bars that grow with the last one lit, or a line that draws itself.",
                          takes=["the numbers", "ring, bars or line", "the colour"],
                          alts=[dict(k="ring-counter", l="Ring"), dict(k="skyline", l="Bars"), dict(k="pulse-line", l="Line")],
                          when="A share, a comparison across a few values, or a change over weeks. Only numbers you give.",
                          how="Not built. Three forms: a ring that counts to a percent, bars with the last one lit, a line with one point called out.")),
    ("rev-dial", dict(group="r-numbers", name="Dial", used="", when="Effort, intensity or RPE. A needle climbs in steps and the word in the middle changes. One metaphor per video at most.",
                      how="Not built.")),
    # ---- Reels: lists and steps
    ("cut-drum-video", dict(group="r-lists", name="Drum", used="Your video or a full card",
                            label="A list turns on a drum, one line at a time, then opens flat. On your video your face stays. As a card it takes the whole screen.",
                            alts=[dict(k="cut-drum-video", l="On your video"), dict(k="cut-drum", l="Full card")],
                            when="3 to 5 short items, one phrase each, counted off one at a time. On your video unless your hands gesture over your chest.",
                            how='K.list(items, {mode:"video"|"card", at, itemAt, flatAt, out})')),
    ("cut-steps", dict(group="r-lists", used="Your video or a full card",
                       label="Steps joined by arrows, built as you say each one. On your video it picks a row, a grid or a stack, whichever fits. As a card it is a staircase of plates.",
                       takes=["the steps (2 to 4)", "when each one is said", "on your video or a card"],
                       alts=[dict(k="cut-steps", l="On your video"), dict(k="cut-steps-card", l="Full card")],
                       when="A sequence or a cause chain of 2 to 4 steps. On your video when the words fit, a card when they do not.",
                       how='K.diagram(steps, {mode:"video"|"card", at, nodeAt, out}). The layout picks itself.')),
    ("cut-loop", dict(group="r-lists", used="Your video or a full card",
                      label="Four steps in a circle: the last arrow runs back to the first and everything lights. On your video or as a card.",
                      alts=[dict(k="cut-loop", l="On your video"), dict(k="cut-loop-card", l="Full card")],
                      when="A cycle of exactly four: train, rest, adapt, repeat.", how='K.diagram(steps, {loop:true, mode:"video"|"card", at, nodeAt, loopAt, out})')),
    ("cut-checklist", dict(group="r-lists", when="You set 2 to 4 rules, then prove each one later. The ticks land when you come back to them.",
                           how='K.checklist(rules, {at, ticks, style:"paper"})')),
    ("cut-chips", dict(group="r-lists", when="You list 3 or 4 short options.", how='K.chips(options, {at, layout:"grid2"|"stack", out})')),
    # ---- Reels: against each other
    ("cut-versus", dict(group="r-versus", when="A myth against a fact, a wrong way against a right way, A or B, or two things that are not equal.",
                        how='K.versus(a, b, {at, vs, win:"a"|"b"}). vs can be a not-equal sign.')),
    ("strike-fix", dict(group="r-versus", name="Cross Out", used="", when="One word you correct: not this, that.",
                        how="Not built. A clay line strikes the wrong word and the right one lands in green.")),
    # ---- Reels: curves
    ("cut-curve", dict(group="r-curves", when="Force over time, the rate of force development, fatigue, adaptation: anything with a curve. I suggest it without being asked.",
                       how="K.curve({at, out, yLabel, xLabel, curves:[{at, tone, x0, k}], slope:{at, label}})")),
    ("cut-time-saved", dict(group="r-curves", when="Two methods or two athletes reach the same peak, one sooner.", how="K.curve({at, out, curves:[slow, fast], gap:{at, level, label}})")),
    # ---- Reels: body
    ("cut-muscle-map", dict(group="r-body", when="You name muscles. Each one lights as you say it and the body turns round for the back. Use it for any place in the body.",
                            how="K.bodymap(steps, {at, out}). A step is {m, label, at, view}.")),
    ("cut-joint-chain", dict(group="r-body", when="Hips, knees and ankles in order, like triple extension.", how='K.bodymap(steps, {chain:true, at, out}) with m:"ring:hip"|"ring:knee"|"ring:ankle"')),
    ("heartbeat", dict(group="r-body", used="", pairs=["lub-dub"], label="A dot pulses with a ring, like a pulse. Or a heartbeat line scrolls under a number.",
                       takes=["dot or line", "the speed", "the colour"], alts=[dict(k="heartbeat", l="Pulse"), dict(k="lifeline", l="Line")],
                       when="Heart rate, conditioning, recovery.", how="Not built.")),
    # ---- Reels: court
    ("cut-court-steps", dict(group="r-court", when="A few seconds, a few steps: speed, reaction, how far a player covers.", how="K.courtSteps3d({at, hit, steps, line1, line2, out})")),
    ("cut-court-distance", dict(group="r-court", when="A distance you name: 5 m, 10 m, a sprint.", how="K.courtMeasure3d({at, label, from, to, value, unit, out})")),
    ("cut-angle", dict(group="r-court", name="Pivot", used="", when="A change of direction: the way in, the way out and the angle.", how="Not built.")),
    # ---- Reels: behind you
    ("cut-word-behind", dict(group="r-behind", when="The reveal: the one word the reel turns on. Once per reel unless it is the spine.", how="K.behind(seg, [{text}], {at, out, dim}). Needs the cut-out.")),
    ("cut-word-stack", dict(group="r-behind", when="There is headroom (after a studio swap) or a short echo above your head.", how="K.stack(seg, lines, {at, out, top, size}). Needs the cut-out.")),
    ("cut-hollow-word", dict(group="r-behind", when="The one word as texture or as a reveal. It draws on, then fills solid on a beat.", how="K.outline(seg, word, {at, fillAt, out, size}). Needs the cut-out.")),
    ("cut-drifting-rows", dict(group="r-behind", when="A beat where you stay still and the room needs life. It is texture, not text to read.", how="K.drift(seg, word, {at, out, rows}). Needs the cut-out.")),
    ("cut-studio-swap", dict(group="r-behind", when="The hinge of the reel: the room becomes a colour and you sink to make room for type.", how="K.backdrop(seg, {at, out, tone, variant, lower:true}). Needs the cut-out.")),
    ("cut-soft-room", dict(group="r-behind", when="A quiet, serious line. The room goes soft and dark, you stay sharp. No verdict yet.", how="K.focus(seg, {at, out, blur, dim}). Needs the cut-out.")),
    # ---- Reels: hinges
    ("cut-chapter-band", dict(group="r-hinges", name="Chapter", used="Your video or a full card",
                              label="A clay band across your chest names each part: the number rolls like a counter and the title lands. As a card the whole screen goes clay.",
                              alts=[dict(k="cut-chapter-band", l="Band on your video"), dict(k="cut-chapter-card", l="Full card")],
                              when="The reel is in parts: first, second, third. Two or three chapters at most. The band first, the card for a bigger break.",
                              how='K.chapter(n, title, {variant:"band"|"card", at, landAt, titleAt, total})')),
    ("cut-question-card", dict(group="r-hinges", when="A question or a hinge in the argument. A breather for the eye. Not right after a court card.", how='K.question(lines, {look:"clay", wipeVariant:"iris", lineAt})')),
    ("cut-cta", dict(group="r-hinges", when="The ask at the end: comment, follow, link.", how='K.cta(word, {variant:"bubble", sub, at, pulse, out})')),
    # ---- Design
    ("signal-colours", dict(group="d-look", used="Every reel", when="Every reel. It is the colour language.",
                            how="Bone is normal text, clay is the key word, green is the fix or done, grey is detail, a clay line is a mistake. They are the kit's tokens.")),
    ("farsi-type", dict(group="d-look", kind="rule", name="Farsi Type", new=True, farsi="yes", used="Every reel",
                        label="Vazirmatn for every Farsi word: right to left, no capitals, no letter spacing, Persian digits, and each word moves as one piece. Barlow for Latin numbers and @amirardekanian.",
                        when="Every word on screen.",
                        how="Fonts: assets/fonts/Vazirmatn-Variable.woff2. K.fa(12) gives the Persian digits. Put &zwnj; where a word needs the half space. Counters get direction:ltr.")),
    ("settle", dict(group="d-feel", used="Most entrances in the kit", when="Almost every entrance. The default.", how='ease: "expo.out"')),
    ("overshoot", dict(group="d-feel", used="Stamp pop and Tag", when="Something that should feel alive: a tag, a stamp, a tick.", how='ease: "back.out(1.8)"')),
    ("glide", dict(group="d-feel", used="The wipes", when="A move between two places: a card sliding, a wipe.", how='ease: "power3.inOut"')),
    ("bounce", dict(group="d-feel", used="The drop Stamp", when="A drop that lands with weight.", how='ease: "bounce.out"')),
    ("stagger", dict(group="d-feel", used="Lists, rows and chips", when="A row of things that start one after another.", how="stagger: 0.08")),
    ("anticipation", dict(group="d-rules", name="Sound Lock", used="Every graphic with a sound",
                          label="The sound goes on the frame the graphic lands. If it feels late, land the graphic one or two frames early.",
                          when="Every time a graphic lands.", how='In build.py: sfx=[(E(t), "thump")] where t is the second the graphic lands (its landAt).')),
    # ---- Sounds: sweeps
    ("whoosh", snd("whoosh", "s-sweeps", "Under every wipe and slide. Start it as the move starts.", label="A soft air sweep.", page_audio="whoosh.wav", file="whoosh.wav")),
    ("swish", snd("swish", "s-sweeps", "A whip cut or a quick slide. Faster and brighter than the whoosh.")),
    ("inhale", snd("inhale", "s-sweeps", "A zoom or an iris that pulls the viewer into the next scene.")),
    ("glassline", snd("glassline", "s-sweeps", "Under a curve, a line or a court drawing itself.")),
    # ---- Sounds: builds
    ("riser", snd("riser", "s-builds", "About two seconds before a big landing: a number, a verdict, a chapter.")),
    ("snare-roll", snd("snare-roll", "s-builds", "Under the number odometer. Place it so it ends on the landing.")),
    # ---- Sounds: hits
    ("thump", snd("thump", "s-hits", "Under every stamp, tag and landing. The default hit.")),
    ("boom", snd("boom", "s-hits", "The big moment: the number slam, a chapter card, the answer.")),
    ("crash", snd("crash", "s-hits", "A finale: the last word, the verdict.")),
    ("drop", snd("drop", "s-hits", "The one hinge of the reel. Once.")),
    ("knock", snd("knock", "s-hits", "A drum item turning, a word dropping in.")),
    # ---- Sounds: ticks and blips
    ("click", snd("click", "s-ticks", "A small thing appearing or switching: a chip, a list row.")),
    ("ticks", snd("ticks", "s-ticks", "A drum turning, a measuring line, numbers counting.")),
    ("plink", snd("plink", "s-ticks", "A checklist ticking, a fix landing.")),
    ("boop", snd("boop", "s-ticks", "A small pop: a bubble, a stamp popping, a chip.")),
    # ---- Sounds: bells
    ("chime", snd("chime", "s-bells", "A win or a result: the verdict turns green, the loop closes.")),
    ("ping", snd("ping", "s-bells", "A small win: one item done.")),
    # ---- Sounds: sport and body
    ("footsteps", snd("footsteps", "s-sport", "A runner on the court graphic. Four steps, two with a squeak.")),
    ("ball-hit", snd("ball-hit", "s-sport", "The strike in the court graphic.")),
    ("ball-bounce", snd("ball-bounce", "s-sport", "A ball bouncing three times, each one lower.")),
    ("clank", snd("clank", "s-sport", "Gym talk: loading a bar, a plate touching the barbell.")),
    ("thud-drop", snd("thud-drop", "s-sport", "A heavy plate dropped on a rubber floor: heavy, hard landings.")),
    ("lub-dub", snd("lub-dub", "s-sport", "The heartbeat graphic: heart rate, recovery.")),
    # ---- Sounds: music
    ("groove", snd("groove", "s-music", "A music bed under a reel, if you want one. You marked it Keep.")),
]

# ------------------------------------------------------------------ MERGE: this item does the same job as the survivor. It becomes an "also called" on the survivor.
MERGE = {
    # wipes and cuts
    "full-stop": "cut-iris", "portal": "cut-iris", "pinhole": "cut-iris", "slab": "cut-clay-wipe", "whiplash": "cut-whip-cut", "venetian": "cut-slice", "shatter": "cut-slice",
    "tunnel": "cut-zoom-through",
    # words
    "tumble": "rise", "pop": "rise", "thud": "rise", "punch-in": "rise",
    # numbers and charts
    "tally": "cut-number-slam", "odometer": "cut-number-slam", "pulse-line": "ring-counter", "skyline": "ring-counter",
    # lists
    "tick-list": "cut-checklist", "paper": "cut-checklist", "chain": "cut-steps", "cut-steps-card": "cut-steps", "cut-loop-card": "cut-loop", "cut-drum": "cut-drum-video",
    "tiers": "cut-question-card",
    # against each other
    "not-equal": "cut-versus",
    # curves, body, court
    "force-curve": "cut-curve", "slope-line": "cut-curve", "same-peak": "cut-time-saved", "muscle-map": "cut-muscle-map", "lifeline": "heartbeat",
    "court": "cut-court-steps", "sprint-trace": "cut-court-steps", "footfalls": "cut-court-steps",
    "ruler": "cut-court-distance", "bracket": "cut-court-distance", "metre-marks": "cut-court-distance", "scale-bar": "cut-court-distance",
    # behind you, hinges
    "ghost-word": "cut-hollow-word", "chapters": "cut-chapter-band", "cut-chapter-card": "cut-chapter-band",
    # design
    "rubber": "overshoot", "spring": "overshoot", "cue-sheet": "anticipation",
    # sounds
    "swipe": "swish", "zip": "swish", "rush": "inhale", "kick": "thump", "blast": "boom", "clatter": "click", "pluck": "plink",
    "bubble": "boop", "peep": "boop", "pixels": "boop", "bell": "chime", "notify": "chime",
}

# ------------------------------------------------------------------ RETIRE: will not be used on his talking videos or for his business. Reason in plain words.
ABSTRACT = "Abstract shape. It says nothing about training."
FINISH = "A renderer finish. It is not used on your footage."
RETIRE = {
    # scene changes
    "static": "A glitch look. Not your style.", "clamshell": "A split-open reveal. Not needed.", "mosaic": "A pixel effect. Not your style.", "flipcard": "A card flip. No use in a talking video.",
    # type
    "swing": "A serif letter swinging in. Latin only.", "monolith": "A 3D block title. Too heavy for a talking video.",
    # shapes
    "bullseye": ABSTRACT, "quarter-turn": ABSTRACT, "pills": ABSTRACT, "gravity": ABSTRACT, "dot-pop": "Abstract. The ring burst already lives in Tag and Number Slam.", "slash": ABSTRACT,
    "ripple": "Abstract. The ring burst already lives in Tag and Number Slam.", "twist": ABSTRACT, "tip-over": ABSTRACT, "spinner": ABSTRACT, "sweep": ABSTRACT, "pinpoint": ABSTRACT,
    # weight and bounce
    "squash": "A bouncing ball. Not about training.", "tremor": "A floor ripple. Not needed.", "dust": "Specks where a letter lands. Not needed.", "hop": "A ball hopping across a title. Not needed.",
    "afterglow": "A ring and a glow after a landing. Not needed.", "spring-lab": "An app-demo widget.",
    # depth and particles
    "trefoil": "A 3D knot. Not about training.", "spin-kick": "A 3D knot. Not about training.", "x-ray": "A scan line on a 3D knot.", "dive": "A camera flying through a 3D knot.", "orbit": "A 3D knot with satellites.",
    "big-bang": "Particles. Too busy for a talking video.", "current": "Particles. Too busy for a talking video.", "assembly": "Particles. Too busy for a talking video.", "supernova": "Particles. Too busy for a talking video.",
    # screens and graphs
    "bento": "A generic app card layout.", "switch": "An app-demo widget.", "scrub": "An app-demo widget.", "pointer": "An app-demo widget.", "curve-lab": "An animator's tool, not a graphic.",
    "keyframes": "An animator's tool, not a graphic.",
    # finish
    "shutter": FINISH, "jolt": FINISH + " The number slam has its own shake.", "halo": FINISH, "prism": FINISH, "film": FINISH, "vignette": FINISH,
    # reels 144-174 that will not be used
    "key-words": "Caption-like: words as they are said. You add the captions yourself.", "marker": "A highlighter needs text on screen. Your words are in your captions.",
    "arrow": "A small drawing part. The graphics that need arrows already have them.", "label-line": "The body map already has its own labels.",
    "figure": "You dropped it.", "pose-strip": "You dropped it.", "ground-reaction": "You dropped it.", "force-arrow": "Same family as Ground Push, which you dropped.",
    # design
    "slate": "Broadcast furniture. Instagram's own buttons cover the edges.", "dot-grid": "A background. The diagram card has its own faint grid.",
    "ink-coral": "Another palette. Yours is clay and green.", "coral-block": "Another palette. The clay card does this.", "primary-paper": "Another palette. Yours is clay and green.",
    "cobalt-deep": "Another palette. Yours is clay and green.", "night-spectrum": "Another palette. Yours is clay and green.", "daylight-ui": "Another palette. Yours is clay and green.",
    "colour-plates": "Another palette. Yours is clay and green.",
    "heavy-italic": "Latin fonts. Your reels use Vazirmatn (see Farsi Type).", "mono-tag": "Latin fonts. Your reels use Vazirmatn (see Farsi Type).", "ui-sans": "Latin fonts. Your reels use Vazirmatn (see Farsi Type).",
    "windup": "Not used in the kit.", "beat-grid": "There is no music bed in your reels.", "downbeat": "There is no music bed in your reels.",
    # built in /cut but dropped by him
    "cut-stamp-mask": "You dropped it.", "cut-head-glow": "You dropped it.", "cut-light-sweep": "You dropped it.", "cut-quote-page": "You dropped it.", "cut-whip-wipe": "You dropped it.",
    # sounds that will not be used
    "clap": "Beat music. /cut adds no music.", "snap": "Beat music. /cut adds no music.", "hat": "Beat music. /cut adds no music.", "sizzle": "Beat music. /cut adds no music.",
    "undertow": "Music bed. /cut adds none.", "wobble": "Music bed. /cut adds none.", "cushion": "Music bed. /cut adds none.", "stab": "A musical chord hit. Thump does the job.",
    "staircase": "Musical flourish.", "last-word": "Musical flourish.", "run": "Musical flourish.", "roll-call": "Snare Roll does the job.", "scanner": "A sci-fi sweep.",
    "slide": "Follows a slider. No slider here.", "stutter": "A glitch sound. Not your style.", "flup": "A card-flip sound. The card flip is gone.",
    "vacuum": "A mix trick for music.", "pump": "A mix trick for music.", "space": "A mix trick for music.", "duck": "A mix trick for music.",
}

# the sounds that left, and the sound that now stands in for them in a card's "Sounds with it" list (None: nothing replaces it)
SOUND_MAP = {"kick": "thump", "stab": "thump", "bell": "chime", "notify": "chime", "bubble": "boop", "peep": "boop", "pixels": "boop", "rush": "inhale", "zip": "swish", "swipe": "swish",
             "blast": "boom", "clatter": "click", "pluck": "plink"}

# levels for the imported sounds: the effective peak in dBFS (peak of the file plus the level), set against the old kit sounds (hit -6, stamp -7.5, ding -11, tick -12.5, swipe -12.6)
TARGET_PEAK = {"swish": -15, "inhale": -17, "glassline": -20, "riser": -16, "snare-roll": -10, "thump": -9, "boom": -7, "crash": -10, "drop": -8, "knock": -14, "click": -13, "ticks": -14,
               "plink": -14, "boop": -14, "chime": -12, "ping": -14, "footsteps": -10, "ball-hit": -9, "ball-bounce": -12, "clank": -10, "thud-drop": -8, "lub-dub": -12, "groove": -20}
LEGACY = {"whoosh": dict(file="whoosh.wav", dur=0.75, vol=0.28, track=12)}   # the kit's own whoosh stays the whoosh (SFX in kit.py)


FF = r"C:\Users\Amir\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
PREFILL_T = 1790873997991   # the timestamp of the marks I wrote from his showreel verdicts: those are not his own marks

# curated "close to" links between the survivors (the pairs a person would look for together)
EXTRA_LIKE = {
    "cut-steps": ["cut-loop", "cut-checklist"], "cut-loop": ["cut-steps"], "cut-checklist": ["cut-steps", "cut-chips"], "cut-chips": ["cut-checklist"],
    "cut-number-slam": ["cut-number-behind"], "cut-number-behind": ["cut-number-slam"], "cut-versus": ["strike-fix"], "strike-fix": ["cut-versus"],
    "cut-muscle-map": ["cut-joint-chain"], "cut-joint-chain": ["cut-muscle-map"], "cut-court-steps": ["cut-court-distance"], "cut-court-distance": ["cut-court-steps"],
    "cut-curve": ["cut-time-saved"], "cut-time-saved": ["cut-curve"], "cut-word-behind": ["cut-hollow-word", "cut-word-stack"], "cut-hollow-word": ["cut-word-behind"],
    "cut-stamp": ["rise", "cut-tag"], "rise": ["cut-stamp"], "cut-tag": ["ghost-numeral", "cut-stamp"], "ghost-numeral": ["cut-tag"],
    "cut-iris": ["cut-push"], "cut-push": ["cut-iris"], "cut-whip-cut": ["cut-zoom-cut"], "cut-zoom-cut": ["cut-whip-cut"],
    "cut-chapter-band": ["cut-question-card"], "cut-question-card": ["cut-chapter-band"], "push-in": ["pull-out", "there-and-back"], "pull-out": ["push-in"], "there-and-back": ["push-in"],
    "thump": ["boom"], "boom": ["thump", "crash"], "chime": ["ping"], "ping": ["chime"], "swish": ["whoosh"], "whoosh": ["swish"],
}


def active_dur(path, np):
    import subprocess
    raw = subprocess.run([FF, "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    win = 160
    n = len(x) // win
    env = np.abs(x[:n * win]).reshape(n, win).max(axis=1)
    thr = env.max() * 10 ** (-42 / 20)
    idx = np.where(env > thr)[0]
    last = idx[-1] if len(idx) else n - 1
    return round(min(len(x) / 16000.0, (last + 1) * 0.01 + 0.12), 2)


def main():
    import shutil
    import numpy as np
    a = sys.argv[1:]
    page = a[a.index("--page") + 1]
    marks_dir = a[a.index("--marks") + 1] if "--marks" in a else None
    levels = json.load(open(a[a.index("--levels") + 1], encoding="utf-8"))
    sounds_dir = a[a.index("--sounds") + 1]
    dry = "--dry" in a
    html = open(page, encoding="utf-8").read()
    d = json.loads(re.search(r'<script id="data" type="application/json">(.*?)</script>', html, re.S).group(1))
    by = {i["id"]: i for i in d["items"]}
    v1 = os.path.join(MENU, "archive", "menu.v1-2026-10-01.json")      # the /cut-only manifest this pass started from (kept, so the pass can be re-run)
    old = json.load(open(v1 if os.path.exists(v1) else os.path.join(MENU, "menu.json"), encoding="utf-8"))
    extra = {i["id"]: i for i in old["items"]}
    marks = {}
    if marks_dir:
        for f in glob.glob(os.path.join(marks_dir, "*.json")):
            try:
                m = json.load(open(f, encoding="utf-8"))
            except Exception:
                continue
            if m.get("t") != PREFILL_T:                         # only his own marks count here
                marks[os.path.splitext(os.path.basename(f))[0]] = m.get("v", "")

    keep_ids = [k for k, _ in KEEP]
    new_ids = {k for k, o in KEEP if o.get("new")}
    problems, seen = [], {}
    for k in keep_ids + list(MERGE) + list(RETIRE):
        seen[k] = seen.get(k, 0) + 1
    for k, n in seen.items():
        if n > 1:
            problems.append("%s is decided %d times" % (k, n))
        if k not in by and k not in new_ids:
            problems.append("%s is not in the page" % k)
    for k in by:
        if k not in seen:
            problems.append("NOT DECIDED: %s (#%s %s)" % (k, by[k]["no"], by[k]["name"]))
    for k, s in MERGE.items():
        if s not in keep_ids:
            problems.append("%s merges into %s, which is not kept" % (k, s))
    forced_out = [k for k, v in marks.items() if v == "drop" and k in keep_ids]
    forced_in = [k for k, v in marks.items() if v == "keep" and (k in MERGE or k in RETIRE)]
    print("his own marks: %d | his Drop on something I keep: %s | his Keep on something I merge or retire: %s" % (len(marks), forced_out, forced_in))
    if forced_out or forced_in:
        problems.append("his marks disagree with my decisions: decide these by hand")
    if problems:
        print("\nPROBLEMS:")
        for p in problems:
            print("  -", p)
        raise SystemExit(1)

    # ---- build the items
    maxno = max(i["no"] for i in d["items"])
    names = {k: by[k]["name"] for k in by}
    nos = {k: by[k]["no"] for k in by}
    kept_sounds = [k for k, o in KEEP if o.get("how", "").startswith("sfx=")]
    items, track = [], 22
    aka = {}
    alt_label = {al["k"]: al["l"] for _, o in KEEP for al in o.get("alts", [])}
    for m, s in MERGE.items():
        # the full-card twin of a built ingredient has its button on the card: keep its number as "Full card #208"
        nm = alt_label[m] if (m.startswith("cut-") and m in alt_label) else names[m]
        aka.setdefault(s, []).append("%s #%s" % (nm, nos[m]))
    final_name = {}
    for k, o in KEEP:
        final_name[k] = o.get("name") or names.get(k, k)
    for k, o in KEEP:
        if o.get("new"):
            rec = {"id": k, "no": maxno + 1, "kind": o["kind"]}
            maxno += 1
        else:
            rec = json.loads(json.dumps(by[k]))
            if k in extra:
                for f in ("sample", "mark"):
                    if f in extra[k]:
                        rec[f] = extra[k][f]
        for f, v in o.items():
            if f in ("aka_extra", "new"):
                continue
            rec[f] = v
        # alts: carry the sample window of a built alternative, so its clip can be cut again
        if rec.get("alts"):
            for al in rec["alts"]:
                if al["k"] != k and al["k"] in extra and "sample" in extra[al["k"]]:
                    al["sample"] = extra[al["k"]]["sample"]
                if al["k"] == k and "sample" in rec:
                    al["sample"] = rec["sample"]
        a_list = list(aka.get(k, [])) + list(o.get("aka_extra", []))
        if a_list:
            rec["aka"] = a_list
        # sounds the card goes with, and look-alikes: follow the merges, drop what left
        pr = []
        for p in rec.get("pairs", []):
            p = SOUND_MAP.get(p, p)
            if p in kept_sounds and p not in pr:
                pr.append(p)
        rec["pairs"] = pr
        lk = []
        for l in list(rec.get("like", [])) + EXTRA_LIKE.get(k, []):
            l = MERGE.get(l, l)
            if l in keep_ids and l != k and l not in lk:
                lk.append(l)
        if lk:
            rec["like"] = lk
        elif "like" in rec:
            del rec["like"]
        if rec.get("kind") == "sound":
            f = k + ".mp3"
            if k in LEGACY:
                rec.update(LEGACY[k])
            else:
                src = os.path.join(sounds_dir, f)
                dur = active_dur(src, np)
                vol = round(min(1.0, 10 ** ((TARGET_PEAK[k] - levels[k]["max"]) / 20)), 2)
                rec.update(file=f, dur=dur, vol=vol, track=track)
                track += 1
                if not dry:
                    shutil.copy2(src, os.path.join(KIT, "sfx", f))
        u = rec.get("used", "")
        if u and not u.startswith("Reel") and u != "Every frame":     # the card reads "Made for <used>"
            rec["used"] = u[0].lower() + u[1:]
        if rec.get("kind") == "sound":
            rec["cut"] = "sfx"                                         # a sound in the menu can be cued by its id (kit.py)
        items.append(rec)

    # ---- retired
    retired = []
    for k, why in RETIRE.items():
        retired.append({"id": k, "no": nos[k], "name": names[k], "why": why})
    for k, s in MERGE.items():
        retired.append({"id": k, "no": nos[k], "name": names[k], "into": s, "intoName": final_name[s]})
    retired.sort(key=lambda r: r["no"])

    # ---- checks
    ids = {i["id"] for i in items}
    sound_ids = {i["id"] for i in items if i["kind"] == "sound"}
    gids = {g["id"] for g in GROUPS}
    for i in items:
        if i["group"] not in gids:
            problems.append("%s: group %s does not exist" % (i["id"], i["group"]))
        for p in i.get("pairs", []):
            if p not in sound_ids:
                problems.append("%s: sound %s is not kept" % (i["id"], p))
        for l in i.get("like", []):
            if l not in ids:
                problems.append("%s: look-alike %s is not kept" % (i["id"], l))
        for al in i.get("alts", []):
            if al["k"] not in d["clips"]:
                problems.append("%s: alt clip %s is not in the page" % (i["id"], al["k"]))
    nums = [i["no"] for i in items]
    if len(set(nums)) != len(nums):
        problems.append("duplicate numbers")
    if problems:
        print("\nPROBLEMS:")
        for p in problems:
            print("  -", p)
        raise SystemExit(1)

    man = {
        "artifact": old.get("artifact"),
        "about": "THE source of Amir's Motion Menu (since the tidy of 2026-10-01). One record per card: groups, items (every kind), and in `retired` what left and why. "
                 "Edit this, then run tools/menu_patch.py, publish (kit/MENU.md). `no` is the permanent menu number: a removed number is never used again, the next new one is %d. "
                 "A /cut ingredient has `cut` (its kit block) and `how` (the call). Its sample is `sample` (showreel number, t0, t1, poster, in seconds). A sound has `file`, `dur`, `vol`, `track` "
                 "and kit.py puts it in the SFX table, so every sound in the menu can be cued." % (maxno + 1),
        "version": 2, "groups": GROUPS, "items": items, "retired": retired,
    }
    cnt = {}
    for i in items:
        cnt[i["group"]] = cnt.get(i["group"], 0) + 1
    print("\nITEMS %d (was %d), RETIRED %d (%d removed, %d merged into another)" % (len(items), len(by), len(retired), len(RETIRE), len(MERGE)))
    for g in GROUPS:
        print("  %-10s %-34s %2d" % (g["tab"], g["name"], cnt.get(g["id"], 0)))
    if dry:
        print("(dry run: nothing written)")
        return
    arch = os.path.join(MENU, "archive")
    os.makedirs(arch, exist_ok=True)
    if not os.path.exists(v1):
        shutil.copy2(os.path.join(MENU, "menu.json"), v1)
    shutil.copy2(page, os.path.join(arch, "motion-menu-page-v6-2026-10-01.html"))
    with open(os.path.join(MENU, "menu.json"), "w", encoding="utf-8", newline="\n") as f:
        f.write('{\n')
        for key in ("artifact", "about", "version"):
            f.write('  %s: %s,\n' % (json.dumps(key), json.dumps(man[key], ensure_ascii=False)))
        f.write('  "groups": [\n    ' + ',\n    '.join(json.dumps(g, ensure_ascii=False) for g in GROUPS) + '\n  ],\n')
        f.write('  "items": [\n    ' + ',\n    '.join(json.dumps(i, ensure_ascii=False) for i in items) + '\n  ],\n')
        f.write('  "retired": [\n    ' + ',\n    '.join(json.dumps(r, ensure_ascii=False) for r in retired) + '\n  ]\n}\n')
    print("wrote menu.json (v2), archive/ (the old manifest and the v6 page)")


if __name__ == "__main__":
    main()
