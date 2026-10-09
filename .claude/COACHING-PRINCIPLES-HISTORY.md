# Coaching Principles: the history behind the rules

Where each rule came from: the date, Amir's own words, the athlete (coded *Athlete A*, *Athlete B* …,
never a name or id: this repo is public) and what went wrong. It was moved out of
`COACHING-PRINCIPLES.md` on 2026-09-27 (the second pipeline audit, question 6: yes), so the design
pass reads the rules and their meaning without the dates. **No stage reads this file.** Open it for
a rule's origin, and read it before changing a rule. Search the rule's ID (`SEL-4`).

A new rule's date and Amir's words go here, under the same ID, when its line and story go into
the principles (their *How to add*).

## Intake & assessment

- `INT-1` **Intake captures recovery inputs, not just goals.**
  - 2026-06-28
- `INT-2` **Always take injury history up front.**
  - 2026-06-28
- `INT-3` **Trust the bar over the résumé.**
  - 2026-06-28
- `INT-4` **Negotiate the minimum effective frequency, but only against a real limit.**
  - 2026-06-28
- `INT-5` **Know the referral line.**
  - 2026-06-28
- `INT-6` **Every athlete with an active injury or a rehab/managed history gets a mandatory in-gym pain-management note.**
  - 2026-07-08
- `INT-7` **Logs are filled in by humans and go stale — confirm before a repeated complaint drives a decision.**
  - 2026-07-12
- `INT-8` **When a standing issue is confirmed resolved, close the loop — don't let it silently vanish.**
  - 2026-07-12
- `INT-9` **A decision to program AROUND pain instead of referring out needs a DATE and named escalation triggers — otherwise it stands forever by silence.**
  - 2026-08-08
- `INT-10` **For an athlete who hides pain, show the MODIFICATION MENU in writing before they have anything to hide.**
  - 2026-08-08

## Exercise selection

- `SEL-1` **SFR leads for general-fitness clients.**
  - 2026-06-15
- `SEL-2` **Sport-performance athletes: transfer can override SFR**
  - 2026-06-15
- `SEL-3` **Hypertrophy-accumulation blocks: machine/SFR primaries are acceptable even for sport athletes**
  - 2026-07-12
- `SEL-4` **Accessories rotate every cycle, BY VARIANT.**
  - Amir, 2026-09-26, asked how to square rotation with "no supersets on a new exercise": "rotate by variant".
- `SEL-4` **Accessories rotate every cycle**
  - 2026-06-15, clarified 2026-07-13 — Athlete A C3 shipped with ~half its accessories unrotated by oversight, not by stated exception; same failure mode hit Athlete B C2 the same day, at an 83% overlap with Cycle 1, caught on review not at design time — two independent hits in one day means this is a recurring gap, not a one-off
- `SEL-5` **Conditioning-circuit/finisher exercises rotate for real variety too — not just accessories.**
  - 2026-07-18, Amir: Athlete A's and Athlete C's circuits had converged on identical exercises
- `SEL-6` **Rehab/corrective:**
  - 2026-06-15
- `SEL-6` **The "keep best-in-class" exception above is for rehab/corrective work only.**
  - 2026-07-13
- `SEL-7` **Anything genuinely kept must still show a visible dose progression — never re-ship an identical prescription cycle to cycle.**
  - 2026-07-13
- `SEL-8` **A fresh-exercise swap must fit the athlete's demonstrated capacity, not the most advanced-sounding progression.**
  - 2026-07-13
- `SEL-9` **Knee-history clients:**
  - 2026-06-15
- `SEL-10` **Chronic-back clients:**
  - 2026-06-15
- `SEL-10` **Chronic-back clients: AXIAL loading defers a cycle too, not just the free hinge.**
  - 2026-07-30, Amir, on Athlete E C1: "leg press as its safer a bit for his lower back, if he was pain free the whole cycle then we can progress to a back squat"
- `SEL-11` **A RANGE OR HEIGHT RESTRICTION MUST BE AUDITED AGAINST EVERY EXERCISE IN THE CYCLE, INCLUDING WARM-UP AND PREP — not just the ones it obviously names.**
  - 2026-08-17, Athlete F C1 — the clinical audit lens caught four separate breaches of the cycle's own shoulder rule plus a prep-circuit flexion leak on a chronic back
- `SEL-12` **The fallback rule above generalises: EVERY fallback is checked against EVERY deferral the cycle makes, not just the free hinge.**
  - 2026-08-17, Athlete F C1
- `SEL-13` **Posture / tennis clients:**
  - 2026-06-15
