# 🏟️ Players' Lounge (2026-10-24)

Amir, 2026-10-24, on the Lounge build plan: *"go with your picks"*, plus five changes of his own. The Crew grows a page for every person in it, a face
for every name, a cheer, the week's bars, a game card, signatures, mentions, a first week, a partner code, the cards and an Open wall. Everything is built
first and goes live together (*"i want all of this to be built first, when we are all done, then we go live"*): the server stage is `stage96`, then
`stage97` for partner codes, and the app, the coach dashboard and the SQL are three branches that meet on go-live day. The server shapes are the
contract's, `CONTRACT.md` in the Lounge folder; this file is what the app does with them. The page is called the **Player Page** in code and docs,
and athletes read **Your page**.

Every step obeys the same ground rules. A server without stage96 draws Crew exactly as it was (the doors, the faces and the page all key off `ck`, which only
stage96's `get_bell()` sends). A new screen is a static `.screen` with a visible `.nav-back` (NAV-01). Anything cached about OTHER people is a key that
`_snapshot()` and `syncFromCloud()` both skip. The in-app guide names every new control in the same commit. Social things pay nothing (GAME-6).

## Step 0 and 1 · The Player Page and the join question (ideas 55 and 62, direction A "Clubhouse")

**What.** Every person drawn in Crew is a door to their page: a post's face and name, a reply's face and name, the faces on the week band, the rows of
*In the crew*, the board on the tab and its page, the honours names, the Open board's rows and the name in a Bell line. Amir ("Coach") opens the Coach tab.
Your own name opens your own page; so does *Your page* under your initials and the same row in *Crew and the Bell*. The page (`screen-crewplayer`) is one
scroll: the person's current cycle picture as the cover (the same file as that cycle's cover on Progress; the green when there is none) with ← on it, their
face over the cover's foot with `LV n`, the name, *With Amir since June 2026*, **Sara's numbers** as tiles (weeks held, sessions with Amir, personal bests, and
cheers this season, or comebacks on YOUR page only), the latest three achievements and *All n* (a sheet), the honours, and *This week*, their posts still on the
Bell, a row each that scrolls Crew to the post. Your own page adds *This is what the crew sees* and a door to *What the crew sees of you*. A block the person
switched off is not sent, so it is not drawn (GAME-9); a comeback is never drawn on anyone else's page, whatever the server sends. The join question shows your
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
| `crewPagesOn()` / `crewDoorOn()` | the server speaks stage96 (`me` carries `ck`) · and the viewer is not under 13 (reads only, no doors). |
| `openPlayer(ck, from)` / `playerBack()` | open a page (`'me'`, a ck, or `'amir'`); ← goes back to `from` (default: the screen it was opened on) at the scroll it was left, or to the page before it. `_playerFrom`, `_playerScroll`, `_playerTrail` are reset in `goTo()` like `_wsReturn`. |
| `crewPageGet / Put / Drop / Refresh / Ensure(key)` | the cache `<id>_crewpages` (30 people, newest kept, yours always; never synced; a person who leaves the crew takes their page off the phone, `crewPagesSweep()`) and `crew_page()` (10 s). |
| `playerHTML(key, p, note)`, `renderPlayerPage()` | the page drawn from the copy at once, again when the server answers; slots for later steps: `playerSportLine()` (step 5), `playerActionsHTML()` (the cheer, step 3). |
| `crewLevelOf(c)` | the level from the person's own `lv`, so two *Ali B.*s are two levels; a server without stage96 sends none and it is the board's copy by name, as before. |

**Errors.** `crew:gone` → *Sara is not in the crew any more.* and back; `crew:not_yes`, or a tap while you are not in the crew → *Join the crew to see their page.* with the
join button (never a dead tap); no signal → the copy under *No signal*; "no such function" → the doors go and Crew is as it was.

**Tests.** `scripts/headless/lounge.js` (the Lounge's own file, every later step adds a numbered section): the helpers, every door and where its ← lands, what a
page shows and what a switch off removes, no comebacks on anyone else's page, your own page from three doors, offline, a server without stage96 or without `crew_page`,
the level by person, the errors, under 13, the join preview, the one-time card, the cache (30, never synced, gone on leaving), the guide, 320 px and dark mode.
`stub.js` answers `crew_page` by name (`crewPages`, `pageMissing`, `pageErr`) and carries `ck`/`fv` on the board and a reply.
