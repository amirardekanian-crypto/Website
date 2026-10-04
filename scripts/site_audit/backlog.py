# -*- coding: utf-8 -*-
"""The website audit backlog: ONE source for Content/SITE-AUDIT.md and the private report page.
Edit this file (statuses!) and run:  python scripts/site_audit/build_report.py
Item tuple: (sev, pages, what is wrong, the fix, effort S/M/L, call 'Y' = his design/copy/business call, source ids)
Package status: next = being built now | todo | ask = waiting for his answer or OK | other = another session owns it | done
"""

DATE = '2026-10-02'

PHASES = [
    ('now', 'Fix now', 'Objective problems with a known fix. I build and ship these one by one, and tell you what changed.'),
    ('call', 'Your call', 'A design, copy or business choice. I mark my pick, you say yes, no or change it.'),
    ('base', 'Foundations', 'Makes every later fix cheaper and stops problems coming back.'),
    ('next', 'Next', 'Same method, different target.'),
]

AFTER_NOTE = 'live site, 2026-10-02 afternoon'

SCORECARD = [
    # measure, baseline (2026-10-02, morning), now (same tools, after the first batches), goal
    ('Phone length, English home', '20.4 screens', '14.4 screens (desktop 14.5 to 12.9)', '13 or fewer'),
    ('Phone length, Farsi home', '20.8 screens', '20.9 screens (unchanged: package 14)', '15 or fewer'),
    ('Text under 12 px, English home', '65 items', '22 (all inside the miniature app drawn in the phone picture)', '0'),
    ('Tap targets under 44 px, English home', '15', '1 (the drawn mini app, which is not tappable)', '0'),
    ('Tap targets under 44 px, apply form (English)', '13', '2 (the two sliders: the thumb is the target)', '0'),
    ('Blank screen if Google Fonts hangs (Farsi home)', '8.3 s', '0.15 s (the Farsi link page: from nothing for 6 s to under 0.3 s)', 'under 1 s'),
    ('Layout jump on a slow phone', '0.096 home, 0.087 form, 0.209 Etminan Farsi', '0.000 home, 0.001 form, 0.028 Etminan Farsi, 0.006 on the 404 (was 0.087)', 'under 0.05'),
    ('First paint on a slow phone, Farsi pages', 'home 1.9 s, form 1.5 s, links 1.2 s', 'home 1.1 s, form 0.9 s, links 0.7 s', 'under 1.5 s'),
    ('Etminan pages: text under 12 px', '26 per page', '0', '0'),
    ('English home reading ease', '34 of 100, 43 em-dashes', 'rewritten in plain words: the only em-dashes left are inside the athletes’ own quotes (13); the reading-ease number is not re-measured', '60 or more, none'),
    ('Apply form: promise vs reality', '“2 minutes” vs about 5, 27 to 30 questions, 18 required', 'English: 13 required, about 15 optional ones folded away, both say about 3 minutes; Farsi: 12 required (package 13, option C)', 'true, and shorter'),
    ('Apply form length on a phone (English)', '8.0 screens', '5.7 screens with the optional group closed', 'about 5'),
    ('“Sent” screens that are a dead end', '4 forms', '0 (each has a WhatsApp next step and a way back)', '0'),
    ('Pricing buttons that open the form', '0 of 3 (they jump to the page bottom)', '3 of 3, plan chosen', '3 of 3, plan chosen'),
    ('Key clicks you can see in Plausible', 'none (only form submits and level-test results)', 'Apply (with plan and place), WhatsApp, demo, link hub, form started and each step, proof, partner, level-test start. Add the goals in Plausible to see them.', 'Apply, WhatsApp, demo, proof, partner, form steps'),
    ('A wrong web address shows', 'GitHub’s grey English page', 'your own page, English and Farsi', 'your own page, English and Farsi'),
    ('Athlete photos on the homes', '713 KB, no sizes', '433 KB, with sizes, loaded as you scroll', 'light, sized'),
    ('Marketing pages that ask Google for fonts', '19 pages', '5 kinds left: the generated articles, the UTS page, the Divehi Etminan page and the two apps (the 14 pages that matter make no Google request; checked in a real browser)', 'none'),
    ('White text on clay buttons, badges and chips passing AA (4.5:1)', '0 of 25 (4.40:1)', '25 of 25 (4.66:1)', 'all'),
    ('Text under 12 px, apply form and proof page', '15 on the form, 4 on proof', '0 (the style guard now stops a new one)', '0'),
    ('Pale grey (#8A8A8A) as text on the Farsi form, partner and terms pages', '14 uses', '0', '0'),
]

KEEP = [
    'The brand is disciplined. No yellow or gold on any core page. Green, clay and paper everywhere.',
    'Fast and light. The English home loads in about half a second; every page is under 2.5 s on a simulated slow phone; no console errors; no sideways scrolling from 320 to 1920 px; all 30 internal links work.',
    'Honest selling. “Built for you if / not the right fit if”, the no-sign-up live demo, the 60-day promise, “An app gives you a workout. I give you a coach.”',
    'Safe form plumbing. Saved to the database and emailed in parallel, success if either lands; a typed discount code is never lost; every section says why it asks.',
    'Farsi craft is mostly right. Vazirmatn at 17 to 23 px, warm voice, Persian digits, no Arabic letters, no letter-spacing on the main pages. The course page is lean and its level test is an honest gate.',
    'Article pages read well (19 px at 1.8 leading), carry correct hreflang and structured data, and have a visible language pill.',
    'The UTS form (six steps, honest under-18 path), the partner terms (plain and fair) and the privacy notice’s detail (it names every processor).',
]

