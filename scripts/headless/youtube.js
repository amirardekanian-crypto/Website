// The "Open in YouTube" bar in program.html (Amir, 2026-10-05, direction C in red), against the stub.
// Some athletes in Iran cannot play the embed inside the app while the YouTube app or the browser works on the
// same phone, so every in-app player has a bar under it that hands the clip to the phone. This checks:
//   · the bar under a card's player: a plain https watch address built from the stored link (watch, youtu.be,
//     shorts), opened in a new tab, 44 px tall, as wide as the player, outside the box the iframe fills;
//   · it is still reachable once the embed has loaded, and a tap on it never plays, folds or ticks anything;
//   · a Short gets a tall player with a bar of the same width, a non-YouTube link gets no bar at all;
//   · the About sheet's player has one, and so has the pop-up a circuit item's ▶ opens (wide and Short, fitting
//     a 320 x 568 screen with the bar under the player), while the circuit rows themselves are unchanged;
//   · nothing runs sideways at 320 / 360 / 390 px, light and dark.
// Serve the repo (python3 -m http.server 8765 --bind 127.0.0.1), then: node scripts/headless/youtube.js [--out <dir>]
'use strict';
const path = require('path');
const H = require('./lib');

const WATCH = id => 'https://www.youtube.com/watch?v=' + id;
const SHORTS = id => 'https://www.youtube.com/shorts/' + id;

