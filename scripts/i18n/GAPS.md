# Gaps found by opening every screen in Farsi (2026-11-20)

Write `scripts/i18n/fa/20-gaps.json` (same format and same rules as BRIEF.md) for the strings below.

## 1. Equipment words (the Spine's `equipment`, drawn under an exercise)
The engine already translates a list whose pieces it knows ("barbell, bench", "box or step"), so give an exact entry for
EACH SINGLE ITEM below, never the combinations with "or". Use the word an Iranian gym uses; where the gym word is the
English one (e.g. اسمیت, کراس‌اور for a cable machine, لندماین), use that in Farsi letters.

ab wheel · abduction machine · adduction machine · ankle strap · arm bike · ski erg · assault bike · assisted pull-up machine ·
back extension bench · ball · band · barbell · bodyweight · bar · rack · sturdy table · bench · box · chair · bike · cable ·
cable machine · chest press machine · coloured cones · cones · lines · dip bars · doorway · dowel · dumbbell · kettlebell ·
dumbbells · kettlebells · elliptical · ez bar · flat space · floor · rail · treadmill · wall · foam roller ·
glute kickback machine · hack squat · handle · handles · heavy long loop band · hip thrust machine · incline bench ·
incline press machine · jump rope · landmine · lat bar · leg curl machine · leg extension machine · leg press ·
light dumbbells · light plates · line · low box · low hurdle · low hurdles · low step · mat · medicine ball · mini band ·
none · optional weight · partner · fixed anchor · pec deck machine · phone app · plate · pull-up bar ·
pull-up bar with parallel handles · racket · reverse fly machine · rope · row machine · rower · seat · seated calf machine ·
shoulder press machine · sled · sliders · smith machine · space · stability ball · standing calf machine · step ·
straight bar · strap · suspension trainer · tennis ball · tennis balls · towel · trap bar · two cables · two kettlebells ·
two lines · wedge · court transfer · stick landing

## 2. Durations and doses drawn on cards and Library rows
Patterns, numbers in Persian digits: `5 minutes`, `20 seconds`, `3 × 20 seconds`, `3 × 20m each side`, `20m each side`,
`50 min · Barbell` (the second part is an equipment word or Court, Bodyweight, Bike, Bands, Dumbbells, Foam Roller:
use `{t2}` and add exact entries for those capitalised words), `45 min · from your programme`.

## 3. The habits (the five everyone has, and the ones a person can add)
Walk 10,000 steps · 10,000 steps · Sleep 7.5+ hours · 7.5 hours · 3 protein meals · 3 meals, protein in each ·
Drink 8 glasses · 8 glasses · Finish your session · + Stretch 10 minutes · + Breathe 10 minutes · + Take your supplements ·
Recovery · Breath · Care. Find the rest of the catalogue in `assets/js/habits-core.js` (the habit names and their short lines
that are drawn) and give them all.

## 4. Still English, written in program.html (find each and give it in context)
Tested one in the gym? Add it here. · Getting around · How your programme is structured · Effort & Tempo ·
The readiness check · Logging your sets · The ⓘ: what an exercise is for · What each day builds ·
Your history on every exercise · Personal Records: the most you could lift once · Finishing a session · Career: your level ·
Hold Serve: weeks in a row you trained · What to report & how often · Install the app on your home screen · Built-in tools ·
Questions or problems · Warm-Up · Dynamic Mobility · Activation · Plyometrics · Shoulder Prep · Accessory · Shoulder Health ·
Rotational Power · Recovery. (Also "The" and "The small" are pieces of split sentences: find them, translate the pieces so the
sentence reads in Farsi, and list them under "split".)

Do NOT translate: exercise names, AA Performance, the rest games' names, @amirardekanian, KG / kg.
