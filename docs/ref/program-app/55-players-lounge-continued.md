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
- **With a code:** the code big in Space Mono on a dashed field, the same line, **Copy** (outlined) and **Send on WhatsApp** (the page's primary button), and, once a friend has joined, *1 friend joined · 10% off waiting for you* from `friends` and `waiting` (*2 friends joined · your 10% off is used* when none waits). The numbers are the server's `percent` and `reward` (10 when absent).
- **The message** is the same for both buttons (`partnerText()`): English, *Train with Amir Ardekani. Use my code SARA24 for 10% off: https://amirardekani.com/form.html?code=SARA24*. For an athlete whose intake form says Farsi (`pushLang()`) it is a Farsi message that points at `form-fa.html?code=`, **a DRAFT for Amir to read**: the code and the link sit on their own lines so a right-to-left line cannot move them. Copy tries the clipboard, then `execCommand`, then shows the words in a box (`#pt-sel`) already selected, so a long press copies them. Send on WhatsApp is a plain `wa.me/?text=` link that opens outside the app.
- The guide (`GUIDE_PARTNER`) names the card only while it is on the page. A code earns no XP and rings nobody (GAME-6).

| function | job |
|---|---|
| `partnerOn(p)` | whether a page gets the card: it has `referral`, it is not under 13, and this is not the demo or the preview. |
| `playerPartnerHTML(p)` | the card, in both its states; called from `playerHTML()` for your own page only. |
| `partnerText(r)` / `partnerWaUrl(r)` / `partnerNote(r)` / `partnerPct(r, k)` | the message in the athlete's language, its wa.me link, the friends line, the percent from the server. |
| `partnerMake(btn)` / `partnerCopy(btn)` | Get your code, and Copy with its two fallbacks. |

**Tests.** `lounge.js` section 24: the card with no code (the line, one button, its place after the numbers), nothing made by looking, the tap and its one call, Copy and the toast, the fallback box with its selection, the link's text, the friends line in four cases, no signal, a refusal, a double tap, never on anyone else's page, under 13, not in the crew, the demo and the preview, a server without stage97, the Farsi draft, the guide, 320 px and dark mode. Section 25 takes the pictures. `stub.js` answers `my_partner_code` like CONTRACT 8 and your page carries `partner` as `referral`.
