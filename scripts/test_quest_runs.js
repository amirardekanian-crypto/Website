/* test_quest_runs.js — the last scoring day of a quest run in habits.html (runEndKey).

   A run lasts seven days from its start, is CLIPPED the day before the next run starts, and, since stage55 (2026-10-11, Amir: "cancelling
   a quest week keeps the XP already earned"), stops at its own `end` when the coach ended it early with end_quests(). The server twin is
   the qruns CTE of hab_bonus_xp(); scripts/test_spine_sql.sh (section J) proves that half on a real Postgres with the same cases. If one
   side changes alone the board and the phone disagree about a quest's XP and nothing errors, so this runs on every commit that touches
   habits.html (pre-commit guard 16).

   How: runEndKey and the helpers it uses are cut out of habits.html by name (so an edit elsewhere cannot make the test run the wrong
   code), compiled in a sandbox with a CFG of runs, and driven with fixed vectors. A function that cannot be found fails the run.
   Run by hand:   node scripts/test_quest_runs.js                                                                                      */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'habits.html'), 'utf8');

function cut(name) {
  const at = html.search(new RegExp('(^|\\n)(async )?function ' + name + '\\('));
  if (at < 0) { console.log('FAIL  could not find function ' + name + ' in habits.html (a rename must come here)'); process.exit(1); }
  const from = html.indexOf('function ' + name + '(', at);
  let i = html.indexOf('{', html.indexOf(')', from)), depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(from, i + 1);
  }
  console.log('FAIL  unbalanced braces in ' + name); process.exit(1);
}
const src = ['const QUEST_RUN_DAYS = 7;', cut('addDays'), cut('fmtKey'), cut('parseKey'), cut('questRuns'), cut('runEndKey')].join('\n');
const endOf = (runs, i) => new Function('CFG', src + '\nreturn runEndKey(questRuns()[' + (i || 0) + ']);')({ questRuns: runs });

let bad = 0;
function is(name, got, want) {
  const ok = got === want;
  if (!ok) bad++;
  console.log((ok ? 'ok    ' : 'FAIL  ') + name + (ok ? '' : '   got ' + got + ', wanted ' + want));
}
const R = (start, extra) => Object.assign({ start, ids: ['q'] }, extra || {});

is('a run lasts seven days from its start', endOf([R('2026-08-03')]), '2026-08-09');
is('across a month end', endOf([R('2026-08-29')]), '2026-09-04');
is('the next run clips the one before it to the day before it starts', endOf([R('2026-08-03'), R('2026-08-06')]), '2026-08-05');
is('a next run that starts after the natural end does not clip', endOf([R('2026-08-03'), R('2026-08-10')]), '2026-08-09');
is('runs are clipped by the next START, whatever order they are stored in', endOf([R('2026-08-06'), R('2026-08-03')], 1), '2026-08-05');
is('an end before the natural last day stops the run there (stage55)', endOf([R('2026-08-03', { end: '2026-08-05' })]), '2026-08-05');
is('an end on the start day leaves a one-day run', endOf([R('2026-08-03', { end: '2026-08-03' })]), '2026-08-03');
is('an end after the natural last day changes nothing', endOf([R('2026-08-03', { end: '2026-08-30' })]), '2026-08-09');
is('an end and a next run both bound it: the earlier wins (end first)', endOf([R('2026-08-03', { end: '2026-08-04' }), R('2026-08-06')]), '2026-08-04');
is('...and the earlier wins (next run first)', endOf([R('2026-08-03', { end: '2026-08-08' }), R('2026-08-06')]), '2026-08-05');
is('an end that is not a date is ignored', endOf([R('2026-08-03', { end: 'tomorrow' })]), '2026-08-09');
is('a null end is ignored', endOf([R('2026-08-03', { end: null })]), '2026-08-09');
is('a numeric end is ignored', endOf([R('2026-08-03', { end: 20260805 })]), '2026-08-09');
is('an end in another shape (a timestamp) is ignored, as on the server', endOf([R('2026-08-03', { end: '2026-08-05T10:00:00Z' })]), '2026-08-09');
is('the other run keeps its own window when one is ended', endOf([R('2026-07-27', { end: '2026-07-29' }), R('2026-08-03')], 1), '2026-08-09');

if (bad) { console.log('\ntest_quest_runs: ' + bad + ' FAILED'); process.exit(1); }
console.log('\ntest_quest_runs: all passed');
