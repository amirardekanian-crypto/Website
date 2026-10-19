#### Milestones come in three tiers
`tier` on each entry in `ACHIEVEMENTS`, grouped on Progress by `ACH_TIERS` (32 in all
since the marks — see *How progression works*):

| tier | promise | count |
|---|---|---|
| `week` | a good week gets you this | 7 |
| `long` | weeks to months | 20 |
| `rare` | most people never will | 5 |

One flat list gave a new athlete a single reachable row above nine walls, and gave a
two-year athlete nothing left to want. Nothing that scores reads `tier`
— it is presentation only (Progress's groups, a medal's metal), which is why adding six milestones needed no new
machinery on either side, just more rows in `ACHIEVEMENTS` **and** in the
`milestones` array on the `xp_rules` row. ⚠️ Both, or the board pays a different
number to the phone.

**Progress shows the next three** (PRF-02, Amir's 3A, 2026-09-27): day one was 4,595 px
of Progress with 37 milestone rows open and none earned. Folded, the section is the three
you are closest to (furthest along; at zero, the fewest to go), with their bars; what you
have earned on **one row of medals**; and one row, **All 37 milestones**, that opens the
four groups below as they were (*Show the next three only* folds them again). The choice is
`CFG.msOpen.all`, remembered like the groups'. Measured: 4,523 → 1,538 px three weeks in.

**Every tier group — including "A few weeks" — collapses from its own header**
(`msTierHeader()`: the label, the count and a chevron, always shown). Groups are
**open by nature** — closing one is the athlete's choice, not the default — and the
choice is stored in **`CFG.msOpen`**, keyed by tier, so it survives a reload and a new
device; a key missing from it reads as open. Collapsed (under *All 37 milestones*), the whole
section is four one-line headers plus one line explaining what they're for — **"Each one pays
XP, and some a title, yours for good once you cross the line"** (POL-02; it said *challenges*
and *medals*) — sitting right under the section's own count. (An earlier version started
closed and kept the state in `UI.msOpen`, forgotten every visit; this file described that
version until 2026-09-26.)


---
*One section of the reference. The index is [`HABITS.md`](../../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
