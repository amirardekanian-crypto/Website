// Serve Clock, the rest hands back to the set (idea #39, Amir 2026-10-18 "go with your picks"): node scripts/headless/serve-clock.js [--out <dir>]
//
// With 25 s left on a rest (30 s on a rest written at 100 s or more) the rest games wind down and the band shows what is next. Off the
// Glass says "Last point." and finishes its point (Rally.handBack(done)); Split Step closes at once and Between Sets parks and closes itself (each has its own handBack); the door goes; the
// list's band shows "Get set", the next set of the card the Rest button belongs to and one cue from its Spine entry, and Guided's paper
// gets the cue under its Next line. The numbers are SERVE_CLOCK in program.html. The door is not offered on a rest written under 45 s, on a
// circuit round or on a flagged retest lift in its window, and it goes 10 s before the hand-back. +15s never un-latches the hand-back;
// Reset does. A rest that runs out with a game open still stops it (timerDone()). Serve the repo first (python -m http.server 8792
// --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE).
'use strict';
const path = require('path');
const H = require('./lib');

const t = H.checker();
const wait = (p, ms) => p.waitForTimeout(ms);
const DAY = 86400000;
const ymd = d => d.toISOString().slice(0, 10);
const LONG = 'Single-Arm Half-Kneeling Landmine Rotational Press With Reverse Lunge';

// The fixture's day 1 with the rests this suite needs: Pallof 60, Split Squat 40, Side Plank 20, the squat as asked (default 150), Box Jump 90
// (the fixture's). circuit: a Conditioning circuit with a 60 s rest. retest: the squat flagged for a 5RM and the cycle ending in 3 days (inside
// the retest window); flagged: false leaves the cycle's end 24 days away (outside it). long: an exercise with a long name, two sets and cues.
// solo: the Side Plank has one set.
function prog({ squatRest = 150, circuit = false, retest = false, flagged = false, long = false, solo = false } = {}) {
  const P = H.fixture();
  const day = P.workouts.days[0];
  const ex = n => day.blocks.reduce((a, b) => a.concat(b.exercises), []).find(e => e.name === n);
  ex('Barbell Back Squat').rx.rest = squatRest;
  ex('Half Kneeling Pallof Press').rx.rest = 60;
  ex('Dumbbell Bulgarian Split Squat').rx.rest = 40;
  ex('Side Plank').rx.rest = 20;
  if (circuit) day.blocks.push({ title: 'Conditioning', exercises: [{ type: 'circuit', name: 'Engine', rx: { rounds: 3, rest: 60 }, items: [{ name: 'Kettlebell Swing', rx: { reps: 12 } }] }] });
  if (flagged || retest) ex('Barbell Back Squat').test = '5RM';
  if (retest) P.cycles[P.currentCycleIndex].endDate = ymd(new Date(Date.now() + 3 * DAY));
  if (solo) ex('Side Plank').rx.sets = 1;
  if (long) day.blocks[1].exercises.push({ name: LONG, exId: 'long-ex', type: 'standard', rx: { sets: 2, reps: 8, rest: 60 } });
  return P;
}
const SPINE = H.SPINE.concat([{ id: 'long-ex', name: LONG, aliases: [], equipment: ['floor'], purpose: 'Rotation.',
  cues: { good: ['Stay tall through the whole rotation and let the hips turn with the ribs', 'Exhale as you turn'], bad: ['Letting the front knee cave in, then keep it over the middle toes'] } }]);

async function open(browser, { w = 390, h = 844, dark = false, ...pr } = {}) {
  const o = await H.openProgram(browser, { w, h, dark, prog: prog(pr), spine: SPINE });
  o.p.setDefaultTimeout(8000);
  await o.p.evaluate(() => openDayView('1'));
  await wait(o.p, 250);
  return o;
}
// The card's real Rest button, as a tap on it does (openTimer(event) gets the card and the circuit / retest stamps).
const restOn = (p, name) => p.evaluate(`(() => { const c = ${H.card(name)}; c.querySelector('.rest-btn').click(); })()`);
const tickSet = async (p, name, i) => { await p.evaluate(`(() => { const c = ${H.card(name)}; if (c.classList.contains('collapsed')) toggleExpand(c); c.querySelectorAll('.ex-set-check')[${i}].click(); try { hideAaToast(); } catch (e) {} })()`); await wait(p, 150); };
// Move the clock: this many seconds left on the running rest, then a tick or two.
const setLeft = async (p, s) => { await p.evaluate(x => { timerEndsAt = Date.now() + x * 1000; }, s); await wait(p, 600); };
const shelf = async (p, key) => {
  if (await p.evaluate(() => document.getElementById('timerGames').hidden)) await p.click('#timerPlayBtn');
  await p.click('#timerGames [data-game="' + key + '"]');
};
const GLOBAL = { rally: 'Rally', splitstep: 'SplitStep', sets: 'BetweenSets' };
const playGame = async (p, key) => { await shelf(p, key); await p.waitForFunction(g => window[g] && window[g].isOpen(), GLOBAL[key], { timeout: 8000 }); await wait(p, 400); };
const view = p => p.evaluate(() => {
  const q = id => document.getElementById(id), door = q('timerPlayBtn'), box = q('timerGetSet');
  return { door: !door.hidden && getComputedStyle(door).display !== 'none', shelf: !q('timerGames').hidden, latched: serveHandedBack, left: timerLeft(),
    box: !box.hidden && getComputedStyle(box).display !== 'none', k: box.querySelector('.tgs-k').textContent, next: q('timerGetNext').textContent.replace(/\s+/g, ' ').trim(),
    cue: q('timerGetCue').hidden ? '' : q('timerGetCue').textContent, gcue: q('timerCue').hidden ? '' : q('timerCue').textContent, gnext: q('timerNext').hidden ? '' : q('timerNext').textContent.replace(/\s+/g, ' ').trim(),
    games: ['Rally', 'SplitStep', 'BetweenSets'].filter(g => window[g] && window[g].isOpen()) };
});

