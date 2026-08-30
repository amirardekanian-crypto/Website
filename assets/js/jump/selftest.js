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

  /* --- public ------------------------------------------------------------ */

  function runAll() {
    var cases = CASES.map(runCase);
    var hop = runHopCase();
    var timebase = runTimebaseCase();
    var physicsFails = JumpKit.physics.selfTest();

    var all = cases.concat([hop, timebase]);
    return {
      cases: cases,
      hop: hop,
      timebase: timebase,
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
    buildClip: buildClip,
    CASES: CASES
  };

})(typeof window !== "undefined" ? window : this);
