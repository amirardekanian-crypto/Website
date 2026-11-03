# The rest alert and the "still open" reminder — how they were built (2026-11-02)

<!-- Record. The rules are in docs/rules/push.md → *The rest alert and the "still open" reminder*. -->

## The rest on a phone (stage107, LIVE 2026-11-02)

Amir: *"add a notification 10sec before the rest finishes if they had minimised the app and was on instagram for
example"*; his pick: any rest, only when the athlete is out of the app. The full account is the header of
`supabase/stage107_rest_push.sql` (applied as the migration `stage106_rest_push`: another session had applied a
`stage106_spare_session` that never reached main; it is on main since 2026-11-03 as `supabase/stage106_spare_session.sql`, taken
from the live migration history).

- **A frozen page cannot ring, so the server does.** When the page is hidden with a rest running, the app sends ONE
  keepalive request with a text/plain body (no preflight) to `push-send?only=rest`; push-send arms THAT phone's
  `push_subs` row as the athlete (`push_rest_arm()`: their sign-in is the check, never anyone else's phone). Back in the
  app, `push_rest_disarm()` takes it back, so nothing rings while the athlete is looking at the app.
- **No new table.** `rest_at` and `rest_token` sit on `push_subs`, which is already backed up and erased.
- **Whoever is closest sends it, once.** push-send waits in the background (`EdgeRuntime.waitUntil`, 75 s at most) when
  the alert is near; the every-minute job `push-rest` wakes it only when a phone is due within 70 s; `push_rest_take()`
  clears the row and hands back the keys in one statement while the token matches, so two senders send one alert and a
  disarmed rest sends none. `push-rest-sweep` keeps that job's run log to two days.
- **TTL 30 s, Urgency high, tag `rest`, no quiet hours** (the athlete is training by their own tap). The words carry no
  exercise, weight or effort. `kinds.rest = false` is honoured; there is no switch in the panel for it yet.
- **The Farsi, approved by Amir on 2026-11-02** (*"There farsi words are ok"*): *۱۰ ثانیه تا آخر استراحت* / *برای ست بعدی آماده شو.*
- **Proven live** (2026-11-02) with a made-up phone: armed for +40 s, the job woke the sender at the minute and the row
  was taken 0.11 s after it was due. **Not yet proven on a real phone**: that a hiding iPhone page gets its keepalive
  request out is the one thing no test here can show.
- Guards: `scripts/push/rehearse_rest_push.mjs` (49, PGlite), `scripts/headless/rest-push.js` (11). The way back is
  `scripts/push/rollback_stage107.sql`, on Amir's word only.

## "Your session is still open" (stage108, LIVE 2026-11-02)

Amir: *"Some people forget to hit finish on the session"*, then *"Lets remind them 10 min instead of 30 min"*. The full account
is the header of `supabase/stage108_finish_push.sql`.

- **The same road as the rest alert, a second kind.** The page hidden with a session open (`activeDayId()`, not finished)
  arms `push_subs.finish_at` **10 minutes after the day's last tick** (`<id>_lastact_d<N>`, written by `markTouched()`, never
  synced), or a minute from now when that is already past. Coming back disarms both kinds (`push_rest_disarm()` clears both
  since stage108). The every-minute job and push-send serve both through `push_alert_due()` / `push_alert_take()`.
- **TTL one hour, Urgency normal, tag `finish`, more than 15 minutes late is never sent.** The tap opens the day under way at
  its finish card (`sw.js`: `#finish`, `goFinishSoon()`), where *Stop here* is when sets are left.
- **The Farsi, approved by Amir on 2026-11-02**: *جلسه‌ت هنوز بازه* / *تمرینت تموم شد؟ بزن و تمومش کن.*
- **Offline, on Android, the app sets both alerts itself too** (`localAlert()`, Amir: *"Imagine someone is training without
  internet"*): a hidden page's timers keep running there for a few minutes. An iPhone freezes the page, so there it is the
  server or nothing, and a frozen timer waking on the way back in checks the page is still hidden. Both carry one tag, and
  `sw.js` lets a push that lands within 5 minutes of the phone's own alert replace it quietly (`renotify: false`): one buzz.
  **⚠️ The words exist twice**: `push_alert_take()` and `localAlert.WORDS` in program.html. Change both.
- **The rescue catches what the reminder does not**, with or without internet (`docs/ref/program-app/38-one-finish-rate-then-done-wk-04-2026-09-27.md` → *The rescue*).
- **Proven live** (2026-11-02) with a made-up phone: armed for +40 s, taken at its time. The made-up row
  (`zz_rest_rehearsal`) was deleted on 2026-11-03 on Amir's word (*"Delete it"*).
- Guards: `scripts/push/rehearse_finish_push.mjs` (40, PGlite), `scripts/headless/finish-nudge.js` (20). The way back is
  `scripts/push/rollback_stage108.sql`, on Amir's word only; it puts stage107's two functions back as they were.
