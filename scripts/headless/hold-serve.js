// Hold Serve on Home (Career Mode phase 1, 2026-10-17; career/CAREER_MODE.md → Build order row 1): node scripts/headless/hold-serve.js
//
// The row reads the athlete's week_held and week_broken facts (sb.from('career_facts'), here the stub's `tables`) and the rulebook
// (career_rules), counts the weeks in a row with holdCount() (get_profile()'s loop; the twin is checked by scripts/check_twins.js and
// scripts/career/rehearse.mjs) and says the next step from This Week's own count. Checked on made-up facts against the fixture's dated
// cycles (the current one started 10 days ago: week 2 of 5): every state of the words, the "not sure yet" rule (a week ended with no fact),
// nothing offline, with no rulebook, after a refusal, in the demo, in the coach's preview or for an undated cycle; the copy kept or
// dropped; never synced; the tap opening the guide's card; a re-read after a session reaches the server; 320 px and dark mode.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.toISOString().slice(0, 10);
const at = n => ymd(new Date(Date.now() + n * DAY));                    // n days from today (UTC; every page here runs in UTC)
const RULES = [{ version: 1 }];
// A week fact as the athlete's read returns it.
const W = (kind, c, w, n) => ({ kind: kind === 'H' ? 'week_held' : 'week_broken', ref: `c${c}|w${w}`, day: at(n), value: { cycle: c, week: w } });
// The fixture's cycles with dates: the current one (Cycle 2) starts `start` days from today, five weeks each, back to back.
function prog({ start = -10, dated = true, days } = {}) {
  const P = H.fixture({ dated: false });
  if (dated) P.cycles.forEach((c, i) => { const s = start + (i - P.currentCycleIndex) * 35; c.startDate = at(s); c.endDate = at(s + 34); });
  if (days) P.workouts.days = P.workouts.days.slice(0, days);
  return P;
}
const THIS_WEEK_DAY1 = [{ completed_on: at(-2), day: '1', readiness: 4, log: [] }];   // week 2 runs from 3 days ago: Day 1 done in it
const BOTH_THIS_WEEK = [{ completed_on: at(-1), day: '2', readiness: 4, log: [] }, ...THIS_WEEK_DAY1];

