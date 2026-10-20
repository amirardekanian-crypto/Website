## Stage 86: the crew on a phone, as built (2026-10-19)

**APPLIED to the live project 2026-10-20** on Amir's word, *"Yes go on"* (migration `stage86_crew_push`). Read back whole: both tables with
row-level security on and **no policy at all** (nobody reads or writes them directly; every door is a `security definer` function), `anon` and
`authenticated` able to select neither and to execute none of the fourteen functions, none of which has a mutable search path; the seven triggers on
their seven tables; `crew-push` (`*/15 * * * *`) and `crew-push-sweep` (`38 4 * * *`) in `cron.job`, with stage84's `push-send` and `push-sweep` and
stage81's `crew-sweep` untouched; and `coach_erase_person()`'s list ending `'push_subs', 'crew_push_q', 'crew_push_seen']`. `crew_push_due()`
answered 0 rows and wrote no watermark. **Both jobs were then fired by hand and each came back 200 through the gateway**
(`net._http_response`), which is the one check that covers the shared secret and the `?only=crew` arm at the same time. The app half had gone live
the evening before (`5fa0719`, worker `aap-v200`): the Reminders panel's crew line, and a crew notification landing on the Bell rather than on Home.

**Nothing rings yet, and that is not a fault.** `push_subs` is empty — no athlete has tapped the permission — so there is nobody to send to, and
`crew_push_add()` returns before writing a row, which is why the stage costs nothing the day it goes on. The first real proof of it is the first
subscribed phone.

**⚠️ THE ONE THING THAT WENT WRONG, AND IS NOW A RULE.** The first `push-send` deploy did not say `verify_jwt: false` — the parameter defaults to
true — so the platform's own check went back on, and pg_net's call would have been refused with a 401 at the gateway before a line of the function
ran: **the reminders and the crew both silent, with nothing in the database looking wrong.** The function authenticates itself with a shared secret
in `x-push-key`, exactly so that check can be off. Caught within the minute by firing the jobs and reading their responses, fixed by redeploying
(version 3), and written into [`docs/rules/push.md`](../../rules/push.md) so the next deploy cannot repeat it.

**Why it exists.** Amir: *"one of the notification rules in my app was that everytime anything happens in the crew, any lines, any new image, any
likes, any new post, everyone should receive a notification"* — then *"why didnt i?"* Because it had never been built. stage84 shipped the habit
and workout reminders and said so in its own header: the Bell and "cycle N is ready" are event-driven, not hourly, so they want a small queue
rather than that file's clock, and they are the next stage. `push_subs.kinds` already carried the `crew` switch, so the panel had been offering
*"The crew — When Amir posts, or someone cheers you"* with nothing behind it. (It is also why he would have had nothing either way: `push_subs`
is empty. **Nobody has ever tapped the notification permission**, so not one reminder of any kind has gone out.)

