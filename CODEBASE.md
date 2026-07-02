# Your Website — Plain-English Guide

A human-friendly map of every file in this project. Written for the owner of the site, not a developer. Share this whole file with any AI assistant and they'll know how to help you safely.

---

## Quick Summary

This is a small, hand-built website. It has:

- Public pages anyone can visit: **home**, **apply form**, **privacy**, **terms**
- Private pages reached only by a direct link: the **athlete programme** and the **coach dashboard**
- A shared "look and feel" system so every page matches
- A tiny bit of JavaScript that adds the menu, footer, video pop-ups, and the "install app" prompt
- A **Supabase** database (added after this site first launched) that backs up athlete progress to the cloud and powers the coach dashboard and two-way messaging
- A small **Notion sync** that keeps the exercise-video list up to date
- Some support files for Google, hosting, and icons

No build step. When you edit a page, it's live the moment it's pushed to GitHub. The only "backend" is Supabase — a hosted database the pages talk to directly; there is no server of your own to run.

---

## File-by-File Guide

### Pages (HTML files)

#### `index.html` — Home page
- **What it does:** The front door. Hero headline, benefits, credentials, FAQ, and calls-to-action that send visitors to the apply form.
- **If deleted:** The site has no home page. Visitors landing on `amirardekani.com` see a "not found" error.
- **Depends on:** `assets/css/*.css`, `assets/js/shared.js`, `partials/nav.html`, `partials/footer.html`, `assets/img/og-image.jpg`, `manifest.json`.
- **Edit this when:** Changing headline copy, rewording sections, updating your credentials, changing the FAQ, swapping the hero image.
- **Don't touch:** The `<script type="application/ld+json">` block near the top (Google reads this) unless you know what it does. The `<meta>` tags at the top (these are SEO).

#### `form.html` — Application form
- **What it does:** The intake questionnaire new athletes fill in. Seven sections, a progress bar, and a success screen. Submissions go to your email via Web3Forms.
- **If deleted:** No one can apply. Every "Apply Now" button on the site breaks.
- **Depends on:** `assets/css/*.css`, `assets/js/shared.js`, `partials/nav.html`, `partials/footer.html`, Web3Forms (external service).
- **Edit this when:** Adding, removing, or rewording form questions. Changing which options appear in dropdowns.
- **Don't touch:** The Web3Forms `access_key` value (breaks submissions). The `<script>` at the bottom that runs the progress bar, unless you're ready to test it carefully.

