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
6. Long results go in an **Artifact page** (load `artifact-design` first) so Amir can read them on
   his phone; the chat reply is the ranking and the link.
7. Add every idea to `BANK.md` with status `pitched` and the date.

## After Amir reacts

- Write his reaction into `TASTE.md` **in his words**, with the *why*. "Liked" alone teaches nothing.
- Update the idea's status in `BANK.md`: `picked` · `built` (with the commit) · `parked` · `rejected`.
- If a reaction reveals a rule (e.g. "never show the athlete X"), add it to the rules above.
