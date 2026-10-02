# lesson-changes: fuel-training (learn-5), 2026-10-02

Farsi in `lesson.fa.json`, English twin in `lesson.en.json`. Rows show the English; the Farsi says the same.

| Section | Old text | New text | Why (verify.md) |
|---|---|---|---|
| After training | "If you train or play again the same day or the next morning, don't push this meal back. If not, ..." | "If you train or play again within about 8 hours, don't push this meal back. If the gap is longer, ..." | LESSON FIXES 1; claims row "Same-day or next session" (ITF 2025 Table 3: rapid refuelling when under 8 h) |
| During training | "In total, about one banana or a few dates per hour." | "In total, at least about one banana per hour." plus new item: one banana is about 25 g, the low end; the adult tennis guideline is 30 to 60 g an hour for 90 min to 3 h; add a few dates if still flat; no set number for growing players, ask a sports dietitian | LESSON FIXES 2, 7; claims rows "One banana about 25 g" and "30-60 g an hour" (ITF 2025 Table 3). "About 25 g" is from food tables, dietitian to check. No junior number given |
| Two sessions in one day | "Gap under about 2 hours: only a light, familiar snack" | "small, light snacks you know well ... a little at a time and often" plus new item: if both sessions are hard and the gap is under about 8 h, eat those small snacks several times | LESSON FIXES 3; claims rows "Two sessions in a day" and "Gap under 2 h" (ITF 2025 Table 3). The 1-1.2 g/kg/h figure is not added (adult number, no junior numbers) |
| Teenagers: calcium, vitamin D and iron | "have it [tea] a while before or after meals, not with them" | "Tea can lower iron absorption, so drink it between meals, not with them. This matters most when your meals are low in meat, chicken, fish, fruit and vegetables." | LESSON FIXES 4; Zijp 2000 PMID 11029010 (no longer a flat absolute) |
| Caffeine and supplements | "Paediatric experts say caffeine and the stimulants in energy drinks have no place..." right after the coffee/tea ban, so it read as an expert rule for coffee and tea | Same expert line, tied to energy drinks; then "Keeping coffee and tea out for this purpose too is the course's own caution" | LESSON FIXES 5; AAP 2011 PMID 21624882 is about energy drinks only |
| Caffeine and supplements | "a normal cup about an hour before playing may help a little" | adds: "The studies used bigger doses, about 3 mg per kg of body weight, which is around 200 mg for a 70 kg player" | claims row "Adults: a normal cup" (Guest 2021 PMID 33388079; Hornery 2007 PMID 19171960); 200 = 3 x 70 |
| Before training | "A little carbohydrate before long or hard sessions helps performance." | adds "though that finding comes mostly from endurance sport, not tennis" | claims row "A little carbohydrate before long or hard sessions" (Rothschild 2020 PMID 33198277) |
| Before training | (no label on the 2-4 h and 30-60 min windows) | item 2 ends: "These two time windows are the course's own working rule, not a study result." | LESSON FIXES 6; claims row "Meal 2-4 h before; snack 30-60 min before" (practice-based inside the ITF 1-4 h range) |
| Two sessions in one day | (no label on the 2-hour mark) | "This 2-hour mark is the course's own working rule, not a study result." | claims row "Gap under 2 h: light snacks" (practice-based) |
| During training | (salt and ayran advice stated flat) | "This is practical advice, not a study result. If a doctor has told you to limit salt, follow that." | claims row "Salty snack after heavy sweating; ayran" (practice-based; doctor to check for people limiting salt) |
| Teenagers: eat enough | "These signs mean it's time to see a doctor" | "These signs (a list from the course itself, not from one study) mean ..." | claims row "Warning signs" (standard clinical flags, no single source) |

Changes: 5 facts corrected, 0 claims removed, 5 labels added, 0 pointers added

Fact count: after training (8 h), banana per hour, two-session gap, tea, coffee/tea attribution. Two more edits are additions to existing statements and are counted as corrections too if you prefer: adult caffeine dose, and carbohydrate-before-training "mostly endurance sport" (so 7 if you count them).

## Left as it was (checked)
- Vitamin D "also in eggs and fish": LESSON FIXES 8 says the wording is fine; eggs are not named in the ITF text, dietitian to check.
- "Very fatty, fried or spicy ... can sit heavy": only fat and fibre have support, but "can" already hedges it. Kept.
- Source note `_notes` citing Huang 2023 as a racket-sport study (LESSON FIXES 6): the lesson object from the database has no `_notes` field, so there was nothing to change here. If a `_notes` field sits elsewhere in the course data, drop the Huang 2023 (PMID 36771479) citation: it is table tennis.
- Section structure, `id`, `icon`, `group`, `order`, `audience`, summary, titles and callouts: unchanged. The English intro paragraph of the first section has a 4-sentence count by a strict splitter, as in the original text (unchanged).

## Not applied, Amir to decide
- LESSON FIXES 7 (adult daily numbers 3-5 / 5-7 / 6-10 g/kg carbohydrate, protein 1.2-1.8 g/kg, the 30-60 minute "dip" after a sweet snack, ITF's 1-1.2 g/kg/h for two hard sessions): not applied. The fix says the lesson "may keep its qualitative version for juniors", and the course has no junior numbers. The only numbers added are the 30 to 60 g an hour (marked adults) and the 25 g banana. The "dip" caveat could be added as one more item in "Before training" (list is at 5 of 8) if you want it.
- Dietitian to check (verify.md section e): the banana ~25 g and 30-60 g lines, salt and ayran, the timing windows. Doctor to check: the warning-sign list, and the salt line for anyone told to limit salt.
