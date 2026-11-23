// Every form reaches the server, or keeps trying (2026-11-23, Amir: "make sure it happens and we dont miss any ones data"):
// node scripts/headless/intake-send.js
//
// assets/js/intake-send.js is every form's road to submit_intake() (form, form-fa, etminan ×3, uts-padel, the Proof signup, the
// partner form). The server and the email (Web3Forms) are both faked here, so each case is exact:
//   1. Proof: the server fails twice, then takes it. Three tries, ONE retry id on all three, the success screen, nothing left queued.
//   2. Proof: the server cannot be reached, the email goes. Success (the email is still a road), and the submission waits on the phone.
//   3. The next visit with the server back: the waiting submission is sent by itself, with its id, and the queue is empty.
//   4. Proof: the server refuses the data itself (400). One try only, nothing queued (it would be refused for ever).
//   5. Proof: both roads fail. The error and the answers stay; the submission waits on the phone.
//   6. Partner form: the email fails, the server takes it. Success, programme "Partner application", lang fa.
//   7. The six intake pages load the helper and send their submit_intake through it (no page errors).
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');
const SB = 'https://bvipfipbdcyqnbczjmaq.supabase.co/rest/v1/rpc/submit_intake';

// One page with the two roads faked. server: a list of answers in order ('ok', 'fail' = 500, 'refuse' = 400, 'down' = no network),
// the last one repeating. mail: 'ok' | 'fail'. Returns the page and the bodies the server was sent.
async function open(browser, path, { server = ['ok'], mail = 'ok', ctx = null } = {}) {
  const c = ctx || await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const sent = [];
  let n = 0;
  await c.unroute('**/*').catch(() => {});
  await c.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(SB)) {
      sent.push(r.request().postData() || '');
      const a = server[Math.min(n++, server.length - 1)];
      if (a === 'down') return r.abort();
      if (a === 'refuse') return r.fulfill({ status: 400, contentType: 'application/json', body: '{"message":"intake payload must be a non-empty object"}' });
      if (a === 'fail') return r.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
      return r.fulfill({ status: 200, contentType: 'application/json', body: '"00000000-0000-4000-8000-000000000001"' });
    }
    if (u.startsWith('https://api.web3forms.com/')) {
      return mail === 'ok' ? r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }) : r.abort();
    }
    return u.startsWith(H.BASE + '/') ? r.continue() : r.abort();
  });
  const p = await c.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e.message || e)));
  await p.goto(H.BASE + path, { waitUntil: 'load' });
  return { c, p, sent };
}
const queued = p => p.evaluate(() => JSON.parse(localStorage.getItem('aa_intake_q') || '[]'));
const cidOf = body => { try { return JSON.parse(body).p_payload._cid || ''; } catch (e) { return ''; } };
async function proofSubmit(p) {
  await p.fill('#pname', 'Sara Test'); await p.fill('#pmail', 'sara@example.com'); await p.fill('#pwa', '+44 7700 900123');
  await p.click('#pSubmit');
}
const waitDone = (p, ms) => p.waitForFunction(() => document.getElementById('pDone').classList.contains('on') || !document.getElementById('pError').hidden, null, { timeout: ms || 25000 }).catch(() => {});

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  try {
    // 1
    let { c, p, sent } = await open(browser, '/proof.html', { server: ['fail', 'fail', 'ok'] });
    await proofSubmit(p); await waitDone(p);
    // The success screen comes with the first road that says yes (the email here); the server's tries go on behind it.
    for (let t = 0; t < 30 && sent.length < 3; t++) await p.waitForTimeout(500);
    await p.waitForTimeout(500);
    let done = await p.evaluate(() => document.getElementById('pDone').classList.contains('on'));
    C.check('1a. Proof: the server failed twice and took the third try', sent.length === 3, sent.length);
    C.check('1b. all three tries carry the same retry id', sent.length === 3 && cidOf(sent[0]) && sent.every(b => cidOf(b) === cidOf(sent[0])), sent.map(cidOf).join(' '));
    C.check('1c. the success screen, nothing queued', done && (await queued(p)).length === 0, JSON.stringify({ done, q: (await queued(p)).length }));
    const body = sent[2] ? JSON.parse(sent[2]) : { p_payload: {} };
    C.check('1d. saved as a Proof signup, with the name, email and number', body.p_programme === 'AA Proof (free)' && body.p_name === 'Sara Test'
      && body.p_email === 'sara@example.com' && /7700/.test(body.p_contact) && !('access_key' in body.p_payload) && !('botcheck' in body.p_payload), sent[2]);
    C.check('1e. no page errors', p.errs.length === 0, p.errs.join(' | '));
    await c.close();

    // 2 and 3: one browser profile, so the phone's queue carries to the next visit
    c = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    ({ p, sent } = await open(browser, '/proof.html', { server: ['down'], mail: 'ok', ctx: c }));
    await proofSubmit(p); await waitDone(p);
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('aa_intake_q') || '[]').length > 0, null, { timeout: 25000 }).catch(() => {});
    done = await p.evaluate(() => document.getElementById('pDone').classList.contains('on'));
    let q = await queued(p);
    C.check('2a. server down, email went: the success screen', done, done);
    C.check('2b. the submission waits on the phone, with its id', q.length === 1 && cidOf(q[0].body) && cidOf(q[0].body) === cidOf(sent[0]), JSON.stringify(q.map(x => cidOf(x.body))));
    const waiting = cidOf(q[0] && q[0].body);
    await p.close();
    ({ p, sent } = await open(browser, '/form.html', { server: ['ok'], ctx: c }));   // any form page, the server back
    await p.waitForFunction(() => !localStorage.getItem('aa_intake_q'), null, { timeout: 15000 }).catch(() => {});
    q = await queued(p);
    C.check('3. the next visit sends it by itself, with the same id, and the queue is empty', q.length === 0 && sent.length === 1 && cidOf(sent[0]) === waiting,
      JSON.stringify({ q: q.length, sent: sent.map(cidOf), waiting }));
    await c.close();

    // 4
    ({ c, p, sent } = await open(browser, '/proof.html', { server: ['refuse'], mail: 'ok' }));
    await proofSubmit(p); await waitDone(p); await p.waitForTimeout(800);
    C.check('4. a refusal of the data is tried once and never queued', sent.length === 1 && (await queued(p)).length === 0, JSON.stringify({ sent: sent.length, q: (await queued(p)).length }));
    await c.close();

    // 5
    ({ c, p, sent } = await open(browser, '/proof.html', { server: ['down'], mail: 'fail' }));
    await proofSubmit(p); await waitDone(p, 40000);
    await p.waitForFunction(() => !document.getElementById('pError').hidden, null, { timeout: 40000 }).catch(() => {});
    const err = await p.evaluate(() => ({ shown: !document.getElementById('pError').hidden, name: document.getElementById('pname').value }));
    C.check('5a. both roads failed: the error shows and the answers stay', err.shown && err.name === 'Sara Test', JSON.stringify(err));
    C.check('5b. the submission still waits on the phone', (await queued(p)).length === 1, (await queued(p)).length);
    await c.close();

    // 6
    ({ c, p, sent } = await open(browser, '/partner-fa.html', { server: ['ok'], mail: 'fail' }));
    await p.fill('#fn', 'Coach Test'); await p.fill('#ig', '@coach_test'); await p.fill('#wa', '09121234567');
    await p.evaluate(() => {
      const f = document.getElementById('frm');
      f.querySelectorAll('input:not([type=hidden]):not([name="botcheck"]),select,textarea').forEach(el => {
        if (!el.hasAttribute('required')) return;
        if (el.type === 'checkbox') { el.checked = true; return; }
        if (el.value) return;
        if (el.tagName === 'SELECT') el.selectedIndex = Math.max(1, el.selectedIndex);
        else if (el.type === 'email') el.value = 'coach@example.com';
        else el.value = 'test';
      });
    });
    await p.click('#sbtn');
    await p.waitForFunction(() => document.getElementById('ok').classList.contains('on') || !document.getElementById('serr').hidden, null, { timeout: 25000 }).catch(() => {});
    const ok6 = await p.evaluate(() => document.getElementById('ok').classList.contains('on'));
    if (!ok6) console.log('partner form state:', await p.evaluate(() => JSON.stringify({ serr: document.getElementById('serr').textContent,
      ferr: [...document.querySelectorAll('.ferr')].map(e => e.closest('.f').querySelector('[name]').name + ': ' + e.textContent),
      pm: [...document.getElementById('pm').options].map(o => o.value + (o.disabled ? '(disabled)' : '')) })));
    const b6 = sent[0] ? JSON.parse(sent[0]) : {};
    C.check('6. partner form: the email failed, the server took it: success, saved as a partner application in Farsi',
      ok6 && b6.p_programme === 'Partner application' && b6.p_lang === 'fa' && b6.p_name === 'Coach Test', JSON.stringify({ ok6, prog: b6.p_programme, lang: b6.p_lang, name: b6.p_name }));
    C.check('6b. no page errors', p.errs.length === 0, p.errs.join(' | '));
    await c.close();

    // 7
    for (const page of ['/form.html', '/form-fa.html', '/etminan.html', '/etminan-en.html', '/etminan-dv.html', '/uts-padel.html']) {
      ({ c, p } = await open(browser, page));
      const r = await p.evaluate(() => ({ helper: !!(window.AAIntake && AAIntake.fetch),
        routed: [...document.scripts].some(s => /AAIntake\s*\??\s*AAIntake\.fetch\s*:\s*fetch\)\(SB_URL/.test(s.textContent)) }));
      C.check(`7. ${page}: the helper is loaded and submit_intake goes through it`, r.helper && r.routed && p.errs.length === 0, JSON.stringify({ ...r, errs: p.errs }));
      await c.close();
    }
  } finally { await browser.close(); }
  process.exit(C.report() ? 1 : 0);
})();
