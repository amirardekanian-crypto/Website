# Site Audit: the website review (2026-10-02), what is done and how to continue

The UX, design and usability review of the **public website** (English and Farsi, 20 pages), made on 2026-10-02, and the work that follows it. The apps (`program.html`, `habits.html`, `coach.html`) come after (package 25). **A new chat picking this work up reads this file first.**

**This file is generated.** Edit `scripts/site_audit/backlog.py` (statuses, items, decisions) and run `python scripts/site_audit/build_report.py`. The private visual report page is built from the same file, so the two cannot disagree. The reviewers’ full reports (with file and line references) are in `Content/site-audit/`; the measuring tools and how to re-run them are in `scripts/site_audit/README.md`.

## How Amir wants it done

Same working agreement as `Content/FRESH-EYES.md` (the app audit):

- One package at a time: the next one in the order below, or the one he names. He answers with numbers (“1-5 yes, 7 no, 12 B”).
- Before any code: restate the problem, and for a call that is his, show the options with a picture or a real example and **mark my pick**. Never an abstract menu.
- **Build only after his yes on a call that is his** (a design direction, copy in his voice, a business or legal fact). Everything else, build and ship without stopping.
- Keep what works (the list below). Never remove a feature without saying so. Smallest change that solves it.
- After each package: WHAT CHANGED · WHY · FILES · PRESERVED · SIDE EFFECTS · WHAT TO TEST, briefly, then re-run the scoreboard and report the difference.
- Ship live: straight to `main`, one push at a time, stage only your own files (other sessions share this working tree), then confirm the deploy.
- Anything that touches `assets/css/*.css` or `assets/js/shared.js` bumps the `?v=` token on every marketing page that links it (`20261002f` now: index, form, proof, privacy, terms; `fonts.css` carries `20261002e`; `fa-product.css` has its own, `v=8`, on the two course pages). `sw.js` serves `/assets/` cache-first by exact URL, so a new token is a fresh copy. Do NOT bump `CACHE` in `sw.js` for that: it deletes the athletes’ offline copy of the apps. A replaced image ships under a new name.
- Never edit the generated pages (`en/articles/`, `fa/articles/`, `sitemap.xml`): fix `scripts/build_article_pages.py`. Keep the Search Console tag in `index.html`.
- “Push back, with evidence.” Check a visual defect in a real viewport (`scripts/site_audit/shot.js`) before reporting it: a frozen full-page capture once showed empty contact icons that were fine.

## Where it stands

**25 packages · 82 findings** (30 cost you now, 39 worth fixing, 13 polish). Done: 11 · Waiting for you: 5 · Decided: next to build: 5 · Another session: 1 · Queued: 3

| # | Package | Phase | Status | Effort |
|---|---|---|---|---|
| 1 | Make small text readable | Fix now | Done (5 of 5 items) | small to medium |
| 2 | Tappable and zoom-safe on a phone | Fix now | Done (3 of 3 items) | small |
| 3 | Menus and sticky bars that work on every phone | Fix now | Done (4 of 4 items) | medium |
| 4 | Home-page bugs | Fix now | Done (4 of 6 items) | medium |
| 5 | Farsi correctness | Fix now | Done (5 of 6 items) | medium |
| 6 | Fonts: no blank screens, no jumps | Fix now | Done (4 of 4 items) | small to medium |
| 7 | Forms that finish properly | Fix now | Done (5 of 7 items) | medium |
| 8 | A real 404 page | Fix now | Done (1 of 1 items) | small |
| 9 | Count what matters | Fix now | Done (1 of 1 items) | small to medium |
| 10 | Promises that match reality | Fix now | Waiting for you | small |
| 11 | No-yellow cleanup | Fix now | Done (1 of 2 items) | small |
| 12 | English home: shorter and clearer | Your call | Decided: next to build | large |
| 13 | The apply form: promise vs length | Your call | Decided: next to build | medium to large |
| 14 | Farsi home: price, trust and length | Your call | Decided: next to build | medium |
| 15 | Farsi product pages: trust at the buy button | Your call | Waiting for you | medium |
| 16 | Proof page and the Instagram link hub | Your call | Decided: next to build | medium |
| 17 | Partner page: the deal on the first screen | Your call | Waiting for you | medium |
| 18 | Articles: a next step, an author, a share card | Your call | Another session | medium to large |
| 19 | Your voice in the English copy | Your call | Decided: next to build | medium |
| 20 | Legal accuracy (needs facts from you) | Your call | Waiting for you | medium |
| 21 | One brand CSS file and shared chrome | Foundations | Queued | large |
| 22 | A style guard so it stays fixed | Foundations | Done (1 of 1 items) | medium |
| 23 | Can Iran reach the forms, Plausible and the demo? | Foundations | Waiting for you | small |
| 24 | Re-run the audit after each batch | Foundations | Queued | small |
| 25 | The apps | Next | Queued | large |

### Shipped

| Date | Packages | What changed | Commit |
|---|---|---|---|
| 2026-10-02 | 1, 2 | Readable small text and thumb-sized links: the muted grey, 12 px floors, a focus ring that shows on dark areas. | 906e1f5 |
| 2026-10-02 | 2, 5, 7 | Forms stop zooming on iPhone; Farsi phone numbers work (and the dashboard builds their WhatsApp link); keyboard focus on the Farsi form. | c6be9fd |
| 2026-10-02 | 4, 5, 6 | Farsi home: no blank screen when Google Fonts hangs, a visible phone picture, a real right-to-left testimonial rail. | 7c866bf |
| 2026-10-02 | 3, 4 | English home and nav: menus that fit a short phone, a sticky Apply bar that waits, pricing buttons that open the form with the plan chosen, no endless motion. | 95ccbf8 |
| 2026-10-02 | 8 | A real 404 page, English and Farsi, with WhatsApp carrying the broken address. | 0314b17 |
| 2026-10-02 | 7 | The apply forms finish properly: a WhatsApp next step, no alert box, a 15 second limit instead of a frozen button, the page behind the confirmation locked. | ddd4d42 |
| 2026-10-02 | 7, 9 | The free tracker and partner forms the same way; the partner form checks its fields in Farsi; the level test ignores a double-tap. | f04f97c |
| 2026-10-02 | 11 | No yellow on the apply forms: level marks in green and clay instead of traffic-light emoji. | 7ce2736 |
| 2026-10-02 | 6 | Farsi pages (form, partner, links, terms, Etminan) load Vazirmatn from your own server: links.html used to paint nothing for 6+ seconds when Google hung, now under 0.3 s. | cf1683c |
| 2026-10-02 | 9 | Plausible now counts Apply clicks (with the plan), WhatsApp, demo, the link hub, and how far people get in the apply form. | 1aee984 |
| 2026-10-02 | 7 | A Tab on a slider no longer answers it; every group of choices has a name for a screen reader; errors say what to do. | d7c6726 |
| 2026-10-02 | 5, 7 | Etminan pages: focus rings, skip link, readable greys, 44 px language switcher, the thank-you dialog takes focus; the look is unchanged. | 4e0a7d4 |
| 2026-10-02 | 6 | The English pages stop jumping when the headline font arrives (layout shift 0.204 to 0); the hero ball no longer sits on the demo link. | 65a48f9 |
| 2026-10-02 | 5, 10 | Skip link and main landmark on the last Farsi pages; the home no longer promises "2 minutes". | ff47f99 |
| 2026-10-02 | 6 | Athlete photos on both homes 40% lighter, with sizes, loaded as you scroll. | ae22d81 |
| 2026-10-02 | 2, 5, 6 | Thumb-sized links on the shared header, footer and course pages; the 404 headline stops jumping; Persian-digit footer years. | 516efa8 |
| 2026-10-02 | 6 | The English pages and the Farsi pages’ Latin numerals load Barlow, Barlow Condensed, JetBrains Mono and DM Sans from your own site: 14 pages make no request to Google, layout shift unchanged. The privacy notice now says which pages still use Google Fonts. | f3e27cb |
| 2026-10-02 | 1 | Every white-on-clay button, badge and chip is the deeper #C2512C (4.66:1, was 4.40:1): 25 of 25 measured; lines, glows and clay text keep the brand colour. | 07e0118 |
| 2026-10-02 | 22 | The style guard: a commit that adds yellow, text under 12 px, a pale grey, letter-spaced Farsi, a Google font link or white-on-pale-clay is stopped. It also found and fixed: 10 to 11 px labels on the apply form and proof page, the pale grey on the Farsi form, partner and terms pages, and a slider value hanging off a 320 px screen. | 943a92c |