# n, phase, title, plain words, effort, status, items, decision (optional)
PK = [
 dict(n=1, phase='now', status='done', done='abcde', left='Done on 2026-10-02 with your yes: every white-on-clay fill is #C2512C (4.66:1; token --accent-2-fill, --clay-fill on the Farsi pages), 25 of 25 measured; lines, glows, dots and clay text keep #C7552F. The 22 labels still under 12 px on the English home are the miniature app drawn inside the phone picture. The apply form and proof page labels (10 to 11 px) were found by the style guard and raised to 12.', effort='S-M', title='Make small text readable',
  plain='One grey in your colour list is too pale for small text, and 65 labels on the English home are smaller than 12 px. One value change in the shared colour file fixes most pages at once.',
  items=[
   ('P1', 'All English pages, 3 Farsi pages', 'The muted grey #8A8A8A is 3.2:1 on paper and 3.45:1 on white (AA needs 4.5). The paler #B0A99E is 2.0:1.', 'tokens.css lines 33 and 80: --text-muted to #6B6B6B (about 5:1); never use --text-dim for text; same for the local greys in partner-fa, form-fa, terms-fa.', 'S', 'N', 'home-en-11, form-en-13, links-03'),
   ('P2', 'English home, form, proof, Etminan', '64 text items under 12 px (mono, 2 to 3 px letter-spacing), 15 on the form, 26 on Etminan; 52 of 65 body blocks are weight 300 at 15 px or less.', 'Floor of 12 px for labels, tighter tracking, body weight 400 for small text (index.html about 20 rules, form.html 4, proof 2, components.css and base.css 2 each).', 'M', 'N', 'home-en-11, etminan-en-01'),
   ('P1', 'English home', 'Clay on the green hero fails badly: kicker 1.8:1, “Elite Athletes” 2.0, “An Experience.” 1.6, the Match key line 3.2, the INCLUDED badge 2.6, the closing note about 3:1.', 'Small labels on green in paper or cream with a clay dot; big clay words only where the green is dark. Keeps the look, fixes the reading.', 'S', 'Y', 'home-en-07, home-fa-10, tennis-07'),
   ('P2', 'Everywhere clay text is small', 'Small clay text on light is 4.1:1 and white-on-clay buttons are 4.4:1, both just under AA.', 'A text-only deeper clay (#B84A27, 4.9:1; the app already does this with --clay-ink) and bold 14 px or larger on buttons. A hairline colour shift, easy to revert.', 'S', 'Y', 'article-11, home-fa-10'),
   ('P1', 'English home, nav, dark sections', 'The keyboard focus ring is dark green, so it vanishes on every dark area (nav, hero buttons, demo, final CTA). The testimonial scroller is an unnamed tab stop.', 'base.css line 216: white outline inside .hero, .sec--dark, .site-nav; aria-label on the scroller.', 'S', 'N', 'home-en-06'),
  ]),
 dict(n=2, phase='now', status='done', done='abc', left='Left on purpose: the two sliders in the apply form (the thumb is the target, not the 6 px bar) and the drawn mini app on the home. Not done: the shorter header on the apply form and the "5 of 18 required" count.', effort='S', title='Tappable and zoom-safe on a phone',
  plain='On an iPhone, a text box smaller than 16 px makes the whole page zoom in when you tap it. Footer links are 19 px tall. Both are quick fixes.',
  items=[
   ('P1', 'Both apply forms, proof, partner, UTS, Etminan', 'Inputs are 14 to 15 px, so iPhone Safari and Instagram’s browser zoom the page at every field.', 'font-size: 16px on input, select, textarea.', 'S', 'N', 'form-en-03'),
   ('P2', 'Every page', 'Tap targets under 44 px: footer links 19 px (shared partial and Farsi footers), menu button 40 px, inline demo links about 30 px, the level test’s back link 23 px.', 'Pad them to 44 px (partials/footer.html and components.css, fa-product.css, level-test).', 'S', 'N', 'home-en-11, shared-02, home-fa-17, article-14'),
   ('P2', 'Both apply forms', 'The nav plus progress bar cover 113 px of the phone (about a quarter with the keyboard up) and nothing keeps the focused field clear of them.', 'html { scroll-padding-top: 130px }, a slimmer bar on phones, count “5 of 18 required”.', 'S', 'N', 'form-en-06'),
  ]),
 dict(n=3, phase='now', status='done', done='abcd', effort='M', title='Menus and sticky bars that work on every phone',
  plain='On a shorter phone the open English menu runs over the logo and hides the Apply button. The Apply bar at the bottom shows twice on the first screen and keeps pulsing.',
  items=[
   ('P1', 'English pages (shared nav)', 'On 375×667 the open menu paints “Results” over the logo, Apply is off-screen, “فارسی” hides under the bar, the panel cannot scroll, and the icon never becomes ✕. At 901 to 990 px the header Apply is cut (“APPLY NO”).', 'components.css 119 to 134: top-align, overflow-y: auto; shared.js 118: swap to ✕; hide the sticky bar while the menu is open; hamburger breakpoint 900 to 1040.', 'M', 'N', 'home-en-04'),
   ('P2', 'English home', 'The same “Apply Now” shows twice on the first screen and again at the final CTA; header plus bar cover 17% of a phone; the bar’s spoken name (“Apply for the programme”) does not contain its visible words; it pulses forever; iPad portrait gets neither bar nor header Apply.', 'Show the bar only after the hero button scrolls out and hide it at the final CTA; drop the aria-label; no endless pulse.', 'S', 'N', 'home-en-13'),
   ('P2', 'English home', 'At 360 px (a common Android) the ball covers the kicker, the headline wraps to 5 lines and the hero Apply slides under the bar.', 'index.html line 273: clamp(46px, 15vw, 60px) under 480 px; move the ball.', 'S', 'N', 'home-en-12'),
   ('P3', 'English home', 'The big outlined 01–08 section numbers are clipped at the right edge and the 01–03 inside the How-it-works cards sit on top of the first line of text; two numbering systems on one page.', 'Hide the ghost numbers under 900 px; keep one numbering.', 'S', 'N', 'home-en-18'),
  ]),
 dict(n=4, phase='now', status='done', done='abce', left='Not done: 4d (the two "Step inside" cards, which go to the demo home; its deep links open a safety card first) and 4f (the underline and glow colours, a look decision).', effort='M', title='Home-page bugs',
  plain='The three Apply buttons in the pricing cards do not open the form: they scroll to the bottom of the page. The testimonial arrows go the wrong way. Content stays invisible if the menu file loads slowly.',
  items=[
   ('P1', 'English home', 'The three pricing “Apply Now” buttons jump to #apply (page bottom), not the form, and lose the plan: a Match tap scrolls 9,820 px and needs a second tap.', 'index.html 1229, 1243, 1261 to /form.html?plan=match (and game, set), label “Apply for Match”; form.html pre-ticks the plan and reads ?programme= and ?code=.', 'S', 'N', 'home-en-01, form-en-05'),
   ('P1', 'English and Farsi homes', 'Testimonial arrows are swapped (English: > goes back; > on card 1 jumps to card 7). Auto-scroll is dead on 90 and 120 Hz phones and cannot be paused. Farsi rail is forced left-to-right: first card on the wrong side, the “previous” arrow jumps to the last card.', 'Swap handlers, delete auto-scroll (index.html 1691 to 1752), 44 px dark arrows. Farsi: a real RTL snap rail.', 'S-M', 'N', 'home-en-05, home-fa-09'),
   ('P1', 'English home and every page using shared.js', 'All 67 .reveal blocks stay invisible until JavaScript has fetched the nav and footer. With the file stalled, only the headline shows; with JavaScript off, same.', 'shared.js 336 to 344: start reveal first; a noscript rule.', 'S', 'N', 'home-en-16'),
   ('P2', 'English home', 'Both “Step inside” cards open the same demo home, not Sessions or the Playbook.', 'Point each at a sample ?workout= and ?article=.', 'S', 'N', 'home-en-15'),
   ('P3', 'English home', '22 endless animations (58 playing at once). The headline pulses every 3.2 seconds forever, which is also a WCAG 2.2.2 fail for moving content.', 'Keep the entrance; run the pulse three times then stop; pause the ambient ones off-screen. Your “alive” look stays.', 'S', 'Y', 'home-en-16'),
   ('P3', 'English home', 'The underline under “LAST LONGER.” is clay at 32% over green, which reads as a muddy olive bar; the clay glow turns brown near the hero bottom and the final CTA.', 'A clean full-colour underline or none; a darker base under the glow.', 'S', 'Y', 'home-en-07'),
  ]),
 dict(n=5, phase='now', status='done', done='abcef', left='5d is half done on 2026-10-02, after you said the app is English with no chat: the Farsi home now says you message me on WhatsApp (not in the app) and has a new FAQ “اپ انگلیسیه؟”. Not done: the demo banner’s Apply and Exit still go to the English pages (that is in program.html, which is its own session) and the footer privacy link is still the English notice (package 20c).', effort='M', title='Farsi correctness',
  plain='The phone picture in the Farsi hero shows a greeting and exercise names in white on white. Phone numbers typed in the Farsi form show backwards. Several small right-to-left details are off.',
  items=[
   ('P1', 'Farsi home', 'In the hero phone the greeting and both exercise names are white on white (only “۶×۴” shows); “امروز” is letter-spaced; screen readers read the mock as page text.', '.pscreen { color: var(--ink) } (index-fa.html line 159), remove the spacing, aria-hidden on .phone-wrap.', 'S', 'N', 'home-fa-04'),
   ('P1', 'Farsi apply form, coach.html', 'Contact, email and the counter have no dir="ltr": a typed +98 912 345 6789 shows as “6789 345 912 98+”, the counter reads “۲۷ / ۳”. Persian digits are dropped by Age and by the dashboard’s WhatsApp-link builder, so such a number gets no link at all.', 'dir="ltr" on #contact, #em, #pCount; convert Persian digits to 0 to 9 and 09… to +989… on send; same normaliser in coach.html waLink() (line 4719).', 'S', 'N', 'form-fa-01, form-en-09'),
   ('P2', 'Farsi home and products', 'Method arrows point right in a right-to-left flow; the Instagram handle shows “amirardekanian@”; a middle dot before a digit reads as a zero (“تنیس · ۴ سال” looks like 40 years); Farsi numbers in Barlow Condensed fall back to a serif; about 48 verbs lack the half-space (میشه, میاد); footers show Latin “2026”; heading highlight leaves stray squares.', 'Mirror arrows, <bdi dir="ltr"> on the handle, use “،” not “·”, --disp stack with Vazirmatn, add ZWNJ, Persian year, underline via box-decoration-break.', 'S', 'N', 'home-fa-11 to 16, shared-03'),
   ('P1', 'Farsi home, demo, footers', 'Farsi pages send visitors into English: the demo’s banner (Apply → /form.html, Exit → /), the footer privacy link; and the copy says “message me in the app” though the app is English with no chat (it opens WhatsApp).', 'Reword lines 641 and 647; ?from=fa on demo links so the banner uses the Farsi pages; a FAQ “اپ انگلیسیه؟”. Needs your word on the app.', 'M', 'Y', 'home-fa-03, privacy-04'),
   ('P2', 'Etminan pages', '19 Farsi labels use the mono font with letter-spacing at 9.5 to 11 px, which breaks Farsi joining; in right-to-left the lime ticker is off-screen in 7 of 12 samples.', 'One override block at the end of etminan.html: Vazirmatn, no spacing, 12 px; ticker direction ltr.', 'S', 'N', 'etminan-fa-02, etminan-en-02'),
   ('P3', 'Farsi pages', 'No <main> or skip link on the Farsi home, form, links, partner and product pages; the H1 text runs together (“پدلیه مربی،تو”).', 'Add <main>, a skip link, spaces in the H1.', 'S', 'N', 'home-fa-17, form-fa-02'),
  ]),
 dict(n=6, phase='now', status='done', done='abcd', left='6c done on 2026-10-02 with your yes: Barlow, Barlow Condensed, JetBrains Mono and DM Sans (latin subset, 369 KB, 16 files, licences in assets/fonts/LICENSES.txt) are served from your site, 14 pages make no request to Google, and the privacy notice says which pages still do. Still on Google Fonts: the generated article pages (the page generator belongs to another session), the UTS page (its own brand and session), the Divehi Etminan page, and the athlete and coach apps. The UTS page is also why 6d (its hero photo) is still open.', effort='S-M', title='Fonts: no blank screens, no jumps',
  plain='The Farsi pages wait for Google Fonts before they paint anything. If that request hangs, which is how filtered networks often fail, the screen stays white for about 8 seconds. Your Vazirmatn file is already on your own server and is not being used on those pages.',
  items=[
   ('P1', 'Farsi home, form, links, partner, terms, Etminan, articles', 'First paint waits for the Google Fonts stylesheet: 0.58 s normally, 0.25 s if blocked outright, but 8.3 s when the request hangs.', 'Use the self-hosted /assets/fonts/Vazirmatn-Variable.woff2 (@font-face as fa-product.css line 7, plus a preload); load Barlow without blocking; add Tahoma to the stack. No download needed.', 'S', 'N', 'home-fa-01, article-12, etminan-fa-01'),
   ('P1', 'English home, form, Etminan', 'Late fonts make the page jump: English home 0.096 (the hero shifts 73 px), form 0.087, Etminan Farsi 0.209. In a test, self-hosting took Etminan to 0.0002.', 'Same fix, plus preload for the two heading faces and a metric-matched fallback.', 'S-M', 'N', 'etminan-fa-01, home-en-16'),
   ('P2', 'All English pages', 'Barlow, Barlow Condensed, JetBrains Mono and DM Sans still come from Google (19 pages send the visitor’s IP there; your privacy notice admits it).', 'Self-host the four families (open-licence, about 600 KB). Needs your OK to download them.', 'M', 'N', 'secondary cross-page'),
   ('P3', 'English and Farsi homes, UTS', 'Seven photos (about 710 KB) load immediately with no width or height; the UTS hero photo is requested late (LCP 2.1 s; a test got 0.7 to 1.5 s).', 'loading="lazy", width and height, 720 px copies; preload the UTS hero (UTS page: coordinate with its session).', 'S', 'N', 'home-en-16, uts-02, home-fa-18'),
  ]),
 dict(n=7, phase='now', status='done', done='abdef', left='Waiting for you: 7c (keep a draft of the apply form in the browser, and whether to save name and WhatsApp after section 1) and 7g (a "Not sure yet" plan and a "Have a code?" link). Not done from 7f: validating on blur and marking "(optional)".', effort='M', title='Forms that finish properly',
  plain='After someone presses Send, four forms end on a screen with nothing to tap. Nothing is saved until the last tap. The partner form lets a blank form through.',
  items=[
   ('P1', 'Apply EN and FA, proof, partner', 'The success screen is a dead end: no link, no word on how or when you reply, focus stays behind it; proof does not echo the number so a typo goes unseen.', '“Message Amir on WhatsApp” (pre-filled with name and plan) and “Back to site”; say when you reply; focus the dialog; role="status".', 'M', 'N', 'form-en-04, proof-05, partner-fa-05'),
   ('P1', 'All forms', 'Submit waits with no timeout; a bare alert() (in-app browsers can swallow it); partner-fa never checks required fields (novalidate); proof falls through to form.submit() and drops the visitor on Web3Forms’ page; one Web3Forms key serves 9 pages.', '10 s timeout, inline errors with aria-live, succeed if either channel lands, reportValidity() on partner, no form.submit() fallback.', 'M', 'N', 'form-en-04, partner-fa-01, proof-06'),
   ('P1', 'Apply form', 'Nothing is saved until the last tap: a reload took 5 of 29 answers back to zero, and you never learn who quit at question 12.', 'Save a draft in the browser; later save name and WhatsApp after section 1 (with a notice, your call).', 'S-M', 'Y', 'form-en-02'),
   ('P2', 'Farsi apply form', 'Pills and radio cards show nothing on keyboard focus (no :focus-visible rules).', 'Copy the English form’s focus rules (form.html lines 287, 331).', 'S', 'N', 'form-fa-02'),
   ('P2', 'Apply forms, level test', 'Tab on a slider records the default (sleep 7, stress 5) as an answer; the level test’s double-tap answers the next question unseen (verified at 150 to 400 ms).', 'Commit sliders only on input; ignore taps for 400 ms after an answer (level-test.js 128 to 140).', 'S', 'N', 'form-en-07, tennis-04'),
   ('P2', 'Forms', 'Smaller faults: the last field of a pair has no bottom margin so labels touch the field above; Farsi selects show two chevrons; Farsi submit text renders in Arial; proof’s consent line renders 16.5 px with no gap (a CSS clash); 10 radio groups have no group name; errors say only “Please answer this question”.', 'Margin rule, appearance:none, font-family, .p-form-sec .p-small, fieldset and legend, validate on blur with specific messages, mark “(optional)”.', 'M', 'N', 'form-en-08, form-en-12, proof-09, partner-fa-06'),
   ('P2', 'Apply form', 'The first question is a required plan pick with no “what is included” and no “Not sure yet”; a coupon box sits above the name.', '“Not sure yet”, an “all plans include” line, the code behind “Have a code?”, show the discounted price.', 'S-M', 'Y', 'form-en-05'),
  ]),
 dict(n=8, phase='now', status='done', done='a', effort='S', title='A real 404 page',
  plain='A wrong or old web address shows GitHub’s grey English page, cut off on a phone, written for the site owner. Two drafts exist (the brand one and a working one); I will merge them.',
  items=[
   ('P1', 'Whole site', '/apply, /about, /faq, /blog, /en/ and /fa/ all show GitHub’s default 404: English only, no brand, no way home, no viewport tag so phones shrink it to about 40%.', 'Add a root 404.html: “OUT.” line-call joke, English and Farsi blocks (Farsi first for Farsi links), Home / Apply / Articles / Free tracker / Open your programme, WhatsApp with the broken path, a Plausible “404” event. Absolute paths, noindex, no canonical.', 'S', 'Y', 'notfound-01'),
  ]),
 dict(n=9, phase='now', status='done', done='a', left='Your part: add the goals in Plausible (Site settings, Goals, Custom event). The names and properties are listed at the top of assets/js/track.js. The generated article pages are not counted yet (their generator belongs to another session).', effort='S-M', title='Count what matters',
  plain='Plausible sees page views, the two apply-form submits, the level-test result and the UTS and Etminan forms. It cannot tell you which button, page or article sells. A few lines of code fix that; you then switch the goals on in Plausible.',
  items=[
   ('P2', 'Every page', 'Not measured: Apply clicks (and which plan), WhatsApp clicks, demo clicks, level-test start and result buttons, proof signup, partner submit, form started or abandoned, 404s. partner-fa and terms-fa have no Plausible at all.', 'One delegated click handler in shared.js and fa-nav.js, events on the proof and partner success, form-step events; list the goal names for you to add.', 'S-M', 'N', 'tennis-09, proof-07, form-en-02'),
  ]),
 dict(n=10, phase='now', status='ask', done='ad', left='10a and 10d are done: the home and the forms say about 3 minutes, and the 60-day promise is gone because there is none (2026-10-02). Still yours: 10b the free tracker promises and 10c the Farsi form note (now «فرم ۳ دقیقه‌ست · تا ۴۸ ساعت جواب می‌دم»). (Old note: Only the number is fixed (home: "about 5 minutes"). The rest needs your words: 10b the free tracker promises, 10c the Farsi form note, 10d the 60-day promise.)', effort='S', title='Promises that match reality',
  plain='The home says the application takes 2 minutes. The form says about 5 and asks 27 to 30 questions. The proof page promises a private link that no longer exists.',
  items=[
   ('P1', 'English home', '“Application takes 2 minutes” is wrong (the form’s own badge says ~5 min; 8 sections), and it is the only reassurance, in 10 px at the end.', '“About 5 minutes” now (the real fix is package 13); repeat under the hero and sticky buttons. “You pay nothing until we speak” only once you confirm it.', 'S', 'Y', 'home-en-03, form-en-01'),
   ('P2', 'proof.html', 'Two stale promises: “get your link / private link” (links died on 7 Sep: it is a login now) and “eight to start with, switch off anything” (steps, sleep, food and water are always on).', '“Send me my login”; “Four are always on. The rest are optional.”', 'S', 'Y', 'proof-04'),
   ('P2', 'Farsi home', 'Six buttons say “شروع کن” and open a 5-minute, 27-step form without saying so.', '“فرم ۵ دقیقه‌ست · تا ۴۸ ساعت جواب می‌دم” under the buttons; the abroad link points at the DM.', 'S', 'Y', 'home-fa-02'),
   ('P2', 'English home', 'The 60-day promise is the quietest box (dashed, 14 px grey) and vague: a rebuilt plan, not a refund. Nothing says how or when you pay.', 'Move it under the cards at 18 px with one plain line. Needs your facts.', 'S', 'Y', 'home-en-09'),
  ]),
 dict(n=11, phase='now', status='done', done='a', left='Waiting for you: 11b, the amber on the Etminan pages (their co-brand look).', effort='S', title='No-yellow cleanup',
  plain='Your own rule is no yellow or gold anywhere. A few emoji break it.',
  items=[
   ('P2', 'Apply form, level test', 'The plan cards show 🟡 for Set and University and 🟢🟡🔴 radios; the level test’s ⚠️ draws a yellow triangle; emoji also differ per phone (the Iran flag shows “IR” on Windows).', 'Plain text cards or small green and clay SVG marks (form.html 596, 715, 719; level-test.js 159).', 'S', 'N', 'form-en-11, shared-03'),
   ('P3', 'Etminan pages', 'Amber #E08A2E in four places. The reviewer found the neon green and lime are a deliberate co-brand (CSS comment), the amber is the odd one out.', 'Amber to clay or neutral. Their palette, so your call.', 'S', 'Y', 'etminan-en-02'),
  ]),

 dict(n=12, phase='call', status='done', done='abce', left='Built on 2026-10-04 (option B). Order: proof, how it works, programmes, fit check, the app, sessions and playbook, about, FAQ, apply. Not done: 12d’s bold pull-out, one result line each and dropping the weakest testimonial (your call; the quotes are untouched, a phone shows 7 lines with Read more), the new share card with your portrait (needs a picture), and the page is 14.4 phone screens, not 13. Contact moved into the apply section and the footer. The 4 about blocks became 2 (the Approach and Difference blocks and the CPD line are gone: their facts live in How it works and the FAQ).', effort='L', title='English home: shorter and clearer',
  plain='20 screens on a phone is long, the hero has no face, number or the words “online coaching”, and the right half of the desktop hero is empty. The Farsi hero (phone mockup beside the headline) is the version you like.',
  items=[
   ('P1', 'English home', 'The hero never says “online coaching” and shows no face, athlete or number; credentials start 903 px down; on desktop the right half is empty but for a ball.', 'Sub names “online coaching with Amir (MSc S&C)”; a proof row under the buttons (three athlete faces, “1000+ players”); the phone mock beside the headline on desktop; drop the first ticker.', 'M', 'Y', 'home-en-02'),
   ('P2', 'English home', '17,200 px: pricing 2,437, About 2,272, Platform 2,120, Fit check 1,678 (see the bars). Claims repeat 3 to 4 times; Contact repeats the footer; price comes before process and coach.', 'Cut about 3,500 px: fit lists 3+3, About 4 blocks to 2, platform cards 5 to 3, Contact into the footer; order proof, process, pricing, fit check, app, About, FAQ.', 'L', 'Y', 'home-en-10'),
   ('P2', 'English home', 'Three pricing cards repeat the “Every programme includes” strip, so tiers look alike; no currency label; $60 and $50 a month are tiny grey; Match is 2,000 px down.', '“Everything in Game, plus…”; add “USD”; “$50/mo, save 29%” large; the strip as a checklist.', 'M', 'Y', 'home-en-08'),
   ('P2', 'English home', 'Testimonials run 71 to 108 words in 14 px light italic; 5 of 7 start “I worked with Amirhossein”; six say “strongly recommend”; “Elite Athletes” heads a hobbyist; “FIP #728” will go stale.', 'Bold pull-out first, “Read more”, one result line each, drop the weakest.', 'M', 'Y', 'home-en-14'),
   ('P3', 'English home', 'Eight nav items (“Platform”, “Library” mean little to a stranger); meta description is 211 characters; share card says “AA Performance” (nowhere on the page); no email shown though email support is sold.', 'Five items; description under 155; a new share card with your portrait; mailto in the footer.', 'S', 'Y', 'home-en-18'),
  ],
  decision=dict(title='How much do we change the English home?', options=[
     ('A', 'Tighten', 'Same order. Smaller gaps, shorter lists, plan-aware buttons. About 15 screens. Lowest risk.'),
     ('B', 'Re-sequence and condense (my pick)', 'Proof right after the hero, the Farsi-style phone hero on desktop, process before price, Contact folded into the footer. About 12 to 13 screens. Reuses the Farsi design you like.'),
     ('C', 'Short home plus deep pages', 'About 8 screens; new Programmes and About pages. Best long-term for search, most work.')],
     pick='B', chosen='B')),
 dict(n=13, phase='call', status='done', done='a', left='Done on 2026-10-02 (option C): English form 13 required questions (was 18) and about 15 optional ones folded under “Optional: speeds up our call”, closed by default: 8.0 to 5.7 phone screens, “about 3 minutes”; the Farsi form 12 required. A consent tick (health details and the AI assistant) is now required and stored with the answers: that was 13b’s tick; the age minimum and “only Amir sees my injury answers” are not done. Your answer on 2026-10-02: the form is for athletes of all kinds, so the football, cricket and other sport options STAY (13a no longer asks to remove them). The confirmation now says what happens next: we talk, you message me to pay, I write your programme (English and Farsi).', effort='M-L', title='The apply form: promise vs length',
  plain='The form is the one step every sale goes through. It asks 27 to 30 questions (18 required) over 7.8 phone screens, and the home says 2 minutes. Sleep, stress, nutrition, equipment and lifts are only needed after the call.',
  items=[
   ('P1', 'Apply EN and FA', '27 questions (29 for tennis or padel, 30 with an injury), 18 required, about 5 minutes; my estimate 2.5 min required-only. The season the hero promises is never asked. Football, cricket, weight-loss and “tone & shape” options remain though the site is for tennis and padel.', 'Stopgap now: “About 5 minutes” (package 10). Then the option you pick below.', 'M-L', 'Y', 'form-en-01, form-fa-03'),
   ('P2', 'Apply form', 'Health consent: privacy notice 2.1 relies on explicit consent for injury data, but the form has only a 12 px grey “By submitting, you agree”; forms accept ages 10 to 80 while the notice says adults; nothing says who sees injury answers.', 'A real tick like the UTS form; minimum age 18 or a guardian block; “Only Amir sees my injury answers”. Not legal advice.', 'S-M', 'Y', 'form-en-10, privacy-03'),
  ],
  decision=dict(title='What should the form become?', options=[
     ('Now', 'Stopgap', '“About 5 minutes” on the home. Done in package 10.'),
     ('A', 'Short apply plus a prep form', '9 fields (plan, name, email, WhatsApp, sport and level, goal, days, pain yes/no, next event). A true 2 minutes; the rest comes after your reply in a second form (to build).'),
     ('B', 'Same questions in 5 saved steps', 'Feels shorter, recovers quitters. A rewrite.'),
     ('C', 'One page cut to about 18 (my pick)', 'Everything else under “Optional: speeds up our call”. Cheapest. Move to A if the new numbers (package 9) show people quitting.')],
     pick='C', chosen='C')),
 dict(n=14, phase='call', status='go', done='a', left='14a is done on 2026-10-04 (option 1, the rule not a number): the price card says it is in Toman at that day’s rate with the exact amount in your first message, says how you pay (we talk, then you message me), and the FAQ opens with the cost question and has a new “how do I pay” answer (pay in advance, no refund once work starts, 18 or over). 14b, 14c and 14d (credentials row, which product leads, the length) are not built yet.', effort='M', title='Farsi home: price, trust and length',
  plain='The Farsi home sells well, but the price has no Toman figure or payment method, the first screen shows no name, face or credential, and the same pitch repeats six times over 20.8 screens.',
  items=[
   ('P2', 'Farsi home', 'The Iran price is a Latin “$25” with no Toman figure and no way to pay; the English page’s intake call, performance report, 60-day promise and 48 h reply are missing; the cost question is the last FAQ.', 'Toman rule or figure (see decision), payment FAQ, the promise if it applies, cost FAQ near the top.', 'M', 'Y', 'home-fa-06'),
   ('P2', 'Farsi home', 'The phone first screen shows no name, face or credential (brand name hidden under 560 px, trust bar about 1,630 px down, no photo of Amir).', 'A credential row under the buttons; smaller phone on narrow screens; coach photo in About.', 'M', 'Y', 'home-fa-05'),
   ('P2', 'Farsi home', 'Only the $17 course gets a primary button; coaching gets a ghost “جزئیات ←” that jumps about 10,000 px; the “ready-made program” card argues against the course card; a coaches-only app is pushed to players in the top bar.', 'Pick the lead product, add “کدوم برای منه؟”, give coaching “شروع کن”.', 'S', 'Y', 'home-fa-07'),
   ('P2', 'Farsi home', '20.8 phone screens; “personal plus weekly update” repeats six times; features, method, Library and About are 38% of the page.', 'Two-column feature tiles, one-line pillars, Library as a link, About merged into proof (aim about 15 screens).', 'M', 'Y', 'home-fa-08'),
  ],
  decision=dict(title='How do we show the price in Toman?', options=[
     ('1', 'Say the rule, not a number (my pick)', '«به تومان، به نرخ همون روز. مبلغ دقیق رو تو پیام اولم می‌گم.» Nothing goes stale.'),
     ('2', 'Show a Toman figure with a date', 'More concrete, but someone must keep it current.')],
     pick='1', chosen='1')),
 dict(n=15, phase='call', status='ask', effort='M', title='Farsi product pages: trust at the buy button',
  plain='The course and testing pages are lean and persuasive, but near the WhatsApp buy button nothing says what happens after you send, how fast you get a reply, or what if it fails.',
  items=[
   ('P1', 'Course and testing pages', 'No Toman figure anywhere; near the buy button nothing says what happens next, how fast you reply, how payment works, or what if it fails; no refund line; the course FAQ opens on the upsell.', 'Two lines under the button (reply time, how to pay, refund if you agree); FAQ: how to pay, how long, refund, iPhone; open “می‌تونم داخلش رو ببینم؟” first.', 'S', 'Y', 'tennis-01, tennis-02'),
   ('P2', 'Course page', 'Credentials and “۱۰۰۰+ بازیکن” sit at 80% scroll, after the price; no buyer quote or result.', 'Put “۱۰۰۰+ بازیکن · ۷+ سال” in the stats strip; a photo and one line above the price.', 'S', 'Y', 'tennis-03'),
   ('P2', 'Course page', 'Level 2 (target 70%) gets a typed WhatsApp buy; levels 1 and 3 (target 30%) only a personal-programme link and nothing is stored, so those leads vanish. “Not for you” (beginner, under 13, padel, injured) lives only in the test.', 'A third button “وقتی سطح ۱ آماده شد خبرم کن” (typed WhatsApp message with the level); 3 “not for you if…” bullets above the price.', 'S', 'Y', 'tennis-05, tennis-06'),
   ('P2', 'Both pages', 'The WhatsApp button reads like buying from WhatsApp; your number is never shown as text; the testing message lacks the academy name; the testing page offers nothing to try (its sample link shows a 404).', 'Number visible and left-to-right; an “ask first” link; a 45-second screen recording for testing.', 'S-M', 'Y', 'tennis-08, testing-01'),
   ('P2', 'Both pages', 'Footer lacks a privacy link on the testing page though the FAQ says children’s names are stored; the privacy notice is English-only and never mentions either app.', 'Add the link; a short Farsi paragraph per app in the notice.', 'S', 'Y', 'testing-02'),
   ('P3', 'Both pages', 'Hero kicker 2.0:1 and accent text 2.3 to 2.5:1 on the lit gradient; stat numerals 2.87:1; both share the English “AA PERFORMANCE” share card.', 'White kicker with clay border, drop the opacity, a Farsi 1200×630 card per product.', 'S-M', 'Y', 'tennis-07, shared-01'),
  ]),
 dict(n=16, phase='call', status='done', done='abcd', left='Done on 2026-10-02 (option 1, English): the proof page has “Get your free login” and “Try the demo” on the first screen, says it is for athletes, shows the real Today screen of the demo, and no longer promises a private link or eight starting habits; the number box asks for a country code; the page has its own home-screen manifest. The link hub is in the order that sells with clearer labels. Not done: email still required (the signup skill reads it), a Proof share card (needs a picture), a Farsi proof page (you chose English).', effort='M', title='Proof page and the Instagram link hub',
  plain='The free habit tracker is the top of your funnel. On a phone its first screen has nothing to tap, the form starts 3.3 screens down, and the page never says it is for tennis and padel players.',
  items=[
   ('P1', 'proof.html', 'Nothing to tap on the first screen: “FREE · NO PAYMENT, NO CARD” looks like a button but is a span; the form starts 2,794 px down; it never says tennis or padel.', 'A button to #join under the lede; name the audience; logo-only header (the site nav has 9 exits).', 'S', 'N', 'proof-01'),
   ('P1', 'proof.html', 'The product is never shown: about 570 words, one logo, no screenshot, no demo link, though habits.html?client=demo works.', 'One or two real screenshots (names hidden) and a “Try the demo” link.', 'M', 'Y', 'proof-02'),
   ('P2', 'proof.html', 'Three required fields though the login goes by WhatsApp; “+98” hint so a UK number cannot be messaged; manifest.json is the coaching app (start_url /program.html); share card is the English AA PERFORMANCE image.', '“WhatsApp (with country code)”, email optional, proof’s own manifest, its own share card.', 'S', 'Y', 'proof-06, proof-09'),
   ('P1', 'links.html', 'Which button is for whom is only half clear (“professional coach”; “شروع کن” does not say it is a paid application; two near-identical product names). The coaching sample is 5th, the free tracker 6th at 876 px, below the fold in Instagram’s browser.', 'Role line = “tennis and padel” as on the home; sub-lines “فرمِ درخواست · جواب تا ۴۸ ساعت”; order: coaching and sample, course and demo, coaches’ test, tracker, site.', 'S', 'Y', 'links-01, links-02'),
  ],
  decision=dict(title='Who is proof.html for?', options=[
     ('1', 'English-speaking players (my pick for now)', 'Keep English, say who it is for, show the product, link the demo.'),
     ('2', 'Your Iranian followers', 'Then a Farsi proof-fa.html linked from the hub, and the tracker higher on it. A new page.')],
     pick='1', chosen='1')),
 dict(n=17, phase='call', status='ask', effort='M', title='Partner page: the deal on the first screen',
  plain='A coach reading the partner page does not see the actual deal until 857 px down, and is asked for card details before you have accepted anyone.',
  items=[
   ('P2', 'partner-fa.html', 'The hero says “سهمِ همیشگی” with no number; the first “۱۰٪” is 857 px down; no worked example; no button to the form 4.5 screens away; it never gives the link students use.', 'Hero: “۱۰٪ تخفیف برای شاگرد، ۱۰٪ پورسانت برای تو، هر پرداخت و تمدید”; example “۶ ماهه: ۲۷۰$ → ۲۷$”; button to the form; show amirardekani.com/form-fa.html with a copy button.', 'S', 'Y', 'partner-fa-02, partner-fa-03'),
   ('P2', 'partner-fa.html', 'Nine first-step fields (5 required) including card number or PayPal email before you accept; no privacy link; the notice has no partner section.', 'Ask name, Instagram, WhatsApp, payout method; card details after acceptance; privacy link.', 'M', 'Y', 'partner-fa-04'),
  ]),
 dict(n=18, phase='call', status='other', effort='M-L', title='Articles: a next step, an author, a share card',
  plain='On a phone an article’s Apply button is hidden until the very end, every article has the same hard-sell closing, and health advice carries no visible author. These live in the page generator, which another session is editing right now (the twin warm-up article merge).',
  items=[
   ('P1', 'All articles', 'Header Apply is hidden on phones and the only CTA is at the end (first “Apply Now” at 6146 of 7407 px). Every article closes with the same hard sell; Farsi pages never mention the course, level test or WhatsApp; English never offers the demo.', 'Short Apply pill on phones; English: Apply plus “Try the live demo”; Farsi: level test, WhatsApp, Apply.', 'M', 'Y', 'article-01, article-02'),
   ('P1', 'Warm-up articles', 'The twin warm-up articles are both live and in the sitemap, competing for one phrase. The merge is decided, not done (another session is on it).', 'Ship the merged tennis-warm-up, delete the old pair and its app Library row.', 'M', 'Y', 'article-03'),
   ('P2', 'All articles', 'Health advice with no visible author, credentials, photo or review date; “Also in the app” sits above the first paragraph (4 lines on a phone, and opens an English app from Farsi pages).', 'An author block before the CTA; “Reviewed <month>”; move the app card below.', 'M', 'Y', 'article-09, article-04'),
   ('P2', 'All articles', 'Every page shares one English brand card as og:image, Farsi too; four unused people-free Library pictures exist. Four of five English descriptions are cut mid-sentence; “More articles” ignores topic; four older Farsi pages miss the SEO phrase; the index promises padel but no article body mentions it.', '1200×630 card per category (your OK to reuse the art); real descriptions; related by topic; retrofit the phrase; write the padel article or soften the claim.', 'M', 'Y', 'article-06 to 10'),
   ('P2', 'English articles', 'English article pages copy the Farsi pill look: four header links against the home’s seven, no WhatsApp in the footer. A third design next to the English home and the Farsi home.', 'Decide: look like the English home (shared nav) or keep this look.', 'M-L', 'Y', 'article-05'),
  ]),
 dict(n=19, phase='call', status='go', done='a', left='Done in the plain style of your option 1 (2026-10-04): the English home, the apply form and the proof page. The form’s stored answer values were NOT changed (only the visible labels), so the database, the WhatsApp message and the coach tools still read the same text. Still to do in the same style: the privacy notice (36 dashes; a legal text, so do it with package 20), the terms, the article closing (the page generator belongs to another session) and the Farsi pages (22 dashes, 6 semicolons). The internal email subject “New Client Intake” and the sender name “Client Intake Form” were left alone on purpose: they title each application email in Gmail, which Amir and the intake agent search by name and the word intake.', effort='M', title='Your voice in the English copy',
  plain='Your own rule says an athlete should read plain words that sound like you typed them. The English home has 43 em-dashes, 8 “X, Y and Z” lists and 24.7-word sentences; it reads at 34 out of 100 (difficult). Forms, proof, privacy and the article closing do the same.',
  items=[
   ('P3', 'English home, forms, proof, privacy, articles', 'Em-dashes: home 43, form 26, proof 12, privacy 36; “Not a PDF. An Experience.”; “from one of the world’s leading programmes” (no university named); “Client Intake Form” is internal jargon (buttons say Apply). Farsi: 22 dashes, 6 semicolons, “X، Y و Z” lines.', 'I write two plain options for each key line; you pick or change; the rest follows the same rule. Keep what already sounds like you: “We adapt.” “Nothing without a reason.”', 'M', 'Y', 'home-en-17, form-en-14, proof-08, article-15, home-fa-16'),
  ],
  decision=dict(title='Example: the same idea, three ways', options=[
     ('Now', 'Today', '“Not a generic fitness plan repackaged for racket sports. This is strength & conditioning designed from the ground up for the movement demands of tennis and padel — the accelerations, the decelerations, the repeated sprints, the rotational force production.”'),
     ('1', 'Option 1', '“This is not a gym plan with a racket added. I build it around how you move on court: fast starts, hard stops, long rallies, big rotation.”'),
     ('2', 'Option 2', '“I write your plan for tennis and padel only. Quick starts, hard stops, long points. That is what we train.”')],
     pick='1', chosen='1')),
 dict(n=20, phase='call', status='ask', left='Terms updated on 2026-10-02 (20d, half): section 7 now says no refund once work has started with the 14-day legal wrinkle, sections 3 to 5 no longer describe the retired ?client= link or a separate coaching agreement, a “Who can buy” paragraph says 18 or over, English and Farsi. Still open in 20d: the free tracker, the board, partner courses and the $17 Farsi course are not described. Done on 2026-10-02 from your answers: 20b is half done. The notice now says you use Claude (Anthropic) to write programmes (section 2.9, and Anthropic is in section 5), Supabase is “London, UK” and the date is 2 October. Still open: the coaching agreement, whether names go into AI chats, call-log.html, the Gmail copies, backups against “delete on request”. 20e (the UTS page) can wait: it has not been sent to anyone yet.', effort='M', title='Legal accuracy (needs facts from you)',
  plain='The privacy notice is detailed, but it lags what the site and your tools actually do. This is a list of differences to confirm, not legal advice.',
  items=[
   ('P1', 'privacy.html', '15,000 px (17.8 screens), 3,790 words, no summary or contents; analytics and fonts start 13 screens down.', 'A 7-line “Short version”, a jump list, ids on headings, <details> for the long sections; 16 px text and a 680 px column.', 'M', 'Y', 'privacy-01'),
   ('P1', 'privacy.html', 'Flows the notice never states: call-log.html builds prompts with athlete names and wellbeing notes to paste into AI chats; Gmail keeps every form email; the Supabase SDK loads from jsDelivr; backups outlive “delete on request”; “EU region, London” (London is UK).', 'A “My own tools” paragraph, a retention line, “London, UK”. Needs your facts.', 'S', 'Y', 'privacy-02'),
   ('P1', 'Both apply forms', 'Farsi applicants are sent to an English-only notice (also terms-fa and the course page).', 'A one-screen Farsi summary linked from those three places.', 'M', 'Y', 'privacy-04'),
   ('P2', 'terms.html', 'Dated 19 April; sections 4 and 5 describe the retired ?client= link; nothing on the free tracker, board, partner courses or the $17 Farsi course though /tennis/ sends buyers here; section 7 cites a coaching agreement that I could not find; the Farsi copy mixes «شما» and «تو».', 'Rewrite 4 and 5 for the login, add the missing products and refunds, date both pages.', 'M', 'Y', 'terms-en-01'),
   ('P1', 'uts-padel.html', 'Never says how to join or what it costs (the flyer says “Book at The UTS, 0151 632 6409”); an unbooked visitor could give 8 minutes of health data for a place they do not have.', 'After the lede and in the form intro: “Booked? This form is for you. Not booked? Ask the UTS team or call 0151 632 6409. £120 for 12 sessions, 8 places.” UTS may need to approve.', 'S', 'Y', 'uts-01'),
  ]),

 dict(n=21, phase='base', status='todo', effort='L', title='One brand CSS file and shared chrome',
  plain='Every page re-declares your colours. The English pages use one set of names and the Farsi pages another; six to nine different breakpoints; three different navs (shared English, Farsi own, the generated articles’ third). So a fix often has to be made five times.',
  items=[
   ('P3', 'Whole site', 'Two colour vocabularies for the same palette (--clay / --accent-2, --paper / --bg, --ink / --text-primary …), 48 KB of inline CSS on each home, breakpoints 480 to 1000 px in nine places.', 'A brand.css defining both vocabularies as aliases; one nav and footer for Farsi and article pages; shared type scale.', 'L', 'N', 'static scan, article-05'),
  ]),
 dict(n=22, phase='base', status='done', done='a', left='Done on 2026-10-02: it stops the commit (your answer). scripts/check_site_style.py runs from .githooks/pre-commit on the public pages and their shared CSS. It is a ratchet: scripts/site_style_baseline.json holds what existed (the drawn mini app, the Etminan amber and small labels, the UTS fonts) and only an ADDED one blocks; /* style-ok */ on a line marks a deliberate exception; after removing old ones run the script with --update. Its first run found real leftovers (form and proof labels under 12 px, the Farsi form, partner and terms pages still in the pale grey, a slider hanging off a 320 px screen) and they are fixed.', effort='M', title='A style guard so it stays fixed',
  plain='A small check that runs when you commit and says no if a change brings back yellow, text under 12 px, a pale grey, or letter-spacing on Farsi.',
  items=[
   ('P3', 'Pre-commit', 'Nothing stops regressions: the no-gold rule, the 12 px floor, the grey token, Farsi letter-spacing and Google font links are checked only by people.', 'scripts/check_site_style.py in .githooks/pre-commit, same pattern as the existing guards.', 'M', 'N', 'static scan'),
  ]),
 dict(n=23, phase='base', status='done', done='a', left='Answered on 2026-10-04 by six real reports: the Farsi funnel works with no VPN on Hamrah-e Avval and Irancell (site, sign-in, data, apply form, analytics, the app library), but YouTube is blocked, so videos need a VPN (Aparat works). One Shatel report on a 3G Android timed out on your own site once; the rest were fine. Findings for the apps are in package 25 (a wrong phone clock can break sign-in; the video choice).', effort='S', title='Can Iran reach the forms, Plausible and the demo?',
  plain='Three things your Farsi funnel depends on have never been tested from Iran: sending a form, Plausible, and the demo. If they fail, a visitor there cannot apply or be counted.',
  items=[
   ('P2', 'Farsi funnel', '/reach/ tests the fonts but not api.web3forms.com, plausible.io or the Supabase address. One Web3Forms key serves 9 pages.', 'Add those three to /reach/; ask two or three Iranian athletes to run it with the VPN off; record the result in this file.', 'S', 'Y', 'form-fa, tennis-09, funnel cross-page'),
  ]),
 dict(n=24, phase='base', status='todo', effort='S', title='Re-run the audit after each batch',
  plain='The scoreboard at the top is the baseline. After each batch I re-run the same measurements and report the difference.',
  items=[
   ('P3', 'Process', 'No before and after.', 'python scripts/site_audit/scoreboard.py against the baseline numbers in this file.', 'S', 'N', ''),
  ]),
 dict(n=25, phase='next', status='todo', effort='L', title='The apps',
  plain='program.html (athletes), habits.html (AA Proof) and coach.html (your dashboard) get the same pass once the website is done.',
  items=[
   ('P3', 'Apps', 'Not reviewed yet. They have their own audit (Fresh Eyes) and rules; this pass would only add what the website tools can measure.', 'Start with the athlete app’s first-run and Home on a phone.', 'L', 'N', ''),
   ('P1', 'Athlete apps (program.html, habits.html, course app)', 'A wrong phone clock breaks sign-in. One Irancell iPhone reports its clock 89 minutes behind. The sign-in library decides a token has expired by the phone’s clock, so it keeps sending an expired token for about 1.5 hours of every cycle and the server answers “JWT expired”. Nothing in the apps retries.', 'On a 401 or “JWT expired” answer, refresh the session once and repeat the request; test with a phone clock set back. The reach test already prints the clock difference.', 'M', 'N', 'reach 2026-10-04'),
   ('P2', 'Course and programme videos', 'Without a VPN, YouTube is blocked on both Iranian networks tested (thumbnails and the nocookie player fail or time out). With a VPN it works but slowly (up to 8 s). Aparat works on every report.', 'Decided 2026-10-04: keep YouTube. You cannot put the videos on Aparat unless you record them yourself, and you are not planning to. So athletes in Iran need a VPN for videos.', 'L', 'N', 'reach 2026-10-04'),
   ('P3', 'Athlete apps', 'A 256 KB upload times out without a VPN; 64 KB passes. The largest athlete progress record today is 29 KB, so nothing breaks, with about a 2x margin.', 'Watch the size; trim or split the record before it nears 64 KB.', 'S', 'N', 'reach 2026-10-04'),
  ]),
]

