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

## The matrix (2026-10-02)

✅ done and consistent · ◐ exists, needs the check or an update · ✗ missing · n/a product-specific

| Topic | TPS lesson | Blog + Playbook | Status / next step |
|---|---|---|---|
| Warm-up | `warmup-ramp` ✅ | `tennis-warm-up` ◐ (merged with `pre-session-warm-up`, 2026-10-02) | Claims verified. The lesson already matched the evidence (static holds under about 30 s are fine, 2 to 10 min to play, re-warm after 15). The merged article is drafted; the isometric shoulder push is **not** in the lesson (one small study, and a junior audience) |
| Match-day nutrition | `fuel-competition` ✅ updated 2026-10-02 | `match-day-nutrition` ✅ (padel section drafted) | ITF 2025 numbers. Padel lives in the blog only: the course is the tennis course |
| Eating around training | `fuel-training` ◐ | ✗ | Port to an article after re-verifying (see problem 4) |
| Water, sweat and heat | `hydration-heat` ◐ | ✗ | Port after re-verifying. The heat-illness first-aid steps carry a "doctor to check" flag in the lesson notes |
| Sleep and recovery | `sleep-recovery` ◐ | ✗ | Port |
| Recovery and adaptation | `recovery-adaptation` ◐ | ✗ | Port |
| Pain, soreness, red flags | `pain-red-flags` ◐ | `training-with-injury` ◐ (a different topic) | Both need the corrections below before anything is copied |
| Missed sessions, coming back | `missed-sessions` ◐ | ✗ | Port |
| Growth spurts | `growth` ◐ | ✗ | Port. The lesson itself says its numbers come from football research: keep that sentence |
| Training on your period | ✗ | `training-on-your-period` ◐ | Needs the corrections and a juniors and parents lesson with red flags (see *Safe additions*) |
| Training with an injury | ✗ (`pain-red-flags` covers part) | `training-with-injury` ◐ | Same |
| What tennis asks of the body | `tennis-demands` ◐ | ✗ | Port |
| Why strength / Strength for tennis | `why-strength`, `strength` ◐ | ✗ | Port as two articles |
| Jumps and power | `jumps-power` ◐ | ✗ | Port |
| Speed, braking, change of direction | `speed-braking` ◐ | ✗ | Port |
| Agility and reaction | `agility-reaction` ◐ | ✗ | Port |
| Tennis fitness (aerobic) | `tennis-fitness` ◐ | ✗ | Port |
| Robustness | `robustness` ◐ | ✗ | Port |
| RPE and choosing a weight | `rpe-weights` ◐ | ✗ (the athletes' app has its own guide, `APP_GUIDE`) | Port to an article; keep the app guide as it is |
| Training alongside tennis and tournaments | `tennis-tournaments` ◐ | ✗ | Port; the lesson names course sessions, so rewrite the examples |
| How to read the card · parents' guide · ready for level 3 | n/a | n/a | Product-specific: stay in the course |

17 lessons wait to become articles; 2 articles wait to become lessons. Each lesson's sources are listed in the
`_notes` of its `tps_content` row (`learn-5` has them for the four nutrition and strength lessons): start from
those, then re-verify.

## Known problems found on 2026-10-02 (fix before reusing the text)

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
4. **A wrong citation in `learn-5` `_notes`:** PMID 36771479 (Huang 2023) is *Nutrition Recommendations for Table
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

## Open decisions (Amir)

See the end of the 2026-10-02 session summary; once decided, record each answer here.
