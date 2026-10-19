## The eight habits

<!-- Split by sub-heading: one file each. Open the part you need. -->


| Habit | Target | XP | Notes |
|---|---|---|---|
| **WORKOUT** | 1 session | 100 | **Locked** — only a finished session earns it. See below. **Once Career Mode's XP switch is on it pays 0 a day toward the overall XP** (the session pays instead), and still counts 120 on its own ladder |
| STEPS | 10,000 | 60 | Entered as a number |
| SLEEP | 7.5 h | 50 | Entered as a number |
| FUEL | 3 meals | 40 | Counter |
| WATER | 8 glasses | 30 | Counter |
| MOBILITY | 10 min | 30 | Tick |
| BREATHE | 10 min | 20 | Tick |
| SUPPS | 1 dose | 20 | Vitamin D · creatine · omega-3 |

The **first five are `core`** — always tracked, no off switch (see *Five core habits, and
opt-in add-ons* above). Athletes can switch any of the **add-ons** off and add their own (worth
`customXp`, 25).

⚠️ **Add-ons default to OFF** (`defaultCfg()`: `on[h.id] = !!h.core`) — they are opt-in,
not opt-out. They used to arrive switched on, which sat badly against the rule they run
on: *once one is on it counts*, and missing it costs the same as missing anything else.
An athlete tapping straight through onboarding was signed up to three habits they had
never agreed to and would be marked down for. **Existing athletes are unaffected** —
`loadLocal()` merges the saved `on` over the defaults, so every choice already made wins;
it also means any add-on added in future arrives off for everyone rather than silently
starting to score. The five are unaffected either way: `live()` honours `core` and never
reads this map for them.

**Onboarding** is one screen, and it is grouped exactly like Settings → the tracked
list: **The five** (inert rows, each carrying an `ALWAYS ON` chip and a line saying
there is no off switch) and then **Add-ons** (real toggles, **all starting off**, under
the same warning Settings carries — once one is on, it counts). Everything stays editable
in Settings afterwards.

It closes with a third section, **Your own** — a real composer, not a pointer at Settings
(Amir, 2026-07-31: *"what i meant was that to let them actually add there"*). Type a name,
press **Add**, and the habit appears immediately as a row with its own switch **and an ✕**,
worth `customXp` (25) a day. The ✕ is there because this is the screen where the typo
happens, so it is the screen that has to be able to undo it.

⚠️ **`MAX_CUSTOM = 3`, and duplicate names are rejected** (2026-08-02). A custom habit is
a one-tap check worth 30 XP a day *and* it earns its own consistency tiers, and the server
pays for it too — `hab_xp()` pays `customXp` for every key in a day it does not recognise.
Uncapped that was a faucet: twenty junk habits are twenty taps and ~600 XP a day, roughly
double a coached athlete's perfect one, on a board shared with people doing the real work,
and nothing could take it back because only the athlete's own ✕ removes one. The id
carries a timestamp, so "Reading" typed twice used to make two habits that both scored.
Both guards live in `addCustomHabit()` so the onboarding composer and Settings cannot
disagree, and both composers hide at the cap. This is a **client-side guard with no server
equivalent**, exactly like `dailyCap` — the stronger fix (excluding customs from board
scoring entirely) needs a migration and is written up in `XP_SYSTEM.md`. Custom rows are `<div>`s with
their own switch button rather than one big `<button>` like the built-in add-ons — a row
with two controls cannot be a button without nesting one inside another.

⚠️ **Both composers call the same `addCustomHabit()`.** Settings and onboarding used to be
one copy each; the id scheme (`c_<slug>_<base36 time>`) is what every logged value is filed
under for the life of the habit, so two copies of it is exactly the kind of thing that
drifts. `UI._newName` is read through the delegated `input` listener on `#app`; both fields
carry `id="newhabit"` and only ever one is mounted, so there is nothing to disambiguate.