- `SEL-14` **No corrective/postural drills without an indication.**
  - 2026-06-19
- `SEL-15` **One exercise appears ONCE per cycle — never the same movement on two different days.**
  - 2026-07-27, Amir — Athlete G C2 shipped Cable Lateral Raise on both Day 1 and Day 4 to reach a side-delt target; the fix was 5 sets on one day plus a different raise on the other.
- `SEL-15` **One-exercise-once-per-cycle applies to WORKING exercises only**
  - 2026-07-30, Amir — the rule as written had no carve-out, which would have banned the same warm-up bike or glute bridge on two days.
- `SEL-16` **A missing demo video NEVER shapes the prescription — Amir adds URLs manually.**
  - Amir, 2026-07-30, verbatim: "i will always add url for all the videos that doesnt have a url, this is not your worry, you always prescribe what is best for the athlete, and the ill add videos manually."
- `SEL-17` **A removed exercise stays removed unless re-earned.**
  - 2026-06-28
- `SEL-18` **The Assault Bike is NOT a neutral warm-up — it is banned as the general raise for any flexion-sensitive back.**
  - 2026-09-07, Athlete H C1 — the draft opened all three sessions with it on a lumbar-disc athlete, having already dropped Cat-Cow for that very reason
- `SEL-19` **A loaded carry's PICK-UP is a free hinge — spec the pick-up, not just the carry.**
  - 2026-09-07, Athlete H C1
- `SEL-20` **One same-pattern fallback per primary, named in the spec.**
  - It lived in /program-design (STEP 3, *FALLBACK*) with no number.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).

## Exercise naming

- `NAM-1` **Word order = `[modification] [equipment] [movement]`**
  - 2026-06-15
- `NAM-2` **Equipment in the name only when the move has multiple implements**
  - 2026-06-15
- `NAM-2` **Bodyweight moves take the bare movement — no "Bodyweight" prefix**
  - 2026-06-19
  - Amir, 2026-10-09, settling Box Step-Up, whose Spine entry listed dumbbells: "box step up means body weight, db box step-up means do it with db". The entry became bodyweight (box only, isolation cost) and Dumbbell Box Step-Up is its own entry.
- `NAM-3` **Defining setups DO belong in the name**
  - 2026-06-15
- `NAM-4` **Never in the name → these go in the prescription, the pill or the Coach's Note:**
  - 2026-06-19; rx wording 2026-09-26
- `NAM-5` **Grip / intent / execution tweak is a chip, never the name**
  - 2026-06-15
  - Amir, 2026-09-25, after a first cycle came back with its grips as grey lines: "grips should be a chip on the card not a free text. you changed how my file look like"
  - Same day: "the chips you added for grip, is specific to the athlete, so dont add that chip to the whole exercise library"
- `NAM-6` **A variant that changes the exercise is its own exercise**
  - Amir, 2026-09-25: "if some one is doing short lever copenhagen, thats another exercise with its own name and different cues"
- `NAM-8` **The Spine is the source of truth for names and videos.**
  - 2026-06-15, when the source was `exercise_library.json`, generated from Notion; the Spine replaced it on 2026-09-26, Amir: yes to "take videos from the exercise library and retire the Notion-synced list".
  - Amir, 2026-10-09, after the Library's cards had been linked to the Spine through aliases (Ankle Pogos on Pogo Jump): "i dont want to have 2 names, being linked, i want to have one name consistent in my workouts with my spine. the source of the truth should be my naming rules which is my spine". Asked the same day whether athletes' programmes follow: yes. Every alias was removed (107), Library and programme cards took their entry's name, and versions that differ by equipment or setup got entries of their own.
- `NAM-8` `NAM-9` **The library is a video-join key, not a whitelist — programming is never restricted to what's already catalogued.**
  - 2026-07-27, Amir, verbatim: "you can prescribe any movement that you like" — said after Athlete G C2 avoided a genuinely better exercise, a leaning cable lateral raise, out of a mistaken belief that only library entries were available.
  - Amir, 2026-09-25: "if there is any exercise that is outside of the exercise library, after its prescribed for any athlete, it should be added to our library, with all the cues and other details like the ones already there". A first cycle had shipped seven new outside-day drills as bare drafts, so every card was blank; the "fix" then removed the drills, which was worse.
- `NAM-8` **The app resolver normalizes case/punctuation/accents**
  - 2026-06-15

## Recovery & autoregulation

- `REC-1` **Recovery capacity gates everything**
  - 2026-06-15
