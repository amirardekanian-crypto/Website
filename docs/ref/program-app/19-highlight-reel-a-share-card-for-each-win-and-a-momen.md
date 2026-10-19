## 🎬 Highlight Reel: a share card for each win, and a moment for each (2026-10-17)

> ⚠️ **The cards had their own design pass on 2026-10-19** (`PROGRAM-APP.md` → *The share cards' design pass*).
> Where the two disagree, that one wins: the look, the thirteen kinds, where Share is offered and the athlete's own photo
> are all from it. What stays true here: one painter, the two sizes, both languages, the rules a card obeys, and the five
> places a win shows.

Amir asked to celebrate athletes' wins and let them share them on Instagram, approved the design page
(https://claude.ai/artifact/SuyYRPeX9n2SdbiUvoHhkF) with *"go with your picks"* on all five decisions (all five cards at once; the
athlete picks English or Farsi; the weights shown, with a switch to hide them; his photo and signature on every card; the name
Highlight Reel), and added *"the achievements, badges and other things need to have a celebration as well"* (Career Mode's GAME-14).

- **One painter, `assets/js/sharecard.js`** (`window.ShareCard`): a canvas, 1080 × 1920 (Story, the default) or 1080 × 1350 (post), the
  court's lines on every card, Centre Court's green and clay, Amir's photo (`assets/img/coach.jpg`), his signature (`WN_SIG`'s two paths,
  drawn with Path2D), the mark, @amirardekanian and AMIRARDEKANI.COM. In a Story the top 250 px and the bottom 340 px stay clear (Instagram's
  bars). Ten templates: the training's **best** (New Best), **effort** (Same Effort), **retest** (Retest), **cycle** (Signed Off, with the
  cycle's own cover, `cycleArtUrl()`) and **roadmap** (The Distance, each cycle's cover small), and Career Mode's **badge**, **achievement**,
  **title**, **level** and **quest**, drawn with sample data until phase 3 feeds them. Barlow and Barlow Condensed from
  `/assets/css/app-fonts.css`; Vazirmatn (`assets/fonts/Vazirmatn-Variable.woff2`) loaded only for a Farsi card: right to left, Persian
  digits, no letter-spacing, a lift's and a cycle's name in English. **Decided** (Amir, 2026-10-17: *"Keep all three Farsi choices"*):
  Iranian (Shamsi) dates on a Farsi card (the design page had shown Gregorian), the athlete's name in English letters, and "Career Mode"
  in English on the level card. Arrows, ticks and stars are drawn (the font files carry Latin only). **Every Farsi word is in ONE table,
  `FA`; Amir read and approved them on 2026-10-19.** program.html loads the painter the first time a card is drawn (`hlLib()`);
  sw.js precaches it.
- **The rules (the design page's):** a card says what the app says, from the same rules (PROG-01): the set as lifted (`w × r` from the
  record), never the 1RM estimate; a kilo gain only at the same reps (or a reps gain at the same weight). Never body weight, a check-in
  answer, pain or an RPE-only claim (`winText()` now says each win's `shape` and `share`: *felt easier* wins and *stronger* only because it
  felt easier are not offered). Nothing leaves the phone until the athlete taps **Share** or **Save image**; nothing is ever posted for them.
  Never in the coach's preview.
- **The five places** (each where the win already shows):
  1. **The finish card** after Done: a **New best** band (`noteNewBest()` collects every new best while Done files the records:
     `_hlCollect`, `collectWins()`) and a **Retest beaten** band (new: a test-flagged lift in the retest window, against the previous test
     of the same lift, else the best before the cycle; beaten = more weight for at least the reps, or more reps for at least the weight).
     Three at most, the retest first. In the card's green (grid row 5), a burst the first time. Kept as `<id>_hlwin_d<N>` (`{ sess, specs }`,
     a raw write that `_snapshot()` skips, tied to the finish stamp like the day's set copy), so a reload shows it again, quietly.
  2. **The This cycle card** (Progress): **Share a win ›** under the wins (`cycleWins()` keeps each win's two sets `a` / `b` with their
     dates; `hlEffortSpec()` names their cycle weeks). Past the end date the card has **Share your cycle** (**Share the whole road** on the
     roadmap's last cycle) and its sheet offers the cycle, then each win.
  3. **Cycle complete / Roadmap complete**: a one-time full-screen moment (`maybeHighlightMoment()`, `openMoment()`, the Welcome's recipe)
     at the first open in the 14 days after the end date: the cycle's cover with a burst of court lines, the card itself, his words and
     signature, **Share your cycle** and **Not now**. `<id>_hl_seen` (synced) marks it, so it shows once across phones. Never over the
     Welcome, never in the demo or the preview. Back closes it (`topLayer()`). **Its Share button hands the moment's one guard history
     entry to the share sheet** (`dropMoment(true)` then `openShareSheet()` then `navSync()`): popping the entry with `history.back()` and pushing the
     sheet's own in the same tick let the late pop remove the sheet's entry, and closing the sheet (✕ or Back) then left the app (found 2026-10-18;
     a reward's moment goes through the same `openMoment()`). Any new "close this layer, open that one" hand-off does the same, never `closeX(); openY()`.
  4. **Personal Records**: **Share** on a lift's New best band, on a **Retest beaten** band (a test logged there in the last 7 days that beat
     the one before), and on every row that set a record (it beat every entry before it). A lift's first record beats nothing: no card.
  5. **The share sheet** (`openShareSheet(specs, i)`, a page of the one sheet, wrapped by `sheetWrap()`): a picker when there is more than
     one card, the preview (the exported picture itself), **Story | Post**, **English | فارسی**, **Show the weights** (hidden: the change
     only; not shown for a card with no kilos), **Show my name**, **Share** (the phone's share sheet with the PNG and the caption:
     `navigator.canShare` / `share`; a phone that cannot share a picture saves it instead and says so), **Save image**, **Copy caption** and
     the tip *Mention @amirardekanian in your Story so Amir can share it too.* The choices are `aa_hl_prefs` (no athlete prefix, never
     synced). Share waits for the picture so the phone's sheet opens inside the tap (Safari refuses it after a wait).
- **Career Mode** (phase 3) opens a reward's card with the same `openShareSheet([spec])` and its moment with `openMoment({ eyebrow, title,
  sub, art, words, go, specs })` (career/CAREER_MODE.md, GAME-14). The data shapes are written above each template in sharecard.js.
- **The guide** has a *Share a win* card (`key: 'share'`); the privacy notice says how a card is made and where it goes (§2.2, `#share-cards`).
- Checked by `scripts/headless/sharecard.js` (every template at both sizes, in both languages, with weights and names on and off and with
  long names: no text past its box, nothing in Instagram's bars, nothing overlapping, Persian digits in Farsi, the EN and FA tables
  key for key) and `scripts/headless/highlight-reel.js` (the real app: the bands, the row, the moment, the sheet, Personal Records, 320 px,
  reduced motion).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
