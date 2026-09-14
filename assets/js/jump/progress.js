/* ============================================================================
   progress.js — has anything really changed?

   A saved result is one rep. A test is a few reps on one day. A change is one
   test day against another. This file turns saved reps into sessions, scores
   each session the way its test file says, sets a baseline, and decides
   whether the latest test is a real change or normal day to day wobble.

   THE NUMBERS ARE NOT IN HERE
   Each test file carries its own changeRule: the measured day to day error
   (te) of its session score, and the lines built from it. What counts as
   noise is a property of the test, so it lives with the test. A test whose
   changeRule is null gets no verdict at all, which is the honest answer when
   nobody has checked how much that score wobbles.

   THE RULE
   1. Session score. The best counted rep, or the mean if the test's
      scoring.score isn't "best". A rep the app flags for a soft landing or
      tucked legs is saved but not counted, unless the athlete taps Count it
      anyway.
   2. Comparable. Same athlete, test, arms, surface, shoes, cue, box height
      and frame rate class (120 or 240). Filmed at the test's minimum frame
      rate, with at least requires.minValidTrials counted reps. Anything else
      is shown but never compared.
   3. Baseline. The mean score of the first two comparable sessions, if
      they're no more than 7 days apart. Otherwise the first session alone.
   4. The latest session is judged against the baseline, and against the
      session before it.
        under the wobble line        normal wobble
        between the two lines        possible change, check the next test
        at or past the real line     real change
      Against the baseline, a possible change that goes the same way as the
      test before it reads as likely real. By simulation that's wrong about
      5% of the time when nothing has changed.
   5. Under 11 there's no wobble line. Only the real line counts, and it has
      to show up at two tests in a row.

   THE MATHS BEHIND THE LINES
   physics.mdc95 gives MDC95 = 1.96 x TE x sqrt(1 + 1/k). One test against
   another (k = 1) is 2.77 x TE. The real line is that rounded UP to the next
   half centimetre. The wobble line is sqrt(2) x TE, one standard deviation
   of the gap between two test days, rounded to the NEAREST half centimetre.
   Against a two-session baseline the 95% line is only 2.40 x TE, so the real
   line holds there too. The self test checks every test's lines against its
   te, so the two can't quietly drift apart.

   Pure functions over plain objects, no DOM. Load it after physics.js.
   Athlete-facing strings follow the writing rules at the top of filming.js.
   ========================================================================= */

