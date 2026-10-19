# Rules — the habit app (`habits.html`, AA Proof)

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

Reference, section by section: [`HABITS.md`](../../HABITS.md). Every XP tunable: [`../../XP_SYSTEM.md`](../../XP_SYSTEM.md). Quest runs: [`../../QUESTS.md`](../../QUESTS.md).

## The habit app (`habits.html`, AA Proof) — read `HABITS.md` before changing it

The full account (the four tabs, the habits, progression, the leaderboard, roll call, the reward
track, seasons, quests, the free tier) is in **`HABITS.md`**; every XP tunable and the server copy of
the rules are in **`XP_SYSTEM.md`**; quest runs are in **`QUESTS.md`** (moved out of this file on
2026-09-26 and corrected against the code). What must never break:
- **Change behaviour, update all six in the same PR**: `HABITS.md`, `XP_SYSTEM.md`, `QUESTS.md`, the
  `renderManual()` prose (its numbers read the live constants, its prose does not), `privacy.html`
  (anything stored or shared) and `tourSteps()`. The tour points at real controls, so a moved button
  or a renamed tab makes it lie on a new athlete's first screen.
- **Scored twice.** The leaderboard scores on the server from `public.xp_rules` (id 1), the phone
  from constants in `habits.html`, and when they drift nothing errors. Every key on the row mirrors
  a constant (18 keys on 2026-09-26; the table is in `XP_SYSTEM.md` §8), and `bonusEvents()` mirrors `hab_bonus_xp()`: change both
  sides. Update the row with `rules || jsonb_build_object(…)` or `jsonb_set`, never by rewriting the
  whole object.
- **Career Mode (once the server's XP switch is on; `HABITS.md` → *Career Mode*):** the overall level, rank and XP are
  `get_profile()`'s (`careerOn()`, kept in `<id>_hab_career`, never in CFG), the phone's scorer counts the whole career with the
  WORKOUT habit at 0 a day (`scoreDays()`, `paidXp()`) and is only the preview of a tick (P13), the first open shows ONE reveal
  (`CFG.careerSeen`, kept through the cloud merge) and never a flood of level-ups, and a new season resets only the board's points.
  Before the XP switch (on since 2026-10-18) none of this changed a number. `?go=pass` opens Progress (the career screens are off since 2026-10-19: `HABITS.md` → *Career screens off*).
- **`live()` is present tense only**: anything that takes a `dayKey` uses `rosterOn(dayKey)`, UI row
  lists included. Only `stampRoster()` writes `CFG.roster`, append-only: a habit added lands today, a
  habit removed lands tomorrow, and a closed day never moves.
- **Rewards are never revoked.** `CFG.pass.owned` and `public.hab_titles` only ever add; titles are
  minted, never recomputed (a season reset drops every level). `PASS_TRACK` and `passTrack` change
  together, and season titles never go in `passTrack`.
- **One word, `streak`, two scopes**: a habit's streak sits on that habit, the day streak is always
  captioned DAY STREAK, and "run" never comes back.
- **"On target" means `dayQualifies()`.** Changing `streakQualifyPct` means both scorers and any text
  that names the number; a quest note never spells it out.
- **Ending a quest run keeps the XP already earned** (Amir, 2026-10-11): the dashboard's button is `end_quests(start, today)`, which keeps
  the run with an `end` day; both scorers read it (`hab_bonus_xp()`'s `qruns` CTE and `runEndKey()` in `habits.html`; pre-commit guard
  16 and `scripts/test_spine_sql.sh` run the same cases). `clear_quests()` removes a run and takes its XP back, so it is the SQL editor
  only, on purpose; the page never falls back to it.
- **Roll call pays no XP** and no scorer reads `hab_notes`. The client shows 7 days and the server
  keeps 9, on purpose.
- **Back closes the top layer here too** (NAV-01): `topLayer()` reads `UI`, `render()` ends with `navSync()`.
  **Never in the embed**: the iframe's history is the training app's, so it would steal that app's Back.
- **A new version says so here too** (2026-10-19, the rule above): `swTookOver()` sets `UI.newver` and one clay
  row under the header offers **Reload**. ⛔ **Never in the embed**: the iframe is a client of the same worker, so
  a reload from inside it would reload the training app's Home, not AA Proof.
- **Embedded (`?embed=1`, on the training app's Home) Proof only logs today** through its own doors;
  `checkLevelUps()`, the reward baseline, the tour, the install offer and the board sweep all stand down there,
  so every level-up and reward still gets its takeover in the full app (`HABITS.md` → *Embedded…*).
- **The leaderboard sweep runs once.** `autoJoinBoard()` puts a coached athlete on the board after their
  first finished workout (a free athlete's WORKOUT is locked, so they join from Crew themselves).
  `CFG.boardSwept`, stamped by the sweep and by any join or leave the athlete makes, means leaving
  sticks. Never re-join on boot.
- **Never invent another athlete's number** that an RPC does not return.
- **It is called AA Proof** in titles, headings and copy. `manifest.name`, `manifest.short_name` and
  the `apple-mobile-web-app-title` meta move together.
- **Free tier:** `"tier": "free"` in the athlete block is the only switch (`isFree()` the only test).
  Contact details live in `public.hab_contacts` (`/proof-signup`), never in a programme record.
- Quest weeks are a lever Amir pulls from coach.html → Today (`QUESTS.md`); a new season starts only on
  his word, with `start_season()` (`HABITS.md` → Seasons). Body weight lives in `program.html` (above);
  the backtick guard is at the end of this file.
