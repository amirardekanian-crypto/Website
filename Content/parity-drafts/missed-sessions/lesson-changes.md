# lesson-changes: missed-sessions (learn-4 / missed-sessions), 2026-10-02

Source: `verify.md` in this folder (LESSON FIXES c1-c6, claims table, doctor-to-check). Fixes apply to both `lesson.fa.json` and `lesson.en.json`. Unchanged: id, icon, group, order, audience, title, summary, section order, session names, every rule.

| Section | Old text | New text (English twin shown) | Why (verify.md) |
|---|---|---|---|
| Everyone misses sessions sometimes (p4) | "there's no research on coming back after a break in junior players. All the numbers in this lesson are our practical guide." | "we found no study of coming back after a break in tennis or padel players, or in junior players. General research suggests a short break costs little strength: in 12 power athletes, 14 days off lifting did not significantly change bench press, squat or vertical jump. The numbers in this lesson are the course's own practical guide, not a study result." | LESSON FIX 5; claim 1 (Hortobagyi 1993, PMID 8371654); claim 18; label for the practice-based day bands (claim 17) |
| How many days has it been? (p1) | no label on the day bands | added sentence: "These day bands are the course's own rule, not a study result." | claim 17 (practice-based, no study tests these cut-offs); LESSON FIX 4 |
| The week rules (p1) | "These rules stop falling behind from turning into cramming:" | added: "These rules come from the course's own practice, not from a study." before it | practice-based caps and ladders (no verify row; same principle as claim 17) |
| Coming back after illness (p1) | "If an illness below the neck lasts 3 days, or a fever lasts more than 3 days, see a doctor." | "If a fever drags on or you're getting worse, see a doctor." (numbers removed) | LESSON FIX 3; doctor-to-check bullet 3: "the lesson's 3-day numbers were dropped on purpose" |
| Coming back after illness (new p3) | none | added: "Two common rules are used in this section: 24 hours without fever, and the above-or-below-the-neck check. They are practical rules, not study results." | claim 14 (24 h rule, practice-based); claim 13 (neck check is a rule of thumb, no published test of it as of 2014) |
| Coming back after illness (list item 1) | "A cold only above the neck ... and no fever: keep training as planned." | "... and no fever: you can usually train. Stop if you feel worse as you go." | LESSON FIX 2; doctor-to-check bullet 4 |
| Coming back after injury (warn) | "Same problem back within 4 weeks of being cleared by a doctor or physio?" | "Same problem back after your doctor or physio cleared you?" (4-week number removed) | LESSON FIX 3 (no source for "4 weeks"); doctor-to-check |
| Coming back after injury (new p5) | none | pointer: "What to ask your doctor or physio, and how a comeback is staged, is in the lesson “Training with an injury and coming back from it”." Farsi: «تمرین با آسیب‌دیدگی و برگشت بعد از آن» | Assignment pointer; exact titles from `training-with-injury/lesson.*.json` (the injury lesson already points back here) |

Farsi twin carries the same eight changes (colloquial-free, lesson register, Persian digits, «٫» not needed, ZWNJ checked).

Checked and left as is: "above the neck" list wording (stays, now with the stop-if-worse line); the red-flag warn in the illness section and the level-1 and head-injury lines (qualitative; doctor to check, see below); under-16 line; the 5-weeks example (matches the 29 to 56 day band).

Changes: 2 facts corrected, 2 claims removed, 3 labels added, 1 pointers added

(Facts corrected: the junior/tennis research line now points to the verified general study; the cold-above-the-neck line now says stop if you feel worse. Claims removed: the "3 days" numbers and the "4 weeks" number. Labels added: day bands, week rules, 24-hour and neck-check rules. The section 1 sentence also keeps its own "practical guide" label.)

## Not applied, Amir to decide
- **Aerobic fitness (LESSON FIX 4, optional part):** research says aerobic fitness falls faster than strength in short breaks (claim 2, Mujika and Padilla 2000). The fix said to keep the existing honest-limit sentence, which is done. I did not add a line about conditioning, to avoid a new claim the course does not otherwise handle.
- **Source mix-up (LESSON FIX 1):** the lesson cites no paper, so nothing to change. A person with access should read the IOC 2022 return-to-sport guidance (PMID 35863871, paywalled, abstract only) and check the illness rules against it.
- **Structure flags already in the live lesson (not mine, left untouched):** the Farsi `summary` has two sentences (a question and a statement) where the builder asks for ONE; the English "Coming back after injury" first paragraph has 4 sentences (Farsi has 3, joined by a semicolon). Say if you want these tightened.
- **Twin differences that were already there (kept):** the English twin mentions the Coach tab and messaging Amir, and a Monday to Sunday week; the Farsi twin has "nobody tracks your place" and a Saturday to Friday week. Intentional localisation, not touched.
- **Doctor to check (verify.md section e), before launch:** the whole illness and injury sections, in particular the 24-hour fever rule, the red-flag line, "if a fever drags on or you're getting worse, see a doctor", the mild-cold wording, the head-injury line and the under-16 line.
