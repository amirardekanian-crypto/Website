// The reminders client (assets/js/push.js) and the two apps' wiring of it.
//
//   PLAYWRIGHT=<scratch>/node_modules/playwright node scripts/headless/reminders.js
//
// A real permission grant cannot be driven headlessly, and the point of this feature is that only the
// athlete can give it. So what is checked here is everything AROUND that tap — the state machine that
// decides what the app offers, the rule that a kind nobody switched is ON, and the promises the apps
// make about where this never runs. The server half is proved separately by
// scripts/push/rehearse_push.mjs, and the crypto by scripts/push/test_webpush.mjs.
const path = require('path');
const fs = require('fs');
const { launch } = require('./lib.js');

const ROOT = path.resolve(__dirname, '..', '..');
let passed = 0, failed = 0;
const ok = (c, what, detail) => {
  if (c) { passed++; console.log('PASS ' + what); }
  else { failed++; console.log('FAIL ' + what + (detail !== undefined ? '  ' + JSON.stringify(detail).slice(0, 300) : '')); }
};

(async () => {
  // A blank page on a secure-enough origin: push.js only needs a window to attach to, and every
  // check below is of its own logic, not of a page that loads it.
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto('about:blank');

  // ── the state machine ──────────────────────────────────────────────────────
  // pushState() is what every screen reads to decide what to offer, so each answer is checked
  // against the conditions that produce it rather than against itself.
  await page.addScriptTag({ path: path.join(ROOT, 'assets', 'js', 'push.js') });
  ok(await page.evaluate(() => !!window.AAPush), 'push.js defines AAPush');

  const api = await page.evaluate(() => Object.keys(window.AAPush).sort());
  ok(['asked', 'device', 'disable', 'enable', 'kindOn', 'markAsked', 'me', 'set', 'state', 'tzOffset', 'VAPID_PUBLIC']
       .every(k => api.includes(k)), 'it exposes the whole client', api);

  const st = await page.evaluate(() => window.AAPush.state());
  ok(['on', 'off', 'blocked', 'needs-install', 'unsupported'].includes(st),
     'state() answers one of the five', st);

  // ── a kind nobody switched is ON ───────────────────────────────────────────
  // This is the same rule the server uses (public.push_on), and the two must agree or an athlete
  // sees a switch in one position and gets the other behaviour.
  const kinds = await page.evaluate(() => {
    const K = window.AAPush.kindOn;
    return {
      noRow: K(null, 'habits'),
      empty: K({ kinds: {} }, 'habits'),
      onTrue: K({ kinds: { habits: true } }, 'habits'),
      offFalse: K({ kinds: { habits: false } }, 'habits'),
      otherKind: K({ kinds: { habits: false } }, 'workout'),
    };
  });
  ok(kinds.noRow === true, 'no settings at all: a kind is ON');
  ok(kinds.empty === true, 'an empty switch list: ON');
  ok(kinds.onTrue === true, 'switched on: ON');
  ok(kinds.offFalse === false, 'switched off: OFF');
  ok(kinds.otherKind === true, 'and switching one off leaves the others alone');

  // ── the offset the server needs ────────────────────────────────────────────
  const tz = await page.evaluate(() => window.AAPush.tzOffset());
  ok(Number.isInteger(tz) && tz >= -840 && tz <= 840,
     'tzOffset() is minutes east of UTC, inside what the column accepts', tz);
  ok(tz === -new Date().getTimezoneOffset(),
     'and it is the sign the server expects (east of UTC is positive)', tz);

  const dev = await page.evaluate(() => window.AAPush.device());
  ok(typeof dev === 'string' && dev.length > 0 && dev.length <= 120,
     'device() is a short line and fits the column', dev);
  ok(!/\d{4,}/.test(dev), 'and carries no id or long number', dev);

  // ── the key the apps subscribe with must be the key the sender signs with ──
  // If these ever disagree every push is refused with 403 and nothing else looks wrong.
  const pageKey = await page.evaluate(() => window.AAPush.VAPID_PUBLIC);
  const testPage = fs.readFileSync(path.join(ROOT, 'pushtest', 'index.html'), 'utf8');
  ok(/^[A-Za-z0-9_-]{87,88}$/.test(pageKey), 'the VAPID public key looks like a P-256 point', pageKey.length);
  ok(testPage.includes(pageKey), 'the test page at /pushtest/ uses the SAME key as the apps');

  await browser.close();

  // ── what the source promises, checked in the source ────────────────────────
  const proof = fs.readFileSync(path.join(ROOT, 'habits.html'), 'utf8');
  const train = fs.readFileSync(path.join(ROOT, 'program.html'), 'utf8');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

  ok(/IS_EMBED/.test(proof.slice(proof.indexOf('function pushReady'), proof.indexOf('function pushReady') + 300)),
     'AA Proof never offers reminders in the embedded strip (one phone would be asked twice)');
  ok(/!DEMO/.test(train.slice(train.indexOf('function pushReady'), train.indexOf('function pushReady') + 300)),
     'the training app never offers them in the demo');
  for (const [name, src] of [['habits.html', proof], ['program.html', train]]) {
    ok(src.includes('/assets/js/push.js'), `${name} loads the shared client`);
    ok(!src.includes('applicationServerKey'), `${name} does not subscribe on its own (one copy, in push.js)`);
  }
  ok(sw.includes("addEventListener('push'") && sw.includes("addEventListener('notificationclick'"),
     'the service worker has both handlers');
  ok(/showNotification/.test(sw), 'and always shows something (userVisibleOnly is a promise to the browser)');
  ok(sw.includes("'/assets/js/push.js'"), 'push.js is in the precached shell');

  // The lock screen is read by whoever picks the phone up.
  const stage = fs.readFileSync(path.join(ROOT, 'supabase', 'stage84_push.sql'), 'utf8');
  const lines = stage.slice(stage.indexOf('create or replace function public.push_lines'),
                            stage.indexOf('-- ── 4.'));
  ok(!/\bkg\b|\bRPE\b|reps/i.test(lines), 'no reminder carries a weight, reps or an RPE', lines.slice(0, 200));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
