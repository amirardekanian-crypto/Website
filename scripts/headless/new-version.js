// A new version of the app says so itself (Amir, 2026-10-19): node scripts/headless/new-version.js
//
// "every time there is a change in the app, and its updated, i want everyone to be notified to close their app
// from background and re open it. i dont know how to make this a rule or a memory." There is no rule to remember:
// sw.js takes the shell over on every CACHE bump, both apps now watch for that, and the app asks for the reload.
// The look is the note box in the middle of the screen, in clay, picked from three ("lets go with C but in ckay").
// This suite holds the five things that make it safe, in both apps:
//   · a FIRST install says nothing (controllerchange fires there too, with nothing stale behind it);
//   · a new worker over an old one shows ONE box, in that app's own look, with a Reload that reloads;
//   · it does not hide itself, and Not now puts it away for the run;
//   · program.html never shows it over a session, and it lands as soon as the session is over;
//   · AA Proof's embed on Home (habits.html?embed=1) shows nothing and offers no reload, since the iframe is a
//     client of the same worker and a reload from inside it would reload the wrong document.
// Playwright blocks service workers (lib.js), so the lifecycle itself is not exercised here: the suite calls the
// handler the lifecycle calls, and checks the source wires it.
// Serve the repo first (python -m http.server 8765 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE).
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const ROOT = path.join(__dirname, '..', '..');
const WORDS = 'A new version of the app is ready';

