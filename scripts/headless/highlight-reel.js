// Highlight Reel in the real app (2026-10-17): the share cards' doors and moments in program.html, run against the made-up fixture with a
// stubbed Supabase (lib.js). The cards themselves (every template, both sizes, both languages, text in its box) are scripts/headless/sharecard.js.
// Checks: the finish card's New best band after Done (and a reload keeps it, quietly) · a Retest beaten band for a test-flagged lift in the closing
// week · the This cycle card's "Share a win ›" row and its sheet (the preview is the picture; Story|Post, English|فارسی, the two switches; Share hands
// the phone's share sheet ONE png with the caption; Save image; Copy caption; the tip; Back closes it; the choices are remembered) · Cycle complete:
// the one-time moment (the card, Share your cycle, Back closes it, never twice), the card's Share your cycle, Roadmap complete's The Distance first ·
// Personal Records: Share on a lift's New best band and on a record's row, never on a first record · reduced motion stops the bursts · 320 px.
// Career Mode round 5 (the light screens): on the finished card only an achievement and a mark's tier (one of the four numbers' marks) are bands with Share, a mark's
// band says "A new mark" and shares as an achievement-style card (no metal; any other badge and a title are no band); a mark's moment's button opens the SAME
// sheet ("Share it"), Story and Post, English and فارسی, 320 px.
// Serve the repo first (python3 -m http.server 8765 --bind 127.0.0.1, see lib.js), then: node scripts/headless/highlight-reel.js [--out <dir>]
'use strict';
const path = require('path');
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');   // a LOCAL calendar day
const dayAgo = n => ymd(new Date(Date.now() - n * DAY));
// The fixture with the current cycle (idx) ending `endedAgo` days ago (negative: still running), five weeks a cycle.
function prog(endedAgo, idx = 1, edit) {
  const P = H.fixture();
  P.currentCycleIndex = idx;
  const start = Date.now() - (34 + endedAgo) * DAY;
  P.cycles.forEach((c, i) => { const s = start + (i - idx) * 35 * DAY; c.startDate = ymd(new Date(s)); c.endDate = ymd(new Date(s + 34 * DAY)); });
  if (edit) edit(P);
  return P;
}
// One squat session in the cycle's first week and one in its last, 5 kg heavier at the same reps and RPE: a Same effort win.
function hist(endedAgo) {
  const start = Date.now() - (34 + endedAgo) * DAY;
  const sq = (w, on) => ({ completed_on: ymd(new Date(start + on * DAY)), day: '1', readiness: 4, log: [
    { ex: 'Barbell Back Squat', block: 'Strength', reps: 6, note: '', sets: [1, 2, 3].map(() => ({ w: String(w), n: 6, r: '7', d: true })) }] });
  return [sq(75, Math.max(2, 29 - Math.max(0, -endedAgo))), sq(70, 1)];
}
// The Spine, with the squat a strength pattern so a finished session files its own records (recordsItself()).
const SPINE = H.SPINE.map(e => e.id === 'barbell-back-squat' ? Object.assign({}, e, { pattern: 'squat', impact: 'none' }) : e);
// navigator.share and canShare, recorded: a headless browser has no share sheet.
const SHARE_STUB = `window.__shared = []; Object.defineProperty(navigator, 'canShare', { value: d => !!(d && d.files && d.files.length), configurable: true });
  Object.defineProperty(navigator, 'share', { value: d => { window.__shared.push({ n: (d.files || []).length, name: d.files && d.files[0] && d.files[0].name, type: d.files && d.files[0] && d.files[0].type,
    size: d.files && d.files[0] && d.files[0].size, text: d.text }); return Promise.resolve(); }, configurable: true });`;
