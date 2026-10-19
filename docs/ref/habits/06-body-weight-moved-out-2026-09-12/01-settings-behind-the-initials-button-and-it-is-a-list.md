### Settings — behind the initials button, and it is a LIST OF DOORS
Redesigned 2026-08-01 (Amir, with a reference screen: *"i want the habits to be modified
in its own tab like this … plus a back button needs to be added everywhere that you go
inside the setting"*). It used to be every control in the app stacked end to end — eight
sections, the whole habit roster inline, the reset button at the bottom of a very long
scroll. It is now titled **You**, and it is a profile card plus **three grouped cards**,
each row a door with an icon tile, a name, a line of explanation and its current value:

| Card | Rows |
|---|---|
| — | **Profile** — name, `Day N · rank · coached/free`. Tapping it opens the **Locker**, because that is where the rank lives. |
| *Since 2026-10-12 (the UX audit) the groups have visible headings and are:* | |
| Your habits | **Your habits** (`N of M add-ons on`; it was *Habits & targets*, but targets cannot be changed) |
| App | **Dark mode** and **Tick sound** as switches in the list (the Appearance screen went) · **Install on your phone** (only while `installable()`) · **Open your programme** / **See about coaching** |
| Help | **The tour** · **The manual** (the Locker row went: the tab and the profile card both open it) |
| Account | **Board name** (opens the same sheet as Crew's *You appear as*, `renderBoardSheet()`) · **Sync** · **Reset today's log** · **Sign out** |
| *Until then:* Tracking | **Habits & targets** (`N of M add-ons on`) · **Appearance** (`Dark`/`Light`) · **Install on your phone** (only while `installable()`) |
| How this works | **The tour** · **The manual — how XP works** · **Locker** · **Open your programme** / **See about coaching** |
| Crew & data | **Crew board** (your board name; `Not yet` for a coached athlete the sweep will list after their first session; `Not joined` otherwise) · **Sync** (live `syncLabel()`, tap to sync now) · **Reset today's log** (destructive, still two-tap armed; it wipes the day picked on Today's week, `AKEY()`, and names it: *Reset yesterday's log* when yesterday is picked. It used to wipe today whatever the strip showed.) · **Sign out** (two-tap, never in the demo or a coach preview; see *The four tabs*) |

Two rows open **sub-screens** rather than navigating: `UI.sub` is `'habits'` or
`'appearance'`, nothing else reads it, and `go()` clears it on the way out so leaving
Settings and coming back always lands on the list.

**Every screen inside the overlay now has a back button** — `‹` on the *left* of the
header, beside the title, next to the existing `✕` on the right. They are not the same
control and that is the point: `overlayBack()` goes exactly **one** step (sub-screen →
the list → wherever you came from) while `✕` still leaves the whole overlay in one tap.
Before this, from behind a door the only way out was all the way out.

The fifteen-step tour walked through here (it rang `[data-tour="tracked"]` inside *Habits &
targets*, with `before: () => { UI.sub = 'habits' }`, then `[data-tour="manual"]`). The five-step
tour (PRF-02) stays on Today and Crew and names Settings and the manual from the initials, so both
attributes are unused anchors now; `before` still runs ahead of the repaint in `tourShow()` for a
step that needs a door opened. Proven: walked end to end, all five steps find their target, for a
coached athlete before and after the board, and a free one, at 390 and 320 px.

Deliberately *not* here: coach volume, motivation display, and — since the 2026-07-30
redesign — **the ladder**, which used to be its own row. Tapping your rank goes straight
to the Locker (see below), so a Settings row pointing at the same place was a second door
to something one tap already reaches. The app has one mode — XP and levels, nudge and
recap — and doesn't ask athletes to configure it.

> **This used to say "replay onboarding" was deliberately absent too.** That ruling was
> about the habit *picker*, which decides nothing and is fully editable behind *Habits &
> targets*. It is not about **the tour**, which is the only explanation of what the app's
> controls do — and an explanation you can see exactly once is worth very little.
> *The tour* is the first row in the second card.

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
