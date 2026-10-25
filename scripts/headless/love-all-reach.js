// Love All round 2, L5 and L6 (2026-10-24, Amir picked direction A: "every control keeps its look, its tap area grows to 44 px, and the faint
// greys darken until they pass 4.5:1"):
//   L5  tap areas. Each small control keeps its DRAWN size and look; only its hit area grows to 44 x 44 (a transparent ::before box).
//       The check is the athlete's: document.elementFromPoint at the control's centre and 20 px out in each direction resolves to that
//       control (or inside it, or its label), at 320, 360 and 390 px wide, light and dark. Where two controls sit closer than 44 apart the
//       probe stops half way between them (their areas must not overlap). And the drawn box is the same size it was before the change.
//   L6  contrast (a later commit adds it here).
// Serve the repo first (python -m http.server 8825 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then:
//   node scripts/headless/love-all-reach.js
'use strict';
const H = require('./lib');
const C = require('./career');

const t = H.checker();
const WIDTHS = [320, 360, 390];

// ═════════ scenes: each opens the app on the screen that draws the controls and says which selectors to probe ═════════
const HAB_CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const loc = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

async function demo(browser, w, dark) {
  const P = H.fixture();
  const o = await H.openProgram(browser, { w, h: 700, dark, prog: P, query: '?client=demo', stub: { demo: P } });
  await o.p.waitForTimeout(400);
  return Object.assign(o, { sels: ['.demo-banner-exit', '.demo-banner-cta'] });
}
async function home(browser, w, dark) {
  const o = await H.openProgram(browser, { w, h: 800, dark, seed: { _hab_cfg: HAB_CFG } });
  await o.p.evaluate(() => goTo('home'));
  await o.p.waitForTimeout(700);
  return Object.assign(o, { sels: ['#home-overview .hb-day', '#home-overview .hb-step', '#home-overview .today-go'] });
}
const goStep = (p, name, setI = 0) => p.evaluate(([n, s]) => { const i = STEP.seq.findIndex(x => x.name === n && x.setI === s); STEP.pos = i; renderStep(); return i; }, [name, setI]);
async function guided(browser, w, dark) {
  const o = await H.openProgram(browser, { w, h: 800, dark });
  o.p.setDefaultTimeout(8000);
  await o.p.evaluate(() => { openDayView('1'); openStepMode('1'); });
  await o.p.waitForTimeout(350);
  await o.p.evaluate(() => { if (STEP && STEP.seq[STEP.pos].group) stepPrimary(); });
  await o.p.waitForTimeout(250);
  await goStep(o.p, 'Barbell Back Squat');
  await o.p.waitForTimeout(250);
  await o.p.click('#step-footer .step-primary-btn');   // Done · Start Rest: the rest band opens with the log of the set
  await o.p.waitForTimeout(600);
  return Object.assign(o, { sels: ['#timerLog .tl-rpe-btn', '#timerLog .tl-unit'] });
}
async function guidedRound(browser, w, dark) {   // Guided on a circuit: each round asks for its RPE on a row of five keys
  const P = H.fixture();
  P.workouts.days[0].blocks.push({ title: 'Conditioning', exercises: [{ type: 'circuit', name: 'Engine', rx: { rounds: 3, rest: 60 }, items: [{ name: 'Kettlebell Swing', rx: { reps: 12 } }] }] });
  const o = await H.openProgram(browser, { w, h: 800, dark, prog: P });
  await o.p.evaluate(() => { openDayView('1'); openStepMode('1'); });
  await o.p.waitForTimeout(350);
  await o.p.evaluate(() => { STEP.pos = STEP.seq.findIndex(x => /Engine|Kettlebell/.test(x.name)); renderStep(); });
  await o.p.waitForTimeout(300);
  return Object.assign(o, { sels: ['.step-scroll .rpe-row.step-current .rpe-btn'], grow: true });
}
async function logBoxes(browser, w, dark) {
  const o = await H.openProgram(browser, { w, h: 800, dark });
  await o.p.evaluate(() => { openDayView('1'); const c = document.querySelector('#day-view .checklist-item'); });
  await o.p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; if (c.classList.contains('collapsed')) toggleExpand(c); c.scrollIntoView({ block: 'center' }); })()`);
  await o.p.waitForTimeout(500);
  return Object.assign(o, { sels: ['#day-view .ex-set-unit'] });
}
async function share(browser, w, dark) {
  // highlight-reel.js's set-up: a Personal Record to share (its squat is a strength pattern so a record files itself)
  const DAY = 86400000, today = loc(new Date());
  const seed = { _1rm: [{ lift: 'Barbell Back Squat', kg: 105, w: 90, r: 5, rpe: 9, d: loc(new Date(Date.now() - 30 * DAY)), t: 1 },
    { lift: 'Barbell Back Squat', kg: 117.5, w: 100, r: 5, rpe: 9, d: today, t: 0, auto: true }],
    _ceil_best: { lift: 'Barbell Back Squat', kg: 117.5, prev: 105, d: today, t: Date.now(), i: 0 } };
  const spine = H.SPINE.map(e => e.id === 'barbell-back-squat' ? Object.assign({}, e, { pattern: 'squat', impact: 'none' }) : e);
  const o = await H.openProgram(browser, { w, h: 800, dark, hist: [], spine, seed });
  await o.p.evaluate(() => renderCeilingLift('Barbell Back Squat'));
  await o.p.waitForTimeout(300);
  await o.p.click('.ceil-pr .ceil-pr-share');
  await o.p.waitForFunction(() => { const i = document.getElementById('hl-img'), s = document.getElementById('hl-share'); return i && /^blob:/.test(i.getAttribute('src') || '') && s && !s.disabled; }, null, { timeout: 20000 });
  await o.p.evaluate(() => { document.getElementById('hl-ph-on').hidden = false; });   // the zoom row is drawn once a photo is chosen
  await o.p.waitForTimeout(200);
  return Object.assign(o, { sels: ['#hl-ph-z'], drawn: ['.hl-ph-z'] });
}
const NOW = Date.now(), iso = ms => new Date(ms).toISOString();
async function crewSwitches(browser, w, dark) {
  const bell = { athlete_id: H.ID, at: iso(NOW), days: 7, kinds: ['level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open'],
    me: { answer: 'yes', name: 'Alex R.', on_board: true, under13: false, can_post: true, photos_left: 3, posts_left: 10, kinds: {} }, honours: { month: '2026-09-01', rows: [] }, items: [] };
  const o = await H.openProgram(browser, { w, h: 800, dark, stub: { board: [], bell } });
  await o.p.waitForFunction(() => !!document.querySelector('#global-tabs .nav-item[data-tab="crew"]'), null, { timeout: 8000 });
  await o.p.evaluate(() => openCrewSettings());
  await o.p.waitForTimeout(400);
  return Object.assign(o, { sels: ['#hist-overlay .cr-sw input'], label: true });
}
async function moments(browser, w, dark) {
  const prof = C.rwProfile(10000);
  const stub = { tables: { career_rules: C.RW_RULES, career_facts: [], career_catalogue: C.catRows() }, profile: prof, awards: C.rwShelf(prof), myMoments: C.myMomentsFx() };
  const o = await H.openProgram(browser, { w, h: 800, dark, hist: [], stub, seed: { _hab_cfg: HAB_CFG } });
  await o.p.waitForTimeout(900);
  await o.p.evaluate(() => goTo('moments'));
  await o.p.waitForTimeout(800);
  return Object.assign(o, { sels: ['.mo-reply'] });
}
const SCENES = { demo, home, guided, guidedRound, logBoxes, share, crewSwitches, moments };

// ═════════ the probe, run in the page ═════════
// For every visible match of every selector: centre, then a point `d` px out up / down / left / right, where d is 20 or, if another probed
// control's centre sits closer than 2 x 20 that way, a hair under half the gap (their hit areas then meet but never overlap). The element
// at each point must be the control, inside it, or (a checkbox) inside its own label. Also returns each control's drawn box.
const PROBE = opt => {
  const { sels, label } = opt;
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const all = [];
  sels.forEach(s => document.querySelectorAll(s).forEach(e => { if (vis(e)) all.push({ e, s }); }));
  // every other control on the screen counts as a neighbour the area must stop short of (a field, a row's own button), not only the probed ones
  const ctl = [...document.querySelectorAll('button, a[href], input, select, textarea, summary, [role=button], [role=switch]')].filter(vis);
  const out = [], notes = [];
  for (const { e, s } of all) {
    e.scrollIntoView({ block: 'center', inline: 'center' });
    const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const lbl = e.closest('label');
    const others = ctl.filter(o => o !== e && !e.contains(o) && !o.contains(e) && !(lbl && lbl.contains(o))).map(o => { const q = o.getBoundingClientRect(); return { cx: q.left + q.width / 2, cy: q.top + q.height / 2, w: q.width, h: q.height, l: q.left, r: q.right, t: q.top, b: q.bottom, probed: all.some(a => a.e === o) }; });
    const ok = x => { const el = document.elementFromPoint(x[0], x[1]); if (!el) return false; if (el === e || e.contains(el)) return true; const lb = e.closest('label'); return !!(label && lb && lb.contains(el)); };
    const dirs = { c: [0, 0], r: [1, 0], l: [-1, 0], d: [0, 1], u: [0, -1] }, bad = [];
    for (const k in dirs) {
      const [dx, dy] = dirs[k];
      let d = 20;
      if (k !== 'c') {
        for (const o of others) {
          const along = dx ? (o.cx - cx) * dx : (o.cy - cy) * dy, cross = dx ? Math.abs(o.cy - cy) : Math.abs(o.cx - cx), span = dx ? (r.height + o.h) / 2 : (r.width + o.w) / 2;
          if (along > 0 && cross < span - 1) {   // a control that way, side by side with this one
            const hs = (dx ? r.width : r.height) / 2, ho = (dx ? o.w : o.h) / 2, gap = along - hs - ho;
            if (gap < 0) continue;                // it overlaps the drawn box (a field the button is drawn on): not a neighbour to keep clear of
            const lim = Math.max(1, Math.floor(hs + gap / 2) - 1);   // half way across the gap between the two drawn boxes
            if (lim < d) { d = lim; notes.push(k + ' of ' + s + ' stops at ' + lim + ' px (a control ' + Math.round(gap) + ' px away)'); }
          }
        }
      }
      const x = [cx + dx * d, cy + dy * d];
      if (x[0] < 0 || x[1] < 0 || x[0] >= innerWidth || x[1] >= innerHeight) continue;
      if (!ok(x)) { const hit = document.elementFromPoint(x[0], x[1]); bad.push(k + d + '->' + (hit ? hit.tagName + '.' + String(hit.className).slice(0, 24) : 'null')); }
    }
    out.push({ s, drawn: Math.round(r.width * 2) / 2 + 'x' + Math.round(r.height * 2) / 2, bad });
  }
  // and no control on the screen lost its own centre to an extension (a new hit box that took a neighbour's tap)
  const stolen = [];
  for (const c of ctl) {
    c.scrollIntoView({ block: 'center', inline: 'center' });
    const r = c.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
    const el = document.elementFromPoint(x, y), lb = c.closest('label');
    if (!el || el === c || c.contains(el) || (lb && lb.contains(el)) || el.contains(c)) continue;
    // lost to one of the probed controls (its new hit box), not to an overlay that was always on top of it
    const thief = all.find(a => a.e === el || a.e.contains(el));
    const q = thief && thief.e.getBoundingClientRect();
    if (thief && !(x >= q.left && x <= q.right && y >= q.top && y <= q.bottom)) stolen.push((c.className || c.tagName) + ' -> ' + thief.s);
  }
  const drawn = (opt.drawn || opt.sels).map(s => [...document.querySelectorAll(s)].filter(vis).map(e => { const r = e.getBoundingClientRect(); return s + ' ' + Math.round(r.width * 2) / 2 + 'x' + Math.round(r.height * 2) / 2; })).flat().join(', ');
  return { out, notes, stolen, drawn };
};

// The DRAWN boxes before this change (each control's width x height, measured at the commit before, light theme), per scene and viewport width.
// A control keeps its look: the same boxes must come back. (node scripts/headless/love-all-reach.js --record prints a fresh table.)
const DRAWN = {
 "demo@320": ".demo-banner-exit 35.5x15.5, .demo-banner-cta 58.5x25.5",
 "demo@360": ".demo-banner-exit 35.5x15.5, .demo-banner-cta 58.5x25.5",
 "demo@390": ".demo-banner-exit 35.5x15.5, .demo-banner-cta 58.5x25.5",
 "home@320": "#home-overview .hb-day 33x37.5, #home-overview .hb-day 30x37.5, #home-overview .hb-day 24.5x37.5, #home-overview .hb-day 40x37.5, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .today-go 32x32",
 "home@360": "#home-overview .hb-day 33x37.5, #home-overview .hb-day 31x37.5, #home-overview .hb-day 31x37.5, #home-overview .hb-day 40x37.5, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .today-go 32x32",
 "home@390": "#home-overview .hb-day 41.5x37.5, #home-overview .hb-day 41.5x37.5, #home-overview .hb-day 41.5x37.5, #home-overview .hb-day 41.5x37.5, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .hb-step 34x34, #home-overview .today-go 32x32",
 "guided@320": "#timerLog .tl-rpe-btn 46.5x48, #timerLog .tl-rpe-btn 46.5x48, #timerLog .tl-rpe-btn 46.5x48, #timerLog .tl-rpe-btn 46.5x48, #timerLog .tl-rpe-btn 46.5x48, #timerLog .tl-unit 36x44",
 "guided@360": "#timerLog .tl-rpe-btn 51x48, #timerLog .tl-rpe-btn 51x48, #timerLog .tl-rpe-btn 51x48, #timerLog .tl-rpe-btn 51x48, #timerLog .tl-rpe-btn 51x48, #timerLog .tl-unit 36x44",
 "guided@390": "#timerLog .tl-rpe-btn 57x48, #timerLog .tl-rpe-btn 57x48, #timerLog .tl-rpe-btn 57x48, #timerLog .tl-rpe-btn 57x48, #timerLog .tl-rpe-btn 57x48, #timerLog .tl-unit 36x44",
 "guidedRound@320": ".step-scroll .rpe-row.step-current .rpe-btn 29.5x44, .step-scroll .rpe-row.step-current .rpe-btn 29.5x44, .step-scroll .rpe-row.step-current .rpe-btn 29.5x44, .step-scroll .rpe-row.step-current .rpe-btn 29.5x44, .step-scroll .rpe-row.step-current .rpe-btn 29.5x44",
 "guidedRound@360": ".step-scroll .rpe-row.step-current .rpe-btn 37.5x44, .step-scroll .rpe-row.step-current .rpe-btn 37.5x44, .step-scroll .rpe-row.step-current .rpe-btn 37.5x44, .step-scroll .rpe-row.step-current .rpe-btn 37.5x44, .step-scroll .rpe-row.step-current .rpe-btn 37.5x44",
 "guidedRound@390": ".step-scroll .rpe-row.step-current .rpe-btn 43.5x44, .step-scroll .rpe-row.step-current .rpe-btn 43.5x44, .step-scroll .rpe-row.step-current .rpe-btn 43.5x44, .step-scroll .rpe-row.step-current .rpe-btn 43.5x44, .step-scroll .rpe-row.step-current .rpe-btn 43.5x44",
 "logBoxes@320": "#day-view .ex-set-unit 41x44",
 "logBoxes@360": "#day-view .ex-set-unit 41x44",
 "logBoxes@390": "#day-view .ex-set-unit 41x44",
 "share@320": ".hl-ph-z 288x16",
 "share@360": ".hl-ph-z 320x16",
 "share@390": ".hl-ph-z 350x16",
 "crewSwitches@320": "#hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24",
 "crewSwitches@360": "#hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24",
 "crewSwitches@390": "#hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24, #hist-overlay .cr-sw input 24x24",
 "moments@320": ".mo-reply 110.5x25, .mo-reply 110.5x25",
 "moments@360": ".mo-reply 110.5x25, .mo-reply 110.5x25",
 "moments@390": ".mo-reply 110.5x25, .mo-reply 110.5x25"
};

const NOTES = new Set();
async function l5(browser, record) {
  const got = {};
  for (const name of Object.keys(SCENES)) {
    for (const w of WIDTHS) {
      for (const dark of [false, true]) {
        const o = await SCENES[name](browser, w, dark);
        await o.p.evaluate(() => document.fonts.ready);
        await o.p.waitForTimeout(150);
        const res = await o.p.evaluate(`(${PROBE.toString()})(${JSON.stringify({ sels: o.sels, label: !!o.label, drawn: o.drawn || null })})`);
        const tag = `${name} ${w}px${dark ? ' dark' : ''}`;
        res.notes.forEach(n => NOTES.add(name + ' ' + w + ': ' + n));
        t.check(`L5 ${tag}: the controls are drawn (${o.sels.join(', ')})`, res.out.length > 0, res.out.length);
        const badAll = res.out.map((r, i) => r.bad.length ? `#${i} ${r.s} ${r.drawn}: ${r.bad.join(' ')}` : '').filter(Boolean);
        t.check(`L5 ${tag}: all ${res.out.length} resolve to themselves at the centre and 20 px out each way`, res.out.length > 0 && badAll.length === 0, badAll.slice(0, 4).join(' | '));
        t.check(`L5 ${tag}: no other control on the screen lost its own centre`, res.stolen.length === 0, res.stolen.slice(0, 4).join(' | '));
        if (!dark) {
          const key = `${name}@${w}`;
          got[key] = res.drawn;
          // the Guided round's keys were 29 px wide because the words left them no room; they may get wider (their drawing is the same), never smaller or taller
          const same = o.grow
            ? (() => { const a = (DRAWN[key] || '').match(/(\d+(\.\d+)?)x(\d+(\.\d+)?)/g) || [], b = res.drawn.match(/(\d+(\.\d+)?)x(\d+(\.\d+)?)/g) || [];
                return a.length > 0 && a.length === b.length && a.every((s, i) => { const [w0, h0] = s.split('x').map(Number), [w1, h1] = b[i].split('x').map(Number); return h1 === h0 && w1 >= w0; }); })()
            : DRAWN[key] === res.drawn;
          if (!record) t.check(`L5 ${tag}: the drawn boxes are the ones they were before${o.grow ? ' (or wider)' : ''}`, same, 'was ' + DRAWN[key] + ' now ' + res.drawn);
        }
        t.check(`L5 ${tag}: no page errors`, o.p.errs.length === 0, o.p.errs.join(' | '));
        await o.ctx.close();
      }
    }
  }
  if (record) console.log('const DRAWN = ' + JSON.stringify(got, null, 1) + ';');
}