# Every new sentence a visitor can now read, written during the audit. They are short, functional lines in your voice rules (plain words,
# short sentences), but they are YOUR words on YOUR site: read them, change what you do not like, and I will fix it in one commit.
NEW_WORDS = [
    ('Apply form, English: the confirmation and the errors', [
        'I reply by WhatsApp or email. Got a question while you wait? Message me.',
        'Buttons: “Message Amir on WhatsApp” and “Back to the site”.',
        'The WhatsApp message the button opens: “Hi Amir, it’s <name>. I just sent my coaching application (<plan>).”',
        'If sending fails: “That did not go through, but your answers are still here. Try again in a moment, or message me on WhatsApp.”',
        'Under an unanswered question: “Please choose one option.” · “Please choose at least one.” · “Please choose an option from the list.” · “Please move the slider to give your answer.” · “Please enter a number from 10 to 80.” · “Please fill this in.” · “Please enter your email address.” · “Please enter a valid email address, like name@example.com.”']),
    ('Free tracker page (proof.html), English', [
        'After sending: “I have your number as <number>. If that is wrong, message me and I will fix it.” and a button “Message me on WhatsApp”.',
        'The WhatsApp message it opens: “Hi Amir, it’s <name>. I just signed up for AA Proof.”',
        'If sending fails: “That did not go through, but what you typed is still here. Try again in a moment, or message me on WhatsApp.”']),
    ('Apply form, Farsi', [
        'After sending, under the old text: «جوابت رو از همون راهی که نوشتی (واتساپ یا اینستاگرام) می‌دم. تا اون موقع سؤالی داشتی، همین‌جا بهم پیام بده.»',
        'Buttons: «پیام توی واتساپ» و «برگرد به خانه».',
        'The WhatsApp message it opens: «سلام امیر، من <نام> هستم. همین الان فرمِ درخواست رو فرستادم.»',
        'If sending fails: «ارسال نشد، ولی جواب‌هات همین‌جاست. چند لحظه بعد دوباره امتحان کن، یا توی واتساپ یا اینستاگرام بهم پیام بده.»',
        'Under an unanswered question: «یکی رو انتخاب کن.» · «دست‌کم یکی رو انتخاب کن.» · «یکی از گزینه‌ها رو انتخاب کن.» · «اسلایدر رو جابه‌جا کن تا جوابت ثبت بشه.» · «سنت رو با عدد بنویس.» · «این بخش رو پر کن.» · «ایمیلت رو بنویس.» · «ایمیلِ معتبر وارد کن.»']),
    ('Partner page, Farsi', [
        'Same two buttons after sending, and the same failure line as the apply form.',
        'The WhatsApp message it opens: «سلام امیر، من <نام> هستم. همین الان فرمِ همکاریِ مربی‌ها رو فرستادم.»',
        'Under a missing field: «این بخش لازمه.» · «برای ادامه باید شرایط رو تأیید کنی.» · «یه روش انتخاب کن.» · «ایمیلِ معتبر وارد کن.»']),
    ('The 404 page (both languages)', [
        'English: “That page is not on this court.” · “The link may be old, or one letter is wrong. These will get you back.” · “Already coached? Open your programme” · “Still stuck? Message me on WhatsApp”. The big word is “Out.” and the buttons are Home, Apply for coaching, Free habit tracker, Articles.',
        'The WhatsApp message it opens, so you can fix a broken link: “Hi Amir, I hit a broken link on your site: <the address>”.',
        'Farsi (first when the broken link was a Farsi one): «اوت شد! این صفحه پیدا نشد.» · «شاید لینک قدیمی بوده یا یه جاش اشتباه تایپ شده. از این‌جاها می‌تونی ادامه بدی.» · «برنامه‌ی تمرینی داری؟ بازش کن» · «هنوز گیر کردی؟ توی واتساپ بهم پیام بده»; buttons «صفحه‌ی اصلی», «شروع کن», «مقاله‌ها».']),
    ('English home', [
        '“Application takes about 5 minutes · No commitment until we speak” (it said 2 minutes).']),
    ('What happens after the form (from your answers of 2026-10-02)', [
        'Apply form, English, under the confirmation: “I reply by WhatsApp or email. After we talk, you message me to pay and I write your programme. Got a question while you wait? Message me.”',
        'Apply form, Farsi: «بعد از صحبتِ ما، توی واتساپ یا اینستاگرام بهم پیام می‌دی تا پرداخت رو هماهنگ کنیم و من برنامه‌ت رو شروع کنم. تا اون موقع سؤالی داشتی، همین‌جا بهم پیام بده.»',
        'Farsi home, the feature card: «هر جا سؤال داشتی، از توی اپ یه‌راست توی واتساپ بهم پیام بده و جواب بگیر.» and the FAQ line «هر جا سؤال داشتی، توی واتساپ پیام می‌دی.»',
        'Farsi home, a new FAQ «اپ انگلیسیه؟»: «فعلاً بله. متنِ اپ و برنامه انگلیسیه و ساده نوشته می‌شه. هر سؤالی داشتی، به فارسی توی واتساپ بهم بگو.»',
        'Privacy notice, new section 2.9 “Writing your programme with an AI assistant” (Claude, by Anthropic; you approve every programme; Anthropic is a processor; outside the UK possible; lawful basis as 2.1). A legal text in your name: read it.']),
    ('Privacy notice, the Fonts paragraph (section on third parties)', [
        'Now reads: “The home page, the apply and free-tracker forms, the privacy and terms pages, the Farsi pages and the Etminan pages serve their typefaces from this site, so those pages make no font request to Google. Some other pages (the articles, the training and habit apps and the UTS page) still load their typefaces from Google Fonts. To draw them, your browser asks Google’s servers …” (the rest as it was). It is a legal text and your words: say if you want it changed.']),
    ('The apply forms, cut (2026-10-02)', [
        'English: the group title “Optional: speeds up our call” and under it “About 15 quick questions. Skip any you like: I will ask on our call.” The time badge says “About 3 min to complete”.',
        'English consent tick (required): “I agree that Amir uses my answers to write my programme, including any injury or health details I give. He uses an AI assistant (Claude) to help and checks every programme himself. How my data is used”. If it is not true that you check every programme yourself, tell me and I change it.',
        'Farsi: «اختیاری: تماسمون رو سریع‌تر می‌کنه» · «حدودِ ۱۵ سؤالِ کوتاه. هر کدوم رو خواستی رد کن، توی تماس ازت می‌پرسم.» · badge «حدودِ ۳ دقیقه»',
        'Farsi consent tick: «قبول دارم که امیر از جواب‌هام برای نوشتنِ برنامه‌م استفاده کنه، از جمله اطلاعاتِ آسیب و سلامتی که می‌نویسم. امیر برای کمک از یه دستیارِ هوش مصنوعی (Claude) استفاده می‌کنه و همه‌ی برنامه‌ها رو خودش چک می‌کنه.» and the error «برای ادامه باید این کادر رو تیک بزنی.»',
        'Privacy notice 2.9 now says the AI assistant gets your name too. English home: “Application takes about 3 minutes”.']),
    ('Terms, section 7 and the age rule (2026-10-02)', [
        'English section 7: “You pay in advance, after we have talked, by messaging me to agree the payment. The fee is for the work I do, so I do not give refunds once I have started on your programme.” and “This does not take away rights you have by law. For example, a customer in the UK or EU can usually cancel within 14 days of paying, and if I have already started the work, I keep a fair part of the fee for the work done.”',
        'English “Who can buy”: “You must be 18 or over to buy a programme. If the athlete is under 18, a parent or guardian applies, pays and agrees to these terms for them, and answers the health questions with them.” The Farsi terms say the same (and the Farsi section 7).',
        'Form tick, English: “I am 18 or over. If the athlete is under 18, I am their parent or guardian.” Farsi: «من ۱۸ سال یا بیشتر دارم. اگه ورزشکار زیر ۱۸ سال باشه، من پدر یا مادرِ (یا سرپرستِ) اون هستم.» The age box: “Athlete’s age · Under 18? A parent or guardian fills in this form.” / «سنِ ورزشکار · زیر ۱۸ سال؟ پدر یا مادر باید این فرم رو پر کنه.»']),
    ('Proof page and link hub (2026-10-02)', [
        'Buttons “Get your free login” and “Try the demo”, the line “Free. No payment, no card. For any athlete.”, the heading “This is the whole app.” with “Four habits a day: steps, sleep, protein and water. Tap one when it is done. Points build levels.” and “The demo is the real thing with nothing saved. Tap around.”',
        '“Four are always on: steps, sleep, food and water. The rest are optional, and you can change them whenever you like.” · “Get your free login” · “You will get a username and password on WhatsApp.” · “Send me my login” · “WhatsApp number, with country code”.',
        'Farsi hub: «درخواستِ برنامه‌ی اختصاصی» / «فرمِ ۳ دقیقه‌ای · جواب تا ۴۸ ساعت», role «مربیِ بدنسازیِ تنیس و پدل», «آزمون آمادگی جسمانی · برای مربی‌ها», and «… · صفحه به انگلیسیه» on the tracker.']),
    ('The English home, rebuilt (2026-10-04)', [
        'Hero: kicker “Online tennis & padel coaching”, sub “Strength and conditioning built around how you move on court. I write your programme and coach it every week.”, under the buttons your photo with “Amir Ardekani, 2× MSc. Used by 1000+ competitive tennis and padel players.”',
        'Testimonials: “Players I’ve coached” and “From club players to internationals. The same method, built around each athlete.” (it said “Trusted by Elite Athletes”).',
        'Fit check: “This is not a gym plan with a racket added. I build it around how you move on court: fast starts, hard stops, long rallies, big rotation.” Three yes lines and three no lines.',
        'The app: “Your programme lives in an app.” (it said “Not a PDF. An Experience.”) and “You sign in with a username and a password. There is nothing to download and no spreadsheet.”',
        'Prices: “Everything listed above”, “Everything in Game, plus”, “Everything in Set, plus”, “$60 a month, save 14%”, “$50 a month, save 29%”, “USD”, and “All prices are in US dollars. You pay in advance, after we have talked.”',
        'About: two blocks, “Education” and “On Court and in the Gym”. A new first FAQ, “How does payment work?” (pay in advance, no refund once I have started, 18 or over, a parent or guardian for under-18s). The closing line “A question first? Message me on WhatsApp or email me. I usually reply within 24 hours.” The navigation is Results, How it works, Programmes, About, FAQ.']),
    ('The apply form and the proof page in plain words (2026-10-04)', [
        'Form: the heading is “Apply for coaching” (it said “Client Intake Form”), the opening line “Tell me where you are right now. I will use your answers to build a programme around your body and your week.”, the plans read “Game: $70 for 1 month”, “Set: $180 for 3 months”, “Match: $300 for 6 months”, and the contact hint says “I reply here or by email. For WhatsApp, include your country code.”',
        'Form: “Choose the programme that fits your goals.” · “Tell me what you play and how seriously you train. I build the programme around your sport.” · “This keeps you safe. I use it to plan around any limits you have.” · the options such as “Heavy: long days, little downtime” (they had dashes).',
        'Form, after sending: “Application sent.” and “I will read your application and message you within 48 hours. We will talk about whether we are a good fit.” The discount messages: “✓ Code approved: 10% off”, “That code was not recognised. Check the spelling.”, “I could not check this code right now. Send the form anyway and I will apply it by hand.”',
        'Proof page: “Streaks you won’t want to break” (it said “Runs”; the app says streak), the habit chip “Protein” (it said “Food”; the app says 3 protein meals), and every dash became a full stop or a colon.']),
    ('Small helper words', [
        'Skip links for keyboard users: «رفتن به محتوا» · «رفتن به لینک‌ها» · «رفتن به متن» · «رفتن به فرم». The English ones already said “Skip to content”.',
        'Screen-reader names for the Etminan language switcher: “FA فارسی”, “EN English”, “DV ދިވެހި”.']),
]

