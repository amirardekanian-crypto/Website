# The jump test — how to change it

Everything about the jump tester that you might want to change lives in this
folder. The page itself (`/jump.html`) is only a renderer. It does not know
what a countermovement jump is, what the cue should be, or how to work out a
jump height. It asks these files.

That means **you can change how a test works without touching the app.**

---

## Where to go for what

| I want to change… | Open |
|---|---|
| A cue, a protocol, what counts as a fault, the number of reps | `tests/<test>.js` |
| A formula, or how a number is worked out | `physics.js` |
| How big a change has to be before it counts as real, for one test | that test's `changeRule` in `tests/<test>.js` |
| How reps become sessions, the baseline, and the words History uses | `progress.js` |
| The camera and recording guide | `filming.js` |
| What we ask the athlete, and the reason we give them | `athlete.js` |
| The reference range beside a countermovement jump, or the drop jump box height advice | `athlete.js` |
| How takeoff and landing are found in the video | `tracking.js` |
| How the video's frame timing is read | `video.js` |
| Whether the whole thing still works after you changed something | open `/jump-selftest.html` |

The four tests are `tests/cmj.js`, `tests/sj.js`, `tests/dj.js` and
`tests/hop-10-5.js`. They all have the same shape, so you can open two side by
side and see exactly where the protocols differ.

---

## Changing a test

Open its file. Everything is in one place: what the test is for, how to film
it, how to perform it, what goes wrong, the formulas, and the plausible ranges.

Two rules:

1. **If you change a formula, change the `working` line next to it.** The app
   has a "show the working" panel that reads those strings. If they stop
   matching the code, the app is lying to the athlete about how it got the
   number, which is worse than not showing the working at all.
2. **Never change a test's `id` once results exist.** Stored results point at
   it. Changing `cmj` to something else orphans everyone's history.
3. **Bump the `?v=` on the script tags in `jump.html` and `jump-selftest.html`
   whenever you change a file here.** `sw.js` serves JS cache-first to anyone
   who has the programme app, so without a new URL they keep the old file.

Reload the page with the browser console open. If you have broken the shape of
the file, `kit.js` tells you exactly which field and why, and the test does not
register rather than half-working.

---

## The house style rules are enforced

Athlete-facing text in these files is checked against the writing rules in
`.claude/COACHING-PRINCIPLES.md` whenever you open the page from disk or from
localhost. It warns in the console about:

- em dashes and spaced hyphens (use a comma)
- semicolons
- corporate filler
- hedging

It only warns, it never breaks the page, and it does not run on the live site.
If you want to change what counts as a style problem, the rules are in
`kit.js` under `STYLE_RULES`.

---

## The three things that decide whether a number means anything

Worth understanding before you change thresholds, because all three are easy
to break by accident.

### 1. Frame rate

Jump height is worked out from time in the air, and `height = 9.81 × time² / 8`.
Time is **squared**, so a 1% timing error is a 2% height error. Frame rate is
therefore the single biggest thing in the whole tool.

At 240 fps one frame is 4 ms and the tool is good to about 0.2 cm. At 30 fps
one frame is 33 ms and the same jump is only good to about 4 cm, which is more
than most athletes improve in a season.

That is why the app **refuses clips under 120 fps, for every test**. The jump
height tests used to allow 60. But at 60 fps the camera alone pushes the 95%
change line for a 24 cm junior jump from 2.8 cm to 3.4 cm, past the 3 cm line
History uses. At 120 fps it is 2.9 cm. The gate lives in each test's
`requires.minFps`, and `physics.meetsMinFps` lets a phone's 119.88 fps count as
120. The error table the guide displays is computed from `physics.js` rather
than typed in.

`physics.timingError_s` is the error of a whole flight time, both events
included, and it matches what Pueo et al. (2023) measured. Never multiply it by
√2 to get a flight time error. The app did until 2026-09-14, and every "plus or
minus" it showed was 1.4 times too big.

### 2. The gravity cross check

This is why the app insists on the athlete's standing height and will not
proceed without it.

Knowing how tall someone is gives us pixels per metre. We then fit a parabola
to their body as it moves through the air and measure gravity for ourselves.
If the video is running at the wrong speed, the measured gravity comes out
wrong by the square of the error, so a clip running 8× slow implies a gravity
of 0.15 m/s² and an athlete 112 metres tall. That is unmissable.

Without it, a slow-motion clip that has been saved with the slow motion baked
in produces a completely believable but wrong number, and **nothing in the
video file admits that it happened.** This is the highest-consequence failure
the tool can have. It is caught by two independent checks, and the self-test
asserts that both of them fire.

### 3. When a change counts as real

History never compares single reps. `progress.js` groups the saved reps into
sessions (one athlete, one day, the same conditions and frame rate), scores
each session the way the test says (`scoring.score: "best"` for both jump
height tests), and judges the latest session against a baseline and against
the test before it.

