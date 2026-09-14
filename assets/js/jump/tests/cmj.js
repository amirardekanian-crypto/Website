/* ============================================================================
   cmj.js — Countermovement jump.

   Everything about this test lives in this file: what it's for, how to film
   it, how to do it, how it goes wrong, and the maths that turns two video
   frames into a number.

   CHANGING THIS TEST
   Edit this file. Nothing else needs to know. If you change a formula, change
   the matching line in `working` so "show the working" stays honest. If you
   change a threshold, say why in a comment so the next person doesn't undo it.

   THE compute() CONTRACT
     compute(trial, ctx) -> { primary, secondary[], warnings[], working[] }

     trial.flights      [{start, end, ok, sdStart, sdEnd}]  seconds
     trial.contacts     [{start, end, ok, sdStart, sdEnd}]  seconds
     trial.fpsLocal     frames per second across the analysed window
     trial.timingError_s  one sigma on a whole measured interval (a flight time
                          or a contact time), from physics.timingError_s. It
                          already includes both events, so never multiply it
                          by sqrt(2).
     trial.confidence   0 to 1, how much the detector trusts itself
     trial.posture      {standingBboxH, takeoffBboxH, landingBboxH, minFlightBboxH} px
     trial.parabola     {a, r2, impliedHeight_m, rho, band} from the airborne fit
     trial.firstMovement_s  null unless the athlete marked movement onset

     ctx.athlete        {height_m, bodyMass_kg|null}
     ctx.session        {arms, surface, dropHeight_cm|null, cue}
     ctx.P              JumpKit.physics

   Writing rules for the athlete-facing strings are in filming.js. No em
   dashes, no semicolons, contractions throughout.
   ========================================================================= */

