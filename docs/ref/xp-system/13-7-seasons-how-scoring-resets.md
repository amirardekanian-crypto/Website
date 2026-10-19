## 7. Seasons — how scoring resets

Scoring runs in **seasons**, like ranked play in a game. Only days on or after the
current season's start date earn XP — for the athlete's own level *and* for both
leaderboards. Days before it stay in their history (visible in the 35-day grid, still
counting toward streaks and consistency badges) but score nothing.

**Once Career Mode's XP switch is on, that is true of the boards only.** The athlete's level, rank and each habit's ladder count the
whole career and never reset (`HABITS.md` → *Career Mode (phase 2, the XP switch)*). A season still starts both boards from zero,
and it archives the season's points and the career level. The table under *What resets and what doesn't* has both columns.

**Right now it is `Season 1`, opened 2026-10-18.** `Pre-Season` ran from 26 July 2026, with athletes trying the app and
building a score from that date. Season 1 opened on 2026-10-18 at 06:00 UK (Amir's scheduled task `start-season-1`, `start_season('Season 1','2026-10-18')`,
Proof's own way: Pre-Season was archived with Proof's levels, 30 athlete records and 18 Pre-Season titles at level 5).

### Starting a season — the command

One line in the Supabase SQL editor:

```sql
select public.start_season('Season 1');                -- starts today
select public.start_season('Season 1', '2026-07-30');  -- or backdated
```

⚠️ **A future date is now refused** (stage25). It used to be advertised here, and it was
quietly destructive: `current_season()` filters `starts_on <= current_date`, so a row dated
next month is invisible to it — the archive would freeze at *today's* numbers with an
`ended_on` weeks away, the command would hand back the OLD season's name (reading as a
failure and inviting a re-run that inserted a duplicate), and the remaining weeks of play
would never be archived at all. Start a season on the day it begins.

⚠️ **`start_season()` is coach-only now, and was not before.** `set_quests()`,
`clear_quests()`, `set_coach_note()` and `hide_note()` have always carried an
`auth.jwt()` email guard; the one function that **resets every athlete's score** carried
none, while being executable by `anon`. The anon key ships inside `habits.html` and is
meant to be public, so any reader could have POSTed `/rest/v1/rpc/start_season` and wiped
the board. Fixed in stage25 with the identical guard (a null JWT is the SQL editor, which
is what keeps the command above working for Amir).

**Made a mistake? Undo it:**

```sql
select public.undo_season('2026-08-01');   -- the date the new season started
```

That removes the season row *and* the archive rows written when it closed the previous
one. It deliberately does **not** un-mint titles — nothing in this app may ever revoke a
reward, so an athlete who briefly held a season title keeps it.

That is the whole reset. It **deletes nothing** — it inserts a new row in
`public.seasons`, and from that date every score is computed from zero. Athletes see
their app pick it up on next open, with a toast: *"SEASON 1 has begun — scores start
from zero."*

To check what's live: `select * from public.current_season();`
To see the history: `select * from public.seasons order by starts_on;`

### 7.5 The season record — a reset stops being an erasure

*(stage25, closing what was §12.1.)*

A reset dropped every level to 1 and **deleted the fact that the season happened**.
Nineteen thousand XP and an OPERATOR rank, gone, with no record anywhere. That, more than
the missing reward, was why season 2 felt empty for a veteran.

When a season closes, `hab_close_season()` archives every athlete who scored anything into
`public.hab_season_results` — final level and final XP — and the Locker grows a **Seasons
shelf** showing where they finished. Append-only, free to mint, never revoked.
Once Career Mode's XP switch is on the row holds the season's **points** (training included) as `xp` and the **career level** at the
season's last day as `level`, for everyone with a fact and points above 0.

