# 🏟️ Players' Lounge (2026-10-24)

Amir, 2026-10-24, on the Lounge build plan: *"go with your picks"*, plus five changes of his own. The Crew grows a page for every person in it, a face
for every name, a cheer, the week's bars, a game card, signatures, mentions, a first week, a partner code, the cards and an Open wall. Everything is built
first and goes live together (*"i want all of this to be built first, when we are all done, then we go live"*): the server stage is `stage96`, then
`stage97` for partner codes, and the app, the coach dashboard and the SQL are three branches that meet on go-live day. The server shapes are the
contract's, `CONTRACT.md` in the Lounge folder; this file is what the app does with them. The page is called the **Player Page** in code and docs,
and athletes read **Your page**.

Every step obeys the same ground rules. A server without stage96 draws Crew exactly as it was (the doors, the faces and the page all key off `lounge`, the top-level
flag only stage96's `get_bell()` sends). A new screen is a static `.screen` with a visible `.nav-back` (NAV-01). Anything cached about OTHER people is a key that
`_snapshot()` and `syncFromCloud()` both skip. The in-app guide names every new control in the same commit. Social things pay nothing (GAME-6).

## Step 0 and 1 · The Player Page and the join question (ideas 55 and 62, direction A "Clubhouse")

**What.** Every person drawn in Crew is a door to their page: a post's face and name, a reply's face and name, the faces on the week band, the rows of
*In the crew*, the board on the tab and its page, the honours names, the Open board's rows and the name in a Bell line. Amir ("Coach") opens the Coach tab.
Your own name opens your own page; so does *Your page* under your initials and the same row in *Crew and the Bell*. The page (`screen-crewplayer`) is one
scroll: the person's current cycle picture as the cover (YOUR page: `cycleArt()` of your own current cycle, so exactly your Progress; someone else's: the `art` family they send when it names one of the app's pictures, else `bedrock`; the app never reads a cycle name from the server) with ← on it, their
face over the cover's foot with `LV n`, the name, *With Amir since June 2026*, **Sara's numbers** as tiles (weeks held, sessions with Amir, personal bests, and
cheers this season, or comebacks on YOUR page only), the latest three achievements and *All n* (a sheet), the honours, and *This week*, their posts still on the
Bell, a row each that scrolls Crew to the post. Your own page is sent whole (every block, the comebacks, and `kinds`, your switches) and every part the crew cannot see wears a quiet *Only you*
(the comebacks always, and any block you switched off); it adds *This is what the crew sees. Parts marked Only you stay with you.* and a door to *What
the crew sees of you*. A block the person switched off is not sent to the crew, so it is not drawn on their page (GAME-9); a comeback is never drawn on
anyone else's page, whatever the server sends. `best_lifts` is sent and never drawn. The join question shows your
own page first, a face, your name and *26 sessions with Amir · 4 achievements*, then *This is what the crew sees. Never a weight, never your check-in.*; its buttons are as they
were. A member who joined before pages existed sees *Your page is here* once.

**Why.** Before this, a name on Crew was a dead end: the phone knew a display name and nothing else about anyone. The picks were Amir's (*"go with your picks"*, the
mockup `frag-s1` A, and the join question beside it). The privacy line stays what privacy.html 2.12 says: only what the person agreed to show, never a weight, never
a check-in, a comeback only to its owner.

**The functions** (program.html, *Crew and the Bell*; every later step reuses them, change them, never copy them):

