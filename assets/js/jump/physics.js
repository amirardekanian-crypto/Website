/* ============================================================================
   physics.js — every formula the jump tester computes, in one place.

   WHY THIS FILE EXISTS
   If you ever want to change HOW a number is worked out, change it here. The
   app does no maths of its own. Nothing else in the codebase knows what a
   jump height is.

   UNITS DISCIPLINE (the thing most likely to bite you)
   Everything inside this file is SI: metres, seconds, kilograms, m/s.
   Conversion to centimetres happens at the display boundary and nowhere else.
   The two exceptions are marked LOUDLY: the Sayers power equations take
   CENTIMETRES, because that is how they were published. Passing metres into
   them silently returns roughly -2000 W, which looks like a bug in the UI
   rather than a bug here. Both functions assert.

   HOW TO CHANGE SOMETHING SAFELY
   1. Change the function.
   2. Change the `derivation` string next to it so the app's "show the working"
      panel stays honest.
   3. Update `sources` if the reason changed.
   4. Run: python scripts/check_js_syntax.py assets/js/jump/physics.js
   5. The self-test at the bottom runs in the console on load in dev. If you
      break a formula, it shouts.

   Loaded as a classic script (no modules) so the page still works when opened
   straight off disk. Attaches to window.JumpKit.
   ========================================================================= */

