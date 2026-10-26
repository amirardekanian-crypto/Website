## Stage 101: the month's honours wait for Amir (2026-10-25, NOT APPLIED)

Amir, on the honours: *"im gonna choose other honours at the end of the month, there should be reminder in coach.html for me tho. to pick most sessions most
improved an full month or my pick"*, then *"go with your picks"* on the board ("The reminder in coach.html", https://claude.ai/artifact/9JYRa93PVAYZSH4pRw2rhs):
(a) the app **suggests** the winner of Most sessions and Most improved, and the athletes who earned Full Month, from the numbers, and Amir **confirms** each with
one tap or **changes** it; his Pick he chooses with his reason (stage100); (b) Full Month goes to **every** athlete who earned it; (c) **nothing reaches an athlete
until he confirms that honour.** Files: `supabase/stage101_honours_confirmed.sql`, `scripts/career/rollback_stage101.sql`, `scripts/career/rehearse_honours_confirmed.mjs`,
and the page (coach.html → Today → Courtside, `COACH_DASHBOARD.md` → *The month's honours wait for Amir*). No XP moves (GAME-6), no table is added.

**How an honour worked before.** `career_honours_live(month)` works the month out from the facts (stage75). The page freezes the month on the 8th (and
`coach_honours_sent` / `coach_honours_pick` freeze it first): `coach_honours_freeze()` writes the winners as `career_honours` rows. Every athlete-facing
reader showed a row the moment it existed, and `crew_push_honour` rang the crew on the insert. So the freeze on the 8th **was** the publication.

**What changes.**
- `career_honours.confirmed_at` (null = a suggestion, seen by the coach alone) and `career_honour_months.confirmed` (jsonb `{"sessions": when, "improved": when,
  "full_month": when}`). **Everything that exists today is back-filled as confirmed** (only on the first run, so a re-run never confirms a suggestion).
  The Pick is confirmed by picking (`coach_honours_pick` writes `confirmed_at`), and `career_honour_months.pick` (`picked` or `nobody`) is the Pick's decision.
- `coach_honour_confirm(month, honour, athlete_ids[], not_clients[])`, coach only: `sessions`, `improved` or `full_month`. Freezes the month if nobody has,
  works each chosen athlete's figure out again (`career_honour_figure()`: the paid plan sessions, the best main-lift win, the training weeks of that month;
  an athlete with none is refused), replaces that honour's rows with the chosen athletes, each confirmed now, and sets the month's confirmation. An empty list
  is "nobody this month". A confirmed honour takes the same winners again (a double tap) and refuses a different list: fix a typo in the SQL editor.
- **Readers that now filter on `confirmed_at is not null`:** `get_my_moments()` (the athlete's own honours), `crew_page()` (the Player Page), `get_bell()`
  (the honour line, dated by `confirmed_at` now, the month's band for the 1st to the 14th, the Pick card). `get_bell_if_new()` calls `get_bell()`.
- **Push:** `crew_push_honour` fires on an insert that is already confirmed; new `crew_push_honour_ok` fires when `confirmed_at` goes from null to a time. A
  suggestion rings nobody.
- `coach_honours()` answers `confirmed`, `ended` and each row's `confirmed_at`, and the live work whenever an honour is still unconfirmed. It and
  `coach_honours_freeze()` now also work on the month's **last day** (`career_honours_open()`), so the card can say "so far". The month-end freeze by the
  page on the 8th stays and now saves suggestions only.
- Textual patches, found exactly once or the stage refuses (stage99's pattern): 13 lines in six functions. A server before this stage sends no
  `confirmed`, and the page then shows no card and behaves as it did.

**Not done on purpose.** A suggestion saved by the freeze is a record, not the source: the card reads the live numbers while an honour is unconfirmed, so a
late-synced session before the tap still counts. A confirmed list is not edited from the page (a mistake is fixed in the SQL editor, like the Pick).

**To apply.** Dry-run first, inside a transaction that ends in `raise exception`, and read what it would do: `select month, honour, count(*) from career_honours
group by 1, 2` is all back-filled confirmed afterwards, so the check is that every row has `confirmed_at` and `career_honour_months.confirmed` has three keys.
Then apply the file, run `node scripts/headless/coach/run.js honours` and make the snapshot again (`scripts/restore/README.md`). The way back is
`scripts/career/rollback_stage101.sql` (it makes every row visible to the athletes again, suggestions included: delete the unconfirmed ones first if that is not wanted).

**Rehearsal.** `PGLITE=<folder>/node_modules/@electric-sql/pglite node scripts/career/rehearse_honours_confirmed.mjs`: 55 checks. The structure before the
stage, a month frozen the old way (stays visible after, every reader), the freeze saving suggestions nobody sees and nothing queued, Confirm, Change, Full Month
as a list, the refusals, the Pick and its reason, who can call what, the last day, and the way back (the six functions return word for word).
The two numbers functions are stood in for by a small table, because how a winner is worked out is stage75's (`rehearse_courtside.mjs`).
