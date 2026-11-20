# Brief: rewrite programmes' Farsi into Amir's spoken voice (COM-3)

The current cycles of 13 athletes carry their Farsi beside the English in `<key>_fa` (SCHEMA.md → *Programme texts in
two languages*). That Farsi was written in FORMAL, written Farsi. Amir's athletes read Amir's own voice: spoken,
warm, informal (COM-3). Rewrite every `_fa` string of your athletes into spoken Farsi. Same meaning, same facts,
same numbers, nothing added or dropped. This is a programme data run (PRC-1): touch no app code and no file in the repo.

## Formal → spoken (examples, not a complete list)
را → رو · است → ـه / هست (این مهمه، نه این مهم است) · می‌گوید → می‌گه · می‌دهم → می‌دم · نمی‌دهی → نمی‌دی ·
می‌کنید / هستید → می‌کنی / هستی (always تو, never شما) · گوشی‌ات → گوشیت · برنامه‌ات → برنامه‌ت · آن → اون ·
این‌ها → اینا · می‌شود → می‌شه · می‌توانی → می‌تونی · بخواهی → بخوای · بگذار → بذار · خانه → خونه · نمی‌خواهد → نمی‌خواد ·
همان → همون · چه → چی (where spoken) · یک → یه (where spoken) · بعد از تمام → بعد از «تمام».
A sentence Amir would type on WhatsApp to the athlete. Short sentences. Keep exercise names, cycle names and app button
names exactly as they are (names in English; an app label in Farsi only as the app itself shows it:
look it up in `scripts/i18n/fa/*.json`). Persian digits in sentences. Correct zero-width non-joiners (می‌شه). `؟` for
questions. Keep any HTML tags (`<p>`, `<strong>`) exactly where they are. A week note's `text_fa`: its first sentence
stays under 100 characters (COM-16).

## How
Supabase project `bvipfipbdcyqnbczjmaq`; load the SQL tool with ToolSearch
`select:mcp__9f4695ca-4b6a-40fc-b0aa-3960b9460bdd__execute_sql`. For each athlete, one at a time:
1. Read every `_fa` string with its path (a recursive jsonb walk; only keys ending in `_fa`, strings and lists of strings).
2. Write the spoken version of each, and update ONLY those paths (`jsonb_set` on the exact path; a list twin is replaced
   as a whole list of the same length), with `updated_by = 'program-edit: Farsi in Amir''s voice (Amir 2026-11-20)'`.
3. Verify on the server against the version history (`program_versions`: the row saved at your write's `updated_at`
   is the row as it was just before): nothing changed except values under keys ending in `_fa`; no key added or
   dropped; list lengths unchanged; every `_fa` string still has Farsi letters. Then count formal markers left with
   this regex over the `_fa` strings: `(\s|^)را(\s|$)|می‌گوید|می‌دهم|می‌کنید|هستید|\sاست[.\s،]` and get it to 0 or
   explain each one left.
Reply with: per athlete, how many strings rewritten, formal markers before and after, and the verify result.
