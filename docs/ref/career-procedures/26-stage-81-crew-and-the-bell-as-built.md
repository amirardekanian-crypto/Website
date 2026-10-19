## Stage 81: Crew and the Bell, as built (2026-10-19)

**APPLIED to the live project on 2026-10-19** (Amir: *"yes, go live with Crew and the Bell"*), as the migration `stage81_career_crew`.
Read back: the five tables with row-level security on, 21 functions, **anon can run none of them**, the eleven an athlete or the coach calls
are `authenticated`'s and the ten helpers the service role's only, the `crew_level_ring` trigger on `career_scores`, the hourly `crew-sweep`
job in `cron.job`, the one policy on `crew_consent`, and `coach_erase_person()` listing the five tables with exactly one `to_athlete`
statement. **All 21 function bodies read back md5-equal to this file.** `get_bell()` answered for an athlete (0 items: nobody had answered
yet). One fix a minute later, the migration `stage81_crew_clean_tab_fix`: `replace()` takes a LITERAL string, so `E'\\t'` was a backslash
and a `t`, not a tab, and a tab survived untouched; it is `chr(9)` now, checked on the live project (the Farsi joiner kept, an emoji whole,
a tab to a space, two line breaks at most, invisibles and control characters gone).
Supabase's own security advisors afterwards say exactly what this design means: the four short-lived tables have row-level security
on with NO policy (nobody reads or writes them directly; every door is a `security definer` function), as the two publish-key tables
already did; none of the 21 functions has a mutable search path; anon can run none of them; and the eleven an athlete or the coach
calls are listed as `authenticated`-executable `security definer` functions, which is what they are, each checking identity itself.

Round 5, step 5 (`CAREER_MODE.md` → *Round 5*: one feed, the Clubhouse, what rings). The app half is in
program.html (`PROGRAM-APP.md` → *Crew and the Bell*) and shows nothing until this stage answers; coach.html's panel (`COACH_DASHBOARD.md` → *The Bell*)
hides the same way. **Nothing here pays XP, mints an award or touches the scorer** (GAME-6); its one trigger only writes `crew_rings`.

`supabase/stage81_career_crew.sql` (safe to re-run; a guard refuses without stages 66 to 75):
- **Five tables.** `crew_consent` (each athlete's yes or no, a switch per kind, the crew name used off the board, Amir's under-13 tick, the opaque
  `crew_key` that names their lines, `first_yes_at`, `yes_since`): kept, in `BACKUP_TABLES`. `crew_posts` (up to 280 characters and/or a photo;
  `kind` post or session), `crew_photos` (the JPEG, at most 450 KB, a row deleted with its post), `crew_kudos` (giver `athlete_id`; a post, or a
  line as `to_athlete` and `line_day`), `crew_rings` (a level reached; stage82's Open result): all four **short-lived and left out of
  `BACKUP_TABLES` on purpose** (`SHORT_LIVED` in `scripts/restore/restore_backup.py`): a backup kept 12 weeks would break the 7-day promise.
  Every write is a function; only the coach can read `crew_consent` directly (the backup), nobody the rest.
- **Photos are rows, not Storage files.** Supabase Storage blocks a delete from SQL (`storage.protect_delete`), so the 7-day sweep and an erasure
  would each need an Edge Function and the erasure would stop being one transaction. A row goes in the same delete as its post.
- **`get_bell(id)`**: the athlete's own (the coach and the SQL editor anyone's). Sweeps first. Who is seen (`crew_members()`): a yes, not under 13,
  not former, not the demo; named by the board's name, else the crew name. The feed: Amir's post of the last 24 hours pinned, then posts and lines
  by time, posts of the last 7 days (80 at most). **A line is one athlete's day** (the UTC date the server learned of each part), each kind once:
  the newest level (`crew_rings`), the marks (`held_weeks`, `century`, `bests`, `comebacks` awards minted `live`), every achievement minted `live`
  (its catalogue name), the honours once frozen (never `near`), joining (the first yes), the bests as one part naming the lifts (never a weight),
  the longest run of held weeks (**a twin of `get_profile()`'s loop**: only a broken week ends a run; not shown when its own Hold Serve mark rang
  the same day), the latest cycle finished. A part rings only from the athlete's latest yes (`yes_since`), only while its `created_at` is in the
  last 7 days, and only for a kind they left on. A quiet back-pay (`silent`, `baseline`) never rings. Kudos: how many, up to three crew names
  (newest first, never the viewer) and whether the viewer gave it; a giver no longer in the crew is not counted. Last month's honours ride along
  from the 1st to the 14th, crew members only. No athlete id leaves: a line's key is `crew_key:YYYY-MM-DD`.
- **The athlete's writes** (`crew_who()`: signed in, never the demo): `crew_answer(yes|no, name)` (a no deletes their posts, photos, given kudos and
  rings at once; the row stays), `crew_kinds({kind: bool})` (only the eight kinds), `crew_post(body, photo base64, w, h, kind, session)` (a crew
  member only; `crew_clean()` strips control characters, bidi overrides and zero-width marks; the photo must start FF D8 FF; 3 photos and 10 posts a
  server day, behind an advisory lock; a session needs its photo), `crew_delete_post(id)` (the author's own), `crew_kudos(target, on)` (a crew
  member, never their own, only what the crew can see).
