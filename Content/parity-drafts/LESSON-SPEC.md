# Spec: correct ONE TPS course lesson from its verification (2026-10-02)

Amir: if a fact is wrong on one platform it is fixed on all of them. A research agent has already verified this lesson's
science while writing its article (`Content/parity-drafts/<slug>/verify.md`, section **LESSON FIXES** and the claims table).
Your job: produce the CORRECTED lesson, in Farsi and in its English twin. DRAFTS only.

## Hard limits
- Write ONLY inside `C:\Users\Amir\OneDrive\Документы\GitHub\Website\Content\parity-drafts\<slug>\` : `lesson.fa.json`,
  `lesson.en.json`, `lesson-changes.md`. Edit no other file. No git. Database: **SELECT only**
  (ToolSearch `select:mcp__supabase__execute_sql`). Never INSERT/UPDATE/DELETE.
- Do not invent facts. Every changed number or attribution must come from verify.md (which has PMIDs). If verify.md says "could
  not verify", soften or remove, do not "fix" with a new number.

## Inputs
- verify.md of the article slug you are given. Read it ALL: LESSON FIXES, the claims table (verdicts: supported / overstated /
  practice-based / not supported), could-not-verify, doctor-to-check.
- The lesson, Farsi: `select jsonb_pretty(l) from public.tps_content c, jsonb_array_elements(c.body->'lessons') l where c.key='<KEY>' and l->>'id'='<ID>';`
  English twin: `select jsonb_pretty(body) from public.course_en where id='<ID>';`

## What to change (and only this)
1. **Wrong or overstated facts** (numbers, who the study was on, 'research shows' that the evidence does not show): replace by
   the verified wording from verify.md.
2. **Unsupported claims**: remove, or keep as a short honest label.
3. **Practice-based rules the lesson states as fact** (course thresholds, caps, ladders, 48-hour rules, age cut-offs): keep the
   rule, add one SHORT honest label where it sits ('this is the course's own rule, not a study result'), once per lesson section at most.
   Farsi labels in the lesson's own register, e.g. «این قاعدهٔ عملیِ دوره است، نه نتیجهٔ یک پژوهش».
4. **Pointers** the fixes ask for (e.g. to the new lessons «تمرین با آسیب‌دیدگی» or «تمرین در دورهٔ قاعدگی»: read the exact
   titles in `Content/parity-drafts/training-with-injury/lesson.fa.json` and `training-on-your-period/lesson.fa.json`, and the English
   twins). A link to another lesson uses its exact title in «» (Farsi) or quotation marks (English).
5. Doctor/dietitian items stay qualitative.

## What must NOT change
- `id`, `icon`, `group`, `order`, `audience`, the section order, and every piece of lesson text that verify.md found supported.
- The course rules (Amir's decisions): **every session is done as written; no lighter-day or shortened-session rules; no supplements
  or max tests for juniors; under-16 rules and adult-present rule stay; session names exactly as they are (Club A, Court B...).**
- Structure rules from the course builder: 5-9 sections; `list` and `ol` of 3-8 items; paragraphs of at most 3 sentences
  (a title inside «» does not count); ONE-sentence `summary`; Farsi: Persian digits, «٫» decimal, no Arabic ي/ك, half-space (ZWNJ)
  in می‌ / نمی‌ and compounds; Latin only for RPE, RM, VO2max, Yo-Yo, RAMP, A/B/C and exercise names; keep the lesson's own
  formal-neutral Farsi register (NOT the colloquial blog voice). English twin: plain words, short sentences, no em-dashes.
- Keep the Farsi and English twin saying the same thing, section for section.

## Outputs
1. `lesson.fa.json` and `lesson.en.json`: the FULL corrected lesson objects (`id, icon, group, order, title, summary, audience,
   sections[{h, p[], ol[], list[], warn, callout}]`), pretty JSON, UTF-8.
2. `lesson-changes.md`: a table, one row per change: section heading | old text | new text | why (verify.md row). Then one line:
   'Changes: N facts corrected, N claims removed, N labels added, N pointers added'. If a LESSON FIX would break a structure rule or a
   course rule, do NOT apply it: list it under 'Not applied, Amir to decide' with the reason.
3. Validate yourself (parse, keys, section count, list sizes, sentence counts, digits, ي/ك, ZWNJ) and return ≤120 words.
