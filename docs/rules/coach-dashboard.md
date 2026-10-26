# Rules — the coach dashboard (`coach.html`)

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

The manual: [`../../COACH_DASHBOARD.md`](../../COACH_DASHBOARD.md). The 2026-10-10 audit (record): [`../record/COACH-AUDIT.md`](../record/COACH-AUDIT.md).

## The coach dashboard (`coach.html`) — read `COACH_DASHBOARD.md` before changing it

Audited 2026-10-10 (`Content/COACH-AUDIT.md`: findings, what changed, what is open; **its §12 is the list to continue from**). What must never break:
- **A programme write from coach.html is never the page's copy written whole.** The ✎ editor reads the live
  row, refuses when `updated_at` moved since the page loaded or the exercise is not at that place any more
  (checked by name), applies the edit to the live copy and writes it `.eq('updated_at', <read>)`. **So does a restore, and so does Undo**
  (FLOW-11, 2026-10-11: the one-tap bar after a save writes the pre-save copy back only against the stamp that save left). Anything
  that replaces `S.programs` goes through `reloadPrograms()` (it re-assembles, so the athlete file redraws).
- **A Spine or Quality save sends only the columns the coach changed.** An exercise entry is one call,
  `coach_save_spine()` (stage48): both tables in one transaction, the rows locked, nothing written to either
  half when someone else changed one of THOSE columns since the page read it (Claude's `/spine` writes the
  same rows by SQL). The ten qualities are one table: `saveChangedCols()`, `.eq('updated_at', <read>)`. Never
  `upsert` a whole entry from the page's copy. A rename of an entry live cards use is refused in coach.html:
  it is `/spine`'s one-name move. Every change to the three Spine tables is kept in `spine_versions`
  (stage49, a trigger); an entry's History panel undoes a change through the same guarded save AND the same identity
  rules Save applies (`spineIdentityProblem()`: a name or alias another entry owns, a rename of an entry live cards use,
  a link to an entry that is gone are refused).
  `sh scripts/test_spine_sql.sh` tests both stage files on a throwaway local Postgres, before they go near the project.
- **"Needs you" is one rule, `reasonsOf()`**: Today, the roster's reasons, its group, filter and sort all
  read it. A new reason goes there, nowhere else, and into COACH_DASHBOARD.md §3's table.
- **A value inside an inline handler goes through `jsq()`**, never `'${esc(x)}'` (esc is HTML escaping; the
  browser decodes it back before the JS runs, so a quote in a signup email ran as code).
- **A growing table is read with `selectAll()`** (paged in key order past PostgREST's 1000 rows), and a read
  that may fail records it in `LOAD_ERR`, so the banner names it instead of showing an empty table.
- **A write that must change a row asks for it back** (`.select()`) and treats zero rows as failure
  (`writeFailed()`): a lapsed session sends writes as anonymous and RLS turns them into silent no-ops.
- **Auth events rebuild the page only when the signed-in user changes** (token refreshes and tab refocus
  used to reload everything and throw away typed work).
- **A person is erased by one call, `coach_erase_person()`** (stage54, 2026-10-11; Amir: "both athletes and buyers"), never table by
  table from the page: the inline Erase panel asks for a dry run first (the function does the whole erasure and undoes it, so the
  list shown is what a real run deletes), a real run needs the athlete id or the buyer's username typed, and after the deletes it
  checks every table in the public and backup schemas with an `athlete_id` column, and every public `uuid` column called `user_id` or
  `account_id`, and undoes everything if one still holds a row. **A table you add that holds a person's data goes into its table list
  the day you create it** (`supabase/stage54_erase_person.sql`), and into `BACKUP_TABLES`; the one-off rollback copies the pipeline
  makes live in the `backup` schema and are emptied for the person automatically. Intake forms are the coach's pick (matches by email,
  WhatsApp number or name are offered, and one you linked to the athlete under Leads → Applications (stage61) comes first; a linked or same-email one is ticked for you; a finder lists any other, at most 10; a linked form left unticked keeps its answers and loses only the link). An affiliate partner record stays when its athlete
  is erased (only the link is cleared). The private note about a buyer lives in `buyer_notes`, coach-only; the account rows' `label`
  stays empty (a trigger moves anything written there). Tables are emptied in `publish_cycle()`'s lock order (programme first).
- **A finished session is hidden, never deleted, from the dashboard** (stage60, 2026-10-11; Amir: "hide it, keep it recoverable"): `session_history.hidden_at`,
  one coach-only `coach_hide_session()` for both directions, an Undo bar, and **Hidden sessions** (Restore, Delete for good) in the athlete's File. The phone's
  `save_session()` never un-hides one, the coach's does. `get_my_history()`, `get_workout_days()`, the dashboard (`S.hist` leaves them out, `S.histHidden` keeps
  them for the File, `syncGapsOf()` counts them as present) and every pipeline query that reads sessions (`and hidden_at is null`) leave them out: **a new reader
  of `session_history` filters on `hidden_at`**, or a hidden session comes back in its numbers.
- **The work tab is the current cycle's** (2026-10-12): with a dated cycle a day card holds only sessions on or after its `startDate`;
  older ones are under **Earlier cycles** (`workTabHtml()`, `earlierCyclesHtml()`). **There is no "Add past session from email"** (Amir:
  "i will never do that manually"); `parseSessionEmail()` stays only as the tested reader that `scripts/restore/sessions_from_email.js` uses.
