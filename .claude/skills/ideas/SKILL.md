---
name: ideas
description: Come up with product ideas for Amir's apps (program.html, coach.html, the TPS course app, the testing app, AA Proof) as a product strategist and UX designer — ideas grounded in what the apps and their data already hold, not generic fitness-app features. Use whenever Amir asks for ideas, features, "what could we add", "what's missing", "how do we make it better", a brainstorm, or a product review of any app. Reads the idea bank and his taste notes first so no idea is pitched twice.
---

# Ideas — product strategy for the coaching system

Amir asked for this on 2026-09-23 after the TPS course app's **exercise library** (every exercise
linked to its regression, its progression and every session it appears in). He liked it and did not
know where it came from. This skill is where it came from, written down so it can be done on purpose.

| File | What it is | When |
|---|---|---|
| **`TASTE.md`** | What Amir liked, rejected, and *why*, in his words. | **Before every run.** |
| **`BANK.md`** | Every idea pitched so far, with its status. | Before every run, and after. |
| **`SYSTEM-MAP.md`** | What already exists, app by app, and what data is already there. | Before every run. Update it when you find it wrong. |

## ⚠️ The rules

1. **Ground every idea in what exists.** Read `SYSTEM-MAP.md`, then open the real file for the part
   you are pitching against. An idea that already exists, or contradicts a ruling in `CLAUDE.md`
   (no yellow, tempo said once, rest never invented, rewards never revoked, Farsi for the course…),
   is worse than no idea: it costs Amir the time to say so.
2. **It is a coaching system, not a workout app.** Test every idea with: *would a good coach do this
   in person?* If no coach would, it is probably a gimmick.
3. **Connected beats isolated.** A new screen that links to nothing is the weakest kind of idea. The
   strongest ones add **no new data**: they give information that already exists a second doorway.
4. **No generic fitness-app features** (streak badges, social feeds, calorie counters, AI chatbots
   that "answer anything") unless the pitch says exactly why this system in particular needs it.
5. **Free to run.** An idea that costs Amir an hour per athlete per week does not scale past ten
   athletes. Say the coach-time cost of every idea out loud.
6. **Pitch, don't build.** Ideas end at a recommendation. Nothing gets built until Amir picks it.

## The lenses — run all of them, not just the first that works

**A · Invert the index.** Every hierarchy in the data is read one way. Read it the other way.
*week → session → exercise* became *exercise → every session*. Try it on everything:
test → the exercises it justifies · physical quality → the exercises that train it · cycle outcome
→ the sessions that serve it · cue → the exercises that share it · article → the exercises it
explains · pain area → the exercises that load it.

**B · Name the relationship.** For two things that sit on different screens, ask what the line
between them would be called: *regresses to*, *is tested by*, *explains*, *was replaced by*,
*predicts*. If the line has a good name, it is probably a feature.

**C · The in-person coach.** Walk the coaching process and ask at each stage what Amir does in a
room that the app cannot yet do:
assessment → decision making → exercise selection → programming → execution → feedback →
monitoring → progression → education → communication → review → adaptation.

**D · Show the reasoning.** The pipeline (`/program-design`, the coaching logs, the roadmap) produces
a lot of *why* the athlete never sees. What part of it would make them trust the plan more?
(Coach-only material stays coach-only: check before surfacing anything from `coaching_logs`.)

**E · Close the loop.** Anything the athlete logs should come back to them changed into something:
a trend, a decision, a next step. Data that goes in and never comes out is a missed idea.

**F · Unused data.** What is stored but never shown, or shown in only one app? (Session logs, RPE,
The Ceiling, body weight, Proof habits, test results, roadmap cycles.)

**G · The two users.** Every idea has an athlete side and a coach side. If it only helps one of
them, say so, and look for the version that helps both.

**H · Steal a pattern.** Strava, Duolingo, Whoop, TrainingPeaks, a good textbook's index. Name the
source and say what changes when it is moved into S&C for tennis/padel players.

## The run

1. Read `TASTE.md`, `BANK.md`, `SYSTEM-MAP.md`. Say in one line what you are skipping because it
   was already pitched or rejected.
2. Ask only what you cannot work out: **which app**, **who it is for** (coached client, course
   buyer, demo visitor, free Proof user, Amir himself) and **any limit** (offline, Iran, no extra
   coach time). If Amir already said, do not ask.
