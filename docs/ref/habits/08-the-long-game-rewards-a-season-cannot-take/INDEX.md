## The long game — rewards a season cannot take

<!-- Split by sub-heading: one file each. Open the part you need. -->


> **Not drawn or celebrated since 2026-10-19.** See *Career screens off*.

A reward track up the level ladder: **14 rewards**, reached by levelling and nothing
else. There is nothing to buy, nothing to claim, and no second currency. It exists
because the app could tell you your level *after* you earned it and never once told you
what was coming — and "what is coming" is what carries someone through the week where the
numbers barely move.

Two kinds, both free to mint, which is the constraint that shapes the whole feature. A
coach cannot owe forty people a phone call because forty people were consistent, so
nothing on this track costs Amir anything to hand over:

- **Titles** — a name the athlete wears. It sits beside their rank on the board and the
  wall, is printed on the rank card they share, and has a share card of its own, the **Title**
  card (its plate and what it took, 2026-10-17).
- **Cards** — the look of that shareable card. Five grounds (`HOUSE`, `EMBER`,
  `BLUEPRINT`, `NIGHTFALL`, `FLARE`), all painted on the canvas, all inside the palette:
  a treatment changes *structure*, never colour.

A cosmetic is worth nothing without an audience — which is why most habit trackers cannot
make rewards work. This one has two: the board, and a card built to be exported.

**From the catalogue switch (Career Mode phase 3)** the road is unchanged and a third kind joins it: the catalogue's **titles**,
paid by a badge's top steps, a few milestones and the events, minted by the server with their award and never by the phone, and
the **Grand Slam**, a title in each of the four kinds of win (level and season titles never count). See *Career Mode, phase 3*.

**They are kept, and that is the one exception in the whole app.** Every other number here
is derived, so retuning a rule rescores all of history. Rewards are *recorded* in
`CFG.pass.owned` the moment the level is reached, and never taken back — not by a new
season, not by a retune, not by switching a habit off. A reward you can lose is a rental.

That also settles the season question without a second XP ladder: levels reset exactly as
they do now, and what you already unlocked does not. *"A new season resets your points,
not your rewards."*
**Once Career Mode's XP switch is on the level does not reset either** (it is the career's), and the sentence on the screens
becomes *"A new season only starts the board's points again."* Rewards are still recorded and only ever added.

`claimRewards()` records anything the current level has reached and returns only what is
**new**, so the caller can celebrate it — **on the level-up's own screen** since PRF-02
(2026-09-27): *Unlocked · yours for good* and the plate or card under the level, cause and
effect on one screen. It had a takeover of its own queued behind the level; only a reward with
no level in the same pass (a rules change, a sync) still gets one. It runs silently once at boot,
which baselines an athlete arriving with history instead of firing fourteen takeovers at
them. The highest title they own is equipped for them; earning a name and then having to
go and switch it on is a step nobody asks for.

