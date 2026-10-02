### Pages reviewed: home-en (index.html). Mobile 390 (plus 375/360/320 checks), tablet 820, desktop 1440, wide 1920 (no wide tiles existed, so I took real-viewport shots), 14 live probes.

### What works well (keep)
- "Built for you if / Not the right fit if": honest self-qualifying that builds trust.
- "Try the live demo ... No sign-up": the real product, zero friction.
- Named athletes with real photos and bold pull-outs; the FAQ asks the right objections ("An app gives you a workout. I give you a coach." is Amir's voice).
- Game / Set / Match ladder with Match in green and clay; a 60-day promise exists.
- No yellow or gold; fast (FCP 0.3-0.5 s); no console errors; no sideways scroll 320-1920 px; native `<details>` FAQ, skip link, alt text, scroll-spy nav.

### Findings (most important first)
Brackets give: severity, area, effort, risk, Needs Amir (Y/N).

**home-en-01** [P1, Conversion, S, low, N] The three pricing "Apply Now" buttons jump to `#apply` (page bottom), not the form, dropping the plan the form asks for first. *Evidence:* real viewport: a Match tap scrolls 9,820 px, then needs a second tap. *Fix:* index.html 1229/1243/1261 to `/form.html?plan=match` etc, label "Apply for Match"; form.html 591-599 pre-ticks the radio.

**home-en-02** [P1, Hero clarity, M, low, Y] The hero never says "online coaching" and shows no face, athlete or number; title, kicker and footer say "tennis" only. Credentials sit below a ticker; on desktop the right half is empty but for a ball. *Evidence:* cred strip starts at 903 px on an 844 px phone; R0-w-hero.png. *Fix:* index.html 943-953: sub names "online coaching with Amir (MSc S&C)", proof row under the buttons (3 athlete faces, "1000+ players"), portrait or phone mock on desktop, drop ticker 1.

**home-en-03** [P1, Microcopy, S, low, Y] "Application takes 2 minutes" is wrong: the form's own badge says "~5 min", 8 sections. It is the only reassurance, in 10 px at page end; nothing says when you pay. *Evidence:* index.html:1668, form.html:553. *Fix:* "About 5 minutes. You pay nothing until we speak" (confirm), repeated under hero and sticky buttons.

**home-en-04** [P1, Mobile menu, M, med, N] The open menu overflows phones under ~840 px high: at 375x667 "Results" paints over the logo, Apply is off-screen, "فارسی" hides under the sticky bar, and the panel cannot scroll. No X icon; toggle 40 px. At 901-990 px the header Apply is cut off. *Evidence:* real viewport at 375x667, 360x640, 320x568, 960 wide. *Fix:* components.css 119-134 top-align plus `overflow-y:auto`; hide the sticky bar while `.nav-open`; icon swap in shared.js 118; breakpoint 900 to 1040.

**home-en-05** [P1, Slider, S, low, N] Arrows are swapped (> goes back, < goes forward; > on card 1 jumps to card 7). Auto-scroll adds sub-pixel steps: ~22 px/s at 60 Hz, dead at 90/120 Hz, no pause (WCAG 2.2.2). Arrows are 40 px, white on white. *Evidence:* real viewport: from card 3, > gives 2, < gives 4; refresh rates emulated. *Fix:* index.html 1739-1752 swap handlers; delete auto-scroll 1691-1732; 44 px dark arrows.

**home-en-06** [P1, Keyboard focus, S, low, N] The focus ring is dark green, invisible on every dark area (nav, hero buttons, demo, final CTA); the testimonial scroller is an unnamed tab stop. *Evidence:* 59 tab stops, `2px rgb(14,74,54)`; R0-focus-12.png. *Fix:* base.css:216 white outline inside `.hero,.sec--dark,.site-nav`; `role="region" aria-label` on `.testimonials-viewport`.

**home-en-07** [P1, Contrast, S, low, Y] Clay on green fails: hero kicker 1.8:1, "Elite Athletes" 2.0 and "An Experience." 1.6 (need 3), Match's key line 3.2, INCLUDED badge 2.6; even clay-2 is 2.9 at 11 px. Olive underlines and clay glow make the muddy zones. *Evidence:* real-pixel measures; tiles 02, 07. *Fix:* `.hero .kicker`, `.sec--dark .sec-h em` to `#E06B43`; small labels on green in paper with a clay dot.

**home-en-08** [P2, Pricing, M, low, Y] Cards repeat the "Every programme includes" strip, so tiers look alike. No currency (USD only in JSON-LD); $60/$50 per month is tiny grey; the strip is a 144-character line; Match is 2,000 px down on phones. *Evidence:* tiles 04-05. *Fix:* "Everything in Game, plus..."; add "USD"; "$50/mo, save 29%" large; strip as a checklist.

**home-en-09** [P2, Trust, S, low, Y] The 60-day promise is the quietest box (dashed, 14 px grey) and vague: "feel measurably stronger", a rebuilt plan not a refund, 60 days against a 1-month plan. Nothing says how or when you pay. *Evidence:* index.html 1266-1270; terms.html section 7. *Fix:* move under the cards at 18 px; one plain line on scope and payment.

**home-en-10** [P2, Page length, L, med, Y] ~17,000 px (20 screens) on a phone: pricing 2,437, About 2,272, Platform 2,120, Fit check 1,678. Claims repeat 3-4 times; Contact repeats the footer; price comes before process and coach. *Evidence:* digest SECTIONS. *Fix:* cut ~3,500 px (fit lists 3+3, About 4 to 2 blocks, Contact to one button, platform cards 5 to 3); order proof, process, About, pricing, FAQ.

**home-en-11** [P2, Typography, M, low, N] 64 text items under 12 px (mono, 2-3 px tracking); greys #8A8A8A 3.2:1 and #B0A99E 2.0:1 (ticker caption, footer copyright); 52 of 65 body blocks are weight 300 at 15 px or less; footer links 19 px tall. *Evidence:* real-pixel contrast, probe counts. *Fix:* tokens.css 33-34 `--text-muted:#6B6B6B`, no `--text-dim` for text; labels 12 px+; body 400; 44 px footer taps.

**home-en-12** [P2, Small phones, S, low, N] At 360 px (common Android) the ball covers the kicker, the H1 wraps to 5 lines, the underline overshoots and the hero Apply hides under the sticky bar; 6 lines at 320. *Evidence:* real viewport 360x740, 320x640. *Fix:* index.html 273 `clamp(46px,15vw,60px)` under 480 px; 266 `.hero-ball--main{top:4%}`.

**home-en-13** [P2, Sticky bar, S, low, N] Identical "Apply Now" twice on the first screen and again at the final CTA; header plus bar cover 17%. aria-label "Apply for the programme" differs from the visible text (WCAG 2.5.3). iPad portrait (769-900 px) has neither header Apply nor bar. *Evidence:* real viewport. *Fix:* show the bar after the hero button leaves view, hide at `#apply`; drop the aria-label.

**home-en-14** [P2, Testimonials, M, low, Y] Quotes run 71-108 words in 14 px light italic; 5 of 7 start "I worked with Amirhossein", 6 say "strongly recommend", so they read scripted; no numbers. "Elite Athletes" heads a recreational player and a "short, colleague" quote; "FIP #728" will go stale. *Evidence:* index.html 1065-1181. *Fix:* bold pull-out first, "Read more"; one result line each; drop the weakest.

**home-en-15** [P2, Doors, S, low, N] Both "Step inside" cards open the same demo home, not Sessions or the Playbook; program.html already supports `?workout=` and `?article=`. *Evidence:* index.html 1465, 1474; program.html 5856. *Fix:* point each at a sample id.

**home-en-16** [P2, Robustness, S, low, N] All 67 `.reveal` blocks stay invisible until JS fetches nav and footer: JS off shows only the H1; partials stalled 8 s hide hero text and Apply. 7 photos (~710 KB) load eagerly without width/height (CLS 0.096 on slow 4G); 41 infinite animations. *Evidence:* JS-off probe, R0-m-partials-slow-4s.png. *Fix:* shared.js 336-344 call `wireReveal()` first; `<noscript>` rule; `loading="lazy"` plus dimensions.

**home-en-17** [P3, Copy COM-3, M, low, Y] 43 em-dashes, 8 triads, 24.7-word sentences. "Improving movement, stroke quality, and resilience — in one season", "Not a PDF. An Experience.", "from one of the world's leading programmes" (no university named). Keep "We adapt." and "Nothing without a reason." *Evidence:* digest COPY. *Fix:* Amir rewrites; Claude offers two plain options per line.

**home-en-18** [P3, Polish and SEO, S, low, Y] About rows split into two columns (flex `li`); ghost 01-03 sit on card text and clash with section 01-08; meta description is 211 characters; share image says "AA Performance" (not on the page) with no person; no email shown though "email support" is sold. *Evidence:* tile-11, R0-m-method.png, R0-og-image.jpg. *Fix:* index.html 818 `li{display:block}`; hide `.stack-num` under 900 px; description 155; new OG; mailto in Contact.

### Cross-page patterns
- The tiny muted mono label style (`.kicker`, `.eyebrow`, `.card-eyebrow`, `--text-muted`, `--text-dim`) is shared CSS: fix once in tokens.css/base.css for every page.
- The shared nav (components.css 107-144, shared.js 113-140) brings the menu clipping, missing X and 901-990 px cut-off to every page that loads shared.js; base.css:216's green focus ring is invisible on any dark section site-wide.
- `.reveal` plus JS-injected nav/footer hides content until JS runs on all those pages.
- form.html: programme radios use 🟢🟡🔴 (🟡 breaks "no yellow") and say "~5 min" while home says 2 (for the form reviewer).

### Questions only Amir can answer
1. How and when does a client pay, and does the 60-day promise mean a rebuilt plan only or money back? Page, form and terms must agree.
2. Which university gave the MSc, and may the first screen show your photo plus three athletes (and testimonials be cut to the bold lines plus one result each)?
3. Keep the "alive" motion (pulsing headline, tickers, floating balls) or calm it down, and may the phone page lose about a fifth (Contact into the footer, shorter About)?
