# SEO SOP — getting found on Google in Iran

**Goal (Amir, 2026-09-13):** someone in Iran who searches "amir ardekanian", «امیر اردکانیان»,
or a tennis/padel strength-and-conditioning topic in Farsi — «بدنسازی پدل» — finds Amir: the
website, an article, or a reel.

This file is the routine. The machinery (the article-page generator, the pre-commit check) is
described in `CLAUDE.md` → *Article pages & SEO*, and the per-article steps live in
`.claude/skills/article/SKILL.md`.

---

## 1. What this is built on

- **Google is ~99.6% of search in Iran** (StatCounter, May 2026). No other engine is worth effort.
- **People in Iran search in Farsi.** An English page or caption does not match a Farsi search.
- **Two goals, very different difficulty:**

  | Goal | Example search | Difficulty | Realistic timeline |
  |---|---|---|---|
  | Name | amir ardekanian · امیر اردکانیان | Easy | Weeks, now that Search Console is set up |
  | Topic | بدنسازی پدل · گرم‌کردنِ قبل از تنیس | Hard | 3–12 months for the website, never guaranteed |

- **Google ranks pages, not websites.** Every article page — and every reel — is its own chance to be found.
- **Google shows Instagram posts and reels** from public **professional** accounts (Creator or
  Business, owner 18+), posted since 1 Jan 2020 — Instagram opened this on 10 July 2025. Google
  cannot watch the video: it reads the **caption**, alt text and location tag. Because Instagram is
  a site Google already trusts, a good reel can appear within days; a new website page takes months.
  That is why reels show up for «بدنسازی پدل» today and the website does not yet.
- **Cookies play no part in ranking.** The site uses Plausible, which sets none (see `privacy.html` §2.5).

## 2. What is in place

- `index-fa.html` — title, description and H1 carry the name and «مربیِ بدنسازیِ تنیس و پدل»;
  the body speaks to tennis and padel players; JSON-LD `Person` lists both spellings of the name
  plus Instagram and LinkedIn.
- `index.html` — the same `Person` (same `@id`), "Amir Ardekanian" in the titles, and the
  **Search Console verification tag**.
- Every article is a page at `/fa/articles/<slug>.html` and `/en/articles/<slug>.html`, paired
  with `hreflang`, carrying `BlogPosting` JSON-LD, linked from both homepages and footers.
- `sitemap.xml` is generated, listed in `robots.txt`, and **submitted to Search Console**.
- Live since 2026-09-13 (main `0e27e53`, `28c9370`, `28b87c4`).

## 3. Google Search Console

### Done — 2026-09-13
1. Property created: **URL prefix** `https://www.amirardekani.com/`, on Amir's Google account.
2. Verification method **HTML tag**. The tag is in the `<head>` of `index.html` (main `28b87c4`).
3. Verified.
4. *Indexing → Sitemaps*: submitted `sitemap.xml` (13 pages at the time; it grows with every article).
   "Couldn't fetch" in the first day is normal — it turns to *Success* on its own.
5. *URL inspection → Request indexing* for `https://www.amirardekani.com/fa/articles/` and
   `https://www.amirardekani.com/index-fa.html`. (If this was skipped, do it now.)

### ⚠️ Never remove the verification tag
`<meta name="google-site-verification" …>` in `index.html` is what proves the site is Amir's.
Delete or change it and Google treats the property as unverified again: the data stops being
visible until it is re-verified. It is public by design — it is not a password.

### Where to look, and when
| Where | What it tells you | When |
|---|---|---|
| **Performance → Queries** | The exact Farsi searches that showed your pages, clicks, average position | From ~3–4 weeks after setup; then monthly |
| **Performance → Pages** | Which pages get found | Monthly |
| **Indexing → Pages** | Pages Google has *not* indexed, and why | Monthly |
| **Indexing → Sitemaps** | Whether the sitemap is read, and how many pages it found | After each new article |
| **URL inspection** | Whether one page is indexed; *Request indexing* for a new page | After each new article |

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

## 5. Instagram reels that show up on Google

### Step 1 — Account (one time)
1. **Professional account.** Instagram → Settings → *Account type and tools* → switch to
   **Creator** if it is not one already.
2. **Public account.** A private account is never shown.
3. **Search engines allowed.** Settings → *Account privacy* → the option about appearing in
   **search engine results** (some app versions call it *Searchability*) must be **on**.

### Step 2 — Profile (one time)
- **Name field:** `امیر اردکانیان | بدنسازی تنیس و پدل`. Instagram search reads this field, and
  Google shows it beside your reels.
- **Bio:** «مربی بدنسازی تنیس و پدل» and the link `amirardekani.com/fa/articles/`.

### Step 3 — Every caption
The caption is the page Google reads, so it has to be text, not a line of emojis.
1. **First line** = the exact phrase people search + what they get.
2. **3–5 lines** of real explanation, in your own words.
3. **Last line** = send them to the site. Links in captions are not clickable, so point to the bio.
4. **3–5 hashtags**, not 30.