(function (root) {
  "use strict";

  var JumpKit = root.JumpKit = root.JumpKit || {};

  var BASELINE_WINDOW_DAYS = 7;
  var DAY_MS = 86400000;

  // What makes two sessions comparable, and how to name each one when it
  // changes.
  var CONDITION_FIELDS = ["arms", "surface", "footwear", "cue", "dropHeight_cm", "fpsClass"];
  var CONDITION_NAMES = {
    arms: "arm position",
    surface: "surface",
    footwear: "shoes",
    cue: "cue",
    dropHeight_cm: "box height",
    fpsClass: "frame rate"
  };
  var ARMS_TEXT = { hands_on_hips: "Hands on hips", free_swing: "Arm swing" };
  var SURFACE_TEXT = {
    rigid_floor: "rigid floor",
    rubber_over_concrete: "rubber on concrete",
    sprung_floor: "sprung floor",
    mat: "mat"
  };

  /* --------------------------------------------------------------------
     Small helpers
     -------------------------------------------------------------------- */

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function timeOf(rec) {
    var t = rec && rec.time ? Date.parse(rec.time) : NaN;
    return isFinite(t) ? t : 0;
  }

  // Names are matched loosely, so "Sara" and "sara " are one athlete.
  function athleteKey(name) {
    var k = String(name == null ? "" : name).trim().toLowerCase();
    return k || "you";
  }

  function displayName(name) {
    var s = String(name == null ? "" : name).trim();
    return !s || s.toLowerCase() === "you" ? "You" : s;
  }

  // The athlete's own calendar day rather than UTC, so a test at 1 am in
  // Tehran lands on the right date.
  function localDay(rec) {
    var d = rec && rec.time ? new Date(rec.time) : null;
    if (d && !isNaN(d.getTime())) {
      return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    }
    return (rec && rec.date) || "";
  }

  function dayNumber(ymd) {
    var p = String(ymd).split("-");
    if (p.length !== 3) return 0;
    return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / DAY_MS);
  }

  // 200 fps and up is one class, 100 to 199 another. This only keeps a 120
  // fps session and a 240 fps session off the same line. Whether a clip was
  // fast enough at all is physics.meetsMinFps, which is stricter.
  function fpsClass(fps) {
    if (!fps || !isFinite(fps)) return "unknown";
    if (fps >= 200) return "240";
    if (fps >= 100) return "120";
    return "low";
  }

  function conditionsOf(rec) {
    return {
      arms: rec.arms || "",
      surface: rec.surface || "",
      footwear: String(rec.footwear || "").trim().toLowerCase(),
      cue: rec.cue || "",
      dropHeight_cm: rec.dropHeight_cm == null ? "" : String(rec.dropHeight_cm),
      fpsClass: fpsClass(rec.fps_used)
    };
  }

  function lineKeyOf(c) {
    return CONDITION_FIELDS.map(function (f) { return c[f]; }).join("|");
  }

  function changedFields(a, b) {
    return CONDITION_FIELDS.filter(function (f) { return a.conditions[f] !== b.conditions[f]; });
  }

  function lastKnown(recs, field) {
    for (var i = recs.length - 1; i >= 0; i--) {
      if (recs[i][field] != null && recs[i][field] !== "") return recs[i][field];
    }
    return null;
  }

  function humanList(items) {
    if (items.length <= 1) return items.join("");
    return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  }

  function cm(m) {
    return (m * 100).toFixed(1).replace(/\.0$/, "") + " cm";
  }

  /* --------------------------------------------------------------------
     Who is in the log
     -------------------------------------------------------------------- */

  function athletes(log) {
    var byKey = {};
    var list = [];
    (log || []).forEach(function (r) {
      if (!r) return;
      var k = athleteKey(r.athlete);
      var a = byKey[k];
      if (!a) {
        a = byKey[k] = { key: k, name: displayName(r.athlete), count: 0, last: -1 };
        list.push(a);
      }
      a.count++;
      var t = timeOf(r);
      if (t >= a.last) { a.last = t; a.name = displayName(r.athlete); }
    });
    list.sort(function (x, y) { return y.last - x.last; });
    return list;
  }

  /* --------------------------------------------------------------------
     Does a rep count? Decided when it is saved.
     -------------------------------------------------------------------- */

  // Every warning that offers to void the rep is one that inflates the number,
  // a soft landing, tucked legs or a dip before a squat jump. The DTB protocol
  // repeats those jumps without counting them, so a flagged rep is saved but
  // not counted, unless the athlete says the app got it wrong.
  function repOutcome(res, state) {
    var flags = ((res && res.warnings) || [])
      .filter(function (w) { return w && w.voidOption; })
      .map(function (w) { return w.id; });
    return { flags: flags, counted: !flags.length || !!(state && state.keep) };
  }

  /* --------------------------------------------------------------------
     Reps into sessions
     -------------------------------------------------------------------- */

  function sessionsFor(log, test, athlete) {
    var P = JumpKit.physics;
    var who = athleteKey(athlete);
    var byKey = {};
    var list = [];

    (log || []).forEach(function (r) {
      if (!r || r.testId !== test.id || athleteKey(r.athlete) !== who) return;
      var c = conditionsOf(r);
      var day = localDay(r);
      var lk = lineKeyOf(c);
      var key = day + "#" + lk;
      var s = byKey[key];
      if (!s) {
        s = byKey[key] = { key: key, day: day, dayNo: dayNumber(day), lineKey: lk, conditions: c, reps: [] };
        list.push(s);
      }
      s.reps.push(r);
    });

    var req = test.requires || {};
    var minTrials = req.minValidTrials || 1;
    var minFps = req.minFps || 0;
    var byBest = !!(test.scoring && test.scoring.score === "best");

    list.forEach(function (s) {
      s.reps.sort(function (a, b) { return timeOf(a) - timeOf(b); });
      var vals = s.reps
        .filter(function (r) { return r.counted !== false; })
        .map(function (r) { return r.value; })
        .filter(function (v) { return typeof v === "number" && isFinite(v); });
      var slowest = Math.min.apply(null, s.reps.map(function (r) { return r.fps_used || 0; }));

      s.nReps = s.reps.length;
      s.nCounted = vals.length;
      s.best = vals.length ? Math.max.apply(null, vals) : null;
      s.mean = vals.length ? vals.reduce(function (a, v) { return a + v; }, 0) / vals.length : null;
      s.scoreType = byBest ? "best" : "mean";
      s.score = byBest ? s.best : s.mean;
      s.age = lastKnown(s.reps, "age");
      s.firstTime = timeOf(s.reps[0]);
      s.minTrials = minTrials;
      s.minFps = minFps;
      s.whyNot = !P.meetsMinFps(slowest, minFps) ? "fps" : (s.nCounted < minTrials ? "reps" : null);
      s.eligible = !s.whyNot;
    });

    list.sort(function (a, b) { return (a.dayNo - b.dayNo) || (a.firstTime - b.firstTime); });
    return list;
  }

  /* --------------------------------------------------------------------
     The lines for this athlete, and the verdict
     -------------------------------------------------------------------- */

  function linesFor(rule, age, reference) {
    var young = rule.under11;
    if (young && age != null && age < 11) {
      return { group: "under11", te: null, wobble: null, real: young.real, needsRepeat: true, source: young.source };
    }
    var big = rule.bigJumper;
    if (big && ((age != null && age >= big.fromAge) || (reference != null && reference >= big.fromScore))) {
      return { group: "big", te: big.te, wobble: big.wobble, real: big.real, needsRepeat: false, source: big.source };
    }
    var st = rule.standard;
    return { group: "standard", te: st.te, wobble: st.wobble, real: st.real, needsRepeat: false, source: st.source };
  }

  // Judged on the change as the athlete sees it, to the nearest millimetre,
  // so a change shown as 3.0 cm never reads as under a 3 cm line.
  function judge(delta, L, prevDelta) {
    var d = Math.round(delta * 1000) / 1000;
    var a = Math.abs(d);
    var pd = prevDelta == null ? null : Math.round(prevDelta * 1000) / 1000;
    var sameWay = pd != null && pd * d > 0;
    var label;
    if (L.needsRepeat) {
      if (a >= L.real) label = sameWay && Math.abs(pd) >= L.real ? "real" : "possible";
      else label = "wobble";
    } else if (a >= L.real) {
      label = "real";
    } else if (a >= L.wobble) {
      label = sameWay && Math.abs(pd) >= L.wobble ? "likely" : "possible";
    } else {
      label = "wobble";
    }
    return { delta: d, dir: d > 0 ? "up" : (d < 0 ? "down" : "flat"), label: label, lines: L };
  }

  function baselineOf(line) {
    var s1 = line[0], s2 = line[1];
    if (s2 && s2.dayNo - s1.dayNo <= BASELINE_WINDOW_DAYS) {
      return { value: (s1.score + s2.score) / 2, k: 2, sessions: [s1, s2], lastIndex: 1 };
    }
    return { value: s1.score, k: 1, sessions: [s1], lastIndex: 0 };
  }

  /**
   * Everything History needs for one athlete on one test.
   * opts.age is a fallback for records saved before age was stored with them.
   */
  function report(log, test, athlete, opts) {
    var o = opts || {};
    var rule = test.changeRule || null;
    var all = sessionsFor(log, test, athlete);
    var out = { testId: test.id, hasRule: !!rule, sessions: all.slice().reverse(), latest: null };
    if (!all.length) return out;

    var latest = all[all.length - 1];
    var before = all.length > 1 ? all[all.length - 2] : null;
    var v = {
      session: latest,
      reason: null,
      baseline: null,
      vsBaseline: null,
      vsPrevious: null,
      changed: before && before.lineKey !== latest.lineKey ? changedFields(before, latest) : []
    };
    out.latest = v;

    if (!rule) { v.reason = "noRule"; return out; }

    var line = all.filter(function (s) { return s.eligible && s.lineKey === latest.lineKey; });
    if (line.length) v.baseline = baselineOf(line);
    if (!latest.eligible) { v.reason = latest.whyNot; return out; }

    var idx = line.indexOf(latest);
    if (idx === 0) { v.reason = v.changed.length ? "newLine" : "first"; return out; }

    var age = latest.age != null ? latest.age : (o.age != null ? o.age : null);
    var prev = line[idx - 1];
    var b = v.baseline;

    v.vsPrevious = judge(latest.score - prev.score, linesFor(rule, age, prev.score), null);
    v.vsPrevious.against = prev;

    if (idx > b.lastIndex) {
      var prevDelta = idx - 1 > b.lastIndex ? prev.score - b.value : null;
      v.vsBaseline = judge(latest.score - b.value, linesFor(rule, age, b.value), prevDelta);
      // A one-session baseline with one test since is the same comparison
      // twice. Say it once.
      if (b.k === 1 && prev === b.sessions[0]) v.vsPrevious = null;
    }
    return out;
  }

  /* --------------------------------------------------------------------
     Words. Athlete-facing, so no em dashes and no semicolons.
     -------------------------------------------------------------------- */

  var LABEL_TEXT = {
    wobble: "That's normal day to day wobble. Nothing to act on.",
    possible: "That could be a real change. Check it at your next test.",
    possibleRepeat: "That could be real. It has to show up again at your next test before we call it.",
    likely: "That's likely real. It's gone the same way two tests running.",
    real: "That's a real change."
  };

  function verdictItem(title, j) {
    var head = j.dir === "flat" ? "No change." : (j.dir === "up" ? "Up " : "Down ") + cm(Math.abs(j.delta)) + ".";
    var key = j.label === "possible" && j.lines.needsRepeat ? "possibleRepeat" : j.label;
    var sure = j.label === "real" || j.label === "likely";
    var text = LABEL_TEXT[key];
    if (sure && j.dir === "down") text += " Worth checking your sleep and training load before the next hard block.";
    return { title: title, head: head, text: text, label: j.label, tone: sure ? (j.dir === "up" ? "ok" : "warn") : "info" };
  }

  function explain(v, test) {
    var j = v.vsBaseline || v.vsPrevious;
    var L = j.lines;
    var what = test.scoring && test.scoring.score === "best" ? "best jump" : "score";
    var times = JumpKit.physics.mdc95(1, 1).toFixed(1);
    var out = [];
    if (L.needsRepeat) {
      out.push("Under 11, only a change of " + cm(L.real) + " or more counts, and it has to show up at two tests in a row. Nobody has measured how much a phone video jump wobbles under 11, so we're stricter.");
    } else {
      out.push("For you, under " + cm(L.wobble) + " is normal wobble and " + cm(L.real) + " or more is a real change.");
      out.push("Your " + what + " moves about " + cm(L.te) + " between test days even when nothing has changed (" + L.source + "). To be 95% sure a change is real, it has to be about " + times + " times that.");
    }
    var b = v.baseline;
    if (b && b.k === 2) {
      out.push("Your baseline is the average of your " + what + "s on " + b.sessions[0].day + " and " + b.sessions[1].day + ".");
    } else if (b) {
      out.push("Your baseline is your test on " + b.sessions[0].day + ". Your next test came more than " + BASELINE_WINDOW_DAYS + " days later, so there was no second one to average.");
    }
    return out.join(" ");
  }

  function reasonText(v, test) {
    var s = v.session;
    if (v.reason === "noRule") {
      return {
        title: "No verdict for this test yet",
        text: test.changeRuleNote || "Nobody has measured how much this score moves from day to day, so we won't guess whether a change is real."
      };
    }
    if (v.reason === "fps") {
      return {
        title: "Can't be compared",
        text: "Your latest session was filmed below " + s.minFps + " fps, so it isn't compared with anything. Record in slow motion at 240 fps."
      };
    }
    if (v.reason === "reps") {
      return {
        title: "Not enough good reps",
        text: "Your latest session has " + s.nCounted + " good rep" + (s.nCounted === 1 ? "" : "s") + ". The rule is built on your best of " + s.minTrials + ", so do all " + s.minTrials + " next time."
      };
    }
    if (v.reason === "newLine") {
      return {
        title: "A new line starts here",
        text: "Your " + humanList(v.changed.map(function (f) { return CONDITION_NAMES[f]; })) + " changed since your last test. That moves the number on its own, so this starts a new line with its own baseline."
      };
    }
    return {
      title: "Your first test",
      text: "Nothing to compare with yet. Test again within " + BASELINE_WINDOW_DAYS + " days and the average of the two becomes your baseline. Every test after that is checked against it."
    };
  }

  /**
   * What History shows above the sessions. Either a reason there's no verdict,
   * or one or two verdicts plus the plain-English working behind them.
   */
  function describe(rep, test) {
    var v = rep && rep.latest;
    if (!v) return null;
    if (v.reason) {
      var r = reasonText(v, test);
      return { reason: v.reason, title: r.title, text: r.text, items: [], explain: "" };
    }
    var items = [];
    if (v.vsBaseline) items.push(verdictItem("Since your baseline", v.vsBaseline));
    if (v.vsPrevious) items.push(verdictItem("Since your last test, on " + v.vsPrevious.against.day, v.vsPrevious));
    return { reason: null, items: items, explain: explain(v, test) };
  }

  function conditionsText(c) {
    var fps = { "240": "240 fps", "120": "120 fps", low: "under 100 fps" }[c.fpsClass] || "frame rate unknown";
    var parts = [
      ARMS_TEXT[c.arms] || c.arms || "Arms not noted",
      SURFACE_TEXT[c.surface] || c.surface || "surface not noted",
      c.footwear ? "shoes: " + c.footwear : "shoes not noted"
    ];
    if (c.dropHeight_cm) parts.push(c.dropHeight_cm + " cm box");
    parts.push(fps);
    return parts.join(" · ");
  }

  JumpKit.progress = {
    BASELINE_WINDOW_DAYS: BASELINE_WINDOW_DAYS,
    athleteKey: athleteKey,
    athletes: athletes,
    localDay: localDay,
    fpsClass: fpsClass,
    repOutcome: repOutcome,
    sessionsFor: sessionsFor,
    linesFor: linesFor,
    judge: judge,
    report: report,
    describe: describe,
    conditionsText: conditionsText
  };

})(typeof window !== "undefined" ? window : this);
