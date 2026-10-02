# Spec for a parity-article agent (2026-10-02)

Amir's order: every lesson of the TPS course (Farsi, juniors + parents) must also be a **blog article** (website, Farsi
and English) and a **Playbook article** (athletes' app, English). They are the SAME file: `articles/<category>/<slug>.json`
(English) + `<slug>.fa.json` (Farsi for the website). **Before anything is copied, the science is researched and confirmed.**
You write ONE article from ONE lesson. You write DRAFTS only.

## 0. Hard limits
- Write ONLY inside `C:\Users\Amir\OneDrive\Документы\GitHub\Website\Content\parity-drafts\<slug>\` : exactly three files,
  `<slug>.json`, `<slug>.fa.json`, `verify.md`. Edit no other file in the repo. No git. No commits.
- Database: **SELECT only**. Load the tool with ToolSearch `select:mcp__supabase__execute_sql`. Never INSERT/UPDATE/DELETE.
- Never invent a source. Confirm each PMID/DOI exists and says what you claim (PubMed tools: ToolSearch
  `select:mcp__1a5f3f48-eda3-46d7-8013-5d2ebb5625a0__search_articles,mcp__1a5f3f48-eda3-46d7-8013-5d2ebb5625a0__get_article_metadata,mcp__1a5f3f48-eda3-46d7-8013-5d2ebb5625a0__get_full_text_article`; also WebSearch/WebFetch).
- No product, price, course or app promotion in the article. No claim of results. No supplement or max-test advice for juniors.

## 1. Read first (all of it, short)
1. `Content/DESIGN_SYSTEM.md` section 10 (Farsi word choices).
2. `.claude/SEO-SOP.md` sections 4 (*the SEO gate*, *How a Farsi title is chosen*) and 10 (phrase log).
3. `SCHEMA.md` section "Library tab — Read section" (block types: `p`, `h`, `list`, `callout`, `workout`; no `img` unless told).
4. The voice target, both languages: `articles/nutrition/match-day-nutrition.json` and `.fa.json`.

## 2. Get the lesson (read-only SQL)
Farsi lesson: `select jsonb_pretty(l) from public.tps_content c, jsonb_array_elements(c.body->'lessons') l where c.key='<KEY>' and l->>'id'='<ID>';`
English twin: `select jsonb_pretty(body) from public.course_en where id='<ID>';`
Its sources: `select jsonb_array_elements_text(body->'_notes') n from public.tps_content where key='<KEY>';`
(the `_notes` list the evidence behind each lesson, with PMIDs. Use the entries for YOUR lesson. Start from them, then re-verify.)

## 3. Verify the science (the point of this job)
List every number, percentage, threshold, protocol and "research shows" in the lesson. For each, a verdict:
**supported / supported but overstated / practice-based (no direct study) / not supported / could not verify**, with the
honest wording and the source (PMID or DOI, the abstract read at least). Rules:
- A claim you cannot verify does not go into the article, or goes in clearly labelled as "my suggestion".
- Keep every "honest limit" sentence the lesson already has (small studies, football data, no promise about injury).
- Medical or dietary specifics (heat illness first aid, red flags, iron, bleeding, medicine) stay qualitative and carry a
  "Doctor to check" / "Dietitian to check" line in verify.md, as the course does.
- If the lesson itself overstates something, write the CORRECT version in the article and list it under LESSON FIXES.

## 4. Adapt (course lesson → public article)
- Audience: players, coaches and parents who found it on Google, plus Amir's coached athletes in the app. Tennis AND padel
  players. If a fact is tennis-only, say so; never claim padel without support.
- Remove everything specific to the course: session names (Club A, Court B, "+ ..."), "this programme", "the card", "the app",
  the demo, the under-16 *version* rules, links to other lessons by title. Keep general safety (for juniors, red flags) as
  one short callout where it matters.
- Voice **English** (COM-3, Amir's voice, "my english is not very high level"): plain everyday words, short sentences,
  contractions, "you". NO em-dashes, NO semicolons, no triads of adjectives, no "not X but Y", no filler openers. Test: would a
  busy coach type this on his phone?
- Names are cool, not literal (Amir): a punchy English title (2-4 words) whose LAST word is a strong noun or verb. The literal
  description goes in the first paragraph.
- Structure: 700-1100 words. First block a `p` that starts with a strong capital (M, T, W, H, A). 5-9 `h` sections, not numbered. `list` for
  3+ parallel items, `callout` for rules, warnings, named protocols (label 1-4 words: Rule, Key, Watch Out, Remember). Last
  section ends with a `callout` labelled "Rule" or "Key". Final `p`: "Based on <4-7 key sources, author and year>."
  Exercise names exactly as in the lesson (they are real library names). `readMins` = words/200 rounded. `date`: "October 2026".
- JSON: `{"id": "<slug>", "title": ..., "category": "<Display name>", "readMins": n, "date": "October 2026", "blocks": [...]}`.

## 5. Farsi file (the website's Google page)
- Same blocks, same order, same types, same list-item counts; every number identical to the English.
- Start from the lesson's own Farsi (Amir's approved wording) and re-voice it into the website's **colloquial Tehrani** (می‌کنه، نمی‌تونه،
  یه، بخور — not بخورید). Persian digits ۰-۹ and «٫». Half-space (ZWNJ) in می‌ / نمی‌ verbs, plurals, compounds. Persian ی and ک only.
  «گیومه» quotes. No em-dash chains. Words per DESIGN_SYSTEM section 10 (شدت not سختی, ارشد never MSc). Exercise names
  transliterated with a short gloss the first time.
- Header: `{"_note": "Website-only Farsi copy of <slug>.json. No id/category on purpose: coach.html's Publish article must refuse this file. Pages: python scripts/build_article_pages.py", "translationOf": "<slug>", "lang": "fa", "sourceHash": "", "title": ..., "seoTitle": ..., "description": ..., "blocks": [...]}`.
  **Never** an `id` or `category` in this file.
- **SEO gate**: you are given the target Farsi search phrase. `title` = that phrase (what a player types, not a clever headline);
  `seoTitle` ≤ ~65 characters, phrase first, ending ` | امیر اردکانیان`; `description` 120-160 characters with the phrase and what the reader
  gets; the phrase also in the first paragraph and at least one `h` heading. Never name a sport or group in title/description that the body does not cover.

## 6. verify.md (required)
(a) target phrase · (b) claims table: claim | verdict | honest wording | source PMID/DOI · (c) **LESSON FIXES** (what the TPS lesson
and its English twin must change, if anything) · (d) could not verify · (e) Doctor/dietitian to check · (f) sources list, 6-14 refs.

## 7. Check yourself, then return
Run `python "C:\Users\Amir\OneDrive\Документы\GitHub\Website\Content\parity-drafts\lint.py" <slug>` and fix everything it prints.
Return ≤150 words: slug, category, title, word count, claims by verdict, the top three lesson fixes.
