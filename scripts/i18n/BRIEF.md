# Brief: Farsi words for one slice of the athlete app (program.html)

You are writing the Farsi translation of the athlete app's interface text, for one line range of `program.html`.
You ONLY read `program.html` (and the files named here) and write ONE file: `scripts/i18n/fa/<your part>.json`.
Edit nothing else. Do not commit.

## How the translation works (read this first, it decides what you write)
`assets/js/i18n.js` (read it) watches the page. In Farsi it replaces each **DOM text node** and each
`placeholder` / `aria-label` / `title` / `alt` value **as a whole string** when it finds that exact string
(whitespace collapsed, trimmed) in a dictionary, or when the string matches a **pattern**. Nothing in
program.html is wrapped. So for every string a person can see or hear, you must work out **exactly what one text
node will contain once the template literal is rendered**:

- HTML tags split text into separate nodes: `Tap <b>Done</b> when finished` is three nodes: `Tap`, `Done`, `when finished`.
  Give each node its entry. If a sentence is split like this and the pieces cannot be translated well one by one,
  still give your best piece-by-piece entries AND list it under `"split"` with its line number.
- `${...}` inside a text node is part of the same node. `${n} sets left` → a pattern `"(\\d+) sets left"` → `"{n1} ست مونده"`.
  `Up next: ${esc(day.title)}` → `"Up next: (.+)"` → `"بعدی: $1"`.
- Ternaries and concatenation make several possible strings: `${w === 1 ? 'A report is' : w + ' reports are'} still waiting.`
  renders as `A report is still waiting.` (exact entry) or `3 reports are still waiting.` (pattern). Write each.
- Patterns: a JavaScript regex SOURCE, matched against the whole string (the engine adds `^...$`), JSON-escaped (so `\d` is
  written `\\d` in the file). Templates: `$1` = capture as it is (a name, a title), `{n1}` = capture written in Persian
  digits, `{d1}` = capture read as a date, `{t1}` = capture translated by the dictionary (e.g. a screen name).
  Make patterns specific (literal words around the captures), never `(.+)` alone.
- Dates (`12 Sep`, `Tue 22 Sep`, `Oct 3`, weekday names) are already converted to Shamsi by the engine. Do not add entries for them,
  but inside a sentence capture them with `{d1}`: `"finished (.+) on (\\w+ \\d+)"`.

## What to translate
Everything an athlete can read or hear on screen in your line range: text in HTML and template literals, button labels,
headings, empty states, toasts (`aaToast(...)`), `alert`/`confirm`, `aria-label`, `placeholder`, `title`, `alt`,
constant tables of words that are drawn (labels, tips, guide cards, help text). Text in a JS string that is assigned with
`.textContent =` or `.innerHTML =` counts.

## What NOT to translate (leave out entirely)
- Exercise names (they stay English), athlete names, anything that comes from the server (programme notes, titles of days
  and cycles, Library session names). Only text written in program.html itself.
- Code: class names, ids, keys, URLs, console messages, comments, CSS, regexes, `data-*` values, error codes.
- Product and feature names stay English: AA Performance, AA Proof, Career Mode, Hold Serve, Highlight Reel, Off the Glass,
  Split Step, Between Sets, Centre Court, Players' Lounge, the Spine. (Inside a Farsi sentence they appear in English.)
- Unit words standing alone: `kg`, `lb`, `RPE` alone, a number alone. A unit inside a sentence is translated with the sentence
  (kg = کیلو, lb = پوند, plates = پلیت).
- **Read-back danger**: if the code reads displayed text back and compares it (`textContent === 'Dismiss'`, `.innerText.includes(...)`,
  a button label used as a key), do NOT add that string; list it under `"readback"` with its line.

## The voice
Amir's own Farsi, as he texts his athletes: warm, spoken (محاوره‌ای), short sentences, informal "تو" (never "شما"):
`همون`, `می‌شه`, `نمی‌خواد`, `بزن`, `برو`. Plain words, no formal written Farsi, no English words where a normal Iranian gym-goer
says a Farsi one. Use the zero-width non-joiner correctly (`می‌شه`, `حرکت‌ها`, `ست‌ها`). Use `؟` for questions and Persian digits in
sentences (through `{n1}`). Keep it about as long as the English: labels on buttons must stay short.
Examples already approved by Amir (from `assets/js/sharecard.js`'s FA table): `سطح حرفه‌ای تو. هیچ‌وقت صفر نمی‌شه.` ·
`بیشتر، با همون تعداد تکرار و همون فشار.` · `تأیید مربی` · `رکورد جدید`.

## The glossary (always these words)
Read `scripts/i18n/fa/00-core.json` first: it already has the tabs, the account sheet and the common words. Do not repeat
its entries. Terms:
set ست · rep(s) تکرار · weight وزنه · body weight وزن بدن · kg کیلو · RPE / effort / how hard شدت · rest استراحت ·
session جلسه · day روز · week هفته · cycle دوره · programme / plan برنامه · exercise حرکت · warm-up گرم کردن ·
circuit سیرکویت · round راند · tempo تمپو · cue(s) نکته · steps (how to do it) مراحل · Coach's Note نکتهٔ مربی ·
Because چرا · check-in چک‌این · Personal records رکوردهای شخصی · new best رکورد جدید · retest تست دوباره ·
habit(s) عادت · achievement دستاورد · level سطح · XP امتیاز · crew تیم · reminder یادآور · Library کتابخانه ·
Playbook راهنمای بازی · Guided حالت هدایت‌شده · Home خانه · Progress پیشرفت · Coach مربی · Inbox پیام‌ها ·
Message Amir پیام به امیر · WhatsApp واتس‌اپ · Done (finishing a session) تمام · sign in ورود · sign out خروج ·
back-off week هفتهٔ سبک · testing week هفتهٔ تست · quality (Power, Strength, Speed, Armour…) the quality's Farsi:
Power توان · Strength قدرت · Speed سرعت · Armour محافظت · Endurance استقامت · Mobility تحرک · Agility چابکی.

## Output: `scripts/i18n/fa/<your part>.json`
```json
{
  "area": "<lines A-B: what is in it>",
  "exact":    { "English text node exactly": "Farsi" },
  "patterns": [ ["regex source", "template"] ],
  "split":    [ { "line": 123, "text": "the sentence, with its tags", "note": "why piecewise is weak" } ],
  "readback": [ { "line": 456, "text": "Dismiss", "note": "showInstallOffer compares it" } ]
}
```
Write valid JSON (check it with `node -e "JSON.parse(require('fs').readFileSync('<file>','utf8'))"`) and then run
`node scripts/build_i18n_fa.js` to prove it builds (every regex must compile). Then reply with ONLY: how many exact
entries and patterns you wrote, and how many split and readback items. No other summary.

Read the range in chunks (it is long); skim CSS and pure logic quickly, slow down on anything that renders text.
Be complete: a string you skip shows in English to a Farsi athlete.