- `REC-2` **Readiness changes the day in three ways, and never the programme.**
  - 2026-06-15; the RPE 6 floor 2026-08-21; made universal 2026-09-26; rewritten as three levels the same day, Amir: "see which kind of readiness should affect what, and then if they should reduce sets, or rpe or what". The break PRC-25 asks for: athletes answered the check-in before 90% of sessions and nothing changed.
- `REC-3` **Separate training fatigue from life load**
  - 2026-06-15
- `REC-4` **Never program past a fatigue wall**
  - 2026-06-15
- `REC-5` **Concurrent athletes (heavy sport schedule alongside the gym) always get a double-day rule in autoregulation.**
  - 2026-08-02, Athlete J C1 — caught by the dose/time audit
- `REC-6` **High-stress and concurrent athletes also get a flexible session order.**
  - Split out of REC-2 on 2026-09-26, when REC-2 became three levels: it is the second half of the 2026-06-15 rule, not a new one.

## Session structure & time

- `SES-1` **`workouts.days[]` is authored in the best execution order.**
  - 2026-07-24, Athlete I C1 — shipped with the run day after the control day; Amir had the order corrected to the ideal week and the days renumbered.
- `SES-1` **An OPTIONAL day still sits in its correct place in the week — you mark it optional, you don't move it.**
  - 2026-08-07, Amir, on Athlete K C1
- `SES-2` **A day trains what it says it trains — upper work on upper days, lower work on lower days.**
  - 2026-07-27, Amir — Athlete G C2 put a rear-delt raise on the glute day and a lateral raise on the single-leg day as "adherence insurance" for an athlete who reliably skips her back-half days. The legitimate fixes for that are **day ORDER** — put the priority day first, where attendance is highest — and the short-week/minimum-dose protocol. Not contaminating the split.
- `SES-3` **Warm-up + preparation is always 10–15 minutes**
  - 2026-06-19
- `SES-4` **What goes in a warm-up.**
  - Amir's rules from 2026-06/07, kept until 2026-09-26 only in /program-edit's checklist and memory, where the design pass never saw them.
- `SES-5` **Warm-up / prep logs nothing — and carries no RPE.**
  - 2026-06-19; rx wording 2026-09-26
- `SES-6` **Lifting-day warm-ups can repeat rounds; cardio/running-day warm-ups shouldn't.**
  - 2026-07-08
- `SES-7` **Time-limited clients (esp. tennis): cap sessions ~45–50 min.**
  - 2026-06-15
- `SES-7` **The session length on the intake form is a starting guess, not a limit.**
  - 2026-09-26, Amir, verbatim: "sometimes an athlete when filling the form say i only have 60 minute, but then eveytime they go to the gym, they spend 75 minutes, and they NEVER complain, it means they could do more 😃 so days time cap, is usually not very important"
- `SES-8` **No competition calendar unless Amir names one.**
  - Amir, 2026-09-26: "if there is, i would tell you so, otherwise assume no"
- `SES-9` **Sequencing:**
  - 2026-06-15
- `SES-9` **Standard section (block) names**
  - 2026-06-17
- `SES-10` **Superset non-competing pairs**
  - 2026-06-15
- `SES-10` **Never superset a unilateral (two-sided) Primary lift with anything else**
  - 2026-07-18, Athlete L C2 — Single-Leg Dumbbell Hip Thrust had been mistakenly tagged as a superset partner for Front-Foot-Elevated Split Squat, the only such instance across every multi-primary day in this athlete's entire file; tag removed.
- `SES-11` **No supersets in an athlete's first cycle, or on any exercise new to that client**
  - 2026-07-05, Athlete M C1; again Athlete Q C1, caught 2026-09-15 on Amir's review — three supersets had been merged in mid-cycle, leaving 5 of 16 working exercises with no baseline going into "Forge — Earn the Load", while the Delt pair logged an identical `R1 9 · R2 9 · R3 9` against a prescribed RPE 7/8 for two sessions running. The same two lifts had logged cleanly per set, with RPE, before they were paired. Unpicked back to straight sets; volume unchanged.
- `SES-12` **A superset pair is authored as ONE `type: circuit` entry — never two `"standard"` exercises each carrying a `"superset"` chip.**
  - 2026-07-18, Athlete A C3 — shipped across all 4 days with every superset pair built this wrong way; caught only when Amir asked why the pairing wasn't labeled and why the first exercise still had its own rest. Root cause: the design SPEC template and this file's own "Chips & modifiers" section both listed `superset` as a valid chip/intent value — both fixed alongside this entry.
