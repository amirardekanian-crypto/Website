### Every reward, its moment and its card (2026-10-17)

> **No moment and no card since 2026-10-19.** See *Career screens off*.

| Reward | Its moment | Share it opens |
|---|---|---|
| A new overall level | the whole screen, grape | **Rank**, eyebrow *LEVEL UP* |
| A new overall rank, or prestige past level 50 | the whole screen, the rank ground | **Rank**, eyebrow *NEW RANK* or *PRESTIGE* |
| A road title (10 of the 14 rewards, SIGNED ON to PROOF ITSELF) | on its level's screen (*Unlocked · yours for good*); a screen of its own when no level came with it (a rules change, a sync) | **Title**: its plate, its note, *LEVEL N ON THE ROAD*. The Rank card beside it shows the level |
| A card skin (4 of the 14: EMBER, BLUEPRINT, NIGHTFALL, FLARE) | on its level's screen; its own when no level came with it | **Rank**, painted on the new skin |
| A milestone (32 in families of marks I to III) | the wins card | **Milestone**: that medal in its metal, its note, the XP the ledger paid this season |
| A consistency tier (5 per habit, same-day tiers coalesced) | the wins card | **Milestone** (chip *Tier*): the habit's medal in the tier's metal, *20 days of water and steps in a row* |
| A habit's new rank | the wins card | **Rank** (chip = the habit): that habit's crest and level, with STREAK, BEST STREAK and DAYS DONE |
| A habit's own level | a flash in its row (`UI.flash`): eight habits level often, so it stays small | none: its rank, every fifth level, has the card above |
| A finished *A few weeks* event (5) and its title | the whole screen, kicker *BACKBONE finished* | **Title**: the prismatic plate, *FINISHED BACKBONE* and its three goals |
| A quest completed during a run | the whole screen, badge ground | **Milestone** (chip *Quest*): the quest's name, note and XP (it opened the Rank card) |
| The 3-day day streak mark | the wins card | **Streak**, that mark |
| A day streak mark from 7 (`STREAK_TAKEOVER`) to 365 | the whole screen, ember | **Streak**, that mark: shared after the streak broke, the mark it earned, never a 0 |
| A perfect day | the wins card | **The day**, for THAT day: by the time the card is tapped it can be yesterday |
| A comeback | the wins card | **Milestone** (chip *Comeback*): SECOND WIND, *4 days off. Back, and the day counted.*, +50 XP (it opened the Rank card) |
| A season title (level 5 in a season that has closed, or 2,000 season points once the XP switch is on) | **the whole screen, kicker *Season over*** (new: it arrived in silence) | **Title**: the prismatic plate, *FINISHED PRE-SEASON*, the rank, level and XP it finished on |
| A finished season with no title | **the wins card** (new) | none: the Rank card is already the new season's |
| The career reveal (once the XP switch is on, once per athlete) | **the whole screen, kicker *Your career***, the rank's own ground | **Rank**, eyebrow *MY CAREER* |
| **Once the catalogue switch is on (phase 3):** a badge step or milestone of size *win* or *highlight* | the wins card, its kind of win's emoji, *HUMAN SPRINKLER · Bronze* | **Milestone** on `{k: 'award', id}`: the tier's metal, the kind of win's emoji, the caption, the XP |
| …of size *milestone* or *legend* (one per open, D7) | the whole screen, badge ground, kicker = its kind of win, the size's line | **Milestone** on the award |
| …a catalogue title, the Grand Slam | rides on its award's screen; the Grand Slam is its own (*A title in all four. That's the whole game.*) | **Title**, eyebrow *TITLE · <KIND OF WIN>* or *GRAND SLAM* |
| …a finished event | ONE takeover, the award's (the event's title arrives from the server) | **Milestone** on the award |
| The catalogue reveal (once per athlete) | **the whole screen, kicker *My record***, the four counts and the Grand Slam row | **Rank**, eyebrow *MY RECORD* |

The wins card has one Share it: it opens the newest win that has a card, and the picker holds the newest
win of every other card too (a milestone and a perfect day from one evening are each one tap apart).

**The season's moment is `checkSeasonMoments()`**, the first thing `checkLevelUps()` does, so it runs
on the boot that re-baselines for the new season (that pass stays silent about points; this is the
season's reward, not a point). `CFG.seenSeasons` holds the start dates already shown, only grows, is
unioned across phones by `syncFromCloud()`, and is seeded silently the first time it is missing, so a
record older than this build is history, not a moment. `season_record()` names a title only where the
server minted it, so the title is added to `CFG.pass.owned` there and then rather than waiting for
`syncTitles()`. Embedded on the training app's Home it waits, like every takeover.

**Small truths fixed on the way:** The day's headline says *Day on target.* only when `dayQualifies()`
says so (it was `dayPct >= 75`, a third rule under an 80% gate); the Streak card's line is *On target,
every one of them.* (it said *N habits, logged every day. Not one missed.*, which the one-miss door makes
untrue); the Milestone card quotes the ledger (`milestonePaid()`), never the table, as XP_SYSTEM.md §5
requires; and a habit name in a card's note is its short name (*12 days of water*, not *12 days of drink 8
glasses*). On a Square the Rank card's crest gives way so a worn title's plate clears the stats (it was
drawn over the middle number; `proof-cards.js` found it), the Streak card says *DAY STREAK*, not *ON A
STREAK*, over a 0, and a title or skin takeover's sheen stays on the plate or card (it slid past their
edge as a pale box).

⚠️ The **Month** card's calendar grid must fit inside a fixed body area that also holds
its stat boxes and the footer. A 5-row month (most months, depending on which weekday
the 1st falls on) is taller than a 4-row one, and in the shorter formats (Post, Square)
that extra row used to push the "most consistent habit" strip straight through the
footer text. The fix: row height (not column width) shrinks to whatever the month
actually needs — cells go a little short of square only when a 5th (or 6th) row would
otherwise overflow. Story, with 570px more room, never needs to shrink at all.

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
