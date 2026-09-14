/* ============================================================================
   selftest.js — synthetic jumps with a KNOWN answer, run against the engine.

   WHY THIS EXISTS
   You are going to want to change a formula or a threshold at some point. This
   is how you find out whether you broke the measurement. It builds jumps in
   memory where the true height is known exactly, runs them through the real
   tracker and the real maths, and reports the error.

   It does NOT test video decoding, only the tracking and the maths. Those are
   the parts that can be wrong without anything looking wrong.

   Open /jump-selftest.html to run it.

   READING THE RESULTS
   Under 1 cm of error at 240 fps is the bar. Published validation for phone
   based flight time measurement sits around 1 cm against a force plate, so
   anything under that is about as good as this method gets.

   A FAILING CASE IS NOT ALWAYS A BUG. The shadow cases are deliberately harsh.
   What matters for those is that CONFIDENCE drops and the app refuses, rather
   than showing a confident wrong number. Every case states which of the two
   behaviours it is asserting.
   ========================================================================= */

(function (root) {
  "use strict";

  var JumpKit = root.JumpKit = root.JumpKit || {};

  var W = 320, H = 180, GROUND = 160, STAND = 100, REAL_H = 1.75;

  /* --- build one frame ------------------------------------------------ */

  function frameOf(footY, opts) {
    var b = new Uint8Array(W * H);
    for (var i = 0; i < b.length; i++) b[i] = 214 + ((i * 2654435761) % 7);

    var standPx = opts.standPx || STAND;
    var x0 = 148 + Math.round(opts.driftPx || 0);
    var x1 = 172 + Math.round(opts.driftPx || 0);

    // Optional floor shadow, attached under the foot and shrinking as the
    // foot rises. This is the single worst thing for automatic detection.
    if (opts.shadow) {
      var gap = GROUND - footY;
      if (gap < opts.shadow.reach) {
        var sp = Math.round(opts.shadow.spread * (1 - gap / opts.shadow.reach));
        for (var y = Math.round(footY); y <= GROUND; y++) {
          for (var x = x0 - sp; x <= x1 + sp; x++) {
            if (x >= 0 && x < W) b[y * W + x] = opts.shadow.value || 150;
          }
        }
      }
    }

    var top = Math.round(footY - standPx);
    for (var yy = Math.max(0, top); yy <= Math.min(H - 1, Math.round(footY)); yy++) {
      for (var xx = x0; xx <= x1; xx++) if (xx >= 0 && xx < W) b[yy * W + xx] = 44;
    }
    return b;
  }

  /* --- build a whole clip --------------------------------------------- */

  function buildClip(spec) {
    var o = spec || {};
    var fps = o.fps || 240;
    var dt = 1 / fps;
    var hops = o.hops || [{ jump: 0.30, gct: 0.20 }];
    var standPx = o.standPx || STAND;
    var gpx = 9.81 * (standPx / REAL_H);

    var frames = [];
    var k = 0;
    function push(footY) {
      frames.push({
        t: frames.length * dt,
        buf: frameOf(footY, {
          shadow: o.shadow,
          standPx: standPx,
          driftPx: (o.driftPerFrame || 0) * (k++)
        })
      });
    }

    var pre = (o.pre == null) ? 40 : o.pre;
    var post = (o.post == null) ? 30 : o.post;

    for (var i = 0; i < pre; i++) push(GROUND);

    hops.forEach(function (hp) {
      var FT = Math.sqrt(8 * hp.jump / 9.81);
      var v0 = gpx * FT / 2;
      var nAir = Math.round(FT / dt);
      for (var a = 1; a <= nAir; a++) {
        var t = a * dt;
        push(GROUND - Math.max(0, v0 * t - 0.5 * gpx * t * t));
      }
      var nC = Math.round(hp.gct / dt);
      for (var c = 0; c < nC; c++) push(GROUND);
    });

    for (var p = 0; p < post; p++) push(GROUND);
    return { frames: frames, fps: fps, hops: hops, standPx: standPx };
  }

  function analyse(clip) {
    return JumpKit.tracking.analyse(
      clip.frames,
      { x0: 1, y0: 1, x1: W - 2, y1: H - 2 },
      REAL_H,
      { width: W, height: H }
    );
  }

  /* --- run one case ---------------------------------------------------- */

  function runCase(c) {
    var clip = buildClip(c.clip);
    var a = analyse(clip);

    var f = a.mainFlight;
    var gotH = f ? JumpKit.physics.jumpHeightFromFlightTime(f.end - f.start) : null;
    var truthH = clip.hops[0].jump;

    var out = {
      name: c.name,
      asserts: c.asserts,
      truth_cm: +(truthH * 100).toFixed(1),
      got_cm: gotH == null ? null : +(gotH * 100).toFixed(2),
      error_cm: gotH == null ? null : +((gotH - truthH) * 100).toFixed(2),
      refined: f ? !!f.refined : false,
      confidence: +a.confidence.toFixed(2),
      gravityBand: a.gravity ? a.gravity.band : null,
      impliedHeight_m: a.gravity ? +a.gravity.impliedHeight_m.toFixed(2) : null,
      standingPx: a.standingHeightPx,
      flights: a.flights.length
    };

    // Each case asserts ONE of two things: that the answer is accurate, or
    // that a bad answer is correctly caught and refused.
    if (c.asserts === "accurate") {
      out.expectation = "within " + (c.tolerance_cm || 1.5) + " cm";
      out.pass = out.error_cm != null && Math.abs(out.error_cm) <= (c.tolerance_cm || 1.5);
    } else {
      // Caught means: no usable flight, or confidence below the gate that
      // forces manual confirmation, or the physics check went red. Any one of
      // those stops a wrong number reaching an athlete unchallenged.
      out.expectation = "caught: no number, or confidence under 0.80, or physics red";
      out.pass = (gotH == null) || out.confidence < 0.80 || out.gravityBand === "red";
    }
    return out;
  }

  /* --- the cases -------------------------------------------------------- */

  var CASES = [
    { name: "30 cm jump, 240 fps, clean", asserts: "accurate", tolerance_cm: 1.0,
      clip: { fps: 240, hops: [{ jump: 0.30, gct: 0.2 }] } },
    { name: "45 cm jump, 240 fps, clean", asserts: "accurate", tolerance_cm: 1.0,
      clip: { fps: 240, hops: [{ jump: 0.45, gct: 0.2 }] } },
    { name: "18 cm jump, 240 fps, clean", asserts: "accurate", tolerance_cm: 1.0,
      clip: { fps: 240, hops: [{ jump: 0.18, gct: 0.2 }] } },
    { name: "30 cm jump, 120 fps", asserts: "accurate", tolerance_cm: 1.2,
      clip: { fps: 120, hops: [{ jump: 0.30, gct: 0.2 }] } },
    { name: "30 cm jump, 60 fps", asserts: "accurate", tolerance_cm: 2.5,
      clip: { fps: 60, hops: [{ jump: 0.30, gct: 0.2 }] } },
    { name: "Athlete small in frame, 60 px tall", asserts: "accurate", tolerance_cm: 2.0,
      clip: { fps: 240, standPx: 60, hops: [{ jump: 0.30, gct: 0.2 }] } },
    { name: "Athlete drifting sideways", asserts: "accurate", tolerance_cm: 1.5,
      clip: { fps: 240, driftPerFrame: 0.05, hops: [{ jump: 0.30, gct: 0.2 }] } },

    { name: "Hard shadow, attached the whole jump", asserts: "caught",
      clip: { fps: 240, shadow: { reach: 18, spread: 14 }, hops: [{ jump: 0.30, gct: 0.2 }] } },
    { name: "Shadow that detaches mid flight", asserts: "caught",
      clip: { fps: 240, shadow: { reach: 8, spread: 10 }, hops: [{ jump: 0.30, gct: 0.2 }] } },
    { name: "Faint narrow shadow", asserts: "caught",
      clip: { fps: 240, shadow: { reach: 14, spread: 6, value: 170 }, hops: [{ jump: 0.30, gct: 0.2 }] } }
  ];

  /* --- repeated hops, exercising the 10-5 pairing ------------------------ */

  function runHopCase() {
    var hops = [
      { jump: 0.22, gct: 0.19 }, { jump: 0.24, gct: 0.18 }, { jump: 0.23, gct: 0.17 },
      { jump: 0.25, gct: 0.175 }, { jump: 0.24, gct: 0.18 }, { jump: 0.23, gct: 0.18 }
    ];
    var clip = buildClip({ fps: 240, hops: hops, pre: 30, post: 20 });
    var a = analyse(clip);

    var test = JumpKit.getTest("hop105");
    var res = test.compute({
      flights: a.flights, contacts: a.contacts, fpsLocal: 240,
      timingError_s: JumpKit.physics.timingError_s(1 / 240),
      confidence: a.confidence, posture: a.posture, parabola: null
    }, { athlete: { height_m: REAL_H }, session: {}, P: JumpKit.physics });

    // A hop's RSI pairs a ground contact with the flight that contact
    // PRODUCES, so hop n uses contact n and the jump that follows it. Getting
    // this off by one is silent and would make every RSI wrong.
    var expected = [];
    for (var i = 0; i + 1 < hops.length; i++) {
      expected.push({ gct: hops[i].gct, jump: hops[i + 1].jump });
    }

    var rows = (res.hops || []).map(function (hp, i) {
      var e = expected[i];
      return {
        n: hp.index,
        gct_ms: Math.round(hp.contactTime_s * 1000),
        gct_truth_ms: e ? Math.round(e.gct * 1000) : null,
        height_cm: +(hp.height_m * 100).toFixed(1),
        height_truth_cm: e ? +(e.jump * 100).toFixed(1) : null,
        rsi: +hp.rsi.toFixed(2),
        rsi_truth: e ? +(e.jump / e.gct).toFixed(2) : null,
        counted: !!hp.counted,
        excluded: !!hp.excluded
      };
    });

    function worst(arr) { return arr.length ? Math.max.apply(null, arr) : null; }
    var gctErr = worst(rows.filter(function (r) { return r.gct_truth_ms != null; })
      .map(function (r) { return Math.abs(r.gct_ms - r.gct_truth_ms); }));
    var hErr = worst(rows.filter(function (r) { return r.height_truth_cm != null; })
      .map(function (r) { return Math.abs(r.height_cm - r.height_truth_cm); }));

    return {
      name: "10-5 repeated hops, pairing and scoring",
      asserts: "accurate",
      detectedHops: rows.length,
      expectedHops: expected.length,
      score: res.primary ? res.primary.display + " " + res.primary.unit : null,
      worstContactError_ms: gctErr,
      worstHeightError_cm: hErr,
      rows: rows,
      warnings: (res.warnings || []).map(function (w) { return w.id; }),
      expectation: "all hops found, contact within 15 ms, height within 2.5 cm",
      pass: rows.length === expected.length && gctErr != null && gctErr <= 15 &&
            hErr != null && hErr <= 2.5
    };
  }

  /* --- timebase: a baked slow motion clip must be caught ----------------- */

  function runTimebaseCase() {
    // A 240 fps jump whose frame timestamps were written as if it were 30 fps.
    // Every frame time is 8x too long, so the flight looks 8x too long, and
    // the height would come out 64x too big if nothing caught it. This is the
    // single highest consequence failure the tool can have.
    var clip = buildClip({ fps: 240, hops: [{ jump: 0.30, gct: 0.2 }] });
    clip.frames.forEach(function (f, i) { f.t = i / 30; });

    var a = analyse(clip);
    var f = a.mainFlight;
    var ft = f ? f.end - f.start : null;
    var naive = ft ? JumpKit.physics.jumpHeightFromFlightTime(ft) : null;
    var guard = ft ? JumpKit.physics.guardHeight(naive, ft) : null;

    return {
      name: "Baked slow motion, 240 fps saved as 30",
      asserts: "caught",
      naiveHeight_cm: naive == null ? null : +(naive * 100).toFixed(0),
      flightTime_s: ft == null ? null : +ft.toFixed(2),
      blockedByPhysicsGuard: guard ? (!guard.ok && guard.kind === "timebase") : false,
      gravityBand: a.gravity ? a.gravity.band : null,
      impliedDivisor: a.gravity ? +a.gravity.lambda.toFixed(1) : null,
      impliedHeight_m: a.gravity ? +a.gravity.impliedHeight_m.toFixed(0) : null,
      expectation: "blocked by the physical guard AND flagged red by the gravity check",
      // Two independent nets must both catch this. One is not enough, because
      // a smaller divisor could produce a physically possible but wrong answer.
      pass: (guard ? !guard.ok : false) && !!a.gravity && a.gravity.band === "red"
    };
  }

  /* --- the change rule: built histories with a known right answer -------- */

  // One saved rep, shaped the way jump.html's saveResult writes it.
  function rep(o) {
    var testId = o.test || "cmj";
    var d = new Date(2026, 0, o.day, 10, o.minute || 0, 0);
    return {
      id: testId + "-" + o.day + "-" + (o.minute || 0) + "-" + o.cm,
      date: d.toISOString().slice(0, 10),
      time: d.toISOString(),
      athlete: o.athlete || "Sara",
      testId: testId,
      metric: "height",
      value: o.cm / 100,
      unit: "cm",
      arms: "hands_on_hips",
      surface: "rigid_floor",
      footwear: o.shoes || "Nike",
      dropHeight_cm: null,
      cue: JumpKit.getTest(testId).howToPerform.cue,
      fps_used: o.fps || 240,
      lambda: 1,
      detector: "auto",
      counted: o.counted !== false,
      flags: o.counted === false ? ["TC-01"] : [],
      age: o.age === undefined ? 14 : o.age,
      sex: "f"
    };
  }

  // One session: a rep per height, two minutes apart, on day n of January.
  function session(day, cms, extra) {
    return cms.map(function (cm, i) {
      var o = { day: day, minute: i * 2, cm: cm };
      for (var k in (extra || {})) o[k] = extra[k];
      return rep(o);
    });
  }

  function joinLogs() {
    return Array.prototype.concat.apply([], arguments);
  }

  function latestOf(log, testId, athlete) {
    return JumpKit.progress.report(log, JumpKit.getTest(testId || "cmj"), athlete || "Sara").latest;
  }

  function verdictOf(v, which) {
    if (!v) return "no report";
    if (v.reason) return "no verdict (" + v.reason + ")";
    var j = which === "previous" ? v.vsPrevious : v.vsBaseline;
    return j ? j.label : "none";
  }

  function runChangeRuleCases() {
    var P = JumpKit.physics;
    var Pr = JumpKit.progress;
    var out = [];

    function check(name, expected, got) {
      out.push({ name: name, expected: String(expected), got: String(got), pass: String(expected) === String(got) });
    }

    // Best jumps of 30.0 and 30.2 cm, two days apart, so a baseline of 30.1.
    var base = joinLogs(session(1, [30.0, 29.5, 29.8]), session(3, [30.2, 29.9, 30.0]));

    check("The old 6.4% gate is gone: +2.2 cm on a 30 cm jump isn't real",
      "possible", verdictOf(latestOf(joinLogs(base, session(20, [32.3, 31.0, 30.5])))));
    check("3 cm or more over the baseline is real, under 18",
      "real", verdictOf(latestOf(joinLogs(base, session(20, [33.2, 32.0, 31.9])))));
    check("Under 1.5 cm is normal wobble",
      "wobble", verdictOf(latestOf(joinLogs(base, session(20, [31.0, 30.2, 30.4])))));

    var bigBase = joinLogs(session(1, [40.0, 39.1, 39.5]), session(3, [40.4, 39.8, 40.0]));
    check("Baseline of 35 cm or more: +3.6 cm is only possible",
      "possible", verdictOf(latestOf(joinLogs(bigBase, session(20, [43.8, 43.0, 42.9])))));
    check("Baseline of 35 cm or more: +4.2 cm is real",
      "real", verdictOf(latestOf(joinLogs(bigBase, session(20, [44.4, 43.0, 42.9])))));

    var adult = { age: 25 };
    var adultBase = joinLogs(session(1, [30.0, 29.5, 29.8], adult), session(3, [30.2, 29.9, 30.0], adult));
    check("From 18 the wobble line is 2 cm: +1.8 cm is wobble",
      "wobble", verdictOf(latestOf(joinLogs(adultBase, session(20, [31.9, 31.0, 30.8], adult)))));

    var kid = { age: 10 };
    var kidBase = joinLogs(session(1, [25.0, 24.4, 24.8], kid), session(3, [25.2, 24.9, 25.0], kid));
    check("Under 11: +3.5 cm is still wobble",
      "wobble", verdictOf(latestOf(joinLogs(kidBase, session(20, [28.6, 28.0, 27.9], kid)))));
    check("Under 11: 4 cm once is only possible",
      "possible", verdictOf(latestOf(joinLogs(kidBase, session(20, [29.3, 28.0, 27.9], kid)))));
    check("Under 11: 4 cm twice in a row is real",
      "real", verdictOf(latestOf(joinLogs(kidBase, session(20, [29.3, 28.0, 27.9], kid), session(27, [29.5, 28.8, 28.9], kid)))));

    check("Two possible changes the same way in a row read as likely real",
      "likely", verdictOf(latestOf(joinLogs(base, session(20, [31.9, 31.0, 30.8]), session(27, [32.0, 31.2, 31.0])))));

    check("Reps inside one session are never compared with each other",
      "no verdict (first)", verdictOf(latestOf(session(1, [30.0, 33.0, 36.0]))));

    var omid = { athlete: "Omid", age: 25 };
    var twoAthletes = joinLogs(base, session(2, [45.0, 44.0, 44.5], omid), session(19, [48.0, 47.0, 47.5], omid),
      session(20, [30.5, 30.0, 29.9]));
    check("Two athletes on one phone are never compared",
      "wobble", verdictOf(latestOf(twoAthletes)));
    check("Names match loosely, so \"sara \" is Sara",
      "wobble", verdictOf(latestOf(twoAthletes, "cmj", "sara ")));

    check("A session filmed under 120 fps gets no verdict",
      "no verdict (fps)", verdictOf(latestOf(joinLogs(base, session(20, [33.2, 32.0, 31.9], { fps: 60 })))));
    check("A 120 fps session isn't compared with 240 fps ones",
      "no verdict (newLine)", verdictOf(latestOf(joinLogs(base, session(20, [33.2, 32.0, 31.9], { fps: 120 })))));
    check("New shoes start a new line with its own baseline",
      "no verdict (newLine)", verdictOf(latestOf(joinLogs(base, session(20, [33.2, 32.0, 31.9], { shoes: "Adidas" })))));

    var flaggedS = latestOf(joinLogs(base, session(20, [30.0, 30.5, 30.2]),
      [rep({ day: 20, minute: 9, cm: 36.0, counted: false })])).session;
    check("A flagged rep doesn't count toward the best",
      "30.5 cm from 3 counted of 4", (flaggedS.best * 100).toFixed(1) + " cm from " + flaggedS.nCounted + " counted of " + flaggedS.nReps);
    check("Fewer than 3 counted reps gets no verdict",
      "no verdict (reps)", verdictOf(latestOf(joinLogs(base, session(20, [33.2, 32.0]),
        [rep({ day: 20, minute: 9, cm: 34.0, counted: false })]))));

    var djLog = joinLogs(session(1, [1.8, 1.9, 2.0], { test: "dj" }), session(3, [2.4, 2.5, 2.3], { test: "dj" }));
    check("Drop jump gets no verdict until its error is sourced",
      "no verdict (noRule)", verdictOf(latestOf(djLog, "dj")));

    var sj = { test: "sj" };
    var sjBase = joinLogs(session(1, [22.0, 21.4, 21.8], sj), session(3, [22.4, 21.9, 22.0], sj));
    check("Squat jump has its own lines: +3.8 cm is only possible",
      "possible", verdictOf(latestOf(joinLogs(sjBase, session(20, [26.0, 25.1, 25.0], sj)), "sj")));
    check("Squat jump: +4.6 cm is real",
      "real", verdictOf(latestOf(joinLogs(sjBase, session(20, [26.8, 25.1, 25.0], sj)), "sj")));

    var far = latestOf(joinLogs(session(1, [30.0, 29.5, 29.8]), session(12, [30.4, 30.0, 29.9]), session(20, [33.1, 32.0, 31.9])));
    check("Second test more than 7 days later: the first test alone is the baseline",
      "k=1, 30.0 cm, real", "k=" + far.baseline.k + ", " + (far.baseline.value * 100).toFixed(1) + " cm, " + verdictOf(far));

    var second = latestOf(joinLogs(session(1, [30.0, 29.5, 29.8]), session(3, [31.6, 30.9, 31.0])));
    check("The second test sets the baseline and is judged against the first",
      "possible, baseline k=2", verdictOf(second, "previous") + ", baseline k=" + second.baseline.k);

    // Every line has to still match the evidence it was built from:
    // wobble = sqrt(2) x TE to the nearest 0.5 cm, real = 2.77 x TE rounded up.
    ["cmj", "sj", "dj", "hop105"].forEach(function (id) {
      var t = JumpKit.getTest(id);
      var rule = t.changeRule;
      if (!rule) {
        check(t.shortName + " has no rule, and says why", "true", !!t.changeRuleNote);
        return;
      }
      [rule.standard, rule.bigJumper].forEach(function (g, i) {
        if (!g) return;
        var wobble = Math.round(Math.SQRT2 * g.te * 200) / 200;
        var real = Math.ceil(P.mdc95(g.te, 1) * 200 - 1e-9) / 200;
        check(t.shortName + (i ? " bigger jumpers" : "") + " lines match a TE of " + (g.te * 100).toFixed(2) + " cm",
          (wobble * 100).toFixed(1) + " / " + (real * 100).toFixed(1) + " cm",
          (g.wobble * 100).toFixed(1) + " / " + (g.real * 100).toFixed(1) + " cm");
      });
      var top = Math.max(rule.standard.real, rule.bigJumper ? rule.bigJumper.real : 0);
      check(t.shortName + " under 11 line is at least its highest real line", "true", !!(rule.under11 && rule.under11.real >= top));
    });

    check("MDC95 between days: 2.77 x TE, or 2.40 x TE against a two-session baseline",
      "2.77 / 2.40", P.mdc95(1, 1).toFixed(2) + " / " + P.mdc95(1, 2).toFixed(2));
    check("A 119.88 fps phone clip meets a 120 fps floor, 110 fps doesn't",
      "true / false", P.meetsMinFps(119.88, 120) + " / " + P.meetsMinFps(110, 120));
    check("Precision at 240 fps on a 30.7 cm jump, sqrt(2) not counted twice",
      "0.23 cm", (P.heightSensitivity_m_per_s(0.5) * P.timingError_s(1 / 240) * 100).toFixed(2) + " cm");

    var softLanding = { warnings: [{ id: "TC-01", severity: "amber", voidOption: "Soft landing" }] };
    check("A soft landing is saved but not counted",
      "false TC-01", Pr.repOutcome(softLanding, {}).counted + " " + Pr.repOutcome(softLanding, {}).flags.join(","));
    check("Count it anyway counts it",
      "true", Pr.repOutcome(softLanding, { keep: true }).counted);
    check("A clean rep counts",
      "true", Pr.repOutcome({ warnings: [] }, {}).counted);

    // The reference range, read straight off the DTB sheet (5 Sep 2025).
    var A = JumpKit.athlete;
    function range(cfg) {
      var r = A.referenceRange("cmj", cfg);
      if (!r) return "none";
      if (r.none) return "none (" + r.none + ")";
      return (r.low * 100).toFixed(1) + " to " + (r.high * 100).toFixed(1) + " cm" + (r.rough ? ", rough" : "");
    }
    check("DTB range, girl aged 16: the 16.0 and 16.5 classes averaged",
      "30.0 to 37.1 cm", range({ sex: "f", age: 16 }));
    check("DTB range, boy aged 14: the 14.0 and 14.5 classes averaged",
      "33.1 to 40.0 cm", range({ sex: "m", age: 14 }));
    check("DTB range, age 9 uses the under 10 class and says it's rough",
      "23.1 to 29.3 cm, rough", range({ sex: "m", age: 9 }));
    check("DTB range, a 20 year old woman uses the over 18 class",
      "30.0 to 38.1 cm", range({ sex: "f", age: 20 }));
    check("No DTB range over 21, under 9, or without sex",
      "none (adult) / none (young) / none (sex)",
      range({ sex: "m", age: 25 }) + " / " + range({ sex: "m", age: 8 }) + " / " + range({ sex: "", age: 14 }));
    check("No reference range at all for the squat jump",
      "true", A.referenceRange("sj", { sex: "m", age: 14 }) === null);

    return out;
  }

  /* --- public ------------------------------------------------------------ */

  function runAll() {
    var cases = CASES.map(runCase);
    var hop = runHopCase();
    var timebase = runTimebaseCase();
    var changeRule = runChangeRuleCases();
    var physicsFails = JumpKit.physics.selfTest();

    var all = cases.concat([hop, timebase]).concat(changeRule);
    return {
      cases: cases,
      hop: hop,
      timebase: timebase,
      changeRule: changeRule,
      physicsSelfTest: physicsFails,
      passed: all.filter(function (r) { return r.pass; }).length,
      total: all.length,
      allPass: physicsFails.length === 0 && all.every(function (r) { return r.pass; })
    };
  }

  JumpKit.selftest = {
    runAll: runAll,
    runCase: runCase,
    runHopCase: runHopCase,
    runTimebaseCase: runTimebaseCase,
    runChangeRuleCases: runChangeRuleCases,
    buildClip: buildClip,
    CASES: CASES
  };

})(typeof window !== "undefined" ? window : this);
