## 🗺️ The Quality Map — what each day builds (2026-09-24)

Idea #2 of `/ideas` round 1 (brief: claude.ai/artifact/US2RW8TaHZbFk8voADq6fu). Amir: *"it should be
on the day cards, in their home. both for tennis players, and other clients. the rest can be where
you recommend."* Server: `supabase/stage32_qualities.sql`.
- **Ten qualities** in `public.qualities`, plain word + the cycle-picture family it matches:
  Strength (iron) · Muscle (build) · Power (voltage) · Spring · Speed · Brakes · Rotation · Engine ·
  Armour · Movement (bedrock). Each has one line for everyone, a court line shown **only** when
  `sport.badge` says tennis or padel (`isRacketSport()`), and its tests. `get_qualities()` serves
  **approved rows only**; Amir approves them in coach.html → Exercises → *The ten qualities*.
- **Tagged once, on the Spine entry** (`exercises.qualities`, first = primary, max three). Never on
  a programme. Claude drafts tags on drafts only; for an entry Amir already approved the suggestion
  sits in `exercise_coach.suggested_qualities` and pre-fills his editor.
- **The day card on Home shows up to three chips** (`paintDayQualities()` → `qualityMix(day)`):
  working sets × (primary 1, secondary ½), **prep blocks skipped** (`isPrepBlockTitle()`), and
  **nothing at all below 70% tagged coverage**, rather than a wrong mix. **An exercise dosed by time
  with no sets counts one set per 10 minutes, never less than 1** (`qmSets()`, 2026-09-26): counted
  as 1 set, a 30-min easy ride scored under the 1.5 floor and an aerobic day's card showed no chip at
  all, and a run day with core work read "Armour" instead of "Engine". Tapping a chip opens the
  quality page (`openQualitySheet()`: the line and the court line; since 2026-09-27 no *How we measure it*, which
  named tests an athlete never meets, POL-01, Amir's A: the words stay in `qualities.tests` for coach.html); the About
  sheet's quality chips open it too. ⚠ **The explanation is the page** (Amir, 2026-09-24: *"the
  explanation is enough"*): the list of exercises that train it (*In your plan*) shows only when the
  page is reached from Library → Exercises (`openQualitySheet(q, fromLib)`), never from a day card or
  a card's ⓘ. **Words only: athletes never see set counts.**
- ⚠ **The mix rule exists in four places, one of them twice**: `qualityMix()` (program.html), `qualityDayC()` and the weekly
  `qualityCheckC()` (coach.html), the quality check in `/program-design` and `mix()`/`top3()` in `scripts/check_program.py`
  (2026-09-25). Same weights, same prep test and same minutes rule everywhere (`qmSets()` / `qmSetsC()` / `qm_sets()`), or the coach's
  check, the pipeline's check and the athlete's card disagree. The **70% coverage and the 12% cut belong to one day's card**, so they
  are in `qualityMix()`, `qualityDayC()` and `top3()`; `qualityCheckC()` is the week's ranking for the headline check and does not apply
  them. Until 2026-10-11 this paragraph said the coach's check applied both, and the dashboard guessed the day cards from the week's
  coverage (audit TWIN-9): it now runs the app's own rule for every day, in the phone's view (approved entries and approved qualities only,
  `qualityLensC()`) and again once the drafts are approved. `scripts/check_twins.js` runs `qualityMix()` and `qualityDayC()` on generated days
  and `check_parity.py` reads the three numbers in every copy.
- **A cycle's headline quality is its `art` word** (`QM_ART` in coach.html). `bedrock`, `peak` and `reset` are
  phases, not qualities: they have no headline and are never flagged (bedrock→movement flagged almost
  every foundation block, 2026-09-24). coach.html → Exercises →
  *Quality check* flags every current programme whose headline is not in its week's top two, and says day by day what each
  day card will show (or why it will be blank).
- `qualcache` (localStorage, no prefix) caches `get_qualities()` and never syncs.
- **There is NO Library → Qualities door.** It shipped and was removed the same day (Amir,
  2026-09-24: *"remove the qualities from library, bad decision"*). The Library has three panes:
  Sessions, Playbook, Exercises. Do not bring a qualities pane back.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