- `SES-13` **Round-format circuits log load**
  - 2026-06-17; the block default 2026-09-15, after prep circuits that forgot the old opt-out flag had been asking athletes for kilograms on mobility drills
- `SES-14` **A library session is as hard as its adaptation needs — it is never capped or softened by a weekly budget.**
  - Amir, 2026-09-20, verbatim: "the athlete doesn't have to pick 2 or 3. they might only do 1 so it doesn't matter if they are hard or easy, the difficulty should be based on the adaptation they are looking for."
  - 2026-09-20, the twenty new Train-library sessions — the planning panel had ruled a shared weekly ceiling across shelves; overruled.
- `SES-4` ****
  - 2026-09-26
- `SES-9` **Seven or more working exercises make a day a grind.**
  - 2026-09-26
  - It lived in /program-assemble and /program-edit without a number and joined this line when the skill-only rules were registered (Amir: yes).
- `SES-15` **Seven or more working exercises make a day a grind.**
  - The number lived in /program-design and /program-edit, and the checker already warned at 7.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).
- `SES-16` **A low-load brace primer may stay in prep.**
  - It lived only in /program-edit's Rule 2.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).
- `SES-17` **The athlete places the days; the programme never does.**
  - 2026-10-03. A first-cycle report asked a tennis player for his tennis days "to arrange the gym days around tennis", and the Debrief proposed moving one training day off a weekday after three short nights. Amir: "we dont write their fitness program around their tennis program. we just give instrcutions, we never say do 3nd day on thursday", then "the rule is not about tennis, its in any sport". Added during the rule freeze (PRC-25) because it fixed a real miss.

## Progression (coach-driven)

- `PRG-1` **Progression is coach-driven from the weekly logs**
  - 2026-06-15
- `PRG-1` **Set increments from logged data**
  - 2026-06-15
- `PRG-1` **Write once per cycle; adjust only on a report.**
  - 2026-07-12
- `PRG-2` **Prescribe RPE, never load — with ONE exception: the exercise note.**
  - 2026-07-12
- `PRG-1` `PRG-3` **Mid-cycle adjustments are report-driven only.**
  - 2026-07-12
- `PRG-4` **The RPE printed on a card is the athlete's NORMAL working target and never moves mid-cycle — every temporary reduction is explained in the notes, never baked into the prescription.**
  - Amir, 2026-08-07: "i wont change the program RPE in middle of the cycle … in their program you must write their normal effort target, but explain in the notes to reduce rpe for those reasons."
  - 2026-08-07
- `PRG-5` **The other half of that rule: if the athlete has to START lower, the notes MUST SAY SO — and say the number.**
  - 2026-08-21, Amir, verbatim: "Remember if some one has to start with lower rpe, you mention that in notes." Athlete N C2 shipped RPE 8 primaries to an athlete 16 weeks detrained with only a load-finding card and no stated week-1 ceiling.
- `PRG-6` **Never prescribe a rep range — always a single rep number.**
  - 2026-07-08, Athlete O C1 — caught 15 rep-range chips across the program and converted them.
- `PRG-1` **The program is written once per cycle and adjusted reactively, not on a fixed rewrite cadence.**
  - 2026-07-08
- `PRG-7` **Never tell the athlete the coach assigns/prescribes a specific weight.**
  - 2026-07-08, Athlete O C1 — caught two athlete-facing lines that implied weight assignment and reworded them.
- `PRG-8` **Progression/regression explainer note: mandatory for a NEW athlete, conditional after that.**
  - 2026-07-08, made conditional 2026-07-12
- `PRG-9` **Check the RPE-10 rate before a logged RPE drives a decision.**
  - 2026-09-05; into the rules 2026-09-26, when the audit found it living only in memory
- `PRG-10` **The dose follows the cycle's adaptation.**
  - It lived in /program-design STEP 2 as the "adaptation → prescription contract".
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).
- `PRG-11` **Over 30% of sets at RPE 10 means the RPE is a rep counter, not effort.**
  - The threshold lived in /cycle-report's checklist.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).

## Volume & dosing

- `VOL-1` **Volume is a report, not a rule, for a sport-performance athlete.**
  - 2026-06-15
- `VOL-2` **Manage load per DAY, not just per week — weight by systemic cost, then undulate.**
  - 2026-06-19
- `VOL-3` **Evidence-based volume ceiling for hypertrophy: ~10–20 hard sets/muscle/week, most of the benefit captured by ~10; per-session, ~5–10 sets/muscle is likely near the sweet spot in trained lifters**
  - 2026-07-08, sc-research brief — Schoenfeld 2017, Iversen 2022 umbrella review, Pelland 2025 meta-regression, Barbalho 2019, Krause Neto 2025 for glute-specific
