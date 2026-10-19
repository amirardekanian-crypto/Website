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
  everyone who already said yes. `kinds` already carries `crew` and `cycle` for the next stage.
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