```
بدنسازی پدل: گرم‌کردنِ ۱۰ دقیقه‌ای قبل از بازی
[۳ تا ۵ خط توضیح: چرا، چی، چطور — به زبونِ خودت]
مقاله‌ی کاملش روی سایتمه، لینک توی بیو
#بدنسازی_پدل #پدل #آمادگی_جسمانی
```

### Step 4 — The video
- A **Farsi title on screen in the first 2 seconds**, and the same title on the **cover image**.
- **Captions (subtitles) on** — more text for Instagram to understand the reel.

### Step 5 — One reel = one search phrase = one article
Pick the phrase first (section 6), make the reel, and point it at the article on the same topic.
A reel is found fast; the article is where the reader learns enough to trust you.

### Step 6 — Optional: post the same video twice more
- **YouTube Shorts** — put the search phrase in the title. Google shows YouTube heavily.
- **Aparat** — the same title. It opens in Iran without a VPN, and Google indexes it.

### Do not
- **Embed Instagram on the website.** Instagram is filtered in Iran, and an embed loads Meta's
  tracking — the site promises no tracking cookies. Link to the reel instead.

### ⚠️ Open decision — Amir's
Since **2026-07-02** all new social content is **English** (CLAUDE.md, *Design work*). An English
caption will not show up for «بدنسازی پدل». The options: Farsi captions on reels aimed at Iran, or a
caption with the Farsi first and the English after, or stay English and let the website carry the
Farsi searches alone. Not decided yet.

## 6. Finding what people actually search — the Google search box

Free, five minutes, on your phone (Google in Farsi). Claude cannot do this step: Google blocks its searches.

1. Type the start of a phrase slowly — «بدنسازی پدل», «تمرینات پدل», «آسیب پدل», «گرم کردن پدل».
   **The drop-down suggestions** are real searches, most common first. Screenshot them.
2. Search the phrase. **"People also ask"** — each question is a ready-made article or reel. Screenshot.
3. Scroll to the bottom: **"Related searches"** — more phrases. Screenshot.
4. Note **who ranks** on the first page: Instagram reels? Other coaches' sites? A news site? That
   tells you what Google thinks the searcher wants.
5. Send the screenshots to Claude → one list of phrases → one article + one reel per phrase.

After 3–4 weeks, **Search Console → Performance → Queries** replaces guessing with real data.

## 7. Monthly routine — 30 minutes, first week of the month

1. **Search Console → Performance → last 28 days → Queries.** Note the top 10 Farsi searches and
   their average position.
2. **Many impressions, few clicks:** the title or description is not convincing. Rewrite the
   article's `seoTitle` / `description` in its `.fa.json`, rebuild, ship.
3. **Position 8–20:** a page that is almost on the first page. Add a section that answers that
   search better, or write a separate article on it.
4. **Indexing → Pages → "Why pages aren't indexed":** fix whatever is listed.
5. **Search your own top 3 phrases on your phone.** Which of your reels or pages appear? Which
   competitor reels appear, and what do their captions say?
6. **Publish 1–2 new articles, each with its reel,** on phrases from section 6.
7. **Earn one link from another real site:** the Etminan Academy page, Mehraneh's coach site,
   a padel club, a federation page, a podcast or interview, a guest article. A link from a real
   Iranian tennis or padel site is the strongest signal you can earn.

## 8. Rules

- **Never buy links** or pay an "SEO service" that promises rankings. Google penalises it, and
  the penalty lands on the whole site.
- **Never copy** another site's article or another creator's caption, in any language.
- **No thin pages** written to chase a keyword. A page earns its place by answering the search.
- **Never change a published article's slug.** Links and Google's index point at the address.
- **Never remove the Search Console tag** from `index.html` (section 3).
- **Every public page needs `<link rel="canonical">`;** a page that should not be found gets
  `noindex` (the app, the coach dashboard and the forms already do). The sitemap follows those
  two tags automatically.

## 9. Open items

- **The padel gap.** No article is about padel yet, so the website cannot rank for «بدنسازی پدل».
  First: one big article aimed at that phrase (what padel demands, what to train, a sample week,
  common injuries), from Amir's notes, through the `/article` skill. Then 3–5 smaller padel
  articles linking to it, each with a reel.
- **Farsi vs English captions** — section 5, Amir's decision.
- **Iran reachability is unverified** for Google Fonts (Vazirmatn) and Plausible, which every Farsi
  page loads. The `/reach/` probe measures Google Fonts; if athletes report it blocked or slow,
  self-host Vazirmatn.
- **Real search volumes** need a keyword tool (Ahrefs/Semrush) or Search Console data. Until then:
  the search box method in section 6.
- **Google Business Profile** is not available for Iran and is built for physical locations, so it
  does not apply to online coaching.