- **A paused or former athlete is nobody's chase** (stage63, 2026-10-11; Amir: "active, paused, former"): `athlete_status` (coach only, in the backup, emptied by an erasure) holds only
  those two; `reasonsOf()` returns only a note they sent and a session that did not sync for them; a former athlete and the demo and your own identity are in no roster
  total (`inTotals()`). The tools (Backup, Add coaching logs, Create missing logins, Logins to send) sit behind one ⚙ Tools button in the top bar (moved from the roster, Amir 2026-10-12). A new table with an `athlete_id` column goes into `coach_erase_person()`'s list the day you create it (stage63 did it by patching the live function).
- **A contact record with `source 'coach'` is a WhatsApp number the coach typed, not a signup** (stage62, 2026-10-11): `isSignup()` keeps it out of the Proof signup
  funnel, the "new signup" reason, `lastSeen` and the Proof tab. A new place that reads `S.contacts` or `a.contact` as "this person signed up" must use it.
- **The weekly call log is retired** (Amir, 2026-10-11): no Calls tab, no new call logs, no Copy cycle prompt; old logs are read and
  deleted in the athlete's File. **A session with no duration or RPE is left out of the load ratio and the ratio is not shown while any
  exist in the last 4 weeks** ("not enough data"), never counted as zero.
- **A month's honours are suggestions until Amir confirms them** (stage104, 2026-10-25): the reminder card at the top of Courtside, from the month's last day until all four
  are confirmed, is the only place a suggestion is drawn. The honours area (WhatsApp lines) shows an honour only once `S.honours.confirmed` has it; a server with no `confirmed`
  is the old behaviour, no card. The page's quiet freeze never publishes. `COACH_DASHBOARD.md` → *The month's honours wait for Amir*.
- **Run the harness after any change to a data or write path:** `node scripts/headless/coach/run.js`
  (133 scenarios, made-up data, stubbed Supabase; README there). The compare tests stay in pre-commit.
- **The UX pass (2026-10-12; Amir's answers in memory `coach-redesign-2026-10-12`)**, round 1 shipped: Today puts Needs you first and wide,
  each row's button names what it does, and **"Also waiting"** (applications, logins to send, backup, older notes) is NOT a reason, so it never
  touches `reasonsOf()` or the people count. The roster is one aligned table (Athlete · Cycle · Last session · Proof · Why); the athlete header
  carries the cycle line and the reasons as links; the File is four groups with the **Danger zone folded**, and **Forget lives there** (not on the
  Proof funnel). A shortened explanation keeps its full text in that group's "How this works" fold. **Round 2 shipped:** seven places in
  one bar (Today · Athletes · Exercises · Proof · **Leads** · Library · **Buyers**; `#intake`, `#affiliates`, `#assess`, `#course` are rewritten to
  their new homes by `fixLegacyHash()`, keep them working); Leads = Applications (`intakeViewHtml()`, a list and the chosen one) · Free signups
  (`funnelPanelHtml()`) · Referral codes; Buyers = Course · Testing app; Exercises = Entries (the editor beside the list) · Qualities · Coverage;
  Proof is the crew's home (wall, quest lever, pulse, board) and Today keeps a short Proof column; body weight is on The work. **Round 3:** destroying
  something asks in an inline panel under its button (`dangerAsk()`: Delete training history, Forget, End the quest run, the two record deletes),
  and anything to read or copy once is a `notice()` line beside `fail()`'s (there is **no `alert()`** in coach.html; keep it that way); Library
  rows with one Copy link; chart axes; a folded pill picker; a phone bottom bar below 600 px only; one hint line per panel with the rest in
  How this works. **The look** (shipped last): five font sizes (12/14/17/22/30), three radii (8/12/999), Barlow Condensed only for the brand
  and an athlete's name, Space Mono only for numbers that line up, plum only for the middle warning, one fold, two pick-one controls; the
  `design-rules` scenario fails a change that breaks them (COACH_DASHBOARD.md §2, "The look").
- **A rule the dashboard copies from the athlete app goes into `scripts/check_twins.js` the same day**
  (2026-10-10, pre-commit guard 15): it runs both copies on the same vectors and fails a commit that changes one.
  After editing `assets/js/chips.js`, bump its `?v=` in coach.html, then `node scripts/check_twins.js --stamp`.
- supabase-js is pinned (2.117.3): program.html and habits.html load our own copy, `/assets/js/supabase-2.117.3.js` (precached by sw.js;
  a floating `@2` from jsDelivr until 2026-10-13), coach.html the same version from jsDelivr. Bump all three together, a NEW file name,
  only with the harness's `reallib.js` and `scripts/headless/signin.js` run.
- **The coach's address is typed once per layer** (stage57, 2026-10-11): `public.is_coach()` in the database (every policy and
  function asks it; a new one never types the address; `coach_erase_person()` also names it, to protect the coach's own login),
  `COACH_EMAIL` in coach.html, once in each of the three login Edge Functions. **Public sign-up must stay off** (Supabase →
  Authentication → Sign In / Providers → User Signups): the coach check trusts the email in the sign-in alone. Read it back with
  `curl -s https://bvipfipbdcyqnbczjmaq.supabase.co/auth/v1/settings -H "apikey: <the publishable key>"` → `"disable_signup": true`.
  Every live database function has its `CREATE FUNCTION` in `supabase/` (the eight that did not are in `stage56_functions_record.sql`).