# Calls of yours that I shipped anyway because they were small, reversible or an accessibility fix. Say “revert” and any of them goes in one commit.
SHIPPED_YOUR_CALLS = [
    'The 404 page and its words (package 8). It was marked as your call.',
    'The small labels on the green hero are now cream with a clay dot, and small clay text on light is a hair deeper (package 1, items c and d).',
    'The headline pulse on the English home stops after two beats instead of running for ever (package 4, item e).',
    'The home’s “about 5 minutes” (package 10, item a, only the number).',
]

FACTS = [
    'Welcome every athlete: people from other sports arrive straight on the apply form. The English home and the form now say tennis and padel are your specialty and every athlete is welcome (2026-10-04).',
    'Videos stay on YouTube: you cannot host them on Aparat unless you record them yourself, and you are not planning to. Athletes in Iran need a VPN for videos.',
    'Iran reach test, six reports from four phones on Hamrah-e Avval, Irancell and Shatel (2026-10-04). WITHOUT a VPN, on Hamrah-e Avval and Irancell: your site, the sign-in server, the data server, the apply-form endpoint (Web3Forms), Plausible, jsDelivr, Google Fonts and Aparat all work. YouTube does not (the thumbnails and the nocookie player fail or time out). A 256 KB upload times out, 64 KB passes. WITH a VPN everything works, only slower (YouTube up to 8 s). So the Farsi funnel, the forms and the analytics work for people with no VPN; the exercise and lesson videos do not.',
    'How a client joins and pays: they fill in the form, you contact them with more questions, they pay (by messaging you on WhatsApp or Instagram), then you write their programme. The Farsi price is the equivalent of 25 dollars a month, in Toman at the day’s rate.',
    'The apply form is for athletes of all kinds, not only tennis and padel: the football, cricket and other options stay.',
    'The app is English for now. It has no chat: everything goes through WhatsApp.',
    'The UTS page has not been sent to anyone yet (the course has not started).',
    'You write the programmes with Claude, and athlete names go into those AI chats. The privacy notice says so (section 2.9: name, goals, background, injuries and logged sessions; Anthropic is in the list of processors), and both apply forms now ask for a consent tick.',
    'There is no 60-day promise and there are no refunds. Terms section 7 now says: you pay in advance, no refund once I have started your programme, and your legal rights stay (a UK or EU customer can usually cancel within 14 days; if I have started, I keep a fair part). A flat “no refund” cannot override that law, so it is worded this way.',
    'You must be 18 or over to buy a programme. If the athlete is under 18, a parent or guardian applies and pays. Both forms have a required tick for it, the age box says “Athlete’s age” and “Under 18? A parent or guardian fills in this form”, and the terms and the privacy notice say the same.',
    'First screen and Library pictures: go with my recommendation. That is your photo and the athletes already shown in the testimonials (they have agreed), and the Library’s category pictures reused as article thumbnails and share cards.',
]

