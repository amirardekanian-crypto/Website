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
    // Career Mode round 5 (stage77): get_my_moments answers the stub's `myMoments` (the athlete's goal, Amir's lines, "saw", honours), refusing another
    // athlete's id like the server; mark_note_read marks the line read in it and answers 1 (0 when there was nothing unread on that day).
    if (name === 'get_my_moments') {
      var whoM = params && params.p_athlete_id;
      if (whoM && S.identity && whoM !== S.identity) return res({ data: null, error: { message: 'not your profile', code: 'P0001' }, status: 400 });
      return res({ data: S.myMoments ? JSON.parse(JSON.stringify(S.myMoments)) : null, error: null, status: 200 });
    }
    // Four Courts (stage80): get_achievements answers the stub's `achievements` (every achievement with its day or its progress, and `next`), refusing
    // another athlete's id like the server; none set: no answer, so the section is not drawn.
    if (name === 'get_achievements') {
      var whoA = params && params.p_athlete_id;
      if (whoA && S.identity && whoA !== S.identity) return res({ data: null, error: { message: 'not your profile', code: 'P0001' }, status: 400 });
      return res({ data: S.achievements ? JSON.parse(JSON.stringify(S.achievements)) : null, error: null, status: 200 });
    }
    if (name === 'mark_note_read') {
      var hit = 0;
      ((S.myMoments && S.myMoments.notes) || []).forEach(function (n) { if (n && n.day === (params && params.p_day) && !n.read) { n.read = true; hit++; } });
      (S.noteRead = S.noteRead || []).push(params && params.p_day);
      try { var cm = JSON.parse(localStorage.getItem('__stubcfg') || '{}'); cm.myMoments = S.myMoments; cm.noteRead = S.noteRead; localStorage.setItem('__stubcfg', JSON.stringify(cm)); } catch (e) {}
      return res({ data: hit, error: null, status: 200 });
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
    // Crew and the Bell (stage81, scripts/headless/crew.js): get_bell answers the stub's `bell` (none set: no answer, so no Crew tab); bellMissing
    // answers as a server without stage81 (PGRST202, 404). crew_answer, crew_kinds, crew_post, crew_kudos and crew_delete_post change `bell` the way
    // the server would and keep it in '__stubcfg' (the next page sees it); crew_photo answers a tiny JPEG; leaderboard_top answers `board`.
    if (name === 'get_bell') {
      if (S.bellMissing) return res({ data: null, error: { message: 'Could not find the function public.get_bell(p_athlete_id) in the schema cache', code: 'PGRST202' }, status: 404 });
      return res({ data: S.bell ? JSON.parse(JSON.stringify(S.bell)) : null, error: null, status: 200 });
    }
    if (/^crew_/.test(name) && S.bell) {
      var B = S.bell, me = B.me = B.me || {}, keep = function () { try { var cb = JSON.parse(localStorage.getItem('__stubcfg') || '{}'); cb.bell = B; localStorage.setItem('__stubcfg', JSON.stringify(cb)); } catch (e) {} };
      if (name === 'crew_answer') {
        var a = params && params.p_answer;
        me.answer = a; me.can_post = a === 'yes' && !me.under13; me.name = me.name || (params && params.p_name) || 'Athlete';
        if (a === 'no') B.items = (B.items || []).filter(function (i) { return !(i && i.me && i.t === 'post'); });
        keep(); return res({ data: JSON.parse(JSON.stringify(me)), error: null, status: 200 });
      }
      if (name === 'crew_kinds') { me.kinds = Object.assign({}, me.kinds || {}, (params && params.p_kinds) || {}); keep(); return res({ data: JSON.parse(JSON.stringify(me)), error: null, status: 200 }); }
      if (name === 'crew_post') {
        var p = params || {};
        if (S.crewPostError) return res({ data: null, error: { message: S.crewPostError, code: 'P0001' }, status: 400 });
        var id = 'p' + Date.now().toString(16) + Math.floor(Math.random() * 1e6).toString(16);
        while (id.length < 36) id += '0';
        B.items = B.items || [];
        B.items.splice(B.items.filter(function (i) { return i && i.pinned; }).length, 0, { t: 'post', id: id, who: me.name, me: true, amir: false, kind: p.p_kind || 'post', body: p.p_body || '', session: p.p_session || null,
          photo: !!p.p_photo, w: p.p_w, h: p.p_h, at: new Date().toISOString(), pinned: false, left: 7, kudos: { n: 0, mine: false, names: [] } });
        if (p.p_photo) me.photos_left = Math.max(0, (me.photos_left || 0) - 1);
        me.posts_left = Math.max(0, (me.posts_left || 0) - 1);
        keep(); return res({ data: { id: id, me: JSON.parse(JSON.stringify(me)) }, error: null, status: 200 });
      }
      // stage82: one reaction per person, the emoji swapping in place. Without B.emoji (no stage82) p_emoji is refused, as the old
      // two-argument function would have been.
      if (name === 'crew_kudos') {
        var t = params && params.p_target, on = !!(params && params.p_on), em = (params && params.p_emoji) || null;
        var it = (B.items || []).find(function (i) { return i && (i.id === t || i.key === t); });
        if (!it) return res({ data: null, error: { message: 'crew:gone', code: 'P0001' }, status: 400 });
        if (em && (!B.emoji || B.emoji.indexOf(em) < 0)) return res({ data: null, error: { message: 'crew:emoji', code: 'P0001' }, status: 400 });
        var k = it.kudos = it.kudos || { n: 0, mine: false, names: [] };
        if (B.emoji) {
          k.by = k.by || {}; if (typeof k.like !== 'number') k.like = k.n - Object.keys(k.by).reduce(function (a, x) { return a + k.by[x]; }, 0);
          if (k.mine) { if (k.emoji) { k.by[k.emoji] = Math.max(0, (k.by[k.emoji] || 0) - 1); if (!k.by[k.emoji]) delete k.by[k.emoji]; } else k.like = Math.max(0, k.like - 1); k.n--; }
          k.mine = !!on; k.emoji = on ? em : null;
          if (on) { if (em) k.by[em] = (k.by[em] || 0) + 1; else k.like++; k.n++; }
        } else if (on && !k.mine) { k.n++; k.mine = true; } else if (!on && k.mine) { k.n--; k.mine = false; }
        keep(); return res({ data: JSON.parse(JSON.stringify(k)), error: null, status: 200 });
      }
      if (name === 'crew_delete_post') { var before = (B.items || []).length; B.items = (B.items || []).filter(function (i) { return !(i && i.id === (params && params.p_post)); }); keep(); return res({ data: B.items.length < before, error: null, status: 200 }); }
      if (name === 'crew_photo') return res({ data: { id: params && params.p_post, mime: 'image/jpeg', w: 4, h: 5,
        b64: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z' }, error: null, status: 200 });
    }
    if (name === 'leaderboard_top' && S.board) return res({ data: JSON.parse(JSON.stringify(S.board)), error: null, status: 200 });
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
