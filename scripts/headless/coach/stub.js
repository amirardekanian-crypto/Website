// coach-harness/stub.js — a fake supabase-js v2 for driving coach.html in REAL (non-demo) mode.
//
// Injected with Playwright page.addInitScript() AFTER the seed (window.__HARNESS_SEED) and BEFORE any
// page script, so coach.html's `supabase.createClient(...)` gets this client. The jsDelivr script tag
// is routed to an empty body by run.js, so the CDN block does not matter.
//
// What it gives coach.html:
//   auth: getSession (a signed-in coach), onAuthStateChange (callbacks kept in window.__authCbs; fires
//         INITIAL_SESSION once after subscribe, like real supabase-js v2 does), signOut, signInWithOAuth
//   from(table): a chainable, thenable PostgREST-like builder over an in-memory DB (select/eq/neq/in/gte/
//         lte/gt/lt/is/order/limit/range/maybeSingle/single/insert/update/upsert/delete/match/not/or/filter)
//   rpc(name, params): the RPCs coach.html calls, emulated from the SQL in supabase/*.sql
//   functions.invoke(name, {body}): athlete-login / assess-login / tps-login emulation
//
// Knobs (window.__STUB, also settable before load via window.__HARNESS_SEED.stub):
//   maxRows      PostgREST max-rows cap (default 1000)
//   fail         [{ kind:'from'|'rpc'|'fn', name, op?, message, times? }]  one-shot or N-shot errors
//   rlsDeny      { table: ['update','delete','insert'] } -> zero rows touched, NO error (PostgREST behaviour)
//   delay        { name: ms } extra latency per table/rpc/function name
//   emitInitial  true (default) = fire INITIAL_SESSION after onAuthStateChange, as supabase-js v2 does
//   persist      true (default) = DB saved to localStorage '__harness_db' after every write, reloaded on boot
//
// Every call is recorded in window.__calls: { i, t, kind, name, op, filters, mods, payload, opts, result }.
// Everything here is MADE-UP data. Never seed it with real athlete data.
(function () {
  'use strict';
  var SEED = window.__HARNESS_SEED || {};
  var COACH = SEED.coachEmail || 'amirardekanian@gmail.com';
  var clone = function (v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); };
  var DB;
  try { var saved = localStorage.getItem('__harness_db'); DB = saved ? JSON.parse(saved) : null; } catch (e) { DB = null; }
  if (!DB) DB = clone(SEED.db || {});
  var ST = window.__STUB = Object.assign({ maxRows: 1000, fail: [], rlsDeny: {}, delay: {}, emitInitial: true, persist: true, seq: 1000 },
    SEED.stub || {});
  var CALLS = window.__calls = [];
  window.__DB = DB;
  window.__authCbs = [];

  var PK = {
    programs: ['athlete_id'], program_versions: ['id'], session_history: ['athlete_id', 'day', 'completed_on'],
    athlete_progress: ['athlete_id'], athlete_identities: ['athlete_id'], coaching_logs: ['athlete_id'],
    hab_notes: ['athlete_id', 'day'], hab_contacts: ['athlete_id'], hab_intake: ['id'], hab_titles: ['athlete_id', 'title'],
    leaderboard_optin: ['athlete_id'], seasons: ['id'], xp_rules: ['id'], call_logs: ['id'], affiliates: ['code'],
    library: ['slug'], library_categories: ['kind', 'id'], exercises: ['id'], exercise_coach: ['id'], qualities: ['id'],
    tps_accounts: ['username'], assess_accounts: ['username'], messages: ['id'], cycle_reports: ['id'],
  };
  function persist() { if (ST.persist) { try { localStorage.setItem('__harness_db', JSON.stringify(DB)); } catch (e) {} } }
  function tbl(name) { return DB[name] || (DB[name] = []); }
  function nowIso() { return new Date().toISOString(); }
  function utcDate() { return new Date().toISOString().slice(0, 10); }   // Postgres CURRENT_DATE on a UTC server
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function takeFail(kind, name, op) {
    for (var i = 0; i < ST.fail.length; i++) {
      var f = ST.fail[i];
      if (f.kind === kind && f.name === name && (!f.op || f.op === op)) {
        if (f.times != null) { f.times--; if (f.times <= 0) ST.fail.splice(i, 1); }
        return f;
      }
    }
    return null;
  }
  function record(c) { c.i = CALLS.length; c.t = Date.now(); CALLS.push(c); return c; }

  // ---- comparisons the way PostgREST casts them (text compare unless both sides are numbers) ----
  function cmp(a, b) {
    if (a == null || b == null) return a == null && b == null ? 0 : (a == null ? -1 : 1);
    var na = Number(a), nb = Number(b);
    if (typeof a !== 'boolean' && a !== '' && b !== '' && !isNaN(na) && !isNaN(nb) && !/^\d{4}-\d{2}-\d{2}/.test(String(a))) return na - nb;
    a = String(a); b = String(b); return a < b ? -1 : a > b ? 1 : 0;
  }
  function eqv(a, b) { if (typeof a === 'boolean' || typeof b === 'boolean') return String(a) === String(b); return a != null && b != null && cmp(a, b) === 0; }
  function opTest(op, v, arg) {
    switch (op) {
      case 'eq': return eqv(v, arg);
      case 'neq': return !eqv(v, arg);
      case 'gt': return v != null && cmp(v, arg) > 0;
      case 'gte': return v != null && cmp(v, arg) >= 0;
      case 'lt': return v != null && cmp(v, arg) < 0;
      case 'lte': return v != null && cmp(v, arg) <= 0;
      case 'is': return (arg === null || arg === 'null') ? v == null : String(v) === String(arg);
      case 'in': { var list = Array.isArray(arg) ? arg : String(arg).replace(/^\(|\)$/g, '').split(','); return list.some(function (x) { return eqv(v, x); }); }
      case 'like': case 'ilike': { var re = new RegExp('^' + String(arg).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', op === 'ilike' ? 'i' : ''); return re.test(String(v == null ? '' : v)); }
      default: throw new Error('stub: unsupported operator ' + op);
    }
  }
  function parseOr(s) {   // 'coach_status.is.null,coach_status.eq.new'
    return String(s).split(',').map(function (part) {
      var m = part.match(/^([^.]+)\.(not\.)?([a-z]+)\.(.*)$/);
      if (!m) throw new Error('stub: cannot parse or() ' + part);
      return { col: m[1], neg: !!m[2], op: m[3], arg: m[4] === 'null' ? null : m[4] };
    });
  }

  function Builder(table) {
    this.table = table; this.op = 'select'; this.cols = '*'; this.filters = []; this.fdesc = [];
    this.ord = []; this.rng = null; this.lim = null; this.mode = null; this.payload = null; this.opts = null;
    this.returning = false; this.countOpt = null; this.head = false;
  }
  var B = Builder.prototype;
  B._f = function (desc, fn) { this.filters.push(fn); this.fdesc.push(desc); return this; };
  B.select = function (cols, o) {
    if (this.op === 'select') { this.cols = cols || '*'; if (o) { this.countOpt = o.count || null; this.head = !!o.head; } }
    else { this.returning = true; this.retCols = cols || '*'; }
    return this;
  };
  ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike'].forEach(function (op) {
    B[op] = function (col, v) { return this._f(col + '.' + op + '.' + JSON.stringify(v), function (r) { return opTest(op, r[col], v); }); };
  });
  B.is = function (col, v) { return this._f(col + '.is.' + v, function (r) { return opTest('is', r[col], v); }); };
  B.in = function (col, list) { return this._f(col + '.in.' + JSON.stringify(list), function (r) { return opTest('in', r[col], list); }); };
  B.match = function (obj) { var self = this; Object.keys(obj).forEach(function (k) { self.eq(k, obj[k]); }); return this; };
  B.not = function (col, op, v) { return this._f(col + '.not.' + op + '.' + v, function (r) { return !opTest(op, r[col], v); }); };
  B.filter = function (col, op, v) { return this._f(col + '.' + op + '.' + v, function (r) { return opTest(op, r[col], v); }); };
  B.or = function (s) {
    var parts = parseOr(s);
    return this._f('or(' + s + ')', function (r) { return parts.some(function (p) { var t = opTest(p.op, r[p.col], p.arg); return p.neg ? !t : t; }); });
  };
  B.order = function (col, o) { this.ord.push({ col: col, asc: !o || o.ascending !== false }); return this; };
  B.limit = function (n) { this.lim = n; return this; };
  B.range = function (a, b) { this.rng = [a, b]; return this; };
  B.maybeSingle = function () { this.mode = 'maybe'; return this; };
  B.single = function () { this.mode = 'single'; return this; };
  B.insert = function (rows, o) { this.op = 'insert'; this.payload = rows; this.opts = o || null; return this; };
  B.update = function (patch, o) { this.op = 'update'; this.payload = patch; this.opts = o || null; return this; };
  B.upsert = function (rows, o) { this.op = 'upsert'; this.payload = rows; this.opts = o || null; return this; };
  B.delete = function (o) { this.op = 'delete'; this.opts = o || null; return this; };
  B.abortSignal = function () { return this; };
  B.then = function (ok, bad) { return this._run().then(ok, bad); };
  B.catch = function (bad) { return this._run().catch(bad); };

  function project(row, cols) {
    if (!cols || cols.trim() === '*') return clone(row);
    var out = {};
    cols.split(',').map(function (c) { return c.trim(); }).filter(Boolean).forEach(function (c) {
      if (c === '*') Object.assign(out, clone(row)); else out[c] = clone(row[c]);
    });
    return out;
  }
  function keyOf(table, row, conflict) {
    var cols = conflict ? String(conflict).split(',').map(function (s) { return s.trim(); }) : (PK[table] || ['id']);
    return cols.map(function (c) { return String(row[c]); }).join('|');
  }

  // ---- table triggers, from information_schema.triggers on the live DB ----
  function beforeUpdate(table, oldRow, newRow) {
    if (table === 'programs') {           // programs_version_trg -> programs_version_snapshot()
      if (JSON.stringify(oldRow.data) !== JSON.stringify(newRow.data)) {
        var pv = tbl('program_versions');
        pv.push({ id: ++ST.seq, athlete_id: oldRow.athlete_id, data: clone(oldRow.data), saved_at: nowIso(), saved_by: oldRow.updated_by || null, note: null });
        var mine = pv.filter(function (v) { return v.athlete_id === oldRow.athlete_id; }).sort(function (a, b) { return b.id - a.id; });
        mine.slice(20).forEach(function (v) { pv.splice(pv.indexOf(v), 1); });
      }
      newRow.updated_at = nowIso(); newRow.updated_by = COACH;
    }
    if (table === 'affiliates' || table === 'coaching_logs' || table === 'library') newRow.updated_at = nowIso();
  }

  B._run = async function () {
    var self = this, table = this.table, op = this.op;
    var call = record({ kind: 'from', name: table, op: op, filters: this.fdesc.slice(), payload: clone(this.payload), opts: clone(this.opts),
      mods: { cols: this.cols, order: this.ord.slice(), range: this.rng, limit: this.lim, mode: this.mode, returning: this.returning, count: this.countOpt } });
    if (ST.delay[table]) await sleep(ST.delay[table]);
    await sleep(0);
    var f = takeFail('from', table, op);
    if (f) { call.result = { error: f.message }; return { data: null, error: { message: f.message, code: f.code || 'XX000' }, status: f.status || 400, count: null }; }
    var rows = tbl(table);
    var match = function (r) { return self.filters.every(function (fn) { return fn(r); }); };
    var denied = (ST.rlsDeny[table] || []).indexOf(op) >= 0;
    var out;
    if (op === 'select') {
      var res = rows.filter(match);
      var total = res.length;
      if (this.ord.length) res = res.slice().sort(function (a, b) {
        for (var i = 0; i < self.ord.length; i++) { var o = self.ord[i]; var c = cmp(a[o.col], b[o.col]); if (c) return o.asc ? c : -c; } return 0;
      });
      var from = 0, to = res.length - 1;
      if (this.rng) { from = this.rng[0]; to = this.rng[1]; }
      if (this.lim != null) to = Math.min(to, from + this.lim - 1);
      to = Math.min(to, from + ST.maxRows - 1);                         // PostgREST max-rows
      res = res.slice(from, to + 1).map(function (r) { return project(r, self.cols); });
      if (this.mode === 'maybe' || this.mode === 'single') {
        if (res.length > 1) { out = { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } }; }
        else if (!res.length && this.mode === 'single') out = { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
        else out = { data: res[0] || null, error: null };
      } else out = { data: this.head ? null : res, error: null, count: this.countOpt ? total : null };
      call.result = { rows: Array.isArray(out.data) ? out.data.length : (out.data ? 1 : 0), error: out.error && out.error.message };
      // Test hook: simulate something else writing between two reads (e.g. an UPDATE moving a tuple).
      if (typeof ST.afterSelect === 'function') { try { ST.afterSelect(table, call, DB); } catch (e) {} }
      return Object.assign({ status: 200 }, out);
    }
    var touched = [];
    if (op === 'update') {
      if (!denied) rows.forEach(function (r, i) {
        if (!match(r)) return;
        var nr = Object.assign({}, r, clone(self.payload));
        beforeUpdate(table, r, nr);
        rows[i] = nr; touched.push(nr);
      });
    } else if (op === 'delete') {
      if (!denied) for (var i = rows.length - 1; i >= 0; i--) if (match(rows[i])) { touched.push(rows[i]); rows.splice(i, 1); }
    } else if (op === 'insert' || op === 'upsert') {
      var list = Array.isArray(this.payload) ? this.payload : [this.payload];
      var conflict = this.opts && this.opts.onConflict;
      for (var j = 0; j < list.length; j++) {
        var row = clone(list[j]);
        var k = keyOf(table, row, conflict);
        var at = rows.findIndex(function (r) { return keyOf(table, r, conflict) === k; });
        if (at >= 0) {
          if (op === 'insert') { call.result = { error: 'duplicate key' }; return { data: null, error: { message: 'duplicate key value violates unique constraint "' + table + '_pkey"', code: '23505' }, status: 409 }; }
          if (denied) continue;
          var merged = Object.assign({}, rows[at], row);
          beforeUpdate(table, rows[at], merged);
          rows[at] = merged; touched.push(merged);
        } else {
          if (denied) continue;
          if (table === 'programs') { row.updated_at = row.updated_at || nowIso(); row.updated_by = row.updated_by || COACH; }
          if (row.created_at === undefined && /affiliates|hab_intake|call_logs/.test(table)) row.created_at = nowIso();
          if (table === 'affiliates' && row.active === undefined) row.active = true;
          rows.push(row); touched.push(row);
        }
      }
    }
    persist();
    call.result = { touched: touched.length };
    if (this.returning) return { data: touched.map(function (r) { return project(r, self.retCols); }), error: null, status: 200 };
    return { data: null, error: null, status: op === 'insert' || op === 'upsert' ? 201 : 204, count: null };
  };

  // ---- RPCs, emulated from their SQL (supabase/*.sql and pg_proc on the live DB) ----
  function habDays(blob, id) {
    var raw = blob && blob[id + '_hab_log']; var log = raw; try { if (typeof raw === 'string') log = JSON.parse(raw); } catch (e) { log = null; }
    return log && typeof log === 'object' ? Object.keys(log).filter(function (k) { var v = log[k]; return v && typeof v === 'object' && Object.keys(v).length; }).length : 0;
  }
  var RPC = {
    contact_list: function () {
      return tbl('hab_contacts').map(function (c) {
        var o = tbl('leaderboard_optin').find(function (x) { return x.athlete_id === c.athlete_id; });
        var ap = tbl('athlete_progress').find(function (x) { return x.athlete_id === c.athlete_id; });
        return { athlete_id: c.athlete_id, email: c.email, whatsapp: c.whatsapp, source: c.source, tier: c.tier,
          shown_as: (o && o.display_name) || c.display_name, on_board: !!o, days_logged: habDays(ap && ap.data, c.athlete_id), signed_up: c.created_at };
      }).sort(function (a, b) { return String(b.signed_up).localeCompare(String(a.signed_up)); });
    },
    intake_list: function () { return clone(tbl('hab_intake')).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); }); },
    set_coach_note: function (p) {   // p_day DEFAULT CURRENT_DATE: the server's (UTC) date when the client sends none
      var day = p.p_day || utcDate(), body = String(p.p_body || '').trim().slice(0, 200), t = tbl('hab_notes');
      var at = t.findIndex(function (n) { return n.athlete_id === '__coach__' && n.day === day; });
      if (!body) { if (at >= 0) t.splice(at, 1); return null; }
      if (at >= 0) { t[at].body = body; t[at].updated_at = nowIso(); }
      else t.push({ athlete_id: '__coach__', day: day, body: body, pct: null, hidden: false, created_at: nowIso(), updated_at: nowIso() });
      return null;
    },
    hide_note: function (p) { tbl('hab_notes').forEach(function (n) { if (n.athlete_id === p.p_athlete_id && n.day === p.p_day) { n.hidden = p.p_hidden !== false; n.updated_at = nowIso(); } }); return null; },
    set_quests: function (p) {
      if (!p.p_ids || !p.p_ids.length) throw new Error('give at least one quest id, or use clear_quests()');
      var x = tbl('xp_rules').find(function (r) { return r.id === 1; }); var runs = (x.rules.questRuns || []).filter(function (r) { return r.start !== p.p_start; });
      runs.push({ start: p.p_start, ids: p.p_ids.slice() }); x.rules.questRuns = runs; x.updated_at = nowIso(); return runs;
    },
    clear_quests: function (p) {
      var x = tbl('xp_rules').find(function (r) { return r.id === 1; }); x.rules.questRuns = (x.rules.questRuns || []).filter(function (r) { return r.start !== p.p_start; }); return x.rules.questRuns;
    },
    set_intake_status: function (p) {
      if (['new', 'handled', 'archived'].indexOf(p.p_status) < 0) throw new Error('bad intake status: ' + p.p_status);
      tbl('hab_intake').forEach(function (i) { if (String(i.id) === String(p.p_id)) { i.status = p.p_status; i.handled_at = p.p_status === 'new' ? null : (i.handled_at || nowIso()); } });
      return null;
    },
    hab_season_level: function (p) { return (SEED.levels || {})[p.p_athlete_id] || null; },
    leaderboard_top: function () { return clone(SEED.board || []); },
    save_session: function (p) {
      var s = p.p_session || {}, t = tbl('session_history');
      var row = { athlete_id: p.p_athlete_id, athlete_name: p.p_athlete_name, day: p.p_day, completed_on: p.p_completed_on,
        status: s.status, session_rpe: s.session_rpe === '' ? null : Number(s.session_rpe), duration_min: s.duration_min === '' ? null : Number(s.duration_min),
        readiness: s.readiness, day_note: s.day_note, focus: s.focus, summary: s.summary, updated_at: nowIso(), coach_status: 'new', log: null };
      var at = t.findIndex(function (r) { return r.athlete_id === row.athlete_id && Number(r.day) === Number(row.day) && r.completed_on === row.completed_on; });
      if (at >= 0) t[at] = Object.assign(t[at], row); else t.push(row);
      return null;
    },
    forget_contact: function (p) {
      ['hab_contacts', 'leaderboard_optin', 'athlete_progress'].forEach(function (n) { DB[n] = tbl(n).filter(function (r) { return r.athlete_id !== p.p_athlete_id; }); });
      DB.hab_notes = tbl('hab_notes').filter(function (r) { return r.athlete_id !== p.p_athlete_id; }); return null;
    },
  };
  function rpc(name, params) {
    var thenable = {
      then: function (ok, bad) { return run().then(ok, bad); },
      catch: function (bad) { return run().catch(bad); },
    };
    ['eq', 'order', 'limit', 'select', 'maybeSingle', 'single'].forEach(function (m) { thenable[m] = function () { return thenable; }; });
    var ran = null;
    function run() {
      if (ran) return ran;
      ran = (async function () {
        var call = record({ kind: 'rpc', name: name, payload: clone(params || null) });
        if (ST.delay[name]) await sleep(ST.delay[name]);
        await sleep(0);
        var f = takeFail('rpc', name);
        if (f) { call.result = { error: f.message }; return { data: null, error: { message: f.message, code: f.code || 'P0001' }, status: 400 }; }
        if (!RPC[name]) { call.result = { error: 'missing' }; return { data: null, error: { message: 'Could not find the function public.' + name, code: 'PGRST202' }, status: 404 }; }
        try { var d = RPC[name](params || {}); persist(); call.result = { ok: true }; return { data: clone(d), error: null, status: 200 }; }
        catch (e) { call.result = { error: e.message }; return { data: null, error: { message: e.message, code: 'P0001' }, status: 400 }; }
      })();
      return ran;
    }
    return thenable;
  }

  // ---- Edge Functions (supabase/functions/*/index.ts) ----
  function genPw() { return 'harness-pw-' + Math.random().toString(36).slice(2, 8); }
  var FN = {
    'athlete-login': function (b) {
      var ids = tbl('athlete_identities');
      var one = function (id, typed) {
        var pw = typed || genPw(), row = ids.find(function (r) { return r.athlete_id === id; });
        if (row) { row.initial_password = pw; row.password_set_at = nowIso(); row.sent_at = null; return { athlete_id: id, username: id, password: pw, created: false }; }
        ids.push({ user_id: 'u-' + id, athlete_id: id, email: 'athlete.' + id + '@amirardekani.com', linked_at: nowIso(), initial_password: pw, password_set_at: nowIso(), sent_at: null });
        return { athlete_id: id, username: id, password: pw, created: true };
      };
      if (b.action === 'create' || b.action === 'reset') { if (!/^[A-Za-z0-9_]+$/.test(String(b.athlete_id || ''))) return [400, { error: 'bad athlete_id' }]; return [200, one(b.athlete_id, b.password)]; }
      if (b.action === 'create_many') { var res = (b.athlete_ids || []).map(function (id) { return one(id); }); return [200, { created: res.length, failed: [] }]; }
      if (b.action === 'revoke') { DB.athlete_identities = ids.filter(function (r) { return r.athlete_id !== b.athlete_id; }); return [200, { revoked: true }]; }
      return [400, { error: 'unknown action' }];
    },
  };
  var functions = {
    invoke: async function (name, o) {
      var body = o && o.body;
      var call = record({ kind: 'fn', name: name, payload: clone(body) });
      if (ST.delay[name]) await sleep(ST.delay[name]);
      await sleep(0);
      var f = takeFail('fn', name);
      var status, data;
      if (f) { status = f.status || 500; data = { error: f.message }; }
      else if (!FN[name]) { status = 404; data = { error: 'no such function (stub)' }; }
      else { var r = FN[name](body || {}); status = r[0]; data = r[1]; persist(); }
      call.result = { status: status, data: clone(data) };
      if (status >= 200 && status < 300) return { data: data, error: null };
      // supabase-js: FunctionsHttpError, data null, error.context is the Response
      return { data: null, error: { name: 'FunctionsHttpError', message: 'Edge Function returned a non-2xx status code', context: { json: async function () { return data; } } } };
    },
  };

  var session = { access_token: 'harness-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'harness-refresh', user: { id: 'coach-uuid', email: COACH, aud: 'authenticated' } };
  if (SEED.signedOut) session = null;
  var auth = {
    getSession: async function () { record({ kind: 'auth', name: 'getSession' }); return { data: { session: clone(session) }, error: null }; },
    getUser: async function () { return { data: { user: session ? clone(session.user) : null }, error: null }; },
    onAuthStateChange: function (cb) {
      window.__authCbs.push(cb);
      record({ kind: 'auth', name: 'onAuthStateChange' });
      if (ST.emitInitial) setTimeout(function () { cb('INITIAL_SESSION', clone(session)); }, 0);
      return { data: { subscription: { id: 'sub-' + window.__authCbs.length, unsubscribe: function () {} } } };
    },
    signOut: async function () { record({ kind: 'auth', name: 'signOut' }); session = null; return { error: null }; },
    signInWithOAuth: async function (o) { record({ kind: 'auth', name: 'signInWithOAuth', payload: clone(o) }); return { data: {}, error: null }; },
  };
  window.__fireAuth = function (event) { window.__authCbs.forEach(function (cb) { cb(event, clone(session)); }); };

  var client = {
    from: function (t) { return new Builder(t); },
    rpc: rpc,
    functions: functions,
    auth: auth,
    channel: function () { return { on: function () { return this; }, subscribe: function () { return this; } }; },
    removeChannel: function () {},
  };
  Object.defineProperty(window, 'supabase', { value: { createClient: function () { record({ kind: 'client', name: 'createClient' }); return client; } }, writable: false, configurable: true });
})();
