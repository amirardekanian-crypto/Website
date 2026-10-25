# What already exists — the coaching system, app by app

Mapped 2026-09-23 from the code; corrected 2026-09-27 against PROGRAM-APP.md and the Fresh Eyes page
(the Spine, Quality Map, Because, readiness targets and the chat removal had all shipped since).
**Update this file when you find it wrong**; a stale map is how an idea gets pitched for a feature that
already shipped. Line numbers drift, so search by function name.

## The data, and what it is keyed on

- **An exercise has an identity since the Spine** (2026-09-24, stage31): `exercises` (athlete-readable
  once approved: purpose, pattern, up to three of the ten qualities, 3 cues, regressions / progressions /
  alternatives as ids or plain names, body parts + impact, muscles, equipment, video) and
  `exercise_coach` (coach-only: SFR, flags, volume credits). About 220 entries. A card resolves by
  `exId`, then name and aliases (`spineFor()` / `spineForC()`). The entry's `video` is the only video
  source; `exercise_library.json` and its Notion sync were retired on 2026-09-26.
- **Programme record** (`public.programs`, via `get_program()`): `athlete{}`, `sport{badge}`,
  `cycles[]` (name, tagline, `art`, weeks, dates, `focuses[]`, `message{paragraphs,outcomes}`,
  `teaser`, `weekNotes{first,last}`), `workouts.days[]` (`focusTag`, completion title and message) →
  `blocks[]` (`title`, `rest`) → exercises (`rx`, `exId`, `intent`, `note`, `why` for a Because, `test`,
  circuits with `items[]`; legacy cards still carry `chips`, `cues`, `setup`), `programHistory[]`,
  `notes.cards[]`. **No week level:** the days repeat every week of a cycle; only week 1 and the
  back-off week have words of their own.
- **What the athlete logs:** per set weight (`w`, with last time's as `lw`) + reps (`n`, only when not
  the prescribed number) + RPE + done; a per-exercise note; a per-session note (`snote_`); the check-in
  (sleep, energy, soreness, stress, overall), which since 2026-09-26 sets today's targets (REC-2:
  `level`, `sore`, `drop`, `asWritten`, stored with the session); session RPE + duration (session load =
  RPE × minutes). **No structured pain field** (pain is free text). **No court or match log.** Goes to
  `session_history` via `save_session` (a structured `log` since 2026-09-24) and `athlete_progress` via
  `save_progress`. A session stays live 6 h past midnight; an unfinished day is asked about on the next
  open.
- **Coach-only:** `coaching_logs` (per-exercise rationale, volume tables, progression rules, the
  Exercise Ledger of kept/replaced/removed), `call_logs`, `cycle_reports` (saved, never shown).

## program.html (coached athletes)

Home (since 2026-10-12: the greeting, This Week = the week note in its own week with the "2 of 3 sessions
done this week" line under it, Next up as the day's cover, the other days as paper rows, then the habits
row with AA Proof's Today embedded under it; never a rest day) · Progress, the second tab (the This cycle
card with up to three effort-matched wins from `cycleWins()`, Your numbers = Personal Records and body
weight, then the road of cycles still titled Game Plan, Why your plan) · the session (slim bar, tabs hidden; the
working card: one line of numbers, the intent pill, a clay dot for a Coach's Note, the ⓘ; open: the
note, Last time, How to do it, the set rows; the check-in sets today's targets; Guided; a rest timer
that keeps time from a timestamp; one finish that sends itself) · Personal Records (fill themselves;
+ Log a max) · Body weight · Coach tab (WhatsApp first, notes cards, the guide in a sheet) · Library
(Sessions, Playbook, Exercises) · Archive · the initials menu (theme, install, help, privacy, sign out).

**Built since the map:** #1 The Spine, #2 The Quality Map, #4 Because, #5 The Card Remembers, #12 as
the `/cycle-report` skill, and the Fresh Eyes work (PROGRAM-APP.md has each). **Gaps still open:** cycle
outcomes are never checked in the app; court and match load are invisible; the Library meets the
programme at only two moments (LIB-01, 2026-09-27: a sore check-in offers The Morning After, a finished
week offers Green Light); a flagged pain is never asked about again.

## coach.html

Tabs: Today (counters, wall, Needs-you, quests, Proof pulse) · Intake (`hab_intake`) · Athletes
(roster, publish, backup, logins) · Exercises (the Spine editor, the ten qualities, the Quality check) ·
Proof · Links · Affiliates · Testing app · Course. Athlete file: The work (ACWR, readiness vs baseline,
adherence, Personal records, planned-vs-done per day by exercise name, the day's targets, inline
editor) · Proof · Calls · File (versions, coaching log). The Chat sub-tab went on 2026-09-26: a session
note is only marked read, and Amir answers on WhatsApp.

**Checked 2026-10-24 (round 5):** Needs you reasons are note to read, not synced, low run, cycle ended / ending, no
login, new signup, no session for 7+ days, silent on Proof, ready to upgrade (`reasonsOf`). The WhatsApp buttons open
`wa.me` and log nothing; only Courtside stamps `sent_at`, so there is no record of Amir's last contact. Pausing
(`athlete_status` paused / former, stage63) is coach-only; paused weeks are no week in the rulebook. Push has four
switches (habits, workout, crew, cycle, stage84-87); crew replies have no push. program.html has no welcome-back
screen and nothing compares habits with readiness.

