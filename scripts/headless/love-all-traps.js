// Love All round 2 (2026-10-24), the traps group:
//   a  the roadmap's last cycle never names a Cycle that does not exist (Home between cycles).
//   b  shortLift cuts a name only when it does not fit, never mid-word when a whole word would.
//   c  a card's "Day N" is the day's real id everywhere (ids 1 and 3 say Day 1 and Day 3).
//   d  Welcome's button opens the Next up day and says its number.
//   e  Library > Exercises chip row: the last chip scrolls into view whole.
// Serve the repo first (python -m http.server 8842 --bind 127.0.0.1; BASE=http://127.0.0.1:8842; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-traps.js
'use strict';
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const t = H.checker();

// ═════════ a: the last cycle ═════════
async function a(browser) {
  const P = H.fixture();
  const idx = P.cycles.length - 1;
  P.currentCycleIndex = idx;
  const start = Date.now() - 38 * DAY;
  P.cycles.forEach((c, i) => { const s = start + (i - idx) * 35 * DAY; c.startDate = ymd(new Date(s)); c.endDate = ymd(new Date(s + 34 * DAY)); });
  const seen = { _hl_seen: { ['cycle' + (idx + 1) + '|' + P.cycles[idx].endDate]: 1 } };
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { ctx, p } = await H.openProgram(browser, { w, h, prog: P, seed: seen, stub: { library: H.library() } });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => {
      const home = document.getElementById('screen-home').innerText;
      const wa = document.querySelector('#screen-home .bt-wa a');
      return { home, href: wa ? decodeURIComponent(wa.href) : '' };
    });
    const next = 'Cycle ' + (idx + 2);
    t.check(`a ${w}: the last cycle's Home never names ${next}`, !r.home.includes(next) && !r.href.includes(next) && !/Cycle \d+ starts/.test(r.home), JSON.stringify(r).slice(0, 300));
    t.check(`a ${w}: it says this was the last cycle and I'll be in touch`, /last cycle of your plan/.test(r.home) && /I'll be in touch about what comes next/.test(r.home));
    t.check(`a ${w}: no em-dash or semicolon in what it says`, !/[—;]/.test(r.home.split('Roadmap complete')[1] || ''));
    t.check(`a ${w}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

// ═════════ b: shortLift ═════════
async function b(browser) {
  const day = n => ymd(new Date(Date.now() - n * DAY));
  const rec = (lift, kg, n) => ({ lift, kg, w: String(kg - 10), r: '6', rpe: 7, d: day(n), t: Date.now() - n * DAY });
  for (const [lift, whole] of [['Barbell Romanian Deadlift', 'Romanian Deadlift'], ['Dumbbell Single-Leg Romanian Deadlift Hold', null]]) {
    for (const [w, h] of [[390, 844], [320, 640]]) {
      const seed = { _1rm: [rec(lift, 100, 20), rec(lift, 110, 10), rec(lift, 120, 2)] };
      const { ctx, p } = await H.openProgram(browser, { w, h, seed });
      await p.evaluate("goTo('plan')"); await p.waitForTimeout(700);
      const r = await p.evaluate(() => {
        const q = s => [...document.querySelectorAll(s)].map(e => e.textContent.replace(/\s+/g, ' ').trim());
        return { tr: q('.tr-n'), door: q('#ceiling-row-wrap .hrow-v small'), side: document.documentElement.scrollWidth - window.innerWidth };
      });
      await p.evaluate("goTo('ceiling')"); await p.waitForTimeout(600);
      const cov = await p.evaluate(() => document.querySelector('.screen.active .ceil-board').innerText.replace(/\s+/g, ' '));
      const seen = r.tr.concat(r.door.map(x => x.split(' · ')[0]));
      const full = lift.replace(/^dumbbell\s+/i, '').replace(/^barbell\s+/i, '');
      const okWord = x => x === full || (x.endsWith('…') && full.startsWith(x.slice(0, -1)) && (full[x.length - 1] === ' ' || full[x.length - 1] === undefined));
      t.check(`b ${w}: "${lift}" is drawn on Progress (card and Records row)`, seen.length >= 1, JSON.stringify(r));
      t.check(`b ${w}: ${whole ? 'a name that fits is whole (' + whole + ')' : 'a long name loses whole words, never half a word'}`, whole ? seen.every(x => x === whole) && cov.includes(whole.toUpperCase()) || cov.includes(whole) : seen.every(okWord), JSON.stringify([seen, cov]));
      t.check(`b ${w}: no sideways scroll, no page errors`, r.side <= 0 && p.errs.length === 0, JSON.stringify([r.side, p.errs]));
      await ctx.close();
    }
  }
}

// ═════════ c: Day N is the day's real id ═════════
function idsProg() {
  const P = H.fixture({ dated: false });
  P.workouts.days[1].id = 3;
  return P;
}
async function c(browser) {
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const hist = [{ completed_on: ymd(new Date()), day: '1', readiness: 4, log: [] }];
    const seed = { _autofiled: [{ on: ymd(new Date(Date.now() - DAY)), day: '3', done: 2, total: 6, at: Date.now() }] };
    const { ctx, p } = await H.openProgram(browser, { w, h, prog: idsProg(), hist, seed });
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({
      hero: (document.querySelector('#day-cards-wrap .day-card-num') || {}).textContent || '',
      go: (document.querySelector('#day-cards-wrap .dc-go') || {}).textContent || '',
      rows: [...document.querySelectorAll('#day-cards-wrap .dc-row')].map(e => e.getAttribute('aria-label') + '|' + e.querySelector('.dc-num').textContent),
      uf: (document.querySelector('.uf-t') || {}).textContent || '' }));
    t.check(`c ${w}: Home's Next up card says Day 3 (its id, not its place)`, /Day 3$/.test(r.hero.trim()) && /Open Day 3/.test(r.go), JSON.stringify(r));
    t.check(`c ${w}: the Not finished card and the cards agree on Day 3`, /Day 3 wasn't finished/.test(r.uf), JSON.stringify(r));
    await p.evaluate("openDayView('3')"); await p.waitForTimeout(500);
    const v = await p.evaluate(() => (document.querySelector('#day-view-card .day-card-num') || {}).textContent || '');
    t.check(`c ${w}: the open day's own card says Day 3`, /Day 3/.test(v), v);
    await p.evaluate("closeDayView()"); await p.waitForTimeout(300);
    t.check(`c ${w}: the row for Day 1 says Day 1`, r.rows.some(x => /^Day 1,.*\|1$/.test(x)), JSON.stringify(r.rows));
    t.check(`c ${w}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

(async () => {
  const browser = await H.launch();
  await a(browser);
  await b(browser);
  await c(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
