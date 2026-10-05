// The «باز کردن در یوتیوب» bar in the course app (tennis/app/, Amir 2026-10-05), run in its demo mode against a
// stub: the only request it needs, tps_demo(), is answered here with a small MADE-UP course (nothing real, this repo
// is public). The same idea as youtube.js for program.html: a buyer in Iran whose embed will not play, while the
// YouTube app or browser does, taps the bar under the player and the phone takes the clip. Checks, at 390 / 360 / 320
// px in a right-to-left page: the bar under a session's exercise, the exercise page and step mode; the plain watch
// (or shorts) address, in a new tab; the red mark at the start edge and the arrow at the end; still reachable once
// the embed has loaded; a Short; a non-YouTube link gets no bar; nothing runs sideways.
// Serve the repo (python3 -m http.server 8765 --bind 127.0.0.1), then: node scripts/headless/youtube-course.js [--out <dir>]
'use strict';
const path = require('path');
const H = require('./lib');

const WATCH = id => 'https://www.youtube.com/watch?v=' + id;
const SHORTS = id => 'https://www.youtube.com/shorts/' + id;
const SB = 'https://bvipfipbdcyqnbczjmaq.supabase.co';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

// What tps_demo() answers, in the shape ingest() reads: one week, one session, three exercises.
const DEMO = {
  start: { title: 'x' },
  programme: {
    blocks: [{ name: 'بنیان', weeks: '1-4' }],
    weeks: [{ week: 1, title: 'هفتهٔ اول', plans: { adult: { core: [{ code: 'A', title: 'قدرت پایه', place: 'gym', minutes: 60, groups: [
      { slot: 'S1', title: 'قدرت', items: [
        { ex: 'sq', sets: 4, reps: 6, rpe: 7, rest: 150 },
        { ex: 'sp', sets: 3, time: '30 s' },
        { ex: 'bj', sets: 3, reps: 4 },
      ] }] }], addons: [] } } }],
  },
  exercises: { exercises: {   // ingest('exercises', d) reads d.exercises
    sq: { name: 'اسکوات', nameEn: 'Barbell Back Squat', slot: 'S1', slotTitle: 'قدرت', video: WATCH('ultWZbUMPL8'), cues: ['شکم را سفت کن', 'زانو روی انگشت‌ها'], purpose: 'قدرت پا.' },
    sp: { name: 'پلانک کناری', nameEn: 'Side Plank', slot: 'S1', slotTitle: 'قدرت', video: SHORTS('Zz9aBcDeFgH'), cues: ['لگن بالا'] },
    // Not a YouTube address, but with a v= and an 11-character id: ytId() still reads it (the player is as it always was),
    // and the bar must not point a buyer at some other YouTube video.
    bj: { name: 'پرش جعبه', nameEn: 'Box Jump', slot: 'S1', slotTitle: 'قدرت', video: 'https://example.com/clip?v=abcdefghijk', cues: ['نرم فرود بیا'] },
  } },
  learn: { lessons: [] }, tests: { tests: [] }, library: {},
};