### Words I wrote, for you to read

Short functional lines, written to your voice rules, but they are your words on your site. Read them and tell me what to change.

**Apply form, English: the confirmation and the errors**

- I reply by WhatsApp or email. Got a question while you wait? Message me.
- Buttons: “Message Amir on WhatsApp” and “Back to the site”.
- The WhatsApp message the button opens: “Hi Amir, it’s <name>. I just sent my coaching application (<plan>).”
- If sending fails: “That did not go through, but your answers are still here. Try again in a moment, or message me on WhatsApp.”
- Under an unanswered question: “Please choose one option.” · “Please choose at least one.” · “Please choose an option from the list.” · “Please move the slider to give your answer.” · “Please enter a number from 10 to 80.” · “Please fill this in.” · “Please enter your email address.” · “Please enter a valid email address, like name@example.com.”

**Free tracker page (proof.html), English**

- After sending: “I have your number as <number>. If that is wrong, message me and I will fix it.” and a button “Message me on WhatsApp”.
- The WhatsApp message it opens: “Hi Amir, it’s <name>. I just signed up for AA Proof.”
- If sending fails: “That did not go through, but what you typed is still here. Try again in a moment, or message me on WhatsApp.”

**Apply form, Farsi**

- After sending, under the old text: «جوابت رو از همون راهی که نوشتی (واتساپ یا اینستاگرام) می‌دم. تا اون موقع سؤالی داشتی، همین‌جا بهم پیام بده.»
- Buttons: «پیام توی واتساپ» و «برگرد به خانه».
- The WhatsApp message it opens: «سلام امیر، من <نام> هستم. همین الان فرمِ درخواست رو فرستادم.»
- If sending fails: «ارسال نشد، ولی جواب‌هات همین‌جاست. چند لحظه بعد دوباره امتحان کن، یا توی واتساپ یا اینستاگرام بهم پیام بده.»
- Under an unanswered question: «یکی رو انتخاب کن.» · «دست‌کم یکی رو انتخاب کن.» · «یکی از گزینه‌ها رو انتخاب کن.» · «اسلایدر رو جابه‌جا کن تا جوابت ثبت بشه.» · «سنت رو با عدد بنویس.» · «این بخش رو پر کن.» · «ایمیلت رو بنویس.» · «ایمیلِ معتبر وارد کن.»

**Partner page, Farsi**

- Same two buttons after sending, and the same failure line as the apply form.
- The WhatsApp message it opens: «سلام امیر، من <نام> هستم. همین الان فرمِ همکاریِ مربی‌ها رو فرستادم.»
- Under a missing field: «این بخش لازمه.» · «برای ادامه باید شرایط رو تأیید کنی.» · «یه روش انتخاب کن.» · «ایمیلِ معتبر وارد کن.»

**The 404 page (both languages)**

- English: “That page is not on this court.” · “The link may be old, or one letter is wrong. These will get you back.” · “Already coached? Open your programme” · “Still stuck? Message me on WhatsApp”. The big word is “Out.” and the buttons are Home, Apply for coaching, Free habit tracker, Articles.
- The WhatsApp message it opens, so you can fix a broken link: “Hi Amir, I hit a broken link on your site: <the address>”.
- Farsi (first when the broken link was a Farsi one): «اوت شد! این صفحه پیدا نشد.» · «شاید لینک قدیمی بوده یا یه جاش اشتباه تایپ شده. از این‌جاها می‌تونی ادامه بدی.» · «برنامه‌ی تمرینی داری؟ بازش کن» · «هنوز گیر کردی؟ توی واتساپ بهم پیام بده»; buttons «صفحه‌ی اصلی», «شروع کن», «مقاله‌ها».

**English home**

- “Application takes about 5 minutes · No commitment until we speak” (it said 2 minutes).

**Privacy notice, the Fonts paragraph (section on third parties)**

- Now reads: “The home page, the apply and free-tracker forms, the privacy and terms pages, the Farsi pages and the Etminan pages serve their typefaces from this site, so those pages make no font request to Google. Some other pages (the articles, the training and habit apps and the UTS page) still load their typefaces from Google Fonts. To draw them, your browser asks Google’s servers …” (the rest as it was). It is a legal text and your words: say if you want it changed.

**Small helper words**

- Skip links for keyboard users: «رفتن به محتوا» · «رفتن به لینک‌ها» · «رفتن به متن» · «رفتن به فرم». The English ones already said “Skip to content”.
- Screen-reader names for the Etminan language switcher: “FA فارسی”, “EN English”, “DV ދިވެހި”.

**Calls of yours that I shipped anyway** (small, reversible or an accessibility fix; say “revert” and it goes in one commit):

- The 404 page and its words (package 8). It was marked as your call.
- The small labels on the green hero are now cream with a clay dot, and small clay text on light is a hair deeper (package 1, items c and d).
- The headline pulse on the English home stops after two beats instead of running for ever (package 4, item e).
- The home’s “about 5 minutes” (package 10, item a, only the number).

## Scoreboard

Measured on the live site from this PC (UK) with `scripts/site_audit/`: the baseline on 2026-10-02 and again after the first batches (live site, 2026-10-02 afternoon). Lab numbers use a simulated slow 4G phone; they say nothing about Iran.

