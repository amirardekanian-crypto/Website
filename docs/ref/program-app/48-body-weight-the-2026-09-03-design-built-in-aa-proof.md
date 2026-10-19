## Body weight — the 2026-09-03 design, built in AA Proof

> The screens below (`renderWtRow()`, `renderWeight()`, `renderSettingsWeight()`, `renderWtNotice()`)
> lived in `habits.html` until the move of 2026-09-12 (see *Body weight lives in `program.html`* above).
> The data rules still hold where the feature lives now: the `<id>_hab_wt` key, union by date with the
> newest `t` winning, a delete as a tombstone, never scored. The on/off switch and the disclosure
> banner did not come across: nothing is recorded until a reading is entered, and every reading
> deletes in one action (`privacy.html` §2.3 rests on that).

Added 2026-09-03 (Amir: *"add a weight tracker, with history … push my clients to open the
habit tracker"*). Kilograms, **on by default for everyone, toggled off** in
Settings → Body weight (`CFG.wt.on`; flipped from off-by-default 2026-09-05, Amir:
*"should be on for everyone automatically ... they can turn it off"*), and **deliberately
outside the whole scoring system**: no XP on either side, no `xp_rules` key, not in
`HABITS`/`live()`/`rosterOn()`, never written to `LOG`. It is the one feature that is *not*
on the scored-twice table above, and the reason it was cheap and safe to ship. Full account
in `HABITS.md`; the "don't make it pay" argument in `XP_SYSTEM.md` §6.4.

⚠️ **The on-by-default flip is a one-shot migration, not just a new `defaultCfg()` value —
`defaultCfg()` alone only reaches a genuinely brand-new install.** `migrateOld()` carries a
second, independent one-shot flag (`CFG.wtOnMigrated`) that forces `CFG.wt.on = true` for
every athlete who has not decided for themselves — which the app tells apart from "just
inherited whatever default happened to be in force" via `CFG.wt.touched`, set the instant
the Settings switch is tapped, in **either** direction. That is what lets this safely
retro-flip athletes who already had an explicit `on:false` stored from the few hours this
shipped with the opposite default, while never overwriting a real choice. It only forces
the **loud** `saveCfg()` (the one that stamps `updatedAt` and propagates to the cloud) when
the value actually moves — a brand-new device already starts at `on:true` and must stay a
quiet `saveCfgQuiet()`, or it would race ahead of its first cloud pull exactly the way the
`saveCfg()`-vs-`saveCfgQuiet()` warning a few hundred lines below (`migrateOld()`'s own
comment) already guards against.

⚠️ **It has its own payload key — `<id>_hab_wt` — and three real bugs are why.** In
`LOG[day]` the server's `hab_xp()` would pay `customXp` for it as an unrecognised numeric
key (scoring on the **board** and nowhere else), and the log merge's `max()` would make a
loss unrecordable and let a stale phone overwrite a correction for ever. On `CFG` the
wholesale config adoption would delete it exactly as it once deleted earned rewards. Its
merge is its own: **union by date, newest `t` wins** — and a **delete is a tombstone**
(`kg: null` with a fresh `t`), never a `delete` of the key: the union only ever walks the
keys the *cloud* has, so dropping a key outright left the other phone holding the reading
and re-uploading it, and the deletion undid itself with nothing the athlete could do. **Zero SQL** — `save_progress`
merges payload keys at the top level and whitelists nothing, `get_progress` returns the
whole blob, and `coach.html` already selects `data` entire.

UI: `renderWtRow()` is a **white rounded card below the habit list and below its hint**
(Amir, 2026-09-04 — an earlier build put a square full-bleed band *above* the list and he
rejected it as inconsistent: this app is white rounded cards on lavender, and the hint
must stay attached to the rows it explains). The card carries the number, the month delta
and an inline sparkline, so it is the only thing on Today that shows a trend without being
tapped. Its **body opens the history and its button logs** — the habit row's own law (name
vs box); one button doing both by turns left the history unreachable before weighing.
`renderWtProgressRow()` puts the same fact on **PROGRESS**, after the habits and before
the quests, because that is the tab an athlete opens to check progress. `renderWeight()` is an overlay screen built on `renderDetail()`'s own furniture —
76px figure, `.block` sections, the three-up `.statnum` triptych — with **`.chip`/`.chip-on`
pills** for the **7 day / 1 month / 3 month** ranges, the same control Crew uses to swap
Roll call for the Leaderboard. **Invent no new component here**: every earlier attempt to
(a tinted band, a segmented tab box, a bespoke input) was the thing that read as foreign. `renderSettingsWeight()` holds the switch and **never deletes readings
when switched off**; `weightPanel()` in `coach.html` → an athlete → The work shows Amir the trend (it moved from their Proof screen on 2026-10-12). The
chart is the app's **first and only chart** — line is a 7-day rolling average, dots are the
raw readings, every quoted change compares average to average, because daily weight swings
a kilo on water alone. Never put it on the board, the wall, or the programme record.
`privacy.html` §2.3 names it and, since it went on-by-default, rests on **legitimate
interests (GDPR Art. 6(1)(f))** rather than explicit consent — a default-on feature cannot
honestly claim consent as its basis, and the one-tap toggle to object is what makes
legitimate interests defensible instead. Full reasoning in `HABITS.md`.

⚠️ **The disclosure has to be SEEN, not just true in a policy doc — `renderWtNotice()`,
added 2026-09-05 (Amir has no lawyer or compliance person of his own to catch a mistake
here).** A **standing banner** — `.rcprompt`, unchanged, the same component the tour prompt
and roll-call pointer already use — sits above the weigh-in card until `CFG.wt.seenNotice`
flips, which happens the moment the athlete taps it (straight to Settings → Body weight, the
switch itself, not just the read-only history), opens the history any other way, or logs a
reading. The OLD copy (`wtCardLine()`'s empty-state sentence) technically disclosed this too,
but lived inside the card and vanished the instant there was a first reading — an athlete
who tapped *Weigh in* fast enough could act before ever reading it. That was not real
disclosure. **Also added the same pass: self-service erasure** — *Delete all my weight
history* in Settings → Body weight, next to the on/off switch, same double-tap-confirm as
*Reset today's log*. `clearAllWeight()` tombstones every day in one pass, never a raw
`WT = {}` — a bare wipe is invisible to the union merge and a device that has not pulled it
would resurrect every reading on its next push, the identical failure mode the single-day
tombstone fix (above) already exists to prevent. Proven across a simulated second device
that still holds real readings: it ends up with every reading tombstoned too.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
