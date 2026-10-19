### The WORKOUT habit is LOCKED and fed by the training programme — through the server

**Athletes cannot tick it by hand.** The row shows a padlock and the line *"Complete any
day of your Workout in your Program to gain XP for this."* (since 2026-09-27 the row itself says
*From your programme* and sits last on Today; the full line is the toast), with an arrow across to the
programme; tapping the circle explains rather than doing nothing. The habit-detail screen
replaces its log button with *Open your programme*. Once earned, the padlock becomes a
normal tick.

**These are two separate apps.** Neither reaches into the other's storage, and
neither carries the other's logic. The only thing they share is a fact that lives
on the server.

When an athlete hits **Finish Session** in `program.html` — full session or partial,
because they showed up either way — that app records the session to `session_history`
exactly as it always has. Proof then reads the *dates* back through a small read-only
RPC, `get_workout_days`, and ticks its WORKOUT habit for those days. The completion
card in the programme app says *"Counts as your Session habit"* under an *OPEN AA PROOF* label (Proof's own name for it
since the labels went; it said *Workout* until 2026-09-27; one line, *"… · open AA Proof"*, until Centre Court, 2026-10-12).

Why it's built this way:

- **`program.html` writes nothing into Proof.** It has no habit log, no XP maths, no
  level formula. Its entire habit footprint is two shortcut cards, a link, and the strip on
  its Home, which is Proof itself in a frame (see *Embedded on the training app's Home*).
  **Career Mode adds one row and one preview, and says so.** Once the XP switch is on, Home has a Career row and the finish card
  previews what a session earns. Both use copies of the server's rules (`careerLevelOf()`, `careerEarn()`) that
  `scripts/check_twins.js` §9 holds equal. It still writes no `<id>_hab_*` key: its two keys are `<id>_careercache` and
  `<id>_earn_d<N>` (`PROGRAM-APP.md` → *Career on Home, and what a session earns*).
- **Proof reads nothing from `program.html`'s storage.** It asks the server.
- **`program.html` never syncs `<id>_hab_*`.** Those keys share an origin but belong to
  Proof, which merges them conflict-safely; a stale programme app would otherwise
  overwrite habit progress logged on another device.
- **The server is simply the truth.** Because the habit is locked, the import is
  idempotent — no once-only bookkeeping is needed, since the athlete cannot untick it
  and disagree.

**For a free user there is no programme to open**, so the row's line changes to
*"Coached athletes earn this from their programme. It is the biggest habit on the list."*
and the arrow points at `/form.html`. The habit stays visible rather than being hidden —
it is the one thing on the list they can see and cannot have, and that is a fairer pitch
than a paywall banner.

The habit's id is still `strength` internally so that renaming it to WORKOUT didn't
orphan anyone's history or XP.

Only sessions from the current season's start are ever imported — see Seasons below.
Once Career Mode's XP switch is on the tick itself pays 0 a day (it keeps the day streak whole, and its weight still feeds its
tiers). The session's XP is the session's, paid by the server.

SQL: `supabase/stage10_workout_days.sql` — **applied and live**.

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
