/* ============================================================================
   sj.js — Squat jump, and the eccentric utilisation ratio it unlocks.

   Same shape as cmj.js. Read the header there for the compute() contract and
   the writing rules.

   The one thing that makes this test different from every other one here: it
   is defined by what you DON'T do. A squat jump with a dip in it is not a bad
   squat jump, it's a countermovement jump. The whole file is built around
   catching that.
   ========================================================================= */

(function (root) {
  "use strict";

  var JumpKit = root.JumpKit = root.JumpKit || {};

  JumpKit.registerTest({

    id: "sj",
    name: "Squat jump",
    shortName: "SJ",
    strapline: "How high you can jump from a dead stop, with no dip.",
    orderIndex: 2,

    /* ================================================================ */

    whyItMatters: [
      "You hold still in a squat, then jump. No dip, no bounce, no help from the stretch in your muscles.",
      "**This strips out the spring.** A countermovement jump uses your muscles and your elastic tissue together. A squat jump uses just the muscle, from a standstill. So this is the closest thing we have to measuring pure leg strength turning into speed.",
      "On its own it's useful. Next to your countermovement jump it's more useful, because the gap between the two tells us how much you're actually getting out of the spring. That comparison has a name, the eccentric utilisation ratio, and the app works it out for you when you've done both in the same session."
    ],

    decisionItFeeds:
      "If your squat jump is climbing but your countermovement jump isn't, you're getting stronger without learning to use it fast, and the programme shifts toward jumps, throws and quicker ground contacts.",

    /* ================================================================ */

    howToPerform: {

      setUp: [
        "**Hands on your hips and they stay there.** Same as the countermovement jump.",
        "Squat down to roughly 90 degrees at the knee, about a half squat. Chest up, back straight, weight through the middle of your feet."
      ],

      cue: "Hold it. Hold. Go.",

      cueNote:
        "The hold is a full three seconds, and it has to be genuinely still. Count it out loud so the athlete can hear it.",

      steps: [
        { n: 1, text: "Drop into a half squat, about 90 degrees at the knee, and stop." },
        { n: 2, text: "**Hold completely still for a full 3 seconds.** No rocking, no sinking, no creeping up. Still." },
        { n: 3, text: "On go, jump as high as you can. **No dip first, at all.** Not even a small one." },
        { n: 4, text: "Drive all the way up, toes pointed as you leave the floor." },
        { n: 5, text: "Land exactly like the countermovement jump. Toes first, legs long, then absorb." }
      ],

      landing: {
        title: "Same landing rule as the CMJ",
        body: [
          "Land on the same spot, balls of the feet first, legs almost straight, then bend to absorb.",
          "**We measure your time in the air, so landing lower than you took off makes you look like you jumped higher.** The full explanation is on the countermovement jump page and it applies here word for word."
        ]
      },

      whyTheHold: {
        title: "Why we hold for three seconds",
        body: [
          "When you dip into a squat, your muscles and tendons store energy like a stretched elastic band. If you jump straight back up you get that energy for free.",
          "**Three seconds of stillness lets it leak away.** That's the whole point. Without the hold you're not doing a squat jump, you're doing a slow countermovement jump, and the comparison between the two tests stops meaning anything.",
          "One or two seconds isn't enough. Hold the full three."
        ]
      }
    },

    /* ================================================================ */

    faults: [
      {
        fault: "Any dip before you jump",
        whatItDoesToTheNumber: "Adds to it, and it stops being a squat jump. This is the fault that matters most, because a squat jump with a dip in it is just a worse countermovement jump.",
        fix: "Freeze in the bottom position. Think about pushing the floor away, not about dropping first.",
        autoDetected: true
      },
      {
        fault: "Creeping up or sinking during the hold",
        whatItDoesToTheNumber: "Same as a dip. If you're moving at all when go is called, the energy is back in the system.",
        fix: "Get into position, take a breath, brace, and be still. If you can't hold it, go a little higher than 90 degrees.",
        autoDetected: true
      },
      {
        fault: "The torso pitching forward as you jump",
        whatItDoesToTheNumber: "Lowers it. You're pushing yourself forward rather than up.",
        fix: "Chest up. Eyes on a point at head height across the room.",
        autoDetected: false
      },
      {
        fault: "Squatting much deeper or much shallower than last time",
        whatItDoesToTheNumber: "Makes sessions incomparable. Depth changes this test more than it changes a countermovement jump, because there's no spring to smooth it out.",
        fix: "Roughly 90 degrees, and the same each time. If you have a mirror or a coach, get it checked once and remember what it feels like.",
        autoDetected: false
      },
      {
        fault: "Hands come off the hips",
        whatItDoesToTheNumber: "Adds 10 to 30%, and breaks the comparison with your countermovement jump.",
        fix: "Thumbs hooked into your hip bones.",
        autoDetected: false
      },
      {
        fault: "Landing flat-footed or with bent knees",
        whatItDoesToTheNumber: "Inflates it, exactly as it does on the countermovement jump.",
        fix: "Toes down first, legs long, then absorb.",
        autoDetected: true
      }
    ],

    /* ================================================================ */

    standardise: [
      "**Same depth every time.** Roughly 90 degrees at the knee. Depth moves this test more than it moves a countermovement jump, because there's no spring to smooth it out.",
      "Same shoes, same floor, same taped X, same phone position.",
      "**Always after the countermovement jump, in the same session.** The other order leaves the spring primed and contaminates this test.",
      "A full 3 second hold, counted out loud, every rep.",
      "Hands on hips every time. This test is never done with an arm swing.",
      "Same time of day, and at least 24 hours after hard lower body training.",
      "Same phone and frame rate as the countermovement jump it gets compared against."
    ],

    reduceError: [
      "**Do this on the same day as your countermovement jump, in the same session.** The ratio between them is only meaningful if nothing else changed.",
      "Countermovement jump first, then squat jump. Doing it the other way round leaves the spring primed and contaminates the squat jump.",
      "Three reps, 60 seconds rest, average the good ones.",
      "**If your squat jump comes out higher than your countermovement jump, something's wrong.** Almost always it's a hidden dip. Scrub back through the frames before the jump and look at the hips.",
      "Watch the hold on the video, not just in the room. A dip small enough to miss with your eye is big enough to change the number."
    ],

    /* ================================================================ */

    events: [
      {
        id: "takeoff",
        label: "Takeoff",
        help: "The first frame where both feet are clear of the floor."
      },
      {
        id: "landing",
        label: "Landing",
        help: "The first frame where either foot touches down again."
      }
    ],

    /* ================================================================ */

    requires: {
      minFps: 60,
      preferredFps: 240,
      needsContactTime: false,
      needsBodyMass: false,
      needsDropHeight: false,
      minValidTrials: 3
    },

    plausible: {
      height_m:     { warnBelow: 0.12, warnAbove: 0.55, blockBelow: 0.05, blockAbove: 0.75 },
      flightTime_s: { warnBelow: 0.22, warnAbove: 0.70, blockBelow: 0.20, blockAbove: 0.85 },
      // EUR below 1.00 almost always means a dip crept in, not a real deficit.
      eur:          { warnBelow: 0.95, warnAbove: 1.30, blockBelow: null, blockAbove: null }
    },

    scoring: {
      trials: 3,
      restSeconds: 60,
      score: "mean",
      note: "Average of 3 good reps. Any rep with a dip in it doesn't count as a rep, redo it after full rest."
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
          id: "SJ-NOFLIGHT",
          severity: "block",
          text: "We couldn't find a flight phase in this clip. Check you've trimmed to the jump itself."
        });
        return out;
      }

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

      var guard = P.guardHeight(h, ft);
      if (!guard.ok) {
        out.warnings.push({
          id: guard.kind === "timebase" ? "TB-02" : "SJ-IMPLAUSIBLE",
          severity: "block",
          text: guard.kind === "timebase"
            ? "This clip says you were in the air for " + P.fmt.seconds(ft) + " seconds, which isn't physically possible. The clip was almost certainly recorded in slow motion and saved with the slow motion baked in."
            : "That works out at " + P.fmt.heightCm(h) + " cm, which is outside what a person can do. Check your takeoff and landing frames."
        });
        return out;
      }

      var sigT = Math.sqrt(2) * (trial.timingError_s || P.timingError_s(1 / (trial.fpsLocal || 240)));
      var sigH = P.heightSensitivity_m_per_s(ft) * sigT;

      out.primary = {
        key: "height",
        label: "Jump height",
        value: h,
        unit: "cm",
        display: P.fmt.heightCm(h),
        sublabel: "flight-time method, no countermovement",
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

      /* ---- peak power, SJ variant ----------------------------------- */

      if (ctx.athlete && ctx.athlete.bodyMass_kg) {
        var pp = P.peakPowerSayers_W(h * 100, ctx.athlete.bodyMass_kg, "sj");
        out.secondary.push({
          key: "peakPower",
          label: "Peak power",
          value: pp,
          unit: "W",
          display: "about " + P.fmt.watts(pp),
          sublabel: "Sayers squat jump estimate, plus or minus " + P.SAYERS_SEE_W.sj + " W",
          note: "A rough group-level estimate. Fine for a ballpark, not sensitive enough to track your own progress."
        });
        out.working.push({
          step: "Peak power",
          expression: "60.7 x " + P.fmt.heightCm(h) + " + 45.3 x " + ctx.athlete.bodyMass_kg + " - 2055",
          result: P.fmt.watts(pp) + " W"
        });
      }

      /* ---- eccentric utilisation ratio ------------------------------ */
      // Only when a CMJ exists from the SAME session. Comparing across
      // sessions would fold day to day variation into the ratio and make it
      // meaningless.

      if (ctx.sessionCmjHeight_m) {
        var ratio = P.eur(ctx.sessionCmjHeight_m, h);
        out.secondary.push({
          key: "eur",
          label: "Eccentric utilisation ratio",
          value: ratio,
          unit: "",
          display: ratio.toFixed(2),
          sublabel: "CMJ " + P.fmt.heightCm(ctx.sessionCmjHeight_m) + " cm over SJ " + P.fmt.heightCm(h) + " cm",
          note: "How much you get out of the spring. Most athletes sit between 1.00 and 1.15."
        });
        out.working.push({
          step: "Eccentric utilisation ratio",
          expression: P.fmt.heightCm(ctx.sessionCmjHeight_m) + " divided by " + P.fmt.heightCm(h),
          result: ratio.toFixed(2)
        });

        if (ratio < this.plausible.eur.warnBelow) {
          out.warnings.push({
            id: "SJ-EUR-LOW",
            severity: "amber",
            text: "Your squat jump came out at or above your countermovement jump. That's very unusual, and nine times out of ten it means a dip crept into the squat jump. Check the frames just before takeoff before you read anything into this."
          });
        } else if (ratio > this.plausible.eur.warnAbove) {
          out.warnings.push({
            id: "SJ-EUR-HIGH",
            severity: "amber",
            text: "A big gap between the two jumps. Either the squat jump was done from a much deeper position than usual, or it's genuinely a large spring contribution. Worth checking the depth on the video."
          });
        }
      }

      /* ---- the dip detector ----------------------------------------- */

      if (trial.preTakeoffDip) {
        out.warnings.push({
          id: "TC-04",
          severity: "amber",
          voidOption: "Dip before takeoff",
          text: "There's a dip before this jump. That makes it a countermovement jump, not a squat jump. Void it and do it again with a full 3 second hold."
        });
      }

      /* ---- shared posture and physics checks ------------------------ */

      var po = trial.posture;
      if (po && po.takeoffBboxH && po.landingBboxH && po.landingBboxH / po.takeoffBboxH < 0.93) {
        out.warnings.push({
          id: "TC-01",
          severity: "amber",
          voidOption: "Soft landing",
          text: "You landed lower than you took off, so flat-footed or with the knees already bent. That inflates this number. Land toes first with long legs, then absorb."
        });
      }

      if (trial.parabola && trial.parabola.band === "amber") {
        out.warnings.push({
          id: "PH-01",
          severity: "amber",
          text: "From the video you look about " + trial.parabola.impliedHeight_m.toFixed(2) + " m tall, and " + ctx.athlete.height_m.toFixed(2) + " m was entered. Check the height, or check you were square on to the camera."
        });
      }

      return out;
    },

    /* ================================================================ */

    sources: [
      "Same flight time relationship as the countermovement jump, see physics.js.",
      "McGuigan et al. (2006) for the eccentric utilisation ratio, height variant. The peak power variant exists but we don't implement it, because our peak power is itself an estimate and a ratio of two estimates compounds the error past usefulness.",
      "Sayers et al. (1999), squat jump coefficients.",
      "The 3 second hold, roughly 90 degree knee angle and hands on hips follow standard NSCA and UKSCA squat jump protocol.",
      "The rule that a low ratio usually means a hidden dip rather than a real eccentric deficit is standard practice guidance, and it's the reason the app checks the pre-takeoff frames automatically."
    ]
  });

})(typeof window !== "undefined" ? window : this);