**The scope is his, asked directly.** Offered the narrow reading (Amir's posts and cheers for you) or the literal one, he said: *"Everything in
the crew should ring for everyone: every post, photo, like and line. Build it that way."* So nothing is dropped and nothing is ranked. The one
thing the stage adds of its own is **collecting**: a tick every fifteen minutes gathers what an athlete has not been told about and sends it as
ONE notification ("The crew has been busy · 6 new things to see"); a single thing on its own is named ("Sara posted"). Every event still rings, it
arrives in company, and the tag is always `crew` so a second one REPLACES the first on the lock screen instead of stacking under it. Shorten the
window and the crew gets noisier, lengthen it and the news gets staler; nothing is lost either way.

`supabase/stage86_crew_push.sql` (safe to re-run; a guard refuses without stage81 and stage84):
- **Two tables, both short-lived, both OUT of `BACKUP_TABLES`** (and in `SHORT_LIVED` in `scripts/restore/restore_backup.py`, done in the same
  commit). `crew_push_q`: one row per thing that happened, swept after 7 days — the Bell's own promise, so a 12-week backup of it would break that
  promise exactly as a backup of `crew_posts` would. `crew_push_seen`: one row per athlete, how far they have been told; it rebuilds itself by not
  sending twice. The person column is called `athlete_id` **on purpose**, because `coach_erase_person()` empties every public table with an
  `athlete_id` column and then checks that none was forgotten; a cleverer name would have quietly fallen out of an erasure. A cheer's RECIPIENT is
  held as their `crew_key` and never as an id, which is why — unlike stage81's `crew_kudos` patch — the erasure needs no second statement.
- **A LINE IS NOT A ROW.** `get_bell()` derives a line when it is read, from `career_facts`, `career_awards`, `career_honours` and `crew_rings`, so
  there is nothing to hang a trigger on. The **seven triggers** sit on those sources instead (`crew_posts`, `crew_kudos`, `crew_rings`,
  `career_facts`, `career_awards`, `career_honours`, `crew_consent`) and **carry get_bell()'s own filters in their `WHEN` clauses** — `void_at` is
  null, the day within a fortnight, a best must name its lift, `how = 'live'`, an honour is not `near`, one of the four marks — so what rings and
  what the Bell shows cannot drift apart, and a session save is not even charged for the facts a line would never show.
- **No trigger may ever fail the save it hangs off.** A session, an award and a post all matter more than a notification: each of the seven
  swallows its own trouble as a warning, exactly as stage81's `crew_level_ring()` does. The rehearsal proves it by making the queue refuse every
  write and then posting anyway.
- **One writer, `crew_push_add()`**, so the rules about what never rings are in one place: a quiet back-pay (`crew.quiet = 'on'`, GAME-6, D20)
  queues nothing; nobody subscribed queues nothing, which is what keeps the stage free until the first phone asks; and a "no" or an under-13 queues
  nothing. The cheap half of the crew test is done here on the primary key, the full one (`crew_members()`: a former athlete, the demo, the board)
  at sending time — so a "no" tomorrow silences what was queued today, exactly as it takes it off the Bell.
- **The decision is in SQL**, as stage84 has it. `crew_push_fold()` holds it and is its own function so that `crew_push_due()` can both write the
  watermark and return the rows without the decision being written out twice (it reads `upto`, never `pending`, so asking again gives the same
  answer). `crew_push_due()` answers in exactly `push_due()`'s columns, with `kind` and `tag` always `crew` and a **one-hour TTL** — a reminder is
  worth two, a crew notification less, and the Bell has held the news for seven days anyway.
- **Quiet hours are NOT a CHECK on a column here** (stage84's are, deliberately): the hour is the athlete's own clock at the moment of sending, not
  something stored. So the window — 08:00 to 21:59 local — is written once, in `crew_push_due()`, and the rehearsal checks the night from both
  sides of the world. What happens overnight waits in the queue and arrives at eight.
- **The watermark is two columns**, `pending` then `upto`, because of the gap between asking and sending: `crew_push_due()` writes `pending = now()`
  as it hands the rows over and `crew_push_done()` moves it to `upto` once a phone has taken them, so a post that lands in that gap is kept for the
  next tick instead of being stepped over. A sender that dies in between leaves `pending` behind, `upto` unmoved, and the next tick sends the same
  news: **a notification twice, never a notification lost.** A send that failed on every phone leaves the watermark alone and counts against the
  handset, so a dead endpoint still runs out of patience at five.
- **A notification carries a NAME and a KIND, never content.** "Sara posted", never what Sara wrote; no weight, no reps, no RPE, no lift's load
  (stage84's rule — a lock screen is read by whoever picks the phone up). `crew_push_words()` holds every line, here and not in the sender, so
  there is one copy and the rehearsal can read them. **⚠️ The Farsi is a DRAFT for Amir to read**, the same rule as stage84's lines, the privacy
  pages and the share cards. The one line that reads differently for different people is a cheer: "Sara cheered you" for the person cheered,
  "Sara gave a cheer" for everybody else, decided by comparing the stored `crew_key` with the reader's own.
- **`crew_push_fire()` and pg_cron every fifteen minutes** (`crew-push`, `*/15 * * * *`), reading the same one-row `push_config` as `push_fire()` so
  the two can never disagree about the address or the shared secret, and calling the same Edge Function with `?only=crew` — which is why **the
  hourly reminder run is left exactly as stage84 documented it**, retries and all. A daily `crew-push-sweep` keeps the 7 days in a week nobody
  sends anything.
- **The sender stays dumb.** `push-send` gained two `kind === 'crew'` tests and nothing else: the crew's answer comes back from
  `crew_push_done()`, which moves a watermark rather than writing a day to a ledger, and a dry run asks with `p_mark false` so saying what WOULD go
  never swallows an event. Before the stage is applied the function does not exist, which is read and ignored rather than failing the reminders.
- **An under-13 reads the Bell and is never sent it** (the design page's *UNDER 13: sees the Bell, never posts and never rings*), and neither is a
  no, a former athlete or the demo: none of them is a `crew_member()`, and nothing of theirs is in the Bell either. A child's phone is the last
  place to push a feed.
- **Nothing here pays XP, mints an award or touches the scorer** (GAME-6); the rehearsal checks that not one XP moved.

**Rehearsed** by `scripts/push/rehearse_crew_push.mjs` on PGlite: **103 of 103** (made-up `zz_` athletes; the live snapshot, the stage twice, the
grants, all seven triggers and everything that must never queue, the night from both sides, the switches, a no, the folding in both languages, the
watermark in all four states, the sweep, the erasure, that nothing in the scorer moved, the way back twice, and the CRLF trap in all three mixes).
Run against one-line breaks of the stage it catches **5 of 6**; the sixth is the order the folded events are named in, which changes no answer today
because a folded notification names nobody.

**Two things the rehearsal found, both fixed before anything was committed:**
1. **`crew_push_due()` returns a column called `athlete_id`**, so inside it a bare `athlete_id` was both an output parameter and a column of
   `crew_push_seen`, and the insert of the watermark was refused as ambiguous. `#variable_conflict use_column` is the fix; the names have to stay as
   they are, because they are the shape `push_due()` already answers in and the sender reads. (An error on every call, not a wrong answer, so it
   could never have shipped quietly — but it would have shipped a sender that did nothing.)
2. **A rehearsal that judges made-up instants must SET them.** PGlite's `now()` is the real clock while the instant the decision is asked about is
   weeks away, so a queue row left to its default looked seven days old and was filtered out — the whole section would have passed with nothing in
   it. Every queue row's `created_at` is written explicitly now, and the retry check stamps its event *after* the watermark it is meant to be newer
   than.

**⚠️ ORDER, if both ever come off.** `scripts/push/rollback_stage86.sql` must be run **before** `scripts/push/rollback_stage84.sql`. stage84's way
back looks for the end of `coach_erase_person()`'s table list as stage84 left it, and this stage puts two more names after it; undo them the other
way round and that patch finds nothing, leaving stage84's two tables named in a list of dropped tables — and every later erasure fails. Both files
say so.

**What the restore path needed, found by its own rehearsal rather than by remembering:** the snapshot remade (65 tables),
`scripts/test_restore_backup.py` check 1d 63 → 65, and two things in `scripts/restore/rehearse.mjs` that the stage had not registered with it — its
own short-lived list (so `BACKUP_TABLES` is allowed not to hold the two new tables) and the number of identity counters a restore must advance
(8 → 9, `crew_push_q.id`). All in the same commit; that rehearsal is 49 of 49.

**Still the same fault, left as it is and flagged for Amir:** the Reminders panel's *"A new cycle — When Amir publishes your next one"* has no
sender either. It is the exact thing he found in `crew`, and it is written down in [`docs/rules/push.md`](../../rules/push.md) rather than quietly
fixed, because whether a cycle should buzz a phone at all is his call.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
