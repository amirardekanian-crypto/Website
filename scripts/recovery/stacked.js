#!/usr/bin/env node
/* Stacked (#144, round 14 'The Changeover', 2026-11-24): the line coach.html shows on an athlete's file, for /cycle-report.

     node scripts/recovery/stacked.js <bundle.json>

   The bundle is what .claude/skills/cycle-report/queries.sql Q8 returns (save its `bundle` value to a scratch file):
   { from, to, sessions: [{ completed_on, day, session_rpe, duration_min, fin, readiness, log }], acts: [{ day, kind, mins, effort }],
     spine: [{ id, name, aliases, status, loads, impact }] }.

   It runs coach.html's OWN functions (footprintOfC, stackedOfC, stackedLineC and the Spine resolver, cut out of the file by name, the
   way scripts/check_twins.js does) with the rules in assets/js/recovery.js, so the report and the dashboard can never disagree: there is
   no third copy of the rules here. It prints the line, then the counts as JSON. Information only (REC-7): a fact for the Debrief and a
   question for Amir, never a change to the plan. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
function fnSrc(src, name) {
  const m = new RegExp('^function ' + name + '\\(', 'm').exec(src);
  if (!m) throw new Error('coach.html: no function ' + name + '()');
  const eol = src.indexOf('\n', m.index), first = src.slice(m.index, eol);
  try { new vm.Script(first); return first; } catch (e) { /* a multi-line function */ }
  for (let end = m.index; ;) {
    end = src.indexOf('\n}', end + 1);
    if (end < 0) throw new Error('coach.html: ' + name + '() never closes');
    const code = src.slice(m.index, end + 2);
    try { new vm.Script(code); return code; } catch (e) { /* keep looking */ }
  }
}
function lineSrc(src, start) {
  const i = src.indexOf('\n' + start);
  if (i < 0) throw new Error('coach.html: no line starting ' + start);
  return src.slice(i + 1, src.indexOf('\n', i + 1));
}

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/recovery/stacked.js <bundle.json>'); process.exit(2); }
// The bundle as saved: the JSON itself, the query's rows ([{ bundle }]), or the Supabase tool's saved answer (a { result } whose text holds
// the rows between its untrusted-data markers): pass whichever file you have.
function bundleFrom(text) {
  let v = null;
  try { v = JSON.parse(text); } catch (e) { /* not JSON as a whole */ }
  if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.result === 'string') return bundleFrom(v.result);
  if (v == null) {
    const i = text.indexOf('[{'), j = text.lastIndexOf('}]');
    if (i >= 0 && j > i) { try { v = JSON.parse(text.slice(i, j + 2)); } catch (e) { /* not the rows either */ } }
  }
  if (Array.isArray(v)) v = v[0];
  if (v && v.bundle) v = v.bundle;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
  return v;
}
const B = bundleFrom(fs.readFileSync(file, 'utf8'));
if (!B || !B.from || !B.to || !Array.isArray(B.sessions)) { console.error('stacked.js: the file is not a Q8 bundle ({ from, to, sessions, acts, spine })'); process.exit(2); }

const C = read('coach.html');
const ctx = vm.createContext({ console });
ctx.window = ctx;
vm.runInContext(read('assets/js/recovery.js'), ctx);
vm.runInContext([lineSrc(C, 'const EX_ABBREV_C ='), ...['normExNameC', 'exNameVariantsC', 'spineIndexC', 'spineForC', 'spineLensC',
  'footprintOfC', 'stackedOfC', 'stackedLineC'].map(n => fnSrc(C, n))].join('\n'), ctx);
ctx.B = B;
const out = vm.runInContext(`(() => {
  const lib = spineLensC(B.spine || [], true);
  const spineOf = n => { const id = spineForC(lib.idx, n, null, lib.byId); return id ? lib.byId[id] || null : null; };
  const asLog = l => Array.isArray(l) ? l : [];
  const acts = (B.acts || []).map(a => ({ day: String(a.day), kind: a.kind, mins: a.mins != null ? a.mins : a.minutes, effort: a.effort }));
  const hist = B.sessions.map(s => ({ date: String(s.completed_on), rpe: s.session_rpe, mins: s.duration_min, log: asLog(s.log) }));
  const rows = B.sessions.map(s => ({ date: String(s.completed_on), ready: s.readiness && typeof s.readiness === 'object' ? s.readiness : null,
    fp: footprintOfC({ date: String(s.completed_on), rpe: s.session_rpe, mins: s.duration_min, fin: s.fin || '', log: asLog(s.log) },
      { rules: window.AAREC, earlier: hist, spineOf, week: null, acts }) }));
  const st = stackedOfC(rows, acts, window.AAREC, String(B.from), String(B.to));
  return { line: stackedLineC(st), counts: st };
})()`, ctx);
console.log('Stacked (' + B.from + ' to ' + B.to + '): ' + (out.line || 'no sessions in the window'));
console.log(JSON.stringify(out.counts));
