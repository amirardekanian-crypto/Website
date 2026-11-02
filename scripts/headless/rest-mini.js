// The rest, minimised (Amir, 2026-11-02: "i want to add a minimise funtion to rest timer, so the athlete can minimise the rest, and check
// other training without losing rest time"; his picks: a small bar at the foot of the screen, above the tab bar, a tap opens it again).
//   M1  Minimise takes the rest timer away and leaves one bar; the clock does not stop or restart (timerEndsAt is the same)
//   M2  the bar counts down, sits above the tab bar when it shows and at the foot of the screen mid-session, and never runs off a 320 px phone
//   M3  a tap on the bar opens the rest timer again, still running, at the same clock
//   M4  at zero, minimised: the beep, the bar says Go, then it goes with the rest
//   M5  ✕, a new rest and Pause behave: ✕ ends it (no bar), a new rest opens whole, a paused rest says Paused on the bar
//   M6  Guided's rest has no Minimise
// Serve the repo first (python -m http.server 8851 --bind 127.0.0.1; BASE=http://127.0.0.1:8851; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/rest-mini.js
'use strict';
const H = require('./lib');
const t = H.checker();

const open = async (browser, w = 390) => {
  const o = await H.openProgram(browser, { w, h: 844, prog: H.fixture(), hist: [], stub: { library: H.library() } });
  o.p.setDefaultTimeout(8000);
  await o.p.evaluate(() => { openDayView('1'); document.querySelectorAll('#day-view .checklist-item.collapsed').forEach(c => toggleExpand(c)); });
  await o.p.waitForTimeout(400);
  return o;
};
// The card's own Rest button, a real click.
async function restOn(p, nm) {
  await p.evaluate(nm => {
    const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === nm);
    const b = c.querySelector('.rest-btn'); b.classList.add('__r'); b.scrollIntoView({ block: 'center' });
  }, nm);
  await p.click('.rest-btn.__r');
  await p.evaluate(() => document.querySelectorAll('.__r').forEach(b => b.classList.remove('__r')));
  await p.waitForTimeout(200);
}
const st = p => p.evaluate(() => {
  const ov = document.getElementById('timerOverlay'), bar = document.getElementById('restMini'), r = bar.getBoundingClientRect();
  const tb = document.getElementById('global-tabs').getBoundingClientRect();
  return { over: ov.classList.contains('visible'), bar: !bar.hidden && r.height > 0, time: document.getElementById('restMiniTime').textContent,
    k: bar.querySelector('.rm-k').textContent, running: timerRunning, ends: timerEndsAt, mini: timerMini,
    left: r.left, right: r.right, bottom: r.bottom, top: r.top, vw: innerWidth, vh: innerHeight, tabsTop: tb.height ? tb.top : null,
    name: document.getElementById('restMiniName').textContent, label: bar.getAttribute('aria-label') || '' };
});
const secs = s => { const m = String(s).match(/^(\d+):(\d\d)$/); return m ? +m[1] * 60 + +m[2] : NaN; };

