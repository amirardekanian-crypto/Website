# 🏟️ Players' Lounge, continued (2026-10-24): @names, First Serve, Bring a partner, the cards and the Open wall

Steps 7 to 11 of the Lounge. The ground rules every step obeys, the shared helpers (`crewPersonOf`, `crewFace`, `crewDoor`, `openPlayer`, the page cache) and steps 0 to 6 are in the section before this one, *Players' Lounge (2026-10-24)*. The server shapes are the contract's, `CONTRACT.md` in the Lounge folder. Amir's picks, 2026-10-24: *"go with your picks"*.

## Step 7 · @names in replies (ideas 64 and 54, direction A "Name Chips")

**What.** In the reply sheet, typing **@** opens a row of the crew's faces and names ABOVE the field (a 24 px face and the name, 44 px tall, scrolling sideways). What follows the @ filters it (the start of the
name or of a word in it: *@S* gives Mina S. and Sara T.), you are left out, the people in this thread come first, and a name already in the reply is not offered twice. A tap puts **@Name** and a space where the @
was and keeps the keyboard up (the field is focused inside the tap). The writer sees **@Name**; the server gets the token `@[ck|Name]` (CONTRACT 5). At most **5**: a sixth @ says *You can name 5 people in a reply.*
The 140 is what is SEEN (the server counts a token as *@name*), so the field's own count is the right one, and a name that would not fit is not put in. In a thread, `crewRepsHTML` draws each token as a small green
button **@Name** to that person's page when the reply row's `mentions` names them as a member, and as plain **@Name** for anyone else (someone who has left, a broken token, an under-13 viewer, a server without stage96).
`openCrewReply` is registered in `wrapSheetOpeners()` (it was the one sheet opener missing, so it had no ‹ Back).

**Why.** Amir: *"go with your picks"* (7 mentions, A Name Chips). A name in a reply rings that person ("Sara mentioned you", never the words: push.md), which is why the token carries a ck and not just a name:
a display name is not unique, and two members called *Ali B.* are two chips.

