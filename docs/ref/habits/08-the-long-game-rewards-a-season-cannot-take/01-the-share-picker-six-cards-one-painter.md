### The share picker — six cards, one painter

"Share it" (the Locker's card preview, the wins card, and the button on every celebration takeover)
opens a **sheet**, not a single fixed image. `SHARE_CARDS` in `habits.html` lists six:
**Rank** (crest, level, title, season stats), **The day** (today's habits ticked — "the
one that explains itself"), **Streak** (the day streak, poster-loud), **Milestone** (it was
*Medal* until POL-02), **Title** (a title on its metal plate, 2026-10-17) and **Month** (the calendar
as a grid, Wrapped-style). Each renders in three formats — Post 4:5, Story 9:16, Square 1:1
(`SHARE_SIZES`) — and **the preview IS the export**: `paintSharePreview()` calls the
exact same `buildShareCard()` the Save/Share buttons use, so there is no separate
low-fidelity thumbnail to fall out of sync with the real thing.

**A card is about the win it came from** (2026-10-17, Amir: *"the achievements, badges and other things
need to have a celebration as well, those are important as well"*). Until then every Share it opened a
card about the athlete in general: a milestone's opened `latestMedal()` (the last earned in the list's
order, often not the one that had just landed), a quest's and a comeback's opened the Rank card, a title's
too, and a habit's new rank had no card. Now `openShare(kind, subj)` takes **one subject per card id**
(`{ medal: { k:'milestone', id:'HS2' }, title: { id:'t_early' } }`), `buildShareCard(kind, size, subject)`
hands that card's subject to its painter, and switching cards in the rail keeps them, so the medal is
still that medal after a look at the Rank card. A card with no subject draws what it always did (the
Locker's *Share it →* sends none). Subjects live in `UI.share` only: nothing is stored, and nothing is
shared until the athlete taps. The rail names a card by its subject (`shareCardView()`): the Milestone
card holding a quest says *Quest*, one holding a tier says *Tier*. What each moment sends is the table
in *Every reward, its moment and its card* below.

Every painter is a `{ ground, body }` pair in `SHARE_PAINT`, sharing a small canvas kit
(`scRR`, `scFit`, `scEyebrow`, `scStats`, `scConfetti`, …) so the six stay one family
rather than six one-off drawings. Each is called `(x, W, H, area, subject)`. `scFooter()` always signs
the card the same way — the brand mark (or an "AA" fallback if the image hasn't loaded), "AA PROOF"
over *The habit tracker that keeps score* on the left, and **@amirardekanian** over AMIRARDEKANI.COM on
the right (the handle since 2026-10-17: on Instagram it is the thing a viewer taps). The line that
travels with the image (`caption()`) carries both too.

**Instagram's bars (2026-10-17).** On a Story Instagram draws its progress bar, the name and the close
button over the top ~250 px and its reply bar over the bottom ~340 px, and Proof's footer sat at
y 1750-1836, under the reply bar. `SHARE_SAFE` holds those insets and `buildShareCard()` lays every card
out inside them: on a Story the footer's lowest pixel is y 1580 and the painters get the area
290-1464 (`area.safeTop` moves The day's header down); a Post (area 120-1150) and a Square (120-880) have
no overlay and did not move. **A new painter draws inside `area` and nowhere else**, which
`scripts/headless/proof-cards.js` checks for every card, subject and format.

**The Title card** (`SHARE_PAINT.title`, `titleFor()`): the title as a big metal nameplate in its rarity
(bronze, silver, emerald; event titles, season titles and PROOF ITSELF prismatic), its note in quotes,
and a *what it took* panel: an event's three goals under *FINISHED BACKBONE*, a season's finish (rank,
level and XP) under *FINISHED PRE-SEASON*, or *LEVEL 8 ON THE ROAD* for one off the road. An event title
wears its event's medal above the plate, a road or season title the crest of its rank. With no subject it
shows the title worn, else the newest one owned, else *No title yet*. UNBOWED's card reads *"Fell off.
Came back. Did it again."*

**Share it never loses a takeover.** It used to empty `UI.celebrate`, so a title or a quest queued behind
the level being shared was never shown. The rest of the queue now waits in `UI.celebrateLater` and
`closeShare()` (the ✕, the scrim, the phone's Back) puts it back.

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
