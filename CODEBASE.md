# Your Website — Plain-English Guide

A human-friendly map of every file in this project. Written for the owner of the site, not a developer. Share this whole file with any AI assistant and they'll know how to help you safely.

---

## Quick Summary

This is a small, hand-built website. It has:

- Five pages you can visit: **home**, **apply form**, **athlete programme**, **privacy**, **terms**
- A shared "look and feel" system so every page matches
- A tiny bit of JavaScript that adds the menu, footer, video pop-ups, and the "install app" prompt
- Some support files for Google, hosting, and icons

No database. No backend. No build step. When you edit a file, it's live the moment it's pushed to GitHub.

---

## File-by-File Guide

### Pages (HTML files)

#### `index.html` — Home page
- **What it does:** The front door. Hero headline, benefits, credentials, FAQ, and calls-to-action that send visitors to the apply form.
- **If deleted:** The site has no home page. Visitors landing on `amirardekani.com` see a "not found" error.
- **Depends on:** `assets/css/*.css`, `assets/js/shared.js`, `partials/nav.html`, `partials/footer.html`, `assets/img/og-image.png`, `manifest.json`.
- **Edit this when:** Changing headline copy, rewording sections, updating your credentials, changing the FAQ, swapping the hero image.
- **Don't touch:** The `<script type="application/ld+json">` block near the top (Google reads this) unless you know what it does. The `<meta>` tags at the top (these are SEO).

#### `form.html` — Application form
- **What it does:** The intake questionnaire new athletes fill in. Seven sections, a progress bar, and a success screen. Submissions go to your email via Web3Forms.
- **If deleted:** No one can apply. Every "Apply Now" button on the site breaks.
- **Depends on:** `assets/css/*.css`, `assets/js/shared.js`, `partials/nav.html`, `partials/footer.html`, Web3Forms (external service).
- **Edit this when:** Adding, removing, or rewording form questions. Changing which options appear in dropdowns.
- **Don't touch:** The Web3Forms `access_key` value (breaks submissions). The `<script>` at the bottom that runs the progress bar, unless you're ready to test it carefully.

#### `program.html` — The athlete app
- **What it does:** The private training app. Loads an athlete's programme from a JSON file in `/data/`. Shows daily workouts, videos, timers, weight logs, RPE scoring.
- **If deleted:** All athletes lose access to their programme.
- **Depends on:** `data/*.json` (one per athlete), `assets/js/shared.js` (for the video pop-up and "install app" prompt), `manifest.json`, icon files.
- **Edit this when:** You want to change how the training app looks or behaves, add new features to the training screens, or tweak the styling.
- **Don't touch:** This file is large and self-contained. Most day-to-day changes happen in `data/*.json`, not here. Ask an AI assistant to guide you before structural edits.

#### `privacy.html` — Privacy Notice
- **What it does:** Your GDPR-compliant privacy statement covering the form, analytics, and embedded YouTube.
- **If deleted:** You break UK/EU law and the link in the footer 404s.
- **Depends on:** `assets/css/*.css`, `assets/js/shared.js`, partials.
- **Edit this when:** You change what services you use, change retention periods, or update your contact details.
- **Don't touch:** The structure — the numbered sections are there for legal reasons.

#### `terms.html` — Terms of Use
- **What it does:** Legal disclaimers around training, liability, intellectual property.
- **If deleted:** You lose legal cover and the footer link breaks.
- **Depends on:** Same as privacy.html.
- **Edit this when:** You change how you run the business, pricing model, or jurisdiction.
- **Don't touch:** The health/training disclaimer and liability sections without professional review.

---

### Shared "Look and Feel" (CSS)

#### `assets/css/tokens.css` — The brand palette
- **What it does:** The single place where colours, fonts, spacing, and sizes are defined. Change a colour here and it updates across every page.
- **If deleted:** Every page loses its colours, fonts, and spacing. Everything looks broken.
- **Depends on:** Nothing. It's the foundation.
- **Edit this when:** You want to change a brand colour (like the yellow accent), swap fonts, or adjust the site's base spacing.
- **Don't touch:** The variable names (the part before the colon). Only change the values after the colon.

