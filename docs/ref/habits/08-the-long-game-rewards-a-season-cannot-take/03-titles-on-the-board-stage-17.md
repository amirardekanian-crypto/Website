### Titles on the board (stage 17)

> **Titles are not shown on the board or the wall since 2026-10-19.** See *Career screens off*.

A title now appears **beside the athlete's name on the leaderboard and on the roll-call
wall** — the audience that makes a cosmetic worth having. Cards deliberately do not: a
card is drawn on the athlete's own phone, so nobody else reads it and nobody needs to
trust it.

That difference is the whole design. `CFG.pass.owned` is localStorage, and devtools would
hand anyone PROOF ITSELF, so the server keeps **its own record of what has been earned**
(`public.hab_titles`) and refuses to publish anything else.

**Catalogue titles (Career Mode phase 3).** From the catalogue switch the server mints a catalogue title with its award and writes
its `hab_titles` row in the same breath (its Proof id where it has one, else its catalogue id: `clockwork`, `grand_slam`), so
`set_title()`, `claim_titles()` and the board work unchanged; `titleName()` names them through `passItem()`'s fourth lookup.

**The record is minted, not recomputed** — and that is the part worth remembering, because
checking the title against the athlete's *current* level is the obvious design and it is
wrong twice over:

1. **Levels reset every season.** The day Amir opens Season 1 every athlete drops to level
   1, and a recomputing check would strip every title off the board at once while every
   Progress screen still showed them. The track exists precisely so levels *can* reset.
2. **Level used to move mid-season too.** Before stage18, `hab_bonus_xp` scored
   `daysWith3` and `perfectDays` off habits currently switched **on**, so adding a habit
   deleted perfect days already earned — dropping the level in **67 of 266** log lengths
   between 100 and 365 days (first at 105 days, level 21 → 20, which is IRONCLAD).
   *Days are settled units* fixed that, so this half no longer applies. Reason 1 alone is
   permanent and sufficient, and it was this measurement that made the case for minting.

So `hab_mint_titles()` records what the level has earned *at the moment it is called*, and
that row is permanent. Minting runs on boot, which is what captures the peak on the day it
happens; `set_title()` then only checks the record. **The threshold mirrors the client
exactly — season-scoped, because that is what `overallLevel()` measures.** Scoring career
XP server-side instead would mint titles the athlete's own app never awarded.

**Once Career Mode's XP switch is on, the mirror holds with the career's level instead.** `hab_season_level()` answers the career
level (`hab_proof_level()` keeps Proof's own season level, for the switch's report) and so does `overallLevel()` on the phone, so
`hab_mint_titles()`, `claim_titles()` and `set_title()` still mint exactly what the athlete's own app awards. Levels no longer
reset, so reason 1 stops applying. The record is still minted and never recomputed: a re-seeded rulebook can still move a level,
and nothing already minted is taken back (GAME-1).

Three rules follow on the client, all in `pushTitle()`:

- equipping is **local and instant** — it is their screen, and it must not wait on a round
  trip to feel like it worked;
- the push only happens once they are **on the board**, the only place a title is
  published. Off the board they can still wear one; it shows on their card;
- **a refusal to publish never un-equips it** (changed 2026-07-30 — see below). Wearing
  stays exactly what the athlete chose; only the board's copy fails to catch up.

⚠️ **This used to say the opposite** — "a refusal takes the title off, never out of
`owned`" — and that was the actual bug behind an athlete reporting *"once I turned my
title off I can't turn it back on."* `set_title()` validates the id against the server's
`xp_rules.passTrack` catalogue before allowing it on, and if that catalogue is missing an
id the client already knows about (exactly what the July 2026 one-off repair, `RUN-THIS-NOW.sql`, fixed; it was run and has been deleted from the repo),
every attempt to re-equip a perfectly-owned title failed server-side — and the old code
reacted by clearing `CFG.pass.title` right back to null. Since `passTitle()` reads
straight off `CFG.pass.owned`, that reset had nothing to do with what the athlete
actually owned; it silently stripped their choice on every single tap, which read as the
switch being broken. Turning a title **off** was never affected — `set_title(null)`
skips validation entirely, so only the ON direction could ever fail this way, which is
exactly why it looked one-directional. The toast still fires so the gap is honest
("The board has not seen that unlock yet. It still shows on your own card."); it just no
longer reaches back and un-does the athlete's own choice to make its point.

`syncTitles()` reconciles the server's record back into `owned` on boot and **only ever
adds**: the server's copy survives a cleared browser, the client's survives being offline,
and the union is the truth.

⚠️ The track lives in **two places** — `PASS_TRACK` in `habits.html` and `passTrack` on the
`xp_rules` row. Same rule as `QUEST_POOL`: change both together, or the server will refuse
a title the app has already handed out.

**`passTrack` is a JSONB ARRAY of `{id, lv, kind, name}` objects** — the 14 level-track
entries of `PASS_TRACK` (titles and cards alike) plus the five event titles at `lv: 0`: 19
on the live row. Notes and blurbs stay in the app. It began as stage17's plain
`{title_id: level}` object; the live row drifted into the array and neither function that
read it was updated, and `jsonb_each_text()` on an array is a hard Postgres error, called
with no exception handling from `claim_titles()` (every boot) and `set_title()` (every
equip). **No title minted server-side for four days** (the last `earned_on` was
2026-07-29) — and nothing showed it, because `pushTitle()` reads a refusal as *not
published yet*. `supabase/stage23_title_mint_fix.sql` (applied 2026-08-02, safe to
re-run) reads the array, and draws the distinction the naive fix would have missed:

- **`lv > 0` — the level track.** `hab_mint_titles()` mints a `kind: 'title'` entry only
  when `hab_season_level() >= lv`. Cards are never minted server-side.
  (`hab_season_level()` is the career level once the XP switch is on.)
- **`lv: 0` — event titles.** "Mint where level ≥ lv" would have handed all five to every
  athlete on their next boot. `hab_mint_titles()` ignores them instead, and `set_title()`
  records one directly when it is equipped: event completion is computed client-side only,
  the same trust boundary the rest of the app already runs on.
- **Season titles are never in `passTrack`** — an `lv: 0` entry there is self-awardable,
  which would make the level-5 threshold decorative. `set_title()`'s third branch
  (stage25) allows an id that is not on the track **only if the server already minted
  it**; anything else is refused as `unknown title`.

The titles owed at the time were backfilled the same day by the one-off sweep at the foot
of stage23; stage24 later dropped a fossil map-object that had been sitting at
`passTrack[0]`. The live `set_title()` is stage25's plus the 2026-09-07 sign-in identity
check, which no file in `supabase/` holds.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
