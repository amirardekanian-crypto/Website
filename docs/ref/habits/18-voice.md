## Voice

Dry, blunt, a little rude — the same coach who says *"your hamstrings have filed a
complaint with HR"*. The whole nudge library (`NUDGES`: 88 nudge lines and roll call's 20 prompts) is written in it, and
anything added to it has to be: never chirpy, never therapeutic, funny because it is
true. Tokens available in a line are `{n}` (how many are left), `{name}`, `{unit}` and
`{st}` (streak days). Never chirpy, never therapeutic. It notices what you skipped and
says so.

**The name is AA Proof — everywhere on the site, not just once installed** (Amir,
2026-07-27: *"all over my website this is called AA Proof"*). Use *AA Proof* in page
titles, headings, body copy and docs; bare *Proof* is only right as short form inside a
sentence that has already named it in full (*"…Proof tracks the part nobody watches"*
reads fine straight after an *AA Proof* heading). For the install identity the name lives
in three places that must move together — `manifest.name`, `manifest.short_name` and the
`apple-mobile-web-app-title` meta (see *Putting it on the home screen*).

**The look is the MEADOW skin.** A cosy-game re-skin appended to the CSS as an override
layer (`#app`-scoped, so it outranks the base rules without `!important`); the older PROOF
modernist base underneath — zero radius, Barlow, green accent — is still in the file and
no longer shows. MEADOW is lilac paper (`--bg` `#F6F4FF`, warmer at dawn and deeper in the
evening via `data-daypart`), white cards with soft shadows and rounded corners, **grape
`#6C5CE7` as the one reward/action colour** (`--accent`), one colour per habit
(`--hcol`/`--hbg`), flame orange (`--clay` `#E2643A`) reserved for streaks and urgency, teal
(`#35D0BA`) for XP, and **Outfit** for all type (it replaces Barlow, Barlow Condensed and
Space Mono, and `.hd` headings drop their uppercase). Dark mode is a night-purple ground
(`#17142B`). It is deliberately not the website's green/clay brand: Proof keeps its own
lavender/violet look, and the one bridge is the crest
`publishCardSnapshot()` hands `program.html`, drawn on that app's palette. The PANELS
layer (see *The four tabs*) changed layout only, never this.


---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