#### `assets/css/base.css` — Basic styling rules
- **What it does:** Sets up typography, headings, buttons, containers, and the subtle film grain effect. Every page uses these styles.
- **If deleted:** Headings, buttons, and body text lose their styling.
- **Depends on:** `tokens.css`.
- **Edit this when:** You want to change how headings, buttons, or body text look everywhere.
- **Don't touch:** Unless you're deliberately restyling the whole site.

#### `assets/css/components.css` — Reusable pieces
- **What it does:** Styles for the navigation bar, footer, cards, form fields, video pop-up, and the "install app" prompt.
- **If deleted:** The menu, footer, cards, and form inputs lose their styling.
- **Depends on:** `tokens.css` and `base.css`.
- **Edit this when:** You want to restyle the nav, footer, cards, or form inputs.

---

### Shared Behaviour (JavaScript)

#### `assets/js/shared.js` — The glue script
- **What it does:** Runs on every marketing page. It (a) injects the nav and footer from the partial files, (b) highlights the active menu link, (c) wires up the mobile menu, (d) fades things in as you scroll, (e) handles the video pop-up, (f) shows the "install app" prompt on the training app.
- **If deleted:** No menu. No footer. No video pop-ups. No mobile nav. The site looks unfinished and bare.
- **Depends on:** `partials/nav.html`, `partials/footer.html`.
- **Edit this when:** You want to change how the video pop-up or "install app" prompt behaves.
- **Don't touch:** Unless you're comfortable with JavaScript. This is the most fragile file to edit by hand.

---

### Reusable HTML Pieces (Partials)

#### `partials/nav.html` — The menu bar
- **What it does:** The top navigation bar shown on every page. Edit it once, every page updates.
- **If deleted:** No menu appears on any page.
- **Depends on:** Loaded by `shared.js`.
- **Edit this when:** You want to add, remove, or rename a menu link.

#### `partials/footer.html` — The site footer
- **What it does:** The footer shown at the bottom of every page (copyright, Privacy, Terms, etc.).
- **If deleted:** No footer anywhere.
- **Depends on:** Loaded by `shared.js`.
- **Edit this when:** You want to add a social link, change the copyright text, or add a footer link.

---

### Data

#### `data/*.json` — Athlete programmes
- **What it does:** Each file is one athlete's full training programme. `program.html` reads the right file based on the `?client=...` part of the URL.
- **If deleted:** That athlete loses access to their programme.
- **Depends on:** `program.html` reads them.
- **Edit this when:** You're updating an athlete's weekly workouts, adding video links, changing their focus, or creating a new client.
- **See also:** `SCHEMA.md` — the cheat-sheet for what fields each JSON can contain.

#### `SCHEMA.md` — The JSON field guide
- **What it does:** Documents every field you can use in an athlete JSON file.
- **If deleted:** You lose the reference guide. The site keeps working.
- **Edit this when:** You add a new optional field to your JSON files and want to document it.

---

### Assets (Images and Icons)

#### `assets/img/og-image.png` — Social share image
- **What it does:** The image that shows up when someone shares your link on WhatsApp, Twitter, LinkedIn, etc.
- **If deleted:** Shared links show no preview image.
- **Edit this when:** You refresh your branding.

#### `assets/img/favicon.svg`, `favicon-32.png`, `favicon.ico`
- **What it does:** The tiny icon in the browser tab.
- **If deleted:** Browser tab shows a generic icon.

#### `assets/img/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- **What it does:** The app icons used when someone installs the training app to their phone home screen.
- **If deleted:** Installed app shows a blank white icon.

#### `assets/img/generate_icons.py`
- **What it does:** A helper script that regenerates all the icons above from one source. You don't need to run it unless you're changing the logo.
- **If deleted:** No effect on the live site. You just lose the helper.

---

### Support Files (Hosting & Search Engines)

#### `CNAME`
- **What it does:** One line. Tells GitHub your custom domain is `www.amirardekani.com`.
- **If deleted:** Your site reverts to a `github.io` URL. Custom domain stops working.
- **Don't touch** unless you're moving to a different domain.

