// The habit half of Progress, and the list behind its one door: node scripts/headless/habits-list.js
//
// AA Proof is being retired into this app (2026-10-19). Direction B's second screen is two figures, the
// last seven days as a table and ONE door — no per-habit page (Amir: "cut the per habit door") — and the
// list behind it is where the three old add-ons and anything the athlete writes live together.
// What this holds:
//   the figures   days in a row and days this month, both gated the same way as the day streak
//   the table     a row per habit, 7 columns, and a day a habit was NOT tracked draws as not tracked
//   the door      one row, the count, into the list
//   the list      the five with no off switch; yours; the suggestions; a habit of your own
//   the rules     on today / off tomorrow, the two-tap confirm to switch one ON, the cap of three,
//                 the duplicate name, and that ✕ takes a habit's points while the switch keeps them
// Serve the repo first (python -m http.server 8765 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE).
'use strict';
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const key = n => { const d = new Date(Date.now() - n * DAY); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  // ── 1. the figures and the table ───────────────────────────────────────────────────────────────────
  {
    const LOG = {};
    [0, 1, 2, 3, 5, 6].forEach(n => { LOG[key(n)] = { strength: n % 2 ? 0 : 1, sleep: 8, water: n === 1 ? 4 : 8, fuel: 3, steps: n === 3 ? 7000 : 10000 }; });
    const { ctx, p } = await H.openProgram(browser, { seed: { _hab_cfg: CFG, _hab_log: LOG } });
    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(400);
    const b = await p.evaluate(() => ({
      title: !document.getElementById('habits-title').hidden,
      figs: [...document.querySelectorAll('#screen-plan .hab-fig')].map(f => f.textContent.replace(/\s+/g, ' ').trim()),
      rows: [...document.querySelectorAll('#screen-plan .hab-grid .hw-n')].map(n => n.textContent),
      cells: document.querySelectorAll('#screen-plan .hab-grid .hw-c').length,
      part: document.querySelectorAll('#screen-plan .hw-c.is-part').length,
      door: (document.querySelector('#habits-block-wrap .hrow-vv') || {}).textContent,
      perHabitDoors: document.querySelectorAll('#habits-block-wrap .hrow').length,
    }));
    t.check('Progress carries the habit half: the section, two figures, the table and ONE door', b.title && b.figs.length === 2 && b.rows.length === 5 && b.cells === 35 && b.perHabitDoors === 1, JSON.stringify(b));
    t.check('the figures are the day streak and the days this month, both by the same gate',
      /^4Days? in a row$/.test(b.figs[0]) && /^\d+Days this month$/.test(b.figs[1]), JSON.stringify(b.figs));
    t.check('a counter left part way draws as part of the job, not as a miss', b.part >= 1, b.part);
    t.check('the door says how many are tracked', b.door === '5 tracked', b.door);
    t.check('no page errors (Progress)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. a habit that did not exist on a day is not drawn as a miss on it ────────────────────────────
  {
    // A roster stamped BEFORE today, so a habit switched on now cannot reach back over the week.
    const cfg = Object.assign({}, CFG, { roster: [{ from: key(6), ids: ['strength', 'steps', 'sleep', 'fuel', 'water'] }] });
    const LOG = {}; [0, 1, 2, 3, 4, 5, 6].forEach(n => { LOG[key(n)] = { sleep: 8 }; });
    const { ctx, p } = await H.openProgram(browser, { seed: { _hab_cfg: cfg, _hab_log: LOG } });
    await p.evaluate(() => { habToggleOn('mobility'); habToggleOn('mobility'); goTo('plan'); });
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const names = [...document.querySelectorAll('#screen-plan .hab-grid .hw-n')].map(n => n.textContent);
      const i = names.indexOf('Mobility');
      const all = [...document.querySelectorAll('#screen-plan .hab-grid .hw-c')];
      const row = all.slice(i * 7, i * 7 + 7);
      return { has: i >= 0, pre: row.filter(c => c.classList.contains('is-pre')).length, last: row[6].className };
    });
    t.check('a habit switched on today owns today only: the six days behind it read as not tracked, never as misses',
      r.has && r.pre === 6 && !/is-pre/.test(r.last), JSON.stringify(r));
    await ctx.close();
  }

  // ── 3. the list ────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await H.openProgram(browser, { seed: { _hab_cfg: CFG } });
    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(300);
    await p.click('#habits-block-wrap .hrow');
    await p.waitForTimeout(300);
    const l = await p.evaluate(() => ({
      screen: (document.querySelector('.screen.active') || {}).id,
      secs: [...document.querySelectorAll('#screen-habits .prog-sec')].map(s => s.textContent),
      core: document.querySelectorAll('#screen-habits .hl-row.is-core').length,
      switches: document.querySelectorAll('#screen-habits .hl-row.is-core .hl-sw').length,
      adds: [...document.querySelectorAll('.hl-add')].map(a => a.textContent.trim()),
    }));
    t.check('the door opens the list: the five, with no off switch on any of them, and the ways to add one',
      l.screen === 'screen-habits' && l.core === 5 && l.switches === 0 && l.secs.indexOf('The five') === 0, JSON.stringify(l));
    t.check('the three old add-ons are suggestions now, beside what athletes actually wrote for themselves',
      l.adds.length === 6 && /Breathe/.test(l.adds.join()) && /sport/i.test(l.adds.join()), JSON.stringify(l.adds));

    // ⚠️ switching one ON is a two-tap confirm, because a toast is easy to have never read
    await p.evaluate(() => habToggleOn('supps'));
    await p.waitForTimeout(150);
    const armed = await p.evaluate(() => ({ arm: !!document.querySelector('.hl-sw.is-arm, .hl-add.is-arm'), said: (document.querySelector('.hl-add.is-arm') || {}).textContent, live: AAHabits.live().some(h => h.id === 'supps') }));
    t.check('switching one on arms first, says what the second tap signs up to, and changes nothing',
      armed.arm && !armed.live && /Counts from today/.test(armed.said || ''), JSON.stringify(armed));
    await p.evaluate(() => habToggleOn('supps'));
    await p.waitForTimeout(200);
    const on = await p.evaluate(() => ({ live: AAHabits.live().some(h => h.id === 'supps'), card: [...document.querySelectorAll('#home-today-wrap .hb-name')].length, stored: !!JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_cfg')).on.supps }));
    t.check('the second tap commits it, to the config and to today\'s card', on.live && on.stored, JSON.stringify(on));

    // a habit of their own, the cap, and the duplicate
    await p.evaluate(() => habAddOwn('Read 10 minutes'));
    await p.evaluate(() => habAddOwn('Play your sport'));
    await p.waitForTimeout(200);
    const own = await p.evaluate(() => ({ names: (HAB_CFG.custom || []).map(c => c.name), room: AAHabits.customRoom() }));
    t.check('a habit of their own is stored as they wrote it, not shouted back in capitals',
      own.names.join() === 'Read 10 minutes,Play your sport', JSON.stringify(own.names));
    await p.evaluate(() => habAddOwn('read 10 MINUTES'));
    await p.waitForTimeout(150);
    const dup = await p.evaluate(() => (HAB_CFG.custom || []).length);
    t.check('the same name in another case is the same habit, not a second one that scores twice', dup === 2, dup);
    await p.evaluate(() => { habAddOwn('No sugar'); habAddOwn('One more'); });
    await p.waitForTimeout(200);
    const cap = await p.evaluate(() => ({ n: (HAB_CFG.custom || []).length, max: AAHabits.MAX_CUSTOM }));
    t.check('three of their own is the cap, because the server pays for no more than three a day', cap.n === cap.max, JSON.stringify(cap));

    // ✕ takes the points; the switch keeps them
    await p.evaluate(() => { const id = HAB_CFG.custom[0].id; const k = AAHabits.TKEY(); habSetVal(id, 1); });
    await p.waitForTimeout(150);
    const before = await p.evaluate(() => { const id = HAB_CFG.custom[0].id; return { logged: AAHabits.valOf(AAHabits.TKEY(), id) }; });
    await p.evaluate(() => { const id = HAB_CFG.custom[0].id; habRemoveOwn(id); habRemoveOwn(id); });
    await p.waitForTimeout(250);
    const after = await p.evaluate(() => ({ n: (HAB_CFG.custom || []).length, log: JSON.stringify(JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_log') || '{}')) }));
    t.check('✕ is two taps, and it takes the habit and every day of it', before.logged === 1 && after.n === 2 && !/c_/.test(after.log), JSON.stringify([before, after]));

    // off is dated TOMORROW: today still counts
    await p.evaluate(() => habToggleOn('supps'));
    await p.waitForTimeout(200);
    const off = await p.evaluate(() => ({
      live: AAHabits.live().some(h => h.id === 'supps'),
      todayRoster: AAHabits.rosterOn(AAHabits.TKEY()).some(h => h.id === 'supps'),
      said: [...document.querySelectorAll('#screen-habits .hl-row .hl-nm small')].map(s => s.textContent).join(' | '),
    }));
    t.check('switching one off is dated tomorrow: it leaves the list of what is live, still counts today, and says so',
      !off.live && off.todayRoster && /still counts today/i.test(off.said), JSON.stringify(off));
    t.check('no page errors (the list)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 4. the narrowest phone ─────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await H.openProgram(browser, { w: 320, h: 568, seed: { _hab_cfg: CFG } });
    await p.evaluate(() => goTo('habits'));
    await p.waitForTimeout(300);
    const n = await p.evaluate(() => ({
      side: document.documentElement.scrollWidth - window.innerWidth,
      field: Math.round(document.querySelector('.hl-field').getBoundingClientRect().width),
      save: Math.round(document.querySelector('.hl-save').getBoundingClientRect().width),
      tap: Math.min(...[...document.querySelectorAll('.hl-sw, .hl-add, .hl-save')].map(e => Math.round(e.getBoundingClientRect().height))),
    }));
    t.check('at 320: nothing sideways, the name field keeps the row (it was 26 px beside the button) and every control is 32 px or more',
      n.side <= 0 && n.field > 150 && n.save < 120 && n.tap >= 32, JSON.stringify(n));
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report());
})();
