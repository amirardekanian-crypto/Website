// Home and Progress in the Centre Court look (Amir, 2026-10-12): the tab bar (Home · Progress · Library · Coach), Progress (header, This cycle
// card, Your numbers, the Game Plan), Home (This Week, Next up as one card, the other days as rows, the habits door row), the one door-row look,
// the one gutter, the account button that scrolls away with its screen, and Records and Body weight going back to Progress. Serve the repo first
// (python -m http.server 8765 --bind 127.0.0.1, see lib.js), then: node scripts/headless/home-progress.js [--out <dir>]
// Career Mode round 5 (the light screens): "Records and body" is a title only when the career is on (Your numbers, Your moments, Records and body, Game Plan,
// in that order; without the career the two rows sit straight under Your numbers), the Career row carries Hold Serve's line, and the Daily habits row goes
// once AA Proof's embedded strip says it is ready (paintHabitsCard()). Every scenario that reads the habits row blocks the strip's frame (habits.html?embed=1)
// so the row stays as the seeded snapshot draws it; one scenario lets the strip load and checks the row goes.
'use strict';
const path = require('path');
const fs = require('fs');
const H = require('./lib');
const R = require('./career');

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

// A browser whose pages cannot load AA Proof's embedded strip (the iframe on Home, habits.html?embed=1): the strip publishes its own habit snapshot and, once it is
// ready, takes the Daily habits row away. The route is added after the harness's own, so it answers first (career.js's atBaseline() does the same).
function noStrip(browser) {
  return { newContext: async (...a) => {
    const ctx = await browser.newContext(...a);
    const np = ctx.newPage.bind(ctx);
    ctx.newPage = async () => {
      await ctx.route(u => u.pathname === '/habits.html' && u.searchParams.get('embed') === '1', r => r.abort());
      return np();
    };
    return ctx;
  } };
}

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const real = await H.launch();       // the strip loads in pages opened on this one
  const browser = noStrip(real);       // …and not in these
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
      const sec = [...document.querySelectorAll('#screen-plan .prog-sec')].filter(e => !e.hidden && getComputedStyle(e).display !== 'none').map(e => e.textContent.trim());
      const gp = document.querySelector('#road-wrap .prog-sec');
      const card = document.querySelector('#cycle-card-wrap .cyc-card');
      return { eyebrow: eyebrow && eyebrow.textContent.trim(), title: title && title.textContent.trim(), titleTag: title && title.tagName, titleSize: title && getComputedStyle(title).fontSize,
        badge: !!document.querySelector('#athlete-card-wrap .sport-badge'), dates: (document.querySelector('#athlete-card-wrap .athlete-card-dates') || {}).textContent || null,
        coverDates: (document.querySelector('#cycle-card-wrap .cyc-dates') || {}).textContent || null,
        old: !!document.querySelector('#screen-plan .home-name'),
        y: { title: top('.prog-title'), badge: top('.sport-badge'), card: top('.cyc-card'), numbers: top('#numbers-title'), ceil: top('#ceiling-row-wrap .hrow'),
             weight: top('#weight-row-wrap .hrow'), plan: gp ? Math.round(gp.getBoundingClientRect().top + scrollY) : null, road: top('.road') },
        sec, career: !!document.querySelector('#career-card-wrap .cs-card, #career-moments-wrap .hrow'),
        card: card && { tag: card.tagName, onclick: card.getAttribute('onclick'), arrow: !!card.querySelector('.cyc-top i'), text: card.innerText },
        gp: gp && { size: getComputedStyle(gp).fontSize, caps: getComputedStyle(gp).textTransform, color: getComputedStyle(gp).color, spacing: getComputedStyle(gp).letterSpacing } };
    });
    t.check('Progress header: the name as the eyebrow, "Progress" as a 44 px title, no big two-line name',
      o.eyebrow === 'Alex Rivera' && o.title === 'Progress' && o.titleTag === 'H1' && o.titleSize === '44px' && !o.old, JSON.stringify([o.eyebrow, o.title, o.titleSize, o.old]));
    // The dates moved onto the This cycle cover (2026-10-13): the header keeps the eyebrow, the title and the sport badge, and the cover's mono line carries the dates.
    t.check('Progress header: the sport badge stays under the title, and the header has no dates line (the cover has them)', o.badge && o.dates === null && o.y.title < o.y.badge && /\d/.test(o.coverDates || ''), JSON.stringify([o.y, o.dates, o.coverDates]));
    const y = o.y;
    // Without the career "Your numbers" has nothing under it and is not drawn (Love All B20), so Records stand straight under the card.
    t.check('Progress order: header, This cycle card, Records, Body weight, then the Game Plan and its road',
      y.badge < y.card && y.card < y.ceil && y.ceil < y.weight && y.weight < y.plan && y.plan < y.road, JSON.stringify(y));
    // THE SCOREBOARD (2026-10-19): two titles on the whole tab. Without the career (the demo's way: no profile) there is no career
    // card and no Achievements or Your moments door either; Records and Body weight stand on their own under Your numbers.
    t.check('Progress: its three section titles (Getting stronger, Your body, Game Plan), no empty Your numbers, and no career card or career doors without the career',
      o.sec.join('|') === 'Getting stronger|Your body|Game Plan' && !o.career, JSON.stringify([o.sec, o.career]));
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

  // ── 1b. the career on (round 5): Progress = header, This cycle, Your numbers (the career's card, the month's goal, Your moments, Records and body), the Game Plan ──
  {
    const prof = R.rwProfile(10000);
    const first = new Date(), month = first.getFullYear() + '-' + String(first.getMonth() + 1).padStart(2, '0') + '-01';
    const prev = new Date(first.getFullYear(), first.getMonth() - 1, 1), pm = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0') + '-01';
    // get_my_moments() as stage77 answers it; an honour's value is the jsonb stage75 stores ({n}, {lift, pct}, {weeks})
    const myMoments = { athlete_id: H.ID, goal: { month, line: 'Four sessions a week, no gaps.', done_at: null }, goals: [],
      notes: [{ day: day(3), line: 'Your squat looked sharp on Tuesday.', award_id: null, read: true }], saw: ['achievement:first_best'],
      honours: [{ month: pm, honour: 'sessions', value: { n: 14 } }, { month: pm, honour: 'improved', value: { lift: 'Barbell Back Squat', pct: 27.1 } }] };
    // the habits are set up here too: the level lives in the habit card's ring since 2026-10-20, and with no card there is no ring
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), stub: { tables: { career_rules: R.RW_RULES, career_facts: [] }, profile: prof, awards: R.rwShelf(prof), myMoments },
      seed: Object.assign({ _hab_cfg: { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() } }, SEED_NUMBERS) });
    await p.waitForFunction(() => { const e = document.querySelector('#home-overview .today-mid span'); return !!e && e.textContent === 'Level'; }, null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(400);
    const home = await p.evaluate(() => ({ rows: [...document.querySelectorAll('#home-overview .hrow')].map(r => r.querySelector('.hrow-l').textContent.trim()),
      hold: document.getElementById('home-hold-wrap').innerHTML.trim(), career: document.getElementById('home-career-wrap').innerHTML.trim(),
      level: (document.querySelector('#home-overview .today-mid b') || {}).textContent, kick: (document.querySelector('#home-overview .today-mid span') || {}).textContent,
      week: (document.getElementById('home-week-sum') || {}).textContent }));
    // 2026-10-20 (Amir: "i think the career row is redundant, it just shows level when we can see level 10 times"): Home has no
    // Career row and no Hold Serve row. The level is in the habit card's ring, and the weeks held in a row sit beside the
    // week's own count under This Week, where the week already is.
    t.check('Home with the career: no Career row, no Hold Serve row, no door row at all',
      home.rows.join() === '' && home.hold === '' && home.career === '', JSON.stringify(home));
    t.check('Home with the career: the level is in the habit card\'s ring', home.level === '11' && home.kick === 'Level', JSON.stringify([home.level, home.kick]));
    // (no career_facts in this fixture, so there is no run to sit beside the count: hold-serve.js owns that check)
    t.check('Home with the career: the week\'s count says only the week when there is no run', /sessions? done this week$/.test((home.week || '').trim()), home.week);
    await p.evaluate(() => goTo('plan'));
    await p.waitForFunction(() => !!document.querySelector('#career-moments-wrap .hrow'), null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(400);
    const o = await p.evaluate(() => {
      const y = sel => { const e = document.querySelector('#screen-plan ' + sel); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
      return { sec: [...document.querySelectorAll('#screen-plan .prog-sec')].filter(e => !e.hidden && getComputedStyle(e).display !== 'none').map(e => e.textContent.replace(/\s+/g, ' ').trim()),
        y: { card: y('.cyc-card'), goal: y('.goal-card'), numbers: y('#numbers-title'), career: y('.cs-card'), ceil: y('#ceiling-row-wrap .hrow'), weight: y('#weight-row-wrap .hrow'),
             hab: y('#habits-block-wrap .hrow'), ach: y('#career-courts-wrap .hrow'), moments: y('#career-moments-wrap .hrow'), plan: y('#road-wrap .prog-sec') },
        doors: ['#ceiling-row-wrap', '#weight-row-wrap', '#habits-block-wrap', '#career-courts-wrap', '#career-moments-wrap']
          .map(w => { const l = document.querySelector(w + ' .hrow .hrow-l'); return l ? l.textContent.trim() : null; }).filter(Boolean),
        goal: (document.querySelector('.goal-card') || {}).innerText };
    });
    // 2 marks (4 and 8 weeks held), the achievement, Amir's line and two honours
    t.check('Progress with the career: five section titles, each naming a different subject (2026-10-20)',
      o.sec.join('|') === "Your numbers|Getting stronger|Your body|What you've earned|Game Plan", o.sec.join('|'));
    // This athlete has no habit config and no get_achievements answer, so those two doors are not drawn: the order is what is there.
    t.check('Progress with the career: the doors in order under the card, the training\'s own first (Personal records, Body weight, Daily habits, then Your moments)',
      o.doors.join('|') === 'Personal records|Body weight|Daily habits|Your moments', o.doors.join('|'));
    const y = o.y;
    t.check('Progress with the career, in order: This cycle, the month\'s goal, Your numbers, the card, the doors, the Game Plan',
      y.card < y.goal && y.goal < y.numbers && y.numbers < y.career && y.career < y.ceil && y.ceil < y.weight && y.weight < y.moments && y.moments < y.plan, JSON.stringify(y));
    t.check('…the goal is Amir\'s line for this month', /· from Amir/i.test(o.goal || '') && /Four sessions a week, no gaps\./.test(o.goal || ''), o.goal);
    t.check('no page errors (Progress with the career)', p.errs.length === 0, p.errs.join(' | '));
    await shot(p, 'progress-career');
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
    t.check('Home: no Records or Body weight row (they are on Progress), no Daily habits row (it is Today\u2019s card), and none of the old wrappers',
      h.hrows.length === 0 && !h.text && h.ids.length === 0, JSON.stringify([h.hrows, h.text, h.ids]));
    t.check('Home: exactly one .day-ov-card, the Next up card (.dc-hero, data-dc, role button)',
      h.cards === 1 && /\bdc-hero\b/.test(h.hero.cls) && h.hero.role === 'button' && h.hero.tab === '0' && !!h.hero.dc && h.hero.click === `openDayView('${h.hero.dc}')`, JSON.stringify(h.hero));
    t.check('Home: every other day is a .dc-row with data-dl and no data-dc, in .dc-list', h.list && h.rows.length === h.days - 1 && h.rows.every(r => r.dl && !r.dc && r.role === 'button' && r.dl !== h.hero.dc), JSON.stringify(h.rows));
    t.check('Home: the fixture has Day 1 done this week, so Next up is Day 2 and Day 1 is a done row', h.hero.dc === '2' && h.rows[0].dl === '1' && h.rows[0].done && /done this week/.test(h.rows[0].label), JSON.stringify([h.hero.dc, h.rows]));
    t.check('Home: order is the greeting, This Week, the days, then Today’s card', /home-greeting-wrap.*home-offline.*home-unfinished-wrap.*home-week-wrap.*day-cards-wrap.*home-sugg-wrap.*home-today-wrap/.test(h.order), h.order);

    const g = await p.evaluate(() => {
      const gh = [...APP_GUIDE].find(c => c.title === 'Getting around'), st = [...APP_GUIDE].find(c => c.title === 'How your programme is structured'), rec = [...APP_GUIDE].find(c => /Personal Records/.test(c.title));
      const labels = (gh.body.match(/<li><strong>([^<]+)<\/strong>/g) || []).map(s => s.replace(/<[^>]+>/g, ''));
      return { labels, game: /<strong>Game Plan<\/strong> —/.test(gh.body), progress: /Progress<\/strong> is how it's going/.test(gh.body), home: /Home<\/strong> is your week/.test(gh.body),
        struct: /Game Plan<\/strong> explains/.test(st.body), structOk: /on <strong>Progress<\/strong>, in the Game Plan/.test(st.body) && /Tap <strong>Why this cycle matters<\/strong> for the rest of the note and <strong>Expected outcomes<\/strong>/.test(st.body), rec: /Open <strong>Progress<\/strong>/.test(rec.body) };
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
    // Daily habits was the third of these doors until AA Proof was retired into this app (2026-10-19): it is
    // Today's card now, and 5b holds it. The pair left is Personal records and Body weight, on Progress.
    const look = (p) => p.evaluate(`(() => { const f = ${rowLook.toString()}; goTo('plan');
      const c = document.querySelector('#ceiling-row-wrap .hrow'), w = document.querySelector('#weight-row-wrap .hrow'), card = document.getElementById('body-card');
      return { card: f(card), icons: [c, w].map(r => !!r.querySelector('.hrow-ic svg')).join(), quiet: [c, w].map(r => r.classList.contains('quiet')).join(),
        dark: [c, w, card].some(r => /rgb\\(18, 42, 34\\)/.test(getComputedStyle(r).backgroundColor)), dashed: [c, w, card].some(r => getComputedStyle(r).borderTopStyle === 'dashed'),
        hair: getComputedStyle(w).borderTopWidth, bare: [c, w].map(r => getComputedStyle(r).borderLeftWidth).join(),
        minH: [Math.round(c.getBoundingClientRect().height), Math.round(w.getBoundingClientRect().height)].join() }; })()`);
    const bare = await H.openProgram(browser, { prog: prog() });
    const a = await look(bare.p);
    await bare.ctx.close();
    const full = await H.openProgram(browser, { prog: prog(), seed: SEED_NUMBERS });
    const b = await look(full.p);
    await full.ctx.close();
    // Your body (2026-10-20): the CARD is the white box with the 1 px edge and the 12 px corners; its rows are rows, divided
    // by one hairline, with no edge of their own. Without data they still say what they are, quietly, with their icon.
    t.check('Your body without data: the rows are quiet, with an icon, divided by a hairline inside one white card rounded 12, 64 px at least, never dark green, never dashed',
      a.quiet === 'true,true' && a.icons === 'true,true' && !a.dark && !a.dashed && a.bare === '0px,0px' && a.hair === '1px'
      && /^rgb\(255, 255, 255\)\|1px\|solid\|.*\|12px\|.*\|block$/.test(a.card) && a.minH.split(',').every(n => +n >= 64), JSON.stringify(a));
    t.check('Your body with data: not quiet, the same card background, edge and corners as without data, never dark green, never dashed',
      b.quiet === 'false,false' && b.icons === 'true,true' && !b.dark && !b.dashed && b.card === a.card && b.hair === a.hair && b.bare === a.bare, JSON.stringify([a.card, b]));
    // dark: the card is #242424 on #181818 like the day's rows (its rows carry no background of their own since 2026-10-20)
    const d = await H.openProgram(browser, { prog: prog(), dark: true, seed: SEED_NUMBERS });
    const dk = await d.p.evaluate(() => { goTo('plan'); const card = document.getElementById('body-card'), c = getComputedStyle(card);
      return { row: c.backgroundColor, page: getComputedStyle(document.body).backgroundColor, edge: c.borderTopColor,
        inner: getComputedStyle(document.querySelector('#ceiling-row-wrap .hrow')).backgroundColor }; });
    t.check('dark: Your body is #242424 on #181818, and its rows add no background of their own',
      dk.row === 'rgb(36, 36, 36)' && dk.page === 'rgb(24, 24, 24)' && dk.inner === 'rgba(0, 0, 0, 0)', JSON.stringify(dk));
    await d.ctx.close();
  }

  // ── 5c. the door's NAME (Number First, Amir 2026-10-19: "the mono door labels"). The loudest thing in a door is whatever that
  //        door is for: a door that carries a figure keeps the figure and the name is a quiet green label; a door without one
  //        makes the name the headline, in the cycle card's fold-row recipe. ONE rule over all seven scopes. ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), w: 390, h: 844, seed: SEED_NUMBERS });
    const face = async (sel, screen) => p.evaluate(([s, scr]) => {
      if (scr) goTo(scr);
      const l = document.querySelector(s); if (!l) return null;
      const c = getComputedStyle(l);
      return { style: [c.fontFamily.split(',')[0].replace(/["']/g, ''), c.fontSize, c.fontWeight, c.letterSpacing, c.textTransform, c.color].join('|'), clipped: l.scrollWidth > l.clientWidth + 1 };
    }, [sel, screen]);
    const QUIET = 'Barlow|13px|600|normal|none|rgb(14, 74, 54)';      // a door that carries a figure: the green label
    const LOUD = 'Barlow|16px|600|normal|none|rgb(26, 26, 26)';        // every other door: the name as the headline
    await p.evaluate(() => goTo('home')); await p.waitForTimeout(350);
    await p.evaluate(() => goTo('plan')); await p.waitForTimeout(450);
    const records = await face('#ceiling-row-wrap .hrow-l'), weight = await face('#weight-row-wrap .hrow-l'), why = await face('.road-why-door .hrow-l');
    t.check('the door name: the doors that carry a figure (Personal records, Body weight) wear the quiet green label',
      [records, weight].every(x => x && x.style === QUIET && !x.clipped), JSON.stringify([records, weight]));
    t.check('the door name: a door with no figure (Why your plan looks like this) is the headline instead, in ink',
      !!why && why.style === LOUD && !why.clipped, JSON.stringify(why));
    // the defect the first draft had: at 13 px grey the name was the twin of the metadata beside the figure ("Back Squat · ▲ 12 KG")
    const twin = await p.evaluate(() => { const l = document.querySelector('#ceiling-row-wrap .hrow-l'), s = document.querySelector('#ceiling-row-wrap .hrow-v small');
      const f = e => { const c = getComputedStyle(e); return [c.fontSize, c.fontWeight, c.color].join('|'); };
      return s ? { name: f(l), meta: f(s) } : null; });
    t.check('the door name: it is never the twin of the metadata beside the figure (same size, but green and heavier)',
      !!twin && twin.name !== twin.meta && /rgb\(14, 74, 54\)/.test(twin.name) && /rgb\(92, 92, 92\)/.test(twin.meta), JSON.stringify(twin));
    // every other scope follows the same one rule
    const others = {};
    for (const [screen, sel, want] of [['ceiling', '#ceil-body .hrow-l', LOUD], ['notes', '#screen-notes .hrow-l', LOUD]]) {
      await p.evaluate(s => goTo(s), screen); await p.waitForTimeout(450);
      others[screen] = await face(sel);
      t.check(`the door name: the ${screen} screen's door follows the same rule (no figure, so the headline)`, !!others[screen] && others[screen].style === want && !others[screen].clipped, JSON.stringify(others[screen]));
    }
    t.check('no page errors (the door name)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
    // the narrowest phone: the label used to wrap to two tracked lines and a media query existed only to stop it
    const n = await H.openProgram(browser, { prog: prog(), w: 320, h: 568, seed: SEED_NUMBERS });
    await n.p.evaluate(() => goTo('plan')); await n.p.waitForTimeout(450);
    const narrow = await n.p.evaluate(() => { const l = document.querySelector('.road-why-door .hrow-l'), sp = document.querySelector('#ceiling-row-wrap .nc-spark');
      return { lines: Math.round(l.getBoundingClientRect().height / parseFloat(getComputedStyle(l).lineHeight)), clipped: l.scrollWidth > l.clientWidth + 1,
        spark: sp && Math.round(sp.getBoundingClientRect().width), side: document.documentElement.scrollWidth - window.innerWidth }; });
    t.check('the door name at 320: "Why your plan looks like this" is ONE line (it was two tracked ones), the sparkline keeps its full 60 px, nothing clipped or sideways',
      narrow.lines === 1 && !narrow.clipped && narrow.spark === 60 && narrow.side <= 0, JSON.stringify(narrow));
    await n.ctx.close();
    // ONE rule, not seven copies: the sheet must declare the door's name once, and that declaration must name every scope that has a door
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'program.html'), 'utf8');
    // every rule that SETS THE FACE of a door's name: its selector (back to the line start) plus its declarations, which may wrap a line
    const decls = (src.match(/^[^\n]*\.hrow-l \{[\s\S]*?\}/gm) || []).filter(d => /font:/.test(d));
    const shared = decls.filter(d => /#home-overview/.test(d) && /#screen-plan/.test(d) && !/hrow-vv/.test(d));
    const scopes = ['#home-overview', '#screen-plan', '#screen-ceiling', '#screen-notes', '#hist-overlay', '#ar-body', '#day-view .complete-crew'];
    t.check('the door name: ONE shared declaration naming all seven scopes, and no scope keeps a copy of its own (the exceptions are .from-amir and the figure branch)',
      shared.length === 1 && scopes.every(s => shared[0].indexOf(s) > -1) && decls.length === 3 && decls.filter(d => /from-amir/.test(d)).length === 1 && decls.filter(d => /hrow-vv/.test(d)).length === 1,
      decls.length + ' declarations: ' + decls.map(d => d.trim().slice(0, 70)).join(' || '));
    t.check('the door name: no scope still sets it in Space Mono', !/\.hrow-l \{[^}]*Space Mono/.test(src), (src.match(/\.hrow-l \{[^}]*Space Mono[^}]*\}/g) || []).join(' | '));
  }

  // ── 5b. TODAY: the day as one card (2026-10-19, direction B). AA Proof was retired into this app, so the Daily habits door row
  //        and the iframe of AA Proof under it are gone; the session and the habits are one list, logged here. ──
  {
    const CFG_ON = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
    const card = () => ({
      head: (document.querySelector('.today-card .today-k') || {}).textContent || '',
      verdict: (document.querySelector('.today-card .today-v') || {}).textContent,
      vcolor: (() => { const e = document.querySelector('.today-card .today-v'); return e ? getComputedStyle(e).color : ''; })(),
      rows: [...document.querySelectorAll('.today-card .hb-name')].map(n => n.textContent),
      days: [...document.querySelectorAll('.today-card .hb-day')].map(n => n.textContent.trim()),
      sub: (document.querySelector('.today-card .today-s') || {}).textContent,
      marks: [...document.querySelectorAll('.today-card .hb-row')].map(m => m.classList.contains('is-done')).join(),
      // THE RING (2026-10-20): a segment per habit on the roster, the done ones drawn over them, the level in the middle.
      segs: document.querySelectorAll('.today-card .tr-seg').length,
      on: document.querySelectorAll('.today-card .tr-on').length,
      mid: (document.querySelector('.today-card .today-mid b') || {}).textContent,
      kick: (document.querySelector('.today-card .today-mid span') || {}).textContent,
      ringSay: (document.querySelector('.today-card .today-ring') || {}).getAttribute && document.querySelector('.today-card .today-ring').getAttribute('aria-label'),
      bars: document.querySelectorAll('.today-card .hb-bar').length,            // one segmented meter per COUNTED habit, back with the icons (2026-10-20)
      go: !!document.querySelector('.today-card .today-go'),                    // the way to the habits page, which Home had none
      gone: !document.getElementById('home-habits-wrap') && !document.getElementById('home-proof-strip'),   // the row and the iframe both went with AA Proof
    });

    // Nobody has set the habits up: the first screen, which is the only place either app says what is tracked
    // before it starts scoring it.
    const fresh = await H.openProgram(browser, { prog: prog() });
    const start = await fresh.p.evaluate(() => ({
      head: (document.querySelector('.today-start .today-k') || {}).textContent,
      five: [...document.querySelectorAll('.today-start .hs-five b')].map(b => b.textContent),
      go: (document.querySelector('.today-start .hs-go') || {}).textContent,
      noRows: !document.querySelector('.today-card .hb-row'),
    }));
    t.check('never set up: the first screen names the five and nothing is scored yet',
      start.head === 'The other 23 hours' && start.five.length === 5 && start.five[0] === 'Finish your session'
      && start.go === 'Start tracking' && start.noRows, JSON.stringify(start));
    await fresh.p.click('.hs-go');
    await fresh.p.waitForTimeout(250);
    const after = await fresh.p.evaluate(card);
    t.check('Start tracking: the card is the five habits, the four days you may still fill in, and the state',
      after.head === '' && after.rows.length === 5 && after.days.length === 4 && after.days[3] === 'Today'
      && after.verdict === '5 left' && after.gone, JSON.stringify(after));
    t.check('Start tracking: the ring has a segment per habit, none of them filled, and a › to the habits page',
      after.segs === 5 && after.on === 0 && after.bars === 4 && after.go && after.ringSay === '0 of 5 done today', JSON.stringify([after.segs, after.on, after.bars, after.go, after.ringSay]));
    t.check('the config it wrote is AA Proof\'s own key, so no history moves',
      await fresh.p.evaluate(() => !!JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_cfg') || '{}').onboarded));
    await fresh.ctx.close();

    // Logging: a tick, a +, and a number row. Every one of them writes <id>_hab_log and nothing else.
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), seed: { _hab_cfg: CFG_ON } });

    // ── − and + on a counted habit (2026-10-20, Amir: "i need to have proper buttons to add to sleep and reduce it") ──
    // Before this there was a + and no way back but typing the number: four taps to undo one.
    const stepper = () => p.evaluate(() => {
      const row = id => document.querySelector('.hb-wrap[data-h="' + id + '"]');
      const of = id => { const r = row(id); const b = [...r.querySelectorAll('.hb-step')];
        return { now: (r.querySelector('.hb-now') || {}).textContent, off: b.map(x => x.disabled), n: b.length }; };
      return { sleep: of('sleep'), steps: of('steps'), session: row('strength').querySelectorAll('.hb-step').length,
               val: id => 0, sleepV: AAHabits.valOf(AAHabits.AKEY(), 'sleep') };
    });
    const tap = (id, d) => p.evaluate(([i, dd]) => document.querySelector('.hb-wrap[data-h="' + i + '"] .hb-step[data-d="' + dd + '"]').click(), [id, d]);
    const s0 = await stepper();
    t.check('every counted habit has a − and a +, with the number between them, and the session habit has neither',
      s0.sleep.n === 2 && s0.steps.n === 2 && s0.session === 0 && s0.sleep.now === '0.0' && s0.steps.now === '0', JSON.stringify(s0));
    t.check('nothing logged yet: the − is off, the + is on', JSON.stringify(s0.sleep.off) === '[true,false]', JSON.stringify(s0.sleep.off));
    await tap('sleep', '1'); await tap('sleep', '1'); await p.waitForTimeout(150);
    const up = await stepper();
    t.check('the + steps by the habit\'s own step, not by one (sleep: half an hour a tap)', up.sleepV === 1 && up.sleep.now === '1.0', JSON.stringify([up.sleepV, up.sleep.now]));
    await tap('sleep', '-1'); await p.waitForTimeout(150);
    const down = await stepper();
    t.check('the − takes the same step back off', down.sleepV === 0.5 && JSON.stringify(down.sleep.off) === '[false,false]', JSON.stringify([down.sleepV, down.sleep.off]));
    await tap('sleep', '-1'); await p.waitForTimeout(150);
    t.check('it stops at nothing, and says so', await p.evaluate(() => AAHabits.valOf(AAHabits.AKEY(), 'sleep')) === 0
      && (await stepper()).sleep.off[0] === true);
    // Holding it repeats, faster the longer it is held, and the XP pop adds the whole hold up instead of flashing every step.
    const box = await p.evaluate(() => { const b = document.querySelector('.hb-wrap[data-h="steps"] .hb-step[data-d="1"]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
    await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.waitForTimeout(1500); await p.mouse.up();
    await p.waitForTimeout(250);
    const held = await p.evaluate(() => AAHabits.valOf(AAHabits.AKEY(), 'steps'));
    t.check('holding the + repeats: a second and a half of it is thousands of steps, not 500', held >= 2500, held);
    t.check('the release stops it', held === (await p.evaluate(() => AAHabits.valOf(AAHabits.AKEY(), 'steps'))), held);
    // The daily cap (3 x the target) is the ceiling, and the + says so when it is reached.
    await p.evaluate(() => habSetVal('steps', 30000)); await p.waitForTimeout(150);
    const capped = await stepper();
    t.check('at the daily cap the + is off and the − is on', JSON.stringify(capped.steps.off) === '[false,true]', JSON.stringify(capped.steps.off));
    await p.evaluate(() => { habSetVal('steps', 0); habSetVal('sleep', 0); }); await p.waitForTimeout(150);

    await p.evaluate(() => habBump('water'));
    await p.evaluate(() => habTap('sleep'));
    await p.waitForTimeout(150);
    const numRow = await p.evaluate(() => { const i = document.getElementById('hab-num-sleep'); return i && { v: i.value, unit: i.parentElement.querySelector('span').textContent }; });
    t.check('a counted habit opens its number row, prefilled with the target (a full day is two taps)',
      !!numRow && numRow.v === '7.5' && numRow.unit === 'hours', JSON.stringify(numRow));
    await p.click('.hb-save');
    await p.waitForTimeout(200);
    const state = await p.evaluate(() => ({
      log: JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_log') || '{}'),
      marks: [...document.querySelectorAll('.today-card .hb-row')].map(m => m.classList.contains('is-done')).join(),
      verdict: (document.querySelector('.today-card .today-v') || {}).textContent,
      on: document.querySelectorAll('.today-card .tr-on').length,
    }));
    const today = Object.keys(state.log)[0];
    t.check('+ and the number row both land in <id>_hab_log, on today, and the card follows',
      state.log[today] && state.log[today].water === 1 && state.log[today].sleep === 7.5
      && state.marks === 'false,false,true,false,false' && state.verdict === '4 left' && state.on === 1, JSON.stringify(state));

    // The verdict's three words, and its two colours: "N to go" asks for something and stays clay; the other two are the good news.
    await p.evaluate(() => { const H2 = window.AAHabits, k = H2.TKEY(); habSetVal('steps', 10000); habSetVal('fuel', 3); habSetVal('water', 8); });
    await p.waitForTimeout(200);
    const on = await p.evaluate(card);
    await p.evaluate(() => habTickSession());
    await p.waitForTimeout(200);
    const perfect = await p.evaluate(card);
    // ⚠️ THE HEADLINE AND THE RING COUNT THE SAME THING (2026-10-20). The headline used to say what the gate still wanted
    // (dayToGo(): weighted, and a day counts with one missing), so a card showing four ticks of five said "On target" while the
    // open segment beside it said one was left. The headline is the habits left; the gate's own moment is "Today counts".
    t.check('the state: four of five is "Today counts" in green ink, all five is Perfect, and what is left was clay',
      on.verdict === 'Today counts' && on.vcolor === 'rgb(14, 74, 54)' && perfect.verdict === 'Perfect', JSON.stringify([on.verdict, on.vcolor, perfect.verdict]));
    t.check('the ring counts what the headline counts: four filled while one is left, five when it is perfect',
      on.on === 4 && on.segs === 5 && perfect.on === 5 && perfect.ringSay === '5 of 5 done today', JSON.stringify([on.on, perfect.on, perfect.ringSay]));
    t.check('a finished session ticks the session habit here, not through another app', perfect.marks === 'true,true,true,true,true', perfect.marks);
    t.check('the line under the state is the run, not a second copy of the state', /days? in a row/.test(perfect.sub), perfect.sub);

    // The backfill window: today and three days back, and the card says whose day it is.
    await p.evaluate(() => document.querySelectorAll('.today-card .hb-day')[1].click());
    await p.waitForTimeout(200);
    const past = await p.evaluate(() => ({
      head: (document.querySelector('.today-card .today-k') || {}).textContent,
      verdict: (document.querySelector('.today-card .today-v') || {}).textContent,
      clay: getComputedStyle(document.querySelector('.today-card')).borderTopColor,
      marks: [...document.querySelectorAll('.today-card .hb-row')].map(m => m.classList.contains('is-done')).join(),
    }));
    t.check('filling in an earlier day says so, takes the clay edge, and shows THAT day empty',
      /^Filling in /.test(past.head) && past.clay === 'rgb(199, 85, 47)' && past.marks === 'false,false,false,false,false', JSON.stringify(past));
    await p.evaluate(() => { const H2 = window.AAHabits; habSetVal('water', 8); });
    await p.waitForTimeout(150);
    const back = await p.evaluate(() => { const log = JSON.parse(localStorage.getItem(ATHLETE_ID + '_hab_log') || '{}'); const ks = Object.keys(log).sort(); return { days: ks.length, oldest: log[ks[0]] }; });
    t.check('…and it lands on that day, not on today', back.days === 2 && back.oldest.water === 8, JSON.stringify(back));
    await p.evaluate(() => document.querySelectorAll('.today-card .hb-day')[3].click());
    await p.waitForTimeout(150);
    t.check('no page errors (Today)', p.errs.length === 0, p.errs.join(' | '));
    await shot(p, 'home-today-card');
    await ctx.close();

    // Dark: the card is the day's rows, #242424 on #181818, and the verdict reads mint rather than the light green.
    const d = await H.openProgram(browser, { prog: prog(), dark: true, seed: { _hab_cfg: CFG_ON } });
    const dk = await d.p.evaluate(() => { const c = document.querySelector('.today-card'); const s = getComputedStyle(c);
      return { card: s.backgroundColor, page: getComputedStyle(document.body).backgroundColor, v: getComputedStyle(c.querySelector('.today-v')).color }; });
    t.check('dark: the card is #242424 on #181818 and the verdict is legible on it',
      dk.card === 'rgb(36, 36, 36)' && dk.page === 'rgb(24, 24, 24)' && dk.v !== dk.card, JSON.stringify(dk));
    await d.ctx.close();

    // The narrowest phone: nothing clipped and no sideways scroll, with the longest habit name on the roster.
    const n = await H.openProgram(browser, { prog: prog(), w: 320, h: 568, seed: { _hab_cfg: CFG_ON } });
    const nar = await n.p.evaluate(() => ({
      side: document.documentElement.scrollWidth - window.innerWidth,
      clipped: [...document.querySelectorAll('.today-card .hb-name')].some(e => e.scrollWidth > e.clientWidth + 1),
      tap: Math.min(...[...document.querySelectorAll('.today-card .hb-main')].map(b => Math.round(b.getBoundingClientRect().height))),
    }));
    t.check('at 320: nothing sideways, no name clipped, every row still a 48 px tap target',
      nar.side <= 0 && !nar.clipped && nar.tap >= 48, JSON.stringify(nar));
    await n.ctx.close();
  }

  // ── 6. the account button: absolute, off every screen's text at the top, gone when scrolled away ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), seed: SEED_NUMBERS, w: 390, h: 568 });
    const pos = await p.evaluate(() => { const b = document.getElementById('global-account'), c = getComputedStyle(b); return { position: c.position, top: c.top, right: c.right, op: b.offsetParent && b.offsetParent.tagName }; });
    t.check('the initials button is position: absolute, at the top right of the page', pos.position === 'absolute' && pos.top === '14px' && pos.right === '14px' && (pos.op === 'BODY' || pos.op === null), JSON.stringify(pos));
    const screens = [
      ['Home', () => goTo('home')], ['Progress', () => goTo('plan')], ['Coach', () => goTo('notes')],
      ['Library', () => goLibrary()], ['Library: Sessions', async () => { goLibrary(); await setLibPane('sessions'); }], ['Library: Playbook', async () => { goLibrary(); await setLibPane('playbook'); }],
      ['Library: Exercises', async () => { goLibrary(); await setLibPane('exercises'); }],
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
    const { ctx, p } = await H.openProgram(browser, { prog: cyc, w, h: w === 320 ? 568 : 844, seed: Object.assign({ _hab_cfg: { onboarded: true, updatedAt: Date.now() },
      _autofiled: [{ on: day(1), day: '1', done: 3, total: 9, at: Date.now() }] }, SEED_NUMBERS) });
    const e = await p.evaluate(() => {
      const left = (sel, text) => { const el = document.querySelector(sel); if (!el) return null; if (!text) return Math.round(el.getBoundingClientRect().left * 10) / 10;
        const n = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: x => x.textContent.trim() ? 1 : 3 }).nextNode(); const r = document.createRange(); r.selectNodeContents(n); return Math.round(r.getClientRects()[0].left * 10) / 10; };
      // the banners (offline line, filed-day card) are full width, white rows; their content starts at the gutter, inside their padding
      const padded = sel => { const el = document.querySelector(sel); if (!el) return null; return Math.round((el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft)) * 10) / 10; };
      const off = document.getElementById('home-offline'); off.hidden = false; off.textContent = 'Saved plan';
      document.getElementById('home-sugg-wrap').innerHTML = '<div class="lib-sugg">Extra</div>';
      return { greeting: null, name: left('.home-greet > span:last-child', true), offline: padded('#home-offline'), unfinished: padded('.uf-card'), thisWeek: left('.wn-kick .wn-name', true) || left('.home-section-title', true),
        note: left('.wn'), hero: left('.dc-hero'), rows: left('.dc-row'), rowNum: left('.dc-row .dc-num', true), sugg: left('#home-sugg-wrap .lib-sugg'), today: left('#home-today-wrap .today-card') };
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
      const sec = document.querySelector('#road-wrap .prog-sec'), numbers = document.getElementById('numbers-title');
      const pad = el => Math.round((el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft)) * 10) / 10;
      return { title: left('.prog-title', true), badge: left('.sport-badge'), card: left('.cyc-card'), numbers: pad(numbers), ceiling: left('#body-card'), weight: left('#body-card'),
        plan: pad(sec), road: left('.road'), row: left('.road-row'), nowRow: left('.road-row.is-now .road-head'), why: left('.road-why-door'), aims: left('.road-row.is-now .road-n', true), secText: left('.road-row.is-now .road-sec', true), aimText: left('.road-row.is-now .road-aim', true) };
    });
    const prEdges = Object.entries(q).filter(([k, v]) => v != null);
    // the title's glyph has a side bearing: allow 3 px for the 44 px capitals. The road's rows, the Now row's head and its door row start on the gutter; the aim numbers (1, 2) sit in
    // the numeral column of the aims, so they start there too (Doors, 2026-10-19); the section title inside a row starts on the gutter as well (its hairline runs to the edge), and the
    // aims' text sits on the card's one text edge, 38 px in (a 30 px numeral column and an 8 px gap).
    const inner = prEdges.filter(([k]) => k !== 'secText' && k !== 'aimText');
    t.check(`Progress ${w}: the header, the card, both section titles, the number rows, the road, its rows and the Why your plan row start at ${want} px`,
      inner.length >= 11 && inner.every(([k, v]) => Math.abs(v - want) <= (k === 'title' ? 3 : k === 'aims' ? 2 : 0.6)), JSON.stringify(prEdges));
    t.check(`Progress ${w}: the section title inside the Now row starts on the gutter (${want} px) and the aims' text on the card's text edge (${want} + 38 px)`,
      q.secText != null && Math.abs(q.secText - want) <= 1 && q.aimText != null && Math.abs(q.aimText - (want + 38)) <= 1, JSON.stringify(q));
    t.check(`gutter ${w}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 8. no sideways scroll, light and dark, on Home, Progress, Records and Body weight ──
  for (const [w, dark] of [[320, false], [375, false], [390, false], [320, true], [375, true], [390, true]]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(LONG), w, h: w === 320 ? 568 : 844, dark, seed: SEED_NUMBERS });
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
    t.check('the Body weight row opens Body Weight, whose ← says Back to Progress', wk.screen === 'screen-weight' && wk.back === 'Back to Progress' && wk.onclick === "subBack('weight')", JSON.stringify(wk));
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

  // ── 10. Getting stronger: the best lift's trend, from the same series the Records row draws (2026-10-20) ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), seed: SEED_NUMBERS });
    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(450);
    const tr = await p.evaluate(() => {
      const c = document.querySelector('#trend-wrap .tr-card'), head = document.getElementById('trend-title');
      return c ? { title: head && !head.hidden && head.textContent.trim(), name: c.querySelector('.tr-n').textContent.trim(), v: c.querySelector('.tr-v').textContent.trim(),
        pts: c.querySelectorAll('.tr-pt').length + c.querySelectorAll('.tr-dot').length, foot: [...c.querySelectorAll('.tr-f span')].map(e => e.textContent.trim()),
        line: !!c.querySelector('.tr-line'), aria: c.getAttribute('aria-label'), caps: /KG|LB/.test(c.innerText) } : null;
    });
    // The seed is three squat estimates: 92 kg, 98 kg, 104 kg.
    t.check('Getting stronger: the best lift, its gain, one point per reading and the period under it',
      !!tr && tr.title === 'Getting stronger' && tr.name === 'Back Squat' && tr.v === '\u25b2 12 kg' && tr.pts === 3 && tr.line
      && /^\d+ \w+ · 92 kg$/.test(tr.foot[0]) && tr.foot[1] === '104 kg' && !tr.caps, JSON.stringify(tr));
    t.check('Getting stronger: the card says in words what the line draws', !!tr && /Back Squat, 104 kg, up 12 kg since/.test(tr.aria || ''), tr && tr.aria);
    await p.click('#trend-wrap .tr-card');
    await p.waitForTimeout(450);
    t.check('Getting stronger: a tap opens that lift\'s own page in Personal Records', (await active(p)) === 'screen-ceiling'
      && await p.evaluate(() => (document.querySelector('#screen-ceiling .ceil-title') || {}).textContent === 'Barbell Back Squat'), await active(p));
    t.check('no page errors (Getting stronger)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
    // one reading is a sparkline, not a trend: no card and no title
    const one = await H.openProgram(browser, { prog: prog(), seed: { _1rm: [SEED_NUMBERS._1rm[0]] } });
    await one.p.evaluate(() => goTo('plan'));
    await one.p.waitForTimeout(400);
    const no = await one.p.evaluate(() => ({ card: !!document.querySelector('#trend-wrap .tr-card'), title: !document.getElementById('trend-title').hidden,
      row: !!document.querySelector('#ceiling-row-wrap .hrow') }));
    t.check('Getting stronger: under three readings there is no card and no title, and the Records row still says what it has', !no.card && !no.title && no.row, JSON.stringify(no));
    await one.ctx.close();
  }

  // ── 11. Day one: before the first finished session, no screen full of zeros (2026-10-20) ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), hist: [] });
    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(450);
    const d1 = await p.evaluate(() => {
      const shown = id => { const e = document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; };
      return { line: (document.querySelector('#dayone-wrap .day1') || {}).textContent || null,
        numbers: shown('numbers-title'), card: shown('career-card-wrap'), records: shown('ceiling-row-wrap'),
        weight: !!document.querySelector('#weight-row-wrap .hrow'), habits: shown('habits-block-wrap'),
        ach: shown('career-courts-wrap'), moments: shown('career-moments-wrap'),
        cover: !!document.querySelector('.cyc-card'), road: !!document.querySelector('#road-wrap .road-row') };
    });
    t.check('Day one: one line instead of the zeros — no Your numbers, no Records row, neither earned door',
      /Nothing here yet/.test(d1.line || '') && !d1.numbers && !d1.card && !d1.records && !d1.ach && !d1.moments, JSON.stringify(d1));
    t.check('Day one: the cover, the plan and what can be filled in today (body weight) stay', d1.cover && d1.road && d1.weight, JSON.stringify(d1));
    t.check('no page errors (day one)', p.errs.length === 0, p.errs.join(' | '));
    await shot(p, 'progress-day-one');
    await ctx.close();
    // and once a session is finished the screen fills in again
    const after = await H.openProgram(browser, { prog: prog(), seed: SEED_NUMBERS });
    await after.p.evaluate(() => goTo('plan'));
    await after.p.waitForTimeout(400);
    const on = await after.p.evaluate(() => ({ line: !!document.querySelector('#dayone-wrap .day1'), numbers: !document.getElementById('numbers-title').hidden,
      records: !!document.querySelector('#ceiling-row-wrap .hrow') }));
    t.check('Day one is only day one: with a finished session the line goes and the Records row is back (no career here, so no Your numbers over an empty card, Love All B20)', !on.line && !on.numbers && on.records, JSON.stringify(on));
    await after.ctx.close();
  }

  await real.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