async function open(browser, o = {}) {
  const tables = o.tables === undefined ? { career_rules: RULES, career_facts: o.facts || [] } : o.tables;
  return H.openProgram(browser, Object.assign({ w: 390, h: 844, tz: 'UTC', prog: o.prog || prog(), hist: o.hist || THIS_WEEK_DAY1,
    stub: Object.assign({ tables }, o.tableErr ? { tableErr: o.tableErr } : {}, o.stub || {}), seed: o.seed || {} }, o.opts || {}));
}
// What the row says, read off the page.
const row = p => p.evaluate(() => {
  const r = document.querySelector('#home-hold-wrap .hrow');
  if (!r) return null;
  const sp = r.querySelector('.hrow-sp svg');
  return { label: r.querySelector('.hrow-l').textContent.trim(), big: r.querySelector('.hrow-vv').textContent.trim(),
           small: r.querySelector('.hrow-v small').textContent.replace(/ /g, ' ').trim(), ok: r.querySelector('.hrow-v').classList.contains('is-ok'),
           dots: sp ? sp.querySelectorAll('circle[fill="currentColor"]').length : 0, ring: !!(sp && sp.querySelector('circle[stroke-dasharray]')) };
});
const calls = (p, t) => p.evaluate(t => (window.__STUB.calls || []).filter(c => c === 'from:' + t).length, t);
const cache = p => p.evaluate(() => localStorage.getItem('rel01_athlete_holdcache'));

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const RUN4 = [W('H', 1, 3, -27), W('H', 1, 4, -20), W('H', 1, 5, -13), W('H', 2, 1, -6)];

  // ── 1. four weeks in a row, this week open, Day 1 of 2 done ──
  {
    const { ctx, p } = await open(browser, { facts: RUN4 });
    const r = await row(p);
    C.check('in a row: the row is on Home, labelled Hold Serve', r && r.label === 'Hold Serve', JSON.stringify(r));
    C.check('in a row: "4 weeks in a row"', r && r.big === '4 weeks in a row', r && r.big);
    C.check('in a row: the next step from This Week\'s count, "1 more this week to make it 5"', r && r.small === '1 more this week to make it 5', r && r.small);
    C.check('in a row: four dots and this week\'s dashed ring, not green', r && r.dots === 4 && r.ring && !r.ok, JSON.stringify(r));
    const order = await p.evaluate(() => {
      const ids = [...document.querySelectorAll('#home-overview > div')].map(d => d.id).filter(Boolean);
      const hold = document.getElementById('home-hold-wrap'), hab = document.getElementById('home-habits-wrap');
      return { ids, gapTop: getComputedStyle(hold).marginTop, habTop: getComputedStyle(hab).marginTop, dc: document.querySelectorAll('#home-overview [data-dc]').length };
    });
    C.check('it sits after the week\'s days and before Daily habits', order.ids.indexOf('home-hold-wrap') > order.ids.indexOf('day-cards-wrap')
      && order.ids.indexOf('home-hold-wrap') === order.ids.indexOf('home-habits-wrap') - 1, order.ids.join(' > '));
    C.check('the pair of rows: 20 px above Hold Serve, the habits row right under it', order.gapTop === '20px' && order.habTop === '0px', order.gapTop + ' / ' + order.habTop);
    C.check('Home still has one Next up card (one data-dc)', order.dc === 1, order.dc);
    C.check('one read of each table, as the athlete', await calls(p, 'career_facts') === 1 && await calls(p, 'career_rules') === 1);
    const saved = JSON.parse(await cache(p) || 'null');
    C.check('the answer is kept on the phone (<id>_holdcache)', saved && Array.isArray(saved.facts) && saved.facts.length === 4, await cache(p));
    const synced = await p.evaluate(() => Object.keys(_snapshot()).filter(k => /holdcache/.test(k)));
    C.check('and never synced with the progress', synced.length === 0, synced.join(','));
    // the tap opens the guide at its own card
    await p.click('#home-hold-wrap .hrow');
    await p.waitForTimeout(250);
    const help = await p.evaluate(() => {
      const c = document.querySelector('#hist-overlay.visible .help-list .note-card.open');
      return c ? c.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : null;
    });
    C.check('a tap opens How the app works at the Hold Serve card', !!help && /Hold Serve: weeks held in a row/.test(help), help);
    const guide = await p.evaluate(() => APP_GUIDE[0].body);
    C.check('the guide\'s Getting around names the row on Home', /<strong>Hold Serve<\/strong>/.test(guide));
    C.check('no page errors', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 2. this week held ──
  {
    const { ctx, p } = await open(browser, { facts: RUN4.concat([W('H', 2, 2, -1)]), hist: BOTH_THIS_WEEK });
    const r = await row(p);
    C.check('held: "5 weeks in a row", in green', r && r.big === '5 weeks in a row' && r.ok, JSON.stringify(r));
    C.check('held: "This week is held", five dots and no ring', r && r.small === 'This week is held' && r.dots === 5 && !r.ring, JSON.stringify(r));
    await ctx.close();
  }

  // ── 3. one week, and all done here before the server has it ──
  {
    const { ctx, p } = await open(browser, { facts: [W('H', 2, 1, -6)] });
    const r = await row(p);
    C.check('one week: "1 week held", "1 more this week to make it 2"', r && r.big === '1 week held' && r.small === '1 more this week to make it 2', JSON.stringify(r));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { facts: [W('H', 2, 1, -6)], hist: BOTH_THIS_WEEK });
    const r = await row(p);
    C.check('every day done here, not judged on the server yet: the server\'s count, "All 2 done this week"', r && r.big === '1 week held' && r.small === 'All 2 done this week', JSON.stringify(r));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { facts: RUN4, hist: [] });
    const r = await row(p);
    C.check('nothing done this week yet: "Do all 2 this week to make it 5"', r && r.small === 'Do all 2 this week to make it 5', JSON.stringify(r));
    await ctx.close();
  }

  // ── 4. zero: after a broken week, and before any week at all ──
  {
    const { ctx, p } = await open(browser, { facts: [W('H', 1, 5, -13), W('B', 2, 1, -4)] });
    const r = await row(p);
    C.check('after a broken week: "Hold this week", "1 more session this week to hold it", no dots',
      r && r.big === 'Hold this week' && r.small === '1 more session this week to hold it' && r.dots === 0 && !r.ring, JSON.stringify(r));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { facts: [], hist: [] });
    const r = await row(p);
    C.check('no week judged yet (a new athlete): "Hold this week", "Do all 2 sessions this week to hold it"',
      r && r.big === 'Hold this week' && r.small === 'Do all 2 sessions this week to hold it', JSON.stringify(r));
    await ctx.close();
  }

  // ── 5. not sure yet: the week after the newest held one has ended with no fact ──
  {
    const { ctx, p } = await open(browser, { facts: [W('H', 1, 4, -20), W('H', 1, 5, -13)] });
    C.check('a week ended with nothing saved since (Cycle 2 week 1, no fact): no row', await row(p) === null);
    C.check('…and the answer is still kept for the next open', !!(await cache(p)));
    await ctx.close();
  }

  // ── 6. between cycles, and before the next one starts: the count waits ──
  {
    const P = prog({ start: -36 });                              // Cycle 2 ended 2 days ago
    const { ctx, p } = await open(browser, { prog: P, facts: [W('H', 2, 4, -9), W('H', 2, 5, -3)], hist: [] });
    const r = await row(p);
    C.check('between cycles: "2 weeks in a row", "It carries into Cycle 3"', r && r.big === '2 weeks in a row' && r.small === 'It carries into Cycle 3', JSON.stringify(r));
    C.check('between cycles: two dots, no ring', r && r.dots === 2 && !r.ring, JSON.stringify(r));
    await ctx.close();
  }
  {
    const P = prog({ start: 2 });                                // Cycle 2 published, starting in 2 days; Cycle 1 ended 6 days ago
    P.cycles[0].startDate = at(-40); P.cycles[0].endDate = at(-6);
    const { ctx, p } = await open(browser, { prog: P, facts: [W('H', 1, 4, -15), W('H', 1, 5, -8)], hist: [] });
    const r = await row(p);
    C.check('before the cycle starts: "2 weeks in a row", "It carries into Cycle 2"', r && r.big === '2 weeks in a row' && r.small === 'It carries into Cycle 2', JSON.stringify(r));
    await ctx.close();
  }
  {
    const P = prog({ start: -36 });
    const { ctx, p } = await open(browser, { prog: P, facts: [W('H', 2, 4, -9), W('B', 2, 5, -2)], hist: [] });
    C.check('between cycles at zero: no row (there is no week to hold)', await row(p) === null);
    await ctx.close();
  }

  // ── 7. nothing: offline, no rulebook, a refusal, the demo, the coach's preview, an undated cycle ──
  const COPY = { _holdcache: { t: new Date().toISOString(), facts: RUN4 } };
  {
    const { ctx, p } = await open(browser, { facts: RUN4, tableErr: { career_facts: 503 }, seed: COPY });
    C.check('no answer (offline): no row', await row(p) === null);
    C.check('…and the phone keeps its copy for the next open', !!(await cache(p)));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { tables: { career_rules: [], career_facts: RUN4 }, seed: COPY });
    C.check('no rulebook on the server (Career Mode off): no row', await row(p) === null);
    C.check('…and the copy is gone', (await cache(p)) === null);
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { facts: RUN4, tableErr: { career_rules: 404 }, seed: COPY });
    C.check('a refused read: no row, and the copy is gone', await row(p) === null && (await cache(p)) === null);
    await ctx.close();
  }
  {
    const P = prog();
    const { ctx, p } = await open(browser, { prog: P, facts: RUN4, opts: { query: '?client=demo' }, stub: { demo: P } });
    C.check('the demo: no row and no Career Mode read', await row(p) === null && await calls(p, 'career_facts') === 0);
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { facts: RUN4, opts: { query: '?client=rel01_athlete&preview=1' } });
    const isPrev = await p.evaluate(() => !!window.IS_PREVIEW);
    C.check('the coach\'s preview: no row and no Career Mode read', isPrev && await row(p) === null && await calls(p, 'career_facts') === 0, 'IS_PREVIEW ' + isPrev);
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { prog: prog({ dated: false }), facts: RUN4 });
    C.check('a cycle with no dates (no training week on the server): no row', await row(p) === null);
    await ctx.close();
  }

  // ── 8. a session that reaches the server reads the weeks again (its trigger has judged the week by then) ──
  {
    const queued = [{ p_athlete_id: 'rel01_athlete', p_athlete_name: 'Alex Rivera', p_day: 2, p_completed_on: at(-1), p_session: { status: 'Complete', log: [] }, _q: '1.zz' }];
    const { ctx, p } = await open(browser, { facts: RUN4, seed: { _csq: queued } });
    await p.waitForTimeout(900);
    const n = await calls(p, 'career_facts'), sent = await p.evaluate(() => (window.__STUB.calls || []).filter(c => c === 'rpc:save_session').length);
    C.check('a waiting session sent at open: the weeks are read again after it', sent >= 1 && n >= 2, `save_session ${sent}, career_facts reads ${n}`);
    await ctx.close();
  }

  // ── 9. the narrowest phone, and dark mode ──
  for (const o of [{ w: 320, h: 640 }, { w: 390, h: 844, dark: true }]) {
    const { ctx, p } = await open(browser, { facts: RUN4, opts: o });
    const fit = await p.evaluate(() => {
      const r = document.querySelector('#home-hold-wrap .hrow'), b = r && r.getBoundingClientRect();
      const kids = r ? [...r.querySelectorAll('.hrow-l, .hrow-vv, .hrow-v small')] : [];
      return { right: b ? Math.round(b.right) : null, vw: document.documentElement.clientWidth, sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
               clipped: kids.filter(k => k.scrollWidth > k.clientWidth + 1).map(k => k.textContent), lines: r ? Math.round(r.querySelector('.hrow-v small').getBoundingClientRect().height) : 0,
               ink: r ? getComputedStyle(r.querySelector('.hrow-vv')).color : '', bg: r ? getComputedStyle(r).backgroundColor : '' };
    });
    const tag = o.dark ? 'dark' : o.w + ' px';
    C.check(`${tag}: the row fits, no sideways scroll, nothing clipped`, fit.right != null && fit.right <= fit.vw && !fit.sideways && !fit.clipped.length, JSON.stringify(fit));
    if (o.dark) C.check('dark: light text on a dark row', /rgb\(2[0-9]{2}/.test(fit.ink) && !/255, 255, 255\)$/.test(fit.bg), fit.ink + ' on ' + fit.bg);
    C.check(`${tag}: no page errors`, !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
