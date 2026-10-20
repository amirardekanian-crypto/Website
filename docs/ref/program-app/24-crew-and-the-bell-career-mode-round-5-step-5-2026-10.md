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
- **THE WEEK FIRST** (stage91, 2026-10-20; direction B of the audit *The Empty Room*, https://claude.ai/artifact/6VAMqcv12S9Y7rNCLEwmdM, Amir's
  pick). The tab was well built and almost empty: 6 in the crew, 4 posts ever, ONE moment rang in eight weeks, and six of the Bell's ten items were
  *joined the crew*, a line each person gets once — so on 26 October the whole feed would have swept to *"Quiet so far this week"*. What was missing
  was the thing an athlete actually does every week. Now:
  - **A green band at the top** (`crewWeekHTML()`, `.cr-week` on `--hero`): *Last 7 days · N in the crew*, then the crew's sessions and weeks held
    over the same 7 days the Bell covers, then a strip of initials (`.cr-faces`) that opens **In the crew**. It is the one block that is never
    empty, because somebody always trained; with no sessions it says *Nobody has trained yet · Finish one and the crew sees it*. Both counts come
    from `get_bell()`'s `week` and respect each member's own switches, so a count can only move on the same event that moves the feed — which is why
    it is in the payload at all and the board is not (stage83's `{same:true}` would otherwise break every time anybody ticked a habit).
  - **A finished session rings, folded** (Amir, asked whether it should: *"only if they want to, unless if 20 ppl train, we wil have 20 bells."*):
    ONE item a day for the whole crew (`t: 'sess'`, `crewSessHTML()`), *You, Dela and Mehraneh trained today · 3 sessions*, naming only members whose
    **session** switch is on — a new kind in `crew_kind_list()` and `CREW_KINDS`, **on by default**, and it **never sends a notification** (nothing
    queues one: `crew_push_queue`'s CHECK has no such kind and no trigger adds one). It carries no Like: there is nothing on it anyone earned.
    ⚠️ Folded on the session's own `day`, never `created_at`: the career back-pay wrote 39 of one athlete's sessions in one afternoon, which on
    `created_at` would have announced *"trained 39 times today"*. The consent test is the day too — from the day they joined — because all six joined
    mid-afternoon and comparing write times dropped the sessions they had logged an hour earlier.
  - **Day headings** (`.cr-day`, `crewDayWord()`): Today, Yesterday, then each day by name. Amir's pinned post stays above them all.
  - **The board is a door**: the top five, then **The whole board ›** → `#screen-crewboard`, titled **This season**. **In the crew** is
    `#screen-crewwho`, every member with the level beside their name where the board's copy on the phone has one. Both are screens with the green head
    and a ← back to Crew (`renderCrewPage()`), both built from the copy on the phone, so both open with no signal.
- **The screen** (`renderCrew()`, `#crew-body`): the eyebrow *Train together* and the title; **the question, once** (`crewAskHTML()`: *Ring the
  bell for the crew?*, **Ring it** / **Keep it to me** → `crew_answer()` with the board name, `crewDefaultName()`); **last month's honours** from the
  1st to the 14th (four tiles, crew members only); **The Bell** · *Last 7 days*: the composer row (*Share something with the crew*, only with a yes
  and not under 13), then the feed in the server's order (Amir's post of the last 24 hours pinned first): a **post** is a card (`crewPostHTML()`:
  initials, name, when, the words, the photo at 4:5 cropped to fill, Likes with names, *Delete* on your own through `armedTap()`), a **moment** a
  slim green line with the bell (`crewLineHTML()`: *Mina reached level 14 · set a new best on Barbell Back Squat · held a week, 5 in a row*,
  `crewPartText()`; a best names the lift, never a weight); then *What the crew sees of you ›* and the **board** (`crew_board()`, stage91: the CREW
  only, plain numbers, *You* tinted, no medals).
  **The board shows the crew and nothing else** (2026-10-20): it was `leaderboard_top()`, which is the whole board, so it listed 23 names — six who
  had never been asked the crew question, and Ghazal, who chose *Keep it to me*, by name and level — under a screen that promises nothing of yours
  reaches the crew before your yes. `leaderboard_top()` itself is UNTOUCHED (coach.html and habits.html both mean the whole board by it) and is still
  the fallback where stage91 is not applied. **The LV chip is gone and the block is titled *This season***: the level is lifetime and the number that
  sorts is this season's, so on 20 October it read *1. Ehsan A. LV 14 — 3,153* above *4. Elmira A. LV 29 — 1,114*. One ladder on one block. The rows
  are kept on the phone under `<id>_crewboard`, so the bottom of Crew is no longer the one piece that needs signal.
  **A no is not a door closing** (Amir, 2026-10-20: *"if ghazal wants to come back, let her have a way"*): the line for an athlete who kept it to
  themselves now ends *"You can join whenever you like, just below"*, and the row under it is the settings page with the Yes/No toggle that was
  always there and never said so.
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
- **Replies** (stage92, 2026-10-20; Amir: *"replies and likes like instagram"*, then *"dont need the likes on replies"* — so a reply is text and the
  Like stays on the post). One level, **140 characters**, under the Like and the names (`crewRepsHTML()`, `.cr-reps`), gone with the post at 7 days,
  your own taken back with two taps, and Amir can remove any (`coach_crew_remove_reply()`). The sheet (`openCrewReply()`) quotes the post, counts to
  140 and keeps no draft: a reply is one line and its post is on the screen behind it. `crewPutReplies()` puts the server's answer on the phone's copy
  and repaints that **one** post, never the feed. A **moment line has no Reply** — a moment is not a post. A non-member's Reply is not dead: it offers
  to join, exactly as their Like does; an athlete ticked under 13 reads them and is offered nothing. A server without stage92 sends no `replies` key
  and there is no Reply door anywhere.
  **A post is written once, however slow the line**: the composer makes one key per draft (`crewNewKey()`, kept on `_crewDraft.key`) and sends it with
  every attempt, and the server hands back the post it already has instead of writing a second one. This is the complete fix for the double post that
  stage91 could only narrow.
- **The words** (Amir, 2026-10-19): the button is **Like**, never Kudos; the question is **Join the crew?** with *Join the crew* and
  *Keep it to me*; the account sheet says **In the crew**. The server's function is still `crew_kudos()` and the payload is still `kudos`:
  nobody reads those.
- **The yes and the switches** (`openCrewSettings()`, from your initials → **Crew and the Bell**, and from *What the crew sees of you*): Yes / No,
  a switch per kind (`crew_kinds()`: a new level, a week held, a mark, an achievement, a personal best, a cycle finished, the month's honours, the
  Monthly Open), and what a no does. An athlete Amir ticked **under 13** reads only: no question, no composer, no Like, no Tell the crew.
- **Five things that were broken, fixed 2026-10-20** (the audit's bug list; the three above it — the board's membership, its LV chip, and a no with
  no way back — are in the lines above):
  - **One bad answer no longer empties the phone.** PostgREST answers *could not find the function* for a few seconds after any stage is applied, and
    one of those used to set `_crewMissing`, null `BELL`, delete `<id>_crewcache` and `goTo('home')` mid-read, so the next open downloaded the whole
    feed again. Now it takes **two in a row** (`_crewMiss2`), the copy is never deleted, and `setCrewTab()` **moves nobody**: the tab is kept while
    the athlete is on Crew or one of its pages, and the decision is taken again on their next move (`goTo()` ends with `setCrewTab()`).
  - **A slow photo cannot post twice.** The composer gave up at 25 s and said *"No signal… tap Post again"* while a 200 KB upload was still on its
    way, so the server wrote it and the second tap wrote it again — two posts and two of the day's three photos gone. A post with a photo now waits
    **45 s**, and a timeout never offers a blind retry: it asks the server what it actually has (`crewMinePosts()` before and after a `refreshBell()`)
    and closes on the post if it landed. The complete fix is a key made on the phone that the server refuses twice — **stage92, with the replies**.
  - **The composer keeps what was typed** (`<id>_crewkept`, `crewKeepKey()`): a sheet swiped down by accident took 280 characters with it. Only a
    plain post is kept — a session's draft is written fresh by `crewSessionDraft()` — and it is forgotten the moment the post goes.
  - **The reaction chips are 44 px**, not 36: they were the smallest buttons in the app, on a screen where everything else is 48 or 52.
  - **The reaction row is A ROW YOU CAN USE, OR NO ROW** (`crewReactRow()`, 2026-10-20). Amir, from his live phone on three
    screenshots: *"First i cant like my photos, which is ok, why do i have those under my posts then?"*, *"If i chose like under a post, why are
    there more emotes to choose?"*, *"When i choose emote, why others are still there?"* — and, the message before, *"it should close after you
    choosed. and only show the ones that is replied to a post"*. Then, on the live app: *"it still shows reactions to my own post which i cant
    choose. then remove the reactions under your own post"* and *"if under another post i have chose to send a fire emote or like, why is all my
    other emotes opened? just show the fire and a + so i can change"*. (The second round was also a regression: a later commit, `f715819`, wrote
    program.html over the first fix from an older copy, so the live app was still showing the old row; it was restored on 2026-10-20.) **The row
    belongs to the viewer's state, not the item's type.** Five states:
    - **own item** → NOTHING: `crewReactRow()` returns `''` and `.cr-react:empty { display: none }` hides the span. No tally, no chips. The names
      line under the post (`.cr-names`) still says who reacted, and the post's Delete sits in the same foot, pushed right.
    - **ticked under 13** → a receipt: `.is-tally` SPANS of what people gave, nothing to press. (`dead()` is gone from the function: nothing on this
      row is ever a disabled button.)
    - **not joined** → the menu, every chip offering to join (his rule of 2026-10-19: never a dead Like).
    - **joined, HAS chosen** → ONLY THEIR PICK (the Like or the emoji, marked, with its count) and a **＋** labelled *Change your reaction*. Others'
      emoji and the unused four are not drawn. The ＋ sets `_crewOpenEm[target]` and shows the whole menu with theirs marked and a **✕** (`.cr-fold`,
      `crewFold()`) at the end; `crewLike()` deletes that flag on every tap, so a swap closes the row on the new pick and a take-back brings the plain
      menu back, the ✕ closes it without writing anything, and `openCrew()` clears every flag so a menu never outlasts a visit to Crew. Without stage82 (`BELL.emoji`
      empty) there is nothing to change to, so no ＋.
    - **joined, has NOT chosen** → the menu. All five out on a **post** (his pick of 2026-10-19, where there is room); on a **moment line** the Like
      and whatever has been used, the rest behind a **＋** (`.cr-plus`, `crewUnfold()`), because five chips under a one-line moment are taller than
      the news. `folded` means only *"this is a slim line, keep the menu small before a choice"*.
  - **Nothing on the row is dimmed, and the keyboard stays where it was.** Every chip carries `data-em` (`''` for the Like, the emoji itself, `'+'`
    for the opener) and `paintKudos()` puts focus back on the same chip after replacing the row — it used to drop to the top of the page, so a
    keyboard athlete who liked the fourth post tabbed back past the band, the faces and three cards. The names line is `aria-live="polite"`, and a
    chip's count is in its label as well as its `<b>`, since a blind athlete cannot reach the `<b>`.
  - **The chosen emoji's ring is 2 px of `--green-ink`**, not 1 px of `--fill`: in dark mode `--fill` on `--row` is 1.6:1, so which one you chose was
    carried by a border nobody could see, on a row where the count reads 1 whether it was you or somebody else.
  - **The post's own Delete sits in the reaction foot**, beside what the post got. It used to sit on the names line directly above the replies, where
    it read as the thread's heading, and on his own post with his own reply there were two identical Deletes in one column. Its armed words are now
    *Tap again to delete the post*.
  - **`crewCanLike()` is the SERVER's gate**, `crewMe().can_post`, not a guess at it. It read `answer === 'yes' && !under13`, but `crew_members()`
    also drops a **former** athlete, so one of those kept a live Like on every post and every tap flashed on and came back with *"That did not go"*.
  - **A refusal says what actually happened**: *"That did not reach the crew. Tap it again when you have signal."* It used to promise *"It goes when
    you are back online"*, and nothing is queued, so it never went.
  - **A reply's words are `--fs-body`**, the size its own comment always claimed, not `--fs-small`: the thread was set smaller than the post it was
    about and read as small print.
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
- **Tests**: `scripts/headless/crew.js` (**140 checks** since 2026-10-20 — section 16 is the band, the attendance line folded to one a day, the day
  headings, the board behind its door and kept on the phone, both pages and their ←, a server without stage91 falling back to `leaderboard_top`, the
  kept draft, two bad answers instead of one, and the ＋ on a moment line; the stub answers `crew_board` from `crewBoard`, or from `board` translated,
  and `noCrewBoard` makes it say the function is missing. Before that, 45 checks: no tab without an answer, a missing function or in the demo; the dot, the question, the feed's
  words with no kg, the honours, the board, a Like on and off, the photo at 4:5 and Back, a 3000 × 2250 photo sent as a 1280 × 960 JPEG, Post's
  words, Tell the crew's draft and its photo rule, the switches, the no, the account door, the guide, never synced, under 13, 320 px in dark mode).
  The stub (`scripts/headless/stub.js`) answers `get_bell` from `bell`, the crew_* calls like the server, and `leaderboard_top` from `board`.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
