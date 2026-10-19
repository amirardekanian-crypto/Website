### Leads → Applications — where the apply form lands

`form.html` and `form-fa.html` used to depend entirely on **Web3Forms**: the form
turned into an email, and when that relay was unreachable the submission was lost —
the athlete saw an error and nobody found out. Now each form **also** writes straight
to Amir's own Supabase (`submit_intake` → the `hab_intake` table), and counts as sent
if *either* path succeeds. The email still fires as a notification; **this view is the
durable record**, so a Web3Forms outage can no longer swallow a lead.

**A list and the application on show** (round 2 of the UX pass, 2026-10-12). On a screen 1000 px wide or more the view is two panels: **the list**
on the left (about 320 px, its own scroll box, so a list of 64 does not push the page) and **the chosen application** on the right. The list has
**New · n**, **Handled · n** and a folded **Archived · n**; a row is initials, the name, an **EN/FA** pill, the programme in short (*Match*, *Set*,
*Game*; the full line is its tooltip), when it arrived and, once there is one, the outcome as a small pill. **The application on show is kept in the
page** (`_intakeSel`, not the address): it starts as the newest *new* one (or nothing, with "Pick an application to read it."), survives a redraw, a
reload of the data and a status change, and **stays on show when it leaves its group** (handled, archived; archiving it unfolds the Archived group so
its row is not hidden). Below 1000 px the list is the screen until one is chosen; the application then replaces it, with **← All applications** at the
top (it puts the list back where it was scrolled). `data-pane` on `#inView` says which of the two shows, so this is CSS and no second render.

The application: the name, an **EN/FA** pill, the programme, *Arrived today* (the date and time are its tooltip) and its state (*New* in clay);
a contact row (email as `mailto`, the contact as a `wa.me` link when `waLink()` says it is a number, a Copy beside each); then **Answers** as a
definition grid, each question and its answer side by side in one cell pair, **two pairs to a row while the application is 700 px wide or more**
(a container query on the pane: at a 1000 px screen the pane is 620, so it is one to a row) and one to a row below that. An answer in Persian script
is `dir="rtl"` and right-aligned inside its own cell, never at the far edge of the page; a long answer takes the whole row. `INTAKE_SKIP` and
`intakeVal()` still decide what is shown.

**One way to close** (Amir, 2026-10-12: the outcome is the main way; *Mark handled* stays as a quiet button). Under the answers is one row:
**What happened**, **Which athlete** (only when the outcome keeps one), **Save outcome** (the one primary button) and, at the right and quiet:
**Mark handled** (a *new* application only: it closes it with **no outcome**), **Archive** (spam or not a fit) and **Reopen** (a handled or archived
one goes back to *New*). The saved outcome and its athlete are written above the row. The **badge on the Leads tab and the count on this sub-tab are the new ones**.

**What became of it** (stage61, 2026-10-11; audit FLOW-17 and SPINE-11; Amir: "link an application to the athlete it became, and let Handled
record an outcome"). The closing row's **What happened** offers *Became a client*, *Joined the free tracker*, *Not a fit*, *No reply*,
*Said no* and *Something else*, and for the first two, **Which athlete** (a list of the roster by name; when one athlete has the application's
email, WhatsApp number or full name they are pre-selected, never saved for you). **Save outcome** calls `set_intake_outcome()`: a new application
becomes *Handled* by it, a client needs an athlete, only a client or a free-tracker joiner keeps one, and "No outcome (clear it)" removes both. The
list row wears the outcome as a pill, and **the athlete's File says where they came from** (*Came from · date application · programme · outcome · open the
application*, a link that makes that application the one on show, `openApplication()`, and goes to Leads). A linked application is also the surest way to find the right form when you erase the athlete (see *Erasing a person*). The view reads
`hab_intake` itself, paged, under the "coach manage intake" policy (`intake_list()` still exists and is no longer called). `intake-outcome`,
`intake-list-detail` and `erase-linked-form` drive it.

**In the code:** `intakeViewHtml()` returns the whole view (`#inView`) and `wireIntake(root)` wires whatever it is put inside; `renderLeads()` puts it under
the sub-tab bar. A change inside it goes through `intakeRedraw()`, which replaces
`#inView` only (it does nothing if the coach has already gone to another screen while a save was out), keeps the list's scroll and does not replay the
panels' entrance.

Nothing here joins anyone to Proof or writes a programme — it's an inbox. When you take
a lead on, onboard them the usual way (`/athlete-intake`). Backend, and the coach-only
guard on every read/write: [`supabase/stage27_intake.sql`](../../../../supabase/stage27_intake.sql).

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
