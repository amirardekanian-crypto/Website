## ↩️ Back closes the top layer (NAV-01, 2026-09-26)

Screens, sheets and overlays are shown and hidden in place, so until now the phone's Back button (or an Android
swipe) **left the app** from any of them. Now, while anything is open over Home's overview, there is exactly
**one guard entry** in history (`history.pushState`, same URL, so `?workout=` and other deep links are
untouched). Back pops it; `topLayer()` names what is visibly on top and it is closed; if something is still
open the guard is re-armed. Top first: the unit menu (a Back puts it away and changes nothing: `openUnitMenu()`, 2026-10-19), the video pop-up, the rest timer (in Guided this ends the rest, as Skip
does), the readiness check (cancelled, nothing starts), the sheet (History, About, Why, Quality), Guided (the
clock keeps running), then a non-Home screen, which presses **its own ←** (Records → the exercise it was opened
from, a session → its Library pane at the same scroll, the archive → Progress; a Library pane is a tab root since 2026-10-13) or goes Home for a tab, then the day
view. When the last layer closes through its own button, `navSync()` takes the guard back off quietly, so Back
on Home still leaves the app, with no dead press. Nothing is tracked in a parallel stack: the page is the state,
so it cannot drift. `initBackNav()` watches the overlays' `visible` class, the day view's `hidden` and each
`.screen`'s class; `shared.js`'s video pop-up calls `navSync()` itself. Not in the coach preview.
**One sheet, several pages (SHEET-01):** History, About, Why and Quality share `#hist-overlay`. Opening a page
while the sheet is up remembers the page before it (`sheetWrap()` around each opener; an opener that draws
nothing adds no step), a **‹ Back** sits at the top, and the phone's Back steps back a page before it closes
the sheet. Closing forgets the trail. A new sheet opener gets wrapped in `wrapSheetOpeners()`.
**AA Proof does the same** (HABITS.md → *The phone's Back button*), and never from the embedded strip on Home.
**One close grammar (2026-09-27).** A **screen** goes back with **←** at the top left (the day view, Records,
body weight, the Library's panes and sessions, an article, the archive). An **overlay** that fills the screen
closes with **✕** at the top right: the video pop-up, and Guided, whose ✕ moved there from the top left (its ?
sits beside it). A **sheet** (`.readiness-modal`: History, About, Why, Quality, the guide, your account, the
readiness check) has a **handle** and slides down: `initSheetSwipe()` closes it on a swipe down from the handle,
or from anywhere while it is scrolled to its top (past 90 px, or a flick; a short drag springs back; a move up
or one that starts mid-scroll is a scroll). A tap above it still closes it, and its **Close** (and the check-in's
*Skip for today*) is a 44 px target now (it was 15 px); since 2026-10-13 Close sits top right in the sheet's one sticky
row, beside ‹ Back (*The sheets and the notices*, above). From 560 px wide the sheet is a centred dialog with no
handle and no drag. The rest timer keeps the button in its row: it is **Close** on its own and **Skip →** in
Guided, where it ends the rest. The guide's first card says all this in one paragraph.
**Back keeps your place (POL-01, 2026-09-27).** `history.scrollRestoration` is `manual`: the browser used to
put back the scroll it remembered for the guard entry *after* our handler, so the phone's Back from a sheet,
the rest timer or Guided threw a day scrolled to its fifth exercise back to the top, and a session opened from
the Library came back to the top of the shelves. Now the layer's own button places the page, as its ← does:
the day stays where it was, and **the Library returns to where it was scrolled** when a session or an article
opened from it (`_libScrollY` in `goTo()`; the Library tab, or any other way in, starts at the top).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
