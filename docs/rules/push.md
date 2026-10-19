# Rules — reminders on a phone

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

## Reminders on a phone (stage84, LIVE 2026-10-19)

Amir: *"im just talking about notifications we can send on peoples phone, when they have installed the
app on their phone"*, then *"this is supposed to be a reminder, about their habits / and another
reminder about their workout"*, then *"the push shoould be automatically on, unless they want to turn
off in their app settings"*. Two reminders, both opt-out once the phone allows them.

- **⚠️ ONE PERMISSION PER WEBSITE, AND ONLY ONE CHANCE.** amirardekani.com has a single notification
  permission shared by `program.html`, `habits.html` and `/pushtest/`. A **"Don't allow" is permanent**
  until the athlete digs into browser settings, and it takes BOTH apps with it. Nothing may ever fire
  the browser's box without a line of context first; that is why "automatically on" is built as *no
  question about whether they want reminders*, one line, their tap, then every kind on.
- **The phone's box cannot be skipped by anyone.** Apple and Google both require the athlete's own tap.
  No app of any kind can turn notifications on for someone, and no amount of design changes that.
- **iPhone needs iOS 16.4+ AND the app on the Home Screen.** In Safari itself `AAPush.state()` is
  `needs-install` and the app says so instead of showing a button that cannot work.
- **`assets/js/push.js` is ONE copy, loaded by both apps**, because the two apps are one website with
  one service worker and one permission between them. It never runs in the embedded Proof strip.
- **The decision lives in SQL, not the sender**: `public.push_due()` says who is due, which kind, in
  which language and with what words; `push-send` only carries it. That is what the rehearsal can run.
- **Quiet hours are a CHECK on the column** (`hour between 8 and 22`), not a rule in code: no settings
  bug can wake anybody at three in the morning.
- **A kind nobody switched is ON**, the same rule `crew_consent` uses, so a kind added later is on for
  everyone who already said yes. `kinds` carries `crew` (stage86, below) and `cycle` (no sender yet).
- **⚠️ A switch in the Reminders panel must have a sender.** `cycle` is the one left: the panel offers
  "A new cycle — When Amir publishes your next one" and nothing sends it. That is the exact fault
  Amir found in `crew` on 2026-10-19 ("why didn't I?"), and it is still open for `cycle`.
- **⚠️ Every send needs a short TTL.** Firebase keeps an undelivered message for **four weeks** by
  default, so a 20:00 reminder would otherwise arrive at three in the morning a week later. `push_due()`
  returns 7200 on every row and the sender must pass it.
- **A reminder never carries** a weight, reps, an RPE, a check-in answer, pain, body weight or which
  habits were missed: a lock screen is read by whoever picks the phone up.
- **The keys live in `public.push_config`**, not in Edge Function secrets, so the hourly job and the
  sender cannot disagree. That table is deliberately **out of** `BACKUP_TABLES` (a backup file holding
  the VAPID private key is worse than losing it; losing it is recoverable, because each app
  re-subscribes silently once the permission already stands). `push_subs` IS backed up, for the
  opposite reason: a restore without it costs every athlete that one-shot permission.
  ⚠️ `push_config.vapid_public` must equal `AAPush.VAPID_PUBLIC` in `assets/js/push.js`, or **every
  push is refused 403 and nothing else looks wrong** (`scripts/headless/reminders.js` checks it).
- Guards: `scripts/push/rehearse_push.mjs` (78, PGlite, both directions and the CRLF trap),
  `scripts/push/test_webpush.mjs` (26, the crypto against `http_ece`, a different implementation),
  `scripts/headless/reminders.js` (24). The way back is `scripts/push/rollback_stage84.sql`, on Amir's
  word only. `/pushtest/` is the throwaway page that answered "does it reach Iran?" — delete it, and
  the `/pushtest/` line in `sw.js`, once that question is closed.

## The crew on a phone (stage86, written 2026-10-19, NOT APPLIED — waits on Amir's word)

Amir: *"one of the notification rules in my app was that everytime anything happens in the crew, any
lines, any new image, any likes, any new post, everyone should receive a notification"*, then
*"Everything in the crew should ring for everyone: every post, photo, like and line. Build it that
way."* So nothing is dropped and nothing is ranked. The full narration is the header of
`supabase/stage86_crew_push.sql`.

