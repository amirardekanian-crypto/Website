### 03 · CREW — everyone else

> **Since 2026-10-19 a board row and a wall line carry no rank name, no title and no gold, silver or bronze emoji. Points and order stay.** See *Career screens off*.

> **Since 2026-10-12 (the UX audit):** the header says **Crew** once (eyebrow *Season 1 · day 31*;
> "Leaderboard" was written three times), one switch **Board | Roll call**, and *This season / Past
> week* sits in the list's heading (*Top 10*). The board is **one grouped list** with hairlines, your
> row in the accent, scores in ink (teal went), the rule as a footnote, and no "Server-scored". Your
> name is one row, **You appear as … · Edit ›**, which opens a sheet (`renderBoardSheet()`, in
> `topLayer()`) with the name, *Rename* and *Leave the leaderboard* on two taps; Settings' *Board name*
> opens the same sheet. Join and *Keep me off* (not on the board yet) are unchanged. The roll call
> composer is one line, its prompt as the placeholder, and grows its counter and *Post it* once you
> type. Settings and the manual hide the tab bar (`hidden`): ‹ and ✕ are their ways out.
It holds the **whole** social layer. Two views, switched at the top: **Leaderboard** (the
default since PRF-02, Amir's 6A, 2026-09-27) and **Roll call**. Who is on the board, and how
they got there, is under *The leaderboard* below.

**Roll call** is the composer *and* the wall, in that order — you write at the top of the
feed you are posting to. Behind it: the last seven days of one-sentence entries grouped
by day, newest first, each line carrying the writer's display name, season rank and that
day's completion. **Amir's own line leads its day** (the dark card, `YOUR COACH`).

The board is the default: where you stand first, Roll call one tap away. (Roll call led
until 2026-09-27, on the argument that conversation rewards coming back; the wall held 2
lines in 9 days across 19 athletes.) Today carries a **one-line pointer** that opens
Roll call itself (`LB.view = 'roll'`) and disappears once the athlete has written — a
doorway, not a second composer.

**Leaderboard** has two scopes: **this season** (the default) and **past week** (a rolling
seven days, not a calendar week). Joining by hand, renaming and leaving live at its foot
(`renderBoardJoin()` — the same box for coached and free athletes).

**The board is a PANEL** (Amir, 2026-08-01: *"i like this design of the leaderboard
better"*). One tinted frame — `.lbwrap` — carrying its own heading (*Leaderboard* ·
*resets with the season*), its own scope switch and its own rows, so the standings read
as a thing you have opened rather than as the rest of the screen continuing. Each row is
a card: **🥇🥈🥉 for the top three** and a plain number below, the name, a sub-line, and
the score hard right in teal. Your own row is filled in accent and carries
**`N behind <name>`** — the gap to the person directly
above, which is the only distance you can close. It closes with the rule it runs on:
*XP only counts when the day is logged — nobody climbs this board from the sofa.*

⚠️ **The per-row bar is gone.** With ten rows it drew ten different lengths of the fact
the number beside it already stated, and the number is what people read.

**Every row reads the same, including your own: rank, then title plate.** `boardRow()` has
no `is_me` branch — do not add one back.

⚠️ It had one until 2026-08-02. Yours read `🔥 3 · 5/7 days on target`, computed live from
the log on this device, because `leaderboard_top()` returns `pos · display_name · title ·
xp · level · rank_label` and no streak — so rather than invent a number it could not know
for everyone else, the app showed you a different one. Defensible, and still wrong: it made
the athlete's own row **the only one on the board with no rank and no title**, and the
title plate was suppressed twice over (`t && !r.is_me`).

That produced a bug report that did not look like this one at all — *"i cant change my
title"*. Equipping worked, `saveCfg()` stored it, `set_title()` published it, `hab_titles`
had it, and every other athlete could see **THE TWENTY-THREE** on his row. The owner could
not, on the one screen a title exists to be seen on, so the button read as dead. Amir,
2026-08-02: *"why the fuck do i still see non sence below my name just let me see my level
like every one else."*

The streak and the seven-day count were never lost — both are on Today and Progress, where
they are the point. The rank was nowhere on Crew at all.

**Where a device-computed number can appear on Crew — exactly one place.** Neither
`leaderboard_top()` (`pos · display_name · title · xp · level · rank_label · is_me ·
joined`) nor `roll_call()` (`day · display_name · title · body · pct · rank_label · is_me ·
is_coach`) returns a streak or a days-on-target count, and this device holds one log: the
athlete's own. So:

- **The board rows** show only what the server returned, the same way for everyone. Your
  row adds `N behind <name>` (arithmetic on two returned scores), and the ▲/▼ chips on any
  row are diffs against `CFG.lbSeen`, this device's memory of the standings it last saw.
- **The wall** is the one place a local number appears: the 🔥 streak chip, on **your own
  lines only** (`dayStreakAt(day)`). Every other card takes `r.streak` if the server ever
  sends one, and otherwise shows no chip at all — `rcChips()` falls back to nothing, never
  to a guess.
- **Days on target** is not on Crew at all: it lives in Today's recap and the month share
  card.

Nobody else's streak or days-on-target is ever invented. Teaching either RPC to return a
per-athlete streak is the whole change needed for everyone's cards to carry one.

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
