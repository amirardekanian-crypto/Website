## 🌙 The Changeover (round 14, 2026-11-24): what the app says after a session, tonight and tomorrow

An athlete asked how the app could tell them how to recover after training. The evidence brief for the round (50 papers, pitch page linked from
`.claude/skills/ideas/BANK.md` → Round 14) said sleep, food and how the next 48 hours are spaced do the recovering, and a routine after the session
mostly changes how you feel. Amir took every idea in one line: *"go with your picks and build all"*. Built here: **#139 Footprint**, **#140 The Last
Word**, **#141 Day Two**, **#142 Back-to-Back** and **#143 Matched Pair**. #145, the article, is its own run. The numbers and the words are in the
`recovery/` folder (`recovery/README.md`, the plain account `recovery/RECOVERY.md`, the functions step by step `recovery/PROCEDURES.md`). The rules are
in `docs/rules/recovery.md`.

### What it does

- **#139 Footprint** (`footprintOf()`): one read of a finished session, **big, normal or easy**. Big is any one of: session RPE 8 or more, session
  RPE x minutes a third above the athlete's usual (the median of their last 28 days, silent under 4 sessions), 3 or more sets at RPE 9 or 10, or 3
  or more working sets of jumps or landings on a lower-body day. Easy is session RPE 4 or less with nothing big. It also reads the Spine's ten body
  areas, new exercises (no logged set in 180 days), week 1, the finish time (20:00 is late, 17:00 is evening) and Court Log around the day. Worked out
  at Done and again the next morning, in coach.html as the "big day" pill. **Never shown to the athlete as a number.**
- **#140 The Last Word** (`paintLastWord()`): on the day a session is finished (until 06:00 the next day), under the send status, the label
  *Tonight and tomorrow* and up to three lines in Amir's words, one each for tonight, tomorrow and the next hard day. Then at most one Library row
  and one article (`.lw`, `.lw-k`, `.lw-l`, `.lw-rows`). It replaced the sore-only call on that slot.
- **#143 Matched Pair** (`fpPick()`): the Library session follows where the work landed. Legs get Night Shift in the evening or The Morning After,
  hips and groin Low and Wide, shoulder Open The Cage, elbow, forearm and wrist Racket Arm, low back First Light. Never a Care loading session. A big
  day finished late brings Lights Out first. One offer per finished day: once it is opened, no other session takes its place.
- **#141 Day Two** (`dayTwoWhat()`, `dayTwoHtml()`): The Morning After was written for the morning after and was offered the evening before. Now
  the morning after a big day, new exercises or a hard activity of an hour or more, Home offers one session in Green Light's row: the Matched
  Pair's morning pick after a gym day, The Morning After after court, and **Talking Pace** (`day-after-match`, new on the Recovery shelf: 20 easy
  minutes at a talking pace, then hips, back and racket arm) after a match or a second hard day in a row. It goes once opened, once a session or
  check-in starts the day, and at midnight.
- **#142 Back-to-Back** (`backToBackCall()`, first inside `coolDownCall()`): saving a hard activity the day after another hard day (court or a big
  gym day) says *Second hard day in a row. Tomorrow easy if you can. Tonight: food and sleep.* with The Morning After. Saving a match offers Final
  Whistle. Only for today's activity.
- **#144 Stacked** is coach-only: one line on the athlete's file in coach.html (`COACH_DASHBOARD.md` → *14. Stacked (2026-11-24)*), and /cycle-report's Q8.
- **The guide** has a card, `key: 'recovery'` in `APP_GUIDE`, *After a session: tonight and tomorrow*. A news entry goes with it when it ships
  (`assets/news.json`).

### The data

- **`AAREC`** (`window.AAREC`, `assets/js/recovery.js`, English only): built by `python scripts/build_recovery.py` from the three files in
  `recovery/`: `footprint.toml` (the numbers), `last-word.toml` (the lines, Back-to-Back's words and the article rules) and `matched-pair.toml` (the
  map, Day Two's words and the words after each session's name). Both apps load it. `program.html` loads it deferred and redraws on arrival
  (`recReady()`).
- **`<id>_fpdays`**: the last 10 Footprints this phone worked out at Done, for Day Two the next morning. A view, never progress: `_snapshot()`
  skips it and it is never synced. The history is the other source (`fpOnDate()`).
- **`get_my_history()` since stage128** (`supabase/stage128_history_minutes.sql`, applied live 2026-11-24): each row also carries `duration_min`
  and `fin`, read by `histFromRows()` as `mins` and `fin`, so the phone can work out the usual. A phone before it has no load and the load rule
  says nothing.
- **`<id>_libseen`** now also notes every session and article the rules can offer (`recOffers()`, an article as `a:<slug>`), so a row goes once
  opened.
- No new table, so nothing for `BACKUP_TABLES` or the erase list.

### The traps

- **Never a score.** Footprint is a read, not a number, a ring or a level (rounds 5 and 12). The athlete reads words and the coach sees a pill.
- **Information only** (REC-7, REC-2). Nothing here changes a set, a rep, an RPE, a day or a load.
- **Never a rest day named, never cold water after a session, never breathing or stretching sold as repair.** `scripts/check_recovery.py` refuses
  the words. Never a Care loading session as recovery.
- **LIB-01 has more moments now.** The Morning After still comes after a sore check-in, and the rule's wording is in `docs/rules/recovery.md`.
  Every row the recovery rules can offer is a "seen" row too (`markLibSeen()`).
- **The finished card's row order changed.** In the day view's grid the suggestion slot is now **row 7**, the habit card **8** and the WhatsApp
  card **9** (the slot was 9, the habit 7 and WhatsApp 8). The rate fold and what follows are unchanged. Anything placed on that card by row
  must be checked against this.
- **The article's ← returns to the card** (`arBack()`, `_arReturn`), as a suggested session's does (`_wsReturn`). From elsewhere it still goes
  to the Library.
- **A twin.** `footprintOf()` and coach.html's `footprintOfC()` are held equal by `scripts/check_twins.js` section 12. Change both or neither.
- **`finishDay()`'s save path is never touched.** Footprint reads the record with `buildSessionData()` and changes nothing.
- **Only on the day.** The Last Word is for tonight, so it is not drawn after 06:00 the next day, in the coach's preview, or without rules. Then
  the card is as it was.

### Farsi

`scripts/i18n/fa/29-recovery.json` is **generated** from the toml (the Farsi of every line, `build_recovery.py`) and is never edited by hand.
`scripts/i18n/fa/30-changeover.json` is **hand-written**: the guide's card and the words around the lines that are not in the toml. Both are
formal (شما) and drafts until Amir has read them. After either, `node scripts/build_i18n_fa.js`, then bump the i18n-fa `?v=` (program.html and
`sw.js`'s SHELL).

### Tests

- `node scripts/check_twins.js` section 12: Footprint's two copies, equal on the same sessions, with a few answers pinned.
- `python scripts/check_recovery.py` (pre-commit guard 32): ranges, facts, sessions, the word rules, Farsi present, built files fresh.
- `node scripts/headless/last-word.js`: the finished card, Day Two and Back-to-Back.
- `node scripts/headless/coach/run.js`, scenario `footprint-big-day-pill`: the pill after the sRPE, its reason in the title, none on an RPE 6.

*Ideas bank: `.claude/skills/ideas/BANK.md` → Round 14. Back to the index: [`PROGRAM-APP.md`](../../../PROGRAM-APP.md).*
