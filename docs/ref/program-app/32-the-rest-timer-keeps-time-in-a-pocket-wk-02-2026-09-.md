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
- **The rest offer is gone, the rest starts by itself** (Amir, 2026-10-11: "remove the rest pill, I don't like it"). Ticking a set no
  longer brings up a **Rest 2:00** button above the tab bar (`offerRest()`, WK-02, 2026-09-27); that pill stays gone. Since 2026-10-24
  a tick in the day's list opens the rest itself (`restAfterTick()`, Amir: "the same as Guided does, and X skips it"): it presses the
  card's own **Rest ⏱** button, so the time is the button's and **✕** closes it. Only where a rest was written (the button names its
  time), only when something follows (`restNextOfCard()` is null after the last set of the day), never in Guided, the coach's
  preview, a Library session, over a rest already counting, on an un-tick, on "tick all" or on a warm-up row. A timed hold rests when
  its own count ends and ticks the set, once. The guide's *Built-in tools* card says so.
- The overlay's dark palette came with A11Y-01 (#245). It is solid since 2026-09-27 (POL-01): at 97% the day's
  cards showed through behind the clock.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