// ═════════ L6: contrast ═════════
// WCAG 2.x contrast of every text element as the athlete sees it. The text colour is the element's computed colour (the placeholder's, for an empty
// field) with every opacity up the tree applied; the background is read from the PIXELS of the page with the text itself made transparent, so a
// gradient, a disc drawn by a pseudo-element or a dimmed row is judged on what is really behind the letters (the worst of up to 60 samples). Large
// text (24 px, or bold 18.66 px) needs 3:1, the rest 4.5:1.
// (and every transition and animation is jumped to its end, so a card half way to green is not measured)
const STILL = '*, *::before, *::after { transition-duration: 0s !important; transition-delay: 0s !important; animation-duration: 0s !important; animation-delay: 0s !important; }';
const HIDE_TEXT = '*, *::placeholder { -webkit-text-fill-color: transparent !important; text-shadow: none !important; } ::placeholder { color: transparent !important; opacity: 1 !important; }';
const COLLECT = ({ rootSel }) => {
  const root = document.querySelector(rootSel) || document.body, out = [], seen = new Set();
  const shown = e => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let x = e; x; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
  const path = e => { const p = []; for (let x = e; x && x !== document.body && p.length < 4; x = x.parentElement) p.unshift(x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + (typeof x.className === 'string' && x.className.trim() ? '.' + x.className.trim().split(/\s+/).slice(0, 2).join('.') : '')); return p.join(' > '); };
  const need = e => { const cs = getComputedStyle(e), px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700; return (px >= 24 || (bold && px >= 18.66)) ? 3 : 4.5; };
  const opac = e => { let o = 1; for (let x = e; x; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity); return o; };
  window.__els = [];
  const add = (e, node, text, color, ph) => { window.__els.push({ e, node, ph }); out.push({ i: window.__els.length - 1, el: path(e) + (ph ? '::placeholder' : ''), text: text.trim().slice(0, 30), color, op: opac(e), need: need(e), size: getComputedStyle(e).fontSize,
    off: !!(e.disabled || e.closest('button:disabled, fieldset:disabled')) }); };
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) {
    const e = n.parentElement;
    if (!e || seen.has(e) || !n.textContent.trim() || /^(SCRIPT|STYLE|NOSCRIPT|OPTION)$/.test(e.tagName) || !shown(e)) continue;
    if (n.textContent.trim().length <= 2 && /\p{Extended_Pictographic}/u.test(n.textContent)) continue;   // an emoji icon (⏸ ▶ ⏱) is a picture, drawn in its own colours
    seen.add(e);
    add(e, n, n.textContent, getComputedStyle(e).color, false);
  }
  root.querySelectorAll('input, textarea').forEach(e => { if (!e.value && e.placeholder && shown(e)) add(e, null, e.placeholder, getComputedStyle(e, '::placeholder').color, true); });
  return out;
};
// scroll item i to the middle of its scroller; its text box in viewport coordinates, or null when something else covers it
const BOX = i => {
  const { e, node, ph } = window.__els[i];
  e.scrollIntoView({ block: 'center', inline: 'center' });
  let r;
  if (node) { const rg = document.createRange(); rg.selectNodeContents(node); const rs = [...rg.getClientRects()].filter(q => q.width > 0.5 && q.height > 0.5); if (!rs.length) return null; r = rs[0]; }
  else { const q = e.getBoundingClientRect(); r = { left: q.left + 6, top: q.top + 4, width: Math.max(1, q.width - 12), height: Math.max(1, q.height - 8) }; }
  const x = Math.max(0, Math.floor(r.left)), y = Math.max(0, Math.floor(r.top)), w = Math.min(innerWidth, Math.ceil(r.left + r.width)) - x, h = Math.min(innerHeight, Math.ceil(r.top + r.height)) - y;
  if (w < 2 || h < 2) return null;
  // something else on top of it (the tab bar, a toast) means the pixels are not its own; a layer inside the same few ancestors is its own card
  const hit = document.elementFromPoint(x + w / 2, y + h / 2);
  let near = false; for (let a = e, n = 0; a && n < 5; a = a.parentElement, n++) if (a.contains(hit)) { near = true; break; }
  if (!hit || !near) return null;
  return { x, y, width: w, height: h };
};
// items [{color, op}] and their screenshots (text hidden) as base64: the worst ratio each, and the colours it was between
const ANALYSE = async ({ items, shots }) => {
  const cv = document.createElement('canvas').getContext('2d');
  const rgba = s => { const m = String(s).match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,\/]+([\d.%]+))?\s*\)/); if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : (String(m[4]).endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]))];
    cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = s; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const res = [];
  for (let k = 0; k < items.length; k++) {
    const img = new Image(); img.src = 'data:image/png;base64,' + shots[k]; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, fg = rgba(items[k].color), a = fg[3] * items[k].op;
    let worst = Infinity, wf = null, wb = null;
    const nx = Math.min(c.width, 12), ny = Math.min(c.height, 5);
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const px = Math.min(c.width - 1, Math.floor((ix + 0.5) * c.width / nx)), py = Math.min(c.height - 1, Math.floor((iy + 0.5) * c.height / ny)), o = (py * c.width + px) * 4;
      const b = [d[o], d[o + 1], d[o + 2]], f = [0, 1, 2].map(j => a * fg[j] + (1 - a) * b[j]), r = ratio(f, b);
      if (r < worst) { worst = r; wf = f.map(Math.round); wb = b; }
    }
    res.push({ ratio: Math.round(worst * 100) / 100, fg: wf, bg: wb });
  }
  return res;
};
const hex = c => c ? '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase() : '?';
// every text element under `rootSel`, with its ratio
async function measureAll(p, rootSel) {
  await p.addStyleTag({ content: STILL });
  await p.waitForTimeout(300);
  const items = await p.evaluate(`(${COLLECT.toString()})(${JSON.stringify({ rootSel })})`);
  await p.addStyleTag({ content: HIDE_TEXT });
  const keep = [], shots = [];
  for (const it of items) {
    const box = await p.evaluate(`(${BOX.toString()})(${it.i})`);
    if (!box) continue;
    shots.push((await p.screenshot({ clip: box })).toString('base64'));
    keep.push(it);
  }
  const res = shots.length ? await p.evaluate(`(${ANALYSE.toString()})(${JSON.stringify({ items: keep, shots })})`) : [];
  return keep.map((it, k) => Object.assign({}, it, res[k], { fgHex: hex(res[k].fg), bgHex: hex(res[k].bg) }));
}
// A disabled control is exempt in WCAG (1.4.3), and a glyph that is exactly its background (ratio ~1) is one the page paints over on purpose (the number
// inside a filled disc, the play triangle under its disc): both are counted, not failed.
const failing = rows => rows.filter(r => r.ratio < r.need && !r.off && r.ratio >= 1.05);
const exempt = rows => rows.filter(r => r.ratio < r.need && (r.off || r.ratio < 1.05));