QUESTIONS = [
    'Your part: the Plausible goals (Apply Click, WhatsApp Click, Demo Click, Hub Click, Form Started, Form Step, Level test start, Proof Signup, Partner Application, 404, and the properties plan, where, page, which, to, step, lang). You asked me to walk you through it later.',
    'The small round photo under the Apply button on the home’s first screen is your headshot (the one from the About section). Say if you want a different one.',
]

TOOLS = [
    # name, source, what, verdict, how we use it
    ('frontend-design-audit', 'mistyhx · 91★ · MIT', '15 usability principles, severity 0 to 4, strengths and quick wins.', 'Real, safe. Method adopted.', 'Its 15 principles and 0 to 4 scale are in the review rubric. Not installed: by default it edits code (only its :evaluate mode is report-only).'),
    ('frontend-visual-qa', 'daymade · MIT', 'A screenshot-first audit that never changes code.', 'Real, safe. Rule adopted.', '“A screenshot you never opened is not evidence” shaped the capture (one false alarm of mine was caught that way). The same Playwright pipeline already runs here, so not installed.'),
    ('ui-ux-audit', 'two old skills; the plugin ux-ui-audit by UXBYISSA', 'Measured contrast, tap targets, Hick and Fitts, right-to-left and parity probes.', 'The plugin is real and read-only; the two skills of that name are not worth it.', 'I built equivalent probes tuned for Farsi: its right-to-left engine is Arabic-specific and misses Persian digits. Optional install for the app review.'),
    ('claude-design-skills', 'ambiguous', 'Several repos use the name. Most likely Carlos Cuellar’s design-skills plugin (93★, MIT).', 'Overlaps the design plugin you already have enabled.', 'Not needed. Tell me where you saw it.'),
    ('ux-designer', 'szilu · 72★ · MIT', 'Advice-only UX reference: forms, right-to-left, mobile, ethics.', 'Real, safe.', 'Its form and mobile guidance informed the reviewers’ briefs. Optional install.'),
    ('Impeccable detect', 'pbakaus · 74k★ · Apache-2.0', '61 deterministic checks (touch targets, line length, skipped headings, “AI slop”), no AI, no key.', 'The most popular real auditor.', 'I would run `npx impeccable detect` on the live pages as a cross-check (needs your OK). Never its install command, which writes hooks into your settings.'),
    ('Lighthouse and axe-core', 'Google · 31k★; Deque · 7.6k★', 'The standard speed, SEO and accessibility scorecards.', 'Trusted, ubiquitous.', 'Cross-check for my own measurements and a number you can recognise (needs your OK to install in a scratch folder).'),
    ('Playwright', 'Microsoft · installed', 'Real-browser automation.', 'Already on your PC.', 'Runs everything in this review.'),
    ('web-quality-skills, marketingskills cro', 'Addy Osmani 2.9k★; Corey Haines 52k★', 'Markdown playbooks for performance, accessibility, SEO and conversion.', 'Safe to read.', 'Adopted as lenses, not installed.'),
    ('ui-ux-pro-max', '132k★', 'Generates designs from style libraries.', 'Popular, but it generates; it does not audit.', 'Skipped. Its design-system file would fight your clay-only brand rules.'),
]

