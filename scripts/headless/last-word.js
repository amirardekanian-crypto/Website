// The Last Word (#140, round 14 "The Changeover"): what the finished card says about tonight and tomorrow, node scripts/headless/last-word.js
//
// A day finished TODAY gets, under its completion message, "Tonight and tomorrow": up to three short lines (one per slot, the first
// match in recovery/last-word.toml), then at most one Library row (recovery/matched-pair.toml) and at most one article. This runs the
// real app, finishes a day through its own boxes (Done, a session RPE, the clock), and reads what the athlete reads:
//   1. A big leg day finished late (21:00): the label, exactly three lines in order, Lights Out, Sleep Is Training, and the block
//      sits in grid row 7, above the habit row.
//   2. The same finished at 18:00: Night Shift (For your legs) and Eat to Train. At 10:00: The Morning After.
//   3. A normal day with no new exercise says one line and offers nothing; an easy day says its one line.
//   4. An upper-body big day offers Open The Cage or Racket Arm: the pick fpPick() makes, never a Care loading session.
//   5. A sore check-in brings LIB-01's own row (Sore today), and the lines stay.
//   6. The seen rule: a row goes once its session or article was opened after the finish, and no other session takes its place
//      (one offer per finished day); the article's back arrow returns to the card.
//   7. A day finished yesterday shows no Last Word (and a sore check-in still brings LIB-01's row).
//   8. The footprint is kept on the phone (<id>_fpdays) and never synced (_snapshot() has no fpdays).
//   9. Without recovery.js (blocked) the card has no Last Word and nothing breaks.
//  10. In Farsi: no Latin letters but the titles, nothing missing from the word lists, the stripe on the right.
//  11. At 320 px nothing overflows sideways.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');
const t = H.checker();