- `VOL-4` **When the programme's aim is to get strong and build muscle, every major muscle clears ≥10 working sets/week — a hard floor, not a target**
  - Amir, 2026-09-26, verbatim: "its a floor for when the program aim is to get strong and build muscles, that rule is based on science of hyper trophy, for athletes, do what is best for them and their condition."
  - 2026-07-27, Amir, verbatim: "specially for women every major muscle in lower body should get at least 10, this is a hard rule, unless you have a very good reason not to" — Athlete G C2 first shipped with quads at 5.5 and hamstrings at 7.5 sets/wk, both wrongly justified as secondary-by-design.
- `VOL-5` **Check for unused session-time budget before calling a day "done."**
  - 2026-07-08, Athlete O C1 — first draft left 20–25 min unused on three lifting days; caught only because Amir compared it against her training age.
- `VOL-6` **The PATTERN is deferred; the EFFORT never is.**
  - 2026-08-08
- `VOL-7` **The SHOULDER is ONE muscle group, scored on the normal 10-20 range — press, side delt and rear delt all count against the same total.**
  - 2026-09-05, Amir, verbatim: "The whole shoulder total load should be 10 sets total. So if she is doing rear delt, it counts" and, when the rewrite landed at exactly 10, "10 is not a cap, 10-20 is good." Athlete G C3 first drafted at 26 shoulder sets/week by scoring each head against its own 10-20 range.
- `VOL-8` **Never more than 4 working sets on one exercise, until the athlete has PROVEN more in our own logs. If a muscle needs more volume, ADD AN EXERCISE.**
  - 2026-09-05, Amir, verbatim: "For an intermediate athele, never go for more than 4 sets in an exercise. Always add a new exercise. This is a rule." Scope set 2026-09-26: "some people call them selves pro, or they say that they have a long experience of gym training, but practically, they are very week, so doing 5 sets of something, will hurt them, but if we have an athlete , who proved him self, in the logs, and in our cycles, why not go over than that."
- `VOL-9` **Do not load horizontal pressing to hit a volume range on a rounded-shoulder / forward-head client.**
  - 2026-09-05, Athlete G C3 — chest held at 3 sets against a 10-20 range, deliberately.
- `VOL-10` **⚖️ COUNT EVERY EXERCISE THAT LOADS THE MUSCLE, NOT JUST THE ISOLATION WORK — and show the working in the coaching log.**
  - 2026-09-08, Amir, verbatim: "why are you calculating hamstring work just by isolated movements? she is getting them from rdls, hipthrusts and other stuff, all the muscles are like this, why are you focusing too much on isolation movements? … when the machine is not there, just being able to hit the minimum of 10 sets a week is good" and "i know sometimes you count some exercises as 0.5 a set, which is ok".
  - 2026-09-26, Amir: yes to "muscle credits + cost tier on each Spine entry so the checker computes volume tables and per-day load"
- `VOL-11` **A new athlete with no known lifts: no weighted exercise under 8 reps in the first cycle.**
  - 2026-09-24, Amir, verbatim: "i dont want to start with anything less that 8 reps in first cycle, because i dont know how good of athlete or how strong she really is". Saved as a principle 2026-09-25.
- `VOL-12` **Small muscles: 6–12 sets a week in a foundation cycle, more later.**
  - It lived only in /program-edit's Rule 4a, so no other stage saw it.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).
- `VOL-13` **A missing machine never bends the programme.**
  - It sat in that story and in /program-edit's Rule 4a without a line of its own.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).

## Testing

- `TST-1` **Light testing only:**
  - 2026-06-15
- `TST-2` `TST-4` **A max-rep test is an AMRAP to TECHNICAL failure, filmed — never an unstated all-out set.**
  - 2026-08-02, Athlete J C1 — all three audit lenses independently caught the unstated contradiction
- `TST-2` `TST-3` **No test goes to a grind: every max-effort set stops at the first rep that slows, shortens or breaks position.**
  - 2026-09-26: Amir left the test effort to the recommendation; this settles the design skill's old "genuine RPE 9–10" against the rule above.
- `TST-3` **A new athlete's first cycle has no max-effort test: the logged sets are its baseline.**
  - Amir, 2026-09-27, the second pipeline audit, asked "a new athlete's first cycle: a filmed AMRAP baseline test, yes or no?": "no". The index line had said yes while /program-design said no max-effort set in a first cycle.
