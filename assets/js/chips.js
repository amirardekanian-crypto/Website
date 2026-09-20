/* ═══════════════════════════════════════════════════════════════════════════
   chips.js — the single source of truth for exercise chip semantics.

   Sets and reps are not fields. They are free-text labels in `exercise.chips[]`
   that program.html pattern-matches at render time into five stat cells:
   SETS · REPS · RPE · TEMPO · REST. Anything that matches nothing becomes a
   green modifier pill next to the exercise name.

   That makes the label formatting load-bearing. Write "4 Each Side" instead of
   "×4 Each Side" and it still lands in REPS, but write "12 each" and it silently
   becomes a green pill with an empty REPS cell — the bug SCHEMA.md calls the
   "4 Each Side-as-green-pill bug".

   The READ half (parseChips / isPureDuration / parseDurationToSec) is a verbatim
   copy of program.html's implementation — behaviour must stay identical or the
   coach editor and the athlete app disagree about what a programme says.
   chips-selftest.html asserts that equivalence against the real programme files.

   The WRITE half (readStats / applyStats) is new: it lets coach.html edit a
   prescription through real fields and emit correctly-formatted labels, so a
   malformed chip becomes unproducible rather than merely discouraged.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── READ (mirrors program.html — keep in sync) ────────────────────────── */

  // Convert a duration string into seconds. "2 min", "2m", "90 sec", "2:30".
  function parseDurationToSec(text) {
    const t = String(text || '').trim().toLowerCase();
    let m;
    m = t.match(/^(\d+):(\d{1,2})$/);
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    m = t.match(/^(\d+)\s*m(?:in|inutes?)?\b/);
    if (m) return parseInt(m[1], 10) * 60;
    m = t.match(/^(\d+)\s*s(?:ec|econds?)?\b/);
    if (m) return parseInt(m[1], 10);
    m = t.match(/^(\d+)$/);
    if (m) return parseInt(m[1], 10);
    return 0;
  }

  // Strict duration check: plain time labels only, NOT compound ones like
  // "30s Hard RPE 6-7" (those stay in extras as descriptors).
  function isPureDuration(label) {
    const t = String(label || '').trim();
    if (/^\d+:\d+$/.test(t)) return true;
    return /^\d+\s*(s(?:ec(?:onds?)?)?|m(?:in(?:utes?)?)?)\s*(?:\/?\s*(?:side|leg|arm|hand)s?|each(?:\s+\w+)?)?$/i.test(t);
  }

  function parseChips(chips) {
    const out = { sets: '', reps: '', target: '', tempo: '', rest: 0, extras: [] };
    (chips || []).forEach(c => {
      const label = (c.label || '').trim();
      let m;
      m = label.match(/^rest\s+(.+)/i);
      if (m) {
        const secs = parseDurationToSec(m[1]);
        if (secs && secs > 0) { out.rest = secs; return; }
      }
      m = label.match(/^(\d+)\s*sets?\b/i);
      if (m) { out.sets = m[1]; return; }
      m = label.match(/^tempo\s+(.+)/i);
      if (m) { out.tempo = m[1].trim(); return; }
      m = label.match(/^rpe\s+(.+)/i);
      if (m) { out.target = '@' + m[1].trim(); return; }
      if (/^@/.test(label)) { out.target = label; return; }
      if (/^×/.test(label)) { out.reps = label.replace(/^×/, '').replace(/\s*reps?$/i, '').trim(); return; }
      if (/reps?$/i.test(label)) { out.reps = label.replace(/\s*reps?$/i, '').trim(); return; }
      if (/^\d+(?:\s*[-–]\s*\d+)?\s+each\s+(?:side|leg|arm|hand)s?$/i.test(label)) { out.reps = label; return; }
      if (/^\d+(?:\s*[-–]\s*\d+)?\s*(?:reps?|lengths?|steps?|throws?|balls?)?\s*(?:\/\s*(?:side|leg|arm|hand|direction|shape|way)|each\s+(?:side|leg|arm|hand|direction|way))s?$/i.test(label)) { out.reps = label; return; }
      if (/^\d+\s*(?:lengths?|steps?|throws?|balls?)$/i.test(label)) { out.reps = label; return; }
      if (/^\d+(?:\s*\/\s*\d+)+\s*reps?(?:\s*\/\s*(?:side|leg|arm|hand))?$/i.test(label)) { out.reps = label; return; }
      if (/^\d+(?:\s*[-–]\s*\d+)?$/.test(label)) { out.reps = label; return; }
      out.extras.push({ label, style: c.style || '' });
    });

    if (!out.reps) {
      for (let i = 0; i < out.extras.length; i++) {
        if (isPureDuration(out.extras[i].label)) {
          out.reps = out.extras[i].label;
          out.extras.splice(i, 1);
          break;
        }
      }
    }
    return out;
  }

  /* ── SLOT ROUTING ──────────────────────────────────────────────────────── */

  // Which stat slot does this single label feed? Mirrors parseChips' branch
  // order exactly — order matters, "3 Sets" must be tested before the bare-number
  // rule or it would land in REPS. Returns '' for a modifier pill.
  // NOTE: duration promotion is deliberately NOT applied here; it depends on
  // whether any other chip supplied reps, which is an array-level decision.
  function slotOf(label) {
    const t = String(label || '').trim();
    let m = t.match(/^rest\s+(.+)/i);
    if (m && parseDurationToSec(m[1]) > 0) return 'rest';
    if (/^(\d+)\s*sets?\b/i.test(t)) return 'sets';
    if (/^tempo\s+(.+)/i.test(t)) return 'tempo';
    if (/^rpe\s+(.+)/i.test(t)) return 'target';
    if (/^@/.test(t)) return 'target';
    if (/^×/.test(t)) return 'reps';
    if (/reps?$/i.test(t)) return 'reps';
    if (/^\d+(?:\s*[-–]\s*\d+)?\s+each\s+(?:side|leg|arm|hand)s?$/i.test(t)) return 'reps';
    if (/^\d+(?:\s*[-–]\s*\d+)?\s*(?:reps?|lengths?|steps?|throws?|balls?)?\s*(?:\/\s*(?:side|leg|arm|hand|direction|shape|way)|each\s+(?:side|leg|arm|hand|direction|way))s?$/i.test(t)) return 'reps';
    if (/^\d+\s*(?:lengths?|steps?|throws?|balls?)$/i.test(t)) return 'reps';
    if (/^\d+(?:\s*\/\s*\d+)+\s*reps?(?:\s*\/\s*(?:side|leg|arm|hand))?$/i.test(t)) return 'reps';
    if (/^\d+(?:\s*[-–]\s*\d+)?$/.test(t)) return 'reps';
    return '';
  }

  /* ── FORMAT ────────────────────────────────────────────────────────────── */

  const fmt = {
    sets:  v => String(v).trim().replace(/\s*sets?$/i, '') + ' Sets',
    // A bare count takes the " Reps" suffix ("×8 Reps"); anything carrying its own
    // qualifier or unit does not ("×10 Each Side", "×30s", "×40m").
    reps:  v => {
      const raw = String(v).trim().replace(/^×/, '').replace(/\s*reps?$/i, '').trim();
      return '×' + raw + (/^\d+(?:\s*[-–]\s*\d+)?$/.test(raw) ? ' Reps' : '');
    },
    target: v => 'RPE ' + String(v).trim().replace(/^@/, '').replace(/^rpe\s+/i, ''),
    tempo:  v => 'Tempo ' + String(v).trim().replace(/^tempo\s+/i, ''),
    rest:   secs => {
      const s = Math.max(0, Math.round(Number(secs) || 0));
      return 'Rest ' + (s % 60 === 0 && s >= 60 ? (s / 60) + ' min' : s + ' sec');
    }
  };

  // Index of the chip that actually feeds REPS. parseChips has two routes into
  // that slot: a chip matching a reps pattern, or — when none does — the first
  // pure-duration modifier, promoted. An editor that only looked for the first
  // would append a duplicate "×5 min" beside the existing "5 min" pill.
  function repsChipIndex(chips) {
    const list = chips || [];
    const direct = list.findIndex(c => slotOf(c.label) === 'reps');
    if (direct >= 0) return direct;
    return list.findIndex(c => !slotOf(c.label) && isPureDuration(c.label));
  }

  /* ── READ AN EXERCISE ──────────────────────────────────────────────────── */

  // Everything the editor needs to render one exercise's fields, including the
  // three-way rest resolution program.html uses:
  //   explicit ex.restSec → "Rest X" chip → 120s default for standard, else 0.
  function readStats(ex) {
    ex = ex || {};
    const p = parseChips(ex.chips);
    const isStandard = ex.type === 'standard';
    const explicit = (typeof ex.restSec === 'number' && ex.restSec > 0);
    return {
      sets:   p.sets,
      reps:   p.reps,
      rpe:    p.target.replace(/^@/, ''),
      tempo:  p.tempo,
      restSec: explicit ? ex.restSec : (p.rest > 0 ? p.rest : (isStandard ? 120 : 0)),
      restSource: explicit ? 'field' : (p.rest > 0 ? 'chip' : 'default'),
      modifiers: p.extras.slice()
    };
  }

  /* ── WRITE AN EXERCISE ─────────────────────────────────────────────────── */

  // Return a NEW exercise with `patch` applied. Chips are edited surgically:
  // the chip already feeding a slot is rewritten in place, keeping its position
  // and `style`, so an edit produces a minimal diff rather than a reshuffled
  // array. A slot set to '' or null removes its chip. A new slot appends.
  //
  // patch keys: sets, reps, rpe, tempo, restSec (numbers or strings; '' clears).
  function applyStats(ex, patch) {
    const next = Object.assign({}, ex);
    const chips = (ex.chips || []).map(c => Object.assign({}, c));
    patch = patch || {};

    const SLOTS = { sets: 'sets', reps: 'reps', rpe: 'target', tempo: 'tempo' };

    Object.keys(SLOTS).forEach(key => {
      if (!(key in patch)) return;
      const slot = SLOTS[key];
      const val = patch[key];
      const cleared = val === '' || val === null || val === undefined;
      const idx = slot === 'reps'
        ? repsChipIndex(chips)
        : chips.findIndex(c => slotOf(c.label) === slot);

      if (cleared) { if (idx >= 0) chips.splice(idx, 1); return; }

      // A promoted bare duration ("5 min") keeps its bare form as long as the new
      // value is still a duration — rewriting it to "×5 min" would be a pointless
      // diff on 25 existing exercises. Anything else takes the canonical format.
      const promoted = idx >= 0 && !slotOf(chips[idx].label);
      const label = (slot === 'reps' && promoted && isPureDuration(String(val).trim()))
        ? String(val).trim()
        : fmt[slot](val);

      if (idx >= 0) chips[idx].label = label;
      else chips.push({ label });
    });

    // Rest writes back to whichever source currently supplies it, so an exercise
    // using an explicit restSec field keeps using one and a "Rest X" chip stays
    // a chip. Neither present → set the field, which has the higher priority.
    if ('restSec' in patch) {
      const secs = Number(patch.restSec) || 0;
      const chipIdx = chips.findIndex(c => slotOf(c.label) === 'rest');
      const usesField = (typeof ex.restSec === 'number' && ex.restSec > 0);

      if (secs <= 0) {
        if (chipIdx >= 0) chips.splice(chipIdx, 1);
        delete next.restSec;
      } else if (chipIdx >= 0 && !usesField) {
        chips[chipIdx].label = fmt.rest(secs);
      } else {
        next.restSec = secs;
        if (chipIdx >= 0) chips.splice(chipIdx, 1);   // avoid two sources disagreeing
      }
    }

    next.chips = chips;
    return next;
  }

  /* ── AUDIT ─────────────────────────────────────────────────────────────── */

  // Report chips that parse in a way the coach probably did not intend. These
  // are the failure modes SCHEMA.md documents; the editor should surface them
  // and refuse to create new ones.
  function audit(ex) {
    ex = ex || {};
    const chips = ex.chips || [];
    const p = parseChips(chips);
    const problems = [];

    // The documented green-pill bug is specifically a dose stranded in a modifier
    // *while the REPS cell is empty*. With reps present, a numeric modifier is a
    // legitimate technique cue — "3s eccentric" and "1s squeeze" are SCHEMA.md's
    // own examples, and flagging those buries the real findings in noise.
    if (!p.reps) {
      p.extras.forEach(x => {
        if (/\d/.test(x.label)) {
          problems.push({ level: 'warn', code: 'dose-in-modifier', label: x.label,
            msg: 'No reps on this exercise, and this chip carries a number — it renders as a green pill with an empty REPS cell.' });
        }
      });
    }

    // Rounds belong to a circuit's `rounds` field. On a standard/simple exercise
    // the label just becomes a pill and no round count reaches the app.
    p.extras.forEach(x => {
      if (/^\d+\s*rounds?\b/i.test(x.label)) {
        problems.push({ level: 'warn', code: 'rounds-outside-circuit', label: x.label,
          msg: 'Round counts belong to a circuit, not a chip — this renders as a plain pill.' });
      }
    });

    // Two chips competing for one slot: parseChips keeps the last, silently.
    const seen = {};
    chips.forEach(c => {
      const s = slotOf(c.label);
      if (!s) return;
      if (seen[s]) {
        problems.push({ level: 'warn', code: 'duplicate-slot', label: c.label,
          msg: 'Second "' + s + '" chip — the earlier one ("' + seen[s] + '") is silently ignored.' });
      }
      seen[s] = c.label;
    });

    if (ex.type === 'standard') {
      // Only a real rep count needs a set count. A duration ("5 min" on a bike)
      // legitimately stands alone, so don't flag cardio.
      if (p.reps && !p.sets && /^\d+(?:\s*[-–]\s*\d+)?$/.test(p.reps)) {
        problems.push({ level: 'warn', code: 'reps-without-sets', label: p.reps,
          msg: 'A rep count with no set count — the SETS cell shows a dash.' });
      }
      chips.forEach(c => {
        if (/superset/i.test(c.label)) {
          problems.push({ level: 'warn', code: 'superset-chip', label: c.label,
            msg: 'A superset is a circuit, not a chip on a standard exercise.' });
        }
      });
    }

    // The app's RPE selector runs 6–10; anything below 6 cannot be logged against.
    if (p.target) {
      const low = parseInt(p.target.replace(/^@/, ''), 10);
      if (!isNaN(low) && low < 6) {
        problems.push({ level: 'warn', code: 'rpe-below-floor', label: p.target,
          msg: 'RPE below 6 — the selector floor is 6, so this cannot be logged.' });
      }
    }

    return problems;
  }

  /* ═══ rx — THE STRUCTURED PRESCRIPTION (2026-09-20) ═══════════════════════
     Everything above this line treats a prescription as display strings and
     pattern-matches them back into numbers at render time. That is what made
     the notation drift (277 distinct chip labels across 34 programmes for six
     real fields), what forced every exercise into the same five-cell grid, and
     what put a duration in a cell labelled REPS.

     `ex.rx` replaces it. It is plain data, it is authored directly, and the
     only rule is: WRITE WHAT YOU PRESCRIBED, OMIT WHAT YOU DID NOT.

       rx.sets      number                      omit for a single-effort/prep item
       rx.reps      number | "8-10"          ─┐
       rx.time      "30s" | "5 min"           ├─ exactly ONE of these three
       rx.distance  "20m" | "400m"           ─┘
       rx.side      true                        the dose is per side
       rx.rpe       number | "6-7"              omit when effort is not graded
       rx.tempo     "3-1-1-0" | "iso"           omit for ballistic / carries / prep
       rx.rest      seconds                     omit and NOTHING is invented
       rx.rounds    number                      circuits only
       rx.work      "40s on / 20s off"          intervals only
       rx.label     "Hold"                      optional one-word dose-cell override
     and beside it, on the exercise itself — FOUR fields, four meanings, four
     looks, which is what stopped the pill row being a junk drawer of 121 labels:
       ex.setup     "neutral grip"              equipment / position → quiet grey line
       ex.intent    "max intent"                ONE coaching intention → the green pill
       ex.note      "start shallow…"            the coach's note   → clay callout
       ex.cues      {good:[…], bad:[…]}         technique         → the cues list

     rxOf() is the ONLY thing renderers should call. It reads `ex.rx` when it is
     there and falls back to parsing legacy chips when it is not, so an exercise
     that has never been migrated keeps rendering exactly as it always did.
     ═══════════════════════════════════════════════════════════════════════ */

  // Dose-cell labels. The label names what the number IS — which is the whole
  // point of the change: "5 min" used to sit under a cell labelled REPS.
  const DOSE_LABEL = { reps: 'Reps', time: 'Time', distance: 'Distance', work: 'Work' };

  function cleanStr(v) {
    const s = (v === null || v === undefined) ? '' : String(v).trim();
    return s ? s : null;
  }

  // The tempo in ONE cell, as the notation coaches write — with the digit that
  // carries the instruction picked out in clay.
  //
  // Which digit matters: the SLOWEST phase, when it is 2s or more, plus any
  // non-zero PAUSE (a pause is never accidental). So "3-0-1-0" highlights the 3,
  // "2-1-1-0" highlights the 2 and the 1, and "1-0-1-0" — a tempo asking for
  // nothing in particular — highlights nothing.
  //
  // It took four tries to land here: a plain cell (notation athletes did not
  // decode, hence 153 hand-written "3s eccentric" pills), a grey line under the
  // grid (read as a footnote), phase cells (Amir: "i dont like the new tempo"),
  // and now the plain cell again with the point of it coloured.
  //
  // `html` is built from PARSED NUMBERS, never the raw string, so nothing from
  // the data reaches the page unescaped. An unparseable tempo falls back to
  // escaped text with no highlight.
  function tempoDisplay(tempo) {
    const t = cleanStr(tempo);
    if (!t) return null;
    if (/^iso$/i.test(t)) return { text: 'Hold', html: 'Hold' };
    const parts = t.split(/[-–]/).map(x => parseFloat(x));
    if (parts.length < 3 || parts.length > 4 || parts.some(isNaN)) {
      return { text: t, html: escHtml(t) };
    }
    const max = Math.max.apply(null, parts);
    const hot = i => (parts[i] === max && max >= 2) || ((i === 1 || i === 3) && parts[i] > 0);
    return {
      text: parts.join('-'),
      html: parts.map((n, i) => hot(i) ? '<span class="t-hot">' + n + '</span>' : String(n)).join('-')
    };
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  }

  // Normalised, display-ready view of one exercise's prescription.
  // Every field is either a real value or null — never a placeholder, because a
  // placeholder is exactly what the renderer used to turn into an em-dash.
  function rxOf(ex) {
    ex = ex || {};
    const out = {
      sets: null, dose: null, rpe: null, tempo: null, rest: null, rounds: null,
      setup: cleanStr(ex.setup), intent: cleanStr(ex.intent), extras: [], source: 'rx'
    };

    const rx = ex.rx;
    if (rx && typeof rx === 'object') {
      out.sets   = (rx.sets   === 0 || rx.sets)   ? String(rx.sets).trim()  : null;
      out.rounds = (rx.rounds === 0 || rx.rounds) ? String(rx.rounds).trim(): null;
      out.rpe    = cleanStr(rx.rpe);
      out.tempo  = cleanStr(rx.tempo);
      out.rest   = (typeof rx.rest === 'number' && rx.rest > 0)
        ? rx.rest
        : (cleanStr(rx.rest) ? parseDurationToSec(rx.rest) || null : null);

      // Exactly one dose. Checked in priority order so a file carrying two by
      // mistake renders deterministically rather than differently per device.
      const kind = cleanStr(rx.reps) ? 'reps'
                 : cleanStr(rx.time) ? 'time'
                 : cleanStr(rx.distance) ? 'distance'
                 : cleanStr(rx.work) ? 'work' : null;
      if (kind) {
        out.dose = {
          kind: kind,
          value: cleanStr(rx[kind]),
          side: rx.side === true,
          label: cleanStr(rx.label) || DOSE_LABEL[kind]
        };
      }
      return out;
    }

    /* ── legacy fallback: an exercise that still carries chips[] ──────────── */
    const p = parseChips(ex.chips);
    out.source = 'chips';
    out.sets  = p.sets || null;
    out.rpe   = p.target ? p.target.replace(/^@/, '') : null;
    out.tempo = p.tempo || null;
    out.rounds = cleanStr(ex.rounds);
    out.extras = p.extras.slice();
    out.rest = (typeof ex.restSec === 'number' && ex.restSec > 0)
      ? ex.restSec
      : (p.rest > 0 ? p.rest : null);
    if (p.reps) {
      // Recover what the old REPS cell was really holding. A duration or a
      // distance stuffed in there gets its own label back.
      const raw = p.reps;
      const side = /(\/\s*|each\s+)(side|leg|arm|hand|direction|way)/i.test(raw);
      // Strip the side marker AND a trailing "Reps" — "10 Reps / side" must become
      // the value 10 under a label that already says REPS / SIDE, not "10 Reps".
      const bare = raw
        .replace(/\s*(\/\s*|each\s+)(side|leg|arm|hand|direction|way)s?\s*$/i, '')
        .replace(/\s*reps?$/i, '')
        .trim();
      // DISTANCE IS TESTED FIRST. isPureDuration() reads a bare "m" as minutes, so
      // "20 m" — a 20-metre sprint or carry — would otherwise be labelled TIME and
      // read as twenty minutes. "5 min" still parses as time: "min" is not "m".
      const kind = /^\d+(?:\.\d+)?\s*(m|km|yd|metres?|meters?)$/i.test(bare) ? 'distance'
                 : isPureDuration(bare) ? 'time'
                 : 'reps';
      out.dose = { kind: kind, value: bare || raw, side: side, label: DOSE_LABEL[kind] };
    }
    return out;
  }

  // Does this exercise prescribe a countable rep? Holds, carries and intervals
  // do not, which is what keeps them off the Ceiling and out of the rep log.
  function repCount(ex) {
    const r = rxOf(ex);
    if (!r.dose || r.dose.kind !== 'reps') return null;
    const m = String(r.dose.value).match(/\d+(?:\.\d+)?/);   // a range takes its LOW end
    const n = m ? parseFloat(m[0]) : NaN;
    return n > 0 ? n : null;
  }

  /* ── WRITE ─────────────────────────────────────────────────────────────── */

  // Return a NEW exercise with `patch` merged into its rx. A key set to '' or
  // null is REMOVED rather than blanked — an absent field is the whole contract,
  // so there must be no way to store an empty one. Setting any dose clears the
  // other two, because "exactly one dose" is an invariant and not a convention.
  function applyRx(ex, patch) {
    const next = Object.assign({}, ex);
    const rx = Object.assign({}, ex && ex.rx);
    patch = patch || {};
    const DOSE = ['reps', 'time', 'distance', 'work'];

    Object.keys(patch).forEach(k => {
      const v = patch[k];
      const cleared = v === '' || v === null || v === undefined || v === false;
      if (cleared) { delete rx[k]; return; }
      if (DOSE.indexOf(k) >= 0) DOSE.forEach(d => { if (d !== k) delete rx[d]; });
      if (k === 'rest' || k === 'sets' || k === 'rounds') {
        const n = (k === 'rest' && typeof v === 'string') ? parseDurationToSec(v) : Number(v);
        if (n > 0) rx[k] = n; else delete rx[k];
        return;
      }
      rx[k] = (k === 'side') ? true : (typeof v === 'number' ? v : String(v).trim());
    });

    if ('setup'  in patch) { const v = cleanStr(patch.setup);  if (v) next.setup  = v; else delete next.setup; }
    if ('intent' in patch) { const v = cleanStr(patch.intent); if (v) next.intent = v; else delete next.intent; }

    next.rx = rx;
    delete next.chips;      // one source of truth, or it is the old bug again
    delete next.restSec;    // rest lives in rx.rest now
    return next;
  }

  // Convert one legacy exercise to rx. Used by scripts/migrate_rx.py's JS twin
  // and by the coach editor the first time it saves an unmigrated exercise.
  //
  // The leftover green pills are triaged, not dumped: a pill that merely restates
  // the tempo is DROPPED when a tempo cell already says it (153 cards were
  // carrying that duplicate), and anything else becomes the `setup` line — which
  // is where "neutral grip" and "45° bench" always belonged.
  const TEMPO_WORDS = /(eccentric|squeeze|hold|pause|lower|slow|controlled|stretch|return|tempo)/i;

  // What reads as an INTENTION rather than a condition. "max speed" on a sprint
  // is the point of the exercise and has to stay loud; "neutral grip" is a
  // condition and belongs in quiet text. Anything not matched here goes to setup,
  // which is the safe direction to be wrong in.
  const INTENT_WORDS = /^(max |fast |explosive|stick |stick$|drive |quiet |minimal ground|snap |punch |build |accelerat|attack)/i;

  function toRx(ex) {
    const r = rxOf(ex);
    if (r.source === 'rx') return Object.assign({}, ex);
    const rx = {};
    if (r.sets)   rx.sets   = Number(r.sets) || r.sets;
    if (r.rounds) rx.rounds = Number(r.rounds) || r.rounds;
    if (r.dose)   { rx[r.dose.kind] = numIfPlain(r.dose.value); if (r.dose.side) rx.side = true; }
    if (r.rpe)    rx.rpe    = numIfPlain(r.rpe);
    if (r.tempo)  rx.tempo  = r.tempo;
    if (r.rest)   rx.rest   = r.rest;

    // A pill that only restates the tempo is DROPPED when a tempo cell already
    // says it — 153 cards were carrying that exact duplicate. Everything else is
    // sorted into the one field that matches what it actually is.
    const keep = r.extras
      .map(x => x.label)
      .filter(l => !(rx.tempo && TEMPO_WORDS.test(l)));

    const intents = keep.filter(l => INTENT_WORDS.test(l));
    const rest    = keep.filter(l => !INTENT_WORDS.test(l));

    // An exercise with no countable dose — "Start the Run", "Empty Bar Warm-Up
    // Sets" — gets NO rx at all rather than an empty one. Its instruction lives
    // in setup/cues, and an empty object would only be a slot for a future bug.
    const next = Object.assign({}, ex);
    if (Object.keys(rx).length) next.rx = rx; else delete next.rx;
    const intent = ex.intent || intents[0] || '';
    const setup = [ex.setup].concat(intents.slice(1), rest).filter(Boolean).join(' · ');
    if (intent) next.intent = intent; else delete next.intent;
    if (setup)  next.setup  = setup;  else delete next.setup;
    delete next.chips;
    delete next.restSec;
    return next;
  }

  // Convert one circuit: the rounds string ("×2 Rounds") to a number, the rest to
  // rx.rest, and each item's free-text `detail` to its own rx WHERE IT PARSES
  // CLEANLY. A detail like "20 seconds, alternating" carries a dose AND a
  // qualifier; only the unambiguous ones are converted, and anything else keeps
  // its `detail` untouched — losing a coach's wording to a tidier shape is a bad
  // trade, and rxOf() reads both.
  function circuitToRx(ex) {
    const next = Object.assign({}, ex);
    const rx = Object.assign({}, ex.rx);

    if (!rx.rounds) {
      const m = String(ex.rounds || '').match(/(\d+)/);
      if (m) rx.rounds = parseInt(m[1], 10);
    }
    if (!rx.rest) {
      const chipRest = parseChips(ex.chips).rest;
      const rest = (typeof ex.restSec === 'number' && ex.restSec > 0) ? ex.restSec : chipRest;
      if (rest > 0) rx.rest = rest;
    }
    if (Object.keys(rx).length) next.rx = rx;
    if (rx.rounds) delete next.rounds;     // one source, or the cell can disagree
    delete next.restSec;
    delete next.chips;

    next.items = (ex.items || []).map(it => {
      if (it.rx) return it;
      const d = cleanStr(it.detail);
      if (!d) return it;
      const parsed = detailToRx(d);
      if (!parsed) return it;              // keep the coach's wording as-is
      const o = Object.assign({}, it, { rx: parsed });
      delete o.detail;
      return o;
    });
    return next;
  }

  // The unambiguous circuit-item doses only: "×12", "12 reps", "30 sec",
  // "20 m", each optionally per side. Anything with a comma, a conjunction or
  // trailing prose is deliberately refused.
  function detailToRx(text) {
    let t = String(text).trim();
    if (/[,;]| and | then |alternat|switch|each round/i.test(t)) return null;
    let side = false;
    const sideRe = /\s*(?:\/\s*|each\s+)(?:side|leg|arm|hand|direction|way)s?\s*$/i;
    if (sideRe.test(t)) { side = true; t = t.replace(sideRe, '').trim(); }
    t = t.replace(/^×/, '').replace(/\s*reps?$/i, '').trim();
    if (!t) return null;
    let out = null;
    if (/^\d+(?:\.\d+)?\s*(m|km|yd|metres?|meters?)$/i.test(t)) out = { distance: t };
    else if (isPureDuration(t)) out = { time: t };
    else if (/^\d+(?:\s*[-–]\s*\d+)?$/.test(t)) out = { reps: numIfPlain(t) };
    if (out && side) out.side = true;
    return out;
  }

  function numIfPlain(v) {
    const s = String(v).trim();
    return /^\d+$/.test(s) ? parseInt(s, 10) : s;
  }

  /* ── AUDIT (rx) ────────────────────────────────────────────────────────── */

  // The old audit() catches malformed chip LABELS. These are the mistakes that
  // are still possible once labels are gone — far fewer, which is the point.
  function auditRx(ex) {
    ex = ex || {};
    const problems = [];
    if (!ex.rx || typeof ex.rx !== 'object') return problems;
    const rx = ex.rx;
    const doses = ['reps', 'time', 'distance', 'work'].filter(k => cleanStr(rx[k]));

    if (doses.length > 1) problems.push({ level: 'warn', code: 'two-doses', label: doses.join(' + '),
      msg: 'More than one dose on the same exercise — only "' + doses[0] + '" will be shown.' });

    if (ex.chips) problems.push({ level: 'warn', code: 'chips-and-rx', label: 'chips[]',
      msg: 'This exercise has rx AND chips — the chips are dead weight and will drift.' });

    if (ex.type === 'standard' && doses[0] === 'reps' && !rx.sets)
      problems.push({ level: 'warn', code: 'reps-without-sets', label: String(rx.reps),
        msg: 'A rep count with no set count.' });

    const rpeLow = parseFloat(String(rx.rpe === undefined ? '' : rx.rpe));
    if (!isNaN(rpeLow) && rpeLow < 6)
      problems.push({ level: 'warn', code: 'rpe-below-floor', label: String(rx.rpe),
        msg: 'RPE below 6 — the selector floor is 6, so this cannot be logged.' });

    if (cleanStr(rx.tempo) && !/^(iso|\d+(\.\d+)?([-–]\d+(\.\d+)?){2,3})$/i.test(String(rx.tempo).trim()))
      problems.push({ level: 'warn', code: 'tempo-shape', label: String(rx.tempo),
        msg: 'Tempo should be "iso" or 3–4 numbers like 3-1-1-0.' });

    return problems;
  }

  global.Chips = {
    parseChips, parseDurationToSec, isPureDuration,
    slotOf, fmt, readStats, applyStats, audit,
    rxOf, repCount, applyRx, toRx, circuitToRx, detailToRx, auditRx, tempoDisplay, DOSE_LABEL
  };
})(typeof window !== 'undefined' ? window : globalThis);
