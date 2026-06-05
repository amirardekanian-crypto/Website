# Importing session reports into the coach dashboard

How athlete training logs get from Gmail into the coach dashboard, and how to
add new ones next time. (Plain-English runbook — hand this whole file, or just
the one-liner below, to Claude.)

## TL;DR — next time, say:
> "Import new session reports from Gmail into `session_history` — everything since **YYYY/MM/DD**. Follow `IMPORTING_SESSION_REPORTS.md`."

That's it. Claude reads the emails, parses them, and upserts the rows.

---

## How it works

- Athletes finish a workout and tap **send report** → a **Web3Forms** email lands
  in `amirardekanian@gmail.com`, from `notify+*@web3forms.com`, subject
  `Session Report · <Name> · Day N` (or `Session Report [Partial] · <Name> · Day N`).
- The coach dashboard (`coach.html`) does **not** read email. It reads the Supabase
  table **`public.session_history`**, and computes consistency / adherence / load /
  readiness from those rows.
- So importing = turning each report email into one `session_history` row.
- The email body has **no session date** — use the **email's date** as `completed_on`.

> Note: when an athlete uses the live app via their secure link, `program.html`
> writes `session_history` directly on Finish (the `save_session` RPC). Email import
> is the backstop for athletes who only email reports, or for backfilling history.

## The golden rule: no duplicate same-date data

`session_history`'s primary key is **`(athlete_id, day, completed_on)`**.

- Same athlete + same day number + same date = **one row, always**.
- If an athlete taps send 3 times, you get 3 identical emails → they collapse to a
  single row. **This is automatic** — *as long as the import UPSERTs* on the key:

```sql
... on conflict (athlete_id, day, completed_on) do update set ...
```

Never use a plain `INSERT` for imports. Always the `insert ... on conflict ... do update`
form above. (Two *different* days on the same date, or the same day on two different
dates, are correctly kept as separate rows.)

## Athlete name → id map (file rows under the right id)

| Name in email | athlete_id |
|---|---|
| Lemuel Cassidy | `lem_cass1` |
| Pooya Pasandideh | `pooya_pnd2` |
| Pegah Hemmati | `pegah_hmt2` |
| Mehraneh Zohourian | `mhrn_zhr2` |
| Mehrnaz Khadem | `Mhrnz_khdm1` |
| Dela Yazdani | `dela_yazdani` |
| Juan Galbete | `juan_glbt` |
| Ghazal Pakbaten | `ghazal_pakbaten` |

Stale/duplicate ids to **ignore**: `pooya_pasandideh`, `pooya_pnd1`, `mhrn_zhr1`.
For a new athlete, the id is whatever their secure link uses (`?client=<id>`), which
must match a `data/<id>.json` program file.

## Procedure

1. **Find the emails** (Gmail):
   `from:web3forms.com subject:"Session Report" after:YYYY/MM/DD`
   (Ignore `New Client Intake` emails — those are onboarding, not sessions.
   Trashed emails are skipped on purpose.)
2. **For each email**, read the `plaintextBody` and pull:
   - `day` ← the number in `Day  : Day N — <focus>`; `focus` ← the text after `—`.
   - `status` ← the `Status  :` line (`Complete`, or `Partial (...)`). If an old-template
     email has no `Status` line and the subject isn't `[Partial]`, treat it as `Complete`.
   - `session_rpe` ← integer before `/10` on `Session RPE  :`.
   - `duration_min` ← minutes on `Duration  :`.
   - `readiness` ← from `Readiness  : Composite X/5 · Sleep a · Energy b · Soreness c · Stress d · Overall e`
     → `{"composite":X,"sleep":a,"energy":b,"soreness":c,"stress":d,"overall":e}`;
     `{"skipped":true}` if skipped; `null` if absent.
   - `day_note` ← text after `Notes from athlete  :` (null if empty/`(none)`).
   - `summary` ← everything after `Full summary  :` (keep verbatim — it holds the exercise log).
   - `completed_on` ← the date part (YYYY-MM-DD) of the email's date; `updated_at` ← the full timestamp.
3. **Upsert** (one row per session), dollar-quoting the text so apostrophes/✓/newlines
   go in cleanly:

```sql
insert into public.session_history
  (athlete_id, athlete_name, day, completed_on, status, session_rpe, duration_min,
   readiness, day_note, focus, summary, coach_status, updated_at)
values
  ('<id>', '<Name>', <day>, '<YYYY-MM-DD>', '<status>', <rpe|NULL>, <dur|NULL>,
   '<json>'::jsonb /*or NULL*/, $note$<note>$note$ /*or NULL*/, '<focus>',
   $smry$<summary>$smry$, 'read', '<email_iso_timestamp>')
on conflict (athlete_id, day, completed_on) do update set
  athlete_name = excluded.athlete_name, status = excluded.status,
  session_rpe = excluded.session_rpe, duration_min = excluded.duration_min,
  readiness = excluded.readiness, day_note = excluded.day_note,
  focus = excluded.focus, summary = excluded.summary,
  coach_status = excluded.coach_status, updated_at = excluded.updated_at;
```
4. **Verify**: `select count(*) from session_history;` and spot-check the new rows.

## Conventions used (so imports stay consistent)

- **Dates are the email date in UTC.** A handful of late-evening sessions could be off
  by one local day — negligible for weekly consistency.
- **`coach_status` = `read`** on import, so backfilled notes don't flood the "to reply"
  queue. (Live app sets `new`.) Change a row to `new` if you want it back in the queue.
- **Older emails (before ~13 May 2026)** used a template without Duration/Readiness, so
  those rows have no load/readiness — they still count fully toward adherence.

## Known data issues (tracked separately)

- Program files misnamed vs their id, so the plan won't render in coach view on a
  case-sensitive host: `data/Ghzl_pak.json` should be `data/ghazal_pakbaten.json`;
  `data/mhrnz_khdm1.json` should be `data/Mhrnz_khdm1.json`. Rename to match the id.

_Last full backfill: 5 Jun 2026 — 85 sessions, 8 athletes, 21 Apr–5 Jun._
