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
- **The app asks at TWO moments, and only those** (Amir, 2026-10-20: *"the person who installs the
  app, ask for notifications to be turned on"*, and *"if some one joins the crew, again it should ask
  for permission for their notification"*): **installed and opened from the Home Screen**, and
  **joining the crew**. Both are real intent — they have just chosen to keep the app, or to be seen by
  the crew. Nothing is ever asked on a first visit in a browser tab.
- **Our line is not the phone's box, which is why asking twice is safe.** The ask is one line with a
  button (`pushAsk()`, an `aaToast` with `ms: 0` so it waits for them); `Notification.requestPermission()`
  runs inside that button's click and nowhere else. One ask per reason, remembered on that phone, and
  **nothing at all when the answer is already in** — on, blocked, or waiting for the Home Screen.
  Joining the crew makes the join toast ITSELF the ask rather than stacking a second one behind it:
  two toasts in a row is how a person learns to swipe them away.
  Guard: `scripts/headless/crew.js` (16 checks, including that nothing reaches the phone until the
  button is tapped).
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
- **⚠️ A switch in the Reminders panel must have a sender.** That is the fault Amir found on
  2026-10-19 (*"why didnt i?"*): `crew` had been offered since stage84 with nothing behind it, and
  `cycle` after it. **All four have one now** — habits and workout (stage84), crew (stage86), cycle
  (stage87) — and a fifth switch does not go in the panel before its sender does.
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

## The crew on a phone (stage86, LIVE 2026-10-20)

Amir: *"one of the notification rules in my app was that everytime anything happens in the crew, any
lines, any new image, any likes, any new post, everyone should receive a notification"*, then
*"Everything in the crew should ring for everyone: every post, photo, like and line. Build it that
way."* So nothing is dropped and nothing is ranked. The full narration is
[`PROCEDURES.md` → *Stage 86: the crew on a phone*](../ref/career-procedures/30-stage-86-the-crew-on-a-phone.md),
and the stage file's own header.

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
- **⚠️ A deploy of `push-send` must SAY `verify_jwt: false`.** It defaults to true, and then pg_net's
  call is refused at the gateway with a 401 before a line of the function runs: the reminders and the
  crew both go silent and nothing in the database looks wrong. It happened on the stage86 deploy
  (2026-10-20), caught by firing the two jobs and reading `net._http_response`. The function does its
  own authentication — a shared secret in `x-push-key` — which is why the platform's check must be off.
- **⚠️ If stage84 and stage86 both come off, run stage86's way back FIRST.** stage84's looks for the
  end of `coach_erase_person()`'s table list as stage84 left it, and stage86 puts two names after it.

**Applied 2026-10-20** on Amir's word, *"Yes go on"*, as the migration `stage86_crew_push`. Read back whole:
both tables with row-level security on and **no policy at all**, `anon` and `authenticated` able to select
neither and to execute none of the fourteen functions (every one with a fixed search path), the seven triggers
on their seven tables, `crew-push` (`*/15 * * * *`) and `crew-push-sweep` (`38 4 * * *`) in `cron.job` with
stage84's `push-send` and `push-sweep` and stage81's `crew-sweep` untouched, and `coach_erase_person()`'s list
ending `'push_subs', 'crew_push_q', 'crew_push_seen']`. `crew_push_due()` answered 0 rows, and both jobs were
fired by hand: each came back **200** through the gateway (`net._http_response`), which is what proves the
shared secret and the `?only=crew` arm together. `push-send` is deployed at version 3.

The snapshot was remade in the same commit (65 tables) and `scripts/test_restore_backup.py` check 1d moved
63 → 65. The restore rehearsal caught two things the stage had not registered with it — its own short-lived
list, and the count of identity counters (8 → 9, `crew_push_q.id`) — both fixed in the same commit; it is
49 of 49 now.

**Nothing rings yet, and that is not a fault.** `push_subs` is still empty: until an athlete taps the
permission there is nobody to send to, and `crew_push_add()` returns before writing a row, so the queue stays
empty too. The first real proof of this stage is the first subscribed phone.

## A published cycle on a phone (stage87, written 2026-10-20, NOT APPLIED — waits on Amir's word)

Amir: *"Build the sender for the cycle notification too, so the switch stops promising nothing."* The
last of stage84's four kinds. The full narration is the header of `supabase/stage87_cycle_push.sql`.

- **No queue, no trigger, no new job** — and each absence is the point. A crew event is a moment that
  passes; **a published cycle is a STATE**, `currentCycleIndex` in the programme, which simply stays
  advanced. So the decision is read from the programme every time ("is their current cycle further on
  than the one we last told them about"), which means a phone that was off for a week still gets told,
  once, when it comes back. Nothing hangs off `publish_cycle()`, which is the most important write in
  the product (PRC-1) and must not carry a notification's risk. And stage84's hourly `push-send` already
  asks every sender, so a cycle lands within the hour with no new machinery; the crew's 15-minute tick
  (`?only=crew`) is left alone.
- **The first sight of a phone is never a notification.** An athlete who subscribes today must not be
  news-flashed about the cycle they are already training, so the first run writes down where they are
  and sends nothing; only an advance after that rings. (Break that and they are told about every cycle
  they have ever had — a mutation the rehearsal catches.)
- **The words are the fact and nothing else**: "Your next cycle is ready." No cycle name, no number, no
  load — the lock-screen rule. TTL two hours: if the phone was off longer the cycle is still there.
- **Who is never told**: the switch off, the night (08:00–21:59 local, as stage86 writes it), a free
  Proof athlete (no cycles to announce), an athlete whose programme has no roadmap yet (mid-intake),
  and a phone that has failed five times.
- The mark is the two-column shape stage86 explains (`cycle_index`, then `pending`), so a publish that
  lands mid-send is not stepped over, and a send that failed everywhere is simply owed again — which,
  for a state rather than a moment, can be the next hour or tomorrow with nothing lost.
- Guards: `scripts/push/rehearse_cycle_push.mjs` (55, PGlite, both directions and the CRLF trap; **10
  of 10 one-line breaks of the stage are caught**, after the first mutation run found a real gap in the
  rehearsal itself — the free athlete had been failing two tests at once, so a break in either passed
  unnoticed). The way back is `scripts/push/rollback_stage87.sql`, on Amir's word only.
- **⚠️ If these come off, run them NEWEST FIRST**: stage87, then stage86, then stage84. Each puts its
  own names on the end of `coach_erase_person()`'s table list, and each way back looks for the end as
  its own stage left it.

**To apply** (Amir's yes first). It adds one table and five functions and changes no row; the one
existing object it touches, `coach_erase_person()`'s list, is put back exactly by the way back.
1. `supabase/stage87_cycle_push.sql` (`apply_migration`). Read back: the table with row-level security
   on and no policy, `anon` and `authenticated` executing none of the five, and the erase function's
   list ending `'crew_push_seen', 'push_cycle_seen']`.
2. Deploy `push-send` again — **passing `verify_jwt: false`** (see the rule above). Then
   `POST /push-send?dry=1`, which decides everything and moves nothing.
3. Then, in ONE commit: `supabase/schema_snapshot.sql` remade, `scripts/test_restore_backup.py` check
   **1d's count 65 → 66**, and in `scripts/restore/rehearse.mjs` the new table added to its own
   short-lived list. (`BACKUP_TABLES` and `SHORT_LIVED` in `restore_backup.py` are already done, in
   this commit.)
4. The first notification of this kind goes out the first time Amir publishes a cycle for an athlete
   whose phone was already subscribed — not for the cycle they are on now.
