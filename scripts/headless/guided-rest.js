// Guided's top bar and the rest timer in the Centre Court look (2026-10-13, Amir: "continue until everything has a consistent
// design"). The bar is the slim session bar's green with the exercise's name and its ⓘ; the footer is one row on the paper
// (‹ Prev is not drawn on the first step); the rest timer is a green band (sound icon top left, ✕ top right, the ring, Pause /
// +15s / Reset, and in Guided Skip →) with, in Guided, the paper under it: the log of the set just done and a Next line.
// Behaviour is the old behaviour: this checks that, and the look at 320, 375 and 390 px, light and dark, with and without the
// week's limits row and in the demo (whose banner must not cover the band).
// Serve the repo first (python -m http.server 8778 --bind 127.0.0.1, see lib.js), then:
//   node scripts/headless/guided-rest.js [--out <dir>]
'use strict';
const path = require('path');
const H = require('./lib');

const loc = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const LONG = 'Single-Arm Half-Kneeling Landmine Rotational Press With Reverse Lunge';

// The fixture's day 1: Box Jump x3, Back Squat x4 (a Because, a Coach's Note), Split Squat x3, Pallof x3, Side Plank x3, and
// the carry with no Spine entry x2: 18 steps. note: week 1 of the cycle with a cap (so the limits row is there and an RPE
// colours against it). circuit: a conditioning circuit of three rounds at the end. long: an exercise with a very long name.
function prog({ note = false, circuit = false, long = false } = {}) {
  const P = H.fixture();
  if (note) {
    const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - 3);
    const e = new Date(s); e.setDate(e.getDate() + 34);
    P.cycles[1].startDate = loc(s); P.cycles[1].endDate = loc(e);
    P.cycles[1].weekNotes = { '1': { text: 'Keep every set at RPE 7 or under this week.', rpeCap: 7 } };
  }
  const day = P.workouts.days[0];
  if (circuit) day.blocks.push({ title: 'Conditioning', exercises: [{ type: 'circuit', name: 'Engine', rx: { rounds: 3, rest: 60 }, items: [{ name: 'Kettlebell Swing', rx: { reps: 12 } }] }] });
  if (long) day.blocks[1].exercises.push({ name: LONG, type: 'standard', rx: { sets: 2, reps: 8, rest: 60 } });
  return P;
}

async function open(browser, { w = 390, h = 844, dark = false, demo = false, seed, ...pr } = {}) {
  const P = prog(pr);
  const opts = { w, h, dark, prog: P, seed };
  if (demo) { opts.query = '?client=demo'; opts.stub = { demo: P }; }
  const o = await H.openProgram(browser, opts);
  o.p.setDefaultTimeout(8000);   // a control that is not there fails in seconds, not half a minute
  await o.p.evaluate(() => { openDayView('1'); openStepMode('1'); });
  await o.p.waitForTimeout(350);
  return o;
}
const goStep = (p, name, setI = 0) => p.evaluate(([n, s]) => { const i = STEP.seq.findIndex(x => x.name === n && x.setI === s); STEP.pos = i; renderStep(); return i; }, [name, setI]);
const doneRest = async p => { await p.click('#step-footer .step-primary-btn'); await p.waitForTimeout(500); };