EVIDENCE = [
    # file, caption, package
    ('len-home-en-phone.jpg', 'The English home on a phone, top to bottom: 20 screens.', 12),
    ('hero-desktop-en-vs-fa.jpg', 'Hero on a desktop: English (left) leaves the right half empty; Farsi (right) puts the app beside the headline.', 12),
    ('hero-phone-en.jpg', 'English first screen on a phone: the Apply button appears twice (hero and sticky bar), the kicker is 1.8:1.', 3),
    ('menu-375.jpg', 'The open menu on a 375×667 phone: “Results” paints over the logo and the list is cut off.', 3),
    ('numerals.jpg', 'The ghost “01” and “02” sit on the first line of the card text.', 3),
    ('final-cta.jpg', 'The sticky bar covers the closing paragraph while an identical button sits right below.', 3),
    ('fa-hero-phone.jpg', 'Farsi hero phone: the greeting and the exercise names are white on white.', 5),
    ('fa-phone-field.jpg', 'Farsi form: a typed “+98 912 345 6789” shows reversed; the counter reads “۲۷ / ۳”.', 5),
    ('notfound-before-after.jpg', 'A wrong address today (left) and the draft 404 (right).', 8),
    ('form-length-phone.jpg', 'The apply form on a phone: 7.8 screens.', 13),
    ('after-hero-phone.jpg', 'After: the English first screen on a phone. Apply is not covered, the ball sits in the empty space beside the headline, and the page no longer jumps when the font arrives.', 3),
    ('after-form-success.jpg', 'After: the apply form’s confirmation has a WhatsApp button that opens a message already naming the applicant, and a way back.', 7),
    ('after-proof-success.jpg', 'After: the free-tracker confirmation shows the number it has (so a typo is seen) and a WhatsApp button.', 7),
    ('after-partner-errors.jpg', 'After: the partner form checks its fields and says what is missing, in Farsi, next to the field.', 7),
    ('after-level-marks.jpg', 'After: level marks in green and grey instead of traffic-light emoji (no yellow or orange).', 11),
    ('after-etminan-fa.jpg', 'After: the Etminan Farsi page. Same look; the labels are Persian letters that join and the ticker stays on screen.', 5),
    ('after-404.jpg', 'After: a wrong address lands on your own page, Farsi first for a Farsi link.', 8),
]