// The fixture programme plus two circuits: a warm-up list with long names (the tightest rows) and a superset
// that logs weight. Item videos are set on the items themselves (videoUrl).
function programme() {
  const prog = H.fixture();
  const day = prog.workouts.days[0];
  day.blocks[0].exercises.push({ type: 'circuit', name: 'Hip Primer', rx: { rounds: 1 }, items: [
    { name: '90/90 Hip Switch', rx: { reps: 8, side: true }, videoUrl: WATCH('aaaaaaaaaaa') },
    { name: "World's Greatest Stretch", rx: { reps: 5, side: true }, videoUrl: 'https://youtu.be/bbbbbbbbbbb' },
    { name: 'Banded Lateral Walk', rx: { reps: 10, side: true }, videoUrl: SHORTS('ccccccccccc') },
    { name: 'Cat-Cow', rx: { reps: 10 } },                                     // no video: no ▶
  ] });
  day.blocks[1].exercises.push({ type: 'circuit', name: 'Press and Pull', rx: { rounds: 3, rest: 60 }, items: [
    { name: 'Dumbbell Bench Press', rx: { reps: 8 }, videoUrl: WATCH('ddddddddddd') },
    { name: 'Single-Arm Dumbbell Row', rx: { reps: 10, side: true }, videoUrl: WATCH('eeeeeeeeeee') },
  ] });
  return prog;
}
function spine() {
  const s = JSON.parse(JSON.stringify(H.SPINE));
  s.find(e => e.id === 'box-jump').video = 'https://vimeo.com/76979871';        // not YouTube: no bar
  s.find(e => e.id === 'side-plank').video = SHORTS('Zz9aBcDeFgH');              // a Short: tall player
  return s;
}

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const shot = (p, name) => p.screenshot({ path: path.join(shots, name + '.png') });
  const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  // Open a card with its How to do it unfolded, at the top of the screen.
  const openCard = (p, name) => p.evaluate(`(() => { const c = ${H.card(name)}; if (!c) return false;
    if (c.classList.contains('collapsed')) toggleExpand(c);
    const how = c.querySelector('.ex-how'); if (how) how.open = true;
    c.scrollIntoView({ block: 'start' }); return true; })()`);
  // What the player under a card looks like, measured.
  const probe = (p, name) => p.evaluate(`(() => {
    const c = ${H.card(name)}; const u = c && c.querySelector('.ex-vunit'); if (!u) return { unit: false };
    const v = u.querySelector('.ex-video'), a = u.querySelector('a.ex-yt'), r = e => e && e.getBoundingClientRect();
    if (a) a.scrollIntoView({ block: 'center' });
    const ar = r(a), vr = r(v), ur = r(u);
    const hit = a ? document.elementFromPoint(ar.left + ar.width / 2, ar.top + ar.height / 2) : null;
    return { unit: true, short: u.classList.contains('short'), bar: !!a, href: a && a.getAttribute('href'), target: a && a.target,
      rel: a && a.rel, text: a && a.textContent.trim(), inside: !!(a && a.closest('.ex-video')), h: a && Math.round(ar.height),
      barW: a && Math.round(ar.width), vidW: Math.round(vr.width), unitW: Math.round(ur.width), hit: !!(hit && hit.closest('a.ex-yt')),
      play: !!u.querySelector('.ex-video-play'), url: v.dataset.url, mark: !!(a && a.querySelector('svg rect[fill="#FF0000"]')) };
  })()`);
  // Open a circuit card (so its rows show), return its rows' facts.
  const circuit = (p, cname) => p.evaluate(`(() => {
    const c = [...document.querySelectorAll('#day-view .checklist-item')].find(x => x.textContent.includes(${JSON.stringify(cname)}));
    if (!c) return null;
    if (c.classList.contains('collapsed')) toggleExpand(c);
    c.scrollIntoView({ block: 'start' });
    return { over: c.scrollWidth - c.clientWidth, marks: c.querySelectorAll('.round-yt-btn, .round-row a').length,
      plays: c.querySelectorAll('.round-play-btn').length,
      names: [...c.querySelectorAll('.round-name')].map(n => Math.round(n.getBoundingClientRect().width)) };
  })()`);
  // The pop-up, measured.
  const modal = p => p.evaluate(() => {
    const m = document.querySelector('.video-modal.is-open'); if (!m) return { open: false };
    const inner = m.querySelector('.video-modal-inner'), frame = m.querySelector('.video-modal-frame'),
      bar = m.querySelector('.video-modal-yt'), ifr = frame.querySelector('iframe'), r = e => e.getBoundingClientRect();
    const ir = r(inner), fr = r(frame), br = r(bar), xr = r(ifr);
    const hit = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
    return { open: true, href: bar.getAttribute('href'), rel: bar.rel, target: bar.target, text: bar.textContent.trim(),
      mark: !!bar.querySelector('svg rect[fill="#FF0000"]'), src: ifr && ifr.getAttribute('src'),
      ratio: +(fr.width / fr.height).toFixed(2), frameW: Math.round(fr.width), frameH: Math.round(fr.height),
      iframeFills: Math.abs(xr.width - fr.width) <= 1 && Math.abs(xr.height - fr.height) <= 1,
      barBelow: br.top >= fr.bottom - 1, barH: Math.round(br.height), barW: Math.round(br.width), innerW: Math.round(ir.width),
      fits: ir.top >= 0 && ir.bottom <= window.innerHeight && ir.left >= 0 && ir.right <= window.innerWidth,
      innerTop: Math.round(ir.top), innerBottom: Math.round(ir.bottom), vh: window.innerHeight,
      hit: !!(hit && hit.closest('.video-modal-yt')), closeVisible: r(m.querySelector('.video-modal-close')).top >= ir.top - 1 };
  });

  for (const [w, dark] of [[390, false], [390, true], [360, false], [320, false]]) {
    const tag = `${w}${dark ? ' dark' : ''}`, file = `yt-${w}${dark ? '-dark' : ''}`;
    const { ctx, p } = await H.openProgram(browser, { w, dark, prog: programme(), spine: spine() });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);

    // 1. a standard card: watch link, and a youtu.be link stored on another entry
    await openCard(p, 'Barbell Back Squat');
    await p.waitForTimeout(200);
    const sq = await probe(p, 'Barbell Back Squat');
    t.check(`${tag}: the squat's player has a bar outside the box the iframe fills`, sq.unit && sq.bar && !sq.inside, JSON.stringify(sq));
    t.check(`${tag}: it links to the plain watch address, in a new tab, no referrer`,
      sq.href === WATCH('ultWZbUMPL8') && sq.target === '_blank' && /noopener/.test(sq.rel) && /noreferrer/.test(sq.rel), `${sq.href} ${sq.target} ${sq.rel}`);
    t.check(`${tag}: it says Open in YouTube, wears YouTube's red, is 44 px tall and as wide as the player`,
      sq.text === 'Open in YouTube' && sq.mark && sq.h >= 44 && Math.abs(sq.barW - sq.vidW) <= 1, `${sq.text} mark=${sq.mark} h=${sq.h} bar=${sq.barW} player=${sq.vidW}`);
    t.check(`${tag}: the ▶ is still there and the bar is the thing under the finger (not covered)`, sq.play && sq.hit, JSON.stringify({ play: sq.play, hit: sq.hit }));
    await openCard(p, 'Barbell Back Squat');
    await shot(p, file + '-card');

    await openCard(p, 'Dumbbell Bulgarian Split Squat');
    const bs = await probe(p, 'Dumbbell Bulgarian Split Squat');
    t.check(`${tag}: a youtu.be link opens as a watch address`, bs.href === WATCH('2C-uNgKwPLE'), bs.href);

    // 2. a Short: a tall player, a bar of the same width; a Vimeo link: no bar
    await openCard(p, 'Side Plank');
    const sp = await probe(p, 'Side Plank');
    t.check(`${tag}: a Short keeps its /shorts/ address, a tall player and a bar as wide as it`,
      sp.short && sp.href === SHORTS('Zz9aBcDeFgH') && sp.unitW <= 300 && Math.abs(sp.barW - sp.vidW) <= 1 && sp.vidW === sp.unitW, JSON.stringify(sp));
    await openCard(p, 'Side Plank');
    await shot(p, file + '-short');
    await openCard(p, 'Box Jump');
    const bj = await probe(p, 'Box Jump');
    t.check(`${tag}: a non-YouTube link gets no bar (its ▶ opens it as a link)`, bj.unit && !bj.bar && bj.play && /vimeo/.test(bj.url), JSON.stringify(bj));

    // 3. circuits: the rows are exactly as they were (no mark, nothing pushed past the card); ▶ opens the pop-up
    for (const cname of ['Hip Primer', 'Press and Pull']) {
      const c = await circuit(p, cname);
      t.check(`${tag}: ${cname}: the rows carry no extra control and do not run sideways`, c && c.marks === 0 && c.over <= 0, JSON.stringify(c));
      console.log(`   ${tag} ${cname} name widths: ${c.names.join(' / ')} px`);
    }
    await circuit(p, 'Hip Primer');
    await shot(p, `${file}-warmup`);

    // the pop-up a ▶ opens: a wide clip, then a Short, then a wide one again (the shape must not stick)
    const play = nm => p.locator('#day-view .round-row', { hasText: nm }).locator('.round-play-btn').click();
    await play('90/90 Hip Switch');
    await p.waitForTimeout(250);
    const mw = await modal(p);
    t.check(`${tag}: pop-up, wide clip: a 16:9 player with the bar under it, inside the screen`,
      mw.open && mw.ratio === 1.78 && mw.iframeFills && mw.barBelow && mw.barH >= 44 && mw.barW === mw.innerW && mw.fits, JSON.stringify(mw));
    t.check(`${tag}: pop-up, wide clip: the bar links to the watch address, in red, and is not covered`,
      mw.href === WATCH('aaaaaaaaaaa') && mw.target === '_blank' && /noopener/.test(mw.rel) && /noreferrer/.test(mw.rel) && mw.text === 'Open in YouTube' && mw.mark && mw.hit && mw.closeVisible,
      JSON.stringify(mw));
    await shot(p, `${file}-popup`);
    await p.evaluate(() => VideoModal.close());
    await circuit(p, 'Hip Primer');
    await play('Banded Lateral Walk');
    await p.waitForTimeout(250);
    const ms = await modal(p);
    t.check(`${tag}: pop-up, Short: a 9:16 player and its bar fit the screen (${ms.vh} px tall), the bar keeps the Short's address`,
      ms.open && ms.ratio === 0.56 && ms.iframeFills && ms.barBelow && ms.fits && ms.href === SHORTS('ccccccccccc') && ms.hit, JSON.stringify(ms));
    await shot(p, `${file}-popup-short`);
    await p.evaluate(() => VideoModal.close());
    await circuit(p, 'Hip Primer');
    await play('90/90 Hip Switch');
    await p.waitForTimeout(250);
    const mw2 = await modal(p);
    t.check(`${tag}: pop-up, wide again after a Short: back to 16:9 and its own address`, mw2.ratio === 1.78 && mw2.href === WATCH('aaaaaaaaaaa') && mw2.fits, JSON.stringify(mw2));
    await p.evaluate(() => VideoModal.close());

    t.check(`${tag}: the page does not run sideways`, (await sideways(p)) <= 0);
    t.check(`${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // 4. a short phone, and behaviour at 390: the embed loads and the bar stays; a tap on a bar leaves the app alone
  {
    const { ctx, p } = await H.openProgram(browser, { w: 320, h: 568, prog: programme(), spine: spine() });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);
    await circuit(p, 'Hip Primer');
    await p.locator('#day-view .round-row', { hasText: 'Banded Lateral Walk' }).locator('.round-play-btn').click();
    await p.waitForTimeout(250);
    const m = await modal(p);
    t.check('320 x 568: the Short pop-up and its bar fit inside a short screen', m.open && m.fits && m.barBelow && m.hit, JSON.stringify(m));
    await shot(p, 'yt-320x568-popup-short');
    await ctx.close();
  }
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, prog: programme(), spine: spine() });
    const navs = [];
    ctx.on('request', r => { if (r.isNavigationRequest()) navs.push(r.url()); });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);
    await openCard(p, 'Barbell Back Squat');
    const card = p.locator('#day-view .checklist-item', { hasText: 'Barbell Back Squat' });

    await card.locator('.ex-video-play').click();
    await p.waitForTimeout(300);
    const after = await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; const v = c.querySelector('.ex-video'), i = v.querySelector('iframe');
      const a = c.querySelector('a.ex-yt'); a.scrollIntoView({ block: 'center' }); const r = a.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { playing: v.classList.contains('playing'), src: i && i.getAttribute('src'), barVisible: r.height >= 44 && r.width > 100, hit: !!(hit && hit.closest('a.ex-yt')) }; })()`);
    t.check('once the embed has loaded, the bar is still under it and still the thing under the finger',
      after.playing && /^https:\/\/www\.youtube\.com\/embed\/ultWZbUMPL8\?/.test(after.src || '') && after.barVisible && after.hit, JSON.stringify(after));

    let before = navs.length;
    let [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), card.locator('a.ex-yt').click()]);
    await p.waitForTimeout(400);
    if (pop) await pop.close().catch(() => {});
    t.check('a tap on the card\'s bar opens the watch address in a new tab', !!pop && navs.slice(before).includes(WATCH('ultWZbUMPL8')), JSON.stringify({ popup: !!pop, navs: navs.slice(before) }));
    const still = await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; return { open: !c.classList.contains('collapsed'), url: location.pathname }; })()`);
    t.check('and the app stays where it was (the card is still open, the page did not leave)', still.open && /program\.html$/.test(still.url), JSON.stringify(still));

    // the pop-up's bar: a tap opens the address and the pop-up stays
    await circuit(p, 'Press and Pull');
    await p.locator('#day-view .round-row', { hasText: 'Dumbbell Bench Press' }).locator('.round-play-btn').click();
    await p.waitForTimeout(250);
    before = navs.length;
    [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), p.locator('.video-modal-yt').click()]);
    await p.waitForTimeout(400);
    if (pop) await pop.close().catch(() => {});
    const stay = await modal(p);
    t.check('a tap on the pop-up\'s bar opens the watch address in a new tab and leaves the pop-up open',
      !!pop && navs.slice(before).includes(WATCH('ddddddddddd')) && stay.open, JSON.stringify({ popup: !!pop, navs: navs.slice(before), open: stay.open }));
    await p.evaluate(() => VideoModal.close());

    // Guided moves the card's open part into its own overlay: the bar goes with it
    await p.evaluate(() => { startTimerNow('1'); openGuided('1'); });
    await p.waitForTimeout(400);
    const gd = await p.evaluate(`(() => { const i = STEP.seq.findIndex(s => s.name === 'Barbell Back Squat'); if (i < 0) return { found: false };
      STEP.pos = i; renderStep(); const how = document.querySelector('#step-scroll .ex-how'); if (how) how.open = true;
      const a = document.querySelector('#step-scroll .ex-vunit a.ex-yt'); if (a) a.scrollIntoView({ block: 'center' });
      const r = a && a.getBoundingClientRect(), hit = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { found: true, bar: !!a, href: a && a.getAttribute('href'), h: r && Math.round(r.height), hit: !!(hit && hit.closest('a.ex-yt')) }; })()`);
    t.check('Guided: the current exercise\'s player has the bar, reachable', gd.found && gd.bar && gd.href === WATCH('ultWZbUMPL8') && gd.h >= 44 && gd.hit, JSON.stringify(gd));
    await shot(p, 'yt-390-guided');
    await p.evaluate(() => closeStepMode());

    // the About sheet from Library → Exercises carries the same player and bar
    await p.evaluate(() => openExerciseSheet('barbell-back-squat', null, true));
    await p.waitForTimeout(300);
    const sheet = await p.evaluate(() => { const u = document.querySelector('#hist-overlay .ex-vunit'), a = u && u.querySelector('a.ex-yt');
      return { unit: !!u, href: a && a.getAttribute('href'), play: !!(u && u.querySelector('.ex-video-play')) }; });
    t.check('the About sheet\'s player has the bar too', sheet.unit && sheet.href === WATCH('ultWZbUMPL8') && sheet.play, JSON.stringify(sheet));
    await shot(p, 'yt-390-sheet');
    t.check('no page errors on the behaviour run', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
