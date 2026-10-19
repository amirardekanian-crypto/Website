## Stage 85: the Monthly Open, as built (2026-10-19)

**APPLIED to the live project 2026-10-19** on Amir's word, *"yes, apply stage85 and switch the Monthly Open on"* (migration `stage85_crew_open`),
read back whole: row-level security on both tables with one coach-read policy each, nothing for anon, `get_bell()` patched once and answering
`open: null` until a challenge is set, `coach_erase_person()` holding `crew_open_results`. The snapshot was remade and both tables went into
`BACKUP_TABLES` and `scripts/restore/seed_made_up.sql` in the same commit (restore rehearsal 49 of 49).
**⚠️ It was built as stage84 and renumbered:** the reminders work took 84 and applied it while this was being written. Check `supabase/stage8*.sql`
before picking a stage number while other sessions are running.

The last build step of plan A (`CAREER_MODE.md` → Round 5, L9 and the Crew and Open bullets). Amir decided its shape with *"for crew and the open go
with your picks"* and changed L9 himself the same day, so nothing here waited on a new question.

- **What it is:** one challenge at a time, any kind he designs, open in every week (the back-off week included). A result counts only when **he**
  confirms it from the clip on WhatsApp; nothing of the clip is stored and **the app has no write at all**. The board is ranked by the result,
  `better` (high or low) saying which way wins.
- **Two tables** (`supabase/stage85_crew_open.sql`): `crew_open` (title, how, unit, better, opened_on, closed_at — it names nobody) and
  `crew_open_results` (open, athlete, value, day; one row per athlete per challenge, typing a better one replaces it). Coach-readable so the backup is
  complete, nobody writing directly. **Both are IN `BACKUP_TABLES`**, unlike Crew's posts: a result is a record worth months, a handful of rows, and
  the one thing here that could not be rebuilt from anything else. `crew_open_results` is in `coach_erase_person()`'s list and the schema snapshot.
- **The athlete's read is inside `get_bell()`**, one new key `open` from `crew_open_now(viewer)`, patched in place (stage76's idiom) so a 140-line
  read is never copied. Crew still costs ONE call on a slow connection, and `get_bell_if_new()`'s etag covers the Open too, so a changed board reaches
  a phone that is holding the old feed. ⚠️ **The patch's anchor is the last key alone** (`, 'at', now());`), because stage82 already added `emoji`
  between `days` and `at`: a stage that adds another key must do the same.
- **Amir's five:** `coach_open()` (his panel), `coach_open_set()` (no id starts a new one and closes the old; an id corrects the words and keeps the
  results), `coach_open_close()`, `coach_open_result()` and `coach_open_remove()`. Each asks `is_coach()` itself.
- **It rings the Bell once** per athlete per challenge: a `crew_rings` row of kind `open` whose `value.text` is the words the app already draws
  (stage81 left that hook), *"posted 95 seconds in Wall Sit"*. A better result keeps the first line's day and updates its words. It never rings for
  someone who has not joined, who turned the `open` kind off, or whom Amir ticked under 13 (GAME-9) — though the last of those still counts on the
  board, because the switch is about the Bell, not the result.
- **Two calls that were Claude's**, both as decided: **(1) the Open pays no XP** (GAME-6 is the nearest rule, and paying would mean a new rulebook
  version under D20; nothing here touches the scorer, no fact and no award); **(2) a result outlives the feed** (a post dies at 7 days, a result does
  not), which is why the two tables are backed up and only the Bell *line* fades.
- **Who is on the board:** crew members who said yes. A result Amir records for someone who never joined stays with him, marked in his panel, and is
  shown to nobody (GAME-9).
- **Rehearsed** by `scripts/career/rehearse_crew.mjs` section 16 on PGlite (**376 of 376** with the rest of Crew): the stage twice, the grants, every
  refusal, the board and its order both ways, the Bell's words (a whole number has no trailing point), who is left off, closing and starting another,
  that the scorer never moved, the erasure (dry run then real), the three fixes above, and the way back then the stage again. Both in-place patches were counted against the
  LIVE definitions first (each anchor found exactly once).
- **Amir's panel** is coach.html → Proof, under *Who said yes* and above the board (`COACH_DASHBOARD.md`): the live challenge or an empty state, the
  form to set or correct it, a picker to record a result, the board as the athletes see it, the results that are not in the crew marked, and the
  last five closed challenges. Starting a new challenge, taking a result off and closing all ask first (`dangerAsk()`), because each takes something
  off Crew. The panel hides itself only when `coach_open()` is missing or answers null; any other failure shows the reason and Try again, so a
  network blip never makes it vanish. Its scenario is `open-panel` in `scripts/headless/coach/run.js`.
- **Four things the panel's own review turned up, three fixed in the stage before it was ever applied:** `coach_open_set(p_id)` now takes only the
  LIVE challenge (`and closed_at is null`, else *no such challenge is open*), so a tab left open cannot quietly correct a closed one;
  `coach_open_result()` refuses an id with no `programs` row; and the ring reads `crew_members()` rather than `crew_consent`, so a former athlete,
  the demo or Amir's own posting id leaves no ring behind even with an old `yes`. The fourth was the panel's own: its picker offers the whole
  roster, not only the crew, because a result for someone who has not joined is allowed (it stays off the board, and that athlete still sees it in
  their own app through `mine`).
- **The app**: `PROGRAM-APP.md` → *The Monthly Open, on Crew*; `scripts/headless/crew.js` covers it. The card is simply not drawn until the stage is
  applied, so the app side shipped first and safely.
- **Applied** in that order (the migration; then `BACKUP_TABLES`, the snapshot, the restore seed and the table count in
  `scripts/test_restore_backup.py` check 1d, all in the same commit). What is left is Amir's own: **set the first challenge** in coach.html →
  Proof → The Monthly Open. Until he does, `get_bell()` answers `open: null` and no card is drawn.
- **The way back**: `scripts/career/rollback_stage85.sql` — it undoes both patches, drops the five and the read, and drops the two tables LAST,
  which is the one step that loses what Amir confirmed.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
