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
// Players' Lounge (stage96, scripts/headless/lounge.js): crew_page answers the stub's `crewPages` ({ me: {...}, '<ck>': {...} }), each MERGED over a default page
// made from that person's entry in `bell.crew` (the shape of CONTRACT.md section 3: numbers, cheers, achievements, ...; made-up people only); the viewer's own
// page (no p_subject) is made from `bell.me`. Like the server it answers 'crew:not_yes' to a viewer who is not in the crew (or is under 13) and 'crew:gone' to a
// ck that is not in `bell.crew`. pageMissing = a server without stage96 (PGRST202, 404); pageErr = an error message to answer with (e.g. 'crew:gone');
// stall: { crew_page: true } never answers; a mode of 'offline' is no signal. get_bell, crew_board and a reply carry ck/fv/lv/held/new as the fixture gives them.
// stage96 is TOLD by get_bell's top-level `lounge: 1` (the fixture sets it; without it the app draws Crew as it was). YOUR page (no p_subject) is whole: every block, the comebacks, and
// `kinds` (your switches, a kind not named is on); someone else's has neither.
// The cheer (step 3): crew_cheer answers like the server (cheerLog, cheerCap, cheerErr); crew_page reads cheerLog for mine_today.
// Steps 4 to 6: a page's `cycle` (YOUR page: every week of the cycle with days that carry title and mins, plus `done` / `extra`; SOMEONE ELSE'S, CONTRACT 9b: { n, per_week, done, extra, weeks: [this week only] }
// and days that carry only day and extra: the stub sends exactly what the fixture gives, so a test can also send MORE than the server would), `game` and each achievement's `signed` / `signed_n` come from the `crewPages` entry (none by default, so a
// page has no cycle, no game and nobody signed); my_game_set answers like CONTRACT 4 and crew_page(own) then carries what it saved (`myGame`; gameMissing, gameErr, gameFail, gameDelay).
// Step 7: crew_reply keeps a mention token @[ck|name] for a member of `bell.crew` who is not you (the first five), turns any other into plain @name, counts what is SEEN against 140 (a token is "@name"), and the reply row carries `mentions`.
// Bring a partner (step 9, stage97): `partner` is the referral object your page carries ({ code: null } before a code exists, or { code, percent, reward, friends, waiting, used }); without it a page has
// no `referral` (a server without stage97: no card). my_partner_code({p_make}) answers like CONTRACT 8: {code:null} for none, p_make true makes ALEX24 (upper first name letters + two digits, 10 and 10),
// refuses an athlete under 13 ('partner:under13'); partnerMissing = "no such function" · partnerErr = a message to refuse with · partnerDelay = ms to take.
// Faces (step 2): crew_faces_get answers `faces` ({ '<ck>': { fv, b64 } }), crew_face_set / crew_face_clear change the caller's own (faceDelay, faceMax, faceMissing, faceErr).
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
    // The Monthly Open (stage85): the coach's five. get_achievements and get_bell carry their own; `openPanel` is what coach_open() answers.
    if (name === 'coach_open' || name === 'coach_open_set' || name === 'coach_open_close' || name === 'coach_open_result' || name === 'coach_open_remove') {
      (S.openCalls = S.openCalls || []).push([name, params]);
      return res({ data: S.openPanel ? JSON.parse(JSON.stringify(S.openPanel)) : null, error: null, status: 200 });
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
    if (name === 'get_bell' || name === 'get_bell_if_new') {
      if (S.bellMissing) return res({ data: null, error: { message: 'Could not find the function public.' + name + '(p_athlete_id) in the schema cache', code: 'PGRST202' }, status: 404 });
      // stage83: the app asks get_bell_if_new with the hash it holds. ifNewMissing = a server without that stage, so the app
      // learns once and asks plain get_bell from then on.
      if (name === 'get_bell_if_new' && S.ifNewMissing) return res({ data: null, error: { message: 'Could not find the function public.get_bell_if_new(p_athlete_id, p_etag) in the schema cache', code: 'PGRST202' }, status: 404 });
      if (!S.bell) return res({ data: null, error: null, status: 200 });
      // the hash the server takes over the payload: it MUST change when the feed does, or a new post would never arrive
      var tag = (function (B) {
        var t = JSON.stringify([B.items, B.me, B.honours, B.emoji, B.crew, B.week, B.open, B.lounge]), h = 0;
        for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
        return S.bell.etag && !S.bellTagMoves ? S.bell.etag : 'tag' + h;
      })(S.bell);
      if (name === 'get_bell_if_new' && params && params.p_etag && params.p_etag === tag) return res({ data: { same: true, etag: tag, at: new Date().toISOString() }, error: null, status: 200 });
      var out = JSON.parse(JSON.stringify(S.bell));
      out.etag = tag; out.at = new Date().toISOString();
      return res({ data: out, error: null, status: 200 });
    }
    // Players' Lounge (stage96): the Player Page. See the header for what it answers.
    if (name === 'crew_page') {
      if (S.pageMissing) return res({ data: null, error: { message: 'Could not find the function public.crew_page(p_subject) in the schema cache', code: 'PGRST202' }, status: 404 });
      var PB = S.bell || {}, PM = PB.me || {}, sub = params && params.p_subject, pages = S.crewPages || {};
      var bad = function (m) { return res({ data: null, error: { message: m, code: 'P0001' }, status: 400 }); };
      if (S.pageErr) return bad(S.pageErr);
      var pageOf = function (who, own, c) {
        c = c || {};
        var first = String(who || '').split(' ')[0];
        var pg = { ck: c.ck || null, me: !!own, who: who, first: first, since: '2026-06-06', joined: '2026-10-19', member: !own || PM.answer === 'yes', under13: !!(own && PM.under13),
          lv: c.lv || null, fv: c.fv || null, art: 'iron', game: null,
          numbers: { weeks: { now: 6, best: 8 }, sessions: 41, bests: 9 }, cheers: { season: 12, recent: [] },
          achievements: [{ id: 'achievement:back_to_back', name: 'Back to Back', day: '2026-10-12', size: 'win', signed: [], signed_n: 0 },
            { id: 'achievement:the_notebook', name: 'The Notebook', day: '2026-10-03', size: 'win', signed: [], signed_n: 0 }],
          honours: [], best_lifts: [], cycle: null, at: new Date().toISOString() };
        // YOUR page is sent whole: every block, the comebacks, and `kinds` (your own switches, a kind not named is on). Someone else's has no comebacks and no `kinds`.
        if (own) { pg.numbers.comebacks = 2; pg.kinds = Object.assign({}, PM.kinds || {}); }
        else { pg.cheers.mine_today = !!(S.cheerLog && c.ck && S.cheerLog[c.ck]); if (pg.cheers.mine_today) pg.cheers.season = 13; }   // a cheer you sent (crew_cheer) is on their page
        return pg;
      };
      var merge = function (pg, over) { Object.keys(over || {}).forEach(function (k) { pg[k] = over[k]; }); return pg; };
      // `myGame` is what my_game_set last saved: your own page then carries it (the saved row, in the shape CONTRACT 4 gives crew_page().game)
      if (!sub) { var own = merge(pageOf(PM.name || 'Alex R.', true, PM), pages.me); if (S.myGame !== undefined) own.game = S.myGame; if (S.partner !== undefined && own.referral === undefined) own.referral = S.partner; return res({ data: JSON.parse(JSON.stringify(own)), error: null, status: 200 }); }
      if (PM.answer !== 'yes' || PM.under13 || PM.can_post === false) return bad('crew:not_yes');
      var who = (PB.crew || []).filter(function (x) { return x && x.ck === sub; })[0];
      if (!who) return bad('crew:gone');
      return res({ data: JSON.parse(JSON.stringify(merge(pageOf(who.who, !!who.me, who), pages[sub]))), error: null, status: 200 });
    }
    // Players' Lounge (stage96, "Your game"): my_game_set(p) validates like CONTRACT 4 (unknown keys dropped, '' to null, the enums, club <= 40, working_on <= 60, ig by its pattern, an
    // unknown sport refused) and answers the saved row in crew_page().game's shape (nulls absent); crew_page(own) then carries it (S.myGame). gameMissing = a server without the function ·
    // gameErr = a message to refuse every save with · gameDelay = ms to take · gameFail = refuse the next N saves.
    if (name === 'my_game_set') {
      if (S.gameMissing) return res({ data: null, error: { message: 'Could not find the function public.my_game_set(p) in the schema cache', code: 'PGRST202' }, status: 404 });
      var gp =(params && params.p) || {}, GK = ['sports', 'hand', 'backhand', 'side', 'plays_at', 'club', 'training_for', 'working_on', 'ig'];
      var gbad = function (m) { return res({ data: null, error: { message: m, code: 'P0001' }, status: 400 }); };
      if (S.gameErr) return gbad(S.gameErr);
      if (S.gameFail > 0) { S.gameFail--; return gbad('game:bad'); }
      var SP = ['tennis', 'padel', 'squash', 'badminton', 'pickleball', 'table_tennis', 'beach_tennis'], TF = ['competition', 'strength', 'fitness', 'physique', 'running', 'health'];
      var one = function (v, ok) { v = v === '' || v === undefined ? null : v; return v === null || ok.indexOf(v) >= 0 ? v : false; };
      var got = {}, bd = false;
      GK.forEach(function (k) { if (gp[k] !== undefined) got[k] = gp[k]; });
      var sp = Array.isArray(got.sports) ? got.sports : [], tf = Array.isArray(got.training_for) ? got.training_for : [];
      if (sp.some(function (x) { return SP.indexOf(x) < 0; }) || tf.some(function (x) { return TF.indexOf(x) < 0; })) bd = true;
      var hand = one(got.hand, ['right', 'left']), bh = one(got.backhand, ['one', 'two']), sd = one(got.side, ['right', 'left', 'both']), pa = one(got.plays_at, ['fun', 'club', 'competition']);
      if (hand === false || bh === false || sd === false || pa === false) bd = true;
      var club = String(got.club || '').trim(), wo = String(got.working_on || '').trim(), ig = String(got.ig || '').trim();
      if (club.length > 40 || wo.length > 60 || (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig))) bd = true;
      if (bd) return gbad('game:bad');
      var saved = { sports: sp, training_for: tf };
      if (hand) saved.hand = hand; if (bh) saved.backhand = bh; if (sd) saved.side = sd; if (pa) saved.plays_at = pa;
      if (club) saved.club = club; if (wo) saved.working_on = wo; if (ig) saved.ig = ig;
      S.myGame = saved;
      return new Promise(function (ok) { setTimeout(function () { ok({ data: JSON.parse(JSON.stringify(saved)), error: null, status: 200 }); }, S.gameDelay || 0); });
    }
    // Players' Lounge (stage97, "Bring a partner"): see the header.
    if (name === 'my_partner_code') {
      if (S.partnerMissing) return res({ data: null, error: { message: 'Could not find the function public.my_partner_code(p_make) in the schema cache', code: 'PGRST202' }, status: 404 });
      var qbad = function (m) { return res({ data: null, error: { message: m, code: 'P0001' }, status: 400 }); };
      if (S.partnerErr) return qbad(S.partnerErr);
      var QM = (S.bell && S.bell.me) || {};
      if (QM.under13) return qbad('partner:under13');
      if (params && params.p_make === true && !(S.partner && S.partner.code)) {
        var qn = String(QM.name || 'Alex R.').split(/\s+/)[0].replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 10) || 'ATHLETE';
        S.partner = { code: qn + '24', percent: 10, reward: 10, friends: 0, waiting: 0, used: 0 };
      }
      var qout = JSON.parse(JSON.stringify(S.partner && S.partner.code ? S.partner : { code: null }));
      return new Promise(function (ok) { setTimeout(function () { ok({ data: qout, error: null, status: 200 }); }, S.partnerDelay || 0); });
    }
    if (/^crew_/.test(name) && S.bell) {
      var B = S.bell, me = B.me = B.me || {}, keep = function () { try { var cb = JSON.parse(localStorage.getItem('__stubcfg') || '{}'); cb.bell = B; localStorage.setItem('__stubcfg', JSON.stringify(cb)); } catch (e) {} };
      if (name === 'crew_answer') {
        var a = params && params.p_answer;
        me.answer = a; me.can_post = a === 'yes' && !me.under13; me.name = me.name || (params && params.p_name) || 'Athlete';
        if (a === 'no') {   // leaving means gone: your posts, and your face (stage96)
          B.items = (B.items || []).filter(function (i) { return !(i && i.me && i.t === 'post'); });
          me.fv = null; if (S.faces && me.ck) delete S.faces[me.ck]; (B.crew || []).forEach(function (c) { if (c && c.me) c.fv = null; });
        }
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
      // Replies (stage92): held on the post in `bell`, so a reply, a delete and the redraw all read the same place the
      // app does. A fixture that sets `noReplies` answers "no such function", which is a server without stage92.
      if (name === 'crew_reply' || name === 'crew_reply_delete') {
        if (S.noReplies) return res({ data: null, error: { message: 'Could not find the function public.' + name, code: 'PGRST202' }, status: 404 });
        var post = null;
        if (name === 'crew_reply') {
          post = (B.items || []).filter(function (i) { return i && i.id === (params && params.p_post); })[0];
          if (!post) return res({ data: null, error: { message: 'crew:gone' }, status: 400 });
          var body = String((params && params.p_body) || '').trim();
          if (!body) return res({ data: null, error: { message: 'crew:empty' }, status: 400 });
          // stage96 mentions (CONTRACT 5): a token @[ck|name] is kept when the ck is a member of the crew list and not the author, the first five only; anything else becomes plain
          // "@name". What the 140 counts is what is SEEN (a token counts as "@name"), the body at most 700. The row carries `mentions` for the members named.
          var mre = /@\[([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\|([^\]|\n]{1,40})\]/, mrest = body, mout = '', mseen = '', mcnt = 0, mm, ments = [], mtok = [];
          while ((mm = mre.exec(mrest))) {
            var mnm = mm[2].trim().slice(0, 24), mck = mm[1].toLowerCase();
            var mem = mcnt < 5 && mnm ? (B.crew || []).filter(function (c) { return c && c.ck && String(c.ck).toLowerCase() === mck && !c.me; })[0] : null;
            mout += mrest.slice(0, mm.index); mseen += mrest.slice(0, mm.index);
            if (mem) { mout += '@[' + mck + '|' + mnm + ']'; mcnt++; mtok.push(mck); if (!ments.some(function (x) { return x.ck === mck; })) ments.push({ ck: mck, who: mem.who, fv: mem.fv != null ? mem.fv : null }); }
            else mout += '@' + mnm;
            mseen += '@' + mnm; mrest = mrest.slice(mm.index + mm[0].length);
          }
          body = mout + mrest; mseen += mrest;
          S.lastBody = body;
          if (mseen.length > 140 || body.length > 700) return res({ data: null, error: { message: 'crew:reply_long' }, status: 400 });
          if (!Array.isArray(post.replies)) post.replies = [];
          var newRep = { id: 'rep-' + (++S._repN || (S._repN = 1)), who: (B.me && B.me.name) || 'You', me: true, amir: false, body: body, at: new Date().toISOString(),
            ck: B.me && B.me.ck ? B.me.ck : undefined, fv: B.me && 'fv' in B.me ? B.me.fv : undefined };
          if (ments.length) newRep.mentions = ments;
          post.replies.push(newRep);
        } else {
          (B.items || []).forEach(function (i) {
            if (i && Array.isArray(i.replies) && i.replies.some(function (r) { return r.id === (params && params.p_id); })) {
              i.replies = i.replies.filter(function (r) { return r.id !== (params && params.p_id); });
              post = i;
            }
          });
          if (!post) return res({ data: null, error: { message: 'crew:gone' }, status: 400 });
        }
        keep();
        return res({ data: { post: post.id, replies: JSON.parse(JSON.stringify(post.replies || [])) }, error: null, status: 200 });
      }
      if (name === 'crew_delete_post') { var before = (B.items || []).length; B.items = (B.items || []).filter(function (i) { return !(i && i.id === (params && params.p_post)); }); keep(); return res({ data: B.items.length < before, error: null, status: 200 }); }
      // Faces (stage96). crew_faces_get answers the stub's `faces` ({ '<ck>': { fv, b64 } }) for the keys asked, at most 12, only rows that exist, after `faceDelay` ms (so a second call
      // in flight would show in `faceMax`); crew_face_set keeps the photo as the caller's face (a JPEG of 100..60,000 bytes, 64..512 square) and answers { fv }; crew_face_clear answers { fv: null }.
      // faceMissing = "no such function"; faceErr = the message set and clear refuse with (e.g. 'crew:photo_bad').
      if (name === 'crew_faces_get' || name === 'crew_face_set' || name === 'crew_face_clear') {
        if (S.faceMissing) return res({ data: null, error: { message: 'Could not find the function public.' + name, code: 'PGRST202' }, status: 404 });
        var fbad = function (m) { return res({ data: null, error: { message: m, code: 'P0001' }, status: 400 }); };
        if (name === 'crew_faces_get') {
          var fkeys = (params && params.p_keys) || [];
          if (fkeys.length > 12) return fbad('crew:too_many');
          S.faceNow = (S.faceNow || 0) + 1; S.faceMax = Math.max(S.faceMax || 0, S.faceNow);
          var frows = fkeys.filter(function (k) { return S.faces && S.faces[k]; }).map(function (k) { return { ck: k, fv: S.faces[k].fv, b64: S.faces[k].b64 }; });
          return new Promise(function (ok) { setTimeout(function () { S.faceNow--; ok({ data: frows, error: null, status: 200 }); }, S.faceDelay || 0); });
        }
        if (S.faceErr) return fbad(S.faceErr);
        if (me.under13) return fbad('crew:under13');
        if (me.answer !== 'yes') return fbad('crew:not_yes');
        if (name === 'crew_face_clear') {
          me.fv = null; if (S.faces && me.ck) delete S.faces[me.ck];
          (B.crew || []).forEach(function (c) { if (c && c.me) c.fv = null; });
          keep(); return res({ data: { fv: null }, error: null, status: 200 });
        }
        var fph = String((params && params.p_photo) || ''), fw = params && params.p_w, fh = params && params.p_h;
        if (fph.indexOf('/9j/') !== 0 || !(fw >= 64 && fw <= 512 && fh >= 64 && fh <= 512)) return fbad('crew:photo_bad');
        if (Math.floor(fph.length * 3 / 4) > 60000) return fbad('crew:photo_big');
        var fnew = Math.floor(Date.now() / 1000) + (S._faceN = (S._faceN || 0) + 1);
        me.fv = fnew; (B.crew || []).forEach(function (c) { if (c && c.me) c.fv = fnew; });
        S.faces = S.faces || {}; if (me.ck) S.faces[me.ck] = { fv: fnew, b64: fph };
        keep(); return res({ data: { fv: fnew }, error: null, status: 200 });
      }
      // The cheer (stage96): crew_cheer({ p_subject, p_word }) answers { ok: true, season }. Like the server: one per giver, subject and day (the second is 'crew:cheer_today'), a word over 100 is
      // 'crew:word_long', yourself 'crew:own', a key that is not in the crew 'crew:gone', a non-member 'crew:not_yes', under 13 'crew:under13', 30 a day (`cheerCap`) 'crew:cheers_today'.
      // `cheerLog` ({ '<ck>': { word } }) is what has been sent (set it to say "already cheered today"); crew_page reads it for mine_today and the season. cheerErr = a message to refuse every cheer with.
      if (name === 'crew_cheer') {
        var chbad = function (m) { return res({ data: null, error: { message: m, code: 'P0001' }, status: 400 }); };
        var chsub = params && params.p_subject, chword = params && params.p_word;
        if (S.cheerErr) return chbad(S.cheerErr);
        if (me.under13) return chbad('crew:under13');
        if (me.answer !== 'yes' || me.can_post === false) return chbad('crew:not_yes');
        if (chsub && chsub === me.ck) return chbad('crew:own');
        if (!(B.crew || []).some(function (c) { return c && c.ck === chsub; })) return chbad('crew:gone');
        if (chword && String(chword).length > 100) return chbad('crew:word_long');
        S.cheerLog = S.cheerLog || {};
        if (S.cheerLog[chsub]) return chbad('crew:cheer_today');
        if (Object.keys(S.cheerLog).length >= (S.cheerCap || 30)) return chbad('crew:cheers_today');
        S.cheerLog[chsub] = { word: chword || null };
        return res({ data: { ok: true, season: 13 }, error: null, status: 200 });
      }
      if (name === 'crew_photo') return res({ data: { id: params && params.p_post, mime: 'image/jpeg', w: 4, h: 5,
        b64: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z' }, error: null, status: 200 });
    }
    // crew_board (stage91): the season board, crew members only, in its own shape (who/points, no display_name/xp). Answered
    // from `crewBoard` when a fixture sets one, else from `board` translated, so every older fixture keeps working. A fixture
    // that sets `noCrewBoard` answers "no such function", which is how the app falls back to leaderboard_top.
    if (name === 'crew_board') {
      if (S.noCrewBoard) return res({ data: null, error: { message: 'Could not find the function public.crew_board', code: 'PGRST202' }, status: 404 });
      if (S.crewBoard) return res({ data: JSON.parse(JSON.stringify(S.crewBoard)), error: null, status: 200 });
      if (S.board) return res({ data: S.board.map(function (r) { var o = { pos: r.pos, who: r.display_name, points: r.xp, level: r.level, is_me: r.is_me }; if (r.ck) { o.ck = r.ck; o.fv = r.fv === undefined ? null : r.fv; } return o; }), error: null, status: 200 });
      return res({ data: [], error: null, status: 200 });
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
