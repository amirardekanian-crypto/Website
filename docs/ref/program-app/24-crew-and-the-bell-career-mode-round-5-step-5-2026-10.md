## 🔔 Crew and the Bell (Career Mode round 5, step 5, 2026-10-19)

Amir's picks (`career/CAREER_MODE.md` → *Round 5*): Crew is a tab, **one feed** (A on the page *Crew and the Open*,
https://claude.ai/artifact/7fCYGFL6mboE3igFLUkE5E); the Bell is the **Clubhouse** (A on the page *The Bell*,
https://claude.ai/artifact/55fbdfUgJVxySL7EpihyWb). The server half is `supabase/stage81_career_crew.sql` (`career/PROCEDURES.md` → *Stage 81*); it
decides what rings and who can be seen, and never sends this app another athlete's id. Nothing on Crew pays XP (GAME-6).

- **The tab** (Home · Progress · Library · **Crew** · Coach) is ADDED to the bar by `setCrewTab()` only once `get_bell()` has answered, so
  before stage81 is live, in the demo and in the coach's preview there is no Crew, and the static markup (and every older test) still has four
  tabs. A server that says the function is missing (PGRST202, 404: `crewMissingErr()`) takes the tab and the copy away. Its icon is the bell;
  a **clay dot** sits on it while Amir's pinned post has not been opened on this phone (`<id>_crewseen`), the one clay thing Crew shows (DS-01),
  with the post's *Pinned* chip in clay on the visit that first shows it (`_crewFreshPin`).
- **The screen** (`renderCrew()`, `#crew-body`): the eyebrow *Train together* and the title; **the question, once** (`crewAskHTML()`: *Ring the
  bell for the crew?*, **Ring it** / **Keep it to me** → `crew_answer()` with the board name, `crewDefaultName()`); **last month's honours** from the
  1st to the 14th (four tiles, crew members only); **The Bell** · *Last 7 days*: the composer row (*Share something with the crew*, only with a yes
  and not under 13), then the feed in the server's order (Amir's post of the last 24 hours pinned first): a **post** is a card (`crewPostHTML()`:
  initials, name, when, the words, the photo at 4:5 cropped to fill, Likes with names, *Delete* on your own through `armedTap()`), a **moment** a
  slim green line with the bell (`crewLineHTML()`: *Mina reached level 14 · set a new best on Barbell Back Squat · held a week, 5 in a row*,
  `crewPartText()`; a best names the lift, never a weight); then *What the crew sees of you ›* and the **season board** (`leaderboard_top()`, plain
  numbers, *You* tinted, no medals).
- **A Like** (`crewLike()`): on at once here, the server's answer (who gave it) replaces it, a refusal puts it back. *You, Sara and 2 others*
  (`crewKudosWords()`). Not on your own. **A non-member's Like is not dead** (Amir, 2026-10-19: *"if some one want to like a photo and
  they are not allowed to do, they should be notified to join first"*): it calls `crewLikeAsk()`, a toast that says to join with one
  **Join the crew** button that answers yes. An athlete ticked under 13 cannot join, so theirs stays disabled and offers nothing.
- **Photos**: asked one at a time with `crew_photo()` when their card comes within 400 px of the screen (`crewWirePhotos()`, an
  IntersectionObserver), two at once at most, kept as object URLs for the visit (`CREW_PHOTOS`); your own shows at once after posting. A tap opens
  **the viewer** (`openCrewPhoto()`, `#crew-viewer`, dark, the whole photo, *N days left*, the Like); ✕ or Back closes it (`topLayer()`).
