## Round 5: the lightest version (decided 2026-10-20, NOT BUILT)

> **Read this first.** After the design round (the page *Where Career Lives*, https://claude.ai/artifact/AriVWJQskSFE7na1Nn7i24), Amir cut the
> system down. Everything below this section that names badges, ranks, titles, the Grand Slam, the level road, card skins, weekly missions or
> personal quests describes the system **as it is live today**, until the cut ships. Until then the live system stays exactly as built.

**His words, in order (2026-10-19 and 20):** *"not many people are using the proof app … that's why i added these achievement to push people
more into using this game"* · *"Youre right, this is too much"* · *"I want to make it the lightest, but save the mechanics. Lets get rid of
badges. Lets get rid of ranks"* · *"Remove the titles"* · *"Remove the level road, card skins. Lets trim down what is not imporant and keep only
the things that is efficient to keep"* · *"Go with your picks. If anything is removed, like titles, remove from server as well. We still have
achievements right?"*

**Why:** in October 4 athletes logged a real habit (12 in August), over half of AA Proof's habit days were only the automatic workout tick, 8 of 40
athletes opened the full AA Proof app after the XP switch, and 17 trained in two weeks, all in AA Performance. About 17 mechanics for about 15
athletes active a week was too much. His aim: effort recognised by him and by others, a community, athletes doing more.

| # | Decision (all "go with your picks", 2026-10-20) |
|---|---|
| L1 | **One app for coached athletes: AA Performance** (`program.html`). Replaces decision 2 (AA Proof as the home) and D13 (the Home strip only). |
| L2 | **Athletes see six things:** their level (a number and a bar, **no rank name**); the four numbers (weeks held, sessions with Amir, personal bests, comebacks), each with its next mark; **moments**; one **simple monthly goal**; the **crew** (the Monthly Open, the month's honours, the Bell with kudos); and **Amir** (Courtside messages on WhatsApp, "Amir saw this" on a moment). |
| L3 | **Moments replace badges.** The four numbers' own badges become their **marks**: weeks held in a row 4 · 8 · 12 · 24 · 52 (Hold Serve, `held_weeks`), sessions 25 · 50 · 100 · 200 · 500 (Century), personal bests 5 · 10 · 25 · 50 · 100 (Record Breaker, `bests`), comebacks 3 · 5 · 10 (HARD TO KILL, `comebacks`). Crossing a mark is a moment with a share card and its XP, as today. No shelf, no metals. |
| L4 | **Every achievement stays** (Amir, 2026-10-20: *"Keep achievements, i like achievements"*): all of them, the ones earned in AA Proof included, shown as moments (a full-screen moment, a share card, a line in *Your moments*), no shelf. Where an achievement gave a title (The Distance, Double Up, The Proving Ground, THE FOUNDRY, BEDROCK, STILL STANDING and others), the achievement stays and the title goes. Ones that can no longer be earned (THE MACHINIST, retired; First Treble, which needs missions) stay with whoever has them. |
| L5 | **Removed: rank names, titles, badges** (Amir: *"Just remove names and titles and badges"*; all badges but the four marks), with the Grand Slam (made of titles), the level road and card skins. The **Academy** is never built (Amir's eight trees are kept as design input outside the repo). **Later, only if the numbers say so:** weekly missions, the full quest system, photos. Roll call is replaced by the Bell. |
| L6 | **Removed means removed from the server too** (Amir), and **nobody's XP or level changes** (Amir, 2026-10-20: *"Do not change people xp and level"*). This overrides GAME-1 for the removed kinds: their catalogue entries, the code that mints or shows them and their award rows go. **Each deleted award becomes a nameless XP fact on the same day with the same XP** (counted for the career and for season points exactly as the award was), so no athlete's XP, level or season points move by a single point. On 2026-10-20: 239 badge awards (32,435 XP, 23 athletes), 2 catalogue titles and 72 `hab_titles` rows (24 athletes); the 11 mark awards (3,700 XP) and the 67 achievements (7,700 XP) stay as they are. |
| L7 | **Layout: Home · Progress · Library · Crew · Coach.** The level, the four numbers, the monthly goal and *Your moments* live in Progress's "Your numbers" section, beside personal records. No Locker tab; the Coach tab stays; Crew is the one new tab. Home keeps one Career row (level and the nearest mark; Hold Serve folds into it), habits as one row of chips, and a row for a new note from Amir until it is read. |
| L8 | **The board keeps its order**; only the rank names go. |
| L9 | **The Monthly Open** (new): one challenge a month for the whole crew (the six tennis tests in `course_en`, the 5K), a result counts only with proof, closed in back-off weeks, one board, the honours on the 1st (Most sessions counts plan sessions; Full Month for everyone who did every plan session; Most improved in percent on a main lift). |
| L10 | **The monthly goal, simple:** one line Amir writes for an athlete on coach.html, one tick when it is done. |
| L11 | **Build order: Courtside first** (Amir's pick: his recognition), with the honours and the monthly goal, and **no new XP** in it, so it does not wait for D20 → D20 → the light screens in AA Performance, and AA Proof's career screens switched off → **the cut on the server, only after no app reads what it deletes** → Crew (the Bell) → the Monthly Open. Anything that adds or removes XP waits for D20. Every live database step waits for Amir's yes. |

**Step 1, Courtside, is LIVE (built and applied 2026-10-19)** (`supabase/stage75_career_courtside.sql`; `PROCEDURES.md` → *Stage 75: Courtside, as built*;
`COACH_DASHBOARD.md` → *Courtside*). Amir picked direction A of the design page (https://claude.ai/artifact/L3Tt3B6YPqMWcVgnN7nt9g) with *"Go with your
picks"*: a Courtside panel at the top of Today's right column, the month's honours at its top in a month's first week, the goal and his line under the
athlete's name; athletes see the goal, his line and "Amir saw this" with step 3; a tie shares an honour. No XP. **The stage numbers moved by one**
(`stage74_publish_cycle_label.sql` took 74), and again for step 3's server half (`stage77_career_my_moments.sql`, the athlete's own read of
Courtside): D20 = stage76, the cut = stage78, Crew = stage79, the Monthly Open = stage80. The new achievements took stage79 on 2026-10-19, so
Crew = stage80 and the Monthly Open = stage81.

**The new achievements are LIVE (2026-10-19)** (`supabase/stage79_career_achievements.sql`, rulebook version 5; `PROCEDURES.md` → *Stage 79*): 13 of
the 15 (Smooth Operator and Showed Up Anyway left out, GAME-5), three new tests (`total`, `best_run`, `month_held`), and a quiet back-pay of 51 awards
and 7,050 XP to 22 athletes, nobody down. Amir's word: "yes, go live with the 13 new achievements". **Four Courts and the finish-card nudge are LIVE** (program.html; its read,
`get_achievements()`, is stage80, applied 2026-10-19 on "yes, go live with Four Courts": `PROCEDURES.md` → *Stage 80*). Crew = stage81, the Monthly Open = stage82. Crew took stage81 to stage83 (its own fixes) and the reminders took stage84, so **the Monthly Open is stage85, applied 2026-10-19: plan A is finished.**

**Step 5, Crew and the Bell, is BUILT (2026-10-19), not applied** (`supabase/stage81_career_crew.sql`; `PROCEDURES.md` → *Stage 81*; the app:
`PROGRAM-APP.md` → *Crew and the Bell*; coach.html: `COACH_DASHBOARD.md` → *The Bell*). Exactly Amir's picks below: one feed, the Clubhouse, kudos
with names, his post pinned a day, 7-day posts and photos (1280 px JPEG at 75 %, 3 a day), Tell the crew only with a photo, the question on the first
visit, one yes then a switch per kind, under 13 never posts or rings, and the decided list of what rings. Three things the pages left to the build:
the photos are **rows in the database, not Storage files** (a Storage file cannot be deleted from SQL, so the 7-day sweep and an erasure would need
an Edge Function each); a moment rings only from the athlete's **latest yes on** (nothing from before it); a **no deletes** their posts, photos and
kudos at once (consent withdrawn). Amir ticks who is under 13 in coach.html (no age is stored anywhere else). Shown nowhere until applied.

**Step 4, the cut, is LIVE (2026-10-19)** (`supabase/stage78_career_cut.sql`, rulebook version 4; `PROCEDURES.md` → *Stage 78*): rank names, titles,
the Grand Slam, skins and every badge but the four marks left the server; each paying badge award became a nameless XP fact on its day, so all 35
athletes kept exactly their XP, level and season points. Amir's word: "yes, go live with the cut".

**Step 3, the light screens, is LIVE (2026-10-19)** (`PROGRAM-APP.md` → *Career, the lightest version*; `HABITS.md` → *Career screens off*).
Amir on the design page *Your Numbers* (https://claude.ai/artifact/6ZsZ5LsegSrJoT64ktnquK): *"go with
your choices about your numbers"*: Direction A, the Scorecard (one card on Progress: the level and its bar, the four numbers 2 × 2 with the next
mark; the goal under it; Your moments as a list), and the Crew tab arrives with the Bell in step 5, not before. **Share cards:** *"the cards are
very important part of this app, because we want to use it to advertise our brand. we need to design them carefull and with details later"*, so
a mark shares as Highlight Reel's achievement card for now (no metal, `sharecard.js` unchanged) and the cards get **their own design pass** after
the cut (a step of its own, three directions, the whole family: the training's five, the marks, the achievements, the honours, the Open).

**Amir on the Crew and Open page, 2026-10-19** (https://claude.ai/artifact/7fCYGFL6mboE3igFLUkE5E), for steps 5 and 6:
- **L9 changes: the Open is open in every week, back-off week included**, and *"the open can be any kind of challenge that i design"*, not only a
  test. His reason: *"the backoff week doesnt mean anything unless the person has a competition"*, and a new cycle already starts slow (the same
  day it became the coaching rule REC-4: no two slow weeks in a row, no back-off without a competition).
- **GAME-6 stands** (kudos, lines and shares pay nothing). Hiding who gave kudos was Claude's pick on the page, not the rule; he asked why. Claude's
  pick now: **show who gave it** ("Sara and 2 others"), still no XP and no push.
- **The free-text place comes back, with photos** (*"did we lose the place where we could share a message? i want that, on top of it i want to be
  able to send a phote but these messages and images should only exist for a little while"*): roll call's messages return in Crew beside the
  Bell's lines, with a photo, both short-lived, Amir can remove any post. This supersedes "photos later" in L5 and "roll call is replaced by the Bell".
- **Then, the same day: "for crew and the open go with your picks"**, so the page's five calls are decided: the Crew tab is **one feed** (A), the
  Open is **a card on Crew** (A), a result counts when **Amir confirms it** (the clip on WhatsApp; nothing stored), the Open's board is ranked **by
  the result**, and the yes/no question is asked **the first time an athlete opens Crew**. Kudos show who gave them.
- **Messages and photos live a week, not 24 hours** (Amir: *"yes i want messages and photos to be on the server for a week, but a certain quality
  of photo, not to fill in our servers, so should reduce the quality a bit (we think about this)"*): deleted from the server 7 days after they are
  posted, and a photo is made smaller on the phone before it leaves (the size is ours to pick; the Bell's design page proposes one).
- **How the Bell, the photos and the messages look is still open** (*"lets think how we can show bell and community photos and messages on the app,
  this needs to be nice because community is a pillar in our app"*): a design page with three directions comes first (*The Bell*,
  https://claude.ai/artifact/55fbdfUgJVxySL7EpihyWb: A Clubhouse feed, recommended; B a story rail; C a week board). **Amir, the same day: "Bell: go
  with your picks"**, so stage80 builds: **A, the Clubhouse feed** (one feed on Crew: a photo post is a card with the photo at 4:5, a moment a slim green
  line, kudos with names, a composer at the top); a photo is **1280 px on its long side, JPEG at 75%, about 200 KB**, its location data taken off, at
  most 3 a day per athlete; **Amir's post stays at the top for a day**; **kudos only, no replies** (a question still goes to WhatsApp); and **"Tell the
  crew" on the finished card** (one button that drafts the session's line, a photo optional). Posts are left out of `BACKUP_TABLES` on purpose (7 days).
- **What rings the Bell** (Amir: *"if some one reaches a new level it should again be a thing that can go to bell. if some one holds a week, it should
  go to bell. we need to think about the things that goes over there, because a pillar was that we want the athlete success to be seen by community
  (if they are ok with)"*): a new level and a held week ring, his words. Claude's list on the Bell page (section *What rings the Bell*, with the last
  four weeks' real counts: 8 to 10 athletes up a level a week, 3 held weeks, 3 bests, about 5 achievements, 1 mark, 1 cycle finished) adds marks,
  achievements, bests (the lift, never the weight), a cycle finished, the honours, an Open result and joining the crew; a finished session only through
  Tell the crew; a single comeback only at its marks; never a broken week, weights, RPE, check-in, pain, body weight or habits. One line per athlete a
  day; one yes, then a switch per kind. **Amir, the same day: "a session finished should be only in the bell if they want to add a photo to it. im ok
  with your picks"**: the list is decided, and Tell the crew posts a finished session only with a photo (no photo, no post).
- **Achievements get a big section** (Amir: *"we want to have a good big section on achievements as well ... we need to include everything we
  think is good to be celebrated and will help them to move more, and needs to be acknowledged"*): the page *Achievements*
  (https://claude.ai/artifact/WPHuuK2Y2z4jfEQUPVdqNt) lists all 22 by the four kinds with how many athletes hold each, proposes 15 new ones that
  push athletes to move more (rulebook version 4, D20; one needs a new fact, Showed Up Anyway), quiet back-pay on the start day, and three looks for a
  section on Progress (A Four Courts, recommended; B The Whole Board; C Next Up). **Amir: "Achievements: go with your picks"**: all 15 new ones,
  athletes who already did it get it quietly on the start day (a line in Your moments and its XP, no full-screen moment), **A, Four Courts** (a Next up
  line, the four kinds as four tiles, a tap opens a kind), and the nudge on the finish card ("Hold Thursday and you get Back to Back"). Built after
  the cut: the catalogue as rulebook version 4 (dry run to Amir first), the new fact for Showed Up Anyway in a small stage, then the section.
  **Live as 13, not 15 (2026-10-19, Amir: "yes, go live with the 13 new achievements")**: Smooth Operator pays for an easier RPE alone and Showed
  Up Anyway for a check-in answer, both ruled out by GAME-5; the act version of Showed Up Anyway (the first session finished early) would have gone to
  20 athletes, mostly for a day filed unfinished. So no new fact; rulebook version 5 (not 4: the cut took 4), stage79 (`PROCEDURES.md` → *Stage 79*).

**AA Proof:** frozen as the free door. Its career screens read what the cut deletes, so they are switched off before the cut (its habits keep working).
The phases 4 to 7 plan outside the repo (`C:\Users\Amir\AA-Career\phases4to7\`) is amended by `AMENDED-LIGHTEST.md` there.

---

---
*One section of the reference. The index is [`career/CAREER_MODE.md`](../../../career/CAREER_MODE.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