⚠️ **It clears the box by hand, after `render()`.** `morphAttrs()` deliberately skips
`value` on a live `<input>` so a re-render mid-keystroke cannot yank the caret away — which
also means clearing `UI._newName` alone leaves the typed name sitting in the field, looking
like the tap did nothing when it had in fact done the whole job. That affected the Settings
composer too, from before onboarding had one; fixing it in the shared function fixed both.

⚠️ **It used to render all eight as one flat list of switches.** Tapping a core row
flipped `CFG.on`, the switch animated off, and `live()` went on returning the habit
regardless — so the athlete reached Today to find the habit they had just declined
sitting in their list, on the first screen they ever saw. The lock is now stated where
the decision is actually made.

⚠️ **Declining a suggestion during onboarding is not a "removal".** `stampRoster()`
dates removals to *tomorrow* so nobody can switch a habit off at 23:00 to erase a miss
— but the roster is stamped before onboarding is ever seen (`migrateOld()` ends in
`saveCfg()`), so switching a suggested add-on off on that screen used to leave it on
**today's** roster. Day one was then scored against a habit the athlete had explicitly
said no to and had never once been able to tick. `stampRoster()` now collapses the
timeline to a single entry dated today while `!CFG.onboarded` **and** the log is empty
— an empty log being the proof that no closed day exists to re-judge, which is the only
thing the tomorrow rule protects. Proven: declining an add-on at onboarding leaves it
off today *and* tomorrow; after onboarding, with a logged day, switching one off still
holds it on today and drops it tomorrow, and a returning athlete's old roster entries
do not move.

**The locked habit says so on that screen**, in grey (POL-02; it was clay), under its name: it used to be sold
there as the highest-value habit on the list with its switch on and no mention of the
padlock waiting on the very next screen. The free wording states the lock and stops —
it does **not** suggest switching it off to reach 100%, because `proof.html` promises the
opposite in public and in Amir's own first person.

Pressing **Start tracking** goes straight into **the tour** (below).

**A counter takes at most `dailyCap` × its target in a day** (3×, so 30,000 steps).
Daily XP never needed a ceiling — `xpFor()` stops at the target — but a `total:`
quest counts raw units, and the server scores whatever the log holds. See
[`XP_SYSTEM.md`](../../../../XP_SYSTEM.md) §1.

**Off and removed are different things, deliberately.** The toggle beside a habit
*pauses* it: it leaves the daily list, keeps every point it has banked, and can come
back. The ✕ beside a custom habit *removes* it — and takes its logged values out of
the log with it. That second half is not tidiness. The app stops counting a habit
the moment it leaves `CFG.custom`, but the server's `hab_xp()` walks every key in a
day and pays `customXp` for anything it does not recognise, so a left-behind key
went on scoring on the leaderboard and nowhere else, and the two could never
reconcile. `removeCustom()` in `habits.html` owns this; anything else that drops a
habit has to do the same.

> **STEPS and SLEEP are entered by hand**, not synced from a phone's health app. A
> website cannot read Apple Health or Health Connect — there is no browser API for it,
> and Google shut its Fit REST API down on 30 June 2026. Reading steps automatically
> needs one of: a native/Capacitor wrapper app, a per-athlete Apple Shortcut that POSTs
> the number daily, or a paid aggregator (Terra/Vital) — see the open question at the
> foot of this file. Until then, they are manual and unlocked.


## The parts

- [Proof publishes a card snapshot the programme app draws — its ANSWERS, never its rules](01-proof-publishes-a-card-snapshot-the-programme-app-dr.md)
- [Embedded on the training app's Home — `?embed=1` (Fork 1B, 2026-09-26)](02-embedded-on-the-training-apps-home-embed1-fork-1b-20.md)
- [The WORKOUT habit is LOCKED and fed by the training programme — through the server](03-the-workout-habit-is-locked-and-fed-by-the-training-.md)
- [Library workouts feed a habit too — but not always the same one](04-library-workouts-feed-a-habit-too-but-not-always-the.md)

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
