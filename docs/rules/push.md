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
- **The app asks at FOUR moments, and only those** (Amir, 2026-10-20: *"the person who installs the
  app, ask for notifications to be turned on"*, and *"if some one joins the crew, again it should ask
  for permission for their notification"*; 2026-10-24, on First Serve, the first-week line on
  Home: *"can we add turn on notification for the app as well?"*; and 2026-10-25, on the round 7
  plan: *"82 good"*, the line under Cheers this week on the athlete's own page): **installed and
  opened from the Home Screen**, **joining the crew**, **the athlete tapping First Serve's "Turn on
  notifications" step**, and **the athlete tapping the line under Cheers this week on their own page**.
  The first two are real intent — they have just chosen to keep the app, or to
  be seen by the crew — and the third and the fourth are the athlete asking for it by name, on their own tap, from a
  step or a line they can see and leave. First Serve only SHOWS the step: its tap puts up the same one line with
  the same button (`pushAsk()`), as often as they tap it, and never opens the box itself. The cheers
  line is the same kind of thing: it shows only while the phone can take notifications and they are
  not on, its tap calls `pushAsk()` with the reason `'cheers'`, and it never opens the box itself.
  Nothing is ever asked on a first visit in a browser tab.
- **Our line is not the phone's box, which is why asking twice is safe.** The ask is one line with a
  button (`pushAsk()`, an `aaToast` with `ms: 0` so it waits for them); `Notification.requestPermission()`
  runs inside that button's click and nowhere else. One ask per reason, remembered on that phone, and
  **nothing at all when the answer is already in** — on, blocked, or waiting for the Home Screen.
  Joining the crew makes the join toast ITSELF the ask rather than stacking a second one behind it:
  two toasts in a row is how a person learns to swipe them away.
  Guard: `scripts/headless/crew.js` (16 checks, including that nothing reaches the phone until the
  button is tapped, and the cheers line's) and `scripts/headless/lounge.js` section 22 (First Serve and
  the cheers line: the box is shut on load,
  on the line, on the sheet and on the toast, and opens once, inside the button's click).
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
- **The language a notification goes out in is `programs.data.athlete.lang`** ('fa' or 'en'), set at
  intake from the athlete's own form (Amir, 2026-10-20: *"use the language from their intake form:
  put it on the programme and have the app pass it"*). Absent = English. **It is only the
  notifications**: every word of in-app text is English (COM-3).
- **⚠️ A whole half of this feature was unreachable for a day and no test noticed.** All three Farsi
  word tables existed, were read and were chosen — and every call site passed a hardcoded `'en'`, so
  `push_subs.lang` was 'en' for every phone ever subscribed. Found by reading the live rows, not by a
  guard. `scripts/push/rehearse_lang.mjs` now asks the three REAL senders what they would say to a
  Farsi athlete, rather than checking a column.
- **A phone subscribes once, so the app's tap is not enough.** `push_subscribe()` is only ever called
  from that tap, so stage88's `push_lang_sync()` runs hourly at :03 (a minute before the sender) and
  brings every subscription into line with its programme. That is what makes the programme the truth
  rather than the first tap, and what lets a correction take effect without the athlete touching
  anything. It never writes a value the column refuses. **No sender was changed to do this** — all
  three already read `push_subs.lang`.
- **The Farsi is Amir's, read on a lock screen and chosen there** (2026-10-20): تیم for the crew, not a
  transliteration of "crew"; دوره for a cycle, in both the crew's line and the cycle sender's;
  **دستاورد for BOTH a mark and an achievement**, which is his answer to whether the two read
  differently in Farsi — they do not, so the two notifications are deliberately identical; سطح for a
  level, as سطحش رفت بالا. **The folded count is in Persian digits**, because nothing else in that
  line is Latin. He read the two reminders' lines at the same time and changed nothing in them
  — **the kasra on وقتِ تمرینه is deliberate**, kept when asked directly, so it is not a typo to tidy away.
  Guards: both rehearsals check his words by name, so a later hand cannot tidy a transliteration
  back in. The board he read them on: https://claude.ai/artifact/JFeyXV9dGJv9f1WsF1eFcX
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
  the VAPID private key is worse than losing it; losing it is recoverable, because the training app
  re-subscribes silently at its next open once the permission already stands, keeping the hour, quiet
  days and switches: `AAPush.refresh()`, since 2026-10-20). `push_subs` IS backed up, for the
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

## A published cycle on a phone (stage87, LIVE 2026-10-20)

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

**Applied 2026-10-20** on Amir's word (*"Build the sender … so the switch stops promising nothing"*),
as the migration `stage87_cycle_push`. Read back: the table with row-level security on and no policy,
`anon` and `authenticated` executing none of the five functions (each with a fixed search path), and
`coach_erase_person()`'s list ending `'crew_push_seen', 'push_cycle_seen']`. `push-send` is deployed at
version 4 **with `verify_jwt: false`**, and the hourly job fired by hand came back 200 with all four
kinds wired.

The marks were primed by hand straight after (`cycle_push_due(now(), true)`) rather than waiting for the
hourly tick: both subscribed phones were written down where they are and **nothing was sent**, which is
the first-sight rule doing its job. The snapshot was remade in the same commit (66 tables) and check 1d
moved 65 → 66.

**The first notification of this kind goes out the first time Amir publishes a cycle** for an athlete
whose phone was already subscribed — never for the cycle they are on now.
