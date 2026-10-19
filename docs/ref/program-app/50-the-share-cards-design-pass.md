## 🖼️ The share cards' design pass (2026-10-19)

**This section wins over *Highlight Reel* above where they disagree.** Amir left the cards twice on purpose — *"the cards are very
important part of this app, because we want to use it to advertise our brand. we need to design them carefull and with details
later"* — so they got a pass of their own: three directions on the page *The Share Cards*
(https://claude.ai/artifact/LiVQZ1kM3Cihz5FWRHvZPv), his answer *"go with your picks"*, then *"all the achievements should get a
card"*, *"I liked the session with photo idea / I think any idea can be sent with their photo as a background like strava's
photos"* and *"Let people zoom in or out manually and move their image if they are using it"*.

**Direction A, Centre Court** — the app's own cover language made into a poster. B (Clay Press, the carousel chrome) and C
(Floodlit, one photograph) stay on the page as the parts bin; C's treatment is what a card becomes when it carries a photo.

- **The card, from the top:** a picture graded into the green (the cycle's own art on a cycle card, else `court-sessions.jpg`, by
  the app's own cover recipe: luminosity, masked from the left, a scrim into the green), the court's lines at 11 %, then
  - the **top strip** at y 286: a mint dot and the eyebrow on the start edge, **the athlete's first name and the date on the end
    edge**. The name moved here from the foot: it is the first thing read, and it is nowhere near Instagram's reply bar.
  - the card's **words**, laid out from the foot UP (y 420 to 1220), so a short card leaves its air at the top where the picture is;
  - the **foot** at y 1300: one hairline, his photo, his signature and, under it, the mantra — *A coach in your pocket.* /
    «یه مربی تو جیبت». "Amir Ardekani · Coach" went: the handle names him, and six things in the bottom third were five too many;
  - the **address line** at y 1496: @amirardekanian, the mark, amirardekani.com. Everything ends by **1568**: a Story's reply bar
    starts at 1580, and `scripts/headless/sharecard.js`'s `bars` rule holds it there.
- **One clay thing per card** (DS-01): the label that says what the card is, or the change, or the place. The number is white and
  huge; a count (a mark) is the **outlined numeral**, the day screen's own P24.
- **Thirteen kinds.** The training's five (**best**, **effort**, **retest**, **cycle**, **roadmap**), Career Mode's **achievement**,
  **mark**, **honour** (the month's) and **open** (the Monthly Open), and four the pass added: **player** (their own card, any day),
  **level**, **goal** (the month's, ticked) and **session**. The old **badge**, **title** and **quest** templates are gone with the
  metals: the cut took them off the server (L2, L5), and nothing opened them.
- **Space Mono** joins Barlow and Barlow Condensed on the card (it is in `assets/css/app-fonts.css` already): every eyebrow, the
  name-and-date line, the mantra and the next-mark line, as in the app itself.
- **⚠️ Every achievement has a card now** (Amir, 2026-10-19). A card used to exist only where a band was DRAWN on the finished card
  or a full-screen moment opened, so 13 of the 35 achievements (the `win` and `highlight` sizes) could fall behind *"+N more in Your
  moments"* with no card at all, and the 13 back-paid on 2026-10-19 never had one. **Every row of Your moments that can be drawn now
  carries Share** (`hlMomentSpec()`, `shareMoment(i)`): every mark, every achievement, every honour, whenever it was earned. The
  full-screen moment is still only for the big ones (`milestone`, `legend`): every achievement gets a card, not every achievement
  interrupts them.
- **Where else Share is offered:** **Share your card** under Your numbers (`hlPlayerSpec()`: the level, the four numbers, the three
  lifts with the highest estimate — each printed as the set it was lifted at, never the estimate, PROG-01); the month's **goal** once
  it is done; **Share level N** on the finished card when the session took them up one (`paintCareerEarn()` knows the level before and
  after); **Share your result** on the Open's card on Crew; and **Share the session** on the finished card, beside Tell the crew.
- **⚠️ A card never names another athlete.** The crew's yes covers the Bell *inside the app*, not Instagram. An honour and an Open
  result carry the athlete's own place and the size of the field (*2nd of 11*) and nothing else of anybody else.
- **The athlete's own photo, on any card** (`opts.photo` + `opts.fit`): it fills the card, takes the house grade (a green multiply and
  a veil, direction C's treatment) and the words sit on it unchanged; the court's lines stand down. In the share sheet: **Use your own
  photo** → the phone's picker → the picture is made smaller **on the phone** (1440 px on the long side, JPEG 0.88) and drawn on it.
  **Drag to move, pinch to zoom**, or the **Zoom** slider; `fit` is `{ z 1–4, dx, dy −1..1 }`, clamped so an edge can never show.
  **Nothing is uploaded and nothing is kept**: the picture lives in `_HL.photo` for that sheet only, is never written to storage, and
  only the finished card leaves the phone, on Share or Save image (`privacy.html#share-cards`).
- **Two layers, so dragging is cheap** (`paint(… { layer: 'bg' | 'fg' })`): the ground and the words are painted separately into the
  preview, a finger moving the picture redraws the ground alone (`ShareCard.reground()`, one drawImage and two fills), and the picture
  that gets shared is the two drawn into one, 240 ms after the finger stops. Share stays disabled until that picture exists, so a tap
  still opens the phone's own sheet inside the tap (Safari refuses it after a wait).
- **A paragraph never draws past its box** (found by the test on a long month's goal): `rich()` draws only the lines `richH()`
  measured and ends the last one on "…".
- **Tests:** `node scripts/headless/sharecard.js` (11,902 checks over 915 cards: 13 kinds, both sizes, both languages, weights and
  name on and off, long names, and every normal sample once on the athlete's own picture, zoomed and dragged) and
  `node scripts/headless/highlight-reel.js` (62). A change to what a card draws ships with a **CACHE bump** (sharecard.js is in
  sw.js's SHELL): this pass is `aap-v193`.
- **Still Amir's to read:** every Farsi word on a card is a draft in `FA` in `assets/js/sharecard.js`, the pass's new lines included
  (the mark's four lines, the honours, the Open, the player card, the level, the goal, the session and the mantra).
