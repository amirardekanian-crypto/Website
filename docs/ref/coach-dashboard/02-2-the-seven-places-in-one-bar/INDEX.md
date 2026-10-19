## 2. The seven places, in one bar

<!-- Split by sub-heading: one file each. Open the part you need. -->


**Back keeps your place** (audit BROWSER-4, 2026-10-11). A new screen opens at the top; going Back to a screen you left lands where you were on it,
so the roster no longer jumps to the first athlete after you open someone and come back. A tap on a tab or a link is a new screen and starts at
the top. (The page stamps each screen on its history entry and switches the browser's own scroll restore off: the browser's ran before the page
drew and was then overwritten.) Every label is at least 12 px: `scripts/check_site_style.py` guards `coach.html` too since 2026-10-11, so
text under 12 px cannot come back.

**Seven places, one row** (round 2 of the UX pass, 2026-10-12; Amir: *"D1 yes"*). It was nine tabs in two groups. Intake, Affiliates and the signup
funnel are now **Leads**; the Testing app and the Course are now **Buyers**; ⚙ Tools moved from the roster into the top bar. Today, Athletes and
Exercises are the daily work; Proof, Leads, Library and Buyers are opened now and then, but all seven sit in the same row, in this order, with no
divider and no "more".

**Explain once** (round 3 of the UX pass, 2026-10-12): every panel keeps its long explanation, word for word, in a *How this works* fold at its end (`howFold()`, `<details class="how">`) and shows one short hint line above it; a warning beside a destructive action stays where it is.

**The look** (round 3 of the UX pass, 2026-10-12: the global consistency pass; presentation only, no handler, id or wording moved. The same rules are the comment at the top of the `<style>` block, and the scenario `design-rules` measures them on every demo screen at 1440 and 390 px). *Five sizes*: 12 (meta, labels, hints), 14 (body, controls, table text), 17 (section headings, a day card's title, a name that heads a row: the roster, the board, Personal records), 22 (big numbers, a sub-page heading), 30 (the athlete's name in the file header); a form field is 16 below 900 px on a touch screen. *Typefaces with jobs*: Barlow Condensed in capitals for the brand and the athlete's name and nothing else; Barlow 600 in sentence case for headings, titles, names, tabs and sub-tabs; small letter-spaced capitals only for column heads and group labels (PRESCRIBED / DONE, ALSO WAITING, the roster's heads and groups, the intake's group labels); Space Mono only for numbers that line up or must be exact (the prescribed and done columns, per-set RPEs, XP, referral codes, passwords, the raw log, a count such as 0/200), so dates, facts, placeholders and the strip's counters are Barlow with tabular figures. *Three corners*: 8 (fields, small boxes, code boxes), 12 (panels, cards, day cards, notices, sheets, the Tools panel), 999 (chips, pills, buttons). *One level of container*: a panel has a 1px `--line` border and no shadow; only a layer that floats (the Tools panel, the More sheet, the Undo bar, the failure and notice bar, the toast) keeps the one shadow, `--float`; inside a panel a card is a hairline-divided row. *Colour has one meaning each*: green is the brand, a primary button, on plan and the selected tab; clay is needs you, over target, destructive and a count that asks; steel blue is an RPE under target and nothing else; plum (`--ochre`) is the middle warning only (adherence 60-84%, load climbing, the demo band), so the Free tier is a neutral outline chip and a Needs-you dot that is not a warning is grey. *One look per control*: buttons come in four tiers on `.btn` and its look-alikes (`.abtn`, `.modbtn`, `.tbtn`, `.seg`), primary (green fill, one a section at most), secondary (outline, the default), quiet (`.quiet`, text only) and danger (`.danger`, a clay outline; a clay fill only on the final button of a panel that asks first), all 32 px high (40 on a touch screen); every `<details>` and the credentials fold share one chevron on the left; pick-one is either the segmented switch for a view (`.seg`) or the filter chip for a list (`.rf`, `.sp-filter`, `.sp`, `.pp`), both selected as a green fill with white text; chips are one shape (999, 12, 600: `.chip`, `.ipill`, `.fl`, `.zpill`, `.tag`, `.hidetag`) in neutral, green, clay and plum. *Spacing* is a 4px grid (4, 8, 12, 16, 24, 32), 24 px between sections on a PC and 16 on a phone (`--gap`), panel padding 16-20. A font, colour, radius or shadow is a class next to its component's CSS and never a `style` attribute in a template; a new component follows these rules or `design-rules` fails.

