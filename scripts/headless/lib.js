// Headless harness for the two athlete apps, program.html and habits.html (AA Proof). Built during the
// Fresh Eyes work (2026-09-26/27) and kept here so a new session does not rebuild it.
//
// The apps cannot reach Supabase from a cloud container, so stub.js replaces supabase-js before any app
// script runs and answers get_program with a local, MADE-UP programme (fixture.json: "Alex Rivera",
// athlete id rel01_athlete). Nothing here is real athlete data, and it must stay that way: this repo is
// public. For real Spine entries or a real programme's shape, read them with the Supabase MCP and keep
// the result in the session's scratchpad, never here.
//
//   1. From the repo root:  python3 -m http.server 8765 --bind 127.0.0.1
//   2. Then:                node scripts/headless/smoke.js [--out <dir for screenshots>]
//
// Write a new check as its own script that requires this file (smoke.js is the pattern). Playwright and
// Chromium are found where the cloud container keeps them; elsewhere set PLAYWRIGHT (its module path)
// and CHROMIUM (a browser binary), and BASE if the server is not on 127.0.0.1:8765.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');

const PW = process.env.PLAYWRIGHT
  || (fs.existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : 'playwright');
const { chromium } = require(PW);
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const ID = 'rel01_athlete';
const STUB = fs.readFileSync(path.join(__dirname, 'stub.js'), 'utf8');
const ymd = d => d.toISOString().slice(0, 10);
const past = n => ymd(new Date(Date.now() - n * 86400000));   // 'YYYY-MM-DD', n days ago

function launch() {
  const exe = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  return chromium.launch(Object.assign({ args: ['--no-sandbox'] }, exe ? { executablePath: exe } : {}));
}

// The programme get_program answers: fixture.json (three cycles, currentCycleIndex 1, two days) plus
// the cases the working card needs: an intent pill, a Coach's Note, a Because, a jump, a hold, a carry
// with no Spine entry. The cycles are dated five weeks each, the current one started 10 days ago (week 2),
// as most live programmes are; fixture({ dated: false }) leaves them undated like the other few (Home
// then shows the small cycle line instead of the This cycle card).
function fixture({ dated = true } = {}) {
  const PROG = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.json'), 'utf8'));
  if (dated) {
    const DAY = 86400000, start = Date.now() - 10 * DAY;
    PROG.cycles.forEach((c, i) => {
      const s = start + (i - PROG.currentCycleIndex) * 35 * DAY;
      c.startDate = ymd(new Date(s));
      c.endDate = ymd(new Date(s + 34 * DAY));
    });
  }
  const day = PROG.workouts.days[0];
  const sq = day.blocks[1].exercises[0];
  sq.rx.rest = 150;
  sq.intent = 'max intent';
  sq.note = 'Stop the set if the left knee pinches. Leave two reps in the tank on the first set, then build slowly across the sets and never grind.';
  sq.why = { src: 'body', part: 'knee', text: 'Your squat is the base for every sprint start.' };
  day.blocks[1].exercises[1].intent = 'neutral grip · straps';
  day.blocks[1].exercises.unshift({ name: 'Box Jump', exId: 'box-jump', type: 'standard', rx: { sets: 3, reps: 4, rest: 90 } });
  day.blocks[2].exercises[0].note = 'Ribs down.';
  day.blocks[2].exercises.push({ name: 'Side Plank', exId: 'side-plank', type: 'standard', rx: { sets: 3, time: '30 s', side: true } });
  day.blocks[2].exercises.push({ name: 'Mystery Carry', type: 'standard', rx: { sets: 2, distance: '20 m' } });
  return PROG;
}

