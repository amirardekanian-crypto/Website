/* ============================================================================
   hop-10-5.js — The 10-5 repeated hop test.

   Same shape as cmj.js. Read the header there for the compute() contract.

   SCORING DECISION WORTH KNOWING ABOUT
   The score is the mean RSI of the best 5 hops out of 10, chosen by RSI value
   and NOT required to be consecutive. Both conventions exist. Best-5-by-value
   is what the protocol literature and the commercial systems use, so that is
   what we match. If you want best-5-consecutive instead, change `selectBest`
   below and nothing else, but be aware it will not compare with anyone else's
   numbers.

   The entry jump's landing is not scored. `entryContactsToSkip` controls that.
   ========================================================================= */

(function (root) {
  "use strict";

  var JumpKit = root.JumpKit = root.JumpKit || {};

  JumpKit.registerTest({

    id: "hop105",
    name: "10-5 repeated hop test",
    shortName: "10-5",
    strapline: "Ten fast hops on the spot. How stiff can you stay?",
    orderIndex: 4,

    /* ================================================================ */

    whyItMatters: [
      "Ten hops on the spot, as high as you can, with as little time on the floor as you can. Knees nearly straight, all of it through the ankles.",
      "**This is a drop jump you don't need a box for**, repeated, so it's more like what actually happens in sport. Almost nothing in a game is one big effort from standing. It's contact after contact after contact, and the athlete who keeps their ankles stiff through all of them is the one who's still fast in the last ten minutes.",
      "It's also very reliable. One good set is usually enough, which is unusual for a jump test and makes it a good one to repeat often."
    ],

    decisionItFeeds:
      "This is the one that tells us whether your ankles and Achilles can handle more running and jumping volume. If it's low or it falls off across the set, more volume is not the answer yet.",

    /* ================================================================ */

    howToPerform: {

      setUp: [
        "**Hands on hips, feet roughly together**, standing on your marked spot on a solid floor.",
        "Nothing else. No box, no equipment."
      ],

      cue: "Jump as high as you can with as little time on the ground as possible. Stay stiff and bounce through the ankles.",

      cueNote:
        "Both halves of that sentence matter. Cue height alone and they sink into their knees. Cue speed alone and they barely leave the floor.",

      steps: [
        { n: 1, text: "Stand still on your spot, hands on hips." },
        { n: 2, text: "Do **one easy countermovement jump** to get into rhythm. Not maximal, just enough to land into the set. That first landing doesn't count towards your score." },
        { n: 3, text: "From that landing, go straight into **10 continuous maximal hops on the spot.** No pause anywhere." },
        { n: 4, text: "**Keep your knees nearly straight.** Let the ankles do the work. If you're bending your knees you've turned it into a set of squat jumps and it isn't a stiffness test any more." },
        { n: 5, text: "Stay on the spot. Don't travel forwards or sideways." },
        { n: 6, text: "After the tenth hop, land and stop. Then you can bend and absorb." }
      ],

      landing: {
        title: "Stiff means stiff",
        body: [
          "Think about bouncing off the floor rather than landing on it. The floor is hot.",
          "**If your heels touch down, you've lost the test.** Stay on the balls of your feet the whole way through. It should feel springy and slightly uncomfortable, not soft and cushioned."
        ]
      }
    },

    /* ================================================================ */

    faults: [
      {
        fault: "Bending the knees and sinking on each landing",
        whatItDoesToTheNumber: "Drops RSI a long way. Contact time goes up more than height does, and the test stops measuring stiffness at all.",
        fix: "Knees nearly locked. Bounce through the ankles. If you can't hold it for 10, do fewer good ones and build up.",
        autoDetected: true
      },
      {
        fault: "Pausing or resetting between hops",
        whatItDoesToTheNumber: "Voids the set. Continuous is the whole point.",
        fix: "Find a rhythm on the entry jump and hold it. If you break, stop, rest 90 seconds, start again.",
        autoDetected: true
      },
      {
        fault: "Stopping short of 10 hops",
        whatItDoesToTheNumber: "Under-reports you, and not by a small amount. Your best hops are usually hops 7 to 10, once you've found the rhythm. Cut the set short and you cut off your own best work.",
        fix: "Do all ten. Count them out loud if it helps.",
        autoDetected: true
      },
      {
        fault: "Travelling forwards or sideways",
        whatItDoesToTheNumber: "Height reads low, and the automatic detection starts losing your feet.",
        fix: "Pick a spot on the floor and stay on it.",
        autoDetected: true
      },
      {
        fault: "Hands coming off the hips",
        whatItDoesToTheNumber: "Arms make this much easier and change both halves of RSI at once.",
        fix: "Thumbs hooked into your hip bones for the whole set.",
        autoDetected: false
      },
      {
        fault: "Heels touching down",
        whatItDoesToTheNumber: "Lengthens contact time and lowers RSI. It usually means the ankles have given up.",
        fix: "That's your set finished. Note where it happened, it's useful information.",
        autoDetected: false
      }
    ],

    /* ================================================================ */

    standardise: [
      "**Ten hops every time.** Not eight because you were tired, not twelve because it felt good. The score depends on where in the set your best work happens.",
      "One easy countermovement jump to enter, every time. Same entry, same rhythm.",
      "**Same solid floor.** This test is the one most affected by a soft surface, because the whole thing is how fast you get off the ground.",
      "Same shoes, same marked spot, same phone position.",
      "Hands on hips for the whole set.",
      "The same cue, word for word. Both halves of it.",
      "Same time of day, at least 24 hours after hard lower body training. Achilles and calf fatigue shows up here before it shows up anywhere else.",
      "240 fps every time."
    ],

    reduceError: [
      "**240 fps, no exceptions.** Contact times here are shorter than a drop jump's, sometimes under 0.2 seconds, and the app won't compute contact time below 120 fps.",
      "Frame the whole set. You need all ten hops in one clip with your whole body visible throughout, so back the phone off a little further than you would for a single jump.",
      "**One good set is enough.** This test is unusually repeatable, so a second set mostly adds fatigue rather than information. If you do repeat it, rest 90 seconds.",
      "Watch for the athlete drifting towards the camera across the set. It's common and it quietly changes their size in frame.",
      "The hop-by-hop table is worth more than the single score. A set that starts strong and falls apart tells you something different from a flat set at the same average."
    ],

    /* ================================================================ */

    // This test has a SERIES of events rather than one takeoff and one
    // landing, so the app detects them all and shows you the hop by hop table
    // to check, instead of asking you to mark two frames by hand.
    seriesTest: true,

    events: [
      {
        id: "touchdown",
        label: "Touchdown",
        repeating: true,
        help: "The first frame of each ground contact. There's one per hop, and the app finds them all."
      },
      {
        id: "takeoff",
        label: "Takeoff",
        repeating: true,
        help: "The first frame where both feet are clear again. Check the hop table below the result, and drop any hop that looks wrong."
      }
    ],

    /* ================================================================ */

    requires: {
      minFps: 120,
      preferredFps: 240,
      needsContactTime: true,
      needsBodyMass: false,
      needsDropHeight: false,
      minValidTrials: 1        // this test is reliable enough that one set is a measurement
    },

    plausible: {
      height_m:      { warnBelow: 0.05, warnAbove: 0.35, blockBelow: 0.02, blockAbove: 0.60 },
      flightTime_s:  { warnBelow: 0.20, warnAbove: 0.55, blockBelow: 0.15, blockAbove: 0.90 },
      contactTime_s: { warnBelow: 0.15, warnAbove: 0.30, blockBelow: 0.08, blockAbove: 0.50 },
      rsi:           { warnBelow: 0.60, warnAbove: 3.20, blockBelow: 0.40, blockAbove: 4.00 }
    },

    scoring: {
      trials: 1,
      restSeconds: 90,
      score: "mean of the best 5 hops by RSI",
      note: "One set of 10 hops. The score is the average RSI of your best 5, picked by value, and they don't have to be in a row."
    },

    /* --- tunables you might want to change later --------------------- */
    entryContactsToSkip: 1,    // the landing from the entry jump is not scored
    scoredHops: 10,
    bestN: 5,
    selectBest: "byValue",     // "byValue" or "consecutive". See the file header.

    /* ================================================================
       THE MATHS
       ================================================================ */

    compute: function (trial, ctx) {
      var P = ctx.P;
      var self = this;
      var out = { primary: null, secondary: [], warnings: [], working: [], hops: [] };

      var contacts = (trial.contacts || []).slice();
      var flights = (trial.flights || []).slice();

      /* ---- frame rate gate ------------------------------------------- */

      if (trial.fpsLocal && trial.fpsLocal < this.requires.minFps) {
        out.warnings.push({
          id: "FR-03",
          severity: "block",
          text: "This clip is about " + Math.round(trial.fpsLocal) + " fps. Contact times in this test can be under a fifth of a second, and below 120 fps there aren't enough frames to measure them. Record in slow motion at 240 fps."
        });
        return out;
      }

      /* ---- pair each ground contact with the flight that follows it --- */
      // A hop is: land, spend time on the floor, take off, be in the air.
      // So hop i uses contact i and the flight immediately after it.

      var skip = this.entryContactsToSkip;
      var hops = [];
      for (var i = skip; i < contacts.length && hops.length < this.scoredHops; i++) {
        var c = contacts[i];

        // The tracker links each contact to the flight that follows it. Do
        // not try to re-derive that link by comparing timestamps here, the
        // boundaries are refined to sub frame precision and an equality test
        // would match nothing.
        var f = (c.flightAfter != null && c.flightAfter >= 0) ? flights[c.flightAfter] : null;
        if (!f) {
          for (var j = 0; j < flights.length; j++) {
            if (flights[j].start >= c.end - 1e-6) { f = flights[j]; break; }
          }
        }
        if (!f) continue;

        var gct = c.end - c.start;
        var ft = f.end - f.start;
        var h = P.jumpHeightFromFlightTime(ft);

        hops.push({
          index: hops.length + 1,
          contactTime_s: gct,
          flightTime_s: ft,
          height_m: h,
          rsi: P.rsi(h, gct),
          rsr: P.rsr(ft, gct),
          excluded: false,
          reason: null
        });
      }

      if (!hops.length) {
        out.warnings.push({
          id: "HOP-NONE",
          severity: "block",
          text: "We couldn't find any complete hops in this clip. Check the whole set is in frame from the first landing to the last, and that only one person is visible."
        });
        return out;
      }

      /* ---- drop hops we can't measure properly ------------------------ */

      var framePeriod = 1 / (trial.fpsLocal || 240);
      hops.forEach(function (hp) {
        var samples = hp.contactTime_s / framePeriod;
        if (samples < 5) {
          hp.excluded = true;
          hp.reason = "only " + Math.round(samples) + " frames on the ground, too few to time";
        } else if (hp.contactTime_s < self.plausible.contactTime_s.blockBelow ||
                   hp.contactTime_s > self.plausible.contactTime_s.blockAbove) {
          hp.excluded = true;
          hp.reason = "contact time outside what's possible for a hop";
        } else if (hp.height_m > self.plausible.height_m.blockAbove) {
          hp.excluded = true;
          hp.reason = "jump height outside what's possible";
        }
      });

      out.hops = hops;

      var valid = hops.filter(function (hp) { return !hp.excluded; });
      if (valid.length < this.bestN) {
        out.warnings.push({
          id: "HOP-TOOFEW",
          severity: "block",
          text: "Only " + valid.length + " hops could be measured, and the score needs " + this.bestN + ". Check the hop table below to see which ones failed and why, then record the set again."
        });
        return out;
      }

      /* ---- the score --------------------------------------------------- */

      var best = selectBest(valid, this.bestN, this.selectBest);
      var meanRsi = mean(best.map(function (hp) { return hp.rsi; }));
      var meanGct = mean(best.map(function (hp) { return hp.contactTime_s; }));
      var meanH = mean(best.map(function (hp) { return hp.height_m; }));

      best.forEach(function (hp) { hp.counted = true; });

      out.working.push({
        step: "Hops measured",
        expression: "all ground contacts after the entry landing",
        result: hops.length + " found, " + valid.length + " usable"
      });
      out.working.push({
        step: "Best " + this.bestN + " chosen",
        expression: this.selectBest === "byValue" ? "the 5 highest RSI values, not necessarily in a row" : "the best 5 in a row",
        result: "hops " + best.map(function (hp) { return hp.index; }).sort(function (a, b) { return a - b; }).join(", ")
      });
      out.working.push({
        step: "Score",
        expression: "average RSI of those " + this.bestN,
        result: P.fmt.rsi(meanRsi) + " m/s"
      });

      /* ---- output ------------------------------------------------------- */

      var sigE = trial.timingError_s || P.timingError_s(framePeriod);
      var rsiErr = P.rsiRelativeError(sigE, meanH > 0 ? P.flightTimeFromJumpHeight(meanH) : 0.3, meanGct);

      out.primary = {
        key: "rsi",
        label: "RSI",
        value: meanRsi,
        unit: "m/s",
        display: P.fmt.rsi(meanRsi),
        sublabel: "average of your best " + this.bestN + " hops, height divided by contact time",
        precision: "plus or minus " + P.fmt.pct(rsiErr / Math.sqrt(this.bestN)) + "%"
      };

      out.secondary.push({
        key: "contactTime",
        label: "Time on the ground",
        value: meanGct,
        unit: "s",
        display: P.fmt.seconds(meanGct),
        sublabel: "average across those hops, " + P.fmt.ms(meanGct) + " ms",
        pinned: true
      });
      out.secondary.push({
        key: "height",
        label: "Hop height",
        value: meanH,
        unit: "cm",
        display: P.fmt.heightCm(meanH),
        sublabel: "average across those hops",
        pinned: true
      });
      out.secondary.push({
        key: "bestHop",
        label: "Best single hop",
        value: Math.max.apply(null, valid.map(function (hp) { return hp.rsi; })),
        unit: "m/s",
        display: P.fmt.rsi(Math.max.apply(null, valid.map(function (hp) { return hp.rsi; }))),
        sublabel: "for reference, not your score"
      });

      /* ---- set-quality warnings ------------------------------------------ */

      if (hops.length < this.scoredHops) {
        out.warnings.push({
          id: "TC-05",
          severity: "amber",
          text: "Only " + hops.length + " hops were detected, and the test is 10. Your best hops usually come at 7 to 10 once the rhythm is there, so a short set under-reports you. Do the full ten next time."
        });
      }

      // Did the set fall apart? Compare the first third with the last third.
      if (valid.length >= 6) {
        var third = Math.floor(valid.length / 3);
        var early = mean(valid.slice(0, third).map(function (hp) { return hp.rsi; }));
        var late = mean(valid.slice(-third).map(function (hp) { return hp.rsi; }));
        if (late < early * 0.80) {
          out.warnings.push({
            id: "HOP-FADE",
            severity: "amber",
            text: "Your RSI dropped by more than a fifth across the set. That's a stiffness endurance thing rather than a bad test, and it's worth knowing. Look at the hop table to see where it went."
          });
        }
      }

      if (trial.contactsMerged) {
        out.warnings.push({
          id: "DQ-12",
          severity: "amber",
          text: "Two hops ran together and looked like one, so we've split them and flagged it. Check those rows in the table before trusting them."
        });
      }

      if (trial.fpsLocal && trial.fpsLocal < 240) {
        out.warnings.push({
          id: "FR-04",
          severity: "amber",
          text: "This clip is about " + Math.round(trial.fpsLocal) + " fps. Usable, but contact times this short really want 240."
        });
      }

      return out;

      /* --- helpers ------------------------------------------------------- */

      function mean(a) {
        return a.reduce(function (s, v) { return s + v; }, 0) / a.length;
      }

      function selectBest(list, n, mode) {
        if (mode === "consecutive") {
          var bestRun = null, bestMean = -Infinity;
          for (var s = 0; s + n <= list.length; s++) {
            var run = list.slice(s, s + n);
            var m = mean(run.map(function (hp) { return hp.rsi; }));
            if (m > bestMean) { bestMean = m; bestRun = run; }
          }
          return bestRun;
        }
        return list.slice()
          .sort(function (a, b) { return b.rsi - a.rsi; })
          .slice(0, n);
      }
    },

    /* ================================================================ */

    sources: [
      "The 10-5 protocol, one entry countermovement jump into 10 continuous maximal hops, follows the standard implementation used in applied S&C practice and by the commercial force plate systems.",
      "Score as the mean RSI of the best 5 hops selected by value. Both best-5-by-value and best-5-consecutive exist in the wild. We match the protocol literature and the commercial systems so the numbers travel.",
      "The observation that peak values cluster in hops 7 to 10, and that roughly 7 hops are needed before the mean settles, is why the app warns on a short set rather than quietly scoring it.",
      "Reliability for this test is high, ICC around 0.92 to 0.99, which is why one set counts as a measurement here and three reps are demanded elsewhere.",
      "RSI convention and the 120 fps floor are the same as the drop jump, see dj.js and physics.js."
    ]
  });

})(typeof window !== "undefined" ? window : this);
