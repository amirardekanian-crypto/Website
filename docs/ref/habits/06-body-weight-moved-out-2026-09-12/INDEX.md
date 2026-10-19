## Body weight — MOVED OUT, 2026-09-12

<!-- Split by sub-heading: one file each. Open the part you need. -->


⚠️ **It is not in this app any more.** The card, the history screen, the chart, logging and
deleting all live in `program.html` (Home → Body Weight). `habits.html` has no weight UI, does
not push `<id>_hab_wt`, does not merge it, and `saveWt()` is a stub — **both apps share this
origin's localStorage, so writing that key here would overwrite readings taken there.** The
manual's Body weight section now just points athletes across. Free-tier athletes, who have no
programme app, no longer have body-weight tracking at all; Amir chose that knowingly.

The account below is kept because it is still the design brief for the feature — it simply
describes `program.html` now. See CLAUDE.md for the ownership rules.

<details><summary>The original brief (now implemented in program.html)</summary>


Added 2026-09-03 (Amir: *"my aim is to add a weight tracker, with history … the aim is to
push my clients to open the habit tracker so they start using it"*). **Kilograms only, on
by default for everyone (flipped 2026-09-05 — see below), and deliberately outside the
entire scoring system.**

⚠️ **On by default since 2026-09-05** (Amir: *"Weight tracking should be on for everyone
automatically. And then they can turn it iff [off]"*). Shipped opt-in, flipped to
opt-**out** two days later once it was live and working. See *The default-on migration*
further down for exactly how that reached every athlete — new and existing — without a
single SQL statement and without ever overwriting an athlete's own explicit choice.

**It is not a habit and must never become one.** A habit has a target you either hit or
miss; body weight has neither, and wiring it into `dayParts()`/`dayPct()`/`isPerfect()`
would mean *not weighing* drags a day score down. It pays **no XP on either side**, which
is what keeps it off the "scored twice" table (`XP_SYSTEM.md` §8) entirely — there is no
`xp_rules` key to mirror, because there is no rule.

**⚠️ It has its own storage key, and that is not a style choice.** `<id>_hab_wt`, a
sibling of `_hab_cfg`/`_hab_log` in the same `save_progress` payload. Three separate bugs
are avoided by keeping it out of the other two:

| If it lived in… | What breaks |
|---|---|
| `LOG[day]` | `hab_xp()` pays `customXp` for any numeric key it does not recognise (stage24, capped at `maxCustom`). Weight would score on the **leaderboard** and nowhere else — the silent two-scorer drift this app fears most. |
| `LOG[day]` | The cloud log merge takes **`max()` per key**. Right for "did you do it", fatal for "what is it": a stale phone holding 80.0 beats a corrected 78.4 for ever and a loss can never be recorded. |
| `CFG` | The config merge **adopts a newer cloud copy wholesale**. That is exactly the bug that deleted earned rewards until `CFG.pass.owned` was special-cased into a union. |

Its merge rule is therefore its own: **union by date, newest `t` wins that date.** Every
entry carries the timestamp it was written at, which is what makes "newest" mean *recorded
later* rather than *synced later*. See `syncFromCloud()`.

⚠️ **A deletion is a tombstone — `{ kg: null, t }` — never `delete WT[day]`.** The union
loop only walks the keys the **cloud** has, so removing a key outright is invisible to the
other device: it still holds the reading, keeps it through the merge, and re-uploads it on
its next push. The reading returns and nothing the athlete does removes it — the same class
of bug `_dirtyDays` exists to stop on the habit log, arriving through a different door.
Recording the delete instead lets the merge compare it like any other write, so a newer
tombstone deletes everywhere and a newer reading revives a day that was deleted and then
weighed again. Every reader goes through `wtKg()`, which returns null for a non-numeric
`kg`, so tombstones are invisible to the chart, stats, list and count without any of them
knowing they exist. They are **not pruned**: a prune on one device is itself a silent
delete the other would undo.

**No SQL was needed, and none is needed to extend it.** `save_progress` merges payload
keys at the top level (`data || excluded.data`) and whitelists nothing; `get_progress`
returns the whole blob; `coach.html` already selects `data` entire. A fourth key would be
just as free.

**The default-on migration.** Reaching every athlete — new sign-ups and the ones already
running the app — with a changed default took two mechanisms, not one:

- **`defaultCfg()`, and the two `!CFG.wt || typeof CFG.wt !== 'object'` repair guards** in
  `loadLocal()` and `syncFromCloud()` all now seed `on:true`. Between them these cover
  every athlete who has **never had a `wt` key at all** — a brand-new install, or an
  existing athlete who has not opened the app since the feature first shipped. That is
  most of the current athlete base, since the feature is only two days old.
- **A one-shot block inside `migrateOld()`, gated on its own flag (`CFG.wtOnMigrated`) —
  not the `CFG.v === 3 && CFG.migrated3` gate the rest of the function uses**, because that
  gate returns early for every athlete already on v3, which is everyone. This is what
  reaches the remaining population: anyone who opened the app in the few hours the feature
  ran with the *old* default and so already has a real, previously-synced `CFG.wt.on:false`
  on this device.

⚠️ **The line between "flip it" and "leave it alone" is `CFG.wt.touched`** — set to `true`
the instant an athlete taps the Settings switch themselves, in **either** direction (see
`renderSettingsWeight()`). The migration checks it first: untouched means "whatever default
happened to be in force when this device last saved", which is fair game to update; touched
means the athlete decided, and the migration must never look at the value again. This is
what lets the same one-line flip retro-enable athletes who never chose anything while never
re-enabling someone who deliberately turned it off — including someone who turns it off
during the very short window before this doc update lands.

⚠️ **The migration must only claim a "loud" `saveCfg()` — one that stamps `updatedAt` and
propagates to the cloud — when the value actually changes**, never merely because the block
ran. A brand-new device already starts at `on:true` from `defaultCfg()`, so for it the
migration is a true no-op; forcing a loud save there anyway would be the exact race
`migrateOld()`'s own big warning comment describes for the v3 migration — a device that has
never pulled the cloud copy marking itself "newest" and refusing the real cloud config when
it finally arrives. `wtTouched` (a local variable, not to be confused with `CFG.wt.touched`)
tracks whether this run's flip was real, and only `wtTouched` feeds the final
`saveCfg()`-vs-`saveCfgQuiet()` decision alongside the pre-existing `touched`/`hadRetired`/
`wasV !== 3` conditions.

Proven in the browser across every combination: a brand-new device lands on `on:true` with
a **quiet** save; an existing athlete with a real stored `on:false` gets flipped to `true`
with a **loud** save, and does not re-flip or re-save on a second boot; an athlete who
explicitly turned it off (or on) keeps that value through the migration, with **no** save
at all; and forcing the one-shot flag back off and re-running `migrateOld()` by hand still
respects an explicit choice — the `touched` check, not the one-shot flag, is the real guard.

**The disclosure has to be SEEN, not just true in a policy document.** Added the same day
as the default flip, once Amir pointed out he has no lawyer or compliance person of his own
to catch a mistake here (2026-09-05: *"protect me in your best knowledge, i dont have some
one else"*). Being on by default means most athletes never chose this — the old empty-state
copy in `wtCardLine()` ("Kilograms. On by default...") technically said so, but it lived
inside the weigh-in CARD itself and vanished the instant there was a first reading, so an
athlete who tapped *Weigh in* within their first five seconds could act on the feature
before ever reading a word about it. That is not real disclosure, it is a sentence that
happened to exist.

`renderWtNotice()` fixes this with a **standing banner**, not a rewritten sentence — reusing
`.rcprompt` completely unchanged, the exact component the tour prompt and the roll-call
pointer already use for "explain once, then get out of the way for good," rather than
inventing a new dismiss control this app has never had. It sits directly above the weigh-in
card and is gated on its own flag, `CFG.wt.seenNotice` — independent of whether there is a
reading yet, so it cannot disappear before it has done its job. `wtMarkSeen()` is the one
place that flips it, called from three doors, any one of which counts as informed: tapping
the banner itself (which goes straight to Settings → Body weight — the screen with both the
explanation and the switch, not just the read-only history a tap short of it), opening the
history via `goWeight()` from anywhere, or actually logging a reading through the weigh-in
sheet. Nobody has to dismiss a banner they have already acted past.

**Self-service erasure**, added the same pass. Turning the feature off deliberately keeps
every reading (see above — the point is reversibility), so a separate control exists for an
athlete who wants the *readings* gone, not just the tracking stopped: **Delete all my
weight history**, in Settings → Body weight, only rendered when there is anything to
delete. `clearAllWeight()` tombstones every day in one pass (`{kg:null, t:now}`, one shared
timestamp, one `saveWt()`) — never a raw `WT = {}`, because that would be exactly the
resurrecting-delete bug fixed earlier the same week: a device that has not yet pulled this
wipe still holds real readings, and a bare wipe gives the union merge nothing to compare
against, so that device's next push would bring every reading back. Tombstoning is what the
merge already knows how to propagate correctly. The confirm is the same double-tap-then-
auto-disarm pattern as *Reset today's log* (`UI.confirmWtWipe`, mirroring `UI.confirmReset`
exactly) — destructive, so it asks once, but asks.

Proven in the browser: the banner shows for a fresh athlete and is absent once the feature
is off; each of the three `wtMarkSeen()` doors independently ends it; the delete control
tombstones every reading, is gone once there is nothing left to delete (the switch row
stays), and — the check that actually matters — a simulated second device that still holds
real readings and pulls this device's wipe ends up with every reading tombstoned too, the
same union-merge safety net that already protects a single deletion.

**Where it lives in the UI**
- **Today** — `renderWtRow()`, a **white rounded card below the habit list and below the
  `.rowhint`**. Two states: *Weigh in* before you have, *See your history* after, with the
  number, the month delta and an inline sparkline (`wtSpark()`) either way. Hidden
  entirely when the feature is off or a past day is being backfilled.
  ⚠️ **The BODY opens the history, the BUTTON logs** — the same law the habit rows teach
  (name vs box). The first build let one button do both jobs by turns, which meant that
  before weighing there was *no route to the history from Today at all*. That is backwards:
  the trend is exactly what someone wants to see before stepping on the scale.
  ⚠️ **It goes below, not above.** The first build put a square-cornered, full-bleed
  tinted band *above* the habit rows; Amir rejected it (2026-09-04: *"i dont like where
  you put it, i dont like the design, its not consistent with others"*) and he was right
  twice over — the habit list is what the screen is for and was deliberately moved to the
  top, and the `.rowhint` explaining the rows must not be cut off from them. Four
  placements were built and rendered for him to choose from (in the list wearing the
  habit-row shape; a tile in the hero beside the streak; this card; Progress-only); he
  picked this one because it is the only one that shows the payoff without a tap.
- **Progress** — `renderWtProgressRow()`, under a `sectionLabel('Body weight', 'Tap for
  history')`, sitting after the habits and before the quests (a personal measurement
  groups with the personal half of the screen, not the game half). It wears the habit
  row's shape but carries a **sparkline where a habit carries its pips**, and leads with
  the NUMBER rather than repeating the section label above it.
  ⚠️ **Progress had nothing at all until 2026-09-04**, when Amir asked where an athlete
  checks their weight progress and the honest answer was "the Today card, or two doors
  deep in Settings". The tab is called Progress; a trend belongs on it.
- **The weight screen** (`renderWeight()`, `UI.screen === 'weight'`) — an OVERLAY, not a
  tab: no tab lights up, and it gets the same back chevron as Settings and the manual.
  Built in the `renderDetail()` idiom on purpose (hero figure, stat triptych, history
  list) so it reads as a screen this app already had.
- **Settings → Body weight** (`renderSettingsWeight()`, `UI.sub === 'weight'`) — the
  on/off switch and the explanation. **Switching it off never deletes a reading**; a
  feature that bins three months of history on a toggle is one nobody can safely try.
- **`coach.html` → an athlete → Proof** — `weightPanel()`, which is *absent* rather than
  empty when there is nothing to show.

**What the history screen answers, and why each number is there** (Amir, 2026-09-04:
*"there should be a way to check their progress"*):

| Number | Scope | Why |
|---|---|---|
| The 76px hero | latest reading | What you are now. |
| **Change** | the selected chip | What moved inside the window you are looking at. |
| **Per week** | the selected chip | `wtRate()` — normalised to a week, so a stall is visible while a total is still creeping. Divided by the span the readings **actually cover**, never the nominal range: ten days of history on the 90-day chip is not twelve weeks, and dividing by twelve would report a real half-kilo week as a rounding error. Returns null under 5 days rather than guessing. |
| **Since you started** | all history | `wtSince()` — first reading, total change, weeks elapsed. This is the one that answers *is it working*, and until it existed the screen genuinely could not: `wtChange()` only ever measures inside the chip, so an athlete twelve weeks in reading the 7-day view saw −0.2 and had no idea they were down 3.1. |
| **Your readings** | last 8, or all | Collapsed by default to keep the screen short; the header doubles as the toggle (`CFG.wt.allReads`, the same CFG-not-UI memory the milestone tiers use) and shows `LAST 8 OF 58`. Nothing is hidden — the record exists so someone six months in can still see week one. |

`WT_RANGES` carries **four** forms of each span (`label`, `phrase`, `span`, `ago`) because
English needs all four and none can be derived by chopping words off another — a first
attempt built the hero's line by stripping "the last " and printed *"−1.0 kg in month"*.

**Reuse the app's vocabulary — do not invent components here.** The range switcher is
`.chip`/`.chip-on` pills (what Crew uses for Roll call ↔ Leaderboard); the screen is
`renderDetail()`'s furniture (76px `.figure`, `.block` sections, the three-up `.statnum`
triptych, `.row-rule` list rows); the entry field sits inside the same `.stepper` the
habit log sheet uses. An earlier build shipped a bespoke tinted band, a segmented tab box
and a custom input, and all three read as foreign the moment they sat next to the real
screens.

**The chart is the app's first and only chart** (every other `<svg>` in `habits.html` is
an icon). Inline SVG, `.wtchart`, points placed **by date** across the window so a week
nobody weighed reads as a gap rather than being closed up. **The line is a
`WT_AVG_WINDOW`-day (7) rolling average and the dots are the raw readings behind it** —
and `wtChange()` compares an average against an average, never one morning against
another. Daily weight swings a kilo on water and food alone; anything else would report
noise as progress, which is the single thing a weight chart must not do. Ranges are
**7 days / 1 month / 3 months** (`WT_RANGES`).

Edge cases are handled and proven: a single reading draws a dot and no line, a perfectly
flat series is given a kilo of vertical room rather than dividing by zero, an empty series
renders copy instead of a chart, and readings are clamped to `WT_MIN`–`WT_MAX` (25–350 kg)
and rounded to one decimal so a fat-fingered 784 cannot flatten the chart.

**Privacy.** It never reaches the leaderboard, the wall, or `data/<id>.json`. `privacy.html`
§2.3 names it explicitly and, since it went on-by-default (2026-09-05), rests on
**legitimate interests (GDPR Art. 6(1)(f))** rather than explicit consent — a default-on
feature cannot honestly claim consent as its basis, since consent has to be an affirmative
act and a pre-set default is the opposite of one. The one-tap-to-object toggle in Settings
is what makes legitimate interests defensible here rather than merely convenient. ⚠️ This
was a judgement call about whether a bare weight number counts as Article 9 "special
category" health data at all (genuinely ambiguous — plenty of consumer fitness apps treat
it as ordinary personal data), made once, in the privacy copy, not re-litigated per athlete;
flagged to Amir at the time, not decided silently.


## The parts

- [Settings — behind the initials button, and it is a LIST OF DOORS](01-settings-behind-the-initials-button-and-it-is-a-list.md)
- [The rank ladder lives on the Locker's road now](02-the-rank-ladder-lives-on-the-lockers-road-now.md)

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