- **The coach's**: `coach_crew()` (every post with its author id, every answer), `coach_crew_post()` (as `coach_note_id()`, pinned for a day, no daily
  cap), `coach_crew_remove(id)`, `coach_crew_under13(id, bool)` (a row for someone never asked; on, their posts, kudos and rings go at once).
- **`crew_sweep()`**: a post older than 7 days (its photo and kudos with it), a line's kudos 7 days after its day, a ring after 8 days. Every read and
  post runs it, and **pg_cron runs it every hour** (`crew-sweep`, `7 * * * *`; the stage creates the extension where it exists: the live project
  yes, PGlite no), so the promise holds in a week nobody opens Crew.
- **The level ring**: an AFTER UPDATE OF score trigger on `career_scores` writes one `crew_rings` row when `career.level` went UP, for a yes only;
  an insert (a new or rebuilt cache row) never rings; `set_config('crew.quiet', 'on', true)` silences it for a quiet back-pay; anything that goes
  wrong is a warning, never a failed save.
- **`coach_erase_person()`** learns the five tables (the kudos they gave first, then the photos, posts, rings and the answer) and one statement
  after the loop deletes the kudos others gave to their lines (`to_athlete`, which the loop cannot see), counted as `crew_kudos (to them)`.
- **Stage 82's hook**: the Monthly Open writes its result as a `crew_rings` row of kind `open` (its `value` carries the words, `text`); get_bell()
  already reads it as an `open` part and the app already has the switch.

**Rehearsed** by `scripts/career/rehearse_crew.mjs` on PGlite: **265 of 265** (made-up athletes; the stage twice, the grants, the question and its
refusals, every post limit, what rings and what never does, kudos, photos, the coach's tools, the erasure, nothing in the scorer moved, the way back
twice and the stage again, the cost with 30 crew members: `get_bell()` 21 ms, 80 posts and 121 lines). It also runs against 68 one-line breaks of
the two files and catches 67 (the 68th cannot change an answer); `--stage` and `--rollback` point it at a changed copy.

**Three things it found, all fixed before any of this was applied:**
1. **The erase patch's text may not come from the file's own newlines.** The piece it adds to `coach_erase_person()` spans lines and is typed in
   BOTH files; a Windows checkout ends lines with CRLF, so a stage applied from one ending and a way back run from the other left
   `delete from public.crew_kudos` behind in a function whose table had just been dropped, and **every erasure after it would have failed**. Both
   files now build that text with `concat_ws(chr(10), …)`, so the ending of the file they are run from cannot matter. Section 13 of the rehearsal
   runs all three mixes.
2. **The pin is chosen before the limit**: `post_items` orders pinned first, then newest, so Amir's post cannot fall out of a day with 80 newer posts.
3. **`crew_clean()` keeps the zero-width non-joiner and joiner**: Persian spells words with U+200C (می‌رم) and an emoji holds its parts together
   with U+200D, so stripping them mangled Farsi and split emoji. Only U+200B, U+FEFF, the bidi overrides and isolates go; a tab becomes a space.

**Two things left as they are, on purpose:** anyone signed in can READ the Bell, a no and an under-13 included (the design page's *UNDER 13: sees
the Bell, never posts and never rings*; nothing of theirs is in it); and the server does not check a photo for EXIF data, because the phone's
re-encode drops it and SQL cannot read it — a crafted client could upload one, and Amir can remove any post.

**A dry run on the live data, rolled back (2026-10-19):** the tables, `get_bell()`, the trigger, pg_cron and the erase patch applied on the live
structure, with all 40 athletes with a programme made yes for the run: `get_bell()` answered in 0.36 s cold and 0.17 s warm, 52 lines and 12.5 KB,
no athlete id and no `"kg"` in it; a level raised by one rang once; the `crew-sweep` job was scheduled; the erase function took both patches. Read
back after: no crew table, no `get_bell()`, no pg_cron extension, the erase function untouched.

**To apply** (Amir's yes first): no backup is needed for the apply itself (it adds tables, functions and one trigger and changes no row; the one
existing object it touches, `coach_erase_person()`'s list, is put back exactly by the way back). Apply `stage81_career_crew.sql` (`apply_migration`);
read back the five tables with row-level security on, anon executes none of the functions, the helpers are the service role's only, the trigger,
the `crew-sweep` job in `cron.job`, the erase function's list and its one extra statement; `get_bell()` for one athlete as the service role. Then,
in ONE commit: `supabase/schema_snapshot.sql` remade (`scripts/restore/README.md`), `crew_consent` into coach.html's `BACKUP_TABLES`,
`scripts/test_restore_backup.py` (check 1d's count and 2h), `scripts/restore/rehearse.mjs` run. The way back: `scripts/career/rollback_stage81.sql`,
on his word only (it keeps the answers in `backup.crew_consent_<date>`).

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