(function (root) {
  "use strict";

  var JumpKit = root.JumpKit = root.JumpKit || {};

  JumpKit.registerTest({

    /* ================================================================
       IDENTITY
       ================================================================ */

    id: "cmj",
    name: "Countermovement jump",
    shortName: "CMJ",
    strapline: "How high you can jump from standing, dipping first.",
    orderIndex: 1,

    /* ================================================================
       WHY AN ATHLETE WOULD DO THIS
       Shown before the camera button. If someone doesn't know what the
       number is for, they won't record it properly.
       ================================================================ */

    whyItMatters: [
      "This is the standard test for how much force your legs can put into the floor, and how fast. You dip, then jump, in one movement.",
      "**The dip is the whole point.** When you drop quickly and reverse, your muscles and tendons stretch and snap back like a spring. Nearly everything that looks explosive in sport is built on that, so this one number tells us a lot about your legs.",
      "It's also useful for spotting fatigue. When you're carrying a lot of it, the average of your reps tends to drop, sometimes before you'd say you feel tired."
    ],

    decisionItFeeds:
      "If your score climbs by a real change while your body mass holds steady, the power work is doing its job. If it drops by a real change, check your sleep and training load before the next block gets harder. History tells you when a change is real.",

    /* ================================================================
       HOW TO DO IT
       ================================================================ */

    howToPerform: {

      setUp: [
        "**Hands on your hips and they stay there**, thumbs pointing back, elbows out. From the count down to the landing.",
        "Feet somewhere between hip and shoulder width. Stand tall and completely still on your taped X."
      ],

      cue: "3, 2, 1, go. Dip as deep as feels natural and jump as high as you can, all in one movement.",

      cueNote:
        "Say it the same way every time. The words change the test. If you cue depth you get a different jump from the one you get cueing height.",

      steps: [
        { n: 1, text: "Stand still on your mark, hands on hips. Wait for the count." },
        { n: 2, text: "On go, drop into a dip and come straight back up. **No pause at the bottom.** The dip and the jump are one movement, not two." },
        { n: 3, text: "Go as deep as feels natural to you. Don't try to hit a depth. Just do the same thing each rep." },
        { n: 4, text: "Drive all the way up. Hips, knees and ankles fully straight, and **point your toes** as you leave the floor." },
        { n: 5, text: "Land the way you took off. This one has its own section below, because it's the rule people break most." }
      ],

      landing: {
        title: "Land the way you took off",
        body: [
          "Land back on the same X, on the balls of your feet, legs almost straight. Then absorb and bend. **Absorb after you land, not as you land.**",
          "Here's why we're strict about it. We work out your jump from how long you were in the air, and that only works if you're the same height leaving the floor as you are coming back to it. If you leave with your toes pointed and land flat-footed with bent knees, you have further to fall, so you stay in the air longer without jumping any higher.",
          "**That's not a small thing.** About 20 degrees of difference at the ankle adds roughly 8% to a 30 cm jump. 30 degrees adds about 13%. In the worst case, a tall athlete with a modest jump landing flat, it can be over half again. It's the single biggest reason a video jump test shows fake improvement.",
          "The app checks this for you and flags it, but it can't undo it. Getting it right is on you."
        ]
      }
    },

    /* ================================================================
       FAULTS
       autoDetected: true means the app flags it from the video. Everything
       else is on the person watching.
       ================================================================ */

    faults: [
      {
        fault: "Tucking your legs up in the air",
        whatItDoesToTheNumber: "Inflates it, sometimes a lot. Bringing your knees up doesn't lift you any higher, it just keeps your feet off the floor for longer, and longer is exactly what we measure.",
        fix: "Legs long in the air. Think of hanging from your toes.",
        autoDetected: true
      },
      {
        fault: "Landing flat-footed or with bent knees",
        whatItDoesToTheNumber: "Inflates it by 8 to 13% typically. See the landing section above.",
        fix: "Toes down first, legs long, then absorb.",
        autoDetected: true
      },
      {
        fault: "Hands come off the hips",
        whatItDoesToTheNumber: "Adds 10 to 30%. A swinging arm is a real jumping advantage, which is fine, but it's a different test.",
        fix: "Thumbs hooked into your hip bones. If you keep losing them, hold your waistband.",
        autoDetected: false
      },
      {
        fault: "Pausing at the bottom of the dip",
        whatItDoesToTheNumber: "Lowers it. You lose the spring, and you've accidentally done a squat jump instead.",
        fix: "Down and up as one movement. Don't think about the bottom.",
        autoDetected: false
      },
      {
        fault: "A little step in or a hop before you jump",
        whatItDoesToTheNumber: "Makes the rep unusable. It's extra momentum we can't account for.",
        fix: "Set your feet, stand still, then go on the count.",
        autoDetected: false
      },
      {
        fault: "Landing well away from where you took off",
        whatItDoesToTheNumber: "Usually means you jumped forwards, not up, so the height is understated. It also confuses the automatic detection.",
        fix: "Straight up, land on the X.",
        autoDetected: true
      },
      {
        fault: "Your head leaves the top of the frame",
        whatItDoesToTheNumber: "We can't measure it at all. The rep is void.",
        fix: "Move the phone back, or lower. Leave 30 cm of space above your head at the very top.",
        autoDetected: true
      },
      {
        fault: "One foot lands before the other",
        whatItDoesToTheNumber: "Ends the flight early on one side and makes the landing frame ambiguous.",
        fix: "Land both feet together. If you can't, that's worth telling your coach about.",
        autoDetected: false
      }
    ],

    /* ================================================================
       WHAT HAS TO BE IDENTICAL BETWEEN SESSIONS
       ================================================================ */

    standardise: [
      "**Same shoes.** Footwear changes jump height on its own, so switching them looks like a training effect when it isn't.",
      "Same floor, same taped X, same phone position. Tape both marks and leave them there.",
      "Same time of day, within about an hour. You jump measurably lower first thing.",
      "**Hands on hips every time, or arm swing every time.** Never mix the two. An arm swing is worth 10 to 30%, so a mixed history is a meaningless history.",
      "At least 24 hours after hard lower body training, and 48 hours after a match. Otherwise you're measuring your fatigue.",
      "The same warm-up, in the same order, every session.",
      "Same phone and same frame rate every time. A 120 fps result and a 240 fps result don't go on the same line, and History keeps them apart."
    ],

    /* ================================================================
       ACCURACY, BEYOND THE SHARED FILMING RULES
       ================================================================ */

    reduceError: [
      "**Three good reps, not one.** Your jumps vary by about 6% from one rep to the next just through normal variation, about 2 cm on a 30 cm jump. Your score is your best good rep, and History needs all three before it judges a change.",
      "Rest a full minute between reps. Rushing them turns a power test into a fitness test.",
      "If your third rep is clearly your best, do a fourth. That usually means you were still warming into it.",
      "**Same shoes, same floor, same time of day.** Your best jump moves about 1 to 1.5 cm between days even when nothing has changed. That's normal noise, not a change in you, and History won't call it one.",
      "Don't test within 24 hours of hard lower body training, or 48 hours after a match. You'll be measuring your fatigue instead of your legs."
    ],

    /* ================================================================
       WHAT MUST BE MARKED ON THE VIDEO
       ================================================================ */

    events: [
      {
        id: "takeoff",
        label: "Takeoff",
        help: "The first frame where both feet are clear of the floor. If you can see daylight under the shoe, you've gone one frame too far, step back one."
      },
      {
        id: "landing",
        label: "Landing",
        help: "The first frame where either foot touches the floor again. First contact, not the frame where you're settled."
      },
      {
        id: "movementOnset",
        label: "Start of the dip",
        optional: true,
        advanced: true,
        help: "The first frame where you start to move downward. Only needed for the advanced RSImod figure, and even then it's an estimate, because the movement actually starts before anything visible happens."
      }
    ],

    /* ================================================================
       REQUIREMENTS
       ================================================================ */

    requires: {
      // Refused below this. It was 60 until 2026-09-14, but at 60 fps the
      // camera alone pushes the 95% change line past the 3 cm real change
      // line, see the README. Amir chose 120 on 2026-09-14.
      minFps: 120,
      preferredFps: 240,
      needsContactTime: false,
      needsBodyMass: false,    // optional, only gates the power estimate
      needsDropHeight: false,
      minValidTrials: 3
    },

    /* ================================================================
       PLAUSIBLE RANGES
       Warn outside the first pair, block outside the second. Blocked values
       are never shown as a number, they're replaced with the reason.
       ================================================================ */

    plausible: {
      height_m:     { warnBelow: 0.15, warnAbove: 0.60, blockBelow: 0.05, blockAbove: 0.75 },
      flightTime_s: { warnBelow: 0.25, warnAbove: 0.75, blockBelow: 0.20, blockAbove: 0.85 },
      rsiMod:       { warnBelow: 0.15, warnAbove: 0.70, blockBelow: 0.10, blockAbove: 0.80 }
    },

    /* ================================================================
       SCORING
       ================================================================ */

    scoring: {
      trials: 3,
      restSeconds: 60,
      // Best of 3, like the DTB protocol, and it's the score the typical error
      // in changeRule was measured on (Bogataj et al. 2020). The mean still
      // shows in History as a fatigue check. Amir chose this on 2026-09-14.
      score: "best",
      note: "Your score is your best good rep out of 3. A rep the app flags for a soft landing or tucked legs doesn't count unless you tell it the app got it wrong. The average of your good reps shows too, as a fatigue check, but track the best. Switching between best and average invents progress that isn't there."
    },

    /* ================================================================
       WHEN A CHANGE IS REAL
       Read by progress.js. Every line comes from a measured between-day
       typical error (te) of the session score, best of 3.
         wobble = sqrt(2) x te, to the nearest half centimetre
         real   = 1.96 x sqrt(2) x te = 2.77 x te, rounded up to the next
                  half centimetre
       Change te and the lines together, with the source. The self test
       checks each line against its te and fails if they drift apart.
       Amir approved these lines on 2026-09-14. All values in metres.
       ================================================================ */

    changeRule: {
      standard: {
        te: 0.010, wobble: 0.015, real: 0.030,
        source: "Bogataj et al. 2020, children aged 11 to 14 filmed at 240 fps"
      },
      // From age 18, or once the baseline is 35 cm or more. Measured in 17
      // and 18 year old professionals, so using it for older adults is an
      // extrapolation.
      bigJumper: {
        fromAge: 18, fromScore: 0.35,
        te: 0.0139, wobble: 0.020, real: 0.040,
        source: "Wilczyński et al. 2026, professional volleyball players aged 17 and 18"
      },
      // Nobody has published phone video jump reliability under 11. The
      // higher line, and it has to show up at two tests in a row.
      under11: {
        real: 0.040,
        source: "no data under 11"
      }
    },

    /* ================================================================
       THE MATHS
       ================================================================ */

    compute: function (trial, ctx) {
      var P = ctx.P;
      var out = { primary: null, secondary: [], warnings: [], working: [] };

      var flight = trial.flights && trial.flights[0];
      if (!flight) {
        out.warnings.push({
          id: "CMJ-NOFLIGHT",
          severity: "block",
          text: "We couldn't find a flight phase in this clip. Check you've trimmed to the jump itself."
        });
        return out;
      }

      /* ---- frame rate ------------------------------------------------ */
      // The page refuses a slow clip before analysis. This catches a variable
      // frame rate clip that had no single rate to check there.

      if (trial.fpsLocal && !P.meetsMinFps(trial.fpsLocal, this.requires.minFps)) {
        out.warnings.push({
          id: "FR-03",
          severity: "block",
          text: "This clip is about " + Math.round(trial.fpsLocal) + " fps. Below " + this.requires.minFps + " fps the camera's own error is big enough to hide a real change, so we won't give you a number. Record in slow motion at 240 fps."
        });
        return out;
      }

      /* ---- flight time and height ---------------------------------- */

      var ft = flight.end - flight.start;
      var h = P.jumpHeightFromFlightTime(ft);

      out.working.push({
        step: "Flight time",
        expression: "landing frame time minus takeoff frame time",
        result: P.fmt.seconds(ft) + " s"
      });
      out.working.push({
        step: "Jump height",
        expression: "9.81 x " + P.fmt.seconds(ft) + " squared, divided by 8",
        result: P.fmt.heightCm(h) + " cm"
      });

      /* ---- guards --------------------------------------------------- */

      var guard = P.guardHeight(h, ft);
      if (!guard.ok) {
        out.warnings.push({
          id: guard.kind === "timebase" ? "TB-02" : "CMJ-IMPLAUSIBLE",
          severity: "block",
          text: guard.kind === "timebase"
            ? "This clip says you were in the air for " + P.fmt.seconds(ft) + " seconds. That isn't physically possible, the longest human jump flight is about 0.95 seconds. The clip was almost certainly recorded in slow motion and saved with the slow motion baked in."
            : "That works out at " + P.fmt.heightCm(h) + " cm, which is outside what a person can do. Check the takeoff and landing frames before trusting anything here."
        });
        return out;
      }

      /* ---- precision ------------------------------------------------ */

      // timingError_s is already the error of the whole flight time, both
      // events added in quadrature (physics.js). It used to be multiplied by
      // sqrt(2) again here, which made every precision 1.4 times too big.
      var sigT = trial.timingError_s || P.timingError_s(1 / (trial.fpsLocal || 240));
      var sigH = P.heightSensitivity_m_per_s(ft) * sigT;

      out.primary = {
        key: "height",
        label: "Jump height",
        value: h,
        unit: "cm",
        display: P.fmt.heightCm(h),
        sublabel: "flight-time method",
        precision: "plus or minus " + (sigH * 100).toFixed(1) + " cm"
      };

      out.secondary.push({
        key: "flightTime",
        label: "Time in the air",
        value: ft,
        unit: "s",
        display: P.fmt.seconds(ft),
        sublabel: P.fmt.ms(ft) + " milliseconds"
      });

      /* ---- estimated peak power ------------------------------------- */

      if (ctx.athlete && ctx.athlete.bodyMass_kg) {
        var pp = P.peakPowerSayers_W(h * 100, ctx.athlete.bodyMass_kg, "cmj");
        out.secondary.push({
          key: "peakPower",
          label: "Peak power",
          value: pp,
          unit: "W",
          display: "about " + P.fmt.watts(pp),
          sublabel: "Sayers estimate, plus or minus " + P.SAYERS_SEE_W.cmj + " W",
          note: "This is a rough estimate from a group equation. It's fine for a ballpark and useless for tracking your own change, because the error is bigger than any improvement you'll make in a year."
        });
        out.working.push({
          step: "Peak power",
          expression: "51.9 x " + P.fmt.heightCm(h) + " + 48.9 x " + ctx.athlete.bodyMass_kg + " - 2007",
          result: P.fmt.watts(pp) + " W"
        });
      }

      /* ---- RSImod, advanced, off by default -------------------------- */

      if (trial.firstMovement_s != null) {
        var tttVideo = flight.start - trial.firstMovement_s;
        var tttCorr = P.correctTimeToTakeoff(tttVideo);
        var rm = P.rsiMod(h, tttCorr);
        out.secondary.push({
          key: "rsiMod",
          label: "RSImod",
          value: rm,
          unit: "m/s",
          display: P.fmt.rsi(rm),
          sublabel: "estimated, from video onset and corrected",
          advanced: true,
          note: "Treat this as approximate. The dip actually starts before anything moves on camera, so we correct for the bit the camera can't see. It's useful for spotting a big shift, not for fine tracking."
        });
        out.working.push({
          step: "RSImod",
          expression: "height divided by corrected time to takeoff (" + P.fmt.seconds(tttCorr) + " s)",
          result: P.fmt.rsi(rm) + " m/s"
        });
      }

      /* ---- plausibility warnings ------------------------------------ */

      var pl = this.plausible.height_m;
      if (h < pl.warnBelow) {
        out.warnings.push({
          id: "CMJ-LOW",
          severity: "amber",
          text: "That's " + P.fmt.heightCm(h) + " cm, which is low enough to be worth a second look. Check the takeoff and landing frames. If they're right, it's right, and it's a starting line, not a verdict."
        });
      }
      if (h > pl.warnAbove) {
        out.warnings.push({
          id: "CMJ-HIGH",
          severity: "amber",
          text: "That's " + P.fmt.heightCm(h) + " cm, which is near elite. Worth checking two things before you believe it: the frame rate the app detected, and whether the legs tucked up in the air."
        });
      }

      /* ---- posture checks, the fake-improvement detectors ------------ */

      var po = trial.posture;
      if (po && po.takeoffBboxH && po.landingBboxH) {
        var ratio = po.landingBboxH / po.takeoffBboxH;
        if (ratio < 0.93) {
          out.warnings.push({
            id: "TC-01",
            severity: "amber",
            voidOption: "Soft landing",
            text: "You landed lower than you took off, so flat-footed or with the knees already bent. That inflates this number, and it's the most common way a video jump test shows improvement that isn't real. Next rep, land toes first with long legs and absorb afterwards."
          });
        }
      }
      if (po && po.minFlightBboxH && po.standingBboxH) {
        if (po.minFlightBboxH < 0.85 * po.standingBboxH) {
          out.warnings.push({
            id: "TC-02",
            severity: "amber",
            voidOption: "Tucked legs",
            text: "Your legs tucked up in the air. That doesn't make you jump higher, it just keeps your feet off the floor for longer, which is what we measure. Void this one and do it again with long legs."
          });
        }
      }

      /* ---- physics cross-check --------------------------------------- */

      if (trial.parabola && trial.parabola.band) {
        if (trial.parabola.band === "amber") {
          out.warnings.push({
            id: "PH-01",
            severity: "amber",
            text: "From the video, you look about " + trial.parabola.impliedHeight_m.toFixed(2) + " m tall, and " + ctx.athlete.height_m.toFixed(2) + " m was entered. Either the height is wrong, or you weren't square on to the camera. Your jump height isn't affected, we just couldn't double check it."
          });
        }
        if (trial.parabola.r2 != null && trial.parabola.r2 < 0.97) {
          out.warnings.push({
            id: "PH-03",
            severity: "amber",
            text: "Your body didn't follow a clean arc through the air. That's usually an arm swing, a tuck, or drifting sideways out of the camera's plane."
          });
        }
      }

      return out;
    },

    /* ================================================================
       WHERE THIS CAME FROM
       ================================================================ */

    sources: [
      "Flight time to height is the standard projectile relationship. The assumption it rests on, and what breaks it, is written out in physics.js.",
      "Balsalobre-Fernandez et al. (2015), validity of video flight-time jump measurement against a force platform. This is the accuracy bar the tool aims at.",
      "The landing posture inflation figures (8% at 20 degrees, 13% at 30 degrees) come from the ankle plantarflexion analyses in the flight-time validity literature.",
      "Sayers et al. (1999) for the peak power regression, with its published standard error carried into the display.",
      "Ebben and Petushek (2010) for RSImod, and Balsalobre-Fernandez (2022) for the video time to takeoff correction.",
      "Hands on hips, self-selected depth, 3 trials with 60 s rest follows standard NSCA and UKSCA testing practice.",
      "Best of 3 as the score, as in the German Tennis Federation (DTB) test protocol. The DTB norm sheet, updated 5 September 2025, is where the range beside your result comes from.",
      "Bogataj et al. (2020) for the change lines. In 48 children aged 11 to 14 filmed at 240 fps, the best countermovement jump moved about 1.0 cm between two test days. Wilczyński et al. (2026) found 1.39 cm in 17 and 18 year old professional volleyball players, which sets the line for bigger jumpers.",
      "Pueo et al. (2023) for the frame rate. Filming at 120 fps adds about 1.4% error to jump height and 240 fps about 0.7%, which is why 120 is the floor and 240 the standard."
    ]
  });

})(typeof window !== "undefined" ? window : this);