Everyone who reached **level 5** in that season also gets a title naming it. It can never
be earned again, because the season is over — the one thing the level track cannot offer,
and the reason to finish a season rather than coast the last fortnight.
Once the XP switch is on the title goes to everyone with **2,000 season points** or more (`rulebook.toml` → `[season]
title_points`), in place of level 5 inside the season (1,930 XP on Proof's curve).

**Run the dry run before you ever start a season.** It is at the bottom of
`supabase/stage25_season_record.sql` and prints the exact numbers that are about to be
frozen, using the same expression the archive uses.

The file was rewritten before it shipped, after an adversarial review of its first draft
found 20 defects, 2 of them critical; its header documents all five traps. Three are worth
knowing here:

- ⚠️ **The archived `level` is derived from the archived `xp`**, not from
  `hab_season_level()`. That function is hard-wired to `current_season()` and
  `current_date`, so using it made the level count a day the XP did not — the two columns
  described different windows and the boundary day was counted in *both* seasons.
  Once the XP switch is on that is by design no longer so: the level is the career level at the season's last day and `xp` is the
  season's points, two columns that describe different things.
- ⚠️ **Season titles are NOT registered in `passTrack`.** An entry there with `lv: 0` is
  self-awardable — stage23 made `set_title()` record those directly on trust, which is
  right for event titles and catastrophic here, since it would make the level-5 threshold
  decorative and the result unrevokable. `set_title()` instead grew a third branch: a
  title it does not recognise is allowed **only if the server already minted it**. Owning
  it is the permission.
- ⚠️ **`public.seasons` now has a unique index on `starts_on`.** Without it two rows could
  share a start date, collapsing two archives onto one primary key and colliding their
  title ids.

Two RPCs feed the client: `season_record(athlete, key)` for the athlete's own shelf, and
`season_list()` — every season's name — so that **any** `t_sn_…` title resolves on the
leaderboard and the roll-call wall. Without the second one a season title renders blank
for everybody except the person wearing it.

### What resets and what doesn't

| | Resets on a new season (until the XP switch) | Career Mode (once the XP switch is on) |
|---|---|---|
| Overall XP and level | **Yes** — back to zero / ROOKIE 1 | **No** — the career level never resets |
| Each habit's XP and level | **Yes** | **No** — each ladder counts the whole career |
| Both leaderboards | **Yes** | **Yes** — the board's points start from zero |
| Tier and milestone XP | Paid again each season (runs are measured from its start) | Paid to the career once, ever. Each season's board points count them again |
| Logged history (the grid, the log) | No — nothing is deleted | No — nothing is deleted |
| Streaks and consistency badges | No — those measure behaviour, not score | No |
| Rewards (titles, card looks) | No — kept for good | No — kept for good |

That split is deliberate and matches how games work: ranked resets each season,
account-level unlocks persist. It also means a season change never punishes someone for
a 30-day streak they legitimately built.
Once the XP switch is on, the level itself joins the account-level side of that split.

**No celebrations fire on a season change**, but one. Levels drop, which would otherwise be
noise; `rulesSignature()` includes the season start, so the app re-baselines silently. (Once the XP switch is on no level drops and
`rulesSignature()` leaves the season out. A toast says it instead: *SEASON 2 has begun. The board starts from zero. Your level
stays.*) The
exception is the season that just closed (2026-10-17): its title, for anyone who reached level 5 (2,000 season points once the XP
switch is on),
takes the whole screen (*Season over*), and a finish without one lands on the wins card
(`checkSeasonMoments()`, §5). It is a reward, not a point, so nothing is rescored for it.

### It also gates the workout backfill

The WORKOUT habit is ticked from finished sessions on the server. Without a season it
would import *every* past session — one athlete had 41 days of history that would have
landed as an instant head start. The app only ever asks for dates from the season start.

### Two places again

Like the XP rules, the season lives server-side (`public.seasons`, the authority) with a
fallback baked into `XP_RULES.seasonStart` / `seasonName` in `habits.html` for offline and
first load. The app fetches the real one on every open and caches it. **You only need to
run the SQL command** — the fallback matters only if someone opens the app offline having
never synced.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
