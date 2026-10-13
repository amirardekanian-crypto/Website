// A wrong phone clock must not break sign-in (SITE-AUDIT 25b): node scripts/test_fetch_retry.js
//
// supabase-js decides by the PHONE'S clock whether a token has expired. An Irancell iPhone 89 minutes behind kept sending an hour-old token and the server answered
// 401 "JWT expired" for an hour and a half of every cycle; program.html read that as a refusal ("Plan not available") and threw the saved plan away. Each of the four
// apps (program.html, habits.html, tennis/app/app.js, tennis-testing/app/app.js) now hands createClient a fetch, fetchRetryExpired(), that refreshes the session once on
// that answer and repeats the call.
//
// This test cuts the function out of all four files, requires them to be the same text, and runs the REAL supabase-js (the bundle the course app ships,
// tennis/app/lib/supabase.js) through it against a mock server that knows which token it still accepts. The first scenario is the field report; the control
// shows the same client WITHOUT the fetch failing as the field did. No browser, no network, no database. Pre-commit guard 18 runs it when one of the four files changes.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const FILES = ['program.html', 'habits.html', 'tennis/app/app.js', 'tennis-testing/app/app.js'];
let passed = 0, failed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log('ok   ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail ? '\n       ' + String(detail).split('\n').join('\n       ') : '')); }
}

