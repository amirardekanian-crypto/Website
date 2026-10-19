// A card opens and closes on its own height, and the row stays put (Amir, 2026-10-19): node scripts/headless/fold.js
//
// "i dont like the animation or how the exercise cards openes ... i feel like everything moves." The head used to change
// in one frame: green, the number to an eyebrow, the name to 28 px capitals, the numbers to a scoreboard, every row below
// dropping. Now the head is the closed row turned green, and the card's own height carries the body in and out
// (foldCard()). This suite holds that: the height really glides, the head does not move or re-typeset, the body is still
// laid out while the card folds shut (a circuit's too, whose body is display: contents), and nothing is left behind.
// A phone asking for less motion still gets the instant change.
// Serve the repo first (python -m http.server 8765 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const PAIR = 'Press and Pull';
// the fixture plus one working circuit, so the fold is checked on both kinds of card
function programme() {
  const PROG = H.fixture();
  PROG.workouts.days[0].blocks[1].exercises.push({ type: 'circuit', name: PAIR, rx: { rounds: 3, rpe: 8, rest: 90 },
    items: [{ name: 'Dumbbell Bench Press', rx: { reps: 8 } }, { name: 'Single-Arm Row', rx: { reps: 10 } }] });
  return PROG;
}
const card = nm => `[...document.querySelectorAll('#day-view .checklist-item')].find(x => x.querySelector('.item-name').textContent.trim() === ${JSON.stringify(nm)})`;

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  for (const nm of ['Barbell Back Squat', PAIR]) {
    const kind = nm === PAIR ? 'circuit' : 'lift';
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: programme() });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);
    const read = () => p.evaluate(`(() => { const c = ${card(nm)}, m = c.querySelector('.item-main'), n = c.querySelector('.item-name');
      const box = c.querySelector('.ex-set-row .ex-set-weight, .round-row');
      return { h: Math.round(c.getBoundingClientRect().height), mainH: Math.round(m.getBoundingClientRect().height),
        nameSize: getComputedStyle(n).fontSize, nameLeft: Math.round(n.getBoundingClientRect().left),
        numLeft: Math.round(c.querySelector('.ex-num').getBoundingClientRect().left),
        turn: getComputedStyle(c.querySelector('.item-name .nm-tail'), '::after').transform,
        green: Math.round(parseFloat(getComputedStyle(m, '::before').opacity) * 100),
        cls: c.className, style: c.getAttribute('style') || '', body: box ? Math.round(box.getBoundingClientRect().width) : 0 }; })()`);

    const shut = await read();
    await p.evaluate(`(() => { toggleExpand(${card(nm)}); })()`);
    await p.waitForTimeout(90);
    const mid = await read();
    await p.waitForTimeout(500);
    const open = await read();

    C.check(`${kind}: the card opens on its height — a frame in between, not a jump`,
      mid.h > shut.h + 20 && mid.h < open.h - 20 && /folding/.test(mid.cls) && /height/.test(mid.style), JSON.stringify({ shut: shut.h, mid: mid.h, open: open.h }));
    C.check(`${kind}: the head stays put — same height, same name size, same place, the numeral where it was`,
      open.mainH === shut.mainH && open.nameSize === shut.nameSize && open.nameLeft === shut.nameLeft && open.numLeft === shut.numLeft,
      JSON.stringify({ shut: [shut.mainH, shut.nameSize, shut.nameLeft, shut.numLeft], open: [open.mainH, open.nameSize, open.nameLeft, open.numLeft] }));
    C.check(`${kind}: the green fades in behind the row and the chevron turns over`,
      shut.green === 0 && mid.green > 0 && mid.green < 100 && open.green === 100 && /matrix\(-1/.test(open.turn) && open.turn !== shut.turn,
      JSON.stringify({ green: [shut.green, mid.green, open.green], turn: open.turn }));
    C.check(`${kind}: once open, nothing is left behind (no pinned height, no folding class)`,
      !open.style && !/folding|closing/.test(open.cls) && !open.cls.includes('collapsed'), JSON.stringify([open.cls, open.style]));

    await p.evaluate(`(() => { toggleExpand(${card(nm)}); })()`);
    await p.waitForTimeout(90);
    const shutting = await read();
    await p.waitForTimeout(500);
    const back = await read();
    C.check(`${kind}: it closes the same way, and the head is its closed self at once`,
      shutting.h < open.h - 20 && shutting.h > back.h + 20 && /collapsed/.test(shutting.cls) && /closing/.test(shutting.cls),
      JSON.stringify({ open: open.h, shutting: shutting.h, back: back.h, cls: shutting.cls }));
    C.check(`${kind}: the body is still drawn while the box shrinks (nothing vanishes under it)`,
      shutting.body > 20 && shutting.body === open.body, JSON.stringify({ open: open.body, shutting: shutting.body }));
    C.check(`${kind}: closed again, clean`, !back.style && !/folding|closing/.test(back.cls) && back.h === shut.h && back.green === 0, JSON.stringify([back.cls, back.style, back.h, shut.h]));
    C.check(`${kind}: no page errors`, !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // a phone that asks for less motion gets the old instant change
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: programme(), reduced: true });
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(300);
  const was = await p.evaluate(`(() => Math.round(${card('Barbell Back Squat')}.getBoundingClientRect().height))()`);
  const now = await p.evaluate(`(() => { const c = ${card('Barbell Back Squat')}; toggleExpand(c);
    return { h: Math.round(c.getBoundingClientRect().height), cls: c.className, style: c.getAttribute('style') || '' }; })()`);
  C.check('less motion: the card opens at once, with no fold and nothing pinned',
    now.h > was + 100 && !/folding|closing/.test(now.cls) && !now.style, JSON.stringify({ was, now }));
  C.check('less motion: no page errors', !p.errs.length, JSON.stringify(p.errs));
  await ctx.close();
  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
