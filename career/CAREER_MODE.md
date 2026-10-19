# Career Mode: the gamification system

> **Start here.** What the system is, what each part is for, and the decisions behind it. How each part is worked
> out, step by step, is in **[`PROCEDURES.md`](PROCEDURES.md)**. Every number and every badge, title, mission and quest
> lives in the `.toml` files beside this one, and **[`README.md`](README.md)** says which file to open to change what.
>
> **Status (2026-10-18): phase 1 is live, in shadow** (applied on Amir's *"yes, apply it"*). The fact ledger
> (`supabase/stage66_career_mode.sql`) turns every save into facts on the server, the rulebook and the catalogue are rows
> made from these files (`python scripts/career_seed.py`), and on the live project Career Mode's habit XP equals Proof's
> for every athlete (34 of 34). The one thing an athlete saw in phase 1 was **Hold Serve on the training app's Home** (shipped the same day):
> the weeks held in a row, read from the facts, display only (`PROGRAM-APP.md` → *Hold Serve on Home*).
>
> **Phase 2, the XP switch, is DONE: built, rehearsed, applied to the live project (2026-10-17) and switched on 2026-10-18** (`supabase/stage69_career_xp_switch.sql`,
> *The decisions, round 3*, and `PROCEDURES.md` → *Phase 2, as built*). Season 1 opened at 06:00 UK on 2026-10-18 and the switch went on
> shortly after, on Amir's yes to the dry run's list (`rulebook.toml` version 3). Nobody needed a level kept.
>
> **Phase 3, rewards with meanings and the catalogue switch, is DONE: built, rehearsed, applied to the live project and switched on (2026-10-18)** (`supabase/stage70_career_rewards.sql`,
> `scripts/career/rollback_stage70.sql`, both apps behind `catalogueOn()` / `catalogueOnT()`; *The decisions, round 4*, and `PROCEDURES.md` → *Phase 3, as built*).
> The fix round of the same day split the profile in two reads, **the core (`get_profile()`) and the shelf (`get_awards()`)**, so the profile stays inside its
> 14 KB budget however long a career is; AA Proof keeps the shelf on the phone. The three rehearsals were repaired to start from the schema snapshot
> (phase 1: 67 of 67, phase 2: 49 of 49, phase 3: 181 of 181 for stage70 alone and 249 of 249 with stage73 on top, on the real rows of 2026-10-17).
> **The catalogue switch went ON on the evening of 2026-10-18, on Amir's word in chat** ("go live", then "yes, turn on the project and give everyone their awards"), at rulebook version 3
> (`rulebook.toml` → `[switch] catalogue = "2026-10-18"`). Both apps now show the awards, the four numbers and the Grand Slam row, and Proof's habit tiers and milestones are paid once in a career,
> as awards, no longer by the daily score. **The go-day in numbers:** each athlete's score under the old rules was kept first (39 athletes, `backup.career_catalogue_before`), the dry run was read before the seed,
> the baseline batches all answered `ok`, and `career_compare()` says `ok`. **318 awards were minted for 29 athletes** (2 of them titles) and **34,200 XP was back-paid**. **13 athletes went up a level (at most 4 levels) and nobody went down.**
> The season board's points of two athletes went down a little and one athlete's went up: the old Proof badge pay that was dated inside Season 1 is replaced by awards dated on the days they were earned, which fall before the season.
> The Upgrade paid 15,800 XP, every tier on a main strength lift, and Double Up paid none. Safety copies were taken before the switch: `backup.golive_20261018_career_scores`, `backup.golive_20261018_hab_titles`,
> `backup.golive_20261018_career_rules`, `backup.golive_20261018_career_catalogue` and `backup.golive_20261018_career_facts`. They are dropped with `backup.career_catalogue_before` 14 days after the go-day, on 2026-11-01.
>
> **The decisions on the go-day** (*The decisions, round 4*, below). D1 (when) was answered by Amir: now, not with Season 2. D10 and D11 (read every new string, sign off the catalogue) were waived by his "go live":
> the names, captions and numbers went out as written and can be changed later. D19 (Century and Sessions with Amir count paid sessions) is in, because he chose to go live with it built. D18 is his.
> **D20 is new, and it changes how every later change works: after go-live a change of rules applies forward only** (Amir's words and the meaning are in the D20 row).
> **D20 is BUILT and live (2026-10-19, `supabase/stage76_career_forward_only.sql`):** an award keeps the XP it was minted with (D12 reversed), a fact is priced by the rulebook version in force on its day, and a change of rules is a new version with `starts_on` = the seed day (`PROCEDURES.md` → *Stage 76*).
> The rest of this file is the design the build follows, phase by phase (*Build order*, below). Change anything here first, then build; a changed file is re-seeded (`README.md`, *How to change something*).
>
> **Stage 73, the fix of the same day, is APPLIED** (`supabase/stage73_career_main_lifts.sql`, `scripts/career/rollback_stage73.sql`; *round 4, as amended*, below). It went on the live project on 2026-10-18, **before the switch**: 8 parts, the five function bodies
> (`career_maxpct_key()` and the four it replaced) equal to the file by md5, `career_maxpct_key()` closed to anon and authenticated. The catalogue was then re-seeded at rulebook version 3 with the switch still off (its md5 equal to the files, `career_compare()` `ok`), and the switch followed.
> It applied after stage70 and after the weight units, stages 71 and 72, and replaced none of what they changed. The Upgrade and Double Up count main lifts only (D18, Amir's word), and a count over sessions counts the paid ones, so Century and Home's
> Sessions with Amir agree (D19, in).
> **D18 is answered, accessories included** (Amir, 2026-10-18, asked whether the accessories the Spine files under a main pattern should count: "Yes i want those to be exluded / You set up the rule for that").
> A lift counts toward The Upgrade and Double Up only when its Spine entry is on one of the seven main patterns, carries the strength tag and is not one of the four he named (Cable Face Pull,
> Machine Reverse Fly, 45° Back Extension, Cable Straight-Arm Pulldown). A main lift logged in pounds or plates counts too, in its own measure. The go-day confirmed the rehearsal: The Upgrade's back-pay is 15,800 XP (not 23,900), every tier on a main strength lift, and Double Up paid none (*round 4, as amended*, below).
> **The list of four fails closed, on a missing id, and that stays true now it is live:** if any of the four ids has no row in the Spine at all (a typo in the toml, the entry deleted or given a new id), The Upgrade and Double Up count no lift, for everyone, until it is put right, and the database log carries a warning that names the missing id. An entry taken back to draft does not stop them: a draft counts for nothing and keeps its place on the list. So check the four after any edit of those entries (`PROCEDURES.md` → *Stage 73* → *To apply*, step 0).
> If D19 is ever a no, `PROCEDURES.md` → *Stage 73* → *If D19 is a no* lists what comes out; D18 stands.

---

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
`get_achievements()`, is stage80, applied 2026-10-19 on "yes, go live with Four Courts": `PROCEDURES.md` → *Stage 80*). Crew = stage81, the Monthly Open = stage82.

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

## In one breath

Every meaningful action an athlete takes becomes a **fact**. Every fact earns **XP** and can unlock a **reward**, and
every reward stands for one of four words: **consistency, commitment, progress, resilience**. **Weekly missions** and
**personal quests** point at what to do next. The size of a moment decides **who hears about it**: the athlete, Amir,
the crew.

*Meaningful* means two things at once: Amir would want more of it, and the app can see it happen.

## Where it came from

- **Amir's brief, 2026-10-17:** *"first i want to create a system that celebrates achievements and progress and
  consistency. any meaningful action earns progress and get recognised by the client, the coach, and a community. it
  should have game mechanics like total xp and level, titles, badges, achievement. all of these mean something,
  consistency, commitment, progress, and resilience. i want to have weekly missions and personal quests. the details
  can be added or changed later."*
- **The pages:** the blueprint, https://claude.ai/artifact/42WHTUzoxmnr6axP64QNGN, and ideas round 3 (*Bragging
  Rights*), which it grew from, https://claude.ai/artifact/SV2d9r6SL7kq7RLBiAdewS.
- **The decisions, 2026-10-17:** Amir, *"go with your picks"*, on all eight (below). And: *"write down the functions and
  procedures into files i can then change, adjust or anything. i need to have this gamification system somewhere i can
  read and think about"*. This folder is that place.
- **The catalogue, 2026-10-17:** the four meanings worked out one by one on the page *Four Majors*,
  https://claude.ai/artifact/1wa7BQgeMAMipm24Fwzo1z. Amir: *"go with your picks, just remember that we need to show the
  client a visible progress and immediate feedback every time a meaningfull task is completed"* (GAME-13).

## The decisions (settled 2026-10-17)

| # | The question | What was chosen |
|---|---|---|
| 1 | Does the level ever reset? | **Never.** The level is the career. Seasons reset only the board's points. |
| 2 | Where does the game live? | **AA Proof is its home**: the profile (the Locker grows into it), Crew, missions and quests. The training app feeds it and shows one strip on Home: the level and this week's missions. |
| 3 | One scorer? | **Yes, on the server.** Proof's phone scorer becomes a preview that shows a tick's XP at once. |
| 4 | How big is the training? | **About half of a perfect week's XP.** Today it is 15–19%. |
| 5 | Which week? | **Missions run Monday to Sunday**, the same week for everyone, so a crew mission works. A held week keeps the plan's own training week. |
| 6 | What does the crew see? | **Only what the athlete agreed to show**, asked once at their first highlight, with a switch in Settings. Amir always sees everything. |
| 7 | Who sets the quests? | **The athlete picks one of three Amir approved, and Amir can assign one directly.** A cycle's outcomes can also become a quest. |
| 8 | The name | **Career Mode.** |

**The catalogue decisions (round 2, 2026-10-17, *Four Majors*):**

| # | The question | What was chosen |
|---|---|---|
| 1 | Tennis words in the names? | **Yes, each with a plain line under it**, so a runner gets it too: Hold Serve, Second Serve, Love Hold, All-Court, Grand Slam. |
| 2 | One behaviour, one badge? | **Yes.** Each habit keeps one badge, its Proof name, on five steps (at the catalogue switch). A streak no longer pays twice. |
| 3 | Retire HEAVY METAL and The Machinist? | **Yes.** HEAVY METAL paid for sessions on days in a row; The Machinist counted what Century counts. Anyone who has one keeps it. (**Day One never had an entry**, in any `.toml` or in `habits.html`: there was nothing to retire. Corrected 2026-10-18; it was named here by mistake.) |
| 4 | A lower RPE alone earns nothing? | **Yes.** It still shows on the This cycle card; a Progress reward needs the weight or the reps to go up. |
| 5 | The Grand Slam as the capstone? | **Yes.** A title in each meaning makes a fifth title. A Calendar Slam (all four in one season) can come later. |
| 6 | Free athletes see the Progress shelf locked? | **Yes**, as the pitch for coaching, the way the locked WORKOUT habit works today. |
| 7 | The twelve new pieces? | **All twelve:** The Long Count, Pulse Check, Love Hold, Veteran, The Upgrade, Flawless, Full Stack, By the Book, All-Court, Double Up, All the Way Back, The Proving Ground. |

And with it, a rule: **every meaningful action answers at once, visibly** (GAME-13).

**The switch decisions (round 3, 2026-10-17, phase 2).** Amir: *"go with your picks, but the season starts tomorrow"*.

| # | The question | What was chosen |
|---|---|---|
| 1 | One switch, or two? | **Two** (`rulebook.toml` → `[switch]`). The **XP switch** (phase 2, now): training earns XP, the WORKOUT habit pays 0 a day so a session is never paid twice, a closed habit day settles, and the level becomes the career level (never resets; the rank from it). The **catalogue switch** (phase 3, later): the entries gated on it (`retire_at` / `starts_at = "catalogue"`: one badge per habit, HEAVY METAL and THE MACHINIST retire, the training badges and the awards). Each is `"off"` until a seed turns it on with its day, and a switch never goes back off. |
| 2 | Does anybody's level go down at the XP switch? | **No.** An athlete whose career level would be below the highest level they reached in AA Proof (their best season record, `hab_season_results`, or Proof's level this season, whichever is higher) gets ONE `level_kept` fact at the XP switch that brings them to it. It counts toward the career, never a season's points. Measured on the real rows (2026-10-17): of 38 athletes (the demo included), 31 go up, 6 stay, and 1 is kept at 12 by a top-up of 630 XP (Amir's own test identity); athletes who train a lot jump most (9 → 24, 5 → 19, 8 → 15; the top athlete 22 → 27). **At the real switch (2026-10-18) nobody needed it:** the dry run's list matched the approved one for all 38 athletes, 31 went up, 7 stayed, nobody went down and no `level_kept` fact was written, because Amir's test identity had reached level 12 on its own XP by then. |
| 3 | When does Season 1 start? | **2026-10-18**, Proof's own way (a scheduled task ran `start_season('Season 1', '2026-10-18')` at 06:00 UK): Pre-Season was archived with Proof's levels and its title at level 5 (30 athlete records, 18 titles). Phase 2 landed during Season 1 (the switch went on 2026-10-18, shortly after the season opened). Season points are derived from the facts, never stored, so at the XP switch Season 1's board is worked out again from 2026-10-18 under the new rules, training included: a session finished in Season 1 before the XP switch counts its 400, and its WORKOUT tick 0, from the moment the switch is on (checked in `scripts/career/rehearse_switch.mjs`). A season that closes under the XP switch archives its points and the career level, and gives its title at `[season] title_points` (2,000). |