// ── the four copies are one function ─────────────────────────────────────────────────────────────────────────────────────
function extract(src) {
  const start = src.indexOf('function fetchRetryExpired(getClient) {');
  if (start < 0) return null;
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(start, j + 1);
  }
  return null;
}
const norm = s => s.split(/\r?\n/).map(l => l.trim()).filter(Boolean).join('\n');
const sources = {}, fns = {};
for (const f of FILES) {
  sources[f] = fs.readFileSync(path.join(ROOT, f), 'utf8');
  fns[f] = extract(sources[f]);
}
check('all four apps define fetchRetryExpired()', FILES.every(f => fns[f]), FILES.filter(f => !fns[f]).join(', '));
if (!FILES.every(f => fns[f])) { console.log(`\n${passed} passed, ${failed} failed`); process.exit(1); }
const same = FILES.every(f => norm(fns[f]) === norm(fns[FILES[0]]));
check('the four copies are the same text (change one, change all)', same, FILES.filter(f => norm(fns[f]) !== norm(fns[FILES[0]])).join(', ') + ' differ from ' + FILES[0]);
for (const f of FILES) {
  const lines = sources[f].split('\n').filter(l => /\.createClient\(SB_URL, SB_KEY/.test(l));
  check(`${f}: every createClient(SB_URL, SB_KEY …) is given the retrying fetch`, lines.length >= 1 && lines.every(l => /global: \{ fetch: fetchRetryExpired\(\(\) => /.test(l)), lines.join('\n'));
}

// ── the real library, a mock server ──────────────────────────────────────────────────────────────────────────────────────
// SUPABASE_LIB=<a supabase-js UMD build> runs the same vectors on another version (program.html and habits.html load our own copy, /assets/js/supabase-2.117.3.js, and coach.html the same version from jsDelivr).
vm.runInThisContext(fs.readFileSync(process.env.SUPABASE_LIB || path.join(ROOT, 'tennis/app/lib/supabase.js'), 'utf8'));   // → a global named supabase
const lib = globalThis.supabase;
check('the real supabase-js bundle loads', lib && typeof lib.createClient === 'function');

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (tag, exp) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', aud: 'authenticated', exp, tag })}.sig-${tag}`;
// What the mock server calls a token: the `tag` inside the fake JWT, so a log line says 'old' or 'new'.
const jwtTag = bearer => { try { return JSON.parse(Buffer.from(String(bearer).replace(/^Bearer /, '').split('.')[1], 'base64url').toString()).tag; } catch (e) { return null; } };
const URL_ = 'https://project.test', KEY = 'sb_publishable_test';
const EXPIRED_BODY = { code: 'PGRST301', details: null, hint: null, message: 'JWT expired' };

// A server that accepts the tokens in `valid` and answers everything else 401 "JWT expired". `refresh` decides what the token endpoint says; `override(entry)`
// may return a Response to answer a request its own way.
function server({ valid, refresh = 'ok', override = null }) {
  const log = [];
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const tokens = [jwt('new', Math.floor(Date.now() / 1000) + 3600)];
  const fetchMock = async (input, init) => {
    const url = typeof input === 'string' ? input : String(input);
    const h = new Headers((init && init.headers) || undefined);
    const tag = jwtTag(h.get('authorization') || '');
    const entry = { url: url.replace(URL_, ''), method: (init && init.method) || 'GET', tag, apikey: h.get('apikey'), type: h.get('content-type'), body: init && init.body };
    log.push(entry);
    const own = override && override(entry);
    if (own) return own;
    if (url.includes('/auth/v1/token')) {
      if (refresh === 'fail') return json(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' });
      return json(200, { access_token: tokens[0], token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r2',
                         user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'athlete.a@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } });
    }
    if (url.includes('/rest/v1/')) {
      if (valid.includes(tag)) return json(200, { ok: true, as: tag });
      return json(401, EXPIRED_BODY);
    }
    return json(404, {});
  };
  return { fetchMock, log };
}

// The wrapper under test, built from the apps' own text.
const fetchRetryExpired = new Function('return ' + fns['program.html'])();

// The phone's session: a token the phone's clock still calls valid (expires_at in the future), which the server has already expired.
function phone({ retrying = true, expiresIn = 5000 } = {}) {
  const store = new Map();
  const storage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, v); }, removeItem: k => { store.delete(k); } };
  store.set('sb-test-auth-token', JSON.stringify({
    access_token: jwt('old', Math.floor(Date.now() / 1000) - 600), refresh_token: 'r1', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'athlete.a@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  }));
  let client;
  const opts = { auth: { storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb-test-auth-token' } };
  if (retrying) opts.global = { fetch: fetchRetryExpired(() => client) };
  client = lib.createClient(URL_, KEY, opts);
  return client;
}
const tags = log => log.map(e => `${e.method} ${e.url.split('?')[0]} [${e.tag}]`);

(async () => {
  const realFetch = globalThis.fetch;
  try {
    // 1. the control: the same client with no retrying fetch fails as the field did
    let s = server({ valid: ['new'] }); globalThis.fetch = s.fetchMock;
    let r = await phone({ retrying: false }).rpc('get_program', { p_athlete_id: 'a' });
    check('control: with no retrying fetch the call fails 401 "JWT expired" (the field report)', r.status === 401 && r.error && /JWT expired/.test(r.error.message) && s.log.length === 1, JSON.stringify(r));

    // 2. the field report: a token the phone calls valid and the server has expired
    s = server({ valid: ['new'] }); globalThis.fetch = s.fetchMock;
    r = await phone().rpc('get_program', { p_athlete_id: 'a' });
    check('a wrong clock: the call is answered, with the refreshed token', r.status === 200 && r.data && r.data.ok === true && r.data.as === 'new' && !r.error, JSON.stringify(r));
    const seen = tags(s.log);
    check('it asked once with the old token, refreshed once, asked again with the new one',
      seen.length === 3 && seen[0] === 'POST /rest/v1/rpc/get_program [old]' && seen[1].startsWith('POST /auth/v1/token') && seen[2] === 'POST /rest/v1/rpc/get_program [new]', seen.join('\n'));
    check('the repeated call carries the same body, apikey and content type', s.log[2].body === s.log[0].body && s.log[2].apikey === s.log[0].apikey && s.log[2].type === s.log[0].type && s.log[0].body.includes('"p_athlete_id"'), JSON.stringify([s.log[0], s.log[2]]));

    // 3. the next calls use the new token without another refresh
    const c3 = phone(); s = server({ valid: ['new'] }); globalThis.fetch = s.fetchMock;
    await c3.rpc('get_program', {});
    const before = s.log.length;
    const again = await c3.rpc('get_program', {});
    check('afterwards the session holds the new token: the next call needs no refresh', again.status === 200 && s.log.length === before + 1 && s.log[s.log.length - 1].tag === 'new', tags(s.log).join('\n'));

    // 4. three calls at once share one refresh
    s = server({ valid: ['new'] }); globalThis.fetch = s.fetchMock;
    const c4 = phone();
    const three = await Promise.all([c4.rpc('get_program', {}), c4.rpc('get_library', {}), c4.rpc('get_progress', {})]);
    const refreshes = s.log.filter(e => e.url.includes('/auth/v1/token')).length;
    check('three calls at once: all answered, and ONE refresh', three.every(x => x.status === 200 && !x.error) && refreshes === 1, `refreshes: ${refreshes}\n${tags(s.log).join('\n')}`);

    // 5. a table read goes the same way
    s = server({ valid: ['new'] }); globalThis.fetch = s.fetchMock;
    const t5 = await phone().from('athlete_identities').select('athlete_id');
    check('a table read (from().select()) is repeated the same way', t5.status === 200 && !t5.error && s.log.some(e => e.url.includes('/auth/v1/token')), JSON.stringify(t5));

    // 6. the refresh fails (the refresh token is gone): the original 401 stands, once, with its body readable
    s = server({ valid: ['new'], refresh: 'fail' }); globalThis.fetch = s.fetchMock;
    r = await phone().rpc('get_program', {});
    check('refresh refused: the original 401 "JWT expired" comes back, no second call', r.status === 401 && r.error && /JWT expired/.test(r.error.message) && s.log.filter(e => e.url.includes('/rest/v1/')).length === 1, JSON.stringify(r) + '\n' + tags(s.log).join('\n'));

    // 7. the repeated call is refused too: it is NOT repeated again
    s = server({ valid: [] }); globalThis.fetch = s.fetchMock;
    r = await phone().rpc('get_program', {});
    check('still 401 after the refresh: returned, and repeated only once', r.status === 401 && s.log.filter(e => e.url.includes('/rest/v1/')).length === 2 && s.log.filter(e => e.url.includes('/auth/v1/token')).length === 1, tags(s.log).join('\n'));

    // 8. other answers are left alone
    for (const [what, status, body] of [['a 401 that is not an expired token', 401, { message: 'No API key found in request', hint: 'No `apikey` request header or url param was found.' }],
                                        ['a 403', 403, { code: '42501', message: 'permission denied' }], ['a 400 refusal', 400, { code: 'P0001', message: 'invalid athlete key' }], ['a 500', 500, { message: 'boom' }]]) {
      s = server({ valid: ['new'], override: e => (e.url.includes('/rest/v1/') ? new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) : null) });
      globalThis.fetch = s.fetchMock;
      r = await phone().rpc('get_program', {});
      check(`${what}: returned as it came, no refresh`, r.status === status && !s.log.some(e => e.url.includes('/auth/v1/token')) && s.log.length === 1, JSON.stringify(r) + '\n' + tags(s.log).join('\n'));
    }

    // 9. a sign-in or refresh call is never retried, whatever it answers
    s = server({ valid: ['new'], override: e => (e.url.includes('/auth/v1/') ? new Response(JSON.stringify(EXPIRED_BODY), { status: 401 }) : null) }); globalThis.fetch = s.fetchMock;
    let refreshAsked = 0;
    const spy = { auth: { refreshSession: async () => { refreshAsked++; return { data: { session: { access_token: jwt('new', 1) } }, error: null }; } } };
    const direct = await fetchRetryExpired(() => spy)(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', body: '{}' });
    check('a /auth/v1/ call that answers 401 passes straight through: no refresh, no second call', direct.status === 401 && s.log.length === 1 && refreshAsked === 0, `refreshes: ${refreshAsked}, calls: ${s.log.length}`);

    // 10. the wrapper touches only what it must
    s = server({ valid: ['new'] }); globalThis.fetch = s.fetchMock;
    refreshAsked = 0;
    const u = await fetchRetryExpired(() => spy)(new URL(URL_ + '/rest/v1/rpc/a'), { headers: { Authorization: 'Bearer ' + jwt('old', 1) } });
    check('a URL object (not a string) passes straight through: no refresh, no second call', u.status === 401 && s.log.length === 1 && refreshAsked === 0, `refreshes: ${refreshAsked}, calls: ${s.log.length}`);
    s = server({ valid: ['new'] }); globalThis.fetch = s.fetchMock;
    const none = await fetchRetryExpired(() => null)(URL_ + '/rest/v1/rpc/a', { headers: { Authorization: 'Bearer ' + jwt('old', 1) } });
    check('no client to refresh with: the 401 stands', none.status === 401 && s.log.length === 1);
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    let threw = null; try { await fetchRetryExpired(() => null)(URL_ + '/rest/v1/rpc/a', {}); } catch (e) { threw = e; }
    check('no signal: the network error reaches the app exactly as before', threw instanceof TypeError && /Failed to fetch/.test(threw.message));

    // 11. headers given as a plain object, an array or a Headers all survive the repeat
    for (const [what, headers] of [['a plain object', { Authorization: 'Bearer ' + jwt('old', 1), apikey: KEY, 'X-Test': 'a' }], ['a Headers', new Headers({ Authorization: 'Bearer ' + jwt('old', 1), apikey: KEY, 'X-Test': 'a' })], ['an array', [['Authorization', 'Bearer ' + jwt('old', 1)], ['apikey', KEY], ['X-Test', 'a']]]]) {
      let repeated = null;
      s = server({ valid: ['new'] });
      const base = s.fetchMock;
      globalThis.fetch = async (i, init) => { if (String(i).includes('/rest/v1/') && jwtTag(new Headers(init.headers).get('authorization')) === 'new') repeated = new Headers(init.headers); return base(i, init); };
      const fakeClient = { auth: { refreshSession: async () => ({ data: { session: { access_token: jwt('new', Math.floor(Date.now() / 1000) + 3600) } }, error: null }) } };
      const out = await fetchRetryExpired(() => fakeClient)(URL_ + '/rest/v1/rpc/a', { method: 'POST', headers, body: '{"x":1}' });
      check(`headers as ${what}: the repeat keeps every other header and swaps only the token`, out.status === 200 && repeated && repeated.get('x-test') === 'a' && repeated.get('apikey') === KEY, out.status);
    }
  } catch (e) {
    failed++; console.log('CRASH ' + (e && e.stack || e));
  } finally {
    globalThis.fetch = realFetch;
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