**The bar.** From 900 px up it is **one sticky bar, 56 px** (it was a 58 px top bar over a 61 px tab rail, 119 px in all): the brand, the seven tabs
and, on the right, the signed-in address, **↻ Refresh**, **⚙ Tools** and **Sign out**. The tabs are sentence case, Barlow 600, 14.5 px; the one you are on
is white with an underline, and *Athletes* (notes to read) and *Leads* (new applications) carry a clay count. What gives way as the window narrows,
measured with the real address and the real fonts: the signed-in address below 1340 px, the brand's second half (*· THE BOX*) and the words *Refresh* and
*Tools* below 1180 px, then a little air in the tabs below 1020 px; at 900 px all seven still fit. **Under 900 px** it is the top bar (brand, ↻, ⚙, Sign out;
sticky, 54 px) and **one row of tabs under it that scrolls sideways inside itself** (the one you are on is scrolled into view; the row is not sticky,
so it does not eat a phone's screen). `--stick` is what stays on screen at the top (56 px, or 54 px under 900); the jump links, the comparison header
on The work, the Applications list and the failure bar all offset themselves from it, and the Exercises split measures its own top (`spineFit()`). The
page is `<header class="topbar">` holding `.tb-top` (the brand and the buttons) and `.rail` (the tabs): from 900 px `.tb-top` is `display: contents`
and the header is the flex row; under 900 px the header is `display: contents` and `.tb-top` is the sticky row. `nav-seven` measures all of it.

**A phone's bottom bar** (round 3, 2026-10-12; the dashboard is used mostly on a PC, so nothing from 600 px up changed). **Below 600 px** the tab row is hidden and a bar
fixed to the bottom of the screen takes its place: **Today · Athletes · Exercises · More**, text only, the one you are on marked (green, a clay line above it),
the Athletes count (notes to read) on its item. **More** opens a small sheet above the bar with **Proof, Leads (with its new-applications count), Library and Buyers**;
More is marked while one of those is on show and carries the Leads count. The sheet closes on a pick, on a tap outside (a scrim), on Esc, on a second tap on More
and on **Back**: it is **one history step**, like the athlete app's layers (opening it pushes a guard entry with the address unchanged; Back pops it and nothing else;
any other way out steps back over it first, and a pick goes there after, so no dead step is left; with the sheet closed Back is exactly what it was). It never shows with
⚙ Tools. 600-899 px keeps the one scrolling tab row. `--bb` (56 px plus the safe-area inset) is the bar's height: the page gets it as bottom padding and
`scroll-padding-bottom`, and the toast, the Undo bar, the Exercises editor's Save bar and the Tools panel's height all read it, so nothing hides behind the bar
(those offsets sit with the bar's CSS, under `body` for specificity; the fail bar is sticky at the top and is unchanged). The markup is `#botbar`, `#moreSheet` and
`#moreScrim` in `#app`, painted by `paintBotBar()` from `renderRail()` (same badges, same active rule); the tab row's links stay in the page, hidden. `phone-bottom-bar` measures it at 390 and 320 px and
at 599, 600, 750, 899, 900 and 1440.

| Tab | What it's for |
|---|---|
| **Today** | The day's play: who needs you (and why), what else is waiting, and a short Proof column (your line to the crew, today's wall lines, the quest week and who is drifting) |
| **Athletes** | The whole roster — coached and Proof-only — and each person's file, opening on prescribed-vs-done (a habit-only athlete opens on Proof) |
| **Exercises** | The Spine (2026-09-24): one entry per exercise you programme. Coverage of the names in live programmes, Claude's drafts waiting for you, a search, and an editor (purpose, How to do it, cues, links, body parts and the muscle map, video, and the coach-only SFR rank, flags, counts and cost) showing who is doing each exercise now. Claude's draft steps, cues or purpose for an approved entry wait in the editor's boxes, and your Save approves them. A save sends only what you changed. **Approve** is what puts an entry on athletes' phones |
| **Proof** | The crew's home: the wall and your line, the quest lever, the pulse, the board, the season (titles left with the cut, stage78). (The signup funnel is no longer here: it is Leads → Free signups) |
| **Leads** | Everyone who might become a client, in four sub-tabs: **Applications** (the coaching apply forms, English and Farsi, the whole questionnaire per lead; a clay count of the new ones), **Free signups** (the Proof funnel: everyone who signed up on `proof.html`, days logged, who is ready to upgrade) **Referral codes** (who holds which discount code; the apply forms accept exactly the live codes listed here) and **Chats** (what people asked the website chatbot, kept 90 days) |
| **Library** | Publishes workouts and articles into the app's Library, and copies a link to each (the address is still `#links`; the tab was called Links until 2026-10-10) |
| **Buyers** | Logins for the two apps people pay for, in two sub-tabs: the **Course** (the paid course app, `/tennis/app/`) and the **Testing app** (`/tennis-testing/app/`); each sub-tab shows its count of active logins |

