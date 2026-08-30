/* ============================================================================
   kit.js — the test registry, and the shape every test file must follow.

   Load this FIRST. Everything else hangs off window.JumpKit.

   ADDING A NEW TEST
   1. Copy the closest existing file in tests/ and rename it.
   2. Change every field. Do not leave another test's copy in place, the
      validator cannot catch wrong-but-well-formed prose and an athlete will
      read it.
   3. Add a <script src> line for it in jump.html, after the other tests.
   4. Reload with the console open. If the shape is wrong, this file tells you
      exactly which field and why.

   The validator is deliberately noisy. A test definition is content an athlete
   reads and maths a coach acts on, so a missing field is a bug worth
   interrupting for, not a warning worth swallowing.
   ========================================================================= */

(function (root) {
  'use strict';

  var JumpKit = root.JumpKit = root.JumpKit || {};

  JumpKit.tests = [];
  JumpKit.testsById = {};

  /* --------------------------------------------------------------------
     THE SCHEMA

     Every field below is required unless marked optional. The shape is the
     same for all four tests on purpose: it means the app can render any test
     without knowing which one it is, and it means you can diff two tests
     against each other to see where the protocols actually differ.
     -------------------------------------------------------------------- */

  var SCHEMA = {

    // --- identity ---------------------------------------------------------
    id:            'string   unique slug, used in stored records. NEVER change one after results exist, it orphans history.',
    name:          'string   full name, e.g. "Countermovement jump"',
    shortName:     'string   for chips and tight spaces, e.g. "CMJ"',
    strapline:     'string   one line, what it measures, athlete-facing',
    orderIndex:    'number   position in the test picker',

    // --- coaching content, all athlete-facing ----------------------------
    whyItMatters:  'string[] paragraphs. What quality this tests and what it is FOR. Comes BEFORE any camera button.',
    decisionItFeeds: 'string  one sentence: what changes in training because of this number. If you cannot write this, do not ship the test.',

    howToPerform:  '{setUp, cue, steps[], landing} the actual protocol, imperative, beginner-readable',
    standardise:   'string[] what must be identical between sessions',
    faults:        '[{fault, whatItDoesToTheNumber, fix, autoDetected}] the ways it goes wrong',
    reduceError:   'string[] test-specific accuracy guidance beyond the shared filming rules',

    filmingOverrides: 'object  optional. Only where this test differs from JumpKit.filming.',

    // --- measurement ------------------------------------------------------
    events:        '[{id, label, help}] the instants that must be marked on the video',
    requires:      '{minFps, needsContactTime, needsBodyMass, needsDropHeight, minValidTrials}',
    compute:       'function(trial, ctx) -> {primary, secondary[], warnings[]}',
    plausible:     'object   per-metric {warnBelow, warnAbove, blockBelow, blockAbove}',
    scoring:       '{trials, restSeconds, score, note} how a session score is formed',

    // --- provenance -------------------------------------------------------
    sources:       'string[] where the protocol and the thresholds came from'
  };

  var REQUIRED = [
    'id', 'name', 'shortName', 'strapline', 'orderIndex',
    'whyItMatters', 'decisionItFeeds', 'howToPerform', 'standardise',
    'faults', 'reduceError', 'events', 'requires', 'compute',
    'plausible', 'scoring', 'sources'
  ];

  /* --------------------------------------------------------------------
     House style checks.

     These enforce the writing rules from COACHING-PRINCIPLES.md on every
     athlete-facing string. They run in dev only (localhost / file://) so a
     style slip never breaks the live page for an athlete, but you cannot
     merge one without seeing it.
     -------------------------------------------------------------------- */

  var STYLE_RULES = [
    {
      id: 'no-em-dash',
      test: function (s) { return s.indexOf('—') === -1 && s.indexOf(' - ') === -1; },
      message: 'contains an em dash or a spaced hyphen. Use a comma. (Banned in athlete-facing copy, 2026-07-30.)'
    },
    {
      id: 'no-semicolon',
      test: function (s) { return s.indexOf(';') === -1; },
      message: 'contains a semicolon. Split the sentence or use a comma.'
    },
    {
      id: 'no-corporate-filler',
      test: function (s) {
        return !/\b(moreover|furthermore|additionally|let'?s dive|utilise|leverage|holistic)\b/i.test(s);
      },
      message: 'contains filler that does not sound like a coach typing on his phone.'
    },
    {
      id: 'no-hedging',
      test: function (s) {
        return !/\b(arguably|some might say|it could be argued)\b/i.test(s);
      },
      message: 'hedges. Be a coach, not a committee.'
    }
  ];

  function isDev() {
    return root.location && (
      root.location.protocol === 'file:' ||
      /^(localhost|127\.0\.0\.1|\[::1\])$/.test(root.location.hostname)
    );
  }

  function walkStrings(value, path, visit) {
    if (typeof value === 'string') { visit(value, path); return; }
    if (Array.isArray(value)) {
      value.forEach(function (v, i) { walkStrings(v, path + '[' + i + ']', visit); });
      return;
    }
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(function (k) {
        if (k === 'sources' || k === 'id' || k === 'compute') return; // provenance and code are exempt
        walkStrings(value[k], path + '.' + k, visit);
      });
    }
  }

  function checkStyle(def) {
    var issues = [];
    var prose = {
      whyItMatters: def.whyItMatters,
      decisionItFeeds: def.decisionItFeeds,
      howToPerform: def.howToPerform,
      standardise: def.standardise,
      faults: def.faults,
      reduceError: def.reduceError,
      events: def.events
    };
    walkStrings(prose, def.id, function (s, path) {
      STYLE_RULES.forEach(function (rule) {
        if (!rule.test(s)) {
          issues.push(path + ' ' + rule.message + '\n    "' + s.slice(0, 90) + '"');
        }
      });
    });
    return issues;
  }

  /* --------------------------------------------------------------------
     Registration
     -------------------------------------------------------------------- */

  function registerTest(def) {
    var problems = [];

    REQUIRED.forEach(function (key) {
      if (def[key] === undefined || def[key] === null) {
        problems.push('missing required field "' + key + '" — ' + SCHEMA[key]);
      }
    });

    if (def.id && JumpKit.testsById[def.id]) {
      problems.push('duplicate id "' + def.id + '". Ids are permanent, stored results point at them.');
    }
    if (typeof def.compute !== 'function') {
      problems.push('"compute" must be a function(trial, ctx).');
    }
    if (def.howToPerform && !def.howToPerform.cue) {
      problems.push('"howToPerform.cue" is missing. The exact wording of the cue changes the test, so it is not optional.');
    }
    if (Array.isArray(def.events) && def.events.length < 2) {
      problems.push('"events" needs at least a takeoff and a landing.');
    }

    if (problems.length) {
      console.error(
        '[JumpKit] Test "' + (def.id || '(no id)') + '" was NOT registered:\n  - ' +
        problems.join('\n  - ')
      );
      return null;
    }

    if (isDev()) {
      var style = checkStyle(def);
      if (style.length) {
        console.warn(
          '[JumpKit] House style issues in "' + def.id + '" (dev only, page still works):\n  - ' +
          style.join('\n  - ')
        );
      }
    }

    JumpKit.tests.push(def);
    JumpKit.testsById[def.id] = def;
    JumpKit.tests.sort(function (a, b) { return a.orderIndex - b.orderIndex; });
    return def;
  }

  function getTest(id) {
    return JumpKit.testsById[id] || null;
  }

  JumpKit.SCHEMA = SCHEMA;
  JumpKit.registerTest = registerTest;
  JumpKit.getTest = getTest;

})(typeof window !== 'undefined' ? window : this);