# Appended as work ships: (date, packages, what changed, commit)
NEXT_UP = [
    'Re-run the measuring tools on the live site (package 24: `scripts/site_audit/README.md`) and save `Content/site-audit/after-scoreboard-2026-10-04.txt`. The numbers in the scoreboard above for the English home, forms and proof page were measured by hand during the rebuild; the full run has not been repeated since the first batches.',
    'Package 20 (legal) with the rest of 19 on the privacy notice: a 7-line “Short version” and a jump list at the top (20a), a one-screen Farsi summary linked from the Farsi form, terms and course page (20c), the terms for the free tracker, the board, partner courses and the $17 Farsi course (20d), and the plain-words pass. Legal text in his name: show him the words first.',
    'Farsi home 14b to 14d (credentials row, which product leads, length), Farsi product pages 15 (needs his word on refunds for the $17 course, which is not covered by the terms yet) and the partner page 17.',
    'Package 12 leftovers: a share card with his portrait (can be composed from his headshot, no credits), the testimonial pull-outs (his call) and getting the phone page from 14.4 to about 13 screens.',
    'Package 25, the apps. First: a wrong phone clock breaks sign-in (refresh the session once on a 401 or “JWT expired” answer). Then the first-run and Home pass on a phone.',
    'His parts: add the Plausible goals (a walk-through he asked for), the UTS page when the course starts (20e), and the demo banner’s links in program.html (5d, another session).',
    'Package 21 (one brand CSS file) and 18 (articles, the page generator) are big and belong to later or to another session.',
]

