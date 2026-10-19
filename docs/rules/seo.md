# Rules — article pages, SEO and content parity

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

## Article pages & SEO — every article is also a public web page (2026-09-13)

Amir: *"every time I add an article it updates the website as well."* The goal is that people in
Iran who search his name or a tennis/padel S&C topic find amirardekani.com (Google is ~99.6% of
search in Iran). The routine (Search Console, the monthly checklist, how titles are chosen) is
**`.claude/SEO-SOP.md`**.

- **`scripts/build_article_pages.py`** turns `articles/<cat>/<slug>.json` (the English app
  article) plus `articles/<cat>/<slug>.fa.json` (a reviewed Farsi translation) into
  **`/fa/articles/<slug>.html`**, **`/en/articles/<slug>.html`**, an index page per language, and
  **`sitemap.xml`**. Static HTML on purpose: Google reads it best, and it does not depend on
  Supabase answering from inside Iran. Everything under `en/articles/`, `fa/articles/` and
  `sitemap.xml` is **generated** — never hand-edit it; rebuild.
- **`.githooks/pre-commit` runs `--check`** whenever articles, those folders, `sitemap.xml`,
  `robots.txt` or any root `*.html` is staged. It blocks a stale page, a missing Farsi
  translation, and a Farsi file whose English changed after it was stamped (`sourceHash`;
  re-stamp with `--stamp <slug>` once the Farsi is brought back in line).
- ⚠️ **A `.fa.json` must never carry `id` or `category`.** coach.html's *+ Publish article* upserts
  any file that has both, by slug — a Farsi file with them would overwrite the English article in
  the app for every athlete. The build refuses such a file, and since 2026-10-10 so does coach.html
  (a `.fa.json` name, `lang: "fa"`, `sourceHash` or `translationOf`), which also matches an article's
  category by its title ("Pre-Competition") as well as its id.
- **Every article passes the SEO gate** (Amir, 2026-10-02: *"whenever you write a blog on the website, consider
  the SOP, so every time someone searches something my website shows better on Google"*): `/article` Step 0.5 =
  `.claude/SEO-SOP.md` → *The SEO gate*. One Farsi search phrase per article, chosen first and checked against the
  **phrase log** (SOP §10, add a row with every article), the phrase in title/seoTitle/description/first paragraph/a
  heading, nothing named in the title that the body does not cover, and the Instagram caption written to SOP §5.
- **The `/article` skill does the whole chain** (Steps 6–9): Farsi draft → **Amir's OK** →
  `--stamp` → build → commit → coach.html publish. Nothing Farsi ships unread.
- **The sitemap lists a root page only when it has a canonical link and no `noindex`.** A new
  public page needs a canonical, then a rebuild.
- **The name:** the visible brand stays "Amir Ardekani / امیر اردکانی", but page titles, article
  bylines and the JSON-LD `Person` lead with **Ardekanian / اردکانیان**, the name people search
  (Amir, 2026-09-13). Both homepages define that `Person` under one `@id`
  (`https://www.amirardekani.com/#person`) with every spelling in `alternateName` — keep them in step.
- ⚠️ **`index.html` carries the Google Search Console verification tag** (`<meta name="google-site-verification" ...>`, added 2026-09-13 for the URL-prefix property
  `https://www.amirardekani.com/`, `sitemap.xml` submitted there). Removing or changing it un-verifies the
  property and hides the search data. Keep it whenever the `<head>` is edited. Routine: `.claude/SEO-SOP.md` section 3.
- ⚠️ **Unverified from Iran:** the Farsi pages load Vazirmatn from Google Fonts and the Plausible
  script, same as `index-fa.html`. `/reach/` measures Google Fonts; if it is blocked, self-host the font.


- `Content/CONTENT-PARITY.md` — **one topic, every platform** (Amir, 2026-10-02): which topic lives on the TPS course
  (Farsi lessons in `tps_content`, English twins in `course_en`), the blog (`/fa` and `/en` articles) and the Playbook,
  what is missing where, the known science problems, and the rule for every port: **research and confirm the logic and
  science first** (an agent per topic, sources with PMID/DOI), adapt for the audience, Farsi read by Amir, publish to
  every surface, update the ledger. If a lesson exists on one platform it must exist on the others; a changed fact is
  changed everywhere. Read it before adding or changing any lesson or article.
