## The tour — the game-style first run

> **Once the catalogue switch is on (Career Mode phase 3):** a sixth step, after *Your level, and the Locker*, rings the four
> numbers under the level bar (`.hero4`): *Your record. Four numbers that only go up. Tap one to see what's next.* The prompt on
> Today and the manual's *Start here* say six steps then.

> **2026-10-12 (the UX audit's batch E):** each step is under 40 words (the row step says the circle opens the number on a counted habit; the board step rings the *You appear as* row), and the tour's buttons are the app's pill buttons (the tour lives outside `#app`, so it had square, uppercase ones). The same pass made **the manual fold**: every section is a heading you tap (`UI.manOpen`, *Start here* open on arrival), the contents list opens and goes to a section, and `openManual(section, from)` opens the right one from Progress (*Consistency*), the Locker (*The Locker*) and Crew (*The leaderboard*). **The wins card shows two lines at most**, then *and N more*. **No em-dash in anything an athlete reads** (COM-3): 95 lines of toasts, notes, onboarding, Settings and the manual were rewritten; the session's locked hint says *Finish any session in your programme and this ticks itself.*, and onboarding's ALWAYS ON is Settings' pill.


**One screen of onboarding said what to track and not one word about how any of it
works.** The athlete was then handed a scoring system, three tabs, a header button
labelled with their own initials, and a habit row with **three different tap targets and
no signal that there was more than one** — and left to guess. The only real explanation,
`renderManual()`, is excellent and sat three taps deep behind an unlabelled monogram with
nothing anywhere pointing at it.

The tour is a box in the accent drawn around the thing being named, a card beside it saying what
that thing does, and everything else dimmed. **Five steps** (PRF-02, Amir's 2A, 2026-09-27; it
was fifteen, straight after onboarding): **the row** (the circle, `+` and the name, in one sealed
step), **the week** (fill in a day you missed), **your level and the Locker**, **the board** (the
PRIV-01 step, unchanged: when you appear on it, under which name, and how to keep off), and **your
initials** (Settings, the manual, this tour again), which ends it with *Start logging*. The other ten
(the nudge, the four tabs, Progress, the habit list, the manual) live in the manual, which the last
step names. It runs straight off *Start tracking*, and it is replayable for ever from
**Settings → The tour** and from the manual's **Start here** section.

`TOUR`, `tourSteps()`, `startTour()`, `tourShow()`, `tourTap()` and `paintTour()` in
`habits.html`. Three things about it are load-bearing:

- **It lives OUTSIDE `#app`,** in its own `<div id="tour">`. `render()` morphs `#app`
  against the template and deletes anything the template does not know about, so a layer
  inside it would be destroyed on the next tick. `paintTour()` owns that node
  imperatively; `render()` calls it when `TOUR.on` so the ring re-measures after a tick,
  a screen change or a celebration.
- **The dimmer is four mask panes with a real hole, not one lid with a transparent
  window.** A lid still swallows the tap. The hole is what lets a step marked `act` be
  finished by *actually doing the thing* — tapping the real checkbox, opening real
  Settings. A step you only read gets `.tourblock` dropped into the hole to seal it. Since
  PRF-02 all five steps are read and sealed; no step is marked `act`.
- **Targets are resolved live and measured with `getBoundingClientRect()`,** never
  hard-coded, so the ring cannot drift out of step with a retuned screen. What cannot
  apply (the row step's `+` sentence when nothing counter-ish is tracked) is left out when the
  list is built rather than discovered missing halfway through.

**Placement is solved for the ring and the card together**, because the card is up to
56vh and a 320×568 phone has no arrangement where a naive "draw ring, then fit card"
does not cover the thing being pointed at. `placeTour()` (which `paintTour()` calls) measures the card first, then
either trims the ring's height to leave room below it, or puts the card above, or — for a
tall block low on a short screen, like the join box at the foot of Crew — pins the card
to an edge and trims the ring from the far side. Verified with no overlap and no
off-viewport card across coached / free / dark / reduced-motion / 320px.

⚠️ **The tour names controls, so it is the sixth thing that goes out of date.** If you
move a control, rename a tab, or change what a tap does, fix `tourSteps()` in the same
pass — see the sync list at the top of this file.

`CFG.toured` records that it has been offered. It defaults to **false for existing
athletes too**, so everyone who has been using Proof since before this shipped gets the
offer once — a one-line pointer below the habit list on Today, which deletes itself the
moment the tour has run.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
