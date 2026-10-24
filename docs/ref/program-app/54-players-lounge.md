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
understandable to any one ... a clapping icon"*), and **Cheered today** in quiet green once it is done. The clap is `CLAP_SVG`, an inline line icon (24 box, `currentColor`,
1.6 stroke, round caps): the 👏 character is yellow on phones and the text variation selector is ignored on iOS, so it is in no string an athlete reads. On someone's page: the
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
