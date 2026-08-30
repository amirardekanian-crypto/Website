/* ============================================================================
   dj.js — Drop jump, and the reactive strength index.

   Same shape as cmj.js. Read the header there for the compute() contract.

   TWO THINGS TO KNOW BEFORE YOU EDIT THIS FILE

   1. There are two RSI conventions in the wild and they are not convertible
      by a constant. We show both, always labelled, never both called "RSI".
        RSI  = jump height / contact time     m/s     (Young, Flanagan)
        RSR  = flight time / contact time     no units (Healy)
      If you ever decide to show only one, show RSI, and keep the label.

   2. This test needs a faster camera than the jump height tests. Contact time
      is about two and a half times shorter than flight time, and the takeoff
      frame is shared between the two, so a timing error hits RSI twice.
      minFps is 120 here on purpose, not 60.
   ========================================================================= */

(function (root) {
  "use strict";

  var JumpKit = root.JumpKit = root.JumpKit || {};

  JumpKit.registerTest({

    id: "dj",
    name: "Drop jump",
    shortName: "DJ",
    strapline: "How fast you can turn a landing back into a jump.",
    orderIndex: 3,

    /* ================================================================ */

    whyItMatters: [
      "You step off a box, land, and jump straight back up as fast as you can. We measure two things, how long you spent on the floor and how high you went, and put them together.",
      "**This is about stiffness, not strength.** Sprinting, changing direction, jumping off one leg in a game, all of those give you about a fifth of a second on the ground to do something useful. A big slow jump is no help if you take half a second to produce it.",
      "The number we report is called RSI, the reactive strength index. Read it as how much jump you get per second on the ground. Going up means you're either getting off the floor faster, jumping higher, or both."
    ],

    decisionItFeeds:
      "A low RSI with a long contact time says you need to spend time on fast, stiff work, so pogos, short contacts, low box drops. A good RSI says you can handle heavier plyometrics and taller boxes.",

    /* ================================================================ */

    howToPerform: {

      setUp: [
        "**Box at 30 cm to start.** If you're new to this, or under about 16, start at 20 to 30 cm. Only go higher once your contact stays short and you're not collapsing into the landing.",
        "Hands on hips, and they stay there. Stand at the front edge of the box."
      ],

      cue: "Off the ground as fast as possible, as high as possible.",

      cueNote:
        "Say this exact sentence, every rep, every session. It isn't decoration. Cue height on its own and the athlete sinks into a deep bend and does a slow, high jump. Cue speed on its own and they barely leave the floor. The two together are what this test is. If you change the words, you've changed the test, and the app records which cue you used so it won't compare the two.",

      steps: [
        { n: 1, text: "Stand on the box, toes at the front edge, hands on hips." },
        { n: 2, text: "**Step off. Do not jump off.** Step your lead leg out into the air and let yourself drop. No push from the back leg, no little hop up first." },
        { n: 3, text: "Land on both feet at the same time, on the balls of your feet." },
        { n: 4, text: "**Rebound immediately.** No pause, no reset, no sinking into a squat. Touch and go." },
        { n: 5, text: "Jump as high as you can while spending as little time on the floor as you can." },
        { n: 6, text: "Land the way you took off, toes first, legs long, then absorb." }
      ],

      landing: {
        title: "Why stepping off matters so much",
        body: [
          "If you push off the box, you arrive faster and from higher than the box height says. That changes the forces going through you and it changes the answer.",
          "**Two reps where you pushed off by different amounts aren't comparable, and neither are two sessions.** Step out, and let gravity do the rest."
        ]
      }
    },

    /* ================================================================ */

    faults: [
      {
        fault: "Jumping off the box instead of stepping off",
        whatItDoesToTheNumber: "Makes it uncomparable. You've secretly raised the box, so the impact is bigger and the RSI isn't measuring what it was last time.",
        fix: "Step the lead leg out and drop. If you keep hopping, stand closer to the edge.",
        autoDetected: false
      },
      {
        fault: "Sinking into a deep squat on landing",
        whatItDoesToTheNumber: "Lowers RSI a lot, because contact time goes up faster than jump height does. At that point it's a countermovement jump off a box, which is a different test.",
        fix: "Stiff ankles, land ready. Think of the floor being hot.",
        autoDetected: true
      },
      {
        fault: "Pausing or resetting before the rebound",
        whatItDoesToTheNumber: "Destroys it. The whole test is the speed of the turnaround.",
        fix: "Touch and go. If you can't, the box is too high, drop it by 10 cm.",
        autoDetected: true
      },
      {
        fault: "Landing one foot before the other",
        whatItDoesToTheNumber: "Makes the contact start ambiguous, so the contact time is wrong and RSI is wrong with it.",
        fix: "Both feet together. If one always lands first, that's worth mentioning to your coach.",
        autoDetected: false
      },
      {
        fault: "Hands come off the hips",
        whatItDoesToTheNumber: "Adds height and changes contact time, so it moves RSI in a way you can't unpick.",
        fix: "Thumbs hooked into your hip bones.",
        autoDetected: false
      },
      {
        fault: "Landing flat-footed or with bent knees at the end",
        whatItDoesToTheNumber: "Inflates the jump height part of RSI, same as on any other test here.",
        fix: "Toes first, legs long, then absorb.",
        autoDetected: true
      },
      {
        fault: "Using a box that isn't the same as last time",
        whatItDoesToTheNumber: "Changes the test outright. Box height is stored with every result and the app won't plot two heights on one line.",
        fix: "Pick a box height and stay on it for the whole block.",
        autoDetected: false
      }
    ],

    /* ================================================================ */

    standardise: [
      "**Same box height for the whole block.** It's stored with every result and the app won't plot two heights as one line.",
      "**The same cue, word for word.** Cueing height alone and cueing speed alone produce genuinely different tests, not better or worse reps.",
      "Step off every time. Never jump off, and never let it drift into a hop off the edge.",
      "Same shoes, same solid floor, same taped landing spot.",
      "Hands on hips every time.",
      "Same time of day, at least 24 hours after hard lower body training and 48 hours after a match.",
      "240 fps every time. A contact time measured at 120 fps doesn't belong beside one measured at 240."
    ],

    reduceError: [
      "**This test needs 240 fps.** A fast ground contact is about a fifth of a second. At 60 fps that's only 12 frames and the RSI error is over 5%, which is bigger than any change worth acting on. The app refuses contact times below 120 fps and asks for 240.",
      "Film from side on and low. The moment of touchdown is the frame that matters most and it's the easiest one to lose to a shadow.",
      "**Watch out for a shadow under the feet.** It makes touchdown look early and takeoff look late, which stretches contact time and drags RSI down. The app flags it, but even light is the real fix.",
      "3 reps, 60 to 90 seconds rest. Take the average of the good ones.",
      "Change one thing at a time. Box height, cue wording, shoes, surface. Change two and you'll never know which one moved the number."
    ],

    /* ================================================================ */

    events: [
      {
        id: "landing",
        label: "Touchdown",
        help: "The first frame where either foot touches the floor after stepping off the box. This is where the contact starts."
      },
      {
        id: "takeoff",
        label: "Takeoff",
        help: "The first frame where both feet are clear again. This one frame is shared by the contact time and the flight time, so it matters twice as much as the others."
      },
      {
        id: "reland",
        label: "Second landing",
        help: "The first frame where either foot touches down after the rebound jump. This closes the flight time."
      }
    ],

    /* ================================================================ */

    requires: {
      minFps: 120,             // contact time is refused below this, see the error table
      preferredFps: 240,
      needsContactTime: true,
      needsBodyMass: false,
      needsDropHeight: true,
      minValidTrials: 3
    },

    plausible: {
      height_m:      { warnBelow: 0.10, warnAbove: 0.50, blockBelow: 0.03, blockAbove: 0.75 },
      contactTime_s: { warnBelow: 0.13, warnAbove: 0.25, blockBelow: 0.10, blockAbove: 0.60 },
      rsi:           { warnBelow: 0.60, warnAbove: 3.20, blockBelow: 0.40, blockAbove: 4.00 },
      rsr:           { warnBelow: 1.00, warnAbove: 4.00, blockBelow: 0.80, blockAbove: 5.00 }
    },

    scoring: {
      trials: 3,
      restSeconds: 90,
      score: "mean",
      note: "Average of 3 good reps. A rep where the contact went over a quarter of a second isn't a bad drop jump, it's a different test, so don't average it in."
    },

    /* ================================================================
       Orientation bands. NOT peer-reviewed norms. They exist so a beginner
       has some context for a number they've never seen before, and they are
       labelled as orientation everywhere they appear.
       ================================================================ */

    rsiBands: [
      { max: 1.5, label: "Developing" },
      { max: 2.0, label: "Average" },
      { max: 2.5, label: "Good" },
      { max: 3.0, label: "Very good" },
      { max: Infinity, label: "Elite" }
    ],
    rsiBandsNote:
      "Rough orientation only, not published norms. They assume hands on hips and the jump height over contact time convention. Your own trend matters far more than which band you land in.",

    /* ================================================================
       THE MATHS
       ================================================================ */

    compute: function (trial, ctx) {
      var P = ctx.P;
      var out = { primary: null, secondary: [], warnings: [], working: [] };

      var contact = trial.contacts && trial.contacts[0];
      var flight = trial.flights && trial.flights[0];

      if (!contact || !flight) {
        out.warnings.push({
          id: "DJ-INCOMPLETE",
          severity: "block",
          text: "We need three moments for a drop jump, touchdown, takeoff and the second landing. We couldn't find all three. Trim the clip so it starts just before you leave the box."
        });
        return out;
      }

      /* ---- frame rate gate for contact time -------------------------- */

      if (trial.fpsLocal && trial.fpsLocal < this.requires.minFps) {
        out.warnings.push({
          id: "FR-03",
          severity: "block",
          text: "This clip is about " + Math.round(trial.fpsLocal) + " fps. Contact time can't be measured reliably below 120 fps, a fast ground contact would be only a handful of frames and the RSI error would be bigger than any change worth acting on. Record in slow motion at 240 fps."
        });
        return out;
      }

      /* ---- the numbers ----------------------------------------------- */

      var gct = contact.end - contact.start;
      var ft = flight.end - flight.start;
      var h = P.jumpHeightFromFlightTime(ft);
      var rsiVal = P.rsi(h, gct);
      var rsrVal = P.rsr(ft, gct);

      out.working.push({
        step: "Ground contact time",
        expression: "takeoff frame time minus touchdown frame time",
        result: P.fmt.seconds(gct) + " s"
      });
      out.working.push({
        step: "Flight time",
        expression: "second landing frame time minus takeoff frame time",
        result: P.fmt.seconds(ft) + " s"
      });
      out.working.push({
        step: "Jump height",
        expression: "9.81 x " + P.fmt.seconds(ft) + " squared, divided by 8",
        result: P.fmt.heightCm(h) + " cm"
      });
      out.working.push({
        step: "RSI",
        expression: (h).toFixed(4) + " m divided by " + P.fmt.seconds(gct) + " s",
        result: P.fmt.rsi(rsiVal) + " m/s"
      });
      out.working.push({
        step: "RSR",
        expression: P.fmt.seconds(ft) + " s divided by " + P.fmt.seconds(gct) + " s",
        result: P.fmt.rsr(rsrVal)
      });

      /* ---- guards ---------------------------------------------------- */

      var guard = P.guardHeight(h, ft);
      if (!guard.ok) {
        out.warnings.push({
          id: guard.kind === "timebase" ? "TB-02" : "DJ-IMPLAUSIBLE",
          severity: "block",
          text: guard.kind === "timebase"
            ? "This clip says you were in the air for " + P.fmt.seconds(ft) + " seconds, which isn't physically possible. It was almost certainly recorded in slow motion and saved with the slow motion baked in."
            : "That works out at " + P.fmt.heightCm(h) + " cm, which is outside what a person can do. Check your marked frames."
        });
        return out;
      }

      /* ---- precision -------------------------------------------------- */

      var sigE = trial.timingError_s || P.timingError_s(1 / (trial.fpsLocal || 240));
      var rsiErr = P.rsiRelativeError(sigE, ft, gct);

      /* ---- primary is RSI, and it is never shown alone ---------------- */

      out.primary = {
        key: "rsi",
        label: "RSI",
        value: rsiVal,
        unit: "m/s",
        display: P.fmt.rsi(rsiVal),
        sublabel: "jump height divided by contact time",
        precision: "plus or minus " + P.fmt.pct(rsiErr) + "%",
        band: bandFor(this.rsiBands, rsiVal),
        bandNote: this.rsiBandsNote
      };

      // RSI on its own hides whether a change came from the ground or the air,
      // so these two are not optional extras, they are part of the result.
      out.secondary.push({
        key: "contactTime",
        label: "Time on the ground",
        value: gct,
        unit: "s",
        display: P.fmt.seconds(gct),
        sublabel: P.fmt.ms(gct) + " milliseconds",
        pinned: true
      });
      out.secondary.push({
        key: "height",
        label: "Jump height",
        value: h,
        unit: "cm",
        display: P.fmt.heightCm(h),
        sublabel: "flight-time method",
        pinned: true
      });
      out.secondary.push({
        key: "rsr",
        label: "RSR",
        value: rsrVal,
        unit: "",
        display: P.fmt.rsr(rsrVal),
        sublabel: "flight time divided by contact time, no units",
        note: "The other RSI convention you'll see in books and apps. It is not the same number and there's no fixed multiplier between them, so never compare an RSR against someone else's RSI."
      });
      out.secondary.push({
        key: "flightTime",
        label: "Time in the air",
        value: ft,
        unit: "s",
        display: P.fmt.seconds(ft),
        sublabel: P.fmt.ms(ft) + " milliseconds"
      });

      /* ---- the test-has-changed-into-another-test check --------------- */

      if (gct > this.plausible.contactTime_s.warnAbove) {
        out.warnings.push({
          id: "TC-03",
          severity: "amber",
          text: "You were on the floor for " + P.fmt.ms(gct) + " milliseconds. Over about 250 that stops being a fast drop jump and becomes a countermovement jump off a box. It's not a bad rep, it's a different test, so log it separately or redo it with the off the ground as fast as possible cue."
        });
      }
      if (gct < this.plausible.contactTime_s.warnBelow) {
        out.warnings.push({
          id: "DJ-VERYSHORT",
          severity: "amber",
          text: "A contact of " + P.fmt.ms(gct) + " milliseconds is very fast. Check the touchdown and takeoff frames are on the right frames before you celebrate."
        });
      }

      /* ---- RSI plausibility ------------------------------------------- */

      if (rsiVal < this.plausible.rsi.warnBelow || rsiVal > this.plausible.rsi.warnAbove) {
        out.warnings.push({
          id: "DJ-RSI-RANGE",
          severity: "amber",
          text: "An RSI of " + P.fmt.rsi(rsiVal) + " is outside what we normally see. Check all three marked frames before reading anything into it."
        });
      }

      /* ---- shared posture and physics checks -------------------------- */

      var po = trial.posture;
      if (po && po.takeoffBboxH && po.landingBboxH && po.landingBboxH / po.takeoffBboxH < 0.93) {
        out.warnings.push({
          id: "TC-01",
          severity: "amber",
          voidOption: "Soft landing",
          text: "The final landing was lower than the takeoff, so flat-footed or with the knees bent. That inflates the jump height half of RSI. Land toes first with long legs, then absorb."
        });
      }
      if (trial.parabola && trial.parabola.band === "amber") {
        out.warnings.push({
          id: "PH-01",
          severity: "amber",
          text: "From the video you look about " + trial.parabola.impliedHeight_m.toFixed(2) + " m tall, and " + ctx.athlete.height_m.toFixed(2) + " m was entered. Check the height, or check you were square on to the camera."
        });
      }
      if (trial.fpsLocal && trial.fpsLocal < 240) {
        out.warnings.push({
          id: "FR-04",
          severity: "amber",
          text: "This clip is about " + Math.round(trial.fpsLocal) + " fps. RSI is good to roughly " + P.fmt.pct(rsiErr) + "% here, which is about the size of the smallest change worth acting on. Usable, but 240 fps is the standard for this test."
        });
      }

      return out;

      function bandFor(bands, v) {
        for (var i = 0; i < bands.length; i++) if (v < bands[i].max) return bands[i].label;
        return bands[bands.length - 1].label;
      }
    },

    /* ================================================================ */

    sources: [
      "Young (1995) defined RSI as jump height over contact time. Flanagan and Comyns (2008) popularised it in coaching and are the origin of the orientation bands.",
      "Healy et al. (2016) for the reactive strength ratio, flight time over contact time. Shown alongside, never instead.",
      "The 250 ms contact time boundary between a fast drop jump and a countermovement jump off a box is standard coaching practice, and it's why the app treats a long contact as a different test rather than a bad rep.",
      "The cue wording matters because cueing height alone versus minimal contact produces measurably different tests. This is why the cue is stored with every result.",
      "The 120 fps floor comes from the error propagation in physics.js: at 120 fps the RSI error is about the same size as the smallest worthwhile change, so below that the tool would be reporting a number whose own error exceeds what it is trying to detect.",
      "Box height guidance, 30 cm default and 20 to 30 cm for youth and untrained, follows standard plyometric progression practice."
    ]
  });

})(typeof window !== "undefined" ? window : this);