**How the phone keeps the names straight.** The field holds plain words, so `_mn.list` keeps `{ck, text, s, e}` for each name put in, and every edit of the field is a diff anchored at the caret (a typed @ right before an @
is an insertion before it, not an edit of it): a name the edit touches stops being a name (its last letter taken away leaves just words), a name after the edit moves along. At Send, each name still whole is turned
into its token (`crewMnBody()`); the rest goes as typed. **Above the keyboard:** an iPhone does not shrink the page, only `visualViewport`, so while the keyboard is up (`vv.height` well under `innerHeight`, not zoomed) the
sheet is fitted to what it leaves (`#hist-overlay` top and height, the modal's max-height), so the names, the field and the counter are all above the keyboard; with no keyboard nothing is set, and closing the sheet lets go.

| function | job |
|---|---|
| `crewMentionsOn()` | the row exists only when the server has stage96 and you are not under 13. |
| `crewMentionsHTML(r)` / `crewMnRe()` | a reply's words with each token drawn as the name: a button, or plain. Everything else is escaped. |
| `crewMnPool(it)` / `crewMnName(w)` | who can be named, and a name as it is written in the field and the token (no `]` `|` `@`, at most 24). |
| `crewMnStart` / `crewMnEnd` | the sheet opened / is done (the names forgotten, the keyboard fit undone). |
| `crewMnEdit(caret)` / `crewMnQuery` / `crewMnShow` / `crewMnPick(i)` | the diff of an edit · what follows the @ · the row · a tap on a name. |
| `crewMnBody(ta)` | the body that is sent. |
| `crewMnFit()` | the sheet above the keyboard (visualViewport). |

**Tests.** `lounge.js` section 20: the row above the field and hidden, the filter (@, @S, @Sa), the order, the face and the 44 px target, the tap (text, caret, focus, count), the token sent, two people called Ali B.,
text typed before and after a name, a name edited by hand is words, a name typed by hand is words, five at most, the 140, the keyboard (a fake `visualViewport`: the sheet ends above it and lets go), `openCrewReply`
under another page has ‹ Back, a member as a button and anyone else plain, yourself, a token that is not one, markup that is only words, under 13, a server without stage96, and the guide. `stub.js` answers `crew_reply`
like the server (a token for a member who is not you is kept, the first five only; any other becomes plain @name; the row carries `mentions`).

## Step 8 · First Serve, one line at a time, with a Turn on notifications step (idea 68, direction B)

**What.** A new athlete's first two weeks as **five steps**, in this order: *Finish your first session*, *Add the app to your Home Screen*, *Turn on notifications*, *Join the crew*, *Add your photo*. Home shows
ONE line at a time, in the one suggestion slot (`#home-sugg-wrap`, `paintWeekSugg()`), **first in its priority** (before the week's own suggestion and the crew's invitation) while the athlete is new and until all are done:
a 32 px ring (a 44 px target) saying **2/5**, a clay *First serve* kicker and **Next: add the app to your Home Screen** with a chevron. A tap on the line does the step; a tap on the ring opens a sheet **First serve** with all five
and their ticks (each undone row does its step; the photo row opens Your photo, which comes ‹ Back to the five). When all are done, or 14 days have gone, the slot goes back to the crew's invitation and the Library's picks.

| step | done when | a tap does |
|---|---|---|
| Finish your first session | `hasFinishedASession()` | opens the day Home suggests (`suggestedDayId()`) |
| Add the app to your Home Screen | `_isStandalone()` | the install offer (`showInstallOffer()`, the dismissed flag cleared, as Account's *Install the app*) |
| Turn on notifications | `AAPush.state()` is `on` **or `blocked`** (the answer is in; a blocked phone is never nagged) | `pushAsk('serve', line, true)`: the one line with its **Turn them on** button. On an iPhone that is not on the Home Screen the step waits behind step 2 (*Turn on notifications (after step 2)*) and a tap on it is the install offer |
| Join the crew | `crewMe().answer === 'yes'` | `goTo('crew')`, which asks Crew's question |
| Add your photo | your own `fv` is set | `openFacePhoto()` |

**The window and who never sees it.** 14 days from the first finished session (the earliest day in the phone's history copy, or in a day's finish stamp), or from `cycles[0].startDate` while there is no session yet.
Never to a veteran: a second cycle or later (`currentCycleIndex > 0`), or `onbVeteran()` with a first session older than 14 days or one the phone cannot date. Never in the demo or the coach's preview. The line waits until
the crew has answered once (`_bellTried`, from the phone's copy or the server; a new phone asks at once instead of at 2.5 seconds), so the steps do not change under it, and it is drawn again when the page has loaded (push.js is deferred).

**A step that cannot apply is not in the list**, so the ring says *2/3* and nothing nags for what the phone or the athlete has settled: no notifications step in a browser that cannot take them (`pushReady()`), no join or photo
for an athlete under 13, on a server with no crew, or for someone who answered **no** to the crew (a no stands), and no photo step on a server without stage96.

**The third push moment (docs/rules/push.md, 2026-10-24).** Amir: *"can we add turn on notification for the app as well?"* The rule is now THREE moments: installed and opened from the Home Screen, joining the crew, and the athlete
tapping First Serve's *Turn on notifications* step. **The phone's box is still never ours to open**: First Serve's code has no `requestPermission` and no `enable()`; its tap puts up `pushAsk()`'s toast (one line, a button,
`ms: 0`), and `Notification.requestPermission()` runs inside that button's click and nowhere else. The athlete's own tap on the step shows the line every time (`pushAsk`'s new third argument skips the one-per-reason memory
that the two automatic moments keep), because a tap that does nothing is worse than a second look at a line.

| function | job |
|---|---|
| `firstServeWanted()` / `fsNew()` / `fsHeld()` / `fsFirstDay()` | whether the line is on Home: the window, the veteran test, the wait for the crew. |
| `fsSteps()` | the steps that apply, in order, with their ticks. |
| `firstServeHTML()` / `firstServeSheetHTML()` / `openFirstServe()` | the slot, the sheet, its opener (a wrapped sheet opener). |
| `firstServeDo(id)` | what a tap on a step does. `paintWeekSugg()` also redraws an open sheet as the steps tick. |

**Tests.** `lounge.js` sections 22 and 23: the ring, the order, the priority over the week's suggestion and the crew's invitation, each done-test in turn, blocked as done, the iPhone wait, what each tap does, the box (a stand-in
for `Notification.requestPermission` and for a ready service worker: shut on load, on the line, on the sheet and on the toast, once inside the button's click, never for `on` or `blocked`), never a veteran, 13 and 14 days, the
demo and the preview, the steps that do not apply, the wait for the crew, the guide card, 320 px, dark mode, and the pictures. `lib.js` takes an `init` script for the stand-in.

## Step 9 · Bring a partner (idea 69, direction A "A Card on Your Page")

Amir, 2026-10-24, on the deal: *"the idea 69 gives the memeber 10% discount to the new memeber, and 10% to themselves"*. So a friend who uses your code gets 10% off, and you get 10% off your next cycle.

**What.** A card on YOUR page, right after your numbers, headed *Bring a partner* (`playerPartnerHTML()`). It is there only when your own `crew_page()` carries `referral` (stage97: a server with stage96 alone sends none, so there is no card), and never on anyone else's page, never for an athlete under 13, never in the demo or the coach's preview (`partnerOn()`). Someone who has not joined the crew still has it: a code is a discount, not the crew.

- **No code yet:** the line *They get 10% off. You get 10% off your next cycle.* and ONE button, **Get your code**. A tap makes the code, `my_partner_code({ p_make: true })` (15 s, one call at a time). No signal keeps the button with *No signal. Tap again when you have signal.*, a refusal says *That did not work. Try again.* The answer is written into your cached page (`<id>_crewpages`, never synced) and the card draws again.
- **With a code:** the code big in Space Mono on a dashed field, the same line, **Copy** (outlined) and **Send on WhatsApp** (the page's primary button), and, once a friend has joined, *1 friend joined · 10% off your next cycle is waiting for you.* (two waiting: *10% off each of your next 2 cycles is waiting for you.*, because each friend is 10% off ONE cycle and never 20% at once) from `friends` and `waiting` (*2 friends joined · your 10% off is used* when none waits). The numbers are the server's `percent` and `reward` (10 when absent).
- **The message** is the same for both buttons (`partnerText()`): English, *Train with Amir Ardekani. Use my code SARA24 for 10% off: https://amirardekani.com/form.html?code=SARA24*. For an athlete whose intake form says Farsi (`pushLang()`) it is a Farsi message that points at `form-fa.html?code=`, **a DRAFT for Amir to read**: the code and the link sit on their own lines so a right-to-left line cannot move them. Copy tries the clipboard, then `execCommand`, then shows the words in a box (`#pt-sel`) already selected, so a long press copies them. Send on WhatsApp is a plain `wa.me/?text=` link that opens outside the app.
- The guide (`GUIDE_PARTNER`) names the card only while it is on the page. A code earns no XP and rings nobody (GAME-6).

| function | job |
|---|---|
| `partnerOn(p)` | whether a page gets the card: it has `referral`, it is not under 13, and this is not the demo or the preview. |
| `playerPartnerHTML(p)` | the card, in both its states; called from `playerHTML()` for your own page only. |
| `partnerText(r)` / `partnerWaUrl(r)` / `partnerNote(r)` / `partnerPct(r, k)` | the message in the athlete's language, its wa.me link, the friends line, the percent from the server. |
| `partnerMake(btn)` / `partnerCopy(btn)` | Get your code, and Copy with its two fallbacks. |

**Tests.** `lounge.js` section 24: the card with no code (the line, one button, its place after the numbers), nothing made by looking, the tap and its one call, Copy and the toast, the fallback box with its selection, the link's text, the friends line in four cases, no signal, a refusal, a double tap, never on anyone else's page, under 13, not in the crew, the demo and the preview, a server without stage97, the Farsi draft, the guide, 320 px and dark mode. Section 25 takes the pictures. `stub.js` answers `my_partner_code` like CONTRACT 8 and your page carries `partner` as `referral`.

## Step 10 · The cards (ideas 63 and 66, direction A "Photo Poster": keep the player card, add the stamp)

Amir kept the card he already has and picked a stamp for crew photos. Nothing in `assets/js/sharecard.js` changed: the card is the player card and the session card as they were.

**Share my card.** On YOUR page, under your name, **Share my card** (`playerShareHTML()`, the outlined button) calls `sharePlayerCard()`: the same sheet, the same spec (`hlPlayerSpec()`), the same card as Progress's *Share your card*, and nothing new on it. It is there only when Career Mode has your level (the card cannot be made without it; `paintCareer()` redraws the page when the profile lands) and never in the coach's preview. A card never names another athlete: it carries your first name and your own numbers.

**The stamp.** A session photo on the Bell wears one strip across its foot (`crewStampHTML()`, drawn inside the photo's button, `pointer-events: none`): Space Mono capitals, white on a dark shade (`rgba(0,0,0,.64)`, the strip's own, in both themes), the AA mark at its right. It reads the parts the post has, in this order, joined with ` · `: the session's name, `64 min`, `Week held`, and the day it was posted. *LOWER · POWER · 64 MIN · WEEK HELD · 24 OCT*. A post from before the stamp has only `{day, n}` and reads *DAY 2 · 24 OCT*. Each part after the name stays on one line, so a long stamp wraps between parts. Only a `kind: 'session'` post with a photo, and only while the server speaks stage96 (`crewPagesOn()`); a plain photo post and any post on an older server are as they were.

**What Tell the crew sends** (`crewSessionPayload()`, CONTRACT 2). `p_session` is `{day, n}` as ever and, with stage96, also `title` (the day's name as the app says it everywhere: its title, else its focus tag, 40 characters at most, cut at the end of a word), `mins` (the clock's minutes, 1 to 300, none when there is no clock or it ran six hours in a pocket) and `held` (`true` when THIS session closed its training week: the phone worked that out at Done and kept it on the day's earn record, `<id>_earn_d<N>`, so with Career Mode off it is `false`). The composer says what the stamp will read before anything is sent (*Your photo gets a stamp: ...*, `crewStampNoteHTML()`), so what the crew sees of a session is never a surprise.

**Share, on your own session photo** (`crewShareCard(id)`). A small **Share** at the left of the post's foot, Delete staying at the right: only on your own session photo, never on anyone else's, never in the preview. It opens the existing session card (`kind 'session'`, the spec `hlSessionSpec()` makes, built from the POST's own words by `crewPostSpec()`: its name, its minutes, the day it was posted, the day's sets only when that day is still today's) with that very photo as the card's ground, so it goes to Instagram as one picture. The sheet opens at once and the photo arrives a moment later (`crewPhotoData()` reads the phone's copy, `hlUsePhoto()` puts it in); Remove the photo, the zoom and the drag work as on every card. Nothing leaves the phone until Share or Save image.

| function | job |
|---|---|
| `playerShareHTML()` | Share my card on your page. |
| `crewStampParts(session, at)` / `crewStampHTML(it)` / `crewStampTitle(t)` / `crewDayName(day)` | the parts of a stamp, the strip, a name cut to 40, the day's name. |
| `crewSessionPayload(day)` / `crewSessionHeld(day)` / `crewStampNoteHTML(day)` | what Tell the crew sends, whether the session held the week, the composer's line. |
| `crewShareCard(id)` / `crewPostSpec(it)` / `crewPhotoData(id)` / `hlUsePhoto(url, w, h)` | Share on your photo, its card, the photo as a data URL, the card's photo ground. |

**Tests.** `lounge.js` section 26: Share my card opens the player card (the same spec as Progress's, no other name), no button without a profile, in the preview or on someone else's page; the stamp on a full post, with some parts missing, on an old post, never on a plain photo post or on a server without stage96, inside the photo and in capitals, the viewer still opens; Share on your own session photo only, with the post's own card and the photo as its ground; what Tell the crew sends in each case (held, no clock, six hours, a long name, a day with a title, no stage96, no week closed); the guide; 320 px and dark mode. Section 27 takes the pictures. `stub.js`'s `crew_post` keeps from `p_session` what stage96 keeps.

## Step 11 · The Open wall (idea 67, direction A "Tiles")

**What.** The Monthly Open's board, on Crew, is two columns of tiles (`crewOpenTile()`): the place in small mono, the face (46 px, `crewFace(p, 'tile')`), the result as the big figure with its unit small beside it, and the name. Yours is outlined in mint and reads *You*. The first 8 are drawn; with more, **All 14 ›** opens the whole board as a list in a sheet (`openCrewOpenList()`, a wrapped sheet opener, so ‹ Back works over another sheet): place, face, name and result on every row, yours marked. Your own tile is carried in after the eight when you are further down (still marked with your true place, the rule the rows had). Every tile and every row opens that person's page (a button through `crewDoor()`, yours opens your page); an athlete under 13 gets the same tiles and no door.

**What did not change.** The clay door to WhatsApp (*Send Amir your result* / *Send a better one*), the line *Your result: ... Beat it and send me the new one.*, *Share your result* and the empty board's *Nobody has put a result up yet. Be first.* are exactly as they were. The Open's share card still carries only your own result, your place and the size of the field: **a card never names another athlete**, and none of this goes into a share card. Nothing here pays XP (GAME-6).

**Without stage96** the board is the rows it always was, five of them and yours, with *Show all 9* opening them in place (`crewOpenAll()` decides by `crewPagesOn()`). `crew.js` holds that path, unchanged.

| function | job |
|---|---|
| `crewOpenHTML()` | the card; the tiles when `crewPagesOn()`, else the rows. |
| `crewOpenTile(r, unit)` | one tile. |
| `openCrewOpenList()` / `crewOpenGo(ck)` / `crewOpenAll()` | the list sheet, a row's tap (closes the sheet, opens the page), the button. |

**Tests.** `lounge.js` section 28: the grid and its order, two across, the face, the place, the figure and the name in order, the mint outline, the picture on a tile whose person has a face, the door and the line under the tiles, a tile opening a page and ← coming back, your own tile, more than eight (you inside, you outside, exactly eight, nine, one entry), the list and its rows, a row opening a page, ‹ Back over another sheet, an empty board, not in the crew, under 13, a server without stage96, the share card untouched, 320 px with a long name and unit, dark mode, the guide. Section 29 takes the pictures.

## 2026-10-25 fixes · the cover, the cheers number, Profile in the account sheet

Amir, from his iPhone, the day after the Lounge went live: *"The only thing is that the background on the top of the page is too small, cant see anything / The number of cheers is wrong. / And we should be able to change profile settings in the settings when we click on our image on top right side of the app as well. Its part of the settings."* Three fixes, three commits, `sw.js` v225.

- **The cover is a banner.** `.pl-cover` is `min(200px, 51.3vw, 28vh)` tall and never under 104 px: 200 px at 390 wide, 164 at 320, 140 on a 500 px screen. Its picture is the cycle's own (`cycleArt()`; yours is exactly Progress's), cropped to cover at full strength with `brightness(1.4)`, because the pictures are dark. Progress's grade on a picture (luminosity blend, `.66`, a mask that hides the left 40%) is for a picture under words; the Player Page has no words on its cover, and with the grade the picture was a dark green smear at 112 px. The scrim is light: `rgba(6,36,26,.38)` fading out by 36% for the back arrow and your account face, `.26` at the foot for the profile face, which still overlaps the cover by 44 px.
- **The cheers number counts cheers.** stage98: `cheers.total` is only the Cheers people sent with the clap button, never likes. The tile still says "cheers". The phone adds nothing for a like (a cheer you send is one more, as before). The guide says *Likes are not in it*, privacy.html says the same, and privacy-fa.html's two changed items are marked `<!-- FA DRAFT 2026-10-25: Amir to read -->`; both notices carry 25 October.
- **Profile is in the account sheet.** Your initials (top right, on every screen) open a sheet that now starts with a **Profile** group (`.acct-grp`, then `.acct-prof`) in the sheet's own door-row style: **Your photo** (your face in the icon's place; opens the photo sheet; not in the crew it reads *Join the crew to add a photo* and goes to the crew's own question; under 13 has no row), **Your game** (`openYourGame()`), **Your page** (the row that sat lower in the list moved here, once) and **What the crew sees of you** (`openCrewSettings()`; no door under 13, as on the page). Every sheet comes ‹ Back to the account (`wrapSheetOpeners()`).
- **Your game in a sheet writes no field logic twice.** `openYourGame()` draws `playerFactsHTML('me', p, true, true)` (the page's own card) into `#yg-body`, and the page's own `plGameOpen` / `plGamePick` / `plGameSave` / `plGameSet` / `plGameFlush` save it: one `my_game_set` at a time, a refusal puts the last card back. Only the redraw is new: `plGameRedraw()` draws your page when it is the screen and the sheet when it is open (`ygOn()`, `ygDraw()`). While the sheet is open the page behind draws its card closed, so there is one `#pl-gin` and one open row; `ygEnd()` runs from `sheetBack()` and `closeHistorySheet()` and leaves nothing open on the page. With no copy of your page on the phone the sheet says *Loading…* or *No signal*, and fills in when `crew_page()` lands (`crewPageRefresh()` calls `ygDraw()`).
- **Open call: two doors, one sheet.** Profile's *What the crew sees of you* and the list's *Crew and the Bell* both open Crew and the Bell. The old row stays (it is also the only door on a server without stage96), so Amir may want one of them gone.

**Tests.** `lounge.js` section 31 (the cover at 390, 320, a short screen and dark; the guide and both privacy notices; the Profile group's four rows and what each opens, Your game's editor saved through `my_game_set` from the sheet, a field typed in the sheet, the page behind it, not in the crew, under 13, a server without stage96, no copy and no signal, a refused save, 320 px dark) and section 32 (the pictures into `--out`). `stub.js`'s note on `cheers.total` follows stage98.