async function openCourse(browser, { w = 390, h = 844, hash = '#/programme/week/1/A' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(SB + '/rest/v1/rpc/tps_demo')) {
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
      return r.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json' }, CORS), body: JSON.stringify(DEMO) });
    }
    return u.startsWith(H.BASE + '/') ? r.continue() : r.abort();
  });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e.message || e)));
  await p.goto(H.BASE + '/tennis/app/index.html?demo=1' + hash, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.ex, .banner, .section', { timeout: 20000 });
  await p.waitForTimeout(500);
  return { ctx, p };
}

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const shot = (p, name) => p.screenshot({ path: path.join(shots, name + '.png') });
  const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const rowOf = (p, en) => p.locator('.ex', { hasText: en });
  const probe = (p, scope) => p.evaluate(`(() => {
    const root = ${scope}; const u = root && root.querySelector('.vunit'); if (!u) return { unit: false };
    const v = u.querySelector('.video'), a = u.querySelector('a.vyt'), r = e => e && e.getBoundingClientRect();
    if (a) a.scrollIntoView({ block: 'center' });
    const ar = r(a), vr = r(v), ur = r(u);
    const hit = a ? document.elementFromPoint(ar.left + ar.width / 2, ar.top + ar.height / 2) : null;
    const g = a && r(a.querySelector('svg:first-child')), ow = a && r(a.querySelector('svg:last-child')), mid = a && (ar.left + ar.width / 2);
    return { unit: true, short: u.classList.contains('short'), bar: !!a, href: a && a.getAttribute('href'), target: a && a.target, rel: a && a.rel,
      text: a && a.textContent.trim(), inside: !!(a && a.closest('.video')), h: a && Math.round(ar.height), barW: a && Math.round(ar.width),
      vidW: Math.round(vr.width), unitW: Math.round(ur.width), hit: !!(hit && hit.closest('a.vyt')), play: !!u.querySelector('.play'),
      markStart: !!(g && g.left > mid), arrowEnd: !!(ow && ow.right < mid), mark: !!(a && a.querySelector('svg rect[fill="#FF0000"]')),
      dir: getComputedStyle(document.documentElement).direction };
  })()`);

  for (const [w, h] of [[390, 844], [360, 740], [320, 568]]) {
    const tag = `${w}`, file = `course-${w}`;
    const { ctx, p } = await openCourse(browser, { w, h });
    t.check(`${tag}: the demo session opens in a right-to-left page`, (await p.locator('.ex').count()) === 3 && (await p.evaluate(() => getComputedStyle(document.documentElement).direction)) === 'rtl');

    // a session's exercise row: open it, the player has a bar
    await rowOf(p, 'Barbell Back Squat').locator('.ex-main').click();
    await p.waitForTimeout(250);
    const sq = await probe(p, `[...document.querySelectorAll('.ex')].find(x => x.textContent.includes('Barbell Back Squat'))`);
    t.check(`${tag}: the squat's player has a bar outside the box the iframe fills`, sq.unit && sq.bar && !sq.inside, JSON.stringify(sq));
    t.check(`${tag}: it links to the plain watch address, in a new tab, no referrer`,
      sq.href === WATCH('ultWZbUMPL8') && sq.target === '_blank' && /noopener/.test(sq.rel) && /noreferrer/.test(sq.rel), `${sq.href} ${sq.target} ${sq.rel}`);
    t.check(`${tag}: Farsi words, YouTube's red mark at the start edge, the arrow at the end, 44 px+ tall, as wide as the player`,
      sq.text === 'باز کردن در یوتیوب' && sq.mark && sq.markStart && sq.arrowEnd && sq.h >= 44 && Math.abs(sq.barW - sq.vidW) <= 1, JSON.stringify(sq));
    t.check(`${tag}: the ▶ is still there and the bar is the thing under the finger`, sq.play && sq.hit, JSON.stringify({ play: sq.play, hit: sq.hit }));
    await rowOf(p, 'Barbell Back Squat').scrollIntoViewIfNeeded();
    await shot(p, file + '-session');

    // a Short, and a Vimeo link
    await rowOf(p, 'Side Plank').locator('.ex-main').click();
    await p.waitForTimeout(250);
    const sp = await probe(p, `[...document.querySelectorAll('.ex')].find(x => x.textContent.includes('Side Plank'))`);
    t.check(`${tag}: a Short keeps its /shorts/ address, a tall player and a bar as wide as it`,
      sp.short && sp.href === SHORTS('Zz9aBcDeFgH') && sp.unitW <= 300 && Math.abs(sp.barW - sp.vidW) <= 1 && sp.vidW === sp.unitW, JSON.stringify(sp));
    await shot(p, file + '-short');
    await rowOf(p, 'Box Jump').locator('.ex-main').click();
    await p.waitForTimeout(250);
    const bj = await probe(p, `[...document.querySelectorAll('.ex')].find(x => x.textContent.includes('Box Jump'))`);
    t.check(`${tag}: a link that is not a YouTube address gets no YouTube bar`, bj.unit && !bj.bar && bj.play, JSON.stringify(bj));
    t.check(`${tag}: the session does not run sideways`, (await sideways(p)) <= 0);

    // the exercise's own page
    await p.goto(H.BASE + '/tennis/app/index.html?demo=1#/exercises/sq');
    await p.waitForSelector('.vunit', { timeout: 10000 });
    const ex = await probe(p, 'document.querySelector(".section")');
    t.check(`${tag}: the exercise page's player has the bar`, ex.bar && ex.href === WATCH('ultWZbUMPL8') && ex.hit && Math.abs(ex.barW - ex.vidW) <= 1, JSON.stringify(ex));
    await shot(p, file + '-exercise');
    t.check(`${tag}: the exercise page does not run sideways`, (await sideways(p)) <= 0);

    // step by step: the current exercise's player
    await p.goto(H.BASE + '/tennis/app/index.html?demo=1#/programme/week/1/A/step/0');
    await p.waitForSelector('.step-body', { timeout: 10000 });
    await p.waitForTimeout(300);
    const st = await probe(p, 'document.querySelector(".step-body")');
    t.check(`${tag}: step mode: the player has the bar`, st.unit && (st.bar ? st.href === WATCH('ultWZbUMPL8') : false), JSON.stringify(st));
    await shot(p, file + '-step');
    t.check(`${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // behaviour at 390: the embed loads and the bar stays; a tap on the bar opens the address and leaves the app alone
  {
    const { ctx, p } = await openCourse(browser, { w: 390 });
    const navs = [];
    ctx.on('request', r => { if (r.isNavigationRequest()) navs.push(r.url()); });
    await rowOf(p, 'Barbell Back Squat').locator('.ex-main').click();
    await p.waitForTimeout(250);
    await rowOf(p, 'Barbell Back Squat').locator('.play').click();
    await p.waitForTimeout(300);
    const after = await p.evaluate(() => { const c = [...document.querySelectorAll('.ex')].find(x => x.textContent.includes('Barbell Back Squat'));
      const v = c.querySelector('.video'), i = v.querySelector('iframe'), a = c.querySelector('a.vyt'); a.scrollIntoView({ block: 'center' });
      const r = a.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { playing: v.classList.contains('playing'), src: i && i.getAttribute('src'), barVisible: r.height >= 44 && r.width > 100, hit: !!(hit && hit.closest('a.vyt')) }; });
    t.check('once the embed has loaded, the bar is still under it and still the thing under the finger',
      after.playing && /^https:\/\/www\.youtube\.com\/embed\/ultWZbUMPL8\?/.test(after.src || '') && after.barVisible && after.hit, JSON.stringify(after));
    const before = navs.length;
    const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), rowOf(p, 'Barbell Back Squat').locator('a.vyt').click()]);
    await p.waitForTimeout(400);
    if (pop) await pop.close().catch(() => {});
    t.check('a tap on the bar opens the watch address in a new tab', !!pop && navs.slice(before).includes(WATCH('ultWZbUMPL8')), JSON.stringify({ popup: !!pop, navs: navs.slice(before) }));
    const still = await p.evaluate(() => ({ open: [...document.querySelectorAll('.ex.open')].some(x => x.textContent.includes('Barbell Back Squat')), hash: location.hash }));
    t.check('and the app stays where it was (the row is still open, the route did not change)', still.open && /programme\/week\/1\/A$/.test(still.hash), JSON.stringify(still));
    t.check('no page errors on the behaviour run', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
