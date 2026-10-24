## 📖 The in-app guide names real controls (CNT-01, 2026-09-26)

The **How the app works** cards (on the Coach tab until COACH-02, above) are `APP_GUIDE` in `program.html`. Nothing checks them against
the app, so they drifted: for weeks they said "Finish Workout → Send Data to Coach", that the finish card
appears "when every exercise is checked off", and "tap the timer icon". What is true on 2026-09-27:

- The finish card appears at the **first logged set**: *In progress* with the count and **Finish early** (two
  taps), or *All done with Day N* (`refreshConfirmCard()`).
- The session RPE (1–10), an optional note, and **Done · send to coach ✓**, which finishes and sends (WK-04,
  above). **Reset** sits in the session bar once a day has started.
- The rest timer opens by itself when a set is ticked in the list, if the exercise has a written rest and something follows (2026-10-24), or from the **Rest ⏱** button under the sets (WK-02, above). The Rest pill above the tab bar is gone (2026-10-11).
- **How to do it** (2026-10-11) holds the steps, the cues and the video when there is one, and its ▶ means a video. Five
  texts said otherwise and changed with it: *How your program is structured* (each exercise "carries a demo video and
  coaching cues"), *Logging your sets* (How to do it was "the video and the cues"; the warm-up line, and a line for a
  working circuit's How to do it), *The ⓘ* (Library → Exercises "with its video and cues") and *Built-in tools*
  ("most exercises have a video": 141 of 320 entries had none). `ONB_TEXT` names none of these and did not change.

**Rule:** a PR that renames a button, moves a control or changes when a card appears updates its guide card
too (CLAUDE.md says the same). The Library's *Mark as done* note promises a habit tick only when AA Proof
will give one: `_wsHabitOn()` reads `<id>_hab_cfg` (never writes it); WORKOUT is core and always counts,
Mobility and Breathe are add-ons that count only when switched on, and no config on the phone reads as off.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