#### `program.html` — The athlete app
- **What it does:** The private training app. Four tabs: **Home** (current cycle + progress), **My Plan** (daily workouts, videos, timers, weight logs, RPE scoring), **Coach** (messaging + notes), **Library** (a [Read | Train] split — Read shows coach-published articles; Train shows on-demand workout sessions). Loads an athlete's programme from `/data/`. Each article and workout has its own shareable deep-link URL (`?article=<id>` / `?workout=<id>`). Demo mode (`?client=demo`) shows a read-only preview without a key.
- **If deleted:** All athletes lose access to their programme.
- **Depends on:** `data/*.json` (one per athlete), `content/index.json` + `content/**/*.json` (Read article library), `workouts/index.json` + `workouts/**/*.json` (Train workout library), `exercise_library.json` (maps exercise names to videos), `assets/js/shared.js` (for the video pop-up and "install app" prompt), `manifest.json`, icon files, and **Supabase** (it backs up each athlete's progress to the cloud and reads/sends messages).
- **Edit this when:** You want to change how the training app looks or behaves, add new features to the training screens, or tweak the styling.
- **Don't touch:** This file is large and self-contained. Most day-to-day changes happen in `data/*.json`, `content/`, and `workouts/`, not here. Ask an AI assistant to guide you before structural edits.

#### `coach.html` — Coach dashboard (private)
- **What it does:** Your private admin view. You sign in with Google (locked to your coach email) and see every athlete's progress synced from `program.html`: who finished sessions, when they were last active, their notes, plus charts. It's also where you **create a secure link** for a new athlete (a per-athlete secret key) and where you **send messages** to athletes.
- **If deleted:** You lose the dashboard. Athletes are unaffected — their app keeps working — but you can no longer view progress, mint new athlete links, or message anyone from one place.
- **Depends on:** Supabase (the `supabase-js` library loaded from a CDN, plus the tables in the `supabase/` folder), Google sign-in, `favicon.ico`. It does **not** use the shared CSS/JS partials — it's self-contained.
- **Edit this when:** You want to change what the dashboard shows, add a chart, or change the messaging flow.
- **Don't touch:** The Supabase URL/key and the sign-in email check unless you know what they do. This page is `noindex` on purpose — keep it that way.
- **See also:** `COACH_DASHBOARD.md` — the full user manual for this page.

#### `call-log.html` — Weekly check-in log (private)
- **What it does:** Your tool for running and recording the **weekly athlete check-in call** — a structured 8-section script with /10 scores, wins, goals and flags. Same Google sign-in as the dashboard. Also builds **copy-and-paste AI prompts** (run in any free AI chat) for a weekly summary and an end-of-cycle report, and per-question **Farsi** prompts for running the check-in over WhatsApp.
- **If deleted:** You lose the check-in tool. Athletes and the dashboard are unaffected; saved logs stay in the database.
- **Depends on:** Supabase (`supabase-js` from a CDN, the `call_logs` / `cycle_reports` tables, plus `athlete_keys` / `athlete_progress` / `session_history` as inputs), Google sign-in. Self-contained — no shared partials.
- **Edit this when:** You want to change the check-in questions, the score fields, or the wording of the AI prompts (the `WEEKLY_PROMPT` / `CYCLE_PROMPT` constants in the page).
- **Don't touch:** The Supabase URL/key and the coach-email check. `noindex` on purpose.
- **See also:** `CALL_LOG.md` — the full user manual for this page.

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

#### `content/index.json` — Read library manifest
- **What it does:** The table of contents for the Library → Read tab. Lists categories (For Coaches, Pre-Competition, Recovery, Mental, Nutrition, Supplements) and which articles belong to each. The app reads this file to build the Read list instantly, then fetches individual articles on demand.
- **If deleted:** The Read tab shows nothing.
- **Depends on:** `program.html` reads it; individual article files in `content/<category>/` are fetched lazily.
- **Edit this when:** You add a new article or create a new category. Always add an entry here alongside the article JSON.
- **See also:** `SCHEMA.md → "Library tab — Read section"` for the exact format.

#### `content/<category>/*.json` — Article files
- **What it does:** One file per article. Contains the title, read time, and an array of `blocks` (paragraphs, headings, lists, callout boxes, images, and embedded workout cards). Each article is reachable at `program.html?article=<id>` — a shareable public URL.
- **If deleted:** That article 404s when opened; the card still shows in the list until you also remove it from `content/index.json`.
- **Edit this when:** You're writing a new article or updating an existing one.
- **See also:** `SCHEMA.md → "Article block types"` for all supported block formats.

#### `workouts/index.json` + `workouts/<category>/*.json` — Train library
- **What it does:** The manifest and individual session files for the Library → Train tab. Works exactly like the Read library but for on-demand workout sessions. Each workout is reachable at `program.html?workout=<id>`.
- **Edit this when:** Adding a new shared workout session. Always create the JSON file and add the entry to the manifest together.
- **See also:** `SCHEMA.md → "Library tab — Train section"` for the exact format.

#### `SCHEMA.md` — The JSON field guide
- **What it does:** Documents every field you can use in an athlete JSON file, a workout file, and an article file — plus how to add new content to the Library tab.
- **If deleted:** You lose the reference guide. The site keeps working.
- **Edit this when:** You add a new optional field to your JSON files and want to document it.

---

### The Database (Supabase)

The site started with no backend. It now uses **Supabase** (a hosted Postgres database) so athlete progress survives a phone wipe, the coach dashboard has something to read, and coach↔athlete messaging works. The pages talk to Supabase directly over the internet — there is no server of yours to run or maintain.

#### `supabase/*.sql` — Database setup scripts
- **What they are:** The exact SQL that built the live database, kept in the repo as a record and so it can be rebuilt. They're applied in order and each one is safe to re-run.
  - `stage1_schema.sql` — the core: a table that stores each athlete's progress as one JSON blob, plus the coach dashboard's read access.
  - `stage2_keys.sql` — per-athlete secret keys, so an athlete's link (`program.html?client=<id>&key=<key>`) can write only their own data.
  - `stage3_messages.sql` — the two-way messaging table used by the coach dashboard.
- **If deleted:** No effect on the live database (it's already built) — you'd just lose the written record of how it was set up.
- **Edit this when:** You change the database structure. Edit the SQL here *and* apply the same change in the Supabase dashboard so the two stay in sync.
- **Don't touch:** Don't run these blind against the live database without understanding them — ask an AI assistant to walk you through any change first.

---

### Keeping Exercise Videos in Sync (Notion)

#### `exercise_library.json` — Exercise-name → video-link list
- **What it does:** `program.html` reads this at load to turn an exercise name into its demo video. It is **generated**, not hand-edited — the source of truth is a Notion database.
- **If deleted:** Exercises lose their "watch video" links until you regenerate it.

#### `sync_notion.py` + `NOTION_SYNC.md` — The regenerator
- **What they do:** `sync_notion.py` pulls every exercise + video URL from the Notion "Exercise Library" database and rewrites `exercise_library.json`. `NOTION_SYNC.md` is the step-by-step guide for running it (setup, the token, troubleshooting).
- **If deleted:** You lose the ability to refresh videos from Notion (and the guide). The site keeps working with whatever `exercise_library.json` it already has.
- **Edit this when:** Almost never. You add/change videos *in Notion*, then run `python sync_notion.py` and commit the new `exercise_library.json`.
- **Don't touch:** `.notion_token` is your private Notion secret — it's gitignored and must never be committed.

---

### Marketing Cards (a side tool, not part of the live site)

#### `Content/card-preview.html` + `Content/instagram-cards/`
- **What they are:** `Content/card-preview.html` is a standalone designer page for making athlete "results" cards; `Content/instagram-cards/` holds the finished PNGs you've exported. Nothing on the live site links to either — it's a personal tool you open directly when you want to make a card. (Lives in the `Content/` folder alongside the Instagram reels and the design system.)
- **If deleted:** The public site is completely unaffected. You'd only lose the card-making tool and the saved images.

---

### Assets (Images and Icons)

#### `assets/img/og-image.jpg` — Social share image
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
2. **`content/<category>/*.json` + `content/index.json`** — Every time you publish a new article. Create the file, register it in the manifest.
3. **`workouts/<category>/*.json` + `workouts/index.json`** — Every time you add a shared workout session. Create the file, register it in the manifest.
4. **`index.html`** — When you reword your pitch, update the FAQ, swap a testimonial, or change a CTA.
5. **`form.html`** — When you want to add or tweak an application question.
6. **`partials/nav.html`** and **`partials/footer.html`** — When you add a new page, rename a menu item, or add a social link.
7. **`assets/css/tokens.css`** — If you ever rebrand (new accent colour, new font).

Everything else you can usually leave alone. If an AI assistant tells you to edit something outside this list, ask it to explain why first.

---

## Rules of Thumb

- **Before deleting anything**, search the rest of the project for its name. If other files mention it, don't delete.
- **After editing the menu or footer**, check every page — they all share those partials.
- **After editing `tokens.css`**, check every page — the change shows up everywhere.
- **Never commit** a file named `.env`, anything with passwords, or athlete data you don't want public if your repo is public.
- **When in doubt**, ask an AI assistant to show you a preview of the change before you push it live.
