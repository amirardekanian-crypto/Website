// The estimated max is one formula in three apps: node scripts/test_one_rm_copies.js
//
// estimateOneRM() is written out in program.html (the training app), tennis/app/app.js (the course app) and
// tennis-testing/app/app.js (the testing app), and none of them could see the others: the training app's copy is held to the
// server's SQL by check_twins.js, the two Farsi apps' copies by nothing (the code-quality pass, 2026-10-20). They share the
// formula on purpose — effective reps are the reps plus the reps left in the tank (10 - RPE), more than 10 is no estimate, and
// the estimate is the weight x (1 + effective / 30) — and differ on purpose in how they show it:
//   · the training app rounds to the measure's own step (2.5 kg, 5 lb, half a plate),
//   · the course app rounds to 2.5 kg (it has no other measure),
//   · the testing app keeps the exact number (its screens round), and refuses an RPE over 10, which the other two never offer.
// This holds the shared formula equal in all three and pins those differences, so a change to one copy fails here.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log('ok   ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail ? '\n       ' + String(detail) : '')); }
}
function fnSrc(src, name, file) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error(file + ': no function ' + name);
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(start, j + 1);
  }
  throw new Error(file + ': ' + name + ' never ends');
}
function constLine(src, name, file) {
  const m = src.match(new RegExp('const ' + name + '\\s*=[^;]*;'));
  if (!m) throw new Error(file + ': no const ' + name);
  return m[0];
}
function load(file, consts) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const ctx = vm.createContext({});
  vm.runInContext(consts.map(c => constLine(src, c, file)).concat(fnSrc(src, 'estimateOneRM', file)).join('\n'), ctx);
  return { est: vm.runInContext('estimateOneRM', ctx), c: Object.fromEntries(consts.map(c => [c, vm.runInContext(c, ctx)])) };
}
const TRAIN = load('program.html', ['ONE_RM_MAX_EFFECTIVE', 'ONE_RM_ROUND_KG', 'ONE_RM_ROUND']);
const COURSE = load('tennis/app/app.js', ['ORM_MAX_EFFECTIVE', 'ORM_ROUND_KG']);
const TEST = load('tennis-testing/app/app.js', ['ONE_RM_MAX_EFFECTIVE']);

check('one ceiling on effective reps in all three (10)', TRAIN.c.ONE_RM_MAX_EFFECTIVE === 10 && COURSE.c.ORM_MAX_EFFECTIVE === 10 && TEST.c.ONE_RM_MAX_EFFECTIVE === 10,
  JSON.stringify([TRAIN.c.ONE_RM_MAX_EFFECTIVE, COURSE.c.ORM_MAX_EFFECTIVE, TEST.c.ONE_RM_MAX_EFFECTIVE]));
check('one kilogram step in the two that round (2.5)', TRAIN.c.ONE_RM_ROUND_KG === 2.5 && TRAIN.c.ONE_RM_ROUND.kg === 2.5 && COURSE.c.ORM_ROUND_KG === 2.5);

const round = (v, step) => (v == null ? null : Math.round(v / step) * step);
const W = [0, -5, 20, 40, 60.5, 100, 142.5, '80', 'abc', null], REPS = [0, 1, 2, 3, 5, 8, 10, 11, '6'], RPE = [0, 5, 6, 7, 7.5, 8, 9, 9.5, 10, '8', null];
let bad = [];
W.forEach(w => REPS.forEach(r => RPE.forEach(e => {
  const exact = TEST.est(w, r, e);
  const want = round(exact, 2.5);
  const t = TRAIN.est(w, r, e), tk = TRAIN.est(w, r, e, 'kg'), c = COURSE.est(w, r, e);
  if (t !== want || tk !== want || c !== want) bad.push(JSON.stringify({ w, r, e, exact, training: t, course: c }));
})));
check('the same formula: for every RPE up to 10, the training and course apps give the testing app\'s number rounded to 2.5 kg (' + W.length * REPS.length * RPE.length + ' cases)',
  bad.length === 0, bad.slice(0, 5).join('\n       '));
check('the training app rounds pounds to 5 and plates to half a plate', TRAIN.est(100, 5, 8, 'lb') === 125 && TRAIN.est(100, 5, 8, 'plates') === 123.5,
  JSON.stringify([TRAIN.est(100, 5, 8, 'lb'), TRAIN.est(100, 5, 8, 'plates')]));
check('an RPE over 10: refused by the testing app only (the other two have no such button)',
  TEST.est(100, 5, 11) === null && TRAIN.est(100, 5, 11) === round(100 * (1 + 5 / 30), 2.5) && COURSE.est(100, 5, 11) === round(100 * (1 + 5 / 30), 2.5),
  JSON.stringify([TEST.est(100, 5, 11), TRAIN.est(100, 5, 11), COURSE.est(100, 5, 11)]));
check('one effective rep is the weight itself, in all three', TEST.est(142.5, 1, 10) === 142.5 && TRAIN.est(142.5, 1, 10) === 142.5 && COURSE.est(142.5, 1, 10) === 142.5);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