// program.html: the clay note box as it stands right now.
const readBox = `(() => {
  const el = document.getElementById('aaToast');
  if (!el || el.hidden) return { on: false };
  const go = el.querySelector('.aa-toast-go'), x = el.querySelector('.aa-toast-x');
  const r = (go || x).getBoundingClientRect(), b = el.getBoundingClientRect(), cs = getComputedStyle(el);
  return { on: true, tone: el.getAttribute('data-tone'), k: (el.querySelector('.aa-toast-k') || {}).textContent,
    txt: el.querySelector('.aa-toast-t').textContent, go: go ? go.textContent.trim() : '', x: x.textContent.trim(),
    h: Math.round(r.height), bg: cs.backgroundImage, ink: getComputedStyle(go || x).color,
    mid: Math.round(b.top + b.height / 2), half: Math.round(window.innerHeight / 2) }; })()`;

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  // ── program.html ──────────────────────────────────────────────────────────
  {
    const { ctx, p } = await H.openProgram(browser);
    // Every reload this suite provokes is caught rather than run: a real one would throw the page away.
    // location.reload itself cannot be replaced in Chrome, so the app's own one-line door is (see the
    // source check at the end, which holds that door to location.reload()).
    await p.evaluate(() => { window.__reloads = 0; window.reloadNewVersion = () => { window.__reloads++; }; });

    C.check('program: nothing is said until a new worker takes over',
      !(await p.evaluate(readBox)).on && await p.evaluate(() => NEW_VERSION === false), '');

    // A first install claims this page too (clients.claim), with nothing stale behind it.
    await p.evaluate(() => { _hadWorker = false; swTookOver(); });
    C.check('program: a FIRST install says nothing — there is no old version behind it',
      !(await p.evaluate(readBox)).on && await p.evaluate(() => NEW_VERSION === false), '');

    // A new worker over an old one: the real path, through the handler controllerchange calls.
    await p.evaluate(() => { _hadWorker = true; swTookOver(); });
    await p.waitForTimeout(300);            // the box slides in: measure where it lands, not on the way
    const box = await p.evaluate(readBox);
    C.check('program: a new worker over an old one shows ONE box, in Amir\'s words, with both buttons',
      box.on && box.txt === WORDS && box.k === 'New version' && box.go === 'Reload' && box.x === 'Not now',
      JSON.stringify(box));
    C.check('program: the box is CLAY, not the green, and in the middle of the screen',
      box.tone === 'clay' && /194,\s*81,\s*44/.test(box.bg) && Math.abs(box.mid - box.half) <= 2,
      JSON.stringify({ tone: box.tone, bg: box.bg, mid: box.mid, half: box.half }));
    C.check('program: the Reload button is the paper with deep clay on it, and a 44 px tap target',
      /138,\s*52,\s*24/.test(box.ink) && box.h >= 44, JSON.stringify({ ink: box.ink, h: box.h }));
    // The two new tokens joined THE APP'S ONE COLOUR SET on body, never :root (a var() declared there resolves
    // light and dark mode would never reach it).
    const tok = await p.evaluate(() => ({
      body: getComputedStyle(document.body).getPropertyValue('--clay-hero').trim(),
      deep: getComputedStyle(document.body).getPropertyValue('--clay-deep').trim(),
      root: getComputedStyle(document.documentElement).getPropertyValue('--clay-hero').trim() }));
    C.check('program: the clay tokens are on body, not on :root',
      /gradient/.test(tok.body) && tok.deep === '#8A3418' && tok.root === '', JSON.stringify(tok));

    // It does not hide itself: this is a note that has to still be there when they look up.
    await p.waitForTimeout(7000);
    C.check('program: it does NOT hide itself after a few seconds', (await p.evaluate(readBox)).on, '');

    // The box never dims or blocks the page under it.
    const through = await p.evaluate(() => {
      const el = document.getElementById('aaToast'), b = el.getBoundingClientRect();
      const at = document.elementFromPoint(8, Math.round(b.top + b.height / 2));
      return { blocked: !!(at && el.contains(at)), dim: getComputedStyle(el).position };
    });
    C.check('program: it does not dim or block the page beside it', !through.blocked && through.dim === 'fixed',
      JSON.stringify(through));

    // Reload goes through the app's one door, once.
    await p.evaluate(() => document.querySelector('#aaToast .aa-toast-go').click());
    C.check('program: Reload goes through the one door once, and takes the box away',
      await p.evaluate(() => window.__reloads) === 1 && !(await p.evaluate(readBox)).on,
      String(await p.evaluate(() => window.__reloads)));
    C.check('program: tapping Reload is not a "Not now" — it did not end the run',
      await p.evaluate(() => _newVerDone === false), '');

    // Mid-session the box is never on the screen: a reload would take the sets with it.
    await p.evaluate(() => { document.body.classList.add('session-on'); paintNewVersion(); });
    C.check('program: NEVER over a session — it is held while a session is under way',
      !(await p.evaluate(readBox)).on && await p.evaluate(() => NEW_VERSION === true), '');
    // ...and it comes back by itself the moment the session is over.
    await p.evaluate(() => { document.body.classList.remove('session-on'); paintNewVersion(); });
    C.check('program: once the session is over the box lands by itself', (await p.evaluate(readBox)).on, '');
    // A box already up when a session starts is taken down, not left over the workout.
    await p.evaluate(() => { document.body.classList.add('session-on'); paintNewVersion(); });
    C.check('program: a box already up is taken down when a session starts', !(await p.evaluate(readBox)).on, '');
    await p.evaluate(() => { document.body.classList.remove('session-on'); paintNewVersion(); });

    // Not now ends it for this run. The next open is the new version anyway.
    await p.evaluate(() => document.querySelector('#aaToast .aa-toast-x').click());
    await p.evaluate(() => { goTo('plan'); goTo('home'); paintNewVersion(); });
    C.check('program: Not now puts it away for the run, and nothing brings it back',
      await p.evaluate(() => _newVerDone === true) && !(await p.evaluate(readBox)).on, '');

    // The guide names the control (CNT-01).
    const guide = await p.evaluate(() => APP_GUIDE.map(c => c.body).join(' '));
    C.check('program: the in-app guide names the note and both buttons (CNT-01)',
      guide.includes(WORDS) && /<strong>Reload<\/strong>/.test(guide) && /<strong>Not now<\/strong>/.test(guide), '');

    await ctx.close();
  }

  // An ordinary toast still behaves as it always did: green, and gone by itself.
  {
    const { ctx, p } = await H.openProgram(browser);
    await p.evaluate(() => aaToast('Just so you know', { kicker: 'Note' }));
    const t = await p.evaluate(readBox);
    await p.waitForTimeout(6600);
    C.check('program: an ordinary note box is unchanged — no tone, and gone by itself',
      t.on && !t.tone && t.x === 'Got it' && !(await p.evaluate(readBox)).on, JSON.stringify({ tone: t.tone, x: t.x }));
    await ctx.close();
  }

  // Neither the demo nor the coach's preview is an installed app anyone trains in.
  for (const [what, query] of [['demo', '?client=demo'], ['the coach preview', '?preview=1']]) {
    const { ctx, p } = await H.openProgram(browser, { query });
    await p.evaluate(() => { _hadWorker = true; swTookOver(); });
    C.check(`program: ${what} stands down`,
      await p.evaluate(() => versionWatchOff() === true && NEW_VERSION === false) && !(await p.evaluate(readBox)).on, '');
    await ctx.close();
  }

  // ── habits.html (AA Proof) ────────────────────────────────────────────────
  const proofBox = `(() => {
    const el = document.querySelector('#app .newver');
    if (!el) return { on: false };
    const go = el.querySelector('.nv-go'), x = el.querySelector('.nv-x');
    const r = go.getBoundingClientRect(), b = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { on: true, txt: el.querySelector('.nv-t').textContent, k: el.querySelector('.nv-k').textContent,
      go: go.textContent.trim(), x: x.textContent.trim(), h: Math.round(r.height),
      bg: cs.backgroundColor, ink: cs.color, z: cs.zIndex,
      mid: Math.round(b.top + b.height / 2), half: Math.round(document.getElementById('app').getBoundingClientRect().height / 2) }; })()`;
  {
    const { ctx, p } = await H.openProof(browser);
    await p.evaluate(() => { window.__reloads = 0; window.reloadNewVersion = () => { window.__reloads++; }; });

    C.check('proof: nothing is said until a new worker takes over',
      !(await p.evaluate(proofBox)).on && await p.evaluate(() => UI.newver === false), '');

    await p.evaluate(() => { _hadWorker = false; swTookOver(); });
    C.check('proof: a FIRST install says nothing',
      !(await p.evaluate(proofBox)).on && await p.evaluate(() => UI.newver === false), '');

    await p.evaluate(() => { _hadWorker = true; swTookOver(); });
    await p.waitForTimeout(300);            // same: after the entrance, not during it
    const box = await p.evaluate(proofBox);
    C.check('proof: a new worker over an old one shows ONE box, the same words, both buttons',
      box.on && box.txt === WORDS && box.k === 'New version' && box.go === 'Reload' && box.x === 'Not now',
      JSON.stringify(box));
    C.check('proof: the box is clay, in the middle of the screen, above the sheet and the toast',
      /199,\s*78,\s*40/.test(box.bg) && Math.abs(box.mid - box.half) <= 2 && Number(box.z) > 95 && box.h >= 44,
      JSON.stringify({ bg: box.bg, mid: box.mid, half: box.half, z: box.z, h: box.h }));

    // It survives a re-render: a tick, a screen change, anything.
    await p.evaluate(() => { go('progress'); });
    C.check('proof: the box stays until it is answered — a screen change does not drop it',
      (await p.evaluate(proofBox)).on, '');

    await p.evaluate(() => document.querySelector('#app .nv-go').click());
    C.check('proof: one tap on Reload goes through once', await p.evaluate(() => window.__reloads) === 1,
      String(await p.evaluate(() => window.__reloads)));

    // Not now puts it away, and swTookOver() does not bring it back this run.
    await p.evaluate(() => { UI.newver = true; render(); });
    await p.evaluate(() => document.querySelector('#app .nv-x').click());
    await p.evaluate(() => { swTookOver(); });
    C.check('proof: Not now puts it away for the run, and nothing brings it back',
      await p.evaluate(() => _newVerDone === true && UI.newver === false) && !(await p.evaluate(proofBox)).on, '');

    await ctx.close();
  }

  // Dark mode: clay inverts in AA Proof, and the ink on it has to invert too.
  {
    const { ctx, p } = await H.openProof(browser, { dark: true });
    await p.evaluate(() => { _hadWorker = true; swTookOver(); });
    const d = await p.evaluate(proofBox);
    C.check('proof: in dark mode the box is the light clay with dark ink on it, not white on salmon',
      /255,\s*163,\s*126/.test(d.bg) && /29,\s*19,\s*13/.test(d.ink), JSON.stringify({ bg: d.bg, ink: d.ink }));
    await ctx.close();
  }

  // The embed on the training app's Home: nothing, and no way to reload the wrong document.
  {
    const { ctx, p } = await H.openProof(browser, { url: '/habits.html?embed=1' });
    await p.evaluate(() => { window.__reloads = 0; window.reloadNewVersion = () => { window.__reloads++; }; });
    await p.evaluate(() => { _hadWorker = true; swTookOver(); });
    const emb = await p.evaluate(proofBox);
    C.check('proof: the EMBED on Home shows nothing and offers no reload',
      !emb.on && await p.evaluate(() => versionWatchOff() === true && UI.newver === false && window.__reloads === 0),
      JSON.stringify(emb));
    // Even if the flag were set, the strip has no box to draw it in.
    await p.evaluate(() => { UI.newver = true; render(); });
    C.check('proof: the embed has no box to draw even when the flag is set',
      !(await p.evaluate(proofBox)).on, '');
    await ctx.close();
  }

  await browser.close();

  // ── The source: one door in each app, and sw.js bumped ────────────────────
  const prog = fs.readFileSync(path.join(ROOT, 'program.html'), 'utf8');
  const prf = fs.readFileSync(path.join(ROOT, 'habits.html'), 'utf8');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  for (const [name, src] of [['program.html', prog], ['habits.html', prf]]) {
    C.check(`${name}: the worker is registered through initVersionWatch() and nowhere else`,
      (src.match(/serviceWorker\.register\(/g) || []).length === 1 && /initVersionWatch\(\);/.test(src) &&
      /addEventListener\('controllerchange', swTookOver\)/.test(src), '');
    C.check(`${name}: Reload's one door really reloads`,
      /function reloadNewVersion\(\) \{ location\.reload\(\); \}/.test(src), '');
  }
  C.check('both apps say the same words, so an athlete reads one sentence',
    (prog.match(new RegExp(WORDS, 'g')) || []).length >= 1 && prf.includes(WORDS), '');
  C.check('sw.js still names its cache, and the bump that ships this is in it',
    /^const CACHE = 'aap-v(\d+)';$/m.test(sw) && Number(sw.match(/aap-v(\d+)/)[1]) >= 188,
    (sw.match(/aap-v\d+/) || [])[0]);

  process.exit(C.report());
})();
