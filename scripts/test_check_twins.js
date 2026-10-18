/* test_check_twins.js — does scripts/check_twins.js really fail when a twin drifts?
   A guard that has never been seen to fail proves nothing. This copies the files the guard reads into a temp folder,
   breaks ONE thing in the copy, runs the guard on it, and requires a failure that names the right check.
   Run by hand (node scripts/test_check_twins.js) and by the pre-commit hook when the guard itself changes. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const FILES = ['program.html', 'coach.html', 'habits.html', 'assets/js/chips.js', 'scripts/twins_stamp.json', 'scripts/name_cases.json', 'scripts/career/hold_cases.json',
  'scripts/career/xp_cases.json', 'scripts/career/reward_cases.json',
  // section 10 holds habits.html's EVENTS goals to career/achievements.toml through scripts/career_seed.py --json (and the checker it imports)
  'scripts/career_seed.py', 'scripts/check_career.py', 'supabase/xp_rules_snapshot.json', 'career/tiers.lock.json']
  .concat(['rulebook', 'badges', 'achievements', 'titles', 'missions', 'quests', 'recognition'].map(n => 'career/' + n + '.toml'));
// No GIT_* variable reaches a git command in the temp folder, or the guard run on it. The pre-commit hook runs this test inside
// `git commit`, which exports GIT_DIR and GIT_INDEX_FILE. On 2026-10-17 the temp folder's `git init` then re-initialised the REAL
// repository (a worktree's GIT_DIR) as bare: core.bare = true in the shared config, and every checkout's git said "must be run in
// a work tree" for a minute. With GIT_INDEX_FILE alone, `git add -A` writes the temp folder's files into the real index (seen the
// same evening), and `git show :file` reads the real index instead of the copy.
const CLEAN_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_/i.test(k)));

function runOn(mutate, opts) {
  opts = opts || {};
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'twins-'));
  try {
    FILES.forEach(f => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(dir, f)); });
    const git = (...a) => cp.execFileSync('git', a, { cwd: dir, stdio: 'ignore', env: CLEAN_ENV });
    if (opts.index) { git('init', '-q'); git('add', '-A'); }        // the staged state is the starting point
    if (mutate) mutate(f => fs.readFileSync(path.join(dir, f), 'utf8'), (f, t) => fs.writeFileSync(path.join(dir, f), t), git);
    const env = Object.assign({}, CLEAN_ENV, { CHECK_TWINS_ROOT: dir }, opts.index ? { CHECK_TWINS_INDEX: '1' } : {});
    delete env.CHECK_TWINS_INDEX_UNSET;
    const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'check_twins.js')].concat(opts.args || []), { env, encoding: 'utf8' });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function swap(file, from, to) {
  return (get, put) => { const t = get(file); if (!t.includes(from)) throw new Error('test is stale: ' + file + ' no longer contains ' + JSON.stringify(from)); put(file, t.replace(from, to)); };
}

let bad = 0;
// TEST_ONLY=<regex> runs just the mutations whose name matches (a full run takes ten minutes): node scripts/test_check_twins.js with TEST_ONLY="Hold Serve".
const ONLY = process.env.TEST_ONLY ? new RegExp(process.env.TEST_ONLY, 'i') : null;
function want(name, mutate, expectCode, mustSay, opts) {
  if (ONLY && !ONLY.test(name)) return;
  const r = runOn(mutate, opts);
  const ok = r.code === expectCode && (!mustSay || mustSay.test(r.out));
  console.log((ok ? 'ok   ' : 'FAIL ') + name);
  if (!ok) { bad++; console.log('     exit ' + r.code + ', wanted ' + expectCode + (mustSay ? ' and ' + mustSay : '') + '\n' + r.out.split('\n').slice(0, 14).map(l => '     | ' + l).join('\n')); }
}

want('untouched files pass', null, 0, /all \d+ checks agree/);
want('the prep-block words drift (Quality check)', swap('coach.html', '/warm|mobility|activation|cool|prime|prep/i', '/warm|mobility|activation|cool|prep/i'), 1, /isPrepBlockTitle vs QM_PREP/);
want('the RPE floor drifts (6 -> 5 on the dashboard)', swap('coach.html', 'Math.min(v, Math.max(6, x));', 'Math.min(v, Math.max(5, x));'), 1, /dayRpe vs dayTargetC/);
want('the week note stops lowering the target on the dashboard (rpeCap ignored)', swap('coach.html', '(note && Number(note.rpeCap) > 0) ? floored(', '(false) ? floored('), 1, /dayRpe vs dayTargetC/);
// The week's cap on every day of the week (Amir, 2026-10-12: "colour against the cap in those weeks"), and the closing week's retest exception (TST-4).
want('the dashboard ignores the week note on a normal day again (the old rule)', swap('coach.html', 'if (!t) return t;', 'if (!t || !drop) return t;'), 1, /rpeTargetOn vs dayTargetC/);
want('the dashboard stops treating a missing drop as 0 (an undefined drop makes a NaN target)', swap('coach.html', 'Number(drop) > 0 ? Number(drop) : 0', 'drop'), 1, /rpeTargetOn vs dayTargetC/);
want('both copies go back to the old rule together (only the pinned answers can see it)', (get, put) => {
  swap('coach.html', 'if (!t) return t;', 'if (!t || !drop) return t;')(get, put);
  swap('program.html', "if (!m) return '';", "if (!m || !drop) return '';")(get, put);
}, 1, /rpeTargetOn: a normal day in a week capped at 7/);
want('the app draws the lower-day pill on a normal day too', swap('program.html', "return drop ? rpeTargetOn(written, drop, note) : '';", 'return rpeTargetOn(written, drop, note);'), 1, /dayRpe is empty on a normal day/);
want('the retest window drifts (the dashboard opens it a day late)', swap('coach.html', 'return end - dayNumC(dayKey) <= RETEST_WINDOW_DAYS_C;', 'return end - dayNumC(dayKey) < RETEST_WINDOW_DAYS_C;'), 1, /inRetestWindow vs retestWindowOnC/);
want('a cycle with no end date is never in the retest window on the dashboard', swap('coach.html', 'if (!cycle || !cycle.endDate) return true;', 'if (!cycle || !cycle.endDate) return false;'), 1, /inRetestWindow vs retestWindowOnC/);
want('the week boundary drifts (the dashboard starts week 2 a day late)', swap('coach.html', 'Math.floor((d - s) / 7) + 1', 'Math.floor((d - s - 1) / 7) + 1'), 1, /cycleWeekInfo vs cycleWeekOnC/);
want('the app reads a cycle date as a UTC instant again (a day early west of Greenwich: "Cycle complete" the day before the end)', swap('program.html', 'if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000;', 'if (m) { const u = new Date(v); return Date.UTC(u.getFullYear(), u.getMonth(), u.getDate()) / 86400000; }'), 1, /cycleWeekInfo vs cycleWeekOnC \((America|Pacific|Europe)/);
want('the app\'s today is the UTC day again (a day off in New Zealand)', swap('program.html', 'return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 86400000;', 'return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()) / 86400000;'), 1, /cycleWeekInfo vs cycleWeekOnC \(Pacific\/Auckland\)/);
want('the last-week alias drifts (the dashboard applies `last` in a one-week cycle too)', swap('coach.html', 'w.total > 1 && w.wk === w.total && ok(notes.last)', 'w.wk === w.total && ok(notes.last)'), 1, /weekNoteNow vs weekNoteOnC/);
want('the session grace drifts (six hours become five on the dashboard)', swap('coach.html', 'const SESSION_GRACE_MS_C = 6 * 3600000;', 'const SESSION_GRACE_MS_C = 5 * 3600000;'), 1, /sessionIsStale vs sessionIsStaleC/);
want('the dashboard goes back to its own 30-hour window idea (a day is no longer the test)', swap('coach.html', 'return d.toDateString() !== new Date().toDateString() && (Date.now() - d.getTime()) > SESSION_GRACE_MS_C;', 'return (Date.now() - d.getTime()) > 30 * 3600e3;'), 1, /sessionIsStale vs sessionIsStaleC/);
want('the check-in score drifts (the dashboard counts soreness and drops how ready they feel)', swap('coach.html', "const READY_FOUR_C = ['sleep', 'energy', 'stress', 'overall'];", "const READY_FOUR_C = ['sleep', 'energy', 'stress', 'soreness'];"), 1, /readinessS vs readinessSC/);
want('the usual drifts (the dashboard needs four check-ins, not five)', swap('coach.html', 'const READY_BASE_N_C = 10, READY_BASE_MIN_C = 5;', 'const READY_BASE_N_C = 10, READY_BASE_MIN_C = 4;'), 1, /readinessBase vs usualC/);
want('the usual drifts (the last twelve, not ten)', swap('coach.html', 'const READY_BASE_N_C = 10, READY_BASE_MIN_C = 5;', 'const READY_BASE_N_C = 12, READY_BASE_MIN_C = 5;'), 1, /readinessBase vs usualC/);
want('the retest flag accepts 11RM on the dashboard only', swap('coach.html', 'reps > ONE_RM_MAX_EFFECTIVE_C', 'reps > 11'), 1, /exTestSpec vs exTestSpecC/);
want('the retest flag is read looser on the dashboard (no anchors: "5RMx" is a flag)', swap('coach.html', String.raw`const m = String(raw || '').match(/^(\d+)\s*rm$/i);`, String.raw`const m = String(raw || '').match(/(\d+)\s*rm/i);`), 1, /exTestSpec vs exTestSpecC/);
want('the 70% gate drifts (60% on the dashboard)', swap('coach.html', 'const QM_COVERAGE_C = 0.7;', 'const QM_COVERAGE_C = 0.6;'), 1, /qualityMix vs qualityDayC/);
want('the 1.5-set floor drifts (1 on the dashboard)', swap('coach.html', 'score[q] >= Math.max(1.5, sum * 0.12)', 'score[q] >= Math.max(1, sum * 0.12)'), 1, /qualityMix vs qualityDayC/);
want('the 12% cut drifts (10% on the dashboard)', swap('coach.html', 'score[q] >= Math.max(1.5, sum * 0.12)', 'score[q] >= Math.max(1.5, sum * 0.1)'), 1, /qualityMix vs qualityDayC/);
want('a tie between two qualities breaks the other way on the dashboard', swap('coach.html', 'lens.qById[a].sort - lens.qById[b].sort', 'lens.qById[b].sort - lens.qById[a].sort'), 1, /qualityMix vs qualityDayC/);
want('the phone lens lets draft entries in (a card on a draft would show a chip the phone cannot)', swap('coach.html', "const entries = (list || []).filter(e => !phone || e.status === 'approved');", 'const entries = (list || []).filter(e => true);'), 1, /qualityMix vs qualityDayC|spineFor vs spineForC/);
want('the phone lens counts draft qualities', swap('coach.html', "(quals || []).filter(q => !phone || q.status === 'approved')", '(quals || []).filter(q => true)'), 1, /qualityMix vs qualityDayC/);
want('a circuit\'s rounds are read from the wrong place on the dashboard', swap('coach.html', 'const rounds = roundCountC(Chips.rxOf(ex).rounds || ex.rounds);', 'const rounds = roundCountC(ex.rounds);'), 1, /qualityMix vs qualityDayC/);
want('a circuit with 0 rounds counts 0 on the dashboard', swap('coach.html', 'return n > 0 ? n : 1;', 'return n;'), 1, /qualityMix vs qualityDayC/);
want('the app\'s name rule changes on its own (accents are no longer folded), so the stored tiers are stale', swap('program.html', ".normalize('NFKD').replace(/[^\\x00-\\x7f]/g, '')", ".normalize('NFC')"), 1, /the tiers stored for a name are what the app gives|exNameVariants vs exNameVariantsC/);
want('the dashboard stops clipping a run at the next one (it shows a longer week than the app)', swap('coach.html', 'if (dayBefore < end) end = dayBefore;', 'if (false) end = dayBefore;'), 1, /activeQuestRun|runEndKey vs questRunEnd/);
want('the dashboard shows the last run in the list, not the latest-starting', swap('coach.html', 'reduce((best, r) => (r.start > best.start ? r : best)) : null;', 'reduce((best, r) => r) : null;'), 1, /activeQuestRun/);
want('the dashboard ignores a run the coach ended early', swap('coach.html', 'r.end < end) end = r.end;', 'false) end = r.end;'), 1, /runEndKey vs questRunEnd|activeQuestRun/);
want('the dashboard reads a run with no quest list', swap('coach.html', 'typeof x.start === \'string\' && Array.isArray(x.ids));', 'typeof x.start === \'string\');'), 1, /activeQuestRun|runEndKey vs questRunEnd/);
want('a name tier drifts (the dashboard stops folding DB to dumbbell)', swap('coach.html', "const EX_ABBREV_C = { db: 'dumbbell', bb: 'barbell', kb: 'kettlebell' };", "const EX_ABBREV_C = { bb: 'barbell', kb: 'kettlebell' };"), 1, /exNameVariants vs exNameVariantsC/);
want('the Spine resolver drifts (exId no longer wins on the dashboard)', swap('coach.html', 'if (exId) return byId[exId] ? exId : null;', 'if (false) return exId;'), 1, /spineFor vs spineForC/);
want('the dashboard guesses by name again when a card\'s exId is a draft (the old rule)', swap('coach.html', 'if (exId) return byId[exId] ? exId : null;', 'if (exId && byId[exId]) return exId;'), 1, /spineFor vs spineForC|DRAFT shows nothing/);
want('the phone\'s lens lets drafts in (a video or a card the phone cannot show)', swap('coach.html', "const entries = (list || []).filter(e => !phone || e.status === 'approved');", 'const entries = (list || []).filter(e => true);'), 1, /spineFor vs spineForC|qualityMix vs qualityDayC/);
want('the app rewords its check-in line', swap('program.html', "bits.push('lower day (every RPE 1 lower, never below 6)')", "bits.push('easier day (every RPE 1 lower, never below 6)')"), 1, /readinessPlanLine's wording/);
want('the app stops writing the sore wording', swap('program.html', "bits.push('sore: jumps and landings halved')", "bits.push('sore: jumps halved')"), 1, /readinessPlanLine's wording/);
want('the time-dose rule drifts (a set per 10 minutes becomes 5)', swap('coach.html', 'Math.max(1, sec / 600)', 'Math.max(1, sec / 300)'), 1, /qmSets vs qmSetsC/);
want('a function is renamed away', swap('coach.html', 'function spineForC(', 'function spineForD('), 2, /could not find function spineForC/);
// Career Mode's weeks held in a row (Home's Hold Serve row): the app's copy of get_profile()'s loop, held to scripts/career/hold_cases.json.
want('Hold Serve stops starting again after a broken week (the app only)', swap('program.html', 'best = Math.max(best, now); } else now = 0;', 'best = Math.max(best, now); }'), 1, /holdCount: /);
want('Hold Serve\'s best is the latest run, not the longest', swap('program.html', 'best = Math.max(best, now);', 'best = now;'), 1, /holdCount: /);
want('chips.js changes under an unchanged ?v=', (get, put) => put('assets/js/chips.js', get('assets/js/chips.js') + '\n// edited\n'), 1, /chips\.js changed but coach\.html still loads \?v=/);
want('?v= bumped but the stamp not refreshed', swap('coach.html', 'chips.js?v=', 'chips.js?v=zz-'), 1, /stamp is out of date/);

// ── what the first review (2026-10-10) found surviving ──────────────────────────────────────────
const PREP = '/warm|mobility|activation|cool|prime|prep/i';
want('a name abbreviation drifts (ez bar on one side only)', swap('coach.html', "kb: 'kettlebell' };", "kb: 'kettlebell', ez: 'ez bar' };"), 1, /EX_ABBREV vs EX_ABBREV_C/);
want('"activation" is dropped from one side (a lone Activation block)', swap('coach.html', PREP, '/warm|mobility|cool|prime|prep/i'), 1, /isPrepBlockTitle vs QM_PREP/);
want('"stretch" is added to one side only', swap('coach.html', PREP, '/warm|mobility|activation|cool|prime|prep|stretch/i'), 1, /isPrepBlockTitle vs QM_PREP/);
want('the app extends the sore wording', swap('program.html', "bits.push('sore: jumps and landings halved')", "bits.push('sore: jumps and landings halved today')"), 1, /readinessPlanLine's wording/);
want('the app extends the "trained as written" suffix', swap('program.html', "' — trained as written by choice'", "' — trained as written by choice, noted'"), 1, /readinessPlanLine's wording/);
want('the reader loses its anchor, so an athlete\'s note can set a verdict',
  swap('coach.html', String.raw`Readiness \\(at start\\)[^\\n]*(?:\\n[ \\t]*\\S[^\\n]*){1,8}?`, ''), 1, /a note that imitates the line changes nothing/);
want('the reader stops reading the field (only the summary line is left)', swap('coach.html', String.raw`'(?:Composite\\s+[\\d.]+/5`, String.raw`'(?:Composite\\s+99[\\d.]+/5`), 1, /the Readiness field alone/);
want('--stamp refuses a changed chips.js under an unchanged ?v=', (get, put) => put('assets/js/chips.js', get('assets/js/chips.js') + '\n// edited\n'), 2, /Bump the \?v= token first/, { args: ['--stamp'] });
want('--stamp works once the token is bumped, and the guard then passes',
  (get, put) => { put('assets/js/chips.js', get('assets/js/chips.js') + '\n// edited\n'); put('coach.html', get('coach.html').replace('chips.js?v=', 'chips.js?v=b-')); }, 0, /stamped chips\.js/, { args: ['--stamp'] });
// The hook reads the STAGED files: a ?v= bumped in the working tree but not staged must not pass.
want('a bumped ?v= that is not staged does not pass (the hook reads the index)',
  (get, put, git) => {
    put('assets/js/chips.js', get('assets/js/chips.js') + '\n// edited\n');
    put('coach.html', get('coach.html').replace('chips.js?v=', 'chips.js?v=b-'));
    git('add', 'assets/js/chips.js');                                   // chips.js staged; coach.html (with the bump) is not
  }, 1, /chips\.js changed but coach\.html still loads/, { index: true });

// Career Mode phase 2 (§9): a phone's copy of a server rule drifting from the server's answers in scripts/career/xp_cases.json.
want('AA Proof pays the WORKOUT habit again once the XP switch is on',
  swap('habits.html', 'function paidXp(h, v) { return careerOn() && h.locked ? 0 : xpFor(h, v); }', 'function paidXp(h, v) { return xpFor(h, v); }'), 1, /paidXp/);
want('the training app rounds the career curve its own way',
  swap('program.html', 'const cost = n => Math.max(10, Math.round(base * Math.pow(n, growth) / 10) * 10);',
       'const cost = n => Math.max(10, Math.floor(base * Math.pow(n, growth) / 10) * 10);'), 1, /program\.html careerLevelOf/);
want('the training app pays a full log when a set is left unrated',
  swap('program.html', "return !sets.some(x => asks.has(x.o) && !careerTruthy(val(x.st, 'r')));", 'return true;'), 1, /the facts of a session/);
want('a server answer in the cases changes on its own',
  (get, put) => put('scripts/career/xp_cases.json', get('scripts/career/xp_cases.json').replace('"level_cost": 400', '"level_cost": 410')), 1, /career's curve/);

// Career Mode phase 3 (§10): a phone's copy of a reward rule drifting from the server's answers in scripts/career/reward_cases.json, and the five events' goals
// drifting from career/achievements.toml. Each mutation is ONE copy changing on its own, which is how a drift happens.
want('the award id of a habit badge loses its subject (AA Proof)', swap('habits.html', "if (subject) s += ':' + subject;", ''), 1, /habits\.html awardId/);
want('the award id of a habit badge loses its subject (the training app)', swap('program.html', "if (kind === 'badge' && subject) id += ':' + String(subject);", ''), 1, /program\.html awardId/);
want('the award id writes the tier after a title (AA Proof)', swap('habits.html', "if (tier != null && tier !== '') s += ':' + tier;", "s += ':' + tier;"), 1, /habits\.html awardId/);
want('a crossing on the switch day is new on the phone (history is d <= S)', swap('habits.html', '!(d > S) || d < floor', '!(d >= S) || d < floor'), 1, /phoneAwardsFrom: the switch day is history/);
want('AA Proof shows a crossing from before the open window as pending again', swap('habits.html', '!(d > S) || d < floor || d > o.today', '!(d > S) || d > o.today'), 1, /phoneAwardsFrom: zz_twin/);
want('AA Proof shows an award the server already owns', swap('habits.html', '|| owned[id] || wd.indexOf(id) >= 0) return;', '|| wd.indexOf(id) >= 0) return;'), 1, /phoneAwardsFrom: zz_twin/);
want('AA Proof shows a withdrawn award again', swap('habits.html', '|| owned[id] || wd.indexOf(id) >= 0) return;', '|| owned[id]) return;'), 1, /a withdrawn id is left out/);
want('a tier is crossed one step too late on the phone (> instead of >=)', swap('habits.html', 'if (st[j][1] >= at) return st[j][0]', 'if (st[j][1] > at) return st[j][0]'), 1, /awardMeasures: zz_twin/);
want('the day streak counts every day on target, not the days in a row', swap('habits.html', "else if (kind === 'daystreak') pts = islandPts(inp.onTarget);", "else if (kind === 'daystreak') pts = countPts(inp.onTarget);"), 1, /awardMeasures: zz_twin/);
want('a habit counts as done on any logged amount, not the target', swap('habits.html', "return typeof v === 'number' && t != null && v >= t; };", "return typeof v === 'number' && t != null && v > 0; };"), 1, /awardMeasures: zz_twin/);
want('the finish card shows four lines, not three', swap('program.html', 'lines.slice(0, 3).map', 'lines.slice(0, 4).map'), 1, /careerMoves #/);
want('the finish card sorts a tier not crossed before one crossed', swap('program.html', '(b.crossed - a.crossed) ||', '(a.crossed - b.crossed) ||'), 1, /careerMoves #/);
want('the finish card calls a week ladder sure (not pending)', swap('program.html', 'pending = true;', 'pending = false;'), 1, /careerMoves #/);
want('Hold Serve counts from its best on the finish card, not the run so far', swap('program.html', "const base = typeof en.now === 'number' ? en.now : (Number(en.have) || 0)", "const base = Number(en.have) || 0"), 1, /careerMoves, pinned: a run badge counts from the run so far/);
want('an event\'s goal changes in AA Proof only (16 sessions become 17)', swap('habits.html', "need:16,     label:'16 sessions'", "need:17,     label:'16 sessions'"), 1, /EVENTS goals vs achievements\.toml: ev_foundry/);
want('an event\'s goal changes in the catalogue only (career/achievements.toml)', swap('career/achievements.toml', '{ kind = "daysHit:strength", need = 16 }', '{ kind = "daysHit:strength", need = 15 }'), 1, /EVENTS goals vs achievements\.toml: ev_foundry/);
want('an event is added to AA Proof and not to the catalogue', swap('habits.html', "{ id:'ev_bedrock', name:'BEDROCK'", "{ id:'ev_zz', name:'ZZ', tag:'x', blurb:'x', title:{ id:'t_zz', name:'ZZ', note:'x' }, goals:[ { kind:'qualify', need:1, label:'x' } ] },\n  { id:'ev_bedrock', name:'BEDROCK'"), 1, /every event achievement has an EVENTS twin/);
want('a server answer in the reward cases changes on its own (a pending award\'s price)',
  (get, put) => { const j = JSON.parse(get('scripts/career/reward_cases.json')); const a = j.athletes.find(x => (x.phone_awards || []).some(y => y.xp > 0)); a.phone_awards.find(y => y.xp > 0).xp += 10; put('scripts/career/reward_cases.json', JSON.stringify(j)); }, 1, /phoneAwardsFrom: zz_twin/);
want('a moves case in the reward cases changes on its own',
  (get, put) => { const j = JSON.parse(get('scripts/career/reward_cases.json')); j.moves[0].expect.more = 9; put('scripts/career/reward_cases.json', JSON.stringify(j)); }, 1, /careerMoves #0/);
want('the reward cases file is emptied (a guard with nothing to hold must not pass)',
  (get, put) => { const j = JSON.parse(get('scripts/career/reward_cases.json')); j.athletes = []; j.moves = []; j.ids = []; put('scripts/career/reward_cases.json', JSON.stringify(j)); }, 1, /has no (award id cases|athletes|moves cases)/);
want('a phone function is renamed away (awardMeasures)', swap('habits.html', 'function awardMeasures(', 'function awardMeasuresZ('), 2, /could not find function awardMeasures/);
want('a phone function is renamed away (careerMoves)', swap('program.html', 'function careerMoves(', 'function careerMovesZ('), 2, /could not find function careerMoves/);

console.log(bad ? '\n' + bad + ' mutation(s) NOT caught' : '\nthe guard catches every drift it is meant to');
process.exit(bad ? 1 : 0);
