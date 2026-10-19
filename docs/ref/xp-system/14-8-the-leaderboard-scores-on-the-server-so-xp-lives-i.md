## 8. The leaderboard scores on the server — so XP lives in TWO places

> **⚠️ The one thing that can get out of sync.** The leaderboard recalculates XP
> **in the database** rather than trusting the number a phone sends, so nobody can
> reach the top by editing their own storage. The price is that the scoring rules
> exist twice:
>
> | Where | What | When to change it |
> |---|---|---|
> | `XP_RULES` and its sibling constants (`HABITS`, `CONSISTENCY_TIERS`, `ACHIEVEMENTS`, `QUEST_POOL`, `PASS_TRACK`, …) in `habits.html` | What each athlete sees in their own app | Always |
> | the `xp_rules` table row in Supabase, and a few SQL function bodies | What the leaderboard ranks people by | Always, at the same time |
>
> If you change one and not the other, athletes' own screens and the leaderboard
> will quietly disagree — the worst class of bug in this app, because nothing errors.

### Everything scored twice — change both, or they disagree

The Supabase copy is **one row**, `public.xp_rules where id = 1`, holding one `rules`
object. **It has 18 keys** (read from the live row, 2026-09-26), and every one but
`questRuns` mirrors something in `habits.html`:

| `xp_rules` key | `habits.html` | What breaks if they drift |
|---|---|---|
| `base`, `growth` | `XP_RULES.base` / `.growth` | Levels differ between board and phone |
| `completionBonus`, `customXp` | `XP_RULES.completionBonus` / `.customXp` | Daily XP differs |
| `weights` | `XP_RULES.weights` | Every habit's value differs |
| `targets` | `HABITS[].target` | What counts as "done" differs |
| `streakQualifyPct` | `XP_RULES.streakQualifyPct` | Which days count differs — the `qualify` quest and the comeback pay on one side only |
| `unearnable` | `HABITS[].locked` | The streak **gate** differs — a rest day counts on one side only (stage19) |
| `gateV2` | the two-door rule in `dayQualifies()` | Which days count differs — same fallout as `streakQualifyPct` (stage22) |
| `lapseDays`, `comebackXp`, `comebackStick` | `LAPSE_DAYS`, `COMEBACK_XP`, `COMEBACK_STICK` | **The comeback pays on one side only** (stage22) |
| `maxCustom` | `MAX_CUSTOM` | A tampered log outscores the board (stage24) |
| `tiers` | `CONSISTENCY_TIERS` | Badge XP differs |
| `milestones` | `ACHIEVEMENTS` (32 rungs) | Milestone XP differs |
| `quests` | `QUEST_POOL` | A quest pays on one side only |
| `passTrack` | `PASS_TRACK`, plus the event titles in `EVENTS` | **The server refuses a title the app already gave** |
| `questRuns` | — (cached on the phone as `CFG.questRuns`) | Server-only; written by `set_quests()` / `end_quests()` / `clear_quests()` |

⚠️ **And a third copy, until the catalogue switch** (phase 1, `supabase/stage66_career_mode.sql`, 2026-10-17):
`career/rulebook.toml` → `[habits]` (the weights, targets, gate, lapse and custom numbers), `badges.toml` (the tiers and the
milestone families, with `proof_measure`), `achievements.toml` (FIRST BLOOD, THE MACHINIST, THE CENTURION) and `missions.toml`
(the quest pool, `proof_kind`, `proof_need`, `proof_xp`). Career Mode scores habits with them through these same SQL functions,
and `scripts/check_career.py` (pre-commit, also when `supabase/xp_rules_snapshot.json` is staged) refuses any of them that is
not equal to the row. Change the row, `habits.html` and `career/*.toml` together, re-seed Career Mode, and
`select public.career_compare()` must still say `"ok": true`. The quest runs are read from this row by both.
The check is rule 14 of `check_career.py`. It holds until `[switch] catalogue` is turned on (phase 3), not only while Career Mode was
in shadow. Once the XP switch is on, AA Proof's phone previews a tick with these numbers (P13) and Career Mode's score still runs
Proof's functions on them, so a drift between the `.toml` files and the row is a drift between the phone and the board. The one
deliberate difference is `[level]`, base 400 against Proof's 300 (§2), which rule 14 does not compare. After the XP switch
`career_compare()` also lets a row differ where a closed day settled, and calls it `settled`, not a failure.

Three more mirrors live in **SQL function bodies**, not on the row:

| SQL | `habits.html` | What breaks if they drift |
|---|---|---|
| `hab_rank_label()` — its `names` array, 5 subs a rank, 50 levels a cycle | `RANKS`, `SUBS_PER_RANK` | The board prints a different rank name from the athlete's own screen |
| `hab_level()` — the level curve, reading `base`/`growth` off the row | `levelCost()` / `levelInfo()` | Levels differ |
| `hab_clean_note()` — its default `p_max` of 200, which `set_day_note()` uses | `NOTE_MAX` | A roll-call line is cut at a different length; the server's cut is the one that stands |

