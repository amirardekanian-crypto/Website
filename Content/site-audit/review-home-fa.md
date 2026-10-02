### Pages reviewed: home-fa (index-fa.html, fa-nav.js): mobile 390 (+360 data, live 320 check), tablet 820, desktop 1440, wide 1920 (no tiles; captured live, fine). Real-Chrome checks: hero phone, font failure, testimonial rail, contact card, demo app. Compared with index.html. Evidence images: audit/r1-*.png.

### What works well (keep)
- Hero: green gradient, huge Vazirmatn "یه مربی، تو جیبت.", clay accent, kicker says who it is for, two CTAs above the fold at 390 px.
- Sticky nav keeps "شروع کن" in thumb reach; ☰ panel has correct ← arrows and aria-expanded.
- Farsi craft mostly right: 17-23 px body, warm voice, Persian digits only, no Arabic ي/ك, half-spaces nearly everywhere, no overflow at 320-390.
- Product strip under the hero, ready-made-vs-coach cards, one clear price card, plain FAQ.
- Real athlete photos; credentials match EN (1000+ players, 2 MSc, 7+ and 15 years, FIP #728).
- Light: FCP 0.56 s, CLS about 0, 746 KB, JSON-LD, hreflang pair.

### Findings
| ID | Sev | Area | Finding | Evidence | Fix | Effort | Risk | Needs Amir? |
|---|---|---|---|---|---|---|---|---|
| home-fa-01 | P1 | Robustness (Iran) | First paint waits for Google Fonts. If that request hangs, the screen stays blank. | Verified live: paint 0.58 s; 8.3 s with fonts delayed 8 s; 0.25 s if blocked outright. /tennis/ already self-hosts. | index-fa.html:66 → `@font-face` from fa-product.css:7 + preload of /assets/fonts/Vazirmatn-Variable.woff2; Barlow non-blocking as tennis/index.html:37-42; add Tahoma to `--fa`. | S | low | N |
| home-fa-02 | P1 | Funnel | Six links (5 "شروع کن" + abroad "دایرکت بده", l.789) open a 5-minute, 27-step form without saying so; the contact section calls DM fastest. | form-fa digest; l.816; EN: "No commitment until we speak" (index.html:1668). | Add "فرم ۵ دقیقه‌ست · تا ۴۸ ساعت جواب می‌دم" under hero/price buttons; point the abroad link at the DM; add a one-tap wa.me `?text=` option. | S | low | Y: promise, DM-first |
| home-fa-03 | P1 | Promise vs reality | Page shows a Farsi app and says "message me in the app". The real app is English, has no chat (opens WhatsApp), and its demo sends visitors to English /form.html and /. | Verified live; program.html:4255, 7334; index-fa.html:641, 647. | Reword l.641/647; `?from=fa` on demo links so the banner uses form-fa/index-fa; FAQ "اپ انگلیسیه؟". | M | low | Y |
| home-fa-04 | P1 | Hero phone | Greeting and both exercise names are white on white, so rows show only a tick and "۶×۴". "امروز" is letter-spaced. Screen readers read the mock as page text. | Verified live: `.phi` #fff on #FAF7F2, `.pex .nm` #fff on #fff; mobile tile-01; l.170. | `.pscreen{color:var(--ink)}` (l.159); delete letter-spacing; `aria-hidden` on `.phone-wrap` (l.471). | S | low | N |
| home-fa-05 | P2 | First impression | Phone first screen shows no name, face or credential: brand name hidden ≤560 px, trust bar ~1,630 px down, no photo of Amir (EN has one). | Digest first-screen text; l.139; index.html:1527. | Credential row under the CTAs; shrink the phone ≤560 px; add coach.jpg to About. | M | low | Y: photo |
| home-fa-06 | P2 | Pricing | Iran price is Latin "$25": no Toman figure, no payment method. EN's intake call, performance report, 60-day promise and 48 h reply are missing; cost is the last FAQ. | l.776-786, 806; index.html:1212, 1266, 1666. | Toman line or "رو تو پیام اول می‌گم"; payment FAQ; promise if it applies; cost FAQ up. | M | low | Y |
| home-fa-07 | P2 | Products | Only the $17 course gets a primary button; coaching gets a ghost "جزئیات ←" that jumps ~10,000 px. The "ready-made program" card (l.595) attacks what the course card sells. Top bar pushes a coaches-only app to players. | l.437, 565, 573, 595. | Pick the lead product; add a "کدوم برای منه؟" line; give coaching "شروع کن". | S | low | Y |
| home-fa-08 | P2 | Length | 20.8 phone screens; "personal + weekly update" repeats six-plus times; features, method, Library and About take ~6,600 px (38%). | Digest SECTIONS. | ≤560 px: 2-column feature tiles, one-line pillars, Library as a link, About merged into proof (aim ~15 screens). | M | med | Y |
| home-fa-09 | P2 | Carousel (RTL) | Rail is forced LTR: first card sits left, the right arrow ("قبلی") jumps to the LAST card, auto-scroll never moved in 9 s, arrows cover names at 1440. | Verified live: first tap on right arrow → scrollLeft 1266 of 1266; l.251, 258, 859-880; desktop tile-07. | Real RTL scroll-snap rail (first card right, "next" left), no auto-scroll. | M | med | N |
| home-fa-10 | P2 | Contrast | Clay text on paper 3.7-4.4:1; clay-2 on lit hero green 2.1-2.3:1 (H1 accent, kicker); white on clay 4.4:1; testimonial meta 4.27:1. | Digest; hero background sampled #17654A. | Same-hue steps: #B34726 small text on light (5.1), #F39671 small text on green (4.6), top bar #B44A28 (5.3), darker hero light stop. | S | low | Y: palette |
| home-fa-11 | P2 | RTL arrows | Method flow arrows point right in an RTL flow, so it reads "cycle → program". | Mobile tile-05; desktop tile-03; l.628-631. | Use ← or `.ar{transform:scaleX(-1)}`. | S | low | N |
| home-fa-12 | P2 | Bidi | Instagram handle shows "amirardekanian@", so people copy it wrong. | Verified live (r1-contact-mobile.png); l.819. | `<bdi dir="ltr">@amirardekanian</bdi>`. | S | low | N |
| home-fa-13 | P2 | Farsi typography | A middle dot before a digit reads as a Persian zero: "تنیس · ۴ سال با هم" looks like "۴۰ سال" (40 years). | Zoomed live crop; l.687, 700, 739. | Use "،" or a line break instead of "·". | S | low | N |
| home-fa-14 | P2 | Fonts | Trust-bar words/digits and pillar ۰۱-۰۳ are Farsi set in Barlow Condensed, so the device substitutes a serif (Times New Roman on the test PC). | CDP platform fonts; l.76, 188, 214. | `--disp:'Barlow Condensed','Vazirmatn',sans-serif`, as fa-product.css:13. | S | low | N |
| home-fa-15 | P3 | Visual glitch | Heading highlighter breaks when the accent wraps: a 6×4 px pink square floats under 5 headings on phones. | Verified live (r1-accent-whysech.png); l.386-389. | Underline with background-size + `box-decoration-break:clone`. | S | low | N |
| home-fa-16 | P3 | Farsi polish, voice | No half-space in "میشه" ×4, "میاد", "میری"; footer year is Latin "2026"; 22 em-dashes, 6 semicolons, X، Y و Z lines read brochure-like (COM-3). | l.465, 558, 563, 579, 858; digest COPY. | Add ZWNJ and `fa()` year (N); rewrite dash lines as short sentences (Y). | S | low | Y: voice |
| home-fa-17 | P3 | A11y, taps | Footer links 26 px, demo link 30 px, "دایرکت بده" 25 px tall; no `<main>` or skip link; H1 text runs together ("پدلیه مربی،تو"); 📩📷💬📝 emoji clash with the palette. | Digest TAP/STRUCT; h1.textContent. | Padding; `<main>` + skip link; spaces in H1; SVG icons. | S | low | N |
| home-fa-18 | P3 | Weight, sharing | Five 84-124 KB photos (1,130-1,280 px shown at ~330) load eagerly, no sizes; 25 animations at load; social card is the English "AA PERFORMANCE" image. | Digest IMAGES/PERF; og-image.jpg. | `loading="lazy"`, width/height, 720 px copies; Farsi 1200×630 card. | S | low | Y: card |

### Cross-page patterns you noticed
- Farsi pages leak into English: demo banner (Apply → /form.html, Exit → /) and footer "حریم خصوصی" → English privacy.html. Check links.html for the same demo link.
- Every root Farsi page (form-fa, links, terms-fa, partner-fa, etminan) loads Google Fonts; /tennis/ and both apps self-host. Fix once in a shared font file.
- EN should borrow from FA: type scale (EN: 65 text elements under 12 px, FA 1; 10 tap targets under 24 px, FA 0), one sticky bar carrying the CTA (EN's two bars cover 17% of a phone), the compare cards, short plain sentences.
- FA should borrow from EN: `<main>` + skip link, "no commitment until we speak", the 60-day promise, Amir's photo, the sixth testimonial (Helen Taheri).
- Clay on paper (4.1:1) and clay-2 on green (2.1-3.1:1) are site-wide tokens: fix once.

### Questions only Amir can answer
1. Should the main "شروع کن" stay a 5-minute form, or get a one-tap WhatsApp/DM path beside it (the page says DM is fastest)?
2. On price, may Farsi visitors see a Toman figure with a date and how to pay, and do the 60-day promise and intake call apply to the Iran price?
3. Is the app staying English-only? If yes, say so on the page and keep demo visitors on Farsi pages; if a Farsi UI is coming, the hero picture is a preview.
