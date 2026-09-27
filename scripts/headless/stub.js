// A fake supabase-js for the headless checks (scripts/headless/). Injected before any app script
// runs (Playwright's addInitScript), so program.html and habits.html never reach the network.
// Its config lives in localStorage '__stubcfg', so every navigation (and Proof's iframe on Home)
// picks it up; window.__STUB can be changed live. Config: mode ('online' | 'offline' | 'nostatus' |
// '5xx' | 'refuse' | 'empty'), program (what get_program answers), demo, progress, session
// ({ user: { id } } = signed in), identity (the athlete id athlete_identities answers), stall
// ({ rpcName: true } never answers), refuse ([rpcNames]), expired, signInOk, noLib (no library at all).
// Every call is recorded in window.__STUB.calls ("rpc:get_program") and its params in .params.
(function () {
  var cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('__stubcfg') || '{}'); } catch (e) {}
  if (cfg.noLib) return;                       // no library at all: the CDN tag fails, nothing else
  var S = window.__STUB = Object.assign({ mode: 'online', calls: [], stall: {} }, cfg, { calls: [] });
  function res(o) { return Promise.resolve(o); }
  function answer(kind, name, params) {
    S.calls.push(kind + ":" + name); (S.params = S.params || []).push([name, params || null]);
    if (S.stall && S.stall[name]) return new Promise(function () {});
    var m = S.mode;
    if (m === 'offline') return res({ data: null, error: { message: 'TypeError: Failed to fetch' }, status: 0, statusText: '' });
    if (m === 'nostatus') return res({ data: null, error: { message: 'offline (stub)' } });
    if (m === '5xx') return res({ data: null, error: { message: 'upstream' }, status: 503 });
    if (m === 'refuse' || (S.refuse && S.refuse.indexOf(name) >= 0)) return res({ data: null, error: { message: 'invalid athlete key', code: 'P0001' }, status: 400 });
    if (name === 'get_program') {
      if (m === 'empty') return res({ data: null, error: null, status: 200 });
      var id = params && params.p_athlete_id;
      var prog = id === 'demo' ? S.demo : S.program;
      return res({ data: JSON.parse(JSON.stringify(prog)), error: null, status: 200 });
    }
    if (name === 'get_progress') return res({ data: S.progress || null, error: null, status: 200 });
    if (name === 'athlete_identities') return res({ data: S.identity ? { athlete_id: S.identity } : null, error: null, status: 200 });
    return res({ data: null, error: null, status: 200 });
  }
  function thenable(kind, name, params) {
    var p = new Proxy(function () {}, {
      get: function (t, k) {
        if (k === 'then') return function (ok, bad) { return answer(kind, name, params).then(ok, bad); };
        return function () { return p; };
      },
      apply: function () { return p; }
    });
    return p;
  }
  var client = {
    rpc: function (name, params) { return thenable('rpc', name, params); },
    from: function (table) { return thenable('from', table); },
    auth: {
      getSession: function () {
        if (S.mode === 'offline' && S.expired) return res({ data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } });
        return res({ data: { session: S.session || null }, error: null });
      },
      getUser: function () { return res({ data: { user: S.session ? S.session.user : null }, error: null }); },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
      signOut: function () { S.calls.push('auth:signOut'); return res({ error: null }); },
      signInWithPassword: function () { S.calls.push('auth:signIn'); return res(S.signInOk ? { error: null, data: {} } : { error: { message: 'stub' } }); }
    },
    channel: function () { return new Proxy({}, { get: function () { return function () { return this; }; } }); },
    removeChannel: function () {}
  };
  Object.defineProperty(window, 'supabase', { value: { createClient: function () { return client; } }, writable: false });
})();