- **Everything rings, COLLECTED.** A tick every 15 minutes gathers what an athlete has not been told
  about and sends it as ONE notification ("The crew has been busy · 6 new things to see"). One thing
  on its own is named ("Sara posted"). Every event still rings; it arrives in company. **Shorten the
  window and the crew gets noisier, lengthen it and the news gets staler — nothing is lost either way.**
- **The tag is always `crew`**, so a second crew notification REPLACES the first on the lock screen
  instead of stacking. That is what makes "everything rings" liveable on a phone.
- **A notification carries a NAME and a KIND, never content.** "Sara posted", never what Sara wrote;
  no weight, no number, no lift's load. Same reason as the reminders: a lock screen is read by
  whoever picks the phone up.
- **A LINE IS NOT A ROW.** `get_bell()` derives a line when it is read, so there is nothing to hang a
  trigger on. The seven triggers sit on the SOURCES instead (`crew_posts`, `crew_kudos`, `crew_rings`,
  `career_facts`, `career_awards`, `career_honours`, `crew_consent`) **with get_bell()'s own filters
  copied into their `WHEN` clauses**, so what rings and what the Bell shows cannot drift apart.
- **No trigger may ever fail the save it hangs off.** A session, an award and a post all matter more
  than a notification: every one of the seven swallows its own trouble as a warning, exactly as
  stage81's `crew_level_ring()` does.
- **Quiet hours here are NOT a CHECK on a column** (stage84's are): the hour is the athlete's own
  clock at the moment of sending, so the 08:00–21:59 window is written once, in `crew_push_due()`,
  and the rehearsal checks the night from both sides of the world.
- **The watermark is two columns, `pending` then `upto`**, because of the gap between asking and
  sending: a post that lands in that gap is kept for the next tick instead of being stepped over. A
  sender that dies in between sends the same news twice and loses none.
- **An under-13 reads the Bell and is never sent it**, and neither is a no, a former athlete or the
  demo: they are not `crew_members()`, and nothing of theirs is in the Bell either.
- **A quiet back-pay rings nobody** (`crew.quiet = 'on'`, GAME-6, D20), and nothing from before an
  athlete's phone subscribed is ever sent.
- Guards: `scripts/push/rehearse_crew_push.mjs` (103, PGlite, both directions, the night, the folding,
  every trigger, the erasure and the CRLF trap; 5 of 6 one-line breaks of the stage are caught, and
  the sixth — the order the folded events are named in — changes no answer while a folded notification
  names nobody). The way back is `scripts/push/rollback_stage86.sql`, on Amir's word only.
- **⚠️ If stage84 and stage86 both come off, run stage86's way back FIRST.** stage84's looks for the
  end of `coach_erase_person()`'s table list as stage84 left it, and stage86 puts two names after it.

**To apply** (Amir's yes first). No backup is needed for the apply itself: it adds two tables, fifteen
functions and seven triggers, and changes no row; the one existing object it touches,
`coach_erase_person()`'s list, is put back exactly by the way back.
1. `supabase/stage86_crew_push.sql` (`apply_migration`). Read back: both tables with row-level
   security on and no policy, `anon` and `authenticated` execute none of the functions, the seven
   triggers, the `crew-push` and `crew-push-sweep` jobs in `cron.job`, and the erase function's list
   ending `'push_subs', 'crew_push_q', 'crew_push_seen']`.
2. Deploy `push-send` again (its `?only=crew` arm and the `crew_push_done` answer are in this commit).
   Check with `POST /push-send?only=crew&dry=1`, which decides everything and moves no watermark.
3. Then, in ONE commit: `supabase/schema_snapshot.sql` remade (`scripts/restore/README.md`), and
   `scripts/test_restore_backup.py` check **1d's count 63 → 65** (the two new tables).
   `BACKUP_TABLES` and `SHORT_LIVED` are already done, in this commit.
4. Nobody is subscribed yet (`push_subs` is empty), so nothing rings until the first athlete taps the
   permission — which is also why this stage costs nothing the day it goes on.