(function (root) {
  'use strict';

  var JumpKit = root.JumpKit = root.JumpKit || {};

  /* --------------------------------------------------------------------
     Constants
     -------------------------------------------------------------------- */

  // Standard gravity. Varies about 0.5% across the Earth's surface (9.780 at
  // the equator, 9.832 at the poles; roughly 9.812 in the UK). That is 0.05%
  // on a jump height, which is an order of magnitude below everything else in
  // the error budget, so a single constant is fine. Do not "improve" this
  // with a latitude lookup, it would be false precision.
  var G = 9.81;

  // The irreducible detection floor, in seconds, on one measured interval (a
  // flight time or a contact time). Even with an infinitely fast camera you
  // cannot resolve takeoff and landing better than this, because of motion
  // blur and the foot deforming against the floor.
  // Fitted to Pueo et al. (2023), who measured the error of the WHOLE flight
  // time at 3.4 / 1.8 / 1.2 ms at 120 / 240 / 480 Hz, against a 1000 Hz
  // reference. Frame quantisation alone predicts 3.4 / 1.7 / 0.85 ms, so the
  // extra at the faster rates is this floor. Used to stop the app quoting a
  // precision it cannot deliver at high frame rates.
  var DETECTION_FLOOR_S = 0.0008;

  // Phones write 119.88 or 239.76 fps as often as 120 or 240. A minimum of
  // 120 fps accepts anything within 3% of it, which lets those through and
  // still refuses 100 fps.
  var FPS_TOLERANCE = 0.97;

  /* --------------------------------------------------------------------
     Core: flight time and jump height
     -------------------------------------------------------------------- */

  /**
   * Jump height from flight time. THE central equation of the whole tool.
   *
   * DERIVATION
   *   The body is a projectile from the instant the last toe leaves the floor
   *   to the instant the first toe touches it again. If the centre of mass is
   *   at the same height at both of those instants, the flight splits exactly
   *   in half: t_up = t_down = FT/2.
   *   Rise during t_up:  h = ½·g·t_up²  =  ½·g·(FT/2)²  =  g·FT²/8
   *
   * THE ASSUMPTION, AND IT MATTERS MORE THAN THE MATHS
   *   "Same height at takeoff and landing." An athlete who takes off with the
   *   toes pointed and lands flat-footed has further to fall than they rose,
   *   so they stay in the air longer for the same actual jump. That inflates
   *   this number. A 20 degree ankle difference is worth about 8% on a 30 cm
   *   jump, 30 degrees about 13%, and the pathological case (tall athlete,
   *   small jump, flat landing) can reach 60%. No camera and no frame rate
   *   fixes it. Only the landing cue fixes it.
   *
   * THE CLASSIC BUG
   *   g·FT²/2 forgets that FT is the WHOLE flight, not just the way up. It
   *   returns 4x too much. If you ever see a 120 cm jump, look here first.
   *
   * @param {number} flightTime_s
   * @returns {number} metres
   */
  function jumpHeightFromFlightTime(flightTime_s) {
    return (G * flightTime_s * flightTime_s) / 8;
  }

  /**
   * The inverse. Used to build the slow-motion disambiguation table, where we
   * need to show the coach what flight time each candidate frame rate implies.
   *   FT = sqrt(8h/g) = 0.9029·sqrt(h)
   * @param {number} height_m
   * @returns {number} seconds
   */
  function flightTimeFromJumpHeight(height_m) {
    return Math.sqrt((8 * height_m) / G);
  }

  /* --------------------------------------------------------------------
     Reactive strength
     -------------------------------------------------------------------- */

  /**
   * RSI, the Young (1995) convention, as used by Flanagan and Comyns.
   * This is the default the app displays, because it is the dominant modern
   * convention and it is what the familiar coaching bands were built on.
   *
   *   RSI = jump height (m) / ground contact time (s)      units m/s
   *
   * @param {number} jumpHeight_m
   * @param {number} contactTime_s
   * @returns {number} m/s
   */
  function rsi(jumpHeight_m, contactTime_s) {
    return jumpHeight_m / contactTime_s;
  }

  /**
   * RSR, the reactive strength RATIO (Healy et al. 2016). A different number
   * with a different name, shown beside RSI and never instead of it.
   *
   *   RSR = flight time (s) / ground contact time (s)      dimensionless
   *
   * @param {number} flightTime_s
   * @param {number} contactTime_s
   * @returns {number} dimensionless
   */
  function rsr(flightTime_s, contactTime_s) {
    return flightTime_s / contactTime_s;
  }

  /**
   * Convert RSR to RSI. THERE IS NO CONSTANT MULTIPLIER. Anyone who tells you
   * "RSI is about half RSR" is wrong, and the error is not small.
   *
   *   RSI = JH/GCT = (g·FT²/8)/GCT = (g·FT/8)·(FT/GCT) = 1.22625·FT·RSR
   *
   * The multiplier is proportional to flight time, so it moves with the
   * athlete: 2.7 at FT 0.30 s, 1.7 at 0.47 s, 1.4 at 0.60 s.
   *
   * @param {number} rsrValue
   * @param {number} flightTime_s
   * @returns {number} m/s
   */
  function rsiFromRsr(rsrValue, flightTime_s) {
    return rsrValue * (G / 8) * flightTime_s;
  }

  /**
   * RSImod (Ebben and Petushek 2010). Behind the Advanced toggle and off by
   * default, for a good reason: it needs the instant movement STARTS, and
   * that instant is not visible on video. The countermovement begins with an
   * unweighting phase the camera cannot see, so a video-derived time to
   * takeoff runs about 75 ms short and inflates RSImod by roughly 10%.
   *
   * Balsalobre-Fernandez (2022) published a correction fitted at 240 fps:
   *   TTT_corrected = 0.8947 · TTT_video + 0.1507
   *
   * We apply the correction and label the output "estimated". If you ever
   * decide the correction is not trustworthy enough, delete the metric rather
   * than shipping the raw video TTT.
   *
   * @param {number} tttVideo_s  time from first visible movement to takeoff
   * @returns {number} seconds
   */
  function correctTimeToTakeoff(tttVideo_s) {
    return 0.8947 * tttVideo_s + 0.1507;
  }

  /**
   * RSImod = jump height / corrected time to takeoff.
   * @param {number} jumpHeight_m
   * @param {number} tttCorrected_s
   * @returns {number} m/s
   */
  function rsiMod(jumpHeight_m, tttCorrected_s) {
    return jumpHeight_m / tttCorrected_s;
  }

  /* --------------------------------------------------------------------
     Derived comparisons
     -------------------------------------------------------------------- */

  /**
   * Eccentric utilisation ratio (McGuigan 2006), height variant.
   *   EUR = CMJ height / SJ height
   *
   * Typically 1.00 to 1.15. Read it as "how much the athlete gets out of the
   * stretch shortening cycle". A value below 1.00 almost never means a real
   * eccentric deficit, it means a countermovement crept into the squat jump.
   * Check the squat jump video before believing it.
   *
   * There is also a peak-power variant in the literature. We do not implement
   * it, because our peak power is itself a regression estimate and a ratio of
   * two estimates compounds the error into meaninglessness.
   *
   * @param {number} cmjHeight_m
   * @param {number} sjHeight_m
   * @returns {number} dimensionless
   */
  function eur(cmjHeight_m, sjHeight_m) {
    return cmjHeight_m / sjHeight_m;
  }

  /**
   * Sayers peak power estimate. TAKES CENTIMETRES. See the units warning at
   * the top of this file.
   *
   *   CMJ:  PP(W) = 51.9·JH_cm + 48.9·BM_kg - 2007     SEE 562 W
   *   SJ:   PP(W) = 60.7·JH_cm + 45.3·BM_kg - 2055     SEE 355 W
   *
   * This is a GROUP-LEVEL regression. The standard error of the estimate is
   * bigger than any change one athlete will make in a year, so it is fine for
   * "roughly how powerful is this athlete" and useless for tracking. The UI
   * says so, and must keep saying so.
   *
   * The Lewis formula is deliberately not implemented anywhere in this
   * codebase. It underestimates peak power by around 70% and it actually
   * computes the power of the falling body, not the jump. If someone asks for
   * it, say no.
   *
   * @param {number} jumpHeight_cm  CENTIMETRES
   * @param {number} bodyMass_kg
   * @param {'cmj'|'sj'} variant
   * @returns {number} watts
   */
  function peakPowerSayers_W(jumpHeight_cm, bodyMass_kg, variant) {
    if (jumpHeight_cm < 1) {
      throw new Error(
        'peakPowerSayers_W expects CENTIMETRES, got ' + jumpHeight_cm +
        '. Multiply by 100 at the call site.'
      );
    }
    return variant === 'sj'
      ? 60.7 * jumpHeight_cm + 45.3 * bodyMass_kg - 2055
      : 51.9 * jumpHeight_cm + 48.9 * bodyMass_kg - 2007;
  }

  /** Standard error of the Sayers estimate, watts. Displayed as +/- alongside. */
  var SAYERS_SEE_W = { cmj: 562, sj: 355 };

  /**
   * Percentage difference between limbs on a single-leg test.
   *   ((higher - lower) / higher) x 100
   * Not shipped in v1: it needs at least 3 reps per limb before the number
   * means anything, and we do not want a one-rep asymmetry figure in a
   * beginner's hands. Kept here so v2 does not have to rediscover it.
   */
  function asymmetryPercent(a_m, b_m) {
    var hi = Math.max(a_m, b_m);
    var lo = Math.min(a_m, b_m);
    return ((hi - lo) / hi) * 100;
  }

  /* --------------------------------------------------------------------
     Scale and timebase checks — how we catch a wrong frame rate
     -------------------------------------------------------------------- */

  /**
   * Pixels per metre, from the athlete's standing height measured in the
   * frame against the height they told us.
   * @param {number} standingHeight_px
   * @param {number} standingHeight_m
   * @returns {number} px per metre
   */
  function pixelScale(standingHeight_px, standingHeight_m) {
    return standingHeight_px / standingHeight_m;
  }

  /**
   * Gravity implied by the video, from the parabola fitted to the body's
   * centroid while airborne.
   *
   * In image coordinates y increases downward, so free fall is a parabola
   * opening downward on screen and upward in y:
   *     y(t) = a·(t - tbar)² + b·(t - tbar) + c        [pixels]
   * Second derivative is 2a px/s², and dividing by the pixel scale gives m/s²:
   *     ghat = 2a / s
   *
   * If ghat comes out near 9.81, the frame rate and the scale are both about
   * right. If it comes out at 0.15, the clip is running 8x slow and the frame
   * rate is a lie.
   *
   * @param {number} a_px_per_s2  the quadratic coefficient from the fit
   * @param {number} scale_px_per_m
   * @returns {number} m/s²
   */
  function impliedGravity(a_px_per_s2, scale_px_per_m) {
    return (2 * a_px_per_s2) / scale_px_per_m;
  }

  /**
   * The timebase divisor the physics implies.
   *   lambda = sqrt(9.81 / ghat)
   * A baked 240 fps clip saved at 30 fps gives lambda = 8.
   * @returns {number}
   */
  function impliedTimebaseDivisor(impliedGravity_ms2) {
    return Math.sqrt(G / impliedGravity_ms2);
  }

  /**
   * How tall the video thinks the athlete is. This is the same check as
   * impliedGravity, rearranged into something a coach can actually judge.
   * "The video says this athlete is 1.52 m tall" is a sentence anyone can
   * act on. "rho = 0.73" is not.
   *
   *   H_implied = H_px · 9.81 / (2a)
   *
   * @param {number} standingHeight_px
   * @param {number} a_px_per_s2
   * @returns {number} metres
   */
  function impliedAthleteHeight_m(standingHeight_px, a_px_per_s2) {
    return (standingHeight_px * G) / (2 * a_px_per_s2);
  }

  /**
   * Where does this ratio sit? rho = ghat / 9.81.
   * Bands are deliberately wide on the PASS side: a 3% error in the entered
   * height, plus 5 to 10% from the athlete not being perfectly square-on,
   * plus centroid drift from arm swing, all land inside it. A wrong frame
   * rate does not, because it arrives as a clean ratio of 4x or more.
   * @returns {'pass'|'amber'|'red'}
   */
  function gravityCheckBand(rho) {
    if (rho >= 0.80 && rho <= 1.25) return 'pass';
    if ((rho >= 0.55 && rho < 0.80) || (rho > 1.25 && rho <= 1.80)) return 'amber';
    return 'red';
  }

  /* --------------------------------------------------------------------
     The error model — how sure are we?
     -------------------------------------------------------------------- */

  /**
   * How a timing error turns into a height error.
   *   h = g·t²/8  =>  dh/dt = g·t/4  =>  dh/h = 2·dt/t
   * A 1% timing error is a 2% height error. That squaring is why the frame
   * rate matters more than anything else in this tool.
   * @returns {number} metres of height error per second of timing error
   */
  function heightSensitivity_m_per_s(flightTime_s) {
    return (G * flightTime_s) / 4;
  }

  /**
   * Typical (RMS) error of ONE MEASURED INTERVAL, a flight time or a contact
   * time, for a given frame period, in seconds.
   * An interval runs between two frame-marked events. With a fixed frame
   * selection convention each event lands somewhere inside one frame, an
   * error of period/sqrt(12). Two independent events give period/sqrt(6).
   *   interval error = sqrt( (period/sqrt(6))² + floor² )
   * That matches what Pueo et al. (2023) measured for the whole flight time:
   * 3.49 / 1.88 / 1.17 ms here against their 3.4 / 1.8 / 1.2 ms.
   *
   * ⚠️ It already contains both events. Do not multiply it by sqrt(2) to get
   * a flight time error. The app did until 2026-09-14, and every "plus or
   * minus" it showed was 1.4 times too big.
   */
  function timingError_s(framePeriod_s) {
    var q = framePeriod_s / Math.sqrt(6);
    return Math.sqrt(q * q + DETECTION_FLOOR_S * DETECTION_FLOOR_S);
  }

  /**
   * The error of ONE frame-marked event on its own, a takeoff or a landing.
   *   event error = interval error / sqrt(2)
   * rsiRelativeError needs this rather than the interval error, because it
   * treats the three events of a drop jump separately.
   */
  function eventTimingError_s(framePeriod_s) {
    return timingError_s(framePeriod_s) / Math.SQRT2;
  }

  /**
   * Does a clip meet a test's minimum frame rate? Within FPS_TOLERANCE, so a
   * phone clip at 119.88 fps counts as 120.
   */
  function meetsMinFps(fps, minFps) {
    if (!minFps) return true;
    return !!fps && fps >= minFps * FPS_TOLERANCE;
  }

  /**
   * RSI error propagation. Note the middle term: the takeoff frame is SHARED
   * between the flight time and the contact time, so an error there pushes
   * RSI the same way twice. That, plus contact time being about 2.5x shorter
   * than flight time, is why RSI is punished so much harder than height.
   *
   *   sigma_RSI/RSI = sigma_e · sqrt[ (2/tf)² + (2/tf + 1/tc)² + (1/tc)² ]
   *
   * sigma_e is ONE event's error, eventTimingError_s. Passing timingError_s
   * here counts every event's error sqrt(2) times too big.
   *
   * @returns {number} fractional error (0.027 = 2.7%)
   */
  function rsiRelativeError(timingError_s, flightTime_s, contactTime_s) {
    var a = 2 / flightTime_s;
    var b = 2 / flightTime_s + 1 / contactTime_s;
    var c = 1 / contactTime_s;
    return timingError_s * Math.sqrt(a * a + b * b + c * c);
  }

  /**
   * Minimum detectable change at 95% confidence, between TEST DAYS.
   *   MDC95 = 1.96 · TE · sqrt(1 + 1/k)
   * TE is the between-day typical error of the session score, measured the
   * way the score is formed (Hopkins 2000). k is how many sessions were
   * averaged into the thing you compare against.
   *   k = 1, one test against another:        1.96 · sqrt(2) · TE = 2.77 · TE
   *   k = 2, against a two-session baseline:  1.96 · sqrt(1.5) · TE = 2.40 · TE
   * The one test against another form is the one in Weir (2005).
   *
   * WHY NOT 1.96 · CV · sqrt(2/n)
   * That was this function until 2026-09-14, with n the reps in a session.
   * It assumes averaging reps removes the day to day part of the noise. It
   * doesn't. Reps cancel rep to rep noise, but the whole session still moves
   * with the day. It put the jump gate at 6.4% where the evidence puts it at
   * 11 to 13%, and called about 1 in 4 retests with no real change "real".
   *
   * Works in any unit, TE in metres gives metres. The lines each test uses
   * live in its changeRule, and progress.js applies them.
   */
  function mdc95(te, k) {
    return 1.96 * te * Math.sqrt(1 + 1 / (k || 1));
  }

  /**
   * ⚠️ DEPRECATED, NOT USED BY THE APP. These CVs were never sourced, and the
   * gate that read them was wrong. The sourced numbers live in each test's
   * changeRule now. Kept only so a copy of jump.html cached on a phone from
   * before 2026-09-14 doesn't crash if it loads this file. Delete after
   * October 2026.
   */
  var CV = {
    cmjHeight_240fps: 0.04,
    cmjHeight_120fps: 0.05,
    djRsi_withinSession: 0.05,
    djRsi_betweenDays: 0.08,
    hopRsi_betweenDays: 0.06
  };

  /**
   * Build the frame-rate error table shown in "How accurate is this?".
   * Computed, never hardcoded, so if you change the reference case or the
   * detection floor the table follows.
   */
  function frameRateErrorTable(opts) {
    var o = opts || {};
    var ft = o.flightTime_s || 0.500;
    var gct = o.contactTime_s || 0.200;
    var rates = o.rates || [30, 60, 120, 240, 480];
    var h = jumpHeightFromFlightTime(ft);
    var sens = heightSensitivity_m_per_s(ft);

    return rates.map(function (fps) {
      var period = 1 / fps;
      var te = timingError_s(period);
      return {
        fps: fps,
        framePeriod_ms: period * 1000,
        framesInFlight: Math.round(ft * fps),
        framesInContact: Math.round(gct * fps),
        heightErrorOneFrame_m: sens * period,
        heightErrorTypical_m: sens * te,
        contactErrorTypical_frac: te / gct,
        // te is a whole interval's error. rsiRelativeError wants one event's.
        rsiErrorTypical_frac: rsiRelativeError(te / Math.SQRT2, ft, gct),
        insideBracketBias_m: -sens * period,
        referenceHeight_m: h
      };
    });
  }

  /* --------------------------------------------------------------------
     Guards — the app calls these before it shows anything
     -------------------------------------------------------------------- */

  // Above this, it is not a jump, it is a broken clock. The tallest verified
  // human countermovement jumps sit around 0.75 m; 1.20 m is the "the timebase
  // is wrong" line, comfortably clear of any real athlete.
  var HEIGHT_TIMEBASE_FAULT_M = 1.20;
  var HEIGHT_HUMAN_CEILING_M = 0.75;
  var FLIGHT_TIME_FAULT_S = 1.10;

  /**
   * Classify a computed result before display.
   * @returns {{ok:boolean, kind:string}} kind is 'ok' | 'timebase' | 'implausible'
   */
  function guardHeight(height_m, flightTime_s) {
    if (height_m > HEIGHT_TIMEBASE_FAULT_M || flightTime_s > FLIGHT_TIME_FAULT_S) {
      return { ok: false, kind: 'timebase' };
    }
    if (height_m > HEIGHT_HUMAN_CEILING_M || height_m < 0.05) {
      return { ok: false, kind: 'implausible' };
    }
    return { ok: true, kind: 'ok' };
  }

  /* --------------------------------------------------------------------
     Formatting — one place, so units never drift
     -------------------------------------------------------------------- */

  var fmt = {
    heightCm: function (m) { return (m * 100).toFixed(1); },
    seconds: function (s) { return s.toFixed(3); },
    ms: function (s) { return Math.round(s * 1000); },
    rsi: function (v) { return v.toFixed(2); },
    rsr: function (v) { return v.toFixed(2); },
    watts: function (w) { return Math.round(w).toLocaleString('en-GB'); },
    pct: function (frac) { return (frac * 100).toFixed(1); }
  };

  /* --------------------------------------------------------------------
     Provenance. Keep this honest, the app renders it.
     -------------------------------------------------------------------- */

  var sources = [
    { id: 'young1995', text: 'Young, W. (1995). Laboratory assessment of lower body reactive strength. Origin of RSI as jump height over contact time.' },
    { id: 'flanagan2008', text: 'Flanagan, E. & Comyns, T. (2008). The use of contact time and RSI to optimise fast stretch-shortening cycle training. Source of the coaching bands.' },
    { id: 'healy2016', text: 'Healy, R. et al. (2016). Reactive strength ratio, flight time over contact time. The dimensionless convention.' },
    { id: 'ebben2010', text: 'Ebben, W. & Petushek, E. (2010). Evaluating the modified reactive strength index.' },
    { id: 'balsalobre2022', text: 'Balsalobre-Fernandez, C. (2022). Video-derived time to takeoff correction at 240 fps.' },
    { id: 'mcguigan2006', text: 'McGuigan, M. et al. (2006). Eccentric utilisation ratio.' },
    { id: 'sayers1999', text: 'Sayers, S. et al. (1999). Cross-validation of three jump power equations.' },
    { id: 'pueo2023', text: 'Pueo, B. et al. (2023). Accuracy of flight time and jump height from video at different frame rates. The whole flight time error was 3.4 / 1.8 / 1.2 ms at 120 / 240 / 480 Hz, which is where the timing error model and its 0.8 ms floor come from.' },
    { id: 'balsalobre2015', text: 'Balsalobre-Fernandez, C. et al. (2015). Validity of My Jump against a force platform. The accuracy bar this tool aims at.' },
    { id: 'bogataj2020', text: 'Bogataj, S. et al. (2020). My Jump 2 in 48 children aged 11 to 14 at 240 fps, retested after two weeks. The best countermovement jump moved 1.0 cm between days, the best squat jump 1.5 cm. The change lines for both jumps are built on these.' },
    { id: 'wilczynski2026', text: 'Wilczyński, B. et al. (2026). Phone, force plate and sensor jump testing in professional volleyball players aged 17 and 18. Phone jump height SEM 1.39 cm, MDC95 3.86 cm. The 4 cm line for bigger jumpers is built on this.' },
    { id: 'weir2005', text: 'Weir, J. (2005). Quantifying test-retest reliability. The minimum detectable change between two tests, 1.96 x sqrt(2) x the standard error of measurement.' },
    { id: 'hopkins2000', text: 'Hopkins, W. (2000). Measures of reliability in sports medicine and science. The typical error, and why it has to be measured on the score the way you actually form it.' },
    { id: 'dtb2025', text: 'German Tennis Federation (DTB). Normwerte DTB-Konditionstest, updated 5 September 2025. Countermovement jump by age and sex in regional and national squad players, the range shown beside a result.' }
  ];

  /* --------------------------------------------------------------------
     Self-test. Runs on load. If a formula breaks, this shouts in the console
     rather than letting a wrong number reach an athlete.
     -------------------------------------------------------------------- */

  function selfTest() {
    var fails = [];
    function near(actual, expected, tol, label) {
      if (Math.abs(actual - expected) > tol) {
        fails.push(label + ': got ' + actual + ', expected about ' + expected);
      }
    }

    // A 0.500 s flight is a 30.66 cm jump. If this ever changes, something is
    // very wrong.
    near(jumpHeightFromFlightTime(0.5), 0.3066, 0.0005, 'jumpHeightFromFlightTime');

    // Round trip.
    near(flightTimeFromJumpHeight(jumpHeightFromFlightTime(0.5)), 0.5, 1e-9, 'flight time round trip');

    // The 4x bug guard: g*t^2/2 would give 1.226, not 0.3066.
    if (jumpHeightFromFlightTime(0.5) > 1) fails.push('jump height is using the 4x-too-big formula');

    // RSR to RSI conversion must agree with computing both directly.
    var ft = 0.42, gct = 0.19;
    var jh = jumpHeightFromFlightTime(ft);
    near(rsiFromRsr(rsr(ft, gct), ft), rsi(jh, gct), 1e-9, 'rsiFromRsr');

    // Sayers must reject metres.
    var threw = false;
    try { peakPowerSayers_W(0.31, 75, 'cmj'); } catch (e) { threw = true; }
    if (!threw) fails.push('peakPowerSayers_W did not reject metres');

    // Sayers CMJ, 31 cm, 75 kg: 51.9*31 + 48.9*75 - 2007
    //                         = 1608.9 + 3667.5 - 2007 = 3269.4 W
    near(peakPowerSayers_W(31, 75, 'cmj'), 3269.4, 0.5, 'peakPowerSayers cmj');

    // Sayers SJ, 31 cm, 75 kg: 60.7*31 + 45.3*75 - 2055
    //                        = 1881.7 + 3397.5 - 2055 = 3224.2 W
    near(peakPowerSayers_W(31, 75, 'sj'), 3224.2, 0.5, 'peakPowerSayers sj');

    // A clip running 8x slow implies gravity of 9.81/64.
    var scale = 300; // px per metre
    var aTrue = (G * scale) / 2;
    near(impliedTimebaseDivisor(impliedGravity(aTrue / 64, scale)), 8, 0.001, 'impliedTimebaseDivisor');

    // The timing error model against what Pueo et al. (2023) measured for a
    // whole flight time: 3.4 / 1.8 / 1.2 ms at 120 / 240 / 480 Hz.
    near(timingError_s(1 / 120), 0.0034, 0.00015, 'timing error at 120 Hz against Pueo 2023');
    near(timingError_s(1 / 240), 0.0018, 0.00015, 'timing error at 240 Hz against Pueo 2023');
    near(timingError_s(1 / 480), 0.0012, 0.0001, 'timing error at 480 Hz against Pueo 2023');

    // MDC95 between days: 2.77 x TE against one test, 2.40 x TE against a
    // two-session baseline.
    near(mdc95(1, 1), 2.7719, 0.001, 'mdc95 one test against another');
    near(mdc95(1, 2), 2.4005, 0.001, 'mdc95 against a two-session baseline');

    // A phone's 119.88 fps meets a 120 fps floor, 100 fps doesn't.
    if (!meetsMinFps(119.88, 120)) fails.push('meetsMinFps refused a 119.88 fps clip');
    if (meetsMinFps(100, 120)) fails.push('meetsMinFps accepted a 100 fps clip');

    if (fails.length) {
      console.error('[JumpKit.physics] SELF TEST FAILED:\n  ' + fails.join('\n  '));
    }
    return fails;
  }

  /* --------------------------------------------------------------------
     Export
     -------------------------------------------------------------------- */

  JumpKit.physics = {
    G: G,
    DETECTION_FLOOR_S: DETECTION_FLOOR_S,
    FPS_TOLERANCE: FPS_TOLERANCE,
    HEIGHT_TIMEBASE_FAULT_M: HEIGHT_TIMEBASE_FAULT_M,
    HEIGHT_HUMAN_CEILING_M: HEIGHT_HUMAN_CEILING_M,
    FLIGHT_TIME_FAULT_S: FLIGHT_TIME_FAULT_S,
    SAYERS_SEE_W: SAYERS_SEE_W,
    CV: CV,   // deprecated, unused, see the note on it above

    jumpHeightFromFlightTime: jumpHeightFromFlightTime,
    flightTimeFromJumpHeight: flightTimeFromJumpHeight,
    rsi: rsi,
    rsr: rsr,
    rsiFromRsr: rsiFromRsr,
    correctTimeToTakeoff: correctTimeToTakeoff,
    rsiMod: rsiMod,
    eur: eur,
    peakPowerSayers_W: peakPowerSayers_W,
    asymmetryPercent: asymmetryPercent,

    pixelScale: pixelScale,
    impliedGravity: impliedGravity,
    impliedTimebaseDivisor: impliedTimebaseDivisor,
    impliedAthleteHeight_m: impliedAthleteHeight_m,
    gravityCheckBand: gravityCheckBand,

    heightSensitivity_m_per_s: heightSensitivity_m_per_s,
    timingError_s: timingError_s,
    eventTimingError_s: eventTimingError_s,
    meetsMinFps: meetsMinFps,
    rsiRelativeError: rsiRelativeError,
    mdc95: mdc95,
    frameRateErrorTable: frameRateErrorTable,

    guardHeight: guardHeight,
    fmt: fmt,
    sources: sources,
    selfTest: selfTest
  };

  selfTest();

})(typeof window !== 'undefined' ? window : this);
