// Love All round 2, the card (2026-10-24), checked the way the athlete meets it.
//   B30  the finish card's "N of M sets" counts sets only: warm-up rows (.is-prep) are not in it. getDayCompletion's done/total
//        are untouched. Every set done and a warm-up row unticked reads "M of M sets, warm-up left", in progress.
//   L3   on every open card the tempo help button (.nl-help) keeps a 44 px tap target, never sits over the exercise name,
//        and still opens the tempo help on a tap. Measured at 320, 360 and 390 px wide.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-card.js
'use strict';
const H = require('./lib');

const t = H.checker();

async function openDay(browser, w, h) {
  const { ctx, p } = await H.openProgram(browser, { w, h });
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(300);
  return { ctx, p };
}

// ═════════ B30: sets only in the words ═════════
async function b30(browser) {
  const { ctx, p } = await openDay(browser, 390, 844);
  const read = () => p.evaluate(() => {
    refreshConfirmCard("1");
    const card = document.getElementById('confirm-1');
    const s = getDayCompletion('1');
    const preps = [...document.querySelectorAll('#day1 .checklist-item.is-prep')];
    return { text: card.querySelector('.confirm-count').textContent, ready: card.classList.contains('ready'),
      done: s.done, total: s.total, cd: card.dataset.done, ct: card.dataset.total, preps: preps.length };
  });
  const tick = skipPrep => p.evaluate(skipPrep => {
    document.querySelectorAll('#day1 .checklist-item').forEach(c => {
      if (skipPrep && c.classList.contains('is-prep')) return;
      if (c.classList.contains('collapsed')) toggleExpand(c);
      if (!c.classList.contains('checked')) toggleCheckOnly(c, '1');
      if (c.classList.contains('round-group')) c.querySelectorAll('.rpe-row').forEach(r => r.querySelector('.rpe-btn[data-rpe="7"]').click());
    });
    hideAaToast();
  }, skipPrep);
  const sets = m => { const r = /^(\d+) of (\d+) sets/.exec(m.text); return r ? [+r[1], +r[2]] : null; };

  const m0 = await read();
  t.check('B30: the day has warm-up rows', m0.preps > 0, JSON.stringify(m0));
  t.check('B30: nothing ticked: the words leave the warm-up rows out of the total (total < getDayCompletion total)', sets(m0) && sets(m0)[1] < m0.total && sets(m0)[0] === 0, JSON.stringify(m0));
  const setTotal = sets(m0)[1], unitTotal = m0.total;

  await tick(true);
  await p.waitForTimeout(500);
  const m1 = await read();
  t.check('B30: every set done, warm-up unticked: the words read "M of M sets, warm-up left" and the card is not ready',
    sets(m1) && sets(m1)[0] === setTotal && sets(m1)[1] === setTotal && /, warm-up left$/.test(m1.text) && !m1.ready, JSON.stringify(m1));
  t.check('B30: getDayCompletion still counts the warm-up rows (done < total, same total as before)', m1.done < m1.total && m1.total === unitTotal, JSON.stringify(m1));
  t.check('B30: the card keeps the unit numbers in its dataset (they drive the bar)', +m1.cd === m1.done && +m1.ct === m1.total, JSON.stringify(m1));

  await tick(false);
  await p.waitForTimeout(500);
  const m2 = await read();
  t.check('B30: everything ticked: "M of M sets", ready, no warm-up line', m2.text === `${setTotal} of ${setTotal} sets` && m2.ready && m2.done === m2.total, JSON.stringify(m2));
  t.check('B30: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ L3: the tempo help never sits over the name ═════════
async function l3(browser) {
  for (const w of [320, 360, 390]) {
    const { ctx, p } = await openDay(browser, w, 844);
    await p.evaluate(() => document.querySelectorAll('#day1 .checklist-item').forEach(c => { if (c.classList.contains('collapsed')) toggleExpand(c); }));
    await p.waitForTimeout(700);
    const m = await p.evaluate(() => {
      const box = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
      const out = [];
      document.querySelectorAll('#day1 .checklist-item:not(.collapsed)').forEach(c => {
        const h = c.querySelector('.nl-help'), n = c.querySelector('.item-name');
        if (!h || !n) return;
        const hb = box(h), nb = box(n);
        // the 44 px tap target is the button plus its ::after reach
        const af = getComputedStyle(h, '::after');
        const reach = af.content !== 'none' && af.position === 'absolute' ? { l: parseFloat(af.left) || 0, r: parseFloat(af.right) || 0, t: parseFloat(af.top) || 0, b: parseFloat(af.bottom) || 0 } : { l: 0, r: 0, t: 0, b: 0 };
        const tb = { l: hb.l + Math.min(0, reach.l), r: hb.r - Math.min(0, reach.r), t: hb.t + Math.min(0, reach.t), b: hb.b - Math.min(0, reach.b) };
        out.push({ name: n.textContent.trim(), help: hb, name_box: nb, overlap: hit(hb, nb), tapOverlap: hit(tb, nb), tapH: tb.b - tb.t, tapW: tb.r - tb.l });
      });
      return out;
    });
    t.check(`L3 ${w}px: the open cards have a tempo help button`, m.length > 0, String(m.length));
    t.check(`L3 ${w}px: no .nl-help box touches its .item-name box`, m.every(x => !x.overlap), JSON.stringify(m.filter(x => x.overlap)));
    t.check(`L3 ${w}px: no tap target touches its .item-name box`, m.every(x => !x.tapOverlap), JSON.stringify(m.filter(x => x.tapOverlap)));
    t.check(`L3 ${w}px: each help button keeps a 44 px tap height`, m.every(x => x.help.h >= 44 || x.tapH >= 44), JSON.stringify(m.map(x => [x.help.h, x.tapH])));
    // a real tap opens the tempo help
    const open0 = await p.evaluate(() => { const b = document.querySelector('#day1 .checklist-item:not(.collapsed) .nl-help'); b.scrollIntoView({ block: 'center' }); return !!b; });
    await p.waitForTimeout(300);
    const pt = await p.evaluate(() => { const r = document.querySelector('#day1 .checklist-item:not(.collapsed) .nl-help').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.click(pt.x, pt.y);
    await p.waitForTimeout(600);
    const sheet = await p.evaluate(() => { const o = document.querySelectorAll('#hist-overlay.visible .help-list .note-card'); return { n: o.length, cards: [...document.querySelectorAll('#day1 .checklist-item.collapsed')].length }; });
    t.check(`L3 ${w}px: a tap on the button opens the tempo help and closes no card`, open0 && sheet.n > 0 && sheet.cards === 0, JSON.stringify(sheet));
    t.check(`L3 ${w}px: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

(async () => {
  const browser = await H.launch();
  await b30(browser);
  await l3(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