**Crew since the Players' Lounge went LIVE (2026-10-24, stage96 + stage97, sw v223; docs/ref/program-app/54 + 55):** every
crew name opens a **Player Page** (`screen-crewplayer`, `openPlayer(ck)`, server `crew_page()`), and every person carries `ck`
(crew_key) and `fv` (face version) in get_bell, the board, replies and the Open. Faces (`crew_faces`, not backed up), the Cheer
to a person (`crew_cheers`, all-time `crew_cheer_tally` = cheers received; a like is not a cheer, stage98), band faces with a held ring and New Balls,
Your game (`athlete_profile`, backed up, read by /program-design as `ctx.game`), the face stack on achievements
(`crew_award_likes`), @names (`crew_mentions`) with aimed pushes (cheer, reply, mention), the cycle bars (others see this week
only), First Serve on Home (push.md: three ask moments), partner codes (`affiliates.kind='athlete'`, `referral_credits`, 10% for
the friend and 10% off one cycle per friend for the member), the stamp on photo posts, the Open Wall. The paragraph below is
the state BEFORE the build, kept for its traps.

**Crew, checked 2026-10-24 (round 6, before the build):** program.html's Crew tab (`renderCrew`) = the week band (initials, a door to *In the
crew*), honours, the Monthly Open card, the Bell (posts with photos, folded session lines, moment lines, replies), *This season*.
There is **no page per person**: a name leads nowhere, and *In the crew* lists names with a level only. Posts, photos and likes are
deleted after 7 days (stage81's sweep, `line_day < current_date - 7`). Faces are initials (`crewInitials`); the only photo picker is
Highlight Reel's (`hlPhotoPick`, share cards). `CREW_KINDS` are the athlete's switches (session, level, week, mark, achievement, best,
cycle, honour, open). The programme's `sport.badge` is free text that can name an injury. Plan weeks run from the cycle's start day,
not Monday. coach.html's Affiliates tab (stage29) has an `athlete_id` column and counts codes from the intake form (`affUses`).
Welcome is one overlay (`maybeWelcome`); there is no first-week list. **No stable person id reaches the phone**: every crew
list carries a display name only (`crew_key` exists on the server, only inside Bell-line keys). Crew push is a broadcast + a
15-minute fold (`crew_push_fold`), 11 kinds, nothing aimed at one person except a lone like; replies ring nothing. **Share cards
already include `player` ("Your card": level, weeks, sessions, bests, comebacks, lifts) and `session` (with the athlete's photo)**
(assets/js/sharecard.js). The referral side has no payments data at all (`check_discount` is the only validator; form-fa.html
ignores `?code=`).

**Gaps found:** Needs-you lists a run of low days (since 2026-09-26) but still does not fire on ACWR
spikes, RPE drift, pain words or due retests; intake brief is pulled from Gmail though `hab_intake` has
it; handoff-brief gates are not tracked; testing-app results never meet coached athletes.

## The pipeline (`.claude/skills/program-*`)

Intake → roadmap (5 cycles × 5 weeks, locked) → design (SFR, carryover, injury rules, PROGRESS /
REPLACE / ADD against the ledger) → engage (messages, outcomes, notes, completion text) → assemble
(`rx`, publish by SQL) → edit. Principles in `.claude/COACHING-PRINCIPLES.md`: **RPE never load**
(a weight only in the Coach's Note), RPE ≥ 6, −1 RPE on low-readiness days, a defined minimum dose,
tempo said once, fixed block order, 10–20 sets per muscle per week.

## TPS course app (`tennis/app/app.js`, Farsi, content in `tps_content`)

Exercises: `purpose`, `tennis`, `cues`, `avoid`, `mistakes`, **`easier`/`harder` as free text, not
links**, `equipment`, `tags[]` (regions), `impact`, `u16`, `slot`. **"Used in" is computed at
runtime** in `viewExercise` by walking the programme. The only id-to-id link is a programme item's
`{ex, alt}`. Also: 16 weeks × 4 blocks, step mode, 22 lessons, 7 tests, 1RM calculator, Yo-Yo
player, results sheet (not saved), guide, tour. No "quality" field.

## AA Proof (`habits.html`)

Daily habits (train, steps, sleep, protein, water core; add-ons), XP, levels, ranks, seasons, Roll
Call, leaderboard, Locker rewards. WORKOUT is ticked from `session_history`.

**Recognition and the game, checked 2026-10-17 (round 3):** the training app has **no share card** (Proof
has five, all habits); wins (`cycleWins()`) and automatic Personal Records exist **only in program.html**,
coach.html has no copy; Proof's session streak is **calendar days in a row** (`habitStreak()`), so on a
2-4-day plan (31 of 38 that day) it breaks on every rest day and its ladder (5/10/20/30/60 days) is out of
reach; roll call had **0 lines in 7 days** with 22 on the board; 19 of 38 programmes trained in the last
28 days, at 1.4 sessions a week. Sleep hours are logged
here **and** asked again in program.html's readiness modal; the two are never compared. Since
2026-09-26 Proof's Today is embedded on the training app's Home (`?embed=1`), and a coached athlete is
no longer asked to install Proof as a second app.
