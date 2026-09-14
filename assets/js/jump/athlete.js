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
      tests: ["cmj"],
      choices: [
        { value: "f", label: "Female" },
        { value: "m", label: "Male" },
        { value: "", label: "Rather not say" }
      ],
      whatItBuys:
        "Lets us show where your countermovement jump sits against tennis players of your sex and age. Boys and girls jump about the same until 12 or 13, then boys pull ahead, so one range for everyone would mislead you.",
      withoutIt:
        "Your jump height is exactly the same. We just can't show where it sits.",
      usedFor: "The reference range beside your countermovement jump, from German squad tennis players."
    },

    /* ---------------------------------------------------------------- */
    {
      id: "age",
      label: "Age",
      type: "number",
      min: 8, max: 90, step: 1,
      required: false,
      tests: ["cmj", "sj", "dj"],
      placeholder: "optional",
      whatItBuys:
        "It tells History how big a change has to be before it counts as real, because younger and older athletes wobble by different amounts. It also picks the reference range for your countermovement jump and the right drop jump box height.",
      withoutIt:
        "History judges changes by the size of your jump instead. There's no reference range, and the drop jump starts you on a 30 cm box, which is too high for a lot of younger athletes.",
      usedFor: "The real change rule in History, the reference range and the drop jump box height."
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
     The reference range beside a countermovement jump.

     Context, never a target and never a grade. A first number is a
     starting line. What matters is the athlete's own number moving, and
     History decides when it has.

     SOURCE
     German Tennis Federation (DTB), "Normwerte DTB-Konditionstest",
     updated 5 September 2025, linked from the DTB test manuals:
     https://docs.google.com/spreadsheets/d/1ZjKadqPJkhCQ6QhOtIzkSTke50Prfnky6bkNOyw5smA
     Tabs "Normwerte nach kalendarischem Alter" (boys) and "Tabellenblatt6"
     (girls), column "C-Movement Jump [cm]". Regional and national junior
     squad players on a contact mat, flight time, hands on hips, best of 2
     scored jumps, so the same method as this app. 54 to 507 players per
     class. Every P20 and P80 below was read out of that file on 2026-09-14
     and matched the research copy exactly.

     WHAT IS SHOWN
     P20 to P80 for the athlete's sex and age, the middle 60% of squad
     players, and it says squad players, because that's a high bar for a club
     player. A whole-year age averages the two half-year classes. Age 9 uses
     the under 10 class and says it's rough. 18 to 21 use the over 18 class.
     Nothing under 9 or over 21. Nothing for the squat jump, drop jump or
     10-5, because none of them has a source. Amir chose this on 2026-09-14,
     replacing ranges that had no source at all.
     -------------------------------------------------------------------- */

  // [class start age, P20 cm, P80 cm]. 9 is the "under 10" class, 18 is "over 18".
  var DTB_CMJ = {
    m: [
      [9, 23.1, 29.3], [10, 24.2, 30.7], [10.5, 24.8, 31.4], [11, 25.7, 32.2], [11.5, 26.9, 33.1],
      [12, 27.6, 33.8], [12.5, 28.6, 35.0], [13, 29.8, 36.0], [13.5, 30.9, 37.8], [14, 32.3, 39.0],
      [14.5, 33.9, 41.0], [15, 34.8, 42.4], [15.5, 35.9, 43.6], [16, 37.2, 44.1], [16.5, 37.5, 45.2],
      [17, 38.2, 45.8], [17.5, 38.0, 45.9], [18, 39.7, 47.6]
    ],
    f: [
      [9, 22.9, 30.3], [10, 24.2, 30.7], [10.5, 23.9, 31.0], [11, 24.9, 31.3], [11.5, 26.7, 32.9],
      [12, 27.1, 33.4], [12.5, 28.4, 34.2], [13, 28.6, 34.3], [13.5, 29.2, 35.1], [14, 29.4, 35.5],
      [14.5, 29.4, 35.8], [15, 29.1, 36.0], [15.5, 29.4, 36.6], [16, 29.7, 36.3], [16.5, 30.3, 37.9],
      [17, 29.4, 36.9], [17.5, 30.1, 36.8], [18, 30.0, 38.1]
    ]
  };
  var DTB_MIN_AGE = 9;
  var DTB_MAX_AGE = 21;

  function dtbClass(table, start) {
    for (var i = 0; i < table.length; i++) if (table[i][0] === start) return table[i];
    return null;
  }

  /**
   * Where a result sits against a reference group.
   * null when this test has no reference at all. { none: why } when it has
   * one but can't place this athlete: "sex" or "age" when we weren't told,
   * "young" under 9, "adult" over 21. Otherwise
   *   { low, high, rough, group }     low and high in metres
   */
  function referenceRange(testId, cfg) {
    if (testId !== "cmj") return null;
    var sex = cfg && cfg.sex;
    var age = cfg && cfg.age != null && cfg.age !== "" ? +cfg.age : null;
    if (sex !== "m" && sex !== "f") return { none: "sex" };
    if (age == null || !isFinite(age)) return { none: "age" };
    if (age < DTB_MIN_AGE) return { none: "young" };
    if (age >= DTB_MAX_AGE + 1) return { none: "adult" };

    var table = DTB_CMJ[sex];
    var rows;
    if (age < 10) rows = [dtbClass(table, 9)];
    else if (age >= 18) rows = [dtbClass(table, 18)];
    else if (Math.floor(age) === age) rows = [dtbClass(table, age), dtbClass(table, age + 0.5)];
    else rows = [dtbClass(table, Math.floor(age * 2) / 2)];

    var low = 0, high = 0;
    rows.forEach(function (r) { low += r[1]; high += r[2]; });
    return {
      low: Math.round(low / rows.length * 10) / 1000,
      high: Math.round(high / rows.length * 10) / 1000,
      rough: age < 10,
      group: "German squad tennis players"
    };
  }

  /**
   * The old shape, kept so a jump.html cached on a phone from before
   * 2026-09-14 still works if it loads this file. New code uses
   * referenceRange.
   */
  function typicalRange(testId, cfg) {
    var r = referenceRange(testId, cfg);
    if (!r || r.none) return null;
    return { low: r.low, high: r.high, specific: true, adjusted: ["sex", "age"] };
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
    referenceRange: referenceRange,
    typicalRange: typicalRange,
    recommendedDropHeight: recommendedDropHeight,
    upgradeOffer: upgradeOffer
  };

})(typeof window !== "undefined" ? window : this);
