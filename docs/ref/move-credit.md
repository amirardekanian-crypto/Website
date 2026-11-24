# Court Log counts toward Steps: the MET table and where each number comes from

Built 2026-11-22 (stage121; Amir: *"lets do option 1 / get a good equal of padel as well, add cycling as well, and a few more
options like beach tennis"*). The rule is in [`docs/rules/habits-in-app.md`](../rules/habits-in-app.md); this is the evidence.

## The arithmetic

- One activity = `round(minutes × MET ÷ 3.5) × 100` steps. Walking at ~100 steps a minute is ~3.5 MET (Compendium 17200 brisk
  walking is 4.8; level walking at ~5 km/h is ~3.5), so one MET-minute is ~28.6 steps.
- A day's credit is the sum, capped at 70% of the Steps target (7,000 of 10,000). Steps also count the hours not spent sitting,
  and a watch worn on court has already counted some of those steps.
- **From 2026-11-24 the cap is 100% of the day's target** (stage127, #136): `move_cap_on(day)` answers 0.7 before
  `move_full_from()` and 1.0 from it. Under 70%, an hour of tennis paid 42 Steps XP while 10,000 steps walked paid 72 (Amir:
  *"those who walk get more xp compared to those who play tennis"*). Days before keep 70% (D20).
- Steps for the day = typed + credit. Paid through the Steps habit only, so it is paid once.
- Forward only (D20): from 2026-11-22.
- Bodyweight is not needed: walking and the activity both scale with body mass, so it cancels out of the conversion.

Two copies: `public.activity_met()` / `move_steps_credit()` (the server, which pays) and `MOVE_MET` / `moveCreditOf()` in
program.html (what the phone shows). `scripts/check_twins.js` holds them equal.

## The table (MET for easy / normal / hard)

| Kind | Easy | Normal | Hard | Source (C = 2024 Adult Compendium, F = field study, A = by analogy) |
|---|---|---|---|---|
| Tennis | 5.0 | 6.8 | 8.0 | 15695 hitting (C), 15675 general (C), 15676 competitive (C) |
| Match (tennis) | 6.8 | 8.0 | 8.5 | 15675 (C), 15690 singles (C), match VO2 26.6–29.9 ml/kg/min = 7.6–8.5 MET (F, Cádiz Gallardo et al. 2023 review) |
| Padel | 5.0 | 6.0 | 7.0 | No Compendium entry. Carrasco et al. 2011, first-level young players, 24.1 ml/kg/min = 6.9 MET (F); easy/normal by analogy with tennis doubles and paddleball (A) |
| Beach tennis | 5.0 | 6.0 | 7.5 | No Compendium entry, no gas-analysis study. Jung et al. 2024 (Front Physiol), ~66–76% HRR, wearable estimate ~7.0–8.8 MET, scaled down (A from F) |
| Pickleball | 4.0 | 4.5 | 6.0 | Smith, Buchanan & Dalleck 2018, doubles, 4.1 ± 1.0 MET, older adults (F); hard by analogy with tennis doubles 15680 (A) |
| Squash | 6.0 | 7.3 | 10.0 | 15652 general (C); hard capped like racquetball competitive (A) |
| Badminton | 5.5 | 7.0 | 9.0 | 15030 social, 15020 competitive, 15025 match play (C) |
| Running | 7.5 | 9.3 | 11.0 | 12020 jogging, 12050 ~10 km/h, 12070 ~11.3 km/h (C) |
| Cycling | 4.0 | 6.8 | 10.0 | 01010 leisure <16 km/h, 01020 16–19 km/h, 01040 22.5–25.6 km/h (C); indoor similar |
| Swimming | 5.8 | 8.0 | 9.8 | 18240 slow, 18290 medium, 18230 fast (C) |
| Football | 5.0 | 7.0 | 9.5 | easy by analogy (A), 15610 casual (C), 15605 competitive (C) |
| Gym | 3.5 | 5.0 | 6.0 | 02054, 02052, 02050 (C) |
| Other | 3.5 | 5.0 | 7.5 | circuit training light / moderate / vigorous as a scale (A) |

An hour of normal tennis is 11,700 steps of work, so it reaches the cap (70% before 2026-11-24, the whole target from then).

## Move minutes: one weekly number (stage127, 2026-11-24)

Ideas #134 and #135 (round 13 'The Whole Week'). The rule is in [`docs/rules/habits-in-app.md`](../rules/habits-in-app.md); the
XP is [`docs/rules/career.md`](../rules/career.md). **Move minutes = minutes × MET ÷ 4, for every minute at 3 MET or more**, so an easy
minute is about 1 and a hard one about 2. Worked out once, on the server (`move_parts()` / `move_week()`), and read by both apps
from `get_five_weeks()`: there is no phone copy of this arithmetic.

| Source | Minutes | MET |
|---|---|---|
| Plan session | the finished-session fact's minutes (the athlete's median of the last 120 days if missing, else 60) | the Gym row by session RPE: 1–4 easy 3.5, 5–7 normal 5.0, 8–10 hard 6.0 (no RPE: normal) |
| Library session | its duration | its own `met.value` (stage129, `move_lib_met()`), from a named 2024 Adult Compendium entry; the table below. A row without one falls back to its shelf's default (`move_shelf_met()`) |
| Court Log | its minutes | the table above (`activity_met()`); a `gym` row on a day with a plan session counts once (the plan's) |
| Walking | typed steps over 5,000, minus 100 a minute of any run that day (Court Log runs and the two Library runs), at 100 steps a minute, at most 60 a day | 4.0 (brisk walking) |

### Library sessions: each one carries its MET (stage129, 2026-11-24)

Amir, on stage127's shelf values: *"fix this"*, then *"every session in the library needs to calculate this when uploading and add
it"*. Each session's JSON and its `public.library` row carry `met` `{ value, code, entry, source }`, the 2024 Adult Compendium
entry closest to what the session is, averaged over its rests (pacompendium.com, read 2026-11-24; the site marks some values as
estimates, in red, which a text read cannot see). `/workout` sets it on every new session; pre-commit guard 14b
(`scripts/check_library_met.py`) blocks a file without one.

| Sessions | MET | Compendium entry |
|---|---|---|
| Conditioning: Floor Engine, Deep Water, Deuce Point, Hold the Line | 7.0 | 02210 High intensity interval exercise, moderate effort |
| Open Road (steady run) | 7.5 | 12020 Jogging, general, self-selected pace |
| Engine Builder (easy, conversational) | 6.0 | 12010 Jog/walk combination |
| Rolling Start (run warm-up) | 4.8 | 12025 Jogging, in place |
| On-court drills (all but the warm-up) | 6.0 | 02032 Circuit training, body weight exercises (no plyometrics or agility entry exists) |
| Tennis Warm-Up Routine | 5.0 | 15695 Tennis, hitting balls, non-game play, moderate effort |
| Ground Work, Banded Lower Burner | 3.8 | 02022 Calisthenics, moderate effort |
| Full-Body Power (barbell squat day) | 5.0 | 02052 Resistance (weight) training, squats, deadlift |
| Serve Armour | 3.5 | 02054 Resistance (weight) training, multiple exercises, 8-15 reps |
| Torque (trunk) | 3.0 | 02056 Body weight resistance exercises, general |
| Care (all seven) | 2.8 | 02024 Calisthenics, light effort (no rehabilitation entry exists) |
| Mobility and Recovery (all) | 2.3 | 02101 Stretching, mild |
| Breath (all three) | 1.0 | 07075 Meditating |

Under the 3 MET floor (care, mobility, recovery, breath) a session counts no Move minutes; it still shows on Your weeks. stage127's
guesses were higher for conditioning (8.0), strength (5.0, the barbell value, for bodyweight sessions too) and care (3.5). The
plan's Gym row (3.5 / 5.0 / 6.0 by RPE) already matches 02054 / 02052 / 02050. The steps credit is never turned back into minutes,
so court time is counted once.

**Where each number lives.** The line (300, the WHO upper line), the mark drawn on it (150, the WHO minimum), `per`, `met_floor`,
`walk_floor`, `walk_steps_per_min`, `walk_cap`, `walk_met` and the XP: `career/rulebook.toml` → `[fact.move_week]` (read by
`move_rule()`). A Library session's MET: its own `met` (above); the shelf defaults for a row without one: `move_shelf_met()` in
`supabase/stage129_library_mets.sql`, between `MOVE_SHELF_BEGIN` and `MOVE_SHELF_END`. The Gym row: `activity_met('gym', …)`, the table above.

## Where the evidence is thin

Padel (one VO2 figure, young high-level players: recreational padel is likely lower), beach tennis (no VO2 study), pickleball
(one small study, older adults), squash (no modern VO2 study). Racket-sport METs are averaged over the whole session, rest between
points included. The same effort costs a fit athlete more absolute MET, so the table may undercount competitive players.

Sources: [2024 Adult Compendium](https://pacompendium.com/adult-compendium/) (Herrmann et al. 2024, J Sport Health Sci) ·
[Cádiz Gallardo et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10101231/) · [Paulauskas et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12213881) ·
[Jung et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11557381/) · [Smith, Buchanan & Dalleck 2018](https://ijrep.org/?p=2291)
