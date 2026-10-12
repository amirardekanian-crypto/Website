// Home and Progress in the Centre Court look (Amir, 2026-10-12): the tab bar (Home · Progress · Library · Coach), Progress (header, This cycle
// card, Your numbers, the Game Plan), Home (This Week, Next up as one card, the other days as rows, the habits door row), the one door-row look,
// the one gutter, the account button that scrolls away with its screen, and Records and Body weight going back to Progress. Serve the repo first
// (python -m http.server 8765 --bind 127.0.0.1, see lib.js), then: node scripts/headless/home-progress.js [--out <dir>]
'use strict';
const path = require('path');
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');   // the LOCAL calendar day
const day = n => ymd(new Date(Date.now() - n * DAY));

// The longest day name the demo programme has: the Next up card must never clip it.
const LONG = 'Change of Direction & Rotational Power';
function prog(title) {
  const P = H.fixture();
  if (title) P.workouts.days[0].title = title;
  return P;
}
// A record (a squat, three sessions apart) and four body weights: Progress's two number rows with data.
const SEED_NUMBERS = {
  _1rm: [
    { lift: 'Barbell Back Squat', kg: 92, w: '75', r: '6', rpe: 7, d: day(24), t: Date.now() - 24 * DAY },
    { lift: 'Barbell Back Squat', kg: 98, w: '80', r: '6', rpe: 7, d: day(10), t: Date.now() - 10 * DAY },
    { lift: 'Barbell Back Squat', kg: 104, w: '85', r: '6', rpe: 7, d: day(2), t: Date.now() - 2 * DAY },
  ],
  _hab_wt: { [day(33)]: { kg: 81.4, t: 1 }, [day(18)]: { kg: 80.6, t: 2 }, [day(7)]: { kg: 80.1, t: 3 }, [day(1)]: { kg: 79.8, t: 4 } },
};
// AA Proof's snapshot for Home's habits row (it publishes it at every render).
const hab = (verdict, extra) => ({ lv: 3, streak: 4, done: 2, total: 5, verdict, togo: 2, qualified: false, pct: 40, t: Date.now(), ...extra });

// Every text node the active screen draws, as a client rect, against the account button's.
const OVERLAP = `(() => {
  const b = document.getElementById('global-account'), r = b.getBoundingClientRect();
  if (!r.width) return { hidden: true, hits: [] };
  const hits = [], tw = document.createTreeWalker(document.querySelector('.screen.active'), NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) {
    if (!n.textContent.trim() || !n.parentElement) continue;
    const cs = getComputedStyle(n.parentElement);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const range = document.createRange(); range.selectNodeContents(n);
    for (const q of range.getClientRects()) {
      if (q.width < 1 || q.height < 1) continue;
      if (q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top) hits.push(n.textContent.trim().slice(0, 28));
    }
  }
  return { hidden: false, hits, rect: [r.left, r.top, r.right, r.bottom].map(Math.round) };
})()`;

