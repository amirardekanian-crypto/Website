### The Monthly Open: set the challenge, confirm results, the board, close it (stage85, 2026-10-19)

Career Mode round 5, the last step of plan A (Amir: *"for crew and the open go with your picks"*; the server side is `supabase/stage85_crew_open.sql`, not applied until
Amir says so). The Open is **one challenge at a time, any kind you design**, shown as a card on the athletes' Crew tab under the feed, with a board ranked by the
result. Athletes send the clip on WhatsApp and **nothing is stored until you type the result here**. **It pays no XP** (GAME-6).

- **Where.** One panel on Proof, **directly under Who said yes** (`#openPanel`; above the board, in the left column). `loadOpen()` reads `coach_open()` after the first paint,
  on ↻ Refresh, on the panel's own **↻ Reload** and when Proof is opened a minute or more after the last read. **While the server has no `coach_open()` (stage85 not
  applied) or answers nothing at all, nothing is drawn and no warning is shown** (`openMissing()`, `openValid()`); any other failure shows the panel with the reason and
  **Try again**, the load banner names *the Monthly Open*, and no form is drawn while the state is unknown. Not drawn in demo mode.
- **One read, five writes, one shape.** `coach_open()` and the four writes (`coach_open_set`, `coach_open_close`, `coach_open_result`, `coach_open_remove`) all answer
  `{open, results, past, crew, at}`, so the panel is drawn from whatever a write returns and costs no second read. **A write that comes back with nothing in it is a failure**
  (`openWrite()`, as `writeFailed()` is for a table write): it says so and reads the panel again. **No database code** (the answer never arrived) says the page cannot tell
  whether it went through, and reads again. The server's own messages (*no challenge is open*, *no such challenge is open*, which a correction of a challenge closed or replaced elsewhere gets, *no athlete "…"*, *coach only*, a number
  out of range) are said in plain words.
- **The live challenge**, or, when there is none, *Nothing is open. Start a challenge and it appears on Crew, under the feed.* with the panel's one primary button. A live one
  shows its name, its words, and *Counted in seconds · higher wins · opened 12 Nov*, then **Correct the words**, **Start a new one** and **Close the challenge**.
- **Set or correct** (`openFormHtml()`): the name (60 characters), how to do it and what counts (400), the unit shown after the number (16) and **Higher wins / Lower wins**
  (a time is lower). **Start the challenge** sends `coach_open_set` with no `p_id`; **Correct the words** sends the live challenge's `p_id` and keeps every result.
  **Starting a new one over an open one asks first** (it closes that one and takes its board off Crew; its results are kept under Past challenges). What is typed survives a
  Reload and a redraw of Proof (`_openDraft`); a form that points at a challenge that has since been closed or replaced is dropped.
- **Confirm a result** (`openResHtml()`, `openPickList()`): pick the athlete, the number, the day they did it (today by default, on your clock). **The picker offers every coached athlete
  the dashboard shows** (`inTotals()` and `tier: coached`: not a former athlete, not the demo, not your own identity) **who has a programme on the server** (`coach_open_result()` refuses anyone else:
  *no athlete "…"*), plus anyone `coach_open()`'s `crew` list names whatever their tier (so a result already recorded can be corrected), **under the dashboard's own name**, in two groups: *In the crew (on the board)* (with the name the crew sees beside it,
  *Ava Example · Ava E. on Crew*) and *Not in the crew (off the board)*. The one hint line says what a pick means: for someone not in the crew, *they are not in the crew, so this
  stays off the board and only they see it, in their app* (the athlete's own card reads the server's `mine`, so it is never worded as if nobody sees it). Picking an athlete who already has
  a result shows it and says *Confirming replaces it*. The form starts again after a save. **A free athlete is never offered**: Crew is a tab in the coached app only, so they could not join the crew, see the challenge or
  ever see their own result, and a number recorded for them would reach nobody with nothing on screen to say so.
- **The board, as the athletes see it.** Ranked by the number, higher or lower winning as set, **places worked out among crew members only** (ties share one), so they are the
  places on Crew. A result for someone who is **not in the crew** (`in_crew: false`: they said no or have not been asked, or left after you confirmed it) is never on the board: it is listed
  AFTER the board, with no place and a quiet *Not in the crew* mark, under the name the dashboard's roster knows (the server sends the athlete id as `who` for them). **Take off**
  asks first (a panel under the row: whose number goes, what stays) and calls `coach_open_remove(p_athlete)`; its Bell line goes with it.
- **Close the challenge** asks first (the board leaves Crew now; its results are kept) and calls `coach_open_close()`. **Past challenges**: the last five closed, newest first, a plain
  list (title, unit, opened to closed, how many results), read-only.
- **Not in `BACKUP_TABLES` yet, on purpose.** `crew_open` and `crew_open_results` are tables the backup MUST keep once stage85 is applied (months of results that exist nowhere else),
  but listing them now would make every backup say *could not read* until then. **Add both to `BACKUP_TABLES` and to `supabase/schema_snapshot.sql` in the stage85 go-live commit** (`scripts/test_restore_backup.py` fails when the two disagree), as stage81 did for
  `crew_consent`, and check `scripts/restore/restore_backup.py` knows how to restore them (it refuses a table it does not).
- **Tests:** `open-panel` in `scripts/headless/coach/run.js` (the stub answers the five stage85 functions only when the seed says `open: true`, which turns stage81 on too; every other
  scenario runs against a server without them).

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
