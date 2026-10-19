### Erasing a person

One panel, three kinds of person (stage54, Amir 2026-10-11: *"both athletes and buyers"*): an athlete (File →
Danger zone, which is folded until you open it → **Erase completely…**; it is open while the panel is), a course buyer or a testing-app buyer (**Erase…** on the row). It opens by
asking the server for a **dry run** of `coach_erase_person(kind, key, confirm, intake_ids, dry_run)`: the function
does exactly the work of a real erasure and then undoes it, so the list shown (rows per table, the sign-in
account) is what a real run would delete. Nothing is erased until the id (athlete) or username (buyer) is typed;
the button stays disabled until it matches, in any case. It is an inline panel, not a native dialog, because the
list is long and a phone clips a dialog.

- **What goes, one transaction:** every table that holds the athlete's id (sessions, app data, roll-call lines,
  titles, season results, board place, library sessions, old messages, call logs, cycle reports, coaching log and
  its earlier texts, the programme and its saved versions, old keys, the Proof contact, the login), **the rollback
  copies in the `backup` schema** (`backup.onename_2026_10_09` holds 17 athletes' old progress and session logs from the
  rename of 9 Oct: any table there with an `athlete_id` column is emptied too), and the sign-in account itself,
  whose sessions and tokens go with it, so their phone cannot upload again. For a testing-app buyer: the login, the
  note, every player, note and result including the ones they had removed.
- **Intake forms are the coach's pick** (Amir, 2026-10-11: *"pick any form in the Erase panel"*). Most forms cannot
  be tied to an athlete by data (the Farsi forms are in Persian script, the programmes in Latin letters, and 30 of 52
  athletes have no email or number stored), so the panel does two things. It **offers** the forms that carry their
  email, their WhatsApp number (last 9 digits, Persian digits folded) or their full name, and **first the ones you linked to them in Leads** (stage61: *linked to them*; ticked for you, because you did the linking). **A linked form and a same-email form
  start ticked**, and not when another athlete's contact carries the same email (a parent's, for two children: flagged
  *also another athlete's*); a number match (it can be a foreign number with the same last digits, or a handle that holds
  digits) and a name match (two people can share a name) are offered, never ticked for you. And a
  **finder** under it searches every other form by name, email, contact, programme or date, shows 8 at a time, and
  ticks go into a list *"N intake forms will be erased with them"* by name, each with *remove*. At most 10 per
  erasure; the server accepts any form that exists and refuses a missing one. The final receipt (a notice since 2026-10-12, in the bar,
  until you dismiss it) names the forms that went, or says that none did.
- **What stays, and the panel says so:** your weekly backup files (the privacy notice promises a deleted record
  leaves them within about three months), emails in your inbox (Web3Forms), WhatsApp, anything on their own phone,
  any copy on your own computer (a `data/<id>.json`, a saved Backup), and, for an athlete, **their board name in
  other athletes' last-seen standings** (`lbSeen` inside each athlete's app data; every phone rewrites it from the
  current board at its next board view, so it clears itself), and **an affiliate partner record** (Amir,
  2026-10-11): an athlete who is also a partner keeps the record under Leads, in Referral codes; only its link to the athlete
  is cleared. Not removable by this: free-text mentions in *other* athletes' coaching logs, and ids named in the
  migration history.
- **Never erased:** the public demo, the identity the dashboard reads the board through (`amir_ardekani`), a login
  that is the coach's own, a login shared by two accounts (an athlete who is also a buyer). Each raises, and the
  Erase button is not even drawn for the first two. A key typed in another case finds nothing (ids are
  case-sensitive) and says which id exists; it never takes the login and leaves the data. `p_dry_run` must be
  `true` or `false` (a NULL once skipped every check and still deleted).
- **Fail-closed:** after the deletes the function checks every table in the public and backup schemas that has an
  `athlete_id` column, and (for every kind) every public table with a `uuid` column called `user_id` or `account_id`;
  one that still holds a row undoes the whole erasure and names the table. Add the table to the function's list the
  day you create it. The tables are emptied in the order `publish_cycle()` locks them (programme, its versions,
  coaching log, its versions), so an erasure and a publish never deadlock and a publish's new rows are committed
  before they are deleted.
- **One thing it cannot close:** a phone that saves at the very moment of the erasure can write one last row after it
  (the function cannot see an uncommitted write, and the app's own functions do not lock the athlete). The person
  then shows in the roster again with tier *unknown*; erase them a second time and it is gone. The final receipt says
  so. Buyers are not affected (their tables have foreign keys to the account).
- **The receipt** (`erasure_log`, in the backup): the date, the kind, the counts and a SHA-256 of
  `kind:id` (athlete id or username, lower case). No name, id or email is stored. To ask "did I erase X?", hash
  `athlete:x` and look it up. After restoring an old backup, hash every restored id the same way to find the people to
  erase again.
- **Failure words:** an error PostgreSQL raised (our own refusals, a missing right, a deadlock) or a request PostgREST
  turned away means the transaction never committed (*Nothing was erased*, and the panel stays open with everything
  typed). No code at all, PostgREST's own connection errors (`PGRST000`-`003`) and the connection, shutdown and system
  classes (`08`, `57`, `58`, `XX`) cannot prove that: the panel says it cannot tell and how to find out (tap
  ↻ Refresh: **gone from the roster or list = it went through**; still there = nothing was erased). After 30 seconds
  with no answer a **Stop waiting** button appears; a success that arrives afterwards still finishes the job
  (refresh, receipt), without dragging you off a panel you opened meanwhile. A preview answer that arrives late (you cancelled
  while it loaded and reopened) is dropped, so it can never overwrite a newer panel or flip a running erasure back to
  *ready*. The Erase boxes keep focus across a redraw of the page, without scrolling it. When the intake forms did not load
  the finder says so and is switched off (it never says "0 other forms").
- **A revoked buyer** has the same Erase… button (behind Manage); the *Revoked* section opens for the person whose panel is open
  (it used to draw the panel inside the closed section, invisible).

---

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