3. Go **wide first**: run every lens, aim for 3× the ideas you will present, throw most away.
4. Present the survivors. For each idea, in this order, unless Amir asks for another format:
   1. What it is
   2. The problem it solves
   3. How it works inside the app (which screen, which tap)
   4. What connects to what (draw the relationship: `A → B → C`)
   5. Why the athlete cares
   6. Why the coach cares, **and its coach-time cost**
   7. MVP — the smallest version that proves it, using data that already exists
   8. Advanced version
5. **Rank them.** Top 3, the one you would build first and why, and the ones you would cut.
   Show which ideas depend on each other (a shared data layer is often the real first build).
6. **Every result is an Artifact page — always, not only for long ones** (Amir, 2026-09-24: *"I like
   that you created an artifact for this … for next times, produce the same answer"*). Load
   `artifact-design` first. Use the house look of round 1 (green radial hero with 3–4 fact tiles,
   clay the only accent, Barlow Condensed + Barlow, paper/band sections, both themes). The chat
   reply is the ranking and the link. Round 1 is the reference: https://claude.ai/artifact/Bu746VeRc4uh2RVbF4F6Mv
7. Add every idea to `BANK.md` with status `pitched` and the date.

## The deep-dive — when Amir picks an idea

He asks for it as *"act as my app developer and coach and give me ideas of how we can add this"*.
Also an Artifact page. Reference: #5 The Card Remembers, https://claude.ai/artifact/NTtDNds5vcLoE6AfX21Zoj

1. **Read the real code first**: the functions the idea touches, the tables and their access rules
   (`pg_policies`), and the live numbers (row counts, how much history exists). Put 3–4 of those
   findings in the hero; they are what makes the brief trustworthy.
2. **Render the real screen** before designing over it. Supabase and Google Fonts are blocked from
   headless Chromium here, so write a throwaway `data/demo.json` (gitignored — `get_program` fails
   and the app falls back to it), serve with `python3 -m http.server`, drive it with the global
   Playwright (`PW=$(npm root -g)/playwright`, `executablePath` the chromium in `/opt/pw-browsers`),
   seed localStorage with `addInitScript`, screenshot. **Delete `data/demo.json` afterwards.**
3. Sections, in order: **Coach hat** (the rules the feature must obey, quoting
   `COACHING-PRINCIPLES.md`) → **Design directions** (2–3 options drawn as HTML mockups in the app's
   own card style, each with strong/weak, one marked Recommended, plus the advanced view) → **What
   connects** → **Developer hat** (numbered build steps with the files and functions, MVP vs next,
   docs in the same PR) → **Traps** → **Your call** (the decisions to make, the recommended pick
   highlighted, and "say *go with your picks*").
4. **Always include one idea that grows out of the picked one** and label it so (Amir liked the
   unrequested History Sheet in #5: *"I liked how you add a new idea"*). Add it to `BANK.md`
   **and to The Coaching Graph** (below).
5. Build nothing until he answers the decisions.

## The Coaching Graph stays the one map

Amir, 2026-09-24: *"if you have came up with a new idea along the way, this should be added to the
coaching graph."* The round-1 page (https://claude.ai/artifact/Bu746VeRc4uh2RVbF4F6Mv) is the one
place he reads every idea, so **every new idea from a deep-dive or a build goes onto it, and every
status change shows on it**, not only in `BANK.md`.
- The source is `graph/build.py` (one `dict` per idea with all 8 fields; grown ideas carry
  `layer="Grown along the way"` and `grown="<n>"`; `STATUS` holds *Built* and the brief's link) plus
  `graph/page.tpl.html`. Build into the scratchpad, never into the repo:
  `python3 .claude/skills/ideas/graph/build.py <scratchpad>`.
- Republish to the same URL: `Artifact` read it first (the tool refuses a publish over a version
  this session hasn't read), check nobody edited it, then publish `<scratchpad>/coaching-graph.html`
  with `url`. Update the hero's *Built so far* line in the template when something ships.
- Commit `build.py` and the template with the change, so the next session starts from the page as
  it stands.

## After Amir reacts

- Write his reaction into `TASTE.md` **in his words**, with the *why*. "Liked" alone teaches nothing.
- Update the idea's status in `BANK.md`: `picked` · `built` (with the commit) · `parked` · `rejected`,
  and the same on The Coaching Graph (`STATUS` in `graph/build.py`, then republish).
- If a reaction reveals a rule (e.g. "never show the athlete X"), add it to the rules above.
