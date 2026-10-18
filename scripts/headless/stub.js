// A fake supabase-js for the headless checks (scripts/headless/). Injected before any app script
// runs (Playwright's addInitScript), so program.html and habits.html never reach the network.
// Its config lives in localStorage '__stubcfg', so every navigation (and Proof's iframe on Home)
// picks it up; window.__STUB can be changed live. Config: mode ('online' | 'offline' | 'nostatus' |
// '5xx' | 'refuse' | 'empty'), program (what get_program answers), demo, progress, session
// ({ user: { id } } = signed in), identity (the athlete id athlete_identities answers), stall
// ({ rpcName: true } never answers), refuse ([rpcNames]), expired, signInOk, noLib (no library at all),
// library (what get_library answers: lib.js library() builds it from workouts/; without it the app reads the files),
// tables ({ name: rows } what sb.from(name) answers) and tableErr ({ name: status } a refused table read),
// profile (what get_profile answers: Career Mode, scripts/headless/career.js), awards (what get_awards answers: Career Mode phase 3's SHELF,
// stage70's split: get_profile() is the core and get_awards() the rows. Not set with a profile: the answer the server gives with the catalogue off,
// { athlete_id, catalogue: null, badges: [], achievements: [], titles: [], recent: [] }; no profile either: no answer), tellRemoves (Career Mode phase 3: mark_moments_told
// answers how many waiting moments it told and takes them out of the profile's `moments`, as the server's told_at does, and keeps the
// profile in '__stubcfg' so the OTHER app opened next in the same browser sees it; off by default: the stub never tells), told (every
// id mark_moments_told was given, as [app, award_id], in window.__STUB.told).
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
    if (name === 'get_library') return res({ data: S.library || null, error: null, status: 200 });
    // Career Mode (phase 2): get_profile answers the stub's `profile` as given (none set: no answer, as an RPC the stub does not know).
    if (name === 'get_profile') return res({ data: S.profile ? JSON.parse(JSON.stringify(S.profile)) : null, error: null, status: 200 });
    // Career Mode phase 3, the shelf (stage70's split): get_awards(p_athlete_id) is the athlete's own rows, read only when the shelf opens. Like the server it
    // refuses another athlete's id, and with the catalogue off it answers the empty shelf with no version.
    if (name === 'get_awards') {
      var who = params && params.p_athlete_id, mine = S.profile && S.profile.athlete_id;
      if (who && mine && who !== mine) return res({ data: null, error: { message: 'not your profile', code: 'P0001' }, status: 400 });
      if (S.awards) return res({ data: JSON.parse(JSON.stringify(S.awards)), error: null, status: 200 });
      if (S.profile) return res({ data: { athlete_id: mine, catalogue: null, badges: [], achievements: [], titles: [], recent: [] }, error: null, status: 200 });
      return res({ data: null, error: null, status: 200 });
    }
    // Career Mode phase 3 (the athlete's door to the moment queue, spec section 7): it answers the count told; with tellRemoves it behaves like
    // the server (the rows leave `moments`, the profile is kept for the next page of this browser).
    if (name === 'mark_moments_told') {
      var ids = (params && params.p_award_ids) || [], n = 0;
      (S.told = S.told || []).push.apply(S.told, ids.map(function (id) { return [params && params.p_app, id]; }));
      if (S.tellRemoves && S.profile && Array.isArray(S.profile.moments)) {
        S.profile.moments = S.profile.moments.filter(function (m) { var hit = m && ids.indexOf(m.award_id) >= 0; if (hit) n++; return !hit; });
        try { var c = JSON.parse(localStorage.getItem('__stubcfg') || '{}'); c.profile = S.profile; localStorage.setItem('__stubcfg', JSON.stringify(c)); } catch (e) {}
      }
      return res({ data: n, error: null, status: 200 });
    }
    if (name === 'athlete_identities') return res({ data: S.identity ? { athlete_id: S.identity } : null, error: null, status: 200 });
    // A table read (sb.from(name)): tables ({ career_facts: [rows] }) answers rows as given (filters and order are not applied);
    // tableErr ({ career_rules: 404 }) answers that status as a refusal. Neither set: no rows and no error, as before.
    if (kind === 'from' && S.tableErr && S.tableErr[name]) return res({ data: null, error: { message: 'stub ' + name, code: 'PGRST205' }, status: S.tableErr[name] });
    if (kind === 'from' && S.tables && S.tables[name]) return res({ data: JSON.parse(JSON.stringify(S.tables[name])), error: null, status: 200 });
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
