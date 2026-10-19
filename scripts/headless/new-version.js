// A new version of the app says so itself (Amir, 2026-10-19): node scripts/headless/new-version.js
//
// "every time there is a change in the app, and its updated, i want everyone to be notified to close their app
// from background and re open it. i dont know how to make this a rule or a memory." There is no rule to remember:
// sw.js takes the shell over on every CACHE bump, both apps now watch for that, and the app asks for the reload.
// This suite holds the four things that make it safe, in both apps:
//   · a FIRST install says nothing (controllerchange fires there too, with nothing stale behind it);
//   · a new worker over an old one shows one line, in that app's own look, with a Reload that reloads;
//   · program.html never speaks mid-session, and the line lands as soon as the session is over;
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

// What the line looks like right now, and whether a tap on it reloads.
const readLine = `(() => {
  const el = document.getElementById('home-newver');
  if (!el || el.hidden) return { on: false };
  const b = el.querySelector('.po-btn'), r = b.getBoundingClientRect(), cs = getComputedStyle(el);
  return { on: true, k: el.querySelector('.po-k').textContent, txt: el.querySelector('.po-txt').textContent,
    btn: b.textContent.trim(), h: Math.round(r.height), ask: el.classList.contains('is-ask'),
    stripe: cs.boxShadow, top: Math.round(el.getBoundingClientRect().top) }; })()`;

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
      !(await p.evaluate(readLine)).on && await p.evaluate(() => NEW_VERSION === false), '');

    // A first install claims this page too (clients.claim), with nothing stale behind it.
    await p.evaluate(() => { _hadWorker = false; swTookOver(); });
    C.check('program: a FIRST install says nothing — there is no old version behind it',
      !(await p.evaluate(readLine)).on && await p.evaluate(() => NEW_VERSION === false), '');

    // A new worker over an old one: the real path, through the handler controllerchange calls.
    await p.evaluate(() => { _hadWorker = true; swTookOver(); });
    const line = await p.evaluate(readLine);
    C.check('program: a new worker over an old one shows ONE line on Home, in Amir\'s words',
      line.on && line.txt === WORDS && line.k === 'New version' && line.btn === 'Reload', JSON.stringify(line));
    C.check('program: it is the Home banner asking for something — the clay stripe, a 44 px tap target',
      line.ask && /rgb\(194, 81, 44\)/.test(line.stripe) && line.h >= 44, JSON.stringify({ ask: line.ask, stripe: line.stripe, h: line.h }));
    C.check('program: it sits under the greeting, below the plan line, not over the top of the screen',
      line.top > 40, String(line.top));

    // The button is the one door, and one tap goes through it once.
    const wired = await p.evaluate(() => document.querySelector('#home-newver .po-btn').getAttribute('onclick'));
    await p.evaluate(() => document.querySelector('#home-newver .po-btn').click());
    C.check('program: Reload is the one door, and one tap goes through it once',
      wired === 'reloadNewVersion()' && await p.evaluate(() => window.__reloads) === 1,
      JSON.stringify({ wired, n: await p.evaluate(() => window.__reloads) }));

    // Mid-session the line is held: a reload would take the sets on the screen with it.
    await p.evaluate(() => { document.body.classList.add('session-on'); paintNewVersion(); });
    const held = await p.evaluate(readLine);
    C.check('program: NEVER mid-session — the line is held while a session is under way',
      !held.on && await p.evaluate(() => NEW_VERSION === true), JSON.stringify(held));
    // ...and it comes back by itself the moment the session is over.
    await p.evaluate(() => { document.body.classList.remove('session-on'); paintNewVersion(); });
    C.check('program: once the session is over the line lands by itself',
      (await p.evaluate(readLine)).on, '');

    // Coming back to Home from another tab paints it (it may have arrived while they were elsewhere).
    await p.evaluate(() => { document.getElementById('home-newver').hidden = true; goTo('plan'); goTo('home'); });
    C.check('program: coming back to Home paints it', (await p.evaluate(readLine)).on, '');

    // The guide names the control (CNT-01).
    const guide = await p.evaluate(() => APP_GUIDE.map(c => c.body).join(' '));
    C.check('program: the in-app guide names the line and the Reload (CNT-01)',
      guide.includes(WORDS) && /<strong>Reload<\/strong>/.test(guide), '');

    await ctx.close();
  }

  // Neither the demo nor the coach's preview is an installed app anyone trains in.
  for (const [what, query] of [['demo', '?client=demo'], ['the coach preview', '?preview=1']]) {
    const { ctx, p } = await H.openProgram(browser, { query });
    await p.evaluate(() => { _hadWorker = true; swTookOver(); });
    C.check(`program: ${what} stands down`,
      await p.evaluate(() => versionWatchOff() === true && NEW_VERSION === false) && !(await p.evaluate(readLine)).on, '');
    await ctx.close();
  }

  // ── habits.html (AA Proof) ────────────────────────────────────────────────
  const proofRow = `(() => {
    const el = document.querySelector('#app .newver');
    if (!el) return { on: false };
    const b = el.querySelector('.nv-go'), r = b.getBoundingClientRect(), cs = getComputedStyle(el);
    return { on: true, txt: el.querySelector('.nv-t').textContent, btn: b.textContent.trim(),
      h: Math.round(r.height), stripe: cs.boxShadow,
      aboveScroll: el.compareDocumentPosition(document.getElementById('scroll')) === 4 }; })()`;
  {
    const { ctx, p } = await H.openProof(browser);
    await p.evaluate(() => { window.__reloads = 0; window.reloadNewVersion = () => { window.__reloads++; }; });

    C.check('proof: nothing is said until a new worker takes over',
      !(await p.evaluate(proofRow)).on && await p.evaluate(() => UI.newver === false), '');

    await p.evaluate(() => { _hadWorker = false; swTookOver(); });
    C.check('proof: a FIRST install says nothing',
      !(await p.evaluate(proofRow)).on && await p.evaluate(() => UI.newver === false), '');

    await p.evaluate(() => { _hadWorker = true; swTookOver(); });
    const row = await p.evaluate(proofRow);
    C.check('proof: a new worker over an old one shows ONE row, the same words',
      row.on && row.txt === WORDS && row.btn === 'Reload', JSON.stringify(row));
    C.check('proof: it is AA Proof\'s own look — the clay stripe, a 40 px tap target, under the header',
      /rgb\(226, 100, 58\)/.test(row.stripe) && row.h >= 40 && row.aboveScroll, JSON.stringify({ stripe: row.stripe, h: row.h, above: row.aboveScroll }));

    await p.evaluate(() => document.querySelector('#app .nv-go').click());
    C.check('proof: one tap on Reload goes through once', await p.evaluate(() => window.__reloads) === 1,
      String(await p.evaluate(() => window.__reloads)));

    // It survives a re-render: a tick, a screen change, anything.
    await p.evaluate(() => { go('progress'); });
    C.check('proof: the row stays until it is tapped — a screen change does not drop it',
      (await p.evaluate(proofRow)).on, '');

    await ctx.close();
  }

  // The embed on the training app's Home: nothing, and no way to reload the wrong document.
  {
    const { ctx, p } = await H.openProof(browser, { url: '/habits.html?embed=1' });
    await p.evaluate(() => { window.__reloads = 0; window.reloadNewVersion = () => { window.__reloads++; }; });
    await p.evaluate(() => { _hadWorker = true; swTookOver(); });
    const emb = await p.evaluate(proofRow);
    C.check('proof: the EMBED on Home shows nothing and offers no reload',
      !emb.on && await p.evaluate(() => versionWatchOff() === true && UI.newver === false && window.__reloads === 0), JSON.stringify(emb));
    // Even if the flag were set, the strip has no row to draw it in.
    await p.evaluate(() => { UI.newver = true; render(); });
    C.check('proof: the embed has no row to draw even when the flag is set',
      !(await p.evaluate(proofRow)).on, '');
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
  }
  C.check('both apps say the same words, so an athlete reads one sentence',
    (prog.match(new RegExp(WORDS, 'g')) || []).length >= 1 && prf.includes(WORDS), '');
  for (const [name, src] of [['program.html', prog], ['habits.html', prf]]) {
    C.check(`${name}: Reload's one door really reloads`,
      /function reloadNewVersion\(\) \{ location\.reload\(\); \}/.test(src), '');
  }
  C.check('sw.js still names its cache, and the bump that ships this is in it',
    /^const CACHE = 'aap-v(\d+)';$/m.test(sw) && Number(sw.match(/aap-v(\d+)/)[1]) >= 188,
    (sw.match(/aap-v\d+/) || [])[0]);

  process.exit(C.report());
})();