#### `manifest.json` — App install information
- **What it does:** When someone adds the training app to their phone home screen, this tells the phone the app's name, icon, and colours.
- **If deleted:** "Install app" feature stops working. Normal pages still work.
- **Edit this when:** You change the app's name or brand colour.

#### `robots.txt` — Search engine instructions
- **What it does:** Tells Google "crawl my public pages, but don't index the private training app or athlete data".
- **If deleted:** Search engines may accidentally index private athlete programmes.
- **Edit this when:** You add a new section that should or shouldn't be indexed.

#### `sitemap.xml` — Map for Google
- **What it does:** Lists the public pages so Google can find them all quickly.
- **If deleted:** Google still finds your site, just a bit slower.
- **Edit this when:** You add a new public page.

#### `favicon.ico` (root copy)
- **What it does:** A backup copy of the browser tab icon at the top of the site, for older browsers that only look here.

---

## How It All Works Together (Architecture)

Think of it like a house:

- **`tokens.css`** is the paint palette and furniture style guide.
- **`base.css`** decides how walls, floors, and ceilings are built.
- **`components.css`** is the pre-made furniture (sofas, tables, lamps) you place in every room.
- **`shared.js`** is the handyman that, on every page, hangs the nav on the hallway wall, drops the footer into the basement, and makes sure the video pop-up works.
- **`partials/nav.html`** and **`partials/footer.html`** are the single "master" copies of the menu and footer — change them once, every page shows the change.
- The five **pages** are the rooms. Each room reuses the same paint, furniture, and handyman — but has its own purpose (welcome, apply, train, legal).
- The **data folder** is a filing cabinet of athlete programmes.
- **Support files** (CNAME, manifest, robots, sitemap) are the street sign, doorbell plaque, and post-office forwarding instructions.

---

## What Happens When a Visitor Opens Your Site

1. Visitor types `amirardekani.com` in the browser.
2. GitHub Pages looks at `CNAME`, matches the domain, and serves `index.html`.
3. `index.html` loads the three CSS files (paint, walls, furniture) and the `shared.js` script.
4. `shared.js` quietly fetches `partials/nav.html` and drops it into the top of the page, then does the same for the footer.
5. `shared.js` also wires up the mobile menu, scroll animations, and the year in the footer.
6. The visitor reads the page. Anything that says "Apply" links to `/form.html`.
7. On the apply page, they fill in the form. The progress bar updates as they go. On submit, the form posts to Web3Forms, which emails you.
8. Later, you give an accepted athlete a link like `/program.html?client=their_id`.
9. `program.html` reads the `client=` bit, fetches `data/their_id.json`, and builds their whole training app from that file.
10. When they press play on an exercise video, `shared.js` opens a YouTube pop-up inside the page.
11. After a few seconds, the app offers them an "Install to home screen" prompt so it feels like a real app on their phone.
12. Anonymous visitor stats are reported to Plausible (no cookies, no personal data).

---

## The 20% of Files You'll Edit 80% of the Time

In rough order of how often you'll touch them:

1. **`data/*.json`** — Every time you write, update, or rotate an athlete's programme. This is your daily work.
2. **`index.html`** — When you reword your pitch, update the FAQ, swap a testimonial, or change a CTA.
3. **`form.html`** — When you want to add or tweak an application question.
4. **`partials/nav.html`** and **`partials/footer.html`** — When you add a new page, rename a menu item, or add a social link.
5. **`assets/css/tokens.css`** — If you ever rebrand (new accent colour, new font).

Everything else you can usually leave alone. If an AI assistant tells you to edit something outside this list, ask it to explain why first.

---

## Rules of Thumb

- **Before deleting anything**, search the rest of the project for its name. If other files mention it, don't delete.
- **After editing the menu or footer**, check every page — they all share those partials.
- **After editing `tokens.css`**, check every page — the change shows up everywhere.
- **Never commit** a file named `.env`, anything with passwords, or athlete data you don't want public if your repo is public.
- **When in doubt**, ask an AI assistant to show you a preview of the change before you push it live.
