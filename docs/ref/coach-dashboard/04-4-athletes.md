## 4. ATHLETES

One row per person across **both** systems, split under three headings — **Needs you**,
**All quiet** and **Gone quiet** — so the line between "waiting on me" and "fine" is drawn rather
than implied. Filter chips across the top (Everyone · Needs you · Coached · Free · Proof only · No file ·
Gone quiet, and Paused and Former when someone has that status) each carry their count, and **the tier chips add up to Everyone** (the public demo and your own record are in no count and not on the list; the footer says so and links the demo, `roster-demo-out`; a former athlete is in none of them) (a person with no programme and no habits is under *No file*; a chip
with nobody in it is not drawn, except Everyone, Needs you and the one you are on). Search reads the name, the id, the board name, the contact's
name, email and WhatsApp digits (Persian ی/ک and extra spaces are normalised); the sort and the
search survive a redraw.

**The list is one dense white surface** (redesign round 1, 2026-10-12; `roster-dense`): the groups are quiet label bands inside it, and each
person is one row, a single `<button class="ath">` that opens their file. On a PC (900 px and up) the rows are aligned columns under a
head row, about 52 px each (it was about 100 px a card, 4,000 px for 38 athletes): **Athlete** (a 28 px initials disc, court green, an
outline for the free tier because plum means a warning; the name; the tier as small grey text: coached, free, Proof only, no file; the
Paused or Former chip), **Cycle** (`C2 · wk 3/5 · ends 22 Oct`, from `rosterCycleHtml()`: the number is the programme's current cycle
index + 1, the week is `cycleWeekOnC()`; in the last 7 days it says `ends in 3 d` / `ends today` and after the end `ended 5 d ago`, in clay
for an active coached athlete; an undated cycle shows its name and length, then `no cycle`, or `no programme` for someone with no
programme row), **Last session** (how long ago and how many; `no sessions yet` for a coached athlete with none, a dash for anyone
else), **Proof** (seven presence dots, `n/7`, and the level as plain text, filled in place by `paintLevels()` when the levels arrive (the career level once Career Mode's XP switch is on, see *Proof · File* below);
empty for a person with no habits) and **Why** (the reasons from §3's one rule, clay when it is a warning and grey when it is only worth knowing,
a pause or former status in words, and a load spike in plum: `load 1.6 · high load`, `· climbing`). A note waiting keeps a clay mark on
the left edge. On a phone (under 900 px) there are no column heads and a row is two lines: the name, tier and Why, then the cycle, the last
session and Proof (the dots wrap to a third line when there is no room); nothing is ever clipped.

**A flagged row says why, in words:** the reasons in §3's table, from the same function.

**Behind the ⚙ Tools button, in the top bar on every screen** (stage63 round, 2026-10-11; audit ROSTER-12; Amir: "a ⚙ Tools button"; **moved from the roster's controls into
the bar on 2026-10-12, round 2 of the UX pass, on Amir's word**, so the roster starts right under the filter chips and the tools are one tap away from any screen). The
roster keeps the search, the sort and the filter chips. The button keeps `id="toolsBtn"`, `toggleTools()`, `aria-expanded` and its badge, and opens `#toolsPanel`, a panel hanging under the bar
at the right (520 px wide at most; the full width under the bar on a phone), above the page. It holds *Create N missing logins* (coached athletes who have trained and have no
login), the **Coach tools** line: *↑ Add coaching logs* and
*⤓ Backup*, with when this computer last took a backup, then **Logins to send** (open while three
or fewer wait, folded above that: each unsent password with Copy message and Mark sent). The button's badge counts the logins waiting to be sent; the panel is folded when
you arrive and **closes on a second tap, on Esc and on a click outside it**; it **stays open through a redraw** (it is not part of `#content`; `paintTools()`, called from `renderRail()`
and after a backup, rewrites its contents only when they changed, and never takes the focus off a box being typed in) (`tools-button`, `nav-seven`). **A stored
password clears by itself** (stage51, 2026-10-11): the database removes it the moment the person signs in
with it and stamps *sent* with that time, so they drop out of the list. *Signed in with it* can only show
for a moment, or on a password stored before stage51; the Buyers lists (Course and Testing app) behave the same.
If you sign in as the person yourself to test a login before sending it, that clears it too: reset the
login for a new password. (The secret-link tools are gone: the links were retired on 2026-09-07.)

- **There is no programme upload button** (removed 2026-10-11, Amir: *"i never use it"*, with its function). A NEW athlete's first
  programme and every new cycle go up through the pipeline (`publish_cycle()`, `p_new_cycle => false` for a new athlete); a
  day-to-day change is the ✎ editor; an old version comes back from Version history.
- **↑ Add coaching logs** only adds a log for an athlete who has none on the server. It never
  replaces one: the server copy is the record (publish_cycle splices into it, `/cycle-report`
  appends its Debrief). Until 2026-10-10 it replaced them wholesale.
- **⤓ Backup** pages every table in key order, de-duplicates, blanks the unsent login passwords
  (`initial_password`) and says **INCOMPLETE** when a table could not be read or came back short. The file is the rows
  only (no schema, functions or policies: those are `supabase/*.sql`, and the structure as a whole is `supabase/schema_snapshot.sql`),
  and a restore is not a plain import, because the login tables point at sign-in accounts that must exist first.
  **The way back is written and rehearsed (2026-10-11, audit TOOLS-4): `scripts/restore/README.md`.** `restore_backup.py` turns a
  backup into SQL files and leaves out everyone a receipt in `erasure_log` names, so give it the NEWEST backup as `--receipts`
  even when you restore an older one; the logins are re-created from this dashboard (Create missing logins; Buyers → Course and Testing app with the
  same usernames), then `20-after-logins.sql` puts back what belongs to a login. A table added to the schema goes in `BACKUP_TABLES` the
  same day (`scripts/test_restore_backup.py`, pre-commit guard 17, fails when the list and the snapshot disagree). Keep the last 12
  weekly files and delete older ones: `python scripts/prune_backups.py <folder>` lists them, `--delete`
  removes them (the privacy notice promises a deleted record leaves the backups within about three months).
  **An incomplete backup is a different file** (2026-10-11): `aa-backup-INCOMPLETE-<date>.json`, with `complete: false` and
  `could_not_read` inside. It is not a restore point: it does not count as the weekly backup (Today keeps asking, and says the
  last try was incomplete; the Coach tools line says so too), and the prune script lists it apart, never treats it as the
  newest backup and deletes it on the same 12-week rule as the others. The summary after a backup is a notice (round 3, 2026-10-12): the
  rows per table sit folded under it, and an incomplete one is a notice in the clay tone that opens with the warning and names what could
  not be read. Fix what it lists, back up again, and delete the file.

---

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
