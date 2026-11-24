## 🏆 Moment cards (2026-11-20): every Bell moment is one card, a badge, one big fact and the heart

Amir had sent round 10's Trophy Lines card back (*"i liked it"*, but he wanted the level, the records, a join and the other achievements shown in a more interesting way). Then
direction A, "Trophy Rows", on https://claude.ai/artifact/7bydrN3KFDsDhEtZuyGv4w: *"go with your picks"*. This step is in `program.html` (and its tests), plus one server stage,
`supabase/stage113` (it replaces stage112's percent). Nothing here pays XP (GAME-6), and none of it changes who sees what. The rules, short, are in `docs/rules/crew-feed.md` → *Moment cards*.
Section 59 is the step before this one.

### What it does

- **When.** `crewMcOn()` is `crewPagesOn()` (stage96, `lounge: 1`) and `cabE()` (`window.AAEmblem` loaded). Then `crewLineHTML()` asks `crewMomentCardHTML()` first. A card comes back
  as `div.cr-line.cr-mc.cr-mc-<kind>`. An empty string means "draw the slim row", which the rest of `crewLineHTML()` does exactly as round 10 did.
- **The lead.** `crewMomentLead(it)` picks one part by `CREW_MC_RANK`: honour, mark, achievement, cycle, best, week, level, joined. A line with only `open` parts has no lead and stays slim.
  The other parts become words after the name, from `crewPartText()`, in `.cr-mcsub`.
- **The face.** `crewMcFace(it, lead, first)` returns `{ badge, big, sub, door }` for the lead part, or `{ face: true, big, sub }` for a join, or null when it cannot draw (then the slim row).
  `big` is the plain fact with the clay part in `span.c`. Level, "Level 14". Best, the weight and its gain, "125 kg +5" (the "+5" in clay); the small line holds the name and the lift (`span.lift`, `translate="no"`). Week, "N weeks in a row" or "Week held".
  Achievement, its name, with its rule as the small line when the catalogue knows it. Mark, "100 sessions with Amir". Cycle, "Cycle 3 done". Honour, "Most sessions September".
  Joined, "Welcome, Mina" (yours: "Welcome to the crew").
- **The badge.** `.cr-mcb`: a `span` (level, week, best, cycle, honour) or a `button` for an achievement and a mark that calls `openCrewAch(key, i)`. `crewMcDisc()` draws `.cr-mcd`, the
  green disc of NEW BEST and CYCLE. A join is `.cr-mcf`, the face from `crewFace()` with `i.cr-mcnew`.
- **The right end.** The heart, `.cr-react[data-mode="heart"][data-count="1"]` from `crewHeartHTML()`, the same one a slim row has. On someone else's join, for a member
  (`can_post`), `button.cr-sayhi.cr-mchi` ("Say hello") takes its place and calls `crewSayHello(ck)`.
- **The feed.** `renderCrew()` closes the `.cr-lines` block before a card (`row.indexOf('cr-mc ') > 0`), so a card is never inside it. `crewTwoTap()` is on the card, so two taps on the words like it.
- **The look.** The `MOMENT CARDS` block in the page's CSS: a three-column grid (56 px badge, the words, the heart), Clay `#C7552F` for the clay part, no other accent.

### stage113, `bests`

- Amir first picked a percent (stage112, `gains`), then, asked directly, *"The weight, like my picture"*. stage113 replaces it: `get_bell()` adds `bests` to a `best` part,
  `{ "<lift>": { "kg": 125, "up": 5 } }`. `up` is kg above the **same athlete's previous best on that lift** (the `personal_best` facts), and null for a first best, which reads "80 kg".
  `gains` goes away. This replaces the stage81 rule "a best names the lift and never a weight"; the old line stays in its file with the dated replacement after it.
- `crewMcFace()` leads with the lift that gained most. With several lifts the small line says how many more.

### The fan (2026-11-24): two or more medals on one line

Amir asked how three achievements won on one day should show (the card drew one emblem, one door, and the other two names as words nobody could tap) and took the fan
(*"Build the fan (A)"*, over medal chips under the card). The rule, short, is in `docs/rules/crew-feed.md` → *Moment cards*.

- **`crewMcMedals(it, lead)`** returns every part of the line that is an `achievement` or a `mark` with a badge (`achDetailOf()`), the lead first, the rest in the order sent. It returns `[]` unless the
  lead itself is one of them, so an honour-led line is not a fan. Two or more is a fan.
- **`crewMcFan(medals)`** is the face of such a card, in place of `crewMcFace()`: `{ fan: n, badge, big, sub }`. `badge` is `span.cr-fan.n2|n3` holding the first three emblems; `big` is the plain
  text `3 achievements` or `2 trophies` (one text node, so a Farsi phone gets Persian digits from the existing `(\d+) achievements?` and the new `(\d+) trophies`); `sub` is the names, each in its own span,
  then `+N more` past three. `crewMomentCardHTML()` leaves the medals out of the "other parts as words" so nothing is said twice, adds `cr-mc-fan` to the card, and draws the badge as
  `button.cr-mcb.cr-mcfan` calling `openCrewMedals(key)`.
- **`openCrewMedals(key)`** draws the list in the shared sheet (`sheetWrap()`ped, so ‹ Back works): eyebrow *Achievements* or *Trophies*, title `3 achievements`, `Won by Mina S. · 24 Nov` (yours:
  `Won 24 Nov`), then `.cr-mrow` rows (emblem 48 px, name, its kind, ›). A row calls `openCrewAch(key, i)`, which opens that medal's sheet (your own opens your cabinet's), and ‹ Back comes back to the list.
- **The look.** `.cr-fan` is 56 px square, the same as the badge it replaces, so the card's grid does not change: 36 px emblems 10 px apart, a ring of the card's own colour made with `drop-shadow`
  (it follows any emblem shape, light and dark). Checked at 320 px in dark mode by `scripts/headless/crew.js` section 21.
- **Not done on purpose.** The fan is not drawn when an honour leads (the honour is Amir's; the medals stay words), and the slim row still has its own tappable names (`.cr-ach`).

### The traps

- **`emblems.js` loads deferred.** The page is up before `AAEmblem` is, so the first paint of Crew is slim rows. `emblemsReady()` (the script's `onload`) repaints Crew when it is open.
  A change to that function must keep the `renderCrew()` call, or the cards appear only after the next visit.
- **An emblem that throws.** `crewMomentCardHTML()` wraps `crewMcFace()` in try/catch. A throw gives an empty card, so that one moment is a slim row and the rest stay cards.
- **Lift names are `translate="no"`.** The Farsi engine must not rewrite "Barbell Back Squat". Any new place that prints a lift on a card keeps the attribute.
- **The weight is only on a best.** Level, week, mark and the rest have no kg. There is no check that a card is free of "kg" any more.
- **The slim row is still real.** Tests that look at a slim row run without emblems (`H.NO_EMBLEMS` in `scripts/headless/lib.js`) or on a fixture with no `lounge`. `lounge.js`'s `open()`
  does it by default, and `{ emblems: true }` turns it off. `crew.js` section 21 checks the cards.
- **Twins.** A card and a slim row draw the same heart and the same Say hello. A change to the heart's states changes both, and `paintKudos()` still picks by `data-mode`.
