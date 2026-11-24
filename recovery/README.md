# Recovery after a session: the folder

Round 14 'The Changeover' (2026-11-24). An athlete asked how the app could tell them how to recover after training. The
evidence says sleep, food and how the next 48 hours are spaced do the recovering, and a routine after the session mostly changes
how you feel. Amir took every idea of the round in one line (*"go with your picks and build all"*). This folder holds the numbers
and the words those ideas run on, in files Amir can read and change, the way `career/` holds Career Mode.

## What is here

| File | What it holds | Open it when you want to |
|---|---|---|
| [`RECOVERY.md`](RECOVERY.md) | The plain account: what each idea does, why, and the evidence behind every number | Understand it, or check a line is still true |
| [`PROCEDURES.md`](PROCEDURES.md) | How each function works, step by step, and how to change something and ship it | Change a number, a line or the map |
| [`footprint.toml`](footprint.toml) | Footprint (#139): what makes a session big, normal or easy, and the facts the other ideas use | Change what counts as a big day |
| [`last-word.toml`](last-word.toml) | The Last Word (#140): the lines on the finished card, English and Farsi, and Back-to-Back's (#142) | Change what the athlete reads |
| [`matched-pair.toml`](matched-pair.toml) | Matched Pair (#143): which Library session fits which body area, and Day Two's (#141) words | Change which session is offered |

## How it reaches the apps

`python scripts/build_recovery.py` turns the three files into `assets/js/recovery.js` (`window.AAREC`, English only), which
program.html and coach.html both load, and `scripts/i18n/fa/29-recovery.json`, the Farsi of every line, which the app's word
lists swap in on a Farsi phone. `python scripts/check_recovery.py` refuses a file that would break the apps or the rules (the
pre-commit hook runs it, guard 32). The steps for shipping a change are in [`PROCEDURES.md`](PROCEDURES.md).

## The rules that hold whatever the files say

- **Never a score.** Footprint is never shown to the athlete as a number, a ring or a level (rounds 5 and 12 cut that). The
  athlete reads words; the coach sees a "big day" pill.
- **Information only** (REC-7, REC-2). Nothing here changes a set, a rep, an RPE, a day or a load. Court Log informs; Amir decides.
- **Never a rest day named** (athletes move their days), **never cold water after a session**, never breathing or stretching
  sold as repair. The checker refuses the words; the lines say sleep and food.
- **The ideas bank** is `.claude/skills/ideas/BANK.md` → Round 14; the pitch page is linked there.
