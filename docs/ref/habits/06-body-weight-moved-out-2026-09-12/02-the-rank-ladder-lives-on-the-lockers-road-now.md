### The rank ladder lives on the Locker's road now

> **Not drawn since 2026-10-19.** See *Career screens off*.
It used to be its own screen, reached by tapping your rank; that screen is **gone**
(Amir's redesign, 2026-07-30: *"two screens were describing the same climb"*). Tapping
your rank — or the level ring beside it — on **Today's hero**, the only place either
lives now, opens the **Locker** tab directly, and `renderPass()`'s road interleaves the
two: each of the 10 ranks is a header (crest, tier
label, level range, XP cost or "CLEARED", and — for the rank you're standing in — a pip
row showing which of its sub-levels you've cleared), and the reward rows for that level
range sit right under it. One scroll now shows the ranks ahead, their crests, and every
title or skin each one hands you (folded to the next three rewards since PRF-02; *The whole
road to level 50* opens the rest), instead of two screens telling the same story twice.
`TAB_ORDER` (the array that decides which way a tab transition slides) gained `'pass'`
in the same pass — it had been missing since Locker became a tab, which meant the app
picked the wrong slide direction into and out of it.

Insignia are **drawn, not imported** — straight lines, hard corners, square caps, one
inherited colour, in `RANK_ART` — and rendered through the shared `rankCrest()`/metal
system described above, so a rank never looks different in the road, the Today hero, or
the share card. They escalate on purpose so the road reads at a glance: blocks being
laid, then force, then machinery, then a burst. Anything with a curve or a rounded cap
belongs to a different app. What the star means past level 50 (prestige with no
ceiling) is unchanged — see *The long game* below.

**Today's level hero also changed shape**: the XP bar is a ring around the level number
now (`.lvring`, an SVG circle with a `stroke-dashoffset` set from `LI.pct`), not a bar
underneath it — the number and how far through it you are read as one object instead of
two. The ring is a real button now too, same destination as the rank name beside it
(Amir, 2026-07-30: it read as decoration when only half the block responded to a tap).
Later the same day it stopped being the hero's alone: **every habit row on Progress wears
the same ring at 46px** (`.hring` / `habitRing()`), so a level is one shape everywhere in
the app rather than a ring here and a filled square with a bar there — see *02 · PROGRESS*.

**Progress lost its own level/rank strip entirely** (see *02 · PROGRESS*, below) — with
Today's whole hero tappable and the Locker owning the rank properly, a third copy of
the same rank was the duplication this app keeps finding and removing.

#### Inside the Crew tab

Rows show **movement, not just standing**: a ▲/▼ chip against each name, and a banner in
the accent when the athlete has overtaken someone — *"You passed Bo and Cy since you last
looked."* The server returns no history, so the last standing is remembered per scope
on the device (`CFG.lbSeen`) and the next fetch is diffed against it.

Set the coach line from **`coach.html` → Today → The wall** — the composer at the top
writes today's line, and posting again updates it. A day reads top-down as *here is the
brief, here is who answered*.

**Moderation** is coach-only. The dashboard puts a **Hide / Show** button on every line
(hidden lines stay visible *to Amir*, greyed and tagged, so it is reversible and he can
still read what he hid). The SQL editor does the same job, plus back-dating:

```sql
select public.set_coach_note('Everyone in. No excuses today.');  -- your line for today
select public.hide_note('<athlete_id>', '2026-07-27');           -- take a line down
select public.hide_note('<athlete_id>', '2026-07-27', false);    -- put it back
select day, athlete_id, hidden, pct, body from public.hab_notes
  order by day desc, updated_at desc limit 50;                   -- read everything
```

Hiding rather than deleting keeps the evidence, which is what you want if you ever have
to explain the decision to the athlete.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
