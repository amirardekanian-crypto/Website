### Editing a prescription (✎)

✎ sits at the top right of the prescribed column and is **always visible**: a faint grey glyph that goes dark green on hover and focus (until round 3 of the UX pass,
2026-10-12, it was hidden until the row was hovered on a PC). The editor names
the exercise it is editing and takes, on **one row** (equal heights and aligned labels; two to a row on a phone), sets, the dose (one value plus its kind: reps, time, distance
or work, the Dose select drawn like the boxes), per side, RPE, tempo, rest, then the pill and your note. **Save** then:

1. checks the fields against the rx contract — reps one whole number (a range or a time is refused
   with the reason), a time it can read, a distance with a unit, sets 1–99, RPE 6–10 or a 6–10 range,
   numbers stored as numbers; a save that changes nothing writes nothing;
2. reads the **live** programme row, and refuses if it changed after this page loaded (a new cycle
   from the pipeline, another tab, a restore) or if the exercise is no longer at that place: the page
   reloads the live programme and asks you to redo the change;
3. writes the edit into that live copy, only if nobody wrote in between, and checks the server
   really changed the row.

Until 2026-10-10 Save wrote the whole programme as it was when the page opened, which could put an
old cycle back over a newly published one, and after a publish or restore an edit could land on a
different exercise. **Version history** (File tab) lists the saves kept for that athlete in your own time zone
(the last 20 always, and every save since the previous cycle began, never more than 150: stage52, 2026-10-11);
each line is the programme just before that save, and Restore checks it belongs to this athlete. **Who saved it** is the signed-in email;
an edit made in the SQL editor or by Claude's database tool has no signed-in user and used to carry the previous person's name, as if they had made it.
Since stage59 (2026-10-11, audit SERVER-12) that edit says `sql`, and a label a writer sets itself (`publish_cycle`, `claude`) stays.

**Undo is a one-tap button and a sentence** (audit FLOW-11 and WORK-10, 2026-10-11). After a ✎ save a bar above the toast says what the save
changed, in the athlete's words (*Ava Example: Day 1 · Goblet Squat: sets 4 → 5*), with **Undo** (it stays for half a minute). Undo puts the
programme back as it was just before the save, **only if** the row still carries the stamp the save left: if the pipeline, another tab or a
restore has written it since, Undo refuses, says so and changes nothing (Version history still has every save). A **restore** gets the same bar
(*Ava Example restored: …*), and a restore is itself written only if the programme has not moved since it was read. Every line in Version
history has **What this save changed**: this stored version against the next one (the newest against the programme now), as a short list: a number
that moved (*sets 3 → 4, RPE 7 → 8, rest 90 s → 120 s*), a card added or removed (*Face Pull added (3 × 12)*), a note, a day, an order, a cycle or
the athlete block. Cards are matched by day, block and name, so a rename reads as one removed and one added. The wording is `programDiff()`;
`test_coach_compare.js` section 15 has its 27 cases.

**The pill (CHP-2, 2026-10-11).** The editor has a **Pill** picker: the closed list from `assets/js/chips.js`
(`Chips.PILLS`, the same object as `check_program.py` and SCHEMA.md), grouped as Hands, Lead side, Intent, Hold,
Brakes and Pace. **It is folded** (round 3, 2026-10-12): the pill on the card shows as a chip with a ✕ (*No pill* when there is none) and one link, **Change pill**
(**Add a pill** when there is none); the six groups open only on that tap, the link then says **Done**, and they stay open through a redraw while the editor is open
(`ppOpen` on the draft, gone when the editor closes). A value off the list and the warnings are never folded. A tap puts a value on, a second tap (or the chip's ✕) takes it off,
and a value from a group already on takes that
one's place: at most two, one per group. A third is refused with a toast. There is no box to type a new value: one
joins the list only on your word. A hold value is warned unless Tempo is `iso`, and *easy pace* unless RPE is empty.
An old spelling on a card ("right leg first") shows as its list value ("right side first") and is saved that way.
A value on the card that is not on the list ("glute focus", "3s eccentric") is shown in clay with **Move to the
note** (it goes to the end of your note as a sentence) or **Drop it**; left alone it is kept, so nothing is lost, and
`check_program.py` flags it. Save writes the pill as one `intent` string joined by " · ", and a save that changes
nothing still writes nothing. The note box now says what a note is for (COM-14): about this athlete, one to three
short sentences, the point first. On The work, the row shows the pill under the dose, and a pill problem counts in
its chip issues.

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
