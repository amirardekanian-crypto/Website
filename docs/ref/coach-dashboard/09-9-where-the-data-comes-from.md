## 9. Where the data comes from

| Source | Feeds |
|---|---|
| `session_history` | Sessions, ACWR, readiness, adherence, notes to read. **Read light** (2026-10-11): at boot every session's numbers (everything but `summary` and `log`, 78% of the bytes) and the text of the unread sessions that contain "Note:" (an exercise-only note is inside the text and is what puts someone in Needs you); an athlete's `summary` and `log` are read when their file opens (`ensureSessionsFull()`), and again only after the list was reloaded. If that read fails the work tab says *Their session logs did not load* with **↻ Try again**, and shows no verdicts |
| `athlete_progress` | Last active, live snapshot, and the habit log behind every presence dot |
| `programs` | **The roster** — every athlete, their name, tier and prescribed plan |
| `athlete_identities` | Who has a username/password login, and the passwords still to send |
| ~~`athlete_keys`~~ | ⚠️ Empty since the secret links were retired — reads nothing useful |
| ~~`messages`~~ | ⚠️ Nothing reads it since the in-app chat was removed (2026-09-26). Kept, not dropped |
| `hab_notes` | The wall, the coach line, moderation |
| `athlete_status` (read as a table, paged: stage63) | Paused and former marks: the roster, Needs you, the totals |
| `hab_contacts` via `contact_list()` | The funnel (signups only: not a `source 'coach'` record), contact buttons, the header's WhatsApp button, days logged |
| `leaderboard_optin` | Who's on the board, their display name and worn title |
| `hab_titles` | Titles-minted feed |
| `coach_crew()`, `crew_photo()` (stage81) | Proof → The Bell and Who said yes: the last 7 days' posts, every athlete's answer and under-13 tick; a photo only when asked for. Nothing is drawn while the server has no `coach_crew()` |
| `coach_open()` (stage85) | Proof → The Monthly Open: the live challenge, every confirmed result (crew member or not), the crew to pick from, the last five closed challenges. Nothing is drawn while the server has no `coach_open()` |
| `xp_rules` | The quest pool and the live runs |
| `seasons` | Which season, and what day of it |
| `career_rules` (the newest row's `rules->switch`, read quietly by `loadLevels()`) | Whether Career Mode's XP switch is on (`S.careerXp`): the Proof level's caption reads *career level (server)* instead of *season level (server)* |
| `call_logs` | Weekly check-ins (loaded per athlete, on open) |
| `program_versions` | Version history: the programme as it was before each save (the `programs` trigger keeps the last 20 and every save since the previous cycle began, at most 150) |
| `coaching_logs` | The coach-only log on the File tab (loaded on open) |
| `coaching_log_versions` | Every earlier text of a coaching log, kept by a trigger (stage47); only the backup reads it |
| `library`, `library_categories` | The Library tab |
| `exercises`, `exercise_coach`, `qualities` | The Exercises tab (the Spine) |
| `spine_versions` | An entry's History: every row of those three as it was before a change, kept by a trigger (stage49); the weekly backup reads it |
| `hab_intake` (read as a table, paged: stage61) | Leads → Applications, the athlete's *Came from* line and the erase panel's forms |
| `affiliates` | Leads → Referral codes |
| `assess_accounts`, `tps_accounts` | Buyers (the Testing app and the Course; read when Buyers is opened, both, so each sub-tab can show its count) |
| `buyer_notes` | The private note beside each buyer in Buyers (stage53); coach-only |
| `erasure_log` | Receipts of full erasures (stage54); only the backup reads it |

`data/<id>.json` is no longer read at all (2026-10-10): it has not been served since 2026-09-07, and
the dashboard used to fall back to it for any id without a programme row. Growing tables are read
in pages (`selectAll()`), so none is cut off at the API's 1,000-row limit.

The **prescribed-vs-done** comparison joins the plan in `programs` with what happened, parsed from
the plain-text `summary` that `program.html` wrote into `session_history` (with the names taken
from the structured `log` when it lines up). Both readers live in `coach.html` (`rxOf()` from
`assets/js/chips.js`, `parseSessionLog()`) and both mirror code in `program.html` — change the
grammar there and they have to follow. `node scripts/test_coach_compare.js` runs 123 assertions
over real logs and the email import, and catches it if they don't. The write paths (saves, deletes, logins, backups) are
covered by the real-mode harness in `scripts/headless/coach/`.

**Logic that exists in both apps is guarded** (`scripts/check_twins.js`, pre-commit guard 15, 2026-10-10).
It cuts each twin out of both files and runs the same vectors through both: the exercise-name
tiers (`exNameVariants` / `exNameVariantsC`; the programme checker's `norm_name()` and SQL are held to the same cases, `scripts/name_cases.json`), a renamed lift (`ceilAliasMap` / `ceilAliasMapC`), the
Spine lookup (`spineFor` / `spineForC`), the RPE target a set is judged against, from the week note on every day and a lower day (`rpeTargetOn` / `dayTargetC`), the week a day
falls in and its note (`cycleWeekInfo`, `weekNoteNow` / `cycleWeekOnC`, `weekNoteOnC`: about 40,000 checks, run with the athlete's clock in eight time zones), what
the Quality check counts (`qmSets`, `isPrepBlockTitle` / `qmSetsC`, `QM_PREP`), and the check-in line's
writer and reader (`readinessPlanLine` / `parseCheckinPlan`). It also fails a change to `assets/js/chips.js`
that keeps coach.html's hand-typed `?v=` (the service worker serves `/assets/` cache-first): bump the
token, then `node scripts/check_twins.js --stamp`. `scripts/test_check_twins.js` breaks a copy on purpose
to prove each kind of drift is caught. Also guarded: whether a started session is over (`sessionIsStale` / `sessionIsStaleC`), which values of a lift's `test`
are a retest flag (`exTestSpec` / `exTestSpecC`), the check-in score and the athlete's usual (`readinessS`, `readinessBase` / `readinessSC`, `usualC`)
and one day card's quality chips with the 70% gate and the 12% cut, in the phone's view and the coach's (`qualityMix` / `qualityLensC`, `qualityDayC`). Not covered, on purpose: the dashboard resolving cards against drafts too
(TWIN-1), a known difference listed in the script's header. A new copy of an app rule in coach.html goes into the script the same day.

Some coach writes go through RPCs that check the coach themselves (`set_coach_note`, `hide_note`,
`set_quests`, `end_quests` (stage55), `clear_quests`, `forget_contact`, `save_session`, `coach_season_levels`, and since stage48
`coach_delete_training_history` and `coach_save_spine`, since stage54 `coach_erase_person`, since stage81 `coach_crew_post`, `coach_crew_remove` and `coach_crew_under13`, and since stage85 `coach_open_set`, `coach_open_close`, `coach_open_result` and `coach_open_remove`, each one transaction); the rest are
direct table writes that only the coach's RLS policies let through. Every one of them asks for its
rows back, so a write RLS silently refused (a lapsed sign-in) says so instead of reporting success.

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