- **Posting** (`openCrewPost()`, in the one sheet): up to 280 characters with a counter, *Add a photo*, the notes (*Made smaller before it's sent…*,
  *Gone after 7 days. Amir can remove any post…*). `crewShrink()` draws the photo on a canvas at most **1080 px** on its long side and encodes a
  **JPEG at 0.7** (then 0.6, 900 px, 800 px, 640 px until it is **under 200 KB**; the server's ceiling is 450 KB). The re-encode drops the EXIF
  data, location included. 1080 px is twice a card's width on a phone, and on 2026-10-19 the photos already posted were landing at **312 KB**
  each while every promise said 200 KB — on a slow connection each one is paid for by every athlete who opens Crew. The server's limits come back as words (`crewErrWords()`): 3 photos and 10 posts a day. No signal: the post stays in the sheet to send
  again (nothing is queued).
- **Tell the crew** (`paintCrewTell()`): a door row under the WhatsApp row of every finished card (`.complete-crew[data-day]` inside `.complete-wa`,
  so the card's grid rows did not move), shown while the athlete can post. It opens the composer as a session: *Day 2 done. 47 sessions with
  Amir.* drafted (`crewSessionDraft()`, the count from `careerMarkCells()`), and **Post waits for a photo**: a finished session reaches the Bell
  only with one (Amir's rule).
- **The Like and four emoji, all five out** (Amir, 2026-10-19, direction A of https://claude.ai/artifact/KkF7qE5yomcLdxKYF1mjo8: *"lets go
  with all five out style"*, and *"instead of racket go with hearty eyes"*): `crewReactRow()` draws the Like then **🔥 💪 👏 😍**, each its own
  chip with its count. One per person (`crewLike(btn, em)`): tapping another **swaps** yours, tapping yours takes it back, so the total never
  moves twice for one athlete. The row is drawn **only while the server hands over the list** (`BELL.emoji`, stage82): without it the Like
  stands alone, exactly as stage81 left it, so the app shipped before the stage was applied. The whole row repaints after a tap
  (`paintKudos()`), the names line sits under it, and at 320 px the chips tighten so all five still fit on one line.
- **The words** (Amir, 2026-10-19): the button is **Like**, never Kudos; the question is **Join the crew?** with *Join the crew* and
  *Keep it to me*; the account sheet says **In the crew**. The server's function is still `crew_kudos()` and the payload is still `kudos`:
  nobody reads those.
- **The yes and the switches** (`openCrewSettings()`, from your initials → **Crew and the Bell**, and from *What the crew sees of you*): Yes / No,
  a switch per kind (`crew_kinds()`: a new level, a week held, a mark, an achievement, a personal best, a cycle finished, the month's honours, the
  Monthly Open), and what a no does. An athlete Amir ticked **under 13** reads only: no question, no composer, no Like, no Tell the crew.
- **The data, on a slow connection** (Amir, 2026-10-19: *"irans internet is very slow, and cant download everything everytime they open the
  app"*): **nothing is asked for at an app open**. `crewFirstLook()` asks once in a phone's life, only while it has no copy at all (a new
  athlete still gets the tab without opening anything); after that the tab, the dot and *Tell the crew* all come from `<id>_crewcache`.
  Opening Crew draws the copy first, then asks **at most every ten minutes** (the board too). The ask is `get_bell_if_new` (stage83) carrying
  the hash of the copy: an unchanged crew answers **`{ same: true }`**, 78 bytes against the feed's few thousand, and the copy stands. A server
  without stage83 says so once and the phone asks plain `get_bell()` from then on (`_bellPlain`).
- **A photo is downloaded once, ever.** `crewFetchPhoto()` looks in **Cache Storage** (`crew-photos-v1`) before the network, and what it
  downloads it keeps there, so closing and opening the app costs nothing. The name does NOT start with `aap-`, because `sw.js`'s activate
  deletes every `aap-*` cache on a version bump. `crewSweepPhotos()` runs after each fresh feed and drops everything the feed no longer names,
  so a photo leaves the phone when its post leaves the server at 7 days. Photos are still only asked for when their card comes within 400 px
  of the screen, so a long feed nobody scrolls costs one small read.
- **The guide** (CNT-01): the card *Crew and the Bell* and Crew's line in *Getting around* show only while the tab does (`when: () => crewOn()`, the
  `<!--crew-->` mark in Getting around).
- **Tests**: `scripts/headless/crew.js` (45 checks: no tab without an answer, a missing function or in the demo; the dot, the question, the feed's
  words with no kg, the honours, the board, a Like on and off, the photo at 4:5 and Back, a 3000 × 2250 photo sent as a 1280 × 960 JPEG, Post's
  words, Tell the crew's draft and its photo rule, the switches, the no, the account door, the guide, never synced, under 13, 320 px in dark mode).
  The stub (`scripts/headless/stub.js`) answers `get_bell` from `bell`, the crew_* calls like the server, and `leaderboard_top` from `board`.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