const t = H.checker();
(async () => {
  const shots = H.outDir();
  const browser = await H.launch();
  const noX = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

  // ── 1. The bar, the ⓘ, ? and ✕, the footer, at 390 light with the week's limits row ───────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { note: true });
    const bar = await p.evaluate(() => {
      const q = s => document.querySelector(s), name = q('#step-name'), cs = getComputedStyle(name), head = q('#stepOverlay .step-head'), eb = q('#step-eyebrow');
      const dot = getComputedStyle(eb, '::before'), r = head.getBoundingClientRect(), wk = q('#step-week');
      return { eb: eb.textContent, pill: q('#step-pill').textContent, name: name.textContent, weight: cs.fontWeight, size: cs.fontSize, tt: cs.textTransform, fam: cs.fontFamily.slice(0, 40),
        lines: Math.round(name.getBoundingClientRect().height / parseFloat(cs.lineHeight)), bg: getComputedStyle(head).backgroundImage.slice(0, 15), w: Math.round(r.width), vw: innerWidth, top: Math.round(r.top),
        dot: dot.width + ' ' + dot.backgroundColor, ebFam: getComputedStyle(eb).fontFamily.slice(0, 40), bodyName: getComputedStyle(q('.step-ex-name')).display,
        week: wk && !wk.hidden ? wk.textContent.replace(/\s+/g, ' ').trim() : null, weekBg: wk ? getComputedStyle(wk).backgroundColor : '', clay: wk ? getComputedStyle(wk.querySelector('em')).color : '' };
    });
    t.check('Guided bar: the eyebrow and the set\'s place are both there, as before', /^Exercise 1 of \d+$/.test(bar.eb) && bar.pill === 'Set 1 of 3', JSON.stringify([bar.eb, bar.pill]));
    t.check('Guided bar: the exercise\'s name in Barlow Condensed 900 capitals, 22 px, one line here', bar.name === 'Box Jump' && bar.weight === '900' && bar.size === '22px' && bar.tt === 'uppercase' && /Barlow Condensed/.test(bar.fam) && bar.lines === 1, JSON.stringify(bar));
    t.check('Guided bar: the slim bar\'s green, full width, at the top; the eyebrow is Space Mono with a mint dot', bar.bg === 'radial-gradient' && bar.w === bar.vw && bar.top === 0 && /Space Mono/.test(bar.ebFam) && bar.dot === '7px rgb(109, 190, 149)', JSON.stringify(bar));
    t.check('Guided bar: the body\'s own copy of the name is hidden (never in the day)', bar.bodyName === 'none'
      && (await p.evaluate(() => { const c = [...document.querySelectorAll('#day-view .checklist-item')].find(x => x.querySelector('.item-name').textContent.trim() === 'Box Jump'); return !!c && getComputedStyle(c.querySelector('.item-name')).display !== 'none'; })), JSON.stringify(bar));
    t.check('Guided bar: the week\'s limits row sits under it, label grey-white and the number clay on the green', bar.week === 'This week Max RPE 7' && /rgba?\(0, 0, 0, 0\.18\)/.test(bar.weekBg) && bar.clay === 'rgb(224, 107, 67)', JSON.stringify([bar.week, bar.weekBg, bar.clay]));

    // the ⓘ: the card's own, opening the same About sheet over Guided; closing it leaves the same step
    const sc0 = await p.evaluate(() => { document.getElementById('step-scroll').scrollTop = 0; return { pos: STEP.pos, name: document.getElementById('step-name').textContent, st: document.getElementById('step-scroll').scrollTop }; });
    const ab = await p.evaluate(() => { const b = document.getElementById('step-about'), r = b.getBoundingClientRect(); return { shown: !b.hidden, w: Math.round(r.width), h: Math.round(r.height), why: b.classList.contains('has-why'), label: b.getAttribute('aria-label') }; });
    t.check('Guided bar: the ⓘ is there for a card that has one, 44 px, named for the exercise', ab.shown && ab.w === 44 && ab.h === 44 && !ab.why && ab.label === 'About Box Jump', JSON.stringify(ab));
    await p.click('#step-about'); await p.waitForTimeout(500);
    const sheet = await p.evaluate(() => { const ov = document.getElementById('hist-overlay'); return { on: ov.classList.contains('visible'), name: (ov.querySelector('.ax-name') || {}).textContent, guided: document.getElementById('stepOverlay').classList.contains('visible'),
      z: [getComputedStyle(ov).zIndex, getComputedStyle(document.getElementById('stepOverlay')).zIndex].join('/') }; });
    t.check('the ⓘ opens the About sheet over Guided (the sheet above it)', sheet.on && sheet.name === 'Box Jump' && sheet.guided && Number(sheet.z.split('/')[0]) > Number(sheet.z.split('/')[1]), JSON.stringify(sheet));
    await p.click('#hist-overlay .ax-foot .readiness-skip'); await p.waitForTimeout(300);
    const back = await p.evaluate(() => ({ sheet: document.getElementById('hist-overlay').classList.contains('visible'), guided: document.getElementById('stepOverlay').classList.contains('visible'),
      pos: STEP.pos, name: document.getElementById('step-name').textContent, st: document.getElementById('step-scroll').scrollTop }));
    t.check('closing the About sheet leaves Guided on the same step, name and scroll', !back.sheet && back.guided && back.pos === sc0.pos && back.name === sc0.name && back.st === sc0.st, JSON.stringify([sc0, back]));

    // a Because is the clay disc; a card with nothing to say has no ⓘ
    await goStep(p, 'Barbell Back Squat');
    const why = await p.evaluate(() => { const b = document.getElementById('step-about'), c = getComputedStyle(b, '::before'); return { shown: !b.hidden, why: b.classList.contains('has-why'), bg: c.backgroundColor, label: b.getAttribute('aria-label') }; });
    t.check('a Because: the bar\'s ⓘ is the clay disc, named "Why you have …"', why.shown && why.why && why.bg === 'rgb(194, 81, 44)' && why.label === 'Why you have Barbell Back Squat', JSON.stringify(why));
    await p.click('#step-about'); await p.waitForTimeout(400);
    t.check('…and it opens the sheet with its reason ("Why am I doing this?")', await p.evaluate(() => !!document.querySelector('#hist-overlay.visible .ax-hq')));
    await p.click('#hist-overlay .ax-foot .readiness-skip'); await p.waitForTimeout(250);
    await goStep(p, 'Mystery Carry');
    t.check('an exercise with no entry, no reason and no history has no ⓘ', await p.evaluate(() => document.getElementById('step-about').hidden && document.getElementById('step-about').getBoundingClientRect().width === 0));

    // ? and ✕
    await goStep(p, 'Box Jump');
    await p.click('#stepOverlay .step-help'); await p.waitForTimeout(400);
    t.check('?: opens how Guided works', await p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible') && /How the app works/.test(document.querySelector('#hist-overlay .readiness-title').textContent)
      && !!document.querySelector('#hist-overlay .help-list .note-card.open')));
    await p.evaluate(() => closeHistorySheet()); await p.waitForTimeout(250);
    await p.click('#stepOverlay .step-exit'); await p.waitForTimeout(300);
    t.check('✕: closes Guided (nothing logged is lost, the page scrolls again)', await p.evaluate(() => STEP === null && !document.getElementById('stepOverlay').classList.contains('visible') && document.body.style.overflow === ''));
    t.check('no page errors in the bar checks', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. The footer: Prev is not drawn on step 1, the primary takes its room, Next → is outlined ─────────────────────────────
  {
    const { ctx, p } = await open(browser, { note: true });
    const foot = () => p.evaluate(() => {
      const f = document.getElementById('step-footer'), bs = [...f.querySelectorAll('button')], fr = f.getBoundingClientRect(), prim = f.querySelector('.step-primary-btn'), cs = getComputedStyle(prim);
      return { labels: bs.map(b => b.textContent.trim()), pos: STEP.pos, fw: Math.round(fr.width), pw: Math.round(prim.getBoundingClientRect().width), hs: bs.map(b => Math.round(b.getBoundingClientRect().height)),
        next: prim.classList.contains('is-next'), bg: cs.backgroundImage.slice(0, 15), bgc: cs.backgroundColor, ring: cs.boxShadow !== 'none', border: getComputedStyle(f).borderTopWidth + ' ' + getComputedStyle(f).borderTopColor };
    });
    const a = await foot();
    t.check('footer, step 1: ‹ Prev is not drawn (not a disabled grey button), the primary says Done — Start Rest ✓ and takes the row',
      a.labels.length === 1 && a.labels[0] === 'Done — Start Rest ✓' && a.pw >= a.fw - 33 && !a.next && a.bg === 'radial-gradient' && a.hs[0] >= 52 && /^1px /.test(a.border), JSON.stringify(a));
    t.check('footer, step 1: no disabled button anywhere in it', await p.evaluate(() => !document.querySelector('#step-footer button[disabled]')));
    await doneRest(p);
    const r = await p.evaluate(() => ({ on: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning, pos: STEP.pos, done: stepDone(STEP.seq[0]) }));
    t.check('Done — Start Rest ✓ marks the set done and opens the timer running', r.on && r.running && r.pos === 0 && r.done, JSON.stringify(r));
    await p.click('#timerXBtn'); await p.waitForTimeout(300);
    const b = await foot();
    t.check('footer, step 2: ‹ Prev is there (44 px or more), outlined, and the primary is the green Done — Start Rest ✓',
      b.pos === 1 && b.labels.join('|') === '‹ Prev|Done — Start Rest ✓' && b.hs.every(h => h >= 44) && !b.next && b.bg === 'radial-gradient', JSON.stringify(b));
    t.check('footer, step 2: Prev is outlined (a ring, no fill)', await p.evaluate(() => { const c = getComputedStyle(document.querySelector('#step-footer .step-nav-btn')); return c.backgroundColor === 'rgba(0, 0, 0, 0)' && c.boxShadow !== 'none'; }));
    await p.click('#step-footer .step-nav-btn'); await p.waitForTimeout(250);
    const c = await foot();
    t.check('Prev goes back to step 1 (where it is hidden again); the step is done, so the primary reads Next → and is outlined, not green',
      c.pos === 0 && c.labels.join('|') === 'Next →' && c.next && c.bgc === 'rgba(0, 0, 0, 0)' && c.ring && c.bg === 'none', JSON.stringify(c));
    await p.click('#step-footer .step-primary-btn'); await p.waitForTimeout(250);
    t.check('Next → moves on to step 2', await p.evaluate(() => STEP.pos === 1 && document.getElementById('step-pill').textContent === 'Set 2 of 3'));
    // the last step: Finish Session ✓ is the primary again
    await p.evaluate(() => { STEP.pos = STEP.seq.length - 1; renderStep(); });
    const d = await foot();
    t.check('the last set: ‹ Prev and the green primary; once ticked it is Finish Session ✓', d.labels.join('|') === '‹ Prev|Done — Start Rest ✓' && d.pos === 17, JSON.stringify(d));
    await p.evaluate(() => { currentStepRow().querySelector('.ex-set-check').click(); renderStep(); });
    const e = await foot();
    t.check('a done last set: Finish Session ✓ is the green primary', e.labels.join('|') === '‹ Prev|Finish Session ✓' && !e.next && e.bg === 'radial-gradient', JSON.stringify(e));
    t.check('no page errors in the footer checks', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 3. The rest timer in Guided: the band, the log's keys, the Next line, the controls ──────────────────────────────────────
  {
    // the squat has last time's 70 kg on its sets (lw), so the rest screen offers Same as last
    const lw = [0, 1, 2, 3].map(() => ({ w: '', n: '', r: '', d: false, lw: '70' }));
    const { ctx, p } = await open(browser, { note: true, seed: { _setlog_Barbell_Back_Squat: lw } });
    await doneRest(p);
    const band = await p.evaluate(() => {
      const q = s => document.querySelector(s), ov = q('#timerOverlay'), b = q('.timer-band'), br = b.getBoundingClientRect(), lg = q('#timerLog').getBoundingClientRect(), pap = q('.timer-paper');
      const sk = q('#timerCloseBtn'), ss = q('#startStopBtn');
      return { cls: ov.className, running: timerRunning, disp: q('#timerDisplay').textContent, dispColor: getComputedStyle(q('#timerDisplay')).color, bg: getComputedStyle(b).backgroundImage.slice(0, 15),
        bandTop: Math.round(br.top), bandW: Math.round(br.width), vw: innerWidth, logTop: Math.round(lg.top), bandBottom: Math.round(br.bottom), paper: getComputedStyle(pap).backgroundColor,
        eyebrow: q('.timer-eyebrow').textContent.replace(/\s+/g, ' ').trim(), skip: sk.hidden ? null : sk.textContent.trim(), skipH: Math.round(sk.getBoundingClientRect().height),
        ss: ss.textContent.trim() + '/' + ss.dataset.sym, next: q('#timerNext').hidden ? null : q('#timerNext').textContent.replace(/\s+/g, ' ').trim(), head: q('#timerLog .tl-head').textContent,
        ring: getComputedStyle(q('.ring-progress')).stroke, track: getComputedStyle(q('.ring-bg')).stroke };
    });
    t.check('Guided rest: the timer opens running, with the green band on top and the paper under it', /visible/.test(band.cls) && /has-log/.test(band.cls) && band.running && /^1:(30|29)$/.test(band.disp) && band.bg === 'radial-gradient'
      && band.bandTop === 0 && band.bandW === band.vw && band.logTop >= band.bandBottom && band.paper === 'rgb(250, 247, 242)', JSON.stringify(band));
    t.check('Guided rest: the digits are white, the ring\'s progress mint on a white .2 track', band.dispColor === 'rgb(255, 255, 255)' && band.ring === 'rgb(109, 190, 149)' && /rgba\(255, 255, 255, 0\.2\)/.test(band.track), JSON.stringify([band.dispColor, band.ring, band.track]));
    t.check('Guided rest: the eyebrow reads REST and the exercise (the dot and the "·" are drawn), and Skip → stays as a button on the band', /^Rest Box Jump$/.test(band.eyebrow) && band.skip === 'Skip →' && band.skipH >= 44, JSON.stringify([band.eyebrow, band.skip, band.skipH]));
    t.check('Guided rest: Pause is the running button, with its mark', band.ss === 'Pause/pause', band.ss);
    t.check('Guided rest: the log\'s head and the Next line', band.head === 'Set 1 of 3 · how did it go?' && band.next === 'Next: Box Jump · set 2 of 3', JSON.stringify([band.head, band.next]));

    // +15s, Pause, Reset (the old behaviour)
    const tm = async () => p.evaluate(() => ({ disp: document.getElementById('timerDisplay').textContent, running: timerRunning, label: document.getElementById('startStopBtn').textContent, sym: document.getElementById('startStopBtn').dataset.sym, dur: timerDuration }));
    await p.click('.timer-controls .btn-add'); await p.waitForTimeout(150);
    const plus = await tm();
    t.check('+15s adds fifteen seconds and bumps the duration so the ring never shows more than full', /^1:(45|44)$/.test(plus.disp) && plus.dur === 105 && plus.running, JSON.stringify(plus));
    await p.click('#startStopBtn'); await p.waitForTimeout(150);
    const paused = await tm();
    t.check('Pause stops the clock and the button says Start (with its play mark)', !paused.running && paused.label === 'Start' && paused.sym === 'play', JSON.stringify(paused));
    await p.waitForTimeout(1300);
    t.check('a paused rest does not count down', (await tm()).disp === paused.disp);
    await p.click('.timer-controls .btn-reset'); await p.waitForTimeout(150);
    const reset = await tm();
    t.check('Reset puts the full duration back, paused', reset.disp === '1:45' && !reset.running && reset.label === 'Start', JSON.stringify(reset));
    await p.click('#startStopBtn'); await p.waitForTimeout(150);
    const again = await tm();
    t.check('Start runs it again', again.running && again.label === 'Pause' && again.sym === 'pause', JSON.stringify(again));

    // the sound icon: rest_sound, aria-pressed, aria-label
    const snd = () => p.evaluate(() => { const b = document.getElementById('timerSoundBtn'), r = b.getBoundingClientRect(); return { pressed: b.getAttribute('aria-pressed'), label: b.getAttribute('aria-label'), key: localStorage.getItem('rest_sound'), off: b.classList.contains('off'), w: Math.round(r.width), h: Math.round(r.height), text: b.textContent.trim(),
      on: getComputedStyle(b.querySelector('.tsnd-on')).display, slash: getComputedStyle(b.querySelector('.tsnd-off')).display }; });
    const s0 = await snd();
    t.check('sound icon: on to begin with, a 44 px button with no words, aria-pressed true, labelled Sound on', s0.pressed === 'true' && s0.label === 'Sound on' && !s0.off && s0.w === 44 && s0.h === 44 && s0.text === '' && s0.on !== 'none' && s0.slash === 'none', JSON.stringify(s0));
    await p.click('#timerSoundBtn'); await p.waitForTimeout(120);
    const s1 = await snd();
    t.check('sound icon: a tap turns it off: rest_sound "0", aria-pressed false, labelled Sound off, the slashed speaker', s1.key === '0' && s1.pressed === 'false' && s1.label === 'Sound off' && s1.off && s1.on === 'none' && s1.slash !== 'none', JSON.stringify(s1));
    await p.click('#timerSoundBtn'); await p.waitForTimeout(120);
    const s2 = await snd();
    t.check('sound icon: a second tap turns it back on: rest_sound "1"', s2.key === '1' && s2.pressed === 'true' && s2.label === 'Sound on' && !s2.off, JSON.stringify(s2));

    // the log writes to the same keys as before: kg, reps, RPE (here through the squat's set 1, with last time's 70 kg to offer)
    await p.click('.timer-controls .btn-reset'); await p.click('#timerXBtn'); await p.waitForTimeout(200);   // leave the rest (step 2)
    await goStep(p, 'Barbell Back Squat');
    await doneRest(p);
    const lg = await p.evaluate(() => { const k = document.querySelector('#timerLog .tl-kg'); return { kg: !!k, ph: k && k.placeholder, same: !!document.querySelector('#timerLog .tl-same:not([hidden])'), val: (document.querySelector('#timerLog .tl-val') || {}).textContent,
      lab: [...document.querySelectorAll('#timerLog .tl-lab')].map(x => x.textContent), keys: document.querySelectorAll('#timerLog .tl-rpe-btn').length, kgBox: k ? getComputedStyle(k).borderTopColor + ' ' + getComputedStyle(k).backgroundColor : '' }; });
    t.check('the squat\'s rest: Kg (last 70 offered), Reps (6) and RPE 6-10, boxes white edged --field', lg.kg && lg.ph === 'last 70' && lg.same && lg.val === '6' && lg.lab.join('|') === 'Kg|Reps|RPE' && lg.keys === 5 && lg.kgBox === 'rgb(168, 159, 146) rgb(255, 255, 255)', JSON.stringify(lg));
    await p.fill('#timerLog .tl-kg', '72.5');
    await p.click('#timerLog .tl-step[data-d="1"]');
    await p.click('#timerLog .tl-rpe-btn[data-rpe="8"]');
    await p.waitForTimeout(150);
    const saved = await p.evaluate(() => { const s = loadSetLog('Barbell Back Squat', 4)[0] || {}, row = document.querySelector('#step-scroll .ex-set-row[data-set-idx="0"]');
      return { w: s.w, n: s.n, r: s.r, d: s.d, boxW: row.querySelector('.ex-set-weight').value, boxN: row.querySelector('.ex-set-reps').value, boxR: (row.querySelector('.rpe-btn.selected') || {}).textContent, rpeSel: document.querySelector('#timerLog .tl-rpe-btn.selected').textContent };
    });
    t.check('the log saves kg, reps and RPE to the set\'s own keys and boxes (72.5 kg × 7 @ 8)', saved.w === '72.5' && saved.n === '7' && saved.r === '8' && saved.d === true && saved.boxW === '72.5' && saved.boxN === '7' && saved.boxR === '8' && saved.rpeSel === '8', JSON.stringify(saved));
    await p.fill('#timerLog .tl-kg', '');
    await p.click('#timerLog .tl-step[data-d="-1"]');   // the log redraws, and with an empty box offers Same as last again
    await p.click('#timerLog .tl-same');
    t.check('Same as last puts last time\'s 70 kg in the set', await p.evaluate(() => (loadSetLog('Barbell Back Squat', 4)[0] || {}).w === '70' && document.querySelector('#timerLog .tl-kg').value === '70'));

    // RPE colours against the squat's target (RPE 7, the week's cap too): over clay, on target the --mark green, under steel
    await p.click('#timerXBtn'); await goStep(p, 'Barbell Back Squat', 1); await doneRest(p);
    const col = async v => { await p.click(`#timerLog .tl-rpe-btn[data-rpe="${v}"]`); await p.waitForTimeout(100); return p.evaluate(() => { const b = document.querySelector('#timerLog .tl-rpe-btn.selected'); return { text: b.textContent, cls: b.className, bg: getComputedStyle(b).backgroundColor, fg: getComputedStyle(b).color }; }); };
    const over = await col(9), on = await col(7), under = await col(6);
    t.check('RPE over the cap is clay, as today', over.text === '9' && / over/.test(over.cls) && over.bg === 'rgb(194, 81, 44)' && over.fg === 'rgb(255, 255, 255)', JSON.stringify(over));
    t.check('RPE on target is the selected green (--mark)', on.text === '7' && !/ over| under/.test(on.cls) && on.bg === 'rgb(14, 74, 54)', JSON.stringify(on));
    t.check('RPE under the cap is steel blue, as today', under.text === '6' && / under/.test(under.cls) && under.bg === 'rgb(62, 106, 146)', JSON.stringify(under));
    t.check('the limits line is under the RPE keys, as before', await p.evaluate(() => { const r = document.querySelector('#timerLog .session-timer-week'), k = document.querySelector('#timerLog .tl-rpe'); return !!r && r.textContent.replace(/\s+/g, ' ').trim() === 'This week Max RPE 7' && r.getBoundingClientRect().top > k.getBoundingClientRect().bottom; }));
    t.check('no page errors in the rest checks', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 4. The Next line: a middle set, the end of an exercise, the second-last step; and the skip ───────────────────────────────
  {
    const { ctx, p } = await open(browser, { circuit: true });
    const nextAfter = async (name, setI) => {
      await goStep(p, name, setI); await doneRest(p);
      const r = await p.evaluate(() => ({ next: document.getElementById('timerNext').hidden ? null : document.getElementById('timerNext').textContent.replace(/\s+/g, ' ').trim(), visible: document.getElementById('timerOverlay').classList.contains('visible'), skipH: !document.getElementById('timerCloseBtn').hidden }));
      await p.click('#timerXBtn'); await p.waitForTimeout(200);
      return r;
    };
    t.check('Next, a middle set: Box Jump set 1 → "Next: Box Jump · set 2 of 3"', (await nextAfter('Box Jump', 0)).next === 'Next: Box Jump · set 2 of 3');
    t.check('Next, the end of an exercise: the next exercise\'s first set', (await nextAfter('Box Jump', 2)).next === 'Next: Barbell Back Squat · set 1 of 4');
    t.check('Next, before a circuit: its first round', (await nextAfter('Mystery Carry', 1)).next === 'Next: Engine · round 1 of 3');
    t.check('Next, a circuit\'s own round: "round 2 of 3" (the circuit\'s rest screen has the line too)', (await nextAfter('Engine', 0)).next === 'Next: Engine · round 2 of 3');
    t.check('Next, the second-last step: the session\'s last round says "last round"', (await nextAfter('Engine', 1)).next === 'Next: Engine · last round');
    // the very last step has no rest at all: it shows the complete screen
    await goStep(p, 'Engine', 2);
    await p.click('#step-footer .step-primary-btn'); await p.waitForTimeout(400);
    const last = await p.evaluate(() => ({ timer: document.getElementById('timerOverlay').classList.contains('visible'), eb: document.getElementById('step-eyebrow').textContent, pill: document.getElementById('step-pill').textContent }));
    t.check('the last set: no rest at all (so no Next line); Guided says Complete', !last.timer && last.eb === 'Guided workout' && last.pill === 'Complete', JSON.stringify(last));
    await ctx.close();
  }
  {   // a circuit round: the circuit's name and no ⓘ in the bar, and its rest asks for the round's RPE on the paper
    const { ctx, p } = await open(browser, { circuit: true });
    await goStep(p, 'Engine', 0);
    const circ = await p.evaluate(() => ({ about: document.getElementById('step-about').hidden, name: document.getElementById('step-name').textContent, pill: document.getElementById('step-pill').textContent }));
    t.check('a circuit round: the circuit\'s name and "Round 1 of 3" in the bar, no ⓘ', circ.about && circ.name === 'Engine' && circ.pill === 'Round 1 of 3', JSON.stringify(circ));
    await doneRest(p);
    t.check('a circuit round\'s rest asks for the round\'s RPE on the paper', await p.evaluate(() => /Round 1 of 3/.test(document.querySelector('#timerLog .tl-head').textContent) && document.querySelectorAll('#timerLog .tl-rpe-btn').length === 5 && !document.getElementById('timerLog').hidden));
    await ctx.close();
  }

  // ── 5. The list's timer: no Skip, no Next, no log; the band fills the screen; ✕ closes it and nothing else ───────────────
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog() });
    await p.evaluate(() => { openDayView('1'); openRest(90, 'Barbell Back Squat'); });
    await p.waitForTimeout(500);
    const l = await p.evaluate(() => { const q = s => document.querySelector(s), ov = q('#timerOverlay'), b = q('.timer-band').getBoundingClientRect(), x = q('#timerXBtn');
      return { cls: ov.className, skip: q('#timerCloseBtn').hidden, next: q('#timerNext').hidden, log: q('#timerLog').hidden, paper: getComputedStyle(q('.timer-paper')).display, bandH: Math.round(b.height), vh: innerHeight,
        eyebrow: q('.timer-eyebrow').textContent.replace(/\s+/g, ' ').trim(), xl: x.getAttribute('aria-label'), running: timerRunning, step: STEP,
        dots: getComputedStyle(q('.timer-label'), '::before').width + '|' + getComputedStyle(q('.timer-exercise-name'), '::before').content.replace(/"/g, '') }; });
    t.check('list rest: opens running; no Skip button, no Next line, no log, no paper; the band fills the screen', /visible/.test(l.cls) && !/has-log|has-next/.test(l.cls) && l.skip && l.next && l.log && l.paper === 'none' && l.bandH === l.vh && l.running && l.step === null, JSON.stringify(l));
    t.check('list rest: the eyebrow is "● REST · BARBELL BACK SQUAT" (dot and "·" drawn) and ✕ is labelled Close', /^Rest Barbell Back Squat$/.test(l.eyebrow) && l.dots === '7px|· ' && l.xl === 'Close the rest timer', JSON.stringify([l.eyebrow, l.dots, l.xl]));
    await p.click('#timerXBtn'); await p.waitForTimeout(250);
    const c = await p.evaluate(() => ({ on: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning, step: STEP, day: !document.getElementById('day-view').hidden }));
    t.check('list rest: ✕ closes it, stops the clock, and opens nothing (the day stays)', !c.on && !c.running && c.step === null && c.day, JSON.stringify(c));
    t.check('list rest: nothing listens to a Skip that is not there (calling closeTimer() again changes nothing)', await p.evaluate(() => { closeTimer(); return !document.getElementById('timerOverlay').classList.contains('visible') && STEP === null; }));
    t.check('no page errors in the list-timer checks', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 6. ✕ and Skip → in Guided do what the old Skip did: the next step shows ──────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser);
    await doneRest(p); await p.click('#timerXBtn'); await p.waitForTimeout(250);
    const a = await p.evaluate(() => ({ pos: STEP.pos, pill: document.getElementById('step-pill').textContent, timer: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning, done0: stepDone(STEP.seq[0]) }));
    t.check('Guided: ✕ on the timer skips the rest and shows the next step (the set stays done)', a.pos === 1 && a.pill === 'Set 2 of 3' && !a.timer && !a.running && a.done0, JSON.stringify(a));
    await doneRest(p); await p.click('#timerCloseBtn'); await p.waitForTimeout(250);
    const b = await p.evaluate(() => ({ pos: STEP.pos, pill: document.getElementById('step-pill').textContent, timer: document.getElementById('timerOverlay').classList.contains('visible') }));
    t.check('Guided: Skip → does the same', b.pos === 2 && b.pill === 'Set 3 of 3' && !b.timer, JSON.stringify(b));
    // the rest running out on its own moves on too (the old behaviour)
    await doneRest(p);
    await p.evaluate(() => { timerEndsAt = Date.now() + 300; });
    await p.waitForTimeout(2600);
    const c = await p.evaluate(() => ({ pos: STEP.pos, timer: document.getElementById('timerOverlay').classList.contains('visible'), pill: document.getElementById('step-pill').textContent }));
    t.check('Guided: a rest that runs out closes itself and shows the next exercise\'s first set', c.pos === 3 && !c.timer && c.pill === 'Set 1 of 4', JSON.stringify(c));
    // the phone's Back closes the timer (which moves on, as Skip does), then Guided
    await doneRest(p);
    await p.goBack(); await p.waitForTimeout(500);
    const d = await p.evaluate(() => ({ timer: document.getElementById('timerOverlay').classList.contains('visible'), guided: !!STEP && document.getElementById('stepOverlay').classList.contains('visible'), pos: STEP && STEP.pos }));
    t.check('the phone\'s Back closes the timer first (Guided stays, on the next step)', !d.timer && d.guided && d.pos === 4, JSON.stringify(d));
    await p.goBack(); await p.waitForTimeout(500);
    const e = await p.evaluate(() => ({ guided: document.getElementById('stepOverlay').classList.contains('visible'), step: STEP, day: !document.getElementById('day-view').hidden }));
    t.check('…and a second Back closes Guided (the day stays)', !e.guided && e.step === null && e.day, JSON.stringify(e));
    t.check('no page errors in the skip and Back checks', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 7. Sizes: no sideways scroll, every control 44 px or more, every word whole, nothing overlapping or under the demo banner ──
  const sweepGuided = (p, tag) => p.evaluate(tag => {
    const vis = e => e && !e.hidden && e.getBoundingClientRect().width > 0, R = e => e.getBoundingClientRect();
    const out = [];
    const ctl = [...document.querySelectorAll('#stepOverlay .step-help, #stepOverlay .step-exit, #stepOverlay .step-about, #step-footer button')].filter(vis);
    ctl.forEach(b => { const r = R(b); if (r.width < 43.5 || r.height < 43.5) out.push('small ' + (b.className || b.id) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); if (r.right > innerWidth + .5 || r.left < -.5) out.push('off screen ' + b.className); });
    [...document.querySelectorAll('#step-footer button')].forEach(b => { if (b.scrollWidth > b.clientWidth + 1) out.push('clipped ' + b.textContent.trim()); });
    const hb = [...document.querySelectorAll('#stepOverlay .step-help, #stepOverlay .step-exit, #stepOverlay .step-about')].filter(vis).map(R);
    for (let i = 0; i < hb.length; i++) for (let j = i + 1; j < hb.length; j++) { const a = hb[i], b = hb[j]; if (a.left < b.right - .5 && b.left < a.right - .5 && a.top < b.bottom - .5 && b.top < a.bottom - .5) out.push('overlap ' + i + ' ' + j); }
    const eb = document.querySelector('#stepOverlay .step-topbar-text'), er = R(eb), hr = R(document.querySelector('#stepOverlay .step-help'));
    if (eb.scrollWidth > eb.clientWidth + 1 || er.right > hr.left + .5) out.push('eyebrow runs into ? (' + Math.round(er.right) + ' vs ' + Math.round(hr.left) + ')');
    const nm = document.getElementById('step-name'), lh = parseFloat(getComputedStyle(nm).lineHeight);
    if (R(nm).height > 2 * lh + 1) out.push('name over two lines');
    const wk = document.getElementById('step-week');
    if (wk && !wk.hidden && wk.scrollWidth > wk.clientWidth + 1) out.push('limits row clipped');
    if (document.documentElement.scrollWidth > innerWidth) out.push('sideways scroll ' + (document.documentElement.scrollWidth - innerWidth));
    const nmr = R(nm), ab = document.getElementById('step-about');
    if (vis(ab) && nmr.right > R(ab).left + .5) out.push('name runs into the ⓘ');
    return out;
  }, tag);
  const sweepRest = (p, demo) => p.evaluate(demo => {
    const vis = e => e && !e.hidden && e.getBoundingClientRect().width > 0, R = e => e.getBoundingClientRect(), out = [];
    const ctl = [...document.querySelectorAll('#timerOverlay .timer-sound, #timerOverlay .timer-x, #timerOverlay .timer-ctrl-btn, #timerLog .tl-step, #timerLog .tl-rpe-btn, #timerLog .tl-kg, #timerLog .tl-same')].filter(vis);
    ctl.forEach(b => { const r = R(b); if (r.width < 43.5 || r.height < 43.5) out.push('small ' + (b.className || b.id) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); if (r.right > innerWidth + .5 || r.left < -.5) out.push('off screen ' + b.className); });
    [...document.querySelectorAll('#timerOverlay .timer-ctrl-btn')].filter(vis).forEach(b => { if (b.scrollWidth > b.clientWidth + 1) out.push('clipped ' + b.textContent.trim()); });
    const ov = document.getElementById('timerOverlay');
    if (ov.scrollWidth > ov.clientWidth + 1) out.push('overlay scrolls sideways');
    if (document.documentElement.scrollWidth > innerWidth) out.push('sideways scroll');
    const eb = document.querySelector('.timer-eyebrow'), er = R(eb), sr = R(document.getElementById('timerSoundBtn')), xr = R(document.getElementById('timerXBtn'));
    if (er.left < sr.right - .5 || er.right > xr.left + .5) out.push('eyebrow overlaps a button');
    if (R(eb).height > 2 * parseFloat(getComputedStyle(eb).lineHeight) + 1) out.push('eyebrow over two lines');
    const ring = R(document.querySelector('.timer-ring')), svg = R(document.querySelector('.timer-ring svg')), cr = R(document.querySelector('.timer-controls'));
    if (Math.abs(ring.height - svg.height) > 1 || svg.bottom > cr.top + 1) out.push('ring over the controls');
    const wk = document.querySelector('#timerLog .session-timer-week');
    if (wk && wk.scrollWidth > wk.clientWidth + 1) out.push('limits line clipped');
    if (demo) {
      const bn = R(document.getElementById('demo-banner')), br = R(document.querySelector('.timer-band'));
      if (br.top < bn.bottom - .5 || xr.top < bn.bottom - .5 || sr.top < bn.bottom - .5) out.push('demo banner covers the band (banner bottom ' + Math.round(bn.bottom) + ', band top ' + Math.round(br.top) + ')');
    }
    return out;
  }, demo);
  for (const [w, h] of [[320, 568], [375, 667], [390, 844]]) {
    for (const dark of [false, true]) {
      for (const note of [false, true]) {
        const tag = `${w}x${h}${dark ? ' dark' : ''}${note ? ' +limits' : ''}`;
        const { ctx, p } = await open(browser, { w, h, dark, note, long: true });
        const g1 = await sweepGuided(p, tag);
        t.check(`${tag}: Guided's bar and footer fit (no sideways scroll, 44 px controls, words whole, nothing overlapping)`, g1.length === 0, g1.join('; '));
        await goStep(p, 'Dumbbell Bulgarian Split Squat');   // a long name beside a ⓘ
        const g3 = await sweepGuided(p, tag);
        t.check(`${tag}: a long name (Dumbbell Bulgarian Split Squat) sits beside its ⓘ`, g3.length === 0 && (await p.evaluate(() => !document.getElementById('step-about').hidden)), g3.join('; '));
        await goStep(p, LONG);   // the very long name: two lines at most
        const g2 = await sweepGuided(p, tag);
        t.check(`${tag}: a name of seventy characters stays inside two lines`, g2.length === 0, g2.join('; '));
        await goStep(p, 'Barbell Back Squat');
        if (!note || !dark) await p.screenshot({ path: path.join(shots, `guided-${w}x${h}${dark ? '-dark' : ''}${note ? '-limits' : ''}.png`) });
        if (w === 320 || w === 375 || (w === 390 && dark)) { await p.click('#step-about'); await p.waitForTimeout(450); if (!note) await p.screenshot({ path: path.join(shots, `guided-about-${w}x${h}${dark ? '-dark' : ''}.png`) }); await p.click('#hist-overlay .ax-foot .readiness-skip'); await p.waitForTimeout(250); }
        await doneRest(p);
        const r1 = await sweepRest(p, false);
        t.check(`${tag}: the Guided rest screen fits (the band, the log, the keys, Next)`, r1.length === 0, r1.join('; '));
        if (!note || !dark) await p.screenshot({ path: path.join(shots, `rest-guided-${w}x${h}${dark ? '-dark' : ''}${note ? '-limits' : ''}.png`) });
        await p.click('#timerXBtn'); await goStep(p, LONG); await doneRest(p);
        const r2 = await sweepRest(p, false);
        t.check(`${tag}: …and with the long name in its eyebrow`, r2.length === 0, r2.join('; '));
        t.check(`${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
        await ctx.close();
      }
    }
    // the list's timer, and the demo's (its banner must not cover the band)
    for (const dark of [false, true]) {
      const { ctx, p } = await open(browser, { w, h, dark });
      await p.evaluate(() => closeStepMode());
      await p.evaluate(() => openRest(90, 'Dumbbell Bulgarian Split Squat'));
      await p.waitForTimeout(450);
      const r = await sweepRest(p, false);
      t.check(`${w}x${h}${dark ? ' dark' : ''}: the list's rest timer fits`, r.length === 0, r.join('; '));
      if (!dark || w === 390) await p.screenshot({ path: path.join(shots, `rest-list-${w}x${h}${dark ? '-dark' : ''}.png`) });
      await ctx.close();
    }
    {
      const { ctx, p } = await open(browser, { w, h, demo: true, note: true });
      const banner = await p.evaluate(() => { const b = document.getElementById('demo-banner'); return { shown: !b.hidden, bottom: Math.round(b.getBoundingClientRect().bottom), cls: document.body.classList.contains('is-demo') }; });
      const g = await sweepGuided(p, 'demo');
      t.check(`${w}x${h} demo: the banner is up, Guided's bar fits under it`, banner.shown && banner.cls && g.length === 0 && (await p.evaluate(() => Math.round(document.querySelector('#stepOverlay .step-head').getBoundingClientRect().top) >= Math.round(document.getElementById('demo-banner').getBoundingClientRect().bottom))), JSON.stringify(banner) + ' ' + g.join('; '));
      await doneRest(p);
      const r = await sweepRest(p, true);
      t.check(`${w}x${h} demo: the rest screen's band starts under the banner (✕ and the sound icon are not covered)`, r.length === 0, r.join('; '));
      await p.screenshot({ path: path.join(shots, `rest-demo-${w}x${h}.png`) });
      await p.click('#timerXBtn'); await p.waitForTimeout(200);
      await p.evaluate(() => closeStepMode()); await p.evaluate(() => openRest(90, 'Box Jump')); await p.waitForTimeout(400);
      const r3 = await sweepRest(p, true);
      t.check(`${w}x${h} demo: the list's rest timer too`, r3.length === 0, r3.join('; '));
      await p.screenshot({ path: path.join(shots, `rest-list-demo-${w}x${h}.png`) });
      t.check(`${w}x${h} demo: no page errors`, p.errs.length === 0, p.errs.join(' | '));
      await ctx.close();
    }
  }

  // ── 8. Dark mode: the band stays green, the paper turns dark, the selected key lifts to --mark ───────────────────────────────
  {
    const { ctx, p } = await open(browser, { dark: true, note: true });
    await doneRest(p); await p.click('#timerLog .tl-rpe-btn[data-rpe="7"]'); await p.waitForTimeout(120);
    const d = await p.evaluate(() => { const q = s => document.querySelector(s), c = e => getComputedStyle(e);
      return { band: c(q('.timer-band')).backgroundImage.slice(0, 15), paper: c(q('.timer-paper')).backgroundColor, ov: c(q('#timerOverlay')).backgroundColor, key: c(q('#timerLog .tl-rpe-btn:not(.selected)')).backgroundColor, sel: c(q('#timerLog .tl-rpe-btn.selected')).backgroundColor,
        kg: c(q('#timerLog .tl-kg') || q('#timerLog .tl-val')).color, head: c(q('#timerLog .tl-head')).color }; });
    t.check('dark: the band stays green, the paper is the dark paper, the keys are the dark rows and the selected key is --mark', d.band === 'radial-gradient' && d.ov === 'rgb(24, 24, 24)' && d.key === 'rgb(36, 36, 36)' && d.sel === 'rgb(27, 114, 84)', JSON.stringify(d));
    await p.click('#timerXBtn'); await p.waitForTimeout(200);
    const g = await p.evaluate(() => ({ bar: getComputedStyle(document.querySelector('#stepOverlay .step-head')).backgroundImage.slice(0, 15), paper: getComputedStyle(document.getElementById('stepOverlay')).backgroundColor, foot: getComputedStyle(document.getElementById('step-footer')).backgroundColor }));
    t.check('dark: Guided\'s bar stays green on the dark paper', g.bar === 'radial-gradient' && g.paper === 'rgb(24, 24, 24)' && g.foot === 'rgb(24, 24, 24)', JSON.stringify(g));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { t.check('the run reached its end', false, String(e.message || e).split('\n').slice(0, 3).join(' | ')); t.report(); process.exit(1); });