- `TST-5` **Two or three flagged retests a cycle, no more.**
  - It lived in /program-design (the `test_flag` line and *The Ceiling*).
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).
- `TST-6` **A Rough e1RM is a trend, never a load.**
  - It lived in /program-design (*The Ceiling*) and /cycle-report.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).

## Communication & in-app text

- `COM-1` **In-app athlete text (message, outcomes, notes, completion) is ENGLISH.**
  - 2026-06-15
- `COM-2` **The WhatsApp handoff messages are PIPELINE OUTPUT, and they are written in the ATHLETE'S OWN LANGUAGE — not English, and not on request.**
  - Amir, 2026-08-08: "this actually should be part of our program writing pipeline."
  - 2026-08-08
- `COM-3` `COM-4` **⚠️ EVERY word an athlete reads must sound like AMIR wrote it — not like AI wrote it.**
  - Amir, 2026-07-30, verbatim: "write in a friendly human voice, dont let them think ai wrote these, let them think i wrote them, and my english is not very high level."
- `COM-5` **Notes speak in the athlete's app language — day numbers + on-screen names, never design-side shorthand.**
  - 2026-07-24, Athlete I C1 — Amir couldn't map "Control day" to anything in the app.
- `COM-6` **Exercise-scoped guidance goes ON the exercise — the `note` field.**
  - 2026-07-12
- `COM-7` **Coach-facing reports**
  - 2026-06-15, archive added 2026-06-28. The progression-sheet and e1RM sections were dropped 2026-09-26: Amir doesn't read them.
- `COM-8` **Personal note bodies (`notes.cards[].body`) render as real HTML, not one paragraph.**
  - 2026-07-08, caught on Athlete O's "How To Progress & Regress" note.
- `COM-9` **Every required note is on the spec's obligations list, and the checker holds engage to it.**
  - 2026-09-26, from the pipeline audit: engage's own list of required notes had left out the back-off week, "start lower and say the number", the film gate and the weigh-in, so those rules changed nothing.
- `COM-10` **Notes card count is a byproduct, not a target — never pad.**
  - 2026-07-12
  - Amir, 2026-09-26, yes to the audit's soft cap: nine live programmes carried 10 or more cards, and the required ones were getting buried among them. The required cards come first either way, COM-9.
- `COM-11` **Celebrate a genuine win every cycle, on its own card — never manufacture one.**
  - 2026-07-12
- `COM-12` **A cycle notes card and its matching exercise Coach's Note don't repeat each other.**
  - 2026-07-12
- `COM-13` **Body weight is logged in the programme app — when an athlete's goal actually turns on the scale, point them at it in a notes card.**
  - 2026-09-05, Amir: "if some one like Athlete K need to monitor her weight, add a note in their app and point it to them so they start using it". Moved 2026-09-12; this bullet still said Proof until 2026-09-26, and two programmes written that week sent athletes to a Proof button that no longer existed.
- `COM-15` **A Because is one sentence of 140 characters at most, written fresh each cycle.**
  - The checker has failed a long one since 2026-09-24; the limits lived in /program-engage PART 3b and SCHEMA.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).
- `COM-16` **A week note is short and says it once.**
  - It lived in /program-engage PART 3c, and the checker already warned on the length and the label.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).

## Coaching cues

- `CUE-1` **Exactly 3 cues per exercise — never more, never fewer:**
  - 2026-06-17; "calibrate to training age" retired 2026-09-26, it contradicted one set of cues for everyone
- `CUE-1` `CUE-2` **The cues live on the exercise, not the athlete.**
  - Amir, 2026-09-24: "the aim is to use these cues for all the exercises that everyone has from now on … if there is a cue for someone specific, it should be in coach's notes. thats why its there"
- `CUE-3` **Never create a new pill.**
  - Amir, 2026-09-25: "we only use the 10 pills which cover everything … remember to never create new pills", and on the pattern pills, which he had first taken for extra qualities: "pattern pills are good, if its ones i created in my library, ofcourse use them"
- `CUE-4` **Every programme write leaves the Spine more complete.**
  - Amir, 2026-09-24: "so everytime i write a program for an athlete, this gets more complete"
- `CUE-5` **Claude drafts library entries; only Amir approves them, and before the programme publishes.**
  - 2026-09-24, the Spine. Approval moved before publishing 2026-09-26: a first cycle had gone live with seven new drills as bare drafts, and every one of those cards was blank.

## Chips & modifiers

- `CHP-1` **No floating text on a card.**
  - Amir, 2026-09-25: "i suggest you put them in coaching notes as i dont like floating text and remember this"
