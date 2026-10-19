### Shared Behaviour (JavaScript)

#### `assets/js/shared.js` — The glue script
- **What it does:** Runs on every marketing page. It (a) injects the nav and footer from the partial files, (b) highlights the active menu link, (c) wires up the mobile menu, (d) fades things in as you scroll, (e) handles the video pop-up, (f) shows the "install app" prompt on the training app.
- **If deleted:** No menu. No footer. No video pop-ups. No mobile nav. The site looks unfinished and bare.
- **Depends on:** `partials/nav.html`, `partials/footer.html`.
- **Edit this when:** You want to change how the video pop-up or "install app" prompt behaves.
- ⚠️ **The video pop-up embeds from `www.youtube.com`, on purpose — do not "restore" `youtube-nocookie.com`.** (2026-09-20.) It is the small play button on circuit items; standard exercises play through `loadInlineVideo()` in `program.html`, which always used `www.youtube.com`. In Iran the cookieless nocookie player gets YouTube's "sign in to confirm you're not a bot" wall while the other one plays on the same phone (an athlete in Iran reported exactly that split). Keep the two players on the same host, and keep `privacy.html` §2.7 in step. The Farsi course app (`tennis/app/app.js`, `ytId()`) moved to `www.youtube.com/embed` as well on 2026-09-23 (`FARSI-PRODUCTS.md`).
- **Don't touch:** Unless you're comfortable with JavaScript. This is the most fragile file to edit by hand.

#### `assets/js/fa-nav.js` — The phone menu on the Farsi pages
- **What it does:** Opens and closes the ☰ menu on `index-fa.html`, `/tennis/` and `/tennis-testing/`, which keep their own nav instead of `partials/nav.html`. On phones their menu links drop down as a panel under the green bar; this closes it again on a link tap, a tap outside, Escape, or when the window grows wide enough to show the links in the bar.
- **If deleted:** The ☰ button does nothing, so phone visitors cannot reach those pages' menu links.
- **Depends on:** The look lives in each page: `index-fa.html`'s own CSS and `assets/css/fa-product.css`.
- **Edit this when:** You change how the phone menu opens or closes. Bump its `?v=` on all three pages, because `sw.js` serves `/assets/` cache-first.

#### `assets/js/track.js` — The click and form-step counter
- **What it does:** Sends Plausible events that say which button, page or form section leads to an application (2026-10-02, website audit package 9): **Apply Click** (plan, where on the page, which page), **WhatsApp Click**, **Demo Click** (programme, AA Proof or course), **Hub Click** (links.html only), **Form Started** and **Form Step** (the first answer in each of the apply form's sections: where people stop). Nothing personal goes out. The goal names and their props are listed at the top of the file; each shows in Plausible only after Amir adds it under Site settings > Goals.
- **Loaded by:** `index.html`, `index-fa.html`, `form.html`, `form-fa.html`, `proof.html`, `links.html`, `partner-fa.html`, `tennis/index.html`, `tennis-testing/index.html`. Not on the generated article pages (their generator is `scripts/build_article_pages.py`).
- **If deleted:** Nothing breaks. The counts stop. The events sent by the pages themselves (Form Submitted, Proof Signup, Partner Application, Level test N, 404) keep working.
- **Edit this when:** A new button should be counted or a page's markup changes. `whereOf()` names a click by the nearest `.site-nav`, `.mobile-sticky-cta`, `.pricing-card`, `.hero`, `.cta-section` or `footer`. Bump its `?v=` on all nine pages, because `sw.js` serves `/assets/` cache-first.

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
