# The Farsi products: the course app, the testing app and their pages

Moved here from `CLAUDE.md` on 2026-09-26 (its second slimming pass), word for word except where the
code had moved on (marked *checked 2026-09-26*). CLAUDE.md keeps only the tripwires. This file covers
Amir's two Farsi products for players and coaches in Iran: the paid course (Tennis Performance System,
the product page `/tennis/` and its app `/tennis/app/`) and the testing app for coaches
(`/tennis-testing/`). The rule for YouTube embeds, which covers the programme app and the whole site
too, stays in CLAUDE.md → *Site layout*.

## The course app (`/tennis/app/`)

**`/tennis/app/` is the paid course app** (Tennis Performance System, Level 2; Farsi). Its source
and content live in the private `tps-content` repo: only the shell (index.html, app.js, app.css,
sw.js, the self-hosted font and Supabase library) is copied here by
`tps-content/app/_dev/deploy_to_website.py`, so **never edit those files here**. The handbook itself
is in Supabase (`tps_content`, readable only by an active buyer); logins come from coach.html →
**Course**. Backend: `supabase/tps_01_accounts_content.sql` + `supabase/functions/tps-login`.
⚠️ **One exception, 2026-09-15: the demo was built directly in this folder**, because `tps-content`
was not reachable from Amir's PC (not in its folders, and his stored GitHub login sees neither it
nor `assess-content`, which another session deployed from that same day). **So the next deploy from
`tps-content` erases the demo** unless `app.js`, `app.css`, `index.html` and `sw.js` are first
copied from here into it. Whenever this folder is edited here, run `python scripts/stamp_tps_app.py`
(the pre-commit hook blocks a stale stamp): the app's worker answers from its cache first, so a change
shipped under an unchanged `sw.js` VERSION never reaches a phone that already has the app.
**The demo is `/tennis/app/?demo=1`** (Amir, 2026-09-15): no sign-in; week 1, the broad jump test and
three lessons open, everything else locked behind a WhatsApp buy button. The lock is server-side:
`tps_demo()` (`supabase/tps_02_demo.sql`, where the picks live) sends each locked item as its card
only, so nothing locked ever reaches the phone. Never "lock" something in app.js alone. It is the one
mode that loads Plausible (goals `Demo opened`, `Demo failed`, `Demo locked`, `Demo buy`). It is linked
publicly (Amir, 2026-09-15, before his Iran test): from `/tennis/` (menu, hero link, the phone
screenshot, the inside section, the price card, an FAQ), the course card on `index-fa.html`, and
`links.html`. If it will not open in Iran without a VPN, move the free parts to static files on the website.

## The tour and the guide

**The course app has a TOUR and a GUIDE** (2026-09-21, Amir: *"i want the TPS course, and the demo,
to have a tutorial made for it, showing the different sections and where to find where, in farsi"*).
Both are in `tennis/app/app.js` under *The tour and the guide*, and they run for a **buyer and a demo
visitor alike** — the demo's copy names what is locked and its last card carries the buy button.
- **The tour** is habits.html's, ported: a clay ring around a real control, a card beside it, four
  mask panes with a **real hole** so a step marked `act` is finished by doing the thing. 15 steps
  across all five tabs, and it **opens step-by-step mode for real** (three steps: the warm-up card
  and its timer, a real set, the ✕) because the green button at the foot of a session is the part
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
  nothing rather than erroring: `.block-card .weeks`, `.session-card`, `.ex`, `.cta-bar .btn.primary`,
  `.step-body .rest`, `.step-foot .btn.primary`, `.step-top`, `.search`, `.card.tap`, `#tabs`,
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
like the others. ⚠️ It was edited here on 2026-09-23, so copy `app.js` and `app.css` into
`tps-content` before its next deploy. *Checked 2026-09-26:* the comment above `videoBlock()` still
says a link hands the clip to the phone's YouTube app; that link was removed the same day and the
code has none, so the comment is stale (fix it in `tps-content`).

## The course app's pictures

**The course app's pictures (Amir, 2026-09-19).** AI-made (GPT Image 2 and Higgsfield), one look: shadows lean deep green,
highlights lean warm cream, clay orange the only loud colour. They live in `assets/tps/` as WebP, made from masters by
**`scripts/grade_tps_art.py`**, which applies ONE shared colour grade (prompts drift off-colour, the grade does not) and
exports 1080 px, 16:9 WebP, about 30 KB each on average (9 to 83 KB). They show in the **demo** (`/tennis/app/?demo=1`) and to every paying buyer alike: `ART` and
`ART_V` in `app.js` decide where each goes (block covers by block number, lessons and tests by id, one tarp picture for
every locked page, one room per session card, one for the session-complete screen). ⚠️ **Everyone sees everything (2026-09-20).** The gate that kept lessons, tests and the locked pages demo-only (`ART_KINDS`) is gone, because all 22 lessons and all 7 tests now have a cover. **A new lesson or test needs its cover added to `ART` by its id, or its card stays a plain green banner** (the ids are in `public.tps_content`: `learn`…`learn-5` and `tests`), so never ship half a list of pictures. `tennis/app/sw.js` keeps each picture for offline use, in its own `tps-art` cache, the first time it is shown. Rules every picture follows: no text or logos in
the image, subject on the LEFT and the right and bottom calm (the app is right-to-left, so titles sit there), no yellow
or gold, no faces, never teach exercise form. After regrading a file raise `ART_V`: the root `sw.js` keeps `/assets/`
files cache-first by full URL. **All 40 pictures exist** (2026-09-20: 4 block covers, 3 session rooms, the test-day card, the session-complete picture, the locked-page tarp, the sign-in walk-on, and 22 lesson and 7 test covers). The last 12 covers were generated on 2026-09-20 with the Higgsfield connector (`/image` skill; `gpt_image_2_5`, medium, 1 credit each, 3 candidates per slot, best of three) and graded through the same script, except `tennis-fitness`, which came from the program.html session's set. ⚠️ **Before generating anything, run `git status --short` and look at `assets/tps/` and the other sessions' scratchpads**: on 2026-09-20 two sessions were asked for the same 12 covers and both generated them, which cost credits twice. The sign-in walk-on is not gated at all: it replaces `court-sessions.jpg` for everyone, because it swaps a picture rather than adding one. Nine of the covers are program.html stills (its art is composed with the subject on the RIGHT, the opposite of this RTL app), reused by mirroring them: `FLIPPED` in `scripts/grade_tps_art.py`. Like the rest of the demo it was built in this
folder, so the next deploy from `tps-content` erases the `app.js`, `app.css` and `index.html` changes unless they are
copied there first.
*Checked 2026-09-26:* `assets/tps/` holds exactly 40 WebP files; `ART` maps 39 of them and the 40th
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
`/tennis-testing/app/`** that day, while no login existed. Its shell is copied there by
`assess-content/app/_dev/deploy_to_website.py`, so never edit `tennis-testing/app/` by hand; logins come
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
