// #127 Yesterday on Court and #128 Cool Down Call (round 12 'On the Move', 2026-11-22): node scripts/headless/yesterday-court.js
//
// 127: the check-in says what the athlete logged yesterday, and the stored check-in carries it as readiness.yday, which coach.html's
// session card shows as "the day before: Padel 90 min, hard". Information only: the targets are the same with or without it.
// 128: a hard activity of an hour or more offers the day-after session (LIB_PICKS.sore) in the saved message, and its button opens it;
// an easy or short one says only "Added to your weeks.".
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);   // the pages here run in UTC
function weeks(days) {
  return { n: 1, from: at(-6), to: at(28), current: true, weeks: [{ w: 1, from: at(-6), to: at(0), plan: 3, done: 0, held: false, now: true, days }] };
}
const PADEL_Y = { day: at(-1), k: 'court', kind: 'padel', title: 'Padel', mins: 90, effort: 'hard', id: 'p1' };
async function open(browser, fw, extra) {
  const { ctx, p } = await H.openProgram(browser, Object.assign({ tz: 'UTC', stub: { fiveWeeks: fw }, seed: { _hab_cfg: CFG, _hab_log: {} } }, extra || {}));
  await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
  await p.waitForTimeout(900);
  return { ctx, p };
}

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  // ── 127: the check-in ──
  {
    const { ctx, p } = await open(browser, weeks([PADEL_Y, { day: at(-3), k: 'court', kind: 'tennis', title: 'Tennis', mins: 60, effort: 'normal', id: 't1' }]));
    await p.evaluate(() => openReadiness('1'));
    await p.waitForTimeout(250);
    const line = await p.evaluate(() => { const e = document.getElementById('readiness-yday'); return e && !e.hidden ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
    t.check('the check-in says what they logged yesterday, and only yesterday', line === 'Yesterday: Padel · 90 min · Hard', line);
    await p.evaluate(() => { document.querySelectorAll('#readiness-questions .readiness-scale').forEach(r => r.querySelectorAll('.readiness-opt')[3].click()); });
    await p.evaluate(() => beginSession());
    await p.waitForTimeout(300);
    const stored = await p.evaluate(() => JSON.parse(localStorage.getItem(readinessKey('1')) || 'null'));
    t.check('the stored check-in carries it as readiness.yday', stored && Array.isArray(stored.yday) && stored.yday.length === 1
      && stored.yday[0].kind === 'padel' && stored.yday[0].mins === 90 && stored.yday[0].effort === 'hard', JSON.stringify(stored && stored.yday));
    const plain = await p.evaluate(() => { const r = JSON.parse(localStorage.getItem(readinessKey('1'))); const a = readinessPlan(r, readinessBase()); delete r.yday; const b = readinessPlan(r, readinessBase()); return JSON.stringify(a) === JSON.stringify(b); });
    t.check('information only: the day\'s targets are the same without it (REC-7)', plain);
    t.check('no page errors (check-in)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, weeks([{ day: at(-2), k: 'court', kind: 'padel', title: 'Padel', mins: 90, effort: 'hard', id: 'p2' }]));
    await p.evaluate(() => openReadiness('1'));
    await p.waitForTimeout(250);
    const hidden = await p.evaluate(() => document.getElementById('readiness-yday').hidden);
    await p.evaluate(() => skipReadiness());
    const stored = await p.evaluate(() => JSON.parse(localStorage.getItem(readinessKey('1')) || 'null'));
    t.check('nothing logged yesterday: no line, and no yday on the check-in', hidden && stored && !('yday' in stored), JSON.stringify(stored));
    await ctx.close();
  }

  // ── 127: coach.html's words for it ──
  {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'coach.html'), 'utf8');
    const grab = re => { const m = re.exec(src); if (!m) throw new Error('coach.html: not found ' + re); return m[0]; };
    const ctx = vm.createContext({});
    vm.runInContext(grab(/const ACT_WORD_C = \{[\s\S]*?\};/) + '\n' + grab(/function ydayWordC\(a\) \{[\s\S]*?\n\}/), ctx);
    const w = vm.runInContext("[ydayWordC({ kind: 'padel', mins: 90, effort: 'hard' }), ydayWordC({ kind: 'beach_tennis', mins: 45.4, effort: 'easy' }), ydayWordC({ kind: 'zzz' })]", ctx);
    t.check('coach.html says it in words: "Padel 90 min, hard"', w[0] === 'Padel 90 min, hard' && w[1] === 'Beach tennis 45 min, easy' && w[2] === 'Activity', JSON.stringify(w));
    t.check('coach.html puts it on the session card\'s line', /meta\.push\('the day before: ' \+ rd\.yday\.map\(ydayWordC\)/.test(src));
  }

  // ── 128: the save offers the day-after session ──
  {
    const { ctx, p } = await open(browser, weeks([]));
    await p.evaluate(() => openActivitySheet());
    await p.evaluate(() => { actPick('kind', 'padel'); actPick('mins', 90); actPick('effort', 'hard'); });
    await p.evaluate(() => saveActivity());
    await p.waitForTimeout(1200);
    const toast = await p.evaluate(() => { const el = document.getElementById('aaToast'); return el && !el.hidden ? { t: el.querySelector('.aa-toast-t').textContent, go: (el.querySelector('.aa-toast-go') || {}).textContent } : null; });
    t.check('a hard hour and a half offers the day-after session', toast && /^Added to your weeks\. A hard one: .+, tonight or tomorrow/.test(toast.t) && toast.go === 'Open it', JSON.stringify(toast));
    if (toast && toast.go) {
      await p.click('#aaToast .aa-toast-go');
      await p.waitForTimeout(900);
      const opened = await p.evaluate(() => { const s = document.querySelector('.screen.active, .screen.visible, [data-screen].active'); return { ret: !!_wsReturn, id: s ? s.id : '' }; });
      t.check('Open it opens the session, with the way back set to Home', opened.ret, JSON.stringify(opened));
    }
    t.check('no page errors (save)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, weeks([]));
    await p.evaluate(() => openActivitySheet());
    await p.evaluate(() => { actPick('kind', 'padel'); actPick('mins', 90); actPick('effort', 'normal'); });
    await p.evaluate(() => saveActivity());
    await p.waitForTimeout(1200);
    const t2 = await p.evaluate(() => { const el = document.getElementById('aaToast'); return el && !el.hidden ? el.querySelector('.aa-toast-t').textContent : null; });
    t.check('a normal one says only "Added to your weeks."', t2 === 'Added to your weeks.', t2);
    await ctx.close();
  }

  // ── Farsi ──
  {
    const { ctx, p } = await open(browser, weeks([PADEL_Y]), { init: "try { localStorage.setItem('aa_lang', 'fa'); } catch (e) {}" });
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
    await p.waitForTimeout(800);
    await p.evaluate(() => openReadiness('1'));
    await p.waitForTimeout(400);
    const fa = await p.evaluate(() => document.getElementById('readiness-yday').textContent.replace(/\s+/g, ' ').trim());
    t.check('in Farsi the check-in line reads in Farsi', /دیروز/.test(fa) && !/[A-Za-z]{3,}/.test(fa), fa);
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
