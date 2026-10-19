## 6. The three metrics

### ACWR — acute:chronic workload ratio

Every session's load = **session RPE × duration in minutes** (Foster's method,
AU = arbitrary units). *Acute* = last 7 days; *chronic* = the 28-day weekly
average; **ACWR = acute ÷ chronic**.

| ACWR | Label | Meaning |
|---|---|---|
| **0.8 – 1.3** | Optimal | Training matches their fitness |
| **1.3 – 1.5** | Climbing | Ramping faster than ideal |
| **> 1.5** | High load | Spike — elevated injury risk |
| **< 0.8** | Low load | Detraining / under-loading |

Shows **"Building baseline"** until there are ~2 weeks of data, because the
ratio is meaningless before that. Between 2 and 4 weeks of history, the weekly average is taken over
the weeks that actually have history (it was always divided by 4, which made every new athlete read
a false *High load* of about 1.7 for a week). **A session in the last 4 weeks with no duration or no session
RPE is left out, and while any exist the ratio is not shown at all** (Amir, 2026-10-11: *"skip and grey out"*;
it used to count them as zero, which made the ratio wrong in a direction nobody could tell). The pill says
*not enough data*, the card says how many sessions are missing, and the weekly bars still use the sessions that do have a
load. It comes back when those are filled in or are more than 4 weeks old. On the roster a
**load** pill appears only for a spike (above 1.3), in words.

### Readiness

The athlete's check-in, scored out of 5 **the way their app scores it** (REC-2), **higher = fresher**. The score is the mean of
sleep, energy, stress and how ready they feel (soreness is asked, but it only moves impact work, so it is left out), and
**their usual is the mean of their last ten earlier scores, once they have five**. A 2/5 therefore reads as *"down from their
usual 4.1"* rather than against a generic cutoff. The app stores both with the check-in (`score`, `base`; `base` is null while
they had fewer than five) and the dashboard shows what was stored. A check-in from before 2026-09-26, or one imported from an
email, has neither, so the score is worked out from the four answers and the usual from the check-ins before it, by the same
rule (`readinessSC()` and `usualC()` are the twins of `readinessS()` and `readinessBase()` in `program.html`; `scripts/check_twins.js`
runs both on the same check-ins).

Three places show it and they say the same thing (audit TWIN-3 and TODAY-11, fixed 2026-10-11): the **pill** (the app's verdict for
the latest check-in: normal, lower or short day, the score and the usual), the **chart** behind the Charts button (the score of every
check-in, a dashed line at their usual now) and the **day card** (the score beside the verdict that it made). Until then the chart
plotted the old composite, which counts soreness and leaves out how ready they feel, against an all-time mean, so it could call a
day normal that the app had made lower. With fewer than five earlier check-ins there is no usual: the card says so, draws no dashed
line and colours nothing, and the pill never shows a made-up difference. Two check-ins on one day are told apart by the moment they
were answered, so the pill, the chart and the card name the same one as the latest.

### Adherence

Planned = their program's day count per week, pro-rated to the days in the window; completed comes
from `session_history` with a partial counting as half. Measured over the last 28 days, or the days
since their first session if that is shorter, so nobody is charged for days before they began (it
used to charge a whole week for a week that had just started, so a perfectly adherent new athlete
read 33%). Shown up to 100%, with "N more than planned" when they did extra. Green ≥ 85%, amber
60–84%, red < 60%.

---

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