(async () => {
  const browser = await H.launch();
  for (const w of [390, 320]) {
    const { ctx, p } = await open(browser, w);
    await p.evaluate(() => { window.__beeps = 0; const b = restBeep; window.restBeep = () => { window.__beeps++; b(); }; });
    await restOn(p, 'Barbell Back Squat');
    let s0 = await st(p);
    t.check(`(${w}) the card's Rest opens the rest timer, running, with no bar`, s0.over && s0.running && !s0.bar, JSON.stringify(s0));
    const minBtn = await p.evaluate(() => { const b = document.getElementById('timerMinBtn').getBoundingClientRect(); return { w: b.width, h: b.height, inView: b.right <= innerWidth && b.left >= 0 }; });
    t.check(`(${w}) Minimise is on the rest timer, 44 px, on the screen`, minBtn.w >= 44 && minBtn.h >= 44 && minBtn.inView, JSON.stringify(minBtn));
    await p.click('#timerMinBtn');
    await p.waitForTimeout(300);
    let s = await st(p);
    // M1
    t.check(`(${w}) Minimise: the rest timer goes and one bar is left`, !s.over && s.bar && s.mini, JSON.stringify(s));
    t.check(`(${w}) …and the clock is the same one, still running`, s.running && s.ends === s0.ends, JSON.stringify([s0.ends, s.ends]));
    t.check(`(${w}) …the bar names the exercise and says Rest`, /Back Squat/.test(s.name) && s.k === 'Rest', JSON.stringify(s));
    // M2: before Start the day shows the tab bar, so the bar sits above it; mid-session (session-on) the tab bar hides and it drops to the foot
    t.check(`(${w}) the bar is inside the screen side to side, and above the tab bar`, s.left >= 0 && s.right <= s.vw && s.tabsTop !== null && s.bottom <= s.tabsTop, JSON.stringify(s));
    await p.evaluate(() => document.body.classList.add('session-on'));
    await p.waitForTimeout(600);
    s = await st(p);
    t.check(`(${w}) mid-session, with no tab bar, the bar drops to the foot of the screen`, s.tabsTop === null && s.bottom <= s.vh && s.vh - s.bottom < 40, JSON.stringify(s));
    await p.evaluate(() => document.body.classList.remove('session-on'));
    const a = secs(s.time);
    await p.waitForTimeout(2200);
    s = await st(p);
    t.check(`(${w}) the bar counts down`, secs(s.time) <= a - 1 && secs(s.time) >= a - 3, JSON.stringify([a, s.time]));
    // the athlete moves about: Home, with the tab bar
    await p.evaluate(() => closeDayView());
    await p.waitForTimeout(700);
    s = await st(p);
    t.check(`(${w}) on Home the bar is still there, above the tab bar`, s.bar && s.tabsTop !== null && s.bottom <= s.tabsTop, JSON.stringify(s));
    // M3
    const before = secs(s.time);
    await p.click('#restMini');
    await p.waitForTimeout(300);
    s = await st(p);
    const clock = await p.evaluate(() => document.getElementById('timerDisplay').textContent);
    t.check(`(${w}) a tap on the bar opens the rest timer again, still running, no bar`, s.over && !s.bar && s.running && s.ends === s0.ends, JSON.stringify(s));
    t.check(`(${w}) …at the same clock`, Math.abs(secs(clock.includes(':') ? clock : '0:' + String(clock).padStart(2, '0')) - before) <= 1, JSON.stringify([clock, before]));
    // M5: Pause shows on the bar
    await p.click('#startStopBtn');
    await p.click('#timerMinBtn');
    await p.waitForTimeout(250);
    s = await st(p);
    t.check(`(${w}) a paused rest, minimised, says Paused and does not count`, s.bar && s.k === 'Paused' && !s.running, JSON.stringify(s));
    const pausedAt = s.time;
    await p.waitForTimeout(1300);
    t.check(`(${w}) …and stays put`, (await st(p)).time === pausedAt);
    await p.click('#restMini'); await p.waitForTimeout(150);
    await p.click('#startStopBtn');
    // M4: run it out while minimised
    await p.click('#timerMinBtn');
    await p.evaluate(() => { timerEndsAt = Date.now() + 1200; });
    await p.waitForTimeout(1500);
    s = await st(p);
    t.check(`(${w}) at zero, minimised: the bar says Go`, s.bar && s.time === 'Go', JSON.stringify(s));
    t.check(`(${w}) …and the rest beeped`, (await p.evaluate(() => window.__beeps)) >= 1);
    await p.waitForTimeout(1300);
    s = await st(p);
    t.check(`(${w}) …then the bar goes with the rest, and the timer does not come back`, !s.bar && !s.over && !s.mini, JSON.stringify(s));
    // M5: ✕ ends it, and a new rest opens whole
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(400);
    await restOn(p, 'Box Jump');
    await p.click('#timerMinBtn'); await p.waitForTimeout(150);
    await restOn(p, 'Barbell Back Squat');
    s = await st(p);
    t.check(`(${w}) a new rest while one is minimised opens whole, with no bar`, s.over && !s.bar && !s.mini && /Back Squat/.test(await p.evaluate(() => document.getElementById('timer-exercise-name').textContent)), JSON.stringify(s));
    await p.click('#timerXBtn'); await p.waitForTimeout(150);
    s = await st(p);
    t.check(`(${w}) ✕ ends the rest: no timer, no bar`, !s.over && !s.bar && !s.running, JSON.stringify(s));
    t.check(`(${w}) no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  // M6: Guided
  {
    const { ctx, p } = await open(browser);
    await p.evaluate(() => { openStepMode('1'); });
    await p.waitForTimeout(300);
    await p.evaluate(() => openTimerAuto(60, 'Box Jump', () => {}, null));
    await p.waitForTimeout(200);
    const g = await p.evaluate(() => ({ over: document.getElementById('timerOverlay').classList.contains('visible'), min: document.getElementById('timerMinBtn').getBoundingClientRect().width }));
    t.check('Guided: its rest has no Minimise', g.over && g.min === 0, JSON.stringify(g));
    await p.evaluate(() => minimiseTimer());
    t.check('Guided: minimiseTimer() does nothing there', await p.evaluate(() => document.getElementById('timerOverlay').classList.contains('visible') && document.getElementById('restMini').hidden));
    t.check('no page errors (Guided)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