// A few approved Spine entries (the shape get_exercises() returns), stored as 'spinecache'.
const SPINE = [
  { id: 'barbell-back-squat', name: 'Barbell Back Squat', aliases: [], equipment: ['barbell', 'rack'], cues: { good: ['Brace before you unrack', 'Knees over the middle toes', 'Drive the floor away'], bad: ['Hips shooting up first'] }, video: 'https://www.youtube.com/watch?v=ultWZbUMPL8', purpose: 'Leg strength.' },
  { id: 'box-jump', name: 'Box Jump', aliases: [], equipment: ['box'], cues: { good: ['Land soft'], bad: [] }, purpose: 'Power.' },
  { id: 'dumbbell-bulgarian-split-squat', name: 'Dumbbell Bulgarian Split Squat', aliases: [], equipment: ['dumbbells', 'bench'], cues: { good: ['Back foot on the bench', 'Front shin vertical'], bad: [] }, video: 'https://youtu.be/2C-uNgKwPLE', purpose: 'Single leg.' },
  { id: 'half-kneeling-pallof-press', name: 'Half Kneeling Pallof Press', aliases: [], equipment: ['band'], cues: { good: ['Ribs down'], bad: [] }, purpose: 'Anti-rotation.' },
  { id: 'side-plank', name: 'Side Plank', aliases: [], equipment: ['floor'], cues: { good: ['Stack the hips'], bad: [] }, purpose: 'Lateral core.' },
];

// One finished session two days ago, stored as '<id>_histcache' (the shape of public.session_history).
const HISTORY = [
  { completed_on: past(2), day: '1', readiness: 4, log: [
    { ex: 'Barbell Back Squat', block: 'Strength', reps: 6, note: 'Last set grip went, knee fine',
      sets: [{ w: '70', n: 6, r: '6', d: true }, { w: '70', n: 6, r: '7', d: true }, { w: '70', n: 6, r: '7', d: true }, { w: '70', n: 5, r: '8', d: true }] },
    { ex: 'Box Jump', block: 'Strength', reps: 4, note: '', sets: [{ w: '', n: 4, r: '7', d: true }, { w: '', n: 4, r: '7', d: true }, { w: '', n: 3, r: '8', d: true }] },
    { ex: 'Half Kneeling Pallof Press', block: 'Core', reps: 10, note: '', sets: [{ w: '15', n: 10, r: '6', d: true }] },
  ] },
];

// What get_library() answers, built from the repo's workouts/ files (the database's copy of the Library, same
// fields): { workout: [{ id, title, banner, icon, items: [each session's JSON] }], article: [] }. Pass it as
// stub: { library: library() }; without it get_library answers nothing and the app falls back to workouts/index.json,
// which has no focusTag or countsAs.
function library() {
  const root = path.join(__dirname, '..', '..');
  const idx = JSON.parse(fs.readFileSync(path.join(root, 'workouts', 'index.json'), 'utf8'));
  return { workout: idx.categories.map(c => ({ id: c.id, title: c.title, banner: c.banner, icon: c.icon,
    items: (c.workouts || []).map(w => JSON.parse(fs.readFileSync(path.join(root, w.file), 'utf8'))) })), article: [] };
}

async function context(browser, opts) {
  const ctx = await browser.newContext({ viewport: { width: opts.w || 390, height: opts.h || 844 },
    isMobile: true, hasTouch: !!opts.touch, serviceWorkers: 'block' });
  // Only the local server: fonts, Plausible and the CDN fail fast, as they would with no signal.
  await ctx.route('**/*', r => r.request().url().startsWith(BASE + '/') ? r.continue() : r.abort());
  await ctx.addInitScript({ content: STUB });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e.message || e)));
  await p.goto(BASE + '/robots.txt');   // any page on the origin, to write its localStorage first
  return { ctx, p };
}