const SPINE = H.SPINE.map(e => Object.assign({}, e)).concat([
  { id: 'rowing', name: 'Rowing', aliases: [], equipment: ['rower'], cues: { good: [], bad: [] }, loads: ['knee', 'hamstring', 'shoulder'], impact: 'none' },
  { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', aliases: [], cues: { good: [], bad: [] }, loads: ['shoulder', 'elbow-forearm-wrist'], impact: 'none' },
  { id: 'single-arm-dumbbell-row', name: 'Single-Arm Dumbbell Row', aliases: [], cues: { good: [], bad: [] }, loads: ['shoulder', 'elbow-forearm-wrist'], impact: 'none' },
]);
const L = { 'barbell-back-squat': ['knee', 'hip-groin', 'low-back'], 'box-jump': ['knee', 'ankle-foot', 'calf-achilles'], 'dumbbell-bulgarian-split-squat': ['knee', 'hip-groin'], 'half-kneeling-pallof-press': ['trunk'], 'side-plank': ['trunk'] };
SPINE.forEach(e => { if (L[e.id]) e.loads = L[e.id]; if (e.id === 'box-jump') e.impact = 'plyometric'; else if (!e.impact) e.impact = 'none'; });

const SQUAT = 'Barbell Back Squat';
const DAY1 = ['Rowing', 'Box Jump', SQUAT, 'Dumbbell Bulgarian Split Squat', 'Half Kneeling Pallof Press', 'Side Plank', 'Mystery Carry'];
const NEVER = ['forearm-loading', 'shoulder-endurance', 'back-under-load', 'knee-and-achilles-loading', 'lower-back'];

// The toml's English, as the file has it.
const TONIGHT_BIG_LATE = 'Big one, and a late finish. Have protein with dinner, then give yourself time to wind down before bed.';
const TONIGHT_BIG = 'Big one today. Protein with dinner and a bit more before bed. Then bed on time.';
const TOMORROW_NEW_LEGS = "New exercises today, so your legs may be sore for a day or two. That's normal, and it's less next time.";
const NEXT_LEGS = 'Your next hard leg day or hard court day: give it two days if you can.';
const TONIGHT_NORMAL = "Good session. Eat well tonight and sleep your usual. That's the recovery.";
const TONIGHT_EASY = 'Easy one. Nothing extra needed.';
const LA_TOML = [TONIGHT_BIG_LATE, TONIGHT_BIG, TOMORROW_NEW_LEGS, NEXT_LEGS, TONIGHT_NORMAL, TONIGHT_EASY,
  'Court and a big session in one day. Eat a proper dinner with protein, and get to bed on time.',
  "New exercises today, so you may be sore for a day or two. That's normal, and it's less next time.",
  "First week of a new cycle, so some soreness is normal. It's less by next week.",
  'Hard court yesterday and a big session today. If you play tomorrow, keep it easy.',
  'Your legs may feel heavy tomorrow. A walk helps. If you play, keep it easy.',
  'You may feel it tomorrow. Easy movement helps. If you play, keep it easy.',
  'A few sets went to your limit today. Give those muscles two days before you push them hard again.',
  'Tonight and tomorrow'];

const inDay = (day, nm) => `[...document.querySelectorAll('#day${day} .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === ${JSON.stringify(nm)})`;

// Logs each named exercise's four sets through the card's own boxes, ticks the rest, rates the session and presses Done.
async function finish(p, day, names, rpe, setRpe) {
  await p.evaluate(d => { goTo('home'); openDayView(d); }, String(day));
  await p.waitForTimeout(500);
  for (let i = 0; i < names.length; i++) {
    await p.evaluate(`(() => { const c = ${inDay(day, names[i])}; if (c.classList.contains('collapsed')) toggleExpand(c); c.id = 'ex${day}_${i}'; })()`);
    await p.waitForTimeout(250);
    await p.fill(`#ex${day}_${i} .ex-set-row[data-set-idx="0"] .ex-set-weight`, '80');
    for (let s = 0; s < 4; s++) {
      await p.click(`#ex${day}_${i} .ex-set-row[data-set-idx="${s}"] .ex-set-check`); await p.waitForTimeout(100);
      await p.click(`#ex${day}_${i} .ex-set-row[data-set-idx="${s}"] .rpe-btn[data-rpe="${setRpe}"]`); await p.waitForTimeout(100);
    }
  }
  await p.evaluate(d => { document.querySelectorAll('#day' + d + ' .checklist-item').forEach(c => { if (!c.classList.contains('checked')) toggleCheckOnly(c, d); }); try { hideAaToast(); } catch (e) {} }, String(day));
  await p.waitForTimeout(300);
  await p.click(`#confirm-${day} .complete-rpe-btn[data-rpe="${rpe}"]`); await p.waitForTimeout(150);
  await p.click(`#confirm-${day} .confirm-btn`); await p.waitForTimeout(1500);
}

// An earlier session of every exercise of day 1, so none of today's is new.
function histAllSeen(rpe, setRpe) {
  const past = H.past(3);
  return [{ completed_on: past, day: '1', readiness: 4, session_rpe: rpe, duration_min: 60,
    log: DAY1.map(ex => ({ ex, block: 'Strength', reps: 6, note: '', sets: [1, 2, 3].map(() => ({ w: '60', n: 6, r: String(setRpe), d: true })) })) }];
}

// opts: noImpact (the Box Jump is not a jump: three sets of jumps on a leg day make a day big on their own), day (the one being finished: its clock is the one running, as another day cannot open while one is under way), hour, lang, hist, w, readiness (a soreness answer), block (recovery.js never arrives)
async function open(browser, o) {
  const init = `Date.prototype.getHours = function () { return ${o.hour == null ? 21 : o.hour}; };` + (o.lang === 'fa' ? "try { localStorage.setItem('aa_lang', 'fa'); } catch (e) {}" : '');
  const seed = { ['_timer_' + (o.day || 1)]: { sessionStart: Date.now() - 65 * 60000, running: true, resumeAt: Date.now() - 65 * 60000, acc: 0 } };
  if (o.sore) seed._readiness_1 = { sleep: 3, energy: 3, soreness: 2, stress: 3, overall: 3, composite: 2.8, score: 3, skipped: false, timestamp: new Date().toISOString() };
  const opts = { spine: o.noImpact ? SPINE.map(e => Object.assign({}, e, { impact: 'none' })) : SPINE, hist: o.hist || [], stub: { library: H.library() }, init, seed };
  if (o.w) { opts.w = o.w; opts.h = 760; }
  const { ctx, p } = await H.openProgram(browser, opts);
  if (o.block) { await ctx.route('**/assets/js/recovery.js*', r => r.abort()); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 }); await p.waitForTimeout(500); }
  return { ctx, p };
}

