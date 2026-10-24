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
 "logBoxes@320": "#day-view .ex-set-unit 39x44",
 "logBoxes@360": "#day-view .ex-set-unit 39x44",
 "logBoxes@390": "#day-view .ex-set-unit 39x44",
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
  await l5(browser, process.argv.includes('--record'));
  await chevron(browser);
  if (NOTES.size) console.log('Where a touch area stops short of 20 px because another control is close:\n  ' + [...NOTES].join('\n  '));
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

