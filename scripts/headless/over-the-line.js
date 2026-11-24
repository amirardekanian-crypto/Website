// #151 Over the Line (round 15, 2026-11-24, stage130): node scripts/headless/over-the-line.js
//
// The Bell sends a part { k: 'line', total, over, by } on the day a week went over 300 Move minutes (get_bell(), the week switch). The crew's
// moment card draws it: The Line's ring (the Full Week emblem), "Over the line +24" with the change in clay, and what took the week there (a Court
// Log row "Padel, 75 min", or "a session"). An achievement the same day still leads and the line becomes words. Also: the emblems of the week and
// the court (rings and roundels) draw, won and not won, and the cabinet has a Moving section.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const line = (parts, me) => ({ t: 'line', key: 'ck1:2026-11-24', who: 'Sara Rahimi', me: !!me, at: new Date().toISOString(), parts, kudos: { n: 0, by: {}, like: 0, mine: false } });

(async () => {
  const t = H.checker();
  const browser = await H.launch();
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', seed: { _hab_cfg: CFG, _hab_log: {} } });
  await p.waitForFunction(() => !!window.AAEmblem, null, { timeout: 8000 }).catch(() => {});

  const card = it => p.evaluate(x => {
    const d = document.createElement('div'); d.innerHTML = crewMomentCardHTML(x); document.body.appendChild(d);
    const q = s => { const e = d.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    const c = d.querySelector('.cr-mcbig .c');
    const out = { cls: (d.firstElementChild || {}).className || '', big: q('.cr-mcbig'), sub: q('.cr-mcsub'), ring: !!d.querySelector('.cr-mcb svg'),
      clay: c ? getComputedStyle(c).color : null };
    d.remove(); return out;
  }, it);

  const a = await card(line([{ k: 'line', total: 324, over: 24, by: { kind: 'padel', mins: 75 } }]));
  t.check('the card: Over the line +24, the Line ring as its badge', /cr-mc-line/.test(a.cls) && a.big === 'Over the line +24' && a.ring, JSON.stringify(a));
  t.check('what took the week there, in their words', a.sub === 'Sara Rahimi · Padel, 75 min · this took their week to 324', JSON.stringify(a));
  const b = await card(line([{ k: 'line', total: 310, over: 10, by: { session: true } }], true));
  t.check('your own card says your week, and a session when a session did it', b.sub && /a session · this took your week to 310$/.test(b.sub), JSON.stringify(b));
  const c = await card(line([{ k: 'achievement', id: 'full_week', name: 'Full Week' }, { k: 'line', total: 302, over: 2, by: { kind: 'tennis', mins: 60 } }]));
  t.check('an achievement the same day leads; the line is words after it', /cr-mc-achievement/.test(c.cls) && /went over the line, 302 Move minutes/.test(c.sub || ''), JSON.stringify(c));
  const d = await card(line([{ k: 'line', total: 300, over: 0 }]));
  t.check('nothing over and no row named: no +0, the week in words', d.big === 'Over the line' && /300 Move minutes this week/.test(d.sub || ''), JSON.stringify(d));

  const em = await p.evaluate(() => {
    const ids = ['full_week', 'full_weeks_26', 'full_weeks_row_8', 'court_hours_10', 'court_hours_100', 'match_day', 'cross_court', 'court_weeks_12', 'court_month',
      'first_steps', 'three_calm_days', 'oiled_up_2', 'slow_exhale'];
    const bad = ids.filter(i => { const s = AAEmblem.ach(i, { won: true }) + AAEmblem.ach(i, { won: false }); return !/<svg/.test(s) || /undefined|NaN/.test(s); });
    const metal = ids.some(i => /#(D4AF37|FFD700|C9A227|B8860B|DAA520)/i.test(AAEmblem.ach(i, { won: true })));
    return { bad, metal, move: AAEmblem.SECTIONS.some(s => s.k === 'move'), info: AAEmblem.info('court_hours_10') };
  });
  t.check('every new emblem draws, won and not won', em.bad.length === 0, JSON.stringify(em.bad));
  t.check('no metal colour in them', !em.metal);
  t.check('the cabinet has a Moving section, and the court roundel sits in it', em.move && em.info && em.info.sec === 'move', JSON.stringify(em.info));
  t.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
