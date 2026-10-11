// The first-timer fixes (2026-10-11, Content/CLIENT-APP-MAP.md): the Library counts retry after a failed load, Game Plan's dates are
// local days, Reset clears a circuit's round ratings, the sore-only wording, sign-in's WhatsApp link, the readiness button's count and
// the scroll to the finish card. Serve the repo (see lib.js), then: TZ=America/Los_Angeles node scripts/headless/first-timer.js
// (the date check needs a zone west of UTC; in UTC it passes either way).
'use strict';
const H = require('./lib');

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  // ── the programme: the fixture plus one circuit in Day 1's Core block ──
  const prog = H.fixture();
  prog.workouts.days[0].blocks[2].exercises.push({
    type: 'circuit', name: 'Repeat-Effort Circuit', rx: { rounds: 2, rest: 60 },
    items: [{ name: 'Squat Jump', exId: 'squat-jump', rx: { time: '20 seconds' } }, { name: 'Mountain Climber', exId: 'mountain-climber', rx: { time: '20 seconds' } }],
  });
  const cur = prog.cycles[prog.currentCycleIndex];

  // ── 1. dates on Game Plan are the local day (needs TZ west of UTC) ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog });
    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(300);
    const got = await p.evaluate(() => (document.querySelector('.home-dates, .plan-dates, #athlete-card-wrap') || document.body).innerText);
    const mon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const f = iso => { const [y, m, d] = iso.split('-').map(Number); return mon[m - 1] + ' ' + d; };
    const want = f(cur.startDate) + ' — ' + f(cur.endDate);
    t.check('Game Plan header dates are the cycle\'s own days (TZ ' + (process.env.TZ || 'default') + ')', got.toUpperCase().replace(/\s+/g, ' ').includes(want), 'want "' + want + '" in "' + got.replace(/\s+/g, ' ').slice(0, 160) + '"');
    const days = await p.evaluate(() => { const b = document.getElementById('sub-banner-wrap'); return b ? b.innerText.replace(/\s+/g, ' ') : ''; });
    const todayLocal = new Date(); todayLocal.setHours(0, 0, 0, 0);
    const [y, m, d] = cur.endDate.split('-').map(Number);
    const left = Math.round((new Date(y, m - 1, d) - todayLocal) / 86400000);
    if (left >= 0 && left <= 14) t.check('days-left banner counts from the local end day', new RegExp('\\b' + left + ' days? left', 'i').test(days), days + ' (want ' + left + ')');
    await ctx.close();
  }

  // ── 2. readiness: the grey button says why ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog });
    await p.evaluate(() => openDayView('1')); await p.waitForTimeout(300);
    await p.evaluate(() => openReadiness('1')); await p.waitForTimeout(200);
    const txt = () => p.evaluate(() => { const b = document.getElementById('readiness-begin'); return { t: b.textContent.trim(), dis: b.disabled }; });
    let s = await txt();
    t.check('readiness: starts "0 of 5 answered", disabled', s.t === '0 of 5 answered' && s.dis, JSON.stringify(s));
    const opts = await p.$$('.readiness-q');
    for (let i = 0; i < 3; i++) await (await opts[i].$$('.readiness-opt'))[2].click();
    s = await txt();
    t.check('readiness: "3 of 5 answered" after three answers', s.t === '3 of 5 answered' && s.dis, JSON.stringify(s));
    for (let i = 3; i < 5; i++) await (await opts[i].$$('.readiness-opt'))[2].click();
    s = await txt();
    t.check('readiness: "Begin session ▶", enabled, after five', /begin session/i.test(s.t) && !s.dis, JSON.stringify(s));
    await ctx.close();
  }

  // ── 3. Reset clears a circuit's round ratings, keeps its kg ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog });
    await p.evaluate(() => openDayView('1')); await p.waitForTimeout(300);
    const found = await p.evaluate(() => { const c = document.querySelector('#day-view .round-group'); if (!c) return null; if (c.classList.contains('collapsed')) toggleExpand(c); return { rows: c.querySelectorAll('.rpe-row').length, rounds: c.dataset.rounds, logw: c.dataset.logWeight }; });
    t.check('circuit card is in Day 1', !!found, JSON.stringify(found));
    if (found) {
      await p.evaluate(() => { const c = document.querySelector('#day-view .round-group'); c.querySelectorAll('.rpe-row').forEach(r => r.classList.add('visible')); const b = c.querySelector('.rpe-row .rpe-btn[data-rpe="8"]'); b.click(); });
      let keys = await p.evaluate(() => Object.keys(localStorage).filter(k => k.includes('_rpe_Repeat-Effort_Circuit')));
      t.check('a round rating is stored before Reset', keys.length >= 1, keys.join(','));
      await p.evaluate(() => resetDay('1')); await p.waitForTimeout(300);
      keys = await p.evaluate(() => Object.keys(localStorage).filter(k => k.includes('_rpe_Repeat-Effort_Circuit')));
      const sel = await p.evaluate(() => document.querySelectorAll('#day-view .round-group .rpe-btn.selected').length);
      t.check('Reset removes the round rating from storage', keys.length === 0, keys.join(','));
      t.check('Reset un-selects the round rating on screen', sel === 0, sel);
    }
    t.check('no page errors (reset)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 4. sign-in: "Message Amir" is a real WhatsApp link ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog });
    const href = await p.evaluate(() => { showSignIn(); const a = document.getElementById('si-help-wa'); return a ? a.href : 'no link'; });
    t.check('sign-in help link points at WhatsApp with the reason written', /^https:\/\/wa\.me\/447435363461\?text=Hi%20Amir/.test(href), href);
    await ctx.close();
  }

  // ── 5. Library counts: a failed first load is not frozen as 0 ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog });
    await p.route('**/workouts/index.json', r => r.abort());
    await p.route('**/articles/index.json', r => r.abort());
    await p.evaluate(() => goLibrary()); await p.waitForTimeout(1500);
    const a = await p.evaluate(() => ({ s: document.getElementById('sessions-count').textContent.trim(), loaded: _libCountsLoaded }));
    t.check('failed load leaves the counts blank and not marked loaded', a.s === '' && a.loaded === false, JSON.stringify(a));
    await p.unroute('**/workouts/index.json'); await p.unroute('**/articles/index.json');
    await p.evaluate(() => { goTo('home'); goLibrary(); }); await p.waitForTimeout(2000);
    const b = await p.evaluate(() => ({ s: document.getElementById('sessions-count').textContent.trim(), r: document.getElementById('playbook-count').textContent.trim() }));
    t.check('the next visit loads them', /^\d+ Sessions?$/.test(b.s) && /^\d+ Reads?$/.test(b.r) && b.s !== '0 Sessions', JSON.stringify(b));
    await ctx.close();
  }

  // ── 6. sore-only wording ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog });
    const out = await p.evaluate(() => ({
      sore: readinessBannerHtml('1', { level: 'green', sore: 'half', asWritten: true }, {}),
      low: readinessBannerHtml('1', { level: 'amber', sore: null, asWritten: true }, {}),
      red: readinessBannerHtml('1', { level: 'red', sore: null, asWritten: true }, {}),
    }));
    t.check('sore-only: "said you were sore today"', /Your check-in said you were sore today\./.test(out.sore), out.sore.replace(/\s+/g, ' ').slice(0, 200));
    t.check('lower day: "suggested a lower day"', /Your check-in suggested a lower day\./.test(out.low));
    t.check('short day: "suggested a short day"', /Your check-in suggested a short day\./.test(out.red));
    await ctx.close();
  }

  // ── 7. after the last card closes, the finish card is brought into view (a standard card last, then a circuit last) ──
  for (const [label, pr] of [['standard card last', H.fixture()], ['circuit last', prog]]) {
    const { ctx, p } = await H.openProgram(browser, { prog: pr });
    await p.evaluate(() => openDayView('1')); await p.waitForTimeout(300);
    await p.evaluate(() => { startTimerNow('1'); window.scrollTo(0, 0); });
    const n = await p.evaluate(() => document.querySelectorAll('#day-view .checklist-item').length);
    for (let i = 0; i < n; i++) {
      // like a person: open the card, tick it (a circuit: tick, then rate each round)
      await p.evaluate(i => {
        const c = document.querySelectorAll('#day-view .checklist-item')[i];
        if (c.classList.contains('collapsed')) toggleExpand(c);
        if (!c.classList.contains('checked')) toggleCheckOnly(c, '1');
        if (c.classList.contains('round-group')) c.querySelectorAll('.rpe-row').forEach(r => r.querySelector('.rpe-btn[data-rpe="7"]').click());
      }, i);
      await p.waitForTimeout(1000);
    }
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => { const c = document.getElementById('confirm-1'); const b = c.getBoundingClientRect(); return { vis: c.classList.contains('visible'), top: Math.round(b.top), bottom: Math.round(b.bottom), h: innerHeight }; });
    t.check('finish card is on screen after the last card closes (' + label + ')', r.vis && r.top >= 0 && r.bottom <= r.h + 4, JSON.stringify(r));
    t.check('no page errors (' + label + ')', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
