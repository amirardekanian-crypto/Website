/* test_check_twins.js — does scripts/check_twins.js really fail when a twin drifts?
   A guard that has never been seen to fail proves nothing. This copies the files the guard reads into a temp folder,
   breaks ONE thing in the copy, runs the guard on it, and requires a failure that names the right check.
   Run by hand (node scripts/test_check_twins.js) and by the pre-commit hook when the guard itself changes. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const FILES = ['program.html', 'coach.html', 'assets/js/chips.js', 'scripts/twins_stamp.json'];

function runOn(mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'twins-'));
  try {
    FILES.forEach(f => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(dir, f)); });
    if (mutate) mutate(f => fs.readFileSync(path.join(dir, f), 'utf8'), (f, t) => fs.writeFileSync(path.join(dir, f), t));
    const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'check_twins.js')], { env: Object.assign({}, process.env, { CHECK_TWINS_ROOT: dir }), encoding: 'utf8' });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function swap(file, from, to) {
  return (get, put) => { const t = get(file); if (!t.includes(from)) throw new Error('test is stale: ' + file + ' no longer contains ' + JSON.stringify(from)); put(file, t.replace(from, to)); };
}

let bad = 0;
function want(name, mutate, expectCode, mustSay) {
  const r = runOn(mutate);
  const ok = r.code === expectCode && (!mustSay || mustSay.test(r.out));
  console.log((ok ? 'ok   ' : 'FAIL ') + name);
  if (!ok) { bad++; console.log('     exit ' + r.code + ', wanted ' + expectCode + (mustSay ? ' and ' + mustSay : '') + '\n' + r.out.split('\n').slice(0, 14).map(l => '     | ' + l).join('\n')); }
}

want('untouched files pass', null, 0, /all \d+ checks agree/);
want('the prep-block words drift (Quality check)', swap('coach.html', '/warm|mobility|activation|cool|prime|prep/i', '/warm|mobility|activation|cool|prep/i'), 1, /isPrepBlockTitle vs QM_PREP/);
want('the RPE floor drifts (6 -> 5 on the dashboard)', swap('coach.html', 'Math.max(6, v - drop)', 'Math.max(5, v - drop)'), 1, /dayRpe vs dayTargetC/);
want('a name tier drifts (the dashboard stops folding DB to dumbbell)', swap('coach.html', "const EX_ABBREV_C = { db: 'dumbbell', bb: 'barbell', kb: 'kettlebell' };", "const EX_ABBREV_C = { bb: 'barbell', kb: 'kettlebell' };"), 1, /exNameVariants vs exNameVariantsC/);
want('the Spine resolver drifts (exId no longer wins on the dashboard)', swap('coach.html', 'if (exId && byId[exId]) return exId;', 'if (false) return exId;'), 1, /spineFor vs spineForC/);
want('the app rewords its check-in line', swap('program.html', "bits.push('lower day (every RPE 1 lower, never below 6)')", "bits.push('easier day (every RPE 1 lower, never below 6)')"), 1, /readinessPlanLine -> parseCheckinPlan/);
want('the app stops writing the sore wording', swap('program.html', "bits.push('sore: jumps and landings halved')", "bits.push('sore: jumps halved')"), 1, /readinessPlanLine -> parseCheckinPlan/);
want('the time-dose rule drifts (a set per 10 minutes becomes 5)', swap('coach.html', 'Math.max(1, sec / 600)', 'Math.max(1, sec / 300)'), 1, /qmSets vs qmSetsC/);
want('a function is renamed away', swap('coach.html', 'function spineForC(', 'function spineForD('), 2, /could not find function spineForC/);
want('chips.js changes under an unchanged ?v=', (get, put) => put('assets/js/chips.js', get('assets/js/chips.js') + '\n// edited\n'), 1, /chips\.js changed but coach\.html still loads \?v=/);
want('?v= bumped but the stamp not refreshed', swap('coach.html', 'chips.js?v=', 'chips.js?v=zz-'), 1, /stamp is out of date/);

console.log(bad ? '\n' + bad + ' mutation(s) NOT caught' : '\nthe guard catches every drift it is meant to');
process.exit(bad ? 1 : 0);
