### 02 · PROGRESS — where do I stand

> **Since 2026-10-19 Progress has three season facts and no Milestones tile, the week table, and for a coached athlete ONE door card to AA Performance where the milestone shelf was.** See *Career screens off*.
Habits and achievements merged, because they were two views of one question.

> **Since 2026-10-12 (the UX audit):** quests come **first** while a run is on (the one thing here that
> expires), the four stats sit in **one row**, and one **week table** (`weekTable()`) replaces both the
> habit list that sat here (rings, five pips, a lavender tint on rows done today that had no key) and
> the heat map at the foot of Today: a row per habit in Today's order, seven day cells (hit, part,
> none, before you started; `rosterOn(k)` per day, compared by id), the habit's level ring at the end,
> the row opening the habit's page, and paused add-ons as dim rows. Its heading carries *N of 7 on
> target · +XP*. The five consistency pips are on the habit's page. Milestones below are unchanged.

> **Once the catalogue switch is on (Career Mode phase 3, D15):** the four stats stay exactly as they are (*Milestones* counts the
> awards the server holds over every live tier and milestone), and the milestone block is the catalogue's, grouped by the four kinds
> of win with the same folds, next three and Earned strip; a retired badge is a line, *Earned before: …*, under the badge that
> replaced it. See *Career Mode, phase 3* below.

Opens straight on **four season stats**: days logged, **milestones** (the same count as the
section at the foot, since POL-02; the tile said *Badges 8/72*, tiers included), **day streak** (as the
flame) and perfect days → a one-line **key explaining the consistency pips**, which had
no legend anywhere in the app and are empty for the first five days → **one row per
habit** (its level in a ring, its streak and five pips, tapping through to full
history) → paused habits with their banked XP → **quests**, only while a run is on → the
**milestones**: the next three, the earned ones on one row of medals, and **All 37
milestones**, which opens the 32 one-off milestones and the five "A few weeks" events in
four groups — *A good week*, *A few weeks*, *The long haul*, *Rare* — each collapsible from
its own header (see *Milestones come in three tiers*, above), with one line above them
explaining what completing one is worth.

There used to be a level/rank strip up top too — the same information as Today's hero,
squeezed to a fifth of the height. Amir, 2026-07-30: this tab is about progress, not
rank, and the level is one tap away on Today's hero (now the ring itself is tappable,
not just the rank name beside it) and lives properly in the Locker — a third
appearance here was the duplication the strip was invented to avoid in the first place.

Days-logged leads the stat grid deliberately. Perfect days and runs are both zero for
anyone rebuilding after a bad week, and opening your own progress on a pair of zeros
punishes exactly the athlete who most needs to keep going. Showing up is the stat that is
almost always positive, and it is the one that earns the others.

**The day streak is the third tile**, drawn as the lit flame rather than a bare figure, so
a streak climbing reads differently from one that has just broken. Its caption carries
`· best N` — and that N is **`bestDayStreak()`**, never `bestHabitRun()`.

