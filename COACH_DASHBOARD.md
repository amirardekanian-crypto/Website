# The Coach's Box — user manual

A plain-English guide to `coach.html`: Amir's private mission control. Every
threshold below is the real value from the code, so this doubles as the
reference for how the flagging actually works.

**Redesigned 2026-08-09.** The old dashboard was a triage list of coached
athletes and nothing else — built before Proof existed, so it could not see the
habit crew, the wall, the board or the funnel, which is most of what happens on
a given day. It went unused. This version opens on **what today needs**, and it
covers **both halves of the business** in one place.

**Audited 2026-10-10** (`docs/record/COACH-AUDIT.md`: what was wrong, what changed, what is still
open, and the harness that tests the write paths). The short version of what changed for you:
the inline editor can no longer overwrite a newer programme, every number that says "needs you"
comes from one rule, the tabs fit a phone, and a failed load or save says so instead of looking
like an empty list or a success.

---


**This file is the index now.** Every word it ever had is still here, one file per section, listed below. Open the one section you need; nothing reads the whole reference. The rules that must never break are in [`docs/rules/`](docs/README.md).

## The sections — open the one you need, never the whole reference

| # | Section | Size |
|---|---|---|
| 01 | [1. Getting in](docs/ref/coach-dashboard/01-1-getting-in.md) | 1 KB |
| 02 | [2. The seven places, in one bar](docs/ref/coach-dashboard/02-2-the-seven-places-in-one-bar/INDEX.md) | 41 KB · 6 parts |
| 03 | [3. TODAY](docs/ref/coach-dashboard/03-3-today.md) | 19 KB |
| 04 | [4. ATHLETES](docs/ref/coach-dashboard/04-4-athletes.md) | 7 KB |
| 05 | [5. The athlete file (`#a/<id>`)](docs/ref/coach-dashboard/05-5-the-athlete-file-aid/INDEX.md) | 26 KB · 6 parts |
| 06 | [6. The three metrics](docs/ref/coach-dashboard/06-6-the-three-metrics.md) | 3 KB |
| 07 | [7. PROOF](docs/ref/coach-dashboard/07-7-proof/INDEX.md) | 27 KB · 3 parts |
| 08 | [8. ⚠ What this page deliberately does NOT do](docs/ref/coach-dashboard/08-8-what-this-page-deliberately-does-not-do.md) | 0 KB |
| 09 | [9. Where the data comes from](docs/ref/coach-dashboard/09-9-where-the-data-comes-from.md) | 7 KB |
| 10 | [10. Find, the phone's bar, one-tap outcomes (2026-11-23)](docs/ref/coach-dashboard/10-find-phone-bar-one-tap-outcomes.md) | 3 KB |
| 11 | [11. Tidy the roster, No video yet (2026-11-23)](docs/ref/coach-dashboard/11-tidy-roster-no-video.md) | 2 KB |
| 12 | [12. Habits and court time, in the file and across everyone (2026-11-23)](docs/ref/coach-dashboard/12-habits-and-court.md) | 3 KB |
| 13 | [13. The big day pill (2026-11-24)](docs/ref/coach-dashboard/13-big-day-pill.md) | 2 KB |
| 14 | [14. Stacked (2026-11-24)](docs/ref/coach-dashboard/14-stacked.md) | 2 KB |
| 15 | [15. Look A, the athlete page (2026-11-28)](docs/ref/coach-dashboard/15-look-a.md) | 5 KB |
| 16 | [16. Players' Lounge (2026-10-24)](docs/ref/coach-dashboard/16-players-lounge.md) | 4 KB |

---

*9 sections, split 2026-10-19. Every word is where it was; only the file changed. A reference written "`COACH_DASHBOARD.md` → *Section*" is the row with that name.*

---

## Five weeks and Done lately (2026-11-21, #124 The Mirror)

Amir: *"how would i find out if some one did this?"* (a Library session marked done), then round 11's *"Go with your picks"*. The athlete's
**Your weeks** grid (`docs/ref/program-app/62-your-weeks.md`) has its coach copy here.

| Where | What it shows | Source |
|---|---|---|
| The work, under the metric strip | **Five weeks**: the athlete's current cycle as rows of days, a plan session green, a Library session mint, court time the athlete logged (Court Log, stage116) ink, anything else they logged grey, two kinds split; a held week's label is a green circle with a tick; the head says the weeks held and the court hours; hover a day for its sessions, minutes and a logged one's effort. Nothing when nothing is done yet or the server has no stage115. Read once per athlete per store. | `get_five_weeks(p_athlete_id)` (stage115), `fiveWeeksC()`, `fiveWeeksPanelC()` |
| Library, above the shelves | **Done lately**: every Library session marked done in the last 30 days, newest first, the name a link to the file. | `library_sessions` (`S.libDone`, read with the library) |
| Library, each workout row | *done N times by M · last <date>*. | the same |

Court Log's rows (`activity_log`) are in ⚙ Tools → Backup and in the Erase panel's list (*logged activities*). A failed read of `library_sessions` is named in the load banner (*the Library sessions athletes marked done*), never drawn as nobody doing them.

## The month's honours wait for Amir (2026-10-25)

Built with stage104 (`career/PROCEDURES.md` → *Stage 104*; **not applied yet**, and the page does nothing new until it is). Amir: *"im gonna choose other honours at the end of the month, there should be reminder in coach.html for me tho. to pick most sessions most improved an full month or my pick"*; board: https://claude.ai/artifact/9JYRa93PVAYZSH4pRw2rhs.

**The reminder card** is the first thing in Courtside on Today (`honRemindHtml()`). It shows from the **last day of the month** and stays, into the next month, until all four honours of that month are confirmed. On the last day the month is not over, so it says "so far". Title: *October's honours are waiting*. Line: *Pick them by 7 November. Nothing reaches anyone until you confirm.* After the 7th: *Overdue: pick them now.* It goes when the month's pick window closes (the end of the month after) too.

| Row | What it shows | Buttons |
|---|---|---|
| Most sessions | `suggested: Ana, 12 plan sessions` (a tie lists everyone) | **Confirm**, and **Change to:** a list of every client with a programme, then **Change** (two taps: the first says who gets it) |
| Most improved | `suggested: Bo, Barbell Back Squat +18.2% at the same effort` | the same |
| Full Month | the names who earned it, each with × to take off, and **Add a name** | **Confirm** (the list as it stands; an empty list says *Nobody this month*) |
| Amir's Pick | the existing flow: the shortlist, *Someone else*, *Nobody this month* (two taps); once picked, the reason box | his pick is his confirmation |

A confirmed row becomes one quiet line, *Confirmed* and the winner. The WhatsApp lines (the honours area) appear for an honour only once it is confirmed. Confirm and Change call `coach_honour_confirm(p_month, p_honour, p_athlete_ids, p_not_clients)`, which works the figure out again; a refusal (no figure, already confirmed with another list) is said and the row stays a suggestion. **The page freezes the month quietly from the 8th as before, and that now saves suggestions only.** Demo mode and a server before stage104 have no card. Harness: `honours-reminder-days`, `-confirm` and `-refusals`; the stub answers stage104 only when the seed says `honoursConfirm: true`.

## Today, rebuilt around what came in (2026-11-23)

Amir's picks: the strip says `updated ... ago` with four counters (came in today, notes to read, applications, cycles ending this week); Needs you is clay only for a note or a sync problem and folds two or more bare "no login" people into one **Set up all** row; the right column is **Came in** (the last 7 days, a clay dot for what is new) and Courtside behind a fold; Today's Proof column is gone; the page refreshes itself on a doorbell tap (`quietRefresh()`); a note clears when it is opened, and the athlete header has **Mark all read**. The full account is at the end of [3. TODAY](docs/ref/coach-dashboard/03-3-today.md).