(async () => {
  const browser = await H.launch();
  const out = H.outDir();
  const errors = [];
  try {
    // ── 1. A 60 s rest on a real card, Off the Glass open: "Last point.", the game closes, the band says what is next ──────────────────
    let { ctx, p } = await open(browser);
    p.on('pageerror', e => errors.push(String(e)));
    t.check('the constants are the picks: 25 s, 30 s from 100 s, no door under 45 s, door gone 10 s early',
      JSON.stringify(await p.evaluate(() => SERVE_CLOCK)) === JSON.stringify({ at: 25, atLong: 30, longFrom: 100, noDoorUnder: 45, doorGone: 10 }));
    await tickSet(p, 'Half Kneeling Pallof Press', 0);
    await restOn(p, 'Half Kneeling Pallof Press');
    await wait(p, 300);
    let v = await view(p);
    t.check('a list rest of 60 s starts with the door, the shelf shut and no get-set block', v.door && !v.shelf && !v.box && !v.latched && v.left >= 58, JSON.stringify(v));
    t.check('the card\'s Rest button names its rest and the context is the card', await p.evaluate(() => timerWritten === 60 && !!timerCtx && !!timerCtx.card && !timerCtx.circuit && !timerCtx.test));
    await playGame(p, 'rally');
    await setLeft(p, 27);
    let g = await p.evaluate(() => ({ banner: Rally._state().banner, open: Rally.isOpen(), latched: serveHandedBack }));
    t.check('at 27 s left nothing has happened (the hand-back is at 25 s)', g.open && !g.banner && !g.latched, JSON.stringify(g));
    const t0 = Date.now();
    await p.evaluate(() => { timerEndsAt = Date.now() + 24 * 1000; });
    await p.waitForFunction(() => { const s = window.Rally && Rally._state(); return s && s.banner && s.banner.text === 'Last point.'; }, null, { timeout: 2000 });
    g = await p.evaluate(() => { const s = Rally._state(); return { text: s.banner.text, hold: !!s.banner.hold, colour: s.banner.c, hidden: s.msg.querySelector('.rally-go').hidden, latched: serveHandedBack, door: !document.getElementById('timerPlayBtn').hidden }; });
    t.check('at 25 s left Off the Glass says "Last point." in mint and the door is already gone', g.text === 'Last point.' && g.hold && g.colour === '#7FD6AE' && g.hidden && g.latched && !g.door, JSON.stringify(g));
    await p.waitForFunction(() => !Rally.isOpen(), null, { timeout: 7000 });
    const took = Date.now() - t0;
    t.check('the game closes within 7 s of the hand-back (a dead ball: about 0.6 s)', took < 7000 && took < 2500, took + ' ms');
    t.check('when the game closes itself at the hand-back, focus goes to the clock\'s button, not to the hidden door', await p.evaluate(() => document.activeElement && document.activeElement.id === 'startStopBtn'), await p.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName)));
    v = await view(p);
    t.check('the timer is still there, running, with the door gone and the shelf folded', await p.evaluate(() => document.getElementById('timerOverlay').classList.contains('visible') && timerRunning) && !v.door && !v.shelf, JSON.stringify(v));
    t.check('the get-set block shows "Get set" and Next: the card\'s next unticked set', v.box && v.k === 'Get set' && v.next === 'Next: Half Kneeling Pallof Press · set 2 of 3', JSON.stringify(v));
    t.check('the cue is the Spine entry\'s (the Pallof has one cue, so it is that one)', v.cue === 'Ribs down', JSON.stringify(v));
    await p.screenshot({ path: path.join(out, 'serve-clock-list-390.png') });
    // the cue's look: clay bar, Barlow, a size from the scale, white on the green
    const look = await p.evaluate(() => { const c = document.getElementById('timerGetCue'), cs = getComputedStyle(c);
      return { bw: cs.borderLeftWidth, bc: cs.borderLeftColor, ff: cs.fontFamily.slice(0, 6), fs: cs.fontSize, col: cs.color }; });
    t.check('the cue has a 3 px clay bar and 15 px Barlow text', look.bw === '3px' && look.bc === 'rgb(224, 107, 67)' && /Barlow/.test(look.ff) && look.fs === '15px' && look.col === 'rgb(255, 255, 255)', JSON.stringify(look));
    // a tap on the door's old place, or a programmatic open, does nothing now
    await p.evaluate(() => openRestGame('rally'));
    await wait(p, 600);
    t.check('a game cannot be opened after the hand-back', await p.evaluate(() => !Rally.isOpen()));
    // +15s does not un-latch it
    await p.evaluate(() => addTimerSeconds(15));
    await wait(p, 600);
    v = await view(p);
    t.check('+15s after the hand-back keeps the line and keeps the door away (about 39 s left)', v.latched && v.box && !v.door && v.left > 35 && v.next.indexOf('set 2 of 3') > 0, JSON.stringify(v));
    // Reset restarts the rest, so the door comes back
    await p.click('#timerOverlay .btn-reset');
    await wait(p, 300);
    v = await view(p);
    t.check('Reset brings the door back and clears the get-set block', !v.latched && v.door && !v.box, JSON.stringify(v));
    // started again, the hand-back happens again at 25 s
    await p.evaluate(() => startTimer());
    await setLeft(p, 24);
    v = await view(p);
    t.check('and the hand-back happens again at 25 s after Start', v.latched && v.box && !v.door, JSON.stringify(v));
    await ctx.close();

    // ── 2. The door goes 10 s before the hand-back, and is not there on a short rest ───────────────────────────────────────────────
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await restOn(p, 'Box Jump');   // written 90
    await wait(p, 300);
    await playGame(p, 'rally');
    await setLeft(p, 34);
    g = await p.evaluate(() => ({ latched: serveHandedBack, open: Rally.isOpen(), banner: !!Rally._state().banner }));
    t.check('at 34 s left (inside the 10 s before the hand-back) nothing is handed back and the game plays on', !g.latched && g.open && !g.banner, JSON.stringify(g));
    await p.evaluate(() => closeRestGames());
    await wait(p, 200);
    v = await view(p);
    t.check('…but the door is already gone (nobody opens a game with 34 s left)', !v.door && !v.box && !v.latched, JSON.stringify(v));
    await setLeft(p, 40);
    v = await view(p);
    t.check('with the clock back at 40 s the door is offered again (it follows the clock until the hand-back)', v.door, JSON.stringify(v));
    await p.evaluate(() => closeTimer());
    // a 40 s rest: no door at all, the line comes at 25 s
    await restOn(p, 'Dumbbell Bulgarian Split Squat');
    await wait(p, 300);
    v = await view(p);
    t.check('a rest written at 40 s (under 45) has no door from the start', !v.door && !v.box && !(await p.evaluate(() => serveHandedBack)), JSON.stringify(v));
    await setLeft(p, 24);
    v = await view(p);
    t.check('…and it still hands back at 25 s: with no set ticked the line names the Split Squat alone (Rest means a set is over, so "set 1" cannot be next) and shows its cue', v.latched && v.box && v.next === 'Next: Dumbbell Bulgarian Split Squat' && v.cue === 'Back foot on the bench', JSON.stringify(v));
    await p.evaluate(() => closeTimer());
    // a 20 s rest: handed back from the start
    await tickSet(p, 'Side Plank', 0);
    await restOn(p, 'Side Plank');
    await wait(p, 300);
    v = await view(p);
    t.check('a rest written at 20 s shows the get-set line from the start and never offers the door', v.latched && v.box && !v.door && v.next === 'Next: Side Plank · set 2 of 3' && v.cue === 'Stack the hips', JSON.stringify(v));
    await p.evaluate(() => closeTimer());
    // 44 s has no door, 45 s has one
    for (const [secs, want] of [[44, false], [45, true]]) {
      await p.evaluate(s => openRest(s, 'Back Squat'), secs);
      await wait(p, 300);
      v = await view(p);
      t.check('a rest of ' + secs + ' s ' + (want ? 'has' : 'has no') + ' door', v.door === want, JSON.stringify(v));
      await p.evaluate(() => closeTimer());
    }
    // the hand-back point by the written rest
    const hbs = await p.evaluate(() => [24, 25, 99, 100, 150].map(s => { timerWritten = s; return serveHb(); }));
    t.check('the hand-back point is 25 s up to a rest of 99 s and 30 s from 100 s', JSON.stringify(hbs) === JSON.stringify([25, 25, 25, 30, 30]), JSON.stringify(hbs));
    await ctx.close();

    // ── 3. 100 s and more hands back at 30 s ────────────────────────────────────────────────────────────────────────────────────────
    ({ ctx, p } = await open(browser, { squatRest: 100 }));
    p.on('pageerror', e => errors.push(String(e)));
    await tickSet(p, 'Barbell Back Squat', 0);
    await restOn(p, 'Barbell Back Squat');
    await wait(p, 300);
    await playGame(p, 'rally');
    await setLeft(p, 31);
    t.check('a rest written at 100 s: 31 s left is not yet the hand-back', await p.evaluate(() => !serveHandedBack && Rally.isOpen()));
    await setLeft(p, 29);
    v = await view(p);
    t.check('…and 29 s left is (the squat, set 2 of 4, the squat\'s second cue)', v.latched && v.next === 'Next: Barbell Back Squat · set 2 of 4' && v.cue === 'Knees over the middle toes', JSON.stringify(v));
    await p.waitForFunction(() => !Rally.isOpen(), null, { timeout: 7000 });
    await ctx.close();

    // ── 4. Split Step is closed at the hand-back and Between Sets closes itself after it; a game with no cues; the cue rotation ────────────────────────────
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    for (const key of ['splitstep', 'sets']) {
      await restOn(p, 'Box Jump');
      await wait(p, 300);
      await playGame(p, key);
      if (key === 'splitstep') {
        // the host tells Split Step where the screen is taken back (handBackAt), so it starts no round it would cut
        const at = await p.evaluate(() => { const f = SplitStep._state().opts.handBackAt; return typeof f === 'function' ? f() : f; });
        t.check('Split Step is opened with handBackAt = the hand-back point (25 s on a 90 s rest)', at === 25, at);
        const go1 = await p.evaluate(() => !!document.querySelector('#splitOverlay [data-go]'));
        await setLeft(p, 40);
        const go2 = await p.evaluate(() => ({ btn: !!document.querySelector('#splitOverlay [data-go]'), wait: /Not enough rest left/.test(document.getElementById('splitOverlay').textContent) }));
        t.check('with 40 s left (15 s before the hand-back) no round can start: the card says so', go1 && !go2.btn && go2.wait, JSON.stringify([go1, go2]));
      }
      await setLeft(p, 24);
      v = await view(p);
      if (key === 'sets') {
        // Between Sets has its own handBack (a76016d): a point in play may finish, then it parks and closes itself about a second later.
        // The latch, the get-set line and the timer are on the moment the hand-back starts; the game is gone within the 6 s it may take.
        t.check('BetweenSets open at the hand-back: the timer stays and the get-set line shows while the game parks', v.latched && v.box && !v.door, JSON.stringify(v));
        await p.waitForFunction(() => !BetweenSets.isOpen(), null, { timeout: 8000 });
        v = await view(p);
        t.check('…then BetweenSets has closed itself, with the timer and the latch still on', v.games.length === 0 && v.latched && v.box && !v.door, JSON.stringify(v));
      } else {
        t.check(GLOBAL[key] + ' open at the hand-back is closed at once, and the timer stays', v.games.length === 0 && v.latched && v.box && !v.door, JSON.stringify(v));
      }
      t.check('…the layer is empty and hidden', await p.evaluate(id => { const o = document.getElementById(id); return !o.classList.contains('visible') && o.innerHTML.length === 0; }, key === 'sets' ? 'setsOverlay' : 'splitOverlay'));
      await p.evaluate(() => closeTimer());
      await wait(p, 200);
    }
    const rot = await p.evaluate(() => [1, 2, 3, 4, 5].map(n => cueForRest('Barbell Back Squat', 'barbell-back-squat', n)));
    t.check('cueForRest rotates through the first two good cues and the fault by set number',
      JSON.stringify(rot) === JSON.stringify(['Brace before you unrack', 'Knees over the middle toes', 'Hips shooting up first', 'Brace before you unrack', 'Knees over the middle toes']), JSON.stringify(rot));
    const none = await p.evaluate(() => [cueForRest('Mystery Carry', '', 1), cueForRest('Barbell Back Squat', 'not-in-the-spine', 1), cueForRest('Box Jump', 'box-jump', 3), cueForRest('Box Jump', 'box-jump', 0), cueForRest('', '', 1)]);
    t.check('cueForRest is empty with no entry or a draft\'s exId, and a one-cue entry repeats its one cue',
      JSON.stringify(none) === JSON.stringify(['', '', 'Land soft', 'Land soft', '']), JSON.stringify(none));
    // all of a card's sets ticked: the next exercise and its first set
    await tickSet(p, 'Side Plank', 0); await tickSet(p, 'Side Plank', 1); await tickSet(p, 'Side Plank', 2);
    await restOn(p, 'Side Plank');
    await wait(p, 300);
    v = await view(p);
    t.check('with every set of the card ticked, Next is the next exercise in the day and its first set', v.box && v.next === 'Next: Mystery Carry · set 1 of 2' && v.cue === '', JSON.stringify(v));
    await p.evaluate(() => closeTimer());
    // an exercise with no approved cues shows the Next line only
    await tickSet(p, 'Mystery Carry', 0);
    await restOn(p, 'Mystery Carry');
    await wait(p, 300);
    await setLeft(p, 24);
    v = await view(p);
    t.check('a card with no approved cues shows the Next line only', v.box && v.next === 'Next: Mystery Carry · set 2 of 2' && v.cue === '', JSON.stringify(v));
    await p.evaluate(() => closeTimer());
    // the last set of the last exercise: nothing follows, so no block
    await tickSet(p, 'Mystery Carry', 1);   // set 1 was ticked above
    await restOn(p, 'Mystery Carry');
    await wait(p, 300);
    await setLeft(p, 24);
    v = await view(p);
    t.check('when nothing follows (the day\'s last set) the get-set block stays away, the door is gone and the latch is set', !v.box && !v.door && v.latched, JSON.stringify(v));
    await p.evaluate(() => closeTimer());
    // a rest opened with no card (openRest from a script): fail open, the door shows as it always did
    await p.evaluate(() => openRest(120, 'Back Squat'));
    await wait(p, 300);
    v = await view(p);
    t.check('a rest with no card behind it shows the door as it always did', v.door && !v.box, JSON.stringify(v));
    await setLeft(p, 24);
    v = await view(p);
    t.check('…and hands back with no Next line (nothing is known)', v.latched && !v.box && !v.door, JSON.stringify(v));
    await ctx.close();

    // ── 4b. The Next line keeps the day's own rules: a struck-out card, a halved exercise, a one-set card, a Library session ──────────────
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await p.evaluate(`${H.card('Barbell Back Squat')}.classList.add('rd-skip')`);   // the check-in struck the squat out
    for (let i = 0; i < 3; i++) await tickSet(p, 'Box Jump', i);
    await restOn(p, 'Box Jump');
    await wait(p, 300);
    await setLeft(p, 24);
    v = await view(p);
    t.check('a card the check-in struck out (rd-skip) is passed over: after Box Jump, Next is the split squat, not the squat', v.box && v.next === 'Next: Dumbbell Bulgarian Split Squat · set 1 of 3', JSON.stringify(v));
    await ctx.close();

    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await p.evaluate(`${H.card('Box Jump')}.dataset.rdSets = '2'`);   // the check-in halved Box Jump to two sets today
    await tickSet(p, 'Box Jump', 0);
    await restOn(p, 'Box Jump');
    await wait(p, 300);
    await setLeft(p, 24);
    v = await view(p);
    t.check('a halved exercise counts the sets asked today: Next is Box Jump, set 2 of 2 (not of 3)', v.box && v.next === 'Next: Box Jump · set 2 of 2', JSON.stringify(v));
    await p.evaluate(() => closeTimer());
    await tickSet(p, 'Box Jump', 1);
    await restOn(p, 'Box Jump');
    await wait(p, 300);
    await setLeft(p, 24);
    v = await view(p);
    t.check('…and with those two done, Box Jump is finished: Next is the squat, set 1 of 4 (not a dimmed third Box Jump set)', v.box && v.next === 'Next: Barbell Back Squat · set 1 of 4', JSON.stringify(v));
    await ctx.close();

    ({ ctx, p } = await open(browser, { solo: true }));
    p.on('pageerror', e => errors.push(String(e)));
    await restOn(p, 'Side Plank');   // one set, not ticked yet: the only set is the one just done
    await wait(p, 300);
    v = await view(p);
    t.check('a one-set card rested from before its tick is taken as done: Next is the card after it', v.latched && v.box && v.next === 'Next: Mystery Carry · set 1 of 2', JSON.stringify(v));
    await ctx.close();

    // a Library session has no set log to read: the hand-back still happens, and the band names nothing (it used to read the programme's log)
    {
      const done3 = [1, 1, 1, 0].map(d => ({ w: '', n: '', r: '', d: !!d }));
      const lib = await H.openProgram(browser, { w: 390, h: 844, prog: prog(), spine: SPINE, stub: { library: H.library() }, seed: { _setlog_Barbell_Back_Squat: done3 } });
      ctx = lib.ctx; p = lib.p;
      p.setDefaultTimeout(8000);
      p.on('pageerror', e => errors.push(String(e)));
      await p.evaluate(() => goLibrary());   // the Library fills the cache openWorkout() reads
      await wait(p, 900);
      await p.evaluate(() => openWorkout('strength/full-body-power'));
      await wait(p, 800);
      const wsRest = name => p.evaluate(`(() => { const c = [...document.querySelectorAll('#ws-body .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === ${JSON.stringify(name)}); c.querySelector('.rest-btn').click(); })()`);
      await wsRest('Countermovement Jump');
      await wait(p, 300);
      await setLeft(p, 24);
      v = await view(p);
      t.check('a Library session: the hand-back happens and the band names nothing (no set log to read)', v.latched && !v.box && !v.door, JSON.stringify(v));
      await p.evaluate(() => closeTimer());
      await wsRest('Barbell Back Squat');   // the programme's own squat log stands at 3 of 4: the Library squat must not read it
      await wait(p, 300);
      await setLeft(p, 24);
      v = await view(p);
      t.check('…and a Library squat does not read the programme\'s squat log (3 of 4 done there)', v.latched && !v.box, JSON.stringify(v));
      await ctx.close();
    }

    // ── 5. No games on a circuit round, nor on a flagged retest lift in its window ──────────────────────────────────────────────────
    ({ ctx, p } = await open(browser, { circuit: true }));
    p.on('pageerror', e => errors.push(String(e)));
    await restOn(p, 'Engine');
    await wait(p, 300);
    v = await view(p);
    t.check('a circuit round\'s rest (written 60 s) has no door', !v.door && !v.latched && await p.evaluate(() => timerCtx.circuit === true), JSON.stringify(v));
    await setLeft(p, 24);
    v = await view(p);
    t.check('…and its hand-back names the circuit with no cue and no count', v.latched && v.box && v.next === 'Next: Engine' && v.cue === '', JSON.stringify(v));
    await ctx.close();

    ({ ctx, p } = await open(browser, { retest: true }));
    p.on('pageerror', e => errors.push(String(e)));
    t.check('a flagged lift\'s Rest button is stamped data-test, an unflagged one is not',
      await p.evaluate(`${H.card('Barbell Back Squat')}.querySelector('.rest-btn').dataset.test === '1' && ${H.card('Box Jump')}.querySelector('.rest-btn').dataset.test === undefined`));
    await restOn(p, 'Barbell Back Squat');
    await wait(p, 300);
    v = await view(p);
    t.check('a retest lift in its window (rest written 150 s) has no door from the start', !v.door && !v.latched && await p.evaluate(() => timerCtx.test === true), JSON.stringify(v));
    await p.evaluate(() => closeTimer());
    await restOn(p, 'Box Jump');
    await wait(p, 300);
    v = await view(p);
    t.check('the same day\'s other lifts keep the door', v.door, JSON.stringify(v));
    await ctx.close();

    ({ ctx, p } = await open(browser, { flagged: true }));
    p.on('pageerror', e => errors.push(String(e)));
    await restOn(p, 'Barbell Back Squat');
    await wait(p, 300);
    v = await view(p);
    t.check('a flagged lift outside the retest window (the cycle ends in 24 days) keeps the door', v.door && await p.evaluate(() => timerCtx.test === false), JSON.stringify(v));
    await ctx.close();

    // ── 6. Guided: the cue is one line under Next, from the hand-back on ─────────────────────────────────────────────────────────────
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await p.evaluate(() => { openStepMode('1'); });
    await wait(p, 350);
    await p.evaluate(() => { if (STEP && STEP.seq[STEP.pos].group) stepPrimary(); });
    await wait(p, 250);
    await p.evaluate(() => { STEP.pos = STEP.seq.findIndex(x => x.name === 'Barbell Back Squat' && x.setI === 0); renderStep(); });
    await wait(p, 250);
    await p.click('#step-footer .step-primary-btn');
    await wait(p, 500);
    v = await view(p);
    t.check('Guided: the rest opens with Next (squat, set 2 of 4) and no cue yet, the door there', v.gnext === 'Next: Barbell Back Squat · set 2 of 4' && v.gcue === '' && v.door && !v.box, JSON.stringify(v));
    await setLeft(p, 29);
    v = await view(p);
    t.check('Guided: at 30 s left (rest written 150 s) the cue shows, the door is gone and the list\'s block stays hidden', v.latched && v.gcue === 'Knees over the middle toes' && !v.door && !v.box, JSON.stringify(v));
    const gpos = await p.evaluate(() => { const n = document.getElementById('timerNext').getBoundingClientRect(), c = document.getElementById('timerCue').getBoundingClientRect(), cs = getComputedStyle(document.getElementById('timerCue'));
      return { under: c.top >= n.bottom - 1, w: c.width > 0, bw: cs.borderLeftWidth, bc: cs.borderLeftColor, col: cs.color, fs: cs.fontSize }; });
    t.check('Guided: the cue sits under the Next line with the 3 px clay bar and 15 px ink text', gpos.under && gpos.w && gpos.bw === '3px' && gpos.bc === 'rgb(199, 85, 47)' && gpos.col !== 'rgb(255, 255, 255)' && gpos.fs === '15px', JSON.stringify(gpos));
    await p.screenshot({ path: path.join(out, 'serve-clock-guided-390.png') });
    await p.evaluate(() => addTimerSeconds(15));
    await wait(p, 500);
    v = await view(p);
    t.check('Guided: +15s keeps the cue and keeps the door away', v.latched && v.gcue === 'Knees over the middle toes' && !v.door, JSON.stringify(v));
    // Skip moves on, and the next rest starts clean
    await p.click('#timerCloseBtn');
    await wait(p, 300);
    await p.click('#step-footer .step-primary-btn');
    await wait(p, 500);
    v = await view(p);
    t.check('Guided: the next rest starts clean (door back, no cue, Next: set 3 of 4)', !v.latched && v.door && v.gcue === '' && v.gnext === 'Next: Barbell Back Squat · set 3 of 4', JSON.stringify(v));
    await setLeft(p, 29);
    v = await view(p);
    t.check('Guided: and its cue is the next one in the rotation (the fault)', v.gcue === 'Hips shooting up first', JSON.stringify(v));
    await ctx.close();

    // Guided, a 20 s rest: the cue from the start
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await p.evaluate(() => { openStepMode('1'); });
    await wait(p, 350);
    await p.evaluate(() => { if (STEP && STEP.seq[STEP.pos].group) stepPrimary(); });
    await p.evaluate(() => { STEP.pos = STEP.seq.findIndex(x => x.name === 'Side Plank' && x.setI === 0); renderStep(); });
    await wait(p, 250);
    await p.click('#step-footer .step-primary-btn');
    await wait(p, 500);
    v = await view(p);
    t.check('Guided: a 20 s rest shows the cue from the start and no door', v.latched && v.gcue === 'Stack the hips' && !v.door, JSON.stringify(v));
    await ctx.close();

    // ── 7. The page coming back to the app after the hand-back point hands back at once ─────────────────────────────────────────────
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await tickSet(p, 'Half Kneeling Pallof Press', 0);
    await restOn(p, 'Half Kneeling Pallof Press');
    await wait(p, 300);
    await playGame(p, 'rally');
    await p.evaluate(() => { clearInterval(timerInterval); timerEndsAt = Date.now() + 20 * 1000; document.dispatchEvent(new Event('visibilitychange')); });
    await wait(p, 200);
    g = await p.evaluate(() => ({ latched: serveHandedBack, banner: Rally._state() && Rally._state().banner && Rally._state().banner.text }));
    t.check('coming back to the page with 20 s left hands back at once (the catch-up tick)', g.latched && g.banner === 'Last point.', JSON.stringify(g));
    await ctx.close();

    // ── 8. A rest that runs out with a game open still stops it (timerDone() and the GO! close are unchanged) ─────────────────────
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await restOn(p, 'Box Jump');
    await wait(p, 300);
    await playGame(p, 'rally');
    await p.evaluate(() => { SERVE_CLOCK.at = 0; SERVE_CLOCK.atLong = 0; timerEndsAt = Date.now() + 1500; });   // no hand-back in this check: the game meets the end of the rest
    await wait(p, 2200);
    const up = await p.evaluate(() => { const s = Rally._state(); return s ? { timeUp: s.timeUp, title: s.msg.querySelector('h3').textContent, latched: serveHandedBack } : null; });
    t.check('with no hand-back the rest running out freezes the game (Time. Next set.)', up && up.timeUp && up.title === 'Time. Next set.' && !up.latched, JSON.stringify(up));
    await wait(p, 1500);
    g = await p.evaluate(() => ({ game: Rally.isOpen(), timer: document.getElementById('timerOverlay').classList.contains('visible'), html: document.getElementById('rallyOverlay').innerHTML.length }));
    t.check('…and the game and the timer close together', !g.game && !g.timer && g.html === 0, JSON.stringify(g));
    // the rest ends while the game is still handing back: nothing throws, everything closes
    await restOn(p, 'Box Jump');
    await wait(p, 300);
    await p.evaluate(() => { SERVE_CLOCK.at = 25; SERVE_CLOCK.atLong = 30; });
    await playGame(p, 'rally');
    await p.evaluate(() => { timerEndsAt = Date.now() + 24 * 1000; });
    await wait(p, 400);
    await p.evaluate(() => { timerEndsAt = Date.now() + 200; });
    await wait(p, 2600);
    g = await p.evaluate(() => ({ game: Rally.isOpen(), timer: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning }));
    t.check('a rest that ends in the middle of the hand-back closes the game and the timer, with no error', !g.game && !g.timer && !g.running, JSON.stringify(g));
    await ctx.close();

    // ── 9. Rally.handBack by itself ─────────────────────────────────────────────────────────────────────────────────────────────────────
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await restOn(p, 'Box Jump');
    await wait(p, 300);
    await playGame(p, 'rally');
    await p.evaluate(() => closeRestGames());
    const noGame = await p.evaluate(() => { let n = 0; Rally.handBack(() => n++); return n; });
    t.check('Rally.handBack with no game calls done at once', noGame === 1, noGame);
    // a point in play is let finish: a ball through the player's gap is Amir's point; then 0.8 s, then done(), and nothing is served again
    await playGame(p, 'rally');
    const point = await p.evaluate(async () => {
      const s = Rally._state(), sleep = ms => new Promise(r => setTimeout(r, ms));
      s.freeze = 0; s.you.x = 30; s.target.x = 30; s.amir.x = s.W - 30;
      s.ball.x = s.W / 2; s.ball.y = s.H - 8 - s.br * 6; s.ball.vx = 0; s.ball.vy = s.vmax * 0.6; s.anchor = { x: s.ball.x, y: s.ball.y, t: s.gt };
      const t0 = performance.now(); let doneAt = 0;
      Rally.handBack(() => { doneAt = performance.now() - t0; });
      const live = !!s.hb && !s.over;
      await sleep(120);
      const early = { done: doneAt, scoreAmir: s.score.amir, banner: s.banner && s.banner.text };
      await sleep(300);
      const after = { scoreAmir: s.score.amir, banner: s.banner && s.banner.text, over: s.over, freeze: s.freeze, y: s.ball.y };
      await sleep(1500);
      const x0 = s.ball.x; await sleep(3500);
      return { live, early, after, doneAt, still: s.ball.x === x0, over: s.over, goHidden: s.msg.querySelector('.rally-go').hidden, score: s.score.you + '-' + s.score.amir };
    });
    t.check('a live ball is let finish: the point counts, "Amir scores" shows, nothing is served after it',
      point.live && point.after.scoreAmir === 1 && point.after.banner === 'Amir scores' && point.after.over && point.after.y < 0, JSON.stringify(point));
    t.check('done() comes about 0.8 s after the point (between 0.7 and 2 s from the call)', point.doneAt >= 700 && point.doneAt <= 2000, point.doneAt);
    t.check('after done() the court stays stopped: still, over, 1-0 to Amir, no Play again', point.still && point.over && point.score === '0-1' && point.goHidden, JSON.stringify(point));
    await p.evaluate(() => closeRestGames());
    // a dead ball: done() after about 0.6 s, no new serve afterwards
    await playGame(p, 'rally');
    const dead = await p.evaluate(async () => {
      const s = Rally._state(), sleep = ms => new Promise(r => setTimeout(r, ms));
      await sleep(900);   // past the serve's pause: the ball lies still
      const x0 = s.ball.x, t0 = performance.now(); let doneAt = 0;
      Rally.handBack(() => { doneAt = performance.now() - t0; });
      await sleep(3600);   // longer than the 3 s after which a still ball is served again
      return { doneAt, banner: s.banner && s.banner.text, still: s.ball.x === x0 };
    });
    t.check('a dead ball: done() after about 0.6 s, "Last point." held, and the ball is not served again', dead.doneAt >= 550 && dead.doneAt <= 1000 && dead.banner === 'Last point.' && dead.still, JSON.stringify(dead));
    await p.evaluate(() => closeRestGames());
    // a ball that never scores: the hard deadline, 6 s
    await playGame(p, 'rally');
    const hard = await p.evaluate(async () => {
      const s = Rally._state(), sleep = ms => new Promise(r => setTimeout(r, ms));
      s.freeze = 0; s.you.x = s.W / 2; s.target.x = s.W / 2; s.target.y = s.H - 40; s.amir.x = s.W / 2;
      s.ball.x = s.W / 2; s.ball.y = s.H * 0.62; s.ball.vx = s.vmax * 0.9; s.ball.vy = 0; s.anchor = { x: s.ball.x, y: s.ball.y, t: s.gt };
      const t0 = performance.now(); let doneAt = 0;
      Rally.handBack(() => { doneAt = performance.now() - t0; });
      const live = !s.over;
      await sleep(7500);
      return { live, doneAt, scored: s.score.you + s.score.amir };
    });
    t.check('a ball that never scores is cut at the 6 s deadline', hard.live && hard.doneAt >= 5800 && hard.doneAt <= 6600 && hard.scored === 0, JSON.stringify(hard));
    await p.evaluate(() => closeRestGames());
    // the winning point: the match ends, Play again is not offered, done() follows
    await playGame(p, 'rally');
    const win = await p.evaluate(async () => {
      const s = Rally._state(), sleep = ms => new Promise(r => setTimeout(r, ms));
      s.score.amir = 4; s.freeze = 0; s.you.x = 30; s.target.x = 30; s.amir.x = s.W - 30;
      s.ball.x = s.W / 2; s.ball.y = s.H - 8 - s.br * 6; s.ball.vx = 0; s.ball.vy = s.vmax * 0.6; s.anchor = { x: s.ball.x, y: s.ball.y, t: s.gt };
      let doneAt = 0; const t0 = performance.now();
      Rally.handBack(() => { doneAt = performance.now() - t0; });
      await sleep(1300);
      return { doneAt, over: s.over, title: s.msg.querySelector('h3').textContent, go: s.msg.querySelector('.rally-go').hidden, boxHidden: s.msg.hidden };
    });
    t.check('a winning last point ends the match, hides Play again and hands back about 0.8 s later', win.over && /^Amir wins 5/.test(win.title) && win.go && !win.boxHidden && win.doneAt >= 700 && win.doneAt <= 1300, JSON.stringify(win));
    await p.evaluate(() => closeRestGames());
    await ctx.close();

    // ── 10. Sizes: 320 x 568, 390 x 844, light and dark: the clock, the controls and the line, whole, apart, no sideways scroll ──────
    for (const [w, h, dark] of [[320, 568, false], [390, 844, false], [320, 568, true], [375, 667, false]]) {
      ({ ctx, p } = await open(browser, { w, h, dark, long: true }));
      p.on('pageerror', e => errors.push(String(e)));
      await tickSet(p, LONG, 0);
      await restOn(p, LONG);
      await wait(p, 300);
      await playGame(p, 'rally');
      await setLeft(p, 24);
      await p.waitForFunction(() => !Rally.isOpen(), null, { timeout: 7000 });
      await wait(p, 300);
      const m = await p.evaluate(() => {
        const r = s => { const e = document.querySelector(s), b = e.getBoundingClientRect(), o = document.getElementById('timerOverlay').getBoundingClientRect();
          return { l: b.left, r: b.right, t: b.top - o.top + document.getElementById('timerOverlay').scrollTop, b: b.bottom - o.top + document.getElementById('timerOverlay').scrollTop, h: b.height, w: b.width }; };
        const ov = document.getElementById('timerOverlay');
        return { ring: r('.timer-ring'), ctl: r('.timer-controls'), gs: r('#timerGetSet'), top: r('.timer-top'), cue: r('#timerGetCue'), sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight,
          osw: ov.scrollWidth, ow: ov.clientWidth, sh: ov.scrollHeight, ch: ov.clientHeight, next: document.getElementById('timerGetNext').textContent, cuetext: document.getElementById('timerGetCue').textContent };
      });
      const label = w + 'x' + h + (dark ? ' dark' : '');
      t.check(label + ': next and the cue are as written (long name, set 2 of 2, the 2nd cue of the rotation)', m.next === 'Next: ' + LONG + ' · set 2 of 2' && m.cuetext === 'Exhale as you turn', m.next + ' | ' + m.cuetext);
      t.check(label + ': no sideways scroll, the line inside the screen', m.sw <= m.iw && m.osw <= m.ow && m.gs.l >= 0 && m.gs.r <= m.iw && m.cue.r <= m.iw, JSON.stringify(m));
      t.check(label + ': the ring, the controls and the line are apart, top to bottom', m.top.b <= m.ring.t + 1 && m.ring.b <= m.ctl.t + 1 && m.ctl.b <= m.gs.t + 1 && m.gs.h > 0, JSON.stringify(m));
      const fits = m.gs.b <= m.ch;
      t.check(label + ': the whole line ' + (fits ? 'is on the first screen' : 'is reachable by scrolling (' + m.sh + ' px of ' + m.ch + ')'), fits || m.sh >= m.gs.b, JSON.stringify(m));
      if (w === 320 && !dark) t.check('320x568: the line is on the first screen, with no scrolling', fits, JSON.stringify(m));
      await p.screenshot({ path: path.join(out, 'serve-clock-list-' + label.replace(' ', '-') + '.png') });
      if (dark) {
        const c = await p.evaluate(() => { const cs = getComputedStyle(document.getElementById('timerGetCue')), nx = getComputedStyle(document.getElementById('timerGetNext')); return { col: cs.color, bar: cs.borderLeftColor, next: nx.color, bg: getComputedStyle(document.querySelector('.timer-band')).backgroundImage.slice(0, 20) }; });
        t.check(label + ': white text on the green band, the clay bar', c.col === 'rgb(255, 255, 255)' && c.next === 'rgb(255, 255, 255)' && c.bar === 'rgb(224, 107, 67)', JSON.stringify(c));
      }
      await ctx.close();
    }
    // Guided at 320 x 568 and dark: the cue is under Next and inside the screen's scroll
    for (const dark of [false, true]) {
      ({ ctx, p } = await open(browser, { w: 320, h: 568, dark, long: true }));
      p.on('pageerror', e => errors.push(String(e)));
      await p.evaluate(() => { openStepMode('1'); });
      await wait(p, 350);
      await p.evaluate(() => { if (STEP && STEP.seq[STEP.pos].group) stepPrimary(); });
      await p.evaluate(n => { STEP.pos = STEP.seq.findIndex(x => x.name === n && x.setI === 0); renderStep(); }, LONG);
      await wait(p, 250);
      await p.click('#step-footer .step-primary-btn');
      await wait(p, 500);
      await setLeft(p, 24);
      const m = await p.evaluate(() => { const ov = document.getElementById('timerOverlay'), c = document.getElementById('timerCue'), b = c.getBoundingClientRect(), o = ov.getBoundingClientRect(), cs = getComputedStyle(c);
        return { shown: !c.hidden, r: b.right, w: innerWidth, sw: document.documentElement.scrollWidth, osw: ov.scrollWidth, ow: ov.clientWidth, col: cs.color, bar: cs.borderLeftColor, text: c.textContent, bottom: b.bottom - o.top + ov.scrollTop, sh: ov.scrollHeight }; });
      t.check('Guided 320x568' + (dark ? ' dark' : '') + ': the cue shows whole, with no sideways scroll, inside the overlay\'s scroll', m.shown && m.text === 'Exhale as you turn' && m.r <= m.w && m.sw <= m.w && m.osw <= m.ow && m.bottom <= m.sh, JSON.stringify(m));
      if (dark) t.check('Guided dark: the cue is light text with the clay bar', m.col !== 'rgb(0, 0, 0)' && m.bar === 'rgb(199, 85, 47)', JSON.stringify(m));
      await p.screenshot({ path: path.join(out, 'serve-clock-guided-320' + (dark ? '-dark' : '') + '.png') });
      await ctx.close();
    }

    t.check('the page logged no error', errors.length === 0, errors.join(' | '));
  } catch (e) {
    t.check('the run finished', false, e.stack || String(e));
  } finally {
    await browser.close();
  }
  console.log('screenshots: ' + out);
  process.exit(t.report() ? 1 : 0);
})();
