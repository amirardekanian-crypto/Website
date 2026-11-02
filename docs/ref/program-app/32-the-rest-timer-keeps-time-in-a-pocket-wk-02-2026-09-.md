## ⏲️ The rest timer keeps time in a pocket (WK-02, 2026-09-27)

**Its look since 2026-10-13: a green band with ✕ and a sound icon, the log on the paper below in Guided** (*Every other screen in the
Centre Court look*, above). The timing below is unchanged.

- **It counts from a timestamp** (`timerEndsAt`): `timerTick()` reads the clock every 250 ms and paints only
  when the whole second changes, so a phone that sleeps or throttles the page still ends the rest on time, and
  `visibilitychange` catches it up on return. Back more than 30 s after the end: it closes with no alarm.
- **Every door opens it running** (`openRest()`); Pause, +15s, Reset and Close are unchanged. Guided's rest
  (`openTimerAuto()`) is the same engine.
- **At zero:** two short Web Audio tones (`restBeep()`, nothing downloaded; the audio context is started in the
  tap that opened the rest, and a phone on silent stays quiet) plus a buzz where the phone has one (not iPhone).
  **Sound on/off** on the overlay is `rest_sound` (`'0'` = off) on this phone only.
- **The screen stays awake** while a rest runs (`restWake()`, the Screen Wake Lock API), released on pause
  and close and asked for again on return.
- **The rest offer is gone** (Amir, 2026-10-11: "remove the rest pill, I don't like it"). Ticking a set no longer brings up a
  **Rest 2:00** button above the tab bar (`offerRest()`, WK-02, 2026-09-27; it never started by itself). Nothing replaced it: the
  card's own **Rest ⏱** button (44 px) opens the Rest Timer, and Guided rests itself after every set. The guide's *Built-in tools* card says so. For one day (2026-10-24) a tick opened the
  rest itself (`restAfterTick()`); Amir took it out on 2026-10-25 ("go back i dont like it"). `scripts/headless/love-all-rest.js` checks a tick opens nothing.
- **Minimise** (Amir, 2026-11-02: *"add a minimise funtion to rest timer, so the athlete can minimise the rest, and check other training
  without losing rest time"*; his pick, a small bar at the bottom). A down arrow beside ✕ (`#timerMinBtn`, `minimiseTimer()`) takes the
  overlay away and leaves `#restMini`, one green bar: *● REST 2:28 · the exercise · OPEN*, above the tab bar when it shows and at the foot
  mid-session (`placeRestMini()`, every 400 ms while it shows), z 95: over Guided and the tab bar, under the timer and the sheets. The clock is
  the same (`timerEndsAt` is never touched), so the beep at zero, Serve Clock and the phone's notification keep time. A tap opens the timer
  again (`restoreTimer()`); a paused rest says *Paused*; at zero the bar says *Go* and goes with the rest; a new rest always opens whole; ✕
  ends it as ever. A game on the rest is closed by Minimise. **Guided's rest has no Minimise** (`.timer-overlay.guided`): its rest screen is
  where the set is logged and its end moves the steps on. The phone's Back treats a minimised rest as a closed one. `scripts/headless/rest-mini.js`.
- **10 seconds left, on the phone** (stage107, 2026-11-02): leaving the app mid-rest arms a server push 10 s before the end
  (`restPushPrep()` at every start, `restPushArm()` on hidden, `restPushDisarm()` on visible); `docs/rules/push.md` → *The rest on a
  phone*. `scripts/headless/rest-push.js`.
- The overlay's dark palette came with A11Y-01 (#245). It is solid since 2026-09-27 (POL-01): at 97% the day's
  cards showed through behind the clock.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
