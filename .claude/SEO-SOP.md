# SEO SOP — getting found on Google in Iran

**Goal (Amir, 2026-09-13):** someone in Iran who searches "amir ardekanian", «امیر اردکانیان»,
or a tennis/padel strength-and-conditioning topic in Farsi finds amirardekani.com.

This file is the routine. The machinery (the article-page generator, the pre-commit check) is
described in `CLAUDE.md` → *Article pages & SEO*, and the per-article steps live in
`.claude/skills/article/SKILL.md`.

---

## 1. What this is built on

- **Google is ~99.6% of search in Iran** (StatCounter, May 2026). No other engine is worth effort.
- **People in Iran search in Farsi.** An English page does not match a Farsi search, which is
  why every article gets a reviewed Farsi page.
- **Two goals, very different difficulty:**

  | Goal | Example search | Difficulty | Realistic timeline |
  |---|---|---|---|
  | Name | amir ardekanian · امیر اردکانیان | Easy | Weeks, once Search Console is set up |
  | Topic | گرم‌کردنِ قبل از تنیس · بدنسازیِ پدل | Hard | 3–12 months, and never guaranteed |

- **Google ranks pages, not websites.** Every article page is its own chance to be found.
- **Cookies play no part in ranking.** The site uses Plausible, which sets none (see `privacy.html` §2.5).

## 2. What is in place (2026-09-13)

- `index-fa.html` — title, description and H1 carry the name and «مربیِ بدنسازیِ تنیس و پدل»;
  the body speaks to tennis and padel players; JSON-LD `Person` lists both spellings of the name
  plus Instagram and LinkedIn.
- `index.html` — the same `Person` (same `@id`), "Amir Ardekanian" in the titles.
- Every article is a page at `/fa/articles/<slug>.html` and `/en/articles/<slug>.html`, paired
  with `hreflang`, carrying `BlogPosting` JSON-LD, and linked from both homepages and footers.
- `sitemap.xml` is generated and listed in `robots.txt`.

## 3. One-time setup — Amir (needs your own Google login)

1. Open **search.google.com/search-console** → *Add property* → **URL prefix** →
   `https://www.amirardekani.com/`
2. Choose the **HTML tag** method. Copy the `<meta name="google-site-verification" …>` tag and send
   it to Claude to add to `index.html`. (The tag is public by design; it is not a password.)
   Press *Verify* once it is live.
3. *Sitemaps* → submit `sitemap.xml`.
4. *URL inspection* → paste `https://www.amirardekani.com/index-fa.html` → *Request indexing*.
   Do the same for `https://www.amirardekani.com/fa/articles/`.
5. Keep the website link in the Instagram bio. Google uses the Instagram ↔ website connection
   (the `sameAs` links in the JSON-LD point back at it) to be sure it is the same person.

## 4. Every new article

The `/article` skill runs this; it is written here so you know what happens and what is yours.

1. The English article is written and added to the app.
2. The Farsi translation is drafted — **you read it and approve it.** Nothing Farsi ships unread.
3. The pages and sitemap are built. The pre-commit hook blocks anything stale.
4. It goes live. You publish it in the app from coach.html → *+ Publish article*.
5. Search Console → *URL inspection* → paste the Farsi URL → *Request indexing*.

### How a Farsi title is chosen

- **`title`** (the heading on the page): the words a player would actually type, not a clever
  headline. «گرم‌کردنِ قبل از تنیس», not a literal translation of "The Tennis Warm-Up".
- **`seoTitle`** (the blue link in Google): the search phrase first, under ~65 characters,
  ending ` | امیر اردکانیان`.
- **`description`** (the grey text under the link): 120–160 characters, saying what the reader gets.
- **One topic per article.** Two articles aimed at the same phrase compete with each other.

## 5. Monthly routine — 30 minutes, first week of the month

1. **Search Console → Performance → last 28 days → Queries.** Note the top 10 Farsi searches and
   their average position.
2. **Many impressions, few clicks:** the title or description is not convincing. Rewrite the
   article's `seoTitle` / `description` in its `.fa.json`, rebuild, ship.
3. **Position 8–20:** a page that is almost on the first page. Add a section that answers that
   search better, or write a separate article on it.
4. **Pages → "Why pages aren't indexed":** fix whatever is listed.
5. **Publish 1–2 new articles** on topics people search in Farsi. Ask Claude for ideas built
   from the queries in step 1.
6. **Earn one link from another real site:** the Etminan Academy page, Mehraneh's coach site,
   a club or federation page, a podcast or interview, a guest article. A link from a real Iranian
   tennis or padel site is the strongest signal you can earn.

## 6. Rules

- **Never buy links** or pay an "SEO service" that promises rankings. Google penalises it, and
  the penalty lands on the whole site.
- **Never copy** another site's article, in any language.
- **No thin pages** written to chase a keyword. A page earns its place by answering the search.
- **Never change a published article's slug.** Links and Google's index point at the address.
- **Every public page needs `<link rel="canonical">`;** a page that should not be found gets
  `noindex` (the app, the coach dashboard and the forms already do). The sitemap follows those
  two tags automatically.

## 7. Open questions

- **Iran reachability is unverified** for Google Fonts (Vazirmatn) and Plausible, which every
  Farsi page loads. The `/reach/` probe measures Google Fonts; if athletes report it blocked or
  slow, self-host Vazirmatn.
- **Real Farsi search volumes** need a keyword tool (Ahrefs/Semrush) or ~4 weeks of Search
  Console data. Until then, topic choice is judgement.
- **Google Business Profile** is not available for Iran, and is built for physical locations,
  so it does not apply to online coaching.
