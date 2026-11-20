# Rules — the athlete app in Farsi

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

The engine: [`assets/js/i18n.js`](../../assets/js/i18n.js) (its header is the full account). The words:
[`scripts/i18n/fa/*.json`](../../scripts/i18n/fa/), built into `assets/js/i18n-fa.js`. The brief the word lists were
written from: [`scripts/i18n/BRIEF.md`](../../scripts/i18n/BRIEF.md).

## What must never break

- **The same app, in Farsi** (Amir, 2026-11-20: *"its the same exact app, but in farsi"*). Settings → Language
  (English / فارسی) on the account sheet, stored on the phone as `aa_lang` (no athlete prefix: never synced). A change
  is a reload. **Exercise names stay English** (Amir: *"the name of the exercises will be in english"*): the engine
  skips the elements that hold a name (`AAI18N.skip`); a new place that draws a name gets one of those classes or
  `translate="no"`.
- **program.html stays written in English, and nothing in it is wrapped.** In Farsi `i18n.js` swaps each text node and
  each `placeholder` / `aria-label` / `title` / `alt` it has words for, as the app draws it, and mirrors every left/right
  rule of the page's style sheets in place (rtlcss's way). In English it sets nothing and returns. A new screen in
  English needs no code for Farsi, only its words in a part file and a rebuild.
- **Never compare displayed text in code** (`el.textContent === 'Dismiss'`): in Farsi it is not English any more.
  Compare a class, a `data-*` or the state. The word lists' `readback` items are the known cases.
- **Amir's picks, 2026-11-20 ("use your picks"):** Shamsi dates (the engine converts the app's English dates);
  Persian digits in sentences, a training number standing alone stays Latin.
- **The athlete picks their language, and it is the programme's** (Amir, 2026-11-20: *"let the client pick their
  language, and tell them that by choosing, their next cycle will be in their chosen language, for new clients, put it in
  their form"*; *"i want to write their notes once in the language they have choosen, not in 2 different language.
  exercises and their plan is the same"*). Settings → Language saves `athlete.lang` through `set_my_lang()` (stage110,
  which also turns their reminders) and says the next cycle comes in it (`setMyLang()`; with no signal it waits as
  `aa_lang_pending`). New clients answer *App Language* on the intake form. The pipeline writes every cycle's words in BOTH
  languages for every athlete since the same day (*"Yes, both always"*; COM-1); exercise names and the prescription are
  the same in both. On 2026-11-20 every programme was set
  `fa` except Lemuel, Juan and Dennis (`en`), on Amir's word.
- **The switch is for every athlete** since 2026-11-20 (`REVEALED = true` in `i18n.js`; Amir: *"Yes, show it"*). A phone
  with no choice of its own opens in the programme's `athlete.lang` (read from the saved plan in the `<head>`, or adopted
  at the first open, `AAI18N.adopt()`). `?fa=0` clears one phone's choice.
- **The Library and the Playbook are in both languages** (Amir, 2026-11-20: *"the libraries and playbook should be
  available in farsi and everything should be written in both languages"*). Each item carries its Farsi as `fa`, a full
  copy where only the words differ (SCHEMA.md → *Library tab*); the app shows it on a Farsi phone. `/workout` writes it in
  the file (guard 30), `/article` publishes it from the `.fa.json`, and coach.html's Publish keeps a live item's Farsi when
  a file has none. The current cycle of every Farsi athlete with a cycle running on 2026-11-20, and the demo, carry both
  languages: English in `<key>`, Farsi in `<key>_fa`, the phone's language shown (`faTwins()`; SCHEMA.md → *Programme
  texts in two languages*; COM-1). Every cycle written from then on carries both.
- **The exercise texts come from the Spine's Farsi columns** (`get_exercises_fa()`, stage65): steps, cues, purpose and
  On court, where the entry has them (`spineFaOverlay()`); the rest stays English. `spinecache_fa` is a cache, never synced.
- **Words are generated**: change a part in `scripts/i18n/fa/`, run `node scripts/build_i18n_fa.js`, bump `?v=` on the
  `data-fa` URL in program.html and the same URL in sw.js's SHELL, and the CACHE. Pre-commit guard 29 fails a stale build.
  An engine change is the same with `i18n.js?v=`.
- **New English in program.html gets its Farsi in the same run.** Pre-commit guard 31 (`scripts/i18n/check_new_words.js`)
  lists added texts with no Farsi words; it warns and never blocks, so read its list and add the words.
- **Every Farsi word an athlete reads is a draft until Amir has read it** (COM-3 in his Farsi voice: spoken, warm,
  informal تو). The engine's `AAI18N.missing` lists every English string a Farsi screen met with no words: read it in
  the browser to find what is left.