⚠️ It was `bestHabitRun()` until 2026-08-02, and this is the trap to know about. The slot
used to be a tile of its own called **LONGEST RUN** (the best single-habit run ever) while
the day streak lived in a band above the grid; when the day streak moved down into the
grid, the old `bestRun` variable came with it and ended up glued to the new caption. The
number was never wrong — it was answering a different question from the one its label
asked. Amir's own Progress screen read **`5 · BEST 8` on 8 logged days with a missed day
in them**, because 8 was his *water* streak. It is the exact collision the one-word/two-scopes
rule exists to prevent (see *One word — `streak` — and two scopes*, above): the app has one
noun, `streak`, so **the label is the only thing keeping the scopes apart** — a habit's
streak always sits *on that habit*,
and anything captioned DAY STREAK must be computed by a `*DayStreak()` function. The same
bug sat in the shareable **streak card** (`SHARE_CARDS.streak`), where it decided
PERSONAL BEST vs ON A RUN and printed a `Best: N.` footer; both were fixed together. (The eyebrow
reads ON A STREAK since 2026-09-27, as does the milestone card's fallback name: "run" does not come back.)

**A habit's level is the hero's ring, at row size** (Amir, 2026-07-30). It was a filled
square, with the rank name in the meta line and the level's progress as a bar under the
row — three elements for the one fact Today draws as a single object, and none of them
that object. `habitRing()` renders `.hring`: the same geometry as `.lvring` (r=15.5 in a
36 viewBox → C≈97.4, so the arc arithmetic is written once), 46px instead of the hero's 62, and the
**number only** — no LEVEL caption, no rank name. The bar is not lost information, it is
the ring: bent around the number it describes.

The rank name went with it because the level *number* is what an athlete reads off this
row, the ladder of rank names lives properly in the Locker, and a fourth place to state a
rank is the duplication this tab keeps being reorganised to remove.

A habit row's **name has the whole line to itself**, and the meta line beneath it holds
**only the streak — and only when there is one** (Amir, 2026-07-30: the raw XP figure was
"useless there" and came off the same day). It used to append today's status (which
wrapped every row and restated what Today already says), then rank · XP, then XP · streak
with the streak chip sharing the name's line — which left **99px for a name**, so every
habit on this tab wrapped to two lines and "Finish your session" took three. XP is not
missing information: the ring and the level number already say it, just converted into
the currency that actually means something to look at. A row with no streak now shows
just the name, the ring and the pips — nothing invented to fill the second line. Moving
the streak off the name's line is the split Today already uses: the level anchors the row
(there on the right, here as the ring on the left) and the streak rides the line under the
name, next to nothing that duplicates it. Names fit on one line at 375px.

**Nothing-logged-yet is taught, not reported.** On a log with no days in it the stat grid
carries one line (`statnote`) defining *milestone* (and a habit's five squares, its
*consistency tiers*; it said *badge* until POL-02), a habit's *own streak*, the *day streak*
and *perfect day* — words that were used nowhere else an athlete had been — and it
disappears at the first logged day. It separates the two streaks by **scope**, not by
noun: *its own streak* (consecutive days of that one thing) against the *day streak*
(consecutive days that cleared the gate). It used to teach *run* and *streak* side by side,
back when a band held the day streak and the grid held the run; since `streak` became the
one word for both, the scope is all that keeps them apart. Today's seven-day recap no
longer names a "strongest" and "weakest" habit out of an eight-way tie at 0/7. The foot of
Progress carries a second door to the manual.

**Habit detail** (since 2026-10-12, the UX audit: ‹ in the header, back to where it was opened, and no *Back to today* button at the foot; today's control first, *– · Log a number · +* on a counted habit; the 35-day grid with weekday letters; the stats; the ladder; the level as one line with its quip; the last five days; the header's streak from 3 days. The older order follows.) Reached from here or from Today, it shows that habit's rank and level
progress, a log button, its consistency ladder, this-week / best-streak / 35-day-rate
stats, a 35-day grid, and the last five days with the XP each earned. A day before the
season earned nothing and says **BEFORE THE SEASON** instead of an XP figure (2026-09-26;
the row printed raw `xpFor()` and disagreed with `dayXp()`).

**Missed and not-yet-started are different, everywhere a day is drawn.** Days before
`firstLoggedDay()` render as `.c.pre` in the 35-day grid (dotted, with its own key entry),
are dropped from the last-five list, and are outlined and empty on Today's week (they read
`—` on the old day strip). A day-one athlete was being shown three failed days on the day strip and five weeks of
MISS on every habit, for a period during which they did not have the app. Note
`firstLoggedDay() || TKEY()` at both call sites — it returns `null` until something is
logged, which is precisely the case this exists for.

Its header eyebrow is the habit's **goal**, not `h.source` — most habits are sourced
`Manual`, so the screen used to announce itself as "MANUAL", which reads as *the manual*
in Settings. The header's right slot carries the habit's **current streak** (*N-DAY STREAK*), not the level, because
the hero directly beneath it is a 76px level. The **35-day grid marks today** and carries
a key; without either it was 35 identical squares with no anchor, and the empty leading
row read as broken rather than as "before you started".

**A note on the habit-row badge.** Since 2026-10-12 a row on Today has **one badge slot**, right of the
name: the habit's streak from 3 days (a flame and the number), or, for a moment, a new level (`LV 9 ↑`,
`UI.flash`). The level at rest is on Progress and the habit's page. (Until then the row showed the level
always on the right and the streak on the status line, from 1 day.)

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
