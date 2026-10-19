#### "A few weeks" — multi-goal milestones, no dates
`EVENTS` in `habits.html`, rendered as the middle group **inside** the Milestones section.
Amir, 2026-07-30: *"the seasons should be other kinds of milestones, they just take few
weeks to complete but are not long term."*

They went through two wrong shapes first, and the reasons are worth keeping:
1. **Calendar seasons** (Jul–Aug, Nov–Dec) — wrong, he never meant real seasons.
2. **28-day rotating windows, one live at a time** — still wrong, because a *window* is a
   slot you can miss. The "few weeks" is **how long the work takes**, not when it runs.

So there are **no dates anywhere**. Nothing expires, everything is workable from any day,
and each is measured over the athlete's whole history — an athlete who arrives with
history behind them simply has some of it done, exactly like every other badge here.

**They are a different KIND of milestone, not a different section.** A badge is one
measure; these are three — but they wear the **same row** as every other milestone
(Amir, 2026-07-29: the card form read as a quest; the `evcard` is quests-only now).
The three goals share the row's note line, ticking off as they fall, the bar is the
average of the three, and the right column carries the title the event pays where the
other rows carry XP. The tier order is by how long the work takes:

`A good week` → **`A few weeks`** → `The long haul` → `Rare`

**They pay a TITLE, never XP.** XP is scored twice, so a new paying rail means new plpgsql
that has to agree with the app for ever. A title is stored, append-only and free to mint —
the same rule the reward track runs on — and it is worth more here anyway, because titles
show on the leaderboard and the wall.

⚠️ There are **five** events now — the four four-week ones plus BACKBONE (*However long it
takes*, the comeback event, paying UNBOWED) — and all five `title.id` values are registered
in `passTrack` on the `xp_rules` row at `lv: 0`. Names, goals and blurbs are free to
rewrite — the server only validates the **id** — but changing an id needs a SQL round trip.

`eventProgress()` is **cached** (`_evCache`, dropped by `invalidateBonus()`): five events ×
three goals over a long log is thousands of `isDone`/`dayQualifies` calls, and it renders
on every Progress draw.


---
*One section of the reference. The index is [`HABITS.md`](../../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
