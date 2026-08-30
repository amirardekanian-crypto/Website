/* ============================================================================
   athlete.js — what we ask the athlete, and why we are asking.

   THE RULE THIS FILE ENFORCES
   Never ask for something without saying what it buys. If a field does not
   change a number, a warning, or a piece of advice, it does not belong here.
   That is the same rule the coaching principles apply to monitoring: cut
   every measure that does not feed a decision.

   Each field carries three things the app shows the athlete:
     whatItBuys   what improves if they give it
     withoutIt    what the app cannot do if they do not
     usedFor      the specific computations, so nothing is hand-wavy

   ADDING A FIELD
   Add it here, list the test ids in `tests`, and the setup screen picks it up
   on its own. If you cannot write a truthful `whatItBuys` line, that is the
   signal not to ask for it.

   DELIBERATELY NOT ASKED
   Camera distance, lens height, tripod or not. They change nothing we compute:
   the gravity cross check absorbs the camera geometry on its own. Asking would
   be theatre.
   ========================================================================= */

(function (root) {
  "use strict";

  var JumpKit = root.JumpKit = root.JumpKit || {};

  var FIELDS = [

    /* ---------------------------------------------------------------- */
    {
      id: "name",
      label: "Name",
      type: "text",
      required: false,
      tests: ["cmj", "sj", "dj", "hop105"],
      placeholder: "Who is this",
      whatItBuys: "Keeps your results separate from anyone else who uses this phone.",
      withoutIt: "Everything still works, results just all pile into one list.",
      usedFor: "Storage only. It never leaves your device."
    },

    /* ---------------------------------------------------------------- */
    {
      id: "height_cm",
      label: "Standing height",
      unit: "cm",
      type: "number",
      min: 120, max: 220, step: 1,
      required: true,
      tests: ["cmj", "sj", "dj", "hop105"],
      placeholder: "178",
      whatItBuys:
        "**This is the one that protects your result.** Knowing how tall you are lets us work out how many pixels make a metre, and from there we watch your body fall through the air and measure gravity for ourselves. If the video says gravity is wrong, the video is running at the wrong speed, and we catch it before it reaches your score.",
      withoutIt:
        "We cannot tell a real jump from a clip that is secretly running eight times slow. That mistake turns a 30 cm jump into a number in the metres, and there is nothing in the file that admits it.",
      usedFor: "Pixel scale, the gravity cross check, and the slow motion detector."
    },

    /* ---------------------------------------------------------------- */
    {
      id: "bodyMass_kg",
      label: "Body mass",
      unit: "kg",
      type: "number",
      min: 25, max: 200, step: 0.5,
      required: false,
      tests: ["cmj", "sj"],
      placeholder: "optional",
      whatItBuys:
        "Adds a rough estimate of the power you produced, in watts.",
      withoutIt:
        "You still get your jump height, which is the number that actually matters. You just do not get the power estimate.",
      usedFor: "The Sayers peak power equation.",
      honesty:
        "Being straight with you: this estimate comes from an equation fitted to groups of people, and its error is bigger than any change you will make in a year. It is fine for a ballpark and useless for tracking yourself. Skip it if you would rather not weigh in."
    },

    /* ---------------------------------------------------------------- */
    {
      id: "sex",
      label: "Sex",
      type: "choice",
      required: false,
      tests: ["cmj", "sj", "dj", "hop105"],
      choices: [
        { value: "f", label: "Female" },
        { value: "m", label: "Male" },
        { value: "", label: "Rather not say" }
      ],
      whatItBuys:
        "Makes the app smarter about when to flag your result as unusual. A 26 cm countermovement jump is a normal result for a female athlete and a low one for a male athlete, and without knowing which we have to use one wide band for everyone.",
      withoutIt:
        "Your jump height is exactly the same. We just flag fewer results as worth a second look, and occasionally flag one that was fine.",
      usedFor: "The typical range shown beside your result, and the unusually high or low warnings."
    },

    /* ---------------------------------------------------------------- */
    {
      id: "age",
      label: "Age",
      type: "number",
      min: 8, max: 90, step: 1,
      required: false,
      tests: ["cmj", "sj", "dj", "hop105"],
      placeholder: "optional",
      whatItBuys:
        "Two things. It sharpens the same unusual-result flags as above, and on the drop jump it lets us recommend a box height instead of guessing.",
      withoutIt:
        "The drop jump defaults to a 30 cm box, which is right for most adults and too high for a lot of younger athletes.",
      usedFor: "Typical ranges, and the drop jump box height recommendation."
    },

    /* ---------------------------------------------------------------- */
    {
      id: "footwear",
      label: "Shoes",
      type: "text",
      required: false,
      tests: ["cmj", "sj", "dj", "hop105"],
      placeholder: "e.g. Nike Pegasus, or barefoot",
      whatItBuys:
        "Lets the app tell you when you have changed shoes between sessions, so you do not read a shoe change as a change in you.",
      withoutIt:
        "Nothing breaks. You just have to remember it yourself, and most people do not.",
      usedFor: "The comparability check on your history."
    }
  ];

  var BY_ID = {};
  FIELDS.forEach(function (f) { BY_ID[f.id] = f; });

  /* --------------------------------------------------------------------
     Which fields would improve THIS test, and are not filled in yet.
     The app uses this to offer an upgrade at the right moment rather than
     demanding everything up front.
     -------------------------------------------------------------------- */

  function missingUpgrades(cfg, testId) {
    return FIELDS.filter(function (f) {
      if (f.required) return false;
      if (testId && f.tests.indexOf(testId) === -1) return false;
      var v = cfg ? cfg[f.id] : null;
      return v == null || v === "";
    });
  }

  function missingRequired(cfg, testId) {
    return FIELDS.filter(function (f) {
      if (!f.required) return false;
      if (testId && f.tests.indexOf(testId) === -1) return false;
      var v = cfg ? cfg[f.id] : null;
      return v == null || v === "";
    });
  }

  /* --------------------------------------------------------------------
     Typical ranges.

     These exist ONLY to decide when to say "that is worth a second look".
     They are not a score, not a grade, and the app must never present them
     as a target. A first number is a starting line.

     Sources are broad training-population figures. If you want to tighten
     them for tennis and padel specifically, this is the place, and say so in
     the note so the app can keep being honest about where it came from.
     -------------------------------------------------------------------- */

  var TYPICAL = {
    cmj: {
      m: { low: 0.30, high: 0.45 },
      f: { low: 0.22, high: 0.34 },
      unknown: { low: 0.20, high: 0.48 }
    },
    sj: {
      m: { low: 0.27, high: 0.42 },
      f: { low: 0.20, high: 0.31 },
      unknown: { low: 0.18, high: 0.45 }
    },
    dj: {   // RSI, m/s
      m: { low: 1.2, high: 2.6 },
      f: { low: 0.9, high: 2.1 },
      unknown: { low: 0.8, high: 2.8 }
    },
    hop105: {
      m: { low: 1.1, high: 2.4 },
      f: { low: 0.9, high: 2.0 },
      unknown: { low: 0.8, high: 2.6 }
    }
  };

  /**
   * Typical band for a test, narrowed by whatever the athlete has told us.
   * Returns null when we have nothing useful to say, which is better than
   * saying something vague.
   */
  function typicalRange(testId, cfg) {
    var table = TYPICAL[testId];
    if (!table) return null;

    var sex = (cfg && cfg.sex) || "unknown";
    var band = table[sex] || table.unknown;
    var specific = sex === "m" || sex === "f";

    var out = { low: band.low, high: band.high, specific: specific, adjusted: [] };
    if (specific) out.adjusted.push("sex");

    // Youth athletes jump lower, and flagging a 14 year old's normal jump as
    // "low" is both wrong and discouraging.
    var age = cfg && cfg.age;
    if (age && age < 16) {
      var factor = age <= 12 ? 0.70 : 0.85;
      out.low *= factor;
      out.high *= factor;
      out.adjusted.push("age");
    } else if (age && age >= 50) {
      out.low *= 0.80;
      out.high *= 0.85;
      out.adjusted.push("age");
    }
    return out;
  }

  /**
   * Drop jump box height, in cm. Standard practice is 30 cm for most adults,
   * lower for youth and for anyone new to it. Returns the reason too, so the
   * app can say why rather than just showing a number.
   */
  function recommendedDropHeight(cfg) {
    var age = cfg && cfg.age;
    if (age && age < 14) {
      return { cm: 20, why: "You are under 14, so we start low. The box goes up when your ground contact stays short and you are not collapsing into the landing." };
    }
    if (age && age < 17) {
      return { cm: 25, why: "Under 17, so we start a bit lower than the adult default." };
    }
    if (age && age >= 55) {
      return { cm: 20, why: "Starting low is the sensible default here. Go up only if the landing stays sharp." };
    }
    return { cm: 30, why: "30 cm is the standard starting box. Only go higher once your contact stays short and you are not sinking into the landing." };
  }

  /* --------------------------------------------------------------------
     A short, honest line about what this result would gain from more info.
     Used on the result screen. Written to be offered once, not nagged.
     -------------------------------------------------------------------- */

  function upgradeOffer(cfg, testId) {
    var missing = missingUpgrades(cfg, testId);
    if (!missing.length) return null;

    // Rank by how much they actually change the output, so the offer leads
    // with the one worth having.
    var order = ["sex", "age", "bodyMass_kg", "footwear", "name"];
    missing.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });

    return {
      fields: missing,
      lead: missing[0],
      headline: "This test can tell you a bit more",
      body: "You have not given us " + humanList(missing.map(function (f) { return f.label.toLowerCase(); })) + ". Here is what each one would add."
    };
  }

  function humanList(items) {
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + " or " + items[1];
    return items.slice(0, -1).join(", ") + " or " + items[items.length - 1];
  }

  JumpKit.athlete = {
    FIELDS: FIELDS,
    byId: function (id) { return BY_ID[id] || null; },
    fieldsFor: function (testId) {
      return FIELDS.filter(function (f) { return !testId || f.tests.indexOf(testId) !== -1; });
    },
    missingUpgrades: missingUpgrades,
    missingRequired: missingRequired,
    typicalRange: typicalRange,
    recommendedDropHeight: recommendedDropHeight,
    upgradeOffer: upgradeOffer
  };

})(typeof window !== "undefined" ? window : this);
