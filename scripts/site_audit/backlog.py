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

SCORECARD = [
    ('Phone length, English home', '20.4 screens', '13 or fewer'),
    ('Phone length, Farsi home', '20.8 screens', '15 or fewer'),
    ('Text under 12 px, English home', '65 items', '0'),
    ('Tap targets under 44 px, English home', '15', '0'),
    ('Blank screen if Google Fonts hangs (Farsi home)', '8.3 s', 'under 1 s'),
    ('Layout jump on a slow phone', '0.096 home, 0.209 Etminan', 'under 0.05'),
    ('English home reading ease', '34 of 100, 43 em-dashes', '60 or more, none'),
    ('Apply form: promise vs reality', '“2 minutes” vs about 5, 27 to 30 questions', 'true, and shorter'),
    ('“Sent” screens that are a dead end', '4 forms', '0'),
    ('Pricing buttons that open the form', '0 of 3 (they jump to the page bottom)', '3 of 3, plan chosen'),
    ('Key clicks you can see in Plausible', 'none (only form submits and level-test results)', 'Apply, WhatsApp, demo, proof, partner, form steps'),
    ('A wrong web address shows', 'GitHub’s grey English page', 'your own page, English and Farsi'),
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
 dict(n=1, phase='now', status='next', effort='S-M', title='Make small text readable',
  plain='One grey in your colour list is too pale for small text, and 65 labels on the English home are smaller than 12 px. One value change in the shared colour file fixes most pages at once.',
  items=[
   ('P1', 'All English pages, 3 Farsi pages', 'The muted grey #8A8A8A is 3.2:1 on paper and 3.45:1 on white (AA needs 4.5). The paler #B0A99E is 2.0:1.', 'tokens.css lines 33 and 80: --text-muted to #6B6B6B (about 5:1); never use --text-dim for text; same for the local greys in partner-fa, form-fa, terms-fa.', 'S', 'N', 'home-en-11, form-en-13, links-03'),
   ('P2', 'English home, form, proof, Etminan', '64 text items under 12 px (mono, 2 to 3 px letter-spacing), 15 on the form, 26 on Etminan; 52 of 65 body blocks are weight 300 at 15 px or less.', 'Floor of 12 px for labels, tighter tracking, body weight 400 for small text (index.html about 20 rules, form.html 4, proof 2, components.css and base.css 2 each).', 'M', 'N', 'home-en-11, etminan-en-01'),
   ('P1', 'English home', 'Clay on the green hero fails badly: kicker 1.8:1, “Elite Athletes” 2.0, “An Experience.” 1.6, the Match key line 3.2, the INCLUDED badge 2.6, the closing note about 3:1.', 'Small labels on green in paper or cream with a clay dot; big clay words only where the green is dark. Keeps the look, fixes the reading.', 'S', 'Y', 'home-en-07, home-fa-10, tennis-07'),
   ('P2', 'Everywhere clay text is small', 'Small clay text on light is 4.1:1 and white-on-clay buttons are 4.4:1, both just under AA.', 'A text-only deeper clay (#B84A27, 4.9:1; the app already does this with --clay-ink) and bold 14 px or larger on buttons. A hairline colour shift, easy to revert.', 'S', 'Y', 'article-11, home-fa-10'),
   ('P1', 'English home, nav, dark sections', 'The keyboard focus ring is dark green, so it vanishes on every dark area (nav, hero buttons, demo, final CTA). The testimonial scroller is an unnamed tab stop.', 'base.css line 216: white outline inside .hero, .sec--dark, .site-nav; aria-label on the scroller.', 'S', 'N', 'home-en-06'),
  ]),
 dict(n=2, phase='now', status='next', effort='S', title='Tappable and zoom-safe on a phone',
  plain='On an iPhone, a text box smaller than 16 px makes the whole page zoom in when you tap it. Footer links are 19 px tall. Both are quick fixes.',
  items=[
   ('P1', 'Both apply forms, proof, partner, UTS, Etminan', 'Inputs are 14 to 15 px, so iPhone Safari and Instagram’s browser zoom the page at every field.', 'font-size: 16px on input, select, textarea.', 'S', 'N', 'form-en-03'),
   ('P2', 'Every page', 'Tap targets under 44 px: footer links 19 px (shared partial and Farsi footers), menu button 40 px, inline demo links about 30 px, the level test’s back link 23 px.', 'Pad them to 44 px (partials/footer.html and components.css, fa-product.css, level-test).', 'S', 'N', 'home-en-11, shared-02, home-fa-17, article-14'),
   ('P2', 'Both apply forms', 'The nav plus progress bar cover 113 px of the phone (about a quarter with the keyboard up) and nothing keeps the focused field clear of them.', 'html { scroll-padding-top: 130px }, a slimmer bar on phones, count “5 of 18 required”.', 'S', 'N', 'form-en-06'),
  ]),
 dict(n=3, phase='now', status='next', effort='M', title='Menus and sticky bars that work on every phone',
  plain='On a shorter phone the open English menu runs over the logo and hides the Apply button. The Apply bar at the bottom shows twice on the first screen and keeps pulsing.',
  items=[
   ('P1', 'English pages (shared nav)', 'On 375×667 the open menu paints “Results” over the logo, Apply is off-screen, “فارسی” hides under the bar, the panel cannot scroll, and the icon never becomes ✕. At 901 to 990 px the header Apply is cut (“APPLY NO”).', 'components.css 119 to 134: top-align, overflow-y: auto; shared.js 118: swap to ✕; hide the sticky bar while the menu is open; hamburger breakpoint 900 to 1040.', 'M', 'N', 'home-en-04'),
   ('P2', 'English home', 'The same “Apply Now” shows twice on the first screen and again at the final CTA; header plus bar cover 17% of a phone; the bar’s spoken name (“Apply for the programme”) does not contain its visible words; it pulses forever; iPad portrait gets neither bar nor header Apply.', 'Show the bar only after the hero button scrolls out and hide it at the final CTA; drop the aria-label; no endless pulse.', 'S', 'N', 'home-en-13'),
   ('P2', 'English home', 'At 360 px (a common Android) the ball covers the kicker, the headline wraps to 5 lines and the hero Apply slides under the bar.', 'index.html line 273: clamp(46px, 15vw, 60px) under 480 px; move the ball.', 'S', 'N', 'home-en-12'),
   ('P3', 'English home', 'The big outlined 01–08 section numbers are clipped at the right edge and the 01–03 inside the How-it-works cards sit on top of the first line of text; two numbering systems on one page.', 'Hide the ghost numbers under 900 px; keep one numbering.', 'S', 'N', 'home-en-18'),
  ]),
 dict(n=4, phase='now', status='next', effort='M', title='Home-page bugs',
  plain='The three Apply buttons in the pricing cards do not open the form: they scroll to the bottom of the page. The testimonial arrows go the wrong way. Content stays invisible if the menu file loads slowly.',
  items=[
   ('P1', 'English home', 'The three pricing “Apply Now” buttons jump to #apply (page bottom), not the form, and lose the plan: a Match tap scrolls 9,820 px and needs a second tap.', 'index.html 1229, 1243, 1261 to /form.html?plan=match (and game, set), label “Apply for Match”; form.html pre-ticks the plan and reads ?programme= and ?code=.', 'S', 'N', 'home-en-01, form-en-05'),
   ('P1', 'English and Farsi homes', 'Testimonial arrows are swapped (English: > goes back; > on card 1 jumps to card 7). Auto-scroll is dead on 90 and 120 Hz phones and cannot be paused. Farsi rail is forced left-to-right: first card on the wrong side, the “previous” arrow jumps to the last card.', 'Swap handlers, delete auto-scroll (index.html 1691 to 1752), 44 px dark arrows. Farsi: a real RTL snap rail.', 'S-M', 'N', 'home-en-05, home-fa-09'),
   ('P1', 'English home and every page using shared.js', 'All 67 .reveal blocks stay invisible until JavaScript has fetched the nav and footer. With the file stalled, only the headline shows; with JavaScript off, same.', 'shared.js 336 to 344: start reveal first; a noscript rule.', 'S', 'N', 'home-en-16'),
   ('P2', 'English home', 'Both “Step inside” cards open the same demo home, not Sessions or the Playbook.', 'Point each at a sample ?workout= and ?article=.', 'S', 'N', 'home-en-15'),
   ('P3', 'English home', '22 endless animations (58 playing at once). The headline pulses every 3.2 seconds forever, which is also a WCAG 2.2.2 fail for moving content.', 'Keep the entrance; run the pulse three times then stop; pause the ambient ones off-screen. Your “alive” look stays.', 'S', 'Y', 'home-en-16'),
   ('P3', 'English home', 'The underline under “LAST LONGER.” is clay at 32% over green, which reads as a muddy olive bar; the clay glow turns brown near the hero bottom and the final CTA.', 'A clean full-colour underline or none; a darker base under the glow.', 'S', 'Y', 'home-en-07'),
  ]),
 dict(n=5, phase='now', status='next', effort='M', title='Farsi correctness',
  plain='The phone picture in the Farsi hero shows a greeting and exercise names in white on white. Phone numbers typed in the Farsi form show backwards. Several small right-to-left details are off.',
  items=[
   ('P1', 'Farsi home', 'In the hero phone the greeting and both exercise names are white on white (only “۶×۴” shows); “امروز” is letter-spaced; screen readers read the mock as page text.', '.pscreen { color: var(--ink) } (index-fa.html line 159), remove the spacing, aria-hidden on .phone-wrap.', 'S', 'N', 'home-fa-04'),
   ('P1', 'Farsi apply form, coach.html', 'Contact, email and the counter have no dir="ltr": a typed +98 912 345 6789 shows as “6789 345 912 98+”, the counter reads “۲۷ / ۳”. Persian digits are dropped by Age and by the dashboard’s WhatsApp-link builder, so such a number gets no link at all.', 'dir="ltr" on #contact, #em, #pCount; convert Persian digits to 0 to 9 and 09… to +989… on send; same normaliser in coach.html waLink() (line 4719).', 'S', 'N', 'form-fa-01, form-en-09'),
   ('P2', 'Farsi home and products', 'Method arrows point right in a right-to-left flow; the Instagram handle shows “amirardekanian@”; a middle dot before a digit reads as a zero (“تنیس · ۴ سال” looks like 40 years); Farsi numbers in Barlow Condensed fall back to a serif; about 48 verbs lack the half-space (میشه, میاد); footers show Latin “2026”; heading highlight leaves stray squares.', 'Mirror arrows, <bdi dir="ltr"> on the handle, use “،” not “·”, --disp stack with Vazirmatn, add ZWNJ, Persian year, underline via box-decoration-break.', 'S', 'N', 'home-fa-11 to 16, shared-03'),
   ('P1', 'Farsi home, demo, footers', 'Farsi pages send visitors into English: the demo’s banner (Apply → /form.html, Exit → /), the footer privacy link; and the copy says “message me in the app” though the app is English with no chat (it opens WhatsApp).', 'Reword lines 641 and 647; ?from=fa on demo links so the banner uses the Farsi pages; a FAQ “اپ انگلیسیه؟”. Needs your word on the app.', 'M', 'Y', 'home-fa-03, privacy-04'),
   ('P2', 'Etminan pages', '19 Farsi labels use the mono font with letter-spacing at 9.5 to 11 px, which breaks Farsi joining; in right-to-left the lime ticker is off-screen in 7 of 12 samples.', 'One override block at the end of etminan.html: Vazirmatn, no spacing, 12 px; ticker direction ltr.', 'S', 'N', 'etminan-fa-02, etminan-en-02'),
   ('P3', 'Farsi pages', 'No <main> or skip link on the Farsi home, form, links, partner and product pages; the H1 text runs together (“پدلیه مربی،تو”).', 'Add <main>, a skip link, spaces in the H1.', 'S', 'N', 'home-fa-17, form-fa-02'),
  ]),
 dict(n=6, phase='now', status='next', effort='S-M', title='Fonts: no blank screens, no jumps',
  plain='The Farsi pages wait for Google Fonts before they paint anything. If that request hangs, which is how filtered networks often fail, the screen stays white for about 8 seconds. Your Vazirmatn file is already on your own server and is not being used on those pages.',
  items=[
   ('P1', 'Farsi home, form, links, partner, terms, Etminan, articles', 'First paint waits for the Google Fonts stylesheet: 0.58 s normally, 0.25 s if blocked outright, but 8.3 s when the request hangs.', 'Use the self-hosted /assets/fonts/Vazirmatn-Variable.woff2 (@font-face as fa-product.css line 7, plus a preload); load Barlow without blocking; add Tahoma to the stack. No download needed.', 'S', 'N', 'home-fa-01, article-12, etminan-fa-01'),
   ('P1', 'English home, form, Etminan', 'Late fonts make the page jump: English home 0.096 (the hero shifts 73 px), form 0.087, Etminan Farsi 0.209. In a test, self-hosting took Etminan to 0.0002.', 'Same fix, plus preload for the two heading faces and a metric-matched fallback.', 'S-M', 'N', 'etminan-fa-01, home-en-16'),
   ('P2', 'All English pages', 'Barlow, Barlow Condensed, JetBrains Mono and DM Sans still come from Google (19 pages send the visitor’s IP there; your privacy notice admits it).', 'Self-host the four families (open-licence, about 600 KB). Needs your OK to download them.', 'M', 'N', 'secondary cross-page'),
   ('P3', 'English and Farsi homes, UTS', 'Seven photos (about 710 KB) load immediately with no width or height; the UTS hero photo is requested late (LCP 2.1 s; a test got 0.7 to 1.5 s).', 'loading="lazy", width and height, 720 px copies; preload the UTS hero (UTS page: coordinate with its session).', 'S', 'N', 'home-en-16, uts-02, home-fa-18'),
  ]),
 dict(n=7, phase='now', status='todo', effort='M', title='Forms that finish properly',
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
 dict(n=8, phase='now', status='next', effort='S', title='A real 404 page',
  plain='A wrong or old web address shows GitHub’s grey English page, cut off on a phone, written for the site owner. Two drafts exist (the brand one and a working one); I will merge them.',
  items=[
   ('P1', 'Whole site', '/apply, /about, /faq, /blog, /en/ and /fa/ all show GitHub’s default 404: English only, no brand, no way home, no viewport tag so phones shrink it to about 40%.', 'Add a root 404.html: “OUT.” line-call joke, English and Farsi blocks (Farsi first for Farsi links), Home / Apply / Articles / Free tracker / Open your programme, WhatsApp with the broken path, a Plausible “404” event. Absolute paths, noindex, no canonical.', 'S', 'Y', 'notfound-01'),
  ]),
 dict(n=9, phase='now', status='todo', effort='S-M', title='Count what matters',
  plain='Plausible sees page views, the two apply-form submits, the level-test result and the UTS and Etminan forms. It cannot tell you which button, page or article sells. A few lines of code fix that; you then switch the goals on in Plausible.',
  items=[
   ('P2', 'Every page', 'Not measured: Apply clicks (and which plan), WhatsApp clicks, demo clicks, level-test start and result buttons, proof signup, partner submit, form started or abandoned, 404s. partner-fa and terms-fa have no Plausible at all.', 'One delegated click handler in shared.js and fa-nav.js, events on the proof and partner success, form-step events; list the goal names for you to add.', 'S-M', 'N', 'tennis-09, proof-07, form-en-02'),
  ]),
 dict(n=10, phase='now', status='todo', effort='S', title='Promises that match reality',
  plain='The home says the application takes 2 minutes. The form says about 5 and asks 27 to 30 questions. The proof page promises a private link that no longer exists.',
  items=[
   ('P1', 'English home', '“Application takes 2 minutes” is wrong (the form’s own badge says ~5 min; 8 sections), and it is the only reassurance, in 10 px at the end.', '“About 5 minutes” now (the real fix is package 13); repeat under the hero and sticky buttons. “You pay nothing until we speak” only once you confirm it.', 'S', 'Y', 'home-en-03, form-en-01'),
   ('P2', 'proof.html', 'Two stale promises: “get your link / private link” (links died on 7 Sep: it is a login now) and “eight to start with, switch off anything” (steps, sleep, food and water are always on).', '“Send me my login”; “Four are always on. The rest are optional.”', 'S', 'Y', 'proof-04'),
   ('P2', 'Farsi home', 'Six buttons say “شروع کن” and open a 5-minute, 27-step form without saying so.', '“فرم ۵ دقیقه‌ست · تا ۴۸ ساعت جواب می‌دم” under the buttons; the abroad link points at the DM.', 'S', 'Y', 'home-fa-02'),
   ('P2', 'English home', 'The 60-day promise is the quietest box (dashed, 14 px grey) and vague: a rebuilt plan, not a refund. Nothing says how or when you pay.', 'Move it under the cards at 18 px with one plain line. Needs your facts.', 'S', 'Y', 'home-en-09'),
  ]),
 dict(n=11, phase='now', status='todo', effort='S', title='No-yellow cleanup',
  plain='Your own rule is no yellow or gold anywhere. A few emoji break it.',
  items=[
   ('P2', 'Apply form, level test', 'The plan cards show 🟡 for Set and University and 🟢🟡🔴 radios; the level test’s ⚠️ draws a yellow triangle; emoji also differ per phone (the Iran flag shows “IR” on Windows).', 'Plain text cards or small green and clay SVG marks (form.html 596, 715, 719; level-test.js 159).', 'S', 'N', 'form-en-11, shared-03'),
   ('P3', 'Etminan pages', 'Amber #E08A2E in four places. The reviewer found the neon green and lime are a deliberate co-brand (CSS comment), the amber is the odd one out.', 'Amber to clay or neutral. Their palette, so your call.', 'S', 'Y', 'etminan-en-02'),
  ]),

 dict(n=12, phase='call', status='ask', effort='L', title='English home: shorter and clearer',
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
     pick='B')),
 dict(n=13, phase='call', status='ask', effort='M-L', title='The apply form: promise vs length',
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
     pick='C')),
 dict(n=14, phase='call', status='ask', effort='M', title='Farsi home: price, trust and length',
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
     pick='1')),
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
 dict(n=16, phase='call', status='ask', effort='M', title='Proof page and the Instagram link hub',
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
     pick='1')),
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
 dict(n=19, phase='call', status='ask', effort='M', title='Your voice in the English copy',
  plain='Your own rule says an athlete should read plain words that sound like you typed them. The English home has 43 em-dashes, 8 “X, Y and Z” lists and 24.7-word sentences; it reads at 34 out of 100 (difficult). Forms, proof, privacy and the article closing do the same.',
  items=[
   ('P3', 'English home, forms, proof, privacy, articles', 'Em-dashes: home 43, form 26, proof 12, privacy 36; “Not a PDF. An Experience.”; “from one of the world’s leading programmes” (no university named); “Client Intake Form” is internal jargon (buttons say Apply). Farsi: 22 dashes, 6 semicolons, “X، Y و Z” lines.', 'I write two plain options for each key line; you pick or change; the rest follows the same rule. Keep what already sounds like you: “We adapt.” “Nothing without a reason.”', 'M', 'Y', 'home-en-17, form-en-14, proof-08, article-15, home-fa-16'),
  ],
  decision=dict(title='Example: the same idea, three ways', options=[
     ('Now', 'Today', '“Not a generic fitness plan repackaged for racket sports. This is strength & conditioning designed from the ground up for the movement demands of tennis and padel — the accelerations, the decelerations, the repeated sprints, the rotational force production.”'),
     ('1', 'Option 1', '“This is not a gym plan with a racket added. I build it around how you move on court: fast starts, hard stops, long rallies, big rotation.”'),
     ('2', 'Option 2', '“I write your plan for tennis and padel only. Quick starts, hard stops, long points. That is what we train.”')],
     pick='1')),
 dict(n=20, phase='call', status='ask', effort='M', title='Legal accuracy (needs facts from you)',
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
 dict(n=22, phase='base', status='todo', effort='M', title='A style guard so it stays fixed',
  plain='A small check that runs when you commit and says no if a change brings back yellow, text under 12 px, a pale grey, or letter-spacing on Farsi.',
  items=[
   ('P3', 'Pre-commit', 'Nothing stops regressions: the no-gold rule, the 12 px floor, the grey token, Farsi letter-spacing and Google font links are checked only by people.', 'scripts/check_site_style.py in .githooks/pre-commit, same pattern as the existing guards.', 'M', 'N', 'static scan'),
  ]),
 dict(n=23, phase='base', status='ask', effort='S', title='Can Iran reach the forms, Plausible and the demo?',
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
  ]),
]

QUESTIONS = [
    'How and when does a client pay, and does the 60-day promise mean a rebuilt plan only, or money back? The home, the form and the terms must say the same thing.',
    'Toman: say the rule, or show a figure with a date? (package 14)',
    'Has anyone in Iran opened the demo, the apply form and Plausible with the VPN off? I cannot test from here. (package 23)',
    'Is the apply form now only for tennis and padel players? If yes, I remove football, cricket, weight-loss and “tone & shape” and ask the next event date.',
    'Is the app staying English-only? The Farsi copy says “message me in the app”. (package 5)',
    'Who is proof.html for: English-speaking players or your Iranian followers? (package 16)',
    'Is the UTS page ever sent to people who have not booked? (package 20)',
    'Facts for the privacy notice: do you paste athlete names into AI chats, and is there a written coaching agreement (terms section 7)? (package 20)',
    'May the first screen show your photo and three athletes, and may the Library’s category pictures be reused as article thumbnails and share cards?',
    'Where did you see “claude-design-skills”? Several repos use the name; a link would pin it down.',
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
]

# Appended as work ships: (date, packages, what changed, commit)
SHIPPED = []
