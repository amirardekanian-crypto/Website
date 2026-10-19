### Proof publishes a card snapshot the programme app draws — its ANSWERS, never its rules

`publishCardSnapshot()` runs at the end of every `render()` and writes
**`<id>_hab_card`**:
`{ lv, rank, streak, done, total, qualified, verdict, togo, week[7], days[7], pct, toNext, crest, t }`.

`program.html` draws one row from it on Home (HOME-02, 2026-09-26; it drew this file's
whole Today hero until then): **Daily habits · 2 to go · 4 days in a row**. `verdict`
(`'togo'`, `'on'` or `'perfect'`) and `togo` are Today's verdict tile (PRF-03), so the row
and the strip under it say the same thing; they replaced *"Daily habits · day complete"*
beside the strip's *"1 of 5 done"*. A snapshot whose `t` is not today shows the level
instead, until the strip boots Proof and writes today's, and `done of total` is only for a
Proof that has not been updated alongside. Once Career Mode's XP switch is on the row says *Ready for today* there and never a
level: the level is the Career row's, one number on Home. The redraw signature includes the day, the
verdict and the count. `days[]`, `week[]`, `pct`, `toNext` and `crest` are still written
for a programme app that has not been updated alongside this one.

⚠️ **`crest` is rendered HERE, as markup.** `rankCrest()` gained an optional third
argument for the crest's inner fill; every call in this file omits it, and the snapshot
passes a dark-green one so the badge arrives on the programme app's palette instead of
importing MEADOW's purple. The metal rim, the clip shape and the icon are identical, so a
rank looks like the same rank in both apps — and the METALS ladder is never rebuilt over
there.

⚠️ **This key exists so the programme app never re-derives any of it.** The XP curve, the
rank ladder and the weighted day gate already live in two places (this file and the
`xp_rules` row); computing them in a third would be exactly the class of bug this repo
warns about hardest — two screens quietly disagreeing, with nothing erroring. Proof owns
the formulas and exports only the numbers it has already worked out for that render.
**Career Mode is the one deliberate exception, and it is guarded.** Once the XP switch is on, `program.html` works out the career
level from the server's XP (`careerLevelOf()`) for its Career row, because its finish card shows where a session's XP takes the
level before the server has answered. That copy is held to the server's `career_level()` by `scripts/check_twins.js` §9.
`qualified` is `dayQualifies(today)`, the same gate a day streak uses, so the card and the
streak can never disagree about whether today counts.

It is **device-local on purpose**: the sync payload is built explicitly from `cfg` and `log`,
so this never travels, and re-deriving it on another device costs exactly one render. A
phone that has never opened Proof simply has no snapshot, and the programme app falls back
to a card with no numbers rather than showing wrong ones. The write is wrapped in a
`try`/`catch` that swallows everything — a card must never be able to break the tracker.

Add a field here and nothing breaks; the reader treats every field as optional apart from
`lv`, which is what it tests to decide the snapshot is real.

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