SHIPPED = [
    ('2026-10-02', '1, 2', 'Readable small text and thumb-sized links: the muted grey, 12 px floors, a focus ring that shows on dark areas.', '906e1f5'),
    ('2026-10-02', '2, 5, 7', 'Forms stop zooming on iPhone; Farsi phone numbers work (and the dashboard builds their WhatsApp link); keyboard focus on the Farsi form.', 'c6be9fd'),
    ('2026-10-02', '4, 5, 6', 'Farsi home: no blank screen when Google Fonts hangs, a visible phone picture, a real right-to-left testimonial rail.', '7c866bf'),
    ('2026-10-02', '3, 4', 'English home and nav: menus that fit a short phone, a sticky Apply bar that waits, pricing buttons that open the form with the plan chosen, no endless motion.', '95ccbf8'),
    ('2026-10-02', '8', 'A real 404 page, English and Farsi, with WhatsApp carrying the broken address.', '0314b17'),
    ('2026-10-02', '7', 'The apply forms finish properly: a WhatsApp next step, no alert box, a 15 second limit instead of a frozen button, the page behind the confirmation locked.', 'ddd4d42'),
    ('2026-10-02', '7, 9', 'The free tracker and partner forms the same way; the partner form checks its fields in Farsi; the level test ignores a double-tap.', 'f04f97c'),
    ('2026-10-02', '11', 'No yellow on the apply forms: level marks in green and clay instead of traffic-light emoji.', '7ce2736'),
    ('2026-10-02', '6', 'Farsi pages (form, partner, links, terms, Etminan) load Vazirmatn from your own server: links.html used to paint nothing for 6+ seconds when Google hung, now under 0.3 s.', 'cf1683c'),
    ('2026-10-02', '9', 'Plausible now counts Apply clicks (with the plan), WhatsApp, demo, the link hub, and how far people get in the apply form.', '1aee984'),
    ('2026-10-02', '7', 'A Tab on a slider no longer answers it; every group of choices has a name for a screen reader; errors say what to do.', 'd7c6726'),
    ('2026-10-02', '5, 7', 'Etminan pages: focus rings, skip link, readable greys, 44 px language switcher, the thank-you dialog takes focus; the look is unchanged.', '4e0a7d4'),
    ('2026-10-02', '6', 'The English pages stop jumping when the headline font arrives (layout shift 0.204 to 0); the hero ball no longer sits on the demo link.', '65a48f9'),
    ('2026-10-02', '5, 10', 'Skip link and main landmark on the last Farsi pages; the home no longer promises "2 minutes".', 'ff47f99'),
    ('2026-10-02', '6', 'Athlete photos on both homes 40% lighter, with sizes, loaded as you scroll.', 'ae22d81'),
    ('2026-10-02', '2, 5, 6', 'Thumb-sized links on the shared header, footer and course pages; the 404 headline stops jumping; Persian-digit footer years.', '516efa8'),
    ('2026-10-02', '6', 'The English pages and the Farsi pages’ Latin numerals load Barlow, Barlow Condensed, JetBrains Mono and DM Sans from your own site: 14 pages make no request to Google, layout shift unchanged. The privacy notice now says which pages still use Google Fonts.', 'f3e27cb'),
    ('2026-10-02', '1', 'Every white-on-clay button, badge and chip is the deeper #C2512C (4.66:1, was 4.40:1): 25 of 25 measured; lines, glows and clay text keep the brand colour.', '07e0118'),
    ('2026-10-02', '5, 13, 20', 'Your answers acted on: the Farsi home says WhatsApp (not “in the app”) and has an “is the app English?” FAQ; both confirmation screens say what happens next (we talk, you pay, I write your programme); the privacy notice says you use Claude to write programmes and that Supabase is in London, UK.', '4945846'),
    ('2026-10-02', '10, 20', 'The 60-day promise is gone from the English home (there is none); the privacy notice says names go to the AI assistant.', '295589d'),
    ('2026-10-02', '13', 'The English apply form is cut to 13 required questions with about 15 optional ones folded away (8.0 to 5.7 phone screens, about 3 minutes) and a required consent tick for health details and the AI assistant.', '5fe959e'),
    ('2026-10-02', '13', 'The Farsi apply form the same way: 12 required, the rest optional, the same consent tick.', '0417c8a'),
    ('2026-10-02', '13, 20', 'No refunds and 18 or over: terms section 7 rewritten (English and Farsi), the old ?client= link and “coaching agreement” removed from the terms, a required adult-or-guardian tick on both forms, privacy section 8.', '6d6aeb4'),
    ('2026-10-02', '16, 10', 'Proof page: Get your free login and Try the demo on the first screen, the real app shown, the stale promises fixed, a country-code number box, its own home-screen manifest.', 'cea6ef8'),
    ('2026-10-02', '16', 'The Instagram link hub in the order that sells, with clearer labels (application, 48 hours, for coaches, the tracker page is English).', '56a0535'),
    ('2026-10-04', '14', 'Farsi home: how you pay is on the price card and in the FAQ, the cost question comes first.', '48757b9'),
    ('2026-10-04', '23', 'The Iran reach test came back (six reports): forms, sign-in, data, analytics and fonts work with no VPN; YouTube does not.', '(record)'),
    ('2026-10-04', '12, 19', 'The English home rebuilt and rewritten in plain words: proof first, process before price, price checklist and plan-by-plan upgrades, your photo and the app phone on the first screen, contact folded into the apply section and the footer, five nav items, Read more on testimonials, a payment FAQ. 20.2 to 14.4 phone screens.', '4c77349'),
    ('2026-10-04', '19', 'The apply form and the proof page in plain words: “Apply for coaching”, no dashes, plain option labels (stored answers unchanged), “streak” not “run”, Protein not Food.', 'e81e64a'),
    ('2026-10-02', '22', 'The style guard: a commit that adds yellow, text under 12 px, a pale grey, letter-spaced Farsi, a Google font link or white-on-pale-clay is stopped. It also found and fixed: 10 to 11 px labels on the apply form and proof page, the pale grey on the Farsi form, partner and terms pages, and a slider value hanging off a 320 px screen.', '943a92c'),
]