| Measure | Baseline | Now | Goal |
|---|---|---|---|
| Phone length, English home | 20.4 screens | 20.5 screens (unchanged: that is package 12) | 13 or fewer |
| Phone length, Farsi home | 20.8 screens | 20.9 screens (unchanged: package 14) | 15 or fewer |
| Text under 12 px, English home | 65 items | 22 (all inside the miniature app drawn in the phone picture) | 0 |
| Tap targets under 44 px, English home | 15 | 1 (the drawn mini app, which is not tappable) | 0 |
| Tap targets under 44 px, apply form (English) | 13 | 2 (the two sliders: the thumb is the target) | 0 |
| Blank screen if Google Fonts hangs (Farsi home) | 8.3 s | 0.15 s (the Farsi link page: from nothing for 6 s to under 0.3 s) | under 1 s |
| Layout jump on a slow phone | 0.096 home, 0.087 form, 0.209 Etminan Farsi | 0.000 home, 0.001 form, 0.028 Etminan Farsi, 0.006 on the 404 (was 0.087) | under 0.05 |
| First paint on a slow phone, Farsi pages | home 1.9 s, form 1.5 s, links 1.2 s | home 1.1 s, form 0.9 s, links 0.7 s | under 1.5 s |
| Etminan pages: text under 12 px | 26 per page | 0 | 0 |
| English home reading ease | 34 of 100, 43 em-dashes | unchanged (package 19) | 60 or more, none |
| Apply form: promise vs reality | “2 minutes” vs about 5, 27 to 30 questions | the home now says about 5 minutes; still 27 to 30 questions (package 13) | true, and shorter |
| “Sent” screens that are a dead end | 4 forms | 0 (each has a WhatsApp next step and a way back) | 0 |
| Pricing buttons that open the form | 0 of 3 (they jump to the page bottom) | 3 of 3, plan chosen | 3 of 3, plan chosen |
| Key clicks you can see in Plausible | none (only form submits and level-test results) | Apply (with plan and place), WhatsApp, demo, link hub, form started and each step, proof, partner, level-test start. Add the goals in Plausible to see them. | Apply, WhatsApp, demo, proof, partner, form steps |
| A wrong web address shows | GitHub’s grey English page | your own page, English and Farsi | your own page, English and Farsi |
| Athlete photos on the homes | 713 KB, no sizes | 433 KB, with sizes, loaded as you scroll | light, sized |
| Marketing pages that ask Google for fonts | 19 pages | 5 kinds left: the generated articles, the UTS page, the Divehi Etminan page and the two apps (the 14 pages that matter make no Google request; checked in a real browser) | none |
| White text on clay buttons, badges and chips passing AA (4.5:1) | 0 of 25 (4.40:1) | 25 of 25 (4.66:1) | all |
| Text under 12 px, apply form and proof page | 15 on the form, 4 on proof | 0 (the style guard now stops a new one) | 0 |
| Pale grey (#8A8A8A) as text on the Farsi form, partner and terms pages | 14 uses | 0 | 0 |

The baseline per-page tables are in `Content/site-audit/baseline-scoreboard.txt`.

## What works (keep)

- The brand is disciplined. No yellow or gold on any core page. Green, clay and paper everywhere.
- Fast and light. The English home loads in about half a second; every page is under 2.5 s on a simulated slow phone; no console errors; no sideways scrolling from 320 to 1920 px; all 30 internal links work.
- Honest selling. “Built for you if / not the right fit if”, the no-sign-up live demo, the 60-day promise, “An app gives you a workout. I give you a coach.”
- Safe form plumbing. Saved to the database and emailed in parallel, success if either lands; a typed discount code is never lost; every section says why it asks.
- Farsi craft is mostly right. Vazirmatn at 17 to 23 px, warm voice, Persian digits, no Arabic letters, no letter-spacing on the main pages. The course page is lean and its level test is an honest gate.
- Article pages read well (19 px at 1.8 leading), carry correct hreflang and structured data, and have a visible language pill.
- The UTS form (six steps, honest under-18 path), the partner terms (plain and fair) and the privacy notice’s detail (it names every processor).

## Fix now

Objective problems with a known fix. I build and ship these one by one, and tell you what changed.

### 1. Make small text readable  ·  Done  ·  small to medium

One grey in your colour list is too pale for small text, and 65 labels on the English home are smaller than 12 px. One value change in the shared colour file fixes most pages at once.

**Still open.** Done on 2026-10-02 with your yes: every white-on-clay fill is #C2512C (4.66:1; token --accent-2-fill, --clay-fill on the Farsi pages), 25 of 25 measured; lines, glows, dots and clay text keep #C7552F. The 22 labels still under 12 px on the English home are the miniature app drawn inside the phone picture. The apply form and proof page labels (10 to 11 px) were found by the style guard and raised to 12.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 1a | ✓ | P1 | All English pages, 3 Farsi pages | The muted grey #8A8A8A is 3.2:1 on paper and 3.45:1 on white (AA needs 4.5). The paler #B0A99E is 2.0:1. | tokens.css lines 33 and 80: --text-muted to #6B6B6B (about 5:1); never use --text-dim for text; same for the local greys in partner-fa, form-fa, terms-fa. | S |  | home-en-11, form-en-13, links-03 |
| 1b | ✓ | P2 | English home, form, proof, Etminan | 64 text items under 12 px (mono, 2 to 3 px letter-spacing), 15 on the form, 26 on Etminan; 52 of 65 body blocks are weight 300 at 15 px or less. | Floor of 12 px for labels, tighter tracking, body weight 400 for small text (index.html about 20 rules, form.html 4, proof 2, components.css and base.css 2 each). | M |  | home-en-11, etminan-en-01 |
| 1c | ✓ | P1 | English home | Clay on the green hero fails badly: kicker 1.8:1, “Elite Athletes” 2.0, “An Experience.” 1.6, the Match key line 3.2, the INCLUDED badge 2.6, the closing note about 3:1. | Small labels on green in paper or cream with a clay dot; big clay words only where the green is dark. Keeps the look, fixes the reading. | S | Y | home-en-07, home-fa-10, tennis-07 |
| 1d | ✓ | P2 | Everywhere clay text is small | Small clay text on light is 4.1:1 and white-on-clay buttons are 4.4:1, both just under AA. | A text-only deeper clay (#B84A27, 4.9:1; the app already does this with --clay-ink) and bold 14 px or larger on buttons. A hairline colour shift, easy to revert. | S | Y | article-11, home-fa-10 |
| 1e | ✓ | P1 | English home, nav, dark sections | The keyboard focus ring is dark green, so it vanishes on every dark area (nav, hero buttons, demo, final CTA). The testimonial scroller is an unnamed tab stop. | base.css line 216: white outline inside .hero, .sec--dark, .site-nav; aria-label on the scroller. | S |  | home-en-06 |

### 2. Tappable and zoom-safe on a phone  ·  Done  ·  small

On an iPhone, a text box smaller than 16 px makes the whole page zoom in when you tap it. Footer links are 19 px tall. Both are quick fixes.

**Still open.** Left on purpose: the two sliders in the apply form (the thumb is the target, not the 6 px bar) and the drawn mini app on the home. Not done: the shorter header on the apply form and the "5 of 18 required" count.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 2a | ✓ | P1 | Both apply forms, proof, partner, UTS, Etminan | Inputs are 14 to 15 px, so iPhone Safari and Instagram’s browser zoom the page at every field. | font-size: 16px on input, select, textarea. | S |  | form-en-03 |
| 2b | ✓ | P2 | Every page | Tap targets under 44 px: footer links 19 px (shared partial and Farsi footers), menu button 40 px, inline demo links about 30 px, the level test’s back link 23 px. | Pad them to 44 px (partials/footer.html and components.css, fa-product.css, level-test). | S |  | home-en-11, shared-02, home-fa-17, article-14 |
| 2c | ✓ | P2 | Both apply forms | The nav plus progress bar cover 113 px of the phone (about a quarter with the keyboard up) and nothing keeps the focused field clear of them. | html { scroll-padding-top: 130px }, a slimmer bar on phones, count “5 of 18 required”. | S |  | form-en-06 |

### 3. Menus and sticky bars that work on every phone  ·  Done  ·  medium

On a shorter phone the open English menu runs over the logo and hides the Apply button. The Apply bar at the bottom shows twice on the first screen and keeps pulsing.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 3a | ✓ | P1 | English pages (shared nav) | On 375×667 the open menu paints “Results” over the logo, Apply is off-screen, “فارسی” hides under the bar, the panel cannot scroll, and the icon never becomes ✕. At 901 to 990 px the header Apply is cut (“APPLY NO”). | components.css 119 to 134: top-align, overflow-y: auto; shared.js 118: swap to ✕; hide the sticky bar while the menu is open; hamburger breakpoint 900 to 1040. | M |  | home-en-04 |
| 3b | ✓ | P2 | English home | The same “Apply Now” shows twice on the first screen and again at the final CTA; header plus bar cover 17% of a phone; the bar’s spoken name (“Apply for the programme”) does not contain its visible words; it pulses forever; iPad portrait gets neither bar nor header Apply. | Show the bar only after the hero button scrolls out and hide it at the final CTA; drop the aria-label; no endless pulse. | S |  | home-en-13 |
| 3c | ✓ | P2 | English home | At 360 px (a common Android) the ball covers the kicker, the headline wraps to 5 lines and the hero Apply slides under the bar. | index.html line 273: clamp(46px, 15vw, 60px) under 480 px; move the ball. | S |  | home-en-12 |
| 3d | ✓ | P3 | English home | The big outlined 01–08 section numbers are clipped at the right edge and the 01–03 inside the How-it-works cards sit on top of the first line of text; two numbering systems on one page. | Hide the ghost numbers under 900 px; keep one numbering. | S |  | home-en-18 |

### 4. Home-page bugs  ·  Done  ·  medium

The three Apply buttons in the pricing cards do not open the form: they scroll to the bottom of the page. The testimonial arrows go the wrong way. Content stays invisible if the menu file loads slowly.

**Still open.** Not done: 4d (the two "Step inside" cards, which go to the demo home; its deep links open a safety card first) and 4f (the underline and glow colours, a look decision).

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 4a | ✓ | P1 | English home | The three pricing “Apply Now” buttons jump to #apply (page bottom), not the form, and lose the plan: a Match tap scrolls 9,820 px and needs a second tap. | index.html 1229, 1243, 1261 to /form.html?plan=match (and game, set), label “Apply for Match”; form.html pre-ticks the plan and reads ?programme= and ?code=. | S |  | home-en-01, form-en-05 |
| 4b | ✓ | P1 | English and Farsi homes | Testimonial arrows are swapped (English: > goes back; > on card 1 jumps to card 7). Auto-scroll is dead on 90 and 120 Hz phones and cannot be paused. Farsi rail is forced left-to-right: first card on the wrong side, the “previous” arrow jumps to the last card. | Swap handlers, delete auto-scroll (index.html 1691 to 1752), 44 px dark arrows. Farsi: a real RTL snap rail. | S-M |  | home-en-05, home-fa-09 |
| 4c | ✓ | P1 | English home and every page using shared.js | All 67 .reveal blocks stay invisible until JavaScript has fetched the nav and footer. With the file stalled, only the headline shows; with JavaScript off, same. | shared.js 336 to 344: start reveal first; a noscript rule. | S |  | home-en-16 |
| 4d |  | P2 | English home | Both “Step inside” cards open the same demo home, not Sessions or the Playbook. | Point each at a sample ?workout= and ?article=. | S |  | home-en-15 |
| 4e | ✓ | P3 | English home | 22 endless animations (58 playing at once). The headline pulses every 3.2 seconds forever, which is also a WCAG 2.2.2 fail for moving content. | Keep the entrance; run the pulse three times then stop; pause the ambient ones off-screen. Your “alive” look stays. | S | Y | home-en-16 |
| 4f |  | P3 | English home | The underline under “LAST LONGER.” is clay at 32% over green, which reads as a muddy olive bar; the clay glow turns brown near the hero bottom and the final CTA. | A clean full-colour underline or none; a darker base under the glow. | S | Y | home-en-07 |

### 5. Farsi correctness  ·  Done  ·  medium

The phone picture in the Farsi hero shows a greeting and exercise names in white on white. Phone numbers typed in the Farsi form show backwards. Several small right-to-left details are off.

**Still open.** Waiting for you: 5d, Farsi pages that send visitors into English (the demo banner, the privacy link, "message me in the app").

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 5a | ✓ | P1 | Farsi home | In the hero phone the greeting and both exercise names are white on white (only “۶×۴” shows); “امروز” is letter-spaced; screen readers read the mock as page text. | .pscreen { color: var(--ink) } (index-fa.html line 159), remove the spacing, aria-hidden on .phone-wrap. | S |  | home-fa-04 |
| 5b | ✓ | P1 | Farsi apply form, coach.html | Contact, email and the counter have no dir="ltr": a typed +98 912 345 6789 shows as “6789 345 912 98+”, the counter reads “۲۷ / ۳”. Persian digits are dropped by Age and by the dashboard’s WhatsApp-link builder, so such a number gets no link at all. | dir="ltr" on #contact, #em, #pCount; convert Persian digits to 0 to 9 and 09… to +989… on send; same normaliser in coach.html waLink() (line 4719). | S |  | form-fa-01, form-en-09 |
| 5c | ✓ | P2 | Farsi home and products | Method arrows point right in a right-to-left flow; the Instagram handle shows “amirardekanian@”; a middle dot before a digit reads as a zero (“تنیس · ۴ سال” looks like 40 years); Farsi numbers in Barlow Condensed fall back to a serif; about 48 verbs lack the half-space (میشه, میاد); footers show Latin “2026”; heading highlight leaves stray squares. | Mirror arrows, <bdi dir="ltr"> on the handle, use “،” not “·”, --disp stack with Vazirmatn, add ZWNJ, Persian year, underline via box-decoration-break. | S |  | home-fa-11 to 16, shared-03 |
| 5d |  | P1 | Farsi home, demo, footers | Farsi pages send visitors into English: the demo’s banner (Apply → /form.html, Exit → /), the footer privacy link; and the copy says “message me in the app” though the app is English with no chat (it opens WhatsApp). | Reword lines 641 and 647; ?from=fa on demo links so the banner uses the Farsi pages; a FAQ “اپ انگلیسیه؟”. Needs your word on the app. | M | Y | home-fa-03, privacy-04 |
| 5e | ✓ | P2 | Etminan pages | 19 Farsi labels use the mono font with letter-spacing at 9.5 to 11 px, which breaks Farsi joining; in right-to-left the lime ticker is off-screen in 7 of 12 samples. | One override block at the end of etminan.html: Vazirmatn, no spacing, 12 px; ticker direction ltr. | S |  | etminan-fa-02, etminan-en-02 |
| 5f | ✓ | P3 | Farsi pages | No <main> or skip link on the Farsi home, form, links, partner and product pages; the H1 text runs together (“پدلیه مربی،تو”). | Add <main>, a skip link, spaces in the H1. | S |  | home-fa-17, form-fa-02 |

### 6. Fonts: no blank screens, no jumps  ·  Done  ·  small to medium

The Farsi pages wait for Google Fonts before they paint anything. If that request hangs, which is how filtered networks often fail, the screen stays white for about 8 seconds. Your Vazirmatn file is already on your own server and is not being used on those pages.

**Still open.** 6c done on 2026-10-02 with your yes: Barlow, Barlow Condensed, JetBrains Mono and DM Sans (latin subset, 369 KB, 16 files, licences in assets/fonts/LICENSES.txt) are served from your site, 14 pages make no request to Google, and the privacy notice says which pages still do. Still on Google Fonts: the generated article pages (the page generator belongs to another session), the UTS page (its own brand and session), the Divehi Etminan page, and the athlete and coach apps. The UTS page is also why 6d (its hero photo) is still open.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 6a | ✓ | P1 | Farsi home, form, links, partner, terms, Etminan, articles | First paint waits for the Google Fonts stylesheet: 0.58 s normally, 0.25 s if blocked outright, but 8.3 s when the request hangs. | Use the self-hosted /assets/fonts/Vazirmatn-Variable.woff2 (@font-face as fa-product.css line 7, plus a preload); load Barlow without blocking; add Tahoma to the stack. No download needed. | S |  | home-fa-01, article-12, etminan-fa-01 |
| 6b | ✓ | P1 | English home, form, Etminan | Late fonts make the page jump: English home 0.096 (the hero shifts 73 px), form 0.087, Etminan Farsi 0.209. In a test, self-hosting took Etminan to 0.0002. | Same fix, plus preload for the two heading faces and a metric-matched fallback. | S-M |  | etminan-fa-01, home-en-16 |
| 6c | ✓ | P2 | All English pages | Barlow, Barlow Condensed, JetBrains Mono and DM Sans still come from Google (19 pages send the visitor’s IP there; your privacy notice admits it). | Self-host the four families (open-licence, about 600 KB). Needs your OK to download them. | M |  | secondary cross-page |
| 6d | ✓ | P3 | English and Farsi homes, UTS | Seven photos (about 710 KB) load immediately with no width or height; the UTS hero photo is requested late (LCP 2.1 s; a test got 0.7 to 1.5 s). | loading="lazy", width and height, 720 px copies; preload the UTS hero (UTS page: coordinate with its session). | S |  | home-en-16, uts-02, home-fa-18 |

### 7. Forms that finish properly  ·  Done  ·  medium

After someone presses Send, four forms end on a screen with nothing to tap. Nothing is saved until the last tap. The partner form lets a blank form through.

**Still open.** Waiting for you: 7c (keep a draft of the apply form in the browser, and whether to save name and WhatsApp after section 1) and 7g (a "Not sure yet" plan and a "Have a code?" link). Not done from 7f: validating on blur and marking "(optional)".

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 7a | ✓ | P1 | Apply EN and FA, proof, partner | The success screen is a dead end: no link, no word on how or when you reply, focus stays behind it; proof does not echo the number so a typo goes unseen. | “Message Amir on WhatsApp” (pre-filled with name and plan) and “Back to site”; say when you reply; focus the dialog; role="status". | M |  | form-en-04, proof-05, partner-fa-05 |
| 7b | ✓ | P1 | All forms | Submit waits with no timeout; a bare alert() (in-app browsers can swallow it); partner-fa never checks required fields (novalidate); proof falls through to form.submit() and drops the visitor on Web3Forms’ page; one Web3Forms key serves 9 pages. | 10 s timeout, inline errors with aria-live, succeed if either channel lands, reportValidity() on partner, no form.submit() fallback. | M |  | form-en-04, partner-fa-01, proof-06 |
| 7c |  | P1 | Apply form | Nothing is saved until the last tap: a reload took 5 of 29 answers back to zero, and you never learn who quit at question 12. | Save a draft in the browser; later save name and WhatsApp after section 1 (with a notice, your call). | S-M | Y | form-en-02 |
| 7d | ✓ | P2 | Farsi apply form | Pills and radio cards show nothing on keyboard focus (no :focus-visible rules). | Copy the English form’s focus rules (form.html lines 287, 331). | S |  | form-fa-02 |
| 7e | ✓ | P2 | Apply forms, level test | Tab on a slider records the default (sleep 7, stress 5) as an answer; the level test’s double-tap answers the next question unseen (verified at 150 to 400 ms). | Commit sliders only on input; ignore taps for 400 ms after an answer (level-test.js 128 to 140). | S |  | form-en-07, tennis-04 |
| 7f | ✓ | P2 | Forms | Smaller faults: the last field of a pair has no bottom margin so labels touch the field above; Farsi selects show two chevrons; Farsi submit text renders in Arial; proof’s consent line renders 16.5 px with no gap (a CSS clash); 10 radio groups have no group name; errors say only “Please answer this question”. | Margin rule, appearance:none, font-family, .p-form-sec .p-small, fieldset and legend, validate on blur with specific messages, mark “(optional)”. | M |  | form-en-08, form-en-12, proof-09, partner-fa-06 |
| 7g |  | P2 | Apply form | The first question is a required plan pick with no “what is included” and no “Not sure yet”; a coupon box sits above the name. | “Not sure yet”, an “all plans include” line, the code behind “Have a code?”, show the discounted price. | S-M | Y | form-en-05 |

### 8. A real 404 page  ·  Done  ·  small

A wrong or old web address shows GitHub’s grey English page, cut off on a phone, written for the site owner. Two drafts exist (the brand one and a working one); I will merge them.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 8a | ✓ | P1 | Whole site | /apply, /about, /faq, /blog, /en/ and /fa/ all show GitHub’s default 404: English only, no brand, no way home, no viewport tag so phones shrink it to about 40%. | Add a root 404.html: “OUT.” line-call joke, English and Farsi blocks (Farsi first for Farsi links), Home / Apply / Articles / Free tracker / Open your programme, WhatsApp with the broken path, a Plausible “404” event. Absolute paths, noindex, no canonical. | S | Y | notfound-01 |

### 9. Count what matters  ·  Done  ·  small to medium

Plausible sees page views, the two apply-form submits, the level-test result and the UTS and Etminan forms. It cannot tell you which button, page or article sells. A few lines of code fix that; you then switch the goals on in Plausible.

**Still open.** Your part: add the goals in Plausible (Site settings, Goals, Custom event). The names and properties are listed at the top of assets/js/track.js. The generated article pages are not counted yet (their generator belongs to another session).

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 9a | ✓ | P2 | Every page | Not measured: Apply clicks (and which plan), WhatsApp clicks, demo clicks, level-test start and result buttons, proof signup, partner submit, form started or abandoned, 404s. partner-fa and terms-fa have no Plausible at all. | One delegated click handler in shared.js and fa-nav.js, events on the proof and partner success, form-step events; list the goal names for you to add. | S-M |  | tennis-09, proof-07, form-en-02 |

### 10. Promises that match reality  ·  Waiting for you  ·  small

The home says the application takes 2 minutes. The form says about 5 and asks 27 to 30 questions. The proof page promises a private link that no longer exists.

**Still open.** Only the number is fixed (home: "about 5 minutes"). The rest needs your words: 10b the free tracker promises, 10c the Farsi form note, 10d the 60-day promise.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 10a |  | P1 | English home | “Application takes 2 minutes” is wrong (the form’s own badge says ~5 min; 8 sections), and it is the only reassurance, in 10 px at the end. | “About 5 minutes” now (the real fix is package 13); repeat under the hero and sticky buttons. “You pay nothing until we speak” only once you confirm it. | S | Y | home-en-03, form-en-01 |
| 10b |  | P2 | proof.html | Two stale promises: “get your link / private link” (links died on 7 Sep: it is a login now) and “eight to start with, switch off anything” (steps, sleep, food and water are always on). | “Send me my login”; “Four are always on. The rest are optional.” | S | Y | proof-04 |
| 10c |  | P2 | Farsi home | Six buttons say “شروع کن” and open a 5-minute, 27-step form without saying so. | “فرم ۵ دقیقه‌ست · تا ۴۸ ساعت جواب می‌دم” under the buttons; the abroad link points at the DM. | S | Y | home-fa-02 |
| 10d |  | P2 | English home | The 60-day promise is the quietest box (dashed, 14 px grey) and vague: a rebuilt plan, not a refund. Nothing says how or when you pay. | Move it under the cards at 18 px with one plain line. Needs your facts. | S | Y | home-en-09 |

### 11. No-yellow cleanup  ·  Done  ·  small

Your own rule is no yellow or gold anywhere. A few emoji break it.

**Still open.** Waiting for you: 11b, the amber on the Etminan pages (their co-brand look).

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 11a | ✓ | P2 | Apply form, level test | The plan cards show 🟡 for Set and University and 🟢🟡🔴 radios; the level test’s ⚠️ draws a yellow triangle; emoji also differ per phone (the Iran flag shows “IR” on Windows). | Plain text cards or small green and clay SVG marks (form.html 596, 715, 719; level-test.js 159). | S |  | form-en-11, shared-03 |
| 11b |  | P3 | Etminan pages | Amber #E08A2E in four places. The reviewer found the neon green and lime are a deliberate co-brand (CSS comment), the amber is the odd one out. | Amber to clay or neutral. Their palette, so your call. | S | Y | etminan-en-02 |


## Your call

A design, copy or business choice. I mark my pick, you say yes, no or change it.

### 12. English home: shorter and clearer  ·  Decided: next to build  ·  large

20 screens on a phone is long, the hero has no face, number or the words “online coaching”, and the right half of the desktop hero is empty. The Farsi hero (phone mockup beside the headline) is the version you like.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 12a |  | P1 | English home | The hero never says “online coaching” and shows no face, athlete or number; credentials start 903 px down; on desktop the right half is empty but for a ball. | Sub names “online coaching with Amir (MSc S&C)”; a proof row under the buttons (three athlete faces, “1000+ players”); the phone mock beside the headline on desktop; drop the first ticker. | M | Y | home-en-02 |
| 12b |  | P2 | English home | 17,200 px: pricing 2,437, About 2,272, Platform 2,120, Fit check 1,678 (see the bars). Claims repeat 3 to 4 times; Contact repeats the footer; price comes before process and coach. | Cut about 3,500 px: fit lists 3+3, About 4 blocks to 2, platform cards 5 to 3, Contact into the footer; order proof, process, pricing, fit check, app, About, FAQ. | L | Y | home-en-10 |
| 12c |  | P2 | English home | Three pricing cards repeat the “Every programme includes” strip, so tiers look alike; no currency label; $60 and $50 a month are tiny grey; Match is 2,000 px down. | “Everything in Game, plus…”; add “USD”; “$50/mo, save 29%” large; the strip as a checklist. | M | Y | home-en-08 |
| 12d |  | P2 | English home | Testimonials run 71 to 108 words in 14 px light italic; 5 of 7 start “I worked with Amirhossein”; six say “strongly recommend”; “Elite Athletes” heads a hobbyist; “FIP #728” will go stale. | Bold pull-out first, “Read more”, one result line each, drop the weakest. | M | Y | home-en-14 |
| 12e |  | P3 | English home | Eight nav items (“Platform”, “Library” mean little to a stranger); meta description is 211 characters; share card says “AA Performance” (nowhere on the page); no email shown though email support is sold. | Five items; description under 155; a new share card with your portrait; mailto in the footer. | S | Y | home-en-18 |

**Decision: How much do we change the English home?**

- **A. Tighten.** Same order. Smaller gaps, shorter lists, plan-aware buttons. About 15 screens. Lowest risk.
- **B. Re-sequence and condense (my pick).** Proof right after the hero, the Farsi-style phone hero on desktop, process before price, Contact folded into the footer. About 12 to 13 screens. Reuses the Farsi design you like.  ← my pick  ← **YOUR CHOICE (2026-10-02)**
- **C. Short home plus deep pages.** About 8 screens; new Programmes and About pages. Best long-term for search, most work.

### 13. The apply form: promise vs length  ·  Decided: next to build  ·  medium to large

The form is the one step every sale goes through. It asks 27 to 30 questions (18 required) over 7.8 phone screens, and the home says 2 minutes. Sleep, stress, nutrition, equipment and lifts are only needed after the call.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 13a |  | P1 | Apply EN and FA | 27 questions (29 for tennis or padel, 30 with an injury), 18 required, about 5 minutes; my estimate 2.5 min required-only. The season the hero promises is never asked. Football, cricket, weight-loss and “tone & shape” options remain though the site is for tennis and padel. | Stopgap now: “About 5 minutes” (package 10). Then the option you pick below. | M-L | Y | form-en-01, form-fa-03 |
| 13b |  | P2 | Apply form | Health consent: privacy notice 2.1 relies on explicit consent for injury data, but the form has only a 12 px grey “By submitting, you agree”; forms accept ages 10 to 80 while the notice says adults; nothing says who sees injury answers. | A real tick like the UTS form; minimum age 18 or a guardian block; “Only Amir sees my injury answers”. Not legal advice. | S-M | Y | form-en-10, privacy-03 |

**Decision: What should the form become?**

- **Now. Stopgap.** “About 5 minutes” on the home. Done in package 10.
- **A. Short apply plus a prep form.** 9 fields (plan, name, email, WhatsApp, sport and level, goal, days, pain yes/no, next event). A true 2 minutes; the rest comes after your reply in a second form (to build).
- **B. Same questions in 5 saved steps.** Feels shorter, recovers quitters. A rewrite.
- **C. One page cut to about 18 (my pick).** Everything else under “Optional: speeds up our call”. Cheapest. Move to A if the new numbers (package 9) show people quitting.  ← my pick  ← **YOUR CHOICE (2026-10-02)**

### 14. Farsi home: price, trust and length  ·  Decided: next to build  ·  medium

The Farsi home sells well, but the price has no Toman figure or payment method, the first screen shows no name, face or credential, and the same pitch repeats six times over 20.8 screens.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 14a |  | P2 | Farsi home | The Iran price is a Latin “$25” with no Toman figure and no way to pay; the English page’s intake call, performance report, 60-day promise and 48 h reply are missing; the cost question is the last FAQ. | Toman rule or figure (see decision), payment FAQ, the promise if it applies, cost FAQ near the top. | M | Y | home-fa-06 |
| 14b |  | P2 | Farsi home | The phone first screen shows no name, face or credential (brand name hidden under 560 px, trust bar about 1,630 px down, no photo of Amir). | A credential row under the buttons; smaller phone on narrow screens; coach photo in About. | M | Y | home-fa-05 |
| 14c |  | P2 | Farsi home | Only the $17 course gets a primary button; coaching gets a ghost “جزئیات ←” that jumps about 10,000 px; the “ready-made program” card argues against the course card; a coaches-only app is pushed to players in the top bar. | Pick the lead product, add “کدوم برای منه؟”, give coaching “شروع کن”. | S | Y | home-fa-07 |
| 14d |  | P2 | Farsi home | 20.8 phone screens; “personal plus weekly update” repeats six times; features, method, Library and About are 38% of the page. | Two-column feature tiles, one-line pillars, Library as a link, About merged into proof (aim about 15 screens). | M | Y | home-fa-08 |

**Decision: How do we show the price in Toman?**

- **1. Say the rule, not a number (my pick).** «به تومان، به نرخ همون روز. مبلغ دقیق رو تو پیام اولم می‌گم.» Nothing goes stale.  ← my pick  ← **YOUR CHOICE (2026-10-02)**
- **2. Show a Toman figure with a date.** More concrete, but someone must keep it current.

### 15. Farsi product pages: trust at the buy button  ·  Waiting for you  ·  medium

The course and testing pages are lean and persuasive, but near the WhatsApp buy button nothing says what happens after you send, how fast you get a reply, or what if it fails.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 15a |  | P1 | Course and testing pages | No Toman figure anywhere; near the buy button nothing says what happens next, how fast you reply, how payment works, or what if it fails; no refund line; the course FAQ opens on the upsell. | Two lines under the button (reply time, how to pay, refund if you agree); FAQ: how to pay, how long, refund, iPhone; open “می‌تونم داخلش رو ببینم؟” first. | S | Y | tennis-01, tennis-02 |
| 15b |  | P2 | Course page | Credentials and “۱۰۰۰+ بازیکن” sit at 80% scroll, after the price; no buyer quote or result. | Put “۱۰۰۰+ بازیکن · ۷+ سال” in the stats strip; a photo and one line above the price. | S | Y | tennis-03 |
| 15c |  | P2 | Course page | Level 2 (target 70%) gets a typed WhatsApp buy; levels 1 and 3 (target 30%) only a personal-programme link and nothing is stored, so those leads vanish. “Not for you” (beginner, under 13, padel, injured) lives only in the test. | A third button “وقتی سطح ۱ آماده شد خبرم کن” (typed WhatsApp message with the level); 3 “not for you if…” bullets above the price. | S | Y | tennis-05, tennis-06 |
| 15d |  | P2 | Both pages | The WhatsApp button reads like buying from WhatsApp; your number is never shown as text; the testing message lacks the academy name; the testing page offers nothing to try (its sample link shows a 404). | Number visible and left-to-right; an “ask first” link; a 45-second screen recording for testing. | S-M | Y | tennis-08, testing-01 |
| 15e |  | P2 | Both pages | Footer lacks a privacy link on the testing page though the FAQ says children’s names are stored; the privacy notice is English-only and never mentions either app. | Add the link; a short Farsi paragraph per app in the notice. | S | Y | testing-02 |
| 15f |  | P3 | Both pages | Hero kicker 2.0:1 and accent text 2.3 to 2.5:1 on the lit gradient; stat numerals 2.87:1; both share the English “AA PERFORMANCE” share card. | White kicker with clay border, drop the opacity, a Farsi 1200×630 card per product. | S-M | Y | tennis-07, shared-01 |

### 16. Proof page and the Instagram link hub  ·  Decided: next to build  ·  medium

The free habit tracker is the top of your funnel. On a phone its first screen has nothing to tap, the form starts 3.3 screens down, and the page never says it is for tennis and padel players.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 16a |  | P1 | proof.html | Nothing to tap on the first screen: “FREE · NO PAYMENT, NO CARD” looks like a button but is a span; the form starts 2,794 px down; it never says tennis or padel. | A button to #join under the lede; name the audience; logo-only header (the site nav has 9 exits). | S |  | proof-01 |
| 16b |  | P1 | proof.html | The product is never shown: about 570 words, one logo, no screenshot, no demo link, though habits.html?client=demo works. | One or two real screenshots (names hidden) and a “Try the demo” link. | M | Y | proof-02 |
| 16c |  | P2 | proof.html | Three required fields though the login goes by WhatsApp; “+98” hint so a UK number cannot be messaged; manifest.json is the coaching app (start_url /program.html); share card is the English AA PERFORMANCE image. | “WhatsApp (with country code)”, email optional, proof’s own manifest, its own share card. | S | Y | proof-06, proof-09 |
| 16d |  | P1 | links.html | Which button is for whom is only half clear (“professional coach”; “شروع کن” does not say it is a paid application; two near-identical product names). The coaching sample is 5th, the free tracker 6th at 876 px, below the fold in Instagram’s browser. | Role line = “tennis and padel” as on the home; sub-lines “فرمِ درخواست · جواب تا ۴۸ ساعت”; order: coaching and sample, course and demo, coaches’ test, tracker, site. | S | Y | links-01, links-02 |

**Decision: Who is proof.html for?**

- **1. English-speaking players (my pick for now).** Keep English, say who it is for, show the product, link the demo.  ← my pick  ← **YOUR CHOICE (2026-10-02)**
- **2. Your Iranian followers.** Then a Farsi proof-fa.html linked from the hub, and the tracker higher on it. A new page.

### 17. Partner page: the deal on the first screen  ·  Waiting for you  ·  medium

A coach reading the partner page does not see the actual deal until 857 px down, and is asked for card details before you have accepted anyone.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 17a |  | P2 | partner-fa.html | The hero says “سهمِ همیشگی” with no number; the first “۱۰٪” is 857 px down; no worked example; no button to the form 4.5 screens away; it never gives the link students use. | Hero: “۱۰٪ تخفیف برای شاگرد، ۱۰٪ پورسانت برای تو، هر پرداخت و تمدید”; example “۶ ماهه: ۲۷۰$ → ۲۷$”; button to the form; show amirardekani.com/form-fa.html with a copy button. | S | Y | partner-fa-02, partner-fa-03 |
| 17b |  | P2 | partner-fa.html | Nine first-step fields (5 required) including card number or PayPal email before you accept; no privacy link; the notice has no partner section. | Ask name, Instagram, WhatsApp, payout method; card details after acceptance; privacy link. | M | Y | partner-fa-04 |

### 18. Articles: a next step, an author, a share card  ·  Another session  ·  medium to large

On a phone an article’s Apply button is hidden until the very end, every article has the same hard-sell closing, and health advice carries no visible author. These live in the page generator, which another session is editing right now (the twin warm-up article merge).

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 18a |  | P1 | All articles | Header Apply is hidden on phones and the only CTA is at the end (first “Apply Now” at 6146 of 7407 px). Every article closes with the same hard sell; Farsi pages never mention the course, level test or WhatsApp; English never offers the demo. | Short Apply pill on phones; English: Apply plus “Try the live demo”; Farsi: level test, WhatsApp, Apply. | M | Y | article-01, article-02 |
| 18b |  | P1 | Warm-up articles | The twin warm-up articles are both live and in the sitemap, competing for one phrase. The merge is decided, not done (another session is on it). | Ship the merged tennis-warm-up, delete the old pair and its app Library row. | M | Y | article-03 |
| 18c |  | P2 | All articles | Health advice with no visible author, credentials, photo or review date; “Also in the app” sits above the first paragraph (4 lines on a phone, and opens an English app from Farsi pages). | An author block before the CTA; “Reviewed <month>”; move the app card below. | M | Y | article-09, article-04 |
| 18d |  | P2 | All articles | Every page shares one English brand card as og:image, Farsi too; four unused people-free Library pictures exist. Four of five English descriptions are cut mid-sentence; “More articles” ignores topic; four older Farsi pages miss the SEO phrase; the index promises padel but no article body mentions it. | 1200×630 card per category (your OK to reuse the art); real descriptions; related by topic; retrofit the phrase; write the padel article or soften the claim. | M | Y | article-06 to 10 |
| 18e |  | P2 | English articles | English article pages copy the Farsi pill look: four header links against the home’s seven, no WhatsApp in the footer. A third design next to the English home and the Farsi home. | Decide: look like the English home (shared nav) or keep this look. | M-L | Y | article-05 |

### 19. Your voice in the English copy  ·  Decided: next to build  ·  medium

Your own rule says an athlete should read plain words that sound like you typed them. The English home has 43 em-dashes, 8 “X, Y and Z” lists and 24.7-word sentences; it reads at 34 out of 100 (difficult). Forms, proof, privacy and the article closing do the same.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 19a |  | P3 | English home, forms, proof, privacy, articles | Em-dashes: home 43, form 26, proof 12, privacy 36; “Not a PDF. An Experience.”; “from one of the world’s leading programmes” (no university named); “Client Intake Form” is internal jargon (buttons say Apply). Farsi: 22 dashes, 6 semicolons, “X، Y و Z” lines. | I write two plain options for each key line; you pick or change; the rest follows the same rule. Keep what already sounds like you: “We adapt.” “Nothing without a reason.” | M | Y | home-en-17, form-en-14, proof-08, article-15, home-fa-16 |

**Decision: Example: the same idea, three ways**

- **Now. Today.** “Not a generic fitness plan repackaged for racket sports. This is strength & conditioning designed from the ground up for the movement demands of tennis and padel — the accelerations, the decelerations, the repeated sprints, the rotational force production.”
- **1. Option 1.** “This is not a gym plan with a racket added. I build it around how you move on court: fast starts, hard stops, long rallies, big rotation.”  ← my pick  ← **YOUR CHOICE (2026-10-02)**
- **2. Option 2.** “I write your plan for tennis and padel only. Quick starts, hard stops, long points. That is what we train.”

### 20. Legal accuracy (needs facts from you)  ·  Waiting for you  ·  medium

The privacy notice is detailed, but it lags what the site and your tools actually do. This is a list of differences to confirm, not legal advice.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 20a |  | P1 | privacy.html | 15,000 px (17.8 screens), 3,790 words, no summary or contents; analytics and fonts start 13 screens down. | A 7-line “Short version”, a jump list, ids on headings, <details> for the long sections; 16 px text and a 680 px column. | M | Y | privacy-01 |
| 20b |  | P1 | privacy.html | Flows the notice never states: call-log.html builds prompts with athlete names and wellbeing notes to paste into AI chats; Gmail keeps every form email; the Supabase SDK loads from jsDelivr; backups outlive “delete on request”; “EU region, London” (London is UK). | A “My own tools” paragraph, a retention line, “London, UK”. Needs your facts. | S | Y | privacy-02 |
| 20c |  | P1 | Both apply forms | Farsi applicants are sent to an English-only notice (also terms-fa and the course page). | A one-screen Farsi summary linked from those three places. | M | Y | privacy-04 |
| 20d |  | P2 | terms.html | Dated 19 April; sections 4 and 5 describe the retired ?client= link; nothing on the free tracker, board, partner courses or the $17 Farsi course though /tennis/ sends buyers here; section 7 cites a coaching agreement that I could not find; the Farsi copy mixes «شما» and «تو». | Rewrite 4 and 5 for the login, add the missing products and refunds, date both pages. | M | Y | terms-en-01 |
| 20e |  | P1 | uts-padel.html | Never says how to join or what it costs (the flyer says “Book at The UTS, 0151 632 6409”); an unbooked visitor could give 8 minutes of health data for a place they do not have. | After the lede and in the form intro: “Booked? This form is for you. Not booked? Ask the UTS team or call 0151 632 6409. £120 for 12 sessions, 8 places.” UTS may need to approve. | S | Y | uts-01 |


## Foundations

Makes every later fix cheaper and stops problems coming back.

### 21. One brand CSS file and shared chrome  ·  Queued  ·  large

Every page re-declares your colours. The English pages use one set of names and the Farsi pages another; six to nine different breakpoints; three different navs (shared English, Farsi own, the generated articles’ third). So a fix often has to be made five times.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 21a |  | P3 | Whole site | Two colour vocabularies for the same palette (--clay / --accent-2, --paper / --bg, --ink / --text-primary …), 48 KB of inline CSS on each home, breakpoints 480 to 1000 px in nine places. | A brand.css defining both vocabularies as aliases; one nav and footer for Farsi and article pages; shared type scale. | L |  | static scan, article-05 |

### 22. A style guard so it stays fixed  ·  Done  ·  medium

A small check that runs when you commit and says no if a change brings back yellow, text under 12 px, a pale grey, or letter-spacing on Farsi.

**Still open.** Done on 2026-10-02: it stops the commit (your answer). scripts/check_site_style.py runs from .githooks/pre-commit on the public pages and their shared CSS. It is a ratchet: scripts/site_style_baseline.json holds what existed (the drawn mini app, the Etminan amber and small labels, the UTS fonts) and only an ADDED one blocks; /* style-ok */ on a line marks a deliberate exception; after removing old ones run the script with --update. Its first run found real leftovers (form and proof labels under 12 px, the Farsi form, partner and terms pages still in the pale grey, a slider hanging off a 320 px screen) and they are fixed.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 22a | ✓ | P3 | Pre-commit | Nothing stops regressions: the no-gold rule, the 12 px floor, the grey token, Farsi letter-spacing and Google font links are checked only by people. | scripts/check_site_style.py in .githooks/pre-commit, same pattern as the existing guards. | M |  | static scan |

### 23. Can Iran reach the forms, Plausible and the demo?  ·  Waiting for you  ·  small

Three things your Farsi funnel depends on have never been tested from Iran: sending a form, Plausible, and the demo. If they fail, a visitor there cannot apply or be counted.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 23a |  | P2 | Farsi funnel | /reach/ tests the fonts but not api.web3forms.com, plausible.io or the Supabase address. One Web3Forms key serves 9 pages. | Add those three to /reach/; ask two or three Iranian athletes to run it with the VPN off; record the result in this file. | S | Y | form-fa, tennis-09, funnel cross-page |

### 24. Re-run the audit after each batch  ·  Queued  ·  small

The scoreboard at the top is the baseline. After each batch I re-run the same measurements and report the difference.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 24a |  | P3 | Process | No before and after. | python scripts/site_audit/scoreboard.py against the baseline numbers in this file. | S |  |  |


## Next

Same method, different target.

### 25. The apps  ·  Queued  ·  large

program.html (athletes), habits.html (AA Proof) and coach.html (your dashboard) get the same pass once the website is done.

| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |
|---|---|---|---|---|---|---|---|---|
| 25a |  | P3 | Apps | Not reviewed yet. They have their own audit (Fresh Eyes) and rules; this pass would only add what the website tools can measure. | Start with the athlete app’s first-run and Home on a phone. | L |  |  |

## Questions only Amir can answer

1. How and when does a client pay, and does the 60-day promise mean a rebuilt plan only, or money back? The home, the form and the terms must say the same thing.
2. Has anyone in Iran opened the demo, the apply form and Plausible with the VPN off? I cannot test from here. (package 23)
3. Is the apply form now only for tennis and padel players? If yes, I remove football, cricket, weight-loss and “tone & shape” and ask the next event date.
4. Is the app staying English-only? The Farsi copy says “message me in the app”. (package 5)
5. Is the UTS page ever sent to people who have not booked? (package 20)
6. Facts for the privacy notice: do you paste athlete names into AI chats, and is there a written coaching agreement (terms section 7)? (package 20)
7. May the first screen show your photo and three athletes, and may the Library’s category pictures be reused as article thumbnails and share cards?
8. Where did you see “claude-design-skills”? Several repos use the name; a link would pin it down.
9. Your part, 5 minutes: in Plausible add Custom-event goals named Apply Click, WhatsApp Click, Demo Click, Hub Click, Form Started, Form Step, Level test start, Proof Signup, Partner Application and 404, then add the properties plan, where, page, which, to, step and lang (Site settings, Custom properties). Until then the counts exist but are not shown.
10. Your part, when you can: ask two or three Iranian athletes to open amirardekani.com/reach/ once with the VPN off and once on, and send you the line it prints. It now also tests the apply-form endpoint (W3) and Plausible (PL). (package 23)

## Tools: what we used, what we skip

Research of 2026-10-02 (stars and dates verified on the repo pages; full notes in `Content/site-audit/research-*.md`).

| Tool | Source | What it does | Verdict | How we use it |
|---|---|---|---|---|
| frontend-design-audit | mistyhx · 91★ · MIT | 15 usability principles, severity 0 to 4, strengths and quick wins. | Real, safe. Method adopted. | Its 15 principles and 0 to 4 scale are in the review rubric. Not installed: by default it edits code (only its :evaluate mode is report-only). |
| frontend-visual-qa | daymade · MIT | A screenshot-first audit that never changes code. | Real, safe. Rule adopted. | “A screenshot you never opened is not evidence” shaped the capture (one false alarm of mine was caught that way). The same Playwright pipeline already runs here, so not installed. |
| ui-ux-audit | two old skills; the plugin ux-ui-audit by UXBYISSA | Measured contrast, tap targets, Hick and Fitts, right-to-left and parity probes. | The plugin is real and read-only; the two skills of that name are not worth it. | I built equivalent probes tuned for Farsi: its right-to-left engine is Arabic-specific and misses Persian digits. Optional install for the app review. |
| claude-design-skills | ambiguous | Several repos use the name. Most likely Carlos Cuellar’s design-skills plugin (93★, MIT). | Overlaps the design plugin you already have enabled. | Not needed. Tell me where you saw it. |
| ux-designer | szilu · 72★ · MIT | Advice-only UX reference: forms, right-to-left, mobile, ethics. | Real, safe. | Its form and mobile guidance informed the reviewers’ briefs. Optional install. |
| Impeccable detect | pbakaus · 74k★ · Apache-2.0 | 61 deterministic checks (touch targets, line length, skipped headings, “AI slop”), no AI, no key. | The most popular real auditor. | I would run `npx impeccable detect` on the live pages as a cross-check (needs your OK). Never its install command, which writes hooks into your settings. |
| Lighthouse and axe-core | Google · 31k★; Deque · 7.6k★ | The standard speed, SEO and accessibility scorecards. | Trusted, ubiquitous. | Cross-check for my own measurements and a number you can recognise (needs your OK to install in a scratch folder). |
| Playwright | Microsoft · installed | Real-browser automation. | Already on your PC. | Runs everything in this review. |
| web-quality-skills, marketingskills cro | Addy Osmani 2.9k★; Corey Haines 52k★ | Markdown playbooks for performance, accessibility, SEO and conversion. | Safe to read. | Adopted as lenses, not installed. |
| ui-ux-pro-max | 132k★ | Generates designs from style libraries. | Popular, but it generates; it does not audit. | Skipped. Its design-system file would fight your clay-only brand rules. |

## Files

- `scripts/site_audit/` the measuring tools, `backlog.py` (this file’s source) and `build_report.py`.
- `Content/site-audit/review-*.md` the seven page reviews with file and line references; `research-*.md` the tool research; `baseline-scoreboard.txt` (morning) and `after-scoreboard-2026-10-02.txt` (afternoon, after the first batches). Add a new dated after-scoreboard each time the audit is re-run.
- The private report page (claude.ai artifact “Front Door”) is the reading version with pictures; rebuild it with `--html`.
