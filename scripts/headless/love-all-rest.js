// Love All round 5 (2026-10-24): two things Amir decided, checked the way the athlete meets them.
//   rest  a tick in the day's list opens NO rest by itself (Amir, 2026-10-25, undoing 2026-10-24: "go back i dont like it"). The card's
//         Rest button opens it, and Guided rests itself. The old "Rest 2:00" pill stays gone.
//   before  a Library session's Before you start is open the first time it is viewed on this phone and folded after that
//         (ws_before_seen, this phone only), with the one-row head, the count and the Safety checks line kept.
// Serve the repo first (python -m http.server 8881 --bind 127.0.0.1; BASE=http://127.0.0.1:8881; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-rest.js
'use strict';
const H = require('./lib');

const t = H.checker();

// The fixture's day 1: Rowing (a simple warm-up), Box Jump x3 (rest 90), Back Squat x4 (150), Split Squat x3 and Pallof x3 (no rest
// written), Side Plank x3 (a timed hold), Mystery Carry x2. Here Pallof, the plank and the carry get a written rest, the split squat none.
function prog() {
  const P = H.fixture();
  const ex = n => P.workouts.days[0].blocks.flatMap(b => b.exercises).find(e => e.name === n);
  ex('Half Kneeling Pallof Press').rx.rest = 45;
  ex('Side Plank').rx.rest = 40;
  ex('Mystery Carry').rx.rest = 30;
  return P;
}
const open = async (browser, extra = {}) => {
  const o = await H.openProgram(browser, Object.assign({ w: 390, h: 844, prog: prog() }, extra));
  o.p.setDefaultTimeout(8000);
  await o.p.evaluate(() => { openDayView('1'); });
  await o.p.waitForTimeout(400);
  return o;
};
const card = H.card;
// Every card open, so a circle is there to click.
const openAll = p => p.evaluate(() => document.querySelectorAll('#day-view .checklist-item.collapsed').forEach(c => toggleExpand(c)));
// A real click on set i's circle of a card (the page scrolls to it first).
async function tick(p, nm, i) {
  await p.evaluate(([nm, i]) => {
    const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === nm);
    c.querySelectorAll('.ex-set-check').forEach((b, k) => b.classList.toggle('__t', k === i));
    try { hideAaToast(); } catch (e) {}
  }, [nm, i]);
  await p.click('.ex-set-check.__t');
  await p.evaluate(() => document.querySelectorAll('.__t').forEach(b => b.classList.remove('__t')));
  await p.waitForTimeout(150);
}
const rest = p => p.evaluate(() => {
  const ov = document.getElementById('timerOverlay');
  return { on: ov.classList.contains('visible'), clock: document.getElementById('timerDisplay').textContent,
    name: document.getElementById('timer-exercise-name').textContent, running: timerRunning, ends: timerEndsAt };
});
const close = async p => { await p.click('#timerXBtn'); await p.waitForTimeout(150); };