async function open(browser, opts) {
  const r = await H.openProgram(browser, Object.assign({ spine: SPINE }, opts, { stub: Object.assign({}, opts.stub || {}) }));
  await r.p.addInitScript({ content: SHARE_STUB });
  await r.p.evaluate(SHARE_STUB);
  return r;
}
const sheet = p => p.evaluate(() => {
  const ov = document.getElementById('hist-overlay'), m = ov.querySelector('.readiness-modal');
  const img = document.getElementById('hl-img');
  const q = s => m.querySelector(s);
  return { open: ov.classList.contains('visible'), title: (q('#hl-title') || {}).textContent || null, eyebrow: (q('.readiness-eyebrow') || {}).textContent || null,
    src: img ? img.getAttribute('src') || '' : '', w: img ? img.naturalWidth : 0, h: img ? img.naturalHeight : 0, alt: img ? img.alt : '',
    picks: [...m.querySelectorAll('.hl-pick [role=radio]')].map(b => b.textContent), segs: [...m.querySelectorAll('.hl-seg button')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')),
    tgs: [...m.querySelectorAll('.hl-tg')].map(b => (b.hidden ? '(hidden)' : '') + b.textContent.trim() + ':' + b.getAttribute('aria-checked')),
    share: q('#hl-share') ? !q('#hl-share').disabled : false, save: q('#hl-save') ? !q('#hl-save').disabled : false, copy: !!q('#hl-copy'),
    tip: (q('.hl-tip') || {}).textContent || null, msg: (q('#hl-msg') || {}).textContent || '', close: !!q('.sheet-bar .sheet-close'),
    sideways: document.documentElement.scrollWidth - window.innerWidth };
});
const ready = p => p.waitForFunction(() => { const i = document.getElementById('hl-img'), s = document.getElementById('hl-share');
  return i && /^blob:/.test(i.getAttribute('src') || '') && i.complete && i.naturalWidth > 0 && s && !s.disabled; }, null, { timeout: 20000 });

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const shot = (p, name) => p.screenshot({ path: path.join(shots, 'hl-' + name + '.png'), fullPage: false });

  // ── 1. This cycle: "Share a win ›" under the wins, and the share sheet ──
  {
    const { ctx, p } = await open(browser, { prog: prog(-4), hist: hist(-4) });
    await p.evaluate(() => goTo('plan'));
    const row = await p.evaluate(() => { const b = document.querySelector('#screen-plan .cyc-card .cyc-share'); return b ? { txt: [...b.children].map(s => s.textContent.trim()).join(' '), h: b.getBoundingClientRect().height, wins: document.querySelectorAll('#screen-plan .cyc-win').length } : null; });
    t.check('This cycle: one "Share a win ›" row under the wins (a Same effort win), 48 px', !!row && row.txt === 'Share a win ›' && row.h >= 44 && row.wins === 1, JSON.stringify(row));
    t.check('This cycle: no Share your cycle while the cycle runs', await p.evaluate(() => !document.querySelector('#screen-plan .cyc-share-go')));
    await p.click('#screen-plan .cyc-share');
    await ready(p);
    let s = await sheet(p);
    t.check('the sheet opens on the one sheet, "Highlight Reel" over "Share a win", with Close in its top row', s.open && s.eyebrow === 'Highlight Reel' && s.title === 'Share a win' && s.close, JSON.stringify(s));
    t.check('the preview IS the picture: a 1080 × 1920 Story, drawn on the phone (a blob)', /^blob:/.test(s.src) && s.w === 1080 && s.h === 1920, JSON.stringify([s.src.slice(0, 12), s.w, s.h]));
    t.check('the picture says what the card says (its caption as the alt text): the win, +5 kg at the same reps and effort, and @amirardekanian',
      /Barbell Back Squat: \+5 kg, same reps, same effort\./.test(s.alt) && /@amirardekanian/.test(s.alt), s.alt);
    t.check('one card, so no picker; Story and English chosen, both switches on', s.picks.length === 0 && s.segs.join() === 'Story:true,Post:false,English:true,فارسی:false'
      && s.tgs.join() === 'Show the weights:true,Show my name:true', JSON.stringify([s.picks, s.segs, s.tgs]));
    t.check('Share and Save image are ready once the picture is, Copy caption is there, and the tip names @amirardekanian', s.share && s.save && s.copy
      && s.tip === 'Mention @amirardekanian in your Story so Amir can share it too.', JSON.stringify([s.share, s.save, s.tip]));
    await shot(p, 'sheet-story');
    // Share: the phone's share sheet, with ONE png and the caption.
    await p.click('#hl-share'); await p.waitForTimeout(300);
    const sh = await p.evaluate(() => window.__shared);
    t.check('Share hands the phone\'s share sheet ONE png (the card) and the caption', sh.length === 1 && sh[0].n === 1 && sh[0].type === 'image/png' && sh[0].size > 20000
      && /^aa-highlight-effort-story\.png$/.test(sh[0].name) && /@amirardekanian/.test(sh[0].text || ''), JSON.stringify(sh));
    // Post, Farsi, the weights off, the name off: each redraws, and is remembered.
    await p.click('.hl-seg button[data-v="post"]'); await ready(p);
    s = await sheet(p);
    t.check('Post: the picture is 1080 × 1350', s.w === 1080 && s.h === 1350, JSON.stringify([s.w, s.h]));
    await p.click('.hl-seg button[data-v="fa"]'); await ready(p);
    await p.click('.hl-tg[data-k="weights"]'); await ready(p);
    await p.click('.hl-tg[data-k="name"]'); await ready(p);
    s = await sheet(p);
    const prefs = await p.evaluate(() => JSON.parse(localStorage.getItem('aa_hl_prefs')));
    t.check('فارسی, the weights off and the name off: chosen, redrawn, and remembered on this phone (aa_hl_prefs, no athlete prefix)',
      s.segs.join() === 'Story:false,Post:true,English:false,فارسی:true' && s.tgs.join() === 'Show the weights:false,Show my name:false'
      && prefs.size === 'post' && prefs.lang === 'fa' && prefs.weights === false && prefs.name === false, JSON.stringify([s.segs, s.tgs, prefs]));
    await shot(p, 'sheet-post-fa');
    await p.evaluate(() => { window.__shared = []; });
    await p.click('#hl-share'); await p.waitForTimeout(300);
    const sh2 = await p.evaluate(() => window.__shared);
    t.check('the Farsi caption, with the weights off: the change only, and the handle', sh2.length === 1 && /^aa-highlight-effort-post-fa\.png$/.test(sh2[0].name)
      && /۵ کیلو/.test(sh2[0].text || '') && !/۷۵/.test(sh2[0].text || '') && /@amirardekanian/.test(sh2[0].text || ''), JSON.stringify(sh2));
    // Save image: a download of the same picture.
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('#hl-save')]);
    t.check('Save image downloads the picture (aa-highlight-…png) and says Saved.', !!dl && /^aa-highlight-effort-post-fa\.png$/.test(dl.suggestedFilename()) && (await sheet(p)).msg === 'Saved.', dl ? dl.suggestedFilename() : 'no download');
    await p.click('#hl-copy'); await p.waitForTimeout(300);
    s = await sheet(p);
    t.check('Copy caption says it was copied (or shows the words when the phone will not copy)', s.msg === 'Caption copied.' || /@amirardekanian/.test(s.msg), s.msg);
    // The phone's Back closes the sheet.
    await p.evaluate(() => history.back()); await p.waitForTimeout(400);
    t.check('the phone\'s Back closes the sheet', !(await sheet(p)).open);
    // Reopened: the remembered choices come back.
    await p.click('#screen-plan .cyc-share'); await ready(p);
    s = await sheet(p);
    t.check('opened again: Post, فارسی and both switches off, as left', s.segs.join() === 'Story:false,Post:true,English:false,فارسی:true' && s.tgs.join() === 'Show the weights:false,Show my name:false', JSON.stringify([s.segs, s.tgs]));
    t.check('no page errors (This cycle and the sheet)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. Cycle complete: the moment, once; Share your cycle; the sheet offers the cycle, then the win ──
  {
    const { ctx, p } = await open(browser, { prog: prog(3), hist: hist(3) });
    await p.waitForFunction(() => { const i = document.querySelector('.hl-moment .hl-m-card img'); return i && /^blob:/.test(i.getAttribute('src') || '') && i.complete; }, null, { timeout: 20000 }).catch(() => {});
    const m = await p.evaluate(() => { const el = document.querySelector('.hl-moment'); if (!el) return null;
      const q = s => el.querySelector(s); const im = q('.hl-m-card img');
      return { eye: q('.hl-m-eyebrow').textContent, title: q('.hl-m-title').textContent, sub: (q('.hl-m-sub') || {}).textContent, go: q('.hl-m-go').textContent, skip: q('.hl-m-skip').textContent,
        x: q('.hl-m-x').getAttribute('aria-label'), card: im && /^blob:/.test(im.getAttribute('src') || '') ? im.naturalWidth + 'x' + im.naturalHeight : null, sig: !!q('.wn-sign .wn-sig'),
        words: q('.hl-m-sheet p').textContent, rays: el.querySelectorAll('.hl-m-burst i').length, seen: localStorage.getItem('rel01_athlete_hl_seen') };
    });
    t.check('3 days past the end: the Cycle complete moment, full screen: the cycle\'s name, its sessions and weeks, his signature, Share your cycle and Not now',
      !!m && m.eye === 'Cycle complete' && m.title === 'Load & Build' && /^2 of \d+ sessions · 5 weeks$/.test(m.sub || '') && m.go === 'Share your cycle' && m.skip === 'Not now' && m.x === 'Close' && m.sig, JSON.stringify(m));
    t.check('the moment shows the card itself (a 1080 × 1920 Story) and says it in his words', !!m && m.card === '1080x1920' && m.words === 'Cycle 2 is done, and I’ve signed it off. Here’s your card if you want to share it.', JSON.stringify(m && [m.card, m.words]));
    t.check('the moment is marked seen (synced: another phone does not show it again)', !!m && /"cycle2\|\d{4}-\d{2}-\d{2}":\d+/.test(m.seen || ''), m && m.seen);
    await shot(p, 'moment-cycle');
    await p.evaluate(() => history.back()); await p.waitForTimeout(400);
    t.check('the phone\'s Back closes the moment', await p.evaluate(() => !document.querySelector('.hl-moment')));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await p.waitForTimeout(500);
    t.check('the next open: no moment again', await p.evaluate(() => !document.querySelector('.hl-moment')));
    await p.evaluate(() => goTo('plan'));
    const go = await p.evaluate(() => { const b = document.querySelector('#screen-plan .cyc-card .cyc-share-go'); return b ? b.textContent : null; });
    t.check('Progress: the Cycle complete card has "Share your cycle" (and no "Share a win" row, the sheet carries the wins)', go === 'Share your cycle' && await p.evaluate(() => !document.querySelector('#screen-plan .cyc-share')), go);
    await p.click('#screen-plan .cyc-share-go'); await ready(p);
    const s = await sheet(p);
    t.check('its sheet: "Share your cycle", the cycle first and then the win to pick from', s.title === 'Share your cycle' && s.picks.join() === 'Load & Build,Barbell Back Squat', JSON.stringify(s.picks));
    t.check('the Signed Off picture is a Story with the cycle\'s numbers in its caption', s.w === 1080 && s.h === 1920 && /Load & Build, signed off: 2 of \d+ sessions\./.test(s.alt), s.alt);
    await p.click('.hl-pick [data-j="1"]'); await ready(p);
    t.check('picking the win redraws it as Same effort ("Share a win")', (await sheet(p)).title === 'Share a win');
    await shot(p, 'sheet-cycle');
    t.check('no page errors (Cycle complete)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // The roadmap's last cycle: Roadmap complete, The Distance first. 40 days past: no moment (it is for the first two weeks).
    const { ctx, p } = await open(browser, { prog: prog(3, 2), hist: hist(3) });
    await p.waitForTimeout(600);
    const m = await p.evaluate(() => { const el = document.querySelector('.hl-moment'); return el ? { eye: el.querySelector('.hl-m-eyebrow').textContent, title: el.querySelector('.hl-m-title').textContent, go: el.querySelector('.hl-m-go').textContent } : null; });
    t.check('the last cycle: Roadmap complete, The distance, Share the whole road', !!m && m.eye === 'Roadmap complete' && m.title === 'The distance' && m.go === 'Share the whole road', JSON.stringify(m));
    await p.click('.hl-moment .hl-m-go'); await ready(p);
    const s = await sheet(p);
    t.check('Share the whole road: the moment closes and the sheet offers The whole road first, then the cycle', await p.evaluate(() => !document.querySelector('.hl-moment')) && s.title === 'Share the whole road' && s.picks[0] === 'The whole road' && s.picks[1] === 'Power Translation', JSON.stringify(s.picks));
    t.check('The Distance has no kilos, so no weights switch', s.tgs.join() === '(hidden)Show the weights:true,Show my name:true', JSON.stringify(s.tgs));
    t.check('no page errors (Roadmap complete)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
    const r2 = await open(browser, { prog: prog(40), hist: hist(40) });
    await r2.p.waitForTimeout(500);
    t.check('40 days past: no moment (only in the two weeks after the end date)', await r2.p.evaluate(() => !document.querySelector('.hl-moment')));
    await r2.ctx.close();
  }

  // ── 3. The finish card: a New best band after Done, and it stays (quietly) after a reload ──
  {
    const sets = w => [1, 2, 3, 4].map(() => ({ w: String(w), n: '', r: '8', d: true }));
    const { ctx, p } = await open(browser, { prog: prog(-4), hist: hist(-4), seed: { _setlog_Barbell_Back_Squat: sets(80), _srpe_1: '7' } });
    await p.evaluate(() => { openDayView('1'); finishDay('1'); });
    await p.waitForTimeout(400);
    const b = await p.evaluate(() => { const el = document.querySelector('#hlwin-1 .hl-band'); return el ? { txt: el.innerText.replace(/\s+/g, ' ').trim(), isNew: el.classList.contains('is-new'),
      inGreen: getComputedStyle(el.parentElement).gridRowStart, label: el.getAttribute('aria-label'), raw: localStorage.getItem('rel01_athlete_hlwin_d1'), snap: Object.keys(_snapshot()).some(k => /hlwin/.test(k)) } : null; });
    t.check('Done with a new best: the finished card says New best, the lift and the set as lifted (80 kg × 6), and Share', !!b && /^NEW BEST BARBELL BACK SQUAT 80 KG × 6 SHARE$/.test(b.txt), JSON.stringify(b));
    t.check('…in the card\'s green (grid row 5), with its burst the first time, and a name a screen reader says', !!b && b.inGreen === '5' && b.isNew && b.label === 'New best: Barbell Back Squat, 80 kg × 6. Share it', JSON.stringify(b));
    t.check('…kept on this phone only (never in the synced snapshot)', !!b && !!b.raw && !b.snap, JSON.stringify(b && [b.raw && b.raw.slice(0, 60), b.snap]));
    await p.click('#hlwin-1 .hl-band'); await ready(p);
    const s = await sheet(p);
    t.check('its Share opens "Share your best": the set as lifted and the gain at the same reps', s.title === 'Share your best' && /New best on the Barbell Back Squat: 80 kg × 6\./.test(s.alt), s.alt);
    await shot(p, 'finish-band-sheet');
    await p.evaluate(() => closeHistorySheet());
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await p.waitForTimeout(400);
    const b2 = await p.evaluate(() => { openDayView('1'); const el = document.querySelector('#hlwin-1 .hl-band'); return el ? { isNew: el.classList.contains('is-new'), txt: el.innerText.replace(/\s+/g, ' ').trim() } : null; });
    t.check('a reload of the finished day shows the same band, quietly (no burst again)', !!b2 && !b2.isNew && /80 KG × 6/.test(b2.txt), JSON.stringify(b2));
    t.check('no page errors (finish band)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 4. A retest beaten: the squat flagged for a 5RM, the closing week, a test 50 days ago at 70 × 5 ──
  {
    const P = prog(-3, 1, x => { x.workouts.days[0].blocks[1].exercises.find(e => e.name === 'Barbell Back Squat').test = '5RM'; });
    const seed = { _setlog_Barbell_Back_Squat: [1, 2, 3, 4].map(() => ({ w: '80', n: '5', r: '9', d: true })), _srpe_1: '8',
      _1rm: [{ lift: 'Barbell Back Squat', kg: 85, w: 70, r: 5, rpe: 9, d: dayAgo(50), t: 1, test: true }] };
    const { ctx, p } = await open(browser, { prog: P, hist: [], seed });
    await p.evaluate(() => { openDayView('1'); finishDay('1'); });
    await p.waitForTimeout(400);
    const b = await p.evaluate(() => [...document.querySelectorAll('#hlwin-1 .hl-band')].map(el => el.innerText.replace(/\s+/g, ' ').trim()));
    t.check('a test-flagged lift in the closing week that beat its last test: one band, Retest beaten, 70 → 80 kg (not also a New best)', b.length === 1 && /^RETEST BEATEN BARBELL BACK SQUAT 70 → 80 KG SHARE$/.test(b[0]), JSON.stringify(b));
    await p.click('#hlwin-1 .hl-band'); await ready(p);
    const s = await sheet(p);
    t.check('its sheet: "Share your retest", both numbers in the caption', s.title === 'Share your retest' && /Barbell Back Squat retest, beaten: 70 kg → 80 kg\./.test(s.alt), s.alt);
    t.check('no page errors (retest)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 5. Personal Records: Share on a lift's New best band and on a record's row; never on a first record ──
  {
    const today = ymd(new Date());
    const seed = { _1rm: [{ lift: 'Barbell Back Squat', kg: 105, w: 90, r: 5, rpe: 9, d: dayAgo(30), t: 1 },
      { lift: 'Barbell Back Squat', kg: 117.5, w: 100, r: 5, rpe: 9, d: today, t: 0, auto: true }],
      _ceil_best: { lift: 'Barbell Back Squat', kg: 117.5, prev: 105, d: today, t: Date.now(), i: 0 } };
    const { ctx, p } = await open(browser, { prog: prog(-4), hist: [], seed });
    await p.evaluate(() => renderCeilingLift('Barbell Back Squat')); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ band: !!document.querySelector('.ceil-pr .ceil-pr-share'), bandTxt: (document.querySelector('.ceil-pr .ceil-pr-t') || {}).textContent,
      rows: [...document.querySelectorAll('.ceil-row')].map(x => !!x.querySelector('.ceil-row-share')), h: (document.querySelector('.ceil-row-share') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height }));
    t.check('the lift\'s New best band has Share (its words unchanged)', r.band && /^12\.5 kg over your last best$/.test(r.bandTxt || ''), JSON.stringify(r));
    t.check('the record row (today, 100 × 5, beat 90 × 5) has Share, the first record has none; 44 px to hit', r.rows.join() === 'true,false' && r.h >= 44, JSON.stringify(r.rows) + ' ' + r.h);
    await p.click('.ceil-pr .ceil-pr-share'); await ready(p);
    const s = await sheet(p);
    t.check('the band\'s Share: "Share your best", the set as lifted', s.title === 'Share your best' && /New best on the Barbell Back Squat: 100 kg × 5\./.test(s.alt), s.alt);
    await p.evaluate(() => closeHistorySheet());
    await p.click('.ceil-row-share'); await ready(p);
    t.check('the row\'s Share opens the same card', /100 kg × 5/.test((await sheet(p)).alt));
    t.check('no page errors (Personal Records)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 6. A narrow phone and reduced motion ──
  {
    const { ctx, p } = await open(browser, { w: 320, h: 640, prog: prog(3), hist: hist(3) });
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.waitForTimeout(500);
    const m = await p.evaluate(() => { const el = document.querySelector('.hl-moment'); return el ? { burst: getComputedStyle(el.querySelector('.hl-m-burst')).display, sideways: document.documentElement.scrollWidth - window.innerWidth,
      go: el.querySelector('.hl-m-go').getBoundingClientRect().height } : null; });
    t.check('320 px with reduced motion: the moment has no burst, no sideways scroll, a 52 px button', !!m && m.burst === 'none' && m.sideways <= 0 && m.go >= 52, JSON.stringify(m));
    await p.click('.hl-moment .hl-m-go'); await ready(p);
    const s = await sheet(p);
    const sizes = await p.evaluate(() => [...document.querySelectorAll('#hist-overlay .hl-seg button, #hist-overlay .hl-tg, #hl-share, #hl-save, #hl-copy')].map(b => Math.round(b.getBoundingClientRect().height)));
    t.check('320 px: the sheet has no sideways scroll and every control is 44 px or more', s.sideways <= 0 && sizes.every(h => h >= 44), JSON.stringify([s.sideways, sizes]));
    await shot(p, 'sheet-320');
    t.check('no page errors (320 px)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 7. Career Mode round 5 (the light screens): only an achievement and a mark's tier are bands with Share; a mark shares as an achievement-style card ──
  // The rewards come from get_profile()'s moments (scripts/headless/career.js builds the core and the shelf in their real shapes: stage70's split); the sheet and the cards are the Highlight Reel's.
  // A mark is a tier of one of the four numbers' badges (careerMarks(): weeks held, sessions with Amir, personal bests, comebacks). Its band says "A new mark" and shares as
  // kind 'achievement' (a seal, "12 weeks HELD", a line, the date), so no metal shows; every other badge and every title is neither a band nor a moment (L2).
  {
    const R = require('./career');
    const T0 = ymd(new Date());
    const tables = { career_rules: R.RW_RULES, career_facts: [], career_catalogue: R.catRows() };
    const rows = [
      R.mom('badge:held_weeks:3', 'win', false, 20, R.badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, '12 weeks held in a row.', T0)),
      R.mom('achievement:the_foundry', 'highlight', false, 0, { kind: 'achievement', name: 'THE FOUNDRY', meaning: 'commitment', caption: 'Four weeks of putting the work in.', date: T0 }),
      R.mom('badge:century:2', 'highlight', false, 100, R.badgeSpec('Century', 'commitment', 'silver', 2, 50, '50 sessions with Amir.', T0)),
      // not told in this app any more: another badge, and a title
      R.mom('badge:habit_water:1', 'win', false, 20, R.badgeSpec('HUMAN SPRINKLER', 'consistency', 'bronze', 1, 5, '5 days in a row on full water.', T0)),
      R.mom('title:bedrock', 'highlight', false, 0, { kind: 'title', name: 'BEDROCK', meaning: 'consistency', metal: 'prismatic', from: 'BEDROCK: four weeks of the boring half', date: T0 })];
    const owned = {}; rows.forEach(m => { owned[m.award_id] = T0; });
    const first = R.rwProfile(10000);
    const { ctx, p } = await open(browser, { prog: prog(-4), hist: [], stub: { tables, profile: first, awards: R.rwShelf(first) } });
    await R.toReady(p);
    await p.evaluate(() => document.querySelector('#confirm-1 .complete-rpe-btn[data-rpe="7"]').click());
    await p.evaluate(s => { eval(s); }, R.stubSet(R.rwProfile(10470, { owned, moments: rows })));
    await p.evaluate(() => finishTap('1', document.querySelector('#confirm-1 .confirm-btn')));
    await p.waitForFunction(() => [...document.querySelectorAll('#hlwin-1 .hl-band')].filter(b => b.tagName === 'BUTTON').length >= 3, null, { timeout: 8000 }).catch(() => {});
    const bands = await p.evaluate(() => ({ b: [...document.querySelectorAll('#hlwin-1 .hl-band')].map(el => ({ txt: el.innerText.replace(/\s+/g, ' ').trim(), tag: el.tagName, label: el.getAttribute('aria-label') })),
      more: !!document.querySelector('#hlwin-1 .hl-band-more') }));
    const bs = bands.b;
    t.check('rewards on the finished card: two marks and an achievement are three bands, each with Share, in the Highlight Reel\'s slot',
      bs.length === 3 && bs.every(b => b.tag === 'BUTTON' && /SHARE$/.test(b.txt)) && bs.some(b => /^A NEW MARK 12 WEEKS HELD IN A ROW SHARE$/i.test(b.txt)) && bs.some(b => /^A NEW MARK 50 SESSIONS WITH AMIR SHARE$/i.test(b.txt))
      && bs.some(b => /^MOMENT THE FOUNDRY SHARE$/i.test(b.txt)), JSON.stringify(bands));
    t.check('…a mark\'s band names no badge and no metal; the other badge and the title are no band at all, and nothing says "more"',
      !bs.some(b => /SPRINKLER|BEDROCK|BADGE|TITLE|BRONZE|SILVER|EMERALD|PRISMATIC|AA PROOF/i.test(b.txt + ' ' + b.label)) && !bands.more, JSON.stringify(bands));
    await shot(p, 'p3-bands');
    // every band shares through the SAME sheet as an achievement-style card ("Share it"); a mark's card carries its number and name, never a metal
    const want = [['12 WEEKS HELD', /12 weeks held/], ['THE FOUNDRY', /The Foundry/], ['50 SESSIONS WITH AMIR', /50 sessions with Amir/]];
    for (const [needle, alt] of want) {
      const i = await p.evaluate(n => [...document.querySelectorAll('#hlwin-1 .hl-band')].findIndex(el => el.innerText.toUpperCase().includes(n)), needle);
      await p.evaluate(i => document.querySelectorAll('#hlwin-1 .hl-band')[i].click(), i);
      await ready(p);
      const s = await sheet(p);
      const wantT = needle === 'THE FOUNDRY' ? 'Share it' : 'Share your mark';   // a mark has its own card, and its own title, since the design pass
      t.check(`its Share opens the sheet, "${wantT}": a 1080 × 1920 Story with ${needle} on it and the handle`, s.open && s.title === wantT && s.w === 1080 && s.h === 1920 && alt.test(s.alt) && /@amirardekanian/.test(s.alt) && !/undefined|NaN|bronze|silver|emerald/i.test(s.alt), JSON.stringify([s.title, s.w, s.h, s.alt]));
      if (needle === '12 WEEKS HELD') {
        await p.click('.hl-seg button[data-v="post"]'); await ready(p);
        t.check('…as a Post it is 1080 × 1350', (await sheet(p)).h === 1350);
        await p.click('.hl-seg button[data-v="fa"]'); await ready(p);
        const sf = await sheet(p);
        t.check('…in Farsi it still draws (the mark\'s name stays English until its design pass), nothing breaks', sf.w === 1080 && !/undefined|NaN/.test(sf.alt) && p.errs.length === 0, JSON.stringify([sf.w, sf.alt, p.errs]));
        await p.click('.hl-seg button[data-v="en"]'); await p.click('.hl-seg button[data-v="story"]'); await ready(p);
      }
      await shot(p, 'p3-sheet-' + needle.toLowerCase().replace(/\W/g, '-'));
      await p.evaluate(() => closeHistorySheet());
      await p.waitForTimeout(250);
    }
    t.check('no page errors (reward bands)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // A mark's moment: its button is the same sheet; the sheet's Close shuts it and the app stays.
    const R = require('./career');
    const T0 = ymd(new Date());
    const m = R.mom('badge:held_weeks:3', 'milestone', true, 600, R.badgeSpec('Hold Serve', 'consistency', 'emerald', 3, 12, '12 weeks held in a row. You keep showing up.', T0));
    const mp = R.rwProfile(10000, { moments: [m], owned: { 'badge:held_weeks:3': T0 } });
    const stub = { tables: { career_rules: R.RW_RULES, career_facts: [], career_catalogue: R.catRows() }, profile: mp, awards: R.rwShelf(mp) };
    const { ctx, p } = await open(browser, { prog: prog(-4), hist: hist(-4), stub });
    await p.waitForSelector('.hl-moment', { timeout: 8000 }).catch(() => {});
    const mo = await p.evaluate(() => { const el = document.querySelector('.hl-moment'); const q = s => (el.querySelector(s) || {}).textContent || null;
      return el ? { eyebrow: q('.hl-m-eyebrow'), num: q('.hl-m-num'), title: q('.hl-m-title').replace(/\s+/g, ' ').trim(), next: q('.hl-m-next'), go: q('.hl-m-go') } : null; });
    t.check('a mark\'s moment: "A new mark", the number, what it counts, the next mark, Share the card', !!mo && mo.eyebrow === 'A new mark' && mo.num === '12' && /weeks held in a row$/.test(mo.title) && mo.next === 'Next mark · 24 weeks' && mo.go === 'Share the card', JSON.stringify(mo));
    await p.click('.hl-moment .hl-m-go'); await ready(p);
    const s = await sheet(p);
    t.check('its button closes the moment and opens "Share your mark" with the mark\'s card on it (no metal)', await p.evaluate(() => !document.querySelector('.hl-moment')) && s.title === 'Share your mark' && /12 weeks held/.test(s.alt) && !/emerald/i.test(s.alt) && s.w === 1080 && s.h === 1920, JSON.stringify([s.title, s.alt, s.w, s.h]));
    // (The phone's Back from a sheet that a moment opened leaves the app, for the Cycle complete moment as much as for this one: the moment's guard entry is spent and the
    // sheet pushes none. Left as it was; it is in the L6 report. The sheet's own Close is checked here.)
    await p.evaluate(() => closeHistorySheet()); await p.waitForTimeout(400);
    t.check('the sheet\'s Close shuts it, the moment does not come back and the app stays', !(await p.evaluate(() => { const o = document.getElementById('hist-overlay'); return !!o && o.classList.contains('visible'); }))
      && !(await p.evaluate(() => !!document.querySelector('.hl-moment'))) && /\/program\.html/.test(p.url()), p.url());
    t.check('no page errors (reward moment)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
    // 320 px: the mark's sheet fits
    const n = await open(browser, { w: 320, h: 640, prog: prog(-4), hist: hist(-4), stub });
    await n.p.waitForSelector('.hl-moment', { timeout: 8000 }).catch(() => {});
    await n.p.click('.hl-moment .hl-m-go'); await ready(n.p);
    const s3 = await sheet(n.p);
    const sizes = await n.p.evaluate(() => [...document.querySelectorAll('#hist-overlay .hl-seg button, #hist-overlay .hl-tg, #hl-share, #hl-save, #hl-copy')].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().height)));
    t.check('320 px: the mark\'s sheet has no sideways scroll and every control is 44 px or more', s3.sideways <= 0 && sizes.every(h => h >= 44), JSON.stringify([s3.sideways, sizes]));
    t.check('no page errors (320 px mark sheet)', n.p.errs.length === 0, n.p.errs.join(' | '));
    await n.ctx.close();
  }

  await browser.close();
  console.log('screenshots: ' + shots);
  process.exitCode = t.report() ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
