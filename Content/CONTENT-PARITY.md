# Content parity ledger: one topic, every platform

Started 2026-10-02. Amir: *"we need to use the contents in all of our platforms, so if we have a lesson in TPS,
we need to have it in our programs and blogs, and vice versa. But before adding anything to another platform,
research and confirm the logic and science."*

This file is the working list for that. **Read it before adding, changing or porting any lesson or article**, and
update it in the same commit.

## The surfaces (one topic can live on four)

| Surface | Where it lives | Language | Audience and voice | Source of truth |
|---|---|---|---|---|
| **TPS course lesson** | `public.tps_content` (keys `learn` to `learn-5`), read by `/tennis/app/` | Farsi | Juniors and their parents. Plain and careful, refers to the course's own sessions, age rules (under 16 / under 18) | The row. Edit with SQL, and **re-hash `version`** or phones keep the old copy |
| **English course twin** | `public.course_en` (22 lessons, 7 tests, test day) | English | Same audience as the lesson | The row. Its program.html screen (Playbook + Tests door) is **still parked** on branch `claude/course-lessons-en` |
| **Blog (website)** | `/fa/articles/<slug>.html` and `/en/articles/<slug>.html`, generated | Farsi + English | Public: players, coaches, parents; found on Google (SEO gate) | `articles/<cat>/<slug>.json` + `.fa.json` |
| **Playbook (athletes' app)** | `public.library` (kind `article`), Library → Playbook in `program.html` | English | Coached athletes. Amir's voice (COM-3) | The same `articles/<cat>/<slug>.json` as the blog, published with coach.html or SQL |

So **blog and Playbook are one piece of content** (one English file, plus the Farsi translation for the site).
A "port" is therefore one of two jobs: **course lesson → article** (rewrite for the public or athlete voice,
translate, publish to both), or **article → course lesson** (rewrite for juniors and parents, add red flags
and age rules, Farsi, write to `tps_content` and `course_en`).

**Match facts, not wording.** Numbers, rules and the science must agree on every surface. Voice, examples and
age rules differ on purpose (CLAUDE.md: the two audiences are deliberately different).

## The rule for every port (nothing skips a step)

1. **Research first.** Re-verify every number and "research shows" against real sources (PMID or DOI, the abstract
   read at least; full text where it matters). Do not trust the source surface: on 2026-10-02 two published articles
   and one lesson note carried claims that did not hold (see *Known problems*). Use a research agent per topic.
2. **Say what the evidence is.** Supported / supported but overstated / practice-based / not supported. Practice-based
   advice stays, but is labelled as Amir's suggestion, not "research".
3. **Adapt for the audience** (juniors: red flags, a parent in the room, no max tests; athletes: his coaching voice).
4. **Farsi goes to Amir to read before it ships.** Nothing Farsi ships unread.
5. **Publish to every surface in the same sitting** (or list what is still missing here), then update the table below.
6. **When a fact changes on one surface, change it on all of them**, and list them in the handoff.

## The matrix (updated 2026-10-02, end of the port)

✅ done and consistent on every surface · n/a product-specific

Every topic below now has a TPS lesson (Farsi + `course_en` twin), a blog article (Farsi + English) and a Playbook row.
The research for each is in `Content/parity-drafts/<slug>/verify.md` (claims table, PMIDs, doctor-to-check items); the
lesson changes are in `Content/parity-drafts/<slug>/lesson-changes.md`. The Farsi is **not yet read by Amir**.

| Topic | TPS lesson (`id`, key) | Blog + Playbook slug |
|---|---|---|
| Warm-up | `warmup-ramp` (learn-4) | `tennis-warm-up` (merged with `pre-session-warm-up`) |
| Match-day nutrition | `fuel-competition` (learn-5) | `match-day-nutrition` (padel section in the blog only) |
| Eating around training | `fuel-training` (learn-5) | `training-nutrition` |
| Water, sweat and heat | `hydration-heat` (learn-5) | `hydration-and-heat` |
| Sleep and recovery | `sleep-recovery` (learn-3) | `sleep-and-recovery` |
| Recovery and adaptation | `recovery-adaptation` (learn-3) | `how-you-get-stronger` |
| Pain, soreness, red flags | `pain-red-flags` (learn-4) | `pain-or-soreness` |
| Missed sessions, coming back | `missed-sessions` (learn-4) | `missed-sessions` |
| Growth spurts | `growth` (learn) | `growth-spurts` |
| Training on your period | `training-on-period` (learn, **new**) | `training-on-your-period` (corrected) |
| Training with an injury | `training-with-injury` (learn, **new**) | `training-with-injury` (corrected) |
| What tennis asks of the body | `tennis-demands` (learn-2) | `what-tennis-demands` |
| Why strength | `why-strength` (learn-5) | `why-strength-training` |
| Strength for tennis | `strength` (learn-2) | `strength-for-tennis` |
| Jumps and power | `jumps-power` (learn-2) | `jumps-landing-power` |
| Speed, braking, change of direction | `speed-braking` (learn-2) | `speed-braking-direction` |
| Agility and reaction | `agility-reaction` (learn-2) | `agility-and-reaction` |
| Tennis fitness (aerobic) | `tennis-fitness` (learn-3) | `tennis-fitness` |
| Robustness | `robustness` (learn-3) | `robust-body` |
| RPE and choosing a weight | `rpe-weights` (learn-3) | `rpe-explained` (the app keeps its own `APP_GUIDE`) |
| Training alongside tennis and tournaments | `tennis-tournaments` (learn-4) | `training-around-matches` |
| How to read the card · parents' guide · ready for level 3 | n/a | n/a (stay in the course) |

The 17 course lessons became athlete-voiced articles under a new **Training** shelf (`articles/training/`), plus
Recovery, Nutrition and Pre-Competition. The `for-coaches` shelf is now empty (the pre-session warm-up merged away) and still
listed in `articles/index.json`; decide whether to keep it.

**New lessons have no cover art.** The course app shows a plain green banner until an `ART` entry (by lesson id) is
added in the private `tps-content` repo: `training-on-period` and `training-with-injury`.

## Known problems found on 2026-10-02 (all fixed in the articles and the lessons, except where noted)

1. **Both warm-up articles overstated.** "Research is very clear" that static stretching slows you (the real
   threshold is about 60 s per muscle; under 30 s is trivial); the **4.6 km/h serve gain came from two 5-second isometric
   pushes, not from sprints and jumps**; "ready for 30 minutes, gone after 60" has no source (standing still loses it
   in about 15 min, playing keeps it); "if you're sweating you're ready" is not an indicator. Fixed in the merge draft.
2. **`training-on-your-period`:** the ban on "heavy ab-bracing work" has no evidence (core strengthening is itself a
   studied treatment for period pain); "lying down makes cramps last longer" and the blood-flow explanation have no
   source; "doesn't need a different program" contradicts the different week it then prescribes; "about 2 sets" and
   "full cardio" are coaching practice, not research; cycle-phase evidence is "low-quality, inconsistent, small if any",
   not "no effect". **Missing:** heavy bleeding and iron, red flags (missed periods, very heavy bleeding, pain that doubles
   you over), low energy availability, hormonal contraception, parents and a doctor.
3. **`training-with-injury`:** the pain rule is only verified for Achilles tendinopathy and patellofemoral pain
   (pain up to about 5/10 during, settled by next morning, not creeping up week to week; the article's "mild" is stricter
   and "sharp" is a clinical add-on); "a torn structure follows a healing timeline" is too general (a complete ACL tear and
   some meniscus tears do not heal on a clock); "permanent strength work for a structural trait" and "the weak side
   becomes the next injury" are practice, not evidence; "none of this depends on your coach, that part isn't yours to
   carry" is risky for juniors. **Missing:** when to go to a doctor today, growing-athlete cautions, a parent in the loop.
4. **A wrong citation in `learn-5` `_notes` (still NOT corrected, private build notes):** PMID 36771479 (Huang 2023) is *Nutrition Recommendations for Table
   Tennis Players*, listed there as racket-sport meal timing. The windows in `fuel-competition` now rest on the ITF 2025
   statement (1 to 4 g/kg, 1 to 4 h) instead. The note is not corrected yet (it is in the private build notes).
5. **Padel has almost no nutrition research.** No padel study of carbohydrate, glycogen, sweat sodium or caffeine
   was found. The blog says so and uses tennis numbers as a starting point. Five-set carbohydrate, the 400 ml
   above 27 °C and the tennis sweat-rate and sodium figures are not claimed for padel.
6. **Two articles aimed at one phrase** (`tennis-warm-up`, `pre-session-warm-up`): merged, the old address redirects
   (`REDIRECTS` in `scripts/build_article_pages.py`).

## Safe additions the research says a juniors-and-parents lesson must have

- **Period lesson:** see a doctor for no first period by about 15 (or about 3 years after breast development began),
  periods that stop for 3 months or more, cycles regularly under 21 or over 45 days, very heavy bleeding (soaking a pad
  or tampon every 1 to 2 hours, over 7 days, new dizziness or breathlessness), or pain that doubles the athlete over.
  **Have a doctor confirm those numbers before they are printed:** they come from secondary summaries of ACOG
  Committee Opinion 651. Heavy bleeding and iron: "get it checked", never self-treat. Missed periods are not a sign of
  being fit (low energy availability). Medication and contraception are for parents and a doctor.
- **Injury lesson:** go to a doctor or emergency care for: cannot bear weight, visible deformity, a locked or giving-way
  joint, numbness or weakness, fever with a swollen joint, pain at rest or at night, pain getting worse over days,
  swelling after a fall. Growing athletes are not small adults (growth-plate pain, stress fractures): no self-managed pain
  rule without an adult and a clinician. Scans in juniors are read by a doctor.

## How to publish each surface

- **Course lesson:** SQL update of the lesson inside `tps_content.body->'lessons'`, then
  `version = left(encode(sha256(convert_to(body::text,'UTF8')),'hex'),16)`. Keep the lesson rules in the row's
  `_notes` (5 to 9 sections, list and ol of 3 to 8 items, short paragraphs, one-sentence summary, Persian digits, no
  supplements or max tests for juniors). Then the English twin in `course_en`.
- **Article:** the `/article` skill (SEO gate, English, Farsi for Amir to read, build, push), then the Library row.
- Never edit `tennis/app/*` (private repo deploy).

## Decisions and what is still open (2026-10-02)

Amir said "fix everything with your own recommendation", so these were decided by Claude and are changeable on his word.

**Decided and applied**
1. **Sprint distances** (`speed-braking`): keep the course's 5 to 10 m, 20 m and court-length distances. The 20 m run-up in
   the braking study is a lab detail, not a conflict.
2. **Yo-Yo test for juniors** (`tennis-fitness`): keep it. An adult is present under 16, and a growing player with knee or
   heel pain does not run it (both are in the lesson).
3. **Depth jumps and max tests** (`growth`): the ban stays and is labelled as the course's own cautious rule.
4. **`robust-body` title**: now «مقاوم‌سازی بدن برای تنیس: پیشگیری از آسیب چقدر جواب می‌ده؟». The search phrase stays, the title
   is a question, and the body already says no trial proves prevention.
5. **`course_en` twins**: `rpe-weights` no longer says RPE is logged or that the app keeps a log, and `rpe-weights` and
   `strength` no longer say "Save to The Ceiling in the app". They now point to the Ceiling calculator in the course's Tests
   section, as the Farsi does. (The Ceiling is retired from `program.html` screens; the course app's own Tests page is a
   separate app we do not edit here, so the lessons still name it.)
6. **`learn-5` `_notes`**: the Huang 2023 citation now carries a CORRECTION line (it is a table-tennis paper) and the 1.5 L
   per kg figure is marked as superseded by the ITF 2025 1.25 to 1.5 range, which the lesson uses.
7. **The `for-coaches` shelf** stays, empty, like Mental and Supplements.
8. **The parked English course screen** (`claude/course-lessons-en`): do not merge. The Playbook articles cover the same
   topics in the athletes' voice, and the lessons stay in the course app.

**Still needs Amir or someone else**
1. **Read the Farsi** (19 articles, merged warm-up, padel section, two new lessons, every lesson change). Spellings:
   «اسگود-شلاتر», «سیور».
2. **Doctor to check**: the period red-flag numbers (secondary summaries of ACOG CO 651), the heat-illness first aid in
   `hydration-heat`, the injury red-flag list. A dietitian for the plain portions and timing windows (see `learn-5` `_notes`).
3. **Cover art** for the two new lessons (a credit plan first, per the design rules; `ART` lives in the private
   `tps-content` repo).
4. **Search Console**: Request indexing for the new article URLs, and real search-box phrases to replace the "guess" rows
   in SEO-SOP section 10.
5. **English twin paragraphs** over 3 sentences in a few lessons this port did not rewrite (pre-existing); lint and trim
   when one of those lessons is next edited.
