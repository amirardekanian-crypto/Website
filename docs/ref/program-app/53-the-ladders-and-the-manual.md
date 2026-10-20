# 🪜 The ladders come back, and the app finally explains itself (2026-10-20)

Amir: *"i used to have loads of achievements related to my habits in proof or habits.html / i want them back audited and
added to ones i have now in the right place"*, then *"if you look at the image, i liked the icons and how the bar under
was like that, apply the current design but bring these back, you can create new icons"*, and *"we used to have a what
all this means, and explanation of how habit system works, and how the xp works, what the prizes are. put it where you
think is a fit in new app"*.

Three things in one pass: the row, the ladders, and the manual.

## 1. The habit row wears its icon again, and the meter is back under the name

Direction B of three (the others kept: **A** the emoji restored exactly as AA Proof had it, **C** every icon in Centre
Court green with colour reserved for progress). Amir: *"B"*.

- **The circle is the tick, and it carries the habit's icon.** A 42 px circle, the habit's colour on the rim and its
  tint inside, with the icon drawn at 21 px from the app's own set (`window.__ICONS`) rather than an emoji. A tick fills
  the whole circle green. `habIconKey()` maps the eight built-in habits to icons; four of those icons are new (`steps`,
  `water`, `breathe`, `supps`) and the other four already existed, so a habit row and a door row are drawn by one pen.
  A habit of the athlete's own takes the icon its name's emoji resolves to, and `activity` when it has none.
- ⚠️ **The habit's colour labels a row. It is never an accent.** The app still paints with one accent and it is clay.
- ⚠️ **Dark mode drops the tint, never the rim.** `HABIT_HUES`' second value is a pale pastel built for paper; a pastel
  disc on near-black is the brightest thing on the card, and a habit row is not the loudest thing on Home. In dark the
  circle's background is transparent and the colour stays on the rim and the icon.
- **One pip per step, never a straight bar** (Amir's old note on water and protein: *"its not a straight bar"*).
  `habBarHtml()` is `segBar()` cut out of AA Proof: one pip per step of the habit, capped at 20, the leading part-pip
  dimmed. Eight glasses is eight pips and one tap fills one, which a 0–100% bar could never say. It is drawn only for a
  habit you count.
- **The line under the name says what is LEFT, never where you are** (*"3,500 steps to go"*). The − and + already say
  the number. A habit you tick rather than count says what it asks for instead, which is how the session's row stopped
  reading *Not yet* at someone who has not trained yet today.
- This reverses the 12 October decision that took the per-row bar out. That bar was a 54 px straight one that took the
  name's room and said nothing with it; this one counts glasses.

## 2. Rulebook version 10: AA Proof's ladders, as achievements

Amir: *"lets have 3 rungs, 5 core habits / but have some about days that count, perfect days, days in row / we dont want
duplicates ofcourse. but you can be creative"*, and Proof's names back, in caps.

AA Proof had 31 of these in **families**: one name earned again at a higher bar. The cut (stage78) removed them as
badges and nothing replaced them. Version 9, that morning, added ten plain ones. **Version 10 makes those ten the first
rung of the families they always belonged to** — a rename only, same ids, same XP, every award already minted untouched
— and builds twenty more on top.

| Family | Measure | I | II | III |
|---|---|---|---|---|
| HUMAN SPRINKLER | `streak:water` | 7 | 21 | 60 |
| BLACKOUT ARTIST | `streak:sleep` | 7 | 21 | 60 |
| FULLY FUELLED | `streak:fuel` | 7 | 21 | 60 |
| GROUND COVERED | `streak:steps` | 7 | 21 | 60 |
| HEAVY METAL | `streak:strength` | 3 | 5 | — |
| UNBROKEN | `dayStreak` | 7 | 30 | 100 |
| CLEAN SWEEP | `perfectDays` | 1 | 10 | 30 |
| DAWN PATROL | `daysWith3` | 1 | 10 | 50 |
| ON TARGET | `qualify` | 10 | 50 | 150 |
| BACK IN THE FIGHT | `comebackRun` | 7 | 21 | — |

Plus the two step totals, renamed out of a collision: QUARTER OF A MILLION and THE MILLION.

Three rules the ladder keeps, two of them AA Proof's own:

1. Inside a family, a higher mark always pays more than the one below it.
2. Whichever habit an athlete favours, there is always a next rung in something they actually do.
3. A week, three weeks, two months — one shape for all four daily habits, so the manual says it in a line.

⚠️ **The session stops at two rungs, on purpose.** Proof's HEAVY METAL went to 30 days running, which is an app paying
an athlete to skip every rest day their coach wrote. Three days and five days are a block. Past that the ladder is
Century's marks (25 · 50 · 100 · 200 · 500) and THE MACHINIST at 150, and a third rung here would pay twice for one
day's work.

⚠️ **No HARD TO KILL.** Proof's HARD TO KILL I and II (3 and 5 comebacks that stuck, 300 and 600 XP) already came back
as `badge.comebacks`: same name, same numbers, same XP, and a third tier at 10. BACK IN THE FIGHT stays, because
nothing else counts the days *after* a comeback.

⚠️ **Mobility, breathing and supplements have no ladder.** Amir chose the five core habits. ZEN MACHINE, RUBBER BAND and
IRON MONK stay out, so Proof's rule 2 above is kept only for the five. Every measure they would need already works.

⚠️ **Every entry is `origin = "new"`, including the ones wearing Proof's names.** `origin = "proof"` is not a label, it
is a claim `career_compare()` checks: it means AA Proof's own client pays this too. These rows AA Proof never knew.

Nothing needed new SQL except `supabase/stage94`: `career_entry_kinds()` had no case for `dayStreak`, so the two live
day-streak achievements never woke on the partial evaluate after a save and minted only at the next `get_profile()`.
`qualify` needed one word in `scripts/check_career.py`, which refused it in a `proof_measure` although
`career_proof_key()` has always named it.

## 3. "How it works": the manual, one page for the whole system

AA Proof had one, called *The manual*; this app had the guide, which says how to **use** it and never what anything is
**worth**. `#screen-system`, reached from a door on the habits page and a door on Achievements, its ← going back to
whichever opened it. Nine folding sections on the help sheet's own `.note-card` list, the first open on arrival: Start
here · What makes a day count · What your habits pay · What training pays · Your level · Achievements · Your four
numbers · Your moments · Who decides, and when.

⚠️ **Every number on that page is READ, never typed.** The habits' prices come from the engine's own `XP_RULES` (which
is the server's `hab_xp()`), the training prices from `get_profile()`'s own `rules.prices`, the counts from the same
achievements answer the cabinet reads, the marks from `careerMarks()`. A manual that quotes a figure is a second copy
of that figure, and the two drift the first time Amir changes one. A section whose numbers have not loaded does not
draw its price list rather than drawing zeros.

That last rule is why stage94 also widens `get_profile()`'s price whitelist: it was written before the day itself paid
anything (stage90, the same morning), so the page could say what a session is worth and not what a day is worth.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
