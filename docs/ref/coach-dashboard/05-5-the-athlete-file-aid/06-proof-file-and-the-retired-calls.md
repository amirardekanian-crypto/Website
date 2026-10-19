### Proof · File (and the retired Calls)

- **Proof** (only for people who log habits) — server-scored level, 14 presence dots, their week,
  board name and worn title, WhatsApp and email, and their wall lines with hide/show on each. (Body weight is not here any more: it is on The work, above.)
  **The level is the server's, never worked out here.** `coach_season_levels()` (stage46, one call for the whole roster, with
  `hab_season_level()` per athlete as the fallback) answers it. It is Proof's season level until Career Mode's XP switch is on, and
  then the **career level**, which never resets. The big figure's caption reads **career level (server)** where it read **season
  level (server)**, and the roster's `LV n` text and the header chip show the same number. The page learns which from
  `S.careerXp`, read quietly in `loadLevels()` from the newest `career_rules` row (`rules->switch`: the day the XP switch was turned
  on, or null while it is off). A page that cannot read it keeps the old caption, and the number is the server's either way.
- ~~**Chat**~~ — **removed 2026-09-26** (Amir: *"whatsapp first, remove in app chat from app and
  coach.html"*). The `messages` table and its three functions stay on the server untouched, so no
  past thread is lost; nothing reads or writes them now.
- ~~**Calls**~~ — **retired 2026-10-11** (Amir: *"Retired, fold it into File"*; one call log in the table, from
  12 July, and `/cycle-report` does the end-of-cycle review). The tab, **+ New call log** and **Copy cycle
  prompt** are gone. The old logs stay readable, and deletable one by one, in the File tab under **Old call
  logs** (the section is absent when there are none). An old `#a/<id>/calls` link opens the athlete on The
  work. `call-log.html` and `CALL_LOG.md` still exist but nothing in the dashboard links to them.
- **File** — four groups in this order (2026-10-12), each one white panel of label / value / action rows between hairlines, with the longer
  explanations folded at the end of their group under **How this works** (nothing was removed: each short hint on a row has its full text there):
  1. **Contact and access:** **WhatsApp** (the number box, *Save number*, *Remove*), **Login** (create, change password, remove; an unsent
     password shows here with Copy message, WhatsApp when the number is known, and Mark sent; *No login yet* stays in clay), **Status**,
     **Their app** (*View their app* / *View their Proof*: read-only previews of the programme; what they have logged is not in them, it is
     under The work and Proof here; audit TOOLS-11) and **Came from** (the applications linked to them under Leads; each has an *open the application* link).
  2. **Programme:** the facts (athlete id, tier, days a week, cycle, roadmap n of m, when it was last saved and by whom; *Stored in: no
     programme row* only when there is none), then the **Coaching log** and **Version history** folds.
  3. **Records** (absent when there is nothing to show): **Hidden sessions** and **Old call logs**. Each log's **Delete** and each hidden
     session's **Delete for good** opens a panel right under it (see *One way to say what happened*): what goes, what stays, a final button
     named for the act, Cancel. An old call log's fold has an id, so a redraw keeps an open log (and its panel) open.
  4. **Danger zone**, a fold shut by default, open while **Erase completely…** is open for this person, and kept open across a redraw once
     you have opened it (`#dangerzone`, through `snapTabBody()`). Inside: **Delete training history**: every finished session (the hidden ones too) plus what the app keeps for them on the server (habit log, body
     weight, personal records). Their programme, login, coaching log, calls and wall lines stay, and so
     do they on the roster. **It asks in a panel under the button** (round 3, 2026-10-12; it was a long confirm): *what goes* (with "cannot be
     undone, except from a backup file"), *what stays*, a pointer to **Erase completely…** just below, and a final button named for the person,
     **Delete Ben Example's training history**, beside Cancel. (It was called *Delete all data* until 2026-10-10, which it never was.) The final button is
     one call, `coach_delete_training_history()` (stage48): the sessions and the progress snapshot go
     together or not at all, and the counts come back. It used to be two deletes from this page, and a
     failure between them left one gone and one standing. Next, **Erase completely…**, which removes the whole
     person (see *Erasing a person* below), and **Forget their Proof data…** for a free signup (see *Proof*, section 7).
- **A WhatsApp number on every File** (stage62, 2026-10-11; audit FLOW-8; Amir: "a WhatsApp number field on each coached athlete's File, shown in
  the header with a WhatsApp button"). Most coached athletes had no contact record (9 of 49, all made from an intake form), so a new login's
  *Copy message* had no WhatsApp button for them. The File has a **WhatsApp number** box (*Save number*, *Remove*); the header (right of the name, 2026-10-12)
  shows a **WhatsApp ↗** button and the number, or *add a WhatsApp number* for a coached athlete with none. The page checks that `waLink()` can open the
  number (the country code, or an Iranian 09…; Persian digits are folded) before it sends it; `coach_set_whatsapp()` stores it as typed on the athlete's
  `hab_contacts` record, making one only when there is a number to keep (`source 'coach'`, tier from the programme). **A contact the coach made is
  not a signup** (`isSignup()`): it is not in the Proof signup funnel, is not a *new signup* reason, does not count as the athlete being seen and gives
  them no Proof tab. The typed number survives a redraw (`KEEP_TYPED`). `whatsapp-number` drives it.
- **Hidden sessions** (stage60, 2026-10-11; audit FILE-11 and ROSTER-9; Amir: "hide it, keep it recoverable"). The Raw log's button is **Hide this
  log**, no longer Delete. A deleted session left the report's mark in the athlete's progress, so the roster warned *session not synced* for ever,
  and their phone could send the session again and bring it back. A hidden session stays in the database (`session_history.hidden_at`, `hidden_by`)
  and leaves every number, list and warning: the dashboard (`S.hist` holds the visible ones, `S.histHidden` the hidden ones, and `syncGapsOf()`
  counts a hidden session as present), the app's history (`get_my_history()`), the WORKOUT tick (`get_workout_days()`) and the pipeline's queries
  (`and hidden_at is null`). The athlete's phone can re-send it as often as it likes and it stays hidden; only a coach's save brings it back. A bar
  with **Undo** follows the hide for 30 seconds. The athlete's File lists every hidden session under **Hidden sessions** with **Restore** and, for a
  real erasure request about one session, **Delete for good** (only a hidden row can be deleted from there, and it asks first, in a panel under the
  row: it can only come back from a backup file, the person's other sessions stay, and the final button reads *Delete Day 3 log for good*). One coach-only
  function does both directions, `coach_hide_session()` (it never touches `updated_at`: hiding is not athlete activity). `session-hide-undo` and
  `session-hide-no-false-warning` drive it.
- **This cycle on the day cards, earlier cycles folded** (2026-10-12; Amir, a day into Elmira's new cycle: *"all im seeing is his
  past cycle"*). When the current cycle has a start date, a day card holds only the sessions trained on or after it, and its picker
  lists only those; a day not trained yet this cycle says *nothing logged on this day this cycle yet*. Last cycle's sessions are
  under **Earlier cycles** (folded, newest first, each with its log exactly as sent and **Hide this log**): they used to sit on the
  new cycle's cards, compared with a plan they never trained. A cycle with no start date keeps every session on the cards.
  `work-this-cycle` drives it.
- **No Add past session from email** (removed 2026-10-12; Amir: *"i will never do that manually"*). Nothing is meant to need it:
  since the same day the athlete app keeps every finished session in its queue until the server has it, and files a day left
  unfinished by itself (`PROGRAM-APP.md` → *No signal*, *An unfinished day is filed by itself*). If one is ever lost while the
  emailed reports still exist, Claude puts it back with `scripts/restore/sessions_from_email.js`, which reads each report with
  `parseSessionEmail()` (kept in coach.html as the one reader of the report's format, with `parseCheckinPlan()`; not called by the
  page; `scripts/check_twins.js` round-trips the app's `readinessPlanLine()` through it).
- **"Session not synced" without the email** (2026-10-12). `syncGapsOf()` also reads the phone's own list of the sessions it
  finished, `<id>_finished` in their progress, for the last 14 days: a session on it with no row (hidden counts as a row) is the
  same warning the report marks give. It keeps working when the reports are switched off. `sync-finished-list` drives it.

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