The scoring **logic** is written twice too: `bonusEvents()` / `questEvents()` /
`comebackRuns()` against `hab_bonus_xp()`, `xpFor()` / `habitXp()` against `hab_xp()`, and
`dayQualifies()` against the `qualday` CTE. **Both round the day's percentage to a whole number
before comparing it with `streakQualifyPct`** (`gatePasses()` on the phone, `round(… * 100)` on
the server), so a day at 79.5% counts on both. Until 2026-09-26 the phone compared the raw number
and a day at 79.5–79.9% counted on the board only. The latest definition of `hab_bonus_xp()` and
`hab_xp()` is currently `supabase/stage24_marks_quests_customcap.sql` (see the foot of this
section). Changing how a badge or milestone is *counted* — not just what it pays — means
editing both.

**Career Mode's copies of the server's rules** (once the XP switch is on). The phones preview what the server will pay, so each copy
is held to the server's own answers in `scripts/career/xp_cases.json` by `scripts/check_twins.js` §9:

| SQL | App | What breaks if they drift |
|---|---|---|
| `career_level()`: the curve and the rank label from `[level]` | `levelInfo()` in `habits.html` (on the profile's base and growth, `overallBase()`), `careerLevelOf()` in `program.html` | A phone shows a level the board does not |
| `hab_xp()` over `career_paid_rules()`: the locked habit pays 0 | `paidXp()` in `habits.html` | A tick previews XP the server will not pay |
| `career_session_want()`: a session's full log, check-in and early finish | `careerFullLog()`, `careerCheckin()`, `careerEarly()` in `program.html` | The finish card promises XP the session does not earn |

Change a rule on both sides, then in the cases file (`node scripts/career/rehearse_switch.mjs --write-cases` writes it from the
server's answers).

**Once the catalogue switch is on (phase 3)** rule 14 stops comparing: from then the catalogue's tier and milestone numbers are
Amir's to tune in `career/*.toml` (re-seed; the server re-prices every award, D12), and `CONSISTENCY_TIERS` and `ACHIEVEMENTS` in
`habits.html` stay only for the display that still reads them (a habit's page, the manual before the switch). One more twin then
matters, held by `scripts/check_twins.js` §10 to `scripts/career/reward_cases.json` (the server's own answers, written by
`scripts/career/rehearse_catalogue.mjs --write-cases`):

| SQL | App | What breaks if they drift |
|---|---|---|
| `career_measures()` / `career_badge_eval()` / `career_achievement_eval()` for the phone-decidable entries | `awardMeasures()` (pure) in `habits.html` | A tap celebrates a step the server does not mint (withdrawn, quietly) or misses one it does |
| the open window, the switch day as history, the price (§3.6 of the build spec) | `phoneAwardsFrom()` (pure), wrapped by `phoneAwards()`; `owned` is the core's list of ids (the older `{ id: day }` map reads the same) | The XP shown at the tap is not what the server pays |
| `career_award_id()` | `awardId()` in both apps | One award gets two ids: shown twice, or never told |
| the events' `goals` in `achievements.toml` | `EVENTS` in `habits.html` | An event finishes on the phone and not on the server |

**Not on the row, deliberately:** `dailyCap` (a client write-time clamp in `setVal()`, with
no server equivalent — §1) and `seasonStart` / `seasonName` (the authority is
`public.seasons`; the `XP_RULES` values are an offline fallback only — §7).

Read the live row with:
`select jsonb_object_keys(rules) from public.xp_rules where id = 1;`

**A check holds the pair together** (2026-09-26): `scripts/check_xp_rules.py` compares every
key in the table above with its `habits.html` constant, against a committed copy of the row,
`supabase/xp_rules_snapshot.json` (the pre-commit hook runs it whenever either is staged). It
fails on anything that scores differently and prints display-text differences as notes. After
changing the row, refresh the copy with `--live` (the script's header has the query) and commit
both. The SQL function bodies in the second table are not covered.

### Changing the database copy — merge, never rewrite

Merge the keys you changed into the row, in the Supabase SQL editor:

```sql
-- one key
update public.xp_rules
set rules = rules || jsonb_build_object('customXp', 25), updated_at = now()
where id = 1;

-- several keys at once
update public.xp_rules
set rules = rules || '{"base":300,"growth":0.55,"completionBonus":1.2}'::jsonb,
    updated_at = now()
where id = 1;

-- one value inside an object (a single habit's weight)
update public.xp_rules
set rules = jsonb_set(rules, '{weights,water}', '30'::jsonb), updated_at = now()
where id = 1;
```

⚠️ **Never rewrite the whole object** — no `set rules = jsonb_build_object(…)`, no
`set rules = '{…}'::jsonb`. Either one replaces all 18 keys with only the ones you typed and
silently deletes the rest — `streakQualifyPct`, `unearnable`, `quests`, `questRuns` (every
run ever started, and the XP athletes earned in them), `passTrack` (nothing new could mint,
and an unminted title is refused), `gateV2`, the comeback keys, `maxCustom` and the
32-rung `milestones` array — and the server quietly falls back to defaults for each. This
section used to print exactly such a snippet, with ten milestones and THE CENTURION at 500.
To change a whole array (`milestones`, `quests`, `tiers`, `passTrack`), set that one key
with `jsonb_set(rules, '{milestones}', '[ … the complete array … ]'::jsonb)`. Count the keys
before and after.

Note `targets` as well as `weights` — the server needs targets to score partial
progress on counter habits the same way the app does. Custom habits an athlete
invents are scored at `customXp`, since the server has no target for them.

`tiers` and `milestones` feed `public.hab_bonus_xp`, which mirrors `bonusEvents()`
in the app: it walks the log from the season start, dates every crossing, and pays
the ones inside the window. It reads the athlete's **config** as well as their log
(via `hab_cfg_of`), because which habits were switched on decides what counts as a
perfect day and as a three-habit day.

**Past tense, deliberately.** It reads `cfg.roster` — a dated timeline of the tracked
set — and scores each day against the roster *that day* had, not the one the athlete has
now (stage18; `rosterOn()` is the client half). Before that, both scorers used the current
set for all of history, so adding a habit deleted perfect days already earned and switching
one off invented perfect days that never happened — 500xp either way, since `CN` needs 100
of them. An athlete with no timeline yet falls back to `cfg.on`, which is exactly the old
behaviour, so nothing was rescored when this shipped. See `HABITS.md` → *Days are settled
units*.

> **Verify parity after any change to these.** The two scorers are only worth having
> if they agree. Build a log arithmetically so both sides can generate it identically
> (`generate_series` + modulo in SQL, the same modulo in JS), then compare
> `hab_bonus_xp` against `bonusEvents()` over several windows — all-time, a season
> starting mid-log, a season starting today, and a rolling week. They must match
> exactly, including the awkward cases: days missing from the log entirely, partial
> counter values, and runs broken by a gap.

### How the board works

- **Everyone is on it** (since 2026-09-12; it was opt-in until then). The app joins an
  athlete itself, once, the first time it opens after their first finished workout
  (`autoJoinBoard()`), and anyone can join by hand from Crew; no row in
  `leaderboard_optin` still means invisible. The display name is `athlete.boardName`
  if the programme record has one, else first name + last initial. Athletes can rename
  or leave at any time, and leaving sticks. The full rule, including why a free
  athlete in practice only ever joins by hand, is `HABITS.md` → *The leaderboard*.
- **Two boards.** *This season* is the default; *past week* is a **rolling seven
  days** — today and the six before it, never reaching earlier than the season start.
  (Stage 12 fixed a mismatch here: the app was changed to say "rolling seven days"
  while the server still scored `date_trunc('week')`, i.e. Monday-to-today. The two
  agreed only on a Sunday.)
- **Badges score on the board too**, on the same day-of-crossing rule — so a tier
  cleared inside those seven days pays on the weekly board. See §4.5.
- **Reading it needs a signed-in athlete** — since 2026-09-07 the RPCs check identity
  server-side (`current_athlete_id()`), so display names are not exposed to the open
  internet; only real athletes see the board.
- **No athlete IDs are ever returned.** An id is the athlete's sign-in username (and it
  used to be enough to fetch `/data/<id>.json`, which is 404 since 2026-09-07).
  `leaderboard_top()` returns display name, title, points, level and rank only, plus
  `is_me` and `joined` flags.
- Rank names and the level curve are mirrored in SQL too (`hab_rank_label`,
  `hab_level`), so renaming a rank means updating `RANKS` in `habits.html` **and**
  the `names` array in that function (see the table above).
- **Once Career Mode's XP switch is on**, `leaderboard_top()` ranks the season's points (or the rolling week's) from the facts,
  training included, through the `career_scores` copy, with each athlete's career level and rank beside the name. Same columns, same
  identity check. A board read works out the stale rows it has time for (a 2.5 s budget, `career_scores_for()`) and serves the rest
  from the copy as they were, so a read never waits on everyone. Renaming a rank then also means the rulebook's `ranks` (§3). Until
  the switch it is Proof's own scorer, as the rest of this section says.

The SQL began in `supabase/stage9_leaderboard.sql`, with seasons in
`stage11_seasons.sql`, bonus XP in `stage12_bonus_xp.sql` and quest runs in
`stage14_quest_runs.sql` — **all applied and live**, like every Proof stage through 25
(listed in `HABITS.md` → *The leaderboard*). The folder is a changelog, not a schema: the
live `hab_bonus_xp()` and `hab_xp()` are **the latest definition, currently
`stage24_marks_quests_customcap.sql`**; `leaderboard_top()` was last redefined in
`stage17_titles.sql` (and again in `stage69_career_xp_switch.sql`, applied 2026-10-17, which answers Career Mode's scorer once
the XP switch is on, as it is since 2026-10-18, and Proof's own before it); and since 2026-09-07 the live board RPCs also carry a sign-in
identity check that no file holds. Read `pg_get_functiondef()` before trusting or
re-running any of them.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
