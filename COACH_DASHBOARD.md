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

---

*9 sections, split 2026-10-19. Every word is where it was; only the file changed. A reference written "`COACH_DASHBOARD.md` → *Section*" is the row with that name.*

---

## The month's honours wait for Amir (2026-10-25)

Built with stage101 (`career/PROCEDURES.md` → *Stage 101*; **not applied yet**, and the page does nothing new until it is). Amir: *"im gonna choose other honours at the end of the month, there should be reminder in coach.html for me tho. to pick most sessions most improved an full month or my pick"*; board: https://claude.ai/artifact/9JYRa93PVAYZSH4pRw2rhs.

**The reminder card** is the first thing in Courtside on Today (`honRemindHtml()`). It shows from the **last day of the month** and stays, into the next month, until all four honours of that month are confirmed. On the last day the month is not over, so it says "so far". Title: *October's honours are waiting*. Line: *Pick them by 7 November. Nothing reaches anyone until you confirm.* After the 7th: *Overdue: pick them now.* It goes when the month's pick window closes (the end of the month after) too.

| Row | What it shows | Buttons |
|---|---|---|
| Most sessions | `suggested: Ana, 12 plan sessions` (a tie lists everyone) | **Confirm**, and **Change to:** a list of every client with a programme, then **Change** (two taps: the first says who gets it) |
| Most improved | `suggested: Bo, Barbell Back Squat +18.2% at the same effort` | the same |
| Full Month | the names who earned it, each with × to take off, and **Add a name** | **Confirm** (the list as it stands; an empty list says *Nobody this month*) |
| Amir's Pick | the existing flow: the shortlist, *Someone else*, *Nobody this month* (two taps); once picked, the reason box | his pick is his confirmation |

A confirmed row becomes one quiet line, *Confirmed* and the winner. The WhatsApp lines (the honours area) appear for an honour only once it is confirmed. Confirm and Change call `coach_honour_confirm(p_month, p_honour, p_athlete_ids, p_not_clients)`, which works the figure out again; a refusal (no figure, already confirmed with another list) is said and the row stays a suggestion. **The page freezes the month quietly from the 8th as before, and that now saves suggestions only.** Demo mode and a server before stage101 have no card. Harness: `honours-reminder-days`, `-confirm` and `-refusals`; the stub answers stage101 only when the seed says `honoursConfirm: true`.

## Players' Lounge (2026-10-24)

Built on the branch `lounge-coach`, **not live**: the server side is stage96 (faces, cheers, `athlete_profile`) and stage97 (the athletes' partner codes), and none of it is applied yet. The contract the page was built to is `C:\Users\Amir\AA-Lounge\CONTRACT.md`. One rule runs through all seven: **when the server has no such function or table, the page draws nothing and says nothing** (older server); any other failed read is named in the banner under the tabs ("the crew's photos", "the crew's cheers", "the athletes' partner codes"). Nothing here pays XP (GAME-6). `BACKUP_TABLES` is **not** changed on the branch: `athlete_profile` and `referral_credits` join it on go-live day, together with the snapshot and `coach_erase_person()` (the backup check compares the two).

| | Where | What | Server |
|---|---|---|---|
| K1 | Today, Also waiting | **Trains, not in the crew: N**: a coached, active athlete who finished a session in the last 28 days and never answered the crew question. Someone who answered no is left alone (their choice stands, and the app already shows them the way back), and so is anyone ticked under 13. Each name has the drafted line, WhatsApp and Copy. Not a reason: `reasonsOf()`, the people count and the badges do not move. Nothing while the Bell is missing or failed. | reads `coach_crew()` answers and the sessions already held |
| K2 | roster, file header, Needs you, Courtside, Who said yes | The athlete's **face** in the circle (28 px, 44 px in the file's header), initials as the fallback. Read once per load, kept in memory. **Remove photo** in Who said yes, two taps. | `coach_crew_faces()`, `coach_crew_face_clear(p_athlete)` |
| K3 | Courtside | **Cheer** on each moment: a small sheet, an optional word (100 letters), then the row says "Cheered today". "Not in the crew" when the Bell says so. "You already cheered Sara today." for `crew:cheer_today`. The clap is the inline Phosphor hands-clapping icon (the athlete app's), filled in the text colour, never the emoji (yellow on a phone, and yellow is never in this app). | `coach_cheer(p_athlete, p_word)` |
| K4 | Proof, under Who said yes | **Cheers with words, last 7 days**, newest first, the words as text, **Clear the word** in two taps (the cheer and the count stay). | `coach_crew_cheers()`, `coach_cheer_word_clear(p_id)` |
| K5 | the athlete's file, under the name | One line from their `athlete_profile` row, only what is set: "Padel, Tennis · right-handed · two-handed backhand · left side · at Aspire Padel · trains for strength · working on: ... · @handle". Nothing for an empty row or a missing table. Read once per athlete. | `athlete_profile` (coach SELECT policy) |
| K6 | Leads, Referral codes | **Athletes' partner codes**, a group of its own (kind `athlete` leaves Live codes): the deal in one line, the code, the athlete, the applications that typed it (`affUses()`, applications and never payments), the credits (each carries its `intake_id`, so an application reads Credited) with a **Used** tick, "10% off owed for N cycles" (each unused credit is 10% off ONE cycle, never 20% at once), **Make a code** (a picker; `partner:has_code`, `partner:under13` and `partner:no_programme` are said in plain words), Retire. On an application that typed an athlete's code: **Credit Sara 10%**; `partner:self` is "That is their own code." | `coach_partner_codes()`, `coach_partner_code_make(p_athlete)`, `coach_partner_credit_add(p_code, p_intake, p_note)`, `coach_partner_credit_used(p_id, p_used)` |
| K7 | `form-fa.html` | `?code=` fills the discount box and runs the same check, as `form.html` does. | `check_discount()` (unchanged) |

**Farsi draft, Amir to read.** The line for a Farsi athlete (the programme's `athlete.lang` is `fa`, SCHEMA.md) is, with the first name in place of the dots:
`سلام ... . Crew توی اپت راه افتاده. بقیه اونجا همدیگه رو تشویق می‌کنن. یه سر به تب Crew بزن. خودت انتخاب می‌کنی چی رو ببینن.`
The English line is Amir's: "Hi Sara. The crew is live in your app. The others cheer each other on there. Have a look in the Crew tab. You choose what they see." Both live in coach.html as `NUDGE_EN` and `NUDGE_FA` (the Farsi one marked as a draft); change the words there.

**Tests.** `scripts/headless/coach/run.js`: `lounge-form-fa-code`, `lounge-game-line`, `lounge-faces`, `lounge-nudge`, `lounge-cheer`, `lounge-cheers-words`, `lounge-partner-codes`. The stub answers the new functions only when the seed says so (`buildSeed({lounge: true})` for stage96, `{partner: true}` for stage97), in the CONTRACT's shapes, with made-up people; without them every one answers "Could not find the function", which is how every other scenario still runs against an older server.