The URL carries the view (`#today`, `#athletes`, `#exercises`, `#exercises/qualities`, `#exercises/coverage`, `#proof`, `#leads`, `#leads/signups`,
`#leads/codes`, `#links`, `#buyers`, `#buyers/testing`, `#a/<athlete_id>`, `#a/<athlete_id>/<sub-tab>`), so any screen can be bookmarked or reloaded in place.
Anything else after the slash of `leads`, `buyers` or `exercises` reads as the first sub-tab. **The nine-tab addresses still work and land in the new
place**, and the address bar is rewritten in place (`history.replaceState`, no extra history entry, so Back goes where it should): `#intake` → `#leads`,
`#affiliates` → `#leads/codes`, `#assess` → `#buyers/testing`, `#course` → `#buyers` (`LEGACY_ADDR`, `fixLegacyHash()`). The browser tab's title names the
screen and, in Leads and Buyers, the sub-tab (*Free signups · Leads · The Coach's Box*). **↻ Refresh** (top bar) re-pulls everything.

**When something does not load or save.** A red line under the tabs names anything that failed
to load (programmes, logins, contacts, intake forms, codes, the library, coaching logs), and the
actions that depend on it are switched off until ↻ Refresh brings it back. Before 2026-10-10 a
failed read looked exactly like an empty table. A save that the server did not apply (a lapsed
sign-in, a record that moved) says so; it used to report success.

**One way to say what happened** (2026-10-11, `fail()` and `toast()` in coach.html; round 3 of the UX pass, 2026-10-12, added `notice()` and
`dangerAsk()` and took the last `alert()` off the page). *It worked*: a short toast at the bottom that goes away by itself. *It did not*: a clay
line in the bar under the tabs that **stays until you dismiss it** with its ✕, in view wherever you have scrolled to, with the words the pop-up
used to carry; the same words twice become one line with a count (×2), at most four lines of a kind stay, and *Dismiss all* clears them.
*A short question* (two lines at most, yes or no): a browser confirm. *Destroying or ending something*: a **panel in the page, under the button
that asked** (`dangerAsk()`, the clay look of the Erase panel). It says what is being done, **what goes and what stays**, and its final button is
named for the act (*Delete Ben Example's training history*, *Forget Cara*, *End the run today*, *Delete Day 3 log for good*, *Delete this call
log*) beside **Cancel**. Esc and Cancel close it and call nothing; it survives a redraw while open (`_danger`, like the Erase panel's `_erase`),
it never follows you to another screen, and while its work runs both buttons are off, which is the double-tap guard. Five actions use it: **Delete
training history** and **Forget their Proof data…** (File → Danger zone), **End this run today** (Proof → Quest week), **Delete for good** of a
hidden session and **Delete** of an old call log (File → Records). The button that asked only opens the panel: the guards (demo mode, a failed
load, a coached athlete for Forget) run first, in front of it, and the final button makes exactly the calls the confirm used to lead to. *Something
to read or copy once* (a first password the server could not store, the backup summary, an erasure receipt, the result of adding coaching logs,
logins in bulk or a Library file with a skipped item, the text of a copy the browser refused): a **notice**, a calm green line in the same bar as
the failures, with the words the pop-up carried. It also **stays until its ✕** (a password the server could not store is shown nowhere else) and has
a **Copy** button when there is something to copy: the password itself, never the whole message; if the browser refuses, the text is selected for
Ctrl+C. A notice that is also a warning (a password that was not stored, an incomplete backup, a bulk result with failures) takes the clay tone,
and the backup's rows per table are folded under its summary. The Spine's three How-to-do-it limits (more than 6 steps, a step over 140 characters,
the same limits in Farsi) are failure lines: nothing was saved. `danger-panels` drives all of it. Before this a failed save was a 2.6-second toast in
some tabs (easy to miss: the affiliate and intake ones) and a blocking pop-up in others, and a buyer login ended in a pop-up where an athlete's ended in
a toast. A buyer login (Buyers: the Course and the Testing app) now copies its message and says so in a toast, like an athlete's; the password waits in the list.


## The parts

- [Exercises — the Spine](01-exercises-the-spine.md)
- [Leads — Applications, Free signups and Referral codes](02-leads-applications-free-signups-and-referral-codes.md)
- [Leads → Applications — where the apply form lands](03-leads-applications-where-the-apply-form-lands.md)
- [Leads → Free signups — the funnel](04-leads-free-signups-the-funnel.md)
- [Leads → Chats — the website chatbot's saved conversations (2026-10-17)](05-leads-chats-the-website-chatbots-saved-conversations.md)
- [Leads → Referral codes — the referral-code roster](06-leads-referral-codes-the-referral-code-roster.md)

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
