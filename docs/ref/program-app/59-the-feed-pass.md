## 🫶 The feed pass (round 10, 2026-11-20): one heart per post and line, a post in the Instagram order, replies that fold, Trained Today's faces, Add Yours

Amir's round 10 was the Crew Feed Facelift (https://claude.ai/artifact/5gPzro3bCbP93CN4vysaGr), then the feed pass (https://claude.ai/artifact/8kYKCuynCHXZFhhgBKoQkL). His words:
*"go with your picks"*, direction B. The ideas are 112 Quiet Lines, 113 Post Reshaped, 114 Trained Today and 120 Add Yours (in `.claude/skills/ideas/BANK.md`). This step is in `program.html`
(and its tests), plus one server stage, `supabase/stage111_trained_faces.sql`. Nothing here pays XP (GAME-6), and none of it changes who sees what. The rules, short, are in
`docs/rules/crew-feed.md`. Section 57 and 58 are the steps before this one.

### 112 Quiet Lines, and the heart

- **The row.** `crewLineHTML()` draws `.cr-line.cr-slim`: the face, the words in full, who liked it and when under them (`small[data-kw]`), and the heart at the right end with its count
  (`.cr-react[data-mode="heart"][data-count="1"]`). Same-day lines sit together in one white block, `div.cr-lines`, which `renderCrew()` opens at the first line of a day and closes at
  a post, a face card or the next day.
- **The heart.** `crewHeartHTML(target, k, own, count)` draws the five states `crewReactRow()` keeps: own item, nothing; under 13, a `span.cr-ht.is-tally`; not joined, a heart that calls
  `crewLikeAsk()`; chosen, `.cr-ht.is-on` (and `.is-em` with the reaction's icon, in green); not chosen, an empty heart. A tap is `crewHeartTap()`, which calls `crewLike()` and so
  takes your own back.
- **The four reactions.** `crewHeartPress()` (a touch held 480 ms, not for a mouse) and `crewHeartMenu()` (`oncontextmenu`) call `crewUnfold(key)`. `paintKudos(key)` then draws
  `crewReactRow()` in place, the row gets `is-menu`, and the ✕ is `crewFold()`. `_crewOpenEm` remembers the open menus for this visit. A server with no reaction list sends no
  `oncontextmenu` at all.
- **Two taps.** `crewTwoTap(ev, key)` (on a post or a line) and `crewPhotoTap(ev, id)` (on the photo) call `crewDoubleLike()`, which draws `crewHeartBurst()` and likes only if you have not.
  A two-tap never takes a like back.

### 113 Post Reshaped, and replies

- **The order.** `crewPostHTML()`: the photo first, then `.cr-icons` (the heart with no count, the reply bubble `button.cr-ht.cr-rp`, and `.cr-icons-end` with Share and Delete on your own
  post), then **Liked by** (`small.cr-names.cr-lb[data-lb]`, from `crewLikedByHTML()`, hidden while nobody has liked), then the words. With a photo the words are `p.cr-body.cr-cap` with the
  name in bold. A post without a photo keeps its words on top. The `.cr-foot` row and the **Reply…** line (`.cr-rep-line`) are gone.
- **The bubble** opens `openCrewReply()`, the same half sheet. It is drawn only for someone who can post and only on a post that carries `replies` (a server without stage92 sends none).
- **Replies fold.** `crewRepsHTML(it)`: with two or more only the newest shows, under `button.cr-rep-more` ("View all N replies"), which calls `crewRepsOpen(id)`. `_crewRepOpen` remembers the
  opened threads for this visit. Someone who has not joined keeps `button.cr-rep-add` ("Join the crew to reply") after the replies.
- **A reply you were sent to.** `crewUnfoldReply(rid)` opens its thread first. It is called by `crewLandAimed()` before the tint and scroll, and by the Inbox's door before `inboxLight()`.
- **The photo viewer** (`openCrewPhoto()`) is not reshaped: it keeps the whole `crewReactRow()` in its own `.cr-foot`, on the dark ground.

### 114 Trained Today

- **The server.** stage111 (applied live as migration stage110_trained_faces) adds `people` to each `sess` item in `get_bell()`: `[{ ck, fv, who, cheered }]`, one per member who trained that day and is not the viewer, the same members as `names`
  in the same order. `cheered` is the viewer's own cheer of that person today, counted on the UTC day `crew_cheer()` uses. `names` is untouched.
- **The card.** `crewSessHTML()` calls `crewTrainedHTML()` when `people` is an array and `crewPagesOn()` (stage96) is true: `div.cr-tt` with the heading (**Trained today**, **Trained yesterday**,
  **Trained on Monday**), "N sessions", a row `.cr-ttf-row` of `span.cr-fc.cr-ttp[data-ck]` and a hint, `p.cr-tth.cr-hint`, on today's card only while `crewCheerHintWanted()` says so.
- **A face.** `button.cr-ttb` calls `crewBandTap()`, the week band's own handler: a tap opens the page after 250 ms, a double-tap is `crewQuickCheer()`. `crewMarkCheered(ck)` turns every copy of that
  face clay (`is-cheered`) and adds the clap, `i.cr-ttc`, without repainting the feed. `p.cheered` marks it from the start and fills `_cheered`, so a double-tap on any phone says
  "Come back tomorrow".
- **Old server.** Without `people`, or without stage96, the old `.cr-line.cr-sess` words line is drawn exactly as before, with no reactions.

### 120 Add Yours

- When the viewer trained today (`me: true`) their own face comes first, `.cr-ttp.is-me`. `crewAddYoursDay()` returns a programme day finished today (the `<id>_completed_d<day>` stamp, read with
  `completedHere()`) that is not yet on the Bell as one of your session posts today, or null. With a day, the face carries `i.cr-ttplus` and opens `openCrewPost('session', day)`; without,
  it opens your page. It needs `crewCanTell()` and a photo left to post.

### The traps

- **A folded reply that a door lands on.** The fold hides all but the newest. Any new way to send someone to a reply must call `crewUnfoldReply(rid)` first, or the tint lands on nothing.
  The tests that read every reply of a post (`lounge.js`, `crew.js`) tap "View all" first.
- **A double-tap against a door's single tap.** The photo and the face both wait for a second tap (260 ms and 250 ms), so a single tap is a quarter of a second late by design. Two taps must
  never also open the viewer or the page. `crewTwoTap()` skips a tap that lands on a button, a link or the reply thread, so a name or a face keeps its own tap.
- **`touch-action: manipulation`** is on `.cr-post`, `.cr-line.cr-slim`, `.cr-ph`, `.cr-ttf-row` and the band's faces. Without it a phone zooms the page on a double-tap.
- **The long-press and the click that ends it.** A long-press fires `crewUnfold()`, and the finger lifting then sends a click. `_crewLPFired` swallows that one click, or the long-press would also
  like the post.
- **Old server.** No `people`: the words line. No reaction list: a heart with no long-press. No stage92: no bubble and no replies block. Test each, as `crew.js` does.
- **Twins.** The heart and the full menu (`crewHeartHTML()`, `crewReactRow()`) draw the same five states. A change to one state changes both, and `paintKudos()` picks by `data-mode`.
- **Tests.** `scripts/headless/crew.js` (the heart, section 20), `lounge.js` and `inbox.js` were rewritten for this markup. They were written without a browser on hand and run on the next
  machine that has Playwright.
