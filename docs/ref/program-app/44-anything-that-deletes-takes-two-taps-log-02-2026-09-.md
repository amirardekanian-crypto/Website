## 🗑️ Anything that deletes takes two taps (LOG-02, 2026-09-26)

`armedTap(btn, armedLabel, run)` in `program.html`: the first tap arms the button (its label becomes what the
next tap does, class `armed`, a short vibration), a second tap within 4 s runs the delete, and it disarms by
itself. **Reset session** (on the finished card, under the send status line), a **body-weight reading** and a
**Personal Record** go through it, and since WK-04 so do **Finish early** and the session bar's **Reset**.
"Delete all my weight history" already asked twice with its own code. A delete is still a tombstone underneath
(`deleteCeilingEntry()`, `saveWeight(d, null)`); only the door changed.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