// program.html, signed in as the fixture athlete, past the loading screen. opts:
//   w, h, dark, touch · prog / spine / hist (instead of the fixtures) · stub (extra stub config, e.g.
//   { mode: 'offline' }) · seed: { '<key suffix>': value } stored under '<id><suffix>' (e.g.
//   { _setlog_Barbell_Back_Squat: [...] }) · fresh: true skips the welcome and install stand-downs.
async function openProgram(browser, opts = {}) {
  const { ctx, p } = await context(browser, opts);
  await p.evaluate(([prog, id, spine, hist, dark, seed, stub, fresh]) => {
    localStorage.clear();
    localStorage.setItem('__stubcfg', JSON.stringify(Object.assign({ mode: 'online', program: prog, session: { user: { id: 'u' } }, identity: id }, stub)));
    localStorage.setItem('sb-bvipfipbdcyqnbczjmaq-auth-token', '{}');
    localStorage.setItem('aa_athlete_id', id);
    localStorage.setItem('spinecache', JSON.stringify(spine));
    localStorage.setItem(id + '_histcache', JSON.stringify(hist));
    if (!fresh) { localStorage.setItem(id + '_welcomed', '1'); localStorage.setItem('a2hs_dismissed_v1', '1'); }
    if (dark) localStorage.setItem('dark_mode', '1');
    Object.entries(seed).forEach(([k, v]) => localStorage.setItem(id + k, typeof v === 'string' ? v : JSON.stringify(v)));
  }, [opts.prog || fixture(), ID, opts.spine || SPINE, opts.hist || HISTORY, !!opts.dark, opts.seed || {}, opts.stub || {}, !!opts.fresh]);
  await p.goto(BASE + '/program.html' + (opts.query || ''), { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
  await p.waitForTimeout(300);
  return { ctx, p };
}

// habits.html (AA Proof), signed in as the same athlete, rendered. opts: w, h, dark, touch (default
// on), prog, stub, cfg (merged into '<id>_hab_cfg'; the default is onboarded with the tour, install ask
// and board sweep done), seed, url ('/habits.html?embed=1' for Home's strip).
async function openProof(browser, opts = {}) {
  const { ctx, p } = await context(browser, Object.assign({ touch: true }, opts));
  const cfg = Object.assign({ onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() },
    opts.dark ? { dark: true } : {}, opts.cfg || {});   // CFG.dark is Proof's own theme switch
  await p.evaluate(([prog, id, cfg, seed, stub]) => {
    localStorage.clear();
    localStorage.setItem('__stubcfg', JSON.stringify(Object.assign({ mode: 'online', program: prog, session: { user: { id: 'u' } }, identity: id }, stub)));
    localStorage.setItem('sb-bvipfipbdcyqnbczjmaq-auth-token', '{}');
    localStorage.setItem(id + '_hab_cfg', JSON.stringify(cfg));
    Object.entries(seed).forEach(([k, v]) => localStorage.setItem(id + k, typeof v === 'string' ? v : JSON.stringify(v)));
  }, [opts.prog || fixture(), ID, cfg, opts.seed || {}, opts.stub || {}]);
  await p.goto(BASE + (opts.url || '/habits.html'), { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.getElementById('app') && document.getElementById('app').textContent.length > 200, null, { timeout: 20000 });
  await p.waitForTimeout(400);
  return { ctx, p };
}

// A card in the open day view, by exercise name, as an expression to use inside p.evaluate(`...`).
const card = nm => `[...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === ${JSON.stringify(nm)})`;

// PASS/FAIL lines and a total; report() prints them and returns the failure count.
function checker() {
  const out = []; let pass = 0, fail = 0;
  return {
    check(name, ok, detail) { ok ? pass++ : fail++; out.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  [' + String(detail).slice(0, 320) + ']' : '')); },
    report() { console.log(out.join('\n')); console.log(`\n${pass} passed, ${fail} failed`); return fail; },
  };
}

// --out <dir>, or a folder in the system temp directory.
function outDir() {
  const i = process.argv.indexOf('--out');
  const dir = i > 0 && process.argv[i + 1] ? process.argv[i + 1] : path.join(os.tmpdir(), 'headless-shots');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = { BASE, ID, STUB, launch, fixture, SPINE, HISTORY, library, openProgram, openProof, card, checker, outDir, past };