**The reward decisions (round 4, 2026-10-18, phase 3).** Amir answered D1 on the go-day (now, not with Season 2) and waived D10 and D11 by saying "go live". D2 to D9 and D12 to D17 were never answered one by one, and the recommendation in each row is what was built and is live.
D18 is his (his words, relayed, and his answer on the accessories, below). D19 is Claude's pick, built in stage73 and in because he went live with it built. D20 is his, taken on the go-day, and reverses D12 (decided, not built). Each row is one constant, one `.toml` key or one branch, so a different answer is a small change, made under D20 from now on.

| # | The question | What is built (the recommendation) |
|---|---|---|
| D1 | When does the catalogue switch go on? | **Answered by Amir, 2026-10-18: now, not with Season 2.** The recommendation had been the day Season 2 starts (seasons start only on Amir's word; Pre-Season ran 12 weeks, so about 2027-01-10). Career XP and levels are the same either way. Season points moved a little: two athletes' went down and one's went up (the dry run listed each athlete's before and after) |
| D2 | Does history earned under the new entries pay? | **Yes, dated the day it was earned.** The dry run lists level before and after |
| D3 | What is the Resilience number? | **Habit comebacks plus training returns.** Second Serve stays its own badge |
| D4 | A free athlete's four numbers | **Day streak (best beside it), perfect days, habit steps, comebacks.** The Progress kind of win stays locked |
| D5 | Old and new badges with one name | **Only the new badge on the shelf**, the old award a line in its detail ("Earned before: HUMAN SPRINKLER II"). HEAVY METAL folds under Hold Serve, THE MACHINIST under Century |
| D6 | Custom habits | **One HOUSE RULES ladder over the best custom habit** |
| D7 | Moments | **At most one full-screen moment per app open, of any kind**; one earned by acting in this visit opens right then; a full-screen award not shown in 14 days becomes a wins-card line |
| D8 | The WORKOUT habit's weight | **Leave it** in the day gate |
| D9 | Five achievements written as prose | **Read as listed in `achievements.toml`** (Flawless, By the Book, All-Court, All the Way Back, The Proving Ground) |
| D10 | Every new athlete-visible string | **Amir reads the whole table before the go-day commit** (English only). **Waived by Amir's "go live" (2026-10-18):** the strings went out as written and can be changed later (D20: a rename changes only the label) |
| D11 | The catalogue sign-off | **Amir signs off every name, caption, tier `at`, xp, size and the eight event meanings** before the go-day. **Waived by Amir's "go live" (2026-10-18):** all of it went out as written and can be changed later (D20). Tier order is permanent from the switch (rule 21) |
| D12 | Does a retune move XP already earned? | **Yes: an award is priced from the current catalogue at scoring time**, like every fact (its mint price is kept for display and as the fallback). A history crossing that pays 0 stays 0. **Reversed by D20 (Amir, 2026-10-18), built 2026-10-19 (stage76):** an award keeps the XP it was minted with, and a retune applies forward only |
| D13 | Where the training app shows Career | **The Home strip only**: the Career row gains the four numbers and the nearest goal. No new screen |
| D14 | `comebacks` history | **A history crossing pays unless the habit comebacks alone had already reached that tier** (Proof paid it) |
| D15 | Proof's Progress statgrid | **Keep it**; Milestones counts catalogue awards; the shelf below is regrouped into the four kinds of win |
| D16 | The finish card's moves | **Every ladder the session moves, crossed ones first, three lines and "+N more"** |
| D17 | The day streak's repeat celebrations | **Keep the repeat takeovers**; the award is minted once, silently |
| D18 | Which lifts can move The Upgrade and Double Up? | **Main lifts only, and the accessories are out** (Amir, 2026-10-18, relayed in his words from the other phase 3 chat: "Have the session that owns the live phase 3 build make The Upgrade and Double Up count main lifts only, before the catalogue switch goes on"; asked then whether the accessories the Spine files under a main pattern (Cable Face Pull, Machine Reverse Fly, 45° Back Extension, Cable Straight-Arm Pulldown) should count, he answered the same day: "Yes i want those to be exluded / You set up the rule for that"). **The rule Claude set up:** a lift counts only when the approved Spine entry whose name (or alias) it is (1) is on a pattern in the entry's `patterns` key (squat, hinge, single-leg, push-horizontal, push-vertical, pull-horizontal, pull-vertical), (2) carries at least one quality in the entry's `qualities` key (`["strength"]`, the Spine's own strength tag, one of its ten qualities) and (3) is not in the entry's `exclude` key (Spine ids that never count, whatever their tags: `back-extension-45`, `cable-face-pull`, `machine-reverse-fly`, `cable-straight-arm-pulldown`, the four he named). **Why three of the four are listed although the tag already leaves them out:** only the back extension is tagged strength, so for it the list is what keeps it out; the face pull, the reverse fly and the straight-arm pulldown are out by (2), and listing them keeps his decision if a Spine tag ever changes. A lift the Spine cannot place, or files under a pattern off the list (isolation, carry, rotation, mobility), counts for nothing, as in All-Court. A main lift logged in pounds or plates counts in its own measure (stage72 keeps a lift's series per measure, and the Spine match takes the measure off first). An entry with no `patterns` key reads every lift, as before; one with no `qualities` key has no quality filter; one with no `exclude` key leaves nothing out. All three lists are rows in the toml (GAME-10), so a different list is a re-seed, not code, and a strength tag added to an entry on the Spine brings it in with no change at all. **The list fails closed, on a missing id:** while any id in `exclude` has no row in the Spine (the entry deleted or given a new id, or a typo in the toml), the server counts no lift at all toward The Upgrade or Double Up, for every athlete, and writes a warning in the database log that names the key and the missing ids, until the Spine or the list is put right; otherwise the list would silently exclude nothing, the 45° Back Extension (tagged strength) would count again, and a mint is never taken back (GAME-1). An entry taken back to draft is no stop: a draft is placed nowhere, so it counts for nothing while it is one, and it is still on the list when it is approved again. Nothing already minted is taken away. *What counts as a main lift*, below, has what the rule leaves out |
| D19 | Does repeating a plan day move Century? | **No.** GAME-4 (Amir's design rule: past the plan, more never beats as written) already pays one session per plan day per training week, live since phase 2, so a repeated day earns no second session's XP; D19 makes the count Century reads follow the same cap. *Claude's pick, built in stage73 and applied on 2026-10-18. Amir chose to go live with it built, so it is in.* A count over a kind the rulebook caps counts only the facts `career_facts_paid()` pays, one session per plan day per training week. Kinds with no cap are counted as before. **Home agrees with Century:** the four numbers' *Sessions with Amir* (`numbers.four.commitment`) is the same paid count, taken from Century's own `have`, so the Home row never says 50 sessions while Century counts 46. `get_profile()`'s older `numbers.sessions_with_amir` stays the plain count of every session fact, and the training app's +1 for a session finished on the phone skips a plan day done again in its week. **Not changed:** THE FOUNDRY's *16 sessions* is days the WORKOUT habit (id `strength`) was hit in AA Proof's own log, so a plan day done again on another date still moves it though it no longer moves Century; Amir may still want to know. **If he ever says no,** D18 stands and `PROCEDURES.md` → *Stage 73* → *If D19 is a no* lists what comes out |
| D20 | After go-live, does a change of rules re-work everyone's XP, level and awards? | **No: a change applies forward only** (Amir, 2026-10-18, in his words: "this is not a matter of live or death, we may change rules, xp, name of the achievements later. after switching on, if the rules about xp changes, or rules about the achievements change, the people with the achievements wont lose theirs, but from that point forward, it would be different ... to prevent from calculating everyone level and achievement again and again, everytime something changes"). **What it means:** (1) a change to an XP value, a cap or what earns an achievement ships as a **new rulebook version with a start day**; facts and awards dated before that day keep the prices they had, and the new rule applies from the start day on. (2) **An award keeps the XP it was minted with.** This REVERSES D12, which prices an award from the current catalogue at scoring time. (3) **A rename changes only the label** (a name, a caption): nobody's XP, level or awards move. (4) **Nobody loses an award or a level because a rule changed** (a mint is never taken back, GAME-1). (5) **A bug fix** (a rule that never did what it said) is the one case Claude does not decide: it asks Amir whether the fix applies backwards or forwards. **BUILT 2026-10-19** (`supabase/stage76_career_forward_only.sql`; `PROCEDURES.md` → *Stage 76: D20, as built*): an award keeps its minted XP, a fact is priced by the version in force on its day, a new version needs `starts_on` = the seed day, the same version may change only labels, and the seed refuses a change to the habits, the level curve, the season, the week or how a fact is worked out (a bug fix: Amir decides backwards or forwards) |

**Round 4, as amended (2026-10-18): main lifts only, and paid sessions only.** D18 and D19 are built in `supabase/stage73_career_main_lifts.sql` and were **applied to the live project on 2026-10-18, before the catalogue switch**.
D18 is Amir's word and carries his rule on the accessories (below); D19 is Claude's pick and is in because he went live with it built. Before the apply, on the real rows of 2026-10-17: no Double Up and no NEW ENGINE from a lift the rule does not count
(before the fix they went to two athletes, one through a Dumbbell Forearm Rotation and one through a Machine Seated Leg Curl, both isolation lifts), The Upgrade's back-pay for real athletes falls from 23,900 to 15,800 XP
(32 awards to 24, nine athletes to eight), Double Up's 1,000 XP goes, and Century's back-pay falls from 3,900 to 3,000 XP (one athlete loses a bronze, another a silver, and three more bronzes are dated later):
43,900 to 33,900 XP in all. **2,700 XP of that fall is Amir's rule on the accessories:** the first build, which let the Spine's pattern decide, left The Upgrade at 18,500 XP (27 awards) and the total at 36,600; the strength tag and the four ids take away one athlete's tiers 2 to 4 and date another's tiers 1 and 2 two days later (*What counts as a main lift*, below). **Home's Sessions with Amir moves for 13 real athletes, always down to the paid count** (three of them: 50 to 46, 74 to 72, 26 to 24).
Of the 659 awards stage70 alone gives in the rehearsal (the made-up athletes included, with the test cases for the rule), 77 differ (68 withheld, 9 dated later), none added; 21 of the 77 are real athletes' (14 withheld, 7 dated later; the other 56 are made-up athletes', seven of them a pounds-and-plates case that stage70 alone paid in full); nothing else moves. Rehearsed 249 of 249 (251 of 251 with `--vs-awards`). **With D18 alone** (D19 a no) Century stays as it is, 67 of the 77 awards differ (16 of the 21 real ones) and the real back-pay is 43,900 to 34,800 XP (worked out from the per-entry lines, not run separately). How it is built:
`PROCEDURES.md` → *Phase 3, as built* → *Stage 73*.

**What counts as a main lift (Amir's answer, 2026-10-18).** The first build of D18 read *the lift's Spine pattern is one of the seven main patterns* and let the pattern decide. The Spine files some accessories under those seven
(Cable Face Pull, Band Face Pull, Band Pull-Apart and Machine Reverse Fly under pull-horizontal; Cable Straight-Arm Pulldown, Banded Scapular Pull-Down, Dead Hang and Scapular Pull-Up under pull-vertical; Scapular Push-Up under push-horizontal;
45° Back Extension and the glute bridges under hinge; Wall Sit under squat; Hip Airplane and Single-Leg Balance under single-leg), and on the real rows 8 of the 27 real The Upgrade tiers the patterns alone gave rested on two of them (the 45° Back Extension and the Cable Face Pull), so Amir was asked whether they should count. A ninth rested on Half-Kneeling Single-Arm Cable Row, which he did not name and the strength tag now leaves out (below).
He answered: "Yes i want those to be exluded / You set up the rule for that". **The rule Claude set up** is the D18 row's: the approved Spine entry a lift names is on one of the seven patterns, carries the strength tag and is not one of `back-extension-45`, `cable-face-pull`, `machine-reverse-fly` and `cable-straight-arm-pulldown`.
**Three of those four are listed although the tag already leaves them out:** Cable Face Pull and Machine Reverse Fly are tagged armour and muscle, Cable Straight-Arm Pulldown muscle only, so the list keeps his decision if a tag ever changes. The 45° Back Extension is tagged strength (hinge; strength, armour), so only the list keeps it out.

**What it leaves out**, on the Spine of the backup of 2026-10-17: 105 approved entries sit on the seven patterns (squat 8, hinge 26, single-leg 22, push-horizontal 9, push-vertical 12, pull-horizontal 16, pull-vertical 12). 67 carry the strength tag; the rule counts 66 of them and leaves out 39: the 38 with no strength tag, and the 45° Back Extension, which has it and is on the list.
Of the 16 entries a real athlete has a lift gain on, 12 count (Barbell Back Squat, Machine Hack Squat, Machine Leg Press, Barbell Hip Thrust, Barbell Romanian Deadlift, Dumbbell Romanian Deadlift, Single-Leg Dumbbell Hip Thrust, Dumbbell Bulgarian Split Squat, Dumbbell Lateral Box Step-Up, Dumbbell Reverse Lunge, Dumbbell Split Squat, Single-Arm Chest-Supported Dumbbell Row)
and 4 do not: three of the four he named (45° Back Extension, Cable Face Pull, Machine Reverse Fly; Cable Straight-Arm Pulldown has no lift gain yet) and **Half-Kneeling Single-Arm Cable Row** (muscle, armour; one athlete, 21.9%), which he did not name and the tag leaves out.
The rest of the entries without the tag have no lift gain on the real rows yet: movement and armour drills (the glute bridges, the hip-hinge drills, Banded Pull Through, Band Face Pull, Band Pull-Apart, scapular work, Dead Hang, Hip Airplane, Single-Leg Balance, Marching Step-Up, Skater Step-Out, the bodyweight Squat, Wall Sit),
the Seated Band Row and Seated Band Lat Pulldown, and loaded entries Amir may call main lifts, all tagged for other qualities: **Single-Leg Romanian Deadlift, Cossack Squat, Lateral Lunge, Lateral Step-Down, Kettlebell Swing, Single-Arm Landmine Push Press, Half-Kneeling Bottoms-Up Kettlebell Press, Cable Chest Press, Machine Incline Chest Press, Single-Arm Cable Row and Half-Kneeling Single-Arm Lat Pulldown.**
**A strength tag added on the Spine brings one in, with no code change** (the rewards stamp holds the Spine's `updated_at`, so the next full evaluate looks again). Rehearsed: a leg curl the Spine moves onto hinge with no strength tag mints nothing; tagged strength as well, it mints The Upgrade, Double Up and NEW ENGINE at the next `get_profile()`; moved back, nothing is taken away (GAME-1).

**The exclude list fails closed, on a missing id** (stage73 as built, 2026-10-18). `career_measures()` reads the list against the Spine whenever it works the measure out: while any id in it has no row in `public.exercises` at all (a typo in the toml that the checker passes, because it has no database, or an entry deleted or given a new id so that the old id is gone), the key counts **no lift at all**. The Upgrade and Double Up then read nothing for every athlete and mint nothing, and every evaluate that reads the key writes one warning in the database log that names the key and the missing ids; the save itself goes through, and an athlete just sees two rewards that stop moving. The silent alternative was worse: the list would have excluded nothing, the 45° Back Extension, which is tagged strength, would have counted again, and a mint is never taken back (GAME-1). Nothing already minted is taken away, and a tier crossed meanwhile is minted on its own day at the next full evaluate after the fix (rehearsed: the back extension's entry under a new id, then put right). **A draft is no stop:** an entry taken back to draft in coach.html → Exercises is placed nowhere while it is one, so it counts for nothing, and its id is still on the list when it is approved again (rehearsed: with the back extension's entry made a draft, the same sessions mint The Upgrade tiers 1 and 2 on the squat at once, and approved again nothing more is minted). **One edge, pinned by a check:** an approved copy of one of the four under a NEW id, with the old row left beside it as a draft, is a new exercise to the rule and counts if it qualifies until its id is added to `exclude`. **So deleting one of the four entries, or giving it a new id, switches both rewards off for everyone;** changing the list is a toml change in both files and a re-seed (`career/README.md`), and `PROCEDURES.md` → *Stage 73* → *To apply*, step 0, has the query that checks the four.

**What it changes on the real tiers**, against the first build (the patterns alone), on the same rows (three athletes, called A, B and C here): Athlete A's The Upgrade tiers 2, 3 and 4 (dated 2026-10-11; 400, 800 and 1,500 XP, 2,700 in all) are withheld, because they rested on the 45° Back Extension (50%) alone, and tier 1 keeps its day and XP, now on Dumbbell Romanian Deadlift (16.7%);
Athlete B's tiers 1 and 2 (200 and 400 XP) move from 2026-10-12, on Cable Face Pull (16.7%) and Half-Kneeling Single-Arm Cable Row (21.9%), to 2026-10-14, on Dumbbell Bulgarian Split Squat (53.6%); Athlete C's tiers 1 to 3 keep their days and XP, now on Barbell Hip Thrust (40%) and not on the back extension (33.3%). Nothing else moves, and Double Up and NEW ENGINE go to nobody, before and after.
The rehearsal's report (`--report`) lists them: its `-mainlifts.json` file has every entry on the seven patterns, the 39 the rule leaves out with the reason, the 16 with a real gain and the lift behind each real tier, and its `-vs.json` file the awards that changed against another run. The comment on `patterns`, `qualities` and `exclude` in `badges.toml` and
`achievements.toml` says the same. **Amir may want to know** that the strength tag, not the pattern, now decides, so the loaded entries in the list above that he might call main lifts (Single-Leg Romanian Deadlift, Cossack Squat, Lateral Lunge, Kettlebell Swing, Cable Chest Press, Machine Incline Chest Press and the rest) do not count until the Spine tags them strength.

---

## The loop

```
  the athlete does something meaningful
                │
                │  saved once, as a FACT: who, which day, what, the numbers
                ▼
      ┌───────────────────┐
      │  the fact ledger  │──────► XP ─► level ─► rank            (rulebook.toml)
      └───────────────────┘──────► badges, achievements, titles  (badges/achievements/titles.toml)
                │        └───────► missions and quests move       (missions/quests.toml)
                ▼
      RECOGNITION, by the size of the moment                      (recognition.toml)
        the athlete · Amir · the crew · beyond
                │
                ▼
      being seen brings the next action
```

One record (the facts) feeds everything else. That is the whole design: an action is saved once, and every number,
reward and message is worked out from it.

## The four meanings

Amir's four words. Every XP source, badge, achievement and title belongs to one of them, and says in one sentence what
it proves (GAME-3). Each meaning has **one number** on the athlete's profile, so the profile reads as four plain facts.

| Meaning | What it says | Earned by | Its number |
|---|---|---|---|
| **Consistency** | You keep showing up. | Habits done, days on target, weeks held, missions done week after week | **Weeks held** in a row, and the best |
| **Commitment** | You do the whole thing, properly, for the long run. | Sessions finished as written, every set logged, the check-in, a retest done, a cycle finished, the roadmap finished | **Sessions with Amir** |
| **Progress** | You are getting better. | Personal bests, heavier at the same effort, a retest beaten, a habit levelling up, a quest step | **Personal bests** |
| **Resilience** | You come back, and you keep going when it's hard. | A comeback, a held week straight after a broken one, a cycle finished despite a broken week, a Return quest Amir signs off | **Comebacks** |

**A free athlete** (Proof only, no programme) reads the same four from habits: days on target, perfect days, habit
levels, comebacks.

Proof already holds some of this: its consistency tiers (KINDLED to UNBREAKABLE) are Consistency, and its comeback,
BACK IN THE FIGHT, HARD TO KILL and the UNBOWED title are Resilience. They carry over unchanged.

### Each meaning in full (decided 2026-10-17)

Every meaning is built the same way: its number, an arc (something to earn in the first week, month, season and year),
badges, moments, titles, what points at it, and what it never pays for. The exact tiers, XP and sizes are in the `.toml`
files; this is the shape.

**Consistency: you keep showing up.** Number: weeks held in a row (a free athlete: days on target in a row).
- Arc: *Held* (first week held) → *Hold Serve I* (4 in a row) → *Hold Serve III* (12) → **CLOCKWORK** (52).
- Badges: **Hold Serve** (weeks held in a row, 4 · 8 · 12 · 24 · 52) · **The Long Count** (weeks held in all, which a
  broken run never takes back) · **Day Streak** · one badge per habit under its Proof name (HUMAN SPRINKLER, BLACKOUT
  ARTIST, GROUND COVERED, FULLY FUELLED, ZEN MACHINE, RUBBER BAND, IRON MONK; custom habits: HOUSE RULES) on five steps
  named KINDLED to UNBREAKABLE · **Treble** (weeks in a row with all three missions).
- Moments: Held · First Treble · **Flawless** (every week of a cycle held) · **Full Stack** (steps, sleep, fuel and
  water each on a 7-day streak at once).
- Titles: CLOCKWORK · THE CONSTANT (100 weeks held in all) · BEDROCK · STILL HERE.
- Never pays for: a session on a rest day.

**Commitment: you do the whole thing, properly, for the long run.** Number: sessions with Amir (free: perfect days).
- Arc: *First Blood* (first session) → *Paper Trail I* (10 sessions fully logged) → *Closer I* (first cycle finished) →
  **CENTURY** (100 sessions).
- Badges: **Century** · **Closer** (cycles finished) · **Paper Trail** (every set logged) · **Pulse Check** (the check-in
  done first) · **Love Hold** (weeks held by the book: every session, every set, every check-in) · **Veteran** (months
  with Amir) · CLEAN SWEEP · DAWN PATROL.
- Moments: First Blood · First Cycle · **By the Book** (a whole cycle by the book) · The Distance · The Centurion.
- Titles: CENTURY · THE DISTANCE · LIFER (two years with Amir) · MATCH FIT · SUN-FORGED · COLD-FORGED.
- Never pays for: a session past the plan, more volume, or the RPE number itself.

**Progress: you are getting better.** Number: personal bests. A free athlete sees this shelf locked: *Coached athletes
earn these from their programme.*
- Arc: *First Best* → *Record Breaker I* (5 bests) → *Beat the Test I* (first retest beaten) → **CLIMBER** (25 bests).
- Badges: **Record Breaker** (personal bests) · **Free Kilos** (heavier at the same effort) · **Beat the Test** (retests
  beaten) · **The Upgrade** (your most improved main lift against its first session, +10 · +20 · +30 · +50 · +75%).
- Moments: First Best · **All-Court** (a best in every main movement pattern in one cycle) · **Double Up** (a main lift twice
  its first number) · **The Proving Ground** (an event: three bests, a retest beaten, every week of the cycle held).
- Titles: CLIMBER · PROVEN (The Proving Ground) · NEW ENGINE (Double Up).
- Main lifts only for The Upgrade and Double Up (D18, Amir 2026-10-18): a Spine entry on one of the seven main patterns, tagged strength, minus four accessories he named (*round 4, as amended*, below).
- No mission asks for progress, on purpose. Never pays for: a lower RPE alone, or body weight.

**Resilience: you come back, and you keep going when it's hard.** Number: comebacks (the same for a free athlete).
- Arc (it starts at a setback): *Second Serve I* (the week after a miss, held) → *Back on Court* (a full week after two
  or more away) → *Played Through* (a cycle finished despite a broken week) → *All the Way Back* (the old best run,
  rebuilt).
- Badges: **Second Serve** (a week held straight after a broken one) · **Hard to Kill** (comebacks that stuck, from
  habits and, after the catalogue switch, from training) · Back in the Fight.
- Moments: Back on Court · Played Through · **All the Way Back** · Backbone.
- Titles: UNBOWED · RETURNED · SECOND WIND (five bounce backs).
- Never pays for: a setback itself. *The one shelf you can't fill by never slipping.*

### The Grand Slam

One title from each of the four meanings, any one, makes a fifth title: **GRAND SLAM** (prismatic, the biggest moment in
the system). The road's level titles don't count: they celebrate the career level, the sum of all four. The profile shows
the four slots, filled with the title won in each.

### Left out on purpose

A streak of training days (rest days are part of the plan) · a medal for training on a low check-in (it pays for
reporting a low day) · a badge for a lower RPE at the same weight (it pays for typing a smaller number) · body weight or
lifts as a share of it (body weight is never scored) · a weekly "set a best" mission (it pushes past the plan's RPE) · a
level for each meaning (one level and four numbers say it) · badges for kudos or posts (GAME-6).

### For Amir: the shape of an athlete

coach.html shows each athlete's four numbers side by side (phase 4). Consistency high and Progress flat: the plan may be
too easy, or the effort low. Progress high and Consistency low: talent and an irregular week. Resilience climbing: life is
getting in the way, and a WhatsApp may matter more than the plan. Commitment low: thin data for the next cycle.

## The pieces: nine mechanics, one job each

| Mechanic | What it is | Its job | It never |
|---|---|---|---|
| **XP** | Points for every meaningful action | Shows effort adding up | Gets stored, or pays for a typed value |
| **Level and rank** | Worked out from career XP: ROOKIE to IMMORTAL, five levels each, a star past 50 | The long arc | Resets |
| **Season points** | XP earned inside the current season | A fair race on the board, for new and old athletes | Outlives its season; the season's title stays |
| **Badges** | A quality built over time, in five metals: bronze, silver, emerald, amethyst, prismatic | Depth in one meaning | Is taken back; it is judged on the best ever |
| **Achievements** | A moment reached once | The story of a career | Repeats |
| **Titles** | A name worn beside your name | Identity and status | Comes cheap: rare, one worn at a time, never taken back |
| **Weekly missions** | Three jobs for this week, picked for the athlete | Direction for seven days | Needs a claim button, or pays more than its share |
| **Personal quests** | One long goal in steps, set with Amir | Direction for 2 to 12 weeks | Fails: it pauses instead |
| **Recognition** | Who is told, by the size of the moment | Being seen | Goes past Amir without the athlete's yes |

**The rule of thumb:** if it has tiers, it is a badge. If it happens once, it is an achievement. If you wear it, it is
a title.

## Recognition: who hears about it

Five sizes of moment. Each badge tier, achievement, mission sweep and quest carries its size in the catalogue, and the
size decides the audience. The athlete always sees their own.

| Size | For example | The athlete | Amir | The crew | Beyond |
|---|---|---|---|---|---|
| **Tick** | Any action | XP moves | nothing | nothing | nothing |
| **Win** | A habit tier, a mission done | The wins card | nothing | nothing | nothing |
| **Highlight** | A best, a badge tier, 3 of 3 missions, 4 weeks held | The wins card | Courtside, the message written | The Bell, with their yes | A share card, theirs to post (GAME-14) |
| **Milestone** | A new rank, a quest done, a cycle finished, session 100, a title | A full-screen moment | Courtside, with a heads-up when it can be seen coming | The Bell | A share card, theirs to post |
| **Legend** | The roadmap finished, Amir's Pick, a season title | A full-screen moment | Often his to give | The Bell | Amir's story, with their yes |

- **Courtside** is a short list on coach.html → Today: at most five moments a week, biggest first, each with a WhatsApp
  message already written in Amir's voice. Sending one is a tap. It is not a reason in `reasonsOf()`: good news never
  counts as "needs you".
- **The Bell** is a feed on AA Proof's Crew: a line per highlight, kept 7 days, only for athletes who said yes. One
  kudos per person per line. Kudos pays nothing (GAME-6).
- **Amir's own tools.** A **reaction** (one tap; the athlete sees *Amir saw this* on that moment; a mark, not a chat).
  A **commendation** (a badge only Amir gives, in any meaning, with one line of why). **Amir's Pick** (once a month,
  one athlete, a title nobody else will ever hold; the data shortlists three, Amir decides).
- **No chat comes back.** Every word from Amir still goes by WhatsApp.
- **Instant feedback, every time (GAME-13).** Amir, 2026-10-17: *"we need to show the client a visible progress and
  immediate feedback every time a meaningfull task is completed."* Every fact answers at once, on the thing tapped, before
  the server does: **what it earned** (+XP rising), **where it moved them** (the level bar fills, the meaning's number
  ticks up) and **the nearest goal it touched** with its new count (*Paper Trail 9 of 10*, *Lights Out 3 of 5*). A tier
  or mission it completes gets its moment right then; one only the server can decide shows at once, marked pending. A
  session's finish card lists everything the session earned before Done. The level bar and the four numbers are always
  on screen, each with its *next* line. The lines are `recognition.toml` → `[feedback]`; the steps are
  `PROCEDURES.md` → P17.

## Weekly missions

- **Three slots, picked for each athlete every Monday:**
  - **The plan:** the part of the programme they slipped on last week (a missed session, sets left unlogged, a skipped
    check-in, a retest due). Example: *Hold Your Week*. After a broken week it is *Second Serve*, the same job paid as
    resilience.
  - **The recovery:** their weakest habit last week. Example: *Sleep 7 hours on 5 nights*.
  - **The stretch:** something meaningful they rarely do. Example: *One recovery session from the Library*.
- **A crew mission** when Amir sets one: one goal for everyone with a shared total (*the crew holds 15 weeks*). It
  replaces Proof's Quest week lever. In Amir's words, weekly ones are **missions** and personal ones are **quests**.
- **Pays half of what the work inside it pays**, the same share for every mission (GAME-7). 3 of 3 adds a sweep bonus,
  and sweeps week after week build a Consistency badge (Treble).
- **Done by the facts.** No claim button. An unfinished mission ends on Sunday night, and nothing is lost.
- **Amir can pin, swap or pause** an athlete's missions for an injury, travel or exams.
- **A free athlete** has no plan slot: two recovery slots and the stretch.
- **No mission asks for progress, on purpose.** A personal best can't be ordered for a given week without pushing past
  the RPE the plan sets. Progress is paid by badges, achievements and quests.

## Personal quests

- **One at a time, two at most.** 2 to 12 weeks, 2 to 5 steps.
- **Three doors:** Amir assigns one from coach.html; a cycle's outcome becomes one; or the athlete picks one of three
  Amir approved for them (their choice, from his list).
- **A step closes on facts**, or on Amir's tick when only he can judge it: a first strict pull-up on video, a pain-free
  return.
- **Pays its share of the work**, plus a quest badge and sometimes a title. A finished quest always reaches Amir, and
  the crew with the athlete's yes.
- **Never failed.** A quest is paused or extended. A dropped quest leaves no mark.

## The engine, in short

The full account is in [`PROCEDURES.md`](PROCEDURES.md). The shape:

- **Facts** (one ledger on the server): every meaningful action, once. Written by `observe()` from what the apps already
  save: a session, the Proof log, a coach action. Derived facts (a held week, a best, a comeback, a cycle finished) are
  written by the same step.
- **The rulebook** (`rulebook.toml`): what each kind of fact is worth, the caps, the level curve, the shares.
- **The catalogue** (`badges.toml`, `achievements.toml`, `titles.toml`, `missions.toml`, `quests.toml`,
  `recognition.toml`): every reward and every mission and quest, each a block of plain settings.
- **One scorer** (`score()`, `evaluate()`): XP, level and season points are worked out from facts with the current
  rules; rewards are minted once and kept; missions and quests move; recognition is routed.
- **One profile, two reads** (`get_profile()` and, since the phase 3 fix round, `get_awards()`): both apps ask the server for the same
  **core** profile (the numbers, the level, the ladder, the ids of every award owned, the moments to tell). The **shelf** (every badge row with
  the day of each tier, the milestones, the full titles list, the recent awards) is `get_awards()`, read by AA Proof only when Progress opens.
  Courtside and the Bell have their own reads.
- **Offline:** the phone keeps the last profile, the way it keeps the plan, and shows a tick's XP at once, marked
  pending, until the server agrees.
- **Proof's entries kept Proof's exact rules until the catalogue switch** (phase 3, on since 2026-10-18). Phase 1 runs in shadow and must match Proof's
  own scorer, so a design change to an `origin = "proof"` entry is written as `retire_at = "catalogue"` on the old entry
  and a new entry with `starts_at = "catalogue"` (`superseded_by` links them). Nothing an athlete sees changes before the
  XP switch, and the catalogue entries changed at the catalogue switch (both have happened).

## The rules

The index line is the rule. A later doc cites the ID instead of restating it, the way `COACHING-PRINCIPLES.md` works.

| ID | Rule |
|---|---|
| **GAME-1** | **Facts are stored, points are derived, rewards are kept.** A fact changes only when the thing it records changes (an open day's habit count, a corrected session) and is voided, never deleted. XP and level are worked out from facts with the current rules. A badge, achievement or title, once minted, is never taken back. |
| **GAME-2** | **One scorer, on the server.** The apps write facts and show the profile. A phone may preview a tick's XP from the rulebook, marked pending; the server's number is the number. |
| **GAME-3** | **Every reward means something.** Each belongs to one of the four meanings and says in one sentence what it proves. |
| **GAME-4** | **The plan is the biggest earner.** A held training week is worth about half of a perfect week. Past the plan, XP shrinks (caps), so more never beats as written. |
| **GAME-5** | **Pay for the act, never for the value.** Logging an RPE pays; the RPE number never does. Answering the check-in pays; the answers never do. Progress is judged against the athlete's own history at the same effort, and a Progress reward needs the weight or the reps to go up: a lower RPE alone shows on the This cycle card and earns nothing. |
| **GAME-6** | **Social actions pay nothing.** Kudos, roll call lines and shares are the recognition, not the work. |
| **GAME-7** | **Missions and quests pay the same share of the work inside them.** A mission on a cheap habit is a cheap mission. Amir's lesson from the 27 July 2026 quest run: NO NEGOTIATION paid 7 times a supplement's value and THREE HARD DAYS 2.5 times a session's, and supplements took the board. |
| **GAME-8** | **Nothing is lost.** A hidden or deleted session stops paying from then on, and what it minted stays. A quest pauses; it never fails. |
| **GAME-9** | **The bigger the audience, the clearer the yes.** The athlete sees everything about themselves and Amir sees every athlete. The crew sees only what the athlete agreed to show, the public only what the athlete shares or approves. |
| **GAME-10** | **Every number is a row.** XP values, badges, achievements, missions, quests and thresholds live in the `.toml` files and, once built, in their tables. Changing a detail never needs new code. |
| **GAME-11** | **Amir's time is budgeted.** The system finds the moment and writes the message. He spends seconds each, about 10 minutes a week in all. |
| **GAME-12** | **One system for everyone.** Free and coached athletes share the rules and the board. A free athlete simply has no training facts. |
| **GAME-13** | **Every meaningful action answers at once, visibly.** In the same moment as the tap, never waiting for the network: what it earned, where it moved the athlete, and the nearest goal it touched. Nothing changes on screen without the athlete seeing it move. (Amir, 2026-10-17; `PROCEDURES.md` → P17.) |
| **GAME-14** | **Every reward is celebrated: a moment at its size for the athlete, and from highlight up a share card in its app's card family.** The instant answer is GAME-13; this is the celebration and the card. The training's family is Highlight Reel (`assets/js/sharecard.js`, built 2026-10-17: the five training cards, and a badge tier, an achievement, a title, a level and a quest drawn already for phase 3, opened by program.html's `openShareSheet()` and `openMoment()`); Proof's cards keep Proof's look. A card is drawn on the phone and leaves only when the athlete taps Share or Save; a share pays nothing (GAME-6). (Amir, 2026-10-17: *"the achievements, badges and other things need to have a celebration as well, those are important as well"*; `PROCEDURES.md` → P8.) |

## What exists today, and where it goes

Nothing built is thrown away. Proof's game becomes the habits half of the system, and everything already owned stays
owned. The rows below say *until* or *at the catalogue switch*: that switch has been on since 2026-10-18, so they describe what changed.

| Today | In Career Mode |
|---|---|
| Proof's XP weights and level curve (`XP_RULES`, the `xp_rules` row) | The rulebook. Habits keep their values, training joins, the curve is re-anchored |
| WORKOUT's 100 XP a day | Moves into the session fact (400) at the XP switch (phase 2). The habit stays on the day's list for the day streak, paying 0 a day; its weight still counts in the day gate and its tiers until the catalogue switch |
| Consistency tiers, KINDLED to UNBREAKABLE | Unchanged until the catalogue switch. Then each habit keeps one badge, its Proof name, on these five steps (one behaviour, one badge) |
| 32 milestones in marks, 5 events | Badges and achievements, each given its meaning (`badges.toml`, `achievements.toml`, `origin = "proof"`). At the catalogue switch HEAVY METAL (sessions on days in a row) and THE MACHINIST (Century's double) stop being earned; anyone who has one keeps it |
| The comeback, BACK IN THE FIGHT, HARD TO KILL, UNBOWED | Resilience, unchanged |
| The 14-reward road of titles and card skins | Stays: level titles and skins |
| Seasons and season titles | From the XP switch: seasons rank the board by season points; levels stop resetting. A season's title is earned by season points (`rulebook.toml` → `[season]`), and a season's record keeps its points and the career level at its end |
| `hab_titles` | Awards. Every title owned stays owned |
| Quest week and its 12 quests | Missions (`missions.toml`, `origin = "proof"`); the crew's run becomes the crew mission |
| The wins card and the full-screen moments | The athlete's column of recognition |
| Five share cards | Stay, in Proof's look. The training's five are built (Highlight Reel, 2026-10-17: New Best, Same Effort, Retest, Signed Off, The Distance), and every reward's card is drawn in the same family for phase 3 (GAME-14) |
| The board | Ranks season points, with titles beside names |
| Roll call | Stays, and still pays nothing |
| The training app's wins (`cycleWins()`) and automatic Personal Records | Progress facts |
| Round 3's ideas | Hold Serve is Consistency's held weeks. Courtside and the Bell are Amir's column and the crew's. Century Club is Commitment. Amir's Pick is his tool. The Win Ledger is the fact ledger |

## Build order

Each phase ships something Amir or an athlete can see, except the new scorer, which runs in shadow until it matches
Proof's to the point.

| Phase | What | Visible | Status |
|---|---|---|---|
| 1 | **Facts, in shadow.** The fact ledger, `observe()` on sessions and the Proof log, the rulebook seeded from `rulebook.toml`, `get_profile()`. It runs beside Proof's scorers and must match `hab_xp()` for every athlete before anything switches | Hold Serve's line in the training app: **shipped 2026-10-17**, a row on Home above Daily habits, the weeks held in a row and the next step (Amir: *"B, show it at zero, words ok"*; `PROGRAM-APP.md` → *Hold Serve on Home*) | **live 2026-10-17, in shadow** (stage66, applied on Amir's yes and seeded; PROCEDURES.md → *Phase 1, as built*). On the live project 34 of 34 athletes' habit XP equals Proof's, this season, the rolling week and all time (`career_compare()`) |
| 2 | **The XP switch: one profile.** Training earns XP, the WORKOUT habit pays 0 a day, closed days settle, the level is the career level (never resets) and nobody's level goes down (*The decisions, round 3*). Proof's level, rank and board read `get_profile()`; the phone scorer becomes the preview (P13); the board ranks season points from the facts, from a cache (`career_scores`) | The career level, revealed once in AA Proof; every tick answers with its XP and the bar; the training app's Career row on Home above Hold Serve, and the finish card saying what a session earns and the finished card what it earned (P17) | **DONE: built and rehearsed, applied to the live project 2026-10-17 with the switch off, switched on 2026-10-18** (stage69, both apps, 42 of 42 on the real rows, twins and a headless suite; `PROCEDURES.md` → *Phase 2, as built*; 34 of 34 identical before and after the apply; at the switch the dry run matched the approved list, 31 up, 7 the same, 0 levels kept) |
| 3 | **Rewards with meanings, and the catalogue switch.** The catalogue tables, `evaluate()`, awards. Proof's milestones, tiers and titles carried over; the training badges join; the entries gated on the catalogue switch take effect (one badge per habit, HEAVY METAL and THE MACHINIST retire) | The four numbers and the Grand Slam row; the finish card listing every badge a session moved; each reward's moment and share card (the cards are drawn already: Highlight Reel, GAME-14) | **DONE: built 2026-10-18, applied to the live project the same day, catalogue switch ON that evening** (stage70, both apps, rehearsed on the real rows: 163 of 163 on the day, 181 of 181 for stage70 alone now; the profile split in core and shelf; twins, headless and the checker green; `PROCEDURES.md` → *Phase 3, as built*). Applied on Amir's yes: every function body matched the file, the seeded catalogue matched the toml, and all 35 athletes' XP, level and season points were unchanged. The stage73 fix (D18, D19) went on first (rehearsed 249 of 249), and the go-day opened by checking that it was on. **The switch went on in the evening of 2026-10-18 on Amir's word** (D1 answered, D10 and D11 waived): 318 awards for 29 athletes, 34,200 XP back-paid, 13 athletes up a level, nobody down, `career_compare()` `ok`. Phase 3 is done. D20 (forward-only rule changes) is decided and not built |
| 4 | **Amir's column.** Courtside, reactions, commendations, Amir's Pick | coach.html → Today | not started |
| 5 | **Weekly missions.** The planner, the three slots, the crew mission in place of Quest week | Missions in both apps | not started |
| 6 | **The crew.** The Bell, kudos, the consent question at the first highlight, titles on every line | AA Proof → Crew | not started |
| 7 | **Personal quests.** Templates, the three doors, Amir's tick | Quests in both apps | not started |

## What could go wrong

- **The reveal.** Career levels jump when they stop resetting. The first open sets a baseline in silence and shows one
  moment, *Your career: level 31*, never thirty.
- **Two kinds of week.** Missions run Monday to Sunday while a held week follows the plan's week. The words on screen
  name which week, every time.
- **Gaming the numbers.** Habits are self-reported and a weight can be typed. Caps per day and week, no pay for values
  (GAME-5), and Amir sees every highlight.
- **Amir's time creeping up.** Courtside shows the five biggest moments of the week, not every one.
- **Privacy.** The Bell, a story and a public title rest on consent: `privacy.html` changes in the same PR as the Bell.
- **Scored twice, again.** Any rule a phone previews is a twin, so it goes into `scripts/check_twins.js` the same day.

## Open questions (details for later)

None of these blocks phase 1.

- **Changing a rule after go-live (D20).** Built 2026-10-19 (stage76). A rename changes only the label (the same version, re-seeded); a change of number or catalogue is a new version with a start day and applies forward only (the D20 row, above; `career/README.md`).
- **Names.** Every badge, title, mission and quest name is a draft. Amir renames freely (names should be cool, not
  literal).
- **The numbers.** Every XP value in `rulebook.toml` is a first draft. The level curve's `base` was re-anchored in phase 1
  from the shadow data (2026-10-17: 300 → 400, the measurement is beside it), so two months of solid work still reaches
  level 20.
- **The season title.** Decided with the XP switch (round 3): a season that closes under it gives its title to everyone with
  `[season] title_points` (2,000) season points. Before the XP switch, Proof's "level 5 inside the season" (Pre-Season closed that way, 2026-10-18).
- **Proof's milestones.** Which families become badges and which one-offs become achievements, and the meaning of each
  (`origin = "proof"` entries, first pass by Claude; Amir checks).
- **Farsi.** Every Farsi word (messages, badge and title names) is Amir's to write or approve.
- **Message lines.** The WhatsApp lines in `recognition.toml` are drafts in Amir's voice.
- **Library sessions and held weeks.** Drafted as: a Library session never counts toward a held week (only plan days
  do); a session finished early does.
- **Courtside heads-ups.** Which coming milestones Amir hears about before they happen (drafted: session 100 within two
  sessions, the roadmap's last week, a retest week).

## Keep in step when it is built

- Anything in `habits.html` keeps Proof's six-file rule (`HABITS.md`, `XP_SYSTEM.md`, `QUESTS.md`, `renderManual()`,
  `privacy.html`, `tourSteps()`), in the same PR.
- A new table goes into `BACKUP_TABLES`, the schema snapshot and `coach_erase_person()` the same day.
- A rule a phone previews goes into `scripts/check_twins.js` the same day.
- `privacy.html` changes with the Bell, the share card and Amir's Pick (what is shown, to whom, on what basis).
- The in-app guides name real controls: `tourSteps()` in Proof, `APP_GUIDE` and `ONB_TEXT` in the training app.
- `python scripts/check_career.py` passes after any edit to this folder, and a changed file is re-seeded on the server
  (`python scripts/career_seed.py`, then its one statement through the Supabase tool).
- **Until the catalogue switch, Proof's habit numbers lived twice:** the `xp_rules` row and `career/*.toml` (`[habits]`,
  the tiers, the `origin = "proof"` milestones and quests). `check_career.py` held them equal to
  `supabase/xp_rules_snapshot.json`, in pre-commit (rule 14). **Since the switch (2026-10-18) that rule no longer holds them equal**, but the copies are still there:
  AA Proof's phone previews a tick with its own constants (P13) and the `xp_rules` row is what `career_compare()` still reads, so a change to a habit number is a change to `rulebook.toml`, `habits.html` and the row together, and under D20 it applies forward only.
- **The training app's maths copied into SQL** (stage66): `career_entry_sets()` is `cycleBestSet()`, `histBestSet()`,
  `estimateOneRM()` and `parseLoggedKg()`; `career_win_gain()` is `winText()`'s verdict; `career_weeks()` is
  `cycleWeekInfo()`'s weeks; `career_habit_days()` is `hab_bonus_xp()`'s day gate. A change to the original changes the copy
  the same day (`career_compare()` proves the day gate on every real log).
- **And the other way round:** Home's Hold Serve row counts the weeks held in a row with `holdCount()`, program.html's copy of
  `get_profile()`'s loop. `scripts/check_twins.js` holds it to `scripts/career/hold_cases.json` and `scripts/career/rehearse.mjs` holds
  `get_profile()` to it on every athlete it builds: a change to one is a change to both.
- **The phones' copies of phase 2's rules** (the career's curve, the WORKOUT habit at 0 a day, a session's full log and check-in)
  are held to the server's own answers in `scripts/career/xp_cases.json` by `scripts/check_twins.js` §9, and the answers to the
  server by `scripts/career/rehearse_switch.mjs` (rewrite them with `--write-cases` after a deliberate change, on both sides).
- **Phase 3 (the catalogue switch):** `career_awards` and `career_recognition` are in `coach_erase_person()` (stage70's patch), `BACKUP_TABLES` and
  the schema snapshot (the coach.html lines, the restore script and the snapshot are in the phase 3 commit, rollout step 2); **no trigger evaluates on a DELETE** (an erasure must not mint);
  `career_evaluate()` stays inside its budget (on the longest log a Proof save costs 42 to 58 ms more, the spread being the PC's load, and a session save about 2 ms more under stage70 alone and 51 ms more with stage73 on top, because the capped counts of Century and Same Effort call `career_facts_paid()`; rehearsed on 2026-10-18, against a budget of 300); a badge's tiers are
  **append-only** (the award id is the tier's place in the list: `career/tiers.lock.json`, rule 21 of the checker, `career_seed.py --write-lock`).
- **The phones' copies of phase 3's rules** (the award id, the phone's scoring of the phone-decidable entries, the finish card's moves, Home's pending session (`careerRecPaid()`: a plan day done again in its week adds none, GAME-4), the five events'
  goals) are held to the server's own answers in `scripts/career/reward_cases.json` by `scripts/check_twins.js` §10, and the answers to the server by
  `scripts/career/rehearse_catalogue.mjs` (`--write-cases` after a deliberate change, on both sides).
- **The profile is two reads, and the two must agree** (phase 3 fix round, 2026-10-18). `get_profile()` is the core: `owned` (a **list** of award ids, sorted byte
  by byte, no days; it grows by about 25 bytes an award and is the only part that does), `title_worn`, `slam`, `ladder`, `near`, `moments`,
  `numbers.four` and `numbers.free`, `catalogue_version`; its `badges`, `achievements` and `recent` stay empty placeholders and it carries no `titles`
  list (`titles_owned` is phase 2's). `get_awards(p_athlete_id)` is the shelf (`athlete_id`, `catalogue`, `catalogue_version`, `badges` with `days`,
  `achievements`, `titles`, `recent`); catalogue off: the same keys, empty, `catalogue` null. It works nothing out and writes nothing, and has
  `get_profile()`'s access rule. A reader of `owned` uses a list, never `Object.keys()` or `owned[id]`. `rehearse_catalogue.mjs` proves every owned
  award is on the shelf with the day `career_awards` has, and that the core stays under 14 KB on the longest real career and on a simulated 200-award one.
- **AA Proof keeps the last shelf on the phone** (`<id>_hab_shelf`, `{ v, n, at, a }`: a cache, never synced, never in `CFG`, never written in the preview or
  the demo, never read in the embed). Progress shows it with no signal; it is read again when the catalogue version or the number of awards owned
  differs from what it was read under (`HABITS.md` → *Two reads: the core and the shelf*). The training app never calls `get_awards()`.
- **The score cache, `career_scores`,** is in `coach_erase_person()` (stage69's patch) and is in `BACKUP_TABLES` and the schema snapshot
  (`test_restore_backup.py` needs both at once). It holds no
  source: a stale or missing row is worked out again from the facts (`career_stamp()` says when).
