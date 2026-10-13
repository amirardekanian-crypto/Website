// A phone whose clock runs behind must still open its plan (SITE-AUDIT 25b): node scripts/headless/clock-skew.js
//
// supabase-js decides by the phone's clock whether a token has expired. A phone 89 minutes behind (one Irancell iPhone in the 2026-10-04 reach reports) keeps sending an
// hour-old token, the server answers 401 "JWT expired", and program.html read that as a refusal: "Plan not available", and the saved plan thrown away. Each app now hands
// createClient a fetch that refreshes the session once on that answer and repeats the call (fetchRetryExpired; scripts/test_fetch_retry.js tests the function itself).
//
// This runs the REAL page with the REAL library (the bundle tennis/app/lib/supabase.js ships) against a mock Supabase that knows which token it still accepts, in two
// pages: the page as it is, and the same page with the fix taken out (the control, so the symptom is shown too). The phone's clock is not faked: the stored session says
// it has an hour left, the mock says the token is gone, which is the same disagreement.
//
// Serve the repo first: python3 -m http.server 8765 --bind 127.0.0.1 (see lib.js), then node scripts/headless/clock-skew.js
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const ROOT = path.join(__dirname, '..', '..');
const SB = 'https://bvipfipbdcyqnbczjmaq.supabase.co';
const LIB_URL = '**/npm/@supabase/supabase-js@2**';   // the pinned file (2026-10-13: @2.117.3/dist/umd/supabase.js)
const LIB_JS = fs.readFileSync(path.join(ROOT, 'tennis/app/lib/supabase.js'), 'utf8');     // `var supabase = (...)`: window.supabase, as the CDN build does
const FIX = 'createClient(SB_URL, SB_KEY, { global: { fetch: fetchRetryExpired(() => _sbClient) } })';
const WITHOUT_FIX = 'createClient(SB_URL, SB_KEY)';

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (tag, exp) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'user-1', role: 'authenticated', aud: 'authenticated', exp, tag })}.sig`;
const tagOf = auth => { try { return JSON.parse(Buffer.from(auth.replace(/^Bearer /, '').split('.')[1], 'base64url').toString()).tag; } catch (e) { return null; } };
const USER = { id: 'user-1', aud: 'authenticated', role: 'authenticated', email: `athlete.${H.ID}@amirardekani.com`, app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

// The mock server. Tokens tagged 'new' are accepted; anything else is an expired token. Returns its log of [METHOD path status tag].
function mockServer(program) {
  const log = [];
  const handler = async (route, request) => {
    const url = new URL(request.url());
    const h = request.headers();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': h['access-control-request-headers'] || '*',
                   'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': '*' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const tag = tagOf(h['authorization'] || '');
    const reply = (status, body) => {
      log.push(`${request.method()} ${url.pathname} ${status} ${tag || '-'}`);
      return route.fulfill({ status, headers: Object.assign({ 'content-type': 'application/json' }, cors), body: JSON.stringify(body) });
    };
    if (url.pathname === '/auth/v1/token') {
      return reply(200, { access_token: jwt('new', Math.floor(Date.now() / 1000) + 3600), token_type: 'bearer', expires_in: 3600,
                          expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'refresh-2', user: USER });
    }
    if (url.pathname === '/auth/v1/user') return reply(200, USER);
    if (url.pathname.startsWith('/rest/v1/')) {
      if (tag !== 'new') return reply(401, { code: 'PGRST301', details: null, hint: null, message: 'JWT expired' });
      if (url.pathname.endsWith('/rpc/get_program')) return reply(200, program);
      if (url.pathname.endsWith('/athlete_identities')) {
        const one = (h['accept'] || '').includes('vnd.pgrst.object');
        return reply(200, one ? { athlete_id: H.ID } : [{ athlete_id: H.ID }]);
      }
      return reply(200, /rpc\/get_(my_history|exercises|qualities)$/.test(url.pathname) ? [] : null);
    }
    return reply(404, {});
  };
  return { handler, log };
}

// program.html on a phone whose stored session still looks valid. `withFix: false` takes the fix out of the page (the control).
async function openPage(browser, withFix) {
  const server = mockServer(H.fixture());
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, serviceWorkers: 'block' });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(SB + '/')) return server.handler(r, r.request());
    if (u.includes('/npm/@supabase/supabase-js@2')) return r.fulfill({ contentType: 'application/javascript', body: LIB_JS });
    if (u === H.BASE + '/program.html' || u.startsWith(H.BASE + '/program.html?')) {
      let html = fs.readFileSync(path.join(ROOT, 'program.html'), 'utf8');
      if (!withFix) {
        if (!html.includes(FIX)) throw new Error('the page no longer creates its client the way this control expects: ' + FIX);
        html = html.replace(FIX, WITHOUT_FIX);
      }
      return r.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
    }
    return u.startsWith(H.BASE + '/') ? r.continue() : r.abort();
  });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e.message || e)));
  await p.goto(H.BASE + '/robots.txt');
  // The phone's storage: a session the phone's clock says has 5000 s left (the server has already expired it), the athlete it remembers, and the plan it saved last time.
  await p.evaluate(([id, session, plan]) => {
    localStorage.clear();
    localStorage.setItem('sb-bvipfipbdcyqnbczjmaq-auth-token', JSON.stringify(session));
    localStorage.setItem('aa_athlete_id', id);
    localStorage.setItem(id + '_welcomed', '1');
    localStorage.setItem('a2hs_dismissed_v1', '1');
    localStorage.setItem('plancache', JSON.stringify({ id, at: new Date().toISOString(), data: plan }));
  }, [H.ID, { access_token: jwt('old', Math.floor(Date.now() / 1000) - 600), refresh_token: 'refresh-1', token_type: 'bearer', expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 5000, user: USER }, H.fixture()]);
  await p.goto(H.BASE + '/program.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
  await p.waitForTimeout(600);
  const state = await p.evaluate(() => ({
    errorShown: !!document.querySelector('#error-screen.visible'),
    errorTitle: (document.getElementById('error-title') || {}).textContent || '',
    signInShown: !!document.querySelector('#signin-screen.visible'),
    hasPlan: /alex/i.test(document.body.innerText),   // the greeting names the athlete (CSS upper-cases innerText)
    ls: Object.keys(localStorage),
  }));
  return { ctx, p, server, state };
}

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  // The control: the page without the fix, on a phone with a wrong clock.
  let r = await openPage(browser, false);
  const rest = log => log.filter(l => l.includes('/rest/v1/'));
  t.check('control, the page without the fix: "Plan not available" (the field report)', r.state.errorShown && /Plan not available/.test(r.state.errorTitle) && !r.state.hasPlan, JSON.stringify(r.state));
  t.check('control: the first answer was 401 and nothing refreshed the token', rest(r.server.log).some(l => / 401 old$/.test(l)) && !r.server.log.some(l => l.includes('/auth/v1/token')), r.server.log.join(' | '));
  t.check('control: the plan saved on the phone was thrown away', !r.state.ls.includes('plancache'), r.state.ls.join(','));
  await r.ctx.close();

  // The page as it is.
  r = await openPage(browser, true);
  t.check('the page as it is: the plan opens', !r.state.errorShown && !r.state.signInShown && r.state.hasPlan, JSON.stringify(r.state));
  t.check('it refreshed the token once, and every call that got through used the new one',
    r.server.log.filter(l => l.includes('/auth/v1/token')).length === 1 && rest(r.server.log).filter(l => / 200 /.test(l)).every(l => / new$/.test(l)), r.server.log.join(' | '));
  t.check('the athlete was found by the same rule (athlete_identities answered after the refresh)', r.server.log.some(l => /athlete_identities 200 new$/.test(l)), r.server.log.join(' | '));
  t.check('get_program was refused once and then answered', r.server.log.filter(l => l.includes('rpc/get_program')).map(l => l.split(' ')[2]).slice(0, 2).join(',') === '401,200', r.server.log.join(' | '));
  t.check('the saved plan is still on the phone', r.state.ls.includes('plancache'), r.state.ls.join(','));
  t.check('no script error on the page', r.p.errs.length === 0, r.p.errs.join(' | '));
  await r.ctx.close();

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})();
