# The Farsi products: the course app, the testing app and their pages

Moved here from `CLAUDE.md` on 2026-09-26 (its second slimming pass), word for word except where the
code had moved on (marked *checked 2026-09-26*). CLAUDE.md keeps only the tripwires. This file covers
Amir's two Farsi products for players and coaches in Iran: the paid course (Tennis Performance System,
the product page `/tennis/` and its app `/tennis/app/`) and the testing app for coaches
(`/tennis-testing/`). The rule for YouTube embeds, which covers the programme app and the whole site
too, stays in CLAUDE.md → *Site layout*.

## The course app (`/tennis/app/`)

> ✅ **2026-10-02, Amir: this repo is the permanent home of the course app.** The private `tps-content` repo (built on his
> laptop) is unreachable and out of date, and the course is meant to be open only to people who pay, with the data living
> in Supabase. So: the **app shell** is edited here (`tennis/app/`, then `python scripts/stamp_tps_app.py`); the **lessons
> and tests** live only in the `tps_content` and `course_en` rows (edit with SQL, re-hash `version`; see
> `Content/CONTENT-PARITY.md`). **Never deploy or publish from `tps-content`**: its deploy script erases the demo, the
> covers and the `ART` lines, and its lesson build scripts (`build_learn*.py`, `l5_*.py`) hold the OLD text and would
> overwrite the 19 lessons corrected and added on 2026-10-02. **Both publish secrets (`tps_publish_keys`,
> `assess_publish_keys`) were deleted and the two publish functions closed to `anon` and `authenticated` on 2026-10-02**
> (`supabase/tps_03_revoke_publish_keys.sql`), so even the old repo can no longer write to the database. Anything useful still in that repo (its `_dev` tools) gets
> copied here when found.

