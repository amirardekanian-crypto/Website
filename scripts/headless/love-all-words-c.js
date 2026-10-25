// Plain Words, Group C (Amir, 2026-10-25: "Go with your picks"): the words of Progress, the records page, the unit menu, Career and Crew.
//   onerm      the records page never says "One-rep max" and explains its number in one plain line.
//   plates     the unit menu's third row says what it counts: "Plates: how many plates on the stack".
//   holdserve  Hold Serve keeps its name and wears "Weeks in a row you trained" (the weeks-held number, the help card's title).
//   comebacks  Comebacks keeps its number and wears "Times you came back after a break".
//   counting   the finished card says "Adding it up" (the XP line and the reward band) while the server adds the session up.
//   counts     the cover says "Cycle 2 of 3", under it "Week 2 of 5", the road says "5 weeks": one count per number.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-words-c.js
'use strict';
const H = require('./lib');
const C = require('./career');

const ID = H.ID;
const t = H.checker();
const txt = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
const overflow = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.scrollWidth - e.clientWidth : -1; }, sel);

// ═════════ counts ═════════
async function counts(browser) {
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { ctx, p } = await H.openProgram(browser, { w, h, tz: 'UTC', prog: H.fixture(), hist: [] });
    await p.evaluate("goTo('plan')");
    await p.waitForTimeout(800);
    const top = await txt(p, '#cycle-card-wrap .cyc-top');
    const wk = await txt(p, '#cycle-card-wrap .cyc-k');
    const rows = await p.evaluate(() => [...document.querySelectorAll('#road-wrap .road-row .road-ln')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    t.check(`counts ${w}px: the cover says "Cycle 2 of 3"`, /^cycle 2 of 3$/i.test(top || ''), top);
    t.check(`counts ${w}px: under it "Week 2 of 5"`, /^Week 2\s*of 5$/.test(wk || ''), wk);
    t.check(`counts ${w}px: the road says "5 weeks" for every cycle (the done one first, the pill after)`, rows.length === 3 && /^5 weeks · done$/i.test(rows[0]) && /^5 weeks$/i.test(rows[1]) && /^5 weeks · up next$/i.test(rows[2]), JSON.stringify(rows));
    t.check(`counts ${w}px: no "This cycle" eyebrow and no "WEEKS 6–10" range left on the road`, !/this cycle/i.test(top || '') && rows.every(r => !/\d\s*[–-]\s*\d/.test(r)), JSON.stringify([top, rows]));
    t.check(`counts ${w}px: the cover does not overflow`, (await overflow(p, '#cycle-card-wrap .cyc-body')) <= 0, String(await overflow(p, '#cycle-card-wrap .cyc-body')));
    t.check(`counts ${w}px: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  // Past its end the cover says Finished once, and the weeks are on the Week row (not "5 of 5 weeks" again).
  const prog = H.fixture();
  const cur = prog.cycles[prog.currentCycleIndex];
  cur.startDate = H.past(40); cur.endDate = H.past(5);
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', prog, hist: [] });
  await p.evaluate("goTo('plan')");
  await p.waitForTimeout(800);
  const fin = await txt(p, '#cycle-card-wrap .cyc-fin-s');
  t.check('counts: a finished cycle says "Finished 2 Nov" and does not count its weeks a second time', /^Finished [0-9A-Za-z ]+$/i.test(fin || '') && !/week/i.test(fin || ''), fin);
  await ctx.close();
}

// ═════════ onerm ═════════
const DAY = 86400000, day = n => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
const LIFTS = [
  { lift: 'Barbell Back Squat', kg: 98, w: '80', r: '6', rpe: 7, d: day(10), t: Date.now() - 10 * DAY },
  { lift: 'Barbell Back Squat', kg: 104, w: '85', r: '6', rpe: 7, d: day(2), t: Date.now() - 2 * DAY }];
async function onerm(browser) {
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { ctx, p } = await H.openProgram(browser, { w, h, tz: 'UTC', seed: { _1rm: LIFTS } });
    await p.evaluate("goTo('ceiling')");
    await p.waitForTimeout(500);
    const kick = await txt(p, '#screen-ceiling .ceil-kick');
    const intro = await txt(p, '#ceil-body .ceil-intro');
    const all = await txt(p, '#screen-ceiling');
    t.check(`onerm ${w}px: the eyebrow is "Your best lifts", the title stays "Personal Records"`, /^your best lifts$/i.test(kick || '') && /^personal records$/i.test(await txt(p, '#ceil-title')), kick);
    t.check(`onerm ${w}px: the line "The most you could lift once, worked out from your sets." is where the page explains its number`, /^The most you could lift once, worked out from your sets\./.test(intro || ''), intro);
    t.check(`onerm ${w}px: no "one-rep max" and no "1RM" anywhere on the records page`, !/one[- ]rep max|1\s?RM/i.test(all || ''), (all || '').slice(0, 200));
    t.check(`onerm ${w}px: the line does not overflow`, (await overflow(p, '#ceil-body .ceil-intro')) <= 0 && (await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, '');
    // the help card that explains the number (its "How this works" panel) says it plainly too
    const help = await p.evaluate(() => (typeof CEILING_HELP === 'string' ? CEILING_HELP : '').replace(/<[^>]+>/g, ' '));
    t.check(`onerm ${w}px: the help prose never says one rep max`, help.length > 100 && !/one[- ]rep max/i.test(help), help.slice(0, 120));
    t.check(`onerm ${w}px: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

// ═════════ plates ═════════
async function plates(browser) {
  const EMPTY = () => [0, 1, 2, 3].map(() => ({ w: '', n: '', r: '', d: false }));
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { ctx, p } = await H.openProgram(browser, { w, h, prog: H.fixture(), hist: [], seed: { _setlog_Barbell_Back_Squat: EMPTY() }, stub: { library: H.library() } });
    await p.evaluate(`(() => { window.restAfterTick = () => {}; openDayView('1'); const c = ${H.card('Barbell Back Squat')}; if (c.classList.contains('collapsed')) toggleExpand(c); c.id = 'sq'; try { hideAaToast(); } catch (e) {} c.scrollIntoView({ block: 'center' }); })()`);
    await p.waitForTimeout(350);
    await p.click('#sq .ex-set-unit');
    await p.waitForTimeout(200);
    const m = await p.evaluate(() => {
      const el = document.querySelector('.unit-menu'), r = el.getBoundingClientRect();
      const row = el.querySelector('.unit-opt[data-u="plates"]');
      return { text: row.innerText.replace(/\s+/g, ' ').trim(), name: row.querySelector('.unit-opt-n').textContent, hint: row.querySelector('.unit-opt-h').textContent,
        inScreen: r.left >= 0 && r.right <= innerWidth, rowOver: [...el.querySelectorAll('.unit-opt')].map(o => o.scrollWidth - o.clientWidth), h: Math.round(row.getBoundingClientRect().height),
        all: el.innerText };
    });
    t.check(`plates ${w}px: the third row reads Plates, then "how many plates on the stack"`, m.name === 'Plates' && m.hint === 'how many plates on the stack' && !/count the stack/.test(m.all), JSON.stringify(m));
    t.check(`plates ${w}px: the menu stays on the screen and no row overflows`, m.inScreen && m.rowOver.every(x => x <= 0), JSON.stringify([m.inScreen, m.rowOver, m.h]));
    t.check(`plates ${w}px: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

// ═════════ Career: the numbers on Progress ═════════
async function openCareer(browser, w, h) {
  const prof = C.rwProfile(10000);
  const stub = { tables: { career_rules: C.RW_RULES, career_facts: [], career_catalog: [], career_catalogue: C.catRows() },
    profile: prof, awards: C.rwShelf(prof), myMoments: C.myMomentsFx() };
  return H.openProgram(browser, { w, h, tz: 'UTC', prog: H.fixture(), hist: [], stub, seed: { _hab_cfg: { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() } } });
}
const cells = p => p.evaluate(() => [...document.querySelectorAll('#career-card-wrap .cs-n')].map(n => ({ nm: n.querySelector('.cs-nm').innerText.replace(/\s+/g, ' ').trim(), ln: (n.querySelector('.cs-ln') || {}).innerText || null,
  over: n.scrollWidth - n.clientWidth, bot: n.getBoundingClientRect().bottom - n.parentElement.getBoundingClientRect().bottom })));
async function holdserve(browser) {
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { ctx, p } = await openCareer(browser, w, h);
    await p.waitForTimeout(1200);
    await p.evaluate("goTo('plan')");
    await p.waitForTimeout(700);
    const cs = await cells(p);
    const wh = cs.find(c => /weeks? held/i.test(c.nm));
    t.check(`holdserve ${w}px: the weeks-held number wears "Weeks in a row you trained"`, !!wh && wh.ln === 'Weeks in a row you trained', JSON.stringify(cs));
    t.check(`holdserve ${w}px: the other numbers keep to their words (no line on sessions or bests)`, cs.filter(c => /sessions? with Amir|personal bests?/i.test(c.nm)).every(c => !/in a row/.test(c.ln || '')), JSON.stringify(cs));
    t.check(`holdserve ${w}px: nothing overflows (the tile, the page)`, cs.every(c => c.over <= 0) && (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, JSON.stringify(cs));
    const ttl = await p.evaluate(() => {
      return buildAppGuideCards('hold').replace(/<[^>]+>/g, '|').replace(/\s+/g, ' '); });
    t.check(`holdserve ${w}px: the help card is "Hold Serve: weeks in a row you trained"`, /Hold Serve: weeks in a row you trained/.test(ttl), ttl.slice(0, 200));
    t.check(`holdserve ${w}px: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

async function comebacks(browser) {
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { ctx, p } = await openCareer(browser, w, h);
    await p.waitForTimeout(1200);
    await p.evaluate("goTo('plan')");
    await p.waitForTimeout(700);
    const cs = await cells(p);
    const cb = cs.find(c => /comebacks?/i.test(c.nm));
    t.check(`comebacks ${w}px: the comebacks number wears "Times you came back after a break"`, !!cb && cb.ln === 'Times you came back after a break', JSON.stringify(cs));
    t.check(`comebacks ${w}px: it is the same small grey line as the weeks-held one, and the tile and page do not overflow`, cs.filter(c => c.ln).length === 2 && cs.every(c => c.over <= 0) && (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, JSON.stringify(cs));
    const st = await p.evaluate(() => [...document.querySelectorAll('#career-card-wrap .cs-ln')].map(e => { const c = getComputedStyle(e); return [c.fontSize, c.color, c.fontFamily.split(',')[0]]; }));
    t.check(`comebacks ${w}px: both lines share one look (small, grey, Barlow)`, st.length === 2 && st[0].join() === st[1].join() && /Barlow/.test(st[0][2]), JSON.stringify(st));
    t.check(`comebacks ${w}px: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

async function counting(browser) {
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { ctx, p } = await openCareer(browser, w, h);
    await p.waitForTimeout(1200);
    await C.toReady(p);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    await p.waitForTimeout(200);
    const earn = await p.evaluate(() => {      // the finished card as Done paints it, before the server has answered
      finishTap('1', document.querySelector('#confirm-1 .confirm-btn'));
      const e = document.getElementById('earn-1');
      return e ? { text: e.innerText.replace(/\s+/g, ' ').trim(), over: e.scrollWidth - e.clientWidth } : null;
    });
    t.check(`counting ${w}px: the finished card says "Adding it up" while the server counts, not "Counting"`, !!earn && /ADDING IT UP$/i.test(earn.text) && !/counting/i.test(earn.text), JSON.stringify(earn));
    t.check(`counting ${w}px: the line fits`, !!earn && earn.over <= 0, JSON.stringify(earn));
    const guide = await p.evaluate(() => buildAppGuideCards().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    t.check(`counting ${w}px: the help card says "adding it up", never "counting", for what the server has not confirmed`, /says adding it up until my side has it/.test(guide) && !/says counting/i.test(guide), guide.indexOf('adding it up') + ' ' + JSON.stringify(guide.slice(guide.indexOf('It says') , guide.indexOf('It says') + 80)));
    t.check(`counting ${w}px: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

(async () => {
  const browser = await H.launch();
  await counts(browser);
  await onerm(browser);
  await plates(browser);
  await holdserve(browser);
  await comebacks(browser);
  await counting(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
