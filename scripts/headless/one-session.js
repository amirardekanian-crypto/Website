// One session at a time (Amir, 2026-10-25): node scripts/headless/one-session.js
//
// "When im in middle of the workout, and i quit the app or go back, it doesnt show me which workout i was doing, in the middle of
// a session i can do another session" and "many times it says you have done one set in a day i havent started yet". The set log is
// kept per exercise NAME, so a lift Day 2 shares with Day 1 made Day 1 look started, and Home's card Resumed Day 1 (the first such
// day) while the athlete was on Day 2. Now a day is under way only when it was ticked today itself (markTouched()) or its clock
// runs, Home Resumes that one day (activeDayId()), and opening another unfinished day sends the athlete back to it.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

// Day 1 gets Day 2's Incline Dumbbell Press as well, so the two days share a lift.
function prog() {
  const P = H.fixture();
  const inc = P.workouts.days[1].blocks.flatMap(b => b.exercises).find(e => e.name === 'Incline Dumbbell Press');
  P.workouts.days[0].blocks[P.workouts.days[0].blocks.length - 1].exercises.push(JSON.parse(JSON.stringify(inc)));
  return P;
}

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog(), hist: [] });
  p.setDefaultTimeout(8000);
  await p.evaluate(() => { openDayView('2'); });
  await p.waitForTimeout(400);
  // A real tap on set 1 of Day 2's Incline Dumbbell Press.
  await p.evaluate(() => {
    const c = [...document.querySelectorAll('#day-view .checklist-item[data-day="2"]')].find(c => c.querySelector('.item-name').textContent.trim() === 'Incline Dumbbell Press');
    if (c.classList.contains('collapsed')) toggleExpand(c);
    c.querySelector('.ex-set-check').classList.add('__t');
    try { hideAaToast(); } catch (e) {}
  });
  await p.click('.ex-set-check.__t');
  await p.waitForTimeout(200);
  await p.evaluate(() => { hideAaToast(); closeDayView(); });
  await p.waitForTimeout(300);

  const home = await p.evaluate(() => ({
    d1: dayInProgress('1'), d2: dayInProgress('2'), act: activeDayId(), sug: suggestedDayId(),
    hero: (document.querySelector('.dc-hero .day-card-num') || {}).textContent || '',
    sets: (document.querySelector('.dc-hero .dc-prog span') || {}).textContent || '',
  }));
  C.check('Day 2, ticked, is under way', home.d2 === true, JSON.stringify(home));
  C.check('Day 1, which only shares the lift, is not', home.d1 === false, JSON.stringify(home));
  C.check('Home\'s card says In progress · Day 2 and Resumes it', /In progress · Day 2/.test(home.hero) && home.act === '2' && home.sug === '2', JSON.stringify(home));
  C.check('the card counts Day 2\'s one set', /^1 of /.test(home.sets), home.sets);

  // Tapping Day 1 mid-session: it does not open, the box points back to Day 2.
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(200);
  const blocked = await p.evaluate(() => ({
    dayOpen: !document.getElementById('day-view').hidden,
    toast: !document.getElementById('aaToast').hidden ? document.getElementById('aaToast').textContent : '',
  }));
  C.check('Day 1 does not open while Day 2 is under way', !blocked.dayOpen, JSON.stringify(blocked));
  C.check('the box says Day 2 is under way and offers Back to Day 2', /middle of Day 2/.test(blocked.toast) && /Back to Day 2/.test(blocked.toast), blocked.toast);
  await p.click('#aaToast .aa-toast-go');
  await p.waitForTimeout(300);
  const back = await p.evaluate(() => ({ open: !document.getElementById('day-view').hidden, active: (document.querySelector('#day-view .day-card-num') || {}).textContent || '' }));
  C.check('Back to Day 2 opens Day 2', back.open && /Day 2/.test(back.active), JSON.stringify(back));

  // A clock started on a day with nothing ticked still counts as under way.
  const clock = await p.evaluate(() => {
    closeDayView();
    localStorage.removeItem(ATHLETE_ID + '_touched_d2');
    startTimerNow('1');
    return { act: activeDayId(), d2: dayInProgress('2') };
  });
  C.check('a clock started on Day 1 makes it the day under way', clock.act === '1' && clock.d2 === false, JSON.stringify(clock));
  C.check('no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close();
  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
