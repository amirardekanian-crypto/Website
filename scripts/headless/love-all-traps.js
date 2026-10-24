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

(async () => {
  const browser = await H.launch();
  await a(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
