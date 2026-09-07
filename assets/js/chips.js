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
    return /^\d+\s*(s(?:ec(?:onds?)?)?|m(?:in(?:utes?)?)?)\s*(?:\/?(?:side|leg|each(?:\s+\w+)?))?$/i.test(t);
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

  global.Chips = {
    parseChips, parseDurationToSec, isPureDuration,
    slotOf, fmt, readStats, applyStats, audit
  };
})(typeof window !== 'undefined' ? window : globalThis);