- `CHP-2` **A modifier (`intent`) chip must be something the athlete actively does or holds in mind that set**
  - 2026-07-05, Athlete M C1 — dropped "knee control," "adductor focus," "anti-rotation," "no push-off," "dysplasia stability" as redundant with cues/ rationale already stated elsewhere on the card. 2026-07-18, Athlete A C3 — this file itself was found listing `superset` as a valid chip value, alongside the same mistake in SCHEMA.md's chip tables and the design SPEC template; all three fixed the same day, see "Session structure & time."
- `CHP-3` **Hold exercises write `Iso` in the Tempo — Amir's rule, verbatim (2026-07-24): "if it's a hold exercise, in the Tempo write Iso."**
  - 2026-07-24, Athlete I C1 — applied to the leg-extension holds and Side Plank. rx wording 2026-09-26.
- `CHP-4` **The app's RPE selector runs 6–10 — never prescribe an RPE below 6, anywhere.**
  - 2026-07-24, Athlete I C1 — shipped with RPE 4/5 on the walk-run, a step-down, and a recovery walk; Amir caught the selector mismatch and all three were raised to 6.
- `CHP-4` **The 6 floor binds INSTRUCTIONS as well as the card — any note telling the athlete to take RPE off must name the floor in the same sentence**
  - 2026-08-21, Amir, on Athlete N C2: "Again you prescribed rpe 5 but my app minumum is 6. That is a hard rule." The chip lint was clean; the notes card was the leak.
- `CHP-5` **A prescription is DATA: the `rx` object, never `chips[]`.**
  - 2026-09-20, Amir: "sometimes we have to write the time, in the reps chart … and sometimes the pills get mixed up."
- `CHP-6` **Say the tempo once, in its cell.**
  - It lived in /program-design, /program-assemble, the workout skill, SCHEMA and PROGRAM-APP.md without a number.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).
- `CHP-7` **A section's shared rest is written once, on its block.**
  - It lived in /program-assemble, the workout skill, SCHEMA and PROGRAM-APP.md.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).

## Naming

- `NAM-10` **Cycle names are cool & evocative**
  - 2026-06-15
- `NAM-11` **Day names (`focusTag`) have sports-headline energy**
  - 2026-06-15; art word 2026-09-19

## Process

- `PRC-1` **Writing a programme never touches the app. Ideas go to Amir; they are not built.**
  - Amir, 2026-09-25, verbatim: "this is a strict rule, you cant do that, when you write a program and you deliver, dont touch the html file, if you see anything or want to prescribe better in a way , or have a new idea, share it with me, dont change everything. the only thing that you can change, is that , when you actually prescribe a new movement or exercise, it should have cue, should be connected to our spine like other ones"
- `PRC-2` **A correction changes exactly what Amir named, and nothing else.**
  - Amir, 2026-09-25, after a request to turn grips into chips came back with a rebuilt Day 3, rewritten notes and seven exercises gone: "why did you changed her program and removed some of the exercises?"
- `PRC-3` `PRC-4` **Every design pass is checked, and reviewed where judgment is needed — Amir's standing order, not an option.**
  - Amir, 2026-07-24, verbatim intent: "it should happen for every single program you want to write for me." Reshaped 2026-09-25, when a new athlete's first programme took about 2 h 40 min of work, 70% of it two multi-agent panels, and about 50 approval prompts. Amir, on the five fixes: "yes, do all five".
  - Reshaped 2026-09-26 on Amir's "you decide what gets the highest quality program". The old shape, three independent arcs merged by grafting, produced the recorded roadmap errors (a 6-cycle arc; "do not add a fifth cycle"), and a grafted cycle loses the sequence logic that made it fit its own arc. A critic of ONE finished arc keeps the second opinion without the grafting.
  - 2026-07-24; reshaped 2026-09-25
- `PRC-3` **The roadmap is saved the moment it locks.**
  - Amir, 2026-09-27, the second pipeline audit, question 2: yes. Until then a new athlete's roadmap lived only in the chat until the last publish, so intake to publish had to fit in one chat, and a summarised chat could lose the names and dates.
- `PRC-4` **When Part A passes, engage runs straight on.**
  - Amir, 2026-09-27, the second pipeline audit, question 3: yes.
- `PRC-5` **Background agents work from files, never the database.**
  - 2026-09-25
- `PRC-6` **Ask the database as few times as possible.**
  - 2026-09-25: a new athlete's first programme made 43 database calls, 36 of them lookups, and each one stopped for Amir's approval.