async function l6(browser) {
  const left = new Map(), all = {};
  const scenes = {
    'a card, open': async (w, dark) => {
      const o = await H.openProgram(browser, { w, h: 844, dark });
      await o.p.evaluate(`(() => { openDayView('1'); const c = ${H.card('Barbell Back Squat')}; if (c.classList.contains('collapsed')) toggleExpand(c); c.scrollIntoView({ block: 'center' }); })()`);
      await o.p.waitForTimeout(600);
      return { ...o, root: '#day-view' };
    },
    Home: async (w, dark) => {
      const o = await H.openProgram(browser, { w, h: 844, dark, seed: { _hab_cfg: HAB_CFG } });
      await o.p.evaluate(() => goTo('home')); await o.p.waitForTimeout(800);
      return { ...o, root: '#screen-home' };
    },
    Progress: async (w, dark) => {
      const o = await H.openProgram(browser, { w, h: 844, dark, seed: { _hab_cfg: HAB_CFG } });
      await o.p.evaluate(() => goTo('plan')); await o.p.waitForTimeout(800);
      return { ...o, root: '#screen-plan' };
    },
    Guided: async (w, dark) => {
      const o = await H.openProgram(browser, { w, h: 844, dark });
      await o.p.evaluate(() => { openDayView('1'); openStepMode('1'); }); await o.p.waitForTimeout(350);
      await o.p.evaluate(() => { if (STEP && STEP.seq[STEP.pos].group) stepPrimary(); }); await o.p.waitForTimeout(250);
      await goStep(o.p, 'Barbell Back Squat'); await o.p.waitForTimeout(300);
      await o.p.evaluate(() => document.querySelectorAll('#stepOverlay details.note-row').forEach(d => { d.open = true; }));   // the Note is open, so its box is drawn (closed, Chrome still gives it a size and it sat under the footer)
      return { ...o, root: '#stepOverlay' };
    },
    'the finish card': async (w, dark) => {
      const o = await H.openProgram(browser, { w, h: 844, dark });
      await o.p.evaluate(() => openDayView('1')); await o.p.waitForTimeout(300);
      const n = await o.p.evaluate(() => document.querySelectorAll('#day1 .checklist-item').length);
      for (let i = 0; i < n; i++) { await o.p.evaluate(i => { const c = document.querySelectorAll('#day1 .checklist-item')[i]; if (c.classList.contains('collapsed')) toggleExpand(c); if (!c.classList.contains('checked')) toggleCheckOnly(c, '1'); }, i); await o.p.waitForTimeout(80); }
      await o.p.evaluate(() => { hideAaToast(); document.getElementById('confirm-1').scrollIntoView({ block: 'center' }); }); await o.p.waitForTimeout(500);
      return { ...o, root: '#confirm-1' };
    },
    'a circuit round in Guided': async (w, dark) => { const o = await guidedRound(browser, w, dark); return { ...o, root: '#stepOverlay' }; },
    'the demo banner': async (w, dark) => { const o = await demo(browser, w, dark); return { ...o, root: '#demo-banner' }; },
    'the session bar': async (w, dark) => {
      const o = await H.openProgram(browser, { w, h: 844, dark });
      await o.p.evaluate(() => openDayView('1')); await o.p.waitForTimeout(300);
      await o.p.evaluate(() => startTimerNow('1')); await o.p.waitForTimeout(600);
      return { ...o, root: '#timer-1' };
    },
    'the session bar, ⋯ open': async (w, dark) => {
      const o = await H.openProgram(browser, { w, h: 844, dark });
      await o.p.evaluate(() => openDayView('1')); await o.p.waitForTimeout(300);
      await o.p.evaluate(() => startTimerNow('1')); await o.p.waitForTimeout(500);
      await o.p.evaluate(() => toggleBarMore('1')); await o.p.waitForTimeout(500);
      return { ...o, root: '#timer-1' };
    },
    Library: async (w, dark) => {
      const o = await H.openProgram(browser, { w, h: 844, dark, stub: { library: H.library() } });
      await o.p.evaluate(() => goTo('workouts')); await o.p.waitForTimeout(900);
      return { ...o, root: '#screen-workouts' };
    },
    'a notice (Got it)': async (w, dark) => {
      const o = await H.openProgram(browser, { w, h: 844, dark });
      await o.p.evaluate(() => aaToast('Check the weight. 80 kg looks like a lot more than last time.', { kicker: 'Check the weight', action: 'Keep it', dismiss: 'Got it', ms: 0 })); await o.p.waitForTimeout(500);
      return { ...o, root: '#aaToast' };
    },
    'a first-session hint': async (w, dark) => {
      const P = H.fixture();   // the demo is always someone new, so the hints show (onbVeteran())
      const o = await H.openProgram(browser, { w, h: 844, dark, fresh: true, hist: [], prog: P, query: '?client=demo', stub: { demo: P } });
      await o.p.evaluate(() => openDayView('1')); await o.p.waitForTimeout(300);
      await o.p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; if (c.classList.contains('collapsed')) toggleExpand(c); })()`); await o.p.waitForTimeout(900);
      return { ...o, root: '#day-view' };
    },
    'the early finish': async (w, dark) => {
      const o = await H.openProgram(browser, { w, h: 844, dark });
      await o.p.evaluate(() => {   // early-why.js's way in: three cards ticked, then the early step
        openDayView('1');
        [...document.querySelectorAll('#day1 .checklist-item')].slice(0, 3).forEach(c => { if (!c.classList.contains('checked')) toggleCheckOnly(c, '1'); });
        try { hideAaToast(); } catch (e) {}
        finishEarlyStep('1');
        document.getElementById('confirm-1').scrollIntoView({ block: 'center' });
      });
      await o.p.waitForTimeout(600);
      return { ...o, root: '#confirm-1' };
    },
  };
  for (const [name, open] of Object.entries(scenes)) {
    for (const dark of [false, true]) {
      const o = await open(390, dark);
      const rows = await measureAll(o.p, o.root);
      if (process.env.ROWS && new RegExp(process.env.ROWS).test(name)) rows.forEach(r => console.log('ROW', name, dark ? 'dark' : 'light', r.ratio, r.fgHex, r.bgHex, r.size, JSON.stringify(r.text), r.el.slice(-60)));
      const bad = failing(rows);
      bad.forEach(r => left.set(`${name}${dark ? ' (dark)' : ''} | ${r.el} | "${r.text}"`, `${r.ratio}:1 needs ${r.need}, ${r.fgHex} on ${r.bgHex}, ${r.size}`));
      t.check(`L6 sweep ${name}${dark ? ' dark' : ''}: ${rows.length} text elements measured (${exempt(rows).length} exempt)`, rows.length > 0, rows.length);
      all[name + (dark ? '#dark' : '')] = rows;
      await o.ctx.close();
    }
  }
  // ── the audit's list: each of these must be there to measure, and must pass, in the light theme and the dark one ──
  const must = (what, scene, pick, label) => {
    for (const dark of [false, true]) {
      const rows = (all[scene + (dark ? '#dark' : '')] || []).filter(pick);
      const low = rows.filter(r => r.ratio < r.need);
      t.check(`L6 ${what}${dark ? ' (dark)' : ''}: ${rows.length} measured, all at ${rows[0] ? rows[0].need : '4.5'}:1 or more`, rows.length > 0 && low.length === 0,
        rows.length ? (low.length ? low.map(r => `${r.text} ${r.ratio}:1 ${r.fgHex} on ${r.bgHex}`).join(' | ') : 'worst ' + Math.min(...rows.map(r => r.ratio)) + ':1') : 'nothing found: ' + (label || ''));
    }
  };
  const el = re => r => re.test(r.el);
  must('the placeholders in the boxes of sets still to come', 'Guided', r => /ex-set-row\.dim/.test(r.el) && /::placeholder/.test(r.el));
  must('a set still to come: its number and its LAST caption', 'Guided', r => /ex-set-row\.dim/.test(r.el) && /ex-set-num|lt-ghost/.test(r.el));
  must('a circuit round still to come: its words and its keys', 'a circuit round in Guided', el(/rpe-row\.dim/));
  must('the tempo digit on the green card head', 'a card, open', el(/t-hot/));
  must('the clay tag on the early card\'s green', 'the early finish', el(/confirm-missing-tag/));
  must('the session bar\'s ⋯ with its menu open', 'the session bar, ⋯ open', r => r.text === '⋯');
  must('the session bar\'s ⋯', 'the session bar', r => r.text === '⋯');
  must('the Library counts', 'Library', el(/lib-tab-n/));
  must('"Got it" on the first-session hint', 'a first-session hint', r => r.text === 'Got it');
  must('"Got it" on the notice', 'a notice (Got it)', r => r.text === 'Got it');
  must('the ring\'s word and the › on Home\'s habit card', 'Home', r => /today-mid > span|today-go/.test(r.el));
  must('Apply in the demo banner', 'the demo banner', r => r.text === 'Apply');
  must('"What stopped you?" and Optional on the early finish', 'the early finish', r => /ew-q/.test(r.el));
  must('the notes box\'s placeholder', 'Guided', el(/textarea::placeholder/));
  must('Guided\'s eyebrow on its green bar', 'Guided', el(/step-eyebrow/));
  return left;
}

// The chevron beside each exercise's name is not a control of its own: it is a pseudo-element on the name, and the whole row is the tap (onExerciseRowTap).
// So its tap area is the row's, and a tap ON the chevron (and 20 px each side of it) opens the card.
async function chevron(browser) {
  for (const w of WIDTHS) {
    const { ctx, p } = await H.openProgram(browser, { w, h: 800 });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(400);
    const info = await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; c.scrollIntoView({ block: 'center' }); const n = c.querySelector('.item-name'), tail = n.querySelector('.nm-tail') || n;
      const a = getComputedStyle(tail, '::after'), rs = tail.getClientRects(), r = rs[rs.length - 1];
      return { pseudo: a.content !== 'none' && a.content !== 'normal', w: a.width, h: a.height, own: !!n.querySelector('button, a, [role=button]'), collapsed: c.classList.contains('collapsed'), x: r.right - 9, y: r.top + r.height / 2 }; })()`);
    t.check(`L5 chevron ${w}px: it is the name's pseudo-element, not a control of its own`, info.pseudo && !info.own && info.collapsed, JSON.stringify(info));
    const hit = await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; const n = c.querySelector('.item-name'), tail = n.querySelector('.nm-tail') || n, rs = tail.getClientRects(), r = rs[rs.length - 1];
      return [-20, 0, 20].map(dx => { const e = document.elementFromPoint(r.right - 9 + dx, r.top + r.height / 2); return !!e && c.contains(e); }); })()`);
    t.check(`L5 chevron ${w}px: the points on and 20 px either side of it are inside the exercise's row`, hit.every(Boolean), JSON.stringify(hit));
    await p.mouse.click(info.x, info.y);
    await p.waitForTimeout(500);
    t.check(`L5 chevron ${w}px: a tap on the chevron opens the card`, await p.evaluate(`!${H.card('Barbell Back Squat')}.classList.contains('collapsed')`));
    await ctx.close();
  }
}

if (require.main !== module) { module.exports = { SCENES }; return; }
(async () => {
  const browser = await H.launch();
  const only = process.argv.includes('--l6');
  if (!only) { await l5(browser, process.argv.includes('--record')); await chevron(browser); }
  const left = await l6(browser);
  console.log('Text under its contrast target that nothing in L6 asks to change (' + left.size + '):\n  ' + [...left].map(([k, v]) => k + ' => ' + v).join('\n  '));
  if (NOTES.size) console.log('Where a touch area stops short of 20 px because another control is close:\n  ' + [...NOTES].join('\n  '));
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

