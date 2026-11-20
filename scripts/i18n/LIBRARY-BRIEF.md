# Brief: the Farsi copy of Library sessions (workouts)

Amir (2026-11-20): *"the libraries and playbook should be available in farsi and everything should be written in both languages"*.

Each Library session is a JSON item in `public.library`. Its Farsi is a **full copy of the item**, stored as `data.fa`,
with only the words an athlete reads translated. The app shows the copy when the phone is in Farsi.

## Your job
Read your input file (`{ "<slug>": <English item>, ... }`). Write the output file
`{ "<slug>": { "en": <the English item exactly as given>, "fa": <the Farsi copy> }, ... }` and run
`node scripts/i18n/check_library_fa.js <output>` until it prints ✓. Write nothing else, touch no database, commit nothing.

## Translate (and only these)
- `intro[]` (each paragraph), `before[].label` and `before[].text` (the safety checks: keep their meaning exact),
  `focusTag`, every exercise's `note`, a circuit item's `note` and `detail`, legacy `cues.good[]` / `cues.bad[]`, `why.text`.

## Never change (the checker fails if you do)
`id`, `title` (the session's name: the app logs it), `category`, `countsAs`, `duration`, `equipment`, every block's
`title` and `icon` (the app's logic reads block titles; they are translated on screen), exercise `name`, `exId`, `type`,
`videoUrl`, everything in `rx`, `intent`. Same keys, same order of items, nothing added or dropped.

## The voice
Amir's own Farsi, as he texts his athletes: warm, spoken (محاوره‌ای), short sentences, informal تو (never شما): `همون`,
`می‌شه`, `نمی‌خواد`, `بزن`. Plain gym words an Iranian player uses. Exercise names inside a sentence stay in English.
Correct zero-width non-joiners (`می‌شه`, `حرکت‌ها`), `؟` for questions, Persian digits in sentences (۳ دقیقه), but leave a
number that is part of a dose exactly as a dose reads. The safety lines (`before`) are about pain, dizziness and chest
pain: translate them precisely, no softening. Glossary: set ست · rep تکرار · rest استراحت · effort / RPE شدت · warm-up
گرم کردن · session جلسه · round راند · circuit سیرکویت.
