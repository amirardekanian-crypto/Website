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
  Persian digits in sentences, a training number standing alone stays Latin; the switch stays hidden until the words
  are done.
- **The athlete picks their language, and it is the programme's** (Amir, 2026-11-20: *"let the client pick their
  language, and tell them that by choosing, their next cycle will be in their chosen language, for new clients, put it in
  their form"*; *"i want to write their notes once in the language they have choosen, not in 2 different language.
  exercises and their plan is the same"*). Settings → Language saves `athlete.lang` through `set_my_lang()` (stage110,
  which also turns their reminders) and says the next cycle comes in it (`setMyLang()`; with no signal it waits as
  `aa_lang_pending`). New clients answer *App Language* on the intake form. The pipeline writes a cycle's words ONCE, in
  `athlete.lang`; exercise names and the prescription are the same in both. On 2026-11-20 every programme was set
  `fa` except Lemuel, Juan and Dennis (`en`), on Amir's word.
- **The switch is hidden** (`REVEALED = false` in `i18n.js`): only a phone opened once with `?fa=1` shows it (`?fa=0`
  turns it off). Revealing it is Amir's call; then a phone with no choice follows the programme's `athlete.lang`
  (`AAI18N.adopt()`, from `savePlanCopy()`'s callers).
- **The exercise texts come from the Spine's Farsi columns** (`get_exercises_fa()`, stage65): steps, cues, purpose and
  On court, where the entry has them (`spineFaOverlay()`); the rest stays English. `spinecache_fa` is a cache, never synced.
- **Words are generated**: change a part in `scripts/i18n/fa/`, run `node scripts/build_i18n_fa.js`, bump `?v=` on the
  `data-fa` URL in program.html and the same URL in sw.js's SHELL, and the CACHE. Pre-commit guard 29 fails a stale build.
  An engine change is the same with `i18n.js?v=`.
- **Every Farsi word an athlete reads is a draft until Amir has read it** (COM-3 in his Farsi voice: spoken, warm,
  informal تو). The engine's `AAI18N.missing` lists every English string a Farsi screen met with no words: read it in
  the browser to find what is left.