The lines come from each test's `changeRule`, and every line is built from a
measured between-day typical error (`te`) of the session score:

    MDC95 = 1.96 × TE × √(1 + 1/k)          physics.mdc95
      k = 1, one test against another:      2.77 × TE
      k = 2, against a 2-session baseline:  2.40 × TE

    real line   = 2.77 × TE, rounded up to the next 0.5 cm
    wobble line = √2 × TE, rounded to the nearest 0.5 cm

| Test | Who | TE | Wobble under | Real from | Source |
|---|---|---|---|---|---|
| CMJ | under 18, baseline under 35 cm | 1.0 cm | 1.5 cm | 3 cm | Bogataj et al. 2020, ages 11 to 14, 240 fps, best of 3 |
| CMJ | 18 and over, or baseline 35 cm and up | 1.39 cm | 2 cm | 4 cm | Wilczyński et al. 2026, professional volleyball, ages 17 to 18, mean of trials |
| Squat jump | everyone | 1.5 cm | 2 cm | 4.5 cm | Bogataj et al. 2020, ages 11 to 14 |
| CMJ and squat jump | under 11 | no data | no wobble line | 4 / 4.5 cm, twice in a row | stricter on purpose |
| Drop jump, 10-5 | everyone | not sourced | no verdict | no verdict | `changeRule: null` |

Between the two lines is "possible, check the next test". The baseline is the
mean of the first two comparable sessions no more than 7 days apart, or the
first session on its own. Against the baseline, a possible change that goes
the same way as the test before reads as likely real, which by simulation is
wrong about 5% of the time when nothing has changed.

Two limits worth knowing. The adult line comes from 17 and 18 year old
professionals, so using it for older adults is an extrapolation. And nobody
has published phone video jump reliability under 11.

**Why not a percentage of the reps.** Until 2026-09-14 the gate was
`1.96 × CV × √(2/n)`, with n the reps in a session, which put it at 6.4%. That
assumes averaging reps removes day to day noise. It doesn't, so about 1 in 4
retests with no real change got called real. It also compared the last two
saved reps, often from the same session, and never split athletes.

**Changing a line safely.** Change `te` and the lines together, in the test
file, with the source next to them. The self test checks every line against
its `te` by the rounding rules above and fails if they drift.

---

## Running the self test

Open `/jump-selftest.html` and press the button.

It builds jumps in memory where the true height is known exactly, runs them
through the real tracker and the real formulas, and reports the error. It also
builds saved histories where the right verdict is known, and runs them through
`progress.js` and each test's `changeRule`. Do this after changing anything in
this folder.

Reading it:

- **Accurate** cases have to land within tolerance. Under 1 cm at 240 fps is
  the bar, because published validation of phone-based flight-time measurement
  sits around there.
- **Caught** cases are deliberately unfair. They pass by being *refused*: no
  number, or confidence under 0.80, or the physics check going red. A hard
  shadow under the feet genuinely cannot be measured, so the only correct
  behaviour is to say so rather than to guess.

The self-test does not test video decoding, only the tracking and the maths.
Those are the parts that can be wrong without anything looking wrong.

---

## What is deliberately not here

- **No pose estimation or AI body tracking.** The published bias for that
  approach is not even stable in sign between studies, and it needs a model
  downloaded from another server, which would break the promise that nothing
  leaves the device.
- **No camera distance or tripod height questions.** They change nothing we
  compute, because the gravity cross check absorbs the camera geometry on its
  own. Asking would be theatre.
- **No single-leg asymmetry yet.** It needs at least three reps per limb
  before the number means anything, and a one-rep asymmetry figure in a
  beginner's hands is worse than no figure.
- **No frame interpolation, ever.** Slowing a clip down in software invents
  frames that were never photographed, and the takeoff frame you end up
  measuring may not have existed.

---

## Known limits, honestly

- **Analysis blocks the main thread.** A long clip can freeze the page for a
  few seconds while it works. The fix is a Web Worker, and the code is already
  structured for it (`tracking.js` takes plain typed arrays in and gives plain
  values out).
- **Decoding is done by seeking frame by frame**, which is slower than a
  WebCodecs decoder would be. The seek path is the one the validation
  literature used and it verifies which frame it actually landed on, so it is
  correct but not fast. `video.js` explains what adding the fast path involves.
- **The shadow handling is good, not perfect.** A shadow that stays attached
  under the foot for the entire jump cannot be separated from the foot by any
  method here. The app detects that it is in trouble and asks for the frames
  to be marked by hand, which is the method with the best published
  reliability anyway.
- **Everything is validated against synthetic video, not real footage.** The
  maths and the tracking are proven against jumps where the true answer is
  known exactly. What has not been proven is the whole chain end to end on a
  real phone clip against a real force plate. That is the next thing worth
  doing.