Reached from its own tab, **LOCKER** — the fourth on the main bar (Amir's own redesign,
2026-07-29, promoted it out from a row inside Progress). It reads as a **battle pass**
(Amir, 2026-08-01, pasting a full redesign: *"this should be the redesign of my locker …
This is like league of legends battlepass"*): a season hero states where you are and what
lands next, a loadout shows what you have actually won — the rank card as it will be
shared, then horizontal rails of owned titles and card skins — the Seasons shelf follows
once a season has closed, and below all of it a single **track** threads every rank gate
and reward node on one spine. The screen, top to bottom, is listed under *04 · LOCKER*.

**Getting there took three shapes in one day**, each one fixing what the last one got
wrong, worth keeping straight because the same mistakes are easy to reintroduce:

1. First build: the road listed only the 10 ranks and the 14 rewards. The one highlighted
   box was always the next *reward* — two to five levels away — so at level 4 the ring sat
   on EMBER at level 6 and the single step he could actually take, level 5, was not drawn
   anywhere. *"my objective is level 5 first and not level 6."*
2. Second build: every level became its own row, and the ring moved to `level + 1` — but
   only when it wrote out what was coming ("Then CONTENDER and EMBER skin at level 6"),
   which sat *inside the level-5 box* and read as though level 5 itself were CONTENDER.
   *"the level 5 is the contender … this is a mess. You dont need to write what happens
   next at 6, they understand that by looking."*
3. **The shape that shipped**: position and reward are drawn by two different things, so
   neither can be mistaken for the other.

**The marker (`.trow.mark`, `road-you`) is its own node on the spine**, not a rank band and
not a reward. It drops into the athlete's current rank's list of rewards at the exact cut
point — after every reward that rank has already paid, before the ones it has not:

```js
const cut = rw.findIndex(p => p.lv > lv);
const at = cut < 0 ? rw.length : cut;
return rw.slice(0, at).map(rewardRow).join('') + youAreHereRow + rw.slice(at).map(rewardRow).join('');
```

At level 4 that reads: SIGNED ON (kept) → THE TWENTY-THREE (kept) → **YOU ARE HERE · LEVEL
4** → CONTENDER (the rank gate) → EMBER (locked, ringed NEXT). CONTENDER opens at level 6;
the marker sitting on its own pill, above the CONTENDER gate, is what makes it impossible to
read the rank as something level 4 already reached. The rank band itself says **IN
PROGRESS** now instead of *YOU ARE HERE* — it used to carry that label before the marker
existed and would say it again the moment the athlete reached the gate, one rank position
lying about two different levels.

**A reward already owned is never dangled.** `nextReward()` — read by both the Locker and
the manual's *"Next is X at level Y"* — skips anything `passHas()` already returns true for,
not just anything past the current level:
```js
function nextReward() { const lv = overallLevel().lv; return PASS_TRACK.find(p => p.lv > lv && !passHas(p.id)) || null; }
```
A season reset drops levels to 1 and keeps the shelf, so an athlete rebuilding from level 3
who already owns everything through level 14 must not have the pass hero announce "NEXT ON
THE ROAD: SIGNED ON" for a title they have worn for months. Both call sites get this for
free from the one function.
Once Career Mode's XP switch is on no season drops a level, so that case stops arising from seasons. The guard stays.

**Reward art is the real thing, not a placeholder.** `art()` draws the actual card ground
(`CARD_LOOK`) for a skin or a metal nameplate swatch for a title, greyed (`filter:
grayscale(.5); opacity:.5`) rather than swapped out while locked — a pass tempts by showing
you the exact thing you have not got, not a generic lock icon standing in for it.

**The hero's progress bar measures the current LEG, not the whole climb** — from the last
reward collected to the next one, so it resets to a fresh 4% the moment a reward is picked
up rather than crawling from a number that means less every level. *What you have* holds only
what is **owned** (titles and skins both), so the road below stays the only place a locked
thing is ever listed — nothing appears twice.

Ranks, titles and medals all wear the same metal language (`METALS` in `habits.html`:
bronze → silver → emerald → amethyst → prismatic; the third tier was gold until 2026-09-26,
when the brand's "no yellow or gold, ever" was applied to Proof too). The prismatic rim runs grape, sky,
teal, pink, coral, in the same order in the CSS (`METALS.prisma.rim`) and on the canvas (`metalFill()`):
until 2026-10-17 teal blended straight into coral through a khaki-olive band, the nearest thing to ochre in
the app, 80 px wide on the Title card's plate. `rankCrest()` draws a tier-shaped,
metal-rimmed badge for a rank — the road, the Today hero and the share card all call
it, so a rank never looks different in two places. `titlePlate()` renders an owned title
as a metal nameplate; rarity follows the level it unlocks at (bronze under 13, silver from
13, emerald from 21), except **event titles and PROOF ITSELF, which are always prismatic**
regardless of level. Medals are the third piece: `achMedal()` draws a milestone as the
habit's own emoji (or one for its measure — 💎 perfect days, 📋 three-habit days, 🔄 and
🛡️ comebacks) on a disc tinted in that habit's colour, inside a metal rim set by its tier
(bronze *A good week*, silver *The long haul*, emerald *Rare*); `evMedal()` draws an event as
its own emoji on a dark disc inside the prismatic rim (THE FOUNDRY's is ⚒️). Perfect days wore 🏆
and THE FOUNDRY ☀️ until 2026-10-17: both are gold in every emoji font, and the share cards put them at
the centre of a medal on Instagram. **Not yet earned is dimmed, not
broken:** the same medal at 40% opacity, real rim and tint kept — the convention the
Locker's road uses for locked rewards. A dashed, greyed disc reads as *something went
wrong here*, not *you haven't got this yet*. None of this changes what is earned or when —
it is presentation over the same `PASS_TRACK`/`ACHIEVEMENTS`/`EVENTS` data.


## The parts

- [The share picker — six cards, one painter](01-the-share-picker-six-cards-one-painter.md)
- [Every reward, its moment and its card (2026-10-17)](02-every-reward-its-moment-and-its-card.md)
- [Titles on the board (stage 17)](03-titles-on-the-board-stage-17.md)

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