| function | job |
|---|---|
| `crewPersonOf(item)` | who an item is: `{ ck, fv, who, me, amir }` (+ `lv`, `held`, `isNew` when the item has them), for a post, a reply, a crew member, a board row (`is_me`), an honours row, an Open row, a Bell line (ck from its key). Amir has no ck. |
| `crewFace(p, size, door)` | THE one place a face is drawn: `'post'` 36 px (default), `'band'`, `'row'`, `'xl'`. Initials until step 2, which puts the picture in this function only. |
| `crewCanDoor(p)`, `crewGoCode(p)`, `crewDoor(p, cls, inner, label)`, `crewNameHTML(p, label)`, `crewListH(a)` | whether a person opens anything (a ck, you, or Amir), the `onclick` for it, a button around any markup, a name inside words, a list of such names. `null` means "draw what you always drew". |
| `crewPagesOn()` / `crewDoorOn()` | the server speaks stage96 (`get_bell()` carries `lounge: 1`, never a guess from `me.ck`) · and the viewer is not under 13 (reads only, no doors). |
| `openPlayer(ck, from)` / `playerBack()` | open a page (`'me'`, a ck, or `'amir'`); ← goes back to `from` (default: the screen it was opened on) at the scroll it was left, or to the page before it. `_playerFrom`, `_playerScroll`, `_playerTrail` are reset in `goTo()` like `_wsReturn`. |
| `crewPageGet / Put / Drop / Refresh / Ensure(key)` | the cache `<id>_crewpages` (30 people, newest kept, yours always; never synced; a person who leaves the crew takes their page off the phone, `crewPagesSweep()`) and `crew_page()` (10 s). |
| `playerHTML(key, p, note)`, `renderPlayerPage()` | the page drawn from the copy at once, again when the server answers; slots for later steps: `playerSportLine()` (step 5), `playerActionsHTML()` (the cheer, step 3). |
| `playerCoverUrl(key, p)` · `plMark(p, own, kind, mk)` | the cover's picture (above) · the *Only you* label for a block (kind `null` = always, the comebacks), counted so the note can say so. |
| `crewLevelOf(c)` | the level from the person's own `lv`, so two *Ali B.*s are two levels; a server without stage96 sends none and it is the board's copy by name, as before. |

**Errors.** `crew:gone` → *Sara is not in the crew any more.* and back; `crew:not_yes`, or a tap while you are not in the crew → *Join the crew to see their page.* with the
join button (never a dead tap); no signal → the copy under *No signal*; "no such function" → the doors go and Crew is as it was.