- `PRC-7` **Every progression gate resolves to a MEASUREMENT, a FILM, or a THIRD PARTY — never the athlete's word.**
  - 2026-08-08
- `PRC-8` **A FILM gate is not real until the athlete is told to film.**
  - 2026-08-08
- `PRC-9` **⚠️ STAY IN SCOPE: track SYMPTOMS and PERFORMANCE. Never build a joint-assessment battery — that is a physio's job.**
  - Amir, 2026-08-08, verbatim: "im a strength and conditioning coach. how am i supposed to work with hip turn or wrist and upper back turn measurement? i havent studied those. we should just talk about symptoms, if anything hurts, refer. and try to mobilise and strength. but its a physio job to asses."
  - 2026-08-08
- `PRC-10` **The monitoring stack stays SMALL — five measures run religiously beat fifteen that get abandoned.**
  - 2026-08-08
- `PRC-11` **A gate that depends on someone ELSE acting is scoped to a variable, never to whole-cycle progression.**
  - 2026-08-08
- `PRC-12` **⚠️ EVERY program build ENDS with a COACH HANDOFF BRIEF — everything to measure, gate, film and watch for, and WHY.**
  - Amir, 2026-08-08, verbatim: "if there are things to be measured, to gate, to film or to watch for, i should be informed to watch for and think about it… sometimes you write something your self, and im not aware of which is stupid. you are my assistant and i need to be on top of everything."
  - 2026-08-08
- `PRC-13` **Reassessment is scheduled, not only reactive.**
  - 2026-06-28
- `PRC-14` `PRC-15` **THE ROADMAP IS 5 CYCLES OF 5 WEEKS. 25 weeks. That is the house shape.**
  - Amir, 2026-08-17, verbatim: "the rule is 5 cycles of 5 weeks and you need to remember that."
  - Written after a roadmap shipped as 6 cycles of 4/5/5/4/6/5 because the multi-lens panel argued the arc from the science and nobody checked it against the house rule.
  - The audit that day found 16 of 34 live programmes with no back-off at all, and no drop in week-5 session RPE across 12 finished cycles. Amir: "update the app in a way that it can show first week or last week".
- `PRC-16` **One record of who the athlete is today: the athlete profile.**
  - 2026-09-26, from the pipeline audit.
- `PRC-17` **Roadmap is created once and locked**
  - 2026-06-15
  - 2026-09-26, from the pipeline audit: four stages were changing the locked roadmap and none of them owned the change.
- `PRC-18` **Every cycle's design rationale is archived.**
  - 2026-06-28. On the server since 2026-09-07: the old `.claude/coaching-log/` files sat in this public repo. Progression levers and e1RM left the entry 2026-09-26, Amir: he doesn't read them.
- `PRC-19` **An athlete whose cycle ends without a renewal keeps the app, and gets no coaching.**
  - Amir, 2026-09-26: "let them, they can have access to their programs, they wont get any coaching"
- `PRC-20` **Cycles continue; they don't reset.**
  - 2026-06-28
- `PRC-20` **Rationale can be set or revised at any cycle, and the latest is the operative logic.**
  - 2026-06-28
- `PRC-21` **Menstrual-cycle phasing is NOT used**
  - 2026-06-15
- `PRC-21` **Period-week protocol IS used — as an adherence fallback, not performance phasing — confirmed per cycle, never auto-included.**
  - 2026-07-06, confirm-per-cycle 2026-07-12
- `PRC-22` **Athlete-first; naming & styling are downstream.**
  - 2026-06-17
  - 2026-07-12
- `PRC-22` **Design pass = programming first; polish later.**
  - 2026-06-15
- `PRC-23` **Skills cite rule IDs; they never restate a rule.**
  - 2026-09-26, from the pipeline audit: "reps are one number" was stated about ten times across CLAUDE.md, this file, three skills, SCHEMA and a memory note, and two of those copies said the opposite; a stale body-weight copy sent two athletes to a Proof screen that no longer existed.
- `PRC-24` **The cycle's headline quality is reported, never forced.**
  - Quality Map 2026-09-24; a WARN since 2026-09-26, Amir: "report it, but recommend what you think should happen"
- `PRC-25` **Rule freeze: no new rules until eight cycles have run on this pipeline.**
  - Amir, 2026-09-26, yes to the audit's recommendation.
- `PRC-26` **How the Quality mix counts.**
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).
- `PRC-27` **A first cycle's picture word is a foundation one.**
  - It lived in /program-roadmap.
  - Registered as it was on 2026-09-26 (Amir: yes to numbering the rules that lived only in skills).