const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const active = p => p.evaluate(() => document.querySelector('.screen.active').id);
const lit = p => p.evaluate(() => [...document.querySelectorAll('#global-tabs .nav-item.active')].map(n => n.dataset.tab).join());

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const shot = (p, name) => p.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });

  // ── 1. the tab bar, and Progress with its header, its card, Your numbers and the Game Plan, in that order ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), seed: SEED_NUMBERS });
    const tabs = await p.evaluate(() => ({
      labels: [...document.querySelectorAll('#global-tabs .nav-item .nav-label')].map(x => x.textContent.trim()).join(' · '),
      data: [...document.querySelectorAll('#global-tabs .nav-item')].map(x => x.dataset.tab).join(),
      icon: document.querySelector('#global-tabs [data-tab="plan"] svg path').getAttribute('d'),
      onclick: document.querySelector('#global-tabs [data-tab="plan"]').getAttribute('onclick'),
    }));
    t.check('tab bar: Home · Progress · Library · Coach, in that order', tabs.labels === 'Home · Progress · Library · Coach' && tabs.data === 'home,plan,workouts,notes', JSON.stringify(tabs));
    t.check('tab bar: Progress keeps data-tab plan and goTo(plan), with the rising-line icon', tabs.onclick === "goTo('plan')" && tabs.icon === 'M3 17l5-5 4 3 7-8', JSON.stringify(tabs));
    t.check('Home lights the Home tab', (await lit(p)) === 'home', await lit(p));

    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(500);
    t.check('Progress lights the Progress tab', (await lit(p)) === 'plan', await lit(p));
    const o = await p.evaluate(() => {
      const top = sel => { const e = document.querySelector('#screen-plan ' + sel); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
      const eyebrow = document.querySelector('#athlete-card-wrap .prog-eyebrow'), title = document.querySelector('#athlete-card-wrap .prog-title');
      const sec = [...document.querySelectorAll('#screen-plan .prog-sec')].map(e => e.textContent.trim());
      const gp = document.querySelector('#cycle-meter-wrap .prog-sec');
      const card = document.querySelector('#cycle-card-wrap .cyc-card');
      return { eyebrow: eyebrow && eyebrow.textContent.trim(), title: title && title.textContent.trim(), titleTag: title && title.tagName, titleSize: title && getComputedStyle(title).fontSize,
        badge: !!document.querySelector('#athlete-card-wrap .sport-badge'), dates: (document.querySelector('#athlete-card-wrap .athlete-card-dates') || {}).textContent || null,
        old: !!document.querySelector('#screen-plan .home-name'),
        y: { title: top('.prog-title'), badge: top('.sport-badge'), dates: top('.athlete-card-dates'), card: top('.cyc-card'), numbers: top('#numbers-title'), ceil: top('#ceiling-row-wrap .hrow'),
             weight: top('#weight-row-wrap .hrow'), plan: gp ? Math.round(gp.getBoundingClientRect().top + scrollY) : null, meter: top('.cycle-meter') },
        sec, card: card && { tag: card.tagName, onclick: card.getAttribute('onclick'), arrow: !!card.querySelector('.cyc-top i'), text: card.innerText },
        gp: gp && { size: getComputedStyle(gp).fontSize, caps: getComputedStyle(gp).textTransform, color: getComputedStyle(gp).color, spacing: getComputedStyle(gp).letterSpacing } };
    });
    t.check('Progress header: the name as the eyebrow, "Progress" as a 44 px title, no big two-line name',
      o.eyebrow === 'Alex Rivera' && o.title === 'Progress' && o.titleTag === 'H1' && o.titleSize === '44px' && !o.old, JSON.stringify([o.eyebrow, o.title, o.titleSize, o.old]));
    t.check('Progress header: the sport badge and the dates line stay under the title', o.badge && /\d/.test(o.dates || '') && o.y.title < o.y.badge && o.y.badge < o.y.dates, JSON.stringify(o.y));
    const y = o.y;
    t.check('Progress order: header, This cycle card, Your numbers (Records, Body weight), then the Game Plan and its road',
      y.dates < y.card && y.card < y.numbers && y.numbers < y.ceil && y.ceil < y.weight && y.weight < y.plan && y.plan < y.meter, JSON.stringify(y));
    t.check('Progress: two section titles, Your numbers and Game Plan', o.sec.join('|') === 'Your numbers|Game Plan', o.sec.join('|'));
    t.check('Progress: the Game Plan title is 15 px capitals in green ink with a hairline to the edge',
      !!o.gp && o.gp.size === '15px' && o.gp.caps === 'uppercase' && o.gp.color === 'rgb(14, 74, 54)' && parseFloat(o.gp.spacing) > 0, JSON.stringify(o.gp));
    t.check('This cycle card on Progress: a plain card, no tap, no ›', !!o.card && o.card.tag === 'DIV' && !o.card.onclick && !o.card.arrow, JSON.stringify(o.card && [o.card.tag, o.card.onclick, o.card.arrow]));
    t.check('This cycle card: no "Your wins show here" line when there are no wins yet', !!o.card && !/wins show here/i.test(o.card.text) && !(await p.$('.cyc-none')), o.card && o.card.text.replace(/\s+/g, ' '));
    t.check('Progress with data: Records and Body weight rows carry their numbers',
      await p.evaluate(() => /104\s*kg/.test(document.querySelector('#ceiling-row-wrap').innerText) && /79\.8\s*kg/.test(document.querySelector('#weight-row-wrap').innerText)));
    await shot(p, 'progress-data');
    t.check('no page errors (tabs and Progress)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. Home: no cycle card, no Records or Body weight row, one Next up card, the rest as rows, the in-app guide ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), seed: SEED_NUMBERS });
    const h = await p.evaluate(() => {
      const home = document.getElementById('home-overview');
      const hero = [...home.querySelectorAll('.day-ov-card')];
      const rows = [...home.querySelectorAll('.dc-row')];
      return { cyc: !!home.querySelector('.cyc-card, .home-cyc'), ids: ['home-ceiling-wrap', 'home-weight-wrap', 'home-cycle-wrap'].filter(i => document.getElementById(i)),
        hrows: [...home.querySelectorAll('.hrow')].map(r => r.querySelector('.hrow-l').textContent.trim()),
        text: /personal records|body weight/i.test(home.innerText),
        cards: hero.length, hero: hero[0] && { cls: hero[0].className, role: hero[0].getAttribute('role'), tab: hero[0].getAttribute('tabindex'), dc: hero[0].dataset.dc, click: hero[0].getAttribute('onclick') },
        rows: rows.map(r => ({ dl: r.dataset.dl, dc: r.dataset.dc || null, label: r.getAttribute('aria-label'), done: r.classList.contains('is-done'), role: r.getAttribute('role') })),
        list: !!home.querySelector('.dc-list'), days: DATA.workouts.days.length,
        order: [...home.children].map(c => c.id || c.className).join(' | ') };
    });
    t.check('Home: no This cycle card, no small cycle line', !h.cyc, JSON.stringify(h.ids));
    t.check('Home: no Records or Body weight row (they are on Progress), and none of the old wrappers', h.hrows.join() === 'Daily habits' && !h.text && h.ids.length === 0, JSON.stringify([h.hrows, h.text, h.ids]));
    t.check('Home: exactly one .day-ov-card, the Next up card (.dc-hero, data-dc, role button)',
      h.cards === 1 && /\bdc-hero\b/.test(h.hero.cls) && h.hero.role === 'button' && h.hero.tab === '0' && !!h.hero.dc && h.hero.click === `openDayView('${h.hero.dc}')`, JSON.stringify(h.hero));
    t.check('Home: every other day is a .dc-row with data-dl and no data-dc, in .dc-list', h.list && h.rows.length === h.days - 1 && h.rows.every(r => r.dl && !r.dc && r.role === 'button' && r.dl !== h.hero.dc), JSON.stringify(h.rows));
    t.check('Home: the fixture has Day 1 done this week, so Next up is Day 2 and Day 1 is a done row', h.hero.dc === '2' && h.rows[0].dl === '1' && h.rows[0].done && /done this week/.test(h.rows[0].label), JSON.stringify([h.hero.dc, h.rows]));
    t.check('Home: order is the greeting, This Week, the days, then the habits row and the Proof strip', /home-greeting-wrap.*home-offline.*home-unfinished-wrap.*home-week-wrap.*day-cards-wrap.*home-sugg-wrap.*home-habits-wrap.*home-proof-strip/.test(h.order), h.order);

    const g = await p.evaluate(() => {
      const gh = [...APP_GUIDE].find(c => c.title === 'Getting around'), st = [...APP_GUIDE].find(c => c.title === 'How your program is structured'), rec = [...APP_GUIDE].find(c => /Personal Records/.test(c.title));
      const labels = (gh.body.match(/<li><strong>([^<]+)<\/strong>/g) || []).map(s => s.replace(/<[^>]+>/g, ''));
      return { labels, game: /<strong>Game Plan<\/strong> —/.test(gh.body), progress: /Progress<\/strong> is how it's going/.test(gh.body), home: /Home<\/strong> is your week/.test(gh.body),
        struct: /Game Plan<\/strong> explains/.test(st.body), structOk: /on <strong>Progress<\/strong>, in the Game Plan/.test(st.body), rec: /Open <strong>Progress<\/strong>/.test(rec.body) };
    });
    t.check('the guide, Getting around: the tabs in the new order and names, Game Plan no longer a tab', g.labels.join() === 'Home,Progress,Library,Coach' && !g.game && g.progress && g.home, JSON.stringify(g));
    t.check('the guide: "Why This Cycle Matters" is on Progress; Personal Records is opened from Progress', g.structOk && !g.struct && g.rec, JSON.stringify(g));
    t.check('no page errors (Home)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 3. the Next up card: its title is never clipped (320, 375, 390), its button is green, the card opens the day by touch and keyboard ──
  for (const w of [320, 375, 390]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(LONG), w, h: w === 320 ? 568 : 844, hist: [] });
    const c = await p.evaluate(() => {
      const hero = document.querySelector('.dc-hero'), cap = hero.querySelector('.cm-banner-caption'), name = hero.querySelector('.day-card-name'), eb = hero.querySelector('.cm-name');
      const hr = hero.getBoundingClientRect(), nr = name.getBoundingClientRect(), er = eb.getBoundingClientRect();
      const btn = hero.querySelector('.dc-go'), bs = getComputedStyle(btn), br = btn.getBoundingClientRect();
      return { name: name.textContent, eyebrow: eb.textContent.trim(), capScroll: cap.scrollHeight, capClient: cap.clientHeight, heroScroll: hero.scrollHeight, heroClient: hero.clientHeight,
        nameIn: nr.top >= hr.top && nr.bottom <= hr.bottom && nr.left >= hr.left && nr.right <= hr.right, eyebrowIn: er.top >= hr.top, nameLines: Math.round(nr.height / parseFloat(getComputedStyle(name).fontSize)),
        nameSize: getComputedStyle(name).fontSize, nameWeight: getComputedStyle(name).fontWeight,
        sideScroll: name.scrollWidth - name.clientWidth,
        outline: (() => { const n = document.querySelector('.dc-row:not(.is-done) .dc-num'); if (!n) return null; const c = getComputedStyle(n); return { color: c.color, stroke: c.webkitTextStrokeWidth, size: c.fontSize, weight: c.fontWeight }; })(),
        btn: { text: btn.textContent.replace(/\s+/g, ' ').trim(), bg: bs.backgroundImage + ' ' + bs.backgroundColor, h: Math.round(br.height), w: Math.round(br.width),
               cap: Math.round(cap.clientWidth - parseFloat(getComputedStyle(cap).paddingLeft) - parseFloat(getComputedStyle(cap).paddingRight)), tag: btn.tagName,
               clay: /199,\s*85,\s*47/.test(bs.backgroundImage + bs.backgroundColor + bs.borderColor) },
        corner: getComputedStyle(hero).borderRadius, heroH: Math.round(hr.height) };
    });
    t.check(`Next up ${w}: the long day name is whole (the caption and the card show everything they hold)`, c.capScroll <= c.capClient + 1 && c.heroScroll <= c.heroClient + 1 && c.nameIn && c.eyebrowIn && c.sideScroll <= 0, JSON.stringify(c));
    t.check(`Next up ${w}: "Next up · Day 1" over the name in 28 to 36 px Barlow Condensed 900 capitals`, c.eyebrow === 'Next up · Day 1' && c.name === LONG && parseFloat(c.nameSize) >= 28 && parseFloat(c.nameSize) <= 36 && c.nameWeight === '900', JSON.stringify([c.eyebrow, c.nameSize, c.nameWeight]));
    t.check(`Next up ${w}: the button is green (not clay), 48 px, the width of the caption, "Open Day 1 ▶"`, !c.btn.clay && /rgb\(36, 133, 95\)/.test(c.btn.bg) && c.btn.h >= 48 && c.btn.tag === 'BUTTON' && Math.abs(c.btn.w - c.btn.cap) <= 1 && /^Open Day 1\s*▶$/.test(c.btn.text), JSON.stringify(c.btn));
    t.check(`Next up ${w}: corners 16 px, no sideways scroll`, c.corner === '16px' && (await sideways(p)) <= 0, c.corner);
    t.check(`Next up ${w}: a day not done is an outlined numeral (transparent fill, 1.5 px stroke, Barlow Condensed 900 at 32 px)`,
      !!c.outline && c.outline.color === 'rgba(0, 0, 0, 0)' && c.outline.stroke === '1.5px' && c.outline.size === '32px' && c.outline.weight === '900', JSON.stringify(c.outline));
    if (w === 320) await shot(p, 'next-up-long-name-320');
    t.check(`Next up ${w}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), hist: [] });
    await p.evaluate(() => { window.__opened = []; const o = window.openDayView; window.openDayView = id => { window.__opened.push(String(id)); return o(id); }; });
    // the card itself, by Enter and by Space, then the button inside it, by click and by Enter (once each, never twice)
    const count = () => p.evaluate(() => window.__opened.length);
    await p.focus('.dc-hero'); await p.keyboard.press('Enter');
    t.check('Next up: Enter on the card opens its day', (await count()) === 1 && (await p.evaluate(() => !document.getElementById('day-view').hidden)));
    await p.evaluate(() => { closeDayView(); window.__opened.length = 0; });
    await p.focus('.dc-hero'); await p.keyboard.press('Space');
    t.check('Next up: Space on the card opens its day', (await count()) === 1);
    await p.evaluate(() => { closeDayView(); window.__opened.length = 0; });
    await p.focus('.dc-go'); await p.keyboard.press('Enter');
    t.check('Next up: Enter on its button opens the day once, not twice', (await count()) === 1, await count());
    await p.evaluate(() => { closeDayView(); window.__opened.length = 0; });
    await p.click('.dc-row');
    t.check('a day row opens its day on a tap', (await count()) === 1, await count());
    await p.evaluate(() => { closeDayView(); window.__opened.length = 0; });
    await p.focus('.dc-row'); await p.keyboard.press('Enter');
    t.check('a day row opens its day on Enter', (await count()) === 1, await count());
    t.check('no page errors (keyboard)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 4. a day in progress is always Next up and Resumes; a finished week has rows only ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), hist: [] });
    await p.evaluate(() => { startTimerNow('2'); paintWeek(); });
    await p.waitForTimeout(1300);
    const s = await p.evaluate(() => {
      const hero = document.querySelector('.dc-hero'), clk = hero.querySelector('.dc-clock');
      return { dc: hero.dataset.dc, eyebrow: hero.querySelector('.cm-name').textContent.trim(), line: hero.querySelector('.dc-prog').textContent.replace(/\s+/g, ' ').trim(), clock: clk && clk.textContent,
        btn: hero.querySelector('.dc-go').textContent.replace(/\s+/g, ' ').trim(), cards: document.querySelectorAll('#home-overview .day-ov-card').length, suggested: document.querySelectorAll('.day-ov-card.suggested').length,
        rows: [...document.querySelectorAll('.dc-row')].map(r => r.dataset.dl).join(), old: !!document.querySelector('.dc-resume, .dc-live') };
    });
    t.check('in progress: Next up is the day under way, says In progress, its sets and its clock, and Resumes',
      s.dc === '2' && s.eyebrow === 'In progress · Day 2' && /^\d+ of \d+ sets/.test(s.line) && /^\d+:\d\d/.test(s.clock) && s.btn === 'Resume ▶' && s.cards === 1 && s.suggested === 1 && s.rows === '1' && !s.old, JSON.stringify(s));
    await p.evaluate(() => startTimerNow('1'));
    await p.evaluate(() => paintWeek());
    const first = await p.evaluate(() => document.querySelector('.dc-hero').dataset.dc);
    t.check('in progress: two days under way, the first in day order is Next up and there is still exactly one card', first === '1' && (await p.evaluate(() => document.querySelectorAll('#home-overview .day-ov-card').length)) === 1, first);
    await shot(p, 'home-in-progress');
    await ctx.close();
  }
  {
    // every day done this week: rows only, solid numerals, no Next up and no week-done card without its library
    const all = [{ completed_on: day(1), day: '1', readiness: 4, log: [{ ex: 'Barbell Back Squat', block: 'Strength', reps: 6, note: '', sets: [{ w: '70', n: 6, r: '7', d: true }] }] },
                 { completed_on: day(0), day: '2', readiness: 4, log: [{ ex: 'Barbell Back Squat', block: 'Strength', reps: 6, note: '', sets: [{ w: '70', n: 6, r: '7', d: true }] }] }];
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), hist: all });
    const s = await p.evaluate(() => ({ hero: document.querySelectorAll('.dc-hero').length, cards: document.querySelectorAll('#home-overview .day-ov-card').length,
      rows: [...document.querySelectorAll('.dc-row')].map(r => r.classList.contains('is-done')).join(), st: [...document.querySelectorAll('.dc-st')].map(x => x.textContent).join(),
      sum: (document.getElementById('home-week-sum') || {}).textContent, num: getComputedStyle(document.querySelector('.dc-row .dc-num')).color }));
    t.check('all done: no Next up, two done rows with a green Done, the count says so', s.hero === 0 && s.cards === 0 && s.rows === 'true,true' && s.st === 'Done,Done' && /All 2/.test(s.sum || ''), JSON.stringify(s));
    t.check('all done: a done numeral is solid green, a not-done one is an outline', s.num === 'rgb(14, 74, 54)', s.num);
    await shot(p, 'home-all-done');
    await ctx.close();
  }

  // ── 5. the door rows: one look with and without data; the habits verdict colours ──
  {
    const rowLook = el => { const c = getComputedStyle(el); return [c.backgroundColor, c.borderTopWidth, c.borderTopStyle, c.borderTopColor, c.borderTopLeftRadius, c.minHeight, c.display].join('|'); };
    // AA Proof's embedded strip publishes its own snapshot once it has loaded, so "no data" is made here, on the spot: the snapshot removed and the row drawn again
    const look = (p, noHabits) => p.evaluate(`(() => { const f = ${rowLook.toString()}; goTo('home');
      if (${!!noHabits}) { localStorage.removeItem(ATHLETE_ID + '_hab_card'); document.getElementById('home-habits-wrap').innerHTML = habitCardHtml(); }
      const h = document.querySelector('#home-habits-wrap .hrow'), hh = Math.round(h.getBoundingClientRect().height); goTo('plan');
      const c = document.querySelector('#ceiling-row-wrap .hrow'), w = document.querySelector('#weight-row-wrap .hrow');
      return { habits: f(h), records: f(c), weight: f(w), icons: [h, c, w].map(r => !!r.querySelector('.hrow-ic svg')).join(), quiet: [h, c, w].map(r => r.classList.contains('quiet')).join(),
        dark: [h, c, w].some(r => /rgb\\(18, 42, 34\\)/.test(getComputedStyle(r).backgroundColor)), dashed: [h, c, w].some(r => getComputedStyle(r).borderTopStyle === 'dashed'),
        minH: [hh, Math.round(c.getBoundingClientRect().height), Math.round(w.getBoundingClientRect().height)].join() }; })()`);
    const bare = await H.openProgram(browser, { prog: prog() });
    const a = await look(bare.p, true);
    await bare.ctx.close();
    const full = await H.openProgram(browser, { prog: prog(), seed: Object.assign({ _hab_card: hab('togo') }, SEED_NUMBERS) });
    const b = await look(full.p, false);
    const verdict = async (v, extra) => { const o = await H.openProgram(browser, { prog: prog(), seed: { _hab_card: hab(v, extra) } }); const r = await o.p.evaluate(() => { const e = document.querySelector('#home-habits-wrap .hrow-v'); return { text: e.firstChild.textContent.trim(), color: getComputedStyle(e).color, cls: e.className }; }); await o.ctx.close(); return r; };
    await full.ctx.close();
    t.check('door rows without data: all three quiet, with an icon, white with a 1 px edge, rounded 12, 64 px at least, never dark green, never dashed',
      a.quiet === 'true,true,true' && a.icons === 'true,true,true' && !a.dark && !a.dashed && a.habits === a.records && a.records === a.weight && /^rgb\(255, 255, 255\)\|1px\|solid\|.*\|12px\|64px\|flex$/.test(a.habits) && a.minH.split(',').every(n => +n >= 64), JSON.stringify(a));
    t.check('door rows with data: not quiet, the same background, edge and corners as without data, never dark green, never dashed',
      b.quiet === 'false,false,false' && b.icons === 'true,true,true' && !b.dark && !b.dashed && b.habits === a.habits && b.records === a.records && b.weight === a.weight, JSON.stringify([a.habits, b]));
    const togo = await verdict('togo'), on = await verdict('on'), perfect = await verdict('perfect');
    t.check('habits verdict: "2 to go" is clay ink (#B5461F, small text on the paper), On target and Perfect are green ink', togo.text === '2 to go' && togo.color === 'rgb(181, 70, 31)' && on.text === 'On target' && on.color === 'rgb(14, 74, 54)' && perfect.text === 'Perfect' && perfect.color === 'rgb(14, 74, 54)', JSON.stringify([togo, on, perfect]));
    // dark: the row is #242424 on #181818 like the day's rows
    const d = await H.openProgram(browser, { prog: prog(), dark: true, seed: Object.assign({ _hab_card: hab('on') }, SEED_NUMBERS) });
    const dk = await d.p.evaluate(() => { const r = document.querySelector('#home-habits-wrap .hrow'); const c = getComputedStyle(r); return { row: c.backgroundColor, page: getComputedStyle(document.body).backgroundColor, edge: c.borderTopColor, on: getComputedStyle(r.querySelector('.hrow-v')).color }; });
    t.check('dark: the door row is #242424 on #181818, its verdict mint', dk.row === 'rgb(36, 36, 36)' && dk.page === 'rgb(24, 24, 24)' && dk.on === 'rgb(109, 190, 149)', JSON.stringify(dk));
    await d.ctx.close();
  }

  // ── 6. the account button: absolute, off every screen's text at the top, gone when scrolled away ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), seed: SEED_NUMBERS, w: 390, h: 568 });
    const pos = await p.evaluate(() => { const b = document.getElementById('global-account'), c = getComputedStyle(b); return { position: c.position, top: c.top, right: c.right, op: b.offsetParent && b.offsetParent.tagName }; });
    t.check('the initials button is position: absolute, at the top right of the page', pos.position === 'absolute' && pos.top === '14px' && pos.right === '14px' && (pos.op === 'BODY' || pos.op === null), JSON.stringify(pos));
    const screens = [
      ['Home', () => goTo('home')], ['Progress', () => goTo('plan')], ['Coach', () => goTo('notes')],
      ['Library doors', () => goLibrary()], ['Library: Sessions', async () => { goLibrary(); await enterWorld('sessions'); }], ['Library: Playbook', async () => { goLibrary(); await enterWorld('playbook'); }],
      ['Library: Exercises', async () => { goLibrary(); await enterWorld('exercises'); }],
      ['Personal Records', () => goTo('ceiling')], ['Body weight', () => goTo('weight')],
      ['an article', async () => { await openArticle('articles/training/what-tennis-demands.json'); }], ['a Library session', async () => { await openWorkout('workouts/strength/full-body-power.json'); }],
    ];
    for (const [name, go] of screens) {
      await p.evaluate(`(async () => { window.scrollTo(0, 0); await (${go.toString()})(); })()`);
      await p.waitForTimeout(700);
      await p.evaluate(() => window.scrollTo(0, 0));
      const o = await p.evaluate(OVERLAP);
      t.check(`the initials button overlaps no text at the top of ${name}`, !o.hidden && o.hits.length === 0, JSON.stringify(o));
      const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      if (max >= 60) {
        await p.evaluate(() => window.scrollTo(0, 600));
        const off = await p.evaluate(() => ({ y: Math.round(scrollY), bottom: Math.round(document.getElementById('global-account').getBoundingClientRect().bottom) }));
        t.check(`${name}: scrolled to ${off.y}, the initials button is off screen`, off.bottom <= 0, JSON.stringify(off));
      } else t.check(`${name}: too short to scroll here (the button check needs a tall screen)`, true, 'max scroll ' + max);
    }
    t.check('no page errors (the account button)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
    // the narrowest phone: the two screens this work redrew, a long name and a long day name beside the button
    const long = prog(LONG); long.athlete = Object.assign({}, long.athlete, { firstName: 'Alexandrina-Maria', lastName: 'Rivera-Constantinopoulos' });
    const n = await H.openProgram(browser, { prog: long, seed: SEED_NUMBERS, w: 320, h: 568 });
    for (const [name, go] of [['Home', "goTo('home')"], ['Progress', "goTo('plan')"]]) {
      await n.p.evaluate(go); await n.p.waitForTimeout(500);
      const o = await n.p.evaluate(OVERLAP);
      t.check(`320 px, a long name: the initials button overlaps no text at the top of ${name}`, !o.hidden && o.hits.length === 0, JSON.stringify(o));
    }
    await n.ctx.close();
  }

  // ── 7. one gutter: the left edges on Home and Progress are one line (16 px under 360, else 20) ──
  for (const w of [320, 375, 390]) {
    const want = w < 360 ? 16 : 20;
    const cyc = prog();
    const cur = cyc.cycles[cyc.currentCycleIndex];
    cur.weekNotes = { [String(1 + Math.floor(10 / 7))]: { text: 'Hold the load. Everything stays at RPE 7 this week.', rpeCap: 7 } };   // the fixture's cycle is in week 2
    const { ctx, p } = await H.openProgram(browser, { prog: cyc, w, h: w === 320 ? 568 : 844, seed: Object.assign({ _hab_card: hab('togo'),
      _autofiled: [{ on: day(1), day: '1', done: 3, total: 9, at: Date.now() }] }, SEED_NUMBERS) });
    const e = await p.evaluate(() => {
      const left = (sel, text) => { const el = document.querySelector(sel); if (!el) return null; if (!text) return Math.round(el.getBoundingClientRect().left * 10) / 10;
        const n = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: x => x.textContent.trim() ? 1 : 3 }).nextNode(); const r = document.createRange(); r.selectNodeContents(n); return Math.round(r.getClientRects()[0].left * 10) / 10; };
      const off = document.getElementById('home-offline'); off.hidden = false; off.textContent = 'Saved plan';
      document.getElementById('home-sugg-wrap').innerHTML = '<div class="lib-sugg">Extra</div>';
      document.getElementById('home-proof-strip').classList.remove('off');   // the strip is hidden until AA Proof says it is ready: show it to measure it
      return { greeting: null, name: left('.home-greet > span:last-child', true), offline: left('#home-offline'), unfinished: left('.uf-card'), thisWeek: left('.wn-kick .wn-name', true) || left('.home-section-title', true),
        note: left('.wn'), hero: left('.dc-hero'), rows: left('.dc-row'), rowNum: left('.dc-row .dc-num', true), sugg: left('#home-sugg-wrap .lib-sugg'), habits: left('#home-habits-wrap .hrow'), proof: left('#home-proof-strip') };
    });
    // the greeting's eyebrow starts after its 7 px dot and 8 px gap: its box, not the text, is the gutter
    const gb = await p.evaluate(() => { const g = document.querySelector('.home-greet'); return Math.round((g.getBoundingClientRect().left + parseFloat(getComputedStyle(g).paddingLeft)) * 10) / 10; });
    const homeEdges = Object.entries(Object.assign({}, e, { greeting: gb })).filter(([k, v]) => v != null && k !== 'name');
    t.check(`Home ${w}: the greeting, offline line, unfinished card, This Week, the week note, Next up, the rows, the extra, the habits row and the Proof strip start at ${want} px`,
      homeEdges.length >= 10 && homeEdges.every(([k, v]) => Math.abs(v - want) <= 0.6), JSON.stringify(homeEdges));
    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(600);
    const q = await p.evaluate(() => {
      const left = (sel, text) => { const el = document.querySelector(sel); if (!el) return null; if (!text) return Math.round(el.getBoundingClientRect().left * 10) / 10;
        const n = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: x => x.textContent.trim() ? 1 : 3 }).nextNode(); const r = document.createRange(); r.selectNodeContents(n); return Math.round(r.getClientRects()[0].left * 10) / 10; };
      const sec = document.querySelector('#cycle-meter-wrap .prog-sec'), numbers = document.getElementById('numbers-title');
      const pad = el => Math.round((el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft)) * 10) / 10;
      return { title: left('.prog-title', true), badge: left('.sport-badge'), dates: left('.athlete-card-dates', true), card: left('.cyc-card'), numbers: pad(numbers), ceiling: left('#ceiling-row-wrap .hrow'), weight: left('#weight-row-wrap .hrow'),
        plan: pad(sec), meter: left('.cycle-meter'), cycleCard: left('#current-message-wrap .current-message'), why: left('.why-plan-btn') };
    });
    const prEdges = Object.entries(q).filter(([k, v]) => v != null);
    // the title's glyph has a side bearing: allow 3 px for the 44 px capitals
    t.check(`Progress ${w}: the header, the card, both section titles, the number rows, the meter and the cycle cards start at ${want} px`,
      prEdges.length >= 9 && prEdges.every(([k, v]) => Math.abs(v - want) <= (k === 'title' ? 3 : 0.6)), JSON.stringify(prEdges));
    t.check(`gutter ${w}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 8. no sideways scroll, light and dark, on Home, Progress, Records and Body weight ──
  for (const [w, dark] of [[320, false], [375, false], [390, false], [320, true], [375, true], [390, true]]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(LONG), w, h: w === 320 ? 568 : 844, dark, seed: Object.assign({ _hab_card: hab('togo') }, SEED_NUMBERS) });
    const out = {};
    for (const [name, go] of [['Home', "goTo('home')"], ['Progress', "goTo('plan')"], ['Records', "goTo('ceiling')"], ['Body weight', "goTo('weight')"]]) {
      await p.evaluate(go); await p.waitForTimeout(450);
      out[name] = await sideways(p);
    }
    t.check(`${w}${dark ? ' dark' : ''}: no sideways scroll on Home, Progress, Records and Body weight`, Object.values(out).every(v => v <= 0), JSON.stringify(out));
    t.check(`${w}${dark ? ' dark' : ''}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 9. Records and Body weight: the Progress tab stays lit, ← lands on Progress (also by the phone's Back), a Records page opened from an exercise goes back to that exercise ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), seed: SEED_NUMBERS });
    // the count-up: a new best is shown by counting up on arrival, never unseen at boot
    const seen = await p.evaluate(() => localStorage.getItem(ATHLETE_ID + '_1rm_seen'));
    t.check('Records row: nothing was counted unseen at boot (the seen number is still unset)', seen === null, seen);
    await p.evaluate(() => { localStorage.setItem(ATHLETE_ID + '_1rm_seen', '90'); goTo('plan'); });
    await p.waitForTimeout(1300);
    const cu = await p.evaluate(() => ({ seen: localStorage.getItem(ATHLETE_ID + '_1rm_seen'), shown: document.querySelector('#ceiling-row-wrap .hrow-n').textContent }));
    t.check('Records row: arriving on Progress counts up to the new best and records it', cu.seen === '104' && cu.shown === '104', JSON.stringify(cu));

    await p.click('#ceiling-row-wrap .hrow');
    await p.waitForTimeout(400);
    t.check('the Records row opens Personal Records', (await active(p)) === 'screen-ceiling', await active(p));
    t.check('Records: the Progress tab stays lit', (await lit(p)) === 'plan', await lit(p));
    await p.click('#screen-ceiling .nav-back');
    await p.waitForTimeout(400);
    t.check('Records: ← lands on Progress, with the Progress tab lit', (await active(p)) === 'screen-plan' && (await lit(p)) === 'plan', (await active(p)) + ' ' + (await lit(p)));

    await p.click('#weight-row-wrap .hrow');
    await p.waitForTimeout(400);
    const wk = await p.evaluate(() => ({ screen: document.querySelector('.screen.active').id, back: document.querySelector('#screen-weight .nav-back').getAttribute('aria-label'), onclick: document.querySelector('#screen-weight .nav-back').getAttribute('onclick') }));
    t.check('the Body weight row opens Body Weight, whose ← says Back to Progress', wk.screen === 'screen-weight' && wk.back === 'Back to Progress' && wk.onclick === "goTo('plan')", JSON.stringify(wk));
    t.check('Body weight: the Progress tab stays lit', (await lit(p)) === 'plan', await lit(p));
    await p.click('#screen-weight .nav-back');
    await p.waitForTimeout(400);
    t.check('Body weight: ← lands on Progress', (await active(p)) === 'screen-plan' && (await lit(p)) === 'plan', await active(p));

    // the phone's Back (NAV-01) closes Records and Body weight through their own ←, then leaves Progress for Home
    await p.evaluate(() => goTo('ceiling')); await p.waitForTimeout(300);
    await p.goBack(); await p.waitForTimeout(500);
    t.check('the phone\'s Back from Records lands on Progress', (await active(p)) === 'screen-plan', await active(p));
    await p.evaluate(() => goTo('weight')); await p.waitForTimeout(300);
    await p.goBack(); await p.waitForTimeout(500);
    t.check('the phone\'s Back from Body weight lands on Progress', (await active(p)) === 'screen-plan', await active(p));

    // a weight logged on Body weight shows on Progress's row at once
    await p.evaluate(() => { goTo('weight'); document.getElementById('wt-input').value = '78.5'; logWeightToday(); goTo('plan'); });
    await p.waitForTimeout(300);
    t.check('a weight logged on Body weight is on Progress\'s row', await p.evaluate(() => /78\.5\s*kg/.test(document.querySelector('#weight-row-wrap').innerText)));

    // Records opened from an exercise's History goes back to that exercise (two ←: out of the lift, then out of Records)
    await p.evaluate(() => { goTo('home'); openDayView('1'); });
    await p.waitForTimeout(400);
    await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; if (c.classList.contains('collapsed')) toggleExpand(c); openHistorySheet(c); })()`);
    await p.waitForTimeout(400);
    const hasLink = await p.$('#hs-rec');
    t.check('the exercise\'s History offers "Open in Personal Records"', !!hasLink);
    if (hasLink) {
      await p.click('#hs-rec');
      await p.waitForTimeout(400);
      t.check('...it opens that lift on the Records screen, the Progress tab lit', (await active(p)) === 'screen-ceiling' && (await lit(p)) === 'plan', (await active(p)) + ' ' + (await lit(p)));
      for (let i = 0; i < 3 && (await active(p)) === 'screen-ceiling'; i++) { await p.click('#screen-ceiling .nav-back'); await p.waitForTimeout(500); }
      const back = await p.evaluate(() => ({ screen: document.querySelector('.screen.active').id, dayOpen: !document.getElementById('day-view').hidden,
        card: !!document.querySelector('#day-view .checklist-item:not(.collapsed) .item-name') && document.querySelector('#day-view .checklist-item:not(.collapsed) .item-name').textContent.trim() }));
      t.check('...and ← brings the athlete back to the squat card in Day 1, not to Progress', back.screen === 'screen-home' && back.dayOpen && back.card === 'Barbell Back Squat', JSON.stringify(back));
    }
    t.check('no page errors (Records and Body weight)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
