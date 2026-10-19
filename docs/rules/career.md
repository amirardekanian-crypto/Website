# Rules — Career Mode

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

The system and rules GAME-1 to GAME-14: [`../../career/CAREER_MODE.md`](../../career/CAREER_MODE.md). Every function step by step: [`../../career/PROCEDURES.md`](../../career/PROCEDURES.md). The numbers Amir edits: [`../../career/README.md`](../../career/README.md).

- `career/CAREER_MODE.md` — **Career Mode, the gamification system for both apps** (Amir, 2026-10-17: designed, decisions
  taken with *"go with your picks"*). One fact ledger and one server scorer; XP and a career level that never
  resets; badges, achievements and titles that each mean consistency, commitment, progress or resilience; weekly missions,
  personal quests; recognition for the athlete, Amir and the crew. Rules GAME-1 to GAME-14 live there (cite the ID).
  Every function step by step: `career/PROCEDURES.md`. The numbers and the catalogue are `career/*.toml`, which Amir reads
  and edits; `python scripts/check_career.py` checks them (pre-commit guard 20). When it is built, it supersedes the parts of
  `XP_SYSTEM.md` and `QUESTS.md` it names. **Phase 1 is live, in shadow** (`supabase/stage66_career_mode.sql`, applied 2026-10-17 on Amir's yes;
  `PROCEDURES.md` → *Phase 1, as built*): triggers on `athlete_progress`, `session_history`, `library_sessions` and
  `programs` write `career_facts` (a trigger never stops a save), `scripts/career_seed.py` turns the `.toml` files into
  `career_rules` / `career_catalogue` (re-seed after any edit), `get_profile()` is the read, and `career_compare()` must stay
  `ok`: Career Mode's habit XP equals `hab_xp()` + `hab_bonus_xp()` for every athlete. ⚠️ **Until the catalogue switch (2026-10-18),
  Proof's habit numbers lived twice**, the `xp_rules` row and `career/*.toml`; the checker held them equal to
  `supabase/xp_rules_snapshot.json` and no longer does (its rule 14 stops at the switch), but the phone's preview and the `xp_rules` row (which `career_compare()` reads) are still copies, so a change to Proof's rules is a change to all of them, and under D20 it applies forward only. Rehearse a change to stage66 with
  `node scripts/career/rehearse.mjs` (PGlite, nothing live; `--data <dump>` for the real rows, kept outside the repo).
  ⚠️ A trigger's exception block cannot catch a statement timeout (8 s for a signed-in request), so the work a trigger does
  per save stays small (at most 0.3 s on 2026-10-17). `scripts/career/rollback_stage66.sql` takes phase 1 off, on Amir's word only.
  **Phase 2, the XP switch, is DONE: applied to the live project 2026-10-17 and switched on 2026-10-18** (`supabase/stage69_career_xp_switch.sql`; Amir 2026-10-17, three decisions in
  `CAREER_MODE.md` → *round 3*; `PROCEDURES.md` → *Phase 2, as built*). The one gate is two, `rulebook.toml` → `[switch]`: `xp`
  (phase 2) and `catalogue` (phase 3; the badge entries say `retire_at` / `starts_at = "catalogue"`), each `"off"` or the day a seed
  turned it on, never back off. With the XP switch on: training earns XP, the WORKOUT habit pays 0 a day, closed days settle, the
  level is the career level (never resets; the road's titles, the board's level and coach.html's follow it), the board ranks season
  points from the facts through a cache (`career_scores`, a cache holding no source: `coach_erase_person()` empties it, and it is in `BACKUP_TABLES` and the snapshot),
  and nobody's level goes down (`[fact.level_kept]`, written once by the seed that turns it on; `career_seed.py --dry-run` shows the
  list first). Both apps read `get_profile()` only once it is on; it went on at the real switch (2026-10-18, rulebook version 3: 31 athletes up, 7 the same, nobody down, no level kept). Phase 3, the catalogue switch, is below (on since 2026-10-18). The phones copy three of its
  rules (the career's curve, WORKOUT at 0, a session's full log and check-in): `scripts/check_twins.js` §9 holds them to
  `scripts/career/xp_cases.json`, the server's answers, which `node scripts/career/rehearse_switch.mjs --backup <file>` writes
  (`--write-cases`) and checks (49 checks on the real rows); `scripts/headless/career.js` drives both apps. The way back is
  `scripts/career/rollback_stage69.sql`, on Amir's word only.
  **Phase 3, rewards with meanings and the catalogue switch, is DONE and ON: applied to the live project and switched on 2026-10-18** (`supabase/stage70_career_rewards.sql` and the main-lift fix
  `supabase/stage73_career_main_lifts.sql`, both applied that day, stage73 before the switch; `[switch] catalogue = "2026-10-18"`, rulebook version 3; Amir's word in chat, "go live", then "yes, turn on the project and give everyone their awards"; `PROCEDURES.md` → *Phase 3, as built* → *The go-day, as run*).
  The go-day: 318 awards for 29 athletes, 34,200 XP back-paid, 13 athletes up a level, nobody down, `career_compare()` `ok`. D1 was Amir's (now, not with Season 2), D10 and D11 were waived by his "go live", D19 is in. `backup.career_catalogue_before` and the five `backup.golive_20261018_*` safety copies are dropped on 2026-11-01. Pointers only:
  `career_awards` and `career_recognition` are in `BACKUP_TABLES`, the snapshot and `coach_erase_person()` (rollout step 2, in the phase 3 commit);
  **no trigger runs `career_evaluate()` on a DELETE**; the evaluate budget is asserted by `rehearse_catalogue.mjs`; a badge's tiers are append-only
  (`career/tiers.lock.json`); the phones' reward copies are held to `scripts/career/reward_cases.json` by `check_twins.js` §10.
  **Stage 73 is live** (`supabase/stage73_career_main_lifts.sql`; its way back is `scripts/career/rollback_stage73.sql`, never `rollback_stage71.sql`, and before `rollback_stage72.sql` if that is ever run; The Upgrade and Double Up count main lifts only, D18, Amir's word: a main lift is a Spine entry on one of the seven main patterns with the strength tag, minus the four accessories he named (`patterns`, `qualities` and `exclude` in the toml; a face pull, a reverse fly, a back extension and a straight-arm pulldown are out; a lift in pounds or plates counts in its own measure), and the list fails closed on a missing id, so the four ids must keep a row in the Spine for as long as the rule stands: one deleted or given a new id, or a typo in the toml's list, switches both rewards off for everyone, with a warning in the database log, until it is put right, and one taken back to draft does not (check them after any edit of those entries, `PROCEDURES.md` → *Stage 73* → *To apply*, step 0);
  Century and Home's Sessions with Amir count paid sessions, D19, in; a no to D19 comes out alone, `PROCEDURES.md` → *Stage 73* → *If D19 is ever a no*).
  ⚠️ **A change of rules applies forward only: D20 (Amir, 2026-10-18), BUILT and live since 2026-10-19** (`supabase/stage76_career_forward_only.sql`; `PROCEDURES.md` → *Stage 76*). An award keeps the XP it was minted with (D12 reversed); a fact is priced by the rulebook version in force on its day; a change of XP, a cap or the catalogue is a NEW `rulebook.toml` version with `starts_on` = the seed day, and its new rewards are dated from that day; the same version seeded again may change only names and captions; the habits, the level curve, the season, the week and how a fact is worked out cannot change by seed at all (the seed refuses: that is a bug fix, and Amir decides backwards or forwards).
  **Step 1 of it, Courtside (coach.html → Today: the week's moments with the WhatsApp line written, the month's honours, the monthly goal and "From Amir"; no XP), is LIVE: `supabase/stage75_career_courtside.sql`, applied 2026-10-19** (its 5 tables are in `BACKUP_TABLES`; `PROCEDURES.md` → *Stage 75*; the later steps are stages 76 to 82).
  **The new achievements are LIVE (2026-10-19)**: `supabase/stage79_career_achievements.sql` with rulebook version 5 (`PROCEDURES.md` → *Stage 79*): 13 new
  achievements (35 in all; Smooth Operator and Showed Up Anyway left out, GAME-5), three tests the server decides (`total`, `best_run`, `month_held`; checker
  rule 18), back-paid quietly (51 awards, 7,050 XP, nobody down). `career_rewards_batch()` reads `backup.career_catalogue_before` only while it exists.
  A Library achievement mints at the app's next `get_profile()` (the Library trigger evaluates nothing). **Four Courts** (Achievements on Progress, a kind in the sheet,
  the finish-card nudge) is LIVE in program.html (`PROGRAM-APP.md` → *Achievements, Four Courts*); its read `get_achievements()` is stage80, applied 2026-10-19.
  **Step 4, the cut, is LIVE (2026-10-19)**: `supabase/stage78_career_cut.sql` with rulebook version 4 (`PROCEDURES.md` → *Stage 78*). Only the four marks
  remain as badges, every achievement stays, no title, Grand Slam, skin or rank name is on the server (ranks stay only in `rulebook.toml` `[level]`, which
  D20 locks); each paying badge award that left is an `award_kept` fact with its XP on its day (`"proof": true` for AA Proof's, which `career_compare()` reads).
  The Upgrade left with it: Double Up alone carries the main-lift rule. A removed badge id never comes back (`tiers.lock.json` `"_removed"`, checker rule 21).
  **Step 3, the light screens, is LIVE (2026-10-19)**: the athlete's own read of Courtside is `supabase/stage77_career_my_moments.sql` (applied); program.html shows the level with no rank, Your numbers and Your moments on Progress, New from Amir and one Career row on Home (`PROGRAM-APP.md` → *Career, the lightest version*); AA Proof's career screens are off (`HABITS.md` → *Career screens off*). The four marks the app names are `careerMarks()`, held to `career/badges.toml` by `check_career.py` rule 23. Share cards get their own design pass later (Amir: *"the cards are very important part of this app, because we want to use it to advertise our brand"*).
  **The lightest version, decided 2026-10-20, steps 1 to 4 live (the cut 2026-10-19) and the 13 new achievements (stage79, rulebook version 5, 2026-10-19); Four Courts live (stage80); Crew with the Bell LIVE (stages 81 to 83, applied 2026-10-19); **the Monthly Open LIVE (stage85, applied 2026-10-19; `PROCEDURES.md` → *Stage 85*), the last build step of plan A, so plan A is DONE** — what is left of Career Mode is the share cards' own careful design pass** (`career/CAREER_MODE.md` → *Round 5*, decisions L1 to L11): one app for coached athletes (AA Performance, tabs Home · Progress · Library · Crew · Coach); athletes see a level with no rank, the four numbers, moments (the four numbers' marks and the achievements), a simple monthly goal, the crew (the Monthly Open, honours, the Bell) and Amir (Courtside); badges, ranks, titles, the Grand Slam, the level road and card skins are removed, **from the server too** (Amir's word), once no app reads them. D20 comes first; until the cut ships, the live system is exactly as built above.