async function restTests(browser) {
  let { ctx, p } = await open(browser);
  await openAll(p);
  // A pill above the tab bar is not here and not in the code.
  t.check('rest: offerRest() is gone and no Rest 2:00 pill exists', await p.evaluate(() => typeof offerRest === 'undefined' && !document.querySelector('.rest-offer, #restOffer')));
  // 1. a tick in the list opens nothing (Amir, 2026-10-25: "go back i dont like it")
  await tick(p, 'Box Jump', 0);
  let r = await rest(p);
  t.check('rest: a tap on Box Jump set 1 opens no rest by itself', !r.on, JSON.stringify(r));
  t.check('rest: restAfterTick() is gone', await p.evaluate(() => typeof restAfterTick === 'undefined'));
  // 2. the card's Rest button still opens it, running, at the card's time
  await p.evaluate(() => {
    const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === 'Box Jump');
    c.querySelector('.rest-btn').click();
  });
  await p.waitForTimeout(200);
  r = await rest(p);
  t.check('rest: the Rest button opens the rest at 1:30, running', r.on && r.clock === '1:30' && r.running, JSON.stringify(r));
  await close(p);
  t.check('rest: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();

  // 3. Guided rests itself, once per set
  ({ ctx, p } = await open(browser));
  await p.evaluate(() => { window.__shows = 0; const s = showTimer; window.showTimer = function () { window.__shows++; return s.apply(this, arguments); }; });
  await p.evaluate(() => { openStepMode('1'); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { if (STEP && STEP.seq[STEP.pos].group) stepPrimary(); });
  await p.waitForTimeout(300);
  const g0 = await p.evaluate(() => window.__shows);
  await p.click('#step-footer .step-primary-btn');
  await p.waitForTimeout(500);
  const g1 = await p.evaluate(() => ({ shows: window.__shows, on: document.getElementById('timerOverlay').classList.contains('visible'), auto: !!timerOnComplete }));
  t.check('rest: Guided\'s Done rests once (one overlay opened, and it is Guided\'s own)', g1.shows - g0 === 1 && g1.on && g1.auto, JSON.stringify([g0, g1]));
  await ctx.close();
}

// ═════════ BEFORE YOU START: open the first time a session is viewed on this phone, folded after ═════════
async function before(browser) {
  const LIB = H.library();
  const FULL = 'strength/full-body-power', OTHER = 'mobility/everyday-mobility';
  const view = (p, k) => p.evaluate(k => { goTo('workouts'); openWorkout(k); }, k).then(() => p.waitForTimeout(800));
  const info = p => p.evaluate(() => {
    const b = document.getElementById('ws-before-btn'), body = document.getElementById('ws-before-body');
    return { exp: b.getAttribute('aria-expanded'), vis: !!body.getClientRects().length, n: document.getElementById('ws-before-n').textContent,
      safety: b.querySelector('.wb-s').textContent, h: Math.round(b.getBoundingClientRect().height), seen: localStorage.getItem('ws_before_seen') };
  });
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, stub: { library: LIB } });
    p.setDefaultTimeout(8000);
    await p.evaluate(() => goLibrary()); await p.waitForTimeout(900);
    await view(p, FULL);
    const a1 = await info(p);
    t.check('before: the first time a session is viewed on this phone it is open (text showing), with the count and the safety line on the row',
      a1.exp === 'true' && a1.vis && /^\d+ things?$/.test(a1.n) && a1.safety === 'Safety checks: what to stop for' && a1.h >= 44, JSON.stringify(a1));
    t.check('before: the phone keeps it as ws_before_seen = {"<id>": 1}, no athlete prefix', Object.keys(JSON.parse(a1.seen)).length === 1 && Object.values(JSON.parse(a1.seen))[0] === 1
      && await p.evaluate(() => Object.keys(localStorage).filter(k => /ws_before_seen/.test(k)).length === 1), a1.seen);
    await view(p, FULL);
    const a2 = await info(p);
    t.check('before: viewed again it is one folded row, the count and the safety line still on it', a2.exp === 'false' && !a2.vis && a2.n === a1.n && a2.safety === a1.safety, JSON.stringify(a2));
    await p.click('#ws-before-btn'); await p.waitForTimeout(200);
    t.check('before: a tap opens it, and the next view folds it again', (await info(p)).exp === 'true' && (await view(p, FULL), (await info(p)).exp === 'false'));
    await view(p, OTHER);
    const o1 = await info(p);
    t.check('before: another session is open its first time, and both are remembered', o1.exp === 'true' && o1.vis && Object.keys(JSON.parse(o1.seen)).length === 2, JSON.stringify(o1));
    t.check('before: nothing synced (the key is on this phone only, not in the cloud queue)', await p.evaluate(() => !/ws_before_seen/.test(JSON.stringify(window.__STUB && window.__STUB.params || []))));
    t.check('before: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {   // a private window: storage cannot be read or written, so it is open every time
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, stub: { library: LIB } });
    p.setDefaultTimeout(8000);
    await p.evaluate(() => {
      const og = Storage.prototype.getItem, os = localStorage.setItem;
      localStorage.getItem = k => { if (k === 'ws_before_seen') throw new Error('blocked'); return og.call(localStorage, k); };
      localStorage.setItem = (k, v) => { if (k === 'ws_before_seen') throw new Error('blocked'); return os.call(localStorage, k, v); };
    });
    await p.evaluate(() => goLibrary()); await p.waitForTimeout(900);
    await view(p, FULL); await view(p, FULL);
    t.check('before: with storage blocked it is open every time (the safe way round) and nothing throws',
      await p.evaluate(() => document.getElementById('ws-before-btn').getAttribute('aria-expanded')) === 'true' && p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

(async () => {
  const browser = await H.launch();
  await restTests(browser);
  await before(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
