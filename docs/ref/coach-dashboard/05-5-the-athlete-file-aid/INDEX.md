## 5. The athlete file (`#a/<id>`)

<!-- Split by sub-heading: one file each. Open the part you need. -->


**Rebuilt 2026-08-22.** It used to be eight sections on one scroll, three of which drew the same
program days three different ways — *Prescribed program*, *Training logs by day* and *Live activity* —
hundreds of pixels apart. Answering "did she do what I asked?" meant reading the chips in one section,
scrolling to another, and holding the numbers in your head. Now it's **three sub-tabs** (five until
Chat went, 2026-09-26, and four until the call log was retired, 2026-10-11), and the first
one answers that question directly.

The sub-tab lives in the URL (`#a/<id>/work`, `/proof`, `/file`), so any screen
can be bookmarked. Plain `#a/<id>` (or an old `/chat` or `/calls` bookmark) opens **The work**, or **Proof** for
a habit-only athlete with no training days. Opening someone else while a file is still loading
never paints the first person's file under the second person's address (it could until 2026-10-10).
A save or a refresh keeps the days you had open, the session you were comparing and anything typed
into an open editor, and (since 2026-10-11) what you typed or opened in the tab itself: the password box with the cursor in it,
Version history, the Coaching log, a day's raw log, Earlier cycles and the live snapshot. That holds for the same athlete's same
screen only; another athlete or screen starts clean.

**The header** (2026-10-12, round 1 of the UX redesign; the same on every sub-tab): `← Roster`, a 44 px avatar, the name, one line
(tier, status and level chips, then *N sessions · Proof n/7 · last active …*), then a **cycle line** and a **Needs you line**, and on the
right (below the name on a phone) the **WhatsApp** button and **View their app** (or **View their Proof** for someone with habits and no
training days). The cycle line (`cycleLineHtml()`) is the old dark green block on The work, moved up and made one line:
*Cycle 3 — Foundations · week 2 of 4 · 12 Oct – 9 Nov · 28 days left*, then the focuses in grey. The week is the app's own
(`cycleWeekOnC()`); a cycle with no dates has no week text (its roadmap label, *Weeks 1–5*, stands in), and the wording *ends today* and
*ended N days ago* is as it was. The Needs you line (`needsLineHtml()`) says why this person is in front of you: each of their reasons from
`reasonsOf()` (`a.reasons`, plus the quiet flag a gone-quiet athlete keeps, never computed here) as a link to the sub-tab that has it, joined by
" · ", the ones that need you in clay. `file-groups` drives both.


## The parts

- [The work — prescribed vs done, on one line](01-the-work-prescribed-vs-done-on-one-line.md)
- [Editing a prescription (✎)](02-editing-a-prescription.md)
- [The three numbers, and the charts](03-the-three-numbers-and-the-charts.md)
- [Personal records — what they can lift, and what has gone stale](04-personal-records-what-they-can-lift-and-what-has-gon.md)
- [Body weight — on The work, folded](05-body-weight-on-the-work-folded.md)
- [Proof · File (and the retired Calls)](06-proof-file-and-the-retired-calls.md)

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