// What the finished card of `day` shows.
const read = (p, day) => p.evaluate(d => {
  const s = document.getElementById('sugg-' + d), lw = s && s.querySelector('.lw');
  const rows = lw ? [...lw.querySelectorAll('.lw-rows button.lib-sugg')] : [];
  const lib = rows.find(b => !b.classList.contains('lw-art')), art = rows.find(b => b.classList.contains('lw-art'));
  const k = b => b ? { sugg: b.dataset.sugg || null, id: b.dataset.id || null, slug: b.dataset.slug || null, kick: (b.querySelector('.lib-sugg-k') || {}).textContent, title: (b.querySelector('b') || {}).textContent } : null;
  const soreRow = s && s.querySelector('button.lib-sugg[data-sugg="sore"]');
  return { has: !!lw, hasClass: !!(s && s.classList.contains('has-lw')), label: lw && lw.querySelector('.lw-k').textContent,
    lines: lw ? [...lw.querySelectorAll('.lw-l')].map(x => x.textContent.trim()) : [], lib: k(lib), art: k(art), nrows: rows.length, sore: k(soreRow),
    soreHtml: soreRow ? soreRow.textContent.replace(/\s+/g, ' ').trim() : null };
}, String(day));

(async () => {
  const browser = await H.launch();
  const settle = async p => { await p.waitForTimeout(900); };

  // ── 1. Big leg day, finished late ───────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { hour: 21 });
    await finish(p, 1, [SQUAT], 8, 9); await settle(p);
    const r = await read(p, 1);
    t.check('late big leg day: the label says "Tonight and tomorrow"', r.label === 'Tonight and tomorrow', r.label);
    t.check('exactly three lines: tonight, tomorrow, next, in that order', r.lines.length === 3 && r.lines[0] === TONIGHT_BIG_LATE && r.lines[1] === TOMORROW_NEW_LEGS && r.lines[2] === NEXT_LEGS, JSON.stringify(r.lines));
    t.check('the Library row is Lights Out (late, kicker "After a late one")', !!r.lib && r.lib.sugg === 'late' && r.lib.title === 'Lights Out' && r.lib.kick === 'After a late one', JSON.stringify(r.lib));
    t.check('the article row is Sleep Is Training', !!r.art && r.art.slug === 'sleep-and-recovery' && r.art.title === 'Sleep Is Training', JSON.stringify(r.art));
    t.check('at most one Library row and one article', r.nrows === 2, r.nrows);
    t.check('#sugg-1 has class has-lw', r.hasClass, r.hasClass);
    await p.evaluate(() => document.getElementById('sugg-1').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(300);
    const pos = await p.evaluate(() => {
      const s = document.getElementById('sugg-1'), h = document.getElementById('habit-tick-1');
      return { row: getComputedStyle(s).gridRowStart, sTop: s.getBoundingClientRect().top, sBot: s.getBoundingClientRect().bottom, hTop: h ? h.getBoundingClientRect().top : null };
    });
    t.check('the slot is in grid row 7', pos.row === '7', pos.row);
    t.check('it sits above the habit row on screen', pos.hTop != null && pos.sBot <= pos.hTop + 1, JSON.stringify(pos));
    // 8. kept on the phone, never synced
    const kept = await p.evaluate(() => {
      const o = JSON.parse(localStorage.getItem(ATHLETE_ID + '_fpdays') || '{}'), snap = _snapshot();
      return { keys: Object.keys(o), fp: o[Object.keys(o)[0]], snapHas: JSON.stringify(snap).indexOf('fpdays') >= 0, snapKeys: Object.keys(snap || {}).some(k => /fpdays/.test(k)) };
    });
    t.check('<id>_fpdays holds today\'s footprint for day 1 (big, late)', kept.keys.length === 1 && /^\d{4}-\d{2}-\d{2}\|1$/.test(kept.keys[0]) && kept.fp && kept.fp.level === 'big' && kept.fp.late === true, JSON.stringify(kept).slice(0, 300));
    t.check('_snapshot() has no fpdays key', !kept.snapHas && !kept.snapKeys, JSON.stringify([kept.snapHas, kept.snapKeys]));
    t.check('no page errors (late big day)', p.errs.length === 0, p.errs);

    // 6. the seen rule: Library row, then the article
    await p.click('#sugg-1 .lw-rows button.lib-sugg:not(.lw-art)'); await p.waitForTimeout(1200);
    const ws = await p.evaluate(() => { const s = document.getElementById('screen-workout'); return { on: s.classList.contains('active') || getComputedStyle(s).display !== 'none', title: (document.getElementById('ws-title') || {}).textContent }; });
    t.check('tapping the Library row opens the workout screen on Lights Out', ws.on && /Lights Out/i.test(ws.title || ''), JSON.stringify(ws));
    await p.click('#screen-workout .nav-back'); await p.waitForTimeout(800);
    await p.evaluate(() => paintLastWord('1')); await p.waitForTimeout(500);
    const r2 = await read(p, 1);
    t.check('coming back and repainting: the Library row is gone and nothing stands in (one offer per finished day), the lines and the article stay', r2.has && !r2.lib && !!r2.art && r2.lines.length === 3, JSON.stringify([r2.lib, r2.art, r2.lines.length]));
    await p.click('#sugg-1 .lw-art'); await p.waitForTimeout(1200);
    const ar = await p.evaluate(() => { const s = document.getElementById('screen-article'); return { on: s.classList.contains('active') || getComputedStyle(s).display !== 'none', title: (document.getElementById('ar-title') || {}).textContent }; });
    t.check('tapping the article opens #screen-article on Sleep Is Training', ar.on && /Sleep Is Training/i.test(ar.title || ''), JSON.stringify(ar));
    await p.click('#screen-article .nav-back'); await p.waitForTimeout(900);
    const back = await p.evaluate(() => { const c = document.getElementById('complete-1'), d = document.getElementById('screen-article'); return { card: !!(c && c.classList.contains('visible')), cardShown: !!(c && c.getBoundingClientRect().height > 0), artOff: !(d.classList.contains('active')), dayView: !!document.querySelector('#day-view.active, #screen-day.active, #day-view') && getComputedStyle(document.getElementById('day-view')).display !== 'none' }; });
    t.check('the article\'s back arrow returns to the day view with the finished card visible', back.card && back.cardShown && back.artOff && back.dayView, JSON.stringify(back));
    await p.evaluate(() => paintLastWord('1')); await p.waitForTimeout(500);
    const r3 = await read(p, 1);
    t.check('the article row is gone too: no rows left, the three lines stay', r3.has && !r3.art && !r3.lib && r3.nrows === 0 && r3.lines.length === 3, JSON.stringify([r3.art, r3.lib, r3.nrows]));
    t.check('no page errors (seen rule)', p.errs.length === 0, p.errs);

    // 7. a stamp from yesterday: no Last Word
    const yest = await p.evaluate(() => {
      const k = ATHLETE_ID + '_completed_d1', v = localStorage.getItem(k) || '', i = v.indexOf('|');
      const d = new Date(Date.now() - 86400000);
      const date = /^\d{4}-\d{2}-\d{2}/.test(v) ? d.toISOString().slice(0, 10) : d.toDateString();
      localStorage.setItem(k, date + (i < 0 ? '' : v.slice(i)));
      return { was: v, now: localStorage.getItem(k) };
    });
    await p.evaluate(() => paintLastWord('1')); await p.waitForTimeout(500);
    const r4 = await read(p, 1);
    t.check('a finish stamp from yesterday (it is 21:00): no Last Word', !r4.has && !r4.hasClass && r4.lines.length === 0, JSON.stringify([yest, r4.has]));
    t.check('no page errors (yesterday)', p.errs.length === 0, p.errs);
    await ctx.close();
  }

  // ── 2. Evening and morning ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { hour: 18 });
    await finish(p, 1, [SQUAT], 8, 9); await settle(p);
    const r = await read(p, 1);
    t.check('evening (18:00): tonight line is the not-late one, then the same tomorrow and next', r.lines.length === 3 && r.lines[0] === TONIGHT_BIG && r.lines[1] === TOMORROW_NEW_LEGS && r.lines[2] === NEXT_LEGS, JSON.stringify(r.lines));
    t.check('evening: the row is Night Shift (pair-legs, "For your legs")', !!r.lib && r.lib.sugg === 'pair-legs' && r.lib.title === 'Night Shift' && r.lib.kick === 'For your legs', JSON.stringify(r.lib));
    t.check('evening: the article is Eat to Train (What Actually Helps is not published)', !!r.art && r.art.slug === 'training-nutrition' && r.art.title === 'Eat to Train', JSON.stringify(r.art));
    t.check('no page errors (evening)', p.errs.length === 0, p.errs);
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { hour: 10 });
    await finish(p, 1, [SQUAT], 8, 9); await settle(p);
    const r = await read(p, 1);
    t.check('morning (10:00): the row is The Morning After (pair-legs)', !!r.lib && r.lib.sugg === 'pair-legs' && r.lib.title === 'The Morning After' && r.lib.kick === 'For your legs', JSON.stringify(r.lib));
    t.check('morning: the article is Eat to Train', !!r.art && r.art.slug === 'training-nutrition', JSON.stringify(r.art));
    t.check('no page errors (morning)', p.errs.length === 0, p.errs);
    await ctx.close();
  }

  // ── 3. Normal and easy days ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { hour: 10, hist: histAllSeen(6, 6), noImpact: true });
    await finish(p, 1, [SQUAT], 6, 6); await settle(p);
    const r = await read(p, 1);
    t.check('a normal day with nothing new: the one "Good session" line only', r.has && r.lines.length === 1 && r.lines[0] === TONIGHT_NORMAL, JSON.stringify(r.lines));
    t.check('and no rows', r.nrows === 0 && !r.lib && !r.art, r.nrows);
    t.check('no page errors (normal)', p.errs.length === 0, p.errs);
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { hour: 10, hist: histAllSeen(3, 6), noImpact: true });
    await finish(p, 1, [SQUAT], 3, 6); await settle(p);
    const r = await read(p, 1);
    t.check('an easy day: only "Easy one. Nothing extra needed."', r.has && r.lines.length === 1 && r.lines[0] === TONIGHT_EASY && r.nrows === 0, JSON.stringify([r.lines, r.nrows]));
    t.check('no page errors (easy)', p.errs.length === 0, p.errs);
    await ctx.close();
  }

  // ── 4. An upper-body big day ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { hour: 18, day: 2 });
    await finish(p, 2, ['Incline Dumbbell Press', 'Single-Arm Dumbbell Row'], 8, 9); await settle(p);
    const r = await read(p, 2);
    const want = await p.evaluate(() => { const f = footprintOfDay('2'), pk = fpPick(f), w = pk && libPickItem(pk.evening[0]); return { areas: f && f.areas, pick: pk && pk.id, wid: w && w.id, title: w && w.title, focus: w && w.focusTag }; });
    t.check('upper body: the footprint loaded shoulder and the forearm, and is not a leg day', !!want.areas && want.areas.shoulder > 0 && want.areas['elbow-forearm-wrist'] > 0, JSON.stringify(want));
    t.check('upper body: the row is the one fpPick() chooses (Open The Cage, or Racket Arm if the elbow won)', !!r.lib && r.lib.sugg === 'pair-' + want.pick && (want.pick === 'shoulder' || want.pick === 'arm') && r.lib.id === want.wid && (r.lib.title === 'Open The Cage' || r.lib.title === 'Racket Arm'), JSON.stringify([r.lib, want]));
    t.check('upper body: never a Care loading session', !!r.lib && NEVER.indexOf(r.lib.id) < 0 && NEVER.indexOf(want.focus) < 0 && !(r.lib.id || '').match(/^(forearm-loading|shoulder-endurance|back-under-load|knee-and-achilles-loading|lower-back)$/), JSON.stringify([r.lib && r.lib.id, want.focus]));
    t.check('upper body: no leg line ("legs" or "leg day" in the words)', r.lines.length >= 1 && !r.lines.some(x => /leg/i.test(x)), JSON.stringify(r.lines));
    t.check('no page errors (upper body)', p.errs.length === 0, p.errs);
    await ctx.close();
  }

  // ── 5. A sore check-in ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { hour: 21, sore: true });
    await finish(p, 1, [SQUAT], 8, 9); await settle(p);
    const r = await read(p, 1);
    t.check('sore + big: the row is LIB-01\'s sore row (data-sugg "sore", kicker "Sore today", The Morning After)', !!r.sore && r.sore.sugg === 'sore' && r.sore.kick === 'Sore today' && r.sore.title === 'The Morning After', JSON.stringify(r.sore));
    t.check('sore + big: it is the only Library row, and the lines still show', !!r.lib && r.lib.sugg === 'sore' && r.lines.length === 3 && r.lines[0] === TONIGHT_BIG_LATE, JSON.stringify([r.lib, r.lines.length]));
    t.check('no page errors (sore)', p.errs.length === 0, p.errs);
    // 7b. the stamp from yesterday: still LIB-01's row
    await p.evaluate(() => {
      const k = ATHLETE_ID + '_completed_d1', v = localStorage.getItem(k) || '', i = v.indexOf('|');
      const d = new Date(Date.now() - 86400000);
      localStorage.setItem(k, (/^\d{4}-\d{2}-\d{2}/.test(v) ? d.toISOString().slice(0, 10) : d.toDateString()) + (i < 0 ? '' : v.slice(i)));
    });
    await p.evaluate(() => paintLastWord('1')); await p.waitForTimeout(600);
    const r2 = await read(p, 1);
    t.check('a finish from yesterday with a sore check-in: no Last Word, LIB-01\'s sore row alone', !r2.has && !r2.hasClass && !!r2.sore && r2.sore.sugg === 'sore', JSON.stringify([r2.has, r2.sore]));
    t.check('no page errors (sore, yesterday)', p.errs.length === 0, p.errs);
    await ctx.close();
  }

  // ── 9. recovery.js never arrives ────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { hour: 21, block: true });
    const has = await p.evaluate(() => !!window.AAREC);
    await finish(p, 1, [SQUAT], 8, 9); await settle(p);
    const r = await read(p, 1);
    const card = await p.evaluate(() => { const c = document.getElementById('complete-1'); return !!(c && c.classList.contains('visible')); });
    t.check('recovery.js blocked: window.AAREC is not there', !has, has);
    t.check('the finished card is there with no Last Word', card && !r.has && !r.hasClass && r.lines.length === 0, JSON.stringify([card, r.has]));
    t.check('no page errors (no recovery.js)', p.errs.length === 0, p.errs);
    await ctx.close();
  }

  // ── 10. Farsi ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { hour: 21, lang: 'fa' });
    await finish(p, 1, [SQUAT], 8, 9); await settle(p);
    const info = await p.evaluate(() => {
      const lw = document.querySelector('#sugg-1 .lw');
      if (!lw) return null;
      const c = lw.cloneNode(true); c.querySelectorAll('b').forEach(b => b.remove());
      const first = lw.querySelector('.lw-l'), cs = first && getComputedStyle(first);
      return { text: c.textContent.replace(/\s+/g, ' ').trim(), lines: [...lw.querySelectorAll('.lw-l')].map(x => x.textContent.trim()), bs: [...lw.querySelectorAll('b')].map(b => b.textContent),
        missing: window.AAI18N ? [...AAI18N.missing] : null, right: cs && cs.borderRightColor, left: cs && cs.borderLeftColor, leftW: cs && cs.borderLeftWidth, rightW: cs && cs.borderRightWidth, dir: getComputedStyle(document.body).direction };
    });
    t.check('Farsi: the Last Word is drawn', !!info && info.lines.length === 3, info && JSON.stringify(info.lines));
    t.check('Farsi: no Latin letters outside the session and article titles', !!info && !/[A-Za-z]/.test(info.text), info && info.text);
    t.check('Farsi: the titles stay English inside <b>', !!info && info.bs.length === 2, info && JSON.stringify(info.bs));
    const miss = info && info.missing ? info.missing.filter(m => LA_TOML.some(x => m.indexOf(x) >= 0 || x.indexOf(m) >= 0)) : null;
    t.check('Farsi: AAI18N.missing holds none of the toml\'s English lines', !!info && Array.isArray(info.missing) && miss.length === 0, JSON.stringify(miss));
    t.check('Farsi: the first line\'s stripe is on the right, in the green (not the hair grey)', !!info && info.right === 'rgb(14, 74, 54)' && info.rightW === '2px' && info.leftW === '0px', info && JSON.stringify([info.right, info.left, info.rightW, info.leftW]));
    t.check('no page errors (Farsi)', p.errs.length === 0, p.errs);
    await ctx.close();
  }

  // ── 11. 320 px ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { hour: 21, w: 320 });
    await finish(p, 1, [SQUAT], 8, 9); await settle(p);
    const o = await p.evaluate(() => {
      const lw = document.querySelector('#sugg-1 .lw'), de = document.documentElement;
      return { lw: lw ? [lw.scrollWidth, lw.clientWidth] : null, page: [de.scrollWidth, de.clientWidth], rows: lw ? [...lw.querySelectorAll('.lw-rows button')].map(b => [b.scrollWidth, b.clientWidth]) : [] };
    });
    t.check('320 px: the block does not overflow', !!o.lw && o.lw[0] <= o.lw[1] && o.rows.every(r => r[0] <= r[1]), JSON.stringify(o));
    t.check('320 px: the page does not scroll sideways', o.page[0] <= o.page[1], JSON.stringify(o.page));
    t.check('no page errors (320 px)', p.errs.length === 0, p.errs);
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