**Tests.** `scripts/headless/lounge.js` (the Lounge's own file, every later step adds a numbered section): the helpers, every door and where its ← lands, what a
page shows and what a switch off removes, no comebacks on anyone else's page, your own page from three doors, offline, a server without stage96 or without `crew_page`,
the level by person, the errors, under 13, the join preview, the one-time card, the cache (30, never synced, gone on leaving), the guide, 320 px and dark mode.
`stub.js` answers `crew_page` by name (`crewPages`, `pageMissing`, `pageErr`) and carries `ck`/`fv` on the board and a reply.

## Step 2 · Faces (idea 56, direction A "Ring Faces")

**What.** A photo in a circle wherever a name sits, and the two letters (today's look) until there is one: a post, a reply, a Bell moment (the face takes the bell's place), the
week band, the rows of *In the crew*, the board on the tab and its page, the composer, the join question's preview, the photo viewer, your page, and the account button
over your initials. Amir's face is his own photo (`coach.jpg`, as on the week note). Your face is the door to **Your photo** on your page (a small camera on it): choose a
photo, drag it, pinch or use the slider, **Save**, or **Remove** (two taps). Only a crew member who is not under 13 can add one; anyone else is asked to join first.

**Why.** Amir picked A, 2026-10-24 (*"go with your picks"*): the circle everyone knows, and the one shape a held-week ring can wrap (step 3). A face is about 15 KB and
*"iran's internet is very slow"*, so it never rides in `get_bell()`.

**How.** `get_bell()` and the lists send only `fv`, the face's version. `crewFace()` always draws the letters and lays a picture over them (`.fc-img`), so a face that has
not come, or fails to open, is today's look. A face on the screen says `data-fc` (the person) and `data-fv` (the version); `crewWireFaces(root)` watches them like the post
photos (an `IntersectionObserver`, 300 px of margin), so only faces on or near the screen are asked for. Asks made in the same breath are one `crew_faces_get(p_keys)` call, at
most 12 keys, with ONE call in flight. The answer is kept in Cache Storage `crew-faces-v1` under `/__crew-face/<ck>-<fv>`, never `crew-photos-v1` (whose sweep empties
everything that is not a post photo), and a newer version deletes the older key. Nothing is in `localStorage`, nothing syncs. A person who leaves the crew takes their face off
the phone at the next Bell refresh (`crewFacesSweep()`), and leaving yourself clears them all (`crewFacesClear()`). Your photo is a 256 px square under a circular mask, held
to 60,000 bytes (ladder 256 px .82 → 256 px .72 → 200 px .7 → 160 px .65), drawn again on a canvas so its EXIF is gone, sent as `crew_face_set(p_photo, p_w, p_h)`.

| function | job |
|---|---|
| `crewFaceImg(p)` / `crewFaceData(p)` | the picture inside a face · its `data-fc` / `data-fv`. Both are empty until the server speaks stage96. |
| `crewFaceAsk` / `crewFacePump` / `crewWireFaces(root)` | the queue: 12 to a call, one call in flight, only what is on or near the screen. |
| `crewFaceShow(ck, fv, blob)` | a picture arrived: every face of that person on the screen takes it (and the account button when it is yours). |
| `crewFaceKeep` / `crewFaceSaved` / `crewFaceDrop` / `crewFacesSweep` / `crewFacesClear` | Cache Storage: keep (the older version goes), read, drop one person, sweep the departed, clear all. |
| `openFacePhoto()` and `fp*` | Your photo: `fpPick` (decode, 1024 px), `fpPaint`/`fpDraw`, `fpBlob` (the ladder), `fpSave`, `fpRemove`, `crewOwnFace(fv, blob)` (your face changed everywhere). |

**Tests.** `lounge.js` section 13: a face on every surface and the letters where there is none, one batched call, the cache and its key, a new `fv` replacing the old,
twelve to a call and one in flight, only what is near the screen, a slow line and a server without the function, Your photo (choose, move, pinch, zoom, Save's size, Remove's two
taps, a refusal), who may not (not in the crew, under 13), leaving, never synced.

## Step 3 · The cheer (ideas 59, 65, 70 "New Balls", direction A "In the Band")

**What.** A cheer goes to one person, once a day each, with a word if you like. The button is the clap icon and **Cheer**, never "Well played" (Amir: *"something more
understandable to any one ... a clapping icon"*), and **Cheered today** in quiet green once it is done. The clap is `CLAP_SVG`, the inline *hands-clapping* icon of Phosphor Icons (MIT, regular weight, 256 box, `currentColor`;
the first drawing did not read as clapping hands, so Amir had it swapped 2026-10-24; in the sheet's title it is green ink, clay is only the page's button): the 👏 character is yellow on phones and the text variation selector is ignored on iOS, so it is in no string an athlete reads. On someone's page: the
button (the page's one clay control), under *Joined this week. Say hello.* when they are new; the sheet **Cheer Sara** (a word, 100 characters, a live count, *The crew can see
your word for 7 days.*, **Send**); and *Cheers this season · 12* with the last week's cheers (face, name or Coach, the word, the day). On Crew, the week band's faces are 40 px
and each is a door: a mint ring round the ones who held this week, **NEW** under the ones who joined this week, one tap opens their page after 250 ms unless a second tap
comes, and a double tap cheers at once with no word (a small burst of claps over the face unless the phone asks for less motion, and the toast *Cheer sent to Sara*). A one-line
hint in the band (*Double-tap a face to cheer. Tap to see their page.*, `<id>_cheerhint`) shows on three visits and goes for good after the first double tap. A cheer pays
nothing (GAME-6) and rings the other phone with your name, never the word (push.md).

**Words.** `crew:cheer_today` *You cheered Sara today. Come back tomorrow.* · `crew:word_long` *That is over 100 characters.* · `crew:cheers_today` *That is 30 cheers today. More
tomorrow.* · `crew:own` *You cannot cheer yourself.* · `crew:gone` *Sara is not in the crew any more.* (and the page goes). Not in the crew: *Join the crew to cheer.* with the
join button. Under 13: no door on a face, no hint, no button.

| function | job |
|---|---|
| `crewBandTap(ev, ck)` | the one-or-two-tap rule on a band face (250 ms; your own face opens your page at once; the tap after a double is ignored). |
| `crewQuickCheer` / `crewCheerSend` / `crewCheerDone` / `crewCheerFail` | the double tap, the call (`crew_cheer`, 15 s), what the copy of their page becomes (*Cheered today*, the season count, your cheer first), what a refusal says. |
| `crewCheeredToday(key)` | did you cheer them today, by the server's UTC day (a copy made yesterday is no answer). |
| `playerActionsHTML` / `playerCheersHTML` / `openCheer` | the button and New Balls line · the list · the sheet. |
| `crewBurst(el)` / `crewCheerHint()` / `crewHintDone()` | the claps (none under `prefers-reduced-motion`) · the one-time line · its end. |

**Tests.** `lounge.js` section 14: the ring only on `held`, NEW only on `new`, forty pixels, one tap waits then opens, a double tap cheers once and never opens the page, no word,
the burst, the toast, the hint's three visits and its end, the second cheer politely, the page's button and its words, the sheet (100, auto, count, the 7-day line), a word over 100,
no signal, a person who left, New Balls, your own page, the daily limit, reduced motion, no 👏 character in anything drawn, the guide. Section 15 takes the pictures.

## Step 4 · This cycle, Week Bars with the extra sessions (idea 58, direction B)

**What.** On a page that carries a `cycle`, a block **This cycle · 8 of 15** with one row per plan week: `W1`, a bar cut into the plan's own sessions (a filled piece is a session done), and
the sessions BEYOND the plan as small round dots after the bar, mint outline, one each, with **+1** (a plan day done twice, a Library session, anything past the plan). A held week is ONE
solid bar and says **Held**; the week it is now says **now** and *2 of 3*; weeks before a person joined are empty and grey and are not in the count. The count is plan sessions only, and
the extras sit beside it (*+2 extra*). No weekday letters anywhere on the bars (SES-17). A week that has sessions is a button: it opens that week by date. **Your own page** lists the
session's name, the date and the minutes, and *Extra* on an extra; **someone else's** lists only *Mon 12 Oct* and *Session* or *Extra*: the server sends no name or minutes for them (a
Library session's or a rehab day's name can hint at pain) and the app never draws one even if it came. On your own page the block follows your `session` switch and wears *Only you* when it is off.

**Someone else's cycle (CONTRACT 9b, 2026-10-24).** The server sends another person only `{ n, per_week, done, extra, weeks: [this week only] }`, days with a date and `extra` and nothing else: a past
week that was not held is a broken week, and a broken week is on the Bell's never list. So on someone else's page the block is **This week**: one bar with no week number (the plan's pieces, the extras as
dots with *+N*, **Held** when held), a tap on it lists the week's days by date, and one line under it, **8 sessions this cycle** (and *· 2 extra* when there are some, *No sessions yet this cycle* at zero).
Never *of N* and never a week that is over, even if the server were to send one: the week drawn is the one marked `now` (or the only one sent), a week marked `before` is not drawn, several weeks with none
marked `now` draw no bar at all, and the line is the server's own `done` (no `done`, no line). Their posts, on the same page, are headed **Posted this week** so the page has one *This week*. **Your own
page keeps the whole cycle** and *8 of 15*. `playerThisWeekHTML(key, p)` / `plThisWeek(c)` are the two functions; `playerCycleHTML` hands someone else to them.

**Why.** Amir, on the cycle bars: *"i like week bars idea, but the workouts, can be anything other than their cycles, they can do extra, it needs to show that as well"*. A plan week is
what is counted (and held), so the bar is cut into exactly that; what a person does beyond it is shown, never counted against them.

| function | job |
|---|---|
| `playerCycleHTML(key, p, own, mk)` | the heading, the card and every row; `plCycle` / `plWeekN` read the server's numbers safely (done never above plan). |
| `openPlayerWeek(key, i)` | the week's sheet (a wrapped sheet opener: ‹ Back works); `plDay(iso)` writes *Tue 21 Oct* from a calendar day, never through `new Date(string)`. |

## Step 5 · Player facts, for every racket sport and for people who play none (idea 57, direction B)

**What.** A small card, the way a tennis tour shows a player, on every page that has a `game`: **Plays** (the sports in the order chosen), **Hand** (*Right-handed, two-handed backhand*), **Side**
(*Left side*), **Level** (*For fun*, *Club*, *Competition*), **Club**, **Trains for**, **Working on**, **Instagram** (a link out on someone else's page). Only rows with a value; someone who plays
no sport has a card of what they have (a fitness client sees one row). **Your own page** edits each row in place: a tap opens the choices as chips (one answer: a tap saves and closes it, a second tap
takes it back; several: Plays, Trains for) or a field (Club 40, Working on 60, Instagram, typed at 16 px). The rows follow the answers: **Backhand** only for tennis, pickleball and beach tennis; **Side**
only for padel, pickleball and beach tennis; **Level** only once a sport is chosen; with no sport the card is Hand, Trains for, Club, Working on, Instagram (plus Plays, where you choose, with **None**).
An empty card is one row, **Add your game**. A choice is shown at once and sent as `my_game_set({p})`; the reply replaces the card; a refusal or no signal puts the last saved card back. The page is not
redrawn under a field that has the keyboard. Under 13 has no Instagram row. The sport line under a name is the first sport and its side (*Padel · left side*), from here and **never from the programme's
sport badge** (which can name an injury).

**Why.** Amir: *"your game should be in a way, that is applicable to all racket sports, and general people as well"*, so the sports are tennis, padel, squash, badminton, pickleball, table tennis, beach tennis
or none. The crew sees what is on the card (there is no switch for it), which the card says under it.

| function | job |
|---|---|
| `playerFactsHTML` / `plGameRows` / `plEditor` | the card, its rows and the chips or field of the open row. |
| `plGameClean(g)` | the answers as the server keeps them, with what no sport asks for dropped. |
| `plGamePick` / `plGameSave` / `plGameSet` / `plGameFlush` | one chip · one field (Instagram checked first) · shown at once · the one call at a time (latest wins, `_gameOk` is the card put back). |
| `playerSportLine(p)` | the line under the name. |

## Step 6 · Signatures as a Face Stack (idea 60, direction B)

**What.** An achievement row shows up to three small faces (24 px, 6 px over each other) of the crew members whose like is on that moment, and **+N** for the rest, with the date on the right; a tap opens
**Cheered by** with every name sent (each a door to that person; Amir is **Coach**; *and 3 more* when the server counted more than it sent). A row nobody signed has no stack and is not a button; *Tap an
achievement to see every cheer.* sits under the list. The same rows are in the *All n* sheet, and a name list opened from there goes ‹ Back to it. The first time you like a Bell line that holds an
achievement, after the server took it, one toast: *Your name stays on Sara's achievement while your like is on it.* (`<id>_signnote`, said once on this phone, never synced, nothing on a server without
stage96). Four Courts' rows are NOT changed: they are the catalogue's rows (a caption and a date, no person), and your own signatures are on your own page.

**Why.** Amir: *"for signed ball, i like face stack a bit more"*. Social actions pay nothing (GAME-6).

| function | job |
|---|---|
| `playerAchRow(a, key)` / `plSigners` / `plSignPerson` | the row, its stack, who is on it. |
| `openPlayerSigners(key, aid)` / `plSignerGo(ck)` | **Cheered by** · a name opens that page. |
| `crewSignNote(it)` | the one-time note, called by `crewLike()` after a like the server took. |

**Tests.** `lounge.js` sections 16 to 19: the segments, held, the dots and +N, now, the week sheets (yours with names and minutes, theirs with neither, even if the server sent them), weeks before joining, 320 px;
the rows for each sport, the chips, one call at a time, a refusal and no signal, Instagram checked, a field kept while a redraw waits, under 13, the badge never on a page; the stacks (2, 5 with +2, none,
the fourth with +5), the sheet, a door, the note once, never on a take-back, a failed like or a server without stage96; the pictures. `sync-integrity.js` 7c: the note is never synced.

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

