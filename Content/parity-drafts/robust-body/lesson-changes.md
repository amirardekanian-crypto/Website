# lesson-changes: robustness (learn-3), 2026-10-02

Source: `verify.md` (robust-body). Everything else in the lesson is unchanged (id, icon, group, order, title, summary, audience, section order, session names, all supported text).

| Section | Old text | New text (English twin shown; Farsi says the same) | Why (verify.md) |
|---|---|---|---|
| Where do tennis players get problems most? (callout) | "These studies only show where problems happen most. None of them show that training these areas prevents those problems." | Same two sentences, then: "Strength training does lower injuries in sport in general: a 2014 review of 25 trials found it cut them to less than a third. But the one tennis trial we found was an unsupervised 12 week online programme, and its injury rate was no lower than the control group's. That tested only that one programme. It doesn't prove that supervised work fails." | LESSON FIXES 2; claims 2 and 5 (Lauersen 2014, PMID 24100287; Pas 2020, PMID 32001517). 2018 review and the numbers 0.32, 579, 37/38% left out to keep the callout short. |
| Elbow, forearm and wrist (callout) | "These exercises are there to get your arm ready for the load of tennis, not to make your serve faster." | Same, then: "The research on lowering a weight slowly is in people who already have tennis elbow. Nobody has shown that it stops it starting." | LESSON FIXES 3; claim 12 (Peterson 2014, PMID 24634444): treatment evidence only. |
| Trunk, hips and groin (2nd paragraph) | "The groin takes a lot of load in side to side movement, reaching wide for balls and braking at the side of the court." | Same, then: "The Copenhagen Plank is from the same family of exercises that cut groin problems in a football trial. That result isn't from tennis, and linking it to tennis is the course's own reasoning." | LESSON FIXES 4; claims 15, 16, 17 (Harøy 2019, PMID 29891614; football only, link is inference). |
| Hamstrings and knees (1st paragraph) | "Your hamstrings work hard in sprinting and braking. They control the leg when it's out in front and straight." | Same, then: "The research showing fewer hamstring injuries with the Nordic Hamstring Curl was in athletes in other sports, not tennis." | LESSON FIXES 4; claim 18 (van Dyk 2019, PMID 30808663). |
| Shoulder and rotator cuff (4th list item) | "...more pulling sets (rows and chin-ups) than pushing sets." | Same, then: "That's the course's own rule of thumb, not a study result." | Claim 11: practice-based, "no study backs it". |
| Ankle, calf and foot (callout) | "...That's why foot work is in your warm-ups." | Same, then: "That choice is the course's own reasoning. No trial has shown that foot work lowers those problems." | Claim 26: could not verify. |
| Mobility and home sessions (2nd paragraph) | "It's written at RPE 7 or below, so it's fine if you're under 16 too." | Same, then: "That ceiling is the course's own rule of thumb, not a study result." Under-16 rule untouched. | Claim 28: practice-based. |

Farsi labels use the lesson's register, e.g. «این قاعدهٔ عملیِ دوره است، نه نتیجهٔ یک پژوهش».

## Not applied, Amir to decide
- **LESSON FIXES 1 (Bohm 2015 note):** the `_notes` entry saying effects were "larger with 12+ weeks" is not part of the lesson object, it sits in the body-level `_notes` array of `tps_content` learn-3. It should read "the 12 weeks or longer difference was not significant". Left for the learn-3 file/DB update, not in these drafts.
- **LESSON FIXES 5** (course-only wording removed from the public article) concerns the article only; the lesson keeps its Club A / Court B and course wording.
- No pointers added: the fixes ask for none. If you want one, the natural spot is the last warn, to «تمرین با آسیب‌دیدگی و برگشت بعد از آن» ("Training with an injury and coming back from it"); the builder checks every «…» after «درس» against the title list.

Changes: 2 facts corrected, 0 claims removed, 6 labels added, 0 pointers added
(The 2 facts are the two missing ones in the honest limit. Labels: forearm treatment-only, groin football/inference, hamstring other sports, pulling-sets rule, foot reasoning, RPE 7 ceiling.)