**`/tennis/app/` is the paid course app** (Tennis Performance System, Level 2; Farsi). Its shell
(index.html, app.js, app.css, sw.js, the self-hosted font and Supabase library) is edited in `tennis/app/` in this repo.
The handbook itself is in Supabase (`tps_content`, readable only by an active buyer); logins come from coach.html →
**Course**. Backend: `supabase/tps_01_accounts_content.sql` + `supabase/functions/tps-login`.
(History: the demo was built here on 2026-09-15 because `tps-content` could not be reached; on 2026-10-02 this folder
became the permanent home.) Whenever this folder is edited, run `python scripts/stamp_tps_app.py`
(the pre-commit hook blocks a stale stamp): the app's worker answers from its cache first, so a change
shipped under an unchanged `sw.js` VERSION never reaches a phone that already has the app.
**A phone with a wrong clock** (SITE-AUDIT 25b, 2026-10-12; an Irancell iPhone 89 minutes behind in the 2026-10-04 reach reports): supabase-js decides by the phone's clock whether a
token has expired, so it kept sending an hour-old one and the server answered `401 JWT expired` for an hour and a half of each cycle. This app and the testing app
give `createClient` the same `fetchRetryExpired()` as `program.html` and `habits.html` (one refresh, one repeat; `PROGRAM-APP.md` → *No signal*), four copies of one
text that `scripts/test_fetch_retry.js` keeps equal (pre-commit guard 18). Editing `app.js` here also means the usual stamp (`stamp_tps_app.py`, and for the
testing app the 8 hex of its `app.js` in `index.html`'s `app.js?v=`).
**The demo is `/tennis/app/?demo=1`** (Amir, 2026-09-15): no sign-in; week 1, the broad jump test and
three lessons open, everything else locked behind a WhatsApp buy button. The lock is server-side:
`tps_demo()` (`supabase/tps_02_demo.sql`, where the picks live) sends each locked item as its card
only, so nothing locked ever reaches the phone. Never "lock" something in app.js alone. It is the one
mode that loads Plausible (goals `Demo opened`, `Demo failed`, `Demo locked`, `Demo buy`). It is linked
publicly (Amir, 2026-09-15, before his Iran test): from `/tennis/` (menu, hero link, the phone
screenshot, the inside section, the price card, an FAQ), the course card on `index-fa.html`, and
`links.html`. If it will not open in Iran without a VPN, move the free parts to static files on the website.

## The course app's look: Centre Court, in Farsi (2026-10-13)

Amir, 2026-10-13: *"Im ok with your recommendations start"*, after the direction board
(claude.ai/artifact/92KNKRwtzBvvReRTu3TifC: the rules, then Start, Programme, a session and Learn, before and after). The
course wears the English athlete app's look (`program.html`'s Centre Court; `Content/APP-UI-KIT.md`, §9 for Farsi), adapted to
Farsi and right to left. `tennis/app/app.css` is in sections: tokens, base, **THE SHARED PARTS**, then one section per screen
group (DOORS: Start, Setup, the guide, the locked page, sign in, the tour's card · TRAINING: Programme, Week, Session,
Exercises · STEP, LEARN AND TESTS). A part two screens use lives in the shared parts; a screen's own rule in its section.
- **One colour set, program.html's**, declared on `body` (paper, sand, rows, hairlines, ink, grey, one green, mint, the clay
  family). The greens' lights are **mirrored**: they sit at the left, where every course picture keeps its subject. No gold is
  left (the speed stripe, the Yo-Yo VO2 number and the calculator's middle grade were ochre). No dark mode (the course never had one).
- **A picture earns a cover.** `banner()` draws a green cover (the picture in luminosity at .7, masked so it shows at the left,
  a scrim to the cover's last colour, the eyebrow in mint, the title white at the right) when it gets `art` (or `cover: true`),
  and a paper header (the eyebrow and a 36 px title; 28 px on an inner page) when not. Covers: Start (the walk-on, `ART.start`),
  a week (its block), a session (its room), a test day, a lesson, Tests, a test, a locked page, the finish of step by step.
  Paper headers: Programme, Exercises and an exercise, Learn, Setup, the guide. **`.ph` has no z-index**: with one, the
  luminosity blend sees an empty backdrop and the picture comes out in its own orange.
- **The eyebrow** is a dot and plain Farsi (13 px bold); no capitals and no letter-spacing anywhere; nothing under 12 px.
- **Rows, not boxes** (`.list-row`, hairlines between rows) with the **outlined numeral** (`pnum()`, P24) in Persian digits:
  exercises, lessons, the five on-the-day tests, the how-it-works list, the warm-up's ticks (the number IS the tick and turns
  solid green when ticked), the sets in step by step (the current one a green disc). Two-digit numbers use `pnum(n, 'sm')`.
- **Door rows** (`.door`: white, rounded, a green line icon) for what takes you somewhere: the version, the demo.
- **Shelves** (`.band`): the four blocks on Programme (each with its four week tiles; the block's last week is captioned
  «آزمون») and the six lesson groups on Learn.
- **One green button per screen**, inside the cover where there is one. **The session's step-by-step button moved from the
  sticky bottom bar into the session's cover**, still `.cta-bar .btn.primary`, labelled «شروع جلسه، قدم‌به‌قدم». Buy buttons
  are green too (`.btn.clay` draws green); the demo bar stays the one clay band (it asks for something).
- **⚠️ No middle dot "·" next to a Persian digit.** In Vazirmatn it is the Persian zero «۰»: «۱۶ هفته · ۴ بلوک» read
  «۱۶ هفته ۴۰ بلوک». The shell uses «،» in eyebrows and sentences and `SEP` (a short drawn bar, `sepJoin()`) between items on
  one line; `dots()` (and `tx()` in lessons and tests) turns the " · " inside content strings into that bar.
- **No emoji drawn by the shell** (they paint yellow): the lessons' and tests' `icon` fields are no longer shown, the lock is a
  drawn icon (`LOCK`), the places are words (`PLACE`), the guide's icons are line drawings (`IC`).
- **Right to left:** back (→) at the right, the go chevron (‹, drawn) at the left, ⌄ opens a fold; a video's ▶ still points
  right. A number line keeps the course's order: «۳ × ۸» reads sets first from the right, as the lessons teach the card.
- **Start's button remembers the week** (Amir, 2026-10-13): «ادامه: هفتهٔ N» once week N was opened on this phone, else
  «شروع هفتهٔ ۱». The week is `localStorage` **`tps.lastweek`** (`rememberWeek()` in `viewWeek()`/`viewSession()`, never for
  a locked week), on this phone only and never sent. ⚠️ Not `tps.last`: that key is the buyer's offline sign-in record
  (`{uid, username}`, `bootCloud()`), and sharing it broke both (caught in the build).
- **Checked by `scripts/headless/course-centre-court.js`** (515 checks: every screen of the demo at 390, 375 and 320 px for
  sideways scroll, text under 12 px, "·" beside a Persian digit, emoji, yellow, 44 px targets, cover or paper header, one
  green button; the tour's targets on their screens and all 15 tour steps with a ring; Start's button before and after a week;
  step by step, the Yo-Yo player, the 1RM calculator and sign in). It fetches the public demo once from Supabase (so it needs
  the network) and unlocks two tests and makes a test day in memory; no course content is kept in the repo. Run it, and
  `youtube-course.js`, after any change to the course app.

## Exercises come from the Spine

**The course's exercises are fed from the Spine** (stage65, 2026-10-12; Amir: "fed from spine", one live source). Each course exercise in `tps_content` names its entry (`spine`); the entry's `steps_fa`, `cues_fa`, `purpose_fa` and `tennis_fa`, and its video, reach the course live through `get_exercises_fa()` (kept on the phone as `tps.spinefa` for offline) and replace the course's own copies; the Spine's one fault replaces the old list of common mistakes (CUE-7). **A change to an entry's English steps, cues, purpose or On court line changes its Farsi in the same run.** The course's own `easier`, `harder`, `equipment`, `noEquipment` and `u16` stay in the course. A new course exercise needs a Spine entry with its Farsi before it ships.
114 course exercises, 114 entries (43 drafted for the course that night, approved on Amir's word; 5 course ids map to an
entry with another id, e.g. `easy-jog` → `easy-run`). The Farsi was written from the Spine's English in the course's own
voice and published on Amir's word ("Publish, I'll edit"); he edits it in coach.html → Exercises → an entry → Farsi.

## The tour and the guide

**The course app has a TOUR and a GUIDE** (2026-09-21, Amir: *"i want the TPS course, and the demo,
to have a tutorial made for it, showing the different sections and where to find where, in farsi"*).
Both are in `tennis/app/app.js` under *The tour and the guide*, and they run for a **buyer and a demo
visitor alike** — the demo's copy names what is locked and its last card carries the buy button.
- **The tour** is habits.html's, ported: a clay ring around a real control, a card beside it, four
  mask panes with a **real hole** so a step marked `act` is finished by doing the thing. 15 steps
  across all five tabs, and it **opens step-by-step mode for real** (three steps: the warm-up card
  and its timer, a real set, the ✕) because the green step-by-step button (at the foot of a session until 2026-10-13, in its cover since) was the part
  nobody finds alone. It runs **once** on a first open — not on a deep link, which is somebody who
  came for a page — and `?tour=1` always replays it. Whether it has run is `localStorage` key
  **`tps.toured`**, deliberately NOT inside `tps.prefs`: a prefs object existing before a version is
  chosen reads as "already chosen" in every `!prefs` test in that file.
- **The guide** is `#/guide`, reached from the **؟** beside the gear on all five tab banners. It is
  a map, not an essay: the five sections and the controls that hide (version gear, step mode, the
  warm-up timer, exercise search, the one-rep-max calculator, the Yo-Yo beeps, printing the results
  sheet), **every row a real link** — and in the demo it links at `#/tests` rather than into a
  locked test. It also replays the tour.
- ⚠️ **Move a control, rename a tab, or change what a tap does and the tour is actively lying**, on
  the first screen a new buyer or a demo visitor sees. The same rule habits.html's `tourSteps()`
  carries. Its targets are resolved out of the live DOM per step, so a renamed class silently rings
  nothing rather than erroring: `.block-card .weeks`, `.session-card`, `.ex`, `.cta-bar .btn.primary` (in the
  session's cover since 2026-10-13, at the top: the tour and the guide say «بالای هر جلسه»),
  `.step-body .rest`, `.step-foot .btn.primary`, `.step-top`, `.search`, `.section .list-row` (Learn and Tests,
  `.card.tap` until 2026-10-13), `#tabs`,
  `.bhelp` and `[data-tour="version"]`.
- ⚠️ **`sel` is lazy; `when` is EAGER — never let a `when` test the DOM.** A step's `sel` runs each
  time that step opens, so it sees the right screen. A step's `when` runs when the list is *built*,
  which is wherever the tour was started from — the guide screen, on a replay. The safety step's
  `when` read `#safety` at first and so dropped itself on every replay (14 steps, not 15), losing
  the one step that names the red flags, on the one path somebody chose deliberately. A `when` asks
  the **content** (`C.start.safety`) whether the view will draw the thing.
- Two new Plausible goals to create, demo only: **`Tour opened`** and **`Tour finished`** (plus
  `Tour skipped`).

## Videos in the course app

`ytId()` in `tennis/app/app.js` is one of the three YouTube parsers (with `ytVideoId()` in
`program.html` and the modal in `assets/js/shared.js`), and it plays from `www.youtube.com/embed`
like the others.

**The bar under the player** (Amir, 2026-10-05: *"C and red"*): buyers in Iran whose embed will not play while the YouTube
app or browser does get **«باز کردن در یوتیوب»** under every player (`videoBlock()`: `.vunit` holds `.video` and `a.vyt`;
a session's exercise row, the exercise page and step mode all draw it through that one function). It is
a plain `https://www.youtube.com/watch?v=` link (`ytWatch()`; a Short keeps `/shorts/`), opened in a new tab, so the phone picks
the YouTube app or the browser. The red YouTube mark sits at the start edge and the external-link arrow, mirrored for RTL, at the
end. The bar is a sibling of `.video`, never inside it: the iframe fills that box and would cover it the moment the embed loads.
Only a YouTube address gets one (`ytWatch()` checks the host; `ytId()` itself still reads any link with a `v=`). The comment
above `videoBlock()` now says what the code does. Check it with `scripts/headless/youtube-course.js` (demo mode against a stub).
Re-run `python scripts/stamp_tps_app.py` after any edit here.

## The course app's pictures

**The course app's pictures (Amir, 2026-09-19).** AI-made (GPT Image 2 and Higgsfield), one look: shadows lean deep green,
highlights lean warm cream, clay orange the only loud colour. They live in `assets/tps/` as WebP, made from masters by
**`scripts/grade_tps_art.py`**, which applies ONE shared colour grade (prompts drift off-colour, the grade does not) and
exports 1080 px, 16:9 WebP, about 30 KB each on average (9 to 83 KB). They show in the **demo** (`/tennis/app/?demo=1`) and to every paying buyer alike: `ART` and
`ART_V` in `app.js` decide where each goes (block covers by block number, lessons and tests by id, one tarp picture for
every locked page, one room per session card, one for the session-complete screen). ⚠️ **Everyone sees everything (2026-09-20).** The gate that kept lessons, tests and the locked pages demo-only (`ART_KINDS`) is gone, because all 22 lessons and all 7 tests now have a cover. **A new lesson or test needs its cover added to `ART` by its id, or its card stays a plain green banner** (the ids are in `public.tps_content`: `learn`…`learn-5` and `tests`), so never ship half a list of pictures. `tennis/app/sw.js` keeps each picture for offline use, in its own `tps-art` cache, the first time it is shown. Rules every picture follows: no text or logos in
the image, subject on the LEFT and the right and bottom calm (the app is right-to-left, so titles sit there), no yellow
or gold, no faces, never teach exercise form. After regrading a file raise `ART_V`: the root `sw.js` keeps `/assets/`
files cache-first by full URL. **All 42 pictures exist** (40 on 2026-09-20; `warm-seat` and `long-way-back` were added on 2026-10-02 for the lessons `training-on-period` and `training-with-injury`, 3 credits; 2026-09-20: 4 block covers, 3 session rooms, the test-day card, the session-complete picture, the locked-page tarp, the sign-in walk-on, and 22 lesson and 7 test covers). The last 12 covers were generated on 2026-09-20 with the Higgsfield connector (`/image` skill; `gpt_image_2_5`, medium, 1 credit each, 3 candidates per slot, best of three) and graded through the same script, except `tennis-fitness`, which came from the program.html session's set. ⚠️ **Before generating anything, run `git status --short` and look at `assets/tps/` and the other sessions' scratchpads**: on 2026-09-20 two sessions were asked for the same 12 covers and both generated them, which cost credits twice. The sign-in walk-on is not gated at all: it replaces `court-sessions.jpg` for everyone, because it swaps a picture rather than adding one. Nine of the covers are program.html stills (its art is composed with the subject on the RIGHT, the opposite of this RTL app), reused by mirroring them: `FLIPPED` in `scripts/grade_tps_art.py`. Like the rest of the demo it was built in this folder.
*2026-10-13:* the walk-on is also the Start screen's cover now, as `ART.start` (so `ART` maps it too). *Checked 2026-09-26:* `assets/tps/` holds exactly 40 WebP files; `ART` maps 39 of them and the 40th
is the sign-in walk-on (`tennis/app/index.html`).

## `/tennis/`: the course's product page

**`/tennis/` is the course's product page** (Farsi, indexable; 2026-09-15). Amir: every product gets
its own page, on one shared layout (hero → who → inside → how → price → FAQ → buy):
`assets/css/fa-product.css`, with Vazirmatn self-hosted in `assets/fonts/`. **Bump the `?v=` on that
link after any change**, because `sw.js` serves `/assets/` cache-first to anyone who has opened
program.html. The **«تو کدوم سطحی؟» level test** is `tennis/level-test.js`. Amir's rules (aiming at
~70% Level 2, 15% Level 1, 15% Level 3) are in its header: change them there, and nowhere else. It stores
nothing and sends only a Plausible custom event `Level test 1|2|3` (each needs a goal in Plausible).
The page reaches `sitemap.xml` through `FOLDER_PAGES` in `scripts/build_article_pages.py`.
`index-fa.html` links it from the menu («دوره») and the «محصولات» strip.

## `/tennis-testing/`: the testing app's product page

**`/tennis-testing/` is the testing app's product page** (Farsi, indexable, for coaches and academies;
full sale at $17 once, 2026-09-15) on the same `fa-product.css` layout. **The app itself moved to
`/tennis-testing/app/`** that day, while no login existed. Its shell is edited here in `tennis-testing/app/` (this repo is its permanent home since 2026-10-02, like the course
app; the private `assess-content` repo is retired, and the content lives only in `assess_content`); logins come
from coach.html → **Testing app** (`ASSESS_URL`). The page's phone screens are real, taken with made-up
sample players (`?sample=1`). Like the course app, it self-hosts Vazirmatn and supabase-js 2.116.0
(`fonts/`, `lib/`), so nothing waits on Google Fonts or jsDelivr. `index-fa.html` links it from the menu («برای مربی‌ها») and the third
«محصولات» card.

## Where the Farsi products are introduced

**Where the Farsi products are introduced (Amir, 2026-09-15):**
- `index-fa.html` has a clay top banner («تازه: دوره‌ی تنیس و اپِ آزمون ←», not sticky) that jumps to the «محصولات» strip.
- That strip sits right under the hero and the stats bars.
- The menu keeps only links that go to another page: «دوره», «برای مربی‌ها», «مقاله‌ها» (Amir,
  2026-09-15: the seven links that jumped down the page are gone). On phones they drop down from a ☰
  panel under the bar, with English as its last row. `/tennis/` and `/tennis-testing/` have the same
  phone menu but keep their section links. One script opens and closes all three:
  `assets/js/fa-nav.js`; the look is in `index-fa.html`'s CSS and `fa-product.css`, so change both.
- `links.html` has a button for each product, plus the course demo («هفته‌ی ۱ رو رایگان امتحان کن»).
- **The English site deliberately does not mention them** (Amir's choice): it stays about coaching for international players.
