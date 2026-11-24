# Recovery after a session: what it does and why

The plain account of round 14 'The Changeover' (ideas #139 to #144, built 2026-11-24; #145, the article, is its own run). The
numbers are in the three `.toml` files beside this one; the functions in [`PROCEDURES.md`](PROCEDURES.md). Every finding below was
checked against its paper's abstract for the round's evidence brief (the pitch page linked from `.claude/skills/ideas/BANK.md` →
Round 14 lists all 50).

## The short answer the app gives

| What | What it does | So the app |
|---|---|---|
| **Sleep** | Does the repairing. Athletes often sleep under 7 hours; adding sleep did the most for later performance (Bonnar 2018); in tennis players, sleep advice raised sleep and went with lower soreness (Duffield 2014) | Names bed time after every session that is not easy |
| **Food** | Protein through the day, about 1.6 g per kg (Morton 2018), 20-40 g a meal and some before bed (ISSN 2017). Carbohydrate matters only when the next hard session is hours away | Names protein with dinner and before bed after a big day |
| **Spacing** | Maximal jumps clear in about 48 h, heavy strength and sprints in about 72 h (Thomas 2018); sets to failure add 24-48 h (Morán-Navarro 2017); less than 6 h between strength and conditioning costs strength gains (Robineau 2016, REC-5); back-to-back hard court days pile up (Gescheit 2015, Ojala 2013) | Says "give it two days if you can" after a big leg day, and notices two hard days running |
| **Routines** | Massage, rolling, compression and cold water ease soreness; rolling more the day after (2019, 2024 meta-analyses). Stretching and breathing do not speed recovery (2021, 2025; Raidl 2026). Cold water after lifting costs strength gains (Malta 2021) | Offers one Library session for how you feel, never as repair; never cold water; breathing only to switch off |

## Footprint (#139): what a finished session left behind

One read of a finished session, **big, normal or easy**, worked out on the phone at Done and again the next morning, and in
coach.html for the "big day" pill beside the session's RPE. It is never shown to the athlete as a number.

**Big** is any one of these (`footprint.toml` → `[big]`):

| Rule | Why |
|---|---|
| Session RPE 8 or more | A hard session by the athlete's own scale. Session RPE x minutes is a valid load from juniors to elite adults (Haddad 2017). #134 The Week Line calls 8 to 10 hard too |
| Session RPE x minutes a third above their usual | A normal-feeling session that ran long is still a big dose. The usual is the middle (median) load of their sessions in the 28 days before, so one long day does not move it; with fewer than 4 such sessions the rule says nothing |
| 3 or more sets at RPE 9-10 | Sets near failure slow recovery by 24-48 h (Morán-Navarro 2017; a 2022 meta-analysis agrees) |
| 3 or more working sets of jumps or landings on a lower-body day | The Spine's `impact` (plyometric, landing). Jumps clear in about 48 h (Thomas 2018) and landings are where soreness comes from |

**Easy** is session RPE 4 or less with nothing big (the Week Line's easy band). Everything else is **normal**. A warm-up or
cool-down block never counts (the Quality check's words, `[sets]`).

It also reads, for the words and the other ideas:

- **The body areas**: every working set counted once for each of the Spine's ten areas its exercise `loads`. A day is
  **lower-body** when half its sets or more load the ankle and foot, the calf and Achilles, the knee, the hip and groin or the
  hamstring.
- **New exercises**: one with no logged set in the 180 days before (The Card Remembers has no last time). New and unaccustomed
  work causes more soreness, and the next time causes less: the repeated-bout effect (Peake 2017, Hyldahl 2017).
- **Week 1 of a cycle**, for the same reason.
- **The finish time**: 20:00 or later is late (wind down before bed); 17:00 or later is the evening (a leg session's pick is for
  tonight, Night Shift, rather than tomorrow morning).
- **Court Log**: a hard activity (logged Hard, an hour or more, the same hour as #128 Cool Down Call) the day before, or the same day.

## The Last Word (#140): tonight and tomorrow, on the finished card

On the day the session was finished, under the send status, a label (*Tonight and tomorrow*) and two or three lines in Amir's
words: one for **tonight** (food and bed), one for **tomorrow** when there is something to say (soreness after new exercises or
week 1, heavy legs, court), one for **the next hard day** after a big one. A big day gets different words from an easy one, and an
easy one gets one line. Then at most **one Library row** and **one article**.

The Library row, in this order: a sore check-in still brings The Morning After in its own words (LIB-01); a big day finished late
brings Lights Out (switching off, the one honest job of breathing); a big day or new exercises bring the Matched Pair's session.
The article: a big late day, Sleep Is Training; a big day, What Actually Helps (#145) once it is published, Eat to Train until then.

Why these words: protein and bed are the repair (above); "soreness is normal, and less next time" is the repeated-bout effect;
"give it two days" is the 48-72 h time course; "if you play tomorrow, keep it easy" is spacing without naming a rest day. Every
line is in English and Farsi (COM-1), plain and short (COM-3), formal Farsi (شما), and a draft until Amir has read it.

## Matched Pair (#143): the session follows where the work landed

Every recovery offer used to be The Morning After, a legs session, even after an arm day. Now the pick whose most-loaded area has
the most sets wins: legs → Night Shift in the evening, The Morning After in the morning; hips and groin → Low and Wide; shoulder →
Open The Cage; elbow, forearm and wrist → Racket Arm; low back → First Light. **Never a Care loading session** (Forearm Forge,
Shoulder Brake, Iron Back, Quiet Knee, Steady Spine): those are training, not recovery, and the checker refuses them.

## Day Two (#141): the morning it was written for

The Morning After was written "for the morning after, when your legs are heavy and stiff", and the app offered it the evening
before. Soreness is measured at 24, 48 and 72 hours, and easy movement the next day did the most for jump height at 24 h in a 2026
network meta-analysis (wide confidence intervals; a walk costs nothing, so it is offered without promising much). So the morning
after a big day, new exercises or a hard activity of an hour or more, Home offers one session in Green Light's row: the Matched
Pair's morning pick after a gym day; after court, The Morning After (after a match or a second hard day in a row: its own list).
It goes once opened, once a session or a check-in starts the day (a sore check-in already lowers the day, REC-2), and at midnight.

## Back-to-Back (#142): two hard days running, and a match

Cool Down Call (#128) looked only at today. Four days of long matches cut sprint and jump from day two and raised soreness every
day (Gescheit 2015), and leg power was still down two rest days after a three-day tournament (Ojala 2013). So saving a hard
activity the day after another hard day (court or a big gym day) says: *"Second hard day in a row. Tomorrow easy if you can.
Tonight: food and sleep."* with The Morning After. Saving a match offers Final Whistle, for the hour after it. Only for today's
activity. Information only (REC-7).

## What it never does

No score, ring or percentage (rounds 5 and 12). No change to any programme (REC-7, REC-2). No push and no XP for recovery (cut in
the round). No cold water after a session, no stretching or breathing as repair, no rest day named. No new table: the phone keeps
its own reads in `<id>_fpdays` (never synced) and the history (`get_my_history()`, minutes and finish time since stage128).

## Where it lives

| Piece | program.html | coach.html |
|---|---|---|
| Footprint | `footprintOf()` (twin), `footprintOfDay()`, `fpCtx()`, `fpKeep()`, `fpOnDate()` | `footprintOfC()` (twin), `footprintOfSessionC()`, `bigDayMarkC()` |
| The Last Word | `paintLastWord()`, `lastWordOf()`, `lastWordDay()`, `recSuggHtml()`, `openLwArticle()`, `arBack()` | |
| Matched Pair | `fpPick()`, `recFirst()` | |
| Day Two | `dayTwoWhat()`, `dayTwoHtml()`, in `paintWeekSugg()` | |
| Back-to-Back | `backToBackCall()`, in `coolDownCall()` | |

`scripts/check_twins.js` (section 12) holds the two Footprints equal; `scripts/headless/last-word.js` runs the finished card;
the coach harness runs the pill.
