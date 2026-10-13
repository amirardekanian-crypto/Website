// Ask Amir, mid-session, under ⋯ (Line Call, 2026-10-13; Amir: "yes to all recommended", decision 5, "under ⋯ only"):
// node scripts/headless/ask-amir.js
//
// Mid-session the way to WhatsApp was ← Home, Coach, Open WhatsApp, with a message that named nothing. Under ⋯ on the slim bar one
// row now opens WhatsApp with the day and the exercise that is open ("About Day 1, Barbell Back Squat: "), labelled with it. It is
// hidden until ⋯ opens, never cuts the clock, keeps the 2 x 2 grid of Pause/Guided/Reset/Finish early, and fits 320 to 390 px.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  for (const w of [320, 390]) {
    const { ctx, p } = await H.openProgram(browser, { w, h: 760, prog: H.fixture(), stub: { library: H.library() } });
    await p.evaluate(`(() => { openDayView('1'); startTimerNow('1'); const c = ${H.card('Barbell Back Squat')}; c.querySelectorAll('.ex-set-check')[0].click(); try { hideAaToast(); } catch (e) {} })()`);
    await p.waitForTimeout(500);
    const closed = await p.evaluate(() => { const a = document.querySelector('#timer-1 .session-timer-ask'); return a ? getComputedStyle(a).display : 'missing'; });
    C.check(`${w}: Ask Amir is hidden until ⋯ opens`, closed === 'none', closed);
    await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; if (c.classList.contains('collapsed')) toggleExpand(c); toggleBarMore('1'); })()`);
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const bar = document.getElementById('timer-1'), a = bar.querySelector('.session-timer-ask'), ar = a.getBoundingClientRect(), br = bar.getBoundingClientRect();
      const clock = bar.querySelector('.session-timer-time'), cr = clock.getBoundingClientRect();
      a.click();
      return { label: a.innerText.trim(), h: Math.round(ar.height), inBar: ar.left >= br.left - 1 && ar.right <= br.right + 1, href: decodeURIComponent(a.href),
        clockCut: clock.scrollWidth > clock.clientWidth + 1 || cr.width < 40, sideways: document.documentElement.scrollWidth - innerWidth,
        grid: getComputedStyle(bar.querySelector('.session-timer-actions')).display };
    });
    C.check(`${w}: under ⋯, one row "Ask Amir about Barbell Back Squat", 44 px, inside the bar`, r.label === 'Ask Amir about Barbell Back Squat' && r.h >= 44 && r.inBar, JSON.stringify(r));
    C.check(`${w}: its message names the day and the exercise`, /About Day 1, Barbell Back Squat: $/.test(r.href), r.href.slice(-60));
    C.check(`${w}: the clock is whole and nothing scrolls sideways`, !r.clockCut && r.sideways <= 0, JSON.stringify(r));
    // nothing open: it names the session
    await p.evaluate(`(() => { toggleBarMore('1'); document.querySelectorAll('#day1 .checklist-item').forEach(c => c.classList.add('collapsed')); toggleBarMore('1'); })()`);
    const none = await p.evaluate(() => { const a = document.querySelector('#timer-1 .session-timer-ask'); a.click(); return { label: a.innerText.trim(), href: decodeURIComponent(a.href) }; });
    C.check(`${w}: with nothing open it is "Ask Amir about this session", the message names the day`, none.label === 'Ask Amir about this session' && /About Day 1: $/.test(none.href), JSON.stringify(none));
    C.check(`${w}: no page errors`, !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
